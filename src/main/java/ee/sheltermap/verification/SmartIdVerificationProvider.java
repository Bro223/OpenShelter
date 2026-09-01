package ee.sheltermap.verification;

import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import org.springframework.stereotype.Service;

/**
 * Smart-ID channel adapter — <strong>STUB in v1</strong>.
 *
 * <p>Future flow = start a session + poll: the provider proves identity
 * itself via PKI — there is no stored code to confirm. Only this class
 * changes when Smart-ID goes live (TIJ Ch 9: the seam is the interface).
 *
 * <p>Until then both methods throw {@link UnsupportedOperationException} so
 * the stub can never be mistaken for a working channel. Registered as a bean
 * so the level map is complete; the controller rejects SMART_ID requests
 * with 400 before reaching the stub.
 */
@Service
public class SmartIdVerificationProvider implements VerificationProvider {

    @Override
    public String providerCode() {
        return "smart-id";
    }

    @Override
    public VerificationLevel level() {
        return VerificationLevel.SMART_ID;
    }

    @Override
    public PendingVerification request(RegisteredUser user) {
        throw new UnsupportedOperationException(
                "Smart-ID is a stub in v1: no stored code. Future flow starts a session and "
                        + "polls; the provider proves identity via PKI.");
    }

    @Override
    public boolean confirm(RegisteredUser user, PendingVerification pending, String code) {
        throw new UnsupportedOperationException(
                "Smart-ID is a stub in v1: no stored code to confirm.");
    }
}
