/**
 * Resolving the API-relative media URLs the backend serves.
 *
 * The API answers with API-relative paths: the media serving URL
 * (`/api/media/<stored filename>`) and the derivative `srcset` strings built
 * from them (`MediaService` on the backend). The SPA renders those paths
 * directly, so in a SPLIT deployment (the SPA and the API on different
 * origins — `environment.apiUrl` set) they must be resolved against the API
 * origin: a bare relative path would load from the SPA's own origin and 404.
 *
 * With the same-origin default (`environment.apiUrl: ''`) every resolver is
 * the identity — the URLs a same-origin build renders are byte-for-byte what
 * the API returned. Only a split build gains the API-origin prefix.
 */
import { Pipe, type PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

/** The API origin this build was produced for (trailing slashes stripped); '' = the SPA's own origin. */
const API_BASE = environment.apiUrl.replace(/\/+$/, '');

/** A URL that already carries its own scheme, or a protocol-relative host. */
const ABSOLUTE_URL = /^(?:[a-z][a-z\d+.-]*:)?\/\//i;

/**
 * Pure form (the testable core): resolve one possibly API-relative URL
 * against `apiBase`. A blank base, null and absolute/protocol-relative URLs
 * pass through untouched.
 */
export function prefixApiUrl(url: string | null, apiBase: string): string | null {
  if (url === null || apiBase === '' || ABSOLUTE_URL.test(url)) {
    return url;
  }
  return apiBase + url;
}

/**
 * Pure form: resolve a srcset string (`<url> [descriptor], ...`) against
 * `apiBase` — each entry's URL is prefixed, its descriptor (the `96w` half)
 * is untouched.
 */
export function prefixApiSrcset(srcset: string | null, apiBase: string): string | null {
  if (srcset === null || apiBase === '') {
    return srcset;
  }
  return srcset
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();
      const space = trimmed.indexOf(' ');
      const url = space === -1 ? trimmed : trimmed.slice(0, space);
      const descriptor = space === -1 ? '' : trimmed.slice(space);
      return prefixApiUrl(url, apiBase) + descriptor;
    })
    .join(', ');
}

/**
 * The `src` pipe for the media `<img>` slots (guidance heroes, the admin
 * media library, the editor's hero slots): identity for a same-origin build,
 * the API origin prefixed for a split build.
 */
@Pipe({ name: 'apiUrl' })
export class ApiUrlPipe implements PipeTransform {
  transform(url: string | null): string | null {
    return prefixApiUrl(url, API_BASE);
  }
}

/** The `srcset` twin of {@link ApiUrlPipe}. */
@Pipe({ name: 'apiSrcset' })
export class ApiSrcsetPipe implements PipeTransform {
  transform(srcset: string | null): string | null {
    return prefixApiSrcset(srcset, API_BASE);
  }
}
