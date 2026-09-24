package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * A shelter on the map. User submissions: {@code externalId = null},
 * {@code source = USER}, created {@code ACTIVE} immediately. Registry rows
 * (source = REGISTRY) additionally carry the full published record
 * (address, county, municipality, data as-of, attribution) so the app owns
 * the complete dataset — the public API exposes only a lean projection.
 *
 * <p>{@code createdBy} links USER submissions to their author (V7) —
 * registry rows and pre-V7 legacy USER rows have a {@code null} author and
 * are unmanageable by anyone.
 *
 * <p>{@code status} is the lifecycle field (ACTIVE/INACTIVE): the trust
 * layer's auto-hide, the community-report auto-hide and the admin
 * hide/restore move it.
 * {@code reviewStatus} is the community trust state
 * (community-review-queue v2) — a separate dimension: there is no
 * blocking queue, community rows publish immediately as NEW and move to
 * CONFIRMED automatically (a positive community report from a
 * non-submitter) or via the rare admin CONFIRM; REJECT hides via
 * {@code status = INACTIVE}. Defaults {@code CONFIRMED}, matching the
 * V11 backfill for registry rows; the submission service sets NEW on new
 * USER rows. {@code locationKind} is the submitter's private-home
 * declaration.
 */
public class Shelter {

    private Long id;
    private final String name;
    private final GeoPoint location;
    private ShelterStatus status;
    private final String externalId;
    private final ShelterSource source;
    private final String address;
    private final String county;
    private final String municipality;
    private final String dataAsOf;
    private final String sourceAttribution;
    private final String description;
    private final Integer capacity;
    private Instant createdAt;
    /** Author (submitting user's id) for USER submissions; {@code null} for registry/legacy rows. */
    private Long createdBy;
    /**
     * Write-time trust snapshot (V31, part 2 of the erasure fix): the
     * submitter's verified standing AS AT THE MOMENT OF SUBMISSION —
     * {@code true} when the submitting account had at least one active
     * verification claim when it wrote the row, {@code false} when it did
     * not, {@code null} when there is no snapshot (pre-V31 rows, registry
     * rows, other write paths). Account erasure SET NULLs {@code createdBy}
     * (V7) and must not change the standing — reads prefer this column
     * when present and fall back to the live author derivation when it is
     * null (an orphaned pre-V31 row then resolves unverified; the
     * backfill policy for those rows is an owner decision).
     */
    private Boolean submitterVerifiedAtCreation;
    /**
     * Auto-hide disarm flag (V9): while {@code false} the 5th
     * {@code NON_EXISTENT} report may auto-hide the shelter; a manual
     * admin restore sets it {@code true} (the admin-moderation change owns
     * the write path — the auto-hide condition honours it from day one).
     */
    private boolean autoHideDisarmed;
    /**
     * Community trust state (community-review-queue v2). Defaults
     * {@code CONFIRMED} — matching the V11 backfill for registry rows
     * (official data), so registry imports keep their exact state;
     * only the submission service creates a NEW row.
     */
    private ReviewStatus reviewStatus = ReviewStatus.CONFIRMED;
    /** The admin's note (the REJECT reason); {@code null} while nothing is said. */
    private String reviewNote;
    /** The submitter's private-home declaration (community-review-queue v2). */
    private LocationKind locationKind = LocationKind.PUBLIC;
    /**
     * "Mark inaccurate" stamp (moderation-dashboard-completion):
     * set by the admin mark, cleared by the admin clear; {@code null} = not
     * marked. The row stays visible — this is a public warning flag, not a
     * lifecycle state (status and reviewStatus are untouched).
     */
    private Instant inaccurateMarkedAt;
    /** The moderating admin's user id; {@code null} while unmarked (NO-FK semantics, V20). */
    private Long inaccurateMarkedBy;

    public Shelter(String name, GeoPoint location, ShelterStatus status, String externalId, ShelterSource source) {
        this(name, location, status, externalId, source, null, null, null, null, null, null, null);
    }

