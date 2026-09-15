package ee.sheltermap.auth;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Objects;

/**
 * jjwt implementation of {@link TokenService}. Access tokens carry
 * {@code sub = userId} and {@code exp}; refresh tokens are opaque random
 * strings stored SHA-256-hashed so they can be revoked (logout, reset,
 * compromise). Refresh rotation revokes the presented token and issues a new
 * pair.
 */
@Service
public class JwtTokenService implements TokenService {

    private static final int REFRESH_TOKEN_LENGTH = 64;

    private final SecretKey key;
    private final JwtProperties properties;
    private final Clock clock;
    private final RefreshTokenRepository refreshTokens;
    private final UserRepository users;

    public JwtTokenService(JwtProperties properties, Clock clock,
                           RefreshTokenRepository refreshTokens, UserRepository users) {
        this.properties = Objects.requireNonNull(properties, "properties");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.refreshTokens = Objects.requireNonNull(refreshTokens, "refreshTokens");
        this.users = Objects.requireNonNull(users, "users");
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public TokenResponse issue(RegisteredUser user) {
        Objects.requireNonNull(user, "user");
        if (user.getId() == null) {
            throw new IllegalArgumentException("user must be persisted before issuing tokens");
        }
        Instant now = clock.instant();
        String accessToken = Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.accessTtl())))
                .signWith(key)
                .compact();

        String refreshToken = Tokens.random(REFRESH_TOKEN_LENGTH);
        refreshTokens.save(Hashes.sha256Hex(refreshToken), user.getId(), now.plus(properties.refreshTtl()));
        return new TokenResponse(accessToken, refreshToken, (int) properties.accessTtl().toSeconds());
    }

    @Override
    @Transactional
    public TokenResponse refresh(String refreshToken) {
        Objects.requireNonNull(refreshToken, "refreshToken");
        Instant now = clock.instant();
        String tokenHash = Hashes.sha256Hex(refreshToken);
        RefreshTokenRecord record = refreshTokens.findByTokenHash(tokenHash);
        if (record == null || record.revokedAt() != null || record.expiresAt().isBefore(now)) {
            throw new InvalidRefreshTokenException();
        }
        // Atomic claim: the conditional UPDATE (revoked_at IS NULL)
        // takes the row lock, so concurrent double-refreshes serialize —
        // exactly one racer claims the token (1 row), the losers see 0
        // rows and get the same generic 401. One transaction keeps the
        // claim + issue atomic.
        if (refreshTokens.revoke(tokenHash) == 0) {
            throw new InvalidRefreshTokenException();
        }
        User user = users.findById(record.userId());
        if (!(user instanceof RegisteredUser registered)) {
            throw new InvalidRefreshTokenException();
        }
        // Suspension: a suspended account cannot rotate — the
        // check is on the freshly loaded user (immediate, no token claim).
        // The refresh row was already claimed (revoke above), so the
        // suspended user's old refresh token is spent either way.
        if (registered.isSuspended()) {
            throw new SuspendedAccountException();
        }
        return issue(registered);
    }

    @Override
    public void revoke(String refreshToken) {
        if (refreshToken == null) {
            return;
        }
        refreshTokens.revoke(Hashes.sha256Hex(refreshToken));
    }

    @Override
    public Long validateAccessToken(String accessToken) {
        try {
            Claims claims = Jwts.parser()
                    .clock(() -> Date.from(clock.instant()))
                    .verifyWith(key).build()
                    .parseSignedClaims(accessToken).getPayload();
            return Long.valueOf(claims.getSubject());
        } catch (RuntimeException e) {
            throw new InvalidAccessTokenException(e);
        }
    }
}
