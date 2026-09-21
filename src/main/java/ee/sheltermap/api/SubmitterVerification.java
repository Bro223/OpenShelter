package ee.sheltermap.api;

import ee.sheltermap.domain.VerificationLevel;

import java.util.Set;

/**
 * The submitter's verification DEPTH, served with every shelter row.
 *
 * <p>Derived on EVERY read from the author's CURRENT active claims and never
 * stored on the shelter, so a row added while its submitter had one channel
 * upgrades itself the moment the second channel is confirmed — the badge
 * cannot go stale, and there is no backfill to forget (the same
 * derive-on-read discipline as {@code Provenance} and the reporter weights).
 *
 * <p>The value names the single channel when there is exactly one and
 * {@link #FULL} at two or more: the "fully verified" tier the owner asked
 * for, generalised over the three channels {@link VerificationPolicy} knows so
 * a Smart-ID user is never silently reported as partial. {@code null} (the
 * record field is absent) means no submitter to describe: a registry row, a
 * pre-V7 legacy row, a deleted account, or an author with no confirmed channel
 * yet.
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
}
