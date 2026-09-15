package ee.sheltermap.auth;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Set;

/**
 * Resolves the real client IP for rate-limit keys.
 *
 * <p><strong>Trust is explicit, hop-by-hop, and config-driven:</strong>
 * <ul>
 *   <li>If the direct peer ({@code getRemoteAddr()}) is <em>not</em> a
 *       configured trusted proxy — and not a trusted loopback — the
 *       {@code X-Forwarded-For} header is <strong>ignored entirely</strong>
 *       (an untrusted client can set it freely) and the peer address is the
 *       key.</li>
 *   <li>If the direct peer <em>is</em> trusted, XFF is walked
 *       <strong>right-to-left</strong>: every hop appends its own peer to
 *       the RIGHT end, so peeling trusted entries from the right yields the
 *       first entry that is NOT a trusted proxy — the real client. If every
 *       entry is trusted (a full chain of our own proxies), the leftmost
 *       non-empty entry (the original client) is used.</li>
 * </ul>
 *
 * <p>Loopback trust (a local nginx in front of the app on 127.0.0.1) is NOT
 * implicit: it is the {@code trustLoopback} argument, bound from
 * {@code app.ratelimit.trust-loopback} (default {@code true} for dev
 * parity) and passed in by the controllers.
 *
 * <p>Without this, (a) every user behind one reverse proxy would share a
 * single bucket keyed on the proxy, and (b) any client could spoof its own
 * rate-limit key via XFF.
 */
public final class ClientIps {

    private ClientIps() {
    }

    /**
     * @param request        the inbound request
     * @param trustedProxies IPs of the trusted reverse proxies (may be empty)
     * @param trustLoopback  whether loopback peers count as trusted proxies
     * @return the client IP to key rate-limit buckets on
     */
    public static String resolve(HttpServletRequest request, Set<String> trustedProxies, boolean trustLoopback) {
        String remote = request.getRemoteAddr();
        if (!isTrustedPeer(remote, trustedProxies, trustLoopback)) {
            // Untrusted peer: XFF is client-settable — ignore it entirely.
            return remote;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded == null || forwarded.isBlank()) {
            return remote;
        }
        String[] entries = forwarded.split(",", -1);
        // Leftmost NON-EMPTY entry — the fallback for a fully-trusted chain.
        String leftmost = null;
        for (String entry : entries) {
            String trimmed = entry.trim();
            if (!trimmed.isEmpty()) {
                leftmost = trimmed;
                break;
            }
        }
        // Peel trusted hops from the right: the first entry (right to left)
        // that is NOT a trusted proxy is the client.
        for (int i = entries.length - 1; i >= 0; i--) {
            String entry = entries[i].trim();
            if (entry.isEmpty()) {
                continue; // tolerate malformed "1.2.3.4, , " padding
            }
            if (!trustedProxies.contains(entry)) {
                return entry;
            }
        }
        return leftmost != null ? leftmost : remote;
    }

    private static boolean isTrustedPeer(String ip, Set<String> trustedProxies, boolean trustLoopback) {
        return trustedProxies.contains(ip) || (trustLoopback && isLoopback(ip));
    }

    private static boolean isLoopback(String ip) {
        return "127.0.0.1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip);
    }
}
