-- Shelter Map — V2 (registry ingestion enrichment).
-- All fields published by the Maa-amet WFS shelter layer (VARJEKOHT) are
-- stored locally so the app owns the full dataset; the public API exposes
-- only the lean projection (ShelterDto). USER submissions leave these NULL.
-- ddl-auto=validate must stay green against these definitions.

ALTER TABLE shelters
    ADD COLUMN address             VARCHAR(512),
    ADD COLUMN county              VARCHAR(255),   -- MK (maakond)
    ADD COLUMN municipality        VARCHAR(255),   -- OV (omavalitsus)
    ADD COLUMN data_as_of          VARCHAR(32),    -- ANDMESEIS (registry data date, e.g. 02.07.2026)
    ADD COLUMN source_attribution  VARCHAR(255);   -- ALLIKAS (e.g. SMIT. Päästeameti avaandmed)

CREATE INDEX idx_shelters_county ON shelters (county);
