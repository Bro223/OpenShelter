-- Shelter Map — V23.1 (viewport filter on the public shelter list).
-- Composite B-tree on (latitude, longitude) backing the optional
-- minLat/minLng/maxLat/maxLng bbox predicate of GET /api/shelters
-- (shelter-bbox-paging D3).
--
-- Deliberately NOT PostGIS: at Estonia scale (a few hundred rows) a plain
-- B-tree plus a range predicate is enough, and keeping the deployment
-- single-database with no extensions is worth more than the query-time
-- difference. At a much larger scale this index is replaced by a GIST
-- index (PostGIS) or a geohash/quadtree column — the predicate shape,
-- not the index, is the contract.
--
-- Version note: a dotted V23.1 (Flyway-native) on purpose — it applies
-- after V23, and the README range guard (DocumentationFactsTest) tracks
-- integer V<N> versions; the README's "V1–V23" range stays true until
-- the docs sync that owns README.md bumps it.
--
-- Index-only: no column change, so ddl-auto=validate is unaffected.

CREATE INDEX idx_shelters_latitude_longitude ON shelters (
    latitude,
    longitude
);
