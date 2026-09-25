/**
 * The persisted UI theme: three options — the light DEFAULT (absent key
 * / no attribute), the high-contrast SCSS token override (the
 * [data-theme='high-contrast'] block in styles.scss) and the
 * black-and-yellow theme below.
 *
 * Black-and-yellow is applied as RUNTIME CSS custom properties on <html>
 * instead of an SCSS token block, on purpose: the design-tokens audit
 * (src/app/design-tokens.spec.ts) allows hex literals only inside the
 * styles.scss :root + high-contrast blocks, and it re-audits this map
 * with the same contrast math + the same name-set rule (every :root
 * token must be overridden, so no light value can leak through). It is
 * applied by ThemeStore (post-paint) and the inline index.html pre-paint
 * script (before paint); the SCSS everywhere else only references
 * var(--color-*), so the runtime values flow through the existing token
 * seam unchanged.
 *
 * Constraints the map must keep:
 *  - CARDS are distinguished by BORDER, not by a dark tint: every
 *    surface token is #000000 — #111 on black is 1.11:1 and would be
 *    invisible — so --color-border carries the card edge. And
 *    --color-bg-surface is #000 AND doubles as the "text on primary"
 *    colour, which makes the inverted primary button black-on-yellow
 *    with no extra rule.
 *  - The chrome band (header/footer) FOLLOWS this theme — black
 *    background, yellow text (the --color-chrome-* values). The
 *    high-contrast theme keeps the navy band — that is the HC SCSS
 *    block's own values. The MAP is not themed (OSM tiles stay light);
 *    --color-map-placeholder and the marker hues keep the source coding.
 *  - Error/danger is the theme's ONE voice — yellow: hue cannot
 *    distinguish an error or a destructive action from ordinary text,
 *    so the non-colour cue carries it (the weight on the error lines,
 *    the full border on the banner/confirm surfaces, the explicit
 *    wording). The reported state keeps its red family — a separate,
 *    deliberate owner decision.
 *  - Links get a token of their own and stay UNDERLINED (the non-colour
 *    cue, the global rule ships in the accessibility dialog's
 *    stylesheet — WCAG 1.4.1).
 */

export type AppTheme = 'default' | 'high-contrast' | 'black-and-yellow';

/** The stored localStorage value of the high-contrast theme. */
export const HIGH_CONTRAST_THEME = 'high-contrast';
/** The stored localStorage value of the black-and-yellow theme. */
export const BLACK_AND_YELLOW_THEME = 'black-and-yellow';

/** The black-and-yellow palette on #000: owner-verified contrast
 *  ratios, re-audited by src/app/design-tokens.spec.ts with the same
 *  contrast math as the two SCSS blocks.
 */
