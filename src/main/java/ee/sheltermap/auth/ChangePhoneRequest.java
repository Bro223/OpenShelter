package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;

/** Body for {@code POST /account/phone-change/request}. */
public record ChangePhoneRequest(@NotBlank String newPhone) {
}
