package ee.sheltermap.api;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.NonSuspendableUserException;
import ee.sheltermap.app.Pagination;
import ee.sheltermap.app.ProvisionedAdminProtectedException;
import ee.sheltermap.app.UserNotFoundException;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;

import java.time.Clock;
import java.util.List;
import java.util.Objects;

/**
 * The account (Users tab) moderation surface — the paged account
 * list and the suspend/unsuspend guards — extracted from
 * {@link AdminModerationService}.
 *
 * <p>This class is deliberately NOT a Spring bean: {@code
 * AdminModerationService} (whose constructor the unit suite freezes
 * at its nine collaborators) constructs it from its own user
 * repository, clock and audit log, and its public {@code
 * listUsers} / {@code suspend} / {@code unsuspend} methods are
 * called from the service's {@code @Transactional} delegates —
 * the bean methods keep the transaction boundary and the public
 * surface.
 *
 * <p>The suspension rules (unchanged by the extraction): only
 * REGISTERED accounts can be suspended (GUEST → 409, no
 * credentials); the provisioned ADMIN account is never suspendable
 * (403 — the deployment's access path, a lockout vector); the
 * guards run in order 404 → 403 → 409. Both actions are
 * idempotent — a no-op records no audit row — and the audit row
 * joins the SAME transaction as the action, shelterless (the
 * account is the subject).
 */
public class AdminUserModeration {

    /** Plain-spoken 409 for a suspend/unsuspend of a GUEST account (no credentials). */
    public static final String NON_REGISTERED_SUSPENSION_MESSAGE =
            "Only registered user accounts can be suspended";

    /**
     * Plain-spoken 403 for a suspend/unsuspend of the provisioned ADMIN
     * account: the environment-provisioned administrator is the
     * deployment's access path — disabling it is a lockout vector, and the
     * env vars (not the app) own the account.
     */
    public static final String PROVISIONED_ADMIN_SUSPENSION_MESSAGE =
            "The environment-provisioned administrator account cannot be suspended or unsuspended";

    private final UserRepository users;
    private final Clock clock;
    private final ModerationAuditLog audit;

    public AdminUserModeration(UserRepository users, Clock clock, ModerationAuditLog audit) {
        this.users = Objects.requireNonNull(users, "users");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.audit = Objects.requireNonNull(audit, "audit");
    }

    /**
     * The Users tab's page: every REGISTERED and ADMIN account (the
     * guest exclusion is IN THE SQL — the read never loads, and never
     * decrypts, the whole account population), with the suspension
     * state. {@code from}/{@code size} are the already-normalized page
     * window (the 400 vocabulary and the default limit run in the
     * service delegate, BEFORE the read); the total is the tab's
     * population WITHOUT paging (the X-Total-Count value).
     */
    public Pagination.Paged<AdminUserDto> listUsers(long from, int size) {
        List<AdminUserDto> dtos = users.findAccountPage(from, size).stream()
                .map(AdminUserModeration::toUserDto)
                .toList();
        return new Pagination.Paged<>(dtos, users.countAccounts());
    }

    /** The tab's row: the account identity it needs plus the suspension state. */
    private static AdminUserDto toUserDto(User user) {
        return AdminUserDto.of(user.getData(), kindName(user), user.getSuspendedAt(), user.getId());
    }

    /**
     * Set the suspension stamp on a REGISTERED account (idempotent:
     * re-suspending an already-suspended account is a no-op that
     * records no audit row). Unknown id → 404; ADMIN → 403 (the
     * provisioned admin is a lockout vector — it cannot be disabled
     * at all); GUEST → 409 (no credentials). The audit row joins
     * this transaction with the account as subject (shelterless row).
     */
    public void suspend(long moderatorId, long userId) {
        User user = requireSuspendableUser(userId);
        if (user.isSuspended()) {
            return; // already suspended: a no-op records no audit row
        }
        user.suspend(clock.instant());
        users.save(user);
        audit.record(null, userId, moderatorId, ModerationAuditLog.Action.USER_SUSPEND,
                null, null, null);
    }

    /**
     * Clear the stamp (idempotent: unsuspending an active account is a
     * no-op that records no audit row). The same guards as
     * {@link #suspend}: 404 unknown id, 403 the provisioned admin (it
     * is never suspended — there is nothing to lift), 409 guest.
     */
    public void unsuspend(long moderatorId, long userId) {
        User user = requireSuspendableUser(userId);
        if (!user.isSuspended()) {
            return; // not suspended: a no-op records no audit row
        }
        user.unsuspend();
        users.save(user);
        audit.record(null, userId, moderatorId, ModerationAuditLog.Action.USER_UNSUSPEND,
                null, null, null);
    }

    /**
     * The suspension guards, in order: 404 the unknown id, 403 the
     * provisioned admin (the deployment's access path — a lockout vector,
     * it cannot be disabled at all), 409 the guest (no credentials).
     */
    private User requireSuspendableUser(long userId) {
        User user = requireUser(userId);
        if (user instanceof AdminUser) {
            throw new ProvisionedAdminProtectedException(PROVISIONED_ADMIN_SUSPENSION_MESSAGE);
        }
        if (!isRegistered(user)) {
            throw new NonSuspendableUserException(NON_REGISTERED_SUSPENSION_MESSAGE);
        }
        return user;
    }

    private User requireUser(long userId) {
        User user = users.findById(userId);
        if (user == null) {
            throw new UserNotFoundException(userId);
        }
        return user;
    }

    /**
     * REGISTERED only — the kind truth is the domain class (the in-memory
     * fake mirrors the JPA impl's users.kind column the same way).
     * AdminUser IS-A RegisteredUser, so it is excluded explicitly (the
     * ADMIN kind is already refused above with the 403 — only GUEST
     * reaches this guard today).
     */
    private static boolean isRegistered(User user) {
        return user instanceof RegisteredUser && !(user instanceof AdminUser);
    }

    private static String kindName(User user) {
        if (user instanceof AdminUser) {
            return "ADMIN";
        }
        if (user instanceof RegisteredUser) {
            return "REGISTERED";
        }
        return "GUEST";
    }
}
