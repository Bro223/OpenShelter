package ee.sheltermap.persistence;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.UserCredentials;
import ee.sheltermap.auth.UserCredentialsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class UserCredentialsRepositoryIT extends AbstractPersistenceIT {

    @Autowired
    UserCredentialsRepository credentials;

    @Autowired
    UserRepository users;

    @Test
    void saveAndFindRoundTrip() {
        Long userId = saveUser(users).getId();

        credentials.save(new UserCredentials(userId, "argon2-hash-1"));

        UserCredentials loaded = credentials.findByUserId(userId);
        assertThat(loaded).isNotNull();
        assertThat(loaded.getUserId()).isEqualTo(userId);
        assertThat(loaded.getPasswordHash()).isEqualTo("argon2-hash-1");
        assertThat(loaded.getCreatedAt()).isNotNull();
        assertThat(loaded.getChangedAt()).isNotNull();
    }

    @Test
    void updateHashReplacesHashAndStampsChangedAt() {
        Long userId = saveUser(users).getId();
        credentials.save(new UserCredentials(userId, "old-hash"));

        credentials.updateHash(userId, "new-hash");

        UserCredentials loaded = credentials.findByUserId(userId);
        assertThat(loaded.getPasswordHash()).isEqualTo("new-hash");
        assertThat(loaded.getChangedAt()).isAfterOrEqualTo(loaded.getCreatedAt());
    }

    @Test
    void missingCredentialsReturnNull() {
        assertThat(credentials.findByUserId(999_999L)).isNull();
    }
}
