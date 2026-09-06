import { Injectable } from '@angular/core';
import L from 'leaflet';
import type { ShelterDto } from '../../core/models';

/**
 * Default view for Estonia (05-CONTEXT-MAP.md: lat 57.5–59.7, lng 21.8–28.2).
 */
export const ESTONIA_CENTER: [number, number] = [58.6, 25.0];
export const ESTONIA_ZOOM = 7;

/**
 * Thin wrapper around the `leaflet` npm package (05-CONTEXT-MAP.md decision 3:
 * leaflet is called directly — no ngx-leaflet, which lags Angular majors).
 *
 * Page-scoped on purpose (design decision 3): one instance per MapPage visit,
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

  private map: L.Map | null = null;
  private markers: L.LayerGroup | null = null;

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
  }

  /**
   * Replaces ALL markers with one divIcon per shelter row — the layer group
   * is cleared first, so a filter refetch never duplicates markers.
   */
  renderShelters(shelters: ShelterDto[]): void {
    if (!this.map || !this.markers) {
      return;
    }
    this.markers.clearLayers();
    for (const shelter of shelters) {
      const isUser = shelter.source === 'USER';
      const marker = L.marker([shelter.latitude, shelter.longitude], {
        icon: L.divIcon({
          className: `shelter-marker ${isUser ? 'shelter-marker--user' : 'shelter-marker--registry'}`,
          iconSize: [14, 14],
        }),
        title: shelter.name,
      });
      marker.on('click', () => this.markerClick?.(shelter.id));
      marker.addTo(this.markers);
    }
  }

  /** Centers the map on the shelter's coordinates, keeping the current zoom. */
  flyTo(latitude: number, longitude: number): void {
    this.map?.flyTo([latitude, longitude]);
  }

  /** Removes the map instance (panes, tile + marker layers, all listeners). */
  destroy(): void {
    this.map?.remove();
    this.map = null;
    this.markers = null;
    this.markerClick = null;
  }
}
