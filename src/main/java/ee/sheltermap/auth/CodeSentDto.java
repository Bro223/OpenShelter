package ee.sheltermap.auth;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The ack body of a "code sent" endpoint (verification request, password
 * reset request, contact-change request): how long the client should wait
 * before asking for the same code again — the server-enforced resend
 * cooldown, in whole seconds. Lets the frontend render a countdown
 * instead of letting the user spam-click into 429s.
 *
 * @param resendAvailableAfterSeconds seconds until a resend is allowed
 *                                    ({@code 0} = no cooldown configured)
 */
@Schema(description = "The ack body of a 'code sent' endpoint (verification "
        + "request, password-reset request, contact-change request).")
public record CodeSentDto(
        @Schema(description = "Seconds the client should wait before asking "
                + "for the same code again — the server-enforced resend "
                + "cooldown (0 = no cooldown configured).")
        int resendAvailableAfterSeconds) {
}
