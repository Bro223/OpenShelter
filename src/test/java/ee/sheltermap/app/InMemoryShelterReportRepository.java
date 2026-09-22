package ee.sheltermap.app;

import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * In-memory fake of {@link ShelterReportRepository} for tests (mirrors the
 * JPA implementation's semantics; the (shelter, user, type) uniqueness is
 * the caller's concern, as in the real DB).
 */
public class InMemoryShelterReportRepository implements ShelterReportRepository {

    private final Map<Long, ShelterReport> store = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public void save(ShelterReport report) {
        if (report.getId() == null) {
            report.setId(nextId++);
        }
        store.put(report.getId(), report);
    }

    @Override
    public boolean existsByShelterIdAndUserIdAndType(long shelterId, long userId,
                                                     ShelterReportType type) {
        return store.values().stream()
                .anyMatch(r -> r.getShelterId() == shelterId
                        && r.getUserId() == userId
                        && r.getType() == type);
    }

    @Override
    public List<DampedReporter> reportersByShelterIdAndType(long shelterId, ShelterReportType type) {
        // (shelter, user, type) uniqueness ⇒ one row per reporter.
        // Dismissed reports are excluded (the admin's invalid verdict).
        return store.values().stream()
                .filter(r -> r.getShelterId() == shelterId && r.getType() == type)
                .filter(r -> !r.isDismissed())
                .map(r -> new DampedReporter(r.getUserId(), r.isDamped()))
                .toList();
    }

    @Override
    public List<ReportTypeCount> countByTypeForShelterIds(Collection<Long> shelterIds) {
        return store.values().stream()
                .filter(r -> shelterIds.contains(r.getShelterId()))
                .filter(r -> !r.isDismissed())
                .collect(Collectors.groupingBy(r -> new CountKey(r.getShelterId(), r.getType())))
                .entrySet().stream()
                .map(e -> new ReportTypeCount(e.getKey().shelterId, e.getKey().type, e.getValue().size()))
                .toList();
    }

    private record CountKey(long shelterId, ShelterReportType type) {
    }

    @Override
    public List<ConfirmedAt> latestOpenConfirmedByShelterIds(Collection<Long> shelterIds) {
        // (shelter, user) -> newest OPEN_CONFIRMED createdAt
        Map<Long, Map<Long, Instant>> latest = new HashMap<>();
        for (ShelterReport r : store.values()) {
            // Dismissed reports are excluded (the admin's invalid verdict),
            // mirroring the JPA query's "dismissedAt is null" filter.
            if (r.getType() != ShelterReportType.OPEN_CONFIRMED
                    || !shelterIds.contains(r.getShelterId())
                    || r.isDismissed()) {
                continue;
            }
            latest.computeIfAbsent(r.getShelterId(), k -> new HashMap<>())
                    .merge(r.getUserId(), r.getCreatedAt(),
                            (a, b) -> a.isAfter(b) ? a : b);
        }
        List<ConfirmedAt> result = new ArrayList<>();
        latest.forEach((shelterId, byUser) -> byUser.forEach(
                (userId, at) -> result.add(new ConfirmedAt(shelterId, userId, at))));
        return result;
    }

    @Override
    public Optional<ShelterReport> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<ShelterReport> findLatestByShelterId(long shelterId, long offset, int limit) {
        return newestFirst(store.values().stream()
                .filter(r -> r.getShelterId() == shelterId)
                .toList()).stream().skip(offset).limit(limit).toList();
    }

    @Override
    public long countByShelterId(long shelterId) {
        return store.values().stream()
                .filter(r -> r.getShelterId() == shelterId)
                .count();
    }

    private static List<ShelterReport> newestFirst(List<ShelterReport> reports) {
        return reports.stream()
                .sorted(Comparator.comparing(ShelterReport::getCreatedAt).reversed()
                        .thenComparing(ShelterReport::getId, Comparator.reverseOrder()))
                .toList();
    }

    @Override
    public List<ShelterReport> findLatest(long offset, int limit) {
        return newestFirst(new ArrayList<>(store.values())).stream().skip(offset).limit(limit).toList();
    }

    @Override
    public long countAll() {
        return store.size();
    }

    // ---- test-only conveniences (NOT on the production seam) ----
    // The production seam is deliberately bounded (an append-only table
    // must not be read unbounded); assertions in unit tests that inspect
    // the WHOLE fake still need an unbounded view. They take these
    // concrete-type methods — never the seam.

    /** Test inspection only: every stored report, newest first. */
    public List<ShelterReport> findAll() {
        return newestFirst(new ArrayList<>(store.values()));
    }

    /** Test inspection only: one shelter's reports, newest first. */
    public List<ShelterReport> findByShelterId(long shelterId) {
        return newestFirst(store.values().stream()
                .filter(r -> r.getShelterId() == shelterId)
                .toList());
    }
}
