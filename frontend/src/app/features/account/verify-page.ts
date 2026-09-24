import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { skip } from 'rxjs';
import { ApiError, toApiError } from '../../core/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { MessageKey } from '../../core/i18n/messages';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { AuthStore } from '../../session/auth-store';
import { safeReturnUrl } from '../../core/guards';
import { VerifyGateway } from '../../gateways/verify-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';
import { CODE_SIX_DIGITS } from '../../shared/form-helpers';
import { ResendCountdown } from '../../shared/resend-countdown';

/** The two channels this page offers. SMART_ID is deliberately NOT offered —
 *  the backend rejects it with 400 (stub in v1), see 04-CONTEXT decision 1. */
type VerifyChannel = 'EMAIL' | 'PHONE';

/**
 * A channel's UI copy as catalog KEYS (i18n-et-en): the template renders
 * them through `| t`, so a language switch re-renders the cards in the
 * new language. The values must be valid Messages keys.
 */
interface ChannelMeta {
  level: VerifyChannel;
  /** Chip + banner noun ("email" / "phone"). */
  nounKey: MessageKey;
  /** Human destination, e.g. "email address". */
  destinationKey: MessageKey;
  titleKey: MessageKey;
  sendKey: MessageKey;
  sentHintKey: MessageKey;
  codeLabelKey: MessageKey;
  codeHintKey: MessageKey;
  placeholderKey: MessageKey;
}

/** A notice banner: the catalog KEY + params (rendered through `| t`, so a
 *  language switch re-renders it). */
interface ChannelNotice {
  severity: 'info' | 'success';
  key: MessageKey;
  params: Record<string, string | number>;
}

/** Codes mirror the backend generators (verified against the Java): the EMAIL
 *  token is 8 chars from [A-Za-z0-9], the PHONE code is a 6-digit OTP. Input
 *  patterns are no stricter than the generator; comparison is case-sensitive,
 *  so input is never case-folded — only trimmed. */
/** Mirrors the backend EmailVerificationProvider code length — do not drift. */
const EMAIL_CODE_LENGTH = 8;

const EMAIL_CODE_PATTERN = new RegExp(`^[A-Za-z0-9]{${EMAIL_CODE_LENGTH}}$`);

const CHANNELS: ChannelMeta[] = [
  {
    level: 'EMAIL',
    nounKey: 'verify.email.noun',
    destinationKey: 'verify.email.destination',
    titleKey: 'verify.email.title',
    sendKey: 'verify.email.send',
    sentHintKey: 'verify.email.sentHint',
    codeLabelKey: 'verify.email.codeLabel',
    codeHintKey: 'verify.email.codeHint',
    placeholderKey: 'verify.email.placeholder',
  },
  {
    level: 'PHONE',
    nounKey: 'verify.phone.noun',
    destinationKey: 'verify.phone.destination',
    titleKey: 'verify.phone.title',
    sendKey: 'verify.phone.send',
    sentHintKey: 'verify.phone.sentHint',
    codeLabelKey: 'verify.phone.codeLabel',
    codeHintKey: 'verify.phone.codeHint',
    placeholderKey: 'verify.phone.placeholder',
  },
];

const CODE_PATTERNS: Record<VerifyChannel, RegExp> = {
  EMAIL: EMAIL_CODE_PATTERN,
  PHONE: CODE_SIX_DIGITS,
};

/**
 * /verify (AuthGuard) — prove ownership of the email and phone on the
 * account (04-CONTEXT-ACCOUNT-VERIFY.md). Per channel: "send code" ->
 * "enter code" -> verified. Reads which levels are still open from the REAL
 * claim set in AuthStore.levels() (fetched from GET /account/me) and
 * re-fetches the profile after a confirm, so the newly verified channel
 * disappears without any optimistic write.
 *
 * Error mapping: 409 on request means the level is ALREADY verified — no
 * code was sent (backend AlreadyVerifiedException) — the profile is
 * re-fetched (defensive net: the store can be stale after a failed fetch)
 * and an informational notice is shown. 429 (cooldown/daily cap) and 400
 * (wrong/expired code) use generic copy; no auto-retry anywhere. A cooldown
 * 429 additionally carries Retry-After — the per-channel button countdown
 * runs from it (and from the ack body after a successful send), so the user
 * sees the wait on the button instead of spam-clicking into a bare 429.
 */
