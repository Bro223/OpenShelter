# Vendored: Quill 2.0.3

The rich-text engine behind the admin guidance body editor
(`src/app/features/admin/guidance-editor.ts`). It is **vendored into this
repository on purpose** — Quill is intentionally NOT an npm dependency
(`package.json` must never list it), so no lockfile change can surprise the
build, and the exact bytes the editor runs on are what is reviewed in git.

## Provenance

| | |
|---|---|
| Exact version | **2.0.3** (the `latest` tag of the `quill` package, i.e. the current 2.x) |
| Upstream repo | <https://github.com/slab/quill> (package `quill`, homepage <https://quilljs.com>) |
| Registry artifact | `quill-2.0.3.tgz` — shasum `752765a31d5a535cdc5717dc49d4e50099365eb1`, integrity `sha512-xEYQBqfYx/sfb33VJiKnSJp8ehloavImQ2A6564GAbqG55PGw1dAWUn1MUbQB62t0azawUS2CZZhWCjO8gRvTw==` |
| Fetch command | `npm pack quill@2` (package-manager fetch of the published artifact; run from a scratch dir, not from this repo) |
| Licence | **BSD-3-Clause** (note: not MIT — the `LICENSE` file Quill 2.0.3 ships says BSD-3-Clause; package.json `"license": "BSD-3-Clause"`) |

## Files copied (verbatim, unmodified)

The upstream directory shape is kept: the browser bundle and theme CSS live
in `dist/` exactly as in the tarball, the licence at the package root.

```
2.0.3/
├── LICENSE                      1,561 bytes   (BSD-3-Clause, upstream package LICENSE)
└── dist/
    ├── quill.js               209,274 bytes   (UMD browser bundle — ALL of Quill)
    ├── quill.js.LICENSE.txt         159 bytes   (webpack licence-banner stub for quill.js)
    ├── quill.snow.css         24,606 bytes   (theme stylesheet, core + snow, self-contained)
    └── quill.d.ts             5,960 bytes   (FIRST-PARTY shim — see below, NOT upstream bytes)
```

Not copied, and why:

- `dist/quill.js.map` (879,120 bytes) — skipped on size (upstream debug map;
  the bundle builds fine without it).
- `dist/quill.core.js` / `quill.core.css` / `quill.bubble.*` — the
  no-theme/bubble-theme variants; we use the full snow bundle, whose CSS is
  self-contained (it includes the core `.ql-container`/`.ql-editor` rules).
- All `*.css.map` — debug maps, not needed.
- The ESM source tree at the package root (`core/`, `formats/`, `modules/`,
  `themes/`, `ui/`, `blots/`, `quill.js`, `core.js` + the `.d.ts` tree) —
  it is the *source* entry, not a build artifact, and its module graph
  imports `parchment`, `quill-delta`, `lodash-es` and `eventemitter3` as
  separate packages. Importing it would defeat the vendoring decision. The
  UMD `dist/quill.js` is the self-contained artifact instead.
- `types.d.js`, `README.md` (upstream), `assets/`, `package.json`,
  `tsconfig.json`, `scripts/`, `test/` — tooling/docs, not runtime bytes.

### About the `.d.ts`

Quill's shipped TypeScript declarations (`quill.d.ts` + per-module tree)
declare the ESM source entry, which is unusable here (see above). The dist
UMD bundle ships no declarations, so `dist/quill.d.ts` is a **first-party
shim** (explicitly marked as such in its header) declaring exactly the API
surface the component and its spec use. It is ours to maintain, not
third-party bytes — a re-vendor rewrites it if the API surface moves.

## Does the dist bundle its own dependencies?

**Yes.** Quill's package.json lists `eventemitter3`, `lodash-es`,
`parchment` and `quill-delta` as dependencies, but the webpack-built
`dist/quill.js` has all four **inlined** (the UMD wrapper is a closed IIFE
with a module table; the only `require("util")` in the file sits behind a
`typeof module` guard that is dead in a browser ESM context). That is why a
single vendored JS file is enough — no separate packages are required, and
nothing from Quill's dependency graph reaches our `node_modules`.

## Wiring (how the app consumes it)

