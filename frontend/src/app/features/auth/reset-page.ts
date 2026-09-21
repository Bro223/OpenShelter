import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../../core/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import type { MessageKey } from '../../core/i18n/messages';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
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
 *    -> success -> /login?reset=ok. A 400 for the CODE itself
 *    (wrong/expired/used/over-limit — indistinguishable by design) is ONE
 *    generic inline banner; a 400 that is a field-level VALIDATION failure
 *    (e.g. a short password) is echoed honestly, since it names a field and
 *    reveals nothing about the code. The password control mirrors the
 *    server's @Size(min = 8) so a short password is a client-side field
 *    error, not a 400 at all. A 429 (the per-(IP, email) anti-guess bucket)
 *    runs the live resend countdown from Retry-After, like the send/resend
 *    paths. The form stays usable in every case.
 *  - resend cooldown: a successful send's ack body carries the server's
 *    cooldown in seconds; the send/resend buttons run a live countdown from
 *    it and stay disabled until it expires. The request ALWAYS answers 200
 *    (the server silently skips sends inside the cooldown — anti-
 *    enumeration), so the disabled button is what stops the spam-clicks;
 *    a 429 (the global token bucket) starts the countdown from Retry-After.
 */
@Component({
  selector: 'app-reset-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent, TranslatePipe],
  templateUrl: './reset-page.html',
  styleUrl: './reset-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPage implements OnDestroy {
  private readonly gateway = inject(AuthGateway);
  private readonly router = inject(Router);
  /** The i18n seam: the banner's client-authored error.* copy resolves in
   *  the active locale (N7 i18n-completeness). */
  private readonly i18n = inject(I18nService);

  readonly mode = signal<ResetMode>('request');
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  /** The one send/resend cooldown for this page (server-enforced). */
  protected readonly countdown = new ResendCountdown();

  /**
   * The password-length field-error copy key. The i18n lane adds it to the
   * `Messages` catalog this wave (M7 report: EN/ET/RU values); the cast
   * keeps the template compiling until then — at runtime the lookup goes
   * through the I18nService seam (the spec installs the value via
   * site-texts), and it resolves from the catalog directly once the key
   * lands.
   */
  readonly newPasswordTooShortKey = 'authPage.reset.newPasswordTooShort' as MessageKey;

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
    // minLength mirrors the server's @Size(min = 8) on
    // PasswordResetConfirmRequest.newPassword — a short password is a
    // client-side field error, never a 400 the banner could read as a bad
    // code. passwordAgain needs no own length rule: a repeat value under
    // 8 either mismatches the (valid) password, or equals a short password
    // that the password control's rule already flags.
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
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
      this.error.set(bannerMessage(error, 'reset', (key) => this.i18n.t(key)));
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
      this.error.set(bannerMessage(error, 'reset', (key) => this.i18n.t(key)));
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
      // A 429 (the per-(IP, email) anti-guess bucket) is a rate limit, not
      // a bad code: run the live resend countdown, exactly like the
      // send/resend paths do.
      this.startCountdownFromThrottle(error);
      this.error.set(bannerMessage(error, 'reset', (key) => this.i18n.t(key)));
    } finally {
      this.pending.set(false);
    }
  }
}
