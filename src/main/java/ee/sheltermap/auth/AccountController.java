package ee.sheltermap.auth;

import ee.sheltermap.app.CommaSeparated;
import ee.sheltermap.app.NotVerifiedException;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Objects;
import java.util.Set;

/**
 * Thin HTTP shell for the authenticated account surface (01-TASK.md §7 —
 * parse, validate, rate-limit, delegate):
 * <ul>
 *   <li>{@code GET /account/me} — the user's real profile + verified claims
 *       (the frontend's single source of truth for name/email/phone and
 *       verification labels)</li>
 *   <li>{@code PUT /account/profile} — password-confirmed edit of the name
 *       (no national ID code is collected anywhere — remove-national-id)</li>
 *   <li>{@code POST /account/email-change/request} — SMS code to the current
 *       phone (an email thief alone cannot change the email)</li>
 *   <li>{@code POST /account/phone-change/request} — email code to the current
 *       email (a lost/stolen phone alone cannot change the phone)</li>
 *   <li>confirm endpoints complete the change once the code is verified</li>
 *   <li>{@code GET /account/export} — the caller's own data (profile +
 *       shelters) as one JSON document (legal-recovery)</li>
 *   <li>{@code DELETE /account} — the account erasure (legal-recovery):
 *       purge the declared private homes, orphan the public community rows,
 *       cascade the rest via the DB FK policy (V14). The provisioned admin
 *       (kind ADMIN) is refused with 403 — de-provisioning is an operator
 *       action on the environment, not an in-app one</li>
 * </ul>
 *
 * <p>All endpoints require a Bearer JWT (default security rule). The user is
 * resolved from the token, never from the body. The change-request endpoints
 * are additionally throttled per client IP ({@link ClientIps},
 * X-Forwarded-For aware) — the confirm endpoints are code-verified and
 * attempt-limited instead, so they need no bucket; the profile read/edit are
 * cheap (no code issuance) and use the standard auth rule. The request
 * endpoints ack with {@link CodeSentDto} — the cooldown a client should
 * count down before resending.
 */
@Tag(name = "Account & verification",
        description = "The authenticated account surface — every operation "
                + "requires a Bearer JWT and the user is resolved from the token, "
                + "never from the body. The change-request endpoints are "
                + "additionally throttled per client IP (429 above); the confirms "
                + "are code-verified and attempt-limited instead. The request "
                + "endpoints ack with CodeSentDto — the cooldown a client should "
                + "count down before resending.")
@RestController
@RequestMapping(value = "/account", produces = MediaType.APPLICATION_JSON_VALUE)
public class AccountController {

    private final ContactChangeService contactChangeService;
    private final AccountService accountService;
    private final CurrentCaller currentCaller;
    private final RateLimiter changeRequestRateLimiter;
    private final ContactChangeProperties properties;
    private final Set<String> trustedProxies;
    private final boolean trustLoopback;

    public AccountController(ContactChangeService contactChangeService,
                             AccountService accountService,
                             UserRepository userRepository,
                             @Qualifier("changeRequestRateLimiter") RateLimiter changeRequestRateLimiter,
                             ContactChangeProperties properties,
                             @Value("${app.ratelimit.trusted-proxies:}") String trustedProxies,
                             @Value("${app.ratelimit.trust-loopback:true}") boolean trustLoopback) {
        this.contactChangeService = Objects.requireNonNull(contactChangeService, "contactChangeService");
        this.accountService = Objects.requireNonNull(accountService, "accountService");
        this.currentCaller = new CurrentCaller(userRepository);
        this.changeRequestRateLimiter = Objects.requireNonNull(changeRequestRateLimiter, "changeRequestRateLimiter");
        this.properties = Objects.requireNonNull(properties, "properties");
        this.trustLoopback = trustLoopback;
        this.trustedProxies = CommaSeparated.parseSet(trustedProxies);
    }

    /** The authenticated user's real profile + verified claims (no rate bucket — cheap read). */
    @GetMapping("/me")
    @Operation(summary = "The caller's profile + verified claims",
            description = "The user's real profile + REAL verification claims — the "
                    + "frontend's single source of truth for name/email/phone and "
                    + "verification labels. No rate bucket (cheap read).")
    @ApiResponse(responseCode = "200", description = "The profile", content = @Content(
            schema = @Schema(implementation = MeResponse.class)))
    public MeResponse me() {
        return accountService.profile(currentUser());
    }

