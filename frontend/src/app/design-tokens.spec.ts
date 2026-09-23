import { readFileSync, readdirSync, statSync } from 'node:fs';
import * as sass from 'sass';

/**
 * Token audit (spec: "Unified design tokens").
 *
 * The token set lives once in src/styles.scss :root; component stylesheets
 * must reference tokens instead of literals. This spec makes that rule
 * fail-fast: a new hardcoded colour/font value anywhere under src/ fails
 * the suite instead of drifting silently. New .scss files are picked up
 * automatically — no list to maintain.
 *
 * Rules:
 *  1. Hex colours and rgb()/rgba() may only appear inside the styles.scss
 *     :root token block OR the [data-theme='high-contrast'] override block
 *     (accessibility-and-provenance D1: the theme overrides the SAME token
 *     names — values differ by theme, names are stable — so it is a token
 *     block too; its literals are the documented, contrast-verified values).
 *  2. Stylesheets outside styles.scss may not use literal font-size /
 *     font-weight — the type tokens must be used instead.
 *  3. @media queries must use the documented narrow breakpoint (900px,
 *     the --bp-narrow value — @media cannot consume var() in browsers).
 *
 * Documented literal exceptions kept in component styles (commented in
 * place): line weights (1/2/3px borders and outlines) and page-specific
 * layout dimensions (map heights, sidebar width).
 */

/**
 * src/ — the test runner's cwd is the frontend project root
 * (`npx ng test` runs from frontend/), so resolve against it.
 */
const SRC_DIR = `${process.cwd()}/src`;

function collectScss(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    // src/vendor/** is vendored third-party bytes (Quill 2.0.3 and its
    // snow CSS — see src/vendor/quill/README.md): the token audit
    // governs THIS app's stylesheets only. Auditing a dependency's own
    // literals would fail on them, and a re-vendor of a new upstream
    // version could never be trusted to pass. (Quill's stylesheet is a
    // .css today, which the .scss walk would skip anyway — the guard
    // keeps that true if a re-vendor ever ships an .scss.)
    if (dir === SRC_DIR && entry === 'vendor') {
      continue;
    }
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      out.push(...collectScss(full));
    } else if (entry.endsWith('.scss')) {
      out.push(full);
    }
  }
  return out;
}

const NARROW_BREAKPOINT = '900px';
const STYLE_FILES = collectScss(SRC_DIR);
const STYLES_FILE = STYLE_FILES.find((f) => f.endsWith('src/styles.scss'));

function violations(css: string, pattern: RegExp): string[] {
  const out: string[] = [];
  css.split('\n').forEach((line, i) => {
    if (pattern.test(line)) {
      out.push(`line ${i + 1}: ${line.trim()}`);
    }
  });
  return out;
}

/** Line indexes (0-based) inside one flat `{ selector } { ... }` block. */
function blockLines(css: string, selector: RegExp): Set<number> {
  const inside = new Set<number>();
  let inBlock = false;
  let depth = 0;
  css.split('\n').forEach((line, i) => {
    if (!inBlock && selector.test(line)) {
      inBlock = true;
      depth = 0;
    }
    if (inBlock) {
      inside.add(i);
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      if (depth <= 0) {
        inBlock = false;
      }
    }
  });
  return inside;
}

/**
 * Blank out CSS block comments (keep every newline) — line numbers and
 * brace balance stay intact, and a guard below can only be satisfied by
 * a real declaration, never by prose.
 */
function withoutCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * The brace-balanced block that opens at the first line matching
 * `selector` (a selector that spans lines — `th,` / `td {` — may match a
 * line without the opening brace). Unlike an unbounded regex, which
 * over-runs the rule into the rest of the file (a comment or a later
 * rule then satisfies the assertion), the scan stops at the matching
 * close. The same idiom page-shell.spec.ts' narrowBlock() uses.
 */
function balancedBlock(css: string, selector: RegExp): string | null {
  const lines = css.split('\n');
  for (let start = 0; start < lines.length; start++) {
    if (!selector.test(lines[start])) continue;
    let depth = 0;
    let opened = false;
    for (let i = start; i < lines.length; i++) {
      const opens = (lines[i].match(/\{/g) ?? []).length;
      const closes = (lines[i].match(/\}/g) ?? []).length;
      if (!opened) {
        if (closes > 0) return null; // something closed before our block opened
        if (opens === 0) continue;
        opened = true;
      }
      depth += opens - closes;
      if (depth <= 0) return lines.slice(start, i + 1).join('\n');
    }
    return null; // opened but never closed
  }
  return null;
}

/**
 * Every selector-list HEAD of compiled CSS — the compiled-CSS counterpart of
 * the raw-text scanners below. Dart Sass flattens the nesting it accepts:
 * `.shelter-marker { &.shelter-marker--new { … } }` compiles to
 * `.shelter-marker.shelter-marker--new { … }`, and a re-spaced re-addition
 * compiles to the same top-level rule — so a compiled scan sees every SCSS
 * spelling of the same rule. The expanded output keeps block comments, so
 * they are stripped first (a comment mentioning a class is not a rule).
 * A head is the text between a closing brace (or the start of the file) and
 * the next opening brace: rule selectors, plus at-rule preludes and
 * keyframe steps, none of which can carry a class selector. Declarations
 * live inside the braces and are never scanned — a `var(--color-new)`
 * reference cannot be mistaken for a rule. (The raw bytes of this file may
 * carry the class name in prose; the compiled selector lists may not.)
 */
function compiledSelectorHeads(css: string): string[] {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const heads: string[] = [];
  let start = 0;
  for (let i = 0; i < flat.length; i++) {
    const ch = flat[i];
    if (ch === '{') {
      heads.push(flat.slice(start, i));
      start = i + 1;
    } else if (ch === '}') {
      start = i + 1;
    }
  }
  return heads;
}

/* --- Wave 15 — single-side accent borders (owner: the `border-left:
 *     3px solid var(--color-primary)` bar reads machine-generated). The
 *     guards below run over COMPILED declarations, not raw text: every
 *     SCSS spelling of the same declaration — top-level, nested-compound,
 *     @media-wrapped, re-spaced — compiles to the same flat `prop: value`
 *     pair, so no nesting or re-spacing can defeat the scan (the text-
 *     pattern class this repo already proved hollow, 15-delivery-audit
 *     M7b/M7c). Logical-property (RTL) spellings are in the same family. --- */

/**
 * EVERY declaration of a compiled stylesheet — { head, prop, value } —
 * the compiled-CSS companion of the raw-text scanners above. `head` is
 * the text before the opening brace: the rule's selector list, an
 * at-rule prelude, or a keyframe step (from / 50% / to). The walker
 * recurses into a body only when it contains a brace — in compiled CSS a
 * declaration can never contain one, so a braced body holds nested rules
 * (@media / @supports / @keyframes steps) and a flat one holds
 * declarations. Comments are stripped first (compiled output keeps them),
 * so prose can never satisfy or mask a check, and values are tokenised
 * by the classifier below, never matched as strings.
 */
function compiledDeclarations(css: string): { head: string; prop: string; value: string }[] {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: { head: string; prop: string; value: string }[] = [];
  const pushDecl = (decl: string, head: string) => {
    const i = decl.indexOf(':');
    if (i === -1) return;
    const prop = decl.slice(0, i).trim();
    const value = decl.slice(i + 1).trim();
    if (prop !== '') out.push({ head, prop, value });
  };
  const parseDecls = (body: string, head: string) => {
    let buf = '';
    let depth = 0;
    for (const ch of body) {
      if (ch === '(') depth += 1;
      if (ch === ')') depth -= 1;
      if (ch === ';' && depth === 0) {
        const decl = buf.trim();
        buf = '';
        if (decl !== '') pushDecl(decl, head);
        continue;
      }
      buf += ch;
    }
    const decl = buf.trim();
    if (decl !== '') pushDecl(decl, head);
  };
  const walk = (text: string) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open === -1) return;
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth += 1;
        else if (text[j] === '}') depth -= 1;
        j += 1;
      }
      const head = text.slice(i, open).trim().split(';').pop()!.trim();
      // (A preceding at-rule prelude — `@charset "UTF-8";` — ends in a
      // semicolon and carries no declarations: cut it off so the head is
      // the selector/at-rule it actually belongs to.)
      const body = text.slice(open + 1, j - 1);
      if (body.includes('{')) walk(body);
      else parseDecls(body, head);
      i = j;
    }
  };
  walk(flat);
  return out;
}

const BORDER_STYLE_WORDS = new Set([
  'none',
  'hidden',
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]);
const PAINTING_STYLES = new Set([
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]);
const WIDTH_KEYWORDS: Record<string, number> = { thin: 1, medium: 3, thick: 4 };
/** The only colours the codebase's structural 1px hairlines are painted
 *  with — the documented divider family. Anything else on ONE side is an
 *  accent, whatever its width. */
const NEUTRAL_DIVIDER_COLORS = new Set([
  '--color-border',
  '--color-border-subtle',
  '--color-chrome-border',
  'transparent',
  'currentcolor',
]);

/** The px width a border-width token denotes (the plausible non-px units
 *  converted at their CSS reference sizes; null = not a width token). */
function borderWidthPx(token: string): number | null {
  if (token in WIDTH_KEYWORDS) return WIDTH_KEYWORDS[token];
  const m = token.match(/^(\d+(?:\.\d+)?)(px|em|rem|pt|pc|ex|ch|vw|vh|vmin|vmax)?$/);
  if (m === null) return null;
  const factor =
    m[2] === 'em' || m[2] === 'rem' || m[2] === 'pc' ? 16 : m[2] === 'pt' ? 16 / 12 : m[2] === 'ex' || m[2] === 'ch' ? 8 : 1;
  return Number(m[1]) * factor;
}

function isNeutralDividerColour(color: string | null): boolean {
  if (color === null) return true;
  const c = color.trim().toLowerCase();
  if (NEUTRAL_DIVIDER_COLORS.has(c)) return true;
  const m = c.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  return m !== null && NEUTRAL_DIVIDER_COLORS.has(m[1]);
}

/** Decompose a `border`-family shorthand value into the per-side widths
 *  (1 value → all four, 2 → top/bottom + left/right, 3 → top + left/right
 *  + bottom, 4 → top/right/bottom/left), the style word, and the leftover
 *  colour. The token positions are order-independent, exactly as CSS. */
