-- official-dataset-csv (roadmap M5): audit trail for registry import runs.
-- One row per run of ShelterImportService.importFromRegistry() — including
-- the runs that change nothing (NOT_MODIFIED / SKIPPED) and the ones that
-- never reached the registry (FAILED). The row is the single source for the
-- UI's "last import" provenance line and for the CSV client's
-- If-Modified-Since (source_version carries the upstream Last-Modified/ETag).
--
-- status: OK | FAILED | NOT_MODIFIED | SKIPPED
-- ddl-auto=validate must stay green against these definitions.

CREATE TABLE data_imports (
    id BIGSERIAL PRIMARY KEY,
    source_name VARCHAR(32) NOT NULL,
    source_version VARCHAR(128),
    imported_at TIMESTAMPTZ NOT NULL,
    records_added INT NOT NULL DEFAULT 0,
    records_updated INT NOT NULL DEFAULT 0,
    records_removed INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    error_message VARCHAR(1000)
);

CREATE INDEX idx_data_imports_source_time ON data_imports (
    source_name, imported_at DESC
);
