package ee.sheltermap.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Body for {@code POST /account/email-change/request}. */
public record ChangeEmailRequest(@NotBlank @Email String newEmail) {
}
