/**
 * Hero geometry audit (Wave 13 — the owner's "stretched hero" report).
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
  const end =
    nextOpen === -1 || (close !== -1 && close < nextOpen) ? close : nextOpen;
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
