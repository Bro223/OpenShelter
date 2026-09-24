package ee.sheltermap.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.fail;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The OpenAPI snapshot gate: {@code docs/api/openapi.json}
 * is the committed, reviewable companion of the runtime document. This IT
 * fetches {@code /v3/api-docs}, normalizes it deterministically and compares
 * it with the committed snapshot.
 *
 * <p>Normalization (the three rot sources, per the plan): object keys are
 * sorted recursively (map ordering is not stable), arrays keep their
 * semantic order (enum values, required lists), and {@code servers} is
 * dropped (a host in the snapshot would silently rot — the document
 * publishes one relative server, "/").
 *
 * <p>Regeneration is ONE sanctioned command: re-run with
 * {@code -Dopenapi.update=true} and the test writes the file instead of
 * failing.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "springdoc.api-docs.enabled=true",
        "springdoc.swagger-ui.enabled=true"
})
class OpenApiSnapshotIT extends AbstractPersistenceIT {

    /** The committed snapshot (repo-relative — surefire runs from the basedir). */
    static final Path SNAPSHOT = Path.of("docs", "api", "openapi.json");

    /** The only sanctioned way to change the snapshot. */
    static final String UPDATE_FLAG = "openapi.update";

    static final String REGENERATE =
            "mvn -Dopenapi.update=true -Dtest=OpenApiSnapshotIT test "
                    + "(then commit the regenerated docs/api/openapi.json)";

    @Autowired
    MockMvc mvc;

    @Test
    void theCommittedSnapshotMatchesTheGeneratedDocument() throws Exception {
        JsonNode live = normalize(
                new ObjectMapper().readTree(mvc.perform(get("/v3/api-docs")
                                .accept(MediaType.APPLICATION_JSON))
                        .andExpect(status().isOk())
                        .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8)));
        if (Boolean.parseBoolean(System.getProperty(UPDATE_FLAG, "false"))) {
            // Regeneration mode: write the normalized document, full stop.
            Files.createDirectories(SNAPSHOT.getParent());
            Files.writeString(SNAPSHOT,
                    new ObjectMapper().writerWithDefaultPrettyPrinter()
                            .writeValueAsString(live) + System.lineSeparator());
            return;
        }
        if (!Files.exists(SNAPSHOT)) {
            fail("docs/api/openapi.json is missing — generate it with: " + REGENERATE);
        }
        JsonNode committed = normalize(new ObjectMapper()
                .readTree(Files.readString(SNAPSHOT, StandardCharsets.UTF_8)));
        if (!committed.equals(live)) {
            fail("docs/api/openapi.json is stale relative to the generated document — "
                    + "regenerate with: " + REGENERATE);
        }
        // a non-empty document with the expected top-level sections
        assertThat(live.path("openapi").asText()).isNotBlank();
        assertThat(live.path("paths").size()).isGreaterThan(0);
        assertThat(live.path("components").path("schemas").size()).isGreaterThan(0);
    }

    /**
     * Deterministic normalization: every object's keys sorted recursively,
     * arrays untouched (their order is semantic), {@code servers} dropped
     * (host-free snapshot).
     */
    static JsonNode normalize(JsonNode node) {
        if (node.isObject()) {
            ObjectNode sorted = JsonNodeFactory.instance.objectNode();
            // fieldNames() is an Iterator (no Stream#sorted): collect the keys,
            // sort them, then copy - deterministic key order per .
            List<String> fields = new ArrayList<>();
            node.fieldNames().forEachRemaining(fields::add);
            Collections.sort(fields);
            for (String field : fields) {
                sorted.set(field, normalize(node.get(field)));
            }
            sorted.remove("servers");
            return sorted;
        }
        if (node.isArray()) {
            ArrayNode copy = JsonNodeFactory.instance.arrayNode();
            node.forEach(copy::add);
            return copy;
        }
        return node;
    }
}
