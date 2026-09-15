package ee.sheltermap.app;

/**
 * App-level display facts shared across packages.
 *
 * <p>{@link #APP_DISPLAY_NAME} is the product name used in every
 * user-received message (e-mail, SMS, SMTP subject). It lives here —
 * in the dependency-free {@code app} layer, which both {@code auth}
 * and {@code verification} already import (verification → app is
 * acyclic: {@code app} imports only {@code domain}) — so the brand
 * cannot drift between channels.
 *
 * <p>Deliberately one spelling of the brand: the product is
 * OpenShelter (frontend {@code core/title.ts} APP_NAME, browser tabs,
 * User-Agent). {@code spring.application.name: shelter-map} and the
 * {@code ee.sheltermap} package are internal identifiers and stay as
 * committed.
 */
public final class AppInfo {

    /** The product name shown to users in outgoing messages. */
    public static final String APP_DISPLAY_NAME = "OpenShelter";

    private AppInfo() {
    }
}
