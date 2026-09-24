package ee.sheltermap.guidance;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The specification of the sanitizer: the exact
 * treatment of disallowed markup is pinned here rather than asserted in
 * the design — the allowlist, the protocol rules, malformed markup,
 * idempotence and the usual XSS kit.
 */
class BodySanitizerTest {

    private static final Set<String> DISALLOWED_TAGS =
            Set.of("h1", "img", "table", "iframe", "svg", "style", "script");

    private static String sanitize(String raw) {
        return BodySanitizer.sanitize(raw);
    }

    private static Document parsed(String html) {
        return Jsoup.parseBodyFragment(html);
    }

    @Test
    void allowlistedElementsSurvive() {
        String in = "<h2>Heading two</h2>"
                + "<h3>Heading three</h3>"
                + "<p>Text with <strong>bold</strong> and <em>italic</em>.</p>"
                + "<ul><li>one</li><li>two</li></ul>"
                + "<ol><li>first</li></ol>"
                + "<blockquote>quoted</blockquote>"
                + "<p>Line with a<br>break and a <a href=\"https://example.com/a\">link</a>.</p>";
        String out = sanitize(in);
        for (String tag : List.of("<h2>", "<h3>", "<p>", "<br>", "<strong>", "<em>",
                "<ul>", "<ol>", "<li>", "<blockquote>")) {
            assertThat(out).as("tag %s", tag).contains(tag);
        }
        assertThat(out).contains("href=\"https://example.com/a\"");
        for (String text : List.of("Heading two", "bold", "italic", "one", "first", "quoted", "link")) {
            assertThat(out).as("text %s", text).contains(text);
        }
    }

    @Test
    void disallowedElementsDoNotSurvive() {
        String in = "<h1>The page owns the single h1</h1>"
                + "<p><img src=\"https://x/y.jpg\">no inline images</p>"
                + "<table><tr><td>cells</td></tr></table>"
                + "<iframe src=\"https://evil.example\"></iframe>"
                + "<svg width=\"10\"><rect width=\"10\" height=\"10\"/></svg>"
                + "<style>body{display:none}</style>"
                + "<script>alert(1)</script>"
                + "<p>kept</p>";
        String out = sanitize(in);
        for (String tag : DISALLOWED_TAGS) {
            assertThat(out.toLowerCase()).as("tag <%s>", tag).doesNotContain("<" + tag);
        }
        // script and style content is dropped outright, not unwrapped
        assertThat(out.toLowerCase()).doesNotContain("alert(1)");
        assertThat(out.toLowerCase()).doesNotContain("display:none");
        // the surrounding text of unwrapped elements survives
        assertThat(out).contains("<p>");
        assertThat(out).contains("kept");
        assertThat(out).contains("no inline images");
    }

    @Test
    void eventHandlersAndInlineStyleDoNotSurvive() {
        String in = "<p onclick=\"alert(1)\">clicked</p>"
                + "<p onerror=\"alert(2)\">broken</p>"
                + "<div onload=\"alert(3)\">loaded</div>"
                + "<p style=\"color:red\">colored</p>"
                + "<a href=\"https://example.com\" target=\"_blank\">new tab</a>";
        String out = sanitize(in);
        // attribute presence is checked structurally: escaped inert text can
        // legitimately contain the raw attribute-name strings
        Document doc = parsed(out);
        assertThat(doc.select("[onerror],[onclick],[onload],[onmouseover],[onfocus]")).isEmpty();
        assertThat(doc.select("[style]")).isEmpty();
        // no target: links stay in the same tab
        assertThat(doc.select("[target]")).isEmpty();
        assertThat(out).contains("clicked");
        assertThat(out).contains("colored");
        assertThat(out).contains("new tab");
    }

