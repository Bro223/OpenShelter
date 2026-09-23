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

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
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
 * this IT pins the CONCURRENT crossing, whose invariants must hold for
 * whichever interleaving the scheduler picks:
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
 * <p>Two phases per crossing:
 *
 * <ul>
 *   <li><strong>the CONFLICT interleaving, made deterministic.</strong>
 *       Before the latched pair starts, the shelters row is row-locked
 *       ({@code SELECT ... FOR UPDATE} on a dedicated pooled connection).
 *       Each worker's report INSERT takes FOR KEY SHARE on the same row
 *       through the {@code shelter_reports.shelter_id} FK, and KEY SHARE
 *       conflicts ONLY with FOR UPDATE — so both workers are provably
 *       queued behind the pin: neither can commit its report, let alone
 *       its promotion, before the pin is released. Both workers have
 *       therefore loaded the row version their promotion UPDATE guards on
 *       BEFORE either can commit, and exactly one versioned promotion can
 *       succeed: the pin moves the barrier to the only place where it
 *       matters (between the two writers' row reads and their commits)
 *       without touching production code. The pin is released only once
 *       BOTH workers are observably waiting on the row
 *       ({@code pg_stat_activity}); the observation, not the scheduler,
 *       is what the conflict guarantee rests on;</li>
 *   <li><strong>the scheduler's NATURAL interleaving</strong> (no pin):
 *       the latched pair is left to whatever overlap the machine
 *       produces, and the full invariant set is asserted for EITHER
 *       outcome — the conflicted one (exactly one 200, one retryable 409)
 *       and the non-conflicted one (both 200, no second transition
 *       attempted).</li>
 * </ul>
 *
 * <p>Why the pin (and why the old design was a runner verdict): the
 * pre-pin version latched pairs and failed if 12 of them never produced a
 * 409 — a green run that never saw the conflict was hollow, but a red one
 * was a verdict on the RUNNER's scheduler, not on the code: a machine
 * that deschedules one worker by a full request's worth of wall time
 * misses the overlap on every pair and goes red while the product is
 * fine. The pin removes that verdict: when the both-queued observation
 * holds, a pinned pair's outcomes are asserted to be EXACTLY one 200 and
 * one 409 — the invariant, not a probability. The pin can only ADD
 * overlap; it never removes an invariant, so nothing is hollowed.
 *
 * <p>The residual guard is honest, not relaxed: if the both-queued wait
 * times out (pathological scheduling — a worker has not reached its
 * blocking INSERT within 20 s), that pair is scored as a natural one, and
 * the test STILL fails loudly if neither any pinned pair nor any natural
 * pair ever exercised the conflict interleaving.
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

    /** Pinned pairs per crossing: the conflict interleaving, guaranteed by construction. */
    private static final int PINNED_ATTEMPTS = 2;

    /** Natural (unpinned) latched pairs per crossing: the scheduler's own interleaving. */
    private static final int NATURAL_ATTEMPTS = 3;

    /** How long to wait for both workers to become observably queued behind the pin. */
    private static final long PIN_WAIT_MS = 20_000;

    /** Poll interval for the both-queued observation. */
    private static final long PIN_POLL_MS = 100;

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

    @Autowired
    DataSource dataSource;

    private int nextContact = 1;

    @AfterEach
    void cleanUpCommittedRaceRows() {
        wipeAllTables();
    }

    // ---------- the positive crossing: two racers race the 3rd distinct confirmation ----------

    @Test
    void twoConcurrentCrossingConfirmationsPromoteExactlyOnce() throws Exception {
        boolean conflictSeen = false;
        // Phase 1 — the CONFLICT interleaving, deterministic: the shelters
        // row is row-pinned, so both latched writers load the same version
        // before either can commit.
        for (int i = 1; i <= PINNED_ATTEMPTS && !conflictSeen; i++) {
            long id = seedNewShelter("Pinned confirm " + i);

            // Two distinct confirmers are stored sequentially: the tally is
            // exactly one distinct confirmer short of the threshold.
            Racer seed1 = racer();
            Racer seed2 = racer();
            assertThat(postReport(id, seed1, "OPEN_CONFIRMED").status()).isEqualTo(200);
            assertThat(postReport(id, seed2, "OPEN_CONFIRMED").status()).isEqualTo(200);
            assertThat(reviewStatus(id)).isEqualTo("NEW"); // below the threshold

            // The race: two DISTINCT users POST the crossing report latched,
            // behind the row pin.
            Racer first = racer();
            Racer second = racer();
            PinRace pair = pinnedRace(id, first, second, "OPEN_CONFIRMED");
            int s1 = pair.outcomes()[0].status();
            int s2 = pair.outcomes()[1].status();

            if (pair.pinned()) {
                // Both writers provably held the same row version before
                // either could commit: exactly one versioned promotion can
                // win, so the split is EXACTLY one 200 and one 409.
                assertThat((s1 == 200 && s2 == 409) || (s1 == 409 && s2 == 200))
                        .as("pinned pair %d: exactly one promotion, exactly one 409", i)
                        .isTrue();
            }
            conflictSeen = conflictSeen || s1 == 409 || s2 == 409;
            assertConfirmCrossing(i, pair.outcomes(), id, first, second);
        }
        // Phase 2 — the scheduler's NATURAL interleaving (no pin): the
        // invariants hold for whichever ordering the machine produces.
        for (int i = 1; i <= NATURAL_ATTEMPTS && !conflictSeen; i++) {
            long id = seedNewShelter("Confirm race " + i);

            Racer seed1 = racer();
            Racer seed2 = racer();
            assertThat(postReport(id, seed1, "OPEN_CONFIRMED").status()).isEqualTo(200);
            assertThat(postReport(id, seed2, "OPEN_CONFIRMED").status()).isEqualTo(200);
            assertThat(reviewStatus(id)).isEqualTo("NEW"); // below the threshold

            Racer first = racer();
            Racer second = racer();
            Outcome[] outcomes = race(id, first, second, "OPEN_CONFIRMED");
            int s1 = outcomes[0].status();
            int s2 = outcomes[1].status();
            conflictSeen = conflictSeen || s1 == 409 || s2 == 409;
            assertConfirmCrossing(i, outcomes, id, first, second);
        }
        assertThat(conflictSeen)
                .as("no pinned or natural pair conflicted — the @Version conflict "
                        + "interleaving was never exercised")
                .isTrue();
    }

    // ---------- the auto-hide twin: two racers race the threshold-crossing weight ----------

    @Test
    void twoConcurrentCrossingHideReportsDeactivateExactlyOnce() throws Exception {
        boolean conflictSeen = false;
        for (int i = 1; i <= PINNED_ATTEMPTS && !conflictSeen; i++) {
            long id = seedNewShelter("Pinned hide " + i);

            // Four distinct weight-1 NON_EXISTENT reporters: the weighted
            // tally is 4, exactly one weight point short of the threshold 5.
            for (int j = 1; j <= 4; j++) {
                assertThat(postReport(id, racer(), "NON_EXISTENT").status()).isEqualTo(200);
            }
            assertThat(shelterStatus(id)).as("pair %d", i).isEqualTo("ACTIVE");

            Racer first = racer();
            Racer second = racer();
            PinRace pair = pinnedRace(id, first, second, "NON_EXISTENT");
            int s1 = pair.outcomes()[0].status();
            int s2 = pair.outcomes()[1].status();

            if (pair.pinned()) {
                // Same guarantee as the confirm side: one hide transition,
                // one 409 — exactly one, by construction.
                assertThat((s1 == 200 && s2 == 409) || (s1 == 409 && s2 == 200))
                        .as("pinned pair %d: exactly one hide transition, exactly one 409", i)
                        .isTrue();
            }
            conflictSeen = conflictSeen || s1 == 409 || s2 == 409;
            assertHideCrossing(i, pair.outcomes(), id, first, second);
        }
        for (int i = 1; i <= NATURAL_ATTEMPTS && !conflictSeen; i++) {
            long id = seedNewShelter("Hide race " + i);

            for (int j = 1; j <= 4; j++) {
                assertThat(postReport(id, racer(), "NON_EXISTENT").status()).isEqualTo(200);
            }
            assertThat(shelterStatus(id)).as("pair %d", i).isEqualTo("ACTIVE");

            Racer first = racer();
            Racer second = racer();
            Outcome[] outcomes = race(id, first, second, "NON_EXISTENT");
            int s1 = outcomes[0].status();
            int s2 = outcomes[1].status();
            conflictSeen = conflictSeen || s1 == 409 || s2 == 409;
            assertHideCrossing(i, outcomes, id, first, second);
        }
        assertThat(conflictSeen)
                .as("no pinned or natural pair conflicted — the @Version conflict "
                        + "interleaving was never exercised")
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

    /**
     * The latched pair race with the shelters row PINNED: the pin
     * ({@link #pinRow}) is taken BEFORE either worker starts, so both
     * workers' report INSERTs — the first statement in their transactions
     * to touch the shelters row (the FK's FOR KEY SHARE) — queue behind
     * it. The pin is released once BOTH workers are observably waiting on
     * the row ({@link #awaitBothReportInsertsBlocked}), or after the
     * wait timeout in the pathological case. The returned
     * {@code pinned} flag reports whether the both-queued observation
     * held — i.e. whether this pair's conflict is guaranteed by
     * construction or left to the scheduler (scored as a natural pair).
     */
    private PinRace pinnedRace(long shelterId, Racer first, Racer second, String type)
            throws Exception {
        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        Connection pin = pinRow(shelterId);
        Future<Outcome> a;
        Future<Outcome> b;
        boolean pinned;
        long waitStart = System.nanoTime();
        try {
            a = pool.submit(
                    () -> latchedPost(shelterId, first, type, barrier));
            b = pool.submit(
                    () -> latchedPost(shelterId, second, type, barrier));
            pinned = awaitBothReportInsertsBlocked();
        } finally {
            try {
                // Release the FOR UPDATE — both INSERTs may proceed.
                pin.rollback();
            } finally {
                pin.close();
            }
        }
        // Diagnostic (the sibling COST IT's idiom): a future red run shows
        // whether the pin's both-queued observation held — pinned=true means
        // the conflict interleaving was guaranteed by construction for this
        // pair, not left to the scheduler.
        System.out.println("RACE pin: both-queued=" + pinned + " after "
                + (System.nanoTime() - waitStart) / 1_000_000 + " ms");
        try {
            return new PinRace(new Outcome[]{
                    a.get(60, TimeUnit.SECONDS),
                    b.get(60, TimeUnit.SECONDS),
            }, pinned);
        } catch (ExecutionException | InterruptedException | java.util.concurrent.TimeoutException e) {
            throw new IllegalStateException("racing worker failed or hung: "
                    + e, e);
        } finally {
            pool.shutdownNow();
        }
    }

    /**
     * Row-locks the shelters row on a dedicated pooled connection
     * (autocommit off, so the lock lives until the connection's
     * transaction ends). FOR UPDATE conflicts with the FK's FOR KEY
     * SHARE — the only lock mode the workers' report INSERTs request on
     * this row — and with nothing else these workers take: their plain
     * SELECTs lock nothing, their action-log INSERT touches only the
     * users row, and their promotion UPDATE (FOR NO KEY UPDATE) runs
     * only AFTER the pin is released, so it can never deadlock against
     * the pin.
     */
    private Connection pinRow(long shelterId) throws SQLException {
        Connection pin = dataSource.getConnection();
        pin.setAutoCommit(false);
        try (Statement st = pin.createStatement()) {
            st.execute("SELECT id FROM shelters WHERE id = " + shelterId + " FOR UPDATE");
        }
        return pin;
    }

    /**
     * Wait until BOTH workers are observably queued behind the pin. Their
     * report INSERT is the first statement in their transactions that
     * touches the shelters row, so two client backends waiting on a lock
     * while executing exactly that INSERT is the both-loaded-same-version
     * state the pin is meant to force. Polls with a generous timeout: this
     * is a wait on a condition, not an assertion on scheduler cooperation
     * — a timeout only downgrades the pair to "natural" semantics.
     */
    private boolean awaitBothReportInsertsBlocked() {
        long deadline = System.currentTimeMillis() + PIN_WAIT_MS;
        while (true) {
            Integer waiting = jdbc.queryForObject(
                    "SELECT count(*) FROM pg_stat_activity "
                            + "WHERE backend_type = 'client backend' "
                            + "AND wait_event_type = 'Lock' "
                            + "AND query ILIKE 'insert into shelter_reports%'",
                    Integer.class);
            if (waiting != null && waiting >= 2) {
                return true;
            }
            if (System.currentTimeMillis() >= deadline) {
                return false;
            }
            try {
                Thread.sleep(PIN_POLL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
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

    /**
     * The per-pair invariant set for the confirm crossing: each
     * writer's client-visible outcome (a stored report, or the
     * optimistic-lock 409 with its pinned message — never a 5xx), the
     * loser's report retryable after the rollback, exactly ONE promotion
     * (the row ends CONFIRMED with exactly one AUTO_CONFIRM row, the
     * actor of record a racer — the winner when the interleaving
     * conflicted), and all four confirmations stored.
     */
    private void assertConfirmCrossing(int pair, Outcome[] outcomes, long id,
                                       Racer first, Racer second) throws Exception {
        int s1 = outcomes[0].status();
        int s2 = outcomes[1].status();

        // The client-visible outcome of EACH writer: a stored report
        // (200) or the documented 409 — never a 5xx, never a 404/400/403.
        // A 409 here is the OPTIMISTIC-LOCK 409 (the versioned UPDATE
        // found the row moved), not the duplicate-report 409 — the
        // message pins which.
        assertThat(s1).as("pair %d: first writer", pair).isIn(200, 409);
        assertThat(s2).as("pair %d: second writer", pair).isIn(200, 409);
        if (s1 == 409) {
            assertThat(outcomes[0].message()).as("pair %d", pair).isEqualTo(CONFLICT_MESSAGE);
        }
        if (s2 == 409) {
            assertThat(outcomes[1].message()).as("pair %d", pair).isEqualTo(CONFLICT_MESSAGE);
        }

        // The 409 is RETRYABLE: the loser's report rolled back with the
        // transaction, so the duplicate pre-check now passes and the
        // re-POST stores it.
        if (s1 == 409) {
            assertThat(postReport(id, first, "OPEN_CONFIRMED").status())
                    .as("pair %d: the loser's retry stores its report", pair)
                    .isEqualTo(200);
        }
        if (s2 == 409) {
            assertThat(postReport(id, second, "OPEN_CONFIRMED").status())
                    .as("pair %d: the loser's retry stores its report", pair)
                    .isEqualTo(200);
        }

        // Exactly ONE promotion: the row ends CONFIRMED with exactly one
        // AUTO_CONFIRM row (a second crossing writer's stale-snapshot
        // promotion would add a second row or a version-conflict 500).
        assertThat(reviewStatus(id)).as("pair %d", pair).isEqualTo("CONFIRMED");
        assertThat(auditCount(id, "AUTO_CONFIRM"))
                .as("pair %d: exactly one promotion writes the audit row", pair)
                .isEqualTo(1);

        // All four confirmations end up stored (the loser's after retry).
        assertThat(reportCount(id, "OPEN_CONFIRMED"))
                .as("pair %d: no report is silently dropped", pair)
                .isEqualTo(4);

        // The actor of record is a RACER, and — when the interleaving
        // conflicted — the actor is the winner, never the rolled-back
        // writer (its promotion, with its audit row, rolled back).
        Long actor = auditActor(id, "AUTO_CONFIRM");
        assertThat(actor).as("pair %d", pair).isIn(first.id(), second.id());
        if (s1 == 409) {
            assertThat(actor).as("pair %d", pair).isEqualTo(second.id());
        }
        if (s2 == 409) {
            assertThat(actor).as("pair %d", pair).isEqualTo(first.id());
        }
    }

    /**
     * The per-pair invariant set for the hide crossing: same client-
     * visible outcome contract (200, or the optimistic-lock 409 with its
     * pinned message, loser's report retryable), the row ends INACTIVE
     * (exactly one hide transition — the auto-hide crossing writes NO
     * audit row, the documented asymmetry with the AUTO_CONFIRM side,
     * review 18 F2), and all six reports end up stored.
     */
    private void assertHideCrossing(int pair, Outcome[] outcomes, long id,
                                    Racer first, Racer second) throws Exception {
        int s1 = outcomes[0].status();
        int s2 = outcomes[1].status();

        assertThat(s1).as("pair %d: first writer", pair).isIn(200, 409);
        assertThat(s2).as("pair %d: second writer", pair).isIn(200, 409);
        if (s1 == 409) {
            assertThat(outcomes[0].message()).as("pair %d", pair).isEqualTo(CONFLICT_MESSAGE);
        }
        if (s2 == 409) {
            assertThat(outcomes[1].message()).as("pair %d", pair).isEqualTo(CONFLICT_MESSAGE);
        }

        // Same retry contract as the positive side: the rolled-back
        // report is re-POSTable.
        if (s1 == 409) {
            assertThat(postReport(id, first, "NON_EXISTENT").status())
                    .as("pair %d: the loser's retry stores its report", pair)
                    .isEqualTo(200);
        }
        if (s2 == 409) {
            assertThat(postReport(id, second, "NON_EXISTENT").status())
                    .as("pair %d: the loser's retry stores its report", pair)
                    .isEqualTo(200);
        }

        // Exactly one hide transition: the row ends INACTIVE and stays
        // there (a second crossing writer's stale-snapshot hide would
        // need a second transition — and would 409/500 on the version).
        assertThat(shelterStatus(id)).as("pair %d", pair).isEqualTo("INACTIVE");

        // All six reports end up stored (the loser's after retry).
        assertThat(reportCount(id, "NON_EXISTENT"))
                .as("pair %d: no report is silently dropped", pair)
                .isEqualTo(6);

        // The auto-hide crossing writes NO audit row — the report queue
        // evidences the hide.
        assertThat(auditCount(id, "AUTO_CONFIRM")).as("pair %d", pair).isZero();
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

    /**
     * A pinned pair: the two outcomes in worker order, plus whether the
     * both-queued observation held (the conflict guaranteed by
     * construction) or the wait timed out (the pair is a natural one).
     */
    private record PinRace(Outcome[] outcomes, boolean pinned) {
    }
}
