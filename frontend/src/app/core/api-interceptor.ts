import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { from } from 'rxjs';
import { catchError, mergeMap, throwError } from 'rxjs';
import { AuthStore } from '../session/auth-store';
import { TokenStore } from './token-store';

/**
 * Public auth endpoints that must never receive a Bearer token and whose
 * 401s are handled by their own callers (the login page / AuthStore boot).
 */
const NO_BEARER_ENDPOINT = /\/auth\/(login|refresh)$/;

/**
 * Endpoints whose 401 is a BUSINESS error owned by the caller, not an
 * expired access token — no refresh dance for them:
 *  - /auth/login | /auth/refresh: their callers own the 401 (login page /
 *    AuthStore boot rotation);
 *  - /account/profile: the backend maps "current password is incorrect"
 *    onto 401 (AccountService). Refreshing on it would spend a token
 *    rotation on every typo and — with a dead refresh token — bounce the
 *    user to /login?session=expired. The account page already renders the
 *    backend message (bannerMessage kind 'profile' echoes it).
 */
const NO_REFRESH_DANCE_ENDPOINT = /\/auth\/(login|refresh)$|\/account\/profile$/;

function isAuthFormEndpoint(url: string): boolean {
  return NO_BEARER_ENDPOINT.test(url);
}

function isBusiness401Endpoint(url: string): boolean {
  return NO_REFRESH_DANCE_ENDPOINT.test(url);
}

/**
 * ApiInterceptor (functional interceptor):
 *  1. attaches `Authorization: Bearer <access>` to every request carrying a
 *     token — never to /auth/login or /auth/refresh (public endpoints;
 *     /account/profile DOES receive the token — it is an authenticated call);
 *  2. on a 401 mid-session: single-flight AuthStore.refresh(), then retries
 *     the original request once with the new token;
 *  3. on refresh failure (AuthStore has already cleared the session) OR on
 *     a 401 by the POST-REFRESH RETRY (the freshly rotated token is also
 *     invalid — the session is definitively dead): redirect to
 *     /login?session=expired and rethrow so the page renders its error state.
 *
 * 401 is handled exactly once, here — pages never catch 401 themselves
 * (except the business 401s listed in NO_REFRESH_DANCE_ENDPOINT).
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStore);
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const authFormRequest = isAuthFormEndpoint(req.url);
  const access = tokens.access();
  const outgoing =
    access !== null && !authFormRequest
      ? req.clone({ setHeaders: { Authorization: `Bearer ${access}` } })
      : req;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      // 401s on /auth/login|refresh and /account/profile belong to their
      // callers (login page / AuthStore boot / account page) — no refresh
      // dance; the error propagates to the page untouched.
      if (error.status !== 401 || authFormRequest || isBusiness401Endpoint(req.url)) {
        return throwError(() => error);
      }
      return from(authStore.refresh()).pipe(
        mergeMap((refreshed) => {
          if (!refreshed) {
            // Session is dead (refresh token revoked/expired). AuthStore has
            // already cleared storage — tell the user why they landed on login.
            void router.navigate(['/login'], { queryParams: { session: 'expired' } });
            return throwError(() => error);
          }
          const fresh = tokens.access();
          const retried =
            fresh === null
              ? outgoing
              : outgoing.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } });
          // This next(retried) is a direct pipe into the transport — the
          // retry does NOT pass back through this interceptor, so a 401 here
          // can never trigger another refresh (no infinite loop). Treat the
          // post-refresh 401 as session-invalid: redirect exactly like the
          // failed-refresh path, and rethrow so the page renders its error
          // state.
          return next(retried).pipe(
            catchError((retryError: unknown) => {
              if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
                void router.navigate(['/login'], { queryParams: { session: 'expired' } });
              }
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};
