package ee.sheltermap.verification;

/**
 * The wrong-code lockout bound shared by every single-use code surface —
 * e-mail verification, phone OTP and password reset (the auth side imports
 * it rather than keeping a copy: auth already sits above verification in
 * the dependency rule). Security-relevant (the brute-force bound), so one
 * spelling: five wrong entries and the code stops being accepted.
 */
public final class CodePolicy {

    /** Wrong entries that lock a code out — the 5th wrong guess is refused. */
    public static final int MAX_ATTEMPTS = 5;

    private CodePolicy() {
    }
}
