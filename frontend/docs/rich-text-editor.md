# The admin guidance body editor (Quill 2.0.3, vendored)

The rich-text body editor on the admin guidance create/edit page
(`src/app/features/admin/guidance-editor.ts`, rendered by `AdminPage`).
It is **Quill 2.0.3** — vendored byte-for-byte into
`src/vendor/quill/2.0.3/` (NOT an npm dependency; see
[`src/vendor/quill/README.md`](../src/vendor/quill/README.md) for
provenance, integrity, and the re-vendor procedure) — running on
**Quill's own default snow theme and standard toolbar**, restricted to
exactly what the server sanitizer keeps.

## Why vendored, and the trade-off that comes with it

Quill is deliberately not an npm dependency (`package.json` must never
list it): no lockfile can drift, and the exact bytes the editor runs on
are what git review sees. The price is **no automated security updates**
— npm audit, dependabot and advisory feeds never see Quill, so a
vulnerable release stays in this repo until a maintainer runs the
re-vendor procedure in
[`src/vendor/quill/README.md`](../src/vendor/quill/README.md). That
accepted trade-off is documented there, not repeated here.

**First-party files inside `src/vendor/quill/`**: `dist/quill.d.ts` is a
hand-written TypeScript shim (marked as such in its header) declaring
just the API surface the component and spec use — the UMD bundle ships
no declarations. `README.md` (provenance doc) is ours too. Everything
else under `2.0.3/` is upstream bytes, unmodified.

## Why the default snow theme and standard toolbar

The editor is built with `theme: 'snow'` and the toolbar handed to Quill
as a **config form** (`modules.toolbar.container` — Quill 2 has no
top-level `toolbar` option):

```ts
[
  [{ header: [2, 3, false] }],          // heading level picker (h2/h3/paragraph)
  [{ list: 'bullet' }, { list: 'ordered' }],
  ['bold', 'italic', 'link'],
]
```

The snow theme **builds the toolbar DOM itself** from that form (the
`ql-header` picker, the `ql-list` buttons, the `ql-bold`/`ql-italic`/
`ql-link` buttons as a sibling of the editor root) — so the component
template holds NO toolbar markup, and Quill owns every control's
`ql-active` / `aria-pressed` state (the spec asserts Quill's own
`aria-pressed` toggles; do not template-bind those states).

Input mechanics are likewise upstream's: default paste (rich paste
through the restricted format registry — see the guard below), default
undo/redo, default format toggles. The two deliberate departures from a
bare `new Quill(...)` are both server-contract driven, not aesthetic:

- `modules.history.userOnly: true` — Quill's default (`false`) would
  record the API-sourced load of the stored body as an undo step, making
  the first Ctrl+Z after opening an edit wipe the document.
- a custom `handlers.link` (below) — the toolbar's default link handler
  would format with a boolean, not prompt for a URL.

