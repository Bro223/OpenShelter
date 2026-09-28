package ee.sheltermap.config;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;

/**
 * The comment text of one frontend source file, one entry per source line,
 * for the never-filed-change-name check in {@link SourceVocabularyTest}.
 *
 * <p>The Java state machine in the guard cannot be ported: a line or block
 * comment marker inside a TS template literal or a string literal is not a
 * comment (a port would false-positive a refused name sitting in one, or
 * swallow the code after a fake comment start), the {@code <!-- -->} comment
 * is invisible to it (it would false-negative the real HTML-comment
 * citations), and a {@code ${}} interpolation is code again, nesting strings,
 * comments and further templates the Java machine has no state for. This
 * extractor is purpose-built for the three frontend syntaxes the guard
 * scans — {@code .ts}, {@code .html} and {@code .scss} — and reports comment
 * ranges that a shared splitter turns into the per-line text the check
 * matches.
 *
 * <p>What it sees: TS/SCSS line comments and block comments, TS string and
 * template literals (with escaped characters, interpolations, nested
 * templates and the brace depth of the interpolated expressions), HTML
 * comments, and the JS/SCSS comment text of the inline {@code <script>} and
 * {@code <style>} element bodies of an HTML file (the app entry page carries
 * two real pre-paint scripts whose comments must stay visible).
 *
 * <p>What it cannot see, documented as verified limits: a TS regex literal
 * is not disambiguated — a regex body containing a comment-marker sequence
 * would be read as a comment (no such regex exists in the tree, and the
 * failure mode is a visible refusal of a name in code, never a silent
 * pass); an HTML comment containing a {@code <script>} or {@code <style>}
 * start tag, or an attribute value with a {@code >} on such a tag, is
 * misread (no such nesting exists in the tree); an unterminated string
 * literal ends at its line end instead of swallowing the rest of the file;
 * and a name split across a line break never matches, the same per-line
 * semantics the Java scanner applies.
 */
final class FrontendCommentExtractor {

    /** The quote of a quote-less frame (every state except a string literal). */
    private static final char NO_QUOTE = 0;

    private FrontendCommentExtractor() {
    }

    /** The comment text of one {@code .ts} file, one entry per source line. */
    static List<String> tsCommentTextByLine(String content) {
        return commentTextByLine(content, sourceCommentRanges(content, true));
    }

    /** The comment text of one {@code .scss} file, one entry per source line. */
    static List<String> scssCommentTextByLine(String content) {
        return commentTextByLine(content, sourceCommentRanges(content, false));
    }

    /** The comment text of one {@code .html} file, one entry per source line. */
    static List<String> htmlCommentTextByLine(String content) {
        return commentTextByLine(content, htmlCommentRanges(content));
    }

    /**
     * One entry per source line (for content without a trailing line end):
     * the comment text that falls on that line, in position order, empty when
     * the line carries no comment. A block comment spanning several lines
     * contributes each line's slice; delimiters are not part of the text.
     */
    private static List<String> commentTextByLine(String content, List<CommentRange> ranges) {
        List<String> lines = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int rangeIndex = 0;
        int lineStart = 0;
        int length = content.length();
        for (int lineEnd = 0; lineEnd <= length; lineEnd++) {
            if (lineEnd < length && content.charAt(lineEnd) != '\n') {
                continue;
            }
            while (rangeIndex < ranges.size() && ranges.get(rangeIndex).end() <= lineStart) {
                rangeIndex++;
            }
            while (rangeIndex < ranges.size() && ranges.get(rangeIndex).start() < lineEnd) {
                CommentRange range = ranges.get(rangeIndex);
                current.append(content, Math.max(range.start(), lineStart), Math.min(range.end(), lineEnd));
                if (range.end() <= lineEnd) {
                    rangeIndex++;
                }
                else {
                    break; // the range continues on the next line
                }
            }
            lines.add(current.toString());
            current.setLength(0);
            lineStart = lineEnd + 1;
        }
        return lines;
    }

