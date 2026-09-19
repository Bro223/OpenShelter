package ee.sheltermap.guidance;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The specification of the Markdown → allow-listed-HTML converter
 * ({@link MarkdownToHtml}): every mapping, every refusal, and the
 * structural invariants — the output never carries a tag outside the
 * sanitizer's allow-list, never an unsafe href, and always survives
 * {@link BodySanitizer} unchanged (the stored value IS the sanitizer
 * output, so converter output must be sanitizer-stable).
 */
class MarkdownToHtmlTest {

    /** The frozen allow-list (crisis-guidance D2) — the converter's ceiling. */
    private static final Set<String> ALLOWED_TAGS =
            Set.of("h2", "h3", "p", "br", "strong", "em", "ul", "ol", "li", "a", "blockquote");

    private static String convert(String md) {
        return MarkdownToHtml.convert(md);
    }

    /** Every tag actually emitted by the converter for {@code html} (the
     *  parser's own structural wrappers are not converter output). */
    private static Set<String> tagsOf(String html) {
        Document doc = Jsoup.parseBodyFragment(html);
        return doc.getAllElements().stream()
                .map(Element::tagName)
                .filter(t -> !t.equals("#root") && !t.equals("html")
                        && !t.equals("head") && !t.equals("body"))
                .collect(Collectors.toSet());
    }

    private static void assertAllowListed(String html) {
        Set<String> offending = tagsOf(html);
        offending.removeAll(ALLOWED_TAGS);
        assertThat(offending)
                .as("tags outside the allow-list in: %s", html)
                .isEmpty();
    }

    private static void assertSafeHrefsOnly(String html) {
        for (Element a : Jsoup.parseBodyFragment(html).getElementsByTag("a")) {
            String href = a.attr("href");
            assertThat(href)
                    .as("unsafe href %s", href)
                    .matches("(?i)^(https?|mailto):\\S+$");
        }
    }

    private static void assertSanitizerStable(String html) {
        // jsoup re-serializes (pretty-prints), so byte equality with the
        // converter output is NOT the invariant; idempotence is: what the
        // server stores (sanitizer output) must be a fixed point.
        String once = BodySanitizer.sanitize(html);
        assertThat(BodySanitizer.sanitize(once))
                .as("converter output must be a fixed point of the server sanitizer")
                .isEqualTo(once);
    }

    // ------------------------------------------------------------ headings

    @Test
    void doubleHashBecomesH2() {
        String html = convert("## Section title");
        assertThat(html).isEqualTo("<h2>Section title</h2>");
        assertAllowListed(html);
    }

    @Test
    void tripleHashBecomesH3() {
        String html = convert("### Sub section");
        assertThat(html).isEqualTo("<h3>Sub section</h3>");
        assertAllowListed(html);
    }

    @Test
    void singleHashDegradesToH2BecauseThePageOwnsTheH1() {
        String html = convert("# Top level in a body");
        assertThat(html).isEqualTo("<h2>Top level in a body</h2>");
        assertAllowListed(html);
    }

    @Test
    void deepHeadingsDegradeToH3() {
        assertThat(convert("#### Deep")).isEqualTo("<h3>Deep</h3>");
        assertThat(convert("###### Deeper still")).isEqualTo("<h3>Deeper still</h3>");
    }

    @Test
    void headingWithInlineFormatting() {
        String html = convert("## **Bold** part of the title");
        assertThat(html).isEqualTo("<h2><strong>Bold</strong> part of the title</h2>");
    }

    @Test
    void hashWithoutSpaceIsNotAHeading() {
        assertThat(convert("#hashtag stays text")).isEqualTo("<p>#hashtag stays text</p>");
    }

    // ------------------------------------------------------------- bold/em

    @Test
    void doubleStarBecomesStrong() {
        assertThat(convert("A **bold** word"))
                .isEqualTo("<p>A <strong>bold</strong> word</p>");
    }

    @Test
    void standaloneBoldLineBecomesAParagraphOfStrong() {
        String html = convert("Intro line\n\n**Section break**\n\nText after.");
        assertThat(html)
                .isEqualTo("<p>Intro line</p>\n<p><strong>Section break</strong></p>\n<p>Text after.</p>");
    }

    @Test
    void singleStarAndUnderscoreBecomeEm() {
        assertThat(convert("A *star* word")).isEqualTo("<p>A <em>star</em> word</p>");
        assertThat(convert("A _under_ word")).isEqualTo("<p>A <em>under</em> word</p>");
    }