The list-marker note that made the default theme mandatory: in Quill 2
every list is stored as `<ol>` with `data-list` on the items, and the
**theme CSS** paints the markers (the `.ql-ui` span's `::before` bullet
or counter). Without `quill.snow.css`, every list — bullet or ordered —
renders as numbers. A test pins this ("a bulleted list renders a bullet
marker").

## The `formats` contract: the server sanitizer is the authority

`BodySanitizer` (`src/main/java/ee/sheltermap/guidance/BodySanitizer.java`,
server-side) keeps exactly:

```
h2 h3 p br strong em ul ol li a blockquote     (only `a[href]`)
```

with `http`, `https`, `mailto` the only `href` protocols. The editor's
feature surface is declared as the allowlist in Quill's names:

| Quill format | Quill can express | The editor admits | Server keeps |
|---|---|---|---|
| `header` | h1–h6 | values **2 and 3** (picker offers 2/3/paragraph) | `h2`, `h3` |
| `bold` | — | — | `strong` |
| `italic` | — | — | `em` |
| `link` | any protocol Quill's whitelist allows | **http/https/mailto only** (the prompt + paste matcher) | `a[href]` with those protocols |
| `list` | bullet / ordered / checked (task) | **bullet and ordered** (task items map to bullet) | `ul ol li` |
| `blockquote` | — | round-trips stored quotes; no toolbar button offers it | `blockquote` |

`p` and `br` need no format: `p` is Quill's default block, `br` a
byproduct of typing. `BODY_EDITOR_FORMATS` is the `formats:` option —
the registry restriction that drops everything else (colour, underline,
images, code blocks, align, indent, …) from pasted and loaded markup at
the conversion stage.

The formats list cannot express **value subsets**, so the clipboard
matchers in `guidance-editor.ts` close the holes:

- pasted `<h1>`/`<h4>`–`<h6>` → stripped of the header format (the
  public page owns the single h1; h4–h6 are not on the allowlist);
- pasted `<a>` with a protocol the sanitizer drops (`tel:`, `sms:` —
  Quill's own whitelist admits them — or `javascript:`/`data:`) → the
  link is stripped; a bare `<a>` with no href → stripped;
- pasted task-list items (`data-checked`) → mapped to bullets
  (defensive; today's Quill already degrades them).

**The enforcing test**: `guidance-editor.spec.ts` → "the editor formats
list is a subset of the BodySanitizer allowlist". It maps every entry of
`BODY_EDITOR_FORMATS` through `BODY_EDITOR_FORMAT_TAGS` onto the tags
the server keeps, and fails if a format names a tag that is not on the
allowlist. Add a format without cross-checking the server and the suite
goes red.

## The save path (and why the server is still the authority)

1. `onSave()` clones the live editor root and runs `normalizeBodyRegion`
   on the clone (a clone on purpose — the normalizer mutates; running it
   on the live root would desync Quill's blot tree). The normalizer is
   the client-side twin of the sanitizer: `b`→`strong`, `i`→`em`,
   `div`→`p`, disallowed elements unwrapped to their text, every
   attribute dropped except `a[href]` with an allowlisted protocol,
   Quill's bookkeeping removed (the `data-list` list remap — Quill 2
   renders every list as `<ol>`, so bullets are re-wrapped in `<ul>` for
   the wire — the anchors' `target`/`rel` that Quill adds during
   editing, the list items' invisible `.ql-ui` spans, armed-cursor
   `\uFEFF` text, empty inlines).
2. The normalized HTML goes into the form's `body` control (the wire
   value).
3. `AdminPage` POST/PUTs it; **the server re-sanitizes on every write**
   (unchanged defence in depth). Whatever slips the client is stripped
   server-side; the sanitizer is the single authority.

Loading is the inverse with the same guard: the stored (already
sanitized) HTML is loaded through `clipboard.dangerouslyPasteHTML`,
which runs the same matcher pipeline a paste goes through, so a load can
smuggle no more than a paste can.

## The empty-document rule

An empty Quill document is the `<p><br></p>` shape. The control contract
is: **an empty document stores `''`** (the old textarea's empty marker),
so `bodyHtmlBlankValidator` (tag-strip + trim) and the create payload
behave exactly as the textarea's did. Tests: "a body holding only an
empty paragraph is refused as blank" and "saving an empty body (even
with markup) is refused and leaves the editor open".

## The link protocol guard

The link is only ever entered through the prompt
(`handlers.link` → `insertLink()`): `ALLOWED_LINK_PROTOCOL`
(`/^(https?|mailto):/i`) is checked before anything is inserted; a
refused URL inserts nothing and names the rule in the field's error line
(connected to the editor root via `aria-describedby`). A selection is
required. Tests: the `javascript:` refusal (nothing inserted, error
shown) and the `https`/`mailto` acceptance.

## The one a11y deviation from upstream styling

The editor is styled by the vendored `quill.snow.css` **verbatim**,
except for one marked block at the bottom of
`guidance-editor.scss` (search for "THE ONE DEVIATION"), which exists
because (a) Quill's stock controls are 24 px tall, below this repo's
48 px touch-target standard, and (b) upstream removes the keyboard focus
ring (`.ql-editor { outline: none }`; the toolbar signals focus with an
icon-colour shift only). The block gives the toolbar controls and picker
items the app-standard 48 px **tall** (widths stay upstream's), restores
the app's focus ring (`2px solid var(--color-primary)`, 1 px offset) on
every focusable control and the editable region, and keeps the region at
the old textarea's 10-row minimum height. Nothing else may style Quill's
elements — look belongs to the vendored theme.

## How the stylesheet loads (with the editor, never globally)

- `quill.snow.css` (~24 kB) loads as a **versioned static asset**: the
  build copies the vendored file verbatim into dist (the `angular.json`
  `assets` entry, `src/vendor/quill` → `/vendor/quill`, layout kept), and
  the editor's init path (`loadSnowTheme()` in `guidance-editor.ts`,
  called from `ngOnInit`) injects ONE `<link rel="stylesheet">` per app
  to `SNOW_THEME_HREF` — fetched only when the admin editor
  initialises. It is NOT in `angular.json`'s global styles (that would
  land it in the initial bundle, already over budget), and it is NOT
  inlined into the component style: the `anyComponentStyle` budget is a
  **10 kB error**, and ~24 kB of vendor bytes in there is exactly what
  fired it (the project keeps guards that fire). The spec pins this
  both ways: "the snow stylesheet is not a global style (angular.json
  stays quill-free)" and "initialising the editor loads the snow
  stylesheet (one versioned link, never global)".
- A **dynamic import of the .css** was tried and rejected empirically
  before the link approach: `@angular/build:application` (esbuild)
  compiles `import('…/quill.snow.css')` to a 30-byte stub module
  (`var t={};export{t as default};`) and emits the CSS as orphaned
  assets (`chunk-*.css` / `main-*.css`, nothing in the emitted JS or in
  `index.html` references them) — the build is GREEN but the theme
  never loads, so the editor renders unstyled. Unit tests would not
  catch that: the Vite-based test environment DOES inject the CSS as a
  `<style>`, so the test would pass while production is broken. Do not
  re-attempt the dynamic import without re-verifying the emitted
  chunk references.
- The version in `SNOW_THEME_HREF` is load-bearing for caching: a
  re-vendor to a new version directory is a new URL, so a stale browser
  cache can never serve an old theme over a new one. Keep the constant
  in lockstep with the JS import's version.
- `GuidanceEditor` is one of the TWO components in the repo that use
  `ViewEncapsulation.None` (the other is `AccessibilityDialog` in `shared/`,
  whose stylesheet carries the black-and-yellow theme's page-wide rules —
  `.a11y-*`-prefixed classes on purpose), and that is load-bearing here: the
  default
  (emulated) strategy appends a scope attribute to every selector, and
  the component's a11y overrides target Quill's RUNTIME DOM (the
  `.ql-toolbar` controls, the editable root), which carries no scope
  attribute — scoped, those rules would match nothing. (The vendored
  theme itself is the versioned global asset above; it needs no help
  from here.) With `None`, this component's own rules are global too;
  that is safe — the styles are injected only when the lazy admin page
  first renders, and every other component that styles a shared class
  (e.g. `.field-note`) keeps its own **scoped** rule, whose scope
  attribute outranks the global one in specificity (the one other `None`
  component, `AccessibilityDialog`, prefixes every class `.a11y-*` for the
  same reason).
- The `anyComponentStyle` budgets stay at their defaults (4 kB warning /
  **10 kB error**, `frontend/README.md` bundle-budget note): the component's
  own styles measure **4.27 kB** on a fresh build (2026-09-22) — OVER the
  4 kB warning, so `guidance-editor.scss` is one of the fifteen warning files
  in that list (expected: the a11y override block below the form styles);
  the guard that matters is the 10 kB ERROR budget, which fires for any
  component that inlines this stylesheet again. A
  previous lane raised the error to 30 kB to admit the `@import`; that
  was reverted deliberately and must not return.
- Consequence for maintainers: a **re-vendor that ships a `.scss`
  theme file** instead of a `.css` one will also trip the design-token
  audit — `design-tokens.spec.ts` skips `src/vendor/**` for exactly
  that reason.

## Adding or removing a toolbar button (safe procedure)

1. The server must keep what the button produces: cross-check the tag /
   format against `BodySanitizer.java` (the allowlist above).
2. Add the Quill format to `BODY_EDITOR_FORMATS` — and extend
   `BODY_EDITOR_FORMAT_TAGS` with the tags it can produce. The subset
   guard test will fail until every tag is one the server keeps.
3. Add the control to the `TOOLBAR` config form. If the control needs a
   URL/prompt (link-like), add a `handlers` entry — the default
   handlers format with the button's on/off value.
4. If the format can express values the allowlist doesn't (header is
   the standing example: Quill knows h1–h6, the allowlist keeps h2/h3),
   add a clipboard matcher closing that value-subset hole.
