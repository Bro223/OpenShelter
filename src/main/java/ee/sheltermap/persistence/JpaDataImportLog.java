package ee.sheltermap.persistence;

import ee.sheltermap.app.DataImportLog;
import ee.sheltermap.app.TextTruncation;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Objects;

/**
 * JPA implementation of {@link DataImportLog} (official-dataset-csv).
 * A plain JPA save in the caller's context — the import apply phase runs in
 * its own transaction, and the FAILED / overlap-skip rows are written
 * outside any import transaction (a single-row save, no wrapping needed).
 */
@Repository
public class JpaDataImportLog implements DataImportLog {

    private final SpringDataDataImportRepository imports;

    public JpaDataImportLog(SpringDataDataImportRepository imports) {
        this.imports = Objects.requireNonNull(imports, "imports");
    }

    @Override
    public void record(Row row) {
        DataImportEntity entity = new DataImportEntity(
                row.sourceName(), row.sourceVersion(), row.importedAt(),
                row.recordsAdded(), row.recordsUpdated(), row.recordsRemoved(),
                row.status(), TextTruncation.truncate(row.errorMessage(), 1000));
        imports.save(entity);
    }

    @Override
    public Optional<Row> findLatestBySource(String sourceName) {
        return imports.findTopBySourceNameOrderByImportedAtDescIdDesc(sourceName).map(this::toRow);
    }

    @Override
    public Optional<Row> findLatest() {
        return imports.findTopByOrderByImportedAtDescIdDesc().map(this::toRow);
    }

    @Override
    public Optional<Row> findLatestVerifiedBySource(String sourceName) {
        return imports.findTopBySourceNameAndStatusInOrderByImportedAtDescIdDesc(
                sourceName, DataImportLog.VERIFIED_STATUSES).map(this::toRow);
    }

    private Row toRow(DataImportEntity e) {
        return new Row(e.getSourceName(), e.getSourceVersion(), e.getImportedAt(),
                e.getRecordsAdded(), e.getRecordsUpdated(), e.getRecordsRemoved(),
                e.getStatus(), e.getErrorMessage());
    }
}
