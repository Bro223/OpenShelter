import {
  LeafletService,
  ESTONIA_CENTER,
  ESTONIA_ZOOM,
  ESTONIA_BOUNDS,
  inEstonia,
} from './leaflet-service';
import type { ShelterDto } from '../../core/models';

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
    ...overrides,
  };
}

const TALLINN = shelter({ id: 1, name: 'Tallinn Central Shelter' });
const PERNU = shelter({ id: 2, name: 'Pärnu Municipal Shelter', source: 'MUNICIPALITY' });
const BASEMENT = shelter({
  id: 7,
  name: 'Community Cellar',
  address: null,
  source: 'USER',
  averageRating: null,
  reviewCount: 0,
  description: 'Neighbourhood basement',
  capacity: 12,
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

  it('renders one divIcon per row — REGISTRY rows (both kinds) blue, USER green', () => {
    service.renderShelters([TALLINN, PERNU, BASEMENT]);

    const markers = renderedMarkers(container);
    expect(markers).toHaveLength(3);
    expect(markers.filter((m) => m.classList.contains('shelter-marker--registry')).length).toBe(2);
    expect(markers.filter((m) => m.classList.contains('shelter-marker--user')).length).toBe(1);
    // Each pin keeps the leaflet positioning class alongside the marker class.
    expect(markers.every((m) => m.classList.contains('leaflet-marker-icon'))).toBe(true);
  });

  it('renderShelters replaces markers — re-rendering never duplicates', () => {
    service.renderShelters([TALLINN, PERNU, BASEMENT]);
    service.renderShelters([BASEMENT]);

    const markers = renderedMarkers(container);
    expect(markers).toHaveLength(1);
    expect(markers[0].classList.contains('shelter-marker--user')).toBe(true);
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
    expect(() => uncreated.renderShelters([TALLINN])).not.toThrow();
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