function decomposeBorderShorthand(value: string): {
  widths: number[];
  style: string | null;
  color: string | null;
} {
  let widths: number[] = [];
  let style: string | null = null;
  const colorParts: string[] = [];
  for (const t of value.trim().split(/\s+/)) {
    if (style === null && BORDER_STYLE_WORDS.has(t)) {
      style = t;
      continue;
    }
    const w = borderWidthPx(t);
    if (w !== null && widths.length < 4) {
      widths.push(w);
      continue;
    }
    colorParts.push(t);
  }
  let perSide: number[];
  if (widths.length === 1) perSide = [widths[0], widths[0], widths[0], widths[0]];
  else if (widths.length === 2) perSide = [widths[0], widths[1], widths[0], widths[1]];
  else if (widths.length === 3) perSide = [widths[0], widths[1], widths[2], widths[1]];
  else if (widths.length === 4) perSide = widths;
  else perSide = [];
  return { widths: perSide, style, color: colorParts.length > 0 ? colorParts.join(' ') : null };
}

/** True when the property sets a single side (or the per-side set) of a
 *  border/outline — physical AND logical (RTL) sides, shorthands and the
 *  -width/-color longhands. A `border`/`border-width` shorthand belongs
 *  to the family because its 2/3/4-value spellings encode single sides. */
function isSingleSideBorderProperty(prop: string): boolean {
  const p = prop.toLowerCase();
  return (
    p === 'border' ||
    p === 'border-width' ||
    /^(?:border|outline)-(?:top|right|bottom|left)(?:-(?:width|style|color))?$/.test(p) ||
    /^border-inline-(?:start|end)(?:-(?:width|style|color))?$/.test(p)
  );
}

/** The Wave 15 accent test on ONE declaration: null = no border painted,
 *  or a structural 1px neutral hairline / full-perimeter line weight;
 *  a string = why this is the removed accent bar. Widths are compared
 *  per side after decomposition, so `border: 0 0 0 3px solid var(--x)`
 *  is caught exactly like `border-left: 3px solid var(--x)`. */
function singleSideAccentOffense(prop: string, value: string): string | null {
  const p = prop.toLowerCase();
  const v = value.replace(/!important$/i, '').trim().toLowerCase();
  if (v === 'none' || v === 'hidden' || v === '0' || v === '0px') return null;
  if (p === 'border' || p === 'border-width') {
    const { widths, color } = decomposeBorderShorthand(v);
    if (widths.length === 0) return null; // no width component at all
    if (new Set(widths).size === 1) return null; // one width on all four sides = a full border (the documented line weight), not a one-side bar
    const wide = widths.find((w) => w > 1);
    if (wide !== undefined) return `the ${p} shorthand sets one side to ${wide}px (> 1px)`;
    if (!isNeutralDividerColour(color)) {
      return `the ${p} shorthand paints one side in the non-neutral colour "${color}"`;
    }
    return null; // unequal but every side ≤ 1px in a divider colour — an offset hairline
  }
  if (p.endsWith('-width')) {
    const w = borderWidthPx(v);
    return w !== null && w > 1 ? `a single-side border width of ${w}px` : null;
  }
  if (p.endsWith('-color')) {
    return isNeutralDividerColour(v)
      ? null
      : `a single-side border colour that is not a neutral divider token ("${v}")`;
  }
  if (p.endsWith('-style')) return null; // sets neither width nor colour — the width/colour shorthands are the bar vector
  // Single-side shorthand (border-left / border-inline-start / outline-top …):
  // width? style? colour? in any order.
  const { widths, style, color } = decomposeBorderShorthand(v);
  if (style === null || !PAINTING_STYLES.has(style)) return null; // no style (or none/hidden) → nothing paints
  const w = widths.length > 0 ? Math.max(...widths) : 3; // width omitted: the initial border-width is `medium` (3px)
  if (w > 1) return `a single-side border of ${w}px`;
  if (!isNeutralDividerColour(color)) return `a single-side border in the non-neutral colour "${color}"`;
  return null;
}

/**
 * EVERY brace-balanced block whose selector line matches `selector` — the
 * all-occurrence sibling of {@link balancedBlock}. The first-match idiom it
 * replaces is the exact hole the sweep's mutation proof exposed in the
 * <td>-class guard: a `display` declared for the same class in a LATER rule
 * (an @media override, a more specific selector) sat outside the first
 * match and was invisible, and a class with no rule at all was silently
 * `continue`d, so "unchecked" read as "clean". The scan therefore covers
 * every occurrence at every nesting depth — a rule nested in @media is a rule
 * too, and a narrow-width display:flex on a <td> splits the row separator
 * exactly as badly as a top-level one — and the CALLER must treat an empty
 * result as a failure (a renamed/deleted rule), never as a pass.
 */
function allBalancedBlocks(css: string, selector: RegExp): string[] {
  const lines = css.split('\n');
  const blocks: string[] = [];
  for (let start = 0; start < lines.length; start++) {
    if (!selector.test(lines[start])) continue;
    let depth = 0;
    let opened = false;
    let end = -1;
    for (let i = start; i < lines.length; i++) {
      const opens = (lines[i].match(/\{/g) ?? []).length;
      const closes = (lines[i].match(/\}/g) ?? []).length;
      if (!opened) {
        if (closes > 0) {
          // The match sat inside an earlier rule's declarations, not in a
          // selector: skip past the end of that rule for the next candidate.
          end = i;
          break;
        }
        if (opens === 0) continue;
        opened = true;
      }
      depth += opens - closes;
      if (depth <= 0) {
        end = i;
        blocks.push(lines.slice(start, i + 1).join('\n'));
        break;
      }
    }
    if (end === -1) break; // opened but never closed (or the file ended)
    start = end; // the next candidate sits after this block
  }
  return blocks;
}

