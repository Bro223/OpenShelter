# Context — Core Layer & Auth (M1–M2)

**Source diagrams:** `01-frontend-architecture.puml` (core + gateways + routes),
`02-auth-flow.puml` (sequences).
**Used by:** M1 (core plumbing) and M2 (auth pages + guards).

## Purpose

The foundation every screen builds on: typed access to the backend, one uniform error path, and
the session lifecycle (login / register / silent refresh / 401 handling / logout) that mirrors the
backend's JWT + rotating-refresh design.

## Classes to create

### `core/` (depend on nothing above them)

| Type             | Kind              | Key members / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApiError`       | class             | mirrors `ErrorResponse`: `timestamp,status,error,message,path`. Static `fromHttp(status, body)` and `fromNetwork()` (backend unreachable).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `ApiClient`      | service           | wraps `HttpClient`; `request<T>(method, path, body?)`, typed `get/post/put/delete`. Base URL from `environment.apiUrl`. Converts every failure (HTTP + network) into `ApiError` via `catchError`. **The only class allowed to touch `HttpClient`.**                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| models           | types/interfaces  | in `core/models.ts` (or `models/`): every request/response shape from `02-CONTEXT-API.md`, field-for-field.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `TokenStore`     | service           | `accessToken: signal<string                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | null>`(memory), refresh token in`localStorage`under a fixed key (e.g.`os.refresh`).`setTokens(access, refresh, expiresIn)`,`clear()`,`access()`. |
| `AuthStore`      | service           | session state: `authenticated`, the REAL profile signals (`name`, `email`, `phone`, `nationalIdCode` — from `GET /account/me`, null while unknown) and `levels: VerificationLevel[]` (the REAL verified claims), `init()` (silent refresh at boot + profile fetch), `register/login/logout`, `refresh(): Promise<boolean>` **single-flight** (concurrent callers share one in-flight refresh), `refreshProfile(): Promise<void>` **single-flight, non-fatal** (re-fetch after every claims-changing event). Exposes `isVerified()` (any level) used by `VerifiedGuard` and banners. The M3 optimistic `addLevel()` mirror is gone — the fetched profile is the single source of truth. |
| `ApiInterceptor` | `HttpInterceptor` | attaches `Authorization: Bearer <access>` (skip `/auth/login`, `/auth/refresh`). On 401 → single-flight `AuthStore.refresh()` → retry original request once; on refresh failure → `logout()` + redirect `/login?session=expired`. Registered via `provideHttpClient(withInterceptors([...]))` (functional interceptor) in `app.config.ts`.                                                                                                                                                                                                                                                                                                                                             |
| `AuthGuard`      | guard             | `canActivate` — authenticated? else redirect `/login?returnUrl=…`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `GuestGuard`     | guard             | already authenticated? redirect `/map`. Used by login/register/reset pages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `VerifiedGuard`  | guard             | authenticated **and** `isVerified()`? else redirect `/verify`. Used by `/submit`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### `gateways/`

| Type          | Kind    | Key members / notes                                                                                                                                                                                                                                                                              |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AuthGateway` | service | `register(RegisterRequest)`, `login(emailOrPhone, password): TokenResponse`, `refresh(refreshToken): TokenResponse`, `logout(refreshToken)`, `requestPasswordReset(email)`, `resetPassword(token, newPassword)`. Maps to `ApiClient` calls — **no token logic here** (that's `AuthStore`'s job). |

### `features/auth/` (M2)

| Type           | Kind      | Notes                                                                                                                                                                                                                                                  |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LoginPage`    | component | route `/login` (GuestGuard). Fields: emailOrPhone + password. Generic error banner on 401/429. Success → `returnUrl` or `/map`.                                                                                                                        |
| `RegisterPage` | component | route `/register` (GuestGuard). Fields: name, email, phone, nationalIdCode, password. 409 → inline field error ("email already registered"). Success → success view: "account created — log in, then verify your email" (backend does not auto-login). |
| `ResetPage`    | component | route `/reset` (GuestGuard). Two states: request (email → always "if the account exists, we sent a link") and confirm (token from email link `?token=…` → newPassword). On success → `/login`.                                                         |

### `shared/` (first pieces)

`PageShell` (header: brand, map link, login/logout/user menu; `<router-outlet/>`), `BannerComponent`
(severity: info/success/warning/error; message signal input). Other shared bits land in M3–M5.

## Key decisions

1. **Access token in memory, refresh token in localStorage.** Survives reloads (refresh), keeps the
   access token out of storage (smaller XSS surface). Tradeoff documented in the frontend README:
   a future hardening step moves refresh handling to `httpOnly` cookies (backend change, deferred).
2. **Single-flight refresh.** N concurrent 401s trigger exactly one `POST /auth/refresh`; the rest
   await the same promise, then retry once with the new token. Prevents refresh-token races
   against the backend's rotation (an old refresh token must never be used twice).
3. **401 handled once, globally.** Pages never catch 401 themselves — the interceptor refreshes;
   if refresh fails it logs out and redirects. Pages only handle business errors (400/403/409/429).
4. **Register ≠ login.** Backend returns 201 with an empty body — the UI guides the user to log in
   and verify EMAIL first (M3), because submitting shelters/reviews requires a verified account.
5. **No `any`, no untyped payloads.** Every gateway call has a typed request and a typed response;
   unknown payloads are a compile error, not a runtime surprise.

## Contracts with other contexts

- M3 builds `VerifyPage` + the account page on `AuthStore.levels()` (real claims) and the
  verify/account gateways (03 puml); M7 reworks `/account` into `AccountPage` (profile + identity
  edit + per-contact verification labels) and removes the Verify top-nav item.
- M4/M5 pages use `AuthStore` only to branch UI (log in prompt, verify prompt); data flows through
  `ShelterGateway`/`ReviewGateway`.
- Environment: `environment*.ts` carries only public config (apiUrl). **Never** tokens/keys.
