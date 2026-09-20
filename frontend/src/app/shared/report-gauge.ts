import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { gaugeAngle } from './gauge-math';

/**
 * The semicircular report gauge (M9 — report aggregation UI): one
 * question, two ends. The needle sweeps from 0° (pointing at the LEFT
 * end, e.g. "Closed" / "Space available") through 90° (straight up — an
 * exact equal split) to 180° (pointing at the RIGHT end, e.g. "Open" /
 * "Full"); the angle is the SERVER-weighted share toward the right end
 * (the server owns the derivation — this component never re-derives from
 * counts). No data (`share` null) renders the explicit empty state
 * instead of a misleading neutral arrow.
 *
 * Accessibility: the angle is never the ONLY carrier of meaning — the
 * count line (the visible figcaption, e.g. "Reports: 3 open, 2 closed")
 * and the end labels are visible text; the SVG is aria-hidden decoration
 * behind that text, so the gauge is never colour-only or gesture-only.
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
  /** The left end's label (e.g. "Closed" / "Space available"). */
  readonly leftLabel = input<string>('');
  /** The right end's label (e.g. "Open" / "Full"). */
  readonly rightLabel = input<string>('');
  /** The empty-state line (no fresh reports). */
  readonly emptyText = input<string>('');

  /** The needle angle in degrees (null with the share → empty state). */
  readonly angle = computed(() => gaugeAngle(this.share()));
}
