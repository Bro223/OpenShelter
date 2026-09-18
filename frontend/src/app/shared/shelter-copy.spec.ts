import {
  COMMUNITY_UNVERIFIED_WARNING,
  OCCUPANCY_FIRM_COPY,
  OCCUPANCY_HEDGED_COPY,
  PRIVATE_LOCATION_BADGE,
  PRIVATE_LOCATION_NOTE,
  REPORT_SUBMITTED,
  REPORT_SUBMITTED_DAMPED,
  isPrivateLocation,
  shelterStatusText,
  occupancyText,
  hasReports,
  hasTrustBadges,
  communityTrustLabel,
  sourceTrustLabel,
  communityBadgeClass,
  recencyText,
  openStatusBadgeText,
  isOpenRow,
  reportedBadgeText,
  verifiedAgoText,
  lastVerifiedText,
  communityReportsText,
  hasCommunityReports,
} from './shelter-copy';
import type { ShelterOccupancy } from '../core/models';

/**
 * The source/trust labels are PINNED copy (community-review-queue D5):
 * registry rows say which registry, USER rows say their trust state.
 * A copy change is a spec change — these assertions are the gate.
 */
describe('sourceTrustLabel (pinned copy)', () => {
  it('PAASETEAMET -> "Päästeamet registry"', () => {
    expect(sourceTrustLabel({ source: 'PAASETEAMET', reviewStatus: 'CONFIRMED' })).toBe(
      'Päästeamet registry',
    );
  });

  it('MUNICIPALITY -> "Municipal registry"', () => {
    expect(sourceTrustLabel({ source: 'MUNICIPALITY', reviewStatus: 'CONFIRMED' })).toBe(
      'Municipal registry',
    );
  });

  it('USER rows carry the trust-state label', () => {
    expect(sourceTrustLabel({ source: 'USER', reviewStatus: 'NEW' })).toBe('Newly added');
    expect(sourceTrustLabel({ source: 'USER', reviewStatus: 'CONFIRMED' })).toBe(
      'Community-checked',
    );
    expect(sourceTrustLabel({ source: 'USER', reviewStatus: 'REJECTED' })).toBe('Rejected');
  });

  it('communityTrustLabel maps the lifecycle states', () => {
    expect(communityTrustLabel('NEW')).toBe('Newly added');
    expect(communityTrustLabel('CONFIRMED')).toBe('Community-checked');
    expect(communityTrustLabel('REJECTED')).toBe('Rejected');
  });

  it('the badge tone follows the trust palette', () => {
    expect(communityBadgeClass({ source: 'PAASETEAMET', reviewStatus: 'CONFIRMED' })).toBe('');
    expect(communityBadgeClass({ source: 'MUNICIPALITY', reviewStatus: 'CONFIRMED' })).toBe('');
    expect(communityBadgeClass({ source: 'USER', reviewStatus: 'NEW' })).toBe('badge--new');
    expect(communityBadgeClass({ source: 'USER', reviewStatus: 'CONFIRMED' })).toBe('badge--user');
    expect(communityBadgeClass({ source: 'USER', reviewStatus: 'REJECTED' })).toBe(
      'badge--rejected',
    );
  });
});

