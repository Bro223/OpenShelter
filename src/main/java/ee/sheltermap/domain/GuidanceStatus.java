package ee.sheltermap.domain;

/**
 * The publication state of a guidance post (crisis-guidance). A post
 * is PUBLISHED if and only if its {@code publishedAt} is stamped — the
 * V23 CHECK enforces the pairing in the database.
 */
public enum GuidanceStatus {

    /** Not public: hidden from both public endpoints, editable in place; the slug is still reserved (unique across all posts). */
    DRAFT,

    /** Public: listed pinned-first on the index, readable on its slug. */
    PUBLISHED
}
