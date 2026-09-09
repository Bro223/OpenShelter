/**
 * Pure text -> coordinates parsing for the /submit smart location input
 * (openspec change `shelter-location-input`).
 *
 * The single client-side authority for "text -> coordinates": coordinate
 * strings, DMS strings, and long-form map URLs (Google/Apple/Bing) all go
 * through `parseLocationInput`. It is PURE — no DOM, no network, no imports
 * — so the backend's resolver can mirror the exact same case table
 * (design decision 1: one shared pure parser; same fixtures both sides).
 *
 * Deliberately does NOT import the bbox from leaflet-service: this helper
 * must stay dependency-free (leaflet-service pulls the leaflet npm package).
 * The bounds mirror the backend's GeoPoint.inEstonia (57.5-59.7 / 21.5-28.2)
 * and the client-side ESTONIA_BOUNDS — the backend re-checks either way.
 */

/** Estonia bounding box — mirror of GeoPoint.inEstonia / ESTONIA_BOUNDS. */
export const ESTONIA_PARSE_BOUNDS = {
  minLat: 57.5,
  maxLat: 59.7,
  minLng: 21.5,
  maxLng: 28.2,
} as const;

/** The one parse result: a (possibly auto-swapped) pair, or a specific failure reason. */
export type ParseLocationResult =
  | {
      latitude: number;
      longitude: number;
      /** True when (lng, lat) was detected and the values were auto-swapped to (lat, lng). */
      swapped?: boolean;
    }
  | {
      reason: 'no-pair' | 'out-of-bounds' | 'invalid';
      /** Short diagnostic (not user-facing — the page renders reason-based copy). */
      detail?: string;
    };

/** True for the Estonia box: x as latitude, y as longitude. */
function inEstoniaBox(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= ESTONIA_PARSE_BOUNDS.minLat &&
    latitude <= ESTONIA_PARSE_BOUNDS.maxLat &&
    longitude >= ESTONIA_PARSE_BOUNDS.minLng &&
    longitude <= ESTONIA_PARSE_BOUNDS.maxLng
  );
}

