package ee.sheltermap.guidance;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * The SSRF address classifier (guard 3 of the hero import — the core
 * of the feature's security).
 *
 * <p>Given ONE resolved address it answers whether it is importable, and
 * WHY not: loopback, private (RFC 1918), link-local ({@code 169.254.0.0/16}
 * — which includes the cloud-metadata address {@code 169.254.169.254}, and
 * {@code fe80::/10}), unique-local ({@code fc00::/7} — which includes the
 * AWS IPv6 metadata form {@code fd00:ec2::254}), multicast or
 * unspecified ({@code 0.0.0.0} / {@code ::}). The caller resolves the
 * host and refuses the fetch when ANY resolved address is disallowed —
 * a name round-robining a public and a private address is rejected, not
 * averaged.
 *
 * <p>The classifier works on {@link InetAddress} VALUES, so it is fully
 * unit-testable with literals (no DNS): the {@code DnsHeroAddressResolver}
 * production seam and the test doubles feed it the same type.
 */
public final class HeroAddressPolicy {

    private HeroAddressPolicy() {
    }

    /**
     * @param address one resolved address of the URL's host
     * @return a human-readable reason the address must not be fetched
     *         (shown in the admin-facing 400), or {@code null} when the
     *         address is importable
     */
    public static String disallowedReason(InetAddress address) {
        if (address == null) {
            return "missing address";
        }
        // The JDK methods below cover the IPv4 families and the common
        // IPv6 families; the explicit prefix checks after them cover what
        // they do not.
        if (address.isLoopbackAddress()) {
            // 127.0.0.0/8 and ::1 — the server itself (its admin API, its
            // own media endpoint, anything the network can reach that the
            // internet cannot).
            return "loopback";
        }
        if (address.isAnyLocalAddress()) {
            // 0.0.0.0 / :: — "unspecified" is not a destination.
            return "unspecified address";
        }
        if (address.isLinkLocalAddress()) {
            // 169.254.0.0/16 — includes the cloud-metadata address
            // 169.254.169.254 (instance credentials) — and fe80::/10.
            return "link-local (169.254.0.0/16 — includes the cloud-metadata address 169.254.169.254 — or fe80::/10)";
        }
        if (address.isSiteLocalAddress()) {
            // RFC 1918: 10/8, 172.16/12, 192.168/16 — the internal network.
            return "private (RFC 1918)";
        }
        if (address.isMulticastAddress()) {
            // 224.0.0.0/4 and ff00::/8 — not a fetch destination.
            return "multicast";
        }
        if (address instanceof Inet6Address v6) {
            byte[] bytes = v6.getAddress();
            // fc00::/7 — unique-local (the IPv6 "RFC 1918"). The JDK has no
            // isUniqueLocalAddress; the first 7 bits 1111 110 catch both
            // fc00::/8 and fd00::/8, which includes the AWS IPv6
            // cloud-metadata address fd00:ec2::254.
            if ((bytes[0] & 0xFE) == 0xFC) {
                return "unique-local (fc00::/7 — includes the cloud-metadata IPv6 form fd00:ec2::254)";
            }
            // IPv4-mapped ::ffff:a.b.c.d — unwrap and classify as IPv4,
            // otherwise a loopback or private address smuggled in mapped
            // form would sail past every check above.
            if (isIpv4Mapped(bytes)) {
                InetAddress mapped;
                try {
                    mapped = InetAddress.getByAddress(new byte[]{bytes[12], bytes[13], bytes[14], bytes[15]});
                } catch (UnknownHostException impossible) {
                    return "unparseable address";
                }
                return disallowedReason(mapped);
            }
        }
        return null;
    }

    private static boolean isIpv4Mapped(byte[] bytes) {
        for (int i = 0; i < 10; i++) {
            if (bytes[i] != 0) {
                return false;
            }
        }
        return bytes[10] == 0xFF && bytes[11] == 0xFF;
    }
}
