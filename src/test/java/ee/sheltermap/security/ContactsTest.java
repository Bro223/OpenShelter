package ee.sheltermap.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The ONE shared contact-identity rule: trim + root-locale
 * lower-case. This spec pins the rule itself; the consumers
 * (registration uniqueness, login/reset rate-limit buckets, the OTP
 * limiter's windows, the alert subject, and
 * {@link PiiCrypto#canonicalEmail} feeding the e-mail hash used for
 * lookups) all call through it, so a drift in any one of them is a
 * compile break, not a silent identity split.
 */
class ContactsTest {

    @Test
    void normalizesTrimAndRootLocaleLowercase() {
        assertThat(Contacts.normalize("  Mari@Example.EE ")).isEqualTo("mari@example.ee");
    }

    @Test
    void usesTheRootLocaleNotTheDefaultLocale() {
        // Locale.ROOT is the point: a Turkish JVM (Locale.TR) would fold
        // the e-mail's I into dottedless i and split the identity from
        // every other consumer's fold. The rule must not follow the OS.
        var saved = java.util.Locale.getDefault();
        try {
            java.util.Locale.setDefault(java.util.Locale.forLanguageTag("tr"));
            assertThat(Contacts.normalize("MARI@EXAMPLE.EE")).isEqualTo("mari@example.ee");
        } finally {
            java.util.Locale.setDefault(saved);
        }
    }

    @Test
    void leavesAnAlreadyCanonicalContactUnchanged() {
        assertThat(Contacts.normalize("mari@example.ee")).isEqualTo("mari@example.ee");
        // E.164 phone spellings (digits + leading +) are unaffected by the
        // fold and must round-trip verbatim.
        assertThat(Contacts.normalize("+3725001001")).isEqualTo("+3725001001");
    }

    @Test
    void aNullContactIsAProgrammingError() {
        assertThatThrownBy(() -> Contacts.normalize(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("contact");
    }
}
