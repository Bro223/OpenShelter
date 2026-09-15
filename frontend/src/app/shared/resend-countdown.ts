import { signal } from '@angular/core';

const SECOND_MS = 1000;

/**
 * The ack body of any successful code send (password reset, verification,
 * contact change) — the server's resend cooldown in seconds.
 */
export interface ResendAck {
  readonly resendAvailableAfterSeconds: number;
}

/**
 * The one-second countdown behind the send/resend buttons (the backend's
 * resend cooldowns). Anchored on a wall-clock deadline instead of a
 * decrement, so a blocked main thread or a slow tab cannot drift it: each
 * tick recomputes the remainder from the deadline.
 *
 * Usable inside signal-based OnPush components: `remaining` is a signal and
 * EVERY state transition (start, tick, stop) writes it, which is what wakes
 * change detection — a template reading `label()` re-renders on each tick.
 * The owning component MUST call `stop()` in `ngOnDestroy` (the interval is
 * held by the timer, not by Angular).
 */
export class ResendCountdown {
  /** Whole seconds left; 0 while inactive. */
  readonly remaining = signal(0);
  /** True while counting. */
  active = false;

  private deadline = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * Start (or re-start, when already active — the new value wins) the
   * countdown. Clamped to at least one second so the label never shows
   * "0s" while active.
   */
  start(seconds: number): void {
    this.stop();
    this.deadline = Date.now() + Math.max(1, Math.floor(seconds)) * SECOND_MS;
    this.active = true;
    this.tick(); // paint the full duration immediately — no one-tick lag
    this.timer = setInterval(() => this.tick(), SECOND_MS);
  }

  /** Clear the interval and reset; safe to call when already inactive. */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.active = false;
    this.remaining.set(0);
  }

  /**
   * Compact human form of the remainder, '' while inactive:
   * 23 → "23s", 65 → "1m 05s", 3722 → "1h 02m"
   * (trailing units always zero-padded to two digits; no bare "0m").
   */
  label(): string {
    if (!this.active) {
      return '';
    }
    const total = this.remaining();
    if (total < 60) {
      return `${total}s`;
    }
    const minutes = Math.floor(total / 60);
    if (total < 3600) {
      return `${minutes}m ${String(total % 60).padStart(2, '0')}s`;
    }
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  }

  /** Recompute from the deadline; expire (and clear) at zero. */
  private tick(): void {
    const leftMs = this.deadline - Date.now();
    if (leftMs <= 0) {
      this.stop();
      return;
    }
    this.remaining.set(Math.ceil(leftMs / SECOND_MS));
  }
}
