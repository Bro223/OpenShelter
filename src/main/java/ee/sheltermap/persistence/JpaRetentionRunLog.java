package ee.sheltermap.persistence;

import ee.sheltermap.app.TextTruncation;
import ee.sheltermap.retention.RetentionRunLog;
import org.springframework.stereotype.Repository;

import java.util.Objects;

/**
 * JPA implementation of {@link RetentionRunLog}.
 * A plain JPA save in the caller's context — the run row is written
 * outside any prune transaction (a single-row save, no wrapping needed;
 * the same-transaction guarantee of the action logs does not apply to a
 * job-run audit — the FAILED row must survive the failure it records).
 */
@Repository
public class JpaRetentionRunLog implements RetentionRunLog {

    private final SpringDataRetentionRunRepository runs;

    public JpaRetentionRunLog(SpringDataRetentionRunRepository runs) {
        this.runs = Objects.requireNonNull(runs, "runs");
    }

    @Override
    public void record(Row row) {
        runs.save(new RetentionRunEntity(
                row.ranAt(), row.accountsPruned(), row.auditRowsPruned(),
                row.status(), TextTruncation.truncate(row.errorMessage(), 1000)));
    }
}
