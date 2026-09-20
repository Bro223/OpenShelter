package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterLimitExceededException;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterService;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The per-user active-shelter cap is a read-check-write (count the user's
 * ACTIVE USER rows, then insert). Without a concurrency guard, two
 * concurrent submissions by the same user can BOTH pass the count and both
 * insert — the 11th row exists although the cap is 10. With the guard, the
 * submissions serialize per user: exactly ONE wins the last slot, the other
 * gets the documented 409 ({@link ShelterLimitExceededException}), and the
 * table ends at exactly the cap.
 *
 * <p>Deliberately NOT {@code @Transactional}: the worker threads run in
 * their own committed transactions (the workers' rows must be visible to
 * each other's cap checks), so the race's writes are meant to persist.
 * {@link #cleanUpCommittedRaceRows()} wipes the shared container's tables
 * afterwards, the same convention as the other race ITs.
 *
 * <p>The PRODUCTION {@code ShelterService} bean is used (not a hand-built
 * one): the {@code @Transactional} boundary that makes the per-user lock
 * hold until the insert is part of the production wiring this test
 * proves. The daily submission cap is raised via
 * {@link #dailyCapAboveTheRace()} so the 11 submissions of the race hit
 * the ACTIVE-count cap, not the 24 h window cap.
 */
class ShelterSubmissionCapRaceIT extends AbstractPersistenceIT {

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    ShelterService service;

    /**
     * 11 submissions (9 seeds + 2 contenders) would otherwise trip the
     * default 5-per-24 h daily cap before the active-count cap — this
     * test isolates the active cap.
     */
    @DynamicPropertySource
    static void dailyCapAboveTheRace(DynamicPropertyRegistry registry) {
        registry.add("app.limits.daily-submissions-per-user", () -> "100");
    }

    @AfterEach
    void cleanUpCommittedRaceRows() {
        wipeAllTables();
    }

    @Test
    void twoConcurrentTenthSubmissionsExactlyOneWins() throws Exception {
        RegisteredUser user = saveUser(users, "cap-race@example.ee", "+37250008888");
        // canWrite() needs a verified level (the default policy grants
        // SUBMIT_SHELTER from any one claim).
        user.addVerification(new VerificationClaim(VerificationLevel.PHONE, "sms",
                "+37250008888", Instant.now()));
        users.save(user);

        // Nine ACTIVE USER shelters: the cap (10) is exactly one slot away.
        for (int i = 0; i < 9; i++) {
            Shelter seed = new Shelter("Cap seed " + i,
                    new GeoPoint(59.40 + i * 0.01, 24.70),
                    ShelterStatus.ACTIVE, null, ShelterSource.USER);
            seed.setCreatedBy(user.getId());
            shelters.save(seed);
        }

        // The request-snapshot user the controller would hand the service:
        // loaded ONCE, before the race — exactly the production shape
        // (currentUser() at request start, service call at request end).
        RegisteredUser snapshot = (RegisteredUser) users.findById(user.getId());
        assertThat(snapshot).isNotNull();

        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<?> first = pool.submit(submission(service, snapshot,
                    "Contender X", new GeoPoint(59.41, 24.71), barrier));
            Future<?> second = pool.submit(submission(service, snapshot,
                    "Contender Y", new GeoPoint(59.42, 24.72), barrier));

            long winners = 0;
            long rejected = 0;
            for (Future<?> attempt : List.of(first, second)) {
                try {
                    attempt.get(30, TimeUnit.SECONDS);
                    winners++;
                } catch (ExecutionException rejectedCap) {
                    assertThat(rejectedCap.getCause())
                            .isInstanceOf(ShelterLimitExceededException.class);
                    rejected++;
                }
            }
            assertThat(winners)
                    .as("exactly one submission may win the last active slot")
                    .isEqualTo(1);
            assertThat(rejected)
                    .as("the loser gets the documented 409")
                    .isEqualTo(1);
            assertThat(shelters.countByCreatedByAndSourceAndStatus(
                    user.getId(), ShelterSource.USER, ShelterStatus.ACTIVE))
                    .as("the cap holds after the race")
                    .isEqualTo(ShelterService.MAX_ACTIVE_SHELTERS_PER_USER);
        } finally {
            pool.shutdownNow();
        }
    }

    private static Callable<Object> submission(ShelterService service, RegisteredUser user,
                                               String name, GeoPoint point, CyclicBarrier barrier) {
        return () -> {
            barrier.await(30, TimeUnit.SECONDS);
            Shelter contender = new Shelter(name, point,
                    ShelterStatus.ACTIVE, null, ShelterSource.USER);
            service.addPlace(user, contender);
            return null;
        };
    }
}
