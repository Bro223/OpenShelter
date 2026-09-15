package ee.sheltermap.testutil;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/**
 * Capturing {@link org.springframework.mail.javamail.JavaMailSender} — records
 * the last message instead of dialling out. Shared by the SMTP tests so the
 * fake lives in exactly one place, not one copy per test class. No Mockito —
 * stays JDK-agnostic.
 */
public class FakeJavaMailSender extends JavaMailSenderImpl {

    public SimpleMailMessage last;

    @Override
    public void send(SimpleMailMessage simpleMessage) {
        this.last = simpleMessage;
    }
}
