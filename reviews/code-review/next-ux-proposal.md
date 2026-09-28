# NEXT-UX-PROPOSAL — design proposals for the audited surfaces (proposals only, no changes)

Lane: NEXT-UX-PROPOSAL (branch `code-review-2`, no commits — the parent commits).
Mandate: the site was audited for *compliance* (semantics, contrast, focus,
keyboard) but never for *design*. This lane produces the design proposal the
owner can accept or reject — argued, with measurements, not asserted.

**This lane changed no code, no style, no copy and no translation value.**
The only output is this report. The working tree contains one pre-existing
modified file (`frontend/src/app/gateways/guidance-gateway.spec.ts`) that is
not this lane's and was left untouched.

## 0. Scope and method

Read in full: `features/map` (template, scss, `map-page.ts`,
`nearest-view.ts`, `anchor-view`/`legend-view`/`nearest-view` contracts),
`features/guidance` (list + detail, templates + scss), `features/shelter`
(submit + detail, templates + scss), `features/account` (account,
contributions, verify), the admin shell (`admin-page.html` +
`_admin-shared.scss` + `admin-page.scss` + `shared/admin-tab.ts`), the global
design surface (`src/styles.scss` 931 lines, `shared/page-shell.*`,
`shared/banner|list-state|pagination|loading-indicator|report-gauge|consent-banner`),
`src/index.html`, `app.routes.ts`, the EN i18n catalog, and
`reviews/code-review/design-review.md` (the prior compliance lane, whose
findings I cross-reference in §5 rather than re-raise).

Skills (per `docs/skills/README.md`, the authoritative index):
`web-design-guidelines` — current Vercel Web Interface Guidelines fetched
from the URL inside the skill file, applied as the design spine (hierarchy,
states, copy, navigation, hover, anti-patterns); `web-quality-audit` —
evidence-led structure: measured findings kept separate from code-only
hypotheses, severity by user impact; `accessibility` — contrast and target
size (2.5.8, 24px floor) used as *measurement rulers* for the design
arguments, not re-audited; `performance` + `core-web-vitals` — the
measure-before-optimize discipline, which is why §7 lists what I could not
judge without a running app instead of dressing it up as a finding;
`angular-developer` — structural idioms for the cost estimates.

Every number in this report is one of: (a) a token-derived pixel value at a
16px root (the type scale: `--text-sm` 0.85rem = 13.6px, `--text-md` 14.4px,
`--text-base` 15.2px, `--text-lg` 16px, `--text-xl` 17.6px,
`--text-3xl` 25.6px — `styles.scss:203-210`); (b) a contrast ratio computed
from the shipped hex and re-run by `design-tokens.spec.ts` on every build;
or (c) a value the file's own enforced comments document. Layout facts
(sidebar 344px, map 725px min, card 248px) are computed from the committed
CSS at the 1080px content cap.

Cost vocabulary (maps to this run's lane mechanics):
**S** = one template/scss pass, existing tokens/keys only, spec touch-ups;
**M** = template + view model + a 3-locale copy packet (native review owed);
**L** = backend DTO/admin field + content authoring.

---

## 1. Findings — the genuinely weak decisions, ordered by value

### F1. The crisis answer is rendered as an unemphasised, non-actionable line, and the list it refers to is unmarked.

`features/map/map-page.html:208-221` (the `nearest-line` success block),
`features/map/map-page.scss:405-446` (`.nearest-line`),
`features/map/nearest-view.ts:59,75` (the documented intent).

After the user taps the page's only crisis CTA ("Show shelters around you",
`map-cta`, `map-page.html:123`), the decisive moment of the product renders
like this: a `<p role="status">` at **13.6px, weight 400** — the exact same
voice as the geolocation consent note above it (`map-page.scss:255-259`,
`.map-page__geo-note`, 13.6px muted) — saying
"Show shelters around you: *Name* · *address* · ≈ 2.1 km straight line".
Measurements, top to bottom of the sidebar: CTA label 15.2px/550; the
answer line 13.6px/400; the "Open"/"Has capacity" filter chips 14.4px
(`map-page.scss:448-452`, chips fill the row at 48px each); list row names
15.2px/600. **The answer to the crisis question is typeset smaller than the
filter chips.** It is not clickable — nothing in the line selects, flies or
navigates. And the list below, which `sorted()` now distance-sorts
(`map-page.ts:218-235`), shows no per-row distance in this mode (the
distance span renders only `@if (anchor.anchor() !== null)`,
`map-page.html:327-331`) and no marker on the first row — the user must
re-scan a 344px column and *infer* that row 1 is the one the line above
named.

