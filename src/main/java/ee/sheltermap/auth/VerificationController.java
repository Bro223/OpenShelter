package ee.sheltermap.auth;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.verification.VerificationService;
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
 * Thin HTTP shell for verification (closes the Step-2 gap: verification was
 * service-level only, unreachable over HTTP).
 *
 * <p>{@code POST /verify/request} + {@code POST /verify/confirm} — both
 * require a Bearer JWT (default security rule: any request not explicitly
 * permit-all needs a token). The user is resolved from the token, never from
 * the body; the target contact (email/phone) comes from the user profile.
 *
 * <p>Anti-spam (Twilio plan): the request endpoint is additionally throttled
 * per client IP (token bucket via {@link ClientIps}, X-Forwarded-For aware),
 * on top of the service-level cooldown + daily cap per (user, level).
 *
 * <p>SMART_ID is rejected up front with 400 — the provider is a stub in v1.
 */
@RestController
@RequestMapping("/verify")
public class VerificationController {

    private final VerificationService verificationService;
    private final UserRepository userRepository;
    private final RateLimiter verifyRateLimiter;
    private final Set<String> trustedProxies;

    public VerificationController(VerificationService verificationService,
                                  UserRepository userRepository,
                                  @Qualifier("verifyRateLimiter") RateLimiter verifyRateLimiter,
                                  @Value("${app.ratelimit.trusted-proxies:}") String trustedProxies) {
        this.verificationService = Objects.requireNonNull(verificationService, "verificationService");
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.verifyRateLimiter = Objects.requireNonNull(verifyRateLimiter, "verifyRateLimiter");
        this.trustedProxies = Arrays.stream(trustedProxies.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    @PostMapping("/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void request(@Valid @RequestBody VerifyRequest body, HttpServletRequest http) {
        if (!verifyRateLimiter.tryAcquire(ClientIps.resolve(http, trustedProxies))) {
            throw new RateLimitExceededException();
        }
        RegisteredUser user = currentUser();
        if (body.level() == VerificationLevel.SMART_ID) {
            throw new VerificationFailedException("SMART_ID verification is not available yet (stub in v1)");
        }
        verificationService.requestVerification(user, body.level());
    }

    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.OK)
    public void confirm(@Valid @RequestBody VerifyConfirmRequest body) {
        RegisteredUser user = currentUser();
        boolean ok = verificationService.confirmVerification(user, body.level(), body.code());
        if (!ok) {
            throw new VerificationFailedException("invalid or expired verification code");
        }
        // Persist the new claim (JpaUserRepository.save rewrites the claim set).
        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException race) {
            // P2 fix: two concurrent confirms of the same level+code both pass
            // the already-verified guard, and the losing insert violates the V3
            // partial unique index. The claim is already active (the other
            // request persisted it) — treat as an idempotent success, never a 500.
            if (user.levels().contains(body.level())) {
                return;
            }
            throw race;
        }
    }

    private RegisteredUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            // unreachable in practice: /verify/** requires a valid JWT
            throw new VerificationFailedException("authentication required");
        }
        User user = userRepository.findById(userId);
        if (!(user instanceof RegisteredUser registered)) {
            throw new VerificationFailedException("account not found");
        }
        return registered;
    }
}
