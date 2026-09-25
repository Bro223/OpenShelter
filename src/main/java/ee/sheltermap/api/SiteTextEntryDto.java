package ee.sheltermap.api;

/**
 * One stored override in the GET /api/site-texts body: the plain text
 * value and, for the two footer source-link keys, the https URL (null =
 * the frontend falls back to the shipped default URL).
 *
 * @param value the stored override text — a key absent from the response
 *              means no row, and the frontend falls back to the shipped
 *              catalog default
 * @param url   https only (stored on the en row); null for non-link keys
 *              and when the admin has no stored link (or cleared it) — the
 *              frontend then uses the shipped default URL
 */
public record SiteTextEntryDto(String value, String url) {
}
