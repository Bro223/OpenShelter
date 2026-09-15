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
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: MessageKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
