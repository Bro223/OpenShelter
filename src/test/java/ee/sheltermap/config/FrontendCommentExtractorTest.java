package ee.sheltermap.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The frozen shape probes for {@link FrontendCommentExtractor} — the
 * red-proof of the shapes that make a naive port of the guard's Java state
 * machine wrong, so a regression of the extractor fails the gate instead of
 * silently missing a comment (or refusing a name that sits in a literal):
 *
 * <ul>
 * <li>a line or block comment marker inside a TS string or template literal
 *     is not a comment (the naive port would false-positive a refused name
 *     in one, or swallow the code after a fake comment start);</li>
 * <li>a {@code ${}} interpolation is code again, with its own strings,
 *     comments and nested templates;</li>
 * <li>the {@code <!-- -->} comment is the only comment syntax of the HTML
 *     markup, and a {@code //} in an attribute value is not a comment (the
 *     Java machine would false-negative and false-positive respectively);</li>
 * <li>the inline {@code <script>} and {@code <style>} bodies of an HTML file
 *     carry real JS/SCSS comments that must stay visible.</li>
 * </ul>
 *
 * <p>The fixtures cite a synthetic name that is not a change name at all;
 * the guard's own list decides what is refused, and the check's behaviour
 * on real names is proven by its mutation proofs.
 */
class FrontendCommentExtractorTest {

    @Test
    void tsCommentTextSeesCommentsAndSkipsLiterals() {
        String source = String.join("\n",
                "const url = 'https://example.com/never-filed-change'; // seen note",
                "const tpl = `never-filed-change is template text, not a comment`;",
                "const interp = `${'never-filed-change'} plus ${ /* seen inside */ 1 }`;",
                "const nested = `${`${inner ${'never-filed-change'}}` tail}`;",
                "<!-- not a comment in ts -->",
                "const re = /never-filed-change/;",
                "// line comment never-filed-change",
                "/* block never-filed-change */ code");
        List<String> comments = FrontendCommentExtractor.tsCommentTextByLine(source);
        assertThat(comments).hasSize(8);
        // a line comment is seen, the string before it is not comment text
        assertThat(comments.get(0)).isEqualTo(" seen note");
        // a template literal body is literal text, not a comment
        assertThat(comments.get(1)).isEmpty();
        // an interpolation is code: its string is not comment text, its comment is
        assertThat(comments.get(2)).isEqualTo(" seen inside ");
        // a template nested in an interpolation hides its string the same way
        assertThat(comments.get(3)).isEmpty();
        // html comment syntax is not a comment in ts
        assertThat(comments.get(4)).isEmpty();
        // a plain regex literal (no comment-marker sequence inside) is not a comment
        assertThat(comments.get(5)).isEmpty();
        // the two comment shapes are seen, delimiters excluded
        assertThat(comments.get(6)).isEqualTo(" line comment never-filed-change");
        assertThat(comments.get(7)).isEqualTo(" block never-filed-change ");
    }

    @Test
    void htmlCommentTextSeesMarkupAndEmbeddedBodiesAndSkipsOtherSyntax() {
        String source = String.join("\n",
                "<!-- markup comment never-filed-change -->",
                "<a href=\"https://example.com/never-filed-change\">link</a>",
                "<script>",
                "  // js comment never-filed-change",
                "  const s = 'https://example.com/never-filed-change';",
                "</script>",
                "<!-- multi",
                "line comment -->",
                "<style>",
                "  .x { content: \"never-filed-change\"; }",
                "  /* scss comment never-filed-change */",
                "</style>");
        List<String> comments = FrontendCommentExtractor.htmlCommentTextByLine(source);
        assertThat(comments).hasSize(12);
        // the markup comment is seen, delimiters excluded
        assertThat(comments.get(0)).isEqualTo(" markup comment never-filed-change ");
        // a // in an attribute value is text, not a comment
        assertThat(comments.get(1)).isEmpty();
        assertThat(comments.get(2)).isEmpty();
        // the inline script body is walked as ts: comment seen, string not
        assertThat(comments.get(3)).isEqualTo(" js comment never-filed-change");
        assertThat(comments.get(4)).isEmpty();
        assertThat(comments.get(5)).isEmpty();
        // a markup comment spanning lines contributes each line's slice
        assertThat(comments.get(6)).isEqualTo(" multi");
        assertThat(comments.get(7)).isEqualTo("line comment ");
        assertThat(comments.get(8)).isEmpty();
        // the inline style body is walked as scss: string not comment, block comment is
        assertThat(comments.get(9)).isEmpty();
        assertThat(comments.get(10)).isEqualTo(" scss comment never-filed-change ");
        assertThat(comments.get(11)).isEmpty();
    }

    @Test
    void scssCommentTextSeesCommentsAndSkipsLiterals() {
        String source = String.join("\n",
                "// line comment never-filed-change",
                "/* block comment never-filed-change */",
                ".a { content: 'never-filed-change'; }",
                ".b { background: url(\"https://example.com/never-filed-change\"); }",
                "$x: /* mid-line never-filed-change */ 1;");
        List<String> comments = FrontendCommentExtractor.scssCommentTextByLine(source);
        assertThat(comments).hasSize(5);
        assertThat(comments.get(0)).isEqualTo(" line comment never-filed-change");
        assertThat(comments.get(1)).isEqualTo(" block comment never-filed-change ");
        // a // inside a string literal is not a comment
        assertThat(comments.get(2)).isEmpty();
        assertThat(comments.get(3)).isEmpty();
        // a block comment mid-line is seen, delimiters excluded
        assertThat(comments.get(4)).isEqualTo(" mid-line never-filed-change ");
    }
}
