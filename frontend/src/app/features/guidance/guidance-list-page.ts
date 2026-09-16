import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { GuidancePostDto } from '../../core/models';
import { GuidanceGateway } from '../../gateways/guidance-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';
import { LoadingIndicator } from '../../shared/loading-indicator';

/**
 * /blog — the public crisis-guidance index (crisis-guidance D4/D6).
 *
 * Thin shell (01-TASK.md §7): state in signals, the gateway owns the API
 * (a permit-all read — no auth). Fetches the published index on init; the
 * server owns ordering (PUBLISHED only, pinned first, then publishedAt
 * descending) — the page renders the array as-is and never re-sorts. The
 * index does not carry the post body (bodyHtml is null); the detail page
 * carries the stored (sanitized) HTML.
 */
@Component({
  selector: 'app-guidance-list-page',
  imports: [DatePipe, RouterLink, BannerComponent, LoadingIndicator, TranslatePipe],
  templateUrl: './guidance-list-page.html',
  styleUrl: './guidance-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidanceListPage implements OnInit {
  private readonly gateway = inject(GuidanceGateway);
  /** Locale-aware date rendering (the page-shell footer's pattern). */
  readonly i18n = inject(I18nService);

  /** null while the first fetch is in flight; [] when nothing is published. */
  readonly posts = signal<GuidancePostDto[] | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  /** Fetch the published index; a failure lands in the shared error banner
      with the page chrome intact (shared convention). */
  load(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    return this.gateway.list().then(
      (value) => {
        this.posts.set(value);
        this.loading.set(false);
      },
      (failure: unknown) => {
        this.error.set(bannerMessage(failure, 'shelter'));
        this.loading.set(false);
      },
    );
  }
}
