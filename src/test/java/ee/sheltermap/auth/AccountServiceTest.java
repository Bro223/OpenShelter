package ee.sheltermap.auth;

import ee.sheltermap.app.InMemoryModerationAuditLog;
import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.ProvisionedAdminProtectedException;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.LocationKind;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit test for the account export + erasure orchestration:
 * erasure is the one flow that has to be exactly right — it deletes what is
 * private, keeps what the community contributed (authorless), never re-opens
 * trust state, and strips the free-text moderation notes that echo the erased
 * submitter's data.
 *
 * <p>Hand-written fakes only, like the rest of this suite: the project has no
 * mocking framework. The clock is fixed so audit stamping is deterministic.
 */
class AccountServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-15T09:00:00Z");

    private InMemoryUserRepository users;
    private InMemoryShelterRepository shelters;
    private InMemoryModerationAuditLog audit;
    private AccountService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        users = new InMemoryUserRepository();
        shelters = new InMemoryShelterRepository();
        audit = new InMemoryModerationAuditLog(clock);
        service = new AccountService(users, new InMemoryUserCredentialsRepository(clock),
                new PlainTextHasher(), shelters, audit);
    }

    @Test
    void dataExportCarriesTheProfileAndEveryAuthoredShelter() {
        RegisteredUser user = saveVerifiedUser("Mari", "mari@example.ee");
        Shelter privateHome = saveShelter("Kodu", user.getId(), LocationKind.PRIVATE);
        Shelter publicShelter = saveShelter("Varjupaik", user.getId(), LocationKind.PUBLIC);

        DataExportResponse export = service.dataExport(user);

        assertThat(export.profile().name()).isEqualTo("Mari");
        assertThat(export.profile().email()).isEqualTo("mari@example.ee");
        assertThat(export.profile().phone()).isEqualTo("+37250000000");
        assertThat(export.profile().levels()).containsExactly(VerificationLevel.EMAIL);
        assertThat(export.shelters())
                .as("the export mirrors what the account submitted — both statuses include hidden rows")
                .extracting(DataExportResponse.ExportedShelter::id)
                .containsExactlyInAnyOrder(privateHome.getId(), publicShelter.getId());
    }

    @Test
    void deleteAccountPurgesPrivateHomesAndOrphansPublicOnesWithoutTouchingTrustState() {
        RegisteredUser user = saveVerifiedUser("Mari", "mari@example.ee");
        Shelter privateHome = saveShelter("Kodu", user.getId(), LocationKind.PRIVATE);
        Shelter publicShelter = saveShelter("Varjupaik", user.getId(), LocationKind.PUBLIC);
        publicShelter.setReviewNote("REJECT: please re-check — reach us at mari@example.ee");
        ReviewStatus reviewStatusBefore = publicShelter.getReviewStatus();
        ShelterStatus statusBefore = publicShelter.getStatus();

        service.deleteAccount(user);

        assertThat(shelters.findById(privateHome.getId()))
                .as("a declared private home must not outlive the erasure")
                .isEmpty();
        Shelter kept = shelters.findById(publicShelter.getId()).orElseThrow();
        assertThat(kept.getCreatedBy()).as("the public row survives, without an author").isNull();
        assertThat(kept.getReviewNote())
                .as("the submitter-facing note echoed their own contact — it goes")
                .isNull();
        assertThat(kept.getReviewStatus())
                .as("a newly-NULL creator is not a signal to re-review")
                .isEqualTo(reviewStatusBefore);
        assertThat(kept.getStatus()).isEqualTo(statusBefore);
    }

    @Test
    void deleteAccountRedactsAuditReasonsButKeepsTheRows() {
        RegisteredUser user = saveVerifiedUser("Mari", "mari@example.ee");
        Shelter publicShelter = saveShelter("Varjupaik", user.getId(), LocationKind.PUBLIC);
        audit.record(publicShelter.getId(), user.getId(), 99L, ModerationAuditLog.Action.REJECT,
                "REJECT: re-check please — mari@example.ee", null, null);

        service.deleteAccount(user);

        assertThat(audit.rows())
                .as("the audit action rows survive (the admin-delete convention)")
                .hasSize(1);
        assertThat(audit.rows().get(0).reason())
                .as("the free-text reason is redacted — it echoes the erased submitter")
                .isNull();
        assertThat(audit.rows().get(0).shelterId()).isEqualTo(publicShelter.getId());
    }

    @Test
    void deleteAccountRemovesTheUserRow() {
        RegisteredUser user = saveVerifiedUser("Mari", "mari@example.ee");

        service.deleteAccount(user);

        assertThat(users.findById(user.getId()))
                .as("the account is gone; the DB cascades the child rows in production")
                .isNull();
        assertThat(users.findAll()).isEmpty();
    }

    @Test
    void deleteAccountLeavesAnotherUsersSheltersAndNotesAlone() {
        RegisteredUser erased = saveVerifiedUser("Mari", "mari@example.ee");
        RegisteredUser other = saveVerifiedUser("Jaan", "jaan@example.ee");
        Shelter theirs = saveShelter("Teise inimene", other.getId(), LocationKind.PUBLIC);
        theirs.setReviewNote("REJECT: belongs to the other account");
        audit.record(theirs.getId(), other.getId(), 99L, ModerationAuditLog.Action.REJECT,
                "REJECT: not mine to redact", null, null);

        service.deleteAccount(erased);

        Shelter untouched = shelters.findById(theirs.getId()).orElseThrow();
        assertThat(untouched.getCreatedBy()).isEqualTo(other.getId());
        assertThat(untouched.getReviewNote()).isEqualTo("REJECT: belongs to the other account");
        assertThat(audit.rows().get(0).reason())
                .as("the redaction is scoped to the erased user's own rows")
                .isEqualTo("REJECT: not mine to redact");
    }

    // ---------- helpers ----------

    @Test
    void deleteAccountForTheProvisionedAdminIsRefusedAndErasesNothing() {
        // The env-provisioned admin (kind ADMIN) is the deployment's access
        // path: a direct service call must be refused (403) and erase
        // nothing — shelters, claims and the row all survive.
        AdminUser admin = new AdminUser("Admin", "admin@example.ee", null);
        admin.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "system",
                "admin@example.ee", NOW));
        users.save(admin);
        Shelter publicShelter = saveShelter("Varjupaik", admin.getId(), LocationKind.PUBLIC);

        assertThatThrownBy(() -> service.deleteAccount(admin))
                .isInstanceOf(ProvisionedAdminProtectedException.class)
                .hasMessage(AccountService.PROVISIONED_ADMIN_DELETE_MESSAGE);

        assertThat(users.findById(admin.getId()))
                .as("the account row survives the refused erasure")
                .isNotNull();
        assertThat(shelters.findById(publicShelter.getId()))
                .as("the admin's shelters are untouched")
                .isPresent();
        assertThat(admin.claims())
                .as("the verification claims survive")
                .hasSize(1);
    }

    @Test
    void deleteAccountStillWorksForAnOrdinaryAccount() {
        // The refusal is scoped to the ADMIN kind — a REGISTERED account
        // keeps the full legal-recovery erasure.
        RegisteredUser user = saveVerifiedUser("Mari", "mari@example.ee");

        service.deleteAccount(user);

        assertThat(users.findById(user.getId())).isNull();
    }

    private RegisteredUser saveVerifiedUser(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+37250000000");
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, NOW));
        users.save(user);
        return user;
    }

    private Shelter saveShelter(String name, Long ownerId, LocationKind kind) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4370, 24.7536),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        shelter.setCreatedBy(ownerId);
        shelter.setLocationKind(kind);
        shelters.save(shelter);
        return shelter;
    }

    /** The flows under test never hash; the constructor still requires a hasher. */
    private static final class PlainTextHasher implements PasswordHasher {

        @Override
        public String hash(String plain) {
            return "hashed:" + plain;
        }

        @Override
        public boolean verify(String plain, String hash) {
            return plain != null && hash != null && hash.equals(hash(plain));
        }
    }
}
