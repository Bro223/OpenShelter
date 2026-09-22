import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/main.js");import {
  GeolocationError,
  getCurrentPositionHighAccuracy,
  haversineKm
} from "/chunk-SXXU3R3Q.js";
import {
  GeocodeGateway
} from "/chunk-3WHHMMOV.js";
import {
  ESTONIA_CENTER,
  ESTONIA_ZOOM,
  LeafletService,
  SHELTER_ZOOM
} from "/chunk-QTZH4P7Z.js";
import {
  SiteTextsGateway
} from "/chunk-IWWTWYKX.js";
import {
  ListState
} from "/chunk-Q2EZNHWI.js";
import {
  adminGuard,
  authGuard,
  guestGuard,
  verifiedGuard
} from "/chunk-RVLWDZXM.js";
import {
  ShelterGateway
} from "/chunk-32CK32SO.js";
import {
  communityBadgeClass,
  hasReports,
  hasTrustBadges,
  isOpenRow,
  isPrivateLocation,
  occupancyText,
  openStatusBadgeText,
  reportedBadgeText,
  sourceTrustLabel,
  straightLineText
} from "/chunk-CKLEX4Y2.js";
import {
  LoadingIndicator
} from "/chunk-Y3BTRGLF.js";
import {
  AuthStore,
  TokenStore
} from "/chunk-QATQGZY5.js";
import "/chunk-T7PPW65J.js";
import {
  ApiClient,
  BannerComponent,
  bannerMessage,
  toApiError
} from "/chunk-WYACYUPC.js";
import {
  I18nService,
  LOCALES,
  TranslatePipe
} from "/chunk-LJMNRHVK.js";
import "/chunk-FDMHZOCR.js";

// src/main.ts
import { registerLocaleData } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common.js?v=b78d4f20";
import etLocale from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common_locales_et.js?v=b78d4f20";
import ruLocale from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common_locales_ru.js?v=b78d4f20";
import { bootstrapApplication } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_platform-browser.js?v=b78d4f20";

// src/app/app.config.ts
import { provideBrowserGlobalErrorListeners } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { provideHttpClient, withInterceptors } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common_http.js?v=b78d4f20";
import { provideRouter } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";

// src/app/core/title.ts
import { inject } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { Title } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_platform-browser.js?v=b78d4f20";
var APP_NAME = "OpenShelter";
var titleGuard = (route) => {
  const title = route.data["title"];
  if (typeof title === "string" && title.length > 0) {
    const i18n = inject(I18nService);
    const titleService = inject(Title);
    const key = title;
    const apply = () => {
      titleService.setTitle(`${i18n.t(key)} \u2014 ${APP_NAME}`);
    };
    apply();
    i18n.onCatalogLoaded(apply);
  }
  return true;
};

// src/app/features/map/map-page.ts
import { afterNextRender, ChangeDetectionStrategy, Component, computed, EnvironmentInjector, inject as inject2, signal, viewChild } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { NgClass } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common.js?v=b78d4f20";
import { RouterLink } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var _c0 = ["mapEl"];
var _c1 = ["listEl"];
var _c2 = (a0) => ["/shelters", a0];
var _forTrack0 = ($index, $item) => $item.value;
var _forTrack1 = ($index, $item) => $item.id;
function MapPage_Conditional_64_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 45);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const msg_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, msg_r1));
  }
}
function MapPage_Conditional_64_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 46);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const msg_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, msg_r1));
  }
}
function MapPage_Conditional_64_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275conditionalCreate(0, MapPage_Conditional_64_Conditional_0_Template, 3, 3, "p", 45)(1, MapPage_Conditional_64_Conditional_1_Template, 3, 3, "p", 46);
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275conditional(ctx_r1.anchorError() === "no-results" ? 0 : 1);
  }
}
function MapPage_Conditional_65_For_3_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 49);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const result_r4 = i0.\u0275\u0275nextContext().$implicit;
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(result_r4.type);
  }
}
function MapPage_Conditional_65_For_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "li")(1, "button", 47);
    i0.\u0275\u0275listener("click", function MapPage_Conditional_65_For_3_Template_button_click_1_listener() {
      const result_r4 = i0.\u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.selectAnchorResult(result_r4));
    });
    i0.\u0275\u0275elementStart(2, "span", 48);
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(4, MapPage_Conditional_65_For_3_Conditional_4_Template, 2, 1, "span", 49);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const result_r4 = ctx.$implicit;
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(result_r4.displayName);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(result_r4.type ? 4 : -1);
  }
}
function MapPage_Conditional_65_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "ul", 28);
    i0.\u0275\u0275pipe(1, "t");
    i0.\u0275\u0275repeaterCreate(2, MapPage_Conditional_65_For_3_Template, 5, 2, "li", null, i0.\u0275\u0275repeaterTrackByIndex);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275attribute("aria-label", i0.\u0275\u0275pipeBind1(1, 1, "map.addressResultsAria"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275repeater(ctx_r1.anchorResults());
  }
}
function MapPage_Conditional_66_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "a", 29);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, "map.addShelter"));
  }
}
function MapPage_Conditional_67_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 51);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const n_r5 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" \xB7 ", n_r5.address);
  }
}
function MapPage_Conditional_67_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 52);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" \xB7 ", ctx_r1.straightLineText(ctx_r1.nearestKm()));
  }
}
function MapPage_Conditional_67_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 53);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, "shelter.unverifiedWarning"));
  }
}
function MapPage_Conditional_67_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 53);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, "account.contrib.inaccurate"));
  }
}
function MapPage_Conditional_67_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 50);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275conditionalCreate(3, MapPage_Conditional_67_Conditional_3_Template, 2, 1, "span", 51);
    i0.\u0275\u0275conditionalCreate(4, MapPage_Conditional_67_Conditional_4_Template, 2, 1, "span", 52);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(5, MapPage_Conditional_67_Conditional_5_Template, 3, 3, "p", 53);
    i0.\u0275\u0275conditionalCreate(6, MapPage_Conditional_67_Conditional_6_Template, 3, 3, "p", 53);
  }
  if (rf & 2) {
    const n_r5 = ctx;
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate2(" ", i0.\u0275\u0275pipeBind1(2, 6, "map.aroundYou"), ": ", n_r5.name, " ");
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional(n_r5.address ? 3 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.nearestKm() !== null ? 4 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(n_r5.source === "USER" ? 5 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(n_r5.inaccurate ? 6 : -1);
  }
}
function MapPage_Conditional_68_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "a", 54);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, "map.nearestEmpty.addFirst"));
  }
}
function MapPage_Conditional_68_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 30);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275conditionalCreate(3, MapPage_Conditional_68_Conditional_3_Template, 3, 3, "a", 54);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(2, 2, "map.nearestEmpty"), " ");
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional(ctx_r1.auth.initialized() && ctx_r1.auth.authenticated() ? 3 : -1);
  }
}
function MapPage_Conditional_69_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 31);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, ctx));
  }
}
function MapPage_Conditional_70_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "p", 32);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementStart(3, "span", 55);
    i0.\u0275\u0275text(4);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(5, "button", 56);
    i0.\u0275\u0275listener("click", function MapPage_Conditional_70_Template_button_click_5_listener() {
      i0.\u0275\u0275restoreView(_r6);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.clearAnchor());
    });
    i0.\u0275\u0275text(6);
    i0.\u0275\u0275pipe(7, "t");
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(2, 3, "map.searched"), " ");
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(ctx.label);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(7, 5, "map.clear"), " ");
  }
}
function MapPage_For_74_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "button", 57);
    i0.\u0275\u0275listener("click", function MapPage_For_74_Template_button_click_0_listener() {
      const chip_r8 = i0.\u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.setFilter(chip_r8.value));
    });
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const chip_r8 = ctx.$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275classProp("chip--active", ctx_r1.filter() === chip_r8.value);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(2, 3, chip_r8.labelKey), " ");
  }
}
function MapPage_Conditional_83_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275element(0, "app-banner", 37);
  }
  if (rf & 2) {
    i0.\u0275\u0275property("message", ctx);
  }
}
function MapPage_Conditional_84_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275element(0, "app-loading-indicator", 38);
    i0.\u0275\u0275pipe(1, "t");
  }
  if (rf & 2) {
    i0.\u0275\u0275property("message", i0.\u0275\u0275pipeBind1(1, 1, "map.loading"));
  }
}
function MapPage_Conditional_85_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275element(0, "app-list-state", 39);
  }
  if (rf & 2) {
    i0.\u0275\u0275property("kind", "empty")("messageKey", "map.emptyFilter");
  }
}
function MapPage_Conditional_86_For_4_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 60);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const shelter_r10 = i0.\u0275\u0275nextContext().$implicit;
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(shelter_r10.address);
  }
}
function MapPage_Conditional_86_For_4_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 63);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, "shelter.privateBadge"));
  }
}
function MapPage_Conditional_86_For_4_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 64);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const shelter_r10 = i0.\u0275\u0275nextContext().$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(ctx_r1.straightLineText(ctx_r1.anchorDistance(shelter_r10)));
  }
}
function MapPage_Conditional_86_For_4_Conditional_10_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 67);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const shelter_r10 = i0.\u0275\u0275nextContext(2).$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(ctx_r1.reportedBadgeText(shelter_r10.nonexistentReports));
  }
}
function MapPage_Conditional_86_For_4_Conditional_10_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 68);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(ctx);
  }
}
function MapPage_Conditional_86_For_4_Conditional_10_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 69);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(4);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(ctx_r1.occupancyText(ctx));
  }
}
function MapPage_Conditional_86_For_4_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 65);
    i0.\u0275\u0275conditionalCreate(1, MapPage_Conditional_86_For_4_Conditional_10_Conditional_1_Template, 2, 1, "span", 67);
    i0.\u0275\u0275conditionalCreate(2, MapPage_Conditional_86_For_4_Conditional_10_Conditional_2_Template, 2, 1, "span", 68);
    i0.\u0275\u0275conditionalCreate(3, MapPage_Conditional_86_For_4_Conditional_10_Conditional_3_Template, 2, 1, "span", 69);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_15_0;
    let tmp_16_0;
    const shelter_r10 = i0.\u0275\u0275nextContext().$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.hasReports(shelter_r10) ? 1 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional((tmp_15_0 = ctx_r1.openStatusBadgeText(shelter_r10.openStatus)) ? 2 : -1, tmp_15_0);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional((tmp_16_0 = shelter_r10.occupancy) ? 3 : -1, tmp_16_0);
  }
}
function MapPage_Conditional_86_For_4_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "a", 66);
    i0.\u0275\u0275pipe(1, "t");
    i0.\u0275\u0275text(2);
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const shelter_r10 = i0.\u0275\u0275nextContext().$implicit;
    i0.\u0275\u0275property("routerLink", i0.\u0275\u0275pureFunction1(7, _c2, shelter_r10.id));
    i0.\u0275\u0275attribute("aria-label", i0.\u0275\u0275pipeBind1(1, 3, "map.viewDetailsFor") + shelter_r10.name);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(3, 5, "map.viewDetails"), " \u2192 ");
  }
}
function MapPage_Conditional_86_For_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "li")(1, "button", 58);
    i0.\u0275\u0275listener("click", function MapPage_Conditional_86_For_4_Template_button_click_1_listener() {
      const shelter_r10 = i0.\u0275\u0275restoreView(_r9).$implicit;
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.selectShelter(shelter_r10));
    });
    i0.\u0275\u0275elementStart(2, "span", 59);
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(4, MapPage_Conditional_86_For_4_Conditional_4_Template, 2, 1, "span", 60);
    i0.\u0275\u0275elementStart(5, "span", 61)(6, "span", 62);
    i0.\u0275\u0275text(7);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(8, MapPage_Conditional_86_For_4_Conditional_8_Template, 3, 3, "span", 63);
    i0.\u0275\u0275conditionalCreate(9, MapPage_Conditional_86_For_4_Conditional_9_Template, 2, 1, "span", 64);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(10, MapPage_Conditional_86_For_4_Conditional_10_Template, 4, 3, "span", 65);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(11, MapPage_Conditional_86_For_4_Conditional_11_Template, 4, 9, "a", 66);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const shelter_r10 = ctx.$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275attribute("data-shelter-id", shelter_r10.id);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("shelter-row--selected", ctx_r1.selectedId() === shelter_r10.id);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(shelter_r10.name);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(shelter_r10.address ? 4 : -1);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("ngClass", ctx_r1.communityBadgeClass(shelter_r10));
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx_r1.sourceTrustLabel(shelter_r10), " ");
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.isPrivateLocation(shelter_r10) ? 8 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.anchor() !== null ? 9 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.hasTrustBadges(shelter_r10) ? 10 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.selectedId() === shelter_r10.id ? 11 : -1);
  }
}
function MapPage_Conditional_86_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "ul", 40, 1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275repeaterCreate(3, MapPage_Conditional_86_For_4_Template, 12, 11, "li", null, _forTrack1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275attribute("aria-label", i0.\u0275\u0275pipeBind1(2, 1, "map.shelterListAria"));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275repeater(ctx_r1.sorted());
  }
}
var SOURCE_FILTERS = [
  { value: "ALL", labelKey: "map.filter.all" },
  { value: "REGISTRY", labelKey: "map.filter.registry" },
  { value: "USER", labelKey: "map.filter.user" }
];
var NEAREST_KEY = {
  denied: "map.nearest.denied",
  timeout: "map.nearest.timeout",
  unsupported: "map.nearest.unsupported",
  unavailable: "map.nearest.unavailable",
  insecure: "map.nearest.insecure"
};
var GEOCODE_ERROR_KEY = {
  "no-results": "map.geocode.noResults",
  "rate-limited": "map.geocode.rateLimited",
  network: "map.geocode.network"
};
var ANCHOR_ZOOM = 14;
var AROUND_ZOOM = 14;
function nearestShelterAt(latitude, longitude, rows) {
  let best = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const km = haversineKm(latitude, longitude, row.latitude, row.longitude);
    if (km < bestKm) {
      bestKm = km;
      best = row;
    }
  }
  return best === null ? null : { row: best, km: bestKm };
}
var MapPage = class _MapPage {
  gateway = inject2(ShelterGateway);
  geocode = inject2(GeocodeGateway);
  leaflet = inject2(LeafletService);
  store = inject2(AuthStore);
  /** The i18n seam: the shared shelter-copy helpers resolve their copy
   *  through the active locale (N7 i18n-completeness), and the anchor pin
   *  title is the localized `map.searched` label. */
  i18n = inject2(I18nService);
  /** The active-locale resolver passed to the shared copy helpers. */
  translate = (key, params) => this.i18n.t(key, params);
  mapEl = viewChild(
    "mapEl",
    ...ngDevMode ? [{ debugName: "mapEl" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The sidebar's scroll container — the scrollRowIntoView target. Null
   *  while the list is not rendered (loading / empty / error / destroyed). */
  listEl = viewChild(
    "listEl",
    ...ngDevMode ? [{ debugName: "listEl" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The component's own environment injector — passed explicitly to
   *  afterNextRender (scrollRowIntoView runs from Leaflet/geolocation
   *  callbacks, outside an injection context) and ties the deferred
   *  callback to the component's lifecycle (never fires after destroy). */
  injector = inject2(EnvironmentInjector);
  sourceFilters = SOURCE_FILTERS;
  /** The shared source/trust copy, exposed to the template (Angular's
   *  template scope is the component class). The row badge shows the
   *  source label (registry) or the trust-state label (USER rows);
   *  the trust badges (D6) reuse the shared openStatus/occupancy copy.
   *  Each wrapper injects the i18n seam so the badge reads in the active
   *  locale (the catalog keys behind them are the same ones the /mine
   *  panel and the band picker already render — one word per fact). */
  sourceTrustLabel = (s) => sourceTrustLabel(s, this.translate);
  communityBadgeClass = communityBadgeClass;
  /** The row's fresh-CLOSED badge text — fresh OPEN rows render no badge
   *  (open is the default). */
  openStatusBadgeText = (openStatus) => openStatusBadgeText(openStatus, this.translate);
  occupancyText = (occupancy) => occupancyText(occupancy, Date.now(), this.translate);
  /** The reported badge with its count (last-verified-meta). */
  reportedBadgeText = (nonexistentReports) => reportedBadgeText(nonexistentReports, this.translate);
  /** The nearest result's straight-line distance line (D6 honesty). */
  straightLineText = (km) => straightLineText(km, this.translate);
  /** The private-location predicate (D7) — the template stays branch-free. */
  isPrivateLocation = isPrivateLocation;
  /** Trust-badge predicates (D6) — the template keeps the `>` comparisons
   *  in code, not in the template expressions. */
  hasReports = hasReports;
  hasTrustBadges = hasTrustBadges;
  /** The address-search inline state (location-navigation) — the
   *  template renders the mapped copy, the kind stays in code. */
  anchorErrorText = () => {
    const kind = this.anchorError();
    return kind === null ? null : GEOCODE_ERROR_KEY[kind];
  };
  filter = signal(
    "ALL",
    ...ngDevMode ? [{ debugName: "filter" }] : (
      /* istanbul ignore next */
      []
    )
  );
  // ---- shelter filters ------------------------------------------------------
  /** Has capacity toggle chip -> `hasCapacity=true` (server-side). */
  hasCapacity = signal(
    false,
    ...ngDevMode ? [{ debugName: "hasCapacity" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Open toggle chip (client-side): keeps the rows whose derived display
   *  status reads OPEN (fresh OPEN + nothing-fresh),
   *  dropping the fresh-CLOSED rows (and lifecycle-INACTIVE rows, which
   *  never reach the public list). The BE has no such param, so the chip
   *  filters the loaded list WITHOUT a refetch and re-renders the markers
   *  from the filtered view. */
  openOnly = signal(
    false,
    ...ngDevMode ? [{ debugName: "openOnly" }] : (
      /* istanbul ignore next */
      []
    )
  );
  shelters = signal(
    [],
    ...ngDevMode ? [{ debugName: "shelters" }] : (
      /* istanbul ignore next */
      []
    )
  );
  loading = signal(
    false,
    ...ngDevMode ? [{ debugName: "loading" }] : (
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
  selectedId = signal(
    null,
    ...ngDevMode ? [{ debugName: "selectedId" }] : (
      /* istanbul ignore next */
      []
    )
  );
  // ---- nearest shelter (map-crisis-actions D1 + D2) ------------------------
  /** The session, exposed to the template (the "Add shelter" CTA and the
   *  empty-list offer render only for authenticated users). */
  auth = this.store;
  /** True while the geolocation request for the nearest shelter is in flight. */
  locating = signal(
    false,
    ...ngDevMode ? [{ debugName: "locating" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The nearest shelter (last success) — drives the one-line result under
   *  the CTA (name, distance, warnings) and the distance sort. It carries
   *  NO row emphasis (removed by owner decision — the list must not focus
   *  a single shelter). */
  nearest = signal(
    null,
    ...ngDevMode ? [{ debugName: "nearest" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The Haversine distance to the nearest shelter in km (last success) —
   *  shown as "≈ … straight line" (D6: distance honesty). Cleared with
   *  `nearest` everywhere (the two signals move as one). */
  nearestKm = signal(
    null,
    ...ngDevMode ? [{ debugName: "nearestKm" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The user's position from the last around-you success (null = none).
   *  While set, the sidebar list sorts by straight-line distance to it —
   *  the ranking the around-you action promises. A manual selection does
   *  NOT clear it (the position stays true); a new around-you run replaces
   *  it. */
  userPosition = signal(
    null,
    ...ngDevMode ? [{ debugName: "userPosition" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The loaded list was empty when the action ran — the "add the first one"
   *  offer (with the /submit link for authenticated users). */
  nearestEmpty = signal(
    false,
    ...ngDevMode ? [{ debugName: "nearestEmpty" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The last locate failure's message key (null = none); the template
   *  resolves it through the `t` pipe (i18n-et-en). */
  nearestError = signal(
    null,
    ...ngDevMode ? [{ debugName: "nearestError" }] : (
      /* istanbul ignore next */
      []
    )
  );
  // ---- address-search anchor (location-navigation) ----------------------
  /** The search input's content (a capture affordance, not a field). */
  anchorQuery = signal(
    "",
    ...ngDevMode ? [{ debugName: "anchorQuery" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** True while the Nominatim search is in flight (button pending state). */
  anchorSearching = signal(
    false,
    ...ngDevMode ? [{ debugName: "anchorSearching" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The result list (≤5) of the last successful search. */
  anchorResults = signal(
    [],
    ...ngDevMode ? [{ debugName: "anchorResults" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The last search failure's kind (null = none). */
  anchorError = signal(
    null,
    ...ngDevMode ? [{ debugName: "anchorError" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The active browse anchor — the searched point + its display label.
   *  While set, rows carry its straight-line distance and the list sorts
   *  by it (the name sort is the tiebreak); Clear restores the name sort. */
  anchor = signal(
    null,
    ...ngDevMode ? [{ debugName: "anchor" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * Sidebar rows: the "Open" chip's client-side filter first, then the
   * distance sort — the around-you user position wins (the action's
   * ranking), the browse anchor next, the stable name sort is the
   * default and the tiebreak everywhere (05-CONTEXT-MAP).
   */
  sorted = computed(
    () => {
      const rows = this.shelters().filter((row) => !this.openOnly() || isOpenRow(row));
      const list = [...rows];
      const userPosition = this.userPosition();
      if (userPosition !== null) {
        return list.sort((a, b) => {
          const da = haversineKm(userPosition.latitude, userPosition.longitude, a.latitude, a.longitude);
          const db = haversineKm(userPosition.latitude, userPosition.longitude, b.latitude, b.longitude);
          return da - db || a.name.localeCompare(b.name);
        });
      }
      const anchor = this.anchor();
      if (anchor === null) {
        return list.sort((a, b) => a.name.localeCompare(b.name));
      }
      return list.sort((a, b) => {
        const da = haversineKm(anchor.latitude, anchor.longitude, a.latitude, a.longitude);
        const db = haversineKm(anchor.latitude, anchor.longitude, b.latitude, b.longitude);
        return da - db || a.name.localeCompare(b.name);
      });
    },
    ...ngDevMode ? [{ debugName: "sorted" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Zero rows for the current filter — only when the fetch settled cleanly. */
  showEmpty = computed(
    () => !this.loading() && this.error() === null && this.shelters().length === 0,
    ...ngDevMode ? [{ debugName: "showEmpty" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Monotonic fetch sequence — a stale (out-of-order) response is dropped. */
  fetchSeq = 0;
  /** A search selection made while the list was empty: the result's point,
   *  whose nearest row must be selected once the refresh settles (the
   *  search-selection focus). Cleared on every load outcome and by any
   *  manual selection (the newer intent wins). */
  pendingAnchorSelection = null;
  /** Set in ngOnDestroy — a stray callback after route leave (a Leaflet
   *  marker event racing the destroy, the geolocation-callback bug class)
   *  must not touch the DOM. */
  destroyed = false;
  /**
   * The map container only exists once the view is rendered; a null container
   * (should never happen) skips map creation but never breaks the page.
   */
  ngAfterViewInit() {
    this.leaflet.markerClick = (id) => this.onMarkerClick(id);
    this.leaflet.create(this.mapEl()?.nativeElement ?? null, ESTONIA_CENTER, ESTONIA_ZOOM);
    this.load("ALL");
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.fetchSeq++;
    this.leaflet.destroy();
  }
  /** Chip click — refetch with the server-side source param (no client
   *  filter). Public so specs can drive it (page convention).
   *  Re-selecting the ACTIVE chip retries the last failed refetch — the
   *  equality guard must not swallow that click while an error banner is
   *  up. */
  setFilter(source) {
    if (source === this.filter() && this.error() === null) {
      return;
    }
    this.load(source);
  }
  /** Open toggle chip — flip + re-render the markers from the filtered
   *  list. Client-side: the BE has no open/closed param, so NO refetch —
   *  the loaded list is filtered and the marker layer follows the same
   *  `sorted()` view the sidebar renders. */
  toggleOpen() {
    this.openOnly.update((active) => !active);
    this.leaflet.renderShelters(this.sorted());
  }
  /** Has capacity toggle chip — flip + refetch with the current source. */
  toggleHasCapacity() {
    this.hasCapacity.update((active) => !active);
    this.load(this.filter());
  }
  /**
   * The active trust filter, or undefined when none is active (D5).
   * An undefined result keeps the legacy single-arg `list(source)` call
   * shape — the query string stays minimal (only `source`) until the filter is
   * actually set. (The `reviewed` param is gone with the review model;
   * "Open" is client-side and never reaches the query string.)
   */
  activeTrustFilter() {
    return this.hasCapacity() ? { hasCapacity: true } : void 0;
  }
  /**
   * Row click: select (highlight) + fly the map to the shelter at street
   * level. Does NOT navigate — the selected row's "View details" link is
   * the explicit step to /shelters/{id} (design decision 5). Public so
   * specs can drive it (page convention).
   */
  selectShelter(shelter) {
    this.pendingAnchorSelection = null;
    this.nearest.set(null);
    this.nearestKm.set(null);
    this.selectedId.set(shelter.id);
    this.leaflet.flyTo(shelter.latitude, shelter.longitude, SHELTER_ZOOM);
  }
  /**
   * Marker click (LeafletService callback): select + zoom exactly like a
   * row click — the user stays on the map looking at the clicked point.
   * Markers are rendered from `sorted()`, so the id lookup runs over the
   * same list. A not-found id (a marker click racing a filter refetch) just
   * selects without a fly — the map already shows that point.
   */
  onMarkerClick(id) {
    const row = this.sorted().find((s) => s.id === id);
    if (row) {
      this.selectShelter(row);
    } else {
      this.pendingAnchorSelection = null;
      this.nearest.set(null);
      this.nearestKm.set(null);
      this.selectedId.set(id);
    }
    this.scrollRowIntoView(id);
  }
  /**
   * "Nearest shelter" (map-crisis-actions D1/D2): a high-accuracy
   * geolocation request (the shared mechanism, options and error mapping —
   * shared/geolocation.ts), then the closest shelter computed CLIENT-SIDE
   * from the already-loaded list — no backend call. On success:
   * the map flies to the USER'S OWN POSITION at regional scale
   * (AROUND_ZOOM 14 — a neighbourhood, not a single shelter's street) and
   * does NOT select any row; the nearest shelter stays the RESULT of the
   * action (row emphasis + the one-line "Nearest: …" state), and the list
   * sorts by straight-line distance to the user's position. On failure:
   * per-error copy (the submit page's vocabulary); the list and map stay
   * untouched. Public so specs can drive it (page convention).
   */
  findNearest() {
    if (this.locating() || this.loading() || this.error() !== null) {
      return;
    }
    this.nearest.set(null);
    this.nearestKm.set(null);
    this.nearestError.set(null);
    this.nearestEmpty.set(false);
    if (this.shelters().length === 0) {
      this.nearestEmpty.set(true);
      return;
    }
    this.locating.set(true);
    void getCurrentPositionHighAccuracy().then((coords) => {
      this.locating.set(false);
      this.focusNearestShelter(coords.latitude, coords.longitude);
    }, (failure) => {
      this.locating.set(false);
      const kind = failure instanceof GeolocationError ? failure.kind : "unavailable";
      this.nearestError.set(NEAREST_KEY[kind]);
    });
  }
  /**
   * Around-you success (owner decision): the map flies to the user's OWN
   * position at regional scale (AROUND_ZOOM 14) — NOT to the nearest
   * shelter, and NO row is selected, emphasized or scrolled to. The nearest
   * shelter is the action's RESULT: the one-line result (name,
   * straight-line distance, the unverified warning when it is a community
   * row), and the sidebar list sorts by straight-line distance to the
   * user's position while it is set.
   */
  focusNearestShelter(latitude, longitude) {
    const hit = nearestShelterAt(latitude, longitude, this.shelters());
    if (hit === null) {
      if (this.error() === null) {
        this.nearestEmpty.set(true);
      }
      return;
    }
    this.nearest.set(hit.row);
    this.nearestKm.set(hit.km);
    this.userPosition.set({ latitude, longitude });
    this.leaflet.flyTo(latitude, longitude, AROUND_ZOOM);
  }
  // ---- address-search anchor (location-navigation) -----------------------
  onAnchorQueryChange(event) {
    this.anchorQuery.set(event.target.value);
  }
  /** Enter in the search input searches (the /submit convention). */
  onAnchorSearchKey(event) {
    if (!(event instanceof KeyboardEvent) || event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    this.startAnchorSearch();
  }
  /**
   * The "Search" button (and Enter): ONE deliberate Nominatim request per
   * press — no autosuggest (Nominatim usage policy). A press while a
   * search is pending is IGNORED, never stacked; if the press lands inside
   * the gateway's 1000 ms spacing window it waits it out and the button
   * stays pending the whole time (the shelter-address-search contract,
   * mirrored). A failure NEVER sets an anchor and touches nothing else.
   */
  startAnchorSearch() {
    if (this.anchorSearching()) {
      return;
    }
    const query = this.anchorQuery().trim();
    if (query === "") {
      return;
    }
    this.anchorSearching.set(true);
    this.anchorError.set(null);
    this.anchorResults.set([]);
    void this.geocode.search(query).then((results) => {
      if (results.length === 0) {
        this.anchorError.set("no-results");
        return;
      }
      this.anchorResults.set(results);
    }).catch((failure) => {
      const api = toApiError(failure);
      this.anchorError.set(api.status === 429 ? "rate-limited" : "network");
    }).finally(() => this.anchorSearching.set(false));
  }
  /**
   * Selecting a result sets the BROWSE ANCHOR: the anchor pin, the
   * fly to neighbourhood scale, and every row's straight-line distance
   * follow this point. A selection supersedes the nearest emphasis (the
   * next-interaction-supersedes convention) and collapses the result list.
   *
   * Search-selection focus: on top of the existing fly-to, the result's
   * NEAREST shelter is selected in the sidebar list — the same selected
   * state a marker click gives (highlight + "View details" link, NO extra
   * fly: the camera already went to the searched point) — and scrolled
   * into view with block 'center'. The search result is an address, not a
   * shelter row, so "the shelter the user selected" is the nearest loaded
   * row to that address (the anchor contract: the search exists to
   * compare the surroundings). If nothing is loaded, the list is re-loaded
   * with the CURRENT filters and the nearest row is selected once the load
   * settles (pendingAnchorSelection).
   */
  selectAnchorResult(result) {
    this.nearest.set(null);
    this.nearestKm.set(null);
    this.anchor.set({
      latitude: result.latitude,
      longitude: result.longitude,
      label: result.displayName
    });
    this.anchorResults.set([]);
    this.anchorError.set(null);
    this.leaflet.setAnchor(result.latitude, result.longitude, this.i18n.t("map.searched"));
    this.leaflet.flyTo(result.latitude, result.longitude, ANCHOR_ZOOM);
    const loaded = this.shelters();
    const hit = nearestShelterAt(result.latitude, result.longitude, loaded);
    if (hit === null) {
      this.pendingAnchorSelection = { latitude: result.latitude, longitude: result.longitude };
      this.load(this.filter());
    } else {
      this.selectRow(hit.row.id, "center");
    }
  }
  /**
   * Select a row by id with the SAME selected state as a marker click
   * (highlight + "View details" link) and scroll it into view. No fly —
   * the caller owns the camera (a marker click flies to the shelter, the
   * search selection flies to the searched point).
   */
  selectRow(id, block) {
    this.selectedId.set(id);
    this.scrollRowIntoView(id, block);
  }
  /** Removes the anchor — pin, per-row distances, and the distance sort. */
  clearAnchor() {
    this.anchor.set(null);
    this.leaflet.setAnchor(null, null, "");
  }
  /** The straight-line distance from the active anchor to the row (km),
   *  or null when no anchor is set. Pure Haversine over already-loaded
   *  rows — the D2 "no new endpoint" precedent (client-side only). */
  anchorDistance(shelter) {
    const anchor = this.anchor();
    if (anchor === null) {
      return null;
    }
    return haversineKm(anchor.latitude, anchor.longitude, shelter.latitude, shelter.longitude);
  }
  /**
   * Scroll the row for `id` into view inside the sidebar list — the accent
   * (the selection ring from a marker click, the temporary emphasis from a
   * nearest success) must land on a row the user can actually see.
   *
   * Deferred to afterNextRender: the signal write that triggered this call
   * re-renders the row first (the selected row GROWS its "View details"
   * link), so the scroll measures the final layout, not the pre-update one.
   * `block` defaults to 'nearest': a no-op when the row is already visible
   * (no jumpy re-scroll), the minimum scroll when it isn't. The search-
   * selection focus passes 'center' — the selected row is the point of
   * interest and must sit mid-viewport. A missing list (loading / empty /
   * destroyed) or a missing row (filtered out) is a no-op. Under the list's
   * proximity scroll-snap, the smooth scroll simply settles on the nearest
   * row edge after it finishes (proximity never forces a position).
   */
  scrollRowIntoView(id, block = "nearest") {
    if (this.destroyed) {
      return;
    }
    afterNextRender(() => {
      const list = this.listEl()?.nativeElement;
      if (!list) {
        return;
      }
      const row = list.querySelector(`[data-shelter-id="${id}"]`);
      if (row) {
        row.scrollIntoView({ block, behavior: "smooth" });
      }
    }, { injector: this.injector });
  }
  load(source) {
    const seq = ++this.fetchSeq;
    this.filter.set(source);
    this.error.set(null);
    this.loading.set(true);
    const trust = this.activeTrustFilter();
    const request = trust === void 0 ? this.gateway.list(source) : this.gateway.list(source, trust);
    void request.then((rows) => {
      if (seq !== this.fetchSeq) {
        return;
      }
      this.shelters.set(rows);
      this.selectedId.set(null);
      this.nearest.set(null);
      this.nearestKm.set(null);
      this.nearestEmpty.set(false);
      this.leaflet.renderShelters(this.sorted());
      this.loading.set(false);
      const pending = this.pendingAnchorSelection;
      this.pendingAnchorSelection = null;
      if (pending !== null) {
        const hit = nearestShelterAt(pending.latitude, pending.longitude, rows);
        if (hit !== null) {
          this.selectRow(hit.row.id, "center");
        }
      }
    }, (failure) => {
      if (seq !== this.fetchSeq) {
        return;
      }
      this.pendingAnchorSelection = null;
      this.shelters.set([]);
      this.selectedId.set(null);
      this.nearest.set(null);
      this.nearestKm.set(null);
      this.nearestEmpty.set(false);
      this.leaflet.renderShelters([]);
      this.error.set(bannerMessage(failure, "shelter", (key) => this.i18n.t(key)));
      this.loading.set(false);
    });
  }
  static \u0275fac = function MapPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MapPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _MapPage, selectors: [["app-map-page"]], viewQuery: function MapPage_Query(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275viewQuerySignal(ctx.mapEl, _c0, 5)(ctx.listEl, _c1, 5);
    }
    if (rf & 2) {
      i0.\u0275\u0275queryAdvance(2);
    }
  }, features: [i0.\u0275\u0275ProvidersFeature([LeafletService])], decls: 106, vars: 101, consts: [["mapEl", ""], ["listEl", ""], [1, "map-page"], [1, "map-page__header"], [1, "page-title"], [1, "page-subtitle"], [1, "map-page__layout"], [1, "map-page__map"], [1, "map-page__leaflet"], ["role", "group", 1, "map-legend"], [1, "legend-item"], ["aria-hidden", "true", 1, "shelter-marker", "shelter-marker--registry", "legend-swatch"], ["aria-hidden", "true", 1, "shelter-marker", "shelter-marker--user", "legend-swatch"], ["aria-hidden", "true", 1, "shelter-marker", "shelter-marker--partial", "legend-swatch"], ["aria-hidden", "true", 1, "shelter-marker", "shelter-marker--full", "legend-swatch"], ["aria-hidden", "true", 1, "shelter-marker", "shelter-marker--reported", "legend-swatch"], ["aria-hidden", "true", 1, "shelter-marker", "shelter-marker--anchor", "legend-swatch"], [1, "map-page__sidebar"], [1, "map-page__actions"], ["type", "button", 1, "btn", "btn--block", "map-cta", 3, "click", "disabled"], [1, "map-page__geo-note"], [1, "map-page__anchor-search"], ["for", "anchor-search-input", 1, "anchor-search__label"], [1, "anchor-search__row"], ["id", "anchor-search-input", "type", "text", 1, "anchor-search__input", 3, "input", "keydown", "placeholder", "value", "disabled"], ["type", "button", 1, "btn", "anchor-search__button", 3, "click", "disabled"], [1, "anchor-search__attribution"], ["href", "https://www.openstreetmap.org/copyright", "target", "_blank", "rel", "noopener"], [1, "anchor-search__results"], ["routerLink", "/submit", 1, "btn", "btn--ghost", "btn--block"], [1, "nearest-line"], ["role", "alert", 1, "nearest-line", "nearest-line--error"], ["role", "status", 1, "anchor-line"], ["role", "group", 1, "filter-chips"], ["type", "button", 1, "chip", 3, "chip--active"], ["role", "group", 1, "filter-trust"], ["type", "button", 1, "chip", "trust-chip", 3, "click"], ["severity", "error", 3, "message"], [1, "sidebar-state", 3, "message"], [1, "sidebar-state", 3, "kind", "messageKey"], [1, "shelter-list"], ["aria-labelledby", "how-title", 1, "map-page__how"], ["id", "how-title", 1, "map-page__how-title"], [1, "map-page__how-lede"], [1, "map-page__how-guarantee"], [1, "anchor-search__error"], ["role", "alert", 1, "anchor-search__error"], ["type", "button", 1, "anchor-search__result", 3, "click"], [1, "anchor-search__result-name"], [1, "anchor-search__result-type"], ["role", "status", 1, "nearest-line"], [1, "nearest-line__address"], [1, "nearest-line__distance"], [1, "nearest-line", "nearest-line--warning"], ["routerLink", "/submit"], [1, "anchor-line__label"], ["type", "button", 1, "anchor-line__clear", 3, "click"], ["type", "button", 1, "chip", 3, "click"], ["type", "button", 1, "shelter-row", 3, "click"], [1, "shelter-row__name"], [1, "shelter-row__address"], [1, "shelter-row__meta"], [1, "badge", 3, "ngClass"], [1, "badge", "badge--private"], [1, "shelter-row__anchor-distance", "num-tabular"], [1, "shelter-row__badges"], [1, "shelter-row__details", "btn", "btn--ghost", 3, "routerLink"], [1, "badge", "badge--reported"], [1, "badge", "badge--closed"], [1, "badge", "badge--occupancy"]], template: function MapPage_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275elementStart(0, "section", 2)(1, "header", 3)(2, "h1", 4);
      i0.\u0275\u0275text(3);
      i0.\u0275\u0275pipe(4, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(5, "p", 5);
      i0.\u0275\u0275text(6);
      i0.\u0275\u0275pipe(7, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(8, "div", 6)(9, "div", 7);
      i0.\u0275\u0275element(10, "div", 8, 0);
      i0.\u0275\u0275elementStart(12, "div", 9);
      i0.\u0275\u0275pipe(13, "t");
      i0.\u0275\u0275elementStart(14, "span", 10);
      i0.\u0275\u0275element(15, "span", 11);
      i0.\u0275\u0275text(16);
      i0.\u0275\u0275pipe(17, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(18, "span", 10);
      i0.\u0275\u0275element(19, "span", 12);
      i0.\u0275\u0275text(20);
      i0.\u0275\u0275pipe(21, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(22, "span", 10);
      i0.\u0275\u0275element(23, "span", 13);
      i0.\u0275\u0275text(24);
      i0.\u0275\u0275pipe(25, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(26, "span", 10);
      i0.\u0275\u0275element(27, "span", 14);
      i0.\u0275\u0275text(28);
      i0.\u0275\u0275pipe(29, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(30, "span", 10);
      i0.\u0275\u0275element(31, "span", 15);
      i0.\u0275\u0275text(32);
      i0.\u0275\u0275pipe(33, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(34, "span", 10);
      i0.\u0275\u0275element(35, "span", 16);
      i0.\u0275\u0275text(36);
      i0.\u0275\u0275pipe(37, "t");
      i0.\u0275\u0275elementEnd()()();
      i0.\u0275\u0275elementStart(38, "aside", 17)(39, "div", 18)(40, "button", 19);
      i0.\u0275\u0275listener("click", function MapPage_Template_button_click_40_listener() {
        return ctx.findNearest();
      });
      i0.\u0275\u0275text(41);
      i0.\u0275\u0275pipe(42, "t");
      i0.\u0275\u0275pipe(43, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(44, "p", 20);
      i0.\u0275\u0275text(45);
      i0.\u0275\u0275pipe(46, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(47, "div", 21)(48, "label", 22);
      i0.\u0275\u0275text(49);
      i0.\u0275\u0275pipe(50, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(51, "div", 23)(52, "input", 24);
      i0.\u0275\u0275pipe(53, "t");
      i0.\u0275\u0275listener("input", function MapPage_Template_input_input_52_listener($event) {
        return ctx.onAnchorQueryChange($event);
      })("keydown", function MapPage_Template_input_keydown_52_listener($event) {
        return ctx.onAnchorSearchKey($event);
      });
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(54, "button", 25);
      i0.\u0275\u0275listener("click", function MapPage_Template_button_click_54_listener() {
        return ctx.startAnchorSearch();
      });
      i0.\u0275\u0275text(55);
      i0.\u0275\u0275pipe(56, "t");
      i0.\u0275\u0275pipe(57, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(58, "p", 26);
      i0.\u0275\u0275text(59);
      i0.\u0275\u0275pipe(60, "t");
      i0.\u0275\u0275elementStart(61, "a", 27);
      i0.\u0275\u0275text(62);
      i0.\u0275\u0275pipe(63, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275conditionalCreate(64, MapPage_Conditional_64_Template, 2, 1);
      i0.\u0275\u0275conditionalCreate(65, MapPage_Conditional_65_Template, 4, 3, "ul", 28);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275conditionalCreate(66, MapPage_Conditional_66_Template, 3, 3, "a", 29);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275conditionalCreate(67, MapPage_Conditional_67_Template, 7, 8)(68, MapPage_Conditional_68_Template, 4, 4, "p", 30)(69, MapPage_Conditional_69_Template, 3, 3, "p", 31);
      i0.\u0275\u0275conditionalCreate(70, MapPage_Conditional_70_Template, 8, 7, "p", 32);
      i0.\u0275\u0275elementStart(71, "div", 33);
      i0.\u0275\u0275pipe(72, "t");
      i0.\u0275\u0275repeaterCreate(73, MapPage_For_74_Template, 3, 5, "button", 34, _forTrack0);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(75, "div", 35);
      i0.\u0275\u0275pipe(76, "t");
      i0.\u0275\u0275elementStart(77, "button", 36);
      i0.\u0275\u0275listener("click", function MapPage_Template_button_click_77_listener() {
        return ctx.toggleOpen();
      });
      i0.\u0275\u0275text(78);
      i0.\u0275\u0275pipe(79, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(80, "button", 36);
      i0.\u0275\u0275listener("click", function MapPage_Template_button_click_80_listener() {
        return ctx.toggleHasCapacity();
      });
      i0.\u0275\u0275text(81);
      i0.\u0275\u0275pipe(82, "t");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275conditionalCreate(83, MapPage_Conditional_83_Template, 1, 1, "app-banner", 37);
      i0.\u0275\u0275conditionalCreate(84, MapPage_Conditional_84_Template, 2, 3, "app-loading-indicator", 38)(85, MapPage_Conditional_85_Template, 1, 2, "app-list-state", 39)(86, MapPage_Conditional_86_Template, 5, 3, "ul", 40);
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementStart(87, "section", 41)(88, "h2", 42);
      i0.\u0275\u0275text(89);
      i0.\u0275\u0275pipe(90, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(91, "p", 43);
      i0.\u0275\u0275text(92);
      i0.\u0275\u0275pipe(93, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(94, "p");
      i0.\u0275\u0275text(95);
      i0.\u0275\u0275pipe(96, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(97, "p");
      i0.\u0275\u0275text(98);
      i0.\u0275\u0275pipe(99, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(100, "p");
      i0.\u0275\u0275text(101);
      i0.\u0275\u0275pipe(102, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(103, "p", 44);
      i0.\u0275\u0275text(104);
      i0.\u0275\u0275pipe(105, "t");
      i0.\u0275\u0275elementEnd()()();
    }
    if (rf & 2) {
      let tmp_23_0;
      let tmp_26_0;
      let tmp_27_0;
      let tmp_37_0;
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(4, 45, "map.title"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(7, 47, "map.subtitle"));
      i0.\u0275\u0275advance(6);
      i0.\u0275\u0275attribute("aria-label", i0.\u0275\u0275pipeBind1(13, 49, "map.legendAria"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(17, 51, "map.legend.registry"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(21, 53, "map.legend.confirmed"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(25, 55, "map.legend.partialVerified"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(29, 57, "map.legend.fullVerified"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(33, 59, "map.legend.reported"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(37, 61, "map.searched"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275property("disabled", ctx.locating() || ctx.loading() || ctx.error() !== null);
      i0.\u0275\u0275attribute("aria-busy", ctx.locating());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275textInterpolate1(" ", ctx.locating() ? i0.\u0275\u0275pipeBind1(42, 63, "map.locating") : i0.\u0275\u0275pipeBind1(43, 65, "map.aroundYou"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(46, 67, "map.geoNote"));
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(50, 69, "map.anchorLabel"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275property("placeholder", i0.\u0275\u0275pipeBind1(53, 71, "map.anchorPlaceholder"))("value", ctx.anchorQuery())("disabled", ctx.anchorSearching());
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275property("disabled", ctx.anchorSearching() || ctx.anchorQuery().trim() === "");
      i0.\u0275\u0275attribute("aria-busy", ctx.anchorSearching());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275textInterpolate1(" ", ctx.anchorSearching() ? i0.\u0275\u0275pipeBind1(56, 73, "map.searching") : i0.\u0275\u0275pipeBind1(57, 75, "map.search"), " ");
      i0.\u0275\u0275advance(4);
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(60, 77, "map.attributionLead"), " ");
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(63, 79, "map.osmAttribution"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275conditional((tmp_23_0 = ctx.anchorErrorText()) ? 64 : -1, tmp_23_0);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.anchorResults().length ? 65 : -1);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.auth.initialized() && ctx.auth.authenticated() ? 66 : -1);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional((tmp_26_0 = ctx.nearest()) ? 67 : ctx.nearestEmpty() ? 68 : (tmp_26_0 = ctx.nearestError()) ? 69 : -1, tmp_26_0);
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275conditional((tmp_27_0 = ctx.anchor()) ? 70 : -1, tmp_27_0);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275attribute("aria-label", i0.\u0275\u0275pipeBind1(72, 81, "map.filterSourcesAria"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275repeater(ctx.sourceFilters);
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275attribute("aria-label", i0.\u0275\u0275pipeBind1(76, 83, "map.trustFiltersAria"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275classProp("chip--active", ctx.openOnly());
      i0.\u0275\u0275attribute("aria-pressed", ctx.openOnly());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(79, 85, "map.chipOpen"), " ");
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275classProp("chip--active", ctx.hasCapacity());
      i0.\u0275\u0275attribute("aria-pressed", ctx.hasCapacity());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(82, 87, "map.chipHasCapacity"), " ");
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275conditional((tmp_37_0 = ctx.error()) ? 83 : -1, tmp_37_0);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.loading() ? 84 : ctx.showEmpty() ? 85 : ctx.sorted().length ? 86 : -1);
      i0.\u0275\u0275advance(5);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(90, 89, "how.title"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(93, 91, "how.what"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(96, 93, "how.sources"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(99, 95, "how.report"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(102, 97, "how.nearest"));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(105, 99, "how.guarantee"));
    }
  }, dependencies: [NgClass, RouterLink, BannerComponent, ListState, LoadingIndicator, TranslatePipe], styles: ['@charset "UTF-8";\n\n\n[_nghost-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n}\n.map-page[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n}\n.map-page__header[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n}\n.map-page__layout[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-20);\n  align-items: stretch;\n  flex: 1;\n  min-height: 725px;\n}\n.map-page__map[_ngcontent-%COMP%] {\n  position: relative;\n  flex: 1;\n  min-width: 0;\n}\n.map-page__map[_ngcontent-%COMP%]   .map-page__leaflet[_ngcontent-%COMP%] {\n  height: 100%;\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-lg);\n  background: var(--%NS%color-map-placeholder);\n}\n.map-legend[_ngcontent-%COMP%] {\n  position: absolute;\n  left: var(--%NS%space-12);\n  bottom: var(--%NS%space-32);\n  z-index: 1000;\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-4);\n  padding: var(--%NS%space-8) var(--%NS%space-10);\n  background: var(--%NS%color-surface-overlay);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-md);\n  font-size: var(--%NS%text-xs);\n  color: var(--%NS%color-text);\n}\n.map-legend[_ngcontent-%COMP%]   .legend-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: var(--%NS%space-6);\n}\n.map-legend[_ngcontent-%COMP%]   .legend-swatch[_ngcontent-%COMP%] {\n  width: 12px;\n  height: 12px;\n  flex-shrink: 0;\n  position: relative;\n}\n.map-legend[_ngcontent-%COMP%]   .legend-swatch.shelter-marker--partial[_ngcontent-%COMP%] {\n  width: 10px;\n  height: 10px;\n  margin-left: 1px;\n}\n.map-page__sidebar[_ngcontent-%COMP%] {\n  width: 344px;\n  flex-shrink: 0;\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-12);\n}\n.map-page__sidebar[_ngcontent-%COMP%]   .shelter-list[_ngcontent-%COMP%] {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  overflow-y: auto;\n  flex: 1 1 0;\n  min-height: 0;\n}\n.map-page__actions[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-8);\n}\n.map-cta[_ngcontent-%COMP%] {\n  background: var(--%NS%color-cta);\n  color: var(--%NS%color-bg-surface);\n}\n.map-cta[_ngcontent-%COMP%]:hover:not(:disabled) {\n  filter: brightness(0.92);\n}\n.map-page__geo-note[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n.map-page__anchor-search[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-6);\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__label[_ngcontent-%COMP%] {\n  font-size: var(--%NS%text-sm);\n  font-weight: var(--%NS%font-weight-semibold);\n  color: var(--%NS%color-text);\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__row[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-6);\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__input[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  min-height: var(--%NS%space-48);\n  padding: var(--%NS%space-6) var(--%NS%space-10);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-lg);\n  background: var(--%NS%color-bg-surface);\n  color: var(--%NS%color-text);\n  font-family: inherit;\n  font-size: var(--%NS%text-md);\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__input[_ngcontent-%COMP%]:focus-visible {\n  outline: 2px solid var(--%NS%color-primary);\n  outline-offset: 1px;\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__button[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__attribution[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-2xs);\n  color: var(--%NS%color-muted);\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__attribution[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  text-decoration: underline;\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__error[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-danger);\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__results[_ngcontent-%COMP%] {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-4);\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__results[_ngcontent-%COMP%]   .anchor-search__result[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-2);\n  width: 100%;\n  padding: var(--%NS%space-8) var(--%NS%space-10);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-lg);\n  background: var(--%NS%color-bg-surface);\n  color: var(--%NS%color-text);\n  font-family: inherit;\n  font-size: var(--%NS%text-sm);\n  text-align: left;\n  cursor: pointer;\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__results[_ngcontent-%COMP%]   .anchor-search__result[_ngcontent-%COMP%]:hover {\n  border-color: var(--%NS%color-primary);\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__results[_ngcontent-%COMP%]   .anchor-search__result-name[_ngcontent-%COMP%] {\n  font-weight: var(--%NS%font-weight-semibold);\n}\n.map-page__anchor-search[_ngcontent-%COMP%]   .anchor-search__results[_ngcontent-%COMP%]   .anchor-search__result-type[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-2xs);\n}\n.anchor-line[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-text);\n}\n.anchor-line[_ngcontent-%COMP%]   .anchor-line__label[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n}\n.anchor-line[_ngcontent-%COMP%]   .anchor-line__clear[_ngcontent-%COMP%] {\n  padding: 0 var(--%NS%space-4);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-full);\n  background: var(--%NS%color-bg-surface);\n  color: var(--%NS%color-text);\n  font-family: inherit;\n  font-size: var(--%NS%text-2xs);\n  cursor: pointer;\n}\n.anchor-line[_ngcontent-%COMP%]   .anchor-line__clear[_ngcontent-%COMP%]:hover:not(:disabled) {\n  border-color: var(--%NS%color-primary);\n}\n.nearest-line[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-text);\n}\n.nearest-line[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--%NS%color-primary);\n}\n.nearest-line[_ngcontent-%COMP%]   .nearest-line__address[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n}\n.nearest-line[_ngcontent-%COMP%] {\n}\n.nearest-line[_ngcontent-%COMP%]   .nearest-line__distance[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n}\n.nearest-line--error[_ngcontent-%COMP%] {\n  color: var(--%NS%color-danger);\n}\n.nearest-line[_ngcontent-%COMP%] {\n}\n.nearest-line--warning[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  margin-top: var(--%NS%space-4);\n}\n.filter-chips[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-6);\n  flex-wrap: wrap;\n}\n.filter-chips[_ngcontent-%COMP%]   .chip[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.filter-trust[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-6);\n  flex-wrap: wrap;\n  align-items: center;\n}\n.filter-trust[_ngcontent-%COMP%]   .trust-chip[_ngcontent-%COMP%] {\n  flex: 1 1 0;\n  min-width: 0;\n  min-height: var(--%NS%space-48);\n}\n.sidebar-state[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  text-align: center;\n  padding: var(--%NS%space-24) var(--%NS%space-8);\n  margin: 0;\n}\n.shelter-row[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-2);\n  width: 100%;\n  padding: var(--%NS%space-10) var(--%NS%space-12);\n  margin-bottom: var(--%NS%space-8);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-lg);\n  background: var(--%NS%color-bg-surface);\n  color: inherit;\n  font-family: inherit;\n  font-size: inherit;\n  text-align: left;\n  cursor: pointer;\n}\n.shelter-row[_ngcontent-%COMP%]:hover {\n  border-color: var(--%NS%color-primary);\n}\n.shelter-row.shelter-row--selected[_ngcontent-%COMP%] {\n  border-color: var(--%NS%color-primary);\n}\n.shelter-row[_ngcontent-%COMP%]   .shelter-row__name[_ngcontent-%COMP%] {\n  font-weight: var(--%NS%font-weight-semibold);\n}\n.shelter-row[_ngcontent-%COMP%]   .shelter-row__address[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n.shelter-row[_ngcontent-%COMP%]   .shelter-row__meta[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-top: var(--%NS%space-4);\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n.shelter-row[_ngcontent-%COMP%] {\n}\n.shelter-row[_ngcontent-%COMP%]   .shelter-row__anchor-distance[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n}\n.shelter-row__details[_ngcontent-%COMP%] {\n  display: block;\n  margin-top: calc(var(--%NS%space-8) * -1);\n  margin-bottom: var(--%NS%space-8);\n  padding-left: var(--%NS%space-12);\n  padding-right: var(--%NS%space-12);\n  text-align: left;\n  justify-content: flex-start;\n}\n.badge[_ngcontent-%COMP%] {\n  background: color-mix(in srgb, var(--%NS%color-shelter-registry) 8%, var(--%NS%color-bg-surface));\n  color: var(--%NS%color-shelter-registry);\n}\n.badge.badge--user[_ngcontent-%COMP%] {\n  background: color-mix(in srgb, var(--%NS%color-shelter-user) 8%, var(--%NS%color-bg-surface));\n  color: var(--%NS%color-shelter-user);\n}\n.shelter-row__badges[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--%NS%space-4);\n  margin-top: var(--%NS%space-4);\n}\n.map-page__how[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  max-width: 65ch;\n  margin-top: var(--%NS%space-32);\n  padding-top: var(--%NS%space-24);\n  padding-bottom: var(--%NS%space-48);\n  border-top: 1px solid var(--%NS%color-border-subtle);\n  font-size: var(--%NS%text-base);\n}\n.map-page__how[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-12);\n  line-height: 1.6;\n}\n.map-page__how[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]:last-child {\n  margin-bottom: 0;\n}\n.map-page__how[_ngcontent-%COMP%]   .map-page__how-title[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-20);\n  font-size: var(--%NS%text-xl);\n  font-weight: var(--%NS%font-weight-title);\n  line-height: 1.3;\n}\n.map-page__how[_ngcontent-%COMP%] {\n}\n.map-page__how[_ngcontent-%COMP%]   .map-page__how-lede[_ngcontent-%COMP%] {\n  font-size: var(--%NS%text-lg);\n  margin-bottom: var(--%NS%space-16);\n}\n.map-page__how[_ngcontent-%COMP%] {\n}\n.map-page__how[_ngcontent-%COMP%]   .map-page__how-guarantee[_ngcontent-%COMP%] {\n  margin-top: var(--%NS%space-16);\n  font-weight: var(--%NS%font-weight-medium);\n}\n@media (max-width: 900px) {\n  .map-page__layout[_ngcontent-%COMP%] {\n    flex-direction: column;\n    flex: none;\n    min-height: 0;\n  }\n  .map-page__map[_ngcontent-%COMP%]   .map-page__leaflet[_ngcontent-%COMP%] {\n    height: 420px;\n  }\n  .map-page__sidebar[_ngcontent-%COMP%] {\n    width: auto;\n  }\n  .map-page__sidebar[_ngcontent-%COMP%]   .shelter-list[_ngcontent-%COMP%] {\n    flex: none;\n    max-height: 420px;\n  }\n}\n/*# sourceMappingURL=map-page.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(MapPage, [{
    type: Component,
    args: [{ selector: "app-map-page", imports: [NgClass, RouterLink, BannerComponent, ListState, LoadingIndicator, TranslatePipe], providers: [LeafletService], changeDetection: ChangeDetectionStrategy.OnPush, template: `<section class="map-page">
  <header class="map-page__header">
    <h1 class="page-title">{{ 'map.title' | t }}</h1>
    <p class="page-subtitle">{{ 'map.subtitle' | t }}</p>
  </header>

  <div class="map-page__layout">
    <div class="map-page__map">
      <div #mapEl class="map-page__leaflet"></div>
      <div class="map-legend" role="group" [attr.aria-label]="'map.legendAria' | t">
        <span class="legend-item">
          <span
            class="shelter-marker shelter-marker--registry legend-swatch"
            aria-hidden="true"
          ></span>
          {{ 'map.legend.registry' | t }}
        </span>
        <!-- Community trust tone (community-review-queue D5): the community
             pin is still rendered \u2014 a community row whose submitter depth the
             API does not report keeps this tone (the unified yellow, the same
             tone as confirmed). The NEW tone is deliberately NOT a legend
             entry (owner decision): the verification shapes carry the
             community-row story on the map, and the row badge text still says
             "Newly added" wherever it applies. -->
        <span class="legend-item">
          <span class="shelter-marker shelter-marker--user legend-swatch" aria-hidden="true"></span>
          {{ 'map.legend.confirmed' | t }}
        </span>
        <!-- Submitter verification depth (submitter-verification-badge, owner
             decision): the SHAPE carries it for community rows \u2014 a triangle at
             exactly one confirmed channel, a circle at two or more. The trust
             state (newly added / community-checked) stays on the row's badge
             text, so nothing is lost by moving the marker colour to the
             verification family. -->
        <span class="legend-item">
          <span
            class="shelter-marker shelter-marker--partial legend-swatch"
            aria-hidden="true"
          ></span>
          {{ 'map.legend.partialVerified' | t }}
        </span>
        <span class="legend-item">
          <span class="shelter-marker shelter-marker--full legend-swatch" aria-hidden="true"></span>
          {{ 'map.legend.fullVerified' | t }}
        </span>
        <!-- Reported state (shelter-trust-and-reports D6): the single
             orange "reported" affordance \u2014 beats the trust colour. -->
        <span class="legend-item">
          <span
            class="shelter-marker shelter-marker--reported legend-swatch"
            aria-hidden="true"
          ></span>
          {{ 'map.legend.reported' | t }}
        </span>
        <!-- The origin marker (M8): the searched address the per-row
             "\u2248 N m straight line" distances are measured from. The
             diamond shape (not a circle) is the non-colour-only
             distinction from shelter markers; the swatch reuses the
             exact pin class. The label reuses the existing \`map.searched\`
             key \u2014 a dedicated \`map.legend.anchor\` key is requested from
             the i18n lane (see the M8 report). -->
        <span class="legend-item">
          <span
            class="shelter-marker shelter-marker--anchor legend-swatch"
            aria-hidden="true"
          ></span>
          {{ 'map.searched' | t }}
        </span>
      </div>
    </div>

    <aside class="map-page__sidebar">
      <!-- Crisis actions (map-crisis-actions D1/D4): the single safety-
           orange CTA (the ONLY consumer of --color-cta) and the
           authenticated-only "Add shelter" entry \u2014 the /submit route guards
           handle the verified redirect. Above the chips: this is "the"
           action of the page. -->
      <div class="map-page__actions">
        <button
          type="button"
          class="btn btn--block map-cta"
          (click)="findNearest()"
          [disabled]="locating() || loading() || error() !== null"
          [attr.aria-busy]="locating()"
        >
          {{ locating() ? ('map.locating' | t) : ('map.aroundYou' | t) }}
        </button>
        <!-- legal-recovery: the explicit consent line \u2014
             the CTA is the only geolocation trigger and the browser prompt
             is the consent; the nearest ranking is client-side (no backend
             call), so the promise "never sent" is the actual behavior. -->
        <p class="map-page__geo-note">{{ 'map.geoNote' | t }}</p>
        <!-- Address-search anchor (location-navigation): the fallback
             for the geolocation CTA when location is denied, times out or
             is unavailable \u2014 the SAME gateway + usage-policy contract as
             the /submit address search (shelter-address-search), in the
             browse context. Public: no auth needed. A failed search changes
             nothing else (no anchor, no pin, list untouched). -->
        <div class="map-page__anchor-search">
          <label class="anchor-search__label" for="anchor-search-input">{{
            'map.anchorLabel' | t
          }}</label>
          <div class="anchor-search__row">
            <input
              id="anchor-search-input"
              class="anchor-search__input"
              type="text"
              [placeholder]="'map.anchorPlaceholder' | t"
              [value]="anchorQuery()"
              (input)="onAnchorQueryChange($event)"
              (keydown)="onAnchorSearchKey($event)"
              [disabled]="anchorSearching()"
            />
            <button
              type="button"
              class="btn anchor-search__button"
              (click)="startAnchorSearch()"
              [disabled]="anchorSearching() || anchorQuery().trim() === ''"
              [attr.aria-busy]="anchorSearching()"
            >
              {{ anchorSearching() ? ('map.searching' | t) : ('map.search' | t) }}
            </button>
          </div>
          <!-- Nominatim usage policy: the attribution is REQUIRED and always
               rendered next to the search box (the /submit convention),
               success or failure. -->
          <p class="anchor-search__attribution">
            {{ 'map.attributionLead' | t }}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">{{
              'map.osmAttribution' | t
            }}</a>
          </p>
          @if (anchorErrorText(); as msg) {
            @if (anchorError() === 'no-results') {
              <p class="anchor-search__error">{{ msg | t }}</p>
            } @else {
              <!-- The two real failures get the alert role (the /submit
                   convention): no-results is information, not an alarm. -->
              <p class="anchor-search__error" role="alert">{{ msg | t }}</p>
            }
          }
          @if (anchorResults().length) {
            <ul class="anchor-search__results" [attr.aria-label]="'map.addressResultsAria' | t">
              @for (result of anchorResults(); track $index) {
                <li>
                  <button
                    type="button"
                    class="anchor-search__result"
                    (click)="selectAnchorResult(result)"
                  >
                    <span class="anchor-search__result-name">{{ result.displayName }}</span>
                    @if (result.type) {
                      <span class="anchor-search__result-type">{{ result.type }}</span>
                    }
                  </button>
                </li>
              }
            </ul>
          }
        </div>
        @if (auth.initialized() && auth.authenticated()) {
          <a routerLink="/submit" class="btn btn--ghost btn--block">{{ 'map.addShelter' | t }}</a>
        }
      </div>

      @if (nearest(); as n) {
        <p class="nearest-line" role="status">
          {{ 'map.aroundYou' | t }}: {{ n.name }}
          @if (n.address) {
            <span class="nearest-line__address"> \xB7 {{ n.address }}</span>
          }
          <!-- Distance honesty (community-review-queue D6): the straight-line
               distance the ranking actually computed \u2014 never a route claim. -->
          @if (nearestKm() !== null) {
            <span class="nearest-line__distance"> \xB7 {{ straightLineText(nearestKm()!) }}</span>
          }
        </p>
        @if (n.source === 'USER') {
          <!-- The unverified warning line: when the highlighted row is a
               community row (any review status \u2014 map-browse delta). -->
          <p class="nearest-line nearest-line--warning">{{ 'shelter.unverifiedWarning' | t }}</p>
        }
        @if (n.inaccurate) {
          <!-- Marked inaccurate: the single-sourced warning \u2014
               the flag is the treatment, the row stays visible. -->
          <p class="nearest-line nearest-line--warning">{{ 'account.contrib.inaccurate' | t }}</p>
        }
      } @else if (nearestEmpty()) {
        <p class="nearest-line">
          {{ 'map.nearestEmpty' | t }}
          @if (auth.initialized() && auth.authenticated()) {
            <a routerLink="/submit">{{ 'map.nearestEmpty.addFirst' | t }}</a>
          }
        </p>
      } @else if (nearestError(); as nearestMsg) {
        <p class="nearest-line nearest-line--error" role="alert">{{ nearestMsg | t }}</p>
      }

      @if (anchor(); as a) {
        <!-- The active browse anchor (location-navigation): the
             searched point the per-row distances are measured from, with
             its single Clear action. -->
        <p class="anchor-line" role="status">
          {{ 'map.searched' | t }} <span class="anchor-line__label">{{ a.label }}</span>
          <button type="button" class="anchor-line__clear" (click)="clearAnchor()">
            {{ 'map.clear' | t }}
          </button>
        </p>
      }

      <div class="filter-chips" role="group" [attr.aria-label]="'map.filterSourcesAria' | t">
        @for (chip of sourceFilters; track chip.value) {
          <button
            type="button"
            class="chip"
            [class.chip--active]="filter() === chip.value"
            (click)="setFilter(chip.value)"
          >
            {{ chip.labelKey | t }}
          </button>
        }
      </div>

      <!-- Practical filter chips: "Open" (client-side \u2014 the BE has no
           open/closed param, it filters the loaded list and re-renders the
           markers) and "Has capacity" (server-side \`?hasCapacity=\`). Both
           are composable with the source chips above. -->
      <div class="filter-trust" role="group" [attr.aria-label]="'map.trustFiltersAria' | t">
        <button
          type="button"
          class="chip trust-chip"
          [class.chip--active]="openOnly()"
          [attr.aria-pressed]="openOnly()"
          (click)="toggleOpen()"
        >
          {{ 'map.chipOpen' | t }}
        </button>
        <button
          type="button"
          class="chip trust-chip"
          [class.chip--active]="hasCapacity()"
          [attr.aria-pressed]="hasCapacity()"
          (click)="toggleHasCapacity()"
        >
          {{ 'map.chipHasCapacity' | t }}
        </button>
      </div>

      @if (error(); as err) {
        <app-banner severity="error" [message]="err" />
      }

      @if (loading()) {
        <app-loading-indicator class="sidebar-state" [message]="'map.loading' | t" />
      } @else if (showEmpty()) {
        <!-- The filtered list is empty: the shared empty-state notice (the
             host class keeps the sidebar's muted, centred slot styling). -->
        <app-list-state class="sidebar-state" [kind]="'empty'" [messageKey]="'map.emptyFilter'" />
      } @else if (sorted().length) {
        <ul #listEl class="shelter-list" [attr.aria-label]="'map.shelterListAria' | t">
          @for (shelter of sorted(); track shelter.id) {
            <!-- The li is the per-shelter row element: the scroll-snap
                 target (map-page.scss) and the row scrollRowIntoView looks
                 up by data-shelter-id (marker click / nearest). -->
            <li [attr.data-shelter-id]="shelter.id">
              <!-- Row = button (a real action: select + zoom, keyboard
                   operable). It does NOT navigate \u2014 the click flies the
                   map to street level and the user stays on /map (design
                   decision 5). The accessible name is the row's own
                   text (name + address + meta). -->
              <button
                type="button"
                class="shelter-row"
                [class.shelter-row--selected]="selectedId() === shelter.id"
                (click)="selectShelter(shelter)"
              >
                <span class="shelter-row__name">{{ shelter.name }}</span>
                @if (shelter.address) {
                  <span class="shelter-row__address">{{ shelter.address }}</span>
                }
                <span class="shelter-row__meta">
                  <!-- Source/trust badge (community-review-queue): registry
                       rows say which registry; USER rows say their trust
                       state (NEW = "Newly added", CONFIRMED =
                       "Community-checked" \u2014 one unified yellow tone). -->
                  <span class="badge" [ngClass]="communityBadgeClass(shelter)">
                    {{ sourceTrustLabel(shelter) }}
                  </span>
                  @if (isPrivateLocation(shelter)) {
                    <span class="badge badge--private">{{ 'shelter.privateBadge' | t }}</span>
                  }
                  <!-- Address-anchor distance (location-navigation):
                       the straight-line distance from the searched point \u2014
                       the same honesty format as the nearest line, never a
                       route claim. Only while an anchor is active (the
                       anchor() check, not the distance's truthiness \u2014 a
                       0 km result would be falsy and must still render). -->
                  @if (anchor() !== null) {
                    <span class="shelter-row__anchor-distance num-tabular">{{
                      straightLineText(anchorDistance(shelter)!)
                    }}</span>
                  }
                </span>
                <!-- Trust badges (shelter-trust-and-reports D6): red-orange
                     "Reported" (nonexistentReports > 0), the
                     fresh-CLOSED reported-tone badge ("Reported closed" at one
                     fresh report, "Closed" at two+; a fresh OPEN row
                     renders NO badge \u2014 open is the default), and the
                     NEUTRAL occupancy badge with recency (hedged at one
                     fresh report, firm at two+). -->
                @if (hasTrustBadges(shelter)) {
                  <span class="shelter-row__badges">
                    @if (hasReports(shelter)) {
                      <!-- The count \u2014 the nonexistentReports subset
                           that drives the badge (single-sourced). -->
                      <span class="badge badge--reported">{{
                        reportedBadgeText(shelter.nonexistentReports)
                      }}</span>
                    }
                    @if (openStatusBadgeText(shelter.openStatus); as openText) {
                      <span class="badge badge--closed">{{ openText }}</span>
                    }
                    @if (shelter.occupancy; as occ) {
                      <span class="badge badge--occupancy">{{ occupancyText(occ) }}</span>
                    }
                  </span>
                }
              </button>
              <!-- The explicit details step: appears ONLY on the selected
                   row and is the only sidebar element that opens
                   /shelters/:id. The aria-label names the shelter so the
                   navigation target is unambiguous to screen readers. -->
              @if (selectedId() === shelter.id) {
                <a
                  class="shelter-row__details btn btn--ghost"
                  [routerLink]="['/shelters', shelter.id]"
                  [attr.aria-label]="('map.viewDetailsFor' | t) + shelter.name"
                >
                  {{ 'map.viewDetails' | t }} \u2192
                </a>
              }
            </li>
          }
        </ul>
      }

      <!-- Safety notice lives in the page shell footer (page-shell.html):
           it is app-wide, not map-only, and the shelter list below owns
           the sidebar space. -->
    </aside>
  </div>

  <!-- "How OpenShelter works" (Workstream A): plain-language mechanics
       block under the map layout. Editorial layout, not a card: the page
       background continues, a single top hairline divides the block from
       the map, and the copy sits in a width-capped column for a
       comfortable line length (map-page.scss). Rhythm: the first
       paragraph is the lede (larger type \u2014 it carries the "not an
       emergency service, call 112" positioning) and the last is the
       standing guarantee (quiet medium weight). The prose block is
       deliberate: a five-step example list would restate what the
       sources/report paragraphs already say (the how.example* keys stay
       in the catalogs, unused). It is the only i18n'd copy on this page
       today (the rest of the map chrome is still hardcoded English);
       the badge terms are quoted verbatim so the text matches what the
       map shows. -->
  <section class="map-page__how" aria-labelledby="how-title">
    <h2 class="map-page__how-title" id="how-title">{{ 'how.title' | t }}</h2>
    <p class="map-page__how-lede">{{ 'how.what' | t }}</p>
    <p>{{ 'how.sources' | t }}</p>
    <p>{{ 'how.report' | t }}</p>
    <p>{{ 'how.nearest' | t }}</p>
    <p class="map-page__how-guarantee">{{ 'how.guarantee' | t }}</p>
  </section>
</section>
`, styles: ['@charset "UTF-8";\n\n/* src/app/features/map/map-page.scss */\n:host {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n}\n.map-page {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n}\n.map-page__header {\n  flex-shrink: 0;\n}\n.map-page__layout {\n  display: flex;\n  gap: var(--space-20);\n  align-items: stretch;\n  flex: 1;\n  min-height: 725px;\n}\n.map-page__map {\n  position: relative;\n  flex: 1;\n  min-width: 0;\n}\n.map-page__map .map-page__leaflet {\n  height: 100%;\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n  background: var(--color-map-placeholder);\n}\n.map-legend {\n  position: absolute;\n  left: var(--space-12);\n  bottom: var(--space-32);\n  z-index: 1000;\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-4);\n  padding: var(--space-8) var(--space-10);\n  background: var(--color-surface-overlay);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-md);\n  font-size: var(--text-xs);\n  color: var(--color-text);\n}\n.map-legend .legend-item {\n  display: flex;\n  align-items: center;\n  gap: var(--space-6);\n}\n.map-legend .legend-swatch {\n  width: 12px;\n  height: 12px;\n  flex-shrink: 0;\n  position: relative;\n}\n.map-legend .legend-swatch.shelter-marker--partial {\n  width: 10px;\n  height: 10px;\n  margin-left: 1px;\n}\n.map-page__sidebar {\n  width: 344px;\n  flex-shrink: 0;\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-12);\n}\n.map-page__sidebar .shelter-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  overflow-y: auto;\n  flex: 1 1 0;\n  min-height: 0;\n}\n.map-page__actions {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-8);\n}\n.map-cta {\n  background: var(--color-cta);\n  color: var(--color-bg-surface);\n}\n.map-cta:hover:not(:disabled) {\n  filter: brightness(0.92);\n}\n.map-page__geo-note {\n  margin: 0;\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n.map-page__anchor-search {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-6);\n}\n.map-page__anchor-search .anchor-search__label {\n  font-size: var(--text-sm);\n  font-weight: var(--font-weight-semibold);\n  color: var(--color-text);\n}\n.map-page__anchor-search .anchor-search__row {\n  display: flex;\n  gap: var(--space-6);\n}\n.map-page__anchor-search .anchor-search__input {\n  flex: 1;\n  min-width: 0;\n  min-height: var(--space-48);\n  padding: var(--space-6) var(--space-10);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n  background: var(--color-bg-surface);\n  color: var(--color-text);\n  font-family: inherit;\n  font-size: var(--text-md);\n}\n.map-page__anchor-search .anchor-search__input:focus-visible {\n  outline: 2px solid var(--color-primary);\n  outline-offset: 1px;\n}\n.map-page__anchor-search .anchor-search__button {\n  flex-shrink: 0;\n}\n.map-page__anchor-search .anchor-search__attribution {\n  margin: 0;\n  font-size: var(--text-2xs);\n  color: var(--color-muted);\n}\n.map-page__anchor-search .anchor-search__attribution a {\n  color: var(--color-muted);\n  text-decoration: underline;\n}\n.map-page__anchor-search .anchor-search__error {\n  margin: 0;\n  font-size: var(--text-sm);\n  color: var(--color-danger);\n}\n.map-page__anchor-search .anchor-search__results {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-4);\n}\n.map-page__anchor-search .anchor-search__results .anchor-search__result {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-2);\n  width: 100%;\n  padding: var(--space-8) var(--space-10);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n  background: var(--color-bg-surface);\n  color: var(--color-text);\n  font-family: inherit;\n  font-size: var(--text-sm);\n  text-align: left;\n  cursor: pointer;\n}\n.map-page__anchor-search .anchor-search__results .anchor-search__result:hover {\n  border-color: var(--color-primary);\n}\n.map-page__anchor-search .anchor-search__results .anchor-search__result-name {\n  font-weight: var(--font-weight-semibold);\n}\n.map-page__anchor-search .anchor-search__results .anchor-search__result-type {\n  color: var(--color-muted);\n  font-size: var(--text-2xs);\n}\n.anchor-line {\n  margin: 0;\n  font-size: var(--text-sm);\n  color: var(--color-text);\n}\n.anchor-line .anchor-line__label {\n  color: var(--color-muted);\n}\n.anchor-line .anchor-line__clear {\n  padding: 0 var(--space-4);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-full);\n  background: var(--color-bg-surface);\n  color: var(--color-text);\n  font-family: inherit;\n  font-size: var(--text-2xs);\n  cursor: pointer;\n}\n.anchor-line .anchor-line__clear:hover:not(:disabled) {\n  border-color: var(--color-primary);\n}\n.nearest-line {\n  margin: 0;\n  font-size: var(--text-sm);\n  color: var(--color-text);\n}\n.nearest-line a {\n  color: var(--color-primary);\n}\n.nearest-line .nearest-line__address {\n  color: var(--color-muted);\n}\n.nearest-line {\n}\n.nearest-line .nearest-line__distance {\n  color: var(--color-muted);\n}\n.nearest-line--error {\n  color: var(--color-danger);\n}\n.nearest-line {\n}\n.nearest-line--warning {\n  color: var(--color-muted);\n  margin-top: var(--space-4);\n}\n.filter-chips {\n  display: flex;\n  gap: var(--space-6);\n  flex-wrap: wrap;\n}\n.filter-chips .chip {\n  flex: 1;\n}\n.filter-trust {\n  display: flex;\n  gap: var(--space-6);\n  flex-wrap: wrap;\n  align-items: center;\n}\n.filter-trust .trust-chip {\n  flex: 1 1 0;\n  min-width: 0;\n  min-height: var(--space-48);\n}\n.sidebar-state {\n  color: var(--color-muted);\n  text-align: center;\n  padding: var(--space-24) var(--space-8);\n  margin: 0;\n}\n.shelter-row {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-2);\n  width: 100%;\n  padding: var(--space-10) var(--space-12);\n  margin-bottom: var(--space-8);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n  background: var(--color-bg-surface);\n  color: inherit;\n  font-family: inherit;\n  font-size: inherit;\n  text-align: left;\n  cursor: pointer;\n}\n.shelter-row:hover {\n  border-color: var(--color-primary);\n}\n.shelter-row.shelter-row--selected {\n  border-color: var(--color-primary);\n}\n.shelter-row .shelter-row__name {\n  font-weight: var(--font-weight-semibold);\n}\n.shelter-row .shelter-row__address {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n.shelter-row .shelter-row__meta {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-top: var(--space-4);\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n.shelter-row {\n}\n.shelter-row .shelter-row__anchor-distance {\n  color: var(--color-muted);\n}\n.shelter-row__details {\n  display: block;\n  margin-top: calc(var(--space-8) * -1);\n  margin-bottom: var(--space-8);\n  padding-left: var(--space-12);\n  padding-right: var(--space-12);\n  text-align: left;\n  justify-content: flex-start;\n}\n.badge {\n  background: color-mix(in srgb, var(--color-shelter-registry) 8%, var(--color-bg-surface));\n  color: var(--color-shelter-registry);\n}\n.badge.badge--user {\n  background: color-mix(in srgb, var(--color-shelter-user) 8%, var(--color-bg-surface));\n  color: var(--color-shelter-user);\n}\n.shelter-row__badges {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-4);\n  margin-top: var(--space-4);\n}\n.map-page__how {\n  flex-shrink: 0;\n  max-width: 65ch;\n  margin-top: var(--space-32);\n  padding-top: var(--space-24);\n  padding-bottom: var(--space-48);\n  border-top: 1px solid var(--color-border-subtle);\n  font-size: var(--text-base);\n}\n.map-page__how p {\n  margin: 0 0 var(--space-12);\n  line-height: 1.6;\n}\n.map-page__how p:last-child {\n  margin-bottom: 0;\n}\n.map-page__how .map-page__how-title {\n  margin: 0 0 var(--space-20);\n  font-size: var(--text-xl);\n  font-weight: var(--font-weight-title);\n  line-height: 1.3;\n}\n.map-page__how {\n}\n.map-page__how .map-page__how-lede {\n  font-size: var(--text-lg);\n  margin-bottom: var(--space-16);\n}\n.map-page__how {\n}\n.map-page__how .map-page__how-guarantee {\n  margin-top: var(--space-16);\n  font-weight: var(--font-weight-medium);\n}\n@media (max-width: 900px) {\n  .map-page__layout {\n    flex-direction: column;\n    flex: none;\n    min-height: 0;\n  }\n  .map-page__map .map-page__leaflet {\n    height: 420px;\n  }\n  .map-page__sidebar {\n    width: auto;\n  }\n  .map-page__sidebar .shelter-list {\n    flex: none;\n    max-height: 420px;\n  }\n}\n/*# sourceMappingURL=map-page.css.map */\n'] }]
  }], null, { mapEl: [{ type: i0.ViewChild, args: ["mapEl", { isSignal: true }] }], listEl: [{ type: i0.ViewChild, args: ["listEl", { isSignal: true }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(MapPage, { className: "MapPage", filePath: "src/app/features/map/map-page.ts", lineNumber: 202 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Fmap%2Fmap-page.ts%40MapPage";
  function MapPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(MapPage, m.default, [i0], [LeafletService, NgClass, RouterLink, BannerComponent, ListState, LoadingIndicator, TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && MapPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && MapPage_HmrLoad(d.timestamp)));
})();

// src/app/app.routes.ts
var routes = [
  { path: "", pathMatch: "full", redirectTo: "map" },
  { path: "map", component: MapPage, data: { title: "title.map" }, canActivate: [titleGuard] },
  // Lazy (bundle budget): the auth flow is only needed once a visitor
  // leaves the map — never for first paint.
  {
    path: "login",
    loadComponent: () => import("/chunk-Y6ZKWZZW.js").then((m) => m.LoginPage),
    data: { title: "title.login" },
    canActivate: [titleGuard, guestGuard]
  },
  {
    path: "register",
    loadComponent: () => import("/chunk-6HMINPQ7.js").then((m) => m.RegisterPage),
    data: { title: "title.register" },
    canActivate: [titleGuard, guestGuard]
  },
  {
    path: "reset",
    loadComponent: () => import("/chunk-WDUFX5JK.js").then((m) => m.ResetPage),
    data: { title: "title.reset" },
    canActivate: [titleGuard, guestGuard]
  },
  // Lazy (bundle budget): verification only happens after a login.
  {
    path: "verify",
    loadComponent: () => import("/chunk-65LR5ARB.js").then((m) => m.VerifyPage),
    data: { title: "title.verify" },
    canActivate: [titleGuard, authGuard]
  },
  // Lazy (bundle budget): the account page only exists for signed-in users.
  {
    path: "account",
    loadComponent: () => import("/chunk-VVBVPLVD.js").then((m) => m.AccountPage),
    data: { title: "title.account" },
    canActivate: [titleGuard, authGuard]
  },
  // legal-recovery: static legal pages, no backend — lazy for
  // the same bundle-budget reason as the other rare routes.
  {
    path: "privacy",
    loadComponent: () => import("/chunk-LRSYTSHE.js").then((m) => m.PrivacyPolicyPage),
    data: { title: "title.privacy" },
    canActivate: [titleGuard]
  },
  {
    path: "terms",
    loadComponent: () => import("/chunk-R5BOUTCH.js").then((m) => m.TermsPage),
    data: { title: "title.terms" },
    canActivate: [titleGuard]
  },
  // Public: anonymous visitors see the detail without the trust-layer
  // controls (report / occupancy / open-closed); the page itself branches
  // on auth/verification (design decision 2).
  {
    path: "shelters/:id",
    // Lazy (bundle budget): the detail page is only needed after a
    // marker/row click, not for first paint of the map.
    loadComponent: () => import("/chunk-KN2NYBDB.js").then((m) => m.ShelterDetailPage),
    data: { title: "title.shelterDetail" },
    canActivate: [titleGuard]
  },
  // Public: the crisis-guidance index (crisis-guidance D4/D6) — permit-all,
  // the top-nav item lands here.
  {
    path: "blog",
    // Lazy (bundle budget): the index is not needed for first paint of the map.
    loadComponent: () => import("/chunk-MYB5WGJP.js").then((m) => m.GuidanceListPage),
    data: { title: "title.guidance" },
    canActivate: [titleGuard]
  },
  // Public: one published guidance post by slug — a draft slug and an
  // unknown slug answer the SAME 404 (D4, the page renders not-found).
  {
    path: "blog/:slug",
    // Lazy (bundle budget): a post is only needed after an index click.
    loadComponent: () => import("/chunk-VCM6ZS4I.js").then((m) => m.GuidanceDetailPage),
    data: { title: "title.guidanceDetail" },
    canActivate: [titleGuard]
  },
  // Verified accounts only — mirrors the backend 403 (design decision 5).
  // /submit?edit=<id> (M5): this same component in edit mode — see the
  // route-map comment above; the ?edit param is read by the page itself
  // (ActivatedRoute), no route change.
  {
    path: "submit",
    // Lazy (bundle budget): form + mini-map code defers until a verified
    // user actually opens the route.
    loadComponent: () => import("/chunk-6CJZMRI5.js").then((m) => m.SubmitShelterPage),
    data: { title: "title.submit" },
    canActivate: [titleGuard, authGuard, verifiedGuard]
  },
  // Admin-kind only (admin-moderation D2): adminGuard sends BOTH anonymous
  // and authenticated non-admins home; the backend re-checks kind per
  // request, so this is UX, not enforcement.
  {
    path: "admin",
    // Lazy (bundle budget): the moderation tool is a rare route — no other
    // page needs its code.
    loadComponent: () => import("/chunk-7GLWY5AV.js").then((m) => m.AdminPage),
    data: { title: "title.admin" },
    canActivate: [titleGuard, adminGuard]
  },
  { path: "**", redirectTo: "map" }
];

// src/app/core/api-interceptor.ts
import { HttpErrorResponse } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common_http.js?v=b78d4f20";
import { inject as inject3 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { Router } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import { from } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import { catchError, mergeMap, throwError } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
var NO_BEARER_ENDPOINT = /\/auth\/(login|refresh)$/;
var NO_REFRESH_DANCE_ENDPOINT = /\/auth\/(login|refresh)$|\/account\/profile$/;
function isAuthFormEndpoint(url) {
  return NO_BEARER_ENDPOINT.test(url);
}
function isBusiness401Endpoint(url) {
  return NO_REFRESH_DANCE_ENDPOINT.test(url);
}
var apiInterceptor = (req, next) => {
  const tokens = inject3(TokenStore);
  const authStore = inject3(AuthStore);
  const router = inject3(Router);
  const authFormRequest = isAuthFormEndpoint(req.url);
  const access = tokens.access();
  const outgoing = access !== null && !authFormRequest ? req.clone({ setHeaders: { Authorization: `Bearer ${access}` } }) : req;
  return next(outgoing).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      if (error.status !== 401 || authFormRequest || isBusiness401Endpoint(req.url)) {
        return throwError(() => error);
      }
      return from(authStore.refresh()).pipe(
        mergeMap((refreshed) => {
          if (!refreshed) {
            void router.navigate(["/login"], { queryParams: { session: "expired" } });
            return throwError(() => error);
          }
          const fresh = tokens.access();
          const retried = fresh === null ? outgoing : outgoing.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } });
          return next(retried).pipe(
            catchError((retryError) => {
              if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
                void router.navigate(["/login"], { queryParams: { session: "expired" } });
              }
              return throwError(() => retryError);
            })
          );
        })
      );
    })
  );
};

// src/app/app.config.ts
var appConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor]))
  ]
};

// src/app/app.ts
import { ChangeDetectionStrategy as ChangeDetectionStrategy5, Component as Component5, inject as inject8 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";

// src/app/shared/consent-banner.component.ts
import { afterNextRender as afterNextRender2, ChangeDetectionStrategy as ChangeDetectionStrategy2, Component as Component2, inject as inject4, viewChild as viewChild2 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { RouterLink as RouterLink2 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";

// src/app/core/consent-store.ts
import { Injectable, signal as signal2 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i02 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var CONSENT_KEY = "openshelter-consent";
var CONSENT_VERSION = 1;
var ConsentStore = class _ConsentStore {
  /** True once a valid decision for the current version is stored. */
  decided = signal2(
    storedConsent() !== null,
    ...ngDevMode ? [{ debugName: "decided" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * Acknowledge the necessary-only notice. The acknowledgment is an
   * explicit user action (there is no dismiss/close that silently counts),
   * and it is stored so the banner does not re-appear on later visits.
   */
  acknowledge() {
    const record = {
      version: CONSENT_VERSION,
      decision: "necessary",
      acknowledgedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    } catch {
    }
    this.decided.set(true);
  }
  static \u0275fac = function ConsentStore_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ConsentStore)();
  };
  static \u0275prov = /* @__PURE__ */ i02.\u0275\u0275defineInjectable({ token: _ConsentStore, factory: _ConsentStore.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassMetadata(ConsentStore, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();
function storedConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed?.version === CONSENT_VERSION && parsed?.decision === "necessary") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// src/app/shared/consent-banner.component.ts
import * as i03 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var _c02 = ["dialog"];
function ConsentBanner_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = i03.\u0275\u0275getCurrentView();
    i03.\u0275\u0275elementStart(0, "div", 1)(1, "section", 2, 0);
    i03.\u0275\u0275listener("keydown", function ConsentBanner_Conditional_0_Template_section_keydown_1_listener($event) {
      i03.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i03.\u0275\u0275nextContext();
      return i03.\u0275\u0275resetView(ctx_r1.onKeydown($event));
    });
    i03.\u0275\u0275elementStart(3, "h2", 3);
    i03.\u0275\u0275text(4);
    i03.\u0275\u0275pipe(5, "t");
    i03.\u0275\u0275elementEnd();
    i03.\u0275\u0275elementStart(6, "p", 4);
    i03.\u0275\u0275text(7);
    i03.\u0275\u0275pipe(8, "t");
    i03.\u0275\u0275elementEnd();
    i03.\u0275\u0275elementStart(9, "div", 5)(10, "button", 6);
    i03.\u0275\u0275listener("click", function ConsentBanner_Conditional_0_Template_button_click_10_listener() {
      i03.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i03.\u0275\u0275nextContext();
      return i03.\u0275\u0275resetView(ctx_r1.consent.acknowledge());
    });
    i03.\u0275\u0275text(11);
    i03.\u0275\u0275pipe(12, "t");
    i03.\u0275\u0275elementEnd();
    i03.\u0275\u0275elementStart(13, "a", 7);
    i03.\u0275\u0275text(14);
    i03.\u0275\u0275pipe(15, "t");
    i03.\u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    i03.\u0275\u0275advance(4);
    i03.\u0275\u0275textInterpolate(i03.\u0275\u0275pipeBind1(5, 4, "consent.title"));
    i03.\u0275\u0275advance(3);
    i03.\u0275\u0275textInterpolate(i03.\u0275\u0275pipeBind1(8, 6, "consent.body"));
    i03.\u0275\u0275advance(4);
    i03.\u0275\u0275textInterpolate1(" ", i03.\u0275\u0275pipeBind1(12, 8, "consent.acknowledge"), " ");
    i03.\u0275\u0275advance(3);
    i03.\u0275\u0275textInterpolate(i03.\u0275\u0275pipeBind1(15, 10, "consent.privacyLink"));
  }
}
var ConsentBanner = class _ConsentBanner {
  consent = inject4(ConsentStore);
  dialog = viewChild2(
    "dialog",
    ...ngDevMode ? [{ debugName: "dialog" }] : (
      /* istanbul ignore next */
      []
    )
  );
  constructor() {
    afterNextRender2(() => {
      this.dialog()?.nativeElement.focus();
    });
  }
  /** Keep Tab / Shift+Tab cycling inside the dialog (focus trap). */
  onKeydown(event) {
    if (event.key !== "Tab") {
      return;
    }
    const host = this.dialog()?.nativeElement;
    if (!host) {
      return;
    }
    const focusables = [
      ...host.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')
    ];
    if (focusables.length === 0) {
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !host.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !host.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }
  static \u0275fac = function ConsentBanner_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ConsentBanner)();
  };
  static \u0275cmp = /* @__PURE__ */ i03.\u0275\u0275defineComponent({ type: _ConsentBanner, selectors: [["app-consent-banner"]], viewQuery: function ConsentBanner_Query(rf, ctx) {
    if (rf & 1) {
      i03.\u0275\u0275viewQuerySignal(ctx.dialog, _c02, 5);
    }
    if (rf & 2) {
      i03.\u0275\u0275queryAdvance();
    }
  }, decls: 1, vars: 1, consts: [["dialog", ""], [1, "consent-overlay"], ["role", "dialog", "aria-modal", "true", "aria-labelledby", "consent-title", "aria-describedby", "consent-body", "tabindex", "-1", 1, "consent-dialog", 3, "keydown"], ["id", "consent-title", 1, "consent-dialog__title"], ["id", "consent-body", 1, "consent-dialog__body"], [1, "consent-dialog__actions"], ["type", "button", 1, "btn", "btn--primary", 3, "click"], ["routerLink", "/privacy", 1, "consent-dialog__privacy"]], template: function ConsentBanner_Template(rf, ctx) {
    if (rf & 1) {
      i03.\u0275\u0275conditionalCreate(0, ConsentBanner_Conditional_0_Template, 16, 12, "div", 1);
    }
    if (rf & 2) {
      i03.\u0275\u0275conditional(!ctx.consent.decided() ? 0 : -1);
    }
  }, dependencies: [RouterLink2, TranslatePipe], styles: ['@charset "UTF-8";\n\n\n.consent-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  width: 100%;\n  height: 100%;\n  z-index: 2000;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: var(--%NS%space-16);\n  background: var(--%NS%color-backdrop);\n}\n.consent-dialog[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 30rem;\n  max-height: 100%;\n  overflow-y: auto;\n  padding: var(--%NS%space-24);\n  border-radius: var(--%NS%radius-lg);\n  background: var(--%NS%color-bg-surface);\n  color: var(--%NS%color-text);\n}\n.consent-dialog[_ngcontent-%COMP%]:focus, \n.consent-dialog[_ngcontent-%COMP%]:focus-visible {\n  outline: none;\n}\n.consent-dialog__title[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-8);\n  font-size: var(--%NS%text-xl);\n  font-weight: var(--%NS%font-weight-semibold);\n}\n.consent-dialog__body[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-16);\n  color: var(--%NS%color-muted);\n  line-height: 1.5;\n}\n.consent-dialog__actions[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: var(--%NS%space-12);\n}\n.consent-dialog__privacy[_ngcontent-%COMP%] {\n  color: var(--%NS%color-primary);\n  font-size: var(--%NS%text-md);\n}\n/*# sourceMappingURL=consent-banner.component.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i03.\u0275setClassMetadata(ConsentBanner, [{
    type: Component2,
    args: [{ selector: "app-consent-banner", imports: [RouterLink2, TranslatePipe], changeDetection: ChangeDetectionStrategy2.OnPush, template: `@if (!consent.decided()) {
  <div class="consent-overlay">
    <section
      class="consent-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
      tabindex="-1"
      #dialog
      (keydown)="onKeydown($event)"
    >
      <h2 class="consent-dialog__title" id="consent-title">{{ 'consent.title' | t }}</h2>
      <p class="consent-dialog__body" id="consent-body">{{ 'consent.body' | t }}</p>
      <div class="consent-dialog__actions">
        <button type="button" class="btn btn--primary" (click)="consent.acknowledge()">
          {{ 'consent.acknowledge' | t }}
        </button>
        <a routerLink="/privacy" class="consent-dialog__privacy">{{ 'consent.privacyLink' | t }}</a>
      </div>
    </section>
  </div>
}
`, styles: ['@charset "UTF-8";\n\n/* src/app/shared/consent-banner.component.scss */\n.consent-overlay {\n  position: fixed;\n  inset: 0;\n  width: 100%;\n  height: 100%;\n  z-index: 2000;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: var(--space-16);\n  background: var(--color-backdrop);\n}\n.consent-dialog {\n  width: 100%;\n  max-width: 30rem;\n  max-height: 100%;\n  overflow-y: auto;\n  padding: var(--space-24);\n  border-radius: var(--radius-lg);\n  background: var(--color-bg-surface);\n  color: var(--color-text);\n}\n.consent-dialog:focus,\n.consent-dialog:focus-visible {\n  outline: none;\n}\n.consent-dialog__title {\n  margin: 0 0 var(--space-8);\n  font-size: var(--text-xl);\n  font-weight: var(--font-weight-semibold);\n}\n.consent-dialog__body {\n  margin: 0 0 var(--space-16);\n  color: var(--color-muted);\n  line-height: 1.5;\n}\n.consent-dialog__actions {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: var(--space-12);\n}\n.consent-dialog__privacy {\n  color: var(--color-primary);\n  font-size: var(--text-md);\n}\n/*# sourceMappingURL=consent-banner.component.css.map */\n'] }]
  }], () => [], { dialog: [{ type: i03.ViewChild, args: ["dialog", { isSignal: true }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i03.\u0275setClassDebugInfo(ConsentBanner, { className: "ConsentBanner", filePath: "src/app/shared/consent-banner.component.ts", lineNumber: 33 });
})();
(() => {
  const id = "src%2Fapp%2Fshared%2Fconsent-banner.component.ts%40ConsentBanner";
  function ConsentBanner_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i03.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i03.\u0275\u0275replaceMetadata(ConsentBanner, m.default, [i03], [RouterLink2, TranslatePipe, Component2, ChangeDetectionStrategy2], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && ConsentBanner_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && ConsentBanner_HmrLoad(d.timestamp)));
})();

// src/app/shared/page-shell.ts
import { DatePipe, UpperCasePipe } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common.js?v=b78d4f20";
import { ChangeDetectionStrategy as ChangeDetectionStrategy4, Component as Component4, ElementRef as ElementRef3, inject as inject7, signal as signal5, viewChild as viewChild4 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { NavigationEnd, Router as Router2, RouterOutlet, RouterLink as RouterLink3 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";

// src/app/core/theme-store.ts
import { computed as computed2, Injectable as Injectable2, signal as signal3 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";

// src/app/core/theme-tokens.ts
var HIGH_CONTRAST_THEME = "high-contrast";
var BLACK_AND_YELLOW_THEME = "black-and-yellow";
var BLACK_AND_YELLOW_TOKENS = {
  /* Text & surfaces */
  "--color-text": "#ffd400",
  "--color-muted": "#d4b53a",
  "--color-bg": "#000000",
  "--color-bg-surface": "#000000",
  "--color-bg-subtle": "#000000",
  "--color-surface-hover": "#2b2400",
  "--color-surface-overlay": "rgba(0, 0, 0, 0.92)",
  "--color-backdrop": "rgba(0, 0, 0, 0.8)",
  /* Brand */
  "--color-primary": "#ff9f1c",
  "--color-primary-hover": "#ffb347",
  "--color-brand": "#ffd400",
  "--color-accent": "#4dd0c4",
  /* The link colour (the third theme adds a LINK token of its own:
     links must stay distinguishable from the body text, WCAG 1.4.1).
     Consumed by the global rule in the accessibility dialog's scss. */
  "--color-link": "#ffe066",
  /* Chrome band (header + footer + <900 menu panel) — the owner's word:
     BLACK background, YELLOW text. Every band surface rides on these
     tokens, so the whole band follows the theme:
     bg     #000000  (the black background)
     text   #ffd400  on #000  14.67:1 (wordmark, nav links, footer links)
     muted  #d4b53a  on #000  10.47:1 (footer notice + provenance text)
     focus  #ffd400  on #000  14.67:1 (>= 3:1 — the focus ring on the band)
     active #ffd400  on #000  14.67:1 (>= 3:1 — the active-nav indicator)
     border #8a7400  on #000  4.58:1  (>= 3:1 — the band divider + the
                                   ghost buttons' edge, enforced at 3:1)
     The header ghost buttons' resting fill is --color-bg (#000) and the
     hover fill --color-surface-hover (#2b2400): 1.00:1 / 1.36:1 against
     the band — documented exemptions in design-tokens.spec.ts (the
     4.58:1 border edge + the 14.67:1 yellow label carry the
     identification, the same fill+label rationale as the HC band's).
     The nav links' underline (the non-colour link cue) ships in the
     accessibility dialog's page-wide rules. */
  "--color-chrome-bg": "#000000",
  "--color-chrome-text": "#ffd400",
  "--color-chrome-muted": "#d4b53a",
  "--color-chrome-focus": "#ffd400",
  "--color-chrome-active": "#ffd400",
  "--color-chrome-border": "#8a7400",
  /* CTA + reported + new (the CTA/reported fills carry BLACK text —
     --color-bg-surface; new is unified with the verified yellow) */
  "--color-cta": "#ff9f1c",
  "--color-reported": "#ff6b4d",
  "--color-new": "#ffd400",
  /* ONE value with --color-verified — the unified yellow family */
  /* Submitter-verified marker fill (submitter-verification-badge) — the same
     name as :root, so the theme layers stay in lockstep (design-tokens.spec
     asserts both directions). */
  "--color-verified": "#ffd400",
  /* Borders (the card edge is the structure of this theme) */
  "--color-border": "#8a7400",
  "--color-border-subtle": "#6b5900",
  /* Status palette */
  "--color-danger": "#ff6b4d",
  "--color-danger-bg": "#2a120d",
  "--color-danger-border": "#7a3a2d",
  "--color-error": "#ff6b4d",
  "--color-warning": "#ffb84d",
  "--color-warning-bg": "#292008",
  "--color-warning-border": "#6e5a1e",
  "--color-info": "#8ac6f5",
  "--color-info-bg": "#10222f",
  "--color-info-border": "#2f5a7a",
  "--color-success": "#7fd49a",
  "--color-success-bg": "#0f2a18",
  "--color-success-border": "#2f6e45",
  "--color-success-bg-soft": "#122417",
  /* Source badges (dark fills, the verified text pairs) */
  "--color-badge-registry": "#14263a",
  "--color-badge-user": "#11301d",
  "--color-badge-new": "#332b12",
  /* Map + markers (the map is not themed — tiles stay light) */
  "--color-shelter-registry": "#7ab8ff",
  "--color-shelter-user": "#7ac98a",
  "--color-shelter-pick": "#4dd0c4",
  "--color-map-placeholder": "#e9eef2"
};
var BLACK_AND_YELLOW_TOKEN_NAMES = Object.keys(BLACK_AND_YELLOW_TOKENS);
function applyBlackAndYellowTokens(root) {
  for (const name of BLACK_AND_YELLOW_TOKEN_NAMES) {
    root.style.setProperty(name, BLACK_AND_YELLOW_TOKENS[name]);
  }
}
function clearBlackAndYellowTokens(root) {
  for (const name of BLACK_AND_YELLOW_TOKEN_NAMES) {
    root.style.removeProperty(name);
  }
}

// src/app/core/theme-store.ts
import * as i04 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var THEME_KEY = "openshelter-theme";
var ThemeStore = class _ThemeStore {
  /** The active theme: 'default' (light, no attribute), 'high-contrast'
      or 'black-and-yellow' (the attribute + the runtime tokens). */
  theme = signal3(
    storedTheme(),
    ...ngDevMode ? [{ debugName: "theme" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** True while the high-contrast theme is active — the pre-dialog
      API (kept for the existing consumers and specs). */
  highContrast = computed2(
    () => this.theme() === HIGH_CONTRAST_THEME,
    ...ngDevMode ? [{ debugName: "highContrast" }] : (
      /* istanbul ignore next */
      []
    )
  );
  constructor() {
    applyTheme(this.theme());
  }
  /** Flip the theme (the legacy toggle: light ↔ high-contrast). */
  toggle() {
    this.set(this.theme() === HIGH_CONTRAST_THEME ? "default" : HIGH_CONTRAST_THEME);
  }
  /** Apply + persist a theme. Default removes the key (no stored
      pref) and the attribute + tokens; the other two store their value. */
  set(theme) {
    this.theme.set(theme);
    applyTheme(theme);
    try {
      if (theme === "default") {
        localStorage.removeItem(THEME_KEY);
      } else {
        localStorage.setItem(THEME_KEY, theme);
      }
    } catch {
    }
  }
  static \u0275fac = function ThemeStore_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ThemeStore)();
  };
  static \u0275prov = /* @__PURE__ */ i04.\u0275\u0275defineInjectable({ token: _ThemeStore, factory: _ThemeStore.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i04.\u0275setClassMetadata(ThemeStore, [{
    type: Injectable2,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();
function storedTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === HIGH_CONTRAST_THEME || stored === BLACK_AND_YELLOW_THEME) {
      return stored;
    }
  } catch {
  }
  return "default";
}
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "default") {
    root.removeAttribute("data-theme");
    clearBlackAndYellowTokens(root);
    return;
  }
  root.setAttribute("data-theme", theme);
  if (theme === BLACK_AND_YELLOW_THEME) {
    applyBlackAndYellowTokens(root);
  } else {
    clearBlackAndYellowTokens(root);
  }
}

// src/app/gateways/data-source-gateway.ts
import { inject as inject5, Injectable as Injectable3 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { lastValueFrom } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i05 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var DataSourceGateway = class _DataSourceGateway {
  api = inject5(ApiClient);
  async fetch() {
    try {
      return await lastValueFrom(this.api.get("/api/data-source"));
    } catch {
      return null;
    }
  }
  static \u0275fac = function DataSourceGateway_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _DataSourceGateway)();
  };
  static \u0275prov = /* @__PURE__ */ i05.\u0275\u0275defineInjectable({ token: _DataSourceGateway, factory: _DataSourceGateway.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i05.\u0275setClassMetadata(DataSourceGateway, [{
    type: Injectable3,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/shared/accessibility-dialog.component.ts
import { afterNextRender as afterNextRender3, ChangeDetectionStrategy as ChangeDetectionStrategy3, Component as Component3, inject as inject6, Injector, runInInjectionContext, signal as signal4, ViewEncapsulation, viewChild as viewChild3 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i06 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var _c03 = ["dialog"];
var _forTrack02 = ($index, $item) => $item.value;
function AccessibilityDialog_Conditional_0_For_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = i06.\u0275\u0275getCurrentView();
    i06.\u0275\u0275domElementStart(0, "label", 12)(1, "input", 13);
    i06.\u0275\u0275domListener("change", function AccessibilityDialog_Conditional_0_For_14_Template_input_change_1_listener() {
      const option_r4 = i06.\u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = i06.\u0275\u0275nextContext(2);
      return i06.\u0275\u0275resetView(ctx_r1.select(option_r4.value));
    });
    i06.\u0275\u0275domElementEnd();
    i06.\u0275\u0275domElementStart(2, "span", 14)(3, "span", 15);
    i06.\u0275\u0275text(4);
    i06.\u0275\u0275pipe(5, "t");
    i06.\u0275\u0275domElementEnd();
    i06.\u0275\u0275domElementStart(6, "span", 16);
    i06.\u0275\u0275text(7);
    i06.\u0275\u0275pipe(8, "t");
    i06.\u0275\u0275domElementEnd()()();
  }
  if (rf & 2) {
    const option_r4 = ctx.$implicit;
    const ctx_r1 = i06.\u0275\u0275nextContext(2);
    i06.\u0275\u0275classProp("a11y-option--selected", ctx_r1.theme() === option_r4.value);
    i06.\u0275\u0275advance();
    i06.\u0275\u0275domProperty("value", option_r4.value)("checked", ctx_r1.theme() === option_r4.value);
    i06.\u0275\u0275advance(3);
    i06.\u0275\u0275textInterpolate(i06.\u0275\u0275pipeBind1(5, 6, option_r4.labelKey));
    i06.\u0275\u0275advance(3);
    i06.\u0275\u0275textInterpolate(i06.\u0275\u0275pipeBind1(8, 8, option_r4.descKey));
  }
}
function AccessibilityDialog_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = i06.\u0275\u0275getCurrentView();
    i06.\u0275\u0275domElementStart(0, "div", 2);
    i06.\u0275\u0275domListener("click", function AccessibilityDialog_Conditional_0_Template_div_click_0_listener($event) {
      i06.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i06.\u0275\u0275nextContext();
      return i06.\u0275\u0275resetView(ctx_r1.onOverlayClick($event));
    });
    i06.\u0275\u0275domElementStart(1, "section", 3, 0);
    i06.\u0275\u0275domListener("keydown", function AccessibilityDialog_Conditional_0_Template_section_keydown_1_listener($event) {
      i06.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i06.\u0275\u0275nextContext();
      return i06.\u0275\u0275resetView(ctx_r1.onKeydown($event));
    });
    i06.\u0275\u0275domElementStart(3, "h2", 4);
    i06.\u0275\u0275text(4);
    i06.\u0275\u0275pipe(5, "t");
    i06.\u0275\u0275domElementEnd();
    i06.\u0275\u0275domElementStart(6, "p", 5);
    i06.\u0275\u0275text(7);
    i06.\u0275\u0275pipe(8, "t");
    i06.\u0275\u0275domElementEnd();
    i06.\u0275\u0275domElementStart(9, "fieldset", 6)(10, "legend", 7);
    i06.\u0275\u0275text(11);
    i06.\u0275\u0275pipe(12, "t");
    i06.\u0275\u0275domElementEnd();
    i06.\u0275\u0275repeaterCreate(13, AccessibilityDialog_Conditional_0_For_14_Template, 9, 10, "label", 8, _forTrack02);
    i06.\u0275\u0275domElementEnd();
    i06.\u0275\u0275domElementStart(15, "footer", 9)(16, "p", 10);
    i06.\u0275\u0275text(17);
    i06.\u0275\u0275pipe(18, "t");
    i06.\u0275\u0275domElementEnd();
    i06.\u0275\u0275domElementStart(19, "button", 11);
    i06.\u0275\u0275domListener("click", function AccessibilityDialog_Conditional_0_Template_button_click_19_listener() {
      i06.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i06.\u0275\u0275nextContext();
      return i06.\u0275\u0275resetView(ctx_r1.close());
    });
    i06.\u0275\u0275text(20);
    i06.\u0275\u0275pipe(21, "t");
    i06.\u0275\u0275domElementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = i06.\u0275\u0275nextContext();
    i06.\u0275\u0275advance(4);
    i06.\u0275\u0275textInterpolate(i06.\u0275\u0275pipeBind1(5, 5, "a11y.popup.title"));
    i06.\u0275\u0275advance(3);
    i06.\u0275\u0275textInterpolate(i06.\u0275\u0275pipeBind1(8, 7, "a11y.popup.body"));
    i06.\u0275\u0275advance(4);
    i06.\u0275\u0275textInterpolate(i06.\u0275\u0275pipeBind1(12, 9, "a11y.popup.title"));
    i06.\u0275\u0275advance(2);
    i06.\u0275\u0275repeater(ctx_r1.options);
    i06.\u0275\u0275advance(4);
    i06.\u0275\u0275textInterpolate(i06.\u0275\u0275pipeBind1(18, 11, "a11y.popup.footer"));
    i06.\u0275\u0275advance(3);
    i06.\u0275\u0275textInterpolate1(" ", i06.\u0275\u0275pipeBind1(21, 13, "a11y.popup.close"), " ");
  }
}
var AccessibilityDialog = class _AccessibilityDialog {
  /** The overlay is mounted while open (the shell always renders the
      host; the overlay itself is the @if block). */
  open = signal4(
    false,
    ...ngDevMode ? [{ debugName: "open" }] : (
      /* istanbul ignore next */
      []
    )
  );
  themeStore = inject6(ThemeStore);
  /** The three options, in the government-panel order. */
  options = [
    { value: "default", labelKey: "a11y.option.default", descKey: "a11y.option.default.desc" },
    {
      value: "high-contrast",
      labelKey: "a11y.option.highContrast",
      descKey: "a11y.option.highContrast.desc"
    },
    {
      value: "black-and-yellow",
      labelKey: "a11y.option.blackYellow",
      descKey: "a11y.option.blackYellow.desc"
    }
  ];
  dialog = viewChild3(
    "dialog",
    ...ngDevMode ? [{ debugName: "dialog" }] : (
      /* istanbul ignore next */
      []
    )
  );
  injector = inject6(Injector);
  /** The active theme (the template reads the signal through this, so a
      switch re-renders the selected-row state). */
  theme() {
    return this.themeStore.theme();
  }
  /** Open from the header trigger: the dialog renders, then focus moves
      in (the container — announcing the dialog name + description).
      afterNextRender needs an injection context, and this method runs
      from an event handler — so it is wrapped in runInInjectionContext. */
  openDialog() {
    if (this.open()) {
      return;
    }
    this.open.set(true);
    runInInjectionContext(this.injector, () => {
      afterNextRender3(() => {
        this.dialog()?.nativeElement.focus();
      });
    });
  }
  /** Close (Escape, the Close button, or the backdrop): focus RETURNS to
      the trigger button, the way a native dialog does. */
  close() {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    const trigger = document.getElementById("a11y-trigger");
    trigger?.focus();
  }
  /** Pick a contrast option: applied AND persisted immediately (the
      dialog stays open so the reader can compare the themes). */
  select(theme) {
    this.themeStore.set(theme);
  }
  /** Backdrop click (the dimmed page is not a control of the dialog). */
  onOverlayClick(event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
  /** Escape closes (and focus returns); Tab / Shift+Tab stay trapped
      inside the dialog (the consent-banner's focus trap, extended). */
  onKeydown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const host = this.dialog()?.nativeElement;
    if (!host) {
      return;
    }
    const focusables = [
      ...host.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])')
    ].filter((el) => !el.hasAttribute("disabled"));
    if (focusables.length === 0) {
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !host.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !host.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }
  static \u0275fac = function AccessibilityDialog_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AccessibilityDialog)();
  };
  static \u0275cmp = /* @__PURE__ */ i06.\u0275\u0275defineComponent({ type: _AccessibilityDialog, selectors: [["app-accessibility-dialog"]], viewQuery: function AccessibilityDialog_Query(rf, ctx) {
    if (rf & 1) {
      i06.\u0275\u0275viewQuerySignal(ctx.dialog, _c03, 5);
    }
    if (rf & 2) {
      i06.\u0275\u0275queryAdvance();
    }
  }, decls: 1, vars: 1, consts: [["dialog", ""], [1, "a11y-overlay"], [1, "a11y-overlay", 3, "click"], ["role", "dialog", "aria-modal", "true", "aria-labelledby", "a11y-dialog-title", "aria-describedby", "a11y-dialog-body", "tabindex", "-1", 1, "a11y-dialog", 3, "keydown"], ["id", "a11y-dialog-title", 1, "a11y-dialog__title"], ["id", "a11y-dialog-body", 1, "a11y-dialog__body"], [1, "a11y-dialog__options"], [1, "a11y-dialog__legend"], [1, "a11y-option", 3, "a11y-option--selected"], [1, "a11y-dialog__footer"], [1, "a11y-dialog__footernote"], ["type", "button", 1, "btn", "btn--ghost", "a11y-dialog__close", 3, "click"], [1, "a11y-option"], ["type", "radio", "name", "a11y-theme", 3, "change", "value", "checked"], [1, "a11y-option__text"], [1, "a11y-option__label"], [1, "a11y-option__desc"]], template: function AccessibilityDialog_Template(rf, ctx) {
    if (rf & 1) {
      i06.\u0275\u0275conditionalCreate(0, AccessibilityDialog_Conditional_0_Template, 22, 15, "div", 1);
    }
    if (rf & 2) {
      i06.\u0275\u0275conditional(ctx.open() ? 0 : -1);
    }
  }, dependencies: [TranslatePipe], styles: ['@charset "UTF-8";\n\n/* src/app/shared/accessibility-dialog.component.scss */\n.a11y-overlay {\n  position: fixed;\n  inset: 0;\n  width: 100%;\n  height: 100%;\n  z-index: 2000;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: var(--%NS%space-16);\n  background: var(--%NS%color-backdrop);\n}\n.a11y-dialog {\n  width: 100%;\n  max-width: 32rem;\n  max-height: 100%;\n  overflow-y: auto;\n  padding: var(--%NS%space-24);\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-lg);\n  background: var(--%NS%color-bg-surface);\n  color: var(--%NS%color-text);\n}\n.a11y-dialog:focus-visible {\n  outline: 2px solid var(--%NS%color-primary);\n  outline-offset: 2px;\n}\n.a11y-dialog__title {\n  margin: 0 0 var(--%NS%space-8);\n  font-size: var(--%NS%text-xl);\n  font-weight: var(--%NS%font-weight-semibold);\n}\n.a11y-dialog__body {\n  margin: 0 0 var(--%NS%space-16);\n  color: var(--%NS%color-muted);\n  line-height: 1.5;\n}\n.a11y-dialog__options {\n  margin: 0 0 var(--%NS%space-16);\n  padding: 0;\n  border: 0;\n}\n.a11y-dialog {\n}\n.a11y-dialog__legend {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  margin: -1px;\n  padding: 0;\n  overflow: hidden;\n  white-space: nowrap;\n  border: 0;\n}\n.a11y-dialog__footer {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex-wrap: wrap;\n  gap: var(--%NS%space-12);\n  border-top: 1px solid var(--%NS%color-border-subtle);\n  padding-top: var(--%NS%space-16);\n}\n.a11y-dialog__footernote {\n  margin: 0;\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n.a11y-option {\n  display: flex;\n  align-items: flex-start;\n  gap: var(--%NS%space-12);\n  padding: var(--%NS%space-12) var(--%NS%space-16);\n  margin: 0 0 var(--%NS%space-10);\n  border: 2px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-md);\n  cursor: pointer;\n}\n.a11y-option input {\n  width: 18px;\n  height: 18px;\n  margin-top: var(--%NS%space-2);\n  flex-shrink: 0;\n  accent-color: var(--%NS%color-primary);\n}\n.a11y-option--selected {\n  border-color: var(--%NS%color-primary);\n}\n.a11y-option__text {\n  display: block;\n}\n.a11y-option__label {\n  display: block;\n  font-weight: var(--%NS%font-weight-semibold);\n}\n.a11y-option__desc {\n  display: block;\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n[data-theme=black-and-yellow] a {\n  color: var(--%NS%color-link);\n  text-decoration: underline;\n}\n[data-theme=black-and-yellow] a.btn,\n[data-theme=black-and-yellow] a.skip-link {\n  text-decoration: none;\n}\n[data-theme=black-and-yellow] .btn--primary {\n  background: var(--%NS%color-text);\n}\n[data-theme=black-and-yellow] .btn--%NS%primary:hover:not(:disabled) {\n  background: var(--%NS%color-primary-hover);\n}\n[data-theme=black-and-yellow] .shell-header .shell-nav a {\n  text-decoration-line: underline;\n  text-underline-offset: 4px;\n}\n[data-theme=black-and-yellow] .leaflet-bar a {\n  background-color: var(--%NS%color-bg-surface);\n  color: var(--%NS%color-text);\n}\n[data-theme=black-and-yellow] .leaflet-bar a:hover,\n[data-theme=black-and-yellow] .leaflet-bar a:focus {\n  background-color: var(--%NS%color-surface-hover);\n}\n[data-theme=black-and-yellow] .leaflet-bar a.leaflet-disabled {\n  background-color: var(--%NS%color-bg-surface);\n  color: var(--%NS%color-muted);\n}\n[data-theme=black-and-yellow] .leaflet-container .leaflet-control-attribution {\n  background: var(--%NS%color-bg-surface);\n  color: var(--%NS%color-text);\n}\n[data-theme=black-and-yellow] .leaflet-container .leaflet-control-attribution a {\n  color: var(--%NS%color-link);\n  text-decoration: underline;\n}\n[data-theme=black-and-yellow] .leaflet-bar a:focus-visible,\n[data-theme=high-contrast] .leaflet-bar a:focus-visible {\n  outline-color: var(--%NS%color-bg-surface);\n}\n[data-theme=high-contrast] .leaflet-container .leaflet-control-attribution a:focus-visible {\n  outline-color: var(--%NS%color-bg-surface);\n}\n[data-theme=black-and-yellow] .leaflet-container .leaflet-control-attribution a:focus-visible {\n  outline-color: var(--%NS%color-text);\n}\nhtml[data-theme=black-and-yellow] .badge.badge,\nhtml[data-theme=black-and-yellow] .contrib-badge.contrib-badge {\n  background: var(--%NS%color-bg-surface);\n  border: 1px solid var(--%NS%color-text);\n  color: var(--%NS%color-text);\n}\n/*# sourceMappingURL=accessibility-dialog.component.css.map */\n'], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i06.\u0275setClassMetadata(AccessibilityDialog, [{
    type: Component3,
    args: [{ selector: "app-accessibility-dialog", imports: [TranslatePipe], encapsulation: ViewEncapsulation.None, changeDetection: ChangeDetectionStrategy3.OnPush, template: `@if (open()) {
  <!-- The dimmed page behind: clicking it closes (the backdrop is NOT a
       control of the dialog itself \u2014 the dialog box ignores the click). -->
  <div class="a11y-overlay" (click)="onOverlayClick($event)">
    <section
      class="a11y-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-dialog-title"
      aria-describedby="a11y-dialog-body"
      tabindex="-1"
      #dialog
      (keydown)="onKeydown($event)"
    >
      <!-- The popup header (admin-editable: site_texts a11y.popup.title). -->
      <h2 class="a11y-dialog__title" id="a11y-dialog-title">{{ 'a11y.popup.title' | t }}</h2>
      <p class="a11y-dialog__body" id="a11y-dialog-body">{{ 'a11y.popup.body' | t }}</p>

      <!-- The three contrast options: a real radio group (arrow keys
           move between options, the state is announced). The selected
           row is distinguished by its BORDER, not a tint \u2014 the same rule
           the black-and-yellow theme applies to every card. -->
      <fieldset class="a11y-dialog__options">
        <legend class="a11y-dialog__legend">{{ 'a11y.popup.title' | t }}</legend>
        @for (option of options; track option.value) {
          <label
            class="a11y-option"
            [class.a11y-option--selected]="theme() === option.value"
          >
            <input
              type="radio"
              name="a11y-theme"
              [value]="option.value"
              [checked]="theme() === option.value"
              (change)="select(option.value)"
            />
            <span class="a11y-option__text">
              <span class="a11y-option__label">{{ option.labelKey | t }}</span>
              <span class="a11y-option__desc">{{ option.descKey | t }}</span>
            </span>
          </label>
        }
      </fieldset>

      <!-- The popup footer (admin-editable: a11y.popup.footer / .close). -->
      <footer class="a11y-dialog__footer">
        <p class="a11y-dialog__footernote">{{ 'a11y.popup.footer' | t }}</p>
        <button type="button" class="btn btn--ghost a11y-dialog__close" (click)="close()">
          {{ 'a11y.popup.close' | t }}
        </button>
      </footer>
    </section>
  </div>
}
`, styles: ['@charset "UTF-8";\n\n/* src/app/shared/accessibility-dialog.component.scss */\n.a11y-overlay {\n  position: fixed;\n  inset: 0;\n  width: 100%;\n  height: 100%;\n  z-index: 2000;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: var(--space-16);\n  background: var(--color-backdrop);\n}\n.a11y-dialog {\n  width: 100%;\n  max-width: 32rem;\n  max-height: 100%;\n  overflow-y: auto;\n  padding: var(--space-24);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n  background: var(--color-bg-surface);\n  color: var(--color-text);\n}\n.a11y-dialog:focus-visible {\n  outline: 2px solid var(--color-primary);\n  outline-offset: 2px;\n}\n.a11y-dialog__title {\n  margin: 0 0 var(--space-8);\n  font-size: var(--text-xl);\n  font-weight: var(--font-weight-semibold);\n}\n.a11y-dialog__body {\n  margin: 0 0 var(--space-16);\n  color: var(--color-muted);\n  line-height: 1.5;\n}\n.a11y-dialog__options {\n  margin: 0 0 var(--space-16);\n  padding: 0;\n  border: 0;\n}\n.a11y-dialog {\n}\n.a11y-dialog__legend {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  margin: -1px;\n  padding: 0;\n  overflow: hidden;\n  white-space: nowrap;\n  border: 0;\n}\n.a11y-dialog__footer {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex-wrap: wrap;\n  gap: var(--space-12);\n  border-top: 1px solid var(--color-border-subtle);\n  padding-top: var(--space-16);\n}\n.a11y-dialog__footernote {\n  margin: 0;\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n.a11y-option {\n  display: flex;\n  align-items: flex-start;\n  gap: var(--space-12);\n  padding: var(--space-12) var(--space-16);\n  margin: 0 0 var(--space-10);\n  border: 2px solid var(--color-border);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n}\n.a11y-option input {\n  width: 18px;\n  height: 18px;\n  margin-top: var(--space-2);\n  flex-shrink: 0;\n  accent-color: var(--color-primary);\n}\n.a11y-option--selected {\n  border-color: var(--color-primary);\n}\n.a11y-option__text {\n  display: block;\n}\n.a11y-option__label {\n  display: block;\n  font-weight: var(--font-weight-semibold);\n}\n.a11y-option__desc {\n  display: block;\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n[data-theme=black-and-yellow] a {\n  color: var(--color-link);\n  text-decoration: underline;\n}\n[data-theme=black-and-yellow] a.btn,\n[data-theme=black-and-yellow] a.skip-link {\n  text-decoration: none;\n}\n[data-theme=black-and-yellow] .btn--primary {\n  background: var(--color-text);\n}\n[data-theme=black-and-yellow] .btn--primary:hover:not(:disabled) {\n  background: var(--color-primary-hover);\n}\n[data-theme=black-and-yellow] .shell-header .shell-nav a {\n  text-decoration-line: underline;\n  text-underline-offset: 4px;\n}\n[data-theme=black-and-yellow] .leaflet-bar a {\n  background-color: var(--color-bg-surface);\n  color: var(--color-text);\n}\n[data-theme=black-and-yellow] .leaflet-bar a:hover,\n[data-theme=black-and-yellow] .leaflet-bar a:focus {\n  background-color: var(--color-surface-hover);\n}\n[data-theme=black-and-yellow] .leaflet-bar a.leaflet-disabled {\n  background-color: var(--color-bg-surface);\n  color: var(--color-muted);\n}\n[data-theme=black-and-yellow] .leaflet-container .leaflet-control-attribution {\n  background: var(--color-bg-surface);\n  color: var(--color-text);\n}\n[data-theme=black-and-yellow] .leaflet-container .leaflet-control-attribution a {\n  color: var(--color-link);\n  text-decoration: underline;\n}\n[data-theme=black-and-yellow] .leaflet-bar a:focus-visible,\n[data-theme=high-contrast] .leaflet-bar a:focus-visible {\n  outline-color: var(--color-bg-surface);\n}\n[data-theme=high-contrast] .leaflet-container .leaflet-control-attribution a:focus-visible {\n  outline-color: var(--color-bg-surface);\n}\n[data-theme=black-and-yellow] .leaflet-container .leaflet-control-attribution a:focus-visible {\n  outline-color: var(--color-text);\n}\nhtml[data-theme=black-and-yellow] .badge.badge,\nhtml[data-theme=black-and-yellow] .contrib-badge.contrib-badge {\n  background: var(--color-bg-surface);\n  border: 1px solid var(--color-text);\n  color: var(--color-text);\n}\n/*# sourceMappingURL=accessibility-dialog.component.css.map */\n'] }]
  }], null, { dialog: [{ type: i06.ViewChild, args: ["dialog", { isSignal: true }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i06.\u0275setClassDebugInfo(AccessibilityDialog, { className: "AccessibilityDialog", filePath: "src/app/shared/accessibility-dialog.component.ts", lineNumber: 60 });
})();
(() => {
  const id = "src%2Fapp%2Fshared%2Faccessibility-dialog.component.ts%40AccessibilityDialog";
  function AccessibilityDialog_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i06.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i06.\u0275\u0275replaceMetadata(AccessibilityDialog, m.default, [i06], [TranslatePipe, Component3, ViewEncapsulation, ChangeDetectionStrategy3], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && AccessibilityDialog_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && AccessibilityDialog_HmrLoad(d.timestamp)));
})();

// src/app/shared/page-shell.ts
import * as i07 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
function PageShell_Conditional_20_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i07.\u0275\u0275elementStart(0, "a", 22);
    i07.\u0275\u0275text(1);
    i07.\u0275\u0275pipe(2, "t");
    i07.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i07.\u0275\u0275advance();
    i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(2, 1, "nav.account"));
  }
}
function PageShell_Conditional_20_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i07.\u0275\u0275elementStart(0, "a", 23);
    i07.\u0275\u0275text(1);
    i07.\u0275\u0275pipe(2, "t");
    i07.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i07.\u0275\u0275advance();
    i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(2, 1, "nav.admin"));
  }
}
function PageShell_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    i07.\u0275\u0275conditionalCreate(0, PageShell_Conditional_20_Conditional_0_Template, 3, 3, "a", 22);
    i07.\u0275\u0275conditionalCreate(1, PageShell_Conditional_20_Conditional_1_Template, 3, 3, "a", 23);
  }
  if (rf & 2) {
    const ctx_r0 = i07.\u0275\u0275nextContext();
    i07.\u0275\u0275conditional(!ctx_r0.auth.isAdmin() ? 0 : -1);
    i07.\u0275\u0275advance();
    i07.\u0275\u0275conditional(ctx_r0.auth.isAdmin() ? 1 : -1);
  }
}
function PageShell_For_25_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = i07.\u0275\u0275getCurrentView();
    i07.\u0275\u0275elementStart(0, "button", 25);
    i07.\u0275\u0275listener("click", function PageShell_For_25_Conditional_0_Template_button_click_0_listener() {
      i07.\u0275\u0275restoreView(_r2);
      const code_r3 = i07.\u0275\u0275nextContext().$implicit;
      const ctx_r0 = i07.\u0275\u0275nextContext();
      return i07.\u0275\u0275resetView(ctx_r0.setLocale(code_r3));
    });
    i07.\u0275\u0275text(1);
    i07.\u0275\u0275pipe(2, "uppercase");
    i07.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const code_r3 = i07.\u0275\u0275nextContext().$implicit;
    i07.\u0275\u0275advance();
    i07.\u0275\u0275textInterpolate1(" ", i07.\u0275\u0275pipeBind1(2, 1, code_r3), " ");
  }
}
function PageShell_For_25_Template(rf, ctx) {
  if (rf & 1) {
    i07.\u0275\u0275conditionalCreate(0, PageShell_For_25_Conditional_0_Template, 3, 3, "button", 24);
  }
  if (rf & 2) {
    const code_r3 = ctx.$implicit;
    const ctx_r0 = i07.\u0275\u0275nextContext();
    i07.\u0275\u0275conditional(code_r3 !== ctx_r0.i18n.locale() ? 0 : -1);
  }
}
function PageShell_Conditional_29_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = i07.\u0275\u0275getCurrentView();
    i07.\u0275\u0275elementStart(0, "button", 25);
    i07.\u0275\u0275listener("click", function PageShell_Conditional_29_Conditional_0_Template_button_click_0_listener() {
      i07.\u0275\u0275restoreView(_r4);
      const ctx_r0 = i07.\u0275\u0275nextContext(2);
      return i07.\u0275\u0275resetView(ctx_r0.logout());
    });
    i07.\u0275\u0275text(1);
    i07.\u0275\u0275pipe(2, "t");
    i07.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i07.\u0275\u0275advance();
    i07.\u0275\u0275textInterpolate1(" ", i07.\u0275\u0275pipeBind1(2, 1, "auth.logout"), " ");
  }
}
function PageShell_Conditional_29_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i07.\u0275\u0275elementStart(0, "a", 26);
    i07.\u0275\u0275text(1);
    i07.\u0275\u0275pipe(2, "t");
    i07.\u0275\u0275elementEnd();
    i07.\u0275\u0275elementStart(3, "a", 27);
    i07.\u0275\u0275text(4);
    i07.\u0275\u0275pipe(5, "t");
    i07.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i07.\u0275\u0275advance();
    i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(2, 2, "auth.login"));
    i07.\u0275\u0275advance(3);
    i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(5, 4, "auth.register"));
  }
}
function PageShell_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    i07.\u0275\u0275conditionalCreate(0, PageShell_Conditional_29_Conditional_0_Template, 3, 3, "button", 24)(1, PageShell_Conditional_29_Conditional_1_Template, 6, 6);
  }
  if (rf & 2) {
    const ctx_r0 = i07.\u0275\u0275nextContext();
    i07.\u0275\u0275conditional(ctx_r0.auth.authenticated() ? 0 : 1);
  }
}
function PageShell_Conditional_44_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    i07.\u0275\u0275elementStart(0, "span", 17);
    i07.\u0275\u0275text(1, "\xB7");
    i07.\u0275\u0275elementEnd();
    i07.\u0275\u0275text(2);
    i07.\u0275\u0275pipe(3, "t");
    i07.\u0275\u0275pipe(4, "date");
  }
  if (rf & 2) {
    const ctx_r0 = i07.\u0275\u0275nextContext(2);
    i07.\u0275\u0275advance(2);
    i07.\u0275\u0275textInterpolate2(" ", i07.\u0275\u0275pipeBind1(3, 2, "footer.lastImport"), " ", i07.\u0275\u0275pipeBind4(4, 4, ctx.at, "short", void 0, ctx_r0.i18n.locale()), " ");
  }
}
function PageShell_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    i07.\u0275\u0275elementStart(0, "p", 19);
    i07.\u0275\u0275text(1);
    i07.\u0275\u0275pipe(2, "t");
    i07.\u0275\u0275conditionalCreate(3, PageShell_Conditional_44_Conditional_3_Template, 5, 9);
    i07.\u0275\u0275elementStart(4, "span", 17);
    i07.\u0275\u0275text(5, "\xB7");
    i07.\u0275\u0275elementEnd();
    i07.\u0275\u0275elementStart(6, "a", 21);
    i07.\u0275\u0275text(7);
    i07.\u0275\u0275pipe(8, "t");
    i07.\u0275\u0275elementEnd();
    i07.\u0275\u0275elementStart(9, "span", 17);
    i07.\u0275\u0275text(10, "\xB7");
    i07.\u0275\u0275elementEnd();
    i07.\u0275\u0275text(11);
    i07.\u0275\u0275pipe(12, "t");
    i07.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_3_0;
    const ds_r5 = ctx;
    i07.\u0275\u0275advance();
    i07.\u0275\u0275textInterpolate2(" ", i07.\u0275\u0275pipeBind1(2, 6, "footer.dataSource"), ": ", ds_r5.sourceName, " ");
    i07.\u0275\u0275advance(2);
    i07.\u0275\u0275conditional((tmp_3_0 = ds_r5.lastImport) ? 3 : -1, tmp_3_0);
    i07.\u0275\u0275advance(3);
    i07.\u0275\u0275property("href", ds_r5.officialUrl, i07.\u0275\u0275sanitizeUrl);
    i07.\u0275\u0275advance();
    i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(8, 8, "footer.officialOpenData"));
    i07.\u0275\u0275advance(4);
    i07.\u0275\u0275textInterpolate1(" ", i07.\u0275\u0275pipeBind1(12, 10, "footer.dataSourceTransformed"), " ");
  }
}
var PageShell = class _PageShell {
  store = inject7(AuthStore);
  themeStore = inject7(ThemeStore);
  i18nService = inject7(I18nService);
  router = inject7(Router2);
  host = inject7(ElementRef3);
  /** Mobile menu panel open state (only meaningful below 900px; the
      burger is hidden at desktop widths). */
  menuOpen = signal5(
    false,
    ...ngDevMode ? [{ debugName: "menuOpen" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The /admin route renders the queue tables (the guidance list's 8
      columns), which need the wider content column — its shell-body takes
      --content-max-width-wide instead of the public --content-max-width
      (deliberate exception, see page-shell.scss / styles.scss). Every
      other route keeps the public cap. */
  adminWide = signal5(
    this.router.url.startsWith("/admin"),
    ...ngDevMode ? [{ debugName: "adminWide" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Data provenance for the footer line (official-dataset-csv):
      publisher + official link + last import. Stays null while loading or
      when the API fails — the line is non-critical and hides itself. */
  dataSource = signal5(
    null,
    ...ngDevMode ? [{ debugName: "dataSource" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The accessibility dialog (accessibility-dialog): the header's
      Accessibility button opens it; the overlay renders inside the host.
      Its `open` signal IS the trigger's aria-expanded source — the shell
      has no second copy of the state (close paths — Escape, the Close
      button, the backdrop — all live in the dialog). */
  a11yDialog = viewChild4(
    AccessibilityDialog,
    ...ngDevMode ? [{ debugName: "a11yDialog" }] : (
      /* istanbul ignore next */
      []
    )
  );
  constructor() {
    this.host.nativeElement.addEventListener("keydown", this.onKeydown);
    inject7(DataSourceGateway).fetch().then((ds) => this.dataSource.set(ds));
    inject7(SiteTextsGateway).fetch().then((texts) => this.i18nService.setSiteTexts(texts)).catch(() => {
    });
  }
  /** The header's Accessibility button: opens the dialog (focus moves
      in; the mobile menu closes with the same click, like any other
      menu item — the dialog is fixed-positioned, not a menu child). */
  openAccessibilityDialog() {
    this.menuOpen.set(false);
    this.a11yDialog()?.openDialog();
  }
  /** True until the first NavigationEnd: that one is the initial document
      load, where the browser's own focus start — and the skip link —
      must win. */
  firstNavigation = true;
  /** Any completed navigation closes the open menu and lands focus on the
      routed content (bound to NavigationEnd — on any). Unsubscribed in
      ngOnDestroy. */
  routerClose = this.router.events.subscribe((event) => {
    if (event instanceof NavigationEnd) {
      this.menuOpen.set(false);
      this.adminWide.set(event.urlAfterRedirects.startsWith("/admin"));
      this.focusMainOnRouteChange();
    }
  });
  auth = this.store;
  theme = this.themeStore;
  /** i18n-et-en: the chrome copy + the language switcher. `locale`
      is read in the template, so a switch triggers this component's
      change detection and the `pure: false` `t` pipe re-renders. */
  i18n = this.i18nService;
  /** The switcher buttons render from LOCALES (a new language is one
      catalog entry, not a template edit). */
  locales = LOCALES;
  /** Language switcher action — persists (I18nService). */
  setLocale(locale) {
    this.i18nService.setLocale(locale);
  }
  ngOnDestroy() {
    this.host.nativeElement.removeEventListener("keydown", this.onKeydown);
    this.routerClose.unsubscribe();
  }
  /** Burger click: open/closes the panel. */
  toggleMenu() {
    this.menuOpen.update((open) => !open);
  }
  /** Any menu item click closes the panel — bound to the .shell-menu
      container, so every current and future item is covered in one
      place (nav anchors, high-contrast toggle, auth buttons/anchors). */
  closeMenu() {
    this.menuOpen.set(false);
  }
  onKeydown = (event) => {
    if (event.key === "Escape") {
      this.menuOpen.set(false);
    }
  };
  /** A route change replaces the page without a document load, so the
      keyboard/screen-reader user would stay parked on the nav item they
      clicked (or on <body>) while the content below changed. Focus the
      routed container — the skip link's landing target — for every
      navigation after the initial load. An open modal dialog owns the
      keyboard (the consent overlay links to /privacy, so a route change can
      happen with it open): never pull focus out from behind it. */
  focusMainOnRouteChange() {
    if (this.firstNavigation) {
      this.firstNavigation = false;
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('[aria-modal="true"]') !== null) {
      return;
    }
    this.host.nativeElement.querySelector("#main")?.focus();
  }
  async logout() {
    await this.auth.logout();
    await this.router.navigate(["/map"]);
  }
  static \u0275fac = function PageShell_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _PageShell)();
  };
  static \u0275cmp = /* @__PURE__ */ i07.\u0275\u0275defineComponent({ type: _PageShell, selectors: [["app-page-shell"]], viewQuery: function PageShell_Query(rf, ctx) {
    if (rf & 1) {
      i07.\u0275\u0275viewQuerySignal(ctx.a11yDialog, AccessibilityDialog, 5);
    }
    if (rf & 2) {
      i07.\u0275\u0275queryAdvance();
    }
  }, decls: 60, vars: 59, consts: [["href", "#main", 1, "skip-link"], [1, "shell-header"], ["routerLink", "/map", 1, "brand"], ["type", "button", "aria-controls", "shell-mobile-menu", 1, "shell-burger", 3, "click"], ["aria-hidden", "true", 1, "shell-burger__bar"], ["id", "shell-mobile-menu", 1, "shell-menu", 3, "click"], [1, "shell-nav"], ["routerLink", "/map", "routerLinkActive", "active"], ["routerLink", "/blog", "routerLinkActive", "active"], [1, "shell-actions"], ["role", "group", 1, "shell-lang"], ["type", "button", "id", "a11y-trigger", 1, "btn", "btn--ghost", 3, "click"], ["id", "main", "tabindex", "-1", 1, "shell-body"], [1, "shell-footer"], [1, "shell-footer__meta"], [1, "shell-footer__legal"], ["routerLink", "/privacy"], ["aria-hidden", "true"], ["routerLink", "/terms"], [1, "shell-footer__data"], [1, "shell-footer__notice"], ["target", "_blank", "rel", "noopener", 3, "href"], ["routerLink", "/account", "routerLinkActive", "active"], ["routerLink", "/admin", "routerLinkActive", "active"], ["type", "button", 1, "btn", "btn--ghost"], ["type", "button", 1, "btn", "btn--ghost", 3, "click"], ["routerLink", "/login", 1, "btn", "btn--ghost"], ["routerLink", "/register", 1, "btn", "btn--primary"]], template: function PageShell_Template(rf, ctx) {
    if (rf & 1) {
      i07.\u0275\u0275elementStart(0, "a", 0);
      i07.\u0275\u0275text(1);
      i07.\u0275\u0275pipe(2, "t");
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275elementStart(3, "header", 1)(4, "a", 2);
      i07.\u0275\u0275text(5, "OpenShelter");
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275elementStart(6, "button", 3);
      i07.\u0275\u0275pipe(7, "t");
      i07.\u0275\u0275listener("click", function PageShell_Template_button_click_6_listener() {
        return ctx.toggleMenu();
      });
      i07.\u0275\u0275element(8, "span", 4)(9, "span", 4)(10, "span", 4);
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275elementStart(11, "div", 5);
      i07.\u0275\u0275listener("click", function PageShell_Template_div_click_11_listener() {
        return ctx.closeMenu();
      });
      i07.\u0275\u0275elementStart(12, "nav", 6);
      i07.\u0275\u0275pipe(13, "t");
      i07.\u0275\u0275elementStart(14, "a", 7);
      i07.\u0275\u0275text(15);
      i07.\u0275\u0275pipe(16, "t");
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275elementStart(17, "a", 8);
      i07.\u0275\u0275text(18);
      i07.\u0275\u0275pipe(19, "t");
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275conditionalCreate(20, PageShell_Conditional_20_Template, 2, 2);
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275elementStart(21, "div", 9)(22, "div", 10);
      i07.\u0275\u0275pipe(23, "t");
      i07.\u0275\u0275repeaterCreate(24, PageShell_For_25_Template, 1, 1, null, null, i07.\u0275\u0275repeaterTrackByIdentity);
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275elementStart(26, "button", 11);
      i07.\u0275\u0275listener("click", function PageShell_Template_button_click_26_listener() {
        return ctx.openAccessibilityDialog();
      });
      i07.\u0275\u0275text(27);
      i07.\u0275\u0275pipe(28, "t");
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275conditionalCreate(29, PageShell_Conditional_29_Template, 2, 1);
      i07.\u0275\u0275elementEnd()()();
      i07.\u0275\u0275elementStart(30, "main", 12);
      i07.\u0275\u0275element(31, "router-outlet");
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275elementStart(32, "footer", 13)(33, "div", 14)(34, "nav", 15);
      i07.\u0275\u0275pipe(35, "t");
      i07.\u0275\u0275elementStart(36, "a", 16);
      i07.\u0275\u0275text(37);
      i07.\u0275\u0275pipe(38, "t");
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275elementStart(39, "span", 17);
      i07.\u0275\u0275text(40, "\xB7");
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275elementStart(41, "a", 18);
      i07.\u0275\u0275text(42);
      i07.\u0275\u0275pipe(43, "t");
      i07.\u0275\u0275elementEnd()();
      i07.\u0275\u0275conditionalCreate(44, PageShell_Conditional_44_Template, 13, 12, "p", 19);
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275elementStart(45, "p", 20);
      i07.\u0275\u0275text(46);
      i07.\u0275\u0275pipe(47, "t");
      i07.\u0275\u0275pipe(48, "t");
      i07.\u0275\u0275pipe(49, "t");
      i07.\u0275\u0275elementStart(50, "a", 21);
      i07.\u0275\u0275text(51);
      i07.\u0275\u0275pipe(52, "t");
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275text(53);
      i07.\u0275\u0275pipe(54, "t");
      i07.\u0275\u0275elementStart(55, "a", 21);
      i07.\u0275\u0275text(56);
      i07.\u0275\u0275pipe(57, "t");
      i07.\u0275\u0275elementEnd();
      i07.\u0275\u0275text(58, ". ");
      i07.\u0275\u0275elementEnd()();
      i07.\u0275\u0275element(59, "app-accessibility-dialog");
    }
    if (rf & 2) {
      let tmp_17_0;
      i07.\u0275\u0275advance();
      i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(2, 27, "nav.skip"));
      i07.\u0275\u0275advance(5);
      i07.\u0275\u0275attribute("aria-label", i07.\u0275\u0275pipeBind1(7, 29, "menu.aria"))("aria-expanded", ctx.menuOpen());
      i07.\u0275\u0275advance(5);
      i07.\u0275\u0275classProp("shell-menu--open", ctx.menuOpen());
      i07.\u0275\u0275advance();
      i07.\u0275\u0275attribute("aria-label", i07.\u0275\u0275pipeBind1(13, 31, "nav.primaryAria"));
      i07.\u0275\u0275advance(3);
      i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(16, 33, "nav.map"));
      i07.\u0275\u0275advance(3);
      i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(19, 35, "nav.guidance"));
      i07.\u0275\u0275advance(2);
      i07.\u0275\u0275conditional(ctx.auth.initialized() && ctx.auth.authenticated() ? 20 : -1);
      i07.\u0275\u0275advance(2);
      i07.\u0275\u0275attribute("aria-label", i07.\u0275\u0275pipeBind1(23, 37, "lang.label"));
      i07.\u0275\u0275advance(2);
      i07.\u0275\u0275repeater(ctx.locales);
      i07.\u0275\u0275advance(2);
      i07.\u0275\u0275attribute("aria-expanded", ctx.a11yDialog()?.open() === true ? "true" : "false");
      i07.\u0275\u0275advance();
      i07.\u0275\u0275textInterpolate1(" ", i07.\u0275\u0275pipeBind1(28, 39, "a11y.button"), " ");
      i07.\u0275\u0275advance(2);
      i07.\u0275\u0275conditional(ctx.auth.initialized() ? 29 : -1);
      i07.\u0275\u0275advance();
      i07.\u0275\u0275classProp("shell-body--admin", ctx.adminWide());
      i07.\u0275\u0275advance(4);
      i07.\u0275\u0275attribute("aria-label", i07.\u0275\u0275pipeBind1(35, 41, "footer.legalAria"));
      i07.\u0275\u0275advance(3);
      i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(38, 43, "footer.privacy"));
      i07.\u0275\u0275advance(5);
      i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(43, 45, "footer.terms"));
      i07.\u0275\u0275advance(2);
      i07.\u0275\u0275conditional((tmp_17_0 = ctx.dataSource()) ? 44 : -1, tmp_17_0);
      i07.\u0275\u0275advance(2);
      i07.\u0275\u0275textInterpolate3(" ", i07.\u0275\u0275pipeBind1(47, 47, "footer.notice1"), " ", i07.\u0275\u0275pipeBind1(48, 49, "footer.notice2"), " ", i07.\u0275\u0275pipeBind1(49, 51, "footer.notice3"), " ");
      i07.\u0275\u0275advance(4);
      i07.\u0275\u0275property("href", ctx.i18n.url("footer.rescueBoard"), i07.\u0275\u0275sanitizeUrl);
      i07.\u0275\u0275advance();
      i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(52, 53, "footer.rescueBoard"));
      i07.\u0275\u0275advance(2);
      i07.\u0275\u0275textInterpolate1(" ", i07.\u0275\u0275pipeBind1(54, 55, "footer.and"), " ");
      i07.\u0275\u0275advance(2);
      i07.\u0275\u0275property("href", ctx.i18n.url("footer.ministry"), i07.\u0275\u0275sanitizeUrl);
      i07.\u0275\u0275advance();
      i07.\u0275\u0275textInterpolate(i07.\u0275\u0275pipeBind1(57, 57, "footer.ministry"));
    }
  }, dependencies: [RouterOutlet, RouterLink3, AccessibilityDialog, DatePipe, UpperCasePipe, TranslatePipe], styles: ['@charset "UTF-8";\n\n\n[_nghost-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  min-height: 100dvh;\n}\n.shell-header[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: var(--%NS%space-12) var(--%NS%space-24);\n  padding: var(--%NS%space-12) var(--%NS%space-20);\n  background: var(--%NS%color-chrome-bg);\n  color: var(--%NS%color-chrome-text);\n  border-bottom: 1px solid var(--%NS%color-chrome-border);\n}\n.shell-header[_ngcontent-%COMP%]   .brand[_ngcontent-%COMP%] {\n  font-weight: var(--%NS%font-weight-bold);\n  font-size: var(--%NS%text-xl);\n  color: var(--%NS%color-chrome-text);\n  text-decoration: none;\n  letter-spacing: var(--%NS%tracking-brand);\n}\n.shell-burger[_ngcontent-%COMP%] {\n  display: none;\n}\n.shell-menu[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  gap: var(--%NS%space-24);\n}\n.shell-nav[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-16);\n}\n.shell-nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: inherit;\n  text-decoration: none;\n  padding: var(--%NS%space-4) var(--%NS%space-6);\n}\n.shell-nav[_ngcontent-%COMP%]   a.active[_ngcontent-%COMP%] {\n  color: var(--%NS%color-chrome-text);\n  text-decoration: underline;\n  text-decoration-color: var(--%NS%color-chrome-active);\n  text-decoration-thickness: 2px;\n  text-underline-offset: 4px;\n}\n.shell-actions[_ngcontent-%COMP%] {\n  margin-left: auto;\n  display: flex;\n  align-items: center;\n  gap: var(--%NS%space-10);\n}\n.shell-header[_ngcontent-%COMP%]   .btn--ghost[_ngcontent-%COMP%] {\n  background: var(--%NS%color-bg);\n  color: var(--%NS%color-text);\n  border-color: var(--%NS%color-border);\n}\n.shell-header[_ngcontent-%COMP%]   .btn--%NS%ghost[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--%NS%color-surface-hover);\n}\n.shell-header[_ngcontent-%COMP%]   [_ngcontent-%COMP%]:focus-visible, \n.shell-footer[_ngcontent-%COMP%]   [_ngcontent-%COMP%]:focus-visible, \n.skip-link[_ngcontent-%COMP%]:focus-visible {\n  outline: 2px solid var(--%NS%color-chrome-focus);\n  outline-offset: 2px;\n}\n.shell-lang[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-8);\n}\n#main[_ngcontent-%COMP%]:focus, \n#main[_ngcontent-%COMP%]:focus-visible {\n  outline: none;\n}\n.shell-body[_ngcontent-%COMP%] {\n  flex: 1;\n  width: 100%;\n  max-width: var(--%NS%content-max-width);\n  margin: 0 auto;\n  padding: var(--%NS%space-24) var(--%NS%space-20) var(--%NS%space-48);\n  display: flex;\n  flex-direction: column;\n}\n.shell-body[_ngcontent-%COMP%]   router-outlet[_ngcontent-%COMP%] {\n  flex: 0 0 auto;\n}\n.shell-body--admin[_ngcontent-%COMP%] {\n  max-width: var(--%NS%content-max-width-wide);\n}\n.shell-footer[_ngcontent-%COMP%] {\n  width: 100%;\n  border-top: 1px solid var(--%NS%color-chrome-border);\n  background: var(--%NS%color-chrome-bg);\n}\n.shell-footer[_ngcontent-%COMP%]   .shell-footer__notice[_ngcontent-%COMP%] {\n  max-width: none;\n  margin: 0 auto;\n  padding: var(--%NS%space-6) var(--%NS%space-20) var(--%NS%space-16);\n  text-align: center;\n  font-size: var(--%NS%text-sm);\n  line-height: 1.4;\n  color: var(--%NS%color-chrome-muted);\n}\n.shell-footer[_ngcontent-%COMP%]   .shell-footer__notice[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--%NS%color-chrome-text);\n}\n.shell-footer[_ngcontent-%COMP%] {\n}\n.shell-footer[_ngcontent-%COMP%]   .shell-footer__meta[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-6);\n  padding: var(--%NS%space-16) var(--%NS%space-20) 0;\n}\n.shell-footer[_ngcontent-%COMP%]   .shell-footer__legal[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-chrome-muted);\n}\n.shell-footer[_ngcontent-%COMP%]   .shell-footer__legal[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--%NS%color-chrome-text);\n}\n.shell-footer[_ngcontent-%COMP%]   .shell-footer__legal[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  margin: 0 var(--%NS%space-6);\n}\n.shell-footer[_ngcontent-%COMP%]   .shell-footer__data[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-chrome-muted);\n}\n.shell-footer[_ngcontent-%COMP%]   .shell-footer__data[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--%NS%color-chrome-text);\n}\n.shell-footer[_ngcontent-%COMP%]   .shell-footer__data[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  margin: 0 var(--%NS%space-6);\n}\n.shell-footer[_ngcontent-%COMP%] {\n}\n@media (min-width: 900px) {\n  .shell-footer[_ngcontent-%COMP%]   .shell-footer__meta[_ngcontent-%COMP%] {\n    flex-direction: row;\n    justify-content: center;\n    gap: var(--%NS%space-32);\n    align-items: baseline;\n  }\n}\n.shell-footer[_ngcontent-%COMP%] {\n}\n@media (max-width: 900px) {\n  .shell-footer[_ngcontent-%COMP%]   .shell-footer__legal[_ngcontent-%COMP%], \n   .shell-footer[_ngcontent-%COMP%]   .shell-footer__data[_ngcontent-%COMP%] {\n    text-align: center;\n  }\n  .shell-footer[_ngcontent-%COMP%] {\n  }\n  .shell-footer[_ngcontent-%COMP%]   .shell-footer__legal[_ngcontent-%COMP%]   [aria-hidden=true][_ngcontent-%COMP%], \n   .shell-footer[_ngcontent-%COMP%]   .shell-footer__data[_ngcontent-%COMP%]   [aria-hidden=true][_ngcontent-%COMP%] {\n    display: none;\n  }\n  .shell-footer[_ngcontent-%COMP%] {\n  }\n  .shell-footer[_ngcontent-%COMP%]   .shell-footer__legal[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n    padding: var(--%NS%space-16) var(--%NS%space-12);\n  }\n}\n@media (max-width: 900px) {\n  .shell-burger[_ngcontent-%COMP%] {\n    display: inline-flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    gap: var(--%NS%space-6);\n    margin-left: auto;\n    min-height: var(--%NS%space-48);\n    min-width: var(--%NS%space-48);\n    padding: 0;\n    color: inherit;\n    background: transparent;\n    border: none;\n    border-radius: var(--%NS%radius-md);\n    cursor: pointer;\n  }\n  .shell-burger[_ngcontent-%COMP%]   .shell-burger__bar[_ngcontent-%COMP%] {\n    display: block;\n    width: var(--%NS%space-24);\n    height: var(--%NS%space-2);\n    border-radius: var(--%NS%radius-sm);\n    background: currentColor;\n    transition: transform 180ms ease-in-out, opacity 180ms ease-in-out;\n  }\n  .shell-burger[aria-expanded=true][_ngcontent-%COMP%]   .shell-burger__bar[_ngcontent-%COMP%]:nth-child(1) {\n    transform: translateY(calc(var(--%NS%space-2) + var(--%NS%space-6))) rotate(45deg);\n  }\n  .shell-burger[aria-expanded=true][_ngcontent-%COMP%]   .shell-burger__bar[_ngcontent-%COMP%]:nth-child(2) {\n    opacity: 0;\n  }\n  .shell-burger[aria-expanded=true][_ngcontent-%COMP%]   .shell-burger__bar[_ngcontent-%COMP%]:nth-child(3) {\n    transform: translateY(calc(-1 * (var(--%NS%space-2) + var(--%NS%space-6)))) rotate(-45deg);\n  }\n  .shell-menu[_ngcontent-%COMP%] {\n    position: absolute;\n    top: 100%;\n    left: 0;\n    right: 0;\n    z-index: 1100;\n    display: none;\n    flex-direction: column;\n    align-items: stretch;\n    gap: var(--%NS%space-12);\n    padding: var(--%NS%space-8) var(--%NS%space-20) var(--%NS%space-16);\n    background: var(--%NS%color-chrome-bg);\n    border-bottom: 1px solid var(--%NS%color-chrome-border);\n  }\n  .shell-menu.shell-menu--open[_ngcontent-%COMP%] {\n    display: flex;\n  }\n  .shell-menu[_ngcontent-%COMP%]   .shell-nav[_ngcontent-%COMP%] {\n    flex-direction: column;\n    align-items: stretch;\n    gap: var(--%NS%space-4);\n  }\n  .shell-menu[_ngcontent-%COMP%]   .shell-nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    min-height: var(--%NS%space-48);\n  }\n  .shell-menu[_ngcontent-%COMP%]   .shell-actions[_ngcontent-%COMP%] {\n    margin-left: 0;\n    flex-direction: column;\n    align-items: stretch;\n    gap: var(--%NS%space-4);\n  }\n  .shell-menu[_ngcontent-%COMP%]   .shell-actions[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%] {\n    width: 100%;\n    justify-content: flex-start;\n  }\n  .shell-menu[_ngcontent-%COMP%]   .shell-actions[_ngcontent-%COMP%] {\n  }\n  .shell-menu[_ngcontent-%COMP%]   .shell-actions[_ngcontent-%COMP%]   .shell-lang[_ngcontent-%COMP%] {\n    width: 100%;\n  }\n  .shell-menu[_ngcontent-%COMP%]   .shell-actions[_ngcontent-%COMP%]   .shell-lang[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%] {\n    flex: 1;\n    justify-content: center;\n  }\n}\n@media (max-width: 900px) and (prefers-reduced-motion: reduce) {\n  .shell-burger__bar[_ngcontent-%COMP%] {\n    transition: none;\n  }\n}\n/*# sourceMappingURL=page-shell.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i07.\u0275setClassMetadata(PageShell, [{
    type: Component4,
    args: [{ selector: "app-page-shell", imports: [RouterOutlet, RouterLink3, DatePipe, UpperCasePipe, TranslatePipe, AccessibilityDialog], changeDetection: ChangeDetectionStrategy4.OnPush, template: `<!-- Skip link (WCAG 2.4.1): the shell's FIRST element \u2014
     off-screen until it takes keyboard focus, then it reveals over the header
     so the first Tab jumps past the whole nav into the routed page
     (<main id="main" tabindex="-1"> below). -->
<a class="skip-link" href="#main">{{ 'nav.skip' | t }}</a>

<header class="shell-header">
  <a class="brand" routerLink="/map">OpenShelter</a>
  <!-- Mobile burger (hidden at >=900px): opens the .shell-menu panel below.
       The three bars are CSS-drawn \u2014 no icon library, no unicode glyph. -->
  <button
    type="button"
    class="shell-burger"
    [attr.aria-label]="'menu.aria' | t"
    [attr.aria-expanded]="menuOpen()"
    aria-controls="shell-mobile-menu"
    (click)="toggleMenu()"
  >
    <span class="shell-burger__bar" aria-hidden="true"></span>
    <span class="shell-burger__bar" aria-hidden="true"></span>
    <span class="shell-burger__bar" aria-hidden="true"></span>
  </button>
  <!-- Single source for nav + actions: at >=900 a normal flex row (the
       flex: 1 keeps .shell-actions' margin-left: auto pushing the actions
       to the header's right edge \u2014 the old inline layout, visually
       unchanged); below 900 the same node is the dropdown panel (hidden
       until opened). The (click) close covers every menu item in one
       place: nav anchors, the language switcher, the high-contrast
       toggle, the auth controls. -->
  <div
    class="shell-menu"
    id="shell-mobile-menu"
    [class.shell-menu--open]="menuOpen()"
    (click)="closeMenu()"
  >
    <nav class="shell-nav" [attr.aria-label]="'nav.primaryAria' | t">
      <a routerLink="/map" routerLinkActive="active">{{ 'nav.map' | t }}</a>
      <!-- Public crisis-guidance index (crisis-guidance D6): permit-all \u2014
           anonymous visitors see it too, like the map. -->
      <a routerLink="/blog" routerLinkActive="active">{{ 'nav.guidance' | t }}</a>
      @if (auth.initialized() && auth.authenticated()) {
        <!-- The provisioned admin (kind ADMIN \u2014 the SAME isAdmin signal as
             the Admin item below; the account page keys its "nothing to
             edit here" copy on it too) gets NO Account link: the admin's
             login and password are deployment environment variables, so
             /account offers it nothing to edit and the header must not
             advertise it. The URL stays reachable \u2014 the server already
             refuses the admin's dangerous account actions (403); we only
             stop linking to it. Hiding the <a> leaves no layout hole:
             .shell-nav is a gap-based flex row with no separators, and
             this node serves BOTH the desktop row and the <900px panel. -->
        @if (!auth.isAdmin()) {
          <a routerLink="/account" routerLinkActive="active">{{ 'nav.account' | t }}</a>
        }
        <!-- Admin-kind only (admin-moderation D5): regular users see the
             nav unchanged; a failed profile fetch leaves isAdmin false, so
             the item hides itself fail-closed. -->
        @if (auth.isAdmin()) {
          <a routerLink="/admin" routerLinkActive="active">{{ 'nav.admin' | t }}</a>
        }
      }
    </nav>
    <div class="shell-actions">
      <!-- Language switcher (i18n-et-en): offers only the language the reader
           can switch TO \u2014 the ACTIVE locale is never rendered (clicking it
           would be a no-op). The choice persists (openshelter-locale) and
           applies pre-paint via the inline index.html script. The buttons
           render from LOCALES; the labels are the language codes themselves
           \u2014 never translated. -->
      <div class="shell-lang" role="group" [attr.aria-label]="'lang.label' | t">
        @for (code of locales; track code) {
          @if (code !== i18n.locale()) {
            <button type="button" class="btn btn--ghost" (click)="setLocale(code)">
              {{ code | uppercase }}
            </button>
          }
        }
      </div>
      <!-- Accessibility button (accessibility-dialog, replaces the
           high-contrast toggle): opens the role=dialog contrast panel.
           Always visible (independent of auth); the choice persists in
           localStorage and applies before first paint (the inline
           index.html script). #a11y-trigger is the focus-return target
           when the dialog closes. -->
      <button
        type="button"
        id="a11y-trigger"
        class="btn btn--ghost"
        [attr.aria-expanded]="a11yDialog()?.open() === true ? 'true' : 'false'"
        (click)="openAccessibilityDialog()"
      >
        {{ 'a11y.button' | t }}
      </button>
      @if (auth.initialized()) {
        @if (auth.authenticated()) {
          <button type="button" class="btn btn--ghost" (click)="logout()">
            {{ 'auth.logout' | t }}
          </button>
        } @else {
          <a routerLink="/login" class="btn btn--ghost">{{ 'auth.login' | t }}</a>
          <a routerLink="/register" class="btn btn--primary">{{ 'auth.register' | t }}</a>
        }
      }
    </div>
  </div>
</header>

<!-- The routed content. tabindex="-1" is the skip link's landing target:
     focusing it moves the next Tab into the page instead of back to the nav.
     page-shell.ts focuses it on every route change after the initial load
     too, so a client-side swap lands the keyboard the
     way a document load does. -->
<main
    class="shell-body"
    id="main"
    tabindex="-1"
    [class.shell-body--admin]="adminWide()"
  >
  <router-outlet />
</main>

<!-- App-wide safety notice: the list is community-maintained and NOT an
     official emergency channel (the "verified user \u2260 verified shelter"
     trust gap). 112 first, then the official sources. Lives in the shell
     so every page carries it, and out of the feature pages' layout.
     i18n-et-en: segmented around the two official links \u2014 the link
     URLs stay constant, only the labels translate. -->
<footer class="shell-footer">
  <!-- legal-recovery + official-dataset-csv:
       the meta row sits ABOVE the notice (owner's layout decision) \u2014 the
       two groups (legal links, data provenance) centred as a pair on
       desktop, stacked on narrow (<900px).
       Provenance is non-critical: hidden while loading or on API error.
       i18n-et-en: labels + the date stamp follow the active locale. -->
  <div class="shell-footer__meta">
    <nav class="shell-footer__legal" [attr.aria-label]="'footer.legalAria' | t">
      <a routerLink="/privacy">{{ 'footer.privacy' | t }}</a>
      <span aria-hidden="true">&middot;</span>
      <a routerLink="/terms">{{ 'footer.terms' | t }}</a>
    </nav>
    @if (dataSource(); as ds) {
      <p class="shell-footer__data">
        {{ 'footer.dataSource' | t }}: {{ ds.sourceName }}
        @if (ds.lastImport; as last) {
          <span aria-hidden="true">&middot;</span>
          {{ 'footer.lastImport' | t }}
          {{ last.at | date: 'short' : undefined : i18n.locale() }}
        }
        <span aria-hidden="true">&middot;</span>
        <a [href]="ds.officialUrl" target="_blank" rel="noopener">{{
          'footer.officialOpenData' | t
        }}</a>
        <span aria-hidden="true">&middot;</span>
        {{ 'footer.dataSourceTransformed' | t }}
      </p>
    }
  </div>
  <!-- The safety notice: the BOTTOM tier, centred on its own full-width
       line (the owner's no-wrap requirement \u2014 the combined sentence needs
       ~1100px, so it must have the row to itself). -->
  <p class="shell-footer__notice">
    {{ 'footer.notice1' | t }} {{ 'footer.notice2' | t }} {{ 'footer.notice3' | t }}
    <a [href]="i18n.url('footer.rescueBoard')" target="_blank" rel="noopener">{{
      'footer.rescueBoard' | t
    }}</a>
    {{ 'footer.and' | t }}
    <a [href]="i18n.url('footer.ministry')" target="_blank" rel="noopener">{{
      'footer.ministry' | t
    }}</a
    >.
  </p>
</footer>

<!-- The accessibility dialog (accessibility-dialog): mounted in the shell
     next to the header that owns its trigger. role=dialog + aria-modal,
     focus trapped inside, Escape closes, focus returns to #a11y-trigger.
     Its ViewEncapsulation.None stylesheet also carries the
     black-and-yellow theme's page-wide rules (see the component).
     NOTE: no \`#\` reference here \u2014 a template ref named \`a11yDialog\`
     would shadow the viewChild signal of the same name in template
     expressions (the trigger's aria-expanded reads the signal). -->
<app-accessibility-dialog />
`, styles: ['@charset "UTF-8";\n\n/* src/app/shared/page-shell.scss */\n:host {\n  display: flex;\n  flex-direction: column;\n  min-height: 100dvh;\n}\n.shell-header {\n  position: relative;\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: var(--space-12) var(--space-24);\n  padding: var(--space-12) var(--space-20);\n  background: var(--color-chrome-bg);\n  color: var(--color-chrome-text);\n  border-bottom: 1px solid var(--color-chrome-border);\n}\n.shell-header .brand {\n  font-weight: var(--font-weight-bold);\n  font-size: var(--text-xl);\n  color: var(--color-chrome-text);\n  text-decoration: none;\n  letter-spacing: var(--tracking-brand);\n}\n.shell-burger {\n  display: none;\n}\n.shell-menu {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  gap: var(--space-24);\n}\n.shell-nav {\n  display: flex;\n  gap: var(--space-16);\n}\n.shell-nav a {\n  color: inherit;\n  text-decoration: none;\n  padding: var(--space-4) var(--space-6);\n}\n.shell-nav a.active {\n  color: var(--color-chrome-text);\n  text-decoration: underline;\n  text-decoration-color: var(--color-chrome-active);\n  text-decoration-thickness: 2px;\n  text-underline-offset: 4px;\n}\n.shell-actions {\n  margin-left: auto;\n  display: flex;\n  align-items: center;\n  gap: var(--space-10);\n}\n.shell-header .btn--ghost {\n  background: var(--color-bg);\n  color: var(--color-text);\n  border-color: var(--color-border);\n}\n.shell-header .btn--ghost:hover:not(:disabled) {\n  background: var(--color-surface-hover);\n}\n.shell-header :focus-visible,\n.shell-footer :focus-visible,\n.skip-link:focus-visible {\n  outline: 2px solid var(--color-chrome-focus);\n  outline-offset: 2px;\n}\n.shell-lang {\n  display: flex;\n  gap: var(--space-8);\n}\n#main:focus,\n#main:focus-visible {\n  outline: none;\n}\n.shell-body {\n  flex: 1;\n  width: 100%;\n  max-width: var(--content-max-width);\n  margin: 0 auto;\n  padding: var(--space-24) var(--space-20) var(--space-48);\n  display: flex;\n  flex-direction: column;\n}\n.shell-body router-outlet {\n  flex: 0 0 auto;\n}\n.shell-body--admin {\n  max-width: var(--content-max-width-wide);\n}\n.shell-footer {\n  width: 100%;\n  border-top: 1px solid var(--color-chrome-border);\n  background: var(--color-chrome-bg);\n}\n.shell-footer .shell-footer__notice {\n  max-width: none;\n  margin: 0 auto;\n  padding: var(--space-6) var(--space-20) var(--space-16);\n  text-align: center;\n  font-size: var(--text-sm);\n  line-height: 1.4;\n  color: var(--color-chrome-muted);\n}\n.shell-footer .shell-footer__notice a {\n  color: var(--color-chrome-text);\n}\n.shell-footer {\n}\n.shell-footer .shell-footer__meta {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-6);\n  padding: var(--space-16) var(--space-20) 0;\n}\n.shell-footer .shell-footer__legal {\n  margin: 0;\n  font-size: var(--text-sm);\n  color: var(--color-chrome-muted);\n}\n.shell-footer .shell-footer__legal a {\n  color: var(--color-chrome-text);\n}\n.shell-footer .shell-footer__legal span {\n  margin: 0 var(--space-6);\n}\n.shell-footer .shell-footer__data {\n  margin: 0;\n  font-size: var(--text-sm);\n  color: var(--color-chrome-muted);\n}\n.shell-footer .shell-footer__data a {\n  color: var(--color-chrome-text);\n}\n.shell-footer .shell-footer__data span {\n  margin: 0 var(--space-6);\n}\n.shell-footer {\n}\n@media (min-width: 900px) {\n  .shell-footer .shell-footer__meta {\n    flex-direction: row;\n    justify-content: center;\n    gap: var(--space-32);\n    align-items: baseline;\n  }\n}\n.shell-footer {\n}\n@media (max-width: 900px) {\n  .shell-footer .shell-footer__legal,\n  .shell-footer .shell-footer__data {\n    text-align: center;\n  }\n  .shell-footer {\n  }\n  .shell-footer .shell-footer__legal [aria-hidden=true],\n  .shell-footer .shell-footer__data [aria-hidden=true] {\n    display: none;\n  }\n  .shell-footer {\n  }\n  .shell-footer .shell-footer__legal a {\n    padding: var(--space-16) var(--space-12);\n  }\n}\n@media (max-width: 900px) {\n  .shell-burger {\n    display: inline-flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    gap: var(--space-6);\n    margin-left: auto;\n    min-height: var(--space-48);\n    min-width: var(--space-48);\n    padding: 0;\n    color: inherit;\n    background: transparent;\n    border: none;\n    border-radius: var(--radius-md);\n    cursor: pointer;\n  }\n  .shell-burger .shell-burger__bar {\n    display: block;\n    width: var(--space-24);\n    height: var(--space-2);\n    border-radius: var(--radius-sm);\n    background: currentColor;\n    transition: transform 180ms ease-in-out, opacity 180ms ease-in-out;\n  }\n  .shell-burger[aria-expanded=true] .shell-burger__bar:nth-child(1) {\n    transform: translateY(calc(var(--space-2) + var(--space-6))) rotate(45deg);\n  }\n  .shell-burger[aria-expanded=true] .shell-burger__bar:nth-child(2) {\n    opacity: 0;\n  }\n  .shell-burger[aria-expanded=true] .shell-burger__bar:nth-child(3) {\n    transform: translateY(calc(-1 * (var(--space-2) + var(--space-6)))) rotate(-45deg);\n  }\n  .shell-menu {\n    position: absolute;\n    top: 100%;\n    left: 0;\n    right: 0;\n    z-index: 1100;\n    display: none;\n    flex-direction: column;\n    align-items: stretch;\n    gap: var(--space-12);\n    padding: var(--space-8) var(--space-20) var(--space-16);\n    background: var(--color-chrome-bg);\n    border-bottom: 1px solid var(--color-chrome-border);\n  }\n  .shell-menu.shell-menu--open {\n    display: flex;\n  }\n  .shell-menu .shell-nav {\n    flex-direction: column;\n    align-items: stretch;\n    gap: var(--space-4);\n  }\n  .shell-menu .shell-nav a {\n    display: flex;\n    align-items: center;\n    min-height: var(--space-48);\n  }\n  .shell-menu .shell-actions {\n    margin-left: 0;\n    flex-direction: column;\n    align-items: stretch;\n    gap: var(--space-4);\n  }\n  .shell-menu .shell-actions .btn {\n    width: 100%;\n    justify-content: flex-start;\n  }\n  .shell-menu .shell-actions {\n  }\n  .shell-menu .shell-actions .shell-lang {\n    width: 100%;\n  }\n  .shell-menu .shell-actions .shell-lang .btn {\n    flex: 1;\n    justify-content: center;\n  }\n}\n@media (max-width: 900px) and (prefers-reduced-motion: reduce) {\n  .shell-burger__bar {\n    transition: none;\n  }\n}\n/*# sourceMappingURL=page-shell.css.map */\n'] }]
  }], () => [], { a11yDialog: [{ type: i07.ViewChild, args: [i07.forwardRef(() => AccessibilityDialog), { isSignal: true }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i07.\u0275setClassDebugInfo(PageShell, { className: "PageShell", filePath: "src/app/shared/page-shell.ts", lineNumber: 40 });
})();
(() => {
  const id = "src%2Fapp%2Fshared%2Fpage-shell.ts%40PageShell";
  function PageShell_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i07.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i07.\u0275\u0275replaceMetadata(PageShell, m.default, [i07], [AccessibilityDialog, RouterOutlet, RouterLink3, DatePipe, UpperCasePipe, TranslatePipe, Component4, ChangeDetectionStrategy4], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && PageShell_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && PageShell_HmrLoad(d.timestamp)));
})();

// src/app/app.ts
import * as i08 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var App = class _App {
  auth = inject8(AuthStore);
  ngOnInit() {
    void this.auth.init();
  }
  static \u0275fac = function App_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _App)();
  };
  static \u0275cmp = /* @__PURE__ */ i08.\u0275\u0275defineComponent({ type: _App, selectors: [["app-root"]], decls: 2, vars: 0, template: function App_Template(rf, ctx) {
    if (rf & 1) {
      i08.\u0275\u0275element(0, "app-page-shell")(1, "app-consent-banner");
    }
  }, dependencies: [PageShell, ConsentBanner], styles: ["\n[_nghost-%COMP%] {\n  display: block;\n  height: 100dvh;\n}\n/*# sourceMappingURL=app.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i08.\u0275setClassMetadata(App, [{
    type: Component5,
    args: [{ selector: "app-root", imports: [PageShell, ConsentBanner], changeDetection: ChangeDetectionStrategy5.OnPush, template: "<app-page-shell />\n<!-- The first-level data-usage notice (Workstream B). Mounted at the APP\n     ROOT, next to the shell, not inside it: a modal belongs at the root,\n     and as a direct child of <app-root> no shell ancestor can ever box it\n     (an ancestor transform/filter/etc. would become the containing block\n     of its position:fixed overlay) or clip it. The overlay sizes itself to\n     the viewport \u2014 see consent-banner.component.scss. -->\n<app-consent-banner />\n", styles: ["/* src/app/app.scss */\n:host {\n  display: block;\n  height: 100dvh;\n}\n/*# sourceMappingURL=app.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i08.\u0275setClassDebugInfo(App, { className: "App", filePath: "src/app/app.ts", lineNumber: 21 });
})();
(() => {
  const id = "src%2Fapp%2Fapp.ts%40App";
  function App_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i08.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i08.\u0275\u0275replaceMetadata(App, m.default, [i08], [PageShell, ConsentBanner, Component5, ChangeDetectionStrategy5], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && App_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && App_HmrLoad(d.timestamp)));
})();

// src/main.ts
registerLocaleData(etLocale);
registerLocaleData(ruLocale);
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
//# debugId=643a96e7-deb2-570a-8e11-c0025af5f0e5


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tYWluLnRzIiwic3JjL2FwcC9hcHAuY29uZmlnLnRzIiwic3JjL2FwcC9jb3JlL3RpdGxlLnRzIiwic3JjL2FwcC9mZWF0dXJlcy9tYXAvbWFwLXBhZ2UudHMiLCJzcmMvYXBwL2ZlYXR1cmVzL21hcC9tYXAtcGFnZS5odG1sIiwic3JjL2FwcC9hcHAucm91dGVzLnRzIiwic3JjL2FwcC9jb3JlL2FwaS1pbnRlcmNlcHRvci50cyIsInNyYy9hcHAvYXBwLnRzIiwic3JjL2FwcC9hcHAuaHRtbCIsInNyYy9hcHAvc2hhcmVkL2NvbnNlbnQtYmFubmVyLmNvbXBvbmVudC50cyIsInNyYy9hcHAvc2hhcmVkL2NvbnNlbnQtYmFubmVyLmNvbXBvbmVudC5odG1sIiwic3JjL2FwcC9jb3JlL2NvbnNlbnQtc3RvcmUudHMiLCJzcmMvYXBwL3NoYXJlZC9wYWdlLXNoZWxsLnRzIiwic3JjL2FwcC9zaGFyZWQvcGFnZS1zaGVsbC5odG1sIiwic3JjL2FwcC9jb3JlL3RoZW1lLXN0b3JlLnRzIiwic3JjL2FwcC9jb3JlL3RoZW1lLXRva2Vucy50cyIsInNyYy9hcHAvZ2F0ZXdheXMvZGF0YS1zb3VyY2UtZ2F0ZXdheS50cyIsInNyYy9hcHAvc2hhcmVkL2FjY2Vzc2liaWxpdHktZGlhbG9nLmNvbXBvbmVudC50cyIsInNyYy9hcHAvc2hhcmVkL2FjY2Vzc2liaWxpdHktZGlhbG9nLmNvbXBvbmVudC5odG1sIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJlZ2lzdGVyTG9jYWxlRGF0YSB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQgZXRMb2NhbGUgZnJvbSAnQGFuZ3VsYXIvY29tbW9uL2xvY2FsZXMvZXQnO1xuaW1wb3J0IHJ1TG9jYWxlIGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi9sb2NhbGVzL3J1JztcbmltcG9ydCB7IGJvb3RzdHJhcEFwcGxpY2F0aW9uIH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlcic7XG5pbXBvcnQgeyBhcHBDb25maWcgfSBmcm9tICcuL2FwcC9hcHAuY29uZmlnJztcbmltcG9ydCB7IEFwcCB9IGZyb20gJy4vYXBwL2FwcCc7XG5cbi8vIGkxOG4tZXQtZW46IHJlZ2lzdGVyIHRoZSBub24tRW5nbGlzaCBsb2NhbGUgZGF0YSBzbyB0aGUgYGRhdGVgIHBpcGVcbi8vIGZvcm1hdHMgZGF0ZXMgbmF0aXZlbHkgd2hlbiB0aGUgYXBwIGxvY2FsZSBpcyBgZXRgIG9yIGBydWAgKHRoZSBzaGVsbFxuLy8gZm9vdGVyJ3MgbGFzdC1pbXBvcnQgc3RhbXAgYW5kIHRoZSAvYWNjb3VudCBjb250cmlidXRpb24gZGF0ZXMgZm9sbG93XG4vLyB0aGUgYWN0aXZlIGxvY2FsZSkuXG5yZWdpc3RlckxvY2FsZURhdGEoZXRMb2NhbGUpO1xucmVnaXN0ZXJMb2NhbGVEYXRhKHJ1TG9jYWxlKTtcblxuYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwLCBhcHBDb25maWcpLmNhdGNoKChlcnIpID0+IGNvbnNvbGUuZXJyb3IoZXJyKSk7XG4iLCJpbXBvcnQgeyBBcHBsaWNhdGlvbkNvbmZpZywgcHJvdmlkZUJyb3dzZXJHbG9iYWxFcnJvckxpc3RlbmVycyB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgcHJvdmlkZUh0dHBDbGllbnQsIHdpdGhJbnRlcmNlcHRvcnMgfSBmcm9tICdAYW5ndWxhci9jb21tb24vaHR0cCc7XG5pbXBvcnQgeyBwcm92aWRlUm91dGVyIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IHJvdXRlcyB9IGZyb20gJy4vYXBwLnJvdXRlcyc7XG5pbXBvcnQgeyBhcGlJbnRlcmNlcHRvciB9IGZyb20gJy4vY29yZS9hcGktaW50ZXJjZXB0b3InO1xuXG5leHBvcnQgY29uc3QgYXBwQ29uZmlnOiBBcHBsaWNhdGlvbkNvbmZpZyA9IHtcbiAgcHJvdmlkZXJzOiBbXG4gICAgcHJvdmlkZUJyb3dzZXJHbG9iYWxFcnJvckxpc3RlbmVycygpLFxuICAgIHByb3ZpZGVSb3V0ZXIocm91dGVzKSxcbiAgICBwcm92aWRlSHR0cENsaWVudCh3aXRoSW50ZXJjZXB0b3JzKFthcGlJbnRlcmNlcHRvcl0pKSxcbiAgXSxcbn07XG4iLCJpbXBvcnQgeyBpbmplY3QgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFRpdGxlIH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlcic7XG5pbXBvcnQgdHlwZSB7IENhbkFjdGl2YXRlRm4gfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHsgSTE4blNlcnZpY2UgfSBmcm9tICcuL2kxOG4vaTE4bi5zZXJ2aWNlJztcbmltcG9ydCB0eXBlIHsgTWVzc2FnZUtleSB9IGZyb20gJy4vaTE4bi9tZXNzYWdlcyc7XG5cbi8qKiBCcmFuZCBwYXJ0IG9mIGV2ZXJ5IGRvY3VtZW50IHRpdGxlIChicm93c2VyIHRhYikg4oCUIGEgcHJvcGVyIG5vdW4sXG4gICAgbmV2ZXIgdHJhbnNsYXRlZC4gKi9cbmV4cG9ydCBjb25zdCBBUFBfTkFNRSA9ICdPcGVuU2hlbHRlcic7XG5cbi8qKlxuICogUm91dGUtdGl0bGUgZ3VhcmQgKGkxOG4tZXQtZW4pOiBzZXRzIGBkb2N1bWVudC50aXRsZWAgZnJvbSB0aGUgcm91dGUnc1xuICogYGRhdGEudGl0bGVgIE1FU1NBR0UgS0VZIG9uIGV2ZXJ5IGFjdGl2YXRpb24sIHJlc29sdmVkIHRocm91Z2ggdGhlIGFjdGl2ZVxuICogbG9jYWxlIOKAlCBvbmUgc21hbGwgbmF2aWdhdGlvbiBoYW5kbGVyIGluc3RlYWQgb2YgZWFjaCBwYWdlIGltcG9ydGluZ1xuICogVGl0bGUuIFwidGl0bGUubWFwXCIgLT4gXCJTaGVsdGVyIG1hcCDigJQgT3BlblNoZWx0ZXJcIlxuICogKGVuKSAvIFwiVmFyanVwYWlrYWRlIGthYXJ0IOKAlCBPcGVuU2hlbHRlclwiIChldCkuXG4gKlxuICogYGRhdGEudGl0bGVgIGlzIGEga2V5IG9mIHRoZSBzaGFyZWQgYE1lc3NhZ2VzYCBjYXRhbG9nIChub3QgZnJlZSB0ZXh0KVxuICog4oCUIHRpdGxlLnNwZWMudHMgY2hlY2tzIGV2ZXJ5IHJvdXRhYmxlIHRpdGxlIGFnYWluc3QgQk9USCBjYXRhbG9ncywgc28gYVxuICogbmV3IHJvdXRlIGNhbm5vdCBzaGlwIHdpdGhvdXQgYSB0YWIgdGl0bGUgaW4gZWl0aGVyIGxhbmd1YWdlLiBSb3V0ZXNcbiAqIHdpdGhvdXQgYSB0aXRsZSBhcmUgbGVmdCB1bnRvdWNoZWQgKGUuZy4gdGhlIGluaXRpYWwgZG9jdW1lbnQgdGl0bGVcbiAqIGZyb20gaW5kZXguaHRtbCBiZWZvcmUgZmlyc3QgbmF2aWdhdGlvbikuXG4gKlxuICogVGhlIHRpdGxlIGlzIHBlci1uYXZpZ2F0aW9uOiBzd2l0Y2hpbmcgdGhlIGxvY2FsZSB1cGRhdGVzIHRoZSBjaHJvbWVcbiAqIGltbWVkaWF0ZWx5IGJ1dCB0aGUgdGFiIHRpdGxlIHBpY2tzIHRoZSBuZXcgbGFuZ3VhZ2Ugb24gdGhlIG5leHRcbiAqIGFjdGl2YXRpb24uXG4gKlxuICogTGF6eSBjYXRhbG9ncyAoYnVuZGxlLWxhenktaTE4bik6IHdpdGggYSBzdG9yZWQgbm9uLWRlZmF1bHQgcHJlZmVyZW5jZVxuICogKG9yIGEganVzdC1jbGlja2VkIHN3aXRjaGVyKSwgdGhlIGFjdGl2ZSBsb2NhbGUncyBjaHVuayBtYXkgc3RpbGwgYmVcbiAqIGxvYWRpbmcgd2hlbiB0aGUgZ3VhcmQgcnVucy4gVGhlIGd1YXJkIHRoZXJlZm9yZSBzZXRzIHRoZSB0aXRsZSBpbiB0aGVcbiAqIEJFU1QgQVZBSUxBQkxFIGxhbmd1YWdlIChgdCgpYCBzZXJ2ZXMgdGhlIGRlZmF1bHQgbG9jYWxlIHdoaWxlIHRoZVxuICogY2F0YWxvZyBpcyBpbiBmbGlnaHQg4oCUIG5ldmVyIGEgcmF3IGtleSkgYW5kIHJlLXJlc29sdmVzIE9OQ0Ugd2hlbiB0aGVcbiAqIGNodW5rIGxhbmRzLiBEZWxpYmVyYXRlbHkgTk9UIGFuIGBhd2FpdGA6IGJsb2NraW5nIGZpcnN0IG5hdmlnYXRpb24gb25cbiAqIHRoZSBjaHVuayBmZXRjaCB3b3VsZCBkZWxheSBmaXJzdCBwYWludCBmb3Igbm9uLWRlZmF1bHQtbG9jYWxlIHVzZXJzLlxuICogVGhlIHByZS1wYWludCBgPHRpdGxlPmAgaW4gaW5kZXguaHRtbCAodGhlIGJyYW5kIG5hbWUg4oCUIGEgcHJvcGVyIG5vdW5cbiAqIG5vIGxvY2FsZSB0cmFuc2xhdGVzKSBpcyB1bnRvdWNoZWQgYnkgYWxsIG9mIHRoaXMuXG4gKi9cbmV4cG9ydCBjb25zdCB0aXRsZUd1YXJkOiBDYW5BY3RpdmF0ZUZuID0gKHJvdXRlKSA9PiB7XG4gIGNvbnN0IHRpdGxlID0gcm91dGUuZGF0YVsndGl0bGUnXTtcbiAgaWYgKHR5cGVvZiB0aXRsZSA9PT0gJ3N0cmluZycgJiYgdGl0bGUubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGkxOG4gPSBpbmplY3QoSTE4blNlcnZpY2UpO1xuICAgIGNvbnN0IHRpdGxlU2VydmljZSA9IGluamVjdChUaXRsZSk7XG4gICAgY29uc3Qga2V5ID0gdGl0bGUgYXMgTWVzc2FnZUtleTtcbiAgICBjb25zdCBhcHBseSA9ICgpOiB2b2lkID0+IHtcbiAgICAgIHRpdGxlU2VydmljZS5zZXRUaXRsZShgJHtpMThuLnQoa2V5KX0g4oCUICR7QVBQX05BTUV9YCk7XG4gICAgfTtcbiAgICBhcHBseSgpO1xuICAgIC8vIFJlLXJlc29sdmUgb25jZSB3aGVuIHRoZSBhY3RpdmUgbG9jYWxlJ3MgY2F0YWxvZyBsYW5kcyAoaW1tZWRpYXRlXG4gICAgLy8gbm8tb3AgcmUtYXBwbHkgd2hlbiBpdCBpcyBhbHJlYWR5IGluIG1lbW9yeSDigJQgdGhlIGRlZmF1bHQgbG9jYWxlXG4gICAgLy8gYWx3YXlzIGlzLCBzbyB0aGUgZGVmYXVsdCBwYXRoIGlzIGJ5dGUtaWRlbnRpY2FsIHRvIGJlZm9yZSkuXG4gICAgaTE4bi5vbkNhdGFsb2dMb2FkZWQoYXBwbHkpO1xuICB9XG4gIHJldHVybiB0cnVlO1xufTtcbiIsImltcG9ydCB7XG4gIHR5cGUgQWZ0ZXJWaWV3SW5pdCxcbiAgYWZ0ZXJOZXh0UmVuZGVyLFxuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ29tcG9uZW50LFxuICBjb21wdXRlZCxcbiAgdHlwZSBFbGVtZW50UmVmLFxuICBFbnZpcm9ubWVudEluamVjdG9yLFxuICBpbmplY3QsXG4gIHR5cGUgT25EZXN0cm95LFxuICBzaWduYWwsXG4gIHZpZXdDaGlsZCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBOZ0NsYXNzIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7IFJvdXRlckxpbmsgfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHsgSTE4blNlcnZpY2UgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJztcbmltcG9ydCB7IFRyYW5zbGF0ZVBpcGUgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vdHJhbnNsYXRlLXBpcGUnO1xuaW1wb3J0IHR5cGUgeyBNZXNzYWdlS2V5IH0gZnJvbSAnLi4vLi4vY29yZS9pMThuL21lc3NhZ2VzJztcbmltcG9ydCB0eXBlIHtcbiAgT3BlblN0YXR1c0R0byxcbiAgUmV2aWV3U3RhdHVzLFxuICBTaGVsdGVyRHRvLFxuICBTaGVsdGVyT2NjdXBhbmN5LFxuICBTaGVsdGVyU291cmNlLFxuICBTaGVsdGVyU291cmNlRmlsdGVyLFxuICBTaGVsdGVyVHJ1c3RGaWx0ZXIsXG4gIEdlb2NvZGVSZXN1bHQsXG59IGZyb20gJy4uLy4uL2NvcmUvbW9kZWxzJztcbmltcG9ydCB7IFNoZWx0ZXJHYXRld2F5IH0gZnJvbSAnLi4vLi4vZ2F0ZXdheXMvc2hlbHRlci1nYXRld2F5JztcbmltcG9ydCB7IEdlb2NvZGVHYXRld2F5IH0gZnJvbSAnLi4vLi4vZ2F0ZXdheXMvZ2VvY29kZS1nYXRld2F5JztcbmltcG9ydCB7IHRvQXBpRXJyb3IgfSBmcm9tICcuLi8uLi9jb3JlL2FwaS1lcnJvcic7XG5pbXBvcnQgeyBBdXRoU3RvcmUgfSBmcm9tICcuLi8uLi9zZXNzaW9uL2F1dGgtc3RvcmUnO1xuaW1wb3J0IHsgQmFubmVyQ29tcG9uZW50IH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Jhbm5lci5jb21wb25lbnQnO1xuaW1wb3J0IHsgTGlzdFN0YXRlIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2xpc3Qtc3RhdGUnO1xuaW1wb3J0IHsgTG9hZGluZ0luZGljYXRvciB9IGZyb20gJy4uLy4uL3NoYXJlZC9sb2FkaW5nLWluZGljYXRvcic7XG5pbXBvcnQge1xuICBpc1ByaXZhdGVMb2NhdGlvbixcbiAgaGFzUmVwb3J0cyBhcyBoYXNSZXBvcnRzU2hhcmVkLFxuICBoYXNUcnVzdEJhZGdlcyBhcyBoYXNUcnVzdEJhZGdlc1NoYXJlZCxcbiAgb2NjdXBhbmN5VGV4dCBhcyBvY2N1cGFuY3lUZXh0U2hhcmVkLFxuICBvcGVuU3RhdHVzQmFkZ2VUZXh0IGFzIG9wZW5TdGF0dXNCYWRnZVRleHRTaGFyZWQsXG4gIGlzT3BlblJvdyBhcyBpc09wZW5Sb3dTaGFyZWQsXG4gIHNvdXJjZVRydXN0TGFiZWwgYXMgc291cmNlVHJ1c3RMYWJlbFNoYXJlZCxcbiAgY29tbXVuaXR5QmFkZ2VDbGFzcyBhcyBjb21tdW5pdHlCYWRnZUNsYXNzU2hhcmVkLFxuICByZXBvcnRlZEJhZGdlVGV4dCBhcyByZXBvcnRlZEJhZGdlVGV4dFNoYXJlZCxcbiAgc3RyYWlnaHRMaW5lVGV4dCxcbn0gZnJvbSAnLi4vLi4vc2hhcmVkL3NoZWx0ZXItY29weSc7XG5pbXBvcnQgeyBiYW5uZXJNZXNzYWdlIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Vycm9yLWNvcHknO1xuaW1wb3J0IHtcbiAgRVNUT05JQV9DRU5URVIsXG4gIEVTVE9OSUFfWk9PTSxcbiAgTGVhZmxldFNlcnZpY2UsXG4gIFNIRUxURVJfWk9PTSxcbn0gZnJvbSAnLi4vLi4vc2hhcmVkL2xlYWZsZXQtc2VydmljZSc7XG5pbXBvcnQge1xuICBnZXRDdXJyZW50UG9zaXRpb25IaWdoQWNjdXJhY3ksXG4gIEdlb2xvY2F0aW9uRXJyb3IsXG4gIHR5cGUgR2VvbG9jYXRpb25GYWlsdXJlS2luZCxcbiAgaGF2ZXJzaW5lS20sXG59IGZyb20gJy4uLy4uL3NoYXJlZC9nZW9sb2NhdGlvbic7XG5cbi8qKiBUaGUgdGhyZWUgc291cmNlLWZpbHRlciBjaGlwcyAoc2VydmVyLXNpZGUgYD9zb3VyY2U9YCByZWZldGNoLCBkZXNpZ24gNCkuXG4gKiAgYHZhbHVlYCBpcyB0aGUgQVBJIHBhcmFtIChuZXZlciB0cmFuc2xhdGVkKTsgdGhlIGxhYmVsIGlzIGEgbWVzc2FnZSBrZXlcbiAqICByZXNvbHZlZCB0aHJvdWdoIHRoZSBgdGAgcGlwZSBpbiB0aGUgdGVtcGxhdGUgKGkxOG4tZXQtZW4pLiAqL1xuY29uc3QgU09VUkNFX0ZJTFRFUlM6IHsgdmFsdWU6IFNoZWx0ZXJTb3VyY2VGaWx0ZXI7IGxhYmVsS2V5OiBNZXNzYWdlS2V5IH1bXSA9IFtcbiAgeyB2YWx1ZTogJ0FMTCcsIGxhYmVsS2V5OiAnbWFwLmZpbHRlci5hbGwnIH0sXG4gIHsgdmFsdWU6ICdSRUdJU1RSWScsIGxhYmVsS2V5OiAnbWFwLmZpbHRlci5yZWdpc3RyeScgfSxcbiAgeyB2YWx1ZTogJ1VTRVInLCBsYWJlbEtleTogJ21hcC5maWx0ZXIudXNlcicgfSxcbl07XG5cbi8qKlxuICogTWVzc2FnZSBrZXlzIGZvciB0aGUgXCJOZWFyZXN0IHNoZWx0ZXJcIiBhY3Rpb24ncyBpbmxpbmUgZXJyb3JzXG4gKiAobWFwLWNyaXNpcy1hY3Rpb25zIEQyKSwgcmVzb2x2ZWQgdGhyb3VnaCB0aGUgYHRgIHBpcGUgaW4gdGhlIHRlbXBsYXRlXG4gKiAoaTE4bi1ldC1lbikuIFRoZSB2b2NhYnVsYXJ5IG1pcnJvcnMgdGhlIC9zdWJtaXQgZ2VvbG9jYXRpb25cbiAqIGVycm9yczsgdGhlIHR3byBwYWdlcyBrZWVwIGRpdmVyZ2VudCBjb3B5IG9uIHB1cnBvc2UsIHNvIHRoaXMgbGlzdCBzdGF5c1xuICogcGFnZS1sb2NhbC4gVGhlIG1hcCBwYWdlIGhhcyBubyBtYXAtcGljayBvciBsaW5rIGZhbGxiYWNrLCBvbmx5IGEgcmV0cnkuXG4gKi9cbmNvbnN0IE5FQVJFU1RfS0VZOiBSZWNvcmQ8R2VvbG9jYXRpb25GYWlsdXJlS2luZCwgTWVzc2FnZUtleT4gPSB7XG4gIGRlbmllZDogJ21hcC5uZWFyZXN0LmRlbmllZCcsXG4gIHRpbWVvdXQ6ICdtYXAubmVhcmVzdC50aW1lb3V0JyxcbiAgdW5zdXBwb3J0ZWQ6ICdtYXAubmVhcmVzdC51bnN1cHBvcnRlZCcsXG4gIHVuYXZhaWxhYmxlOiAnbWFwLm5lYXJlc3QudW5hdmFpbGFibGUnLFxuICBpbnNlY3VyZTogJ21hcC5uZWFyZXN0Lmluc2VjdXJlJyxcbn07XG5cbi8qKiBUaGUgaW5saW5lIHN0YXRlcyBvZiB0aGUgYWRkcmVzcyBzZWFyY2ggKGxvY2F0aW9uLW5hdmlnYXRpb24pLiBUaGVcbiAqICBjb3B5IG1pcnJvcnMgdGhlIC9zdWJtaXQgcGFnZSdzIEdFT0NPREVfRVJST1JfS0VZIHJhdGhlciB0aGFuIHNoYXJpbmcgaXQsXG4gKiAgc2luY2UgdGhlIHR3byBwYWdlcyBrZWVwIHRoZWlyIG93biBjb3B5IG9uIHB1cnBvc2U7IHRoZSB0cmFpbGluZ1xuICogIGFsdGVybmF0aXZlcyBkaWZmZXIgYmVjYXVzZSB0aGUgYnJvd3NlIHBhZ2UgaGFzIG5vIG1hcC1waWNrIG9yIGxpbmtcbiAqICBmYWxsYmFjayAoaXRzIGFsdGVybmF0aXZlIGlzIHRoZSBnZW9sb2NhdGlvbiBDVEEpLiBBIGZhaWxlZCBzZWFyY2hcbiAqICBjaGFuZ2VzIG5vdGhpbmcgZWxzZTogbm8gYW5jaG9yLCBubyBwaW4sIGxpc3QgdW50b3VjaGVkLiAqL1xudHlwZSBHZW9jb2RlRXJyb3JLaW5kID0gJ25vLXJlc3VsdHMnIHwgJ3JhdGUtbGltaXRlZCcgfCAnbmV0d29yayc7XG5cbi8qKiBNZXNzYWdlIGtleXMgZm9yIHRoZSBpbmxpbmUgYWRkcmVzcy1zZWFyY2ggZmFpbHVyZXMgKGxvY2F0aW9uLW5hdmlnYXRpb24pO1xuICogIHJlc29sdmVkIHRocm91Z2ggdGhlIGB0YCBwaXBlIChpMThuLWV0LWVuKS4gVGhlIC9zdWJtaXRcbiAqICBtaXJyb3Igc3RheXMgcGFnZS1sb2NhbCBmb3IgdGhlIHNhbWUgcmVhc29uLiAqL1xuY29uc3QgR0VPQ09ERV9FUlJPUl9LRVk6IFJlY29yZDxHZW9jb2RlRXJyb3JLaW5kLCBNZXNzYWdlS2V5PiA9IHtcbiAgJ25vLXJlc3VsdHMnOiAnbWFwLmdlb2NvZGUubm9SZXN1bHRzJyxcbiAgJ3JhdGUtbGltaXRlZCc6ICdtYXAuZ2VvY29kZS5yYXRlTGltaXRlZCcsXG4gIG5ldHdvcms6ICdtYXAuZ2VvY29kZS5uZXR3b3JrJyxcbn07XG5cbi8qKiBOZWlnaGJvdXJob29kIHNjYWxlIGZvciB0aGUgYW5jaG9yIGZseTogdGhlIGFuY2hvciBpcyBhXG4gKiAgc2VhcmNoZWQgQUREUkVTUywgbm90IGEgc2hlbHRlciDigJQgU0hFTFRFUl9aT09NIDE2IHdvdWxkIGhpZGUgdGhlXG4gKiAgc3Vycm91bmRpbmdzIHRoZSBzZWFyY2ggZXhpc3RzIHRvIGNvbXBhcmUuICovXG5jb25zdCBBTkNIT1JfWk9PTSA9IDE0O1xuXG4vKiogUmVnaW9uYWwgc2NhbGUgZm9yIHRoZSBhcm91bmQteW91IGZseSAob3duZXIgZGVjaXNpb24pOiB0aGUgbWFwIHNob3dzXG4gKiAgdGhlIE5FSUdIQk9VUkhPT0QgYXJvdW5kIHRoZSB1c2VyJ3Mgb3duIHBvc2l0aW9uIOKAlCBub3QgYSBzaW5nbGVcbiAqICBzaGVsdGVyJ3Mgc3RyZWV0LiBTYW1lIHNjYWxlIGFzIHRoZSBhbmNob3IgZmx5LCBzZXBhcmF0ZSBpbnRlbnQuICovXG5jb25zdCBBUk9VTkRfWk9PTSA9IDE0O1xuXG4vKiogVGhlIGNsb3Nlc3Qgcm93IHRvIGEgcG9pbnQgKG9yIG51bGwgZm9yIGFuIGVtcHR5IGxpc3QpICsgaXRzIGRpc3RhbmNlLlxuICogIFRoZSBwb2ludCBpcyBhbiBPUklHSU4g4oCUIHRoZSB1c2VyJ3MgZ2VvbG9jYXRpb24gZml4IG9yIHRoZSBnZW9jb2RlZFxuICogIGFkZHJlc3MgYW5jaG9yIOKAlCBhbmQgdGhlIGRpc3RhbmNlIGlzIHRoZSBIYXZlcnNpbmUgc3RyYWlnaHQgbGluZSB0byB0aGVcbiAqICByb3cncyBjb29yZGluYXRlcy4gU2VlIHRoZSBjb21wb25lbnQgZG9jIGNvbW1lbnQncyBcIkRpc3RhbmNlIG51bWJlcnNcIlxuICogIHNlY3Rpb24gZm9yIHRoZSBmdWxsIHJ1bGUgKHR3byBwb2ludHMgLyBmb3JtdWxhIC8gem9vbSAvIG1lYW5pbmcpLiAqL1xuZnVuY3Rpb24gbmVhcmVzdFNoZWx0ZXJBdChcbiAgbGF0aXR1ZGU6IG51bWJlcixcbiAgbG9uZ2l0dWRlOiBudW1iZXIsXG4gIHJvd3M6IFNoZWx0ZXJEdG9bXSxcbik6IHsgcm93OiBTaGVsdGVyRHRvOyBrbTogbnVtYmVyIH0gfCBudWxsIHtcbiAgbGV0IGJlc3Q6IFNoZWx0ZXJEdG8gfCBudWxsID0gbnVsbDtcbiAgbGV0IGJlc3RLbSA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xuICAgIGNvbnN0IGttID0gaGF2ZXJzaW5lS20obGF0aXR1ZGUsIGxvbmdpdHVkZSwgcm93LmxhdGl0dWRlLCByb3cubG9uZ2l0dWRlKTtcbiAgICBpZiAoa20gPCBiZXN0S20pIHtcbiAgICAgIGJlc3RLbSA9IGttO1xuICAgICAgYmVzdCA9IHJvdztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJlc3QgPT09IG51bGwgPyBudWxsIDogeyByb3c6IGJlc3QsIGttOiBiZXN0S20gfTtcbn1cblxuLyoqXG4gKiBQdWJsaWMgaG9tZSBmb3Igc2lnbmVkLW91dC9zaWduZWQtaW4gdXNlcnM6ICcvbWFwJyAoYW5kICcvJywgdGhlIGRlZmF1bHRcbiAqIHJvdXRlKS4gVGhlIHJlYWQtb25seSBzaGVsdGVyIGJyb3dzZSBleHBlcmllbmNlOiBhIExlYWZsZXQgbWFwIHdpdGhcbiAqIGRpdkljb24gbWFya2VycyB0b25lZCBieSB0aGUgdHJ1c3QgcGFsZXR0ZSAoY29tbXVuaXR5LXJldmlldy1xdWV1ZSBENTpcbiAqIHJlZ2lzdHJ5IGJsdWUsIGNvbW11bml0eSBORVcgYW1iZXIsIGNvbW11bml0eSBDT05GSVJNRUQgZ3JlZW4sIHBsdXMgdGhlXG4gKiByZXBvcnRlZC1zdGF0ZSBvcmFuZ2Ugb3ZlcnJpZGUpICsgYSBzaWRlYmFyIGxpc3QsIHNvdXJjZS1maWx0ZXIgY2hpcHNcbiAqIHRoYXQgcmVmZXRjaCBzZXJ2ZXItc2lkZSwgdGhlIHByYWN0aWNhbCBmaWx0ZXIgY2hpcHMgKFwiT3BlblwiIC9cbiAqIFwiSGFzIGNhcGFjaXR5XCIg4oCUIHNlZSB0aGUgRmlsdGVycyBub3RlIGJlbG93KSwgYSBsZWdlbmQsIGFuZFxuICogbG9hZGluZy9lbXB0eS9lcnJvciBzdGF0ZXMuXG4gKlxuICogVGhpbiBzaGVsbCAoMDEtVEFTSy5tZCDCpzcpOiBzdGF0ZSBpbiBzaWduYWxzLCBidXNpbmVzcyBiZWhhdmlvdXIgZGVsZWdhdGVkIOKAlFxuICogdGhlIGdhdGV3YXkgb3ducyB0aGUgQVBJLCBMZWFmbGV0U2VydmljZSBvd25zIHRoZSBtYXAuIExlYWZsZXRTZXJ2aWNlIGlzXG4gKiBwYWdlLXNjb3BlZCAob25lIGluc3RhbmNlIHBlciB2aXNpdCwgZGVzaWduIGRlY2lzaW9uIDMpIGFuZCBkZXN0cm95ZWQgaW5cbiAqIG5nT25EZXN0cm95IHNvIG5vIG1hcCBvciBsaXN0ZW5lciBsZWFrcyBiZXR3ZWVuIHZpc2l0cyAoem9uZWxlc3MgaGFzIG5vXG4gKiBzYWZldHkgbmV0KS5cbiAqXG4gKiBEaXN0YW5jZSBudW1iZXJzIChNOCDigJQgdGhlIFwi4omIIE4gbSAvIGttIHN0cmFpZ2h0IGxpbmVcIiBmaWd1cmVzKTpcbiAqIFdISUNIIFRXTyBQT0lOVFMg4oCUXG4gKiAgIDEuIEFyb3VuZC15b3UgKFwiU2hvdyBzaGVsdGVycyBhcm91bmQgeW91XCIgQ1RBKTogdGhlIHVzZXIncyBCUk9XU0VSXG4gKiAgICAgIGdlb2xvY2F0aW9uIGZpeCAob25lLXNob3QgaGlnaC1hY2N1cmFjeSByZXF1ZXN0LCBzaGFyZWQvXG4gKiAgICAgIGdlb2xvY2F0aW9uLnRzKSBhbmQgdGhlIGNvb3JkaW5hdGVzIG9mIGVhY2ggbGlzdGVkIHNoZWx0ZXIgKHRoZVxuICogICAgICBEVE8ncyBXR1M4NCBkZWNpbWFsIGRlZ3JlZXMpLiBUaGUgb25lLWxpbmUgcmVzdWx0IG1lYXN1cmVzIHRvIHRoZVxuICogICAgICBORUFSRVNUIGxvYWRlZCByb3cuXG4gKiAgIDIuIEFkZHJlc3MgYW5jaG9yIChcIkZpbmQgc2hlbHRlcnMgbmVhciBhbiBhZGRyZXNzXCIgc2VhcmNoKTogdGhlXG4gKiAgICAgIEdFT0RFQ09ERUQgYWRkcmVzcyBwb2ludCAodGhlIHNlbGVjdGVkIE5vbWluYXRpbSByZXN1bHQpIGFuZCBlYWNoXG4gKiAgICAgIHNoZWx0ZXIncyBjb29yZGluYXRlcyDigJQgZXZlcnkgcm93J3MgXCLiiYggTiBtIHN0cmFpZ2h0IGxpbmVcIiBmaWd1cmVcbiAqICAgICAgaXMgYW5jaG9yIOKGkiB0aGF0IHJvdy4gXCLiiYggMjIyIG1cIiB0aGVyZWZvcmUgYW5zd2VycyBcImZyb20gd2hhdFwiOlxuICogICAgICB0aGUgb3JpZ2luICh0aGUgc2VhcmNoZWQgYWRkcmVzcykgY2FycmllcyBpdHMgb3duIG1hcmtlciBvbiB0aGVcbiAqICAgICAgbWFwIOKAlCB0aGUgdGVhbCBkaWFtb25kIChgLnNoZWx0ZXItbWFya2VyLS1hbmNob3JgLCAxMiBweCwgbGVnZW5kXG4gKiAgICAgIGVudHJ5LCBhY2Nlc3NpYmxlIG5hbWUgXCJTZWFyY2hlZCBhZGRyZXNzXCIpLCBkaXN0aW5jdCBmcm9tIHRoZVxuICogICAgICBjaXJjbGUgc2hlbHRlciBtYXJrZXJzIG9uIHNoYXBlLCBub3QgY29sb3VyIGFsb25lIOKAlCBhbmQgdGhlIHJvd3NcbiAqICAgICAgbWVhc3VyZSBmcm9tIGl0LlxuICogRk9STVVMQSDigJQgSGF2ZXJzaW5lIGdyZWF0LWNpcmNsZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gV0dTODRcbiAqICAgcG9pbnRzLCBFYXJ0aCByYWRpdXMgNjM3MSBrbSAoYGhhdmVyc2luZUttYCwgc2hhcmVkL2dlb2xvY2F0aW9uLnRzKSxcbiAqICAgY29tcHV0ZWQgQ0xJRU5ULVNJREUgb3ZlciB0aGUgYWxyZWFkeS1sb2FkZWQgcm93czogbm8gYmFja2VuZCBjYWxsLFxuICogICBubyBJUCBnZW9sb2NhdGlvbiwgdGhlIHBvaW50cyBuZXZlciBsZWF2ZSB0aGUgZGV2aWNlLlxuICogWk9PTSDigJQgdGhlIG51bWJlciBpcyBhIHByb3BlcnR5IG9mIHRoZSB0d28gcG9pbnRzLCBub3Qgb2YgdGhlIHZpZXc6IGl0XG4gKiAgIGRvZXMgbm90IGNoYW5nZSB3aXRoIHpvb20uIFRoZSBjYW1lcmEgZmxpZXMgdG8gdGhlIE9SSUdJTiAodGhlIHVzZXJcbiAqICAgZml4IC8gdGhlIHNlYXJjaGVkIGFkZHJlc3MpIGF0IG5laWdoYm91cmhvb2Qgc2NhbGUgKEFST1VORF9aT09NIC9cbiAqICAgQU5DSE9SX1pPT00gMTQpIOKAlCBuZXZlciB0byBhIHNoZWx0ZXI7IHNlbGVjdGluZyBhIHJvdyBpcyBhIHNlcGFyYXRlXG4gKiAgIHN0ZXAgdGhhdCBmbGllcyB0byB0aGF0IHNoZWx0ZXIgYXQgU0hFTFRFUl9aT09NIDE2LlxuICogV0hBVCBUSEUgTlVNQkVSIE1FQU5TIFRPIFRIRSBVU0VSIOKAlCBhbiBhcHByb3hpbWF0ZSBTVFJBSUdIVCBMSU5FIG92ZXJcbiAqICAgdGhlIGVhcnRoJ3Mgc3VyZmFjZTogbmV2ZXIgYSB3YWxraW5nL2RyaXZpbmcgcm91dGUsIG5ldmVyIGFuIG9mZmljaWFsXG4gKiAgIGRpc3RhbmNlIChENiBkaXN0YW5jZSBob25lc3R5KS4gVGhlIFwi4omIXCIgaXMgdGhlIGhvbmVzdHkgbWFya2VyOyBhdCBhXG4gKiAgIGZldyBodW5kcmVkIG1ldHJlcyB0aGUgcm91dGUtdnMtbGluZSBkaWZmZXJlbmNlIGlzIG5lZ2xpZ2libGUsIGJ1dFxuICogICB0aGUgY29weSBuZXZlciBjbGFpbXMgYSByb3V0ZS4gQ2Fub25pY2FsIHdyaXRlLXVwOiBmcm9udGVuZC9kb2NzL1xuICogICBhZ2VudC8wNS1DT05URVhULU1BUC5tZCwgXCJEaXN0YW5jZSBudW1iZXJzXCIgc2VjdGlvbi5cbiAqXG4gKiBGaWx0ZXJzOiB0aGUgc291cmNlIGNoaXBzIHJlZmV0Y2ggc2VydmVyLXNpZGUgKGA/c291cmNlPWApOyB0aGVcbiAqIHByYWN0aWNhbCBjaGlwcyBhcmUgXCJPcGVuXCIgKGNsaWVudC1zaWRlIOKAlCB0aGUgQkUgaGFzIG5vIG9wZW4vY2xvc2VkXG4gKiBwYXJhbSwgaXQgZmlsdGVycyB0aGUgbG9hZGVkIGxpc3QgKyByZS1yZW5kZXJzIHRoZSBtYXJrZXJzKSBhbmRcbiAqIFwiSGFzIGNhcGFjaXR5XCIgKHNlcnZlci1zaWRlIGA/aGFzQ2FwYWNpdHk9YCkuIEFsbCBjb21wb3NhYmxlLlxuICogU2VsZWN0aW9uICYgem9vbSAoZGVzaWduIGRlY2lzaW9uIDUpOiBhIHNoYXJlZCBzZWxlY3RlZElkIHNpZ25hbCDigJQgYSByb3dcbiAqIGNsaWNrIE9SIGEgbWFya2VyIGNsaWNrIFNFTEVDVFMgdGhlIHNoZWx0ZXIgYW5kIGZsaWVzIHRoZSBtYXAgdG8gaXQgYXRcbiAqIHN0cmVldCBsZXZlbCAoU0hFTFRFUl9aT09NKS4gVGhlIHVzZXIgU1RBWVMgb24gL21hcDogdGhlIHpvb20gaXMgdGhlXG4gKiBwYXlvZmYgb2YgdGhlIGNsaWNrLCBub3QgYSBuYXZpZ2F0aW9uLiBPcGVuaW5nIHRoZSBmdWxsIC9zaGVsdGVycy97aWR9XG4gKiBwYWdlIGlzIGEgc2VwYXJhdGUgZXhwbGljaXQgc3RlcCDigJQgdGhlIHNlbGVjdGVkIHJvdyBncm93cyBhIFwiVmlld1xuICogZGV0YWlsc1wiIGxpbmssIHRoZSBvbmx5IHNpZGViYXIgZWxlbWVudCB0aGF0IG5hdmlnYXRlcy5cbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYXBwLW1hcC1wYWdlJyxcbiAgaW1wb3J0czogW05nQ2xhc3MsIFJvdXRlckxpbmssIEJhbm5lckNvbXBvbmVudCwgTGlzdFN0YXRlLCBMb2FkaW5nSW5kaWNhdG9yLCBUcmFuc2xhdGVQaXBlXSxcbiAgcHJvdmlkZXJzOiBbTGVhZmxldFNlcnZpY2VdLFxuICB0ZW1wbGF0ZVVybDogJy4vbWFwLXBhZ2UuaHRtbCcsXG4gIHN0eWxlVXJsOiAnLi9tYXAtcGFnZS5zY3NzJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIE1hcFBhZ2UgaW1wbGVtZW50cyBBZnRlclZpZXdJbml0LCBPbkRlc3Ryb3kge1xuICBwcml2YXRlIHJlYWRvbmx5IGdhdGV3YXkgPSBpbmplY3QoU2hlbHRlckdhdGV3YXkpO1xuICBwcml2YXRlIHJlYWRvbmx5IGdlb2NvZGUgPSBpbmplY3QoR2VvY29kZUdhdGV3YXkpO1xuICBwcml2YXRlIHJlYWRvbmx5IGxlYWZsZXQgPSBpbmplY3QoTGVhZmxldFNlcnZpY2UpO1xuICBwcml2YXRlIHJlYWRvbmx5IHN0b3JlID0gaW5qZWN0KEF1dGhTdG9yZSk7XG4gIC8qKiBUaGUgaTE4biBzZWFtOiB0aGUgc2hhcmVkIHNoZWx0ZXItY29weSBoZWxwZXJzIHJlc29sdmUgdGhlaXIgY29weVxuICAgKiAgdGhyb3VnaCB0aGUgYWN0aXZlIGxvY2FsZSAoTjcgaTE4bi1jb21wbGV0ZW5lc3MpLCBhbmQgdGhlIGFuY2hvciBwaW5cbiAgICogIHRpdGxlIGlzIHRoZSBsb2NhbGl6ZWQgYG1hcC5zZWFyY2hlZGAgbGFiZWwuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgaTE4biA9IGluamVjdChJMThuU2VydmljZSk7XG4gIC8qKiBUaGUgYWN0aXZlLWxvY2FsZSByZXNvbHZlciBwYXNzZWQgdG8gdGhlIHNoYXJlZCBjb3B5IGhlbHBlcnMuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgdHJhbnNsYXRlID0gKGtleTogTWVzc2FnZUtleSwgcGFyYW1zPzogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyPik6IHN0cmluZyA9PlxuICAgIHRoaXMuaTE4bi50KGtleSwgcGFyYW1zKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IG1hcEVsID0gdmlld0NoaWxkPEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+PignbWFwRWwnKTtcbiAgLyoqIFRoZSBzaWRlYmFyJ3Mgc2Nyb2xsIGNvbnRhaW5lciDigJQgdGhlIHNjcm9sbFJvd0ludG9WaWV3IHRhcmdldC4gTnVsbFxuICAgKiAgd2hpbGUgdGhlIGxpc3QgaXMgbm90IHJlbmRlcmVkIChsb2FkaW5nIC8gZW1wdHkgLyBlcnJvciAvIGRlc3Ryb3llZCkuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgbGlzdEVsID0gdmlld0NoaWxkPEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+PignbGlzdEVsJyk7XG4gIC8qKiBUaGUgY29tcG9uZW50J3Mgb3duIGVudmlyb25tZW50IGluamVjdG9yIOKAlCBwYXNzZWQgZXhwbGljaXRseSB0b1xuICAgKiAgYWZ0ZXJOZXh0UmVuZGVyIChzY3JvbGxSb3dJbnRvVmlldyBydW5zIGZyb20gTGVhZmxldC9nZW9sb2NhdGlvblxuICAgKiAgY2FsbGJhY2tzLCBvdXRzaWRlIGFuIGluamVjdGlvbiBjb250ZXh0KSBhbmQgdGllcyB0aGUgZGVmZXJyZWRcbiAgICogIGNhbGxiYWNrIHRvIHRoZSBjb21wb25lbnQncyBsaWZlY3ljbGUgKG5ldmVyIGZpcmVzIGFmdGVyIGRlc3Ryb3kpLiAqL1xuICBwcml2YXRlIHJlYWRvbmx5IGluamVjdG9yID0gaW5qZWN0KEVudmlyb25tZW50SW5qZWN0b3IpO1xuXG4gIHByb3RlY3RlZCByZWFkb25seSBzb3VyY2VGaWx0ZXJzID0gU09VUkNFX0ZJTFRFUlM7XG4gIC8qKiBUaGUgc2hhcmVkIHNvdXJjZS90cnVzdCBjb3B5LCBleHBvc2VkIHRvIHRoZSB0ZW1wbGF0ZSAoQW5ndWxhcidzXG4gICAqICB0ZW1wbGF0ZSBzY29wZSBpcyB0aGUgY29tcG9uZW50IGNsYXNzKS4gVGhlIHJvdyBiYWRnZSBzaG93cyB0aGVcbiAgICogIHNvdXJjZSBsYWJlbCAocmVnaXN0cnkpIG9yIHRoZSB0cnVzdC1zdGF0ZSBsYWJlbCAoVVNFUiByb3dzKTtcbiAgICogIHRoZSB0cnVzdCBiYWRnZXMgKEQ2KSByZXVzZSB0aGUgc2hhcmVkIG9wZW5TdGF0dXMvb2NjdXBhbmN5IGNvcHkuXG4gICAqICBFYWNoIHdyYXBwZXIgaW5qZWN0cyB0aGUgaTE4biBzZWFtIHNvIHRoZSBiYWRnZSByZWFkcyBpbiB0aGUgYWN0aXZlXG4gICAqICBsb2NhbGUgKHRoZSBjYXRhbG9nIGtleXMgYmVoaW5kIHRoZW0gYXJlIHRoZSBzYW1lIG9uZXMgdGhlIC9taW5lXG4gICAqICBwYW5lbCBhbmQgdGhlIGJhbmQgcGlja2VyIGFscmVhZHkgcmVuZGVyIOKAlCBvbmUgd29yZCBwZXIgZmFjdCkuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBzb3VyY2VUcnVzdExhYmVsID0gKHM6IHtcbiAgICBzb3VyY2U6IFNoZWx0ZXJTb3VyY2U7XG4gICAgcmV2aWV3U3RhdHVzOiBSZXZpZXdTdGF0dXM7XG4gIH0pOiBzdHJpbmcgPT4gc291cmNlVHJ1c3RMYWJlbFNoYXJlZChzLCB0aGlzLnRyYW5zbGF0ZSk7XG4gIHByb3RlY3RlZCByZWFkb25seSBjb21tdW5pdHlCYWRnZUNsYXNzID0gY29tbXVuaXR5QmFkZ2VDbGFzc1NoYXJlZDtcbiAgLyoqIFRoZSByb3cncyBmcmVzaC1DTE9TRUQgYmFkZ2UgdGV4dCDigJQgZnJlc2ggT1BFTiByb3dzIHJlbmRlciBubyBiYWRnZVxuICAgKiAgKG9wZW4gaXMgdGhlIGRlZmF1bHQpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgb3BlblN0YXR1c0JhZGdlVGV4dCA9IChvcGVuU3RhdHVzOiBPcGVuU3RhdHVzRHRvIHwgbnVsbCkgPT5cbiAgICBvcGVuU3RhdHVzQmFkZ2VUZXh0U2hhcmVkKG9wZW5TdGF0dXMsIHRoaXMudHJhbnNsYXRlKTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IG9jY3VwYW5jeVRleHQgPSAob2NjdXBhbmN5OiBTaGVsdGVyT2NjdXBhbmN5KSA9PlxuICAgIG9jY3VwYW5jeVRleHRTaGFyZWQob2NjdXBhbmN5LCBEYXRlLm5vdygpLCB0aGlzLnRyYW5zbGF0ZSk7XG4gIC8qKiBUaGUgcmVwb3J0ZWQgYmFkZ2Ugd2l0aCBpdHMgY291bnQgKGxhc3QtdmVyaWZpZWQtbWV0YSkuICovXG4gIHByb3RlY3RlZCByZWFkb25seSByZXBvcnRlZEJhZGdlVGV4dCA9IChub25leGlzdGVudFJlcG9ydHM6IG51bWJlcikgPT5cbiAgICByZXBvcnRlZEJhZGdlVGV4dFNoYXJlZChub25leGlzdGVudFJlcG9ydHMsIHRoaXMudHJhbnNsYXRlKTtcbiAgLyoqIFRoZSBuZWFyZXN0IHJlc3VsdCdzIHN0cmFpZ2h0LWxpbmUgZGlzdGFuY2UgbGluZSAoRDYgaG9uZXN0eSkuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBzdHJhaWdodExpbmVUZXh0ID0gKGttOiBudW1iZXIpID0+IHN0cmFpZ2h0TGluZVRleHQoa20sIHRoaXMudHJhbnNsYXRlKTtcbiAgLyoqIFRoZSBwcml2YXRlLWxvY2F0aW9uIHByZWRpY2F0ZSAoRDcpIOKAlCB0aGUgdGVtcGxhdGUgc3RheXMgYnJhbmNoLWZyZWUuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBpc1ByaXZhdGVMb2NhdGlvbiA9IGlzUHJpdmF0ZUxvY2F0aW9uO1xuICAvKiogVHJ1c3QtYmFkZ2UgcHJlZGljYXRlcyAoRDYpIOKAlCB0aGUgdGVtcGxhdGUga2VlcHMgdGhlIGA+YCBjb21wYXJpc29uc1xuICAgKiAgaW4gY29kZSwgbm90IGluIHRoZSB0ZW1wbGF0ZSBleHByZXNzaW9ucy4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGhhc1JlcG9ydHMgPSBoYXNSZXBvcnRzU2hhcmVkO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgaGFzVHJ1c3RCYWRnZXMgPSBoYXNUcnVzdEJhZGdlc1NoYXJlZDtcbiAgLyoqIFRoZSBhZGRyZXNzLXNlYXJjaCBpbmxpbmUgc3RhdGUgKGxvY2F0aW9uLW5hdmlnYXRpb24pIOKAlCB0aGVcbiAgICogIHRlbXBsYXRlIHJlbmRlcnMgdGhlIG1hcHBlZCBjb3B5LCB0aGUga2luZCBzdGF5cyBpbiBjb2RlLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgYW5jaG9yRXJyb3JUZXh0ID0gKCk6IE1lc3NhZ2VLZXkgfCBudWxsID0+IHtcbiAgICBjb25zdCBraW5kID0gdGhpcy5hbmNob3JFcnJvcigpO1xuICAgIHJldHVybiBraW5kID09PSBudWxsID8gbnVsbCA6IEdFT0NPREVfRVJST1JfS0VZW2tpbmRdO1xuICB9O1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgZmlsdGVyID0gc2lnbmFsPFNoZWx0ZXJTb3VyY2VGaWx0ZXI+KCdBTEwnKTtcblxuICAvLyAtLS0tIHNoZWx0ZXIgZmlsdGVycyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyoqIEhhcyBjYXBhY2l0eSB0b2dnbGUgY2hpcCAtPiBgaGFzQ2FwYWNpdHk9dHJ1ZWAgKHNlcnZlci1zaWRlKS4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGhhc0NhcGFjaXR5ID0gc2lnbmFsKGZhbHNlKTtcbiAgLyoqIE9wZW4gdG9nZ2xlIGNoaXAgKGNsaWVudC1zaWRlKToga2VlcHMgdGhlIHJvd3Mgd2hvc2UgZGVyaXZlZCBkaXNwbGF5XG4gICAqICBzdGF0dXMgcmVhZHMgT1BFTiAoZnJlc2ggT1BFTiArIG5vdGhpbmctZnJlc2gpLFxuICAgKiAgZHJvcHBpbmcgdGhlIGZyZXNoLUNMT1NFRCByb3dzIChhbmQgbGlmZWN5Y2xlLUlOQUNUSVZFIHJvd3MsIHdoaWNoXG4gICAqICBuZXZlciByZWFjaCB0aGUgcHVibGljIGxpc3QpLiBUaGUgQkUgaGFzIG5vIHN1Y2ggcGFyYW0sIHNvIHRoZSBjaGlwXG4gICAqICBmaWx0ZXJzIHRoZSBsb2FkZWQgbGlzdCBXSVRIT1VUIGEgcmVmZXRjaCBhbmQgcmUtcmVuZGVycyB0aGUgbWFya2Vyc1xuICAgKiAgZnJvbSB0aGUgZmlsdGVyZWQgdmlldy4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IG9wZW5Pbmx5ID0gc2lnbmFsKGZhbHNlKTtcblxuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc2hlbHRlcnMgPSBzaWduYWw8U2hlbHRlckR0b1tdPihbXSk7XG4gIHByb3RlY3RlZCByZWFkb25seSBsb2FkaW5nID0gc2lnbmFsKGZhbHNlKTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGVycm9yID0gc2lnbmFsPHN0cmluZyB8IG51bGw+KG51bGwpO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc2VsZWN0ZWRJZCA9IHNpZ25hbDxudW1iZXIgfCBudWxsPihudWxsKTtcblxuICAvLyAtLS0tIG5lYXJlc3Qgc2hlbHRlciAobWFwLWNyaXNpcy1hY3Rpb25zIEQxICsgRDIpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiogVGhlIHNlc3Npb24sIGV4cG9zZWQgdG8gdGhlIHRlbXBsYXRlICh0aGUgXCJBZGQgc2hlbHRlclwiIENUQSBhbmQgdGhlXG4gICAqICBlbXB0eS1saXN0IG9mZmVyIHJlbmRlciBvbmx5IGZvciBhdXRoZW50aWNhdGVkIHVzZXJzKS4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGF1dGggPSB0aGlzLnN0b3JlO1xuICAvKiogVHJ1ZSB3aGlsZSB0aGUgZ2VvbG9jYXRpb24gcmVxdWVzdCBmb3IgdGhlIG5lYXJlc3Qgc2hlbHRlciBpcyBpbiBmbGlnaHQuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBsb2NhdGluZyA9IHNpZ25hbChmYWxzZSk7XG4gIC8qKiBUaGUgbmVhcmVzdCBzaGVsdGVyIChsYXN0IHN1Y2Nlc3MpIOKAlCBkcml2ZXMgdGhlIG9uZS1saW5lIHJlc3VsdCB1bmRlclxuICAgKiAgdGhlIENUQSAobmFtZSwgZGlzdGFuY2UsIHdhcm5pbmdzKSBhbmQgdGhlIGRpc3RhbmNlIHNvcnQuIEl0IGNhcnJpZXNcbiAgICogIE5PIHJvdyBlbXBoYXNpcyAocmVtb3ZlZCBieSBvd25lciBkZWNpc2lvbiDigJQgdGhlIGxpc3QgbXVzdCBub3QgZm9jdXNcbiAgICogIGEgc2luZ2xlIHNoZWx0ZXIpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgbmVhcmVzdCA9IHNpZ25hbDxTaGVsdGVyRHRvIHwgbnVsbD4obnVsbCk7XG4gIC8qKiBUaGUgSGF2ZXJzaW5lIGRpc3RhbmNlIHRvIHRoZSBuZWFyZXN0IHNoZWx0ZXIgaW4ga20gKGxhc3Qgc3VjY2Vzcykg4oCUXG4gICAqICBzaG93biBhcyBcIuKJiCDigKYgc3RyYWlnaHQgbGluZVwiIChENjogZGlzdGFuY2UgaG9uZXN0eSkuIENsZWFyZWQgd2l0aFxuICAgKiAgYG5lYXJlc3RgIGV2ZXJ5d2hlcmUgKHRoZSB0d28gc2lnbmFscyBtb3ZlIGFzIG9uZSkuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBuZWFyZXN0S20gPSBzaWduYWw8bnVtYmVyIHwgbnVsbD4obnVsbCk7XG4gIC8qKiBUaGUgdXNlcidzIHBvc2l0aW9uIGZyb20gdGhlIGxhc3QgYXJvdW5kLXlvdSBzdWNjZXNzIChudWxsID0gbm9uZSkuXG4gICAqICBXaGlsZSBzZXQsIHRoZSBzaWRlYmFyIGxpc3Qgc29ydHMgYnkgc3RyYWlnaHQtbGluZSBkaXN0YW5jZSB0byBpdCDigJRcbiAgICogIHRoZSByYW5raW5nIHRoZSBhcm91bmQteW91IGFjdGlvbiBwcm9taXNlcy4gQSBtYW51YWwgc2VsZWN0aW9uIGRvZXNcbiAgICogIE5PVCBjbGVhciBpdCAodGhlIHBvc2l0aW9uIHN0YXlzIHRydWUpOyBhIG5ldyBhcm91bmQteW91IHJ1biByZXBsYWNlc1xuICAgKiAgaXQuICovXG4gIHByb3RlY3RlZCByZWFkb25seSB1c2VyUG9zaXRpb24gPSBzaWduYWw8eyBsYXRpdHVkZTogbnVtYmVyOyBsb25naXR1ZGU6IG51bWJlciB9IHwgbnVsbD4obnVsbCk7XG4gIC8qKiBUaGUgbG9hZGVkIGxpc3Qgd2FzIGVtcHR5IHdoZW4gdGhlIGFjdGlvbiByYW4g4oCUIHRoZSBcImFkZCB0aGUgZmlyc3Qgb25lXCJcbiAgICogIG9mZmVyICh3aXRoIHRoZSAvc3VibWl0IGxpbmsgZm9yIGF1dGhlbnRpY2F0ZWQgdXNlcnMpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgbmVhcmVzdEVtcHR5ID0gc2lnbmFsKGZhbHNlKTtcbiAgLyoqIFRoZSBsYXN0IGxvY2F0ZSBmYWlsdXJlJ3MgbWVzc2FnZSBrZXkgKG51bGwgPSBub25lKTsgdGhlIHRlbXBsYXRlXG4gICAqICByZXNvbHZlcyBpdCB0aHJvdWdoIHRoZSBgdGAgcGlwZSAoaTE4bi1ldC1lbikuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBuZWFyZXN0RXJyb3IgPSBzaWduYWw8TWVzc2FnZUtleSB8IG51bGw+KG51bGwpO1xuXG4gIC8vIC0tLS0gYWRkcmVzcy1zZWFyY2ggYW5jaG9yIChsb2NhdGlvbi1uYXZpZ2F0aW9uKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qKiBUaGUgc2VhcmNoIGlucHV0J3MgY29udGVudCAoYSBjYXB0dXJlIGFmZm9yZGFuY2UsIG5vdCBhIGZpZWxkKS4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFuY2hvclF1ZXJ5ID0gc2lnbmFsKCcnKTtcbiAgLyoqIFRydWUgd2hpbGUgdGhlIE5vbWluYXRpbSBzZWFyY2ggaXMgaW4gZmxpZ2h0IChidXR0b24gcGVuZGluZyBzdGF0ZSkuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBhbmNob3JTZWFyY2hpbmcgPSBzaWduYWwoZmFsc2UpO1xuICAvKiogVGhlIHJlc3VsdCBsaXN0ICjiiaQ1KSBvZiB0aGUgbGFzdCBzdWNjZXNzZnVsIHNlYXJjaC4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFuY2hvclJlc3VsdHMgPSBzaWduYWw8R2VvY29kZVJlc3VsdFtdPihbXSk7XG4gIC8qKiBUaGUgbGFzdCBzZWFyY2ggZmFpbHVyZSdzIGtpbmQgKG51bGwgPSBub25lKS4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFuY2hvckVycm9yID0gc2lnbmFsPEdlb2NvZGVFcnJvcktpbmQgfCBudWxsPihudWxsKTtcbiAgLyoqIFRoZSBhY3RpdmUgYnJvd3NlIGFuY2hvciDigJQgdGhlIHNlYXJjaGVkIHBvaW50ICsgaXRzIGRpc3BsYXkgbGFiZWwuXG4gICAqICBXaGlsZSBzZXQsIHJvd3MgY2FycnkgaXRzIHN0cmFpZ2h0LWxpbmUgZGlzdGFuY2UgYW5kIHRoZSBsaXN0IHNvcnRzXG4gICAqICBieSBpdCAodGhlIG5hbWUgc29ydCBpcyB0aGUgdGllYnJlYWspOyBDbGVhciByZXN0b3JlcyB0aGUgbmFtZSBzb3J0LiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgYW5jaG9yID0gc2lnbmFsPHtcbiAgICBsYXRpdHVkZTogbnVtYmVyO1xuICAgIGxvbmdpdHVkZTogbnVtYmVyO1xuICAgIGxhYmVsOiBzdHJpbmc7XG4gIH0gfCBudWxsPihudWxsKTtcblxuICAvKipcbiAgICogU2lkZWJhciByb3dzOiB0aGUgXCJPcGVuXCIgY2hpcCdzIGNsaWVudC1zaWRlIGZpbHRlciBmaXJzdCwgdGhlbiB0aGVcbiAgICogZGlzdGFuY2Ugc29ydCDigJQgdGhlIGFyb3VuZC15b3UgdXNlciBwb3NpdGlvbiB3aW5zICh0aGUgYWN0aW9uJ3NcbiAgICogcmFua2luZyksIHRoZSBicm93c2UgYW5jaG9yIG5leHQsIHRoZSBzdGFibGUgbmFtZSBzb3J0IGlzIHRoZVxuICAgKiBkZWZhdWx0IGFuZCB0aGUgdGllYnJlYWsgZXZlcnl3aGVyZSAoMDUtQ09OVEVYVC1NQVApLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHNvcnRlZCA9IGNvbXB1dGVkPFNoZWx0ZXJEdG9bXT4oKCkgPT4ge1xuICAgIGNvbnN0IHJvd3MgPSB0aGlzLnNoZWx0ZXJzKCkuZmlsdGVyKChyb3cpID0+ICF0aGlzLm9wZW5Pbmx5KCkgfHwgaXNPcGVuUm93U2hhcmVkKHJvdykpO1xuICAgIGNvbnN0IGxpc3QgPSBbLi4ucm93c107XG4gICAgY29uc3QgdXNlclBvc2l0aW9uID0gdGhpcy51c2VyUG9zaXRpb24oKTtcbiAgICBpZiAodXNlclBvc2l0aW9uICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbGlzdC5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhID0gaGF2ZXJzaW5lS20oXG4gICAgICAgICAgdXNlclBvc2l0aW9uLmxhdGl0dWRlLFxuICAgICAgICAgIHVzZXJQb3NpdGlvbi5sb25naXR1ZGUsXG4gICAgICAgICAgYS5sYXRpdHVkZSxcbiAgICAgICAgICBhLmxvbmdpdHVkZSxcbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgZGIgPSBoYXZlcnNpbmVLbShcbiAgICAgICAgICB1c2VyUG9zaXRpb24ubGF0aXR1ZGUsXG4gICAgICAgICAgdXNlclBvc2l0aW9uLmxvbmdpdHVkZSxcbiAgICAgICAgICBiLmxhdGl0dWRlLFxuICAgICAgICAgIGIubG9uZ2l0dWRlLFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gZGEgLSBkYiB8fCBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IGFuY2hvciA9IHRoaXMuYW5jaG9yKCk7XG4gICAgaWYgKGFuY2hvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGxpc3Quc29ydCgoYSwgYikgPT4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKSk7XG4gICAgfVxuICAgIHJldHVybiBsaXN0LnNvcnQoKGEsIGIpID0+IHtcbiAgICAgIGNvbnN0IGRhID0gaGF2ZXJzaW5lS20oYW5jaG9yLmxhdGl0dWRlLCBhbmNob3IubG9uZ2l0dWRlLCBhLmxhdGl0dWRlLCBhLmxvbmdpdHVkZSk7XG4gICAgICBjb25zdCBkYiA9IGhhdmVyc2luZUttKGFuY2hvci5sYXRpdHVkZSwgYW5jaG9yLmxvbmdpdHVkZSwgYi5sYXRpdHVkZSwgYi5sb25naXR1ZGUpO1xuICAgICAgcmV0dXJuIGRhIC0gZGIgfHwgYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLyoqIFplcm8gcm93cyBmb3IgdGhlIGN1cnJlbnQgZmlsdGVyIOKAlCBvbmx5IHdoZW4gdGhlIGZldGNoIHNldHRsZWQgY2xlYW5seS4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHNob3dFbXB0eSA9IGNvbXB1dGVkKFxuICAgICgpID0+ICF0aGlzLmxvYWRpbmcoKSAmJiB0aGlzLmVycm9yKCkgPT09IG51bGwgJiYgdGhpcy5zaGVsdGVycygpLmxlbmd0aCA9PT0gMCxcbiAgKTtcblxuICAvKiogTW9ub3RvbmljIGZldGNoIHNlcXVlbmNlIOKAlCBhIHN0YWxlIChvdXQtb2Ytb3JkZXIpIHJlc3BvbnNlIGlzIGRyb3BwZWQuICovXG4gIHByaXZhdGUgZmV0Y2hTZXEgPSAwO1xuICAvKiogQSBzZWFyY2ggc2VsZWN0aW9uIG1hZGUgd2hpbGUgdGhlIGxpc3Qgd2FzIGVtcHR5OiB0aGUgcmVzdWx0J3MgcG9pbnQsXG4gICAqICB3aG9zZSBuZWFyZXN0IHJvdyBtdXN0IGJlIHNlbGVjdGVkIG9uY2UgdGhlIHJlZnJlc2ggc2V0dGxlcyAodGhlXG4gICAqICBzZWFyY2gtc2VsZWN0aW9uIGZvY3VzKS4gQ2xlYXJlZCBvbiBldmVyeSBsb2FkIG91dGNvbWUgYW5kIGJ5IGFueVxuICAgKiAgbWFudWFsIHNlbGVjdGlvbiAodGhlIG5ld2VyIGludGVudCB3aW5zKS4gKi9cbiAgcHJpdmF0ZSBwZW5kaW5nQW5jaG9yU2VsZWN0aW9uOiB7IGxhdGl0dWRlOiBudW1iZXI7IGxvbmdpdHVkZTogbnVtYmVyIH0gfCBudWxsID0gbnVsbDtcbiAgLyoqIFNldCBpbiBuZ09uRGVzdHJveSDigJQgYSBzdHJheSBjYWxsYmFjayBhZnRlciByb3V0ZSBsZWF2ZSAoYSBMZWFmbGV0XG4gICAqICBtYXJrZXIgZXZlbnQgcmFjaW5nIHRoZSBkZXN0cm95LCB0aGUgZ2VvbG9jYXRpb24tY2FsbGJhY2sgYnVnIGNsYXNzKVxuICAgKiAgbXVzdCBub3QgdG91Y2ggdGhlIERPTS4gKi9cbiAgcHJpdmF0ZSBkZXN0cm95ZWQgPSBmYWxzZTtcblxuICAvKipcbiAgICogVGhlIG1hcCBjb250YWluZXIgb25seSBleGlzdHMgb25jZSB0aGUgdmlldyBpcyByZW5kZXJlZDsgYSBudWxsIGNvbnRhaW5lclxuICAgKiAoc2hvdWxkIG5ldmVyIGhhcHBlbikgc2tpcHMgbWFwIGNyZWF0aW9uIGJ1dCBuZXZlciBicmVha3MgdGhlIHBhZ2UuXG4gICAqL1xuICBuZ0FmdGVyVmlld0luaXQoKTogdm9pZCB7XG4gICAgdGhpcy5sZWFmbGV0Lm1hcmtlckNsaWNrID0gKGlkKSA9PiB0aGlzLm9uTWFya2VyQ2xpY2soaWQpO1xuICAgIHRoaXMubGVhZmxldC5jcmVhdGUodGhpcy5tYXBFbCgpPy5uYXRpdmVFbGVtZW50ID8/IG51bGwsIEVTVE9OSUFfQ0VOVEVSLCBFU1RPTklBX1pPT00pO1xuICAgIHRoaXMubG9hZCgnQUxMJyk7XG4gIH1cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgLy8gQ2FuY2VsIGFueSBpbi1mbGlnaHQgcmVzcG9uc2UsIHRoZW4gZHJvcCB0aGUgbWFwIGluc3RhbmNlICsgbGlzdGVuZXJzLlxuICAgIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICB0aGlzLmZldGNoU2VxKys7XG4gICAgdGhpcy5sZWFmbGV0LmRlc3Ryb3koKTtcbiAgfVxuXG4gIC8qKiBDaGlwIGNsaWNrIOKAlCByZWZldGNoIHdpdGggdGhlIHNlcnZlci1zaWRlIHNvdXJjZSBwYXJhbSAobm8gY2xpZW50XG4gICAqICBmaWx0ZXIpLiBQdWJsaWMgc28gc3BlY3MgY2FuIGRyaXZlIGl0IChwYWdlIGNvbnZlbnRpb24pLlxuICAgKiAgUmUtc2VsZWN0aW5nIHRoZSBBQ1RJVkUgY2hpcCByZXRyaWVzIHRoZSBsYXN0IGZhaWxlZCByZWZldGNoIOKAlCB0aGVcbiAgICogIGVxdWFsaXR5IGd1YXJkIG11c3Qgbm90IHN3YWxsb3cgdGhhdCBjbGljayB3aGlsZSBhbiBlcnJvciBiYW5uZXIgaXNcbiAgICogIHVwLiAqL1xuICBzZXRGaWx0ZXIoc291cmNlOiBTaGVsdGVyU291cmNlRmlsdGVyKTogdm9pZCB7XG4gICAgaWYgKHNvdXJjZSA9PT0gdGhpcy5maWx0ZXIoKSAmJiB0aGlzLmVycm9yKCkgPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5sb2FkKHNvdXJjZSk7XG4gIH1cblxuICAvKiogT3BlbiB0b2dnbGUgY2hpcCDigJQgZmxpcCArIHJlLXJlbmRlciB0aGUgbWFya2VycyBmcm9tIHRoZSBmaWx0ZXJlZFxuICAgKiAgbGlzdC4gQ2xpZW50LXNpZGU6IHRoZSBCRSBoYXMgbm8gb3Blbi9jbG9zZWQgcGFyYW0sIHNvIE5PIHJlZmV0Y2gg4oCUXG4gICAqICB0aGUgbG9hZGVkIGxpc3QgaXMgZmlsdGVyZWQgYW5kIHRoZSBtYXJrZXIgbGF5ZXIgZm9sbG93cyB0aGUgc2FtZVxuICAgKiAgYHNvcnRlZCgpYCB2aWV3IHRoZSBzaWRlYmFyIHJlbmRlcnMuICovXG4gIHRvZ2dsZU9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy5vcGVuT25seS51cGRhdGUoKGFjdGl2ZSkgPT4gIWFjdGl2ZSk7XG4gICAgdGhpcy5sZWFmbGV0LnJlbmRlclNoZWx0ZXJzKHRoaXMuc29ydGVkKCkpO1xuICB9XG5cbiAgLyoqIEhhcyBjYXBhY2l0eSB0b2dnbGUgY2hpcCDigJQgZmxpcCArIHJlZmV0Y2ggd2l0aCB0aGUgY3VycmVudCBzb3VyY2UuICovXG4gIHRvZ2dsZUhhc0NhcGFjaXR5KCk6IHZvaWQge1xuICAgIHRoaXMuaGFzQ2FwYWNpdHkudXBkYXRlKChhY3RpdmUpID0+ICFhY3RpdmUpO1xuICAgIHRoaXMubG9hZCh0aGlzLmZpbHRlcigpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYWN0aXZlIHRydXN0IGZpbHRlciwgb3IgdW5kZWZpbmVkIHdoZW4gbm9uZSBpcyBhY3RpdmUgKEQ1KS5cbiAgICogQW4gdW5kZWZpbmVkIHJlc3VsdCBrZWVwcyB0aGUgbGVnYWN5IHNpbmdsZS1hcmcgYGxpc3Qoc291cmNlKWAgY2FsbFxuICAgKiBzaGFwZSDigJQgdGhlIHF1ZXJ5IHN0cmluZyBzdGF5cyBtaW5pbWFsIChvbmx5IGBzb3VyY2VgKSB1bnRpbCB0aGUgZmlsdGVyIGlzXG4gICAqIGFjdHVhbGx5IHNldC4gKFRoZSBgcmV2aWV3ZWRgIHBhcmFtIGlzIGdvbmUgd2l0aCB0aGUgcmV2aWV3IG1vZGVsO1xuICAgKiBcIk9wZW5cIiBpcyBjbGllbnQtc2lkZSBhbmQgbmV2ZXIgcmVhY2hlcyB0aGUgcXVlcnkgc3RyaW5nLilcbiAgICovXG4gIHByaXZhdGUgYWN0aXZlVHJ1c3RGaWx0ZXIoKTogU2hlbHRlclRydXN0RmlsdGVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5oYXNDYXBhY2l0eSgpID8geyBoYXNDYXBhY2l0eTogdHJ1ZSB9IDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFJvdyBjbGljazogc2VsZWN0IChoaWdobGlnaHQpICsgZmx5IHRoZSBtYXAgdG8gdGhlIHNoZWx0ZXIgYXQgc3RyZWV0XG4gICAqIGxldmVsLiBEb2VzIE5PVCBuYXZpZ2F0ZSDigJQgdGhlIHNlbGVjdGVkIHJvdydzIFwiVmlldyBkZXRhaWxzXCIgbGluayBpc1xuICAgKiB0aGUgZXhwbGljaXQgc3RlcCB0byAvc2hlbHRlcnMve2lkfSAoZGVzaWduIGRlY2lzaW9uIDUpLiBQdWJsaWMgc29cbiAgICogc3BlY3MgY2FuIGRyaXZlIGl0IChwYWdlIGNvbnZlbnRpb24pLlxuICAgKi9cbiAgc2VsZWN0U2hlbHRlcihzaGVsdGVyOiBTaGVsdGVyRHRvKTogdm9pZCB7XG4gICAgLy8gQSBtYW51YWwgc2VsZWN0aW9uIHN1cGVyc2VkZXMgdGhlIE5lYXJlc3QgZW1waGFzaXMgKEQyOiB0aGUgdGVtcG9yYXJ5XG4gICAgLy8gaGlnaGxpZ2h0IGNsZWFycyBvbiB0aGUgbmV4dCBpbnRlcmFjdGlvbikgYW5kIGFueSBwZW5kaW5nIHNlYXJjaFxuICAgIC8vIHNlbGVjdGlvbiAoYSBtYW51YWwgcGljayBpcyB0aGUgbmV3ZXIgaW50ZW50KS5cbiAgICB0aGlzLnBlbmRpbmdBbmNob3JTZWxlY3Rpb24gPSBudWxsO1xuICAgIHRoaXMubmVhcmVzdC5zZXQobnVsbCk7XG4gICAgdGhpcy5uZWFyZXN0S20uc2V0KG51bGwpO1xuICAgIHRoaXMuc2VsZWN0ZWRJZC5zZXQoc2hlbHRlci5pZCk7XG4gICAgdGhpcy5sZWFmbGV0LmZseVRvKHNoZWx0ZXIubGF0aXR1ZGUsIHNoZWx0ZXIubG9uZ2l0dWRlLCBTSEVMVEVSX1pPT00pO1xuICB9XG5cbiAgLyoqXG4gICAqIE1hcmtlciBjbGljayAoTGVhZmxldFNlcnZpY2UgY2FsbGJhY2spOiBzZWxlY3QgKyB6b29tIGV4YWN0bHkgbGlrZSBhXG4gICAqIHJvdyBjbGljayDigJQgdGhlIHVzZXIgc3RheXMgb24gdGhlIG1hcCBsb29raW5nIGF0IHRoZSBjbGlja2VkIHBvaW50LlxuICAgKiBNYXJrZXJzIGFyZSByZW5kZXJlZCBmcm9tIGBzb3J0ZWQoKWAsIHNvIHRoZSBpZCBsb29rdXAgcnVucyBvdmVyIHRoZVxuICAgKiBzYW1lIGxpc3QuIEEgbm90LWZvdW5kIGlkIChhIG1hcmtlciBjbGljayByYWNpbmcgYSBmaWx0ZXIgcmVmZXRjaCkganVzdFxuICAgKiBzZWxlY3RzIHdpdGhvdXQgYSBmbHkg4oCUIHRoZSBtYXAgYWxyZWFkeSBzaG93cyB0aGF0IHBvaW50LlxuICAgKi9cbiAgcHJpdmF0ZSBvbk1hcmtlckNsaWNrKGlkOiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCByb3cgPSB0aGlzLnNvcnRlZCgpLmZpbmQoKHMpID0+IHMuaWQgPT09IGlkKTtcbiAgICBpZiAocm93KSB7XG4gICAgICB0aGlzLnNlbGVjdFNoZWx0ZXIocm93KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wZW5kaW5nQW5jaG9yU2VsZWN0aW9uID0gbnVsbDsgLy8gYSBtYW51YWwgcGljayBzdXBlcnNlZGVzIGl0XG4gICAgICB0aGlzLm5lYXJlc3Quc2V0KG51bGwpOyAvLyBhbiBpbnRlcmFjdGlvbiBvdXRzaWRlIHRoZSBsaXN0IHN0aWxsIHN1cGVyc2VkZXMgaXRcbiAgICAgIHRoaXMubmVhcmVzdEttLnNldChudWxsKTtcbiAgICAgIHRoaXMuc2VsZWN0ZWRJZC5zZXQoaWQpO1xuICAgIH1cbiAgICAvLyBUaGUgYWNjZW50IChzZWxlY3Rpb24gcmluZykgbWF5IGhhdmUgbGFuZGVkIG9uIGEgcm93IGJlbG93IHRoZSBmb2xkIGluXG4gICAgLy8gdGhlIGxpc3Qg4oCUIHNjcm9sbCBpdCBpbnRvIHZpZXcgc28gdGhlIHVzZXIgc2VlcyBXSEFUIHdhcyB6b29tZWQgdG8uXG4gICAgdGhpcy5zY3JvbGxSb3dJbnRvVmlldyhpZCk7XG4gIH1cblxuICAvKipcbiAgICogXCJOZWFyZXN0IHNoZWx0ZXJcIiAobWFwLWNyaXNpcy1hY3Rpb25zIEQxL0QyKTogYSBoaWdoLWFjY3VyYWN5XG4gICAqIGdlb2xvY2F0aW9uIHJlcXVlc3QgKHRoZSBzaGFyZWQgbWVjaGFuaXNtLCBvcHRpb25zIGFuZCBlcnJvciBtYXBwaW5nIOKAlFxuICAgKiBzaGFyZWQvZ2VvbG9jYXRpb24udHMpLCB0aGVuIHRoZSBjbG9zZXN0IHNoZWx0ZXIgY29tcHV0ZWQgQ0xJRU5ULVNJREVcbiAgICogZnJvbSB0aGUgYWxyZWFkeS1sb2FkZWQgbGlzdCDigJQgbm8gYmFja2VuZCBjYWxsLiBPbiBzdWNjZXNzOlxuICAgKiB0aGUgbWFwIGZsaWVzIHRvIHRoZSBVU0VSJ1MgT1dOIFBPU0lUSU9OIGF0IHJlZ2lvbmFsIHNjYWxlXG4gICAqIChBUk9VTkRfWk9PTSAxNCDigJQgYSBuZWlnaGJvdXJob29kLCBub3QgYSBzaW5nbGUgc2hlbHRlcidzIHN0cmVldCkgYW5kXG4gICAqIGRvZXMgTk9UIHNlbGVjdCBhbnkgcm93OyB0aGUgbmVhcmVzdCBzaGVsdGVyIHN0YXlzIHRoZSBSRVNVTFQgb2YgdGhlXG4gICAqIGFjdGlvbiAocm93IGVtcGhhc2lzICsgdGhlIG9uZS1saW5lIFwiTmVhcmVzdDog4oCmXCIgc3RhdGUpLCBhbmQgdGhlIGxpc3RcbiAgICogc29ydHMgYnkgc3RyYWlnaHQtbGluZSBkaXN0YW5jZSB0byB0aGUgdXNlcidzIHBvc2l0aW9uLiBPbiBmYWlsdXJlOlxuICAgKiBwZXItZXJyb3IgY29weSAodGhlIHN1Ym1pdCBwYWdlJ3Mgdm9jYWJ1bGFyeSk7IHRoZSBsaXN0IGFuZCBtYXAgc3RheVxuICAgKiB1bnRvdWNoZWQuIFB1YmxpYyBzbyBzcGVjcyBjYW4gZHJpdmUgaXQgKHBhZ2UgY29udmVudGlvbikuXG4gICAqL1xuICBmaW5kTmVhcmVzdCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2NhdGluZygpIHx8IHRoaXMubG9hZGluZygpIHx8IHRoaXMuZXJyb3IoKSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuOyAvLyBidXN5LCBvciB0aGUgbGlzdCBpdHNlbGYgaXMgbG9hZGluZy9mYWlsZWQg4oCUIGFuIG9mZmVyIHN0YXRlXG4gICAgICAvLyB3b3VsZCBtaXNsZWFkXG4gICAgfVxuICAgIHRoaXMubmVhcmVzdC5zZXQobnVsbCk7IC8vIERyb3AgdGhlIExBU1QgU1VDQ0VTUyB1cCBmcm9udCDigJQgYSBmYWlsZWRcbiAgICAvLyByZXRyeSBtdXN0IG5vdCBsZWF2ZSB0aGUgc3RhbGUgXCJOZWFyZXN0OiBYXCIgbGluZSAoYW5kIGl0cyByb3dcbiAgICAvLyBlbXBoYXNpcywgZHJpdmVuIGJ5IHRoZSBzYW1lIHNpZ25hbCkgcmVuZGVyZWQgbmV4dCB0byB0aGUgZXJyb3IuXG4gICAgdGhpcy5uZWFyZXN0S20uc2V0KG51bGwpO1xuICAgIHRoaXMubmVhcmVzdEVycm9yLnNldChudWxsKTtcbiAgICB0aGlzLm5lYXJlc3RFbXB0eS5zZXQoZmFsc2UpO1xuICAgIGlmICh0aGlzLnNoZWx0ZXJzKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBOb3RoaW5nIGxvYWRlZCDigJQgbm90aGluZyB0byBtZWFzdXJlIGFnYWluc3QuIFRoZSBvZmZlciBjb3B5ICh3aXRoIHRoZVxuICAgICAgLy8gL3N1Ym1pdCBsaW5rIGZvciBhdXRoZW50aWNhdGVkIHVzZXJzKSByZW5kZXJzIGZyb20gYG5lYXJlc3RFbXB0eWAuXG4gICAgICB0aGlzLm5lYXJlc3RFbXB0eS5zZXQodHJ1ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMubG9jYXRpbmcuc2V0KHRydWUpO1xuICAgIC8vIFRoZSBtZWNoYW5pc20gKHNlY3VyZS1jb250ZXh0ICsgQVBJIGd1YXJkcywgdGhlIHJlcXVlc3Qgb3B0aW9ucywgdGhlXG4gICAgLy8gZXJyb3ItY29kZSBtYXBwaW5nKSBpcyBzaGFyZWQvZ2VvbG9jYXRpb24udHM7IHRoZSBwZXIta2luZFxuICAgIC8vIENPUFkgc3RheXMgcGFnZS1sb2NhbCBhbmQgbWlycm9yZWQgcGVyIGtpbmQgKE5FQVJFU1RfS0VZKS5cbiAgICB2b2lkIGdldEN1cnJlbnRQb3NpdGlvbkhpZ2hBY2N1cmFjeSgpLnRoZW4oXG4gICAgICAoY29vcmRzKSA9PiB7XG4gICAgICAgIHRoaXMubG9jYXRpbmcuc2V0KGZhbHNlKTtcbiAgICAgICAgdGhpcy5mb2N1c05lYXJlc3RTaGVsdGVyKGNvb3Jkcy5sYXRpdHVkZSwgY29vcmRzLmxvbmdpdHVkZSk7XG4gICAgICB9LFxuICAgICAgKGZhaWx1cmU6IHVua25vd24pID0+IHtcbiAgICAgICAgdGhpcy5sb2NhdGluZy5zZXQoZmFsc2UpO1xuICAgICAgICAvLyBMaXN0IGFuZCBtYXAgYXJlIHVudG91Y2hlZC5cbiAgICAgICAgY29uc3Qga2luZCA9IGZhaWx1cmUgaW5zdGFuY2VvZiBHZW9sb2NhdGlvbkVycm9yID8gZmFpbHVyZS5raW5kIDogJ3VuYXZhaWxhYmxlJztcbiAgICAgICAgdGhpcy5uZWFyZXN0RXJyb3Iuc2V0KE5FQVJFU1RfS0VZW2tpbmRdKTtcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcm91bmQteW91IHN1Y2Nlc3MgKG93bmVyIGRlY2lzaW9uKTogdGhlIG1hcCBmbGllcyB0byB0aGUgdXNlcidzIE9XTlxuICAgKiBwb3NpdGlvbiBhdCByZWdpb25hbCBzY2FsZSAoQVJPVU5EX1pPT00gMTQpIOKAlCBOT1QgdG8gdGhlIG5lYXJlc3RcbiAgICogc2hlbHRlciwgYW5kIE5PIHJvdyBpcyBzZWxlY3RlZCwgZW1waGFzaXplZCBvciBzY3JvbGxlZCB0by4gVGhlIG5lYXJlc3RcbiAgICogc2hlbHRlciBpcyB0aGUgYWN0aW9uJ3MgUkVTVUxUOiB0aGUgb25lLWxpbmUgcmVzdWx0IChuYW1lLFxuICAgKiBzdHJhaWdodC1saW5lIGRpc3RhbmNlLCB0aGUgdW52ZXJpZmllZCB3YXJuaW5nIHdoZW4gaXQgaXMgYSBjb21tdW5pdHlcbiAgICogcm93KSwgYW5kIHRoZSBzaWRlYmFyIGxpc3Qgc29ydHMgYnkgc3RyYWlnaHQtbGluZSBkaXN0YW5jZSB0byB0aGVcbiAgICogdXNlcidzIHBvc2l0aW9uIHdoaWxlIGl0IGlzIHNldC5cbiAgICovXG4gIHByaXZhdGUgZm9jdXNOZWFyZXN0U2hlbHRlcihsYXRpdHVkZTogbnVtYmVyLCBsb25naXR1ZGU6IG51bWJlcik6IHZvaWQge1xuICAgIC8vIE5lYXJlc3QgaXMgY29tcHV0ZWQgb3ZlciBgc2hlbHRlcnMoKWAg4oCUIHRoZSBsaXN0IHRoZSBnYXRld2F5IGxhc3RcbiAgICAvLyBsb2FkZWQsIHRoZSBVTkZJTFRFUkVELWJ5LWNsaWVudCB2aWV3OiBubyBmdXJ0aGVyIG5hcnJvd2luZyBvbiB0b3Agb2ZcbiAgICAvLyB0aGUgc2VydmVyLXNpZGUgZmlsdGVyLCBhbmQgbm90IHRoZSBuYW1lLXNvcnRlZCBgc29ydGVkKClgIGRpc3BsYXlcbiAgICAvLyB2aWV3IChzYW1lIHJvd3MsIGRpZmZlcmVudCBvcmRlcikuIEQyOiB0aGUgYWxyZWFkeS1sb2FkZWQgbGlzdCwgbm90IGFcbiAgICAvLyBuZXcgZmV0Y2guXG4gICAgY29uc3QgaGl0ID0gbmVhcmVzdFNoZWx0ZXJBdChsYXRpdHVkZSwgbG9uZ2l0dWRlLCB0aGlzLnNoZWx0ZXJzKCkpO1xuICAgIGlmIChoaXQgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZSBsaXN0IG1heSBoYXZlIGVtcHRpZWQgKGFuZCBGQUlMRUQgdG8gbG9hZCkgd2hpbGUgdGhlIGxvY2F0ZVxuICAgICAgLy8gd2FzIGluIGZsaWdodCDigJQgdGhlIGVycm9yIGJhbm5lciBpcyB0aGUgc3RhdGU7IG9mZmVyaW5nIFwiYWRkIHRoZVxuICAgICAgLy8gZmlyc3Qgb25lXCIgYmVzaWRlIGl0IHdvdWxkIG1pc2xlYWQuXG4gICAgICBpZiAodGhpcy5lcnJvcigpID09PSBudWxsKSB7XG4gICAgICAgIHRoaXMubmVhcmVzdEVtcHR5LnNldCh0cnVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5uZWFyZXN0LnNldChoaXQucm93KTtcbiAgICB0aGlzLm5lYXJlc3RLbS5zZXQoaGl0LmttKTtcbiAgICB0aGlzLnVzZXJQb3NpdGlvbi5zZXQoeyBsYXRpdHVkZSwgbG9uZ2l0dWRlIH0pO1xuICAgIC8vIFJlZ2lvbmFsIHZpZXcgY2VudHJlZCBvbiB0aGUgdXNlciwgTk9UIGEgc3RyZWV0LWxldmVsIGZseSB0byB0aGVcbiAgICAvLyBuZWFyZXN0IHNoZWx0ZXIgKHRoZSBvd25lcidzIGNvcnJlY3Rpb24pIOKAlCB0aGUgdXNlciBzdXJ2ZXlzIHRoZVxuICAgIC8vIG5laWdoYm91cmhvb2QgYW5kIHBpY2tzLlxuICAgIHRoaXMubGVhZmxldC5mbHlUbyhsYXRpdHVkZSwgbG9uZ2l0dWRlLCBBUk9VTkRfWk9PTSk7XG4gICAgLy8gTm8gcm93IGVtcGhhc2lzLCBubyBhdXRvLXNjcm9sbCAodGhlIG93bmVyJ3MgY29ycmVjdGlvbik6IHRoZSBuZWFyZXN0XG4gICAgLy8gc2hlbHRlciBpcyB0aGUgYWN0aW9uJ3MgUkVTVUxUIOKAlCB0aGUgb25lLWxpbmUgc3RhdGUgdW5kZXIgdGhlIENUQSDigJRcbiAgICAvLyB0aGUgbGlzdCBpdHNlbGYgc3RheXMgdW5mb2N1c2VkIChkaXN0YW5jZS1zb3J0ZWQgdmlhIHVzZXJQb3NpdGlvbikuXG4gIH1cblxuICAvLyAtLS0tIGFkZHJlc3Mtc2VhcmNoIGFuY2hvciAobG9jYXRpb24tbmF2aWdhdGlvbikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBwcm90ZWN0ZWQgb25BbmNob3JRdWVyeUNoYW5nZShldmVudDogRXZlbnQpOiB2b2lkIHtcbiAgICB0aGlzLmFuY2hvclF1ZXJ5LnNldCgoZXZlbnQudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlKTtcbiAgfVxuXG4gIC8qKiBFbnRlciBpbiB0aGUgc2VhcmNoIGlucHV0IHNlYXJjaGVzICh0aGUgL3N1Ym1pdCBjb252ZW50aW9uKS4gKi9cbiAgcHJvdGVjdGVkIG9uQW5jaG9yU2VhcmNoS2V5KGV2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgIGlmICghKGV2ZW50IGluc3RhbmNlb2YgS2V5Ym9hcmRFdmVudCkgfHwgZXZlbnQua2V5ICE9PSAnRW50ZXInKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdGhpcy5zdGFydEFuY2hvclNlYXJjaCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBcIlNlYXJjaFwiIGJ1dHRvbiAoYW5kIEVudGVyKTogT05FIGRlbGliZXJhdGUgTm9taW5hdGltIHJlcXVlc3QgcGVyXG4gICAqIHByZXNzIOKAlCBubyBhdXRvc3VnZ2VzdCAoTm9taW5hdGltIHVzYWdlIHBvbGljeSkuIEEgcHJlc3Mgd2hpbGUgYVxuICAgKiBzZWFyY2ggaXMgcGVuZGluZyBpcyBJR05PUkVELCBuZXZlciBzdGFja2VkOyBpZiB0aGUgcHJlc3MgbGFuZHMgaW5zaWRlXG4gICAqIHRoZSBnYXRld2F5J3MgMTAwMCBtcyBzcGFjaW5nIHdpbmRvdyBpdCB3YWl0cyBpdCBvdXQgYW5kIHRoZSBidXR0b25cbiAgICogc3RheXMgcGVuZGluZyB0aGUgd2hvbGUgdGltZSAodGhlIHNoZWx0ZXItYWRkcmVzcy1zZWFyY2ggY29udHJhY3QsXG4gICAqIG1pcnJvcmVkKS4gQSBmYWlsdXJlIE5FVkVSIHNldHMgYW4gYW5jaG9yIGFuZCB0b3VjaGVzIG5vdGhpbmcgZWxzZS5cbiAgICovXG4gIHByb3RlY3RlZCBzdGFydEFuY2hvclNlYXJjaCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hbmNob3JTZWFyY2hpbmcoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBxdWVyeSA9IHRoaXMuYW5jaG9yUXVlcnkoKS50cmltKCk7XG4gICAgaWYgKHF1ZXJ5ID09PSAnJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmFuY2hvclNlYXJjaGluZy5zZXQodHJ1ZSk7XG4gICAgdGhpcy5hbmNob3JFcnJvci5zZXQobnVsbCk7XG4gICAgdGhpcy5hbmNob3JSZXN1bHRzLnNldChbXSk7XG4gICAgdm9pZCB0aGlzLmdlb2NvZGVcbiAgICAgIC5zZWFyY2gocXVlcnkpXG4gICAgICAudGhlbigocmVzdWx0cykgPT4ge1xuICAgICAgICBpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLmFuY2hvckVycm9yLnNldCgnbm8tcmVzdWx0cycpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFuY2hvclJlc3VsdHMuc2V0KHJlc3VsdHMpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZmFpbHVyZTogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyA0MjkgPSB0aGUgc2VydmljZSB0aHJvdHRsZXMgKFwicGxlYXNlIHdhaXQgYSBtb21lbnRcIik7IGFueXRoaW5nXG4gICAgICAgIC8vIGVsc2UgKG5ldHdvcmsvQ09SUy81eHgpIGdldHMgdGhlIGdlbmVyaWMgdW5hdmFpbGFibGUgY29weS5cbiAgICAgICAgY29uc3QgYXBpID0gdG9BcGlFcnJvcihmYWlsdXJlKTtcbiAgICAgICAgdGhpcy5hbmNob3JFcnJvci5zZXQoYXBpLnN0YXR1cyA9PT0gNDI5ID8gJ3JhdGUtbGltaXRlZCcgOiAnbmV0d29yaycpO1xuICAgICAgfSlcbiAgICAgIC5maW5hbGx5KCgpID0+IHRoaXMuYW5jaG9yU2VhcmNoaW5nLnNldChmYWxzZSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbGVjdGluZyBhIHJlc3VsdCBzZXRzIHRoZSBCUk9XU0UgQU5DSE9SOiB0aGUgYW5jaG9yIHBpbiwgdGhlXG4gICAqIGZseSB0byBuZWlnaGJvdXJob29kIHNjYWxlLCBhbmQgZXZlcnkgcm93J3Mgc3RyYWlnaHQtbGluZSBkaXN0YW5jZVxuICAgKiBmb2xsb3cgdGhpcyBwb2ludC4gQSBzZWxlY3Rpb24gc3VwZXJzZWRlcyB0aGUgbmVhcmVzdCBlbXBoYXNpcyAodGhlXG4gICAqIG5leHQtaW50ZXJhY3Rpb24tc3VwZXJzZWRlcyBjb252ZW50aW9uKSBhbmQgY29sbGFwc2VzIHRoZSByZXN1bHQgbGlzdC5cbiAgICpcbiAgICogU2VhcmNoLXNlbGVjdGlvbiBmb2N1czogb24gdG9wIG9mIHRoZSBleGlzdGluZyBmbHktdG8sIHRoZSByZXN1bHQnc1xuICAgKiBORUFSRVNUIHNoZWx0ZXIgaXMgc2VsZWN0ZWQgaW4gdGhlIHNpZGViYXIgbGlzdCDigJQgdGhlIHNhbWUgc2VsZWN0ZWRcbiAgICogc3RhdGUgYSBtYXJrZXIgY2xpY2sgZ2l2ZXMgKGhpZ2hsaWdodCArIFwiVmlldyBkZXRhaWxzXCIgbGluaywgTk8gZXh0cmFcbiAgICogZmx5OiB0aGUgY2FtZXJhIGFscmVhZHkgd2VudCB0byB0aGUgc2VhcmNoZWQgcG9pbnQpIOKAlCBhbmQgc2Nyb2xsZWRcbiAgICogaW50byB2aWV3IHdpdGggYmxvY2sgJ2NlbnRlcicuIFRoZSBzZWFyY2ggcmVzdWx0IGlzIGFuIGFkZHJlc3MsIG5vdCBhXG4gICAqIHNoZWx0ZXIgcm93LCBzbyBcInRoZSBzaGVsdGVyIHRoZSB1c2VyIHNlbGVjdGVkXCIgaXMgdGhlIG5lYXJlc3QgbG9hZGVkXG4gICAqIHJvdyB0byB0aGF0IGFkZHJlc3MgKHRoZSBhbmNob3IgY29udHJhY3Q6IHRoZSBzZWFyY2ggZXhpc3RzIHRvXG4gICAqIGNvbXBhcmUgdGhlIHN1cnJvdW5kaW5ncykuIElmIG5vdGhpbmcgaXMgbG9hZGVkLCB0aGUgbGlzdCBpcyByZS1sb2FkZWRcbiAgICogd2l0aCB0aGUgQ1VSUkVOVCBmaWx0ZXJzIGFuZCB0aGUgbmVhcmVzdCByb3cgaXMgc2VsZWN0ZWQgb25jZSB0aGUgbG9hZFxuICAgKiBzZXR0bGVzIChwZW5kaW5nQW5jaG9yU2VsZWN0aW9uKS5cbiAgICovXG4gIHByb3RlY3RlZCBzZWxlY3RBbmNob3JSZXN1bHQocmVzdWx0OiBHZW9jb2RlUmVzdWx0KTogdm9pZCB7XG4gICAgdGhpcy5uZWFyZXN0LnNldChudWxsKTtcbiAgICB0aGlzLm5lYXJlc3RLbS5zZXQobnVsbCk7XG4gICAgdGhpcy5hbmNob3Iuc2V0KHtcbiAgICAgIGxhdGl0dWRlOiByZXN1bHQubGF0aXR1ZGUsXG4gICAgICBsb25naXR1ZGU6IHJlc3VsdC5sb25naXR1ZGUsXG4gICAgICBsYWJlbDogcmVzdWx0LmRpc3BsYXlOYW1lLFxuICAgIH0pO1xuICAgIHRoaXMuYW5jaG9yUmVzdWx0cy5zZXQoW10pO1xuICAgIHRoaXMuYW5jaG9yRXJyb3Iuc2V0KG51bGwpO1xuICAgIHRoaXMubGVhZmxldC5zZXRBbmNob3IocmVzdWx0LmxhdGl0dWRlLCByZXN1bHQubG9uZ2l0dWRlLCB0aGlzLmkxOG4udCgnbWFwLnNlYXJjaGVkJykpO1xuICAgIHRoaXMubGVhZmxldC5mbHlUbyhyZXN1bHQubGF0aXR1ZGUsIHJlc3VsdC5sb25naXR1ZGUsIEFOQ0hPUl9aT09NKTtcbiAgICBjb25zdCBsb2FkZWQgPSB0aGlzLnNoZWx0ZXJzKCk7XG4gICAgY29uc3QgaGl0ID0gbmVhcmVzdFNoZWx0ZXJBdChyZXN1bHQubGF0aXR1ZGUsIHJlc3VsdC5sb25naXR1ZGUsIGxvYWRlZCk7XG4gICAgaWYgKGhpdCA9PT0gbnVsbCkge1xuICAgICAgLy8gRW1wdHkgbGlzdCDigJQgcmVmcmVzaCB3aXRoIHRoZSBjdXJyZW50IGZpbHRlcnM7IHRoZSBzZWxlY3Rpb24gbGFuZHNcbiAgICAgIC8vIHdoZW4gdGhlIGxvYWQgc2V0dGxlcyAobG9hZCdzIHN1Y2Nlc3MgcGF0aCBjb25zdW1lcyB0aGUgcGVuZGluZykuXG4gICAgICB0aGlzLnBlbmRpbmdBbmNob3JTZWxlY3Rpb24gPSB7IGxhdGl0dWRlOiByZXN1bHQubGF0aXR1ZGUsIGxvbmdpdHVkZTogcmVzdWx0LmxvbmdpdHVkZSB9O1xuICAgICAgdGhpcy5sb2FkKHRoaXMuZmlsdGVyKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNlbGVjdFJvdyhoaXQucm93LmlkLCAnY2VudGVyJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNlbGVjdCBhIHJvdyBieSBpZCB3aXRoIHRoZSBTQU1FIHNlbGVjdGVkIHN0YXRlIGFzIGEgbWFya2VyIGNsaWNrXG4gICAqIChoaWdobGlnaHQgKyBcIlZpZXcgZGV0YWlsc1wiIGxpbmspIGFuZCBzY3JvbGwgaXQgaW50byB2aWV3LiBObyBmbHkg4oCUXG4gICAqIHRoZSBjYWxsZXIgb3ducyB0aGUgY2FtZXJhIChhIG1hcmtlciBjbGljayBmbGllcyB0byB0aGUgc2hlbHRlciwgdGhlXG4gICAqIHNlYXJjaCBzZWxlY3Rpb24gZmxpZXMgdG8gdGhlIHNlYXJjaGVkIHBvaW50KS5cbiAgICovXG4gIHByaXZhdGUgc2VsZWN0Um93KGlkOiBudW1iZXIsIGJsb2NrOiBTY3JvbGxMb2dpY2FsUG9zaXRpb24pOiB2b2lkIHtcbiAgICB0aGlzLnNlbGVjdGVkSWQuc2V0KGlkKTtcbiAgICB0aGlzLnNjcm9sbFJvd0ludG9WaWV3KGlkLCBibG9jayk7XG4gIH1cblxuICAvKiogUmVtb3ZlcyB0aGUgYW5jaG9yIOKAlCBwaW4sIHBlci1yb3cgZGlzdGFuY2VzLCBhbmQgdGhlIGRpc3RhbmNlIHNvcnQuICovXG4gIHByb3RlY3RlZCBjbGVhckFuY2hvcigpOiB2b2lkIHtcbiAgICB0aGlzLmFuY2hvci5zZXQobnVsbCk7XG4gICAgdGhpcy5sZWFmbGV0LnNldEFuY2hvcihudWxsLCBudWxsLCAnJyk7IC8vIHJlbW92YWwg4oCUIHRoZSB0aXRsZSBpcyB1bnVzZWRcbiAgfVxuXG4gIC8qKiBUaGUgc3RyYWlnaHQtbGluZSBkaXN0YW5jZSBmcm9tIHRoZSBhY3RpdmUgYW5jaG9yIHRvIHRoZSByb3cgKGttKSxcbiAgICogIG9yIG51bGwgd2hlbiBubyBhbmNob3IgaXMgc2V0LiBQdXJlIEhhdmVyc2luZSBvdmVyIGFscmVhZHktbG9hZGVkXG4gICAqICByb3dzIOKAlCB0aGUgRDIgXCJubyBuZXcgZW5kcG9pbnRcIiBwcmVjZWRlbnQgKGNsaWVudC1zaWRlIG9ubHkpLiAqL1xuICBwcm90ZWN0ZWQgYW5jaG9yRGlzdGFuY2Uoc2hlbHRlcjogU2hlbHRlckR0byk6IG51bWJlciB8IG51bGwge1xuICAgIGNvbnN0IGFuY2hvciA9IHRoaXMuYW5jaG9yKCk7XG4gICAgaWYgKGFuY2hvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBoYXZlcnNpbmVLbShhbmNob3IubGF0aXR1ZGUsIGFuY2hvci5sb25naXR1ZGUsIHNoZWx0ZXIubGF0aXR1ZGUsIHNoZWx0ZXIubG9uZ2l0dWRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTY3JvbGwgdGhlIHJvdyBmb3IgYGlkYCBpbnRvIHZpZXcgaW5zaWRlIHRoZSBzaWRlYmFyIGxpc3Qg4oCUIHRoZSBhY2NlbnRcbiAgICogKHRoZSBzZWxlY3Rpb24gcmluZyBmcm9tIGEgbWFya2VyIGNsaWNrLCB0aGUgdGVtcG9yYXJ5IGVtcGhhc2lzIGZyb20gYVxuICAgKiBuZWFyZXN0IHN1Y2Nlc3MpIG11c3QgbGFuZCBvbiBhIHJvdyB0aGUgdXNlciBjYW4gYWN0dWFsbHkgc2VlLlxuICAgKlxuICAgKiBEZWZlcnJlZCB0byBhZnRlck5leHRSZW5kZXI6IHRoZSBzaWduYWwgd3JpdGUgdGhhdCB0cmlnZ2VyZWQgdGhpcyBjYWxsXG4gICAqIHJlLXJlbmRlcnMgdGhlIHJvdyBmaXJzdCAodGhlIHNlbGVjdGVkIHJvdyBHUk9XUyBpdHMgXCJWaWV3IGRldGFpbHNcIlxuICAgKiBsaW5rKSwgc28gdGhlIHNjcm9sbCBtZWFzdXJlcyB0aGUgZmluYWwgbGF5b3V0LCBub3QgdGhlIHByZS11cGRhdGUgb25lLlxuICAgKiBgYmxvY2tgIGRlZmF1bHRzIHRvICduZWFyZXN0JzogYSBuby1vcCB3aGVuIHRoZSByb3cgaXMgYWxyZWFkeSB2aXNpYmxlXG4gICAqIChubyBqdW1weSByZS1zY3JvbGwpLCB0aGUgbWluaW11bSBzY3JvbGwgd2hlbiBpdCBpc24ndC4gVGhlIHNlYXJjaC1cbiAgICogc2VsZWN0aW9uIGZvY3VzIHBhc3NlcyAnY2VudGVyJyDigJQgdGhlIHNlbGVjdGVkIHJvdyBpcyB0aGUgcG9pbnQgb2ZcbiAgICogaW50ZXJlc3QgYW5kIG11c3Qgc2l0IG1pZC12aWV3cG9ydC4gQSBtaXNzaW5nIGxpc3QgKGxvYWRpbmcgLyBlbXB0eSAvXG4gICAqIGRlc3Ryb3llZCkgb3IgYSBtaXNzaW5nIHJvdyAoZmlsdGVyZWQgb3V0KSBpcyBhIG5vLW9wLiBVbmRlciB0aGUgbGlzdCdzXG4gICAqIHByb3hpbWl0eSBzY3JvbGwtc25hcCwgdGhlIHNtb290aCBzY3JvbGwgc2ltcGx5IHNldHRsZXMgb24gdGhlIG5lYXJlc3RcbiAgICogcm93IGVkZ2UgYWZ0ZXIgaXQgZmluaXNoZXMgKHByb3hpbWl0eSBuZXZlciBmb3JjZXMgYSBwb3NpdGlvbikuXG4gICAqL1xuICBwcml2YXRlIHNjcm9sbFJvd0ludG9WaWV3KGlkOiBudW1iZXIsIGJsb2NrOiBTY3JvbGxMb2dpY2FsUG9zaXRpb24gPSAnbmVhcmVzdCcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kZXN0cm95ZWQpIHtcbiAgICAgIHJldHVybjsgLy8gYSBzdHJheSBjYWxsYmFjayBhZnRlciByb3V0ZSBsZWF2ZSBtdXN0IG5vdCB0b3VjaCB0aGUgRE9NXG4gICAgfVxuICAgIGFmdGVyTmV4dFJlbmRlcihcbiAgICAgICgpID0+IHtcbiAgICAgICAgY29uc3QgbGlzdCA9IHRoaXMubGlzdEVsKCk/Lm5hdGl2ZUVsZW1lbnQ7XG4gICAgICAgIGlmICghbGlzdCkge1xuICAgICAgICAgIHJldHVybjsgLy8gdGhlIGxpc3QgaXMgZ29uZSAob3IgdGhlIHBhZ2Ugd2FzIGRlc3Ryb3llZCBtaWQtZmxpZ2h0KVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJvdyA9IGxpc3QucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oYFtkYXRhLXNoZWx0ZXItaWQ9XCIke2lkfVwiXWApO1xuICAgICAgICBpZiAocm93KSB7XG4gICAgICAgICAgcm93LnNjcm9sbEludG9WaWV3KHsgYmxvY2ssIGJlaGF2aW9yOiAnc21vb3RoJyB9KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHsgaW5qZWN0b3I6IHRoaXMuaW5qZWN0b3IgfSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkKHNvdXJjZTogU2hlbHRlclNvdXJjZUZpbHRlcik6IHZvaWQge1xuICAgIGNvbnN0IHNlcSA9ICsrdGhpcy5mZXRjaFNlcTtcbiAgICB0aGlzLmZpbHRlci5zZXQoc291cmNlKTtcbiAgICB0aGlzLmVycm9yLnNldChudWxsKTtcbiAgICB0aGlzLmxvYWRpbmcuc2V0KHRydWUpO1xuICAgIC8vIFRydXN0IGZpbHRlcnMgY29tcG9zZSB3aXRoIHRoZSBzb3VyY2UgZmlsdGVyIChENSk7IHdpdGggbm9uZSBhY3RpdmVcbiAgICAvLyB0aGUgY2FsbCBpcyB0aGUgcGxhaW4gbGlzdChzb3VyY2UpIHNoYXBlIOKAlCBubyBzZWNvbmQgYXJndW1lbnQuXG4gICAgY29uc3QgdHJ1c3QgPSB0aGlzLmFjdGl2ZVRydXN0RmlsdGVyKCk7XG4gICAgY29uc3QgcmVxdWVzdCA9XG4gICAgICB0cnVzdCA9PT0gdW5kZWZpbmVkID8gdGhpcy5nYXRld2F5Lmxpc3Qoc291cmNlKSA6IHRoaXMuZ2F0ZXdheS5saXN0KHNvdXJjZSwgdHJ1c3QpO1xuICAgIHZvaWQgcmVxdWVzdC50aGVuKFxuICAgICAgKHJvd3MpID0+IHtcbiAgICAgICAgaWYgKHNlcSAhPT0gdGhpcy5mZXRjaFNlcSkge1xuICAgICAgICAgIHJldHVybjsgLy8gYSBuZXdlciBmaWx0ZXIgcmVmZXRjaCBzdXBlcnNlZGVkIHRoaXMgcmVzcG9uc2VcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNoZWx0ZXJzLnNldChyb3dzKTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZElkLnNldChudWxsKTtcbiAgICAgICAgLy8gQSBmaWx0ZXIgY2hhbmdlIHJlLWxvYWRzIHRoZSBsaXN0IOKAlCB0aGUgcHJldmlvdXMgTmVhcmVzdCBlbXBoYXNpc1xuICAgICAgICAvLyAoYW5kIGVtcHR5LWxpc3Qgb2ZmZXIpIGlzIHN0YWxlIGJ5IGRlZmluaXRpb24gKEQyOiBjbGVhcmVkIG9uIHRoZVxuICAgICAgICAvLyBuZXh0IGludGVyYWN0aW9uL2ZpbHRlciBjaGFuZ2UpLiBuZWFyZXN0RXJyb3Igc3Vydml2ZXM6IGl0IGRlc2NyaWJlc1xuICAgICAgICAvLyB0aGUgdXNlcidzIGJyb3dzZXIsIG5vdCB0aGUgbGlzdC5cbiAgICAgICAgdGhpcy5uZWFyZXN0LnNldChudWxsKTtcbiAgICAgICAgdGhpcy5uZWFyZXN0S20uc2V0KG51bGwpO1xuICAgICAgICB0aGlzLm5lYXJlc3RFbXB0eS5zZXQoZmFsc2UpO1xuICAgICAgICB0aGlzLmxlYWZsZXQucmVuZGVyU2hlbHRlcnModGhpcy5zb3J0ZWQoKSk7XG4gICAgICAgIHRoaXMubG9hZGluZy5zZXQoZmFsc2UpO1xuICAgICAgICAvLyBBIHNlYXJjaCBzZWxlY3Rpb24gbWFkZSB3aGlsZSB0aGUgbGlzdCB3YXMgZW1wdHkgbGFuZHMgbm93OiB0aGVcbiAgICAgICAgLy8gbmVhcmVzdCBsb2FkZWQgcm93IGlzIHNlbGVjdGVkIHdpdGggdGhlIG1hcmtlci1jbGljayBzZWxlY3RlZFxuICAgICAgICAvLyBzdGF0ZSwgc2Nyb2xsZWQgaW50byB2aWV3IGNlbnRlcmVkLlxuICAgICAgICBjb25zdCBwZW5kaW5nID0gdGhpcy5wZW5kaW5nQW5jaG9yU2VsZWN0aW9uO1xuICAgICAgICB0aGlzLnBlbmRpbmdBbmNob3JTZWxlY3Rpb24gPSBudWxsO1xuICAgICAgICBpZiAocGVuZGluZyAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IGhpdCA9IG5lYXJlc3RTaGVsdGVyQXQocGVuZGluZy5sYXRpdHVkZSwgcGVuZGluZy5sb25naXR1ZGUsIHJvd3MpO1xuICAgICAgICAgIGlmIChoaXQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0Um93KGhpdC5yb3cuaWQsICdjZW50ZXInKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAoZmFpbHVyZTogdW5rbm93bikgPT4ge1xuICAgICAgICBpZiAoc2VxICE9PSB0aGlzLmZldGNoU2VxKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucGVuZGluZ0FuY2hvclNlbGVjdGlvbiA9IG51bGw7IC8vIHRoZSByZWZyZXNoIGZhaWxlZCDigJQgdGhlIHNlbGVjdGlvbiBuZXZlciBsYW5kc1xuICAgICAgICB0aGlzLnNoZWx0ZXJzLnNldChbXSk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJZC5zZXQobnVsbCk7XG4gICAgICAgIHRoaXMubmVhcmVzdC5zZXQobnVsbCk7XG4gICAgICAgIHRoaXMubmVhcmVzdEttLnNldChudWxsKTtcbiAgICAgICAgdGhpcy5uZWFyZXN0RW1wdHkuc2V0KGZhbHNlKTtcbiAgICAgICAgdGhpcy5sZWFmbGV0LnJlbmRlclNoZWx0ZXJzKFtdKTtcbiAgICAgICAgLy8gU2FtZSBiYW5uZXIvZXJyb3ItY29weSBwYXRoIGFzIGV2ZXJ5IG90aGVyIHBhZ2U6XG4gICAgICAgIC8vIGUuZy4gYSA0MjkgZ2V0cyB0aGUgcmF0ZS1saW1pdGVkIGNvcHksIG5vdCB0aGUgcmF3IGJhY2tlbmQgdGV4dC5cbiAgICAgICAgLy8gVGhlIHRyYW5zbGF0ZSBjYWxsYmFjayByb3V0ZXMgdGhlIGNsaWVudC1hdXRob3JlZCBlcnJvci4qIGNvcHlcbiAgICAgICAgLy8gdGhyb3VnaCB0aGUgYWN0aXZlIGxvY2FsZSAoTjcgaTE4bi1jb21wbGV0ZW5lc3Mg4oCUIGEgNXh4IG9uIHRoZVxuICAgICAgICAvLyBtYXAgbXVzdCBub3QgcmVhZCBFbmdsaXNoIHRvIGFuIEVUL1JVIHJlYWRlcikuXG4gICAgICAgIHRoaXMuZXJyb3Iuc2V0KGJhbm5lck1lc3NhZ2UoZmFpbHVyZSwgJ3NoZWx0ZXInLCAoa2V5KSA9PiB0aGlzLmkxOG4udChrZXkpKSk7XG4gICAgICAgIHRoaXMubG9hZGluZy5zZXQoZmFsc2UpO1xuICAgICAgfSxcbiAgICApO1xuICB9XG59XG4iLCI8c2VjdGlvbiBjbGFzcz1cIm1hcC1wYWdlXCI+XG4gIDxoZWFkZXIgY2xhc3M9XCJtYXAtcGFnZV9faGVhZGVyXCI+XG4gICAgPGgxIGNsYXNzPVwicGFnZS10aXRsZVwiPnt7ICdtYXAudGl0bGUnIHwgdCB9fTwvaDE+XG4gICAgPHAgY2xhc3M9XCJwYWdlLXN1YnRpdGxlXCI+e3sgJ21hcC5zdWJ0aXRsZScgfCB0IH19PC9wPlxuICA8L2hlYWRlcj5cblxuICA8ZGl2IGNsYXNzPVwibWFwLXBhZ2VfX2xheW91dFwiPlxuICAgIDxkaXYgY2xhc3M9XCJtYXAtcGFnZV9fbWFwXCI+XG4gICAgICA8ZGl2ICNtYXBFbCBjbGFzcz1cIm1hcC1wYWdlX19sZWFmbGV0XCI+PC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwibWFwLWxlZ2VuZFwiIHJvbGU9XCJncm91cFwiIFthdHRyLmFyaWEtbGFiZWxdPVwiJ21hcC5sZWdlbmRBcmlhJyB8IHRcIj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJsZWdlbmQtaXRlbVwiPlxuICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICBjbGFzcz1cInNoZWx0ZXItbWFya2VyIHNoZWx0ZXItbWFya2VyLS1yZWdpc3RyeSBsZWdlbmQtc3dhdGNoXCJcbiAgICAgICAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgICAgICAgPjwvc3Bhbj5cbiAgICAgICAgICB7eyAnbWFwLmxlZ2VuZC5yZWdpc3RyeScgfCB0IH19XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPCEtLSBDb21tdW5pdHkgdHJ1c3QgdG9uZSAoY29tbXVuaXR5LXJldmlldy1xdWV1ZSBENSk6IHRoZSBjb21tdW5pdHlcbiAgICAgICAgICAgICBwaW4gaXMgc3RpbGwgcmVuZGVyZWQg4oCUIGEgY29tbXVuaXR5IHJvdyB3aG9zZSBzdWJtaXR0ZXIgZGVwdGggdGhlXG4gICAgICAgICAgICAgQVBJIGRvZXMgbm90IHJlcG9ydCBrZWVwcyB0aGlzIHRvbmUgKHRoZSB1bmlmaWVkIHllbGxvdywgdGhlIHNhbWVcbiAgICAgICAgICAgICB0b25lIGFzIGNvbmZpcm1lZCkuIFRoZSBORVcgdG9uZSBpcyBkZWxpYmVyYXRlbHkgTk9UIGEgbGVnZW5kXG4gICAgICAgICAgICAgZW50cnkgKG93bmVyIGRlY2lzaW9uKTogdGhlIHZlcmlmaWNhdGlvbiBzaGFwZXMgY2FycnkgdGhlXG4gICAgICAgICAgICAgY29tbXVuaXR5LXJvdyBzdG9yeSBvbiB0aGUgbWFwLCBhbmQgdGhlIHJvdyBiYWRnZSB0ZXh0IHN0aWxsIHNheXNcbiAgICAgICAgICAgICBcIk5ld2x5IGFkZGVkXCIgd2hlcmV2ZXIgaXQgYXBwbGllcy4gLS0+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwibGVnZW5kLWl0ZW1cIj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInNoZWx0ZXItbWFya2VyIHNoZWx0ZXItbWFya2VyLS11c2VyIGxlZ2VuZC1zd2F0Y2hcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+XG4gICAgICAgICAge3sgJ21hcC5sZWdlbmQuY29uZmlybWVkJyB8IHQgfX1cbiAgICAgICAgPC9zcGFuPlxuICAgICAgICA8IS0tIFN1Ym1pdHRlciB2ZXJpZmljYXRpb24gZGVwdGggKHN1Ym1pdHRlci12ZXJpZmljYXRpb24tYmFkZ2UsIG93bmVyXG4gICAgICAgICAgICAgZGVjaXNpb24pOiB0aGUgU0hBUEUgY2FycmllcyBpdCBmb3IgY29tbXVuaXR5IHJvd3Mg4oCUIGEgdHJpYW5nbGUgYXRcbiAgICAgICAgICAgICBleGFjdGx5IG9uZSBjb25maXJtZWQgY2hhbm5lbCwgYSBjaXJjbGUgYXQgdHdvIG9yIG1vcmUuIFRoZSB0cnVzdFxuICAgICAgICAgICAgIHN0YXRlIChuZXdseSBhZGRlZCAvIGNvbW11bml0eS1jaGVja2VkKSBzdGF5cyBvbiB0aGUgcm93J3MgYmFkZ2VcbiAgICAgICAgICAgICB0ZXh0LCBzbyBub3RoaW5nIGlzIGxvc3QgYnkgbW92aW5nIHRoZSBtYXJrZXIgY29sb3VyIHRvIHRoZVxuICAgICAgICAgICAgIHZlcmlmaWNhdGlvbiBmYW1pbHkuIC0tPlxuICAgICAgICA8c3BhbiBjbGFzcz1cImxlZ2VuZC1pdGVtXCI+XG4gICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgIGNsYXNzPVwic2hlbHRlci1tYXJrZXIgc2hlbHRlci1tYXJrZXItLXBhcnRpYWwgbGVnZW5kLXN3YXRjaFwiXG4gICAgICAgICAgICBhcmlhLWhpZGRlbj1cInRydWVcIlxuICAgICAgICAgID48L3NwYW4+XG4gICAgICAgICAge3sgJ21hcC5sZWdlbmQucGFydGlhbFZlcmlmaWVkJyB8IHQgfX1cbiAgICAgICAgPC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cImxlZ2VuZC1pdGVtXCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJzaGVsdGVyLW1hcmtlciBzaGVsdGVyLW1hcmtlci0tZnVsbCBsZWdlbmQtc3dhdGNoXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPlxuICAgICAgICAgIHt7ICdtYXAubGVnZW5kLmZ1bGxWZXJpZmllZCcgfCB0IH19XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPCEtLSBSZXBvcnRlZCBzdGF0ZSAoc2hlbHRlci10cnVzdC1hbmQtcmVwb3J0cyBENik6IHRoZSBzaW5nbGVcbiAgICAgICAgICAgICBvcmFuZ2UgXCJyZXBvcnRlZFwiIGFmZm9yZGFuY2Ug4oCUIGJlYXRzIHRoZSB0cnVzdCBjb2xvdXIuIC0tPlxuICAgICAgICA8c3BhbiBjbGFzcz1cImxlZ2VuZC1pdGVtXCI+XG4gICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgIGNsYXNzPVwic2hlbHRlci1tYXJrZXIgc2hlbHRlci1tYXJrZXItLXJlcG9ydGVkIGxlZ2VuZC1zd2F0Y2hcIlxuICAgICAgICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCJcbiAgICAgICAgICA+PC9zcGFuPlxuICAgICAgICAgIHt7ICdtYXAubGVnZW5kLnJlcG9ydGVkJyB8IHQgfX1cbiAgICAgICAgPC9zcGFuPlxuICAgICAgICA8IS0tIFRoZSBvcmlnaW4gbWFya2VyIChNOCk6IHRoZSBzZWFyY2hlZCBhZGRyZXNzIHRoZSBwZXItcm93XG4gICAgICAgICAgICAgXCLiiYggTiBtIHN0cmFpZ2h0IGxpbmVcIiBkaXN0YW5jZXMgYXJlIG1lYXN1cmVkIGZyb20uIFRoZVxuICAgICAgICAgICAgIGRpYW1vbmQgc2hhcGUgKG5vdCBhIGNpcmNsZSkgaXMgdGhlIG5vbi1jb2xvdXItb25seVxuICAgICAgICAgICAgIGRpc3RpbmN0aW9uIGZyb20gc2hlbHRlciBtYXJrZXJzOyB0aGUgc3dhdGNoIHJldXNlcyB0aGVcbiAgICAgICAgICAgICBleGFjdCBwaW4gY2xhc3MuIFRoZSBsYWJlbCByZXVzZXMgdGhlIGV4aXN0aW5nIGBtYXAuc2VhcmNoZWRgXG4gICAgICAgICAgICAga2V5IOKAlCBhIGRlZGljYXRlZCBgbWFwLmxlZ2VuZC5hbmNob3JgIGtleSBpcyByZXF1ZXN0ZWQgZnJvbVxuICAgICAgICAgICAgIHRoZSBpMThuIGxhbmUgKHNlZSB0aGUgTTggcmVwb3J0KS4gLS0+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwibGVnZW5kLWl0ZW1cIj5cbiAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgY2xhc3M9XCJzaGVsdGVyLW1hcmtlciBzaGVsdGVyLW1hcmtlci0tYW5jaG9yIGxlZ2VuZC1zd2F0Y2hcIlxuICAgICAgICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCJcbiAgICAgICAgICA+PC9zcGFuPlxuICAgICAgICAgIHt7ICdtYXAuc2VhcmNoZWQnIHwgdCB9fVxuICAgICAgICA8L3NwYW4+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cblxuICAgIDxhc2lkZSBjbGFzcz1cIm1hcC1wYWdlX19zaWRlYmFyXCI+XG4gICAgICA8IS0tIENyaXNpcyBhY3Rpb25zIChtYXAtY3Jpc2lzLWFjdGlvbnMgRDEvRDQpOiB0aGUgc2luZ2xlIHNhZmV0eS1cbiAgICAgICAgICAgb3JhbmdlIENUQSAodGhlIE9OTFkgY29uc3VtZXIgb2YgLS1jb2xvci1jdGEpIGFuZCB0aGVcbiAgICAgICAgICAgYXV0aGVudGljYXRlZC1vbmx5IFwiQWRkIHNoZWx0ZXJcIiBlbnRyeSDigJQgdGhlIC9zdWJtaXQgcm91dGUgZ3VhcmRzXG4gICAgICAgICAgIGhhbmRsZSB0aGUgdmVyaWZpZWQgcmVkaXJlY3QuIEFib3ZlIHRoZSBjaGlwczogdGhpcyBpcyBcInRoZVwiXG4gICAgICAgICAgIGFjdGlvbiBvZiB0aGUgcGFnZS4gLS0+XG4gICAgICA8ZGl2IGNsYXNzPVwibWFwLXBhZ2VfX2FjdGlvbnNcIj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzPVwiYnRuIGJ0bi0tYmxvY2sgbWFwLWN0YVwiXG4gICAgICAgICAgKGNsaWNrKT1cImZpbmROZWFyZXN0KClcIlxuICAgICAgICAgIFtkaXNhYmxlZF09XCJsb2NhdGluZygpIHx8IGxvYWRpbmcoKSB8fCBlcnJvcigpICE9PSBudWxsXCJcbiAgICAgICAgICBbYXR0ci5hcmlhLWJ1c3ldPVwibG9jYXRpbmcoKVwiXG4gICAgICAgID5cbiAgICAgICAgICB7eyBsb2NhdGluZygpID8gKCdtYXAubG9jYXRpbmcnIHwgdCkgOiAoJ21hcC5hcm91bmRZb3UnIHwgdCkgfX1cbiAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwhLS0gbGVnYWwtcmVjb3Zlcnk6IHRoZSBleHBsaWNpdCBjb25zZW50IGxpbmUg4oCUXG4gICAgICAgICAgICAgdGhlIENUQSBpcyB0aGUgb25seSBnZW9sb2NhdGlvbiB0cmlnZ2VyIGFuZCB0aGUgYnJvd3NlciBwcm9tcHRcbiAgICAgICAgICAgICBpcyB0aGUgY29uc2VudDsgdGhlIG5lYXJlc3QgcmFua2luZyBpcyBjbGllbnQtc2lkZSAobm8gYmFja2VuZFxuICAgICAgICAgICAgIGNhbGwpLCBzbyB0aGUgcHJvbWlzZSBcIm5ldmVyIHNlbnRcIiBpcyB0aGUgYWN0dWFsIGJlaGF2aW9yLiAtLT5cbiAgICAgICAgPHAgY2xhc3M9XCJtYXAtcGFnZV9fZ2VvLW5vdGVcIj57eyAnbWFwLmdlb05vdGUnIHwgdCB9fTwvcD5cbiAgICAgICAgPCEtLSBBZGRyZXNzLXNlYXJjaCBhbmNob3IgKGxvY2F0aW9uLW5hdmlnYXRpb24pOiB0aGUgZmFsbGJhY2tcbiAgICAgICAgICAgICBmb3IgdGhlIGdlb2xvY2F0aW9uIENUQSB3aGVuIGxvY2F0aW9uIGlzIGRlbmllZCwgdGltZXMgb3V0IG9yXG4gICAgICAgICAgICAgaXMgdW5hdmFpbGFibGUg4oCUIHRoZSBTQU1FIGdhdGV3YXkgKyB1c2FnZS1wb2xpY3kgY29udHJhY3QgYXNcbiAgICAgICAgICAgICB0aGUgL3N1Ym1pdCBhZGRyZXNzIHNlYXJjaCAoc2hlbHRlci1hZGRyZXNzLXNlYXJjaCksIGluIHRoZVxuICAgICAgICAgICAgIGJyb3dzZSBjb250ZXh0LiBQdWJsaWM6IG5vIGF1dGggbmVlZGVkLiBBIGZhaWxlZCBzZWFyY2ggY2hhbmdlc1xuICAgICAgICAgICAgIG5vdGhpbmcgZWxzZSAobm8gYW5jaG9yLCBubyBwaW4sIGxpc3QgdW50b3VjaGVkKS4gLS0+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJtYXAtcGFnZV9fYW5jaG9yLXNlYXJjaFwiPlxuICAgICAgICAgIDxsYWJlbCBjbGFzcz1cImFuY2hvci1zZWFyY2hfX2xhYmVsXCIgZm9yPVwiYW5jaG9yLXNlYXJjaC1pbnB1dFwiPnt7XG4gICAgICAgICAgICAnbWFwLmFuY2hvckxhYmVsJyB8IHRcbiAgICAgICAgICB9fTwvbGFiZWw+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImFuY2hvci1zZWFyY2hfX3Jvd1wiPlxuICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgIGlkPVwiYW5jaG9yLXNlYXJjaC1pbnB1dFwiXG4gICAgICAgICAgICAgIGNsYXNzPVwiYW5jaG9yLXNlYXJjaF9faW5wdXRcIlxuICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgIFtwbGFjZWhvbGRlcl09XCInbWFwLmFuY2hvclBsYWNlaG9sZGVyJyB8IHRcIlxuICAgICAgICAgICAgICBbdmFsdWVdPVwiYW5jaG9yUXVlcnkoKVwiXG4gICAgICAgICAgICAgIChpbnB1dCk9XCJvbkFuY2hvclF1ZXJ5Q2hhbmdlKCRldmVudClcIlxuICAgICAgICAgICAgICAoa2V5ZG93bik9XCJvbkFuY2hvclNlYXJjaEtleSgkZXZlbnQpXCJcbiAgICAgICAgICAgICAgW2Rpc2FibGVkXT1cImFuY2hvclNlYXJjaGluZygpXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICBjbGFzcz1cImJ0biBhbmNob3Itc2VhcmNoX19idXR0b25cIlxuICAgICAgICAgICAgICAoY2xpY2spPVwic3RhcnRBbmNob3JTZWFyY2goKVwiXG4gICAgICAgICAgICAgIFtkaXNhYmxlZF09XCJhbmNob3JTZWFyY2hpbmcoKSB8fCBhbmNob3JRdWVyeSgpLnRyaW0oKSA9PT0gJydcIlxuICAgICAgICAgICAgICBbYXR0ci5hcmlhLWJ1c3ldPVwiYW5jaG9yU2VhcmNoaW5nKClcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICB7eyBhbmNob3JTZWFyY2hpbmcoKSA/ICgnbWFwLnNlYXJjaGluZycgfCB0KSA6ICgnbWFwLnNlYXJjaCcgfCB0KSB9fVxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPCEtLSBOb21pbmF0aW0gdXNhZ2UgcG9saWN5OiB0aGUgYXR0cmlidXRpb24gaXMgUkVRVUlSRUQgYW5kIGFsd2F5c1xuICAgICAgICAgICAgICAgcmVuZGVyZWQgbmV4dCB0byB0aGUgc2VhcmNoIGJveCAodGhlIC9zdWJtaXQgY29udmVudGlvbiksXG4gICAgICAgICAgICAgICBzdWNjZXNzIG9yIGZhaWx1cmUuIC0tPlxuICAgICAgICAgIDxwIGNsYXNzPVwiYW5jaG9yLXNlYXJjaF9fYXR0cmlidXRpb25cIj5cbiAgICAgICAgICAgIHt7ICdtYXAuYXR0cmlidXRpb25MZWFkJyB8IHQgfX1cbiAgICAgICAgICAgIDxhIGhyZWY9XCJodHRwczovL3d3dy5vcGVuc3RyZWV0bWFwLm9yZy9jb3B5cmlnaHRcIiB0YXJnZXQ9XCJfYmxhbmtcIiByZWw9XCJub29wZW5lclwiPnt7XG4gICAgICAgICAgICAgICdtYXAub3NtQXR0cmlidXRpb24nIHwgdFxuICAgICAgICAgICAgfX08L2E+XG4gICAgICAgICAgPC9wPlxuICAgICAgICAgIEBpZiAoYW5jaG9yRXJyb3JUZXh0KCk7IGFzIG1zZykge1xuICAgICAgICAgICAgQGlmIChhbmNob3JFcnJvcigpID09PSAnbm8tcmVzdWx0cycpIHtcbiAgICAgICAgICAgICAgPHAgY2xhc3M9XCJhbmNob3Itc2VhcmNoX19lcnJvclwiPnt7IG1zZyB8IHQgfX08L3A+XG4gICAgICAgICAgICB9IEBlbHNlIHtcbiAgICAgICAgICAgICAgPCEtLSBUaGUgdHdvIHJlYWwgZmFpbHVyZXMgZ2V0IHRoZSBhbGVydCByb2xlICh0aGUgL3N1Ym1pdFxuICAgICAgICAgICAgICAgICAgIGNvbnZlbnRpb24pOiBuby1yZXN1bHRzIGlzIGluZm9ybWF0aW9uLCBub3QgYW4gYWxhcm0uIC0tPlxuICAgICAgICAgICAgICA8cCBjbGFzcz1cImFuY2hvci1zZWFyY2hfX2Vycm9yXCIgcm9sZT1cImFsZXJ0XCI+e3sgbXNnIHwgdCB9fTwvcD5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgQGlmIChhbmNob3JSZXN1bHRzKCkubGVuZ3RoKSB7XG4gICAgICAgICAgICA8dWwgY2xhc3M9XCJhbmNob3Itc2VhcmNoX19yZXN1bHRzXCIgW2F0dHIuYXJpYS1sYWJlbF09XCInbWFwLmFkZHJlc3NSZXN1bHRzQXJpYScgfCB0XCI+XG4gICAgICAgICAgICAgIEBmb3IgKHJlc3VsdCBvZiBhbmNob3JSZXN1bHRzKCk7IHRyYWNrICRpbmRleCkge1xuICAgICAgICAgICAgICAgIDxsaT5cbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzPVwiYW5jaG9yLXNlYXJjaF9fcmVzdWx0XCJcbiAgICAgICAgICAgICAgICAgICAgKGNsaWNrKT1cInNlbGVjdEFuY2hvclJlc3VsdChyZXN1bHQpXCJcbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJhbmNob3Itc2VhcmNoX19yZXN1bHQtbmFtZVwiPnt7IHJlc3VsdC5kaXNwbGF5TmFtZSB9fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgQGlmIChyZXN1bHQudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYW5jaG9yLXNlYXJjaF9fcmVzdWx0LXR5cGVcIj57eyByZXN1bHQudHlwZSB9fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICB9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICBAaWYgKGF1dGguaW5pdGlhbGl6ZWQoKSAmJiBhdXRoLmF1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgIDxhIHJvdXRlckxpbms9XCIvc3VibWl0XCIgY2xhc3M9XCJidG4gYnRuLS1naG9zdCBidG4tLWJsb2NrXCI+e3sgJ21hcC5hZGRTaGVsdGVyJyB8IHQgfX08L2E+XG4gICAgICAgIH1cbiAgICAgIDwvZGl2PlxuXG4gICAgICBAaWYgKG5lYXJlc3QoKTsgYXMgbikge1xuICAgICAgICA8cCBjbGFzcz1cIm5lYXJlc3QtbGluZVwiIHJvbGU9XCJzdGF0dXNcIj5cbiAgICAgICAgICB7eyAnbWFwLmFyb3VuZFlvdScgfCB0IH19OiB7eyBuLm5hbWUgfX1cbiAgICAgICAgICBAaWYgKG4uYWRkcmVzcykge1xuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJuZWFyZXN0LWxpbmVfX2FkZHJlc3NcIj4gwrcge3sgbi5hZGRyZXNzIH19PC9zcGFuPlxuICAgICAgICAgIH1cbiAgICAgICAgICA8IS0tIERpc3RhbmNlIGhvbmVzdHkgKGNvbW11bml0eS1yZXZpZXctcXVldWUgRDYpOiB0aGUgc3RyYWlnaHQtbGluZVxuICAgICAgICAgICAgICAgZGlzdGFuY2UgdGhlIHJhbmtpbmcgYWN0dWFsbHkgY29tcHV0ZWQg4oCUIG5ldmVyIGEgcm91dGUgY2xhaW0uIC0tPlxuICAgICAgICAgIEBpZiAobmVhcmVzdEttKCkgIT09IG51bGwpIHtcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibmVhcmVzdC1saW5lX19kaXN0YW5jZVwiPiDCtyB7eyBzdHJhaWdodExpbmVUZXh0KG5lYXJlc3RLbSgpISkgfX08L3NwYW4+XG4gICAgICAgICAgfVxuICAgICAgICA8L3A+XG4gICAgICAgIEBpZiAobi5zb3VyY2UgPT09ICdVU0VSJykge1xuICAgICAgICAgIDwhLS0gVGhlIHVudmVyaWZpZWQgd2FybmluZyBsaW5lOiB3aGVuIHRoZSBoaWdobGlnaHRlZCByb3cgaXMgYVxuICAgICAgICAgICAgICAgY29tbXVuaXR5IHJvdyAoYW55IHJldmlldyBzdGF0dXMg4oCUIG1hcC1icm93c2UgZGVsdGEpLiAtLT5cbiAgICAgICAgICA8cCBjbGFzcz1cIm5lYXJlc3QtbGluZSBuZWFyZXN0LWxpbmUtLXdhcm5pbmdcIj57eyAnc2hlbHRlci51bnZlcmlmaWVkV2FybmluZycgfCB0IH19PC9wPlxuICAgICAgICB9XG4gICAgICAgIEBpZiAobi5pbmFjY3VyYXRlKSB7XG4gICAgICAgICAgPCEtLSBNYXJrZWQgaW5hY2N1cmF0ZTogdGhlIHNpbmdsZS1zb3VyY2VkIHdhcm5pbmcg4oCUXG4gICAgICAgICAgICAgICB0aGUgZmxhZyBpcyB0aGUgdHJlYXRtZW50LCB0aGUgcm93IHN0YXlzIHZpc2libGUuIC0tPlxuICAgICAgICAgIDxwIGNsYXNzPVwibmVhcmVzdC1saW5lIG5lYXJlc3QtbGluZS0td2FybmluZ1wiPnt7ICdhY2NvdW50LmNvbnRyaWIuaW5hY2N1cmF0ZScgfCB0IH19PC9wPlxuICAgICAgICB9XG4gICAgICB9IEBlbHNlIGlmIChuZWFyZXN0RW1wdHkoKSkge1xuICAgICAgICA8cCBjbGFzcz1cIm5lYXJlc3QtbGluZVwiPlxuICAgICAgICAgIHt7ICdtYXAubmVhcmVzdEVtcHR5JyB8IHQgfX1cbiAgICAgICAgICBAaWYgKGF1dGguaW5pdGlhbGl6ZWQoKSAmJiBhdXRoLmF1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgPGEgcm91dGVyTGluaz1cIi9zdWJtaXRcIj57eyAnbWFwLm5lYXJlc3RFbXB0eS5hZGRGaXJzdCcgfCB0IH19PC9hPlxuICAgICAgICAgIH1cbiAgICAgICAgPC9wPlxuICAgICAgfSBAZWxzZSBpZiAobmVhcmVzdEVycm9yKCk7IGFzIG5lYXJlc3RNc2cpIHtcbiAgICAgICAgPHAgY2xhc3M9XCJuZWFyZXN0LWxpbmUgbmVhcmVzdC1saW5lLS1lcnJvclwiIHJvbGU9XCJhbGVydFwiPnt7IG5lYXJlc3RNc2cgfCB0IH19PC9wPlxuICAgICAgfVxuXG4gICAgICBAaWYgKGFuY2hvcigpOyBhcyBhKSB7XG4gICAgICAgIDwhLS0gVGhlIGFjdGl2ZSBicm93c2UgYW5jaG9yIChsb2NhdGlvbi1uYXZpZ2F0aW9uKTogdGhlXG4gICAgICAgICAgICAgc2VhcmNoZWQgcG9pbnQgdGhlIHBlci1yb3cgZGlzdGFuY2VzIGFyZSBtZWFzdXJlZCBmcm9tLCB3aXRoXG4gICAgICAgICAgICAgaXRzIHNpbmdsZSBDbGVhciBhY3Rpb24uIC0tPlxuICAgICAgICA8cCBjbGFzcz1cImFuY2hvci1saW5lXCIgcm9sZT1cInN0YXR1c1wiPlxuICAgICAgICAgIHt7ICdtYXAuc2VhcmNoZWQnIHwgdCB9fSA8c3BhbiBjbGFzcz1cImFuY2hvci1saW5lX19sYWJlbFwiPnt7IGEubGFiZWwgfX08L3NwYW4+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJhbmNob3ItbGluZV9fY2xlYXJcIiAoY2xpY2spPVwiY2xlYXJBbmNob3IoKVwiPlxuICAgICAgICAgICAge3sgJ21hcC5jbGVhcicgfCB0IH19XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvcD5cbiAgICAgIH1cblxuICAgICAgPGRpdiBjbGFzcz1cImZpbHRlci1jaGlwc1wiIHJvbGU9XCJncm91cFwiIFthdHRyLmFyaWEtbGFiZWxdPVwiJ21hcC5maWx0ZXJTb3VyY2VzQXJpYScgfCB0XCI+XG4gICAgICAgIEBmb3IgKGNoaXAgb2Ygc291cmNlRmlsdGVyczsgdHJhY2sgY2hpcC52YWx1ZSkge1xuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgY2xhc3M9XCJjaGlwXCJcbiAgICAgICAgICAgIFtjbGFzcy5jaGlwLS1hY3RpdmVdPVwiZmlsdGVyKCkgPT09IGNoaXAudmFsdWVcIlxuICAgICAgICAgICAgKGNsaWNrKT1cInNldEZpbHRlcihjaGlwLnZhbHVlKVwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAge3sgY2hpcC5sYWJlbEtleSB8IHQgfX1cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgfVxuICAgICAgPC9kaXY+XG5cbiAgICAgIDwhLS0gUHJhY3RpY2FsIGZpbHRlciBjaGlwczogXCJPcGVuXCIgKGNsaWVudC1zaWRlIOKAlCB0aGUgQkUgaGFzIG5vXG4gICAgICAgICAgIG9wZW4vY2xvc2VkIHBhcmFtLCBpdCBmaWx0ZXJzIHRoZSBsb2FkZWQgbGlzdCBhbmQgcmUtcmVuZGVycyB0aGVcbiAgICAgICAgICAgbWFya2VycykgYW5kIFwiSGFzIGNhcGFjaXR5XCIgKHNlcnZlci1zaWRlIGA/aGFzQ2FwYWNpdHk9YCkuIEJvdGhcbiAgICAgICAgICAgYXJlIGNvbXBvc2FibGUgd2l0aCB0aGUgc291cmNlIGNoaXBzIGFib3ZlLiAtLT5cbiAgICAgIDxkaXYgY2xhc3M9XCJmaWx0ZXItdHJ1c3RcIiByb2xlPVwiZ3JvdXBcIiBbYXR0ci5hcmlhLWxhYmVsXT1cIidtYXAudHJ1c3RGaWx0ZXJzQXJpYScgfCB0XCI+XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICBjbGFzcz1cImNoaXAgdHJ1c3QtY2hpcFwiXG4gICAgICAgICAgW2NsYXNzLmNoaXAtLWFjdGl2ZV09XCJvcGVuT25seSgpXCJcbiAgICAgICAgICBbYXR0ci5hcmlhLXByZXNzZWRdPVwib3Blbk9ubHkoKVwiXG4gICAgICAgICAgKGNsaWNrKT1cInRvZ2dsZU9wZW4oKVwiXG4gICAgICAgID5cbiAgICAgICAgICB7eyAnbWFwLmNoaXBPcGVuJyB8IHQgfX1cbiAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICBjbGFzcz1cImNoaXAgdHJ1c3QtY2hpcFwiXG4gICAgICAgICAgW2NsYXNzLmNoaXAtLWFjdGl2ZV09XCJoYXNDYXBhY2l0eSgpXCJcbiAgICAgICAgICBbYXR0ci5hcmlhLXByZXNzZWRdPVwiaGFzQ2FwYWNpdHkoKVwiXG4gICAgICAgICAgKGNsaWNrKT1cInRvZ2dsZUhhc0NhcGFjaXR5KClcIlxuICAgICAgICA+XG4gICAgICAgICAge3sgJ21hcC5jaGlwSGFzQ2FwYWNpdHknIHwgdCB9fVxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICBAaWYgKGVycm9yKCk7IGFzIGVycikge1xuICAgICAgICA8YXBwLWJhbm5lciBzZXZlcml0eT1cImVycm9yXCIgW21lc3NhZ2VdPVwiZXJyXCIgLz5cbiAgICAgIH1cblxuICAgICAgQGlmIChsb2FkaW5nKCkpIHtcbiAgICAgICAgPGFwcC1sb2FkaW5nLWluZGljYXRvciBjbGFzcz1cInNpZGViYXItc3RhdGVcIiBbbWVzc2FnZV09XCInbWFwLmxvYWRpbmcnIHwgdFwiIC8+XG4gICAgICB9IEBlbHNlIGlmIChzaG93RW1wdHkoKSkge1xuICAgICAgICA8IS0tIFRoZSBmaWx0ZXJlZCBsaXN0IGlzIGVtcHR5OiB0aGUgc2hhcmVkIGVtcHR5LXN0YXRlIG5vdGljZSAodGhlXG4gICAgICAgICAgICAgaG9zdCBjbGFzcyBrZWVwcyB0aGUgc2lkZWJhcidzIG11dGVkLCBjZW50cmVkIHNsb3Qgc3R5bGluZykuIC0tPlxuICAgICAgICA8YXBwLWxpc3Qtc3RhdGUgY2xhc3M9XCJzaWRlYmFyLXN0YXRlXCIgW2tpbmRdPVwiJ2VtcHR5J1wiIFttZXNzYWdlS2V5XT1cIidtYXAuZW1wdHlGaWx0ZXInXCIgLz5cbiAgICAgIH0gQGVsc2UgaWYgKHNvcnRlZCgpLmxlbmd0aCkge1xuICAgICAgICA8dWwgI2xpc3RFbCBjbGFzcz1cInNoZWx0ZXItbGlzdFwiIFthdHRyLmFyaWEtbGFiZWxdPVwiJ21hcC5zaGVsdGVyTGlzdEFyaWEnIHwgdFwiPlxuICAgICAgICAgIEBmb3IgKHNoZWx0ZXIgb2Ygc29ydGVkKCk7IHRyYWNrIHNoZWx0ZXIuaWQpIHtcbiAgICAgICAgICAgIDwhLS0gVGhlIGxpIGlzIHRoZSBwZXItc2hlbHRlciByb3cgZWxlbWVudDogdGhlIHNjcm9sbC1zbmFwXG4gICAgICAgICAgICAgICAgIHRhcmdldCAobWFwLXBhZ2Uuc2NzcykgYW5kIHRoZSByb3cgc2Nyb2xsUm93SW50b1ZpZXcgbG9va3NcbiAgICAgICAgICAgICAgICAgdXAgYnkgZGF0YS1zaGVsdGVyLWlkIChtYXJrZXIgY2xpY2sgLyBuZWFyZXN0KS4gLS0+XG4gICAgICAgICAgICA8bGkgW2F0dHIuZGF0YS1zaGVsdGVyLWlkXT1cInNoZWx0ZXIuaWRcIj5cbiAgICAgICAgICAgICAgPCEtLSBSb3cgPSBidXR0b24gKGEgcmVhbCBhY3Rpb246IHNlbGVjdCArIHpvb20sIGtleWJvYXJkXG4gICAgICAgICAgICAgICAgICAgb3BlcmFibGUpLiBJdCBkb2VzIE5PVCBuYXZpZ2F0ZSDigJQgdGhlIGNsaWNrIGZsaWVzIHRoZVxuICAgICAgICAgICAgICAgICAgIG1hcCB0byBzdHJlZXQgbGV2ZWwgYW5kIHRoZSB1c2VyIHN0YXlzIG9uIC9tYXAgKGRlc2lnblxuICAgICAgICAgICAgICAgICAgIGRlY2lzaW9uIDUpLiBUaGUgYWNjZXNzaWJsZSBuYW1lIGlzIHRoZSByb3cncyBvd25cbiAgICAgICAgICAgICAgICAgICB0ZXh0IChuYW1lICsgYWRkcmVzcyArIG1ldGEpLiAtLT5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgIGNsYXNzPVwic2hlbHRlci1yb3dcIlxuICAgICAgICAgICAgICAgIFtjbGFzcy5zaGVsdGVyLXJvdy0tc2VsZWN0ZWRdPVwic2VsZWN0ZWRJZCgpID09PSBzaGVsdGVyLmlkXCJcbiAgICAgICAgICAgICAgICAoY2xpY2spPVwic2VsZWN0U2hlbHRlcihzaGVsdGVyKVwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInNoZWx0ZXItcm93X19uYW1lXCI+e3sgc2hlbHRlci5uYW1lIH19PC9zcGFuPlxuICAgICAgICAgICAgICAgIEBpZiAoc2hlbHRlci5hZGRyZXNzKSB7XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInNoZWx0ZXItcm93X19hZGRyZXNzXCI+e3sgc2hlbHRlci5hZGRyZXNzIH19PC9zcGFuPlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInNoZWx0ZXItcm93X19tZXRhXCI+XG4gICAgICAgICAgICAgICAgICA8IS0tIFNvdXJjZS90cnVzdCBiYWRnZSAoY29tbXVuaXR5LXJldmlldy1xdWV1ZSk6IHJlZ2lzdHJ5XG4gICAgICAgICAgICAgICAgICAgICAgIHJvd3Mgc2F5IHdoaWNoIHJlZ2lzdHJ5OyBVU0VSIHJvd3Mgc2F5IHRoZWlyIHRydXN0XG4gICAgICAgICAgICAgICAgICAgICAgIHN0YXRlIChORVcgPSBcIk5ld2x5IGFkZGVkXCIsIENPTkZJUk1FRCA9XG4gICAgICAgICAgICAgICAgICAgICAgIFwiQ29tbXVuaXR5LWNoZWNrZWRcIiDigJQgb25lIHVuaWZpZWQgeWVsbG93IHRvbmUpLiAtLT5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYmFkZ2VcIiBbbmdDbGFzc109XCJjb21tdW5pdHlCYWRnZUNsYXNzKHNoZWx0ZXIpXCI+XG4gICAgICAgICAgICAgICAgICAgIHt7IHNvdXJjZVRydXN0TGFiZWwoc2hlbHRlcikgfX1cbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIEBpZiAoaXNQcml2YXRlTG9jYXRpb24oc2hlbHRlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJiYWRnZSBiYWRnZS0tcHJpdmF0ZVwiPnt7ICdzaGVsdGVyLnByaXZhdGVCYWRnZScgfCB0IH19PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgPCEtLSBBZGRyZXNzLWFuY2hvciBkaXN0YW5jZSAobG9jYXRpb24tbmF2aWdhdGlvbik6XG4gICAgICAgICAgICAgICAgICAgICAgIHRoZSBzdHJhaWdodC1saW5lIGRpc3RhbmNlIGZyb20gdGhlIHNlYXJjaGVkIHBvaW50IOKAlFxuICAgICAgICAgICAgICAgICAgICAgICB0aGUgc2FtZSBob25lc3R5IGZvcm1hdCBhcyB0aGUgbmVhcmVzdCBsaW5lLCBuZXZlciBhXG4gICAgICAgICAgICAgICAgICAgICAgIHJvdXRlIGNsYWltLiBPbmx5IHdoaWxlIGFuIGFuY2hvciBpcyBhY3RpdmUgKHRoZVxuICAgICAgICAgICAgICAgICAgICAgICBhbmNob3IoKSBjaGVjaywgbm90IHRoZSBkaXN0YW5jZSdzIHRydXRoaW5lc3Mg4oCUIGFcbiAgICAgICAgICAgICAgICAgICAgICAgMCBrbSByZXN1bHQgd291bGQgYmUgZmFsc3kgYW5kIG11c3Qgc3RpbGwgcmVuZGVyKS4gLS0+XG4gICAgICAgICAgICAgICAgICBAaWYgKGFuY2hvcigpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic2hlbHRlci1yb3dfX2FuY2hvci1kaXN0YW5jZSBudW0tdGFidWxhclwiPnt7XG4gICAgICAgICAgICAgICAgICAgICAgc3RyYWlnaHRMaW5lVGV4dChhbmNob3JEaXN0YW5jZShzaGVsdGVyKSEpXG4gICAgICAgICAgICAgICAgICAgIH19PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8IS0tIFRydXN0IGJhZGdlcyAoc2hlbHRlci10cnVzdC1hbmQtcmVwb3J0cyBENik6IHJlZC1vcmFuZ2VcbiAgICAgICAgICAgICAgICAgICAgIFwiUmVwb3J0ZWRcIiAobm9uZXhpc3RlbnRSZXBvcnRzID4gMCksIHRoZVxuICAgICAgICAgICAgICAgICAgICAgZnJlc2gtQ0xPU0VEIHJlcG9ydGVkLXRvbmUgYmFkZ2UgKFwiUmVwb3J0ZWQgY2xvc2VkXCIgYXQgb25lXG4gICAgICAgICAgICAgICAgICAgICBmcmVzaCByZXBvcnQsIFwiQ2xvc2VkXCIgYXQgdHdvKzsgYSBmcmVzaCBPUEVOIHJvd1xuICAgICAgICAgICAgICAgICAgICAgcmVuZGVycyBOTyBiYWRnZSDigJQgb3BlbiBpcyB0aGUgZGVmYXVsdCksIGFuZCB0aGVcbiAgICAgICAgICAgICAgICAgICAgIE5FVVRSQUwgb2NjdXBhbmN5IGJhZGdlIHdpdGggcmVjZW5jeSAoaGVkZ2VkIGF0IG9uZVxuICAgICAgICAgICAgICAgICAgICAgZnJlc2ggcmVwb3J0LCBmaXJtIGF0IHR3byspLiAtLT5cbiAgICAgICAgICAgICAgICBAaWYgKGhhc1RydXN0QmFkZ2VzKHNoZWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInNoZWx0ZXItcm93X19iYWRnZXNcIj5cbiAgICAgICAgICAgICAgICAgICAgQGlmIChoYXNSZXBvcnRzKHNoZWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgPCEtLSBUaGUgY291bnQg4oCUIHRoZSBub25leGlzdGVudFJlcG9ydHMgc3Vic2V0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0IGRyaXZlcyB0aGUgYmFkZ2UgKHNpbmdsZS1zb3VyY2VkKS4gLS0+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJiYWRnZSBiYWRnZS0tcmVwb3J0ZWRcIj57e1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVwb3J0ZWRCYWRnZVRleHQoc2hlbHRlci5ub25leGlzdGVudFJlcG9ydHMpXG4gICAgICAgICAgICAgICAgICAgICAgfX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgQGlmIChvcGVuU3RhdHVzQmFkZ2VUZXh0KHNoZWx0ZXIub3BlblN0YXR1cyk7IGFzIG9wZW5UZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJiYWRnZSBiYWRnZS0tY2xvc2VkXCI+e3sgb3BlblRleHQgfX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgQGlmIChzaGVsdGVyLm9jY3VwYW5jeTsgYXMgb2NjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJiYWRnZSBiYWRnZS0tb2NjdXBhbmN5XCI+e3sgb2NjdXBhbmN5VGV4dChvY2MpIH19PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPCEtLSBUaGUgZXhwbGljaXQgZGV0YWlscyBzdGVwOiBhcHBlYXJzIE9OTFkgb24gdGhlIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgICAgcm93IGFuZCBpcyB0aGUgb25seSBzaWRlYmFyIGVsZW1lbnQgdGhhdCBvcGVuc1xuICAgICAgICAgICAgICAgICAgIC9zaGVsdGVycy86aWQuIFRoZSBhcmlhLWxhYmVsIG5hbWVzIHRoZSBzaGVsdGVyIHNvIHRoZVxuICAgICAgICAgICAgICAgICAgIG5hdmlnYXRpb24gdGFyZ2V0IGlzIHVuYW1iaWd1b3VzIHRvIHNjcmVlbiByZWFkZXJzLiAtLT5cbiAgICAgICAgICAgICAgQGlmIChzZWxlY3RlZElkKCkgPT09IHNoZWx0ZXIuaWQpIHtcbiAgICAgICAgICAgICAgICA8YVxuICAgICAgICAgICAgICAgICAgY2xhc3M9XCJzaGVsdGVyLXJvd19fZGV0YWlscyBidG4gYnRuLS1naG9zdFwiXG4gICAgICAgICAgICAgICAgICBbcm91dGVyTGlua109XCJbJy9zaGVsdGVycycsIHNoZWx0ZXIuaWRdXCJcbiAgICAgICAgICAgICAgICAgIFthdHRyLmFyaWEtbGFiZWxdPVwiKCdtYXAudmlld0RldGFpbHNGb3InIHwgdCkgKyBzaGVsdGVyLm5hbWVcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHt7ICdtYXAudmlld0RldGFpbHMnIHwgdCB9fSDihpJcbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgfVxuICAgICAgICA8L3VsPlxuICAgICAgfVxuXG4gICAgICA8IS0tIFNhZmV0eSBub3RpY2UgbGl2ZXMgaW4gdGhlIHBhZ2Ugc2hlbGwgZm9vdGVyIChwYWdlLXNoZWxsLmh0bWwpOlxuICAgICAgICAgICBpdCBpcyBhcHAtd2lkZSwgbm90IG1hcC1vbmx5LCBhbmQgdGhlIHNoZWx0ZXIgbGlzdCBiZWxvdyBvd25zXG4gICAgICAgICAgIHRoZSBzaWRlYmFyIHNwYWNlLiAtLT5cbiAgICA8L2FzaWRlPlxuICA8L2Rpdj5cblxuICA8IS0tIFwiSG93IE9wZW5TaGVsdGVyIHdvcmtzXCIgKFdvcmtzdHJlYW0gQSk6IHBsYWluLWxhbmd1YWdlIG1lY2hhbmljc1xuICAgICAgIGJsb2NrIHVuZGVyIHRoZSBtYXAgbGF5b3V0LiBFZGl0b3JpYWwgbGF5b3V0LCBub3QgYSBjYXJkOiB0aGUgcGFnZVxuICAgICAgIGJhY2tncm91bmQgY29udGludWVzLCBhIHNpbmdsZSB0b3AgaGFpcmxpbmUgZGl2aWRlcyB0aGUgYmxvY2sgZnJvbVxuICAgICAgIHRoZSBtYXAsIGFuZCB0aGUgY29weSBzaXRzIGluIGEgd2lkdGgtY2FwcGVkIGNvbHVtbiBmb3IgYVxuICAgICAgIGNvbWZvcnRhYmxlIGxpbmUgbGVuZ3RoIChtYXAtcGFnZS5zY3NzKS4gUmh5dGhtOiB0aGUgZmlyc3RcbiAgICAgICBwYXJhZ3JhcGggaXMgdGhlIGxlZGUgKGxhcmdlciB0eXBlIOKAlCBpdCBjYXJyaWVzIHRoZSBcIm5vdCBhblxuICAgICAgIGVtZXJnZW5jeSBzZXJ2aWNlLCBjYWxsIDExMlwiIHBvc2l0aW9uaW5nKSBhbmQgdGhlIGxhc3QgaXMgdGhlXG4gICAgICAgc3RhbmRpbmcgZ3VhcmFudGVlIChxdWlldCBtZWRpdW0gd2VpZ2h0KS4gVGhlIHByb3NlIGJsb2NrIGlzXG4gICAgICAgZGVsaWJlcmF0ZTogYSBmaXZlLXN0ZXAgZXhhbXBsZSBsaXN0IHdvdWxkIHJlc3RhdGUgd2hhdCB0aGVcbiAgICAgICBzb3VyY2VzL3JlcG9ydCBwYXJhZ3JhcGhzIGFscmVhZHkgc2F5ICh0aGUgaG93LmV4YW1wbGUqIGtleXMgc3RheVxuICAgICAgIGluIHRoZSBjYXRhbG9ncywgdW51c2VkKS4gSXQgaXMgdGhlIG9ubHkgaTE4bidkIGNvcHkgb24gdGhpcyBwYWdlXG4gICAgICAgdG9kYXkgKHRoZSByZXN0IG9mIHRoZSBtYXAgY2hyb21lIGlzIHN0aWxsIGhhcmRjb2RlZCBFbmdsaXNoKTtcbiAgICAgICB0aGUgYmFkZ2UgdGVybXMgYXJlIHF1b3RlZCB2ZXJiYXRpbSBzbyB0aGUgdGV4dCBtYXRjaGVzIHdoYXQgdGhlXG4gICAgICAgbWFwIHNob3dzLiAtLT5cbiAgPHNlY3Rpb24gY2xhc3M9XCJtYXAtcGFnZV9faG93XCIgYXJpYS1sYWJlbGxlZGJ5PVwiaG93LXRpdGxlXCI+XG4gICAgPGgyIGNsYXNzPVwibWFwLXBhZ2VfX2hvdy10aXRsZVwiIGlkPVwiaG93LXRpdGxlXCI+e3sgJ2hvdy50aXRsZScgfCB0IH19PC9oMj5cbiAgICA8cCBjbGFzcz1cIm1hcC1wYWdlX19ob3ctbGVkZVwiPnt7ICdob3cud2hhdCcgfCB0IH19PC9wPlxuICAgIDxwPnt7ICdob3cuc291cmNlcycgfCB0IH19PC9wPlxuICAgIDxwPnt7ICdob3cucmVwb3J0JyB8IHQgfX08L3A+XG4gICAgPHA+e3sgJ2hvdy5uZWFyZXN0JyB8IHQgfX08L3A+XG4gICAgPHAgY2xhc3M9XCJtYXAtcGFnZV9faG93LWd1YXJhbnRlZVwiPnt7ICdob3cuZ3VhcmFudGVlJyB8IHQgfX08L3A+XG4gIDwvc2VjdGlvbj5cbjwvc2VjdGlvbj5cbiIsImltcG9ydCB0eXBlIHsgUm91dGVzIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IHRpdGxlR3VhcmQgfSBmcm9tICcuL2NvcmUvdGl0bGUnO1xuaW1wb3J0IHsgYXV0aEd1YXJkLCBhZG1pbkd1YXJkLCBndWVzdEd1YXJkLCB2ZXJpZmllZEd1YXJkIH0gZnJvbSAnLi9jb3JlL2d1YXJkcyc7XG5pbXBvcnQgeyBNYXBQYWdlIH0gZnJvbSAnLi9mZWF0dXJlcy9tYXAvbWFwLXBhZ2UnO1xuXG4vKipcbiAqIFJvdXRlIG1hcCAoMDEgcHVtbCk6XG4gKiAgLSAvbG9naW4gL3JlZ2lzdGVyIC9yZXNldCAoR3Vlc3RHdWFyZCkgKyBob21lICgvbWFwLCBwdWJsaWMpXG4gKiAgLSAvdmVyaWZ5ICsgL2FjY291bnQgKEF1dGhHdWFyZCk7IC9hY2NvdW50IGlzIHRoZSBmdWxsIEFjY291bnRQYWdlIChyZWFsXG4gKiAgICBwcm9maWxlICsgcGVyLWNvbnRhY3QgdmVyaWZpY2F0aW9uIGxhYmVscyArIHBhc3N3b3JkLWNvbmZpcm1lZCBpZGVudGl0eVxuICogICAgZWRpdCkuIFZlcmlmeSBpcyBub3QgYSB0b3AtbmF2IGl0ZW0g4oCUIC92ZXJpZnkgc3RheXMgZm9yIGd1YXJkIHJlZGlyZWN0c1xuICogICAgYW5kIENUQXNcbiAqICAtIC9tYXAgaXMgdGhlIExlYWZsZXQgYnJvd3NlIG1hcDsgL3NoZWx0ZXJzLzppZCB0aGUgcHVibGljIGRldGFpbCBwYWdlXG4gKiAgICAobWFya2VyL3JvdyBuYXZpZ2F0aW9uIGxhbmRzIHRoZXJlOyB0aGUgdHJ1c3QtbGF5ZXIgY29udHJvbHMgYnJhbmNoIG9uXG4gKiAgICBhdXRoL3ZlcmlmaWNhdGlvbiBpbi1jb21wb25lbnQpLCAvc3VibWl0IChBdXRoR3VhcmQgKyBWZXJpZmllZEd1YXJkKVxuICogICAg4oCUIGFuZCAvc3VibWl0P2VkaXQ9PGlkPiAoTTUsIHNoZWx0ZXIgZWRpdGluZyByZXVzZXMgdGhlIGFkZCBmb3JtKTpcbiAqICAgIHRoZSBTQU1FIGZvcm0gaW4gYW4gZXhwbGljaXQgZWRpdCBtb2RlLiBBIHF1ZXJ5IHBhcmFtLCBub3QgYSBuZXdcbiAqICAgIHJvdXRlLCBrZWVwcyBPTkUgcm91dGUgZW50cnkgKyBPTkUgbGF6eSBjaHVuayArIHRoZSBzYW1lIGd1YXJkcywgYW5kXG4gKiAgICB0aGUgY3JlYXRpb24gcGF0aCAvc3VibWl0IGlzIGxpdGVyYWxseSB1bmNoYW5nZWQgKG5vIHBhcmFtKS4gVGhlXG4gKiAgICBhY2NvdW50IHBhbmVsJ3MgRWRpdCBvcGVucyAvc3VibWl0P2VkaXQ9PGlkPjsgdGhlIHBhZ2UgcHJlZmlsbHMgZnJvbVxuICogICAgR0VUIC9hcGkvc2hlbHRlcnMvbWluZSAob3duZXItc2NvcGVkKSBhbmQgc2F2ZXMgd2l0aFxuICogICAgUFVUIC9hcGkvc2hlbHRlcnMve2lkfSDigJQgdGhlIGVkaXQgcHVibGlzaGVzIGltbWVkaWF0ZWx5ICh0aGUgcm93J3NcbiAqICAgIHN0YXR1cyBpcyB1bnRvdWNoZWQsIHNvIGEgcHVibGlzaGVkIHNoZWx0ZXIgbmV2ZXIgbGVhdmVzIHRoZSBtYXApXG4gKiAgICBhbmQgY2FycmllcyB0aGUgcGVuZGluZy12ZXJpZmljYXRpb24gKE5FVykgdHJ1c3Qgc3RhdGUgYSBuZXdcbiAqICAgIHN1Ym1pc3Npb24gZ2V0cy5cbiAqICAtIGV2ZXJ5IHJvdXRlIGNhcnJpZXMgYGRhdGEudGl0bGVgICsgdGl0bGVHdWFyZCDigJQgdGhlIGJyb3dzZXIgdGFiXG4gKiAgICBzaG93cyBcIjxQYWdlPiDigJQgT3BlblNoZWx0ZXJcIiAoY29yZS90aXRsZS50cywgdGVzdGVkIGluIHRpdGxlLnNwZWMudHMpLlxuICogICAgL3NoZWx0ZXJzLzppZCBhbmQgL3N1Ym1pdCBhcmUgbG9hZENvbXBvbmVudC1sYXp5IChidW5kbGUgYnVkZ2V0IOKAlFxuICogICAgc2VlIHRoZSBhbmd1bGFyLmpzb24gYnVkZ2V0cyBub3RlKTsgdGhlIGZpdmUgYXV0aC9hY2NvdW50IHJvdXRlc1xuICogICAgKGxvZ2luLCByZWdpc3RlciwgcmVzZXQsIHZlcmlmeSwgYWNjb3VudCkgYXJlIGxhenkgZm9yIHRoZSBzYW1lXG4gKiAgICByZWFzb24g4oCUIG5vbmUgb2YgdGhlbSBpcyBuZWVkZWQgZm9yIGZpcnN0IHBhaW50IG9mIHRoZSBtYXAuIExlYWZsZXRcbiAqICAgIHN0YXlzIGluaXRpYWwgYmVjYXVzZSB0aGUgZGVmYXVsdCAvbWFwIHJvdXRlIG5lZWRzIGl0LlxuICovXG5leHBvcnQgY29uc3Qgcm91dGVzOiBSb3V0ZXMgPSBbXG4gIHsgcGF0aDogJycsIHBhdGhNYXRjaDogJ2Z1bGwnLCByZWRpcmVjdFRvOiAnbWFwJyB9LFxuICB7IHBhdGg6ICdtYXAnLCBjb21wb25lbnQ6IE1hcFBhZ2UsIGRhdGE6IHsgdGl0bGU6ICd0aXRsZS5tYXAnIH0sIGNhbkFjdGl2YXRlOiBbdGl0bGVHdWFyZF0gfSxcbiAgLy8gTGF6eSAoYnVuZGxlIGJ1ZGdldCk6IHRoZSBhdXRoIGZsb3cgaXMgb25seSBuZWVkZWQgb25jZSBhIHZpc2l0b3JcbiAgLy8gbGVhdmVzIHRoZSBtYXAg4oCUIG5ldmVyIGZvciBmaXJzdCBwYWludC5cbiAge1xuICAgIHBhdGg6ICdsb2dpbicsXG4gICAgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL2F1dGgvbG9naW4tcGFnZScpLnRoZW4oKG0pID0+IG0uTG9naW5QYWdlKSxcbiAgICBkYXRhOiB7IHRpdGxlOiAndGl0bGUubG9naW4nIH0sXG4gICAgY2FuQWN0aXZhdGU6IFt0aXRsZUd1YXJkLCBndWVzdEd1YXJkXSxcbiAgfSxcbiAge1xuICAgIHBhdGg6ICdyZWdpc3RlcicsXG4gICAgbG9hZENvbXBvbmVudDogKCkgPT5cbiAgICAgIGltcG9ydCgnLi9mZWF0dXJlcy9hdXRoL3JlZ2lzdGVyLXBhZ2UnKS50aGVuKChtKSA9PiBtLlJlZ2lzdGVyUGFnZSksXG4gICAgZGF0YTogeyB0aXRsZTogJ3RpdGxlLnJlZ2lzdGVyJyB9LFxuICAgIGNhbkFjdGl2YXRlOiBbdGl0bGVHdWFyZCwgZ3Vlc3RHdWFyZF0sXG4gIH0sXG4gIHtcbiAgICBwYXRoOiAncmVzZXQnLFxuICAgIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9hdXRoL3Jlc2V0LXBhZ2UnKS50aGVuKChtKSA9PiBtLlJlc2V0UGFnZSksXG4gICAgZGF0YTogeyB0aXRsZTogJ3RpdGxlLnJlc2V0JyB9LFxuICAgIGNhbkFjdGl2YXRlOiBbdGl0bGVHdWFyZCwgZ3Vlc3RHdWFyZF0sXG4gIH0sXG4gIC8vIExhenkgKGJ1bmRsZSBidWRnZXQpOiB2ZXJpZmljYXRpb24gb25seSBoYXBwZW5zIGFmdGVyIGEgbG9naW4uXG4gIHtcbiAgICBwYXRoOiAndmVyaWZ5JyxcbiAgICBsb2FkQ29tcG9uZW50OiAoKSA9PlxuICAgICAgaW1wb3J0KCcuL2ZlYXR1cmVzL2FjY291bnQvdmVyaWZ5LXBhZ2UnKS50aGVuKChtKSA9PiBtLlZlcmlmeVBhZ2UpLFxuICAgIGRhdGE6IHsgdGl0bGU6ICd0aXRsZS52ZXJpZnknIH0sXG4gICAgY2FuQWN0aXZhdGU6IFt0aXRsZUd1YXJkLCBhdXRoR3VhcmRdLFxuICB9LFxuICAvLyBMYXp5IChidW5kbGUgYnVkZ2V0KTogdGhlIGFjY291bnQgcGFnZSBvbmx5IGV4aXN0cyBmb3Igc2lnbmVkLWluIHVzZXJzLlxuICB7XG4gICAgcGF0aDogJ2FjY291bnQnLFxuICAgIGxvYWRDb21wb25lbnQ6ICgpID0+XG4gICAgICBpbXBvcnQoJy4vZmVhdHVyZXMvYWNjb3VudC9hY2NvdW50LXBhZ2UnKS50aGVuKChtKSA9PiBtLkFjY291bnRQYWdlKSxcbiAgICBkYXRhOiB7IHRpdGxlOiAndGl0bGUuYWNjb3VudCcgfSxcbiAgICBjYW5BY3RpdmF0ZTogW3RpdGxlR3VhcmQsIGF1dGhHdWFyZF0sXG4gIH0sXG4gIC8vIGxlZ2FsLXJlY292ZXJ5OiBzdGF0aWMgbGVnYWwgcGFnZXMsIG5vIGJhY2tlbmQg4oCUIGxhenkgZm9yXG4gIC8vIHRoZSBzYW1lIGJ1bmRsZS1idWRnZXQgcmVhc29uIGFzIHRoZSBvdGhlciByYXJlIHJvdXRlcy5cbiAge1xuICAgIHBhdGg6ICdwcml2YWN5JyxcbiAgICBsb2FkQ29tcG9uZW50OiAoKSA9PlxuICAgICAgaW1wb3J0KCcuL2ZlYXR1cmVzL2xlZ2FsL3ByaXZhY3ktcG9saWN5LXBhZ2UnKS50aGVuKChtKSA9PiBtLlByaXZhY3lQb2xpY3lQYWdlKSxcbiAgICBkYXRhOiB7IHRpdGxlOiAndGl0bGUucHJpdmFjeScgfSxcbiAgICBjYW5BY3RpdmF0ZTogW3RpdGxlR3VhcmRdLFxuICB9LFxuICB7XG4gICAgcGF0aDogJ3Rlcm1zJyxcbiAgICBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvbGVnYWwvdGVybXMtcGFnZScpLnRoZW4oKG0pID0+IG0uVGVybXNQYWdlKSxcbiAgICBkYXRhOiB7IHRpdGxlOiAndGl0bGUudGVybXMnIH0sXG4gICAgY2FuQWN0aXZhdGU6IFt0aXRsZUd1YXJkXSxcbiAgfSxcbiAgLy8gUHVibGljOiBhbm9ueW1vdXMgdmlzaXRvcnMgc2VlIHRoZSBkZXRhaWwgd2l0aG91dCB0aGUgdHJ1c3QtbGF5ZXJcbiAgLy8gY29udHJvbHMgKHJlcG9ydCAvIG9jY3VwYW5jeSAvIG9wZW4tY2xvc2VkKTsgdGhlIHBhZ2UgaXRzZWxmIGJyYW5jaGVzXG4gIC8vIG9uIGF1dGgvdmVyaWZpY2F0aW9uIChkZXNpZ24gZGVjaXNpb24gMikuXG4gIHtcbiAgICBwYXRoOiAnc2hlbHRlcnMvOmlkJyxcbiAgICAvLyBMYXp5IChidW5kbGUgYnVkZ2V0KTogdGhlIGRldGFpbCBwYWdlIGlzIG9ubHkgbmVlZGVkIGFmdGVyIGFcbiAgICAvLyBtYXJrZXIvcm93IGNsaWNrLCBub3QgZm9yIGZpcnN0IHBhaW50IG9mIHRoZSBtYXAuXG4gICAgbG9hZENvbXBvbmVudDogKCkgPT5cbiAgICAgIGltcG9ydCgnLi9mZWF0dXJlcy9zaGVsdGVyL3NoZWx0ZXItZGV0YWlsLXBhZ2UnKS50aGVuKChtKSA9PiBtLlNoZWx0ZXJEZXRhaWxQYWdlKSxcbiAgICBkYXRhOiB7IHRpdGxlOiAndGl0bGUuc2hlbHRlckRldGFpbCcgfSxcbiAgICBjYW5BY3RpdmF0ZTogW3RpdGxlR3VhcmRdLFxuICB9LFxuICAvLyBQdWJsaWM6IHRoZSBjcmlzaXMtZ3VpZGFuY2UgaW5kZXggKGNyaXNpcy1ndWlkYW5jZSBENC9ENikg4oCUIHBlcm1pdC1hbGwsXG4gIC8vIHRoZSB0b3AtbmF2IGl0ZW0gbGFuZHMgaGVyZS5cbiAge1xuICAgIHBhdGg6ICdibG9nJyxcbiAgICAvLyBMYXp5IChidW5kbGUgYnVkZ2V0KTogdGhlIGluZGV4IGlzIG5vdCBuZWVkZWQgZm9yIGZpcnN0IHBhaW50IG9mIHRoZSBtYXAuXG4gICAgbG9hZENvbXBvbmVudDogKCkgPT5cbiAgICAgIGltcG9ydCgnLi9mZWF0dXJlcy9ndWlkYW5jZS9ndWlkYW5jZS1saXN0LXBhZ2UnKS50aGVuKChtKSA9PiBtLkd1aWRhbmNlTGlzdFBhZ2UpLFxuICAgIGRhdGE6IHsgdGl0bGU6ICd0aXRsZS5ndWlkYW5jZScgfSxcbiAgICBjYW5BY3RpdmF0ZTogW3RpdGxlR3VhcmRdLFxuICB9LFxuICAvLyBQdWJsaWM6IG9uZSBwdWJsaXNoZWQgZ3VpZGFuY2UgcG9zdCBieSBzbHVnIOKAlCBhIGRyYWZ0IHNsdWcgYW5kIGFuXG4gIC8vIHVua25vd24gc2x1ZyBhbnN3ZXIgdGhlIFNBTUUgNDA0IChENCwgdGhlIHBhZ2UgcmVuZGVycyBub3QtZm91bmQpLlxuICB7XG4gICAgcGF0aDogJ2Jsb2cvOnNsdWcnLFxuICAgIC8vIExhenkgKGJ1bmRsZSBidWRnZXQpOiBhIHBvc3QgaXMgb25seSBuZWVkZWQgYWZ0ZXIgYW4gaW5kZXggY2xpY2suXG4gICAgbG9hZENvbXBvbmVudDogKCkgPT5cbiAgICAgIGltcG9ydCgnLi9mZWF0dXJlcy9ndWlkYW5jZS9ndWlkYW5jZS1kZXRhaWwtcGFnZScpLnRoZW4oKG0pID0+IG0uR3VpZGFuY2VEZXRhaWxQYWdlKSxcbiAgICBkYXRhOiB7IHRpdGxlOiAndGl0bGUuZ3VpZGFuY2VEZXRhaWwnIH0sXG4gICAgY2FuQWN0aXZhdGU6IFt0aXRsZUd1YXJkXSxcbiAgfSxcbiAgLy8gVmVyaWZpZWQgYWNjb3VudHMgb25seSDigJQgbWlycm9ycyB0aGUgYmFja2VuZCA0MDMgKGRlc2lnbiBkZWNpc2lvbiA1KS5cbiAgLy8gL3N1Ym1pdD9lZGl0PTxpZD4gKE01KTogdGhpcyBzYW1lIGNvbXBvbmVudCBpbiBlZGl0IG1vZGUg4oCUIHNlZSB0aGVcbiAgLy8gcm91dGUtbWFwIGNvbW1lbnQgYWJvdmU7IHRoZSA/ZWRpdCBwYXJhbSBpcyByZWFkIGJ5IHRoZSBwYWdlIGl0c2VsZlxuICAvLyAoQWN0aXZhdGVkUm91dGUpLCBubyByb3V0ZSBjaGFuZ2UuXG4gIHtcbiAgICBwYXRoOiAnc3VibWl0JyxcbiAgICAvLyBMYXp5IChidW5kbGUgYnVkZ2V0KTogZm9ybSArIG1pbmktbWFwIGNvZGUgZGVmZXJzIHVudGlsIGEgdmVyaWZpZWRcbiAgICAvLyB1c2VyIGFjdHVhbGx5IG9wZW5zIHRoZSByb3V0ZS5cbiAgICBsb2FkQ29tcG9uZW50OiAoKSA9PlxuICAgICAgaW1wb3J0KCcuL2ZlYXR1cmVzL3NoZWx0ZXIvc3VibWl0LXNoZWx0ZXItcGFnZScpLnRoZW4oKG0pID0+IG0uU3VibWl0U2hlbHRlclBhZ2UpLFxuICAgIGRhdGE6IHsgdGl0bGU6ICd0aXRsZS5zdWJtaXQnIH0sXG4gICAgY2FuQWN0aXZhdGU6IFt0aXRsZUd1YXJkLCBhdXRoR3VhcmQsIHZlcmlmaWVkR3VhcmRdLFxuICB9LFxuICAvLyBBZG1pbi1raW5kIG9ubHkgKGFkbWluLW1vZGVyYXRpb24gRDIpOiBhZG1pbkd1YXJkIHNlbmRzIEJPVEggYW5vbnltb3VzXG4gIC8vIGFuZCBhdXRoZW50aWNhdGVkIG5vbi1hZG1pbnMgaG9tZTsgdGhlIGJhY2tlbmQgcmUtY2hlY2tzIGtpbmQgcGVyXG4gIC8vIHJlcXVlc3QsIHNvIHRoaXMgaXMgVVgsIG5vdCBlbmZvcmNlbWVudC5cbiAge1xuICAgIHBhdGg6ICdhZG1pbicsXG4gICAgLy8gTGF6eSAoYnVuZGxlIGJ1ZGdldCk6IHRoZSBtb2RlcmF0aW9uIHRvb2wgaXMgYSByYXJlIHJvdXRlIOKAlCBubyBvdGhlclxuICAgIC8vIHBhZ2UgbmVlZHMgaXRzIGNvZGUuXG4gICAgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL2FkbWluL2FkbWluLXBhZ2UnKS50aGVuKChtKSA9PiBtLkFkbWluUGFnZSksXG4gICAgZGF0YTogeyB0aXRsZTogJ3RpdGxlLmFkbWluJyB9LFxuICAgIGNhbkFjdGl2YXRlOiBbdGl0bGVHdWFyZCwgYWRtaW5HdWFyZF0sXG4gIH0sXG4gIHsgcGF0aDogJyoqJywgcmVkaXJlY3RUbzogJ21hcCcgfSxcbl07XG4iLCJpbXBvcnQgeyBIdHRwRXJyb3JSZXNwb25zZSwgdHlwZSBIdHRwSW50ZXJjZXB0b3JGbiB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi9odHRwJztcbmltcG9ydCB7IGluamVjdCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgUm91dGVyIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IGZyb20gfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNhdGNoRXJyb3IsIG1lcmdlTWFwLCB0aHJvd0Vycm9yIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBBdXRoU3RvcmUgfSBmcm9tICcuLi9zZXNzaW9uL2F1dGgtc3RvcmUnO1xuaW1wb3J0IHsgVG9rZW5TdG9yZSB9IGZyb20gJy4vdG9rZW4tc3RvcmUnO1xuXG4vKipcbiAqIFB1YmxpYyBhdXRoIGVuZHBvaW50cyB0aGF0IG11c3QgbmV2ZXIgcmVjZWl2ZSBhIEJlYXJlciB0b2tlbiBhbmQgd2hvc2VcbiAqIDQwMXMgYXJlIGhhbmRsZWQgYnkgdGhlaXIgb3duIGNhbGxlcnMgKHRoZSBsb2dpbiBwYWdlIC8gQXV0aFN0b3JlIGJvb3QpLlxuICovXG5jb25zdCBOT19CRUFSRVJfRU5EUE9JTlQgPSAvXFwvYXV0aFxcLyhsb2dpbnxyZWZyZXNoKSQvO1xuXG4vKipcbiAqIEVuZHBvaW50cyB3aG9zZSA0MDEgaXMgYSBCVVNJTkVTUyBlcnJvciBvd25lZCBieSB0aGUgY2FsbGVyLCBub3QgYW5cbiAqIGV4cGlyZWQgYWNjZXNzIHRva2VuIOKAlCBubyByZWZyZXNoIGRhbmNlIGZvciB0aGVtOlxuICogIC0gL2F1dGgvbG9naW4gfCAvYXV0aC9yZWZyZXNoOiB0aGVpciBjYWxsZXJzIG93biB0aGUgNDAxIChsb2dpbiBwYWdlIC9cbiAqICAgIEF1dGhTdG9yZSBib290IHJvdGF0aW9uKTtcbiAqICAtIC9hY2NvdW50L3Byb2ZpbGU6IHRoZSBiYWNrZW5kIG1hcHMgXCJjdXJyZW50IHBhc3N3b3JkIGlzIGluY29ycmVjdFwiXG4gKiAgICBvbnRvIDQwMSAoQWNjb3VudFNlcnZpY2UpLiBSZWZyZXNoaW5nIG9uIGl0IHdvdWxkIHNwZW5kIGEgdG9rZW5cbiAqICAgIHJvdGF0aW9uIG9uIGV2ZXJ5IHR5cG8gYW5kIOKAlCB3aXRoIGEgZGVhZCByZWZyZXNoIHRva2VuIOKAlCBib3VuY2UgdGhlXG4gKiAgICB1c2VyIHRvIC9sb2dpbj9zZXNzaW9uPWV4cGlyZWQuIFRoZSBhY2NvdW50IHBhZ2UgYWxyZWFkeSByZW5kZXJzIHRoZVxuICogICAgYmFja2VuZCBtZXNzYWdlIChiYW5uZXJNZXNzYWdlIGtpbmQgJ3Byb2ZpbGUnIGVjaG9lcyBpdCkuXG4gKi9cbmNvbnN0IE5PX1JFRlJFU0hfREFOQ0VfRU5EUE9JTlQgPSAvXFwvYXV0aFxcLyhsb2dpbnxyZWZyZXNoKSR8XFwvYWNjb3VudFxcL3Byb2ZpbGUkLztcblxuZnVuY3Rpb24gaXNBdXRoRm9ybUVuZHBvaW50KHVybDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBOT19CRUFSRVJfRU5EUE9JTlQudGVzdCh1cmwpO1xufVxuXG5mdW5jdGlvbiBpc0J1c2luZXNzNDAxRW5kcG9pbnQodXJsOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIE5PX1JFRlJFU0hfREFOQ0VfRU5EUE9JTlQudGVzdCh1cmwpO1xufVxuXG4vKipcbiAqIEFwaUludGVyY2VwdG9yIChmdW5jdGlvbmFsIGludGVyY2VwdG9yLCAwMy1DT05URVhULUNPUkUtQVVUSC5tZCk6XG4gKiAgMS4gYXR0YWNoZXMgYEF1dGhvcml6YXRpb246IEJlYXJlciA8YWNjZXNzPmAgdG8gZXZlcnkgcmVxdWVzdCBjYXJyeWluZyBhXG4gKiAgICAgdG9rZW4g4oCUIG5ldmVyIHRvIC9hdXRoL2xvZ2luIG9yIC9hdXRoL3JlZnJlc2ggKHB1YmxpYyBlbmRwb2ludHM7XG4gKiAgICAgL2FjY291bnQvcHJvZmlsZSBET0VTIHJlY2VpdmUgdGhlIHRva2VuIOKAlCBpdCBpcyBhbiBhdXRoZW50aWNhdGVkIGNhbGwpO1xuICogIDIuIG9uIGEgNDAxIG1pZC1zZXNzaW9uOiBzaW5nbGUtZmxpZ2h0IEF1dGhTdG9yZS5yZWZyZXNoKCksIHRoZW4gcmV0cmllc1xuICogICAgIHRoZSBvcmlnaW5hbCByZXF1ZXN0IG9uY2Ugd2l0aCB0aGUgbmV3IHRva2VuO1xuICogIDMuIG9uIHJlZnJlc2ggZmFpbHVyZSAoQXV0aFN0b3JlIGhhcyBhbHJlYWR5IGNsZWFyZWQgdGhlIHNlc3Npb24pIE9SIG9uXG4gKiAgICAgYSA0MDEgYnkgdGhlIFBPU1QtUkVGUkVTSCBSRVRSWSAodGhlIGZyZXNobHkgcm90YXRlZCB0b2tlbiBpcyBhbHNvXG4gKiAgICAgaW52YWxpZCDigJQgdGhlIHNlc3Npb24gaXMgZGVmaW5pdGl2ZWx5IGRlYWQpOiByZWRpcmVjdCB0b1xuICogICAgIC9sb2dpbj9zZXNzaW9uPWV4cGlyZWQgYW5kIHJldGhyb3cgc28gdGhlIHBhZ2UgcmVuZGVycyBpdHMgZXJyb3Igc3RhdGUuXG4gKlxuICogNDAxIGlzIGhhbmRsZWQgZXhhY3RseSBvbmNlLCBoZXJlIOKAlCBwYWdlcyBuZXZlciBjYXRjaCA0MDEgdGhlbXNlbHZlc1xuICogKGV4Y2VwdCB0aGUgYnVzaW5lc3MgNDAxcyBsaXN0ZWQgaW4gTk9fUkVGUkVTSF9EQU5DRV9FTkRQT0lOVCkuXG4gKi9cbmV4cG9ydCBjb25zdCBhcGlJbnRlcmNlcHRvcjogSHR0cEludGVyY2VwdG9yRm4gPSAocmVxLCBuZXh0KSA9PiB7XG4gIGNvbnN0IHRva2VucyA9IGluamVjdChUb2tlblN0b3JlKTtcbiAgY29uc3QgYXV0aFN0b3JlID0gaW5qZWN0KEF1dGhTdG9yZSk7XG4gIGNvbnN0IHJvdXRlciA9IGluamVjdChSb3V0ZXIpO1xuXG4gIGNvbnN0IGF1dGhGb3JtUmVxdWVzdCA9IGlzQXV0aEZvcm1FbmRwb2ludChyZXEudXJsKTtcbiAgY29uc3QgYWNjZXNzID0gdG9rZW5zLmFjY2VzcygpO1xuICBjb25zdCBvdXRnb2luZyA9XG4gICAgYWNjZXNzICE9PSBudWxsICYmICFhdXRoRm9ybVJlcXVlc3RcbiAgICAgID8gcmVxLmNsb25lKHsgc2V0SGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7YWNjZXNzfWAgfSB9KVxuICAgICAgOiByZXE7XG5cbiAgcmV0dXJuIG5leHQob3V0Z29pbmcpLnBpcGUoXG4gICAgY2F0Y2hFcnJvcigoZXJyb3I6IHVua25vd24pID0+IHtcbiAgICAgIGlmICghKGVycm9yIGluc3RhbmNlb2YgSHR0cEVycm9yUmVzcG9uc2UpKSB7XG4gICAgICAgIHJldHVybiB0aHJvd0Vycm9yKCgpID0+IGVycm9yKTtcbiAgICAgIH1cbiAgICAgIC8vIDQwMXMgb24gL2F1dGgvbG9naW58cmVmcmVzaCBhbmQgL2FjY291bnQvcHJvZmlsZSBiZWxvbmcgdG8gdGhlaXJcbiAgICAgIC8vIGNhbGxlcnMgKGxvZ2luIHBhZ2UgLyBBdXRoU3RvcmUgYm9vdCAvIGFjY291bnQgcGFnZSkg4oCUIG5vIHJlZnJlc2hcbiAgICAgIC8vIGRhbmNlOyB0aGUgZXJyb3IgcHJvcGFnYXRlcyB0byB0aGUgcGFnZSB1bnRvdWNoZWQuXG4gICAgICBpZiAoZXJyb3Iuc3RhdHVzICE9PSA0MDEgfHwgYXV0aEZvcm1SZXF1ZXN0IHx8IGlzQnVzaW5lc3M0MDFFbmRwb2ludChyZXEudXJsKSkge1xuICAgICAgICByZXR1cm4gdGhyb3dFcnJvcigoKSA9PiBlcnJvcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZnJvbShhdXRoU3RvcmUucmVmcmVzaCgpKS5waXBlKFxuICAgICAgICBtZXJnZU1hcCgocmVmcmVzaGVkKSA9PiB7XG4gICAgICAgICAgaWYgKCFyZWZyZXNoZWQpIHtcbiAgICAgICAgICAgIC8vIFNlc3Npb24gaXMgZGVhZCAocmVmcmVzaCB0b2tlbiByZXZva2VkL2V4cGlyZWQpLiBBdXRoU3RvcmUgaGFzXG4gICAgICAgICAgICAvLyBhbHJlYWR5IGNsZWFyZWQgc3RvcmFnZSDigJQgdGVsbCB0aGUgdXNlciB3aHkgdGhleSBsYW5kZWQgb24gbG9naW4uXG4gICAgICAgICAgICB2b2lkIHJvdXRlci5uYXZpZ2F0ZShbJy9sb2dpbiddLCB7IHF1ZXJ5UGFyYW1zOiB7IHNlc3Npb246ICdleHBpcmVkJyB9IH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRocm93RXJyb3IoKCkgPT4gZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBmcmVzaCA9IHRva2Vucy5hY2Nlc3MoKTtcbiAgICAgICAgICBjb25zdCByZXRyaWVkID1cbiAgICAgICAgICAgIGZyZXNoID09PSBudWxsXG4gICAgICAgICAgICAgID8gb3V0Z29pbmdcbiAgICAgICAgICAgICAgOiBvdXRnb2luZy5jbG9uZSh7IHNldEhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2ZyZXNofWAgfSB9KTtcbiAgICAgICAgICAvLyBUaGlzIG5leHQocmV0cmllZCkgaXMgYSBkaXJlY3QgcGlwZSBpbnRvIHRoZSB0cmFuc3BvcnQg4oCUIHRoZVxuICAgICAgICAgIC8vIHJldHJ5IGRvZXMgTk9UIHBhc3MgYmFjayB0aHJvdWdoIHRoaXMgaW50ZXJjZXB0b3IsIHNvIGEgNDAxIGhlcmVcbiAgICAgICAgICAvLyBjYW4gbmV2ZXIgdHJpZ2dlciBhbm90aGVyIHJlZnJlc2ggKG5vIGluZmluaXRlIGxvb3ApLiBUcmVhdCB0aGVcbiAgICAgICAgICAvLyBwb3N0LXJlZnJlc2ggNDAxIGFzIHNlc3Npb24taW52YWxpZDogcmVkaXJlY3QgZXhhY3RseSBsaWtlIHRoZVxuICAgICAgICAgIC8vIGZhaWxlZC1yZWZyZXNoIHBhdGgsIGFuZCByZXRocm93IHNvIHRoZSBwYWdlIHJlbmRlcnMgaXRzIGVycm9yXG4gICAgICAgICAgLy8gc3RhdGUuXG4gICAgICAgICAgcmV0dXJuIG5leHQocmV0cmllZCkucGlwZShcbiAgICAgICAgICAgIGNhdGNoRXJyb3IoKHJldHJ5RXJyb3I6IHVua25vd24pID0+IHtcbiAgICAgICAgICAgICAgaWYgKHJldHJ5RXJyb3IgaW5zdGFuY2VvZiBIdHRwRXJyb3JSZXNwb25zZSAmJiByZXRyeUVycm9yLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgdm9pZCByb3V0ZXIubmF2aWdhdGUoWycvbG9naW4nXSwgeyBxdWVyeVBhcmFtczogeyBzZXNzaW9uOiAnZXhwaXJlZCcgfSB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gdGhyb3dFcnJvcigoKSA9PiByZXRyeUVycm9yKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICB9KSxcbiAgKTtcbn07XG4iLCJpbXBvcnQgeyBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgQ29tcG9uZW50LCBpbmplY3QsIHR5cGUgT25Jbml0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBBdXRoU3RvcmUgfSBmcm9tICcuL3Nlc3Npb24vYXV0aC1zdG9yZSc7XG5pbXBvcnQgeyBDb25zZW50QmFubmVyIH0gZnJvbSAnLi9zaGFyZWQvY29uc2VudC1iYW5uZXIuY29tcG9uZW50JztcbmltcG9ydCB7IFBhZ2VTaGVsbCB9IGZyb20gJy4vc2hhcmVkL3BhZ2Utc2hlbGwnO1xuXG4vKipcbiAqIFJvb3QuIFJlbmRlcnMgdGhlIFBhZ2VTaGVsbCAoaGVhZGVyICsgcm91dGVyLW91dGxldCkgYW5kIHRoZSBjb25zZW50XG4gKiBiYW5uZXIgYXMgaXRzIHNpYmxpbmdzLCBhbmQga2lja3Mgb2ZmIHRoZSBvbmUtdGltZSBib290IGluaXQ6XG4gKiBBdXRoU3RvcmUuaW5pdCgpIHNpbGVudGx5IHJlZnJlc2hlcyBhIHBlcnNpc3RlZCBzZXNzaW9uIGJlZm9yZSB0aGUgZmlyc3RcbiAqIGd1YXJkIGRlY2lkZXMgKG5vIGxvZ2luIGZsYXNoIG9uIHJlbG9hZCkuIFRoZSBiYW5uZXIgc2l0cyBhdCB0aGUgcm9vdFxuICogKGEgbW9kYWwgYmVsb25ncyBhdCB0aGUgcm9vdCkgc28gbm8gc2hlbGwgYW5jZXN0b3IgY2FuIGJveCBvciBjbGlwIGl0c1xuICogZml4ZWQgb3ZlcmxheS5cbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYXBwLXJvb3QnLFxuICBpbXBvcnRzOiBbUGFnZVNoZWxsLCBDb25zZW50QmFubmVyXSxcbiAgdGVtcGxhdGVVcmw6ICcuL2FwcC5odG1sJyxcbiAgc3R5bGVVcmw6ICcuL2FwcC5zY3NzJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIEFwcCBpbXBsZW1lbnRzIE9uSW5pdCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgYXV0aCA9IGluamVjdChBdXRoU3RvcmUpO1xuXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIHZvaWQgdGhpcy5hdXRoLmluaXQoKTtcbiAgfVxufVxuIiwiPGFwcC1wYWdlLXNoZWxsIC8+XG48IS0tIFRoZSBmaXJzdC1sZXZlbCBkYXRhLXVzYWdlIG5vdGljZSAoV29ya3N0cmVhbSBCKS4gTW91bnRlZCBhdCB0aGUgQVBQXG4gICAgIFJPT1QsIG5leHQgdG8gdGhlIHNoZWxsLCBub3QgaW5zaWRlIGl0OiBhIG1vZGFsIGJlbG9uZ3MgYXQgdGhlIHJvb3QsXG4gICAgIGFuZCBhcyBhIGRpcmVjdCBjaGlsZCBvZiA8YXBwLXJvb3Q+IG5vIHNoZWxsIGFuY2VzdG9yIGNhbiBldmVyIGJveCBpdFxuICAgICAoYW4gYW5jZXN0b3IgdHJhbnNmb3JtL2ZpbHRlci9ldGMuIHdvdWxkIGJlY29tZSB0aGUgY29udGFpbmluZyBibG9ja1xuICAgICBvZiBpdHMgcG9zaXRpb246Zml4ZWQgb3ZlcmxheSkgb3IgY2xpcCBpdC4gVGhlIG92ZXJsYXkgc2l6ZXMgaXRzZWxmIHRvXG4gICAgIHRoZSB2aWV3cG9ydCDigJQgc2VlIGNvbnNlbnQtYmFubmVyLmNvbXBvbmVudC5zY3NzLiAtLT5cbjxhcHAtY29uc2VudC1iYW5uZXIgLz5cbiIsImltcG9ydCB7XG4gIGFmdGVyTmV4dFJlbmRlcixcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgaW5qZWN0LFxuICB2aWV3Q2hpbGQsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgUm91dGVyTGluayB9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5pbXBvcnQgeyBDb25zZW50U3RvcmUgfSBmcm9tICcuLi9jb3JlL2NvbnNlbnQtc3RvcmUnO1xuaW1wb3J0IHsgVHJhbnNsYXRlUGlwZSB9IGZyb20gJy4uL2NvcmUvaTE4bi90cmFuc2xhdGUtcGlwZSc7XG5cbi8qKlxuICogVGhlIGZpcnN0LWxldmVsIGRhdGEtdXNhZ2Ugbm90aWNlIChXb3Jrc3RyZWFtIEIpLCByZW5kZXJlZCBhcyBhIGNlbnRlcmVkXG4gKiBtb2RhbCBvdmVybGF5LiBUaGUgYXBwIGhhcyBOTyBvcHRpb25hbCBjb29raWVzLCB0cmFja2VycyBvciBhbmFseXRpY3MsIHNvXG4gKiB0aGVyZSBpcyBubyBhY2NlcHQvcmVqZWN0IHNwbGl0OiB0aGUgc2luZ2xlIGV4cGxpY2l0IFwiR290IGl0XCIgYnV0dG9uIGlzXG4gKiB0aGUgb25seSB3YXkgdG8gZGlzbWlzcyBpdC4gVGhlcmUgaXMgZGVsaWJlcmF0ZWx5IG5vIGJhY2tkcm9wLWNsaWNrIG9yXG4gKiBFc2NhcGUgZGlzbWlzc2FsIC0gY2xvc2luZyBpcyBuZXZlciBhIHNpbGVudCBjb25zZW50LlxuICpcbiAqIEFjY2Vzc2liaWxpdHk6IGByb2xlPVwiZGlhbG9nXCJgICsgYGFyaWEtbW9kYWw9XCJ0cnVlXCJgIHdpdGggYW4gYWNjZXNzaWJsZVxuICogbmFtZSBhbmQgZGVzY3JpcHRpb24uIE9uIG9wZW4sIGZvY3VzIG1vdmVzIG9udG8gdGhlIGRpYWxvZzsgVGFiIGFuZFxuICogU2hpZnQrVGFiIGN5Y2xlIGluc2lkZSB0aGUgZGlhbG9nIHNvIGtleWJvYXJkIHVzZXJzIGNhbm5vdCByZWFjaCB0aGVcbiAqIGluZXJ0IHBhZ2UgYmVoaW5kIHRoZSBvdmVybGF5LiBUaGUgbmF0aXZlIGJ1dHRvbiBhbmQgbGluayBrZWVwIHRoZVxuICogYXBwLXdpZGUgZm9jdXMgcmluZyBhbmQgNDhweCB0b3VjaCB0YXJnZXQuXG4gKi9cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FwcC1jb25zZW50LWJhbm5lcicsXG4gIGltcG9ydHM6IFtSb3V0ZXJMaW5rLCBUcmFuc2xhdGVQaXBlXSxcbiAgdGVtcGxhdGVVcmw6ICcuL2NvbnNlbnQtYmFubmVyLmNvbXBvbmVudC5odG1sJyxcbiAgc3R5bGVVcmw6ICcuL2NvbnNlbnQtYmFubmVyLmNvbXBvbmVudC5zY3NzJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIENvbnNlbnRCYW5uZXIge1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgY29uc2VudCA9IGluamVjdChDb25zZW50U3RvcmUpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgZGlhbG9nID0gdmlld0NoaWxkPEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+PignZGlhbG9nJyk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gVGhlIGRpYWxvZyBvbmx5IHJlbmRlcnMgd2hpbGUgdGhlIGRlY2lzaW9uIGlzIG91dHN0YW5kaW5nOyBmb2N1cyBpdFxuICAgIC8vIG9uY2UgaXQgaXMgb24gc2NyZWVuIHNvIHRoZSBzY3JlZW4gcmVhZGVyIGFubm91bmNlcyB0aGUgZGlhbG9nIG5hbWUuXG4gICAgYWZ0ZXJOZXh0UmVuZGVyKCgpID0+IHtcbiAgICAgIHRoaXMuZGlhbG9nKCk/Lm5hdGl2ZUVsZW1lbnQuZm9jdXMoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBLZWVwIFRhYiAvIFNoaWZ0K1RhYiBjeWNsaW5nIGluc2lkZSB0aGUgZGlhbG9nIChmb2N1cyB0cmFwKS4gKi9cbiAgcHJvdGVjdGVkIG9uS2V5ZG93bihldmVudDogS2V5Ym9hcmRFdmVudCk6IHZvaWQge1xuICAgIGlmIChldmVudC5rZXkgIT09ICdUYWInKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGhvc3QgPSB0aGlzLmRpYWxvZygpPy5uYXRpdmVFbGVtZW50O1xuICAgIGlmICghaG9zdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmb2N1c2FibGVzID0gW1xuICAgICAgLi4uaG9zdC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignYnV0dG9uLCBhW2hyZWZdLCBbdGFiaW5kZXhdOm5vdChbdGFiaW5kZXg9XCItMVwiXSknKSxcbiAgICBdO1xuICAgIGlmIChmb2N1c2FibGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmaXJzdCA9IGZvY3VzYWJsZXNbMF07XG4gICAgY29uc3QgbGFzdCA9IGZvY3VzYWJsZXNbZm9jdXNhYmxlcy5sZW5ndGggLSAxXTtcbiAgICBjb25zdCBhY3RpdmUgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgaWYgKGFjdGl2ZSA9PT0gZmlyc3QgfHwgIWhvc3QuY29udGFpbnMoYWN0aXZlKSkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBsYXN0LmZvY3VzKCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhY3RpdmUgPT09IGxhc3QgfHwgIWhvc3QuY29udGFpbnMoYWN0aXZlKSkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGZpcnN0LmZvY3VzKCk7XG4gICAgfVxuICB9XG59XG4iLCJAaWYgKCFjb25zZW50LmRlY2lkZWQoKSkge1xuICA8ZGl2IGNsYXNzPVwiY29uc2VudC1vdmVybGF5XCI+XG4gICAgPHNlY3Rpb25cbiAgICAgIGNsYXNzPVwiY29uc2VudC1kaWFsb2dcIlxuICAgICAgcm9sZT1cImRpYWxvZ1wiXG4gICAgICBhcmlhLW1vZGFsPVwidHJ1ZVwiXG4gICAgICBhcmlhLWxhYmVsbGVkYnk9XCJjb25zZW50LXRpdGxlXCJcbiAgICAgIGFyaWEtZGVzY3JpYmVkYnk9XCJjb25zZW50LWJvZHlcIlxuICAgICAgdGFiaW5kZXg9XCItMVwiXG4gICAgICAjZGlhbG9nXG4gICAgICAoa2V5ZG93bik9XCJvbktleWRvd24oJGV2ZW50KVwiXG4gICAgPlxuICAgICAgPGgyIGNsYXNzPVwiY29uc2VudC1kaWFsb2dfX3RpdGxlXCIgaWQ9XCJjb25zZW50LXRpdGxlXCI+e3sgJ2NvbnNlbnQudGl0bGUnIHwgdCB9fTwvaDI+XG4gICAgICA8cCBjbGFzcz1cImNvbnNlbnQtZGlhbG9nX19ib2R5XCIgaWQ9XCJjb25zZW50LWJvZHlcIj57eyAnY29uc2VudC5ib2R5JyB8IHQgfX08L3A+XG4gICAgICA8ZGl2IGNsYXNzPVwiY29uc2VudC1kaWFsb2dfX2FjdGlvbnNcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLS1wcmltYXJ5XCIgKGNsaWNrKT1cImNvbnNlbnQuYWNrbm93bGVkZ2UoKVwiPlxuICAgICAgICAgIHt7ICdjb25zZW50LmFja25vd2xlZGdlJyB8IHQgfX1cbiAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDxhIHJvdXRlckxpbms9XCIvcHJpdmFjeVwiIGNsYXNzPVwiY29uc2VudC1kaWFsb2dfX3ByaXZhY3lcIj57eyAnY29uc2VudC5wcml2YWN5TGluaycgfCB0IH19PC9hPlxuICAgICAgPC9kaXY+XG4gICAgPC9zZWN0aW9uPlxuICA8L2Rpdj5cbn1cbiIsImltcG9ydCB7IEluamVjdGFibGUsIHNpZ25hbCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG4vKipcbiAqIFdoZXJlIHRoZSBmaXJzdC1sZXZlbCBkYXRhLXVzYWdlIGRlY2lzaW9uIGxpdmVzIGluIGxvY2FsU3RvcmFnZS4gVGhlIGFwcFxuICogaGFzIE5PIG9wdGlvbmFsIGNvb2tpZXMsIHRyYWNrZXJzIG9yIGFuYWx5dGljcyAoc2VlIHRoZSBmcm9udGVuZCBSRUFETUUpLFxuICogc28gdGhlIG9ubHkgc3RvcmVkIGRlY2lzaW9uIGlzIHRoZSBuZWNlc3NhcnktXG4gKiBvbmx5IGFja25vd2xlZGdtZW50LiBJdCBtaXJyb3JzIHRoZSBUaGVtZVN0b3JlIHBlcnNpc3RlbmNlIHNoYXBlOiBhIGtleVxuICogY29uc3RhbnQgKyB0cnkvY2F0Y2ggc28gcHJpdmF0ZS1tb2RlIHN0b3JhZ2UgZGVncmFkZXMgdG8gYSBzZXNzaW9uLW9ubHlcbiAqIGFja25vd2xlZGdtZW50IHRoYXQgc2ltcGx5IHJlLWFza3Mgb24gdGhlIG5leHQgbG9hZC5cbiAqL1xuY29uc3QgQ09OU0VOVF9LRVkgPSAnb3BlbnNoZWx0ZXItY29uc2VudCc7XG5cbi8qKlxuICogVGhlIGNvbnNlbnQgdmVyc2lvbi4gT25seSBuZWNlc3NhcnkgcHJvY2Vzc2luZyBleGlzdHMgdG9kYXksIHNvIGEgc2luZ2xlXG4gKiBkZWNpc2lvbiB2YWx1ZSAoJ25lY2Vzc2FyeScpIGlzIHN0b3JlZC4gSWYgYW4gb3B0aW9uYWwgY2F0ZWdvcnkgaXMgZXZlclxuICogYWRkZWQgKGFuYWx5dGljcywgbWFwIHByb3ZpZGVycywgcHJlZmVyZW5jZXMpLCBidW1wIHRoaXMgdmVyc2lvbiBzbyBldmVyeVxuICogZXhpc3RpbmcgZGVjaXNpb24gaXMgdHJlYXRlZCBhcyBzdGFsZSBhbmQgdGhlIGJhbm5lciByZS1wcm9tcHRzLlxuICovXG5jb25zdCBDT05TRU5UX1ZFUlNJT04gPSAxO1xuXG4vKiogVGhlIHN0b3JlZCBjb25zZW50IGRlY2lzaW9uLiBPbmx5ICduZWNlc3NhcnknIGV4aXN0cyB0b2RheS4gKi9cbnR5cGUgQ29uc2VudERlY2lzaW9uID0gJ25lY2Vzc2FyeSc7XG5cbmludGVyZmFjZSBDb25zZW50UmVjb3JkIHtcbiAgdmVyc2lvbjogbnVtYmVyO1xuICBkZWNpc2lvbjogQ29uc2VudERlY2lzaW9uO1xuICBhY2tub3dsZWRnZWRBdDogc3RyaW5nO1xufVxuXG4vKipcbiAqIFRoZSBmaXJzdC1sZXZlbCBjb25zZW50IHN0b3JlLiBPd25zIHdoZXRoZXIgdGhlIGRhdGEtdXNhZ2Ugbm90aWNlIGhhc1xuICogYmVlbiBhY2tub3dsZWRnZWQgYW5kLCBpZiB2ZXJzaW9uaW5nIGV2ZXIgZ3Jvd3Mgb3B0aW9uYWwgY2F0ZWdvcmllcyxcbiAqIHdoaWNoIGNhdGVnb3JpZXMgd2VyZSBhY2NlcHRlZC4gU2lnbmFsLWJhc2VkLCBubyBhc3luYyBsaWZlY3ljbGUgKGxpa2VcbiAqIFRoZW1lU3RvcmUpOiB0aGUgZGVjaXNpb24gaXMgcmVhZCBzeW5jaHJvbm91c2x5IGZyb20gbG9jYWxTdG9yYWdlIGluIHRoZVxuICogY29uc3RydWN0b3IsIHNvIHRoZSBiYW5uZXIgcmVuZGVycyBjb3JyZWN0bHkgb24gdGhlIHZlcnkgZmlyc3QgcGFpbnQuXG4gKi9cbkBJbmplY3RhYmxlKHsgcHJvdmlkZWRJbjogJ3Jvb3QnIH0pXG5leHBvcnQgY2xhc3MgQ29uc2VudFN0b3JlIHtcbiAgLyoqIFRydWUgb25jZSBhIHZhbGlkIGRlY2lzaW9uIGZvciB0aGUgY3VycmVudCB2ZXJzaW9uIGlzIHN0b3JlZC4gKi9cbiAgcmVhZG9ubHkgZGVjaWRlZCA9IHNpZ25hbDxib29sZWFuPihzdG9yZWRDb25zZW50KCkgIT09IG51bGwpO1xuXG4gIC8qKlxuICAgKiBBY2tub3dsZWRnZSB0aGUgbmVjZXNzYXJ5LW9ubHkgbm90aWNlLiBUaGUgYWNrbm93bGVkZ21lbnQgaXMgYW5cbiAgICogZXhwbGljaXQgdXNlciBhY3Rpb24gKHRoZXJlIGlzIG5vIGRpc21pc3MvY2xvc2UgdGhhdCBzaWxlbnRseSBjb3VudHMpLFxuICAgKiBhbmQgaXQgaXMgc3RvcmVkIHNvIHRoZSBiYW5uZXIgZG9lcyBub3QgcmUtYXBwZWFyIG9uIGxhdGVyIHZpc2l0cy5cbiAgICovXG4gIGFja25vd2xlZGdlKCk6IHZvaWQge1xuICAgIGNvbnN0IHJlY29yZDogQ29uc2VudFJlY29yZCA9IHtcbiAgICAgIHZlcnNpb246IENPTlNFTlRfVkVSU0lPTixcbiAgICAgIGRlY2lzaW9uOiAnbmVjZXNzYXJ5JyxcbiAgICAgIGFja25vd2xlZGdlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgfTtcbiAgICB0cnkge1xuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oQ09OU0VOVF9LRVksIEpTT04uc3RyaW5naWZ5KHJlY29yZCkpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU3RvcmFnZSB1bmF2YWlsYWJsZSAocHJpdmF0ZSBtb2RlKTogdGhlIGJhbm5lciBoaWRlcyBmb3IgdGhpc1xuICAgICAgLy8gc2Vzc2lvbiBvbmx5OyBpdCB3aWxsIHJlLWFzayBvbiB0aGUgbmV4dCBsb2FkLlxuICAgIH1cbiAgICB0aGlzLmRlY2lkZWQuc2V0KHRydWUpO1xuICB9XG59XG5cbi8qKiBUaGUgc3RvcmVkIHJlY29yZCB3aGVuIGl0IGlzIHZhbGlkIGZvciB0aGUgY3VycmVudCB2ZXJzaW9uLCBlbHNlIG51bGwuICovXG5mdW5jdGlvbiBzdG9yZWRDb25zZW50KCk6IENvbnNlbnRSZWNvcmQgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShDT05TRU5UX0tFWSk7XG4gICAgaWYgKHJhdyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmF3KSBhcyBQYXJ0aWFsPENvbnNlbnRSZWNvcmQ+O1xuICAgIGlmIChwYXJzZWQ/LnZlcnNpb24gPT09IENPTlNFTlRfVkVSU0lPTiAmJiBwYXJzZWQ/LmRlY2lzaW9uID09PSAnbmVjZXNzYXJ5Jykge1xuICAgICAgcmV0dXJuIHBhcnNlZCBhcyBDb25zZW50UmVjb3JkO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSBjYXRjaCB7XG4gICAgLy8gVW5yZWFkYWJsZS9jb3JydXB0IHZhbHVlOiB0cmVhdCBhcyB1bmRlY2lkZWQgc28gdGhlIGJhbm5lciByZS1hc2tzLlxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iLCJpbXBvcnQgeyBEYXRlUGlwZSwgVXBwZXJDYXNlUGlwZSB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge1xuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ29tcG9uZW50LFxuICBFbGVtZW50UmVmLFxuICBpbmplY3QsXG4gIE9uRGVzdHJveSxcbiAgc2lnbmFsLFxuICB2aWV3Q2hpbGQsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgTmF2aWdhdGlvbkVuZCwgUm91dGVyLCBSb3V0ZXJPdXRsZXQsIFJvdXRlckxpbmsgfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHsgVGhlbWVTdG9yZSB9IGZyb20gJy4uL2NvcmUvdGhlbWUtc3RvcmUnO1xuaW1wb3J0IHsgSTE4blNlcnZpY2UgfSBmcm9tICcuLi9jb3JlL2kxOG4vaTE4bi5zZXJ2aWNlJztcbmltcG9ydCB7IExPQ0FMRVMsIHR5cGUgTG9jYWxlIH0gZnJvbSAnLi4vY29yZS9pMThuL2xvY2FsZSc7XG5pbXBvcnQgeyBUcmFuc2xhdGVQaXBlIH0gZnJvbSAnLi4vY29yZS9pMThuL3RyYW5zbGF0ZS1waXBlJztcbmltcG9ydCB7IHR5cGUgRGF0YVNvdXJjZUR0byB9IGZyb20gJy4uL2NvcmUvbW9kZWxzJztcbmltcG9ydCB7IERhdGFTb3VyY2VHYXRld2F5IH0gZnJvbSAnLi4vZ2F0ZXdheXMvZGF0YS1zb3VyY2UtZ2F0ZXdheSc7XG5pbXBvcnQgeyBTaXRlVGV4dHNHYXRld2F5IH0gZnJvbSAnLi4vZ2F0ZXdheXMvc2l0ZS10ZXh0cy1nYXRld2F5JztcbmltcG9ydCB7IEF1dGhTdG9yZSB9IGZyb20gJy4uL3Nlc3Npb24vYXV0aC1zdG9yZSc7XG5pbXBvcnQgeyBBY2Nlc3NpYmlsaXR5RGlhbG9nIH0gZnJvbSAnLi9hY2Nlc3NpYmlsaXR5LWRpYWxvZy5jb21wb25lbnQnO1xuXG4vKipcbiAqIFRoZSBhcHAgZnJhbWUgKDAxIHB1bWwsIHNoYXJlZC8pOiBicmFuZCArIG5hdiBoZWFkZXIgb24gdG9wIG9mIHRoZSByb3V0ZWRcbiAqIHBhZ2UuIFNlc3Npb24tZGVwZW5kZW50IGNvbnRyb2xzIGNvbWUgZnJvbSBBdXRoU3RvcmUgc2lnbmFscyBhbmQgb25seVxuICogcmVuZGVyIGFmdGVyIEF1dGhTdG9yZS5pbml0KCkgc2V0dGxlZCAobm8gbG9naW4vbG9nb3V0IGZsYXNoIG9uIHJlbG9hZCkuXG4gKlxuICogVGhpbiBzaGVsbDogbG9nb3V0IGlzIGRlbGVnYXRlLWFuZC1uYXZpZ2F0ZSwgbm90aGluZyBlbHNlLlxuICpcbiAqIE1vYmlsZSAoPDkwMHB4LCB0aGUgLS1icC1uYXJyb3cgYnJlYWtwb2ludCk6IHRoZSBoZWFkZXIgY29sbGFwc2VzIHRvXG4gKiBicmFuZCArIGJ1cmdlcjsgbmF2ICsgYWN0aW9ucyByZW5kZXIgaW5zaWRlIG9uZSAuc2hlbGwtbWVudSBub2RlIHRoYXRcbiAqIGJlY29tZXMgdGhlIGRyb3Bkb3duIHBhbmVsIChoaWRkZW4gdW50aWwgb3BlbmVkKS5cbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYXBwLXBhZ2Utc2hlbGwnLFxuICBpbXBvcnRzOiBbUm91dGVyT3V0bGV0LCBSb3V0ZXJMaW5rLCBEYXRlUGlwZSwgVXBwZXJDYXNlUGlwZSwgVHJhbnNsYXRlUGlwZSwgQWNjZXNzaWJpbGl0eURpYWxvZ10sXG4gIHRlbXBsYXRlVXJsOiAnLi9wYWdlLXNoZWxsLmh0bWwnLFxuICBzdHlsZVVybDogJy4vcGFnZS1zaGVsbC5zY3NzJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIFBhZ2VTaGVsbCBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RvcmUgPSBpbmplY3QoQXV0aFN0b3JlKTtcbiAgcHJpdmF0ZSByZWFkb25seSB0aGVtZVN0b3JlID0gaW5qZWN0KFRoZW1lU3RvcmUpO1xuICBwcml2YXRlIHJlYWRvbmx5IGkxOG5TZXJ2aWNlID0gaW5qZWN0KEkxOG5TZXJ2aWNlKTtcbiAgcHJpdmF0ZSByZWFkb25seSByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcbiAgcHJpdmF0ZSByZWFkb25seSBob3N0ID0gaW5qZWN0PEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+PihFbGVtZW50UmVmKTtcblxuICAvKiogTW9iaWxlIG1lbnUgcGFuZWwgb3BlbiBzdGF0ZSAob25seSBtZWFuaW5nZnVsIGJlbG93IDkwMHB4OyB0aGVcbiAgICAgIGJ1cmdlciBpcyBoaWRkZW4gYXQgZGVza3RvcCB3aWR0aHMpLiAqL1xuICByZWFkb25seSBtZW51T3BlbiA9IHNpZ25hbChmYWxzZSk7XG5cbiAgLyoqIFRoZSAvYWRtaW4gcm91dGUgcmVuZGVycyB0aGUgcXVldWUgdGFibGVzICh0aGUgZ3VpZGFuY2UgbGlzdCdzIDhcbiAgICAgIGNvbHVtbnMpLCB3aGljaCBuZWVkIHRoZSB3aWRlciBjb250ZW50IGNvbHVtbiDigJQgaXRzIHNoZWxsLWJvZHkgdGFrZXNcbiAgICAgIC0tY29udGVudC1tYXgtd2lkdGgtd2lkZSBpbnN0ZWFkIG9mIHRoZSBwdWJsaWMgLS1jb250ZW50LW1heC13aWR0aFxuICAgICAgKGRlbGliZXJhdGUgZXhjZXB0aW9uLCBzZWUgcGFnZS1zaGVsbC5zY3NzIC8gc3R5bGVzLnNjc3MpLiBFdmVyeVxuICAgICAgb3RoZXIgcm91dGUga2VlcHMgdGhlIHB1YmxpYyBjYXAuICovXG4gIHJlYWRvbmx5IGFkbWluV2lkZSA9IHNpZ25hbCh0aGlzLnJvdXRlci51cmwuc3RhcnRzV2l0aCgnL2FkbWluJykpO1xuXG4gIC8qKiBEYXRhIHByb3ZlbmFuY2UgZm9yIHRoZSBmb290ZXIgbGluZSAob2ZmaWNpYWwtZGF0YXNldC1jc3YpOlxuICAgICAgcHVibGlzaGVyICsgb2ZmaWNpYWwgbGluayArIGxhc3QgaW1wb3J0LiBTdGF5cyBudWxsIHdoaWxlIGxvYWRpbmcgb3JcbiAgICAgIHdoZW4gdGhlIEFQSSBmYWlscyDigJQgdGhlIGxpbmUgaXMgbm9uLWNyaXRpY2FsIGFuZCBoaWRlcyBpdHNlbGYuICovXG4gIHJlYWRvbmx5IGRhdGFTb3VyY2UgPSBzaWduYWw8RGF0YVNvdXJjZUR0byB8IG51bGw+KG51bGwpO1xuXG4gIC8qKiBUaGUgYWNjZXNzaWJpbGl0eSBkaWFsb2cgKGFjY2Vzc2liaWxpdHktZGlhbG9nKTogdGhlIGhlYWRlcidzXG4gICAgICBBY2Nlc3NpYmlsaXR5IGJ1dHRvbiBvcGVucyBpdDsgdGhlIG92ZXJsYXkgcmVuZGVycyBpbnNpZGUgdGhlIGhvc3QuXG4gICAgICBJdHMgYG9wZW5gIHNpZ25hbCBJUyB0aGUgdHJpZ2dlcidzIGFyaWEtZXhwYW5kZWQgc291cmNlIOKAlCB0aGUgc2hlbGxcbiAgICAgIGhhcyBubyBzZWNvbmQgY29weSBvZiB0aGUgc3RhdGUgKGNsb3NlIHBhdGhzIOKAlCBFc2NhcGUsIHRoZSBDbG9zZVxuICAgICAgYnV0dG9uLCB0aGUgYmFja2Ryb3Ag4oCUIGFsbCBsaXZlIGluIHRoZSBkaWFsb2cpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgYTExeURpYWxvZyA9IHZpZXdDaGlsZChBY2Nlc3NpYmlsaXR5RGlhbG9nKTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICAvLyBFc2NhcGUgY2xvc2VzIHRoZSBtZW51OiBob3N0LWxldmVsIGtleWRvd24gbGlzdGVuZXIgKGZpcmVzIHdoZXJldmVyXG4gICAgLy8gaW4gdGhlIHBhZ2UgZm9jdXMgaXMpLCByZW1vdmVkIGluIG5nT25EZXN0cm95LiAoVGhlIGRpYWxvZyBzdG9wc1xuICAgIC8vIHByb3BhZ2F0aW9uIHdoaWxlIGl0IGlzIG9wZW4sIHNvIHRoZSB0d28gbmV2ZXIgZmlnaHQuKVxuICAgIHRoaXMuaG9zdC5uYXRpdmVFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLm9uS2V5ZG93bik7XG4gICAgLy8gT25lIGZpcmUtYW5kLWZvcmdldCBmZXRjaCBwZXIgYXBwIGJvb3QgKHRoZSBzaGVsbCBpcyBuZXZlciBkZXN0cm95ZWQpLlxuICAgIGluamVjdChEYXRhU291cmNlR2F0ZXdheSlcbiAgICAgIC5mZXRjaCgpXG4gICAgICAudGhlbigoZHMpID0+IHRoaXMuZGF0YVNvdXJjZS5zZXQoZHMpKTtcbiAgICAvLyBUaGUgYWRtaW4gc2l0ZS10ZXh0IG92ZXJyaWRlcyAoc2l0ZV90ZXh0cyk6IG9uZSBmaXJlLWFuZC1mb3JnZXRcbiAgICAvLyBmZXRjaCBwZXIgYm9vdC4gTm9uLWNyaXRpY2FsIOKAlCBhIGZhaWx1cmUgKG9yIHRoZSBub3QteWV0LWxvYWRlZFxuICAgIC8vIHN0YXRlKSBrZWVwcyB0aGUgc2hpcHBlZCBpMThuIGNhdGFsb2cgYXMgdGhlIGNvcHkgKHRoZSBvdmVybGF5J3NcbiAgICAvLyBkZWZhdWx0KSwgc28gYSBkb3duIEFQSSBuZXZlciBibGFua3MgdGhlIGNocm9tZS5cbiAgICBpbmplY3QoU2l0ZVRleHRzR2F0ZXdheSlcbiAgICAgIC5mZXRjaCgpXG4gICAgICAudGhlbigodGV4dHMpID0+IHRoaXMuaTE4blNlcnZpY2Uuc2V0U2l0ZVRleHRzKHRleHRzKSlcbiAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgIC8qIGRlZmF1bHRzIHN0YW5kIOKAlCB0aGUgb3ZlcmxheSBpcyBwcm9ncmVzc2l2ZSBlbmhhbmNlbWVudCAqL1xuICAgICAgfSk7XG4gIH1cblxuICAvKiogVGhlIGhlYWRlcidzIEFjY2Vzc2liaWxpdHkgYnV0dG9uOiBvcGVucyB0aGUgZGlhbG9nIChmb2N1cyBtb3Zlc1xuICAgICAgaW47IHRoZSBtb2JpbGUgbWVudSBjbG9zZXMgd2l0aCB0aGUgc2FtZSBjbGljaywgbGlrZSBhbnkgb3RoZXJcbiAgICAgIG1lbnUgaXRlbSDigJQgdGhlIGRpYWxvZyBpcyBmaXhlZC1wb3NpdGlvbmVkLCBub3QgYSBtZW51IGNoaWxkKS4gKi9cbiAgb3BlbkFjY2Vzc2liaWxpdHlEaWFsb2coKTogdm9pZCB7XG4gICAgdGhpcy5tZW51T3Blbi5zZXQoZmFsc2UpO1xuICAgIHRoaXMuYTExeURpYWxvZygpPy5vcGVuRGlhbG9nKCk7XG4gIH1cblxuICAvKiogVHJ1ZSB1bnRpbCB0aGUgZmlyc3QgTmF2aWdhdGlvbkVuZDogdGhhdCBvbmUgaXMgdGhlIGluaXRpYWwgZG9jdW1lbnRcbiAgICAgIGxvYWQsIHdoZXJlIHRoZSBicm93c2VyJ3Mgb3duIGZvY3VzIHN0YXJ0IOKAlCBhbmQgdGhlIHNraXAgbGluayDigJRcbiAgICAgIG11c3Qgd2luLiAqL1xuICBwcml2YXRlIGZpcnN0TmF2aWdhdGlvbiA9IHRydWU7XG5cbiAgLyoqIEFueSBjb21wbGV0ZWQgbmF2aWdhdGlvbiBjbG9zZXMgdGhlIG9wZW4gbWVudSBhbmQgbGFuZHMgZm9jdXMgb24gdGhlXG4gICAgICByb3V0ZWQgY29udGVudCAoYm91bmQgdG8gTmF2aWdhdGlvbkVuZCDigJQgb24gYW55KS4gVW5zdWJzY3JpYmVkIGluXG4gICAgICBuZ09uRGVzdHJveS4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSByb3V0ZXJDbG9zZSA9IHRoaXMucm91dGVyLmV2ZW50cy5zdWJzY3JpYmUoKGV2ZW50KSA9PiB7XG4gICAgaWYgKGV2ZW50IGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgdGhpcy5tZW51T3Blbi5zZXQoZmFsc2UpO1xuICAgICAgdGhpcy5hZG1pbldpZGUuc2V0KGV2ZW50LnVybEFmdGVyUmVkaXJlY3RzLnN0YXJ0c1dpdGgoJy9hZG1pbicpKTtcbiAgICAgIHRoaXMuZm9jdXNNYWluT25Sb3V0ZUNoYW5nZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGF1dGggPSB0aGlzLnN0b3JlO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgdGhlbWUgPSB0aGlzLnRoZW1lU3RvcmU7XG4gIC8qKiBpMThuLWV0LWVuOiB0aGUgY2hyb21lIGNvcHkgKyB0aGUgbGFuZ3VhZ2Ugc3dpdGNoZXIuIGBsb2NhbGVgXG4gICAgICBpcyByZWFkIGluIHRoZSB0ZW1wbGF0ZSwgc28gYSBzd2l0Y2ggdHJpZ2dlcnMgdGhpcyBjb21wb25lbnQnc1xuICAgICAgY2hhbmdlIGRldGVjdGlvbiBhbmQgdGhlIGBwdXJlOiBmYWxzZWAgYHRgIHBpcGUgcmUtcmVuZGVycy4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGkxOG4gPSB0aGlzLmkxOG5TZXJ2aWNlO1xuICAvKiogVGhlIHN3aXRjaGVyIGJ1dHRvbnMgcmVuZGVyIGZyb20gTE9DQUxFUyAoYSBuZXcgbGFuZ3VhZ2UgaXMgb25lXG4gICAgICBjYXRhbG9nIGVudHJ5LCBub3QgYSB0ZW1wbGF0ZSBlZGl0KS4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGxvY2FsZXM6IHJlYWRvbmx5IExvY2FsZVtdID0gTE9DQUxFUztcblxuICAvKiogTGFuZ3VhZ2Ugc3dpdGNoZXIgYWN0aW9uIOKAlCBwZXJzaXN0cyAoSTE4blNlcnZpY2UpLiAqL1xuICBzZXRMb2NhbGUobG9jYWxlOiBMb2NhbGUpOiB2b2lkIHtcbiAgICB0aGlzLmkxOG5TZXJ2aWNlLnNldExvY2FsZShsb2NhbGUpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5ob3N0Lm5hdGl2ZUVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMub25LZXlkb3duKTtcbiAgICB0aGlzLnJvdXRlckNsb3NlLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICAvKiogQnVyZ2VyIGNsaWNrOiBvcGVuL2Nsb3NlcyB0aGUgcGFuZWwuICovXG4gIHRvZ2dsZU1lbnUoKTogdm9pZCB7XG4gICAgdGhpcy5tZW51T3Blbi51cGRhdGUoKG9wZW4pID0+ICFvcGVuKTtcbiAgfVxuXG4gIC8qKiBBbnkgbWVudSBpdGVtIGNsaWNrIGNsb3NlcyB0aGUgcGFuZWwg4oCUIGJvdW5kIHRvIHRoZSAuc2hlbGwtbWVudVxuICAgICAgY29udGFpbmVyLCBzbyBldmVyeSBjdXJyZW50IGFuZCBmdXR1cmUgaXRlbSBpcyBjb3ZlcmVkIGluIG9uZVxuICAgICAgcGxhY2UgKG5hdiBhbmNob3JzLCBoaWdoLWNvbnRyYXN0IHRvZ2dsZSwgYXV0aCBidXR0b25zL2FuY2hvcnMpLiAqL1xuICBjbG9zZU1lbnUoKTogdm9pZCB7XG4gICAgdGhpcy5tZW51T3Blbi5zZXQoZmFsc2UpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFkb25seSBvbktleWRvd24gPSAoZXZlbnQ6IEtleWJvYXJkRXZlbnQpOiB2b2lkID0+IHtcbiAgICBpZiAoZXZlbnQua2V5ID09PSAnRXNjYXBlJykge1xuICAgICAgdGhpcy5tZW51T3Blbi5zZXQoZmFsc2UpO1xuICAgIH1cbiAgfTtcblxuICAvKiogQSByb3V0ZSBjaGFuZ2UgcmVwbGFjZXMgdGhlIHBhZ2Ugd2l0aG91dCBhIGRvY3VtZW50IGxvYWQsIHNvIHRoZVxuICAgICAga2V5Ym9hcmQvc2NyZWVuLXJlYWRlciB1c2VyIHdvdWxkIHN0YXkgcGFya2VkIG9uIHRoZSBuYXYgaXRlbSB0aGV5XG4gICAgICBjbGlja2VkIChvciBvbiA8Ym9keT4pIHdoaWxlIHRoZSBjb250ZW50IGJlbG93IGNoYW5nZWQuIEZvY3VzIHRoZVxuICAgICAgcm91dGVkIGNvbnRhaW5lciDigJQgdGhlIHNraXAgbGluaydzIGxhbmRpbmcgdGFyZ2V0IOKAlCBmb3IgZXZlcnlcbiAgICAgIG5hdmlnYXRpb24gYWZ0ZXIgdGhlIGluaXRpYWwgbG9hZC4gQW4gb3BlbiBtb2RhbCBkaWFsb2cgb3ducyB0aGVcbiAgICAgIGtleWJvYXJkICh0aGUgY29uc2VudCBvdmVybGF5IGxpbmtzIHRvIC9wcml2YWN5LCBzbyBhIHJvdXRlIGNoYW5nZSBjYW5cbiAgICAgIGhhcHBlbiB3aXRoIGl0IG9wZW4pOiBuZXZlciBwdWxsIGZvY3VzIG91dCBmcm9tIGJlaGluZCBpdC4gKi9cbiAgcHJpdmF0ZSBmb2N1c01haW5PblJvdXRlQ2hhbmdlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmZpcnN0TmF2aWdhdGlvbikge1xuICAgICAgdGhpcy5maXJzdE5hdmlnYXRpb24gPSBmYWxzZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYWN0aXZlID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudDtcbiAgICBpZiAoYWN0aXZlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQgJiYgYWN0aXZlLmNsb3Nlc3QoJ1thcmlhLW1vZGFsPVwidHJ1ZVwiXScpICE9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuaG9zdC5uYXRpdmVFbGVtZW50LnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KCcjbWFpbicpPy5mb2N1cygpO1xuICB9XG5cbiAgYXN5bmMgbG9nb3V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuYXV0aC5sb2dvdXQoKTtcbiAgICBhd2FpdCB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9tYXAnXSk7XG4gIH1cbn1cbiIsIjwhLS0gU2tpcCBsaW5rIChXQ0FHIDIuNC4xKTogdGhlIHNoZWxsJ3MgRklSU1QgZWxlbWVudCDigJRcbiAgICAgb2ZmLXNjcmVlbiB1bnRpbCBpdCB0YWtlcyBrZXlib2FyZCBmb2N1cywgdGhlbiBpdCByZXZlYWxzIG92ZXIgdGhlIGhlYWRlclxuICAgICBzbyB0aGUgZmlyc3QgVGFiIGp1bXBzIHBhc3QgdGhlIHdob2xlIG5hdiBpbnRvIHRoZSByb3V0ZWQgcGFnZVxuICAgICAoPG1haW4gaWQ9XCJtYWluXCIgdGFiaW5kZXg9XCItMVwiPiBiZWxvdykuIC0tPlxuPGEgY2xhc3M9XCJza2lwLWxpbmtcIiBocmVmPVwiI21haW5cIj57eyAnbmF2LnNraXAnIHwgdCB9fTwvYT5cblxuPGhlYWRlciBjbGFzcz1cInNoZWxsLWhlYWRlclwiPlxuICA8YSBjbGFzcz1cImJyYW5kXCIgcm91dGVyTGluaz1cIi9tYXBcIj5PcGVuU2hlbHRlcjwvYT5cbiAgPCEtLSBNb2JpbGUgYnVyZ2VyIChoaWRkZW4gYXQgPj05MDBweCk6IG9wZW5zIHRoZSAuc2hlbGwtbWVudSBwYW5lbCBiZWxvdy5cbiAgICAgICBUaGUgdGhyZWUgYmFycyBhcmUgQ1NTLWRyYXduIOKAlCBubyBpY29uIGxpYnJhcnksIG5vIHVuaWNvZGUgZ2x5cGguIC0tPlxuICA8YnV0dG9uXG4gICAgdHlwZT1cImJ1dHRvblwiXG4gICAgY2xhc3M9XCJzaGVsbC1idXJnZXJcIlxuICAgIFthdHRyLmFyaWEtbGFiZWxdPVwiJ21lbnUuYXJpYScgfCB0XCJcbiAgICBbYXR0ci5hcmlhLWV4cGFuZGVkXT1cIm1lbnVPcGVuKClcIlxuICAgIGFyaWEtY29udHJvbHM9XCJzaGVsbC1tb2JpbGUtbWVudVwiXG4gICAgKGNsaWNrKT1cInRvZ2dsZU1lbnUoKVwiXG4gID5cbiAgICA8c3BhbiBjbGFzcz1cInNoZWxsLWJ1cmdlcl9fYmFyXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPlxuICAgIDxzcGFuIGNsYXNzPVwic2hlbGwtYnVyZ2VyX19iYXJcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+XG4gICAgPHNwYW4gY2xhc3M9XCJzaGVsbC1idXJnZXJfX2JhclwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvc3Bhbj5cbiAgPC9idXR0b24+XG4gIDwhLS0gU2luZ2xlIHNvdXJjZSBmb3IgbmF2ICsgYWN0aW9uczogYXQgPj05MDAgYSBub3JtYWwgZmxleCByb3cgKHRoZVxuICAgICAgIGZsZXg6IDEga2VlcHMgLnNoZWxsLWFjdGlvbnMnIG1hcmdpbi1sZWZ0OiBhdXRvIHB1c2hpbmcgdGhlIGFjdGlvbnNcbiAgICAgICB0byB0aGUgaGVhZGVyJ3MgcmlnaHQgZWRnZSDigJQgdGhlIG9sZCBpbmxpbmUgbGF5b3V0LCB2aXN1YWxseVxuICAgICAgIHVuY2hhbmdlZCk7IGJlbG93IDkwMCB0aGUgc2FtZSBub2RlIGlzIHRoZSBkcm9wZG93biBwYW5lbCAoaGlkZGVuXG4gICAgICAgdW50aWwgb3BlbmVkKS4gVGhlIChjbGljaykgY2xvc2UgY292ZXJzIGV2ZXJ5IG1lbnUgaXRlbSBpbiBvbmVcbiAgICAgICBwbGFjZTogbmF2IGFuY2hvcnMsIHRoZSBsYW5ndWFnZSBzd2l0Y2hlciwgdGhlIGhpZ2gtY29udHJhc3RcbiAgICAgICB0b2dnbGUsIHRoZSBhdXRoIGNvbnRyb2xzLiAtLT5cbiAgPGRpdlxuICAgIGNsYXNzPVwic2hlbGwtbWVudVwiXG4gICAgaWQ9XCJzaGVsbC1tb2JpbGUtbWVudVwiXG4gICAgW2NsYXNzLnNoZWxsLW1lbnUtLW9wZW5dPVwibWVudU9wZW4oKVwiXG4gICAgKGNsaWNrKT1cImNsb3NlTWVudSgpXCJcbiAgPlxuICAgIDxuYXYgY2xhc3M9XCJzaGVsbC1uYXZcIiBbYXR0ci5hcmlhLWxhYmVsXT1cIiduYXYucHJpbWFyeUFyaWEnIHwgdFwiPlxuICAgICAgPGEgcm91dGVyTGluaz1cIi9tYXBcIiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlXCI+e3sgJ25hdi5tYXAnIHwgdCB9fTwvYT5cbiAgICAgIDwhLS0gUHVibGljIGNyaXNpcy1ndWlkYW5jZSBpbmRleCAoY3Jpc2lzLWd1aWRhbmNlIEQ2KTogcGVybWl0LWFsbCDigJRcbiAgICAgICAgICAgYW5vbnltb3VzIHZpc2l0b3JzIHNlZSBpdCB0b28sIGxpa2UgdGhlIG1hcC4gLS0+XG4gICAgICA8YSByb3V0ZXJMaW5rPVwiL2Jsb2dcIiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlXCI+e3sgJ25hdi5ndWlkYW5jZScgfCB0IH19PC9hPlxuICAgICAgQGlmIChhdXRoLmluaXRpYWxpemVkKCkgJiYgYXV0aC5hdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgPCEtLSBUaGUgcHJvdmlzaW9uZWQgYWRtaW4gKGtpbmQgQURNSU4g4oCUIHRoZSBTQU1FIGlzQWRtaW4gc2lnbmFsIGFzXG4gICAgICAgICAgICAgdGhlIEFkbWluIGl0ZW0gYmVsb3c7IHRoZSBhY2NvdW50IHBhZ2Uga2V5cyBpdHMgXCJub3RoaW5nIHRvXG4gICAgICAgICAgICAgZWRpdCBoZXJlXCIgY29weSBvbiBpdCB0b28pIGdldHMgTk8gQWNjb3VudCBsaW5rOiB0aGUgYWRtaW4nc1xuICAgICAgICAgICAgIGxvZ2luIGFuZCBwYXNzd29yZCBhcmUgZGVwbG95bWVudCBlbnZpcm9ubWVudCB2YXJpYWJsZXMsIHNvXG4gICAgICAgICAgICAgL2FjY291bnQgb2ZmZXJzIGl0IG5vdGhpbmcgdG8gZWRpdCBhbmQgdGhlIGhlYWRlciBtdXN0IG5vdFxuICAgICAgICAgICAgIGFkdmVydGlzZSBpdC4gVGhlIFVSTCBzdGF5cyByZWFjaGFibGUg4oCUIHRoZSBzZXJ2ZXIgYWxyZWFkeVxuICAgICAgICAgICAgIHJlZnVzZXMgdGhlIGFkbWluJ3MgZGFuZ2Vyb3VzIGFjY291bnQgYWN0aW9ucyAoNDAzKTsgd2Ugb25seVxuICAgICAgICAgICAgIHN0b3AgbGlua2luZyB0byBpdC4gSGlkaW5nIHRoZSA8YT4gbGVhdmVzIG5vIGxheW91dCBob2xlOlxuICAgICAgICAgICAgIC5zaGVsbC1uYXYgaXMgYSBnYXAtYmFzZWQgZmxleCByb3cgd2l0aCBubyBzZXBhcmF0b3JzLCBhbmRcbiAgICAgICAgICAgICB0aGlzIG5vZGUgc2VydmVzIEJPVEggdGhlIGRlc2t0b3Agcm93IGFuZCB0aGUgPDkwMHB4IHBhbmVsLiAtLT5cbiAgICAgICAgQGlmICghYXV0aC5pc0FkbWluKCkpIHtcbiAgICAgICAgICA8YSByb3V0ZXJMaW5rPVwiL2FjY291bnRcIiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlXCI+e3sgJ25hdi5hY2NvdW50JyB8IHQgfX08L2E+XG4gICAgICAgIH1cbiAgICAgICAgPCEtLSBBZG1pbi1raW5kIG9ubHkgKGFkbWluLW1vZGVyYXRpb24gRDUpOiByZWd1bGFyIHVzZXJzIHNlZSB0aGVcbiAgICAgICAgICAgICBuYXYgdW5jaGFuZ2VkOyBhIGZhaWxlZCBwcm9maWxlIGZldGNoIGxlYXZlcyBpc0FkbWluIGZhbHNlLCBzb1xuICAgICAgICAgICAgIHRoZSBpdGVtIGhpZGVzIGl0c2VsZiBmYWlsLWNsb3NlZC4gLS0+XG4gICAgICAgIEBpZiAoYXV0aC5pc0FkbWluKCkpIHtcbiAgICAgICAgICA8YSByb3V0ZXJMaW5rPVwiL2FkbWluXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZVwiPnt7ICduYXYuYWRtaW4nIHwgdCB9fTwvYT5cbiAgICAgICAgfVxuICAgICAgfVxuICAgIDwvbmF2PlxuICAgIDxkaXYgY2xhc3M9XCJzaGVsbC1hY3Rpb25zXCI+XG4gICAgICA8IS0tIExhbmd1YWdlIHN3aXRjaGVyIChpMThuLWV0LWVuKTogb2ZmZXJzIG9ubHkgdGhlIGxhbmd1YWdlIHRoZSByZWFkZXJcbiAgICAgICAgICAgY2FuIHN3aXRjaCBUTyDigJQgdGhlIEFDVElWRSBsb2NhbGUgaXMgbmV2ZXIgcmVuZGVyZWQgKGNsaWNraW5nIGl0XG4gICAgICAgICAgIHdvdWxkIGJlIGEgbm8tb3ApLiBUaGUgY2hvaWNlIHBlcnNpc3RzIChvcGVuc2hlbHRlci1sb2NhbGUpIGFuZFxuICAgICAgICAgICBhcHBsaWVzIHByZS1wYWludCB2aWEgdGhlIGlubGluZSBpbmRleC5odG1sIHNjcmlwdC4gVGhlIGJ1dHRvbnNcbiAgICAgICAgICAgcmVuZGVyIGZyb20gTE9DQUxFUzsgdGhlIGxhYmVscyBhcmUgdGhlIGxhbmd1YWdlIGNvZGVzIHRoZW1zZWx2ZXNcbiAgICAgICAgICAg4oCUIG5ldmVyIHRyYW5zbGF0ZWQuIC0tPlxuICAgICAgPGRpdiBjbGFzcz1cInNoZWxsLWxhbmdcIiByb2xlPVwiZ3JvdXBcIiBbYXR0ci5hcmlhLWxhYmVsXT1cIidsYW5nLmxhYmVsJyB8IHRcIj5cbiAgICAgICAgQGZvciAoY29kZSBvZiBsb2NhbGVzOyB0cmFjayBjb2RlKSB7XG4gICAgICAgICAgQGlmIChjb2RlICE9PSBpMThuLmxvY2FsZSgpKSB7XG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tLWdob3N0XCIgKGNsaWNrKT1cInNldExvY2FsZShjb2RlKVwiPlxuICAgICAgICAgICAgICB7eyBjb2RlIHwgdXBwZXJjYXNlIH19XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIDwvZGl2PlxuICAgICAgPCEtLSBBY2Nlc3NpYmlsaXR5IGJ1dHRvbiAoYWNjZXNzaWJpbGl0eS1kaWFsb2csIHJlcGxhY2VzIHRoZVxuICAgICAgICAgICBoaWdoLWNvbnRyYXN0IHRvZ2dsZSk6IG9wZW5zIHRoZSByb2xlPWRpYWxvZyBjb250cmFzdCBwYW5lbC5cbiAgICAgICAgICAgQWx3YXlzIHZpc2libGUgKGluZGVwZW5kZW50IG9mIGF1dGgpOyB0aGUgY2hvaWNlIHBlcnNpc3RzIGluXG4gICAgICAgICAgIGxvY2FsU3RvcmFnZSBhbmQgYXBwbGllcyBiZWZvcmUgZmlyc3QgcGFpbnQgKHRoZSBpbmxpbmVcbiAgICAgICAgICAgaW5kZXguaHRtbCBzY3JpcHQpLiAjYTExeS10cmlnZ2VyIGlzIHRoZSBmb2N1cy1yZXR1cm4gdGFyZ2V0XG4gICAgICAgICAgIHdoZW4gdGhlIGRpYWxvZyBjbG9zZXMuIC0tPlxuICAgICAgPGJ1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgaWQ9XCJhMTF5LXRyaWdnZXJcIlxuICAgICAgICBjbGFzcz1cImJ0biBidG4tLWdob3N0XCJcbiAgICAgICAgW2F0dHIuYXJpYS1leHBhbmRlZF09XCJhMTF5RGlhbG9nKCk/Lm9wZW4oKSA9PT0gdHJ1ZSA/ICd0cnVlJyA6ICdmYWxzZSdcIlxuICAgICAgICAoY2xpY2spPVwib3BlbkFjY2Vzc2liaWxpdHlEaWFsb2coKVwiXG4gICAgICA+XG4gICAgICAgIHt7ICdhMTF5LmJ1dHRvbicgfCB0IH19XG4gICAgICA8L2J1dHRvbj5cbiAgICAgIEBpZiAoYXV0aC5pbml0aWFsaXplZCgpKSB7XG4gICAgICAgIEBpZiAoYXV0aC5hdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tLWdob3N0XCIgKGNsaWNrKT1cImxvZ291dCgpXCI+XG4gICAgICAgICAgICB7eyAnYXV0aC5sb2dvdXQnIHwgdCB9fVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICB9IEBlbHNlIHtcbiAgICAgICAgICA8YSByb3V0ZXJMaW5rPVwiL2xvZ2luXCIgY2xhc3M9XCJidG4gYnRuLS1naG9zdFwiPnt7ICdhdXRoLmxvZ2luJyB8IHQgfX08L2E+XG4gICAgICAgICAgPGEgcm91dGVyTGluaz1cIi9yZWdpc3RlclwiIGNsYXNzPVwiYnRuIGJ0bi0tcHJpbWFyeVwiPnt7ICdhdXRoLnJlZ2lzdGVyJyB8IHQgfX08L2E+XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG48L2hlYWRlcj5cblxuPCEtLSBUaGUgcm91dGVkIGNvbnRlbnQuIHRhYmluZGV4PVwiLTFcIiBpcyB0aGUgc2tpcCBsaW5rJ3MgbGFuZGluZyB0YXJnZXQ6XG4gICAgIGZvY3VzaW5nIGl0IG1vdmVzIHRoZSBuZXh0IFRhYiBpbnRvIHRoZSBwYWdlIGluc3RlYWQgb2YgYmFjayB0byB0aGUgbmF2LlxuICAgICBwYWdlLXNoZWxsLnRzIGZvY3VzZXMgaXQgb24gZXZlcnkgcm91dGUgY2hhbmdlIGFmdGVyIHRoZSBpbml0aWFsIGxvYWRcbiAgICAgdG9vLCBzbyBhIGNsaWVudC1zaWRlIHN3YXAgbGFuZHMgdGhlIGtleWJvYXJkIHRoZVxuICAgICB3YXkgYSBkb2N1bWVudCBsb2FkIGRvZXMuIC0tPlxuPG1haW5cbiAgICBjbGFzcz1cInNoZWxsLWJvZHlcIlxuICAgIGlkPVwibWFpblwiXG4gICAgdGFiaW5kZXg9XCItMVwiXG4gICAgW2NsYXNzLnNoZWxsLWJvZHktLWFkbWluXT1cImFkbWluV2lkZSgpXCJcbiAgPlxuICA8cm91dGVyLW91dGxldCAvPlxuPC9tYWluPlxuXG48IS0tIEFwcC13aWRlIHNhZmV0eSBub3RpY2U6IHRoZSBsaXN0IGlzIGNvbW11bml0eS1tYWludGFpbmVkIGFuZCBOT1QgYW5cbiAgICAgb2ZmaWNpYWwgZW1lcmdlbmN5IGNoYW5uZWwgKHRoZSBcInZlcmlmaWVkIHVzZXIg4omgIHZlcmlmaWVkIHNoZWx0ZXJcIlxuICAgICB0cnVzdCBnYXApLiAxMTIgZmlyc3QsIHRoZW4gdGhlIG9mZmljaWFsIHNvdXJjZXMuIExpdmVzIGluIHRoZSBzaGVsbFxuICAgICBzbyBldmVyeSBwYWdlIGNhcnJpZXMgaXQsIGFuZCBvdXQgb2YgdGhlIGZlYXR1cmUgcGFnZXMnIGxheW91dC5cbiAgICAgaTE4bi1ldC1lbjogc2VnbWVudGVkIGFyb3VuZCB0aGUgdHdvIG9mZmljaWFsIGxpbmtzIOKAlCB0aGUgbGlua1xuICAgICBVUkxzIHN0YXkgY29uc3RhbnQsIG9ubHkgdGhlIGxhYmVscyB0cmFuc2xhdGUuIC0tPlxuPGZvb3RlciBjbGFzcz1cInNoZWxsLWZvb3RlclwiPlxuICA8IS0tIGxlZ2FsLXJlY292ZXJ5ICsgb2ZmaWNpYWwtZGF0YXNldC1jc3Y6XG4gICAgICAgdGhlIG1ldGEgcm93IHNpdHMgQUJPVkUgdGhlIG5vdGljZSAob3duZXIncyBsYXlvdXQgZGVjaXNpb24pIOKAlCB0aGVcbiAgICAgICB0d28gZ3JvdXBzIChsZWdhbCBsaW5rcywgZGF0YSBwcm92ZW5hbmNlKSBjZW50cmVkIGFzIGEgcGFpciBvblxuICAgICAgIGRlc2t0b3AsIHN0YWNrZWQgb24gbmFycm93ICg8OTAwcHgpLlxuICAgICAgIFByb3ZlbmFuY2UgaXMgbm9uLWNyaXRpY2FsOiBoaWRkZW4gd2hpbGUgbG9hZGluZyBvciBvbiBBUEkgZXJyb3IuXG4gICAgICAgaTE4bi1ldC1lbjogbGFiZWxzICsgdGhlIGRhdGUgc3RhbXAgZm9sbG93IHRoZSBhY3RpdmUgbG9jYWxlLiAtLT5cbiAgPGRpdiBjbGFzcz1cInNoZWxsLWZvb3Rlcl9fbWV0YVwiPlxuICAgIDxuYXYgY2xhc3M9XCJzaGVsbC1mb290ZXJfX2xlZ2FsXCIgW2F0dHIuYXJpYS1sYWJlbF09XCInZm9vdGVyLmxlZ2FsQXJpYScgfCB0XCI+XG4gICAgICA8YSByb3V0ZXJMaW5rPVwiL3ByaXZhY3lcIj57eyAnZm9vdGVyLnByaXZhY3knIHwgdCB9fTwvYT5cbiAgICAgIDxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPiZtaWRkb3Q7PC9zcGFuPlxuICAgICAgPGEgcm91dGVyTGluaz1cIi90ZXJtc1wiPnt7ICdmb290ZXIudGVybXMnIHwgdCB9fTwvYT5cbiAgICA8L25hdj5cbiAgICBAaWYgKGRhdGFTb3VyY2UoKTsgYXMgZHMpIHtcbiAgICAgIDxwIGNsYXNzPVwic2hlbGwtZm9vdGVyX19kYXRhXCI+XG4gICAgICAgIHt7ICdmb290ZXIuZGF0YVNvdXJjZScgfCB0IH19OiB7eyBkcy5zb3VyY2VOYW1lIH19XG4gICAgICAgIEBpZiAoZHMubGFzdEltcG9ydDsgYXMgbGFzdCkge1xuICAgICAgICAgIDxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPiZtaWRkb3Q7PC9zcGFuPlxuICAgICAgICAgIHt7ICdmb290ZXIubGFzdEltcG9ydCcgfCB0IH19XG4gICAgICAgICAge3sgbGFzdC5hdCB8IGRhdGU6ICdzaG9ydCcgOiB1bmRlZmluZWQgOiBpMThuLmxvY2FsZSgpIH19XG4gICAgICAgIH1cbiAgICAgICAgPHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCI+Jm1pZGRvdDs8L3NwYW4+XG4gICAgICAgIDxhIFtocmVmXT1cImRzLm9mZmljaWFsVXJsXCIgdGFyZ2V0PVwiX2JsYW5rXCIgcmVsPVwibm9vcGVuZXJcIj57e1xuICAgICAgICAgICdmb290ZXIub2ZmaWNpYWxPcGVuRGF0YScgfCB0XG4gICAgICAgIH19PC9hPlxuICAgICAgICA8c3BhbiBhcmlhLWhpZGRlbj1cInRydWVcIj4mbWlkZG90Ozwvc3Bhbj5cbiAgICAgICAge3sgJ2Zvb3Rlci5kYXRhU291cmNlVHJhbnNmb3JtZWQnIHwgdCB9fVxuICAgICAgPC9wPlxuICAgIH1cbiAgPC9kaXY+XG4gIDwhLS0gVGhlIHNhZmV0eSBub3RpY2U6IHRoZSBCT1RUT00gdGllciwgY2VudHJlZCBvbiBpdHMgb3duIGZ1bGwtd2lkdGhcbiAgICAgICBsaW5lICh0aGUgb3duZXIncyBuby13cmFwIHJlcXVpcmVtZW50IOKAlCB0aGUgY29tYmluZWQgc2VudGVuY2UgbmVlZHNcbiAgICAgICB+MTEwMHB4LCBzbyBpdCBtdXN0IGhhdmUgdGhlIHJvdyB0byBpdHNlbGYpLiAtLT5cbiAgPHAgY2xhc3M9XCJzaGVsbC1mb290ZXJfX25vdGljZVwiPlxuICAgIHt7ICdmb290ZXIubm90aWNlMScgfCB0IH19IHt7ICdmb290ZXIubm90aWNlMicgfCB0IH19IHt7ICdmb290ZXIubm90aWNlMycgfCB0IH19XG4gICAgPGEgW2hyZWZdPVwiaTE4bi51cmwoJ2Zvb3Rlci5yZXNjdWVCb2FyZCcpXCIgdGFyZ2V0PVwiX2JsYW5rXCIgcmVsPVwibm9vcGVuZXJcIj57e1xuICAgICAgJ2Zvb3Rlci5yZXNjdWVCb2FyZCcgfCB0XG4gICAgfX08L2E+XG4gICAge3sgJ2Zvb3Rlci5hbmQnIHwgdCB9fVxuICAgIDxhIFtocmVmXT1cImkxOG4udXJsKCdmb290ZXIubWluaXN0cnknKVwiIHRhcmdldD1cIl9ibGFua1wiIHJlbD1cIm5vb3BlbmVyXCI+e3tcbiAgICAgICdmb290ZXIubWluaXN0cnknIHwgdFxuICAgIH19PC9hXG4gICAgPi5cbiAgPC9wPlxuPC9mb290ZXI+XG5cbjwhLS0gVGhlIGFjY2Vzc2liaWxpdHkgZGlhbG9nIChhY2Nlc3NpYmlsaXR5LWRpYWxvZyk6IG1vdW50ZWQgaW4gdGhlIHNoZWxsXG4gICAgIG5leHQgdG8gdGhlIGhlYWRlciB0aGF0IG93bnMgaXRzIHRyaWdnZXIuIHJvbGU9ZGlhbG9nICsgYXJpYS1tb2RhbCxcbiAgICAgZm9jdXMgdHJhcHBlZCBpbnNpZGUsIEVzY2FwZSBjbG9zZXMsIGZvY3VzIHJldHVybnMgdG8gI2ExMXktdHJpZ2dlci5cbiAgICAgSXRzIFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUgc3R5bGVzaGVldCBhbHNvIGNhcnJpZXMgdGhlXG4gICAgIGJsYWNrLWFuZC15ZWxsb3cgdGhlbWUncyBwYWdlLXdpZGUgcnVsZXMgKHNlZSB0aGUgY29tcG9uZW50KS5cbiAgICAgTk9URTogbm8gYCNgIHJlZmVyZW5jZSBoZXJlIOKAlCBhIHRlbXBsYXRlIHJlZiBuYW1lZCBgYTExeURpYWxvZ2BcbiAgICAgd291bGQgc2hhZG93IHRoZSB2aWV3Q2hpbGQgc2lnbmFsIG9mIHRoZSBzYW1lIG5hbWUgaW4gdGVtcGxhdGVcbiAgICAgZXhwcmVzc2lvbnMgKHRoZSB0cmlnZ2VyJ3MgYXJpYS1leHBhbmRlZCByZWFkcyB0aGUgc2lnbmFsKS4gLS0+XG48YXBwLWFjY2Vzc2liaWxpdHktZGlhbG9nIC8+XG4iLCJpbXBvcnQgeyBjb21wdXRlZCwgSW5qZWN0YWJsZSwgc2lnbmFsIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1xuICBhcHBseUJsYWNrQW5kWWVsbG93VG9rZW5zLFxuICBCTEFDS19BTkRfWUVMTE9XX1RIRU1FLFxuICBjbGVhckJsYWNrQW5kWWVsbG93VG9rZW5zLFxuICBISUdIX0NPTlRSQVNUX1RIRU1FLFxuICB0eXBlIEFwcFRoZW1lLFxufSBmcm9tICcuL3RoZW1lLXRva2Vucyc7XG5cbi8qKlxuICogV2hlcmUgdGhlIFVJIHRoZW1lIHByZWZlcmVuY2UgbGl2ZXMgaW4gbG9jYWxTdG9yYWdlIChEMixcbiAqIGFjY2Vzc2liaWxpdHktYW5kLXByb3ZlbmFuY2U7IGV4dGVuZGVkIGJ5IGFjY2Vzc2liaWxpdHktZGlhbG9nKS4gT25seVxuICogdGhlIG5vbi1kZWZhdWx0IHZhbHVlcyBhcmUgZXZlciBzdG9yZWQg4oCUIHRoZSBkZWZhdWx0IChsaWdodCkgdGhlbWUgaXNcbiAqIHRoZSBBQlNFTkNFIG9mIHRoZSBrZXkgKG1pcnJvcnMgdGhlIHByZS1wYWludCBzY3JpcHQgaW4gaW5kZXguaHRtbCxcbiAqIHdoaWNoIHJlYWRzIHRoaXMgc2FtZSBrZXkgYmVmb3JlIGZpcnN0IHBhaW50KS5cbiAqL1xuY29uc3QgVEhFTUVfS0VZID0gJ29wZW5zaGVsdGVyLXRoZW1lJztcblxuLyoqXG4gKiBUaGUgcGVyc2lzdGVkIFVJIHRoZW1lIChEMjogcGVyc2lzdGVuY2UsIG5vIGZsYXNoIOKAlCBleHRlbmRlZCB0byB0aGVcbiAqIHRocmVlIGNvbnRyYXN0IG9wdGlvbnMgb2YgdGhlIGFjY2Vzc2liaWxpdHkgZGlhbG9nKS5cbiAqXG4gKiBTaWduYWwtYmFzZWQsIHNhbWUgcGVyc2lzdGVuY2Ugc2hhcGUgYXMgVG9rZW5TdG9yZSAoa2V5IGNvbnN0YW50ICtcbiAqIHRyeS9jYXRjaCBzbyBwcml2YXRlLW1vZGUgc3RvcmFnZSBkZWdyYWRlcyB0byBhIHNlc3Npb24tb25seVxuICogcHJlZmVyZW5jZSkuIFRoZSBgZGF0YS10aGVtZWAgYXR0cmlidXRlIG9uIGA8aHRtbD5gIGlzIHRoZSBDU1Mgc2VhbTpcbiAqIHRoZSBbZGF0YS10aGVtZT0naGlnaC1jb250cmFzdCddIGJsb2NrIGluIHN0eWxlcy5zY3NzIG92ZXJyaWRlcyB0aGVcbiAqIGRlc2lnbiB0b2tlbnMgZm9yIHRoYXQgdGhlbWU7IHRoZSBibGFjay1hbmQteWVsbG93IHRoZW1lIGFwcGxpZXMgaXRzXG4gKiB2ZXJpZmllZCB0b2tlbiB2YWx1ZXMgYXMgUlVOVElNRSBjdXN0b20gcHJvcGVydGllcyAodGhlbWUtdG9rZW5zLnRzIOKAlFxuICogdGhlIGRlc2lnbi10b2tlbnMgYXVkaXQga2VlcHMgaGV4IGxpdGVyYWxzIGluIHRoZSBzdHlsZXMuc2NzcyBibG9ja3MsXG4gKiBzbyB0aGUgdGhpcmQgdGhlbWUgbGl2ZXMgaW4gVFMpLiBObyBjb21wb25lbnQgc3R5bGUga25vd3MgdGhlIHRoZW1lXG4gKiBleGlzdHMgZWl0aGVyIHdheS5cbiAqXG4gKiBObyBpbml0KCkgbGlmZWN5Y2xlIGlzIG5lZWRlZCAodW5saWtlIEF1dGhTdG9yZSk6IHJlYWRpbmcgYVxuICogc3luY2hyb25vdXMgbG9jYWxTdG9yYWdlIGtleSBoYXMgbm8gYXN5bmMgcmFjZSwgc28gdGhlIGNvbnN0cnVjdG9yXG4gKiByZWFkcyB0aGUgc3RvcmUgb25jZSBhbmQgcmUtYXNzZXJ0cyB0aGUgYXR0cmlidXRlICsgdG9rZW5zLiBPbiBhXG4gKiByZWxvYWQgdGhlIGlubGluZSBpbmRleC5odG1sIHNjcmlwdCBhbHJlYWR5IGFwcGxpZWQgYm90aCBiZWZvcmUgZmlyc3RcbiAqIHBhaW50IOKAlCB0aGlzIHJlLWFzc2VydGlvbiBpcyBhbiBpZGVtcG90ZW50IG5vLW9wIHRoYXQgYWxzbyBjb3ZlcnMgdGhlXG4gKiBlZGdlIHdoZXJlIHRoYXQgc2NyaXB0IHdhcyBza2lwcGVkIChlLmcuIGEgYnVuZGxlciB0aGF0IHN0cmlwcyBoZWFkXG4gKiBzY3JpcHRzKS5cbiAqL1xuQEluamVjdGFibGUoeyBwcm92aWRlZEluOiAncm9vdCcgfSlcbmV4cG9ydCBjbGFzcyBUaGVtZVN0b3JlIHtcbiAgLyoqIFRoZSBhY3RpdmUgdGhlbWU6ICdkZWZhdWx0JyAobGlnaHQsIG5vIGF0dHJpYnV0ZSksICdoaWdoLWNvbnRyYXN0J1xuICAgICAgb3IgJ2JsYWNrLWFuZC15ZWxsb3cnICh0aGUgYXR0cmlidXRlICsgdGhlIHJ1bnRpbWUgdG9rZW5zKS4gKi9cbiAgcmVhZG9ubHkgdGhlbWUgPSBzaWduYWw8QXBwVGhlbWU+KHN0b3JlZFRoZW1lKCkpO1xuXG4gIC8qKiBUcnVlIHdoaWxlIHRoZSBoaWdoLWNvbnRyYXN0IHRoZW1lIGlzIGFjdGl2ZSDigJQgdGhlIHByZS1kaWFsb2dcbiAgICAgIEFQSSAoa2VwdCBmb3IgdGhlIGV4aXN0aW5nIGNvbnN1bWVycyBhbmQgc3BlY3MpLiAqL1xuICByZWFkb25seSBoaWdoQ29udHJhc3QgPSBjb21wdXRlZCgoKSA9PiB0aGlzLnRoZW1lKCkgPT09IEhJR0hfQ09OVFJBU1RfVEhFTUUpO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGFwcGx5VGhlbWUodGhpcy50aGVtZSgpKTtcbiAgfVxuXG4gIC8qKiBGbGlwIHRoZSB0aGVtZSAodGhlIGxlZ2FjeSB0b2dnbGU6IGxpZ2h0IOKGlCBoaWdoLWNvbnRyYXN0KS4gKi9cbiAgdG9nZ2xlKCk6IHZvaWQge1xuICAgIHRoaXMuc2V0KHRoaXMudGhlbWUoKSA9PT0gSElHSF9DT05UUkFTVF9USEVNRSA/ICdkZWZhdWx0JyA6IEhJR0hfQ09OVFJBU1RfVEhFTUUpO1xuICB9XG5cbiAgLyoqIEFwcGx5ICsgcGVyc2lzdCBhIHRoZW1lLiBEZWZhdWx0IHJlbW92ZXMgdGhlIGtleSAobm8gc3RvcmVkXG4gICAgICBwcmVmKSBhbmQgdGhlIGF0dHJpYnV0ZSArIHRva2VuczsgdGhlIG90aGVyIHR3byBzdG9yZSB0aGVpciB2YWx1ZS4gKi9cbiAgc2V0KHRoZW1lOiBBcHBUaGVtZSk6IHZvaWQge1xuICAgIHRoaXMudGhlbWUuc2V0KHRoZW1lKTtcbiAgICBhcHBseVRoZW1lKHRoZW1lKTtcbiAgICB0cnkge1xuICAgICAgaWYgKHRoZW1lID09PSAnZGVmYXVsdCcpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oVEhFTUVfS0VZKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFRIRU1FX0tFWSwgdGhlbWUpO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU3RvcmFnZSB1bmF2YWlsYWJsZSAocHJpdmF0ZSBtb2RlKTogdGhlIHRoZW1lIHN0aWxsIGFwcGxpZXMgZm9yXG4gICAgICAvLyB0aGlzIHNlc3Npb24sIGl0IGp1c3Qgd2lsbCBub3Qgc3Vydml2ZSBhIHJlbG9hZC5cbiAgICB9XG4gIH1cbn1cblxuLyoqIFRoZSBzdG9yZWQgdmFsdWUgd2hlbiBpdCBpcyBhIGtub3duIHRoZW1lLCBlbHNlIHRoZSBkZWZhdWx0IOKAlCBhblxuICAgIGludmFsaWQvc3RhbGUgdmFsdWUgZmFsbHMgYmFjayBpbnN0ZWFkIG9mIGNyYXNoaW5nIGZpcnN0IHBhaW50LiAqL1xuZnVuY3Rpb24gc3RvcmVkVGhlbWUoKTogQXBwVGhlbWUge1xuICB0cnkge1xuICAgIGNvbnN0IHN0b3JlZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFRIRU1FX0tFWSk7XG4gICAgaWYgKHN0b3JlZCA9PT0gSElHSF9DT05UUkFTVF9USEVNRSB8fCBzdG9yZWQgPT09IEJMQUNLX0FORF9ZRUxMT1dfVEhFTUUpIHtcbiAgICAgIHJldHVybiBzdG9yZWQ7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvKiBzdG9yYWdlIHVuYXZhaWxhYmxlIChwcml2YXRlIG1vZGUpICovXG4gIH1cbiAgcmV0dXJuICdkZWZhdWx0Jztcbn1cblxuLyoqXG4gKiBUaGUgQ1NTIHNlYW06IHRoZSBhdHRyaWJ1dGUgKyB0aGUgYmxhY2stYW5kLXllbGxvdyBydW50aW1lIHRva2Vucy5cbiAqIEhpZ2ggY29udHJhc3QgaXMgb3duZWQgYnkgdGhlIFNDU1MgdG9rZW4gYmxvY2sgKHRoZSBhdHRyaWJ1dGUgYWxvbmUpO1xuICogdGhlIGJsYWNrLWFuZC15ZWxsb3cgdmFsdWVzIHJpZGUgb24gaW5saW5lIGN1c3RvbSBwcm9wZXJ0aWVzLCB3aGljaFxuICogbXVzdCBiZSBDTEVBUkVEIHdoZW4gc3dpdGNoaW5nIHRvIGVpdGhlciBvdGhlciB0aGVtZSAoaW5saW5lIHN0eWxlc1xuICogd291bGQgb3RoZXJ3aXNlIGJlYXQgdGhlIFNDU1MgYmxvY2sgLyA6cm9vdCBkZWZhdWx0cykuXG4gKi9cbmZ1bmN0aW9uIGFwcGx5VGhlbWUodGhlbWU6IEFwcFRoZW1lKTogdm9pZCB7XG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGlmICh0aGVtZSA9PT0gJ2RlZmF1bHQnKSB7XG4gICAgcm9vdC5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtdGhlbWUnKTtcbiAgICBjbGVhckJsYWNrQW5kWWVsbG93VG9rZW5zKHJvb3QpO1xuICAgIHJldHVybjtcbiAgfVxuICByb290LnNldEF0dHJpYnV0ZSgnZGF0YS10aGVtZScsIHRoZW1lKTtcbiAgaWYgKHRoZW1lID09PSBCTEFDS19BTkRfWUVMTE9XX1RIRU1FKSB7XG4gICAgYXBwbHlCbGFja0FuZFllbGxvd1Rva2Vucyhyb290KTtcbiAgfSBlbHNlIHtcbiAgICBjbGVhckJsYWNrQW5kWWVsbG93VG9rZW5zKHJvb3QpO1xuICB9XG59XG4iLCIvKipcbiAqIFRoZSBwZXJzaXN0ZWQgVUkgdGhlbWUgKGFjY2Vzc2liaWxpdHktZGlhbG9nLCBleHRlbmRpbmcgRDIpOiB0aHJlZVxuICogb3B0aW9ucyDigJQgdGhlIGxpZ2h0IERFRkFVTFQgKGFic2VudCBrZXkgLyBubyBhdHRyaWJ1dGUpLCB0aGVcbiAqIGhpZ2gtY29udHJhc3QgU0NTUyB0b2tlbiBvdmVycmlkZSAodGhlIFtkYXRhLXRoZW1lPSdoaWdoLWNvbnRyYXN0J11cbiAqIGJsb2NrIGluIHN0eWxlcy5zY3NzKSBhbmQgdGhlIGJsYWNrLWFuZC15ZWxsb3cgdGhlbWUuXG4gKlxuICogQmxhY2stYW5kLXllbGxvdyBpcyBhcHBsaWVkIGFzIFJVTlRJTUUgQ1NTIGN1c3RvbSBwcm9wZXJ0aWVzIG9uIDxodG1sPlxuICogaW5zdGVhZCBvZiBhbiBTQ1NTIHRva2VuIGJsb2NrLCBvbiBwdXJwb3NlOiB0aGUgZGVzaWduLXRva2VucyBhdWRpdFxuICogKHNyYy9hcHAvZGVzaWduLXRva2Vucy5zcGVjLnRzKSBhbGxvd3MgaGV4IGxpdGVyYWxzIG9ubHkgaW5zaWRlIHRoZVxuICogc3R5bGVzLnNjc3MgOnJvb3QgKyBoaWdoLWNvbnRyYXN0IGJsb2NrcywgYW5kIHN0eWxlcy5zY3NzIGlzIG5vdFxuICogZWRpdGFibGUgdGhpcyB3YXZlIOKAlCBzbyB0aGUgdGhpcmQgdGhlbWUncyB2ZXJpZmllZCB2YWx1ZXMgbGl2ZSBoZXJlIGluXG4gKiBUeXBlU2NyaXB0IGFuZCBhcmUgYXBwbGllZCBieSBUaGVtZVN0b3JlIChwb3N0LXBhaW50KSBhbmQgdGhlIGlubGluZVxuICogaW5kZXguaHRtbCBwcmUtcGFpbnQgc2NyaXB0IChiZWZvcmUgcGFpbnQpLiBUaGUgU0NTUyBldmVyeXdoZXJlIGVsc2VcbiAqIG9ubHkgZXZlciByZWZlcmVuY2VzIHZhcigtLWNvbG9yLSopLCBzbyB0aGUgcnVudGltZSB2YWx1ZXMgZmxvdyB0aHJvdWdoXG4gKiB0aGUgZXhpc3RpbmcgdG9rZW4gc2VhbSB1bmNoYW5nZWQuXG4gKi9cblxuZXhwb3J0IHR5cGUgQXBwVGhlbWUgPSAnZGVmYXVsdCcgfCAnaGlnaC1jb250cmFzdCcgfCAnYmxhY2stYW5kLXllbGxvdyc7XG5cbi8qKiBUaGUgc3RvcmVkIGxvY2FsU3RvcmFnZSB2YWx1ZSBvZiB0aGUgaGlnaC1jb250cmFzdCB0aGVtZS4gKi9cbmV4cG9ydCBjb25zdCBISUdIX0NPTlRSQVNUX1RIRU1FID0gJ2hpZ2gtY29udHJhc3QnO1xuLyoqIFRoZSBzdG9yZWQgbG9jYWxTdG9yYWdlIHZhbHVlIG9mIHRoZSBibGFjay1hbmQteWVsbG93IHRoZW1lLiAqL1xuZXhwb3J0IGNvbnN0IEJMQUNLX0FORF9ZRUxMT1dfVEhFTUUgPSAnYmxhY2stYW5kLXllbGxvdyc7XG5cbi8qKlxuICogVGhlIGJsYWNrLWFuZC15ZWxsb3cgcGFsZXR0ZSBvbiAjMDAwIChvd25lci12ZXJpZmllZCByYXRpb3M7IHRoZVxuICogY29tcHV0ZWQgb25lcyBmb2xsb3cgdGhlIHNhbWUgbWV0aG9kIGFzIHRoZSBoaWdoLWNvbnRyYXN0IGJsb2NrJ3NcbiAqIHZlcmlmaWVkIGNvbW1lbnRzKTpcbiAqXG4gKiAgIHRleHQgICAgI2ZmZDQwMCAgIG9uICMwMDAgICAgICAgIDE0LjY3OjFcbiAqICAgbXV0ZWQgICAjZDRiNTNhICAgb24gIzAwMCAgICAgICAgMTAuNDc6MVxuICogICBsaW5rICAgICNmZmUwNjYgICBvbiAjMDAwICAgICAgICAxNi4xMToxIChsaW5rLXZzLXRleHQgaXMgMS4xMDoxLCBzb1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlua3MgYXJlIFVOREVSTElORUQg4oCUIHRoZSBnbG9iYWxcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGUgc2hpcHMgaW4gdGhlIGFjY2Vzc2liaWxpdHlcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpYWxvZydzIHN0eWxlc2hlZXQsIFdDQUcgMS40LjEpXG4gKiAgIENUQSAvICAgI2ZmOWYxYyAgIGJsYWNrIG9uIGl0ICAgIDEwLjIzOjEgKHRoZSBDVEEgKyBwcmltYXJ5IGZpbGxcbiAqICAgcHJpbWFyeSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYW1pbHk7IHNlZSB0aGUgbm90ZSBiZWxvdylcbiAqICAgcHJpbWFyeSAjZmZkNDAwICAgYmxhY2sgb24gaXQgICAgMTQuNjc6MSAoYnRuLS1wcmltYXJ5IElOVkVSVFM6XG4gKiAgIGJ1dHRvbiAgICh0aGUgLS1jb2xvci10ZXh0IHZhbHVlLCB0aGUgLmJ0bi0tcHJpbWFyeSBvdmVycmlkZSBydWxlKVxuICogICByZXBvcnRlZCAjZmY2YjRkICBibGFjayBvbiBpdCAvICA3LjQ2OjEgIChzdGF5cyByZWQtZmFtaWx5KVxuICogICBkYW5nZXIgICBhcyB0ZXh0IG9uICMwMDBcbiAqICAgc3VjY2VzcyAjN2ZkNDlhICAgb24gIzAwMCAgICAgICAgMTEuNzk6MVxuICogICByZWdpc3RyeSAjN2FiOGZmICBvbiBiYWRnZSAjMTQyNjNhICA3LjQ6MSAodGhlIGJhZGdlIGZpbGwgcmV1c2VzIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGlnaC1jb250cmFzdCBkYXJrIHRpbnQg4oCUIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQgcGFpcilcbiAqICAgbmV3ICAgICAjZmZkNDAwICAgYmxhY2sgb24gaXQgICAgMTQuNjc6MSAoPSB0aGUgdmVyaWZpZWQgdmFsdWUg4oCUIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHllbGxvdyBmYW1pbHkgaXMgT05FIHZhbHVlLCBvd25lciBkZWNpc2lvbilcbiAqICAgcGljayAgICAjNGRkMGM0ICAgb24gIzAwMCAgICAgICAgMTAuOToxICh0aGUgc2VsZWN0ZWQtcG9pbnQgcGluKVxuICogICBpbmZvICAgICM4YWM2ZjUgICBvbiAjMDAwICAgICAgICAxMS43OjFcbiAqICAgYm9yZGVyICAjOGE3NDAwICAgdnMgIzAwMCAgICAgICAgNC41ODoxIChVSSBib3VuZGFyeSDiiaUgMzoxKVxuICpcbiAqIENBUkRTIGFyZSBkaXN0aW5ndWlzaGVkIGJ5IEJPUkRFUiwgbm90IGJ5IGEgZGFyayB0aW50OiBldmVyeSBzdXJmYWNlXG4gKiB0b2tlbiBpcyAjMDAwMDAwIOKAlCAjMTExIG9uIGJsYWNrIGlzIDEuMTE6MSBhbmQgd291bGQgYmUgaW52aXNpYmxlLCBzb1xuICogLS1jb2xvci1ib3JkZXIgY2FycmllcyB0aGUgY2FyZCBlZGdlICg0LjU4OjEpLiAtLWNvbG9yLWJnLXN1cmZhY2UgaXNcbiAqICMwMDAgQU5EIGRvdWJsZXMgYXMgdGhlIFwidGV4dCBvbiBwcmltYXJ5XCIgY29sb3VyICh0aGUgYnRuLS1wcmltYXJ5XG4gKiBjb252ZW50aW9uIGZyb20gdGhlIGhpZ2gtY29udHJhc3QgYmxvY2spLCB3aGljaCBpcyB3aGF0IG1ha2VzIHRoZVxuICogaW52ZXJ0ZWQgcHJpbWFyeSBidXR0b24gYmxhY2stb24teWVsbG93IHdpdGggbm8gZXh0cmEgcnVsZS5cbiAqXG4gKiBUaGUgY2hyb21lIGJhbmQgKGhlYWRlci9mb290ZXIpIEZPTExPV1MgdGhpcyB0aGVtZSAob3duZXIgZGVjaXNpb24pOlxuICogdGhlIG1vZGUncyB3b3JkIGZvciBpdCBpcyBcImJsYWNrIGFuZCB5ZWxsb3cgPSB5ZWxsb3cgdGV4dCBvbiBhIGJsYWNrXG4gKiBiYWNrZ3JvdW5kXCIsIHNvIHRoZSAtLWNvbG9yLWNocm9tZS0qIHZhbHVlcyBhcmUgYmxhY2sgKyB0aGUgcGFsZXR0ZSdzXG4gKiB5ZWxsb3dzIChkZXNpZ24tdG9rZW5zLnNwZWMudHMgcmUtcnVucyB0aG9zZSByYXRpb3MgbGlrZSB0aGUgcmVzdCBvZlxuICogdGhlIG1hcDsgYSBuYW1lLXNldCB0ZXN0IHBpbnMgdGhhdCB0aGUgbWFwIG92ZXJyaWRlcyBldmVyeSA6cm9vdFxuICogdG9rZW4sIHNvIG5vIG5hdnkgdmFsdWUgY2FuIGxlYWsgdGhyb3VnaCB0aGUgYmFuZCkuIFRoZVxuICogaGlnaC1jb250cmFzdCB0aGVtZSBrZWVwcyB0aGUgbmF2eSBiYW5kIOKAlCB0aGF0IGlzIHRoZSBIQyBTQ1NTIGJsb2NrJ3NcbiAqIG93biB2YWx1ZXMsIHNwZWMtZW5mb3JjZWQgdGhlcmUuIFRoZSBNQVAgaXMgbm90IHRoZW1lZCAoT1NNIHRpbGVzXG4gKiBzdGF5IGxpZ2h0KTsgLS1jb2xvci1tYXAtcGxhY2Vob2xkZXIgYW5kIHRoZSBtYXJrZXIgaHVlcyBrZWVwIHRoZVxuICogc291cmNlIGNvZGluZy5cbiAqL1xuZXhwb3J0IGNvbnN0IEJMQUNLX0FORF9ZRUxMT1dfVE9LRU5TOiBSZWFkb25seTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiA9IHtcbiAgLyogVGV4dCAmIHN1cmZhY2VzICovXG4gICctLWNvbG9yLXRleHQnOiAnI2ZmZDQwMCcsXG4gICctLWNvbG9yLW11dGVkJzogJyNkNGI1M2EnLFxuICAnLS1jb2xvci1iZyc6ICcjMDAwMDAwJyxcbiAgJy0tY29sb3ItYmctc3VyZmFjZSc6XG4gICAgJyMwMDAwMDAnIC8qIGNhcmRzOiBib3JkZXItZGlzdGluZ3Vpc2hlZDsgYWxzbyB0aGUgdGV4dC1vbi1wcmltYXJ5IGNvbG91ciAqLyxcbiAgJy0tY29sb3ItYmctc3VidGxlJzogJyMwMDAwMDAnLFxuICAnLS1jb2xvci1zdXJmYWNlLWhvdmVyJzogJyMyYjI0MDAnIC8qIGdob3N0LWJ1dHRvbiBob3ZlciBmaWxsIOKAlCB0ZXh0IG9uIGl0IDEwLjg6MSAqLyxcbiAgJy0tY29sb3Itc3VyZmFjZS1vdmVybGF5JzogJ3JnYmEoMCwgMCwgMCwgMC45MiknIC8qIGxlZ2VuZCBjYXJkIG92ZXIgdGhlIGxpZ2h0IHRpbGVzICovLFxuICAnLS1jb2xvci1iYWNrZHJvcCc6ICdyZ2JhKDAsIDAsIDAsIDAuOCknLFxuICAvKiBCcmFuZCAqL1xuICAnLS1jb2xvci1wcmltYXJ5JzogJyNmZjlmMWMnIC8qIENUQS9wcmltYXJ5IGZpbGwgZmFtaWx5ICsgZm9jdXMgcmluZyAqLyxcbiAgJy0tY29sb3ItcHJpbWFyeS1ob3Zlcic6ICcjZmZiMzQ3JyAvKiBibGFjayBvbiBpdCAxMS43OToxICovLFxuICAnLS1jb2xvci1icmFuZCc6ICcjZmZkNDAwJyxcbiAgJy0tY29sb3ItYWNjZW50JzogJyM0ZGQwYzQnLFxuICAvKiBUaGUgbGluayBjb2xvdXIgKHRoZSB0aGlyZCB0aGVtZSBhZGRzIGEgTElOSyB0b2tlbiBvZiBpdHMgb3duOlxuICAgICBsaW5rcyBtdXN0IHN0YXkgZGlzdGluZ3Vpc2hhYmxlIGZyb20gdGhlIGJvZHkgdGV4dCwgV0NBRyAxLjQuMSkuXG4gICAgIENvbnN1bWVkIGJ5IHRoZSBnbG9iYWwgcnVsZSBpbiB0aGUgYWNjZXNzaWJpbGl0eSBkaWFsb2cncyBzY3NzLiAqL1xuICAnLS1jb2xvci1saW5rJzogJyNmZmUwNjYnLFxuICAvKiBDaHJvbWUgYmFuZCAoaGVhZGVyICsgZm9vdGVyICsgPDkwMCBtZW51IHBhbmVsKSDigJQgdGhlIG93bmVyJ3Mgd29yZDpcbiAgICAgQkxBQ0sgYmFja2dyb3VuZCwgWUVMTE9XIHRleHQuIEV2ZXJ5IGJhbmQgc3VyZmFjZSByaWRlcyBvbiB0aGVzZVxuICAgICB0b2tlbnMsIHNvIHRoZSB3aG9sZSBiYW5kIGZvbGxvd3MgdGhlIHRoZW1lOlxuICAgICBiZyAgICAgIzAwMDAwMCAgKHRoZSBibGFjayBiYWNrZ3JvdW5kKVxuICAgICB0ZXh0ICAgI2ZmZDQwMCAgb24gIzAwMCAgMTQuNjc6MSAod29yZG1hcmssIG5hdiBsaW5rcywgZm9vdGVyIGxpbmtzKVxuICAgICBtdXRlZCAgI2Q0YjUzYSAgb24gIzAwMCAgMTAuNDc6MSAoZm9vdGVyIG5vdGljZSArIHByb3ZlbmFuY2UgdGV4dClcbiAgICAgZm9jdXMgICNmZmQ0MDAgIG9uICMwMDAgIDE0LjY3OjEgKD49IDM6MSDigJQgdGhlIGZvY3VzIHJpbmcgb24gdGhlIGJhbmQpXG4gICAgIGFjdGl2ZSAjZmZkNDAwICBvbiAjMDAwICAxNC42NzoxICg+PSAzOjEg4oCUIHRoZSBhY3RpdmUtbmF2IGluZGljYXRvcilcbiAgICAgYm9yZGVyICM4YTc0MDAgIG9uICMwMDAgIDQuNTg6MSAgKD49IDM6MSDigJQgdGhlIGJhbmQgZGl2aWRlciArIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnaG9zdCBidXR0b25zJyBlZGdlLCBlbmZvcmNlZCBhdCAzOjEpXG4gICAgIFRoZSBoZWFkZXIgZ2hvc3QgYnV0dG9ucycgcmVzdGluZyBmaWxsIGlzIC0tY29sb3ItYmcgKCMwMDApIGFuZCB0aGVcbiAgICAgaG92ZXIgZmlsbCAtLWNvbG9yLXN1cmZhY2UtaG92ZXIgKCMyYjI0MDApOiAxLjAwOjEgLyAxLjM2OjEgYWdhaW5zdFxuICAgICB0aGUgYmFuZCDigJQgZG9jdW1lbnRlZCBleGVtcHRpb25zIGluIGRlc2lnbi10b2tlbnMuc3BlYy50cyAodGhlXG4gICAgIDQuNTg6MSBib3JkZXIgZWRnZSArIHRoZSAxNC42NzoxIHllbGxvdyBsYWJlbCBjYXJyeSB0aGVcbiAgICAgaWRlbnRpZmljYXRpb24sIHRoZSBzYW1lIGZpbGwrbGFiZWwgcmF0aW9uYWxlIGFzIHRoZSBIQyBiYW5kJ3MpLlxuICAgICBUaGUgbmF2IGxpbmtzJyB1bmRlcmxpbmUgKHRoZSBub24tY29sb3VyIGxpbmsgY3VlKSBzaGlwcyBpbiB0aGVcbiAgICAgYWNjZXNzaWJpbGl0eSBkaWFsb2cncyBwYWdlLXdpZGUgcnVsZXMuICovXG4gICctLWNvbG9yLWNocm9tZS1iZyc6ICcjMDAwMDAwJyxcbiAgJy0tY29sb3ItY2hyb21lLXRleHQnOiAnI2ZmZDQwMCcsXG4gICctLWNvbG9yLWNocm9tZS1tdXRlZCc6ICcjZDRiNTNhJyxcbiAgJy0tY29sb3ItY2hyb21lLWZvY3VzJzogJyNmZmQ0MDAnLFxuICAnLS1jb2xvci1jaHJvbWUtYWN0aXZlJzogJyNmZmQ0MDAnLFxuICAnLS1jb2xvci1jaHJvbWUtYm9yZGVyJzogJyM4YTc0MDAnLFxuICAvKiBDVEEgKyByZXBvcnRlZCArIG5ldyAodGhlIENUQS9yZXBvcnRlZCBmaWxscyBjYXJyeSBCTEFDSyB0ZXh0IOKAlFxuICAgICAtLWNvbG9yLWJnLXN1cmZhY2U7IG5ldyBpcyB1bmlmaWVkIHdpdGggdGhlIHZlcmlmaWVkIHllbGxvdykgKi9cbiAgJy0tY29sb3ItY3RhJzogJyNmZjlmMWMnLFxuICAnLS1jb2xvci1yZXBvcnRlZCc6ICcjZmY2YjRkJyxcbiAgJy0tY29sb3ItbmV3JzogJyNmZmQ0MDAnLCAvKiBPTkUgdmFsdWUgd2l0aCAtLWNvbG9yLXZlcmlmaWVkIOKAlCB0aGUgdW5pZmllZCB5ZWxsb3cgZmFtaWx5ICovXG4gIC8qIFN1Ym1pdHRlci12ZXJpZmllZCBtYXJrZXIgZmlsbCAoc3VibWl0dGVyLXZlcmlmaWNhdGlvbi1iYWRnZSkg4oCUIHRoZSBzYW1lXG4gICAgIG5hbWUgYXMgOnJvb3QsIHNvIHRoZSB0aGVtZSBsYXllcnMgc3RheSBpbiBsb2Nrc3RlcCAoZGVzaWduLXRva2Vucy5zcGVjXG4gICAgIGFzc2VydHMgYm90aCBkaXJlY3Rpb25zKS4gKi9cbiAgJy0tY29sb3ItdmVyaWZpZWQnOiAnI2ZmZDQwMCcsXG4gIC8qIEJvcmRlcnMgKHRoZSBjYXJkIGVkZ2UgaXMgdGhlIHN0cnVjdHVyZSBvZiB0aGlzIHRoZW1lKSAqL1xuICAnLS1jb2xvci1ib3JkZXInOiAnIzhhNzQwMCcsXG4gICctLWNvbG9yLWJvcmRlci1zdWJ0bGUnOiAnIzZiNTkwMCcgLyogZGVjb3JhdGl2ZSBkaXZpZGVyICjiiYgzOjEpICovLFxuICAvKiBTdGF0dXMgcGFsZXR0ZSAqL1xuICAnLS1jb2xvci1kYW5nZXInOiAnI2ZmNmI0ZCcsXG4gICctLWNvbG9yLWRhbmdlci1iZyc6ICcjMmExMjBkJyAvKiBkYW5nZXIgb24gaXQgNi4zOjEgKi8sXG4gICctLWNvbG9yLWRhbmdlci1ib3JkZXInOiAnIzdhM2EyZCcsXG4gICctLWNvbG9yLWVycm9yJzogJyNmZjZiNGQnLFxuICAnLS1jb2xvci13YXJuaW5nJzogJyNmZmI4NGQnLFxuICAnLS1jb2xvci13YXJuaW5nLWJnJzogJyMyOTIwMDgnIC8qIHdhcm5pbmcgb24gaXQgOS4zNzoxICovLFxuICAnLS1jb2xvci13YXJuaW5nLWJvcmRlcic6ICcjNmU1YTFlJyxcbiAgJy0tY29sb3ItaW5mbyc6ICcjOGFjNmY1JyxcbiAgJy0tY29sb3ItaW5mby1iZyc6ICcjMTAyMjJmJyAvKiBpbmZvIG9uIGl0IDguOToxICh0aGUgdmVyaWZpZWQgcGFpcikgKi8sXG4gICctLWNvbG9yLWluZm8tYm9yZGVyJzogJyMyZjVhN2EnLFxuICAnLS1jb2xvci1zdWNjZXNzJzogJyM3ZmQ0OWEnLFxuICAnLS1jb2xvci1zdWNjZXNzLWJnJzogJyMwZjJhMTgnIC8qIHN1Y2Nlc3Mgb24gaXQgOC42OjEgKHRoZSB2ZXJpZmllZCBwYWlyKSAqLyxcbiAgJy0tY29sb3Itc3VjY2Vzcy1ib3JkZXInOiAnIzJmNmU0NScsXG4gICctLWNvbG9yLXN1Y2Nlc3MtYmctc29mdCc6ICcjMTIyNDE3JyxcbiAgLyogU291cmNlIGJhZGdlcyAoZGFyayBmaWxscywgdGhlIHZlcmlmaWVkIHRleHQgcGFpcnMpICovXG4gICctLWNvbG9yLWJhZGdlLXJlZ2lzdHJ5JzogJyMxNDI2M2EnLFxuICAnLS1jb2xvci1iYWRnZS11c2VyJzogJyMxMTMwMWQnLFxuICAnLS1jb2xvci1iYWRnZS1uZXcnOiAnIzMzMmIxMicgLyogd2FybmluZyBvbiBpdCA4LjE4OjEgKi8sXG4gIC8qIE1hcCArIG1hcmtlcnMgKHRoZSBtYXAgaXMgbm90IHRoZW1lZCDigJQgdGlsZXMgc3RheSBsaWdodCkgKi9cbiAgJy0tY29sb3Itc2hlbHRlci1yZWdpc3RyeSc6ICcjN2FiOGZmJyxcbiAgJy0tY29sb3Itc2hlbHRlci11c2VyJzogJyM3YWM5OGEnLFxuICAnLS1jb2xvci1zaGVsdGVyLXBpY2snOiAnIzRkZDBjNCcsXG4gICctLWNvbG9yLW1hcC1wbGFjZWhvbGRlcic6ICcjZTllZWYyJyxcbn07XG5cbi8qKiBUaGUgdG9rZW4gbmFtZXMg4oCUIGNsZWFyaW5nIHJlbW92ZXMgZXhhY3RseSB3aGF0IHdhcyBzZXQuICovXG5leHBvcnQgY29uc3QgQkxBQ0tfQU5EX1lFTExPV19UT0tFTl9OQU1FUzogcmVhZG9ubHkgc3RyaW5nW10gPSBPYmplY3Qua2V5cyhCTEFDS19BTkRfWUVMTE9XX1RPS0VOUyk7XG5cbi8qKiBUaGUgdG9rZW4gYXBwbGllcnMgb25seSBuZWVkIHRoZSBzdHlsZSBvYmplY3QgKHRoZSBwcmUtcGFpbnQgc2NyaXB0J3NcbiAqICBmYWtlIHJvb3RzIGNhcnJ5IGl0IHdpdGhvdXQgdGhlIGF0dHJpYnV0ZSBzZWFtKS4gKi9cbmV4cG9ydCB0eXBlIFRoZW1lU3R5bGVSb290ID0ge1xuICBzdHlsZTogeyBzZXRQcm9wZXJ0eShuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiB2b2lkOyByZW1vdmVQcm9wZXJ0eShuYW1lOiBzdHJpbmcpOiB2b2lkIH07XG59O1xuXG4vKiogQXBwbHkgdGhlIGJsYWNrLWFuZC15ZWxsb3cgdG9rZW4gc2V0IHRvIDxodG1sPiAoaW5saW5lIGN1c3RvbVxuICogIHByb3BlcnRpZXMgYmVhdCA6cm9vdCwgc28gbm8gU0NTUyBjaGFuZ2UgaXMgbmVlZGVkIGRvd25zdHJlYW0pLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5QmxhY2tBbmRZZWxsb3dUb2tlbnMocm9vdDogVGhlbWVTdHlsZVJvb3QpOiB2b2lkIHtcbiAgZm9yIChjb25zdCBuYW1lIG9mIEJMQUNLX0FORF9ZRUxMT1dfVE9LRU5fTkFNRVMpIHtcbiAgICByb290LnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIEJMQUNLX0FORF9ZRUxMT1dfVE9LRU5TW25hbWVdKTtcbiAgfVxufVxuXG4vKiogUmVtb3ZlIHRoZSBibGFjay1hbmQteWVsbG93IHRva2VucyAodGhlbWUgc3dpdGNoIGF3YXkgZnJvbSBpdCkuICovXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJCbGFja0FuZFllbGxvd1Rva2Vucyhyb290OiBUaGVtZVN0eWxlUm9vdCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgQkxBQ0tfQU5EX1lFTExPV19UT0tFTl9OQU1FUykge1xuICAgIHJvb3Quc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gIH1cbn1cbiIsImltcG9ydCB7IGluamVjdCwgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgbGFzdFZhbHVlRnJvbSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgQXBpQ2xpZW50IH0gZnJvbSAnLi4vY29yZS9hcGktY2xpZW50JztcbmltcG9ydCB0eXBlIHsgRGF0YVNvdXJjZUR0byB9IGZyb20gJy4uL2NvcmUvbW9kZWxzJztcblxuLyoqXG4gKiBUaGUgZG9vciB0byBHRVQgL2FwaS9kYXRhLXNvdXJjZSAob2ZmaWNpYWwtZGF0YXNldC1jc3YpIOKAlCB0aGVcbiAqIGFwcC13aWRlIHByb3ZlbmFuY2UgbGluZSBpbiB0aGUgZm9vdGVyLiBOb24tY3JpdGljYWw6IGFueSBmYWlsdXJlXG4gKiByZXNvbHZlcyB0byBudWxsIGFuZCB0aGUgZm9vdGVyIGxpbmUgc2ltcGx5IHN0YXlzIGhpZGRlbi5cbiAqL1xuQEluamVjdGFibGUoeyBwcm92aWRlZEluOiAncm9vdCcgfSlcbmV4cG9ydCBjbGFzcyBEYXRhU291cmNlR2F0ZXdheSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgYXBpID0gaW5qZWN0KEFwaUNsaWVudCk7XG5cbiAgYXN5bmMgZmV0Y2goKTogUHJvbWlzZTxEYXRhU291cmNlRHRvIHwgbnVsbD4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgbGFzdFZhbHVlRnJvbSh0aGlzLmFwaS5nZXQ8RGF0YVNvdXJjZUR0bz4oJy9hcGkvZGF0YS1zb3VyY2UnKSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7XG4gIGFmdGVyTmV4dFJlbmRlcixcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgaW5qZWN0LFxuICBJbmplY3RvcixcbiAgcnVuSW5JbmplY3Rpb25Db250ZXh0LFxuICBzaWduYWwsXG4gIFZpZXdFbmNhcHN1bGF0aW9uLFxuICB2aWV3Q2hpbGQsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgVGhlbWVTdG9yZSB9IGZyb20gJy4uL2NvcmUvdGhlbWUtc3RvcmUnO1xuaW1wb3J0IHR5cGUgeyBBcHBUaGVtZSB9IGZyb20gJy4uL2NvcmUvdGhlbWUtdG9rZW5zJztcbmltcG9ydCB7IFRyYW5zbGF0ZVBpcGUgfSBmcm9tICcuLi9jb3JlL2kxOG4vdHJhbnNsYXRlLXBpcGUnO1xuaW1wb3J0IHR5cGUgeyBNZXNzYWdlS2V5IH0gZnJvbSAnLi4vY29yZS9pMThuL21lc3NhZ2VzJztcblxuLyoqXG4gKiBUaGUgYWNjZXNzaWJpbGl0eSBkaWFsb2cgKGFjY2Vzc2liaWxpdHktZGlhbG9nKTogdGhlIGdvdmVybm1lbnQtc2l0ZVxuICogY29udHJhc3QgcGFuZWwgdGhlIGhlYWRlcidzIFwiQWNjZXNzaWJpbGl0eVwiIGJ1dHRvbiBvcGVucy4gVGhyZWVcbiAqIGNvbnRyYXN0IG9wdGlvbnMg4oCUIERlZmF1bHQgLyBIaWdoIGNvbnRyYXN0IC8gQmxhY2sgYW5kIHllbGxvdyDigJQgYXMgYVxuICogcmVhbCByYWRpbyBncm91cDsgdGhlIGNob2ljZSBhcHBsaWVzIEFORCBwZXJzaXN0cyBpbW1lZGlhdGVseSAodGhlXG4gKiBUaGVtZVN0b3JlIG93bnMgdGhlIGxvY2FsU3RvcmFnZSBrZXkgKyB0aGUgPGh0bWwgZGF0YS10aGVtZT4gc2VhbSkuXG4gKlxuICogQWNjZXNzaWJpbGl0eSBjb250cmFjdDpcbiAqICAtIGByb2xlPVwiZGlhbG9nXCJgICsgYGFyaWEtbW9kYWw9XCJ0cnVlXCJgLCBsYWJlbGxlZCBieSBpdHMgdGl0bGUgYW5kXG4gKiAgICBkZXNjcmliZWQgYnkgaXRzIGJvZHk7XG4gKiAgLSBvbiBvcGVuLCBmb2N1cyBtb3ZlcyBJTlRPIHRoZSBkaWFsb2cgKHRoZSBjb250YWluZXIgdGFrZXMgZm9jdXMgc29cbiAqICAgIHRoZSBzY3JlZW4gcmVhZGVyIGFubm91bmNlcyB0aGUgZGlhbG9nIG5hbWUpO1xuICogIC0gZm9jdXMgaXMgVFJBUFBFRDogVGFiIC8gU2hpZnQrVGFiIGN5Y2xlIGluc2lkZSB0aGUgZGlhbG9nLCBzbyB0aGVcbiAqICAgIGtleWJvYXJkIGNhbm5vdCByZWFjaCB0aGUgaW5lcnQgcGFnZSBiZWhpbmQgdGhlIG92ZXJsYXkgKHRoZVxuICogICAgY29uc2VudC1iYW5uZXIncyB0cmFwLCBleHRlbmRlZCk7XG4gKiAgLSBFc2NhcGUgY2xvc2VzIGl0IChubyBiYWNrZHJvcCBjbGljayBvbiB0aGUgZGlhbG9nIGl0c2VsZiDigJQgdGhlXG4gKiAgICBkaW1tZWQgcGFnZSBiZWhpbmQgaXMgbm90IGEgY29udHJvbCk7XG4gKiAgLSBvbiBjbG9zZSwgZm9jdXMgUkVUVVJOUyB0byB0aGUgdHJpZ2dlciBidXR0b24gKCNhMTF5LXRyaWdnZXIgaW5cbiAqICAgIHBhZ2Utc2hlbGwuaHRtbCksIHRoZSB3YXkgYSBuYXRpdmUgZGlhbG9nIGRvZXMuXG4gKlxuICogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSBvbiBwdXJwb3NlOiB0aGUgYmxhY2stYW5kLXllbGxvdyB0aGVtZSdzXG4gKiBQQUdFLVdJREUgcnVsZXMgKGl0cyBsaW5rIGNvbG91ciArIHRoZSBtYW5kYXRvcnkgbGluayB1bmRlcmxpbmUsIHRoZVxuICogaW52ZXJ0ZWQgcHJpbWFyeSBidXR0b24pIHNoaXAgaW4gdGhpcyBjb21wb25lbnQncyBzdHlsZXNoZWV0IOKAlCB0aGVcbiAqIHRoaXJkIHRoZW1lJ3MgdmFsdWVzIGxpdmUgaW4gdGhlbWUtdG9rZW5zLnRzICh0aGUgZGVzaWduLXRva2VucyBhdWRpdFxuICoga2VlcHMgaGV4IGxpdGVyYWxzIG91dCBvZiBTQ1NTKSwgYW5kIG9ubHkgdmFyKCkgcmVmZXJlbmNlcyByZWFjaCBoZXJlLlxuICogRXZlcnkgY2xhc3MgaXMgcHJlZml4ZWQgLmExMXktKiBzbyB0aGUgbm93LWdsb2JhbCBzdHlsZXNoZWV0IGNhbm5vdFxuICogY29sbGlkZSB3aXRoIGEgY29tcG9uZW50LXNjb3BlZCBydWxlLlxuICovXG5pbnRlcmZhY2UgQTExeU9wdGlvbiB7XG4gIHZhbHVlOiBBcHBUaGVtZTtcbiAgbGFiZWxLZXk6IE1lc3NhZ2VLZXk7XG4gIGRlc2NLZXk6IE1lc3NhZ2VLZXk7XG59XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FwcC1hY2Nlc3NpYmlsaXR5LWRpYWxvZycsXG4gIGltcG9ydHM6IFtUcmFuc2xhdGVQaXBlXSxcbiAgdGVtcGxhdGVVcmw6ICcuL2FjY2Vzc2liaWxpdHktZGlhbG9nLmNvbXBvbmVudC5odG1sJyxcbiAgc3R5bGVVcmw6ICcuL2FjY2Vzc2liaWxpdHktZGlhbG9nLmNvbXBvbmVudC5zY3NzJyxcbiAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIEFjY2Vzc2liaWxpdHlEaWFsb2cge1xuICAvKiogVGhlIG92ZXJsYXkgaXMgbW91bnRlZCB3aGlsZSBvcGVuICh0aGUgc2hlbGwgYWx3YXlzIHJlbmRlcnMgdGhlXG4gICAgICBob3N0OyB0aGUgb3ZlcmxheSBpdHNlbGYgaXMgdGhlIEBpZiBibG9jaykuICovXG4gIHJlYWRvbmx5IG9wZW4gPSBzaWduYWwoZmFsc2UpO1xuXG4gIHByb3RlY3RlZCByZWFkb25seSB0aGVtZVN0b3JlID0gaW5qZWN0KFRoZW1lU3RvcmUpO1xuXG4gIC8qKiBUaGUgdGhyZWUgb3B0aW9ucywgaW4gdGhlIGdvdmVybm1lbnQtcGFuZWwgb3JkZXIuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBvcHRpb25zOiByZWFkb25seSBBMTF5T3B0aW9uW10gPSBbXG4gICAgeyB2YWx1ZTogJ2RlZmF1bHQnLCBsYWJlbEtleTogJ2ExMXkub3B0aW9uLmRlZmF1bHQnLCBkZXNjS2V5OiAnYTExeS5vcHRpb24uZGVmYXVsdC5kZXNjJyB9LFxuICAgIHtcbiAgICAgIHZhbHVlOiAnaGlnaC1jb250cmFzdCcsXG4gICAgICBsYWJlbEtleTogJ2ExMXkub3B0aW9uLmhpZ2hDb250cmFzdCcsXG4gICAgICBkZXNjS2V5OiAnYTExeS5vcHRpb24uaGlnaENvbnRyYXN0LmRlc2MnLFxuICAgIH0sXG4gICAge1xuICAgICAgdmFsdWU6ICdibGFjay1hbmQteWVsbG93JyxcbiAgICAgIGxhYmVsS2V5OiAnYTExeS5vcHRpb24uYmxhY2tZZWxsb3cnLFxuICAgICAgZGVzY0tleTogJ2ExMXkub3B0aW9uLmJsYWNrWWVsbG93LmRlc2MnLFxuICAgIH0sXG4gIF07XG5cbiAgcHJpdmF0ZSByZWFkb25seSBkaWFsb2cgPSB2aWV3Q2hpbGQ8RWxlbWVudFJlZjxIVE1MRWxlbWVudD4+KCdkaWFsb2cnKTtcbiAgcHJpdmF0ZSByZWFkb25seSBpbmplY3RvciA9IGluamVjdChJbmplY3Rvcik7XG5cbiAgLyoqIFRoZSBhY3RpdmUgdGhlbWUgKHRoZSB0ZW1wbGF0ZSByZWFkcyB0aGUgc2lnbmFsIHRocm91Z2ggdGhpcywgc28gYVxuICAgICAgc3dpdGNoIHJlLXJlbmRlcnMgdGhlIHNlbGVjdGVkLXJvdyBzdGF0ZSkuICovXG4gIHByb3RlY3RlZCB0aGVtZSgpOiBBcHBUaGVtZSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbWVTdG9yZS50aGVtZSgpO1xuICB9XG5cbiAgLyoqIE9wZW4gZnJvbSB0aGUgaGVhZGVyIHRyaWdnZXI6IHRoZSBkaWFsb2cgcmVuZGVycywgdGhlbiBmb2N1cyBtb3Zlc1xuICAgICAgaW4gKHRoZSBjb250YWluZXIg4oCUIGFubm91bmNpbmcgdGhlIGRpYWxvZyBuYW1lICsgZGVzY3JpcHRpb24pLlxuICAgICAgYWZ0ZXJOZXh0UmVuZGVyIG5lZWRzIGFuIGluamVjdGlvbiBjb250ZXh0LCBhbmQgdGhpcyBtZXRob2QgcnVuc1xuICAgICAgZnJvbSBhbiBldmVudCBoYW5kbGVyIOKAlCBzbyBpdCBpcyB3cmFwcGVkIGluIHJ1bkluSW5qZWN0aW9uQ29udGV4dC4gKi9cbiAgb3BlbkRpYWxvZygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5vcGVuKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5vcGVuLnNldCh0cnVlKTtcbiAgICBydW5JbkluamVjdGlvbkNvbnRleHQodGhpcy5pbmplY3RvciwgKCkgPT4ge1xuICAgICAgYWZ0ZXJOZXh0UmVuZGVyKCgpID0+IHtcbiAgICAgICAgdGhpcy5kaWFsb2coKT8ubmF0aXZlRWxlbWVudC5mb2N1cygpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKiogQ2xvc2UgKEVzY2FwZSwgdGhlIENsb3NlIGJ1dHRvbiwgb3IgdGhlIGJhY2tkcm9wKTogZm9jdXMgUkVUVVJOUyB0b1xuICAgICAgdGhlIHRyaWdnZXIgYnV0dG9uLCB0aGUgd2F5IGEgbmF0aXZlIGRpYWxvZyBkb2VzLiAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMub3BlbigpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMub3Blbi5zZXQoZmFsc2UpO1xuICAgIGNvbnN0IHRyaWdnZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYTExeS10cmlnZ2VyJyk7XG4gICAgdHJpZ2dlcj8uZm9jdXMoKTtcbiAgfVxuXG4gIC8qKiBQaWNrIGEgY29udHJhc3Qgb3B0aW9uOiBhcHBsaWVkIEFORCBwZXJzaXN0ZWQgaW1tZWRpYXRlbHkgKHRoZVxuICAgICAgZGlhbG9nIHN0YXlzIG9wZW4gc28gdGhlIHJlYWRlciBjYW4gY29tcGFyZSB0aGUgdGhlbWVzKS4gKi9cbiAgc2VsZWN0KHRoZW1lOiBBcHBUaGVtZSk6IHZvaWQge1xuICAgIHRoaXMudGhlbWVTdG9yZS5zZXQodGhlbWUpO1xuICB9XG5cbiAgLyoqIEJhY2tkcm9wIGNsaWNrICh0aGUgZGltbWVkIHBhZ2UgaXMgbm90IGEgY29udHJvbCBvZiB0aGUgZGlhbG9nKS4gKi9cbiAgb25PdmVybGF5Q2xpY2soZXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoZXZlbnQudGFyZ2V0ID09PSBldmVudC5jdXJyZW50VGFyZ2V0KSB7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEVzY2FwZSBjbG9zZXMgKGFuZCBmb2N1cyByZXR1cm5zKTsgVGFiIC8gU2hpZnQrVGFiIHN0YXkgdHJhcHBlZFxuICAgICAgaW5zaWRlIHRoZSBkaWFsb2cgKHRoZSBjb25zZW50LWJhbm5lcidzIGZvY3VzIHRyYXAsIGV4dGVuZGVkKS4gKi9cbiAgcHJvdGVjdGVkIG9uS2V5ZG93bihldmVudDogS2V5Ym9hcmRFdmVudCk6IHZvaWQge1xuICAgIGlmIChldmVudC5rZXkgPT09ICdFc2NhcGUnKSB7XG4gICAgICAvLyBUaGUgc2hlbGwncyBob3N0IGxpc3RlbmVyIGFsc28gY2xvc2VzIHRoZSBtb2JpbGUgbWVudSBvbiBFc2NhcGUg4oCUXG4gICAgICAvLyBzdG9wIGl0IGhlcmUgc28gdGhlIGRpYWxvZyBvd25zIHRoZSBrZXkuXG4gICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGV2ZW50LmtleSAhPT0gJ1RhYicpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaG9zdCA9IHRoaXMuZGlhbG9nKCk/Lm5hdGl2ZUVsZW1lbnQ7XG4gICAgaWYgKCFob3N0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGZvY3VzYWJsZXMgPSBbXG4gICAgICAuLi5ob3N0LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCdidXR0b24sIGlucHV0LCBhW2hyZWZdLCBbdGFiaW5kZXhdOm5vdChbdGFiaW5kZXg9XCItMVwiXSknKSxcbiAgICBdLmZpbHRlcigoZWwpID0+ICFlbC5oYXNBdHRyaWJ1dGUoJ2Rpc2FibGVkJykpO1xuICAgIGlmIChmb2N1c2FibGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmaXJzdCA9IGZvY3VzYWJsZXNbMF07XG4gICAgY29uc3QgbGFzdCA9IGZvY3VzYWJsZXNbZm9jdXNhYmxlcy5sZW5ndGggLSAxXTtcbiAgICBjb25zdCBhY3RpdmUgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgaWYgKGFjdGl2ZSA9PT0gZmlyc3QgfHwgIWhvc3QuY29udGFpbnMoYWN0aXZlKSkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBsYXN0LmZvY3VzKCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhY3RpdmUgPT09IGxhc3QgfHwgIWhvc3QuY29udGFpbnMoYWN0aXZlKSkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGZpcnN0LmZvY3VzKCk7XG4gICAgfVxuICB9XG59XG4iLCJAaWYgKG9wZW4oKSkge1xuICA8IS0tIFRoZSBkaW1tZWQgcGFnZSBiZWhpbmQ6IGNsaWNraW5nIGl0IGNsb3NlcyAodGhlIGJhY2tkcm9wIGlzIE5PVCBhXG4gICAgICAgY29udHJvbCBvZiB0aGUgZGlhbG9nIGl0c2VsZiDigJQgdGhlIGRpYWxvZyBib3ggaWdub3JlcyB0aGUgY2xpY2spLiAtLT5cbiAgPGRpdiBjbGFzcz1cImExMXktb3ZlcmxheVwiIChjbGljayk9XCJvbk92ZXJsYXlDbGljaygkZXZlbnQpXCI+XG4gICAgPHNlY3Rpb25cbiAgICAgIGNsYXNzPVwiYTExeS1kaWFsb2dcIlxuICAgICAgcm9sZT1cImRpYWxvZ1wiXG4gICAgICBhcmlhLW1vZGFsPVwidHJ1ZVwiXG4gICAgICBhcmlhLWxhYmVsbGVkYnk9XCJhMTF5LWRpYWxvZy10aXRsZVwiXG4gICAgICBhcmlhLWRlc2NyaWJlZGJ5PVwiYTExeS1kaWFsb2ctYm9keVwiXG4gICAgICB0YWJpbmRleD1cIi0xXCJcbiAgICAgICNkaWFsb2dcbiAgICAgIChrZXlkb3duKT1cIm9uS2V5ZG93bigkZXZlbnQpXCJcbiAgICA+XG4gICAgICA8IS0tIFRoZSBwb3B1cCBoZWFkZXIgKGFkbWluLWVkaXRhYmxlOiBzaXRlX3RleHRzIGExMXkucG9wdXAudGl0bGUpLiAtLT5cbiAgICAgIDxoMiBjbGFzcz1cImExMXktZGlhbG9nX190aXRsZVwiIGlkPVwiYTExeS1kaWFsb2ctdGl0bGVcIj57eyAnYTExeS5wb3B1cC50aXRsZScgfCB0IH19PC9oMj5cbiAgICAgIDxwIGNsYXNzPVwiYTExeS1kaWFsb2dfX2JvZHlcIiBpZD1cImExMXktZGlhbG9nLWJvZHlcIj57eyAnYTExeS5wb3B1cC5ib2R5JyB8IHQgfX08L3A+XG5cbiAgICAgIDwhLS0gVGhlIHRocmVlIGNvbnRyYXN0IG9wdGlvbnM6IGEgcmVhbCByYWRpbyBncm91cCAoYXJyb3cga2V5c1xuICAgICAgICAgICBtb3ZlIGJldHdlZW4gb3B0aW9ucywgdGhlIHN0YXRlIGlzIGFubm91bmNlZCkuIFRoZSBzZWxlY3RlZFxuICAgICAgICAgICByb3cgaXMgZGlzdGluZ3Vpc2hlZCBieSBpdHMgQk9SREVSLCBub3QgYSB0aW50IOKAlCB0aGUgc2FtZSBydWxlXG4gICAgICAgICAgIHRoZSBibGFjay1hbmQteWVsbG93IHRoZW1lIGFwcGxpZXMgdG8gZXZlcnkgY2FyZC4gLS0+XG4gICAgICA8ZmllbGRzZXQgY2xhc3M9XCJhMTF5LWRpYWxvZ19fb3B0aW9uc1wiPlxuICAgICAgICA8bGVnZW5kIGNsYXNzPVwiYTExeS1kaWFsb2dfX2xlZ2VuZFwiPnt7ICdhMTF5LnBvcHVwLnRpdGxlJyB8IHQgfX08L2xlZ2VuZD5cbiAgICAgICAgQGZvciAob3B0aW9uIG9mIG9wdGlvbnM7IHRyYWNrIG9wdGlvbi52YWx1ZSkge1xuICAgICAgICAgIDxsYWJlbFxuICAgICAgICAgICAgY2xhc3M9XCJhMTF5LW9wdGlvblwiXG4gICAgICAgICAgICBbY2xhc3MuYTExeS1vcHRpb24tLXNlbGVjdGVkXT1cInRoZW1lKCkgPT09IG9wdGlvbi52YWx1ZVwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgIHR5cGU9XCJyYWRpb1wiXG4gICAgICAgICAgICAgIG5hbWU9XCJhMTF5LXRoZW1lXCJcbiAgICAgICAgICAgICAgW3ZhbHVlXT1cIm9wdGlvbi52YWx1ZVwiXG4gICAgICAgICAgICAgIFtjaGVja2VkXT1cInRoZW1lKCkgPT09IG9wdGlvbi52YWx1ZVwiXG4gICAgICAgICAgICAgIChjaGFuZ2UpPVwic2VsZWN0KG9wdGlvbi52YWx1ZSlcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYTExeS1vcHRpb25fX3RleHRcIj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJhMTF5LW9wdGlvbl9fbGFiZWxcIj57eyBvcHRpb24ubGFiZWxLZXkgfCB0IH19PC9zcGFuPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImExMXktb3B0aW9uX19kZXNjXCI+e3sgb3B0aW9uLmRlc2NLZXkgfCB0IH19PC9zcGFuPlxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgIH1cbiAgICAgIDwvZmllbGRzZXQ+XG5cbiAgICAgIDwhLS0gVGhlIHBvcHVwIGZvb3RlciAoYWRtaW4tZWRpdGFibGU6IGExMXkucG9wdXAuZm9vdGVyIC8gLmNsb3NlKS4gLS0+XG4gICAgICA8Zm9vdGVyIGNsYXNzPVwiYTExeS1kaWFsb2dfX2Zvb3RlclwiPlxuICAgICAgICA8cCBjbGFzcz1cImExMXktZGlhbG9nX19mb290ZXJub3RlXCI+e3sgJ2ExMXkucG9wdXAuZm9vdGVyJyB8IHQgfX08L3A+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi0tZ2hvc3QgYTExeS1kaWFsb2dfX2Nsb3NlXCIgKGNsaWNrKT1cImNsb3NlKClcIj5cbiAgICAgICAgICB7eyAnYTExeS5wb3B1cC5jbG9zZScgfCB0IH19XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9mb290ZXI+XG4gICAgPC9zZWN0aW9uPlxuICA8L2Rpdj5cbn1cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsU0FBUywwQkFBMEI7QUFDbkMsT0FBTyxjQUFjO0FBQ3JCLE9BQU8sY0FBYztBQUNyQixTQUFTLDRCQUE0Qjs7O0FDSHJDLFNBQTRCLDBDQUEwQztBQUN0RSxTQUFTLG1CQUFtQix3QkFBd0I7QUFDcEQsU0FBUyxxQkFBcUI7OztBQ0Y5QixTQUFTLGNBQWM7QUFDdkIsU0FBUyxhQUFhO0FBT2YsSUFBTSxXQUFXO0FBNkJqQixJQUFNLGFBQTRCLENBQUMsVUFBVTtBQUNsRCxRQUFNLFFBQVEsTUFBTSxLQUFLLE9BQU87QUFDaEMsTUFBSSxPQUFPLFVBQVUsWUFBWSxNQUFNLFNBQVMsR0FBRztBQUNqRCxVQUFNLE9BQU8sT0FBTyxXQUFXO0FBQy9CLFVBQU0sZUFBZSxPQUFPLEtBQUs7QUFDakMsVUFBTSxNQUFNO0FBQ1osVUFBTSxRQUFRLE1BQVk7QUFDeEIsbUJBQWEsU0FBUyxHQUFHLEtBQUssRUFBRSxHQUFHLENBQUMsV0FBTSxRQUFRLEVBQUU7QUFBQSxJQUN0RDtBQUNBLFVBQU07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QUFBLFNBQUEsRUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLEdBQUEsQ0FBQSxHQUFBLFVBQUEsR0FBQSxDQUFBLEdBQUEsa0JBQUEsR0FBQSxDQUFBLEdBQUEsWUFBQSxHQUFBLENBQUEsR0FBQSxlQUFBLEdBQUEsQ0FBQSxHQUFBLGtCQUFBLEdBQUEsQ0FBQSxHQUFBLGVBQUEsR0FBQSxDQUFBLEdBQUEsbUJBQUEsR0FBQSxDQUFBLFFBQUEsU0FBQSxHQUFBLFlBQUEsR0FBQSxDQUFBLEdBQUEsYUFBQSxHQUFBLENBQUEsZUFBQSxRQUFBLEdBQUEsa0JBQUEsNEJBQUEsZUFBQSxHQUFBLENBQUEsZUFBQSxRQUFBLEdBQUEsa0JBQUEsd0JBQUEsZUFBQSxHQUFBLENBQUEsZUFBQSxRQUFBLEdBQUEsa0JBQUEsMkJBQUEsZUFBQSxHQUFBLENBQUEsZUFBQSxRQUFBLEdBQUEsa0JBQUEsd0JBQUEsZUFBQSxHQUFBLENBQUEsZUFBQSxRQUFBLEdBQUEsa0JBQUEsNEJBQUEsZUFBQSxHQUFBLENBQUEsZUFBQSxRQUFBLEdBQUEsa0JBQUEsMEJBQUEsZUFBQSxHQUFBLENBQUEsR0FBQSxtQkFBQSxHQUFBLENBQUEsR0FBQSxtQkFBQSxHQUFBLENBQUEsUUFBQSxVQUFBLEdBQUEsT0FBQSxjQUFBLFdBQUEsR0FBQSxTQUFBLFVBQUEsR0FBQSxDQUFBLEdBQUEsb0JBQUEsR0FBQSxDQUFBLEdBQUEseUJBQUEsR0FBQSxDQUFBLE9BQUEsdUJBQUEsR0FBQSxzQkFBQSxHQUFBLENBQUEsR0FBQSxvQkFBQSxHQUFBLENBQUEsTUFBQSx1QkFBQSxRQUFBLFFBQUEsR0FBQSx3QkFBQSxHQUFBLFNBQUEsV0FBQSxlQUFBLFNBQUEsVUFBQSxHQUFBLENBQUEsUUFBQSxVQUFBLEdBQUEsT0FBQSx5QkFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBLENBQUEsR0FBQSw0QkFBQSxHQUFBLENBQUEsUUFBQSwyQ0FBQSxVQUFBLFVBQUEsT0FBQSxVQUFBLEdBQUEsQ0FBQSxHQUFBLHdCQUFBLEdBQUEsQ0FBQSxjQUFBLFdBQUEsR0FBQSxPQUFBLGNBQUEsWUFBQSxHQUFBLENBQUEsR0FBQSxjQUFBLEdBQUEsQ0FBQSxRQUFBLFNBQUEsR0FBQSxnQkFBQSxxQkFBQSxHQUFBLENBQUEsUUFBQSxVQUFBLEdBQUEsYUFBQSxHQUFBLENBQUEsUUFBQSxTQUFBLEdBQUEsY0FBQSxHQUFBLENBQUEsUUFBQSxVQUFBLEdBQUEsUUFBQSxHQUFBLGNBQUEsR0FBQSxDQUFBLFFBQUEsU0FBQSxHQUFBLGNBQUEsR0FBQSxDQUFBLFFBQUEsVUFBQSxHQUFBLFFBQUEsY0FBQSxHQUFBLE9BQUEsR0FBQSxDQUFBLFlBQUEsU0FBQSxHQUFBLFNBQUEsR0FBQSxDQUFBLEdBQUEsaUJBQUEsR0FBQSxTQUFBLEdBQUEsQ0FBQSxHQUFBLGlCQUFBLEdBQUEsUUFBQSxZQUFBLEdBQUEsQ0FBQSxHQUFBLGNBQUEsR0FBQSxDQUFBLG1CQUFBLGFBQUEsR0FBQSxlQUFBLEdBQUEsQ0FBQSxNQUFBLGFBQUEsR0FBQSxxQkFBQSxHQUFBLENBQUEsR0FBQSxvQkFBQSxHQUFBLENBQUEsR0FBQSx5QkFBQSxHQUFBLENBQUEsR0FBQSxzQkFBQSxHQUFBLENBQUEsUUFBQSxTQUFBLEdBQUEsc0JBQUEsR0FBQSxDQUFBLFFBQUEsVUFBQSxHQUFBLHlCQUFBLEdBQUEsT0FBQSxHQUFBLENBQUEsR0FBQSw0QkFBQSxHQUFBLENBQUEsR0FBQSw0QkFBQSxHQUFBLENBQUEsUUFBQSxVQUFBLEdBQUEsY0FBQSxHQUFBLENBQUEsR0FBQSx1QkFBQSxHQUFBLENBQUEsR0FBQSx3QkFBQSxHQUFBLENBQUEsR0FBQSxnQkFBQSx1QkFBQSxHQUFBLENBQUEsY0FBQSxTQUFBLEdBQUEsQ0FBQSxHQUFBLG9CQUFBLEdBQUEsQ0FBQSxRQUFBLFVBQUEsR0FBQSxzQkFBQSxHQUFBLE9BQUEsR0FBQSxDQUFBLFFBQUEsVUFBQSxHQUFBLFFBQUEsR0FBQSxPQUFBLEdBQUEsQ0FBQSxRQUFBLFVBQUEsR0FBQSxlQUFBLEdBQUEsT0FBQSxHQUFBLENBQUEsR0FBQSxtQkFBQSxHQUFBLENBQUEsR0FB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LFNBQUEsQ0FBQTtBQUFBLEdBQUE7OztBUFRoQixtQkFBbUIsUUFBUTtBQUMzQixtQkFBbUIsUUFBUTtBQUUzQixxQkFBcUIsS0FBSyxTQUFTLEVBQUUsTUFBTSxDQUFDLFFBQVEsUUFBUSxNQUFNLEdBQUcsQ0FBQzsiLCJuYW1lcyI6WyJpbmplY3QiLCJpbmplY3QiLCJpbmplY3QiLCJpbmplY3QiLCJDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSIsIkNvbXBvbmVudCIsImluamVjdCIsImFmdGVyTmV4dFJlbmRlciIsIkNoYW5nZURldGVjdGlvblN0cmF0ZWd5IiwiQ29tcG9uZW50IiwiaW5qZWN0Iiwidmlld0NoaWxkIiwiUm91dGVyTGluayIsInNpZ25hbCIsImluamVjdCIsInZpZXdDaGlsZCIsImFmdGVyTmV4dFJlbmRlciIsIlJvdXRlckxpbmsiLCJDb21wb25lbnQiLCJDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSIsImkwIiwiQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kiLCJDb21wb25lbnQiLCJFbGVtZW50UmVmIiwiaW5qZWN0Iiwic2lnbmFsIiwidmlld0NoaWxkIiwiUm91dGVyIiwiUm91dGVyTGluayIsImNvbXB1dGVkIiwiSW5qZWN0YWJsZSIsInNpZ25hbCIsInNpZ25hbCIsImNvbXB1dGVkIiwiSW5qZWN0YWJsZSIsImluamVjdCIsIkluamVjdGFibGUiLCJpbmplY3QiLCJJbmplY3RhYmxlIiwiYWZ0ZXJOZXh0UmVuZGVyIiwiQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kiLCJDb21wb25lbnQiLCJpbmplY3QiLCJzaWduYWwiLCJ2aWV3Q2hpbGQiLCJfZm9yVHJhY2swIiwic2lnbmFsIiwiaW5qZWN0Iiwidmlld0NoaWxkIiwiYWZ0ZXJOZXh0UmVuZGVyIiwiQ29tcG9uZW50IiwiQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kiLCJpMCIsImluamVjdCIsIlJvdXRlciIsIkVsZW1lbnRSZWYiLCJzaWduYWwiLCJ2aWV3Q2hpbGQiLCJSb3V0ZXJMaW5rIiwiQ29tcG9uZW50IiwiQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kiLCJpMCIsImluamVjdCIsIkNvbXBvbmVudCIsIkNoYW5nZURldGVjdGlvblN0cmF0ZWd5IiwiaTAiXSwiZGVidWdJZCI6IjY0M2E5NmU3LWRlYjItNTcwYS04ZTExLWMwMDI1YWY1ZjBlNSJ9