export const BLACK_AND_YELLOW_TOKENS: Readonly<Record<string, string>> = {
  /* Text & surfaces */
  '--color-text': '#ffd400',
  '--color-muted': '#d4b53a',
  '--color-bg': '#000000',
  '--color-bg-surface':
    '#000000' /* cards: border-distinguished; also the text-on-primary colour */,
  '--color-bg-subtle': '#000000',
  '--color-surface-hover': '#2b2400' /* ghost-button hover fill — text on it 10.8:1 */,
  '--color-surface-overlay': 'rgba(0, 0, 0, 0.92)' /* legend card over the light tiles */,
  '--color-backdrop': 'rgba(0, 0, 0, 0.8)',
  /* Brand */
  '--color-primary': '#ff9f1c' /* CTA/primary fill family + focus ring */,
  '--color-primary-hover': '#ffb347' /* black on it 11.79:1 */,
  '--color-brand': '#ffd400',
  /* The link colour (the third theme adds a LINK token of its own:
     links must stay distinguishable from the body text, WCAG 1.4.1).
     Consumed by the global rule in the accessibility dialog's scss. */
  '--color-link': '#ffe066',
  /* Chrome band (header + footer + <900 menu panel) — the owner's word:
     BLACK background, YELLOW text. Every band surface rides on these
     tokens, so the whole band follows the theme:
     bg     #000000  (the black background)
     text   #ffd400  on #000  14.67:1 (wordmark, nav links, footer links)
     muted  #d4b53a  on #000  10.47:1 (footer notice + provenance text)
     focus  #ffd400  on #000  14.67:1 (>= 3:1 — the focus ring on the band)
     active #ffd400  on #000  14.67:1 (>= 3:1 — the active-nav indicator)
     border #8a7400  on #000  4.58:1  (>= 3:1 — the band divider + the
                                   ghost buttons' edge, enforced at 3:1)
     The header ghost buttons' resting fill is --color-bg (#000) and the
     hover fill --color-surface-hover (#2b2400): 1.00:1 / 1.36:1 against
     the band — documented exemptions in design-tokens.spec.ts (the
     4.58:1 border edge + the 14.67:1 yellow label carry the
     identification, the same fill+label rationale as the HC band's).
     The nav links' underline (the non-colour link cue) ships in the
     accessibility dialog's page-wide rules. */
  '--color-chrome-bg': '#000000',
  '--color-chrome-text': '#ffd400',
  '--color-chrome-muted': '#d4b53a',
  '--color-chrome-focus': '#ffd400',
  '--color-chrome-active': '#ffd400',
  '--color-chrome-border': '#8a7400',
  /* CTA + reported + new (the CTA/reported fills carry BLACK text —
     --color-bg-surface; new is unified with the verified green) */
  '--color-cta': '#ff9f1c',
  '--color-reported': '#ff6b4d',
  '--color-new':
    '#7fd49a' /* ONE value with --color-verified — the unified verified family (green = verified) */,
  /* Submitter-verified marker fill — the same
     name as :root, so the theme layers stay in lockstep (design-tokens.spec
     asserts both directions). */
  '--color-verified': '#7fd49a',
  /* Borders (the card edge is the structure of this theme) */
  '--color-border': '#8a7400',
  '--color-border-subtle': '#6b5900' /* decorative divider (≈3:1) */,
  /* Status palette */
  /* Error/danger follow the theme's ONE voice — yellow (owner decision:
     in this theme hue cannot distinguish an error or a destructive action
     from ordinary text, so the non-colour cue carries it: the weight on
     the error lines, the full border on the banner/confirm surfaces,
     the explicit wording). The reported state keeps its red family —
     --color-reported above, a separate owner decision. */
  '--color-danger': '#ffd400',
  '--color-danger-bg': '#2a2408' /* danger on it 10.83:1 (dark amber tint) */,
  '--color-danger-border':
    '#b89600' /* on #000 7.40:1 — the full border, the non-colour error cue */,
  '--color-error': '#ffd400' /* = --color-danger (one voice, like the light theme's red) */,
  '--color-warning': '#ffb84d',
  '--color-warning-bg': '#292008' /* warning on it 9.37:1 */,
  '--color-warning-border': '#6e5a1e',
  '--color-info': '#8ac6f5',
  '--color-info-bg': '#10222f' /* info on it 8.9:1 (the verified pair) */,
  '--color-info-border': '#2f5a7a',
  '--color-success': '#7fd49a',
  '--color-success-bg': '#0f2a18' /* success on it 8.6:1 (the verified pair) */,
  '--color-success-border': '#2f6e45',
  '--color-success-bg-soft': '#122417',
  /* Source badges (dark fills, the verified text pairs) */
  '--color-badge-registry': '#14263a',
  '--color-badge-user':
    '#11301d' /* dark green tint — "Community-checked" (brightened verified on it 8.05:1) */,
  /* "Newly added" badge: the dark-tint mirror of the light pair (like the
     sibling badge tints); the uniform badge ruling still wins visually in
     this theme */
  '--color-badge-new': '#33260a',
  '--color-badge-new-text': '#ffd400' /* bright yellow on the dark amber tint = 10.31:1 */,
  /* Map + markers (the map is not themed — tiles stay light) */
  '--color-shelter-registry': '#7ab8ff',
  '--color-shelter-user':
    '#ffd400' /* the community yellow (the light value), never the verified green */,
  '--color-shelter-pick': '#4dd0c4',
  '--color-map-placeholder': '#e9eef2',
};

/** The token names — clearing removes exactly what was set. */
export const BLACK_AND_YELLOW_TOKEN_NAMES: readonly string[] = Object.keys(BLACK_AND_YELLOW_TOKENS);

/** The token applier roots only need the style object (the pre-paint
 *  script's fake roots carry it without the attribute seam). */
type ThemeStyleRoot = {
  style: { setProperty(name: string, value: string): void; removeProperty(name: string): void };
};

/** Apply the black-and-yellow token set to <html> (inline custom
 *  properties beat :root, so no SCSS change is needed downstream). */
export function applyBlackAndYellowTokens(root: ThemeStyleRoot): void {
  for (const name of BLACK_AND_YELLOW_TOKEN_NAMES) {
    root.style.setProperty(name, BLACK_AND_YELLOW_TOKENS[name]);
  }
}

/** Remove the black-and-yellow tokens (theme switch away from it). */
export function clearBlackAndYellowTokens(root: ThemeStyleRoot): void {
  for (const name of BLACK_AND_YELLOW_TOKEN_NAMES) {
    root.style.removeProperty(name);
  }
}
