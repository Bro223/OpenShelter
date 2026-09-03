package ee.sheltermap.persistence;

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
            entity.setNationalIdCode(data.nationalIdCode());
        }
        return entity;
    }

    static User toDomain(UserEntity entity, List<VerificationClaimEntity> claimEntities) {
        User user = switch (entity.getKind()) {
            case GUEST -> new GuestUser();
            case REGISTERED -> new RegisteredUser(
                    entity.getName(), entity.getEmail(), entity.getPhone(), entity.getNationalIdCode());
            case ADMIN -> throw new IllegalStateException(
                    "admin accounts are not supported in v1 (AdminUser was removed as dead code)");
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
        if (user instanceof RegisteredUser) {
            return UserKind.REGISTERED;
        }
        return UserKind.GUEST;
    }
}
