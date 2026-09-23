package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.guidance.GuidanceService;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * admin-guidance-search + the admin list's paging over the REAL persistence
 * chain (Testcontainers Postgres + Flyway + the Spring Data queries):
 * {@code GET /admin/guidance} gains {@code q} (a case-insensitive substring
 * over the list's title and TAG-STRIPPED body — search what you see, scoped
 * to {@code ?locale=} when given, any-locale content otherwise, blank = no
 * filter, over 200 characters = 400) and {@code limit} (1..200) /
 * {@code offset} (>= 0) —
 * <ul>
 *   <li>the search runs OVER the stored manual order and never re-sorts it
 *       (a filtered subset keeps the stored relative order — search and
 *       reorder never fight over sorting);</li>
 *   <li>consecutive pages tile the (filtered) manual order without overlap
 *       or skips, and the un-paged answer is unchanged (the params are
 *       absent, not defaulted);</li>
 *   <li>the {@code X-Total-Count} header is the filter length WITHOUT
 *       paging — always present, the slice never shrinks it.</li>
 * </ul>
 *
 * <p>Deliberately NOT {@code @Transactional} (the {@link GuidanceOrderIT}
 * shape): committed rows are cleaned up per test — scoped to THIS class' own
 * rows only (the base cleanup contract), so the other contexts' provisioned
 * admin rows and every other IT's fixtures survive untouched.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin-search@example.ee",
        "app.admin.password=admin-search-pass",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
class AdminGuidanceSearchPagingIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    GuidanceService guidance;

    @Autowired
    JdbcTemplate jdbc;

    private long adminId;
    private String adminToken;

    @BeforeEach
    void seed() throws Exception {
        // The provisioned admin is (re-)seeded by the base @BeforeEach
        // (create-if-absent); the @AfterEach below only removes THIS class'
        // own rows, so the admin row itself is never touched.
        adminId = userIdByEmail("admin-search@example.ee");
        adminToken = login();
    }

    @AfterEach
    void cleanUpCommittedRows() {
        // Scoped (base cleanup contract): only this class' own committed
        // rows — the posts this class-unique admin created (translations
        // first: the translation FK), plus the guidance audit rows, which
        // carry no FK to the posts (shelter_id is FK-less by design and the
        // label-based rows use a dummy shelter id) and would otherwise
        // leak. No other class' rows can match this admin's id.
        jdbc.update("DELETE FROM guidance_post_translations WHERE post_id IN "
                + "(SELECT id FROM guidance_posts WHERE created_by = ?)", adminId);
        jdbc.update("DELETE FROM guidance_posts WHERE created_by = ?", adminId);
        jdbc.update("DELETE FROM moderation_actions WHERE moderator_id = ? AND "
                + "action IN ('GUIDANCE_REORDER', 'GUIDANCE_PUBLISH', 'GUIDANCE_UNPUBLISH', "
                + "'GUIDANCE_DELETE')", adminId);
    }

    // ------------------------------------------------------------- helpers

    private String login() throws Exception {
        MvcResult result = mvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                                .post("/auth/login")
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .content("{\"emailOrPhone\":\"admin-search@example.ee\","
                                        + "\"password\":\"admin-search-pass\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    /** Creates a post through the REAL service (committed). */
    private long createPost(String title, String body, String locale) {
        GuidancePost post = guidance.create(adminId, title, null, body, locale,
                false, null, null, null, null).post();
        return post.getId();
    }

    /** Adds a translation row to the post (the scoped search's target). */
    private void addTranslation(long postId, String locale, String title, String body) {
        guidance.createTranslation(postId, locale, null, title, body, null);
    }

    /** The admin list's ids in the order the endpoint answers them.
     *  Query params as name/value pairs (MockMvc's param idiom — a
     *  hand-concatenated query string would not be decoded). */
    private List<Long> adminListIds(String... params) throws Exception {
        var request = get("/admin/guidance").header("Authorization", "Bearer " + adminToken);
        for (int i = 0; i < params.length; i += 2) {
            request = request.param(params[i], params[i + 1]);
        }
        MvcResult result = mvc.perform(request)
                .andExpect(status().isOk())
                .andReturn();
        List<?> ids = JsonPath.read(result.getResponse().getContentAsString(StandardCharsets.UTF_8),
                "$[*].id");
        return ids.stream().map(n -> ((Number) n).longValue()).toList();
    }

    // ------------------------------------------------------------- search

    @Test
    void aBlankOrAbsentQueryIsNoFilter() throws Exception {
        long a = createPost("Search alpha", "<p>body a</p>", "en");
        long b = createPost("Search beta", "<p>body b</p>", "en");

        mvc.perform(get("/admin/guidance").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
        // A present-but-blank q is the SAME no-filter (the public q-less
        // behaviour — never a 400).
        mvc.perform(get("/admin/guidance").param("q", "  ").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        assertThat(adminListIds()).containsExactly(a, b);
    }

    @Test
    void theSearchIsACaseInsensitiveSubstringOverTitleAndTagStrippedBody() throws Exception {
        long titleHit = createPost("Kelder juhend", "<p>teine keha</p>", "en");
        long bodyHit = createPost("Muu pealkiri", "<p><b>Varjendus</b> keha siin</p>", "en");

        // Title substring, case-insensitive — the same result for any case.
        assertThat(adminListIds("q", "kELDER")).containsExactly(titleHit);
        assertThat(adminListIds("q", "KELDER")).containsExactly(titleHit);
        // The tag-stripped body: the <b> tags are stripped, the text matches
        // (a raw "<p>" search is NOT a feature — no stored body contains
        // literal markup, the sanitizer keeps only the allowed tags).
        assertThat(adminListIds("q", "varjendus")).containsExactly(bodyHit);
        assertThat(adminListIds("q", "<p>")).isEmpty();
    }

    @Test
    void theScopedSearchMatchesOnlyTheLocaleContentTheListRenders() throws Exception {
        // Post 1: an en post with an et translation. Post 2: en only.
        long withEt = createPost("Estonian shelter guide", "<p>en body</p>", "en");
        addTranslation(withEt, "et", "Eestikeelne keldri juhend", "<p>et keha</p>");
        long enOnly = createPost("English only guide", "<p>en body</p>", "en");

        // The et-scoped list renders the et translation: "keldri" hits ONLY
        // the et row...
        assertThat(adminListIds("locale", "et", "q", "keldri")).containsExactly(withEt);
        // ...while the same term in the en scope hits NOTHING (the en
        // content never says "keldri") — the match is what you see.
        assertThat(adminListIds("locale", "en", "q", "keldri")).isEmpty();
        // The en title of the SAME post is matched in the en scope.
        assertThat(adminListIds("locale", "en", "q", "Estonian")).containsExactly(withEt);
        // An et term is absent from the en-scoped post 2 as well.
        assertThat(adminListIds("locale", "en", "q", "et keha")).isEmpty();
        // Without a locale the search matches ANY locale content — the et
        // translation's text hits the en-home post.
        assertThat(adminListIds("q", "keldri")).containsExactly(withEt);
        assertThat(adminListIds("q", "english only")).containsExactly(enOnly);
        // The scoped list without a q still lists both rows (post 1 carries
        // et content, post 2 is an en-home post — the scope is content
        // presence, not the search).
        assertThat(adminListIds("locale", "et")).containsExactly(withEt);
    }

    @Test
    void theSearchNeverResortsTheStoredManualOrder() throws Exception {
        // Create four posts, then reorder so the stored order is d, b, a, c.
        long a = createPost("Alpha guide word", "<p>a</p>", "en");
        long b = createPost("Beta guide", "<p>b</p>", "en");
        long c = createPost("Gamma guide", "<p>c</p>", "en");
        long d = createPost("Delta guide word", "<p>d</p>", "en");
        String body = "{\"postIds\":[" + d + "," + b + "," + a + "," + c + "]}";
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/admin/guidance/order")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent());
        assertThat(adminListIds()).containsExactly(d, b, a, c);

        // A search matching the 1st and 3rd stored rows keeps their
        // RELATIVE stored order (d before a — a re-sort would put a first).
        assertThat(adminListIds("q", "word")).containsExactly(d, a);
        // The full-list search is the stored order itself.
        assertThat(adminListIds("q", "guide")).containsExactly(d, b, a, c);
    }

    @Test
    void anOverLongQueryIsA400() throws Exception {
        String longQ = "x".repeat(201);
        mvc.perform(get("/admin/guidance").param("q", longQ)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("q must be at most 200 characters"));
        // 200 is the valid edge (no posts match — but no 400 either).
        mvc.perform(get("/admin/guidance").param("q", "x".repeat(200))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ------------------------------------------------------------- paging

    @Test
    void absentParamsAnswerTheWholeOrderWithTheTotalHeader() throws Exception {
        for (int i = 1; i <= 5; i++) {
            createPost("Paged post " + i, "<p>body " + i + "</p>", "en");
        }
        mvc.perform(get("/admin/guidance").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(header().string("X-Total-Count", "5"));
    }

    @Test
    void pagesTileTheStoredManualOrderWithoutOverlapOrSkips() throws Exception {
        for (int i = 1; i <= 7; i++) {
            createPost("Paged " + i, "<p>body</p>", "en");
        }
        List<Long> full = adminListIds();
        assertThat(full).hasSize(7);

        List<Long> tiled = new ArrayList<>();
        for (int offset = 0; offset < 7; offset += 2) {
            MvcResult result = mvc.perform(get("/admin/guidance")
                            .param("limit", "2")
                            .param("offset", String.valueOf(offset))
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(header().string("X-Total-Count", "7"))
                    .andReturn();
            List<?> page = JsonPath.read(
                    result.getResponse().getContentAsString(StandardCharsets.UTF_8), "$[*].id");
            List<Long> pageIds = page.stream().map(n -> ((Number) n).longValue()).toList();
            assertThat(pageIds)
                    .containsExactlyElementsOf(full.subList(offset, Math.min(full.size(), offset + 2)));
            tiled.addAll(pageIds);
        }
        assertThat(tiled).containsExactlyElementsOf(full);

        // Past the end: an empty page, the total intact.
        mvc.perform(get("/admin/guidance").param("limit", "2").param("offset", "7")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0))
                .andExpect(header().string("X-Total-Count", "7"));
    }

    @Test
    void theSliceRunsAfterTheSearchAndTheHeaderCountsTheFilter() throws Exception {
        for (int i = 1; i <= 6; i++) {
            createPost("Match one " + i, "<p>m</p>", "en");
        }
        createPost("No match", "<p>x</p>", "en");

        // 6 of 7 match: the header counts the FILTERED length (6), the
        // pages slice the FILTERED list (the No-match post is in no page).
        mvc.perform(get("/admin/guidance").param("q", "match one")
                        .param("limit", "4").param("offset", "0")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(header().string("X-Total-Count", "6"));
        mvc.perform(get("/admin/guidance").param("q", "match one")
                        .param("limit", "4").param("offset", "4")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(header().string("X-Total-Count", "6"));
        // The No-match post is in NO page of the filtered scope.
        List<Long> first = adminListIds("q", "match one", "limit", "100", "offset", "0");
        List<Long> full = adminListIds();
        assertThat(first).hasSize(6);
        assertThat(first).doesNotContain(full.get(6));
    }

    @Test
    void thePagingBoundsAreThePublicGuidanceVocabulary() throws Exception {
        createPost("Bounds post", "<p>b</p>", "en");
        mvc.perform(get("/admin/guidance").param("limit", "0")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("limit must be between 1 and 200"));
        mvc.perform(get("/admin/guidance").param("limit", "201")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("limit must be between 1 and 200"));
        mvc.perform(get("/admin/guidance").param("offset", "-1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("offset must be non-negative"));
        // The valid edges answer.
        mvc.perform(get("/admin/guidance").param("limit", "1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/admin/guidance").param("limit", "200")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }
}
