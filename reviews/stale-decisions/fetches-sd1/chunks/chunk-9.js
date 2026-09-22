import {
  ApiClient
} from "/chunk-WYACYUPC.js";

// src/app/gateways/site-texts-gateway.ts
import { inject, Injectable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { lastValueFrom } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var SiteTextsGateway = class _SiteTextsGateway {
  api = inject(ApiClient);
  /** The current overrides (absent key = the shipped catalog default).
      Any failure resolves to null — the overlay is progressive
      enhancement, never a blocker for the chrome. */
  async fetch() {
    try {
      return await lastValueFrom(this.api.get("/api/site-texts"));
    } catch {
      return null;
    }
  }
  static \u0275fac = function SiteTextsGateway_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SiteTextsGateway)();
  };
  static \u0275prov = /* @__PURE__ */ i0.\u0275\u0275defineInjectable({ token: _SiteTextsGateway, factory: _SiteTextsGateway.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(SiteTextsGateway, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  SiteTextsGateway
};
//# debugId=6367e21d-2942-5da7-8945-f9a7ae13455f


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZ2F0ZXdheXMvc2l0ZS10ZXh0cy1nYXRld2F5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGluamVjdCwgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgbGFzdFZhbHVlRnJvbSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgQXBpQ2xpZW50IH0gZnJvbSAnLi4vY29yZS9hcGktY2xpZW50JztcbmltcG9ydCB0eXBlIHsgU2l0ZVRleHRzQnlMb2NhbGUgfSBmcm9tICcuLi9jb3JlL2kxOG4vc2l0ZS10ZXh0cyc7XG5cbi8qKlxuICogVGhlIGRvb3IgdG8gdGhlIHNpdGVfdGV4dHMgZW5kcG9pbnRzIChzaXRlX3RleHRzKTogdGhlIGFkbWluLWVkaXRhYmxlXG4gKiBwb3B1cC9oZWFkZXIvZm9vdGVyIHRleHRzLlxuICpcbiAqICAgR0VUIC9hcGkvc2l0ZS10ZXh0cyAgLT4gU2l0ZVRleHRzQnlMb2NhbGUgKHBlcm1pdC1hbGwg4oCUIHRoZSBvdmVycmlkZXNcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJlIHB1YmxpYyBjb3B5OiB0aGUgc2FtZSB0ZXh0IGV2ZXJ5IHZpc2l0b3JcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vlcywgb25lIGZldGNoIGZvciBhbGwgdGhyZWUgbG9jYWxlcylcbiAqXG4gKiBUaGUgYWRtaW4gd3JpdGUgc2lkZSAoUFVUIC9hZG1pbi9zaXRlLXRleHRzKSBsaXZlcyBpbiBBZG1pbkdhdGV3YXkg4oCUXG4gKiB0aGUgL2FkbWluLyogZG9vciDigJQgc28gdGhpcyBnYXRld2F5IGNhcnJpZXMgdGhlIHB1YmxpYyByZWFkIG9ubHksXG4gKiBleGFjdGx5IGxpa2UgRGF0YVNvdXJjZUdhdGV3YXkgKGEgcHVibGljIHByb3ZlbmFuY2UgcmVhZCwgbm9uLWNyaXRpY2FsOlxuICogYSBmYWlsdXJlIHJlc29sdmVzIHRvIG51bGwgYW5kIHRoZSBzaGlwcGVkIGkxOG4gY2F0YWxvZyBzdGFuZHMpLlxuICovXG5ASW5qZWN0YWJsZSh7IHByb3ZpZGVkSW46ICdyb290JyB9KVxuZXhwb3J0IGNsYXNzIFNpdGVUZXh0c0dhdGV3YXkge1xuICBwcml2YXRlIHJlYWRvbmx5IGFwaSA9IGluamVjdChBcGlDbGllbnQpO1xuXG4gIC8qKiBUaGUgY3VycmVudCBvdmVycmlkZXMgKGFic2VudCBrZXkgPSB0aGUgc2hpcHBlZCBjYXRhbG9nIGRlZmF1bHQpLlxuICAgICAgQW55IGZhaWx1cmUgcmVzb2x2ZXMgdG8gbnVsbCDigJQgdGhlIG92ZXJsYXkgaXMgcHJvZ3Jlc3NpdmVcbiAgICAgIGVuaGFuY2VtZW50LCBuZXZlciBhIGJsb2NrZXIgZm9yIHRoZSBjaHJvbWUuICovXG4gIGFzeW5jIGZldGNoKCk6IFByb21pc2U8U2l0ZVRleHRzQnlMb2NhbGUgfCBudWxsPiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBsYXN0VmFsdWVGcm9tKHRoaXMuYXBpLmdldDxTaXRlVGV4dHNCeUxvY2FsZT4oJy9hcGkvc2l0ZS10ZXh0cycpKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxufVxuIl0sIm1hcHBpbmdzIjoiOzs7OztBQUFBLFNBQVMsUUFBUSxrQkFBa0I7QUFDbkMsU0FBUyxxQkFBcUI7O0FBa0J4QixJQUFPLG1CQUFQLE1BQU8sa0JBQWdCO0VBQ1YsTUFBTSxPQUFPLFNBQVM7Ozs7RUFLdkMsTUFBTSxRQUEwQztBQUM5QyxRQUFJO0FBQ0YsYUFBTyxNQUFNLGNBQWMsS0FBSyxJQUFJLElBQXVCLGlCQUFpQixDQUFDO0lBQy9FLFFBQVE7QUFDTixhQUFPO0lBQ1Q7RUFDRjs7cUNBWlcsbUJBQWdCO0VBQUE7K0VBQWhCLG1CQUFnQixTQUFoQixrQkFBZ0IsV0FBQSxZQURILE9BQU0sQ0FBQTs7OytFQUNuQixrQkFBZ0IsQ0FBQTtVQUQ1QjtXQUFXLEVBQUUsWUFBWSxPQUFNLENBQUU7OzsiLCJuYW1lcyI6W10sImRlYnVnSWQiOiI2MzY3ZTIxZC0yOTQyLTVkYTctODk0NS1mOWE3YWUxMzQ1NWYifQ==