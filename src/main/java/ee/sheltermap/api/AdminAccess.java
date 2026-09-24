package ee.sheltermap.api;

import ee.sheltermap.app.AdminAccessException;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.CurrentCaller;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * The fresh per-request ADMIN check shared by every /admin/* controller
 * the kind column is the truth, never a JWT claim — the JWT's userId
 * is re-read from the database and its kind checked on every request, so a
 * token minted before a demotion or deletion fails the instant the kind
 * changes. One implementation for the whole admin surface
 * ({@link AdminController}, {@link AdminGuidanceController},
 * {@link AdminMediaController}, {@link AdminSiteTextController}) so a
 * hardening (a second privileged kind, a suspension rule, a token-issued-at
 * freshness check) is made in exactly one place.
 *
 * <p>The security chain is the first line (a valid token, plus the DB read
 * that grants ADMIN); this is the deliberate second one — a forgotten
 * {@code requireAdmin()} in a new /admin handler is an authorization gap
 * the chain-level rule cannot see, which is why the in-handler re-check
 * stays (see the defence-in-depth note in
 * {@code config/SecurityConfig#configure}).
 */
@Component
public class AdminAccess {

    private final UserRepository userRepository;
    private final CurrentCaller currentCaller;

    public AdminAccess(UserRepository userRepository) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.currentCaller = new CurrentCaller(userRepository);
    }

    /**
     * Anonymous → 401 (same fallback convention as the security entry
     * point, which answers anonymous requests first), an authenticated
     * non-admin → 403. Returns the moderator's user id — every admin WRITE
     * is recorded in the moderation audit trail under it (community-review-
     * queue, crisis-guidance); read endpoints ignore it.
     */
    public long requireAdmin() {
        long userId = currentCaller.requireUserId();
        if (!userRepository.isAdmin(userId)) {
            throw new AdminAccessException("Admin access required");
        }
        return userId;
    }
}
