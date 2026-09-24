package ee.sheltermap.domain;

/**
 * The admin's community review decision (community-review-queue v2) —
 * the rare manual override; the primary trust flow is the automatic
 * community one. CONFIRM promotes the row to CONFIRMED (status
 * untouched, note cleared); REJECT hides it (review_status REJECTED +
 * status INACTIVE, reason stored as the note). NEW is never a decision —
 * only the submission creates it.
 */
public enum ReviewDecision {
    CONFIRM,
    REJECT
}
