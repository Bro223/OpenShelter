package ee.sheltermap.guidance;

import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;

/**
 * The production {@link HeroAddressResolver}: the JVM's own DNS.
 *
 * <p>{@code getAllByName} answers the literal itself for IP literals
 * (no query) and the full answer set — A and AAAA alike — for names, so
 * the policy's "reject when ANY resolved address is disallowed" rule sees
 * every address a connection could land on, not one lucky pick.
 */
@Component
public class DnsHeroAddressResolver implements HeroAddressResolver {

    @Override
    public List<InetAddress> resolve(String host) throws UnknownHostException {
        return List.of(InetAddress.getAllByName(host));
    }
}
