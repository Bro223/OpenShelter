import { Injectable } from '@angular/core';
import L from 'leaflet';
import type { ShelterDto, ShelterSource } from '../core/models';

/**
 * Default view for Estonia (05-CONTEXT-MAP.md: lat 57.5–59.7, lng 21.8–28.2).
 */
export const ESTONIA_CENTER: [number, number] = [58.6, 25.0];
export const ESTONIA_ZOOM = 7;

/**
 * Street-level zoom for a single shelter (map-page selection + the detail
 * page's Location map). OSM's maxZoom is 19; 16 is where a building's
 * street context is legible without being so deep that one tile load
 * dominates the view.
 */
export const SHELTER_ZOOM = 16;

/**
 * Estonia bounding box — the client-side mirror of the backend's
 * GeoPoint.inEstonia (src/main/java/ee/sheltermap/domain/GeoPoint.java).
 * Used for instant feedback on /submit; the backend re-checks and rejects
 * out-of-bounds points with 400 either way (06-CONTEXT decision 1).
 */
export const ESTONIA_BOUNDS = {
  minLat: 57.5,
  maxLat: 59.7,
  minLng: 21.5,
  maxLng: 28.2,
} as const;

/** True when the point falls inside the Estonia bounding box. */
export function inEstonia(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= ESTONIA_BOUNDS.minLat &&
    latitude <= ESTONIA_BOUNDS.maxLat &&
    longitude >= ESTONIA_BOUNDS.minLng &&
    longitude <= ESTONIA_BOUNDS.maxLng
  );
}

/**
 * The marker tone class suffix (shelter-trust-and-reports D1): reported
 * (nonexistentReports > 0) wins over provenance — the orange dot is the
 * single "reported" affordance, provenance colours only for unreported
 * rows.
 */
export function markerTone(shelter: {
  source: ShelterSource;
  nonexistentReports: number;
}): 'reported' | 'user' | 'registry' {
  if (shelter.nonexistentReports > 0) {
    return 'reported';
  }
  return shelter.source === 'USER' ? 'user' : 'registry';
}

/**
 * Thin wrapper around the `leaflet` npm package (05-CONTEXT-MAP.md decision 3:
 * leaflet is called directly — no ngx-leaflet, which lags Angular majors).
 *
 * Page-scoped on purpose (design decision 3): one instance per page visit
 * (MapPage, SubmitShelterPage and ShelterDetailPage each provide their own),
 * created in the page's ngAfterViewInit and destroyed in its ngOnDestroy, so
 * no map instance or DOM listener leaks between visits. The component never
 * touches the leaflet API — it calls `renderShelters` with typed rows and
 * receives marker clicks through the `markerClick` callback.
 *
 * Markers are `L.divIcon` DOM pins (design decision 2 — no default icon
 * assets, no bundler asset-path pitfall): REGISTRY rows (PAASETEAMET +
 * MUNICIPALITY) render blue, USER rows green. The legend reuses the same
 * classes, so the visual stays single-sourced.
 */
@Injectable()
export class LeafletService {
  /** Set by the page; invoked with the shelter id whenever a marker is clicked. */
  markerClick: ((shelterId: number) => void) | null = null;

  /**
   * Set by the page (M5 /submit mini-map); invoked with [lat, lng] whenever
   * the map surface is clicked or the pick marker is dragged.
   */
  mapClick: ((latitude: number, longitude: number) => void) | null = null;

  private map: L.Map | null = null;
  private markers: L.LayerGroup | null = null;
  private pickMarker: L.Marker | null = null;

