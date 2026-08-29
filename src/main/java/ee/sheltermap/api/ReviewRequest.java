package ee.sheltermap.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * Review body: {@code rating} 1..5, {@code comment} ≤ 500 chars
 * (null/empty = no comment).
 */
public record ReviewRequest(
        @Min(1) @Max(5) int rating,
        @Size(max = 500) String comment) {
}
