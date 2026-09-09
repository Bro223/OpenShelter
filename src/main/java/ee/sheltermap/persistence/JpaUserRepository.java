package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * JPA implementation of {@link UserRepository} (approach B). Claims are
 * owned by the user and mapped diff-based (N10): unchanged rows keep their
 * ids across saves, only missing claims are inserted and only removed ones
 * deleted — so claim ids are stable for the lifetime of the claim.
 */
@Repository
public class JpaUserRepository implements UserRepository {

    private final SpringDataUserRepository users;
    private final SpringDataVerificationClaimRepository claims;

    public JpaUserRepository(SpringDataUserRepository users,
                             SpringDataVerificationClaimRepository claims) {
        this.users = Objects.requireNonNull(users, "users");
        this.claims = Objects.requireNonNull(claims, "claims");
    }

    @Override
    @Transactional
    public void save(User user) {
        UserEntity entity = UserMapper.toEntity(user);
        UserEntity saved = users.save(entity);
        user.setId(saved.getId());
        if (user instanceof RegisteredUser registered) {
            saveClaims(saved.getId(), registered);
        }
    }

    /**
     * Diff-based claim mapping (N10 — the old replace-all strategy churned
     * every claim id on every user save). A claim row is matched to the
     * domain claim on (level, externalRef, revokedAt): unchanged rows are
     * kept as-is with their id copied back onto the domain claim, only
     * MISSING claims are inserted and only REMOVED ones are bulk-deleted.
     *
     * <p>The delete runs BEFORE the re-inserts and is a BULK delete (see
     * {@link SpringDataVerificationClaimRepository#deleteByIds}): Hibernate
     * flushes INSERTs before entity DELETEs, so a queued removal would race
     * the insert against the V3 partial unique index. The id copy-back
     * happens before the delete's persistence-context clear, so kept ids
     * survive it.
     */
    private void saveClaims(Long userId, RegisteredUser registered) {
        Map<ClaimKey, VerificationClaimEntity> existingByKey = claims.findByUserId(userId).stream()
                .collect(Collectors.toMap(
                        e -> new ClaimKey(e.getLevel(), e.getExternalRef(), e.getRevokedAt()),
                        e -> e,
                        (first, second) -> first)); // defensive: a duplicate key keeps the older row
        List<VerificationClaim> toInsert = new ArrayList<>();
        for (VerificationClaim claim : registered.claims()) {
            VerificationClaimEntity kept = existingByKey.remove(
                    new ClaimKey(claim.getLevel(), claim.getExternalRef(), claim.getRevokedAt()));
            if (kept != null) {
                claim.setId(kept.getId()); // row survives — its id must too
            } else {
                toInsert.add(claim);
            }
        }
        if (!existingByKey.isEmpty()) {
            claims.deleteByIds(existingByKey.values().stream()
                    .map(VerificationClaimEntity::getId)
                    .toList());
        }
        for (VerificationClaim claim : toInsert) {
            VerificationClaimEntity savedClaim = claims.save(UserMapper.claimToEntity(userId, claim));
            claim.setId(savedClaim.getId());
        }
    }

    /** Claim identity for the save diff (N10): level + contact + revocation state. */
    private record ClaimKey(VerificationLevel level, String externalRef, Instant revokedAt) {
    }

    @Override
    @Transactional(readOnly = true)
    public User findById(Long id) {
        UserEntity entity = users.findById(id).orElse(null);
        if (entity == null) {
            return null;
        }
        return UserMapper.toDomain(entity, claims.findByUserId(id));
    }

    @Override
    @Transactional(readOnly = true)
    public RegisteredUser findByEmail(String email) {
        return users.findByEmailIgnoreCase(email)
                .filter(e -> e.getKind() == UserKind.REGISTERED)
                .map(e -> (RegisteredUser) UserMapper.toDomain(e, claims.findByUserId(e.getId())))
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, User> findByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        List<UserEntity> entities = users.findAllById(ids);
        // One batched claims query for all users — no per-user N+1.
        Map<Long, List<VerificationClaimEntity>> claimsByUser = claims.findByUserIdIn(ids).stream()
                .collect(Collectors.groupingBy(VerificationClaimEntity::getUserId));
        return entities.stream()
                .collect(Collectors.toMap(UserEntity::getId,
                        e -> UserMapper.toDomain(e, claimsByUser.getOrDefault(e.getId(), List.of()))));
    }

    @Override
    @Transactional(readOnly = true)
    public RegisteredUser findByPhone(String phone) {
        return users.findByPhone(phone)
                .filter(e -> e.getKind() == UserKind.REGISTERED)
                .map(e -> (RegisteredUser) UserMapper.toDomain(e, claims.findByUserId(e.getId())))
                .orElse(null);
    }
}
