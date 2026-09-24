package ee.sheltermap.security;

import java.util.Locale;
import java.util.Objects;

/**
 * The ONE canonical contact-identity rule: trim +
 * {@link Locale#ROOT} lower-case. Before this extraction the same
 * two-liner had a private copy in {@code verification.RollingContactOtpLimiter}
 * and {@code alerts.ThrottleAlertRecorder} and was inlined in
 * {@code auth.AuthService}, {@code auth.ContactChangeService},
 * {@code auth.AuthController} and here in
 * {@link PiiCrypto#canonicalEmail} — the last of which feeds the e-mail
 * HASH USED FOR LOOKUPS, so a drift in any one copy would silently split
 * one human into two identities between the registration uniqueness
 * check, the rate-limit buckets, the OTP windows, the alert subject and
 * the blind index. Every consumer now calls through this one method;
 * the per-class copies are gone.
 *
 * <p>Deliberately NOT a Spring bean: pure string rule, nothing to inject.
 * The E.164 phone branch ({@code auth.AuthController}'s login-bucket
 * keying) is a DIFFERENT rule and stays where it is — this class is the
 * e-mail/contact case-fold only.
 */
public final class Contacts {

    private Contacts() {
    }

    /** Trim + root-locale lower-case; a null contact is a programming error. */
    public static String normalize(String contact) {
        Objects.requireNonNull(contact, "contact");
        return contact.trim().toLowerCase(Locale.ROOT);
    }
}
