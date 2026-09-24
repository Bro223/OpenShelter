import { signal } from '@angular/core';
import type { ActivatedRoute, Router, Params } from '@angular/router';

/** The legend's five SELECTABLE pin tones, in legend order (the
 *  legend IS the filter). The order is the canonical URL order for the
 *  `tones` param, and the names are the markerTone() vocabulary — the
 *  same words the marker classes use (`shelter-marker--{tone}`) — so a
 *  selected entry is exactly the pin the map draws. The sixth legend
 *  entry (the anchor diamond, the searched ADDRESS) is a UI reference
 *  point, not a shelter pin tone: it is deliberately not a member. */
export const LEGEND_TONES = ['registry', 'user', 'partial', 'full', 'reported'] as const;

/** One selectable legend (pin-tone) entry. */
export type LegendTone = (typeof LEGEND_TONES)[number];

/** Parse the URL's `tones` value into a legal set: split on ',', trim,
 *  keep the known tone names (case-sensitive, exactly the marker
 *  vocabulary) and drop the rest. Absent (null) or all-garbage → the
 *  empty set = no filter. A hand-typed value sanitizes to the nearest
 *  legal value, never an error. */
function parseTones(raw: string | null): Set<LegendTone> {
  const tones = new Set<LegendTone>();
  if (raw !== null) {
    for (const token of raw.split(',')) {
      const name = token.trim();
      if ((LEGEND_TONES as readonly string[]).includes(name)) {
        tones.add(name as LegendTone);
      }
    }
  }
  return tones;
}

/** The canonical URL string for a tone set: legend order, comma-joined,
 *  '' when empty (the omit-defaults convention — the default is the
 *  ABSENCE of the param). */
function canonicalTones(tones: ReadonlySet<LegendTone>): string {
  return LEGEND_TONES.filter((tone) => tones.has(tone)).join(',');
}

/** Set equality over two tone sets (same members, either order). */
function sameTones(a: ReadonlySet<LegendTone>, b: ReadonlySet<LegendTone>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const tone of a) {
    if (!b.has(tone)) {
      return false;
    }
  }
  return true;
}

/**
 * The legend filter: the page's ONLY filter control. The selection is
 * the URL's `tones` param — URL-only (no localStorage), display-only
 * (the loaded list is filtered and the markers re-render from the
 * filtered view; no refetch, the loaded data is never altered).
 *
 * A state object, not a component: the page owns the list and the marker
 * layer, and the template feeds the legend's entries through it. The
 * URL contract: the view IS the URL (a link or a refresh keeps the
 * selection). `syncFromParams` is the only writer of the view signals
 * from the URL (the page's queryParams subscription funnels every
 * emission through it); `toggleTone` is the only writer of the URL from
 * the view.
 */
export class LegendFilterView {
  /** The selected pin tones. Empty set = no filter (the default = the
   *  param's absence, the omit-defaults convention). */
  readonly selectedTones = signal<ReadonlySet<LegendTone>>(new Set());

  constructor(private readonly deps: { route: ActivatedRoute; router: Router }) {}

  /** The entry's pressed state (the template seam — the template stays
   *  branch-free). */
  toneSelected(tone: LegendTone): boolean {
    return this.selectedTones().has(tone);
  }

  /**
   * Toggle a legend entry: compute the next selection and write it to
   * the URL (the view IS the URL). The query emission syncs it back
   * through `syncFromParams`. Display-only: no refetch.
   */
  toggleTone(tone: LegendTone): void {
    const next = new Set(this.selectedTones());
    if (next.has(tone)) {
      next.delete(tone);
    } else {
      next.add(tone);
    }
    const params: Record<string, string> = { ...this.deps.route.snapshot.queryParams };
    const value = canonicalTones(next);
    if (value === '') {
      delete params['tones'];
    } else {
      params['tones'] = value;
    }
    void this.deps.router.navigate([], { relativeTo: this.deps.route, queryParams: params });
  }

  /**
   * Keyboard activation for the legend entries: Enter and Space toggle
   * the selection. preventDefault() suppresses the button's native
   * activation click (and the Space page-scroll), so every keystroke
   * toggles EXACTLY once — and the path is testable (jsdom synthesises
   * no click from a keydown).
   */
  onToneToggleKey(tone: LegendTone, event: Event): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleTone(tone);
    }
  }

  /**
   * Parse + clamp the `tones` param, then apply a changed selection to
   * the view signals. A value outside the tone vocabulary (a hand-typed
   * token, a stale share) sanitizes to the nearest legal value (the
   * known members stay, the rest drop; an empty result is the param's
   * ABSENCE — the omit-defaults convention) and the URL is normalized
   * in place (replaceUrl — no history entry for the cosmetic fix), so
   * the control and the URL can never quietly disagree.
   *
   * Returns true when a CHANGED selection was applied — the caller
   * re-renders the markers from the filtered view (display-only, NO
   * refetch; the loaded data is never altered).
   */
  syncFromParams(params: Params): boolean {
    const raw = params['tones'] ?? null;
    const parsed = parseTones(raw);
    const canonical = canonicalTones(parsed);
    if (raw !== null && canonical !== raw) {
      const next: Record<string, string> = { ...params };
      if (canonical === '') {
        delete next['tones'];
      } else {
        next['tones'] = canonical;
      }
      void this.deps.router.navigate([], {
        relativeTo: this.deps.route,
        queryParams: next,
        replaceUrl: true,
      });
      return false; // the normalized emission applies the filter there
    }
    if (sameTones(parsed, this.selectedTones())) {
      return false;
    }
    this.selectedTones.set(parsed);
    return true;
  }
}
