package ee.sheltermap.auth;

import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The extracted authenticated-caller lookup (; moved here from
 * {@code ee.sheltermap.api} — the auth controllers consume it too): the
 * behaviours of {@link CurrentCaller} — the column-only id probe that
 * never throws, the id-only requirement (401, no row load), the full row
 * load (401 anonymous / 401 erased), and the vocabulary-neutral row load
 * the auth controllers remap to their own 400. The principal is the JWT's
 * user id ({@code Long}) in the {@link SecurityContextHolder}, the
 * {@code JwtAuthenticationFilter} convention.
 */
class CurrentCallerTest {

    private final UserRepository users = new InMemoryUserRepository();
    private final CurrentCaller caller = new CurrentCaller(users);

    private static final RegisteredUser ALICE =
            new RegisteredUser("Alice", "alice@example.com", "+3725001001");

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private static void authenticateAs(Long userId) {
        // The JWT filter's token shape: the user id as principal, no
        // authorities, no credentials.
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId, null, java.util.List.of()));
    }

    private static void authenticateAsAnonymous() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("anonymousUser", null, java.util.List.of()));
    }

    // -------------------------------------------------------- callerIdOrNull

    @Test
    void anAnonymousReadYieldsNullAndNeverThrows() {
        SecurityContextHolder.clearContext();
        assertThat(caller.callerIdOrNull()).isNull();
        authenticateAsAnonymous();
        assertThat(caller.callerIdOrNull()).isNull();
    }

    @Test
    void aTokenValidCallerYieldsTheCallerId() {
        users.save(ALICE);
        long id = ALICE.getId();
        authenticateAs(id);
        assertThat(caller.callerIdOrNull()).isEqualTo(id);
    }

    @Test
    void anErasedRowDegradesToTheGuestProjection() {
        // The erasure contract: a token-valid caller whose
        // row was deleted degrades to the null caller — the column-only
        // probe must not throw and must not pay the domain mapping.
        users.save(ALICE);
        long id = ALICE.getId();
        users.delete(id);
        authenticateAs(id);
        assertThat(caller.callerIdOrNull()).isNull();
    }

    // ----------------------------------------------------------- requireUserId

    @Test
    void anAnonymousRequireUserIdIsA401() {
        SecurityContextHolder.clearContext();
        assertThatThrownBy(caller::requireUserId)
                .isInstanceOf(InvalidAccessTokenException.class)
                .hasMessage("Authentication required");
        authenticateAsAnonymous();
        assertThatThrownBy(caller::requireUserId)
                .isInstanceOf(InvalidAccessTokenException.class)
                .hasMessage("Authentication required");
    }

    @Test
    void requireUserIdDoesNotLoadTheRow() {
        // id-only requirement: even an ERASED row yields its id here (the
        // row load and its 401 are requireUser's job) — the admin path
        // (requireAdmin) stays off the PII decrypt for a deleted account.
        users.save(ALICE);
        long id = ALICE.getId();
        users.delete(id);
        authenticateAs(id);
        assertThat(caller.requireUserId()).isEqualTo(id);
    }

    // ------------------------------------------------------------- requireUser

    @Test
    void anAnonymousRequireUserIsA401() {
        authenticateAsAnonymous();
        assertThatThrownBy(caller::requireUser)
                .isInstanceOf(InvalidAccessTokenException.class)
                .hasMessage("Authentication required");
    }

    @Test
    void aTokenValidCallerYieldsTheUserRow() {
        users.save(ALICE);
        long id = ALICE.getId();
        authenticateAs(id);
        User user = caller.requireUser();
        assertThat(user).isSameAs(ALICE);
    }

    @Test
    void anErasedRowIsA401UnknownUser() {
        users.save(ALICE);
        long id = ALICE.getId();
        users.delete(id);
        authenticateAs(id);
        assertThatThrownBy(caller::requireUser)
                .isInstanceOf(InvalidAccessTokenException.class)
                .hasMessage("Unknown user");
    }

    @Test
    void aNullRepositoryIsRefused() {
        assertThatThrownBy(() -> new CurrentCaller(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("userRepository");
    }

    // ------------------------------------------------ userOrNull / requireUser(id)

    @Test
    void userOrNullReturnsTheRowWithoutThrowing() {
        users.save(ALICE);
        long id = ALICE.getId();
        assertThat(caller.userOrNull(id)).isSameAs(ALICE);
    }

    @Test
    void userOrNullReturnsNullForAnErasedRow() {
        // The vocabulary-neutral half: the auth controllers map
        // this null to their own documented 400 — the primitive decides
        // nothing about the status.
        users.save(ALICE);
        long id = ALICE.getId();
        users.delete(id);
        assertThat(caller.userOrNull(id)).isNull();
    }

    @Test
    void requireUserByIdIsA401UnknownUserForAnErasedRow() {
        users.save(ALICE);
        long id = ALICE.getId();
        users.delete(id);
        assertThatThrownBy(() -> caller.requireUser(id))
                .isInstanceOf(InvalidAccessTokenException.class)
                .hasMessage("Unknown user");
    }

    @Test
    void requireUserByIdReturnsTheRow() {
        users.save(ALICE);
        long id = ALICE.getId();
        assertThat(caller.requireUser(id)).isSameAs(ALICE);
    }
}
