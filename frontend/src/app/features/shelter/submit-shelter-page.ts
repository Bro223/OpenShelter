import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  type OnDestroy,
  type OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { MessageKey } from '../../core/i18n/messages';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type { CreateShelterRequest, GeocodeResult, MineShelterDto, ShelterDto } from '../../core/models';
import { GeocodeGateway } from '../../gateways/geocode-gateway';
import { GeoGateway } from '../../gateways/geo-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { bannerMessage } from '../../shared/error-copy';
import { capacityValidator, nameBlankValidator } from '../../shared/form-helpers';
import {
  isGooShortLink,
  normalizeShortLinkUrl,
  parseLocationInput,
} from '../../shared/location-input';
import { ESTONIA_CENTER, ESTONIA_ZOOM, LeafletService } from '../../shared/leaflet-service';
import { BannerComponent } from '../../shared/banner.component';
import { LoadingIndicator } from '../../shared/loading-indicator';

/** Which capture mode last wrote the shared location state (design decision 1).
 *  'saved' is the edit-mode prefill (M5): the pin comes from the row being
 *  edited, not from a capture — it renders no "Location from …" hint. */
type LocationSource = 'typed' | 'link' | 'geolocation' | 'map-pick' | 'address-search' | 'saved';

/** The ONE shared location state: every capture mode writes it, the map marker + read-only readout read it. */
interface PickedLocation {
  latitude: number;
  longitude: number;
  source: LocationSource;
  /** The parser detected (lng, lat) and auto-swapped to (lat, lng). */
  swapped: boolean;
  /** Geolocation accuracy in meters (geolocation source only). */
  accuracyM: number | null;
}

/** The per-reason inline errors of the location section (design decision 5 + spec). */
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

/** The prefill ('saved') names no capture mode — the hint line stays off.
 *  The five real captures keep their per-source copy. */
const SOURCE_KEY: Record<Exclude<LocationSource, 'saved'>, MessageKey> = {
  typed: 'submit.hint.source.typed',
  link: 'submit.hint.source.link',
  geolocation: 'submit.hint.source.geolocation',
  'map-pick': 'submit.hint.source.map',
  'address-search': 'submit.hint.source.address',
};

/** The inline states of the address search (shelter-address-search). A search
 * failure NEVER touches the location state (no pin change) and never blocks
 * form submission — search is an optional capture mode, not a gate. */
type GeocodeErrorKind = 'no-results' | 'rate-limited' | 'network';

const GEOCODE_ERROR_KEY: Record<GeocodeErrorKind, MessageKey> = {
  'no-results': 'submit.geocode.noResults',
  'rate-limited': 'submit.geocode.rateLimited',
  network: 'submit.geocode.network',
};

/**
 * /submit (AuthGuard + VerifiedGuard) — verified-user shelter submission
 * (05-shelter-review-flow.puml, shelter-location-input). Name (≤200),
 * optional description (≤2000), optional capacity (1–100 000), the
 * private-home declaration (community-review-queue D7: locationKind), and
 * a location captured five ways — smart text input (coordinate string /
 * long-form map URL, parsed by shared/location-input.ts), "Use my location"
 * (browser geolocation), maps.app.goo.gl short links (POST /api/geo/resolve),
 * an Estonia address search (client-side OSM Nominatim via GeocodeGateway —
 * button/Enter submit, no autosuggest; the only client-side external call),
 * and the mini-map click/drag — all writing ONE shared location signal
 * (design decision 1). Resolved coordinates are displayed read-only.
 *
 * On 201 the row is PUBLIC IMMEDIATELY as NEW (community-review-queue —
 * no blocking queue): the page STAYS on /submit with a success panel
 * ("listed now, marked as newly added, community reports confirm it")
 * linking to the (already public) detail page. On 401/403/400 the
 * backend message shows through the banner (403 adds a /verify link — the
 * claim can lapse mid-session) and the form input is preserved.
 *
 * EDIT MODE (M5, shelter-editing reuses the add form): /submit?edit=<id>
 * renders this SAME form (same fields, same capture modes) prefilled with
 * the row's current values. The row is fetched from GET /api/shelters/mine
 * (owner-scoped, ALL statuses) — an id that is not the caller's, or a
 * malformed param, renders the not-found state, never someone else's
 * data. The heading + submit button carry the edit/save copy
 * ('account.edit' / 'account.save' — the catalog has no submit-scoped edit
 * heading yet; 'account.edit' is the existing key that says "this is an
 * edit"). Save is PUT /api/shelters/{id} with the same payload shape as
 * create (locationKind explicit). The edit PUBLISHES IMMEDIATELY — the
 * backend keeps the row's status (an edit never unpublishes or removes it
 * from the map) — and per the owner's M5 decision the shelter then carries
 * the same pending-verification (NEW) trust state a newly added shelter
 * gets until it is confirmed again: a STATUS, not a gate in front of the
 * edit. The account area no longer hosts its own reduced edit form — its
 * Edit entry opens this route.
 */
