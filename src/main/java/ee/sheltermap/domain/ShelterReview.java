package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * Community rating — the moderation IS the rating system.
 *
 * <p>One review per user per shelter (unique {@code shelterId + userId});
 * re-rating is an update, not an insert. {@code rating} 1..5,
 * {@code comment} ≤ 500 chars (empty = no comment).
 *
 * <p>{@code hiddenAt} marks a community-hidden review (shelter-trust-and-
 * reports D2): set ONCE by the 5th review report, never cleared
 * automatically (only admin moderation can restore a hidden review).
 * Hidden reviews are excluded from the public list, the rating aggregate
 * and the {@code reviewed} filter — the author still sees their own.
 */
public class ShelterReview {

    public static final int MAX_COMMENT_LENGTH = 500;

    private Long id;
    private final Long shelterId;
    private final Long userId;
    private int rating;
    private String comment;
    private final Instant createdAt;
    private Instant updatedAt;
    /** When the 5th review report hid this review; {@code null} while visible. */
    private Instant hiddenAt;

    public ShelterReview(Long shelterId, Long userId, int rating, String comment) {
        this(shelterId, userId, rating, comment, Instant.now());
    }

    ShelterReview(Long shelterId, Long userId, int rating, String comment, Instant createdAt) {
        this.shelterId = Objects.requireNonNull(shelterId, "shelterId");
        this.userId = Objects.requireNonNull(userId, "userId");
        setRating(rating);
        setComment(comment);
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
        this.updatedAt = createdAt;
    }

    /**
     * Full-state constructor used by the persistence layer (Step 3) to
     * restore an existing review from storage.
     */
    public ShelterReview(Long shelterId, Long userId, int rating, String comment,
                         Instant createdAt, Instant updatedAt) {
        this(shelterId, userId, rating, comment, createdAt);
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
    }

    public Long getId() {
        return id;
    }

    /** Assigned by persistence/repositories; {@code null} until persisted. */
    public void setId(Long id) {
        this.id = id;
    }

    public Long getShelterId() {
        return shelterId;
    }

    public Long getUserId() {
        return userId;
    }

    public int getRating() {
        return rating;
    }

    public String getComment() {
        return comment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    /** {@code true} once the community (5 review reports) hid this review. */
    public boolean isHidden() {
        return hiddenAt != null;
    }

    public Instant getHiddenAt() {
        return hiddenAt;
    }

    /**
     * Hides the review (D2). Set ONCE — a second call is a no-op, so the
     * hide can never be double-stamped or accidentally cleared.
     */
    public void markHidden(Instant hiddenAt) {
        if (this.hiddenAt == null) {
            this.hiddenAt = Objects.requireNonNull(hiddenAt, "hiddenAt");
        }
    }

    /** Restores visibility — admin moderation only (later change). */
    public void markVisible() {
        this.hiddenAt = null;
    }

    /** Re-rating = update, not insert. */
    public void update(int newRating, String newComment) {
        setRating(newRating);
        setComment(newComment);
        this.updatedAt = Instant.now();
    }

    private void setRating(int rating) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("rating must be between 1 and 5, was " + rating);
        }
        this.rating = rating;
    }

    private void setComment(String comment) {
        String normalized = comment == null ? "" : comment;
        if (normalized.length() > MAX_COMMENT_LENGTH) {
            throw new IllegalArgumentException("comment must be at most " + MAX_COMMENT_LENGTH + " chars");
        }
        this.comment = normalized;
    }
}
