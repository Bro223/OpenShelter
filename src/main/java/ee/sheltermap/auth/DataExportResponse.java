package ee.sheltermap.auth;

import ee.sheltermap.domain.VerificationLevel;

import java.time.Instant;
import java.util.List;

/**
 * The response of {@code GET /account/export} (legal-recovery M4, slice 1):
 * the caller's own data in one self-describing JSON document — profile
 * (name/e-mail/phone are decrypted at the persistence boundary, the domain
 * carries plaintext), every author-scoped shelter row (ALL statuses — the
 * export mirrors what the account actually submitted, including
 * auto-hidden/REJECT rows) and every review the user wrote (shelter names
 * batch-resolved, same idiom as {@code /account/reviews/mine}).
 *
 * <p>The frontend turns this body into a downloadable JSON file; the server
 * itself is a plain read.
 */
public record DataExportResponse(
        ExportedProfile profile,
        List<ExportedShelter> shelters,
        List<ExportedReview> reviews) {

    /**
     * The account's identity anchor + verified levels. {@code phone} is
     * {@code null} for the provisioned admin (no phone route —
     * admin-moderation D1).
     */
    public record ExportedProfile(String name, String email, String phone,
                                  List<VerificationLevel> levels) {
    }

    /** One author-scoped shelter row (all statuses; address is
     *  {@code null} for USER submissions — a registry-only field). */
    public record ExportedShelter(Long id, String name, String address,
                                  Double latitude, Double longitude,
                                  String source, String status, String reviewStatus,
                                  String locationKind, String description,
                                  Integer capacity, Instant createdAt) {
    }

    /** One review the user wrote — hidden reviews are included (the author
     *  always sees their own; the public list is the one that hides them). */
    public record ExportedReview(Long shelterId, String shelterName, int rating,
                                 String comment, Instant createdAt, Instant updatedAt) {
    }
}
