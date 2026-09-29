import { afterEveryRender, signal, type ElementRef, type Signal } from '@angular/core';
import { toApiError } from '../../core/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { MessageKey } from '../../core/i18n/messages';
import type { GeocodeResult } from '../../core/models';
import { GeocodeGateway } from '../../gateways/geocode-gateway';
import { GeoGateway } from '../../gateways/geo-gateway';
import { ESTONIA_CENTER, ESTONIA_ZOOM, LeafletService } from '../../shared/leaflet-service';
import {
  isGooShortLink,
  normalizeShortLinkUrl,
  parseLocationInput,
} from '../../shared/location-input';

/** Which capture mode last wrote the shared location state. 'saved' is
 *  the edit-mode prefill: the pin comes from the row being edited, not
 *  from a capture — it renders no "Location from …" hint. */
export type LocationSource =
  'typed' | 'link' | 'geolocation' | 'map-pick' | 'address-search' | 'saved';

/** The ONE shared location state: every capture mode writes it, the map
 *  marker + the read-only readout read it. */
export interface PickedLocation {
  latitude: number;
  longitude: number;
  source: LocationSource;
  /** The parser detected (lng, lat) and auto-swapped to (lat, lng). */
  swapped: boolean;
  /** Geolocation accuracy in meters (geolocation source only). */
  accuracyM: number | null;
}

/** The per-reason inline errors of the location section. */
type LocationErrorKind =
  | 'missing'
  | 'no-pair'
  | 'out-of-bounds'
  | 'invalid'
  | 'decimal-comma'
  | 'geo-denied'
  | 'geo-unavailable'
  | 'geo-timeout'
  | 'geo-insecure'
  | 'short-link-failed'
  | 'short-link-rate-limited'
  | 'short-link-unavailable';

/** One copy per failure reason — rendered inline in the location fieldset. */
const LOCATION_ERROR_KEY: Record<LocationErrorKind, MessageKey> = {
  missing: 'submit.loc.missing',
  'no-pair': 'submit.loc.noPair',
  'out-of-bounds': 'submit.loc.outOfBounds',
  invalid: 'submit.loc.invalid',
  'decimal-comma': 'submit.loc.decimalComma',
  'geo-denied': 'submit.loc.geoDenied',
  'geo-unavailable': 'submit.loc.geoUnavailable',
  'geo-timeout': 'submit.loc.geoTimeout',
  'geo-insecure': 'submit.loc.geoInsecure',
  'short-link-failed': 'submit.loc.shortLinkFailed',
  'short-link-rate-limited': 'submit.loc.shortLinkRateLimited',
  'short-link-unavailable': 'submit.loc.shortLinkUnavailable',
};

/** The five real capture modes name their copy; the prefill ('saved')
 *  names none — the hint line stays off. */
const SOURCE_KEY: Record<Exclude<LocationSource, 'saved'>, MessageKey> = {
  typed: 'submit.hint.source.typed',
  link: 'submit.hint.source.link',
  geolocation: 'submit.hint.source.geolocation',
  'map-pick': 'submit.hint.source.map',
  'address-search': 'submit.hint.source.address',
};

/** The inline states of the address search. A search failure NEVER
 *  touches the location state (no pin change) and never blocks form
 *  submission — search is an optional capture mode, not a gate. */
type GeocodeErrorKind = 'no-results' | 'rate-limited' | 'network';

const GEOCODE_ERROR_KEY: Record<GeocodeErrorKind, MessageKey> = {
  'no-results': 'submit.geocode.noResults',
  'rate-limited': 'submit.geocode.rateLimited',
  network: 'submit.geocode.network',
};

/** The host-page dependencies the view reads: the two gateways behind the
 *  short-link and address-search captures, the page-scoped LeafletService
 *  (the page's `providers` entry — the instance dies with the page), i18n
 *  for the section's inline copy, and the #mapEl container signal
 *  (viewChild can only be declared on the component, so the page owns it
 *  and hands it over). */
