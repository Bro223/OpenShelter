import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { apiInterceptor } from '../../core/api-interceptor';
import { ApiError } from '../../core/api-error';
import { authGuard, guestGuard, verifiedGuard } from '../../core/guards';
import { TokenStore } from '../../core/token-store';
import type { MeResponse, MineShelterDto, TokenResponse } from '../../core/models';
import { AccountGateway } from '../../gateways/account-gateway';
import { AuthGateway } from '../../gateways/auth-gateway';
import { GeocodeGateway } from '../../gateways/geocode-gateway';
import { GeoGateway } from '../../gateways/geo-gateway';
import { LeafletService } from '../../shared/leaflet-service';
import { SubmitShelterPage } from './submit-shelter-page';

/**
 * The edit route's 401 contract — the FULL auth stack in the loop (real
 * apiInterceptor + real AuthStore + real ShelterGateway/ApiClient + test
 * HttpClient). The scenario is the owner's report, reproduced exactly:
 * the client believes the session is alive (the guard's condition is the
 * client-side `authenticated` signal — nothing is stored to check token
 * expiry against; token-store.ts: expiry is enforced server-side via 401s),
 * the guard passes /submit?edit=<id>, and the first data call
 * (GET /api/shelters/mine) answers 401.
 *
 * The two outcomes the codebase's central path (api-interceptor.ts) must
 * deliver — "a 401 from that call takes the user to login (or a refresh
 * that recovers)":
 *  - the refresh RECOVERS  -> the original request retries once with the
 *    rotated token, the row loads, the form + a LIVE mini-map render, and
 *    no login bounce happens (the session was never dead);
 *  - the refresh DIES      -> the session is cleared centrally and the user
 *    is routed to /login?session=expired — never left on a page whose data
 *    can never load, and the visit leaves no mini-map instance behind.
 *
 * The ShelterGateway is the REAL one on purpose: /mine must ride the
 * interceptor chain (ApiClient -> HttpClient), not a fake that bypasses it.
 * The page's own explicit session-expired state for this window is unit-
 * tested in submit-shelter-page.spec.ts (fake-gateway level).
 */

@Component({ template: '<p>map stub</p>' })
class MapStub {}

@Component({ template: '<p>login stub</p>' })
class LoginStub {}

@Component({ template: '<p>verify stub</p>' })
class VerifyStub {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

class FakeAuthGateway {
  refresh = vi.fn<(token: string) => Promise<TokenResponse>>();
}

class FakeAccountGateway {
  me = vi.fn<() => Promise<MeResponse>>();
}

class FakeGeoGateway {
  resolve = vi.fn();
}

class FakeGeocodeGateway {
  search = vi.fn();
}

/** The real LeafletService's contract (leaflet-service.ts): create no-ops
 *  on a null container or an already-live map (one per visit); setPick/
 *  flyTo no-op before create / after destroy. */
class FakeLeafletService {
  created = 0;
  destroyed = 0;
  pickCalls: [number | null, number | null][] = [];
  flyToCalls: [number, number][] = [];
  mapClick: ((lat: number, lng: number) => void) | null = null;

