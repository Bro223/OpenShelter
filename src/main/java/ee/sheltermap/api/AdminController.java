package ee.sheltermap.api;

import ee.sheltermap.app.AdminAccessException;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.auth.InvalidAccessTokenException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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

/**
 * The admin moderation API (admin-moderation D3) — thin shell: parse,
 * validate, authorize, delegate to {@link AdminModerationService}.
 *
 * <p>Authorization (D2): a FRESH user lookup per request — the JWT's
 * userId is loaded and its kind checked, never a role claim in the token.
 * A JWT minted before a demotion/deletion keeps failing the instant the
 * kind changes. Anonymous callers never reach the guard: {@code /admin/**}
 * requires a valid access token (default security rule) and the entry
 * point answers 401 first; the guard's own 401 branch is the same fallback
 * convention as the other controllers.
 *
 * <p>Surface: shelter list (all statuses, filters, search), manual
 * hide/restore (restore disarms auto-hide), hard delete (USER rows only —
 * registry rows are import-owned, 409), the shelter-report queue with
 * idempotent dismiss, and the review-report queue with idempotent
 * hide/restore. All writes are single-row; no bulk endpoints. Reporter
 * identity is served from this API ONLY.
 */
@RestController
@RequestMapping("/admin")
public class AdminController {

    private final AdminModerationService moderation;
    private final UserRepository userRepository;

    public AdminController(AdminModerationService moderation, UserRepository userRepository) {
        this.moderation = moderation;
        this.userRepository = userRepository;
    }

    /**
     * The admin shelter list (D3): every shelter including hidden, with
     * report counts, status flag, occupancy, review counts and the
     * submitter's name; {@code status}/{@code source} exact-match filters,
     * {@code q} the case-insensitive name/address substring.
     */
    @GetMapping("/shelters")
    public List<AdminShelterDto> listShelters(@RequestParam(required = false) ShelterStatus status,
                                              @RequestParam(required = false) ShelterSource source,
                                              @RequestParam(required = false) String q) {
        requireAdmin();
        return moderation.listShelters(status, source, q);
    }

    /** Manual hide/restore; a restore disarms auto-hide (D3). 204; 404 unknown; 409 registry rows. */
    @PostMapping("/shelters/{id}/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setShelterStatus(@PathVariable long id,
                                 @Valid @RequestBody AdminShelterStatusRequest request) {
        requireAdmin();
        moderation.setShelterStatus(id, request.status());
    }

    /** Hard delete of a USER shelter (cascade). 204; 404 unknown; 409 registry rows. */
    @DeleteMapping("/shelters/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteShelter(@PathVariable long id) {
        requireAdmin();
        moderation.deleteShelter(id);
    }

    /** The shelter report queue, newest first (optional shelter filter). */
    @GetMapping("/reports")
    public List<AdminShelterReportDto> listShelterReports(
            @RequestParam(required = false) Long shelterId) {
        requireAdmin();
        return moderation.listShelterReports(shelterId);
    }

    /** Mark a shelter report resolved — idempotent. 204; 404 unknown report. */
    @PostMapping("/reports/{id}/dismiss")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void dismissReport(@PathVariable long id) {
        requireAdmin();
        moderation.dismissReport(id);
    }

    /** The review report queue (hidden reviews included), newest first. */
    @GetMapping("/review-reports")
    public List<AdminReviewReportDto> listReviewReports() {
        requireAdmin();
        return moderation.listReviewReports();
    }

    /** Immediate review hide — idempotent. 204; 404 unknown review. */
    @PostMapping("/reviews/{id}/hide")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void hideReview(@PathVariable long id) {
        requireAdmin();
        moderation.hideReview(id);
    }

    /** Clear the review's hidden state (restores rating participation) — idempotent. 204; 404 unknown. */
    @PostMapping("/reviews/{id}/restore")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void restoreReview(@PathVariable long id) {
        requireAdmin();
        moderation.restoreReview(id);
    }

    /**
     * D2: fresh lookup per request — the kind column is the truth, never a
     * JWT claim. 401 (same fallback convention as the other controllers;
     * the security entry point answers this for anonymous requests first)
     * or 403 for an authenticated non-admin.
     */
    private void requireAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new InvalidAccessTokenException("Authentication required");
        }
        if (!userRepository.isAdmin(userId)) {
            throw new AdminAccessException("Admin access required");
        }
    }
}
