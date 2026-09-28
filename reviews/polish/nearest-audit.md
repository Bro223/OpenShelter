# NEAREST-AUDIT — every "nearest / proximity" claim, traced to its location source

Lane: NEAREST-AUDIT (working tree `polish-work` — **same commit as `feature/frontend`**
(both at `0232b1d`); no commits — the parent commits).

Mandate: the owner rejected the proposed "Nearest" badge (next-ux-proposal.md P1 part 3,
the point where the ux-implement lane stopped) with a **correctness** argument, quoted as
the north star for this audit:

> "nearest badge should not exist cause we are unable to tell if web page uses api or gps
> to detect location of user. so we can not be sure if we really are showing nearest to him
> or nearest to the ip he has. those can differ a lot"

The audit generalises his argument: every place the app tells a user something is
*nearest / closest / around them / near them* must be traced to how the location was
obtained, and judged on whether the claim is justified.

**This lane changed no source file.** No user-visible string, no translation value, no
identifier, no CSS class or DOM id, no behaviour — the only new file is this report.
(There was nothing safe to change; see §5.)

## 0. Input note

`reviews/polish/ux-implement.md` (the implementing lane's report) **does not exist** in
the tree and in no branch's history (checked `git log --all -- reviews/polish/ux-implement.md`
and the working tree). Its stopping point is reconstructed from the tree state instead:
the working tree is **clean at `0232b1d`** and **none** of next-ux-proposal.md §P1 landed —
no badge (no i18n key in any of the three catalogs, no `badge--nearest` class, no markup,
no spec assertion), no result-line restyle (`.nearest-line` is still `--text-sm`,
`map-page.scss:405-410`), no "View details" button in the result line
(the only `viewDetails` render is the pre-existing selected-row step,
`map-page.html:366-368`). The owner's quote above therefore stands in for the lane's own
words; nothing of the rejected proposal needs removing.

## 1. Scope and method

Searched all three catalogs (`en.ts` / `et.ts` / `ru.ts`), every template, every TS
comment and class, the shared copy modules, the backend (`src/main/java`), the seeded
guidance content, and the API/DTO surface for: `nearest`, `closest`, `around`, `near`,
`distance`, `lähim`/`ümbruses`/`sinust` (ET), `ближайш`/`рядом`/`до вас` (RU). Then traced
each hit's location source in code (no assumption): the shared geolocation mechanism
(`shared/geolocation.ts`), the map's `NearestView` + `AnchorView`, the detail page's
`distanceFromMe()`, the submit page's `location-capture-view.ts`, the gateways
(`shelter-gateway.ts`, `geocode-gateway.ts`, `geo-gateway.ts`), and the backend
(`ShelterController.java`, `ShelterService.java`, `ClientIps.java`, `pom.xml`).

## 2. How a location is ever obtained in this product (established once, with evidence)

| Source | Where | Consent? |
|---|---|---|
| **Browser geolocation** — `navigator.geolocation.getCurrentPosition`, high-accuracy, 10 s timeout, `maximumAge: 0` | the one shared mechanism, `frontend/src/app/shared/geolocation.ts:66-88`; consumers: the map CTA (`features/map/nearest-view.ts:109-124`), the detail page's "Distance from you" (`features/shelter/shelter-detail-page.ts:619-641`), the submit form's "Use my location" (`features/shelter/location-capture-view.ts:344-370`) | **Explicit, per click** — the browser's own permission prompt is the consent; refusing changes nothing (`en.ts:1060-1061` privacy p1 says exactly this) |
| **A typed address** — Nominatim geocoding of user-typed text | map fallback search (`features/map/anchor-view.ts:77-105`), submit address search | the user typed the address; no inference about the user |
| **Manually placed marker / pasted coordinates / map link** (submit form only) | `location-capture-view.ts` (map click, coordinate paste, `geo-gateway.ts:38-40` resolving a pasted link) | explicit user choice |
| **IP-derived guess** | **none.** The only IP use in the backend is `auth/ClientIps.java:1-9` — "Resolves the real client IP for rate-limit keys." No geo-IP library in `pom.xml` (grep: zero hits for geoip/maxmind/ip2location/ipstack). The frontend makes no location service call at all. The privacy policy's "We **never** infer your location from your IP address" (`en.ts:1067-1069`; ET `et.ts:1070-1072`; RU `ru.ts:1127-1129`) is **verified true** | n/a — it does not exist |
| **Server default / server-side nearest ranking** | **none.** `api/ShelterController.java:67-70` documents the deferral verbatim: "What STAYS deferred: nearest-shelter search — it is a ranking, not a filter, and remains client-side (the map ranks the loaded list; the 'around you' action adds no backend call by spec)." The list endpoint is a fetch-all (no paging, no bbox sent by the client — `gateways/shelter-gateway.ts:41-50`, "Estonia-scale fetch-all"), so the client-side superlative runs over **every** ACTIVE shelter row, not a viewport window | n/a — it does not exist |
| **No location at all** | anchor mode distances are measured from the searched address, never from the user | n/a |

