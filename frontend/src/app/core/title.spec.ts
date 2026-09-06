import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Route } from '@angular/router';
import { routes } from '../app.routes';
import { APP_NAME, titleGuard } from './title';

/**
 * M6 route titles (spec: "Route titles and favicon").
 *  - Mechanism: titleGuard sets document.title from route data on
 *    navigation ("<Page> — OpenShelter").
 *  - Completeness: every routable entry in the real route table carries a
 *    data.title, so a new route cannot silently ship without a tab title.
 */

@Component({ template: '<p>stub</p>' })
class Stub {}

describe('route titles', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'a', component: Stub, data: { title: 'Page A' }, canActivate: [titleGuard] },
          { path: 'b', component: Stub }, // no title — must be left untouched
        ]),
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    document.title = '';
  });

  it('sets document.title to "<Page> — OpenShelter" after navigating to a titled route', async () => {
    document.title = 'initial';
    await router.navigateByUrl('/a');
    expect(document.title).toBe(`Page A — ${APP_NAME}`);
  });

  it('leaves document.title untouched for routes without a title', async () => {
    document.title = 'initial';
    await router.navigateByUrl('/b');
    expect(document.title).toBe('initial');
  });

  it('every routable route in app.routes.ts carries a data.title', () => {
    // component (eager) OR loadComponent (lazy, M6 bundle budget) — either
    // way the route renders a page and needs a tab title.
    const titled = routes
      .filter((route: Route) => route.component !== undefined || route.loadComponent !== undefined)
      .map((route: Route) => route.data?.['title']);
    // The 8 product routes (map, login, register, reset, verify, account,
    // shelters/:id, submit) — a new component route without a title fails
    // this check.
    expect(titled.length).toBe(8);
    for (const title of titled) {
      expect(typeof title, `route missing data.title: ${title}`).toBe('string');
      expect((title as string).length).toBeGreaterThan(0);
    }
  });
});