interface LocationCaptureViewDeps {
  geo: GeoGateway;
  geocode: GeocodeGateway;
  leaflet: LeafletService;
  i18n: I18nService;
  mapEl: Signal<ElementRef<HTMLElement> | undefined>;
}

/**
 * The /submit page's location-capture state object: the ONE shared
 * location state (null = nothing picked yet), the five capture modes that
 * all write it (smart text input, geolocation, maps.app.goo.gl short
 * links, the Estonia address search, the mini-map click/drag), the
 * monotonic capture generation that guards their async settles, the
 * inline per-reason errors, and the mini-map lifecycle itself.
 *
 * A state object, not a component: the presentation is the page's template
 * (the location fieldset — the template feeds this view through the
 * page's `capture` field), and the state must live on the page's lifetime
 * (a pick made before the edit row loads must survive the late-mounted
 * form — the afterEveryRender re-arm). The page constructs it once and
 * reaches it through narrow typed accessors: `location()` (the payload
 * and the prefill guard), `locationText()` (the prefill guard),
 * `applySavedLocation()` (the edit-mode prefill),
 * `markMissingLocation()` (the submit-time validation error) and the map
 * lifecycle from the page's view hooks (`wireMap()`, `destroyMap()`).
 */
export class LocationCaptureView {
  /** True while the mini-map instance is alive (the afterEveryRender hook
   *  re-arms on the edit form's late-mounted container; the form never
   *  unmounts mid-life, so this only flips back in destroyMap). */
  private mapAlive = false;

  /** The ONE shared location state (null = nothing picked yet). */
  readonly location = signal<PickedLocation | null>(null);
  /** Per-reason inline error of the location section (null = none). */
  readonly locationError = signal<LocationErrorKind | null>(null);
  /** True while a maps.app.goo.gl short link is being resolved by the backend. */
  readonly resolvingLink = signal(false);
  /** True while the browser geolocation request is in flight. */
  readonly locating = signal(false);
  /**
   * The smart text input's content. Deliberately a plain input (not a
   * form control): it is a capture AFFORDANCE, not a submitted field —
   * the submitted coordinates always come from the shared location
   * state. Doubles as the form's address field for address-search
   * prefill (only-if-empty, stated in the help line near it).
   */
  readonly locationText = signal('');

  /**
   * The monotonic capture generation (cross-mode capture race): every
   * capture start — geolocation, short-link resolve, smart-input parse,
   * map pick, address select — bumps this counter. Async callbacks
   * capture their generation at start and no-op once a newer capture has
   * superseded them: a late geolocation settle (up to 10 s) can neither
   * overwrite a typed/map pin nor clear it with its error, and a late
   * resolve 400 can neither overwrite nor clear a pick made while it was
   * in flight.
   */
  private captureGeneration = 0;

  /** The address search input's content (a capture affordance, not a field). */
  readonly addressQuery = signal('');
  /** True while a search is in flight OR waiting out the 1000 ms spacing window. */
  readonly searching = signal(false);
  /** The current results (max 5) — stay listed until the next search. */
  readonly addressResults = signal<GeocodeResult[]>([]);
  /** The inline state of the search (null = none). */
  readonly addressError = signal<GeocodeErrorKind | null>(null);

  constructor(private readonly deps: LocationCaptureViewDeps) {
    /**
     * Fires after EVERY render. In edit mode the form — and with it the
     * #mapEl container — mounts only after the ?edit row has loaded, so
     * the page's ngAfterViewInit one-shot create misses the container and
     * the map would stay dead: an empty grey box with no tiles and no
     * pin. This re-creates the instance the moment the container is in
     * the DOM (no-op while an instance is alive or the container is
     * absent) and re-pins when the location is already picked (the
     * prefill's setPick/flyTo ran on the missing map and no-oped) — the
     * same idiom as the detail page's Location map. The constructor runs
     * in the page's injection context (the page's field initializer), so
     * the render hook registers on the page's zoneless render cycle.
     */
    afterEveryRender(() => {
      if (this.ensureMap()) {
        const picked = this.location();
        if (picked !== null) {
          this.deps.leaflet.setPick(picked.latitude, picked.longitude);
          this.deps.leaflet.flyTo(picked.latitude, picked.longitude);
        }
      }
    });
  }

