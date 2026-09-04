import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { from } from 'rxjs';
import { catchError, mergeMap, throwError } from 'rxjs';
import { AuthStore } from './auth-store';
import { TokenStore } from './token-store';

/**
 * Endpoints that must never receive a Bearer token and whose 401s are handled
 * by their own callers (AuthStore / the login page), not by this interceptor.
 */
const NO_BEARER_ENDPOINT = /\/auth\/(login|refresh)$/;

function isAuthFormEndpoint(url: string): boolean {
  return NO_BEARER_ENDPOINT.test(url);
}

/**
 * ApiInterceptor (functional interceptor, 03-CONTEXT-CORE-AUTH.md):
 *  1. attaches `Authorization: Bearer <access>` to every request carrying a
 *     token — never to /auth/login or /auth/refresh (public endpoints);
 *  2. on a 401 mid-session: single-flight AuthStore.refresh(), then retries
 *     the original request once with the new token;
 *  3. on refresh failure AuthStore already cleared the session — redirect to
 *     /login?session=expired.
 *
 * 401 is handled exactly once, here — pages never catch 401 themselves.
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
      // 401s on /auth/login|refresh belong to their callers (login page /
      // AuthStore.init) — no refresh dance for them.
      if (error.status !== 401 || authFormRequest) {
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
          return next(retried);
        }),
      );
    }),
  );
};
