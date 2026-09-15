# Tasks — shelter-provenance-taxonomy (M6)

## Slice 1 — Backend: the derived value + filter (this pass)

- [x] `domain/Provenance.java` — the six-value taxonomy +
      `Provenance.of(source, reviewStatus, status, nonexistentReports)`
      with the documented precedence (REJECTED > REPORTED_INACTIVE >
      OFFICIAL > PARTNER_VERIFIED > UNDER_REVIEW > COMMUNITY_REPORTED)
- [x] `AUTO_HIDE_THRESHOLD` moved to `domain.ShelterReport` (a domain
      fact); `ShelterReportService` references it
- [x] `ShelterDto.provenance` + `AdminShelterDto.provenance` (additive,
      computed in the batched projection — no N+1)
- [x] `GET /api/shelters?provenance=` — optional param, in-memory over
      the projected list (trust-filter precedent), composes with
      `source` + trust filters; 400 on an invalid value
- [x] Tests — `ProvenanceTest` (13: the full decision table + the
      precedence edges), `ProvenanceApiIT` (8: all six values on
      public/detail//mine/admin, the four visible filters, the two
      hidden → empty, source×provenance composition, invalid → 400);
      `ShelterQueryServiceTest` call sites updated to the 5-arg
      `findAll`

## Slice 2 — Frontend: markers, legend, chips, badges (this pass)

- [x] `models.ts` — `Provenance` + `ProvenanceFilter` types,
      `ShelterDto.provenance` + `AdminShelterDto.provenance`; the
      `ShelterSourceFilter` type is gone (the FE no longer sends
      `?source=`)
- [x] `shelter-copy.ts` — `provenanceText` (the pinned six labels) +
      `provenanceBadgeClass` replace `provenanceLabel` /
      `communityBadgeClass` / `communityTrustLabel` (deleted)
- [x] `leaflet-service.ts` — `markerTone` reads `provenance` (+ the
      reported-state override kept); new tones `--partner` /
      `--inactive` / `--rejected`; `showShelter` input is provenance-based
- [x] `styles.scss` — three new marker tokens (light + dark) + marker
      classes; the registry/user tokens keep their names
- [x] `shelter-gateway.ts` — `list(provenance, trust?)`, `ALL` omits
      the param (default call `/api/shelters`)
- [x] `map-page` — provenance chips replace the source chips (All /
      Official / Partner / Community / New community), the five-entry
      legend, the row badge from `shelter.provenance`
- [x] `shelter-detail-page` — header badge + unverified-warning
      condition read the provenance; the static pin is provenance-toned
      (grey/red for hidden rows)
- [x] `contributions-panel` (/mine) + `admin-page` — badges from the
      DTO field; `badge--inactive` muted tone in all three surfaces'
      scss
- [x] Tests — `shelter-copy.spec` (the six pinned labels + the badge
      tones), `leaflet-service.spec` (palette incl. the new hidden
      tones), `shelter-gateway.spec` (the provenance query-string
      table), `map-page.spec` (chips/legend/composition reworked),
      detail/contributions/account/submit/admin fixtures carry the new
      field, the /mine badge test covers all six values
- [x] Gates green: BE `mvn -q test` (full), FE `ng test` 802/802 (41
      files), `tsc --noEmit` clean (app + spec)
