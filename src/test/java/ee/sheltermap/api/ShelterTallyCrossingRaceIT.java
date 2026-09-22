package ee.sheltermap.api;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.auth.TokenService;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * The trust-tally crossings under REAL concurrency (review 18 F1) — the
 * sequential crossing is pinned by {@link CommunityReviewIT#threeDistinctConfirmationsConfirmTheRowAndAuditTheCrossingOne()};
 * this IT latches two concurrent crossing writers against a row that is
 * exactly ONE action short of the threshold:
 *
 * <ul>
 *   <li>the positive crossing: a USER row in NEW with TWO distinct
 *       confirmers already stored; two distinct users race the
 *       OPEN_CONFIRMED report that brings the distinct-confirmer tally to
 *       (and past) {@code AUTO_CONFIRM_THRESHOLD} (3);</li>
 *   <li>the auto-hide twin: an ACTIVE row with a trust-weighted hide tally
 *       of 4 (four weight-1 NON_EXISTENT reporters); two distinct users
 *       race the fifth-weight report (threshold 5).</li>
 * </ul>
 *
 * <p>Every interleaving must end in the SAME invariants — which is what
 * makes the test meaningful: whichever ordering the scheduler picks, the
 * {@code shelters.version} column (not the stale {@code reviewStatus}
 * check) is the guard, and the client-visible outcome of the losing
 * writer is either a stored report or the documented 409 — never a 500,
 * never a silently dropped report:
 *
 * <ul>
 *   <li>exactly ONE promotion / ONE hide transition: exactly one
 *       AUTO_CONFIRM audit row on the confirm row, the row ends CONFIRMED;
 *       the hide row ends INACTIVE;</li>
 *   <li>when the interleaving conflicts, the loser gets 409 "The resource
 *       changed under you; reload and retry" and its LEGITIMATE report is
 *       rolled back with the transaction; the 409 is RETRYABLE — the
 *       re-POST stores the report (the duplicate pre-check now passes);</li>
 *   <li>when the interleaving does not conflict (the late loader already
 *       sees the promoted/hidden row), both reports are stored and no
 *       second transition is attempted.</li>
 * </ul>
 *
 * <p>The pair race is latched ({@link CyclicBarrier}) and repeated until at
 * least one pair actually conflicts; if 12 latched pairs never produce a
 * 409 the test fails — a green run that never saw the conflict interleaving
 * would be a hollow guard (this repository's own history of that class).
 *
 * <p>Deliberately NOT {@code @Transactional}: the worker threads run in
 * their own committed transactions (the workers' rows must be visible to
 * each other's tallies), so the race's writes are meant to persist.
 * {@link #cleanUpCommittedRaceRows()} wipes the shared container's tables
 * afterwards, the same convention as the other race ITs. The PRODUCTION
 * service bean sits behind the MockMvc dispatch — the {@code @Transactional}
 * boundary this test proves is the production wiring.
 */
@AutoConfigureMockMvc
class ShelterTallyCrossingRaceIT extends AbstractPersistenceIT {

    /** 12 latched pairs without a single conflict means the race was never exercised. */
    private static final int MAX_RACE_PAIRS = 12;

    /** The OLE 409 message (ApiErrorHandler) — the race's loser gets THIS 409, not the duplicate 409. */
    private static final String CONFLICT_MESSAGE = "The resource changed under you; reload and retry";

    @Autowired
    MockMvc mvc;

    @Autowired
    ee.sheltermap.app.UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    TokenService tokens;

    @Autowired
    JdbcTemplate jdbc;

    private int nextContact = 1;

    @AfterEach
    void cleanUpCommittedRaceRows() {
        wipeAllTables();
    }

    // ---------- the positive crossing: two racers race the 3rd distinct confirmation ----------

    @Test
    void twoConcurrentCrossingConfirmationsPromoteExactlyOnce() throws Exception {
        boolean conflictSeen = false;
        for (int attempt = 1; attempt <= MAX_RACE_PAIRS && !conflictSeen; attempt++) {
            long id = seedNewShelter("Confirm race " + attempt);

            // Two distinct confirmers are stored sequentially: the tally is
            // exactly one distinct confirmer short of the threshold.
            Racer seed1 = racer();
            Racer seed2 = racer();
            assertThat(postReport(id, seed1, "OPEN_CONFIRMED").status()).isEqualTo(200);
            assertThat(postReport(id, seed2, "OPEN_CONFIRMED").status()).isEqualTo(200);
            assertThat(reviewStatus(id)).isEqualTo("NEW"); // below the threshold

            // The race: two DISTINCT users POST the crossing report latched.
            Racer first = racer();
            Racer second = racer();
            Outcome[] outcomes = race(id, first, second, "OPEN_CONFIRMED");
            int s1 = outcomes[0].status();
            int s2 = outcomes[1].status();

            // The client-visible outcome of EACH writer: a stored report
            // (200) or the documented 409 — never a 5xx, never a 404/400/403.
            assertThat(s1).as("pair %d: first writer", attempt).isIn(200, 409);
            assertThat(s2).as("pair %d: second writer", attempt).isIn(200, 409);
            // A 409 here is the OPTIMISTIC-LOCK 409 (the versioned UPDATE
            // found the row moved), not the duplicate-report 409 — the
            // message pins which.
            if (s1 == 409) {
                assertThat(outcomes[0].message()).as("pair %d", attempt).isEqualTo(CONFLICT_MESSAGE);
            }
            if (s2 == 409) {
                assertThat(outcomes[1].message()).as("pair %d", attempt).isEqualTo(CONFLICT_MESSAGE);
            }
            conflictSeen = conflictSeen || s1 == 409 || s2 == 409;

            // The 409 is RETRYABLE: the loser's report rolled back with the
            // transaction, so the duplicate pre-check now passes and the
            // re-POST stores it.
            if (s1 == 409) {
                assertThat(postReport(id, first, "OPEN_CONFIRMED").status())
                        .as("pair %d: the loser's retry stores its report", attempt)
                        .isEqualTo(200);
            }
            if (s2 == 409) {
                assertThat(postReport(id, second, "OPEN_CONFIRMED").status())
                        .as("pair %d: the loser's retry stores its report", attempt)
                        .isEqualTo(200);
            }

            // Exactly ONE promotion: the row ends CONFIRMED with exactly
            // one AUTO_CONFIRM row (a second crossing writer's stale-snapshot
            // promotion would add a second row or a version-conflict 500).
            assertThat(reviewStatus(id)).as("pair %d", attempt).isEqualTo("CONFIRMED");
            assertThat(auditCount(id, "AUTO_CONFIRM"))
                    .as("pair %d: exactly one promotion writes the audit row", attempt)
                    .isEqualTo(1);

            // All four confirmations end up stored (the loser's after retry).
            assertThat(reportCount(id, "OPEN_CONFIRMED"))
                    .as("pair %d: no report is silently dropped", attempt)
                    .isEqualTo(4);

            // The actor of record is a RACER, and — when the interleaving
            // conflicted — the actor is the winner, never the rolled-back
            // writer (its promotion, with its audit row, rolled back).
            Long actor = auditActor(id, "AUTO_CONFIRM");
            assertThat(actor).as("pair %d", attempt).isIn(first.id(), second.id());
            if (s1 == 409) {
                assertThat(actor).as("pair %d", attempt).isEqualTo(second.id());
            }
            if (s2 == 409) {
                assertThat(actor).as("pair %d", attempt).isEqualTo(first.id());
            }
        }
        assertThat(conflictSeen)
                .as("no latched pair conflicted across %d attempts — the "
                        + "@Version conflict interleaving was never exercised", MAX_RACE_PAIRS)
                .isTrue();
    }

    // ---------- the auto-hide twin: two racers race the threshold-crossing weight ----------

    @Test
    void twoConcurrentCrossingHideReportsDeactivateExactlyOnce() throws Exception {
        boolean conflictSeen = false;
        for (int attempt = 1; attempt <= MAX_RACE_PAIRS && !conflictSeen; attempt++) {
            long id = seedNewShelter("Hide race " + attempt);

            // Four distinct weight-1 NON_EXISTENT reporters: the weighted
            // tally is 4, exactly one weight point short of the threshold 5.
            for (int i = 1; i <= 4; i++) {
                assertThat(postReport(id, racer(), "NON_EXISTENT").status()).isEqualTo(200);
            }
            assertThat(shelterStatus(id)).as("pair %d", attempt).isEqualTo("ACTIVE");

            Racer first = racer();
            Racer second = racer();
            Outcome[] outcomes = race(id, first, second, "NON_EXISTENT");
            int s1 = outcomes[0].status();
            int s2 = outcomes[1].status();

            assertThat(s1).as("pair %d: first writer", attempt).isIn(200, 409);
            assertThat(s2).as("pair %d: second writer", attempt).isIn(200, 409);
            if (s1 == 409) {
                assertThat(outcomes[0].message()).as("pair %d", attempt).isEqualTo(CONFLICT_MESSAGE);
            }
            if (s2 == 409) {
                assertThat(outcomes[1].message()).as("pair %d", attempt).isEqualTo(CONFLICT_MESSAGE);
            }
            conflictSeen = conflictSeen || s1 == 409 || s2 == 409;

            // Same retry contract as the positive side: the rolled-back
            // report is re-POSTable.
            if (s1 == 409) {
                assertThat(postReport(id, first, "NON_EXISTENT").status())
                        .as("pair %d: the loser's retry stores its report", attempt)
                        .isEqualTo(200);
            }
            if (s2 == 409) {
                assertThat(postReport(id, second, "NON_EXISTENT").status())
                        .as("pair %d: the loser's retry stores its report", attempt)
                        .isEqualTo(200);
            }

            // Exactly one hide transition: the row ends INACTIVE and stays
            // there (a second crossing writer's stale-snapshot hide would
            // need a second transition — and would 409/500 on the version).
            assertThat(shelterStatus(id)).as("pair %d", attempt).isEqualTo("INACTIVE");

            // All six reports end up stored (the loser's after retry).
            assertThat(reportCount(id, "NON_EXISTENT"))
                    .as("pair %d: no report is silently dropped", attempt)
                    .isEqualTo(6);

            // The auto-hide crossing writes NO audit row — the documented
            // asymmetry with the AUTO_CONFIRM side (review 18 F2, spec-
            // silent; the report queue evidences the hide).
            assertThat(auditCount(id, "AUTO_CONFIRM")).as("pair %d", attempt).isZero();
        }
        assertThat(conflictSeen)
                .as("no latched pair conflicted across %d attempts — the "
                        + "@Version conflict interleaving was never exercised", MAX_RACE_PAIRS)
                .isTrue();
    }

    // ---------- helpers ----------

    /** A fresh USER shelter published NEW by a distinct (verified) author. */
    private long seedNewShelter(String name) {
        String email = "author-race" + nextContact + "@example.ee";
        RegisteredUser author = new RegisteredUser(name + " author", email,
                "+3725000000" + nextContact++);
        author.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp",
                email, Instant.now()));
        users.save(author);

        Shelter shelter = new Shelter(name, new GeoPoint(58.30 + (nextContact % 100) * 0.01,
                24.10 + (nextContact % 100) * 0.01),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        shelter.setCreatedBy(author.getId());
        // Only the submission service creates NEW rows (the field default
        // is CONFIRMED for registry backfill) — set it explicitly.
        shelter.setReviewStatus(ReviewStatus.NEW);
        shelters.save(shelter);
        return shelter.getId();
    }

    /** A fresh verified registered user with a ready access token. */
    private Racer racer() {
        String email = "racer-race" + nextContact + "@example.ee";
        RegisteredUser user = new RegisteredUser("Racer " + nextContact, email,
                "+3726000000" + nextContact++);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp",
                email, Instant.now()));
        users.save(user);
        return new Racer(user.getId(), tokens.issue(user).accessToken());
    }

    /**
     * Latched pair race: both workers hit the barrier, then each POSTs the
     * same report type for its own user. Returns the two outcomes in
     * worker order.
     */
    private Outcome[] race(long shelterId, Racer first, Racer second, String type) throws Exception {
        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Outcome> a = pool.submit(
                    () -> latchedPost(shelterId, first, type, barrier));
            Future<Outcome> b = pool.submit(
                    () -> latchedPost(shelterId, second, type, barrier));
            return new Outcome[]{
                    a.get(60, TimeUnit.SECONDS),
                    b.get(60, TimeUnit.SECONDS),
            };
        } catch (ExecutionException | InterruptedException | java.util.concurrent.TimeoutException e) {
            throw new IllegalStateException("racing worker failed or hung: "
                    + e, e);
        } finally {
            pool.shutdownNow();
        }
    }

    /** The latched worker body: one report POST, returns the outcome. */
    private Outcome latchedPost(long shelterId, Racer racer, String type, CyclicBarrier barrier)
            throws Exception {
        barrier.await(30, TimeUnit.SECONDS);
        return postReport(shelterId, racer, type);
    }

    /** Sequential report POST (the retry path uses this too) — the outcome. */
    private Outcome postReport(long shelterId, Racer racer, String type) throws Exception {
        MvcResult result = mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + racer.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"" + type + "\"}"))
                .andReturn();
        String message = null;
        if (result.getResponse().getStatus() != 200) {
            message = com.jayway.jsonpath.JsonPath
                    .read(result.getResponse().getContentAsString(), "$.message");
        }
        return new Outcome(result.getResponse().getStatus(), message);
    }

    private String reviewStatus(long shelterId) {
        return jdbc.queryForObject("SELECT review_status FROM shelters WHERE id = ?",
                String.class, shelterId);
    }

    private String shelterStatus(long shelterId) {
        return jdbc.queryForObject("SELECT status FROM shelters WHERE id = ?",
                String.class, shelterId);
    }

    private int auditCount(long shelterId, String action) {
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM moderation_actions WHERE shelter_id = ? AND action = ?",
                Integer.class, shelterId, action);
    }

    private Long auditActor(long shelterId, String action) {
        return jdbc.queryForObject(
                "SELECT moderator_id FROM moderation_actions WHERE shelter_id = ? AND action = ?",
                Long.class, shelterId, action);
    }

    private int reportCount(long shelterId, String type) {
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM shelter_reports WHERE shelter_id = ? AND type = ?",
                Integer.class, shelterId, type);
    }

    /** A racing participant: the user id (for the actor assertion) + token. */
    private record Racer(long id, String token) {
    }

    /** The HTTP outcome of one report POST (status + the error message, if any). */
    private record Outcome(int status, String message) {
    }
}
