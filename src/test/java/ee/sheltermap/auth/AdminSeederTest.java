package ee.sheltermap.auth;

import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit test for the env-provisioned admin (admin-moderation D1):
 * create-if-absent, no-op on partial config, and the never-touch-existing
 * contract. Fast in-memory fakes; the real-Postgres round-trip (login,
 * kind column, restart idempotency) is in {@code AdminSeederIT}.
 */
class AdminSeederTest {

    private static final String EMAIL = "admin@example.ee";
    private static final String PASSWORD = "admin-secret";

    private final InMemoryUserRepository users = new InMemoryUserRepository();
    private final InMemoryUserCredentialsRepository credentials = new InMemoryUserCredentialsRepository();
    private final StubPasswordHasher hasher = new StubPasswordHasher();

    private AdminSeeder seeder(String email, String password) {
        return new AdminSeeder(users, credentials, hasher, email, password);
    }

    @Test
    void createsTheAdminWhenBothVarsAreSet() {
        seeder(EMAIL, PASSWORD).run(null);

        RegisteredUser admin = users.findByEmail(EMAIL);
        assertThat(admin).isInstanceOf(AdminUser.class);
        assertThat(admin.getData().name()).isEqualTo("Admin");
        assertThat(admin.getData().email()).isEqualTo(EMAIL);
        // every verification claim pre-set — the mailbox-less account is
        // fully writable without the email/SMS flow
        assertThat(admin.levels())
                .containsExactlyInAnyOrder(VerificationLevel.EMAIL, VerificationLevel.PHONE,
                        VerificationLevel.SMART_ID);
        assertThat(admin.canWrite()).isTrue();
        // kind seam: the admin IS admin (the /admin/* guard + the shelter
        // cap exemption both read this)
        assertThat(users.isAdmin(admin.getId())).isTrue();
        // password stored with the SAME encoder registration uses
        UserCredentials stored = credentials.findByUserId(admin.getId());
        assertThat(stored).isNotNull();
        assertThat(hasher.verify(PASSWORD, stored.getPasswordHash())).isTrue();
        assertThat(hasher.verify("wrong", stored.getPasswordHash())).isFalse();
    }

    @Test
    void secondRunChangesNothing() {
        seeder(EMAIL, PASSWORD).run(null);
        RegisteredUser first = users.findByEmail(EMAIL);
        String hashAfterFirstRun = credentials.findByUserId(first.getId()).getPasswordHash();
        long claimCount = first.claims().size();

        // simulate a restart with the same env vars
        seeder(EMAIL, PASSWORD).run(null);

        RegisteredUser after = users.findByEmail(EMAIL);
        assertThat(after.getId()).isEqualTo(first.getId());
        // the password hash is byte-identical — no re-hash on restart
        assertThat(credentials.findByUserId(after.getId()).getPasswordHash())
                .isEqualTo(hashAfterFirstRun);
        assertThat(after.claims()).hasSize((int) claimCount);
        assertThat(after.getData().name()).isEqualTo("Admin");
    }

    @Test
    void aPasswordChangeByTheAdminSurvivesARestart() {
        seeder(EMAIL, PASSWORD).run(null);
        RegisteredUser admin = users.findByEmail(EMAIL);
        // in-app password change (the account's own flow)
        credentials.updateHash(admin.getId(), hasher.hash("new-password"));

        seeder(EMAIL, PASSWORD).run(null);

        // the seeder never re-hashes — the new password still verifies
        UserCredentials stored = credentials.findByUserId(admin.getId());
        assertThat(hasher.verify("new-password", stored.getPasswordHash())).isTrue();
        assertThat(hasher.verify(PASSWORD, stored.getPasswordHash())).isFalse();
    }

    @Test
    void noOpWhenEitherVarIsEmpty() {
        seeder(null, PASSWORD).run(null);
        seeder(EMAIL, null).run(null);
        seeder("", PASSWORD).run(null);
        seeder(EMAIL, "   ").run(null);
        seeder(EMAIL, PASSWORD + "").run(null); // sanity: this one WOULD create

        assertThat(users.findByEmail(EMAIL)).isInstanceOf(AdminUser.class);
        // exactly ONE user exists — the four no-ops created nothing
        assertThat(users.findAll()).hasSize(1);
    }

    @Test
    void preExistingUserWithSameEmailIsNeverTouched() {
        // a normal account registered through the app holds the email first
        RegisteredUser normal = new RegisteredUser("Mari", EMAIL, "+37250000001", "49001010001");
        users.save(normal);
        credentials.save(new UserCredentials(normal.getId(), hasher.hash("mari-password")));

        seeder(EMAIL, PASSWORD).run(null);

        // the row is UNCHANGED: still a plain registered user (kind never
        // flips), no claims added, no re-hash, no second user
        RegisteredUser after = users.findByEmail(EMAIL);
        assertThat(after).isNotInstanceOf(AdminUser.class);
        assertThat(after).isSameAs(normal);
        assertThat(after.claims()).isEmpty();
        assertThat(after.canWrite()).isFalse();
        assertThat(users.isAdmin(after.getId())).isFalse();
        assertThat(credentials.findByUserId(after.getId()).getPasswordHash())
                .isEqualTo(hasher.hash("mari-password"));
        assertThat(users.findAll()).hasSize(1);
    }

    @Test
    void caseVariantOfTheSameEmailIsTreatedAsExisting() {
        RegisteredUser normal = new RegisteredUser("Mari", EMAIL, "+37250000001", "49001010001");
        users.save(normal);

        // env var with different casing (the email lookup is case-insensitive)
        seeder(EMAIL.toUpperCase(), PASSWORD).run(null);

        assertThat(users.findAll()).hasSize(1);
        assertThat(users.findByEmail(EMAIL)).isSameAs(normal);
        assertThat(users.findByEmail(EMAIL)).isNotInstanceOf(AdminUser.class);
    }
}
