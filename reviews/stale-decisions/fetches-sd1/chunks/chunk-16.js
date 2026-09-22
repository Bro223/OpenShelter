const L = !__vite__cjsImport2_leaflet.__esModule ? __vite__cjsImport2_leaflet : __vite__cjsImport2_leaflet.default;import {
  verificationTone
} from "/chunk-CKLEX4Y2.js";

// src/app/shared/leaflet-service.ts
import { Injectable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import __vite__cjsImport2_leaflet from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/leaflet.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var ESTONIA_CENTER = [58.6, 25];
var ESTONIA_ZOOM = 7;
var SHELTER_ZOOM = 16;
function markerTone(shelter) {
  if (shelter.nonexistentReports > 0) {
    return "reported";
  }
  if (shelter.source === "USER") {
    const shape = verificationTone(shelter);
    if (shape !== null) {
      return shape;
    }
    return shelter.reviewStatus === "NEW" ? "new" : "user";
  }
  return "registry";
}
var LeafletService = class _LeafletService {
  /** Set by the page; invoked with the shelter id whenever a marker is clicked. */
  markerClick = null;
  /**
   * Set by the page (the /submit mini-map); invoked with [lat, lng] whenever
   * the map surface is clicked or the pick marker is dragged.
   */
  mapClick = null;
  map = null;
  markers = null;
  pickMarker = null;
  /** The browse anchor pin (location-navigation, /map address search):
   *  its OWN field — it must coexist with the shelter markers, so it is
   *  never added to (or cleared by) the markers layer group. */
  anchorMarker = null;
  /**
   * Keeps the map in sync with a flex-sized container: the /map layout
   * stretches with the viewport (flex-height row), so the container's
   * pixel size changes on window resizes — invalidateSize() re-measures
   * the panes and re-centers. Guarded: environments without ResizeObserver
   * (test DOMs) still get a correctly initialised map, just without live
   * resize sync.
   */
  resizeObserver = null;
  /**
   * Builds the single map instance on the given container, with OSM standard
   * tiles (no API key) and one marker layer group. No-ops when the container
   * is missing (null guard) or a map already exists (create is one-per-visit).
   */
  create(el, center = ESTONIA_CENTER, zoom = ESTONIA_ZOOM) {
    if (!el || this.map) {
      return;
    }
    this.map = L.map(el, { center, zoom });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      // OSM tile usage policy: attribution must remain visible.
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);
    this.markers = L.layerGroup().addTo(this.map);
    this.map.on("click", (event) => {
      this.mapClick?.(event.latlng.lat, event.latlng.lng);
    });
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.map?.invalidateSize();
      });
      this.resizeObserver.observe(el);
    }
  }
  /**
   * Replaces ALL markers with one divIcon per shelter row — the layer group
   * is cleared first, so a filter refetch never duplicates markers.
   *
   * Trust palette (community-review-queue D5): the tone follows
   * source/reviewStatus; a shelter with `nonexistentReports > 0` renders
   * the ORANGE reported marker — the single "reported" affordance —
   * regardless of trust colour.
   */
  renderShelters(shelters) {
    if (!this.map || !this.markers) {
      return;
    }
    this.markers.clearLayers();
    for (const shelter of shelters) {
      const tone = markerTone(shelter);
      const marker = L.marker([shelter.latitude, shelter.longitude], {
        icon: L.divIcon({
          className: `shelter-marker shelter-marker--${tone}`,
          iconSize: [14, 14]
        }),
        // Shelters are the DATA: the browse anchor pin (a reference point)
        // must never obscure a shelter marker at the same point, at any
        // zoom the app uses (country 7 / neighbourhood 14 / street 16).
        // The anchor keeps the default offset; shelters outrank it.
        zIndexOffset: 1e3,
        title: shelter.name
      });
      marker.on("click", () => this.markerClick?.(shelter.id));
      marker.addTo(this.markers);
    }
  }
  /**
   * Centers the map on the point. `zoom` is optional: when given, fly AND
   * zoom to that level (the street-level shelter view, SHELTER_ZOOM); when
   * omitted, keep the current zoom (the country-level behaviour).
   */
  flyTo(latitude, longitude, zoom) {
    if (zoom === void 0) {
      this.map?.flyTo([latitude, longitude]);
    } else {
      this.map?.flyTo([latitude, longitude], zoom);
    }
  }
  /**
   * Shows ONE static shelter location (the /shelters/:id "Location" map):
   * a single non-interactive divIcon pin, toned exactly like
   * `renderShelters` (reported override, then the trust palette). Null
   * clears the pin.
   * Idempotent: the markers layer group is cleared first, so re-calls (e.g.
   * the refetch after a review write) replace the pin instead of duplicating
   * it. Deliberately does NOT wire `markerClick` or `setPick` — the detail
   * page has no marker navigation and no location picking.
   *
   * /map and /shelters/:id never share an instance (the service is
   * page-scoped, one per page visit), so a static pin can never leak into
   * the browse map's markers — no cross-contamination guard needed.
   */
  showShelter(shelter) {
    if (!this.map || !this.markers) {
      return;
    }
    this.markers.clearLayers();
    if (shelter === null) {
      return;
    }
    const marker = L.marker([shelter.latitude, shelter.longitude], {
      icon: L.divIcon({
        className: `shelter-marker shelter-marker--${markerTone(shelter)}`,
        iconSize: [14, 14]
      }),
      // interactive: false -> leaflet attaches NO click handler (and no
      // drag): a pure location pin. keyboard: false keeps the pin out of
      // the tab order (leaflet would otherwise add tabIndex/role=button to
      // a marker that does nothing on activation). The title attribute
      // still renders as a native browser tooltip (set in _initIcon).
      interactive: false,
      keyboard: false,
      title: shelter.name
    });
    marker.addTo(this.markers);
  }
  /**
   * Drops (or moves) the single location-pick marker (the /submit mini-map).
   * Draggable: a drag-end reports the new point through `mapClick`, so the
   * page's signals stay the single source of truth. Null args remove the
   * marker. No-ops before create / after destroy.
   */
  setPick(latitude, longitude) {
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
          className: "shelter-marker shelter-marker--pick",
          iconSize: [14, 14]
        }),
        draggable: true,
        title: "Selected location"
      });
      this.pickMarker.on("dragend", () => {
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
  removePickMarker() {
    this.pickMarker?.remove();
    this.pickMarker = null;
  }
  /**
   * Drops (or moves) the single BROWSE ANCHOR pin (location-navigation,
   * /map address search): the ORIGIN the per-row distances are measured
   * from. NON-draggable and non-interactive — unlike the /submit pick
   * marker, the anchor is derived from a geocoded address, not freehand:
   * dragging it would move the reference point to a place with no data
   * behind it, so the pin is fixed and the anchor is removed by its Clear
   * action instead. Distinct from shelter markers on SHAPE, not colour
   * alone: shelters are 14px circles, the origin is a smaller (12px)
   * diamond (`.shelter-marker--anchor`) in the user-picked-spot teal
   * (`--color-shelter-pick`) — the map legend carries a matching entry, and
   * the title attribute is its accessible name. The title is a REQUIRED
   * caller argument: the service is locale-agnostic and the label is the
   * caller's localized `map.searched` copy (N7 i18n-completeness — the
   * hardcoded English is gone from the shared service). Null args remove
   * the pin. No-ops before create / after destroy; NEVER touches the
   * shelter markers layer group.
   */
  setAnchor(latitude, longitude, title) {
    if (!this.map) {
      return;
    }
    if (latitude === null || longitude === null) {
      this.removeAnchorMarker();
      return;
    }
    if (this.anchorMarker === null) {
      this.anchorMarker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: "shelter-marker shelter-marker--anchor",
          iconSize: [12, 12]
        }),
        // The pin is a fixed reference point: interactive:false attaches
        // no click handler (a click must not fight the shelter markers'),
        // keyboard:false keeps it out of the tab order, and the title
        // attribute still renders as the native browser tooltip.
        interactive: false,
        keyboard: false,
        title
      });
      this.anchorMarker.addTo(this.map);
    } else {
      this.anchorMarker.setLatLng([latitude, longitude]);
    }
  }
  removeAnchorMarker() {
    this.anchorMarker?.remove();
    this.anchorMarker = null;
  }
  /** Removes the map instance (panes, tile + marker layers, all listeners). */
  destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.map?.remove();
    this.map = null;
    this.markers = null;
    this.pickMarker = null;
    this.anchorMarker = null;
    this.markerClick = null;
    this.mapClick = null;
  }
  static \u0275fac = function LeafletService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LeafletService)();
  };
  static \u0275prov = /* @__PURE__ */ i0.\u0275\u0275defineInjectable({ token: _LeafletService, factory: _LeafletService.\u0275fac });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(LeafletService, [{
    type: Injectable
  }], null, null);
})();

