package ee.sheltermap.persistence;

import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.GuestUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.UserData;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.security.PiiCrypto;
import ee.sheltermap.verification.PhoneNumbers;

import java.util.List;

/**
 * Maps between the domain {@code User} hierarchy and {@link UserEntity} +
 * {@link VerificationClaimEntity} (approach B: domain stays pure Java, all
 * persistence concerns live in this package).
 *
 * <p>PII-at-rest (M2): this mapper is the crypto boundary for users and
 * verification claims — {@code toEntity} encrypts e-mail/phone/claim ref
 * and fills the blind indexes, {@code toDomain} decrypts back to plain
 * values. The domain hierarchy above never sees ciphertext.
 */
final class UserMapper {

    private UserMapper() {
    }

    static UserEntity toEntity(User user, PiiCrypto pii) {
        UserEntity entity = new UserEntity();
        entity.setId(user.getId());
        entity.setKind(kindOf(user));
        if (user instanceof RegisteredUser registered) {
            UserData data = registered.getData();
            entity.setName(data.name());
            if (data.email() != null) {
                entity.setEmail(pii.encrypt(data.email()));
                entity.setEmailHash(
                        pii.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, PiiCrypto.canonicalEmail(data.email())));
            }
            if (data.phone() != null) {
                entity.setPhone(pii.encrypt(data.phone()));
                entity.setPhoneHash(
                        pii.blindIndex(PiiCrypto.DOMAIN_USER_PHONE, PhoneNumbers.normalizeE164(data.phone())));
            }
        }
        // Suspension state (M10 slice 1) round-trips on every kind — it is
        // account state, not a registered-user attribute.
        entity.setSuspendedAt(user.getSuspendedAt());
        return entity;
    }

    static User toDomain(UserEntity entity, List<VerificationClaimEntity> claimEntities, PiiCrypto pii) {
        // A blank stored value means "absent" (V13 leaves legacy blanks
        // as-is — e.g. a no-phone admin, an empty legacy claim ref): it is
        // mapped to null, never handed to the fail-closed decrypt. A
        // non-blank pre-V13 plaintext value still fails closed there.
        String email = isBlank(entity.getEmail()) ? null : pii.decrypt(entity.getEmail());
        String phone = isBlank(entity.getPhone()) ? null : pii.decrypt(entity.getPhone());
        User user = switch (entity.getKind()) {
            case GUEST -> new GuestUser();
            case REGISTERED -> new RegisteredUser(entity.getName(), email, phone);
            // Admin-moderation D1: the ADMIN kind round-trips through
            // AdminUser — the claims are restored from storage below (a
            // reloaded admin reflects the stored claim state, revoked ones
            // included; the constructor does NOT pre-set them).
            case ADMIN -> new AdminUser(entity.getName(), email, phone);
        };
        user.setId(entity.getId());
        user.setSuspendedAt(entity.getSuspendedAt());
        if (user instanceof RegisteredUser registered) {
            for (VerificationClaimEntity ce : claimEntities) {
                VerificationClaim claim = new VerificationClaim(
                        ce.getLevel(), ce.getProvider(),
                        isBlank(ce.getExternalRef()) ? null : pii.decrypt(ce.getExternalRef()),
                        ce.getVerifiedAt(), ce.getRevokedAt());
                claim.setId(ce.getId());
                registered.addVerification(claim);
            }
        }
        return user;
    }

    static VerificationClaimEntity claimToEntity(Long userId, VerificationClaim claim, PiiCrypto pii) {
        VerificationClaimEntity entity = new VerificationClaimEntity();
        entity.setUserId(userId);
        entity.setLevel(claim.getLevel());
        entity.setProvider(claim.getProvider());
        // The claim ref carries the contact that proved the level — encrypt
        // it like any other stored contact (M2). A null/blank ref (a legacy
        // row with no recorded reference) is stored as '' — the column is
        // NOT NULL, '' is the storage convention for "absent".
        entity.setExternalRef(isBlank(claim.getExternalRef())
                ? "" : pii.encrypt(claim.getExternalRef()));
        entity.setVerifiedAt(claim.getVerifiedAt());
        entity.setRevokedAt(claim.getRevokedAt());
        return entity;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
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
