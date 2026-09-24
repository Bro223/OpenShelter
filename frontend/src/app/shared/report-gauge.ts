import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { gaugeAngle } from './gauge-math';

/**
 * The semicircular report gauge (report aggregation UI): one
 * question, two ends. The needle sweeps from 0° (pointing at the LEFT
 * end, e.g. "Closed" / "Space available") through 90° (straight up — an
 * exact equal split) to 180° (pointing at the RIGHT end, e.g. "Open" /
 * "Full"); the angle is the SERVER-weighted share toward the right end
 * (the server owns the derivation — this component never re-derives from
 * counts). No data (`share` null) renders the explicit empty state
 * instead of a misleading neutral arrow.
 *
 * Accessibility: the angle is never the ONLY carrier of meaning — the
 * count line (the visible caption, e.g. "Reports: 3 open, 2 closed")
 * and the end labels are visible text; the SVG is aria-hidden decoration
 * behind that text, so the gauge is never colour-only or gesture-only.
 *
 * Caption placement (layout pass): by default the count line is the
 * figure's <figcaption> (the figure's accessible text). The DETACHED
 * modes split the gauge into its two halves — describedBy renders the
 * arrow only (the figure references the external caption via
 * aria-describedby, keeping the caption the gauge's accessible text
 * without a second copy in the DOM), captionOnly renders the count line
 * on its own (the element the arrow references). The count line's break
 * opportunities live in a <wbr> between every pair of tokens: the tokens
 * are adjacent in the markup and each is nowrap, so without the wbr the
 * whole line would be unbreakable and overflow its box.
 */
@Component({
  selector: 'app-report-gauge',
  imports: [],
  templateUrl: './report-gauge.html',
  styleUrl: './report-gauge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportGauge {
  /** The weighted share toward the right end (0..1, server-derived);
   *  null = no fresh reports → the explicit empty state. */
  readonly share = input<number | null>(null);
  /** The visible + accessible count text ("Reports: 3 open, 2 closed"). */
  readonly text = input<string>('');
  /**
   * The count line's wrap units (placement pass): one per comma-separated
   * count phrase ("Reports: 3 open, 2 closed" → ["Reports: 3 open, ",
   * "2 closed"]). Each token renders as one unbreakable inline unit, so
   * the line wraps BETWEEN counts — never inside a phrase ("0 space
   * available" can't split) — while the concatenated text stays the
   * string verbatim (the visible + accessible text is unchanged).
   */
  readonly textTokens = computed<string[]>(() => {
    const text = this.text();
    if (text === '') return [];
    return text.split(', ').map((part, i, parts) => (i < parts.length - 1 ? `${part}, ` : part));
  });
  /** The left end's label (e.g. "Closed" / "Space available"). */
  readonly leftLabel = input<string>('');
  /** The right end's label (e.g. "Open" / "Full"). */
  readonly rightLabel = input<string>('');
  /** The empty-state line (no fresh reports). */
  readonly emptyText = input<string>('');
  /**
   * Detached-caption association: when set, the figure renders WITHOUT
   * its figcaption and carries aria-describedby pointing at the element
   * with this id — the count line rendered elsewhere (the page's
   * captions column) stays the gauge's accessible text, exactly one
   * copy in the DOM.
   */
  readonly describedBy = input<string | null>(null);
  /** Caption-only mode: render just the count line (no figure, no SVG) —
   *  the page's captions column composes the arrows and the lines
   *  separately (the arrows row above, the lines stacked in a column
   *  below). */
  readonly captionOnly = input(false);
  /** The id of the count-line element in caption-only mode (the target
   *  of the arrow's aria-describedby). */
  readonly captionId = input<string | null>(null);

  /** The needle angle in degrees (null with the share → empty state). */
  readonly angle = computed(() => gaugeAngle(this.share()));
}
