package ee.sheltermap.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Guards the machine-checkable claims README.md makes about this repository, so a
 * stale statement fails the build instead of aging into a lie. Four families are
 * covered:
 *
 * <ul>
 *   <li>the Flyway version range;</li>
 *   <li>the API surface — every controller mapping must appear in the README,
 *       and the class-level mapping pattern must actually MATCH every
 *       {@code @RequestMapping} it claims to read (matched-count floor —
 *       a silently-broken pattern must not degrade the guard to checking
 *       zero mappings);</li>
 *   <li>repository paths cited in the README must exist;</li>
 *   <li>no bare test counts in the docs (a stated suite size drifts within days and
 *       ages into a lie — see {@link #theDocsNeverStateBareTestCounts()}).</li>
 * </ul>
 *
 * <p>Wave 11 extension — the claim classes a complete documentation review found
 * false while this guard was green (see {@code reviews/16-*.md} F1–F12 and
 * {@code reviews/17-*.md}): package-layout class names ({@link #everyClassInTheLayoutTableExistsInItsPackage()})
 * and the class-level mapping denominator, documented DTO field lists
 * ({@link #everyReadmeApiRowResolvesAndItsDocumentedFieldsExist()},
 * {@link #theAdminSheltersRowFieldListMatchesTheDto()},
 * {@link #theTsMirrorsAreFieldForFieldWithTheOpenApiDocument()}),
 * {@code .env.example} completeness against the variables the app actually reads
 * ({@link #theEnvExampleAndConfigTableCoverEveryVariableTheAppReads()}),
 * and the agent-pack's cheap facts — dev proxy file name, Spring Boot version,
 * palette tokens and hexes, the route table, the admin tab count, the bundle
 * budget, the trust thresholds and the quoted server messages. Every new pin
 * carries a matched-count floor: a silently-broken pattern must fail the guard,
 * never degrade it to checking nothing. The OpenAPI snapshot is the machine-readable
 * contract these checks lean on — {@code OpenApiSnapshotIT} keeps it byte-true
 * against the live document, so a green check here means the doc, the snapshot
 * and the code agree.
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

    private static final Pattern CLASS_MAPPING =
            Pattern.compile("@RequestMapping\\((?:value\\s*=\\s*)?\"([^\"]*)\"");

    /** Every {@code @RequestMapping} annotation usage in a controller file —
     *  the denominator the {@link #CLASS_MAPPING} floor is measured against.
     *  The import line carries no {@code @}, so it does not count. */
    private static final Pattern MAPPING_ANNOTATION =
            Pattern.compile("@RequestMapping\\b");

    /** One class-level mapping per controller at the time the floor was set
     *  (2026-09-22, branch feature/frontend). The per-file equality
     *  assertion in {@link #everyControllerMappingAppearsInTheReadme()} is
     *  the real defence; this floor additionally guarantees the guard can
     *  never silently check zero mappings if the pattern form changes. */
    private static final int MIN_CLASS_MAPPINGS = 12;

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

    // ------------------------------------------------------------------
    // Wave 11 pin locations (repo-relative — surefire runs from the basedir).
    // ------------------------------------------------------------------

    private static final Path OPENAPI = Path.of("docs", "api", "openapi.json");
    private static final Path APPLICATION_YML = Path.of("src", "main", "resources", "application.yml");
    private static final Path ENV_EXAMPLE = Path.of(".env.example");
    private static final Path POM = Path.of("pom.xml");
    private static final Path MAIN_JAVA = Path.of("src", "main", "java");
    private static final Path API_PKG = MAIN_JAVA.resolve("ee/sheltermap/api");
    private static final Path SHELTER_REPORT_JAVA =
            MAIN_JAVA.resolve("ee/sheltermap/domain/ShelterReport.java");
    private static final Path SHELTER_SERVICE_JAVA =
            MAIN_JAVA.resolve("ee/sheltermap/app/ShelterService.java");
    private static final Path DUPLICATE_REPORT_JAVA =
            MAIN_JAVA.resolve("ee/sheltermap/app/DuplicateReportException.java");
    private static final Path PACKAGE_JSON = Path.of("frontend", "package.json");
    private static final Path ANGULAR_JSON = Path.of("frontend", "angular.json");
    private static final Path STYLES = Path.of("frontend", "src", "styles.scss");
    private static final Path THEME_TOKENS = Path.of("frontend", "src", "app", "core", "theme-tokens.ts");
    private static final Path ROUTES = Path.of("frontend", "src", "app", "app.routes.ts");
    private static final Path ADMIN_PAGE_HTML =
            Path.of("frontend", "src", "app", "features", "admin", "admin-page.html");
    private static final Path MODELS_TS = Path.of("frontend", "src", "app", "core", "models.ts");
    private static final Path SHELTER_DETAIL_TS = Path.of("frontend", "src", "app", "features",
            "shelter", "shelter-detail-page.ts");
    private static final Path AGENT_DIR = Path.of("frontend", "docs", "agent");
    private static final Path AGENT_01 = AGENT_DIR.resolve("01-TASK.md");
    private static final Path AGENT_02 = AGENT_DIR.resolve("02-CONTEXT-API.md");
    private static final Path AGENT_05 = AGENT_DIR.resolve("05-CONTEXT-MAP.md");
    private static final Path AGENT_06 = AGENT_DIR.resolve("06-CONTEXT-SHELTER.md");

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static JsonNode OPENAPI_NODE;

    // Wave 11 matched-count floors. Each one is the exact count the guard
    // measures on the current tree: if a pattern stops matching (a doc
    // reformat, a rename, a removed table), the floor goes red instead of
    // the pin silently checking nothing.
    // ------------------------------------------------------------------

    /** Distinct class names the README layout table names, per package. */
    private static final int MIN_LAYOUT_CLASSES = 74;
    /** README API-table rows that resolve to a real OpenAPI operation. */
    private static final int MIN_API_ROWS_RESOLVED = 63;
    /** README API-table rows resolved to an operation with a JSON body. */
    private static final int MIN_API_ROWS_WITH_BODY = 36;
    /** Documented response fields checked against the OpenAPI schemas. */
    private static final int MIN_API_FIELDS_CHECKED = 19;
    /** Excluded README rows that are still anchored to real code. */
    private static final int MIN_EXCLUDED_ROWS_ANCHORED = 4;
    /** Endpoint paths in 02-CONTEXT-API.md resolving in the OpenAPI doc. */
    private static final int MIN_AGENT_ENDPOINTS_RESOLVED = 47;
    /** TS mirror interfaces compared field-for-field with the schemas. */
    private static final int MIN_MIRROR_INTERFACES = 31;
    /** Fields compared in the mirror check (both directions). */
    private static final int MIN_MIRROR_FIELDS = 152;
    /** Env vars the app reads (yml bindings + @Value), all documented. */
    private static final int MIN_READ_VARS = 55;
    /** Env vars named in .env.example (commented or not). */
    private static final int MIN_TEMPLATE_VARS = 25;
    /** Env vars documented in the README configuration table. */
    private static final int MIN_TABLE_VARS = 54;
    /** Empty-default vars (nothing to fall back to) that the template must carry. */
    private static final int MIN_REQUIRED_VARS_IN_TEMPLATE = 13;
    /** proxy.conf mentions in the frontend docs checked against package.json. */
    private static final int MIN_PROXY_MENTIONS = 2;
    /** Spring Boot major.minor claims checked against pom.xml. */
    private static final int MIN_BOOT_CLAIMS = 1;
    /** --color-* tokens in the frontend docs checked against the token files. */
    private static final int MIN_PALLETTE_TOKENS = 12;
    /** Documented hex values checked against the token files. */
    private static final int MIN_PALLETTE_HEXES = 4;
    /** "N tabs" claims in 01-TASK.md checked against admin-page.html. */
    private static final int MIN_TAB_CLAIMS = 1;
    /** Route-count claims checked against app.routes.ts. */
    private static final int MIN_ROUTE_CLAIMS = 2;
    /** Per-component SCSS figures in the bundle-budget paragraph. */
    private static final int MIN_SCSS_FIGURES = 15;
    /** "reaching N points" claims checked against AUTO_HIDE_THRESHOLD. */
    private static final int MIN_HIDE_THRESHOLD_CLAIMS = 2;
    /** "N distinct confirmations" claims checked against AUTO_CONFIRM_THRESHOLD. */
    private static final int MIN_CONFIRM_THRESHOLD_CLAIMS = 1;
    /** Shelter-cap cap-message quotes checked against the constant. */
    private static final int MIN_CAP_MESSAGE_QUOTES = 2;


    /** Word forms the docs use where the code uses a number. */
    private static final Map<String, Integer> WORD_NUMBERS = Map.ofEntries(
            Map.entry("one", 1), Map.entry("two", 2), Map.entry("three", 3),
            Map.entry("four", 4), Map.entry("five", 5), Map.entry("six", 6),
            Map.entry("seven", 7), Map.entry("eight", 8), Map.entry("nine", 9),
            Map.entry("ten", 10), Map.entry("eleven", 11), Map.entry("twelve", 12));

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
        List<String> unmatched = new ArrayList<>();
        int classMappingsMatched = 0;

        try (Stream<Path> files = Files.list(CONTROLLERS)) {
            for (Path file : files.filter(path -> path.toString().endsWith(".java")).toList()) {
                String source = Files.readString(file);

                Matcher annotations = MAPPING_ANNOTATION.matcher(source);
                int annotationsFound = 0;
                while (annotations.find()) {
                    annotationsFound++;
                }

                Matcher classMapping = CLASS_MAPPING.matcher(source);
                int classMappingsInFile = 0;
                String prefix = null;
                while (classMapping.find()) {
                    classMappingsInFile++;
                    if (prefix == null) {
                        prefix = classMapping.group(1);
                    }
                }
                classMappingsMatched += classMappingsInFile;
                if (classMappingsInFile != annotationsFound) {
                    unmatched.add(file.getFileName() + ": " + annotationsFound
                            + " @RequestMapping annotation(s), but the CLASS_MAPPING "
                            + "pattern matched " + classMappingsInFile + " — the guard "
                            + "would read a wrong or missing path prefix");
                }

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
        assertThat(unmatched)
                .as("a controller uses an @RequestMapping form the CLASS_MAPPING "
                        + "pattern cannot parse — the guard would check with a wrong "
                        + "or missing prefix; fix the pattern or the annotation form")
                .isEmpty();
        assertThat(classMappingsMatched)
                .as("CLASS_MAPPING matched only %d class-level mapping(s), but %d are "
                        + "expected (one per controller at the floor's date) — a zero or "
                        + "near-zero match means the pattern broke and the guard is "
                        + "checking nothing", classMappingsMatched, MIN_CLASS_MAPPINGS)
                .isGreaterThanOrEqualTo(MIN_CLASS_MAPPINGS);
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

    // ==================================================================
    // Wave 11 — pins for the claim classes the documentation reviews
    // (reviews/16-*.md, reviews/17-*.md) found false while this guard was
    // green. Every pin carries a matched-count floor: a doc reformat that
    // silently breaks a pattern must go red, not shrink the check to zero.
    // ==================================================================

    /** OpenAPI schema name the doc uses for a record serialized under a
     *  different schema name (or the pre-rename alias). The doc names TS
     *  interfaces; the OpenAPI document names the serialized schema. */
    private static final Map<String, String> MIRROR_ALIASES = Map.ofEntries(
            Map.entry("LocationResolved", "LocationResolvedDto"),
            Map.entry("ReviewShelterRequest", "AdminShelterReviewRequest"),
            Map.entry("ReportShelterRequest", "ShelterReportRequest"),
            Map.entry("ReportOccupancyRequest", "OccupancyReportRequest"),
            Map.entry("PutOpenStatusRequest", "OpenStatusReportRequest"),
            Map.entry("OpenStatusDto", "OpenStatus"),
            Map.entry("ShelterOccupancy", "Occupancy"),
            Map.entry("AdminOccupancy", "Occupancy"),
            Map.entry("ApiError", "ErrorResponse"),
            Map.entry("InfoRequestDto", "InfoRequest"),
            Map.entry("AdminInfoRequestDto", "InfoRequest"));

    /** Empty-default env vars the template may omit: the README table
     *  documents their code-level fallback and they degrade gracefully
     *  (the registry is an opt-in importer). */
    private static final Set<String> TEMPLATE_OPTIONAL_VARS =
            Set.of("REGISTRY_BASE_URL", "REGISTRY_OFFICIAL_URL");

    // ---------------------- 1. package layout table ----------------------

    @Test
    void everyClassInTheLayoutTableExistsInItsPackage() throws IOException {
        String section = section(Files.readString(README), "Package layout");
        List<String> missing = new ArrayList<>();
        int checked = 0;
        for (Matcher row = Pattern.compile(
                "^\\|\\s*`([a-z][a-z0-9]*)`\\s*\\|([^\\n]+)\\|\\s*$", Pattern.MULTILINE)
                .matcher(section); row.find(); ) {
            checked += classNames(row.group(2), row.group(1), missing);
        }
        Matcher note = Pattern.compile(
                "The `([a-z]+)` package additionally carries[\\s\\S]*?(?=\\n\\n)").matcher(section);
        if (note.find()) {
            checked += classNames(note.group(), note.group(1), missing);
        }
        assertThat(missing)
                .as("the README package-layout table names a class that does not exist in "
                        + "the package it names (a dead class name is a lie the code never told)")
                .isEmpty();
        assertThat(checked)
                .as("the layout table yielded only %d class names; at least %d expected — "
                        + "far fewer means the table shape changed and this pin checks "
                        + "nothing", checked, MIN_LAYOUT_CLASSES)
                .isGreaterThanOrEqualTo(MIN_LAYOUT_CLASSES);
    }

    /** Backticked PascalCase names in a table cell — each must exist as
     *  {@code pkg/Name.java} under the sheltermap package. */
    private static int classNames(String cell, String pkg, List<String> missing) {
        int n = 0;
        for (Matcher c = Pattern.compile("`([A-Z][A-Za-z0-9]{2,})`").matcher(cell); c.find(); ) {
            n++;
            Path file = Path.of("src", "main", "java", "ee", "sheltermap", pkg,
                    c.group(1) + ".java");
            if (!Files.exists(file)) {
                missing.add(c.group(1) + " in package `" + pkg + "` — " + file + " is absent");
            }
        }
        return n;
    }

    // ------------------- 2. README API rows + fields -------------------

    @Test
    void everyReadmeApiRowResolvesAndItsDocumentedFieldsExist() throws IOException {
        String section = section(Files.readString(README), "API");
        JsonNode paths = openApi().path("paths");
        List<String> missingOps = new ArrayList<>();
        List<String> badFields = new ArrayList<>();
        int resolved = 0;
        int withBody = 0;
        int fieldsChecked = 0;
        int anchored = 0;
        for (Matcher row = Pattern.compile(
                "^\\|\\s*(GET|POST|PUT|DELETE|HEAD)\\s*\\|\\s*`([^`]+)`\\s*\\|\\s*[^|]*\\|\\s*(.*?)\\|\\s*$",
                Pattern.MULTILINE).matcher(section); row.find(); ) {
            String method = row.group(1);
            String path = row.group(2).split("\\?")[0].trim();
            String key = method + " " + path;
            JsonNode op = paths.path(path).path(method.toLowerCase());
            if (op.isMissingNode()) {
                // Rows the OpenAPI document does not carry: the @Hidden /dev
                // diagnostics controllers, the actuator health probe and the
                // media HEAD probe served by the GET handler. They are real
                // endpoints, so each must still be anchored to code — a
                // phantom row would be a lie.
                if (path.startsWith("/dev/") && apiSourceMentions(path)) {
                    anchored++;
                } else if (path.equals("/actuator/health")
                        || (method.equals("HEAD") && paths.path(path).has("get"))) {
                    anchored++;
                } else {
                    missingOps.add(key + " is not an operation in docs/api/openapi.json");
                }
                continue;
            }
            resolved++;
            Set<String> response = responseProperties(op);
            if (response.isEmpty()) {
                continue;
            }
            withBody++;
            Set<String> notResponseFields = new HashSet<>(parameterNames(op));
            notResponseFields.addAll(requestBodyProperties(op));
            for (Matcher t = Pattern.compile("`([a-z][A-Za-z0-9]*)`").matcher(row.group(3));
                    t.find(); ) {
                String field = t.group(1);
                // A backticked identifier followed by "param" documents a
                // request parameter (e.g. the ignored minRating), not a
                // response field.
                if (Pattern.compile("^\\s+param(eter)?\\b", Pattern.CASE_INSENSITIVE)
                        .matcher(row.group(3).substring(t.end())).find()) {
                    continue;
                }
                if (notResponseFields.contains(field)) {
                    continue;
                }
                if (response.contains(field)) {
                    fieldsChecked++;
                } else {
                    badFields.add(key + " documents field `" + field
                            + "` that its response schema does not carry");
                }
            }
        }
        assertThat(missingOps)
                .as("README API-table rows that are not real operations (the OpenAPI "
                        + "document is the contract)")
                .isEmpty();
        assertThat(badFields)
                .as("README API rows documenting fields the response does not carry "
                        + "(the openStatus-on-AdminShelterDto class of lie)")
                .isEmpty();
        assertThat(resolved)
                .as("only %d README API rows resolved; at least %d expected — fewer means "
                        + "the row pattern broke and this pin checks nothing",
                        resolved, MIN_API_ROWS_RESOLVED)
                .isGreaterThanOrEqualTo(MIN_API_ROWS_RESOLVED);
        assertThat(withBody)
                .as("only %d resolved rows had a JSON body to check; at least %d "
                        + "expected", withBody, MIN_API_ROWS_WITH_BODY)
                .isGreaterThanOrEqualTo(MIN_API_ROWS_WITH_BODY);
        assertThat(fieldsChecked)
                .as("only %d documented fields were checked against the schemas; at "
                        + "least %d expected", fieldsChecked, MIN_API_FIELDS_CHECKED)
                .isGreaterThanOrEqualTo(MIN_API_FIELDS_CHECKED);
        assertThat(anchored)
                .as("only %d excluded rows were anchored to code; at least %d expected",
                        anchored, MIN_EXCLUDED_ROWS_ANCHORED)
                .isGreaterThanOrEqualTo(MIN_EXCLUDED_ROWS_ANCHORED);
    }

    private static boolean apiSourceMentions(String path) throws IOException {
        try (Stream<Path> files = Files.walk(API_PKG)) {
            return files.filter(p -> p.toString().endsWith(".java")).anyMatch(p -> {
                try {
                    return Files.readString(p).contains("\"" + path + "\"");
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
            });
        }
    }

    /** Properties (resolved $refs, array items, allOf merged) of the first
     *  200/201/202 response carrying a JSON body; empty when the operation
     *  has no JSON body. */
    private static Set<String> responseProperties(JsonNode op) {
        JsonNode responses = op.path("responses");
        for (String code : List.of("200", "201", "202")) {
            JsonNode schema = responses.path(code).path("content")
                    .path("application/json").path("schema");
            if (!schema.isMissingNode()) {
                return propertiesOf(schema);
            }
        }
        return Set.of();
    }

    private static Set<String> parameterNames(JsonNode op) {
        Set<String> names = new TreeSet<>();
        for (JsonNode p : op.path("parameters")) {
            JsonNode param = resolve(p);
            if (param.path("name").isTextual()) {
                names.add(param.path("name").asText());
            }
        }
        return names;
    }

    private static Set<String> requestBodyProperties(JsonNode op) {
        JsonNode content = op.path("requestBody").path("content");
        Set<String> props = new TreeSet<>();
        for (Iterator<String> types = content.fieldNames(); types.hasNext(); ) {
            props.addAll(propertiesOf(content.get(types.next()).path("schema")));
        }
        return props;
    }

    /** Dereferences a {@code #/...} $ref against the OpenAPI document. */
    private static JsonNode resolve(JsonNode node) {
        JsonNode ref = node.path("$ref");
        if (ref.isTextual()) {
            JsonNode cur = openApi();
            for (String part : ref.asText().split("/")) {
                if (part.isEmpty() || part.equals("#")) {
                    continue;
                }
                cur = cur.path(part.replace("~1", "/").replace("~", ""));
            }
            return cur;
        }
        return node;
    }

    private static Set<String> propertiesOf(JsonNode schema) {
        schema = resolve(schema);
        if (schema.has("allOf")) {
            Set<String> all = new TreeSet<>();
            for (JsonNode sub : schema.path("allOf")) {
                all.addAll(propertiesOf(sub));
            }
            return all;
        }
        if ("array".equals(schema.path("type").asText(""))) {
            return propertiesOf(schema.path("items"));
        }
        Set<String> props = new TreeSet<>();
        for (Iterator<String> names = schema.path("properties").fieldNames();
                names.hasNext(); ) {
            props.add(names.next());
        }
        return props;
    }

    // ------------------ 3. agent-pack endpoint paths ------------------

    @Test
    void everyAgentPackEndpointPathResolvesInOpenApi() throws IOException {
        JsonNode paths = openApi().path("paths");
        List<String> missing = new ArrayList<>();
        int resolved = 0;
        for (Matcher ref = Pattern.compile(
                "`((?:GET|POST|PUT|DELETE|HEAD) (?!https?://)\\S+)`")
                .matcher(Files.readString(AGENT_02)); ref.find(); ) {
            String[] parts = ref.group(1).split(" ", 2);
            String path = parts[1].split("\\?")[0];
            if (paths.path(path).path(parts[0].toLowerCase()).isMissingNode()) {
                missing.add(ref.group(1));
            } else {
                resolved++;
            }
        }
        assertThat(missing)
                .as("02-CONTEXT-API.md names endpoint paths that are not operations in "
                        + "docs/api/openapi.json (a phantom endpoint)")
                .isEmpty();
        assertThat(resolved)
                .as("only %d agent-pack endpoint paths resolved; at least %d expected — "
                        + "fewer means the table shape changed and this pin checks "
                        + "nothing", resolved, MIN_AGENT_ENDPOINTS_RESOLVED)
                .isGreaterThanOrEqualTo(MIN_AGENT_ENDPOINTS_RESOLVED);
    }

    // ---------------- 4. admin row list vs AdminShelterDto ----------------

    @Test
    void theAdminSheltersRowFieldListMatchesTheDto() throws IOException {
        String row = null;
        for (String line : Files.readString(AGENT_02).split("\n")) {
            if (line.startsWith("| `GET /admin/shelters`")) {
                row = line;
                break;
            }
        }
        assertThat(row)
                .as("the 02-CONTEXT-API admin table must still carry the GET /admin/shelters row")
                .isNotNull();
        Matcher list = Pattern.compile(
                "`([a-z][a-zA-Z0-9]*(?:,\\s*[a-z][a-zA-Z0-9]*)+)`").matcher(row);
        assertThat(list.find())
                .as("the GET /admin/shelters row must still carry its backticked comma-"
                        + "separated field list")
                .isTrue();
        Set<String> documented = new TreeSet<>();
        for (String part : list.group(1).split(",")) {
            documented.add(part.trim());
        }
        Set<String> actual = schemaPropertyNames("AdminShelterDto");
        assertThat(documented)
                .as("the GET /admin/shelters row's field list must be exactly the "
                        + "AdminShelterDto fields (both directions)")
                .containsAll(actual)
                .hasSameElementsAs(actual);
        assertThat(documented.size())
                .as("the row's field list has %d entries; at least 15 expected",
                        documented.size())
                .isGreaterThanOrEqualTo(15);
    }

    // -------------------- 5. TS mirrors, field-for-field --------------------

    @Test
    void theTsMirrorsAreFieldForFieldWithTheOpenApiDocument() throws IOException {
        Map<String, TsIface> ifaces = parseTsInterfaces(tsBlocks(Files.readString(AGENT_02)));
        List<String> problems = new ArrayList<>();
        int interfaces = 0;
        int fields = 0;
        for (Map.Entry<String, TsIface> e : new TreeMap<>(ifaces).entrySet()) {
            String name = e.getKey();
            TsIface iface = e.getValue();
            if (name.equals("AdminShelterFilters") || name.equals("AdminShelterReportFilters")) {
                continue; // frontend-only request models, never serialized
            }
            interfaces++;
            Set<String> doc = new TreeSet<>(iface.props);
            if (name.equals("ShelterDetailDto")) {
                // The OpenAPI document flattens the detail read into the
                // ShelterDto schema: the contract is the doc's base + detail
                // union.
                doc = union(ifaces, name);
            } else if (name.equals("MineShelterDto")) {
                Set<String> additions = new TreeSet<>(doc);
                Set<String> expected = Set.of("reviewNote", "infoRequest");
                if (!additions.equals(expected)) {
                    problems.add(name + " documents additions " + additions
                            + "; the /mine contract adds exactly " + expected);
                }
                Set<String> missing = new TreeSet<>(schemaPropertyNames("ShelterDto"));
                missing.removeAll(union(ifaces, name));
                missing.removeAll(Set.of("communityPulse", "yourOccupancyBand", "yourOpenStatus"));
                if (!missing.isEmpty()) {
                    problems.add(name + " (+ its base) does not document: " + missing);
                }
            } else if (name.equals("ShelterDto")) {
                // The OpenAPI document flattens the detail-only fields
                // (communityPulse, your*) into the ShelterDto schema; the doc
                // documents them under ShelterDetailDto, so the base interface
                // must equal the schema minus those.
                Set<String> ref = new TreeSet<>(schemaPropertyNames("ShelterDto"));
                ref.removeAll(Set.of("communityPulse", "yourOccupancyBand", "yourOpenStatus"));
                Set<String> inDocNotDto = new TreeSet<>(doc);
                inDocNotDto.removeAll(ref);
                Set<String> inDtoNotDoc = new TreeSet<>(ref);
                inDtoNotDoc.removeAll(doc);
                if (!inDocNotDto.isEmpty() || !inDtoNotDoc.isEmpty()) {
                    problems.add(name + " — documented but absent: " + inDocNotDto
                            + "; on the DTO but undocumented: " + inDtoNotDoc);
                }
            } else {
                String schema = MIRROR_ALIASES.getOrDefault(name, name);
                if (!openApi().path("components").path("schemas").has(schema)) {
                    problems.add(name + " has no OpenAPI schema `" + schema + "` to mirror");
                    continue;
                }
                Set<String> ref = schemaPropertyNames(schema);
                Set<String> inDocNotDto = new TreeSet<>(doc);
                inDocNotDto.removeAll(ref);
                Set<String> inDtoNotDoc = new TreeSet<>(ref);
                inDtoNotDoc.removeAll(doc);
                if (!inDocNotDto.isEmpty() || !inDtoNotDoc.isEmpty()) {
                    problems.add(name + " — documented but absent: " + inDocNotDto
                            + "; on the DTO but undocumented: " + inDtoNotDoc);
                }
            }
            fields += doc.size();
        }
        assertThat(problems)
                .as("the 02-CONTEXT-API TS mirrors must be field-for-field with the OpenAPI "
                        + "schemas (the doc's own claim)")
                .isEmpty();
        assertThat(interfaces)
                .as("only %d TS mirror interfaces were compared; at least %d expected",
                        interfaces, MIN_MIRROR_INTERFACES)
                .isGreaterThanOrEqualTo(MIN_MIRROR_INTERFACES);
        assertThat(fields)
                .as("only %d mirror fields were compared; at least %d expected",
                        fields, MIN_MIRROR_FIELDS)
                .isGreaterThanOrEqualTo(MIN_MIRROR_FIELDS);
    }

    private static Set<String> union(Map<String, TsIface> ifaces, String name) {
        TsIface iface = ifaces.get(name);
        Set<String> all = new TreeSet<>(iface.props);
        if (iface.extends_() != null && ifaces.containsKey(iface.extends_())) {
            all.addAll(ifaces.get(iface.extends_()).props);
        }
        return all;
    }

    private static String tsBlocks(String text) {
        StringBuilder sb = new StringBuilder();
        for (Matcher m = Pattern.compile("```ts\\R([\\s\\S]*?)```").matcher(text);
                m.find(); ) {
            sb.append(m.group(1)).append('\n');
        }
        return sb.toString();
    }

    private record TsIface(String extends_, Set<String> props) {
    }

    private static Map<String, TsIface> parseTsInterfaces(String ts) {
        ts = ts.replaceAll("/\\*[\\s\\S]*?\\*/", "").replaceAll("(?m)//[^\\n]*", "");
        Map<String, TsIface> out = new LinkedHashMap<>();
        Matcher m = Pattern.compile("interface (\\w+)(?:\\s+extends\\s+(\\w+))?\\s*\\{")
                .matcher(ts);
        while (m.find()) {
            int depth = 1;
            int i = m.end();
            while (i < ts.length() && depth > 0) {
                char c = ts.charAt(i);
                if (c == '{') {
                    depth++;
                } else if (c == '}') {
                    depth--;
                }
                i++;
            }
            Set<String> props = new TreeSet<>();
            Matcher p = Pattern.compile("^  ([a-zA-Z][a-zA-Z0-9]*)\\??:", Pattern.MULTILINE)
                    .matcher(ts.substring(m.end(), i - 1));
            while (p.find()) {
                props.add(p.group(1));
            }
            out.put(m.group(1), new TsIface(m.group(2), props));
        }
        return out;
    }

    // ------------- 6. .env.example + README config table -------------

    @Test
    void theEnvExampleAndConfigTableCoverEveryVariableTheAppReads() throws IOException {
        Set<String> read = new TreeSet<>();
        Set<String> emptyDefault = new TreeSet<>();
        String yml = Files.readString(APPLICATION_YML);
        for (Matcher m = Pattern.compile("\\$\\{([A-Z_][A-Z0-9_]*)").matcher(yml); m.find(); ) {
            read.add(m.group(1));
        }
        for (Matcher m = Pattern.compile("\\$\\{([A-Z_][A-Z0-9_]*)\\}").matcher(yml); m.find(); ) {
            emptyDefault.add(m.group(1)); // ${VAR} — nothing to fall back to
        }
        for (Matcher m = Pattern.compile("\\$\\{([A-Z_][A-Z0-9_]*)\\:\\}").matcher(yml); m.find(); ) {
            emptyDefault.add(m.group(1)); // ${VAR:} — empty default
        }
        try (Stream<Path> java = Files.walk(MAIN_JAVA)) {
            for (Path f : java.filter(p -> p.toString().endsWith(".java")).toList()) {
                String src = Files.readString(f);
                for (Matcher m = Pattern.compile("@Value\\(\"\\$\\{([A-Z_][A-Z0-9_]*)")
                        .matcher(src); m.find(); ) {
                    read.add(m.group(1));
                }
                for (Matcher m = Pattern.compile("@Value\\(\"\\$\\{([A-Z_][A-Z0-9_]*):?\\}\"")
                        .matcher(src); m.find(); ) {
                    emptyDefault.add(m.group(1));
                }
            }
        }

        Set<String> template = new TreeSet<>();
        for (Matcher m = Pattern.compile("^\\s*#?\\s*([A-Z_][A-Z0-9_]*)=", Pattern.MULTILINE)
                .matcher(Files.readString(ENV_EXAMPLE)); m.find(); ) {
            template.add(m.group(1));
        }

        Set<String> table = new TreeSet<>();
        for (Matcher m = Pattern.compile("`([A-Z][A-Z0-9_]{2,})`")
                .matcher(section(Files.readString(README), "Configuration")); m.find(); ) {
            table.add(m.group(1));
        }

        Set<String> phantom = new TreeSet<>(template);
        phantom.removeAll(read);
        assertThat(phantom)
                .as(".env.example names variables the app never reads — the template "
                        + "would be teaching a config that does nothing")
                .isEmpty();

        Set<String> undocumented = new TreeSet<>(read);
        undocumented.removeAll(template);
        undocumented.removeAll(table);
        assertThat(undocumented)
                .as("the app reads variables the docs never name — the README table "
                        + "claims to cover them all")
                .isEmpty();

        // The "must provide" distinction: an empty default means nothing to
        // fall back to, so the template itself must carry the variable.
        Set<String> required = new TreeSet<>(emptyDefault);
        required.removeAll(TEMPLATE_OPTIONAL_VARS);
        Set<String> missingFromTemplate = new TreeSet<>(required);
        missingFromTemplate.removeAll(template);
        assertThat(missingFromTemplate)
                .as("empty-default variables are mandatory in production — they must be "
                        + "in .env.example (only the registry URLs document a code-level "
                        + "fallback)")
                .isEmpty();

        assertThat(read.size())
                .as("the app reads %d env vars; at least %d expected — fewer means the "
                        + "binding patterns broke and this pin checks nothing",
                        read.size(), MIN_READ_VARS)
                .isGreaterThanOrEqualTo(MIN_READ_VARS);
        assertThat(template.size())
                .as(".env.example names %d vars; at least %d expected",
                        template.size(), MIN_TEMPLATE_VARS)
                .isGreaterThanOrEqualTo(MIN_TEMPLATE_VARS);
        assertThat(table.size())
                .as("the README configuration table documents %d vars; at least %d "
                        + "expected", table.size(), MIN_TABLE_VARS)
                .isGreaterThanOrEqualTo(MIN_TABLE_VARS);
        assertThat(required.size())
                .as("%d empty-default vars must live in the template; at least %d "
                        + "expected", required.size(), MIN_REQUIRED_VARS_IN_TEMPLATE)
                .isGreaterThanOrEqualTo(MIN_REQUIRED_VARS_IN_TEMPLATE);
    }

    // ----------------------- 7. dev proxy file -----------------------

    @Test
    void theAgentPackPointsAtTheRealProxyFile() throws IOException {
        JsonNode scripts = MAPPER.readTree(Files.readString(PACKAGE_JSON)).path("scripts");
        Set<String> configured = new TreeSet<>();
        for (Iterator<String> names = scripts.fieldNames(); names.hasNext(); ) {
            for (Matcher m = Pattern.compile("--proxy-config (\\S+)")
                    .matcher(scripts.get(names.next()).asText()); m.find(); ) {
                configured.add(m.group(1));
            }
        }
        assertThat(configured)
                .as("the frontend start scripts must agree on ONE dev-proxy file, got %s",
                        configured)
                .hasSize(1);
        String file = configured.iterator().next();
        assertThat(Files.exists(Path.of("frontend", file)))
                .as("the start scripts load a dev-proxy file that does not exist")
                .isTrue();

        int mentions = 0;
        List<String> wrong = new ArrayList<>();
        for (Path doc : frontendDocMdFiles()) {
            for (Matcher m = Pattern.compile("`proxy\\.conf\\.\\w+`")
                    .matcher(Files.readString(doc)); m.find(); ) {
                mentions++;
                if (!m.group().equals("`" + file + "`")) {
                    wrong.add(doc + ": " + m.group() + " — the start scripts load " + file);
                }
            }
        }
        assertThat(wrong)
                .as("frontend docs name a dev-proxy file that differs from the one the "
                        + "start scripts load (a copy of the app that cannot reach the "
                        + "backend)")
                .isEmpty();
        assertThat(mentions)
                .as("only %d proxy-file mentions were checked; at least %d expected",
                        mentions, MIN_PROXY_MENTIONS)
                .isGreaterThanOrEqualTo(MIN_PROXY_MENTIONS);
    }

    // --------------------- 8. Spring Boot version ---------------------

    @Test
    void theSpringBootVersionClaimsMatchThePom() throws IOException {
        Matcher pom = Pattern.compile(
                "<artifactId>spring-boot-starter-parent</artifactId>\\s*<version>(\\d+)\\.(\\d+)"
        ).matcher(Files.readString(POM));
        assertThat(pom.find())
                .as("pom.xml must pin spring-boot-starter-parent with a version").isTrue();
        String minor = pom.group(1) + "." + pom.group(2);

        int claims = 0;
        List<String> wrong = new ArrayList<>();
        for (Path doc : List.of(README, FRONTEND_README)) {
            for (Matcher m = Pattern.compile("Spring Boot (\\d+)\\.(\\d+)")
                    .matcher(Files.readString(doc)); m.find(); ) {
                claims++;
                if (!(m.group(1) + "." + m.group(2)).equals(minor)) {
                    wrong.add(doc + ": says Spring Boot " + m.group(1) + "." + m.group(2)
                            + ", the pom pins " + minor);
                }
            }
        }
        try (Stream<Path> agent = Files.list(AGENT_DIR)) {
            for (Path doc : agent.filter(p -> p.toString().endsWith(".md")).sorted().toList()) {
                for (Matcher m = Pattern.compile("Spring Boot (\\d+)\\.(\\d+)")
                        .matcher(Files.readString(doc)); m.find(); ) {
                    claims++;
                    if (!(m.group(1) + "." + m.group(2)).equals(minor)) {
                        wrong.add(doc + ": says Spring Boot " + m.group(1) + "." + m.group(2)
                                + ", the pom pins " + minor);
                    }
                }
            }
        }
        assertThat(wrong)
                .as("docs name a Spring Boot major.minor that does not match pom.xml")
                .isEmpty();
        assertThat(claims)
                .as("only %d Spring Boot version claims were checked; at least %d expected",
                        claims, MIN_BOOT_CLAIMS)
                .isGreaterThanOrEqualTo(MIN_BOOT_CLAIMS);
    }

    // ------------------- 9. palette tokens + hexes -------------------

    @Test
    void theDocPaletteTokensAndHexesExistInTheTokenFiles() throws IOException {
        String styles = Files.readString(STYLES);
        String tokens = Files.readString(THEME_TOKENS);
        String stylesLower = styles.toLowerCase();
        String tokensLower = tokens.toLowerCase();
        int tok = 0;
        int hex = 0;
        List<String> missing = new ArrayList<>();
        for (Path doc : frontendDocMdFiles()) {
            String s = Files.readString(doc);
            for (Matcher m = Pattern.compile("`(--color-[a-z0-9-]+)`").matcher(s); m.find(); ) {
                tok++;
                String t = m.group(1);
                if (!styles.contains(t) && !tokens.contains(t)) {
                    missing.add(doc + ": token " + t + " is defined in neither styles.scss "
                            + "nor theme-tokens.ts");
                }
            }
            for (Matcher m = Pattern.compile("`#[0-9a-fA-F]{6}`").matcher(s); m.find(); ) {
                hex++;
                String h = m.group().substring(1, m.group().length() - 1).toLowerCase();
                if (!stylesLower.contains(h) && !tokensLower.contains(h)) {
                    missing.add(doc + ": hex " + m.group() + " appears in neither token "
                            + "file");
                }
            }
        }
        assertThat(missing)
                .as("frontend docs name palette tokens or hexes the token files do not "
                        + "define (a color from a palette that no longer exists)")
                .isEmpty();
        assertThat(tok)
                .as("only %d palette token mentions were checked; at least %d expected",
                        tok, MIN_PALLETTE_TOKENS)
                .isGreaterThanOrEqualTo(MIN_PALLETTE_TOKENS);
        assertThat(hex)
                .as("only %d documented hexes were checked; at least %d expected",
                        hex, MIN_PALLETTE_HEXES)
                .isGreaterThanOrEqualTo(MIN_PALLETTE_HEXES);
    }

    // ---------------- 10. high-contrast block citation ----------------

    @Test
    void theHighContrastBlockCitationPointsAtTheRealBlock() throws IOException {
        List<String> lines = Files.readAllLines(STYLES);
        int selectorLine = 0;
        for (int i = 0; i < lines.size(); i++) {
            if (lines.get(i).contains("[data-theme='high-contrast']")) {
                selectorLine = i + 1;
                break;
            }
        }
        assertThat(selectorLine)
                .as("styles.scss must define the [data-theme='high-contrast'] block")
                .isGreaterThan(0);
        int closeLine = highContrastCloseLine(lines, selectorLine);
        assertThat(closeLine)
                .as("the high-contrast block must be brace-balanced in styles.scss")
                .isGreaterThan(selectorLine);

        String readme = Files.readString(FRONTEND_README);
        int cited = 0;
        List<String> wrong = new ArrayList<>();
        for (String paragraph : readme.split("\\n\\n")) {
            if (!paragraph.contains("high-contrast")) {
                continue;
            }
            for (Matcher m = Pattern.compile("styles\\.scss:(\\d+)-(\\d+)")
                    .matcher(paragraph); m.find(); ) {
                cited++;
                int lo = Integer.parseInt(m.group(1));
                int hi = Integer.parseInt(m.group(2));
                if (lo > selectorLine || hi < closeLine) {
                    wrong.add("the README cites styles.scss:" + lo + "-" + hi + " for the "
                            + "high-contrast block; the block actually spans lines "
                            + selectorLine + "-" + closeLine);
                }
            }
        }
        assertThat(cited)
                .as("the frontend README must still cite the high-contrast block range")
                .isGreaterThanOrEqualTo(1);
        assertThat(wrong)
                .as("the README's styles.scss line citation for the high-contrast block "
                        + "must contain the real block (a renumbered citation points at "
                        + "dead lines)")
                .isEmpty();
    }

    /** Closing line of the high-contrast block: braces counted with a
     *  comment-aware scan so the ORIGINAL line numbers stay intact. */
    private static int highContrastCloseLine(List<String> lines, int selectorLine) {
        int depth = 0;
        boolean inBlockComment = false;
        for (int i = selectorLine - 1; i < lines.size(); i++) {
            String line = lines.get(i);
            int j = 0;
            while (j < line.length()) {
                char c = line.charAt(j);
                if (inBlockComment) {
                    if (c == '*' && j + 1 < line.length() && line.charAt(j + 1) == '/') {
                        inBlockComment = false;
                        j += 2;
                    } else {
                        j++;
                    }
                } else if (c == '/' && j + 1 < line.length()
                        && line.charAt(j + 1) == '/') {
                    break; // rest of the line is a comment
                } else if (c == '/' && j + 1 < line.length()
                        && line.charAt(j + 1) == '*') {
                    inBlockComment = true;
                    j += 2;
                } else {
                    if (c == '{') {
                        depth++;
                    } else if (c == '}') {
                        depth--;
                    }
                    j++;
                }
            }
            if (depth == 0 && i >= selectorLine) {
                return i + 1;
            }
        }
        return -1;
    }

    // ------------------- 11. route table + tab count -------------------

    @Test
    void theRouteTableAndAdminTabCountMatchTheTree() throws IOException {
        String routes = stripTsComments(Files.readString(ROUTES));
        int total = count(routes, "path: '");
        int redirects = count(routes, "redirectTo:");
        int lazy = count(routes, "loadComponent:");
        int tabs = count(Files.readString(ADMIN_PAGE_HTML), "btn btn--ghost admin-tab");

        String frec = Files.readString(FRONTEND_README);
        int claims = 0;
        List<String> wrong = new ArrayList<>();
        Matcher rc = Pattern.compile("(\\d+) component routes \\+ (\\d+) redirects")
                .matcher(frec);
        if (rc.find()) {
            claims++;
            int componentRoutes = Integer.parseInt(rc.group(1));
            int docRedirects = Integer.parseInt(rc.group(2));
            if (total - redirects != componentRoutes || redirects != docRedirects) {
                wrong.add("the README says " + rc.group() + "; app.routes.ts has " + total
                        + " path entries (" + redirects + " redirects)");
            }
        }
        Matcher lc = Pattern.compile("(\\d+) routes are `loadComponent`-lazy").matcher(frec);
        if (lc.find()) {
            claims++;
            if (Integer.parseInt(lc.group(1)) != lazy) {
                wrong.add("the README says " + lc.group(1) + " routes are loadComponent-lazy; "
                        + "app.routes.ts has " + lazy);
            }
        }
        Matcher tc = Pattern.compile(
                "\\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) tabs\\b")
                .matcher(Files.readString(AGENT_01));
        while (tc.find()) {
            claims++;
            Integer n = WORD_NUMBERS.get(tc.group(1).toLowerCase());
            if (n == null || n != tabs) {
                wrong.add("01-TASK.md says \"" + tc.group() + "\"; admin-page.html renders "
                        + tabs + " admin tabs");
            }
        }
        assertThat(claims)
                .as("only %d route/tab claims were checked; at least %d expected",
                        claims, MIN_ROUTE_CLAIMS + MIN_TAB_CLAIMS)
                .isGreaterThanOrEqualTo(MIN_ROUTE_CLAIMS + MIN_TAB_CLAIMS);
        assertThat(wrong)
                .as("the route table and the admin tab count must match the tree — "
                        + "the layout comment counts are derived from app.routes.ts and "
                        + "admin-page.html")
                .isEmpty();
    }

    private static int count(String text, String needle) {
        int n = 0;
        int i = text.indexOf(needle);
        while (i >= 0) {
            n++;
            i = text.indexOf(needle, i + needle.length());
        }
        return n;
    }

    // --------------------- 12. bundle budget ---------------------

    @Test
    void theBundleBudgetClaimsStayInsideTheAngularBudgets() throws IOException {
        JsonNode budgets = MAPPER.readTree(Files.readString(ANGULAR_JSON))
                .path("projects").path("frontend").path("architect").path("build")
                .path("configurations").path("production").path("budgets");
        long initialWarning = -1;
        long compWarn = -1;
        for (JsonNode b : budgets) {
            if ("initial".equals(b.path("type").asText())) {
                initialWarning = parseBytes(b.path("maximumWarning").asText());
            } else if ("anyComponentStyle".equals(b.path("type").asText())) {
                compWarn = parseBytes(b.path("maximumWarning").asText());
            }
        }
        assertThat(initialWarning).as("angular.json must keep the initial budget")
                .isGreaterThan(0);
        assertThat(compWarn).as("angular.json must keep the anyComponentStyle budget")
                .isGreaterThan(0);

        // The budget paragraph wraps mid-list, so match on the normalized
        // blocks (the same line-joining the test-count guard uses).
        StringBuilder frec = new StringBuilder();
        for (String block : normalizedBlocks(Files.readString(FRONTEND_README))) {
            frec.append(block).append('\n');
        }
        Matcher measured = Pattern.compile("(\\d+\\.\\d+) kB raw").matcher(frec);
        assertThat(measured.find())
                .as("the frontend README must still document the measured initial total")
                .isTrue();
        double rawKb = Double.parseDouble(measured.group(1));
        assertThat(rawKb * 1024)
                .as("the documented initial total (%s kB) must stay inside the %d b initial "
                        + "warning budget", rawKb, initialWarning)
                .isLessThanOrEqualTo(initialWarning);

        int n = 0;
        List<String> wrong = new ArrayList<>();
        for (Matcher m = Pattern.compile("\\b([a-z0-9][a-z0-9-]*) (\\d+\\.\\d+) kB\\b")
                .matcher(frec); m.find(); ) {
            n++;
            String file = m.group(1) + ".scss";
            double kb = Double.parseDouble(m.group(2));
            if (!scssFileExists(file)) {
                wrong.add(file + " is listed in the budget paragraph but does not exist "
                        + "under frontend/src");
            }
            if (kb < compWarn / 1024.0) {
                wrong.add(m.group(1) + " is listed as warning above the budget but "
                        + kb + " kB is under the " + compWarn / 1024.0 + " kB warning");
            }
            if (kb * 1024 >= 10 * 1024) {
                wrong.add(m.group(1) + " at " + kb + " kB is already over the 10 kB "
                        + "anyComponentStyle error budget, so the build would fail, not "
                        + "just warn");
            }
        }
        assertThat(n)
                .as("the budget paragraph lists %d per-component SCSS figures; at least "
                        + "%d expected", n, MIN_SCSS_FIGURES)
                .isGreaterThanOrEqualTo(MIN_SCSS_FIGURES);
        assertThat(wrong)
                .as("the frontend README's bundle-budget figures must stay consistent "
                        + "with angular.json's budgets and the real stylesheet files")
                .isEmpty();
    }

    private static long parseBytes(String s) {
        Matcher m = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*(b|kB|KB|MB|GB)?").matcher(s);
        assertThat(m.find()).as("angular.json budget %s is not parseable", s).isTrue();
        double v = Double.parseDouble(m.group(1));
        return switch (m.group(2) == null ? "" : m.group(2)) {
            case "b" -> (long) v;
            case "kB", "KB" -> (long) (v * 1024);
            case "MB" -> (long) (v * 1024 * 1024);
            case "GB" -> (long) (v * 1024 * 1024 * 1024);
            default -> (long) v;
        };
    }

    private static boolean scssFileExists(String file) throws IOException {
        try (Stream<Path> walk = Files.walk(Path.of("frontend", "src"))) {
            return walk.anyMatch(p -> p.getFileName().toString().equals(file));
        }
    }

    // ------------------- 13. trust thresholds -------------------

    @Test
    void theTrustThresholdClaimsMatchTheConstants() throws IOException {
        String report = Files.readString(SHELTER_REPORT_JAVA);
        int hide = intConst(report, "AUTO_HIDE_THRESHOLD");
        int confirm = intConst(report, "AUTO_CONFIRM_THRESHOLD");

        int hideClaims = 0;
        int confirmClaims = 0;
        List<String> wrong = new ArrayList<>();
        for (Path doc : allRootAndFrontendDocs()) {
            String s = Files.readString(doc);
            for (Matcher m = Pattern.compile("reaching (\\d+) points").matcher(s); m.find(); ) {
                hideClaims++;
                if (Integer.parseInt(m.group(1)) != hide) {
                    wrong.add(doc + ": \"reaching " + m.group(1) + " points\" but "
                            + "AUTO_HIDE_THRESHOLD is " + hide);
                }
            }
            for (Matcher m = Pattern.compile(
                    "\\b(one|two|three|four|five) distinct (?:non-submitter )?confirmations?\\b")
                    .matcher(s); m.find(); ) {
                confirmClaims++;
                Integer n = WORD_NUMBERS.get(m.group(1));
                if (n == null || n != confirm) {
                    wrong.add(doc + ": \"" + m.group() + "\" but AUTO_CONFIRM_THRESHOLD "
                            + "is " + confirm);
                }
            }
        }
        assertThat(wrong)
                .as("the trust thresholds the docs state must match ShelterReport's "
                        + "constants — a shifted threshold changes what auto-hides and "
                        + "what auto-confirms")
                .isEmpty();
        assertThat(hideClaims)
                .as("only %d auto-hide threshold claims were checked; at least %d "
                        + "expected", hideClaims, MIN_HIDE_THRESHOLD_CLAIMS)
                .isGreaterThanOrEqualTo(MIN_HIDE_THRESHOLD_CLAIMS);
        assertThat(confirmClaims)
                .as("only %d auto-confirm threshold claims were checked; at least %d "
                        + "expected", confirmClaims, MIN_CONFIRM_THRESHOLD_CLAIMS)
                .isGreaterThanOrEqualTo(MIN_CONFIRM_THRESHOLD_CLAIMS);
    }

    private static int intConst(String source, String name) {
        Matcher m = Pattern.compile(name + "\\s*=\\s*(\\d+)").matcher(source);
        assertThat(m.find()).as("%s must declare %s", source, name).isTrue();
        return Integer.parseInt(m.group(1));
    }

    // ------------------- 14. quoted server messages -------------------

    @Test
    void theQuotedServerMessagesAreTheRealOnes() throws IOException {
        int cap = intConst(Files.readString(SHELTER_SERVICE_JAVA), "MAX_ACTIVE_SHELTERS_PER_USER");
        String expectedCap = "The limit of " + cap + " active shelters has been reached";
        int capQuotes = 0;
        List<String> wrong = new ArrayList<>();
        for (Path doc : allRootAndFrontendDocs()) {
            for (Matcher m = Pattern.compile(
                    "The limit of (\\d+) active shelters has been reached")
                    .matcher(Files.readString(doc)); m.find(); ) {
                capQuotes++;
                if (!m.group().equals(expectedCap)) {
                    wrong.add(doc + ": quotes \"" + m.group() + "\" but the constant "
                            + "builds \"" + expectedCap + "\"");
                }
            }
        }
        assertThat(capQuotes)
                .as("only %d shelter-cap message quotes were checked; at least %d "
                        + "expected", capQuotes, MIN_CAP_MESSAGE_QUOTES)
                .isGreaterThanOrEqualTo(MIN_CAP_MESSAGE_QUOTES);

        Matcher dup = Pattern.compile("MESSAGE = \"([^\"]+)\"")
                .matcher(Files.readString(DUPLICATE_REPORT_JAVA));
        assertThat(dup.find())
                .as("DuplicateReportException must declare its MESSAGE literal").isTrue();
        String message = dup.group(1);
        assertThat(Files.readString(AGENT_02).contains(message))
                .as("the 02-CONTEXT-API table quotes the duplicate-report 409 message; "
                        + "it must match DuplicateReportException.MESSAGE exactly (\""
                        + message + "\")")
                .isTrue();
        assertThat(wrong)
                .as("the docs quote the shelter-cap 409 message; it must match what the "
                        + "constant builds")
                .isEmpty();
    }

    // ------------------- 15. FE DTO negative claims -------------------

    @Test
    void theFeDtoNegativeClaimsHold() throws IOException {
        String doc = Files.readString(AGENT_05);
        Set<String> claimedAbsent = new TreeSet<>();
        for (Matcher m = Pattern.compile("carries NO `([a-z][a-zA-Z0-9]*)` field")
                .matcher(doc); m.find(); ) {
            claimedAbsent.add(m.group(1));
        }
        assertThat(claimedAbsent)
                .as("05-CONTEXT-MAP documents negative FE-DTO claims; at least one is "
                        + "expected")
                .isNotEmpty();
        Set<String> fe = feShelterDtoFields();
        for (String field : claimedAbsent) {
            assertThat(fe)
                    .as("the FE ShelterDto must NOT carry `" + field + "` (05-CONTEXT-MAP "
                            + "documents its absence — the provenance-on-AdminShelterDto "
                            + "class of lie, on the frontend side)")
                    .doesNotContain(field);
        }
        Matcher reads = Pattern.compile(
                "the FE badge reads `([a-z][a-zA-Z0-9]*)` \\+ `([a-z][a-zA-Z0-9]*)`")
                .matcher(doc);
        assertThat(reads.find())
                .as("05-CONTEXT-MAP must still state which fields the FE badge reads")
                .isTrue();
        assertThat(fe)
                .as("the fields 05-CONTEXT-MAP says the FE badge reads must exist on the "
                        + "FE ShelterDto")
                .contains(reads.group(1), reads.group(2));
    }

    private static Set<String> feShelterDtoFields() throws IOException {
        String ts = stripTsComments(Files.readString(MODELS_TS));
        Matcher m = Pattern.compile("export interface ShelterDto\\s*\\{").matcher(ts);
        assertThat(m.find())
                .as("frontend/src/app/core/models.ts must declare ShelterDto").isTrue();
        int depth = 1;
        int i = m.end();
        while (i < ts.length() && depth > 0) {
            char c = ts.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
            }
            i++;
        }
        Set<String> props = new TreeSet<>();
        Matcher p = Pattern.compile("^  ([a-zA-Z][a-zA-Z0-9]*)\\??:", Pattern.MULTILINE)
                .matcher(ts.substring(m.end(), i - 1));
        while (p.find()) {
            props.add(p.group(1));
        }
        return props;
    }

    private static String stripTsComments(String ts) {
        return ts.replaceAll("/\\*[\\s\\S]*?\\*/", "").replaceAll("(?m)//[^\\n]*", "");
    }

    // ------------------- 16. navigate deep links -------------------

    @Test
    void theNavigateDeepLinksAreTheRealOnes() throws IOException {
        String code = Files.readString(SHELTER_DETAIL_TS);
        String doc = Files.readString(AGENT_06);
        int n = 0;
        List<String> wrong = new ArrayList<>();
        for (Matcher m = Pattern.compile(
                "`https://(www\\.google\\.com/maps/[^`]*|maps\\.apple\\.com[^`]*)`")
                .matcher(doc); m.find(); ) {
            n++;
            // The URL templates interleave literal segments with {…} template
            // holes; each literal segment (split on & too — the code builds
            // them from separate literals) must exist in the page source.
            for (String segment : m.group(1).split("\\{[^}]*\\}")) {
                for (String part : segment.split("&")) {
                    String piece = part.replace(",", "");
                    if (piece.length() >= 6 && !code.contains(piece)) {
                        wrong.add("the deep-link piece \"" + piece + "\" does not appear "
                                + "in shelter-detail-page.ts (the doc describes a URL the "
                                + "page never builds)");
                    }
                }
            }
        }
        assertThat(wrong)
                .as("the navigate deep links 06-CONTEXT-SHELTER documents must be the "
                        + "URLs shelter-detail-page.ts actually builds")
                .isEmpty();
        assertThat(n)
                .as("only %d navigate deep links were checked; at least 2 expected", n)
                .isGreaterThanOrEqualTo(2);
    }

    // --------------------------- shared helpers ---------------------------

    private static JsonNode openApi() {
        if (OPENAPI_NODE == null) {
            try {
                OPENAPI_NODE = MAPPER.readTree(Files.readAllBytes(OPENAPI));
            } catch (IOException e) {
                throw new UncheckedIOException("cannot read " + OPENAPI, e);
            }
        }
        return OPENAPI_NODE;
    }

    /** The body of a {@code ## heading} section, up to the next {@code ## }. */
    private static String section(String text, String heading) {
        Matcher m = Pattern.compile(
                "^##\\s+" + Pattern.quote(heading) + "[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|\\z)",
                Pattern.MULTILINE).matcher(text);
        assertThat(m.find())
                .as("the README must still carry the '## " + heading + "' section")
                .isTrue();
        return m.group(1);
    }

    private static Set<String> schemaPropertyNames(String schema) {
        assertThat(openApi().path("components").path("schemas").has(schema))
                .as("the OpenAPI document must define the %s schema", schema)
                .isTrue();
        return propertiesOf(openApi().path("components").path("schemas").get(schema));
    }

    /** frontend/README.md plus every markdown file in frontend/docs/agent/. */
    private static List<Path> frontendDocMdFiles() throws IOException {
        List<Path> docs = new ArrayList<>();
        docs.add(FRONTEND_README);
        try (Stream<Path> walk = Files.list(AGENT_DIR)) {
            docs.addAll(walk.filter(p -> p.toString().endsWith(".md")).sorted().toList());
        }
        return docs;
    }

    /** The root README plus every frontend doc the version/threshold pins scan. */
    private static List<Path> allRootAndFrontendDocs() throws IOException {
        List<Path> docs = new ArrayList<>();
        docs.add(README);
        docs.addAll(frontendDocMdFiles());
        return docs;
    }


}
