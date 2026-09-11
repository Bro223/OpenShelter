import {
  OCCUPANCY_FIRM_COPY,
  OCCUPANCY_HEDGED_COPY,
  occupancyText,
  hasReports,
  hasTrustBadges,
  provenanceLabel,
  recencyText,
  statusFlagText,
} from './shelter-copy';
import type { ShelterOccupancy } from '../core/models';

/**
 * The four provenance values are PINNED copy (accessibility-and-provenance
 * D4): the backend's three-valued source + the submitterVerified flag map
 * to exactly these strings, everywhere (map rows, detail header). A copy
 * change is a spec change — these assertions are the gate.
 */
describe('provenanceLabel (D4 copy)', () => {
  it('PAASETEAMET -> "Paasteamet registry"', () => {
    expect(provenanceLabel({ source: 'PAASETEAMET', submitterVerified: false })).toBe(
      'Paasteamet registry',
    );
  });

  it('MUNICIPALITY -> "Municipal registry"', () => {
    expect(provenanceLabel({ source: 'MUNICIPALITY', submitterVerified: false })).toBe(
      'Municipal registry',
    );
  });

  it('USER + submitterVerified -> "Verified user"', () => {
    expect(provenanceLabel({ source: 'USER', submitterVerified: true })).toBe('Verified user');
  });

  it('USER + !submitterVerified -> "User-submitted"', () => {
    expect(provenanceLabel({ source: 'USER', submitterVerified: false })).toBe('User-submitted');
  });

  it('USER + submitterVerified: undefined -> "User-submitted" (truthy coercion, not `!== false`)', () => {
    // A future "fix" to `submitterVerified !== false` would start labelling
    // a missing flag "Verified user" — this pin guards the coercion.
    expect(
      provenanceLabel({ source: 'USER', submitterVerified: undefined as unknown as boolean }),
    ).toBe('User-submitted');
  });

  it('registry rows are false-verified by contract (D3) and never read the flag', () => {
    // submitterVerified is only meaningful for USER rows — a stray true on a
    // registry row must not change the copy.
    expect(provenanceLabel({ source: 'PAASETEAMET', submitterVerified: true })).toBe(
      'Paasteamet registry',
    );
    expect(provenanceLabel({ source: 'MUNICIPALITY', submitterVerified: true })).toBe(
      'Municipal registry',
    );
  });
});

/**
 * Trust-layer copy (shelter-trust-and-reports D4/D6): the map rows and the
 * detail header render the SAME strings — pinned here, the W24 way.
 */
describe('statusFlagText (D1 netting, D6 badges)', () => {
  it('REPORTED_CLOSED -> "Reported closed"', () => {
    expect(statusFlagText('REPORTED_CLOSED')).toBe('Reported closed');
  });

  it('CONFIRMED_OPEN -> "Confirmed open"', () => {
    expect(statusFlagText('CONFIRMED_OPEN')).toBe('Confirmed open');
  });

  it('null flag -> null (render nothing)', () => {
    expect(statusFlagText(null)).toBeNull();
  });
});

describe('occupancy copy (D4: hedged at one, firm at two+)', () => {
  // Deterministic: every assertion passes a fixed `now` — the recency math
  // never depends on the wall clock in tests.
  const NOW = Date.parse('2026-09-11T12:12:00Z');
  const at = (minutesAgo: number): string => new Date(NOW - minutesAgo * 60000).toISOString();
  const occ = (
    band: ShelterOccupancy['band'],
    reportCount: number,
    lastReportedAt: string,
  ): ShelterOccupancy => ({
    band,
    reportCount,
    lastReportedAt,
  });

  it('two+ agreeing fresh reports -> firm copy with the latest recency', () => {
    expect(occupancyText(occ('FULL', 2, at(12)), NOW)).toBe('Full · 12 min ago');
    expect(occupancyText(occ('FULL', 3, at(12)), NOW)).toBe('Full · 12 min ago');
    expect(occupancyText(occ('GETTING_FULL', 2, at(5)), NOW)).toBe('Getting full · 5 min ago');
    expect(occupancyText(occ('SPACE', 2, at(59)), NOW)).toBe('Space available · 59 min ago');
  });

  it('a lone fresh report -> hedged copy (never the firm head)', () => {
    expect(occupancyText(occ('FULL', 1, at(12)), NOW)).toBe('Reported full · 12 min ago');
    expect(occupancyText(occ('GETTING_FULL', 1, at(12)), NOW)).toBe(
      'Reported getting full · 12 min ago',
    );
    expect(occupancyText(occ('SPACE', 1, at(12)), NOW)).toBe(
      'Reported space available · 12 min ago',
    );
  });

  it('the band heads are the pinned D4 vocabulary', () => {
    expect(OCCUPANCY_FIRM_COPY).toEqual({
      SPACE: 'Space available',
      GETTING_FULL: 'Getting full',
      FULL: 'Full',
    });
    expect(OCCUPANCY_HEDGED_COPY).toEqual({
      SPACE: 'Reported space available',
      GETTING_FULL: 'Reported getting full',
      FULL: 'Reported full',
    });
  });
});

describe('recencyText (the "· X ago" suffix)', () => {
  const NOW = Date.parse('2026-09-11T12:12:00Z');
  const at = (minutesAgo: number): string => new Date(NOW - minutesAgo * 60000).toISOString();

  it('sub-minute -> "just now" (no "0 min ago")', () => {
    expect(recencyText(at(0.4), NOW)).toBe('just now');
  });

  it('minutes -> "N min ago"', () => {
    expect(recencyText(at(12), NOW)).toBe('12 min ago');
    expect(recencyText(at(59), NOW)).toBe('59 min ago');
  });

  it('an hour or more -> "N h ago" (rounded)', () => {
    expect(recencyText(at(60), NOW)).toBe('1 h ago');
    expect(recencyText(at(125), NOW)).toBe('2 h ago');
  });
});

describe('trust-badge predicates (D6)', () => {
  it('hasReports: > 0 non-existence reports', () => {
    expect(hasReports({ nonexistentReports: 0 })).toBe(false);
    expect(hasReports({ nonexistentReports: 1 })).toBe(true);
    expect(hasReports({ nonexistentReports: 4 })).toBe(true);
  });

  it('hasTrustBadges: any of reported / statusFlag / occupancy', () => {
    expect(hasTrustBadges({ nonexistentReports: 0, statusFlag: null, occupancy: null })).toBe(
      false,
    );
    expect(hasTrustBadges({ nonexistentReports: 2, statusFlag: null, occupancy: null })).toBe(true);
    expect(
      hasTrustBadges({ nonexistentReports: 0, statusFlag: 'CONFIRMED_OPEN', occupancy: null }),
    ).toBe(true);
    expect(
      hasTrustBadges({
        nonexistentReports: 0,
        statusFlag: null,
        occupancy: { band: 'FULL', reportCount: 1, lastReportedAt: '2026-09-11T12:07:00Z' },
      }),
    ).toBe(true);
  });
});
