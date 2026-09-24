package ee.sheltermap.domain;

/**
 * Whether the submitter declared the location a private home or private
 * shelter (community-review-queue v2) — a declaration, not a
 * detection: the data to detect it does not exist, so the submitter
 * ticks the checkbox.
 *
 * <p>PRIVATE rows are NOT demoted or hidden — a resident may
 * legitimately offer their home as a refuge for people far from home;
 * every surface (list row, detail, admin) shows the "Private location"
 * badge instead.
 */
public enum LocationKind {
    PUBLIC,
    PRIVATE
}
