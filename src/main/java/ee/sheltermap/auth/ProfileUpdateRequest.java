package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Profile-edit payload (PUT /account/profile): name + national ID code,
 * confirmed by the account's current password.
 *
 * <p>Validations mirror {@link RegisterRequest} — {@code @NotBlank} plus the
 * {@code @Size} caps that mirror the V1 column sizes (name 255,
 * national_id_code 32); no checksum and no canonicalization (registration
 * stores the values as given, so editing must not be stricter; a code that
 * could be registered can be edited). Email/phone are deliberately absent:
 * they stay governed by the cross-channel change flows.
 */
public record ProfileUpdateRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 32) String nationalIdCode,
        @NotBlank String currentPassword) {
}
