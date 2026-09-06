import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../../core/api-error';
import { AuthStore } from '../../core/auth-store';
import { VerifyGateway } from '../../gateways/verify-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';

/** The two channels this page offers. SMART_ID is deliberately NOT offered —
 *  the backend rejects it with 400 (stub in v1), see 04-CONTEXT decision 1. */
type VerifyChannel = 'EMAIL' | 'PHONE';

interface ChannelMeta {
  level: VerifyChannel;
  /** Chip + banner noun. */
  noun: string;
  /** Human destination, e.g. "email address". */
  destination: string;
  title: string;
  sendLabel: string;
  sentHint: string;
  codeLabel: string;
  codeHint: string;
  placeholder: string;
}

/** Codes mirror the backend generators (verified against the Java): the EMAIL
 *  token is 8 chars from [A-Za-z0-9], the PHONE code is a 6-digit OTP. Input
 *  patterns are no stricter than the generator; comparison is case-sensitive,
 *  so input is never case-folded — only trimmed. */
const CHANNELS: ChannelMeta[] = [
  {
    level: 'EMAIL',
    noun: 'email',
    destination: 'email address',
    title: 'Verify your email',
    sendLabel: 'Send code to my email',
    sentHint: 'A verification code has been sent to your email address.',
    codeLabel: 'Verification code',
    codeHint: 'Enter the 8-character code from the email.',
    placeholder: '8-character code',
  },
  {
    level: 'PHONE',
    noun: 'phone',
    destination: 'phone number',
    title: 'Verify your phone',
    sendLabel: 'Text code to my phone',
    sentHint: 'An SMS code has been sent to your phone number.',
    codeLabel: 'SMS code',
    codeHint: 'Enter the 6-digit code from the SMS.',
    placeholder: '6-digit code',
  },
];

const CODE_PATTERNS: Record<VerifyChannel, RegExp> = {
  EMAIL: /^[A-Za-z0-9]{8}$/,
  PHONE: /^\d{6}$/,
};

/**
 * /verify (AuthGuard) — prove ownership of the email and phone on the account
 * (04-CONTEXT-ACCOUNT-VERIFY.md, 03 puml). Per channel: "send code" -> "enter
 * code" -> verified. Reads which levels are still open from AuthStore.levels()
 * and re-marks levels optimistically after a confirm (04-CONTEXT decision 3).
 *
 * Error mapping: 409 on request means the level is ALREADY verified — no code
 * was sent (backend AlreadyVerifiedException) — shown as an informational
 * notice and the level is added, so the panel disappears. 429 (cooldown/daily
 * cap) and 400 (wrong/expired code) use generic copy; no auto-retry anywhere.
 */
@Component({
  selector: 'app-verify-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent],
  templateUrl: './verify-page.html',
  styleUrl: './verify-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyPage {
  private readonly store = inject(AuthStore);
  private readonly verify = inject(VerifyGateway);

  protected readonly auth = this.store;

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

  /** Per-channel code inputs (public so specs can drive them — M2 page convention). */
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

  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<{ severity: 'info' | 'success'; text: string } | null>(null);

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
   * reflect it in AuthStore and inform — never an error banner.
   */
  async request(level: VerifyChannel): Promise<void> {
    if (this.sending() !== null || this.confirming() !== null) {
      return;
    }
    this.error.set(null);
    this.notice.set(null);
    this.sending.set(level);
    try {
      await this.verify.request(level);
      this.phases[level].set('code');
    } catch (error) {
      const api = error instanceof ApiError ? error : toApiError(error);
      if (api.status === 409) {
        this.store.addLevel(level);
        this.notice.set({
          severity: 'info',
          text: `Your ${this.channel(level).noun} is already verified.`,
        });
      } else {
        this.error.set(bannerMessage(error, 'verify'));
      }
    } finally {
      this.sending.set(null);
    }
  }

  /** POST /verify/confirm. On 200 the claim is persisted backend-side; the
   *  level is added optimistically to AuthStore and the panel disappears. */
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
      this.store.addLevel(level);
      this.notice.set({
        severity: 'success',
        text: `Your ${this.channel(level).noun} is verified.`,
      });
      code.reset();
    } catch (error) {
      this.error.set(bannerMessage(error, 'verify'));
    } finally {
      this.confirming.set(null);
    }
  }
}
