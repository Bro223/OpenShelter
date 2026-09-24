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
import java.util.TreeSet;
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
 * <p>A second check refuses a different dead reference: a source comment
 * that cites an archived change by name. Its refused list is
 * derived at runtime from the openspec change archive, so it stays in step
 * as changes are archived — see
 * {@link #sourceCommentsContainNoArchivedChangeNames()}.
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

    /** The openspec change archive the refused names are derived from. */
    private static final String ARCHIVE_DIR = "openspec/changes/archive";

    /** The live changes that keep a same-named id resolvable. */
    private static final String CHANGES_DIR = "openspec/changes";

    /**
     * Floor on the derived archived-name list (measured 74 on a clean tree).
     * The list is derived at runtime from the archive, so a pruned or
     * mislocated archive would shrink it silently; the floor makes that a
     * loud failure instead of a quiet pass.
     */
    private static final int MIN_ARCHIVED_CHANGE_NAMES = 70;

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
     * Fails when a comment in either Java tree cites an archived change by name.
     *
     * <p>A change name is resolvable while its directory sits in
     * {@code openspec/changes/} — the reader can open the proposal it names.
     * Once the change is archived the directory exists only under a date
     * prefix, so a bare name in a comment points at nothing the reader can
     * open; the constraint it described is still worth keeping, the name is
     * dead weight. This check refuses exactly those dead names.
     *
     * <p>The refused list is derived at runtime: every archived directory
     * name, plus the same name without its {@code YYYY-MM-DD-} prefix, minus
     * the live change names (a live change re-opening the same name makes it
     * resolvable again). Archiving a change therefore extends the list
     * without any edit to this test, and the floor
     * {@link #MIN_ARCHIVED_CHANGE_NAMES} keeps the derivation honest — a
     * pruned archive that would silently shrink the list is a failure, not a
     * pass.
     *
     * <p>Scope: {@code src/main/java} and {@code src/test/java} comment text
     * only. String and char literals do not count — an OpenAPI description is
     * public contract, not a comment, and regenerating the snapshot it pins
     * is a separate decision; a test name, a {@code @DisplayName} text and a
     * fixture string are the same class of pinned surface. Text blocks are
     * skipped whole (the test tree's JSON fixtures live in them). The
     * frontend tree is not walked: its comments span TS/SCSS and HTML syntax
     * this Java scanner does not parse, and it joins when an HTML/TS-aware
     * scan says the tree is clean. A match must be a whole kebab token (a
     * slug inside a longer identifier is a coincidental substring, not a
     * citation), and a path token containing {@code /} is exempt: a comment
     * that cites an archive document by path still resolves.
     */
    @Test
    void sourceCommentsContainNoArchivedChangeNames() {
        Path root = moduleRoot();
        if (!Files.isDirectory(root.resolve(ARCHIVE_DIR))) {
            fail("No archive walk was executed: " + ARCHIVE_DIR + " is missing under " + root
                    + " — the refused list is derived from it, so this guard cannot pass over a "
                    + "tree it did not derive its names from.");
        }
        List<String> refusedNames = archivedChangeNames(root);
        if (refusedNames.size() < MIN_ARCHIVED_CHANGE_NAMES) {
            fail("Only " + refusedNames.size() + " archived change name(s) were derived from "
                    + ARCHIVE_DIR + " (the floor is " + MIN_ARCHIVED_CHANGE_NAMES
                    + ") — the archive is pruned or mislocated, and a shrunken list would let this "
                    + "guard pass silently.");
        }
        List<String> hits = new ArrayList<>();
        int[] scannedFiles = { 0 };
        for (String javaRoot : List.of("src/main/java", "src/test/java")) {
            Path tree = root.resolve(javaRoot);
            if (!Files.isDirectory(tree)) {
                fail("No " + javaRoot + " walk was executed: the scan started in the wrong "
                        + "directory " + tree + ". Anchor it at the real module root, not a "
                        + "build copy.");
            }
            walkTreeForRefusedNames(root, tree, refusedNames, hits, scannedFiles);
        }
        if (scannedFiles[0] == 0) {
            fail("The source walk found no .java files — the scan is reading the wrong tree.");
        }
        if (!hits.isEmpty()) {
            fail(renderRefusedNameFailure(hits, refusedNames.size()));
        }
    }

    /**
     * Walks one Java tree and records every comment line carrying a refused
     * name, counting the .java files scanned along the way.
     */
    private static void walkTreeForRefusedNames(Path root, Path start, List<String> names,
                                                List<String> hits, int[] scannedFiles) {
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
                    if (file.toString().endsWith(".java")) {
                        scannedFiles[0] += 1;
                        hits.addAll(refusedNameHits(root, file, names));
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFileFailed(Path file, IOException failure) {
                    // An unreadable file is not evidence of a dead name, so the walk moves on.
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            // A subtree that disappears mid-walk is not evidence either.
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

    /**
     * The refused names, sorted for deterministic failure output: every
     * archived directory name plus its date-stripped slug, minus the live
     * change names.
     */
    private static List<String> archivedChangeNames(Path root) {
        Set<String> names = new TreeSet<>();
        try (var archiveEntries = Files.list(root.resolve(ARCHIVE_DIR))) {
            for (String entry : archiveEntries.map(p -> p.getFileName().toString()).toList()) {
                if (entry.startsWith(".") || !entry.matches("\\d{4}-\\d{2}-\\d{2}-.+")) {
                    continue; // the placeholder dotfile and any stray non-dated entry are not change names
                }
                names.add(entry);
                names.add(entry.replaceFirst("\\d{4}-\\d{2}-\\d{2}-", ""));
            }
        } catch (IOException e) {
            fail("The change archive could not be read: " + e.getMessage());
        }
        try (var liveEntries = Files.list(root.resolve(CHANGES_DIR))) {
            for (String entry : liveEntries.map(p -> p.getFileName().toString()).toList()) {
                if (!entry.startsWith(".") && !entry.equals("archive")) {
                    names.remove(entry);
                }
            }
        } catch (IOException e) {
            fail("The live changes could not be read: " + e.getMessage());
        }
        return List.copyOf(names);
    }

    /** The comment lines of one Java source file that carry a refused name, rendered for failure output. */
    private static List<String> refusedNameHits(Path root, Path file, List<String> names) {
        List<String> lines;
        try {
            lines = Files.readAllLines(file, StandardCharsets.UTF_8);
        } catch (IOException e) {
            return List.of(); // unreadable, undecodable or vanished: the walk moves on, like the id walk
        }
        List<String> hits = new ArrayList<>();
        String relativePath = root.relativize(file).toString().replace('\\', '/');
        List<String> commentLines = commentTextByLine(String.join("\n", lines));
        for (int index = 0; index < lines.size(); index++) {
            String name = findRefusedName(commentLines.get(index), names);
            if (name != null) {
                hits.add(relativePath + ":" + (index + 1) + ": refused '" + name + "' — "
                        + lines.get(index).trim());
            }
        }
        return hits;
    }

    /**
     * The first refused name cited as a whole kebab token in one comment line,
     * or {@code null}. A match inside a path token (a whitespace-delimited
     * token containing {@code /}) is exempt: it names a resolvable archive
     * document, not a dead change id.
     */
    private static String findRefusedName(String commentLine, List<String> names) {
        for (String name : names) {
            int from = 0;
            while (true) {
                int start = commentLine.indexOf(name, from);
                if (start < 0) {
                    break;
                }
                int end = start + name.length();
                if (isWholeKebabToken(commentLine, start, end) && !isPathToken(commentLine, start, end)) {
                    return name;
                }
                from = start + 1;
            }
        }
        return null;
    }

    /** True when {@code [start, end)} is a full whitespace-delimited kebab token. */
    private static boolean isWholeKebabToken(String line, int start, int end) {
        if (start > 0 && isKebabChar(line.charAt(start - 1))) {
            return false;
        }
        return end >= line.length() || !isKebabChar(line.charAt(end));
    }

    /** A letter, a digit, or the kebab separator itself. */
    private static boolean isKebabChar(char c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-';
    }

    /** True when the whitespace-delimited token holding {@code [start, end)} contains a {@code /}. */
    private static boolean isPathToken(String line, int start, int end) {
        int tokenStart = start;
        while (tokenStart > 0 && !Character.isWhitespace(line.charAt(tokenStart - 1))) {
            tokenStart--;
        }
        int tokenEnd = end;
        while (tokenEnd < line.length() && !Character.isWhitespace(line.charAt(tokenEnd))) {
            tokenEnd++;
        }
        int slash = line.indexOf('/', tokenStart);
        return slash >= 0 && slash < tokenEnd;
    }

    /**
     * The comment text of a Java source, one entry per source line. A minimal
     * state machine tracks line comments, block comments, string literals,
     * char literals and text blocks, so a slug-shaped word inside a literal
     * is not reported and a comment marker inside a string (a URL) does not
     * confuse the scan. Text blocks are skipped whole (the test tree's JSON
     * fixtures live in them); the closing delimiter is the last three quotes
     * of its quote run, so block content that itself ends in a quote does
     * not end the block early, and a line-continuation backslash still ends
     * the source line.
     */
    private static List<String> commentTextByLine(String content) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int state = CODE;
        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);
            char next = i + 1 < content.length() ? content.charAt(i + 1) : 0;
            if (state == CODE) {
                if (c == '/' && next == '/') {
                    state = LINE_COMMENT;
                    i++;
                }
                else if (c == '/' && next == '*') {
                    state = BLOCK_COMMENT;
                    i++;
                }
                else if (c == '"' && next == '"'
                        && i + 2 < content.length() && content.charAt(i + 2) == '"') {
                    state = TEXT_BLOCK;
                    i += 2;
                }
                else if (c == '"') {
                    state = STRING;
                }
                else if (c == '\'') {
                    state = CHAR;
                }
                else if (c == '\n') {
                    result.add(current.toString());
                    current.setLength(0);
                }
            }
            else if (state == LINE_COMMENT) {
                if (c == '\n') {
                    state = CODE;
                    result.add(current.toString());
                    current.setLength(0);
                }
                else {
                    current.append(c);
                }
            }
            else if (state == BLOCK_COMMENT) {
                if (c == '*' && next == '/') {
                    state = CODE;
                    i++;
                }
                else if (c == '\n') {
                    result.add(current.toString());
                    current.setLength(0);
                }
                else {
                    current.append(c);
                }
            }
            else if (state == TEXT_BLOCK) {
                // skipped whole, with escape handling
                if (c == '\\') {
                    // a line-continuation backslash still ends the source line
                    if (next == '\n') {
                        result.add(current.toString());
                        current.setLength(0);
                    }
                    i++;
                }
                else if (c == '"') {
                    int run = 1;
                    while (i + run < content.length() && content.charAt(i + run) == '"') {
                        run++;
                    }
                    // the closing delimiter is the last three quotes of the run:
                    // a run of four is block content ending in one quote
                    if (run >= 3) {
                        state = CODE;
                    }
                    i += run - 1;
                }
                else if (c == '\n') {
                    result.add(current.toString());
                    current.setLength(0);
                }
            }
            else { // STRING and CHAR literals: skipped, with escape handling
                if (c == '\\') {
                    i++;
                }
                else if ((state == STRING && c == '"') || (state == CHAR && c == '\'')) {
                    state = CODE;
                }
                else if (c == '\n') {
                    state = CODE;
                    result.add(current.toString());
                    current.setLength(0);
                }
            }
        }
        result.add(current.toString());
        return result;
    }

    /** Scanner states for {@link #commentTextByLine(String)}. */
    private static final int CODE = 0;
    private static final int LINE_COMMENT = 1;
    private static final int BLOCK_COMMENT = 2;
    private static final int STRING = 3;
    private static final int CHAR = 4;
    private static final int TEXT_BLOCK = 5;

    /** Renders the refused-name hit list plus the one-sentence fix a reader needs. */
    private static String renderRefusedNameFailure(List<String> hits, int nameCount) {
        StringBuilder message = new StringBuilder()
                .append(hits.size())
                .append(" source comment(s) cite an archived change name (")
                .append(nameCount)
                .append(" names derived from ")
                .append(ARCHIVE_DIR)
                .append("):\n");
        for (String hit : hits) {
            message.append("  ").append(hit).append('\n');
        }
        return message.append("A change name stops resolving when the change is archived — keep the "
                + "constraint it stated, drop the name.").toString();
    }
}
