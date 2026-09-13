import L from 'leaflet';
import {
  LeafletService,
  ESTONIA_CENTER,
  ESTONIA_ZOOM,
  SHELTER_ZOOM,
  ESTONIA_BOUNDS,
  inEstonia,
} from './leaflet-service';
import type { ShelterDto } from '../core/models';

function shelter(overrides: Partial<ShelterDto> & Pick<ShelterDto, 'id' | 'name'>): ShelterDto {
  return {
    address: 'Tornimäe 1, Tallinn',
    latitude: 59.437,
    longitude: 24.754,
    status: 'ACTIVE',
    source: 'PAASETEAMET',
    averageRating: 4.5,
    reviewCount: 2,
    createdAt: '2025-09-01T08:00:00Z',
    description: null,
    capacity: null,
    submitterVerified: false,
    nonexistentReports: 0,
    reportCount: 0, // M8 total (all report types)
    statusFlag: null,
    occupancy: null,
    reviewStatus: 'CONFIRMED', // registry backfill; USER fixtures override
    locationKind: 'PUBLIC',
    provenance: 'OFFICIAL', // default follows the PAASETEAMET default row
    lastVerifiedAt: null, // M8 — null = never verified
    inaccurate: false, // M10 slice 4 — no moderator mark on this row
    ...overrides,
  };
}

const TALLINN = shelter({ id: 1, name: 'Tallinn Central Shelter' });
const PERNU = shelter({
  id: 2,
  name: 'Pärnu Municipal Shelter',
  source: 'MUNICIPALITY',
  provenance: 'PARTNER_VERIFIED',
});
const BASEMENT = shelter({
  id: 7,
  name: 'Community Cellar',
  address: null,
  source: 'USER',
  averageRating: null,
  reviewCount: 0,
  description: 'Neighbourhood basement',
  capacity: 12,
  reviewStatus: 'NEW', // D3: existing USER rows backfill NEW (amber)
  provenance: 'UNDER_REVIEW',
});
const CONFIRMED_BASEMENT = shelter({
  ...BASEMENT,
  id: 8,
  name: 'Checked Cellar',
  reviewStatus: 'CONFIRMED',
  provenance: 'COMMUNITY_REPORTED',
});

/** divIcon markers leaflet creates in the container's overlay pane. */
function renderedMarkers(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('.shelter-marker')];
}

