import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../../core/api-error';
import { AuthGateway } from '../../gateways/auth-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';
import { CODE_SIX_DIGITS } from '../../shared/form-helpers';
import { ResendCountdown } from '../../shared/resend-countdown';

export type ResetMode = 'request' | 'sent';

/**
 * /reset (GuestGuard). Two states, one page — the e-mail carries a
 * 6-digit CODE, not a link, so the whole flow happens here (no ?token=):
 *  - request: email -> POST /auth/password-reset/request. The backend
 *    always answers 200 (anti-enumeration), so the UI always shows the same
 *    "if an account exists…" message and NEVER reveals whether the email
 *    was known.
 *  - sent: the same anti-enumeration copy + code + new password + repeat in
 *    ONE view -> POST /auth/password-reset/confirm {email, code, newPassword}
 *    -> success -> /login?reset=ok. A 400 (wrong/expired/used/over-limit —
 *    indistinguishable by design) is ONE generic inline banner; the form
 *    stays usable.
 *  - resend cooldown: a successful send's ack body carries the server's
 *    cooldown in seconds; the send/resend buttons run a live countdown from
 *    it and stay disabled until it expires. The request ALWAYS answers 200
 *    (the server silently skips sends inside the cooldown — anti-
 *    enumeration), so the disabled button is what stops the spam-clicks;
 *    a 429 (the global token bucket) starts the countdown from Retry-After.
 */
@Component({
  selector: 'app-reset-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent],
  templateUrl: './reset-page.html',
  styleUrl: './reset-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPage implements OnDestroy {
  private readonly gateway = inject(AuthGateway);
  private readonly router = inject(Router);

  readonly mode = signal<ResetMode>('request');
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  /** The one send/resend cooldown for this page (server-enforced). */
  protected readonly countdown = new ResendCountdown();

  ngOnDestroy(): void {
    this.countdown.stop();
  }

  readonly requestForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  readonly confirmForm = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(CODE_SIX_DIGITS)],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    passwordAgain: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  /** The e-mail from the request step — included in the confirm body. */
  private email: string | null = null;

  confirmMismatch(): boolean {
    const form = this.confirmForm;
    return (
      form.controls.passwordAgain.touched &&
      form.controls.password.value !== form.controls.passwordAgain.value
    );
  }

  async requestReset(): Promise<void> {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      const email = this.requestForm.getRawValue().email.trim();
      const ack = await this.gateway.requestPasswordReset(email);
      this.countdown.start(ack.resendAvailableAfterSeconds ?? 60);
      this.email = email;
      this.mode.set('sent');
    } catch (error) {
      this.startCountdownFromThrottle(error);
      this.error.set(bannerMessage(error, 'reset'));
    } finally {
      this.pending.set(false);
    }
  }

  /** Resend with the same e-mail — stays in the sent state (the backend
   *  always answers 200, so the UI must not reveal anything either way). */
  async resendCode(): Promise<void> {
    if (!this.email || this.pending()) {
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      const ack = await this.gateway.requestPasswordReset(this.email);
      this.countdown.start(ack.resendAvailableAfterSeconds ?? 60);
    } catch (error) {
      this.startCountdownFromThrottle(error);
      this.error.set(bannerMessage(error, 'reset'));
    } finally {
      this.pending.set(false);
    }
  }

  /**
   * A 429 means the cooldown is live — run it (Retry-After when the server
   * sent one, else the default 60 s); the banner carries the message.
   */
  private startCountdownFromThrottle(error: unknown): void {
    const api = error instanceof ApiError ? error : toApiError(error);
    if (api.status === 429) {
      this.countdown.start(api.retryAfterSeconds ?? 60);
    }
  }

  async confirmReset(): Promise<void> {
    if (!this.email || this.confirmForm.invalid || this.confirmMismatch()) {
      this.confirmForm.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      const { code, password } = this.confirmForm.getRawValue();
      await this.gateway.resetPassword(this.email, code, password);
      await this.router.navigate(['/login'], { queryParams: { reset: 'ok' } });
    } catch (error) {
      this.error.set(bannerMessage(error, 'reset'));
    } finally {
      this.pending.set(false);
    }
  }
}