Why it is weak in terms of the task: this is the single moment that decides
whether the app works in the worst user state (a person looking for shelter
right now). The current rendering tells the user *a fact* (the nearest
shelter's name) and then offers no next step: not "tap this", not "it is the
first row", not even a visible ranking (the sort happened, the rows moved,
nothing was said). The design-review lane verified the state *coverage*
(loading/empty/error all exist) — coverage is not the issue; the issue is
that the state, once reached, does not tell the user what to do next.

The documented intent (`nearest-view.ts:59,75`: "NO row is selected,
emphasized or scrolled to — the list must not focus a single shelter") is
defensible — the user surveys the neighbourhood and picks. The proposal in
§2 keeps that intent; it only makes the answer legible and the
correspondence visible.

### F2. The shelter detail buries the visitor's answers below the contributor's flow, and the journey's payoff action is the weakest control on the page.

`features/shelter/shelter-detail-page.html:82-111` (navigate row),
`193/240/283` (the three report sections), `503-527` (the "Info" section),
`features/shelter/shelter-detail-page.scss:84-113` (`.shelter-detail__navigate`),
`app.routes.ts:86-98` (the route is public — "anonymous visitors see the
detail without the trust-layer controls").

The route is public; the majority of readers are anonymous, and for them the
three "Report…" sections render as three stacked "Log in to report…" gate
prompts. Yet the template order is: header → map (260px) → "Details"
(description + capacity) → **Report how full → Report open/closed → Report
this shelter** → community-pulse gauges → "Last 10 reports" (a scrollable
200px log) → **"Info" — the last-reported status and capacity** — at the
very bottom, in 13.6px values with a 192px label column
(`shelter-detail-page.scss:223`). The two questions the visitor came with
("is it open? is there space?") are answered below the fold, below the map,
below three contributor sections, below the gauges and below a log. The
header badges do carry fresh reports — but only when fresh, and only as
12px pills.

The second half of the finding: the actions that physically get the user to
the shelter — "Google Maps", "Apple Maps", "Distance from you" — are
**13.6px text links with no padding** (the distance button is explicitly
`padding: 0`, `shelter-detail-page.scss:102-111`). At body line-height 1.5
the hit height is ≈20.4px — below the 24px WCAG 2.5.8 target floor and
≈57% of the app's own 48px control rule (`design-tokens.spec.ts:1764`
pins it on `.btn`). The scss comment justifies the quietness ("deliberately
quieter than the back link — they leave the app"). I would argue the
justification is inverted: leaving the app into the phone's navigation is
the *successful completion* of the entire journey, not a demotion of it —
and it is the one crisis-critical control on the site that sits under the
target-size floor.

### F3. The guidance index cards carry no words, and the operator's pin is invisible.

`features/guidance/guidance-list-page.html:35-96` (card = hero + title +
date), `features/guidance/guidance-list-page.scss:22` (grid),
`core/models.ts:903` (`pinned: boolean` on the public DTO).

A card is a 4/3 hero (222px wide × ≈166px in the 248px desktop column), a
16px title link, and a 13.6px date. Zero words about what the post covers.
The index is the second item in the primary nav ("Guidance",
`page-shell.html:40`) — "Crisis guidance" is precisely the content a reader
must triage fast, and the only triage signal is the title, with no excerpt
and no pin marker. The server sorts pinned posts first
(`guidance-list-page.html:2-4`), but `pinned` is rendered nowhere: a pinned
"read this first" post is indistinguishable from the newest one by position
alone, and position is a weak signal in a 4-column grid of 8–12 cards.
The DTO already carries `pinned` — the public template simply does not use
it. The only finding in this report that needs a backend change is the
excerpt half (P3b): the public DTO has no summary field.

### F4. The selected shelter row says "selected" with a 1px border-colour change, and its next step materialises beneath it.

`features/map/map-page.scss:496-498` (`&.shelter-row--selected` —
`border-color` only), `features/map/map-page.html:360-371`
(`shelter-row__details` renders only on selection, below the row),
`features/map/map-page.spec.ts:585,615,645` (the spec pins the
selectivity).

The two-step model (row tap = select + zoom, details link = navigate) is a
deliberate, defensible decision — the click pays off with the map, not with
a navigation. The weakness is the *state language*: the selected treatment
is a 1px border colour change (`--color-border` #d7e0e7 →
`--color-primary` #1769aa) on a white card — the quietest possible
selection — and the next step ("View details →", a 48px ghost button)
appears in the DOM *below* the row only after the tap. A user who tapped to
zoom and got the zoom has no reason to look for a button that was not
there a second ago; `scrollRowIntoView` uses `block: 'nearest'`
(`map-page.ts:447-464`), so if the row sat at the list's bottom edge the
new button can land below the list's fold. The app already owns the
stronger idiom — the legend's selected entry is border **plus**
`--color-bg-subtle` fill (`map-page.scss:141-144`) — the row just doesn't
use it.

### F5. The map sidebar dresses the fallback search like a primary action, between the CTA and the list.

`features/map/map-page.html:131-199` (actions stack: CTA → geo-note →
anchor search → Add shelter → nearest line → anchor line → chips → list),
`features/map/map-page.scss:184-188` (sidebar 344px).

The anchor address search is documented as the *fallback* for the
geolocation CTA ("the fallback for the geolocation CTA when location is
denied, times out or is unavailable", `map-page.html:135-139`) — yet it
renders permanently, with a 13.6px **semibold** label, a 48px input row and
a 12px attribution line (≈110px of the 344px column), directly under the
consent note. The corridor a crisis user is meant to follow is
CTA → answer → list; today the fallback's input row sits in the middle of
it with the same 48px control weight as the CTA itself. Two different
findings live in the same stack: the fallback's emphasis (it looks like an
alternative to the CTA, not a backup for it) and the sheer chrome budget
(~250px of non-list content before the first row at desktop, with the list
holding ~4 of the rows in the 725px map row).

### F6. The submit form puts the two most-likely location captures last.

`features/shelter/submit-shelter-page.html:160-250` (location fieldset
order: map → coordinate-paste field → address search → `location-actions`
with "Use my location" / "Use map center" at 233-250 → readout).

A contributor standing at the location wants "Use my location" (or a map
tap) first; the paste-coordinates/link and address-search fields are the
precision fallbacks. Today both manual text fields — each with its own
label, 48px input, note and (for search) attribution + results region —
stand between the map and the two buttons that will serve most of the
contributors. The readout line that confirms the capture is below them all.

### F7. The anonymous header's only primary button is "Create account", on the crisis map's home screen.

`shared/page-shell.html:63-101` (shell-actions: language ghosts, a11y
ghost, "Log in" ghost, "Create account" **primary** at line 101).

On `/map` for an anonymous visitor, the page carries exactly one
`btn--primary` (blue, "Create account") and exactly one crisis-orange CTA
(`--color-cta`, whose token comment at `styles.scss:78-82` says the orange
"must not become a general accent" — it is, by design, the page's loudest
control). So the first screen presents two primaries pointing in different
directions: the blue one at an account, the orange one at "Show shelters
around you". For the visitor the app exists for, "Create account" is not
the relevant action — the app's own copy tells them they can "browse the
map without an account" (catalog, privacy/terms body). This is the
weakest-argued of the findings: the header-primary-for-registration pattern
is standard, and a registration-conversion case can be made for it. It is
listed because the owner asked what is weak, and this is the one spot where
the app's own single-emphasis discipline (one crisis CTA) is undercut by
the chrome.

### F8. The admin tab row is nine identical 48px ghost buttons that answer nothing about how much work is waiting.

`features/admin/admin-page.html:16-95` (nine `btn btn--ghost admin-tab`),
`features/admin/admin-page.scss` (`.admin-tabs` scrollable row, active =
primary fill), `shared/admin-tab.ts` (the nine-tab union).

The design-review lane already flagged the heaviness of nine full-size
buttons for a tab switcher (its §4.3) — I do not re-argue the look and add
the dimension its audit did not cover: **work depth**. An admin's first
question is "what is waiting?" and the tab row answers nothing — the answer
requires switching tabs and loading the panel. The default tab (Unconfirmed,
`admin-tab.ts`) is the review queue, and its rows are *already loaded
client-side* (`unconfirmedRows()` — the panel renders the full filtered
scope, un-paged), so the queue depth sits in the view model at the moment
the tabs render, and no endpoint or copy is needed to surface a number.

---

## 2. Proposals, in order of value

Each proposal names the elements, the new order/tokens, the value and the
cost. All use existing tokens unless stated; nothing here introduces a new
token, a new hue, or a new layout dimension.

### P1 (for F1) — Make the crisis answer a legible, actionable state. **Value: highest. Cost: S + one 3-locale key.**

Three parts, each independently acceptable:

1. **Render the answer as an answer** — `map-page.html:208-221` /
   `.nearest-line` (`map-page.scss:405`): keep the `<p role="status">`
   (the spec pins the role — `map-page.spec.ts:979` — and the announcement
   is the right behaviour), but restyle the success line only: the shelter
   name in `--text-base` (15.2px) + `--font-weight-semibold` (600) — both
   existing tokens, the same pair the list row names use; the address and
   distance spans stay `--color-muted`; wrap the line in the row's surface
   vocabulary (1px `--color-border`, `--radius-lg`, `--color-bg-surface`
   background) so it reads as a result card, not a note. The empty/error
   variants of `.nearest-line` are untouched.
2. **Give the line a next step** — add a compact `btn btn--ghost`
   "View details" (key exists: `map.viewDetails`, `en.ts:210`) at the end
   of the success line, calling the existing public
   `selectShelter(n)` (`map-page.ts:349`): select + fly + details
   affordance, and the line's own supersede rule clears it on the tap —
   the app's existing "next interaction supersedes" convention does the
   rest. The user still *chooses* to go; nothing is auto-selected.
3. **Mark the correspondence** — while `nearest.userPosition()` is set,
   render a "Nearest" badge on the first row of the distance-sorted list
   (the `@for` gives `$first`; the badge slot already exists in
   `.shelter-row__meta`). Neutral `badge--private` language (muted chip —
   it labels the sort, it does not celebrate), one new i18n key × 3
   locales (native-review packet). This makes the silent re-sort visible
   without selecting or emphasising any row — the `nearest-view.ts` intent
   is preserved.

Why it is first: it is the product's core moment in the worst user state,
it touches the most-visited page, and every part is existing vocabulary.
Spec impact: `map-page.spec.ts` needs the new button + badge asserted;
nothing pinned is re-pinned against its intent.

### P2 (for F2) — The detail page: promote the navigate actions, put the answers above the contribution flow. **Value: high. Cost: S (part a) + S (part b) + M (part c).**

a) **Navigate = buttons.** `shelter-detail-page.scss:84-113`: the two deep
   links and the distance button take the global `.btn btn--ghost`
   (48px target, existing hover/focus behaviour) instead of 13.6px
   unpadded text links. I recommend ghost, **not** primary: the page
   already spends its primary on the verify-gate links, and one primary
   per view is the discipline the orange token enforces on the map. This
   is the only proposal part that also closes a measured miss
   (≈20.4px → 48px, past the 24px floor).
b) **Answers before contribution.** Reorder `shelter-detail-page.html`:
   move the "Info" section (`503-527`, last-reported status + capacity,
   with its time stamps and empty states intact) directly below the header
   block, above "Location". A template-only reorder; no new keys. The
   visitor meets the two answers before the map; the contributor keeps
   every section, just lower. (Rename "Details" vs "Info" — near-synonymous
   section titles — is a 3-locale copy call, owner; flagged, not proposed
   as a lane edit.)
c) **One report entry for non-contributors.** For anonymous and
   unverified readers, collapse the three gate prompts into a single
   "Report a problem" block (the first section's prompt is enough; the
   other two are repetition of the same gate). Verified users keep all
   three sections unchanged. Cost M: template branch + the view model's
   existing auth/verification signals; no new copy (the gate strings
   exist).

