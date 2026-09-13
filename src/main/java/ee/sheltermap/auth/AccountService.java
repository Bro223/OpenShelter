package ee.sheltermap.auth;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.domain.UserData;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * The account surface behind {@code GET /account/me} +
 * {@code PUT /account/profile} (04-CONTEXT-AUTH.md): the authenticated
 * user's real profile (name, email, phone + the real verified
 * claim set) and the password-confirmed name edit. Also the cross-
 * shelter "my reviews" listing ({@code GET /account/reviews/mine},
 * user-contributions) — it lives on the {@code /account} group because the
 * list has no per-shelter parent.
 *
 * <p>Email/phone are NOT editable here — they stay on the cross-channel
 * change flows ({@link ContactChangeService}). Identity fields have no
 * second channel to prove against, so possession of the current password is
 * the gate: a stolen session cannot rewrite the identity anchor.
 */
@Service
public class AccountService {

    private final UserRepository userRepository;
    private final UserCredentialsRepository credentials;
    private final PasswordHasher passwordHasher;
    private final ShelterReviewRepository reviewRepository;
    private final ShelterRepository shelterRepository;

    public AccountService(UserRepository userRepository,
                          UserCredentialsRepository credentials,
                          PasswordHasher passwordHasher,
                          ShelterReviewRepository reviewRepository,
                          ShelterRepository shelterRepository) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.credentials = Objects.requireNonNull(credentials, "credentials");
        this.passwordHasher = Objects.requireNonNull(passwordHasher, "passwordHasher");
        this.reviewRepository = Objects.requireNonNull(reviewRepository, "reviewRepository");
        this.shelterRepository = Objects.requireNonNull(shelterRepository, "shelterRepository");
    }

    /** Real profile snapshot for GET /account/me — never an optimistic mirror. */
    @Transactional(readOnly = true)
    public MeResponse profile(RegisteredUser user) {
        return MeResponse.from(user);
    }

    /**
     * PUT /account/profile: verifies the current password BEFORE any update
     * (wrong → {@link InvalidProfilePasswordException} → 401, nothing is
     * written), then replaces the name and returns the fresh
     * {@link MeResponse} so the client adopts it in one round trip.
     *
     * <p>Validation is deliberately identical to registration (blank-only,
     * values stored as given — see {@link ProfileUpdateRequest}). No
     * national ID code is collected or editable (remove-national-id M1).
     */
    @Transactional
    public MeResponse updateProfile(RegisteredUser user, ProfileUpdateRequest request) {
        Objects.requireNonNull(request, "request");
        UserCredentials stored = credentials.findByUserId(user.getId());
        if (stored == null || !passwordHasher.verify(request.currentPassword(), stored.getPasswordHash())) {
            throw new InvalidProfilePasswordException();
        }
        user.changeName(request.name());
        userRepository.save(user);
        return MeResponse.from(user);
    }

    /**
     * GET /account/reviews/mine (user-contributions): the caller's reviews
     * across ALL shelters, each carrying the shelter's id + name for
     * navigation. Shelter names resolve in ONE batched read (no N+1,
     * mirroring {@code ShelterReviewService.getReviews}' batched author
     * lookup). A review whose shelter was deleted cannot occur (the DB
     * cascades shelter deletion onto its reviews), so the name always
     * resolves; "Unknown" guards the impossible only.
     */
    @Transactional(readOnly = true)
    public List<MyReviewDto> myReviews(RegisteredUser user) {
        List<ShelterReview> reviews = reviewRepository.findByUserId(user.getId());
        if (reviews.isEmpty()) {
            return List.of();
        }
        Map<Long, String> shelterNames = shelterNames(reviews);
        return reviews.stream()
                .map(review -> new MyReviewDto(
                        review.getShelterId(),
                        shelterNames.getOrDefault(review.getShelterId(), "Unknown"),
                        review.getRating(),
                        review.getComment(),
                        review.getCreatedAt(),
                        review.getUpdatedAt()))
                .toList();
    }

    /**
     * GET /account/export (legal-recovery M4, slice 1): the caller's own
     * data in one document — profile (name/e-mail/phone decrypted at the
     * persistence boundary + verified levels), EVERY author-scoped shelter
     * row (all statuses — the export mirrors what the account submitted,
     * including auto-hidden ones) and every review (shelter names
     * batch-resolved as in {@link #myReviews}). A pure read: nothing is
     * updated, nothing is logged.
     */
    @Transactional(readOnly = true)
    public DataExportResponse dataExport(RegisteredUser user) {
        UserData data = user.getData();
        DataExportResponse.ExportedProfile profile = new DataExportResponse.ExportedProfile(
                data.name(), data.email(), data.phone(),
                Stream.of(VerificationLevel.values()).filter(data.levels()::contains).toList());

        List<DataExportResponse.ExportedShelter> shelters =
                shelterRepository.findByCreatedBy(user.getId()).stream()
                        .map(s -> new DataExportResponse.ExportedShelter(
                                s.getId(), s.getName(), s.getAddress(),
                                s.getLocation() == null ? null : s.getLocation().lat(),
                                s.getLocation() == null ? null : s.getLocation().lng(),
                                s.getSource().name(), s.getStatus().name(),
                                s.getReviewStatus().name(), s.getLocationKind().name(),
                                s.getDescription(), s.getCapacity(), s.getCreatedAt()))
                        .toList();

        List<ShelterReview> reviews = reviewRepository.findByUserId(user.getId());
        Map<Long, String> reviewShelterNames = shelterNames(reviews);
        List<DataExportResponse.ExportedReview> exportedReviews = reviews.isEmpty() ? List.of()
                : reviews.stream()
                        .map(review -> new DataExportResponse.ExportedReview(
                                review.getShelterId(),
                                reviewShelterNames.getOrDefault(review.getShelterId(), "Unknown"),
                                review.getRating(), review.getComment(),
                                review.getCreatedAt(), review.getUpdatedAt()))
                        .toList();

        return new DataExportResponse(profile, shelters, exportedReviews);
    }

    /** One batched read of shelter names by id (no N+1; empty map if none). */
    private Map<Long, String> shelterNames(Collection<ShelterReview> reviews) {
        Set<Long> ids = reviews.stream().map(ShelterReview::getShelterId).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Map.of();
        }
        return shelterRepository.findByIds(ids).stream()
                .collect(Collectors.toMap(Shelter::getId, Shelter::getName));
    }
}
