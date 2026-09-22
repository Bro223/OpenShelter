import {
  ApiClient
} from "/chunk-WYACYUPC.js";

// src/app/gateways/auth-gateway.ts
import { inject, Injectable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { lastValueFrom } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var AuthGateway = class _AuthGateway {
  api = inject(ApiClient);
  /** POST /auth/register -> 201 empty body (no session is created). */
  register(request) {
    return lastValueFrom(this.api.post("/auth/register", request));
  }
  /** POST /auth/login -> TokenResponse. Phone may be local or +372 form. */
  login(emailOrPhone, password) {
    const body = { emailOrPhone, password };
    return lastValueFrom(this.api.post("/auth/login", body));
  }
  /** POST /auth/refresh -> a new rotated pair. */
  refresh(refreshToken) {
    const body = { refreshToken };
    return lastValueFrom(this.api.post("/auth/refresh", body));
  }
  /** POST /auth/logout -> 204. Revokes the given refresh token server-side. */
  logout(refreshToken) {
    const body = { refreshToken };
    return lastValueFrom(this.api.post("/auth/logout", body));
  }
  /**
   * POST /auth/password-reset/request -> always 200 (anti-enumeration:
   * the UI must never distinguish "unknown email"). The ack body carries
   * the server's resend cooldown in seconds — the UI runs its countdown
   * from it, because the server silently skips sends inside the cooldown.
   */
  requestPasswordReset(email) {
    const body = { email };
    return lastValueFrom(this.api.post("/auth/password-reset/request", body));
  }
  /**
   * POST /auth/password-reset/confirm -> 200. The e-mail scopes the 6-digit
   * code to the account it was sent to; ANY failure (unknown email / wrong /
   * expired / used / over-limit) answers 400 with one generic message, so
   * the page must not treat the 400 as account-existence information.
   */
  resetPassword(email, code, newPassword) {
    const body = { email, code, newPassword };
    return lastValueFrom(this.api.post("/auth/password-reset/confirm", body));
  }
  static \u0275fac = function AuthGateway_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AuthGateway)();
  };
  static \u0275prov = /* @__PURE__ */ i0.\u0275\u0275defineInjectable({ token: _AuthGateway, factory: _AuthGateway.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(AuthGateway, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  AuthGateway
};
//# debugId=07f34814-de7c-50a6-bc92-db337ae05d5a


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZ2F0ZXdheXMvYXV0aC1nYXRld2F5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGluamVjdCwgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgbGFzdFZhbHVlRnJvbSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgQXBpQ2xpZW50IH0gZnJvbSAnLi4vY29yZS9hcGktY2xpZW50JztcbmltcG9ydCB0eXBlIHsgUmVzZW5kQWNrIH0gZnJvbSAnLi4vc2hhcmVkL3Jlc2VuZC1jb3VudGRvd24nO1xuaW1wb3J0IHR5cGUge1xuICBMb2dpblJlcXVlc3QsXG4gIFBhc3N3b3JkUmVzZXRDb25maXJtUmVxdWVzdCxcbiAgUGFzc3dvcmRSZXNldFJlcXVlc3QsXG4gIFJlZnJlc2hSZXF1ZXN0LFxuICBSZWdpc3RlclJlcXVlc3QsXG4gIFRva2VuUmVzcG9uc2UsXG59IGZyb20gJy4uL2NvcmUvbW9kZWxzJztcblxuLyoqXG4gKiBUaGUgZG9vciB0byB0aGUgL2F1dGggY29udHJvbGxlciBncm91cCAoMDEtVEFTSy5tZCDCpzQ6IGdhdGV3YXlzIGFyZSB0aGVcbiAqIG9ubHkgd2F5IHBhZ2VzIHJlYWNoIHRoZSBBUEkpLiBObyB0b2tlbiBsb2dpYyBsaXZlcyBoZXJlIOKAlCB0aGF0IGlzXG4gKiBBdXRoU3RvcmUncyBqb2IuIEV2ZXJ5IG1ldGhvZCByZXR1cm5zIGEgdHlwZWQgcHJvbWlzZSBhbmQgdGhyb3dzIEFwaUVycm9yXG4gKiBvbiBmYWlsdXJlIChtYXBwZWQgY2VudHJhbGx5IGJ5IEFwaUNsaWVudCkuXG4gKi9cbkBJbmplY3RhYmxlKHsgcHJvdmlkZWRJbjogJ3Jvb3QnIH0pXG5leHBvcnQgY2xhc3MgQXV0aEdhdGV3YXkge1xuICBwcml2YXRlIHJlYWRvbmx5IGFwaSA9IGluamVjdChBcGlDbGllbnQpO1xuXG4gIC8qKiBQT1NUIC9hdXRoL3JlZ2lzdGVyIC0+IDIwMSBlbXB0eSBib2R5IChubyBzZXNzaW9uIGlzIGNyZWF0ZWQpLiAqL1xuICByZWdpc3RlcihyZXF1ZXN0OiBSZWdpc3RlclJlcXVlc3QpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbGFzdFZhbHVlRnJvbSh0aGlzLmFwaS5wb3N0PHZvaWQ+KCcvYXV0aC9yZWdpc3RlcicsIHJlcXVlc3QpKTtcbiAgfVxuXG4gIC8qKiBQT1NUIC9hdXRoL2xvZ2luIC0+IFRva2VuUmVzcG9uc2UuIFBob25lIG1heSBiZSBsb2NhbCBvciArMzcyIGZvcm0uICovXG4gIGxvZ2luKGVtYWlsT3JQaG9uZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKTogUHJvbWlzZTxUb2tlblJlc3BvbnNlPiB7XG4gICAgY29uc3QgYm9keTogTG9naW5SZXF1ZXN0ID0geyBlbWFpbE9yUGhvbmUsIHBhc3N3b3JkIH07XG4gICAgcmV0dXJuIGxhc3RWYWx1ZUZyb20odGhpcy5hcGkucG9zdDxUb2tlblJlc3BvbnNlPignL2F1dGgvbG9naW4nLCBib2R5KSk7XG4gIH1cblxuICAvKiogUE9TVCAvYXV0aC9yZWZyZXNoIC0+IGEgbmV3IHJvdGF0ZWQgcGFpci4gKi9cbiAgcmVmcmVzaChyZWZyZXNoVG9rZW46IHN0cmluZyk6IFByb21pc2U8VG9rZW5SZXNwb25zZT4ge1xuICAgIGNvbnN0IGJvZHk6IFJlZnJlc2hSZXF1ZXN0ID0geyByZWZyZXNoVG9rZW4gfTtcbiAgICByZXR1cm4gbGFzdFZhbHVlRnJvbSh0aGlzLmFwaS5wb3N0PFRva2VuUmVzcG9uc2U+KCcvYXV0aC9yZWZyZXNoJywgYm9keSkpO1xuICB9XG5cbiAgLyoqIFBPU1QgL2F1dGgvbG9nb3V0IC0+IDIwNC4gUmV2b2tlcyB0aGUgZ2l2ZW4gcmVmcmVzaCB0b2tlbiBzZXJ2ZXItc2lkZS4gKi9cbiAgbG9nb3V0KHJlZnJlc2hUb2tlbjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYm9keTogUmVmcmVzaFJlcXVlc3QgPSB7IHJlZnJlc2hUb2tlbiB9O1xuICAgIHJldHVybiBsYXN0VmFsdWVGcm9tKHRoaXMuYXBpLnBvc3Q8dm9pZD4oJy9hdXRoL2xvZ291dCcsIGJvZHkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQT1NUIC9hdXRoL3Bhc3N3b3JkLXJlc2V0L3JlcXVlc3QgLT4gYWx3YXlzIDIwMCAoYW50aS1lbnVtZXJhdGlvbjpcbiAgICogdGhlIFVJIG11c3QgbmV2ZXIgZGlzdGluZ3Vpc2ggXCJ1bmtub3duIGVtYWlsXCIpLiBUaGUgYWNrIGJvZHkgY2Fycmllc1xuICAgKiB0aGUgc2VydmVyJ3MgcmVzZW5kIGNvb2xkb3duIGluIHNlY29uZHMg4oCUIHRoZSBVSSBydW5zIGl0cyBjb3VudGRvd25cbiAgICogZnJvbSBpdCwgYmVjYXVzZSB0aGUgc2VydmVyIHNpbGVudGx5IHNraXBzIHNlbmRzIGluc2lkZSB0aGUgY29vbGRvd24uXG4gICAqL1xuICByZXF1ZXN0UGFzc3dvcmRSZXNldChlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxSZXNlbmRBY2s+IHtcbiAgICBjb25zdCBib2R5OiBQYXNzd29yZFJlc2V0UmVxdWVzdCA9IHsgZW1haWwgfTtcbiAgICByZXR1cm4gbGFzdFZhbHVlRnJvbSh0aGlzLmFwaS5wb3N0PFJlc2VuZEFjaz4oJy9hdXRoL3Bhc3N3b3JkLXJlc2V0L3JlcXVlc3QnLCBib2R5KSk7XG4gIH1cblxuICAvKipcbiAgICogUE9TVCAvYXV0aC9wYXNzd29yZC1yZXNldC9jb25maXJtIC0+IDIwMC4gVGhlIGUtbWFpbCBzY29wZXMgdGhlIDYtZGlnaXRcbiAgICogY29kZSB0byB0aGUgYWNjb3VudCBpdCB3YXMgc2VudCB0bzsgQU5ZIGZhaWx1cmUgKHVua25vd24gZW1haWwgLyB3cm9uZyAvXG4gICAqIGV4cGlyZWQgLyB1c2VkIC8gb3Zlci1saW1pdCkgYW5zd2VycyA0MDAgd2l0aCBvbmUgZ2VuZXJpYyBtZXNzYWdlLCBzb1xuICAgKiB0aGUgcGFnZSBtdXN0IG5vdCB0cmVhdCB0aGUgNDAwIGFzIGFjY291bnQtZXhpc3RlbmNlIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgcmVzZXRQYXNzd29yZChlbWFpbDogc3RyaW5nLCBjb2RlOiBzdHJpbmcsIG5ld1Bhc3N3b3JkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBib2R5OiBQYXNzd29yZFJlc2V0Q29uZmlybVJlcXVlc3QgPSB7IGVtYWlsLCBjb2RlLCBuZXdQYXNzd29yZCB9O1xuICAgIHJldHVybiBsYXN0VmFsdWVGcm9tKHRoaXMuYXBpLnBvc3Q8dm9pZD4oJy9hdXRoL3Bhc3N3b3JkLXJlc2V0L2NvbmZpcm0nLCBib2R5KSk7XG4gIH1cbn1cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxTQUFTLFFBQVEsa0JBQWtCO0FBQ25DLFNBQVMscUJBQXFCOztBQW1CeEIsSUFBTyxjQUFQLE1BQU8sYUFBVztFQUNMLE1BQU0sT0FBTyxTQUFTOztFQUd2QyxTQUFTLFNBQXdDO0FBQy9DLFdBQU8sY0FBYyxLQUFLLElBQUksS0FBVyxrQkFBa0IsT0FBTyxDQUFDO0VBQ3JFOztFQUdBLE1BQU0sY0FBc0IsVUFBeUM7QUFDbkUsVUFBTSxPQUFxQixFQUFFLGNBQWMsU0FBUTtBQUNuRCxXQUFPLGNBQWMsS0FBSyxJQUFJLEtBQW9CLGVBQWUsSUFBSSxDQUFDO0VBQ3hFOztFQUdBLFFBQVEsY0FBNkM7QUFDbkQsVUFBTSxPQUF1QixFQUFFLGFBQVk7QUFDM0MsV0FBTyxjQUFjLEtBQUssSUFBSSxLQUFvQixpQkFBaUIsSUFBSSxDQUFDO0VBQzFFOztFQUdBLE9BQU8sY0FBb0M7QUFDekMsVUFBTSxPQUF1QixFQUFFLGFBQVk7QUFDM0MsV0FBTyxjQUFjLEtBQUssSUFBSSxLQUFXLGdCQUFnQixJQUFJLENBQUM7RUFDaEU7Ozs7Ozs7RUFRQSxxQkFBcUIsT0FBa0M7QUFDckQsVUFBTSxPQUE2QixFQUFFLE1BQUs7QUFDMUMsV0FBTyxjQUFjLEtBQUssSUFBSSxLQUFnQixnQ0FBZ0MsSUFBSSxDQUFDO0VBQ3JGOzs7Ozs7O0VBUUEsY0FBYyxPQUFlLE1BQWMsYUFBbUM7QUFDNUUsVUFBTSxPQUFvQyxFQUFFLE9BQU8sTUFBTSxZQUFXO0FBQ3BFLFdBQU8sY0FBYyxLQUFLLElBQUksS0FBVyxnQ0FBZ0MsSUFBSSxDQUFDO0VBQ2hGOztxQ0E5Q1csY0FBVztFQUFBOytFQUFYLGNBQVcsU0FBWCxhQUFXLFdBQUEsWUFERSxPQUFNLENBQUE7OzsrRUFDbkIsYUFBVyxDQUFBO1VBRHZCO1dBQVcsRUFBRSxZQUFZLE9BQU0sQ0FBRTs7OyIsIm5hbWVzIjpbXSwiZGVidWdJZCI6IjA3ZjM0ODE0LWRlN2MtNTBhNi1iYzkyLWRiMzM3YWUwNWQ1YSJ9