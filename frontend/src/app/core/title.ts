import { inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import type { CanActivateFn } from '@angular/router';
import { I18nService } from './i18n/i18n.service';
import type { MessageKey } from './i18n/messages';

/** Brand part of every document title (browser tab) — a proper noun,
    never translated. */
export const APP_NAME = 'OpenShelter';

/**
 * Route-title guard (i18n-et-en): sets `document.title` from the route's
 * `data.title` MESSAGE KEY on every activation, resolved through the active
 * locale — one small navigation handler instead of each page importing
 * Title. "title.map" -> "Shelter map — OpenShelter"
 * (en) / "Varjupaikade kaart — OpenShelter" (et).
 *
 * `data.title` is a key of the shared `Messages` catalog (not free text)
 * — title.spec.ts checks every routable title against BOTH catalogs, so a
 * new route cannot ship without a tab title in either language. Routes
 * without a title are left untouched (e.g. the initial document title
 * from index.html before first navigation).
 *
 * The title is per-navigation: switching the locale updates the chrome
 * immediately but the tab title picks the new language on the next
 * activation.
 *
 * Lazy catalogs (bundle-lazy-i18n): with a stored non-default preference
 * (or a just-clicked switcher), the active locale's chunk may still be
 * loading when the guard runs. The guard therefore sets the title in the
 * BEST AVAILABLE language (`t()` serves the default locale while the
 * catalog is in flight — never a raw key) and re-resolves ONCE when the
 * chunk lands. Deliberately NOT an `await`: blocking first navigation on
 * the chunk fetch would delay first paint for non-default-locale users.
 * The pre-paint `<title>` in index.html (the brand name — a proper noun
 * no locale translates) is untouched by all of this.
 */
export const titleGuard: CanActivateFn = (route) => {
  const title = route.data['title'];
  if (typeof title === 'string' && title.length > 0) {
    const i18n = inject(I18nService);
    const titleService = inject(Title);
    const key = title as MessageKey;
    const apply = (): void => {
      titleService.setTitle(`${i18n.t(key)} — ${APP_NAME}`);
    };
    apply();
    // Re-resolve once when the active locale's catalog lands (immediate
    // no-op re-apply when it is already in memory — the default locale
    // always is, so the default path is byte-identical to before).
    i18n.onCatalogLoaded(apply);
  }
  return true;
};
