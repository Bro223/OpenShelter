package ee.sheltermap.sitetexts;

/**
 * A refused site-text write (site_texts): an unknown key (the admin
 * cannot invent keys — the allowlist is closed), an unknown locale, an
 * oversized value, a URL on a non-link key, or a non-https URL. The
 * admin controller maps it to a uniform 400 (the message is shown to
 * the admin verbatim).
 */
public class SiteTextValidationException extends RuntimeException {

    public SiteTextValidationException(String message) {
        super(message);
    }
}
