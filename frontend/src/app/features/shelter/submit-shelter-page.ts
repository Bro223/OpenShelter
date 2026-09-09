import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  type OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api-error';
import type { CreateShelterRequest } from '../../core/models';
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

/** Which capture mode last wrote the shared location state (design decision 1). */
type LocationSource = 'typed' | 'link' | 'geolocation' | 'map-pick';

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
  | 'geo-denied'
  | 'geo-unavailable'
  | 'geo-timeout'
  | 'geo-insecure'
  | 'short-link-failed'
  | 'short-link-rate-limited';

/** One copy per failure reason — rendered inline in the location fieldset. */
const LOCATION_ERROR_COPY: Record<LocationErrorKind, string> = {
  missing: 'Pick a location on the map, paste coordinates or a link, or use "Use my location".',
  'no-pair':
    'No recognizable coordinates in that text. Paste a pair like 59.4370, 24.7535 or a map link — or use "Use my location" / the map.',
  'out-of-bounds': 'The location is outside Estonia.',
  invalid:
    'That does not look like coordinates. Use a pair like 59.4370, 24.7535, a DMS string, or a map link.',
  'geo-denied':
    'Location permission is off. Allow location access in your browser — or pick the spot on the map / paste a link.',
  'geo-unavailable':
    'Your location could not be determined right now. Pick the spot on the map or paste a link.',
  'geo-timeout': 'Finding your location timed out. Pick the spot on the map or paste a link.',
  'geo-insecure':
    'Location access needs a secure (https) connection. Pick the spot on the map or paste a link.',
  'short-link-failed':
    'Could not find coordinates in that link. Use a full Google Maps link or pick the spot on the map.',
  'short-link-rate-limited': 'Too many link lookups — please wait a minute and then try again.',
};

const SOURCE_LABEL: Record<LocationSource, string> = {
  typed: 'typed coordinates',
  link: 'the map link',
  geolocation: 'your device location',
  'map-pick': 'the map',
};

/**
 * /submit (AuthGuard + VerifiedGuard) — verified-user shelter submission
 * (05-shelter-review-flow.puml, M5 + shelter-location-input). Name (≤200),
 * optional description (≤2000), optional capacity (1–100 000), and a
 * location captured four ways — smart text input (coordinate string /
 * long-form map URL, parsed by shared/location-input.ts), "Use my location"
 * (browser geolocation), maps.app.goo.gl short links (POST /api/geo/resolve),
 * and the mini-map click/drag — all writing ONE shared location signal
 * (design decision 1). Resolved coordinates are displayed read-only.
 *
 * On 201 the page navigates to the new shelter's detail. On 401/403/400 the
 * backend message shows through the banner (403 adds a /verify link — the
 * claim can lapse mid-session) and the form input is preserved.
 */
@Component({
  selector: 'app-submit-shelter-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent],
  providers: [LeafletService],
  templateUrl: './submit-shelter-page.html',
  styleUrl: './submit-shelter-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmitShelterPage implements AfterViewInit, OnDestroy {
  private readonly gateway = inject(ShelterGateway);
  private readonly geo = inject(GeoGateway);
  private readonly leaflet = inject(LeafletService);
  private readonly router = inject(Router);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(200),
        // Whitespace-only names pass Validators.required — mirror the
        // backend @NotBlank (reviewer N3) so we never POST "   ".
        nameBlankValidator,
      ],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
    }),
    capacity: new FormControl<number | null>(null, { validators: [capacityValidator] }),
  });

  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  /** True when the last failure was a 403 — offer the /verify path. */
  protected readonly verifyLink = signal(false);

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
   */
  protected readonly locationText = signal('');

  protected name(): FormControl<string> {
    return this.form.get('name') as FormControl<string>;
  }

  protected description(): FormControl<string> {
    return this.form.get('description') as FormControl<string>;
  }

  protected capacity(): FormControl<number | null> {
    return this.form.get('capacity') as FormControl<number | null>;
  }

  /** The read-only coordinate readout under the map. */
  protected locationReadout(): string {
    const picked = this.location();
    return picked === null
      ? 'No location yet'
      : `${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)}`;
  }

  /** Source hint (incl. the swapped-order + geolocation-accuracy hints). */
  protected locationHint(): string | null {
    const picked = this.location();
    if (picked === null) {
      return null;
    }
    let hint = `Location from ${SOURCE_LABEL[picked.source]}`;
    if (picked.swapped) {
      hint +=
        ' — detected as longitude, latitude, so the values were swapped to place them inside Estonia';
    }
    if (picked.accuracyM !== null) {
      hint += ` (accuracy about ${Math.round(picked.accuracyM)} m — drag the pin if needed)`;
    }
    return hint;
  }

  protected locationErrorText(): string | null {
    const kind = this.locationError();
    return kind === null ? null : LOCATION_ERROR_COPY[kind];
  }

  /**
   * The map container only exists once the view is rendered; a null
   * container (should never happen) skips map creation but never breaks
   * the page. Map click AND pick-marker drag -> the shared location state.
   */
  ngAfterViewInit(): void {
    this.leaflet.mapClick = (latitude, longitude) => {
      // No flyTo: the user is already looking at the point (a re-center
      // during a pin drag would fight the gesture).
      this.setLocation(latitude, longitude, 'map-pick', false, false);
    };
    this.leaflet.create(this.mapEl()?.nativeElement ?? null, ESTONIA_CENTER, ESTONIA_ZOOM);
  }

  ngOnDestroy(): void {
    // Drop the mini-map instance + listeners (page-scoped, M4 decision 3).
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
    geolocation.getCurrentPosition(
      (position) => {
        this.setLocation(
          position.coords.latitude,
          position.coords.longitude,
          'geolocation',
          false,
          true,
          position.coords.accuracy,
        );
        this.locating.set(false);
      },
      (err) => {
        // Duck-typed code read: jsdom does not define GeolocationPositionError.
        const code = typeof err?.code === 'number' ? err.code : 2;
        this.failLocation(
          code === 1 ? 'geo-denied' : code === 3 ? 'geo-timeout' : 'geo-unavailable',
        );
        this.locating.set(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  /** maps.app.goo.gl -> POST /api/geo/resolve (JWT, per-IP 5/min). */
  private async resolveShortLink(url: string): Promise<void> {
    this.resolvingLink.set(true);
    this.locationError.set(null);
    try {
      const resolved = await this.geo.resolve(url);
      this.setLocation(resolved.latitude, resolved.longitude, 'link');
    } catch (failure: unknown) {
      const api = toApiError(failure);
      this.failLocation(api.status === 429 ? 'short-link-rate-limited' : 'short-link-failed');
    } finally {
      this.resolvingLink.set(false);
    }
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
  // Submit — payload shape unchanged (name + latitude/longitude numbers,
  // optional description/capacity)
  // ---------------------------------------------------------------------

  async submit(): Promise<void> {
    if (this.pending()) {
      return;
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

    const picked = this.location() as PickedLocation;
    const request: CreateShelterRequest = {
      name: this.name().value.trim(),
      latitude: picked.latitude,
      longitude: picked.longitude,
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
      const created = await this.gateway.create(request);
      await this.router.navigate(['/shelters', created.id]);
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
