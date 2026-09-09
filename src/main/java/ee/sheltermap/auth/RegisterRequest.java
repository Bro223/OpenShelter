package ee.sheltermap.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Registration payload (03-auth.puml). {@code @Size} caps mirror the V1
 * column sizes (name 255, email 255, phone 64, national_id_code 32) so an
 * oversized value is rejected at the boundary (400) instead of reaching a
 * DB constraint (the global DIVE handler would also 400, but validation
 * keeps the error at the input layer).
 */
public record RegisterRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 64) String phone,
        @NotBlank @Size(max = 32) String nationalIdCode,
        @NotBlank String password) {
}