  /**
   * Builds the single map instance on the given container, with OSM standard
   * tiles (no API key) and one marker layer group. No-ops when the container
   * is missing (null guard) or a map already exists (create is one-per-visit).
   */
  create(
    el: HTMLElement | null,
    center: [number, number] = ESTONIA_CENTER,
    zoom: number = ESTONIA_ZOOM,
  ): void {
    if (!el || this.map) {
      return;
    }
    this.map = L.map(el, { center, zoom });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      // OSM tile usage policy: attribution must remain visible.
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);
    this.markers = L.layerGroup().addTo(this.map);
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.mapClick?.(event.latlng.lat, event.latlng.lng);
    });
  }

  /**
   * Replaces ALL markers with one divIcon per shelter row — the layer group
   * is cleared first, so a filter refetch never duplicates markers.
   *
   * Reported state (shelter-trust-and-reports D1): a shelter with
   * `nonexistentReports > 0` renders the ORANGE reported marker — the single
   * "reported" affordance — regardless of source. Provenance colours
   * (blue registry / green user) apply only to unreported shelters.
   */
  renderShelters(shelters: ShelterDto[]): void {
    if (!this.map || !this.markers) {
      return;
    }
    this.markers.clearLayers();
    for (const shelter of shelters) {
      const tone = markerTone(shelter);
      const marker = L.marker([shelter.latitude, shelter.longitude], {
        icon: L.divIcon({
          className: `shelter-marker shelter-marker--${tone}`,
          iconSize: [14, 14],
        }),
        title: shelter.name,
      });
      marker.on('click', () => this.markerClick?.(shelter.id));
      marker.addTo(this.markers);
    }
  }

  /**
   * Centers the map on the point. `zoom` is optional: when given, fly AND
   * zoom to that level (the street-level shelter view, SHELTER_ZOOM); when
   * omitted, keep the current zoom (the original M4 country-level behaviour).
   */
  flyTo(latitude: number, longitude: number, zoom?: number): void {
    if (zoom !== undefined) {
      this.map?.flyTo([latitude, longitude], zoom);
    } else {
      this.map?.flyTo([latitude, longitude]);
    }
  }

  /**
   * Shows ONE static shelter location (the /shelters/:id "Location" map):
   * a single non-interactive divIcon pin, source-coloured exactly like
   * `renderShelters`. Null clears the pin.
   *
   * Idempotent: the markers layer group is cleared first, so re-calls (e.g.
   * the refetch after a review write) replace the pin instead of duplicating
   * it. Deliberately does NOT wire `markerClick` or `setPick` — the detail
   * page has no marker navigation and no location picking.
   *
   * /map and /shelters/:id never share an instance (the service is
   * page-scoped, one per page visit), so a static pin can never leak into
   * the browse map's markers — no cross-contamination guard needed.
   */
  showShelter(
    shelter: {
      latitude: number;
      longitude: number;
      source: ShelterSource;
      name: string;
    } | null,
  ): void {
    if (!this.map || !this.markers) {
      return;
    }
    this.markers.clearLayers();
    if (shelter === null) {
      return;
    }
    const marker = L.marker([shelter.latitude, shelter.longitude], {
      icon: L.divIcon({
        className: `shelter-marker ${shelter.source === 'USER' ? 'shelter-marker--user' : 'shelter-marker--registry'}`,
        iconSize: [14, 14],
      }),
      // interactive: false -> leaflet attaches NO click handler (and no
      // drag): a pure location pin. keyboard: false keeps the pin out of
      // the tab order (leaflet would otherwise add tabIndex/role=button to
      // a marker that does nothing on activation). The title attribute
      // still renders as a native browser tooltip (set in _initIcon).
      interactive: false,
      keyboard: false,
      title: shelter.name,
    });
    marker.addTo(this.markers);
  }

  /**
   * Drops (or moves) the single location-pick marker (M5 /submit mini-map).
   * Draggable: a drag-end reports the new point through `mapClick`, so the
   * page's signals stay the single source of truth. Null args remove the
   * marker. No-ops before create / after destroy.
   */
  setPick(latitude: number | null, longitude: number | null): void {
    if (!this.map) {
      return;
    }
    if (latitude === null || longitude === null) {
      this.removePickMarker();
      return;
    }
    if (this.pickMarker === null) {
      this.pickMarker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: 'shelter-marker shelter-marker--pick',
          iconSize: [14, 14],
        }),
        draggable: true,
        title: 'Selected location',
      });
      this.pickMarker.on('dragend', () => {
        const point = this.pickMarker?.getLatLng();
        if (point) {
          this.mapClick?.(point.lat, point.lng);
        }
      });
      this.pickMarker.addTo(this.map);
    } else {
      this.pickMarker.setLatLng([latitude, longitude]);
    }
  }

  private removePickMarker(): void {
    this.pickMarker?.remove();
    this.pickMarker = null;
  }

  /** Removes the map instance (panes, tile + marker layers, all listeners). */
  destroy(): void {
    this.map?.remove();
    this.map = null;
    this.markers = null;
    this.pickMarker = null;
    this.markerClick = null;
    this.mapClick = null;
  }
}
