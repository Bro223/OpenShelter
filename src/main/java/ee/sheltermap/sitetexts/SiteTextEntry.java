package ee.sheltermap.sitetexts;

/**
 * One site-text edit (site_texts): the (key, locale) pair, the new plain
 * text value (blank/null = reset to the shipped catalog default) and,
 * for the two link keys only, the URL — null = leave the stored URL
 * alone, {@code ""} = clear it (the shipped default URL stands),
 * otherwise an https URL (validated in {@link SiteTextsService}).
 */
public record SiteTextEntry(String key, String locale, String value, String url) {
}
