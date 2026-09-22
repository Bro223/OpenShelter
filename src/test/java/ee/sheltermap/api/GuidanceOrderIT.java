package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.UserRepository;
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
 *       failure renumbers NOTHING (all-or-nothing);
 *   <li>the locale-scoped endpoints (the admin's language view): the scoped
 *       list shows only the posts with content in that locale (serving the
 *       locale's content, exposing {@code homeLocale} + {@code sortOrder});
 *       the scoped detail is a 404 for a post without a translation in the
 *       locale; the scoped update edits the locale's row (home columns stay);
 *       the scoped reorder is SLOT-PRESERVING — the visible posts take the
 *       submitted order in their GLOBAL slots, the invisible posts keep
 *       their values (the values stop being 1..N); an id invisible in the
 *       locale / a stale scoped list / an overlong locale each 400;</li>
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
    JdbcTemplate jdbc;

    private long adminId;
    private String adminToken;

    @BeforeEach
    void seed() throws Exception {
        // The provisioned admin is (re-)seeded by the base @BeforeEach
        // (create-if-absent, immune to the @AfterEach wipe below).
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
                published ? GuidanceStatus.PUBLISHED : null).post();
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

    // ------------------------------------------------------------- the locale-scoped endpoints

    /** The admin list order (ids) for ONE locale scope. */
    private List<Long> scopedAdminOrder(String locale) throws Exception {
        MvcResult result = mvc.perform(get("/admin/guidance")
                        .param("locale", locale)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        List<?> ids = JsonPath.read(result.getResponse().getContentAsString(StandardCharsets.UTF_8),
                "$[*].id");
        return ids.stream().map(n -> ((Number) n).longValue()).toList();
    }

    private org.springframework.test.web.servlet.ResultActions putScopedOrder(String token, String locale, long... ids) throws Exception {
        StringBuilder body = new StringBuilder("{\"postIds\":[");
        for (int i = 0; i < ids.length; i++) {
            if (i > 0) {
                body.append(',');
            }
            body.append(ids[i]);
        }
        body.append("]}");
        return mvc.perform(put("/admin/guidance/order")
                        .param("locale", locale)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.toString().getBytes(StandardCharsets.UTF_8)));
    }

    private long createPost(String title, String locale, boolean published) {
        GuidancePost post = guidance.create(adminId, title, null, "<p>body-" + title + "</p>",
                locale, false, null, null, null,
                published ? GuidanceStatus.PUBLISHED : null).post();
        return post.getId();
    }

    @Test
    void aScopedListShowsOnlyPostsThatHaveContentInTheLocaleInItsContent() throws Exception {
        long en1 = createPost("EN one", "en", true);
        long en2 = createPost("EN two", "en", true);
        long et1 = createPost("Eesti post", "et", true);
        // en1 also exists in et (the same post in both languages).
        guidance.createTranslation(en1, "et", null, "Eesti üks", "<p>et keha</p>", null);

        assertThat(scopedAdminOrder("en")).containsExactly(en1, en2);
        assertThat(scopedAdminOrder("et")).containsExactly(en1, et1);

        // The paired post serves its ET ROW in the et scope (and the DTO
        // carries the homeLocale + the global sortOrder now).
        MvcResult et = mvc.perform(get("/admin/guidance")
                        .param("locale", "et")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        String json = et.getResponse().getContentAsString(StandardCharsets.UTF_8);
        // (No [0] index after a filter — jayway's filter results don't take
        // a trailing index in this version; the property returns the match's list.)
        List<Object> etTitles = JsonPath.read(json, "$[?(@.id==" + en1 + ")].title");
        assertThat(etTitles).containsExactly("Eesti üks");
        List<Object> homeLocales = JsonPath.read(json, "$[?(@.id==" + en1 + ")].homeLocale");
        assertThat(homeLocales).containsExactly("en");
        List<Object> sortOrders = JsonPath.read(json, "$[?(@.id==" + en1 + ")].sortOrder");
        assertThat(sortOrders).containsExactly(1);
        // The unscoped list is unchanged: every post, in the stored order.
        assertThat(adminOrder()).containsExactly(en1, en2, et1);
    }

    @Test
    void aScopedGetWithoutATranslationInThatLocaleIs404() throws Exception {
        long en = createPost("EN only", "en", true);

        mvc.perform(get("/admin/guidance/" + en)
                        .param("locale", "ru")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());

        // With an et row, the scoped detail serves the row's content.
        guidance.createTranslation(en, "et", null, "Eesti", "<p>b</p>", null);
        mvc.perform(get("/admin/guidance/" + en)
                        .param("locale", "et")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Eesti"))
                .andExpect(jsonPath("$.homeLocale").value("en"));
    }

    @Test
    void aScopedUpdateEditsTheLocaleRowAndKeepsTheHomeColumns() throws Exception {
        long en = createPost("EN original", "en", true);
        guidance.createTranslation(en, "et", null, "Eesti originaal", "<p>et keha</p>", null);

        // The body's locale is the post's HOME ("en") — a foreign-locale
        // edit never moves the home (a different declaration is a 400).
        mvc.perform(put("/admin/guidance/" + en)
                        .param("locale", "et")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Eesti uus\",\"body\":\"<p>uus keha</p>\",\"locale\":\"en\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Eesti uus"))
                // The DTO's locale is the CONTENT locale (the row being
                // edited — et); homeLocale is the post's own (en).
                .andExpect(jsonPath("$.locale").value("et"))
                .andExpect(jsonPath("$.homeLocale").value("en"));

        // The home columns are untouched; the et row carries the edit.
        assertThat(jdbc.queryForObject(
                        "SELECT title FROM guidance_posts WHERE id = ?", String.class, en))
                .isEqualTo("EN original");
        assertThat(jdbc.queryForObject(
                        "SELECT title FROM guidance_post_translations WHERE post_id = ? AND locale = 'et'",
                        String.class, en))
                .isEqualTo("Eesti uus");

        // A declaration that moves the home while editing the et row: 400.
        mvc.perform(put("/admin/guidance/" + en)
                        .param("locale", "et")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Eesti uuem\",\"body\":\"<p>uuem keha</p>\",\"locale\":\"ru\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aScopedUpdateToALocaleWithoutATranslationIs404() throws Exception {
        long en = createPost("EN only", "en", true);
        mvc.perform(put("/admin/guidance/" + en)
                        .param("locale", "et")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Eesti\",\"body\":\"<p>b</p>\",\"locale\":\"en\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void aScopedReorderWritesTheSubmittedOrderIntoTheGlobalSlotsAndKeepsInvisiblePosts() throws Exception {
        long a = createPost("Slot A", "en", true);   // global slot 1
        long b = createPost("Eesti slot B", "et", true); // slot 2 — invisible in en
        long c = createPost("Slot C", "en", true);   // slot 3
        // a is visible in et too (its shared slot travels with it).
        guidance.createTranslation(a, "et", null, "A et", "<p>b</p>", null);

        // The en scope sees [a, c]; submit [c, a].
        putScopedOrder(adminToken, "en", c, a).andExpect(status().isNoContent());

        // c and a took each other's SLOTS (1 and 3) — the values did NOT
        // become 1..2, and the invisible post b is untouched (2).
        assertThat(sortOrderOf(c)).isEqualTo(1);
        assertThat(sortOrderOf(a)).isEqualTo(3);
        assertThat(sortOrderOf(b)).isEqualTo(2);
        // The en view renders the submission; the et view stays consistent
        // (b=2, then a=3 — a's shared slot travels with it).
        assertThat(scopedAdminOrder("en")).containsExactly(c, a);
        assertThat(scopedAdminOrder("et")).containsExactly(b, a);

        // Resubmitting the same visible order: 204 no-op, one audit row total
        // (labelled with the locale).
        long before = reorderRowCount();
        putScopedOrder(adminToken, "en", c, a).andExpect(status().isNoContent());
        assertThat(reorderRowCount()).isEqualTo(before);
        assertThat(jdbc.queryForObject(
                        "SELECT subject_label FROM moderation_actions "
                                + "WHERE action = 'GUIDANCE_REORDER' ORDER BY id DESC LIMIT 1",
                        String.class))
                .isEqualTo("Guidance post order (en)");
    }

    @Test
    void aScopedReorderRefusesAnInvisibleIdAndAStaleListAndChangesNothing() throws Exception {
        long a = createPost("A", "en", false);
        long b = createPost("Eesti B", "et", false); // no en content
        long c = createPost("C", "en", false);

        // An id without content in en cannot ride along in the en list.
        putScopedOrder(adminToken, "en", a, b)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString(String.valueOf(b))));
        // A stale en list (missing c) — e.g. created after the table load.
        putScopedOrder(adminToken, "en", a)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("stale")));

        assertThat(sortOrderOf(a)).isEqualTo(1);
        assertThat(sortOrderOf(b)).isEqualTo(2);
        assertThat(sortOrderOf(c)).isEqualTo(3);
        assertThat(reorderRowCount()).isZero();
    }

    @Test
    void aScopedEmptyListIs204WithNothingVisibleAnd400WithSome() throws Exception {
        // Nothing in ru: the empty list IS the order — a 204 no-op.
        putScopedOrder(adminToken, "ru").andExpect(status().isNoContent());

        long a = createPost("A", "en", false);
        putScopedOrder(adminToken, "en")
                .andExpect(status().isBadRequest());
        assertThat(sortOrderOf(a)).isEqualTo(1);
        assertThat(reorderRowCount()).isZero();
    }

    @Test
    void anOverlongLocaleParamIs400OnEveryScopedEndpoint() throws Exception {
        long a = createPost("A", "en", false);

        mvc.perform(get("/admin/guidance")
                        .param("locale", "toolong")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/admin/guidance/" + a)
                        .param("locale", "toolong")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
        putScopedOrder(adminToken, "toolong", a).andExpect(status().isBadRequest());

        assertThat(sortOrderOf(a)).isEqualTo(1);
        assertThat(reorderRowCount()).isZero();
    }

    // ------------------------------------------------------------- the order contract

    @Test
    void thePinnedPostWithTheLargestSortOrderStillLeadsTheIndex() throws Exception {
        long a = createPost("Pinned A", true);
        long b = createPost("Plain B", true);
        long c = createPost("Plain C", true);

        // Push the (soon-to-be-pinned) post to the LARGEST manual position.
        guidance.reorder(adminId, List.of(b, c, a));
        guidance.update(adminId, a, "Pinned A", null, "<p>body-Pinned A</p>", null, true, null, null, null);

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
