package ee.sheltermap.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * JPA entity for {@code site_texts} (V27, site_texts). The closed
 * locale set, the non-blank value and the https-only URL are enforced
 * by the V27 CHECKs; the {@code (key, locale)} uniqueness by
 * {@code uq_site_texts_key_locale}. Every mapped column exists in V27
 * with the same shape (ddl-auto=validate stays green).
 */
@Entity
@Table(name = "site_texts")
public class SiteTextEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** A member of the SiteTextKeys allowlist (checked in the service). */
    @Column(name = "key", nullable = false, length = 64)
    private String key;

    /** en | et | ru (the V27 CHECK). */
    @Column(nullable = false, length = 2)
    private String locale;

    /** The plain-text override (the V27 non-blank CHECK, max 500). */
    @Column(nullable = false, length = 500)
    private String value;

    /** Link keys only (footer.rescueBoard / footer.ministry); https only. */
    @Column(name = "url", length = 2048)
    private String url;

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