  /** The read-only coordinate readout under the map. */
  locationReadout(): string {
    const picked = this.location();
    return picked === null
      ? this.deps.i18n.t('submit.location.empty')
      : `${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)}`;
  }

  /** Source hint (incl. the swapped-order + geolocation-accuracy hints).
   *  The edit prefill ('saved') names no capture mode — no hint line. */
  locationHint(): string | null {
    const picked = this.location();
    if (picked === null || picked.source === 'saved') {
      return null;
    }
    let hint = this.deps.i18n.t('submit.hint.from') + this.deps.i18n.t(SOURCE_KEY[picked.source]);
    if (picked.swapped) {
      hint += this.deps.i18n.t('submit.hint.swapped');
    }
    if (picked.accuracyM !== null) {
      hint += this.deps.i18n.t('submit.hint.accuracy', { m: Math.round(picked.accuracyM) });
    }
    return hint;
  }

  locationErrorText(): string | null {
    const kind = this.locationError();
    return kind === null ? null : this.deps.i18n.t(LOCATION_ERROR_KEY[kind]);
  }

  /**
   * Wires the pick callback (map click AND pick-marker drag → the shared
   * location state) and creates the mini-map when the container already
   * exists (creation mode). In edit mode the form — and with it the
   * #mapEl container — mounts only after the ?edit row has loaded, so the
   * container is absent here: create() would no-op, and the
   * afterEveryRender hook re-arms the moment the container appears.
   */
  wireMap(): void {
    this.deps.leaflet.mapClick = (latitude, longitude) => {
      // A pick is a capture — it supersedes any pending capture.
      this.captureGeneration++;
      // No flyTo: the user is already looking at the point (a re-center
      // during a pin drag would fight the gesture).
      this.setLocation(latitude, longitude, 'map-pick', false, false);
    };
    this.ensureMap();
  }

  /**
   * Ensures the mini-map instance matches the rendered container: creates
   * it when #mapEl is mounted and no instance is alive (first load, or
   * the edit form's late-mounted container). No-op otherwise — safe to
   * call from every render and every load outcome (the real create() is
   * itself one-per-visit, so a stray call can never double the map).
   * @returns true when a fresh instance was created on this call.
   */
  private ensureMap(): boolean {
    const el = this.deps.mapEl()?.nativeElement ?? null;
    if (el === null || this.mapAlive) {
      return false;
    }
    this.deps.leaflet.create(el, ESTONIA_CENTER, ESTONIA_ZOOM);
    this.mapAlive = true;
    return true;
  }

  /** Destroys the mini-map with the page (page-scoped instance — zoneless
   *  has no safety net). */
  destroyMap(): void {
    this.mapAlive = false;
    this.deps.leaflet.destroy();
  }

  /**
   * The edit-mode prefill: the smart input shows the saved pair — the
   * same text its parser accepts, so a re-Enter re-parses to the same
   * pin. 'saved' = no capture source: the "Location from …" hint stays
   * off until a real capture supersedes the prefill; the map flies to
   * the saved point.
   */
  applySavedLocation(latitude: number, longitude: number): void {
    this.locationText.set(`${latitude}, ${longitude}`);
    this.setLocation(latitude, longitude, 'saved', false, true);
  }

  /** The submit-time validation error: nothing was picked ('missing' —
   *  the one kind no capture mode sets; a FAILED capture clears the pin
   *  and names its own reason). */
  markMissingLocation(): void {
    this.locationError.set('missing');
  }

  // ---------------------------------------------------------------------
  // Capture modes — every one writes the single shared location state
  // ---------------------------------------------------------------------

