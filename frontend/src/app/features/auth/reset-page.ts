import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthGateway } from '../../gateways/auth-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';

/** The reset code is a 6-digit OTP (backend sixDigitCode()) — the pattern
 *  only mirrors the generator (same as the account-page change-proof codes). */
const CODE_SIX_DIGITS = /^\d{6}$/;

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
 */
@Component({
  selector: 'app-reset-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent],
  templateUrl: './reset-page.html',
  styleUrl: './reset-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPage {
  private readonly gateway = inject(AuthGateway);
  private readonly router = inject(Router);

  readonly mode = signal<ResetMode>('request');
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

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
      await this.gateway.requestPasswordReset(email);
      this.email = email;
      this.mode.set('sent');
    } catch (error) {
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
      await this.gateway.requestPasswordReset(this.email);
    } catch (error) {
      this.error.set(bannerMessage(error, 'reset'));
    } finally {
      this.pending.set(false);
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
