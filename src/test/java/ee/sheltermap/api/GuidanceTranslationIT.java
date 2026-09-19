package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.AdminSeeder;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.guidance.GuidanceService;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Bilingual-guidance (V26) over the REAL persistence chain (Testcontainers
 * Postgres + Flyway + the Spring Data / native queries):
 * <ul>
 *   <li>the V26 table carries the backfill's column mapping and the
 *       (post_id, locale) / (locale, slug) uniquenesses, and a post hard-delete
 *       cascades onto its translations;</li>
 *   <li>the public detail gains an {@code alternates} map (locale -> slug) and
 *       both of a linked post's slugs resolve to the SAME post;</li>
 *   <li>a locale with no translation serves the default-locale translation with
 *       {@code localeFallback: true} (a 200, never a 404 — the language switch
 *       must not dead-end);</li>
 *   <li>translation management is admin-only (anonymous 401, non-admin 403,
 *       admin through).</li>
 * </ul>
 *
 * <p>Shape follows {@link GuidanceLocaleFilterIT} / {@link
 * ee.sheltermap.security.GuidanceAuthorizationIT}: the env-provisioned admin is
 * re-seeded per test, the public reads are anonymous, and the whole test is
 * {@code @Transactional} so every write (service AND JdbcTemplate) rolls back.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=guid-trans@example.ee",
        "app.admin.password=guid-trans-pass",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        "app.verification.cooldown-seconds=0",
        "app.verification.max-per-day=10"
})
@Transactional
class GuidanceTranslationIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    GuidanceService guidance;

    /** The seeder runs at CONTEXT start, but contexts are shared while the
        seed is transactional — re-run per test so the admin exists in THIS
        test's transaction (create-if-absent, so idempotent). */
    @Autowired
    AdminSeeder seeder;

    @Autowired
    JdbcTemplate jdbc;

    private long authorId;
    private long enPostId;
    private long etPostId;
    private String enSlug;
    private String etSlug;

    @BeforeEach
    void seed() {
        seeder.run(null);
        authorId = saveUser(users, "guid-trans-author@example.ee", "+37250040002").getId();
        // Two published posts, one per language — NOT yet linked (the owner's
        // starting state: separate rows with nothing connecting them).
        GuidancePost en = publish("Three minutes in a shelter", "en");
        enPostId = en.getId();
        enSlug = en.getSlug();
        GuidancePost et = publish("Kolm minutit varjulis", "et");
        etPostId = et.getId();
        etSlug = et.getSlug();
    }

    private GuidancePost publish(String title, String locale) {
        GuidancePost post = guidance.create(authorId, title, null, "<p>body-" + locale + "</p>",
                locale, false, null, null, null, null);
        guidance.publish(authorId, post.getId());
        return post;
    }

    private String adminToken() throws Exception {
        return login("guid-trans@example.ee", "guid-trans-pass");
    }

    /** Register + login (a non-admin needs no verification to hit the 403 guard). */
    private String plainToken() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Plain User\",\"email\":\"guid-trans-plain@example.ee\","
                                + "\"phone\":\"+37250020099\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isCreated());
        return login("guid-trans-plain@example.ee", "s3cret123");
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    // ------------------------------------------------------------- backfill + constraints

    @Test
    void theV26BackfillMapsEveryPostColumnIntoItsOwnTranslationRow() {
        // Simulate a pre-migration post (the migration's INSERT...SELECT source)
        // and run the migration's backfill mapping for that row. (sort_order is
        // set explicitly: the schema is V28, where it is NOT NULL — a pre-V26
        // post would have held the append position the service assigned it.)
        Long id = jdbc.queryForObject(
                "INSERT INTO guidance_posts (slug, title, body_html, locale, status, pinned,"
                        + " sort_order, published_at, created_at, updated_at)"
                        + " VALUES (?, ?, ?, 'et', 'PUBLISHED', false, 1, now(), now(), now())"
                        + " RETURNING id",
                Long.class, "pre-migration-post", "Vanune post", "<p>vanu</p>");
        jdbc.update(
                "INSERT INTO guidance_post_translations"
                        + " (post_id, locale, slug, title, body_html, hero_image_alt, created_at, updated_at)"
                        + " SELECT id, locale, slug, title, body_html, hero_image_alt, created_at, updated_at"
                        + " FROM guidance_posts WHERE id = ?", id);
        Map<String, Object> row = jdbc.queryForMap(
                "SELECT locale, slug, title, body_html FROM guidance_post_translations WHERE post_id = ?", id);
        assertThat(row.get("locale")).isEqualTo("et");
        assertThat(row.get("slug")).isEqualTo("pre-migration-post");
        assertThat(row.get("title")).isEqualTo("Vanune post");
        assertThat(row.get("body_html")).isEqualTo("<p>vanu</p>");
    }

    @Test
    void everyServiceCreatedPostOwnsAHomeLocaleTranslationRow() {
        // The runtime twin of the backfill: a post created through the service
        // owns a translation in its own locale mirroring its home content.
        Map<String, Object> row = jdbc.queryForMap(
                "SELECT locale, slug, title, body_html FROM guidance_post_translations WHERE post_id = ?",
                enPostId);
        assertThat(row.get("locale")).isEqualTo("en");
        assertThat(row.get("slug")).isEqualTo(enSlug);
        assertThat(row.get("title")).isEqualTo("Three minutes in a shelter");
        assertThat(row.get("body_html")).isEqualTo("<p>body-en</p>");
    }

    @Test
    void theTranslationTableEnforcesPostLocaleUniqueness() {
        // (post_id, locale): the post already owns an 'en' row — a second one
        // for the same post is refused. (Each constraint gets its OWN test so
        // the violation's aborted transaction cannot poison a sibling insert.)
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO guidance_post_translations (post_id, locale, slug, title, body_html)"
                        + " VALUES (?, 'en', 'dup-post-locale', 'T', '<p>b</p>')", enPostId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void theTranslationTableEnforcesLocaleSlugUniqueness() {
        // (locale, slug): the EN slug is already taken in locale 'en' — reusing
        // it in another post's 'en' row is refused.
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO guidance_post_translations (post_id, locale, slug, title, body_html)"
                        + " VALUES (?, 'en', ?, 'T', '<p>b</p>')", etPostId, enSlug))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void hardDeletingAPostCascadesToItsTranslations() {
        Long before = jdbc.queryForObject(
                "SELECT count(*) FROM guidance_post_translations WHERE post_id = ?", Long.class, enPostId);
        assertThat(before).isPositive();
        guidance.delete(authorId, enPostId, true);
        Long after = jdbc.queryForObject(
                "SELECT count(*) FROM guidance_post_translations WHERE post_id = ?", Long.class, enPostId);
        assertThat(after).isZero();
    }

    // ------------------------------------------------------------- alternates + fallback

    @Test
    void theDetailExposesAlternatesAndBothSlugsResolveToTheSamePost() throws Exception {
        String admin = adminToken();
        // The operator's pairing: attach the ET post onto the EN post (a MOVE —
        // the ET translation row is re-parented, the ET post becomes a shell).
        mvc.perform(post("/admin/guidance/" + enPostId + "/translations/attach")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourcePostId\":" + etPostId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locale").value("et"))
                .andExpect(jsonPath("$.slug").value(etSlug));

        // The EN detail now names BOTH locales in alternates (the switcher map).
        mvc.perform(get("/api/guidance/" + enSlug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locale").value("en"))
                .andExpect(jsonPath("$.localeFallback").value(false))
                .andExpect(jsonPath("$.alternates.en").value(enSlug))
                .andExpect(jsonPath("$.alternates.et").value(etSlug));

        // The ET slug resolves to the SAME post and serves the ET translation —
        // with the same alternates map.
        mvc.perform(get("/api/guidance/" + etSlug).param("locale", "et"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locale").value("et"))
                .andExpect(jsonPath("$.localeFallback").value(false))
                .andExpect(jsonPath("$.bodyHtml").value("<p>body-et</p>"))
                .andExpect(jsonPath("$.alternates.en").value(enSlug))
                .andExpect(jsonPath("$.alternates.et").value(etSlug));

        // The owner's bug, fixed: switching language on the EN page 200s on the
        // ET translation instead of answering a "no such page" 404.
        mvc.perform(get("/api/guidance/" + enSlug).param("locale", "et"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locale").value("et"))
                .andExpect(jsonPath("$.localeFallback").value(false));
    }

    @Test
    void aLocaleWithNoTranslationServesTheDefaultWithTheFallbackFlag() throws Exception {
        // The EN post has only an en translation (nothing linked). Asking for a
        // locale it lacks (ru) serves the default (en) with localeFallback=true.
        mvc.perform(get("/api/guidance/" + enSlug).param("locale", "ru"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locale").value("en"))
                .andExpect(jsonPath("$.localeFallback").value(true))
                .andExpect(jsonPath("$.bodyHtml").value("<p>body-en</p>"));
        // No parameter at all -> the default locale, no fallback.
        mvc.perform(get("/api/guidance/" + enSlug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locale").value("en"))
                .andExpect(jsonPath("$.localeFallback").value(false));
    }

    // ------------------------------------------------------------- authorisation + CRUD

    @Test
    void translationManagementRequiresAnAdmin() throws Exception {
        String createBody = "{\"locale\":\"ru\",\"title\":\"Tri minutes\",\"body\":\"<p>b</p>\"}";
        // Anonymous -> 401 on the translation routes.
        mvc.perform(post("/admin/guidance/" + enPostId + "/translations")
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/guidance/" + enPostId + "/translations"))
                .andExpect(status().isUnauthorized());

        // A registered non-admin -> 403.
        String plain = plainToken();
        mvc.perform(post("/admin/guidance/" + enPostId + "/translations")
                        .header("Authorization", "Bearer " + plain)
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isForbidden());
        mvc.perform(put("/admin/guidance/" + enPostId + "/translations/ru")
                        .header("Authorization", "Bearer " + plain)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"T\",\"body\":\"<p>b</p>\"}"))
                .andExpect(status().isForbidden());

        // The admin manages: create, list, and the home-locale delete guard.
        String admin = adminToken();
        mvc.perform(post("/admin/guidance/" + enPostId + "/translations")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locale").value("ru"))
                .andExpect(jsonPath("$.slug").isNotEmpty());
        mvc.perform(get("/admin/guidance/" + enPostId + "/translations")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.locale=='ru')].slug").isNotEmpty());
        // The post's own-locale (en) translation cannot be deleted (400)…
        mvc.perform(delete("/admin/guidance/" + enPostId + "/translations/en")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest());
        // …but a linked locale's translation can (204).
        mvc.perform(delete("/admin/guidance/" + enPostId + "/translations/ru")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
    }
}
