package ee.sheltermap.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the XFF-aware client-IP resolution (S2 — 2026-09-08
 * review W2): untrusted peers ignore XFF entirely; trusted peers peel
 * trusted hops RIGHT-TO-LEFT; loopback trust is config-driven.
 */
class ClientIpsTest {

    private static final Set<String> PROXIES = Set.of("10.0.0.1", "192.168.1.1");

    private static HttpServletRequest request(String remoteAddr, String xff) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        if (xff != null) {
            request.addHeader("X-Forwarded-For", xff);
        }
        return request;
    }

    // ---- Untrusted peer: XFF is client-settable and must be ignored ----

    @Test
    void untrustedPeerIgnoresXffAndUsesRemoteAddr() {
        HttpServletRequest request = request("203.0.113.7", "10.0.0.1, 8.8.8.8");
        assertThat(ClientIps.resolve(request, PROXIES, true)).isEqualTo("203.0.113.7");
    }

    @Test
    void untrustedPeerWithSpooferLeftmostEntryStillUsesRemoteAddr() {
        // attacker puts their own address at the LEFT (client) position —
        // it must not be used, because the peer itself is untrusted
        HttpServletRequest request = request("203.0.113.7", "1.2.3.4, 10.0.0.1");
        assertThat(ClientIps.resolve(request, PROXIES, true)).isEqualTo("203.0.113.7");
    }

    @Test
    void untrustedPeerWithoutXffUsesRemoteAddr() {
        assertThat(ClientIps.resolve(request("198.51.100.9", null), PROXIES, true))
                .isEqualTo("198.51.100.9");
    }

    // ---- Trusted peer: peel trusted hops right-to-left ----

    @Test
    void trustedPeerPelsTrustedHopsRightToLeft() {
        // client 203.0.113.9 -> 10.0.0.1 (trusted) -> 192.168.1.1 (trusted, direct peer)
        HttpServletRequest request = request("192.168.1.1", "203.0.113.9, 10.0.0.1, 192.168.1.1");
        assertThat(ClientIps.resolve(request, PROXIES, true)).isEqualTo("203.0.113.9");
    }

    @Test
    void trustedPeerReturnsFirstUntrustedEntryEvenIfMiddle() {
        // two untrusted entries: the one closest to us (right) is the hop
        // that our proxy directly saw — the leftmost is the ORIGINAL client
        // and must win only after peeling the trusted hops on the right.
        HttpServletRequest request = request("10.0.0.1", "203.0.113.9, 198.51.100.4");
        assertThat(ClientIps.resolve(request, PROXIES, true)).isEqualTo("198.51.100.4");
    }

    @Test
    void fullyTrustedChainFallsBackToLeftmostEntry() {
        Set<String> chain = Set.of("10.0.0.1", "10.0.0.2", "10.0.0.3");
        HttpServletRequest request = request("10.0.0.1", "10.0.0.2, 10.0.0.3");
        assertThat(ClientIps.resolve(request, chain, true)).isEqualTo("10.0.0.2");
    }

    @Test
    void trustedPeerWithBlankXffFallsBackToPeer() {
        assertThat(ClientIps.resolve(request("10.0.0.1", ""), PROXIES, true)).isEqualTo("10.0.0.1");
        assertThat(ClientIps.resolve(request("10.0.0.1", "   "), PROXIES, true)).isEqualTo("10.0.0.1");
    }

    @Test
    void malformedEntriesAreTolerated() {
        // spaces + empty entries + trailing comma
        HttpServletRequest request = request("10.0.0.1", " 203.0.113.9 , , ");
        assertThat(ClientIps.resolve(request, PROXIES, true)).isEqualTo("203.0.113.9");
    }

    @Test
    void trustedPeerWithOnlyBlankXffEntriesFallsBackToPeer() {
        assertThat(ClientIps.resolve(request("10.0.0.1", ", , "), PROXIES, true)).isEqualTo("10.0.0.1");
    }

    // ---- Loopback trust is config-driven ----

    @Test
    void loopbackIsTrustedOnlyWhenConfigured() {
        HttpServletRequest fromLoopback = request("127.0.0.1", "203.0.113.55");
        assertThat(ClientIps.resolve(fromLoopback, PROXIES, true)).isEqualTo("203.0.113.55");
        assertThat(ClientIps.resolve(fromLoopback, PROXIES, false)).isEqualTo("127.0.0.1");
    }

    @Test
    void ipv6LoopbackFollowsTheSameSwitch() {
        HttpServletRequest fromV6 = request("::1", "203.0.113.56");
        assertThat(ClientIps.resolve(fromV6, PROXIES, true)).isEqualTo("203.0.113.56");
        assertThat(ClientIps.resolve(fromV6, PROXIES, false)).isEqualTo("::1");
    }

    @Test
    void configuredProxyNeedsNoLoopbackTrust() {
        HttpServletRequest fromProxy = request("10.0.0.1", "203.0.113.57");
        assertThat(ClientIps.resolve(fromProxy, PROXIES, false)).isEqualTo("203.0.113.57");
    }
}
