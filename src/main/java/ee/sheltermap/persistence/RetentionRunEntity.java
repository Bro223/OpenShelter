package ee.sheltermap.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * JPA entity for {@code retention_runs} (V24, retention-pruning) — one
 * row per retention run, written by {@link JpaRetentionRunLog}.
 */
@Entity
@Table(name = "retention_runs")
public class RetentionRunEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ran_at", nullable = false)
    private Instant ranAt;

    @Column(name = "accounts_pruned", nullable = false)
    private int accountsPruned;

    @Column(name = "audit_rows_pruned", nullable = false)
    private int auditRowsPruned;

    /** OK | FAILED. */
    @Column(nullable = false, length = 16)
    private String status;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    RetentionRunEntity() {
    }

    RetentionRunEntity(Instant ranAt, int accountsPruned, int auditRowsPruned,
                       String status, String errorMessage) {
        this.ranAt = ranAt;
        this.accountsPruned = accountsPruned;
        this.auditRowsPruned = auditRowsPruned;
        this.status = status;
        this.errorMessage = errorMessage;
    }

    public Long getId() {
        return id;
    }

    public Instant getRanAt() {
        return ranAt;
    }

    public int getAccountsPruned() {
        return accountsPruned;
    }

    public int getAuditRowsPruned() {
        return auditRowsPruned;
    }

    public String getStatus() {
        return status;
    }

    public String getErrorMessage() {
        return errorMessage;
    }
}
