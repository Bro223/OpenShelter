package ee.sheltermap.verification;

/**
 * Lenient E.164 normalization for the SMS channel (Twilio requires E.164).
 *
 * <p>Kept at the channel boundary on purpose: the domain stores whatever the
 * user registered, while the sender always emits E.164. Never throws — a
 * value that cannot be normalized is returned as-is so the flow keeps
 * working for dev fixtures and test data.
 */
public final class PhoneNumbers {

    private PhoneNumbers() {
    }

    /**
     * Normalizes {@code phone} towards E.164:
     * <ul>
     *   <li>strips spaces, dashes, parentheses and dots</li>
     *   <li>{@code 00}-prefix (international dialing) → {@code +}</li>
     *   <li>7–8 digit Estonian local numbers get the {@code +372} default</li>
     *   <li>{@code 372XXXXXXX} without {@code +} → {@code +372XXXXXXX}</li>
     *   <li>already {@code +}… is passed through unchanged</li>
     * </ul>
     */
    public static String normalizeE164(String phone) {
        if (phone == null) {
            return null;
        }
        String cleaned = phone.replaceAll("[\\s\\-().]", "");
        if (cleaned.isEmpty()) {
            return cleaned;
        }
        if (cleaned.startsWith("00") && cleaned.length() > 2) {
            cleaned = "+" + cleaned.substring(2);
        }
        if (cleaned.startsWith("+")) {
            return cleaned;
        }
        if (cleaned.matches("372\\d{7,8}")) {
            return "+" + cleaned;
        }
        if (cleaned.matches("\\d{7,8}")) {
            return "+372" + cleaned;
        }
        return cleaned;
    }
}
