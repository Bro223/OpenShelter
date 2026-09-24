package ee.sheltermap.domain;

/**
 * Kind of contact change awaiting cross-channel verification: an email
 * change is confirmed by an SMS code, a phone change by an email code.
 */
public enum ContactChangeType {
    EMAIL_CHANGE,
    PHONE_CHANGE
}