  onLocationTextChange(event: Event): void {
    this.locationText.set((event.target as HTMLInputElement).value);
  }

  /** Enter in the smart input parses instead of submitting the form. */
  onLocationSubmitKey(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.applyLocationInput();
  }

  /** The "Set location" button (and Enter): smart-input capture. */
  applyLocationInput(): void {
    const text = this.locationText().trim();
    if (text === '') {
      return;
    }
    // This capture is current by definition — the bump matters for the
    // ASYNC captures: a pending geolocation/resolve must no-op once the
    // user typed.
    this.captureGeneration++;
    // Short links are opaque redirects — only the backend can read them.
    if (isGooShortLink(text)) {
      void this.resolveShortLink(normalizeShortLinkUrl(text));
      return;
    }
    const result = parseLocationInput(text);
    if ('latitude' in result) {
      this.setLocation(
        result.latitude,
        result.longitude,
        /^https?:\/\//i.test(text) ? 'link' : 'typed',
        result.swapped === true,
      );
    } else {
      this.failLocation(result.reason);
    }
  }

  /** A capture's async settle is only current if no newer capture
   *  started in the meantime — a late settle must not overwrite, or clear
   *  with its error, a pin made while it was in flight. */
  private isCurrentCapture(generation: number): boolean {
    return generation === this.captureGeneration;
  }

