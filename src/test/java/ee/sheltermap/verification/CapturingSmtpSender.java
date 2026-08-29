package ee.sheltermap.verification;

import java.util.ArrayList;
import java.util.List;

/** Test double: records every e-mail instead of sending it. */
public class CapturingSmtpSender implements SmtpSender {

    private final List<String> messages = new ArrayList<>();
    private String lastEmail;
    private String lastMessage;

    @Override
    public void send(String email, String message) {
        this.lastEmail = email;
        this.lastMessage = message;
        messages.add(message);
    }

    public String getLastEmail() {
        return lastEmail;
    }

    public String getLastMessage() {
        return lastMessage;
    }

    public List<String> getMessages() {
        return List.copyOf(messages);
    }
}
