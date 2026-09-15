package ee.sheltermap.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request for the dev e-mail test endpoint ({@code POST /dev/email-test}).
 * {@code subject}/{@code message} are optional — they default to a fixed
 * test payload so a minimal {@code {"to":"..."}} body is enough.
 *
 * <p>B5 (2026-09-15 hardening): these are the only strings handed straight to
 * an outbound SMTP sender, so they carry the same boundary caps as every other
 * request record — a dev-only endpoint behind {@code DevEndpointsGuard} is
 * still an endpoint someone can point at a large body.
 */
public record EmailTestRequest(
        @NotBlank(message = "to is required") @Size(max = 255) String to,
        @Size(max = 255) String subject,
        @Size(max = 1000) String message) {

    public static final String DEFAULT_SUBJECT = "OpenShelter test";
    public static final String DEFAULT_MESSAGE = "Test message from OpenShelter";

    public EmailTestRequest {
        subject = (subject == null || subject.isBlank()) ? DEFAULT_SUBJECT : subject.trim();
        message = (message == null || message.isBlank()) ? DEFAULT_MESSAGE : message;
    }
}
