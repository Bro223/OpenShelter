package ee.sheltermap.sitetexts;

import java.util.Set;

/**
 * The server-side twin of the frontend's allowlist
 * ({@code frontend/src/app/core/i18n/site-texts.ts}): the CLOSED set of
 * catalog keys an admin may override. The admin edits VALUES, never
 * invents keys — a PUT naming anything else is a 400, and the frontend
 * can only send allowlist keys to begin with (it renders from the same
 * list). A unit test pins this set (the lockstep guard).
 *
 * <p>The two footer source links are LABEL + URL pairs: only
 * {@link #LINK_KEYS} may carry a url, and the url must be https
 * (checked here in {@code SiteTextsService} for the readable 400, and
 * again by the V27 CHECK at the database).
 */
public final class SiteTextKeys {

    /** The Popup block — the accessibility dialog's copy. */
    public static final Set<String> POPUP_KEYS = Set.of(
            "a11y.popup.title",
            "a11y.popup.body",
            "a11y.option.default",
            "a11y.option.default.desc",
            "a11y.option.highContrast",
            "a11y.option.highContrast.desc",
            "a11y.option.blackYellow",
            "a11y.option.blackYellow.desc",
            "a11y.popup.footer",
            "a11y.popup.close");

    /** The Header block — the app header's own texts. */
    public static final Set<String> HEADER_KEYS = Set.of(
            "a11y.button",
            "nav.map",
            "nav.guidance",
            "nav.account",
            "nav.admin",
            "lang.label",
            "auth.login",
            "auth.logout",
            "auth.register");

    /** The Footer block — the app-wide safety notice + legal/data rows. */
    public static final Set<String> FOOTER_KEYS = Set.of(
            "footer.notice1",
            "footer.notice2",
            "footer.notice3",
            "footer.rescueBoard",
            "footer.and",
            "footer.ministry",
            "footer.privacy",
            "footer.terms",
            "footer.dataSource",
            "footer.lastImport",
            "footer.officialOpenData",
            "footer.dataSourceTransformed");

    /** The full allowlist — the union; the service checks membership here. */
    public static final Set<String> KEYS;

    /** The label + https-URL pair keys (the URL is stored on the `en` row). */
    public static final Set<String> LINK_KEYS = Set.of(
            "footer.rescueBoard",
            "footer.ministry");

    /** The locales the site serves (the V27 CHECK set). */
    public static final Set<String> LOCALES = Set.of("en", "et", "ru");

    /** The admin value cap — mirrored by the frontend input (maxlength=500). */
    public static final int VALUE_MAX = 500;

    /** The sane per-request cap (31 keys × 3 locales = 93; 200 is generous). */
    public static final int MAX_ENTRIES_PER_REQUEST = 200;

    static {
        var all = new java.util.HashSet<String>();
        all.addAll(POPUP_KEYS);
        all.addAll(HEADER_KEYS);
        all.addAll(FOOTER_KEYS);
        KEYS = Set.copyOf(all);
    }

    private SiteTextKeys() {
    }

    /** True when the key is in the allowlist (the admin may edit it). */
    public static boolean isKey(String key) {
        return key != null && KEYS.contains(key);
    }

    /** True when the locale is one the site serves. */
    public static boolean isLocale(String locale) {
        return locale != null && LOCALES.contains(locale);
    }

    /** True when the key carries a URL (label + https URL pair). */
    public static boolean isLink(String key) {
        return key != null && LINK_KEYS.contains(key);
    }
}
