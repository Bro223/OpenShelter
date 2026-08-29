package ee.sheltermap.app;

import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.UserData;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserServiceTest {

    private InMemoryUserRepository repo;
    private UserService service;

    @BeforeEach
    void setUp() {
        repo = new InMemoryUserRepository();
        service = new UserService(repo);
    }

    @Test
    void registerCreatesPersistedUserWithEmptyLevels() {
        RegisteredUser user = service.register(
                "Aleks", "aleks@example.com", "+37250000000", "39001010001");

        assertThat(user.getId()).isNotNull();
        assertThat(user.levels()).isEmpty();
        assertThat(repo.findById(user.getId())).isSameAs(user);
    }

    @Test
    void getDataReturnsImmutableSnapshot() {
        RegisteredUser user = service.register(
                "Aleks", "aleks@example.com", "+37250000000", "39001010001");

        UserData data = service.getData(user);
        assertThat(data.name()).isEqualTo("Aleks");
        assertThat(data.email()).isEqualTo("aleks@example.com");
        assertThat(data.phone()).isEqualTo("+37250000000");
        assertThat(data.nationalIdCode()).isEqualTo("39001010001");
        assertThat(data.levels()).isEmpty();

        // snapshot is frozen — callers cannot mutate entity internals through it
        assertThatThrownBy(() -> data.levels().add(VerificationLevel.EMAIL))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void deleteAccountClearsClaimsAndPersists() {
        RegisteredUser user = service.register(
                "Aleks", "aleks@example.com", "+37250000000", "39001010001");
        user.addVerification(new VerificationClaim(
                VerificationLevel.PHONE, "twilio", "+37250000000", Instant.now()));
        assertThat(user.levels()).containsExactly(VerificationLevel.PHONE);

        service.deleteAccount(user);

        assertThat(user.levels()).isEmpty();
        assertThat(repo.findById(user.getId()).getData().levels()).isEmpty();
    }
}
