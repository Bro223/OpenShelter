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
 */
export const titleGuard: CanActivateFn = (route) => {
  const title = route.data['title'];
  if (typeof title === 'string' && title.length > 0) {
    const i18n = inject(I18nService);
    inject(Title).setTitle(`${i18n.t(title as MessageKey)} — ${APP_NAME}`);
  }
  return true;
};
