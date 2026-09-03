package ee.sheltermap.api;

import jakarta.validation.constraints.NotBlank;

/**
 * Request for the dev SMS test endpoint ({@code POST /dev/sms-test}).
 * {@code message} is optional — it defaults to a fixed test payload so a
 * minimal {@code {"to":"..."}} body is enough.
 */
public record SmsTestRequest(
        @NotBlank(message = "to is required") String to,
        String message) {

    public static final String DEFAULT_MESSAGE = "Test message from OpenShelter";

    public SmsTestRequest {
        message = (message == null || message.isBlank()) ? DEFAULT_MESSAGE : message.trim();
    }
}
