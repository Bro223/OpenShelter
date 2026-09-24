package ee.sheltermap.config;

import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.InvalidAccessTokenException;
import ee.sheltermap.auth.JwtTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Spring-side implementation of {@link JwtTokenService} validation.
 *
 * <p>Reads {@code Authorization: Bearer &lt;accessToken&gt;}, validates the
 * JWT and, on success, sets an {@link org.springframework.security.core.Authentication}
 * whose principal is the user id and whose authorities carry the single
 * {@code ADMIN} grant — ONLY from a fresh per-request, column-only
 * {@code UserRepository.isAdmin} read (never a token claim, never a blanket
 * grant): the {@code /admin/**} chain matcher
 * needs the authority, and a demoted admin loses it on the very next
 * request, like the suspension read below. Invalid/missing/expired tokens
 * leave the
 * request unauthenticated — the configured entry point then answers 401 on
 * protected routes. Not a {@code @Component} on purpose: it is registered
 * explicitly in the filter chain to avoid double execution as a servlet
 * filter.
 *
 * <p>Suspension: a VALID token
 * of a SUSPENDED account authenticates nothing — a fresh {@code
 * UserRepository.isSuspended} column-only read per token-bearing request
 * (the DB is the truth, never a token claim)
 * leaves the context empty, so the entry point answers 401 and the
 * suspension takes effect on the very next request. Column-only on purpose:
 * the filter runs on every token-bearing request and must not pay the
 * domain mapping (PII decrypt) or trip a demoted admin's null phone. A
 * DELETED account is the opposite case and keeps the erasure contract
 * — unknown ids answer false, the JWT stays
 * valid until expiry (the repeat DELETE /account stays a 204 no-op).
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService tokenService;
    private final UserRepository users;

    public JwtAuthenticationFilter(JwtTokenService tokenService, UserRepository users) {
        this.tokenService = tokenService;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Long userId = tokenService.validateAccessToken(token);
                // A suspended account's in-flight tokens die here: the fresh
                // column read, not the token, is the
                // truth (deleted accounts authenticate as before — false).
                if (userId != null && !users.isSuspended(userId)) {
                    // The /admin/** chain matcher
                    // needs the ADMIN authority — granted ONLY from this
                    // fresh per-request kind read (same column-only idiom
                    // as the isSuspended check above, never a token claim).
                    // Non-admins stay authority-free and hit the 403 at the
                    // chain level; the in-handler requireAdmin() re-checks
                    // stay the fresh-DB second line (and the audit actor).
                    List<GrantedAuthority> authorities = users.isAdmin(userId)
                            ? List.of(new SimpleGrantedAuthority("ADMIN"))
                            : List.of();
                    var authentication = new UsernamePasswordAuthenticationToken(userId, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (InvalidAccessTokenException ignored) {
                // invalid/expired token -> stay unauthenticated; entry point answers 401
            }
        }
        chain.doFilter(request, response);
    }
}
