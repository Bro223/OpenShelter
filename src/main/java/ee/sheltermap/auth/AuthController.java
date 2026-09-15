package ee.sheltermap.auth;

import ee.sheltermap.alerts.ThrottleAlertRecorder;
import ee.sheltermap.verification.PhoneNumbers;
import ee.sheltermap.verification.RollingContactOtpLimiter;
import ee.sheltermap.verification.VerificationThrottledException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Thin shell (01-TASK.md §7) — parse, validate, rate-limit, delegate.
 * Login, reset-request and registration are guarded by token buckets keyed
 * per real client IP (X-Forwarded-For aware — see {@link ClientIps}) and,
 * for login/reset, per contact. Login additionally passes a per-IP aggregate
 * bucket (anti credential-stuffing, W5) and reset-confirm a per-(IP, email)
 * anti-guess bucket (W1). Registration additionally passes the rolling
 * per-e-mail cap (abuse-limits M3 slice 2), and its 429s land in the
 * admin alert ring (M3 slice 4).
 */
@Tag(name = "Auth",
        description = "The public auth surface: registration, login, refresh "
                + "rotation, logout and password reset. The login/refresh "
                + "responses carry bearer credentials (TokenResponse) — never log "
                + "them. Login, reset-request and registration are rate-limited "
                + "per real client IP (X-Forwarded-For aware) and, for "
                + "login/reset, per contact — 429 above the buckets.")
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final RateLimiter loginRateLimiter;
    private final RateLimiter loginIpRateLimiter;
    private final RateLimiter resetRateLimiter;
    private final RateLimiter resetConfirmRateLimiter;
    private final RateLimiter registerRateLimiter;
    private final RollingContactOtpLimiter contactOtpLimiter;
    private final ThrottleAlertRecorder alerts;
    private final Set<String> trustedProxies;
    private final boolean trustLoopback;

    public AuthController(AuthService authService,
                          @Qualifier("loginRateLimiter") RateLimiter loginRateLimiter,
                          @Qualifier("loginIpRateLimiter") RateLimiter loginIpRateLimiter,
                          @Qualifier("resetRateLimiter") RateLimiter resetRateLimiter,
                          @Qualifier("resetConfirmRateLimiter") RateLimiter resetConfirmRateLimiter,
                          @Qualifier("registerRateLimiter") RateLimiter registerRateLimiter,
                          RollingContactOtpLimiter contactOtpLimiter,
                          ThrottleAlertRecorder alerts,
                          @Value("${app.ratelimit.trusted-proxies:}") String trustedProxies,
                          @Value("${app.ratelimit.trust-loopback:true}") boolean trustLoopback) {
        this.authService = authService;
        this.loginRateLimiter = loginRateLimiter;
        this.loginIpRateLimiter = loginIpRateLimiter;
        this.resetRateLimiter = resetRateLimiter;
        this.resetConfirmRateLimiter = resetConfirmRateLimiter;
        this.registerRateLimiter = registerRateLimiter;
        this.contactOtpLimiter = contactOtpLimiter;
        this.alerts = alerts;
        this.trustLoopback = trustLoopback;
        this.trustedProxies = Arrays.stream(trustedProxies.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new account",
            description = "201 with an empty body (no session is created). "
                    + "Rate-limited per client IP, and the per-e-mail rolling "
                    + "registration cap lands 429 + Retry-After once the window "
                    + "is full (a duplicate-409 retry is still an attempt).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Registered"),
            @ApiResponse(responseCode = "409", description = "E-mail/phone "
                    + "already registered"),
            @ApiResponse(responseCode = "429", description = "Per-IP or "
                    + "per-e-mail registration cap exceeded — Retry-After in "
                    + "seconds")
    })
    @SecurityRequirements({})
    public void register(@Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
        requireRate(registerRateLimiter, clientIp(http));
        // M3 slice 2: per-e-mail rolling cap on registration ATTEMPTS
        // ("register:" namespace — independent of the "verify:" send cap),
        // every attempt counts (a duplicate-409 retry is still an attempt),
        // the same semantics as the per-IP bucket above. 429 + Retry-After
        // instead of a bare 409 loop once the window is full.
        RollingContactOtpLimiter.Result contact = contactOtpLimiter.tryAcquire("register:" + request.email());
        if (contact.decision() == RollingContactOtpLimiter.Decision.THROTTLED) {
            // M3 slice 4: the throttled contact lands in the admin alert
            // ring (in-memory, W16) before the 429 goes out.
            alerts.otpContactCap(request.email(), contact.retryAfterSeconds());
            throw new VerificationThrottledException("Too many registration attempts with this e-mail",
                    contact.retryAfterSeconds());
        }
        authService.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Log in",
            description = "E-mail or phone + password. BOTH rate buckets must "
                    + "pass — the per-IP aggregate (one IP hammering many "
                    + "accounts) and the per-(IP, contact) bucket. Phone may be "
                    + "local or +372 form.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The issued token "
                    + "pair (bearer credentials — never log, never store in the "
                    + "document)", content = @Content(schema = @Schema(implementation =
                    TokenResponse.class))),
            @ApiResponse(responseCode = "401", description = "Invalid "
                    + "e-mail/phone or password"),
            @ApiResponse(responseCode = "429", description = "Rate limit "
                    + "exceeded — Retry-After in seconds")
    })
    @SecurityRequirements({})
    public TokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        String ip = clientIp(http);
        // W5: BOTH buckets must pass — the per-IP aggregate (one IP hammering
        // many accounts) and the per-(IP, contact) bucket below.
        requireRate(loginIpRateLimiter, ip);
        requireRate(loginRateLimiter, ip + "|" + normalizedContact(request.emailOrPhone()));
        return authService.login(request);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh the token pair",
            description = "Rotates the refresh token and issues a new pair.")
    @ApiResponse(responseCode = "200", description = "The new rotated pair (bearer "
            + "credentials)", content = @Content(schema = @Schema(implementation =
            TokenResponse.class)))
    @SecurityRequirements({})
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Log out",
            description = "204. Revokes the given refresh token server-side.")
    @SecurityRequirements({})
    public void logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request.refreshToken());
    }

    /**
     * Requests a reset code. The ack body tells the client how long to wait
     * before re-requesting (the service's reissue cooldown). The ack is
     * identical for a known email, an unknown email and a cooldown skip —
     * it must never reveal whether the email exists or a send happened.
     */
    @PostMapping("/password-reset/request")
    @Operation(summary = "Request a password-reset code",
            description = "The ack body tells the client how long to wait before "
                    + "re-requesting (the service's reissue cooldown). The ack is "
                    + "identical for a known email, an unknown email and a "
                    + "cooldown skip — it must never reveal whether the email "
                    + "exists or a send happened.")
    @ApiResponse(responseCode = "200", description = "The resend-cooldown ack "
            + "(identical for known/unknown email — anti-enumeration)", content =
            @Content(schema = @Schema(implementation = CodeSentDto.class)))
    @SecurityRequirements({})
    public CodeSentDto requestPasswordReset(@Valid @RequestBody PasswordResetRequest request, HttpServletRequest http) {
        requireRate(resetRateLimiter, clientIp(http) + "|" + normalizedEmail(request.email()));
        authService.requestPasswordReset(request.email());
        return new CodeSentDto(PasswordResetService.reissueCooldownSeconds());
    }

    @PostMapping("/password-reset/confirm")
    @Operation(summary = "Confirm the password reset",
            description = "The e-mail scopes the 6-digit code to the account it was "
                    + "sent to; ANY failure (unknown email / wrong / expired / "
                    + "used / over-limit) answers 400 with one generic message, so "
                    + "the caller must not treat the 400 as account-existence "
                    + "information. Per-(IP, email) anti-guess bucket: 429 above "
                    + "it.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Password reset"),
            @ApiResponse(responseCode = "400", description = "One generic message — "
                    + "never account-existence information"),
            @ApiResponse(responseCode = "429", description = "Anti-guess bucket "
                    + "exceeded — Retry-After in seconds")
    })
    @SecurityRequirements({})
    public void resetPassword(@Valid @RequestBody PasswordResetConfirmRequest request, HttpServletRequest http) {
        // W1: per-(IP, email) anti-guess bucket — a 6-digit code must not be
        // brute-forceable through the confirm endpoint.
        requireRate(resetConfirmRateLimiter, clientIp(http) + "|" + normalizedEmail(request.email()));
        authService.resetPassword(request.email(), request.code(), request.newPassword());
    }

    private String clientIp(HttpServletRequest http) {
        return ClientIps.resolve(http, trustedProxies, trustLoopback);
    }

    private static void requireRate(RateLimiter limiter, String key) {
        if (!limiter.tryAcquire(key)) {
            throw new RateLimitExceededException();
        }
    }

    /**
     * Normalizes a login contact for rate-limit keying (W5): e-mail → trim +
     * lowercase; a phone-like value (no {@code @}) → E.164 (lenient, never
     * throws) then lowercase — so {@code 50000001} and {@code +37250000001}
     * share one bucket (same canonical identity as the lookup).
     */
    private static String normalizedContact(String emailOrPhone) {
        String contact = emailOrPhone.trim();
        if (contact.contains("@")) {
            return contact.toLowerCase(Locale.ROOT);
        }
        return PhoneNumbers.normalizeE164(contact).toLowerCase(Locale.ROOT);
    }

    private static String normalizedEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
