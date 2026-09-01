package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class FileVerificationSendLogTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-01T10:00:00Z"), ZoneOffset.UTC);

    @TempDir
    Path tempDir;

    private Path logPath() {
        return tempDir.resolve("send.log");
    }

    @Test
    void recordsAndCountsPerUserAndLevel() {
        FileVerificationSendLog log = new FileVerificationSendLog(logPath(), CLOCK);

        log.record(1L, VerificationLevel.EMAIL, "a@example.ee", CLOCK.instant());
        log.record(1L, VerificationLevel.EMAIL, "a@example.ee", CLOCK.instant());
        log.record(1L, VerificationLevel.PHONE, "+37250000000", CLOCK.instant());
        log.record(2L, VerificationLevel.EMAIL, "b@example.ee", CLOCK.instant());

        assertThat(log.countToday(1L, VerificationLevel.EMAIL)).isEqualTo(2);
        assertThat(log.countToday(1L, VerificationLevel.PHONE)).isEqualTo(1);
        assertThat(log.countToday(2L, VerificationLevel.EMAIL)).isEqualTo(1);
        assertThat(log.countToday(3L, VerificationLevel.EMAIL)).isZero();
    }

    @Test
    void lastSentAtReturnsNewestTimestamp() {
        FileVerificationSendLog log = new FileVerificationSendLog(logPath(), CLOCK);

        assertThat(log.lastSentAt(1L, VerificationLevel.EMAIL)).isNull();

        log.record(1L, VerificationLevel.EMAIL, "a@example.ee", CLOCK.instant());
        log.record(1L, VerificationLevel.EMAIL, "a@example.ee", CLOCK.instant().plusSeconds(30));

        assertThat(log.lastSentAt(1L, VerificationLevel.EMAIL))
                .isEqualTo(CLOCK.instant().plusSeconds(30));
    }

    @Test
    void survivesRestartAcrossInstances() {
        // First "boot": two sends recorded.
        FileVerificationSendLog first = new FileVerificationSendLog(logPath(), CLOCK);
        first.record(7L, VerificationLevel.PHONE, "+37250000000", CLOCK.instant());
        first.record(7L, VerificationLevel.PHONE, "+37250000000", CLOCK.instant().plusSeconds(10));

        // Second "boot": a fresh instance on the same path must see the history.
        FileVerificationSendLog second = new FileVerificationSendLog(logPath(), CLOCK);
        assertThat(second.countToday(7L, VerificationLevel.PHONE)).isEqualTo(2);
        assertThat(second.lastSentAt(7L, VerificationLevel.PHONE))
                .isEqualTo(CLOCK.instant().plusSeconds(10));

        // And it keeps appending without losing the earlier entries.
        second.record(7L, VerificationLevel.PHONE, "+37250000000", CLOCK.instant().plusSeconds(20));
        FileVerificationSendLog third = new FileVerificationSendLog(logPath(), CLOCK);
        assertThat(third.countToday(7L, VerificationLevel.PHONE)).isEqualTo(3);
    }

    @Test
    void ignoresCorruptedLines() throws Exception {
        long recent = Instant.parse("2026-09-01T09:00:00Z").toEpochMilli();
        Files.writeString(logPath(), "1\tEMAIL\ta@example.ee\tnot-a-timestamp\n"
                + "garbage line\n"
                + "2\tPHONE\t+37250000000\t" + recent + "\n");

        FileVerificationSendLog log = new FileVerificationSendLog(logPath(), CLOCK);

        assertThat(log.countToday(1L, VerificationLevel.EMAIL)).isZero();
        assertThat(log.countToday(2L, VerificationLevel.PHONE)).isEqualTo(1);
    }

    @Test
    void countsOnlySendsFromToday() {
        // One send yesterday (UTC), one today.
        Instant yesterday = Instant.parse("2026-08-31T22:00:00Z");
        Instant today = CLOCK.instant();

        FileVerificationSendLog log = new FileVerificationSendLog(logPath(), CLOCK);
        log.record(1L, VerificationLevel.EMAIL, "a@example.ee", yesterday);
        log.record(1L, VerificationLevel.EMAIL, "a@example.ee", today);

        assertThat(log.countToday(1L, VerificationLevel.EMAIL)).isEqualTo(1);
    }

    @Test
    void fileIsCreatedOnFirstRecord() {
        FileVerificationSendLog log = new FileVerificationSendLog(logPath(), CLOCK);

        assertThat(Files.exists(logPath())).isFalse();
        log.record(1L, VerificationLevel.EMAIL, "a@example.ee", CLOCK.instant());
        assertThat(Files.exists(logPath())).isTrue();
    }
}
