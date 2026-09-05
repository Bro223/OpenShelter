import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthGateway } from '../../gateways/auth-gateway';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';

export type ResetMode = 'request' | 'sent' | 'confirm';

/**
 * /reset (GuestGuard). Two states:
 *  - request: email -> POST /auth/password-reset/request. The backend always
 *    answers 200 (anti-enumeration), so the UI always shows the same
 *    "if an account exists…" message and NEVER reveals whether the email
 *    was known.
 *  - confirm: ?token= (from the emailed link, built as /reset?token=… by
 *    the backend) -> POST /auth/password-reset/confirm -> success -> /login.
 */
@Component({
  selector: 'app-reset-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent],
  templateUrl: './reset-page.html',
  styleUrl: './reset-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPage implements OnInit {
  private readonly gateway = inject(AuthGateway);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    passwordAgain: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  private token: string | null = null;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (this.token) {
      this.mode.set('confirm');
    }
  }

  get confirmMismatch(): boolean {
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
      await this.gateway.requestPasswordReset(this.requestForm.getRawValue().email.trim());
      this.mode.set('sent');
    } catch (error) {
      this.error.set(bannerMessage(error, 'reset'));
    } finally {
      this.pending.set(false);
    }
  }

  async confirmReset(): Promise<void> {
    if (!this.token || this.confirmForm.invalid || this.confirmMismatch) {
      this.confirmForm.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    try {
      await this.gateway.resetPassword(this.token, this.confirmForm.getRawValue().password);
      await this.router.navigate(['/login'], { queryParams: { reset: 'ok' } });
    } catch (error) {
      this.error.set(bannerMessage(error, 'reset'));
    } finally {
      this.pending.set(false);
    }
  }
}
