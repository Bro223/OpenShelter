package ee.sheltermap.guidance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * ONE-SHOT migration driver: converts every stored guidance body (all
 * locales, drafts included) from pasted Markdown to allow-listed HTML
 * through the admin API, preserving everything except the body.
 *
 * <p>Per post (locale scope en/et/ru):
 * <ol>
 * <li>{@code GET /admin/guidance?locale=<xx>} — the list (drafts included)</li>
 * <li>{@code GET /admin/guidance/{id}?locale=<xx>} — the read of record</li>
 * <li>the pre-conversion body is saved VERBATIM to
 *     {@code docs/content/guidance-markdown/<locale>/<slug>.md} (never
 *     overwritten — the reference copy is written once)</li>
 * <li>the body is unwrapped (the stored format is one
 *     {@code <p>line</p>} per source line), converted with
 *     {@link MarkdownToHtml}, and gated: allow-listed tags only, safe hrefs
 *     only, no residual md markers, and full text preservation — a post
 *     whose content the converter cannot represent is REFUSED (no write)
 *     and reported</li>
 * <li>{@code PUT /admin/guidance/{id}} (unscoped for the home locale;
 *     {@code ?locale=} scoped for a foreign locale — except when the
 *     locale's hero alt is blank, where the post-level pairing rule would
 *     400: then {@code PUT /admin/guidance/{id}/translations/<xx>}, which
 *     writes exactly the same four content fields and nothing else)</li>
 * <li>re-read and verify: body == {@code BodySanitizer.sanitize(converted)}
 *     byte-for-byte, and title/slug/locale/homeLocale/status/pinned/
 *     sortOrder/heroImageId/heroImageAlt unchanged</li>
 * </ol>
 *
 * <p>Re-runnable: a post whose body is already clean (no md markers) is
 * skipped without a write — already-converted HTML must NEVER pass through
 * the converter again (its tags would be escaped into literal text).
 * If a stored body is nevertheless damaged, {@code java ... MarkdownMigrationDriver repair}
 * rebuilds every body from the verbatim reference files.
 *
 * <p>Run from the repo root:
 * <pre>
 *   mvn -q -DskipTests test-compile
 *   java -cp target/classes:target/test-classes \
 *       ee.sheltermap.guidance.MarkdownMigrationDriver
 * </pre>
 */
public final class MarkdownMigrationDriver {

    private static final List<String> LOCALES = List.of("en", "et", "ru");
    private static final Set<String> ALLOWED_TAGS =
            Set.of("h2", "h3", "p", "br", "strong", "em", "ul", "ol", "li", "a", "blockquote");
    private static final Pattern SAFE_HREF = Pattern.compile("^(?i)(?:https?|mailto):\\S+$");
    private static final Pattern STORED_LINE = Pattern.compile("^<p>(.*)</p>$");
    private static final Path REFS_DIR = Path.of("docs/content/guidance-markdown");

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final String base;
    private String token;
    private final List<String> problems = new ArrayList<>();
    private int skippedClean = 0;
    private int written = 0;

    private MarkdownMigrationDriver(String base) {
        this.base = base;
    }

    public static void main(String[] args) throws Exception {
        String base = "http://localhost:8080";
        Path envFile = Path.of(".env");
        if (!Files.isRegularFile(envFile)) {
            System.err.println("MarkdownMigrationDriver: run from the repo root (.env not found)");
            System.exit(2);
        }
        Map<String, String> env = new HashMap<>();
        for (String line : Files.readAllLines(envFile, StandardCharsets.UTF_8)) {
            if (line.contains("=") && !line.startsWith("#")) {
                int eq = line.indexOf('=');
                env.put(line.substring(0, eq), line.substring(eq + 1).trim());
            }
        }
        String email = env.get("ADMIN_EMAIL");
        String password = env.get("ADMIN_PASSWORD");
        if (email == null || password == null) {
            System.err.println("MarkdownMigrationDriver: ADMIN_EMAIL/ADMIN_PASSWORD missing from .env");
            System.exit(2);
        }

        MarkdownMigrationDriver driver = new MarkdownMigrationDriver(base);
        driver.login(email, password);
        if (args.length > 0 && "repair".equals(args[0])) {
            driver.runRepair();
        } else {
            driver.runAll();
        }
        driver.report();
        System.exit(driver.problems.isEmpty() ? 0 : 1);
    }

    // ------------------------------------------------------------- plumbing

