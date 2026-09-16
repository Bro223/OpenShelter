# Design — official-dataset-csv (M5)

## Source facts (supervisor addendum, live-verified 2026-09-12)

- Old WFS base URL 404s for EVERY request shape (GetFeature 1.0/1.1/2.0,
  DescribeFeatureType, bare root); GetCapabilities is 403. Maa-amet's own
  layer description lists services "Ei ole saadaval". The WFS code stays
  (alternate via `app.registry.client=paasteamet`) but is no longer the
  default.
- CSV: `https://opendata.smit.ee/gis/varjumiskohad.csv` — HTTP 200,
  `application/octet-stream`, 304 lines (header + 303 rows), semicolon
  separated, every field double-quoted, header
  `id;nimi;aadress;lest_x;lest_y`. 303 unique ids (e.g. `PÕ81166`) →
  stable external key. `aadress` = 3–4 comma segments
  (`<maakond>, <vald/linn>[, <asula>, <aadress>]`) — 16 distinct first
  segments. Coordinates L-EST97 / EPSG:3301, 0 non-numeric in the live
  file. Served as UTF-8 with no charset parameter.

## Decisions

1. **Bulk download instead of paging.** One GET per run; the WFS
   runaway/page guards do not apply (a single 303-row file). The
   politeness delay, transient-only retry (network + 5xx) and
   deterministic-4xx-no-retry rules carry over unchanged.
2. **Version = HTTP Last-Modified, fallback ETag.** The dataset has no
   version column. The raw `Last-Modified` HTTP-date string is the
   `source_version` in `data_imports`; its UTC day (`yyyy-MM-dd`) stamps
   each row's `dataAsOf`. An ETag stamp is stored but NOT sent back
   (If-Modified-Since needs a date) — worst case one extra full
   re-import per change, which the upsert dedupes.
3. **304 = no apply, not a failure.** `If-Modified-Since` carries the
   previous run's stamp (from `data_imports`). On 304 the service applies
   NOTHING — crucially no delist over an empty set — and records a
   `NOT_MODIFIED` row.
4. **County/municipality from `aadress`.** Segment 1 = county, segment 2
   = municipality (the WFS MK/OV attributes have no CSV equivalent — the
   addendum marks the MK/OV question moot). One-segment addresses yield
   county only; the parser drops rows with a blank id/nimi/aadress or a
   non-finite coordinate (counted, never fatal).
5. **UTF-8 decoded explicitly.** The file is served as
   application/octet-stream (no charset) — a String body would decode as
   ISO-8859-1 and mangle the Estonian diacritics (Õ, Ä, Ö), so the client
   fetches bytes and decodes UTF-8.
6. **Audit row on every outcome.** OK / FAILED / NOT_MODIFIED / SKIPPED —
   the row is what the UI's "last import" reads and what the next run's
   If-Modified-Since comes from. The write is best-effort (a failing
   audit must never break the import) and the `error_message` is
   truncated to the 1000-char column.
7. **Public provenance endpoint.** `GET /api/data-source` is permitAll
   (the footer renders for anonymous visitors, like the shelter list).
   `sourceName` is the publisher constant; `officialUrl` comes from
   `app.registry.official-url`.

## Open items

- **O1 (licence wording — blocked).** The explainer PDF
  (`varjumiskohtade-avaandmete-seletuskiri-2026vaelisveebiversioon.pdf`)
  is FlateDecode-compressed; its licence/attribution terms are unreadable.
  DO NOT assert licence terms anywhere. TODO: when the PDF is readable,
  review the wording for the footer link + privacy policy "official data"
  section (owner follow-up).
- **O2 (update cadence).** No version field upstream; the GPKG's
  Last-Modified (2026-09-06 at probe time) suggests occasional updates.
  The weekly Monday 03:00 cron (Europe/Tallinn) stays the sync cadence.
- **O3 (dataset scope).** The publisher page describes Päästeamet-
  registered public shelters "marked official"; whether adjacent
  structures are mixed in is unconfirmed — the addendum leaves it open.
