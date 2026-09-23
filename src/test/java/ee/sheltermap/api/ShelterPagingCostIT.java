package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.guidance.GuidanceService;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * W2-A cost model: a paged request must pay for ITS PAGE, not for the corpus.
 *
 * <p>Measures the real DB work through {@code pg_stat_user_tables} deltas
 * around MockMvc requests (this class is deliberately NOT {@code
 * @Transactional}: every request gets a fresh persistence context, so the
 * statements you see here are the statements production runs). Because
 * the ITs share ONE Testcontainers database, every test WIPES its own
 * committed rows afterwards (the base class' {@code wipeAllTables} plus
 * the guidance tables this class seeds) — leaked corpus rows would
 * distort the statistics deltas AND poison the list-order assertions of
 * the ITs that run after this class. Two guards:
 *
 * <ul>
 * <li>the admin shelter list — before the W2-A change, every page (including
 * {@code limit=1}) loaded and batch-projected the ENTIRE shelter corpus;
 * the guard asserts a {@code limit=1} page reads fewer {@code shelters}
 * rows than a {@code limit=100} page. With the mandated {@code
 * X-Total-Count} count twin the scan count is fixed by design, so the
 * assertion is about tuple reads, not scan count;</li>
 * <li>the public guidance index — before the W2-A change, every page row
 * cost one extra {@code guidance_posts} read (a per-post detail fetch);
 * the guard asserts a two-row page costs at most the index scan plus one
 * batched read.</li>
 * </ul>
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
class ShelterPagingCostIT extends AbstractPersistenceIT {

    /**
     * Corpus size for the shelter measurements. Deliberately LARGE: below
     * ~a few thousand rows the planner seq-scans even the bounded page
     * (a LIMIT 1 over 240 rows is cheaper to read straight through), so
     * the limit=1 vs limit=100 tuple deltas collapse to zero and say
     * nothing. At 3000 rows the bounded page rides the PK index and the
     * deltas measure exactly what they should: the count twin's full
     * filtered scan + the page's own rows.
     */
    private static final int SHELTERS = 3000;

    /** Published posts for the guidance measurement. */
    private static final int POSTS = 6;

    /**
     * The settled-window tuple bands (inclusive), one per measured limit.
     * SINGLE SOURCE OF TRUTH: the assertions below read these, and the
     * retry detector ({@link #windowSettled}) gates on the very same
     * numbers — a measurement window is only accepted when the tuple
     * delta is in the band the request's two statements can produce.
     */
    private static final long LIMIT1_TUPLES_LO = SHELTERS + 1L;
    private static final long LIMIT1_TUPLES_HI = SHELTERS + 20L;
    private static final long LIMIT100_TUPLES_LO = SHELTERS + 50L;
    private static final long LIMIT100_TUPLES_HI = 2L * SHELTERS + 50L;

    @Autowired
    MockMvc mvc;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    UserRepository users;

    @Autowired
    GuidanceService guidance;

    @Autowired
    JdbcTemplate jdbc;

    @AfterEach
    void wipeOwnRows() {
        // The shared-container discipline for the DELIBERATELY non-
        // transactional ITs — but TARGETED, not the base class' blanket
        // wipe: this cleanup removes only what THIS class committed: the
        // guidance corpus (translations first — the FK child), the corpus
        // shelters (the class-unique name prefix — no other class seeds
        // that shape), and the guidance author. The provisioned admin row
        // is self-healing anyway — the base @BeforeEach re-runs the
        // create-if-absent seeder before every test — but the minimal
        // footprint keeps this class' rows out of other ITs' row counts.
        jdbc.execute("TRUNCATE guidance_post_translations, guidance_posts RESTART IDENTITY");
        jdbc.update("DELETE FROM shelters WHERE name LIKE 'W2A-COST-%'");
        try {
            jdbc.update("DELETE FROM users WHERE id = ?", userIdByEmail("w2acost@example.ee"));
        } catch (org.springframework.dao.EmptyResultDataAccessException absent) {
            // the guidance test did not run (or already cleaned) — nothing to do
        }
    }

    // ---------- the admin list pays for the page ----------

