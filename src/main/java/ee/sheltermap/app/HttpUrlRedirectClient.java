package ee.sheltermap.app;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;

/**
 * The real {@link RedirectClient} over {@link HttpURLConnection}
 * (shelter-location-input, design decision 4):
 *
 * <ul>
 *   <li>3 s connect / 5 s read timeouts;</li>
 *   <li>redirects are NOT auto-followed ({@code setInstanceFollowRedirects(false)})
 *       — the service reads the {@code Location} header itself and enforces
 *       the ≤3-hop cap;</li>
 *   <li>no cookies — {@code HttpURLConnection} does not manage cookies unless
 *       a global {@code CookieHandler} is installed, and this app never
 *       installs one;</li>
 *   <li>a fixed User-Agent identifies the resolver upstream.</li>
 * </ul>
 */
@Component
public class HttpUrlRedirectClient implements RedirectClient {

    static final int CONNECT_TIMEOUT_MILLIS = 3_000;
    static final int READ_TIMEOUT_MILLIS = 5_000;
    static final String USER_AGENT = "OpenShelter/1.0 (location resolver)";

    @Override
    public RedirectHop fetch(String url) throws IOException {
        URL target;
        try {
            target = new URI(url).toURL();
        } catch (URISyntaxException e) {
            throw new IOException("unfetchable redirect target: " + url, e);
        }
        HttpURLConnection connection = (HttpURLConnection) target.openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(CONNECT_TIMEOUT_MILLIS);
        connection.setReadTimeout(READ_TIMEOUT_MILLIS);
        connection.setRequestMethod("GET");
        connection.setRequestProperty("User-Agent", USER_AGENT);
        try {
            // Only the status line + headers are needed — never the body
            // (the coordinate pair is read from the URL, not the payload).
            int status = connection.getResponseCode();
            return new RedirectHop(status, connection.getHeaderField("Location"));
        } finally {
            connection.disconnect();
        }
    }
}
