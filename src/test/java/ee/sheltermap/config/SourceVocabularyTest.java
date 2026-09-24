package ee.sheltermap.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * Fails when a source comment carries an id that a reader cannot resolve.
 *
 * <p>Ids minted while work was being planned, split into batches or reviewed
 * are dead references: the row they name lives outside this repository, so the
 * comment states a conclusion without its reason. The rule enforced here is
 * that a comment either spells the reason out in words or points at the
 * durable specification path that owns the rule.
 *
 * <p>Plain JUnit 5 with no Spring context: the check is a file walk, so it
 * stays in the fast unit tier.
 *
 * <p>The walk also carries a matched-count floor: it must still see at least
 * a fixed number of files under every scanned root and a fixed number of
 * lines in total. A reformat that moves, renames or re-roots the sources
 * must fail loudly — not shrink the walk until it checks nothing and passes
 * on an empty tree. This is the same floor discipline the other guards in
 * this repository apply to their citation and pattern counts.
 */
class SourceVocabularyTest {

    /**
     * Forbidden id shapes, each with the reader-visible gap it leaves behind.
     * Every pattern is anchored on id syntax that ordinary English and
     * ordinary code cannot produce — no bare words, no generic numbers.
     *
     * <p>Deliberately NOT forbidden, because a reader in this repository can
     * resolve them: Flyway version numbers (a bare V plus digits — the
     * migration files exist in the tree), i18n keys (dotted paths),
     * specification paths, class and constant names, and the letters that
     * name standards rather than planning rows (WGS84, EST97, E164, SHA256,
     * the JPEG marker names). A shape lands in this list only after a census
     * over the whole scanned tree shows it occurs as nothing but planning
     * references. A hex byte written in prose (the start-of-image pair FF D8)
     * is refused by the hex-adjacency exemption in {@link #isHexSequenceMember}
     * — a byte value standing next to a hex byte is data, not an id — and a
     * hex literal (0xFFD8) is refused by the id patterns' word boundaries.
     */
    private static final List<Pattern> FORBIDDEN_PATTERNS = List.of(
            // work-ledger row ids
            Pattern.compile("ORCH-\\d+"),
            // item ids minted by one source-cleanup pass
            Pattern.compile("\\bde-slop [A-Z]\\d+\\b"),
            // rollout batch numbering
            Pattern.compile("\\bwave-\\d+"),
            // paired finding ids written as a slash pair
            Pattern.compile("\\bW\\d+/W\\d+\\b"),
            // finding ids issued by one review pass
            Pattern.compile("\\breviewer [NF]\\d+\\b"),
            // finding counts spelled out in prose
            Pattern.compile("\\bN\\d+ finding\\b"),
            // a swagger-ledger row id: no source identifier and no English
            // word carries the SW-C prefix, so this shape is only ever a row
            Pattern.compile("\\bSW-C\\d+\\b"),
            // a bare id followed by the word review, finding or pass: the id
            // on its own stays legal (h1 is an HTML heading, S3 a product
            // name), so only the id-plus-word shape is matched
            Pattern.compile("\\b[A-Z]\\d+ (?:review|finding|pass)\\b"),
            // a calendar date followed by the word review: a dated pass
            // reference. A date on its own stays legal — fixtures, fixed
            // clocks and migration names carry them for real reasons
            Pattern.compile("\\b\\d{4}-\\d{2}-\\d{2} review\\b"),
            // a rollout wave cited in prose: the word wave, capitalised or
            // not, followed by a number. No ordinary sentence or code token
            // pairs that word with a bare number.
            Pattern.compile("\\bWave \\d+"),
            Pattern.compile("\\bwave \\d+"),
            // the dash-spelled form of the same wave citation: the census
            // over the tree shows no identifier carries that shape
            Pattern.compile("\\bWave-\\d+"),
            // a wave-task id: a capital W, a number, a dash, a task letter
            Pattern.compile("\\bW\\d+-[A-Z]\\b"),
            // a decision id: a capital D followed by digits, standing alone
            Pattern.compile("\\bD\\d+\\b"),
            // a milestone id: a capital M, digits, an optional trailing
            // letter. A test fixture that happens to carry this shape is a
            // local name, not a reference — rename the fixture, do not
            // allow-list the shape
            Pattern.compile("\\bM\\d+[a-z]?\\b"),
            // a plan-row id: a capital P, a number, a dash, a number
            Pattern.compile("\\bP\\d+-\\d+\\b")
    );

    /** Source trees scanned, relative to the module root. */
    private static final List<String> SCANNED_ROOTS = List.of("src/main/java", "src/test/java", "frontend/src");

    /** Authored source files; generated output and assets stay out of scope. */
    private static final List<String> SCANNED_EXTENSIONS = List.of(".java", ".ts", ".html", ".scss");

