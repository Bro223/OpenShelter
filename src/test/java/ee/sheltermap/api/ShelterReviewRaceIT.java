package ee.sheltermap.api;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * W20b: two requests racing the FIRST review of the same (shelter, user)
 * against the real DB unique index {@code uq_shelter_reviews_shelter_user}.
 *
 * <p>Whatever interleaving wins, the invariants are identical: exactly one
 * create, the other resolves to an in-place update (either via the DIVE
 * re-read path or because its find already saw the winner's committed row),
 * no 500, and the final state is one review carrying the LAST writer's
 * content (the loser always writes after the winner's insert committed).
 *
 * <p>Raced at the service level — the exact path the POST controller
 * delegates to — with the real JPA repositories and Postgres, because the
 * race lives in the service + DB constraint, not in the HTTP layer.
 * Deliberately NOT {@code @Transactional}: the two threads need their own
 * committed transactions for the constraint to fire.
 */
class ShelterReviewRaceIT extends AbstractPersistenceIT {

    @Autowired
    ShelterReviewService reviewService;

    @Autowired
    ShelterReviewRepository reviews;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    UserRepository users;

    @AfterEach
    void cleanUpCommittedRaceRows() {
        wipeAllTables();
    }

    @Test
    void concurrentFirstReviewsResolveToOneCreateAndOneUpdate() throws Exception {
        RegisteredUser user = saveUser(users, "review-race@example.ee", "+37250090001");
        user.addVerification(new VerificationClaim(
                VerificationLevel.EMAIL, "dev", "review-race@example.ee", Instant.now()));
        users.save(user);

        Shelter shelter = new Shelter("Race varjend", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        shelters.save(shelter);

        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<ShelterReviewService.SaveResult> a = pool.submit(() -> {
                barrier.await(5, TimeUnit.SECONDS);
                return reviewService.addReview(user, shelter.getId(), 4, "from thread A");
            });
            Future<ShelterReviewService.SaveResult> b = pool.submit(() -> {
                barrier.await(5, TimeUnit.SECONDS);
                return reviewService.addReview(user, shelter.getId(), 2, "from thread B");
            });

            // Both threads must finish cleanly — a 500-class failure (e.g. an
            // unhandled FK DIVE or an uncaught constraint exception) surfaces
            // here as an ExecutionException.
            ShelterReviewService.SaveResult resultA = a.get(15, TimeUnit.SECONDS);
            ShelterReviewService.SaveResult resultB = b.get(15, TimeUnit.SECONDS);

            List<Boolean> created = List.of(resultA.created(), resultB.created());
            assertThat(created).containsExactlyInAnyOrder(true, false);

            // Final state: exactly ONE review row for (shelter, user)…
            List<ShelterReview> finalReviews = reviews.findByShelterIdAndUserId(
                    shelter.getId(), user.getId()).stream().toList();
            assertThat(finalReviews).hasSize(1);

            // …carrying the LOSER's content — the loser's write always lands
            // after the winner's insert committed.
            ShelterReviewService.SaveResult loser =
                    resultA.created() ? resultB : resultA;
            ShelterReview finalReview = finalReviews.get(0);
            assertThat(finalReview.getRating()).isEqualTo(loser.review().getRating());
            assertThat(finalReview.getComment()).isEqualTo(loser.review().getComment());
        } finally {
            pool.shutdownNow();
        }
    }
}