@Component({
  selector: 'app-submit-shelter-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent, LoadingIndicator, TranslatePipe],
  providers: [LeafletService],
  templateUrl: './submit-shelter-page.html',
  styleUrl: './submit-shelter-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmitShelterPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly gateway = inject(ShelterGateway);
  private readonly geo = inject(GeoGateway);
  private readonly geocode = inject(GeocodeGateway);
  private readonly leaflet = inject(LeafletService);
  /** Resolves the location capture copy (i18n-et-en). */
  private readonly i18n = inject(I18nService);
  /** The active route: /submit?edit=<id> opens the form in edit mode (M5). */
  private readonly route = inject(ActivatedRoute);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(200),
        // Whitespace-only names pass Validators.required — mirror the
        // backend @NotBlank so we never POST "   ".
        nameBlankValidator,
      ],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
    }),
    capacity: new FormControl<number | null>(null, { validators: [capacityValidator] }),
    // The private-home declaration (community-review-queue D7): maps to the
    // payload's locationKind (PRIVATE when checked, PUBLIC by default).
    privateLocation: new FormControl(false, { nonNullable: true }),
  });

  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  /** True when the last failure was a 403 — offer the /verify path. */
  protected readonly verifyLink = signal(false);
  /** The created row (community-review-queue): set on 201 — the row is
   *  public immediately as NEW, so the success panel links to the detail
   *  page instead of navigating there (the form stays for a second
   *  submission). In edit mode (M5) it is the UPDATED row — the same panel
   *  is the save confirmation (the edit publishes immediately with the
   *  NEW pending-verification state). */
  protected readonly submitted = signal<ShelterDto | null>(null);

  // ---- edit mode (M5: editing reuses this form) ----------------------------
  /** True while /submit?edit=<id> — the heading + submit button carry the
   *  edit/save copy. Creation is this same form WITHOUT the param — the
   *  /submit path is unchanged. */
  protected readonly editMode = signal(false);
  /** True while the ?edit row is being loaded from /mine. */
  protected readonly editLoading = signal(false);
  /** The param is malformed, or the id is not the caller's row (absent
   *  from /mine): the not-found state renders instead of the form. */
  protected readonly editMissing = signal(false);
  /** The id of the row being edited — set once the /mine row is found.
   *  null = creation mode, or an edit that never resolved to a row. */
  protected readonly editingId = signal<number | null>(null);

  /** The ONE shared location state (null = nothing picked yet). */
  protected readonly location = signal<PickedLocation | null>(null);
  /** Per-reason inline error of the location section (null = none). */
  protected readonly locationError = signal<LocationErrorKind | null>(null);
  /** True while a maps.app.goo.gl short link is being resolved by the backend. */
  protected readonly resolvingLink = signal(false);
  /** True while the browser geolocation request is in flight. */
  protected readonly locating = signal(false);
  /**
   * The smart text input's content. Deliberately a plain input (not a form
   * control): it is a capture AFFORDANCE, not a submitted field — the
   * submitted coordinates always come from the shared location state.
   * Doubles as the form's address field for address-search prefill
   * (only-if-empty, stated in the help line near it — design decision 4).
   */
  protected readonly locationText = signal('');

  /**
   * The monotonic capture generation (cross-mode capture race): every
   * capture start — geolocation, short-link resolve, smart-input parse, map
   * pick, address select — bumps this counter. Async callbacks capture
   * their generation at start and NO-OP once a newer capture has superseded
   * them: a late geolocation settle (up to 10 s) can neither overwrite a
   * typed/map pin nor clear it with its error, and a late resolve 400 can
   * neither overwrite nor clear a pick made while it was in flight.
   */
  private captureGeneration = 0;

  /** The address search input's content (a capture affordance, not a field). */
  protected readonly addressQuery = signal('');
  /** True while a search is in flight OR waiting out the 1000 ms spacing window. */
  protected readonly searching = signal(false);
  /** The current results (max 5) — stay listed until the next search. */
  protected readonly addressResults = signal<GeocodeResult[]>([]);
  /** The inline state of the search (null = none). */
  protected readonly addressError = signal<GeocodeErrorKind | null>(null);

  protected name(): FormControl<string> {
    return this.form.get('name') as FormControl<string>;
  }

  protected description(): FormControl<string> {
    return this.form.get('description') as FormControl<string>;
  }

  protected capacity(): FormControl<number | null> {
    return this.form.get('capacity') as FormControl<number | null>;
  }

  protected privateLocation(): FormControl<boolean> {
    return this.form.get('privateLocation') as FormControl<boolean>;
  }

  /** The read-only coordinate readout under the map. */
  protected locationReadout(): string {
    const picked = this.location();
    return picked === null
      ? this.i18n.t('submit.location.empty')
      : `${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)}`;
  }

  /** Source hint (incl. the swapped-order + geolocation-accuracy hints).
   *  The edit prefill ('saved') names no capture mode — no hint line. */
  protected locationHint(): string | null {
    const picked = this.location();
    if (picked === null || picked.source === 'saved') {
      return null;
    }
    let hint = this.i18n.t('submit.hint.from') + this.i18n.t(SOURCE_KEY[picked.source]);
    if (picked.swapped) {
      hint += this.i18n.t('submit.hint.swapped');
    }
    if (picked.accuracyM !== null) {
      hint += this.i18n.t('submit.hint.accuracy', { m: Math.round(picked.accuracyM) });
    }
    return hint;
  }

  protected locationErrorText(): string | null {
    const kind = this.locationError();
    return kind === null ? null : this.i18n.t(LOCATION_ERROR_KEY[kind]);
  }

  /**
   * The form renders for creation, and for an edit once its row has
   * loaded. The edit's loading / not-found / load-failure states render
   * their own markup instead (the load failure shows through the banner).
   */
  protected showForm(): boolean {
    if (!this.editMode()) {
      return true;
    }
    return !this.editLoading() && !this.editMissing() && this.editingId() !== null;
  }

  /**
   * Edit mode (M5): /submit?edit=<id> prefills the SAME form with the
   * row's current values. The row comes from GET /api/shelters/mine —
   * owner-scoped, ALL statuses — so an id that is not the caller's (or a
   * malformed param) is the not-found state, never a prefill of someone
   * else's shelter. Save is PUT /api/shelters/{id} and publishes
   * immediately (the backend keeps the row's status — an edit never
   * unpublishes it); per the owner's M5 decision the shelter then carries
   * the same pending-verification (NEW) trust state a newly added shelter
   * gets — a STATUS, not a gate in front of the edit.
   */
  ngOnInit(): void {
    const raw = this.route.snapshot.queryParamMap.get('edit');
    if (raw === null) {
      return; // creation — the form is untouched, the path is unchanged
    }
    this.editMode.set(true);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      this.editMissing.set(true);
      return;
    }
    this.editLoading.set(true);
    void this.gateway
      .mine()
      .then((rows) => {
        const row = rows.find((r) => r.id === id) ?? null;
        if (row === null) {
          this.editMissing.set(true);
          return;
        }
        this.prefillFromRow(row);
        this.editingId.set(row.id);
      })
      .catch((failure: unknown) => {
        this.error.set(bannerMessage(failure, 'shelter'));
      })
      .finally(() => this.editLoading.set(false));
  }

  /**
   * Fills the form + the shared location state from the row being edited.
   * Prefill, never overwrite: if the user already captured a location or
   * touched the form before the row landed, their input wins.
   */
  private prefillFromRow(row: MineShelterDto): void {
    if (this.location() !== null || this.form.touched || this.locationText() !== '') {
      return;
    }
    this.name().setValue(row.name);
    this.description().setValue(row.description ?? '');
    this.capacity().setValue(row.capacity);
    // The declaration mirrors the row's stored locationKind (D7).
    this.privateLocation().setValue(row.locationKind === 'PRIVATE');
    // The smart input shows the saved pair — the same text its parser
    // accepts, so a re-Enter re-parses to the same pin.
    this.locationText.set(`${row.latitude}, ${row.longitude}`);
    // 'saved' = no capture source: the "Location from …" hint stays off
    // until a real capture supersedes the prefill; the map flies to the
    // saved point.
    this.setLocation(row.latitude, row.longitude, 'saved', false, true);
  }

  /**
   * The map container only exists once the view is rendered; a null
   * container (should never happen) skips map creation but never breaks
   * the page. Map click AND pick-marker drag -> the shared location state.
   */
  ngAfterViewInit(): void {
    this.leaflet.mapClick = (latitude, longitude) => {
      // A pick is a capture — it supersedes any pending capture.
      this.captureGeneration++;
      // No flyTo: the user is already looking at the point (a re-center
      // during a pin drag would fight the gesture).
      this.setLocation(latitude, longitude, 'map-pick', false, false);
    };
    this.leaflet.create(this.mapEl()?.nativeElement ?? null, ESTONIA_CENTER, ESTONIA_ZOOM);
  }

  ngOnDestroy(): void {
    // Drop the mini-map instance + listeners (page-scoped, design decision 3).
    this.leaflet.destroy();
  }

  // ---------------------------------------------------------------------
  // Capture modes — every one writes the single shared location state
  // ---------------------------------------------------------------------

  protected onLocationTextChange(event: Event): void {
    this.locationText.set((event.target as HTMLInputElement).value);
  }

  /** Enter in the smart input parses instead of submitting the form. */
  protected onLocationSubmitKey(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.applyLocationInput();
  }

  /** The "Set location" button (and Enter): smart-input capture. */
  protected applyLocationInput(): void {
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

  /**
   * "Use my location" — high-accuracy geolocation, 10 s timeout, no cached
   * positions (design decision 5). Each failure maps 1:1 to an inline
   * message; the insecure-context guard has its own copy.
   */
  protected useMyLocation(): void {
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
        if (gen !== this.captureGeneration) {
          // Superseded by a newer capture (typed/picked/… while this was in
          // flight) — the late settle must not overwrite the pin.
          return;
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
        if (gen !== this.captureGeneration) {
          // Superseded — the late error must not run failLocation and clear
          // the pin the user set in the meantime.
          return;
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

  /** maps.app.goo.gl -> POST /api/geo/resolve (JWT, per-IP 5/min). */
  private async resolveShortLink(url: string): Promise<void> {
    this.resolvingLink.set(true);
    this.locationError.set(null);
    const gen = ++this.captureGeneration;
    try {
      const resolved = await this.geo.resolve(url);
      if (gen !== this.captureGeneration) {
        // Superseded by a newer capture while the resolve was in flight —
        // the late success must not overwrite the pin.
        return;
      }
      this.setLocation(resolved.latitude, resolved.longitude, 'link');
    } catch (failure: unknown) {
      if (gen !== this.captureGeneration) {
        // Superseded — the late failure must not run failLocation and clear
        // a pick made while the resolve was in flight.
        return;
      }
      // A 5xx = the backend's UPSTREAM resolution is temporarily
      // unavailable (its own message says retry later); a network failure
      // = the API is unreachable. Neither is the user's link — retry-
      // oriented copy, not the not-found copy.
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

  protected onAddressQueryChange(event: Event): void {
    this.addressQuery.set((event.target as HTMLInputElement).value);
  }

  /** Enter in the search input searches instead of submitting the form. */
  protected onAddressSearchKey(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.startAddressSearch();
  }

  /**
   * The "Search" button (and Enter): ONE deliberate Nominatim request per
   * press — no autosuggest (Nominatim usage policy, design decision 2).
   * A press while a search is pending is IGNORED, never stacked; if the
   * press lands inside the 1000 ms spacing window the gateway waits it
   * out and the button stays pending the whole time (design decision 3).
   */
  protected startAddressSearch(): void {
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
    void this.geocode
      .search(query)
      .then((results) => {
        if (results.length === 0) {
          this.addressError.set('no-results');
          return;
        }
        this.addressResults.set(results);
      })
      .catch((failure: unknown) => {
        // 429 = the service throttles ("please wait a moment"); anything
        // else (network/CORS/5xx) gets the generic unavailable copy.
        const api = toApiError(failure);
        this.addressError.set(api.status === 429 ? 'rate-limited' : 'network');
      })
      .finally(() => this.searching.set(false));
  }

  /**
   * Selecting a result: place the pin (source 'address-search', the same
   * shared path as every other capture mode) and prefill the address field
   * — the smart text input above — ONLY IF it is currently empty (design
   * decision 4: prefill, never overwrite; the help line states this).
   */
  protected selectAddressResult(result: GeocodeResult): void {
    // A selection is a capture — it supersedes any pending capture.
    this.captureGeneration++;
    this.setLocation(result.latitude, result.longitude, 'address-search');
    if (this.locationText().trim() === '') {
      this.locationText.set(result.displayName);
    }
  }

  protected addressErrorText(): string | null {
    const kind = this.addressError();
    return kind === null ? null : this.i18n.t(GEOCODE_ERROR_KEY[kind]);
  }

  /**
   * A FAILED capture removes the previous pin (spec: "the marker is not
   * placed") — the safest state: an error is showing AND the form cannot
   * silently submit a stale, now-untrusted pin (design risk: never a
   * silent wrong pin). 'missing' is the one exception — it is set at
   * submit time when there is nothing to clear.
   */
  private failLocation(kind: LocationErrorKind): void {
    this.location.set(null);
    this.locationError.set(kind);
    this.leaflet.setPick(null, null);
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
    this.leaflet.setPick(latitude, longitude);
    if (fly) {
      this.leaflet.flyTo(latitude, longitude);
    }
  }

  // ---------------------------------------------------------------------
  // Submit — payload: name + latitude/longitude numbers, optional
  // description/capacity, locationKind (community-review-queue D7)
  // ---------------------------------------------------------------------

  async submit(): Promise<void> {
    if (this.pending()) {
      return;
    }
    const editId = this.editingId();
    if (this.editMode() && (this.editLoading() || editId === null)) {
      return; // the row is still loading (or never resolved) — nothing to save
    }
    this.form.markAllAsTouched();
    if (this.location() === null) {
      this.locationError.set('missing');
    }
    if (this.form.invalid || this.location() === null) {
      return;
    }

    this.pending.set(true);
    this.error.set(null);
    this.verifyLink.set(false);
    this.submitted.set(null);

    const picked = this.location() as PickedLocation;
    const request: CreateShelterRequest = {
      name: this.name().value.trim(),
      latitude: picked.latitude,
      longitude: picked.longitude,
      // Explicit on purpose: unchecked = PUBLIC (the contract default),
      // checked = PRIVATE (the resident-offered declaration). The same
      // explicit locationKind rides the edit's PUT (M5) — the backend's
      // create/update constraint path is shared.
      locationKind: this.privateLocation().value ? 'PRIVATE' : 'PUBLIC',
    };
    const description = this.description().value.trim();
    if (description !== '') {
      request.description = description;
    }
    const capacity = this.capacity().value;
    if (typeof capacity === 'number' && Number.isInteger(capacity)) {
      request.capacity = capacity;
    }

    try {
      // Creation: POST /api/shelters; edit: PUT /api/shelters/{id} with the
      // SAME payload shape (the backend re-checks identical constraints).
      const result =
        editId === null ? await this.gateway.create(request) : await this.gateway.update(editId, request);
      // No navigation: the row is public NOW (NEW state — an edit keeps the
      // row's status, so a published shelter stays published) — the success
      // panel links to the (already live) detail page.
      this.submitted.set(result);
    } catch (failure: unknown) {
      // Input preserved on purpose — the user fixes the backend's complaint
      // and retries. 403 (claim lapsed since the guard ran) gets a /verify link.
      const api = toApiError(failure);
      this.error.set(bannerMessage(failure, 'shelter'));
      this.verifyLink.set(api.status === 403);
    } finally {
      this.pending.set(false);
    }
  }
}
