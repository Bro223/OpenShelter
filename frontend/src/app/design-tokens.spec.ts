import { readFileSync, readdirSync, statSync } from 'node:fs';

/**
 * M6 token audit (spec: "Unified design tokens").
 *
 * The token set lives once in src/styles.scss :root; component stylesheets
 * must reference tokens instead of literals. This spec makes that rule
 * fail-fast: a new hardcoded colour/font value anywhere under src/ fails
 * the suite instead of drifting silently. New .scss files are picked up
 * automatically — no list to maintain.
 *
 * Rules:
 *  1. Hex colours and rgb()/rgba() may only appear inside the styles.scss
 *     :root token block (documented exceptions there are the token values
 *     themselves; the marker shadow token carries its rgba()).
 *  2. Stylesheets outside styles.scss may not use literal font-size /
 *     font-weight — the type tokens must be used instead.
 *  3. @media queries must use the documented narrow breakpoint (720px,
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
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      out.push(...collectScss(full));
    } else if (entry.endsWith('.scss')) {
      out.push(full);
    }
  }
  return out;
}

const NARROW_BREAKPOINT = '720px';
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

/** Line indexes (0-based) inside the :root { ... } block of styles.scss. */
function rootBlockLines(css: string): Set<number> {
  const inside = new Set<number>();
  let inRoot = false;
  let depth = 0;
  css.split('\n').forEach((line, i) => {
    if (!inRoot && /^\s*:root\s*\{/.test(line)) {
      inRoot = true;
      depth = 0;
    }
    if (inRoot) {
      inside.add(i);
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      if (depth <= 0) {
        inRoot = false;
      }
    }
  });
  return inside;
}

describe('design tokens (M6)', () => {
  const stylesCss = readFileSync(STYLES_FILE ?? '', 'utf8');
  const rootLines = rootBlockLines(stylesCss);
  const audited = STYLE_FILES.map((f) => {
    const name = f.slice(SRC_DIR.length + 1);
    return [name, readFileSync(f, 'utf8'), f === STYLES_FILE] as const;
  });

  it('audits a non-trivial set of stylesheets', () => {
    expect(STYLE_FILES.length).toBeGreaterThanOrEqual(12);
  });

  it('styles.scss — colour literals only inside the :root token block', () => {
    stylesCss.split('\n').forEach((line, i) => {
      const isColour = /#[0-9a-fA-F]{3,8}\b/.test(line) || /rgba?\(/.test(line);
      if (isColour) {
        expect(
          rootLines.has(i),
          `colour literal outside the :root token block — line ${i + 1}: ${line.trim()}`,
        ).toBe(true);
      }
    });
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
      '--color-border',
      '--color-danger',
      '--color-info',
      '--color-success',
      '--color-warning',
      '--color-shelter-registry',
      '--color-shelter-user',
      '--color-shelter-pick',
      '--color-star-filled',
    ]) {
      expect(rootCss, `missing token ${token}`).toContain(token);
    }
    expect(rootCss).toContain(`--bp-narrow: ${NARROW_BREAKPOINT}`);
  });

  /*
   * Responsive mechanism (M6 layout-regression signal). jsdom cannot do real
   * layout, so the acceptance is the mechanism itself: the map page re-stacks
   * at the narrow breakpoint and the shell chrome reflows instead of
   * overflowing. The real narrow-width check is the manual M6 E2E step.
   */
  it('map page re-stacks map + sidebar at the narrow breakpoint', () => {
    const map = readFileSync(`${SRC_DIR}/app/features/map/map-page.scss`, 'utf8');
    const media = map.match(/@media \(max-width: 720px\) \{[\s\S]*\n\}/);
    expect(media, 'map-page.scss must contain a narrow-width @media block').not.toBeNull();
    expect(media![0]).toContain('flex-direction: column');
  });

  it('the shell header reflows (wraps) so the chrome never overflows at narrow widths', () => {
    const shell = readFileSync(`${SRC_DIR}/app/shared/page-shell.scss`, 'utf8');
    const header = shell.match(/\.shell-header \{[\s\S]*?\n\}/);
    expect(header, 'page-shell.scss must style .shell-header').not.toBeNull();
    expect(header![0]).toContain('flex-wrap: wrap');
  });

  it('styles.scss provides a global :focus-visible rule (keyboard-operable nav)', () => {
    // M6 a11y audit: every interactive element (links, buttons, inputs,
    // textareas) gets a visible focus ring even without component-scoped
    // focus styles. Icon-only controls (star input) carry aria-labels —
    // asserted in rating-stars.spec.ts.
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
});