- JS: `import Quill from '.../vendor/quill/2.0.3/dist/quill.js'` in
  `guidance-editor.ts` (typed by `dist/quill.d.ts`). The UMD is consumed as
  CommonJS by the esbuild/vite pipelines, so the default import is the
  constructor.
- CSS: `dist/quill.snow.css` is served as a **versioned static asset**:
  the build copies it verbatim from this directory into dist (the
  `angular.json` `assets` entry, `src/vendor/quill` → `/vendor/quill`,
  layout kept), and the editor's init path injects one
  `<link rel="stylesheet">` per app to `SNOW_THEME_HREF` in
  `guidance-editor.ts` — fetched only when the admin editor
  initialises. It is deliberately NOT listed in `angular.json`'s global
  styles (that would put it in the initial bundle, which is already over
  its budget), and NOT `@import`ed into the component stylesheet (the
  `anyComponentStyle` budget is a 10 kB error, and ~24 kB of vendor bytes
  in the component style is what fired it — the dynamic-import variant
  was rejected too: the esbuild builder emits it as orphaned CSS nothing
  injects; see `frontend/docs/rich-text-editor.md`). Two consequences
  worth knowing:
  - `GuidanceEditor` is the one component in the repo that uses
    `ViewEncapsulation.None`, and that is load-bearing: under the default
    (emulated) strategy the compiler appends a scope attribute to every
    selector, and the component's a11y overrides target Quill's RUNTIME
    DOM (no scope attribute), so scoped they would match nothing. With
    `None`, this component's own rules are global too; that is safe
    (they are injected only when the lazy admin page first renders, and
    every other component that styles a shared class, e.g. `.field-note`,
    keeps a SCOPED rule whose scope attribute outranks the global one in
    specificity). The spec pins the wiring both ways: `angular.json` must
    stay quill-free, and initialising the editor must link the snow theme
    (search guidance-editor.spec.ts for "stylesheet wiring").
  - The version in `SNOW_THEME_HREF` must track the version directory:
    a re-vendor is a new URL, so a stale cache can never serve an old
    theme over a new one.
  The editor runs on the snow theme's own look; the only deviations from
  it are the a11y overrides in `guidance-editor.scss` (48px-tall touch
  targets, focus rings) — see `frontend/docs/rich-text-editor.md`.
- `design-tokens.spec.ts` explicitly skips `src/vendor/**`: the vendored
  stylesheet is third-party bytes and not part of our design token system.

## Re-vendor procedure (future maintainers)

1. `npm view quill dist-tags` — confirm the target version (e.g. 2.0.4).
2. In a scratch directory: `npm pack quill@<exact-version>`; record the
   shasum/integrity from the output (or `npm view quill@<v> dist`).
3. Extract the tarball; copy into a NEW `src/vendor/quill/<exact-version>/`
   directory — `LICENSE`, `dist/quill.js`, `dist/quill.js.LICENSE.txt`,
   `dist/quill.snow.css` — **verbatim, never edited** (verify with
   `md5sum` against the extracted files). Do NOT copy the huge
   `dist/quill.js.map` unless its size stops mattering.
4. Keep the OLD version directory temporarily; point the component's JS
   import AND `SNOW_THEME_HREF` (both in `guidance-editor.ts`) and this
   README's version references at the new one (the `angular.json` assets
   copy follows the version directory automatically); run
   `npx ng test --watch=false` and `npx ng build`.
5. Check the upstream changelog/GitHub advisories between the old and new
   version for the behaviour changes (Quill's dist is minified — diff the
   `.d.ts`-relevant API and the CHANGELOG, not the bundle bytes).
6. Re-check `dist/quill.d.ts` still matches the API surface used (extend the
   shim if new members are used); update the table above (version, shasum,
   file sizes) and delete the old version directory once green.
7. Commit the new directory + wiring in one reviewable change.

## The trade-off, stated plainly

Being vendored means **no automated security updates reach us**: npm audit,
dependabot, and advisory feeds never see Quill because it is not a declared
dependency. A vulnerable Quill release will sit in our registry and in no
one's dependency graph; the only route to a fix is the re-vendor procedure
above, which a maintainer must run on hearing about the advisory (GitHub
Security Advisories for `slab/quill` is the watch target). That is the
price of the owner's decision to keep the editor's bytes in-repo, and it is
why the re-vendor procedure is documented here rather than left as lore.
