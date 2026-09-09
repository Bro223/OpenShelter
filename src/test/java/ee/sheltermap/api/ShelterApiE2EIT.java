package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.RecordingSmtpSender;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import ee.sheltermap.verification.SmtpSender;
import ee.sheltermap.verification.VerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Step 6 end-to-end acceptance (07-STEPS.md): register → verify via the dev
 * e-mail sender → add a shelter → review it → fetch with {@code averageRating}.
 *
 * <p>The whole flow runs over real HTTP (MockMvc) with the real security
 * chain, JWT filter, services and Postgres. Verification is driven through
 * the REAL {@link VerificationService} bean (W18: the hand-built service with
 * a throwaway in-memory send log is gone) — the e-mail channel is still
 * stubbed to the capturing dev sender via the {@code @Primary} bean below,
 * so the token can be read out of the "sent" message. The durable send log
 * is isolated per JVM run by {@link AbstractPersistenceIT}.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.reset-capacity=1000",
        "app.ratelimit.reset-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class ShelterApiE2EIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    VerificationService verification;

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
    void clearSmtp() {
        smtp.clear();
    }

    @Test
    void registerVerifyAddShelterReviewAndFetchWithAverageRating() throws Exception {
        // 1. register
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"E2E Kasutaja\",\"email\":\"e2e@example.ee\","
                                + "\"phone\":\"+37250009999\",\"nationalIdCode\":\"49001019999\","
                                + "\"password\":\"s3cret\"}"))
                .andExpect(status().isCreated());

        // 2. verify via the dev (capturing) e-mail sender — real service bean,
        // real JPA pending repository, real file send log (temp path per run)
        RegisteredUser user = users.findByEmail("e2e@example.ee");
        assertThat(user).isNotNull();
        assertThat(user.canWrite()).isFalse(); // not verified yet

        verification.requestVerification(user, VerificationLevel.EMAIL);

        String message = smtp.last().message();
        assertThat(message).contains("verification code: ");
        String token = message.substring(message.lastIndexOf(' ') + 1);

        assertThat(verification.confirmVerification(user, VerificationLevel.EMAIL, token)).isTrue();
        users.save(user); // persist the new claim (JPA save rewrites the claim set)
        assertThat(users.findByEmail("e2e@example.ee").canWrite()).isTrue();

        // 3. login -> access token
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"e2e@example.ee\",\"password\":\"s3cret\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String accessToken = JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");

        // 4. add a shelter
        MvcResult created = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"E2E Varjend\",\"latitude\":59.4372,\"longitude\":24.7453}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.source").value("USER"))
                .andReturn();
        long shelterId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();
        assertThat(created.getResponse().getHeader("Location")).isEqualTo("/api/shelters/" + shelterId);

        // 5. review it
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"Suurepärane varjend!\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorName").value("E2E Kasutaja"))
                .andExpect(jsonPath("$.rating").value(5));

        // 6. fetch with the rating aggregate
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("E2E Varjend"))
                .andExpect(jsonPath("$.averageRating").value(5.0))
                .andExpect(jsonPath("$.reviewCount").value(1));

        mvc.perform(get("/api/shelters/" + shelterId + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].authorName").value("E2E Kasutaja"))
                .andExpect(jsonPath("$[0].comment").value("Suurepärane varjend!"));
    }
}