    /** Registry constructor — registry fields are {@code null} for USER submissions. */
    public Shelter(String name, GeoPoint location, ShelterStatus status, String externalId, ShelterSource source,
                   String address, String county, String municipality, String dataAsOf, String sourceAttribution) {
        this(name, location, status, externalId, source, address, county, municipality, dataAsOf, sourceAttribution,
                null, null);
    }

    /** Full constructor — {@code description}/{@code capacity} are USER-submission details. */
    public Shelter(String name, GeoPoint location, ShelterStatus status, String externalId, ShelterSource source,
                   String address, String county, String municipality, String dataAsOf, String sourceAttribution,
                   String description, Integer capacity) {
        this.name = Objects.requireNonNull(name, "name");
        this.location = Objects.requireNonNull(location, "location");
        this.status = Objects.requireNonNull(status, "status");
        this.externalId = externalId; // null for USER submissions
        this.source = Objects.requireNonNull(source, "source");
        this.address = address;
        this.county = county;
        this.municipality = municipality;
        this.dataAsOf = dataAsOf;
        this.sourceAttribution = sourceAttribution;
        this.description = description;
        this.capacity = capacity;
    }

    public Long getId() {
        return id;
    }

    /** Assigned by persistence/repositories; {@code null} until persisted. */
    public void setId(Long id) {
        this.id = id;
    }

    /** Creation time, owned by the database ({@code created_at}, DEFAULT now()). */
    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    /**
     * Status transition — the only caller is the trust layer's auto-hide.
     * Kept deliberately plain: the admin restore
     * (admin-moderation) reuses it.
     */
    public void setStatus(ShelterStatus status) {
        this.status = Objects.requireNonNull(status, "status");
    }

    public boolean isAutoHideDisarmed() {
        return autoHideDisarmed;
    }

    public void setAutoHideDisarmed(boolean autoHideDisarmed) {
        this.autoHideDisarmed = autoHideDisarmed;
    }

    public ReviewStatus getReviewStatus() {
        return reviewStatus;
    }

    public void setReviewStatus(ReviewStatus reviewStatus) {
        this.reviewStatus = Objects.requireNonNull(reviewStatus, "reviewStatus");
    }

    public String getReviewNote() {
        return reviewNote;
    }

    public void setReviewNote(String reviewNote) {
        this.reviewNote = reviewNote;
    }

    public LocationKind getLocationKind() {
        return locationKind;
    }

    public void setLocationKind(LocationKind locationKind) {
        this.locationKind = Objects.requireNonNull(locationKind, "locationKind");
    }

    /** Author user id ({@code null} for registry rows and pre-V7 legacy USER rows). */
    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public Boolean getSubmitterVerifiedAtCreation() {
        return submitterVerifiedAtCreation;
    }

    public void setSubmitterVerifiedAtCreation(Boolean submitterVerifiedAtCreation) {
        this.submitterVerifiedAtCreation = submitterVerifiedAtCreation;
    }

    public String getName() {
        return name;
    }

    public GeoPoint getLocation() {
        return location;
    }

    public ShelterStatus getStatus() {
        return status;
    }

    public String getExternalId() {
        return externalId;
    }

    public ShelterSource getSource() {
        return source;
    }

    public String getAddress() {
        return address;
    }

    public String getCounty() {
        return county;
    }

    public String getMunicipality() {
        return municipality;
    }

    public String getDataAsOf() {
        return dataAsOf;
    }

    public String getSourceAttribution() {
        return sourceAttribution;
    }

    public String getDescription() {
        return description;
    }

    public Integer getCapacity() {
        return capacity;
    }

    /** "Mark inaccurate" stamp; {@code null} while unmarked. */
    public Instant getInaccurateMarkedAt() {
        return inaccurateMarkedAt;
    }

    public void setInaccurateMarkedAt(Instant inaccurateMarkedAt) {
        this.inaccurateMarkedAt = inaccurateMarkedAt;
    }

    /** The moderating admin id of the mark; {@code null} while unmarked. */
    public Long getInaccurateMarkedBy() {
        return inaccurateMarkedBy;
    }

    public void setInaccurateMarkedBy(Long inaccurateMarkedBy) {
        this.inaccurateMarkedBy = inaccurateMarkedBy;
    }
}