### P3 (for F3) — Make the guidance index scannable: pin marker now, excerpt when the owner wants the backend work. **Value: high for the guidance surface. Cost: S (a) / L (b).**

a) **Pinned badge** — `guidance-list-page.html` card: render a `.badge`
   (existing vocabulary; neutral or the info tint) when `post.pinned` —
   the public DTO already carries it (`models.ts:903`), the admin tab
   already has the concept (`admin.guidance.pinned.yes`). One new 3-locale
   key ("Pinned"). The editorial "start here" becomes visible instead of
   positional.
b) **Excerpt (queued, needs owner sign-off on backend scope)** — add an
   optional `summary` (≤200 chars) to the post (admin editor field +
   public DTO + card), rendered as a 2-line-clamped `--text-sm` muted line
   between title and date. This is the only L-cost item in the report:
   backend column/DTO, admin field, and 3-locale content for existing
   posts. The 248px card has the room; the grid stays.

### P4 (for F5) — Get the fallback search out of the crisis corridor. **Value: medium. Cost: S.**

Two options, either one; I recommend (i):
(i) **Disclosure** — the anchor search collapses to its label row
   ("Find shelters near an address") and expands on: an around-you failure
   (any `nearestError` — the fallback is *for* that moment), first user
   expansion, or while an anchor is active. One template branch + one
   boolean; the label key exists.
