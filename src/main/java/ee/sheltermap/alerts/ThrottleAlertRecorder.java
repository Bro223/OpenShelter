package ee.sheltermap.alerts;

import ee.sheltermap.security.Contacts;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.Iterator;
import java.util.List;
import java.util.Objects;

/**
 * The bounded in-memory ring behind {@code GET /admin/alerts}: the
 * throttle caps and duplicate detectors append their
 * throttled (429) and repeat-report (409) events here. Oldest events are
 * evicted first once {@code retained} rows are filled; {@code id} is a
 * monotonic sequence (ring-local, resets on restart).
 *
 * <p><strong>Single-instance constraint:</strong> the ring is process
 * memory — a restart clears it, and N replicas each see only their own
 * share of the events. Accepted for an admin triage surface (the caps
 * themselves carry the same constraint); the upgrade path is a durable
 * audit table.
 *
 * <p>{@code retained <= 0} disables recording (every {@code record} is a
 * no-op, {@link #recent(int)} returns an empty list) — same disable
 * idiom as the limiters.
 */
public class ThrottleAlertRecorder {

    private final int retained;
    private final Clock clock;
    private final Deque<ThrottleAlert> ring = new ArrayDeque<>();
    private long sequence;

    public ThrottleAlertRecorder(int retained) {
        this(retained, Clock.systemUTC());
    }

    public ThrottleAlertRecorder(int retained, Clock clock) {
        this.retained = retained;
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    /** The per-user DAILY shelter-submission cap fired (429). */
    public void submissionDailyCap(long userId, Integer retryAfterSeconds) {
        record(new ThrottleAlert(nextId(), ThrottleAlert.KIND_SUBMISSION_DAILY_CAP,
                "user:" + userId,
                "Daily shelter-submission cap reached (429)",
                retryAfterSeconds, clock.instant()));
    }

    /**
     * The per-contact OTP cap fired on the verify or register surface
     * (429). The contact is normalized ({@link Contacts#normalize} — the
     * same one shared rule as {@code RollingContactOtpLimiter}) so the
     * alert's subject matches the limiter's bucket key.
     */
    public void otpContactCap(String contact, Integer retryAfterSeconds) {
        record(new ThrottleAlert(nextId(), ThrottleAlert.KIND_OTP_CONTACT_CAP,
                "contact:" + Contacts.normalize(contact),
                "OTP contact cap reached (429)",
                retryAfterSeconds, clock.instant()));
    }

    /** A near-duplicate shelter submission was rejected (409). */
    public void nearDuplicate(long userId, long existingShelterId) {
        record(new ThrottleAlert(nextId(), ThrottleAlert.KIND_NEAR_DUPLICATE,
                "user:" + userId,
                "Near-duplicate of shelter #" + existingShelterId + " (409)",
                null, clock.instant()));
    }

    /**
     * A verification-code delivery was REFUSED by the channel (the relay
     * or gateway failed — the sender logged the error). No HTTP error went
     * out: the request still answered its plain ack, NO pending code was
     * persisted and NO daily slot was consumed — this alert exists so an
     * operator notices the channel outage in the admin ring instead of
     * only in the log.
     */
    public void codeSendFailure(String contact, String channel) {
        record(new ThrottleAlert(nextId(), ThrottleAlert.KIND_CODE_SEND_FAILURE,
                "contact:" + Contacts.normalize(contact),
                "Code send refused by the " + channel + " channel (no 429 — delivery failed)",
                null, clock.instant()));
    }

    /** Appends one alert, evicting the oldest row past {@code retained}. */
    public void record(ThrottleAlert alert) {
        if (retained <= 0) {
            return;
        }
        synchronized (ring) {
            ring.addLast(alert);
            while (ring.size() > retained) {
                ring.removeFirst();
            }
        }
    }

    /**
     * The most recent alerts, NEWEST first. {@code limit} is clamped to at
     * least 1 (the endpoint validates its own 1..200 range and answers 400
     * out-of-band); a limit above the ring size returns the whole ring.
     */
    public List<ThrottleAlert> recent(int limit) {
        if (retained <= 0) {
            return List.of();
        }
        int take = Math.max(1, limit);
        synchronized (ring) {
            List<ThrottleAlert> out = new ArrayList<>(Math.min(take, ring.size()));
            Iterator<ThrottleAlert> it = ring.descendingIterator();
            while (it.hasNext() && out.size() < take) {
                out.add(it.next());
            }
            return out;
        }
    }

    /** Number of alerts currently retained. */
    public int size() {
        synchronized (ring) {
            return ring.size();
        }
    }

    /** Clears the ring (test seam). */
    public void clear() {
        synchronized (ring) {
            ring.clear();
            sequence = 0;
        }
    }

    private long nextId() {
        synchronized (ring) {
            return ++sequence;
        }
    }
}
