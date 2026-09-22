import {
  ApiClient
} from "/chunk-WYACYUPC.js";

// src/app/gateways/shelter-gateway.ts
import { inject, Injectable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { lastValueFrom } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var ShelterGateway = class _ShelterGateway {
  api = inject(ApiClient);
  /**
   * GET /api/shelters?source=ALL|REGISTRY|USER -> ShelterDto[] (ACTIVE rows
   * only, no paging — Estonia-scale fetch-all). REGISTRY = PAASETEAMET +
   * MUNICIPALITY rows; USER = community submissions.
   *
   * `trust` (optional, D5) composes with the source filter: hasCapacity=true.
   * Inactive filters are omitted from the query string entirely. (The
   * `reviewed` filter is gone with the review model; "Open" is a
   * client-side chip and never reaches the query string.)
   */
  list(source, trust) {
    return lastValueFrom(this.api.get(listPath(source, trust)));
  }
  /** GET /api/shelters/{id} -> the detail projection, or a 404 ApiError. */
  get(id) {
    return lastValueFrom(this.api.get(`/api/shelters/${id}`));
  }
  /**
   * POST /api/shelters -> the created ShelterDto (201 + Location, body carries
   * the full row). Verified accounts only (403 otherwise); the backend
   * re-checks the Estonia bbox and field bounds (400).
   */
  create(request) {
    return lastValueFrom(this.api.post("/api/shelters", request));
  }
  /**
   * GET /api/shelters/mine -> the caller's own shelters (Bearer JWT), with
   * the review state (community-review-queue): `reviewStatus` (NEW until
   * confirmed by the community or an admin) + `reviewNote` (the admin's
   * REJECT reason, when present) + `infoRequest` (the moderator→submitter
   * information request — null when none). The public
   * list/detail DTOs carry reviewStatus/locationKind too (v2 contract) —
   * only reviewNote + infoRequest are owner-scoped.
   */
  mine() {
    return lastValueFrom(this.api.get("/api/shelters/mine"));
  }
  /**
   * POST /api/shelters/{id}/info-request/reply {message} -> 204. The
   * submitter's ONE-TIME answer to the admin's information
   * request: author only (403), 404 when the row has no request, 409 on a
   * second answer (the row is kept after the reply — audit posture).
   */
  replyInfoRequest(id, message) {
    return lastValueFrom(this.api.post(`/api/shelters/${id}/info-request/reply`, { message }));
  }
  /**
   * PUT /api/shelters/{id} -> the updated ShelterDto (200). The caller's own
   * USER-source shelter only: 404 if absent, 403 if not the author (the
   * backend re-checks the Estonia bbox + the POST field bounds, 400).
   */
  update(id, request) {
    return lastValueFrom(this.api.put(`/api/shelters/${id}`, request));
  }
  /** DELETE /api/shelters/{id} -> 204 No Content (author only; reports and
   *  occupancy cascade). */
  remove(id) {
    return lastValueFrom(this.api.delete(`/api/shelters/${id}`));
  }
  /**
   * POST /api/shelters/{id}/reports -> 200 {"damped": true|false}
   * (shelter-trust-and-reports D1; community-self-moderation damp
   * flag). Verified accounts only: 403 (the standard redirect
   * vocabulary), 404 unknown shelter, 409 when the caller already
   * reported that type.
   */
  report(id, request) {
    return lastValueFrom(this.api.post(`/api/shelters/${id}/reports`, request));
  }
  /**
   * PUT /api/shelters/{id}/occupancy -> 2xx (D4): upsert — one live band per
   * user per shelter, latest edit wins. Verified accounts only (403),
   * 404 unknown shelter.
   */
  reportOccupancy(id, band) {
    const request = { band };
    return lastValueFrom(this.api.put(`/api/shelters/${id}/occupancy`, request));
  }
  /**
   * PUT /api/shelters/{id}/open-status -> 204: upsert —
   * one live open/closed state per user per shelter, latest edit wins.
   * Verified accounts only (403, the standard redirect vocabulary),
   * 404 unknown shelter.
   */
  putOpenStatus(id, state) {
    const request = { state };
    return lastValueFrom(this.api.put(`/api/shelters/${id}/open-status`, request));
  }
  static \u0275fac = function ShelterGateway_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ShelterGateway)();
  };
  static \u0275prov = /* @__PURE__ */ i0.\u0275\u0275defineInjectable({ token: _ShelterGateway, factory: _ShelterGateway.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(ShelterGateway, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();
function listPath(source, trust) {
  const params = [`source=${source}`];
  if (trust?.hasCapacity === true) {
    params.push("hasCapacity=true");
  }
  return `/api/shelters?${params.join("&")}`;
}

export {
  ShelterGateway
};
//# debugId=d969f066-65f3-50d0-9467-ad91deae1fed


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZ2F0ZXdheXMvc2hlbHRlci1nYXRld2F5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGluamVjdCwgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgbGFzdFZhbHVlRnJvbSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgQXBpQ2xpZW50IH0gZnJvbSAnLi4vY29yZS9hcGktY2xpZW50JztcbmltcG9ydCB0eXBlIHtcbiAgQ3JlYXRlU2hlbHRlclJlcXVlc3QsXG4gIE1pbmVTaGVsdGVyRHRvLFxuICBPY2N1cGFuY3lCYW5kLFxuICBQdXRPcGVuU3RhdHVzUmVxdWVzdCxcbiAgUmVwb3J0T2NjdXBhbmN5UmVxdWVzdCxcbiAgUmVwb3J0U2hlbHRlclJlcXVlc3QsXG4gIFNoZWx0ZXJEZXRhaWxEdG8sXG4gIFNoZWx0ZXJEdG8sXG4gIFNoZWx0ZXJSZXBvcnRSZXN1bHQsXG4gIFNoZWx0ZXJTb3VyY2VGaWx0ZXIsXG4gIFNoZWx0ZXJUcnVzdEZpbHRlcixcbiAgVXBkYXRlU2hlbHRlclJlcXVlc3QsXG59IGZyb20gJy4uL2NvcmUvbW9kZWxzJztcblxuLyoqXG4gKiBUaGUgZG9vciB0byB0aGUgL2FwaS9zaGVsdGVycyBjb250cm9sbGVyIGdyb3VwICgwMS1UQVNLLm1kIMKnNDogZ2F0ZXdheXMgYXJlXG4gKiB0aGUgb25seSB3YXkgcGFnZXMgcmVhY2ggdGhlIEFQSSkuIFB1YmxpYyByZWFkIEFQSSDigJQgbm8gYXV0aC4gQm90aCBtZXRob2RzXG4gKiByZXR1cm4gdHlwZWQgcHJvbWlzZXMgYW5kIHRocm93IEFwaUVycm9yIG9uIGZhaWx1cmUgKG1hcHBlZCBjZW50cmFsbHkgYnlcbiAqIEFwaUNsaWVudCkuIGBnZXRgIHNlcnZlcyB0aGUgZGV0YWlsIHBhZ2UgdG9vLlxuICpcbiAqIEF1dGhvci1zY29wZWQgbXV0YXRpb25zICh1c2VyLWNvbnRyaWJ1dGlvbnMpOiBgbWluZSgpYCBsaXN0cyB0aGUgY2FsbGVyJ3NcbiAqIG93biBzaGVsdGVyczsgYHVwZGF0ZSgpYC9gcmVtb3ZlKClgIGFjdCBvbiB0aGUgY2FsbGVyJ3Mgb3duIHNoZWx0ZXIgb25seVxuICogKHRoZSBiYWNrZW5kIGFuc3dlcnMgNDA0IGlmIGFic2VudCwgNDAzIGlmIG5vdCB0aGUgYXV0aG9yKS5cbiAqXG4gKiBUcnVzdCBsYXllciAoc2hlbHRlci10cnVzdC1hbmQtcmVwb3J0cyk6IGByZXBvcnQoKWAgcG9zdHMgYSB0eXBlZCBzaGVsdGVyXG4gKiByZXBvcnQgYW5kIGByZXBvcnRPY2N1cGFuY3koKWAgdXBzZXJ0cyB0aGUgY2FsbGVyJ3MgbGl2ZSBiYW5kIOKAlCBib3RoXG4gKiB2ZXJpZmllZC1vbmx5ICg0MDMpLCA0MDQgb24gdW5rbm93biBzaGVsdGVyLCA0MDkgb24gYSBkdXBsaWNhdGUuXG4gKiBgcHV0T3BlblN0YXR1cygpYCB1cHNlcnRzIHRoZSBjYWxsZXIncyBsaXZlIG9wZW4vY2xvc2VkIHN0YXRlIOKAlCBzYW1lXG4gKiB2ZXJpZmllZC1vbmx5IDQwMyB2b2NhYnVsYXJ5LCAyMDQgb24gc3VjY2Vzcy5cbiAqL1xuQEluamVjdGFibGUoeyBwcm92aWRlZEluOiAncm9vdCcgfSlcbmV4cG9ydCBjbGFzcyBTaGVsdGVyR2F0ZXdheSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgYXBpID0gaW5qZWN0KEFwaUNsaWVudCk7XG5cbiAgLyoqXG4gICAqIEdFVCAvYXBpL3NoZWx0ZXJzP3NvdXJjZT1BTEx8UkVHSVNUUll8VVNFUiAtPiBTaGVsdGVyRHRvW10gKEFDVElWRSByb3dzXG4gICAqIG9ubHksIG5vIHBhZ2luZyDigJQgRXN0b25pYS1zY2FsZSBmZXRjaC1hbGwpLiBSRUdJU1RSWSA9IFBBQVNFVEVBTUVUICtcbiAgICogTVVOSUNJUEFMSVRZIHJvd3M7IFVTRVIgPSBjb21tdW5pdHkgc3VibWlzc2lvbnMuXG4gICAqXG4gICAqIGB0cnVzdGAgKG9wdGlvbmFsLCBENSkgY29tcG9zZXMgd2l0aCB0aGUgc291cmNlIGZpbHRlcjogaGFzQ2FwYWNpdHk9dHJ1ZS5cbiAgICogSW5hY3RpdmUgZmlsdGVycyBhcmUgb21pdHRlZCBmcm9tIHRoZSBxdWVyeSBzdHJpbmcgZW50aXJlbHkuIChUaGVcbiAgICogYHJldmlld2VkYCBmaWx0ZXIgaXMgZ29uZSB3aXRoIHRoZSByZXZpZXcgbW9kZWw7IFwiT3BlblwiIGlzIGFcbiAgICogY2xpZW50LXNpZGUgY2hpcCBhbmQgbmV2ZXIgcmVhY2hlcyB0aGUgcXVlcnkgc3RyaW5nLilcbiAgICovXG4gIGxpc3Qoc291cmNlOiBTaGVsdGVyU291cmNlRmlsdGVyLCB0cnVzdD86IFNoZWx0ZXJUcnVzdEZpbHRlcik6IFByb21pc2U8U2hlbHRlckR0b1tdPiB7XG4gICAgcmV0dXJuIGxhc3RWYWx1ZUZyb20odGhpcy5hcGkuZ2V0PFNoZWx0ZXJEdG9bXT4obGlzdFBhdGgoc291cmNlLCB0cnVzdCkpKTtcbiAgfVxuXG4gIC8qKiBHRVQgL2FwaS9zaGVsdGVycy97aWR9IC0+IHRoZSBkZXRhaWwgcHJvamVjdGlvbiwgb3IgYSA0MDQgQXBpRXJyb3IuICovXG4gIGdldChpZDogbnVtYmVyKTogUHJvbWlzZTxTaGVsdGVyRGV0YWlsRHRvPiB7XG4gICAgcmV0dXJuIGxhc3RWYWx1ZUZyb20odGhpcy5hcGkuZ2V0PFNoZWx0ZXJEZXRhaWxEdG8+KGAvYXBpL3NoZWx0ZXJzLyR7aWR9YCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBPU1QgL2FwaS9zaGVsdGVycyAtPiB0aGUgY3JlYXRlZCBTaGVsdGVyRHRvICgyMDEgKyBMb2NhdGlvbiwgYm9keSBjYXJyaWVzXG4gICAqIHRoZSBmdWxsIHJvdykuIFZlcmlmaWVkIGFjY291bnRzIG9ubHkgKDQwMyBvdGhlcndpc2UpOyB0aGUgYmFja2VuZFxuICAgKiByZS1jaGVja3MgdGhlIEVzdG9uaWEgYmJveCBhbmQgZmllbGQgYm91bmRzICg0MDApLlxuICAgKi9cbiAgY3JlYXRlKHJlcXVlc3Q6IENyZWF0ZVNoZWx0ZXJSZXF1ZXN0KTogUHJvbWlzZTxTaGVsdGVyRHRvPiB7XG4gICAgcmV0dXJuIGxhc3RWYWx1ZUZyb20odGhpcy5hcGkucG9zdDxTaGVsdGVyRHRvPignL2FwaS9zaGVsdGVycycsIHJlcXVlc3QpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHRVQgL2FwaS9zaGVsdGVycy9taW5lIC0+IHRoZSBjYWxsZXIncyBvd24gc2hlbHRlcnMgKEJlYXJlciBKV1QpLCB3aXRoXG4gICAqIHRoZSByZXZpZXcgc3RhdGUgKGNvbW11bml0eS1yZXZpZXctcXVldWUpOiBgcmV2aWV3U3RhdHVzYCAoTkVXIHVudGlsXG4gICAqIGNvbmZpcm1lZCBieSB0aGUgY29tbXVuaXR5IG9yIGFuIGFkbWluKSArIGByZXZpZXdOb3RlYCAodGhlIGFkbWluJ3NcbiAgICogUkVKRUNUIHJlYXNvbiwgd2hlbiBwcmVzZW50KSArIGBpbmZvUmVxdWVzdGAgKHRoZSBtb2RlcmF0b3LihpJzdWJtaXR0ZXJcbiAgICogaW5mb3JtYXRpb24gcmVxdWVzdCDigJQgbnVsbCB3aGVuIG5vbmUpLiBUaGUgcHVibGljXG4gICAqIGxpc3QvZGV0YWlsIERUT3MgY2FycnkgcmV2aWV3U3RhdHVzL2xvY2F0aW9uS2luZCB0b28gKHYyIGNvbnRyYWN0KSDigJRcbiAgICogb25seSByZXZpZXdOb3RlICsgaW5mb1JlcXVlc3QgYXJlIG93bmVyLXNjb3BlZC5cbiAgICovXG4gIG1pbmUoKTogUHJvbWlzZTxNaW5lU2hlbHRlckR0b1tdPiB7XG4gICAgcmV0dXJuIGxhc3RWYWx1ZUZyb20odGhpcy5hcGkuZ2V0PE1pbmVTaGVsdGVyRHRvW10+KCcvYXBpL3NoZWx0ZXJzL21pbmUnKSk7XG4gIH1cblxuICAvKipcbiAgICogUE9TVCAvYXBpL3NoZWx0ZXJzL3tpZH0vaW5mby1yZXF1ZXN0L3JlcGx5IHttZXNzYWdlfSAtPiAyMDQuIFRoZVxuICAgKiBzdWJtaXR0ZXIncyBPTkUtVElNRSBhbnN3ZXIgdG8gdGhlIGFkbWluJ3MgaW5mb3JtYXRpb25cbiAgICogcmVxdWVzdDogYXV0aG9yIG9ubHkgKDQwMyksIDQwNCB3aGVuIHRoZSByb3cgaGFzIG5vIHJlcXVlc3QsIDQwOSBvbiBhXG4gICAqIHNlY29uZCBhbnN3ZXIgKHRoZSByb3cgaXMga2VwdCBhZnRlciB0aGUgcmVwbHkg4oCUIGF1ZGl0IHBvc3R1cmUpLlxuICAgKi9cbiAgcmVwbHlJbmZvUmVxdWVzdChpZDogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbGFzdFZhbHVlRnJvbShcbiAgICAgIHRoaXMuYXBpLnBvc3Q8dm9pZD4oYC9hcGkvc2hlbHRlcnMvJHtpZH0vaW5mby1yZXF1ZXN0L3JlcGx5YCwgeyBtZXNzYWdlIH0pLFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogUFVUIC9hcGkvc2hlbHRlcnMve2lkfSAtPiB0aGUgdXBkYXRlZCBTaGVsdGVyRHRvICgyMDApLiBUaGUgY2FsbGVyJ3Mgb3duXG4gICAqIFVTRVItc291cmNlIHNoZWx0ZXIgb25seTogNDA0IGlmIGFic2VudCwgNDAzIGlmIG5vdCB0aGUgYXV0aG9yICh0aGVcbiAgICogYmFja2VuZCByZS1jaGVja3MgdGhlIEVzdG9uaWEgYmJveCArIHRoZSBQT1NUIGZpZWxkIGJvdW5kcywgNDAwKS5cbiAgICovXG4gIHVwZGF0ZShpZDogbnVtYmVyLCByZXF1ZXN0OiBVcGRhdGVTaGVsdGVyUmVxdWVzdCk6IFByb21pc2U8U2hlbHRlckR0bz4ge1xuICAgIHJldHVybiBsYXN0VmFsdWVGcm9tKHRoaXMuYXBpLnB1dDxTaGVsdGVyRHRvPihgL2FwaS9zaGVsdGVycy8ke2lkfWAsIHJlcXVlc3QpKTtcbiAgfVxuXG4gIC8qKiBERUxFVEUgL2FwaS9zaGVsdGVycy97aWR9IC0+IDIwNCBObyBDb250ZW50IChhdXRob3Igb25seTsgcmVwb3J0cyBhbmRcbiAgICogIG9jY3VwYW5jeSBjYXNjYWRlKS4gKi9cbiAgcmVtb3ZlKGlkOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbGFzdFZhbHVlRnJvbSh0aGlzLmFwaS5kZWxldGU8dm9pZD4oYC9hcGkvc2hlbHRlcnMvJHtpZH1gKSk7XG4gIH1cblxuICAvKipcbiAgICogUE9TVCAvYXBpL3NoZWx0ZXJzL3tpZH0vcmVwb3J0cyAtPiAyMDAge1wiZGFtcGVkXCI6IHRydWV8ZmFsc2V9XG4gICAqIChzaGVsdGVyLXRydXN0LWFuZC1yZXBvcnRzIEQxOyBjb21tdW5pdHktc2VsZi1tb2RlcmF0aW9uIGRhbXBcbiAgICogZmxhZykuIFZlcmlmaWVkIGFjY291bnRzIG9ubHk6IDQwMyAodGhlIHN0YW5kYXJkIHJlZGlyZWN0XG4gICAqIHZvY2FidWxhcnkpLCA0MDQgdW5rbm93biBzaGVsdGVyLCA0MDkgd2hlbiB0aGUgY2FsbGVyIGFscmVhZHlcbiAgICogcmVwb3J0ZWQgdGhhdCB0eXBlLlxuICAgKi9cbiAgcmVwb3J0KGlkOiBudW1iZXIsIHJlcXVlc3Q6IFJlcG9ydFNoZWx0ZXJSZXF1ZXN0KTogUHJvbWlzZTxTaGVsdGVyUmVwb3J0UmVzdWx0PiB7XG4gICAgcmV0dXJuIGxhc3RWYWx1ZUZyb20oXG4gICAgICB0aGlzLmFwaS5wb3N0PFNoZWx0ZXJSZXBvcnRSZXN1bHQ+KGAvYXBpL3NoZWx0ZXJzLyR7aWR9L3JlcG9ydHNgLCByZXF1ZXN0KSxcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIFBVVCAvYXBpL3NoZWx0ZXJzL3tpZH0vb2NjdXBhbmN5IC0+IDJ4eCAoRDQpOiB1cHNlcnQg4oCUIG9uZSBsaXZlIGJhbmQgcGVyXG4gICAqIHVzZXIgcGVyIHNoZWx0ZXIsIGxhdGVzdCBlZGl0IHdpbnMuIFZlcmlmaWVkIGFjY291bnRzIG9ubHkgKDQwMyksXG4gICAqIDQwNCB1bmtub3duIHNoZWx0ZXIuXG4gICAqL1xuICByZXBvcnRPY2N1cGFuY3koaWQ6IG51bWJlciwgYmFuZDogT2NjdXBhbmN5QmFuZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJlcXVlc3Q6IFJlcG9ydE9jY3VwYW5jeVJlcXVlc3QgPSB7IGJhbmQgfTtcbiAgICByZXR1cm4gbGFzdFZhbHVlRnJvbSh0aGlzLmFwaS5wdXQ8dm9pZD4oYC9hcGkvc2hlbHRlcnMvJHtpZH0vb2NjdXBhbmN5YCwgcmVxdWVzdCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBVVCAvYXBpL3NoZWx0ZXJzL3tpZH0vb3Blbi1zdGF0dXMgLT4gMjA0OiB1cHNlcnQg4oCUXG4gICAqIG9uZSBsaXZlIG9wZW4vY2xvc2VkIHN0YXRlIHBlciB1c2VyIHBlciBzaGVsdGVyLCBsYXRlc3QgZWRpdCB3aW5zLlxuICAgKiBWZXJpZmllZCBhY2NvdW50cyBvbmx5ICg0MDMsIHRoZSBzdGFuZGFyZCByZWRpcmVjdCB2b2NhYnVsYXJ5KSxcbiAgICogNDA0IHVua25vd24gc2hlbHRlci5cbiAgICovXG4gIHB1dE9wZW5TdGF0dXMoaWQ6IG51bWJlciwgc3RhdGU6ICdPUEVOJyB8ICdDTE9TRUQnKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcmVxdWVzdDogUHV0T3BlblN0YXR1c1JlcXVlc3QgPSB7IHN0YXRlIH07XG4gICAgcmV0dXJuIGxhc3RWYWx1ZUZyb20odGhpcy5hcGkucHV0PHZvaWQ+KGAvYXBpL3NoZWx0ZXJzLyR7aWR9L29wZW4tc3RhdHVzYCwgcmVxdWVzdCkpO1xuICB9XG59XG5cbi8qKlxuICogVGhlIGxpc3QgcXVlcnkgc3RyaW5nOiBgc291cmNlYCBhbHdheXMgZmlyc3QsIHRydXN0IGZpbHRlcnMgYXBwZW5kZWQgaW5cbiAqIGEgZml4ZWQgb3JkZXIgKGhhc0NhcGFjaXR5KSDigJQgb25seSB3aGVuIGFjdGl2ZS5cbiAqIE5vIHRydXN0IGZpbHRlcnMgLT4gZXhhY3RseSBgL2FwaS9zaGVsdGVycz9zb3VyY2U94oCmYC5cbiAqL1xuZnVuY3Rpb24gbGlzdFBhdGgoc291cmNlOiBTaGVsdGVyU291cmNlRmlsdGVyLCB0cnVzdD86IFNoZWx0ZXJUcnVzdEZpbHRlcik6IHN0cmluZyB7XG4gIGNvbnN0IHBhcmFtcyA9IFtgc291cmNlPSR7c291cmNlfWBdO1xuICBpZiAodHJ1c3Q/Lmhhc0NhcGFjaXR5ID09PSB0cnVlKSB7XG4gICAgcGFyYW1zLnB1c2goJ2hhc0NhcGFjaXR5PXRydWUnKTtcbiAgfVxuICByZXR1cm4gYC9hcGkvc2hlbHRlcnM/JHtwYXJhbXMuam9pbignJicpfWA7XG59XG4iXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsU0FBUyxRQUFRLGtCQUFrQjtBQUNuQyxTQUFTLHFCQUFxQjs7QUFrQ3hCLElBQU8saUJBQVAsTUFBTyxnQkFBYztFQUNSLE1BQU0sT0FBTyxTQUFTOzs7Ozs7Ozs7OztFQVl2QyxLQUFLLFFBQTZCLE9BQWtEO0FBQ2xGLFdBQU8sY0FBYyxLQUFLLElBQUksSUFBa0IsU0FBUyxRQUFRLEtBQUssQ0FBQyxDQUFDO0VBQzFFOztFQUdBLElBQUksSUFBc0M7QUFDeEMsV0FBTyxjQUFjLEtBQUssSUFBSSxJQUFzQixpQkFBaUIsRUFBRSxFQUFFLENBQUM7RUFDNUU7Ozs7OztFQU9BLE9BQU8sU0FBbUQ7QUFDeEQsV0FBTyxjQUFjLEtBQUssSUFBSSxLQUFpQixpQkFBaUIsT0FBTyxDQUFDO0VBQzFFOzs7Ozs7Ozs7O0VBV0EsT0FBaUM7QUFDL0IsV0FBTyxjQUFjLEtBQUssSUFBSSxJQUFzQixvQkFBb0IsQ0FBQztFQUMzRTs7Ozs7OztFQVFBLGlCQUFpQixJQUFZLFNBQStCO0FBQzFELFdBQU8sY0FDTCxLQUFLLElBQUksS0FBVyxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxRQUFPLENBQUUsQ0FBQztFQUU5RTs7Ozs7O0VBT0EsT0FBTyxJQUFZLFNBQW1EO0FBQ3BFLFdBQU8sY0FBYyxLQUFLLElBQUksSUFBZ0IsaUJBQWlCLEVBQUUsSUFBSSxPQUFPLENBQUM7RUFDL0U7OztFQUlBLE9BQU8sSUFBMEI7QUFDL0IsV0FBTyxjQUFjLEtBQUssSUFBSSxPQUFhLGlCQUFpQixFQUFFLEVBQUUsQ0FBQztFQUNuRTs7Ozs7Ozs7RUFTQSxPQUFPLElBQVksU0FBNEQ7QUFDN0UsV0FBTyxjQUNMLEtBQUssSUFBSSxLQUEwQixpQkFBaUIsRUFBRSxZQUFZLE9BQU8sQ0FBQztFQUU5RTs7Ozs7O0VBT0EsZ0JBQWdCLElBQVksTUFBbUM7QUFDN0QsVUFBTSxVQUFrQyxFQUFFLEtBQUk7QUFDOUMsV0FBTyxjQUFjLEtBQUssSUFBSSxJQUFVLGlCQUFpQixFQUFFLGNBQWMsT0FBTyxDQUFDO0VBQ25GOzs7Ozs7O0VBUUEsY0FBYyxJQUFZLE9BQXdDO0FBQ2hFLFVBQU0sVUFBZ0MsRUFBRSxNQUFLO0FBQzdDLFdBQU8sY0FBYyxLQUFLLElBQUksSUFBVSxpQkFBaUIsRUFBRSxnQkFBZ0IsT0FBTyxDQUFDO0VBQ3JGOztxQ0F2R1csaUJBQWM7RUFBQTsrRUFBZCxpQkFBYyxTQUFkLGdCQUFjLFdBQUEsWUFERCxPQUFNLENBQUE7OzsrRUFDbkIsZ0JBQWMsQ0FBQTtVQUQxQjtXQUFXLEVBQUUsWUFBWSxPQUFNLENBQUU7OztBQWdIbEMsU0FBUyxTQUFTLFFBQTZCLE9BQW1DO0FBQ2hGLFFBQU0sU0FBUyxDQUFDLFVBQVUsTUFBTSxFQUFFO0FBQ2xDLE1BQUksT0FBTyxnQkFBZ0IsTUFBTTtBQUMvQixXQUFPLEtBQUssa0JBQWtCO0VBQ2hDO0FBQ0EsU0FBTyxpQkFBaUIsT0FBTyxLQUFLLEdBQUcsQ0FBQztBQUMxQzsiLCJuYW1lcyI6W10sImRlYnVnSWQiOiJkOTY5ZjA2Ni02NWYzLTUwZDAtOTQ2Ny1hZDkxZGVhZTFmZWQifQ==