package ee.sheltermap.domain;

/**
 * The admin-editable site text (site_texts, V27): one stored override for
 * a (key, locale) pair. {@code key} is a member of the closed allowlist
 * ({@code ee.sheltermap.sitetexts.SiteTextKeys}) — the admin edits VALUES,
 * never invents keys; the shipped i18n catalog is the default when no row
 * exists. {@code value} is plain text (rendered auto-escaped by the
 * frontend, never HTML). {@code url} is present only for the two footer
 * source-link keys and always starts with {@code https://} (enforced by
 * the V27 CHECK and pre-checked in the service for the readable 400).
 */
public class SiteText {

    private Long id;
    private String key;
    private String locale;
    private String value;
    private String url;

    public SiteText() {
    }

    public SiteText(String key, String locale, String value, String url) {
        this.key = key;
        this.locale = locale;
        this.value = value;
        this.url = url;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
