import { ChangeDetectionStrategy, Component, inject, type OnDestroy, type OnInit, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { skip } from 'rxjs';
import { ApiError } from '../../core/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { GuidancePostDto } from '../../core/models';
import { GuidanceGateway } from '../../gateways/guidance-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';
import { LoadingIndicator } from '../../shared/loading-indicator';

/**
 * /blog/:slug — one public crisis-guidance post (crisis-guidance D4).
 *
 * Thin shell (01-TASK.md §7): state in signals, the gateway owns the API
 * (a permit-all read — no auth). The body is admin-authored HTML the
 * server already sanitized (jsoup allowlist) — it is rendered through
 * [innerHTML], which runs Angular's sanitizer before the value reaches the
 * DOM, so the stored HTML is sanitized a second time client-side (never
 * bypassSecurityTrustHtml, never a DomSanitizer bypass).
 *
 * A 404 — an unknown slug OR a draft slug (the SAME answer, by design: a
 * draft's existence is never revealed) — lands in the readable not-found
 * state, not the error banner. Any other failure -> the shared error
 * banner with the page chrome intact.
 *
 * Locale scope: the server answers ONE language per call (the gateway
 * sends the active locale), and a slug whose post is in ANOTHER locale
 * is a 404 — so a language switcher change re-fetches: a reader who
 * switches into the post's language sees it appear without a reload, and
 * a mismatch lands in the same readable not-found state.
 */
@Component({
  selector: 'app-guidance-detail-page',
  imports: [DatePipe, RouterLink, BannerComponent, LoadingIndicator, TranslatePipe],
  templateUrl: './guidance-detail-page.html',
  styleUrl: './guidance-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidanceDetailPage implements OnInit, OnDestroy {
  private readonly gateway = inject(GuidanceGateway);
  private readonly route = inject(ActivatedRoute);
  /** Locale-aware date rendering (the page-shell footer's pattern). */
  readonly i18n = inject(I18nService);

  /** The active :slug; null until the first param replay. */
  readonly slug = signal<string | null>(null);
  readonly post = signal<GuidancePostDto | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);

  /** The fetchSeq guard drops a superseded in-flight response (the
      shelter-detail's pattern: an id switch must not land the old
      post's data over the new load — the same guard covers a language
      switch, whose 404/200 outcome can flip between fetches). */
  private fetchSeq = 0;

  /** The language switcher sets I18nService.locale: the detail is
      locale-scoped on the server, so a switch re-fetches (the guard
      keeps a stale response from the other language from landing).
      A field initializer (an injection context — toObservable's
      requirement) builds the subscription; toObservable emits the
      CURRENT value on subscribe, so skip(1) — only a real switch
      triggers a load. Unsubscribed in ngOnDestroy (the page shell's
      router-subscription idiom). */
  private readonly localeSub = toObservable(this.i18n.locale)
    .pipe(skip(1))
    .subscribe(() => this.load());

  ngOnInit(): void {
    // Re-read the :slug on EVERY navigation to this route — back/forward
    // between two posts (/blog/a -> /blog/b) must swap the data, not keep
    // the old post. paramMap replays the current params on subscribe and
    // completes when the route deactivates, so the subscription needs no
    // manual teardown.
    this.route.paramMap.subscribe((params) => this.readSlug(params.get('slug')));
  }

  ngOnDestroy(): void {
    this.localeSub.unsubscribe();
  }

  /** Adopt the :slug param (an empty slug is not-found, mirroring the
      shelter-detail's invalid-id handling). */
  private readSlug(raw: string | null): void {
    if (raw === null || raw.length === 0) {
      this.notFound.set(true);
      return;
    }
    if (raw === this.slug()) {
      return; // the same post — nothing changed
    }
    // A different post: drop the previous state before the new load
    // resolves (the fetchSeq guard drops the superseded response).
    this.slug.set(raw);
    this.notFound.set(false);
    this.post.set(null);
    this.load();
  }

  /** Fetch the post by slug. 404 (unknown slug, a draft slug, or a post
      in ANOTHER locale) -> not-found state; any other failure -> error
      banner with the page chrome intact (shared convention). */
  load(): Promise<void> {
    const slug = this.slug();
    if (slug === null) {
      return Promise.resolve();
    }
    const seq = ++this.fetchSeq;
    this.error.set(null);
    // A fresh fetch may RESOLVE a previously-404'd slug (a language
    // switch into the post's own language), so the not-found state is
    // dropped with the other stale state; the 404 handler re-sets it
    // when the post is still not in this language.
    this.notFound.set(false);
    this.loading.set(true);
    return this.gateway.getBySlug(slug).then(
      (value) => {
        if (seq !== this.fetchSeq) {
          return; // the route deactivated or a newer slug superseded this
        }
        this.post.set(value);
        this.loading.set(false);
      },
      (failure: unknown) => {
        if (seq !== this.fetchSeq) {
          return;
        }
        this.loading.set(false);
        if (failure instanceof ApiError && failure.status === 404) {
          // Unknown slug OR draft slug — the SAME not-found by design.
          this.post.set(null);
          this.notFound.set(true);
          return;
        }
        this.error.set(bannerMessage(failure, 'shelter'));
      },
    );
  }
}
