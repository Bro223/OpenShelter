package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.VerificationClaim;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * JPA implementation of {@link UserRepository} (approach B). The user
 * aggregate is saved with a replace-all claim strategy: claims are owned by
 * the user, so each save rewrites them (adds new, keeps revoked history rows).
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
            claims.deleteByUserId(saved.getId());
            for (VerificationClaim claim : registered.claims()) {
                VerificationClaimEntity claimEntity = UserMapper.claimToEntity(saved.getId(), claim);
                VerificationClaimEntity savedClaim = claims.save(claimEntity);
                claim.setId(savedClaim.getId());
            }
        }
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
    public RegisteredUser findByPhone(String phone) {
        return users.findByPhone(phone)
                .filter(e -> e.getKind() == UserKind.REGISTERED)
                .map(e -> (RegisteredUser) UserMapper.toDomain(e, claims.findByUserId(e.getId())))
                .orElse(null);
    }
}
