import { TestBed } from '@angular/core/testing';
import { TokenStore } from './token-store';

describe('TokenStore', () => {
  let store: TokenStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(TokenStore);
  });

  it('starts empty — no access token in memory, no refresh token in storage', () => {
    expect(store.access()).toBeNull();
    expect(store.refresh()).toBeNull();
  });

  it('setTokens keeps the access token in memory and the refresh token in localStorage', () => {
    store.setTokens('access-1', 'refresh-1');
    expect(store.access()).toBe('access-1');
    expect(store.refresh()).toBe('refresh-1');
    expect(localStorage.getItem('os.refresh')).toBe('refresh-1');
  });

  it('survives a reload for the refresh token only (access token is in-memory)', () => {
    store.setTokens('access-1', 'refresh-1');
    // A reload = fresh injector (fresh service instance) over the same storage.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    store = TestBed.inject(TokenStore);

    expect(store.access()).toBeNull(); // in-memory — gone on reload
    expect(store.refresh()).toBe('refresh-1'); // persisted — survives
  });

  it('clear drops both the in-memory access token and the persisted refresh token', () => {
    store.setTokens('access-1', 'refresh-1');
    store.clear();
    expect(store.access()).toBeNull();
    expect(store.refresh()).toBeNull();
    expect(localStorage.getItem('os.refresh')).toBeNull();
  });

  it('clear and refresh tolerate an empty storage without throwing', () => {
    expect(() => store.clear()).not.toThrow();
    expect(store.refresh()).toBeNull();
  });
});
