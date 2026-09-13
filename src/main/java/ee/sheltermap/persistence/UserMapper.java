package ee.sheltermap.persistence;

import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.GuestUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.UserData;
import ee.sheltermap.domain.VerificationClaim;

import java.util.List;

/**
 * Maps between the domain {@code User} hierarchy and {@link UserEntity} +
 * {@link VerificationClaimEntity} (approach B: domain stays pure Java, all
 * persistence concerns live in this package).
 */
final class UserMapper {

    private UserMapper() {
    }

    static UserEntity toEntity(User user) {
        UserEntity entity = new UserEntity();
        entity.setId(user.getId());
        entity.setKind(kindOf(user));
        if (user instanceof RegisteredUser registered) {
            UserData data = registered.getData();
            entity.setName(data.name());
            entity.setEmail(data.email());
            entity.setPhone(data.phone());
        }
        return entity;
    }

    static User toDomain(UserEntity entity, List<VerificationClaimEntity> claimEntities) {
        User user = switch (entity.getKind()) {
            case GUEST -> new GuestUser();
            case REGISTERED -> new RegisteredUser(
                    entity.getName(), entity.getEmail(), entity.getPhone());
            // Admin-moderation D1: the ADMIN kind round-trips through
            // AdminUser — the claims are restored from storage below (a
            // reloaded admin reflects the stored claim state, revoked ones
            // included; the constructor does NOT pre-set them).
            case ADMIN -> new AdminUser(
                    entity.getName(), entity.getEmail(), entity.getPhone());
        };
        user.setId(entity.getId());
        if (user instanceof RegisteredUser registered) {
            for (VerificationClaimEntity ce : claimEntities) {
                VerificationClaim claim = new VerificationClaim(
                        ce.getLevel(), ce.getProvider(), ce.getExternalRef(),
                        ce.getVerifiedAt(), ce.getRevokedAt());
                claim.setId(ce.getId());
                registered.addVerification(claim);
            }
        }
        return user;
    }

    static VerificationClaimEntity claimToEntity(Long userId, VerificationClaim claim) {
        VerificationClaimEntity entity = new VerificationClaimEntity();
        entity.setUserId(userId);
        entity.setLevel(claim.getLevel());
        entity.setProvider(claim.getProvider());
        entity.setExternalRef(claim.getExternalRef());
        entity.setVerifiedAt(claim.getVerifiedAt());
        entity.setRevokedAt(claim.getRevokedAt());
        return entity;
    }

    private static UserKind kindOf(User user) {
        // AdminUser BEFORE the RegisteredUser check (it IS-A RegisteredUser):
        // the kind column is fixed at creation and must survive every save
        // of a loaded admin (a name/profile edit must not flip it to
        // REGISTERED — kind is the truth, admin-moderation D2).
        if (user instanceof AdminUser) {
            return UserKind.ADMIN;
        }
        if (user instanceof RegisteredUser) {
            return UserKind.REGISTERED;
        }
        return UserKind.GUEST;
    }
}
