package ee.sheltermap.auth;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Set;

/**
 * Resolves the real client IP for rate-limit keys (hardening pass).
 *
 * <p>Without this, every user behind a reverse proxy (nginx etc.) shares one
 * bucket keyed on {@code getRemoteAddr()} — one person exhausting the bucket
 * locks out everyone. The {@code X-Forwarded-For} header is honored ONLY when
 * the direct peer is a configured trusted proxy (or loopback, for local
 * nginx setups); otherwise it is ignored so clients cannot spoof their key.
 */
public final class ClientIps {

    private ClientIps() {
    }

    /**
     * @param trustedProxies IPs of the trusted reverse proxies (may be empty)
     * @return the client IP to key rate-limit buckets on
     */
    public static String resolve(HttpServletRequest request, Set<String> trustedProxies) {
        String remote = request.getRemoteAddr();
        if (isLoopback(remote) || trustedProxies.contains(remote)) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                // The left-most entry is the original client; strip whitespace.
                String client = forwarded.split(",")[0].trim();
                if (!client.isEmpty()) {
                    return client;
                }
            }
        }
        return remote;
    }

    private static boolean isLoopback(String ip) {
        return "127.0.0.1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip);
    }
}
