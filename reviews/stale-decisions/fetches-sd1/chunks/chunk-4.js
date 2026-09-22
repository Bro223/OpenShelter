import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-6CJZMRI5.js");import {
  GeocodeGateway
} from "/chunk-3WHHMMOV.js";
import {
  ESTONIA_CENTER,
  ESTONIA_ZOOM,
  LeafletService
} from "/chunk-QTZH4P7Z.js";
import {
  ShelterGateway
} from "/chunk-32CK32SO.js";
import "/chunk-CKLEX4Y2.js";
import {
  LoadingIndicator
} from "/chunk-Y3BTRGLF.js";
import {
  capacityValidator,
  nameBlankValidator
} from "/chunk-SWSUI7DQ.js";
import {
  ApiClient,
  BannerComponent,
  bannerMessage,
  toApiError
} from "/chunk-WYACYUPC.js";
import {
  I18nService,
  TranslatePipe
} from "/chunk-LJMNRHVK.js";
import "/chunk-FDMHZOCR.js";

// src/app/features/shelter/submit-shelter-page.ts
import { ChangeDetectionStrategy, Component, inject as inject2, signal, viewChild } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
import { ActivatedRoute, RouterLink } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";

// src/app/gateways/geo-gateway.ts
import { inject, Injectable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { lastValueFrom } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var GeoGateway = class _GeoGateway {
  api = inject(ApiClient);
  /**
   * POST /api/geo/resolve with {url} -> LocationResolved (200:
   * {latitude, longitude}). JWT-protected (401 unauthenticated), per-IP
   * rate-limited to 5 requests/minute (429). 400 = one generic not-found
   * message (no pair / outside Estonia / non-whitelisted host — the backend
   * never enumerates), 502 = generic upstream failure.
   */
  resolve(url) {
    return lastValueFrom(this.api.post("/api/geo/resolve", { url }));
  }
  static \u0275fac = function GeoGateway_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _GeoGateway)();
  };
  static \u0275prov = /* @__PURE__ */ i0.\u0275\u0275defineInjectable({ token: _GeoGateway, factory: _GeoGateway.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(GeoGateway, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/shared/location-input.ts
var ESTONIA_PARSE_BOUNDS = {
  minLat: 57.5,
  maxLat: 59.7,
  minLng: 21.5,
  maxLng: 28.2
};
function inEstoniaBox(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= ESTONIA_PARSE_BOUNDS.minLat && latitude <= ESTONIA_PARSE_BOUNDS.maxLat && longitude >= ESTONIA_PARSE_BOUNDS.minLng && longitude <= ESTONIA_PARSE_BOUNDS.maxLng;
}
function gateWithSwap(a, b) {
  if (inEstoniaBox(a, b)) {
    return { latitude: a, longitude: b };
  }
  if (inEstoniaBox(b, a)) {
    return { latitude: b, longitude: a, swapped: true };
  }
  return { reason: "out-of-bounds", detail: `${a}, ${b} is outside Estonia in both orders` };
}
var URL_PATTERN = /^https?:\/\/\S+$/i;
var GOO_SHORT_LINK_PATTERN = /^(?:https?:\/\/)?maps\.app\.goo\.gl\/\S+$/i;
var PAIR_PATTERN = /(-?\d+(?:\.\d+)?)[,\s+;]+(-?\d+(?:\.\d+)?)/;
var DECIMAL_PATTERN = /-?\d+(?:\.\d+)?/g;
var DECIMAL_COMMA_PATTERN = /\d+,\d+/;
var POINT_DECIMAL_PATTERN = /\d+\.\d+/;
var DECIMAL_COMMA_DETAIL = "Estonian decimal-comma detected \u2014 the comma is the decimal mark, a point is required";
function decimalCommaFailure(text) {
  if (DECIMAL_COMMA_PATTERN.test(text) && !POINT_DECIMAL_PATTERN.test(text)) {
    return { reason: "decimal-comma", detail: DECIMAL_COMMA_DETAIL };
  }
  return null;
}
function hasMixedDecimalMarks(text) {
  if (!POINT_DECIMAL_PATTERN.test(text)) {
    return false;
  }
  const commaDecimal = /\d+,\d+/g;
  let match;
  while ((match = commaDecimal.exec(text)) !== null) {
    const before = match.index > 0 ? text.charAt(match.index - 1) : "";
    if (before !== ".") {
      return true;
    }
  }
  return false;
}
function hasNonDmsDecimal(text) {
  const masked = text.replace(DMS_TOKEN_PATTERN, " ");
  return /\d/.test(masked);
}
var GOO_SHARE_PATTERN = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i;
var AT_COORD_PATTERN = /@(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/;
var SEARCH_PAIR_PATTERN = /\/search\/(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)/;
var QUERY_PARAM_PATTERNS = [
  /(?:[?&])q=([^&#]*)/i,
  /(?:[?&])ll=([^&#]*)/i,
  /(?:[?&])daddr=([^&#]*)/i,
  /(?:[?&])saddr=([^&#]*)/i
];
var DMS_TOKEN_PATTERN = /(-?\d+)\s*[°º]\s*(?:(\d+(?:\.\d+)?)\s*['′]\s*(?:(\d+(?:\.\d+)?)\s*["″])?\s*)?([NSEWnsew])?/g;
var LABEL_PATTERN = /\b(?:lat(?:itude)?|lng(?:itude)?)\s*:/gi;
var LABEL_PRESENT_PATTERN = /\b(?:lat(?:itude)?|lng(?:itude)?)\s*:/i;
var HEMISHERE_ADMONST_PATTERN = /[-\d]\s*[NSEWnsew]|[NSEWnsew]\s*[-\d]/;
function toDecimalPair(text) {
  const match = PAIR_PATTERN.exec(text);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2])];
}
function dmsTokens(text) {
  DMS_TOKEN_PATTERN.lastIndex = 0;
  const tokens = [];
  let match;
  while ((match = DMS_TOKEN_PATTERN.exec(text)) !== null) {
    const degrees = Number(match[1]);
    const minutes = match[2] === void 0 ? 0 : Number(match[2]);
    const seconds = match[3] === void 0 ? 0 : Number(match[3]);
    let value = degrees + minutes / 60 + seconds / 3600;
    const hemisphere = match[4]?.toUpperCase() ?? null;
    if (hemisphere === "S" || hemisphere === "W") {
      value = -value;
    }
    tokens.push({ value, hemisphere });
  }
  return tokens;
}
function dmsToPair(tokens) {
  const northSouth = tokens.find((t) => t.hemisphere === "N" || t.hemisphere === "S");
  const eastWest = tokens.find((t) => t.hemisphere === "E" || t.hemisphere === "W");
  if (northSouth !== void 0 && eastWest !== void 0) {
    if (inEstoniaBox(northSouth.value, eastWest.value)) {
      return { latitude: northSouth.value, longitude: eastWest.value };
    }
    return {
      reason: "out-of-bounds",
      detail: `hemispheres pin the order: ${northSouth.value}, ${eastWest.value}`
    };
  }
  const [a, b] = [tokens[0].value, tokens[1].value];
  return gateWithSwap(a, b);
}
function plainPair(text) {
  const stripped = text.replace(LABEL_PATTERN, " ");
  const decimals = stripped.match(DECIMAL_PATTERN);
  if (decimals === null || decimals.length < 2) {
    return null;
  }
  return [Number(decimals[0]), Number(decimals[1])];
}
function urlPair(url) {
  for (const pattern of QUERY_PARAM_PATTERNS) {
    const param = pattern.exec(url);
    if (param === null) {
      continue;
    }
    const pair = toDecimalPair(param[1]);
    if (pair !== null) {
      const commaFailure2 = decimalCommaFailure(param[1]);
      if (commaFailure2 !== null) {
        return commaFailure2;
      }
      return gateWithSwap(pair[0], pair[1]);
    }
  }
  const share = GOO_SHARE_PATTERN.exec(url);
  if (share !== null) {
    return gateWithSwap(Number(share[1]), Number(share[2]));
  }
  const at = AT_COORD_PATTERN.exec(url);
  if (at !== null) {
    const commaFailure2 = decimalCommaFailure(at[0]);
    if (commaFailure2 !== null) {
      return commaFailure2;
    }
    return gateWithSwap(Number(at[1]), Number(at[2]));
  }
  const search = SEARCH_PAIR_PATTERN.exec(url);
  if (search !== null) {
    const commaFailure2 = decimalCommaFailure(search[0]);
    if (commaFailure2 !== null) {
      return commaFailure2;
    }
    return gateWithSwap(Number(search[1]), Number(search[2]));
  }
  const urlBody = url.replace(/^https?:\/\/[^/?#]+/i, "");
  const commaFailure = decimalCommaFailure(urlBody);
  if (commaFailure !== null) {
    return commaFailure;
  }
  const generic = toDecimalPair(url);
  if (generic !== null) {
    return gateWithSwap(generic[0], generic[1]);
  }
  return { reason: "no-pair", detail: "no coordinate pair in the URL" };
}
function parseLocationInput(text) {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { reason: "no-pair", detail: "empty input" };
  }
  if (URL_PATTERN.test(trimmed)) {
    return urlPair(trimmed);
  }
  const hasDegree = /[°º]/.test(trimmed);
  const hasHemisphere = HEMISHERE_ADMONST_PATTERN.test(trimmed);
  if (hasDegree || hasHemisphere) {
    const tokens = dmsTokens(trimmed);
    if (DECIMAL_COMMA_PATTERN.test(trimmed)) {
      return { reason: "decimal-comma", detail: DECIMAL_COMMA_DETAIL };
    }
    if (tokens.length >= 2) {
      return dmsToPair(tokens);
    }
    if (tokens.length === 1) {
      if (hasNonDmsDecimal(trimmed)) {
        return {
          reason: "invalid",
          detail: "mix of DMS and decimal \u2014 use one format for both values"
        };
      }
      return { reason: "invalid", detail: "a single DMS value is not a coordinate pair" };
    }
    const commaFailure = decimalCommaFailure(trimmed);
    if (commaFailure !== null) {
      return commaFailure;
    }
    const pair2 = plainPair(trimmed);
    if (pair2 !== null) {
      return gateWithSwap(pair2[0], pair2[1]);
    }
    return { reason: "invalid", detail: "coordinate markers without a parseable pair" };
  }
  if (decimalCommaFailure(trimmed) !== null || hasMixedDecimalMarks(trimmed)) {
    return { reason: "decimal-comma", detail: DECIMAL_COMMA_DETAIL };
  }
  const pair = plainPair(trimmed);
  if (pair !== null) {
    return gateWithSwap(pair[0], pair[1]);
  }
  return {
    reason: LABEL_PRESENT_PATTERN.test(trimmed) ? "invalid" : "no-pair",
    detail: LABEL_PRESENT_PATTERN.test(trimmed) ? "labels without a coordinate pair" : "no coordinate pair found"
  };
}
function isGooShortLink(text) {
  return GOO_SHORT_LINK_PATTERN.test(text.trim());
}
function normalizeShortLinkUrl(text) {
  const trimmed = text.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// src/app/features/shelter/submit-shelter-page.ts
import * as i02 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i1 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
var _c0 = ["mapEl"];
var _c1 = (a0) => ["/shelters", a0];
var _forTrack0 = ($index, $item) => $item.displayName;
function SubmitShelterPage_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "h1", 3);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "account.edit"));
  }
}
function SubmitShelterPage_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "h1", 3);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(3, "p", 10);
    i02.\u0275\u0275text(4);
    i02.\u0275\u0275pipe(5, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 2, "submit.title"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(5, 4, "submit.subtitle"));
  }
}
function SubmitShelterPage_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 5)(1, "p");
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(4, "p", 11)(5, "a", 12);
    i02.\u0275\u0275text(6);
    i02.\u0275\u0275pipe(7, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(8, "a", 13);
    i02.\u0275\u0275text(9);
    i02.\u0275\u0275pipe(10, "t");
    i02.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 4, "submit.successBody"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("routerLink", i02.\u0275\u0275pureFunction1(10, _c1, ctx.id));
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(7, 6, "submit.success.viewLocation"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(10, 8, "submit.success.viewContributions"));
  }
}
function SubmitShelterPage_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 6);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementStart(3, "a", 14);
    i02.\u0275\u0275text(4);
    i02.\u0275\u0275pipe(5, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 2, "submit.verifyHint"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(5, 4, "submit.verifyHint.link"));
  }
}
function SubmitShelterPage_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-loading-indicator", 7);
    i02.\u0275\u0275pipe(1, "t");
  }
  if (rf & 2) {
    i02.\u0275\u0275property("message", i02.\u0275\u0275pipeBind1(1, 1, "account.contrib.loading"));
  }
}
function SubmitShelterPage_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 8)(1, "h2", 15);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(4, "p");
    i02.\u0275\u0275text(5);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(7, "p", 16)(8, "a", 13);
    i02.\u0275\u0275text(9);
    i02.\u0275\u0275pipe(10, "t");
    i02.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 3, "detail.notFoundTitle"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(6, 5, "detail.notFoundBody"));
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(10, 7, "submit.success.viewContributions"));
  }
}
function SubmitShelterPage_Conditional_12_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 21);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.name().errors?.["maxlength"] ? i02.\u0275\u0275pipeBind1(2, 1, "submit.name.tooLong") : i02.\u0275\u0275pipeBind1(3, 3, "submit.name.required"), " ");
  }
}
function SubmitShelterPage_Conditional_12_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 21);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "submit.description.tooLong"));
  }
}
function SubmitShelterPage_Conditional_12_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 21);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "submit.capacity.invalid"));
  }
}
function SubmitShelterPage_Conditional_12_Conditional_70_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "li")(1, "button", 49);
    i02.\u0275\u0275listener("click", function SubmitShelterPage_Conditional_12_Conditional_70_For_2_Template_button_click_1_listener() {
      const result_r4 = i02.\u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = i02.\u0275\u0275nextContext(3);
      return i02.\u0275\u0275resetView(ctx_r1.selectAddressResult(result_r4));
    });
    i02.\u0275\u0275elementStart(2, "span", 50);
    i02.\u0275\u0275text(3);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(4, "span", 51);
    i02.\u0275\u0275text(5);
    i02.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const result_r4 = ctx.$implicit;
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(result_r4.displayName);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(result_r4.type);
  }
}
function SubmitShelterPage_Conditional_12_Conditional_70_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "ul", 43);
    i02.\u0275\u0275repeaterCreate(1, SubmitShelterPage_Conditional_12_Conditional_70_For_2_Template, 6, 2, "li", null, _forTrack0);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275repeater(ctx_r1.addressResults());
  }
}
function SubmitShelterPage_Conditional_12_Conditional_71_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 36);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const addressErrorMsg_r5 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(addressErrorMsg_r5);
  }
}
function SubmitShelterPage_Conditional_12_Conditional_71_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 47);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const addressErrorMsg_r5 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(addressErrorMsg_r5);
  }
}
function SubmitShelterPage_Conditional_12_Conditional_71_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275conditionalCreate(0, SubmitShelterPage_Conditional_12_Conditional_71_Conditional_0_Template, 2, 1, "p", 36)(1, SubmitShelterPage_Conditional_12_Conditional_71_Conditional_1_Template, 2, 1, "p", 47);
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275conditional(ctx_r1.addressError() === "no-results" ? 0 : 1);
  }
}
function SubmitShelterPage_Conditional_12_Conditional_79_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 46);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(ctx);
  }
}
function SubmitShelterPage_Conditional_12_Conditional_80_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 47);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(ctx);
  }
}
function SubmitShelterPage_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "form", 17);
    i02.\u0275\u0275listener("ngSubmit", function SubmitShelterPage_Conditional_12_Template_form_ngSubmit_0_listener() {
      i02.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r1.submit());
    });
    i02.\u0275\u0275elementStart(1, "div", 18)(2, "label", 19);
    i02.\u0275\u0275text(3);
    i02.\u0275\u0275pipe(4, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(5, "input", 20);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275conditionalCreate(7, SubmitShelterPage_Conditional_12_Conditional_7_Template, 4, 5, "p", 21);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(8, "div", 18)(9, "label", 22);
    i02.\u0275\u0275text(10);
    i02.\u0275\u0275pipe(11, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(12, "textarea", 23);
    i02.\u0275\u0275pipe(13, "t");
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275conditionalCreate(14, SubmitShelterPage_Conditional_12_Conditional_14_Template, 3, 3, "p", 21);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(15, "div", 18)(16, "label", 24);
    i02.\u0275\u0275text(17);
    i02.\u0275\u0275pipe(18, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(19, "input", 25);
    i02.\u0275\u0275pipe(20, "t");
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275elementStart(21, "p", 26);
    i02.\u0275\u0275text(22);
    i02.\u0275\u0275pipe(23, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(24, SubmitShelterPage_Conditional_12_Conditional_24_Template, 3, 3, "p", 21);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(25, "div", 18)(26, "label", 27);
    i02.\u0275\u0275element(27, "input", 28);
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275text(28);
    i02.\u0275\u0275pipe(29, "t");
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275elementStart(30, "fieldset", 29)(31, "legend");
    i02.\u0275\u0275text(32);
    i02.\u0275\u0275pipe(33, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(34, "p", 26);
    i02.\u0275\u0275text(35);
    i02.\u0275\u0275pipe(36, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(37, "div", 30, 0);
    i02.\u0275\u0275elementStart(39, "div", 31)(40, "label", 32);
    i02.\u0275\u0275text(41);
    i02.\u0275\u0275pipe(42, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(43, "div", 33)(44, "input", 34);
    i02.\u0275\u0275pipe(45, "t");
    i02.\u0275\u0275listener("input", function SubmitShelterPage_Conditional_12_Template_input_input_44_listener($event) {
      i02.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r1.onLocationTextChange($event));
    })("keydown.enter", function SubmitShelterPage_Conditional_12_Template_input_keydown_enter_44_listener($event) {
      i02.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r1.onLocationSubmitKey($event));
    });
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(46, "button", 35);
    i02.\u0275\u0275listener("click", function SubmitShelterPage_Conditional_12_Template_button_click_46_listener() {
      i02.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r1.applyLocationInput());
    });
    i02.\u0275\u0275text(47);
    i02.\u0275\u0275pipe(48, "t");
    i02.\u0275\u0275pipe(49, "t");
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275elementStart(50, "p", 36);
    i02.\u0275\u0275text(51);
    i02.\u0275\u0275pipe(52, "t");
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275elementStart(53, "div", 37)(54, "label", 38);
    i02.\u0275\u0275text(55);
    i02.\u0275\u0275pipe(56, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(57, "div", 39)(58, "input", 40);
    i02.\u0275\u0275pipe(59, "t");
    i02.\u0275\u0275listener("input", function SubmitShelterPage_Conditional_12_Template_input_input_58_listener($event) {
      i02.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r1.onAddressQueryChange($event));
    })("keydown.enter", function SubmitShelterPage_Conditional_12_Template_input_keydown_enter_58_listener($event) {
      i02.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r1.onAddressSearchKey($event));
    });
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(60, "button", 35);
    i02.\u0275\u0275listener("click", function SubmitShelterPage_Conditional_12_Template_button_click_60_listener() {
      i02.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r1.startAddressSearch());
    });
    i02.\u0275\u0275text(61);
    i02.\u0275\u0275pipe(62, "t");
    i02.\u0275\u0275pipe(63, "t");
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275elementStart(64, "p", 41);
    i02.\u0275\u0275text(65);
    i02.\u0275\u0275pipe(66, "t");
    i02.\u0275\u0275elementStart(67, "a", 42);
    i02.\u0275\u0275text(68);
    i02.\u0275\u0275pipe(69, "t");
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275conditionalCreate(70, SubmitShelterPage_Conditional_12_Conditional_70_Template, 3, 0, "ul", 43);
    i02.\u0275\u0275conditionalCreate(71, SubmitShelterPage_Conditional_12_Conditional_71_Template, 2, 1);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(72, "div", 44)(73, "button", 35);
    i02.\u0275\u0275listener("click", function SubmitShelterPage_Conditional_12_Template_button_click_73_listener() {
      i02.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r1.useMyLocation());
    });
    i02.\u0275\u0275text(74);
    i02.\u0275\u0275pipe(75, "t");
    i02.\u0275\u0275pipe(76, "t");
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275elementStart(77, "p", 45);
    i02.\u0275\u0275text(78);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(79, SubmitShelterPage_Conditional_12_Conditional_79_Template, 2, 1, "p", 46);
    i02.\u0275\u0275conditionalCreate(80, SubmitShelterPage_Conditional_12_Conditional_80_Template, 2, 1, "p", 47);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(81, "button", 48);
    i02.\u0275\u0275text(82);
    i02.\u0275\u0275pipe(83, "t");
    i02.\u0275\u0275pipe(84, "t");
    i02.\u0275\u0275pipe(85, "t");
    i02.\u0275\u0275pipe(86, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_36_0;
    let tmp_41_0;
    let tmp_42_0;
    const ctx_r1 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275property("formGroup", ctx_r1.form);
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(4, 40, "submit.nameLabel"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("placeholder", i02.\u0275\u0275pipeBind1(6, 42, "submit.namePlaceholder"));
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r1.name().touched && ctx_r1.name().invalid ? 7 : -1);
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(11, 44, "submit.descriptionLabel"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("placeholder", i02.\u0275\u0275pipeBind1(13, 46, "submit.descriptionPlaceholder"));
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r1.description().invalid && ctx_r1.description().touched ? 14 : -1);
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(18, 48, "submit.capacityLabel"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("placeholder", i02.\u0275\u0275pipeBind1(20, 50, "submit.capacityPlaceholder"));
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(23, 52, "submit.capacityHint"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r1.capacity().invalid && ctx_r1.capacity().touched ? 24 : -1);
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(29, 54, "submit.privateLabel"), " ");
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(33, 56, "submit.locationLegend"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(36, 58, "submit.locationNote"));
    i02.\u0275\u0275advance(6);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(42, 60, "submit.locationLabel"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("value", ctx_r1.locationText())("placeholder", i02.\u0275\u0275pipeBind1(45, 62, "submit.locationPlaceholder"))("disabled", ctx_r1.resolvingLink() || ctx_r1.locating());
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("disabled", ctx_r1.resolvingLink() || ctx_r1.locating());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.resolvingLink() ? i02.\u0275\u0275pipeBind1(48, 64, "submit.location.resolving") : i02.\u0275\u0275pipeBind1(49, 66, "submit.location.set"), " ");
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(52, 68, "submit.location.prefillNote"), " ");
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(56, 70, "submit.addressLabel"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("value", ctx_r1.addressQuery())("placeholder", i02.\u0275\u0275pipeBind1(59, 72, "submit.addressPlaceholder"))("disabled", ctx_r1.searching());
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("disabled", ctx_r1.searching());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.searching() ? i02.\u0275\u0275pipeBind1(62, 74, "submit.searching") : i02.\u0275\u0275pipeBind1(63, 76, "submit.search"), " ");
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(66, 78, "submit.attributionLead"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(69, 80, "submit.osmAttribution"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r1.addressResults().length !== 0 ? 70 : -1);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_36_0 = ctx_r1.addressErrorText()) ? 71 : -1, tmp_36_0);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("disabled", ctx_r1.locating() || ctx_r1.resolvingLink());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.locating() ? i02.\u0275\u0275pipeBind1(75, 82, "submit.locating") : i02.\u0275\u0275pipeBind1(76, 84, "submit.useMyLocation"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275classProp("location-readout--empty", ctx_r1.location() === null);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.locationReadout(), " ");
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_41_0 = ctx_r1.locationHint()) ? 79 : -1, tmp_41_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_42_0 = ctx_r1.locationErrorText()) ? 80 : -1, tmp_42_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275property("disabled", ctx_r1.pending() || ctx_r1.editLoading());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.pending() ? ctx_r1.editMode() ? i02.\u0275\u0275pipeBind1(83, 86, "account.saving") : i02.\u0275\u0275pipeBind1(84, 88, "submit.submitting") : ctx_r1.editMode() ? i02.\u0275\u0275pipeBind1(85, 90, "account.save") : i02.\u0275\u0275pipeBind1(86, 92, "submit.submit"), " ");
  }
}
var LOCATION_ERROR_KEY = {
  missing: "submit.loc.missing",
  "no-pair": "submit.loc.noPair",
  "out-of-bounds": "submit.loc.outOfBounds",
  invalid: "submit.loc.invalid",
  "decimal-comma": "submit.loc.decimalComma",
  "geo-denied": "submit.loc.geoDenied",
  "geo-unavailable": "submit.loc.geoUnavailable",
  "geo-timeout": "submit.loc.geoTimeout",
  "geo-insecure": "submit.loc.geoInsecure",
  "short-link-failed": "submit.loc.shortLinkFailed",
  "short-link-rate-limited": "submit.loc.shortLinkRateLimited",
  "short-link-unavailable": "submit.loc.shortLinkUnavailable"
};
var SOURCE_KEY = {
  typed: "submit.hint.source.typed",
  link: "submit.hint.source.link",
  geolocation: "submit.hint.source.geolocation",
  "map-pick": "submit.hint.source.map",
  "address-search": "submit.hint.source.address"
};
var GEOCODE_ERROR_KEY = {
  "no-results": "submit.geocode.noResults",
  "rate-limited": "submit.geocode.rateLimited",
  network: "submit.geocode.network"
};
var SubmitShelterPage = class _SubmitShelterPage {
  gateway = inject2(ShelterGateway);
  geo = inject2(GeoGateway);
  geocode = inject2(GeocodeGateway);
  leaflet = inject2(LeafletService);
  /** Resolves the location capture copy (i18n-et-en). */
  i18n = inject2(I18nService);
  /** The active route: /submit?edit=<id> opens the form in edit mode (M5). */
  route = inject2(ActivatedRoute);
  mapEl = viewChild(
    "mapEl",
    ...ngDevMode ? [{ debugName: "mapEl" }] : (
      /* istanbul ignore next */
      []
    )
  );
  form = new FormGroup({
    name: new FormControl("", {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(200),
        // Whitespace-only names pass Validators.required — mirror the
        // backend @NotBlank so we never POST "   ".
        nameBlankValidator
      ]
    }),
    description: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(2e3)]
    }),
    capacity: new FormControl(null, { validators: [capacityValidator] }),
    // The private-home declaration (community-review-queue D7): maps to the
    // payload's locationKind (PRIVATE when checked, PUBLIC by default).
    privateLocation: new FormControl(false, { nonNullable: true })
  });
  pending = signal(
    false,
    ...ngDevMode ? [{ debugName: "pending" }] : (
      /* istanbul ignore next */
      []
    )
  );
  error = signal(
    null,
    ...ngDevMode ? [{ debugName: "error" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** True when the last failure was a 403 — offer the /verify path. */
  verifyLink = signal(
    false,
    ...ngDevMode ? [{ debugName: "verifyLink" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The created row (community-review-queue): set on 201 — the row is
   *  public immediately as NEW, so the success panel links to the detail
   *  page instead of navigating there (the form stays for a second
   *  submission). In edit mode (M5) it is the UPDATED row — the same panel
   *  is the save confirmation (the edit publishes immediately with the
   *  NEW pending-verification state). */
  submitted = signal(
    null,
    ...ngDevMode ? [{ debugName: "submitted" }] : (
      /* istanbul ignore next */
      []
    )
  );
  // ---- edit mode (M5: editing reuses this form) ----------------------------
  /** True while /submit?edit=<id> — the heading + submit button carry the
   *  edit/save copy. Creation is this same form WITHOUT the param — the
   *  /submit path is unchanged. */
  editMode = signal(
    false,
    ...ngDevMode ? [{ debugName: "editMode" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** True while the ?edit row is being loaded from /mine. */
  editLoading = signal(
    false,
    ...ngDevMode ? [{ debugName: "editLoading" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The param is malformed, or the id is not the caller's row (absent
   *  from /mine): the not-found state renders instead of the form. */
  editMissing = signal(
    false,
    ...ngDevMode ? [{ debugName: "editMissing" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The id of the row being edited — set once the /mine row is found.
   *  null = creation mode, or an edit that never resolved to a row. */
  editingId = signal(
    null,
    ...ngDevMode ? [{ debugName: "editingId" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The ONE shared location state (null = nothing picked yet). */
  location = signal(
    null,
    ...ngDevMode ? [{ debugName: "location" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Per-reason inline error of the location section (null = none). */
  locationError = signal(
    null,
    ...ngDevMode ? [{ debugName: "locationError" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** True while a maps.app.goo.gl short link is being resolved by the backend. */
  resolvingLink = signal(
    false,
    ...ngDevMode ? [{ debugName: "resolvingLink" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** True while the browser geolocation request is in flight. */
  locating = signal(
    false,
    ...ngDevMode ? [{ debugName: "locating" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * The smart text input's content. Deliberately a plain input (not a form
   * control): it is a capture AFFORDANCE, not a submitted field — the
   * submitted coordinates always come from the shared location state.
   * Doubles as the form's address field for address-search prefill
   * (only-if-empty, stated in the help line near it — design decision 4).
   */
  locationText = signal(
    "",
    ...ngDevMode ? [{ debugName: "locationText" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * The monotonic capture generation (cross-mode capture race): every
   * capture start — geolocation, short-link resolve, smart-input parse, map
   * pick, address select — bumps this counter. Async callbacks capture
   * their generation at start and NO-OP once a newer capture has superseded
   * them: a late geolocation settle (up to 10 s) can neither overwrite a
   * typed/map pin nor clear it with its error, and a late resolve 400 can
   * neither overwrite nor clear a pick made while it was in flight.
   */
  captureGeneration = 0;
  /** The address search input's content (a capture affordance, not a field). */
  addressQuery = signal(
    "",
    ...ngDevMode ? [{ debugName: "addressQuery" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** True while a search is in flight OR waiting out the 1000 ms spacing window. */
  searching = signal(
    false,
    ...ngDevMode ? [{ debugName: "searching" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The current results (max 5) — stay listed until the next search. */
  addressResults = signal(
    [],
    ...ngDevMode ? [{ debugName: "addressResults" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The inline state of the search (null = none). */
  addressError = signal(
    null,
    ...ngDevMode ? [{ debugName: "addressError" }] : (
      /* istanbul ignore next */
      []
    )
  );
  name() {
    return this.form.get("name");
  }
  description() {
    return this.form.get("description");
  }
  capacity() {
    return this.form.get("capacity");
  }
  privateLocation() {
    return this.form.get("privateLocation");
  }
  /** The read-only coordinate readout under the map. */
  locationReadout() {
    const picked = this.location();
    return picked === null ? this.i18n.t("submit.location.empty") : `${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)}`;
  }
  /** Source hint (incl. the swapped-order + geolocation-accuracy hints).
   *  The edit prefill ('saved') names no capture mode — no hint line. */
  locationHint() {
    const picked = this.location();
    if (picked === null || picked.source === "saved") {
      return null;
    }
    let hint = this.i18n.t("submit.hint.from") + this.i18n.t(SOURCE_KEY[picked.source]);
    if (picked.swapped) {
      hint += this.i18n.t("submit.hint.swapped");
    }
    if (picked.accuracyM !== null) {
      hint += this.i18n.t("submit.hint.accuracy", { m: Math.round(picked.accuracyM) });
    }
    return hint;
  }
  locationErrorText() {
    const kind = this.locationError();
    return kind === null ? null : this.i18n.t(LOCATION_ERROR_KEY[kind]);
  }
  /**
   * The form renders for creation, and for an edit once its row has
   * loaded. The edit's loading / not-found / load-failure states render
   * their own markup instead (the load failure shows through the banner).
   */
  showForm() {
    if (!this.editMode()) {
      return true;
    }
    return !this.editLoading() && !this.editMissing() && this.editingId() !== null;
  }
  /**
   * Edit mode (M5): /submit?edit=<id> prefills the SAME form with the
   * row's current values. The row comes from GET /api/shelters/mine —
   * owner-scoped, ALL statuses — so an id that is not the caller's (or a
   * malformed param) is the not-found state, never a prefill of someone
   * else's shelter. Save is PUT /api/shelters/{id} and publishes
   * immediately (the backend keeps the row's status — an edit never
   * unpublishes it); per the owner's M5 decision the shelter then carries
   * the same pending-verification (NEW) trust state a newly added shelter
   * gets — a STATUS, not a gate in front of the edit.
   */
  ngOnInit() {
    const raw = this.route.snapshot.queryParamMap.get("edit");
    if (raw === null) {
      return;
    }
    this.editMode.set(true);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      this.editMissing.set(true);
      return;
    }
    this.editLoading.set(true);
    void this.gateway.mine().then((rows) => {
      const row = rows.find((r) => r.id === id) ?? null;
      if (row === null) {
        this.editMissing.set(true);
        return;
      }
      this.prefillFromRow(row);
      this.editingId.set(row.id);
    }).catch((failure) => {
      this.error.set(bannerMessage(failure, "shelter", (key) => this.i18n.t(key)));
    }).finally(() => this.editLoading.set(false));
  }
  /**
   * Fills the form + the shared location state from the row being edited.
   * Prefill, never overwrite: if the user already captured a location or
   * touched the form before the row landed, their input wins.
   */
  prefillFromRow(row) {
    if (this.location() !== null || this.form.touched || this.locationText() !== "") {
      return;
    }
    this.name().setValue(row.name);
    this.description().setValue(row.description ?? "");
    this.capacity().setValue(row.capacity);
    this.privateLocation().setValue(row.locationKind === "PRIVATE");
    this.locationText.set(`${row.latitude}, ${row.longitude}`);
    this.setLocation(row.latitude, row.longitude, "saved", false, true);
  }
  /**
   * The map container only exists once the view is rendered; a null
   * container (should never happen) skips map creation but never breaks
   * the page. Map click AND pick-marker drag -> the shared location state.
   */
  ngAfterViewInit() {
    this.leaflet.mapClick = (latitude, longitude) => {
      this.captureGeneration++;
      this.setLocation(latitude, longitude, "map-pick", false, false);
    };
    this.leaflet.create(this.mapEl()?.nativeElement ?? null, ESTONIA_CENTER, ESTONIA_ZOOM);
  }
  ngOnDestroy() {
    this.leaflet.destroy();
  }
  // ---------------------------------------------------------------------
  // Capture modes — every one writes the single shared location state
  // ---------------------------------------------------------------------
  onLocationTextChange(event) {
    this.locationText.set(event.target.value);
  }
  /** Enter in the smart input parses instead of submitting the form. */
  onLocationSubmitKey(event) {
    if (!(event instanceof KeyboardEvent) || event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    this.applyLocationInput();
  }
  /** The "Set location" button (and Enter): smart-input capture. */
  applyLocationInput() {
    const text = this.locationText().trim();
    if (text === "") {
      return;
    }
    this.captureGeneration++;
    if (isGooShortLink(text)) {
      void this.resolveShortLink(normalizeShortLinkUrl(text));
      return;
    }
    const result = parseLocationInput(text);
    if ("latitude" in result) {
      this.setLocation(result.latitude, result.longitude, /^https?:\/\//i.test(text) ? "link" : "typed", result.swapped === true);
    } else {
      this.failLocation(result.reason);
    }
  }
  /**
   * "Use my location" — high-accuracy geolocation, 10 s timeout, no cached
   * positions (design decision 5). Each failure maps 1:1 to an inline
   * message; the insecure-context guard has its own copy.
   */
  useMyLocation() {
    if (window.isSecureContext === false) {
      this.failLocation("geo-insecure");
      return;
    }
    const geolocation = navigator.geolocation;
    if (!geolocation || typeof geolocation.getCurrentPosition !== "function") {
      this.failLocation("geo-unavailable");
      return;
    }
    this.locating.set(true);
    this.locationError.set(null);
    const gen = ++this.captureGeneration;
    geolocation.getCurrentPosition((position) => {
      this.locating.set(false);
      if (gen !== this.captureGeneration) {
        return;
      }
      this.setLocation(position.coords.latitude, position.coords.longitude, "geolocation", false, true, position.coords.accuracy);
    }, (err) => {
      this.locating.set(false);
      if (gen !== this.captureGeneration) {
        return;
      }
      const code = typeof err?.code === "number" ? err.code : 2;
      this.failLocation(code === 1 ? "geo-denied" : code === 3 ? "geo-timeout" : "geo-unavailable");
    }, { enableHighAccuracy: true, timeout: 1e4, maximumAge: 0 });
  }
  /** maps.app.goo.gl -> POST /api/geo/resolve (JWT, per-IP 5/min). */
  async resolveShortLink(url) {
    this.resolvingLink.set(true);
    this.locationError.set(null);
    const gen = ++this.captureGeneration;
    try {
      const resolved = await this.geo.resolve(url);
      if (gen !== this.captureGeneration) {
        return;
      }
      this.setLocation(resolved.latitude, resolved.longitude, "link");
    } catch (failure) {
      if (gen !== this.captureGeneration) {
        return;
      }
      const api = toApiError(failure);
      if (api.status >= 500 || api.isNetworkError) {
        this.failLocation("short-link-unavailable");
      } else if (api.status === 429) {
        this.failLocation("short-link-rate-limited");
      } else {
        this.failLocation("short-link-failed");
      }
    } finally {
      this.resolvingLink.set(false);
    }
  }
  // ---------------------------------------------------------------------
  // Capture mode 5: Estonia address search (client-side OSM Nominatim)
  // ---------------------------------------------------------------------
  onAddressQueryChange(event) {
    this.addressQuery.set(event.target.value);
  }
  /** Enter in the search input searches instead of submitting the form. */
  onAddressSearchKey(event) {
    if (!(event instanceof KeyboardEvent) || event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    this.startAddressSearch();
  }
  /**
   * The "Search" button (and Enter): ONE deliberate Nominatim request per
   * press — no autosuggest (Nominatim usage policy, design decision 2).
   * A press while a search is pending is IGNORED, never stacked; if the
   * press lands inside the 1000 ms spacing window the gateway waits it
   * out and the button stays pending the whole time (design decision 3).
   */
  startAddressSearch() {
    if (this.searching()) {
      return;
    }
    const query = this.addressQuery().trim();
    if (query === "") {
      return;
    }
    this.searching.set(true);
    this.addressError.set(null);
    this.addressResults.set([]);
    void this.geocode.search(query).then((results) => {
      if (results.length === 0) {
        this.addressError.set("no-results");
        return;
      }
      this.addressResults.set(results);
    }).catch((failure) => {
      const api = toApiError(failure);
      this.addressError.set(api.status === 429 ? "rate-limited" : "network");
    }).finally(() => this.searching.set(false));
  }
  /**
   * Selecting a result: place the pin (source 'address-search', the same
   * shared path as every other capture mode) and prefill the address field
   * — the smart text input above — ONLY IF it is currently empty (design
   * decision 4: prefill, never overwrite; the help line states this).
   */
  selectAddressResult(result) {
    this.captureGeneration++;
    this.setLocation(result.latitude, result.longitude, "address-search");
    if (this.locationText().trim() === "") {
      this.locationText.set(result.displayName);
    }
  }
  addressErrorText() {
    const kind = this.addressError();
    return kind === null ? null : this.i18n.t(GEOCODE_ERROR_KEY[kind]);
  }
  /**
   * A FAILED capture removes the previous pin (spec: "the marker is not
   * placed") — the safest state: an error is showing AND the form cannot
   * silently submit a stale, now-untrusted pin (design risk: never a
   * silent wrong pin). 'missing' is the one exception — it is set at
   * submit time when there is nothing to clear.
   */
  failLocation(kind) {
    this.location.set(null);
    this.locationError.set(kind);
    this.leaflet.setPick(null, null);
  }
  /** The single writer of the shared location state (all capture modes). */
  setLocation(latitude, longitude, source, swapped = false, fly = true, accuracyM = null) {
    this.location.set({ latitude, longitude, source, swapped, accuracyM });
    this.locationError.set(null);
    this.leaflet.setPick(latitude, longitude);
    if (fly) {
      this.leaflet.flyTo(latitude, longitude);
    }
  }
  // ---------------------------------------------------------------------
  // Submit — payload: name + latitude/longitude numbers, optional
  // description/capacity, locationKind (community-review-queue D7)
  // ---------------------------------------------------------------------
  async submit() {
    if (this.pending()) {
      return;
    }
    const editId = this.editingId();
    if (this.editMode() && (this.editLoading() || editId === null)) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.location() === null) {
      this.locationError.set("missing");
    }
    if (this.form.invalid || this.location() === null) {
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    this.verifyLink.set(false);
    this.submitted.set(null);
    const picked = this.location();
    const request = {
      name: this.name().value.trim(),
      latitude: picked.latitude,
      longitude: picked.longitude,
      // Explicit on purpose: unchecked = PUBLIC (the contract default),
      // checked = PRIVATE (the resident-offered declaration). The same
      // explicit locationKind rides the edit's PUT (M5) — the backend's
      // create/update constraint path is shared.
      locationKind: this.privateLocation().value ? "PRIVATE" : "PUBLIC"
    };
    const description = this.description().value.trim();
    if (description !== "") {
      request.description = description;
    }
    const capacity = this.capacity().value;
    if (typeof capacity === "number" && Number.isInteger(capacity)) {
      request.capacity = capacity;
    }
    try {
      const result = editId === null ? await this.gateway.create(request) : await this.gateway.update(editId, request);
      this.submitted.set(result);
    } catch (failure) {
      const api = toApiError(failure);
      this.error.set(bannerMessage(failure, "shelter", (key) => this.i18n.t(key)));
      this.verifyLink.set(api.status === 403);
    } finally {
      this.pending.set(false);
    }
  }
  static \u0275fac = function SubmitShelterPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SubmitShelterPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i02.\u0275\u0275defineComponent({ type: _SubmitShelterPage, selectors: [["app-submit-shelter-page"]], viewQuery: function SubmitShelterPage_Query(rf, ctx) {
    if (rf & 1) {
      i02.\u0275\u0275viewQuerySignal(ctx.mapEl, _c0, 5);
    }
    if (rf & 2) {
      i02.\u0275\u0275queryAdvance();
    }
  }, features: [i02.\u0275\u0275ProvidersFeature([LeafletService])], decls: 13, vars: 8, consts: [["mapEl", ""], [1, "submit-page"], ["routerLink", "/map", 1, "back-link"], [1, "page-title"], ["severity", "error", 3, "message"], ["role", "status", 1, "submit-success"], [1, "verify-hint"], [1, "submit-state", 3, "message"], ["role", "status", 1, "edit-not-found"], [1, "submit-form", 3, "formGroup"], [1, "page-subtitle"], [1, "submit-success__links"], [3, "routerLink"], ["routerLink", "/account"], ["routerLink", "/verify"], [1, "edit-not-found__title"], [1, "edit-not-found__links"], [1, "submit-form", 3, "ngSubmit", "formGroup"], [1, "field"], ["for", "shelter-name"], ["id", "shelter-name", "type", "text", "formControlName", "name", "maxlength", "200", "autocomplete", "off", 3, "placeholder"], [1, "field-error"], ["for", "shelter-description"], ["id", "shelter-description", "formControlName", "description", "maxlength", "2000", 3, "placeholder"], ["for", "shelter-capacity"], ["id", "shelter-capacity", "type", "number", "min", "1", "max", "100000", "step", "1", "formControlName", "capacity", 3, "placeholder"], [1, "field-note"], ["for", "shelter-private", 1, "checkbox-field"], ["id", "shelter-private", "type", "checkbox", "formControlName", "privateLocation"], [1, "field", "location-field"], [1, "submit-map"], [1, "location-smart"], ["for", "shelter-location-input", 1, "location-label"], [1, "location-smart-row"], ["id", "shelter-location-input", "type", "text", "autocomplete", "off", 3, "input", "keydown.enter", "value", "placeholder", "disabled"], ["type", "button", 1, "btn", 3, "click", "disabled"], [1, "location-note"], [1, "location-search"], ["for", "shelter-address-search", 1, "location-label"], [1, "location-search-row"], ["id", "shelter-address-search", "type", "text", "autocomplete", "off", 3, "input", "keydown.enter", "value", "placeholder", "disabled"], [1, "location-attribution"], ["href", "https://www.openstreetmap.org/copyright", "target", "_blank", "rel", "noopener"], [1, "address-results"], [1, "location-actions"], [1, "location-readout", "num-tabular"], [1, "location-hint"], ["role", "alert", 1, "field-error"], ["type", "submit", 1, "btn", "btn--primary", 3, "disabled"], ["type", "button", 1, "address-result", 3, "click"], [1, "address-result__name"], [1, "address-result__type"]], template: function SubmitShelterPage_Template(rf, ctx) {
    if (rf & 1) {
      i02.\u0275\u0275elementStart(0, "section", 1)(1, "a", 2);
      i02.\u0275\u0275text(2);
      i02.\u0275\u0275pipe(3, "t");
      i02.\u0275\u0275elementEnd();
      i02.\u0275\u0275elementStart(4, "header");
      i02.\u0275\u0275conditionalCreate(5, SubmitShelterPage_Conditional_5_Template, 3, 3, "h1", 3)(6, SubmitShelterPage_Conditional_6_Template, 6, 6);
      i02.\u0275\u0275elementEnd();
      i02.\u0275\u0275element(7, "app-banner", 4);
      i02.\u0275\u0275conditionalCreate(8, SubmitShelterPage_Conditional_8_Template, 11, 12, "div", 5);
      i02.\u0275\u0275conditionalCreate(9, SubmitShelterPage_Conditional_9_Template, 6, 6, "p", 6);
      i02.\u0275\u0275conditionalCreate(10, SubmitShelterPage_Conditional_10_Template, 2, 3, "app-loading-indicator", 7)(11, SubmitShelterPage_Conditional_11_Template, 11, 9, "div", 8)(12, SubmitShelterPage_Conditional_12_Template, 87, 94, "form", 9);
      i02.\u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_3_0;
      i02.\u0275\u0275advance(2);
      i02.\u0275\u0275textInterpolate1("\u2190 ", i02.\u0275\u0275pipeBind1(3, 6, "submit.backToMap"));
      i02.\u0275\u0275advance(3);
      i02.\u0275\u0275conditional(ctx.editMode() ? 5 : 6);
      i02.\u0275\u0275advance(2);
      i02.\u0275\u0275property("message", ctx.error());
      i02.\u0275\u0275advance();
      i02.\u0275\u0275conditional((tmp_3_0 = ctx.submitted()) ? 8 : -1, tmp_3_0);
      i02.\u0275\u0275advance();
      i02.\u0275\u0275conditional(ctx.verifyLink() ? 9 : -1);
      i02.\u0275\u0275advance();
      i02.\u0275\u0275conditional(ctx.editMode() && ctx.editLoading() ? 10 : ctx.editMode() && ctx.editMissing() ? 11 : ctx.showForm() ? 12 : -1);
    }
  }, dependencies: [ReactiveFormsModule, i1.\u0275NgNoValidate, i1.NgSelectOption, i1.\u0275NgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.RangeValueAccessor, i1.CheckboxControlValueAccessor, i1.SelectControlValueAccessor, i1.SelectMultipleControlValueAccessor, i1.RadioControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.MinLengthValidator, i1.MaxLengthValidator, i1.PatternValidator, i1.CheckboxRequiredValidator, i1.EmailValidator, i1.MinValidator, i1.MaxValidator, i1.FormControlDirective, i1.FormGroupDirective, i1.FormArrayDirective, i1.FormControlName, i1.FormGroupName, i1.FormArrayName, RouterLink, BannerComponent, LoadingIndicator, TranslatePipe], styles: ['@charset "UTF-8";\n\n\n.submit-page[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-20);\n  max-width: 44rem;\n}\n.back-link[_ngcontent-%COMP%] {\n  align-self: flex-start;\n  color: var(--%NS%color-primary);\n  text-decoration: none;\n  font-size: var(--%NS%text-md);\n}\n.back-link[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.verify-hint[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-md);\n  color: var(--%NS%color-muted);\n}\n.verify-hint[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--%NS%color-primary);\n}\n.submit-form[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-4);\n}\n.submit-form[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%] {\n  align-self: flex-start;\n}\n.checkbox-field[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: var(--%NS%space-8);\n  font-size: var(--%NS%text-base);\n  cursor: pointer;\n}\n.checkbox-field[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  margin: 0;\n  width: 18px;\n  height: 18px;\n  flex-shrink: 0;\n  accent-color: var(--%NS%color-primary);\n}\n.submit-success[_ngcontent-%COMP%] {\n  padding: var(--%NS%space-12) var(--%NS%space-16);\n  background: var(--%NS%color-success-bg);\n  border: 1px solid var(--%NS%color-success-border);\n  border-radius: var(--%NS%radius-md);\n  color: var(--%NS%color-text);\n  font-size: var(--%NS%text-base);\n}\n.submit-success[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n}\n.submit-success__links[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--%NS%space-4) var(--%NS%space-16);\n  margin-top: var(--%NS%space-8);\n}\n.submit-state[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-base);\n  color: var(--%NS%color-muted);\n}\n.edit-not-found[_ngcontent-%COMP%] {\n  padding: var(--%NS%space-12) var(--%NS%space-16);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-md);\n  font-size: var(--%NS%text-base);\n}\n.edit-not-found[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n}\n.edit-not-found__title[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-8);\n  font-size: var(--%NS%text-lg);\n  font-weight: var(--%NS%font-weight-medium);\n}\n.edit-not-found__links[_ngcontent-%COMP%] {\n  margin-top: var(--%NS%space-8);\n}\n.edit-not-found__links[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--%NS%color-primary);\n}\n.location-field[_ngcontent-%COMP%] {\n  margin: 0;\n  padding: var(--%NS%space-12) var(--%NS%space-14) var(--%NS%space-14);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-lg);\n}\n.location-field[_ngcontent-%COMP%]   legend[_ngcontent-%COMP%] {\n  font-size: var(--%NS%text-md);\n  font-weight: var(--%NS%font-weight-medium);\n  padding: 0 var(--%NS%space-6);\n}\n.field-note[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-8);\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n.submit-map[_ngcontent-%COMP%] {\n  height: 260px;\n  border-radius: var(--%NS%radius-lg);\n  border: 1px solid var(--%NS%color-border);\n  margin-bottom: var(--%NS%space-10);\n}\n.location-smart[_ngcontent-%COMP%] {\n  margin-bottom: var(--%NS%space-10);\n}\n.location-smart[_ngcontent-%COMP%]   .location-label[_ngcontent-%COMP%] {\n  display: block;\n  font-size: var(--%NS%text-md);\n  font-weight: var(--%NS%font-weight-medium);\n  margin-bottom: var(--%NS%space-6);\n}\n.location-smart[_ngcontent-%COMP%]   .location-smart-row[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--%NS%space-10);\n}\n.location-smart[_ngcontent-%COMP%]   .location-smart-row[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  flex: 1 1 200px;\n  padding: var(--%NS%space-8) var(--%NS%space-12);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-md);\n  font-size: var(--%NS%text-md);\n}\n.location-note[_ngcontent-%COMP%] {\n  margin: var(--%NS%space-6) 0 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n.location-search[_ngcontent-%COMP%] {\n  margin-bottom: var(--%NS%space-10);\n}\n.location-search[_ngcontent-%COMP%]   .location-label[_ngcontent-%COMP%] {\n  display: block;\n  font-size: var(--%NS%text-md);\n  font-weight: var(--%NS%font-weight-medium);\n  margin-bottom: var(--%NS%space-6);\n}\n.location-search[_ngcontent-%COMP%]   .location-search-row[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--%NS%space-10);\n}\n.location-search[_ngcontent-%COMP%]   .location-search-row[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  flex: 1 1 200px;\n  padding: var(--%NS%space-8) var(--%NS%space-12);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-md);\n  font-size: var(--%NS%text-md);\n}\n.location-attribution[_ngcontent-%COMP%] {\n  margin: var(--%NS%space-6) 0 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n.location-attribution[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--%NS%color-primary);\n}\n.address-results[_ngcontent-%COMP%] {\n  margin: var(--%NS%space-8) 0 0;\n  padding: 0;\n  list-style: none;\n}\n.address-results[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]    + li[_ngcontent-%COMP%] {\n  margin-top: var(--%NS%space-6);\n}\n.address-results[_ngcontent-%COMP%]   .address-result[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  gap: var(--%NS%space-4) var(--%NS%space-8);\n  width: 100%;\n  padding: var(--%NS%space-8) var(--%NS%space-12);\n  background: var(--%NS%color-bg-surface);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-md);\n  font-family: inherit;\n  font-size: var(--%NS%text-md);\n  line-height: 1.5;\n  color: var(--%NS%color-text);\n  text-align: left;\n  cursor: pointer;\n}\n.address-results[_ngcontent-%COMP%]   .address-result[_ngcontent-%COMP%]:hover {\n  background: var(--%NS%color-surface-hover);\n}\n.address-results[_ngcontent-%COMP%]   .address-result__type[_ngcontent-%COMP%] {\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n.location-actions[_ngcontent-%COMP%] {\n  margin-bottom: var(--%NS%space-10);\n}\n.location-readout[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-md);\n  font-variant-numeric: tabular-nums;\n  color: var(--%NS%color-text);\n}\n.location-readout--empty[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n}\n.location-hint[_ngcontent-%COMP%] {\n  margin: var(--%NS%space-6) 0 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n/*# sourceMappingURL=submit-shelter-page.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassMetadata(SubmitShelterPage, [{
    type: Component,
    args: [{ selector: "app-submit-shelter-page", imports: [ReactiveFormsModule, RouterLink, BannerComponent, LoadingIndicator, TranslatePipe], providers: [LeafletService], changeDetection: ChangeDetectionStrategy.OnPush, template: `<section class="submit-page">
  <a routerLink="/map" class="back-link">&larr; {{ 'submit.backToMap' | t }}</a>

  <header>
    @if (editMode()) {
      <!-- Edit mode (M5): the heading names the mode \u2014 this is a save of an
           existing shelter, not a new submission. 'account.edit' ('Edit') is
           the existing catalog key; a dedicated 'submit.editTitle' would be
           the better fit once the i18n lane lands it (reported, not added).
           The subtitle is create-mode copy ("Add \u2026") \u2014 hidden in edit. -->
      <h1 class="page-title">{{ 'account.edit' | t }}</h1>
    } @else {
      <h1 class="page-title">{{ 'submit.title' | t }}</h1>
      <p class="page-subtitle">{{ 'submit.subtitle' | t }}</p>
    }
  </header>

  <app-banner severity="error" [message]="error()" />

  <!-- Success panel (community-review-queue): the row is public NOW (NEW
       state) \u2014 no "awaiting review"; the panel links to the live detail
       page. The form stays for a second submission. In edit mode (M5) the
       same panel IS the save confirmation: the edit publishes immediately
       and carries the same NEW (pending-verification) state a new
       submission gets. -->
  @if (submitted(); as created) {
    <div class="submit-success" role="status">
      <p>{{ 'submit.successBody' | t }}</p>
      <p class="submit-success__links">
        <a [routerLink]="['/shelters', created.id]">{{ 'submit.success.viewLocation' | t }}</a>
        <a routerLink="/account">{{ 'submit.success.viewContributions' | t }}</a>
      </p>
    </div>
  }
  @if (verifyLink()) {
    <p class="verify-hint">
      {{ 'submit.verifyHint' | t }}
      <a routerLink="/verify">{{ 'submit.verifyHint.link' | t }}</a>
    </p>
  }

  <!-- Edit-mode states (M5): while the ?edit row loads; when the id is not
       the caller's (or the param is malformed) \u2014 the not-found state, never
       a prefill of someone else's shelter. (A /mine LOAD FAILURE renders
       neither \u2014 the error banner above carries the message and no form can
       PUT without the row's id.) -->
  @if (editMode() && editLoading()) {
    <app-loading-indicator class="submit-state" [message]="'account.contrib.loading' | t" />
  } @else if (editMode() && editMissing()) {
    <div class="edit-not-found" role="status">
      <h2 class="edit-not-found__title">{{ 'detail.notFoundTitle' | t }}</h2>
      <p>{{ 'detail.notFoundBody' | t }}</p>
      <p class="edit-not-found__links">
        <a routerLink="/account">{{ 'submit.success.viewContributions' | t }}</a>
      </p>
    </div>
  } @else if (showForm()) {
  <form class="submit-form" [formGroup]="form" (ngSubmit)="submit()">
    <div class="field">
      <label for="shelter-name">{{ 'submit.nameLabel' | t }}</label>
      <input
        id="shelter-name"
        type="text"
        formControlName="name"
        maxlength="200"
        [placeholder]="'submit.namePlaceholder' | t"
        autocomplete="off"
      />
      @if (name().touched && name().invalid) {
        <!-- 'maxlength' (lowercase) is Angular's MaxLengthValidator error key. -->
        <p class="field-error">
          {{
            name().errors?.['maxlength']
              ? ('submit.name.tooLong' | t)
              : ('submit.name.required' | t)
          }}
        </p>
      }
    </div>

    <div class="field">
      <label for="shelter-description">{{ 'submit.descriptionLabel' | t }}</label>
      <textarea
        id="shelter-description"
        formControlName="description"
        maxlength="2000"
        [placeholder]="'submit.descriptionPlaceholder' | t"
      ></textarea>
      @if (description().invalid && description().touched) {
        <p class="field-error">{{ 'submit.description.tooLong' | t }}</p>
      }
    </div>

    <div class="field">
      <label for="shelter-capacity">{{ 'submit.capacityLabel' | t }}</label>
      <input
        id="shelter-capacity"
        type="number"
        min="1"
        max="100000"
        step="1"
        formControlName="capacity"
        [placeholder]="'submit.capacityPlaceholder' | t"
      />
      <!-- The range is its OWN hint line (submit.capacityHint) so a narrow
           column can't break it mid-range (i18n-et-en); the label above is
           just "Capacity (optional)". Shared with the /account panel. -->
      <p class="field-note">{{ 'submit.capacityHint' | t }}</p>
      @if (capacity().invalid && capacity().touched) {
        <p class="field-error">{{ 'submit.capacity.invalid' | t }}</p>
      }
    </div>

    <!-- The private-home declaration (community-review-queue D7): default
         unchecked = PUBLIC. The row stays a public result; the declaration
         adds the "Private location" badge + the resident-offered note. -->
    <div class="field">
      <label class="checkbox-field" for="shelter-private">
        <input id="shelter-private" type="checkbox" formControlName="privateLocation" />
        {{ 'submit.privateLabel' | t }}
      </label>
    </div>

    <fieldset class="field location-field">
      <legend>{{ 'submit.locationLegend' | t }}</legend>
      <p class="field-note">{{ 'submit.locationNote' | t }}</p>
      <div #mapEl class="submit-map"></div>

      <div class="location-smart">
        <label class="location-label" for="shelter-location-input">{{
          'submit.locationLabel' | t
        }}</label>
        <div class="location-smart-row">
          <input
            id="shelter-location-input"
            type="text"
            [value]="locationText()"
            (input)="onLocationTextChange($event)"
            (keydown.enter)="onLocationSubmitKey($event)"
            [placeholder]="'submit.locationPlaceholder' | t"
            autocomplete="off"
            [disabled]="resolvingLink() || locating()"
          />
          <button
            type="button"
            class="btn"
            (click)="applyLocationInput()"
            [disabled]="resolvingLink() || locating()"
          >
            {{ resolvingLink() ? ('submit.location.resolving' | t) : ('submit.location.set' | t) }}
          </button>
        </div>
        <p class="location-note">
          {{ 'submit.location.prefillNote' | t }}
        </p>
      </div>

      <div class="location-search">
        <label class="location-label" for="shelter-address-search">{{
          'submit.addressLabel' | t
        }}</label>
        <div class="location-search-row">
          <input
            id="shelter-address-search"
            type="text"
            [value]="addressQuery()"
            (input)="onAddressQueryChange($event)"
            (keydown.enter)="onAddressSearchKey($event)"
            [placeholder]="'submit.addressPlaceholder' | t"
            autocomplete="off"
            [disabled]="searching()"
          />
          <button type="button" class="btn" (click)="startAddressSearch()" [disabled]="searching()">
            {{ searching() ? ('submit.searching' | t) : ('submit.search' | t) }}
          </button>
        </div>
        <p class="location-attribution">
          {{ 'submit.attributionLead' | t }}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">{{
            'submit.osmAttribution' | t
          }}</a>
        </p>
        @if (addressResults().length !== 0) {
          <ul class="address-results">
            @for (result of addressResults(); track result.displayName) {
              <li>
                <button type="button" class="address-result" (click)="selectAddressResult(result)">
                  <span class="address-result__name">{{ result.displayName }}</span>
                  <span class="address-result__type">{{ result.type }}</span>
                </button>
              </li>
            }
          </ul>
        }
        @if (addressErrorText(); as addressErrorMsg) {
          @if (addressError() === 'no-results') {
            <p class="location-note">{{ addressErrorMsg }}</p>
          } @else {
            <p class="field-error" role="alert">{{ addressErrorMsg }}</p>
          }
        }
      </div>

      <div class="location-actions">
        <button
          type="button"
          class="btn"
          (click)="useMyLocation()"
          [disabled]="locating() || resolvingLink()"
        >
          {{ locating() ? ('submit.locating' | t) : ('submit.useMyLocation' | t) }}
        </button>
      </div>

      <!-- D6 (map-crisis-actions): the shared .num-tabular class keeps the
           coordinate figures from shifting while they update. -->
      <p class="location-readout num-tabular" [class.location-readout--empty]="location() === null">
        {{ locationReadout() }}
      </p>
      @if (locationHint(); as locationHintText) {
        <p class="location-hint">{{ locationHintText }}</p>
      }
      @if (locationErrorText(); as locationErrorMsg) {
        <p class="field-error" role="alert">{{ locationErrorMsg }}</p>
      }
    </fieldset>

    <!-- The submit button: create mode says "Submit shelter" (a new row);
         edit mode (M5) says "Save changes" \u2014 this is a save, not a new
         submission. The pending copy matches the mode ('Saving\u2026'). -->
    <button type="submit" class="btn btn--primary" [disabled]="pending() || editLoading()">
      {{
        pending()
          ? (editMode() ? ('account.saving' | t) : ('submit.submitting' | t))
          : (editMode() ? ('account.save' | t) : ('submit.submit' | t))
      }}
    </button>
  </form>
  }
</section>
`, styles: ['@charset "UTF-8";\n\n/* src/app/features/shelter/submit-shelter-page.scss */\n.submit-page {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-20);\n  max-width: 44rem;\n}\n.back-link {\n  align-self: flex-start;\n  color: var(--color-primary);\n  text-decoration: none;\n  font-size: var(--text-md);\n}\n.back-link:hover {\n  text-decoration: underline;\n}\n.verify-hint {\n  margin: 0;\n  font-size: var(--text-md);\n  color: var(--color-muted);\n}\n.verify-hint a {\n  color: var(--color-primary);\n}\n.submit-form {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-4);\n}\n.submit-form .btn {\n  align-self: flex-start;\n}\n.checkbox-field {\n  display: flex;\n  align-items: center;\n  gap: var(--space-8);\n  font-size: var(--text-base);\n  cursor: pointer;\n}\n.checkbox-field input {\n  margin: 0;\n  width: 18px;\n  height: 18px;\n  flex-shrink: 0;\n  accent-color: var(--color-primary);\n}\n.submit-success {\n  padding: var(--space-12) var(--space-16);\n  background: var(--color-success-bg);\n  border: 1px solid var(--color-success-border);\n  border-radius: var(--radius-md);\n  color: var(--color-text);\n  font-size: var(--text-base);\n}\n.submit-success p {\n  margin: 0;\n}\n.submit-success__links {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-4) var(--space-16);\n  margin-top: var(--space-8);\n}\n.submit-state {\n  margin: 0;\n  font-size: var(--text-base);\n  color: var(--color-muted);\n}\n.edit-not-found {\n  padding: var(--space-12) var(--space-16);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-md);\n  font-size: var(--text-base);\n}\n.edit-not-found p {\n  margin: 0;\n}\n.edit-not-found__title {\n  margin: 0 0 var(--space-8);\n  font-size: var(--text-lg);\n  font-weight: var(--font-weight-medium);\n}\n.edit-not-found__links {\n  margin-top: var(--space-8);\n}\n.edit-not-found__links a {\n  color: var(--color-primary);\n}\n.location-field {\n  margin: 0;\n  padding: var(--space-12) var(--space-14) var(--space-14);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n}\n.location-field legend {\n  font-size: var(--text-md);\n  font-weight: var(--font-weight-medium);\n  padding: 0 var(--space-6);\n}\n.field-note {\n  margin: 0 0 var(--space-8);\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n.submit-map {\n  height: 260px;\n  border-radius: var(--radius-lg);\n  border: 1px solid var(--color-border);\n  margin-bottom: var(--space-10);\n}\n.location-smart {\n  margin-bottom: var(--space-10);\n}\n.location-smart .location-label {\n  display: block;\n  font-size: var(--text-md);\n  font-weight: var(--font-weight-medium);\n  margin-bottom: var(--space-6);\n}\n.location-smart .location-smart-row {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-10);\n}\n.location-smart .location-smart-row input {\n  flex: 1 1 200px;\n  padding: var(--space-8) var(--space-12);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-md);\n  font-size: var(--text-md);\n}\n.location-note {\n  margin: var(--space-6) 0 0;\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n.location-search {\n  margin-bottom: var(--space-10);\n}\n.location-search .location-label {\n  display: block;\n  font-size: var(--text-md);\n  font-weight: var(--font-weight-medium);\n  margin-bottom: var(--space-6);\n}\n.location-search .location-search-row {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-10);\n}\n.location-search .location-search-row input {\n  flex: 1 1 200px;\n  padding: var(--space-8) var(--space-12);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-md);\n  font-size: var(--text-md);\n}\n.location-attribution {\n  margin: var(--space-6) 0 0;\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n.location-attribution a {\n  color: var(--color-primary);\n}\n.address-results {\n  margin: var(--space-8) 0 0;\n  padding: 0;\n  list-style: none;\n}\n.address-results li + li {\n  margin-top: var(--space-6);\n}\n.address-results .address-result {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  gap: var(--space-4) var(--space-8);\n  width: 100%;\n  padding: var(--space-8) var(--space-12);\n  background: var(--color-bg-surface);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-md);\n  font-family: inherit;\n  font-size: var(--text-md);\n  line-height: 1.5;\n  color: var(--color-text);\n  text-align: left;\n  cursor: pointer;\n}\n.address-results .address-result:hover {\n  background: var(--color-surface-hover);\n}\n.address-results .address-result__type {\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n.location-actions {\n  margin-bottom: var(--space-10);\n}\n.location-readout {\n  margin: 0;\n  font-size: var(--text-md);\n  font-variant-numeric: tabular-nums;\n  color: var(--color-text);\n}\n.location-readout--empty {\n  color: var(--color-muted);\n}\n.location-hint {\n  margin: var(--space-6) 0 0;\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n/*# sourceMappingURL=submit-shelter-page.css.map */\n'] }]
  }], null, { mapEl: [{ type: i02.ViewChild, args: ["mapEl", { isSignal: true }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassDebugInfo(SubmitShelterPage, { className: "SubmitShelterPage", filePath: "src/app/features/shelter/submit-shelter-page.ts", lineNumber: 146 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Fshelter%2Fsubmit-shelter-page.ts%40SubmitShelterPage";
  function SubmitShelterPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i02.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i02.\u0275\u0275replaceMetadata(SubmitShelterPage, m.default, [i02, i1], [LeafletService, ReactiveFormsModule, RouterLink, BannerComponent, LoadingIndicator, TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && SubmitShelterPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && SubmitShelterPage_HmrLoad(d.timestamp)));
})();
export {
  SubmitShelterPage
};
//# debugId=ca51a49c-8aea-53d2-afb2-a744319df7ab


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZmVhdHVyZXMvc2hlbHRlci9zdWJtaXQtc2hlbHRlci1wYWdlLnRzIiwic3JjL2FwcC9mZWF0dXJlcy9zaGVsdGVyL3N1Ym1pdC1zaGVsdGVyLXBhZ2UuaHRtbCIsInNyYy9hcHAvZ2F0ZXdheXMvZ2VvLWdhdGV3YXkudHMiLCJzcmMvYXBwL3NoYXJlZC9sb2NhdGlvbi1pbnB1dC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICB0eXBlIEFmdGVyVmlld0luaXQsXG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDb21wb25lbnQsXG4gIHR5cGUgRWxlbWVudFJlZixcbiAgaW5qZWN0LFxuICB0eXBlIE9uRGVzdHJveSxcbiAgdHlwZSBPbkluaXQsXG4gIHNpZ25hbCxcbiAgdmlld0NoaWxkLFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEZvcm1Db250cm9sLCBGb3JtR3JvdXAsIFJlYWN0aXZlRm9ybXNNb2R1bGUsIFZhbGlkYXRvcnMgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQgeyBBY3RpdmF0ZWRSb3V0ZSwgUm91dGVyTGluayB9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5pbXBvcnQgeyB0b0FwaUVycm9yIH0gZnJvbSAnLi4vLi4vY29yZS9hcGktZXJyb3InO1xuaW1wb3J0IHsgSTE4blNlcnZpY2UgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJztcbmltcG9ydCB0eXBlIHsgTWVzc2FnZUtleSB9IGZyb20gJy4uLy4uL2NvcmUvaTE4bi9tZXNzYWdlcyc7XG5pbXBvcnQgeyBUcmFuc2xhdGVQaXBlIH0gZnJvbSAnLi4vLi4vY29yZS9pMThuL3RyYW5zbGF0ZS1waXBlJztcbmltcG9ydCB0eXBlIHsgQ3JlYXRlU2hlbHRlclJlcXVlc3QsIEdlb2NvZGVSZXN1bHQsIE1pbmVTaGVsdGVyRHRvLCBTaGVsdGVyRHRvIH0gZnJvbSAnLi4vLi4vY29yZS9tb2RlbHMnO1xuaW1wb3J0IHsgR2VvY29kZUdhdGV3YXkgfSBmcm9tICcuLi8uLi9nYXRld2F5cy9nZW9jb2RlLWdhdGV3YXknO1xuaW1wb3J0IHsgR2VvR2F0ZXdheSB9IGZyb20gJy4uLy4uL2dhdGV3YXlzL2dlby1nYXRld2F5JztcbmltcG9ydCB7IFNoZWx0ZXJHYXRld2F5IH0gZnJvbSAnLi4vLi4vZ2F0ZXdheXMvc2hlbHRlci1nYXRld2F5JztcbmltcG9ydCB7IGJhbm5lck1lc3NhZ2UgfSBmcm9tICcuLi8uLi9zaGFyZWQvZXJyb3ItY29weSc7XG5pbXBvcnQgeyBjYXBhY2l0eVZhbGlkYXRvciwgbmFtZUJsYW5rVmFsaWRhdG9yIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Zvcm0taGVscGVycyc7XG5pbXBvcnQge1xuICBpc0dvb1Nob3J0TGluayxcbiAgbm9ybWFsaXplU2hvcnRMaW5rVXJsLFxuICBwYXJzZUxvY2F0aW9uSW5wdXQsXG59IGZyb20gJy4uLy4uL3NoYXJlZC9sb2NhdGlvbi1pbnB1dCc7XG5pbXBvcnQgeyBFU1RPTklBX0NFTlRFUiwgRVNUT05JQV9aT09NLCBMZWFmbGV0U2VydmljZSB9IGZyb20gJy4uLy4uL3NoYXJlZC9sZWFmbGV0LXNlcnZpY2UnO1xuaW1wb3J0IHsgQmFubmVyQ29tcG9uZW50IH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Jhbm5lci5jb21wb25lbnQnO1xuaW1wb3J0IHsgTG9hZGluZ0luZGljYXRvciB9IGZyb20gJy4uLy4uL3NoYXJlZC9sb2FkaW5nLWluZGljYXRvcic7XG5cbi8qKiBXaGljaCBjYXB0dXJlIG1vZGUgbGFzdCB3cm90ZSB0aGUgc2hhcmVkIGxvY2F0aW9uIHN0YXRlIChkZXNpZ24gZGVjaXNpb24gMSkuXG4gKiAgJ3NhdmVkJyBpcyB0aGUgZWRpdC1tb2RlIHByZWZpbGwgKE01KTogdGhlIHBpbiBjb21lcyBmcm9tIHRoZSByb3cgYmVpbmdcbiAqICBlZGl0ZWQsIG5vdCBmcm9tIGEgY2FwdHVyZSDigJQgaXQgcmVuZGVycyBubyBcIkxvY2F0aW9uIGZyb20g4oCmXCIgaGludC4gKi9cbnR5cGUgTG9jYXRpb25Tb3VyY2UgPSAndHlwZWQnIHwgJ2xpbmsnIHwgJ2dlb2xvY2F0aW9uJyB8ICdtYXAtcGljaycgfCAnYWRkcmVzcy1zZWFyY2gnIHwgJ3NhdmVkJztcblxuLyoqIFRoZSBPTkUgc2hhcmVkIGxvY2F0aW9uIHN0YXRlOiBldmVyeSBjYXB0dXJlIG1vZGUgd3JpdGVzIGl0LCB0aGUgbWFwIG1hcmtlciArIHJlYWQtb25seSByZWFkb3V0IHJlYWQgaXQuICovXG5pbnRlcmZhY2UgUGlja2VkTG9jYXRpb24ge1xuICBsYXRpdHVkZTogbnVtYmVyO1xuICBsb25naXR1ZGU6IG51bWJlcjtcbiAgc291cmNlOiBMb2NhdGlvblNvdXJjZTtcbiAgLyoqIFRoZSBwYXJzZXIgZGV0ZWN0ZWQgKGxuZywgbGF0KSBhbmQgYXV0by1zd2FwcGVkIHRvIChsYXQsIGxuZykuICovXG4gIHN3YXBwZWQ6IGJvb2xlYW47XG4gIC8qKiBHZW9sb2NhdGlvbiBhY2N1cmFjeSBpbiBtZXRlcnMgKGdlb2xvY2F0aW9uIHNvdXJjZSBvbmx5KS4gKi9cbiAgYWNjdXJhY3lNOiBudW1iZXIgfCBudWxsO1xufVxuXG4vKiogVGhlIHBlci1yZWFzb24gaW5saW5lIGVycm9ycyBvZiB0aGUgbG9jYXRpb24gc2VjdGlvbiAoZGVzaWduIGRlY2lzaW9uIDUgKyBzcGVjKS4gKi9cbnR5cGUgTG9jYXRpb25FcnJvcktpbmQgPVxuICB8ICdtaXNzaW5nJ1xuICB8ICduby1wYWlyJ1xuICB8ICdvdXQtb2YtYm91bmRzJ1xuICB8ICdpbnZhbGlkJ1xuICB8ICdkZWNpbWFsLWNvbW1hJ1xuICB8ICdnZW8tZGVuaWVkJ1xuICB8ICdnZW8tdW5hdmFpbGFibGUnXG4gIHwgJ2dlby10aW1lb3V0J1xuICB8ICdnZW8taW5zZWN1cmUnXG4gIHwgJ3Nob3J0LWxpbmstZmFpbGVkJ1xuICB8ICdzaG9ydC1saW5rLXJhdGUtbGltaXRlZCdcbiAgfCAnc2hvcnQtbGluay11bmF2YWlsYWJsZSc7XG5cbi8qKiBPbmUgY29weSBwZXIgZmFpbHVyZSByZWFzb24g4oCUIHJlbmRlcmVkIGlubGluZSBpbiB0aGUgbG9jYXRpb24gZmllbGRzZXQuICovXG5jb25zdCBMT0NBVElPTl9FUlJPUl9LRVk6IFJlY29yZDxMb2NhdGlvbkVycm9yS2luZCwgTWVzc2FnZUtleT4gPSB7XG4gIG1pc3Npbmc6ICdzdWJtaXQubG9jLm1pc3NpbmcnLFxuICAnbm8tcGFpcic6ICdzdWJtaXQubG9jLm5vUGFpcicsXG4gICdvdXQtb2YtYm91bmRzJzogJ3N1Ym1pdC5sb2Mub3V0T2ZCb3VuZHMnLFxuICBpbnZhbGlkOiAnc3VibWl0LmxvYy5pbnZhbGlkJyxcbiAgJ2RlY2ltYWwtY29tbWEnOiAnc3VibWl0LmxvYy5kZWNpbWFsQ29tbWEnLFxuICAnZ2VvLWRlbmllZCc6ICdzdWJtaXQubG9jLmdlb0RlbmllZCcsXG4gICdnZW8tdW5hdmFpbGFibGUnOiAnc3VibWl0LmxvYy5nZW9VbmF2YWlsYWJsZScsXG4gICdnZW8tdGltZW91dCc6ICdzdWJtaXQubG9jLmdlb1RpbWVvdXQnLFxuICAnZ2VvLWluc2VjdXJlJzogJ3N1Ym1pdC5sb2MuZ2VvSW5zZWN1cmUnLFxuICAnc2hvcnQtbGluay1mYWlsZWQnOiAnc3VibWl0LmxvYy5zaG9ydExpbmtGYWlsZWQnLFxuICAnc2hvcnQtbGluay1yYXRlLWxpbWl0ZWQnOiAnc3VibWl0LmxvYy5zaG9ydExpbmtSYXRlTGltaXRlZCcsXG4gICdzaG9ydC1saW5rLXVuYXZhaWxhYmxlJzogJ3N1Ym1pdC5sb2Muc2hvcnRMaW5rVW5hdmFpbGFibGUnLFxufTtcblxuLyoqIFRoZSBwcmVmaWxsICgnc2F2ZWQnKSBuYW1lcyBubyBjYXB0dXJlIG1vZGUg4oCUIHRoZSBoaW50IGxpbmUgc3RheXMgb2ZmLlxuICogIFRoZSBmaXZlIHJlYWwgY2FwdHVyZXMga2VlcCB0aGVpciBwZXItc291cmNlIGNvcHkuICovXG5jb25zdCBTT1VSQ0VfS0VZOiBSZWNvcmQ8RXhjbHVkZTxMb2NhdGlvblNvdXJjZSwgJ3NhdmVkJz4sIE1lc3NhZ2VLZXk+ID0ge1xuICB0eXBlZDogJ3N1Ym1pdC5oaW50LnNvdXJjZS50eXBlZCcsXG4gIGxpbms6ICdzdWJtaXQuaGludC5zb3VyY2UubGluaycsXG4gIGdlb2xvY2F0aW9uOiAnc3VibWl0LmhpbnQuc291cmNlLmdlb2xvY2F0aW9uJyxcbiAgJ21hcC1waWNrJzogJ3N1Ym1pdC5oaW50LnNvdXJjZS5tYXAnLFxuICAnYWRkcmVzcy1zZWFyY2gnOiAnc3VibWl0LmhpbnQuc291cmNlLmFkZHJlc3MnLFxufTtcblxuLyoqIFRoZSBpbmxpbmUgc3RhdGVzIG9mIHRoZSBhZGRyZXNzIHNlYXJjaCAoc2hlbHRlci1hZGRyZXNzLXNlYXJjaCkuIEEgc2VhcmNoXG4gKiBmYWlsdXJlIE5FVkVSIHRvdWNoZXMgdGhlIGxvY2F0aW9uIHN0YXRlIChubyBwaW4gY2hhbmdlKSBhbmQgbmV2ZXIgYmxvY2tzXG4gKiBmb3JtIHN1Ym1pc3Npb24g4oCUIHNlYXJjaCBpcyBhbiBvcHRpb25hbCBjYXB0dXJlIG1vZGUsIG5vdCBhIGdhdGUuICovXG50eXBlIEdlb2NvZGVFcnJvcktpbmQgPSAnbm8tcmVzdWx0cycgfCAncmF0ZS1saW1pdGVkJyB8ICduZXR3b3JrJztcblxuY29uc3QgR0VPQ09ERV9FUlJPUl9LRVk6IFJlY29yZDxHZW9jb2RlRXJyb3JLaW5kLCBNZXNzYWdlS2V5PiA9IHtcbiAgJ25vLXJlc3VsdHMnOiAnc3VibWl0Lmdlb2NvZGUubm9SZXN1bHRzJyxcbiAgJ3JhdGUtbGltaXRlZCc6ICdzdWJtaXQuZ2VvY29kZS5yYXRlTGltaXRlZCcsXG4gIG5ldHdvcms6ICdzdWJtaXQuZ2VvY29kZS5uZXR3b3JrJyxcbn07XG5cbi8qKlxuICogL3N1Ym1pdCAoQXV0aEd1YXJkICsgVmVyaWZpZWRHdWFyZCkg4oCUIHZlcmlmaWVkLXVzZXIgc2hlbHRlciBzdWJtaXNzaW9uXG4gKiAoMDUtc2hlbHRlci1yZXZpZXctZmxvdy5wdW1sLCBzaGVsdGVyLWxvY2F0aW9uLWlucHV0KS4gTmFtZSAo4omkMjAwKSxcbiAqIG9wdGlvbmFsIGRlc2NyaXB0aW9uICjiiaQyMDAwKSwgb3B0aW9uYWwgY2FwYWNpdHkgKDHigJMxMDAgMDAwKSwgdGhlXG4gKiBwcml2YXRlLWhvbWUgZGVjbGFyYXRpb24gKGNvbW11bml0eS1yZXZpZXctcXVldWUgRDc6IGxvY2F0aW9uS2luZCksIGFuZFxuICogYSBsb2NhdGlvbiBjYXB0dXJlZCBmaXZlIHdheXMg4oCUIHNtYXJ0IHRleHQgaW5wdXQgKGNvb3JkaW5hdGUgc3RyaW5nIC9cbiAqIGxvbmctZm9ybSBtYXAgVVJMLCBwYXJzZWQgYnkgc2hhcmVkL2xvY2F0aW9uLWlucHV0LnRzKSwgXCJVc2UgbXkgbG9jYXRpb25cIlxuICogKGJyb3dzZXIgZ2VvbG9jYXRpb24pLCBtYXBzLmFwcC5nb28uZ2wgc2hvcnQgbGlua3MgKFBPU1QgL2FwaS9nZW8vcmVzb2x2ZSksXG4gKiBhbiBFc3RvbmlhIGFkZHJlc3Mgc2VhcmNoIChjbGllbnQtc2lkZSBPU00gTm9taW5hdGltIHZpYSBHZW9jb2RlR2F0ZXdheSDigJRcbiAqIGJ1dHRvbi9FbnRlciBzdWJtaXQsIG5vIGF1dG9zdWdnZXN0OyB0aGUgb25seSBjbGllbnQtc2lkZSBleHRlcm5hbCBjYWxsKSxcbiAqIGFuZCB0aGUgbWluaS1tYXAgY2xpY2svZHJhZyDigJQgYWxsIHdyaXRpbmcgT05FIHNoYXJlZCBsb2NhdGlvbiBzaWduYWxcbiAqIChkZXNpZ24gZGVjaXNpb24gMSkuIFJlc29sdmVkIGNvb3JkaW5hdGVzIGFyZSBkaXNwbGF5ZWQgcmVhZC1vbmx5LlxuICpcbiAqIE9uIDIwMSB0aGUgcm93IGlzIFBVQkxJQyBJTU1FRElBVEVMWSBhcyBORVcgKGNvbW11bml0eS1yZXZpZXctcXVldWUg4oCUXG4gKiBubyBibG9ja2luZyBxdWV1ZSk6IHRoZSBwYWdlIFNUQVlTIG9uIC9zdWJtaXQgd2l0aCBhIHN1Y2Nlc3MgcGFuZWxcbiAqIChcImxpc3RlZCBub3csIG1hcmtlZCBhcyBuZXdseSBhZGRlZCwgY29tbXVuaXR5IHJlcG9ydHMgY29uZmlybSBpdFwiKVxuICogbGlua2luZyB0byB0aGUgKGFscmVhZHkgcHVibGljKSBkZXRhaWwgcGFnZS4gT24gNDAxLzQwMy80MDAgdGhlXG4gKiBiYWNrZW5kIG1lc3NhZ2Ugc2hvd3MgdGhyb3VnaCB0aGUgYmFubmVyICg0MDMgYWRkcyBhIC92ZXJpZnkgbGluayDigJQgdGhlXG4gKiBjbGFpbSBjYW4gbGFwc2UgbWlkLXNlc3Npb24pIGFuZCB0aGUgZm9ybSBpbnB1dCBpcyBwcmVzZXJ2ZWQuXG4gKlxuICogRURJVCBNT0RFIChNNSwgc2hlbHRlci1lZGl0aW5nIHJldXNlcyB0aGUgYWRkIGZvcm0pOiAvc3VibWl0P2VkaXQ9PGlkPlxuICogcmVuZGVycyB0aGlzIFNBTUUgZm9ybSAoc2FtZSBmaWVsZHMsIHNhbWUgY2FwdHVyZSBtb2RlcykgcHJlZmlsbGVkIHdpdGhcbiAqIHRoZSByb3cncyBjdXJyZW50IHZhbHVlcy4gVGhlIHJvdyBpcyBmZXRjaGVkIGZyb20gR0VUIC9hcGkvc2hlbHRlcnMvbWluZVxuICogKG93bmVyLXNjb3BlZCwgQUxMIHN0YXR1c2VzKSDigJQgYW4gaWQgdGhhdCBpcyBub3QgdGhlIGNhbGxlcidzLCBvciBhXG4gKiBtYWxmb3JtZWQgcGFyYW0sIHJlbmRlcnMgdGhlIG5vdC1mb3VuZCBzdGF0ZSwgbmV2ZXIgc29tZW9uZSBlbHNlJ3NcbiAqIGRhdGEuIFRoZSBoZWFkaW5nICsgc3VibWl0IGJ1dHRvbiBjYXJyeSB0aGUgZWRpdC9zYXZlIGNvcHlcbiAqICgnYWNjb3VudC5lZGl0JyAvICdhY2NvdW50LnNhdmUnIOKAlCB0aGUgY2F0YWxvZyBoYXMgbm8gc3VibWl0LXNjb3BlZCBlZGl0XG4gKiBoZWFkaW5nIHlldDsgJ2FjY291bnQuZWRpdCcgaXMgdGhlIGV4aXN0aW5nIGtleSB0aGF0IHNheXMgXCJ0aGlzIGlzIGFuXG4gKiBlZGl0XCIpLiBTYXZlIGlzIFBVVCAvYXBpL3NoZWx0ZXJzL3tpZH0gd2l0aCB0aGUgc2FtZSBwYXlsb2FkIHNoYXBlIGFzXG4gKiBjcmVhdGUgKGxvY2F0aW9uS2luZCBleHBsaWNpdCkuIFRoZSBlZGl0IFBVQkxJU0hFUyBJTU1FRElBVEVMWSDigJQgdGhlXG4gKiBiYWNrZW5kIGtlZXBzIHRoZSByb3cncyBzdGF0dXMgKGFuIGVkaXQgbmV2ZXIgdW5wdWJsaXNoZXMgb3IgcmVtb3ZlcyBpdFxuICogZnJvbSB0aGUgbWFwKSDigJQgYW5kIHBlciB0aGUgb3duZXIncyBNNSBkZWNpc2lvbiB0aGUgc2hlbHRlciB0aGVuIGNhcnJpZXNcbiAqIHRoZSBzYW1lIHBlbmRpbmctdmVyaWZpY2F0aW9uIChORVcpIHRydXN0IHN0YXRlIGEgbmV3bHkgYWRkZWQgc2hlbHRlclxuICogZ2V0cyB1bnRpbCBpdCBpcyBjb25maXJtZWQgYWdhaW46IGEgU1RBVFVTLCBub3QgYSBnYXRlIGluIGZyb250IG9mIHRoZVxuICogZWRpdC4gVGhlIGFjY291bnQgYXJlYSBubyBsb25nZXIgaG9zdHMgaXRzIG93biByZWR1Y2VkIGVkaXQgZm9ybSDigJQgaXRzXG4gKiBFZGl0IGVudHJ5IG9wZW5zIHRoaXMgcm91dGUuXG4gKi9cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FwcC1zdWJtaXQtc2hlbHRlci1wYWdlJyxcbiAgaW1wb3J0czogW1JlYWN0aXZlRm9ybXNNb2R1bGUsIFJvdXRlckxpbmssIEJhbm5lckNvbXBvbmVudCwgTG9hZGluZ0luZGljYXRvciwgVHJhbnNsYXRlUGlwZV0sXG4gIHByb3ZpZGVyczogW0xlYWZsZXRTZXJ2aWNlXSxcbiAgdGVtcGxhdGVVcmw6ICcuL3N1Ym1pdC1zaGVsdGVyLXBhZ2UuaHRtbCcsXG4gIHN0eWxlVXJsOiAnLi9zdWJtaXQtc2hlbHRlci1wYWdlLnNjc3MnLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbn0pXG5leHBvcnQgY2xhc3MgU3VibWl0U2hlbHRlclBhZ2UgaW1wbGVtZW50cyBPbkluaXQsIEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgZ2F0ZXdheSA9IGluamVjdChTaGVsdGVyR2F0ZXdheSk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZ2VvID0gaW5qZWN0KEdlb0dhdGV3YXkpO1xuICBwcml2YXRlIHJlYWRvbmx5IGdlb2NvZGUgPSBpbmplY3QoR2VvY29kZUdhdGV3YXkpO1xuICBwcml2YXRlIHJlYWRvbmx5IGxlYWZsZXQgPSBpbmplY3QoTGVhZmxldFNlcnZpY2UpO1xuICAvKiogUmVzb2x2ZXMgdGhlIGxvY2F0aW9uIGNhcHR1cmUgY29weSAoaTE4bi1ldC1lbikuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgaTE4biA9IGluamVjdChJMThuU2VydmljZSk7XG4gIC8qKiBUaGUgYWN0aXZlIHJvdXRlOiAvc3VibWl0P2VkaXQ9PGlkPiBvcGVucyB0aGUgZm9ybSBpbiBlZGl0IG1vZGUgKE01KS4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSByb3V0ZSA9IGluamVjdChBY3RpdmF0ZWRSb3V0ZSk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBtYXBFbCA9IHZpZXdDaGlsZDxFbGVtZW50UmVmPEhUTUxFbGVtZW50Pj4oJ21hcEVsJyk7XG5cbiAgcmVhZG9ubHkgZm9ybSA9IG5ldyBGb3JtR3JvdXAoe1xuICAgIG5hbWU6IG5ldyBGb3JtQ29udHJvbCgnJywge1xuICAgICAgbm9uTnVsbGFibGU6IHRydWUsXG4gICAgICB2YWxpZGF0b3JzOiBbXG4gICAgICAgIFZhbGlkYXRvcnMucmVxdWlyZWQsXG4gICAgICAgIFZhbGlkYXRvcnMubWF4TGVuZ3RoKDIwMCksXG4gICAgICAgIC8vIFdoaXRlc3BhY2Utb25seSBuYW1lcyBwYXNzIFZhbGlkYXRvcnMucmVxdWlyZWQg4oCUIG1pcnJvciB0aGVcbiAgICAgICAgLy8gYmFja2VuZCBATm90Qmxhbmsgc28gd2UgbmV2ZXIgUE9TVCBcIiAgIFwiLlxuICAgICAgICBuYW1lQmxhbmtWYWxpZGF0b3IsXG4gICAgICBdLFxuICAgIH0pLFxuICAgIGRlc2NyaXB0aW9uOiBuZXcgRm9ybUNvbnRyb2woJycsIHtcbiAgICAgIG5vbk51bGxhYmxlOiB0cnVlLFxuICAgICAgdmFsaWRhdG9yczogW1ZhbGlkYXRvcnMubWF4TGVuZ3RoKDIwMDApXSxcbiAgICB9KSxcbiAgICBjYXBhY2l0eTogbmV3IEZvcm1Db250cm9sPG51bWJlciB8IG51bGw+KG51bGwsIHsgdmFsaWRhdG9yczogW2NhcGFjaXR5VmFsaWRhdG9yXSB9KSxcbiAgICAvLyBUaGUgcHJpdmF0ZS1ob21lIGRlY2xhcmF0aW9uIChjb21tdW5pdHktcmV2aWV3LXF1ZXVlIEQ3KTogbWFwcyB0byB0aGVcbiAgICAvLyBwYXlsb2FkJ3MgbG9jYXRpb25LaW5kIChQUklWQVRFIHdoZW4gY2hlY2tlZCwgUFVCTElDIGJ5IGRlZmF1bHQpLlxuICAgIHByaXZhdGVMb2NhdGlvbjogbmV3IEZvcm1Db250cm9sKGZhbHNlLCB7IG5vbk51bGxhYmxlOiB0cnVlIH0pLFxuICB9KTtcblxuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcGVuZGluZyA9IHNpZ25hbChmYWxzZSk7XG4gIHByb3RlY3RlZCByZWFkb25seSBlcnJvciA9IHNpZ25hbDxzdHJpbmcgfCBudWxsPihudWxsKTtcbiAgLyoqIFRydWUgd2hlbiB0aGUgbGFzdCBmYWlsdXJlIHdhcyBhIDQwMyDigJQgb2ZmZXIgdGhlIC92ZXJpZnkgcGF0aC4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHZlcmlmeUxpbmsgPSBzaWduYWwoZmFsc2UpO1xuICAvKiogVGhlIGNyZWF0ZWQgcm93IChjb21tdW5pdHktcmV2aWV3LXF1ZXVlKTogc2V0IG9uIDIwMSDigJQgdGhlIHJvdyBpc1xuICAgKiAgcHVibGljIGltbWVkaWF0ZWx5IGFzIE5FVywgc28gdGhlIHN1Y2Nlc3MgcGFuZWwgbGlua3MgdG8gdGhlIGRldGFpbFxuICAgKiAgcGFnZSBpbnN0ZWFkIG9mIG5hdmlnYXRpbmcgdGhlcmUgKHRoZSBmb3JtIHN0YXlzIGZvciBhIHNlY29uZFxuICAgKiAgc3VibWlzc2lvbikuIEluIGVkaXQgbW9kZSAoTTUpIGl0IGlzIHRoZSBVUERBVEVEIHJvdyDigJQgdGhlIHNhbWUgcGFuZWxcbiAgICogIGlzIHRoZSBzYXZlIGNvbmZpcm1hdGlvbiAodGhlIGVkaXQgcHVibGlzaGVzIGltbWVkaWF0ZWx5IHdpdGggdGhlXG4gICAqICBORVcgcGVuZGluZy12ZXJpZmljYXRpb24gc3RhdGUpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc3VibWl0dGVkID0gc2lnbmFsPFNoZWx0ZXJEdG8gfCBudWxsPihudWxsKTtcblxuICAvLyAtLS0tIGVkaXQgbW9kZSAoTTU6IGVkaXRpbmcgcmV1c2VzIHRoaXMgZm9ybSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiogVHJ1ZSB3aGlsZSAvc3VibWl0P2VkaXQ9PGlkPiDigJQgdGhlIGhlYWRpbmcgKyBzdWJtaXQgYnV0dG9uIGNhcnJ5IHRoZVxuICAgKiAgZWRpdC9zYXZlIGNvcHkuIENyZWF0aW9uIGlzIHRoaXMgc2FtZSBmb3JtIFdJVEhPVVQgdGhlIHBhcmFtIOKAlCB0aGVcbiAgICogIC9zdWJtaXQgcGF0aCBpcyB1bmNoYW5nZWQuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBlZGl0TW9kZSA9IHNpZ25hbChmYWxzZSk7XG4gIC8qKiBUcnVlIHdoaWxlIHRoZSA/ZWRpdCByb3cgaXMgYmVpbmcgbG9hZGVkIGZyb20gL21pbmUuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBlZGl0TG9hZGluZyA9IHNpZ25hbChmYWxzZSk7XG4gIC8qKiBUaGUgcGFyYW0gaXMgbWFsZm9ybWVkLCBvciB0aGUgaWQgaXMgbm90IHRoZSBjYWxsZXIncyByb3cgKGFic2VudFxuICAgKiAgZnJvbSAvbWluZSk6IHRoZSBub3QtZm91bmQgc3RhdGUgcmVuZGVycyBpbnN0ZWFkIG9mIHRoZSBmb3JtLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgZWRpdE1pc3NpbmcgPSBzaWduYWwoZmFsc2UpO1xuICAvKiogVGhlIGlkIG9mIHRoZSByb3cgYmVpbmcgZWRpdGVkIOKAlCBzZXQgb25jZSB0aGUgL21pbmUgcm93IGlzIGZvdW5kLlxuICAgKiAgbnVsbCA9IGNyZWF0aW9uIG1vZGUsIG9yIGFuIGVkaXQgdGhhdCBuZXZlciByZXNvbHZlZCB0byBhIHJvdy4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGVkaXRpbmdJZCA9IHNpZ25hbDxudW1iZXIgfCBudWxsPihudWxsKTtcblxuICAvKiogVGhlIE9ORSBzaGFyZWQgbG9jYXRpb24gc3RhdGUgKG51bGwgPSBub3RoaW5nIHBpY2tlZCB5ZXQpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgbG9jYXRpb24gPSBzaWduYWw8UGlja2VkTG9jYXRpb24gfCBudWxsPihudWxsKTtcbiAgLyoqIFBlci1yZWFzb24gaW5saW5lIGVycm9yIG9mIHRoZSBsb2NhdGlvbiBzZWN0aW9uIChudWxsID0gbm9uZSkuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBsb2NhdGlvbkVycm9yID0gc2lnbmFsPExvY2F0aW9uRXJyb3JLaW5kIHwgbnVsbD4obnVsbCk7XG4gIC8qKiBUcnVlIHdoaWxlIGEgbWFwcy5hcHAuZ29vLmdsIHNob3J0IGxpbmsgaXMgYmVpbmcgcmVzb2x2ZWQgYnkgdGhlIGJhY2tlbmQuICovXG4gIHByb3RlY3RlZCByZWFkb25seSByZXNvbHZpbmdMaW5rID0gc2lnbmFsKGZhbHNlKTtcbiAgLyoqIFRydWUgd2hpbGUgdGhlIGJyb3dzZXIgZ2VvbG9jYXRpb24gcmVxdWVzdCBpcyBpbiBmbGlnaHQuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBsb2NhdGluZyA9IHNpZ25hbChmYWxzZSk7XG4gIC8qKlxuICAgKiBUaGUgc21hcnQgdGV4dCBpbnB1dCdzIGNvbnRlbnQuIERlbGliZXJhdGVseSBhIHBsYWluIGlucHV0IChub3QgYSBmb3JtXG4gICAqIGNvbnRyb2wpOiBpdCBpcyBhIGNhcHR1cmUgQUZGT1JEQU5DRSwgbm90IGEgc3VibWl0dGVkIGZpZWxkIOKAlCB0aGVcbiAgICogc3VibWl0dGVkIGNvb3JkaW5hdGVzIGFsd2F5cyBjb21lIGZyb20gdGhlIHNoYXJlZCBsb2NhdGlvbiBzdGF0ZS5cbiAgICogRG91YmxlcyBhcyB0aGUgZm9ybSdzIGFkZHJlc3MgZmllbGQgZm9yIGFkZHJlc3Mtc2VhcmNoIHByZWZpbGxcbiAgICogKG9ubHktaWYtZW1wdHksIHN0YXRlZCBpbiB0aGUgaGVscCBsaW5lIG5lYXIgaXQg4oCUIGRlc2lnbiBkZWNpc2lvbiA0KS5cbiAgICovXG4gIHByb3RlY3RlZCByZWFkb25seSBsb2NhdGlvblRleHQgPSBzaWduYWwoJycpO1xuXG4gIC8qKlxuICAgKiBUaGUgbW9ub3RvbmljIGNhcHR1cmUgZ2VuZXJhdGlvbiAoY3Jvc3MtbW9kZSBjYXB0dXJlIHJhY2UpOiBldmVyeVxuICAgKiBjYXB0dXJlIHN0YXJ0IOKAlCBnZW9sb2NhdGlvbiwgc2hvcnQtbGluayByZXNvbHZlLCBzbWFydC1pbnB1dCBwYXJzZSwgbWFwXG4gICAqIHBpY2ssIGFkZHJlc3Mgc2VsZWN0IOKAlCBidW1wcyB0aGlzIGNvdW50ZXIuIEFzeW5jIGNhbGxiYWNrcyBjYXB0dXJlXG4gICAqIHRoZWlyIGdlbmVyYXRpb24gYXQgc3RhcnQgYW5kIE5PLU9QIG9uY2UgYSBuZXdlciBjYXB0dXJlIGhhcyBzdXBlcnNlZGVkXG4gICAqIHRoZW06IGEgbGF0ZSBnZW9sb2NhdGlvbiBzZXR0bGUgKHVwIHRvIDEwIHMpIGNhbiBuZWl0aGVyIG92ZXJ3cml0ZSBhXG4gICAqIHR5cGVkL21hcCBwaW4gbm9yIGNsZWFyIGl0IHdpdGggaXRzIGVycm9yLCBhbmQgYSBsYXRlIHJlc29sdmUgNDAwIGNhblxuICAgKiBuZWl0aGVyIG92ZXJ3cml0ZSBub3IgY2xlYXIgYSBwaWNrIG1hZGUgd2hpbGUgaXQgd2FzIGluIGZsaWdodC5cbiAgICovXG4gIHByaXZhdGUgY2FwdHVyZUdlbmVyYXRpb24gPSAwO1xuXG4gIC8qKiBUaGUgYWRkcmVzcyBzZWFyY2ggaW5wdXQncyBjb250ZW50IChhIGNhcHR1cmUgYWZmb3JkYW5jZSwgbm90IGEgZmllbGQpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgYWRkcmVzc1F1ZXJ5ID0gc2lnbmFsKCcnKTtcbiAgLyoqIFRydWUgd2hpbGUgYSBzZWFyY2ggaXMgaW4gZmxpZ2h0IE9SIHdhaXRpbmcgb3V0IHRoZSAxMDAwIG1zIHNwYWNpbmcgd2luZG93LiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc2VhcmNoaW5nID0gc2lnbmFsKGZhbHNlKTtcbiAgLyoqIFRoZSBjdXJyZW50IHJlc3VsdHMgKG1heCA1KSDigJQgc3RheSBsaXN0ZWQgdW50aWwgdGhlIG5leHQgc2VhcmNoLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgYWRkcmVzc1Jlc3VsdHMgPSBzaWduYWw8R2VvY29kZVJlc3VsdFtdPihbXSk7XG4gIC8qKiBUaGUgaW5saW5lIHN0YXRlIG9mIHRoZSBzZWFyY2ggKG51bGwgPSBub25lKS4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFkZHJlc3NFcnJvciA9IHNpZ25hbDxHZW9jb2RlRXJyb3JLaW5kIHwgbnVsbD4obnVsbCk7XG5cbiAgcHJvdGVjdGVkIG5hbWUoKTogRm9ybUNvbnRyb2w8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHRoaXMuZm9ybS5nZXQoJ25hbWUnKSBhcyBGb3JtQ29udHJvbDxzdHJpbmc+O1xuICB9XG5cbiAgcHJvdGVjdGVkIGRlc2NyaXB0aW9uKCk6IEZvcm1Db250cm9sPHN0cmluZz4ge1xuICAgIHJldHVybiB0aGlzLmZvcm0uZ2V0KCdkZXNjcmlwdGlvbicpIGFzIEZvcm1Db250cm9sPHN0cmluZz47XG4gIH1cblxuICBwcm90ZWN0ZWQgY2FwYWNpdHkoKTogRm9ybUNvbnRyb2w8bnVtYmVyIHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLmZvcm0uZ2V0KCdjYXBhY2l0eScpIGFzIEZvcm1Db250cm9sPG51bWJlciB8IG51bGw+O1xuICB9XG5cbiAgcHJvdGVjdGVkIHByaXZhdGVMb2NhdGlvbigpOiBGb3JtQ29udHJvbDxib29sZWFuPiB7XG4gICAgcmV0dXJuIHRoaXMuZm9ybS5nZXQoJ3ByaXZhdGVMb2NhdGlvbicpIGFzIEZvcm1Db250cm9sPGJvb2xlYW4+O1xuICB9XG5cbiAgLyoqIFRoZSByZWFkLW9ubHkgY29vcmRpbmF0ZSByZWFkb3V0IHVuZGVyIHRoZSBtYXAuICovXG4gIHByb3RlY3RlZCBsb2NhdGlvblJlYWRvdXQoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwaWNrZWQgPSB0aGlzLmxvY2F0aW9uKCk7XG4gICAgcmV0dXJuIHBpY2tlZCA9PT0gbnVsbFxuICAgICAgPyB0aGlzLmkxOG4udCgnc3VibWl0LmxvY2F0aW9uLmVtcHR5JylcbiAgICAgIDogYCR7cGlja2VkLmxhdGl0dWRlLnRvRml4ZWQoNSl9LCAke3BpY2tlZC5sb25naXR1ZGUudG9GaXhlZCg1KX1gO1xuICB9XG5cbiAgLyoqIFNvdXJjZSBoaW50IChpbmNsLiB0aGUgc3dhcHBlZC1vcmRlciArIGdlb2xvY2F0aW9uLWFjY3VyYWN5IGhpbnRzKS5cbiAgICogIFRoZSBlZGl0IHByZWZpbGwgKCdzYXZlZCcpIG5hbWVzIG5vIGNhcHR1cmUgbW9kZSDigJQgbm8gaGludCBsaW5lLiAqL1xuICBwcm90ZWN0ZWQgbG9jYXRpb25IaW50KCk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IHBpY2tlZCA9IHRoaXMubG9jYXRpb24oKTtcbiAgICBpZiAocGlja2VkID09PSBudWxsIHx8IHBpY2tlZC5zb3VyY2UgPT09ICdzYXZlZCcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBsZXQgaGludCA9IHRoaXMuaTE4bi50KCdzdWJtaXQuaGludC5mcm9tJykgKyB0aGlzLmkxOG4udChTT1VSQ0VfS0VZW3BpY2tlZC5zb3VyY2VdKTtcbiAgICBpZiAocGlja2VkLnN3YXBwZWQpIHtcbiAgICAgIGhpbnQgKz0gdGhpcy5pMThuLnQoJ3N1Ym1pdC5oaW50LnN3YXBwZWQnKTtcbiAgICB9XG4gICAgaWYgKHBpY2tlZC5hY2N1cmFjeU0gIT09IG51bGwpIHtcbiAgICAgIGhpbnQgKz0gdGhpcy5pMThuLnQoJ3N1Ym1pdC5oaW50LmFjY3VyYWN5JywgeyBtOiBNYXRoLnJvdW5kKHBpY2tlZC5hY2N1cmFjeU0pIH0pO1xuICAgIH1cbiAgICByZXR1cm4gaGludDtcbiAgfVxuXG4gIHByb3RlY3RlZCBsb2NhdGlvbkVycm9yVGV4dCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBraW5kID0gdGhpcy5sb2NhdGlvbkVycm9yKCk7XG4gICAgcmV0dXJuIGtpbmQgPT09IG51bGwgPyBudWxsIDogdGhpcy5pMThuLnQoTE9DQVRJT05fRVJST1JfS0VZW2tpbmRdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgZm9ybSByZW5kZXJzIGZvciBjcmVhdGlvbiwgYW5kIGZvciBhbiBlZGl0IG9uY2UgaXRzIHJvdyBoYXNcbiAgICogbG9hZGVkLiBUaGUgZWRpdCdzIGxvYWRpbmcgLyBub3QtZm91bmQgLyBsb2FkLWZhaWx1cmUgc3RhdGVzIHJlbmRlclxuICAgKiB0aGVpciBvd24gbWFya3VwIGluc3RlYWQgKHRoZSBsb2FkIGZhaWx1cmUgc2hvd3MgdGhyb3VnaCB0aGUgYmFubmVyKS5cbiAgICovXG4gIHByb3RlY3RlZCBzaG93Rm9ybSgpOiBib29sZWFuIHtcbiAgICBpZiAoIXRoaXMuZWRpdE1vZGUoKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiAhdGhpcy5lZGl0TG9hZGluZygpICYmICF0aGlzLmVkaXRNaXNzaW5nKCkgJiYgdGhpcy5lZGl0aW5nSWQoKSAhPT0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFZGl0IG1vZGUgKE01KTogL3N1Ym1pdD9lZGl0PTxpZD4gcHJlZmlsbHMgdGhlIFNBTUUgZm9ybSB3aXRoIHRoZVxuICAgKiByb3cncyBjdXJyZW50IHZhbHVlcy4gVGhlIHJvdyBjb21lcyBmcm9tIEdFVCAvYXBpL3NoZWx0ZXJzL21pbmUg4oCUXG4gICAqIG93bmVyLXNjb3BlZCwgQUxMIHN0YXR1c2VzIOKAlCBzbyBhbiBpZCB0aGF0IGlzIG5vdCB0aGUgY2FsbGVyJ3MgKG9yIGFcbiAgICogbWFsZm9ybWVkIHBhcmFtKSBpcyB0aGUgbm90LWZvdW5kIHN0YXRlLCBuZXZlciBhIHByZWZpbGwgb2Ygc29tZW9uZVxuICAgKiBlbHNlJ3Mgc2hlbHRlci4gU2F2ZSBpcyBQVVQgL2FwaS9zaGVsdGVycy97aWR9IGFuZCBwdWJsaXNoZXNcbiAgICogaW1tZWRpYXRlbHkgKHRoZSBiYWNrZW5kIGtlZXBzIHRoZSByb3cncyBzdGF0dXMg4oCUIGFuIGVkaXQgbmV2ZXJcbiAgICogdW5wdWJsaXNoZXMgaXQpOyBwZXIgdGhlIG93bmVyJ3MgTTUgZGVjaXNpb24gdGhlIHNoZWx0ZXIgdGhlbiBjYXJyaWVzXG4gICAqIHRoZSBzYW1lIHBlbmRpbmctdmVyaWZpY2F0aW9uIChORVcpIHRydXN0IHN0YXRlIGEgbmV3bHkgYWRkZWQgc2hlbHRlclxuICAgKiBnZXRzIOKAlCBhIFNUQVRVUywgbm90IGEgZ2F0ZSBpbiBmcm9udCBvZiB0aGUgZWRpdC5cbiAgICovXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIGNvbnN0IHJhdyA9IHRoaXMucm91dGUuc25hcHNob3QucXVlcnlQYXJhbU1hcC5nZXQoJ2VkaXQnKTtcbiAgICBpZiAocmF3ID09PSBudWxsKSB7XG4gICAgICByZXR1cm47IC8vIGNyZWF0aW9uIOKAlCB0aGUgZm9ybSBpcyB1bnRvdWNoZWQsIHRoZSBwYXRoIGlzIHVuY2hhbmdlZFxuICAgIH1cbiAgICB0aGlzLmVkaXRNb2RlLnNldCh0cnVlKTtcbiAgICBjb25zdCBpZCA9IE51bWJlcihyYXcpO1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihpZCkgfHwgaWQgPD0gMCkge1xuICAgICAgdGhpcy5lZGl0TWlzc2luZy5zZXQodHJ1ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZWRpdExvYWRpbmcuc2V0KHRydWUpO1xuICAgIHZvaWQgdGhpcy5nYXRld2F5XG4gICAgICAubWluZSgpXG4gICAgICAudGhlbigocm93cykgPT4ge1xuICAgICAgICBjb25zdCByb3cgPSByb3dzLmZpbmQoKHIpID0+IHIuaWQgPT09IGlkKSA/PyBudWxsO1xuICAgICAgICBpZiAocm93ID09PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5lZGl0TWlzc2luZy5zZXQodHJ1ZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJlZmlsbEZyb21Sb3cocm93KTtcbiAgICAgICAgdGhpcy5lZGl0aW5nSWQuc2V0KHJvdy5pZCk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChmYWlsdXJlOiB1bmtub3duKSA9PiB7XG4gICAgICAgIHRoaXMuZXJyb3Iuc2V0KGJhbm5lck1lc3NhZ2UoZmFpbHVyZSwgJ3NoZWx0ZXInLCAoa2V5KSA9PiB0aGlzLmkxOG4udChrZXkpKSk7XG4gICAgICB9KVxuICAgICAgLmZpbmFsbHkoKCkgPT4gdGhpcy5lZGl0TG9hZGluZy5zZXQoZmFsc2UpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaWxscyB0aGUgZm9ybSArIHRoZSBzaGFyZWQgbG9jYXRpb24gc3RhdGUgZnJvbSB0aGUgcm93IGJlaW5nIGVkaXRlZC5cbiAgICogUHJlZmlsbCwgbmV2ZXIgb3ZlcndyaXRlOiBpZiB0aGUgdXNlciBhbHJlYWR5IGNhcHR1cmVkIGEgbG9jYXRpb24gb3JcbiAgICogdG91Y2hlZCB0aGUgZm9ybSBiZWZvcmUgdGhlIHJvdyBsYW5kZWQsIHRoZWlyIGlucHV0IHdpbnMuXG4gICAqL1xuICBwcml2YXRlIHByZWZpbGxGcm9tUm93KHJvdzogTWluZVNoZWx0ZXJEdG8pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2NhdGlvbigpICE9PSBudWxsIHx8IHRoaXMuZm9ybS50b3VjaGVkIHx8IHRoaXMubG9jYXRpb25UZXh0KCkgIT09ICcnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMubmFtZSgpLnNldFZhbHVlKHJvdy5uYW1lKTtcbiAgICB0aGlzLmRlc2NyaXB0aW9uKCkuc2V0VmFsdWUocm93LmRlc2NyaXB0aW9uID8/ICcnKTtcbiAgICB0aGlzLmNhcGFjaXR5KCkuc2V0VmFsdWUocm93LmNhcGFjaXR5KTtcbiAgICAvLyBUaGUgZGVjbGFyYXRpb24gbWlycm9ycyB0aGUgcm93J3Mgc3RvcmVkIGxvY2F0aW9uS2luZCAoRDcpLlxuICAgIHRoaXMucHJpdmF0ZUxvY2F0aW9uKCkuc2V0VmFsdWUocm93LmxvY2F0aW9uS2luZCA9PT0gJ1BSSVZBVEUnKTtcbiAgICAvLyBUaGUgc21hcnQgaW5wdXQgc2hvd3MgdGhlIHNhdmVkIHBhaXIg4oCUIHRoZSBzYW1lIHRleHQgaXRzIHBhcnNlclxuICAgIC8vIGFjY2VwdHMsIHNvIGEgcmUtRW50ZXIgcmUtcGFyc2VzIHRvIHRoZSBzYW1lIHBpbi5cbiAgICB0aGlzLmxvY2F0aW9uVGV4dC5zZXQoYCR7cm93LmxhdGl0dWRlfSwgJHtyb3cubG9uZ2l0dWRlfWApO1xuICAgIC8vICdzYXZlZCcgPSBubyBjYXB0dXJlIHNvdXJjZTogdGhlIFwiTG9jYXRpb24gZnJvbSDigKZcIiBoaW50IHN0YXlzIG9mZlxuICAgIC8vIHVudGlsIGEgcmVhbCBjYXB0dXJlIHN1cGVyc2VkZXMgdGhlIHByZWZpbGw7IHRoZSBtYXAgZmxpZXMgdG8gdGhlXG4gICAgLy8gc2F2ZWQgcG9pbnQuXG4gICAgdGhpcy5zZXRMb2NhdGlvbihyb3cubGF0aXR1ZGUsIHJvdy5sb25naXR1ZGUsICdzYXZlZCcsIGZhbHNlLCB0cnVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgbWFwIGNvbnRhaW5lciBvbmx5IGV4aXN0cyBvbmNlIHRoZSB2aWV3IGlzIHJlbmRlcmVkOyBhIG51bGxcbiAgICogY29udGFpbmVyIChzaG91bGQgbmV2ZXIgaGFwcGVuKSBza2lwcyBtYXAgY3JlYXRpb24gYnV0IG5ldmVyIGJyZWFrc1xuICAgKiB0aGUgcGFnZS4gTWFwIGNsaWNrIEFORCBwaWNrLW1hcmtlciBkcmFnIC0+IHRoZSBzaGFyZWQgbG9jYXRpb24gc3RhdGUuXG4gICAqL1xuICBuZ0FmdGVyVmlld0luaXQoKTogdm9pZCB7XG4gICAgdGhpcy5sZWFmbGV0Lm1hcENsaWNrID0gKGxhdGl0dWRlLCBsb25naXR1ZGUpID0+IHtcbiAgICAgIC8vIEEgcGljayBpcyBhIGNhcHR1cmUg4oCUIGl0IHN1cGVyc2VkZXMgYW55IHBlbmRpbmcgY2FwdHVyZS5cbiAgICAgIHRoaXMuY2FwdHVyZUdlbmVyYXRpb24rKztcbiAgICAgIC8vIE5vIGZseVRvOiB0aGUgdXNlciBpcyBhbHJlYWR5IGxvb2tpbmcgYXQgdGhlIHBvaW50IChhIHJlLWNlbnRlclxuICAgICAgLy8gZHVyaW5nIGEgcGluIGRyYWcgd291bGQgZmlnaHQgdGhlIGdlc3R1cmUpLlxuICAgICAgdGhpcy5zZXRMb2NhdGlvbihsYXRpdHVkZSwgbG9uZ2l0dWRlLCAnbWFwLXBpY2snLCBmYWxzZSwgZmFsc2UpO1xuICAgIH07XG4gICAgdGhpcy5sZWFmbGV0LmNyZWF0ZSh0aGlzLm1hcEVsKCk/Lm5hdGl2ZUVsZW1lbnQgPz8gbnVsbCwgRVNUT05JQV9DRU5URVIsIEVTVE9OSUFfWk9PTSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICAvLyBEcm9wIHRoZSBtaW5pLW1hcCBpbnN0YW5jZSArIGxpc3RlbmVycyAocGFnZS1zY29wZWQsIGRlc2lnbiBkZWNpc2lvbiAzKS5cbiAgICB0aGlzLmxlYWZsZXQuZGVzdHJveSgpO1xuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIENhcHR1cmUgbW9kZXMg4oCUIGV2ZXJ5IG9uZSB3cml0ZXMgdGhlIHNpbmdsZSBzaGFyZWQgbG9jYXRpb24gc3RhdGVcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcHJvdGVjdGVkIG9uTG9jYXRpb25UZXh0Q2hhbmdlKGV2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgIHRoaXMubG9jYXRpb25UZXh0LnNldCgoZXZlbnQudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlKTtcbiAgfVxuXG4gIC8qKiBFbnRlciBpbiB0aGUgc21hcnQgaW5wdXQgcGFyc2VzIGluc3RlYWQgb2Ygc3VibWl0dGluZyB0aGUgZm9ybS4gKi9cbiAgcHJvdGVjdGVkIG9uTG9jYXRpb25TdWJtaXRLZXkoZXZlbnQ6IEV2ZW50KTogdm9pZCB7XG4gICAgaWYgKCEoZXZlbnQgaW5zdGFuY2VvZiBLZXlib2FyZEV2ZW50KSB8fCBldmVudC5rZXkgIT09ICdFbnRlcicpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB0aGlzLmFwcGx5TG9jYXRpb25JbnB1dCgpO1xuICB9XG5cbiAgLyoqIFRoZSBcIlNldCBsb2NhdGlvblwiIGJ1dHRvbiAoYW5kIEVudGVyKTogc21hcnQtaW5wdXQgY2FwdHVyZS4gKi9cbiAgcHJvdGVjdGVkIGFwcGx5TG9jYXRpb25JbnB1dCgpOiB2b2lkIHtcbiAgICBjb25zdCB0ZXh0ID0gdGhpcy5sb2NhdGlvblRleHQoKS50cmltKCk7XG4gICAgaWYgKHRleHQgPT09ICcnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFRoaXMgY2FwdHVyZSBpcyBjdXJyZW50IGJ5IGRlZmluaXRpb24g4oCUIHRoZSBidW1wIG1hdHRlcnMgZm9yIHRoZVxuICAgIC8vIEFTWU5DIGNhcHR1cmVzOiBhIHBlbmRpbmcgZ2VvbG9jYXRpb24vcmVzb2x2ZSBtdXN0IG5vLW9wIG9uY2UgdGhlXG4gICAgLy8gdXNlciB0eXBlZC5cbiAgICB0aGlzLmNhcHR1cmVHZW5lcmF0aW9uKys7XG4gICAgLy8gU2hvcnQgbGlua3MgYXJlIG9wYXF1ZSByZWRpcmVjdHMg4oCUIG9ubHkgdGhlIGJhY2tlbmQgY2FuIHJlYWQgdGhlbS5cbiAgICBpZiAoaXNHb29TaG9ydExpbmsodGV4dCkpIHtcbiAgICAgIHZvaWQgdGhpcy5yZXNvbHZlU2hvcnRMaW5rKG5vcm1hbGl6ZVNob3J0TGlua1VybCh0ZXh0KSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IHBhcnNlTG9jYXRpb25JbnB1dCh0ZXh0KTtcbiAgICBpZiAoJ2xhdGl0dWRlJyBpbiByZXN1bHQpIHtcbiAgICAgIHRoaXMuc2V0TG9jYXRpb24oXG4gICAgICAgIHJlc3VsdC5sYXRpdHVkZSxcbiAgICAgICAgcmVzdWx0LmxvbmdpdHVkZSxcbiAgICAgICAgL15odHRwcz86XFwvXFwvL2kudGVzdCh0ZXh0KSA/ICdsaW5rJyA6ICd0eXBlZCcsXG4gICAgICAgIHJlc3VsdC5zd2FwcGVkID09PSB0cnVlLFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5mYWlsTG9jYXRpb24ocmVzdWx0LnJlYXNvbik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFwiVXNlIG15IGxvY2F0aW9uXCIg4oCUIGhpZ2gtYWNjdXJhY3kgZ2VvbG9jYXRpb24sIDEwIHMgdGltZW91dCwgbm8gY2FjaGVkXG4gICAqIHBvc2l0aW9ucyAoZGVzaWduIGRlY2lzaW9uIDUpLiBFYWNoIGZhaWx1cmUgbWFwcyAxOjEgdG8gYW4gaW5saW5lXG4gICAqIG1lc3NhZ2U7IHRoZSBpbnNlY3VyZS1jb250ZXh0IGd1YXJkIGhhcyBpdHMgb3duIGNvcHkuXG4gICAqL1xuICBwcm90ZWN0ZWQgdXNlTXlMb2NhdGlvbigpOiB2b2lkIHtcbiAgICBpZiAod2luZG93LmlzU2VjdXJlQ29udGV4dCA9PT0gZmFsc2UpIHtcbiAgICAgIHRoaXMuZmFpbExvY2F0aW9uKCdnZW8taW5zZWN1cmUnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZ2VvbG9jYXRpb24gPSBuYXZpZ2F0b3IuZ2VvbG9jYXRpb247XG4gICAgLy8ganNkb20gbGVhdmVzIG5hdmlnYXRvci5nZW9sb2NhdGlvbiB1bmRlZmluZWQg4oCUIGAhYCBjb3ZlcnMgbnVsbCBBTkQgdW5kZWZpbmVkLlxuICAgIGlmICghZ2VvbG9jYXRpb24gfHwgdHlwZW9mIGdlb2xvY2F0aW9uLmdldEN1cnJlbnRQb3NpdGlvbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5mYWlsTG9jYXRpb24oJ2dlby11bmF2YWlsYWJsZScpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmxvY2F0aW5nLnNldCh0cnVlKTtcbiAgICB0aGlzLmxvY2F0aW9uRXJyb3Iuc2V0KG51bGwpO1xuICAgIGNvbnN0IGdlbiA9ICsrdGhpcy5jYXB0dXJlR2VuZXJhdGlvbjtcbiAgICBnZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oXG4gICAgICAocG9zaXRpb24pID0+IHtcbiAgICAgICAgdGhpcy5sb2NhdGluZy5zZXQoZmFsc2UpO1xuICAgICAgICBpZiAoZ2VuICE9PSB0aGlzLmNhcHR1cmVHZW5lcmF0aW9uKSB7XG4gICAgICAgICAgLy8gU3VwZXJzZWRlZCBieSBhIG5ld2VyIGNhcHR1cmUgKHR5cGVkL3BpY2tlZC/igKYgd2hpbGUgdGhpcyB3YXMgaW5cbiAgICAgICAgICAvLyBmbGlnaHQpIOKAlCB0aGUgbGF0ZSBzZXR0bGUgbXVzdCBub3Qgb3ZlcndyaXRlIHRoZSBwaW4uXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0TG9jYXRpb24oXG4gICAgICAgICAgcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlLFxuICAgICAgICAgIHBvc2l0aW9uLmNvb3Jkcy5sb25naXR1ZGUsXG4gICAgICAgICAgJ2dlb2xvY2F0aW9uJyxcbiAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICB0cnVlLFxuICAgICAgICAgIHBvc2l0aW9uLmNvb3Jkcy5hY2N1cmFjeSxcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgICAoZXJyKSA9PiB7XG4gICAgICAgIHRoaXMubG9jYXRpbmcuc2V0KGZhbHNlKTtcbiAgICAgICAgaWYgKGdlbiAhPT0gdGhpcy5jYXB0dXJlR2VuZXJhdGlvbikge1xuICAgICAgICAgIC8vIFN1cGVyc2VkZWQg4oCUIHRoZSBsYXRlIGVycm9yIG11c3Qgbm90IHJ1biBmYWlsTG9jYXRpb24gYW5kIGNsZWFyXG4gICAgICAgICAgLy8gdGhlIHBpbiB0aGUgdXNlciBzZXQgaW4gdGhlIG1lYW50aW1lLlxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBEdWNrLXR5cGVkIGNvZGUgcmVhZDoganNkb20gZG9lcyBub3QgZGVmaW5lIEdlb2xvY2F0aW9uUG9zaXRpb25FcnJvci5cbiAgICAgICAgY29uc3QgY29kZSA9IHR5cGVvZiBlcnI/LmNvZGUgPT09ICdudW1iZXInID8gZXJyLmNvZGUgOiAyO1xuICAgICAgICB0aGlzLmZhaWxMb2NhdGlvbihcbiAgICAgICAgICBjb2RlID09PSAxID8gJ2dlby1kZW5pZWQnIDogY29kZSA9PT0gMyA/ICdnZW8tdGltZW91dCcgOiAnZ2VvLXVuYXZhaWxhYmxlJyxcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgICB7IGVuYWJsZUhpZ2hBY2N1cmFjeTogdHJ1ZSwgdGltZW91dDogMTAwMDAsIG1heGltdW1BZ2U6IDAgfSxcbiAgICApO1xuICB9XG5cbiAgLyoqIG1hcHMuYXBwLmdvby5nbCAtPiBQT1NUIC9hcGkvZ2VvL3Jlc29sdmUgKEpXVCwgcGVyLUlQIDUvbWluKS4gKi9cbiAgcHJpdmF0ZSBhc3luYyByZXNvbHZlU2hvcnRMaW5rKHVybDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5yZXNvbHZpbmdMaW5rLnNldCh0cnVlKTtcbiAgICB0aGlzLmxvY2F0aW9uRXJyb3Iuc2V0KG51bGwpO1xuICAgIGNvbnN0IGdlbiA9ICsrdGhpcy5jYXB0dXJlR2VuZXJhdGlvbjtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSBhd2FpdCB0aGlzLmdlby5yZXNvbHZlKHVybCk7XG4gICAgICBpZiAoZ2VuICE9PSB0aGlzLmNhcHR1cmVHZW5lcmF0aW9uKSB7XG4gICAgICAgIC8vIFN1cGVyc2VkZWQgYnkgYSBuZXdlciBjYXB0dXJlIHdoaWxlIHRoZSByZXNvbHZlIHdhcyBpbiBmbGlnaHQg4oCUXG4gICAgICAgIC8vIHRoZSBsYXRlIHN1Y2Nlc3MgbXVzdCBub3Qgb3ZlcndyaXRlIHRoZSBwaW4uXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0TG9jYXRpb24ocmVzb2x2ZWQubGF0aXR1ZGUsIHJlc29sdmVkLmxvbmdpdHVkZSwgJ2xpbmsnKTtcbiAgICB9IGNhdGNoIChmYWlsdXJlOiB1bmtub3duKSB7XG4gICAgICBpZiAoZ2VuICE9PSB0aGlzLmNhcHR1cmVHZW5lcmF0aW9uKSB7XG4gICAgICAgIC8vIFN1cGVyc2VkZWQg4oCUIHRoZSBsYXRlIGZhaWx1cmUgbXVzdCBub3QgcnVuIGZhaWxMb2NhdGlvbiBhbmQgY2xlYXJcbiAgICAgICAgLy8gYSBwaWNrIG1hZGUgd2hpbGUgdGhlIHJlc29sdmUgd2FzIGluIGZsaWdodC5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gQSA1eHggPSB0aGUgYmFja2VuZCdzIFVQU1RSRUFNIHJlc29sdXRpb24gaXMgdGVtcG9yYXJpbHlcbiAgICAgIC8vIHVuYXZhaWxhYmxlIChpdHMgb3duIG1lc3NhZ2Ugc2F5cyByZXRyeSBsYXRlcik7IGEgbmV0d29yayBmYWlsdXJlXG4gICAgICAvLyA9IHRoZSBBUEkgaXMgdW5yZWFjaGFibGUuIE5laXRoZXIgaXMgdGhlIHVzZXIncyBsaW5rIOKAlCByZXRyeS1cbiAgICAgIC8vIG9yaWVudGVkIGNvcHksIG5vdCB0aGUgbm90LWZvdW5kIGNvcHkuXG4gICAgICBjb25zdCBhcGkgPSB0b0FwaUVycm9yKGZhaWx1cmUpO1xuICAgICAgaWYgKGFwaS5zdGF0dXMgPj0gNTAwIHx8IGFwaS5pc05ldHdvcmtFcnJvcikge1xuICAgICAgICB0aGlzLmZhaWxMb2NhdGlvbignc2hvcnQtbGluay11bmF2YWlsYWJsZScpO1xuICAgICAgfSBlbHNlIGlmIChhcGkuc3RhdHVzID09PSA0MjkpIHtcbiAgICAgICAgdGhpcy5mYWlsTG9jYXRpb24oJ3Nob3J0LWxpbmstcmF0ZS1saW1pdGVkJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmZhaWxMb2NhdGlvbignc2hvcnQtbGluay1mYWlsZWQnKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5yZXNvbHZpbmdMaW5rLnNldChmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIENhcHR1cmUgbW9kZSA1OiBFc3RvbmlhIGFkZHJlc3Mgc2VhcmNoIChjbGllbnQtc2lkZSBPU00gTm9taW5hdGltKVxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBwcm90ZWN0ZWQgb25BZGRyZXNzUXVlcnlDaGFuZ2UoZXZlbnQ6IEV2ZW50KTogdm9pZCB7XG4gICAgdGhpcy5hZGRyZXNzUXVlcnkuc2V0KChldmVudC50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWUpO1xuICB9XG5cbiAgLyoqIEVudGVyIGluIHRoZSBzZWFyY2ggaW5wdXQgc2VhcmNoZXMgaW5zdGVhZCBvZiBzdWJtaXR0aW5nIHRoZSBmb3JtLiAqL1xuICBwcm90ZWN0ZWQgb25BZGRyZXNzU2VhcmNoS2V5KGV2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgIGlmICghKGV2ZW50IGluc3RhbmNlb2YgS2V5Ym9hcmRFdmVudCkgfHwgZXZlbnQua2V5ICE9PSAnRW50ZXInKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdGhpcy5zdGFydEFkZHJlc3NTZWFyY2goKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgXCJTZWFyY2hcIiBidXR0b24gKGFuZCBFbnRlcik6IE9ORSBkZWxpYmVyYXRlIE5vbWluYXRpbSByZXF1ZXN0IHBlclxuICAgKiBwcmVzcyDigJQgbm8gYXV0b3N1Z2dlc3QgKE5vbWluYXRpbSB1c2FnZSBwb2xpY3ksIGRlc2lnbiBkZWNpc2lvbiAyKS5cbiAgICogQSBwcmVzcyB3aGlsZSBhIHNlYXJjaCBpcyBwZW5kaW5nIGlzIElHTk9SRUQsIG5ldmVyIHN0YWNrZWQ7IGlmIHRoZVxuICAgKiBwcmVzcyBsYW5kcyBpbnNpZGUgdGhlIDEwMDAgbXMgc3BhY2luZyB3aW5kb3cgdGhlIGdhdGV3YXkgd2FpdHMgaXRcbiAgICogb3V0IGFuZCB0aGUgYnV0dG9uIHN0YXlzIHBlbmRpbmcgdGhlIHdob2xlIHRpbWUgKGRlc2lnbiBkZWNpc2lvbiAzKS5cbiAgICovXG4gIHByb3RlY3RlZCBzdGFydEFkZHJlc3NTZWFyY2goKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc2VhcmNoaW5nKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcXVlcnkgPSB0aGlzLmFkZHJlc3NRdWVyeSgpLnRyaW0oKTtcbiAgICBpZiAocXVlcnkgPT09ICcnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc2VhcmNoaW5nLnNldCh0cnVlKTtcbiAgICB0aGlzLmFkZHJlc3NFcnJvci5zZXQobnVsbCk7XG4gICAgdGhpcy5hZGRyZXNzUmVzdWx0cy5zZXQoW10pO1xuICAgIHZvaWQgdGhpcy5nZW9jb2RlXG4gICAgICAuc2VhcmNoKHF1ZXJ5KVxuICAgICAgLnRoZW4oKHJlc3VsdHMpID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5hZGRyZXNzRXJyb3Iuc2V0KCduby1yZXN1bHRzJyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWRkcmVzc1Jlc3VsdHMuc2V0KHJlc3VsdHMpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZmFpbHVyZTogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyA0MjkgPSB0aGUgc2VydmljZSB0aHJvdHRsZXMgKFwicGxlYXNlIHdhaXQgYSBtb21lbnRcIik7IGFueXRoaW5nXG4gICAgICAgIC8vIGVsc2UgKG5ldHdvcmsvQ09SUy81eHgpIGdldHMgdGhlIGdlbmVyaWMgdW5hdmFpbGFibGUgY29weS5cbiAgICAgICAgY29uc3QgYXBpID0gdG9BcGlFcnJvcihmYWlsdXJlKTtcbiAgICAgICAgdGhpcy5hZGRyZXNzRXJyb3Iuc2V0KGFwaS5zdGF0dXMgPT09IDQyOSA/ICdyYXRlLWxpbWl0ZWQnIDogJ25ldHdvcmsnKTtcbiAgICAgIH0pXG4gICAgICAuZmluYWxseSgoKSA9PiB0aGlzLnNlYXJjaGluZy5zZXQoZmFsc2UpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWxlY3RpbmcgYSByZXN1bHQ6IHBsYWNlIHRoZSBwaW4gKHNvdXJjZSAnYWRkcmVzcy1zZWFyY2gnLCB0aGUgc2FtZVxuICAgKiBzaGFyZWQgcGF0aCBhcyBldmVyeSBvdGhlciBjYXB0dXJlIG1vZGUpIGFuZCBwcmVmaWxsIHRoZSBhZGRyZXNzIGZpZWxkXG4gICAqIOKAlCB0aGUgc21hcnQgdGV4dCBpbnB1dCBhYm92ZSDigJQgT05MWSBJRiBpdCBpcyBjdXJyZW50bHkgZW1wdHkgKGRlc2lnblxuICAgKiBkZWNpc2lvbiA0OiBwcmVmaWxsLCBuZXZlciBvdmVyd3JpdGU7IHRoZSBoZWxwIGxpbmUgc3RhdGVzIHRoaXMpLlxuICAgKi9cbiAgcHJvdGVjdGVkIHNlbGVjdEFkZHJlc3NSZXN1bHQocmVzdWx0OiBHZW9jb2RlUmVzdWx0KTogdm9pZCB7XG4gICAgLy8gQSBzZWxlY3Rpb24gaXMgYSBjYXB0dXJlIOKAlCBpdCBzdXBlcnNlZGVzIGFueSBwZW5kaW5nIGNhcHR1cmUuXG4gICAgdGhpcy5jYXB0dXJlR2VuZXJhdGlvbisrO1xuICAgIHRoaXMuc2V0TG9jYXRpb24ocmVzdWx0LmxhdGl0dWRlLCByZXN1bHQubG9uZ2l0dWRlLCAnYWRkcmVzcy1zZWFyY2gnKTtcbiAgICBpZiAodGhpcy5sb2NhdGlvblRleHQoKS50cmltKCkgPT09ICcnKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uVGV4dC5zZXQocmVzdWx0LmRpc3BsYXlOYW1lKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgYWRkcmVzc0Vycm9yVGV4dCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBraW5kID0gdGhpcy5hZGRyZXNzRXJyb3IoKTtcbiAgICByZXR1cm4ga2luZCA9PT0gbnVsbCA/IG51bGwgOiB0aGlzLmkxOG4udChHRU9DT0RFX0VSUk9SX0tFWVtraW5kXSk7XG4gIH1cblxuICAvKipcbiAgICogQSBGQUlMRUQgY2FwdHVyZSByZW1vdmVzIHRoZSBwcmV2aW91cyBwaW4gKHNwZWM6IFwidGhlIG1hcmtlciBpcyBub3RcbiAgICogcGxhY2VkXCIpIOKAlCB0aGUgc2FmZXN0IHN0YXRlOiBhbiBlcnJvciBpcyBzaG93aW5nIEFORCB0aGUgZm9ybSBjYW5ub3RcbiAgICogc2lsZW50bHkgc3VibWl0IGEgc3RhbGUsIG5vdy11bnRydXN0ZWQgcGluIChkZXNpZ24gcmlzazogbmV2ZXIgYVxuICAgKiBzaWxlbnQgd3JvbmcgcGluKS4gJ21pc3NpbmcnIGlzIHRoZSBvbmUgZXhjZXB0aW9uIOKAlCBpdCBpcyBzZXQgYXRcbiAgICogc3VibWl0IHRpbWUgd2hlbiB0aGVyZSBpcyBub3RoaW5nIHRvIGNsZWFyLlxuICAgKi9cbiAgcHJpdmF0ZSBmYWlsTG9jYXRpb24oa2luZDogTG9jYXRpb25FcnJvcktpbmQpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnNldChudWxsKTtcbiAgICB0aGlzLmxvY2F0aW9uRXJyb3Iuc2V0KGtpbmQpO1xuICAgIHRoaXMubGVhZmxldC5zZXRQaWNrKG51bGwsIG51bGwpO1xuICB9XG5cbiAgLyoqIFRoZSBzaW5nbGUgd3JpdGVyIG9mIHRoZSBzaGFyZWQgbG9jYXRpb24gc3RhdGUgKGFsbCBjYXB0dXJlIG1vZGVzKS4gKi9cbiAgcHJpdmF0ZSBzZXRMb2NhdGlvbihcbiAgICBsYXRpdHVkZTogbnVtYmVyLFxuICAgIGxvbmdpdHVkZTogbnVtYmVyLFxuICAgIHNvdXJjZTogTG9jYXRpb25Tb3VyY2UsXG4gICAgc3dhcHBlZCA9IGZhbHNlLFxuICAgIGZseSA9IHRydWUsXG4gICAgYWNjdXJhY3lNOiBudW1iZXIgfCBudWxsID0gbnVsbCxcbiAgKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhdGlvbi5zZXQoeyBsYXRpdHVkZSwgbG9uZ2l0dWRlLCBzb3VyY2UsIHN3YXBwZWQsIGFjY3VyYWN5TSB9KTtcbiAgICB0aGlzLmxvY2F0aW9uRXJyb3Iuc2V0KG51bGwpO1xuICAgIHRoaXMubGVhZmxldC5zZXRQaWNrKGxhdGl0dWRlLCBsb25naXR1ZGUpO1xuICAgIGlmIChmbHkpIHtcbiAgICAgIHRoaXMubGVhZmxldC5mbHlUbyhsYXRpdHVkZSwgbG9uZ2l0dWRlKTtcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gU3VibWl0IOKAlCBwYXlsb2FkOiBuYW1lICsgbGF0aXR1ZGUvbG9uZ2l0dWRlIG51bWJlcnMsIG9wdGlvbmFsXG4gIC8vIGRlc2NyaXB0aW9uL2NhcGFjaXR5LCBsb2NhdGlvbktpbmQgKGNvbW11bml0eS1yZXZpZXctcXVldWUgRDcpXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFzeW5jIHN1Ym1pdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5wZW5kaW5nKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZWRpdElkID0gdGhpcy5lZGl0aW5nSWQoKTtcbiAgICBpZiAodGhpcy5lZGl0TW9kZSgpICYmICh0aGlzLmVkaXRMb2FkaW5nKCkgfHwgZWRpdElkID09PSBudWxsKSkge1xuICAgICAgcmV0dXJuOyAvLyB0aGUgcm93IGlzIHN0aWxsIGxvYWRpbmcgKG9yIG5ldmVyIHJlc29sdmVkKSDigJQgbm90aGluZyB0byBzYXZlXG4gICAgfVxuICAgIHRoaXMuZm9ybS5tYXJrQWxsQXNUb3VjaGVkKCk7XG4gICAgaWYgKHRoaXMubG9jYXRpb24oKSA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5sb2NhdGlvbkVycm9yLnNldCgnbWlzc2luZycpO1xuICAgIH1cbiAgICBpZiAodGhpcy5mb3JtLmludmFsaWQgfHwgdGhpcy5sb2NhdGlvbigpID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5wZW5kaW5nLnNldCh0cnVlKTtcbiAgICB0aGlzLmVycm9yLnNldChudWxsKTtcbiAgICB0aGlzLnZlcmlmeUxpbmsuc2V0KGZhbHNlKTtcbiAgICB0aGlzLnN1Ym1pdHRlZC5zZXQobnVsbCk7XG5cbiAgICBjb25zdCBwaWNrZWQgPSB0aGlzLmxvY2F0aW9uKCkgYXMgUGlja2VkTG9jYXRpb247XG4gICAgY29uc3QgcmVxdWVzdDogQ3JlYXRlU2hlbHRlclJlcXVlc3QgPSB7XG4gICAgICBuYW1lOiB0aGlzLm5hbWUoKS52YWx1ZS50cmltKCksXG4gICAgICBsYXRpdHVkZTogcGlja2VkLmxhdGl0dWRlLFxuICAgICAgbG9uZ2l0dWRlOiBwaWNrZWQubG9uZ2l0dWRlLFxuICAgICAgLy8gRXhwbGljaXQgb24gcHVycG9zZTogdW5jaGVja2VkID0gUFVCTElDICh0aGUgY29udHJhY3QgZGVmYXVsdCksXG4gICAgICAvLyBjaGVja2VkID0gUFJJVkFURSAodGhlIHJlc2lkZW50LW9mZmVyZWQgZGVjbGFyYXRpb24pLiBUaGUgc2FtZVxuICAgICAgLy8gZXhwbGljaXQgbG9jYXRpb25LaW5kIHJpZGVzIHRoZSBlZGl0J3MgUFVUIChNNSkg4oCUIHRoZSBiYWNrZW5kJ3NcbiAgICAgIC8vIGNyZWF0ZS91cGRhdGUgY29uc3RyYWludCBwYXRoIGlzIHNoYXJlZC5cbiAgICAgIGxvY2F0aW9uS2luZDogdGhpcy5wcml2YXRlTG9jYXRpb24oKS52YWx1ZSA/ICdQUklWQVRFJyA6ICdQVUJMSUMnLFxuICAgIH07XG4gICAgY29uc3QgZGVzY3JpcHRpb24gPSB0aGlzLmRlc2NyaXB0aW9uKCkudmFsdWUudHJpbSgpO1xuICAgIGlmIChkZXNjcmlwdGlvbiAhPT0gJycpIHtcbiAgICAgIHJlcXVlc3QuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcbiAgICB9XG4gICAgY29uc3QgY2FwYWNpdHkgPSB0aGlzLmNhcGFjaXR5KCkudmFsdWU7XG4gICAgaWYgKHR5cGVvZiBjYXBhY2l0eSA9PT0gJ251bWJlcicgJiYgTnVtYmVyLmlzSW50ZWdlcihjYXBhY2l0eSkpIHtcbiAgICAgIHJlcXVlc3QuY2FwYWNpdHkgPSBjYXBhY2l0eTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgLy8gQ3JlYXRpb246IFBPU1QgL2FwaS9zaGVsdGVyczsgZWRpdDogUFVUIC9hcGkvc2hlbHRlcnMve2lkfSB3aXRoIHRoZVxuICAgICAgLy8gU0FNRSBwYXlsb2FkIHNoYXBlICh0aGUgYmFja2VuZCByZS1jaGVja3MgaWRlbnRpY2FsIGNvbnN0cmFpbnRzKS5cbiAgICAgIGNvbnN0IHJlc3VsdCA9XG4gICAgICAgIGVkaXRJZCA9PT0gbnVsbCA/IGF3YWl0IHRoaXMuZ2F0ZXdheS5jcmVhdGUocmVxdWVzdCkgOiBhd2FpdCB0aGlzLmdhdGV3YXkudXBkYXRlKGVkaXRJZCwgcmVxdWVzdCk7XG4gICAgICAvLyBObyBuYXZpZ2F0aW9uOiB0aGUgcm93IGlzIHB1YmxpYyBOT1cgKE5FVyBzdGF0ZSDigJQgYW4gZWRpdCBrZWVwcyB0aGVcbiAgICAgIC8vIHJvdydzIHN0YXR1cywgc28gYSBwdWJsaXNoZWQgc2hlbHRlciBzdGF5cyBwdWJsaXNoZWQpIOKAlCB0aGUgc3VjY2Vzc1xuICAgICAgLy8gcGFuZWwgbGlua3MgdG8gdGhlIChhbHJlYWR5IGxpdmUpIGRldGFpbCBwYWdlLlxuICAgICAgdGhpcy5zdWJtaXR0ZWQuc2V0KHJlc3VsdCk7XG4gICAgfSBjYXRjaCAoZmFpbHVyZTogdW5rbm93bikge1xuICAgICAgLy8gSW5wdXQgcHJlc2VydmVkIG9uIHB1cnBvc2Ug4oCUIHRoZSB1c2VyIGZpeGVzIHRoZSBiYWNrZW5kJ3MgY29tcGxhaW50XG4gICAgICAvLyBhbmQgcmV0cmllcy4gNDAzIChjbGFpbSBsYXBzZWQgc2luY2UgdGhlIGd1YXJkIHJhbikgZ2V0cyBhIC92ZXJpZnkgbGluay5cbiAgICAgIGNvbnN0IGFwaSA9IHRvQXBpRXJyb3IoZmFpbHVyZSk7XG4gICAgICB0aGlzLmVycm9yLnNldChiYW5uZXJNZXNzYWdlKGZhaWx1cmUsICdzaGVsdGVyJywgKGtleSkgPT4gdGhpcy5pMThuLnQoa2V5KSkpO1xuICAgICAgdGhpcy52ZXJpZnlMaW5rLnNldChhcGkuc3RhdHVzID09PSA0MDMpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLnBlbmRpbmcuc2V0KGZhbHNlKTtcbiAgICB9XG4gIH1cbn1cbiIsIjxzZWN0aW9uIGNsYXNzPVwic3VibWl0LXBhZ2VcIj5cbiAgPGEgcm91dGVyTGluaz1cIi9tYXBcIiBjbGFzcz1cImJhY2stbGlua1wiPiZsYXJyOyB7eyAnc3VibWl0LmJhY2tUb01hcCcgfCB0IH19PC9hPlxuXG4gIDxoZWFkZXI+XG4gICAgQGlmIChlZGl0TW9kZSgpKSB7XG4gICAgICA8IS0tIEVkaXQgbW9kZSAoTTUpOiB0aGUgaGVhZGluZyBuYW1lcyB0aGUgbW9kZSDigJQgdGhpcyBpcyBhIHNhdmUgb2YgYW5cbiAgICAgICAgICAgZXhpc3Rpbmcgc2hlbHRlciwgbm90IGEgbmV3IHN1Ym1pc3Npb24uICdhY2NvdW50LmVkaXQnICgnRWRpdCcpIGlzXG4gICAgICAgICAgIHRoZSBleGlzdGluZyBjYXRhbG9nIGtleTsgYSBkZWRpY2F0ZWQgJ3N1Ym1pdC5lZGl0VGl0bGUnIHdvdWxkIGJlXG4gICAgICAgICAgIHRoZSBiZXR0ZXIgZml0IG9uY2UgdGhlIGkxOG4gbGFuZSBsYW5kcyBpdCAocmVwb3J0ZWQsIG5vdCBhZGRlZCkuXG4gICAgICAgICAgIFRoZSBzdWJ0aXRsZSBpcyBjcmVhdGUtbW9kZSBjb3B5IChcIkFkZCDigKZcIikg4oCUIGhpZGRlbiBpbiBlZGl0LiAtLT5cbiAgICAgIDxoMSBjbGFzcz1cInBhZ2UtdGl0bGVcIj57eyAnYWNjb3VudC5lZGl0JyB8IHQgfX08L2gxPlxuICAgIH0gQGVsc2Uge1xuICAgICAgPGgxIGNsYXNzPVwicGFnZS10aXRsZVwiPnt7ICdzdWJtaXQudGl0bGUnIHwgdCB9fTwvaDE+XG4gICAgICA8cCBjbGFzcz1cInBhZ2Utc3VidGl0bGVcIj57eyAnc3VibWl0LnN1YnRpdGxlJyB8IHQgfX08L3A+XG4gICAgfVxuICA8L2hlYWRlcj5cblxuICA8YXBwLWJhbm5lciBzZXZlcml0eT1cImVycm9yXCIgW21lc3NhZ2VdPVwiZXJyb3IoKVwiIC8+XG5cbiAgPCEtLSBTdWNjZXNzIHBhbmVsIChjb21tdW5pdHktcmV2aWV3LXF1ZXVlKTogdGhlIHJvdyBpcyBwdWJsaWMgTk9XIChORVdcbiAgICAgICBzdGF0ZSkg4oCUIG5vIFwiYXdhaXRpbmcgcmV2aWV3XCI7IHRoZSBwYW5lbCBsaW5rcyB0byB0aGUgbGl2ZSBkZXRhaWxcbiAgICAgICBwYWdlLiBUaGUgZm9ybSBzdGF5cyBmb3IgYSBzZWNvbmQgc3VibWlzc2lvbi4gSW4gZWRpdCBtb2RlIChNNSkgdGhlXG4gICAgICAgc2FtZSBwYW5lbCBJUyB0aGUgc2F2ZSBjb25maXJtYXRpb246IHRoZSBlZGl0IHB1Ymxpc2hlcyBpbW1lZGlhdGVseVxuICAgICAgIGFuZCBjYXJyaWVzIHRoZSBzYW1lIE5FVyAocGVuZGluZy12ZXJpZmljYXRpb24pIHN0YXRlIGEgbmV3XG4gICAgICAgc3VibWlzc2lvbiBnZXRzLiAtLT5cbiAgQGlmIChzdWJtaXR0ZWQoKTsgYXMgY3JlYXRlZCkge1xuICAgIDxkaXYgY2xhc3M9XCJzdWJtaXQtc3VjY2Vzc1wiIHJvbGU9XCJzdGF0dXNcIj5cbiAgICAgIDxwPnt7ICdzdWJtaXQuc3VjY2Vzc0JvZHknIHwgdCB9fTwvcD5cbiAgICAgIDxwIGNsYXNzPVwic3VibWl0LXN1Y2Nlc3NfX2xpbmtzXCI+XG4gICAgICAgIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3NoZWx0ZXJzJywgY3JlYXRlZC5pZF1cIj57eyAnc3VibWl0LnN1Y2Nlc3Mudmlld0xvY2F0aW9uJyB8IHQgfX08L2E+XG4gICAgICAgIDxhIHJvdXRlckxpbms9XCIvYWNjb3VudFwiPnt7ICdzdWJtaXQuc3VjY2Vzcy52aWV3Q29udHJpYnV0aW9ucycgfCB0IH19PC9hPlxuICAgICAgPC9wPlxuICAgIDwvZGl2PlxuICB9XG4gIEBpZiAodmVyaWZ5TGluaygpKSB7XG4gICAgPHAgY2xhc3M9XCJ2ZXJpZnktaGludFwiPlxuICAgICAge3sgJ3N1Ym1pdC52ZXJpZnlIaW50JyB8IHQgfX1cbiAgICAgIDxhIHJvdXRlckxpbms9XCIvdmVyaWZ5XCI+e3sgJ3N1Ym1pdC52ZXJpZnlIaW50LmxpbmsnIHwgdCB9fTwvYT5cbiAgICA8L3A+XG4gIH1cblxuICA8IS0tIEVkaXQtbW9kZSBzdGF0ZXMgKE01KTogd2hpbGUgdGhlID9lZGl0IHJvdyBsb2Fkczsgd2hlbiB0aGUgaWQgaXMgbm90XG4gICAgICAgdGhlIGNhbGxlcidzIChvciB0aGUgcGFyYW0gaXMgbWFsZm9ybWVkKSDigJQgdGhlIG5vdC1mb3VuZCBzdGF0ZSwgbmV2ZXJcbiAgICAgICBhIHByZWZpbGwgb2Ygc29tZW9uZSBlbHNlJ3Mgc2hlbHRlci4gKEEgL21pbmUgTE9BRCBGQUlMVVJFIHJlbmRlcnNcbiAgICAgICBuZWl0aGVyIOKAlCB0aGUgZXJyb3IgYmFubmVyIGFib3ZlIGNhcnJpZXMgdGhlIG1lc3NhZ2UgYW5kIG5vIGZvcm0gY2FuXG4gICAgICAgUFVUIHdpdGhvdXQgdGhlIHJvdydzIGlkLikgLS0+XG4gIEBpZiAoZWRpdE1vZGUoKSAmJiBlZGl0TG9hZGluZygpKSB7XG4gICAgPGFwcC1sb2FkaW5nLWluZGljYXRvciBjbGFzcz1cInN1Ym1pdC1zdGF0ZVwiIFttZXNzYWdlXT1cIidhY2NvdW50LmNvbnRyaWIubG9hZGluZycgfCB0XCIgLz5cbiAgfSBAZWxzZSBpZiAoZWRpdE1vZGUoKSAmJiBlZGl0TWlzc2luZygpKSB7XG4gICAgPGRpdiBjbGFzcz1cImVkaXQtbm90LWZvdW5kXCIgcm9sZT1cInN0YXR1c1wiPlxuICAgICAgPGgyIGNsYXNzPVwiZWRpdC1ub3QtZm91bmRfX3RpdGxlXCI+e3sgJ2RldGFpbC5ub3RGb3VuZFRpdGxlJyB8IHQgfX08L2gyPlxuICAgICAgPHA+e3sgJ2RldGFpbC5ub3RGb3VuZEJvZHknIHwgdCB9fTwvcD5cbiAgICAgIDxwIGNsYXNzPVwiZWRpdC1ub3QtZm91bmRfX2xpbmtzXCI+XG4gICAgICAgIDxhIHJvdXRlckxpbms9XCIvYWNjb3VudFwiPnt7ICdzdWJtaXQuc3VjY2Vzcy52aWV3Q29udHJpYnV0aW9ucycgfCB0IH19PC9hPlxuICAgICAgPC9wPlxuICAgIDwvZGl2PlxuICB9IEBlbHNlIGlmIChzaG93Rm9ybSgpKSB7XG4gIDxmb3JtIGNsYXNzPVwic3VibWl0LWZvcm1cIiBbZm9ybUdyb3VwXT1cImZvcm1cIiAobmdTdWJtaXQpPVwic3VibWl0KClcIj5cbiAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgIDxsYWJlbCBmb3I9XCJzaGVsdGVyLW5hbWVcIj57eyAnc3VibWl0Lm5hbWVMYWJlbCcgfCB0IH19PC9sYWJlbD5cbiAgICAgIDxpbnB1dFxuICAgICAgICBpZD1cInNoZWx0ZXItbmFtZVwiXG4gICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgZm9ybUNvbnRyb2xOYW1lPVwibmFtZVwiXG4gICAgICAgIG1heGxlbmd0aD1cIjIwMFwiXG4gICAgICAgIFtwbGFjZWhvbGRlcl09XCInc3VibWl0Lm5hbWVQbGFjZWhvbGRlcicgfCB0XCJcbiAgICAgICAgYXV0b2NvbXBsZXRlPVwib2ZmXCJcbiAgICAgIC8+XG4gICAgICBAaWYgKG5hbWUoKS50b3VjaGVkICYmIG5hbWUoKS5pbnZhbGlkKSB7XG4gICAgICAgIDwhLS0gJ21heGxlbmd0aCcgKGxvd2VyY2FzZSkgaXMgQW5ndWxhcidzIE1heExlbmd0aFZhbGlkYXRvciBlcnJvciBrZXkuIC0tPlxuICAgICAgICA8cCBjbGFzcz1cImZpZWxkLWVycm9yXCI+XG4gICAgICAgICAge3tcbiAgICAgICAgICAgIG5hbWUoKS5lcnJvcnM/LlsnbWF4bGVuZ3RoJ11cbiAgICAgICAgICAgICAgPyAoJ3N1Ym1pdC5uYW1lLnRvb0xvbmcnIHwgdClcbiAgICAgICAgICAgICAgOiAoJ3N1Ym1pdC5uYW1lLnJlcXVpcmVkJyB8IHQpXG4gICAgICAgICAgfX1cbiAgICAgICAgPC9wPlxuICAgICAgfVxuICAgIDwvZGl2PlxuXG4gICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICA8bGFiZWwgZm9yPVwic2hlbHRlci1kZXNjcmlwdGlvblwiPnt7ICdzdWJtaXQuZGVzY3JpcHRpb25MYWJlbCcgfCB0IH19PC9sYWJlbD5cbiAgICAgIDx0ZXh0YXJlYVxuICAgICAgICBpZD1cInNoZWx0ZXItZGVzY3JpcHRpb25cIlxuICAgICAgICBmb3JtQ29udHJvbE5hbWU9XCJkZXNjcmlwdGlvblwiXG4gICAgICAgIG1heGxlbmd0aD1cIjIwMDBcIlxuICAgICAgICBbcGxhY2Vob2xkZXJdPVwiJ3N1Ym1pdC5kZXNjcmlwdGlvblBsYWNlaG9sZGVyJyB8IHRcIlxuICAgICAgPjwvdGV4dGFyZWE+XG4gICAgICBAaWYgKGRlc2NyaXB0aW9uKCkuaW52YWxpZCAmJiBkZXNjcmlwdGlvbigpLnRvdWNoZWQpIHtcbiAgICAgICAgPHAgY2xhc3M9XCJmaWVsZC1lcnJvclwiPnt7ICdzdWJtaXQuZGVzY3JpcHRpb24udG9vTG9uZycgfCB0IH19PC9wPlxuICAgICAgfVxuICAgIDwvZGl2PlxuXG4gICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICA8bGFiZWwgZm9yPVwic2hlbHRlci1jYXBhY2l0eVwiPnt7ICdzdWJtaXQuY2FwYWNpdHlMYWJlbCcgfCB0IH19PC9sYWJlbD5cbiAgICAgIDxpbnB1dFxuICAgICAgICBpZD1cInNoZWx0ZXItY2FwYWNpdHlcIlxuICAgICAgICB0eXBlPVwibnVtYmVyXCJcbiAgICAgICAgbWluPVwiMVwiXG4gICAgICAgIG1heD1cIjEwMDAwMFwiXG4gICAgICAgIHN0ZXA9XCIxXCJcbiAgICAgICAgZm9ybUNvbnRyb2xOYW1lPVwiY2FwYWNpdHlcIlxuICAgICAgICBbcGxhY2Vob2xkZXJdPVwiJ3N1Ym1pdC5jYXBhY2l0eVBsYWNlaG9sZGVyJyB8IHRcIlxuICAgICAgLz5cbiAgICAgIDwhLS0gVGhlIHJhbmdlIGlzIGl0cyBPV04gaGludCBsaW5lIChzdWJtaXQuY2FwYWNpdHlIaW50KSBzbyBhIG5hcnJvd1xuICAgICAgICAgICBjb2x1bW4gY2FuJ3QgYnJlYWsgaXQgbWlkLXJhbmdlIChpMThuLWV0LWVuKTsgdGhlIGxhYmVsIGFib3ZlIGlzXG4gICAgICAgICAgIGp1c3QgXCJDYXBhY2l0eSAob3B0aW9uYWwpXCIuIFNoYXJlZCB3aXRoIHRoZSAvYWNjb3VudCBwYW5lbC4gLS0+XG4gICAgICA8cCBjbGFzcz1cImZpZWxkLW5vdGVcIj57eyAnc3VibWl0LmNhcGFjaXR5SGludCcgfCB0IH19PC9wPlxuICAgICAgQGlmIChjYXBhY2l0eSgpLmludmFsaWQgJiYgY2FwYWNpdHkoKS50b3VjaGVkKSB7XG4gICAgICAgIDxwIGNsYXNzPVwiZmllbGQtZXJyb3JcIj57eyAnc3VibWl0LmNhcGFjaXR5LmludmFsaWQnIHwgdCB9fTwvcD5cbiAgICAgIH1cbiAgICA8L2Rpdj5cblxuICAgIDwhLS0gVGhlIHByaXZhdGUtaG9tZSBkZWNsYXJhdGlvbiAoY29tbXVuaXR5LXJldmlldy1xdWV1ZSBENyk6IGRlZmF1bHRcbiAgICAgICAgIHVuY2hlY2tlZCA9IFBVQkxJQy4gVGhlIHJvdyBzdGF5cyBhIHB1YmxpYyByZXN1bHQ7IHRoZSBkZWNsYXJhdGlvblxuICAgICAgICAgYWRkcyB0aGUgXCJQcml2YXRlIGxvY2F0aW9uXCIgYmFkZ2UgKyB0aGUgcmVzaWRlbnQtb2ZmZXJlZCBub3RlLiAtLT5cbiAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgIDxsYWJlbCBjbGFzcz1cImNoZWNrYm94LWZpZWxkXCIgZm9yPVwic2hlbHRlci1wcml2YXRlXCI+XG4gICAgICAgIDxpbnB1dCBpZD1cInNoZWx0ZXItcHJpdmF0ZVwiIHR5cGU9XCJjaGVja2JveFwiIGZvcm1Db250cm9sTmFtZT1cInByaXZhdGVMb2NhdGlvblwiIC8+XG4gICAgICAgIHt7ICdzdWJtaXQucHJpdmF0ZUxhYmVsJyB8IHQgfX1cbiAgICAgIDwvbGFiZWw+XG4gICAgPC9kaXY+XG5cbiAgICA8ZmllbGRzZXQgY2xhc3M9XCJmaWVsZCBsb2NhdGlvbi1maWVsZFwiPlxuICAgICAgPGxlZ2VuZD57eyAnc3VibWl0LmxvY2F0aW9uTGVnZW5kJyB8IHQgfX08L2xlZ2VuZD5cbiAgICAgIDxwIGNsYXNzPVwiZmllbGQtbm90ZVwiPnt7ICdzdWJtaXQubG9jYXRpb25Ob3RlJyB8IHQgfX08L3A+XG4gICAgICA8ZGl2ICNtYXBFbCBjbGFzcz1cInN1Ym1pdC1tYXBcIj48L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzcz1cImxvY2F0aW9uLXNtYXJ0XCI+XG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxvY2F0aW9uLWxhYmVsXCIgZm9yPVwic2hlbHRlci1sb2NhdGlvbi1pbnB1dFwiPnt7XG4gICAgICAgICAgJ3N1Ym1pdC5sb2NhdGlvbkxhYmVsJyB8IHRcbiAgICAgICAgfX08L2xhYmVsPlxuICAgICAgICA8ZGl2IGNsYXNzPVwibG9jYXRpb24tc21hcnQtcm93XCI+XG4gICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICBpZD1cInNoZWx0ZXItbG9jYXRpb24taW5wdXRcIlxuICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgW3ZhbHVlXT1cImxvY2F0aW9uVGV4dCgpXCJcbiAgICAgICAgICAgIChpbnB1dCk9XCJvbkxvY2F0aW9uVGV4dENoYW5nZSgkZXZlbnQpXCJcbiAgICAgICAgICAgIChrZXlkb3duLmVudGVyKT1cIm9uTG9jYXRpb25TdWJtaXRLZXkoJGV2ZW50KVwiXG4gICAgICAgICAgICBbcGxhY2Vob2xkZXJdPVwiJ3N1Ym1pdC5sb2NhdGlvblBsYWNlaG9sZGVyJyB8IHRcIlxuICAgICAgICAgICAgYXV0b2NvbXBsZXRlPVwib2ZmXCJcbiAgICAgICAgICAgIFtkaXNhYmxlZF09XCJyZXNvbHZpbmdMaW5rKCkgfHwgbG9jYXRpbmcoKVwiXG4gICAgICAgICAgLz5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgIGNsYXNzPVwiYnRuXCJcbiAgICAgICAgICAgIChjbGljayk9XCJhcHBseUxvY2F0aW9uSW5wdXQoKVwiXG4gICAgICAgICAgICBbZGlzYWJsZWRdPVwicmVzb2x2aW5nTGluaygpIHx8IGxvY2F0aW5nKClcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIHt7IHJlc29sdmluZ0xpbmsoKSA/ICgnc3VibWl0LmxvY2F0aW9uLnJlc29sdmluZycgfCB0KSA6ICgnc3VibWl0LmxvY2F0aW9uLnNldCcgfCB0KSB9fVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHAgY2xhc3M9XCJsb2NhdGlvbi1ub3RlXCI+XG4gICAgICAgICAge3sgJ3N1Ym1pdC5sb2NhdGlvbi5wcmVmaWxsTm90ZScgfCB0IH19XG4gICAgICAgIDwvcD5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzPVwibG9jYXRpb24tc2VhcmNoXCI+XG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxvY2F0aW9uLWxhYmVsXCIgZm9yPVwic2hlbHRlci1hZGRyZXNzLXNlYXJjaFwiPnt7XG4gICAgICAgICAgJ3N1Ym1pdC5hZGRyZXNzTGFiZWwnIHwgdFxuICAgICAgICB9fTwvbGFiZWw+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJsb2NhdGlvbi1zZWFyY2gtcm93XCI+XG4gICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICBpZD1cInNoZWx0ZXItYWRkcmVzcy1zZWFyY2hcIlxuICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgW3ZhbHVlXT1cImFkZHJlc3NRdWVyeSgpXCJcbiAgICAgICAgICAgIChpbnB1dCk9XCJvbkFkZHJlc3NRdWVyeUNoYW5nZSgkZXZlbnQpXCJcbiAgICAgICAgICAgIChrZXlkb3duLmVudGVyKT1cIm9uQWRkcmVzc1NlYXJjaEtleSgkZXZlbnQpXCJcbiAgICAgICAgICAgIFtwbGFjZWhvbGRlcl09XCInc3VibWl0LmFkZHJlc3NQbGFjZWhvbGRlcicgfCB0XCJcbiAgICAgICAgICAgIGF1dG9jb21wbGV0ZT1cIm9mZlwiXG4gICAgICAgICAgICBbZGlzYWJsZWRdPVwic2VhcmNoaW5nKClcIlxuICAgICAgICAgIC8+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG5cIiAoY2xpY2spPVwic3RhcnRBZGRyZXNzU2VhcmNoKClcIiBbZGlzYWJsZWRdPVwic2VhcmNoaW5nKClcIj5cbiAgICAgICAgICAgIHt7IHNlYXJjaGluZygpID8gKCdzdWJtaXQuc2VhcmNoaW5nJyB8IHQpIDogKCdzdWJtaXQuc2VhcmNoJyB8IHQpIH19XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8cCBjbGFzcz1cImxvY2F0aW9uLWF0dHJpYnV0aW9uXCI+XG4gICAgICAgICAge3sgJ3N1Ym1pdC5hdHRyaWJ1dGlvbkxlYWQnIHwgdCB9fVxuICAgICAgICAgIDxhIGhyZWY9XCJodHRwczovL3d3dy5vcGVuc3RyZWV0bWFwLm9yZy9jb3B5cmlnaHRcIiB0YXJnZXQ9XCJfYmxhbmtcIiByZWw9XCJub29wZW5lclwiPnt7XG4gICAgICAgICAgICAnc3VibWl0Lm9zbUF0dHJpYnV0aW9uJyB8IHRcbiAgICAgICAgICB9fTwvYT5cbiAgICAgICAgPC9wPlxuICAgICAgICBAaWYgKGFkZHJlc3NSZXN1bHRzKCkubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgPHVsIGNsYXNzPVwiYWRkcmVzcy1yZXN1bHRzXCI+XG4gICAgICAgICAgICBAZm9yIChyZXN1bHQgb2YgYWRkcmVzc1Jlc3VsdHMoKTsgdHJhY2sgcmVzdWx0LmRpc3BsYXlOYW1lKSB7XG4gICAgICAgICAgICAgIDxsaT5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImFkZHJlc3MtcmVzdWx0XCIgKGNsaWNrKT1cInNlbGVjdEFkZHJlc3NSZXN1bHQocmVzdWx0KVwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJhZGRyZXNzLXJlc3VsdF9fbmFtZVwiPnt7IHJlc3VsdC5kaXNwbGF5TmFtZSB9fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYWRkcmVzcy1yZXN1bHRfX3R5cGVcIj57eyByZXN1bHQudHlwZSB9fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICA8L3VsPlxuICAgICAgICB9XG4gICAgICAgIEBpZiAoYWRkcmVzc0Vycm9yVGV4dCgpOyBhcyBhZGRyZXNzRXJyb3JNc2cpIHtcbiAgICAgICAgICBAaWYgKGFkZHJlc3NFcnJvcigpID09PSAnbm8tcmVzdWx0cycpIHtcbiAgICAgICAgICAgIDxwIGNsYXNzPVwibG9jYXRpb24tbm90ZVwiPnt7IGFkZHJlc3NFcnJvck1zZyB9fTwvcD5cbiAgICAgICAgICB9IEBlbHNlIHtcbiAgICAgICAgICAgIDxwIGNsYXNzPVwiZmllbGQtZXJyb3JcIiByb2xlPVwiYWxlcnRcIj57eyBhZGRyZXNzRXJyb3JNc2cgfX08L3A+XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICA8L2Rpdj5cblxuICAgICAgPGRpdiBjbGFzcz1cImxvY2F0aW9uLWFjdGlvbnNcIj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzPVwiYnRuXCJcbiAgICAgICAgICAoY2xpY2spPVwidXNlTXlMb2NhdGlvbigpXCJcbiAgICAgICAgICBbZGlzYWJsZWRdPVwibG9jYXRpbmcoKSB8fCByZXNvbHZpbmdMaW5rKClcIlxuICAgICAgICA+XG4gICAgICAgICAge3sgbG9jYXRpbmcoKSA/ICgnc3VibWl0LmxvY2F0aW5nJyB8IHQpIDogKCdzdWJtaXQudXNlTXlMb2NhdGlvbicgfCB0KSB9fVxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8IS0tIEQ2IChtYXAtY3Jpc2lzLWFjdGlvbnMpOiB0aGUgc2hhcmVkIC5udW0tdGFidWxhciBjbGFzcyBrZWVwcyB0aGVcbiAgICAgICAgICAgY29vcmRpbmF0ZSBmaWd1cmVzIGZyb20gc2hpZnRpbmcgd2hpbGUgdGhleSB1cGRhdGUuIC0tPlxuICAgICAgPHAgY2xhc3M9XCJsb2NhdGlvbi1yZWFkb3V0IG51bS10YWJ1bGFyXCIgW2NsYXNzLmxvY2F0aW9uLXJlYWRvdXQtLWVtcHR5XT1cImxvY2F0aW9uKCkgPT09IG51bGxcIj5cbiAgICAgICAge3sgbG9jYXRpb25SZWFkb3V0KCkgfX1cbiAgICAgIDwvcD5cbiAgICAgIEBpZiAobG9jYXRpb25IaW50KCk7IGFzIGxvY2F0aW9uSGludFRleHQpIHtcbiAgICAgICAgPHAgY2xhc3M9XCJsb2NhdGlvbi1oaW50XCI+e3sgbG9jYXRpb25IaW50VGV4dCB9fTwvcD5cbiAgICAgIH1cbiAgICAgIEBpZiAobG9jYXRpb25FcnJvclRleHQoKTsgYXMgbG9jYXRpb25FcnJvck1zZykge1xuICAgICAgICA8cCBjbGFzcz1cImZpZWxkLWVycm9yXCIgcm9sZT1cImFsZXJ0XCI+e3sgbG9jYXRpb25FcnJvck1zZyB9fTwvcD5cbiAgICAgIH1cbiAgICA8L2ZpZWxkc2V0PlxuXG4gICAgPCEtLSBUaGUgc3VibWl0IGJ1dHRvbjogY3JlYXRlIG1vZGUgc2F5cyBcIlN1Ym1pdCBzaGVsdGVyXCIgKGEgbmV3IHJvdyk7XG4gICAgICAgICBlZGl0IG1vZGUgKE01KSBzYXlzIFwiU2F2ZSBjaGFuZ2VzXCIg4oCUIHRoaXMgaXMgYSBzYXZlLCBub3QgYSBuZXdcbiAgICAgICAgIHN1Ym1pc3Npb24uIFRoZSBwZW5kaW5nIGNvcHkgbWF0Y2hlcyB0aGUgbW9kZSAoJ1NhdmluZ+KApicpLiAtLT5cbiAgICA8YnV0dG9uIHR5cGU9XCJzdWJtaXRcIiBjbGFzcz1cImJ0biBidG4tLXByaW1hcnlcIiBbZGlzYWJsZWRdPVwicGVuZGluZygpIHx8IGVkaXRMb2FkaW5nKClcIj5cbiAgICAgIHt7XG4gICAgICAgIHBlbmRpbmcoKVxuICAgICAgICAgID8gKGVkaXRNb2RlKCkgPyAoJ2FjY291bnQuc2F2aW5nJyB8IHQpIDogKCdzdWJtaXQuc3VibWl0dGluZycgfCB0KSlcbiAgICAgICAgICA6IChlZGl0TW9kZSgpID8gKCdhY2NvdW50LnNhdmUnIHwgdCkgOiAoJ3N1Ym1pdC5zdWJtaXQnIHwgdCkpXG4gICAgICB9fVxuICAgIDwvYnV0dG9uPlxuICA8L2Zvcm0+XG4gIH1cbjwvc2VjdGlvbj5cbiIsImltcG9ydCB7IGluamVjdCwgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgbGFzdFZhbHVlRnJvbSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgQXBpQ2xpZW50IH0gZnJvbSAnLi4vY29yZS9hcGktY2xpZW50JztcbmltcG9ydCB0eXBlIHsgTG9jYXRpb25SZXNvbHZlZCB9IGZyb20gJy4uL2NvcmUvbW9kZWxzJztcblxuLyoqXG4gKiBUaGUgZG9vciB0byB0aGUgL2FwaS9nZW8gY29udHJvbGxlciBncm91cCAoc2hlbHRlci1sb2NhdGlvbi1pbnB1dCkg4oCUIGtlcHRcbiAqIFNFUEFSQVRFIGZyb20gU2hlbHRlckdhdGV3YXkgb24gcHVycG9zZTogaXQgbWFwcyB0byBpdHMgb3duIGNvbnRyb2xsZXJcbiAqIChMb2NhdGlvbkNvbnRyb2xsZXIpIHdpdGggaXRzIG93biBhdXRoL3JhdGUtbGltaXQgcG9saWN5LCBhbmQgZ2F0ZXdheXNcbiAqIHN0YXkgb25lLXBlci1jb250cm9sbGVyLWdyb3VwICgwMS1UQVNLLm1kIMKnNCkuXG4gKlxuICogVGhpcyBpcyB0aGUgT05MWSBuZXR3b3JrIGNhbGwgdGhlIC9zdWJtaXQgbG9jYXRpb24gc2VjdGlvbiBtYWtlczogR29vZ2xlXG4gKiBzaG9ydCBsaW5rcyAobWFwcy5hcHAuZ29vLmdsKSBhcmUgb3BhcXVlIHJlZGlyZWN0cyB0aGUgY2xpZW50IGNhbm5vdFxuICogZm9sbG93IChDT1JTKSwgc28gdGhlIGJhY2tlbmQgcmVzb2x2ZXMgdGhlbS4gTG9uZy1mb3JtIG1hcCBVUkxzIG5ldmVyIGhpdFxuICogdGhpcyBlbmRwb2ludCDigJQgdGhleSBhcmUgcGFyc2VkIGNsaWVudC1zaWRlIChzaGFyZWQvbG9jYXRpb24taW5wdXQudHMpLlxuICovXG5ASW5qZWN0YWJsZSh7IHByb3ZpZGVkSW46ICdyb290JyB9KVxuZXhwb3J0IGNsYXNzIEdlb0dhdGV3YXkge1xuICBwcml2YXRlIHJlYWRvbmx5IGFwaSA9IGluamVjdChBcGlDbGllbnQpO1xuXG4gIC8qKlxuICAgKiBQT1NUIC9hcGkvZ2VvL3Jlc29sdmUgd2l0aCB7dXJsfSAtPiBMb2NhdGlvblJlc29sdmVkICgyMDA6XG4gICAqIHtsYXRpdHVkZSwgbG9uZ2l0dWRlfSkuIEpXVC1wcm90ZWN0ZWQgKDQwMSB1bmF1dGhlbnRpY2F0ZWQpLCBwZXItSVBcbiAgICogcmF0ZS1saW1pdGVkIHRvIDUgcmVxdWVzdHMvbWludXRlICg0MjkpLiA0MDAgPSBvbmUgZ2VuZXJpYyBub3QtZm91bmRcbiAgICogbWVzc2FnZSAobm8gcGFpciAvIG91dHNpZGUgRXN0b25pYSAvIG5vbi13aGl0ZWxpc3RlZCBob3N0IOKAlCB0aGUgYmFja2VuZFxuICAgKiBuZXZlciBlbnVtZXJhdGVzKSwgNTAyID0gZ2VuZXJpYyB1cHN0cmVhbSBmYWlsdXJlLlxuICAgKi9cbiAgcmVzb2x2ZSh1cmw6IHN0cmluZyk6IFByb21pc2U8TG9jYXRpb25SZXNvbHZlZD4ge1xuICAgIHJldHVybiBsYXN0VmFsdWVGcm9tKHRoaXMuYXBpLnBvc3Q8TG9jYXRpb25SZXNvbHZlZD4oJy9hcGkvZ2VvL3Jlc29sdmUnLCB7IHVybCB9KSk7XG4gIH1cbn1cbiIsIi8qKlxuICogUHVyZSB0ZXh0IC0+IGNvb3JkaW5hdGVzIHBhcnNpbmcgZm9yIHRoZSAvc3VibWl0IHNtYXJ0IGxvY2F0aW9uIGlucHV0XG4gKiAob3BlbnNwZWMgY2hhbmdlIGBzaGVsdGVyLWxvY2F0aW9uLWlucHV0YCkuXG4gKlxuICogVGhlIHNpbmdsZSBjbGllbnQtc2lkZSBhdXRob3JpdHkgZm9yIFwidGV4dCAtPiBjb29yZGluYXRlc1wiOiBjb29yZGluYXRlXG4gKiBzdHJpbmdzLCBETVMgc3RyaW5ncywgYW5kIGxvbmctZm9ybSBtYXAgVVJMcyAoR29vZ2xlL0FwcGxlL0JpbmcpIGFsbCBnb1xuICogdGhyb3VnaCBgcGFyc2VMb2NhdGlvbklucHV0YC4gSXQgaXMgUFVSRSDigJQgbm8gRE9NLCBubyBuZXR3b3JrLCBubyBpbXBvcnRzXG4gKiDigJQgc28gdGhlIGJhY2tlbmQncyByZXNvbHZlciBjYW4gbWlycm9yIHRoZSBleGFjdCBzYW1lIGNhc2UgdGFibGVcbiAqIChkZXNpZ24gZGVjaXNpb24gMTogb25lIHNoYXJlZCBwdXJlIHBhcnNlcjsgc2FtZSBmaXh0dXJlcyBib3RoIHNpZGVzKS5cbiAqXG4gKiBJdCBkb2VzIG5vdCBpbXBvcnQgdGhlIGJib3ggZnJvbSBsZWFmbGV0LXNlcnZpY2U6IHRoaXMgaGVscGVyXG4gKiBtdXN0IHN0YXkgZGVwZW5kZW5jeS1mcmVlIChsZWFmbGV0LXNlcnZpY2UgcHVsbHMgdGhlIGxlYWZsZXQgbnBtIHBhY2thZ2UpLlxuICogVGhlIGJvdW5kcyBtaXJyb3IgdGhlIGJhY2tlbmQncyBHZW9Qb2ludC5pbkVzdG9uaWEgKDU3LjUtNTkuNyAvIDIxLjUtMjguMilcbiAqIGFuZCB0aGUgY2xpZW50LXNpZGUgRVNUT05JQV9CT1VORFMg4oCUIHRoZSBiYWNrZW5kIHJlLWNoZWNrcyBlaXRoZXIgd2F5LlxuICovXG5cbi8qKiBFc3RvbmlhIGJvdW5kaW5nIGJveCDigJQgbWlycm9yIG9mIEdlb1BvaW50LmluRXN0b25pYSAvIEVTVE9OSUFfQk9VTkRTLiAqL1xuZXhwb3J0IGNvbnN0IEVTVE9OSUFfUEFSU0VfQk9VTkRTID0ge1xuICBtaW5MYXQ6IDU3LjUsXG4gIG1heExhdDogNTkuNyxcbiAgbWluTG5nOiAyMS41LFxuICBtYXhMbmc6IDI4LjIsXG59IGFzIGNvbnN0O1xuXG4vKiogVGhlIG9uZSBwYXJzZSByZXN1bHQ6IGEgKHBvc3NpYmx5IGF1dG8tc3dhcHBlZCkgcGFpciwgb3IgYSBzcGVjaWZpYyBmYWlsdXJlIHJlYXNvbi4gKi9cbmV4cG9ydCB0eXBlIFBhcnNlTG9jYXRpb25SZXN1bHQgPVxuICB8IHtcbiAgICAgIGxhdGl0dWRlOiBudW1iZXI7XG4gICAgICBsb25naXR1ZGU6IG51bWJlcjtcbiAgICAgIC8qKiBUcnVlIHdoZW4gKGxuZywgbGF0KSB3YXMgZGV0ZWN0ZWQgYW5kIHRoZSB2YWx1ZXMgd2VyZSBhdXRvLXN3YXBwZWQgdG8gKGxhdCwgbG5nKS4gKi9cbiAgICAgIHN3YXBwZWQ/OiBib29sZWFuO1xuICAgIH1cbiAgfCB7XG4gICAgICByZWFzb246ICduby1wYWlyJyB8ICdvdXQtb2YtYm91bmRzJyB8ICdpbnZhbGlkJyB8ICdkZWNpbWFsLWNvbW1hJztcbiAgICAgIC8qKiBTaG9ydCBkaWFnbm9zdGljIChub3QgdXNlci1mYWNpbmcg4oCUIHRoZSBwYWdlIHJlbmRlcnMgcmVhc29uLWJhc2VkIGNvcHkpLiAqL1xuICAgICAgZGV0YWlsPzogc3RyaW5nO1xuICAgIH07XG5cbi8qKiBUcnVlIGZvciB0aGUgRXN0b25pYSBib3g6IHggYXMgbGF0aXR1ZGUsIHkgYXMgbG9uZ2l0dWRlLiAqL1xuZnVuY3Rpb24gaW5Fc3RvbmlhQm94KGxhdGl0dWRlOiBudW1iZXIsIGxvbmdpdHVkZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgTnVtYmVyLmlzRmluaXRlKGxhdGl0dWRlKSAmJlxuICAgIE51bWJlci5pc0Zpbml0ZShsb25naXR1ZGUpICYmXG4gICAgbGF0aXR1ZGUgPj0gRVNUT05JQV9QQVJTRV9CT1VORFMubWluTGF0ICYmXG4gICAgbGF0aXR1ZGUgPD0gRVNUT05JQV9QQVJTRV9CT1VORFMubWF4TGF0ICYmXG4gICAgbG9uZ2l0dWRlID49IEVTVE9OSUFfUEFSU0VfQk9VTkRTLm1pbkxuZyAmJlxuICAgIGxvbmdpdHVkZSA8PSBFU1RPTklBX1BBUlNFX0JPVU5EUy5tYXhMbmdcbiAgKTtcbn1cblxuLyoqIEFwcGx5IHRoZSBiYm94IGdhdGUgd2l0aCB0aGUgb3JkZXIgYXV0by1zd2FwIHJ1bGUgKGRlc2lnbiBkZWNpc2lvbiAyZCkuICovXG5mdW5jdGlvbiBnYXRlV2l0aFN3YXAoYTogbnVtYmVyLCBiOiBudW1iZXIpOiBQYXJzZUxvY2F0aW9uUmVzdWx0IHtcbiAgaWYgKGluRXN0b25pYUJveChhLCBiKSkge1xuICAgIHJldHVybiB7IGxhdGl0dWRlOiBhLCBsb25naXR1ZGU6IGIgfTtcbiAgfVxuICBpZiAoaW5Fc3RvbmlhQm94KGIsIGEpKSB7XG4gICAgcmV0dXJuIHsgbGF0aXR1ZGU6IGIsIGxvbmdpdHVkZTogYSwgc3dhcHBlZDogdHJ1ZSB9O1xuICB9XG4gIHJldHVybiB7IHJlYXNvbjogJ291dC1vZi1ib3VuZHMnLCBkZXRhaWw6IGAke2F9LCAke2J9IGlzIG91dHNpZGUgRXN0b25pYSBpbiBib3RoIG9yZGVyc2AgfTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBCdWlsZGluZyBibG9ja3Ncbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5jb25zdCBVUkxfUEFUVEVSTiA9IC9eaHR0cHM/OlxcL1xcL1xcUyskL2k7XG4vKiogQSB0cmltbWVkIG1hcHMuYXBwLmdvby5nbCBzaG9ydCBsaW5rLCB3aXRoIG9yIHdpdGhvdXQgc2NoZW1lICh0aGUgcGFnZSByb3V0ZXMgdGhlc2UgdG8gdGhlIGJhY2tlbmQpLiAqL1xuY29uc3QgR09PX1NIT1JUX0xJTktfUEFUVEVSTiA9IC9eKD86aHR0cHM/OlxcL1xcLyk/bWFwc1xcLmFwcFxcLmdvb1xcLmdsXFwvXFxTKyQvaTtcblxuLyoqIE9uZSBkZWNpbWFsIHBhaXIgc2VwYXJhdGVkIGJ5IGNvbW1hLCBzZW1pY29sb24sIHdoaXRlc3BhY2Ugb3IgJysnIChVUkwtZW5jb2RlZCBzcGFjZSkuICovXG5jb25zdCBQQUlSX1BBVFRFUk4gPSAvKC0/XFxkKyg/OlxcLlxcZCspPylbLFxccys7XSsoLT9cXGQrKD86XFwuXFxkKyk/KS87XG5jb25zdCBERUNJTUFMX1BBVFRFUk4gPSAvLT9cXGQrKD86XFwuXFxkKyk/L2c7XG5cbi8qKiBBIGNvbW1hIHVzZWQgYXMgdGhlIERFQ0lNQUwgbWFyayAodGhlIEVzdG9uaWFuIGxvY2FsZSB3cml0ZXMgNTgsMjUpLiAqL1xuY29uc3QgREVDSU1BTF9DT01NQV9QQVRURVJOID0gL1xcZCssXFxkKy87XG4vKiogQSBwb2ludCB1c2VkIGFzIHRoZSBkZWNpbWFsIG1hcmsgKDU4LjI1KSDigJQgb3IgYSBob3N0L3ZlcnNpb24gbGlrZSAyMTIuNTAgLyB2MS4yLiAqL1xuY29uc3QgUE9JTlRfREVDSU1BTF9QQVRURVJOID0gL1xcZCtcXC5cXGQrLztcblxuLyoqIE9uZSBkZXRhaWwgc3RyaW5nIGZvciBFVkVSWSBkZWNpbWFsLWNvbW1hIHJlamVjdGlvbiAocGxhaW4sIERNUywgbWl4ZWQsXG4gKiAgVVJMKSBzbyB0aGUgcGFnZSBjb3B5IHN0YXlzIGluIHN5bmMuICovXG5jb25zdCBERUNJTUFMX0NPTU1BX0RFVEFJTCA9XG4gICdFc3RvbmlhbiBkZWNpbWFsLWNvbW1hIGRldGVjdGVkIOKAlCB0aGUgY29tbWEgaXMgdGhlIGRlY2ltYWwgbWFyaywgYSBwb2ludCBpcyByZXF1aXJlZCc7XG5cbi8qKlxuICogVGhlIEVzdG9uaWFuIGRlY2ltYWwtY29tbWEgZ3VhcmQgKGRhdGEgaW50ZWdyaXR5KTogdGhlIGFwcCdzIHRhcmdldFxuICogbG9jYWxlIHdyaXRlcyB0aGUgZGVjaW1hbCBtYXJrIGFzIGEgY29tbWEsIGJ1dCB0aGUgcGFpciBncmFtbWFyIG9ubHlcbiAqIHVuZGVyc3RhbmRzIGAuYCBkZWNpbWFscyBhbmQgdHJlYXRzIGAsYCBhcyBhIFNFUEFSQVRPUi4gV2l0aG91dCB0aGlzIGd1YXJkXG4gKiBgNTgsMjUgMjQsOWAgd291bGQgcGFyc2UgYXMgdGhlIGludGVnZXIgcGFpciAoNTgsIDI1KSDigJQgYSBwbGF1c2libGUtYnV0LVxuICogd3JvbmcgcGluIGFib3V0IDI3IGttIG9mZiwgc3RvcmVkIEFDVElWRS4gTmV2ZXIgZ3Vlc3MvY29udmVydCB0aGUgdmFsdWU6XG4gKiB0aGUgaW5wdXQgaXMgcmVmdXNlZCB3aXRoIGl0cyBvd24gcmVhc29uIGFuZCB0aGUgcGFnZSB0ZWxscyB0aGUgdXNlciB0b1xuICogdHlwZSBhIHBvaW50LlxuICpcbiAqIFRoZSBydWxlOiBhIGNvbW1hLWRlY2ltYWwgdG9rZW4gaXMgcHJlc2VudCBBTkQgbm8gcG9pbnQtZGVjaW1hbCBhbnl3aGVyZVxuICogaW4gdGhlIHRleHQuIGA1OS40MzcwLCAyNC43NTM1YCAoY29tbWEgYXMgc2VwYXJhdG9yKSBjYXJyaWVzIGEgcG9pbnQgLT5cbiAqIHBhcnNlcyBub3JtYWxseS4gQSBNSVggb2YgY29tbWEtZGVjaW1hbHMgYW5kIHBvaW50LWRlY2ltYWxzIGFjcm9zcyB0b2tlbnNcbiAqIChgNTksNDM3MCAyNC43NWApIGlzIGNhdWdodCBieSB7QGxpbmsgaGFzTWl4ZWREZWNpbWFsTWFya3N9IGluc3RlYWQg4oCUIHNhbWVcbiAqIHJlYXNvbiwgYW5kIHRoZSBndWFyZCdzIGNvcHkgZXhwbGFpbnMgdGhlIGZpeCB3aGVyZSB0aGUgYmJveCBnYXRlJ3NcbiAqIFwib3V0c2lkZSBFc3RvbmlhXCIgd291bGQgbWlzZGlhZ25vc2UgaXQuIEZvciBVUkxzIHRoZSBob3N0IGFsd2F5c1xuICogY2FycmllcyBkb3RzLCBzbyB0aGUgY2FsbGVyIHJ1bnMgdGhpcyBndWFyZCBvbiB0aGUgc2VnbWVudCB0aGF0IGNhbiBjYXJyeVxuICogY29vcmRpbmF0ZXMgKHNlZSBgdXJsUGFpcmApIHJhdGhlciB0aGFuIHRoZSB3aG9sZSBVUkwuXG4gKi9cbmZ1bmN0aW9uIGRlY2ltYWxDb21tYUZhaWx1cmUodGV4dDogc3RyaW5nKTogUGFyc2VMb2NhdGlvblJlc3VsdCB8IG51bGwge1xuICBpZiAoREVDSU1BTF9DT01NQV9QQVRURVJOLnRlc3QodGV4dCkgJiYgIVBPSU5UX0RFQ0lNQUxfUEFUVEVSTi50ZXN0KHRleHQpKSB7XG4gICAgcmV0dXJuIHsgcmVhc29uOiAnZGVjaW1hbC1jb21tYScsIGRldGFpbDogREVDSU1BTF9DT01NQV9ERVRBSUwgfTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBUcnVlIHdoZW4gdGhlIHRleHQgbWl4ZXMgdGhlIHR3byBkZWNpbWFsIG1hcmtzIEFDUk9TUyB0b2tlbnMg4oCUIGFcbiAqIGNvbW1hLWRlY2ltYWwgaW4gb25lIHRva2VuIGFuZCBhIHBvaW50LWRlY2ltYWwgaW4gYW5vdGhlciAodGhlIGlucHV0XG4gKiBgNTksNDM3MCAyNC43NWApLiBUaGUgc2VwYXJhdG9yIGdyYW1tYXIgd291bGQgcmVhZCAoNTksIDQzNzApIGFuZCB0aGUgYmJveFxuICogZ2F0ZSB3b3VsZCByZWplY3QgaXQgYXMgXCJvdXRzaWRlIEVzdG9uaWFcIiDigJQgYSB3cm9uZyBkaWFnbm9zaXM7IHRoZSByZWFsXG4gKiBwcm9ibGVtIGlzIHRoZSBtaXhlZCBzZXBhcmF0b3JzLCB3aGljaCB0aGUgZGVjaW1hbC1jb21tYSBjb3B5IG5hbWVzLlxuICpcbiAqIEEgY29tbWEgSU5TSURFIGEgcG9pbnQtZGVjaW1hbCBwYWlyIChgNTkuNDM3MCwgMjQuNzUzNWAg4oCUIGNvbW1hIGFzXG4gKiBzZXBhcmF0b3IpIGlzIG5vdCBhIGRlY2ltYWwgbWFyazogdGhlIGNvbW1hLWRlY2ltYWwgbWF0Y2ggdGhlcmUgc3RhcnRzXG4gKiBpbW1lZGlhdGVseSBhZnRlciBhIHBvaW50IChpdHMgbGVmdCBkaWdpdHMgYXJlIHRoZSBmcmFjdGlvbmFsIHBhcnQgb2YgdGhlXG4gKiBwb2ludC1kZWNpbWFsKSwgd2hpY2ggdGhlIGNoZWNrIGV4Y2x1ZGVzLlxuICovXG5mdW5jdGlvbiBoYXNNaXhlZERlY2ltYWxNYXJrcyh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgaWYgKCFQT0lOVF9ERUNJTUFMX1BBVFRFUk4udGVzdCh0ZXh0KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBjb21tYURlY2ltYWwgPSAvXFxkKyxcXGQrL2c7XG4gIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcbiAgd2hpbGUgKChtYXRjaCA9IGNvbW1hRGVjaW1hbC5leGVjKHRleHQpKSAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGJlZm9yZSA9IG1hdGNoLmluZGV4ID4gMCA/IHRleHQuY2hhckF0KG1hdGNoLmluZGV4IC0gMSkgOiAnJztcbiAgICBpZiAoYmVmb3JlICE9PSAnLicpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogVHJ1ZSB3aGVuIHRoZSB0ZXh0IGNhcnJpZXMgYSBwbGFpbiBkZWNpbWFsIHZhbHVlIE9VVFNJREUgdGhlIERNUyB0b2tlbnMg4oCUXG4gKiBhIERNUyArIGRlY2ltYWwgbWl4IHN1Y2ggYXMgYDU5wrAyNicxM1wiTiAyNC43NTM1YCAodGhlIG1peCBuZWVkcyBpdHNcbiAqIG93biBtZXNzYWdlLCBcImEgc2luZ2xlIERNUyB2YWx1ZVwiIG1pc2Rlc2NyaWJlcyBhIHR3by12YWx1ZSBpbnB1dCkuIFRoZVxuICogdG9rZW5zJyByYXcgc3BhbnMgYXJlIG1hc2tlZCBmaXJzdCBzbyB0aGVpciBkZWdyZWUvbWludXRlL3NlY29uZCBkaWdpdHNcbiAqIGRvIG5vdCBjb3VudC5cbiAqL1xuZnVuY3Rpb24gaGFzTm9uRG1zRGVjaW1hbCh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgbWFza2VkID0gdGV4dC5yZXBsYWNlKERNU19UT0tFTl9QQVRURVJOLCAnICcpO1xuICByZXR1cm4gL1xcZC8udGVzdChtYXNrZWQpO1xufVxuXG4vKiogR29vZ2xlIHNoYXJlIGZvcm1hdDogITNkNTkuNDM3ITRkMjQuNzUzIChjYXNlLWluc2Vuc2l0aXZlIGQtbWFya2VyKS4gKi9cbmNvbnN0IEdPT19TSEFSRV9QQVRURVJOID0gLyEzZCgtP1xcZCsoPzpcXC5cXGQrKT8pITRkKC0/XFxkKyg/OlxcLlxcZCspPykvaTtcbi8qKiBHb29nbGUgcGF0aCBmb3JtYXQ6IC9ANTkuNDM3LDI0Ljc1MyAobWFwcy9A4oCmLCBtYXBzL3BsYWNlL+KApi9A4oCmLCBhbnkgaG9zdCkuICovXG5jb25zdCBBVF9DT09SRF9QQVRURVJOID0gL0AoLT9cXGQrKD86XFwuXFxkKyk/KVssXFxzXSsoLT9cXGQrKD86XFwuXFxkKyk/KS87XG4vKiogR29vZ2xlIHNlYXJjaCBwYXRoIOKAlCB0aGUgMjAyNi0wOSBtYXBzLmFwcC5nb28uZ2wgcmVkaXJlY3QgdGFyZ2V0OlxuICogIC9zZWFyY2gvNTguOTk5NjY5LCsyNy4yODk3MzIgKGNvbW1hIGFuZC9vciBwbHVzIOKAlCBhIFVSTC1lbmNvZGVkIHNwYWNlIOKAlFxuICogIGFzIHRoZSBzZXBhcmF0b3IpIG9yIHRoZSBjb21tYSBmb3JtIC9zZWFyY2gvNTkuNDM3LDI0Ljc1My4gUmF3IHBhdGhcbiAqICBmb3JtcyBvbmx5OiBhIHBlcmNlbnQtZW5jb2RlZCBzZXBhcmF0b3IgaXMgbm90IGRlY29kZWQgKGxpa2UgdGhlXG4gKiAgcXVlcnktcGFyYW0gdmFsdWVzKS4gTWlycm9ycyB0aGUgYmFja2VuZCBTRUFSQ0hfUEFJUi4gKi9cbmNvbnN0IFNFQVJDSF9QQUlSX1BBVFRFUk4gPSAvXFwvc2VhcmNoXFwvKC0/XFxkKyg/OlxcLlxcZCspPylbLFxccytdKygtP1xcZCsoPzpcXC5cXGQrKT8pLztcblxuLyoqIE1hcC1VUkwgcXVlcnkgcGFyYW1zIHRoYXQgY2FycnkgY29vcmRpbmF0ZSBwYWlycyAoR29vZ2xlIHEvbGwvZGFkZHIvc2FkZHIsIEFwcGxlIGxsKS4gKi9cbmNvbnN0IFFVRVJZX1BBUkFNX1BBVFRFUk5TOiByZWFkb25seSBSZWdFeHBbXSA9IFtcbiAgLyg/Ols/Jl0pcT0oW14mI10qKS9pLFxuICAvKD86Wz8mXSlsbD0oW14mI10qKS9pLFxuICAvKD86Wz8mXSlkYWRkcj0oW14mI10qKS9pLFxuICAvKD86Wz8mXSlzYWRkcj0oW14mI10qKS9pLFxuXTtcblxuLyoqXG4gKiBPbmUgRE1TIHRva2VuOiBkZWdyZWVzICsgb3B0aW9uYWwgbWludXRlcy9zZWNvbmRzIChtYXJrZXJzIHJlcXVpcmVkKSArXG4gKiBvcHRpb25hbCBoZW1pc3BoZXJlIGxldHRlci4gYDU5wrAyNicxM1wiTmAsIGA1OcKwIDI2JyAxMlwiIEVgLCBgNTnCsDI2LjUnTmAsIGA1OcKwTmAuXG4gKi9cbmNvbnN0IERNU19UT0tFTl9QQVRURVJOID1cbiAgLygtP1xcZCspXFxzKlvCsMK6XVxccyooPzooXFxkKyg/OlxcLlxcZCspPylcXHMqWyfigLJdXFxzKig/OihcXGQrKD86XFwuXFxkKyk/KVxccypbXCLigLNdKT9cXHMqKT8oW05TRVduc2V3XSk/L2c7XG5cbi8qKiBgbGF0OmAgLyBgbG5nOmAgLyBgbGF0aXR1ZGU6YCAvIGBsb25naXR1ZGU6YCBsYWJlbHMgKGNvbG9uIG9wdGlvbmFsKSDigJQgc3RyaXBwZWQgYmVmb3JlIGRlY2ltYWwgc2Nhbi4gKi9cbmNvbnN0IExBQkVMX1BBVFRFUk4gPSAvXFxiKD86bGF0KD86aXR1ZGUpP3xsbmcoPzppdHVkZSk/KVxccyo6L2dpO1xuY29uc3QgTEFCRUxfUFJFU0VOVF9QQVRURVJOID0gL1xcYig/OmxhdCg/Oml0dWRlKT98bG5nKD86aXR1ZGUpPylcXHMqOi9pO1xuXG4vKiogQSBoZW1pc3BoZXJlIGxldHRlciB0b3VjaGluZyBhIG51bWJlcjogYDU5LjQ0TmAsIGAyNC43NSBFYCwgYE4gMjQuNzVgIChOT1QgdGhlICduJyBpbnNpZGUgXCJUYWxsaW5uXCIpLiAqL1xuY29uc3QgSEVNSVNIRVJFX0FETU9OU1RfUEFUVEVSTiA9IC9bLVxcZF1cXHMqW05TRVduc2V3XXxbTlNFV25zZXddXFxzKlstXFxkXS87XG5cbmludGVyZmFjZSBEbXNUb2tlbiB7XG4gIHZhbHVlOiBudW1iZXI7XG4gIGhlbWlzcGhlcmU6ICdOJyB8ICdTJyB8ICdFJyB8ICdXJyB8IG51bGw7XG59XG5cbmZ1bmN0aW9uIHRvRGVjaW1hbFBhaXIodGV4dDogc3RyaW5nKTogW251bWJlciwgbnVtYmVyXSB8IG51bGwge1xuICBjb25zdCBtYXRjaCA9IFBBSVJfUEFUVEVSTi5leGVjKHRleHQpO1xuICBpZiAoIW1hdGNoKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIFtOdW1iZXIobWF0Y2hbMV0pLCBOdW1iZXIobWF0Y2hbMl0pXTtcbn1cblxuLyoqIEV4dHJhY3QgdGhlIHBhaXIgY2FycmllZCBieSBvbmUgVVJMIHF1ZXJ5IHBhcmFtIHZhbHVlIChjb21tYS9zcGFjZS8nKyctc2VwYXJhdGVkKS4gKi9cbmZ1bmN0aW9uIGRtc1Rva2Vucyh0ZXh0OiBzdHJpbmcpOiBEbXNUb2tlbltdIHtcbiAgRE1TX1RPS0VOX1BBVFRFUk4ubGFzdEluZGV4ID0gMDtcbiAgY29uc3QgdG9rZW5zOiBEbXNUb2tlbltdID0gW107XG4gIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcbiAgd2hpbGUgKChtYXRjaCA9IERNU19UT0tFTl9QQVRURVJOLmV4ZWModGV4dCkpICE9PSBudWxsKSB7XG4gICAgY29uc3QgZGVncmVlcyA9IE51bWJlcihtYXRjaFsxXSk7XG4gICAgY29uc3QgbWludXRlcyA9IG1hdGNoWzJdID09PSB1bmRlZmluZWQgPyAwIDogTnVtYmVyKG1hdGNoWzJdKTtcbiAgICBjb25zdCBzZWNvbmRzID0gbWF0Y2hbM10gPT09IHVuZGVmaW5lZCA/IDAgOiBOdW1iZXIobWF0Y2hbM10pO1xuICAgIGxldCB2YWx1ZSA9IGRlZ3JlZXMgKyBtaW51dGVzIC8gNjAgKyBzZWNvbmRzIC8gMzYwMDtcbiAgICBjb25zdCBoZW1pc3BoZXJlID0gKG1hdGNoWzRdPy50b1VwcGVyQ2FzZSgpIGFzIERtc1Rva2VuWydoZW1pc3BoZXJlJ10pID8/IG51bGw7XG4gICAgaWYgKGhlbWlzcGhlcmUgPT09ICdTJyB8fCBoZW1pc3BoZXJlID09PSAnVycpIHtcbiAgICAgIHZhbHVlID0gLXZhbHVlO1xuICAgIH1cbiAgICB0b2tlbnMucHVzaCh7IHZhbHVlLCBoZW1pc3BoZXJlIH0pO1xuICB9XG4gIHJldHVybiB0b2tlbnM7XG59XG5cbi8qKlxuICogVHdvIERNUyB0b2tlbnMgLT4gKGxhdCwgbG5nKS4gSGVtaXNwaGVyZSBsZXR0ZXJzIGFyZSBhdXRob3JpdGF0aXZlIChhXG4gKiBwYXN0ZWQgXCIyNMKwNDUnRSA1OcKwMjYnTlwiIGlzIHJlc29sdmVkIFdJVEhPVVQgYSBzd2FwcGVkIGZsYWcg4oCUIHRoZSBvcmRlclxuICogd2FzIG5ldmVyIGFtYmlndW91cykuIFdpdGhvdXQgbGV0dGVyczogZmlyc3QgPSBsYXQsIHNlY29uZCA9IGxuZywgYW5kIHRoZVxuICogbnVtZXJpYyBiYm94IHN3YXAgcnVsZSBzdGlsbCBhcHBsaWVzIChzYW1lIG1pc3Rha2UgcHJvZmlsZSBhcyBwbGFpbiBwYWlycykuXG4gKi9cbmZ1bmN0aW9uIGRtc1RvUGFpcih0b2tlbnM6IERtc1Rva2VuW10pOiBQYXJzZUxvY2F0aW9uUmVzdWx0IHtcbiAgY29uc3Qgbm9ydGhTb3V0aCA9IHRva2Vucy5maW5kKCh0KSA9PiB0LmhlbWlzcGhlcmUgPT09ICdOJyB8fCB0LmhlbWlzcGhlcmUgPT09ICdTJyk7XG4gIGNvbnN0IGVhc3RXZXN0ID0gdG9rZW5zLmZpbmQoKHQpID0+IHQuaGVtaXNwaGVyZSA9PT0gJ0UnIHx8IHQuaGVtaXNwaGVyZSA9PT0gJ1cnKTtcbiAgaWYgKG5vcnRoU291dGggIT09IHVuZGVmaW5lZCAmJiBlYXN0V2VzdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGluRXN0b25pYUJveChub3J0aFNvdXRoLnZhbHVlLCBlYXN0V2VzdC52YWx1ZSkpIHtcbiAgICAgIHJldHVybiB7IGxhdGl0dWRlOiBub3J0aFNvdXRoLnZhbHVlLCBsb25naXR1ZGU6IGVhc3RXZXN0LnZhbHVlIH07XG4gICAgfVxuICAgIC8vIEhlbWlzcGhlcmUgbGV0dGVycyBhcmUgYXV0aG9yaXRhdGl2ZSDigJQgbmV2ZXIgbnVtZXJpY2FsbHkgc3dhcCB0aGVtLlxuICAgIHJldHVybiB7XG4gICAgICByZWFzb246ICdvdXQtb2YtYm91bmRzJyxcbiAgICAgIGRldGFpbDogYGhlbWlzcGhlcmVzIHBpbiB0aGUgb3JkZXI6ICR7bm9ydGhTb3V0aC52YWx1ZX0sICR7ZWFzdFdlc3QudmFsdWV9YCxcbiAgICB9O1xuICB9XG4gIGNvbnN0IFthLCBiXSA9IFt0b2tlbnNbMF0udmFsdWUsIHRva2Vuc1sxXS52YWx1ZV07XG4gIHJldHVybiBnYXRlV2l0aFN3YXAoYSwgYik7XG59XG5cbi8qKiBGaXJzdCB0d28gZGVjaW1hbHMgb2YgdGhlIHRleHQgKGxhYmVscyBzdHJpcHBlZCBmaXJzdCkuICovXG5mdW5jdGlvbiBwbGFpblBhaXIodGV4dDogc3RyaW5nKTogW251bWJlciwgbnVtYmVyXSB8IG51bGwge1xuICBjb25zdCBzdHJpcHBlZCA9IHRleHQucmVwbGFjZShMQUJFTF9QQVRURVJOLCAnICcpO1xuICBjb25zdCBkZWNpbWFscyA9IHN0cmlwcGVkLm1hdGNoKERFQ0lNQUxfUEFUVEVSTik7XG4gIGlmIChkZWNpbWFscyA9PT0gbnVsbCB8fCBkZWNpbWFscy5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIFtOdW1iZXIoZGVjaW1hbHNbMF0pLCBOdW1iZXIoZGVjaW1hbHNbMV0pXTtcbn1cblxuLyoqIFVSTCBicmFuY2ggKGRlc2lnbiBkZWNpc2lvbiAyYSk6IGtub3duIHBhdHRlcm5zIGZpcnN0LCB0aGVuIHRoZSBnZW5lcmljIHBhaXIuXG4gKiAgRXZlcnkgY29vcmRpbmF0ZS1jYXJyeWluZyBzZWdtZW50IHJ1bnMgdGhlIGRlY2ltYWwtY29tbWEgZ3VhcmRcbiAqICBCRUZPUkUgdGhlIHBhaXIgaXMgdHJ1c3RlZCwgc28gYD9sbD01OCwyNSZxPXhgIGNhbm5vdCBwaW4gdGhlIGludGVnZXJcbiAqICAoNTgsIDI1KSwgfjI3IGttIG9mZiAoYSBzaWxlbnQgd3JvbmcgcGluLCB0aGUgYXBwJ3MgZGVjbGFyZWQgdG9wIHJpc2spLiAqL1xuZnVuY3Rpb24gdXJsUGFpcih1cmw6IHN0cmluZyk6IFBhcnNlTG9jYXRpb25SZXN1bHQge1xuICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgUVVFUllfUEFSQU1fUEFUVEVSTlMpIHtcbiAgICBjb25zdCBwYXJhbSA9IHBhdHRlcm4uZXhlYyh1cmwpO1xuICAgIGlmIChwYXJhbSA9PT0gbnVsbCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHBhaXIgPSB0b0RlY2ltYWxQYWlyKHBhcmFtWzFdKTtcbiAgICBpZiAocGFpciAhPT0gbnVsbCkge1xuICAgICAgLy8gVGhlIGd1YXJkIHJ1bnMgb24gdGhlIHNlZ21lbnQgdGhhdCBhY3R1YWxseSB5aWVsZHMgdGhlIHBhaXIg4oCUIHRoZVxuICAgICAgLy8gcmF3IHBhcmFtIFZBTFVFLiBBIHN0cmVldCtwb3N0YWwgdmFsdWUgc3VjaCBhcyBgS2FkcmlvcmkgNSwxMjM0NWBcbiAgICAgIC8vIHRoYXQgeWllbGRzIHRoZSAoNSwgMTIzNDUpIHNlcGFyYXRvciBwYWlyIGlzIGxhYmVsbGVkIGRlY2ltYWwtY29tbWFcbiAgICAgIC8vIHRvbzogdGhlIHJlamVjdGlvbiBpcyB0aGUgc2FtZSwgdGhlIGNvcHkganVzdCBuYW1lcyB0aGUgcmVhbCBmaXguXG4gICAgICBjb25zdCBjb21tYUZhaWx1cmUgPSBkZWNpbWFsQ29tbWFGYWlsdXJlKHBhcmFtWzFdKTtcbiAgICAgIGlmIChjb21tYUZhaWx1cmUgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGNvbW1hRmFpbHVyZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBnYXRlV2l0aFN3YXAocGFpclswXSwgcGFpclsxXSk7XG4gICAgfVxuICB9XG4gIGNvbnN0IHNoYXJlID0gR09PX1NIQVJFX1BBVFRFUk4uZXhlYyh1cmwpO1xuICBpZiAoc2hhcmUgIT09IG51bGwpIHtcbiAgICByZXR1cm4gZ2F0ZVdpdGhTd2FwKE51bWJlcihzaGFyZVsxXSksIE51bWJlcihzaGFyZVsyXSkpO1xuICB9XG4gIGNvbnN0IGF0ID0gQVRfQ09PUkRfUEFUVEVSTi5leGVjKHVybCk7XG4gIGlmIChhdCAhPT0gbnVsbCkge1xuICAgIC8vIFRoZSBzYW1lIGd1YXJkIG9uIHRoZSBtYXRjaGVkIEBsYXQsbG5nIHNwYW4uXG4gICAgY29uc3QgY29tbWFGYWlsdXJlID0gZGVjaW1hbENvbW1hRmFpbHVyZShhdFswXSk7XG4gICAgaWYgKGNvbW1hRmFpbHVyZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGNvbW1hRmFpbHVyZTtcbiAgICB9XG4gICAgcmV0dXJuIGdhdGVXaXRoU3dhcChOdW1iZXIoYXRbMV0pLCBOdW1iZXIoYXRbMl0pKTtcbiAgfVxuICBjb25zdCBzZWFyY2ggPSBTRUFSQ0hfUEFJUl9QQVRURVJOLmV4ZWModXJsKTtcbiAgaWYgKHNlYXJjaCAhPT0gbnVsbCkge1xuICAgIC8vIFRoZSBzYW1lIGd1YXJkIG9uIHRoZSBtYXRjaGVkIC9zZWFyY2gvbGF0LGxuZyBzcGFuLlxuICAgIGNvbnN0IGNvbW1hRmFpbHVyZSA9IGRlY2ltYWxDb21tYUZhaWx1cmUoc2VhcmNoWzBdKTtcbiAgICBpZiAoY29tbWFGYWlsdXJlICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gY29tbWFGYWlsdXJlO1xuICAgIH1cbiAgICByZXR1cm4gZ2F0ZVdpdGhTd2FwKE51bWJlcihzZWFyY2hbMV0pLCBOdW1iZXIoc2VhcmNoWzJdKSk7XG4gIH1cbiAgLy8gRXN0b25pYW4gZGVjaW1hbC1jb21tYSBpbiB0aGUgZ2VuZXJpYyBmYWxsYmFjazogdGhlIHNjaGVtZStob3N0IGlzXG4gIC8vIGFsd2F5cyBkb3R0ZWQsIHNvIHRoZSBwbGFpbiBwYXRoJ3MgXCJubyBwb2ludCBhdCBhbGxcIiBydWxlIGFwcGxpZXMgdG8gdGhlXG4gIC8vIGNvb3JkaW5hdGUtY2FycnlpbmcgcGFydCAocGF0aCArIHF1ZXJ5KSBpbnN0ZWFkIG9mIHRoZSB3aG9sZSBVUkwuXG4gIGNvbnN0IHVybEJvZHkgPSB1cmwucmVwbGFjZSgvXmh0dHBzPzpcXC9cXC9bXi8/I10rL2ksICcnKTtcbiAgY29uc3QgY29tbWFGYWlsdXJlID0gZGVjaW1hbENvbW1hRmFpbHVyZSh1cmxCb2R5KTtcbiAgaWYgKGNvbW1hRmFpbHVyZSAhPT0gbnVsbCkge1xuICAgIHJldHVybiBjb21tYUZhaWx1cmU7XG4gIH1cbiAgY29uc3QgZ2VuZXJpYyA9IHRvRGVjaW1hbFBhaXIodXJsKTtcbiAgaWYgKGdlbmVyaWMgIT09IG51bGwpIHtcbiAgICByZXR1cm4gZ2F0ZVdpdGhTd2FwKGdlbmVyaWNbMF0sIGdlbmVyaWNbMV0pO1xuICB9XG4gIHJldHVybiB7IHJlYXNvbjogJ25vLXBhaXInLCBkZXRhaWw6ICdubyBjb29yZGluYXRlIHBhaXIgaW4gdGhlIFVSTCcgfTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQdWJsaWMgQVBJXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiBQYXJzZSBmcmVlIHRleHQgaW50byBjb29yZGluYXRlcyAocHVyZSwgZGV0ZXJtaW5pc3RpYyk6XG4gKiAgIGEuIGh0dHAocykgVVJMICAgICAgLT4ga25vd24gbWFwLVVSTCBwYXR0ZXJucywgdGhlbiBmaXJzdCBkZWNpbWFsIHBhaXJcbiAqICAgYi4gRE1TIG1hcmtlcnMgKMKwLCBoZW1pc3BoZXJlIGxldHRlcnMpIC0+IERNUyBwYXJzZSwgZWxzZSBkZWNpbWFsIGZhbGxiYWNrXG4gKiAgIGMuIGZhbGxiYWNrICAgICAgICAgIC0+IGZpcnN0IHR3byBkZWNpbWFscyAobGFiZWxzIHN0cmlwcGVkKVxuICogdGhlbiB0aGUgRXN0b25pYSBiYm94IGdhdGUgd2l0aCB0aGUgKGxuZyxsYXQpIGF1dG8tc3dhcCBydWxlLlxuICpcbiAqIEZhaWx1cmVzIGFyZSBzcGVjaWZpYzogJ25vLXBhaXInIChub3RoaW5nIG51bWVyaWMgYXQgYWxsKSwgJ2ludmFsaWQnXG4gKiAoY29vcmRpbmF0ZS1zaGFwZWQgbWFya2VycyBwcmVzZW50IGJ1dCBubyB1c2FibGUgcGFpciksICdvdXQtb2YtYm91bmRzJ1xuICogKGEgcGFpciwgYnV0IG91dHNpZGUgRXN0b25pYSBpbiBib3RoIG9yZGVycyksICdkZWNpbWFsLWNvbW1hJyAoYW5cbiAqIEVzdG9uaWFuIGNvbW1hLWRlY2ltYWwgd2l0aG91dCBhIHBvaW50IOKAlCB0aGUgdmFsdWUgaXMgbmV2ZXIgZ3Vlc3NlZCBvclxuICogY29udmVydGVkOyB0aGUgcGFnZSB0ZWxscyB0aGUgdXNlciB0byB0eXBlIGEgcG9pbnQpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VMb2NhdGlvbklucHV0KHRleHQ6IHN0cmluZyk6IFBhcnNlTG9jYXRpb25SZXN1bHQge1xuICBjb25zdCB0cmltbWVkID0gdGV4dC50cmltKCk7XG4gIGlmICh0cmltbWVkID09PSAnJykge1xuICAgIHJldHVybiB7IHJlYXNvbjogJ25vLXBhaXInLCBkZXRhaWw6ICdlbXB0eSBpbnB1dCcgfTtcbiAgfVxuXG4gIGlmIChVUkxfUEFUVEVSTi50ZXN0KHRyaW1tZWQpKSB7XG4gICAgcmV0dXJuIHVybFBhaXIodHJpbW1lZCk7XG4gIH1cblxuICBjb25zdCBoYXNEZWdyZWUgPSAvW8KwwrpdLy50ZXN0KHRyaW1tZWQpO1xuICBjb25zdCBoYXNIZW1pc3BoZXJlID0gSEVNSVNIRVJFX0FETU9OU1RfUEFUVEVSTi50ZXN0KHRyaW1tZWQpO1xuICBpZiAoaGFzRGVncmVlIHx8IGhhc0hlbWlzcGhlcmUpIHtcbiAgICBjb25zdCB0b2tlbnMgPSBkbXNUb2tlbnModHJpbW1lZCk7XG4gICAgLy8gQW4gRXN0b25pYW4gY29tbWEtZGVjaW1hbCBhbnl3aGVyZSBpbiBhIERNUyBpbnB1dFxuICAgIC8vIChgNTnCsDI2LDUnIDI0wrA0NSdgKSDigJQgdGhlIG1pbnV0ZXMvc2Vjb25kcyBncm91cHMgb25seSByZWFkIFBPSU5UXG4gICAgLy8gZGVjaW1hbHMsIHNvIHdpdGhvdXQgdGhpcyB0aGUgZGVjaW1hbCBwYXJ0IGlzIHNpbGVudGx5IERST1BQRUQgKHRoZVxuICAgIC8vIHRva2VuIHNocmlua3MgdG8gaXRzIGRlZ3JlZXM7IGhlbWlzcGhlcmUgbGV0dGVycyBnbyB1bmNvbnN1bWVkKSBhbmRcbiAgICAvLyB0aGUgcmVtYWluaW5nIGNvbXBvbmVudHMgY2FuIHN0aWxsIHBpbiBhIHBsYXVzaWJsZSBwb2ludCB+NDkga20gb2ZmLFxuICAgIC8vIGluc2lkZSB0aGUgRXN0b25pYSBib3guIE5vIGd1ZXNzaW5nOiBkZWNpbWFsLWNvbW1hLiAoVGhlIHdob2xlIGlucHV0XG4gICAgLy8gaXMgY2hlY2tlZCwgbm90IGp1c3QgdGhlIG1hdGNoZWQgdG9rZW4gc3BhbnM6IGEgY29tbWEtbWludXRlIHNocmlua3NcbiAgICAvLyB0aGUgc3BhbiB0byB0aGUgZGVncmVlIGFuZCB3b3VsZCBlc2NhcGUgYSBzcGFuLW9ubHkgc2Nhbi4pXG4gICAgaWYgKERFQ0lNQUxfQ09NTUFfUEFUVEVSTi50ZXN0KHRyaW1tZWQpKSB7XG4gICAgICByZXR1cm4geyByZWFzb246ICdkZWNpbWFsLWNvbW1hJywgZGV0YWlsOiBERUNJTUFMX0NPTU1BX0RFVEFJTCB9O1xuICAgIH1cbiAgICBpZiAodG9rZW5zLmxlbmd0aCA+PSAyKSB7XG4gICAgICByZXR1cm4gZG1zVG9QYWlyKHRva2Vucyk7XG4gICAgfVxuICAgIGlmICh0b2tlbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAvLyBPbmUgRE1TIHZhbHVlIGlzIGEgbG9uZSBsYXRpdHVkZSBvciBsb25naXR1ZGUg4oCUIG5ldmVyIGd1ZXNzIHRoZSBvdGhlclxuICAgICAgLy8gKGRlc2lnbiByaXNrOiBubyBzaWxlbnQgd3JvbmcgcGluKS4gRG8gTk9UIGZhbGwgYmFjayB0byB0aGUgZGVjaW1hbFxuICAgICAgLy8gc2NhbjogaXRzIGZpcnN0IHR3byBkZWNpbWFscyB3b3VsZCBiZSB0aGUgZGVncmVlK21pbnV0ZSBwYXJ0cyBvZiB0aGVcbiAgICAgIC8vIHNhbWUgdG9rZW4sIHdoaWNoIHdvdWxkIHBsYWNlIGEgcGxhdXNpYmxlLWJ1dC13cm9uZyBwaW4uIEEgcGxhaW5cbiAgICAgIC8vIGRlY2ltYWwgYWxvbmdzaWRlIHRoZSB0b2tlbiBpcyBhIE1JWCBvZiBmb3JtYXRzIOKAlCBpdHMgb3duXG4gICAgICAvLyBtZXNzYWdlOyBcImEgc2luZ2xlIERNUyB2YWx1ZVwiIHdvdWxkIG1pc2Rlc2NyaWJlIGEgdHdvLXZhbHVlIGlucHV0LlxuICAgICAgaWYgKGhhc05vbkRtc0RlY2ltYWwodHJpbW1lZCkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICByZWFzb246ICdpbnZhbGlkJyxcbiAgICAgICAgICBkZXRhaWw6ICdtaXggb2YgRE1TIGFuZCBkZWNpbWFsIOKAlCB1c2Ugb25lIGZvcm1hdCBmb3IgYm90aCB2YWx1ZXMnLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHsgcmVhc29uOiAnaW52YWxpZCcsIGRldGFpbDogJ2Egc2luZ2xlIERNUyB2YWx1ZSBpcyBub3QgYSBjb29yZGluYXRlIHBhaXInIH07XG4gICAgfVxuICAgIC8vIE1hcmtlcnMgcHJlc2VudCBidXQgbm8gRE1TIHRva2VuIChlLmcuIFwiNTkuNDROIDI0Ljc1RVwiKSAtPiBkZWNpbWFsXG4gICAgLy8gZmFsbGJhY2sg4oCUIHdpdGggdGhlIGRlY2ltYWwtY29tbWEgZ3VhcmQgZmlyc3QuXG4gICAgY29uc3QgY29tbWFGYWlsdXJlID0gZGVjaW1hbENvbW1hRmFpbHVyZSh0cmltbWVkKTtcbiAgICBpZiAoY29tbWFGYWlsdXJlICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gY29tbWFGYWlsdXJlO1xuICAgIH1cbiAgICBjb25zdCBwYWlyID0gcGxhaW5QYWlyKHRyaW1tZWQpO1xuICAgIGlmIChwYWlyICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZ2F0ZVdpdGhTd2FwKHBhaXJbMF0sIHBhaXJbMV0pO1xuICAgIH1cbiAgICByZXR1cm4geyByZWFzb246ICdpbnZhbGlkJywgZGV0YWlsOiAnY29vcmRpbmF0ZSBtYXJrZXJzIHdpdGhvdXQgYSBwYXJzZWFibGUgcGFpcicgfTtcbiAgfVxuXG4gIC8vIEVzdG9uaWFuIGRlY2ltYWwtY29tbWE6IHJlZnVzZSBCRUZPUkUgdGhlIHNlcGFyYXRvciBncmFtbWFyIGNhblxuICAvLyByZWFkIGNvbW1hLWRlY2ltYWxzIGFzIGFuIGludGVnZXIgcGFpciAobm8gc2lsZW50IHdyb25nIHBpbikuIEEgTUlYIG9mXG4gIC8vIGNvbW1hLWRlY2ltYWxzIGFuZCBwb2ludC1kZWNpbWFscyBhY3Jvc3MgdG9rZW5zIChgNTksNDM3MCAyNC43NWApXG4gIC8vIGlzIHRoZSBzYW1lIGRhdGEgcHJvYmxlbSDigJQgdGhlIGd1YXJkJ3MgY29weSBleHBsYWlucyB0aGUgZml4IHdoZXJlIHRoZVxuICAvLyBiYm94IGdhdGUncyBcIm91dHNpZGUgRXN0b25pYVwiIHdvdWxkIG1pc2RpYWdub3NlIGl0LlxuICBpZiAoZGVjaW1hbENvbW1hRmFpbHVyZSh0cmltbWVkKSAhPT0gbnVsbCB8fCBoYXNNaXhlZERlY2ltYWxNYXJrcyh0cmltbWVkKSkge1xuICAgIHJldHVybiB7IHJlYXNvbjogJ2RlY2ltYWwtY29tbWEnLCBkZXRhaWw6IERFQ0lNQUxfQ09NTUFfREVUQUlMIH07XG4gIH1cbiAgY29uc3QgcGFpciA9IHBsYWluUGFpcih0cmltbWVkKTtcbiAgaWYgKHBhaXIgIT09IG51bGwpIHtcbiAgICByZXR1cm4gZ2F0ZVdpdGhTd2FwKHBhaXJbMF0sIHBhaXJbMV0pO1xuICB9XG4gIHJldHVybiB7XG4gICAgcmVhc29uOiBMQUJFTF9QUkVTRU5UX1BBVFRFUk4udGVzdCh0cmltbWVkKSA/ICdpbnZhbGlkJyA6ICduby1wYWlyJyxcbiAgICBkZXRhaWw6IExBQkVMX1BSRVNFTlRfUEFUVEVSTi50ZXN0KHRyaW1tZWQpXG4gICAgICA/ICdsYWJlbHMgd2l0aG91dCBhIGNvb3JkaW5hdGUgcGFpcidcbiAgICAgIDogJ25vIGNvb3JkaW5hdGUgcGFpciBmb3VuZCcsXG4gIH07XG59XG5cbi8qKiBUcnVlIHdoZW4gdGhlIHRyaW1tZWQgaW5wdXQgaXMgYSBHb29nbGUgc2hvcnQgbGluayAoaG9zdCBtYXBzLmFwcC5nb28uZ2wpLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzR29vU2hvcnRMaW5rKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gR09PX1NIT1JUX0xJTktfUEFUVEVSTi50ZXN0KHRleHQudHJpbSgpKTtcbn1cblxuLyoqIEEgc2hvcnQgbGluayBmb3IgUE9TVCAvYXBpL2dlby9yZXNvbHZlIOKAlCB0aGUgYmFja2VuZCByZXF1aXJlcyBhIHNjaGVtZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTaG9ydExpbmtVcmwodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdHJpbW1lZCA9IHRleHQudHJpbSgpO1xuICByZXR1cm4gL15odHRwcz86XFwvXFwvL2kudGVzdCh0cmltbWVkKSA/IHRyaW1tZWQgOiBgaHR0cHM6Ly8ke3RyaW1tZWR9YDtcbn1cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxTQUVFLHlCQUNBLFdBRUEsVUFBQUEsU0FHQSxRQUNBLGlCQUNLO0FBQ1AsU0FBUyxhQUFhLFdBQVcscUJBQXFCLGtCQUFrQjtBQUN4RSxTQUFTLGdCQUFnQixrQkFBa0I7OztBRVozQyxTQUFTLFFBQVEsa0JBQWtCO0FBQ25DLFNBQVMscUJBQXFCOztBQWdCeEIsSUFBTyxhQUFQLE1BQU8sWUFBVTtFQUNKLE1BQU0sT0FBTyxTQUFTOzs7Ozs7OztFQVN2QyxRQUFRLEtBQXVDO0FBQzdDLFdBQU8sY0FBYyxLQUFLLElBQUksS0FBdUIsb0JBQW9CLEVBQUUsSUFBRyxDQUFFLENBQUM7RUFDbkY7O3FDQVpXLGFBQVU7RUFBQTsrRUFBVixhQUFVLFNBQVYsWUFBVSxXQUFBLFlBREcsT0FBTSxDQUFBOzs7K0VBQ25CLFlBQVUsQ0FBQTtVQUR0QjtXQUFXLEVBQUUsWUFBWSxPQUFNLENBQUU7Ozs7O0FDQzNCLElBQU0sdUJBQXVCO0FBQUEsRUFDbEMsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUNWO0FBaUJBLFNBQVMsYUFBYSxVQUFrQixXQUE0QjtBQUNsRSxTQUNFLE9BQU8sU0FBUyxRQUFRLEtBQ3hCLE9BQU8sU0FBUyxTQUFTLEtBQ3pCLFlBQVkscUJBQXFCLFVBQ2pDLFlBQVkscUJBQXFCLFVBQ2pDLGFBQWEscUJBQXFCLFVBQ2xDLGFBQWEscUJBQXFCO0FBRXRDO0FBR0EsU0FBUyxhQUFhLEdBQVcsR0FBZ0M7QUFDL0QsTUFBSSxhQUFhLEdBQUcsQ0FBQyxHQUFHO0FBQ3RCLFdBQU8sRUFBRSxVQUFVLEdBQUcsV0FBVyxFQUFFO0FBQUEsRUFDckM7QUFDQSxN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QUEseUJBQUEsd0JBQUEsdUJBQUEsaUNBQUEsK0JBQUEsdUNBQUEsOEJBQUEsb0JBQUEseUJBQUEsc0JBQUEsdUJBQUEsdUJBQUEscUJBQUEsOEJBQUEsbUJBQUEsaUJBQUEsaUJBQUEseUJBQUEsdUJBQUEsdUJBQUEsb0JBQUEsa0JBQUEsa0JBQUUsWUFBWSxpQkFBaUIsa0JBQWtCLGFBQWEsR0FBQSxRQUFBLENBQUEsK2hOQUFBLEVBQUEsQ0FBQTs7O2dGQU1oRixtQkFBaUIsQ0FBQTtVQVI3Qjt1QkFDVywyQkFBeUIsU0FDMUIsQ0FBQyxxQkFBcUIsWUFBWSxpQkFBaUIsa0JBQWtCLGFBQWEsR0FBQyxXQUNqRixDQUFDLGNBQWMsR0FBQyxpQkFHVix3QkFBd0IsUUFBTSxVQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FBQSxRQUFBLENBQUEsd2dLQUFBLEVBQUEsQ0FBQTtvREFZYSxTQUFPLEVBQUEsVUFBQSxLQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQTtBQUFBLEdBQUE7O2lGQVZ4RCxtQkFBaUIsRUFBQSxXQUFBLHFCQUFBLFVBQUEsbURBQUEsWUFBQSxJQUFBLENBQUE7QUFBQSxHQUFBOzs7Ozs7OytEQUFqQixtQkFBaUIsRUFBQSxTQUFBLENBQUFDLEtBQUEsRUFBQSxHQUFBLENBQUEsZ0JBQUEscUJBQUEsWUFBQSxpQkFBQSxrQkFBQSxlQUFBLFdBQUEsdUJBQUEsR0FBQSxhQUFBLEVBQUEsQ0FBQTtFQUFBO0FBQUEsR0FBQSxPQUFBLGNBQUEsZUFBQSxjQUFBLDBCQUFBLEtBQUEsSUFBQSxDQUFBO0FBQUEsR0FBQSxPQUFBLGNBQUEsZUFBQSxlQUFBLFlBQUEsT0FBQSxZQUFBLElBQUEsR0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLE1BQUEsMEJBQUEsRUFBQSxTQUFBLENBQUE7QUFBQSxHQUFBOyIsIm5hbWVzIjpbImluamVjdCIsImNvbW1hRmFpbHVyZSIsInBhaXIiLCJpbmplY3QiLCJpMCJdLCJkZWJ1Z0lkIjoiY2E1MWE0OWMtOGFlYS01M2QyLWFmYjItYTc0NDMxOWRmN2FiIn0=