describe('design tokens (M6)', () => {
  const stylesCss = readFileSync(STYLES_FILE ?? '', 'utf8');
  // The COMPILED stylesheet — the absence pins below run against this, not
  // the raw SCSS bytes (see compiledSelectorHeads for why). node_modules is
  // the load path for the `@use 'leaflet/dist/leaflet.css'` at the top of
  // the file.
  const compiledStyles = sass.compile(STYLES_FILE ?? '', {
    loadPaths: [`${process.cwd()}/node_modules`],
    style: 'expanded',
  });
  const rootLines = blockLines(stylesCss, /^\s*:root\s*\{/);
  // D1: the high-contrast theme overrides the SAME token names with theme
  // values — its hex/rgba literals are the token block's second home.
  const themeLines = blockLines(stylesCss, /^\s*\[data-theme='high-contrast'\]\s*\{/);
  const tokenLines = new Set([...rootLines, ...themeLines]);
  const audited = STYLE_FILES.map((f) => {
    const name = f.slice(SRC_DIR.length + 1);
    return [name, readFileSync(f, 'utf8'), f === STYLES_FILE] as const;
  });

  it('audits a non-trivial set of stylesheets', () => {
    expect(STYLE_FILES.length).toBeGreaterThanOrEqual(12);
  });

  it('styles.scss — colour literals only inside the :root token block or the theme block', () => {
    stylesCss.split('\n').forEach((line, i) => {
      const isColour = /#[0-9a-fA-F]{3,8}\b/.test(line) || /rgba?\(/.test(line);
      if (isColour) {
        expect(
          tokenLines.has(i),
          `colour literal outside the :root / high-contrast token blocks — line ${i + 1}: ${line.trim()}`,
        ).toBe(true);
      }
    });
  });

  it('styles.scss — the high-contrast theme block overrides a sampled set of token names (D1)', () => {
    // Names are stable across themes (same names, values differ) — sample
    // the load-bearing tokens so a rename/typo in the override block fails.
    const themeCss = [...themeLines].map((i) => stylesCss.split('\n')[i]).join('\n');
    for (const token of [
      '--color-text',
      '--color-muted',
      '--color-bg',
      '--color-bg-surface',
      '--color-surface-overlay',
      '--color-primary',
      '--color-chrome-bg',
      '--color-chrome-text',
      '--color-cta',
      '--color-reported',
      '--color-border',
      '--color-danger',
      '--color-success',
      '--color-warning',
      '--color-info',
      '--color-badge-registry',
      '--color-shelter-registry',
    ]) {
      expect(themeCss, `high-contrast block missing ${token}`).toContain(`${token}:`);
    }
  });

  /* --- The theme is pinned HARD — name-set equality (both directions)
     + the contrast math behind the styles.scss "verified for this palette"
     comment. The math runs on the token LITERALS, so a value edit that
     breaks a WCAG threshold fails the suite instead of drifting. --- */

  /** WCAG 2.1 relative luminance of a #rrggbb / #rgb colour. */
  function relativeLuminance(hex: string): number {
    let value = hex.replace('#', '').trim();
    if (value.length === 3) {
      value = value
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const channel = (part: string): number => {
      const c = Number.parseInt(part, 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return (
      0.2126 * channel(value.slice(0, 2)) +
      0.7152 * channel(value.slice(2, 4)) +
      0.0722 * channel(value.slice(4, 6))
    );
  }

  /** WCAG contrast ratio (>= 1) between two colours. */
  function contrast(foreground: string, background: string): number {
    const [hi, lo] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
      (a, b) => b - a,
    );
    return (hi + 0.05) / (lo + 0.05);
  }

  /** Hue (0-360) of a #rrggbb colour — the yellow-band check for the
   *  black-and-yellow muted token (the same 45-65° band the marker-meaning
   *  test holds the yellow pin tone to). */
  function hueOf(hex: string): number {
    const v = hex.replace('#', '').trim();
    const r = Number.parseInt(v.slice(0, 2), 16) / 255;
    const g = Number.parseInt(v.slice(2, 4), 16) / 255;
    const b = Number.parseInt(v.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return h;
  }

  /** CSS color-mix(in srgb, A p%, B): the per-channel sRGB blend the
   *  browser computes, rounded to 8-bit per channel (the browser paints
   *  8-bit sRGB, so the spec models the painted value, not the float). */
  function colorMix(a: string, b: string, pct: number): string {
    const expand = (hex: string): string => {
      let v = hex.replace('#', '');
      if (v.length === 3)
        v = v
          .split('')
          .map((c) => c + c)
          .join('');
      return v;
    };
    const A = expand(a);
    const B = expand(b);
    const channel = (i: number): number =>
      Math.round(
        (parseInt(A.slice(i, i + 2), 16) * pct) / 100 +
          (parseInt(B.slice(i, i + 2), 16) * (100 - pct)) / 100,
      );
    return '#' + [0, 2, 4].map((i) => channel(i).toString(16).padStart(2, '0')).join('');
  }

  /** --color* token name -> literal value, from one token block's lines. */
  function colorTokens(lines: Set<number>): Map<string, string> {
    const out = new Map<string, string>();
    const css = stylesCss.split('\n');
    for (const i of lines) {
      const match = css[i].match(/(--color-[\w-]+)\s*:\s*([^;]+);/);
      if (match !== null) {
        out.set(match[1], match[2].trim());
      }
    }
    return out;
  }

  /** --color* token name -> literal value, from the theme-tokens.ts
   *  BLACK_AND_YELLOW_TOKENS map (quoted keys: the only place in the file
   *  where a --color-* name carries a 'name': 'value' pair). */
  function tsColorTokens(source: string): Map<string, string> {
    const out = new Map<string, string>();
    // Scanned across NEWLINES, not per line: Prettier reflows a long entry so
    // the value lands on the next line (the trailing comment moves after the
    // value), and a line-based scan then reports the token as missing — making
    // a formatting-only change fail the parity + contrast guards (owner-
    // reported: the suite went red after a formatter pass over
    // theme-tokens.ts). Only colour literals are taken, so the check keeps its
    // power: a genuinely dropped entry still has no match.
    for (const match of source.matchAll(
      /'(--color-[\w-]+)'\s*:\s*'(#[0-9a-fA-F]{3,8}|rgba?\([^']*\))'/gs,
    )) {
      out.set(match[1], match[2].trim());
    }
    return out;
  }

  const rootTokens = colorTokens(rootLines);
  const themeTokens = colorTokens(themeLines);
  // The black-and-yellow theme's values are runtime tokens (theme-tokens.ts
  // — the audit keeps hex literals out of SCSS, so this theme has no SCSS
  // block to parse). Parse the TS map into the same name -> literal shape
  // and hold it to the same contrast math + the same name-set rule.
  const byTokens = tsColorTokens(readFileSync(`${SRC_DIR}/app/core/theme-tokens.ts`, 'utf8'));

  type ContrastPair = {
    theme: 'light' | 'high-contrast' | 'black-and-yellow';
    fg: string;
    bg: string;
    min: number;
  };

  const TEXT_PAIRS: [string, string][] = [
    // Body text on every surface it actually renders on.
    ['--color-text', '--color-bg'],
    ['--color-text', '--color-bg-surface'],
    // Wave 15: this is the proof-note's substitution pair — the border-left
    // accent went, the subtle fill stayed, and the text on that fill is the
    // pair this check enforces (all three themes, 4.5:1).
    ['--color-text', '--color-bg-subtle'],
    ['--color-text', '--color-surface-hover'],
    ['--color-muted', '--color-bg'],
    ['--color-muted', '--color-bg-surface'],
    ['--color-muted', '--color-bg-subtle'],
    ['--color-muted', '--color-surface-hover'],
    // Banner text on its own fill (BannerComponent severity backgrounds).
    ['--color-danger', '--color-danger-bg'],
    // Error text on the page background and on the card surface (.field-error,
    // .anchor-search__error, .admin-reason__error and kin): the surfaces the
    // reported "error messages still red in black-and-yellow" render on. BY
    // 14.67:1 (the danger voice is the theme yellow there), light 5.41/5.86:1,
    // high-contrast 8.64/8.04:1.
    ['--color-danger', '--color-bg'],
    ['--color-danger', '--color-bg-surface'],
    ['--color-warning', '--color-warning-bg'],
    ['--color-info', '--color-info-bg'],
    ['--color-success', '--color-success-bg'],
    // Admin editor error text on the page surface — .admin-reason__error
    // (admin-page.scss, the reject-reason 400 line) is the pair's only live
    // consumer (the review form is gone).
    ['--color-error', '--color-bg-surface'],
    // Button text: btn--primary and the crisis CTA both set their text to
    // --color-bg-surface (light: white on blue/orange; high-contrast flips
    // to dark on the brightened fills — both directions checked). The
    // reported-state badge/marker (shelter-trust-and-reports D6) uses the
    // same pair: white on #c2410c (5.18:1) / dark on #ffa94d (9.68:1).
    ['--color-bg-surface', '--color-primary'],
    ['--color-bg-surface', '--color-cta'],
    ['--color-bg-surface', '--color-reported'],
    // Source/trust badge text on its fill (shelter-detail-page .badge).
    // The map rows use the same pair over a color-mix TINT — that computed
    // fill is a different surface and is enforced separately (MIXED_PAIRS
    // below re-derives the mix and checks the pair per theme). Wave-8
    // re-tint: the Community-checked badge text is the VERIFIED green
    // (the badge is the "confirmed by a verified submitter" cue; the
    // unverified/half-verified pins are the yellow marker tones and the
    // NEW badge is the solid warning chip below) — 4.67:1 light /
    // 8.05:1 dark, re-run by the spec on the literals.
    ['--color-shelter-registry', '--color-badge-registry'],
    ['--color-verified', '--color-badge-user'],
    // "Newly added" badge text on its fill — the same light-tint + dark-text
    // treatment as the sibling badges above: light #6b4e00 on #fbf0bf =
    // 6.75:1, the dark themes #ffd400 on #33260a = 10.31:1 (checked per
    // theme, like every pair in this list).
    ['--color-badge-new-text', '--color-badge-new'],
    // Chrome band (header + footer + <900 menu panel): every text pair on
    // the band, every theme. Light + high-contrast: the navy band —
    // 13.57 / 8.80 / 7.18 / 7.20:1 (the HC block pins the same values and
    // the HC name-set test above keeps them declared). Black-and-yellow:
    // the band IS the theme — black with yellow text (the runtime tokens
    // in theme-tokens.ts, the owner's "yellow text, black background"):
    // 14.67 / 10.47 / 14.67 / 14.67:1.
    ['--color-chrome-text', '--color-chrome-bg'],
    ['--color-chrome-muted', '--color-chrome-bg'],
    ['--color-chrome-focus', '--color-chrome-bg'],
    ['--color-chrome-active', '--color-chrome-bg'],
  ];

  /** --color-shelter-pick × the HC surfaces it could sit on (HC-only, see
   *  the note in CONTRAST_CHECKS). */
  const HC_ONLY_TEXT_PAIRS: [string, string][] = [
    ['--color-shelter-pick', '--color-bg'],
    ['--color-shelter-pick', '--color-bg-surface'],
    ['--color-shelter-pick', '--color-bg-subtle'],
  ];

  /** --color-link × the B&Y surface (B&Y-only — the other two themes have
   *  no link token; their links ride on --color-primary, already checked
   *  as the btn--primary text pair above). The map's OSM attribution link
   *  renders on the black B&Y attribution strip (the theme-layer override)
   *  and the chrome-band links on the black band — both are this pair
   *  (16.11:1). */
  const BY_ONLY_TEXT_PAIRS: [string, string][] = [['--color-link', '--color-bg-surface']];

  const CONTRAST_CHECKS: ContrastPair[] = [
    // Text: WCAG AA 4.5:1, every theme.
    ...TEXT_PAIRS.flatMap(([fg, bg]) =>
      (['light', 'high-contrast', 'black-and-yellow'] as const).map((theme) => ({
        theme,
        fg,
        bg,
        min: 4.5,
      })),
    ),
    // Non-text (UI component boundary / graphical object): 3:1.
    ...(
      [
        ['--color-border', '--color-bg-surface'],
        ['--color-border', '--color-bg'],
        // Grey ghost buttons on the chrome band (page-shell.scss
        // .shell-header .btn--ghost): the resting and hover FILLS against
        // the navy band, and the ordinary --color-border the button now
        // carries on the band. The resting fill is --color-bg — the page
        // background a body ghost shows through its transparent rest.
        // (The ink-on-fill text pairs need no new entries: --color-text
        // on --color-bg and --color-surface-hover are already in
        // TEXT_PAIRS at 4.5:1, both themes.)
        ['--color-bg', '--color-chrome-bg'],
        ['--color-surface-hover', '--color-chrome-bg'],
        ['--color-border', '--color-chrome-bg'],
      ] as [string, string][]
    ).flatMap(([fg, bg]) =>
      (['light', 'high-contrast'] as const).map((theme) => ({ theme, fg, bg, min: 3 })),
    ),
    // Black-and-yellow UI boundaries: the band's background is pure black,
    // so its edges clear 3:1 here (divider + ghost-button edge 4.58:1,
    // the ghost's resting/hover fills are the documented exemptions
    // below) — where the other two themes document the navy band's edges
    // as decorative sub-3:1 pairs. The danger border joins the set in this
    // theme alone: it is the error surfaces' FULL border — the non-colour
    // error cue (7.40:1 on black), while light/high-contrast keep the
    // soft decorative banner border.
    ...(
      [
        ['--color-border', '--color-chrome-bg'],
        ['--color-border', '--color-bg-surface'],
        ['--color-border', '--color-bg'],
        ['--color-chrome-border', '--color-chrome-bg'],
        ['--color-danger-border', '--color-bg'],
      ] as [string, string][]
    ).map(([fg, bg]) => ({ theme: 'black-and-yellow' as const, fg, bg, min: 3 })),
    // HC-only text pairs (not checked in light, where the value is a
    // graphical-object fill, not a text colour): the map is not themed —
    // its surface stays light in every theme — so the pick pin is the map
    // colour that could sit on the dark HC page. The pin is the teal
    // selected-point accent (it was red — red now means "reported"); the
    // HC value is the brightened teal #4dd0c4 (a safe superset) so the
    // token holds 4.5:1 on every HC surface if it ever serves as text
    // (today it is used only as the /submit pin fill + the anchor
    // diamond). No token pair sits below threshold — the user-reported
    // dark-on-dark came from UA-default colours instead (see the "form
    // controls and links" test below).
    ...HC_ONLY_TEXT_PAIRS.map(([fg, bg]) => ({
      theme: 'high-contrast' as const,
      fg,
      bg,
      min: 4.5,
    })),
    // Black-and-yellow-only text pairs (the theme's own --color-link token).
    ...BY_ONLY_TEXT_PAIRS.map(([fg, bg]) => ({
      theme: 'black-and-yellow' as const,
      fg,
      bg,
      min: 4.5,
    })),
  ];

  /** Documented sub-threshold tokens — the honest complement of the checks
   *  above. The "exemptions are honest" test below verifies each pair
   *  really is below its threshold, so a token that gets fixed MUST be
   *  moved back into the checks (a stale exemption fails the suite). */
  const CONTRAST_EXEMPTIONS: (ContrastPair & { reason: string })[] = [
    {
      theme: 'light',
      fg: '--color-border',
      bg: '--color-bg-surface',
      min: 3,
      reason:
        'non-text input/card boundary (1.42:1) — borders are not text; the control is identified by its fill + label',
    },
    {
      theme: 'light',
      fg: '--color-border',
      bg: '--color-bg',
      min: 3,
      reason: 'non-text card/list-row boundary (1.36:1) — same rationale as vs the surface',
    },
    {
      theme: 'light',
      fg: '--color-chrome-border',
      bg: '--color-chrome-bg',
      min: 3,
      reason:
        'non-text chrome divider/ghost-button border (1.54:1) — decorative, same exemption as the light --color-border: the band is identified by its content, the controls by fill + label',
    },
    {
      theme: 'high-contrast',
      fg: '--color-chrome-border',
      bg: '--color-chrome-bg',
      min: 3,
      reason:
        'non-text chrome divider/ghost-button border (1.54:1) — the HC block pins the same band values, so the same documented exemption applies',
    },
    {
      theme: 'high-contrast',
      fg: '--color-bg',
      bg: '--color-chrome-bg',
      min: 3,
      reason:
        'grey ghost-button resting fill on the chrome band (1.46:1) — the HC page background is a dark grey against the navy band; the button is identified by its white label (19.80:1 on the fill) and the 2.36:1 --color-border, the same fill+label rationale as the chrome-border exemption',
    },
    {
      theme: 'high-contrast',
      fg: '--color-surface-hover',
      bg: '--color-chrome-bg',
      min: 3,
      reason:
        'grey ghost-button hover fill on the chrome band (1.12:1) — same HC rationale as the resting fill: label + border carry the identification',
    },
    {
      theme: 'high-contrast',
      fg: '--color-border',
      bg: '--color-chrome-bg',
      min: 3,
      reason:
        'ordinary border on the chrome band (2.36:1) — the ghost-button edge on navy in HC; decorative like the documented chrome-border divider (1.54:1)',
    },
    {
      theme: 'black-and-yellow',
      fg: '--color-bg',
      bg: '--color-chrome-bg',
      min: 3,
      reason:
        'ghost-button resting fill on the black chrome band (1.00:1) — in this theme --color-bg IS the band, so the resting fill merges with it; the button is identified by its 4.58:1 --color-border edge and its 14.67:1 yellow label, the same fill+label rationale as the HC band exemption',
    },
    {
      theme: 'black-and-yellow',
      fg: '--color-surface-hover',
      bg: '--color-chrome-bg',
      min: 3,
      reason:
        'ghost-button hover fill on the black chrome band (1.36:1) — same B&Y band rationale: the 4.58:1 border edge + the 10.83:1 yellow label carry the identification',
    },
  ];

  /** Computed mix pairs — the surfaces the literal-token audit CANNOT see.
   *  A `background: color-mix(in srgb, var(--fg) P%, var(--base))` +
   *  `color: var(--fg)` rule renders the fg token on a COMPUTED fill; the
   *  token pairs above pass while the mix can still fail (the 12% user
   *  badge measured 4.36:1 in the light theme — found only by review).
   *  Each entry mirrors one such rule in a component stylesheet; the
   *  percentage is re-parsed from that stylesheet at test time, so
   *  editing the scss changes what this check computes (it can never
   *  silently keep auditing a stale value). The companion test below
   *  fails if a NEW color-mix background appears without a declared
   *  entry, so a computed fill cannot hide a failure again. */
  const MIXED_PAIRS: { file: string; fg: string; base: string; min: number }[] = [
    // The /map row's source badge (map-page.scss .badge--source): the
    // registry token as text on its own 8% tinted fill.
    {
      file: 'app/features/map/map-page.scss',
      fg: '--color-shelter-registry',
      base: '--color-bg-surface',
      min: 4.5,
    },
    // The same block's Community-checked chip (.badge--source.badge--user):
    // the verified green on its own 8% mix (4.71:1 light). Yellow can't
    // ride this pattern — yellow text on its own tint is 1.39:1 in light —
    // so the unverified/half-verified pins use the fill-only marker tokens
    // instead.
    {
      file: 'app/features/map/map-page.scss',
      fg: '--color-verified',
      base: '--color-bg-surface',
      min: 4.5,
    },
  ];

  const isPlainHex = (v: string): boolean => /^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(v);

  it('the high-contrast block overrides the SAME --color* name set as :root (both directions)', () => {
    expect(rootTokens.size, ':root token set unexpectedly small').toBeGreaterThanOrEqual(30);
    const missingInTheme = [...rootTokens.keys()].filter((t) => !themeTokens.has(t));
    const missingInRoot = [...themeTokens.keys()].filter((t) => !rootTokens.has(t));
    expect(missingInTheme, ':root tokens missing from the high-contrast block').toEqual([]);
    expect(missingInRoot, 'high-contrast tokens missing from :root').toEqual([]);
  });

  it('the black-and-yellow map overrides the SAME --color* name set as :root, plus its own --color-link (both directions)', () => {
    // A typo'd or dropped name in the runtime map would leave that token
    // un-overridden — the :root value would leak through (the navy band
    // surviving in the black-and-yellow theme is exactly this failure
    // mode). --color-link is the documented third-theme addition (the
    // other two themes colour links with --color-primary).
    expect(byTokens.size, 'black-and-yellow token set unexpectedly small').toBeGreaterThanOrEqual(
      40,
    );
    const missing = [...rootTokens.keys()].filter((t) => !byTokens.has(t));
    const extra = [...byTokens.keys()].filter((t) => !rootTokens.has(t) && t !== '--color-link');
    expect(missing, ':root tokens missing from the black-and-yellow map').toEqual([]);
    expect(extra, 'black-and-yellow tokens without a :root counterpart').toEqual([]);
  });

  it('the unified verified family is ONE value per theme: --color-new === --color-verified (owner decision)', () => {
    // The verified-family unification (owner decision): the "newly
    // added / not yet verified" state and the verified family are ONE value —
    // GREEN means verified (the re-tint: the verified family moved from
    // yellow to the community green, and the unverified user tone moved to
    // the yellow the verified pins used), the state rides on the marker
    // shape + the row's badge
    // text, and the reported red-orange stays a distinct family in every
    // theme. This pin is the enforced form of that decision: a future
    // "fix" that re-splits the two values (a fresher hue for NEW) fails
    // here instead of quietly re-introducing the two-hue family the owner
    // rejected. The marker fill-vs-tile contrast itself is the documented
    // trade-off every marker tone lives with (the 2px --color-bg-surface
    // edge + the hue carry the pin), so no 3:1 indicator pair is enforced
    // for it — the fill is the verified pin's already-shipped value in all
    // three themes.
    const offenders: string[] = [];
    const themes: [string, Map<string, string>][] = [
      ['light', rootTokens],
      ['high-contrast', themeTokens],
      ['black-and-yellow', byTokens],
    ];
    for (const [theme, tokens] of themes) {
      const fresh = tokens.get('--color-new');
      const verified = tokens.get('--color-verified');
      if (fresh === undefined || verified === undefined) {
        offenders.push(`${theme}: --color-new/--color-verified missing from the token block`);
        continue;
      }
      if (fresh.toLowerCase() !== verified.toLowerCase()) {
        offenders.push(`${theme}: --color-new ${fresh} ≠ --color-verified ${verified}`);
      }
    }
    expect(offenders, 'the verified family must be one value per theme').toEqual([]);
  });

  it('the marker colours keep their meanings (owner decision: green=verified, yellow=unverified, blue=registry, red-orange=reported, teal=picked)', () => {
    // The colour->meaning mapping the owner reads in the rest of the UI:
    // GREEN means verified (the partial triangle + the full circle),
    // UNVERIFIED is YELLOW (the community pin tone — the pin palette is
    // green/yellow/blue/red only; there is no grey in it),
    // registry stays BLUE, the reserved red-orange stays REPORTED, the pick
    // stays TEAL. A future re-tint that separates colour from meaning
    // (verified re-painted yellow, the unverified tone painted green, the
    // reported family drifting into the green band) fails here in every
    // theme instead of shipping. The check is on HUE + SATURATION, not on
    // the hex, so a legitimate shade adjustment within a meaning still
    // passes; the enforced contrast pairs above keep the text pairs
    // honest.
    type Hsl = { h: number; s: number };
    function hslOf(hex: string): Hsl {
      let v = hex.replace('#', '').trim();
      if (v.length === 3)
        v = v
          .split('')
          .map((c) => c + c)
          .join('');
      const r = Number.parseInt(v.slice(0, 2), 16) / 255;
      const g = Number.parseInt(v.slice(2, 4), 16) / 255;
      const b = Number.parseInt(v.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      let h = 0;
      if (d !== 0) {
        if (max === r) h = 60 * (((g - b) / d) % 6);
        else if (max === g) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - g) / d + 4);
      }
      if (h < 0) h += 360;
      const l = (max + min) / 2;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      return { h, s };
    }
    const inBand = (hsl: Hsl, band: [number, number]): boolean => {
      const [lo, hi] = band;
      return lo <= hi ? hsl.h >= lo && hsl.h <= hi : hsl.h >= lo || hsl.h <= hi;
    };
    const rules: { token: string; band?: [number, number]; maxSat?: number; meaning: string }[] = [
      {
        token: '--color-verified',
        band: [100, 165],
        meaning:
          'GREEN — FULLY verified (the circle only; light #237a57 = 155.9°, dark #7fd49a = 139.1°)',
      },
      {
        token: '--color-new',
        band: [100, 165],
        meaning: 'GREEN — the unified NEW state of the verified family',
      },
      {
        token: '--color-shelter-user',
        band: [45, 65],
        meaning:
          'YELLOW — the unverified community tone (#ffd400 = 49.9°; the pin palette has no grey)',
      },
      { token: '--color-shelter-registry', band: [190, 260], meaning: 'BLUE — registry' },
      {
        token: '--color-shelter-pick',
        band: [168, 200],
        meaning: 'TEAL — the picked/anchor accent (kept clear of the green band: 180° / 174.5°)',
      },
      {
        token: '--color-reported',
        band: [330, 50],
        meaning: 'red-ORANGE — reserved for reported, distinct from green',
      },
    ];
    const offenders: string[] = [];
    const themes: [string, Map<string, string>][] = [
      ['light', rootTokens],
      ['high-contrast', themeTokens],
      ['black-and-yellow', byTokens],
    ];
    for (const [theme, tokens] of themes) {
      for (const rule of rules) {
        const value = tokens.get(rule.token);
        if (value === undefined || !isPlainHex(value)) {
          offenders.push(`${theme}: ${rule.token} missing or not a plain hex literal`);
          continue;
        }
        const hsl = hslOf(value);
        if (rule.band !== undefined && !inBand(hsl, rule.band)) {
          offenders.push(
            `${theme}: ${rule.token} ${value} (hue ${hsl.h.toFixed(0)}°) is not ${rule.meaning}`,
          );
        }
        if (rule.maxSat !== undefined && hsl.s > rule.maxSat) {
          offenders.push(
            `${theme}: ${rule.token} ${value} (saturation ${(hsl.s * 100).toFixed(0)}%) is not ${rule.meaning}`,
          );
        }
      }
    }
    expect(offenders, 'a re-tint separated a marker colour from its meaning').toEqual([]);
  });

  it('the marker classes keep their meaning tokens (the class->token mapping a re-tint cannot fork)', () => {
    // The classes are what the map (leaflet-service) and the legend swatches
    // both render — pinning each class to its token here means a re-tint can
    // only move the WHOLE meaning (the hue test above keeps the meaning),
    // never the assignment (e.g. painting .shelter-marker--user with the
    // verified green while the legend still labels it unverified).
    const mapping: [string, string, string][] = [
      ['.shelter-marker--registry', 'background: var(--color-shelter-registry)', 'registry = blue'],
      [
        '.shelter-marker--user',
        'background: var(--color-shelter-user)',
        'unverified = the yellow triangle (the fill is the inner pseudo-element triangle)',
      ],
      [
        '.shelter-marker--full',
        'background: var(--color-verified)',
        'fully-verified = the green circle',
      ],
      [
        '.shelter-marker--partial',
        'background: var(--color-shelter-user)',
        'half-verified = the yellow circle (one confirmed channel)',
      ],
      [
        '.shelter-marker--reported',
        'background: var(--color-reported)',
        'reported = the reserved red-orange',
      ],
      [
        '.shelter-marker--pick',
        'background: var(--color-shelter-pick)',
        'picked = the teal accent',
      ],
      [
        '.shelter-marker--anchor',
        'background: var(--color-shelter-pick)',
        'the browse anchor reuses the pick teal',
      ],
    ];
    for (const [selector, declaration, why] of mapping) {
      const block = balancedBlock(
        stylesCss,
        new RegExp(`^${selector.replace(/[-[.\]]/g, '\\$&')} \{$`),
      );
      expect(block, `${selector} rule missing from styles.scss (${why})`).not.toBeNull();
      expect(block, `${selector} must keep ${declaration} (${why})`).toContain(declaration);
    }
    // The unverified triangle fill must NEVER take the verified green, in
    // either direction of the fork (the whole block is checked: base rule +
    // the nested pseudo-element edge/fill).
    const user = balancedBlock(stylesCss, /^\.shelter-marker--user \{$/);
    expect(user, 'the .shelter-marker--user rule is missing').not.toBeNull();
    expect(user).not.toContain('var(--color-verified)');
    const reported = balancedBlock(stylesCss, /^\.shelter-marker--reported \{$/);
    expect(reported).not.toContain('var(--color-verified)');
  });

  it('the verified marker shapes are SOLID discs and the recency tone is absent (the pin carries depth, not recency — owner decision)', () => {
    // The NEW state left the pin entirely (owner decision — it rides on
    // the "Newly added" badge on the sidebar row, the detail page and the
    // admin list), so the ring geometry that used to carry it is gone and
    // a spec asserting removed geometry would be worse than none. What
    // survives is the silhouette contract of the remaining verified family:
    // the FILLED verified circle (--full, two+ confirmed channels) must
    // stay a solid disc, and the reported pin stays its solid red-orange
    // fill — if either ever gains a ::after hole or a second shape, the
    // shape vocabulary that carries verification depth (WCAG 1.4.1, the
    // anchor diamond's rationale) is broken.
    const full = balancedBlock(stylesCss, /^\.shelter-marker--full \{$/);
    expect(full, '.shelter-marker--full rule missing from styles.scss').not.toBeNull();
    expect(full).toContain('background: var(--color-verified)');
    expect(full).not.toContain('::after');
    // The reported pin is untouched: still the solid red-orange fill.
    const reported = balancedBlock(stylesCss, /^\.shelter-marker--reported \{$/);
    expect(reported, '.shelter-marker--reported rule missing from styles.scss').not.toBeNull();
    expect(reported).toContain('background: var(--color-reported)');
    expect(reported).not.toContain('::after');
    // The removed recency tone stays removed — pinned against the COMPILED
    // stylesheet. The raw-text pattern this check used to be (a top-level
    // balancedBlock on the source bytes) had a proven escape hatch (the
    // 15-delivery-audit M7b/M7c mutations): a nested re-addition
    // (`.shelter-marker { &.shelter-marker--new { … } }`) or a re-spaced one
    // compiled to exactly the forbidden rule yet matched no text pattern.
    // Compiled, every SCSS spelling of the rule spells the class into a
    // selector list — top-level, nested-compound or @media-wrapped — and
    // only selector heads are scanned, so a declaration or a comment cannot
    // false-positive or slip through.
    const heads = compiledSelectorHeads(compiledStyles.css);
    // The scan must not be vacuous: a walker that found no rule at all
    // (renamed class, broken output) would make the absence check pass for
    // the wrong reason — the repo idiom: a checked-count floor.
    expect(
      heads.some((head) => head.includes('.shelter-marker--full')),
      'compiled-selector scan found no known marker rule — the absence check is vacuous',
    ).toBe(true);
    expect(
      heads.filter((head) => /\.shelter-marker--new(?![\w-])/.test(head)),
      '.shelter-marker--new compiled back into the stylesheet: the pin carries depth, not recency',
    ).toEqual([]);
  });

  it('every contrast-checked text pair meets 4.5:1 and border pairs 3:1, in every theme', () => {
    // The list itself must stay non-vacuous: a gutted CONTRAST_CHECKS
    // (e.g. TEXT_PAIRS emptied) would pass every test below it — the
    // floors exist to be checked, and an empty checker is the same
    // "guard passes while the behaviour is gone" class this file has
    // been hardened against (the repo idiom: a checked-count floor).
    expect(CONTRAST_CHECKS.length, 'the contrast list must not be vacuous').toBeGreaterThanOrEqual(
      80,
    );
    const exempted = new Set(CONTRAST_EXEMPTIONS.map((e) => `${e.theme}:${e.fg}:${e.bg}`));
    const offenders: string[] = [];
    for (const check of CONTRAST_CHECKS) {
      if (exempted.has(`${check.theme}:${check.fg}:${check.bg}`)) {
        continue; // documented sub-threshold token — verified by the honesty test below
      }
      const tokens =
        check.theme === 'light'
          ? rootTokens
          : check.theme === 'high-contrast'
            ? themeTokens
            : byTokens;
      const fg = tokens.get(check.fg);
      const bg = tokens.get(check.bg);
      if (fg === undefined || bg === undefined || !isPlainHex(fg) || !isPlainHex(bg)) {
        offenders.push(
          `${check.theme}: ${check.fg} on ${check.bg} — token missing or not a plain hex literal`,
        );
        continue;
      }
      const ratio = contrast(fg, bg);
      if (ratio < check.min) {
        offenders.push(
          `${check.theme}: ${check.fg} on ${check.bg} = ${ratio.toFixed(2)}:1 (< ${check.min}:1)`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every contrast exemption is honest (the pair really is below its threshold)', () => {
    const stale: string[] = [];
    for (const exempted of CONTRAST_EXEMPTIONS) {
      const tokens =
        exempted.theme === 'light'
          ? rootTokens
          : exempted.theme === 'high-contrast'
            ? themeTokens
            : byTokens;
      const ratio = contrast(tokens.get(exempted.fg)!, tokens.get(exempted.bg)!);
      if (ratio >= exempted.min) {
        stale.push(
          `${exempted.theme}: ${exempted.fg} on ${exempted.bg} now = ${ratio.toFixed(2)}:1 — move it back into the checks`,
        );
      }
    }
    expect(stale).toEqual([]);
  });

  it('computed color-mix fills hold their floor with the text token, every theme', () => {
    const offenders: string[] = [];
    for (const pair of MIXED_PAIRS) {
      const css = readFileSync(`${SRC_DIR}/${pair.file}`, 'utf8');
      // Re-parse the percentage from the stylesheet itself (see the
      // MIXED_PAIRS note) — the check follows the shipped CSS.
      const match = css.match(
        new RegExp(
          `color-mix\\(in srgb,\\s*var\\(${pair.fg}\\)\\s*(\\d+(?:\\.\\d+)?)%,\\s*var\\(${pair.base}\\)\\)`,
        ),
      );
      if (match === null) {
        offenders.push(
          `${pair.file}: the ${pair.fg} color-mix fill is gone — update or remove the MIXED_PAIRS entry`,
        );
        continue;
      }
      const pct = Number(match[1]);
      for (const theme of ['light', 'high-contrast', 'black-and-yellow'] as const) {
        const tokens =
          theme === 'light' ? rootTokens : theme === 'high-contrast' ? themeTokens : byTokens;
        const fg = tokens.get(pair.fg);
        const base = tokens.get(pair.base);
        if (fg === undefined || base === undefined || !isPlainHex(fg) || !isPlainHex(base)) {
          offenders.push(
            `${theme}: ${pair.file} — ${pair.fg}/${pair.base} missing or not plain hex`,
          );
          continue;
        }
        const ratio = contrast(fg, colorMix(fg, base, pct));
        if (ratio < pair.min) {
          offenders.push(
            `${theme}: ${pair.fg} on its ${pct}% mix of ${pair.base} = ${ratio.toFixed(2)}:1 (< ${pair.min}:1)`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no color-mix background escapes the mixed-pair audit', () => {
    // Every `background(-color): color-mix(in srgb, var(--a) P%, var(--b))`
    // in the app's stylesheets must be a declared MIXED_PAIRS entry — a
    // new computed fill is contrast-checked from its first commit instead
    // of hiding behind the literal-token audit until the next review.
    const declared = new Set(MIXED_PAIRS.map((p) => `${p.file}|${p.fg}|${p.base}`));
    const unguarded: string[] = [];
    for (const [name, css] of audited) {
      if (name === 'styles.scss') continue; // the token blocks, not component fills
      for (const m of css.matchAll(
        /background(?:-color)?:\s*color-mix\(in srgb,\s*var\((--color-[\w-]+)\)\s*(\d+(?:\.\d+)?)%,\s*var\((--color-[\w-]+)\)\);/g,
      )) {
        if (!declared.has(`${name}|${m[1]}|${m[3]}`)) {
          unguarded.push(`${name}: ${m[1]} ${m[2]}% on ${m[3]} — add it to MIXED_PAIRS`);
        }
      }
    }
    expect(unguarded).toEqual([]);
  });

  /* --- Wave 15 — the single-side accent border is absent, and the
     substitution that replaced it is pinned. The scan is structural over
     COMPILED declarations (compiledDeclarations): nesting, re-spacing,
     and the logical (RTL) spellings all compile to the same flat pairs,
     and a vacuous scan (no declarations found at all) fails the floor.
     --- */

  it('no single-side ACCENT border in any stylesheet (Wave 15: structural 1px neutral hairlines stay, the bar cannot return)', () => {
    const offenders: string[] = [];
    let sideDeclarations = 0;
    const check = (name: string, css: string, skipLeaflet: boolean) => {
      for (const d of compiledDeclarations(css)) {
        // styles.scss pulls Leaflet's vendored stylesheet in via @use —
        // those rules are third-party bytes (same status as
        // src/vendor/**) and outside the sweep. Every APP rule in
        // styles.scss carries a non-leaflet selector, so the head filter
        // removes exactly the vendored rules.
        if (skipLeaflet && d.head.includes('.leaflet-')) continue;
        if (!isSingleSideBorderProperty(d.prop)) continue;
        if (d.prop.toLowerCase() !== 'border' && d.prop.toLowerCase() !== 'border-width') {
          sideDeclarations += 1;
        }
        const why = singleSideAccentOffense(d.prop, d.value);
        if (why !== null) {
          offenders.push(`${name} :: ${d.head} { ${d.prop}: ${d.value} } — ${why}`);
        }
      }
    };
    check('styles.scss', compiledStyles.css, true);
    for (const entry of audited) {
      if (entry[2]) continue; // styles.scss above (compiled with the leaflet load path)
      const css = sass.compile(`${SRC_DIR}/${entry[0]}`, {
        loadPaths: [`${process.cwd()}/node_modules`],
        style: 'expanded',
      }).css;
      check(entry[0], css, false);
    }
    // Vacuity floor: the scan must find the structural single-side hairlines
    // that actually exist (row separators, dividers, the border-*-none
    // overrides) — a walker that matched nothing (broken parse, renamed
    // props) would "pass" for the wrong reason.
    expect(
      sideDeclarations,
      'the single-side border scan found no declarations at all — the guard is vacuous',
    ).toBeGreaterThanOrEqual(10);
    expect(offenders, 'a single-side accent border returned (the Wave 15 treatment is back)').toEqual([]);
  });

  it('account-page .proof-note — the confirmed case: the bar is gone and the subtle fill is its substitute (Wave 15, owner-confirmed)', () => {
    const css = sass.compile(`${SRC_DIR}/app/features/account/account-page.scss`, {
      loadPaths: [`${process.cwd()}/node_modules`],
      style: 'expanded',
    }).css;
    const decls = compiledDeclarations(css).filter((d) =>
      d.head.split(',').some((s) => s.trim() === '.proof-note'),
    );
    expect(
      decls.length,
      'no compiled .proof-note rule — the pin is vacuous (class renamed or rule deleted)',
    ).toBeGreaterThan(0);
    const sideDecls = decls.filter((d) => isSingleSideBorderProperty(d.prop));
    expect(
      sideDecls,
      '.proof-note must carry no single-side border (the 3px primary bar is the removed treatment)',
    ).toEqual([]);
    const bg = decls.find((d) => d.prop === 'background' || d.prop === 'background-color');
    expect(
      bg?.value,
      'the proof-note keeps the subtly different background in the border\'s place',
    ).toBe('var(--color-bg-subtle)');
  });

  it('warning / success / info / subtle notes stay mutually distinguishable WITHOUT the border, every theme (Wave 15)', () => {
    // The bar used to carry the semantics; now only the fill + the text do.
    // The four note families must not share a fill or a text colour in ANY
    // theme — a re-tint that collapses two of them fails here in that
    // theme. (Checked between the four families, not against the page
    // surface: black-and-yellow collapses --color-bg-subtle into the plain
    // black surface by design, and that is documented token behaviour.)
    const themes: [string, Map<string, string>][] = [
      ['light', rootTokens],
      ['high-contrast', themeTokens],
      ['black-and-yellow', byTokens],
    ];
    const fills = ['--color-warning-bg', '--color-success-bg', '--color-info-bg', '--color-bg-subtle'];
    const texts = ['--color-warning', '--color-success', '--color-info', '--color-text'];
    const offenders: string[] = [];
    for (const [theme, tokens] of themes) {
      for (const [list, what] of [
        [fills, 'fill'],
        [texts, 'text'],
      ] as [string[], string][]) {
        const values = list.map((t) => tokens.get(t)?.toLowerCase());
        if (values.some((v) => v === undefined)) {
          offenders.push(`${theme}: a ${what} token of the note family is missing from the token block`);
          continue;
        }
        for (let a = 0; a < values.length; a += 1) {
          for (let b = a + 1; b < values.length; b += 1) {
            if (values[a] === values[b]) {
              offenders.push(
                `${theme}: ${list[a]} and ${list[b]} share one ${what} value (${values[a]}) — the notes would be untellable apart without the border`,
              );
            }
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the Wave 15 substitution pairs sit in the ENFORCED contrast list (not in a comment)', () => {
    // The proof-note's substitution is --color-text on --color-bg-subtle;
    // the semantic note blocks are the severity text on its severity fill
    // (banner + done-state chips). Every one must be a member of
    // CONTRAST_CHECKS at the 4.5:1 text floor in all three themes — a
    // future edit that drops a pair from the list (or from the theme
    // loop) fails here instead of drifting.
    const enforced = new Set(
      CONTRAST_CHECKS.filter((c) => c.min >= 4.5).map((c) => `${c.theme}|${c.fg}|${c.bg}`),
    );
    const themes = ['light', 'high-contrast', 'black-and-yellow'] as const;
    const required: [string, string, string][] = [
      ...themes.map((theme) => [theme, '--color-text', '--color-bg-subtle'] as [string, string, string]),
      ...themes.flatMap((theme) => [
        [theme, '--color-warning', '--color-warning-bg'] as [string, string, string],
        [theme, '--color-success', '--color-success-bg'] as [string, string, string],
        [theme, '--color-info', '--color-info-bg'] as [string, string, string],
      ]),
    ];
    const missing = required.filter(([t, f, b]) => !enforced.has(`${t}|${f}|${b}`));
    expect(missing, 'a Wave 15 substitution pair is missing from the enforced contrast list').toEqual([]);
  });

  it('the theme layer keeps its Leaflet map-chrome overrides (light-surface links + focus ring)', () => {
    // The map is unthemed (light tiles + Leaflet's own white chrome) while
    // the page-wide theme rules target LINKS and FOCUS RINGS everywhere —
    // without these scoped .leaflet-... overrides the black-and-yellow a
    // rule repaints the zoom glyphs + the OSM attribution link at 1.30:1
    // on the white chrome, and the --color-primary focus ring sits at
    // 2.05:1 (B&Y) / 2.10:1 (HC) on the light surface (below the 3:1
    // UI floor). Mechanism assertion — jsdom cannot measure computed
    // style (the repo's established pattern); the token pairs the rules
    // rest on are contrast-checked in the tests above.
    const themeScss = readFileSync(
      `${SRC_DIR}/app/shared/accessibility-dialog.component.scss`,
      'utf8',
    );
    expect(themeScss).toContain("[data-theme='black-and-yellow'] .leaflet-bar a {");
    expect(themeScss).toContain(
      "[data-theme='black-and-yellow'] .leaflet-container .leaflet-control-attribution {",
    );
    expect(themeScss).toContain(
      "[data-theme='black-and-yellow'] .leaflet-container .leaflet-control-attribution a {",
    );
    expect(themeScss).toMatch(
      /\[data-theme='black-and-yellow'\] \.leaflet-bar a:focus-visible,\s*\[data-theme='high-contrast'\] \.leaflet-bar a:focus-visible \{\s*outline-color: var\(--color-bg-surface\);/s,
    );
    expect(themeScss).toMatch(
      /\[data-theme='high-contrast'\] \.leaflet-container \.leaflet-control-attribution a:focus-visible \{\s*outline-color: var\(--color-bg-surface\);/s,
    );
    expect(themeScss).toMatch(
      /\[data-theme='black-and-yellow'\] \.leaflet-container \.leaflet-control-attribution a:focus-visible \{\s*outline-color: var\(--color-text\);/s,
    );
  });

  it('the theme layer keeps the black-and-yellow uniform badge override', () => {
    // Owner ruling: in black-and-yellow ALL badges are black with a yellow
    // border and yellow text (the uniform colour means the badge TEXT
    // carries the meaning — an explicit owner choice). One page-wide rule
    // must cover every badge surface (admin tables, map rows, shelter
    // detail, account, contributions): the base .badge / .contrib-badge
    // selectors at (0,3,1), above the component-scoped modifier rules.
    const themeScss = readFileSync(
      `${SRC_DIR}/app/shared/accessibility-dialog.component.scss`,
      'utf8',
    );
    expect(themeScss).toContain("html[data-theme='black-and-yellow'] .badge.badge,");
    expect(themeScss).toContain(
      "html[data-theme='black-and-yellow'] .contrib-badge.contrib-badge {",
    );
    expect(themeScss).toMatch(
      /\.contrib-badge\.contrib-badge \{\s*background: var\(--color-bg-surface\);\s*border: 1px solid var\(--color-text\);\s*color: var\(--color-text\);\s*\}/s,
    );
  });

  it.each(audited)('%s — no literal colour values', (_name, css, isGlobal) => {
    if (isGlobal) {
      return; // the token block is allowed (checked above)
    }
    expect(violations(css, /#[0-9a-fA-F]{3,8}\b/)).toEqual([]);
    expect(violations(css, /rgba?\(/)).toEqual([]);
  });

  it.each(audited)('%s — font-size/font-weight come from tokens', (_name, css) => {
    expect(violations(css, /font-size:\s*\d/)).toEqual([]);
    expect(violations(css, /font-weight:\s*\d/)).toEqual([]);
  });

  it.each(audited)('%s — @media queries use the documented narrow breakpoint', (_name, css) => {
    for (const line of violations(css, /^\s*@media\b/)) {
      expect(line).toContain(NARROW_BREAKPOINT);
    }
  });

  it('styles.scss defines the core token set (breakpoint, spacing, type, radius, status)', () => {
    const rootCss = [...rootLines].map((i) => stylesCss.split('\n')[i]).join('\n');
    for (const token of [
      '--bp-narrow',
      '--space-4',
      '--space-16',
      '--space-20',
      '--text-sm',
      '--text-base',
      '--text-3xl',
      '--radius-md',
      '--radius-full',
      '--color-primary',
      '--color-cta',
      '--color-reported',
      '--color-border',
      '--color-danger',
      '--color-info',
      '--color-success',
      '--color-warning',
      '--color-shelter-registry',
      '--color-shelter-user',
      '--color-shelter-pick',
    ]) {
      expect(rootCss, `missing token ${token}`).toContain(token);
    }
    expect(rootCss).toContain(`--bp-narrow: ${NARROW_BREAKPOINT}`);
  });

  /*
   * Responsive mechanism (the layout-regression signal). jsdom cannot do real
   * layout, so the acceptance is the mechanism itself: the map page re-stacks
   * at the narrow breakpoint and the shell chrome reflows instead of
   * overflowing. The real narrow-width check is a manual E2E step.
   */
  it('map page re-stacks map + sidebar at the narrow breakpoint', () => {
    const map = withoutCssComments(
      readFileSync(`${SRC_DIR}/app/features/map/map-page.scss`, 'utf8'),
    );
    // Extracted by brace balancing, comments stripped: an unbounded regex
    // over-ran to the file tail, so any rule appended later would have
    // satisfied the assertion — and a comment could satisfy it.
    const media = balancedBlock(map, /^@media \(max-width: 900px\) \{$/);
    expect(media, 'map-page.scss must contain a narrow-width @media block').not.toBeNull();
    expect(media).toContain('flex-direction: column');
  });

  it('the legend leaves the map at the narrow breakpoint (over it at ≥900px, in flow below it at every width <900px)', () => {
    // Wave 8 (the owner's overlay-obscures-the-map report): the legend moved
    // OUT of the map element — it is a .map-page__layout child (DOM order
    // map → legend → sidebar, so the tab order is unchanged) and the
    // placement is pure CSS at the documented breakpoint (900px, the
    // --bp-narrow value — no new breakpoints). Desktop (≥900px): the BASE
    // rule is the absolute overlay; the layout is its containing block and
    // the map fills the layout's left column corner-to-corner, so the
    // overlay sits exactly where the old in-map legend sat. Narrow (every
    // width <900px — mobile 375 and up, all tablets): position: static puts
    // it IN FLOW between the map and the sidebar — below the map, never
    // over it. The entries are real <button>s in both placements (map-
    // page.spec.ts pins keyboard + aria-pressed + the hint line), so
    // operability is placement-independent.
    const map = withoutCssComments(
      readFileSync(`${SRC_DIR}/app/features/map/map-page.scss`, 'utf8'),
    );
    const html = readFileSync(`${SRC_DIR}/app/features/map/map-page.html`, 'utf8');
    // The DOM move itself: the leaflet container is closed, the map wrapper
    // is closed, and ONLY THEN does the legend start — it is no longer a
    // child of .map-page__map.
    expect(
      html,
      'map-page.html must render the legend as a sibling of the map element (wave 8)',
    ).toMatch(
      /<div #mapEl class="map-page__leaflet"><\/div>\s*<\/div>[\s\S]*?<div class="map-legend"/,
    );
    // Desktop placement: the base rule is the overlay, the layout is the
    // containing block.
    const legend = balancedBlock(map, /^\.map-legend \{$/);
    expect(legend, '.map-legend rule missing from map-page.scss').not.toBeNull();
    expect(legend, 'the base .map-legend rule must be the desktop overlay').toContain(
      'position: absolute',
    );
    const layout = balancedBlock(map, /^\.map-page__layout \{$/);
    expect(layout, '.map-page__layout rule missing from map-page.scss').not.toBeNull();
    expect(layout, "the layout must be the legend overlay's containing block").toContain(
      'position: relative',
    );
    // Narrow placement: the @media block restyles the legend to in-flow.
    // Extracted by brace balancing (all occurrences — an @media-wrapped rule
    // is a rule too), so a comment cannot satisfy the check.
    const media = balancedBlock(map, /^@media \(max-width: 900px\) \{$/);
    expect(media, 'map-page.scss must contain a narrow-width @media block').not.toBeNull();
    const narrowLegend = allBalancedBlocks(media!, /\.map-legend \{/);
    expect(narrowLegend, 'the narrow @media block must restyle .map-legend').toHaveLength(1);
    expect(narrowLegend[0], 'the narrow legend must be in-flow (static), below the map').toContain(
      'position: static',
    );
    // The swatch geometry is the marker classes' single source (styles.scss
    // + the base .legend-swatch rule) — the narrow rule may only change the
    // LAYOUT axis, never the swatch size or classes.
    expect(narrowLegend[0]).not.toMatch(/legend-swatch/);
  });

  it('admin tables — the row separator is ONE continuous rule: no class on a <td> may declare a display (a flex td stops its border-bottom at the box content height, so a taller sibling splits the row line into staggered segments)', () => {
    // The separator is the shared th,td border-bottom fused by
    // border-collapse: collapse — one solid line across the whole row at
    // every width, but ONLY while every td/th is still a real table
    // cell. display:flex on a td demotes it to a block-level flex box:
    // its border is then painted at the box's content height instead of
    // the row bottom, so a taller sibling cell splits the line (owner-
    // reported: the rule breaking near the middle of the row). The flex
    // layout must therefore stay on the inner .admin-cell__*-body
    // wrapper, never on the td itself.
    // The table/cell rules are the shared admin surface — the single
    // source is the _admin-shared.scss partial (@used by the page and
    // every tab panel), so the check reads both files; the <td> scan
    // covers every admin template that renders table rows.
    const adminScss = withoutCssComments(
      [
        readFileSync(`${SRC_DIR}/app/features/admin/admin-page.scss`, 'utf8'),
        readFileSync(`${SRC_DIR}/app/features/admin/_admin-shared.scss`, 'utf8'),
      ].join('\n'),
    );
    const adminHtml = [
      readFileSync(`${SRC_DIR}/app/features/admin/admin-page.html`, 'utf8'),
      readFileSync(`${SRC_DIR}/app/features/admin/guidance-order-list.html`, 'utf8'),
      // The tab panels own their table markup (W3-B extraction): the td
      // scan must cover every template that renders table rows.
      readFileSync(`${SRC_DIR}/app/features/admin/alerts-panel.html`, 'utf8'),
      readFileSync(`${SRC_DIR}/app/features/admin/audit-panel.html`, 'utf8'),
      readFileSync(`${SRC_DIR}/app/features/admin/media-panel.html`, 'utf8'),
      readFileSync(`${SRC_DIR}/app/features/admin/shelters-panel.html`, 'utf8'),
      readFileSync(`${SRC_DIR}/app/features/admin/unconfirmed-panel.html`, 'utf8'),
      readFileSync(`${SRC_DIR}/app/features/admin/users-panel.html`, 'utf8'),
    ].join('\n');

    // Each rule extracted by brace balancing, comments stripped: the
    // old unbounded regexes matched outside the rule they claimed to
    // check — the explanatory comment's "border-collapse: collapse" and
    // the .admin-queue-row rule's identical border-bottom satisfied
    // them after the real declarations were deleted.
    const tableRule = balancedBlock(adminScss, /^\.admin-table \{$/);
    expect(tableRule, 'the admin scss must collapse the .admin-table borders').not.toBeNull();
    expect(tableRule, 'the admin scss must collapse the .admin-table borders').toContain(
      'border-collapse: collapse',
    );
    const cellRule = balancedBlock(tableRule!, /^\s*th,\s*$/);
    expect(cellRule, 'the row separator must live in the shared th,td rule').not.toBeNull();
    expect(cellRule, 'the row separator must live in the shared th,td rule').toContain('td {');
    expect(
      cellRule,
      'the row separator must stay the shared th,td border-bottom (one declaration, not per-column rules that could gap or step)',
    ).toContain('border-bottom: 1px solid var(--color-border-subtle)');

    // Every class the markup puts on a <td> must keep the cell a real
    // table cell: NO rule for it — at any nesting depth, in any rule —
    // may declare a display, and a class with NO rule at all is a failure,
    // not a skip. (The old first-match regex left both holes: a `display`
    // in a LATER rule for the same class was invisible, and `if (!block)
    // continue` made an unstyled/renamed class indistinguishable from a
    // clean one — the sweep's mutation proof: an appended
    // `@media (max-width: 900px) { .admin-cell--name { display: flex } }`
    // kept this guard green.)
    const tdClasses = new Set<string>();
    for (const m of adminHtml.matchAll(/<td\b[^>]*class="([^"]*)"/g)) {
      for (const c of m[1].split(/\s+/)) if (c) tdClasses.add(c);
    }
    expect([...tdClasses], 'expected the classed <td> cells in the admin templates').toEqual(
      expect.arrayContaining(['admin-cell--name', 'admin-cell--actions']),
    );
    for (const c of tdClasses) {
      // (?![\w-]) keeps .admin-cell--actions from matching the
      // .admin-cell--actions-review rule (and vice versa): a td class is a
      // whole token, not a prefix of a longer class name.
      const re = new RegExp(`\\.${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);
      const blocks = allBalancedBlocks(adminScss, re);
      expect(
        blocks,
        `.${c} is carried by a <td> but has no rule in the admin scss — a renamed or deleted rule would demote the cell silently, so the absence is a failure, not a skip`,
      ).not.toHaveLength(0);
      for (const block of blocks) {
        expect(
          block,
          `.${c} is carried by a <td>; a display declaration there demotes the cell and splits the row separator`,
        ).not.toMatch(/display\s*:/);
      }
    }
  });

  it('the /blog index is a self-adjusting four-up card grid (guidance-list-page.scss)', () => {
    // Regression guard for the row -> card grid: the <ul> must be a CSS
    // grid (auto-fill + the page's chosen card minimum of 200px), which
    // yields exactly 4 columns at the shell's 1040px desktop content
    // width and degrades to 3/2/1 as the viewport narrows — no extra
    // breakpoints. The old 44rem readable-column cap must stay gone: a
    // four-up grid needs the shell's full width (--content-max-width is
    // the outer bound).
    const list = readFileSync(`${SRC_DIR}/app/features/guidance/guidance-list-page.scss`, 'utf8');
    const grid = list.match(/\.guidance-list__posts \{[\s\S]*?\n\}/);
    expect(grid, 'guidance-list-page.scss must style .guidance-list__posts').not.toBeNull();
    expect(grid![0]).toContain('display: grid');
    expect(grid![0]).toMatch(/repeat\(auto-fill,\s*minmax\(200px,\s*1fr\)\)/);
    expect(list).not.toContain('max-width: 44rem');
  });

  it('the shell header reflows (wraps) so the chrome never overflows at narrow widths', () => {
    const shell = readFileSync(`${SRC_DIR}/app/shared/page-shell.scss`, 'utf8');
    const header = shell.match(/\.shell-header \{[\s\S]*?\n\}/);
    expect(header, 'page-shell.scss must style .shell-header').not.toBeNull();
    expect(header![0]).toContain('flex-wrap: wrap');
  });

  it("page-shell.scss — .shell-body gives router-outlet no flex-grow (the routed component is the outlet's sibling, so a growing outlet pushes every page to the bottom)", () => {
    // Regression guard for the /blog list-sits-low bug: Angular inserts
    // the routed component AFTER <router-outlet> as a SIBLING — the
    // outlet is an empty placeholder. A flex-growing placeholder
    // absorbs all the free vertical space in .shell-body and pushes
    // every page's content down (owner-reported: the post list floating
    // low with empty space above it). The growth belongs on each page's
    // own host instead (map-page.scss :host, login-page.scss :host).
    const shell = readFileSync(`${SRC_DIR}/app/shared/page-shell.scss`, 'utf8');
    const outlet = shell.match(/router-outlet \{[\s\S]*?\n {2}\}/);
    expect(
      outlet,
      'page-shell.scss must keep an explicit router-outlet rule in .shell-body',
    ).not.toBeNull();
    expect(outlet![0]).not.toMatch(/flex-grow\s*:\s*1/);
    expect(outlet![0]).not.toMatch(/flex\s*:\s*1/);
  });

  it('the /submit private-home checkbox keeps its native glyph size (M13 mobile-responsive-polish)', () => {
    // Regression guard: the global `.field input { width: 100% }` form rule
    // stretched the D7 checkbox into a ~112px flex item at 360px (the label
    // text was displaced to the middle of the row). The checkbox must carry
    // an explicit native size — the same escape as the detail page's report
    // radios (.report-option input) — or the row breaks again on any width.
    const submit = readFileSync(`${SRC_DIR}/app/features/shelter/submit-shelter-page.scss`, 'utf8');
    const checkbox = submit.match(/\.checkbox-field \{[\s\S]*?\n\}/);
    expect(checkbox, 'submit-shelter-page.scss must style .checkbox-field').not.toBeNull();
    const inputRule = checkbox![0].match(/input \{[\s\S]*?\n {2}\}/);
    expect(inputRule, '.checkbox-field must size its input explicitly').not.toBeNull();
    expect(inputRule![0]).toMatch(/width: 18px/);
    expect(inputRule![0]).toMatch(/height: 18px/);
    expect(inputRule![0]).toContain('flex-shrink: 0');
  });

  it('the UA (browser-default) focus ring is suppressed — documented WCAG 2.4.7 deviation', () => {
    // Owner decision 2026-09-21: Chromium's default ring painted a dark box on
    // focused elements with no project rule. Both halves are pinned here so
    // neither can drift silently: the suppression exists, and the token ring it
    // must NOT swallow still exists — now covering select and the admin table
    // regions (the retirement of the deviation, reviews/12-summary QW6).
    expect(stylesCss, 'the UA-ring suppression must exist').toMatch(
      /\/\* OWNER DECISION[\s\S]*?\*\/\s*\*:focus \{\s*outline: none;\s*\}/,
    );
    expect(stylesCss, 'the token ring must survive the suppression (higher specificity)').toMatch(
      /a:focus-visible,\s*button:focus-visible,\s*input:focus-visible,\s*textarea:focus-visible,\s*select:focus-visible,\s*\.admin-table-wrap:focus-visible \{\s*outline: 2px solid var\(--color-primary\);\s*outline-offset: 2px;\s*\}/,
    );
  });

  it('styles.scss provides a global :focus-visible rule (keyboard-operable nav)', () => {
    // Every interactive element (links, buttons, inputs,
    // textareas) gets a visible focus ring even without component-scoped
    // focus styles.
    expect(stylesCss).toContain(':focus-visible');
    expect(stylesCss).toMatch(
      /a:focus-visible,\s*button:focus-visible,\s*input:focus-visible,\s*textarea:focus-visible/,
    );
  });

  /*
   * Touch targets + numeric legibility (map-crisis-actions D5/D6). jsdom
   * cannot measure computed style, so — same mechanism-assertion pattern as
   * the responsive tests above — the CSS content is the acceptance.
   */
  it('48px touch targets: .btn carries the min-height (D5)', () => {
    expect(stylesCss).toMatch(/\.btn \{[^}]*min-height: var\(--space-48\)/);
  });

  it('the .num-tabular utility exists for coordinate readouts (D6)', () => {
    expect(stylesCss).toMatch(/\.num-tabular \{\s*font-variant-numeric: tabular-nums;\s*\}/);
  });

  it('buttons centre their label on both axes: .btn is inline-flex centered', () => {
    // The "Add shelter" vertical-centring fix: min-height 48 + 8px vertical
    // padding leaves ~9px of dead space at the bottom for a single text
    // line — text-align alone only centres horizontally. inline-flex with
    // both axes centred fixes every button (incl. btn--block); auto-width
    // buttons keep shrink-to-fit. The left-aligned exceptions opt out with
    // justify-content: flex-start (shelter-row__details).
    expect(stylesCss).toMatch(/\.btn \{[^}]*display: inline-flex/);
    expect(stylesCss).toMatch(/align-items: center/);
    expect(stylesCss).toMatch(/justify-content: center/);
    // The block variant must NOT fall back to display: block
    // — that leaves <a> buttons' labels left/top-aligned, because only
    // <button> elements get the UA button face's self-centring.
    expect(stylesCss).toMatch(/\.btn--block \{[^}]*display: flex/s);
  });

  /* --- Theme fidelity for black-and-yellow (owner wave): the search
     placeholder and the map search button must follow the theme instead
     of the UA stylesheet. jsdom cannot measure computed style (the repo's
     established pattern), so these pins assert the token declarations that
     make the element theme-driven AND run the contrast math on the runtime
     black-and-yellow tokens the page actually applies. --- */

  it('form placeholders take --color-muted (theme yellow in black-and-yellow — the UA placeholder follows the OS scheme, not [data-theme])', () => {
    // Before this pin: no project ::placeholder rule existed, so Chromium's
    // UA placeholder (a light-dark grey) painted the map search + admin
    // search hints grey on the black black-and-yellow input surface (4.56:1
    // in the light-OS case) — a hint the theme does not own, and not the
    // theme's yellow. The owner wants the hint in the theme's yellow; the
    // muted token is that tier in every theme.
    const ph = compiledDeclarations(compiledStyles.css).filter((d) =>
      d.head.includes('::placeholder'),
    );
    expect(
      ph.length,
      'no ::placeholder rule in styles.scss — the UA placeholder is back',
    ).toBeGreaterThan(0);
    for (const d of ph) {
      expect(
        `${d.prop}: ${d.value}`,
        'the placeholder colour must be the muted token',
      ).toBe('color: var(--color-muted)');
      expect(d.head, 'the placeholder rule must cover the search inputs').toContain('input');
      expect(d.head, 'the placeholder rule must cover the form textareas').toContain('textarea');
    }
    // Black-and-yellow: the muted token IS the theme's yellow (the repo's
    // 45-65° yellow band) and holds the text floor on the input's surface
    // token (10.47:1 on the black surface).
    const muted = byTokens.get('--color-muted');
    const surface = byTokens.get('--color-bg-surface');
    expect(muted, '--color-muted missing from the black-and-yellow map').toBeDefined();
    expect(
      hueOf(muted!),
      'the black-and-yellow muted placeholder must be yellow-band (45-65°)',
    ).toBeGreaterThanOrEqual(45);
    expect(hueOf(muted!)).toBeLessThanOrEqual(65);
    expect(contrast(muted!, surface!), 'muted placeholder on the black surface').toBeGreaterThanOrEqual(4.5);
    // The pair belongs in the ENFORCED list at the text threshold — the
    // placeholder is text on the input surface, not a comment.
    const enforced = new Set(CONTRAST_CHECKS.map((c) => `${c.theme}|${c.fg}|${c.bg}|${c.min}`));
    expect(
      enforced.has('black-and-yellow|--color-muted|--color-bg-surface|4.5'),
      'the black-and-yellow placeholder pair must sit in the enforced contrast list at 4.5:1',
    ).toBe(true);
  });

  it('the map anchor-search button is theme-driven (enabled state, black-and-yellow): token background + border + text, measured — the UA ButtonFace is gone', () => {
    // Before this pin: .anchor-search__button was a bare .btn with no
    // background of its own — the UA ButtonFace, which does not follow
    // [data-theme]. With the OS in light mode that is a light-grey fill
    // under the theme's bright text: the black-and-yellow text on it
    // measured 1.24:1 (the owner's "bright on bright" in the ENABLED state
    // after typing; disabled is worse at 1.15:1), the high-contrast white
    // 1.15:1 — unreadable in both dark themes. The token trio makes the
    // button theme-driven in all three themes; the enabled-state ratios
    // are measured against the actual black-and-yellow background below.
    const map = withoutCssComments(
      readFileSync(`${SRC_DIR}/app/features/map/map-page.scss`, 'utf8'),
    );
    const block = balancedBlock(map, /\.anchor-search__button \{/);
    expect(block, '.anchor-search__button rule missing from map-page.scss').not.toBeNull();
    expect(
      block,
      'the button must take the theme background (black in black-and-yellow)',
    ).toContain('background: var(--color-bg)');
    expect(
      block,
      'the button must take the theme border (the theme gold in black-and-yellow)',
    ).toContain('border-color: var(--color-border)');
    expect(
      block,
      'the button must take the theme text (the theme yellow in black-and-yellow)',
    ).toContain('color: var(--color-text)');
    // The enabled-state pairs sit in the ENFORCED list at their thresholds
    // (text 4.5:1, border 3:1) — not described in a comment — and they
    // hold on the runtime tokens the page actually applies.
    const enforced = new Set(CONTRAST_CHECKS.map((c) => `${c.theme}|${c.fg}|${c.bg}|${c.min}`));
    expect(
      enforced.has('black-and-yellow|--color-text|--color-bg|4.5'),
      'the black-and-yellow button text pair must sit in the enforced contrast list at 4.5:1',
    ).toBe(true);
    expect(
      enforced.has('black-and-yellow|--color-border|--color-bg|3'),
      'the black-and-yellow button border pair must sit in the enforced contrast list at 3:1',
    ).toBe(true);
    expect(
      contrast(byTokens.get('--color-text')!, byTokens.get('--color-bg')!),
      'enabled-state text on the actual black background',
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(byTokens.get('--color-border')!, byTokens.get('--color-bg')!),
      'enabled-state border against the actual black background',
    ).toBeGreaterThanOrEqual(3);
  });

  it('form controls and links carry explicit token colours (UA defaults do not follow [data-theme])', () => {
    // The "dark text on a dark background" bug class: <a>/<button>/<input>
    // without a scoped colour rule fall back to the UA stylesheet (blue
    // links, black control text), which ignores the theme attribute and
    // lands dark on the HC dark surfaces while the OS is in light mode —
    // 1.06:1 for the bare .btn buttons on /submit, 1.14:1 for the map filter
    // chips, 2.11:1 for the auth pages' .auth-links links. Scoped rules
    // (.btn variants, .chip, .shell-nav a, ...) keep winning by specificity;
    // the light-theme delta is a no-op (#000 -> #1c1c1e, #0000EE -> #0b5cad).
    expect(stylesCss).toMatch(/^a \{\s+color: var\(--color-primary\);\s+\}/m);
    expect(stylesCss).toMatch(/button,\s*input,\s*textarea \{\s*color: inherit;\s*\}/);
    expect(stylesCss).toMatch(
      /input,\s*textarea \{\s*background-color: var\(--color-bg-surface\);\s*\}/,
    );
  });
});
