package ee.sheltermap.domain;

/**
 * A reporter's derived trust weight (community-self-moderation, D1).
 *
 * <p>The weight is NEVER stored: it is re-derived from the rows that
 * already exist (the reporter's own submissions + the moderation audit
 * trail) in the report-write transaction, so it cannot drift and a
 * rolled-back report leaves no score behind.
 *
 * <ul>
 *   <li>1 — the baseline verified account;</li>
 *   <li>+1 — the reporter has at least one USER submission in review
 *       state CONFIRMED (their own content was cross-verified);</li>
 *   <li>+1 — the reporter's own {@code AUTO_CONFIRM} audit actions
 *       number at least two (their positive reports kept coming true);
 *       one is not yet a pattern;</li>
 *   <li>capped at 3.</li>
 * </ul>
 *
 * <p>Trust only ever helps reach the NEGATIVE consensus faster
 * (the weighted {@code NON_EXISTENT} auto-hide tally); it never gates
 * the positive side (the auto-confirm promotion stays one cross-user
 * report).
 */
public record ReporterTrust(int weight) {

    /** The baseline weight of any verified account. */
    public static final int BASELINE = 1;
    /** The weight cap. */
    public static final int MAX = 3;
    /** Own AUTO_CONFIRM actions that earn the second trust point. */
    public static final int PROVEN_POSITIVE_REPORTS = 2;

    public ReporterTrust {
        if (weight < BASELINE || weight > MAX) {
            throw new IllegalArgumentException(
                    "trust weight must be between " + BASELINE + " and " + MAX);
        }
    }

    /**
     * Derives the weight from the reporter's existing rows.
     *
     * @param crossVerifiedSubmission the reporter has ≥ 1 USER
     *                                submission in review state CONFIRMED
     * @param ownAutoConfirms         the reporter's own AUTO_CONFIRM
     *                                moderation actions
     */
    public static ReporterTrust of(boolean crossVerifiedSubmission, int ownAutoConfirms) {
        if (ownAutoConfirms < 0) {
            throw new IllegalArgumentException("ownAutoConfirms must not be negative");
        }
        int weight = BASELINE;
        if (crossVerifiedSubmission) {
            weight++;
        }
        if (ownAutoConfirms >= PROVEN_POSITIVE_REPORTS) {
            weight++;
        }
        return new ReporterTrust(Math.min(weight, MAX));
    }
}
