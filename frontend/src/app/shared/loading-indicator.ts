import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The shared loading indicator (01 puml, shared/ — the architecture doc
 * advertised `LoadingIndicator`; the M4/M5 pages hand-rolled
 * `<p role="status">Loading…</p>` markup instead, W13). Renders ONE
 * `<p role="status">`; the consuming page styles it with its own state
 * class on the host element (sidebar-state / detail-state /
 * contributions-state).
 */
@Component({
  selector: 'app-loading-indicator',
  imports: [],
  templateUrl: './loading-indicator.html',
  styleUrl: './loading-indicator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingIndicator {
  /** The visible loading copy (e.g. "Loading shelters…"). */
  readonly message = input<string>('Loading…');
}
