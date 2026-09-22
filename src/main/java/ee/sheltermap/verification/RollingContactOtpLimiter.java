package ee.sheltermap.verification;

import ee.sheltermap.security.Contacts;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rolling-window cap per normalized contact (e-mail or E.164 phone) — the
 * abuse-limits volume valve on OTP sends and registration
 * attempts, on top of the per-(user, level) throttle.
 *
 * <p>Each {@link #tryAcquire(String)} counts one event for the contact's
 * rolling {@code window}; once {@code maxPerWindow} events are inside the
 * window the next acquire is rejected with the exact seconds until the
 * oldest in-window event leaves it (the caller surfaces that in
 * {@code Retry-After}). A rejected acquire records nothing.
 *
 * <p>The key is normalized here ({@link Contacts#normalize} — trim +
 * root-locale lowercase, the one shared contact-identity rule, W4-A), so e-mail
 * spellings share one bucket. Phones arrive pre-normalized as E.164 (digits
 * plus a leading {@code +}) and are unaffected by lowercasing. Callers
 * namespace the key per surface ({@code "register:"} / {@code "verify:"}),
 * so registration attempts and verification sends keep independent budgets
 * — registering an account must not eat its verification-send budget.
 *
 * <p><strong>Single-instance constraint:</strong> the windows live in
 * process memory, so a restart clears them and N replicas multiply the
 * effective cap by N — the same constraint as {@code TokenBucketRateLimiter}.
 * The file-backed per-(user, level) daily cap remains the durable backstop.
 *
 * <p>{@code maxPerWindow &lt;= 0} disables the cap (every acquire passes).
 */
public class RollingContactOtpLimiter {

    /** Verdict of a single acquire. */
    public enum Decision {
        /** The event was counted; the caller may proceed. */
        OK,
        /** The window is full; nothing was recorded. */
        THROTTLED
    }

    /**
     * Outcome of {@link #tryAcquire(String)}; {@code retryAfterSeconds} is
     * non-null only for {@code THROTTLED} (&gt;= 1, rounded up).
     */
    public record Result(Decision decision, Integer retryAfterSeconds) {

        static Result ok() {
            return new Result(Decision.OK, null);
        }

        static Result throttled(int retryAfterSeconds) {
            return new Result(Decision.THROTTLED, retryAfterSeconds);
        }
    }

    private static final long SWEEP_INTERVAL_MILLIS = 60_000L;
    private static final int SWEEP_THRESHOLD = 1024;

    private final int maxPerWindow;
    private final long windowMillis;
    private final Clock clock;
    private final Map<String, Deque<Long>> events = new ConcurrentHashMap<>();
    private long lastSweepMillis;

    public RollingContactOtpLimiter(int maxPerWindow, Duration window) {
        this(maxPerWindow, window, Clock.systemUTC());
    }

    public RollingContactOtpLimiter(int maxPerWindow, Duration window, Clock clock) {
        if (window == null || window.isNegative()) {
            throw new IllegalArgumentException("window must be a non-negative duration");
        }
        this.maxPerWindow = maxPerWindow;
        this.windowMillis = window.toMillis();
        this.clock = Objects.requireNonNull(clock, "clock");
        this.lastSweepMillis = clock.millis();
    }

    /**
     * Counts one event for {@code contact} while its in-window count is
     * below the cap; rejects without recording once the window is full.
     */
    public Result tryAcquire(String contact) {
        if (maxPerWindow <= 0) {
            return Result.ok();
        }
        long now = clock.millis();
        Deque<Long> deque = events.computeIfAbsent(Contacts.normalize(contact), k -> new ArrayDeque<>());
        synchronized (deque) {
            evictExpired(deque, now);
            if (deque.size() >= maxPerWindow) {
                // The head is the oldest in-window event (ascending insertion).
                long oldest = deque.peekFirst();
                long retryAfterMillis = oldest + windowMillis - now;
                return Result.throttled((int) Math.max(1, (retryAfterMillis + 999) / 1000));
            }
            deque.addLast(now);
        }
        maybeSweep(now);
        return Result.ok();
    }

    /** Clears all windows (test seam). */
    public void clear() {
        events.clear();
        lastSweepMillis = clock.millis();
    }

    private void evictExpired(Deque<Long> deque, long now) {
        while (!deque.isEmpty() && now - deque.peekFirst() >= windowMillis) {
            deque.removeFirst();
        }
    }

    private void maybeSweep(long now) {
        if (events.size() < SWEEP_THRESHOLD || now - lastSweepMillis < SWEEP_INTERVAL_MILLIS) {
            return;
        }
        lastSweepMillis = now;
        Iterator<Map.Entry<String, Deque<Long>>> it = events.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Deque<Long>> entry = it.next();
            synchronized (entry.getValue()) {
                evictExpired(entry.getValue(), now);
                if (entry.getValue().isEmpty()) {
                    it.remove();
                }
            }
        }
    }
}
