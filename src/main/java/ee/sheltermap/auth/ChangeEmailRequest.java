package ee.sheltermap.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body for {@code POST /account/email-change/request}. The cap mirrors the
 * {@code users.email} column (255) and the pending-change target column
 * (255).
 */
public record ChangeEmailRequest(@NotBlank @Email @Size(max = 255) String newEmail) {
}
