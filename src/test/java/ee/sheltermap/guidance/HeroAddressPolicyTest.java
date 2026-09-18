package ee.sheltermap.guidance;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The SSRF address classifier (guidance-hero-import, guard 3) against REAL
 * {@link InetAddress} literals (no DNS): every family the import must
 * refuse — loopback, RFC 1918 private, link-local (incl. the cloud-
 * metadata 169.254.169.254 and its IPv4-mapped IPv6 form), unique-local
 * (incl. the AWS metadata form fd00:ec2::254), multicast, unspecified —
 * and the public addresses that must pass.
 */
class HeroAddressPolicyTest {

    private static InetAddress byName(String literal) throws UnknownHostException {
        return InetAddress.getByName(literal);
    }

    @ParameterizedTest
    @CsvSource({
            // loopback
            "127.0.0.1",
            "127.5.6.7",
            "::1",
            // unspecified
            "0.0.0.0",
            "::",
            // private (RFC 1918)
            "10.0.0.5",
            "172.16.0.1",
            "172.31.255.255",
            "192.168.1.1",
            // link-local IPv4 (includes the cloud-metadata 169.254.169.254)
            "169.254.1.1",
            "169.254.169.254",
            // link-local IPv6
            "fe80::1",
            "febf::1",
            // unique-local IPv6 (fc00::/7 — includes the AWS metadata
            // fd00:ec2::254)
            "fc00::1",
            "fd00::1",
            "fd12:3456:789a::1",
            "fd00:ec2::254",
            // multicast
            "224.0.0.1",
            "239.255.255.255",
            "ff02::1",
            // private/loopback smuggled in IPv4-mapped IPv6 form
            "::ffff:127.0.0.1",
            "::ffff:10.1.2.3",
            "::ffff:169.254.169.254",
    })
    void aDisallowedAddressYieldsAReason(String literal) throws Exception {
        InetAddress address = byName(literal);
        assertThat(HeroAddressPolicy.disallowedReason(address))
                .as("address %s must be refused with a reason", literal)
                .isNotNull();
    }

    @ParameterizedTest
    @CsvSource({
            // public unicast — importable
            "8.8.8.8",
            "93.184.216.34",
            "1.1.1.1",
            "255.255.255.254", // public, non-broadcast edge — not in the refuse list
            "2001:4860:4860::8888",
            "2606:4700:4700::1111",
    })
    void aPublicAddressIsAllowed(String literal) throws Exception {
        InetAddress address = byName(literal);
        assertThat(HeroAddressPolicy.disallowedReason(address))
                .as("address %s must be allowed", literal)
                .isNull();
    }

    @ParameterizedTest
    @NullSource
    void aMissingAddressIsRefusedToo(InetAddress address) {
        // Defensive: a resolver seam must never hand the service null.
        assertThat(HeroAddressPolicy.disallowedReason(address)).isNotNull();
    }

    /** The classifier never throws on well-formed addresses — it reports. */
    @org.junit.jupiter.api.Test
    void theClassifierNeverThrowsOnLiterals() {
        Stream.of("127.0.0.1", "8.8.8.8", "::1", "fe80::1").forEach(literal -> {
            try {
                HeroAddressPolicy.disallowedReason(byName(literal));
            } catch (UnknownHostException e) {
                throw new AssertionError("fixture literal " + literal + " failed", e);
            } catch (RuntimeException e) {
                throw new AssertionError("classifier threw for " + literal, e);
            }
        });
    }
}
