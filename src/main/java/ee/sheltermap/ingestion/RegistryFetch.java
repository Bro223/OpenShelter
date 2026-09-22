package ee.sheltermap.ingestion;

import java.util.List;

/**
 * The outcome of one {@link ShelterRegistryClient#fetch()}: the raw rows
 * plus, when the source publishes one, the upstream data version (HTTP
 * Last-Modified / ETag) for the fetched snapshot.
 *
 * @param rows        the raw registry rows that could be placed (not yet
 *                    validated/mapped)
 * @param dataVersion the upstream version stamp, or null (WFS-era sources)
 * @param notModified true when the upstream answered 304 to
 *                    {@code If-Modified-Since} — the local copy already is
 *                    the latest and NO import apply must run (in particular
 *                    no delist over an empty set)
 * @param rejectedExternalIds the externalIds of rows the client REFUSED to
 *                    place (unresolvable axis order, non-finite transform, or
 *                    outside the Estonia bbox). The import counts them as
 *                    skipped and keeps them (never delists them) — a row the
 *                    client could not place this run must not be deleted for
 *                    it. Empty when the client rejects nothing.
 */
public record RegistryFetch(List<RegistryShelterDto> rows, String dataVersion,
                            boolean notModified, List<String> rejectedExternalIds) {

    /** A fetch from a source that publishes no version stamp and rejects no rows. */
    public static RegistryFetch of(List<RegistryShelterDto> rows) {
        return new RegistryFetch(rows, null, false, List.of());
    }
}
