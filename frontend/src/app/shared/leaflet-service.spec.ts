import L from 'leaflet';
import {
  LeafletService,
  markerTone,
  ESTONIA_CENTER,
  ESTONIA_ZOOM,
  SHELTER_ZOOM,
  ESTONIA_BOUNDS,
  inEstonia,
} from './leaflet-service';
import type { ShelterDto } from '../core/models';
import { EN } from '../core/i18n/en';

function shelter(overrides: Partial<ShelterDto> & Pick<ShelterDto, 'id' | 'name'>): ShelterDto {
  return {
    address: 'Tornimäe 1, Tallinn',
    latitude: 59.437,
    longitude: 24.754,
    status: 'ACTIVE',
    source: 'PAASETEAMET',
    createdAt: '2025-09-01T08:00:00Z',
    description: null,
    capacity: null,
    submitterVerified: false,
    nonexistentReports: 0,
    reportCount: 0, // total (all report types)
    openStatus: null,
    occupancy: null,
    reviewStatus: 'CONFIRMED', // registry backfill; USER fixtures override
    locationKind: 'PUBLIC',
    lastVerifiedAt: null, // null = never verified
    inaccurate: false, // no moderator mark on this row
    ...overrides,
  };
}

const TALLINN = shelter({ id: 1, name: 'Tallinn Central Shelter' });
const PERNU = shelter({
  id: 2,
  name: 'Pärnu Municipal Shelter',
  source: 'MUNICIPALITY',
});
const BASEMENT = shelter({
  id: 7,
  name: 'Community Cellar',
  address: null,
  source: 'USER',
  description: 'Neighbourhood basement',
  capacity: 12,
  reviewStatus: 'NEW', // D3: USER rows backfill NEW (badge only — the pin carries depth, not recency)
});
const CONFIRMED_BASEMENT = shelter({
  ...BASEMENT,
  id: 8,
  name: 'Checked Cellar',
  reviewStatus: 'CONFIRMED',
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

  it('renders one divIcon per row — the trust palette (D5)', () => {
    service.renderShelters([TALLINN, PERNU, BASEMENT, CONFIRMED_BASEMENT]);

    const markers = renderedMarkers(container);
    expect(markers).toHaveLength(4);
    // Both registry rows (PAASETEAMET + MUNICIPALITY) get the blue
    // registry-family pin.
    expect(markers.filter((m) => m.classList.contains('shelter-marker--registry')).length).toBe(2);
    // Community tone (owner decision: the pin carries verification depth,
    // not recency — there is no NEW pin tone): both no-depth community
    // rows (BASEMENT NEW, CONFIRMED_BASEMENT) keep the community tone. No
    // reported state on the plain fixtures.
    expect(markers.filter((m) => m.classList.contains('shelter-marker--user')).length).toBe(2);
    expect(markers.filter((m) => m.classList.contains('shelter-marker--reported')).length).toBe(0);
    // No retired partner/proposed marker class leaks in.
    expect(markers.filter((m) => m.classList.contains('shelter-marker--partner')).length).toBe(0);
    // Each pin keeps the leaflet positioning class alongside the marker class.
    expect(markers.every((m) => m.classList.contains('leaflet-marker-icon'))).toBe(true);
  });

  it('community markers carry the submitter verification depth as SHAPE (owner decision)', () => {
    // One confirmed channel -> the triangle; two or more -> the circle. Both in
    // the verified family, so the depth never rides on colour alone. The
    // channel itself does not change the shape (EMAIL and PHONE are both
    // exactly one).
    const emailOnly = shelter({
      id: 21,
      name: 'Email-only Cellar',
      source: 'USER',
      submitterVerification: 'EMAIL',
    });
    const phoneOnly = shelter({
      id: 22,
      name: 'Phone-only Cellar',
      source: 'USER',
      submitterVerification: 'PHONE',
    });
    const full = shelter({
      id: 23,
      name: 'Fully Verified Cellar',
      source: 'USER',
      submitterVerification: 'FULL',
    });
    const legacyNoDepth = shelter({
      id: 24,
      name: 'Older API Cellar',
      source: 'USER',
      reviewStatus: 'NEW',
    });

    service.renderShelters([emailOnly, phoneOnly, full, legacyNoDepth]);

    const markers = renderedMarkers(container);
    expect(markers.filter((m) => m.classList.contains('shelter-marker--partial')).length).toBe(2);
    expect(markers.filter((m) => m.classList.contains('shelter-marker--full')).length).toBe(1);
    // A row whose depth the backend does not report keeps the community
    // tone: graceful degradation, and the reason an older API keeps
    // working (the pin has no recency tone — the "Newly added" badge
    // carries NEW, not the marker).
    expect(markers.filter((m) => m.classList.contains('shelter-marker--user')).length).toBe(1);
    expect(markers.filter((m) => m.classList.contains('shelter-marker--new')).length).toBe(0);

    // Reported still wins over the verification shape (the safety affordance).
    service.renderShelters([
      shelter({
        id: 25,
        name: 'Reported Cellar',
        source: 'USER',
        submitterVerification: 'FULL',
        nonexistentReports: 3,
      }),
    ]);
    const reportedMarkers = renderedMarkers(container);
    expect(
      reportedMarkers.filter((m) => m.classList.contains('shelter-marker--reported')).length,
    ).toBe(1);
    expect(reportedMarkers.filter((m) => m.classList.contains('shelter-marker--full')).length).toBe(
      0,
    );
  });

  it('a hidden or rejected USER row never renders a marker (there is no recency tone in the vocabulary)', () => {
    const reportedAway = shelter({
      id: 20,
      name: 'Reported Away Row',
      source: 'USER',
      status: 'INACTIVE',
    });
    const rejected = shelter({
      id: 21,
      name: 'Rejected Row',
      source: 'USER',
      status: 'INACTIVE',
      reviewStatus: 'REJECTED',
    });
    service.showShelter({
      latitude: reportedAway.latitude,
      longitude: reportedAway.longitude,
      source: reportedAway.source,
      reviewStatus: reportedAway.reviewStatus,
      nonexistentReports: 5,
      name: reportedAway.name,
    });
    let markers = renderedMarkers(container);
    // nonexistentReports > 0 wins — the reported-away row is orange.
    expect(markers[0].classList.contains('shelter-marker--reported')).toBe(true);

    service.showShelter({
      latitude: rejected.latitude,
      longitude: rejected.longitude,
      source: rejected.source,
      reviewStatus: rejected.reviewStatus,
      nonexistentReports: 0,
      name: rejected.name,
    });
    markers = renderedMarkers(container);
    expect(markers[0].classList.contains('shelter-marker--user')).toBe(true);
  });

  it('the pin carries verification depth, not recency: a freshly-added row at EVERY verification depth renders its depth tone, never a NEW tone (owner decision)', () => {
    // The regression the owner reported: recency outranked verification
    // depth, so fresh community pins read as one unverified tone. The pin
    // now expresses depth ONLY — a freshly-added row with one confirmed
    // channel is the partial shape, two+ is the full shape, and a fresh
    // no-depth row keeps the community tone alongside CONFIRMED rows
    // (the "Newly added" badge, not the pin, says NEW). Every depth the
    // model carries is rendered here, so a re-introduced recency tone
    // cannot hide in a depth nobody renders.
    const freshEmail = shelter({
      id: 42,
      name: 'Fresh Email',
      source: 'USER',
      reviewStatus: 'NEW',
      submitterVerification: 'EMAIL',
    });
    const freshSmartId = shelter({
      id: 43,
      name: 'Fresh Smart-ID',
      source: 'USER',
      reviewStatus: 'NEW',
      submitterVerification: 'SMART_ID',
    });
    const freshPartial = shelter({
      id: 40,
      name: 'Fresh Partial',
      source: 'USER',
      reviewStatus: 'NEW',
      submitterVerification: 'PHONE',
    });
    const freshFull = shelter({
      id: 41,
      name: 'Fresh Full',
      source: 'USER',
      reviewStatus: 'NEW',
      submitterVerification: 'FULL',
    });
    service.renderShelters([
      freshEmail,
      freshSmartId,
      freshPartial,
      freshFull,
      BASEMENT,
      CONFIRMED_BASEMENT,
    ]);

    const markers = renderedMarkers(container);
    // One confirmed channel -> the partial shape, whatever the channel is.
    expect(
      markers.find((m) => m.title === 'Fresh Email')?.classList.contains('shelter-marker--partial'),
    ).toBe(true);
    expect(
      markers
        .find((m) => m.title === 'Fresh Smart-ID')
        ?.classList.contains('shelter-marker--partial'),
    ).toBe(true);
    expect(
      markers
        .find((m) => m.title === 'Fresh Partial')
        ?.classList.contains('shelter-marker--partial'),
    ).toBe(true);
    // Two or more channels -> the full shape.
    expect(
      markers.find((m) => m.title === 'Fresh Full')?.classList.contains('shelter-marker--full'),
    ).toBe(true);
    // No recency tone anywhere: the fresh no-depth row and the CONFIRMED
    // row share the community tone.
    expect(
      markers
        .find((m) => m.title === 'Community Cellar')
        ?.classList.contains('shelter-marker--user'),
    ).toBe(true);
    expect(
      markers.find((m) => m.title === 'Checked Cellar')?.classList.contains('shelter-marker--user'),
    ).toBe(true);
    expect(markers.filter((m) => m.classList.contains('shelter-marker--new'))).toHaveLength(0);
  });

  it('the reported override beats the trust tone (a reported NEW row is orange, not the community tone)', () => {
    const reportedNew = shelter({
      id: 9,
      name: 'Reported New Row',
      source: 'USER',
      reviewStatus: 'NEW',
      nonexistentReports: 1,
    });
    service.renderShelters([reportedNew]);

    const markers = renderedMarkers(container);
    expect(markers[0].classList.contains('shelter-marker--reported')).toBe(true);
    expect(markers[0].classList.contains('shelter-marker--new')).toBe(false);
  });

  it('a reported shelter (nonexistentReports > 0) renders the orange marker regardless of trust colour (D1)', () => {
    const reportedRegistry = shelter({
      id: 3,
      name: 'Reported Registry Row',
      nonexistentReports: 1,
    });
    const reportedUser = shelter({
      id: 4,
      name: 'Reported User Row',
      source: 'USER',
      nonexistentReports: 5,
    });
    service.renderShelters([reportedRegistry, reportedUser, TALLINN, BASEMENT]);

    const markers = renderedMarkers(container);
    expect(markers).toHaveLength(4);
    // Both reported rows are orange — the single "reported" affordance…
    expect(markers.filter((m) => m.classList.contains('shelter-marker--reported'))).toHaveLength(2);
    // …and the trust tones apply ONLY to the unreported rows.
    expect(markers.filter((m) => m.classList.contains('shelter-marker--registry'))).toHaveLength(1); // TALLINN only
    expect(markers.filter((m) => m.classList.contains('shelter-marker--user'))).toHaveLength(1); // BASEMENT (community, no depth)
    expect(markers.filter((m) => m.classList.contains('shelter-marker--new'))).toHaveLength(0);
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

  it('an open inaccurate-information report turns the pin reported (W2-B: the OR of the two kinds)', () => {
    const inaccurateRegistry = shelter({
      id: 30,
      name: 'Inaccurate Registry Row',
      nonexistentReports: 0,
      inaccurateReports: 2,
    });
    const inaccurateNew = shelter({
      id: 31,
      name: 'Inaccurate New Row',
      source: 'USER',
      reviewStatus: 'NEW',
      nonexistentReports: 0,
      inaccurateReports: 1,
    });
    service.renderShelters([inaccurateRegistry, inaccurateNew, TALLINN]);

    const markers = renderedMarkers(container);
    expect(markers).toHaveLength(3);
    // EITHER kind is enough: both inaccurate-only rows are orange…
    expect(markers.filter((m) => m.classList.contains('shelter-marker--reported')).length).toBe(2);
    // …and the trust tones apply ONLY to the row with no open report.
    expect(markers.filter((m) => m.classList.contains('shelter-marker--registry')).length).toBe(1); // TALLINN only
    expect(markers.filter((m) => m.classList.contains('shelter-marker--new')).length).toBe(0);
  });

  it('inaccurate reports still beat the verification SHAPE (the safety affordance, W2-B)', () => {
    const inaccurateFull = shelter({
      id: 32,
      name: 'Inaccurate Full Cellar',
      source: 'USER',
      submitterVerification: 'FULL',
      nonexistentReports: 0,
      inaccurateReports: 3,
    });
    service.renderShelters([inaccurateFull]);

    const markers = renderedMarkers(container);
    expect(markers[0].classList.contains('shelter-marker--reported')).toBe(true);
    expect(markers[0].classList.contains('shelter-marker--full')).toBe(false);
  });

  it('zero reports of BOTH kinds keeps the trust tone (the OR flags only open reports)', () => {
    const clean = shelter({
      id: 33,
      name: 'Clean Row',
      nonexistentReports: 0,
      inaccurateReports: 0,
    });
    service.renderShelters([clean]);

    const markers = renderedMarkers(container);
    expect(markers[0].classList.contains('shelter-marker--reported')).toBe(false);
    expect(markers[0].classList.contains('shelter-marker--registry')).toBe(true);
  });

  it('renderShelters replaces markers — re-rendering never duplicates', () => {
    service.renderShelters([TALLINN, PERNU, BASEMENT]);
    service.renderShelters([BASEMENT]);

    const markers = renderedMarkers(container);
    expect(markers).toHaveLength(1);
    // BASEMENT is a NEW community row — the community tone (the pin
    // carries depth, not recency).
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
    expect(() => uncreated.flyTo(ESTONIA_CENTER[0], ESTONIA_CENTER[1], SHELTER_ZOOM)).not.toThrow();
    expect(() => uncreated.renderShelters([TALLINN])).not.toThrow();
  });

  it('flyTo keeps the current zoom without a zoom arg, flies at the given zoom with one', () => {
    // Spy on the leaflet prototype: the service must pass the zoom through
    // ONLY when the caller gave one (a country-level fly keeps its zoom).
    const flyToSpy = vi
      .spyOn(L.Map.prototype, 'flyTo')
      .mockImplementation(() => undefined as unknown as L.Map);

    service.flyTo(59.437, 24.754);
    expect(flyToSpy).toHaveBeenLastCalledWith([59.437, 24.754]);

    service.flyTo(59.437, 24.754, SHELTER_ZOOM);
    expect(flyToSpy).toHaveBeenLastCalledWith([59.437, 24.754], SHELTER_ZOOM);

    flyToSpy.mockRestore();
  });

  it('showShelter pins ONE static marker (trust-toned), replaces on re-call, clears on null', () => {
    service.showShelter({
      latitude: TALLINN.latitude,
      longitude: TALLINN.longitude,
      source: TALLINN.source,
      reviewStatus: TALLINN.reviewStatus,
      nonexistentReports: 0,
      name: TALLINN.name,
    });
    let markers = renderedMarkers(container);
    expect(markers).toHaveLength(1);
    expect(markers[0].classList.contains('shelter-marker--registry')).toBe(true);
    // The name tooltip survives (set in leaflet's _initIcon, independent of
    // interactivity).
    expect(markers[0].title).toBe(TALLINN.name);

    // A NEW community row pins the community tone (the same tones as the
    // browse map — the pin carries depth, not recency).
    service.showShelter({
      latitude: BASEMENT.latitude,
      longitude: BASEMENT.longitude,
      source: BASEMENT.source,
      reviewStatus: BASEMENT.reviewStatus,
      nonexistentReports: 0,
      name: BASEMENT.name,
    });
    markers = renderedMarkers(container);
    expect(markers).toHaveLength(1);
    expect(markers[0].classList.contains('shelter-marker--user')).toBe(true);

    // Null clears the pin.
    service.showShelter(null);
    expect(renderedMarkers(container)).toHaveLength(0);
  });

  it('showShelter: an inaccurate-reported detail row pins reported (W2-B)', () => {
    service.showShelter({
      latitude: TALLINN.latitude,
      longitude: TALLINN.longitude,
      source: TALLINN.source,
      reviewStatus: TALLINN.reviewStatus,
      nonexistentReports: 0,
      inaccurateReports: 4,
      name: 'Inaccurate Detail Row',
    });
    const markers = renderedMarkers(container);
    expect(markers).toHaveLength(1);
    expect(markers[0].classList.contains('shelter-marker--reported')).toBe(true);
    expect(markers[0].classList.contains('shelter-marker--registry')).toBe(false);
  });

  it('a showShelter marker is static — clicking it never fires markerClick', () => {
    const onMarkerClick = vi.fn();
    service.markerClick = onMarkerClick;
    service.showShelter({
      latitude: TALLINN.latitude,
      longitude: TALLINN.longitude,
      source: TALLINN.source,
      reviewStatus: TALLINN.reviewStatus,
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
        source: 'USER',
        reviewStatus: 'NEW',
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

  it('setAnchor drops one fixed anchor pin, re-centers on update, removes on null (M12)', () => {
    // Coexists with the shelter markers — its own field, never the
    // markers layer group (renderShelters keeps the anchor alive).
    service.renderShelters([TALLINN, PERNU]);
    service.setAnchor(58.8, 25.0, EN['map.searched']);
    const anchor = () => container.querySelectorAll<HTMLElement>('.shelter-marker--anchor');
    expect(anchor()).toHaveLength(1);
    expect(anchor()[0].classList.contains('leaflet-marker-icon')).toBe(true);
    // 2 shelter markers + the 1 anchor pin.
    expect(renderedMarkers(container)).toHaveLength(3);

    // Moving the anchor never duplicates the pin…
    service.setAnchor(59.1, 26.1, EN['map.searched']);
    expect(anchor()).toHaveLength(1);
    // …and re-rendering the shelters never removes it either.
    service.renderShelters([TALLINN]);
    expect(anchor()).toHaveLength(1);
    // 1 shelter marker + the 1 anchor pin.
    expect(renderedMarkers(container)).toHaveLength(2);

    // null args remove it.
    service.setAnchor(null, null, '');
    expect(anchor()).toHaveLength(0);
  });

  it('the anchor pin is fixed and non-interactive — no drag, no click handler, out of the tab order (M12)', () => {
    service.setAnchor(58.8, 25.0, EN['map.searched']);
    const el = container.querySelector<HTMLElement>('.shelter-marker--anchor');
    expect(el).not.toBeNull();
    // interactive:false → leaflet adds no tabindex/role; the pin must not
    // enter the tab order (it is a reference point, not a control).
    expect(el?.getAttribute('tabindex')).toBeNull();
    expect(el?.getAttribute('role')).toBeNull();
    // The tooltip text (the native title) names what the pin is — its
    // accessible name (M8: the origin marker).
    expect(el?.getAttribute('title')).toBe(EN['map.searched']);
    // Smaller than the 14px shelter dots (M8): the origin is a reference
    // point, not a data point — and it must not cover a co-located shelter.
    expect(el?.style.width).toBe('12px');
    expect(el?.style.height).toBe('12px');
  });

  it('a shelter at the anchor point is never obscured — shelters outrank the origin pin in z-order (M8)', () => {
    // Same coordinates for shelter and anchor: the shelter marker (the
    // DATA) must draw above the origin pin at the zooms the app uses.
    service.renderShelters([TALLINN]);
    service.setAnchor(TALLINN.latitude, TALLINN.longitude, EN['map.searched']);
    const shelterEl = container.querySelector<HTMLElement>('.shelter-marker--registry');
    const anchorEl = container.querySelector<HTMLElement>('.shelter-marker--anchor');
    expect(shelterEl).not.toBeNull();
    expect(anchorEl).not.toBeNull();
    expect(parseInt(shelterEl!.style.zIndex, 10) > parseInt(anchorEl!.style.zIndex, 10)).toBe(true);
    // True in BOTH orderings — the anchor set after a re-render still
    // stays under the shelter (the z-order comes from the shelter's
    // zIndexOffset, not from DOM order).
    service.renderShelters([TALLINN]);
    const shelterEl2 = container.querySelector<HTMLElement>('.shelter-marker--registry');
    const anchorEl2 = container.querySelector<HTMLElement>('.shelter-marker--anchor');
    expect(parseInt(shelterEl2!.style.zIndex, 10) > parseInt(anchorEl2!.style.zIndex, 10)).toBe(
      true,
    );
  });

  it('setAnchor is a safe no-op before create and destroy clears the pin (M12)', () => {
    const uncreated = new LeafletService();
    expect(() => uncreated.setAnchor(58.8, 25.0, EN['map.searched'])).not.toThrow();

    service.setAnchor(58.8, 25.0, EN['map.searched']);
    expect(container.querySelector('.shelter-marker--anchor')).not.toBeNull();
    service.destroy();
    expect(container.querySelector('.shelter-marker--anchor')).toBeNull();
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

describe('markerTone — the tone resolution the pin is made of', () => {
  // The behavioural home of the absence pin (the 15-delivery-audit U6
  // hardening): the pin is asserted on what the resolution ACTUALLY
  // produces for a freshly-added row at every verification depth, in the
  // same currency as the behaviour — not on the stylesheet's bytes. The
  // input type has no recency field and the range has no recency term:
  // a re-introduced NEW tone is a signature change this suite must see.
  const fresh = (
    submitterVerification: 'EMAIL' | 'PHONE' | 'SMART_ID' | 'FULL' | null | undefined,
  ) => markerTone({ source: 'USER', nonexistentReports: 0, submitterVerification });

  it('a freshly-added community row resolves its depth tone for EVERY verification depth, never a recency tone (owner decision)', () => {
    // No depth the backend reports (older API, deleted author) -> the
    // community tone, identical to a CONFIRMED no-depth row.
    expect(fresh(undefined)).toBe('user');
    expect(fresh(null)).toBe('user');
    // Exactly one confirmed channel -> the partial shape, whatever channel.
    expect(fresh('EMAIL')).toBe('partial');
    expect(fresh('PHONE')).toBe('partial');
    expect(fresh('SMART_ID')).toBe('partial');
    // Two or more channels -> the full shape.
    expect(fresh('FULL')).toBe('full');
  });

  it('a fresh row with an open report of EITHER kind resolves reported, beating the depth tone (W2-B)', () => {
    expect(
      markerTone({ source: 'USER', nonexistentReports: 1, submitterVerification: 'FULL' }),
    ).toBe('reported');
    expect(
      markerTone({
        source: 'USER',
        nonexistentReports: 0,
        inaccurateReports: 1,
        submitterVerification: 'FULL',
      }),
    ).toBe('reported');
  });

  it('registry rows resolve registry — the recency of a registry row never enters the tone', () => {
    expect(markerTone({ source: 'PAASETEAMET', nonexistentReports: 0 })).toBe('registry');
    expect(markerTone({ source: 'MUNICIPALITY', nonexistentReports: 0 })).toBe('registry');
  });
});
