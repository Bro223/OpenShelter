package ee.sheltermap.guidance;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

/**
 * The single producer of a guidance post's {@code body_html}
 * (crisis-guidance D2): every body write (create AND update) runs through
 * this allowlist before it is stored, so the column holds sanitizer
 * output only — the same value every future reader gets, and a payload
 * posted by any client (a direct API call that never touched the
 * frontend editor included) cannot persist.
 *
 * <p>The allowlist is declarative on a jsoup {@link Safelist}:
 * <ul>
 * <li>elements: {@code h2 h3 p br strong em ul ol li a blockquote} — and
 *     nothing else. No {@code h1} (the page owns the single
 *     {@code h1}), no inline {@code img} (images are hero-only), no
 *     {@code table}, no {@code iframe}, no {@code svg}, no {@code
 *     style}, no {@code script}.</li>
 * <li>attributes: exactly {@code a[href]}. An event handler IS an
 *     attribute, so the attribute allowlist removes it — there is no
 *     separate handler rule to get wrong. No {@code class}, no
 *     {@code style}, no {@code id}, no {@code target} — links stay in
 *     the same tab, so no {@code rel="noopener"} obligation is created.</li>
 * <li>{@code href} protocols: {@code http}, {@code https},
 *     {@code mailto}. A {@code javascript:} or {@code data:} href is
 *     dropped.</li>
 * </ul>
 *
 * <p>Why a library and not a hand-rolled parser (D2): sanitizer bypasses
 * come from parser DIFFERENTIALS between what the sanitizer sees and what
 * the browser executes, so the parser itself must be a maintained
 * implementation. This repo hand-rolls a lot (the token-bucket limiter,
 * the redirect client, coordinate parsing) and that habit is right for
 * small deterministic rules — an HTML sanitizer is the opposite case.
 *
 * <p>Disallowed markup is unwrapped (its text survives) except content
 * elements like {@code script}/{@code style}, which are dropped together
 * with their content. The exact treatment is pinned by
 * {@code BodySanitizerTest} — the tests are the specification of this
 * unit, not just a smoke test.
 */
public final class BodySanitizer {

    /**
     * The frozen allowlist (crisis-guidance D2): elements {@code
     * h2 h3 p br strong em ul ol li a blockquote}, exactly
     * {@code a[href]}, protocols {@code http|https|mailto}.
     */
    private static final Safelist SAFE = Safelist.none()
            .addTags("h2", "h3", "p", "br", "strong", "em", "ul", "ol", "li", "a", "blockquote")
            .addAttributes("a", "href")
            .addProtocols("a", "href", "http", "https", "mailto");

    private BodySanitizer() {
    }

    /**
     * Sanitize an admin-submitted body. The server is the authority: the
     * client (editor or curl) is never the boundary.
     *
     * @param rawHtml the submitted body HTML
     * @return the sanitized HTML to store; {@code null}/blank input
     *         yields {@code ""}
     */
    public static String sanitize(String rawHtml) {
        if (rawHtml == null || rawHtml.isBlank()) {
            return "";
        }
        return Jsoup.clean(rawHtml, SAFE);
    }
}
