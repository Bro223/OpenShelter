import { Component, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthStore } from '../../session/auth-store';
import type { GeocodeResult, ShelterDto } from '../../core/models';
import { authGuard, verifiedGuard } from '../../core/guards';
import { GeocodeGateway } from '../../gateways/geocode-gateway';
import { GeoGateway } from '../../gateways/geo-gateway';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { LeafletService } from '../../shared/leaflet-service';
import { SubmitShelterPage } from './submit-shelter-page';

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeShelterGateway {
  create = vi.fn();
}

class FakeGeoGateway {
  resolve = vi.fn();
}

class FakeGeocodeGateway {
  search = vi.fn();
}

class FakeLeafletService {
  created = 0;
  destroyed = 0;
  pickCalls: [number | null, number | null][] = [];
  flyToCalls: [number, number][] = [];
  mapClick: ((lat: number, lng: number) => void) | null = null;

  create = vi.fn((el: HTMLElement | null): void => {
    if (el) {
      this.created++;
    }
  });
  setPick = vi.fn((lat: number | null, lng: number | null): void => {
    this.pickCalls.push([lat, lng]);
  });
  flyTo = vi.fn((lat: number, lng: number): void => {
    this.flyToCalls.push([lat, lng]);
  });
  destroy = vi.fn(() => void this.destroyed++);
}

/** AuthStore-shaped fake — real signals so zoneless CD stays reactive. */
function fakeAuthStore(): AuthStore {
  return {
    authenticated: () => true,
    initialized: () => true,
    levels: () => ['EMAIL' as const],
    init: vi.fn(async () => undefined),
    isVerified: () => true,
  } as unknown as AuthStore;
}

const CREATED: ShelterDto = {
  id: 42,
  address: null,
  name: 'Kalamaja community shelter',
  latitude: 59.437,
  longitude: 24.754,
  status: 'ACTIVE',
  source: 'USER',
  averageRating: null,
  reviewCount: 0,
  createdAt: '2025-09-10T09:00:00Z',
  description: 'Basement with two exits',
  capacity: 40,
  // The submitter is verified (creation is verified-gated) — the created
  // row comes back already proven (D3/D4).
  submitterVerified: true,
};

/** A Nominatim result for "lossi 2, tartu" (as the live service shaped it). */
const GEO_RESULT: GeocodeResult = {
  displayName: 'Lossi 2, 81001 Tartu, Tartumaa, Estonia',
  latitude: 59.43703,
  longitude: 24.75353,
  type: 'house',
};

@Component({ template: '<p>map stub</p>' })
class MapStub {}

@Component({ template: '<p>detail stub</p>' })
class DetailStub {}

