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
import java.util.List;
import java.util.Set;
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
 */
class SourceVocabularyTest {

    /**
     * Forbidden id shapes, each with the reader-visible gap it leaves behind.
     * Every pattern is anchored on id syntax that ordinary English and
     * ordinary code cannot produce — no bare words, no generic numbers.
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
            Pattern.compile("\\bN\\d+ finding\\b")
    );

    /** Source trees scanned, relative to the module root. */
    private static final List<String> SCANNED_ROOTS = List.of("src/main/java", "src/test/java", "frontend/src");

    /** Authored source files; generated output and assets stay out of scope. */
    private static final List<String> SCANNED_EXTENSIONS = List.of(".java", ".ts", ".html", ".scss");

    /** Generated or dependency trees, never authored by hand. */
    private static final Set<String> SKIPPED_DIRECTORIES = Set.of("target", "node_modules", ".angular", "dist");

    @Test
    void sourceContainsNoUnresolvableIdReferences() {
        Path root = moduleRoot();
        List<String> hits = new ArrayList<>();
        int scannedRoots = 0;
        for (String scannedRoot : SCANNED_ROOTS) {
            Path start = root.resolve(scannedRoot);
            if (Files.isDirectory(start)) {
                scannedRoots++;
                collectHits(root, start, hits);
            }
        }
        hits.sort(Comparator.naturalOrder());
        if (scannedRoots == 0) {
            fail("No scanned source root found under " + root + " — the walk started in the wrong "
                    + "directory, so this guard checked nothing.");
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
    private static void collectHits(Path root, Path start, List<String> hits) {
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
                        scanFile(root, file, hits);
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

    /** Records {@code relative/path:line: <trimmed line>} for each offending line of one file. */
    private static void scanFile(Path root, Path file, List<String> hits) {
        List<String> lines;
        try {
            lines = Files.readAllLines(file, StandardCharsets.UTF_8);
        } catch (IOException e) {
            // Unreadable, undecodable or vanished: skip the file instead of failing the guard.
            return;
        }
        for (int index = 0; index < lines.size(); index++) {
            String line = lines.get(index).trim();
            if (containsForbiddenId(line)) {
                String relativePath = root.relativize(file).toString().replace('\\', '/');
                hits.add(relativePath + ":" + (index + 1) + ": " + line);
            }
        }
    }

    private static boolean containsForbiddenId(String line) {
        for (Pattern pattern : FORBIDDEN_PATTERNS) {
            if (pattern.matcher(line).find()) {
                return true;
            }
        }
        return false;
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
