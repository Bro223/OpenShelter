/**
 * Base (PRODUCTION) environment.
 *
 * The development build swaps this file for environment.development.ts
 * (angular.json `fileReplacements`) — the dev server always talks to the
 * local backend. This file is what a `ng build` (production) ships with.
 *
 * `apiUrl` — the origin the SPA calls the Spring Boot API at. It is the ONLY
 * value a deployment may need to change: set it to wherever the backend is
 * reachable from your deployment (e.g. 'https://api.example.ee') and rebuild.
 * If the SPA and the API are served from the same origin behind a proxy that
 * forwards /… to the backend, an empty string ('') works too — the client
 * then calls the current origin.
 *
 * Only PUBLIC configuration belongs in environment*.ts (01-TASK.md §5.10) —
 * never tokens or secrets; the backend is public-facing read/write with its
 * own rate limits.
 */
export const environment = {
  production: true,
  // Same-origin default: when the SPA and the API share an origin behind a
  // proxy that forwards /api to the Spring Boot backend, '' is correct and
  // safest (never the end-user's own localhost). Deployments with the API on
  // another origin must set this to that origin (see README) before building.
  apiUrl: '',
};
