import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../../core/api-error';
import { AuthStore } from '../../session/auth-store';
import { AccountGateway } from '../../gateways/account-gateway';
import { ContributionsPanel } from './contributions-panel';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage, COPY } from '../../shared/error-copy';
import { CODE_SIX_DIGITS } from '../../shared/form-helpers';
import { ResendCountdown } from '../../shared/resend-countdown';
import type { VerificationLevel } from '../../core/models';

type ChangePhase = 'form' | 'code' | 'done';

/**
 * /account (AuthGuard) — the full profile page (04-CONTEXT-ACCOUNT-VERIFY.md,
 * 03 puml):
 *  - IDENTITY: name with a password-confirmed inline edit form (no national
 *    ID code is collected anywhere — remove-national-id M1)
 *  - CONTACTS: email + phone rows showing the REAL value from the fetched
 *    profile, a verified label when the level is in the real claim set, or a
 *    "Complete verification" CTA deep-linking /verify
 *  - CHANGE PANELS: the M3 cross-channel email/phone change flows, ported.
 *  - MY CONTRIBUTIONS (user-contributions): the caller's own shelters and
 *    reviews in one panel — inline edit + two-step delete (ContributionsPanel,
 *    its own loading/empty/error state per list).
 *
 * All values come from the REAL profile in AuthStore (GET /account/me,
 * fetched at boot/login). After any claims-changing event (contact change) or
 * a profile edit the page calls `refreshProfile()`, so labels and values are
 * always server state — the old "session-only current value" caveat is gone.
 *
 * Cross-channel rule (backend-enforced, mirrored in the copy — never
 * re-implemented): changing EMAIL is proven by an SMS code to the CURRENT
 * phone; changing PHONE by an email code to the CURRENT email.
 *
 * Sessions survive a contact change (only a password reset revokes refresh
 * tokens) — nothing here logs the user out.
 *
 * Resend cooldowns: one countdown per change type (e-mail vs phone are
 * independent). A successful request runs it from the ack body; a cooldown
 * 429 runs it from Retry-After. The send/resend buttons show the live label
 * and stay disabled until it expires — no spam-clicks into a bare 429.
 */
