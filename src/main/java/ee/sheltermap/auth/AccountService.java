package ee.sheltermap.auth;

import ee.sheltermap.api.SubmitterVerification;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.ProvisionedAdminProtectedException;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.LocationKind;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.domain.UserData;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * The account surface behind {@code GET /account/me} and
 * {@code PUT /account/profile}: the authenticated user's real profile
 * (name, email, phone + the real verified claim set) and the
 * password-confirmed name edit. Also the data export and the account
 * erasure.
 *
 * <p>Email/phone are NOT editable here — they stay on the cross-channel
 * change flows ({@link ContactChangeService}). Identity fields have no
 * second channel to prove against, so possession of the current password is
 * the gate: a stolen session cannot rewrite the identity anchor.
 */
@Service
public class AccountService {

    /**
     * The 403 refusal for the provisioned admin's self-erasure: the
     * environment-provisioned administrator is the deployment's access path,
     * and de-provisioning is an operator action on the environment — never
     * an in-app one (the seeder would otherwise resurrect it, or the
     * operator would be locked out of {@code /admin/*}).
     */
    public static final String PROVISIONED_ADMIN_DELETE_MESSAGE =
            "The environment-provisioned administrator account cannot be deleted from the app. "
                    + "De-provision it by removing the ADMIN_EMAIL and ADMIN_PASSWORD environment variables";

    private final UserRepository userRepository;
    private final UserCredentialsRepository credentials;
    private final PasswordHasher passwordHasher;
    private final ShelterRepository shelterRepository;
    private final ModerationAuditLog moderationAudit;

