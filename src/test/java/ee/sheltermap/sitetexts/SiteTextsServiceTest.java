package ee.sheltermap.sitetexts;

import ee.sheltermap.domain.SiteText;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link SiteTextsService} (site_texts): the closed
 * allowlist (unknown key/locale refused, the set itself pinned against
 * the frontend's list), the value cap, the URL rules (link keys only,
 * https only, en row only), blank = delete, last-wins dedupe and the
 * batch cap. A plain in-memory fake stands in for the seam.
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
}
