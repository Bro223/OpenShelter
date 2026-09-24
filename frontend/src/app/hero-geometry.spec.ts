/**
 * Hero geometry audit (the owner's "stretched hero" report).
 *
 * Every slot that draws a guidance/hero image is pinned to exactly one of
 * two distortion-free contracts:
 *
 *  (a) NATURAL SIZE — the slot declares no fixed box (no literal
 *      width/height, no aspect-ratio, no object-fit); the image's OWN
 *      ratio decides the box. Capped by max-width/max-height, which
 *      browsers resolve ratio-preserving for a replaced element —
 *      measured 0% stretch in Chromium 152 for 4:3, 16:9, 3:2, 3:4,
 *      9:16 and 1:1 at the 44rem article column.
 *
 *  (b) FIXED BOX + `object-fit: cover` — the box keeps a fixed shape
 *      (the card grid's row alignment, the admin's uniform thumbnail
 *      rows, the no-CLS width/height attribute pair) and the image is
 *      CROPPED into it, never squashed.
 *
 * A slot with a fixed width AND height and no object-fit — the old
 * detail-hero 4/3 box the owner reported — is a stretch; this audit
 * makes that shape fail the suite instead of shipping.
 *
 * The srcset/sizes wiring is asserted per slot (it decides which
 * derivative the browser downloads for the slot's fixed CSS width —
 * it must stay intact when the geometry is touched).
 *
 * All three themes are covered because the theme layers are
 * TOKEN-ONLY (asserted at the bottom: no geometry declaration in the
 * high-contrast block, no geometry token in the black-and-yellow map) —
 * the geometry below is therefore theme-invariant by construction.
 * The backend's EXIF-orientation fix (MediaImageInspector /
 * MediaDerivatives) is pinned by the backend suite: a portrait upload
 * must reach these slots with the same visual orientation as the
 * original the detail page renders.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

/** src/ — the test runner's cwd is the frontend project root. */
const SRC = `${process.cwd()}/src`;

const read = (path: string): string => readFileSync(path, 'utf8');

/** Strip C-style block comments (the SCSS here has no string braces). */
const uncomment = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * A rule's OWN declarations: from its opening brace to the first nested
 * block (or the closing brace) — nested rules (`&--failed`, `img`,
 * `@media`) are excluded, so a modifier's geometry can't leak into the
 * base rule's assertions.
 */
function ownDeclarations(source: string, selectorText: string): string {
  const clean = uncomment(source);
  const at = clean.indexOf(selectorText);
  expect(at, `selector ${JSON.stringify(selectorText)} found`).toBeGreaterThanOrEqual(0);
  const open = clean.indexOf('{', at);
  expect(open, `opening brace after ${JSON.stringify(selectorText)}`).toBeGreaterThanOrEqual(0);
  const nextOpen = clean.indexOf('{', open + 1);
  const close = clean.indexOf('}', open + 1);
  const end = nextOpen === -1 || (close !== -1 && close < nextOpen) ? close : nextOpen;
  expect(end, `closing delimiter for ${JSON.stringify(selectorText)}`).toBeGreaterThanOrEqual(0);
  return clean.slice(open + 1, end);
}

/** The declaration's value, or null when absent. */
function decl(block: string, name: string): string | null {
  const m = block.match(new RegExp(`(?:^|[;{])\\s*${name}\\s*:\\s*([^;}]+)`));
  return m ? m[1].trim() : null;
}

