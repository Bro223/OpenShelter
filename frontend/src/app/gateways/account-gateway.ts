import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type {
  ChangeEmailRequest,
  ChangePhoneRequest,
  ConfirmChangeRequest,
  MeResponse,
  ProfileUpdateRequest,
} from '../core/models';

/**
 * The door to the /account controller group (01 puml + 04-CONTEXT-ACCOUNT-VERIFY.md).
 * All calls require a valid JWT. Cross-channel rule (backend-enforced, mirrored
 * in the page copy — never re-implemented):
 *  - changing EMAIL is proven by an SMS code sent to the CURRENT phone
 *  - changing PHONE is proven by an email code sent to the CURRENT email
 *
 * The change request/confirm responses are empty (202 request / 200 confirm).
 * Profile reads/edits DO echo state: `me()` returns the real profile (the
 * backend's single source of truth for name/email/phone/national ID + claims)
 * and `updateProfile()` returns the fresh profile to adopt in one round trip.
 */
@Injectable({ providedIn: 'root' })
export class AccountGateway {
  private readonly api = inject(ApiClient);

  /** GET /account/me -> the authenticated user's real profile + verified claims. */
  me(): Promise<MeResponse> {
    return lastValueFrom(this.api.get<MeResponse>('/account/me'));
  }

  /** PUT /account/profile {name, nationalIdCode, currentPassword} -> the fresh MeResponse. */
  updateProfile(request: ProfileUpdateRequest): Promise<MeResponse> {
    return lastValueFrom(this.api.put<MeResponse>('/account/profile', request));
  }

  /** POST /account/email-change/request {newEmail} -> 202 (code via SMS to the current phone). */
  requestEmailChange(newEmail: string): Promise<void> {
    const body: ChangeEmailRequest = { newEmail };
    return lastValueFrom(this.api.post<void>('/account/email-change/request', body));
  }

  /** POST /account/email-change/confirm {code} -> 200. */
  confirmEmailChange(code: string): Promise<void> {
    const body: ConfirmChangeRequest = { code };
    return lastValueFrom(this.api.post<void>('/account/email-change/confirm', body));
  }

  /** POST /account/phone-change/request {newPhone} -> 202 (code via email to the current address). */
  requestPhoneChange(newPhone: string): Promise<void> {
    const body: ChangePhoneRequest = { newPhone };
    return lastValueFrom(this.api.post<void>('/account/phone-change/request', body));
  }

  /** POST /account/phone-change/confirm {code} -> 200. */
  confirmPhoneChange(code: string): Promise<void> {
    const body: ConfirmChangeRequest = { code };
    return lastValueFrom(this.api.post<void>('/account/phone-change/confirm', body));
  }
}
