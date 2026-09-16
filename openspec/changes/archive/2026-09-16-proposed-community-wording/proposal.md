# Change: proposed-community-wording (M7)

## Why

The UI still frames user-added shelters around the *act of submitting*:
the unconfirmed state badge reads "Newly added", the confirmed state
reads "Community-checked", the map legend/chip call the amber state
"New community", and the map subtitle says "community-submitted".
Roadmap M7 reframes the concept: a user-added shelter is a **proposal**
the community checks — unconfirmed rows are "Proposed", confirmed rows
are "Community-reported". The unverified-warning surfaces (detail page
of UNDER_REVIEW rows, the around-you result line) already exist from
community-review-queue; M7 keeps their copy and pins the surfaces
alongside the renamed labels.

## What Changes

- **Badge labels (single-sourced `provenanceText`)** —
  `UNDER_REVIEW`: "Newly added" → **"Proposed"**;
  `COMMUNITY_REPORTED`: "Community-checked" → **"Community-reported"**.
  Every surface that renders the provenance badge picks it up with no
  other change: map list row, detail header, /mine (contributions
  panel), admin list.
- **Legend + filter chip** — the amber legend entry and the
  UNDER_REVIEW chip: "New community" → **"Proposed"**. The
  COMMUNITY_REPORTED entries stay the short form "Community" (the badge
  is the full "Community-reported", the legend/chip the short form —
  same precedent as "Official" for "Paasteamet registry").
- **Map subtitle** — "Find registered and **community-reported** bomb
  shelters in Estonia."
- **Submit-success copy** — "Your location is now listed and marked as
  **proposed**. Community reports confirm it."
- **Unverified warning** — copy unchanged (the pinned community-
  review-queue sentence); the surfaces are re-pinned by this change:
  detail page for UNDER_REVIEW rows + the around-you result line when
  the highlighted row is USER (any review status).
- **Spec pins** — the copy pins move to the new labels in
  `shelter-copy.spec` and the surface specs (map, detail, contributions,
  submit, design-tokens comment).

## Non-goals (this change)

- Backend untouched — `provenance` is already server-derived (M6); this
  is an FE copy milestone.
- The "Submit a shelter" / "Submit your first shelter" action buttons
  and the explanatory "the shelters you submitted" account copy stay —
  they name the user's *action*, which is still to submit a proposal;
  only the state/label vocabulary changes.
- No marker-tone or palette change (M6 colours stand), no legend-entry
  count change (five public entries), no filter-value change.
- No change to the `COMMUNITY_UNVERIFIED_WARNING` sentence itself.
