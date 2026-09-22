import {
  ApiError
} from "/chunk-WYACYUPC.js";

// src/app/gateways/geocode-gateway.ts
import { Injectable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
var MIN_SPACING_MS = 1e3;
var GeocodeGateway = class _GeocodeGateway {
  /** When the previous request was FIRED — the spacing anchor. */
  lastRequestAt = 0;
  /** Every search chains onto this, so requests always fire in order. */
  queue = Promise.resolve();
  /**
   * GET Nominatim search with `format=jsonv2&limit=5&countrycodes=ee&q=<encoded>`.
   * A call made inside the 1000 ms window after the previous request stays
   * pending until the window allows it. Throws ApiError: status 429 (the
   * service throttles) or a network error (status 0 — offline/CORS); the
   * page picks the inline copy and the failure never blocks submission.
   */
  search(query) {
    const run = async () => {
      const waitMs = this.lastRequestAt + MIN_SPACING_MS - Date.now();
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      this.lastRequestAt = Date.now();
      const url = `${NOMINATIM_SEARCH_URL}?format=jsonv2&limit=5&countrycodes=ee&q=` + encodeURIComponent(query);
      let response;
      try {
        response = await fetch(url);
      } catch {
        throw ApiError.fromNetwork();
      }
      if (!response.ok) {
        throw ApiError.fromHttp(response.status, await response.text().catch(() => ""), url);
      }
      const rows = await response.json();
      const results = [];
      for (const row of Array.isArray(rows) ? rows : []) {
        const latitude = Number(row.lat);
        const longitude = Number(row.lon);
        if (typeof row.display_name === "string" && row.display_name !== "" && Number.isFinite(latitude) && Number.isFinite(longitude)) {
          results.push({
            displayName: row.display_name,
            latitude,
            longitude,
            type: row.type ?? ""
          });
        }
        if (results.length === 5) {
          break;
        }
      }
      return results;
    };
    const next = this.queue.then(run, run);
    this.queue = next.then(() => void 0, () => void 0);
    return next;
  }
  static \u0275fac = function GeocodeGateway_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _GeocodeGateway)();
  };
  static \u0275prov = /* @__PURE__ */ i0.\u0275\u0275defineInjectable({ token: _GeocodeGateway, factory: _GeocodeGateway.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(GeocodeGateway, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  GeocodeGateway
};
//# debugId=e2068692-42a6-52c4-b91f-0c3f300f199a


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZ2F0ZXdheXMvZ2VvY29kZS1nYXRld2F5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEFwaUVycm9yIH0gZnJvbSAnLi4vY29yZS9hcGktZXJyb3InO1xuaW1wb3J0IHR5cGUgeyBHZW9jb2RlUmVzdWx0IH0gZnJvbSAnLi4vY29yZS9tb2RlbHMnO1xuXG4vKipcbiAqIFRoZSBkb29yIHRvIE9TTSBOb21pbmF0aW0gKHNoZWx0ZXItYWRkcmVzcy1zZWFyY2gpIOKAlCB0aGUgT05MWSBtb2R1bGUgdGhhdFxuICoga25vd3MgdGhlIE5vbWluYXRpbSBVUkwvcGFyYW1zLiBLZXB0IFNFUEFSQVRFIGZyb20gR2VvR2F0ZXdheSBvbiBwdXJwb3NlOlxuICogR2VvR2F0ZXdheSBtYXBzIHRvIHRoZSBiYWNrZW5kJ3MgL2FwaS9nZW8gY29udHJvbGxlciBncm91cDsgdGhpcyBpcyBhXG4gKiBjbGllbnQtc2lkZSBjYWxsIHRvIGFuIEVYVEVSTkFMIHNlcnZpY2UgKG5vIEpXVCwgbm8gYmFja2VuZCBob3ApLCBhbmRcbiAqIGdhdGV3YXlzIHN0YXkgb25lLXBlci1lbmRwb2ludC1ncm91cCAoMDEtVEFTSy5tZCDCpzQpLlxuICpcbiAqIE5vbWluYXRpbSB1c2FnZSBwb2xpY3kgKG9wZXJhdGlvbnMub3NtZm91bmRhdGlvbi5vcmcvcG9saWNpZXMvbm9taW5hdGltKTpcbiAqIC0gQXQgbW9zdCAxIHJlcXVlc3Qvc2Vjb25kIOKAlCBlbmZvcmNlZCBiZWxvdyBhcyBhIEhBUkQgMTAwMCBtcyBzcGFjaW5nXG4gKiAgIGJldHdlZW4gY29uc2VjdXRpdmUgcmVxdWVzdHM6IGV2ZXJ5IHNlYXJjaCBjaGFpbnMgb250byBvbmUgcHJvbWlzZVxuICogICBxdWV1ZSwgc28gYSByZXF1ZXN0IGxhbmRpbmcgaW5zaWRlIHRoZSB3aW5kb3cgaXMgZGVsYXllZCB1bnRpbCB0aGVcbiAqICAgd2luZG93IGFsbG93cyAobmV2ZXIgYnVyc3QpLiBUaGUgL3N1Ym1pdCBwYWdlIGtlZXBzIHRoZSBidXR0b24gcGVuZGluZ1xuICogICBmb3IgdGhlIHdob2xlIHdhaXQgYW5kIElHTk9SRVMgZXh0cmEgcHJlc3NlcyAoYXQgbW9zdCBvbmUgcGVuZGluZykuXG4gKiAtIElkZW50aWZ5IHRoZSBhcHAg4oCUIE5vbWluYXRpbSBleHBlY3RzIFJlZmVyZXIvQWNjZXB0LUxhbmd1YWdlIGhlYWRlcnM7XG4gKiAgIHRoZSBicm93c2VyIHNlbmRzIGJvdGggd2l0aCBldmVyeSBmZXRjaCAoaHR0cHMgb3IgbG9jYWxob3N0IHNhdGlzZmllc1xuICogICB0aGUgcmVmZXJlciByZXF1aXJlbWVudCksIHNvIHRoaXMgY2xhc3Mgc2V0cyBub3RoaW5nLlxuICogLSBBdHRyaWJ1dGlvbiBpcyBSRVFVSVJFRCBmb3IgYW55IHVzZSDigJQgdGhlIC9zdWJtaXQgbG9jYXRpb24gc2VjdGlvblxuICogICBhbHdheXMgcmVuZGVycyBcIsKpIE9wZW5TdHJlZXRNYXAgY29udHJpYnV0b3JzXCIgKGxpbmsgdG8gdGhlIE9TTVxuICogICBjb3B5cmlnaHQgcGFnZSkgbmV4dCB0byB0aGUgc2VhcmNoIGJveCwgc3VjY2VzcyBvciBmYWlsdXJlLlxuICpcbiAqIFJlc3VsdHMgYXJlIEVzdG9uaWEtcmVzdHJpY3RlZCAoY291bnRyeWNvZGVzPWVlKSDigJQgY29uc2lzdGVudCB3aXRoIHRoZVxuICogYXBwJ3MgYmJveCBydWxlOyBhIGZvcmVpZ24gYWRkcmVzcyBob25lc3RseSByZXR1cm5zIGFuIGVtcHR5IGxpc3QuXG4gKi9cbmNvbnN0IE5PTUlOQVRJTV9TRUFSQ0hfVVJMID0gJ2h0dHBzOi8vbm9taW5hdGltLm9wZW5zdHJlZXRtYXAub3JnL3NlYXJjaCc7XG4vKiogVGhlIHVzYWdlLXBvbGljeSBtaW5pbXVtIGJldHdlZW4gdHdvIGNvbnNlY3V0aXZlIHJlcXVlc3RzICgxIHJlcXVlc3QvcykuICovXG5jb25zdCBNSU5fU1BBQ0lOR19NUyA9IDEwMDA7XG5cbi8qKiBPbmUgcmF3IGpzb252MiByb3cg4oCUIG9ubHkgdGhlIGZpZWxkcyB0aGUgYXBwIGNvbnN1bWVzIChsYXQvbG9uIGFyZSBTVFJJTkdTKS4gKi9cbmludGVyZmFjZSBOb21pbmF0aW1Sb3cge1xuICBkaXNwbGF5X25hbWU/OiBzdHJpbmc7XG4gIGxhdD86IHN0cmluZztcbiAgbG9uPzogc3RyaW5nO1xuICB0eXBlPzogc3RyaW5nO1xufVxuXG5ASW5qZWN0YWJsZSh7IHByb3ZpZGVkSW46ICdyb290JyB9KVxuZXhwb3J0IGNsYXNzIEdlb2NvZGVHYXRld2F5IHtcbiAgLyoqIFdoZW4gdGhlIHByZXZpb3VzIHJlcXVlc3Qgd2FzIEZJUkVEIOKAlCB0aGUgc3BhY2luZyBhbmNob3IuICovXG4gIHByaXZhdGUgbGFzdFJlcXVlc3RBdCA9IDA7XG4gIC8qKiBFdmVyeSBzZWFyY2ggY2hhaW5zIG9udG8gdGhpcywgc28gcmVxdWVzdHMgYWx3YXlzIGZpcmUgaW4gb3JkZXIuICovXG4gIHByaXZhdGUgcXVldWU6IFByb21pc2U8dW5rbm93bj4gPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICAvKipcbiAgICogR0VUIE5vbWluYXRpbSBzZWFyY2ggd2l0aCBgZm9ybWF0PWpzb252MiZsaW1pdD01JmNvdW50cnljb2Rlcz1lZSZxPTxlbmNvZGVkPmAuXG4gICAqIEEgY2FsbCBtYWRlIGluc2lkZSB0aGUgMTAwMCBtcyB3aW5kb3cgYWZ0ZXIgdGhlIHByZXZpb3VzIHJlcXVlc3Qgc3RheXNcbiAgICogcGVuZGluZyB1bnRpbCB0aGUgd2luZG93IGFsbG93cyBpdC4gVGhyb3dzIEFwaUVycm9yOiBzdGF0dXMgNDI5ICh0aGVcbiAgICogc2VydmljZSB0aHJvdHRsZXMpIG9yIGEgbmV0d29yayBlcnJvciAoc3RhdHVzIDAg4oCUIG9mZmxpbmUvQ09SUyk7IHRoZVxuICAgKiBwYWdlIHBpY2tzIHRoZSBpbmxpbmUgY29weSBhbmQgdGhlIGZhaWx1cmUgbmV2ZXIgYmxvY2tzIHN1Ym1pc3Npb24uXG4gICAqL1xuICBzZWFyY2gocXVlcnk6IHN0cmluZyk6IFByb21pc2U8R2VvY29kZVJlc3VsdFtdPiB7XG4gICAgY29uc3QgcnVuID0gYXN5bmMgKCk6IFByb21pc2U8R2VvY29kZVJlc3VsdFtdPiA9PiB7XG4gICAgICBjb25zdCB3YWl0TXMgPSB0aGlzLmxhc3RSZXF1ZXN0QXQgKyBNSU5fU1BBQ0lOR19NUyAtIERhdGUubm93KCk7XG4gICAgICBpZiAod2FpdE1zID4gMCkge1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCB3YWl0TXMpKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubGFzdFJlcXVlc3RBdCA9IERhdGUubm93KCk7XG5cbiAgICAgIGNvbnN0IHVybCA9XG4gICAgICAgIGAke05PTUlOQVRJTV9TRUFSQ0hfVVJMfT9mb3JtYXQ9anNvbnYyJmxpbWl0PTUmY291bnRyeWNvZGVzPWVlJnE9YCArXG4gICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChxdWVyeSk7XG4gICAgICBsZXQgcmVzcG9uc2U6IFJlc3BvbnNlO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIGZldGNoIHJlamVjdHMgb24gbmV0d29yayBmYWlsdXJlIC8gQ09SUyBibG9jayDigJQgbm8gSFRUUCByZXNwb25zZS5cbiAgICAgICAgdGhyb3cgQXBpRXJyb3IuZnJvbU5ldHdvcmsoKTtcbiAgICAgIH1cbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgdGhyb3cgQXBpRXJyb3IuZnJvbUh0dHAocmVzcG9uc2Uuc3RhdHVzLCBhd2FpdCByZXNwb25zZS50ZXh0KCkuY2F0Y2goKCkgPT4gJycpLCB1cmwpO1xuICAgICAgfVxuICAgICAgY29uc3Qgcm93cyA9IChhd2FpdCByZXNwb25zZS5qc29uKCkpIGFzIE5vbWluYXRpbVJvd1tdO1xuICAgICAgLy8gTWFsZm9ybWVkIHJvd3MgKG1pc3Npbmcvbm9uLW51bWVyaWMgY29vcmRpbmF0ZXMpIGFyZSBkcm9wcGVkLCBub3QgZmF0YWwuXG4gICAgICBjb25zdCByZXN1bHRzOiBHZW9jb2RlUmVzdWx0W10gPSBbXTtcbiAgICAgIGZvciAoY29uc3Qgcm93IG9mIEFycmF5LmlzQXJyYXkocm93cykgPyByb3dzIDogW10pIHtcbiAgICAgICAgY29uc3QgbGF0aXR1ZGUgPSBOdW1iZXIocm93LmxhdCk7XG4gICAgICAgIGNvbnN0IGxvbmdpdHVkZSA9IE51bWJlcihyb3cubG9uKTtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHR5cGVvZiByb3cuZGlzcGxheV9uYW1lID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAgIHJvdy5kaXNwbGF5X25hbWUgIT09ICcnICYmXG4gICAgICAgICAgTnVtYmVyLmlzRmluaXRlKGxhdGl0dWRlKSAmJlxuICAgICAgICAgIE51bWJlci5pc0Zpbml0ZShsb25naXR1ZGUpXG4gICAgICAgICkge1xuICAgICAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogcm93LmRpc3BsYXlfbmFtZSxcbiAgICAgICAgICAgIGxhdGl0dWRlLFxuICAgICAgICAgICAgbG9uZ2l0dWRlLFxuICAgICAgICAgICAgdHlwZTogcm93LnR5cGUgPz8gJycsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSA1KSB7XG4gICAgICAgICAgYnJlYWs7IC8vIGxpbWl0PTUgaXMgc2VydmVyLXNpZGUg4oCUIGRlZmVuc2l2ZSBjYXBcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfTtcblxuICAgIC8vIENoYWluIG9udG8gdGhlIHF1ZXVlOyBydW4gZXZlbiBpZiB0aGUgcHJldmlvdXMgc2VhcmNoIEZBSUxFRCAoYSA0MjlcbiAgICAvLyBtdXN0IG5vdCBwb2lzb24gdGhlIG5leHQgc2VhcmNoKS5cbiAgICBjb25zdCBuZXh0ID0gdGhpcy5xdWV1ZS50aGVuKHJ1biwgcnVuKTtcbiAgICB0aGlzLnF1ZXVlID0gbmV4dC50aGVuKFxuICAgICAgKCkgPT4gdW5kZWZpbmVkLFxuICAgICAgKCkgPT4gdW5kZWZpbmVkLFxuICAgICk7XG4gICAgcmV0dXJuIG5leHQ7XG4gIH1cbn1cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxTQUFTLGtCQUFrQjs7QUEyQjNCLElBQU0sdUJBQXVCO0FBRTdCLElBQU0saUJBQWlCO0FBV2pCLElBQU8saUJBQVAsTUFBTyxnQkFBYzs7RUFFakIsZ0JBQWdCOztFQUVoQixRQUEwQixRQUFRLFFBQU87Ozs7Ozs7O0VBU2pELE9BQU8sT0FBd0M7QUFDN0MsVUFBTSxNQUFNLFlBQXFDO0FBQy9DLFlBQU0sU0FBUyxLQUFLLGdCQUFnQixpQkFBaUIsS0FBSyxJQUFHO0FBQzdELFVBQUksU0FBUyxHQUFHO0FBQ2QsY0FBTSxJQUFJLFFBQWMsQ0FBQyxZQUFZLFdBQVcsU0FBUyxNQUFNLENBQUM7TUFDbEU7QUFDQSxXQUFLLGdCQUFnQixLQUFLLElBQUc7QUFFN0IsWUFBTSxNQUNKLEdBQUcsb0JBQW9CLDhDQUN2QixtQkFBbUIsS0FBSztBQUMxQixVQUFJO0FBQ0osVUFBSTtBQUNGLG1CQUFXLE1BQU0sTUFBTSxHQUFHO01BQzVCLFFBQVE7QUFFTixjQUFNLFNBQVMsWUFBVztNQUM1QjtBQUNBLFVBQUksQ0FBQyxTQUFTLElBQUk7QUFDaEIsY0FBTSxTQUFTLFNBQVMsU0FBUyxRQUFRLE1BQU0sU0FBUyxLQUFJLEVBQUcsTUFBTSxNQUFNLEVBQUUsR0FBRyxHQUFHO01BQ3JGO0FBQ0EsWUFBTSxPQUFRLE1BQU0sU0FBUyxLQUFJO0FBRWpDLFlBQU0sVUFBMkIsQ0FBQTtBQUNqQyxpQkFBVyxPQUFPLE1BQU0sUUFBUSxJQUFJLElBQUksT0FBTyxDQUFBLEdBQUk7QUFDakQsY0FBTSxXQUFXLE9BQU8sSUFBSSxHQUFHO0FBQy9CLGNBQU0sWUFBWSxPQUFPLElBQUksR0FBRztBQUNoQyxZQUNFLE9BQU8sSUFBSSxpQkFBaUIsWUFDNUIsSUFBSSxpQkFBaUIsTUFDckIsT0FBTyxTQUFTLFFBQVEsS0FDeEIsT0FBTyxTQUFTLFNBQVMsR0FDekI7QUFDQSxrQkFBUSxLQUFLO1lBQ1gsYUFBYSxJQUFJO1lBQ2pCO1lBQ0E7WUFDQSxNQUFNLElBQUksUUFBUTtXQUNuQjtRQUNIO0FBQ0EsWUFBSSxRQUFRLFdBQVcsR0FBRztBQUN4QjtRQUNGO01BQ0Y7QUFDQSxhQUFPO0lBQ1Q7QUFJQSxVQUFNLE9BQU8sS0FBSyxNQUFNLEtBQUssS0FBSyxHQUFHO0FBQ3JDLFNBQUssUUFBUSxLQUFLLEtBQ2hCLE1BQU0sUUFDTixNQUFNLE1BQVM7QUFFakIsV0FBTztFQUNUOztxQ0FwRVcsaUJBQWM7RUFBQTsrRUFBZCxpQkFBYyxTQUFkLGdCQUFjLFdBQUEsWUFERCxPQUFNLENBQUE7OzsrRUFDbkIsZ0JBQWMsQ0FBQTtVQUQxQjtXQUFXLEVBQUUsWUFBWSxPQUFNLENBQUU7OzsiLCJuYW1lcyI6W10sImRlYnVnSWQiOiJlMjA2ODY5Mi00MmE2LTUyYzQtYjkxZi0wYzNmMzAwZjE5OWEifQ==