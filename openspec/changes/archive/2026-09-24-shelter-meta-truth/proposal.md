# Change: shelter-meta-truth (M8)

## Why

The owner's puzzled read of a real row (a registry shelter): "why is there
still 'Last verified 6 d ago · 1 community report', and why does it not
change even when I click report open or closed or full or any other —
when does this even come from? From the general view it says around 222
m — what does this even mean? Is it the distance from the search address
I paste to the point I select?"

Three separate confusions, one wave:

1. The detail header's meta line joined two UNRELATED facts into one
   string — "Last verified {ago}" (the per-entry verification stamp:
   for registry rows the newest non-failed import; it moves only on a
   new import or a confirming moderation action) and "N community report(s)"
   (the lifetime total over all report types; the open/closed and how-full
   taps are per-user live states that never touch it). Joined with "·",
   the two read as one fact and neither moves when the user expects the
   other to.
2. A damped report (community-self-moderation D3: the reporter holds
   their own other listing of the same place) is stored and visible in
   the admin queue, but the user-facing notice said "recorded with
   reduced weight" — the server weights it 0, and the user is never told
   that their report counts nothing. The rule is real and stays; it just
   stops being silent.
3. The "≈ 222 m straight line" figures measure from an ORIGIN (the
   user's geolocation fix or the geocoded address anchor) to a shelter's
   coordinates, but the origin had no distinguishable marker of its own
   (the anchor pin looked like another shelter dot) and the rule —
   which two points, which formula, which zoom, what the number means —
   was not documented anywhere a future developer would find it.

## What Changes

- Detail header: the verification fact and the report fact become TWO
  self-contained lines, never one string. The verification line names
  what a registry check was against ("Last verified against the
  registry {ago}"); the report line is labeled as the total ("Community
  reports: N (total, all types)").
- Dampened report notice: says the report was recorded but WEIGHTED 0,
  and why (the reporter's own similar listing), and what that means
  (it does not count toward hiding the shelter).
- Origin marker: the address anchor gets a visually distinct marker —
  a 12 px diamond (shelters are 14 px circles), the user-picked-spot
  teal, distinct on shape not colour alone, accessible name
  "Searched address", a legend entry, and z-order that can never
  obscure a shelter at the same point.
- Distance rule documented where the repo already keeps map mechanics
  (frontend/docs/agent/05-CONTEXT-MAP.md, "Distance numbers" section +
  the MapPage doc comment): which two points, which formula (Haversine,
  r = 6371 km, client-side), which zoom (the number is zoom-independent;
  the camera flies to the origin at 14, selection flies to the shelter
  at 16), and what the number means to the user (straight-line
  approximation, never a route or an official distance).

## Impact

- Affected specs: entry-verification-meta (the UI surfaces the stamp
  and the counts), community-self-moderation (report endpoints surface
  the dampening outcome), map-browse (address search as a browse
  anchor).
- Code: `shared/shelter-copy.ts` (+ its spec pins), the shelter detail
  page template/spec, `shared/leaflet-service.ts` (+ its spec), the map
  page legend/spec, `styles.scss` marker rule, `05-CONTEXT-MAP.md`.
- No backend changes: the DTOs (`lastVerifiedAt`, `reportCount`) and
  the `{"damped": true|false}` report response are exactly as
  contracted; openapi.json is untouched. No i18n catalog changes: the
  legend entry reuses the existing `map.searched` key; a dedicated
  `map.legend.anchor` key is requested from the i18n lane (EN "Searched
  address" / ET "Otsitud aadress" / RU "Найденный адрес").
