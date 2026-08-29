package ee.sheltermap.domain;

/**
 * The verification channels a {@link RegisteredUser} can earn over time.
 * Verification is data ({@code Set<VerificationClaim>}), never a subclass.
 */
public enum VerificationLevel {
    EMAIL,
    PHONE,
    SMART_ID
}