  get alive(): boolean {
    return this.created > this.destroyed;
  }
  create = vi.fn((el: HTMLElement | null): void => {
    if (el !== null && this.created === this.destroyed) {
      this.created++;
    }
  });
  setPick = vi.fn((lat: number | null, lng: number | null): void => {
    if (this.alive) {
      this.pickCalls.push([lat, lng]);
    }
  });
  flyTo = vi.fn((lat: number, lng: number): void => {
    if (this.alive) {
      this.flyToCalls.push([lat, lng]);
    }
  });
  destroy = vi.fn(() => void this.destroyed++);
}

const EDIT_ROW: MineShelterDto = {
  id: 7,
  address: null,
  name: 'Community Cellar',
  latitude: 59.437,
  longitude: 24.754,
  status: 'ACTIVE',
  source: 'USER',
  createdAt: '2025-09-01T08:00:00Z',
  description: 'Neighbourhood basement',
  capacity: 12,
  submitterVerified: true,
  nonexistentReports: 0,
  reportCount: 0,
  openStatus: null,
  occupancy: null,
  reviewStatus: 'CONFIRMED',
  reviewNote: null,
  locationKind: 'PUBLIC',
  lastVerifiedAt: null,
  inaccurate: false,
  infoRequest: null,
};

const ME: MeResponse = {
  name: 'Owner',
  email: 'owner@example.ee',
  phone: '+372 5555 5555',
  levels: ['EMAIL'],
  isAdmin: false,
};

const REFRESH_401_BODY = {
  timestamp: 't',
  status: 401,
  error: 'Unauthorized',
  message: 'Authentication required',
  path: '/auth/refresh',
};

const MINE_401_BODY = {
  timestamp: 't',
  status: 401,
  error: 'Unauthorized',
  message: 'Authentication required',
  path: '/api/shelters/mine',
};

describe('SubmitShelterPage /submit?edit — the 401 contract (full auth stack)', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let tokens: TokenStore;
  let leaflet: FakeLeafletService;
  let authGateway: FakeAuthGateway;
  let accountGateway: FakeAccountGateway;

  beforeEach(() => {
    localStorage.clear();
    authGateway = new FakeAuthGateway();
    accountGateway = new FakeAccountGateway();
    accountGateway.me.mockResolvedValue(ME);
    leaflet = new FakeLeafletService();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'map', component: MapStub },
          { path: 'login', component: LoginStub, canActivate: [guestGuard] },
          { path: 'verify', component: VerifyStub },
          { path: 'submit', component: SubmitShelterPage, canActivate: [authGuard, verifiedGuard] },
        ]),
        // The central 401 handler, exactly as wired in app.config.ts.
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthGateway, useValue: authGateway },
        { provide: AccountGateway, useValue: accountGateway },
        { provide: GeoGateway, useValue: new FakeGeoGateway() },
        { provide: GeocodeGateway, useValue: new FakeGeocodeGateway() },
        { provide: LeafletService, useValue: leaflet },
      ],
    });
    // The page declares a page-scoped LeafletService; drop it so the root
    // fake is the one the page injects.
    TestBed.overrideComponent(SubmitShelterPage, { remove: { providers: [LeafletService] } });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    tokens = TestBed.inject(TokenStore);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  async function settle(fixture: ReturnType<typeof TestBed.createComponent>, times = 5): Promise<void> {
    for (let i = 0; i < times; i++) {
      await fixture.whenStable();
      fixture.detectChanges();
      await Promise.resolve();
      fixture.detectChanges();
    }
  }

  async function waitUntil(predicate: () => boolean, what: string): Promise<void> {
    for (let i = 0; i < 100; i++) {
      if (predicate()) {
        return;
      }
      await tick();
    }
    throw new Error(`timed out waiting for ${what} (url=${router.url})`);
  }

  /**
   * Wait for the ONE open request matching `predicate`, then return it.
   * The page's ngOnInit rides a change-detection tick behind navigation,
   * so the request is not open by the time navigateByUrl resolves.
   * (match() searches open requests only and hands them over — the
   * returned TestRequest is consumed by the caller's flush.)
   */
  async function waitOne(
    predicate: (req: import('@angular/common/http').HttpRequest<unknown>) => boolean,
    what: string,
  ) {
    for (let i = 0; i < 100; i++) {
      const open = httpMock.match(predicate);
      if (open.length > 1) {
        throw new Error(`expected one open request (${what}), found ${open.length}`);
      }
      if (open.length === 1) {
        return open[0];
      }
      await tick();
    }
    throw new Error(`timed out waiting for an open request (${what})`);
  }

  /**
   * Boot a live session, exactly the owner's starting point: a stored pair,
   * the guard's init rotating it (boot), the verified profile, then the
   * edit row loading from /mine. Ends on /submit?edit=7 with the form.
   */
  async function bootLiveSession(fixture: ReturnType<typeof TestBed.createComponent>): Promise<void> {
    tokens.setTokens('access-live', 'refresh-live');
    authGateway.refresh.mockResolvedValue({
      accessToken: 'access-live2',
      refreshToken: 'refresh-live2',
      expiresIn: 900,
    });
    await router.navigateByUrl('/submit?edit=7');
    // The guard's boot rotation already ran: /mine rides the ROTATED token.
    const mine = await waitOne((r) => r.url.endsWith('/api/shelters/mine'), 'the boot /mine');
    expect(mine.request.headers.get('Authorization')).toBe('Bearer access-live2');
    mine.flush([EDIT_ROW]);
    await settle(fixture);
    expect(router.url).toBe('/submit?edit=7');
    expect(fixture.debugElement.query(By.directive(SubmitShelterPage))).not.toBeNull();
  }

  /**
   * Leave and re-enter the edit route after the pair went stale — the
   * guard sees the stale-but-client-side-"live" session and passes; the
   * first data call of the fresh visit 401s. Returns the pending /mine
   * request (Bearer access-stale) for the caller to flush.
   */
  async function reenterWithStalePair(
    fixture: ReturnType<typeof TestBed.createComponent>,
    refreshBehavior: (authGateway: FakeAuthGateway) => void,
  ) {
    tokens.setTokens('access-stale', 'refresh-stale');
    refreshBehavior(authGateway);
    await router.navigateByUrl('/map');
    await settle(fixture);
    await router.navigateByUrl('/submit?edit=7');
    await settle(fixture, 2);
    const stale = await waitOne((r) => r.url.endsWith('/api/shelters/mine'), 'the re-entry /mine');
    expect(stale.request.headers.get('Authorization')).toBe('Bearer access-stale');
    return stale;
  }

  it('a refresh that DIES: the session is cleared centrally and the user is routed to /login?session=expired — never left on the page', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await bootLiveSession(fixture);

    // Mid-session the access token is expired server-side AND the refresh
    // token was rotated away (another tab) — the client still believes the
    // session is alive: nothing is stored it could check against.
    const stale = await reenterWithStalePair(fixture, (gw) =>
      gw.refresh.mockRejectedValue(ApiError.fromHttp(401, REFRESH_401_BODY, '/auth/refresh')),
    );
    stale.flush(MINE_401_BODY, { status: 401, statusText: 'Unauthorized' });

    // The central handler (api-interceptor): one 401-driven refresh attempt,
    // which 401s -> AuthStore.clearSession -> the bounce, and the error is
    // rethrown so the page never pretends the load succeeded.
    await waitUntil(() => router.url === '/login?session=expired', 'the bounce to /login?session=expired');
    await settle(fixture);

    expect(authGateway.refresh).toHaveBeenCalledTimes(2); // boot + the 401-driven one
    expect(tokens.refresh()).toBeNull(); // the dead session is cleared centrally
    expect(tokens.access()).toBeNull();
    // Routed to login — NOT left on the edit page whose data can never load.
    expect(fixture.debugElement.query(By.directive(SubmitShelterPage))).toBeNull();
    expect(fixture.nativeElement.querySelector('p')?.textContent?.trim()).toBe('login stub');
    // The dead visit never mounted a mini-map (no dead grey box left behind).
    expect(leaflet.created).toBe(1); // only the first, live visit
    expect(leaflet.alive).toBe(false);
  });

  it('a refresh that RECOVERS: retries /mine with the rotated token, renders the form with a LIVE mini-map, and never bounces to login', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await bootLiveSession(fixture);

    // Mid-session the access token is expired, but the refresh token is
    // still the live one — the session is recoverable (no login bounce).
    const stale = await reenterWithStalePair(fixture, (gw) =>
      gw.refresh.mockResolvedValue({
        accessToken: 'access-recovered',
        refreshToken: 'refresh-recovered',
        expiresIn: 900,
      }),
    );
    stale.flush(MINE_401_BODY, { status: 401, statusText: 'Unauthorized' });

    // The interceptor's single retry — with the ROTATED access token.
    const retried = await waitOne((r) => r.url.endsWith('/api/shelters/mine'), 'the post-refresh retry');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer access-recovered');
    retried.flush([EDIT_ROW]);
    await settle(fixture);

    // No login bounce — the session recovered, so the user stays on the edit.
    expect(router.url).toBe('/submit?edit=7');
    const debug = fixture.debugElement.query(By.directive(SubmitShelterPage));
    expect(debug).not.toBeNull();
    const element = debug.nativeElement as HTMLElement;
    // The row loaded: the form is prefilled…
    expect(element.querySelector('form')).not.toBeNull();
    expect(element.querySelector<HTMLInputElement>('#shelter-name')?.value).toBe('Community Cellar');
    // …and the mini-map is LIVE on the late-mounted container (the owner's
    // dead grey box must not exist in this state): a fresh instance for the
    // fresh visit, the saved pin sitting on it.
    expect(leaflet.created).toBe(2); // first visit + this one
    expect(leaflet.alive).toBe(true);
    expect(leaflet.pickCalls.at(-1)).toEqual([59.437, 24.754]);
  });
});
