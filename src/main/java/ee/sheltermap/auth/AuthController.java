package ee.sheltermap.auth;

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
 * for login/reset, per contact.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final RateLimiter loginRateLimiter;
    private final RateLimiter resetRateLimiter;
    private final RateLimiter registerRateLimiter;
    private final Set<String> trustedProxies;

    public AuthController(AuthService authService,
                          @Qualifier("loginRateLimiter") RateLimiter loginRateLimiter,
                          @Qualifier("resetRateLimiter") RateLimiter resetRateLimiter,
                          @Qualifier("registerRateLimiter") RateLimiter registerRateLimiter,
                          @Value("${app.ratelimit.trusted-proxies:}") String trustedProxies) {
        this.authService = authService;
        this.loginRateLimiter = loginRateLimiter;
        this.resetRateLimiter = resetRateLimiter;
        this.registerRateLimiter = registerRateLimiter;
        this.trustedProxies = Arrays.stream(trustedProxies.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(@Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
        requireRate(registerRateLimiter, ClientIps.resolve(http, trustedProxies));
        authService.register(request);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        requireRate(loginRateLimiter, key(http, trustedProxies, request.emailOrPhone()));
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request.refreshToken());
    }

    @PostMapping("/password-reset/request")
    public void requestPasswordReset(@Valid @RequestBody PasswordResetRequest request, HttpServletRequest http) {
        requireRate(resetRateLimiter, key(http, trustedProxies, request.email()));
        authService.requestPasswordReset(request.email());
    }

    @PostMapping("/password-reset/confirm")
    public void resetPassword(@Valid @RequestBody PasswordResetConfirmRequest request) {
        authService.resetPassword(request.token(), request.newPassword());
    }

    private static void requireRate(RateLimiter limiter, String key) {
        if (!limiter.tryAcquire(key)) {
            throw new RateLimitExceededException();
        }
    }

    private static String key(HttpServletRequest http, Set<String> trustedProxies, String identifier) {
        return ClientIps.resolve(http, trustedProxies) + "|" + identifier.trim().toLowerCase(Locale.ROOT);
    }
}
