package ee.sheltermap.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import ee.sheltermap.auth.JwtTokenService;
import ee.sheltermap.auth.RateLimiter;
import ee.sheltermap.auth.TokenBucketRateLimiter;
import ee.sheltermap.api.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;

/**
 * Spring Security wiring (Step 4).
 *
 * <p>Stateless JWT sessions: the auth endpoints and the public shelter/review
 * GETs are permit-all, everything else requires a valid access token (via
 * {@link JwtAuthenticationFilter}). Unauthenticated requests on protected
 * routes get 401, authenticated-but-forbidden 403.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties({JwtProperties.class, RateLimitProperties.class})
public class SecurityConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    @Bean
    public RateLimiter loginRateLimiter(RateLimitProperties properties) {
        return new TokenBucketRateLimiter(properties.loginCapacity(), properties.loginRefillPerSecond());
    }

    @Bean
    public RateLimiter resetRateLimiter(RateLimitProperties properties) {
        return new TokenBucketRateLimiter(properties.resetCapacity(), properties.resetRefillPerSecond());
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtTokenService tokenService,
                                                   ObjectMapper objectMapper) throws Exception {
        JwtAuthenticationFilter jwtFilter = new JwtAuthenticationFilter(tokenService);
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(eh -> eh
                .authenticationEntryPoint((request, response, ex) ->
                        writeError(objectMapper, response, request, HttpStatus.UNAUTHORIZED, "authentication required"))
                .accessDeniedHandler((request, response, ex) ->
                        writeError(objectMapper, response, request, HttpStatus.FORBIDDEN, "access denied")))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST,
                        "/auth/register", "/auth/login", "/auth/refresh", "/auth/logout",
                        "/auth/password-reset/request", "/auth/password-reset/confirm").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/shelters/**", "/api/reviews/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private static void writeError(ObjectMapper objectMapper, HttpServletResponse response,
                                   HttpServletRequest request, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), new ErrorResponse(
                Instant.now(), status.value(), status.getReasonPhrase(), message, request.getRequestURI()));
    }
}
