package ee.sheltermap.guidance;

/**
 * An admin-supplied slug that another post already holds (crisis-guidance
 * D5) — 409, naming the slug. The admin asked for that exact URL, so it is
 * never silently rewritten (an auto-generated collision is the one case
 * that gets a {@code -2}/{@code -3} suffix). Uniqueness spans drafts and
 * published posts alike: a draft reserves its slug.
 */
public class SlugAlreadyUsedException extends RuntimeException {

    private final String slug;

    public SlugAlreadyUsedException(String slug) {
        super("Slug '" + slug + "' is already in use");
        this.slug = slug;
    }

    /** The colliding slug the client asked for. */
    public String slug() {
        return slug;
    }
}
