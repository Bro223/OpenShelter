import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  inject,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { skip } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate-pipe';

/**
 * Static privacy policy (legal-recovery, i18n). No backend, no state —
 * the page is catalog copy (`legal.privacy.*` keys, EN verbatim from the old
 * static template) + router links to the account and terms pages. The copy
 * states the app's ACTUAL behavior (encryption at rest, client-side
 * geolocation, self-service export/deletion); retention has no calendar
 * schedule yet — the owner product call is logged, not asserted here.
 */
@Component({
  selector: 'app-privacy-policy-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './privacy-policy-page.html',
  styleUrl: './privacy-policy-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyPage implements OnDestroy {
  /** i18n: the page is fully catalog-driven (| t pipes), so a language
   *  switch must re-render the whole page. toObservable emits the CURRENT
   *  value on subscribe, so skip(1) — only a real switch triggers it
   *  (the account-page idiom). Unsubscribed in ngOnDestroy. */
  readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly localeSub = toObservable(this.i18n.locale)
    .pipe(skip(1))
    .subscribe(() => this.cdr.markForCheck());

  ngOnDestroy(): void {
    this.localeSub.unsubscribe();
  }
}
