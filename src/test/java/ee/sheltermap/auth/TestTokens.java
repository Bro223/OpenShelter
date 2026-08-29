package ee.sheltermap.auth;

/** Extracts the reset token from the URL the {@link RecordingSmtpSender} captured. */
final class TestTokens {

    private TestTokens() {
    }

    static String fromResetUrl(String message) {
        return message.substring(message.indexOf("token=") + "token=".length());
    }
}
