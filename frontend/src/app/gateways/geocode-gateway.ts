import { Injectable } from '@angular/core';
import { ApiError } from '../core/api-error';
import type { GeocodeResult } from '../core/models';

/**
 * The door to OSM Nominatim (shelter-address-search) — the ONLY module that
 * knows the Nominatim URL/params. Kept SEPARATE from GeoGateway on purpose:
 * GeoGateway maps to the backend's /api/geo controller group; this is a
 * client-side call to an EXTERNAL service (no JWT, no backend hop), and
 * gateways stay one-per-endpoint-group (01-TASK.md §4).
 *
 * Nominatim usage policy (operations.osmfoundation.org/policies/nominatim):
 * - At most 1 request/second — enforced below as a HARD 1000 ms spacing
 *   between consecutive requests: every search chains onto one promise
 *   queue, so a request landing inside the window is delayed until the
 *   window allows (never burst). The /submit page keeps the button pending
 *   for the whole wait and IGNORES extra presses (at most one pending).
 * - Identify the app — Nominatim expects Referer/Accept-Language headers;
 *   the browser sends both with every fetch (https or localhost satisfies
 *   the referer requirement), so this class sets nothing.
 * - Attribution is REQUIRED for any use — the /submit location section
 *   always renders "© OpenStreetMap contributors" (link to the OSM
 *   copyright page) next to the search box, success or failure.
 *
 * Results are Estonia-restricted (countrycodes=ee) — consistent with the
 * app's bbox rule; a foreign address honestly returns an empty list.
 */
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
/** The usage-policy minimum between two consecutive requests (1 request/s). */
const MIN_SPACING_MS = 1000;

/** One raw jsonv2 row — only the fields the app consumes (lat/lon are STRINGS). */
interface NominatimRow {
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
}

@Injectable({ providedIn: 'root' })
export class GeocodeGateway {
  /** When the previous request was FIRED — the spacing anchor. */
  private lastRequestAt = 0;
  /** Every search chains onto this, so requests always fire in order. */
  private queue: Promise<unknown> = Promise.resolve();

  /**
   * GET Nominatim search with `format=jsonv2&limit=5&countrycodes=ee&q=<encoded>`.
   * A call made inside the 1000 ms window after the previous request stays
   * pending until the window allows it. Throws ApiError: status 429 (the
   * service throttles) or a network error (status 0 — offline/CORS); the
   * page picks the inline copy and the failure never blocks submission.
   */
  search(query: string): Promise<GeocodeResult[]> {
    const run = async (): Promise<GeocodeResult[]> => {
      const waitMs = this.lastRequestAt + MIN_SPACING_MS - Date.now();
      if (waitMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      }
      this.lastRequestAt = Date.now();

      const url =
        `${NOMINATIM_SEARCH_URL}?format=jsonv2&limit=5&countrycodes=ee&q=` +
        encodeURIComponent(query);
      let response: Response;
      try {
        response = await fetch(url);
      } catch {
        // fetch rejects on network failure / CORS block — no HTTP response.
        throw ApiError.fromNetwork();
      }
      if (!response.ok) {
        throw ApiError.fromHttp(response.status, await response.text().catch(() => ''), url);
      }
      const rows = (await response.json()) as NominatimRow[];
      // Malformed rows (missing/non-numeric coordinates) are dropped, not fatal.
      const results: GeocodeResult[] = [];
      for (const row of Array.isArray(rows) ? rows : []) {
        const latitude = Number(row.lat);
        const longitude = Number(row.lon);
        if (
          typeof row.display_name === 'string' &&
          row.display_name !== '' &&
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
        ) {
          results.push({
            displayName: row.display_name,
            latitude,
            longitude,
            type: row.type ?? '',
          });
        }
        if (results.length === 5) {
          break; // limit=5 is server-side — defensive cap
        }
      }
      return results;
    };

    // Chain onto the queue; run even if the previous search FAILED (a 429
    // must not poison the next search).
    const next = this.queue.then(run, run);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}
