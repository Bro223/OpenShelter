import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from './auth-store';
import { authGuard, guestGuard, safeReturnUrl } from './guards';

@Component({ template: 'map stub' })
class MapStub {}

@Component({ template: 'protected stub' })
class ProtectedStub {}

@Component({ template: 'login stub' })
class LoginStub {}

/** Fake AuthStore whose state the tests control directly. */
function fakeStore(overrides: Partial<Record<'authenticated' | 'initialized', boolean>>) {
  const calls = { init: vi.fn() };
  const store = {
    authenticated: vi.fn(() => overrides.authenticated ?? false),
    initialized: vi.fn(() => overrides.initialized ?? true),
    init: calls.init.mockResolvedValue(undefined),
  };
  return { store: store as unknown as AuthStore, calls };
}

describe('safeReturnUrl', () => {
  it('accepts internal absolute paths and rejects anything else', () => {
    expect(safeReturnUrl('/shelters/1')).toBe('/shelters/1');
    expect(safeReturnUrl('/verify')).toBe('/verify');
    expect(safeReturnUrl('//evil.example')).toBe('/map');
    expect(safeReturnUrl('https://evil.example')).toBe('/map');
    expect(safeReturnUrl('/\\evil.example')).toBe('/map');
    expect(safeReturnUrl(null)).toBe('/map');
    expect(safeReturnUrl(undefined)).toBe('/map');
  });
});

describe('authGuard', () => {
  it('lets authenticated users through', async () => {
    const { store } = fakeStore({ authenticated: true });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'protected', canActivate: [authGuard], component: ProtectedStub }]),
        { provide: AuthStore, useValue: store },
      ],
    });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/protected');
    expect(router.url).toBe('/protected');
  });

  it('redirects anonymous users to /login?returnUrl=<current>', async () => {
    const { store } = fakeStore({ authenticated: false });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'protected', canActivate: [authGuard], component: ProtectedStub },
          { path: 'login', component: LoginStub },
        ]),
        { provide: AuthStore, useValue: store },
      ],
    });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/protected');
    expect(router.url).toBe('/login?returnUrl=%2Fprotected');
  });

  it('waits for AuthStore.init() before deciding when not yet initialized', async () => {
    let resolveInit!: () => void;
    const store = {
      authenticated: vi.fn(() => false),
      initialized: vi.fn(() => false),
      init: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveInit = resolve;
          }),
      ),
    } as unknown as AuthStore;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'protected', canActivate: [authGuard], component: ProtectedStub },
          { path: 'login', component: LoginStub },
        ]),
        { provide: AuthStore, useValue: store },
      ],
    });
    const router = TestBed.inject(Router);

    const navigation = router.navigateByUrl('/protected');
    // The guard is blocked on init — wait until it has actually started init.
    await vi.waitFor(() => {
      if (typeof resolveInit !== 'function') {
        throw new Error('guard has not started init yet');
      }
    });
    expect(router.url).not.toBe('/login?returnUrl=%2Fprotected');
    resolveInit();
    await navigation;
    expect(router.url).toBe('/login?returnUrl=%2Fprotected');
  });
});

describe('guestGuard', () => {
  it('lets anonymous users reach the guest pages', async () => {
    const { store } = fakeStore({ authenticated: false });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', canActivate: [guestGuard], component: LoginStub }]),
        { provide: AuthStore, useValue: store },
      ],
    });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/login');
    expect(router.url).toBe('/login');
  });

  it('sends already-authenticated users home (/map)', async () => {
    const { store } = fakeStore({ authenticated: true });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', canActivate: [guestGuard], component: LoginStub },
          { path: 'map', component: MapStub },
        ]),
        { provide: AuthStore, useValue: store },
      ],
    });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/login');
    expect(router.url).toBe('/map');
  });

  it('calls AuthStore.init() before deciding when not yet initialized', async () => {
    const { store, calls } = fakeStore({ authenticated: false, initialized: false });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', canActivate: [guestGuard], component: LoginStub }]),
        { provide: AuthStore, useValue: store },
      ],
    });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/login');
    expect(calls.init).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/login');
  });
});
