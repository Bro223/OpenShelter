package ee.sheltermap.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * The submitter's ONE-TIME reply to an information request:
 * {@code {"message": "..."}} — required, at most 2000 characters (the
 * V19 column bound). A blank message is a 400 validation failure.
 */
public record InfoRequestReplyRequest(
        @NotBlank @Size(max = 2000) String message) {
}