The owner's specific fear — the app silently measuring "nearest to the IP" — **cannot
happen in this codebase**: there is no IP→location path anywhere. The one irreducible
uncertainty his argument points at (which fix the *browser* returned — GPS vs Wi-Fi vs
coarse — is invisible to the page) is addressed in §4, residual 1.

## 3. The claim ledger — every user-visible proximity claim, all three locales

For each: the EN string with `file:line` in the catalog, its ET/RU line, the rendered
surface, the location source actually used, and the verdict. (ET/RU text not re-quoted —
line refs only, per the no-translation-touch rule.)

| # | Claim (EN) | Catalog (EN / ET / RU) | Rendered at | Location actually used | Verdict |
|---|---|---|---|---|---|
| 1 | **"Show shelters around you"** (CTA button) | `en.ts:189` / `et.ts:195` / `ru.ts:201` | `features/map/map-page.html:128` (button 123-129) | `navigator.geolocation` on click → `nearest.findNearest()` (`nearest-view.ts:109`); camera flies to the **user's own fix** at zoom 14 (`nearest-view.ts:156`) | **Justified.** "around you" is deliberately not a superlative — the prior D6 decision (`openspec/changes/community-review-queue/design.md:65-71`) renamed "Nearest listed location" to "around you" for exactly this provenance reason, and "browser-geolocation only (verified: no IP geolocation anywhere in the codebase)" |
| 2 | Consent note: "Your browser asks first — your location is never sent to our servers and is used **only to find the nearest shelter**." | `en.ts:187-188` / `et.ts:193-194` / `ru.ts:199-200` | `map-page.html:134` (`.map-page__geo-note`) | Describes claim #1's consented fix; "never sent" verified — no API call in the flow carries coordinates | **Justified.** The word "nearest" here names the action's *purpose*, and the sentence attributes the position to the browser — the exact provenance framing the owner's argument asks for |
| 3 | Result line: **"Show shelters around you: *Name* · *address* · ≈ N km straight line"** | label = `map.aroundYou` (`en.ts:189`); distance format `en.ts:326-327` | `map-page.html:208-221` (`<p class="nearest-line" role="status">`) | The consented fix (`nearest-view.ts:117-121`); the superlative is Haversine-min over the **full fetch-all list** (`nearestShelterAt`, `nearest-view.ts:37-52`; full list per §2) | **Justified** — "nearest" (implicit in the named result) is the true minimum over all listed shelters, measured from the position the user consented to. Caveat: see §4 residual 2 (filter chip) |
| 4 | Empty state: **"No listed locations around you yet."** | `en.ts:198` / `et.ts:204` / `ru.ts:210` | `map-page.html:232-238` | Rendered only when the loaded list is empty (`nearest-view.ts:110-114`) — no fix is even requested in that case | **Justified (vacuously):** zero listed locations anywhere ⇒ none around the user; the "yet" + "add the first one" offer is the real content |
| 5 | Fallback label: **"Find shelters near an address"** | `en.ts:191` / `et.ts:197` / `ru.ts:203` | `map-page.html:141-143` | User-typed address → Nominatim (`anchor-view.ts:77-105`) | **Justified** — claims "near an address", never "near you"; the anchor line says "Searched address: *label*" (`en.ts:200` / `et.ts:206` / `ru.ts:212`, `map-page.html:245-249`) and per-row distances render only while an anchor is set, labeled from it (`map-page.html:327-331`) |
| 6 | Detail page: **"Distance from you"** (button) | `en.ts:233` / `et.ts:238` / `ru.ts:247` | `features/shelter/shelter-detail-page.html:103-110` (button), pending state `en.ts:234` | `distanceFromMe()` → the same shared high-accuracy geolocation on click (`shelter-detail-page.ts:619-641`) | **Justified.** "from you" = from the consented fix taken at click time |
| 7 | Detail page: **"≈ N km straight line from you"** (result) | `en.ts:235` / `et.ts:240` / `ru.ts:249` | `shelter-detail-page.html:125-130` (`role="status"`) | Same consented fix; Haversine straight line, "never a route claim" (template comment `:125-127`) | **Justified** — the "≈ … straight line" honesty format states what it measures |
| 8 | "How OpenShelter works" block: the `how.nearest` paragraph (permission mechanic, "used only inside your browser and never sent to our servers") | `en.ts:88-89` / `et.ts:97-98` / `ru.ts:102-103` | `map-page.html:393` | Mechanism description — matches the code exactly | **Justified** — and it is the user-visible place where the app already tells the truth his argument demands |
| 9 | Privacy policy: "We only ever see your location when **you** ask for it…"; "On the map, the nearest shelter is worked out **inside your browser**; your live position is never sent…"; "We **never** infer your location from your IP address." | `en.ts:1058-1069` / `et.ts:1061-1072` / `ru.ts:1118-1129` | legal privacy page (`features/legal/privacy-policy-page.ts`) | Mechanism description | **Justified — all three sentences verified true** (§2). The "nearest shelter" here is a mechanism statement, not a proximity promise |
| 10 | Submit form: **"Use my location"** (button) | `en.ts:374` / pending `en.ts:375` | `features/shelter/submit-shelter-page.html:237-240` | `navigator.geolocation` inline (`location-capture-view.ts:347-365`) | **Justified** — names the mechanism, makes no proximity claim. (Coordinates reach the server only as part of an explicit shelter submission — disclosed in privacy p2, `en.ts:1065`) |
| 11 | Geolocation failure copy: `map.nearest.denied / .timeout / .unsupported / .unavailable / .insecure` | `en.ts:212-219` (ET/RU mirror) | map result line (`map-page.html:239-240`) and detail page (reused via `DISTANCE_KEY`, `shelter-detail-page.ts:74-80`) | n/a — describes the browser's failure, not a proximity fact | **Justified** — accurate per failure kind |
| 12 | Geocode errors quoting the CTA: "…or 'Show shelters around you'." | `en.ts:220-224` (ET `et.ts:225-229`, RU `ru.ts:233-237`) | map anchor search errors (`map-page.html:175-183`) | n/a — cross-reference to claim #1 | **Justified** |

