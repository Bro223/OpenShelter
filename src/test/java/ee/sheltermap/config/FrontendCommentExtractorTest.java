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
 * <p>The per-line {@link CommentLine#blockOpenAtLineEnd()} flag is probed
 * too: it is the wrap-join permission the guard's name checks read, and a
 * wrong flag either joins two separate line comments (a visible false
 * refusal) or hides a wrapped citation (a silent pass).
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
        List<CommentLine> comments = FrontendCommentExtractor.tsCommentLines(source);
        assertThat(comments).hasSize(8);
        // a line comment is seen, the string before it is not comment text
        assertThat(comments.get(0).text()).isEqualTo(" seen note");
        // a template literal body is literal text, not a comment
        assertThat(comments.get(1).text()).isEmpty();
        // an interpolation is code: its string is not comment text, its comment is
        assertThat(comments.get(2).text()).isEqualTo(" seen inside ");
        // a template nested in an interpolation hides its string the same way
        assertThat(comments.get(3).text()).isEmpty();
        // html comment syntax is not a comment in ts
        assertThat(comments.get(4).text()).isEmpty();
        // a plain regex literal (no comment-marker sequence inside) is not a comment
        assertThat(comments.get(5).text()).isEmpty();
        // the two comment shapes are seen, delimiters excluded
        assertThat(comments.get(6).text()).isEqualTo(" line comment never-filed-change");
        assertThat(comments.get(7).text()).isEqualTo(" block never-filed-change ");
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
        List<CommentLine> comments = FrontendCommentExtractor.htmlCommentLines(source);
        assertThat(comments).hasSize(12);
        // the markup comment is seen, delimiters excluded
        assertThat(comments.get(0).text()).isEqualTo(" markup comment never-filed-change ");
        // a // in an attribute value is text, not a comment
        assertThat(comments.get(1).text()).isEmpty();
        assertThat(comments.get(2).text()).isEmpty();
        // the inline script body is walked as ts: comment seen, string not
        assertThat(comments.get(3).text()).isEqualTo(" js comment never-filed-change");
        assertThat(comments.get(4).text()).isEmpty();
        assertThat(comments.get(5).text()).isEmpty();
        // a markup comment spanning lines contributes each line's slice
        assertThat(comments.get(6).text()).isEqualTo(" multi");
        assertThat(comments.get(7).text()).isEqualTo("line comment ");
        assertThat(comments.get(8).text()).isEmpty();
        // the inline style body is walked as scss: string not comment, block comment is
        assertThat(comments.get(9).text()).isEmpty();
        assertThat(comments.get(10).text()).isEqualTo(" scss comment never-filed-change ");
        assertThat(comments.get(11).text()).isEmpty();
    }

    @Test
    void scssCommentTextSeesCommentsAndSkipsLiterals() {
        String source = String.join("\n",
                "// line comment never-filed-change",
                "/* block comment never-filed-change */",
                ".a { content: 'never-filed-change'; }",
                ".b { background: url(\"https://example.com/never-filed-change\"); }",
                "$x: /* mid-line never-filed-change */ 1;");
        List<CommentLine> comments = FrontendCommentExtractor.scssCommentLines(source);
        assertThat(comments).hasSize(5);
        assertThat(comments.get(0).text()).isEqualTo(" line comment never-filed-change");
        assertThat(comments.get(1).text()).isEqualTo(" block comment never-filed-change ");
        // a // inside a string literal is not a comment
        assertThat(comments.get(2).text()).isEmpty();
        assertThat(comments.get(3).text()).isEmpty();
        // a block comment mid-line is seen, delimiters excluded
        assertThat(comments.get(4).text()).isEqualTo(" mid-line never-filed-change ");
    }

    @Test
    void blockOpenAtLineEndMarksOnlyTheSpanningBlockComment() {
        String tsSource = String.join("\n",
                "/* spans",
                "the next line */",
                "// line comment",
                "/* same line only */");
        List<CommentLine> tsLines = FrontendCommentExtractor.tsCommentLines(tsSource);
        assertThat(tsLines.get(0).blockOpenAtLineEnd()).isTrue();
        assertThat(tsLines.get(1).blockOpenAtLineEnd()).isFalse();
        assertThat(tsLines.get(2).blockOpenAtLineEnd()).isFalse();
        assertThat(tsLines.get(3).blockOpenAtLineEnd()).isFalse();

        String htmlSource = String.join("\n",
                "<!-- spans",
                "the next line -->",
                "<!-- same line only -->");
        List<CommentLine> htmlLines = FrontendCommentExtractor.htmlCommentLines(htmlSource);
        assertThat(htmlLines.get(0).blockOpenAtLineEnd()).isTrue();
        assertThat(htmlLines.get(1).blockOpenAtLineEnd()).isFalse();
        assertThat(htmlLines.get(2).blockOpenAtLineEnd()).isFalse();

        String scssSource = String.join("\n",
                "/* spans",
                "the next line */");
        List<CommentLine> scssLines = FrontendCommentExtractor.scssCommentLines(scssSource);
        assertThat(scssLines.get(0).blockOpenAtLineEnd()).isTrue();
        assertThat(scssLines.get(1).blockOpenAtLineEnd()).isFalse();
    }
}
