package ee.sheltermap.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * JPA entity for {@code data_imports} (V15) — one
 * row per registry import run, written by {@link JpaDataImportLog}.
 */
@Entity
@Table(name = "data_imports")
public class DataImportEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_name", nullable = false, length = 32)
    private String sourceName;

    /** Upstream data version (HTTP Last-Modified / ETag); null when the
     *  source publishes no version or the run never reached it. */
    @Column(name = "source_version", length = 128)
    private String sourceVersion;

    @Column(name = "imported_at", nullable = false)
    private Instant importedAt;

    @Column(name = "records_added", nullable = false)
    private int recordsAdded;

    @Column(name = "records_updated", nullable = false)
    private int recordsUpdated;

    @Column(name = "records_removed", nullable = false)
    private int recordsRemoved;

    /** OK | FAILED | NOT_MODIFIED | SKIPPED. */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    DataImportEntity() {
    }

    DataImportEntity(String sourceName, String sourceVersion, Instant importedAt,
                     int recordsAdded, int recordsUpdated, int recordsRemoved,
                     String status, String errorMessage) {
        this.sourceName = sourceName;
        this.sourceVersion = sourceVersion;
        this.importedAt = importedAt;
        this.recordsAdded = recordsAdded;
        this.recordsUpdated = recordsUpdated;
        this.recordsRemoved = recordsRemoved;
        this.status = status;
        this.errorMessage = errorMessage;
    }

    public Long getId() {
        return id;
    }

    public String getSourceName() {
        return sourceName;
    }

    public String getSourceVersion() {
        return sourceVersion;
    }

    public Instant getImportedAt() {
        return importedAt;
    }

    public int getRecordsAdded() {
        return recordsAdded;
    }

    public int getRecordsUpdated() {
        return recordsUpdated;
    }

    public int getRecordsRemoved() {
        return recordsRemoved;
    }

    public String getStatus() {
        return status;
    }

    public String getErrorMessage() {
        return errorMessage;
    }
}