describe('community + private copy (community-review-queue)', () => {
  it('the unverified warning is the exact pinned sentence', () => {
    expect(COMMUNITY_UNVERIFIED_WARNING).toBe(
      'This location was submitted by a community member and has not been officially verified. Do not rely on it during an emergency.',
    );
  });

  it('the private badge + note are the exact pinned strings', () => {
    expect(PRIVATE_LOCATION_BADGE).toBe('Private home (declared)');
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
 * detail header render the SAME strings — pinned here as single-sourced copy.
 */

describe('openStatusBadgeText (open-status wave badges)', () => {
  it('a fresh lone CLOSED report -> hedged "Reported closed"', () => {
    expect(
      openStatusBadgeText({ state: 'CLOSED', reportedAt: '2026-09-11T12:00:00Z', reportCount: 1 }),
    ).toBe('Reported closed');
  });

  it('a fresh firm CLOSED net (two+) -> "Closed"', () => {
    expect(
      openStatusBadgeText({ state: 'CLOSED', reportedAt: '2026-09-11T12:00:00Z', reportCount: 2 }),
    ).toBe('Closed');
    expect(
      openStatusBadgeText({ state: 'CLOSED', reportedAt: '2026-09-11T12:00:00Z', reportCount: 5 }),
    ).toBe('Closed');
  });

  it('a fresh OPEN report -> null (open is the default — no noise)', () => {
    expect(
      openStatusBadgeText({ state: 'OPEN', reportedAt: '2026-09-11T12:00:00Z', reportCount: 3 }),
    ).toBeNull();
  });

  it('null (nothing fresh) -> null (render nothing)', () => {
    expect(openStatusBadgeText(null)).toBeNull();
  });
});

describe('shelterStatusText (open-status wave: fresh reports, then lifecycle)', () => {
  const freshClosed = (reportCount: number) => ({
    state: 'CLOSED' as const,
    reportedAt: '2026-09-11T12:00:00Z',
    reportCount,
  });
  const freshOpen = (reportCount: number) => ({
    state: 'OPEN' as const,
    reportedAt: '2026-09-11T12:00:00Z',
    reportCount,
  });

  it('fresh CLOSED at exactly one report -> "Reported closed"', () => {
    expect(shelterStatusText({ status: 'ACTIVE', openStatus: freshClosed(1) })).toBe(
      'Reported closed',
    );
  });

  it('fresh CLOSED at two+ reports -> "Closed" (firm)', () => {
    expect(shelterStatusText({ status: 'ACTIVE', openStatus: freshClosed(2) })).toBe('Closed');
    expect(shelterStatusText({ status: 'ACTIVE', openStatus: freshClosed(4) })).toBe('Closed');
  });

  it('fresh OPEN -> "Open"', () => {
    expect(shelterStatusText({ status: 'ACTIVE', openStatus: freshOpen(1) })).toBe('Open');
    expect(shelterStatusText({ status: 'ACTIVE', openStatus: freshOpen(3) })).toBe('Open');
  });

  it('nothing fresh + ACTIVE -> "Open (no recent reports)"', () => {
    expect(shelterStatusText({ status: 'ACTIVE', openStatus: null })).toBe(
      'Open (no recent reports)',
    );
  });

  it('lifecycle INACTIVE (nothing fresh) -> "Closed" (the admin-facing mapping)', () => {
    expect(shelterStatusText({ status: 'INACTIVE', openStatus: null })).toBe('Closed');
  });

  it('a fresh CLOSED net outranks the lifecycle status (a hidden row that is also closed)', () => {
    expect(shelterStatusText({ status: 'INACTIVE', openStatus: freshClosed(1) })).toBe(
      'Reported closed',
    );
    expect(shelterStatusText({ status: 'INACTIVE', openStatus: freshClosed(2) })).toBe('Closed');
  });
});

describe('isOpenRow (the map\u2019s "Open" chip predicate)', () => {
  const freshClosed = (reportCount: number) => ({
    state: 'CLOSED' as const,
    reportedAt: '2026-09-11T12:00:00Z',
    reportCount,
  });
  const freshOpen = () => ({
    state: 'OPEN' as const,
    reportedAt: '2026-09-11T12:00:00Z',
    reportCount: 1,
  });

  it('keeps fresh OPEN and nothing-fresh rows', () => {
    expect(isOpenRow({ status: 'ACTIVE', openStatus: freshOpen() })).toBe(true);
    expect(isOpenRow({ status: 'ACTIVE', openStatus: null })).toBe(true);
  });

  it('drops fresh CLOSED rows at any report count', () => {
    expect(isOpenRow({ status: 'ACTIVE', openStatus: freshClosed(1) })).toBe(false);
    expect(isOpenRow({ status: 'ACTIVE', openStatus: freshClosed(3) })).toBe(false);
  });

  it('drops lifecycle INACTIVE rows (never public, but the rule covers them)', () => {
    expect(isOpenRow({ status: 'INACTIVE', openStatus: null })).toBe(false);
  });
});

describe('report-submitted notices (D6; dampened variant M9)', () => {
  it('plain notice is pinned', () => {
    expect(REPORT_SUBMITTED).toBe('Your report was submitted.');
  });

  it('dampened notice says the vote was recorded with reduced weight (M9)', () => {
    expect(REPORT_SUBMITTED_DAMPED).toBe(
      'Your report was recorded with reduced weight — you have your own listing of a similar location.',
    );
  });

  it('the two notices are distinct', () => {
    expect(REPORT_SUBMITTED_DAMPED).not.toBe(REPORT_SUBMITTED);
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

  it('hasTrustBadges: any of reported / openStatus / occupancy', () => {
    expect(hasTrustBadges({ nonexistentReports: 0, openStatus: null, occupancy: null })).toBe(
      false,
    );
    expect(hasTrustBadges({ nonexistentReports: 2, openStatus: null, occupancy: null })).toBe(true);
    expect(
      hasTrustBadges({
        nonexistentReports: 0,
        openStatus: { state: 'CLOSED', reportedAt: '2026-09-11T12:00:00Z', reportCount: 1 },
        occupancy: null,
      }),
    ).toBe(true);
    expect(
      hasTrustBadges({
        nonexistentReports: 0,
        openStatus: null,
        occupancy: { band: 'FULL', reportCount: 1, lastReportedAt: '2026-09-11T12:07:00Z' },
      }),
    ).toBe(true);
    // A fresh OPEN openStatus renders NO badge — it must not open the strip.
    expect(
      hasTrustBadges({
        nonexistentReports: 0,
        openStatus: { state: 'OPEN', reportedAt: '2026-09-11T12:00:00Z', reportCount: 2 },
        occupancy: null,
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Last-verified meta (last-verified-meta): PINNED copy — a copy change
// is a spec change.
// ---------------------------------------------------------------------------

describe('reportedBadgeText (M8)', () => {
  it('the badge carries the NON_EXISTENT count that drives it', () => {
    expect(reportedBadgeText(1)).toBe('Reported (1)');
    expect(reportedBadgeText(2)).toBe('Reported (2)');
    expect(reportedBadgeText(4)).toBe('Reported (4)');
  });
});

describe('verifiedAgoText (M8)', () => {
  const NOW = Date.parse('2026-09-13T12:00:00Z');
  const at = (minutesAgo: number): string => new Date(NOW - minutesAgo * 60000).toISOString();

  it('sub-minute -> "just now"', () => {
    expect(verifiedAgoText(at(0.4), NOW)).toBe('just now');
  });

  it('minutes and hours stay relative', () => {
    expect(verifiedAgoText(at(12), NOW)).toBe('12 min ago');
    expect(verifiedAgoText(at(120), NOW)).toBe('2 h ago');
    expect(verifiedAgoText(at(60 * 23), NOW)).toBe('23 h ago');
  });

  it('days stay relative under a week', () => {
    expect(verifiedAgoText(at(60 * 24), NOW)).toBe('1 d ago');
    expect(verifiedAgoText(at(60 * 24 * 6), NOW)).toBe('6 d ago');
  });

  it('a week or more falls back to a concrete date (en-GB)', () => {
    expect(verifiedAgoText(at(60 * 24 * 7), NOW)).toBe('6 Sep 2026');
    expect(verifiedAgoText(at(60 * 24 * 30), NOW)).toBe('14 Aug 2026');
  });
});

describe('lastVerifiedText (M8)', () => {
  const NOW = Date.parse('2026-09-13T12:00:00Z');
  const at = (minutesAgo: number): string => new Date(NOW - minutesAgo * 60000).toISOString();

  it('a verified row reads "Last verified {ago}"', () => {
    expect(
      lastVerifiedText(
        { lastVerifiedAt: at(120), reviewStatus: 'CONFIRMED', createdAt: at(60 * 24 * 400) },
        NOW,
      ),
    ).toBe('Last verified 2 h ago');
  });

  it('a NEW community row is the not-yet-verified signal: submission age + no check', () => {
    expect(
      lastVerifiedText(
        { lastVerifiedAt: null, reviewStatus: 'NEW', createdAt: at(60 * 24 * 3) },
        NOW,
      ),
    ).toBe('Newly added 3 d ago — not yet verified');
  });

  it('a non-NEW row without a record says so plainly', () => {
    for (const reviewStatus of ['CONFIRMED', 'REJECTED'] as const) {
      expect(
        lastVerifiedText({ lastVerifiedAt: null, reviewStatus, createdAt: at(60 * 24 * 400) }, NOW),
      ).toBe('No verification record yet');
    }
  });
});

describe('communityReportsText (M8)', () => {
  it('singular/plural over the TOTAL report count', () => {
    expect(communityReportsText(1)).toBe('1 community report');
    expect(communityReportsText(3)).toBe('3 community reports');
  });

  it('hasCommunityReports: > 0 of any type', () => {
    expect(hasCommunityReports({ reportCount: 0 })).toBe(false);
    expect(hasCommunityReports({ reportCount: 1 })).toBe(true);
  });
});
