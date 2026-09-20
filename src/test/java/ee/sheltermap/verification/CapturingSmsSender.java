package ee.sheltermap.verification;

import java.util.ArrayList;
import java.util.List;

/** Test double: records every SMS instead of sending it. */
public class CapturingSmsSender implements SmsSender {

    private final List<String> messages = new ArrayList<>();
    private String lastPhone;
    private String lastMessage;

    @Override
    public boolean send(String phone, String message) {
        this.lastPhone = phone;
        this.lastMessage = message;
        messages.add(message);
        return true;
    }

    public String getLastPhone() {
        return lastPhone;
    }

    public String getLastMessage() {
        return lastMessage;
    }

    public List<String> getMessages() {
        return List.copyOf(messages);
    }
}
