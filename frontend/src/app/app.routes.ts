import type { Routes } from '@angular/router';
import { titleGuard } from './core/title';
import { authGuard, adminGuard, guestGuard, verifiedGuard } from './core/guards';
import { MapPage } from './features/map/map-page';

/**
 * Route map (01 puml):
 *  - /login /register /reset (GuestGuard) + home (/map, public)
 *  - /verify + /account (AuthGuard); /account is the full AccountPage (real
 *    profile + per-contact verification labels + password-confirmed identity
 *    edit). Verify is not a top-nav item — /verify stays for guard redirects
 *    and CTAs
 *  - /map is the Leaflet browse map; /shelters/:id the public detail page
 *    (marker/row navigation lands there; the trust-layer controls branch on
 *    auth/verification in-component), /submit (AuthGuard + VerifiedGuard)
 * — and /submit?edit=<id> (shelter editing reuses the add form):
 *    the SAME form in an explicit edit mode. A query param, not a new
 *    route, keeps ONE route entry + ONE lazy chunk + the same guards, and
 *    the creation path /submit is literally unchanged (no param). The
 *    account panel's Edit opens /submit?edit=<id>; the page prefills from
 *    GET /api/shelters/mine (owner-scoped) and saves with
 *    PUT /api/shelters/{id} — the edit publishes immediately (the row's
 *    status is untouched, so a published shelter never leaves the map)
 *    and carries the pending-verification (NEW) trust state a new
 *    submission gets.
 *  - every route carries `data.title` + titleGuard — the browser tab
 *    shows "<Page> — OpenShelter" (core/title.ts, tested in title.spec.ts).
 *    /shelters/:id and /submit are loadComponent-lazy (bundle budget —
 *    see the angular.json budgets note); the five auth/account routes
 *    (login, register, reset, verify, account) are lazy for the same
 *    reason — none of them is needed for first paint of the map. Leaflet
 *    stays initial because the default /map route needs it.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'map' },
  { path: 'map', component: MapPage, data: { title: 'title.map' }, canActivate: [titleGuard] },
  // Lazy (bundle budget): the auth flow is only needed once a visitor
  // leaves the map — never for first paint.
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
    data: { title: 'title.login' },
    canActivate: [titleGuard, guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register-page').then((m) => m.RegisterPage),
    data: { title: 'title.register' },
    canActivate: [titleGuard, guestGuard],
  },
  {
    path: 'reset',
    loadComponent: () => import('./features/auth/reset-page').then((m) => m.ResetPage),
    data: { title: 'title.reset' },
    canActivate: [titleGuard, guestGuard],
  },
  // Lazy (bundle budget): verification only happens after a login.
  {
    path: 'verify',
    loadComponent: () => import('./features/account/verify-page').then((m) => m.VerifyPage),
    data: { title: 'title.verify' },
    canActivate: [titleGuard, authGuard],
  },
  // Lazy (bundle budget): the account page only exists for signed-in users.
  {
    path: 'account',
    loadComponent: () => import('./features/account/account-page').then((m) => m.AccountPage),
    data: { title: 'title.account' },
    canActivate: [titleGuard, authGuard],
  },
  // Static legal pages, no backend — lazy for
  // the same bundle-budget reason as the other rare routes.
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/privacy-policy-page').then((m) => m.PrivacyPolicyPage),
    data: { title: 'title.privacy' },
    canActivate: [titleGuard],
  },
  {
    path: 'terms',
    loadComponent: () => import('./features/legal/terms-page').then((m) => m.TermsPage),
    data: { title: 'title.terms' },
    canActivate: [titleGuard],
  },
  // Public: anonymous visitors see the detail without the trust-layer
  // controls (report / occupancy / open-closed); the page itself branches
  // on auth/verification (design decision 2).
  {
    path: 'shelters/:id',
    // Lazy (bundle budget): the detail page is only needed after a
    // marker/row click, not for first paint of the map.
    loadComponent: () =>
      import('./features/shelter/shelter-detail-page').then((m) => m.ShelterDetailPage),
    data: { title: 'title.shelterDetail' },
    canActivate: [titleGuard],
  },
  // Public: the crisis guidance index — permit-all,
  // the top-nav item lands here.
  {
    path: 'blog',
    // Lazy (bundle budget): the index is not needed for first paint of the map.
    loadComponent: () =>
      import('./features/guidance/guidance-list-page').then((m) => m.GuidanceListPage),
    data: { title: 'title.guidance' },
    canActivate: [titleGuard],
  },
  // Public: one published guidance post by slug — a draft slug and an
  // unknown slug answer the SAME 404 (the page renders not-found).
  {
    path: 'blog/:slug',
    // Lazy (bundle budget): a post is only needed after an index click.
    loadComponent: () =>
      import('./features/guidance/guidance-detail-page').then((m) => m.GuidanceDetailPage),
    data: { title: 'title.guidanceDetail' },
    canActivate: [titleGuard],
  },
  // Verified accounts only — mirrors the backend 403 (design decision 5).
  // /submit?edit=<id>: this same component in edit mode — see the
  // route-map comment above; the ?edit param is read by the page itself
  // (ActivatedRoute), no route change.
  {
    path: 'submit',
    // Lazy (bundle budget): form + mini-map code defers until a verified
    // user actually opens the route.
    loadComponent: () =>
      import('./features/shelter/submit-shelter-page').then((m) => m.SubmitShelterPage),
    data: { title: 'title.submit' },
    canActivate: [titleGuard, authGuard, verifiedGuard],
  },
  // Admin-kind only: adminGuard sends BOTH anonymous
  // and authenticated non-admins home; the backend re-checks kind per
  // request, so this is UX, not enforcement.
  {
    path: 'admin',
    // Lazy (bundle budget): the moderation tool is a rare route — no other
    // page needs its code.
    loadComponent: () => import('./features/admin/admin-page').then((m) => m.AdminPage),
    data: { title: 'title.admin' },
    canActivate: [titleGuard, adminGuard],
  },
  { path: '**', redirectTo: 'map' },
];
