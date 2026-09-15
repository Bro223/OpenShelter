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

describe('design tokens (M6)', () => {
  const stylesCss = readFileSync(STYLES_FILE ?? '', 'utf8');
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

  /* --- F4: the theme is pinned HARD — name-set equality (both directions)
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

  const rootTokens = colorTokens(rootLines);
  const themeTokens = colorTokens(themeLines);

  type ContrastPair = { theme: 'light' | 'high-contrast'; fg: string; bg: string; min: number };

  const TEXT_PAIRS: [string, string][] = [
    // Body text on every surface it actually renders on.
    ['--color-text', '--color-bg'],
    ['--color-text', '--color-bg-surface'],
    ['--color-text', '--color-bg-subtle'],
    ['--color-text', '--color-surface-hover'],
    ['--color-muted', '--color-bg'],
    ['--color-muted', '--color-bg-surface'],
    ['--color-muted', '--color-bg-subtle'],
    ['--color-muted', '--color-surface-hover'],
    // Banner text on its own fill (BannerComponent severity backgrounds).
    ['--color-danger', '--color-danger-bg'],
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
    // Source/trust badge text on its fill (shelter-detail-page .badge). The
    // map rows use the same pair over a 12% color-mix — that computed fill
    // is covered by the styles.scss D1 note, not this literal-based check.
    ['--color-shelter-registry', '--color-badge-registry'],
    ['--color-shelter-user', '--color-badge-user'],
    // Trust-state badge text on its fill (community-review-queue D5):
    // the NEW community rows' "Newly added" badge on every surface.
    ['--color-warning', '--color-badge-new'],
  ];

  /** --color-shelter-pick × the HC surfaces it could sit on (HC-only, see
   *  the note in CONTRAST_CHECKS). */
  const HC_ONLY_TEXT_PAIRS: [string, string][] = [
    ['--color-shelter-pick', '--color-bg'],
    ['--color-shelter-pick', '--color-bg-surface'],
    ['--color-shelter-pick', '--color-bg-subtle'],
  ];

  const CONTRAST_CHECKS: ContrastPair[] = [
    // Text: WCAG AA 4.5:1.
    ...TEXT_PAIRS.flatMap(([fg, bg]) =>
      (['light', 'high-contrast'] as const).map((theme) => ({ theme, fg, bg, min: 4.5 })),
    ),
    // Non-text (UI component boundary / graphical object): 3:1.
    ...(
      [
        ['--color-border', '--color-bg-surface'],
        ['--color-border', '--color-bg'],
      ] as [string, string][]
    ).flatMap(([fg, bg]) =>
      (['light', 'high-contrast'] as const).map((theme) => ({ theme, fg, bg, min: 3 })),
    ),
    // HC-only text pairs (not checked in light, where the value is a
    // graphical-object fill, not a text colour): --color-shelter-pick is the
    // one "unchanged (map context)" token of the theme. The 2026-09-11 HC
    // contrast audit brightened it to #ff8a80 as a safe superset so the
    // token holds 4.5:1 on every HC surface if it ever serves as text (today
    // it is used only as the /submit pin fill). The audit found no token pair
    // below threshold — the user-reported dark-on-dark came from UA-default
    // colours instead (see the "form controls and links" test below).
    ...HC_ONLY_TEXT_PAIRS.map(([fg, bg]) => ({
      theme: 'high-contrast' as const,
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
  ];

  const isPlainHex = (v: string): boolean => /^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(v);

  it('the high-contrast block overrides the SAME --color* name set as :root (both directions)', () => {
    expect(rootTokens.size, ':root token set unexpectedly small').toBeGreaterThanOrEqual(30);
    const missingInTheme = [...rootTokens.keys()].filter((t) => !themeTokens.has(t));
    const missingInRoot = [...themeTokens.keys()].filter((t) => !rootTokens.has(t));
    expect(missingInTheme, ':root tokens missing from the high-contrast block').toEqual([]);
    expect(missingInRoot, 'high-contrast tokens missing from :root').toEqual([]);
  });

  it('every contrast-checked text pair meets 4.5:1 and border pairs 3:1, in both themes', () => {
    const exempted = new Set(CONTRAST_EXEMPTIONS.map((e) => `${e.theme}:${e.fg}:${e.bg}`));
    const offenders: string[] = [];
    for (const check of CONTRAST_CHECKS) {
      if (exempted.has(`${check.theme}:${check.fg}:${check.bg}`)) {
        continue; // documented sub-threshold token — verified by the honesty test below
      }
      const tokens = check.theme === 'light' ? rootTokens : themeTokens;
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
      const tokens = exempted.theme === 'light' ? rootTokens : themeTokens;
      const ratio = contrast(tokens.get(exempted.fg)!, tokens.get(exempted.bg)!);
      if (ratio >= exempted.min) {
        stale.push(
          `${exempted.theme}: ${exempted.fg} on ${exempted.bg} now = ${ratio.toFixed(2)}:1 — move it back into the checks`,
        );
      }
    }
    expect(stale).toEqual([]);
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
   * Responsive mechanism (M6 layout-regression signal). jsdom cannot do real
   * layout, so the acceptance is the mechanism itself: the map page re-stacks
   * at the narrow breakpoint and the shell chrome reflows instead of
   * overflowing. The real narrow-width check is the manual M6 E2E step.
   */
  it('map page re-stacks map + sidebar at the narrow breakpoint', () => {
    const map = readFileSync(`${SRC_DIR}/app/features/map/map-page.scss`, 'utf8');
    const media = map.match(/@media \(max-width: 900px\) \{[\s\S]*\n\}/);
    expect(media, 'map-page.scss must contain a narrow-width @media block').not.toBeNull();
    expect(media![0]).toContain('flex-direction: column');
  });

  it('the shell header reflows (wraps) so the chrome never overflows at narrow widths', () => {
    const shell = readFileSync(`${SRC_DIR}/app/shared/page-shell.scss`, 'utf8');
    const header = shell.match(/\.shell-header \{[\s\S]*?\n\}/);
    expect(header, 'page-shell.scss must style .shell-header').not.toBeNull();
    expect(header![0]).toContain('flex-wrap: wrap');
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

  it('styles.scss provides a global :focus-visible rule (keyboard-operable nav)', () => {
    // M6 a11y audit: every interactive element (links, buttons, inputs,
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
    // The block variant must NOT fall back to display: block (the M2 rule)
    // — that leaves <a> buttons' labels left/top-aligned, because only
    // <button> elements get the UA button face's self-centring.
    expect(stylesCss).toMatch(/\.btn--block \{[^}]*display: flex/s);
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
