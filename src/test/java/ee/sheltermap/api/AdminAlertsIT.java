package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.auth.RecordingSmtpSender;
import ee.sheltermap.auth.RecordingSmsSender;
import ee.sheltermap.auth.TokenService;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import ee.sheltermap.verification.InMemoryVerificationSendLog;
import ee.sheltermap.verification.SmtpSender;
import ee.sheltermap.verification.SmsSender;
import ee.sheltermap.verification.VerificationSendLog;
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

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the admin alerts: the cap
 * + duplicate detectors append their throttled (429) and repeat-report
 * (409) events to the in-memory ring, and {@code GET /admin/alerts} serves
 * them newest first behind the fresh-lookup admin guard (401 anonymous,
 * 403 non-admin, 400 for an out-of-range {@code limit}). Full-stack
 * MockMvc against the real services, security chain, JWT filter and
 * Postgres; the admin is seeded by the context startup (app.admin.* set)
 * and logs in through the normal /auth/login. The OTP contact cap is
 * pinned to 2 so the third verify request of one user trips it (the
 * shared test profile runs the cap at 100 for the harnesses).
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        "app.verification.cooldown-seconds=0",
        "app.verification.max-per-day=10",
        "app.limits.otp-per-contact-max=2"
})
@Transactional
class AdminAlertsIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    TokenService tokens;

    @Autowired
    InMemoryVerificationSendLog sendLog;

    @Autowired
    RecordingSmtpSender smtp;

    @Autowired
    RecordingSmsSender sms;

    @TestConfiguration
    static class Config {
        @Bean
        @Primary
        VerificationSendLog inMemoryVerificationSendLog() {
            return new InMemoryVerificationSendLog();
        }

        @Bean
        @Primary
        SmtpSender smtpSender() {
            return new RecordingSmtpSender();
        }

        @Bean
        @Primary
        SmsSender smsSender() {
            return new RecordingSmsSender();
        }
    }

    @BeforeEach
    void clearFakes() {
        sendLog.clear();
        smtp.clear();
        sms.clear();
    }

    private long nextUser = 1;

    // ---------- helpers ----------

    /** A write-capable (e-mail-verified) user; returns id + token. */
    private record Auth(long id, String token) {
    }

    private Auth verified(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725001" + nextUser++);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        return new Auth(user.getId(), tokens.issue(user).accessToken());
    }

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.parse(login.getResponse().getContentAsString()).read("$.accessToken", String.class);
    }

    private long submit(String token, String name, double lat, double lng) throws Exception {
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"latitude\":" + lat + ",\"longitude\":" + lng + "}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.parse(result.getResponse().getContentAsString()).read("$.id", Long.class);
    }

    /** The admin alert list as parsed rows (newest first). */
    private List<Map<String, Object>> alerts(String adminToken) throws Exception {
        MvcResult result = mvc.perform(get("/admin/alerts")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = JsonPath
                .parse(result.getResponse().getContentAsString())
                .read("$", List.class);
        return rows;
    }

    private Map<String, Object> findRow(List<Map<String, Object>> rows, String subject) {
        return rows.stream()
                .filter(row -> subject.equals(row.get("subject")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no alert row for " + subject + " in " + rows));
    }

    // ---------- authorization + limit validation ----------

    @Test
    void anonymousGets401() throws Exception {
        mvc.perform(get("/admin/alerts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void nonAdminGets403() throws Exception {
        Auth regular = verified("Tavaline", "tavaline@example.ee");
        mvc.perform(get("/admin/alerts")
                        .header("Authorization", "Bearer " + regular.token()))
                .andExpect(status().isForbidden());
    }

    @Test
    void limitOutOfRangeIs400() throws Exception {
        String admin = adminToken();
        mvc.perform(get("/admin/alerts?limit=0")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/admin/alerts?limit=201")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/admin/alerts?limit=50")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk());
    }

    // ---------- the alerts ----------

    @Test
    void theDailyCapThrottleLandsInTheAlerts() throws Exception {
        Auth user = verified("Piiratud", "alerts-cap@example.ee");
        String admin = adminToken();

        // the configured default (app.limits.daily-submissions-per-user) is 5
        for (int i = 1; i <= 5; i++) {
            submit(user.token(), "Alerts Varjend " + i, 59.4 + i * 0.01, 24.7);
        }
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Alerts Varjend 6\",\"latitude\":59.5,\"longitude\":24.7}"))
                .andExpect(status().isTooManyRequests());

        Map<String, Object> row = findRow(alerts(admin), "user:" + user.id());
        assertThat(row.get("kind")).isEqualTo("submission-daily-cap");
        assertThat((String) row.get("detail")).contains("429");
        assertThat((Integer) row.get("retryAfterSeconds")).isGreaterThan(0);
        assertThat((String) row.get("at")).isNotEmpty();
    }

    @Test
    void theNearDuplicateRejectionLandsInTheAlertsWithTheExistingRowId() throws Exception {
        Auth first = verified("Esimene", "alerts-dup-first@example.ee");
        long existingId = submit(first.token(), "Alerts Duplicate", 59.42, 24.72);
        Auth reReporter = verified("Teine", "alerts-dup-second@example.ee");

        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + reReporter.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Alerts Duplicate\",\"latitude\":59.42005,\"longitude\":24.72005}"))
                .andExpect(status().isConflict());

        Map<String, Object> row = findRow(alerts(adminToken()), "user:" + reReporter.id());
        assertThat(row.get("kind")).isEqualTo("near-duplicate");
        assertThat((String) row.get("detail")).contains("shelter #" + existingId);
        assertThat(row.get("retryAfterSeconds")).isNull();
    }

    @Test
    void theOtpContactCapLandsInTheAlerts() throws Exception {
        // UNVERIFIED e-mail: the verify requests are real sends for the
        // contact cap (cooldown off, daily cap 10 — only the contact cap
        // (2, pinned above) can fire).
        RegisteredUser unverified = new RegisteredUser("Otp Unverified", "alerts-otp@example.ee", "+37250020001");
        users.save(unverified);
        String token = tokens.issue(unverified).accessToken();

        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/verify/request")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"level\":\"EMAIL\"}"))
                    .andExpect(status().isAccepted());
        }
        mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isTooManyRequests());

        assertThat(smtp.sent()).hasSize(2); // the throttled request sent nothing

        Map<String, Object> row = findRow(alerts(adminToken()), "contact:alerts-otp@example.ee");
        assertThat(row.get("kind")).isEqualTo("otp-contact-cap");
        assertThat((String) row.get("detail")).contains("429");
        assertThat((Integer) row.get("retryAfterSeconds")).isGreaterThan(0);
    }

    @Test
    void theNewestAlertComesFirst() throws Exception {
        Auth user = verified("Korraldatud", "alerts-order@example.ee");
        String admin = adminToken();

        // event 1: the near-duplicate 409 (own re-POST of the first row)
        submit(user.token(), "Alerts Order Varjend", 59.43, 24.73);
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Alerts Order Varjend\",\"latitude\":59.43005,\"longitude\":24.73005}"))
                .andExpect(status().isConflict());

        // event 2 (newer): the daily cap 429 — five distinct rows fill the
        // window (the 409 created nothing), the 6th is throttled
        for (int i = 2; i <= 5; i++) {
            submit(user.token(), "Alerts Order " + i, 59.43 + i * 0.01, 24.73);
        }
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Alerts Order 6\",\"latitude\":59.49,\"longitude\":24.73}"))
                .andExpect(status().isTooManyRequests());

        List<Map<String, Object>> own = alerts(admin).stream()
                .filter(row -> ("user:" + user.id()).equals(row.get("subject")))
                .toList();
        assertThat(own).hasSize(2);
        assertThat(own.get(0).get("kind")).isEqualTo("submission-daily-cap");
        assertThat(own.get(1).get("kind")).isEqualTo("near-duplicate");
    }
}
