package ee.sheltermap.auth;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Thin HTTP shell for the authenticated account surface (01-TASK.md §7 —
 * parse, validate, rate-limit, delegate):
 * <ul>
 *   <li>{@code GET /account/me} — the user's real profile + verified claims
 *       (the frontend's single source of truth for name/email/phone/national
 *       ID and verification labels)</li>
 *   <li>{@code PUT /account/profile} — password-confirmed edit of name +
 *       national ID (so a registration typo is fixable without re-registering)</li>
 *   <li>{@code POST /account/email-change/request} — SMS code to the current
 *       phone (an email thief alone cannot change the email)</li>
 *   <li>{@code POST /account/phone-change/request} — email code to the current
 *       email (a lost/stolen phone alone cannot change the phone)</li>
 *   <li>confirm endpoints complete the change once the code is verified</li>
 * </ul>
 *
 * <p>All endpoints require a Bearer JWT (default security rule). The user is
 * resolved from the token, never from the body. The change-request endpoints
 * are additionally throttled per client IP ({@link ClientIps},
 * X-Forwarded-For aware) — the confirm endpoints are code-verified and
 * attempt-limited instead, so they need no bucket; the profile read/edit are
 * cheap (no code issuance) and use the standard auth rule.
 */
@RestController
@RequestMapping("/account")
public class AccountController {

    private final ContactChangeService contactChangeService;
    private final AccountService accountService;
    private final UserRepository userRepository;
    private final RateLimiter changeRequestRateLimiter;
    private final Set<String> trustedProxies;

    public AccountController(ContactChangeService contactChangeService,
                             AccountService accountService,
                             UserRepository userRepository,
                             @Qualifier("changeRequestRateLimiter") RateLimiter changeRequestRateLimiter,
                             @Value("${app.ratelimit.trusted-proxies:}") String trustedProxies) {
        this.contactChangeService = Objects.requireNonNull(contactChangeService, "contactChangeService");
        this.accountService = Objects.requireNonNull(accountService, "accountService");
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.changeRequestRateLimiter = Objects.requireNonNull(changeRequestRateLimiter, "changeRequestRateLimiter");
        this.trustedProxies = Arrays.stream(trustedProxies.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    /** The authenticated user's real profile + verified claims (no rate bucket — cheap read). */
    @GetMapping("/me")
    public MeResponse me() {
        return accountService.profile(currentUser());
    }

    /**
     * Password-confirmed edit of name + national ID. Wrong current password
     * → 401 (nothing updated); blank fields → 400 (registration validations).
     */
    @PutMapping("/profile")
    public MeResponse updateProfile(@Valid @RequestBody ProfileUpdateRequest body) {
        return accountService.updateProfile(currentUser(), body);
    }

    @PostMapping("/email-change/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void requestEmailChange(@Valid @RequestBody ChangeEmailRequest body, HttpServletRequest http) {
        requireRate(http);
        contactChangeService.requestEmailChange(currentUser(), body.newEmail());
    }

    @PostMapping("/email-change/confirm")
    @ResponseStatus(HttpStatus.OK)
    public void confirmEmailChange(@Valid @RequestBody ConfirmChangeRequest body) {
        contactChangeService.confirmEmailChange(currentUser(), body.code());
    }

    @PostMapping("/phone-change/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void requestPhoneChange(@Valid @RequestBody ChangePhoneRequest body, HttpServletRequest http) {
        requireRate(http);
        contactChangeService.requestPhoneChange(currentUser(), body.newPhone());
    }

    @PostMapping("/phone-change/confirm")
    @ResponseStatus(HttpStatus.OK)
    public void confirmPhoneChange(@Valid @RequestBody ConfirmChangeRequest body) {
        contactChangeService.confirmPhoneChange(currentUser(), body.code());
    }

    private void requireRate(HttpServletRequest http) {
        if (!changeRequestRateLimiter.tryAcquire(ClientIps.resolve(http, trustedProxies))) {
            throw new RateLimitExceededException();
        }
    }

    private RegisteredUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long userId)) {
            throw new InvalidContactChangeException("authentication required");
        }
        User user = userRepository.findById(userId);
        if (!(user instanceof RegisteredUser registered)) {
            throw new InvalidContactChangeException("account not found");
        }
        return registered;
    }
}
