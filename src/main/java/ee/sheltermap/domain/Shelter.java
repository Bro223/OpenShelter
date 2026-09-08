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
 */
public class Shelter {

    private Long id;
    private final String name;
    private final GeoPoint location;
    private final ShelterStatus status;
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

    /** Author user id ({@code null} for registry rows and pre-V7 legacy USER rows). */
    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
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
}
