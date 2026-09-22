package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.guidance.GuidanceService;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * guidance-index-paging over the REAL persistence chain
 * (Testcontainers Postgres + Flyway + the Spring Data queries): the
 * public index's optional {@code limit} (1..200) / {@code offset} (>= 0)
 * paging —
 * <ul>
 *   <li>consecutive pages tile the STABLE index order (pinned first,
 *       manual order, timestamp/id tie-breaks) without overlap or
 *       skips, and the un-paged answer is byte-identical to the
 *       pre-paging endpoint (the params are absent, not defaulted);</li>
 *   <li>the {@code X-Total-Count} response header is the UN-PAGED
 *       length of the locale's index — always present, unaffected by
 *       the slice, draft-free, and locale-scoped like the body;</li>
 *   <li>an offset past the end is an empty page (200 + []), never an
 *       error — the client distinguishes it from an empty index via
 *       the header;</li>
 *   <li>the bounds are the shelter list's vocabulary: limit 1..200,
 *       offset >= 0; anything else is the uniform 400 body — and a
 *       large limit (100) is HONORED, never clamped to a smaller page.</li>
 * </ul>
 *
 * <p>{@code @Transactional} (the {@link GuidanceLocaleFilterIT} shape):
 * the seeded posts roll back per test — no committed rows to wipe.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class GuidancePaginationIT extends AbstractPersistenceIT {

    private static final int EN_POSTS = 25;

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    GuidanceService guidance;

    @Autowired
    JdbcTemplate jdbc;

    private long authorId;

    @BeforeEach
    void seed() {
        authorId = saveUser(users, "guid-page-author@example.ee", "+37250041001").getId();
        // The default-locale (en) index: 25 published posts...
        for (int i = 1; i <= EN_POSTS; i++) {
            publish(authorId, "Paged English " + i, "en");
        }
        // ...a second locale the paging must scope to like the body...
        publish(authorId, "Paged Eesti üks", "et");
        publish(authorId, "Paged Eesti kaks", "et");
        // ...and a draft that is ABSENT from the public index and from
        // the total alike.
        guidance.create(authorId, "Paged draft", null, "<p>draft body</p>", "en",
                false, null, null, null, null);
    }

    // ------------------------------------------------------------- tests

    @Test
    void absentParamsAnswerTheWholeIndexWithTheTotalHeader() throws Exception {
        mvc.perform(get("/api/guidance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(EN_POSTS))
                .andExpect(header().string("X-Total-Count", String.valueOf(EN_POSTS)));
    }

    @Test
    void pagesTileTheStableOrderWithoutOverlapOrSkips() throws Exception {
        // The un-paged order is the ground truth the pages must tile.
        List<String> full = slugsOf(mvc.perform(get("/api/guidance")).andReturn());
        assertThat(full).hasSize(EN_POSTS);

        List<String> tiled = new ArrayList<>();
        for (int offset = 0; offset < EN_POSTS; offset += 10) {
            MvcResult result = mvc.perform(get("/api/guidance")
                            .param("limit", "10")
                            .param("offset", String.valueOf(offset)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("X-Total-Count", String.valueOf(EN_POSTS)))
                    .andReturn();
            List<String> page = slugsOf(result);
            // Each page is exactly the corresponding slice of the
            // un-paged order (no re-sorting, no overlap, no skips).
            assertThat(page).containsExactlyElementsOf(full.subList(offset, Math.min(full.size(), offset + 10)));
            tiled.addAll(page);
        }
        assertThat(tiled).containsExactlyElementsOf(full);
    }

    @Test
    void anOffsetPastTheEndAnswersAnEmptyPageWithTheTotal() throws Exception {
        // Past the end is an EMPTY PAGE, not an error and not the
        // empty-INDEX state: the header still names the full length.
        mvc.perform(get("/api/guidance")
                        .param("limit", "10")
                        .param("offset", String.valueOf(EN_POSTS)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0))
                .andExpect(header().string("X-Total-Count", String.valueOf(EN_POSTS)));
    }

    @Test
    void anOffsetInTheLastPartialPageAnswersTheRemainder() throws Exception {
        mvc.perform(get("/api/guidance")
                        .param("limit", "10")
                        .param("offset", String.valueOf(EN_POSTS - 1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(header().string("X-Total-Count", String.valueOf(EN_POSTS)));
    }

    @Test
    void thePinnedPostLeadsTheFirstPage() throws Exception {
        long pinnedId = createPost(authorId, "Paged pinned lead", "en", true);
        guidance.publish(authorId, pinnedId);

        mvc.perform(get("/api/guidance").param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].pinned").value(true))
                .andExpect(jsonPath("$.length()").value(1))
                // The pinned post joins the total (25 -> 26).
                .andExpect(header().string("X-Total-Count", String.valueOf(EN_POSTS + 1)));
    }

    @Test
    void aDraftIsAbsentFromTheIndexAndFromTheTotal() throws Exception {
        // The seed already carries one draft; the total counts published
        // only, so the draft never inflates the page count.
        mvc.perform(get("/api/guidance").param("limit", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(EN_POSTS))
                .andExpect(header().string("X-Total-Count", String.valueOf(EN_POSTS)));
    }

    @Test
    void theLocaleFilterAppliesBeforeTheSliceAndTheTotal() throws Exception {
        // The et scope has 2 posts: the slice runs over the SCOPED list,
        // and the header counts the SCOPED length, not the en one.
        mvc.perform(get("/api/guidance")
                        .param("locale", "et")
                        .param("limit", "10")
                        .param("offset", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].locale").value("et"))
                .andExpect(header().string("X-Total-Count", "2"));
    }

    @Test
    void aLargeLimitIsHonoredNotClamped() throws Exception {
        // 100 is inside the bound and must come back WHOLE, not shrunk
        // to a smaller server-chosen page.
        mvc.perform(get("/api/guidance").param("limit", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(EN_POSTS))
                .andExpect(header().string("X-Total-Count", String.valueOf(EN_POSTS)));
    }

    @Test
    void thePagingBoundsAreTheShelterListVocabulary() throws Exception {
        // limit outside 1..200 and a negative offset: the uniform 400
        // body, the same shape as the locale 400s.
        mvc.perform(get("/api/guidance").param("limit", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("limit must be between 1 and 200"));
        mvc.perform(get("/api/guidance").param("limit", "201"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("limit must be between 1 and 200"));
        mvc.perform(get("/api/guidance").param("offset", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("offset must be non-negative"));
        // limit=1 and limit=200 are the valid edges.
        mvc.perform(get("/api/guidance").param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/guidance").param("limit", "200"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(EN_POSTS));
    }

    // ------------------------------------------------------------- helpers

    private long createPost(long authorId, String title, String locale, boolean pinned) {
        GuidancePost post = guidance.create(authorId, title, null, "<p>body</p>", locale,
                pinned, null, null, null, null).post();
        return post.getId();
    }

    private String publish(long authorId, String title, String locale) {
        long id = createPost(authorId, title, locale, false);
        guidance.publish(authorId, id);
        return jdbc.queryForObject("SELECT slug FROM guidance_posts WHERE id = ?", String.class, id);
    }

    /** The {@code slug} sequence of an index response body — order kept. */
    private static List<String> slugsOf(MvcResult result) throws Exception {
        List<?> slugs = JsonPath.read(
                result.getResponse().getContentAsString(StandardCharsets.UTF_8), "$[*].slug");
        return slugs.stream().map(Object::toString).toList();
    }
}
