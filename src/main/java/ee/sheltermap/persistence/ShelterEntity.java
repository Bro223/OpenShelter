package ee.sheltermap.persistence;

import ee.sheltermap.domain.LocationKind;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** JPA entity for {@code shelters}. {@code externalId} is NULL for USER submissions. */
@Entity
@Table(name = "shelters")
public class ShelterEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ShelterStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ShelterSource source;

    @Column(name = "external_id", length = 128)
    private String externalId;

    @Column(length = 512)
    private String address;

    @Column(length = 255)
    private String county;

    @Column(length = 255)
    private String municipality;

    @Column(name = "data_as_of", length = 32)
    private String dataAsOf;

    @Column(name = "source_attribution", length = 255)
    private String sourceAttribution;

    @Column(length = 2000)
    private String description;

    private Integer capacity;

    /** Author user id (V7) — NULL for registry rows and pre-V7 legacy USER rows. */
    @Column(name = "created_by")
    private Long createdBy;

    /**
     * Write-time trust snapshot (V31): the submitter's verified
     * standing as at write time; NULL = no snapshot (pre-V31 rows, registry
     * rows) — the read falls back to the live author derivation.
     */
    @Column(name = "submitter_verified_at_creation")
    private Boolean submitterVerifiedAtCreation;

    /**
     * Depth twin of the V31 boolean snapshot (V35): the submitter's
     * verification depth, frozen onto the row — at submission as at
     * write time, re-frozen at erasure to the row's standing at that
     * moment. One of the SubmitterVerification names, or NULL (pre-V35
     * rows, registry rows, an author with nothing confirmed at erasure)
     * — an orphaned row with NULL reads unverified (the no-backfill
     * decision).
     */
    @Column(name = "submitter_verification_snapshot", length = 16)
    private String submitterVerificationSnapshot;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Optimistic-lock counter (column added by the V8 migration).
     * A concurrent writer bumps it between a reader's SELECT and UPDATE,
     * the UPDATE matches zero rows and the flush raises an
     * {@code OptimisticLockException} instead of silently clobbering.
     * The domain {@code Shelter} carries no version, so persistence
     * preserves it by mutating the managed row in place (see
     * {@code JpaShelterRepository#save}) — never a fresh-entity merge.
     */
    @Version
    @Column(name = "version")
    private Long version;

    /**
     * Auto-hide disarm flag (V9): while FALSE the 5th NON_EXISTENT
     * report may auto-hide the shelter; the admin restore
     * sets it TRUE.
     */
    @Column(name = "auto_hide_disarmed", nullable = false)
    private boolean autoHideDisarmed;

    /**
     * Community trust state (V11). NOT
     * NULL with the DB default NEW; the V11 backfill is the authority for
     * existing rows (USER → NEW, registry → CONFIRMED). The domain
     * aggregate carries the CONFIRMED default (the registry side), so
     * INSERTs are always explicit.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 20)
    private ReviewStatus reviewStatus;

    /** The admin's note (the REJECT reason), V11. */
    @Column(name = "review_note", length = 500)
    private String reviewNote;

    /** The submitter's private-home declaration (V11). */
    @Enumerated(EnumType.STRING)
    @Column(name = "location_kind", nullable = false, length = 10)
    private LocationKind locationKind;

    /** "Mark inaccurate" stamp (V20); NULL = not marked. */
    @Column(name = "inaccurate_marked_at")
    private Instant inaccurateMarkedAt;

    /** The moderating admin id of the mark (V20); NULL while unmarked. NO FK (V20). */
    @Column(name = "inaccurate_marked_by")
    private Long inaccurateMarkedBy;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public ShelterStatus getStatus() {
        return status;
    }

    public void setStatus(ShelterStatus status) {
        this.status = status;
    }

    public ShelterSource getSource() {
        return source;
    }

    public void setSource(ShelterSource source) {
        this.source = source;
    }

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCounty() {
        return county;
    }

    public void setCounty(String county) {
        this.county = county;
    }

    public String getMunicipality() {
        return municipality;
    }

    public void setMunicipality(String municipality) {
        this.municipality = municipality;
    }

    public String getDataAsOf() {
        return dataAsOf;
    }

    public void setDataAsOf(String dataAsOf) {
        this.dataAsOf = dataAsOf;
    }

    public String getSourceAttribution() {
        return sourceAttribution;
    }

    public void setSourceAttribution(String sourceAttribution) {
        this.sourceAttribution = sourceAttribution;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

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

    public String getSubmitterVerificationSnapshot() {
        return submitterVerificationSnapshot;
    }

    public void setSubmitterVerificationSnapshot(String submitterVerificationSnapshot) {
        this.submitterVerificationSnapshot = submitterVerificationSnapshot;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
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
        this.reviewStatus = reviewStatus;
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
        this.locationKind = locationKind;
    }

    public Instant getInaccurateMarkedAt() {
        return inaccurateMarkedAt;
    }

    public void setInaccurateMarkedAt(Instant inaccurateMarkedAt) {
        this.inaccurateMarkedAt = inaccurateMarkedAt;
    }

    public Long getInaccurateMarkedBy() {
        return inaccurateMarkedBy;
    }

    public void setInaccurateMarkedBy(Long inaccurateMarkedBy) {
        this.inaccurateMarkedBy = inaccurateMarkedBy;
    }
}
