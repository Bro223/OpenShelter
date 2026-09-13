package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import ee.sheltermap.domain.UserData;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class UserRepositoryIT extends AbstractPersistenceIT {

    @Autowired
    UserRepository users;

    @Test
    void saveAndFindRegisteredUserWithClaims() {
        RegisteredUser user = saveUser(users);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "dev",
                "mari@example.ee", Instant.now()));
        user.addVerification(new VerificationClaim(VerificationLevel.PHONE, "dev",
                "+37250000001", Instant.now()));
        users.save(user);

        assertThat(user.getId()).isNotNull();

        User loaded = users.findById(user.getId());
        assertThat(loaded).isInstanceOf(RegisteredUser.class);
        UserData data = loaded.getData();
        assertThat(data.name()).isEqualTo("Mari Maasikas");
        assertThat(data.email()).isEqualTo("mari@example.ee");
        assertThat(data.phone()).isEqualTo("+37250000001");
        assertThat(data.levels()).containsExactlyInAnyOrder(VerificationLevel.EMAIL, VerificationLevel.PHONE);
    }

    @Test
    void revokedClaimIsPersistedAndRestored() {
        RegisteredUser user = saveUser(users);
        VerificationClaim claim = new VerificationClaim(VerificationLevel.EMAIL, "dev",
                "mari@example.ee", Instant.now());
        user.addVerification(claim);
        users.save(user);

        claim.revoke();
        users.save(user);

        RegisteredUser loaded = (RegisteredUser) users.findById(user.getId());
        assertThat(loaded.claims()).hasSize(1);
        assertThat(loaded.claims().iterator().next().isRevoked()).isTrue();
        assertThat(loaded.levels()).isEmpty();
        assertThat(loaded.canWrite()).isFalse();
    }

    @Test
    void unchangedClaimsKeepTheirIdsAcrossASave() {
        RegisteredUser user = saveUser(users);
        VerificationClaim emailClaim = new VerificationClaim(
                VerificationLevel.EMAIL, "dev", "mari@example.ee", Instant.now());
        user.addVerification(emailClaim);
        users.save(user);
        long firstId = emailClaim.getId();

        users.save(user); // nothing changed

        assertThat(user.getId()).isNotNull();
        assertThat(emailClaim.getId()).isEqualTo(firstId); // N10: no id churn
    }

    @Test
    void missingUserReturnsNull() {
        assertThat(users.findById(999_999L)).isNull();
    }
}