    @Test
    void underscoreInsideAWordIsNotEmphasis() {
        assertThat(convert("The e_mail address")).isEqualTo("<p>The e_mail address</p>");
    }

    @Test
    void unpairedMarkersStayLiteral() {
        assertThat(convert("two ** words")).isEqualTo("<p>two ** words</p>");
        assertThat(convert("a * word")).isEqualTo("<p>a * word</p>");
    }

    @Test
    void boldContainingAUrl() {
        assertThat(convert("**see https://example.com/x** for details"))
                .isEqualTo("<p><strong>see <a href=\"https://example.com/x\">https://example.com/x</a></strong> for details</p>");
    }

    // --------------------------------------------------------------- lists

    @Test
    void consecutiveBulletsGroupIntoOneUl() {
        String html = convert("- one\n- two\n- three");
        assertThat(html).isEqualTo("<ul><li>one</li><li>two</li><li>three</li></ul>");
        assertAllowListed(html);
    }

    @Test
    void asteriskBulletsAreBulletsNotEmphasis() {
        assertThat(convert("* one\n* two"))
                .isEqualTo("<ul><li>one</li><li>two</li></ul>");
    }

    @Test
    void consecutiveNumberedItemsGroupIntoOneOl() {
        String html = convert("1. first\n2. second\n3. third");
        assertThat(html).isEqualTo("<ol><li>first</li><li>second</li><li>third</li></ol>");
        assertAllowListed(html);
    }

    @Test
    void numberingRestartStartsANewOl() {
        String html = convert("1. first\n2. second\n1. again");
        assertThat(html)
                .isEqualTo("<ol><li>first</li><li>second</li></ol>\n<ol><li>again</li></ol>");
    }

    @Test
    void aLoneListItemIsStillAList() {
        assertThat(convert("text\n\n- single\n\nmore"))
                .isEqualTo("<p>text</p>\n<ul><li>single</li></ul>\n<p>more</p>");
    }

    @Test
    void listItemsCarryInlineFormatting() {
        assertThat(convert("- a **bold** item"))
                .isEqualTo("<ul><li>a <strong>bold</strong> item</li></ul>");
    }

    // ---------------------------------------------------------- blockquote

    @Test
    void quoteBecomesBlockquote() {
        assertThat(convert("> quoted words"))
                .isEqualTo("<blockquote>quoted words</blockquote>");
    }

    @Test
    void consecutiveQuoteLinesGroupIntoOneBlockquote() {
        assertThat(convert("> line one\n> line two"))
                .isEqualTo("<blockquote>line one<br>line two</blockquote>");
    }

    // --------------------------------------------------------------- links

    @Test
    void markdownLinkWithHttpUrl() {
        assertThat(convert("Read [the guide](https://example.com/guide) now."))
                .isEqualTo("<p>Read <a href=\"https://example.com/guide\">the guide</a> now.</p>");
    }

    @Test
    void markdownLinkWithMailtoUrl() {
        assertThat(convert("Mail [the hotline](mailto:info@example.com)."))
                .isEqualTo("<p>Mail <a href=\"mailto:info@example.com\">the hotline</a>.</p>");
    }

    @Test
    void bareUrlBecomesALink() {
        assertThat(convert("More at https://example.com/page, ok?"))
                .isEqualTo("<p>More at <a href=\"https://example.com/page\">https://example.com/page</a>, ok?</p>");
    }

    @Test
    void bareUrlStripsTrailingPunctuation() {
        assertThat(convert("See https://example.com/a.b)."))
                .isEqualTo("<p>See <a href=\"https://example.com/a.b\">https://example.com/a.b</a>).</p>");
    }

    @Test
    void bareMailtoIsNeverAutoLinked() {
        assertThat(convert("write mailto:info@example.com"))
                .isEqualTo("<p>write mailto:info@example.com</p>");
    }

    // ------------------------------------------------------- paragraphs and breaks

    @Test
    void plainLinesBecomeParagraphs() {
        String html = convert("first line\nsecond line");
        assertThat(html).isEqualTo("<p>first line</p>\n<p>second line</p>");
    }

    @Test
    void blankLinesSeparateBlocksButEmitNothing() {
        assertThat(convert("one\n\n\ntwo"))
                .isEqualTo("<p>one</p>\n<p>two</p>");
    }

    @Test
    void backslashLineEndBecomesBrInsideTheParagraph() {
        assertThat(convert("first line \\\nsecond line\nthird line"))
                .isEqualTo("<p>first line<br>second line</p>\n<p>third line</p>");
    }

