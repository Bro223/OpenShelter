package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

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
        // P2-5: the log file is unencrypted — a raw e-mail/phone in it is a
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
    void concurrentTryRecordHonorsTheDailyCapExactly() throws Exception {
        // S7 (2026-09-11 review): the atomic tryRecord (M16) under a real
        // burst — 50 threads released by one latch, maxPerDay=2, cooldown 0.
        // A check-then-act race would let more than 2 threads past both
        // reads; the cap must hold at EXACTLY 2 OKs, the rest DAILY_CAP.
        FileVerificationSendLog log = new FileVerificationSendLog(logPath(), CLOCK);
        int threads = 50;
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        List<VerificationSendLog.SendDecision> decisions = Collections.synchronizedList(new ArrayList<>());
        for (int i = 0; i < threads; i++) {
            new Thread(() -> {
                try {
                    release.await();
                    decisions.add(log.tryRecord(1L, VerificationLevel.EMAIL, "a@example.ee",
                            CLOCK.instant(), 0, 2));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            }, "try-record-burst-" + i).start();
        }
        release.countDown();
        assertThat(done.await(10, TimeUnit.SECONDS)).isTrue();

        assertThat(decisions).hasSize(threads);
        assertThat(decisions).filteredOn(d -> d == VerificationSendLog.SendDecision.OK).hasSize(2);
        assertThat(decisions)
                .filteredOn(d -> d == VerificationSendLog.SendDecision.DAILY_CAP)
                .hasSize(threads - 2);
        // and the store agrees: exactly the two allowed sends were recorded
        assertThat(log.countToday(1L, VerificationLevel.EMAIL)).isEqualTo(2);
    }
}
