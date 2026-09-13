package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Profile-edit payload (PUT /account/profile): name only, confirmed by
 * the account's current password.
 *
 * <p>Validation mirrors {@link RegisterRequest} — {@code @NotBlank} plus
 * the {@code @Size} cap that mirrors the V1 column size (name 255);
 * values are stored as given (registration has no canonicalization, so
 * editing must not be stricter). Email/phone are deliberately absent:
 * they stay governed by the cross-channel change flows. No national ID
 * code is collected anywhere (remove-national-id M1).
 */
public record ProfileUpdateRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank String currentPassword) {
}
