package ee.sheltermap.api;

import ee.sheltermap.app.ImportOwnedShelterException;
import ee.sheltermap.app.ReportNotFoundException;
import ee.sheltermap.app.ReviewReportRepository;
import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReportRepository;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.ReviewReport;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The admin moderation surface (admin-moderation D3/D4) — manual
 * hide/restore of user shelters, hard delete of user shelters, and the two
 * report queues with their single-row moderation actions.
 *
 * <p>Authorization is the controller's job (D2 — fresh kind lookup per
 * request); this service assumes an authenticated admin and owns the
 * guard rails instead:
 * <ul>
 *   <li>USER rows only — status changes and deletes on {@code source !=
 *       USER} are 409 (import-owned, D4: the registry import rebuilds its
 *       rows as ACTIVE on every run, so an admin edit would silently
 *       revert);</li>
 *   <li>a restore (INACTIVE → ACTIVE) is the manual status change that
 *       DISARMS auto-hide (shelter-trust-and-reports D1 — once a human has
 *       set the status, the 5th NON_EXISTENT report never re-hides);</li>
 *   <li>all writes are single-row transactions; no bulk endpoints; every
 *       unknown id is a 404.</li>
 * </ul>
 *
 * <p>Lives in {@code api} (like {@link ShelterQueryService}, which its
 * list endpoint reuses) so the admin shelter list is the SAME batched
 * trust projection as the public list — no N+1, one SQL surface.
 * Reporter identity in the queues is the user's profile name + email —
 * admin-only data, never exposed outside {@code /admin/*}.
 */
@Service
public class AdminModerationService {

    /** D4: registry rows are import-owned — the plain 409 message. */
    public static final String IMPORT_OWNED_MESSAGE =
            "Registry shelters are import-owned and cannot be moderated here";

    private final ShelterQueryService queryService;
    private final ShelterRepository shelters;
    private final ShelterReportRepository shelterReports;
    private final ReviewReportRepository reviewReports;
    private final ShelterReviewRepository reviews;
    private final UserRepository users;
    private final Clock clock;

    public AdminModerationService(ShelterQueryService queryService,
                                  ShelterRepository shelters,
                                  ShelterReportRepository shelterReports,
                                  ReviewReportRepository reviewReports,
                                  ShelterReviewRepository reviews,
                                  UserRepository users,
                                  Clock clock) {
        this.queryService = Objects.requireNonNull(queryService, "queryService");
        this.shelters = Objects.requireNonNull(shelters, "shelters");
        this.shelterReports = Objects.requireNonNull(shelterReports, "shelterReports");
        this.reviewReports = Objects.requireNonNull(reviewReports, "reviewReports");
        this.reviews = Objects.requireNonNull(reviews, "reviews");
        this.users = Objects.requireNonNull(users, "users");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    /**
     * GET /admin/shelters — every shelter, ALL statuses (auto-hidden rows
     * included), id-ordered, filterable by exact status/source and by the
     * case-insensitive name/address substring {@code q}. Same batched
     * trust derivations as the public list plus the submitter's profile
     * name (the trust projection, reused — no N+1).
     */
    @Transactional(readOnly = true)
    public List<AdminShelterDto> listShelters(ShelterStatus status, ShelterSource source, String q) {
        return queryService.findAllForAdmin(status, source, q);
    }

    /**
     * POST /admin/shelters/{id}/status — manual hide/restore. USER rows
     * only (registry rows → 409, import-owned, D4); unknown id → 404. A
     * restore is the manual change that disarms auto-hide.
     */
    @Transactional
    public void setShelterStatus(long shelterId, ShelterStatus target) {
        Shelter shelter = requireShelter(shelterId);
        requireUserOwned(shelter);
        if (shelter.getStatus() != target) {
            if (target == ShelterStatus.ACTIVE) {
                // The restore (shelter-trust-and-reports D1): once a human
                // has set the status, the NON_EXISTENT reports increment
                // their count but never re-hide this shelter.
                shelter.setAutoHideDisarmed(true);
            }
            shelter.setStatus(target);
            shelters.save(shelter);
        }
    }

    /**
     * DELETE /admin/shelters/{id} — hard delete of a USER shelter; the DB
     * cascades its reviews, shelter reports, review reports and occupancy
     * rows (V1/V9 FKs are all ON DELETE CASCADE). USER rows only
     * (registry → 409); unknown id → 404.
     */
    @Transactional
    public void deleteShelter(long shelterId) {
        Shelter shelter = requireShelter(shelterId);
        requireUserOwned(shelter);
        shelters.deleteById(shelterId);
    }

    /**
     * GET /admin/reports — the shelter report queue, newest first. With
     * {@code shelterId} that shelter's queue (unknown shelter → 404);
     * without, every report. Shelter name/status and the reporter's
     * profile name + email resolve in ONE batched lookup each (no N+1).
     */
    @Transactional(readOnly = true)
    public List<AdminShelterReportDto> listShelterReports(Long shelterId) {
        if (shelterId != null) {
            requireShelter(shelterId);
        }
        List<ShelterReport> reports = shelterId == null
                ? shelterReports.findAll()
                : shelterReports.findByShelterId(shelterId);
        if (reports.isEmpty()) {
            return List.of();
        }
        Map<Long, Shelter> sheltersById = shelters
                .findByIds(reports.stream().map(ShelterReport::getShelterId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Shelter::getId, Function.identity()));
        Map<Long, User> reporters = users.findByIds(reports.stream()
                .map(ShelterReport::getUserId).collect(Collectors.toSet()));
        return reports.stream()
                .map(report -> {
                    Shelter shelter = sheltersById.get(report.getShelterId());
                    User reporter = reporters.get(report.getUserId());
                    return new AdminShelterReportDto(
                            report.getId(),
                            report.getShelterId(),
                            shelter == null ? "Unknown" : shelter.getName(),
                            shelter == null ? null : shelter.getStatus(),
                            report.getType(),
                            report.getDetail(),
                            reporter == null ? "Unknown" : reporter.getData().name(),
                            reporter == null ? null : reporter.getData().email(),
                            report.getCreatedAt(),
                            report.isDismissed());
                })
                .toList();
    }

    /**
     * POST /admin/reports/{id}/dismiss — mark a shelter report resolved
     * (idempotent: a re-dismiss is a no-op, the stamp is set once). The
     * row is KEPT — dismissing records the resolution, it never deletes
     * the report. Unknown id → 404.
     */
    @Transactional
    public void dismissReport(long reportId) {
        ShelterReport report = shelterReports.findById(reportId)
                .orElseThrow(() -> new ReportNotFoundException(reportId));
        if (!report.isDismissed()) {
            report.markDismissed(clock.instant());
            shelterReports.save(report);
        }
    }

    /**
     * GET /admin/review-reports — the review report queue, newest first,
     * hidden reviews INCLUDED with their hidden marker. Review, shelter
     * and reporter resolve in ONE batched lookup each (no N+1).
     */
    @Transactional(readOnly = true)
    public List<AdminReviewReportDto> listReviewReports() {
        List<ReviewReport> reports = reviewReports.findAll();
        if (reports.isEmpty()) {
            return List.of();
        }
        Map<Long, ShelterReview> reviewsById = reviews
                .findByIds(reports.stream().map(ReviewReport::getReviewId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(ShelterReview::getId, Function.identity()));
        Set<Long> shelterIds = reviewsById.values().stream()
                .map(ShelterReview::getShelterId)
                .collect(Collectors.toSet());
        Map<Long, Shelter> sheltersById = shelters.findByIds(shelterIds).stream()
                .collect(Collectors.toMap(Shelter::getId, Function.identity()));
        Map<Long, User> reporters = users.findByIds(reports.stream()
                .map(ReviewReport::getUserId).collect(Collectors.toSet()));
        return reports.stream()
                .map(report -> {
                    ShelterReview review = reviewsById.get(report.getReviewId());
                    // A report can never outlive its review or the review's
                    // shelter (both FKs cascade) — "Unknown" guards the
                    // impossible, same as the "my reviews" projection.
                    Shelter shelter = review == null ? null : sheltersById.get(review.getShelterId());
                    User reporter = reporters.get(report.getUserId());
                    return new AdminReviewReportDto(
                            report.getId(),
                            review == null ? null : review.getShelterId(),
                            shelter == null ? "Unknown" : shelter.getName(),
                            report.getReviewId(),
                            review == null ? null : review.getRating(),
                            review == null ? null : review.getComment(),
                            review != null && review.isHidden(),
                            report.getReason(),
                            report.getDetail(),
                            reporter == null ? "Unknown" : reporter.getData().name(),
                            reporter == null ? null : reporter.getData().email(),
                            report.getCreatedAt());
                })
                .toList();
    }

    /**
     * POST /admin/reviews/{id}/hide — immediate hide (idempotent: the
     * stamp is set once). Hiding never deletes the row; the review is
     * excluded from the public list, the rating aggregate and the
     * {@code reviewed} filter from this point on. Unknown id → 404.
     */
    @Transactional
    public void hideReview(long reviewId) {
        ShelterReview review = requireReview(reviewId);
        if (!review.isHidden()) {
            review.markHidden(clock.instant());
            reviews.save(review);
        }
    }

    /**
     * POST /admin/reviews/{id}/restore — clear the hidden state (idempotent:
     * a second restore is a no-op). Restores the review's participation in
     * the rating, the count and the {@code reviewed} filter. Unknown id → 404.
     */
    @Transactional
    public void restoreReview(long reviewId) {
        ShelterReview review = requireReview(reviewId);
        if (review.isHidden()) {
            review.markVisible();
            reviews.save(review);
        }
    }

    private Shelter requireShelter(long shelterId) {
        return shelters.findById(shelterId)
                .orElseThrow(() -> new ShelterNotFoundException(shelterId));
    }

    /** D4: only USER-source rows are admin-manageable; registry rows are import-owned. */
    private static void requireUserOwned(Shelter shelter) {
        if (shelter.getSource() != ShelterSource.USER) {
            throw new ImportOwnedShelterException(IMPORT_OWNED_MESSAGE);
        }
    }

    private ShelterReview requireReview(long reviewId) {
        return reviews.findById(reviewId)
                .orElseThrow(() -> new ReportNotFoundException(reviewId));
    }
}
