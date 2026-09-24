package ee.sheltermap.api;

import ee.sheltermap.app.CommaSeparated;
import ee.sheltermap.app.LocationResolveException;
import ee.sheltermap.app.LocationResolveService;
import ee.sheltermap.app.LocationUpstreamException;
import ee.sheltermap.auth.ClientIps;
import ee.sheltermap.auth.RateLimitExceededException;
import ee.sheltermap.auth.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Objects;
import java.util.Set;

/**
 * Thin shell for the short-link resolver:
 * parse, validate, delegate, map.
 *
 * <p>{@code POST /api/geo/resolve} is JWT-protected (inside the
 * authenticated set — NOT permitAll) and rate-limited per client IP
 * (5 requests/minute) with the same token-bucket pattern as the auth
 * endpoints — keys via {@link ClientIps}, X-Forwarded-For aware. The
 * host whitelist, the ≤3-hop redirect walk and the bbox-gated
 * coordinate extraction live in {@link LocationResolveService}; this
 * class only maps its outcome to the 200/400/429/502 contract in the
 * OpenAPI annotations (one generic 400, one generic 502 — no
 * enumeration of the reason).
 */
@Tag(name = "Geo",
        description = "The short-link resolver (shelter-location-input). "
                + "JWT-protected (inside the authenticated set — NOT permitAll) "
                + "and rate-limited per client IP (5 requests/minute) — 429 "
                + "above it.")
@RestController
@RequestMapping(value = "/api/geo", produces = MediaType.APPLICATION_JSON_VALUE)
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
        this.trustedProxies = CommaSeparated.parseSet(trustedProxies);
    }

    @PostMapping("/resolve")
    @Operation(summary = "Resolve a maps short link to coordinates",
            description = "Resolves a maps.app.goo.gl short link: 200 "
                    + "{latitude, longitude} (the frontend contract); 400 ONE "
                    + "generic message — invalid input / no pair / outside "
                    + "Estonia (no enumeration); 429 — per-IP bucket empty; 502 "
                    + "ONE generic retry-later message — upstream "
                    + "timeout/network/server failure (no upstream detail).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The resolved "
                    + "coordinates", content = @Content(schema = @Schema(implementation =
                    LocationResolvedDto.class))),
            @ApiResponse(responseCode = "400", description = "One generic "
                    + "not-found message (no pair / outside Estonia / "
                    + "non-whitelisted host — the backend never enumerates)"),
            @ApiResponse(responseCode = "429", description = "Per-IP rate limit "
                    + "exceeded — Retry-After in seconds"),
            @ApiResponse(responseCode = "502", description = "One generic "
                    + "retry-later message — upstream failure (no upstream "
                    + "detail)")
    })
    public LocationResolvedDto resolve(@Valid @RequestBody LocationResolveRequest request,
                                       HttpServletRequest http) {
        RateLimiter.Result permit =
                geoResolveRateLimiter.tryAcquire(ClientIps.resolve(http, trustedProxies, trustLoopback));
        if (!permit.acquired()) {
            throw new RateLimitExceededException(permit.retryAfterSeconds());
        }
        return toResponse(resolveService.resolve(request.url()));
    }

    /** Maps the sealed outcome to the HTTP contract — the one generic 400
     *  and the one generic 502 (no enumeration of the reason). */
    private static LocationResolvedDto toResponse(LocationResolveService.Outcome outcome) {
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
