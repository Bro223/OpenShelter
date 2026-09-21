package ee.sheltermap.auth;

import ee.sheltermap.verification.SmsSender;

import java.util.ArrayList;
import java.util.List;

/** Captures sent SMS messages for tests (OTP codes travel in the message). */
public class RecordingSmsSender implements SmsSender {

    public record Sent(String phone, String message) {
    }

    private final List<Sent> sent = new ArrayList<>();
    private boolean refuseNext;

    /**
     * Arms the NEXT send to be refused (returning false, recording nothing —
     * a real channel failure never delivers, so nothing is captured either).
     * Additive: un-armed, this sender behaves exactly as before.
     */
    public RecordingSmsSender refuseNext() {
        this.refuseNext = true;
        return this;
    }

    @Override
    public boolean send(String phone, String message) {
        if (refuseNext) {
            refuseNext = false;
            return false;
        }
        sent.add(new Sent(phone, message));
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
