package ee.sheltermap.auth;

import ee.sheltermap.auth.JwtTokenService;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The refresh-rotation TOCTOU: two
 * threads redeem the SAME refresh token simultaneously; the atomic claim
 * (conditional {@code UPDATE ... WHERE revoked_at IS NULL}, row-lock
 * serialized) must let exactly one through — the other gets
 * {@link InvalidRefreshTokenException} (→ 401), and afterwards the user
 * holds exactly ONE live refresh token (the winner's new one).
 *
 * <p>The surviving-session half is asserted through the PRODUCTION rotation
 * path ({@link TokenService#refresh}), not a repository read: the presented
 * token is refused, the winner's rotated token rotates on, and the token it
 * replaced is refused in turn — at no point is a second, independently
 * redeemable token left behind. The "exactly one" direction is carried by
 * the single winner above: a double rotation would show up as a second
 * successful redemption, and a token issued outside the claim would have no
 * redeemable hash at all.
 *
 * <p>Deliberately NOT {@code @Transactional}: the worker threads run in
 * their own transactions and need the user + issued token committed to be
 * visible, and the race's writes are meant to persist. A unique contact
 * keeps the committed rows from colliding with other ITs' fixtures.
 * {@link #cleanUpCommittedRaceRows()} removes only THIS class' own user
 * afterwards (the base cleanup contract) — the shared database keeps
 * everyone else's state, provisioned admin rows included.
 */
class RefreshRotationRaceIT extends AbstractPersistenceIT {

    @Autowired
    JwtTokenService tokens;

    @Autowired
    UserRepository users;

    @Autowired
    RefreshTokenRepository refreshTokens;

    @Autowired
    JdbcTemplate jdbc;

    /** This test's own committed user (the cleanup deletes it + its tokens). */
    private long ownUserId;

    @AfterEach
    void cleanUpCommittedRaceRows() {
        // Scoped (base cleanup contract): refresh_tokens cascade from users.
        jdbc.update("DELETE FROM users WHERE id = ?", ownUserId);
    }

    @Test
    void concurrentDoubleRefreshRedeemsTheTokenExactlyOnce() throws Exception {
        RegisteredUser user = saveUser(users, "refresh-race@example.ee", "+37250007777");
        ownUserId = user.getId();
        TokenResponse issued = tokens.issue(user);
        String refreshToken = issued.refreshToken();

        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        TokenResponse remembered = null;
        try {
            Future<TokenResponse> first = pool.submit(raceRefresh(barrier, refreshToken));
            Future<TokenResponse> second = pool.submit(raceRefresh(barrier, refreshToken));

            long successes = 0;
            for (Future<TokenResponse> attempt : List.of(first, second)) {
                try {
                    TokenResponse won = attempt.get(30, TimeUnit.SECONDS);
                    successes++;
                    remembered = won;
                    assertThat(won.refreshToken()).isNotEqualTo(refreshToken); // rotated
                } catch (java.util.concurrent.ExecutionException ex) {
                    assertThat(ex.getCause()).isInstanceOf(InvalidRefreshTokenException.class);
                }
            }
            assertThat(successes).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
        final TokenResponse winner = remembered;
        assertThat(winner).isNotNull();

        // the presented token is dead (its row is revoked) ...
        assertThat(refreshTokens.findByTokenHash(Hashes.sha256Hex(refreshToken)).revokedAt()).isNotNull();
        assertThatThrownBy(() -> tokens.refresh(refreshToken))
                .isInstanceOf(InvalidRefreshTokenException.class);

        // ... the ONE surviving session is the winner's rotated token, and
        // redeeming it spends it in turn: the user never ends up with two
        // independently redeemable tokens
        TokenResponse rotated = tokens.refresh(winner.refreshToken());
        assertThat(rotated.refreshToken()).isNotEqualTo(winner.refreshToken());
        assertThatThrownBy(() -> tokens.refresh(winner.refreshToken()))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    private java.util.concurrent.Callable<TokenResponse> raceRefresh(CyclicBarrier barrier, String token) {
        return () -> {
            barrier.await(30, TimeUnit.SECONDS);
            return tokens.refresh(token);
        };
    }
}
