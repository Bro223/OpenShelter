package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * File-backed {@link VerificationSendLog} — the durable store behind the
 * per-user daily cap. Unlike an in-memory counter it survives application
 * restarts (product decision), with no database involved.
 *
 * <p>Format: one line per send, tab-separated:
 * {@code <userId>\t<level>\t<epochMillis>}. The cooldown/cap math needs
 * only (userId, level, timestamp), so the raw contact is NOT persisted
 * (PII in an unencrypted log file). Legacy 4-field lines (with a
 * contact column) are still parsed — the contact field is ignored.
 * Lines are appended on every send and loaded into memory at startup;
 * entries older than the retention window are pruned so the file cannot
 * grow forever. Corrupted lines are skipped, never fatal. IO failures
 * are logged, never thrown — the verification flow must not break
 * because the log is unwritable.
 */
public class FileVerificationSendLog implements VerificationSendLog {

    private static final Logger log = LoggerFactory.getLogger(FileVerificationSendLog.class);

    /** Entries older than this are dropped on load / prune. */
    private static final java.time.Duration RETENTION = java.time.Duration.ofDays(2);

    /** Rewrite the file (dropping old entries) once the in-memory list grows past this. */
    private static final int PRUNE_AFTER_LINES = 10_000;

    private final Path path;
    private final Clock clock;
    private final List<SendRecord> records = new ArrayList<>();

    public FileVerificationSendLog(Path path, Clock clock) {
        this.path = Objects.requireNonNull(path, "path");
        this.clock = Objects.requireNonNull(clock, "clock");
        load();
    }

    @Override
    public synchronized long countToday(long userId, VerificationLevel level) {
        long startOfToday = LocalDate.now(clock).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli();
        long count = 0;
        for (SendRecord record : records) {
            if (record.userId() == userId && record.level() == level && record.epochMillis() >= startOfToday) {
                count++;
            }
        }
        return count;
    }

    @Override
    public synchronized Instant lastSentAt(long userId, VerificationLevel level) {
        long newest = -1;
        for (SendRecord record : records) {
            if (record.userId() == userId && record.level() == level && record.epochMillis() > newest) {
                newest = record.epochMillis();
            }
        }
        return newest < 0 ? null : Instant.ofEpochMilli(newest);
    }

    @Override
    public synchronized void record(long userId, VerificationLevel level, String contact, Instant sentAt) {
        // contact is intentionally NOT persisted — PII belongs to no log file
        records.add(new SendRecord(userId, level, sentAt.toEpochMilli()));
        appendToFile(userId, level, sentAt.toEpochMilli());
        if (records.size() >= PRUNE_AFTER_LINES) {
            prune();
        }
    }

    @Override
    public synchronized SendDecision tryRecord(long userId, VerificationLevel level, String contact,
                                               Instant now, long cooldownSeconds, int maxPerDay) {
        // Check + record under ONE lock hold. The helper calls re-enter
        // the (reentrant) monitor, so a burst cannot pass both reads before
        // either records.
        Instant lastSentAt = lastSentAt(userId, level);
        if (cooldownSeconds > 0 && lastSentAt != null && now.isBefore(lastSentAt.plusSeconds(cooldownSeconds))) {
            return SendDecision.COOLDOWN;
        }
        if (maxPerDay > 0 && countToday(userId, level) >= maxPerDay) {
            return SendDecision.DAILY_CAP;
        }
        record(userId, level, contact, now);
        return SendDecision.OK;
    }

    private void appendToFile(long userId, VerificationLevel level, long epochMillis) {
        try {
            Path parent = path.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            String line = userId + "\t" + level.name() + "\t" + epochMillis
                    + System.lineSeparator();
            Files.write(path, line.getBytes(StandardCharsets.UTF_8),
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException e) {
            log.error("Could not append verification send to {}: {}", path, e.getMessage());
        }
    }

    private void load() {
        if (!Files.exists(path)) {
            return;
        }
        try {
            List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
            long cutoff = clock.millis() - RETENTION.toMillis();
            for (String line : lines) {
                SendRecord record = parse(line);
                if (record != null && record.epochMillis() >= cutoff) {
                    records.add(record);
                }
            }
            if (records.size() < lines.size()) {
                rewrite(); // drop pruned entries from disk too
            }
        } catch (IOException e) {
            log.error("Could not read verification send log {}: {}", path, e.getMessage());
        }
    }

    private void prune() {
        long cutoff = clock.millis() - RETENTION.toMillis();
        records.removeIf(r -> r.epochMillis() < cutoff);
        rewrite();
    }

    private void rewrite() {
        try {
            List<String> lines = new ArrayList<>(records.size());
            for (SendRecord record : records) {
                lines.add(record.userId() + "\t" + record.level().name() + "\t"
                        + record.epochMillis());
            }
            Files.write(path, lines, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            log.error("Could not rewrite verification send log {}: {}", path, e.getMessage());
        }
    }

    private static SendRecord parse(String line) {
        String[] parts = line.split("\t", -1);
        // 3 fields = current format; 4 fields = legacy format with a
        // contact column (the contact is ignored — PII was removed).
        if (parts.length != 3 && parts.length != 4) {
            return null;
        }
        try {
            return new SendRecord(
                    Long.parseLong(parts[0].trim()),
                    VerificationLevel.valueOf(parts[1].trim()),
                    Long.parseLong(parts[parts.length - 1].trim()));
        } catch (RuntimeException e) {
            return null; // tolerate a corrupted line
        }
    }

    private record SendRecord(long userId, VerificationLevel level, long epochMillis) {
    }
}
