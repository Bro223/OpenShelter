package ee.sheltermap.security;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.auth.RecordingSmtpSender;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import ee.sheltermap.verification.SmtpSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultMatcher;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * M15 — the admin authorization surface pinned over the real security
 * chain with an env-provisioned admin (threat model A11): anonymous
 * /admin/** is a 401, a registered non-admin is a 403, both carrying the
 * hardening headers and no cookie; the env-provisioned admin gets 200; and
 * the author-scoped shelter writes keep their 404-absent / 403-foreign
 * vocabulary while /mine stays scoped to the caller.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=sec-admin@example.ee",
        "app.admin.password=sec-admin-pass",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        "app.ratelimit.verify-capacity=1000",
        "app.ratelimit.verify-refill-per-second=0",
        "app.verification.cooldown-seconds=0",
        "app.verification.max-per-day=10"
})
@Transactional
class AdminAuthorizationIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    RecordingSmtpSender smtp;

    @TestConfiguration
    static class Config {
        @Bean
        @Primary
        SmtpSender smtpSender() {
            return new RecordingSmtpSender();
        }
    }

    @BeforeEach
    void clearFakes() {
        smtp.clear();
    }

    /** One matcher asserting the full hardening-header set + no cookie. */
    private static ResultMatcher hardeningHeadersAndNoCookie() {
        return result -> {
            assertThat(result.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
            assertThat(result.getResponse().getHeader("X-Frame-Options")).isEqualTo("DENY");
            assertThat(result.getResponse().getHeader("Referrer-Policy")).isEqualTo("no-referrer");
            assertThat(result.getResponse().getHeader("Content-Security-Policy")).isEqualTo("default-src 'self'");
            assertThat(result.getResponse().getHeader("Set-Cookie")).isNull();
        };
    }

    /** Register + e-mail-verify (the write path needs a verified contact). */
    private String registerVerified(String name, String email, String phone) throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"email\":\"" + email + "\","
                                + "\"phone\":\"" + phone + "\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isCreated());
        String token = login(email, "s3cret123");
        mvc.perform(post("/verify/request").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isAccepted());
        // the verification e-mail ends with the 6-digit code
        String message = smtp.last().message();
        String code = message.substring(message.lastIndexOf(' ') + 1);
        mvc.perform(post("/verify/confirm").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\",\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk());
        return token;
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    private long createShelter(String token, String name, double lat, double lng) throws Exception {
        MvcResult result = mvc.perform(post("/api/shelters").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"latitude\":" + lat
                                + ",\"longitude\":" + lng + ",\"capacity\":10}"))
                .andExpect(status().isCreated())
                .andReturn();
        // JsonPath returns Integer for small json numbers — widen explicitly
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    @Test
    void anonymousAdminCallsGet401WithHardeningHeadersAndNoCookie() throws Exception {
        for (String path : List.of("/admin/shelters", "/admin/alerts")) {
            mvc.perform(get(path))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(hardeningHeadersAndNoCookie());
        }
    }

    @Test
    void aRegisteredNonAdminGets403OnAdminEndpoints() throws Exception {
        String token = login(registerAndLoginPlain("plain@example.ee", "+37250020001"), "s3cret123");
        mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(hardeningHeadersAndNoCookie());
    }

    private String registerAndLoginPlain(String email, String phone) throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Plain User\",\"email\":\"" + email + "\","
                                + "\"phone\":\"" + phone + "\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isCreated());
        return email;
    }

    @Test
    void theEnvProvisionedAdminReadsAdminEndpoints() throws Exception {
        String admin = login("sec-admin@example.ee", "sec-admin-pass");
        mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk());
        mvc.perform(get("/admin/alerts").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk());
    }

    @Test
    void foreignShelterWritesAre403AndAbsentOnes404() throws Exception {
        String a = registerVerified("Owner A", "owner-a@example.ee", "+37250020002");
        String b = registerVerified("Owner B", "owner-b@example.ee", "+37250020003");
        long shelterA = createShelter(a, "A Kojas", 58.5500, 25.0500);

        // B cannot modify or delete A's row — 403, not a silent no-op
        String putBody = "{\"name\":\"Sneaky Edit\",\"latitude\":58.5500,\"longitude\":25.0500,\"capacity\":10}";
        mvc.perform(put("/api/shelters/" + shelterA).header("Authorization", "Bearer " + b)
                        .contentType(MediaType.APPLICATION_JSON).content(putBody))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
        mvc.perform(delete("/api/shelters/" + shelterA).header("Authorization", "Bearer " + b))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
        // an absent row is a 404 even for an authenticated caller
        mvc.perform(put("/api/shelters/999999").header("Authorization", "Bearer " + b)
                        .contentType(MediaType.APPLICATION_JSON).content(putBody))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void mineReturnsOnlyTheCallersShelters() throws Exception {
        String a = registerVerified("Mine A", "mine-a@example.ee", "+37250020004");
        String b = registerVerified("Mine B", "mine-b@example.ee", "+37250020005");
        long shelterA = createShelter(a, "Mine A Kojas", 58.6500, 25.2500);
        long shelterB = createShelter(b, "Mine B Kojas", 58.7500, 25.4500);

        MvcResult aMine = mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + a))
                .andExpect(status().isOk())
                .andReturn();
        List<Number> aIds = JsonPath.read(aMine.getResponse().getContentAsString(), "$[*].id");
        assertThat(aIds).hasSize(1);
        assertThat(((Number) aIds.get(0)).longValue()).isEqualTo(shelterA);
        assertThat(aIds.stream().mapToLong(Number::longValue).toArray()).doesNotContain(shelterB);
    }
}
