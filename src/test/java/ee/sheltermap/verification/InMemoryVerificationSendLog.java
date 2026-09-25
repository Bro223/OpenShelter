package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Test double for {@link VerificationSendLog} — in-memory, no file I/O.
 * Counts all records (tests are short-lived; the day filter is irrelevant).
 * Use {@link #clear()} between test methods that share a bean.
 */
public class InMemoryVerificationSendLog implements VerificationSendLog {

    private final List<Record> records = new ArrayList<>();

    private record Record(long userId, VerificationLevel level, Instant at) {
    }

    @Override
    public synchronized long countToday(long userId, VerificationLevel level) {
        return records.stream()
                .filter(r -> r.userId() == userId && r.level() == level)
                .count();
    }

    @Override
    public synchronized Instant lastSentAt(long userId, VerificationLevel level) {
        return records.stream()
                .filter(r -> r.userId() == userId && r.level() == level)
                .map(Record::at)
                .max(Instant::compareTo)
                .orElse(null);
    }

    @Override
    public synchronized void record(long userId, VerificationLevel level, String contact, Instant sentAt) {
        records.add(new Record(userId, level, sentAt));
    }

    public synchronized void clear() {
        records.clear();
    }
}
