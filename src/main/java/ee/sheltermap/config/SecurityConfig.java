package ee.sheltermap.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import ee.sheltermap.alerts.ThrottleAlertRecorder;
import ee.sheltermap.api.ErrorResponse;
import ee.sheltermap.app.ReportProperties;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.ContactChangeProperties;
import ee.sheltermap.auth.JwtProperties;
import ee.sheltermap.auth.JwtTokenService;
import ee.sheltermap.auth.RateLimiter;
import ee.sheltermap.auth.TokenBucketRateLimiter;
import ee.sheltermap.verification.RollingContactOtpLimiter;
import ee.sheltermap.verification.VerificationProperties;
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
import java.time.Duration;
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
        ContactChangeProperties.class, ReportProperties.class})
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

    /**
     * Aggregate per-IP bucket on {@code POST /auth/login} (2026-09-08 review
     * W5): blocks one IP hammering many accounts (credential stuffing) even
     * though each per-contact bucket stays under its own limit. Both this
     * and {@link #loginRateLimiter} must pass for a login to proceed.
     */
    @Bean
    public RateLimiter loginIpRateLimiter(RateLimitProperties properties) {
        return new TokenBucketRateLimiter(properties.loginIpCapacity(), properties.loginIpRefillPerSecond());
    }

    @Bean
    public RateLimiter resetRateLimiter(RateLimitProperties properties) {
        return new TokenBucketRateLimiter(properties.resetCapacity(), properties.resetRefillPerSecond());
    }

    /**
     * Per-(IP, e-mail) bucket on {@code POST /auth/password-reset/confirm}
     * (2026-09-08 review W1): a 6-digit code is guessable, so the confirm
     * path is rate-limited independently of the reset-request bucket.
     */
    @Bean
    public RateLimiter resetConfirmRateLimiter(RateLimitProperties properties) {
        return new TokenBucketRateLimiter(properties.resetConfirmCapacity(), properties.resetConfirmRefillPerSecond());
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
     * Rolling per-contact OTP cap (abuse-limits M3 slice 2): max OTP events
     * (a real code send, or a registration attempt) per normalized e-mail /
     * E.164 phone within a rolling window, across users — the volume valve
     * on Twilio/SMTP cost on top of the per-(user, level) throttle. Binds
     * {@code app.limits.otp-per-contact-*} ({@code max <= 0} disables).
     */
    @Bean
    public RollingContactOtpLimiter rollingContactOtpLimiter(
            @Value("${app.limits.otp-per-contact-max:5}") int maxPerWindow,
            @Value("${app.limits.otp-per-contact-window-hours:24}") int windowHours,
            Clock clock) {
        return new RollingContactOtpLimiter(maxPerWindow, Duration.ofHours(windowHours), clock);
    }

    /**
     * The admin alert ring (abuse-limits M3 slice 4): the M3 cap +
     * duplicate detectors append their throttled (429) and repeat-report
     * (409) events here; {@code GET /admin/alerts} reads it newest first.
     * In-memory, same single-instance constraint (W16) as the limiters;
     * {@code retained <= 0} disables recording.
     */
    @Bean
    public ThrottleAlertRecorder throttleAlertRecorder(
            @Value("${app.limits.alerts-retained:200}") int retained) {
        return new ThrottleAlertRecorder(retained);
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
     * Per-IP bucket on {@code POST /api/geo/resolve} (short-link resolver,
     * shelter-location-input): every call is a server-side HTTP fetch, so the
     * bucket is the abuse valve — 5 requests, refill ~1/min (5/min effective).
     */
    @Bean
    public RateLimiter geoResolveRateLimiter(RateLimitProperties properties) {
        return new TokenBucketRateLimiter(properties.geoResolveCapacity(), properties.geoResolveRefillPerSecond());
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
                                                   UserRepository userRepository,
                                                   ObjectMapper objectMapper,
                                                   CorsConfigurationSource corsConfigurationSource) throws Exception {
        // M3 slice 5: the hardening headers go BEFORE the JWT filter (the
        // same reference position, registered first = runs first), so the
        // headers are present on the 401/403 error bodies too — the entry
        // point writes those after both filters have run.
        SecurityHeadersFilter headersFilter = new SecurityHeadersFilter();
        JwtAuthenticationFilter jwtFilter = new JwtAuthenticationFilter(tokenService, userRepository);
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(eh -> eh
                .authenticationEntryPoint((request, response, ex) ->
                        writeError(objectMapper, response, request, HttpStatus.UNAUTHORIZED, "Authentication required"))
                .accessDeniedHandler((request, response, ex) ->
                        writeError(objectMapper, response, request, HttpStatus.FORBIDDEN, "Access denied")))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST,
                        "/auth/register", "/auth/login", "/auth/refresh", "/auth/logout",
                        "/auth/password-reset/request", "/auth/password-reset/confirm").permitAll()
                // Author-scoped (user-contributions): /mine lists the CALLER's shelters,
                // so it is NOT part of the public shelter GETs below.
                .requestMatchers(HttpMethod.GET, "/api/shelters/mine").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/shelters/**").permitAll()
                // Public provenance read (official-dataset-csv M5): the app-wide
                // footer shows source + official link + last import to everyone.
                .requestMatchers(HttpMethod.GET, "/api/data-source").permitAll()
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(headersFilter, UsernamePasswordAuthenticationFilter.class)
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
