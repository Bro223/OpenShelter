package ee.sheltermap.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request for the dev SMS test endpoint ({@code POST /dev/sms-test}).
 * {@code message} is optional — it defaults to a fixed test payload so a
 * minimal {@code {"to":"..."}} body is enough.
 *
 * <p>B5 (2026-09-15 hardening): {@code to}/{@code message} are handed straight
 * to an outbound SMS sender, so they carry the same boundary caps as every
 * other request record (dev-only endpoint, but bounded like the rest).
 */
public record SmsTestRequest(
        @NotBlank(message = "to is required") @Size(max = 255) String to,
        @Size(max = 1000) String message) {

    public static final String DEFAULT_MESSAGE = "Test message from OpenShelter";

    public SmsTestRequest {
        message = (message == null || message.isBlank()) ? DEFAULT_MESSAGE : message.trim();
    }
}
