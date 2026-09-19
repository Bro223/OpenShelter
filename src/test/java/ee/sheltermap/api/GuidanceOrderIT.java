package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.AdminSeeder;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceStatus;
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

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * guidance-manual-order (V28) over the REAL persistence chain
 * (Testcontainers Postgres + Flyway + the Spring Data / native queries):
 * <ul>
 *   <li>{@code PUT /admin/guidance/order} — the atomic full-list reorder:
 *       a valid list renumbers 1..N (204) and the public + admin orders
 *       follow; the same order twice is a no-op that writes NO audit row;
 *       a changing reorder writes exactly one {@code GUIDANCE_REORDER} row;
 *       an unknown id / a duplicate id / a stale list / an empty list while
 *       posts exist each 400 and change nothing; a forced mid-transaction
 *       failure renumbers NOTHING (all-or-nothing);</li>
 *   <li>the public index order contract — pinned first (even a pinned post
 *       with the LARGEST sort_order leads), then sort_order ascending, then
 *       the published_at / id tie-breakers (forced equal values); repeated
 *       calls return the same order;</li>
 *   <li>the admin list reads the stored manual order (the live preview of
 *       the public order).</li>
 * </ul>
 *
 * <p>Deliberately NOT {@code @Transactional} (the {@link
 * ee.sheltermap.persistence.ShelterOptimisticLockingIT} shape): the reorder
 * commits in its OWN transaction so the all-or-nothing assertion (and the
 * flush-time trigger failure) exercises the real commit path. Committed
 * rows are wiped per test.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=guid-order@example.ee",
        "app.admin.password=guid-order-pass",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        "app.verification.cooldown-seconds=0",
        "app.verification.max-per-day=10"
})
class GuidanceOrderIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    GuidanceService guidance;

    @Autowired
    AdminSeeder seeder;

    @Autowired
    JdbcTemplate jdbc;

    private long adminId;
    private String adminToken;

    @BeforeEach
    void seed() throws Exception {
        // The seeder runs at CONTEXT start, but contexts are shared — re-run
        // per test so the admin exists (create-if-absent, idempotent).
        seeder.run(null);
        adminId = userIdByEmail("guid-order@example.ee");
        adminToken = login("guid-order@example.ee", "guid-order-pass");
    }

    @AfterEach
    void cleanUpCommittedRows() {
        // The guidance tables are not in the base wipe list — delete them
        // first (the translation FK), then the base auth/moderation wipe.
        jdbc.execute("DELETE FROM guidance_post_translations");
        jdbc.execute("DELETE FROM guidance_posts");
        wipeAllTables();
    }

    // ------------------------------------------------------------- helpers

    /** Creates a post through the REAL service (committed); PUBLISHED when asked. */
    private long createPost(String title, boolean published) {
        GuidancePost post = guidance.create(adminId, title, null, "<p>body-" + title + "</p>",
                null, false, null, null, null,
                published ? GuidanceStatus.PUBLISHED : null);
        return post.getId();
    }

    private int sortOrderOf(long id) {
        return jdbc.queryForObject(
                "SELECT sort_order FROM guidance_posts WHERE id = ?", Integer.class, id);
    }

    /** The public index order (ids) for the default locale, as the anonymous page reads it
     *  (the public DTO exposes slugs, not ids — mapped back via JDBC). */
    private List<Long> publicOrder() throws Exception {
        MvcResult result = mvc.perform(get("/api/guidance"))
                .andExpect(status().isOk())
                .andReturn();
        List<?> slugs = JsonPath.read(result.getResponse().getContentAsString(StandardCharsets.UTF_8),
                "$[*].slug");
        return slugs.stream().map(slug -> jdbc.queryForObject(
                        "SELECT id FROM guidance_posts WHERE slug = ?", Long.class, slug.toString()))
                .toList();
    }

    /** The admin list order (ids) — the live preview of the public order. */
    private List<Long> adminOrder() throws Exception {
        MvcResult result = mvc.perform(get("/admin/guidance")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        List<?> ids = JsonPath.read(result.getResponse().getContentAsString(StandardCharsets.UTF_8),
                "$[*].id");
        return ids.stream().map(n -> ((Number) n).longValue()).toList();
    }

    private long reorderRowCount() {
        return jdbc.queryForObject(
                "SELECT count(*) FROM moderation_actions WHERE action = 'GUIDANCE_REORDER'",
                Long.class);
    }

    private org.springframework.test.web.servlet.ResultActions putOrder(String token, long... ids) throws Exception {
        StringBuilder body = new StringBuilder("{\"postIds\":[");
        for (int i = 0; i < ids.length; i++) {
            if (i > 0) {
                body.append(',');
            }
            body.append(ids[i]);
        }
        body.append("]}");
        return mvc.perform(put("/admin/guidance/order")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.toString().getBytes(StandardCharsets.UTF_8)));
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    // ------------------------------------------------------------- the endpoint

    @Test
    void aValidReorderRenamesOneThroughNAndTheOrdersFollow() throws Exception {
        long a = createPost("Order A", true);
        long b = createPost("Order B", true);
        long c = createPost("Order C", true);
        long d = createPost("Order D", false); // the draft rides along too

        putOrder(adminToken, c, d, a, b).andExpect(status().isNoContent());

        // Dense 1..N in the submitted order.
        assertThat(sortOrderOf(c)).isEqualTo(1);
        assertThat(sortOrderOf(d)).isEqualTo(2);
        assertThat(sortOrderOf(a)).isEqualTo(3);
        assertThat(sortOrderOf(b)).isEqualTo(4);
        // The public index follows (the draft is absent from it).
        assertThat(publicOrder()).containsExactly(c, a, b);
        // And so does the admin list (drafts included — the live preview).
        assertThat(adminOrder()).containsExactly(c, d, a, b);
    }

    @Test
    void aChangingReorderWritesExactlyOneAuditRowAndResubmittingIsANoop() throws Exception {
        long a = createPost("Order A", false);
        long b = createPost("Order B", false);
        long before = reorderRowCount();

        putOrder(adminToken, b, a).andExpect(status().isNoContent());
        assertThat(reorderRowCount() - before).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                        "SELECT subject_label FROM moderation_actions "
                                + "WHERE action = 'GUIDANCE_REORDER' ORDER BY id DESC LIMIT 1",
                        String.class))
                .isEqualTo("Guidance post order");
        assertThat(jdbc.queryForObject(
                        "SELECT moderator_id FROM moderation_actions "
                                + "WHERE action = 'GUIDANCE_REORDER' ORDER BY id DESC LIMIT 1",
                        Long.class))
                .isEqualTo(adminId);

        // The identical order again: 204, no value changes, NO second row.
        int beforeA = sortOrderOf(a);
        int beforeB = sortOrderOf(b);
        putOrder(adminToken, b, a).andExpect(status().isNoContent());
        assertThat(sortOrderOf(a)).isEqualTo(beforeA);
        assertThat(sortOrderOf(b)).isEqualTo(beforeB);
        assertThat(reorderRowCount() - before).isEqualTo(1);
    }

    @Test
    void anUnknownIdIs400AndChangesNothing() throws Exception {
        long a = createPost("Order A", false);
        long b = createPost("Order B", false);

        putOrder(adminToken, a, b, 999_999L)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("999999")));

        assertThat(sortOrderOf(a)).isEqualTo(1);
        assertThat(sortOrderOf(b)).isEqualTo(2);
        assertThat(reorderRowCount()).isZero();
    }

    @Test
    void aDuplicateIdIs400AndChangesNothing() throws Exception {
        long a = createPost("Order A", false);
        long b = createPost("Order B", false);

        putOrder(adminToken, a, b, a)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        assertThat(sortOrderOf(a)).isEqualTo(1);
        assertThat(sortOrderOf(b)).isEqualTo(2);
        assertThat(reorderRowCount()).isZero();
    }

    @Test
    void aStaleListMissingACurrentPostIs400AndChangesNothing() throws Exception {
        long a = createPost("Order A", false);
        long b = createPost("Order B", false);

        // A list that omits 'b' — e.g. created after the admin's table load.
        putOrder(adminToken, a)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        // The omitted post keeps its appended position.
        assertThat(sortOrderOf(a)).isEqualTo(1);
        assertThat(sortOrderOf(b)).isEqualTo(2);
        assertThat(reorderRowCount()).isZero();
    }

    @Test
    void anEmptyListIs400WhilePostsExistAnd204WithNoPosts() throws Exception {
        // No posts at all: the empty list IS the order — a 204 no-op.
        putOrder(adminToken).andExpect(status().isNoContent());

        long a = createPost("Order A", false);
        putOrder(adminToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        assertThat(sortOrderOf(a)).isEqualTo(1);
        assertThat(reorderRowCount()).isZero();
    }

    @Test
    void aForcedMidTransactionFailureRenamesNothing() throws Exception {
        long a = createPost("Order A", true);
        long b = createPost("Order B", true);
        long c = createPost("Order C", true);
        long d = createPost("Order D", true);

        // A test-only guard: any update assigning sort_order 3 aborts the
        // transaction (the mid-transaction failure). The submitted order
        // [b, a, d, c] assigns d (currently 4) the value 3, so the flush
        // fails part-way through the renumber.
        jdbc.execute("CREATE FUNCTION v28_order_failure_guard() RETURNS trigger AS $$ "
                + "BEGIN IF NEW.sort_order = 3 AND OLD.sort_order IS DISTINCT FROM NEW.sort_order "
                + "THEN RAISE EXCEPTION 'forced mid-transaction failure'; END IF; "
                + "RETURN NEW; END; $$ LANGUAGE plpgsql");
        jdbc.execute("CREATE TRIGGER v28_order_failure_guard BEFORE UPDATE ON guidance_posts "
                + "FOR EACH ROW EXECUTE FUNCTION v28_order_failure_guard()");
        try {
            mvc.perform(put("/admin/guidance/order")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"postIds\":[" + b + "," + a + "," + d + "," + c + "]}"))
                    .andExpect(status().isInternalServerError());

            // ALL-OR-NOTHING: not one of the four rows moved — the partial
            // renumber rolled back with the failed commit.
            assertThat(sortOrderOf(a)).isEqualTo(1);
            assertThat(sortOrderOf(b)).isEqualTo(2);
            assertThat(sortOrderOf(c)).isEqualTo(3);
            assertThat(sortOrderOf(d)).isEqualTo(4);
            assertThat(reorderRowCount()).isZero();
        } finally {
            jdbc.execute("DROP TRIGGER v28_order_failure_guard ON guidance_posts");
            jdbc.execute("DROP FUNCTION v28_order_failure_guard()");
        }
    }

    // ------------------------------------------------------------- the order contract

    @Test
    void thePinnedPostWithTheLargestSortOrderStillLeadsTheIndex() throws Exception {
        long a = createPost("Pinned A", true);
        long b = createPost("Plain B", true);
        long c = createPost("Plain C", true);

        // Push the (soon-to-be-pinned) post to the LARGEST manual position.
        guidance.reorder(adminId, List.of(b, c, a));
        guidance.update(a, "Pinned A", null, "<p>body-Pinned A</p>", null, true, null, null, null);

        // The pinned head block sits above every non-pinned post regardless
        // of its sort_order value.
        assertThat(publicOrder()).containsExactly(a, b, c);
    }

    @Test
    void equalSortOrderRowsTieBreakOnPublishedAtThenIdDescending() throws Exception {
        long a = createPost("Tie A", true);
        long b = createPost("Tie B", true);
        long c = createPost("Tie C", true);

        // Force the prevented-in-practice state in the REAL database: two
        // published posts sharing one sort_order, one of them published
        // later. The newer-published one leads.
        jdbc.update("UPDATE guidance_posts SET sort_order = 7 WHERE id IN (?, ?)", b, c);
        assertThat(publicOrder()).containsExactly(a, c, b); // c published after b

        // And rows sharing publishedAt AS WELL order by id descending — with
        // repeated calls returning the same order (the stable-order
        // discipline).
        jdbc.update("UPDATE guidance_posts SET sort_order = 8, published_at = '2026-01-01T00:00:00Z' "
                + "WHERE id IN (?, ?)", b, c);
        List<Long> order = publicOrder();
        assertThat(order).containsSequence(c, b); // same stamp: id desc (c > b)
        assertThat(publicOrder()).containsExactlyElementsOf(order);
    }

    @Test
    void aPublishAfterReorderKeepsThePostInItsManualSlot() throws Exception {
        long a = createPost("Slot A", true);
        long b = createPost("Slot B", false); // a draft, third by creation
        long c = createPost("Slot C", true);

        // Move the draft to the second manual position, then publish it.
        guidance.reorder(adminId, List.of(a, b, c));
        guidance.publish(adminId, b);

        // It enters the index at its manual position — not at the top of
        // the non-pinned block (the fresh stamp would win under the old
        // timestamp-driven order).
        assertThat(publicOrder()).containsExactly(a, b, c);
    }
}
