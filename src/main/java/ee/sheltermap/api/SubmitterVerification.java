package ee.sheltermap.api;

import ee.sheltermap.domain.VerificationLevel;

import java.util.Set;

/**
 * The submitter's verification DEPTH, served with every shelter row.
 *
 * <p>For a row whose author is still alive it is derived on EVERY read
 * from the author's CURRENT active claims — a row added while its
 * submitter had one channel upgrades itself the moment the second
 * channel is confirmed, so the badge cannot go stale (the same
 * derive-on-read discipline as {@code Provenance} and the reporter weights).
 *
 * <p>When the author is gone (the account was erased) the row serves the
 * depth FROZEN on it instead — the V35 snapshot, the standing the row
 * had while the account was active; {@link #stored} is the read seam for
 * that column. {@code null} (the record field is absent) means no depth
 * to serve: a registry row, an orphan whose snapshot is null (a pre-V35
 * orphan, or an author with nothing confirmed at erasure), or a live
 * author with no confirmed channel yet.
 */
public enum SubmitterVerification {

    /** Exactly one confirmed channel, and it is E-MAIL. */
    EMAIL,
    /** Exactly one confirmed channel, and it is PHONE. */
    PHONE,
    /** Exactly one confirmed channel, and it is SMART_ID. */
    SMART_ID,
    /** Two or more confirmed channels — the "fully verified" tier. */
    FULL;

    /**
     * @param levels the author's active (non-revoked) claim levels; null or
     *               empty when there is no author or nothing is confirmed yet
     * @return {@code null} when nothing is verifiable, the single level when
     *         exactly one is confirmed, {@link #FULL} at two or more
     */
    public static SubmitterVerification of(Set<VerificationLevel> levels) {
        if (levels == null || levels.isEmpty()) {
            return null;
        }
        if (levels.size() == 1) {
            return switch (levels.iterator().next()) {
                case EMAIL -> EMAIL;
                case PHONE -> PHONE;
                case SMART_ID -> SMART_ID;
            };
        }
        return FULL;
    }

    /**
     * The read seam for the persisted snapshot (V35, the
     * {@code submitter_verification_snapshot} column): the depth stored
     * under {@code name}, or {@code null} when the row carries no
     * snapshot (the column is null). Served only for rows whose author
     * is gone — the orphaned standing frozen onto the row.
     */
    public static SubmitterVerification stored(String name) {
        return name == null ? null : SubmitterVerification.valueOf(name);
    }
}
