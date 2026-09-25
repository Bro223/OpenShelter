package ee.sheltermap.persistence;

import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceStatus;
import ee.sheltermap.guidance.GuidancePostRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link GuidancePostRepository} (approach B).
 * Uniqueness of the slug is enforced by the database constraint
 * {@code uq_guidance_posts_slug} — a duplicate insert surfaces as a
 * {@code DataIntegrityViolationException} (the service pre-checks with
 * {@code existsBySlug} and maps the expected duplicate to 409).
 *
 * <p>{@code updated_at} moves on every write: the domain's write
 * methods carry their own instants, but {@code unpublish()} carries none
 * (frozen signature), so the update path stamps it from the injected
 * Clock — one rule for every write — and syncs the stamp back onto the
 * domain object.
 */
@Repository
public class JpaGuidancePostRepository implements GuidancePostRepository {

    private final SpringDataGuidancePostRepository posts;
    private final Clock clock;

    public JpaGuidancePostRepository(SpringDataGuidancePostRepository posts, Clock clock) {
        this.posts = Objects.requireNonNull(posts, "posts");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    @Transactional
    public GuidancePost save(GuidancePost post) {
        GuidancePostEntity entity;
        if (post.getId() != null) {
            // UPDATE path: mutate the MANAGED row in place (the house
            // idiom), then stamp updated_at from the Clock (it moves
            // on every write, and unpublish() carries no instant of its
            // own, so this stamp is the rule for all update writes).
            entity = posts.findById(post.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "cannot save guidance post with unknown id " + post.getId()));
            GuidancePostMapper.toEntity(entity, post);
            entity.setUpdatedAt(clock.instant());
        } else {
            // INSERT path: fresh entity; the domain owns the creation
            // stamps (draft(...) sets createdAt = updatedAt = now) — the
            // column is NOT NULL, so the value is written, not defaulted.
            entity = new GuidancePostEntity();
            GuidancePostMapper.toEntity(entity, post);
            entity.setUpdatedAt(post.getUpdatedAt());
        }
        posts.save(entity);
        post.setId(entity.getId());
        post.setUpdatedAt(entity.getUpdatedAt());
        return post;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<GuidancePost> findById(long id) {
        return posts.findById(id).map(GuidancePostMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuidancePost> findByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return posts.findAllById(ids).stream()
                .map(GuidancePostMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<GuidancePost> findBySlug(String slug) {
        return posts.findBySlug(slug).map(GuidancePostMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsBySlug(String slug) {
        return posts.existsBySlug(slug);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuidancePost> findAllForAdmin() {
        return posts.findAllByOrderBySortOrderAscIdDesc().stream()
                .map(GuidancePostMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuidancePost> findAllInStoredGlobalOrder() {
        return posts.findAllInStoredGlobalOrder().stream()
                .map(GuidancePostMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public int maxSortOrder() {
        // The append position is max + 1 (a concurrent append may land on
        // the same position — the public order tie-breaks duplicates, so
        // one max read is enough).
        Integer max = posts.maxSortOrder();
        return max == null ? 0 : max;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<GuidancePost> findPublishedBySlugAndLocale(String slug, String locale) {
        return posts.findBySlugAndStatusAndLocale(slug, GuidanceStatus.PUBLISHED, locale)
                .map(GuidancePostMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuidancePost> findByHeroImageId(long mediaAssetId) {
        return posts.findByHeroImageIdOrderByUpdatedAtDescIdDesc(mediaAssetId).stream()
                .map(GuidancePostMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional
    public void delete(GuidancePost post) {
        posts.deleteById(post.getId());
        // Force the SQL DELETE to run NOW, not at an arbitrary later
        // auto-flush: a follow-up read in the same transaction must
        // already see the row gone.
        posts.flush();
    }
}
