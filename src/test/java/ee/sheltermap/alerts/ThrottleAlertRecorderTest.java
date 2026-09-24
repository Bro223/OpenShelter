package ee.sheltermap.alerts;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The admin alert ring: newest-first ordering,
 * oldest-first eviction past the retention bound, limit clamping, the
 * disabled mode ({@code retained <= 0}) and the subject normalization
 * (the alert's contact subject matches the limiter's bucket key).
 */
class ThrottleAlertRecorderTest {

    private static final Instant T0 = Instant.parse("2026-09-13T08:00:00Z");
    private static final Clock CLOCK = Clock.fixed(T0, ZoneOffset.UTC);

    @Test
    void recentReturnsNewestFirstWithMonotonicIds() {
        ThrottleAlertRecorder recorder = new ThrottleAlertRecorder(10, CLOCK);
        recorder.submissionDailyCap(1, 300);
        recorder.nearDuplicate(2, 7);
        recorder.otpContactCap("a@b.ee", 120);

        List<ThrottleAlert> all = recorder.recent(10);
        assertThat(all).hasSize(3);
        assertThat(all.get(0).kind()).isEqualTo(ThrottleAlert.KIND_OTP_CONTACT_CAP);
        assertThat(all.get(1).kind()).isEqualTo(ThrottleAlert.KIND_NEAR_DUPLICATE);
        assertThat(all.get(2).kind()).isEqualTo(ThrottleAlert.KIND_SUBMISSION_DAILY_CAP);
        assertThat(all).extracting(ThrottleAlert::id).containsExactly(3L, 2L, 1L);
        assertThat(all).allSatisfy(a -> assertThat(a.at()).isEqualTo(T0));
    }

    @Test
    void theOldestEventEvictsFirstBeyondRetained() {
        ThrottleAlertRecorder recorder = new ThrottleAlertRecorder(3, CLOCK);
        for (long userId = 1; userId <= 5; userId++) {
            recorder.submissionDailyCap(userId, 60);
        }

        assertThat(recorder.size()).isEqualTo(3);
        // The two oldest (users 1 + 2) are gone; the ring keeps 3..5.
        assertThat(recorder.recent(10))
                .extracting(a -> a.subject())
                .containsExactly("user:5", "user:4", "user:3");
    }

    @Test
    void limitClampsToTheRingSizeAndToAtLeastOne() {
        ThrottleAlertRecorder recorder = new ThrottleAlertRecorder(10, CLOCK);
        for (long userId = 1; userId <= 5; userId++) {
            recorder.nearDuplicate(userId, 1);
        }

        assertThat(recorder.recent(2)).extracting(ThrottleAlert::id).containsExactly(5L, 4L);
        assertThat(recorder.recent(100)).hasSize(5);
        // limit <= 0 clamps to 1 — the single newest row.
        assertThat(recorder.recent(0)).extracting(ThrottleAlert::id).containsExactly(5L);
    }

    @Test
    void retainedZeroDisablesRecording() {
        ThrottleAlertRecorder disabled = new ThrottleAlertRecorder(0, CLOCK);
        disabled.submissionDailyCap(1, 300);
        disabled.otpContactCap("a@b.ee", 120);

        assertThat(disabled.size()).isZero();
        assertThat(disabled.recent(10)).isEmpty();
    }

    @Test
    void theOtpContactSubjectIsNormalizedLikeTheLimiterKey() {
        ThrottleAlertRecorder recorder = new ThrottleAlertRecorder(10, CLOCK);
        recorder.otpContactCap("  Upper.Case@Example.EE  ", 45);

        ThrottleAlert alert = recorder.recent(1).get(0);
        assertThat(alert.kind()).isEqualTo(ThrottleAlert.KIND_OTP_CONTACT_CAP);
        assertThat(alert.subject()).isEqualTo("contact:upper.case@example.ee");
        assertThat(alert.retryAfterSeconds()).isEqualTo(45);
        assertThat(alert.detail()).contains("429");
    }

    @Test
    void theUserScopedAlertsCarryTheUserIdAndTheDuplicateCarriesTheRowId() {
        ThrottleAlertRecorder recorder = new ThrottleAlertRecorder(10, CLOCK);
        recorder.submissionDailyCap(42, 300);
        recorder.nearDuplicate(43, 7);

        ThrottleAlert cap = recorder.recent(10).get(1);
        assertThat(cap.kind()).isEqualTo(ThrottleAlert.KIND_SUBMISSION_DAILY_CAP);
        assertThat(cap.subject()).isEqualTo("user:42");
        assertThat(cap.retryAfterSeconds()).isEqualTo(300);

        ThrottleAlert dup = recorder.recent(10).get(0);
        assertThat(dup.kind()).isEqualTo(ThrottleAlert.KIND_NEAR_DUPLICATE);
        assertThat(dup.subject()).isEqualTo("user:43");
        assertThat(dup.retryAfterSeconds()).isNull();
        assertThat(dup.detail()).contains("#7");
    }

    @Test
    void clearResetsTheRingAndTheIdSequence() {
        ThrottleAlertRecorder recorder = new ThrottleAlertRecorder(10, CLOCK);
        recorder.nearDuplicate(1, 2);
        recorder.clear();

        assertThat(recorder.size()).isZero();
        recorder.submissionDailyCap(9, 60);
        assertThat(recorder.recent(1)).extracting(ThrottleAlert::id).containsExactly(1L);
    }
}
