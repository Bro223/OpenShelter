package ee.sheltermap.domain;

import java.time.Instant;

/**
 * Admin account (the {@code kind = ADMIN} row of the single
 * {@code users} table, approach B) — a fully verified registered account
 * whose row kind, not its class in the domain, is the authorization truth.
 *
 * <p>Provisioning is env-driven, never the registration flow
 * (admin-moderation D1): the admin mailbox does not exist by design, so
 * the account is born with EVERY verification claim pre-set and
 * {@link #canWrite()} is true from the first request, without any
 * email/SMS verification. Admin authorization is a fresh kind lookup per
 * request (no JWT role claim — D2), so this class never grants anything by
 * itself; it only exists so the persistence layer can round-trip the
 * ADMIN kind (kinds are fixed at creation, verification is claims,
 * never subclasses — the TIJ "Bird" rule holds for the admin too).
 */
public class AdminUser extends RegisteredUser {

    /**
     * Persistence constructor (Step 3 style): the stored claims are
     * restored by the caller ({@code UserMapper}) — a reload reflects the
     * stored claim state, revoked ones included. The stored phone is null
     * for provisioned admins (no phone route — see the admin-only
     * {@link RegisteredUser} constructor).
     */
    public AdminUser(String name, String email, String phone) {
        super(name, email, phone, true);
    }

    /**
     * A freshly provisioned admin (AdminSeeder, admin-moderation D1): every
     * verification claim pre-set (EMAIL, PHONE, SMART_ID) — the account is
     * fully writable without the verification channels its non-existent
     * mailbox could never pass. No phone: the account is not a phone-login
     * route (the PHONE claim's ref carries the e-mail, which is the
     * account's real contact).
     *
     * <p>The SMART_ID claim's {@code external_ref} also carries the e-mail:
     * no ID code is stored anywhere (remove-national-id D4), and the column
     * is NOT NULL — the e-mail is a stable, non-sensitive placeholder until
     * the real PKI flow lands and supplies its own external reference.
     */
    public static AdminUser provisioned(String name, String email) {
        AdminUser admin = new AdminUser(name, email, null);
        Instant now = Instant.now();
        admin.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "system", email, now));
        admin.addVerification(new VerificationClaim(VerificationLevel.PHONE, "system", email, now));
        admin.addVerification(new VerificationClaim(
                VerificationLevel.SMART_ID, "system", email, now));
        return admin;
    }
}