function clickMarker(container: HTMLElement, name: string): void {
  const marker = renderedMarkers(container).find((el) => el.title === name);
  if (!marker) {
    throw new Error(`Marker for ${name} not found`);
  }
  marker.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('inEstonia (client-side bbox pre-check)', () => {
  it('accepts points inside the box and rejects the edges outside', () => {
    expect(inEstonia(ESTONIA_CENTER[0], ESTONIA_CENTER[1])).toBe(true);
    // Boundary values are inclusive (the backend's GeoPoint.inEstonia is too).
    expect(inEstonia(ESTONIA_BOUNDS.minLat, ESTONIA_BOUNDS.minLng)).toBe(true);
    expect(inEstonia(ESTONIA_BOUNDS.maxLat, ESTONIA_BOUNDS.maxLng)).toBe(true);
    expect(inEstonia(ESTONIA_BOUNDS.minLat - 0.01, ESTONIA_CENTER[1])).toBe(false);
    expect(inEstonia(ESTONIA_BOUNDS.maxLat + 0.01, ESTONIA_CENTER[1])).toBe(false);
    expect(inEstonia(ESTONIA_CENTER[0], ESTONIA_BOUNDS.minLng - 0.01)).toBe(false);
    expect(inEstonia(ESTONIA_CENTER[0], ESTONIA_BOUNDS.maxLng + 0.01)).toBe(false);
    // The open sea west of Saaremaa is outside.
    expect(inEstonia(58.6, 20.0)).toBe(false);
    // Non-finite garbage is rejected (bad numeric input).
    expect(inEstonia(Number.NaN, 25)).toBe(false);
  });
});

describe('LeafletService', () => {
  let container: HTMLElement;
  let service: LeafletService;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    service = new LeafletService();
    service.create(container);
  });

  afterEach(() => {
    service.destroy();
    container.remove();
  });

  it('create builds a map on the container at the Estonia defaults', () => {
    expect(container.classList.contains('leaflet-container')).toBe(true);
    expect(container.querySelector('.leaflet-tile-pane')).not.toBeNull();
    expect(container.querySelector('.leaflet-control-attribution')).not.toBeNull();
    // The OSM tile layer must be wired in (no API key URL).
    expect(container.querySelector('img[src*="tile.openstreetmap.org"]') !== null).toBe(true);
  });

  it('renders one divIcon per row — the provenance palette (M6)', () => {
    service.renderShelters([TALLINN, PERNU, BASEMENT, CONFIRMED_BASEMENT]);

    const markers = renderedMarkers(container);
    expect(markers).toHaveLength(4);
    // OFFICIAL blue (the registry-family pin) + PARTNER_VERIFIED yellow.
    expect(markers.filter((m) => m.classList.contains('shelter-marker--registry')).length).toBe(1);
    expect(markers.filter((m) => m.classList.contains('shelter-marker--partner')).length).toBe(1);
    // Community tones (community-review-queue D5): NEW = amber, CONFIRMED =
    // green. No reported state on the plain fixtures.
    expect(markers.filter((m) => m.classList.contains('shelter-marker--new')).length).toBe(1);
    expect(markers.filter((m) => m.classList.contains('shelter-marker--user')).length).toBe(1);
    expect(markers.filter((m) => m.classList.contains('shelter-marker--reported')).length).toBe(0);
    // Each pin keeps the leaflet positioning class alongside the marker class.
    expect(markers.every((m) => m.classList.contains('leaflet-marker-icon'))).toBe(true);
  });

  it('the hidden provenance tones: reported-inactive grey, rejected red (M6)', () => {
    const reportedInactive = shelter({
      id: 20,
      name: 'Reported Away Row',
      source: 'USER',
      status: 'INACTIVE',
      provenance: 'REPORTED_INACTIVE',
    });
    const rejected = shelter({
      id: 21,
      name: 'Rejected Row',
      source: 'USER',
      status: 'INACTIVE',
      reviewStatus: 'REJECTED',
      provenance: 'REJECTED',
    });
    service.showShelter({
      latitude: reportedInactive.latitude,
      longitude: reportedInactive.longitude,
      provenance: reportedInactive.provenance,
      nonexistentReports: 5,
      name: reportedInactive.name,
    });
    let markers = renderedMarkers(container);
    expect(markers[0].classList.contains('shelter-marker--inactive')).toBe(true);

    service.showShelter({
      latitude: rejected.latitude,
      longitude: rejected.longitude,
      provenance: rejected.provenance,
      nonexistentReports: 0,
      name: rejected.name,
    });
    markers = renderedMarkers(container);
    expect(markers[0].classList.contains('shelter-marker--rejected')).toBe(true);
  });

  it('community marker tone: NEW amber, CONFIRMED green (D5)', () => {
    service.renderShelters([BASEMENT, CONFIRMED_BASEMENT]);

    const markers = renderedMarkers(container);
    expect(
      markers
        .find((m) => m.title === 'Community Cellar')
        ?.classList.contains('shelter-marker--new'),
    ).toBe(true);
    expect(
      markers.find((m) => m.title === 'Checked Cellar')?.classList.contains('shelter-marker--user'),
    ).toBe(true);
  });

  it('the reported override beats the provenance tone (a reported NEW row is orange, not amber)', () => {
    const reportedNew = shelter({
      id: 9,
      name: 'Reported New Row',
      source: 'USER',
      reviewStatus: 'NEW',
      provenance: 'UNDER_REVIEW',
      nonexistentReports: 1,
    });
    service.renderShelters([reportedNew]);

    const markers = renderedMarkers(container);
    expect(markers[0].classList.contains('shelter-marker--reported')).toBe(true);
    expect(markers[0].classList.contains('shelter-marker--new')).toBe(false);
  });

  it('a reported shelter (nonexistentReports > 0) renders the orange marker regardless of provenance (D1)', () => {
    const reportedRegistry = shelter({
      id: 3,
      name: 'Reported Registry Row',
      nonexistentReports: 1,
    });
    const reportedUser = shelter({
      id: 4,
      name: 'Reported User Row',
      source: 'USER',
      provenance: 'COMMUNITY_REPORTED',
      nonexistentReports: 5,
    });
    service.renderShelters([reportedRegistry, reportedUser, TALLINN, BASEMENT]);

    const markers = renderedMarkers(container);
    expect(markers).toHaveLength(4);
    // Both reported rows are orange — the single "reported" affordance…
    expect(markers.filter((m) => m.classList.contains('shelter-marker--reported'))).toHaveLength(2);
    // …and the provenance tones apply ONLY to the unreported rows.
    expect(markers.filter((m) => m.classList.contains('shelter-marker--registry'))).toHaveLength(1); // TALLINN only
    expect(markers.filter((m) => m.classList.contains('shelter-marker--new'))).toHaveLength(1); // BASEMENT (NEW) only
    expect(markers.filter((m) => m.classList.contains('shelter-marker--user'))).toHaveLength(0);
    // Clicks still resolve to the shelter id on reported markers.
    const onMarkerClick = vi.fn();
    service.markerClick = onMarkerClick;
    clickMarker(container, 'Reported User Row');
    expect(onMarkerClick).toHaveBeenCalledWith(4);
  });

  it('one non-existence report is enough for the orange state (the threshold for auto-hide is 5, server-side)', () => {
    const flagged = shelter({ id: 5, name: 'Flagged Row', nonexistentReports: 1 });
    service.renderShelters([flagged]);

    const markers = renderedMarkers(container);
    expect(markers[0].classList.contains('shelter-marker--reported')).toBe(true);
    expect(markers[0].classList.contains('shelter-marker--registry')).toBe(false);
  });

  it('renderShelters replaces markers — re-rendering never duplicates', () => {
    service.renderShelters([TALLINN, PERNU, BASEMENT]);
    service.renderShelters([BASEMENT]);

    const markers = renderedMarkers(container);
    expect(markers).toHaveLength(1);
    // BASEMENT is a NEW community row — the amber marker class.
    expect(markers[0].classList.contains('shelter-marker--new')).toBe(true);
  });

  it('a marker click invokes the markerClick callback with the shelter id', () => {
    const onMarkerClick = vi.fn();
    service.markerClick = onMarkerClick;
    service.renderShelters([TALLINN, BASEMENT]);

    clickMarker(container, 'Community Cellar');

    expect(onMarkerClick).toHaveBeenCalledTimes(1);
    expect(onMarkerClick).toHaveBeenCalledWith(7);
  });

  it('markerClick is a no-op when the page has not wired a callback', () => {
    service.renderShelters([TALLINN]);

    expect(() => clickMarker(container, 'Tallinn Central Shelter')).not.toThrow();
  });

  it('flyTo does not throw before create (null map guard)', () => {
    const uncreated = new LeafletService();

    expect(() => uncreated.flyTo(ESTONIA_CENTER[0], ESTONIA_CENTER[1])).not.toThrow();
    expect(() => uncreated.flyTo(ESTONIA_CENTER[0], ESTONIA_CENTER[1], SHELTER_ZOOM)).not.toThrow();
    expect(() => uncreated.renderShelters([TALLINN])).not.toThrow();
  });

  it('flyTo keeps the current zoom without a zoom arg, flies at the given zoom with one', () => {
    // Spy on the leaflet prototype: the service must pass the zoom through
    // ONLY when the caller gave one (M4 country-level flies keep their zoom).
    const flyToSpy = vi
      .spyOn(L.Map.prototype, 'flyTo')
      .mockImplementation(() => undefined as unknown as L.Map);

    service.flyTo(59.437, 24.754);
    expect(flyToSpy).toHaveBeenLastCalledWith([59.437, 24.754]);

    service.flyTo(59.437, 24.754, SHELTER_ZOOM);
    expect(flyToSpy).toHaveBeenLastCalledWith([59.437, 24.754], SHELTER_ZOOM);

    flyToSpy.mockRestore();
  });

  it('showShelter pins ONE static marker (provenance-toned), replaces on re-call, clears on null', () => {
    service.showShelter({
      latitude: TALLINN.latitude,
      longitude: TALLINN.longitude,
      provenance: TALLINN.provenance,
      nonexistentReports: 0,
      name: TALLINN.name,
    });
    let markers = renderedMarkers(container);
    expect(markers).toHaveLength(1);
    expect(markers[0].classList.contains('shelter-marker--registry')).toBe(true);
    // The name tooltip survives (set in leaflet's _initIcon, independent of
    // interactivity).
    expect(markers[0].title).toBe(TALLINN.name);

    // A NEW community row pins AMBER (the same tone as the browse map).
    service.showShelter({
      latitude: BASEMENT.latitude,
      longitude: BASEMENT.longitude,
      provenance: BASEMENT.provenance,
      nonexistentReports: 0,
      name: BASEMENT.name,
    });
    markers = renderedMarkers(container);
    expect(markers).toHaveLength(1);
    expect(markers[0].classList.contains('shelter-marker--new')).toBe(true);

    // Null clears the pin.
    service.showShelter(null);
    expect(renderedMarkers(container)).toHaveLength(0);
  });

  it('a showShelter marker is static — clicking it never fires markerClick', () => {
    const onMarkerClick = vi.fn();
    service.markerClick = onMarkerClick;
    service.showShelter({
      latitude: TALLINN.latitude,
      longitude: TALLINN.longitude,
      provenance: TALLINN.provenance,
      nonexistentReports: 0,
      name: TALLINN.name,
    });

    const marker = renderedMarkers(container)[0];
    marker.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onMarkerClick).not.toHaveBeenCalled();
  });

  it('showShelter is a safe no-op before create (null map guard)', () => {
    const uncreated = new LeafletService();
    expect(() =>
      uncreated.showShelter({
        latitude: 59.437,
        longitude: 24.754,
        provenance: 'UNDER_REVIEW',
        nonexistentReports: 0,
        name: 'Community Cellar',
      }),
    ).not.toThrow();
    expect(() => uncreated.showShelter(null)).not.toThrow();
  });

  it('create is a null-container guard and a once-per-visit guard', () => {
    expect(() => service.create(null)).not.toThrow();
    expect(() => service.create(document.createElement('div'))).not.toThrow();
    // Still exactly one map instance (the second create was a no-op).
    expect(container.classList.contains('leaflet-container')).toBe(true);
    expect(container.querySelectorAll('.leaflet-map-pane')).toHaveLength(1);
  });

  it('a map-surface click invokes the mapClick callback with [lat, lng] (M5 mini-map)', () => {
    const onMapClick = vi.fn();
    service.mapClick = onMapClick;

    // Click the map pane (leaflet translates the DOM click into a latlng).
    const pane = container.querySelector('.leaflet-map-pane') as HTMLElement;
    pane.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }));

    expect(onMapClick).toHaveBeenCalledTimes(1);
    const [lat, lng] = onMapClick.mock.calls[0] as unknown as [number, number];
    expect(Number.isFinite(lat)).toBe(true);
    expect(Number.isFinite(lng)).toBe(true);
  });

  it('setPick drops a single pick marker, re-centers it on update, removes on null', () => {
    service.setPick(58.8, 25.0);
    const pick = () => container.querySelectorAll<HTMLElement>('.shelter-marker--pick');
    expect(pick()).toHaveLength(1);
    expect(pick()[0].classList.contains('leaflet-marker-icon')).toBe(true);

    // Moving the pick never duplicates the marker.
    service.setPick(59.1, 26.1);
    expect(pick()).toHaveLength(1);

    // null args remove it.
    service.setPick(null, null);
    expect(pick()).toHaveLength(0);
  });

  it('setPick is a safe no-op before create (null map guard)', () => {
    const uncreated = new LeafletService();
    expect(() => uncreated.setPick(58.8, 25.0)).not.toThrow();
    expect(() => uncreated.setPick(null, null)).not.toThrow();
  });

  it('destroy removes the map; a later visit gets a fresh map without stale markers', () => {
    service.renderShelters([TALLINN, PERNU, BASEMENT]);
    expect(renderedMarkers(container)).toHaveLength(3);

    service.destroy();

    // The map pane (and every pane, tile + marker layer inside it) is removed
    // from the host div — leaflet deliberately keeps the 'leaflet-container'
    // class on the (reusable) host element, so we assert the panes are gone.
    expect(container.querySelector('.leaflet-map-pane')).toBeNull();
    expect(container.querySelector('.leaflet-marker-icon')).toBeNull();
    expect(container.querySelector('.leaflet-tile')).toBeNull();
    // renderShelters/flyTo after destroy are safe no-ops…
    expect(() => service.renderShelters([TALLINN])).not.toThrow();
    expect(() => service.flyTo(ESTONIA_CENTER[0], ESTONIA_ZOOM)).not.toThrow();
    expect(renderedMarkers(container)).toHaveLength(0);
    // …and a second visit recreates a clean map.
    service.create(container);
    service.renderShelters([BASEMENT]);
    expect(renderedMarkers(container)).toHaveLength(1);
  });
});
