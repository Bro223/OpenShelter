import type { Routes } from '@angular/router';
import { authGuard, guestGuard, verifiedGuard } from './core/guards';
import { titleGuard } from './core/title';
import { LoginPage } from './features/auth/login-page';
import { RegisterPage } from './features/auth/register-page';
import { ResetPage } from './features/auth/reset-page';
import { MapPage } from './features/map/map-page';
import { VerifyPage } from './features/account/verify-page';
import { AccountPage } from './features/account/account-page';

/**
 * Route map (01 puml). Built up per milestone:
 *  - M2: /login /register /reset (GuestGuard) + home (/map, public)
 *  - M3: /verify + /account (AuthGuard)
 *  - M7: /account becomes the full AccountPage (real profile + per-contact
 *        verification labels + password-confirmed identity edit); the Verify
 *        top-nav item is removed — /verify stays for guard redirects + CTAs
 *  - M4: the real Leaflet map replaces the /map placeholder
 *        + /shelters/:id stub (public) — marker/row navigation lands here
 *  - M5: the real /shelters/:id detail page replaces the stub (still public —
 *        the review area branches in-component), /submit (AuthGuard + VerifiedGuard)
 *  - M6: every route carries `data.title` + titleGuard — the browser tab
 *        shows "<Page> — OpenShelter" (core/title.ts, tested in title.spec.ts).
 *        /shelters/:id and /submit are loadComponent-lazy (bundle budget —
 *        see the angular.json budgets note); leaflet stays initial because
 *        the default /map route needs it.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'map' },
  { path: 'map', component: MapPage, data: { title: 'Shelter map' }, canActivate: [titleGuard] },
  {
    path: 'login',
    component: LoginPage,
    data: { title: 'Log in' },
    canActivate: [titleGuard, guestGuard],
  },
  {
    path: 'register',
    component: RegisterPage,
    data: { title: 'Create account' },
    canActivate: [titleGuard, guestGuard],
  },
  {
    path: 'reset',
    component: ResetPage,
    data: { title: 'Reset password' },
    canActivate: [titleGuard, guestGuard],
  },
  {
    path: 'verify',
    component: VerifyPage,
    data: { title: 'Verify account' },
    canActivate: [titleGuard, authGuard],
  },
  {
    path: 'account',
    component: AccountPage,
    data: { title: 'Account' },
    canActivate: [titleGuard, authGuard],
  },
  // Public: anonymous visitors see the detail without the review controls;
  // the page itself branches on auth/verification (design decision 2).
  {
    path: 'shelters/:id',
    // Lazy (M6 bundle budget): the detail page + review form are only needed
    // after a marker/row click, not for first paint of the map.
    loadComponent: () =>
      import('./features/shelter/shelter-detail-page').then((m) => m.ShelterDetailPage),
    data: { title: 'Shelter detail' },
    canActivate: [titleGuard],
  },
  // Verified accounts only — mirrors the backend 403 (design decision 5).
  {
    path: 'submit',
    // Lazy (M6 bundle budget): form + mini-map code defers until a verified
    // user actually opens the route.
    loadComponent: () =>
      import('./features/shelter/submit-shelter-page').then((m) => m.SubmitShelterPage),
    data: { title: 'Submit a shelter' },
    canActivate: [titleGuard, authGuard, verifiedGuard],
  },
  { path: '**', redirectTo: 'map' },
];