    @Test
    void twoTrailingSpacesBecomeBr() {
        assertThat(convert("a  \nb\nc"))
                .isEqualTo("<p>a<br>b</p>\n<p>c</p>");
    }

    @Test
    void hardBreakIntoAHeadingDropsTheBr() {
        assertThat(convert("dangling \\\n## Heading"))
                .isEqualTo("<p>dangling</p>\n<h2>Heading</h2>");
    }

    // -------------------------------------------------- degradation and refusal

    @Test
    void rawScriptTagIsEscapedNeverEmitted() {
        String html = convert("before <script>alert(1)</script> after");
        assertThat(html).isEqualTo("<p>before &lt;script&gt;alert(1)&lt;/script&gt; after</p>");
        assertThat(html).doesNotContain("<script");
        assertAllowListed(html);
    }

    @Test
    void disallowedTagsAreEscaped() {
        String html = convert("a <table><tr><td>cell</td></tr></table> b\nan <img src=x> c");
        assertAllowListed(html);
        assertThat(tagsOf(html)).containsExactly("p");
        assertThat(html).contains("&lt;table&gt;").contains("&lt;img src=x&gt;");
    }

    @Test
    void javascriptHrefIsRefusedLabelOnly() {
        String html = convert("click [here](javascript:alert(1)) please");
        assertThat(html).isEqualTo("<p>click here please</p>");
        assertThat(html).doesNotContain("<a");
        assertSafeHrefsOnly(html);
    }

    @Test
    void dataHrefIsRefusedLabelOnly() {
        String html = convert("click [here](data:text/html;base64,AAAA) please");
        assertThat(html).isEqualTo("<p>click here please</p>");
    }

    @Test
    void nonWebProtocolLinkIsRefusedLabelOnly() {
        assertThat(convert("old [link](ftp://files.example.com/x) format"))
                .isEqualTo("<p>old link format</p>");
    }

    @Test
    @DisplayName("unmapped md constructs degrade to escaped plain text")
    void unmappedConstructsDegradeToPlainText() {
        // strikethrough, table row, task list box, HTML entity attempt —
        // none of these map; the text survives, no new tags appear
        String html = convert("~~strike~~ and | a | b | and [ ] todo");
        assertThat(html).isEqualTo("<p>~~strike~~ and | a | b | and [ ] todo</p>");
        assertAllowListed(html);
    }

    @Test
    void fencedCodeDegradesToPlainParagraphs() {
        String html = convert("```\ncode = 1 + 1\n```");
        assertThat(html).isEqualTo("<p>code = 1 + 1</p>");
        assertAllowListed(html);
        assertThat(html).doesNotContain("code = <");
    }

    @Test
    void horizontalRuleIsDropped() {
        assertThat(convert("above\n\n---\n\nbelow"))
                .isEqualTo("<p>above</p>\n<p>below</p>");
    }

    @Test
    void ampersandAndQuotesAreEscaped() {
        assertThat(convert("R&G's \"rules\" < 5"))
                .isEqualTo("<p>R&amp;G&#39;s &quot;rules&quot; &lt; 5</p>");
    }

    @Test
    void cjkAndAccentedTextPassThrough() {
        assertThat(convert("Kolm minutit — ääö, иди сюда, — ok"))
                .isEqualTo("<p>Kolm minutit — ääö, иди сюда, — ok</p>");
    }

    // ------------------------------------------------------------ invariants

    @Test
    void nullAndBlankYieldEmpty() {
        assertThat(MarkdownToHtml.convert(null)).isEmpty();
        assertThat(MarkdownToHtml.convert("   \n  ")).isEmpty();
    }

    @Test
    void crlfIsNormalized() {
        assertThat(convert("a\r\nb")).isEqualTo(convert("a\nb"));
    }

    @Test
    void aTypicalBodyConvertsWithNoResidualMarkersAndSurvivesTheSanitizer() {
        String md = "Intro **bold** text.\n\n## Steps\n"
                + "1. first step\n2. second step\n\n"
                + "- bullet one\n- bullet two\n\n"
                + "> a quoted warning\n\n"
                + "Tail with a link [x](https://example.com) and a bare https://example.com/y line.";
        String html = convert(md);
        assertThat(html).doesNotContain("**").doesNotContain("##");
        assertThat(List.of(html.split("\n")))
                .noneMatch(line -> line.startsWith("# "));
        assertAllowListed(html);
        assertSafeHrefsOnly(html);
        assertSanitizerStable(html);
    }
}