/** A literal `<img ...>` tag whose attributes contain every probe string. */
function imgTag(source: string, probes: string[]): string {
  const clean = source;
  const tags = [...clean.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const hit = tags.find((t) => probes.every((p) => t.includes(p)));
  expect(hit, `<img tag with ${JSON.stringify(probes)} found`).toBeTypeOf('string');
  return hit as string;
}

const attr = (tag: string, name: string): string | null => {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
};

// ---------------------------------------------------------------------------
// (a) The public detail page hero — NATURAL SIZE (the box follows the
//     image's own ratio; the article column + the 24rem cap bound it).
// ---------------------------------------------------------------------------

describe('detail hero (guidance-detail-page) — natural size', () => {
  const scss = read(`${SRC}/app/features/guidance/guidance-detail-page.scss`);
  const html = read(`${SRC}/app/features/guidance/guidance-detail-page.html`);
  const base = ownDeclarations(scss, '.guidance-detail__hero {');

  it('declares no fixed box: auto width/height, no aspect-ratio, no object-fit', () => {
    expect(decl(base, 'width')).toBe('auto');
    expect(decl(base, 'height')).toBe('auto');
    expect(decl(base, 'aspect-ratio')).toBeNull();
    expect(decl(base, 'object-fit')).toBeNull();
    // The caps the ratio-preserving fit is bounded by (the measured
    // 0%-stretch envelope): the column width and the vertical cap.
    expect(decl(base, 'max-width')).toBe('100%');
    expect(decl(base, 'max-height')).toBe('24rem');
  });

  it('renders the <img> with NO width/height attributes (a pinned pair would mis-reserve)', () => {
    const tag = imgTag(html, ['guidance-detail__hero']);
    expect(attr(tag, 'width')).toBeNull();
    expect(attr(tag, 'height')).toBeNull();
    // The above-the-fold hero: high fetch priority, async decode.
    expect(attr(tag, 'fetchpriority')).toBe('high');
    expect(attr(tag, 'decoding')).toBe('async');
    // The derivative srcset wiring (the null-fallback idiom leaves a
    // derivative-less asset on plain src); sizes = the article column's
    // 44rem cap — the widest this natural-size hero can render.
    expect(tag).toContain('[attr.srcset]');
    expect(attr(tag, 'sizes')).toBe('704px');
  });
});

// ---------------------------------------------------------------------------
// (b) The public list card — FIXED 4/3 BOX + cover. The card grid aligns
//     rows of cards (a hero-less card renders the same box as a
//     placeholder), and the width/height attribute pair keeps the card
//     shift-free while the image loads — the fixed box is the design.
// ---------------------------------------------------------------------------

describe('list card hero (guidance-list-page) — fixed 4/3 box, cover', () => {
  const scss = read(`${SRC}/app/features/guidance/guidance-list-page.scss`);
  const html = read(`${SRC}/app/features/guidance/guidance-list-page.html`);
  const box = ownDeclarations(scss, '.guidance-post__hero,');
  const hero = ownDeclarations(scss, '.guidance-post__hero {');

  it('declares the 4/3 box on the slot and object-fit: cover on the image', () => {
    expect(decl(box, 'width')).toBe('100%');
    expect(decl(box, 'aspect-ratio')).toBe('4 / 3');
    expect(decl(hero, 'object-fit')).toBe('cover'); // cropped, never squashed
  });

  it('keeps the srcset/sizes wiring and the no-CLS attributes — attributes agree with the declared box', () => {
    const tag = imgTag(html, ['guidance-post__hero']);
    expect(attr(tag, 'width')).toBe('400');
    expect(attr(tag, 'height')).toBe('300');
    expect(Number(attr(tag, 'width')!) / Number(attr(tag, 'height')!)).toBeCloseTo(4 / 3, 6);
    expect(attr(tag, 'sizes')).toBe('400px'); // the slot's fixed CSS width
    expect(tag).toContain('[attr.srcset]');
    expect(attr(tag, 'loading')).toBe('lazy');
  });
});

// ---------------------------------------------------------------------------
// (b) The admin editor's selected-hero thumb and the picker — FIXED
//     SQUARE BOXES + cover. Uniform thumbnail rows (the table grid, the
//     picker grid) need one shape for every asset; a square is that shape.
// ---------------------------------------------------------------------------

describe('admin editor hero slots (guidance-editor) — fixed squares, cover', () => {
  const scss = read(`${SRC}/app/features/admin/guidance-editor.scss`);
  const html = read(`${SRC}/app/features/admin/guidance-editor.html`);

  it('the selected-hero thumb is a 56px square with cover', () => {
    const thumb = ownDeclarations(scss, '.guidance-editor__hero-thumb {');
    expect(decl(thumb, 'width')).toBe('56px');
    expect(decl(thumb, 'height')).toBe('56px');
    expect(decl(thumb, 'object-fit')).toBe('cover');
  });

  it('the picker item is a 72px square with cover', () => {
    // The img rule is nested in .hero-picker__item: take the inner
    // `img { ... }` block's declarations (no nesting inside it).
    const clean = uncomment(read(`${SRC}/app/features/admin/guidance-editor.scss`));
    const at = clean.indexOf('.hero-picker__item {');
    expect(at).toBeGreaterThanOrEqual(0);
    const blockOpen = clean.indexOf('{', at);
    const block = clean.slice(blockOpen + 1);
    const imgAt = block.indexOf('img {');
    expect(imgAt, 'the nested img rule').toBeGreaterThanOrEqual(0);
    const imgOpen = block.indexOf('{', imgAt);
    const imgClose = block.indexOf('}', imgOpen);
    const imgDecls = block.slice(imgOpen + 1, imgClose);
    expect(decl(imgDecls, 'width')).toBe('72px');
    expect(decl(imgDecls, 'height')).toBe('72px');
    expect(decl(imgDecls, 'object-fit')).toBe('cover');
  });

  it('keeps the srcset/sizes wiring and the no-CLS attributes on both slots', () => {
    const thumb = imgTag(html, ['guidance-editor__hero-thumb']);
    expect(attr(thumb, 'width')).toBe('56');
    expect(attr(thumb, 'height')).toBe('56');
    expect(attr(thumb, 'sizes')).toBe('56px');
    expect(thumb).toContain('[attr.srcset]');

    const picker = imgTag(html, ['asset.url']);
    expect(attr(picker, 'width')).toBe('72');
    expect(attr(picker, 'height')).toBe('72');
    expect(attr(picker, 'sizes')).toBe('72px');
    expect(picker).toContain('[attr.srcset]');
  });
});

// ---------------------------------------------------------------------------
// (b) The admin inventory thumbnails — FIXED SQUARES + cover (the media
//     library table and the guidance order list).
// ---------------------------------------------------------------------------

describe('admin thumbnails (media panel + guidance order list) — fixed squares, cover', () => {
  const mediaScss = read(`${SRC}/app/features/admin/media-panel.scss`);
  const mediaHtml = read(`${SRC}/app/features/admin/media-panel.html`);
  const orderScss = read(`${SRC}/app/features/admin/guidance-order-list.scss`);
  const orderHtml = read(`${SRC}/app/features/admin/guidance-order-list.html`);

  it('the media library thumb is a 48px square with cover', () => {
    const thumb = ownDeclarations(mediaScss, '.admin-media-thumb {');
    expect(decl(thumb, 'width')).toBe('48px');
    expect(decl(thumb, 'height')).toBe('48px');
    expect(decl(thumb, 'object-fit')).toBe('cover');
    const tag = imgTag(mediaHtml, ['admin-media-thumb']);
    // The attribute pair (40x40) and the CSS box (48x48) are the SAME
    // 1:1 ratio — the reservation can never fight the render.
    expect(attr(tag, 'width')!).toEqual(attr(tag, 'height')!);
    expect(attr(tag, 'sizes')).toBe('48px');
    expect(tag).toContain('[attr.srcset]');
  });

  it('the guidance order list thumb is a 40px square with cover', () => {
    const thumb = ownDeclarations(orderScss, '.admin-guidance-thumb {');
    expect(decl(thumb, 'width')).toBe('40px');
    expect(decl(thumb, 'height')).toBe('40px');
    expect(decl(thumb, 'object-fit')).toBe('cover');
    const tag = imgTag(orderHtml, ['admin-guidance-thumb']);
    expect(attr(tag, 'width')!).toEqual(attr(tag, 'height')!);
    expect(attr(tag, 'sizes')).toBe('40px');
    expect(tag).toContain('[attr.srcset]');
  });
});

// ---------------------------------------------------------------------------
// The general invariant: no rule anywhere in the app's stylesheets gives
// an image slot a literal width AND height without object-fit: cover.
// (This is the shape of the old stretch — a future "just add a fixed
// box" fails the suite here.)
// ---------------------------------------------------------------------------

interface Rule {
  selector: string;
  decls: string;
}

/** Flatten every rule (with its nesting context) of one stylesheet. */
function rules(source: string, context = ''): Rule[] {
  const out: Rule[] = [];
  const clean = uncomment(source);
  let i = 0;
  while (i < clean.length) {
    const open = clean.indexOf('{', i);
    if (open === -1) {
      break;
    }
    const selector = (context ? `${context} ` : '') + clean.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < clean.length && depth > 0) {
      if (clean[j] === '{') {
        depth++;
      } else if (clean[j] === '}') {
        depth--;
      }
      j++;
    }
    const inner = clean.slice(open + 1, j - 1);
    const firstNested = inner.indexOf('{');
    const decls = firstNested === -1 ? inner : inner.slice(0, firstNested);
    out.push({ selector, decls });
    out.push(...rules(inner, selector));
    i = j;
  }
  return out;
}