    @Test
    void theAdminListPaysForItsPageNotTheCorpus() throws Exception {
        // The corpus is this class' OWN rows, uniquely named (no other
        // class seeds the W2A-COST- shape), each save in its own short
        // transaction. The measurement is therefore self-contained:
        // other classes' data can only reach the window as dead tuples
        // from rolled-back transactions, and the VACUUM below removes
        // exactly that (a COUNT(*) seq scan READS dead tuples —
        // seq_tup_read counts fetched-then-visibility-filtered rows — so
        // without it the dead-tuple count would be a run-order variable).
        for (int i = 1; i <= SHELTERS; i++) {
            shelters.save(new Shelter("W2A-COST-" + i, new GeoPoint(59.0 + i / 1000.0, 24.0),
                    ShelterStatus.ACTIVE, null, ShelterSource.USER));
        }
        String admin = adminToken();
        jdbc.execute("VACUUM (ANALYZE) shelters");

        Map<String, long[]> delta1 = measurePage(admin, "1", "0", LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI);
        Map<String, long[]> delta100 = measurePage(admin, "100", "0", LIMIT100_TUPLES_LO, LIMIT100_TUPLES_HI);

        print("admin shelters limit=1", delta1);
        print("admin shelters limit=100", delta100);

        long[] d1 = delta1.getOrDefault("shelters", new long[2]);
        long[] d100 = delta100.getOrDefault("shelters", new long[2]);
        // Invariant 1 — the STATEMENT count does not grow with page size:
        // both measured windows ran exactly the same two statements (the
        // mandated X-Total-Count count twin + the page read). The exact-
        // scans check AND the tuple band are enforced in measurePage (a
        // window that showed any other shape was partially aggregated or
        // contaminated by a neighbor IT's delayed stats and was re-measured),
        // so equality here holds by construction.
        assertThat(d1[0]).isEqualTo(2L);
        assertThat(d100[0])
                .as("the admin list runs the same statements for a limit=100 page as for a limit=1 page")
                .isEqualTo(d1[0]);
        // Invariant 2 — the limit=1 page reads ONE count scan of the corpus
        // + ITS OWN ONE ROW, nothing more: no corpus projection, no
        // per-row work over rows outside the page. (The page itself rides
        // the PK index: 1 tuple, measured.)
        assertThat(d1[1])
                .as("a limit=1 page reads the count scan + its single row, not the corpus projection")
                .isBetween(LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI);
        // Invariant 3 — the page-size work is real and bounded: limit=100
        // does genuinely MORE work than limit=1 (the pre-W2-A shape read
        // the identical corpus for both — the counts were literally equal),
        // but at most the index plan's +100 rows or the planner's
        // legitimate full-scan alternative — never a corpus projection on
        // top of the count.
        assertThat(d100[1])
                .as("a limit=100 page does more DB work than a limit=1 page, bounded by one extra scan")
                .isBetween(LIMIT100_TUPLES_LO, LIMIT100_TUPLES_HI)
                .isGreaterThan(d1[1]);
    }

    // ---------- the public guidance index has no per-row read ----------

    @Test
    void theGuidanceIndexReadsOneBatchPerPageNotOnePostPerRow() throws Exception {
        long authorId = saveUser(users, "w2acost@example.ee", "+37250099901").getId();
        for (int i = 1; i <= POSTS; i++) {
            long id = guidance.create(authorId, "W2A-COST post " + i, null, "<p>b</p>", "en",
                    false, null, null, null, null).post().getId();
            guidance.publish(authorId, id);
        }

        Map<String, long[]> d = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            Map<String, long[]> before = freshBefore();
            mvc.perform(get("/api/guidance").param("limit", "2").param("offset", "0"))
                    .andExpect(status().isOk());
            d = delta(before, settleAndStat());
            long[] g = d.getOrDefault("guidance_posts", new long[2]);
            if (g[0] <= 2L) {
                break; // clean window
            }
            // a neighbor IT's delayed stats landed in the window — re-measure
            System.out.println("COST guidance limit=2: window " + attempt
                    + " contaminated (guidance_posts scans=" + g[0] + ") — re-measuring");
            settle();
            settle();
            settle();
        }
        print("guidance limit=2", d);

