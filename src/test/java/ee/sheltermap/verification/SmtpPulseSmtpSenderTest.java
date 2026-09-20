package ee.sheltermap.verification;

import ee.sheltermap.app.AppInfo;
import ee.sheltermap.testutil.FakeJavaMailSender;
import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Unit tests for {@link SmtpPulseSmtpSender} — no Mockito (keeps the suite
 * JDK-agnostic; see RegistrySchedulerTest for the same convention). The
 * capturing {@link FakeJavaMailSender} is shared via {@code testutil}.
 */
class SmtpPulseSmtpSenderTest {

    @Test
    void sendsTokenToRecipient() {
        FakeJavaMailSender mail = new FakeJavaMailSender();
        SmtpPulseSmtpSender sender = new SmtpPulseSmtpSender(mail, "shelter-map@example.com");

        boolean accepted = sender.send("mari@example.ee", "OpenShelter verification code: abc12345");

        assertThat(accepted).isTrue(); // the channel accepted the message
        assertThat(mail.last).isNotNull();
        assertThat(mail.last.getFrom()).isEqualTo("shelter-map@example.com");
        assertThat(mail.last.getTo()).containsExactly("mari@example.ee");
        assertThat(mail.last.getSubject()).isEqualTo(AppInfo.APP_DISPLAY_NAME);
        assertThat(mail.last.getText()).contains("abc12345");
    }

    @Test
    void deliveryFailureIsLoggedNotThrown() {
        // A sender whose JavaMailSender throws on send: the contract is
        // "reset/verify always succeeds" — failures are logged, never surface
        // as an exception; the FALSE return value is the honest signal the
        // verification flow uses to skip the daily-slot record.
        FakeJavaMailSender mail = new FakeJavaMailSender() {
            @Override
            public void send(SimpleMailMessage simpleMessage) {
                throw new org.springframework.mail.MailSendException("relay down");
            }
        };
        SmtpPulseSmtpSender sender = new SmtpPulseSmtpSender(mail, "shelter-map@example.com");

        // Must not throw despite the failing relay — and must report the refusal.
        assertThatCode(() -> sender.send("mari@example.ee", "OpenShelter verification code: abc12345"))
                .doesNotThrowAnyException();
        assertThat(sender.send("mari@example.ee", "OpenShelter verification code: abc12345"))
                .isFalse();
    }
}
