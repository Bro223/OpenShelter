package ee.sheltermap.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body for {@code POST /account/email-change/confirm} and {@code POST /account/phone-change/confirm}. */
@Schema(description = "Body for POST /account/email-change/confirm and "
        + "POST /account/phone-change/confirm.")
public record ConfirmChangeRequest(
        @Schema(description = "The 6-digit code sent to the account's "
                + "other contact channel.")
        @NotBlank @Size(max = 16) String code) {
}
