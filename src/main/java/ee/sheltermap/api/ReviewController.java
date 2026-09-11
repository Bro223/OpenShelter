package ee.sheltermap.api;

import ee.sheltermap.app.NotVerifiedException;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.InvalidAccessTokenException;
import ee.sheltermap.domain.GuestUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Thin shell for community reviews (05-shelter-api.puml).
 *
 * <p>GET is public. POST requires an authenticated, verified account
 * (any VerificationClaim) — one review per user per shelter, re-rating
 * updates. PUT/DELETE act on the authenticated user's own review
 * ("/mine" — author-only by construction; the service also enforces it).
 *
 * <p>Review reports (shelter-trust-and-reports D2): POST
 * {@code /{reviewId}/reports} requires an authenticated, verified user;
 * the service enforces the own-review 403, the duplicate 409 and the
 * 5th-report hide.
 */
@RestController
@RequestMapping("/api/shelters/{shelterId}/reviews")
public class ReviewController {

    private final ShelterReviewService reviewService;
    private final UserRepository userRepository;

    public ReviewController(ShelterReviewService reviewService, UserRepository userRepository) {
        this.reviewService = reviewService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<ShelterReviewDto> list(@PathVariable long shelterId) {
        // D2: hidden reviews are excluded for everyone except their author —
        // the caller (guest for anonymous reads) decides the visibility.
        return reviewService.getReviews(shelterId, callerOrGuest());
    }

    @PostMapping("/{reviewId}/reports")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reportReview(@PathVariable long shelterId,
                             @PathVariable long reviewId,
                             @Valid @RequestBody ReviewReportRequest request) {
        reviewService.reportReview(currentUser(), shelterId, reviewId,
                request.reason(), request.detail());
    }

    @PostMapping
    public ResponseEntity<ShelterReviewDto> add(@PathVariable long shelterId,
                                                @Valid @RequestBody ReviewRequest request) {
        RegisteredUser user = requireVerifiedRegisteredUser();
        ShelterReviewService.SaveResult result =
                reviewService.addReview(user, shelterId, request.rating(), request.comment());
        return ResponseEntity
                .status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(reviewService.toDto(result.review()));
    }

    @PutMapping("/mine")
    public ShelterReviewDto updateMine(@PathVariable long shelterId,
                                       @Valid @RequestBody ReviewRequest request) {
        RegisteredUser user = requireVerifiedRegisteredUser();
        return reviewService.toDto(reviewService.updateReview(user, shelterId, request.rating(), request.comment()));
    }

    @DeleteMapping("/mine")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMine(@PathVariable long shelterId) {
        RegisteredUser user = requireVerifiedRegisteredUser();
        reviewService.deleteReview(user, shelterId);
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new InvalidAccessTokenException("Authentication required");
        }
        User user = userRepository.findById(userId);
        if (user == null) {
            throw new InvalidAccessTokenException("Unknown user");
        }
        return user;
    }

    /**
     * The authenticated caller, or a fresh guest for anonymous reads —
     * the public review list's hidden-row visibility is caller-dependent
     * (D2), so the GET never throws for guests.
     */
    private User callerOrGuest() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Long userId) {
            User user = userRepository.findById(userId);
            if (user != null) {
                return user;
            }
        }
        return new GuestUser();
    }

    private RegisteredUser requireVerifiedRegisteredUser() {
        User user = currentUser();
        if (!(user instanceof RegisteredUser registered)) {
            // guests never reach here (401 first); admins are not "verified accounts"
            throw new NotVerifiedException(ShelterReviewService.VERIFIED_ACCOUNT_MESSAGE);
        }
        if (!registered.canWrite()) {
            throw new NotVerifiedException(ShelterReviewService.VERIFIED_ACCOUNT_MESSAGE);
        }
        return registered;
    }
}
