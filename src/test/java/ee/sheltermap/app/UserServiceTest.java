package ee.sheltermap.app;

import ee.sheltermap.domain.RegisteredUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;


import static org.assertj.core.api.Assertions.assertThat;

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
                "Aleks", "aleks@example.com", "+37250000000");

        assertThat(user.getId()).isNotNull();
        assertThat(user.levels()).isEmpty();
        assertThat(repo.findById(user.getId())).isSameAs(user);
    }

}
