package ee.sheltermap.security;

import java.util.Locale;
import java.util.Objects;

/**
 * The ONE canonical contact-identity rule: trim + {@link Locale#ROOT}
 * lower-case. Every consumer of a contact identity calls through
 * {@link #normalize} — the registration uniqueness check, the login/reset
 * rate-limit buckets, the OTP windows, the alert subject and
 * {@link PiiCrypto#canonicalEmail} feeding the e-mail hash used for
 * lookups — so a drift in any one of them would silently split one human
 * into two identities.
 *
 * <p>Deliberately NOT a Spring bean: pure string rule, nothing to inject.
 * The E.164 phone rule is a DIFFERENT rule (it stays at the login-bucket
 * keying in {@code auth.AuthController}) — this class is the
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
