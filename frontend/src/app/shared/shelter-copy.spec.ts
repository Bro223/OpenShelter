import {
  OCCUPANCY_FIRM_KEY,
  OCCUPANCY_HEDGED_KEY,
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
  straightLineText,
  type ShelterTranslate,
} from './shelter-copy';
import type { OpenStatusDto, ShelterOccupancy } from '../core/models';
import { EN } from '../core/i18n/en';
import { ET } from '../core/i18n/et';
import { MONTH_ABBREVS } from '../core/i18n/locale';
import { interpolate } from '../core/i18n/i18n.service';

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

/**
 * The derived display status no longer has a ROW on the public detail page
 * (owner decision — its Info section shows the last-reported rows instead,
 * pinned in shelter-detail-page.spec.ts). The LIVE public consumers of the
 * rule are the map's "Open" chip (isOpenRow) and the amber badge
 * (openStatusBadgeText) — these cross-pins keep the shared helper and its
 * two consumers following the same rule, and fail loudly if the helper is
 * deleted (the import) or either consumer drifts from it.
 */
describe('the derived-status rule stays single-sourced (chip + badge follow the text)', () => {
  const T = '2026-09-11T12:00:00Z';
  const closed = (reportCount: number) => ({
    state: 'CLOSED' as const,
    reportedAt: T,
    reportCount,
  });
  const open = (reportCount: number) => ({ state: 'OPEN' as const, reportedAt: T, reportCount });

  // The whole ACTIVE matrix (the public list) + every INACTIVE corner.
  const rows: { status: 'ACTIVE' | 'INACTIVE'; openStatus: OpenStatusDto | null }[] = [
    { status: 'ACTIVE', openStatus: open(1) },
    { status: 'ACTIVE', openStatus: open(3) },
    { status: 'ACTIVE', openStatus: closed(1) },
    { status: 'ACTIVE', openStatus: closed(2) },
    { status: 'ACTIVE', openStatus: closed(4) },
    { status: 'ACTIVE', openStatus: null },
    { status: 'INACTIVE', openStatus: null },
    { status: 'INACTIVE', openStatus: open(1) },
    { status: 'INACTIVE', openStatus: closed(1) },
    { status: 'INACTIVE', openStatus: closed(2) },
  ];

  it('the map chip keeps exactly the ACTIVE rows whose derived text reads OPEN, and drops every INACTIVE row', () => {
    for (const row of rows) {
      if (row.status === 'ACTIVE') {
        const text = shelterStatusText(row);
        expect(
          isOpenRow(row),
          `chip vs text for ${JSON.stringify(row)} (derived text "${text}")`,
        ).toBe(text.startsWith('Open'));
      } else {
        // INACTIVE never reaches the public list — the chip drops it
        // regardless of a fresh report.
        expect(isOpenRow(row), `chip must drop ${JSON.stringify(row)}`).toBe(false);
      }
    }
  });

  it('the amber badge carries the derived text itself on fresh-CLOSED rows, and nothing otherwise', () => {
    for (const row of rows) {
      const badge = openStatusBadgeText(row.openStatus);
      if (row.openStatus === null || row.openStatus.state === 'OPEN') {
        expect(badge, `badge for ${JSON.stringify(row)}`).toBeNull();
      } else {
        expect(badge, `badge for ${JSON.stringify(row)}`).toBe(shelterStatusText(row));
      }
    }
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

  it('the band heads are catalog keys — the firm set REUSES the band picker\u2019s detail.band.* (N7 i18n-completeness)', () => {
    expect(OCCUPANCY_FIRM_KEY).toEqual({
      SPACE: 'detail.band.space',
      GETTING_FULL: 'detail.band.gettingFull',
      FULL: 'detail.band.full',
    });
    expect(OCCUPANCY_HEDGED_KEY).toEqual({
      SPACE: 'shelter.occupancy.hedged.space',
      GETTING_FULL: 'shelter.occupancy.hedged.gettingFull',
      FULL: 'shelter.occupancy.hedged.full',
    });
    // The EN catalog values are byte-identical to the old pinned copy —
    // the routing changed the mechanism, not the words.
    expect(EN[OCCUPANCY_FIRM_KEY.SPACE]).toBe('Space available');
    expect(EN[OCCUPANCY_FIRM_KEY.GETTING_FULL]).toBe('Getting full');
    expect(EN[OCCUPANCY_FIRM_KEY.FULL]).toBe('Full');
    expect(EN[OCCUPANCY_HEDGED_KEY.SPACE]).toBe('Reported space available');
    expect(EN[OCCUPANCY_HEDGED_KEY.GETTING_FULL]).toBe('Reported getting full');
    expect(EN[OCCUPANCY_HEDGED_KEY.FULL]).toBe('Reported full');
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

  it('a verified registry row names the registry the stamp came from', () => {
    for (const source of ['PAASETEAMET', 'MUNICIPALITY'] as const) {
      expect(
        lastVerifiedText(
          {
            lastVerifiedAt: at(120),
            reviewStatus: 'CONFIRMED',
            createdAt: at(60 * 24 * 400),
            source,
          },
          NOW,
        ),
      ).toBe('Last verified against the registry 2 h ago');
    }
  });

  it('a verified community row keeps the plain form (no registry attribution)', () => {
    expect(
      lastVerifiedText(
        {
          lastVerifiedAt: at(120),
          reviewStatus: 'CONFIRMED',
          createdAt: at(60 * 24 * 400),
          source: 'USER',
        },
        NOW,
      ),
    ).toBe('Last verified 2 h ago');
  });

  it('a NEW community row is the not-yet-verified signal: submission age + no check', () => {
    expect(
      lastVerifiedText(
        { lastVerifiedAt: null, reviewStatus: 'NEW', createdAt: at(60 * 24 * 3), source: 'USER' },
        NOW,
      ),
    ).toBe('Newly added 3 d ago — not yet verified');
  });

  it('a non-NEW row without a record says so plainly', () => {
    for (const reviewStatus of ['CONFIRMED', 'REJECTED'] as const) {
      expect(
        lastVerifiedText(
          { lastVerifiedAt: null, reviewStatus, createdAt: at(60 * 24 * 400), source: 'USER' },
          NOW,
        ),
      ).toBe('No verification record yet');
    }
  });
});

describe('communityReportsText (M8)', () => {
  it('labels the count as the labeled TOTAL over all types — never a live tally', () => {
    expect(communityReportsText(1)).toBe('Community reports: 1 (total, all types)');
    expect(communityReportsText(3)).toBe('Community reports: 3 (total, all types)');
  });

  it('hasCommunityReports: > 0 of any type', () => {
    expect(hasCommunityReports({ reportCount: 0 })).toBe(false);
    expect(hasCommunityReports({ reportCount: 1 })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Locale seam (N7 i18n-completeness): the same facts, resolved through a
// translate callback — the ET proofs below assert the ET catalog value
// flows through (interpolate(ET[key], params)), i.e. the seam renders the
// active locale and one fact has exactly one translation. The EN fallback
// (no callback) is already pinned everywhere above — byte-identical.
// ---------------------------------------------------------------------------

describe('locale seam (N7 i18n-completeness)', () => {
  const et: ShelterTranslate = (key, params) => interpolate(ET[key], params ?? {});

  const NOW = Date.parse('2026-09-11T12:12:00Z');
  const at = (minutesAgo: number): string => new Date(NOW - minutesAgo * 60000).toISOString();
  const occ = (
    band: ShelterOccupancy['band'],
    reportCount: number,
    lastReportedAt: string,
  ): ShelterOccupancy => ({ band, reportCount, lastReportedAt });

  it('sourceTrustLabel resolves the account.contrib.* twins in the active locale', () => {
    expect(sourceTrustLabel({ source: 'PAASETEAMET', reviewStatus: 'CONFIRMED' }, et)).toBe(
      ET['account.contrib.source.paasteamet'],
    );
    expect(sourceTrustLabel({ source: 'MUNICIPALITY', reviewStatus: 'CONFIRMED' }, et)).toBe(
      ET['account.contrib.source.municipality'],
    );
    expect(sourceTrustLabel({ source: 'USER', reviewStatus: 'NEW' }, et)).toBe(
      ET['account.contrib.badge.new'],
    );
    expect(communityTrustLabel('CONFIRMED', et)).toBe(ET['account.contrib.badge.confirmed']);
  });

  it('the badge heads and recency render in ET (the seam reaches the catalog)', () => {
    expect(occupancyText(occ('FULL', 2, at(12)), NOW, et)).toBe(
      `${ET['detail.band.full']} \u00b7 ${interpolate(ET['shelter.recency.minutes'], { minutes: 12 })}`,
    );
    // Locale proof: the ET render is NOT the EN string.
    expect(occupancyText(occ('FULL', 2, at(12)), NOW, et)).not.toBe('Full \u00b7 12 min ago');
    expect(recencyText(at(12), NOW, et)).toBe(interpolate(ET['shelter.recency.minutes'], { minutes: 12 }));
    expect(openStatusBadgeText({ state: 'CLOSED', reportedAt: at(0), reportCount: 1 }, et)).toBe(
      ET['shelter.status.reportedClosed'],
    );
    expect(shelterStatusText({ status: 'ACTIVE', openStatus: null }, et)).toBe(
      ET['shelter.status.openNoReports'],
    );
  });

  it('the meta lines render in ET, with the month data from the active locale', () => {
    const NOW2 = Date.parse('2026-09-13T12:00:00Z');
    const at2 = (minutesAgo: number): string => new Date(NOW2 - minutesAgo * 60000).toISOString();
    const weekAgo = at2(60 * 24 * 7); // 6 Sep 2026
    expect(verifiedAgoText(weekAgo, NOW2, et, MONTH_ABBREVS.et)).toBe(
      interpolate(ET['shelter.recency.date'], {
        day: 6,
        month: MONTH_ABBREVS.et[8],
        year: 2026,
      }),
    );
    expect(
      lastVerifiedText(
        { lastVerifiedAt: at2(120), reviewStatus: 'CONFIRMED', createdAt: at2(60 * 24 * 400), source: 'USER' },
        NOW2,
        et,
        MONTH_ABBREVS.et,
      ),
    ).toBe(interpolate(ET['shelter.lastVerified'], { ago: interpolate(ET['shelter.recency.hours'], { hours: 2 }) }));
    expect(
      lastVerifiedText(
        { lastVerifiedAt: null, reviewStatus: 'NEW', createdAt: at2(60 * 24 * 3), source: 'USER' },
        NOW2,
        et,
        MONTH_ABBREVS.et,
      ),
    ).toBe(
      interpolate(ET['shelter.newlyAddedUnverified'], {
        ago: interpolate(ET['shelter.recency.days'], { days: 3 }),
      }),
    );
    expect(
      lastVerifiedText(
        { lastVerifiedAt: null, reviewStatus: 'REJECTED', createdAt: at2(60 * 24 * 400), source: 'USER' },
        NOW2,
        et,
        MONTH_ABBREVS.et,
      ),
    ).toBe(ET['shelter.noVerificationRecord']);
    expect(reportedBadgeText(3, et)).toBe(interpolate(ET['shelter.reportedBadge'], { count: 3 }));
    expect(communityReportsText(3, et)).toBe(
      interpolate(ET['shelter.communityReports'], { count: 3 }),
    );
  });

  it('straightLineText renders the distance honesty copy in ET', () => {
    expect(straightLineText(0.4, et)).toBe(
      interpolate(ET['shelter.distance.meters'], { distance: 400 }),
    );
    expect(straightLineText(1.456, et)).toBe(
      interpolate(ET['shelter.distance.kilometers'], { distance: '1.5' }),
    );
    // EN fallback stays the pinned honesty wording.
    expect(straightLineText(0.4)).toBe('\u2248 400 m straight line');
    expect(straightLineText(1.456)).toBe('\u2248 1.5 km straight line');
  });
});
