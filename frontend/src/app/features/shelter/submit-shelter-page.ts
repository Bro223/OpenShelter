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
import {
  type AbstractControl,
  type ValidationErrors,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api-error';
import type { CreateShelterRequest } from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { bannerMessage } from '../../shared/error-copy';
import { ESTONIA_CENTER, ESTONIA_ZOOM, inEstonia, LeafletService } from '../map/leaflet-service';
import { BannerComponent } from '../../shared/banner.component';

/** The capacity bounds (backend CreateShelterRequest: 1..100_000). */
const CAPACITY_MIN = 1;
const CAPACITY_MAX = 100_000;

/**
 * Read a coordinate out of the location controls. The controls are typed
 * number|null because Angular's NumberValueAccessor (input[type=number])
 * stores a number for a filled input and null for an empty one.
 */
function readCoordinate(value: number | string | null): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Group validator for the location pick: both coordinates must be present
 * and inside the Estonia bounding box. The backend re-checks and answers
 * 400 for out-of-bounds points — this is the instant-feedback layer
 * (06-CONTEXT decision 1), never a replacement for the server check.
 */
function locationValidator(control: AbstractControl): ValidationErrors | null {
  if (!(control instanceof FormGroup)) {
    return null;
  }
  const lat = readCoordinate(control.get('latitude')?.value);
  const lng = readCoordinate(control.get('longitude')?.value);
  if (lat === null || lng === null) {
    return { location: 'missing' };
  }
  return inEstonia(lat, lng) ? null : { location: 'outside' };
}

/** Capacity is optional (null); when present it must be an integer in 1..100_000. */
function capacityValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined) {
    return null; // optional — empty input
  }
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(numeric) || numeric < CAPACITY_MIN || numeric > CAPACITY_MAX) {
    return { capacity: true };
  }
  return null;
}

/**
 * /submit (AuthGuard + VerifiedGuard) — verified-user shelter submission
 * (05-shelter-review-flow.puml, M5). Name (≤200), optional description
 * (≤2000), optional capacity (1–100 000), and a location picked by clicking
 * the mini-map (LeafletService, page-scoped — design decision 6) or typed
 * into the numeric inputs, kept in sync both ways.
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
  private readonly leaflet = inject(LeafletService);
  private readonly router = inject(Router);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');

  readonly form = new FormGroup(
    {
      name: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.maxLength(200),
          // Whitespace-only names pass Validators.required — mirror the
          // backend @NotBlank (reviewer N3) so we never POST "   ".
          (c) => (String(c.value ?? '').trim() === '' ? { blank: true } : null),
        ],
      }),
      description: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(2000)],
      }),
      capacity: new FormControl<number | null>(null, { validators: [capacityValidator] }),
      latitude: new FormControl<number | null>(null),
      longitude: new FormControl<number | null>(null),
    },
    { validators: [locationValidator] },
  );

  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  /** True when the last failure was a 403 — offer the /verify path. */
  protected readonly verifyLink = signal(false);

  protected name(): FormControl<string> {
    return this.form.get('name') as FormControl<string>;
  }

  protected description(): FormControl<string> {
    return this.form.get('description') as FormControl<string>;
  }

  protected capacity(): FormControl<number | null> {
    return this.form.get('capacity') as FormControl<number | null>;
  }

  protected latitude(): FormControl<number | null> {
    return this.form.get('latitude') as FormControl<number | null>;
  }

  protected longitude(): FormControl<number | null> {
    return this.form.get('longitude') as FormControl<number | null>;
  }

  /** The location fieldset's inline error (missing / outside Estonia). */
  protected locationError(): string | null {
    const error = this.form.errors;
    if (!error || !('location' in error)) {
      return null;
    }
    return error['location'] === 'outside'
      ? 'The location must be inside Estonia.'
      : 'Pick a location on the map or enter both coordinates.';
  }

  /**
   * The map container only exists once the view is rendered; a null
   * container (should never happen) skips map creation but never breaks
   * the page. Map click -> coordinate inputs + the pick marker stay in sync.
   */
  ngAfterViewInit(): void {
    this.leaflet.mapClick = (latitude, longitude) => {
      this.latitude().setValue(latitude);
      this.longitude().setValue(longitude);
      this.leaflet.setPick(latitude, longitude);
    };
    this.leaflet.create(this.mapEl()?.nativeElement ?? null, ESTONIA_CENTER, ESTONIA_ZOOM);
  }

  ngOnDestroy(): void {
    // Drop the mini-map instance + listeners (page-scoped, M4 decision 3).
    this.leaflet.destroy();
  }

  /** Typed coordinate input -> move (or clear) the pick marker on the map. */
  protected onLocationInput(): void {
    const lat = readCoordinate(this.latitude().value);
    const lng = readCoordinate(this.longitude().value);
    this.leaflet.setPick(lat, lng);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    this.verifyLink.set(false);

    const request: CreateShelterRequest = {
      name: this.name().value.trim(),
      latitude: readCoordinate(this.latitude().value) as number,
      longitude: readCoordinate(this.longitude().value) as number,
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