        long[] guidancePosts = d.getOrDefault("guidance_posts", new long[2]);
        assertThat(guidancePosts[0])
                .as("a guidance page costs the index scan + ONE batched read, not one read per row")
                .isLessThanOrEqualTo(2L);
    }

    // ---------- the retry gate is honest: it covers every measured number ----------

    @Test
    void theSettlednessGateCoversEveryNumberTheAssertionReads() {
        // Genuinely settled windows, at both limits — band edges inclusive.
        assertThat(windowSettled(2, LIMIT1_TUPLES_LO, LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI)).isTrue();
        assertThat(windowSettled(2, LIMIT1_TUPLES_HI, LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI)).isTrue();
        assertThat(windowSettled(2, LIMIT100_TUPLES_LO, LIMIT100_TUPLES_LO, LIMIT100_TUPLES_HI)).isTrue();
        assertThat(windowSettled(2, LIMIT100_TUPLES_HI, LIMIT100_TUPLES_LO, LIMIT100_TUPLES_HI)).isTrue();
        // The reported flake's exact shape: BOTH statements counted
        // (scans = 2) while the tuple delta is out of band — the page
        // read's tuples not yet aggregated, and a neighbor IT's delayed
        // 1-scan flush having filled the window instead. The OLD detector
        // (scans == 2 only) declared this clean and failed the assertion
        // on production-healthy behaviour; the widened gate re-measures.
        assertThat(windowSettled(2, LIMIT1_TUPLES_LO - 1, LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI)).isFalse();
        assertThat(windowSettled(2, LIMIT1_TUPLES_HI + 1, LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI)).isFalse();
        assertThat(windowSettled(2, 53_001, LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI)).isFalse();
        assertThat(windowSettled(2, LIMIT100_TUPLES_HI + 1, LIMIT100_TUPLES_LO, LIMIT100_TUPLES_HI)).isFalse();
        // Neighbor contamination of the scan count — caught before, still caught.
        assertThat(windowSettled(1, LIMIT1_TUPLES_LO + 1, LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI)).isFalse();
        assertThat(windowSettled(3, LIMIT1_TUPLES_LO + 1, LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI)).isFalse();
        // A window that missed the table entirely (own flush not landed yet).
        assertThat(windowSettled(0, 0, LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI)).isFalse();
    }

    @Test
    void theRetryReclaimsThePartiallyAggregatedWindow() throws Exception {
        // Drives the REAL retry loop with the flake's exact arithmetic:
        // window 1 has both statements counted (scans = 2) but an
        // out-of-band tuple delta (a neighbor's delayed flush landed,
        // the page read's own tuples did not); window 2 is the settled
        // shape. The loop must REJECT window 1 — the retry fires — and
        // return window 2, which passes the assertions the real test runs.
        String admin = adminToken();
        long mid = (LIMIT1_TUPLES_LO + LIMIT1_TUPLES_HI) / 2;
        Map<String, long[]> partial = new LinkedHashMap<>();
        partial.put("shelters", new long[]{2, 53_001});
        Map<String, long[]> settled = new LinkedHashMap<>();
        settled.put("shelters", new long[]{2, mid});
        List<Map<String, long[]>> windows = List.of(partial, settled);
        AtomicInteger windowReads = new AtomicInteger();
        Map<String, long[]> result = measurePage(admin, "1", "0", LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI,
                () -> Map.of(),
                () -> windows.get(Math.min(windowReads.getAndIncrement(), windows.size() - 1)));
        assertThat(windowReads.get())
                .as("the partially-aggregated window was rejected and the window re-measured")
                .isEqualTo(2);
        assertThat(result.get("shelters"))
                .as("the settled window was the one the loop returned")
                .containsExactly(2L, mid);
        // And the reclaimed window passes the very assertions the real test makes:
        assertThat(result.get("shelters")[0]).isEqualTo(2L);
        assertThat(result.get("shelters")[1]).isBetween(LIMIT1_TUPLES_LO, LIMIT1_TUPLES_HI);
    }

    // ---------- helpers ----------

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    /**
     * A clean "before" snapshot: the statistics worker (PG15+: per-backend
     * stats are aggregated on a ~1s cycle) can still be flushing counters
     * of EARLIER activity (context startup, seed writes) when the first
     * read lands. So: settle, take a THROWAWAY snapshot (absorbing the
     * residual flush), settle again, then take the real baseline — the
     * measured window starts only after all residual activity has been
     * aggregated.
     */
    private Map<String, long[]> freshBefore() {
        settle();
        stat(); // discarded — absorbs the residual flush
        settle();
        return stat();
    }

    /**
     * Wait for the statistics worker (PG15+: per-backend stats are aggregated
     * on a ~1s cycle, so an immediate read may miss recent counters —
     * INCLUDING seed writes, which must be OUT of the measured delta).
     */
    private void settle() {
        try {
            Thread.sleep(1600);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private Map<String, long[]> settleAndStat() {
        settle();
        return stat();
    }

    /**
     * Measure one admin-page request's stats delta, RETRYING the window once
     * when it does not show the settled shape. The settledness gate covers
     * EVERY measurement the assertions depend on — the scan count AND the
     * tuple band, not the scan count alone. The scan count alone was a
     * hole: a window whose tuple delta had not yet absorbed the page
     * read's tuples — or had been polluted by a neighbor IT's delayed
     * flush — could still read exactly TWO scans (the neighbor's late
     * statement filling the slot the page read's flush had not landed in).
     * The old detector then declared the window clean, the assertion
     * failed on the tuple band, and production behaviour was fully intact.
     * Gating on scans AND tuples makes "accepted window ⟹ passing
     * assertions" structural: once both windows are accepted, every
     * per-window assertion holds, and the cross-window comparison
     * (limit=100 reads more than limit=1) holds because the bands do not
     * overlap. A retry re-settles (three cycles instead of two) and
     * re-requests; if BOTH windows are unsettled the test fails with the
     * raw evidence printed — the assertion is never weakened to absorb
     * the noise.
     */
    private Map<String, long[]> measurePage(String admin, String limit, String offset,
            long tuplesLo, long tuplesHi) throws Exception {
        return measurePage(admin, limit, offset, tuplesLo, tuplesHi,
                this::freshBefore, this::settleAndStat);
    }

    /**
     * The measurement seam: the same loop, but the before/after
     * snapshots come from the given sources instead of the live database.
     * It exists so the retry path can be driven deterministically
     * (theRetryReclaimsThePartiallyAggregatedWindow feeds it a partial
     * window and a settled one): the settledness DECISION is where the
     * flake lived, and it is a pure function of the measurement — the
     * loop itself is two attempts and nothing else.
     */
    private Map<String, long[]> measurePage(String admin, String limit, String offset,
            long tuplesLo, long tuplesHi,
            Supplier<Map<String, long[]>> beforeSource,
            Supplier<Map<String, long[]>> afterSource) throws Exception {
        Map<String, long[]> last = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            Map<String, long[]> before = beforeSource.get();
            mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + admin)
                            .param("limit", limit).param("offset", offset))
                    .andExpect(status().isOk());
            last = delta(before, afterSource.get());
            long[] s = last.getOrDefault("shelters", new long[2]);
            if (windowSettled(s[0], s[1], tuplesLo, tuplesHi)) {
                return last;
            }
            System.out.println("COST limit=" + limit + ": window " + attempt + " unsettled"
                    + " (shelters scans=" + s[0] + ", tuples=" + s[1]
                    + ", expected scans=2, tuples in [" + tuplesLo + ", " + tuplesHi
                    + "]) — re-measuring");
            settle();
            settle();
            settle();
        }
        return last;
    }

    /**
     * A measured window is SETTLED only when every number the assertions
     * read shows the settled shape: exactly the two statements this
     * request issues (the count twin + the page read) AND the tuple delta
     * inside the band those two statements can produce. Checking the scan
     * count alone would accept a partially aggregated window — scans
     * reading exactly 2 while the rows were far outside the band — and
     * fail the assertion on production-healthy behaviour.
     */
    static boolean windowSettled(long scans, long tuples, long tuplesLo, long tuplesHi) {
        return scans == 2L && tuples >= tuplesLo && tuples <= tuplesHi;
    }

    /** A table→(scan count, rows read) snapshot of the catalog counters. */
    private Map<String, long[]> stat() {
        Map<String, long[]> out = new LinkedHashMap<>();
        for (Map<String, Object> row : jdbc.queryForList("SELECT t.relname, "
                + "COALESCE(t.seq_scan, 0) + COALESCE(ix.idx_scan, 0) AS scans, "
                + "COALESCE(t.seq_tup_read, 0) + COALESCE(ix.idx_tup_read, 0) AS tupread "
                + "FROM pg_stat_user_tables t "
                + "LEFT JOIN (SELECT relname, SUM(idx_scan) AS idx_scan, "
                + "SUM(idx_tup_read) AS idx_tup_read FROM pg_stat_user_indexes "
                + "GROUP BY relname) ix ON ix.relname = t.relname "
                + "ORDER BY t.relname")) {
            out.put((String) row.get("relname"),
                    new long[]{((Number) row.get("scans")).longValue(),
                            ((Number) row.get("tupread")).longValue()});
        }
        return out;
    }

    private Map<String, long[]> delta(Map<String, long[]> before, Map<String, long[]> after) {
        Map<String, long[]> out = new LinkedHashMap<>();
        after.forEach((table, a) -> {
            long[] b = before.get(table);
            long scanDelta = a[0] - (b == null ? 0 : b[0]);
            long tupleDelta = a[1] - (b == null ? 0 : b[1]);
            if (scanDelta != 0 || tupleDelta != 0) {
                out.put(table, new long[]{scanDelta, tupleDelta});
            }
        });
        return out;
    }

    private static void print(String label, Map<String, long[]> delta) {
        StringBuilder sb = new StringBuilder("COST ").append(label).append(":");
        for (Map.Entry<String, long[]> e : delta.entrySet()) {
            sb.append(" ").append(e.getKey())
                    .append("(scans+").append(e.getValue()[0])
                    .append(",tup+").append(e.getValue()[1]).append(")");
        }
        System.out.println(sb);
    }
}
