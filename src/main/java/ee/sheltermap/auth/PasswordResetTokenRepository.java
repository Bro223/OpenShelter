package ee.sheltermap.auth;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Persistence seam for {@link PasswordResetToken} (03-auth.puml). Real
 * implementation in {@code ee.sheltermap.persistence}; tests may use a fake.
 *
 * <p>At most ONE active (unused, unexpired) token exists per user — a new
 * request invalidates the previous one ({@link #deleteActiveByUserId}).
 */
public interface PasswordResetTokenRepository {

    void save(PasswordResetToken token);

    /**
     * The user's single active (unused, unexpired) token, or {@code null}
     * when the user has no pending code.
     */
    PasswordResetToken findActiveByUserId(Long userId, Instant now);

    /** Deletes the user's active (unused, unexpired) token, if any. */
    void deleteActiveByUserId(Long userId, Instant now);

    /**
     * Rotation protection (S1b, V8 {@code created_at}): the user's most
     * recent reset request by creation time, or {@code null} if the user
     * has never requested a reset.
     */
    Instant findLatestCreatedAtByUserId(Long userId);

    /**
     * Rotation protection (S1b, V8): how many of the user's reset rows were
     * created during the given UTC day (the per-UTC-day reissue cap counts
     * issued codes, including used ones — the cap is on e-mails sent).
     */
    long countCreatedOnUtcDayByUserId(Long userId, LocalDate utcDay);

    /**
     * Bounds table growth for active users (S1c): deletes the user's rows
     * past expiry ({@code expires_at < now}). Used/expired history of
     * dormant users is left alone — a global prune scheduler is a docs job.
     */
    void deleteExpiredByUserId(Long userId, Instant now);
}
