package ee.sheltermap.auth;

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
 * <p>No national ID code (remove-national-id M1): the app no longer
 * collects one; SMART_ID verification, when it lands, proves identity via
 * an external PKI flow that stores no code.
 */
public record RegisterRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 64) String phone,
        @NotBlank @Size(min = 8, max = 200, message = "Password must be at least 8 characters long") String password) {
}
