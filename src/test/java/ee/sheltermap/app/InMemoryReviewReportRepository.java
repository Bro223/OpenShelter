package ee.sheltermap.app;

import ee.sheltermap.domain.ReviewReport;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * In-memory fake of {@link ReviewReportRepository} for tests (mirrors the
 * JPA implementation's semantics; the (review, user) uniqueness is the
 * caller's concern, as in the real DB).
 */
public class InMemoryReviewReportRepository implements ReviewReportRepository {

    private final Map<Long, ReviewReport> store = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public void save(ReviewReport report) {
        if (report.getId() == null) {
            report.setId(nextId++);
        }
        store.put(report.getId(), report);
    }

    @Override
    public boolean existsByReviewIdAndUserId(long reviewId, long userId) {
        return store.values().stream()
                .anyMatch(r -> r.getReviewId() == reviewId && r.getUserId() == userId);
    }

    @Override
    public long countByReviewId(long reviewId) {
        return store.values().stream()
                .filter(r -> r.getReviewId() == reviewId)
                .count();
    }

    public List<ReviewReport> findAll() {
        return new ArrayList<>(store.values());
    }
}