(ii) **Reorder** — move the block below the filter-chip row (between chips
   and list). Pure template move; it stays discoverable, out of the
   CTA → answer → list corridor.

### P5 (for F8) — Put the queue depth on the tab. **Value: high for the daily loop, near-zero user risk. Cost: S (unconfirmed) / M+ (reports needs a server count).**

On the Unconfirmed tab label, render the client-side count
(`unconfirmedRows().length` — already loaded, no endpoint, no new copy: a
number needs no translation; the tab label supplies the context). If the
owner wants the same on "Shelter reports" that is a backend count
(endpoint + DTO) — queued, not assumed. The tab *look* (compact
controls, underline-active — the design-review's suggestion) is a separate
owner call on appearance; the count is useful under either look.

### P6 (for F4) — Stronger selected-row state; the details step stops materialising. **Value: medium. Cost: S (state) + M (affordance).**

(a) Selected row takes the legend's own selected idiom —
`background: var(--color-bg-subtle)` + `--color-primary` border
(`map-page.scss:141-144` is the precedent, `496-498` the change: two
declarations). (b) The "View details" step: keep the two-step model, but
render the affordance in the row's meta row as a sibling of the row button
(a plain `<a>`, never nested in the button) so it is present before the
tap — either on every row (scannable) or on the selected row only
(the status quo minus the materialisation, same position). The spec's
selectivity pin (`map-page.spec.ts:585,615,645`) is re-pinned to whichever
variant the owner picks. If only (a) is wanted: two lines of scss.

### P7 (for F6) — Surface "Use my location" first on /submit. **Value: medium for contributors. Cost: S.**

Reorder the location fieldset: map → `location-actions`
("Use my location" / "Use map center", `submit-shelter-page.html:233-250`)
→ coordinate-paste field → address search → readout. Template-only move;
no new copy; behaviour identical. The two most-likely first moves sit
directly under the map; the precision fields become the documented
fallbacks they already are in the placeholder copy.

### P8 (for F7) — The header primary: an explicit owner call, cheap either way. **Value: modest, debatable. Cost: one class.**

Demote "Create account" in `page-shell.html:101` to `btn--ghost` (matching
"Log in"), leaving the crisis CTA and in-form primaries as the only
primary controls on the home screen — my recommendation, because the
app's own token discipline reserves the loudest control for the crisis
action and the catalog tells anonymous visitors browsing needs no account.
The counter-case (registration conversion on the landing screen) is real;
hence: try it, measure, it reverts in one class. I would not spend a lane
on it by itself.

---

## 3. What is already good — and where a redesign's risk would be wasted

The critique above is a residual list. The following are deliberate,
argued, and pinned; touching them buys nothing and risks the mechanisms
the owner built:

1. **The token homes with enforced arithmetic.** Every contrast claim in
   `styles.scss` is computed from the shipped hex and re-run by
   `design-tokens.spec.ts` on every build — and the *rejected* alternatives
   are documented with their measured failures (civic blue rejected for the
   chrome band at 3.74:1/2.68:1 secondary text; the CTA orange darkened to
   #bf360c for 5.6:1 because #e8590c/#d9480f fail at 3.6/4.3; the warning
   ochre darkened from the owner's #a66a00, which fails white at 4.48:1, to
   5.59:1). This is design documentation at the value level, and it is the
   single most valuable design asset in the repository. Any redesign that
   keeps this machinery keeps the auditability; one that doesn't loses it.
2. **The reserved state-colour semantics.** Orange = the one crisis CTA,
   single consumer (enforced by comment + token); red = "reported" and
   nothing else; green = verified and nothing else; yellow = community,
   explicitly never "verified"; teal = selected. Markers, legend swatches
   and badges are single-sourced (the legend reuses the exact marker
   classes at a 1:1 14px key — `map-page.scss:118-160`). "Modernising" the
   palette without re-deriving these pairings would silently break the
   trust coding the whole map runs on.
3. **The 2px spacing grid with role-based gaps and documented exceptions.**
   Panel gap `space-16`, action rows `space-8`, label-above-control
   `space-4`; page-specific layout dimensions (sidebar 344px, map 725px/420px,
   44rem article column, 65ch how-block) are declared exceptions, not
   drift. Density is consistent *by construction* — which is why the
   findings above are about order and emphasis, not spacing.
4. **State coverage and the honest empty states.** Loading/error/empty/
   out-of-range on every surface (the design-review verified panel by
   panel); out-of-range is its *own* state with an action ("Page 3 does not
   exist — the index ends at page 2" + first-page button), rarer than it
   should be in shipped UI. "Open is the default" — a fresh OPEN row
   renders **no** badge at all; the absence of alarm is the message. That
   is calm design, and it reads correctly in a crisis context.
5. **The honesty affordances.** "≈ N m straight line" — never a route
   claim; the gauges say "a calculated estimate, not confirmed data"; the
   2-hour window hint stops the windowed tally from contradicting the
   chronological log it sits above. For a trust product these are the
   actual design, not decoration.
6. **The "How OpenShelter works" block** (`map-page.html:389-403`,
   `map-page.scss` how-section): the only ch-capped prose column (65ch),
   the lede one type step up carrying the "not an emergency service, call
   112" positioning, the closing guarantee in quiet medium weight. The
   best-written part of the UI; it also happens to be where the
   trust-model vocabulary is taught.
7. **The 48px touch-target discipline** (spec-pinned on `.btn`,
   `design-tokens.spec.ts:1764`), the app-wide 112-first footer notice
   (owner-pinned no-wrap, `page-shell.scss`), and the map's task model
   itself: map + list side by side, the legend as the *only* tone filter,
   URL-persisted filters (deep-linkable, shareable), marker-click ↔
   row-select ↔ scroll-into-view synchronisation. Coherent with the task;
   don't re-architect it.

The practical consequence for any redesign decision: the value-level
record lives in `styles.scss` comments and the spec pins. A look change
must be re-argued at the value level and re-pinned — that friction is a
feature. Spend redesign energy where §1 says the *decisions* are weak, not
on the surface finish.

---

## 4. If only three things get done

1. **P1 — the crisis answer (map).** The product's core moment in the
   worst user state, on the most-visited page; small-to-medium cost, all
   existing vocabulary, and it compounds with everything downstream (the
   list, the detail page, the navigate actions).
2. **P2 — the detail page (navigate buttons + answers above contribution,
   parts a+b).** The second half of the core task, currently inverted for
   the majority (anonymous) reader; part (a) also closes the only
   measured sub-24px crisis control on the site. Part (c) can follow.
3. **P3a — the pinned badge on the guidance cards.** Small, backend-free,
   no look change — it makes the operator's editorial intent visible on a
   primary nav surface. The excerpt (P3b) is queued as the one
   backend-scoping decision the owner should make separately.

Named honourable mention: **P5's unconfirmed count** — free data, no copy,
zero user-facing risk; do it whenever the admin shell is touched for
anything, including P8's tab-look decision.

Order rationale: P1 and P2 are the two moments that decide whether the
app works for a person in a crisis (find the shelter → get there); P3a is
the cheapest visible improvement on the remaining public surface. P5 is
the highest value-per-effort overall but is admin-side, so it is the bonus
rather than a top-three slot. P4–P8 are real, ordered, and ready to be
scoped as lanes; none of them is a prerequisite for the three above.

---

## 5. Cross-references — already flagged, not re-raised

From `reviews/code-review/design-review.md` §4 (and the board):
`how.sources` stale "triangle" copy — **re-verified and closed**: no
"triangle" remains in any catalog (`grep -rn triangle frontend/src/app/core/i18n`
→ 0 hits); the current copy (`en.ts:84-85`) matches the current marker
model; `.anchor-line__clear` ≈19px target (`map-page.scss:387-395`); the
admin tab-row heaviness (this report extends it with the missing work-depth
dimension, F8/P5); `.panel-title` UA-700-vs-650 (`account-page.scss:26-29`).
Board-standing, referenced not re-raised: hardcoded "Capacity:" at
`shelter-detail-page.html:182` (SIMPLIFY-CATALOGS), the guidance hero
`sizes="400px"` over-declaration (geometry-pinned), the submit-button-while-
loading convention, the verify-page verified+return panel lacking an h2
(needs a new i18n key — owner).

## 6. Gate

Not applicable — this lane is proposals-only and changed no file (rule:
a proposal that edits files is worthless for the decision it supports).
No frontend or backend gate was run because no code, style, copy or
translation value was touched; the branch carries this report and nothing
else of this lane's.

## 7. What I could not judge without seeing it rendered

Per the performance/CWV skills' measure-before-optimize rule, the
following are explicitly out of reach of source inspection; they are not
findings, they are open measurements:

1. **LCP/INP/CLS values** — no running app or lab trace was available
   (the design-review lane recorded the same constraint). In particular the
   guidance detail hero's natural-size CLS exposure (owner-documented
   trade-off, no width/height attributes, `max-height: 24rem` bound) cannot
   be bounded from source.
2. **The legend over real OSM tiles** — effective legibility of the 12.8px
   legend text through the 92% white overlay varies with the tiles under
   it; whether the bottom-left overlay occludes pins at the default Estonia
   view; and the visual weight of the in-flow legend between map and
   sidebar at <900px.
3. **Marker density and overlap** at the default zoom — a map-design
   question no CSS can answer.
4. **The footer notice's rendered width in RU/ET** — the no-wrap
   requirement is documented against ≈1100px of the EN string
   (`page-shell.scss`); the other locales' string lengths change the line,
   and a too-long line wraps (or overflows) only visibly.
5. **Composite rendering over the Leaflet chrome** — the scoped
   `.leaflet-…` theme overrides (zoom glyphs, attribution link, focus ring
   on tiles) were read as CSS, not verified as a composite.
6. **The guidance grid with real hero photography** — the aspect-boxing
   bounds the geometry, but per-photo crop quality at 4/3 is a content
   matter.
7. **The detail page's actual scroll depth to "Info"** — §1/F2 argues the
   *order* from the template (verifiable); the pixel depth depends on
   content length (description text, report-log entries) and is
   unmeasured.
