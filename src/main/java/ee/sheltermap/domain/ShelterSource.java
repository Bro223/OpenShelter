package ee.sheltermap.domain;

/**
 * Where a shelter record came from. The importer only touches
 * {@code PAASETEAMET}/{@code MUNICIPALITY} rows; {@code USER} rows are
 * sacred and never modified by ingestion.
 */
public enum ShelterSource {
    PAASETEAMET,
    MUNICIPALITY,
    USER
}
