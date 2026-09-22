package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.AdminSeeder;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.guidance.GuidanceService;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.LinkedHashMap;
import java.util.Map;

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

    @Autowired
    MockMvc mvc;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    UserRepository users;

    @Autowired
    GuidanceService guidance;

    @Autowired
    AdminSeeder seeder;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void seedAdmin() {
        // Contexts are shared across IT classes but each class gets a fresh
        // database — re-run the create-if-absent seeder per test (the same
        // discipline as AdminModerationIT).
        seeder.run(null);
    }

    @AfterEach
    void wipeOwnRows() {
        // The shared-container discipline for the DELIBERATELY non-
        // transactional ITs — but TARGETED, not the base class' blanket
        // wipe: other IT contexts seeded their env admin at THEIR context
        // startup (once, create-if-absent) and do not re-seed per test —
        // a TRUNCATE of the users table here would delete their admin and
        // 401 their logins (SiteTextsApiIT). So this cleanup removes only
        // what THIS class committed: the guidance corpus (translations
        // first — the FK child), the corpus shelters (the class-unique
        // name prefix — no other class seeds that shape), and the
        // guidance author. The seeder's admin row is left exactly as found.
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

        Map<String, long[]> delta1 = measurePage(admin, "1", "0");
        Map<String, long[]> delta100 = measurePage(admin, "100", "0");

        print("admin shelters limit=1", delta1);
        print("admin shelters limit=100", delta100);

        long[] d1 = delta1.getOrDefault("shelters", new long[2]);
        long[] d100 = delta100.getOrDefault("shelters", new long[2]);
        // Invariant 1 — the STATEMENT count does not grow with page size:
        // both measured windows ran exactly the same two statements (the
        // mandated X-Total-Count count twin + the page read). The exact-
        // scans check is enforced in measurePage (a window that shows any
        // other count was contaminated by a neighbor IT's delayed stats and
        // was re-measured), so equality here holds by construction.
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
                .isBetween((long) SHELTERS + 1L, (long) SHELTERS + 20L);
        // Invariant 3 — the page-size work is real and bounded: limit=100
        // does genuinely MORE work than limit=1 (the pre-W2-A shape read
        // the identical corpus for both — the counts were literally equal),
        // but at most the index plan's +100 rows or the planner's
        // legitimate full-scan alternative — never a corpus projection on
        // top of the count.
        assertThat(d100[1])
                .as("a limit=100 page does more DB work than a limit=1 page, bounded by one extra scan")
                .isBetween((long) SHELTERS + 50L, (long) 2 * SHELTERS + 50L)
                .isGreaterThan(d1[1]);
    }

    // ---------- the public guidance index has no per-row read ----------

    @Test
    void theGuidanceIndexReadsOneBatchPerPageNotOnePostPerRow() throws Exception {
        long authorId = saveUser(users, "w2acost@example.ee", "+37250099901").getId();
        for (int i = 1; i <= POSTS; i++) {
            long id = guidance.create(authorId, "W2A-COST post " + i, null, "<p>b</p>", "en",
                    false, null, null, null, null).getId();
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
     * when a neighbor IT's delayed stats bleed into it. The contamination
     * detector is exact: this request issues exactly TWO statements on the
     * shelters table (the count twin + the page read) — any other scan
     * count in the window is another class' late-aggregated stats, not
     * this request's work. A retry re-settles (three cycles instead of
     * two) and re-requests; if BOTH windows are contaminated the test
     * fails with the raw evidence — the assertion is never weakened to
     * absorb the noise.
     */
    private Map<String, long[]> measurePage(String admin, String limit, String offset) throws Exception {
        Map<String, long[]> last = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            Map<String, long[]> before = freshBefore();
            mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + admin)
                            .param("limit", limit).param("offset", offset))
                    .andExpect(status().isOk());
            last = delta(before, settleAndStat());
            if (last.getOrDefault("shelters", new long[2])[0] == 2L) {
                return last;
            }
            System.out.println("COST limit=" + limit + ": window " + attempt
                    + " contaminated (shelters scans=" + last.getOrDefault("shelters", new long[2])[0]
                    + ") — re-measuring");
            settle();
            settle();
            settle();
        }
        return last;
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
