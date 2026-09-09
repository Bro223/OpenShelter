package ee.sheltermap.api;

import ee.sheltermap.app.LocationResolveException;
import ee.sheltermap.app.LocationResolveService;
import ee.sheltermap.app.LocationUpstreamException;
import ee.sheltermap.auth.ClientIps;
import ee.sheltermap.auth.RateLimitExceededException;
import ee.sheltermap.auth.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Thin shell for the short-link resolver (shelter-location-input):
 * parse, validate, delegate, map.
 *
 * <p>{@code POST /api/geo/resolve} is JWT-protected (inside the
 * authenticated set — NOT permitAll) and rate-limited per client IP
 * (5 requests/minute) with the same token-bucket pattern as the auth
 * endpoints — keys via {@link ClientIps}, X-Forwarded-For aware. The
 * host whitelist, the ≤3-hop redirect walk and the bbox-gated
 * coordinate extraction live in {@link LocationResolveService}; this
 * class only maps its outcome:
 * <ul>
 *   <li>200 {@code {latitude, longitude}} — the frontend contract;</li>
 *   <li>400 ONE generic message — invalid input / no pair / outside
 *       Estonia (no enumeration);</li>
 *   <li>429 — per-IP bucket empty;</li>
 *   <li>502 ONE generic retry-later message — upstream
 *       timeout/network/server failure (no upstream detail).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/geo")
public class LocationController {

    private final LocationResolveService resolveService;
    private final RateLimiter geoResolveRateLimiter;
    private final Set<String> trustedProxies;
    private final boolean trustLoopback;

    public LocationController(LocationResolveService resolveService,
                              @Qualifier("geoResolveRateLimiter") RateLimiter geoResolveRateLimiter,
                              @Value("${app.ratelimit.trusted-proxies:}") String trustedProxies,
                              @Value("${app.ratelimit.trust-loopback:true}") boolean trustLoopback) {
        this.resolveService = Objects.requireNonNull(resolveService, "resolveService");
        this.geoResolveRateLimiter = Objects.requireNonNull(geoResolveRateLimiter, "geoResolveRateLimiter");
        this.trustLoopback = trustLoopback;
        this.trustedProxies = Arrays.stream(trustedProxies.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    /** Resolves a {@code maps.app.goo.gl} short link to coordinates (see class docs). */
    @PostMapping("/resolve")
    public LocationResolvedDto resolve(@Valid @RequestBody LocationResolveRequest request,
                                       HttpServletRequest http) {
        if (!geoResolveRateLimiter.tryAcquire(ClientIps.resolve(http, trustedProxies, trustLoopback))) {
            throw new RateLimitExceededException();
        }
        LocationResolveService.Outcome outcome = resolveService.resolve(request.url());
        return switch (outcome) {
            case LocationResolveService.Outcome.Resolved resolved ->
                    new LocationResolvedDto(resolved.latitude(), resolved.longitude());
            case LocationResolveService.Outcome.NotFound ignored ->
                    throw new LocationResolveException("Could not find coordinates in the provided link");
            case LocationResolveService.Outcome.UpstreamFailure ignored ->
                    throw new LocationUpstreamException(
                            "Location resolution is temporarily unavailable, please retry later");
        };
    }
}
