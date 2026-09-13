import {
  COMMUNITY_UNVERIFIED_WARNING,
  OCCUPANCY_FIRM_COPY,
  OCCUPANCY_HEDGED_COPY,
  PRIVATE_LOCATION_BADGE,
  PRIVATE_LOCATION_NOTE,
  isPrivateLocation,
  occupancyText,
  hasReports,
  hasTrustBadges,
  provenanceBadgeClass,
  provenanceText,
  recencyText,
  statusFlagText,
} from './shelter-copy';
import type { ShelterOccupancy } from '../core/models';

/**
 * The provenance values are PINNED copy (shelter-provenance-taxonomy M6,
 * superseding accessibility-and-provenance D4 + community-review-queue
 * D5; proposed-community-wording M7 renamed the two community states):
 * the server-derived taxonomy value maps to the badge text and tone.
 * A copy change is a spec change — these assertions are the gate.
 */
describe('provenanceText (M6 copy)', () => {
  it('OFFICIAL -> "Paasteamet registry"', () => {
    expect(provenanceText('OFFICIAL')).toBe('Paasteamet registry');
  });

  it('PARTNER_VERIFIED -> "Municipal registry"', () => {
    expect(provenanceText('PARTNER_VERIFIED')).toBe('Municipal registry');
  });

  it('COMMUNITY_REPORTED -> "Community-reported" (M7)', () => {
    expect(provenanceText('COMMUNITY_REPORTED')).toBe('Community-reported');
  });

  it('UNDER_REVIEW -> "Proposed" (M7)', () => {
    expect(provenanceText('UNDER_REVIEW')).toBe('Proposed');
  });

  it('REPORTED_INACTIVE -> "Reported inactive" (/mine + admin surfaces)', () => {
    expect(provenanceText('REPORTED_INACTIVE')).toBe('Reported inactive');
  });

  it('REJECTED -> "Rejected" (/mine + admin surfaces)', () => {
    expect(provenanceText('REJECTED')).toBe('Rejected');
  });

  it('the badge tone follows the marker palette', () => {
    expect(provenanceBadgeClass('OFFICIAL')).toBe('');
    expect(provenanceBadgeClass('PARTNER_VERIFIED')).toBe('');
    expect(provenanceBadgeClass('UNDER_REVIEW')).toBe('badge--new');
    expect(provenanceBadgeClass('COMMUNITY_REPORTED')).toBe('badge--user');
    expect(provenanceBadgeClass('REPORTED_INACTIVE')).toBe('badge--inactive');
    expect(provenanceBadgeClass('REJECTED')).toBe('badge--rejected');
  });
});

describe('community + private copy (community-review-queue)', () => {
  it('the unverified warning is the exact pinned sentence', () => {
    expect(COMMUNITY_UNVERIFIED_WARNING).toBe(
      'This location was submitted by a community member and has not been officially verified. Do not rely on it during an emergency.',
    );
  });

  it('the private badge + note are the exact pinned strings', () => {
    expect(PRIVATE_LOCATION_BADGE).toBe('Private location');
    expect(PRIVATE_LOCATION_NOTE).toBe(
      'This is a resident-offered location, not an official facility.',
    );
  });

  it('isPrivateLocation: only the declared PRIVATE kind', () => {
    expect(isPrivateLocation({ locationKind: 'PRIVATE' })).toBe(true);
    expect(isPrivateLocation({ locationKind: 'PUBLIC' })).toBe(false);
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