    private void login(String email, String password) throws Exception {
        ObjectNode body = MAPPER.createObjectNode();
        body.put("emailOrPhone", email);
        body.put("password", password);
        JsonNode resp = request("POST", "/auth/login", body, 200);
        token = resp.get("accessToken").asText();
        System.out.println("logged in as admin");
    }

    private JsonNode request(String method, String path, ObjectNode jsonBody, int expectedStatus)
            throws Exception {
        HttpRequest.Builder rb = HttpRequest.newBuilder()
                .uri(URI.create(base + path))
                .timeout(Duration.ofSeconds(30));
        if (token != null) {
            rb.header("authorization", "Bearer " + token);
        }
        HttpRequest.BodyPublisher publisher = jsonBody == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(MAPPER.writeValueAsString(jsonBody));
        rb.method(method, publisher);
        if (jsonBody != null) {
            rb.header("content-type", "application/json");
        }
        HttpResponse<String> resp = HTTP.send(rb.build(), HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() != expectedStatus) {
            throw new IllegalStateException(method + " " + path + " -> " + resp.statusCode() + ": "
                    + resp.body().substring(0, Math.min(300, resp.body().length())));
        }
        return MAPPER.readTree(resp.body());
    }

    private void runAll() throws Exception {
        for (String locale : LOCALES) {
            JsonNode list = request("GET", "/admin/guidance?locale=" + locale, null, 200);
            System.out.println("\n== locale " + locale + ": " + list.size() + " posts ==");
            for (JsonNode post : list) {
                migrateOne(locale, post.get("id").asLong());
            }
        }
    }

    /**
     * REPAIR mode: the verbatim reference files are the source of truth.
     * For every post, re-convert from {@code docs/content/guidance-markdown}
     * and write the result — used when a stored body was damaged (e.g. a
     * double conversion escaped the first conversion's tags into text).
     */
    private void runRepair() throws Exception {
        for (String locale : LOCALES) {
            JsonNode list = request("GET", "/admin/guidance?locale=" + locale, null, 200);
            System.out.println("\n== REPAIR " + locale + ": " + list.size() + " posts ==");
            for (JsonNode post : list) {
                repairOne(locale, post.get("id").asLong());
            }
        }
    }

    // ------------------------------------------------------------- per post

    private void migrateOne(String locale, long id) {
        String where = "[" + locale + " id=" + id + "]";
        try {
            JsonNode before = request("GET", "/admin/guidance/" + id + "?locale=" + locale, null, 200);
            String slug = before.get("slug").asText();
            String body = before.hasNonNull("bodyHtml") ? before.get("bodyHtml").asText() : "";
            System.out.println(where + " slug=" + slug + " " + markers(body));

            // 1) the verbatim reference copy (written once, never overwritten)
            Path ref = REFS_DIR.resolve(locale).resolve(slug + ".md");
            if (!Files.exists(ref)) {
                Files.createDirectories(ref.getParent());
                Files.writeString(ref, body, StandardCharsets.UTF_8);
            }

            // 2) already clean (no md markers)? Then there is nothing to
            //    convert — and NO re-conversion, because feeding already
            //    converted HTML back through the converter escapes its tags
            //    into literal text. Skip without a write (idempotent run).
            if (!needsConversion(body)) {
                skippedClean++;
                System.out.println(where + " already clean — skipped");
                return;
            }

            // 3) convert + gate
            String md = unwrapStored(body);
            convertGateWriteVerify(locale, id, before, md);
        } catch (Exception e) {
            problems.add(where + " ERROR: " + e.getMessage());
            System.out.println(where + " ERROR: " + e);
        }
    }

    /**
     * A stored body needs conversion exactly when it still carries markdown
     * markers: {@code **} or {@code ##} anywhere, a line starting with
     * {@code # }, a list line ({@code - }/{@code * }/{@code 1. }), a quote
     * line ({@code > }) or a fence — either raw or in the stored one-{@code <p>}
     * -per-line format. A body without them is already sanitizer-stable HTML
     * and must not pass through the converter again.
     */
    static boolean needsConversion(String body) {
        if (body.contains("**") || body.contains("##")) {
            return true;
        }
        for (String line : body.split("\n", -1)) {
            String t = line.strip();
            if (t.startsWith("# ") || t.startsWith("<p># ")) {
                return true;
            }
            if (t.startsWith("<p>- ") || t.startsWith("<p>* ") || t.startsWith("- ")
                    || t.startsWith("* ") || t.matches("^<p>\\d{1,3}\\. .*")
                    || t.matches("^\\d{1,3}\\. .*") || t.startsWith("<p>> ")
                    || t.startsWith("> ") || t.startsWith("```") || t.startsWith("<p>```") ) {
                return true;
            }
        }
        return false;
    }

