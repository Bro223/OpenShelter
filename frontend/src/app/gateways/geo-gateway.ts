import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type { LocationResolved } from '../core/models';

/**
 * The door to the /api/geo controller group — kept
 * SEPARATE from ShelterGateway on purpose: it maps to its own controller
 * (LocationController) with its own auth/rate-limit policy, and gateways
 * stay one-per-controller-group (01-TASK.md §4).
 *
 * This is the ONLY network call the /submit location section makes: Google
 * short links (maps.app.goo.gl) are opaque redirects the client cannot
 * follow (CORS), so the backend resolves them. Long-form map URLs never hit
 * this endpoint — they are parsed client-side (shared/location-input.ts).
 */
@Injectable({ providedIn: 'root' })
export class GeoGateway {
  private readonly api = inject(ApiClient);

  /**
   * POST /api/geo/resolve with {url} -> LocationResolved (200:
   * {latitude, longitude}). JWT-protected (401 unauthenticated), per-IP
   * rate-limited to 5 requests/minute (429). 400 = one generic not-found
   * message (no pair / outside Estonia / non-whitelisted host — the backend
   * never enumerates), 502 = generic upstream failure.
   */
  resolve(url: string): Promise<LocationResolved> {
    return lastValueFrom(this.api.post<LocationResolved>('/api/geo/resolve', { url }));
  }
}
