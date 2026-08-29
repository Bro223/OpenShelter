package ee.sheltermap.auth;

import ee.sheltermap.verification.SmtpSender;

import java.util.ArrayList;
import java.util.List;

/** Captures sent e-mails for tests (reset tokens travel in the message). */
public class RecordingSmtpSender implements SmtpSender {

    public record Sent(String email, String message) {
    }

    private final List<Sent> sent = new ArrayList<>();

    @Override
    public void send(String email, String message) {
        sent.add(new Sent(email, message));
    }

    public List<Sent> sent() {
        return List.copyOf(sent);
    }

    public Sent last() {
        return sent.isEmpty() ? null : sent.get(sent.size() - 1);
    }

    public void clear() {
        sent.clear();
    }
}
