package ee.sheltermap.guidance;

import java.util.regex.Pattern;

/**
 * Slug generation and validation (crisis-guidance D5).
 *
 * <p>{@link #of(String)} turns a title into a URL slug: lowercase → an
 * EXPLICIT Estonian transliteration ({@code õ→o, ä→a, ö→o, ü→u, š→s, ž→z} —
 * an explicit map rather than an NFD strip, because those six are the
 * letters Estonian actually uses and a silent strip would produce
 * {@code rnnaku} instead of {@code runnaku} for {@code rünnaku}) → every
 * other non-alphanumeric run becomes a single {@code -} → leading/trailing
 * {@code -} trimmed → bounded to the slug column width (200, V23) and
 * re-trimmed → a fixed fallback when the result is empty (a title of
 * {@code "!!!"} still gets a URL).
 *
 * <p>{@link #isValidCustomSlug(String)} accepts an admin-supplied slug only
 * in the shape the generator produces ({@code ^[a-z0-9]+(-[a-z0-9]+)*$},
 * length 1..200), so a hand-written slug and a generated one are
 * indistinguishable in the URL.
 *
 * <p>Stateless — a plain utility class, no Spring wiring.
 */
public final class SlugFactory {

    /** The slug column width (V23 {@code guidance_posts.slug VARCHAR(200)}) — the bound every slug obeys. */
    public static final int MAX_SLUG_LENGTH = 200;

    /** The fixed fallback: a title with no letters or digits still gets a URL. */
    public static final String FALLBACK_SLUG = "post";

    /** The shape generated and admin-supplied slugs must share (D5). */
    public static final Pattern VALID_SLUG = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");

    private SlugFactory() {
    }

    /**
     * Generates the slug for a title (D5 step by step). The result always
     * matches {@link #VALID_SLUG} and is at most {@link #MAX_SLUG_LENGTH}
     * characters.
     */
    public static String of(String title) {
        if (title == null || title.isBlank()) {
            return FALLBACK_SLUG;
        }
        StringBuilder chars = new StringBuilder(title.length());
        for (int i = 0; i < title.length(); i++) {
            char c = Character.toLowerCase(title.charAt(i));
            String transliterated = transliterate(c);
            if (transliterated != null) {
                chars.append(transliterated);
            } else if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
                chars.append(c);
            } else {
                // Every other character (spaces, punctuation, unmapped
                // letters) becomes a separator; the run is collapsed below.
                chars.append('-');
            }
        }
        String slug = chars.toString()
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
        if (slug.length() > MAX_SLUG_LENGTH) {
            // Truncate to the column width, then re-trim: the cut can
            // leave a dangling separator at the end.
            slug = slug.substring(0, MAX_SLUG_LENGTH).replaceAll("-$", "");
        }
        return slug.isEmpty() ? FALLBACK_SLUG : slug;
    }

    /**
     * Validates an admin-supplied slug: the generated shape
     * ({@code ^[a-z0-9]+(-[a-z0-9]+)*$}) and length 1..{@link
     * #MAX_SLUG_LENGTH}.
     */
    public static boolean isValidCustomSlug(String slug) {
        return slug != null && slug.length() <= MAX_SLUG_LENGTH && VALID_SLUG.matcher(slug).matches();
    }

    /**
     * The explicit diacritic map (lowercase input — the caller lowercases
     * first). Estonian's six letters are the primary concern (D5); the
     * other Latin diacritics are the common European ones, mapped so a
     * non-Estonian title still yields a readable slug instead of
     * gaps. Unmapped characters return null (treated as separators).
     */
    private static String transliterate(char c) {
        return switch (c) {
            // Estonian (D5): the six letters Estonian actually uses.
            case 'õ' -> "o";
            case 'ä' -> "a";
            case 'ö' -> "o";
            case 'ü' -> "u";
            case 'š' -> "s";
            case 'ž' -> "z";
            // Other common Latin diacritics (justified: without them a
            // single accented letter would vanish, leaving a gap).
            case 'á', 'à', 'â', 'å', 'ą' -> "a";
            case 'æ' -> "ae";
            case 'ç', 'ć', 'č' -> "c";
            case 'ď', 'đ', 'ð' -> "d";
            case 'é', 'è', 'ê', 'ë', 'ę' -> "e";
            case 'í', 'ì', 'î', 'ï' -> "i";
            case 'ł', 'ľ' -> "l";
            case 'ñ', 'ň', 'ņ' -> "n";
            case 'ó', 'ò', 'ô', 'ø' -> "o";
            case 'ř', 'ŕ' -> "r";
            case 'ß' -> "ss";
            case 'ť', 'ţ', 'ŧ' -> "t";
            case 'ú', 'ù', 'û', 'ů' -> "u";
            case 'ý', 'ÿ' -> "y";
            case 'ź', 'ż' -> "z";
            default -> null;
        };
    }
}