    /**
     * Password-confirmed edit of the name. Wrong current password
     * → 401 (nothing updated); blank name → 400 (registration validations).
     */
    @PutMapping("/profile")
    @Operation(summary = "Edit the name (password-confirmed)",
            description = "Wrong current password → 401 (nothing updated); blank "
                    + "name → 400 (registration validations). No national ID code "
                    + "is collected anywhere.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The fresh profile", content =
                    @Content(schema = @Schema(implementation = MeResponse.class))),
            @ApiResponse(responseCode = "401", description = "Wrong current "
                    + "password (nothing updated)")
    })
    public MeResponse updateProfile(@Valid @RequestBody ProfileUpdateRequest body) {
        return accountService.updateProfile(currentUser(), body);
    }

    @PostMapping("/email-change/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Request an e-mail change",
            description = "SMS code to the current phone (an email thief alone "
                    + "cannot change the email). 202 + the resend-cooldown ack.")
    @ApiResponse(responseCode = "202", description = "Code sent — the ack carries "
            + "the resend cooldown in seconds", content = @Content(schema = @Schema(
            implementation = CodeSentDto.class)))
    public CodeSentDto requestEmailChange(@Valid @RequestBody ChangeEmailRequest body, HttpServletRequest http) {
        requireRate(http);
        contactChangeService.requestEmailChange(currentUser(), body.newEmail());
        return new CodeSentDto((int) properties.cooldownSeconds());
    }

    @PostMapping("/email-change/confirm")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Confirm the e-mail change",
            description = "Completes the change once the code is verified; a code "
                    + "failure is a 400.")
    @ApiResponse(responseCode = "200", description = "E-mail changed")
    public void confirmEmailChange(@Valid @RequestBody ConfirmChangeRequest body) {
        ContactChangeResult result = contactChangeService.confirmEmailChange(currentUser(), body.code());
        // The service RETURNS a code failure (its transaction has already
        // committed the failed-attempt increment); the 400 is thrown HERE,
        // after that commit.
        if (!result.ok()) {
            throw new InvalidContactChangeException(result.failureMessage());
        }
    }

    @PostMapping("/phone-change/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Request a phone change",
            description = "Email code to the current email (a lost/stolen phone "
                    + "alone cannot change the phone). 202 + the resend-cooldown "
                    + "ack.")
    @ApiResponse(responseCode = "202", description = "Code sent — the ack carries "
            + "the resend cooldown in seconds", content = @Content(schema = @Schema(
            implementation = CodeSentDto.class)))
    public CodeSentDto requestPhoneChange(@Valid @RequestBody ChangePhoneRequest body, HttpServletRequest http) {
        requireRate(http);
        contactChangeService.requestPhoneChange(currentUser(), body.newPhone());
        return new CodeSentDto((int) properties.cooldownSeconds());
    }

    @PostMapping("/phone-change/confirm")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Confirm the phone change",
            description = "Completes the change once the code is verified; a code "
                    + "failure is a 400.")
    @ApiResponse(responseCode = "200", description = "Phone changed")
    public void confirmPhoneChange(@Valid @RequestBody ConfirmChangeRequest body) {
        ContactChangeResult result = contactChangeService.confirmPhoneChange(currentUser(), body.code());
        if (!result.ok()) {
            throw new InvalidContactChangeException(result.failureMessage());
        }
    }

    /**
     * GET /account/export (legal-recovery) — the caller's own
     * data (profile + every author-scoped shelter row) as
     * one JSON document. Same auth rule as {@code /me} (valid JWT, user
     * from the token) and, like {@code /me}, no rate bucket (cheap read).
     * The frontend turns the body into a downloadable file.
     */
    @GetMapping("/export")
    @Operation(summary = "The caller's own data export",
            description = "The caller's own data (profile + every author-scoped "
                    + "shelter row) as one JSON document. Same auth rule as /me "
                    + "(valid JWT, user from the token) and, like /me, no rate "
                    + "bucket (cheap read). The frontend turns the body into a "
                    + "downloadable file.")
    @ApiResponse(responseCode = "200", description = "The data export document",
            content = @Content(schema = @Schema(implementation =
                    DataExportResponse.class)))
    public DataExportResponse dataExport() {
        return accountService.dataExport(currentUser());
    }

    /**
     * DELETE /account (legal-recovery) — the account erasure:
     * the declared private homes are purged, the public community rows are
     * orphaned (map data outlives accounts — V7), and the DB cascades
     * credentials, claims, pending changes, tokens and reports.
     * The verified-user gate matches the submission gates (403
     * without a claim); a repeat call is an idempotent no-op — the JWT is
     * valid until its expiry, but the account is already gone. The
     * provisioned admin (kind ADMIN) is refused with 403: the account is
     * the deployment's access path and de-provisioning removes the env
     * vars, not the row.
     */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Erase the account",
            description = "The account erasure: the declared private homes are "
                    + "purged, the public community rows are orphaned (map data "
                    + "outlives accounts), and the DB cascades credentials, "
                    + "claims, pending changes, tokens and reports. The "
                    + "verified-user gate matches the submission gates (403 "
                    + "without a claim); a repeat call is an idempotent no-op — "
                    + "the JWT is valid until its expiry, but the account is "
                    + "already gone. The environment-provisioned administrator "
                    + "(kind ADMIN) is refused with 403 naming the environment "
                    + "provisioning — de-provisioning is an operator action on "
                    + "the env vars, not an in-app deletion.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "The account is "
                    + "erased (an idempotent no-op on a repeat call)"),
            @ApiResponse(responseCode = "403", description = "No verification "
                    + "claim — or the environment-provisioned administrator "
                    + "account (refused; the message names the env provisioning)")
    })
    public void deleteAccount() {
        long userId = currentCaller.requireUserId();
        if (!(currentCaller.userOrNull(userId) instanceof RegisteredUser registered)) {
            return; // already erased — idempotent no-op
        }
        if (!registered.canWrite()) {
            throw new NotVerifiedException(AccountService.DELETE_ACCOUNT_MESSAGE);
        }
        accountService.deleteAccount(registered);
    }

    private void requireRate(HttpServletRequest http) {
        RateLimiter.Result result = changeRequestRateLimiter.tryAcquire(ClientIps.resolve(http, trustedProxies, trustLoopback));
        if (!result.acquired()) {
            throw new RateLimitExceededException(result.retryAfterSeconds());
        }
    }

    private RegisteredUser currentUser() {
        long userId = currentCaller.requireUserId();
        if (!(currentCaller.userOrNull(userId) instanceof RegisteredUser registered)) {
            throw new InvalidContactChangeException("Account not found");
        }
        return registered;
    }
}
