package ee.sheltermap.auth;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The erasure invariant (owner rule): when an account is deleted by its
 * owner, the public shelters it submitted KEEP THE STATUS THEY HAD while
 * the account was active. The V31 write-time snapshot column
 * ({@code submitter_verified_at_creation}) exists for exactly this —
 * erasure must not change a submission's standing.
 *
 * <p>The pin's currency is the served standing per row: the boolean
 * {@code submitterVerified} (verified at all) and the depth
 * {@code submitterVerification} (PARTIAL at one confirmed channel, FULL at
 * two or more, absent = unverified). Each test below establishes the row's
 * standing while the account is ACTIVE (the baseline the owner's rule
 * preserves), erases the account, and re-reads the SAME row: a fully
 * verified row must stay fully verified, a partially verified row must
 * stay partial, and a row that was unverified must stay unverified. If any
 * of the three fails, the invariant is broken — that is a bug to report,
 * not a test to bend.
 *
 * <p>Full-stack MockMvc against real services, security chain, JWT filter
 * and Postgres (the same acceptance seam as {@code AccountDeletionIT}).
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        // The register bucket is per-IP and small (capacity 10, yml default);
        // the full-suite context shares one IP across IT classes, so the
        // three register calls here get their own bucket instead of a 429
        // from whatever ran earlier. (This property set also gives the
        // class its own context — deliberate: a fresh limiter ring.)
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        // The env-provisioned admin: the seeder is explicit per class — a
        // plain test context must never seed.
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1"
})
@Transactional
class AccountErasureStandingIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    /** One registered, logged-in user: id + the bearer token for calls. */
    private record Auth(long id, String email, String phone, String password, String token) {}

    /** Register + login; returns the account with a bearer token. */
    private Auth register(String name, String email, String phone, String password) throws Exception {
        mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"email\":\"" + email + "\","
                                + "\"phone\":\"" + phone + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isCreated());

        MvcResult result = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        String token = JsonPath.parse(body).read("$.accessToken", String.class);
        long id = users.findByEmail(email).getId();
        return new Auth(id, email, phone, password, token);
    }

    /** Confirms the given channels on the account (the verification flow's own seam). */
    private void confirm(Auth user, VerificationLevel... levels) {
        RegisteredUser userEntity = users.findByEmail(user.email());
        for (VerificationLevel level : levels) {
            String ref = level == VerificationLevel.EMAIL ? user.email() : user.phone();
            userEntity.addVerification(new VerificationClaim(level, level.name().toLowerCase(), ref,
                    Instant.now()));
        }
        users.save(userEntity);
    }

    /** Revokes the account's confirmed channel (the row then reads unverified). */
    private void revoke(Auth user, VerificationLevel level) {
        RegisteredUser userEntity = users.findByEmail(user.email());
        userEntity.revoke(level, Instant.now());
        users.save(userEntity);
    }

    /** Submits a PUBLIC row; answers with the row id. */
    private long submit(Auth user, String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"latitude\":59.4,\"longitude\":24.7}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.parse(result.getResponse().getContentAsString()).read("$.id", Long.class);
    }

    @Test
    void aFullyVerifiedRowKeepsItsVerifiedStandingAfterTheAuthorErasesTheAccount() throws Exception {
        // Two confirmed channels — the "fully verified" tier.
        Auth user = register("Täis", "tais-erasure@example.ee", "+3725006001", "tais-pass");
        confirm(user, VerificationLevel.EMAIL, VerificationLevel.PHONE);
        long rowId = submit(user, "Täis Verified Shelter");

        // The standing the row had while the account was ACTIVE — the
        // baseline the owner's rule preserves.
        mvc.perform(get("/api/shelters/" + rowId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitterVerified").value(true))
                .andExpect(jsonPath("$.submitterVerification").value("FULL"))
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));

        mvc.perform(delete("/account").header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isNoContent());

        // The row is orphaned (created_by NULL) and survives the erasure…
        assertThat(shelters.findById(rowId)).isPresent();
        assertThat(shelters.findById(rowId).orElseThrow().getCreatedBy()).isNull();
        // …with the status it had while the account was active: still
        // verified, still FULL, the review state untouched.
        mvc.perform(get("/api/shelters/" + rowId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitterVerified").value(true))
                .andExpect(jsonPath("$.submitterVerification").value("FULL"))
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));
    }

    @Test
    void aPartiallyVerifiedRowKeepsItsPartialStandingAfterTheAuthorErasesTheAccount() throws Exception {
        // Exactly one confirmed channel — the "partially verified" tier.
        Auth user = register("Osaliselt", "osaliselt-erasure@example.ee", "+3725006002", "osaliselt-pass");
        confirm(user, VerificationLevel.EMAIL);
        long rowId = submit(user, "Osaliselt Verified Shelter");

        // The standing the row had while the account was ACTIVE.
        mvc.perform(get("/api/shelters/" + rowId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitterVerified").value(true))
                .andExpect(jsonPath("$.submitterVerification").value("EMAIL"))
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));

        mvc.perform(delete("/account").header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isNoContent());

        // The row is orphaned and survives the erasure…
        assertThat(shelters.findById(rowId)).isPresent();
        assertThat(shelters.findById(rowId).orElseThrow().getCreatedBy()).isNull();
        // …as PARTIAL, not verified-or-more and not unverified: the single
        // channel the author had at the write must still read as one
        // channel.
        mvc.perform(get("/api/shelters/" + rowId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitterVerified").value(true))
                .andExpect(jsonPath("$.submitterVerification").value("EMAIL"))
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));
    }

    @Test
    void anUnverifiedRowStaysUnverifiedAfterTheAuthorErasesTheAccount() throws Exception {
        // The author verified at write time (submission requires one
        // channel) and then LOST it: the row reads unverified — no depth —
        // while the account is still active.
        Auth user = register("Vermata", "vermata-erasure@example.ee", "+3725006003", "vermata-pass");
        confirm(user, VerificationLevel.EMAIL);
        long rowId = submit(user, "Vermata Unverified Shelter");
        revoke(user, VerificationLevel.EMAIL);

        // The standing the row had while the account was ACTIVE: unverified
        // (no depth to report). The boolean keeps the write-time snapshot —
        // it says who the author WAS at the write; the pin's currency is
        // the depth, and that is absent.
        mvc.perform(get("/api/shelters/" + rowId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitterVerified").value(true))
                .andExpect(jsonPath("$.submitterVerification").doesNotExist())
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));

        mvc.perform(delete("/account").header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isNoContent());

        // The row is orphaned and survives the erasure…
        assertThat(shelters.findById(rowId)).isPresent();
        assertThat(shelters.findById(rowId).orElseThrow().getCreatedBy()).isNull();
        // …still unverified: erasure grants no standing and takes none away
        // from a row that had none at read time.
        mvc.perform(get("/api/shelters/" + rowId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitterVerified").value(true))
                .andExpect(jsonPath("$.submitterVerification").doesNotExist())
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));
    }
}