@Component({ template: '<p>verify stub</p>' })
class VerifyStub {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

/** Geolocation seam: stub navigator.geolocation with a hand-written fake. */
function stubGeolocation(behavior: {
  position?: { latitude: number; longitude: number; accuracy: number };
  errorCode?: number;
}): ReturnType<typeof vi.fn> {
  const getCurrentPosition = vi.fn(
    (success: (p: GeolocationPosition) => void, failure: (e: { code: number }) => void): void => {
      if (behavior.position === undefined) {
        failure({ code: behavior.errorCode ?? 2 });
      } else {
        success({
          coords: {
            latitude: behavior.position.latitude,
            longitude: behavior.position.longitude,
            accuracy: behavior.position.accuracy,
          },
        } as unknown as GeolocationPosition);
      }
    },
  );
  return getCurrentPosition;
}

/**
 * A geolocation fake the test settles BY HAND — the deferred settle is the
 * M3 race (an in-flight request answering after a newer capture).
 */
function deferredGeolocation(): {
  fake: ReturnType<typeof vi.fn>;
  settle: (position: { latitude: number; longitude: number; accuracy: number }) => void;
  fail: (code?: number) => void;
} {
  let success: (p: GeolocationPosition) => void = () => {};
  let failure: (e: { code: number }) => void = () => {};
  const fake = vi.fn(
    (s: (p: GeolocationPosition) => void, f: (e: { code: number }) => void): void => {
      success = s;
      failure = f;
    },
  );
  return {
    fake,
    settle: (p) => success({ coords: p } as unknown as GeolocationPosition),
    fail: (code = 2) => failure({ code }),
  };
}

function setGeolocation(fake: ReturnType<typeof stubGeolocation> | undefined): void {
  Object.defineProperty(navigator, 'geolocation', {
    value: fake === undefined ? undefined : { getCurrentPosition: fake },
    configurable: true,
  });
}

describe('SubmitShelterPage (/submit)', () => {
  let gateway: FakeShelterGateway;
  let geo: FakeGeoGateway;
  let geocode: FakeGeocodeGateway;
  let leaflet: FakeLeafletService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    // Secure context by default (dev runs on localhost); individual tests
    // override it for the geo-insecure path.
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    setGeolocation(undefined);
    gateway = new FakeShelterGateway();
    geo = new FakeGeoGateway();
    geocode = new FakeGeocodeGateway();
    leaflet = new FakeLeafletService();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'map', component: MapStub },
          { path: 'verify', component: VerifyStub },
          {
            path: 'submit',
            canActivate: [authGuard, verifiedGuard],
            component: SubmitShelterPage,
          },
          { path: 'shelters/:id', component: DetailStub },
        ]),
        { provide: ShelterGateway, useValue: gateway as unknown as ShelterGateway },
        { provide: GeoGateway, useValue: geo as unknown as GeoGateway },
        { provide: GeocodeGateway, useValue: geocode as unknown as GeocodeGateway },
        { provide: LeafletService, useValue: leaflet as unknown as LeafletService },
        { provide: AuthStore, useValue: fakeAuthStore() },
      ],
    });
    // SubmitShelterPage declares a page-scoped LeafletService provider; drop
    // it so the root-level fake is the one the page injects.
    TestBed.overrideComponent(SubmitShelterPage, { remove: { providers: [LeafletService] } });
    router = TestBed.inject(Router);
  });

  async function open(): Promise<{
    page: SubmitShelterPage;
    element: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent>;
  }> {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await router.navigateByUrl('/submit');
    await fixture.whenStable();
    fixture.detectChanges();

    const debug: DebugElement = fixture.debugElement.query(By.directive(SubmitShelterPage));
    if (!debug) {
      throw new Error('SubmitShelterPage not rendered');
    }
    return { page: debug.componentInstance, element: debug.nativeElement as HTMLElement, fixture };
  }

  async function settle(fixture: ReturnType<typeof TestBed.createComponent>): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
  }

  function input(el: HTMLElement, id: string): HTMLInputElement {
    const field = el.querySelector<HTMLInputElement>(`#${id}`);
    if (!field) {
      throw new Error(`#${id} not found`);
    }
    return field;
  }

  function button(el: HTMLElement, label: string): HTMLButtonElement {
    const found = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(label),
    );
    if (!found) {
      throw new Error(`button "${label}" not found`);
    }
    return found;
  }

  function typeLocation(el: HTMLElement, text: string): void {
    const field = input(el, 'shelter-location-input');
    field.value = text;
    field.dispatchEvent(new Event('input'));
  }

  function typeAddressSearch(el: HTMLElement, text: string): void {
    const field = input(el, 'shelter-address-search');
    field.value = text;
    field.dispatchEvent(new Event('input'));
  }

  function resultButton(el: HTMLElement): HTMLButtonElement {
    const found = el.querySelector<HTMLButtonElement>('.address-results li button');
    if (!found) {
      throw new Error('address result button not found');
    }
    return found;
  }

  function pressEnterIn(el: HTMLElement, id: string): void {
    input(el, id).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
  }

  /** The canonical valid form: name + location from the smart input. */
  function fillValidForm(el: HTMLElement, locationText = '59.437, 24.754'): void {
    const nameInput = input(el, 'shelter-name');
    nameInput.value = 'Kalamaja community shelter';
    nameInput.dispatchEvent(new Event('input'));
    typeLocation(el, locationText);
    pressEnterIn(el, 'shelter-location-input');
  }

  it('a valid submit POSTs the SAME payload shape and navigates to the new shelter', async () => {
    gateway.create.mockResolvedValue(CREATED);
    const { element, fixture } = await open();
    fillValidForm(element);
    fixture.detectChanges();

    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);

    // Regression guard (shelter-location-input): latitude/longitude are plain
    // numbers straight from the shared location state — same shape as before.
    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(gateway.create).toHaveBeenCalledWith({
      name: 'Kalamaja community shelter',
      latitude: 59.437,
      longitude: 24.754,
      description: undefined,
      capacity: undefined,
    });
    expect(router.url).toBe('/shelters/42');
    expect(fixture.nativeElement.textContent).toContain('detail stub');
  });

  it('sends description and capacity when provided', async () => {
    gateway.create.mockResolvedValue(CREATED);
    const { element, fixture } = await open();
    fillValidForm(element);
    const desc = element.querySelector<HTMLTextAreaElement>('#shelter-description');
    if (!desc) {
      throw new Error('#shelter-description not found');
    }
    desc.value = 'Basement with two exits';
    desc.dispatchEvent(new Event('input'));
    const cap = input(element, 'shelter-capacity');
    cap.value = '40';
    cap.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);

    expect(gateway.create).toHaveBeenCalledWith({
      name: 'Kalamaja community shelter',
      latitude: 59.437,
      longitude: 24.754,
      description: 'Basement with two exits',
      capacity: 40,
    });
    expect(router.url).toBe('/shelters/42');
  });

  it('a map pick writes the shared location state and drops the pick marker (no flyTo)', async () => {
    const { element, fixture } = await open();
    expect(leaflet.mapClick).not.toBeNull(); // the page wired the callback
    expect(leaflet.created).toBe(1);

    leaflet.mapClick!(58.8, 25.1);
    fixture.detectChanges();

    expect(element.textContent).toContain('58.80000, 25.10000');
    expect(leaflet.pickCalls.at(-1)).toEqual([58.8, 25.1]);
    expect(leaflet.flyToCalls).toEqual([]); // a pick never re-centers the map
    expect(element.textContent).toContain('Location from the map');
  });

  it('typed coordinates via Enter move the marker, fly the map, update the readout', async () => {
    const { element, fixture } = await open();
    typeLocation(element, '59.0, 26.0');
    pressEnterIn(element, 'shelter-location-input');
    fixture.detectChanges();

    expect(leaflet.pickCalls.at(-1)).toEqual([59, 26]);
    expect(leaflet.flyToCalls.at(-1)).toEqual([59, 26]);
    expect(element.textContent).toContain('59.00000, 26.00000');
    // D6 (map-crisis-actions): the coordinate readout uses the shared
    // tabular-figures class so digits do not shift while they update.
    expect(element.querySelector('.location-readout')?.classList.contains('num-tabular')).toBe(
      true,
    );
    expect(element.textContent).toContain('Location from typed coordinates');
    expect(element.querySelector('.location-field .field-error')).toBeNull();
  });

  it('the "Set location" button parses the smart input (not just Enter)', async () => {
    const { element, fixture } = await open();
    typeLocation(element, '59.1, 25.5');
    button(element, 'Set location').click();
    fixture.detectChanges();

    expect(leaflet.pickCalls.at(-1)).toEqual([59.1, 25.5]);
    expect(element.textContent).toContain('59.10000, 25.50000');
  });

  it('a reversed (lng, lat) paste is auto-swapped and shows the swap hint', async () => {
    const { element, fixture } = await open();
    typeLocation(element, '24.7535, 59.4370');
    pressEnterIn(element, 'shelter-location-input');
    fixture.detectChanges();

    expect(leaflet.pickCalls.at(-1)).toEqual([59.437, 24.7535]);
    expect(element.textContent).toContain('59.43700, 24.75350');
    expect(element.textContent).toContain('longitude, latitude');
    expect(element.querySelector('.location-field .field-error')).toBeNull();
  });

  it('a DMS string places the equivalent decimal position', async () => {
    const { element, fixture } = await open();
    typeLocation(element, `59°26'13"N 24°45'12"E`);
    pressEnterIn(element, 'shelter-location-input');
    fixture.detectChanges();

    // 59°26'13" = 59.43694…, 24°45'12" = 24.75333…
    expect(element.textContent).toContain('59.43694, 24.75333');
    expect(leaflet.pickCalls.at(-1)).toEqual([59 + 26 / 60 + 13 / 3600, 24 + 45 / 60 + 12 / 3600]);
  });

  it('a long-form Google link is parsed client-side (no network call)', async () => {
    const { element, fixture } = await open();
    typeLocation(element, 'https://www.google.com/maps/place/@59.43703,24.75353,17z');
    pressEnterIn(element, 'shelter-location-input');
    fixture.detectChanges();

    expect(geo.resolve).not.toHaveBeenCalled(); // long links NEVER hit the network
    expect(element.textContent).toContain('59.43703, 24.75353');
    expect(element.textContent).toContain('Location from the map link');
  });

  it('an unparseable text shows the no-pair inline error and does not send', async () => {
    const { element, fixture } = await open();
    fillValidForm(element);
    typeLocation(element, 'somewhere in a basement');
    pressEnterIn(element, 'shelter-location-input');
    fixture.detectChanges();

    expect(element.textContent).toContain('No recognizable coordinates in that text');
    expect(geo.resolve).not.toHaveBeenCalled();
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('an Estonian decimal-comma paste gets the decimal-point message and no silent pin (H4)', async () => {
    const { element, fixture } = await open();
    fillValidForm(element);
    typeLocation(element, '59,4370 24,7535');
    pressEnterIn(element, 'shelter-location-input');
    fixture.detectChanges();

    expect(element.textContent).toContain('Use a decimal point: 59.4370, 24.7535');
    expect(element.textContent).toContain('Estonian decimal-comma detected');
    // No silent wrong pin: the failed capture clears the pre-filled pin.
    expect(element.textContent).toContain('No location yet');
    expect(leaflet.pickCalls.at(-1)).toEqual([null, null]);
    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('a successful capture clears a prior location error (n3d)', async () => {
    const { element, fixture } = await open();
    typeLocation(element, 'somewhere in a basement');
    pressEnterIn(element, 'shelter-location-input');
    fixture.detectChanges();
    expect(element.textContent).toContain('No recognizable coordinates in that text');

    typeLocation(element, '59.1, 25.5');
    pressEnterIn(element, 'shelter-location-input');
    fixture.detectChanges();

    expect(element.querySelector('.location-field .field-error')).toBeNull();
    expect(element.textContent).toContain('59.10000, 25.50000');
    expect(element.textContent).toContain('Location from typed coordinates');
  });

  // ---------------------------------------------------------------------
  // Cross-mode capture race (M3): a stale async settle must no-op
  // ---------------------------------------------------------------------

  it('a late geolocation success (stale generation) never overwrites a typed pin (M3)', async () => {
    const pending = deferredGeolocation();
    setGeolocation(pending.fake);
    const { element, fixture } = await open();

    button(element, 'Use my location').click();
    fixture.detectChanges();
    // The smart input is disabled while the geolocation is in flight.
    expect(input(element, 'shelter-location-input').disabled).toBe(true);

    // A newer capture happens while the geolocation is still in flight.
    typeLocation(element, '59.1, 25.5');
    pressEnterIn(element, 'shelter-location-input');
    fixture.detectChanges();
    expect(element.textContent).toContain('59.10000, 25.50000');
    expect(element.textContent).toContain('Location from typed coordinates');

    // The geolocation settles LATE — its generation is stale: no-op.
    pending.settle({ latitude: 59.442, longitude: 24.748, accuracy: 40 });
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(element.textContent).toContain('59.10000, 25.50000');
    expect(element.textContent).toContain('Location from typed coordinates');
    expect(element.textContent).not.toContain('Location from your device location');
    // The settle did end the pending state (button + input back to normal).
    expect(input(element, 'shelter-location-input').disabled).toBe(false);
    expect(button(element, 'Use my location').disabled).toBe(false);
  });

  it('a late geolocation ERROR (stale generation) never clears a set pin (M3)', async () => {
    const pending = deferredGeolocation();
    setGeolocation(pending.fake);
    const { element, fixture } = await open();
    fillValidForm(element); // typed pin set first

    button(element, 'Use my location').click();
    fixture.detectChanges();

    // A map pick supersedes the in-flight geolocation…
    leaflet.mapClick!(58.8, 25.1);
    fixture.detectChanges();
    expect(element.textContent).toContain('58.80000, 25.10000');
    expect(element.textContent).toContain('Location from the map');

    // …then the geolocation errors out LATE — stale: no failLocation, no clear.
    pending.fail(1);
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(element.textContent).toContain('58.80000, 25.10000');
    expect(element.textContent).toContain('Location from the map');
    expect(element.textContent).not.toContain('Location permission is off');
    expect(element.querySelector('.location-field .field-error')).toBeNull();
  });

  it('a late short-link 400 (stale generation) never clears a map pick (M3)', async () => {
    let rejectResolve!: (e: unknown) => void;
    geo.resolve.mockReturnValue(
      new Promise<{ latitude: number; longitude: number }>((_, reject) => {
        rejectResolve = reject;
      }),
    );
    const { element, fixture } = await open();

    typeLocation(element, 'https://maps.app.goo.gl/AbC123');
    button(element, 'Set location').click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Resolving…');

    // The user picks on the map while the resolve is in flight.
    leaflet.mapClick!(58.8, 25.1);
    fixture.detectChanges();
    expect(element.textContent).toContain('58.80000, 25.10000');

    // The resolve answers LATE with a 400 — stale: no failLocation, no clear.
    rejectResolve(
      ApiError.fromHttp(
        400,
        {
          timestamp: 't',
          status: 400,
          error: 'Bad Request',
          message: 'could not find coordinates in the provided link',
          path: '/api/geo/resolve',
        },
        '/api/geo/resolve',
      ),
    );
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(element.textContent).toContain('58.80000, 25.10000');
    expect(element.textContent).toContain('Location from the map');
    expect(element.textContent).not.toContain('Could not find coordinates in that link');
    expect(element.querySelector('.location-field .field-error')).toBeNull();
  });

  it('an out-of-Estonia point shows the inline error, clears the pin, and does not send', async () => {
    const { element, fixture } = await open();
    fillValidForm(element);
    typeLocation(element, '54.5, 25.0'); // open sea, west of Saaremaa
    pressEnterIn(element, 'shelter-location-input');
    fixture.detectChanges();

    expect(element.textContent).toContain('The location is outside Estonia.');
    // A failed capture removes the previous pin — no silent stale pin on submit.
    expect(element.textContent).toContain('No location yet');
    expect(leaflet.pickCalls.at(-1)).toEqual([null, null]);
    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('a maps.app.goo.gl short link resolves through the geo gateway with a pending state', async () => {
    let resolveGeo: (value: { latitude: number; longitude: number }) => void = () => {};
    geo.resolve.mockReturnValue(
      new Promise<{ latitude: number; longitude: number }>((resolve) => {
        resolveGeo = resolve;
      }),
    );
    const { element, fixture } = await open();
    fillValidForm(element);
    typeLocation(element, 'https://maps.app.goo.gl/AbC123');
    button(element, 'Set location').click();
    fixture.detectChanges();

    // Pending state on the button while the backend resolves.
    expect(geo.resolve).toHaveBeenCalledTimes(1);
    expect(geo.resolve).toHaveBeenCalledWith('https://maps.app.goo.gl/AbC123');
    expect(element.textContent).toContain('Resolving…');
    expect(button(element, 'Resolving…').disabled).toBe(true);

    resolveGeo({ latitude: 59.43703, longitude: 24.75353 });
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }
    expect(element.textContent).toContain('59.43703, 24.75353');
    expect(element.textContent).toContain('Location from the map link');
    expect(leaflet.pickCalls.at(-1)).toEqual([59.43703, 24.75353]);
  });

  it('a bare maps.app.goo.gl host (no scheme) is normalized to https before resolving', async () => {
    geo.resolve.mockResolvedValue({ latitude: 58.9, longitude: 25.2 });
    const { element, fixture } = await open();
    fillValidForm(element);
    typeLocation(element, 'maps.app.goo.gl/AbC123');
    button(element, 'Set location').click();
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(geo.resolve).toHaveBeenCalledWith('https://maps.app.goo.gl/AbC123');
    expect(element.textContent).toContain('58.90000, 25.20000');
  });

  it('a short link without coordinates shows the inline not-found error (400)', async () => {
    geo.resolve.mockRejectedValue(
      ApiError.fromHttp(
        400,
        {
          timestamp: 't',
          status: 400,
          error: 'Bad Request',
          message: 'could not find coordinates in the provided link',
          path: '/api/geo/resolve',
        },
        '/api/geo/resolve',
      ),
    );
    const { element, fixture } = await open();
    fillValidForm(element);
    typeLocation(element, 'https://maps.app.goo.gl/NoCoords');
    button(element, 'Set location').click();
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(element.textContent).toContain('Could not find coordinates in that link');
    // The failed resolve also clears the pre-filled pin (no stale pin on submit).
    expect(element.textContent).toContain('No location yet');
    expect(leaflet.pickCalls.at(-1)).toEqual([null, null]);
  });

  it('a rate-limited short link shows the wait-a-minute message (429)', async () => {
    geo.resolve.mockRejectedValue(
      ApiError.fromHttp(
        429,
        {
          timestamp: 't',
          status: 429,
          error: 'Too Many Requests',
          message: 'too many resolve requests',
          path: '/api/geo/resolve',
        },
        '/api/geo/resolve',
      ),
    );
    const { element, fixture } = await open();
    fillValidForm(element);
    typeLocation(element, 'https://maps.app.goo.gl/AbC123');
    button(element, 'Set location').click();
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(element.textContent).toContain('Too many link lookups');
  });

  it('a 401 short-link resolve keeps the not-found-in-link copy (n3b)', async () => {
    geo.resolve.mockRejectedValue(
      ApiError.fromHttp(
        401,
        {
          timestamp: 't',
          status: 401,
          error: 'Unauthorized',
          message: 'authentication required',
          path: '/api/geo/resolve',
        },
        '/api/geo/resolve',
      ),
    );
    const { element, fixture } = await open();
    fillValidForm(element);
    typeLocation(element, 'https://maps.app.goo.gl/AbC123');
    button(element, 'Set location').click();
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(element.textContent).toContain('Could not find coordinates in that link');
    expect(element.textContent).not.toContain('temporarily unavailable');
  });

  it('a 502 short-link resolve shows the temporarily-unavailable copy (M5)', async () => {
    geo.resolve.mockRejectedValue(
      ApiError.fromHttp(
        502,
        {
          timestamp: 't',
          status: 502,
          error: 'Bad Gateway',
          message: 'upstream resolution unavailable',
          path: '/api/geo/resolve',
        },
        '/api/geo/resolve',
      ),
    );
    const { element, fixture } = await open();
    fillValidForm(element);
    typeLocation(element, 'https://maps.app.goo.gl/AbC123');
    button(element, 'Set location').click();
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    // 502 = the backend's upstream resolution is down — NOT the user's link.
    expect(element.textContent).toContain('Location lookup is temporarily unavailable');
    expect(element.textContent).toContain('pick the spot on the map');
    expect(element.textContent).not.toContain('Could not find coordinates in that link');
    // The failed resolve clears the pre-filled pin (no stale pin on submit).
    expect(element.textContent).toContain('No location yet');
  });

  it('a network-failure short-link resolve shows the temporarily-unavailable copy (M5)', async () => {
    geo.resolve.mockRejectedValue(ApiError.fromNetwork());
    const { element, fixture } = await open();
    fillValidForm(element);
    typeLocation(element, 'https://maps.app.goo.gl/AbC123');
    button(element, 'Set location').click();
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(element.textContent).toContain('Location lookup is temporarily unavailable');
    expect(element.textContent).toContain('pick the spot on the map');
  });

  // ---------------------------------------------------------------------
  // Address search (shelter-address-search) — the fifth capture mode
  // ---------------------------------------------------------------------

  it('an address search (Enter) lists results and selecting one places the pin (source: address search)', async () => {
    geocode.search.mockResolvedValue([GEO_RESULT]);
    const { element, fixture } = await open();

    typeAddressSearch(element, 'lossi 2, tartu');
    pressEnterIn(element, 'shelter-address-search');
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(geocode.search).toHaveBeenCalledTimes(1);
    expect(geocode.search).toHaveBeenCalledWith('lossi 2, tartu');
    // The results are a <ul> of buttons, each carrying display name + type.
    const resultButtons = element.querySelectorAll<HTMLButtonElement>('.address-results li button');
    expect(resultButtons).toHaveLength(1);
    expect(resultButtons[0].textContent).toContain('Lossi 2, 81001 Tartu, Tartumaa, Estonia');
    expect(resultButtons[0].textContent).toContain('house');

    resultButtons[0].click();
    fixture.detectChanges();

    // Pin placed through the shared location path + source label + flyTo.
    expect(leaflet.pickCalls.at(-1)).toEqual([59.43703, 24.75353]);
    expect(leaflet.flyToCalls.at(-1)).toEqual([59.43703, 24.75353]);
    expect(element.textContent).toContain('59.43703, 24.75353');
    expect(element.textContent).toContain('Location from the address search');
  });

  it('selecting a result prefills the address field when it is empty', async () => {
    geocode.search.mockResolvedValue([GEO_RESULT]);
    const { element, fixture } = await open();

    typeAddressSearch(element, 'lossi 2, tartu');
    pressEnterIn(element, 'shelter-address-search');
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }
    expect(input(element, 'shelter-location-input').value).toBe('');

    resultButton(element).click();
    fixture.detectChanges();

    expect(input(element, 'shelter-location-input').value).toBe(GEO_RESULT.displayName);
  });

  it('selecting a result leaves a non-empty address field untouched (pin still placed)', async () => {
    geocode.search.mockResolvedValue([GEO_RESULT]);
    const { element, fixture } = await open();
    fillValidForm(element); // smart input carries user-typed coordinates + pin

    typeAddressSearch(element, 'lossi 2, tartu');
    pressEnterIn(element, 'shelter-address-search');
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }
    resultButton(element).click();
    fixture.detectChanges();

    // Prefill, never overwrite (design decision 4).
    expect(input(element, 'shelter-location-input').value).toBe('59.437, 24.754');
    expect(leaflet.pickCalls.at(-1)).toEqual([59.43703, 24.75353]);
    expect(element.textContent).toContain('Location from the address search');
  });

  it('a search with no Estonian matches shows the no-results message (link/map/geo suggested)', async () => {
    geocode.search.mockResolvedValue([]);
    const { element, fixture } = await open();

    typeAddressSearch(element, 'big ben, london');
    pressEnterIn(element, 'shelter-address-search');
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(element.textContent).toContain('No Estonian address found');
    expect(element.textContent).toContain('try the map, a link, or "Use my location"');
    expect(element.querySelector('.address-results')).toBeNull();
  });

  it('a 429 from the geocoder shows the wait-a-moment message and does not touch the pin', async () => {
    geocode.search.mockRejectedValue(
      ApiError.fromHttp(
        429,
        {
          timestamp: 't',
          status: 429,
          error: 'Too Many Requests',
          message: 'too many requests',
          path: '',
        },
        'https://nominatim.openstreetmap.org/search',
      ),
    );
    const { element, fixture } = await open();
    fillValidForm(element); // pin placed first — it must survive the 429

    typeAddressSearch(element, 'lossi 2, tartu');
    pressEnterIn(element, 'shelter-address-search');
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(element.textContent).toContain('please wait a moment');
    expect(element.textContent).toContain('Location from typed coordinates');
    expect(element.querySelector('.address-results')).toBeNull();
  });

  it('a network failure shows the generic copy and never blocks submission', async () => {
    geocode.search.mockRejectedValue(ApiError.fromNetwork());
    gateway.create.mockResolvedValue(CREATED);
    const { element, fixture } = await open();
    fillValidForm(element);

    typeAddressSearch(element, 'lossi 2, tartu');
    pressEnterIn(element, 'shelter-address-search');
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }

    expect(element.textContent).toContain('Address search is unreachable right now');
    // The search failure does not gate the form — a valid submit still goes out.
    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);
    expect(gateway.create).toHaveBeenCalledTimes(1);
  });

  it('a successful search after a previous search error replaces the error with results (n3c)', async () => {
    geocode.search
      .mockRejectedValueOnce(ApiError.fromNetwork())
      .mockResolvedValueOnce([GEO_RESULT]);
    const { element, fixture } = await open();

    typeAddressSearch(element, 'lossi 2, tartu');
    pressEnterIn(element, 'shelter-address-search');
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }
    expect(element.textContent).toContain('Address search is unreachable right now');
    expect(element.querySelector('.address-results')).toBeNull();

    // The retry succeeds — the error is cleared, the results are listed.
    pressEnterIn(element, 'shelter-address-search');
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }
    expect(geocode.search).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Lossi 2, 81001 Tartu, Tartumaa, Estonia');
    expect(element.querySelector('.address-results')).not.toBeNull();
    expect(element.textContent).not.toContain('Address search is unreachable right now');
  });

  it('a pending search shows "Searching…" on the button and ignores extra presses (no stacking)', async () => {
    let resolveSearch: (results: GeocodeResult[]) => void = () => {};
    geocode.search.mockReturnValue(
      new Promise<GeocodeResult[]>((resolve) => {
        resolveSearch = resolve;
      }),
    );
    const { element, fixture } = await open();

    typeAddressSearch(element, 'lossi 2, tartu');
    button(element, 'Search').click();
    fixture.detectChanges();

    expect(geocode.search).toHaveBeenCalledTimes(1);
    expect(button(element, 'Searching…').disabled).toBe(true);
    // A second trigger while pending is ignored, not stacked.
    pressEnterIn(element, 'shelter-address-search');
    expect(geocode.search).toHaveBeenCalledTimes(1);

    resolveSearch([GEO_RESULT]);
    for (let i = 0; i < 5; i++) {
      await settle(fixture);
    }
    expect(button(element, 'Search').disabled).toBe(false);
    expect(element.querySelector('.address-results')).not.toBeNull();
  });

  it('always renders the OSM attribution next to the search (before any search)', async () => {
    const { element } = await open();

    const link = element.querySelector<HTMLAnchorElement>('.location-attribution a');
    if (!link) {
      throw new Error('.location-attribution a not found');
    }
    expect(link.textContent).toContain('© OpenStreetMap contributors');
    expect(link.getAttribute('href')).toBe('https://www.openstreetmap.org/copyright');
  });

  it('"Use my location" places the marker with an accuracy hint (high accuracy, 10 s, no cache)', async () => {
    const getCurrentPosition = stubGeolocation({
      position: { latitude: 59.442, longitude: 24.748, accuracy: 40 },
    });
    setGeolocation(getCurrentPosition);
    const { element, fixture } = await open();
    fillValidForm(element);

    button(element, 'Use my location').click();
    await settle(fixture);

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
    expect(element.textContent).toContain('59.44200, 24.74800');
    expect(element.textContent).toContain('Location from your device location');
    expect(element.textContent).toContain('accuracy about 40 m — drag the pin if needed');
    expect(leaflet.pickCalls.at(-1)).toEqual([59.442, 24.748]);
  });

  it.each([
    [1, 'Location permission is off'],
    [2, 'Your location could not be determined'],
    [3, 'Finding your location timed out'],
  ])(
    'geolocation error code %i maps to its specific inline message and clears the pin',
    async (code, message) => {
      setGeolocation(stubGeolocation({ errorCode: code }));
      const { element, fixture } = await open();
      fillValidForm(element);

      button(element, 'Use my location').click();
      await settle(fixture);

      expect(element.textContent).toContain(message);
      // The failed capture removed the pre-filled location — the form cannot
      // silently submit the stale pin (spec: "the marker is not placed").
      expect(element.textContent).toContain('No location yet');
    },
  );

  it('a non-secure context shows the https-specific message and never calls geolocation', async () => {
    const getCurrentPosition = stubGeolocation({
      position: { latitude: 59.442, longitude: 24.748, accuracy: 10 },
    });
    setGeolocation(getCurrentPosition);
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    const { element, fixture } = await open();
    fillValidForm(element);

    button(element, 'Use my location').click();
    await settle(fixture);

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Location access needs a secure (https) connection');
    expect(element.textContent).toContain('No location yet');
  });

  it('a missing geolocation API shows the unavailable message', async () => {
    const { element, fixture } = await open();
    fillValidForm(element);

    button(element, 'Use my location').click();
    await settle(fixture);

    expect(element.textContent).toContain('Your location could not be determined');
    expect(element.textContent).toContain('No location yet');
  });

  it('submitting without a location shows the "pick a location" inline error and does not send', async () => {
    const { element, fixture } = await open();
    input(element, 'shelter-name').value = 'Some shelter';
    input(element, 'shelter-name').dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);

    expect(element.textContent).toContain(
      'Pick a location on the map, paste coordinates or a link',
    );
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('an out-of-range capacity is rejected inline and does not send', async () => {
    const { element, fixture } = await open();
    fillValidForm(element);
    for (const bad of ['0', '100001', '40.5']) {
      const cap = input(element, 'shelter-capacity');
      cap.value = bad;
      cap.dispatchEvent(new Event('input'));
      cap.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(element.textContent).toContain(
        'Capacity must be a whole number between 1 and 100 000.',
      );
      (element.querySelector('form') as HTMLFormElement).requestSubmit();
      await settle(fixture);
    }
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('an empty name is rejected inline (required)', async () => {
    const { element, fixture } = await open();
    fillValidForm(element);
    const name = input(element, 'shelter-name');
    name.value = '';
    name.dispatchEvent(new Event('input'));
    name.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(element.textContent).toContain('A name is required.');
    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('a whitespace-only name is rejected as blank, not as too-long (N10)', async () => {
    const { element, fixture } = await open();
    fillValidForm(element);
    const name = input(element, 'shelter-name');
    name.value = '   ';
    name.dispatchEvent(new Event('input'));
    name.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(element.textContent).toContain('A name is required.');
    expect(element.textContent).not.toContain('Name must be 200 characters or fewer.');
    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('an over-length name is rejected as too-long, not as missing (the maxlength error key)', async () => {
    const { element, fixture } = await open();
    fillValidForm(element);
    const name = input(element, 'shelter-name');
    name.value = 'a'.repeat(201);
    name.dispatchEvent(new Event('input'));
    name.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(element.textContent).toContain('Name must be 200 characters or fewer.');
    expect(element.textContent).not.toContain('A name is required.');
    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it.each([400, 403])(
    'a backend %i surfaces as a banner with the input preserved',
    async (status) => {
      const message =
        status === 400
          ? 'shelter location must be inside Estonia'
          : 'a verified account is required to submit shelters';
      gateway.create.mockRejectedValue(
        ApiError.fromHttp(
          status,
          { timestamp: 't', status, error: 'Err', message, path: '/api/shelters' },
          '/api/shelters',
        ),
      );
      const { element, fixture } = await open();
      fillValidForm(element);
      fixture.detectChanges();

      (element.querySelector('form') as HTMLFormElement).requestSubmit();
      await settle(fixture);

      expect(element.querySelector('.banner--error')?.textContent).toContain(message);
      // Input preserved — the user can fix and retry.
      expect(input(element, 'shelter-name').value).toBe('Kalamaja community shelter');
      expect(input(element, 'shelter-location-input').value).toBe('59.437, 24.754');
      // No navigation away from the form.
      expect(router.url).toBe('/submit');
      // 403 adds the path back to verification; 400 does not.
      if (status === 403) {
        expect(element.textContent).toContain('Go to verification');
      } else {
        expect(element.textContent).not.toContain('Go to verification');
      }
    },
  );

  it('shows the loading state while the create request is in flight', async () => {
    let resolveCreate: (shelter: ShelterDto) => void = () => {};
    gateway.create.mockReturnValue(new Promise<ShelterDto>((resolve) => (resolveCreate = resolve)));
    const { element, fixture } = await open();
    fillValidForm(element);
    fixture.detectChanges();

    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    fixture.detectChanges();

    const submitButton = element.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!submitButton) {
      throw new Error('submit button not found');
    }
    expect(submitButton.textContent).toContain('Submitting…');
    expect(submitButton.disabled).toBe(true);
    expect(element.querySelector('.banner')).toBeNull(); // no error while loading

    resolveCreate(CREATED);
    // Zoneless: the navigation's microtask chain needs more than one settle
    // tick — poll (bounded) instead of asserting on a single settle.
    for (let i = 0; i < 10 && router.url !== '/shelters/42'; i++) {
      await settle(fixture);
    }
    expect(router.url).toBe('/shelters/42');
  });

  it('destroys the mini-map on route leave (no listener leaks)', async () => {
    gateway.create.mockResolvedValue(CREATED);
    const { fixture } = await open();
    expect(leaflet.created).toBe(1);
    expect(leaflet.destroyed).toBe(0);

    await router.navigateByUrl('/map');
    await settle(fixture);
    expect(leaflet.destroyed).toBe(1);
  });
});
