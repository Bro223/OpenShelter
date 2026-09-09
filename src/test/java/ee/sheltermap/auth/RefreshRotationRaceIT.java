package ee.sheltermap.auth;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * S4 (2026-09-08 review, backend W3): the refresh-rotation TOCTOU. Two
 * threads redeem the SAME refresh token simultaneously; the atomic claim
 * (conditional {@code UPDATE ... WHERE revoked_at IS NULL}, row-lock
 * serialized) must let exactly one through — the other gets
 * {@link InvalidRefreshTokenException} (→ 401), and afterwards the user
 * holds exactly ONE active refresh token (the winner's new one).
 *
 * <p>Deliberately NOT {@code @Transactional}: the worker threads run in
 * their own transactions and need the user + issued token committed to be
 * visible, and the race's writes are meant to persist. A unique contact
 * keeps the committed rows from colliding with other ITs' fixtures.
 */
class RefreshRotationRaceIT extends AbstractPersistenceIT {

    @Autowired
    JwtTokenService tokens;

    @Autowired
    UserRepository users;

    @Autowired
    RefreshTokenRepository refreshTokens;

    @AfterEach
    void cleanUpCommittedRaceRows() {
        wipeAllTables();
    }

    @Test
    void concurrentDoubleRefreshRedeemsTheTokenExactlyOnce() throws Exception {
        RegisteredUser user = saveUser(users, "refresh-race@example.ee", "+37250007777");
        TokenResponse issued = tokens.issue(user);
        String refreshToken = issued.refreshToken();

        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<TokenResponse> first = pool.submit(raceRefresh(barrier, refreshToken));
            Future<TokenResponse> second = pool.submit(raceRefresh(barrier, refreshToken));

            long successes = 0;
            for (Future<TokenResponse> attempt : List.of(first, second)) {
                try {
                    TokenResponse won = attempt.get(30, TimeUnit.SECONDS);
                    successes++;
                    assertThat(won.refreshToken()).isNotEqualTo(refreshToken); // rotated
                } catch (java.util.concurrent.ExecutionException ex) {
                    assertThat(ex.getCause()).isInstanceOf(InvalidRefreshTokenException.class);
                }
            }
            assertThat(successes).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }

        // the presented token is dead, and exactly ONE new active token
        // exists for the user (no double rotation)
        assertThat(refreshTokens.findByTokenHash(Hashes.sha256Hex(refreshToken)).revokedAt()).isNotNull();
        assertThat(refreshTokens.countActiveByUserId(user.getId())).isEqualTo(1);
    }

    private java.util.concurrent.Callable<TokenResponse> raceRefresh(CyclicBarrier barrier, String token) {
        return () -> {
            barrier.await(30, TimeUnit.SECONDS);
            return tokens.refresh(token);
        };
    }
}