@Component({
  selector: 'app-account-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent, ContributionsPanel],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage implements OnDestroy {
  private readonly account = inject(AccountGateway);
  protected readonly auth = inject(AuthStore);

  // ---- identity section ----------------------------------------------------
  /** True while the password-confirmed edit form is open. */
  protected readonly editing = signal(false);

  /** New-value controls are public so specs can drive them (page convention:
   *  forms public, signals protected + asserted via the DOM). */
  readonly editName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  readonly editPassword = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  // ---- email section ------------------------------------------------------
  protected readonly emailPhase = signal<ChangePhase>('form');
  readonly newEmail = new FormControl('', {
    nonNullable: true,
    // required + email + the backend's @Size(max=255) cap: with these in
    // place, the ONLY 400 the backend can still answer at the request
    // phase is "same as current value" (mirrors the register/submit forms).
    validators: [Validators.required, Validators.email, Validators.maxLength(255)],
  });
  readonly emailCode = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(CODE_SIX_DIGITS)],
  });

  // ---- phone section ------------------------------------------------------
  protected readonly phonePhase = signal<ChangePhase>('form');
  readonly newPhone = new FormControl('', {
    nonNullable: true,
    // required + the backend's @Size(max=64) cap (same convention as above).
    validators: [Validators.required, Validators.maxLength(64)],
  });
  readonly phoneCode = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(CODE_SIX_DIGITS)],
  });

  // ---- shared UI state ----------------------------------------------------
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  /** One countdown per change type — the e-mail and phone cooldowns are independent. */
  protected readonly emailCountdown = new ResendCountdown();
  protected readonly phoneCountdown = new ResendCountdown();

  ngOnDestroy(): void {
    this.emailCountdown.stop();
    this.phoneCountdown.stop();
  }

  /** Verified for the level? Reads the REAL claim set from the fetched profile. */
  protected verified(level: VerificationLevel): boolean {
    return this.auth.levels().includes(level);
  }

  /** True while the profile Retry fetch is in flight (button feedback; the
   *  store's single-flight already guards the request itself). */
  protected readonly retrying = signal(false);

  /** Retry the profile fetch (error state: the boot-time fetch failed). */
  async retryProfile(): Promise<void> {
    if (this.retrying()) {
      return;
    }
    this.retrying.set(true);
    try {
      await this.auth.refreshProfile();
    } finally {
      this.retrying.set(false);
    }
  }

  // -------------------------------------------------------------------------
  // Identity: open the inline edit form pre-filled with the current value.
  // -------------------------------------------------------------------------
  startEdit(): void {
    this.editName.setValue(this.auth.name() ?? '');
    this.editPassword.setValue('');
    this.editName.markAsUntouched();
    this.editPassword.markAsUntouched();
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.editPassword.setValue('');
  }

  /**
   * PUT /account/profile {name, currentPassword}. The backend verifies the
   * current password first (wrong -> 401, nothing updated) and validates
   * the field exactly like registration (blank -> 400). On success the real
   * profile is re-fetched, so the card shows the server state.
   */
  async saveProfile(): Promise<void> {
    if (this.busy()) {
      return;
    }
    if (this.editName.invalid || this.editPassword.invalid) {
      this.editName.markAsTouched();
      this.editPassword.markAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      await this.account.updateProfile({
        name: this.editName.value,
        currentPassword: this.editPassword.value,
      });
      await this.auth.refreshProfile();
      this.editing.set(false);
      this.editPassword.setValue('');
      this.success.set('Your profile has been updated.');
    } catch (error) {
      this.error.set(bannerMessage(error, 'profile'));
    } finally {
      this.busy.set(false);
    }
  }

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
      const ack = await this.account.requestEmailChange(target);
      this.emailCountdown.start(ack.resendAvailableAfterSeconds ?? 60);
      this.emailPhase.set('code');
      // Reviewer F5: the backend pins the target at request time — lock the
      // target input for the rest of the flow via the control's disabled
      // state (FormControlDirective swallows a [disabled] property binding).
      this.newEmail.disable();
    } catch (error) {
      this.startCountdownFromThrottle(error, this.emailCountdown);
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
      // The backend stores the lowercased form — show exactly that.
      const confirmed = this.newEmail.value.trim().toLowerCase();
      await this.account.confirmEmailChange(this.emailCode.value.trim());
      this.newEmail.setValue(confirmed);
      // The contact changed -> re-fetch the real profile (value + labels).
      await this.auth.refreshProfile();
      this.emailPhase.set('done');
      this.success.set('Your email address has been changed.');
    } catch (error) {
      this.error.set(bannerMessage(error, 'account'));
    } finally {
      this.busy.set(false);
    }
  }

  /** Same request path as the initial send — the backend enforces the
   *  resend cooldown and answers 429, which we surface AND run as the
   *  button countdown (no retry storm). */
  emailResend(): Promise<void> {
    return this.emailSend();
  }

  emailStartOver(): void {
    this.emailPhase.set('form');
    // Reviewer N14: a stale confirm error (e.g. the 400 banner from a wrong
    // code) must not linger in the fresh form phase.
    this.error.set(null);
    this.newEmail.enable();
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
      const ack = await this.account.requestPhoneChange(target);
      this.phoneCountdown.start(ack.resendAvailableAfterSeconds ?? 60);
      this.phonePhase.set('code');
      // Reviewer F5: same as the email flow — the target is pinned server-
      // side at request time and locked client-side for the rest of the flow.
      this.newPhone.disable();
    } catch (error) {
      this.startCountdownFromThrottle(error, this.phoneCountdown);
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
      const confirmed = this.newPhone.value.trim();
      await this.account.confirmPhoneChange(this.phoneCode.value.trim());
      this.newPhone.setValue(confirmed);
      // The contact changed -> re-fetch the real profile (value + labels).
      await this.auth.refreshProfile();
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
    // Reviewer N14: same as emailStartOver — clear the stale error banner.
    this.error.set(null);
    this.newPhone.enable();
    this.phoneCode.setValue('');
    this.phoneCode.markAsUntouched();
  }

  /**
   * Request-phase failures: the client validators (required + email format
   * + the backend-mirrored length caps, 255/64) already block everything
   * the backend rejects with 400 EXCEPT the "same as current value" case —
   * give that case dedicated copy so the user understands the value must
   * differ. Everything else goes through the standard banner mapping
   * (409 duplicate passes the backend message).
   */
  private setChangeError(error: unknown): void {
    const api = error instanceof ApiError ? error : toApiError(error);
    this.error.set(api.status === 400 ? COPY.accountSameValue : bannerMessage(error, 'account'));
  }

  /**
   * A 429 from a change request means the backend cooldown is live — run
   * the countdown (Retry-After when the server sent one, else the default
   * 60 s) so the button shows the wait instead of only the banner.
   */
  private startCountdownFromThrottle(error: unknown, countdown: ResendCountdown): void {
    const api = error instanceof ApiError ? error : toApiError(error);
    if (api.status === 429) {
      countdown.start(api.retryAfterSeconds ?? 60);
    }
  }
}