function collectScss(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (dir === `${SRC}/app` && entry === 'vendor') {
      continue; // vendored third-party bytes are not this app's rules
    }
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      collectScss(full, out);
    } else if (entry.endsWith('.scss')) {
      out.push(full);
    }
  }
  return out;
}

describe('app-wide: a fixed image box is never a stretch box', () => {
  const HERO_CLASSES = [
    'guidance-detail__hero',
    'guidance-post__hero',
    'guidance-post__thumb',
    'guidance-editor__hero-thumb',
    'admin-media-thumb',
    'admin-guidance-thumb',
  ];

  it('every fixed width+height rule on an image slot carries object-fit: cover', () => {
    let checked = 0;
    for (const file of collectScss(`${SRC}/app`)) {
      for (const rule of rules(read(file))) {
        const selectors = rule.selector.split(',').map((s) => s.trim());
        const targetsImage = selectors.some(
          (s) => /\bimg\b/.test(s) || HERO_CLASSES.some((c) => s.includes(c)),
        );
        if (!targetsImage) {
          continue;
        }
        const w = rule.decls.match(/(?:^|[;{])\s*width\s*:\s*(\d+(?:\.\d+)?px)/);
        const h = rule.decls.match(/(?:^|[;{])\s*height\s*:\s*(\d+(?:\.\d+)?px)/);
        if (!w || !h) {
          continue; // natural size / ratio box / single-axis — not a fixed box
        }
        checked++;
        expect(rule.decls, `${file} :: ${rule.selector}`).toContain('object-fit: cover');
      }
    }
    expect(checked).toBeGreaterThanOrEqual(4); // the four square slots today
  });
});

// ---------------------------------------------------------------------------
// The SAME invariant, compiled-first — the authority. The text-level scan
// above reads the SCSS as WRITTEN: a box whose size lives behind a Sass
// variable, a nested `&` block, a property split across two rules on the
// same selector, or a case variant is invisible to it until the compiler
// resolves it. The browser only ever sees the compiled CSS, so the audit
// also runs against it: every app stylesheet is compiled with dart-sass
// (the same engine Angular's build uses), the flat rules are parsed with
// the CSS cascade applied per selector (a later declaration of the same
// property wins, so a split `width`/`height` pair still forms a box), and
// any selector that targets an image with a literal px width AND px height
// must resolve object-fit: cover.
//
// Cross-file assembly (CLOSED by the merged test below): in the browser
// the cascade spans files — the element's OWN component stylesheet PLUS
// every page-wide stylesheet (the global `src/styles.scss` and the
// stylesheets of ViewEncapsulation.None components, whose unscoped
// selectors match other components' DOM). A box split across that surface
// — `width` in the slot file, `height` in the global sheet — was invisible
// to the per-file scan. `pageWideScss()` enumerates that surface FROM
// SOURCE (angular.json's global sheet + every None component's styleUrl),
// so a future None component joins the audit without touching this file,
// and the merged test runs the same check over globals-first-then-slot
// cascades (the real bundle order: head styles precede the runtime-
// injected component <style> tags, so on a same-selector tie the slot
// file wins per property). The escape demo at the bottom proves both
// halves: the split box passes the per-file scan and fails the merged one.
//
// Residual (what would close it): a box assembled from DIFFERENT
// selectors on the same element (e.g. a page-wide `img { height }` plus
// the slot's class `width`) is decided per property by specificity and
// source order, and by whether the slot declares its own value — a full
// selector-matching cascade, i.e. a real browser (a getComputedStyle
// probe on the rendered slots, karma/Playwright). The order BETWEEN the
// page-wide files themselves is likewise runtime (injection order of the
// two None components' <style> tags); it only matters for CONFLICTING
// object-fit values on one selector.
// ---------------------------------------------------------------------------

interface CompiledRule {
  selector: string;
  decls: string[];
}

/** Parse compiled (flat) CSS into rules, recursing into at-rules. */
function compiledRules(css: string, out: CompiledRule[] = []): CompiledRule[] {
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) {
      break;
    }
    const pre = css.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') {
        depth++;
      } else if (css[j] === '}') {
        depth--;
      }
      j++;
    }
    const inner = css.slice(open + 1, j - 1);
    if (/^@(media|supports|container)\b/.test(pre)) {
      compiledRules(inner, out);
    } else if (!pre.startsWith('@')) {
      // @keyframes / @font-face / other at-rules carry no slot geometry.
      const decls = inner
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean);
      for (const sel of pre.split(',')) {
        const selector = sel.replace(/\s+/g, ' ').trim();
        if (selector) {
          out.push({ selector, decls });
        }
      }
    }
    i = j;
  }
  return out;
}

