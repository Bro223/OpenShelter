import { Component, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthStore } from '../../session/auth-store';
import type { ShelterDto } from '../../core/models';
import { authGuard, verifiedGuard } from '../../core/guards';
import { LeafletService } from '../../shared/leaflet-service';
import { ShelterGateway } from '../../gateways/shelter-gateway';
import { SubmitShelterPage } from './submit-shelter-page';

/** Hand-written fakes (01-TASK.md §8 — no mocking framework gymnastics). */
class FakeShelterGateway {
  list = vi.fn(async (): Promise<ShelterDto[]> => []);
  get = vi.fn();
  create = vi.fn();
}

class FakeLeafletService {
  created = 0;
  destroyed = 0;
  pickCalls: [number | null, number | null][] = [];
  mapClick: ((lat: number, lng: number) => void) | null = null;

  create = vi.fn((el: HTMLElement | null): void => {
    if (el) {
      this.created++;
    }
  });
  setPick = vi.fn((lat: number | null, lng: number | null): void => {
    this.pickCalls.push([lat, lng]);
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
};

@Component({ template: '<p>map stub</p>' })
class MapStub {}

@Component({ template: '<p>detail stub</p>' })
class DetailStub {}

@Component({ template: '<p>verify stub</p>' })
class VerifyStub {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

describe('SubmitShelterPage (/submit)', () => {
  let gateway: FakeShelterGateway;
  let leaflet: FakeLeafletService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeShelterGateway();
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

  function fillLocation(el: HTMLElement, lat: string, lng: string): void {
    const latInput = input(el, 'shelter-latitude');
    latInput.value = lat;
    latInput.dispatchEvent(new Event('input'));
    const lngInput = input(el, 'shelter-longitude');
    lngInput.value = lng;
    lngInput.dispatchEvent(new Event('input'));
  }

  function fillValidForm(el: HTMLElement): void {
    const nameInput = input(el, 'shelter-name');
    nameInput.value = 'Kalamaja community shelter';
    nameInput.dispatchEvent(new Event('input'));
    fillLocation(el, '59.437', '24.754');
  }

  it('a valid submit POSTs the request and navigates to the new shelter', async () => {
    gateway.create.mockResolvedValue(CREATED);
    const { element, fixture } = await open();
    fillValidForm(element);
    fixture.detectChanges();

    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);

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

  it('a map pick fills the coordinate inputs and drops the pick marker', async () => {
    const { element, fixture } = await open();
    expect(leaflet.mapClick).not.toBeNull(); // the page wired the callback
    expect(leaflet.created).toBe(1);

    leaflet.mapClick!(58.8, 25.1);
    fixture.detectChanges();

    expect(input(element, 'shelter-latitude').value).toBe('58.8');
    expect(input(element, 'shelter-longitude').value).toBe('25.1');
    expect(leaflet.pickCalls.at(-1)).toEqual([58.8, 25.1]);
  });

  it('typed coordinates move the pick marker; empty input clears it', async () => {
    const { element, fixture } = await open();
    fillLocation(element, '59.0', '26.0');
    fixture.detectChanges();
    expect(leaflet.pickCalls.at(-1)).toEqual([59, 26]);

    input(element, 'shelter-latitude').value = '';
    input(element, 'shelter-latitude').dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(leaflet.pickCalls.at(-1)).toEqual([null, 26]);
  });

  it('an out-of-Estonia point shows an inline error and does not send', async () => {
    const { element, fixture } = await open();
    fillValidForm(element);
    fillLocation(element, '54.5', '25.0'); // open sea, west of Saaremaa
    fixture.detectChanges();

    expect(element.textContent).toContain('The location must be inside Estonia.');
    expect((element.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
      false, // button enabled (not pending) but the form is invalid…
    );
    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);
    expect(gateway.create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('The location must be inside Estonia.');
  });

  it('a missing location shows the "pick a location" inline error and does not send', async () => {
    const { element, fixture } = await open();
    input(element, 'shelter-name').value = 'Some shelter';
    input(element, 'shelter-name').dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.textContent).toContain('Pick a location on the map or enter both coordinates.');
    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);
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
    fillLocation(element, '59.437', '24.754');
    const name = input(element, 'shelter-name');
    name.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(element.textContent).toContain('A name is required.');
    (element.querySelector('form') as HTMLFormElement).requestSubmit();
    await settle(fixture);
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('a whitespace-only name is rejected as blank, not as too-long (N10)', async () => {
    const { element, fixture } = await open();
    fillLocation(element, '59.437', '24.754');
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
      input(element, 'shelter-name').value = 'Kalamaja community shelter';
      input(element, 'shelter-name').dispatchEvent(new Event('input'));
      fixture.detectChanges();

      (element.querySelector('form') as HTMLFormElement).requestSubmit();
      await settle(fixture);

      expect(element.querySelector('.banner--error')?.textContent).toContain(message);
      // Input preserved — the user can fix and retry.
      expect(input(element, 'shelter-name').value).toBe('Kalamaja community shelter');
      expect(input(element, 'shelter-latitude').value).toBe('59.437');
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

    const button = element.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.textContent).toContain('Submitting…');
    expect(button.disabled).toBe(true);
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