    @Test
    void hrefProtocolAllowlist() {
        String in = "<a href=\"javascript:alert(1)\">js</a> "
                + "<a href=\"data:text/html;base64,PHNjcmlwdD4=\">data</a> "
                + "<a href=\"https://www.paasteamet.ee/\">https</a> "
                + "<a href=\"http://example.org/\">http</a> "
                + "<a href=\"mailto:info@example.ee\">mail</a>";
        String out = sanitize(in);
        assertThat(out.toLowerCase()).doesNotContain("javascript:");
        assertThat(out.toLowerCase()).doesNotContain("data:");
        assertThat(out).contains("https://www.paasteamet.ee/");
        assertThat(out).contains("http://example.org/");
        assertThat(out).contains("mailto:info@example.ee");
    }

    @Test
    void malformedAndUnclosedMarkupIsHandled() {
        String out = sanitize("<h2>Unclosed heading<p>Broken list <ul><li>a<li>b");
        assertThat(out).contains("<h2>");
        assertThat(out).contains("<p>");
        assertThat(out).contains("<ul>");
        assertThat(out).contains("Unclosed heading");
        assertThat(out).contains("Broken list");
        // the output itself must be well-formed (parses without error)
        Document doc = parsed(out);
        assertThat(doc.select("h2, p, ul").size()).isGreaterThan(0);
    }

    @Test
    void nullAndBlankInputYieldEmptyString() {
        assertThat(sanitize(null)).isEmpty();
        assertThat(sanitize("")).isEmpty();
        assertThat(sanitize("   ")).isEmpty();
    }

    @Test
    void sanitizingTwiceChangesNothing() {
        List<String> inputs = List.of(
                "<h2>Heading</h2><p>Text <strong>bold</strong></p><br>"
                        + "<a href=\"https://example.com\">link</a>",
                "<h1>bad</h1><script>alert(1)</script><p onclick=\"x\">kept</p>",
                "<a href=\"javascript:alert(1)\">js</a>"
                        + "<a href=\"mailto:x@y.ee\">ok</a>",
                "<div><table><tr><td>cell</td></tr></table></div>",
                "Plain text without any tags",
                "&lt;img src=x onerror=alert(1)&gt;",
                "<p>Trailing entities: &amp;nbsp; &amp;eacute;</p>");
        for (String in : inputs) {
            String once = sanitize(in);
            String twice = sanitize(once);
            assertThat(twice).as("idempotent for: %s", in).isEqualTo(once);
        }
    }

    @Test
    void xssKitYieldsNoScriptNodeAndNoHandlerAttribute() {
        String payload = "<img src=x onerror=alert(1)> "
                + "<svg/onload=alert(2)> "
                + "<ScRiPt>alert(3)</ScRiPt> "
                + "<A HREF=\"JavaScript:alert(4)\">uppercase</A> "
                + "<a href=\"jAvAsCr1pt:alert(5)\">mixed</a> "
                + "&lt;img src=x onerror=alert(6)&gt; "
                + "<div ONCLICK=\"alert(7)\">attrs</div>";
        String out = sanitize(payload);
        // The sanitizer escapes disallowed markup into inert text, so raw
        // payload strings (e.g. "onerror" inside "&lt;img src=x onerror=...&gt;")
        // legitimately reappear in the serialized output. Assert on the
        // parsed tree, not on substrings.
        Document doc = parsed(out);
        assertThat(doc.select("script, iframe, svg, style, img, table")).isEmpty();
        assertThat(doc.select("[onerror],[onclick],[onload],[onmouseover],[onfocus]")).isEmpty();
        assertThat(doc.select("[style]")).isEmpty();
        for (Element el : doc.select("a[href]")) {
            assertThat(el.attr("href").toLowerCase())
                    .as("no javascript: href on <%s>", el.text())
                    .doesNotStartWith("javascript:");
        }
        for (Element el : doc.getAllElements()) {
            assertThat(el.tagName()).as("allowed tag in output").isNotIn(DISALLOWED_TAGS);
            for (var attr : el.attributes()) {
                assertThat(attr.getKey().toLowerCase())
                        .as("no event handler on <%s>", el.tagName())
                        .doesNotStartWith("on");
            }
        }
    }
}
