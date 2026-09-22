/**
 * The persisted UI theme (accessibility-dialog, extending D2): three
 * options — the light DEFAULT (absent key / no attribute), the
 * high-contrast SCSS token override (the [data-theme='high-contrast']
 * block in styles.scss) and the black-and-yellow theme.
 *
 * Black-and-yellow is applied as RUNTIME CSS custom properties on <html>
 * instead of an SCSS token block, on purpose: the design-tokens audit
 * (src/app/design-tokens.spec.ts) allows hex literals only inside the
 * styles.scss :root + high-contrast blocks, and styles.scss is not
 * editable this wave — so the third theme's verified values live here in
 * TypeScript and are applied by ThemeStore (post-paint) and the inline
 * index.html pre-paint script (before paint). The SCSS everywhere else
 * only ever references var(--color-*), so the runtime values flow through
 * the existing token seam unchanged.
 */

export type AppTheme = 'default' | 'high-contrast' | 'black-and-yellow';

/** The stored localStorage value of the high-contrast theme. */
export const HIGH_CONTRAST_THEME = 'high-contrast';
/** The stored localStorage value of the black-and-yellow theme. */
export const BLACK_AND_YELLOW_THEME = 'black-and-yellow';

/**
 * The black-and-yellow palette on #000 (owner-verified ratios; the
 * computed ones follow the same method as the high-contrast block's
 * verified comments):
 *
 *   text    #ffd400   on #000        14.67:1
 *   muted   #d4b53a   on #000        10.47:1
 *   link    #ffe066   on #000        16.11:1 (link-vs-text is 1.10:1, so
 *                                     links are UNDERLINED — the global
 *                                     rule ships in the accessibility
 *                                     dialog's stylesheet, WCAG 1.4.1)
 *   CTA /   #ff9f1c   black on it    10.23:1 (the CTA + primary fill
 *   primary                                  family; see the note below)
 *   primary #ffd400   black on it    14.67:1 (btn--primary INVERTS:
 *   button   (the --color-text value, the .btn--primary override rule)
 *   reported #ff6b4d  black on it /  7.46:1  (stays red-family)
 *   danger   as text on #000
 *   success #7fd49a   on #000        11.79:1
 *   registry #7ab8ff  on badge #14263a  7.4:1 (the badge fill reuses the
 *                                        high-contrast dark tint — the
 *                                        verified pair)
 *   new     #7fd49a   black on it    11.79:1 (= the verified value — the
 *                                verified family is ONE value, owner decision;
 *                                the wave-8 re-tint made it the success green)
 *   pick    #4dd0c4   on #000        10.9:1 (the selected-point pin)
 *   info    #8ac6f5   on #000        11.7:1
 *   border  #8a7400   vs #000        4.58:1 (UI boundary ≥ 3:1)
 *
 * CARDS are distinguished by BORDER, not by a dark tint: every surface
 * token is #000000 — #111 on black is 1.11:1 and would be invisible, so
 * --color-border carries the card edge (4.58:1). --color-bg-surface is
 * #000 AND doubles as the "text on primary" colour (the btn--primary
 * convention from the high-contrast block), which is what makes the
 * inverted primary button black-on-yellow with no extra rule.
 *
 * The chrome band (header/footer) FOLLOWS this theme (owner decision):
 * the mode's word for it is "black and yellow = yellow text on a black
 * background", so the --color-chrome-* values are black + the palette's
 * yellows (design-tokens.spec.ts re-runs those ratios like the rest of
 * the map; a name-set test pins that the map overrides every :root
 * token, so no navy value can leak through the band). The
 * high-contrast theme keeps the navy band — that is the HC SCSS block's
 * own values, spec-enforced there. The MAP is not themed (OSM tiles
 * stay light); --color-map-placeholder and the marker hues keep the
 * source coding.
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
  /* Submitter-verified marker fill (submitter-verification-badge) — the same
     name as :root, so the theme layers stay in lockstep (design-tokens.spec
     asserts both directions). */
  '--color-verified': '#7fd49a',
  /* Borders (the card edge is the structure of this theme) */
  '--color-border': '#8a7400',
  '--color-border-subtle': '#6b5900' /* decorative divider (≈3:1) */,
  /* Status palette */
  '--color-danger': '#ff6b4d',
  '--color-danger-bg': '#2a120d' /* danger on it 6.3:1 */,
  '--color-danger-border': '#7a3a2d',
  '--color-error': '#ff6b4d',
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
  /* Map + markers (the map is not themed — tiles stay light) */
  '--color-shelter-registry': '#7ab8ff',
  '--color-shelter-user':
    '#ffd400' /* the unverified yellow (the light value), never the verified green */,
  '--color-shelter-pick': '#4dd0c4',
  '--color-map-placeholder': '#e9eef2',
};

/** The token names — clearing removes exactly what was set. */
export const BLACK_AND_YELLOW_TOKEN_NAMES: readonly string[] = Object.keys(BLACK_AND_YELLOW_TOKENS);

/** The token appliers only need the style object (the pre-paint script's
 *  fake roots carry it without the attribute seam). */
export type ThemeStyleRoot = {
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
