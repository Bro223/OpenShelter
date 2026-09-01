package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;

/** Body for {@code POST /account/email-change/confirm} and {@code POST /account/phone-change/confirm}. */
public record ConfirmChangeRequest(@NotBlank String code) {
}
