import { signal, type Signal } from '@angular/core';

/** The armed confirm: the key that owns the strip, plus the value armed with it. */
interface ArmedConfirm<K, V> {
  readonly key: K;
  readonly value: V;
}

/**
 * Shared two-tap destructive-confirm primitive.
 *
 * The single owner of the state machine AND the keyboard/screen-reader
 * behaviour every destructive confirm site needs:
 *
 *  - the trigger calls `arm(key, value)` and the template renders its strip
 *    from `isArmed(key)` / `armed()`,
 *  - focus moves to the strip's control marked `[data-confirm-focus="<key>"]`
 *    (otherwise the control that replaced the trigger is skipped and focus
 *    falls to `<body>`),
 *  - `cancel()` disarms and returns focus to the trigger marked
 *    `[data-confirm-trigger="<key>"]`. The lookup is by attribute, not by a
 *    stored element reference: the armed swap re-renders the trigger, so the
 *    reference from the click is already detached,
 *  - `disarm()` drops the armed state without touching focus — the action
 *    ran, or the typed-word variant keeps focus in its own input.
 *
 * The site owns the prompt copy (`role="status"` so arming is announced) —
 * the primitive owns when it is armed and where the keyboard goes.
 *
 * Keys are interpolated into an attribute selector, so they must be plain
 * tokens: a numeric id, or a constant such as 'account'.
 */
export class ConfirmAction<K extends string | number = string, V = undefined> {
  private readonly state = signal<ArmedConfirm<K, V> | null>(null);

  /** The armed confirm (null = idle); the template renders the strip from it. */
  readonly armed: Signal<ArmedConfirm<K, V> | null> = this.state.asReadonly();

  constructor(private readonly host: HTMLElement) {}

  /** True when `key` owns the armed strip — the per-row template check. */
  isArmed(key: K): boolean {
    const armed = this.state();
    return armed !== null && armed.key === key;
  }

  /** Arm `key` (carrying `value`) and move focus to its confirm control.
   *
   *  The control only exists once Angular has rendered the armed strip, so
   *  the focus move waits for the next task: writing the signal above notifies
   *  Angular first, so change detection (and its DOM update) is already
   *  scheduled ahead of this timer. A missing control is a silent no-op — an
   *  armed key whose site rendered nothing to focus.
   */
  arm(key: K, value?: V): void {
    this.state.set({ key, value: value as V });
    this.focusDeferred(`[data-confirm-focus="${key}"]`);
  }

  /** Disarm and return focus to the trigger that armed. */
  cancel(): void {
    const armed = this.state();
    if (armed === null) {
      return;
    }
    this.state.set(null);
    this.focusDeferred(`[data-confirm-trigger="${armed.key}"]`);
  }

  /** Disarm without moving focus (the action ran, or the typed word changed). */
  disarm(): void {
    this.state.set(null);
  }

  private focusDeferred(selector: string): void {
    setTimeout(() => this.host.querySelector<HTMLElement>(selector)?.focus(), 0);
  }
}
