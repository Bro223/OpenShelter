package ee.sheltermap.api;

import ee.sheltermap.app.DataImportLog;
import ee.sheltermap.ingestion.CsvRegistryClient;
import ee.sheltermap.ingestion.RegistryProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public provenance read (official-dataset-csv M5): the map is built from
 * the Päästeamet open-data shelter dataset, and the app says so — source,
 * link to the official open-data page, and when the last import ran.
 */
@RestController
@RequestMapping("/api/data-source")
public class DataSourceController {

    private final RegistryProperties properties;
    private final DataImportLog importLog;

    public DataSourceController(RegistryProperties properties, DataImportLog importLog) {
        this.properties = properties;
        this.importLog = importLog;
    }

    @GetMapping
    public DataSourceDto dataSource() {
        return new DataSourceDto(
                CsvRegistryClient.SOURCE_NAME,
                properties.officialUrl(),
                importLog.findLatest().map(row -> new DataSourceDto.LastImport(
                        row.importedAt(), row.status(), row.sourceVersion(),
                        row.recordsAdded(), row.recordsUpdated(), row.recordsRemoved()))
                        .orElse(null));
    }
}
