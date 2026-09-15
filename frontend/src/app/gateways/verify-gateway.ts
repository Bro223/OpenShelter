import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiClient } from '../core/api-client';
import type { ResendAck } from '../shared/resend-countdown';
import type { VerifyConfirmRequest, VerifyRequest, VerificationLevel } from '../core/models';

/**
 * The door to the /verify controller group (01 puml + 04-CONTEXT-ACCOUNT-VERIFY.md).
 * Both calls require a valid JWT — the apiInterceptor adds the Bearer token.
 *
 *  - request(level)  -> 202 + ResendAck | 409 already verified | 429 cooldown/cap
 *  - confirm(level)  -> 200 empty       | 400 wrong/expired    | 429
 *
 * A cooldown 429 (not the 5/day cap, not the global token bucket) carries a
 * Retry-After header in seconds — surfaced as ApiError.retryAfterSeconds.
 *
 * EMAIL codes are 8-char tokens, PHONE codes are 6-digit one-time passwords
 * (backend generators — mirrored in the page's input hints, not re-implemented).
 */
@Injectable({ providedIn: 'root' })
export class VerifyGateway {
  private readonly api = inject(ApiClient);

  /** POST /verify/request {level} -> 202 + the resend-cooldown ack. Sends a code via the level's channel. */
  request(level: VerificationLevel): Promise<ResendAck> {
    const body: VerifyRequest = { level };
    return lastValueFrom(this.api.post<ResendAck>('/verify/request', body));
  }

  /** POST /verify/confirm {level, code} -> 200. Claims the level on success. */
  confirm(level: VerificationLevel, code: string): Promise<void> {
    const body: VerifyConfirmRequest = { level, code };
    return lastValueFrom(this.api.post<void>('/verify/confirm', body));
  }
}
