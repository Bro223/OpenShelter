package ee.sheltermap.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import ee.sheltermap.app.DataImportLog;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.ingestion.DevRegistryClient;
import ee.sheltermap.ingestion.RegistryShelterParser;
import ee.sheltermap.ingestion.ShelterImportService;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the data provenance read (official-dataset-csv):
 * an import run appends its data_imports audit row, and
 * {@code GET /api/data-source} surfaces the publisher, the official
 * open-data link, and the last import's facts — publicly, no auth.
 */
@AutoConfigureMockMvc
@Transactional
class DataSourceApiIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    DataImportLog importLog;

    @Autowired
    ShelterRepository shelters;

    private ShelterImportService devImportService() {
        return new ShelterImportService(
                new DevRegistryClient(new ObjectMapper()),
                new RegistryShelterParser(),
                shelters,
                Clock.systemUTC(),
                null,
                importLog);
    }

    @Test
    void importRunWritesAnAuditRowAndTheEndpointSurfacesIt() throws Exception {
        // the dev fixture: 3 valid rows, 2 malformed (same as RegistryImportIT)
        ee.sheltermap.ingestion.ImportResult result = devImportService().importFromRegistry();
        assertThat(result.created()).isEqualTo(3);

        DataImportLog.Row row = importLog.findLatest().orElseThrow();
        assertThat(row.sourceName()).isEqualTo("PAASETEAMET");
        assertThat(row.status()).isEqualTo("OK");
        assertThat(row.recordsAdded()).isEqualTo(3);
        assertThat(row.recordsUpdated()).isZero();
        assertThat(row.recordsRemoved()).isZero();

        mvc.perform(get("/api/data-source"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceName").value("Päästeamet"))
                .andExpect(jsonPath("$.officialUrl")
                        .value("https://www.rescue.ee/et/juhend/avaandmed/avalikud-varjumiskohad"))
                .andExpect(jsonPath("$.lastImport.status").value("OK"))
                .andExpect(jsonPath("$.lastImport.recordsAdded").value(3))
                .andExpect(jsonPath("$.lastImport.at").isNotEmpty());
    }

    @Test
    void noImportYetMeansNullLastImport() throws Exception {
        mvc.perform(get("/api/data-source"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceName").value("Päästeamet"))
                // Jackson serializes the absent last import as JSON null
                .andExpect(jsonPath("$.lastImport").isEmpty());
    }
}
