package ee.sheltermap.auth;

import ee.sheltermap.verification.SmtpSender;

import java.util.ArrayList;
import java.util.List;

/** Captures sent e-mails for tests (reset tokens travel in the message). */
public class RecordingSmtpSender implements SmtpSender {

    public record Sent(String email, String message) {
    }

    private final List<Sent> sent = new ArrayList<>();
    private boolean refuseNext;

    /**
     * Arms the NEXT send to be refused (returning false, recording nothing —
     * a real channel failure never delivers, so nothing is captured either).
     * Additive: un-armed, this sender behaves exactly as before.
     */
    public RecordingSmtpSender refuseNext() {
        this.refuseNext = true;
        return this;
    }

    @Override
    public boolean send(String email, String message) {
        if (refuseNext) {
            refuseNext = false;
            return false;
        }
        sent.add(new Sent(email, message));
        return true;
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
