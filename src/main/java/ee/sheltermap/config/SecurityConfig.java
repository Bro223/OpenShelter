package ee.sheltermap.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import ee.sheltermap.auth.JwtTokenService;
import ee.sheltermap.auth.RateLimiter;
import ee.sheltermap.auth.TokenBucketRateLimiter;
import ee.sheltermap.api.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

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
@EnableConfigurationProperties({JwtProperties.class, RateLimitProperties.class, VerificationProperties.class,
        ContactChangeProperties.class})
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
    public RateLimiter registerRateLimiter(RateLimitProperties properties) {
        return new TokenBucketRateLimiter(properties.registerCapacity(), properties.registerRefillPerSecond());
    }

    /**
     * Per-IP bucket on {@code POST /verify/request} (anti-spam, Twilio plan):
     * blocks one IP spraying many accounts, keyed via {@link ClientIps}
     * (X-Forwarded-For aware, trusted proxies only).
     */
    @Bean
    public RateLimiter verifyRateLimiter(RateLimitProperties properties) {
        return new TokenBucketRateLimiter(properties.verifyCapacity(), properties.verifyRefillPerSecond());
    }

    /**
     * Per-IP bucket on {@code POST /account/*-change/request} (contact-change
     * anti-spam): blocks one IP spraying change requests across accounts.
     */
    @Bean
    public RateLimiter changeRequestRateLimiter(RateLimitProperties properties) {
        return new TokenBucketRateLimiter(properties.changeCapacity(), properties.changeRefillPerSecond());
    }

    /**
     * CORS for the browser frontend (hardening pass). Allowed origins are
     * configurable via {@code app.cors.allowed-origins} (default local dev
     * origins). Preflight (OPTIONS) is handled by Spring Security's CORS
     * filter before authorization.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}") String allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtTokenService tokenService,
                                                   ObjectMapper objectMapper,
                                                   CorsConfigurationSource corsConfigurationSource) throws Exception {
        JwtAuthenticationFilter jwtFilter = new JwtAuthenticationFilter(tokenService);
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
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
                // Author-scoped (user-contributions): /mine lists the CALLER's shelters,
                // so it is NOT part of the public shelter GETs below.
                .requestMatchers(HttpMethod.GET, "/api/shelters/mine").authenticated()
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