/** Apply the bbox gate with the order auto-swap rule (design decision 2d). */
function gateWithSwap(a: number, b: number): ParseLocationResult {
  if (inEstoniaBox(a, b)) {
    return { latitude: a, longitude: b };
  }
  if (inEstoniaBox(b, a)) {
    return { latitude: b, longitude: a, swapped: true };
  }
  return { reason: 'out-of-bounds', detail: `${a}, ${b} is outside Estonia in both orders` };
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const URL_PATTERN = /^https?:\/\/\S+$/i;
/** A trimmed maps.app.goo.gl short link, with or without scheme (the page routes these to the backend). */
const GOO_SHORT_LINK_PATTERN = /^(?:https?:\/\/)?maps\.app\.goo\.gl\/\S+$/i;

/** One decimal pair separated by comma, semicolon, whitespace or '+' (URL-encoded space). */
const PAIR_PATTERN = /(-?\d+(?:\.\d+)?)[,\s+;]+(-?\d+(?:\.\d+)?)/;
const DECIMAL_PATTERN = /-?\d+(?:\.\d+)?/g;

/** Google share format: !3d59.437!4d24.753 (case-insensitive d-marker). */
const GOO_SHARE_PATTERN = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i;
/** Google path format: /@59.437,24.753 (maps/@…, maps/place/…/@…, any host). */
const AT_COORD_PATTERN = /@(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/;

/** Map-URL query params that carry coordinate pairs (Google q/ll/daddr/saddr, Apple ll). */
const QUERY_PARAM_PATTERNS: readonly RegExp[] = [
  /(?:[?&])q=([^&#]*)/i,
  /(?:[?&])ll=([^&#]*)/i,
  /(?:[?&])daddr=([^&#]*)/i,
  /(?:[?&])saddr=([^&#]*)/i,
];

/**
 * One DMS token: degrees + optional minutes/seconds (markers required) +
 * optional hemisphere letter. `59°26'13"N`, `59° 26' 12" E`, `59°26.5'N`, `59°N`.
 */
const DMS_TOKEN_PATTERN =
  /(-?\d+)\s*[°º]\s*(?:(\d+(?:\.\d+)?)\s*['′]\s*(?:(\d+(?:\.\d+)?)\s*["″])?\s*)?([NSEWnsew])?/g;

/** `lat:` / `lng:` / `latitude:` / `longitude:` labels (colon optional) — stripped before decimal scan. */
const LABEL_PATTERN = /\b(?:lat(?:itude)?|lng(?:itude)?)\s*:/gi;
const LABEL_PRESENT_PATTERN = /\b(?:lat(?:itude)?|lng(?:itude)?)\s*:/i;

/** A hemisphere letter touching a number: `59.44N`, `24.75 E`, `N 24.75` (NOT the 'n' inside "Tallinn"). */
const HEMISHERE_ADMONST_PATTERN = /[-\d]\s*[NSEWnsew]|[NSEWnsew]\s*[-\d]/;

interface DmsToken {
  value: number;
  hemisphere: 'N' | 'S' | 'E' | 'W' | null;
}

function toDecimalPair(text: string): [number, number] | null {
  const match = PAIR_PATTERN.exec(text);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2])];
}

/** Extract the pair carried by one URL query param value (comma/space/'+'-separated). */
function paramPair(url: string, pattern: RegExp): [number, number] | null {
  const param = pattern.exec(url);
  if (!param) {
    return null;
  }
  return toDecimalPair(param[1]);
}

function dmsTokens(text: string): DmsToken[] {
  DMS_TOKEN_PATTERN.lastIndex = 0;
  const tokens: DmsToken[] = [];
  let match: RegExpExecArray | null;
  while ((match = DMS_TOKEN_PATTERN.exec(text)) !== null) {
    const degrees = Number(match[1]);
    const minutes = match[2] === undefined ? 0 : Number(match[2]);
    const seconds = match[3] === undefined ? 0 : Number(match[3]);
    let value = degrees + minutes / 60 + seconds / 3600;
    const hemisphere = (match[4]?.toUpperCase() as DmsToken['hemisphere']) ?? null;
    if (hemisphere === 'S' || hemisphere === 'W') {
      value = -value;
    }
    tokens.push({ value, hemisphere });
  }
  return tokens;
}

/**
 * Two DMS tokens -> (lat, lng). Hemisphere letters are authoritative (a
 * pasted "24°45'E 59°26'N" is resolved WITHOUT a swapped flag — the order
 * was never ambiguous). Without letters: first = lat, second = lng, and the
 * numeric bbox swap rule still applies (same mistake profile as plain pairs).
 */
function dmsToPair(tokens: DmsToken[]): ParseLocationResult {
  const northSouth = tokens.find((t) => t.hemisphere === 'N' || t.hemisphere === 'S');
  const eastWest = tokens.find((t) => t.hemisphere === 'E' || t.hemisphere === 'W');
  if (northSouth !== undefined && eastWest !== undefined) {
    if (inEstoniaBox(northSouth.value, eastWest.value)) {
      return { latitude: northSouth.value, longitude: eastWest.value };
    }
    // Hemisphere letters are authoritative — never numerically swap them.
    return {
      reason: 'out-of-bounds',
      detail: `hemispheres pin the order: ${northSouth.value}, ${eastWest.value}`,
    };
  }
  const [a, b] = [tokens[0].value, tokens[1].value];
  return gateWithSwap(a, b);
}

/** First two decimals of the text (labels stripped first). */
function plainPair(text: string): [number, number] | null {
  const stripped = text.replace(LABEL_PATTERN, ' ');
  const decimals = stripped.match(DECIMAL_PATTERN);
  if (decimals === null || decimals.length < 2) {
    return null;
  }
  return [Number(decimals[0]), Number(decimals[1])];
}

/** URL branch (design decision 2a): known patterns first, then the generic pair. */
function urlPair(url: string): ParseLocationResult {
  for (const pattern of QUERY_PARAM_PATTERNS) {
    const pair = paramPair(url, pattern);
    if (pair !== null) {
      return gateWithSwap(pair[0], pair[1]);
    }
  }
  const share = GOO_SHARE_PATTERN.exec(url);
  if (share !== null) {
    return gateWithSwap(Number(share[1]), Number(share[2]));
  }
  const at = AT_COORD_PATTERN.exec(url);
  if (at !== null) {
    return gateWithSwap(Number(at[1]), Number(at[2]));
  }
  const generic = toDecimalPair(url);
  if (generic !== null) {
    return gateWithSwap(generic[0], generic[1]);
  }
  return { reason: 'no-pair', detail: 'no coordinate pair in the URL' };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse free text into coordinates (pure, deterministic):
 *   a. http(s) URL      -> known map-URL patterns, then first decimal pair
 *   b. DMS markers (°, hemisphere letters) -> DMS parse, else decimal fallback
 *   c. fallback          -> first two decimals (labels stripped)
 * then the Estonia bbox gate with the (lng,lat) auto-swap rule.
 *
 * Failures are specific: 'no-pair' (nothing numeric at all), 'invalid'
 * (coordinate-shaped markers present but no usable pair), 'out-of-bounds'
 * (a pair, but outside Estonia in both orders).
 */
export function parseLocationInput(text: string): ParseLocationResult {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { reason: 'no-pair', detail: 'empty input' };
  }

  if (URL_PATTERN.test(trimmed)) {
    return urlPair(trimmed);
  }

  const hasDegree = /[°º]/.test(trimmed);
  const hasHemisphere = HEMISHERE_ADMONST_PATTERN.test(trimmed);
  if (hasDegree || hasHemisphere) {
    const tokens = dmsTokens(trimmed);
    if (tokens.length >= 2) {
      return dmsToPair(tokens);
    }
    if (tokens.length === 1) {
      // One DMS value is a lone latitude or longitude — never guess the other
      // (design risk: no silent wrong pin). Do NOT fall back to the decimal
      // scan: its first two decimals would be the degree+minute parts of the
      // same token, which would place a plausible-but-wrong pin.
      return { reason: 'invalid', detail: 'a single DMS value is not a coordinate pair' };
    }
    // Markers present but no DMS token (e.g. "59.44N 24.75E") -> decimal fallback.
    const pair = plainPair(trimmed);
    if (pair !== null) {
      return gateWithSwap(pair[0], pair[1]);
    }
    return { reason: 'invalid', detail: 'coordinate markers without a parseable pair' };
  }

  const pair = plainPair(trimmed);
  if (pair !== null) {
    return gateWithSwap(pair[0], pair[1]);
  }
  return {
    reason: LABEL_PRESENT_PATTERN.test(trimmed) ? 'invalid' : 'no-pair',
    detail: LABEL_PRESENT_PATTERN.test(trimmed)
      ? 'labels without a coordinate pair'
      : 'no coordinate pair found',
  };
}

/** True when the trimmed input is a Google short link (host maps.app.goo.gl). */
export function isGooShortLink(text: string): boolean {
  return GOO_SHORT_LINK_PATTERN.test(text.trim());
}

/** A short link for POST /api/geo/resolve — the backend requires a scheme. */
export function normalizeShortLinkUrl(text: string): string {
  const trimmed = text.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