    /**
     * REPAIR mode for one post: the source of truth is the verbatim
     * reference file (the pre-conversion body), NOT the current stored
     * body — so a damaged body (double-converted tags escaped into text)
     * is rebuilt from the original markdown.
     */
    private void repairOne(String locale, long id) {
        String where = "[" + locale + " id=" + id + "]";
        try {
            JsonNode before = request("GET", "/admin/guidance/" + id + "?locale=" + locale, null, 200);
            String slug = before.get("slug").asText();
            String stored = before.hasNonNull("bodyHtml") ? before.get("bodyHtml").asText() : "";
            Path ref = REFS_DIR.resolve(locale).resolve(slug + ".md");
            if (!Files.isRegularFile(ref)) {
                problems.add(where + " REFERENCE FILE MISSING: " + ref);
                System.out.println(where + " REFERENCE FILE MISSING: " + ref);
                return;
            }
            String refMd = Files.readString(ref, StandardCharsets.UTF_8);
            String html = MarkdownToHtml.convert(unwrapStored(refMd));
            List<String> gateFailures = gate(where, html, unwrapStored(refMd));
            if (!gateFailures.isEmpty()) {
                problems.add(where + " REFUSED: " + String.join("; ", gateFailures));
                System.out.println(where + " REFUSED — " + String.join("; ", gateFailures));
                return;
            }
            String expected = BodySanitizer.sanitize(html);
            if (expected.equals(stored)) {
                skippedClean++;
                System.out.println(where + " already matches the reference conversion — skipped");
                return;
            }
            put(locale, id, before, html);
            JsonNode after = request("GET", "/admin/guidance/" + id + "?locale=" + locale, null, 200);
            verifyUnchanged(where, before, after);
            String storedAfter = after.hasNonNull("bodyHtml") ? after.get("bodyHtml").asText() : "";
            if (!storedAfter.equals(expected)) {
                problems.add(where + " stored body != reference conversion (byte mismatch)");
                System.out.println(where + " STORED BODY MISMATCH vs reference conversion");
                return;
            }
            written++;
            System.out.println(where + " repaired — " + markers(storedAfter)
                    + " | len " + stored.length() + " -> " + storedAfter.length());
        } catch (Exception e) {
            problems.add(where + " ERROR: " + e.getMessage());
            System.out.println(where + " ERROR: " + e);
        }
    }

    /**
     * Convert, gate, write, re-read, verify — the shared core of migrate
     * (source: the stored body) and repair (source: the reference file).
     */
    private void convertGateWriteVerify(String locale, long id, JsonNode before, String md) throws Exception {
        String where = "[" + locale + " id=" + id + "]";
        String html = MarkdownToHtml.convert(md);
        List<String> gateFailures = gate(where, html, md);
        if (!gateFailures.isEmpty()) {
            problems.add(where + " REFUSED: " + String.join("; ", gateFailures));
            System.out.println(where + " REFUSED — " + String.join("; ", gateFailures));
            return;
        }
        put(locale, id, before, html);
        JsonNode after = request("GET", "/admin/guidance/" + id + "?locale=" + locale, null, 200);
        verifyUnchanged(where, before, after);
        String expected = BodySanitizer.sanitize(html);
        String storedAfter = after.hasNonNull("bodyHtml") ? after.get("bodyHtml").asText() : "";
        if (!storedAfter.equals(expected)) {
            problems.add(where + " stored body != sanitized conversion (byte mismatch)");
            System.out.println(where + " STORED BODY MISMATCH vs expected sanitizer output");
            return;
        }
        written++;
        System.out.println(where + " done — " + markers(storedAfter)
                + " | len -> " + storedAfter.length());
    }

    /** The stored format is one {@code <p>line</p>} per source line — unwrap it. */
    private static String unwrapStored(String body) {
        List<String> out = new ArrayList<>();
        for (String line : body.split("\n", -1)) {
            Matcher m = STORED_LINE.matcher(line);
            out.add(m.matches() ? m.group(1) : line);
        }
        return String.join("\n", out);
    }

