package ee.sheltermap.verification;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class TwilioSmsSenderTest {

    /** Hand-written fake (the suite is Mockito-free by design — JDK-agnostic). */
    static final class FakeTwilioApi implements TwilioSmsSender.TwilioApi {
        final List<String[]> calls = new ArrayList<>();

        @Override
        public void send(String toE164, String messagingServiceSid, String fromNumber, String body) {
            calls.add(new String[]{toE164, messagingServiceSid, fromNumber, body});
        }
    }

    /** Fake that always throws — for the "logged, not thrown" contract. */
    static final class ThrowingTwilioApi implements TwilioSmsSender.TwilioApi {
        @Override
        public void send(String toE164, String messagingServiceSid, String fromNumber, String body) {
            throw new IllegalStateException("Twilio rejected: 21408");
        }
    }

    @Test
    void sendsToE164NormalizedNumberViaMessagingService() {
        FakeTwilioApi api = new FakeTwilioApi();
        TwilioSmsSender sender = new TwilioSmsSender(api, "MG123", null);

        sender.send("+372 5123 4567", "OpenShelter OTP: 123456");

        assertThat(api.calls).hasSize(1);
        String[] call = api.calls.get(0);
        assertThat(call[0]).isEqualTo("+37251234567"); // E.164 normalization applied
        assertThat(call[1]).isEqualTo("MG123");        // messaging service sid wins
        assertThat(call[2]).isNull();
        assertThat(call[3]).contains("123456");
    }

    @Test
    void fallsBackToFromNumberWhenNoMessagingService() {
        FakeTwilioApi api = new FakeTwilioApi();
        TwilioSmsSender sender = new TwilioSmsSender(api, null, "+37250000000");

        sender.send("51234567", "OTP");

        String[] call = api.calls.get(0);
        assertThat(call[0]).isEqualTo("+37251234567");
        assertThat(call[1]).isNull();
        assertThat(call[2]).isEqualTo("+37250000000");
    }

    @Test
    void deliveryFailureIsLoggedNotThrown() {
        TwilioSmsSender sender = new TwilioSmsSender(new ThrowingTwilioApi(), "MG123", null);

        assertThatCode(() -> sender.send("+37251234567", "OTP")).doesNotThrowAnyException();
    }

    @Test
    void nullPhoneDoesNotExplode() {
        TwilioSmsSender sender = new TwilioSmsSender(new FakeTwilioApi(), "MG123", null);

        assertThatCode(() -> sender.send(null, "OTP")).doesNotThrowAnyException();
    }

    @Test
    void failFastWhenTwilioCredentialsAreMissing() {
        // P2 fix: with app.sms.provider=twilio, missing credentials would make
        // every send fail silently (delivery errors are swallowed) — refuse to
        // start instead.
        assertThatCode(() -> new TwilioSmsSender("", "", "MG123", null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("TWILIO_ACCOUNT_SID");
        assertThatCode(() -> new TwilioSmsSender("AC123", "tok123", "", null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("TWILIO_MESSAGING_SERVICE_SID");
    }
}
