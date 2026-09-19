package ee.sheltermap.guidance;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A small, dependency-free Markdown → HTML converter for guidance post
 * bodies. The 2026-07 content batch was copy-pasted from .md files into the
 * body field, so the stored bodies carry raw Markdown markers ({@code **},
 * {@code ##}, {@code - }, {@code 1. }, …) as literal text. This converter
 * rewrites that Markdown into the same strict allow-list the server
 * sanitizes to (see {@link BodySanitizer}):
 *
 * <p>Emitted elements: {@code h2 h3 p br strong em ul ol li blockquote a} —
 * nothing else. {@code a[href]} is limited to {@code http}/{@code https}/
 * {@code mailto}. There is no {@code h1} (the detail page owns the single
 * {@code h1}), no tables, no images, no code tags, no inline styles.
 *
 * <h2>Block mapping (per line, in priority order)</h2>
 * <ul>
 * <li>{@code ## } → {@code <h2>}</li>
 * <li>{@code # } (a Markdown h1) → {@code <h2>} — the page owns the h1, so a
 *     body-level h1 degrades one level</li>
 * <li>{@code ### } → {@code <h3>}; {@code #### } or deeper → {@code <h3>}
 *     (degraded, the allow-list has no h4–h6)</li>
 * <li>{@code - } / {@code * } → {@code <ul><li>} (consecutive items group
 *     into one list; deeper indentation is flattened, not lost)</li>
 * <li>{@code 1. } → {@code <ol><li>} (consecutive items group; a number
 *     restart starts a new list)</li>
 * <li>{@code > } → {@code <blockquote>} (consecutive quote lines group into
 *     one blockquote, joined by {@code <br>})</li>
 * <li>a {@code ```}/{@code ~~~} fence → its lines are emitted as escaped
 *     plain paragraphs (no {@code <code>}/{@code <pre>} in the allow-list;
 *     the CONTENT survives, the code FORMATTING does not)</li>
 * <li>a horizontal rule ({@code ---}, {@code ***}, {@code ___}) → dropped —
 *     pure syntax with no content to preserve</li>
 * <li>a blank line → block separator (no output)</li>
 * <li>anything else → {@code <p>} — one block per source line (the stored
 *     bodies are one block per line; merging would reflow the layout). A
 *     line ending in a backslash or two trailing spaces joins the next
 *     plain line into the same {@code <p>} with a {@code <br>} (the
 *     Markdown hard-break).</li>
 * </ul>
 *
 * <h2>Inline mapping</h2>
 * <ul>
 * <li>{@code **bold**} → {@code <strong>}</li>
 * <li>{@code *italic*} / {@code _italic_} → {@code <em>} (an underscore
 *     pair inside a word — {@code e_mail} — is NOT emphasized)</li>
 * <li>{@code [label](url)} → {@code <a href="url">label</a>} when the
 *     protocol is {@code http}/{@code https}/{@code mailto}; any other
 *     protocol ({@code javascript:}, {@code data:}, …) degrades to the
 *     label alone — the URL is dropped, never emitted as an href</li>
 * <li>a bare {@code http://}/{@code https://} URL → {@code <a>} (same text,
 *     same href); a bare {@code mailto:} is never auto-linked</li>
 * </ul>
 *
 * <p>Everything that cannot be mapped degrades to escaped plain text: the
 * whole scanner HTML-escapes every character it passes, so raw markup
 * ({@code <script>}, a disallowed tag, an event handler) can never reach
 * the output, and no tag outside the allow-list can ever be emitted.
 * Unpaired markers ({@code **unclosed}) stay literal text.
 *
 * <p>The class is stateless and allocation-cheap on purpose: it is the
 * one-shot migration tool's engine and the reference implementation of the
 * content rules, tested by {@code MarkdownToHtmlTest}.
 */
public final class MarkdownToHtml {

    /** Block: {@code # }…{@code ###### } with a space and non-blank text. */
    private static final Pattern HEADING = Pattern.compile("^(#{1,6}) +([^\\s].*)$");
    /** Block: a bullet item ({@code - } or {@code * } plus a space). */
    private static final Pattern BULLET = Pattern.compile("^[-*] +([^\\s].*)$");
    /** Block: a numbered item ({@code 1. } style, up to three digits). */
    private static final Pattern NUMBERED = Pattern.compile("^(\\d{1,3})\\. +([^\\s].*)$");
    /** Block: a blockquote line ({@code > } with an optional single space). */
    private static final Pattern QUOTE = Pattern.compile("^> *([^\\s].*)$");
    /** Block: a code fence opener/closer (three or more backticks or tildes). */
    private static final Pattern FENCE = Pattern.compile("^(?:`{3,}|~{3,})");
    /** Block: a horizontal rule — the whole line is dashes/stars/underscores. */
    private static final Pattern HR = Pattern.compile("^(?:-{3,}|\\*{3,}|_{3,})$");
    /** Inline: a link's href protocol (case-insensitive, no whitespace). */
    private static final Pattern SAFE_PROTOCOL = Pattern.compile("^(?:https?|mailto):\\S+$",
            Pattern.CASE_INSENSITIVE);

    private MarkdownToHtml() {
    }

    /**
     * Converts Markdown text to allow-listed HTML.
     *
     * @param markdown the Markdown source (CRLF and CR are normalized)
     * @return HTML containing only {@code h2 h3 p br strong em ul ol li
     *         blockquote a} ({@code a[href]} http/https/mailto only);
     *         {@code null}/blank input yields {@code ""}
     */
    public static String convert(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return "";
        }
        String[] lines = markdown.replace("\r\n", "\n").replace('\r', '\n').split("\n", -1);
        StringBuilder out = new StringBuilder();
        boolean inFence = false;
        int i = 0;
        while (i < lines.length) {
            String trimmed = lines[i].strip();

            if (trimmed.isEmpty()) {
                i++;
                continue;
            }

            if (FENCE.matcher(trimmed).find()) {
                inFence = !inFence;
                i++;
                continue;
            }
            if (inFence) {
                // Code has no allowed tag: the content degrades to escaped
                // plain text, one paragraph per line, no inline parsing.
                out.append("<p>").append(escape(trimmed)).append("</p>\n");
                i++;
                continue;
            }

            Matcher heading = HEADING.matcher(trimmed);
            if (heading.matches()) {
                // h1 is not in the allow-list (the page owns it): 1-2 hashes
                // become h2, 3 becomes h3, 4+ degrades to h3.
                boolean h3 = heading.group(1).length() >= 3;
                String tag = h3 ? "h3" : "h2";
                out.append('<').append(tag).append('>')
                        .append(inline(heading.group(2).strip()))
                        .append("</").append(tag).append(">\n");
                i++;
                continue;
            }

            if (BULLET.matcher(trimmed).matches()) {
                List<String> items = new ArrayList<>();
                while (i < lines.length) {
                    Matcher m = BULLET.matcher(lines[i].strip());
                    if (!m.matches()) {
                        break;
                    }
                    items.add(inline(m.group(1).strip()));
                    i++;
                }
                out.append("<ul>");
                for (String item : items) {
                    out.append("<li>").append(item).append("</li>");
                }
                out.append("</ul>\n");
                continue;
            }

            if (NUMBERED.matcher(trimmed).matches()) {
                List<String> items = new ArrayList<>();
                int previous = 0;
                while (i < lines.length) {
                    Matcher m = NUMBERED.matcher(lines[i].strip());
                    if (!m.matches()) {
                        break;
                    }
                    int number = Integer.parseInt(m.group(1));
                    if (!items.isEmpty() && number != previous + 1) {
                        break; // numbering restarted: a new list
                    }
                    previous = number;
                    items.add(inline(m.group(2).strip()));
                    i++;
                }
                out.append("<ol>");
                for (String item : items) {
                    out.append("<li>").append(item).append("</li>");
                }
                out.append("</ol>\n");
                continue;
            }

            if (QUOTE.matcher(trimmed).matches()) {
                List<String> parts = new ArrayList<>();
                while (i < lines.length) {
                    Matcher m = QUOTE.matcher(lines[i].strip());
                    if (!m.matches()) {
                        break;
                    }
                    parts.add(inline(m.group(1).strip()));
                    i++;
                }
                out.append("<blockquote>").append(String.join("<br>", parts))
                        .append("</blockquote>\n");
                continue;
            }

            if (HR.matcher(trimmed).matches()) {
                i++; // pure syntax, no content — dropped
                continue;
            }

            // Plain paragraph line(s). One line is one block; a hard-break
            // ending (backslash or two trailing spaces) folds the next plain
            // line into the same <p> with a <br> between.
            List<String> parts = new ArrayList<>();
            while (i < lines.length) {
                String raw = lines[i];
                String t = raw.strip();
                if (t.isEmpty() || FENCE.matcher(t).find() || isBlockStart(t)) {
                    break;
                }
                boolean hardBreak = raw.endsWith("  ") || t.endsWith("\\");
                String content = t.endsWith("\\")
                        ? t.substring(0, t.length() - 1).stripTrailing()
                        : t;
                parts.add(inline(content));
                i++;
                if (!hardBreak) {
                    break;
                }
            }
            out.append("<p>").append(String.join("<br>", parts)).append("</p>\n");
        }
        return out.toString().stripTrailing();
    }

    /** True when the (stripped) line starts a non-paragraph block. */
    private static boolean isBlockStart(String t) {
        return HEADING.matcher(t).matches()
                || BULLET.matcher(t).matches()
                || NUMBERED.matcher(t).matches()
                || QUOTE.matcher(t).matches()
                || HR.matcher(t).matches();
    }

    // ------------------------------------------------------------ inline

    /**
     * Converts one line of inline Markdown. Every character that is not
     * consumed by a mapping is HTML-escaped, so the output can only ever
     * contain the scanner's own tags ({@code strong em a}) over escaped
     * text — never a raw or disallowed tag, never an unsafe href.
     */
    private static String inline(String text) {
        StringBuilder out = new StringBuilder(text.length() + 16);
        int i = 0;
        int n = text.length();
        while (i < n) {
            char c = text.charAt(i);

            if (c == '[') {
                int close = text.indexOf(']', i + 1);
                if (close > i + 1 && close + 1 < n && text.charAt(close + 1) == '(') {
                    int closeParen = balancedClose(text, close + 2);
                    if (closeParen > close + 2) {
                        String label = text.substring(i + 1, close);
                        String url = text.substring(close + 2, closeParen).strip();
                        if (SAFE_PROTOCOL.matcher(url).matches() && url.length() <= 2048) {
                            out.append("<a href=\"").append(escape(url)).append("\">")
                                    .append(inline(label)).append("</a>");
                        } else {
                            // Unsafe protocol or shape: the LABEL survives,
                            // the URL is dropped (never an href).
                            out.append(inline(label));
                        }
                        i = closeParen + 1;
                        continue;
                    }
                }
                out.append(escape(c));
                i++;
                continue;
            }

            if (c == '*' || c == '_') {
                if (c == '*' && i + 1 < n && text.charAt(i + 1) == '*') {
                    int close = text.indexOf("**", i + 2);
                    if (close >= i + 2) {
                        String inner = text.substring(i + 2, close);
                        if (!inner.isBlank()) {
                            out.append("<strong>").append(inline(inner)).append("</strong>");
                            i = close + 2;
                            continue;
                        }
                    }
                    // Unpaired or empty: literal (escaped) text.
                    out.append("**");
                    i += 2;
                    continue;
                }
                int close = text.indexOf(c, i + 1);
                if (close > i + 1) {
                    String inner = text.substring(i + 1, close);
                    if (validEm(inner, c, text, i, close)) {
                        out.append("<em>").append(inline(inner)).append("</em>");
                        i = close + 1;
                        continue;
                    }
                }
                out.append(escape(c));
                i++;
                continue;
            }

            if (c == 'h' && text.startsWith("http", i)) {
                int j = i;
                while (j < n && isUrlChar(text.charAt(j))) {
                    j++;
                }
                String url = text.substring(i, j);
                int end = url.length();
                while (end > i && ".,;:!?)".indexOf(url.charAt(end - 1)) >= 0) {
                    end--;
                }
                url = url.substring(0, end);
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    String afterScheme = url.substring(url.indexOf("://") + 3);
                    if (!afterScheme.isBlank()) {
                        out.append("<a href=\"").append(escape(url)).append("\">")
                                .append(escape(url)).append("</a>");
                        i += url.length();
                        continue;
                    }
                }
                // Not a usable URL: fall through, escape the 'h' as text.
            }

            out.append(escape(c));
            i++;
        }
        return out.toString();
    }

    /**
     * The link-terminating {@code }}, respecting balanced inner parens
     * ({@code [x](http://a/b(c))} closes at the LAST paren); -1 when the
     * link is malformed.
     */
    private static int balancedClose(String text, int from) {
        int depth = 0;
        for (int k = from; k < text.length(); k++) {
            char c = text.charAt(k);
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                if (depth == 0) {
                    return k;
                }
                depth--;
            }
        }
        return -1;
    }

    /**
     * Emphasis validity for a {@code *}/{@code _} pair: non-blank inner
     * text, no leading/trailing space, and — for underscores — word
     * boundaries on both sides (so {@code e_mail} stays literal).
     */
    private static boolean validEm(String inner, char marker, String text, int openPos, int closePos) {
        if (inner.isBlank() || inner.startsWith(" ") || inner.endsWith(" ")) {
            return false;
        }
        if (marker == '_') {
            char before = openPos > 0 ? text.charAt(openPos - 1) : ' ';
            char after = closePos + 1 < text.length() ? text.charAt(closePos + 1) : ' ';
            if (isWordChar(before) || isWordChar(after)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isWordChar(char c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
                || (c >= '0' && c <= '9') || c == '_';
    }

    /** URL-continuation characters for the bare-URL scanner. */
    private static boolean isUrlChar(char c) {
        return !Character.isWhitespace(c)
                && c != '<' && c != '>' && c != '"' && c != '\''
                && c != '[' && c != ']' && c != '*';
    }

    /**
     * HTML-escapes the five significant characters. Applied to every text
     * fragment and every attribute value — the only way the output is
     * structurally incapable of carrying a raw tag.
     */
    private static String escape(String s) {
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '&' -> out.append("&amp;");
                case '<' -> out.append("&lt;");
                case '>' -> out.append("&gt;");
                case '"' -> out.append("&quot;");
                case '\'' -> out.append("&#39;");
                default -> out.append(c);
            }
        }
        return out.toString();
    }

    private static String escape(char c) {
        return escape(String.valueOf(c));
    }
}