    public AccountService(UserRepository userRepository,
                          UserCredentialsRepository credentials,
                          PasswordHasher passwordHasher,
                          ShelterRepository shelterRepository,
                          ModerationAuditLog moderationAudit) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository");
        this.credentials = Objects.requireNonNull(credentials, "credentials");
        this.passwordHasher = Objects.requireNonNull(passwordHasher, "passwordHasher");
        this.shelterRepository = Objects.requireNonNull(shelterRepository, "shelterRepository");
        this.moderationAudit = Objects.requireNonNull(moderationAudit, "moderationAudit");
    }

    /** Real profile snapshot for GET /account/me — never an optimistic mirror. */
    @Transactional(readOnly = true)
    public MeResponse profile(RegisteredUser user) {
        return MeResponse.from(user);
    }

    /**
     * PUT /account/profile: verifies the current password BEFORE any update
     * (wrong → {@link InvalidProfilePasswordException} → 401, nothing is
     * written), then replaces the name and returns the fresh
     * {@link MeResponse} so the client adopts it in one round trip.
     *
     * <p>Validation is deliberately identical to registration (blank-only,
     * values stored as given — see {@link ProfileUpdateRequest}). No
     * national ID code is collected or editable.
     */
    @Transactional
    public MeResponse updateProfile(RegisteredUser user, ProfileUpdateRequest request) {
        Objects.requireNonNull(request, "request");
        UserCredentials stored = credentials.findByUserId(user.getId());
        if (stored == null || !passwordHasher.verify(request.currentPassword(), stored.getPasswordHash())) {
            throw new InvalidProfilePasswordException();
        }
        user.changeName(request.name());
        userRepository.save(user);
        return MeResponse.from(user);
    }

    /**
     * GET /account/export: the caller's own data in one
     * document — the profile (name/e-mail/phone decrypted at the
     * persistence boundary + verified levels) and EVERY author-scoped
     * shelter row, all statuses: the export mirrors what the account
     * submitted, including auto-hidden ones. A pure read — nothing is
     * updated, nothing is logged.
     */
    @Transactional(readOnly = true)
    public DataExportResponse dataExport(RegisteredUser user) {
        UserData data = user.getData();
        DataExportResponse.ExportedProfile profile = new DataExportResponse.ExportedProfile(
                data.name(), data.email(), data.phone(),
                Stream.of(VerificationLevel.values()).filter(data.levels()::contains).toList());

        List<DataExportResponse.ExportedShelter> shelters =
                shelterRepository.findByCreatedBy(user.getId()).stream()
                        .map(AccountService::exportedShelter)
                        .toList();

        return new DataExportResponse(profile, shelters);
    }

    /** One author-scoped shelter row of the export document. */
    private static DataExportResponse.ExportedShelter exportedShelter(Shelter shelter) {
        return new DataExportResponse.ExportedShelter(
                shelter.getId(), shelter.getName(), shelter.getAddress(),
                shelter.getLocation() == null ? null : shelter.getLocation().lat(),
                shelter.getLocation() == null ? null : shelter.getLocation().lng(),
                shelter.getSource().name(), shelter.getStatus().name(),
                shelter.getReviewStatus().name(), shelter.getLocationKind().name(),
                shelter.getDescription(), shelter.getCapacity(), shelter.getCreatedAt());
    }

    /**
     * DELETE /account — the account erasure, one
     * transaction.
     *
     * <p>Declared private homes are PURGED — the submitter's personal data
     * must not outlive the erasure request — as entity-level deletes, so a
     * same-transaction follow-up read sees the rows gone (a bulk JPQL
     * delete would leave them cached); their child rows cascade via the
     * DB. Public community rows are ORPHANED instead ({@code created_by
     * -> NULL}, V7's ON DELETE SET NULL intent executed explicitly): map
     * data outlives accounts, and the standing is preserved — a CONFIRMED
     * row stays CONFIRMED with no author, a newly-NULL creator is not a
     * signal to re-review, and the row's trust standing (the V31 verified
     * snapshot, plus the V35 depth freeze re-frozen to the row's standing
     * at this very moment) is what any read of the orphaned row serves.
     * The moderation-audit action rows survive,
     * their free-text reasons redacted (the notes were written to the
     * erased submitter and may echo their contacts). The user row is
     * erased and the DB does the rest: every child {@code user_id} FK is
     * ON DELETE CASCADE (credentials, claims, pending verifications +
     * contact changes, refresh + password-reset tokens, reports, report
     * actions) and the relaxed moderation_actions FK (V14) nulls the
     * moderator reference (audit rows survive, ids dangle).
     */
    @Transactional
    public void deleteAccount(RegisteredUser user) {
        Objects.requireNonNull(user, "user");
        // The provisioned admin is the deployment's access path — self-erasure
        // is a lockout vector, and the env vars (not the app) own this
        // account's identity (kind ADMIN — the durable, restart-proof truth).
        if (user instanceof AdminUser) {
            throw new ProvisionedAdminProtectedException(PROVISIONED_ADMIN_DELETE_MESSAGE);
        }
        long userId = user.getId();

        // The user's rows, read ONCE: the step below mutates them in place
        // (managed entities), and the full id set — purged private homes
        // included — is the audit-redaction scope.
        List<Shelter> mine = shelterRepository.findByCreatedBy(userId);
        // The V35 depth freeze: the submitter's verification DEPTH as the
        // orphaned rows read it at this very moment — the same pure
        // function over the same active claim set the live derivation
        // serves, so each orphaned row keeps exactly the standing it had
        // while the account was active. Computed BEFORE the user row goes:
        // the claim set cascades away with it, and this is the last moment
        // it can be read.
        SubmitterVerification depthAtErasure = SubmitterVerification.of(user.getData().levels());
        purgePrivateHomesAndOrphanPublicRows(mine, depthAtErasure);

        // The audit rows stay; their free text goes.
        if (!mine.isEmpty()) {
            moderationAudit.clearReasonByShelterIds(mine.stream().map(Shelter::getId).toList());
        }

        // The account itself — the DB cascades the child rows.
        user.deleteAccount();
        userRepository.delete(userId);
    }

    /**
     * The shelter side of the erasure, row by row: a declared private home
     * is purged; a public community row is orphaned — {@code created_by}
     * and the submitter-facing review note go NULL, the review and open
     * status stay exactly as they were, and the V35 depth snapshot is
     * re-frozen to {@code depthAtErasure} (the row's standing at the
     * moment of the erasure): the live derivation dies with the author,
     * so the orphaned row serves this frozen depth instead of it. A null
     * here means the author had nothing confirmed — the row reads
     * unverified, exactly as it read before the erasure.
     */
    private void purgePrivateHomesAndOrphanPublicRows(List<Shelter> shelters,
                                                      SubmitterVerification depthAtErasure) {
        for (Shelter shelter : shelters) {
            if (shelter.getLocationKind() == LocationKind.PRIVATE) {
                shelterRepository.deleteById(shelter.getId());
            } else {
                shelter.setCreatedBy(null);
                shelter.setReviewNote(null);
                shelter.setSubmitterVerificationSnapshot(
                        depthAtErasure == null ? null : depthAtErasure.name());
                shelterRepository.save(shelter);
            }
        }
    }
}
