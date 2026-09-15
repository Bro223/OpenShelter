package ee.sheltermap.persistence;

import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.security.PiiCrypto;
import ee.sheltermap.security.PiiKeys;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * UserMapper blank-value contract: a stored BLANK PII value means
 * "absent" — V13 leaves legacy blanks as-is (a no-phone admin's phone, an
 * empty legacy claim ref) and the mapper must read them back as
 * {@code null} instead of handing them to the fail-closed crypto, which
 * throws on empties. The provisioned admin (null phone) round-trips with no
 * phone and no phone hash.
 */
class UserMapperBlankValueTest {

    private final PiiCrypto pii = new PiiCrypto(new PiiKeys(
            Base64.getEncoder().encodeToString(new byte[32]),
            Base64.getEncoder().encodeToString(new byte[32])));

    @Test
    void blankStoredPiiReadsBackAsAbsent() {
        UserEntity entity = new UserEntity();
        entity.setId(61L);
        entity.setKind(UserKind.ADMIN);
        entity.setName("Admin");
        entity.setEmail(pii.encrypt("admin@openshelter.ee"));
        entity.setPhone(""); // the dev-DB admin shape: left as-is by V13
        VerificationClaimEntity claim = new VerificationClaimEntity();
        claim.setUserId(61L);
        claim.setLevel(VerificationLevel.SMART_ID);
        claim.setProvider("system");
        claim.setExternalRef(""); // the legacy dev-DB shape that crashed decrypt
        claim.setVerifiedAt(Instant.now());

        RegisteredUser user = (RegisteredUser) UserMapper.toDomain(entity, List.of(claim), pii);

        assertThat(user.getData().phone()).isNull();
        assertThat(user.getData().email()).isEqualTo("admin@openshelter.ee");
        assertThat(user.claims().iterator().next().getExternalRef()).isNull();
    }

    @Test
    void provisionedAdminRoundTripsWithoutPhone() {
        AdminUser admin = new AdminUser("Admin", "admin@openshelter.ee", null);

        UserEntity entity = UserMapper.toEntity(admin, pii);

        assertThat(entity.getKind()).isEqualTo(UserKind.ADMIN);
        assertThat(entity.getPhone()).isNull();
        assertThat(entity.getPhoneHash()).isNull();
        assertThat(entity.getEmail()).startsWith("v1:");
        assertThat(entity.getEmailHash()).matches("[0-9a-f]{64}");
    }
}
