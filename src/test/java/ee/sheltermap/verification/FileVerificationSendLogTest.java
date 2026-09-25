package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

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
        Files.writeString(logPath(), "1\tEMAIL\tnot-a-timestamp\n"
                + "garbage line\n"
                + "2\tPHONE\t" + recent + "\n"
                // legacy 4-field line (contact column): still loads, contact ignored
                + "3\tEMAIL\tlegacy@example.ee\t" + recent + "\n");

        FileVerificationSendLog log = new FileVerificationSendLog(logPath(), CLOCK);

        assertThat(log.countToday(1L, VerificationLevel.EMAIL)).isZero();
        assertThat(log.countToday(2L, VerificationLevel.PHONE)).isEqualTo(1);
        assertThat(log.countToday(3L, VerificationLevel.EMAIL)).isEqualTo(1);
    }

    @Test
    void theContactIsNotPersistedInTheLogFile() throws Exception {
        // The log file is unencrypted — a raw e-mail/phone in it is a
        // PII leak. Only (userId, level, timestamp) may be stored; the
        // cooldown/cap math needs nothing else.
        FileVerificationSendLog log = new FileVerificationSendLog(logPath(), CLOCK);
        log.record(1L, VerificationLevel.EMAIL, "secret-contact@example.ee", CLOCK.instant());

        String file = Files.readString(logPath());
        assertThat(file).doesNotContain("secret-contact@example.ee");
        assertThat(file).contains("1\tEMAIL\t");
        // ...and the count math still works across a restart
        FileVerificationSendLog reloaded = new FileVerificationSendLog(logPath(), CLOCK);
        assertThat(reloaded.countToday(1L, VerificationLevel.EMAIL)).isEqualTo(1);
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

    @Test
    void dropsEntriesOlderThanTheRetentionWindowOnLoadAndKeepsTheBoundaryEntry() throws Exception {
        // Retention window = 2 days: the cutoff is clock.millis() - 2d,
        // an entry exactly at the cutoff is kept, one millisecond past
        // the window is dropped - and dropped lines are rewritten out of
        // the file, not just memory.
        Instant boundary = CLOCK.instant().minus(Duration.ofDays(2));
        Instant onePast = boundary.minusMillis(1);
        Instant inside = CLOCK.instant().minus(Duration.ofDays(1));

        Files.writeString(logPath(),
                "1\tEMAIL\t" + boundary.toEpochMilli() + "\n"
                        + "2\tEMAIL\t" + onePast.toEpochMilli() + "\n"
                        + "3\tEMAIL\t" + inside.toEpochMilli() + "\n");

        FileVerificationSendLog log = new FileVerificationSendLog(logPath(), CLOCK);

        assertThat(log.lastSentAt(1L, VerificationLevel.EMAIL))
                .as("an entry exactly 2 days old is at the retention boundary and must be kept")
                .isEqualTo(boundary);
        assertThat(log.lastSentAt(2L, VerificationLevel.EMAIL))
                .as("an entry one millisecond past the 2-day retention window must be dropped on load")
                .isNull();
        assertThat(log.lastSentAt(3L, VerificationLevel.EMAIL))
                .isEqualTo(inside);
        assertThat(Files.readAllLines(logPath()))
                .as("dropped entries are rewritten out of the log file, not just memory")
                .hasSize(2)
                .noneMatch(line -> line.startsWith("2\tEMAIL\t"));
    }

    @Test
    void thePruneRewriteFiresAtExactlyTenThousandRecordsAndDropsExpiredEntries() throws Exception {
        // The line budget: record() only prunes once the in-memory list
        // reaches 10,000 entries. Below the cap the file is never
        // rewritten (not even when an expired entry is appended); at the
        // cap the expired entries are dropped and the file is rewritten
        // to the canonical 3-field form (the legacy contact column gone).
        int seededLines = 9_997;
        long dayStart = Instant.parse("2026-09-01T09:00:00Z").toEpochMilli();
        StringBuilder seed = new StringBuilder(seededLines * 48);
        for (int i = 0; i < seededLines; i++) {
            // Legacy 4-field form (contact column) - parseable, fresh.
            seed.append("1\tEMAIL\tlegacy-contact@example.ee\t").append(dayStart + i).append('\n');
        }
        Files.writeString(logPath(), seed.toString());

        FileVerificationSendLog log = new FileVerificationSendLog(logPath(), CLOCK);
        assertThat(Files.readString(logPath()))
                .as("a load that drops nothing must not rewrite the file")
                .contains("legacy-contact@example.ee");

        Instant t1 = CLOCK.instant().plusMillis(1);
        log.record(1L, VerificationLevel.EMAIL, "new@example.ee", t1);
        assertThat(Files.readString(logPath()))
                .as("9,999 records is one short of the 10,000-line budget - no rewrite yet")
                .contains("legacy-contact@example.ee");

        long expired = CLOCK.instant().minus(Duration.ofDays(3)).toEpochMilli();
        log.record(1L, VerificationLevel.EMAIL, "new@example.ee", Instant.ofEpochMilli(expired));
        assertThat(Files.readString(logPath()))
                .as("still below the budget - an expired append must not trigger a rewrite")
                .contains("legacy-contact@example.ee");

        Instant t2 = CLOCK.instant().plusMillis(2);
        log.record(1L, VerificationLevel.EMAIL, "new@example.ee", t2);

        List<String> rewritten = Files.readAllLines(logPath());
        assertThat(rewritten)
                .as("the 10,000th record hits the line budget: expired entries dropped, file rewritten")
                .hasSize(seededLines + 2)
                .noneMatch(line -> line.contains("legacy-contact@example.ee"));
        assertThat(log.countToday(1L, VerificationLevel.EMAIL)).isEqualTo(seededLines + 2L);
        assertThat(log.lastSentAt(1L, VerificationLevel.EMAIL)).isEqualTo(t2);
    }
}
