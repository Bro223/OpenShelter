import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  type OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api-error';
import type { ShelterDto, ShelterSourceFilter } from '../../core/models';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { ESTONIA_CENTER, ESTONIA_ZOOM, LeafletService } from './leaflet-service';

/** The three source-filter chips (server-side `?source=` refetch, design 4). */
const SOURCE_FILTERS: { value: ShelterSourceFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'REGISTRY', label: 'Registry' },
  { value: 'USER', label: 'User' },
];

/**
 * Public home for signed-out/signed-in users: '/map' (and '/', the default
 * route). The read-only shelter browse experience (M4): a Leaflet map with
 * divIcon markers (REGISTRY=blue, USER=green) + a sidebar list, source-filter
 * chips that refetch server-side, a legend, and loading/empty/error states.
 *
 * Thin shell (01-TASK.md §7): state in signals, business behaviour delegated —
 * the gateway owns the API, LeafletService owns the map. LeafletService is
 * page-scoped (one instance per visit, design decision 3) and destroyed in
 * ngOnDestroy so no map or listener leaks between visits (zoneless has no
 * safety net).
 *
 * Selection sync (design decision 5): a shared selectedShelterId signal — a
 * row click selects + flies the map (its RouterLink then opens the detail
 * stub), a marker click selects the row + navigates.
 */
@Component({
  selector: 'app-map-page',
  imports: [RouterLink, BannerComponent],
  providers: [LeafletService],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage implements AfterViewInit, OnDestroy {
  private readonly gateway = inject(ShelterGateway);
  private readonly leaflet = inject(LeafletService);
  private readonly router = inject(Router);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');

  protected readonly sourceFilters = SOURCE_FILTERS;
  protected readonly filter = signal<ShelterSourceFilter>('ALL');
  protected readonly shelters = signal<ShelterDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedId = signal<number | null>(null);

  /** Sidebar rows, sorted by name (05-CONTEXT-MAP: stable name sort). */
  protected readonly sorted = computed<ShelterDto[]>(() =>
    [...this.shelters()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  /** Zero rows for the current filter — only when the fetch settled cleanly. */
  protected readonly showEmpty = computed(
    () => !this.loading() && this.error() === null && this.shelters().length === 0,
  );

  /** Monotonic fetch sequence — a stale (out-of-order) response is dropped. */
  private fetchSeq = 0;

  /**
   * The map container only exists once the view is rendered; a null container
   * (should never happen) skips map creation but never breaks the page.
   */
  ngAfterViewInit(): void {
    this.leaflet.markerClick = (id) => this.onMarkerClick(id);
    this.leaflet.create(this.mapEl()?.nativeElement ?? null, ESTONIA_CENTER, ESTONIA_ZOOM);
    this.load('ALL');
  }

  ngOnDestroy(): void {
    // Cancel any in-flight response, then drop the map instance + listeners.
    this.fetchSeq++;
    this.leaflet.destroy();
  }

  /** Chip click — refetch with the server-side source param (no client filter).
   *  Public so specs can drive it (M2 page convention). */
  setFilter(source: ShelterSourceFilter): void {
    if (source === this.filter()) {
      return;
    }
    this.load(source);
  }

  /**
   * Row click: select (highlight) + fly the map to the shelter. Navigation
   * to /shelters/{id} is the row's RouterLink, which follows the selection.
   * Public so specs can drive it (M2 page convention).
   */
  selectShelter(shelter: ShelterDto): void {
    this.selectedId.set(shelter.id);
    this.leaflet.flyTo(shelter.latitude, shelter.longitude);
  }

  /** Marker click (LeafletService callback): select the row + navigate. */
  private onMarkerClick(id: number): void {
    this.selectedId.set(id);
    void this.router.navigate(['/shelters', id]);
  }

  protected sourceLabel(shelter: ShelterDto): string {
    return shelter.source === 'USER' ? 'User' : 'Registry';
  }

  /** null = no reviews yet — never render an invented zero (spec). */
  protected ratingText(shelter: ShelterDto): string {
    if (shelter.averageRating === null) {
      return 'No ratings yet';
    }
    return `★ ${shelter.averageRating.toFixed(1)} · ${shelter.reviewCount} review${
      shelter.reviewCount === 1 ? '' : 's'
    }`;
  }

  private load(source: ShelterSourceFilter): void {
    const seq = ++this.fetchSeq;
    this.filter.set(source);
    this.error.set(null);
    this.loading.set(true);
    void this.gateway.list(source).then(
      (rows) => {
        if (seq !== this.fetchSeq) {
          return; // a newer filter refetch superseded this response
        }
        this.shelters.set(rows);
        this.selectedId.set(null);
        this.leaflet.renderShelters(this.sorted());
        this.loading.set(false);
      },
      (failure: unknown) => {
        if (seq !== this.fetchSeq) {
          return;
        }
        this.shelters.set([]);
        this.selectedId.set(null);
        this.leaflet.renderShelters([]);
        this.error.set(toApiError(failure).message);
        this.loading.set(false);
      },
    );
  }
}
