package ee.sheltermap.auth;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.verification.VerificationProperties;
import ee.sheltermap.verification.VerificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Thin HTTP shell for verification — exposes the service-level verification
 * flow over HTTP.
 *
 * <p>{@code POST /verify/request} + {@code POST /verify/confirm} — both
 * require a Bearer JWT (default security rule: any request not explicitly
 * permit-all needs a token). The user is resolved from the token, never from
 * the body; the target contact (email/phone) comes from the user profile.
 *
 * <p>Anti-spam (Twilio plan): the request endpoint is additionally throttled
 * per client IP (token bucket via {@link ClientIps}, X-Forwarded-For aware),
 * on top of the service-level cooldown + daily cap per (user, level). On
 * success the endpoint acks with {@link CodeSentDto} — the cooldown a
 * client should count down before resending; a throttled 429 carries the
 * exact remaining seconds in {@code Retry-After}.
 *
 * <p>SMART_ID is rejected up front with 400 — the provider is a stub in v1.
 */
@Tag(name = "Account & verification",
        description = "Verification codes for the account's contacts. Both calls "
                + "require a Bearer JWT (the user is resolved from the token, "
                + "never from the body; the target contact comes from the user "
                + "profile). The request endpoint is additionally throttled per "
                + "client IP on top of the service-level cooldown + daily cap "
                + "per (user, level) — a throttled 429 carries the exact "
                + "remaining seconds in Retry-After. SMART_ID is rejected up "
                + "front with 400 (the provider is a stub in v1).")
@RestController
@RequestMapping("/verify")
public class VerificationController {

    private final VerificationService verificationService;
    private final UserRepository userRepository;
    private final RateLimiter verifyRateLimiter;
    private final VerificationProperties properties;
    private final Set<String> trustedProxies;
    private final boolean trustLoopback;

    public VerificationController(VerificationService verificationService,
                                  UserRepository userRepository,
                                  @Qualifier("verifyRateLimiter") RateLimiter verifyRateLimiter,
                                  VerificationProperties properties,
                                  @Value("${app.ratelimit.trusted-proxies:}") String trustedProxies,
                                  @Value("${app.ratelimit.trust-loopback:true}") boolean trustLoopback) {
        this.verificationService = Objects.requireNonNull(verificationService, "verificationService");
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.verifyRateLimiter = Objects.requireNonNull(verifyRateLimiter, "verifyRateLimiter");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.trustLoopback = trustLoopback;
        this.trustedProxies = Arrays.stream(trustedProxies.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    /**
     * Requests a verification code. The ack body tells the client how long
     * to wait before resending (the configured cooldown) — the frontend
     * renders a countdown instead of letting the user spam-click.
     */
    @PostMapping("/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Request a verification code",
            description = "202 + the resend-cooldown ack — the frontend renders a "
                    + "countdown instead of letting the user spam-click. "
                    + "SMART_ID is 400 (the provider is a stub in v1); a "
                    + "cooldown/cap 429 carries Retry-After in seconds.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "202", description = "Code sent — the ack "
                    + "carries the resend cooldown in seconds", content = @Content(
                    schema = @Schema(implementation = CodeSentDto.class))),
            @ApiResponse(responseCode = "400", description = "SMART_ID is not "
                    + "available yet (stub provider)"),
            @ApiResponse(responseCode = "409", description = "The level is already "
                    + "verified"),
            @ApiResponse(responseCode = "429", description = "Cooldown / daily cap "
                    + "or per-IP throttle — Retry-After in seconds")
    })
    public CodeSentDto request(@Valid @RequestBody VerifyRequest body, HttpServletRequest http) {
        if (!verifyRateLimiter.tryAcquire(ClientIps.resolve(http, trustedProxies, trustLoopback))) {
            throw new RateLimitExceededException();
        }
        RegisteredUser user = currentUser();
        if (body.level() == VerificationLevel.SMART_ID) {
            // The SMART_ID provider is a stub in v1 (no e-ID integration yet):
            // the stub fact stays in this comment, the 400 message is plain
            // user language (no enum token, no process note).
            throw new VerificationFailedException("eID verification is not available yet.");
        }
        verificationService.requestVerification(user, body.level());
        return new CodeSentDto((int) properties.cooldownSeconds());
    }

    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Confirm the verification code",
            description = "200 and the level is claimed on success; a wrong or "
                    + "expired code is a 400.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Level claimed"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired "
                    + "verification code")
    })
    public void confirm(@Valid @RequestBody VerifyConfirmRequest body) {
        RegisteredUser user = currentUser();
        boolean ok = verificationService.confirmVerification(user, body.level(), body.code());
        if (!ok) {
            throw new VerificationFailedException("Invalid or expired verification code");
        }
        // Persist the new claim (JpaUserRepository.save rewrites the claim set).
        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException race) {
            // Two concurrent confirms of the same level+code both pass
            // the already-verified guard, and the losing insert violates the V3
            // partial unique index. The in-memory claim set was ALREADY
            // mutated by confirmVerification, so `user.levels()` can never prove
            // persistence here — re-read the claim set from the DB and treat the
            // race as an idempotent success ONLY if this user's claim for the
            // confirmed level is actually persisted; otherwise rethrow.
            User persisted = userRepository.findById(user.getId());
            boolean claimPersisted = persisted instanceof RegisteredUser registered
                    && registered.levels().contains(body.level());
            if (claimPersisted) {
                return;
            }
            throw race;
        }
    }

    private RegisteredUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            // unreachable in practice: /verify/** requires a valid JWT
            throw new VerificationFailedException("Authentication required");
        }
        User user = userRepository.findById(userId);
        if (!(user instanceof RegisteredUser registered)) {
            throw new VerificationFailedException("Account not found");
        }
        return registered;
    }
}
