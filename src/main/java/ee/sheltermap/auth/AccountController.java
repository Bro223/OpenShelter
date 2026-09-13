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
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Thin HTTP shell for the authenticated account surface (01-TASK.md §7 —
 * parse, validate, rate-limit, delegate):
 * <ul>
 *   <li>{@code GET /account/me} — the user's real profile + verified claims
 *       (the frontend's single source of truth for name/email/phone and
 *       verification labels)</li>
 *   <li>{@code PUT /account/profile} — password-confirmed edit of the name
 *       (no national ID code is collected anywhere — remove-national-id M1)</li>
 *   <li>{@code POST /account/email-change/request} — SMS code to the current
 *       phone (an email thief alone cannot change the email)</li>
 *   <li>{@code POST /account/phone-change/request} — email code to the current
 *       email (a lost/stolen phone alone cannot change the phone)</li>
 *   <li>confirm endpoints complete the change once the code is verified</li>
 *   <li>{@code GET /account/reviews/mine} — the user's reviews across ALL
 *       shelters with shelter id + name (user-contributions; a cross-shelter
 *       list has no per-shelter parent, so it sits on this group)</li>
 * </ul>
 *
 * <p>All endpoints require a Bearer JWT (default security rule). The user is
 * resolved from the token, never from the body. The change-request endpoints
 * are additionally throttled per client IP ({@link ClientIps},
 * X-Forwarded-For aware) — the confirm endpoints are code-verified and
 * attempt-limited instead, so they need no bucket; the profile read/edit are
 * cheap (no code issuance) and use the standard auth rule. The request
 * endpoints ack with {@link CodeSentDto} — the cooldown a client should
 * count down before resending.
 */
@RestController
@RequestMapping("/account")
public class AccountController {

    private final ContactChangeService contactChangeService;
    private final AccountService accountService;
    private final UserRepository userRepository;
    private final RateLimiter changeRequestRateLimiter;
    private final ContactChangeProperties properties;
    private final Set<String> trustedProxies;
    private final boolean trustLoopback;

    public AccountController(ContactChangeService contactChangeService,
                             AccountService accountService,
                             UserRepository userRepository,
                             @Qualifier("changeRequestRateLimiter") RateLimiter changeRequestRateLimiter,
                             ContactChangeProperties properties,
                             @Value("${app.ratelimit.trusted-proxies:}") String trustedProxies,
                             @Value("${app.ratelimit.trust-loopback:true}") boolean trustLoopback) {
        this.contactChangeService = Objects.requireNonNull(contactChangeService, "contactChangeService");
        this.accountService = Objects.requireNonNull(accountService, "accountService");
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.changeRequestRateLimiter = Objects.requireNonNull(changeRequestRateLimiter, "changeRequestRateLimiter");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.trustLoopback = trustLoopback;
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
     * Password-confirmed edit of the name. Wrong current password
     * → 401 (nothing updated); blank name → 400 (registration validations).
     */
    @PutMapping("/profile")
    public MeResponse updateProfile(@Valid @RequestBody ProfileUpdateRequest body) {
        return accountService.updateProfile(currentUser(), body);
    }

    @PostMapping("/email-change/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public CodeSentDto requestEmailChange(@Valid @RequestBody ChangeEmailRequest body, HttpServletRequest http) {
        requireRate(http);
        contactChangeService.requestEmailChange(currentUser(), body.newEmail());
        return new CodeSentDto((int) properties.cooldownSeconds());
    }

    @PostMapping("/email-change/confirm")
    @ResponseStatus(HttpStatus.OK)
    public void confirmEmailChange(@Valid @RequestBody ConfirmChangeRequest body) {
        ContactChangeResult result = contactChangeService.confirmEmailChange(currentUser(), body.code());
        // H2: the service RETURNS a code failure (its transaction has already
        // committed the failed-attempt increment); the 400 is thrown HERE,
        // after that commit.
        if (!result.ok()) {
            throw new InvalidContactChangeException(result.failureMessage());
        }
    }

    @PostMapping("/phone-change/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public CodeSentDto requestPhoneChange(@Valid @RequestBody ChangePhoneRequest body, HttpServletRequest http) {
        requireRate(http);
        contactChangeService.requestPhoneChange(currentUser(), body.newPhone());
        return new CodeSentDto((int) properties.cooldownSeconds());
    }

    @PostMapping("/phone-change/confirm")
    @ResponseStatus(HttpStatus.OK)
    public void confirmPhoneChange(@Valid @RequestBody ConfirmChangeRequest body) {
        ContactChangeResult result = contactChangeService.confirmPhoneChange(currentUser(), body.code());
        if (!result.ok()) {
            throw new InvalidContactChangeException(result.failureMessage());
        }
    }

    /**
     * GET /account/reviews/mine — the caller's reviews across all shelters,
     * each with the shelter's id + name (user-contributions). Shelter names
     * resolve in one batched query (no N+1); empty list when the user has
     * no reviews.
     */
    @GetMapping("/reviews/mine")
    public List<MyReviewDto> myReviews() {
        return accountService.myReviews(currentUser());
    }

    private void requireRate(HttpServletRequest http) {
        if (!changeRequestRateLimiter.tryAcquire(ClientIps.resolve(http, trustedProxies, trustLoopback))) {
            throw new RateLimitExceededException();
        }
    }

    private RegisteredUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long userId)) {
            // Unreachable in practice: /account/** requires a valid JWT — but
            // if it ever fires, it is an authentication failure (401), not a
            // contact-change validation error (400). Matches the Shelter/
            // Review controller fallback convention.
            throw new InvalidAccessTokenException("Authentication required");
        }
        User user = userRepository.findById(userId);
        if (!(user instanceof RegisteredUser registered)) {
            throw new InvalidContactChangeException("Account not found");
        }
        return registered;
    }
}
