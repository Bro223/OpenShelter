package ee.sheltermap.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Guards the machine-checkable claims README.md makes about this repository, so a
 * stale statement fails the build instead of aging into a lie. Three families are
 * covered:
 *
 * <ul>
 *   <li>the Flyway version range;</li>
 *   <li>the API surface — every controller mapping must appear in the README;</li>
 *   <li>repository paths cited in the README must exist.</li>
 * </ul>
 *
 * <p>The assertions are deliberately one-directional (the README may describe more
 * than the code, never less) and never assert prose — only names, paths and ranges
 * that a machine can re-derive from the tree.
 */
class DocumentationFactsTest {

    private static final Path README = Path.of("README.md");
    private static final Path MIGRATIONS = Path.of("src/main/resources/db/migration");
    private static final Path CONTROLLERS = Path.of("src/main/java/ee/sheltermap/api");

    /** `V1`–`V24` (as the README writes it) or a plain `V1-V24`. */
    private static final Pattern README_RANGE =
            Pattern.compile("V1`[–-]`V(\\d+)");

    private static final Pattern SQL_MIGRATION = Pattern.compile("^V(\\d+)__.*\\.sql$");

    private static final Pattern CLASS_MAPPING = Pattern.compile("@RequestMapping\\(\"([^\"]*)\"\\)");

    private static final Pattern METHOD_MAPPING =
            Pattern.compile("@(Get|Post|Put|Delete|Patch)Mapping(?:\\(\"([^\"]*)\")?");

    /**
     * Backticked repository paths, e.g. {@code `src/main/java/.../ShelterController.java`}.
     * Paths that only exist at runtime or after a build are filtered out below.
     */
    private static final Pattern CITED_PATH =
            Pattern.compile("`((?:src|docs|frontend|qa|openspec|context-and-tasks|"
                    + "\\.agent-orchestration|scripts)/[A-Za-z0-9_./{}*-]+)`");

    /** Written by the app at runtime, or produced by a build — not checked in. */
    private static final Set<String> RUNTIME_PREFIXES = Set.of("data/", "dist/", "target/");

    @Test
    void theReadmeFlywayRangeMatchesTheMigrationFiles() throws IOException {
        long highest;
        try (Stream<Path> files = Files.list(MIGRATIONS)) {
            highest = files.map(path -> SQL_MIGRATION.matcher(path.getFileName().toString()))
                    .filter(Matcher::matches)
                    .mapToLong(matcher -> Long.parseLong(matcher.group(1)))
                    .max()
                    .orElseThrow(() -> new AssertionError("no SQL migrations under " + MIGRATIONS));
        }

        String readme = Files.readString(README);
        Matcher ranges = README_RANGE.matcher(readme);
        List<String> found = new ArrayList<>();
        while (ranges.find()) {
            found.add(ranges.group(1));
        }

        assertThat(found)
                .as("README.md claims a Flyway range; the tree has V1-V" + highest)
                .isNotEmpty();
        assertThat(found)
                .as("every Flyway range in README.md must end at the highest migration (V%s)", highest)
                .allMatch(version -> version.equals(Long.toString(highest)));
    }

    @Test
    void everyControllerMappingAppearsInTheReadme() throws IOException {
        String readme = Files.readString(README);
        List<String> missing = new ArrayList<>();

        try (Stream<Path> files = Files.list(CONTROLLERS)) {
            for (Path file : files.filter(path -> path.toString().endsWith(".java")).toList()) {
                String source = Files.readString(file);
                Matcher classMapping = CLASS_MAPPING.matcher(source);
                String prefix = classMapping.find() ? classMapping.group(1) : null;

                Matcher methods = METHOD_MAPPING.matcher(source);
                while (methods.find()) {
                    String sub = methods.group(2);
                    String path = prefix == null ? sub
                            : prefix + (sub == null ? "" : sub);
                    if (path == null || path.isBlank()) {
                        continue;
                    }
                    if (!readme.contains(path)) {
                        missing.add(file.getFileName() + " -> " + path);
                    }
                }
            }
        }

        assertThat(missing)
                .as("these controller mappings are absent from the README API table "
                        + "(add a row, or the table no longer summarizes the API)")
                .isEmpty();
    }

    @Test
    void everyRepositoryPathCitedInTheReadmeExists() throws IOException {
        List<String> missing = new ArrayList<>();
        Matcher cited = CITED_PATH.matcher(Files.readString(README));
        while (cited.find()) {
            String path = cited.group(1);
            if (RUNTIME_PREFIXES.stream().anyMatch(path::startsWith)) {
                continue;
            }
            if (!Files.exists(Path.of(path))) {
                missing.add(path);
            }
        }

        assertThat(missing)
                .as("README.md cites repository paths that do not exist")
                .isEmpty();
    }
}
