package ee.sheltermap.retention;

import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.AccountService;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Objects;

/**
 * The retention prune (retention-pruning): one pass over the two owner
 * horizons —
 * <ol>
 *   <li>accounts with no sign-in activity for
 *       {@code app.retention.inactive-account-months} (24) are erased
 *       through the SAME erasure as {@code DELETE /account}
 *       ({@link AccountService#deleteAccount}) — purge the private rows,
 *       orphan the public ones, cascade the rest. Never a raw
 *       {@code DELETE FROM users}.</li>
 *   <li>moderation/audit rows ({@code moderation_actions}) older than
 *       {@code app.retention.audit-months} (24) are pruned in one bulk
 *       delete.</li>
 * </ol>
 *
 * <p>Safety rules: the job is OFF by default (the scheduler bean is
 * conditional on {@code app.retention.enabled}, and a direct call with
 * the flag off is a no-op that logs nothing), an ADMIN account is never
 * pruned (the candidate query excludes the kind AND this class
 * re-checks the domain kind — two gates), and every timestamp comes from
 * the caller ({@code now}) — this class never reaches for the wall
 * clock (the Clock-injected-service convention).
 *
 * <p>Each account erasure commits in its own transaction (a failure on
 * one account must not roll back the ones already erased), and the run
 * always leaves a durable {@link RetentionRunLog} row plus one log line
 * — the background-mutation audit pattern the registry import sets.
 */
@Service
public class RetentionService {

    private static final Logger log = LoggerFactory.getLogger(RetentionService.class);

    /** What one run pruned (the shape of the durable run row). */
    public record RetentionReport(int accountsPruned, int auditRowsPruned) {
    }

    private final RetentionProperties properties;
    private final UserRepository users;
    private final AccountService accountService;
    private final ModerationAuditLog moderationAudit;
    private final RetentionRunLog runLog;

    public RetentionService(RetentionProperties properties,
                            UserRepository users,
                            AccountService accountService,
                            ModerationAuditLog moderationAudit,
                            RetentionRunLog runLog) {
        this.properties = Objects.requireNonNull(properties, "properties");
        this.users = Objects.requireNonNull(users, "users");
        this.accountService = Objects.requireNonNull(accountService, "accountService");
        this.moderationAudit = Objects.requireNonNull(moderationAudit, "moderationAudit");
        this.runLog = Objects.requireNonNull(runLog, "runLog");
    }

    /**
     * One retention pass at the caller-supplied time. When the job is
     * disabled this is a NO-OP — nothing is read, written, or logged
     * (a disabled deployment must not trail a log line every day, and
     * certainly must not touch the database).
     */
    public RetentionReport prune(Instant now) {
        Objects.requireNonNull(now, "now");
        if (!properties.enabled()) {
            return new RetentionReport(0, 0);
        }
        int accountsPruned = 0;
        try {
            Instant accountCutoff = monthsBefore(now, properties.inactiveAccountMonths());
            for (User candidate : users.findInactiveBefore(accountCutoff)) {
                // The query already returns REGISTERED-kind rows only;
                // this is the second gate — an ADMIN row is NEVER erased,
                // no matter how idle (AdminUser is-a RegisteredUser, so
                // the domain class is the kind truth).
                if (candidate instanceof AdminUser) {
                    continue;
                }
                if (candidate instanceof RegisteredUser registered) {
                    accountService.deleteAccount(registered);
                    accountsPruned++;
                }
            }
            Instant auditCutoff = monthsBefore(now, properties.auditMonths());
            int auditRowsPruned = moderationAudit.deleteOlderThan(auditCutoff);
            log.info("Retention prune: erased {} account(s) idle beyond {} month(s) and "
                            + "pruned {} moderation-audit row(s) older than {} month(s)",
                    accountsPruned, properties.inactiveAccountMonths(),
                    auditRowsPruned, properties.auditMonths());
            runLog.record(new RetentionRunLog.Row(now, accountsPruned, auditRowsPruned, "OK", null));
            return new RetentionReport(accountsPruned, auditRowsPruned);
        } catch (RuntimeException e) {
            // A failed run must not kill the scheduler: the FAILED row +
            // error line are the record, and the next day's run retries.
            log.error("Retention prune failed: {}", e.toString());
            runLog.record(new RetentionRunLog.Row(
                    now, accountsPruned, 0, "FAILED", truncate(e.toString(), 1000)));
            return new RetentionReport(accountsPruned, 0);
        }
    }

    /**
     * Calendar-month arithmetic on an instant (the retention horizons are
     * stated in months): anchored at UTC so the cut is deterministic and
     * independent of the server's zone.
     */
    static Instant monthsBefore(Instant from, long months) {
        return ZonedDateTime.ofInstant(from, ZoneOffset.UTC).minusMonths(months).toInstant();
    }

    /** The error_message column is 1000 chars; a failure must never abort the audit write. */
    private static String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
