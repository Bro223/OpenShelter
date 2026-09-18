import { ChangeDetectionStrategy, Component, inject, type OnDestroy, type OnInit, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { skip } from 'rxjs';
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
 *
 * Locale scope: the server answers ONE language per call (the gateway
 * sends the active locale), so a language switcher change is not a
 * re-render — it is a RE-FETCH (the fetchSeq guard, the guidance-detail's
 * pattern, keeps a slow response from the previous language from landing
 * over the new fetch).
 */
@Component({
  selector: 'app-guidance-list-page',
  imports: [DatePipe, RouterLink, BannerComponent, LoadingIndicator, TranslatePipe],
  templateUrl: './guidance-list-page.html',
  styleUrl: './guidance-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidanceListPage implements OnInit, OnDestroy {
  private readonly gateway = inject(GuidanceGateway);
  /** Locale-aware date rendering (the page-shell footer's pattern). */
  readonly i18n = inject(I18nService);

  /** null while the first fetch is in flight; [] when nothing is published. */
  readonly posts = signal<GuidancePostDto[] | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Slugs whose hero <img> failed to load (404/network): the broken image
   * element is dropped and a fixed-size neutral placeholder takes its
   * place, so the row keeps its height and the title link stays the row's
   * single accessible link.
   */
  private readonly failedHeroSlugs = signal<ReadonlySet<string>>(new Set());

  /** Template seam: did this post's hero image fail to load? */
  heroFailed(slug: string): boolean {
    return this.failedHeroSlugs().has(slug);
  }

  /**
   * The <img (error)> handler: drop the broken thumbnail for this post.
   * Idempotent — a natural load error and a synthetic one may both arrive.
   */
  onHeroImageError(_event: Event, slug: string): void {
    const failed = new Set(this.failedHeroSlugs());
    if (failed.has(slug)) {
      return;
    }
    failed.add(slug);
    this.failedHeroSlugs.set(failed);
  }

  /** The fetchSeq guard drops a superseded in-flight response (the
      guidance-detail's pattern: a language switch must not land the old
      language's rows over the new fetch). */
  private fetchSeq = 0;

  /** The language switcher sets I18nService.locale: the index is
      locale-scoped on the server, so a switch re-fetches. A field
      initializer (an injection context — toObservable's requirement)
      builds the subscription; toObservable emits the CURRENT value on
      subscribe, so skip(1) — only a real switch triggers a load.
      Unsubscribed in ngOnDestroy (the page shell's router-subscription
      idiom). */
  private readonly localeSub = toObservable(this.i18n.locale)
    .pipe(skip(1))
    .subscribe(() => this.load());

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.localeSub.unsubscribe();
  }

  /** Fetch the published index; a failure lands in the shared error banner
      with the page chrome intact (shared convention). */
  load(): Promise<void> {
    const seq = ++this.fetchSeq;
    this.error.set(null);
    this.loading.set(true);
    return this.gateway.list().then(
      (value) => {
        if (seq !== this.fetchSeq) {
          return; // a newer fetch superseded this one (a language switch)
        }
        this.posts.set(value);
        this.loading.set(false);
      },
      (failure: unknown) => {
        if (seq !== this.fetchSeq) {
          return;
        }
        this.error.set(bannerMessage(failure, 'shelter'));
        this.loading.set(false);
      },
    );
  }
}
