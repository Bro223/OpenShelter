package ee.sheltermap.verification;

import ee.sheltermap.testutil.FakeJavaMailSender;
import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;

import static org.assertj.core.api.Assertions.assertThat;

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

        sender.send("mari@example.ee", "Shelter Map verification token: abc12345");

        assertThat(mail.last).isNotNull();
        assertThat(mail.last.getFrom()).isEqualTo("shelter-map@example.com");
        assertThat(mail.last.getTo()).containsExactly("mari@example.ee");
        assertThat(mail.last.getSubject()).isEqualTo("Shelter Map");
        assertThat(mail.last.getText()).contains("abc12345");
    }

    @Test
    void deliveryFailureIsLoggedNotThrown() {
        // A sender whose JavaMailSender throws on send: the contract is
        // "reset/verify always succeeds" — failures are logged, never surface.
        FakeJavaMailSender mail = new FakeJavaMailSender() {
            @Override
            public void send(SimpleMailMessage simpleMessage) {
                throw new org.springframework.mail.MailSendException("relay down");
            }
        };
        SmtpPulseSmtpSender sender = new SmtpPulseSmtpSender(mail, "shelter-map@example.com");

        // Must not throw despite the failing relay.
        sender.send("mari@example.ee", "Shelter Map verification token: abc12345");
    }
}
