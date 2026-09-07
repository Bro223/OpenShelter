package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Profile-edit payload (PUT /account/profile): name + national ID code,
 * confirmed by the account's current password.
 *
 * <p>Validations mirror {@link RegisterRequest} exactly — {@code @NotBlank}
 * only, no checksum and no canonicalization (registration stores the values
 * as given, so editing must not be stricter; a code that could be registered
 * can be edited). Email/phone are deliberately absent: they stay governed by
 * the cross-channel change flows.
 */
public record ProfileUpdateRequest(
        @NotBlank String name,
        @NotBlank String nationalIdCode,
        @NotBlank String currentPassword) {
}