@Component({
  selector: 'app-verify-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent, TranslatePipe],
  templateUrl: './verify-page.html',
  styleUrl: './verify-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyPage implements OnDestroy {
  private readonly store = inject(AuthStore);
  private readonly verify = inject(VerifyGateway);
  private readonly route = inject(ActivatedRoute);
  /** The page copy is fully catalog-driven; a language switch re-renders
   *  the cards (labels + the re-derived banners). The verification state
   *  itself is NOT locale-scoped — no re-fetch. */
  readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Re-derive the stored banners and re-render every | t label on a
   *  language switch. toObservable emits the CURRENT value on subscribe,
   *  so skip(1) — only a real switch triggers it. */
  private readonly localeSub = toObservable(this.i18n.locale)
    .pipe(skip(1))
    .subscribe(() => this.cdr.markForCheck());

  protected readonly auth = this.store;

  /**
   * Where to send the user once they are verified — set by
   * `verifiedGuard` (and the submit/report prompts) as
   * `/verify?returnUrl=…`. The verify page preserves it just as the login
   * page does, so a user who verifies from a shelter detail or /submit
   * lands back there instead of having to navigate manually. Null (no
   * param / unsafe value) keeps the default post-verify actions.
   */
  protected readonly returnUrl = (() => {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');
    // Reuse the canonical guard sanitizer (core/guards): it returns the
    // value only for a safe internal absolute path, so the identity check
    // IS the safety test. An absent (or unsafe) param stays null — the
    // page keeps its default post-verify actions instead of linking
    // somewhere.
    return raw !== null && safeReturnUrl(raw) === raw ? raw : null;
  })();

  /** Panels still open — a level drops off once AuthStore knows it is verified. */
  protected readonly offered = computed<VerifyChannel[]>(() =>
    CHANNELS.map((c) => c.level).filter((level) => !this.store.levels().includes(level)),
  );

  protected readonly allVerified = computed(() => this.offered().length === 0);

  /** Per-channel flow phase: idle (send button) vs code (input + verify/resend). */
  protected readonly phases: Record<VerifyChannel, ReturnType<typeof signal<'idle' | 'code'>>> = {
    EMAIL: signal<'idle' | 'code'>('idle'),
    PHONE: signal<'idle' | 'code'>('idle'),
  };

  /**
   * One countdown PER CHANNEL — the e-mail and phone cooldowns are
   * independent (a sent code does not consume the other channel's wait).
   */
  protected readonly countdowns: Record<VerifyChannel, ResendCountdown> = {
    EMAIL: new ResendCountdown(),
    PHONE: new ResendCountdown(),
  };

  ngOnDestroy(): void {
    this.countdowns.EMAIL.stop();
    this.countdowns.PHONE.stop();
    this.localeSub.unsubscribe();
  }

  /** Per-channel code inputs (public so specs can drive them — page convention). */
  readonly codes: Record<VerifyChannel, FormControl<string>> = {
    EMAIL: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(CODE_PATTERNS.EMAIL)],
    }),
    PHONE: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(CODE_PATTERNS.PHONE)],
    }),
  };

  /** Which channel has an in-flight request/confirm (disables both buttons). */
  protected readonly sending = signal<VerifyChannel | null>(null);
  protected readonly confirming = signal<VerifyChannel | null>(null);

  /** The RAW error (non-null -> banner; the "verify" copy is in the
   *  catalog — re-derived through the active locale at render time). */
  protected readonly error = signal<unknown | null>(null);
  protected readonly notice = signal<ChannelNotice | null>(null);

  /** The error banner text, re-derived through the active locale. */
  protected errorMessage(): string | null {
    const error = this.error();
    return error === null ? null : bannerMessage(error, 'verify', (key) => this.i18n.t(key));
  }

  /** The channel's translated noun (for the {noun} params + the chips). */
  protected nounText(ch: ChannelMeta): string {
    return this.i18n.t(ch.nounKey);
  }

  /** The channel's translated destination (for the {destination} param). */
  protected destinationText(ch: ChannelMeta): string {
    return this.i18n.t(ch.destinationKey);
  }

  protected channel(level: VerifyChannel): ChannelMeta {
    return CHANNELS.find((c) => c.level === level) as ChannelMeta;
  }

  /** Stable DOM id for a level's code input (used by its <label for>). */
  protected codeId(level: VerifyChannel): string {
    return `verify-code-${level.toLowerCase()}`;
  }

  /**
   * POST /verify/request. 202 -> the panel moves to the code-entry phase.
   * 409 -> the level is already verified (no code sent, no throttle consumed):
   * re-fetch the profile so the store reflects the real claim, and inform —
   * never an error banner.
   */
  async request(level: VerifyChannel): Promise<void> {
    if (this.sending() !== null || this.confirming() !== null) {
      return;
    }
    this.error.set(null);
    this.notice.set(null);
    this.sending.set(level);
    try {
      const ack = await this.verify.request(level);
      this.countdowns[level].start(ack.resendAvailableAfterSeconds ?? 60);
      this.phases[level].set('code');
    } catch (error) {
      const api = error instanceof ApiError ? error : toApiError(error);
      if (api.status === 409) {
        // Already verified: no code was sent — re-fetch the profile so the
        // store reflects the real claim, and inform; never an error banner.
        await this.store.refreshProfile();
        this.notice.set({
          severity: 'info',
          key: 'verify.alreadyVerified',
          params: { noun: this.nounText(this.channel(level)) },
        });
        return;
      }
      // A cooldown 429 carries Retry-After — run the per-channel countdown
      // from it (the banner keeps its generic copy).
      if (api.status === 429) {
        this.countdowns[level].start(api.retryAfterSeconds ?? 60);
      }
      this.error.set(error);
    } finally {
      this.sending.set(null);
    }
  }

  /** POST /verify/confirm. On 200 the claim is persisted backend-side; the
   *  profile is re-fetched so the level appears verified and the panel
   *  disappears (no optimistic write — the fetched state is the truth). */
  async confirm(level: VerifyChannel): Promise<void> {
    if (this.sending() !== null || this.confirming() !== null) {
      return;
    }
    const code = this.codes[level];
    if (code.invalid) {
      code.markAsTouched();
      return;
    }
    this.error.set(null);
    this.notice.set(null);
    this.confirming.set(level);
    try {
      await this.verify.confirm(level, code.value.trim());
      await this.store.refreshProfile();
      this.notice.set({
        severity: 'success',
        key: 'verify.verifiedNotice',
        params: { noun: this.nounText(this.channel(level)) },
      });
      code.reset();
    } catch (error) {
      this.error.set(error);
    } finally {
      this.confirming.set(null);
    }
  }
}
