package ee.sheltermap.auth;

import java.util.Objects;

/**
 * Outcome of a contact-change confirm.
 *
 * <p>{@link #failureMessage} is {@code null} on success; otherwise it is the
 * user-facing 400 message the controller surfaces as
 * {@link InvalidContactChangeException}. The service RETURNS a failure
 * instead of throwing one so the enclosing transaction commits the
 * failed-attempt increment — throwing inside it would roll the increment
 * back and defeat the 5-attempt lockout (same shape as
 * {@code PasswordResetService.reset} returning a boolean).
 */
public record ContactChangeResult(String failureMessage) {

    public static ContactChangeResult success() {
        return new ContactChangeResult(null);
    }

    public static ContactChangeResult failure(String message) {
        return new ContactChangeResult(Objects.requireNonNull(message, "message"));
    }

    public boolean ok() {
        return failureMessage == null;
    }
}