  /**
   * "Use my location" — high-accuracy geolocation, 10 s timeout, no
   * cached positions. Each failure maps 1:1 to an inline message; the
   * insecure-context guard has its own copy.
   */
  useMyLocation(): void {
    if (window.isSecureContext === false) {
      this.failLocation('geo-insecure');
      return;
    }
    const geolocation = navigator.geolocation;
    // jsdom leaves navigator.geolocation undefined — `!` covers null AND undefined.
    if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
      this.failLocation('geo-unavailable');
      return;
    }
    this.locating.set(true);
    this.locationError.set(null);
    const gen = ++this.captureGeneration;
    geolocation.getCurrentPosition(
      (position) => {
        this.locating.set(false);
        if (!this.isCurrentCapture(gen)) {
          return; // superseded — the late settle must not overwrite the pin
        }
        this.setLocation(
          position.coords.latitude,
          position.coords.longitude,
          'geolocation',
          false,
          true,
          position.coords.accuracy,
        );
      },
      (err) => {
        this.locating.set(false);
        if (!this.isCurrentCapture(gen)) {
          return; // superseded — the late error must not clear a set pin
        }
        // Duck-typed code read: jsdom does not define GeolocationPositionError.
        const code = typeof err?.code === 'number' ? err.code : 2;
        this.failLocation(
          code === 1 ? 'geo-denied' : code === 3 ? 'geo-timeout' : 'geo-unavailable',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  /**
   * The keyboard path for the map pick: places the pin at the map's
   * current center. Leaflet makes the map container focusable (arrow
   * keys pan, +/− zoom), so a keyboard user reaches the place first and
   * confirms with this button — the pointer click/drag stays the other
   * way in. Same shared write as the pointer pick (source 'map-pick',
   * no flyTo — the point is already centered).
   */
  useMapCenter(): void {
    const center = this.deps.leaflet.mapCenter();
    if (center === null) {
      return; // the mini-map is not alive yet — the form renders with it
    }
    // A pick is a capture — it supersedes any pending capture.
    this.captureGeneration++;
    this.setLocation(center[0], center[1], 'map-pick', false, false);
  }

  /** maps.app.goo.gl → POST /api/geo/resolve (JWT, per-IP 5/min). */
  private async resolveShortLink(url: string): Promise<void> {
    this.resolvingLink.set(true);
    this.locationError.set(null);
    const gen = ++this.captureGeneration;
    try {
      const resolved = await this.deps.geo.resolve(url);
      if (!this.isCurrentCapture(gen)) {
        return; // superseded — the late success must not overwrite the pin
      }
      this.setLocation(resolved.latitude, resolved.longitude, 'link');
    } catch (failure: unknown) {
      if (!this.isCurrentCapture(gen)) {
        return; // superseded — the late failure must not clear a pick
      }
      // A 5xx = the backend's UPSTREAM resolution is temporarily
      // unavailable (its own message says retry later); a network failure
      // = the API is unreachable. Neither is the user's link —
      // retry-oriented copy, not the not-found copy.
      const api = toApiError(failure);
      if (api.status >= 500 || api.isNetworkError) {
        this.failLocation('short-link-unavailable');
      } else if (api.status === 429) {
        this.failLocation('short-link-rate-limited');
      } else {
        this.failLocation('short-link-failed');
      }
    } finally {
      this.resolvingLink.set(false);
    }
  }

  // ---------------------------------------------------------------------
  // Capture mode 5: Estonia address search (client-side OSM Nominatim)
  // ---------------------------------------------------------------------

  onAddressQueryChange(event: Event): void {
    this.addressQuery.set((event.target as HTMLInputElement).value);
  }

  /** Enter in the search input searches instead of submitting the form. */
  onAddressSearchKey(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.startAddressSearch();
  }

  /**
   * The "Search" button (and Enter): ONE deliberate Nominatim request per
   * press — no autosuggest (Nominatim usage policy). A press while a
   * search is pending is IGNORED, never stacked; a press inside the
   * 1000 ms spacing window waits it out (gateway-side) and the button
   * stays pending the whole time.
   */
  startAddressSearch(): void {
    if (this.searching()) {
      return;
    }
    const query = this.addressQuery().trim();
    if (query === '') {
      return;
    }
    this.searching.set(true);
    this.addressError.set(null);
    this.addressResults.set([]);
    void this.runAddressSearch(query);
  }

  private async runAddressSearch(query: string): Promise<void> {
    try {
      const results = await this.deps.geocode.search(query);
      if (results.length === 0) {
        this.addressError.set('no-results');
        return;
      }
      this.addressResults.set(results);
    } catch (failure: unknown) {
      // 429 = the service throttles ("please wait a moment"); anything
      // else (network/CORS/5xx) gets the generic unavailable copy.
      const api = toApiError(failure);
      this.addressError.set(api.status === 429 ? 'rate-limited' : 'network');
    } finally {
      this.searching.set(false);
    }
  }

  /**
   * Selecting a result: place the pin (source 'address-search', the same
   * shared path as every other capture mode) and prefill the address
   * field — the smart text input above — ONLY IF it is currently empty
   * (prefill, never overwrite; the help line states this).
   */
  selectAddressResult(result: GeocodeResult): void {
    // A selection is a capture — it supersedes any pending capture.
    this.captureGeneration++;
    this.setLocation(result.latitude, result.longitude, 'address-search');
    if (this.locationText().trim() === '') {
      this.locationText.set(result.displayName);
    }
  }

  addressErrorText(): string | null {
    const kind = this.addressError();
    return kind === null ? null : this.deps.i18n.t(GEOCODE_ERROR_KEY[kind]);
  }

  /**
   * A FAILED capture removes the previous pin (the marker is not placed)
   * — the safest state: an error is showing AND the form cannot silently
   * submit a stale, now-untrusted pin. 'missing' is the one exception —
   * it is set at submit time when there is nothing to clear.
   */
  private failLocation(kind: LocationErrorKind): void {
    this.location.set(null);
    this.locationError.set(kind);
    this.deps.leaflet.setPick(null, null);
  }

  /** The single writer of the shared location state (all capture modes). */
  private setLocation(
    latitude: number,
    longitude: number,
    source: LocationSource,
    swapped = false,
    fly = true,
    accuracyM: number | null = null,
  ): void {
    this.location.set({ latitude, longitude, source, swapped, accuracyM });
    this.locationError.set(null);
    this.deps.leaflet.setPick(latitude, longitude);
    if (fly) {
      this.deps.leaflet.flyTo(latitude, longitude);
    }
  }
}
