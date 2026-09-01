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
 * Thin HTTP shell for CROSS-CHANNEL contact changes (01-TASK.md §7 — parse,
 * validate, rate-limit, delegate):
 * <ul>
 *   <li>{@code POST /account/email-change/request} — SMS code to the current
 *       phone (an email thief alone cannot change the email)</li>
 *   <li>{@code POST /account/phone-change/request} — email code to the current
 *       email (a lost/stolen phone alone cannot change the phone)</li>
 *   <li>confirm endpoints complete the change once the code is verified</li>
 * </ul>
 *
 * <p>All four require a Bearer JWT (default security rule). The user is
 * resolved from the token, never from the body. Request endpoints are
 * additionally throttled per client IP ({@link ClientIps}, X-Forwarded-For
 * aware) — the confirm endpoints are code-verified and attempt-limited
 * instead, so they need no bucket.
 */
@RestController
@RequestMapping("/account")
public class AccountController {

    private final ContactChangeService contactChangeService;
    private final UserRepository userRepository;
    private final RateLimiter changeRequestRateLimiter;
    private final Set<String> trustedProxies;

    public AccountController(ContactChangeService contactChangeService,
                             UserRepository userRepository,
                             @Qualifier("changeRequestRateLimiter") RateLimiter changeRequestRateLimiter,
                             @Value("${app.ratelimit.trusted-proxies:}") String trustedProxies) {
        this.contactChangeService = Objects.requireNonNull(contactChangeService, "contactChangeService");
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.changeRequestRateLimiter = Objects.requireNonNull(changeRequestRateLimiter, "changeRequestRateLimiter");
        this.trustedProxies = Arrays.stream(trustedProxies.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
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