    /** Generated or dependency trees, never authored by hand. */
    private static final Set<String> SKIPPED_DIRECTORIES = Set.of("target", "node_modules", ".angular", "dist");

    /**
     * The floor a per-root walk must still clear: the number of authored
     * files under that root. Measured on a clean tree as 358 / 184 / 224
     * (main / test / frontend); the floors sit below the measurement so
     * ordinary churn stays green and a moved or renamed tree goes red.
     */
    private record RootFloor(String root, int minFiles) { }

    private static final List<RootFloor> ROOT_FLOORS = List.of(
            new RootFloor("src/main/java", 300),
            new RootFloor("src/test/java", 150),
            new RootFloor("frontend/src", 180));

    /** Total scanned lines across all roots (measured 136 518 on a clean tree). */
    private static final int MIN_SCANNED_LINES = 110_000;

    /** A hex byte: one or two hex digits (FF, D8, 0A). */
    private static final Pattern HEX_BYTE = Pattern.compile("[0-9A-Fa-f]{1,2}");

    /** A hex value token: an optional 0x prefix and one to four hex digits. */
    private static final Pattern HEX_VALUE = Pattern.compile("(?:0[xX])?[0-9A-Fa-f]{1,4}");

    @Test
    void sourceContainsNoUnresolvableIdReferences() {
        Path root = moduleRoot();
        List<String> hits = new ArrayList<>();
        Map<String, Integer> filesPerRoot = new HashMap<>();
        long[] scannedLines = new long[1];
        int scannedRoots = 0;
        for (String scannedRoot : SCANNED_ROOTS) {
            Path start = root.resolve(scannedRoot);
            if (Files.isDirectory(start)) {
                scannedRoots++;
                collectHits(root, scannedRoot, start, hits, filesPerRoot, scannedLines);
            }
        }
        hits.sort(Comparator.naturalOrder());
        if (scannedRoots == 0) {
            fail("No scanned source root found under " + root + " — the walk started in the wrong "
                    + "directory, so this guard checked nothing.");
        }
        List<String> floorProblems = floorProblems(filesPerRoot, scannedLines[0]);
        if (!floorProblems.isEmpty()) {
            fail(String.join("\n", floorProblems));
        }
        if (!hits.isEmpty()) {
            fail(renderFailure(hits));
        }
    }

    /**
     * The module root: the nearest ancestor of the working directory that holds
     * a Maven build file, so the walk works from an IDE run as well as from a
     * build-tool run.
     */
    private static Path moduleRoot() {
        Path workingDirectory = Path.of("").toAbsolutePath();
        for (Path candidate = workingDirectory; candidate != null; candidate = candidate.getParent()) {
            if (Files.isRegularFile(candidate.resolve("pom.xml"))) {
                return candidate;
            }
        }
        return workingDirectory;
    }

