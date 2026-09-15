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
 * It does not import the bbox from leaflet-service: this helper
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
      reason: 'no-pair' | 'out-of-bounds' | 'invalid' | 'decimal-comma';
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

/** A comma used as the DECIMAL mark (the Estonian locale writes 58,25). */
const DECIMAL_COMMA_PATTERN = /\d+,\d+/;
/** A point used as the decimal mark (58.25) — or a host/version like 212.50 / v1.2. */
const POINT_DECIMAL_PATTERN = /\d+\.\d+/;

/** One detail string for EVERY decimal-comma rejection (plain, DMS, mixed,
 *  URL) so the page copy stays in sync. */
const DECIMAL_COMMA_DETAIL =
  'Estonian decimal-comma detected — the comma is the decimal mark, a point is required';

/**
 * The Estonian decimal-comma guard (data integrity): the app's target
 * locale writes the decimal mark as a comma, but the pair grammar only
 * understands `.` decimals and treats `,` as a SEPARATOR. Without this guard
 * `58,25 24,9` would parse as the integer pair (58, 25) — a plausible-but-
 * wrong pin about 27 km off, stored ACTIVE. Never guess/convert the value:
 * the input is refused with its own reason and the page tells the user to
 * type a point.
 *
 * The rule: a comma-decimal token is present AND no point-decimal anywhere
 * in the text. `59.4370, 24.7535` (comma as separator) carries a point ->
 * parses normally. A MIX of comma-decimals and point-decimals across tokens
 * (`59,4370 24.75`) is caught by {@link hasMixedDecimalMarks} instead — same
 * reason, and the guard's copy explains the fix where the bbox gate's
 * "outside Estonia" would misdiagnose it. For URLs the host always
 * carries dots, so the caller runs this guard on the segment that can carry
 * coordinates (see `urlPair`) rather than the whole URL.
 */
function decimalCommaFailure(text: string): ParseLocationResult | null {
  if (DECIMAL_COMMA_PATTERN.test(text) && !POINT_DECIMAL_PATTERN.test(text)) {
    return { reason: 'decimal-comma', detail: DECIMAL_COMMA_DETAIL };
  }
  return null;
}

/**
 * True when the text mixes the two decimal marks ACROSS tokens — a
 * comma-decimal in one token and a point-decimal in another (the input
 * `59,4370 24.75`). The separator grammar would read (59, 4370) and the bbox
 * gate would reject it as "outside Estonia" — a wrong diagnosis; the real
 * problem is the mixed separators, which the decimal-comma copy names.
 *
 * A comma INSIDE a point-decimal pair (`59.4370, 24.7535` — comma as
 * separator) is not a decimal mark: the comma-decimal match there starts
 * immediately after a point (its left digits are the fractional part of the
 * point-decimal), which the check excludes.
 */
function hasMixedDecimalMarks(text: string): boolean {
  if (!POINT_DECIMAL_PATTERN.test(text)) {
    return false;
  }
  const commaDecimal = /\d+,\d+/g;
  let match: RegExpExecArray | null;
  while ((match = commaDecimal.exec(text)) !== null) {
    const before = match.index > 0 ? text.charAt(match.index - 1) : '';
    if (before !== '.') {
      return true;
    }
  }
  return false;
}

/**
 * True when the text carries a plain decimal value OUTSIDE the DMS tokens —
 * a DMS + decimal mix such as `59°26'13"N 24.7535` (the mix needs its
 * own message, "a single DMS value" misdescribes a two-value input). The
 * tokens' raw spans are masked first so their degree/minute/second digits
 * do not count.
 */
function hasNonDmsDecimal(text: string): boolean {
  const masked = text.replace(DMS_TOKEN_PATTERN, ' ');
  return /\d/.test(masked);
}

