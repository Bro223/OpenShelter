# Design: shelter-provenance-taxonomy (M6)

## D1 — Derivation is server-side and read-time

`Provenance.of(source, reviewStatus, status, nonexistentReports)` is a
pure function on the domain. It runs once per row in the batched
projection (`ShelterQueryService.toDto` / `toAdminDto`) and the value
rides on the DTO. The FE never re-derives it — the old client-side
`provenanceLabel` (source + reviewStatus branching) is deleted.

**Precedence (first match wins), and why:**

| Order | Value | Rule | Rationale |
|---|---|---|---|
| 1 | `REJECTED` | `review_status = REJECTED` | The admin's REJECT is the most specific statement about the row; it wins even when the row also accumulated 5 reports. |
| 2 | `REPORTED_INACTIVE` | `status = INACTIVE` AND `nonexistentReports ≥ AUTO_HIDE_THRESHOLD` | A reported-away row is reported-away — even an official one. The count threshold is the auto-hide fact (5), so the value means "the community reported it away". |
| 3 | `OFFICIAL` | `source = PAASETEAMET` | Registry-imported rows (the open-data CSV). |
| 4 | `PARTNER_VERIFIED` | `source = MUNICIPALITY` | Partner-fed rows. |
| 5 | `UNDER_REVIEW` | `review_status = NEW` (only USER rows are ever NEW) | A community row the trust lifecycle has not confirmed yet. |
| 6 | `COMMUNITY_REPORTED` | everything else | Confirmed community rows (and pre-V7 legacy USER rows). |

**Documented fall-through:** an admin-hidden row WITHOUT the report
count (a direct admin hide of an ACTIVE row, `nonexistentReports < 5`)
is not REJECTED (that state is the admin *review* REJECT) and not
REPORTED_INACTIVE (no report accumulation) — it falls through to its
source-based value. The taxonomy deliberately has no "admin-hidden"
value; the row is hidden from the public map either way and keeps its
source identity on /mine and the admin list, where the `status` column
already shows INACTIVE.

**Reachability:** the public list is ACTIVE-only (D5), so
`REPORTED_INACTIVE` and `REJECTED` never occur there. They ride on the
detail read (by id, any status), `/mine` (all statuses) and the admin
list (all statuses) — exactly the surfaces that keep hidden rows.

## D2 — `AUTO_HIDE_THRESHOLD` is a domain fact

The 4→5 auto-hide trigger lives in `app.ShelterReportService`, but the
provenance derivation (domain) needs the same constant. The dependency
rule (`api`/`auth`/`ingestion` → `app` → `domain`) forbids the reverse
edge, so the constant moves to `domain.ShelterReport.AUTO_HIDE_THRESHOLD`
and the service references it. One number, one owner.

## D3 — The filter is a provenance filter, replacing the source chips

Provenance strictly subdivides source:

```
REGISTRY = OFFICIAL ∪ PARTNER_VERIFIED
USER     = COMMUNITY_REPORTED ∪ UNDER_REVIEW
```

Keeping both filter rows would offer combinations that filter to empty
by construction (source=REGISTRY × provenance=COMMUNITY_REPORTED). So
the map's three source chips become five provenance chips — All /
Official / Partner / Community / New community — the four values
reachable in the ACTIVE-only public list (the hidden two have no chip;
they would always filter to empty).

The `?provenance=` param is applied **in-memory over the projected
list**, the same precedent as the trust filters (Estonia-scale data;
the derivations are computed there anyway — no new SQL surface). It
composes with `?source=` (still supported server-side for compat) and
with the trust filters. An invalid value is a 400 via Spring enum
binding (same behaviour as `?source=`).

The gateway's `list()` signature changes from `list(source)` to
`list(provenance)`; `ALL` omits the param entirely, so the default call
is `/api/shelters` — the same rows the M4 default `?source=ALL` served.

## D4 — Marker palette (the roadmap's "coloured markers")

The existing palette (blue registry / amber new / green confirmed /
orange reported) is kept; M6 adds the partner yellow and the two hidden
tones, so the legend's vocabulary matches the taxonomy:

| Provenance | Marker class | Light token | Dark token |
|---|---|---|---|
| OFFICIAL | `--registry` (kept) | `#0b5cad` | `#7db8f0` |
| PARTNER_VERIFIED | `--partner` (new) | `#d4a017` | `#ffe066` |
| COMMUNITY_REPORTED | `--user` (kept) | `#2e7d32` | `#7ac98a` |
| UNDER_REVIEW | `--new` (kept) | `#f59f00` | `#ffd43b` |
| (reported state, ACTIVE rows) | `--reported` (kept) | `#c2410c` | `#ffa94d` |
| REPORTED_INACTIVE | `--inactive` (new) | `#6b7280` | `#9aa5b1` |
| REJECTED | `--rejected` (new) | `#c92a2a` | `#ff8787` |

- The **reported-state orange still wins** over the provenance colour
  (shelter-trust-and-reports D1 — one "reported" affordance).
- Grey/red **never reach the public map** (ACTIVE-only list); the detail
  page's static pin can render them for a hidden row.
- The badge mirrors the palette: `badge--new` (amber), `badge--user`
  (green), `badge--rejected` (danger) exist; `badge--inactive` (new)
  reuses the neutral occupancy/private language — a factual state, not
  an alarm.

## D5 — Label copy

The four visible values keep their established copy (spec-pinned):
OFFICIAL = "Paasteamet registry", PARTNER_VERIFIED = "Municipal
registry", COMMUNITY_REPORTED = "Community-checked", UNDER_REVIEW =
"Newly added". The two hidden values get their own: "Reported
inactive" / "Rejected". Single-sourced in `provenanceText`.