/** The CSS cascade per selector: the LAST declaration of a property wins. */
function cascadeBySelector(rules: CompiledRule[]): Map<string, Map<string, string>> {
  const bySelector = new Map<string, Map<string, string>>();
  for (const rule of rules) {
    let props = bySelector.get(rule.selector);
    if (!props) {
      props = new Map();
      bySelector.set(rule.selector, props);
    }
    for (const decl of rule.decls) {
      const colon = decl.indexOf(':');
      if (colon === -1) {
        continue;
      }
      const prop = decl.slice(0, colon).trim().toLowerCase();
      const value = decl.slice(colon + 1).trim();
      if (prop && value) {
        props.set(prop, value);
      }
    }
  }
  return bySelector;
}

const PX_LITERAL = /^\d+(?:\.\d+)?px$/;

const heroClassTargets = (selector: string, heroClasses: string[]): boolean =>
  /\bimg\b/.test(selector) || heroClasses.some((c) => selector.includes(c));

/** The fixed-box check over ONE resolved cascade: violations + how many
    candidate fixed boxes were inspected. */
function fixedBoxViolations(
  resolved: Map<string, Map<string, string>>,
  heroClasses: string[],
  label: string,
): { violations: string[]; checked: number } {
  const violations: string[] = [];
  let checked = 0;
  for (const [selector, props] of resolved) {
    if (!heroClassTargets(selector, heroClasses)) {
      continue;
    }
    const w = props.get('width');
    const h = props.get('height');
    if (!w || !h || !PX_LITERAL.test(w) || !PX_LITERAL.test(h)) {
      continue; // natural size / ratio box / single-axis — not a fixed box
    }
    checked++;
    const fit = props.get('object-fit');
    if (fit !== 'cover' && fit !== 'cover !important') {
      violations.push(
        `${label} :: ${selector} (width: ${w}; height: ${h}) — fixed image box without object-fit: cover`,
      );
    }
  }
  return { violations, checked };
}

