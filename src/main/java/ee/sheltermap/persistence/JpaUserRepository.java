package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.security.PiiCrypto;
import ee.sheltermap.verification.PhoneNumbers;
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
 *
 * <p>PII-at-rest (M2): e-mail/phone resolution goes through the HMAC blind
 * index — {@code findByEmail} canonicalizes lower-case (replacing the old
 * {@code findByEmailIgnoreCase}), {@code findByPhone} expects the canonical
 * E.164 form the login/register paths already produce.
 */
@Repository
public class JpaUserRepository implements UserRepository {

    private final SpringDataUserRepository users;
    private final SpringDataVerificationClaimRepository claims;
    private final PiiCrypto piiCrypto;

    public JpaUserRepository(SpringDataUserRepository users,
                             SpringDataVerificationClaimRepository claims,
                             PiiCrypto piiCrypto) {
        this.users = Objects.requireNonNull(users, "users");
        this.claims = Objects.requireNonNull(claims, "claims");
        this.piiCrypto = Objects.requireNonNull(piiCrypto, "piiCrypto");
    }

    @Override
    @Transactional
    public void save(User user) {
        UserEntity entity = UserMapper.toEntity(user, piiCrypto);
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
        // PII-at-rest (M2): the stored external_ref is the v1: envelope —
        // diff on the DECRYPTED contact so the (level, contact, revokedAt)
        // identity matches the domain claim's plaintext ref (no id churn).
        // A blank stored ref ("absent", stored as '' because the column is
        // NOT NULL) maps to a null ref, like the domain side.
        Map<ClaimKey, VerificationClaimEntity> existingByKey = claims.findByUserId(userId).stream()
                .collect(Collectors.toMap(
                        e -> new ClaimKey(e.getLevel(),
                                e.getExternalRef() == null || e.getExternalRef().isBlank()
                                        ? null : piiCrypto.decrypt(e.getExternalRef()),
                                e.getRevokedAt()),
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
            VerificationClaimEntity savedClaim = claims.save(UserMapper.claimToEntity(userId, claim, piiCrypto));
            claim.setId(savedClaim.getId());
        }
    }

    /** Claim identity for the save diff (N10): level + contact + revocation state. */
    private record ClaimKey(VerificationLevel level, String externalRef, Instant revokedAt) {
    }

    @Override
    @Transactional
    public void delete(Long userId) {
        users.deleteById(userId);
        // Force the SQL DELETE (and its ON DELETE CASCADE / SET NULL onto
        // the child tables) to run NOW: the erasure must be visible to any
        // follow-up read in the same transaction (the delete alone would
        // not trigger an auto-flush — the queries do not read users).
        users.flush();
    }

    @Override
    @Transactional(readOnly = true)
    public User findById(Long id) {
        UserEntity entity = users.findById(id).orElse(null);
        if (entity == null) {
            return null;
        }
        return UserMapper.toDomain(entity, claims.findByUserId(id), piiCrypto);
    }

    @Override
    @Transactional(readOnly = true)
    public RegisteredUser findByEmail(String email) {
        // Canonicalize lower-case (replaces the old findByEmailIgnoreCase —
        // the blind index is only deterministic for the canonical form).
        // REGISTERED and ADMIN rows are returned (kind is restored by the
        // mapper): the admin logs in through the normal /auth/login
        // (admin-moderation D1), and the registration pre-check must see
        // the admin's email as in use (409), not as free. GUEST rows have
        // no email to begin with.
        if (email == null || email.isBlank()) {
            return null;
        }
        String hash = piiCrypto.blindIndex(
                PiiCrypto.DOMAIN_USER_EMAIL, PiiCrypto.canonicalEmail(email));
        return users.findByEmailHash(hash)
                .filter(e -> e.getKind() != UserKind.GUEST)
                .map(e -> (RegisteredUser) UserMapper.toDomain(e, claims.findByUserId(e.getId()), piiCrypto))
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
                        e -> UserMapper.toDomain(e, claimsByUser.getOrDefault(e.getId(), List.of()), piiCrypto)));
    }

    @Override
    @Transactional(readOnly = true)
    public RegisteredUser findByPhone(String phone) {
        // Canonical E.164 (login/register already normalize; normalize again
        // so every path resolves identically against the blind index).
        if (phone == null || phone.isBlank()) {
            return null;
        }
        String hash = piiCrypto.blindIndex(
                PiiCrypto.DOMAIN_USER_PHONE, PhoneNumbers.normalizeE164(phone));
        return users.findByPhoneHash(hash)
                .filter(e -> e.getKind() != UserKind.GUEST)
                .map(e -> (RegisteredUser) UserMapper.toDomain(e, claims.findByUserId(e.getId()), piiCrypto))
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAdmin(long userId) {
        return users.findById(userId)
                .map(e -> e.getKind() == UserKind.ADMIN)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isSuspended(long userId) {
        // Column-only on purpose (M10 slice 1): the filter runs on EVERY
        // token-bearing request, so it must not pay the domain mapping
        // (PII decrypt, claims load) — and a demoted admin's null phone
        // must not surface as a mapping NPE on a per-request path.
        return users.findById(userId)
                .map(e -> e.getSuspendedAt() != null)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public List<User> findAll() {
        List<UserEntity> entities = users.findAllByOrderByIdAsc();
        // One batched claims query for all users — no per-user N+1 (the
        // findByIds idiom).
        Map<Long, List<VerificationClaimEntity>> claimsByUser =
                entities.isEmpty() ? Map.of()
                        : claims.findByUserIdIn(entities.stream().map(UserEntity::getId).toList()).stream()
                                .collect(Collectors.groupingBy(VerificationClaimEntity::getUserId));
        return entities.stream()
                .map(e -> UserMapper.toDomain(e, claimsByUser.getOrDefault(e.getId(), List.of()), piiCrypto))
                .toList();
    }
}
