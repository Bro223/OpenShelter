package ee.sheltermap.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data repository for {@link UserEntity} — internal to the
 * persistence layer.
 *
 * <p>PII-at-rest (M2): lookups run on the HMAC blind indexes
 * ({@code email_hash} / {@code phone_hash}) — the {@code email} /
 * {@code phone} columns hold ciphertext and are never matched against.
 */
public interface SpringDataUserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByEmailHash(String emailHash);

    Optional<UserEntity> findByPhoneHash(String phoneHash);

    /** Id-ordered full-table read (M10 slice 1 — the admin Users tab). */
    List<UserEntity> findAllByOrderByIdAsc();
}
