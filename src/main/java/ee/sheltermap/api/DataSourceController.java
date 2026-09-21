package ee.sheltermap.api;

import ee.sheltermap.app.DataImportLog;
import ee.sheltermap.ingestion.CsvRegistryClient;
import ee.sheltermap.ingestion.RegistryProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public provenance read (official-dataset-csv): the map is built from
 * the Päästeamet open-data shelter dataset, and the app says so — source,
 * link to the official open-data page, and when the last import ran.
 */
@Tag(name = "Data source",
        description = "The public provenance read (official-dataset-csv M5): the "
                + "map is built from the Päästeamet open-data shelter dataset, "
                + "and the app says so — source, link to the official open-data "
                + "page, and when the last import ran. Public (no JWT).")
@RestController
@RequestMapping(value = "/api/data-source", produces = MediaType.APPLICATION_JSON_VALUE)
public class DataSourceController {

    private final RegistryProperties properties;
    private final DataImportLog importLog;

    public DataSourceController(RegistryProperties properties, DataImportLog importLog) {
        this.properties = properties;
        this.importLog = importLog;
    }

    @GetMapping
    @Operation(summary = "Where the official shelter data comes from",
            description = "The publisher, the link to the official open-data "
                    + "page, and when the last import ran (lastImport null "
                    + "until the first import). The app-wide footer shows this "
                    + "to everyone.")
    @ApiResponse(responseCode = "200", description = "The provenance payload",
            content = @Content(schema = @Schema(implementation = DataSourceDto.class)))
    @SecurityRequirements({})
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