/** dart-sass compile, memoized (the merged test reuses the global
    surface's compiled CSS once, not once per slot file). */
const cssCache = new Map<string, string>();
function compileCss(file: string): string {
  let css = cssCache.get(file);
  if (css === undefined) {
    css = sass.compile(file, {
      loadPaths: [`${process.cwd()}/node_modules`],
      style: 'expanded',
    }).css;
    cssCache.set(file, css);
  }
  return css;
}

/**
 * The page-wide cascade surface: the global `src/styles.scss` (angular.json
 * `styles`) PLUS every ViewEncapsulation.None component's stylesheet — a
 * None component's selectors are unscoped, so they match OTHER components'
 * DOM (the browser cascades them with the element's own rules). Enumerated
 * from source at spec time: a future None component joins the surface
 * without touching this file. (Only the two known None components today:
 * the guidance editor — Quill's runtime DOM needs unscoped rules — and the
 * accessibility dialog, which hosts the black-and-yellow theme.)
 */
function pageWideScss(): string[] {
  const out = [`${SRC}/styles.scss`];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (dir === `${SRC}/app` && entry === 'vendor') {
        continue; // vendored third-party bytes are not this app's rules
      }
      const full = `${dir}/${entry}`;
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.endsWith('.ts') || entry.endsWith('.spec.ts')) {
        continue;
      }
      const source = read(full);
      if (!/encapsulation:\s*ViewEncapsulation\.None/.test(source)) {
        continue;
      }
      const styleUrl = source.match(/styleUrl:\s*'([^']+)'/);
      if (styleUrl) {
        const rel = styleUrl[1];
        // A relative './x.scss' (Angular's styleUrl idiom) — the only
        // shape this repo uses; anything else is a spec-time error, not
        // a silently-wrong surface. (No node:path — the project's
        // ambient node types cover node:fs only, src/node-fs.d.ts.)
        if (rel.includes('..')) {
          throw new Error(`pageWideScss: unsupported styleUrl ${rel} in ${full}`);
        }
        out.push(`${dir}/${rel.replace(/^\.\//, '')}`);
      }
    }
  };
  walk(`${SRC}/app`);
  return out;
}

const COMPILED_HERO_CLASSES = [
  'guidance-detail__hero',
  'guidance-post__hero',
  'guidance-post__thumb',
  'guidance-editor__hero-thumb',
  'admin-media-thumb',
  'admin-guidance-thumb',
];

