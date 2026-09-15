package ee.sheltermap.ingestion;

import java.util.List;

/**
 * The outcome of one {@link ShelterRegistryClient#fetch()}: the raw rows
 * plus, when the source publishes one, the upstream data version (HTTP
 * Last-Modified / ETag) for the fetched snapshot.
 *
 * @param rows        the raw registry rows (not yet validated/mapped)
 * @param dataVersion the upstream version stamp, or null (WFS-era sources)
 * @param notModified true when the upstream answered 304 to
 *                    {@code If-Modified-Since} — the local copy already is
 *                    the latest and NO import apply must run (in particular
 *                    no delist over an empty set)
 */
public record RegistryFetch(List<RegistryShelterDto> rows, String dataVersion,
                            boolean notModified) {

    /** A fetch from a source that publishes no version stamp. */
    public static RegistryFetch of(List<RegistryShelterDto> rows) {
        return new RegistryFetch(rows, null, false);
    }
}
