import { TestBed } from '@angular/core/testing';
import { ConsentStore } from './consent-store';

/**
 * The first-level consent store: a necessary-only acknowledgment (no
 * optional categories exist today), persisted under openshelter-consent
 * with a version so a future category addition re-prompts.
 */
describe('ConsentStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts undecided when nothing is stored', () => {
    const store = TestBed.inject(ConsentStore);
    expect(store.decided()).toBe(false);
  });

  it('acknowledge() flips decided and persists a versioned necessary decision', () => {
    const store = TestBed.inject(ConsentStore);
    store.acknowledge();

    expect(store.decided()).toBe(true);
    const raw = localStorage.getItem('openshelter-consent');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? '{}') as {
      version: number;
      decision: string;
      acknowledgedAt: string;
    };
    expect(parsed.version).toBe(1);
    expect(parsed.decision).toBe('necessary');
    expect(parsed.acknowledgedAt).toEqual(expect.any(String));
  });

  it('a stored valid decision is adopted on a fresh store (banner stays hidden)', () => {
    localStorage.setItem(
      'openshelter-consent',
      JSON.stringify({ version: 1, decision: 'necessary', acknowledgedAt: 't' }),
    );
    const store = TestBed.inject(ConsentStore);
    expect(store.decided()).toBe(true);
  });

  it('a stale (older) version is treated as undecided so the banner re-prompts', () => {
    localStorage.setItem(
      'openshelter-consent',
      JSON.stringify({ version: 0, decision: 'necessary', acknowledgedAt: 't' }),
    );
    const store = TestBed.inject(ConsentStore);
    expect(store.decided()).toBe(false);
  });

  it('a corrupt or non-record value falls back to undecided instead of crashing', () => {
    localStorage.setItem('openshelter-consent', 'not-json');
    const store = TestBed.inject(ConsentStore);
    expect(store.decided()).toBe(false);
  });
});
