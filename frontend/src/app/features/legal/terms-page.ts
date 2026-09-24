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
 * Static terms of use (legal-recovery, i18n). No backend, no state —
 * catalog copy (`legal.terms.*` keys, EN verbatim from the old static
 * template). Mirrors the app's own safety notice (not an official emergency
 * service, 112 first) and the locked trust model (verified user ≠ verified
 * shelter).
 */
@Component({
  selector: 'app-terms-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './terms-page.html',
  styleUrl: './terms-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsPage implements OnDestroy {
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
