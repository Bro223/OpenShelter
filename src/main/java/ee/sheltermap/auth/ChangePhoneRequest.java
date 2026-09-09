package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body for {@code POST /account/phone-change/request}. The cap mirrors the
 * {@code users.phone} column (64).
 */
public record ChangePhoneRequest(@NotBlank @Size(max = 64) String newPhone) {
}
