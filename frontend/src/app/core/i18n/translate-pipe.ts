import { inject, Pipe, PipeTransform } from '@angular/core';
import type { MessageKey } from './messages';
import { I18nService } from './i18n.service';

/**
 * Template translation (i18n-et-en): `{{ 'nav.map' | t }}`.
 *
 * `pure: false` on purpose — a locale switch must re-render the chrome,
 * and the pipe re-evaluates on every change-detection pass of its
 * component (PageShell reads the `locale` signal in its template, so a
 * switch triggers exactly that pass). The chrome is the only pipe
 * consumer, so the per-CD evaluation cost is negligible.
 *
 * Lazy catalogs (bundle-lazy-i18n): `t()` NEVER returns a raw key or
 * undefined — while the active locale's catalog is still loading it
 * serves the DEFAULT locale's value for the key (the accepted one-
 * language flash, never an untranslated key on screen), and the
 * I18nService runs one change-detection pass (ApplicationRef.tick) when
 * the chunk arrives, so this pipe re-evaluates into the active locale's
 * text with no template change.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: MessageKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
