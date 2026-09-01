package ee.sheltermap.api;

import jakarta.validation.constraints.NotBlank;

/**
 * Request for the dev e-mail test endpoint ({@code POST /dev/email-test}).
 * {@code subject}/{@code message} are optional — they default to a fixed
 * test payload so a minimal {@code {"to":"..."}} body is enough.
 */
public record EmailTestRequest(
        @NotBlank(message = "to is required") String to,
        String subject,
        String message) {

    public static final String DEFAULT_SUBJECT = "OpenShelter test";
    public static final String DEFAULT_MESSAGE = "Test message from OpenShelter";

    public EmailTestRequest {
        subject = (subject == null || subject.isBlank()) ? DEFAULT_SUBJECT : subject.trim();
        message = (message == null || message.isBlank()) ? DEFAULT_MESSAGE : message;
    }
}
