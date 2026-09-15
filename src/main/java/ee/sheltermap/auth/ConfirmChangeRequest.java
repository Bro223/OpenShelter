package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body for {@code POST /account/email-change/confirm} and {@code POST /account/phone-change/confirm}. */
public record ConfirmChangeRequest(@NotBlank @Size(max = 16) String code) {
}