5. Adding a look is NOT allowed: the toolbar/region look is the vendored
   snow CSS; if a new control looks wrong, that is an upstream-style
   problem, not a local-CSS problem.

Removing a button is the inverse minus step 5: drop it from `TOOLBAR`,
and if no other path can produce the format, drop it from
`BODY_EDITOR_FORMATS` + `BODY_EDITOR_FORMAT_TAGS` (stored content in
that format still round-trips through the registry only if the format
stays — decide that deliberately, the way `blockquote` was left in the
registry without a button).

## Re-vendoring Quill

Follow [`src/vendor/quill/README.md`](../src/vendor/quill/README.md)
(exact-version directory, verbatim bytes, integrity recorded, old
version kept until green). The editor-specific checklist on top:
re-point the JS import AND `SNOW_THEME_HREF` (both in
`guidance-editor.ts`; the versioned directory means the `angular.json`
assets copy and the served URL follow automatically), re-check the
`quill.d.ts` shim against the new API surface, re-run
`npx ng test --watch=false` and `npx ng build`, and confirm the version
claims in this doc and in the vendor README.

## What this doc does NOT cover (unchanged contracts, spec'd)

The hero picker/upload, the hero/alt cross-field rule, the draft/publish
choice, the draft-saved notice, and the save error banner are the
editor's form contract, not the Quill integration — all of it is in
`guidance-editor.spec.ts` (search for "hero", "alt", "draft",
"serverError") and unchanged by the Quill switch.
