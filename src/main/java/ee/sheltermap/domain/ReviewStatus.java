package ee.sheltermap.domain;

/**
 * Community trust state of a shelter row (community-review-queue v2
 *).
 *
 * <p>There is NO blocking queue (the owner does not actively moderate):
 * new community rows publish immediately as {@code NEW}; a positive
 * community report ({@code OPEN_CONFIRMED}) from a user other than the
 * submitter promotes NEW→CONFIRMED automatically (or the rare admin
 * CONFIRM does it manually). {@code REJECTED} is set by the admin REJECT
 * and hides the row by flipping {@code status = INACTIVE} (the existing
 * mechanism) — restoring it via the admin status endpoint reverts the
 * review state to NEW (it starts over).
 *
 * <p>Existing rows are backfilled by the V11 migration: USER rows NEW
 * (no confirmation evidence yet), registry rows CONFIRMED (official
 * data; informational for them).
 */
public enum ReviewStatus {
    NEW,
    CONFIRMED,
    REJECTED
}
