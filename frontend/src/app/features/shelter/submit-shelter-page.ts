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
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import type {
  CreateShelterRequest,
  MineShelterDto,
  ShelterDto,
} from '../../core/models';
import { GeocodeGateway } from '../../gateways/geocode-gateway';
import { GeoGateway } from '../../gateways/geo-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { bannerMessage } from '../../shared/error-copy';
import {
  capacityValidator,
  focusFirstInvalidField,
  nameBlankValidator,
} from '../../shared/form-helpers';
import { LeafletService } from '../../shared/leaflet-service';
import { BannerComponent } from '../../shared/banner.component';
import { LoadingIndicator } from '../../shared/loading-indicator';
import { LocationCaptureView, type PickedLocation } from './location-capture-view';

/**
 * /submit (AuthGuard + VerifiedGuard) — verified-user shelter submission.
 * Name (≤200), optional description (≤2000), optional capacity (1–100
 * 000), the private-home declaration (locationKind), and a location
 * captured five ways — smart text input (coordinate string / long-form
 * map URL), "Use my location" (browser geolocation), maps.app.goo.gl
 * short links (POST /api/geo/resolve), an Estonia address search
 * (client-side OSM Nominatim via GeocodeGateway) and the mini-map
 * click/drag — all writing ONE shared location state that lives in
 * LocationCaptureView (the capture state object — the five modes, the
 * capture-generation guard, the inline errors, the mini-map; the page
 * reaches it through narrow typed accessors — see location-capture-view.ts).
 * Resolved coordinates are displayed read-only.
 *
 * On 201 the row is PUBLIC IMMEDIATELY as NEW (no blocking queue): the
 * page STAYS on /submit with a success panel linking to the (already
 * public) detail page. On 401/403/400 the backend message shows through
 * the banner (403 adds a /verify link — the claim can lapse
 * mid-session) and the form input is preserved.
 *
 * EDIT MODE reuses this same form: /submit?edit=<id> prefills it with
 * the row's current values, fetched from GET /api/shelters/mine
 * (owner-scoped, ALL statuses) — an id that is not the caller's, or a
 * malformed param, renders the not-found state, never someone else's
 * data. Save is PUT /api/shelters/{id} with the same payload shape as
 * create. The edit PUBLISHES IMMEDIATELY — the backend keeps the row's
 * status (an edit never unpublishes it) — and the shelter then carries
 * the same pending-verification (NEW) trust state a newly added shelter
 * gets: a STATUS, not a gate in front of the edit.
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
  private readonly i18n = inject(I18nService);
  /** The active route: /submit?edit=<id> opens the form in edit mode. */
  private readonly route = inject(ActivatedRoute);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');

  /** The location-capture state object: the ONE shared location state,
   *  the five capture modes (smart input, geolocation, short links,
   *  address search, the mini-map pick) and their capture-generation
   *  guard, the inline per-reason errors, and the mini-map lifecycle —
   *  see location-capture-view.ts for the contract. Constructed here
   *  because the pick must outlive the edit form's late mount (the
   *  afterEveryRender re-arm lives in the view's constructor); the page
   *  reaches it through narrow typed accessors: location() for the
   *  payload and the prefill guard, locationText() for the prefill,
   *  applySavedLocation() for the edit prefill, markMissingLocation()
   *  for the submit-time error, wireMap()/destroyMap() from the page's
   *  view hooks. */
  protected readonly capture: LocationCaptureView = new LocationCaptureView({
    geo: this.geo,
    geocode: this.geocode,
    leaflet: this.leaflet,
    i18n: this.i18n,
    mapEl: this.mapEl,
  });

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
    // The private-home declaration: maps to the payload's locationKind
    // (PRIVATE when checked, PUBLIC by default).
    privateLocation: new FormControl(false, { nonNullable: true }),
  });

  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  /** True when the last failure was a 403 — offer the /verify path. */
  protected readonly verifyLink = signal(false);
  /** The created row: set on 201 — the row is public immediately as NEW,
   *  so the success panel links to the detail page instead of navigating
   *  there (the form stays for a second submission). In edit mode it is
   *  the UPDATED row — the same panel is the save confirmation (the edit
   *  publishes immediately with the NEW pending-verification state). */
  protected readonly submitted = signal<ShelterDto | null>(null);

  // ---- edit mode ---------------------------------------------------------
  /** True while /submit?edit=<id> — the heading + submit button carry the
   *  edit/save copy. Creation is this same form WITHOUT the param. */
  protected readonly editMode = signal(false);
  /** True while the ?edit row is being loaded from /mine. */
  protected readonly editLoading = signal(false);
  /** The param is malformed, or the id is not the caller's row (absent
   *  from /mine): the not-found state renders instead of the form. */
  protected readonly editMissing = signal(false);
  /**
   * True when the /mine load failed with a 401 — the session is dead. The
   * central interceptor has ALREADY done the session work (cleared the
   * tokens, routed to /login?session=expired — api-interceptor.ts handles
   * 401 exactly once, pages never do); this explicit state renders for
   * the window until the bounce lands and on any back-button return. It
   * never renders the form — and with it the mini-map: an unauthorized
   * page leaves no dead grey map box behind. Other load failures (5xx,
   * network) keep the banner instead.
   */
  protected readonly sessionExpired = signal(false);
  /** The id of the row being edited — set once the /mine row is found.
   *  null = creation mode, or an edit that never resolved to a row. */
  protected readonly editingId = signal<number | null>(null);

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
   * The submit button's label: create mode says "Submit shelter" (a new
   * row), edit mode "Save changes" (a save, not a new submission); the
   * pending copy matches the mode ("Saving…" / "Submitting…").
   */
  protected submitButtonLabel(): string {
    const pendingKey = this.editMode() ? 'account.saving' : 'submit.submitting';
    const idleKey = this.editMode() ? 'account.save' : 'submit.submit';
    return this.i18n.t(this.pending() ? pendingKey : idleKey);
  }

  /**
   * Edit mode: /submit?edit=<id> prefills the SAME form with the row's
   * current values. The row comes from GET /api/shelters/mine —
   * owner-scoped, ALL statuses — so an id that is not the caller's (or a
   * malformed param) is the not-found state, never a prefill of someone
   * else's shelter.
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
    void this.loadEditRow(id);
  }

  /**
   * Loads the ?edit row from /mine. A 401 is the dead-session case: the
   * central interceptor has cleared the session and routed to
   * /login?session=expired — render the explicit session-expired state
   * (its copy carries the message, no banner on top) instead of a half
   * page that can never load its data. The 403/400/5xx/network branches
   * keep the banner — the session is alive there and the user can retry
   * on the page.
   */
  private async loadEditRow(id: number): Promise<void> {
    this.editLoading.set(true);
    try {
      const rows = await this.gateway.mine();
      const row = rows.find((r) => r.id === id);
      if (row === undefined) {
        this.editMissing.set(true);
        return;
      }
      this.prefillFromRow(row);
      this.editingId.set(row.id);
    } catch (failure: unknown) {
      if (toApiError(failure).status === 401) {
        this.sessionExpired.set(true);
        return;
      }
      this.error.set(bannerMessage(failure, 'shelter', (key) => this.i18n.t(key)));
    } finally {
      this.editLoading.set(false);
    }
  }

  /**
   * Fills the form + the shared location state from the row being edited.
   * Prefill, never overwrite: if the user already captured a location or
   * touched the form before the row landed, their input wins.
   */
  private prefillFromRow(row: MineShelterDto): void {
    if (
      this.capture.location() !== null ||
      this.form.touched ||
      this.capture.locationText() !== ''
    ) {
      return;
    }
    this.name().setValue(row.name);
    this.description().setValue(row.description ?? '');
    this.capacity().setValue(row.capacity);
    // The declaration mirrors the row's stored locationKind.
    this.privateLocation().setValue(row.locationKind === 'PRIVATE');
    this.capture.applySavedLocation(row.latitude, row.longitude);
  }

  /** Hands the view its mount: the pick callback (map click AND
   *  pick-marker drag → the shared location state) + the first mini-map
   *  create when the container already exists (creation mode; in edit
   *  mode the container mounts late and the view's afterEveryRender hook
   *  re-arms — see location-capture-view.ts). */
  ngAfterViewInit(): void {
    this.capture.wireMap();
  }

  /** Destroys the mini-map with the page (page-scoped instance — zoneless
   *  has no safety net). */
  ngOnDestroy(): void {
    this.capture.destroyMap();
  }

  // ---------------------------------------------------------------------
  // Submit — create POSTs /api/shelters, an edit PUTs /api/shelters/{id}
  // with the same payload shape
  // ---------------------------------------------------------------------

  /** The create/update payload: name + coordinates always, the optional
   *  description/capacity only when present, locationKind explicit —
   *  unchecked = PUBLIC (the contract default), checked = PRIVATE
   *  (the resident-offered declaration). The edit's PUT rides the
   *  identical shape: the backend's create/update constraint path is
   *  shared. */
  private buildRequest(): CreateShelterRequest {
    const picked = this.capture.location() as PickedLocation;
    const request: CreateShelterRequest = {
      name: this.name().value.trim(),
      latitude: picked.latitude,
      longitude: picked.longitude,
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
    return request;
  }

  async submit(): Promise<void> {
    if (this.pending()) {
      return;
    }
    const editId = this.editingId();
    if (this.editMode() && (this.editLoading() || editId === null)) {
      return; // the row is still loading (or never resolved) — nothing to save
    }
    this.form.markAllAsTouched();
    if (this.capture.location() === null) {
      this.capture.markMissingLocation();
    }
    if (this.form.invalid || this.capture.location() === null) {
      // Blocked submit: land keyboard focus on the first field with the
      // inline error — the location capture input when the form controls
      // are valid but nothing was picked yet.
      const formFieldFocused = focusFirstInvalidField(this.form, [
        ['name', 'shelter-name'],
        ['capacity', 'shelter-capacity'],
      ]);
      if (!formFieldFocused && this.capture.location() === null) {
        document.getElementById('shelter-location')?.focus();
      }
      return;
    }

    this.pending.set(true);
    this.error.set(null);
    this.verifyLink.set(false);
    this.submitted.set(null);
    try {
      const request = this.buildRequest();
      const result =
        editId === null
          ? await this.gateway.create(request)
          : await this.gateway.update(editId, request);
      // No navigation: the row is public NOW (an edit keeps the row's
      // status, so a published shelter stays published) — the success
      // panel links to the (already live) detail page.
      this.submitted.set(result);
    } catch (failure: unknown) {
      // Input preserved on purpose — the user fixes the backend's
      // complaint and retries. A 403 (the claim lapsed since the guard
      // ran) gets the /verify link.
      const api = toApiError(failure);
      this.error.set(bannerMessage(failure, 'shelter', (key) => this.i18n.t(key)));
      this.verifyLink.set(api.status === 403);
    } finally {
      this.pending.set(false);
    }
  }
}
