/**
 * Split-origin environment: the API is served from a DIFFERENT origin than
 * the SPA. `ng build --configuration split-api` compiles this file instead
 * of environment.ts (the angular.json fileReplacements of that
 * configuration) — the plain production build never sees this file.
 *
 * Set `apiUrl` below to the public origin of the API before building — this
 * is the frontend half of the split-origin switch
 * (docs/deploy/spa-csp.md, "Split-origin deployment"); the other halves are
 * `CORS_ALLOWED_ORIGINS` on the API and the proxy CSP's
 * `--api-origin` flag.
 *
 * The committed value stays '' — a split-api build made without setting it
 * is a same-origin build, exactly like the plain production one (no silent
 * half-configuration).
 *
 * Only PUBLIC configuration belongs in environment*.ts (01-TASK.md §5.10) —
 * never tokens or secrets; the backend is public-facing read/write with its
 * own rate limits.
 */
export const environment = {
  production: true,
  // The API origin the SPA calls (e.g. 'https://api.example.ee'). '' = the
  // SPA's own origin (same-origin — the default, like environment.ts).
  apiUrl: '',
};