Non-claims checked and cleared:
- **Marker tooltips** are the shelter name only (`shared/leaflet-service.ts:199,277`); the
  anchor pin's title is the searched address (`:341-361`) — no distance or "nearest" text.
- **Admin / account / guidance surfaces** render no distance and no proximity wording
  (grep: zero hits for the distance helpers outside map/detail).
- **Seeded guidance posts** (`src/main/resources/db/migration/V23__crisis_guidance.sql`,
  `data/`) contain no `nearest|closest|nearby|around you|lähim|ümbruses|рядом|ближайш`.
- **Backend DTOs/API fields**: no field named nearest/closest/distance is exposed. The
  only backend distance code is the duplicate-detection guard
  (`app/ShelterService.java:271-280`, `app.limits.duplicate-coord-meters` —
  `ShelterDuplicateException.java:6`), internal and never rendered to a user.
- **i18n template guard**: `'nearest'` in `core/i18n/i18n-template-guard-scanner.ts:60` is
  in the `STRUCTURAL_VALUES` set (scroll-position tokens like `smooth`/`center`) —
  unrelated vocabulary, not a claim.

## 4. Findings — ranked by how misleading

**The headline: the app does not overclaim anywhere. That is the real finding, and the
owner would want it stated plainly.** Every proximity claim in the product is measured
from either (a) the user's own browser-geolocation fix, taken on an explicit per-click
consent, or (b) an address the user typed. There is no IP-derived location, no server
default, and no server-side ranking — so "nearest to the IP" is not a state the app can
ever be in. The superlative is also computed over the *complete* ACTIVE list
(fetch-all, §2), so no viewport/paging window can silently drop the true nearest row.
The app even preaches the owner's own rule back to him in the "How OpenShelter works"
block and the privacy policy (claims #8, #9).

Ranked residual risk (none rises to "unjustified"; listed for completeness):

1. **(Inherent, not fixable in code) The browser fix ≠ the user, and the app cannot tell which.**
   A desktop browser may resolve "your location" from Wi-Fi or its own IP heuristics; the
   app receives coordinates without a provenance flag and cannot distinguish GPS from a
   coarse fix. Every "you"-relative word (claims #1-#4, #6, #7) therefore presumes the fix
   represents the user. The app already mitigates at the maximum available honesty: the
   copy consistently attributes the position to the **browser** ("Your browser asks first",
   "inside your browser", "your browser's own permission prompt") rather than claiming the
   app knows where the user is — which is precisely the epistemic boundary his argument
   draws. Optional wording hedge for claim #2 only: see §5.2.
2. **(Borderline, app-level) "Nearest within the active filter" reads as "nearest, full stop".**
   `NearestView` ranks over `rows: () => this.shelters()` (`map-page.ts:137-141`) — the
   *currently filtered* list. With the "Has capacity" chip active, a re-run of the CTA
   returns the nearest *has-capacity* row, and the result line labels it unqualified
   ("Show shelters around you: …"). Mitigations already present: the chip is visibly
   active beside the CTA, the list below shows the same subset distance-sorted, and any
   filter change clears the previous result line (`map-page.ts:488-492`). Ranked last
   because the filter is the user's own, visible state — not a provenance surprise.
3. **(Nothing else.)** No other claim asserts more than the code knows.

## 5. What was fixed (safely) — and what needs the owner's word

### 5.1 Safe fixes executed: none — and that is the verified result
- **Removing the proposed "Nearest" badge**: there is nothing to remove. The badge was
  proposed (next-ux-proposal.md P1 part 3) but **never landed** — no i18n key in any
  catalog, no `badge--nearest` class, no template markup, no spec assertion (grep: zero
  hits). The owner's rejection is recorded here; nothing was added.
- **Comments / internal names misstating the mechanism**: every proximity-bearing comment
  and name was re-read — `geolocation.ts:1-11` (the mechanism + consumers, accurate),
  `nearest-view.ts:55-62,136` (client-side over the loaded list, accurate),
  `map-page.html:131-134` ("the nearest ranking is client-side (no backend call), so
  'never sent' is the actual behaviour" — verified true), `shelter-copy.ts:515-524`
  ("the copy NEVER claims a walking route or official status" — true),
  `shelter-detail-page.html:97-100` ("the browser asks first, the point never leaves the
  device" — true), `ShelterController.java:67-70` and `06-CONTEXT-API.md:277-278`
  (server-side nearest "documented, not built" — true). **None misstates the mechanism;
  none was touched.**
- The `07-STEPS.md:524` doc line "reads 'Show shelters around you' … never 'nearest'" is
  scoped to the CTA (button/result/empty) and is accurate: the CTA label, result prefix
  and empty state all use "around you"; the two user-visible bare "nearest" superlatives
  live in the consent note and the privacy policy (claims #2, #9), which describe
  purpose/mechanism, not the CTA.

### 5.2 User-visible wording that needs his word — one optional hedge, not a finding
Nothing *requires* a copy change. If the owner wants to extend the badge rejection's
provenance discipline to the only user-visible UI sentence containing a bare "nearest"
superlative (claim #2, the consent note under the CTA):

- **Key (untouched, all three locales):** `map.geoNote`
- **Current EN (`en.ts:187-188`):** "Your browser asks first — your location is never sent to our servers and is used only to find the nearest shelter."
- **Proposed EN (if he wants it):** "Your browser asks first — your location is never sent to our servers and is used only to find the shelters around the position your browser shares."
  — it replaces "the nearest shelter" (a superlative about the user) with "the position
  your browser shares" (the exact thing the app knows). **Needs ET/RU native review**
  (current values: `et.ts:193-194`, `ru.ts:199-200`).
- The privacy policy's "the nearest shelter is worked out inside your browser"
  (claim #9) is left alone: it is a mechanism statement in legal text, already
  provenance-honest, and legal copy is his (or counsel's) call, not a lane's.

## 6. Gate

No source file was touched (frontend or backend), so the mvn gate does not apply
(no backend sources modified). Frontend gates run on the clean tree to confirm the
baseline integrity, detached, exit files at `/tmp/nearest-audit-test.exit`:

- `cd frontend && npx ng test --watch=false` → **exit 0** — `Tests  1583 passed (1583)`,
  65 test files (the 1583 baseline, intact on the untouched tree)
- `npx ng build` → **exit 0**
- mvn gate: **not applicable** — no backend source was touched

Exit files: `/tmp/nearest-audit-test.exit` (`test_exit=0`, `build_exit=0`);
logs at `/tmp/nearest-audit-test.log`, `/tmp/nearest-audit-build.log`.

## 7. Unverified

1. **Rendered-page behaviour** (Lighthouse/axe, a live geolocation prompt, a real
   desktop-browser coarse fix) — no running browser was available; the audit is a
   source-level trace. The provenance claims in §2 are grep + call-graph verified, not
   observed in a live session.
2. **`reviews/polish/ux-implement.md`** is missing (§0) — the implementing lane's own
   words on *why* it stopped are unknown; the tree state was used instead, and its
   stopping point (P1 not started, badge not started) is consistent with the task brief.
3. The ET/RU strings were not re-translated or re-verified word-for-word against EN —
   only inventoried with line refs (the no-translation-touch rule). Their proximity
   vocabulary (`lähim`/`ümbruses`/`sinust`, `ближайш`/`рядом`/`до вас`) mirrors the EN
   structure key-for-key in the ledger above.
