import { Injectable, signal } from '@angular/core';

/**
 * Where the first-level data-usage decision lives in localStorage. The app
 * has NO optional cookies, trackers or analytics (see the frontend README),
 * so the only stored decision is the necessary-
 * only acknowledgment. It mirrors the ThemeStore persistence shape: a key
 * constant + try/catch so private-mode storage degrades to a session-only
 * acknowledgment that simply re-asks on the next load.
 */
const CONSENT_KEY = 'openshelter-consent';

/**
 * The consent version. Only necessary processing exists today, so a single
 * decision value ('necessary') is stored. If an optional category is ever
 * added (analytics, map providers, preferences), bump this version so every
 * existing decision is treated as stale and the banner re-prompts.
 */
const CONSENT_VERSION = 1;

/** The stored consent decision. Only 'necessary' exists today. */
type ConsentDecision = 'necessary';

interface ConsentRecord {
  version: number;
  decision: ConsentDecision;
  acknowledgedAt: string;
}

/**
 * The first-level consent store. Owns whether the data-usage notice has
 * been acknowledged and, if versioning ever grows optional categories,
 * which categories were accepted. Signal-based, no async lifecycle (like
 * ThemeStore): the decision is read synchronously from localStorage in the
 * constructor, so the banner renders correctly on the very first paint.
 */
@Injectable({ providedIn: 'root' })
export class ConsentStore {
  /** True once a valid decision for the current version is stored. */
  readonly decided = signal<boolean>(storedConsent() !== null);

  /**
   * Acknowledge the necessary-only notice. The acknowledgment is an
   * explicit user action (there is no dismiss/close that silently counts),
   * and it is stored so the banner does not re-appear on later visits.
   */
  acknowledge(): void {
    const record: ConsentRecord = {
      version: CONSENT_VERSION,
      decision: 'necessary',
      acknowledgedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    } catch {
      // Storage unavailable (private mode): the banner hides for this
      // session only; it will re-ask on the next load.
    }
    this.decided.set(true);
  }
}

/** The stored record when it is valid for the current version, else null. */
function storedConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed?.version === CONSENT_VERSION && parsed?.decision === 'necessary') {
      return parsed as ConsentRecord;
    }
    return null;
  } catch {
    // Unreadable/corrupt value: treat as undecided so the banner re-asks.
    return null;
  }
}
