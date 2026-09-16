package ee.sheltermap.auth;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.AdminUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Objects;

/**
 * The env-provisioned admin (admin-moderation D1): an {@link ApplicationRunner}
 * that creates the ADMIN-kind account at startup — and ONLY then.
 *
 * <p>Semantics (create-if-absent, the whole contract):
 * <ul>
 *   <li>Either {@code app.admin.email} / {@code app.admin.password} empty →
 *       no-op. No admin exists, {@code /admin/*} answers 403 for everyone
 *       (kind is the truth), and the app behaves exactly as if this
 *       capability were absent — dev boxes without the vars keep working,
 *       prod is opt-in.</li>
 *   <li>{@code app.admin.password} present but shorter than 8 characters
 *       → fail fast at startup (refuse to seed a weak admin password —
 *       the same minimum the registration boundary enforces).</li>
 *   <li>A user with that email ALREADY exists (any kind) → no-op. The seeder
 *       NEVER re-hashes, flips kind or touches claims, so an in-app password
 *       change survives restarts and deployments, and a normal account that
 *       happens to hold the email string stays a normal account.</li>
 *   <li>Otherwise → create: kind ADMIN, name "Admin", the configured email
 *       (no phone — the account has none, and login is by email), every
 *       verification claim pre-set (the mailbox does not exist by design,
 *       so {@code canWrite()} is true without the email/SMS flow), password
 *       = the same Argon2 encoder registration uses
 *       ({@link PasswordHasher} → {@link Argon2PasswordHasher}).</li>
 * </ul>
 *
 * <p>Login is the normal {@code POST /auth/login} (emailOrPhone + password)
 * — no dedicated endpoint, no backdoor path, same JWT shape as every other
 * user (principal = userId, NO role claim — D2). De-provisioning = remove
 * the env vars (and delete the row if desired); the seeder will not
 * resurrect credentials for a deleted account on the same email.
 */
@Component
public class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository users;
    private final UserCredentialsRepository credentials;
    private final PasswordHasher passwordHasher;
    private final String email;
    private final String password;
    /** Time source stamping the provisioned admin's claims and credentials (injected — the caller owns the clock). */
    private final Clock clock;

    public AdminSeeder(UserRepository users,
                       UserCredentialsRepository credentials,
                       PasswordHasher passwordHasher,
                       @Value("${app.admin.email:}") String email,
                       @Value("${app.admin.password:}") String password,
                       Clock clock) {
        this.users = Objects.requireNonNull(users, "users");
        this.credentials = Objects.requireNonNull(credentials, "credentials");
        this.passwordHasher = Objects.requireNonNull(passwordHasher, "passwordHasher");
        this.email = email;
        this.password = password;
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.info("Admin provisioning disabled (app.admin.email/password unset) — no admin exists");
            return;
        }
        if (password.length() < 8) {
            // A misconfigured (weak) admin password must fail the boot,
            // not seed a 403-unreachable-by-design account nobody can
            // log in to properly — same 8-char minimum as /auth/register.
            throw new IllegalStateException(
                    "app.admin.password must be at least 8 characters long — refusing to seed a weak admin password");
        }
        if (users.findByEmail(email) != null) {
            // Create-if-absent: whatever row already holds this email
            // (REGISTERED or ADMIN) is left completely untouched.
            log.info("Admin e-mail {} already in use — seeder is a no-op", email);
            return;
        }
        // No phone on the account (null — it is outside the unique
        // uq_users_phone index, so it can never collide with any other user
        // or be a login route); no national ID code is stored — the
        // pre-set SMART_ID claim carries the e-mail as its external ref.
        AdminUser admin = AdminUser.provisioned("Admin", email, clock.instant());
        users.save(admin);
        // Retention-pruning: provisioning is the admin's activity stamp
        // (the admin is never a prune candidate — the stamp keeps the
        // NOT NULL last_activity_at column honest).
        users.markActive(admin.getId(), clock.instant());
        credentials.save(new UserCredentials(admin.getId(), passwordHasher.hash(password), clock.instant()));
        log.info("Seeded admin account {}", email);
    }
}
