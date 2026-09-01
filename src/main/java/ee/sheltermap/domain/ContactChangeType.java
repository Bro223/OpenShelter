package ee.sheltermap.domain;

/**
 * Kind of contact change awaiting cross-channel verification
 * (01-user-verification.puml, auth context): an email change is confirmed by
 * an SMS code, a phone change by an email code.
 */
public enum ContactChangeType {
    EMAIL_CHANGE,
    PHONE_CHANGE
}
