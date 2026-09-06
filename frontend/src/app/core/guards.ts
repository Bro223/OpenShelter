/**
 * Guards + routing helpers for session-protected navigation (M2, M5).
 *
 * 03-CONTEXT-CORE-AUTH.md:
 *  - AuthGuard   -> authenticated? allow : redirect /login?returnUrl=...
 *  - GuestGuard  -> already authenticated? redirect home (/map) : allow
 *    (used by /login, /register, /reset)
 *  - VerifiedGuard (M5) -> has a verification claim? allow : redirect
 *    /verify?returnUrl=... (used by /submit; mirrors the backend 403)
 *
 * Functional guards (Angular 22 style, same as the apiInterceptor in M1).
 * All await AuthStore.init() so a reload while logged in silently restores
 * the session BEFORE the guard decides — no "logged out" flash on the
 * login/register pages.
 */
import { inject } from '@angular/core';
import { Router, type CanActivateFn, type UrlTree } from '@angular/router';
import { AuthStore } from './auth-store';

/** Where an authenticated guest is sent (the map; real page lands in M4). */
export const HOME_PATH = '/map';
export const LOGIN_PATH = '/login';
export const VERIFY_PATH = '/verify';

/**
 * Only internal absolute paths are acceptable as a returnUrl — anything else
 * (absolute URLs, protocol-relative "//host", backslashes) falls back to home.
 */
export function safeReturnUrl(value: string | null | undefined): string {
  if (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\')
  ) {
    return value;
  }
  return HOME_PATH;
}

async function decideAfterInit(store: AuthStore): Promise<void> {
  if (!store.initialized()) {
    await store.init();
  }
}

/** Allow authenticated users only; anonymous -> /login?returnUrl=<current>. */
export const authGuard: CanActivateFn = async (_route, state): Promise<boolean | UrlTree> => {
  const store = inject(AuthStore);
  const router = inject(Router);
  await decideAfterInit(store);
  if (store.authenticated()) {
    return true;
  }
  return router.createUrlTree([LOGIN_PATH], { queryParams: { returnUrl: state.url } });
};

/** Allow guests only; authenticated users -> home (/map). */
export const guestGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const store = inject(AuthStore);
  const router = inject(Router);
  await decideAfterInit(store);
  if (!store.authenticated()) {
    return true;
  }
  return router.parseUrl(HOME_PATH);
};

/**
 * Verified accounts only (M5, used by /submit): mirrors the backend's
 * "verified account required" 403. authGuard runs first on the route, so
 * this only ever sees authenticated users; one without any verification
 * claim goes to /verify?returnUrl=<current> (the form becomes reachable
 * once a claim lands this session).
 */
export const verifiedGuard: CanActivateFn = async (_route, state): Promise<boolean | UrlTree> => {
  const store = inject(AuthStore);
  const router = inject(Router);
  await decideAfterInit(store);
  if (store.isVerified()) {
    return true;
  }
  return router.createUrlTree([VERIFY_PATH], { queryParams: { returnUrl: state.url } });
};
