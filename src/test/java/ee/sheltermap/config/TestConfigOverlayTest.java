package ee.sheltermap.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.StringReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * The test-profile configuration contract (reviews/01-architecture F2,
 * reviews/11-integration-devops F5 — the old test-classpath
 * application.yml had drifted from main before anything noticed).
 *
 * <p>Model under guard: {@code src/test/resources/application-test.yml}
 * is an OVERLAY, not a mirror. It loads only for the "test" profile
 * (activated by {@code AbstractPersistenceIT}, the one and only
 * {@code @SpringBootTest} base) on top of
 * {@code src/main/resources/application.yml}, so every {@code app.*}
 * default in main reaches every test context by construction. This test
 * fails the build when that model is broken:
 *
 * <ul>
 *   <li>a same-named {@code application.yml} reappears on the test
 *       classpath (it would SHADOW the main file and put the suite back
 *       on a manually synced copy);</li>
 *   <li>the overlay carries a key the main file does not have (the test
 *       config inventing defaults);</li>
 *   <li>the overlay carries a key with main's exact value (a copy, not a
 *       delta — dead weight that invites the next drift);</li>
 *   <li>the overlay carries a delta that is not in {@link #DOCUMENTED_DELTAS},
 *       or a documented delta whose value has moved;</li>
 *   <li>a DOCUMENTED_DELTAS entry no longer has a delta behind it (stale
 *       allow-list — the list and the file must change together).</li>
 * </ul>
 *
 * <p>Plain JUnit (no Spring context — the guard must not need the
 * application it guards), file paths relative to the basedir, the same
 * idiom as {@link DocumentationFactsTest}.
 */
class TestConfigOverlayTest {

    private static final Path MAIN_YML = Path.of("src/main/resources/application.yml");
    private static final Path OVERLAY_YML = Path.of("src/test/resources/application-test.yml");
    /** A same-named file on the test classpath SHADOWS the main one. */
    private static final Path SHADOW_YML = Path.of("src/test/resources/application.yml");

    /**
     * The only deltas the overlay may carry — key → exact value (as text)
     * — each with its reason (mirrored in the overlay file's header).
     * Adding an entry here is a review decision, not a drive-by.
     *
     * <ul>
     *   <li>{@code app.admin.email} / {@code app.admin.password} (empty):
     *       spring-dotenv loads the developer's .env into the test
     *       environment and this repository's .env carries both keys —
     *       a plain test context must never seed an admin (main says
     *       {@code ${ADMIN_EMAIL:}} / {@code ${ADMIN_PASSWORD:}}).</li>
     *   <li>{@code app.limits.otp-per-contact-max} (100, main: 5): the IT
     *       harnesses reuse fixed e-mails across many tests in one shared
     *       context and the in-memory rolling window would 429 them at
     *       the production cap; cap-under-test ITs pin the production
     *       value themselves (OtpContactCapIT, AdminAlertsIT).</li>
     * </ul>
     */
    private static final Map<String, String> DOCUMENTED_DELTAS = Map.of(
            "app.admin.email", "",
            "app.admin.password", "",
            "app.limits.otp-per-contact-max", "100");

    @Test
    void theOverlayOnlyCarriesDocumentedDeltas() throws IOException {
        assertThat(SHADOW_YML).as(
                "a same-named application.yml on the test classpath would SHADOW the main one — the overlay model allows only application-test.yml")
                .doesNotExist();
        assertThat(MAIN_YML).as("the main configuration the overlay layers onto").exists();
        assertThat(OVERLAY_YML).as("the test-profile overlay the guard checks").exists();

        Map<String, String> main = flatten(MAIN_YML);
        Map<String, String> overlay = flatten(OVERLAY_YML);

        List<String> problems = new ArrayList<>();
        for (Map.Entry<String, String> entry : overlay.entrySet()) {
            String key = entry.getKey();
            String overlayValue = entry.getValue();
            String mainValue = main.get(key);
            if (mainValue == null) {
                problems.add(key + " = " + overlayValue
                        + " — the overlay invents a key the main file does not have");
            } else if (mainValue.equals(overlayValue)) {
                problems.add(key + " = " + overlayValue
                        + " — equal to main's value; a copy, not a delta — it belongs in main, not here");
            } else {
                String documented = DOCUMENTED_DELTAS.get(key);
                if (documented == null) {
                    problems.add(key + " = " + overlayValue + " (main: " + mainValue
                            + ") — an UNDOCUMENTED delta; either add it to DOCUMENTED_DELTAS with a reason, "
                            + "or pin the value per-test with @TestPropertySource");
                } else if (!documented.equals(overlayValue)) {
                    problems.add(key + " = " + overlayValue
                            + " — the documented delta drifted; DOCUMENTED_DELTAS says " + documented);
                }
            }
        }
        for (String key : DOCUMENTED_DELTAS.keySet()) {
            if (!overlay.containsKey(key)) {
                problems.add(key + " — listed in DOCUMENTED_DELTAS but absent from the overlay; "
                        + "the delta is gone — update the allow-list and the overlay together");
            }
        }
        assertThat(problems).as(
                "the test-profile overlay drifted from the documented contract:\n  "
                        + String.join("\n  ", problems)).isEmpty();
    }

    /** Dotted key → scalar text, in a sorted map for stable failures. */
    private static Map<String, String> flatten(Path yml) throws IOException {
        Object root = new Yaml().load(new StringReader(Files.readString(yml)));
        Map<String, String> out = new TreeMap<>();
        flattenInto(out, "", root);
        return out;
    }

    private static void flattenInto(Map<String, String> out, String prefix, Object node) {
        if (node instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = prefix.isEmpty()
                        ? String.valueOf(entry.getKey())
                        : prefix + "." + entry.getKey();
                flattenInto(out, key, entry.getValue());
            }
            return;
        }
        if (node instanceof List<?> list) {
            // No list-valued key exists in these two files today; the join
            // keeps the comparison total if one ever does.
            out.put(prefix, String.join(",", list.stream().map(String::valueOf).toList()));
            return;
        }
        out.put(prefix, node == null ? "" : String.valueOf(node));
    }
}
