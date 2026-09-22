import { readFileSync, readdirSync, statSync } from 'node:fs';

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
    // Source/trust badge text on its fill (shelter-detail-page .badge).
    // The map rows use the same pair over a color-mix TINT — that computed
    // fill is a different surface and is enforced separately (MIXED_PAIRS
    // below re-derives the mix and checks the pair per theme).
    ['--color-shelter-registry', '--color-badge-registry'],
    ['--color-shelter-user', '--color-badge-user'],
    // Trust-state badge text on its fill (community-review-queue D5):
    // the NEW community rows' "Newly added" badge (and the /mine
    // info-request chip) on every surface. The badge rides on the
    // UNIFIED yellow family (owner decision: the amber "new" hue was
    // merged into the verified yellow) — the re-tinted fill is enforced
    // here, not described in a comment.
    ['--color-warning', '--color-badge-new'],
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
    // as decorative sub-3:1 pairs.
    ...(
      [
        ['--color-border', '--color-chrome-bg'],
        ['--color-border', '--color-bg-surface'],
        ['--color-border', '--color-bg'],
        ['--color-chrome-border', '--color-chrome-bg'],
      ] as [string, string][]
    ).map(([fg, bg]) => ({ theme: 'black-and-yellow' as const, fg, bg, min: 3 })),
    // HC-only text pairs (not checked in light, where the value is a
    // graphical-object fill, not a text colour): --color-shelter-pick is the
    // one "unchanged (map context)" token of the theme. It is #ff8a80
    // (brightened as a safe superset) so the token holds 4.5:1 on every HC
    // surface if it ever serves as text (today it is used only as the
    // /submit pin fill). No token pair sits below threshold — the
    // user-reported dark-on-dark came from UA-default colours instead (see
    // the "form controls and links" test below).
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
    // The /map row's source badges (map-page.scss .badge / .badge--user):
    // the registry/user token as text on its own tinted fill.
    {
      file: 'app/features/map/map-page.scss',
      fg: '--color-shelter-registry',
      base: '--color-bg-surface',
      min: 4.5,
    },
    {
      file: 'app/features/map/map-page.scss',
      fg: '--color-shelter-user',
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

  it('the unified yellow family is ONE value per theme: --color-new === --color-verified (owner decision)', () => {
    // The yellow-family unification (owner decision): the "not yet
    // verified / newly added" state and the verified family are ONE
    // yellow — the state rides on the marker shape + the row's badge
    // text, and the reported red-orange stays a distinct family in
    // every theme. This pin is the enforced form of that decision: a
    // future "fix" that re-splits the two values (a fresher amber for
    // NEW) fails here instead of quietly re-introducing the two-hue
    // yellow family the owner rejected (the pins read yellow-ward, not
    // orange-ward). The marker fill-vs-tile contrast itself is the
    // documented trade-off every marker tone lives with (the 2px
    // --color-bg-surface edge + the hue carry the pin), so no 3:1
    // indicator pair is enforced for it — the fill is the verified
    // pin's already-shipped value in all three themes.
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
    expect(offenders, 'the yellow family must be one value per theme').toEqual([]);
  });

  it('the NEW marker is a RING (the W4-D shape gap): a surface-coloured hole in the yellow disc — the silhouette, not a second hue, distinguishes it from the filled verified circle', () => {
    // The owner-visible marker gap (W4-D): NEW and VERIFIED (two+ channels)
    // were BOTH filled yellow circles — the unification made the hue one
    // value, so the state was invisible on the map. The fix rides on
    // SHAPE (WCAG 1.4.1, the anchor diamond's rationale): NEW becomes a
    // ring (a surface-coloured hole in the disc) while --full stays a solid
    // fill. These pins keep the decision single-sourced in the marker
    // class: any legend swatch that reuses .shelter-marker--new inherits
    // the ring by construction, and the fill stays --color-new (the value
    // equality is the pin above — the reported red-orange stays its own
    // family, untouched here).
    const block = balancedBlock(stylesCss, /^\.shelter-marker--new \{$/);
    expect(block, '.shelter-marker--new rule missing from styles.scss').not.toBeNull();
    // The fill stays the unified yellow — no re-split of the family.
    expect(block).toContain('background: var(--color-new)');
    // The ring's hole: a centred pseudo-element disc in the surface
    // colour (the same colour as the pin's 2px edge).
    const hole = balancedBlock(block!, /&::after \{$/);
    expect(hole, '.shelter-marker--new &::after (the ring hole) missing').not.toBeNull();
    expect(hole).toContain('position: absolute');
    expect(hole).toContain('border-radius: 50%');
    expect(hole).toContain('background: var(--color-bg-surface)');
    // The FILLED verified circle must stay a solid disc — if it ever
    // gains the same hole, the two silhouettes merge and the gap re-opens.
    const full = balancedBlock(stylesCss, /^\.shelter-marker--full \{$/);
    expect(full, '.shelter-marker--full rule missing from styles.scss').not.toBeNull();
    expect(full).toContain('background: var(--color-verified)');
    expect(full).not.toContain('::after');
    // The reported pin is untouched: still the solid red-orange fill.
    const reported = balancedBlock(stylesCss, /^\.shelter-marker--reported \{$/);
    expect(reported, '.shelter-marker--reported rule missing from styles.scss').not.toBeNull();
    expect(reported).toContain('background: var(--color-reported)');
    expect(reported).not.toContain('::after');
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