export {
  ESTONIA_CENTER,
  ESTONIA_ZOOM,
  SHELTER_ZOOM,
  LeafletService
};
//# debugId=95e3ba0b-fd12-58bb-a4a2-8db88a9a6a49


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvc2hhcmVkL2xlYWZsZXQtc2VydmljZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgTCBmcm9tICdsZWFmbGV0JztcbmltcG9ydCB7IHZlcmlmaWNhdGlvblRvbmUgfSBmcm9tICcuL3NoZWx0ZXItY29weSc7XG5pbXBvcnQgdHlwZSB7XG4gIFJldmlld1N0YXR1cyxcbiAgU2hlbHRlckR0byxcbiAgU2hlbHRlclNvdXJjZSxcbiAgU3VibWl0dGVyVmVyaWZpY2F0aW9uLFxufSBmcm9tICcuLi9jb3JlL21vZGVscyc7XG5cbi8qKlxuICogRGVmYXVsdCB2aWV3IGZvciBFc3RvbmlhICgwNS1DT05URVhULU1BUC5tZDogbGF0IDU3LjXigJM1OS43LCBsbmcgMjEuOOKAkzI4LjIpLlxuICovXG5leHBvcnQgY29uc3QgRVNUT05JQV9DRU5URVI6IFtudW1iZXIsIG51bWJlcl0gPSBbNTguNiwgMjUuMF07XG5leHBvcnQgY29uc3QgRVNUT05JQV9aT09NID0gNztcblxuLyoqXG4gKiBTdHJlZXQtbGV2ZWwgem9vbSBmb3IgYSBzaW5nbGUgc2hlbHRlciAobWFwLXBhZ2Ugc2VsZWN0aW9uICsgdGhlIGRldGFpbFxuICogcGFnZSdzIExvY2F0aW9uIG1hcCkuIE9TTSdzIG1heFpvb20gaXMgMTk7IDE2IGlzIHdoZXJlIGEgYnVpbGRpbmcnc1xuICogc3RyZWV0IGNvbnRleHQgaXMgbGVnaWJsZSB3aXRob3V0IGJlaW5nIHNvIGRlZXAgdGhhdCBvbmUgdGlsZSBsb2FkXG4gKiBkb21pbmF0ZXMgdGhlIHZpZXcuXG4gKi9cbmV4cG9ydCBjb25zdCBTSEVMVEVSX1pPT00gPSAxNjtcblxuLyoqXG4gKiBFc3RvbmlhIGJvdW5kaW5nIGJveCDigJQgdGhlIGNsaWVudC1zaWRlIG1pcnJvciBvZiB0aGUgYmFja2VuZCdzXG4gKiBHZW9Qb2ludC5pbkVzdG9uaWEgKHNyYy9tYWluL2phdmEvZWUvc2hlbHRlcm1hcC9kb21haW4vR2VvUG9pbnQuamF2YSkuXG4gKiBVc2VkIGZvciBpbnN0YW50IGZlZWRiYWNrIG9uIC9zdWJtaXQ7IHRoZSBiYWNrZW5kIHJlLWNoZWNrcyBhbmQgcmVqZWN0c1xuICogb3V0LW9mLWJvdW5kcyBwb2ludHMgd2l0aCA0MDAgZWl0aGVyIHdheSAoMDYtQ09OVEVYVCBkZWNpc2lvbiAxKS5cbiAqL1xuZXhwb3J0IGNvbnN0IEVTVE9OSUFfQk9VTkRTID0ge1xuICBtaW5MYXQ6IDU3LjUsXG4gIG1heExhdDogNTkuNyxcbiAgbWluTG5nOiAyMS41LFxuICBtYXhMbmc6IDI4LjIsXG59IGFzIGNvbnN0O1xuXG4vKiogVHJ1ZSB3aGVuIHRoZSBwb2ludCBmYWxscyBpbnNpZGUgdGhlIEVzdG9uaWEgYm91bmRpbmcgYm94LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluRXN0b25pYShsYXRpdHVkZTogbnVtYmVyLCBsb25naXR1ZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gKFxuICAgIE51bWJlci5pc0Zpbml0ZShsYXRpdHVkZSkgJiZcbiAgICBOdW1iZXIuaXNGaW5pdGUobG9uZ2l0dWRlKSAmJlxuICAgIGxhdGl0dWRlID49IEVTVE9OSUFfQk9VTkRTLm1pbkxhdCAmJlxuICAgIGxhdGl0dWRlIDw9IEVTVE9OSUFfQk9VTkRTLm1heExhdCAmJlxuICAgIGxvbmdpdHVkZSA+PSBFU1RPTklBX0JPVU5EUy5taW5MbmcgJiZcbiAgICBsb25naXR1ZGUgPD0gRVNUT05JQV9CT1VORFMubWF4TG5nXG4gICk7XG59XG5cbi8qKlxuICogVGhlIG1hcmtlciB0b25lIGNsYXNzIHN1ZmZpeC4gUmVwb3J0ZWQgc3RhdGUgKHNoZWx0ZXItdHJ1c3QtYW5kLXJlcG9ydHNcbiAqIEQxKSB3aW5zIG92ZXIgZXZlcnl0aGluZyDigJQgdGhlIG9yYW5nZSBkb3QgaXMgdGhlIHNpbmdsZSBcInJlcG9ydGVkXCJcbiAqIGFmZm9yZGFuY2UgKHRoZSByZWQtb3JhbmdlIHN0YXlzIGEgZGlzdGluY3QgZmFtaWx5IGluIGV2ZXJ5IHRoZW1lOyB0aGVcbiAqIHllbGxvdy1mYW1pbHkgdW5pZmljYXRpb24sIG93bmVyIGRlY2lzaW9uLCBkaWQgbm90IHRvdWNoIGl0KS4gRm9yXG4gKiBjb21tdW5pdHkgcm93cyB0aGUgU0hBUEUgdGhlbiBjYXJyaWVzIHRoZSBzdWJtaXR0ZXIncyB2ZXJpZmljYXRpb24gZGVwdGhcbiAqIChzdWJtaXR0ZXItdmVyaWZpY2F0aW9uLWJhZGdlLCBvd25lciBkZWNpc2lvbik6IGBwYXJ0aWFsYCBpcyBhIHRyaWFuZ2xlXG4gKiBhdCBleGFjdGx5IG9uZSBjb25maXJtZWQgY2hhbm5lbCwgYGZ1bGxgIGEgY2lyY2xlIGF0IHR3byBvciBtb3JlIOKAlCBuZXZlclxuICogY29sb3VyIGFsb25lIChXQ0FHIDEuNC4xLCB0aGUgc2FtZSByYXRpb25hbGUgYXMgdGhlIGFuY2hvciBkaWFtb25kKS4gQVxuICogcm93IHdob3NlIGRlcHRoIHRoZSBiYWNrZW5kIGRvZXMgbm90IHJlcG9ydCAob2xkZXIgQVBJLCBkZWxldGVkIGF1dGhvcilcbiAqIGtlZXBzIHRoZSB0cnVzdCB0b25lIChjb21tdW5pdHktcmV2aWV3LXF1ZXVlIEQ1KTogdGhlIHVuaWZpZWRcbiAqIHZlcmlmaWVkLXllbGxvdyBmYW1pbHkgd2hpbGUgTkVXICh0aGUgYW1iZXIgd2FzIG1lcmdlZCBpbnRvIHRoZSB5ZWxsb3dcbiAqIGZhbWlseSwgb3duZXIgZGVjaXNpb24g4oCUIHRoZSBzdGF0ZSByaWRlcyBvbiB0aGUgc2hhcGUgKyB0aGUgcm93J3MgYmFkZ2VcbiAqIHRleHQsIG5ldmVyIGEgdGhpcmQgaHVlKSwgZ3JlZW4gb25jZSBDT05GSVJNRUQuIFJlZ2lzdHJ5IHJvd3Mgc3RheSBibHVlO1xuICogaGlkZGVuIHJvd3MgbmV2ZXIgcmVhY2ggdGhlIHB1YmxpYyBtYXAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrZXJUb25lKHNoZWx0ZXI6IHtcbiAgc291cmNlOiBTaGVsdGVyU291cmNlO1xuICByZXZpZXdTdGF0dXM6IFJldmlld1N0YXR1cztcbiAgbm9uZXhpc3RlbnRSZXBvcnRzOiBudW1iZXI7XG4gIHN1Ym1pdHRlclZlcmlmaWNhdGlvbj86IFN1Ym1pdHRlclZlcmlmaWNhdGlvbiB8IG51bGw7XG59KTogJ3JlcG9ydGVkJyB8ICdwYXJ0aWFsJyB8ICdmdWxsJyB8ICduZXcnIHwgJ3VzZXInIHwgJ3JlZ2lzdHJ5JyB7XG4gIGlmIChzaGVsdGVyLm5vbmV4aXN0ZW50UmVwb3J0cyA+IDApIHtcbiAgICByZXR1cm4gJ3JlcG9ydGVkJztcbiAgfVxuICBpZiAoc2hlbHRlci5zb3VyY2UgPT09ICdVU0VSJykge1xuICAgIGNvbnN0IHNoYXBlID0gdmVyaWZpY2F0aW9uVG9uZShzaGVsdGVyKTtcbiAgICBpZiAoc2hhcGUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBzaGFwZTtcbiAgICB9XG4gICAgcmV0dXJuIHNoZWx0ZXIucmV2aWV3U3RhdHVzID09PSAnTkVXJyA/ICduZXcnIDogJ3VzZXInO1xuICB9XG4gIHJldHVybiAncmVnaXN0cnknO1xufVxuXG4vKipcbiAqIFRoaW4gd3JhcHBlciBhcm91bmQgdGhlIGBsZWFmbGV0YCBucG0gcGFja2FnZSAoMDUtQ09OVEVYVC1NQVAubWQgZGVjaXNpb24gMzpcbiAqIGxlYWZsZXQgaXMgY2FsbGVkIGRpcmVjdGx5IOKAlCBubyBuZ3gtbGVhZmxldCwgd2hpY2ggbGFncyBBbmd1bGFyIG1ham9ycykuXG4gKlxuICogUGFnZS1zY29wZWQgb24gcHVycG9zZSAoZGVzaWduIGRlY2lzaW9uIDMpOiBvbmUgaW5zdGFuY2UgcGVyIHBhZ2UgdmlzaXRcbiAqIChNYXBQYWdlLCBTdWJtaXRTaGVsdGVyUGFnZSBhbmQgU2hlbHRlckRldGFpbFBhZ2UgZWFjaCBwcm92aWRlIHRoZWlyIG93biksXG4gKiBjcmVhdGVkIGluIHRoZSBwYWdlJ3MgbmdBZnRlclZpZXdJbml0IGFuZCBkZXN0cm95ZWQgaW4gaXRzIG5nT25EZXN0cm95LCBzb1xuICogbm8gbWFwIGluc3RhbmNlIG9yIERPTSBsaXN0ZW5lciBsZWFrcyBiZXR3ZWVuIHZpc2l0cy4gVGhlIGNvbXBvbmVudCBuZXZlclxuICogdG91Y2hlcyB0aGUgbGVhZmxldCBBUEkg4oCUIGl0IGNhbGxzIGByZW5kZXJTaGVsdGVyc2Agd2l0aCB0eXBlZCByb3dzIGFuZFxuICogcmVjZWl2ZXMgbWFya2VyIGNsaWNrcyB0aHJvdWdoIHRoZSBgbWFya2VyQ2xpY2tgIGNhbGxiYWNrLlxuICpcbiAqIE1hcmtlcnMgYXJlIGBMLmRpdkljb25gIERPTSBwaW5zIChkZXNpZ24gZGVjaXNpb24gMiDigJQgbm8gZGVmYXVsdCBpY29uXG4gKiBhc3NldHMsIG5vIGJ1bmRsZXIgYXNzZXQtcGF0aCBwaXRmYWxsKTogdGhlIHRvbmUgZm9sbG93cyB0aGUgdHJ1c3RcbiAqIHBhbGV0dGUg4oCUIHJlZ2lzdHJ5IGJsdWUgKFDDpMOkc3RlYW1ldCArIE11bmljaXBhbCksIGNvbW11bml0eSBORVcgeWVsbG93XG4gKiAodGhlIHVuaWZpZWQgdmVyaWZpZWQgZmFtaWx5KSwgY29tbXVuaXR5IENPTkZJUk1FRCBncmVlbiAodXNlciBmYW1pbHkpO1xuICogcmVwb3J0ZWQgcm93cyBrZWVwIHRoZSBvcmFuZ2Ugb3ZlcnJpZGUuIFRoZSBsZWdlbmQgcmV1c2VzIHRoZSBzYW1lXG4gKiBjbGFzc2VzLCBzbyB0aGUgdmlzdWFsIHN0YXlzIHNpbmdsZS1zb3VyY2VkLlxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgTGVhZmxldFNlcnZpY2Uge1xuICAvKiogU2V0IGJ5IHRoZSBwYWdlOyBpbnZva2VkIHdpdGggdGhlIHNoZWx0ZXIgaWQgd2hlbmV2ZXIgYSBtYXJrZXIgaXMgY2xpY2tlZC4gKi9cbiAgbWFya2VyQ2xpY2s6ICgoc2hlbHRlcklkOiBudW1iZXIpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFNldCBieSB0aGUgcGFnZSAodGhlIC9zdWJtaXQgbWluaS1tYXApOyBpbnZva2VkIHdpdGggW2xhdCwgbG5nXSB3aGVuZXZlclxuICAgKiB0aGUgbWFwIHN1cmZhY2UgaXMgY2xpY2tlZCBvciB0aGUgcGljayBtYXJrZXIgaXMgZHJhZ2dlZC5cbiAgICovXG4gIG1hcENsaWNrOiAoKGxhdGl0dWRlOiBudW1iZXIsIGxvbmdpdHVkZTogbnVtYmVyKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgbWFwOiBMLk1hcCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIG1hcmtlcnM6IEwuTGF5ZXJHcm91cCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBpY2tNYXJrZXI6IEwuTWFya2VyIHwgbnVsbCA9IG51bGw7XG4gIC8qKiBUaGUgYnJvd3NlIGFuY2hvciBwaW4gKGxvY2F0aW9uLW5hdmlnYXRpb24sIC9tYXAgYWRkcmVzcyBzZWFyY2gpOlxuICAgKiAgaXRzIE9XTiBmaWVsZCDigJQgaXQgbXVzdCBjb2V4aXN0IHdpdGggdGhlIHNoZWx0ZXIgbWFya2Vycywgc28gaXQgaXNcbiAgICogIG5ldmVyIGFkZGVkIHRvIChvciBjbGVhcmVkIGJ5KSB0aGUgbWFya2VycyBsYXllciBncm91cC4gKi9cbiAgcHJpdmF0ZSBhbmNob3JNYXJrZXI6IEwuTWFya2VyIHwgbnVsbCA9IG51bGw7XG4gIC8qKlxuICAgKiBLZWVwcyB0aGUgbWFwIGluIHN5bmMgd2l0aCBhIGZsZXgtc2l6ZWQgY29udGFpbmVyOiB0aGUgL21hcCBsYXlvdXRcbiAgICogc3RyZXRjaGVzIHdpdGggdGhlIHZpZXdwb3J0IChmbGV4LWhlaWdodCByb3cpLCBzbyB0aGUgY29udGFpbmVyJ3NcbiAgICogcGl4ZWwgc2l6ZSBjaGFuZ2VzIG9uIHdpbmRvdyByZXNpemVzIOKAlCBpbnZhbGlkYXRlU2l6ZSgpIHJlLW1lYXN1cmVzXG4gICAqIHRoZSBwYW5lcyBhbmQgcmUtY2VudGVycy4gR3VhcmRlZDogZW52aXJvbm1lbnRzIHdpdGhvdXQgUmVzaXplT2JzZXJ2ZXJcbiAgICogKHRlc3QgRE9Ncykgc3RpbGwgZ2V0IGEgY29ycmVjdGx5IGluaXRpYWxpc2VkIG1hcCwganVzdCB3aXRob3V0IGxpdmVcbiAgICogcmVzaXplIHN5bmMuXG4gICAqL1xuICBwcml2YXRlIHJlc2l6ZU9ic2VydmVyOiBSZXNpemVPYnNlcnZlciB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBCdWlsZHMgdGhlIHNpbmdsZSBtYXAgaW5zdGFuY2Ugb24gdGhlIGdpdmVuIGNvbnRhaW5lciwgd2l0aCBPU00gc3RhbmRhcmRcbiAgICogdGlsZXMgKG5vIEFQSSBrZXkpIGFuZCBvbmUgbWFya2VyIGxheWVyIGdyb3VwLiBOby1vcHMgd2hlbiB0aGUgY29udGFpbmVyXG4gICAqIGlzIG1pc3NpbmcgKG51bGwgZ3VhcmQpIG9yIGEgbWFwIGFscmVhZHkgZXhpc3RzIChjcmVhdGUgaXMgb25lLXBlci12aXNpdCkuXG4gICAqL1xuICBjcmVhdGUoXG4gICAgZWw6IEhUTUxFbGVtZW50IHwgbnVsbCxcbiAgICBjZW50ZXI6IFtudW1iZXIsIG51bWJlcl0gPSBFU1RPTklBX0NFTlRFUixcbiAgICB6b29tOiBudW1iZXIgPSBFU1RPTklBX1pPT00sXG4gICk6IHZvaWQge1xuICAgIGlmICghZWwgfHwgdGhpcy5tYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5tYXAgPSBMLm1hcChlbCwgeyBjZW50ZXIsIHpvb20gfSk7XG4gICAgTC50aWxlTGF5ZXIoJ2h0dHBzOi8vdGlsZS5vcGVuc3RyZWV0bWFwLm9yZy97en0ve3h9L3t5fS5wbmcnLCB7XG4gICAgICAvLyBPU00gdGlsZSB1c2FnZSBwb2xpY3k6IGF0dHJpYnV0aW9uIG11c3QgcmVtYWluIHZpc2libGUuXG4gICAgICBhdHRyaWJ1dGlvbjpcbiAgICAgICAgJyZjb3B5OyA8YSBocmVmPVwiaHR0cHM6Ly93d3cub3BlbnN0cmVldG1hcC5vcmcvY29weXJpZ2h0XCI+T3BlblN0cmVldE1hcDwvYT4gY29udHJpYnV0b3JzJyxcbiAgICAgIG1heFpvb206IDE5LFxuICAgIH0pLmFkZFRvKHRoaXMubWFwKTtcbiAgICB0aGlzLm1hcmtlcnMgPSBMLmxheWVyR3JvdXAoKS5hZGRUbyh0aGlzLm1hcCk7XG4gICAgdGhpcy5tYXAub24oJ2NsaWNrJywgKGV2ZW50OiBMLkxlYWZsZXRNb3VzZUV2ZW50KSA9PiB7XG4gICAgICB0aGlzLm1hcENsaWNrPy4oZXZlbnQubGF0bG5nLmxhdCwgZXZlbnQubGF0bG5nLmxuZyk7XG4gICAgfSk7XG4gICAgaWYgKHR5cGVvZiBSZXNpemVPYnNlcnZlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMucmVzaXplT2JzZXJ2ZXIgPSBuZXcgUmVzaXplT2JzZXJ2ZXIoKCkgPT4ge1xuICAgICAgICB0aGlzLm1hcD8uaW52YWxpZGF0ZVNpemUoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZXNpemVPYnNlcnZlci5vYnNlcnZlKGVsKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVwbGFjZXMgQUxMIG1hcmtlcnMgd2l0aCBvbmUgZGl2SWNvbiBwZXIgc2hlbHRlciByb3cg4oCUIHRoZSBsYXllciBncm91cFxuICAgKiBpcyBjbGVhcmVkIGZpcnN0LCBzbyBhIGZpbHRlciByZWZldGNoIG5ldmVyIGR1cGxpY2F0ZXMgbWFya2Vycy5cbiAgICpcbiAgICogVHJ1c3QgcGFsZXR0ZSAoY29tbXVuaXR5LXJldmlldy1xdWV1ZSBENSk6IHRoZSB0b25lIGZvbGxvd3NcbiAgICogc291cmNlL3Jldmlld1N0YXR1czsgYSBzaGVsdGVyIHdpdGggYG5vbmV4aXN0ZW50UmVwb3J0cyA+IDBgIHJlbmRlcnNcbiAgICogdGhlIE9SQU5HRSByZXBvcnRlZCBtYXJrZXIg4oCUIHRoZSBzaW5nbGUgXCJyZXBvcnRlZFwiIGFmZm9yZGFuY2Ug4oCUXG4gICAqIHJlZ2FyZGxlc3Mgb2YgdHJ1c3QgY29sb3VyLlxuICAgKi9cbiAgcmVuZGVyU2hlbHRlcnMoc2hlbHRlcnM6IFNoZWx0ZXJEdG9bXSk6IHZvaWQge1xuICAgIGlmICghdGhpcy5tYXAgfHwgIXRoaXMubWFya2Vycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLm1hcmtlcnMuY2xlYXJMYXllcnMoKTtcbiAgICBmb3IgKGNvbnN0IHNoZWx0ZXIgb2Ygc2hlbHRlcnMpIHtcbiAgICAgIGNvbnN0IHRvbmUgPSBtYXJrZXJUb25lKHNoZWx0ZXIpO1xuICAgICAgY29uc3QgbWFya2VyID0gTC5tYXJrZXIoW3NoZWx0ZXIubGF0aXR1ZGUsIHNoZWx0ZXIubG9uZ2l0dWRlXSwge1xuICAgICAgICBpY29uOiBMLmRpdkljb24oe1xuICAgICAgICAgIGNsYXNzTmFtZTogYHNoZWx0ZXItbWFya2VyIHNoZWx0ZXItbWFya2VyLS0ke3RvbmV9YCxcbiAgICAgICAgICBpY29uU2l6ZTogWzE0LCAxNF0sXG4gICAgICAgIH0pLFxuICAgICAgICAvLyBTaGVsdGVycyBhcmUgdGhlIERBVEE6IHRoZSBicm93c2UgYW5jaG9yIHBpbiAoYSByZWZlcmVuY2UgcG9pbnQpXG4gICAgICAgIC8vIG11c3QgbmV2ZXIgb2JzY3VyZSBhIHNoZWx0ZXIgbWFya2VyIGF0IHRoZSBzYW1lIHBvaW50LCBhdCBhbnlcbiAgICAgICAgLy8gem9vbSB0aGUgYXBwIHVzZXMgKGNvdW50cnkgNyAvIG5laWdoYm91cmhvb2QgMTQgLyBzdHJlZXQgMTYpLlxuICAgICAgICAvLyBUaGUgYW5jaG9yIGtlZXBzIHRoZSBkZWZhdWx0IG9mZnNldDsgc2hlbHRlcnMgb3V0cmFuayBpdC5cbiAgICAgICAgekluZGV4T2Zmc2V0OiAxMDAwLFxuICAgICAgICB0aXRsZTogc2hlbHRlci5uYW1lLFxuICAgICAgfSk7XG4gICAgICBtYXJrZXIub24oJ2NsaWNrJywgKCkgPT4gdGhpcy5tYXJrZXJDbGljaz8uKHNoZWx0ZXIuaWQpKTtcbiAgICAgIG1hcmtlci5hZGRUbyh0aGlzLm1hcmtlcnMpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDZW50ZXJzIHRoZSBtYXAgb24gdGhlIHBvaW50LiBgem9vbWAgaXMgb3B0aW9uYWw6IHdoZW4gZ2l2ZW4sIGZseSBBTkRcbiAgICogem9vbSB0byB0aGF0IGxldmVsICh0aGUgc3RyZWV0LWxldmVsIHNoZWx0ZXIgdmlldywgU0hFTFRFUl9aT09NKTsgd2hlblxuICAgKiBvbWl0dGVkLCBrZWVwIHRoZSBjdXJyZW50IHpvb20gKHRoZSBjb3VudHJ5LWxldmVsIGJlaGF2aW91cikuXG4gICAqL1xuICBmbHlUbyhsYXRpdHVkZTogbnVtYmVyLCBsb25naXR1ZGU6IG51bWJlciwgem9vbT86IG51bWJlcik6IHZvaWQge1xuICAgIGlmICh6b29tID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubWFwPy5mbHlUbyhbbGF0aXR1ZGUsIGxvbmdpdHVkZV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm1hcD8uZmx5VG8oW2xhdGl0dWRlLCBsb25naXR1ZGVdLCB6b29tKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2hvd3MgT05FIHN0YXRpYyBzaGVsdGVyIGxvY2F0aW9uICh0aGUgL3NoZWx0ZXJzLzppZCBcIkxvY2F0aW9uXCIgbWFwKTpcbiAgICogYSBzaW5nbGUgbm9uLWludGVyYWN0aXZlIGRpdkljb24gcGluLCB0b25lZCBleGFjdGx5IGxpa2VcbiAgICogYHJlbmRlclNoZWx0ZXJzYCAocmVwb3J0ZWQgb3ZlcnJpZGUsIHRoZW4gdGhlIHRydXN0IHBhbGV0dGUpLiBOdWxsXG4gICAqIGNsZWFycyB0aGUgcGluLlxuICAgKiBJZGVtcG90ZW50OiB0aGUgbWFya2VycyBsYXllciBncm91cCBpcyBjbGVhcmVkIGZpcnN0LCBzbyByZS1jYWxscyAoZS5nLlxuICAgKiB0aGUgcmVmZXRjaCBhZnRlciBhIHJldmlldyB3cml0ZSkgcmVwbGFjZSB0aGUgcGluIGluc3RlYWQgb2YgZHVwbGljYXRpbmdcbiAgICogaXQuIERlbGliZXJhdGVseSBkb2VzIE5PVCB3aXJlIGBtYXJrZXJDbGlja2Agb3IgYHNldFBpY2tgIOKAlCB0aGUgZGV0YWlsXG4gICAqIHBhZ2UgaGFzIG5vIG1hcmtlciBuYXZpZ2F0aW9uIGFuZCBubyBsb2NhdGlvbiBwaWNraW5nLlxuICAgKlxuICAgKiAvbWFwIGFuZCAvc2hlbHRlcnMvOmlkIG5ldmVyIHNoYXJlIGFuIGluc3RhbmNlICh0aGUgc2VydmljZSBpc1xuICAgKiBwYWdlLXNjb3BlZCwgb25lIHBlciBwYWdlIHZpc2l0KSwgc28gYSBzdGF0aWMgcGluIGNhbiBuZXZlciBsZWFrIGludG9cbiAgICogdGhlIGJyb3dzZSBtYXAncyBtYXJrZXJzIOKAlCBubyBjcm9zcy1jb250YW1pbmF0aW9uIGd1YXJkIG5lZWRlZC5cbiAgICovXG4gIHNob3dTaGVsdGVyKFxuICAgIHNoZWx0ZXI6IHtcbiAgICAgIGxhdGl0dWRlOiBudW1iZXI7XG4gICAgICBsb25naXR1ZGU6IG51bWJlcjtcbiAgICAgIHNvdXJjZTogU2hlbHRlclNvdXJjZTtcbiAgICAgIHJldmlld1N0YXR1czogUmV2aWV3U3RhdHVzO1xuICAgICAgbm9uZXhpc3RlbnRSZXBvcnRzOiBudW1iZXI7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgfSB8IG51bGwsXG4gICk6IHZvaWQge1xuICAgIGlmICghdGhpcy5tYXAgfHwgIXRoaXMubWFya2Vycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLm1hcmtlcnMuY2xlYXJMYXllcnMoKTtcbiAgICBpZiAoc2hlbHRlciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBtYXJrZXIgPSBMLm1hcmtlcihbc2hlbHRlci5sYXRpdHVkZSwgc2hlbHRlci5sb25naXR1ZGVdLCB7XG4gICAgICBpY29uOiBMLmRpdkljb24oe1xuICAgICAgICBjbGFzc05hbWU6IGBzaGVsdGVyLW1hcmtlciBzaGVsdGVyLW1hcmtlci0tJHttYXJrZXJUb25lKHNoZWx0ZXIpfWAsXG4gICAgICAgIGljb25TaXplOiBbMTQsIDE0XSxcbiAgICAgIH0pLFxuICAgICAgLy8gaW50ZXJhY3RpdmU6IGZhbHNlIC0+IGxlYWZsZXQgYXR0YWNoZXMgTk8gY2xpY2sgaGFuZGxlciAoYW5kIG5vXG4gICAgICAvLyBkcmFnKTogYSBwdXJlIGxvY2F0aW9uIHBpbi4ga2V5Ym9hcmQ6IGZhbHNlIGtlZXBzIHRoZSBwaW4gb3V0IG9mXG4gICAgICAvLyB0aGUgdGFiIG9yZGVyIChsZWFmbGV0IHdvdWxkIG90aGVyd2lzZSBhZGQgdGFiSW5kZXgvcm9sZT1idXR0b24gdG9cbiAgICAgIC8vIGEgbWFya2VyIHRoYXQgZG9lcyBub3RoaW5nIG9uIGFjdGl2YXRpb24pLiBUaGUgdGl0bGUgYXR0cmlidXRlXG4gICAgICAvLyBzdGlsbCByZW5kZXJzIGFzIGEgbmF0aXZlIGJyb3dzZXIgdG9vbHRpcCAoc2V0IGluIF9pbml0SWNvbikuXG4gICAgICBpbnRlcmFjdGl2ZTogZmFsc2UsXG4gICAgICBrZXlib2FyZDogZmFsc2UsXG4gICAgICB0aXRsZTogc2hlbHRlci5uYW1lLFxuICAgIH0pO1xuICAgIG1hcmtlci5hZGRUbyh0aGlzLm1hcmtlcnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIERyb3BzIChvciBtb3ZlcykgdGhlIHNpbmdsZSBsb2NhdGlvbi1waWNrIG1hcmtlciAodGhlIC9zdWJtaXQgbWluaS1tYXApLlxuICAgKiBEcmFnZ2FibGU6IGEgZHJhZy1lbmQgcmVwb3J0cyB0aGUgbmV3IHBvaW50IHRocm91Z2ggYG1hcENsaWNrYCwgc28gdGhlXG4gICAqIHBhZ2UncyBzaWduYWxzIHN0YXkgdGhlIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGguIE51bGwgYXJncyByZW1vdmUgdGhlXG4gICAqIG1hcmtlci4gTm8tb3BzIGJlZm9yZSBjcmVhdGUgLyBhZnRlciBkZXN0cm95LlxuICAgKi9cbiAgc2V0UGljayhsYXRpdHVkZTogbnVtYmVyIHwgbnVsbCwgbG9uZ2l0dWRlOiBudW1iZXIgfCBudWxsKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLm1hcCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAobGF0aXR1ZGUgPT09IG51bGwgfHwgbG9uZ2l0dWRlID09PSBudWxsKSB7XG4gICAgICB0aGlzLnJlbW92ZVBpY2tNYXJrZXIoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMucGlja01hcmtlciA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5waWNrTWFya2VyID0gTC5tYXJrZXIoW2xhdGl0dWRlLCBsb25naXR1ZGVdLCB7XG4gICAgICAgIGljb246IEwuZGl2SWNvbih7XG4gICAgICAgICAgY2xhc3NOYW1lOiAnc2hlbHRlci1tYXJrZXIgc2hlbHRlci1tYXJrZXItLXBpY2snLFxuICAgICAgICAgIGljb25TaXplOiBbMTQsIDE0XSxcbiAgICAgICAgfSksXG4gICAgICAgIGRyYWdnYWJsZTogdHJ1ZSxcbiAgICAgICAgdGl0bGU6ICdTZWxlY3RlZCBsb2NhdGlvbicsXG4gICAgICB9KTtcbiAgICAgIHRoaXMucGlja01hcmtlci5vbignZHJhZ2VuZCcsICgpID0+IHtcbiAgICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnBpY2tNYXJrZXI/LmdldExhdExuZygpO1xuICAgICAgICBpZiAocG9pbnQpIHtcbiAgICAgICAgICB0aGlzLm1hcENsaWNrPy4ocG9pbnQubGF0LCBwb2ludC5sbmcpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHRoaXMucGlja01hcmtlci5hZGRUbyh0aGlzLm1hcCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGlja01hcmtlci5zZXRMYXRMbmcoW2xhdGl0dWRlLCBsb25naXR1ZGVdKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZVBpY2tNYXJrZXIoKTogdm9pZCB7XG4gICAgdGhpcy5waWNrTWFya2VyPy5yZW1vdmUoKTtcbiAgICB0aGlzLnBpY2tNYXJrZXIgPSBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIERyb3BzIChvciBtb3ZlcykgdGhlIHNpbmdsZSBCUk9XU0UgQU5DSE9SIHBpbiAobG9jYXRpb24tbmF2aWdhdGlvbixcbiAgICogL21hcCBhZGRyZXNzIHNlYXJjaCk6IHRoZSBPUklHSU4gdGhlIHBlci1yb3cgZGlzdGFuY2VzIGFyZSBtZWFzdXJlZFxuICAgKiBmcm9tLiBOT04tZHJhZ2dhYmxlIGFuZCBub24taW50ZXJhY3RpdmUg4oCUIHVubGlrZSB0aGUgL3N1Ym1pdCBwaWNrXG4gICAqIG1hcmtlciwgdGhlIGFuY2hvciBpcyBkZXJpdmVkIGZyb20gYSBnZW9jb2RlZCBhZGRyZXNzLCBub3QgZnJlZWhhbmQ6XG4gICAqIGRyYWdnaW5nIGl0IHdvdWxkIG1vdmUgdGhlIHJlZmVyZW5jZSBwb2ludCB0byBhIHBsYWNlIHdpdGggbm8gZGF0YVxuICAgKiBiZWhpbmQgaXQsIHNvIHRoZSBwaW4gaXMgZml4ZWQgYW5kIHRoZSBhbmNob3IgaXMgcmVtb3ZlZCBieSBpdHMgQ2xlYXJcbiAgICogYWN0aW9uIGluc3RlYWQuIERpc3RpbmN0IGZyb20gc2hlbHRlciBtYXJrZXJzIG9uIFNIQVBFLCBub3QgY29sb3VyXG4gICAqIGFsb25lOiBzaGVsdGVycyBhcmUgMTRweCBjaXJjbGVzLCB0aGUgb3JpZ2luIGlzIGEgc21hbGxlciAoMTJweClcbiAgICogZGlhbW9uZCAoYC5zaGVsdGVyLW1hcmtlci0tYW5jaG9yYCkgaW4gdGhlIHVzZXItcGlja2VkLXNwb3QgdGVhbFxuICAgKiAoYC0tY29sb3Itc2hlbHRlci1waWNrYCkg4oCUIHRoZSBtYXAgbGVnZW5kIGNhcnJpZXMgYSBtYXRjaGluZyBlbnRyeSwgYW5kXG4gICAqIHRoZSB0aXRsZSBhdHRyaWJ1dGUgaXMgaXRzIGFjY2Vzc2libGUgbmFtZS4gVGhlIHRpdGxlIGlzIGEgUkVRVUlSRURcbiAgICogY2FsbGVyIGFyZ3VtZW50OiB0aGUgc2VydmljZSBpcyBsb2NhbGUtYWdub3N0aWMgYW5kIHRoZSBsYWJlbCBpcyB0aGVcbiAgICogY2FsbGVyJ3MgbG9jYWxpemVkIGBtYXAuc2VhcmNoZWRgIGNvcHkgKE43IGkxOG4tY29tcGxldGVuZXNzIOKAlCB0aGVcbiAgICogaGFyZGNvZGVkIEVuZ2xpc2ggaXMgZ29uZSBmcm9tIHRoZSBzaGFyZWQgc2VydmljZSkuIE51bGwgYXJncyByZW1vdmVcbiAgICogdGhlIHBpbi4gTm8tb3BzIGJlZm9yZSBjcmVhdGUgLyBhZnRlciBkZXN0cm95OyBORVZFUiB0b3VjaGVzIHRoZVxuICAgKiBzaGVsdGVyIG1hcmtlcnMgbGF5ZXIgZ3JvdXAuXG4gICAqL1xuICBzZXRBbmNob3IobGF0aXR1ZGU6IG51bWJlciB8IG51bGwsIGxvbmdpdHVkZTogbnVtYmVyIHwgbnVsbCwgdGl0bGU6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy5tYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGxhdGl0dWRlID09PSBudWxsIHx8IGxvbmdpdHVkZSA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5yZW1vdmVBbmNob3JNYXJrZXIoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuYW5jaG9yTWFya2VyID09PSBudWxsKSB7XG4gICAgICB0aGlzLmFuY2hvck1hcmtlciA9IEwubWFya2VyKFtsYXRpdHVkZSwgbG9uZ2l0dWRlXSwge1xuICAgICAgICBpY29uOiBMLmRpdkljb24oe1xuICAgICAgICAgIGNsYXNzTmFtZTogJ3NoZWx0ZXItbWFya2VyIHNoZWx0ZXItbWFya2VyLS1hbmNob3InLFxuICAgICAgICAgIGljb25TaXplOiBbMTIsIDEyXSxcbiAgICAgICAgfSksXG4gICAgICAgIC8vIFRoZSBwaW4gaXMgYSBmaXhlZCByZWZlcmVuY2UgcG9pbnQ6IGludGVyYWN0aXZlOmZhbHNlIGF0dGFjaGVzXG4gICAgICAgIC8vIG5vIGNsaWNrIGhhbmRsZXIgKGEgY2xpY2sgbXVzdCBub3QgZmlnaHQgdGhlIHNoZWx0ZXIgbWFya2VycycpLFxuICAgICAgICAvLyBrZXlib2FyZDpmYWxzZSBrZWVwcyBpdCBvdXQgb2YgdGhlIHRhYiBvcmRlciwgYW5kIHRoZSB0aXRsZVxuICAgICAgICAvLyBhdHRyaWJ1dGUgc3RpbGwgcmVuZGVycyBhcyB0aGUgbmF0aXZlIGJyb3dzZXIgdG9vbHRpcC5cbiAgICAgICAgaW50ZXJhY3RpdmU6IGZhbHNlLFxuICAgICAgICBrZXlib2FyZDogZmFsc2UsXG4gICAgICAgIHRpdGxlLFxuICAgICAgfSk7XG4gICAgICB0aGlzLmFuY2hvck1hcmtlci5hZGRUbyh0aGlzLm1hcCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYW5jaG9yTWFya2VyLnNldExhdExuZyhbbGF0aXR1ZGUsIGxvbmdpdHVkZV0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlQW5jaG9yTWFya2VyKCk6IHZvaWQge1xuICAgIHRoaXMuYW5jaG9yTWFya2VyPy5yZW1vdmUoKTtcbiAgICB0aGlzLmFuY2hvck1hcmtlciA9IG51bGw7XG4gIH1cblxuICAvKiogUmVtb3ZlcyB0aGUgbWFwIGluc3RhbmNlIChwYW5lcywgdGlsZSArIG1hcmtlciBsYXllcnMsIGFsbCBsaXN0ZW5lcnMpLiAqL1xuICBkZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMucmVzaXplT2JzZXJ2ZXI/LmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLnJlc2l6ZU9ic2VydmVyID0gbnVsbDtcbiAgICB0aGlzLm1hcD8ucmVtb3ZlKCk7XG4gICAgdGhpcy5tYXAgPSBudWxsO1xuICAgIHRoaXMubWFya2VycyA9IG51bGw7XG4gICAgdGhpcy5waWNrTWFya2VyID0gbnVsbDtcbiAgICB0aGlzLmFuY2hvck1hcmtlciA9IG51bGw7XG4gICAgdGhpcy5tYXJrZXJDbGljayA9IG51bGw7XG4gICAgdGhpcy5tYXBDbGljayA9IG51bGw7XG4gIH1cbn1cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxTQUFTLGtCQUFrQjtBQUMzQixPQUFPLE9BQU87O0FBWVAsSUFBTSxpQkFBbUMsQ0FBQyxNQUFNLEVBQUk7QUFDcEQsSUFBTSxlQUFlO0FBUXJCLElBQU0sZUFBZTtBQTJDdEIsU0FBVSxXQUFXLFNBS3NDO0FBQy9ELE1BQUksUUFBUSxxQkFBcUIsR0FBRztB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SSxLQUFLLGVBQWUsTUFBTTtBQUM1QixXQUFLLGFBQWEsRUFBRSxPQUFPLENBQUMsVUFBVSxTQUFTLEdBQUc7UUFDaEQsTUFBTSxFQUFFLFFBQVE7VUFDZCxXQUFXO1VBQ1gsVUFBVSxDQUFDLElBQUksRUFBRTtTQUNsQjtRQUNELFdBQVc7UUFDWCxPQUFPO09BQ1I7QUFDRCxXQUFLLFdBQVcsR0FBRyxXQUFXLE1BQUs7QUFDakMsY0FBTSxRQUFRLEtBQUssWUFBWSxVQUFTO0FBQ3hDLFlBQUksT0FBTztBQUNULGVBQUssV0FBVyxNQUFNLEtBQUssTUFBTSxHQUFHO1FBQ3RDO01BQ0YsQ0FBQztBQUNELFdBQUssV0FBVyxNQUFNLEtBQUssR0FBRztJQUNoQyxPQUFPO0FBQ0wsV0FBSyxXQUFXLFVBQVUsQ0FBQyxVQUFVLFNBQVMsQ0FBQztJQUNqRDtFQUNGO0VBRVEsbUJBQXdCO0FBQzlCLFNBQUssWUFBWSxPQUFNO0FBQ3ZCLFNBQUssYUFBYTtFQUNwQjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQW9CQSxVQUFVLFVBQXlCLFdBQTBCLE9BQW9CO0FBQy9FLFFBQUksQ0FBQyxLQUFLLEtBQUs7QUFDYjtJQUNGO0FBQ0EsUUFBSSxhQUFhLFFBQVEsY0FBYyxNQUFNO0FBQzNDLFdBQUssbUJBQWtCO0FBQ3ZCO0lBQ0Y7QUFDQSxRQUFJLEtBQUssaUJBQWlCLE1BQU07QUFDOUIsV0FBSyxlQUFlLEVBQUUsT0FBTyxDQUFDLFVBQVUsU0FBUyxHQUFHO1FBQ2xELE1BQU0sRUFBRSxRQUFRO1VBQ2QsV0FBVztVQUNYLFVBQVUsQ0FBQyxJQUFJLEVBQUU7U0FDbEI7Ozs7O1FBS0QsYUFBYTtRQUNiLFVBQVU7UUFDVjtPQUNEO0FBQ0QsV0FBSyxhQUFhLE1BQU0sS0FBSyxHQUFHO0lBQ2xDLE9BQU87QUFDTCxXQUFLLGFBQWEsVUFBVSxDQUFDLFVBQVUsU0FBUyxDQUFDO0lBQ25EO0VBQ0Y7RUFFUSxxQkFBMEI7QUFDaEMsU0FBSyxjQUFjLE9BQU07QUFDekIsU0FBSyxlQUFlO0VBQ3RCOztFQUdBLFVBQWU7QUFDYixTQUFLLGdCQUFnQixXQUFVO0FBQy9CLFNBQUssaUJBQWlCO0FBQ3RCLFNBQUssS0FBSyxPQUFNO0FBQ2hCLFNBQUssTUFBTTtBQUNYLFNBQUssVUFBVTtBQUNmLFNBQUssYUFBYTtBQUNsQixTQUFLLGVBQWU7QUFDcEIsU0FBSyxjQUFjO0FBQ25CLFNBQUssV0FBVztFQUNsQjs7cUNBL1BXLGlCQUFjO0VBQUE7K0VBQWQsaUJBQWMsU0FBZCxnQkFBYyxVQUFBLENBQUE7OzsrRUFBZCxnQkFBYyxDQUFBO1VBRDFCOzs7IiwibmFtZXMiOltdLCJkZWJ1Z0lkIjoiOTVlM2JhMGItZmQxMi01OGJiLWE0YTItOGRiODhhOWE2YTQ5In0=