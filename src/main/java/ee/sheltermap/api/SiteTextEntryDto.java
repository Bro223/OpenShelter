package ee.sheltermap.api;

/**
 * One stored override in the GET /api/site-texts body: the plain text
 * value and, for the two footer source-link keys, the https URL (null =
 * the frontend falls back to the shipped default URL).
 *
 * @param value the admin's text (or the shipped default when no row exists)
 * @param url   https only; null for non-link keys and when the stored URL
 *              is the shipped default
 */
public record SiteTextEntryDto(String value, String url) {
}
