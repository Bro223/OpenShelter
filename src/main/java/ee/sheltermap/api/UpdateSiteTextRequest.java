package ee.sheltermap.api;

import ee.sheltermap.sitetexts.SiteTextEntry;

import java.util.List;

/**
 * The PUT /admin/site-texts body: the batch of (key, locale) edits the
 * admin Settings panel sends (only the CHANGED fields — the panel diffs
 * against the loaded overrides). An empty/absent batch is a no-op.
 *
 * @param texts the edits (key, locale, value, url?)
 */
public record UpdateSiteTextRequest(List<SiteTextEntry> texts) {
}
