package ee.sheltermap.sitetexts;

import ee.sheltermap.domain.SiteText;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link SiteTextsService} (site_texts): the closed
 * allowlist (unknown key/locale refused, the set itself pinned against
 * the frontend's list — names included), the value cap, the URL rules
 * (link keys only, https only, en row only), blank = delete, last-wins
 * dedupe and the batch cap. A plain in-memory fake stands in for the seam.
 */
class SiteTextsServiceTest {

    /** The in-memory seam fake: a (key, locale) → row map, id sequence. */
    static final class FakeSiteTextRepository implements SiteTextRepository {
        private final Map<String, SiteText> rows = new java.util.LinkedHashMap<>();
        private long nextId = 1;

        @Override
        public List<SiteText> findAll() {
            return new ArrayList<>(rows.values());
        }

        @Override
        public Optional<SiteText> findByKeyAndLocale(String key, String locale) {
            return Optional.ofNullable(rows.get(key + "::" + locale));
        }

        @Override
        public SiteText save(SiteText text) {
            SiteText stored = text.getId() != null
                    ? rows.get(text.getKey() + "::" + text.getLocale())
                    : null;
            if (stored == null) {
                stored = new SiteText(text.getKey(), text.getLocale(),
                        text.getValue(), text.getUrl());
                stored.setId(nextId++);
                rows.put(stored.getKey() + "::" + stored.getLocale(), stored);
            } else {
                stored.setValue(text.getValue());
                stored.setUrl(text.getUrl());
            }
            return stored;
        }

        @Override
        public void delete(long id) {
            rows.values().removeIf(t -> t.getId() == id);
        }
    }

    private FakeSiteTextRepository repo;
    private SiteTextsService service;

    @BeforeEach
    void setUp() {
        repo = new FakeSiteTextRepository();
        service = new SiteTextsService(repo);
    }

    /* --- the allowlist is a closed set (the lockstep pin) ------------------ */

    @Test
    void theAllowlistIsTheFrontendSet() {
        // 10 popup + 9 header + 12 footer = 31 keys.
        assertThat(SiteTextKeys.POPUP_KEYS).hasSize(10);
        assertThat(SiteTextKeys.HEADER_KEYS).hasSize(9);
        assertThat(SiteTextKeys.FOOTER_KEYS).hasSize(12);
        assertThat(SiteTextKeys.KEYS).hasSize(31);
        assertThat(SiteTextKeys.LINK_KEYS).containsExactlyInAnyOrder(
                "footer.rescueBoard", "footer.ministry");
        assertThat(SiteTextKeys.LOCALES).containsExactlyInAnyOrder("en", "et", "ru");
        // The link keys are footer members; every key is a dotted catalog key.
        assertThat(SiteTextKeys.LINK_KEYS)
                .allSatisfy(key -> assertThat(SiteTextKeys.FOOTER_KEYS).contains(key));
        assertThat(SiteTextKeys.KEYS)
                .allMatch(key -> key.matches("[a-zA-Z][a-zA-Z0-9]*(\\.[a-zA-Z0-9]+)+"));

        // The key NAMES are the frontend's, block for block: a key added
        // or renamed on one side and not the other fails the build here.
        String frontend = readFrontendAllowlist();
        assertThat(SiteTextKeys.POPUP_KEYS).containsExactlyInAnyOrderElementsOf(
                keysOf(frontend, "SITE_TEXT_POPUP_KEYS"));
        assertThat(SiteTextKeys.HEADER_KEYS).containsExactlyInAnyOrderElementsOf(
                keysOf(frontend, "SITE_TEXT_HEADER_KEYS"));
        assertThat(SiteTextKeys.FOOTER_KEYS).containsExactlyInAnyOrderElementsOf(
                keysOf(frontend, "SITE_TEXT_FOOTER_KEYS"));
        assertThat(SiteTextKeys.LINK_KEYS).containsExactlyInAnyOrderElementsOf(
                keysOf(frontend, "SITE_TEXT_LINK_KEYS"));
        // The union of the three blocks is the whole allowlist.
        assertThat(SiteTextKeys.KEYS).containsExactlyInAnyOrderElementsOf(union(
                keysOf(frontend, "SITE_TEXT_POPUP_KEYS"),
                keysOf(frontend, "SITE_TEXT_HEADER_KEYS"),
                keysOf(frontend, "SITE_TEXT_FOOTER_KEYS")));
    }

    @Test
    void anUnknownKeyRefusesTheBatch() {
        assertThatThrownBy(() -> service.update(List.of(
                new SiteTextEntry("evil.key", "en", "x", null))))
                .isInstanceOf(SiteTextValidationException.class)
                .hasMessageContaining("evil.key");
    }

    @Test
    void anUnknownLocaleRefusesTheBatch() {
        assertThatThrownBy(() -> service.update(List.of(
                new SiteTextEntry("a11y.button", "fr", "x", null))))
                .isInstanceOf(SiteTextValidationException.class)
                .hasMessageContaining("fr");
    }

    /* --- the value rules --------------------------------------------------- */

    @Test
    void aValueOverTheCapRefusesTheBatch() {
        String tooLong = "a".repeat(SiteTextKeys.VALUE_MAX + 1);
        assertThatThrownBy(() -> service.update(List.of(
                new SiteTextEntry("a11y.button", "en", tooLong, null))))
                .isInstanceOf(SiteTextValidationException.class)
                .hasMessageContaining(String.valueOf(SiteTextKeys.VALUE_MAX));
    }

    @Test
    void theCapBoundaryValueIsAccepted() {
        service.update(List.of(new SiteTextEntry(
                "a11y.button", "en", "a".repeat(SiteTextKeys.VALUE_MAX), null)));
        assertThat(repo.findByKeyAndLocale("a11y.button", "en").orElseThrow().getValue())
                .hasSize(SiteTextKeys.VALUE_MAX);
    }

    /* --- the URL rules (label + https pair, en row only) ------------------- */

    @Test
    void aUrlOnANonLinkKeyRefusesTheBatch() {
        assertThatThrownBy(() -> service.update(List.of(
                new SiteTextEntry("a11y.button", "en", "x", "https://example.ee"))))
                .isInstanceOf(SiteTextValidationException.class)
                .hasMessageContaining("link keys");
    }

    @Test
    void aNonHttpsUrlRefusesTheBatch() {
        assertThatThrownBy(() -> service.update(List.of(
                new SiteTextEntry("footer.rescueBoard", "en", "x", "http://insecure.ee"))))
                .isInstanceOf(SiteTextValidationException.class)
                .hasMessageContaining("https://");
    }

    @Test
    void aUrlOnANonEnRowRefusesTheBatch() {
        assertThatThrownBy(() -> service.update(List.of(
                new SiteTextEntry("footer.ministry", "et", "x", "https://example.ee"))))
                .isInstanceOf(SiteTextValidationException.class)
                .hasMessageContaining("en");
    }

    @Test
    void aBlankUrlOnALinkKeyClearsTheStoredUrl() {
        service.update(List.of(new SiteTextEntry(
                "footer.rescueBoard", "en", "Rescue", "https://one.ee")));
        service.update(List.of(new SiteTextEntry(
                "footer.rescueBoard", "en", "Rescue", "")));
        SiteText stored = repo.findByKeyAndLocale("footer.rescueBoard", "en").orElseThrow();
        assertThat(stored.getUrl()).isNull();
        assertThat(stored.getValue()).isEqualTo("Rescue");
    }

    @Test
    void anAbsentUrlLeavesTheStoredUrlAlone() {
        service.update(List.of(new SiteTextEntry(
                "footer.ministry", "en", "Ministry", "https://two.ee")));
        // A later value-only edit (url absent) must not drop the URL.
        service.update(List.of(new SiteTextEntry(
                "footer.ministry", "en", "Ministry of the Interior", null)));
        SiteText stored = repo.findByKeyAndLocale("footer.ministry", "en").orElseThrow();
        assertThat(stored.getUrl()).isEqualTo("https://two.ee");
        assertThat(stored.getValue()).isEqualTo("Ministry of the Interior");
    }

    /* --- blank value = delete; upsert; dedupe; batch cap -------------------- */

    @Test
    void aBlankValueDeletesTheRow() {
        service.update(List.of(new SiteTextEntry("a11y.button", "en", "Access", null)));
        assertThat(repo.findByKeyAndLocale("a11y.button", "en")).isPresent();
        service.update(List.of(new SiteTextEntry("a11y.button", "en", "   ", null)));
        assertThat(repo.findByKeyAndLocale("a11y.button", "en")).isEmpty();
        // A second reset is a no-op (no crash on a missing row).
        service.update(List.of(new SiteTextEntry("a11y.button", "en", "", null)));
        assertThat(repo.findByKeyAndLocale("a11y.button", "en")).isEmpty();
    }

    @Test
    void duplicateEntriesInOneBatchAreLastWins() {
        service.update(List.of(
                new SiteTextEntry("a11y.button", "en", "first", null),
                new SiteTextEntry("a11y.button", "en", "second", null)));
        assertThat(repo.findByKeyAndLocale("a11y.button", "en").orElseThrow().getValue())
                .isEqualTo("second");
    }

    @Test
    void anOverCapBatchRefusesTheBatch() {
        List<SiteTextEntry> entries = new ArrayList<>();
        for (int i = 0; i <= SiteTextKeys.MAX_ENTRIES_PER_REQUEST; i++) {
            entries.add(new SiteTextEntry("a11y.button", "en", "x" + i, null));
        }
        assertThatThrownBy(() -> service.update(entries))
                .isInstanceOf(SiteTextValidationException.class)
                .hasMessageContaining("Too many entries");
    }

    @Test
    void theReadGroupsByLocaleWithAllThreeKeysAlwaysPresent() {
        service.update(List.of(
                new SiteTextEntry("a11y.button", "et", "Kättesaadavus", null),
                new SiteTextEntry("nav.map", "ru", "Карта", null)));
        Map<String, Map<String, SiteText>> all = service.getAll();
        assertThat(all.keySet()).containsExactlyInAnyOrder("en", "et", "ru");
        assertThat(all.get("en")).isEmpty();
        assertThat(all.get("et").get("a11y.button").getValue()).isEqualTo("Kättesaadavus");
        assertThat(all.get("ru").get("nav.map").getValue()).isEqualTo("Карта");
    }

    @Test
    void anEmptyOrAbsentBatchIsANoOp() {
        service.update(List.of());
        service.update(null);
        assertThat(service.getAll().values())
                .allSatisfy(map -> assertThat(map).isEmpty());
    }

    /* --- the frontend-file pin's file access -------------------------------- */

    /** The frontend's allowlist (the server-side twin's source of truth
        for the key names). */
    private static String readFrontendAllowlist() {
        Path file = repoRoot().resolve("frontend/src/app/core/i18n/site-texts.ts");
        try {
            return Files.readString(file, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new AssertionError(
                    "Cannot read the frontend allowlist " + file
                            + " — the lockstep pin cannot run", e);
        }
    }

    /** The repo root — the test walks up from the working directory to
        the pom.xml (the same idiom as the vocabulary guard, so it also
        works from an IDE run). */
    private static Path repoRoot() {
        Path workingDirectory = Path.of("").toAbsolutePath();
        for (Path candidate = workingDirectory; candidate != null; candidate = candidate.getParent()) {
            if (Files.isRegularFile(candidate.resolve("pom.xml"))) {
                return candidate;
            }
        }
        throw new AssertionError("No pom.xml found above " + workingDirectory
                + " — the pin must run from inside the repo (the Maven build does)");
    }

    /** The key literals of one {@code as const} array in the frontend
        file. A loud failure when the shape changes: a guard that cannot
        find its array must not pass. */
    private static List<String> keysOf(String source, String constantName) {
        int start = source.indexOf(constantName + ": readonly SiteTextKey[] = [");
        if (start < 0) {
            throw new AssertionError("Frontend allowlist array not found: " + constantName);
        }
        int open = source.indexOf('[', start) + 1;
        int close = source.indexOf("] as const;", open);
        if (close < 0) {
            throw new AssertionError("Frontend allowlist array not closed: " + constantName);
        }
        List<String> keys = new ArrayList<>();
        Matcher match = Pattern.compile("'([^']+)'").matcher(source.substring(open, close));
        while (match.find()) {
            keys.add(match.group(1));
        }
        if (keys.isEmpty()) {
            throw new AssertionError("No keys extracted from " + constantName);
        }
        return keys;
    }

    private static List<String> union(List<String> popup, List<String> header,
                                      List<String> footer) {
        List<String> all = new ArrayList<>(popup);
        all.addAll(header);
        all.addAll(footer);
        return all;
    }
}
