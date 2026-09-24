package ee.sheltermap.config;

import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.auth.InMemoryRefreshTokenRepository;
import ee.sheltermap.auth.JwtProperties;
import ee.sheltermap.auth.JwtTokenService;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.RegisteredUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit test for the JWT filter, whose three doors need a focused guard:
 * a valid token authenticates the user, an ADMIN account carries the
 * {@code ADMIN} authority the {@code /admin/**} matcher needs, and every
 * other input (suspended
 * account, expired token, malformed token, no header) leaves the request
 * anonymous so the entry point answers 401.
 *
 * <p>Hand-written fakes only — the project has no mocking framework. The real
 * {@link JwtTokenService} mints and parses the tokens (so the accept path
 * exercises jjwt itself, not a stub) and a fixed {@link Clock} makes expiry
 * deterministic.
 */
class JwtAuthenticationFilterTest {

    private static final Instant NOW = Instant.parse("2026-09-15T10:00:00Z");
    private static final String SECRET = "test-secret-at-least-32-bytes-long!!";
    private static final Duration ACCESS_TTL = Duration.ofMinutes(15);

    private InMemoryUserRepository users;
    private JwtTokenService tokens;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        users = new InMemoryUserRepository();
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        tokens = tokenServiceAt(clock);
        filter = new JwtAuthenticationFilter(tokens, users);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void validTokenAuthenticatesTheUserWithoutAuthorities() throws Exception {
        RegisteredUser user = saveUser("Mari", "mari@example.ee");

        MockFilterChain chain = runWith(filter, "Bearer " + tokens.issue(user).accessToken());

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).as("a valid token authenticates the caller").isNotNull();
        assertThat(authentication.getPrincipal()).isEqualTo(user.getId());
        assertThat(authentication.getAuthorities())
                .as("a regular user stays authority-free: /admin/** must answer 403 at the chain level")
                .isEmpty();
        assertThat(chain.getRequest()).as("the filter must always continue the chain").isNotNull();
    }

    @Test
    void adminTokenCarriesTheAdminAuthority() throws Exception {
        AdminUser admin = new AdminUser("Admin", "admin@example.ee", null);
        users.save(admin);

        runWith(filter, "Bearer " + tokens.issue(admin).accessToken());

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isEqualTo(admin.getId());
        assertThat(authentication.getAuthorities())
                .as("the fresh per-request isAdmin read is what grants the ADMIN authority (B6)")
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ADMIN");
    }

    @Test
    void suspendedAccountAuthenticatesNothing() throws Exception {
        RegisteredUser user = saveUser("Mari", "mari@example.ee");
        String token = tokens.issue(user).accessToken();
        user.suspend(NOW);

        MockFilterChain chain = runWith(filter, "Bearer " + token);

        assertThat(SecurityContextHolder.getContext().getAuthentication())
                .as("a valid token of a suspended account authenticates nothing")
                .isNull();
        assertThat(chain.getRequest()).as("the request still reaches the entry point (401)").isNotNull();
    }

    @Test
    void expiredTokenLeavesTheRequestAnonymous() throws Exception {
        RegisteredUser user = saveUser("Mari", "mari@example.ee");
        String token = tokens.issue(user).accessToken(); // exp = NOW + ACCESS_TTL

        // The same secret, a clock one hour later: the signature is fine, the
        // expiry is not — exactly the case the entry point must turn into 401.
        JwtAuthenticationFilter laterFilter = new JwtAuthenticationFilter(
                tokenServiceAt(Clock.fixed(NOW.plus(Duration.ofHours(1)), ZoneOffset.UTC)), users);

        runWith(laterFilter, "Bearer " + token);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void malformedTokenLeavesTheRequestAnonymous() throws Exception {
        runWith(filter, "Bearer not-a-jwt");

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void tokenSignedWithAnotherSecretLeavesTheRequestAnonymous() throws Exception {
        RegisteredUser user = saveUser("Mari", "mari@example.ee");
        String token = tokens.issue(user).accessToken();
        JwtTokenService otherSecret = new JwtTokenService(
                new JwtProperties("a-completely-different-secret-32-bytes!", ACCESS_TTL, Duration.ofDays(30)),
                Clock.fixed(NOW, ZoneOffset.UTC), new InMemoryRefreshTokenRepository(Clock.fixed(NOW, ZoneOffset.UTC)), users);

        runWith(new JwtAuthenticationFilter(otherSecret, users), "Bearer " + token);

        assertThat(SecurityContextHolder.getContext().getAuthentication())
                .as("a token signed with a different key must not authenticate")
                .isNull();
    }

    @Test
    void absentOrNonBearerHeaderStaysAnonymous() throws Exception {
        runWith(filter, null);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).as("no header").isNull();

        runWith(filter, "Basic dXNlcjpwYXNz");
        assertThat(SecurityContextHolder.getContext().getAuthentication())
                .as("a non-Bearer scheme is ignored")
                .isNull();
    }

    // ---------- helpers ----------

    private JwtTokenService tokenServiceAt(Clock clock) {
        return new JwtTokenService(
                new JwtProperties(SECRET, ACCESS_TTL, Duration.ofDays(30)),
                clock, new InMemoryRefreshTokenRepository(clock), users);
    }

    private RegisteredUser saveUser(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+37250000000");
        users.save(user);
        return user;
    }

    private MockFilterChain runWith(JwtAuthenticationFilter underTest, String authorization) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/shelters");
        if (authorization != null) {
            request.addHeader("Authorization", authorization);
        }
        MockFilterChain chain = new MockFilterChain();
        underTest.doFilterInternal(request, new MockHttpServletResponse(), chain);
        return chain;
    }
}
