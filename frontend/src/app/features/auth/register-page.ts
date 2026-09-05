import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { RegisterRequest } from '../../core/models';
import { AuthStore } from '../../core/auth-store';
import { BannerComponent } from '../../shared/banner.component';
import { bannerMessage } from '../../shared/error-copy';

/**
 * /register (GuestGuard). Validators mirror the backend RegisterRequest
 * (@NotBlank on every field, @Email on email) — nothing stricter, so a valid
 * backend payload is never blocked client-side. The backend has no password
 * policy beyond non-blank, so the form does not invent one either.
 *
 * 201 -> success view (register != login — no session). 409 (duplicate
 * email/phone) -> inline error with the backend's specific message; 429 ->
 * slow-down copy; any 400 -> backend validation detail.
 */
@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly store = inject(AuthStore);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    nationalIdCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  /** 201 — account created, no session yet. */
  protected readonly registered = signal(false);

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    const values = this.form.getRawValue();
    const request: RegisterRequest = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      nationalIdCode: values.nationalIdCode.trim(),
      password: values.password,
    };
    try {
      await this.store.register(request);
      this.registered.set(true);
    } catch (error) {
      this.error.set(bannerMessage(error, 'register'));
    } finally {
      this.pending.set(false);
    }
  }
}
