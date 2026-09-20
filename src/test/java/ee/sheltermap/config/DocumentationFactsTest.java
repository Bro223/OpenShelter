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
 * stale statement fails the build instead of aging into a lie. Four families are
 * covered:
 *
 * <ul>
 *   <li>the Flyway version range;</li>
 *   <li>the API surface — every controller mapping must appear in the README;</li>
 *   <li>repository paths cited in the README must exist;</li>
 *   <li>no bare test counts in the docs (a stated suite size drifts within days and
 *       ages into a lie — see {@link #theDocsNeverStateBareTestCounts()}).</li>
 * </ul>
 *
 * <p>The first three assertions are deliberately one-directional (the README may
 * describe more than the code, never less) and never assert prose — only names,
 * paths and ranges that a machine can re-derive from the tree. The count guard is
 * the one exception: it cannot re-derive anything from the tree, it FORBIDS a
 * class of claim ("the suites currently have N tests") that only rot can disprove.
 */
class DocumentationFactsTest {

    private static final Path README = Path.of("README.md");
    private static final Path FRONTEND_README = Path.of("frontend/README.md");
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

    /**
     * A bare test count — "806 backend tests", "1026 tests", "49 spec files" —
     * states how big the suites are TODAY. The suites grow every wave, so such
     * a number is stale within days and ages into a lie that reviewers quote
     * back as fact. The docs must say the suites are green and point at the
     * command that prints the current numbers, instead of printing a number.
     *
     * <p>One exemption: a DATED HISTORICAL snapshot — a count that self-dates as
     * a past measurement in its own tail (the text up to the next sentence
     * break, capped at {@value #MARKER_TAIL_LIMIT} chars). The tail must then
     * carry one of the past-snapshot markers: {@code at the time of} ("433
     * backend tests green at the time of that wave"), {@code pre-fix-wave}
     * ("321 tests green (counted 2026-09-11, pre-fix-wave)") or {@code —
     * historical} ("657 frontend tests across 35 spec files (both counted
     * 2026-09-11 — historical …)"). Dated history is honest; a present-tense
     * "current counts" claim is not.
     *
     * <p>What the rule deliberately does NOT match: numbers that are not test
     * counts — dates ("2026-09-11"), migration numbers ("V23.1"), versions
     * ("Angular 22", "postgres:16") — and the wave summary "360 backend /
     * 588 frontend" (numbers not adjacent to the word tests). What it cannot
     * see: a future edit that reuses a marker phrase to dress a current count
     * as history — that is a lie rather than a count, and the marker list is
     * the contract for how honest history must be written in these two docs.
     */
    @Test
    void theDocsNeverStateBareTestCounts() throws IOException {
        List<String> violations = new ArrayList<>();
        for (Path doc : List.of(README, FRONTEND_README)) {
            violations.addAll(bareTestCounts(Files.readString(doc), doc.toString()));
        }

        assertThat(violations)
                .as("the docs state bare test counts — the suites grow every wave, so a stated "
                        + "number drifts and ages into a lie; say the suites are green and point "
                        + "at the command that prints the current numbers (`flock "
                        + "/tmp/openshelter-mvn.lock mvn -q test`, `cd frontend && npx ng test "
                        + "--watch=false`). A dated historical snapshot is allowed when its tail "
                        + "self-dates with `at the time of`, `pre-fix-wave` or `— historical`")
                .isEmpty();
    }

    /** "N tests", "N backend tests", "N frontend tests" — a number right next to the word. */
    private static final Pattern TEST_COUNT =
            Pattern.compile("\\b\\d+\\s+(?:backend\\s+|frontend\\s+)?tests?\\b",
                    Pattern.CASE_INSENSITIVE);

    /** "N spec files" — the same claim phrased per file. */
    private static final Pattern SPEC_COUNT =
            Pattern.compile("\\b\\d+\\s+spec\\s+files?\\b", Pattern.CASE_INSENSITIVE);

    /** A count self-dates as a past measurement when its tail carries one of these. */
    private static final List<String> HISTORICAL_MARKERS =
            List.of("at the time of", "pre-fix-wave", "— historical");

    /** How far after a count a marker may sit: to the next sentence break, capped. */
    private static final int MARKER_TAIL_LIMIT = 300;

    private static final Pattern SENTENCE_BREAK = Pattern.compile("\\.\\s");

    /**
     * Every count-shaped claim in the doc that does not self-date as history.
     * Matching runs over {@link #normalizedBlocks} so a claim wrapped across
     * lines ("806 backend \n#    tests") still matches.
     */
    private static List<String> bareTestCounts(String text, String file) {
        List<String> violations = new ArrayList<>();
        for (String block : normalizedBlocks(text)) {
            for (Pattern pattern : List.of(TEST_COUNT, SPEC_COUNT)) {
                Matcher matcher = pattern.matcher(block);
                while (matcher.find()) {
                    String tail = block.substring(matcher.end());
                    Matcher breakAt = SENTENCE_BREAK.matcher(tail);
                    int end = breakAt.find()
                            ? Math.min(breakAt.start(), MARKER_TAIL_LIMIT)
                            : Math.min(tail.length(), MARKER_TAIL_LIMIT);
                    String window = tail.substring(0, end);
                    if (HISTORICAL_MARKERS.stream().noneMatch(window::contains)) {
                        violations.add(file + ": bare test count '"
                                + matcher.group().replaceAll("\\s+", " ") + "'");
                    }
                }
            }
        }
        return violations;
    }

    /**
     * The doc as matching units: maximal runs of non-blank lines (one wrapped
     * paragraph, or one comment run in a code block), a leading bash-comment
     * marker stripped from each line and the wrapped lines joined by a single
     * space — markdown wraps mid-phrase, so line-based matching would miss
     * "806 backend\n#    tests".
     */
    private static List<String> normalizedBlocks(String text) {
        List<String> blocks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String line : text.split("\\R", -1)) {
            if (line.isBlank()) {
                if (!current.isEmpty()) {
                    blocks.add(current.toString());
                    current.setLength(0);
                }
            } else {
                if (!current.isEmpty()) {
                    current.append(' ');
                }
                current.append(line.replaceFirst("^[ \\t]*#[ \\t]?", "").strip());
            }
        }
        if (!current.isEmpty()) {
            blocks.add(current.toString());
        }
        return blocks;
    }
}
