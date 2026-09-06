import { inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import type { CanActivateFn } from '@angular/router';

/** Brand part of every document title (browser tab). */
export const APP_NAME = 'OpenShelter';

/**
 * M6 route-title guard: sets `document.title` from the route's
 * `data.title` on every activation — one small navigation handler instead
 * of each page importing Title. "Shelter map" -> "Shelter map — OpenShelter".
 *
 * Routes without a title are left untouched (e.g. the initial document
 * title from index.html before first navigation).
 */
export const titleGuard: CanActivateFn = (route) => {
  const title = route.data['title'];
  if (typeof title === 'string' && title.length > 0) {
    inject(Title).setTitle(`${title} — ${APP_NAME}`);
  }
  return true;
};
