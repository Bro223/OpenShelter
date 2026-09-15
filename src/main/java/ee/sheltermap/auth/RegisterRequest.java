package ee.sheltermap.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Registration payload (03-auth.puml). {@code @Size} caps mirror the V1
 * column sizes (name 255, email 255, phone 64) so an oversized value is
 * rejected at the boundary (400) instead of reaching a DB constraint (the
 * global DIVE handler would also 400, but validation keeps the error at
 * the input layer).
 *
 * <p>No national ID code (remove-national-id): the app never
 * collects one; SMART_ID verification, when it lands, proves identity via
 * an external PKI flow that stores no code.
 */
@Schema(description = "Registration payload (03-auth.puml). No national ID "
        + "code is collected (remove-national-id M1).")
public record RegisterRequest(
        @Schema(description = "Display name; stored as given (registration "
                + "has no canonicalization).")
        @NotBlank @Size(max = 255) String name,
        @Schema(description = "The account e-mail — a login contact and "
                + "the e-mail verification channel.")
        @NotBlank @Email @Size(max = 255) String email,
        @Schema(description = "The account phone in E.164 form (e.g. "
                + "+37250000001) — a login contact and the SMS "
                + "verification channel.")
        @NotBlank @Size(max = 64) String phone,
        @Schema(description = "At least 8 characters.")
        @NotBlank @Size(min = 8, max = 200, message = "Password must be at least 8 characters long") String password) {
}
