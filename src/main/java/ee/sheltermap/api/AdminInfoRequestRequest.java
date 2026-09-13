package ee.sheltermap.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * The moderator's information request body (M10 slice 3):
 * {@code {"message": "..."}} — required, at most 2000 characters (the
 * V19 column bound). A blank message is a 400 validation failure.
 */
public record AdminInfoRequestRequest(
        @NotBlank @Size(max = 2000) String message) {
}