describe('app-wide (compiled): a fixed image box is never a stretch box', () => {
  it('every compiled fixed width+height rule on an image slot resolves object-fit: cover', () => {
    let checked = 0;
    const violations: string[] = [];
    for (const file of collectScss(`${SRC}/app`)) {
      const resolved = cascadeBySelector(compiledRules(compileCss(file)));
      const result = fixedBoxViolations(resolved, COMPILED_HERO_CLASSES, file);
      checked += result.checked;
      violations.push(...result.violations);
    }
    expect(violations).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(4); // the four square slots today
  });
});

describe('app-wide (compiled, page-wide cascade): a fixed image box is never a stretch box', () => {
  it('a box assembled across the slot file and the page-wide surface still resolves cover', () => {
    const allFiles = [...new Set([...collectScss(`${SRC}/app`), ...pageWideScss()])];
    const globalRules = pageWideScss().flatMap((file) => compiledRules(compileCss(file)));
    let checked = 0;
    const violations: string[] = [];
    for (const file of allFiles) {
      // Globals first, the slot file last — the real bundle order (head
      // styles precede the injected component <style>), so on a
      // same-selector tie the slot file wins per property, like the
      // browser.
      const merged = cascadeBySelector([...globalRules, ...compiledRules(compileCss(file))]);
      const result = fixedBoxViolations(merged, COMPILED_HERO_CLASSES, `${file} + page-wide`);
      checked += result.checked;
      violations.push(...result.violations);
    }
    expect(violations).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(4); // the four square slots today
  });
});

describe('cross-file escape demo: the split box', () => {
  // THE form the per-file scan could not see: a page-wide stylesheet (a
  // None component or the global sheet) declares half the box, the slot
  // file the other half — the browser merges them into a fixed 400x300
  // box with no object-fit (the stretch the owner reported). Proven with
  // synthetic CSS through the SAME checker the real-tree tests run:
  // per-file (the old residual) it passes; merged (the browser's view)
  // it fails.
  const SLOT_FILE_CSS = `.guidance-detail__hero { width: 400px; }`;
  const GLOBAL_FILE_CSS = `.guidance-detail__hero { height: 300px; }`;

  it('passes the per-file scan (what the pre-closure spec saw)', () => {
    const perFileSlot = fixedBoxViolations(
      cascadeBySelector(compiledRules(SLOT_FILE_CSS)),
      COMPILED_HERO_CLASSES,
      'slot file',
    );
    const perFileGlobal = fixedBoxViolations(
      cascadeBySelector(compiledRules(GLOBAL_FILE_CSS)),
      COMPILED_HERO_CLASSES,
      'global file',
    );
    // One axis each — neither file alone forms a fixed box.
    expect(perFileSlot.violations).toEqual([]);
    expect(perFileSlot.checked).toBe(0);
    expect(perFileGlobal.violations).toEqual([]);
    expect(perFileGlobal.checked).toBe(0);
  });

  it('fails the merged page-wide cascade (what the browser renders)', () => {
    const merged = cascadeBySelector([
      ...compiledRules(GLOBAL_FILE_CSS),
      ...compiledRules(SLOT_FILE_CSS),
    ]);
    const result = fixedBoxViolations(merged, COMPILED_HERO_CLASSES, 'slot file + page-wide');
    expect(result.checked).toBe(1);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain('.guidance-detail__hero');
    expect(result.violations[0]).toContain('width: 400px');
    expect(result.violations[0]).toContain('height: 300px');
  });
});

// ---------------------------------------------------------------------------
// Theme invariance: the three themes are token layers only. If a theme
// ever gained a geometry declaration, the per-slot contracts above would
// silently stop applying in that theme — pin the absence.
// ---------------------------------------------------------------------------

describe('the theme layers carry no geometry (all three themes)', () => {
  it('the high-contrast block declares no width/height/object-fit/aspect-ratio', () => {
    const styles = read(`${SRC}/styles.scss`);
    const block = ownDeclarations(styles, "[data-theme='high-contrast'] {");
    // ownDeclarations stops at the first nested rule — the block is flat
    // (token overrides only), so this is the whole theme layer.
    expect(block).not.toMatch(/object-fit|aspect-ratio/);
    expect(block).not.toMatch(/(^|[^-\w])width\s*:/);
    expect(block).not.toMatch(/(^|[^-\w])height\s*:/);
  });

  it('the black-and-yellow runtime tokens are colour-only names', () => {
    const source = read(`${SRC}/app/core/theme-tokens.ts`);
    const names = [...source.matchAll(/'(--[a-z0-9-]+)'\s*:/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(10);
    for (const name of names) {
      expect(name, 'a geometry token in the theme map').toMatch(/^--color-/);
    }
  });
});
