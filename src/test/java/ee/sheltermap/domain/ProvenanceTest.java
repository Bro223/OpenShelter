package ee.sheltermap.domain;

import org.junit.jupiter.api.Test;

import static ee.sheltermap.domain.Provenance.COMMUNITY_REPORTED;
import static ee.sheltermap.domain.Provenance.OFFICIAL;
import static ee.sheltermap.domain.Provenance.PARTNER_VERIFIED;
import static ee.sheltermap.domain.Provenance.REJECTED;
import static ee.sheltermap.domain.Provenance.REPORTED_INACTIVE;
import static ee.sheltermap.domain.Provenance.UNDER_REVIEW;
import static ee.sheltermap.domain.ShelterSource.MUNICIPALITY;
import static ee.sheltermap.domain.ShelterSource.PAASETEAMET;
import static ee.sheltermap.domain.ShelterSource.USER;
import static ee.sheltermap.domain.ShelterStatus.ACTIVE;
import static ee.sheltermap.domain.ShelterStatus.INACTIVE;
import static ee.sheltermap.domain.ShelterReport.AUTO_HIDE_THRESHOLD;
import static ee.sheltermap.domain.ReviewStatus.CONFIRMED;
import static ee.sheltermap.domain.ReviewStatus.NEW;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * The provenance taxonomy decision table (shelter-provenance-taxonomy):
 * every row shape the app can produce, plus the precedence edges —
 * REJECTED beats everything; a reported-away (INACTIVE + the open-report
 * threshold of EITHER kind — 5 NON_EXISTENT or 5 inaccurate) row is
 * REPORTED_INACTIVE even when official; an admin-hidden row without the
 * report count falls through to its source-based value (documented).
 */
class ProvenanceTest {

    @Test
    void officialRegistryRowIsOfficial() {
        assertThat(Provenance.of(PAASETEAMET, CONFIRMED, ACTIVE, 0, 0)).isEqualTo(OFFICIAL);
    }

    @Test
    void officialRegistryRowWithActiveReportsStaysOfficial() {
        // An ACTIVE row can carry < 5 open reports (the 5th auto-hides).
        assertThat(Provenance.of(PAASETEAMET, CONFIRMED, ACTIVE, 3, 0)).isEqualTo(OFFICIAL);
    }

    @Test
    void reportedAwayOfficialRowIsReportedInactive() {
        assertThat(Provenance.of(PAASETEAMET, CONFIRMED, INACTIVE, AUTO_HIDE_THRESHOLD, 0))
                .isEqualTo(REPORTED_INACTIVE);
    }

    @Test
    void reportedAwayOfficialRowOnInaccurateReportsIsReportedInactive() {
        // part 3: the auto-hide is a per-kind rule — five open
        // inaccurate reports (WRONG_LOCATION + OTHER) report a row away
        // just like five open NON_EXISTENT reports do.
        assertThat(Provenance.of(PAASETEAMET, CONFIRMED, INACTIVE, 0, AUTO_HIDE_THRESHOLD))
                .isEqualTo(REPORTED_INACTIVE);
    }

    @Test
    void belowThresholdInaccurateReportsOnInactiveRowStaySourceBased() {
        assertThat(Provenance.of(USER, CONFIRMED, INACTIVE, 0, AUTO_HIDE_THRESHOLD - 1))
                .isEqualTo(COMMUNITY_REPORTED);
    }

    @Test
    void partnerRowIsPartnerVerified() {
        assertThat(Provenance.of(MUNICIPALITY, CONFIRMED, ACTIVE, 0, 0)).isEqualTo(PARTNER_VERIFIED);
    }

    @Test
    void newCommunityRowIsUnderReview() {
        assertThat(Provenance.of(USER, NEW, ACTIVE, 0, 0)).isEqualTo(UNDER_REVIEW);
    }

    @Test
    void newCommunityRowWithActiveReportsStaysUnderReview() {
        assertThat(Provenance.of(USER, NEW, ACTIVE, 2, 0)).isEqualTo(UNDER_REVIEW);
    }

    @Test
    void confirmedCommunityRowIsCommunityReported() {
        assertThat(Provenance.of(USER, CONFIRMED, ACTIVE, 0, 0)).isEqualTo(COMMUNITY_REPORTED);
    }

    @Test
    void confirmedCommunityRowWithActiveReportsStaysCommunityReported() {
        assertThat(Provenance.of(USER, CONFIRMED, ACTIVE, AUTO_HIDE_THRESHOLD - 1, 0))
                .isEqualTo(COMMUNITY_REPORTED);
    }

    @Test
    void confirmedCommunityRowWithActiveInaccurateReportsStaysCommunityReported() {
        assertThat(Provenance.of(USER, CONFIRMED, ACTIVE, 0, AUTO_HIDE_THRESHOLD - 1))
                .isEqualTo(COMMUNITY_REPORTED);
    }

    @Test
    void reportedAwayCommunityRowIsReportedInactive() {
        assertThat(Provenance.of(USER, CONFIRMED, INACTIVE, AUTO_HIDE_THRESHOLD, 0))
                .isEqualTo(REPORTED_INACTIVE);
    }

    @Test
    void reportedAwayCommunityRowOnInaccurateReportsIsReportedInactive() {
        // part 3: an INACTIVE row reported away on the inaccurate kind
        // (WRONG_LOCATION + OTHER open) is REPORTED_INACTIVE even for a
        // partner row — the per-kind rule does not depend on the source.
        assertThat(Provenance.of(MUNICIPALITY, CONFIRMED, INACTIVE, 0, AUTO_HIDE_THRESHOLD))
                .isEqualTo(REPORTED_INACTIVE);
    }

    @Test
    void adminHiddenCommunityRowWithoutTheReportCountFallsThrough() {
        // Directly hidden by an admin (no report accumulation) — the
        // taxonomy has no "admin-hidden" value; the row keeps its source
        // identity (documented fall-through).
        assertThat(Provenance.of(USER, CONFIRMED, INACTIVE, AUTO_HIDE_THRESHOLD - 1, 0))
                .isEqualTo(COMMUNITY_REPORTED);
    }

    @Test
    void rejectedRowIsRejected() {
        assertThat(Provenance.of(USER, ReviewStatus.REJECTED, INACTIVE, 0, 0)).isEqualTo(REJECTED);
    }

    @Test
    void rejectedBeatsReportedInactive() {
        // A rejected row that also accumulated 5 reports: the admin's REJECT
        // is the most specific statement about the row.
        assertThat(Provenance.of(USER, ReviewStatus.REJECTED, INACTIVE, AUTO_HIDE_THRESHOLD, 0))
                .isEqualTo(REJECTED);
    }

    @Test
    void reportedAwayNewRowIsReportedInactive() {
        // A brand-new community row reported away before it was ever
        // confirmed: the report count speaks louder than the trust state.
        assertThat(Provenance.of(USER, NEW, INACTIVE, AUTO_HIDE_THRESHOLD, 0))
                .isEqualTo(REPORTED_INACTIVE);
    }
}
