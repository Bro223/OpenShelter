package ee.sheltermap.api;

import ee.sheltermap.alerts.ThrottleAlertRecorder;
import ee.sheltermap.domain.ShelterStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * The admin moderation API — thin shell: parse,
 * validate, authorize, delegate to {@link AdminModerationService}.
 *
 * <p>Authorization: a FRESH user lookup per request — the JWT's
 * userId is loaded and its kind checked, never a role claim in the token.
 * A JWT minted before a demotion/deletion keeps failing the instant the
 * kind changes. Anonymous callers never reach the guard: {@code /admin/**}
 * requires a valid access token (default security rule) and the entry
 * point answers 401 first; the guard's own 401 branch is the same fallback
 * convention as the other controllers. The guard itself is the shared
 * {@link AdminAccess#requireAdmin()} — one implementation for the whole
 * admin surface.
 *
 * <p>Surface: shelter list (all statuses, filters, search), manual
 * hide/restore (restore disarms auto-hide and reverts a REJECTED row
 * to NEW), hard delete (USER rows only — registry rows are import-
 * owned, 409), the shelter-report queue with idempotent dismiss, the
 * community
 * review decisions (CONFIRM/REJECT — the rare manual override), the
 * moderation audit trail, and the throttle-abuse alerts (the
 * in-memory ring the caps + duplicate detector append to). All
 * writes are single-row; no bulk endpoints. Reporter identity is
 * served from this API ONLY.
 */
@Tag(name = "Admin moderation",
        description = "Every operation requires a valid Bearer JWT AND an "
                + "ADMIN-kind account, checked by a fresh per-request DB lookup — "
                + "the JWT's userId is loaded and its kind checked, never a role "
                + "claim in the token (a JWT minted before a demotion/deletion "
                + "keeps failing). Anonymous → 401; authenticated non-admin → "
                + "403 (the x-admin-only extension marks these operations "
                + "machine-readably). Reporter identity is served from this API "
                + "ONLY.")
@RestController
@RequestMapping(value = "/admin", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminController {

    /** {@code GET /admin/alerts} defaults: newest 50, max {@link Pagination#MAX_PAGE_SIZE}. */
    private static final int ALERTS_DEFAULT_LIMIT = 50;

    private final AdminModerationService moderation;
    private final AdminAccess adminAccess;
    private final ThrottleAlertRecorder alerts;

    public AdminController(AdminModerationService moderation, AdminAccess adminAccess,
                           ThrottleAlertRecorder alerts) {
        this.moderation = moderation;
        this.adminAccess = adminAccess;
        this.alerts = alerts;
    }

    /** The paged-list response: the page's rows, the un-paged total as {@code X-Total-Count}. */
    private static <T> ResponseEntity<List<T>> pagedResponse(Pagination.Paged<T> paged) {
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(paged.total()))
                .body(paged.rows());
    }

    /**
     * The admin shelter list: every shelter including hidden, with
     * report counts, status flag, occupancy and the
     * submitter's name; {@code status} exact-match filter, {@code source}
     * the group filter (REGISTRY / USER / ALL), {@code q} the
     * case-insensitive name/address substring. Optional
     * {@code limit} (1..200) / {@code offset} (>= 0) slice the (filtered)
     * list in its stored id order — the same bounds vocabulary as
     * {@code GET /api/guidance}; the {@code X-Total-Count} response header
     * is the filter length WITHOUT paging (always present).
     */
    @GetMapping("/shelters")
    @Operation(summary = "The admin shelter list",
            description = "Every shelter including hidden, with report counts, "
                    + "status flag, occupancy and the submitter's name. "
                    + "status the exact-match filter, source the group filter "
                    + "(REGISTRY = Päästeamet + municipality imports, USER = "
                    + "user submissions, ALL = everything), q the "
                    + "case-insensitive name/address substring. Optional limit "
                    + "(1..200) / offset (>= 0) slice the (filtered) list; the "
                    + "X-Total-Count response header is the filter length "
                    + "WITHOUT paging (always present).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The shelter rows "
                    + "(including hidden), search-filtered and paged when "
                    + "q/limit/offset are given", headers = {
                    @Header(name = "X-Total-Count",
                            description = "The number of shelters in the "
                                    + "(filtered) scope WITHOUT the paging "
                                    + "applied.",
                            schema = @Schema(type = "integer", format = "int32"))
            }, content = @Content(array = @ArraySchema(
                    schema = @Schema(implementation = AdminShelterDto.class)))),
            @ApiResponse(responseCode = "400", description = "A limit outside 1..200, "
                    + "or a negative offset",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Authenticated "
                    + "non-admin")
    })
    public ResponseEntity<List<AdminShelterDto>> listShelters(
            @Parameter(description = "Exact status match (optional).")
            @RequestParam(required = false) ShelterStatus status,
            @Parameter(description = "Source filter (optional): REGISTRY (the "
                    + "Päästeamet + municipality imports) or USER (user "
                    + "submissions) — the same grouping as the public "
                    + "list.")
            @RequestParam(required = false) ShelterSourceFilter source,
            @Parameter(description = "Case-insensitive name/address substring "
                    + "(optional).")
            @RequestParam(required = false) String q,
            @Parameter(description = "Optional page size: 1..200; absent = no "
                    + "paging (the whole filtered list).")
            @RequestParam(required = false) Integer limit,
            @Parameter(description = "Optional offset into the (filtered) list: "
                    + ">= 0; past the end answers an empty array.")
            @RequestParam(required = false) Integer offset) {
        adminAccess.requireAdmin();
        // The bounds are checked BEFORE the read: a rejected page never pays
        // for the (filtered) list load. The filters and the slice run in SQL,
        // the batches over the page's ids only, and the total is the count
        // twin — the filtered length WITHOUT paging (the paging ITs pin it).
        Pagination.requireLimit(limit);
        Pagination.requireOffset(offset);
        return pagedResponse(moderation.listShelters(status, source, q, limit, offset));
    }

    /** Manual hide/restore; a restore disarms auto-hide. 204; 404 unknown; 409 registry rows. */
    @PostMapping("/shelters/{id}/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Manual hide/restore of a shelter",
            description = "204; 404 unknown; 409 registry rows (import-owned). A "
                    + "restore disarms auto-hide.")
    public void setShelterStatus(@PathVariable long id,
                                 @Valid @RequestBody AdminShelterStatusRequest request) {
        moderation.setShelterStatus(adminAccess.requireAdmin(), id, request.status());
    }

    /** Hard delete of a USER shelter (cascade). 204; 404 unknown; 409 registry rows. */
    @DeleteMapping("/shelters/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Hard delete of a USER shelter",
            description = "204; 404 unknown; 409 registry rows (import-owned). "
                    + "USER rows only — reports and occupancy cascade.")
    public void deleteShelter(@PathVariable long id) {
        moderation.deleteShelter(adminAccess.requireAdmin(), id);
    }

    /**
     * The shelter's edit history, ascending: CREATED / EDITED
     * (server-parsed field changes) / DELETED, with snapshot names and
     * batched actor names. 404 only when the shelter is absent AND has no
     * history rows (a deleted shelter's history still serves — the
     * dangling shelter_id); registry import rows answer an empty list
     * (they keep their own data_imports audit).
     */
    @GetMapping("/shelters/{id}/history")
    @Operation(summary = "The shelter's edit history",
            description = "Ascending over the row's lifecycle: CREATED / EDITED "
                    + "(server-parsed field changes) / DELETED, with snapshot "
                    + "names and batched actor names. 404 only when the shelter "
                    + "is absent AND has no history rows (a deleted shelter's "
                    + "history still serves — the dangling shelter_id); registry "
                    + "import rows answer an empty list (they keep their own "
                    + "data_imports audit).")
    @ApiResponse(responseCode = "200", description = "The history rows (ascending)",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation =
                    AdminShelterHistoryDto.class))))
    public List<AdminShelterHistoryDto> shelterHistory(@PathVariable long id) {
        adminAccess.requireAdmin();
        return moderation.shelterHistory(id);
    }

    /**
     * The moderator→submitter information request: stores the
     * question on the shelter; the submitter sees it on their own row and
     * answers once — the admin sees the request with the reply on the
     * shelter list. 204; 404 unknown shelter; 409 registry rows
     * (import-owned) and a second request for the same row (one exchange
     * per shelter — the replied row is kept).
     */
    @PostMapping("/shelters/{id}/request-info")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "The moderator→submitter information request",
            description = "Stores the question on the shelter; the submitter sees "
                    + "it on their own row and answers once — the admin sees the "
                    + "request with the reply on the shelter list. 204; 404 "
                    + "unknown shelter; 409 registry rows (import-owned) and a "
                    + "second request for the same row (one exchange per shelter — "
                    + "the replied row is kept).")
    public void requestInfo(@PathVariable long id,
                            @Valid @RequestBody AdminInfoRequestRequest request) {
        moderation.requestInfo(adminAccess.requireAdmin(), id, request.message());
    }

    /**
     * Mark a USER shelter inaccurate: the row stays visible,
     * the public DTOs carry {@code inaccurate: true} and the UI renders the
     * warning. Optional reason rides on the audit row. 204 (idempotent);
     * 404 unknown shelter; 409 registry rows (import-owned).
     */
    @PostMapping("/shelters/{id}/mark-inaccurate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark a USER shelter inaccurate",
            description = "The row stays visible, the public DTOs carry "
                    + "inaccurate: true and the UI renders the warning. Optional "
                    + "reason rides on the audit row. 204 (idempotent); 404 "
                    + "unknown shelter; 409 registry rows (import-owned).")
    public void markInaccurate(@PathVariable long id,
                               @Valid @RequestBody(required = false) AdminMarkInaccurateRequest request) {
        moderation.markInaccurate(adminAccess.requireAdmin(), id,
                request == null ? null : request.reason());
    }

    /** Clear the inaccurate mark — idempotent, audited. 204; 404; 409. */
    @PostMapping("/shelters/{id}/clear-inaccurate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Clear the inaccurate mark",
            description = "Idempotent, audited. 204; 404 unknown shelter; 409 "
                    + "registry rows.")
    public void clearInaccurate(@PathVariable long id) {
        moderation.clearInaccurate(adminAccess.requireAdmin(), id);
    }

    /**
     * The community review decision (community-review-queue v2) —
     * the rare manual override: CONFIRM promotes the row to CONFIRMED
     * (status untouched, note cleared); REJECT hides it (REJECTED +
     * INACTIVE, reason stored as the note). 200 {"ok":true}; 404
     * unknown shelter; 409 registry rows (import-owned, same guard as
     * the other admin writes).
     */
    @PostMapping("/shelters/{id}/review")
    @Operation(summary = "The community review decision (manual override)",
            description = "The rare manual override: CONFIRM promotes the row to "
                    + "CONFIRMED (status untouched, note cleared); REJECT hides it "
                    + "(REJECTED + INACTIVE, reason stored as the note). 200 "
                    + "{\"ok\":true}; 404 unknown shelter; 409 registry rows "
                    + "(import-owned, same guard as the other admin writes).")
    @ApiResponse(responseCode = "200", description = "{\"ok\": true}")
    public Map<String, Boolean> reviewShelter(@PathVariable long id,
                                              @Valid @RequestBody AdminShelterReviewRequest request) {
        moderation.reviewShelter(adminAccess.requireAdmin(), id, request.action(), request.reason());
        return Map.of("ok", true);
    }

    /**
     * The moderation audit trail, newest first (community-review-queue
     * v2): every moderation-relevant action (admin AND automatic
     * AUTO_CONFIRM) with the shelter name resolved at read time
     * ("Deleted shelter" once the row is gone). {@code limit} is
     * 1..200, default 100 (anything else 400); {@code offset} is the
     * non-negative page start and the {@code X-Total-Count} header
     * is the trail's length WITHOUT paging (always present).
     */
    @GetMapping("/audit")
    @Operation(summary = "The moderation audit trail",
            description = "Newest first: every moderation-relevant action (admin "
                    + "AND automatic AUTO_CONFIRM) with the shelter name resolved "
                    + "at read time (\"Deleted shelter\" once the row is gone). "
                    + "limit is 1..200, default 100 (anything else 400); offset "
                    + "(>= 0) is the page start; the X-Total-Count response "
                    + "header is the trail's length WITHOUT paging (always "
                    + "present).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The audit rows "
                    + "(newest first)", headers = {
                    @Header(name = "X-Total-Count",
                            description = "The audit trail's row count WITHOUT "
                                    + "the paging applied (always present).",
                            schema = @Schema(type = "integer", format = "int32"))
            }, content = @Content(array = @ArraySchema(
                    schema = @Schema(implementation = AdminAuditDto.class)))),
            @ApiResponse(responseCode = "400", description = "limit outside 1..200, "
                    + "or a negative offset")
    })
    public ResponseEntity<List<AdminAuditDto>> listAudit(
            @Parameter(description = "Rows to return, 1..200 (default 100; "
                    + "anything else 400).")
            @RequestParam(required = false) Integer limit,
            @Parameter(description = "Optional offset into the trail: >= 0; "
                    + "past the end answers an empty array.")
            @RequestParam(required = false) Integer offset) {
        adminAccess.requireAdmin();
        // The bounds are checked BEFORE the read (the shared paging rule).
        Pagination.requireOffset(offset);
        return pagedResponse(moderation.listAudit(limit, offset));
    }

    /**
     * The throttle-abuse alerts, newest first:
     * the daily submission cap (429), the per-contact OTP cap (429) and the
     * near-duplicate rejection (409). The ring is IN-MEMORY (it
     * clears on a backend restart), so this is a triage view, not a durable
     * log. {@code limit} is 1..200, default 50 (anything else 400 — same
     * idiom as {@code /admin/audit}).
     */
    @GetMapping("/alerts")
    @Operation(summary = "The throttle-abuse alerts",
            description = "Newest first: the daily submission cap (429), the "
                    + "per-contact OTP cap (429) and the near-duplicate rejection "
                    + "(409). The ring is IN-MEMORY — it clears on a backend "
                    + "restart, so this is a triage view, not a durable log. "
                    + "limit is 1..200, default 50 (anything else 400 — same "
                    + "idiom as /admin/audit).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The alert rows "
                    + "(newest first)", content = @Content(array = @ArraySchema(
                    schema = @Schema(implementation = AdminAlertDto.class)))),
            @ApiResponse(responseCode = "400", description = "limit outside 1..200")
    })
    public List<AdminAlertDto> listAlerts(
            @Parameter(description = "Rows to return, 1..200 (default 50; "
                    + "anything else 400).")
            @RequestParam(required = false) Integer limit) {
        adminAccess.requireAdmin();
        int size = Pagination.requireDefaultedLimit(limit, ALERTS_DEFAULT_LIMIT);
        return alerts.recent(size).stream()
                .map(a -> new AdminAlertDto(a.id(), a.kind(), a.subject(), a.detail(),
                        a.retryAfterSeconds(), a.at()))
                .toList();
    }

    /**
     * The shelter report queue, newest first (optional shelter filter).
     * {@code limit} is 1..200, default 100 (anything else 400) — the same
     * bound as {@code /admin/audit}; {@code offset} is the non-negative
     * page start and the {@code X-Total-Count} header is the
     * queue's length WITHOUT paging (always present). The queue's table
     * is append-only, so the read is paged in SQL. {@code excludeDismissed}
     * is the moderator's hide-dismissed filter: absent/{@code false}
     * renders EVERYTHING (nothing hidden silently — the dismissed rows
     * stay in, dimmed); {@code true} renders the OPEN reports only (the
     * resolved verdicts out — the scope the pin counts express).
     */
    @GetMapping("/reports")
    @Operation(summary = "The shelter report queue",
            description = "Newest first; optional shelterId narrows to one "
                    + "shelter. Carries the reporter's profile name + email — "
                    + "admin-only data, served from /admin/* only. limit is "
                    + "1..200, default 100 (anything else 400); offset (>= 0) "
                    + "is the page start; the X-Total-Count response header is "
                    + "the queue's length WITHOUT paging (always present). "
                    + "excludeDismissed=true hides the dismissed (resolved) "
                    + "rows — the queue then shows the open reports only and "
                    + "the header counts them; absent or false renders "
                    + "everything, so the default hides nothing.")
    @ApiResponse(responseCode = "200", description = "The report rows (newest "
            + "first, at most limit)", headers = {
            @Header(name = "X-Total-Count",
                    description = "The report queue's row count WITHOUT the "
                            + "paging applied (always present); the OPEN "
                            + "count when excludeDismissed=true.",
                    schema = @Schema(type = "integer", format = "int32"))
    }, content = @Content(array = @ArraySchema(schema =
            @Schema(implementation = AdminShelterReportDto.class))))
    @ApiResponse(responseCode = "400", description = "limit outside 1..200, "
            + "or a negative offset")
    @ApiResponse(responseCode = "404", description = "Unknown shelter (with "
            + "shelterId)", content = @Content(mediaType = "application/json",
            schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<List<AdminShelterReportDto>> listShelterReports(
            @Parameter(description = "Narrow to one shelter (optional).")
            @RequestParam(required = false) Long shelterId,
            @Parameter(description = "Hide the dismissed (resolved) rows: the "
                    + "queue then shows the OPEN reports only. Absent = false "
                    + "(everything renders — nothing is hidden silently).")
            @RequestParam(required = false) Boolean excludeDismissed,
            @Parameter(description = "Rows to return, 1..200 (default 100; "
                    + "anything else 400).")
            @RequestParam(required = false) Integer limit,
            @Parameter(description = "Optional offset into the queue: >= 0; "
                    + "past the end answers an empty array.")
            @RequestParam(required = false) Integer offset) {
        adminAccess.requireAdmin();
        // The bounds are checked BEFORE the read (the shared paging rule).
        Pagination.requireOffset(offset);
        return pagedResponse(moderation.listShelterReports(
                shelterId, Boolean.TRUE.equals(excludeDismissed), limit, offset));
    }

    /** Mark a shelter report resolved — idempotent. 204; 404 unknown report. */
    @PostMapping("/reports/{id}/dismiss")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark a shelter report resolved",
            description = "Idempotent. 204; 404 unknown report.")
    public void dismissReport(@PathVariable long id) {
        moderation.dismissReport(adminAccess.requireAdmin(), id);
    }

    /**
     * The account list behind the Users tab: every REGISTERED
     * and ADMIN account with its suspension state, id-ordered.
     * {@code limit} (1..200; absent = the whole list) and {@code offset}
     * (>= 0) page it (the owner's "every admin list pages" rule),
     * and the {@code X-Total-Count} header is the tab's population
     * WITHOUT paging (always present).
     */
    @GetMapping("/users")
    @Operation(summary = "The account list (Users tab)",
            description = "Every REGISTERED and ADMIN account with its "
                    + "suspension state, id-ordered. E-mail is admin-only data, "
                    + "served from /admin/* only. Optional limit (1..200; "
                    + "absent = the whole list) / offset (>= 0) page it; the "
                    + "X-Total-Count response header is the tab's population "
                    + "WITHOUT paging (always present).")
    @ApiResponse(responseCode = "200", description = "The account rows "
            + "(id-ordered)", headers = {
            @Header(name = "X-Total-Count",
                    description = "The REGISTERED + ADMIN account count "
                            + "WITHOUT the paging applied (always present).",
                            schema = @Schema(type = "integer", format = "int32"))
    }, content = @Content(array = @ArraySchema(schema =
            @Schema(implementation = AdminUserDto.class))))
    @ApiResponse(responseCode = "400", description = "A limit outside 1..200, "
            + "or a negative offset")
    public ResponseEntity<List<AdminUserDto>> listUsers(
            @Parameter(description = "Optional page size: 1..200; absent = the "
                    + "whole list.")
            @RequestParam(required = false) Integer limit,
            @Parameter(description = "Optional offset into the list: >= 0; past "
                    + "the end answers an empty array.")
            @RequestParam(required = false) Integer offset) {
        adminAccess.requireAdmin();
        // The bounds are checked BEFORE the read (the shared paging rule).
        Pagination.requireLimit(limit);
        Pagination.requireOffset(offset);
        return pagedResponse(moderation.listUsers(limit, offset));
    }

    /**
     * Suspend a registered account: login, refresh rotation
     * and every in-flight token stop working immediately. 204 (idempotent);
     * 404 unknown id; 403 the provisioned admin (it is the deployment's
     * access path — a lockout vector, and it cannot be disabled at all);
     * 409 guest targets (no credentials). Audited as USER_SUSPEND with the
     * account as subject.
     */
    @PostMapping("/users/{id}/suspend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Suspend a registered account",
            description = "Login, refresh rotation and every in-flight token stop "
                    + "working immediately. 204 (idempotent); 404 unknown id; 403 "
                    + "the environment-provisioned administrator (lockout vector — "
                    + "it cannot be disabled); 409 guest targets (no credentials). "
                    + "Audited as USER_SUSPEND with the account as subject.")
    public void suspendUser(@PathVariable long id) {
        moderation.suspendUser(adminAccess.requireAdmin(), id);
    }

    /** Lift a suspension — idempotent, audited. Same 204/404/403/409. */
    @PostMapping("/users/{id}/unsuspend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Lift a suspension",
            description = "Idempotent, audited. Same vocabulary as suspend: 204; "
                    + "404 unknown id; 403 the environment-provisioned "
                    + "administrator (it is never suspended — nothing to lift); "
                    + "409 guest targets.")
    public void unsuspendUser(@PathVariable long id) {
        moderation.unsuspendUser(adminAccess.requireAdmin(), id);
    }

}
