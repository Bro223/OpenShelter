package ee.sheltermap.persistence;

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

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Optimistic-lock counter (B7b, column added by the V8 migration).
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
     * Auto-hide disarm flag (V9, D1): while FALSE the 5th NON_EXISTENT
     * report may auto-hide the shelter; the admin restore (later change)
     * sets it TRUE.
     */
    @Column(name = "auto_hide_disarmed", nullable = false)
    private boolean autoHideDisarmed;

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
}
