package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Account holder (Penguin) — becomes verified over time via
 * {@link VerificationClaim claims} (data, never subclasses).
 */
public class RegisteredUser extends User {

    private static final VerificationPolicy DEFAULT_POLICY = new VerificationPolicy(VerificationRules.ofDefaults());

    private String name;
    private String email;
    private String phone;
    private final Set<VerificationClaim> verifications = new LinkedHashSet<>();

    public RegisteredUser(String name, String email, String phone) {
        this.name = Objects.requireNonNull(name, "name");
        this.email = Objects.requireNonNull(email, "email");
        this.phone = Objects.requireNonNull(phone, "phone");
    }

    /**
     * Admin-only: {@code phone} may be null — the provisioned admin has
     * NO phone route. Null is outside the unique {@code uq_users_phone}
     * index (partial, WHERE phone IS NOT NULL), so it can never collide
     * with any other user, and it can never be a login contact. Every
     * other path keeps the public constructor's non-null guarantee.
     */
    protected RegisteredUser(String name, String email, String phone, boolean admin) {
        this.name = Objects.requireNonNull(name, "name");
        this.email = Objects.requireNonNull(email, "email");
        if (!admin) {
            Objects.requireNonNull(phone, "phone");
        }
        this.phone = phone;
    }

    /** Adds a verified claim (called by the verification service on success). */
    public void addVerification(VerificationClaim claim) {
        verifications.add(Objects.requireNonNull(claim, "claim"));
    }

    /**
     * Read access to the full claim set, revoked ones included — needed by
     * the persistence layer to store the aggregate. Business code
     * should prefer {@link #levels()}.
     */
    public Set<VerificationClaim> claims() {
        return Collections.unmodifiableSet(verifications);
    }

    /**
     * Replaces the email. Caller must have verified the change via the OTHER
     * channel (SMS code) — see {@code ee.sheltermap.auth.ContactChangeService}.
     * Runtime-changing state is data, never a new subclass.
     */
    public void changeEmail(String newEmail) {
        this.email = Objects.requireNonNull(newEmail, "newEmail");
    }

    /**
     * Replaces the phone (stored as given; the SMS channel normalizes to E.164
     * at the boundary). Caller must have verified the change via the OTHER
     * channel (email code) — see {@code ee.sheltermap.auth.ContactChangeService}.
     */
    public void changePhone(String newPhone) {
        this.phone = Objects.requireNonNull(newPhone, "newPhone");
    }

    /**
     * Replaces the display name (stored as given, exactly like registration).
     * Caller must have proven possession of the account password — see
     * {@code ee.sheltermap.auth.AccountService}.
     */
    public void changeName(String newName) {
        this.name = Objects.requireNonNull(newName, "newName");
    }

    /**
     * Revokes the active claim for {@code level} at {@code revokedAt}, if
     * any. No-op otherwise. The stamp comes from the caller (the
     * Clock-injected service), so tests can pin it.
     */
    public void revoke(VerificationLevel level, Instant revokedAt) {
        verifications.stream()
                .filter(c -> c.getLevel() == level && !c.isRevoked())
                .findFirst()
                .ifPresent(c -> c.revoke(revokedAt));
    }

    /** Derived, never stored: levels of all non-revoked claims. */
    public Set<VerificationLevel> levels() {
        Set<VerificationLevel> active = verifications.stream()
                .filter(c -> !c.isRevoked())
                .map(VerificationClaim::getLevel)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return Collections.unmodifiableSet(active);
    }

    @Override
    public boolean canWrite() {
        return DEFAULT_POLICY.allows(levels(), Capability.SUBMIT_SHELTER);
    }

    @Override
    public UserData getData() {
        return new UserData(name, email, phone, levels());
    }

    @Override
    public void deleteAccount() {
        // Domain-level cascade: drop all verification claims.
        // The service-level cascade (the account's rows, credentials,
        // tokens) is AccountService.deleteAccount's job.
        verifications.clear();
    }
}
