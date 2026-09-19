package ee.sheltermap.guidance;

import ee.sheltermap.domain.GuidanceTranslation;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * In-memory fake of {@link GuidanceTranslationRepository} for tests (mirrors
 * the JPA implementation's semantics, including the (post_id, locale) and
 * (locale, slug) uniqueness and the public index ordering). It takes the posts
 * fake so {@link #findPublishedInLocale} can filter by the post's status and
 * order by the post's pinned / publishedAt / id — the same rule the JPA
 * native query encodes.
 *
 * <p>Uniqueness is enforced like the database: a duplicate (post_id, locale) or
 * (locale, slug) is refused with an {@code IllegalStateException} (the tests
 * exercise the service's 409 pre-checks, so a duplicate reaching the store is
 * a programming error, not an expected path).
 */
public class InMemoryGuidanceTranslationRepository implements GuidanceTranslationRepository {

    private final Clock clock;
    private final InMemoryGuidancePostRepository posts;
    private final Map<Long, GuidanceTranslation> store = new LinkedHashMap<>();
    private long nextId = 1;

    public InMemoryGuidanceTranslationRepository(Clock clock, InMemoryGuidancePostRepository posts) {
        this.clock = clock;
        this.posts = posts;
    }

    @Override
    public GuidanceTranslation save(GuidanceTranslation t) {
        if (t.getId() == null) {
            t.setId(nextId++);
        } else {
            // The JPA update-path stamp (the stamp moves on every write).
            t.setUpdatedAt(clock.instant());
        }
        // Enforce the V26 uniqueness the way the database would.
        for (GuidanceTranslation other : store.values()) {
            if (other == t) {
                continue;
            }
            if (other.getPostId() == t.getPostId() && other.getLocale().equals(t.getLocale())) {
                throw new IllegalStateException(
                        "duplicate (post_id, locale): " + t.getPostId() + "/" + t.getLocale());
            }
            if (other.getLocale().equals(t.getLocale()) && other.getSlug().equals(t.getSlug())) {
                throw new IllegalStateException(
                        "duplicate (locale, slug): " + t.getLocale() + "/" + t.getSlug());
            }
        }
        store.put(t.getId(), t);
        return t;
    }

    @Override
    public Optional<GuidanceTranslation> findById(long id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public Optional<GuidanceTranslation> findByPostIdAndLocale(long postId, String locale) {
        return store.values().stream()
                .filter(t -> t.getPostId() == postId && t.getLocale().equals(locale))
                .findFirst();
    }

    @Override
    public List<GuidanceTranslation> findAllByPostId(long postId) {
        return store.values().stream()
                .filter(t -> t.getPostId() == postId)
                .sorted(Comparator.comparing(GuidanceTranslation::getLocale))
                .toList();
    }

    @Override
    public List<GuidanceTranslation> findAllByLocale(String locale) {
        return store.values().stream()
                .filter(t -> t.getLocale().equals(locale))
                .sorted(Comparator.comparingLong(GuidanceTranslation::getPostId)
                        .thenComparingLong(GuidanceTranslation::getId))
                .toList();
    }

    @Override
    public List<GuidanceTranslation> findBySlug(String slug) {
        return store.values().stream()
                .filter(t -> t.getSlug().equals(slug))
                .sorted(Comparator.comparing(GuidanceTranslation::getLocale)
                        .thenComparing(GuidanceTranslation::getId))
                .toList();
    }

    @Override
    public boolean existsByPostIdAndLocale(long postId, String locale) {
        return store.values().stream()
                .anyMatch(t -> t.getPostId() == postId && t.getLocale().equals(locale));
    }

    @Override
    public boolean existsByLocaleAndSlug(String locale, String slug) {
        return store.values().stream()
                .anyMatch(t -> t.getLocale().equals(locale) && t.getSlug().equals(slug));
    }

    @Override
    public List<GuidanceTranslation> findPublishedInLocale(String locale) {
        // The public index order (guidance-manual-order D2): the post's
        // pinned first, then the post's stored manual order (sortOrder
        // asc), then the publishedAt / post-id tie-breakers — read off
        // the owning post.
        List<GuidanceTranslation> rows = new ArrayList<>();
        for (GuidanceTranslation t : store.values()) {
            if (!t.getLocale().equals(locale)) {
                continue;
            }
            posts.findById(t.getPostId()).ifPresent(post -> {
                if (post.isPublished()) {
                    rows.add(t);
                }
            });
        }
        rows.sort(Comparator
                .comparing((GuidanceTranslation t) -> posts.findById(t.getPostId()).orElseThrow().isPinned())
                        .reversed()
                .thenComparingInt(t -> posts.findById(t.getPostId()).orElseThrow().getSortOrder())
                .thenComparing(t -> posts.findById(t.getPostId()).orElseThrow().getPublishedAt(),
                        Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(GuidanceTranslation::getPostId, Comparator.reverseOrder()));
        return rows;
    }

    @Override
    public void delete(GuidanceTranslation t) {
        store.remove(t.getId());
    }

    @Override
    public void deleteAllByPostId(long postId) {
        store.values().removeIf(t -> t.getPostId() == postId);
    }
}
