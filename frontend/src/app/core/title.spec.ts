import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Route } from '@angular/router';
import { routes } from '../app.routes';
import { I18nService } from './i18n/i18n.service';
import { EN } from './i18n/en';
import { ET } from './i18n/et';
import type { MessageKey } from './i18n/messages';
import { APP_NAME, titleGuard } from './title';

/**
 * Route titles (spec: "Route titles and favicon"), i18n-et-en:
 * titles resolve through the active locale.
 *  - Mechanism: titleGuard sets document.title from the route's
 *    data.title MESSAGE KEY on navigation ("<Page> — OpenShelter").
 *  - Completeness: every routable entry in the real route table carries a
 *    data.title that is a key present in BOTH locale catalogs, so a new
 *    route cannot silently ship without a tab title in either language.
 */

@Component({ template: '<p>stub</p>' })
class Stub {}

describe('route titles', () => {
  let router: Router;
  let i18n: I18nService;

  beforeEach(async () => {
    // I18nService reads the stored preference in its constructor — clear
    // storage BEFORE the first inject so each test starts at the default.
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'a', component: Stub, data: { title: 'title.map' }, canActivate: [titleGuard] },
          { path: 'b', component: Stub }, // no title — must be left untouched
        ]),
      ],
    }).compileComponents();
    i18n = TestBed.inject(I18nService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    document.title = '';
  });

  it('sets document.title to "<Page> — OpenShelter" after navigating to a titled route', async () => {
    document.title = 'initial';
    await router.navigateByUrl('/a');
    expect(document.title).toBe(`Shelter map — ${APP_NAME}`);
  });

  it('resolves the title in the active locale (et)', async () => {
    document.title = 'initial';
    i18n.setLocale('et');
    await router.navigateByUrl('/a');
    expect(document.title).toBe(`Varjupaikade kaart — ${APP_NAME}`);
  });

  it('leaves document.title untouched for routes without a title', async () => {
    document.title = 'initial';
    await router.navigateByUrl('/b');
    expect(document.title).toBe('initial');
  });

  it('every routable route title is a message key present in BOTH catalogs', () => {
    // component (eager) OR loadComponent (lazy, bundle budget) — either
    // way the route renders a page and needs a tab title.
    const titled = routes
      .filter((route: Route) => route.component !== undefined || route.loadComponent !== undefined)
      .map((route: Route) => route.data?.['title']);
    // The 11 product routes (map, login, register, reset, verify, account,
    // privacy, terms, shelters/:id, submit, admin) — a new component route
    // without a title fails this check.
    expect(titled.length).toBe(11);
    for (const title of titled) {
      expect(typeof title, `route missing data.title: ${title}`).toBe('string');
      const key = title as MessageKey;
      // Both catalogs must carry the key at RUNTIME (the typed access is
      // compile-time-only; this is the typo guard). The en/et key-parity
      // guard in i18n.spec.ts keeps the catalogs in lockstep; this check
      // keeps the ROUTES pointing at real keys.
      expect(EN[key], `en catalog missing key: ${key}`).toBeTruthy();
      expect(ET[key], `et catalog missing key: ${key}`).toBeTruthy();
    }
  });
});
