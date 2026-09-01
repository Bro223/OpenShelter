package ee.sheltermap.verification;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PhoneNumbersTest {

    @Test
    void keepsAlreadyE164Unchanged() {
        assertThat(PhoneNumbers.normalizeE164("+37251234567")).isEqualTo("+37251234567");
    }

    @Test
    void stripsSpacesDashesAndParentheses() {
        assertThat(PhoneNumbers.normalizeE164("+372 5123 4567")).isEqualTo("+37251234567");
        assertThat(PhoneNumbers.normalizeE164("+372-5123-4567")).isEqualTo("+37251234567");
        assertThat(PhoneNumbers.normalizeE164("+372 (5123) 4567")).isEqualTo("+37251234567");
    }

    @Test
    void addsEstonianCountryCodeToLocalNumbers() {
        assertThat(PhoneNumbers.normalizeE164("51234567")).isEqualTo("+37251234567");
        assertThat(PhoneNumbers.normalizeE164("5123456")).isEqualTo("+3725123456");
    }

    @Test
    void addsPlusToCountryCodeWithoutIt() {
        assertThat(PhoneNumbers.normalizeE164("37251234567")).isEqualTo("+37251234567");
    }

    @Test
    void convertsInternationalDialingPrefix() {
        assertThat(PhoneNumbers.normalizeE164("0037251234567")).isEqualTo("+37251234567");
    }

    @Test
    void neverThrowsOnGarbageOrNull() {
        assertThat(PhoneNumbers.normalizeE164(null)).isNull();
        assertThat(PhoneNumbers.normalizeE164("")).isEmpty();
        assertThat(PhoneNumbers.normalizeE164("not a number")).isEqualTo("notanumber");
    }
}