/** Google share format: !3d59.437!4d24.753 (case-insensitive d-marker). */
const GOO_SHARE_PATTERN = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i;
/** Google path format: /@59.437,24.753 (maps/@…, maps/place/…/@…, any host). */
const AT_COORD_PATTERN = /@(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/;
/** Google search path — the 2026-09 maps.app.goo.gl redirect target:
 *  /search/58.999669,+27.289732 (comma and/or plus — a URL-encoded space —
 *  as the separator) or the comma form /search/59.437,24.753. Raw path
 *  forms only: a percent-encoded separator is not decoded (like the
 *  query-param values). Mirrors the backend SEARCH_PAIR. */
const SEARCH_PAIR_PATTERN = /\/search\/(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)/;

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

/** URL branch (design decision 2a): known patterns first, then the generic pair.
 *  Every coordinate-carrying segment runs the decimal-comma guard
 *  BEFORE the pair is trusted, so `?ll=58,25&q=x` cannot pin the integer
 *  (58, 25), ~27 km off (a silent wrong pin, the app's declared top risk). */
function urlPair(url: string): ParseLocationResult {
  for (const pattern of QUERY_PARAM_PATTERNS) {
    const param = pattern.exec(url);
    if (param === null) {
      continue;
    }
    const pair = toDecimalPair(param[1]);
    if (pair !== null) {
      // The guard runs on the segment that actually yields the pair — the
      // raw param VALUE. A street+postal value such as `Kadriori 5,12345`
      // that yields the (5, 12345) separator pair is labelled decimal-comma
      // too: the rejection is the same, the copy just names the real fix.
      const commaFailure = decimalCommaFailure(param[1]);
      if (commaFailure !== null) {
        return commaFailure;
      }
      return gateWithSwap(pair[0], pair[1]);
    }
  }
  const share = GOO_SHARE_PATTERN.exec(url);
  if (share !== null) {
    return gateWithSwap(Number(share[1]), Number(share[2]));
  }
  const at = AT_COORD_PATTERN.exec(url);
  if (at !== null) {
    // The same guard on the matched @lat,lng span.
    const commaFailure = decimalCommaFailure(at[0]);
    if (commaFailure !== null) {
      return commaFailure;
    }
    return gateWithSwap(Number(at[1]), Number(at[2]));
  }
  const search = SEARCH_PAIR_PATTERN.exec(url);
  if (search !== null) {
    // The same guard on the matched /search/lat,lng span.
    const commaFailure = decimalCommaFailure(search[0]);
    if (commaFailure !== null) {
      return commaFailure;
    }
    return gateWithSwap(Number(search[1]), Number(search[2]));
  }
  // Estonian decimal-comma in the generic fallback: the scheme+host is
  // always dotted, so the plain path's "no point at all" rule applies to the
  // coordinate-carrying part (path + query) instead of the whole URL.
  const urlBody = url.replace(/^https?:\/\/[^/?#]+/i, '');
  const commaFailure = decimalCommaFailure(urlBody);
  if (commaFailure !== null) {
    return commaFailure;
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
 * (a pair, but outside Estonia in both orders), 'decimal-comma' (an
 * Estonian comma-decimal without a point — the value is never guessed or
 * converted; the page tells the user to type a point).
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
    // An Estonian comma-decimal anywhere in a DMS input
    // (`59°26,5' 24°45'`) — the minutes/seconds groups only read POINT
    // decimals, so without this the decimal part is silently DROPPED (the
    // token shrinks to its degrees; hemisphere letters go unconsumed) and
    // the remaining components can still pin a plausible point ~49 km off,
    // inside the Estonia box. No guessing: decimal-comma. (The whole input
    // is checked, not just the matched token spans: a comma-minute shrinks
    // the span to the degree and would escape a span-only scan.)
    if (DECIMAL_COMMA_PATTERN.test(trimmed)) {
      return { reason: 'decimal-comma', detail: DECIMAL_COMMA_DETAIL };
    }
    if (tokens.length >= 2) {
      return dmsToPair(tokens);
    }
    if (tokens.length === 1) {
      // One DMS value is a lone latitude or longitude — never guess the other
      // (design risk: no silent wrong pin). Do NOT fall back to the decimal
      // scan: its first two decimals would be the degree+minute parts of the
      // same token, which would place a plausible-but-wrong pin. A plain
      // decimal alongside the token is a MIX of formats — its own
      // message; "a single DMS value" would misdescribe a two-value input.
      if (hasNonDmsDecimal(trimmed)) {
        return {
          reason: 'invalid',
          detail: 'mix of DMS and decimal — use one format for both values',
        };
      }
      return { reason: 'invalid', detail: 'a single DMS value is not a coordinate pair' };
    }
    // Markers present but no DMS token (e.g. "59.44N 24.75E") -> decimal
    // fallback — with the decimal-comma guard first.
    const commaFailure = decimalCommaFailure(trimmed);
    if (commaFailure !== null) {
      return commaFailure;
    }
    const pair = plainPair(trimmed);
    if (pair !== null) {
      return gateWithSwap(pair[0], pair[1]);
    }
    return { reason: 'invalid', detail: 'coordinate markers without a parseable pair' };
  }

  // Estonian decimal-comma: refuse BEFORE the separator grammar can
  // read comma-decimals as an integer pair (no silent wrong pin). A MIX of
  // comma-decimals and point-decimals across tokens (`59,4370 24.75`)
  // is the same data problem — the guard's copy explains the fix where the
  // bbox gate's "outside Estonia" would misdiagnose it.
  if (decimalCommaFailure(trimmed) !== null || hasMixedDecimalMarks(trimmed)) {
    return { reason: 'decimal-comma', detail: DECIMAL_COMMA_DETAIL };
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
