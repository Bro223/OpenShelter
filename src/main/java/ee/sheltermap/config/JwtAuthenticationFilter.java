package ee.sheltermap.config;

import ee.sheltermap.auth.InvalidAccessTokenException;
import ee.sheltermap.auth.JwtTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Spring-side implementation of {@link JwtTokenService} validation (Step 4).
 *
 * <p>Reads {@code Authorization: Bearer &lt;accessToken&gt;}, validates the
 * JWT and, on success, sets an {@link org.springframework.security.core.Authentication}
 * whose principal is the user id. Invalid/missing/expired tokens leave the
 * request unauthenticated — the configured entry point then answers 401 on
 * protected routes. Not a {@code @Component} on purpose: it is registered
 * explicitly in the filter chain to avoid double execution as a servlet filter.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService tokenService;

    public JwtAuthenticationFilter(JwtTokenService tokenService) {
        this.tokenService = tokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Long userId = tokenService.validateAccessToken(token);
                if (userId != null) {
                    var authentication = new UsernamePasswordAuthenticationToken(userId, null, List.of());
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (InvalidAccessTokenException ignored) {
                // invalid/expired token -> stay unauthenticated; entry point answers 401
            }
        }
        chain.doFilter(request, response);
    }
}
