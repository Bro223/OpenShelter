package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.AdminSeeder;
import ee.sheltermap.guidance.GuidanceService;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The public guidance locale filter over the REAL persistence chain
 * (Testcontainers Postgres + the Spring Data derived queries, so the
 * derived method names AND their SQL are exercised, not just the
 * service seam): the index with {@code locale=et} returns only the
 * Estonian rows and {@code locale=en} only the English ones — disjoint,
 * non-empty on the seeded data; the ABSENT parameter falls back to the
 * default locale; a blank or over-long locale is the uniform 400; the
 * detail is 200 for the matching locale and the SAME 404 as an unknown
 * slug for the mismatching one; and the ADMIN list stays locale-blind
 * (the administrator manages both languages).
 *
 * <p>Shape follows {@link GuidanceAuthorizationIT}: the env-provisioned
 * admin (re-seeded per test) serves the admin-list assertion; the public
 * reads are anonymous.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=guid-locale@example.ee",
        "app.admin.password=guid-locale-pass",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0"
})
@Transactional
class GuidanceLocaleFilterIT extends AbstractPersistenceIT {

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

    /** The seeded "current data": two published posts per language. */
    private String enSlug1;
    private String enSlug2;
    private String etSlug1;
    private String etSlug2;

    @BeforeEach
    void seed() {
        seeder.run(null);
        // A real user row: the post's created_by and the audit's
        // moderator_id are FKs to users.
        long authorId = saveUser(users, "guid-locale-author@example.ee", "+37250040001").getId();
        enSlug1 = publish(authorId, "Locale English one", "en");
        enSlug2 = publish(authorId, "Locale English two", "en");
        etSlug1 = publish(authorId, "Locale Eesti üks", "et");
        etSlug2 = publish(authorId, "Locale Eesti kaks", "et");
    }

    private String publish(long authorId, String title, String locale) {
        var post = guidance.create(authorId, title, null, "<p>body</p>", locale,
                false, null, null, null, null).post();
        guidance.publish(authorId, post.getId());
        return post.getSlug();
    }

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"guid-locale@example.ee\","
                                + "\"password\":\"guid-locale-pass\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    /** The {@code slug} set of an index (or admin list) response body. */
    private static Set<String> slugsOf(MvcResult result) throws Exception {
        List<?> slugs = JsonPath.read(result.getResponse().getContentAsString(), "$[*].slug");
        return slugs.stream().map(Object::toString).collect(Collectors.toSet());
    }

    /** The uniform 400 body (01-TASK.md §8): all five fields present. */
    private void expectUniform400(ResultActions actions) throws Exception {
        actions.andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").isNotEmpty());
    }

    @Test
    void theIndexFiltersByLocaleAndTheTwoSetsAreDisjointAndNonEmpty() throws Exception {
        MvcResult en = mvc.perform(get("/api/guidance").param("locale", "en"))
                .andExpect(status().isOk())
                .andReturn();
        MvcResult et = mvc.perform(get("/api/guidance").param("locale", "et"))
                .andExpect(status().isOk())
                .andReturn();

        Set<String> enSlugs = slugsOf(en);
        Set<String> etSlugs = slugsOf(et);

        // Non-empty, exactly each language's own rows — and disjoint.
        assertThat(enSlugs).containsExactlyInAnyOrder(enSlug1, enSlug2);
        assertThat(etSlugs).containsExactlyInAnyOrder(etSlug1, etSlug2);
        assertThat(enSlugs).doesNotContainAnyElementsOf(etSlugs);

        // The index stays body-less in both locales (the projection is
        // untouched by the filter).
        mvc.perform(get("/api/guidance").param("locale", "et"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].bodyHtml").isEmpty());
    }

    @Test
    void theAbsentLocaleFallsBackToTheDefaultLocale() throws Exception {
        // No parameter at all: the configured default (en, unoverridden
        // here) answers — the old behaviour of an unscoped call.
        MvcResult all = mvc.perform(get("/api/guidance")).andExpect(status().isOk()).andReturn();
        assertThat(slugsOf(all)).containsExactlyInAnyOrder(enSlug1, enSlug2);

        // The detail resolves against the default locale too, so existing
        // links keep working: the default-language post 200s, the other
        // language's post 404s — with or without the parameter.
        mvc.perform(get("/api/guidance/" + enSlug1)).andExpect(status().isOk());
        mvc.perform(get("/api/guidance/" + etSlug1)).andExpect(status().isNotFound());
        mvc.perform(get("/api/guidance/" + enSlug1).param("locale", "en")).andExpect(status().isOk());
        mvc.perform(get("/api/guidance/" + etSlug1).param("locale", "en")).andExpect(status().isNotFound());
    }

    @Test
    void aBlankOrOverlongLocaleIsAUniform400OnIndexAndDetail() throws Exception {
        // The column is VARCHAR(5): blank is a present-but-empty request,
        // six characters cannot match any stored row.
        for (String bad : List.of("", "   ", "abcdef")) {
            expectUniform400(mvc.perform(get("/api/guidance").param("locale", bad)));
            expectUniform400(mvc.perform(get("/api/guidance/" + enSlug1).param("locale", bad)));
        }
    }

    @Test
    void theDetailServesTheRequestedLocaleAndFallsBackToTheDefaultWhenAbsent() throws Exception {
        mvc.perform(get("/api/guidance/" + enSlug1).param("locale", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locale").value("en"))
                .andExpect(jsonPath("$.localeFallback").value(false))
                .andExpect(jsonPath("$.bodyHtml").value("<p>body</p>"));
        mvc.perform(get("/api/guidance/" + etSlug1).param("locale", "et"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locale").value("et"));

        // A mismatch where the post HAS a default-locale translation (en is
        // the default here) serves the default-locale translation with the
        // fallback flag — a 200, never a 404 (the language switch must not
        // dead-end). The alternates map names the en slug for the switcher.
        mvc.perform(get("/api/guidance/" + enSlug1).param("locale", "et"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locale").value("en"))
                .andExpect(jsonPath("$.localeFallback").value(true))
                .andExpect(jsonPath("$.alternates.en").value(enSlug1));
        // The et-only post asked for en has no en translation AND the default
        // (en) is absent, so it stays a 404 (nothing to serve in that language).
        mvc.perform(get("/api/guidance/" + etSlug1).param("locale", "en"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
        mvc.perform(get("/api/guidance/unknown-slug").param("locale", "en"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void theAdminListStillReturnsBothLanguagesUnfiltered() throws Exception {
        String admin = adminToken();

        MvcResult result = mvc.perform(get("/admin/guidance")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();

        // Every seeded post — both languages, no locale parameter accepted
        // or needed: the administrator sees and manages everything.
        assertThat(slugsOf(result)).contains(enSlug1, enSlug2, etSlug1, etSlug2);
    }
}
