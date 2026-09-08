package ee.sheltermap.auth;

/** Extracts the 6-digit reset code from the e-mail {@link RecordingSmtpSender} captured. */
final class TestTokens {

    private TestTokens() {
    }

    static String fromResetEmail(String message) {
        int start = message.indexOf("code: ") + "code: ".length();
        return message.substring(start, start + 6);
    }
}