    /**
     * The comment ranges of one TS-like source. When {@code allowTemplates}
     * is false the same machine serves SCSS, where a backtick is an ordinary
     * code character — SCSS has no template literals.
     */
    private static List<CommentRange> sourceCommentRanges(String content, boolean allowTemplates) {
        List<CommentRange> ranges = new ArrayList<>();
        Deque<Frame> stack = new ArrayDeque<>();
        stack.push(new Frame(State.CODE, NO_QUOTE));
        int length = content.length();
        for (int i = 0; i < length; i++) {
            char c = content.charAt(i);
            char next = i + 1 < length ? content.charAt(i + 1) : 0;
            Frame frame = stack.peek();
            if (frame.state == State.STRING) {
                if (c == '\\' && next != 0) {
                    i++; // the escaped character is literal text, not a delimiter
                }
                else if (c == frame.quote || c == '\n') {
                    stack.pop(); // the quote closes the literal; a bare line end does too, so one malformed literal cannot swallow the file
                }
            }
            else if (frame.state == State.TEMPLATE) {
                if (c == '\\' && next != 0) {
                    i++; // an escaped backtick or dollar-brace is template text, not a delimiter
                }
                else if (c == '$' && next == '{') {
                    stack.push(new Frame(State.INTERPOLATION, NO_QUOTE)); // the interpolated expression is code again
                    i++;
                }
                else if (c == '`') {
                    stack.pop(); // the template body is literal text, not a comment
                }
            }
            else if (c == '/' && next == '/') {
                int end = i + 2;
                while (end < length && content.charAt(end) != '\n') {
                    end++;
                }
                ranges.add(new CommentRange(i + 2, end));
                i = end - 1; // the loop step lands on the line end, which code state ignores
            }
            else if (c == '/' && next == '*') {
                int end = i + 2;
                while (end + 1 < length && !(content.charAt(end) == '*' && content.charAt(end + 1) == '/')) {
                    end++;
                }
                if (end + 1 < length) {
                    ranges.add(new CommentRange(i + 2, end));
                    i = end + 1; // past the closing marker
                }
                else if (end > i + 1) {
                    ranges.add(new CommentRange(i + 2, length)); // an unclosed comment runs to the end, like a parser
                }
            }
            else if (c == '\'' || c == '"') {
                stack.push(new Frame(State.STRING, c));
            }
            else if (c == '`' && allowTemplates) {
                stack.push(new Frame(State.TEMPLATE, NO_QUOTE));
            }
            else if (frame.state == State.INTERPOLATION) {
                if (c == '{') {
                    frame.braceDepth++;
                }
                else if (c == '}') {
                    if (frame.braceDepth == 0) {
                        stack.pop(); // the interpolation's own closing brace
                    }
                    else {
                        frame.braceDepth--; // a brace of the expression (an object literal, a block)
                    }
                }
            }
        }
        return ranges;
    }

    /**
     * The comment ranges of one HTML file: the {@code <!-- -->} ranges of
     * the markup, plus the JS comment ranges of every inline
     * {@code <script>} body and the SCSS comment ranges of every inline
     * {@code <style>} body, at their offsets in the whole file. Outside an
     * embedded body the only comment syntax of the markup is
     * {@code <!-- -->} — a {@code //} in an attribute value (a URL) is text,
     * not a comment.
     */
    private static List<CommentRange> htmlCommentRanges(String content) {
        List<CommentRange> ranges = new ArrayList<>();
        List<int[]> embedded = embeddedSpans(content);
        for (int i = 0; i < content.length(); i++) {
            if (!content.startsWith("<!--", i) || insideEmbedded(i, embedded)) {
                continue;
            }
            int close = content.indexOf("-->", i + 4);
            int textEnd = close < 0 ? content.length() : close;
            ranges.add(new CommentRange(i + 4, textEnd));
            i = close < 0 ? content.length() - 1 : close + 2;
        }
        for (int[] span : embedded) {
            String body = content.substring(span[0], span[1]);
            List<CommentRange> bodyRanges = span[2] == 1
                    ? sourceCommentRanges(body, true)
                    : sourceCommentRanges(body, false);
            for (CommentRange range : bodyRanges) {
                ranges.add(new CommentRange(span[0] + range.start(), span[0] + range.end()));
            }
        }
        ranges.sort(Comparator.comparingInt(CommentRange::start));
        return ranges;
    }

    /**
     * The inline {@code <script>} and {@code <style>} element bodies of one
     * HTML file, as {@code {bodyStart, bodyEnd, isScript}} triples. The body
     * runs from after the opening tag's final {@code >} to the matching
     * closing tag.
     */
    private static List<int[]> embeddedSpans(String content) {
        List<int[]> spans = new ArrayList<>();
        String lower = content.toLowerCase();
        int from = 0;
        while (from < content.length()) {
            int scriptAt = lower.indexOf("<script", from);
            int styleAt = lower.indexOf("<style", from);
            if (scriptAt < 0 && styleAt < 0) {
                break;
            }
            int tagStart;
            boolean script;
            if (styleAt < 0 || (scriptAt >= 0 && scriptAt < styleAt)) {
                tagStart = scriptAt;
                script = true;
            }
            else {
                tagStart = styleAt;
                script = false;
            }
            int openEnd = content.indexOf('>', tagStart);
            if (openEnd < 0) {
                from = tagStart + 1; // a malformed tag with no close: look for the next
                continue;
            }
            int closeAt = lower.indexOf(script ? "</script" : "</style", openEnd);
            int bodyEnd = closeAt < 0 ? content.length() : closeAt;
            spans.add(new int[] { openEnd + 1, bodyEnd, script ? 1 : 0 });
            from = closeAt < 0 ? content.length() : closeAt + (script ? 9 : 8); // one past the closing tag
        }
        return spans;
    }

    /** True when the position falls inside one embedded element body. */
    private static boolean insideEmbedded(int position, List<int[]> spans) {
        for (int[] span : spans) {
            if (position >= span[0] && position < span[1]) {
                return true;
            }
        }
        return false;
    }

    /** A comment text range [start, end) — half-open, delimiters excluded. */
    private record CommentRange(int start, int end) { }

    /** The states the machine is in while walking code. */
    private enum State { CODE, INTERPOLATION, TEMPLATE, STRING }

    /** One state on the machine's stack; a string frame carries its quote. */
    private static final class Frame {
        private final State state;

        private final char quote;

        private int braceDepth; // INTERPOLATION only: the nested braces of the expression

        private Frame(State state, char quote) {
            this.state = state;
            this.quote = quote;
        }
    }
}
