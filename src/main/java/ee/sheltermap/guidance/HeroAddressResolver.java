package ee.sheltermap.guidance;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;

/**
 * Name → addresses seam for the hero-import address policy
 * (guidance-hero-import, guard 3).
 *
 * <p>The import service resolves the URL's host with this seam and runs
 * {@link HeroAddressPolicy} over EVERY resolved address before it fetches
 * the URL — and again for every redirect target, before each hop is
 * fetched. The production implementation is the plain DNS lookup; tests
 * substitute doubles so the policy can be exercised against fixed
 * address sets (and so a full-stack test can model "this name resolves to
 * a private address" without controlling a real DNS zone).
 *
 * <p>This is the same seam discipline the geo resolver applies with its
 * {@code RedirectClient} interface: the service owns the policy, the
 * seam owns the I/O.
 */
@FunctionalInterface
public interface HeroAddressResolver {

    /**
     * @param host the URL's host (the resolver answers for a NAME; IP
     *            literals resolve to themselves, like plain DNS)
     * @return every address the host currently resolves to (never empty)
     * @throws UnknownHostException the name does not resolve — the import
     *                              maps it to the unreachable (502)
     *                              vocabulary, not a 500
     */
    List<InetAddress> resolve(String host) throws UnknownHostException;
}
