package ee.sheltermap.api;

import ee.sheltermap.sitetexts.SiteTextValidationException;
import ee.sheltermap.sitetexts.SiteTextsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.util.Objects;

/**
 * The admin site-texts API (site_texts): the Settings tab's save. Thin
 * shell — authorize (the shared fresh per-request ADMIN kind lookup,
 * {@link AdminAccess#requireAdmin()}: anonymous → 401, non-admin → 403),
 * then delegate to {@link SiteTextsService} (allowlist, locale, cap and
 * https validation; a violation is a uniform 400).
 */
@Tag(name = "Admin site texts",
        description = "The admin-editable popup/header/footer texts (site_texts). "
                + "Every operation requires a valid Bearer JWT AND an ADMIN-kind "
                + "account, checked by a fresh per-request DB lookup (never a "
                + "role claim in the token). Anonymous → 401; non-admin → 403; "
                + "a disallowed key/locale/value/URL → 400.")
@RestController
@RequestMapping(value = "/admin/site-texts", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminSiteTextController {

    private final SiteTextsService siteTexts;
    private final AdminAccess adminAccess;
    private final Clock clock;

    public AdminSiteTextController(SiteTextsService siteTexts,
                                   AdminAccess adminAccess,
                                   Clock clock) {
        this.siteTexts = Objects.requireNonNull(siteTexts, "siteTexts");
        this.adminAccess = Objects.requireNonNull(adminAccess, "adminAccess");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @PutMapping
    @Operation(summary = "Save the admin's site-text edits",
            description = "A batch of (key, locale) edits. A blank value resets "
                    + "that (key, locale) to the shipped default (the row is "
                    + "deleted); a blank url on a link key resets to the shipped "
                    + "default URL. Unknown keys, unknown locales, values over "
                    + "500 characters, URLs on non-link keys and non-https URLs "
                    + "refuse the whole batch with a 400.")
    @ApiResponse(responseCode = "204", description = "Saved")
    @ApiResponse(responseCode = "400", description = "A disallowed key/locale/value/URL")
    @ApiResponse(responseCode = "401", description = "No valid token")
    @ApiResponse(responseCode = "403", description = "Authenticated but not an admin")
    public ResponseEntity<Void> update(@RequestBody UpdateSiteTextRequest request,
                                       HttpServletRequest servletRequest) {
        adminAccess.requireAdmin();
        siteTexts.update(request.texts());
        return ResponseEntity.noContent().build();
    }

    /** A refused batch → the uniform 400 (the shared ApiErrorHandler keeps
        the 401/403 mappings for the auth exceptions above). */
    @ExceptionHandler(SiteTextValidationException.class)
    ResponseEntity<ErrorResponse> validation(SiteTextValidationException ex,
                                             HttpServletRequest request) {
        return ResponseEntity.badRequest().body(new ErrorResponse(
                clock.instant(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()));
    }
}
