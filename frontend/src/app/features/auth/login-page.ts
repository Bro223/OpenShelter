import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../session/auth-store';
import { safeReturnUrl } from '../../core/guards';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';

/**
 * /login (GuestGuard). Login by email or phone + password.
 *
 * 03-CONTEXT-CORE-AUTH.md: success -> returnUrl or home; failures show ONE
 * generic banner (401 is never revealed as "wrong password", 429 gets the
 * slow-down copy). ?session=expired (from the interceptor) -> info note;
 * ?reset=ok (from the reset flow) -> success info note.
 */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = new FormGroup({
    emailOrPhone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  /** True when the interceptor bounced us here with ?session=expired. */
  protected readonly sessionExpired = signal(false);
  /** True when the password-reset flow landed us here with ?reset=ok. */
  protected readonly resetOk = signal(false);

  private destination = '/map';

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    this.sessionExpired.set(query.get('session') === 'expired');
    this.resetOk.set(query.get('reset') === 'ok');
    this.destination = safeReturnUrl(query.get('returnUrl'));
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    const { emailOrPhone, password } = this.form.getRawValue();
    try {
      await this.store.login(emailOrPhone, password);
      await this.router.navigateByUrl(this.destination);
    } catch (error) {
      this.error.set(bannerMessage(error, 'login'));
    } finally {
      this.pending.set(false);
    }
  }
}