    /** Walks one scanned root and records every offending line found beneath it. */
    private static void collectHits(Path root, String rootKey, Path start, List<String> hits,
                                    Map<String, Integer> filesPerRoot, long[] scannedLines) {
        try {
            Files.walkFileTree(start, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attributes) {
                    return SKIPPED_DIRECTORIES.contains(dir.getFileName().toString())
                            ? FileVisitResult.SKIP_SUBTREE
                            : FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attributes) {
                    if (hasScannedExtension(file)) {
                        filesPerRoot.merge(rootKey, 1, Integer::sum);
                        scannedLines[0] += scanFile(root, file, hits);
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFileFailed(Path file, IOException failure) {
                    // An unreadable file is not evidence of an id reference, so the walk moves on.
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            // A subtree that disappears mid-walk is not evidence either.
        }
    }

    /**
     * Records {@code relative/path:line: <trimmed line>} for each offending line of one
     * file and returns the number of lines scanned — the floor's denominator.
     */
    private static int scanFile(Path root, Path file, List<String> hits) {
        List<String> lines;
        try {
            lines = Files.readAllLines(file, StandardCharsets.UTF_8);
        } catch (IOException e) {
            // Unreadable, undecodable or vanished: skip the file instead of failing the guard.
            return 0;
        }
        for (int index = 0; index < lines.size(); index++) {
            String line = lines.get(index).trim();
            if (containsForbiddenId(line)) {
                String relativePath = root.relativize(file).toString().replace('\\', '/');
                hits.add(relativePath + ":" + (index + 1) + ": " + line);
            }
        }
        return lines.size();
    }

    private static boolean containsForbiddenId(String line) {
        for (Pattern pattern : FORBIDDEN_PATTERNS) {
            Matcher matcher = pattern.matcher(line);
            while (matcher.find()) {
                if (!isHexSequenceMember(line, matcher.start(), matcher.end())) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * The hex-adjacency exemption: a match that is itself a hex byte, that
     * stands alone as its whole token, and that has a hex value with an
     * uppercase hex letter directly beside it is a byte value written in
     * prose (the JPEG marker pair FF D8) or a code-ish literal, not a
     * planning id. The neighbour must carry an uppercase hex letter, so a
     * plain count (digits only) or a word whose letters happen to be hex
     * is not a byte pair, and a real id next to them stays red. In
     * practice only the bare D-digit id shape can qualify: the other
     * id shapes carry a letter or a dash that no hex value does, and the
     * multi-token patterns never match an all-hex substring. This file's
     * own javadoc spells the pair out, so a regression of the exemption
     * turns the guard's own file red.
     */
    private static boolean isHexSequenceMember(String line, int start, int end) {
        if (!HEX_BYTE.matcher(line.substring(start, end)).matches()) {
            return false;
        }
        String token = enclosingToken(line, start, end)
                .replaceAll("^[^A-Za-z0-9]+", "")
                .replaceAll("[^A-Za-z0-9]+$", "");
        if (!token.equals(line.substring(start, end))) {
            return false; // embedded in a longer token (a slash pair of ids) — not a byte
        }
        return isHexNeighbor(adjacentToken(line, start, true))
                || isHexNeighbor(adjacentToken(line, end, false));
    }

    /** The whitespace-separated token enclosing [start, end). */
    private static String enclosingToken(String line, int start, int end) {
        int from = start;
        while (from > 0 && !Character.isWhitespace(line.charAt(from - 1))) {
            from--;
        }
        int to = end;
        while (to < line.length() && !Character.isWhitespace(line.charAt(to))) {
            to++;
        }
        return line.substring(from, to);
    }

    /** The neighbouring whitespace-separated token before (or after) the offset. */
    private static String adjacentToken(String line, int offset, boolean backward) {
        if (backward) {
            int i = offset;
            while (i > 0 && Character.isWhitespace(line.charAt(i - 1))) {
                i--;
            }
            int from = i;
            while (from > 0 && !Character.isWhitespace(line.charAt(from - 1))) {
                from--;
            }
            return line.substring(from, i);
        }
        int i = offset;
        while (i < line.length() && Character.isWhitespace(line.charAt(i))) {
            i++;
        }
        int to = i;
        while (to < line.length() && !Character.isWhitespace(line.charAt(to))) {
            to++;
        }
        return line.substring(i, to);
    }

    /** A bare hex byte or hex value carrying an uppercase hex letter (FF, D8, 0xFF). */
    private static boolean isHexNeighbor(String rawToken) {
        String token = rawToken.replaceAll("^[^A-Za-z0-9]+", "")
                .replaceAll("[^A-Za-z0-9]+$", "");
        return !token.isEmpty()
                && HEX_VALUE.matcher(token).matches()
                && token.chars().anyMatch(c -> c >= 'A' && c <= 'F');
    }

    private static boolean hasScannedExtension(Path file) {
        String name = file.getFileName().toString();
        for (String extension : SCANNED_EXTENSIONS) {
            if (name.endsWith(extension)) {
                return true;
            }
        }
        return false;
    }

    /**
     * The walk's own denominator: if the tree it scans has shrunk below the
     * floors, the hit list above it is meaningless — a walk that checks
     * nothing must not pass silently.
     */
    private static List<String> floorProblems(Map<String, Integer> filesPerRoot, long scannedLines) {
        List<String> problems = new ArrayList<>();
        for (RootFloor floor : ROOT_FLOORS) {
            int seen = filesPerRoot.getOrDefault(floor.root(), 0);
            if (seen < floor.minFiles()) {
                problems.add("only " + seen + " source files were scanned under " + floor.root()
                        + " (the floor is " + floor.minFiles() + ") — a tree move, rename or "
                        + "skip-list change shrank the walk; this guard would check nothing");
            }
        }
        if (scannedLines < MIN_SCANNED_LINES) {
            problems.add("only " + scannedLines + " source lines were scanned in total "
                    + "(the floor is " + MIN_SCANNED_LINES + ") — the walk shrank to a "
                    + "fraction of the tree it is written for");
        }
        if (!problems.isEmpty()) {
            problems.add(0, "The vocabulary walk degraded below its matched-count floors — restore "
                    + "the tree layout, or change the floors deliberately with a reason, so a "
                    + "reformat can never reduce this guard to checking nothing:");
        }
        return problems;
    }

    /** Renders the hit list plus the one-sentence fix a reader needs. */
    private static String renderFailure(List<String> hits) {
        StringBuilder message = new StringBuilder()
                .append(hits.size())
                .append(" source line(s) reference an id a reader cannot resolve:\n");
        for (String hit : hits) {
            message.append("  ").append(hit).append('\n');
        }
        return message.append("Replace each id with the reason it stood for, or with the path of the durable "
                + "specification that owns the rule — an id from a planning or review pass "
                + "is unresolvable once that pass is over.").toString();
    }
}
