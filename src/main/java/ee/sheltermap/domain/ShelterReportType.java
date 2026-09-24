package ee.sheltermap.domain;

/**
 * What a community shelter report claims (shelter-trust-and-reports).
 * The type is what routes the consequence: {@code NON_EXISTENT} auto-hides
 * the shelter at 5 reports; {@code CLOSED}/{@code OPEN_CONFIRMED} net out to
 * a display flag only; {@code WRONG_LOCATION}/{@code OTHER} go to the admin
 * queue (later change) with no user-facing effect.
 */
public enum ShelterReportType {
    NON_EXISTENT,
    CLOSED,
    OPEN_CONFIRMED,
    WRONG_LOCATION,
    OTHER
}
