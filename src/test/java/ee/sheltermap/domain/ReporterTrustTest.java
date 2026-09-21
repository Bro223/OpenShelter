package ee.sheltermap.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The derived reporter trust weight (community-self-moderation D1):
 * baseline 1, +1 for a cross-verified own submission, +1 for a proven
 * track record of positive reports (≥ 2 own AUTO_CONFIRMs), capped at 3.
 */
class ReporterTrustTest {

    @Test
    void aFreshVerifiedAccountIsBaseline() {
        ReporterTrust trust = ReporterTrust.of(false, 0);
        assertThat(trust.weight()).isEqualTo(ReporterTrust.BASELINE);
    }

    @Test
    void aCrossVerifiedOwnSubmissionAddsOnePoint() {
        assertThat(ReporterTrust.of(true, 0).weight()).isEqualTo(2);
    }

    @Test
    void oneAutoConfirmIsNotYetAPattern() {
        assertThat(ReporterTrust.of(false, 1).weight()).isEqualTo(1);
    }

    @Test
    void twoOwnAutoConfirmsAddTheSecondPoint() {
        assertThat(ReporterTrust.of(false, 2).weight()).isEqualTo(2);
        assertThat(ReporterTrust.of(false, 10).weight()).isEqualTo(2);
    }

    @Test
    void bothSignalsReachTheCap() {
        assertThat(ReporterTrust.of(true, 2).weight()).isEqualTo(ReporterTrust.MAX);
        assertThat(ReporterTrust.of(true, 99).weight()).isEqualTo(ReporterTrust.MAX);
    }

    @Test
    void aWeightOutsideTheRangeIsRejected() {
        assertThatThrownBy(() -> new ReporterTrust(0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ReporterTrust(4))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ReporterTrust.of(false, -1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
