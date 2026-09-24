package ee.sheltermap.guidance;

import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.MediaAsset;

import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * In-memory fake of {@link MediaAssetRepository} for tests (mirrors the
 * JPA implementation's semantics, including its newest-first listing).
 *
 * <p>The referenced counts are computed against the shared
 * {@link InMemoryGuidancePostRepository} — one pass over the posts, the
 * in-memory twin of the JPA layer's single group-by query (no
 * per-asset loop). Wire both fakes to the SAME posts instance.
 */
public class InMemoryMediaAssetRepository implements MediaAssetRepository {

    private final InMemoryGuidancePostRepository posts;
    private final Map<Long, MediaAsset> store = new LinkedHashMap<>();
    private long nextId = 1;

    public InMemoryMediaAssetRepository(InMemoryGuidancePostRepository posts) {
        this.posts = Objects.requireNonNull(posts, "posts");
    }

    @Override
    public MediaAsset save(MediaAsset asset) {
        if (asset.getId() == null) {
            asset.setId(nextId++);
        }
        store.put(asset.getId(), asset);
        return asset;
    }

    @Override
    public Optional<MediaAsset> findById(long id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public Optional<MediaAsset> findByStoredFilename(String storedFilename) {
        return store.values().stream()
                .filter(a -> a.getStoredFilename().equals(storedFilename))
                .findFirst();
    }

    @Override
    public List<MediaAsset> findAll() {
        // Newest first; the id tie-break keeps same-timestamp rows stable.
        return store.values().stream()
                .sorted(Comparator.comparing(MediaAsset::getCreatedAt).reversed()
                        .thenComparing(MediaAsset::getId, Comparator.reverseOrder()))
                .toList();
    }

    @Override
    public List<MediaAsset> findByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return ids.stream()
                .map(store::get)
                .filter(Objects::nonNull)
                .toList();
    }

    @Override
    public List<MediaAsset> findPage(long offset, int limit) {
        return findAll().stream().skip(offset).limit(limit).toList();
    }

    @Override
    public long countAll() {
        return store.size();
    }

    @Override
    public Map<Long, Long> referencedCountsByAssetId() {
        // One pass over the shared posts store (the JPA twin is ONE
        // batched group-by); assets no post references are absent.
        Map<Long, Long> counts = new HashMap<>();
        for (GuidancePost post : posts.allPosts()) {
            if (post.getHeroImageId() != null) {
                counts.merge(post.getHeroImageId(), 1L, Long::sum);
            }
        }
        return Map.copyOf(counts);
    }

    @Override
    public void delete(MediaAsset asset) {
        store.remove(asset.getId());
    }
}
