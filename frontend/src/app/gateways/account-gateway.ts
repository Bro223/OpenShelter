import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type { ChangeEmailRequest, ChangePhoneRequest, ConfirmChangeRequest } from '../core/models';

/**
 * The door to the /account controller group (01 puml + 04-CONTEXT-ACCOUNT-VERIFY.md).
 * All calls require a valid JWT. Cross-channel rule (backend-enforced, mirrored
 * in the page copy — never re-implemented):
 *  - changing EMAIL is proven by an SMS code sent to the CURRENT phone
 *  - changing PHONE is proven by an email code sent to the CURRENT email
 *
 * Success responses are empty (202 request / 200 confirm) — the backend never
 * echoes the destination, so the UI cannot show a masked proof address
 * (no GET /me in v1 — reported gap).
 */
@Injectable({ providedIn: 'root' })
export class AccountGateway {
  private readonly api = inject(ApiClient);

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