    /**
     * The write. Unscoped post PUT for the home locale; scoped post PUT for
     * a foreign locale — except a foreign locale whose hero alt is blank
     * (the post-level pairing rule would 400 on a re-save), which goes
     * through the translations endpoint (the same four content fields,
     * nothing else).
     */
    private void put(String locale, long id, JsonNode before, String html) throws Exception {
        String title = before.get("title").asText();
        String slug = before.get("slug").asText();
        String heroAlt = before.hasNonNull("heroImageAlt") ? before.get("heroImageAlt").asText() : null;
        Long heroId = before.hasNonNull("heroImageId") ? before.get("heroImageId").asLong() : null;
        boolean pinned = before.get("pinned").asBoolean();
        String homeLocale = before.get("homeLocale").asText();
        boolean home = locale.equals(homeLocale);
        boolean blankAlt = heroAlt == null || heroAlt.isBlank();
        if (home) {
            ObjectNode body = postLevelBody(title, slug, html, homeLocale, pinned, heroId, heroAlt);
            request("PUT", "/admin/guidance/" + id, body, 200);
        } else if (!blankAlt || heroId == null) {
            ObjectNode body = postLevelBody(title, slug, html, homeLocale, pinned, heroId, heroAlt);
            request("PUT", "/admin/guidance/" + id + "?locale=" + locale, body, 200);
        } else {
            ObjectNode body = MAPPER.createObjectNode();
            body.put("slug", slug);
            body.put("title", title);
            body.put("body", html);
            if (heroAlt == null) {
                body.putNull("heroImageAlt"); // keep a NULL alt NULL (NULL -> '' would be a change)
            } else {
                body.put("heroImageAlt", heroAlt);
            }
            request("PUT", "/admin/guidance/" + id + "/translations/" + locale, body, 200);
        }
    }

    private static ObjectNode postLevelBody(String title, String slug, String html, String homeLocale,
                                            boolean pinned, Long heroId, String heroAlt) {
        ObjectNode body = MAPPER.createObjectNode();
        body.put("title", title);
        body.put("slug", slug);
        body.put("body", html);
        body.put("locale", homeLocale);
        body.put("pinned", pinned);
        if (heroId != null) {
            body.put("heroImageId", heroId);
        }
        if (heroAlt != null) {
            body.put("heroImageAlt", heroAlt);
        }
        return body;
    }

    private static void verifyUnchanged(String where, JsonNode before, JsonNode after) {
        String[] fields = {"slug", "title", "locale", "homeLocale", "status", "pinned",
                "sortOrder", "heroImageId", "heroImageAlt"};
        for (String f : fields) {
            JsonNode b = before.get(f);
            JsonNode a = after.get(f);
            boolean same = (b == null && a == null)
                    || (b != null && a != null && b.asText().equals(a.asText()));
            if (!same) {
                throw new IllegalStateException("field " + f + " changed: "
                        + (b == null ? "null" : b.asText()) + " -> " + (a == null ? "null" : a.asText()));
            }
        }
    }

    // ------------------------------------------------------------- the gate

    private static List<String> gate(String where, String html, String md) {
        List<String> failures = new ArrayList<>();
        Document doc = Jsoup.parseBodyFragment(html);
        Set<String> tags = doc.getAllElements().stream()
                .map(Element::tagName)
                .filter(t -> !t.equals("#root") && !t.equals("html")
                        && !t.equals("head") && !t.equals("body"))
                .collect(Collectors.toSet());
        Set<String> offending = new java.util.TreeSet<>(tags);
        offending.removeAll(ALLOWED_TAGS);
        if (!offending.isEmpty()) {
            failures.add("tags outside the allow-list: " + offending);
        }
        for (Element a : doc.getElementsByTag("a")) {
            if (!SAFE_HREF.matcher(a.attr("href")).matches()) {
                failures.add("unsafe href: " + a.attr("href"));
            }
        }
        if (html.contains("**")) {
            failures.add("residual ** marker");
        }
        if (html.contains("##")) {
            failures.add("residual ## marker");
        }
        for (String line : html.split("\n", -1)) {
            if (line.startsWith("# ")) {
                failures.add("residual '# ' line: " + line.substring(0, Math.min(40, line.length())));
                break;
            }
        }
        // content preservation: the text the HTML carries must equal the text
        // of the markdown once its PURE SYNTAX is removed
        String htmlText = htmlText(html);
        String mdText = mdText(md);
        if (!htmlText.equals(mdText)) {
            failures.add("content would be lost (text mismatch)");
            System.out.println(where + "   mdText: " + mdText.substring(0, Math.min(400, mdText.length())));
            System.out.println(where + "   htmlText: " + htmlText.substring(0, Math.min(400, htmlText.length())));
        }
        return failures;
    }

