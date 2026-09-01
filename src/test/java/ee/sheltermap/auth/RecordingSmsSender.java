package ee.sheltermap.auth;

import ee.sheltermap.verification.SmsSender;

import java.util.ArrayList;
import java.util.List;

/** Captures sent SMS messages for tests (OTP codes travel in the message). */
public class RecordingSmsSender implements SmsSender {

    public record Sent(String phone, String message) {
    }

    private final List<Sent> sent = new ArrayList<>();

    @Override
    public void send(String phone, String message) {
        sent.add(new Sent(phone, message));
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
