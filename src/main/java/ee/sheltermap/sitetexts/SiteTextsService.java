package ee.sheltermap.sitetexts;

import ee.sheltermap.domain.SiteText;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The site texts service (site_texts): the admin-editable
 * popup/header/footer copy. The read is the whole (tiny) table grouped
 * as locale → key → entry. The write validates the whole batch against
 * the closed allowlist before touching the table (all-or-nothing — one
 * bad entry refuses the whole PUT), then applies upserts and deletes:
 *
 * <ul>
 *   <li>an unknown key → 400 (the admin edits VALUES, never invents
 *       keys); an unknown locale → 400 (the site serves en/et/ru only);</li>
 *   <li>a value over {@link SiteTextKeys#VALUE_MAX} → 400;</li>
 *   <li>a URL on a non-link key, a non-https URL, or a URL on a
 *       non-{@code en} row → 400 (the V27 CHECK is the backstop);</li>
 *   <li>a blank value → the row is deleted (the shipped catalog
 *       default stands — there is no stored "empty" text);</li>
 *   <li>a blank URL on a link key → the URL is cleared (the shipped
 *       default URL stands); an absent URL leaves the stored one
 *       alone;</li>
 *   <li>duplicate (key, locale) entries in one batch → last wins (the
 *       admin UI never sends them; the server must not crash).</li>
 * </ul>
 */
@Service
public class SiteTextsService {

    private final SiteTextRepository texts;

    public SiteTextsService(SiteTextRepository texts) {
        this.texts = Objects.requireNonNull(texts, "texts");
    }

    /** The current overrides grouped as locale → key → entry. The three
        locale keys are always present (an empty map = "all defaults"). */
    @Transactional(readOnly = true)
    public Map<String, Map<String, SiteText>> getAll() {
        Map<String, Map<String, SiteText>> byLocale = new LinkedHashMap<>();
        for (String locale : SiteTextKeys.LOCALES) {
            byLocale.put(locale, new LinkedHashMap<>());
        }
        for (SiteText text : texts.findAll()) {
            byLocale.get(text.getLocale()).put(text.getKey(), text);
        }
        return byLocale;
    }

    /** Validates the batch (a violation → {@link SiteTextValidationException},
        mapped to a uniform 400 by the admin controller) and applies it:
        upserts the non-blank values, deletes the rows behind blank ones,
        and sets/clears the link URLs (stored on the {@code en} row). */
    @Transactional
    public void update(List<SiteTextEntry> entries) {
        if (entries == null || entries.isEmpty()) {
            return; // nothing to do (the admin UI sends only changed fields)
        }
        if (entries.size() > SiteTextKeys.MAX_ENTRIES_PER_REQUEST) {
            throw new SiteTextValidationException(
                    "Too many entries in one request (max "
                            + SiteTextKeys.MAX_ENTRIES_PER_REQUEST + ").");
        }

        // One pass per (key, locale): last wins, so the apply loop below
        // sees each key exactly once, in first-seen order.
        Map<String, SiteTextEntry> effective = new LinkedHashMap<>();
        for (SiteTextEntry entry : entries) {
            validate(entry);
            effective.put(entry.key() + "::" + entry.locale(), entry);
        }
        for (SiteTextEntry entry : effective.values()) {
            apply(entry);
        }
    }

    /** One entry against the closed rules; a violation refuses the whole
        batch (the message is shown to the admin verbatim). */
    private void validate(SiteTextEntry entry) {
        String key = entry.key();
        String locale = entry.locale();
        if (!SiteTextKeys.isKey(key)) {
            throw new SiteTextValidationException(
                    "Key is not in the allowlist: " + key);
        }
        if (!SiteTextKeys.isLocale(locale)) {
            throw new SiteTextValidationException(
                    "Unknown locale: " + locale + " (the site serves en, et, ru).");
        }
        String value = entry.value();
        if (value != null && value.length() > SiteTextKeys.VALUE_MAX) {
            throw new SiteTextValidationException(
                    "Value for " + key + " is longer than "
                            + SiteTextKeys.VALUE_MAX + " characters.");
        }
        String url = entry.url();
        if (url != null && !SiteTextKeys.isLink(key)) {
            throw new SiteTextValidationException(
                    "Only the link keys may carry a URL: " + key);
        }
        if (url != null && !url.isBlank() && !url.startsWith("https://")) {
            throw new SiteTextValidationException(
                    "URL for " + key + " must start with https://");
        }
        if (url != null && !"en".equals(locale)) {
            throw new SiteTextValidationException(
                    "The URL for " + key + " is stored on the en row; "
                            + "send it with locale \"en\".");
        }
    }

    /** Applies one effective entry: a blank value resets the (key,
        locale) to the shipped default (the row is deleted), otherwise
        the row is upserted with the URL resolved. */
    private void apply(SiteTextEntry entry) {
        String key = entry.key();
        String locale = entry.locale();
        String value = entry.value() == null ? "" : entry.value().trim();
        SiteText existing = texts.findByKeyAndLocale(key, locale).orElse(null);
        if (value.isEmpty()) {
            // Blank = reset to the shipped default (delete the row).
            if (existing != null) {
                texts.delete(existing.getId());
            }
            return;
        }
        String url = existing == null ? null : existing.getUrl();
        if (entry.url() != null) {
            // Explicit: '' clears to the shipped default, https sets.
            url = entry.url().isBlank() ? null : entry.url();
        }
        SiteText toSave = existing != null
                ? existing
                : new SiteText(key, locale, value, url);
        toSave.setValue(value);
        toSave.setUrl(url);
        texts.save(toSave);
    }
}
