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
     *   <li>7–8 digit numbers are treated as national format and get the
     *       {@code +372} default — EXCEPT numbers starting with {@code 372}
     *       (e.g. {@code 37212345}), which are ambiguous: prefixing them
     *       again ({@code +37237212345}) would misroute to Estonia. Those are
     *       left as-is so the SMS channel surfaces the invalid number instead
     *       of silently sending it to the wrong country (P2 fix)</li>
     *   <li>{@code 372XXXXXXX} (country code typed without {@code +}) →
     *       {@code +372XXXXXXX}</li>
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
            // country code typed without the '+': 372 + 7-8 subscriber digits
            return "+" + cleaned;
        }
        if (cleaned.matches("\\d{7,8}") && !cleaned.startsWith("372")) {
            // national-format subscriber number -> default +372 country code.
            // Numbers starting with 372 are ambiguous (see class javadoc) and
            // are deliberately NOT prefixed again.
            return "+372" + cleaned;
        }
        return cleaned;
    }
}
