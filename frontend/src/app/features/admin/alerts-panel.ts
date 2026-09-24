import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { AdminAlertRow, AdminAlertKind } from '../../core/models';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { ALERT_KIND_LABEL } from '../../shared/admin-copy';

/**
 * The Alerts tab panel: the throttle-abuse ring — the
 * daily submission cap (429), the per-contact OTP cap (429) and the
 * near-duplicate rejection (409), newest first.
 *
 * Presentation only (the extracted-panel contract): the rows, the load
 * state and the retry intent ride down as inputs / back as outputs. The
 * ring is IN-MEMORY on the backend (it clears on a restart — a triage
 * view, not a durable log), so the tab is READ-ONLY and deliberately
 * un-paged: the endpoint bounds the window with `limit` (default 50,
 * cap 200) and carries no offset / total, and the ring is the
 * backend's own small cap — there is no scope to page through.
 */
@Component({
  selector: 'app-alerts-panel',
  imports: [DatePipe, LoadingIndicator, TranslatePipe],
  templateUrl: './alerts-panel.html',
  styleUrl: './alerts-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsPanel {
  /** null = not loaded yet (lazy on first switch); [] = loaded and empty. */
  readonly rows = input<AdminAlertRow[] | null>(null);
  /** The load failure's server message (the error state renders it). */
  readonly loadError = input<string | null>(null);

  readonly retry = output<void>();

  /** Alert kind label (the machine value → human copy). */
  protected alertKindLabel(kind: AdminAlertKind): string {
    return ALERT_KIND_LABEL[kind];
  }

  /** The 429 alert's Retry-After countdown, human-formatted (null → "—"). */
  protected retryAfterText(seconds: number | null): string {
    if (seconds === null) {
      return '—';
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h > 0) {
      return m > 0 ? `${h} h ${m} min` : `${h} h`;
    }
    if (m > 0) {
      return `${m} min`;
    }
    return `${seconds} s`;
  }

  onRetry(): void {
    this.retry.emit();
  }
}
