package ee.sheltermap.app;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Parsing of comma-separated {@code @Value} config lists (trusted
 * proxies, dev-test allowed recipients, CORS origins). One spelling of
 * the trim + drop-empty rule; a blank property value is the empty
 * list/set, and the results are unmodifiable.
 */
public final class CommaSeparated {

    private CommaSeparated() {
    }

    /** Trimmed, non-empty entries in order (an empty value is an empty list). */
    public static List<String> parseList(String raw) {
        Objects.requireNonNull(raw, "raw");
        return Stream.of(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    /** The {@link #parseList} entries as an unmodifiable set. */
    public static Set<String> parseSet(String raw) {
        return parseList(raw).stream().collect(Collectors.toUnmodifiableSet());
    }

    /** The {@link #parseList} entries lowercased with {@link Locale#ROOT}, as an unmodifiable set. */
    public static Set<String> parseSetLowerCase(String raw) {
        return parseList(raw).stream()
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }
}
