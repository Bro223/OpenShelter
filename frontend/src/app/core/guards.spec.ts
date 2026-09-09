import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '../session/auth-store';
import { authGuard, guestGuard, safeReturnUrl, verifiedGuard } from './guards';

@Component({ template: 'map stub' })
class MapStub {}

@Component({ template: 'protected stub' })
class ProtectedStub {}

@Component({ template: 'login stub' })
class LoginStub {}

@Component({ template: 'verify stub' })
class VerifyStub {}

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

/** Fake AuthStore that also exposes isVerified() for verifiedGuard. */
function fakeVerifiedStore(verified: boolean, initialized = true) {
  const calls = { init: vi.fn() };
  const store = {
    authenticated: vi.fn(() => true),
    initialized: vi.fn(() => initialized),
    init: calls.init.mockResolvedValue(undefined),
    isVerified: vi.fn(() => verified),
  };
  return { store: store as unknown as AuthStore, calls };
}

describe('verifiedGuard', () => {
  it('lets verified users through', async () => {
    const { store } = fakeVerifiedStore(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'submit', canActivate: [verifiedGuard], component: ProtectedStub },
          { path: 'verify', component: VerifyStub },
        ]),
        { provide: AuthStore, useValue: store },
      ],
    });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/submit');
    expect(router.url).toBe('/submit');
  });

  it('redirects an unverified user to /verify?returnUrl=<current>', async () => {
    const { store } = fakeVerifiedStore(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'submit', canActivate: [verifiedGuard], component: ProtectedStub },
          { path: 'verify', component: VerifyStub },
        ]),
        { provide: AuthStore, useValue: store },
      ],
    });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/submit');
    expect(router.url).toBe('/verify?returnUrl=%2Fsubmit');
  });

  it('waits for AuthStore.init() before deciding when not yet initialized', async () => {
    let resolveInit!: () => void;
    const store = {
      authenticated: vi.fn(() => true),
      initialized: vi.fn(() => false),
      init: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveInit = resolve;
          }),
      ),
      isVerified: vi.fn(() => false),
    } as unknown as AuthStore;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'submit', canActivate: [verifiedGuard], component: ProtectedStub },
          { path: 'verify', component: VerifyStub },
        ]),
        { provide: AuthStore, useValue: store },
      ],
    });
    const router = TestBed.inject(Router);

    const navigation = router.navigateByUrl('/submit');
    // The guard is blocked on init — wait until it has actually started init.
    await vi.waitFor(() => {
      if (typeof resolveInit !== 'function') {
        throw new Error('guard has not started init yet');
      }
    });
    expect(router.url).not.toBe('/verify?returnUrl=%2Fsubmit');
    resolveInit();
    await navigation;
    expect(router.url).toBe('/verify?returnUrl=%2Fsubmit');
  });
});
