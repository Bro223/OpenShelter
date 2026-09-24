package ee.sheltermap.guidance;

import ee.sheltermap.domain.GuidancePost;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * In-memory fake of {@link GuidancePostRepository} for tests (mirrors
 * the JPA implementation's semantics, including its ordering and the
 * updated_at stamp on every update save — the injected Clock plays the
 * role of the JPA repository's Clock, so an unpublish (whose domain
 * method carries no instant) still moves updatedAt).
 *
 * <p>Ordering rules (the ordering tests assert through this fake):
 * <ul>
 *   <li>admin list — {@code sortOrder} ascending, {@code id} descending
 * (the live preview of the public order, guidance-manual-order —
 *       locale-blind, the admin sees every language);</li>
 *   <li>public list — the ONE requested locale, pinned first, then
 *       {@code sortOrder} ascending, then {@code publishedAt} descending
 *       (tie-breaker — {@code sortOrder} is not uniqueness-constrained),
 *       {@code id} descending (same-value rows stay put, so repeated
 *       calls are stable).</li>
 * </ul>
 */
public class InMemoryGuidancePostRepository implements GuidancePostRepository {

    /** The admin list order: the stored manual order, id desc tie-break. */
    private static final Comparator<GuidancePost> ADMIN_ORDER =
            Comparator.comparingInt(GuidancePost::getSortOrder)
                    .thenComparing(GuidancePost::getId, Comparator.reverseOrder());

    /** The GLOBAL stored manual order (admin-locale-scope): sortOrder asc,
     *  publishedAt desc with nulls LAST (a draft's NULL stamp ranks after
     *  any stamped instant — the V28 backfill's tie-break rule), id desc.
     *  The locale-scoped admin list and the locale-scoped reorder both
     *  walk this order. */
    private static final Comparator<GuidancePost> GLOBAL_ORDER =
            Comparator.comparingInt(GuidancePost::getSortOrder)
                    .thenComparing(
                            GuidancePost::getPublishedAt,
                            Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(GuidancePost::getId, Comparator.reverseOrder());

    private final Clock clock;
    private final Map<Long, GuidancePost> store = new LinkedHashMap<>();
    private long nextId = 1;

    public InMemoryGuidancePostRepository(Clock clock) {
        this.clock = clock;
    }

    @Override
    public GuidancePost save(GuidancePost post) {
        if (post.getId() == null) {
            post.setId(nextId++);
        } else {
            // The JPA update-path stamp: updated_at moves on every write.
            post.setUpdatedAt(clock.instant());
        }
        store.put(post.getId(), post);
        return post;
    }

    @Override
    public Optional<GuidancePost> findById(long id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<GuidancePost> findByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return ids.stream()
                .map(store::get)
                .filter(Objects::nonNull)
                .toList();
    }

    @Override
    public Optional<GuidancePost> findBySlug(String slug) {
        return store.values().stream()
                .filter(p -> p.getSlug().equals(slug))
                .findFirst();
    }

    @Override
    public boolean existsBySlug(String slug) {
        return store.values().stream().anyMatch(p -> p.getSlug().equals(slug));
    }

    @Override
    public List<GuidancePost> findAllForAdmin() {
        return sorted(new ArrayList<>(store.values()), ADMIN_ORDER);
    }

    @Override
    public List<GuidancePost> findAllInStoredGlobalOrder() {
        return sorted(new ArrayList<>(store.values()), GLOBAL_ORDER);
    }

    @Override
    public int maxSortOrder() {
        return store.values().stream()
                .mapToInt(GuidancePost::getSortOrder)
                .max()
                .orElse(0);
    }

    @Override
    public Optional<GuidancePost> findPublishedBySlugAndLocale(String slug, String locale) {
        return findBySlug(slug)
                .filter(p -> p.isPublished() && p.getLocale().equals(locale));
    }

    @Override
    public List<GuidancePost> findByHeroImageId(long mediaAssetId) {
        return sorted(store.values().stream()
                .filter(p -> p.getHeroImageId() != null && p.getHeroImageId() == mediaAssetId)
                .toList(), ADMIN_ORDER);
    }

    @Override
    public void delete(GuidancePost post) {
        store.remove(post.getId());
    }

    private static List<GuidancePost> sorted(List<GuidancePost> posts, Comparator<GuidancePost> order) {
        return posts.stream().sorted(order).toList();
    }

    /**
     * Package-private (test-tree only): every stored post, in storage
     * order — the in-memory twin of the JPA layer's single group-by
     * query, used by {@link InMemoryMediaAssetRepository} for the
     * reused-by counts (one pass, no per-asset loop).
     */
    List<GuidancePost> allPosts() {
        return List.copyOf(store.values());
    }
}
