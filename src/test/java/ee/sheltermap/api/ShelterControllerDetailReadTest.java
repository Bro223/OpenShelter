package ee.sheltermap.api;

import ee.sheltermap.app.InMemoryDataImportLog;
import ee.sheltermap.app.InMemoryModerationAuditLog;
import ee.sheltermap.app.InMemoryShelterInfoRequestLog;
import ee.sheltermap.app.InMemoryShelterOccupancyRepository;
import ee.sheltermap.app.InMemoryShelterOpenStatusRepository;
import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.app.InMemoryShelterReportRepository;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.ReporterTrustEvaluator;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterOccupancyReport;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The public detail read ({@code GET /api/shelters/{id}} with a Bearer
 * token) must not pay the caller's DOMAIN MAPPING: the projection only
 * uses the caller's id (the live occupancy band / open-status
 * lookups), so the full aggregate load (PII decrypt of the
 * e-mail/phone envelopes + the claims query) is wasted work on a PUBLIC
 * read path — the same rule {@code JwtAuthenticationFilter} is written
 * around (its per-token reads are column-only for exactly this reason).
 */
class ShelterControllerDetailReadTest {

    private static final Instant NOW = Instant.parse("2026-09-11T12:00:00Z");
    private static final Clock FIXED = Clock.fixed(NOW, ZoneOffset.UTC);

    /**
     * The repository spy the before/after proof hangs on: counts every
     * full domain-mapping read ({@code findById} — entity + claims + PII
     * decrypt) versus every column-only read.
     */
    private static class CountingUserRepository extends InMemoryUserRepository {
        int findByIdCalls;
        int existsByIdCalls;

        @Override
        public User findById(Long id) {
            findByIdCalls++;
            return super.findById(id);
        }

        @Override
        public boolean existsById(long userId) {
            existsByIdCalls++;
            return super.existsById(userId);
        }
    }

    private CountingUserRepository users;
    private InMemoryShelterOccupancyRepository occupancy;
    private ShelterController controller;
    private Shelter shelter;

    @BeforeEach
    void setUp() {
        users = new CountingUserRepository();
        InMemoryShelterRepository shelters = new InMemoryShelterRepository();
        InMemoryShelterReportRepository reports = new InMemoryShelterReportRepository();
        occupancy = new InMemoryShelterOccupancyRepository();
        InMemoryShelterOpenStatusRepository openStatus = new InMemoryShelterOpenStatusRepository();
        InMemoryModerationAuditLog audit = new InMemoryModerationAuditLog(FIXED);
        ShelterQueryService queryService = new ShelterQueryService(shelters, users, reports,
                occupancy, openStatus, new InMemoryDataImportLog(),
                audit, new ReporterTrustEvaluator(shelters, audit),
                new InMemoryShelterInfoRequestLog(FIXED), FIXED);
        controller = new ShelterController(queryService, null, null, users, null);

        shelter = new Shelter("Detail House", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        shelters.save(shelter);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /** The JWT filter's shape: principal = the user id, no authorities. */
    private static void authenticateAs(long userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId, null, List.of()));
    }

    @Test
    void detailReadWithABearerTokenDoesNotBuildACallerDomainUser() {
        RegisteredUser caller = new RegisteredUser("Mari", "mari@example.ee", "+3725100001");
        users.save(caller);
        occupancy.save(new ShelterOccupancyReport(
                shelter.getId(), caller.getId(), OccupancyBand.GETTING_FULL, NOW.minusSeconds(60)));
        authenticateAs(caller.getId());

        ShelterDto dto = controller.get(shelter.getId());

        // The caller id still reaches the projection (their live band comes back)…
        assertThat(dto.yourOccupancyBand()).isEqualTo(OccupancyBand.GETTING_FULL);
        // …and the read paid NO domain mapping for it: no entity load,
        // no claims query, no PII decrypt — the column-only id check only.
        assertThat(users.findByIdCalls)
                .as("the public detail read must not run the caller's full domain mapping")
                .isZero();
        assertThat(users.existsByIdCalls)
                .as("the caller's existence is settled by one column-only check")
                .isEqualTo(1);
    }

    @Test
    void detailReadWithATokenForADeletedAccountStaysGuestLike() {
        // The erasure contract (legal-recovery): the JWT stays valid until
        // expiry after the row is deleted — the read must degrade to the
        // guest projection exactly as it always has.
        RegisteredUser caller = new RegisteredUser("Moot", "moot@example.ee", "+3725100002");
        users.save(caller);
        long callerId = caller.getId();
        occupancy.save(new ShelterOccupancyReport(
                shelter.getId(), callerId, OccupancyBand.GETTING_FULL, NOW.minusSeconds(60)));
        users.delete(callerId);
        authenticateAs(callerId);

        ShelterDto dto = controller.get(shelter.getId());

        // Same behavior as before the column-only change: a deleted
        // caller's band is null (guest), the read still succeeds.
        assertThat(dto.yourOccupancyBand()).isNull();
        assertThat(users.findByIdCalls).isZero();
        assertThat(users.existsByIdCalls).isEqualTo(1);
    }

    @Test
    void detailReadWithoutATokenStaysGuestLike() {
        // No security context at all (anonymous read): no user lookup of
        // any kind may happen.
        ShelterDto dto = controller.get(shelter.getId());

        assertThat(dto.yourOccupancyBand()).isNull();
        assertThat(users.findByIdCalls).isZero();
    }
}
