package ee.sheltermap.domain;

/**
 * What a community shelter report claims. The type is what routes
 * the consequence:
 *
 * <ul>
 *   <li>{@code NON_EXISTENT} — the negative claim: auto-hides the
 *       shelter at the weighted open tally of {@link
 *       ShelterReport#AUTO_HIDE_THRESHOLD} reports; open reports of
 *       this kind turn the pin reported.</li>
 *   <li>{@code OPEN_CONFIRMED} — the positive mirror: drives the
 *       auto-confirm that promotes a NEW row at {@link
 *       ShelterReport#AUTO_CONFIRM_THRESHOLD} distinct confirmers.</li>
 *   <li>{@code CLOSED} — no automatic consequence (the display flag it
 *       once drove is retired); the detail stores the "when".</li>
 *   <li>{@code WRONG_LOCATION} / {@code OTHER} — the "inaccurate
 *       information" reports: open reports of either kind turn the pin
 *       reported, derive {@code REPORTED_INACTIVE} on a hidden row, and
 *       queue for the admin.</li>
 * </ul>
 */
public enum ShelterReportType {
    NON_EXISTENT,
    CLOSED,
    OPEN_CONFIRMED,
    WRONG_LOCATION,
    OTHER
}