    private static String htmlText(String html) {
        // tags become SPACES so adjacent list items/blocks don't fuse
        String s = html.replaceAll("<[^>]*>", " ");
        s = s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
                .replace("&quot;", "\"").replace("&#39;", "'");
        return s.replaceAll("\\s+", " ").strip();
    }

    /**
     * The markdown's text with its pure syntax removed — the same
     * block/inline rules the converter applies, so the comparison is exact:
     * heading hashes, list markers, quote markers, fence lines, hr lines,
     * link URLs (href is not text), and emphasis delimiters vanish;
     * unpaired markers are CONTENT and stay.
     */
    private static String mdText(String md) {
        StringBuilder sb = new StringBuilder();
        boolean inFence = false;
        for (String raw : md.split("\n", -1)) {
            String t = raw.strip();
            if (t.isEmpty()) {
                continue;
            }
            if (t.matches("^(?:`{3,}|~{3,}).*")) {
                inFence = !inFence;
                continue;
            }
            if (inFence) {
                sb.append(t).append(' ');
                continue;
            }
            if (t.matches("^(?:-{3,}|\\*{3,}|_{3,})$")) {
                continue; // hr: dropped by the converter
            }
            Matcher h = MarkdownToHtmlTestPatterns.HEADING.matcher(t);
            Matcher b = MarkdownToHtmlTestPatterns.BULLET.matcher(t);
            Matcher n = MarkdownToHtmlTestPatterns.NUMBERED.matcher(t);
            Matcher q = MarkdownToHtmlTestPatterns.QUOTE.matcher(t);
            if (h.matches()) {
                t = h.group(2);
            } else if (b.matches()) {
                t = b.group(1);
            } else if (n.matches()) {
                t = n.group(2);
            } else if (q.matches()) {
                t = q.group(1);
            }
            t = t.replaceAll("\\[([^\\]]*)\\]\\([^)]*\\)", "$1"); // link: label only
            t = t.replaceAll("\\*\\*", "");                          // bold delimiters
            t = t.replaceAll("(?<!\\*)\\*([^*\\s][^*]*?)\\*(?!\\*)", "$1"); // em *
            t = t.replaceAll("(?<![\\w])_([^_\\s][^_]*?)_(?![\\w])", "$1");  // em _
            sb.append(t).append(' ');
        }
        return sb.toString().replaceAll("\\s+", " ").strip();
    }

    /** Marker census for the before/after report (on the raw stored body). */
    private static String markers(String body) {
        int stars = 0, i = 0;
        while ((i = body.indexOf("**", i)) >= 0) {
            stars++;
            i += 2;
        }
        int hashes = 0;
        i = 0;
        while ((i = body.indexOf("##", i)) >= 0) {
            hashes++;
            i += 2;
        }
        long hLines = java.util.Arrays.stream(body.split("\n", -1)).filter(l -> l.startsWith("# ") || l.startsWith("<p># ")).count();
        long bullets = java.util.Arrays.stream(body.split("\n", -1)).filter(l -> l.startsWith("<p>- ") || l.startsWith("<p>* ")).count();
        long nums = java.util.Arrays.stream(body.split("\n", -1))
                .filter(l -> l.matches("^<p>\\d+\\. .*$") || l.matches("^\\d+\\. .*$")).count();
        return String.format("markers{**=%d ##=%d #lines=%d bullets=%d numbered=%d}",
                stars, hashes, hLines, bullets, nums);
    }

    private void report() {
        System.out.println("\n== summary ==");
        System.out.println("posts written: " + written + ", already clean: " + skippedClean
                + ", problems: " + problems.size());
        for (String p : problems) {
            System.out.println("PROBLEM: " + p);
        }
        if (!problems.isEmpty()) {
            System.exit(1);
        }
    }

    /**
     * The converter's block patterns, exposed for the content-preservation
     * comparison (keeps the two in lockstep with the converter source).
     */
    static final class MarkdownToHtmlTestPatterns {
        static final Pattern HEADING = Pattern.compile("^(#{1,6}) +([^\\s].*)$");
        static final Pattern BULLET = Pattern.compile("^[-*] +([^\\s].*)$");
        static final Pattern NUMBERED = Pattern.compile("^(\\d{1,3})\\. +([^\\s].*)$");
        static final Pattern QUOTE = Pattern.compile("^> *([^\\s].*)$");

        private MarkdownToHtmlTestPatterns() {
        }
    }
}
