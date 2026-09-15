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
 * REJECTED beats everything; a reported-away (INACTIVE + 5 NON_EXISTENT)
 * row is REPORTED_INACTIVE even when official; an admin-hidden row without
 * the report count falls through to its source-based value (documented).
 */
class ProvenanceTest {

    @Test
    void officialRegistryRowIsOfficial() {
        assertThat(Provenance.of(PAASETEAMET, CONFIRMED, ACTIVE, 0)).isEqualTo(OFFICIAL);
    }

    @Test
    void officialRegistryRowWithActiveReportsStaysOfficial() {
        // An ACTIVE row can carry < 5 NON_EXISTENT reports (the 5th auto-hides).
        assertThat(Provenance.of(PAASETEAMET, CONFIRMED, ACTIVE, 3)).isEqualTo(OFFICIAL);
    }

    @Test
    void reportedAwayOfficialRowIsReportedInactive() {
        assertThat(Provenance.of(PAASETEAMET, CONFIRMED, INACTIVE, AUTO_HIDE_THRESHOLD))
                .isEqualTo(REPORTED_INACTIVE);
    }

    @Test
    void partnerRowIsPartnerVerified() {
        assertThat(Provenance.of(MUNICIPALITY, CONFIRMED, ACTIVE, 0)).isEqualTo(PARTNER_VERIFIED);
    }

    @Test
    void newCommunityRowIsUnderReview() {
        assertThat(Provenance.of(USER, NEW, ACTIVE, 0)).isEqualTo(UNDER_REVIEW);
    }

    @Test
    void newCommunityRowWithActiveReportsStaysUnderReview() {
        assertThat(Provenance.of(USER, NEW, ACTIVE, 2)).isEqualTo(UNDER_REVIEW);
    }

    @Test
    void confirmedCommunityRowIsCommunityReported() {
        assertThat(Provenance.of(USER, CONFIRMED, ACTIVE, 0)).isEqualTo(COMMUNITY_REPORTED);
    }

    @Test
    void confirmedCommunityRowWithActiveReportsStaysCommunityReported() {
        assertThat(Provenance.of(USER, CONFIRMED, ACTIVE, AUTO_HIDE_THRESHOLD - 1))
                .isEqualTo(COMMUNITY_REPORTED);
    }

    @Test
    void reportedAwayCommunityRowIsReportedInactive() {
        assertThat(Provenance.of(USER, CONFIRMED, INACTIVE, AUTO_HIDE_THRESHOLD))
                .isEqualTo(REPORTED_INACTIVE);
    }

    @Test
    void adminHiddenCommunityRowWithoutTheReportCountFallsThrough() {
        // Directly hidden by an admin (no report accumulation) — the
        // taxonomy has no "admin-hidden" value; the row keeps its source
        // identity (documented fall-through).
        assertThat(Provenance.of(USER, CONFIRMED, INACTIVE, AUTO_HIDE_THRESHOLD - 1))
                .isEqualTo(COMMUNITY_REPORTED);
    }

    @Test
    void rejectedRowIsRejected() {
        assertThat(Provenance.of(USER, ReviewStatus.REJECTED, INACTIVE, 0)).isEqualTo(REJECTED);
    }

    @Test
    void rejectedBeatsReportedInactive() {
        // A rejected row that also accumulated 5 reports: the admin's REJECT
        // is the most specific statement about the row.
        assertThat(Provenance.of(USER, ReviewStatus.REJECTED, INACTIVE, AUTO_HIDE_THRESHOLD))
                .isEqualTo(REJECTED);
    }

    @Test
    void reportedAwayNewRowIsReportedInactive() {
        // A brand-new community row reported away before it was ever
        // confirmed: the report count speaks louder than the trust state.
        assertThat(Provenance.of(USER, NEW, INACTIVE, AUTO_HIDE_THRESHOLD))
                .isEqualTo(REPORTED_INACTIVE);
    }
}
