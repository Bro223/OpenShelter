import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../../core/api-error';
import { AuthStore } from '../../core/auth-store';
import { AccountGateway } from '../../gateways/account-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage, COPY } from '../../shared/error-copy';

type ChangePhase = 'form' | 'code' | 'done';

/** Change-proof codes are 6-digit OTPs (backend sixDigitCode()) regardless of
 *  delivery channel — the pattern only mirrors the generator. */
const CODE_SIX_DIGITS = /^\d{6}$/;

/**
 * /account (AuthGuard) — cross-channel contact change (04-CONTEXT-ACCOUNT-VERIFY.md,
 * 03 puml). Changing the EMAIL is proven by an SMS code to the CURRENT phone;
 * changing the PHONE by an email code to the CURRENT email. Two independent
 * sections, each: form -> awaiting-proof (channel-named copy) -> success.
 *
 * The backend never echoes the current contact (no GET /me — reported gap),
 * so "current value" lines only render after THIS session changed the value,
 * and proof copy names the channel ("the phone on your account") instead of a
 * masked destination it cannot truthfully show.
 *
 * Sessions survive a contact change (only a password reset revokes refresh
 * tokens) — nothing here logs the user out.
 */
@Component({
  selector: 'app-contact-change-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent],
  templateUrl: './contact-change-page.html',
  styleUrl: './contact-change-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactChangePage {
  private readonly account = inject(AccountGateway);
  protected readonly auth = inject(AuthStore);

  // ---- email section ------------------------------------------------------
  protected readonly emailPhase = signal<ChangePhase>('form');
  /** New-value + code controls are public so specs can drive them (M2 page
   *  convention: forms public, signals protected + asserted via DOM). */
  readonly newEmail = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  readonly emailCode = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(CODE_SIX_DIGITS)],
  });
  /** Last value THIS session confirmed for the account (or null = unknown). */
  protected readonly emailLast = signal<string | null>(null);

  // ---- phone section ------------------------------------------------------
  protected readonly phonePhase = signal<ChangePhase>('form');
  readonly newPhone = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  readonly phoneCode = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(CODE_SIX_DIGITS)],
  });
  protected readonly phoneLast = signal<string | null>(null);

  // ---- shared UI state ----------------------------------------------------
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  // -------------------------------------------------------------------------
  // Email flow: request (code by SMS to the current phone) -> confirm.
  // -------------------------------------------------------------------------
  async emailSend(): Promise<void> {
    if (this.busy()) {
      return;
    }
    if (this.newEmail.invalid) {
      this.newEmail.markAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      const target = this.newEmail.value.trim().toLowerCase();
      await this.account.requestEmailChange(target);
      this.emailPhase.set('code');
    } catch (error) {
      this.setChangeError(error);
    } finally {
      this.busy.set(false);
    }
  }

  async emailConfirm(): Promise<void> {
    if (this.busy()) {
      return;
    }
    if (this.emailCode.invalid) {
      this.emailCode.markAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      await this.account.confirmEmailChange(this.emailCode.value.trim());
      this.emailLast.set(this.newEmail.value.trim().toLowerCase());
      this.emailPhase.set('done');
      this.success.set('Your email address has been changed.');
    } catch (error) {
      this.error.set(bannerMessage(error, 'account'));
    } finally {
      this.busy.set(false);
    }
  }

  /** Same request path as the initial send — the backend enforces the 60 s
   *  resend cooldown and answers 429, which we surface (no retry storm). */
  emailResend(): Promise<void> {
    return this.emailSend();
  }

  emailStartOver(): void {
    this.emailPhase.set('form');
    this.emailCode.setValue('');
    this.emailCode.markAsUntouched();
  }

  // -------------------------------------------------------------------------
  // Phone flow: request (code by email to the current address) -> confirm.
  // -------------------------------------------------------------------------
  async phoneSend(): Promise<void> {
    if (this.busy()) {
      return;
    }
    if (this.newPhone.invalid) {
      this.newPhone.markAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      const target = this.newPhone.value.trim();
      await this.account.requestPhoneChange(target);
      this.phonePhase.set('code');
    } catch (error) {
      this.setChangeError(error);
    } finally {
      this.busy.set(false);
    }
  }

  async phoneConfirm(): Promise<void> {
    if (this.busy()) {
      return;
    }
    if (this.phoneCode.invalid) {
      this.phoneCode.markAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      await this.account.confirmPhoneChange(this.phoneCode.value.trim());
      this.phoneLast.set(this.newPhone.value.trim());
      this.phonePhase.set('done');
      this.success.set('Your phone number has been changed.');
    } catch (error) {
      this.error.set(bannerMessage(error, 'account'));
    } finally {
      this.busy.set(false);
    }
  }

  phoneResend(): Promise<void> {
    return this.phoneSend();
  }

  phoneStartOver(): void {
    this.phonePhase.set('form');
    this.phoneCode.setValue('');
    this.phoneCode.markAsUntouched();
  }

  /**
   * Request-phase failures: the client validators (email format / non-blank)
   * already block everything the backend rejects with 400 except the
   * "same as current value" case — give it dedicated copy so the user
   * understands the value must differ. Everything else goes through the
   * standard banner mapping (409 duplicate passes the backend message).
   */
  private setChangeError(error: unknown): void {
    const api = error instanceof ApiError ? error : toApiError(error);
    this.error.set(api.status === 400 ? COPY.accountSameValue : bannerMessage(error, 'account'));
  }
}
