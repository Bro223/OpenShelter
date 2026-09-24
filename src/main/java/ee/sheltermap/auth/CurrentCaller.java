package ee.sheltermap.auth;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Objects;

/**
 * The per-request authenticated-caller lookup, shared by every API
 * surface that resolves the JWT principal to a user: before this
 * extraction the "read the principal, resolve the user" sequence had a
 * copy per caller ({@code ShelterController} twice — the column-only id
 * probe and the full row load — and {@code AdminAccess} once), and the
 * auth package's own account/verification controllers each carried a
 * third shape of it (moved here from {@code ee.sheltermap.api},
 * the neutral home for the primitive — both the api and the auth
 * controllers consume it, and the api already depends on the auth
 * package, never the reverse). One implementation, three behaviours
 * with the exact status vocabulary each caller had:
 *
 * <ul>
 *   <li>{@link #callerIdOrNull()} — anonymous or an erased row: {@code
 *       null}; never throws (public reads).</li>
 *   <li>{@link #requireUserId()} — anonymous: 401. No row load — callers
 *       that only need the id (audit actors, ownership checks) stay
 *       off the PII decrypt path.</li>
 *   <li>{@link #requireUser()} — anonymous: 401; a token-valid caller
 *       whose row no longer exists: 401 "Unknown user". The full domain
 *       mapping (e-mail/phone envelope decrypt + claims query) — use it
 *       only where the caller's fields are actually needed.</li>
 * </ul>
 *
 * <p>The principal is the JWT's user id ({@code Long}, minted by the
 * {@code JwtAuthenticationFilter} convention) — never a username, never
 * a claim that could predate a deletion. Not a Spring bean on purpose:
 * the callers' constructors are the wiring point (each holds its
 * {@link UserRepository}), and the class reads the thread-bound
 * {@link SecurityContextHolder} state, so there is nothing to inject.
 */
public final class CurrentCaller {

    private final UserRepository userRepository;

    public CurrentCaller(UserRepository userRepository) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
    }

    /**
     * The authenticated caller's id, or {@code null} for anonymous reads
     * — the detail projection's {@code yourOccupancyBand} is null for a
     * {@code null} caller, so this never throws on public GETs.
     *
     * <p>COLUMN-ONLY on purpose (the {@code JwtAuthenticationFilter}
     * convention): the public detail read runs per request and the
     * projection only ever needs the caller's id — it must not pay the
     * caller's full domain mapping (PII decrypt of the e-mail/phone
     * envelopes + the claims query) for a read. A token-valid caller
     * whose row was DELETED keeps the erasure contract (legal-recovery):
     * unknown ids degrade to the guest projection, exactly the behavior
     * the old {@code findById}-and-{@code null-check} had.
     */
    public Long callerIdOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Long userId) {
            return userRepository.existsById(userId) ? userId : null;
        }
        return null;
    }

    /**
     * The authenticated caller's id, or 401 for an anonymous request
     * (same fallback convention as the security entry point, which
     * answers anonymous requests first). NO row load: the id is the JWT
     * principal, re-validated against the database only where the
     * caller's kind or fields matter ({@link #requireUser()}).
     */
    public long requireUserId() {
        Long userId = principalIdOrNull();
        if (userId == null) {
            throw new InvalidAccessTokenException("Authentication required");
        }
        return userId;
    }

    /**
     * The authenticated caller's user row, or 401. A token-valid caller
     * whose row was deleted answers "Unknown user" (401, not 403): the
     * erasure is total, the request has no subject, and the caller must
     * re-authenticate rather than learn that an account once existed.
     */
    public User requireUser() {
        return requireUser(requireUserId());
    }

    /**
     * The caller's row for an id already established by
     * {@link #requireUserId()}, or {@code null} when the row no longer
     * exists — the row-load half of the lookup WITHOUT deciding the
     * error vocabulary: the auth controllers resolve the id
     * through {@link #requireUserId()} (their 401 convention) and map a
     * gone or guest row to their own documented message, so the
     * per-surface status vocabulary stays exactly what each endpoint
     * had while the SecurityContext read + row-load sequence lives
     * here once instead of once per controller.
     */
    public User userOrNull(long userId) {
        return userRepository.findById(userId);
    }

    /**
     * The caller's row for an id already established by
     * {@link #requireUserId()}, or 401 "Unknown user" when the row is
     * gone (the {@link #requireUser()} vocabulary, for callers that do
     * NOT remap the erasure themselves).
     */
    public User requireUser(long userId) {
        User user = userOrNull(userId);
        if (user == null) {
            throw new InvalidAccessTokenException("Unknown user");
        }
        return user;
    }

    /** The JWT principal as a user id, or {@code null} when absent. */
    private static Long principalIdOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Long userId) {
            return userId;
        }
        return null;
    }
}
