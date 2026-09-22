import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-VVBVPLVD.js");import {
  ConfirmAction
} from "/chunk-RVNDHAOY.js";
import {
  ShelterGateway
} from "/chunk-32CK32SO.js";
import {
  communityBadgeClass
} from "/chunk-CKLEX4Y2.js";
import {
  LoadingIndicator
} from "/chunk-Y3BTRGLF.js";
import {
  AccountGateway,
  AuthStore
} from "/chunk-QATQGZY5.js";
import {
  ResendCountdown
} from "/chunk-PVMWPZKN.js";
import {
  CODE_SIX_DIGITS,
  nameBlankValidator
} from "/chunk-SWSUI7DQ.js";
import "/chunk-T7PPW65J.js";
import {
  ApiError,
  BannerComponent,
  bannerMessage,
  toApiError
} from "/chunk-WYACYUPC.js";
import {
  I18nService,
  TranslatePipe
} from "/chunk-LJMNRHVK.js";
import {
  __spreadProps,
  __spreadValues
} from "/chunk-FDMHZOCR.js";

// src/app/features/account/account-page.ts
import { ChangeDetectionStrategy as ChangeDetectionStrategy2, ChangeDetectorRef as ChangeDetectorRef2, Component as Component2, ElementRef as ElementRef2, inject as inject2, signal as signal2 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { toObservable as toObservable2 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core_rxjs-interop.js?v=b78d4f20";
import { FormControl as FormControl2, ReactiveFormsModule as ReactiveFormsModule2, Validators as Validators2 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
import { Router, RouterLink as RouterLink2 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import { skip as skip2 } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";

// src/app/features/account/contributions-panel.ts
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, signal } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { toObservable } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core_rxjs-interop.js?v=b78d4f20";
import { DatePipe, NgClass } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common.js?v=b78d4f20";
import { FormControl, ReactiveFormsModule, Validators } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
import { ActivatedRoute, RouterLink, createUrlTreeFromSnapshot } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import { skip } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/rxjs.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i1 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
var _c0 = () => [];
var _c1 = (a0) => ["/shelters", a0];
var _c2 = (a0) => ({ note: a0 });
var _forTrack0 = ($index, $item) => $item.id;
function ContributionsPanel_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275element(0, "app-loading-indicator", 2);
    i0.\u0275\u0275pipe(1, "t");
  }
  if (rf & 2) {
    i0.\u0275\u0275property("message", i0.\u0275\u0275pipeBind1(1, 1, "account.contrib.loading"));
  }
}
function ContributionsPanel_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "p", 4);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(2, "div", 5)(3, "button", 6);
    i0.\u0275\u0275listener("click", function ContributionsPanel_Conditional_5_Template_button_click_3_listener() {
      i0.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.loadShelters());
    });
    i0.\u0275\u0275text(4);
    i0.\u0275\u0275pipe(5, "t");
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(ctx_r1.shelterLoadErrorMessage());
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(5, 2, "account.retry"), " ");
  }
}
function ContributionsPanel_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "div", 3)(1, "p", 7);
    i0.\u0275\u0275text(2);
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(4, "div", 5)(5, "a", 8);
    i0.\u0275\u0275text(6);
    i0.\u0275\u0275pipe(7, "t");
    i0.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 2, "account.contrib.empty"));
    i0.\u0275\u0275advance(4);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(7, 4, "account.contrib.emptyCta"));
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 14);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(2, 1, "account.contrib.infoRequest"), " ");
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 15);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(ctx);
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 16);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const row_r3 = i0.\u0275\u0275nextContext().$implicit;
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind2(2, 1, "account.contrib.adminNote", i0.\u0275\u0275pureFunction1(4, _c2, row_r3.reviewNote)), " ");
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 16);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, "account.contrib.inaccurate"));
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "button", 24);
    i0.\u0275\u0275listener("click", function ContributionsPanel_Conditional_7_For_6_Conditional_17_Template_button_click_0_listener() {
      i0.\u0275\u0275restoreView(_r4);
      const row_r3 = i0.\u0275\u0275nextContext().$implicit;
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.toggleInfo(row_r3));
    });
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const row_r3 = i0.\u0275\u0275nextContext().$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275property("disabled", ctx_r1.busy());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx_r1.infoFor() === row_r3.id ? i0.\u0275\u0275pipeBind1(2, 2, "account.contrib.infoClose") : i0.\u0275\u0275pipeBind1(3, 4, "account.contrib.info"), " ");
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "button", 25);
    i0.\u0275\u0275listener("click", function ContributionsPanel_Conditional_7_For_6_Conditional_21_Template_button_click_0_listener() {
      i0.\u0275\u0275restoreView(_r5);
      const row_r3 = i0.\u0275\u0275nextContext().$implicit;
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.requestDeleteShelter(row_r3.id));
    });
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const row_r3 = i0.\u0275\u0275nextContext().$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275property("disabled", ctx_r1.busy());
    i0.\u0275\u0275attribute("data-confirm-trigger", row_r3.id);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(2, 3, "account.contrib.delete"), " ");
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 22);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(3);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(ctx_r1.shelterRowErrorMessage());
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "div", 23)(1, "span", 26);
    i0.\u0275\u0275text(2);
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(4, "div", 5)(5, "button", 25);
    i0.\u0275\u0275listener("click", function ContributionsPanel_Conditional_7_For_6_Conditional_23_Template_button_click_5_listener() {
      i0.\u0275\u0275restoreView(_r6);
      const row_r3 = i0.\u0275\u0275nextContext().$implicit;
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.confirmDeleteShelter(row_r3.id));
    });
    i0.\u0275\u0275text(6);
    i0.\u0275\u0275pipe(7, "t");
    i0.\u0275\u0275pipe(8, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(9, "button", 24);
    i0.\u0275\u0275listener("click", function ContributionsPanel_Conditional_7_For_6_Conditional_23_Template_button_click_9_listener() {
      i0.\u0275\u0275restoreView(_r6);
      const ctx_r1 = i0.\u0275\u0275nextContext(3);
      return i0.\u0275\u0275resetView(ctx_r1.cancelDeleteShelter());
    });
    i0.\u0275\u0275text(10);
    i0.\u0275\u0275pipe(11, "t");
    i0.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const row_r3 = i0.\u0275\u0275nextContext().$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 6, "account.contrib.deleteConfirm"));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275property("disabled", ctx_r1.busy());
    i0.\u0275\u0275attribute("data-confirm-focus", row_r3.id);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx_r1.busy() ? i0.\u0275\u0275pipeBind1(7, 8, "account.deleting") : i0.\u0275\u0275pipeBind1(8, 10, "account.contrib.deleteConfirmButton"), " ");
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275property("disabled", ctx_r1.busy());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(11, 12, "account.cancel"), " ");
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_24_Conditional_0_Conditional_9_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 33);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, "account.contrib.replyRequired"));
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_24_Conditional_0_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "div", 30)(1, "label", 31);
    i0.\u0275\u0275text(2);
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275element(4, "textarea", 32);
    i0.\u0275\u0275controlCreate();
    i0.\u0275\u0275conditionalCreate(5, ContributionsPanel_Conditional_7_For_6_Conditional_24_Conditional_0_Conditional_9_Conditional_5_Template, 3, 3, "p", 33);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(6, "div", 5)(7, "button", 34);
    i0.\u0275\u0275listener("click", function ContributionsPanel_Conditional_7_For_6_Conditional_24_Conditional_0_Conditional_9_Template_button_click_7_listener() {
      i0.\u0275\u0275restoreView(_r7);
      const row_r3 = i0.\u0275\u0275nextContext(3).$implicit;
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.sendInfoReply(row_r3));
    });
    i0.\u0275\u0275text(8);
    i0.\u0275\u0275pipe(9, "t");
    i0.\u0275\u0275pipe(10, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(11, "button", 24);
    i0.\u0275\u0275listener("click", function ContributionsPanel_Conditional_7_For_6_Conditional_24_Conditional_0_Conditional_9_Template_button_click_11_listener() {
      i0.\u0275\u0275restoreView(_r7);
      const ctx_r1 = i0.\u0275\u0275nextContext(5);
      return i0.\u0275\u0275resetView(ctx_r1.closeInfo());
    });
    i0.\u0275\u0275text(12);
    i0.\u0275\u0275pipe(13, "t");
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(5);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 7, "account.contrib.replyLabel"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("formControl", ctx_r1.replyMessage);
    i0.\u0275\u0275control();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.replyMessage.touched && ctx_r1.replyMessage.invalid ? 5 : -1);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("disabled", ctx_r1.busy() || ctx_r1.replyMessage.invalid);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx_r1.busy() ? i0.\u0275\u0275pipeBind1(9, 9, "account.sending") : i0.\u0275\u0275pipeBind1(10, 11, "account.contrib.sendReply"), " ");
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275property("disabled", ctx_r1.busy());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(13, 13, "account.cancel"), " ");
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_24_Conditional_0_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 35)(1, "span", 29);
    i0.\u0275\u0275text(2);
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275text(4);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(5, "span", 17);
    i0.\u0275\u0275text(6);
    i0.\u0275\u0275pipe(7, "date");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const req_r8 = i0.\u0275\u0275nextContext();
    const ctx_r1 = i0.\u0275\u0275nextContext(4);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 3, "account.contrib.reply"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate1(" ", req_r8.replyMessage, " ");
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind4(7, 5, req_r8.repliedAt, "medium", void 0, ctx_r1.i18n.locale()));
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_24_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "div", 27)(1, "p", 28)(2, "span", 29);
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275pipe(4, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275text(5);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(6, "span", 17);
    i0.\u0275\u0275text(7);
    i0.\u0275\u0275pipe(8, "date");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(9, ContributionsPanel_Conditional_7_For_6_Conditional_24_Conditional_0_Conditional_9_Template, 14, 15)(10, ContributionsPanel_Conditional_7_For_6_Conditional_24_Conditional_0_Conditional_10_Template, 8, 10);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const req_r8 = ctx;
    const ctx_r1 = i0.\u0275\u0275nextContext(4);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(4, 4, "account.contrib.infoQuestion"));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate1(" ", req_r8.message, " ");
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind4(8, 6, req_r8.requestedAt, "medium", void 0, ctx_r1.i18n.locale()));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional(req_r8.replyMessage === null ? 9 : 10);
  }
}
function ContributionsPanel_Conditional_7_For_6_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275conditionalCreate(0, ContributionsPanel_Conditional_7_For_6_Conditional_24_Conditional_0_Template, 11, 11, "div", 27);
  }
  if (rf & 2) {
    let tmp_12_0;
    const row_r3 = i0.\u0275\u0275nextContext().$implicit;
    i0.\u0275\u0275conditional((tmp_12_0 = row_r3.infoRequest) ? 0 : -1, tmp_12_0);
  }
}
function ContributionsPanel_Conditional_7_For_6_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "li", 10)(1, "div", 11)(2, "span", 12);
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275elementStart(4, "span", 13);
    i0.\u0275\u0275text(5);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(6, ContributionsPanel_Conditional_7_For_6_Conditional_6_Template, 3, 3, "span", 14);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(7, ContributionsPanel_Conditional_7_For_6_Conditional_7_Template, 2, 1, "span", 15);
    i0.\u0275\u0275conditionalCreate(8, ContributionsPanel_Conditional_7_For_6_Conditional_8_Template, 3, 6, "span", 16);
    i0.\u0275\u0275conditionalCreate(9, ContributionsPanel_Conditional_7_For_6_Conditional_9_Template, 3, 3, "span", 16);
    i0.\u0275\u0275elementStart(10, "span", 17);
    i0.\u0275\u0275text(11);
    i0.\u0275\u0275pipe(12, "date");
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275elementStart(13, "div", 18)(14, "a", 19);
    i0.\u0275\u0275text(15);
    i0.\u0275\u0275pipe(16, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(17, ContributionsPanel_Conditional_7_For_6_Conditional_17_Template, 4, 6, "button", 20);
    i0.\u0275\u0275elementStart(18, "a", 19);
    i0.\u0275\u0275text(19);
    i0.\u0275\u0275pipe(20, "t");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(21, ContributionsPanel_Conditional_7_For_6_Conditional_21_Template, 3, 5, "button", 21);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(22, ContributionsPanel_Conditional_7_For_6_Conditional_22_Template, 2, 1, "p", 22);
    i0.\u0275\u0275conditionalCreate(23, ContributionsPanel_Conditional_7_For_6_Conditional_23_Template, 12, 14, "div", 23);
    i0.\u0275\u0275conditionalCreate(24, ContributionsPanel_Conditional_7_For_6_Conditional_24_Template, 1, 1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_15_0;
    const row_r3 = ctx.$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate1(" ", row_r3.name, " ");
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("ngClass", ctx_r1.communityBadgeClass(row_r3));
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", ctx_r1.trustBadgeLabel(row_r3), " ");
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(row_r3.infoRequest && row_r3.infoRequest.replyMessage === null ? 6 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional((tmp_15_0 = ctx_r1.hiddenText(row_r3)) ? 7 : -1, tmp_15_0);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(row_r3.reviewNote ? 8 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(row_r3.inaccurate ? 9 : -1);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind4(12, 17, row_r3.createdAt, "medium", void 0, ctx_r1.i18n.locale()));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275property("routerLink", i0.\u0275\u0275pureFunction1(26, _c1, row_r3.id));
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(16, 22, "account.contrib.view"), " ");
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional(row_r3.infoRequest ? 17 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("routerLink", ctx_r1.editLink(row_r3.id));
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(20, 24, "account.edit"), " ");
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional(!ctx_r1.shelterDeleteConfirm.isArmed(row_r3.id) ? 21 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.shelterRowError()?.id === row_r3.id ? 22 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.shelterDeleteConfirm.isArmed(row_r3.id) ? 23 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.infoFor() === row_r3.id ? 24 : -1);
  }
}
function ContributionsPanel_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "div", 5)(1, "a", 8);
    i0.\u0275\u0275text(2);
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275elementStart(4, "ul", 9);
    i0.\u0275\u0275repeaterCreate(5, ContributionsPanel_Conditional_7_For_6_Template, 25, 28, "li", 10, _forTrack0);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 1, "account.contrib.submit"));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275repeater(ctx_r1.shelterRows() ?? i0.\u0275\u0275pureFunction0(3, _c0));
  }
}
var ContributionsPanel = class _ContributionsPanel {
  shelters = inject(ShelterGateway);
  host = inject(ElementRef);
  /** i18n-et-en: the panel copy is fully catalog-driven; a switcher change
   *  re-renders the panel (labels + the re-derived error banners). The /mine
   *  data is NOT locale-scoped — no re-fetch. */
  i18n = inject(I18nService);
  /** The active route: the edit entry builds its /submit?edit=<id> UrlTree
   *  against this route's snapshot (M5). */
  route = inject(ActivatedRoute);
  cdr = inject(ChangeDetectorRef);
  /** The language switcher sets I18nService.locale: re-derive the stored
   *  error banners (raw errors) and re-render every | t label. skip(1) —
   *  only a real switch triggers it (the guidance-page idiom). */
  localeSub = toObservable(this.i18n.locale).pipe(skip(1)).subscribe(() => this.cdr.markForCheck());
  // ---- shelters list -------------------------------------------------------
  /** null = loading; [] = loaded and empty. The /mine projection carries the
   *  review state (community-review-queue) — badges + the admin note. */
  shelterRows = signal(
    null,
    ...ngDevMode ? [{ debugName: "shelterRows" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Load failure: the RAW error (non-null -> error state with Retry) —
   *  the banner text is re-derived through the active locale. */
  shelterLoadError = signal(
    null,
    ...ngDevMode ? [{ debugName: "shelterLoadError" }] : (
      /* istanbul ignore next */
      []
    )
  );
  // ---- two-step delete state -----------------------------------------------
  /** The two-step delete confirm: the armed shelter id (no window.confirm).
   *  The shared ConfirmAction owns the state machine, the focus move onto
   *  Confirm and the focus restore to Delete on cancel. */
  shelterDeleteConfirm = new ConfirmAction(this.host.nativeElement);
  // ---- info request -----------------------------------------------------------
  /** The row whose inline info-request panel is open (null = closed) —
   *  one inline panel at a time, like the edit forms. */
  infoFor = signal(
    null,
    ...ngDevMode ? [{ debugName: "infoFor" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The reply editor: required (non-blank — the shared blank validator),
   *  at most 2000 characters (the V19 bound). */
  replyMessage = new FormControl("", {
    nonNullable: true,
    validators: [Validators.required, nameBlankValidator, Validators.maxLength(2e3)]
  });
  // ---- row-level mutation errors (backend rejected an edit/delete) ---------
  /** The RAW error per row — the banner text is re-derived through the
   *  active locale at render time (shelterRowErrorMessage). */
  shelterRowError = signal(
    null,
    ...ngDevMode ? [{ debugName: "shelterRowError" }] : (
      /* istanbul ignore next */
      []
    )
  );
  busy = signal(
    false,
    ...ngDevMode ? [{ debugName: "busy" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Panel-local badge label (i18n-et-en): registry rows carry their
   *  registry label, USER rows the trust-state label. The shared
   *  shelter-copy labels are not catalog keys (map/detail/admin still use
   *  them), so this panel renders its own translated set. */
  trustBadgeLabel(row) {
    if (row.source === "PAASETEAMET") {
      return this.i18n.t("account.contrib.source.paasteamet");
    }
    if (row.source === "MUNICIPALITY") {
      return this.i18n.t("account.contrib.source.municipality");
    }
    switch (row.reviewStatus) {
      case "NEW":
        return this.i18n.t("account.contrib.badge.new");
      case "CONFIRMED":
        return this.i18n.t("account.contrib.badge.confirmed");
      case "REJECTED":
        return this.i18n.t("account.contrib.badge.rejected");
    }
  }
  /** The trust badge tone: NEW amber, REJECTED danger, CONFIRMED green. */
  communityBadgeClass = communityBadgeClass;
  /** The localized report-count phrase for the hidden-row mark
   *  ("1 report" / "5 reports"; EN/ET/RU plural rules). */
  reportCountPhrase(n) {
    switch (this.i18n.locale()) {
      case "et":
        return n === 1 ? "1 teatamine" : `${n} teatamist`;
      case "ru": {
        const tens = n % 100;
        const ones = n % 10;
        const word = tens >= 11 && tens <= 14 ? "\u043E\u0442\u0447\u0451\u0442\u043E\u0432" : ones === 1 ? "\u043E\u0442\u0447\u0451\u0442" : ones >= 2 && ones <= 4 ? "\u043E\u0442\u0447\u0451\u0442\u0430" : "\u043E\u0442\u0447\u0451\u0442\u043E\u0432";
        return `${n} ${word}`;
      }
      default:
        return `${n} report${n === 1 ? "" : "s"}`;
    }
  }
  /**
   * Auto-hidden row copy (user-contributions, shelter-trust-and-reports):
   * the owner's list includes INACTIVE (auto-hidden) rows, marked with the
   * community non-existence report count. Restore is admin-only — the user
   * UI offers no restore action, so the mark is the row's only new element.
   * Suppressed for REJECTED rows (community-review-queue): a rejection
   * also flips the status to INACTIVE, but the "Rejected" badge + the
   * admin's reason explain the state — the auto-hide mark would be noise.
   */
  hiddenText(row) {
    if (row.status !== "INACTIVE" || row.reviewStatus === "REJECTED") {
      return null;
    }
    return this.i18n.t("account.contrib.hidden", {
      count: this.reportCountPhrase(row.nonexistentReports)
    });
  }
  // ---- shelter edit: the shared /submit form (M5) ---------------------------
  // The inline edit form is gone (M5): Edit is a routerLink to
  // /submit?edit=<id> — the full creation form in edit mode (same fields,
  // same location capture modes), prefilled with the row's values. The
  // account area is no longer where shelter edits happen.
  /**
   * The Edit entry (M5): the shared /submit form in edit mode, one UrlTree
   * per row. The UrlTree form is required here: this Angular version's
   * routerLink input is `string | string[] | UrlTree`, and NEITHER plain
   * form can carry query params — the array form misreads an options object
   * as a route segment, the string form URL-encodes the '?'. row.id is a
   * numeric primary key, so String() is lossless.
   */
  editLink(id) {
    return createUrlTreeFromSnapshot(this.route.snapshot, ["/submit"], { edit: String(id) });
  }
  ngOnInit() {
    this.loadShelters();
  }
  ngOnDestroy() {
    this.localeSub.unsubscribe();
  }
  // -------------------------------------------------------------------------
  // Loading (per list, independent)
  // -------------------------------------------------------------------------
  loadShelters() {
    this.shelterRows.set(null);
    this.shelterLoadError.set(null);
    this.shelters.mine().then((rows) => this.shelterRows.set(rows)).catch((error) => this.shelterLoadError.set(error));
  }
  /** The list-load error banner, re-derived through the active locale. */
  shelterLoadErrorMessage() {
    const error = this.shelterLoadError();
    return error === null ? null : bannerMessage(error, "shelter", (key) => this.i18n.t(key));
  }
  /** The row-level error banner text, re-derived through the active locale. */
  shelterRowErrorMessage() {
    const state = this.shelterRowError();
    return state === null ? null : bannerMessage(state.error, "shelter", (key) => this.i18n.t(key));
  }
  // -------------------------------------------------------------------------
  // Shelter rows: view (routerLink in the template), edit (routerLink to
  // the shared /submit?edit=<id> form, M5), delete
  // -------------------------------------------------------------------------
  /** Step 1 of the two-step delete: arm the confirm strip. */
  requestDeleteShelter(id) {
    this.shelterDeleteConfirm.arm(id);
  }
  cancelDeleteShelter() {
    this.shelterDeleteConfirm.cancel();
  }
  /** Step 2: DELETE /api/shelters/{id}; the row is removed from the list in
   *  place. */
  async confirmDeleteShelter(id) {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.shelters.remove(id);
      this.shelterRows.update((rows) => (rows ?? []).filter((r) => r.id !== id));
      this.shelterRowError.update((e) => e && e.id === id ? null : e);
    } catch (error) {
      this.shelterRowError.set({ id, error });
    } finally {
      if (this.infoFor() === id) {
        this.closeInfo();
      }
      this.shelterDeleteConfirm.disarm();
      this.busy.set(false);
    }
  }
  // -------------------------------------------------------------------------
  // Info request: the moderator's question + the one-time reply
  // -------------------------------------------------------------------------
  /**
   * Toggle the inline info-request panel for a row that carries a request.
   * An OPEN request shows the question + the reply form (the answer is
   * one-time); an ANSWERED request shows the question + your reply
   * read-only (the row is kept after the reply — audit posture, and a
   * second reply is a server-side 409).
   */
  toggleInfo(row) {
    if (this.infoFor() === row.id) {
      this.closeInfo();
      return;
    }
    this.replyMessage.reset("");
    this.replyMessage.markAsUntouched();
    this.infoFor.set(row.id);
  }
  /** Close the open info panel (toggle, edit form, delete, tab leave). */
  closeInfo() {
    this.infoFor.set(null);
  }
  /**
   * POST /api/shelters/{id}/info-request/reply (204, the one-time answer).
   * Success patches the row in place — the 204 body is empty, so the reply
   * text is the form value and the timestamp local "now" (the review edit's
   * local updatedAt bump precedent); a 409 (answered meanwhile) or 400/403
   * shows the row error and the row stays as it was.
   */
  async sendInfoReply(row) {
    const request = row.infoRequest;
    if (request === null || request.replyMessage !== null) {
      return;
    }
    const message = this.replyMessage.value.trim();
    if (message === "" || message.length > 2e3) {
      this.replyMessage.markAsTouched();
      return;
    }
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.shelters.replyInfoRequest(row.id, message);
      this.shelterRows.update((rows) => (rows ?? []).map((r) => r.id === row.id && r.infoRequest !== null ? __spreadProps(__spreadValues({}, r), {
        infoRequest: __spreadProps(__spreadValues({}, r.infoRequest), {
          replyMessage: message,
          repliedAt: (/* @__PURE__ */ new Date()).toISOString()
        })
      }) : r));
      this.shelterRowError.update((e) => e && e.id === row.id ? null : e);
      this.closeInfo();
    } catch (error) {
      this.shelterRowError.set({ id: row.id, error });
    } finally {
      this.busy.set(false);
    }
  }
  static \u0275fac = function ContributionsPanel_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ContributionsPanel)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _ContributionsPanel, selectors: [["app-contributions-panel"]], decls: 8, vars: 5, consts: [[1, "contributions"], [1, "contributions-subtitle"], [1, "contributions-state", 3, "message"], [1, "contributions-empty"], [1, "contributions-state", "contributions-state--error"], [1, "contrib-actions"], ["type", "button", 1, "btn", "btn--ghost", 3, "click"], [1, "contributions-state"], ["routerLink", "/submit", 1, "btn", "btn--ghost"], [1, "contrib-list"], [1, "contrib-row"], [1, "contrib-row__info"], [1, "contrib-row__title"], [1, "contrib-badge", 3, "ngClass"], [1, "contrib-badge", "contrib-badge--info"], [1, "contrib-row__hidden"], [1, "contrib-row__note"], [1, "contrib-row__meta"], [1, "contrib-row__actions"], [1, "btn", "btn--ghost", 3, "routerLink"], ["type", "button", 1, "btn", "btn--ghost", 3, "disabled"], ["type", "button", 1, "btn", "btn--ghost", "btn--danger", 3, "disabled"], ["role", "alert", 1, "row-error"], [1, "confirm-strip"], ["type", "button", 1, "btn", "btn--ghost", 3, "click", "disabled"], ["type", "button", 1, "btn", "btn--ghost", "btn--danger", 3, "click", "disabled"], ["role", "status"], [1, "contrib-info"], [1, "contrib-info__q"], [1, "contrib-info__label"], [1, "field"], ["for", "contrib-info-reply"], ["id", "contrib-info-reply", "maxlength", "2000", 3, "formControl"], [1, "field-error"], ["type", "button", 1, "btn", "btn--primary", 3, "click", "disabled"], [1, "contrib-info__a"]], template: function ContributionsPanel_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275elementStart(0, "div", 0)(1, "h3", 1);
      i0.\u0275\u0275text(2);
      i0.\u0275\u0275pipe(3, "t");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275conditionalCreate(4, ContributionsPanel_Conditional_4_Template, 2, 3, "app-loading-indicator", 2)(5, ContributionsPanel_Conditional_5_Template, 6, 4)(6, ContributionsPanel_Conditional_6_Template, 8, 6, "div", 3)(7, ContributionsPanel_Conditional_7_Template, 7, 4);
      i0.\u0275\u0275elementEnd();
    }
    if (rf & 2) {
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(3, 2, "account.contrib.shelters"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275conditional(ctx.shelterRows() === null && ctx.shelterLoadError() === null ? 4 : ctx.shelterLoadError() !== null ? 5 : (ctx.shelterRows() ?? i0.\u0275\u0275pureFunction0(4, _c0)).length === 0 ? 6 : 7);
    }
  }, dependencies: [ReactiveFormsModule, i1.\u0275NgNoValidate, i1.NgSelectOption, i1.\u0275NgSelectMultipleOption, i1.DefaultValueAccessor, i1.NumberValueAccessor, i1.RangeValueAccessor, i1.CheckboxControlValueAccessor, i1.SelectControlValueAccessor, i1.SelectMultipleControlValueAccessor, i1.RadioControlValueAccessor, i1.NgControlStatus, i1.NgControlStatusGroup, i1.RequiredValidator, i1.MinLengthValidator, i1.MaxLengthValidator, i1.PatternValidator, i1.CheckboxRequiredValidator, i1.EmailValidator, i1.MinValidator, i1.MaxValidator, i1.FormControlDirective, i1.FormGroupDirective, i1.FormArrayDirective, i1.FormControlName, i1.FormGroupName, i1.FormArrayName, RouterLink, NgClass, LoadingIndicator, DatePipe, TranslatePipe], styles: ['@charset "UTF-8";\n\n\n.contributions[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-12);\n}\n.contributions-subtitle[_ngcontent-%COMP%] {\n  font-size: var(--%NS%text-lg);\n  font-weight: var(--%NS%font-weight-semibold);\n  margin: 0 0 var(--%NS%space-4);\n}\n.contributions-state[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  margin: 0 0 var(--%NS%space-8);\n  font-size: var(--%NS%text-md);\n}\n.contributions-state--error[_ngcontent-%COMP%] {\n  color: var(--%NS%color-danger);\n}\n.contributions-empty[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-12);\n  padding-block: var(--%NS%space-12) var(--%NS%space-16);\n}\n.contrib-list[_ngcontent-%COMP%] {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n.contrib-row[_ngcontent-%COMP%] {\n  padding: var(--%NS%space-12) 0;\n  border-bottom: 1px solid var(--%NS%color-border-subtle);\n}\n.contrib-row[_ngcontent-%COMP%]:last-child {\n  border-bottom: none;\n}\n.contrib-row__info[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-4);\n}\n.contrib-row__title[_ngcontent-%COMP%] {\n  font-size: var(--%NS%text-base);\n  font-weight: var(--%NS%font-weight-semibold);\n  overflow-wrap: anywhere;\n  display: inline-flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: var(--%NS%space-6);\n}\n.contrib-row__title--link[_ngcontent-%COMP%] {\n  color: var(--%NS%color-primary);\n  text-decoration: none;\n}\n.contrib-row__title--%NS%link[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.contrib-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  font-size: var(--%NS%text-2xs);\n  font-weight: var(--%NS%font-weight-semibold);\n  padding: var(--%NS%space-2) var(--%NS%space-4);\n  border-radius: var(--%NS%radius-full);\n  background: var(--%NS%color-badge-user);\n  color: var(--%NS%color-shelter-user);\n}\n.contrib-badge.badge--new[_ngcontent-%COMP%] {\n  background: var(--%NS%color-badge-new);\n  color: var(--%NS%color-warning);\n}\n.contrib-badge.badge--rejected[_ngcontent-%COMP%] {\n  background: var(--%NS%color-danger-bg);\n  border: 1px solid var(--%NS%color-danger-border);\n  color: var(--%NS%color-danger);\n}\n.contrib-badge[_ngcontent-%COMP%] {\n}\n.contrib-badge.contrib-badge--info[_ngcontent-%COMP%] {\n  background: var(--%NS%color-badge-new);\n  color: var(--%NS%color-warning);\n}\n.contrib-row__note[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n  overflow-wrap: anywhere;\n}\n.contrib-row__meta[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n  display: inline-flex;\n  align-items: center;\n  gap: var(--%NS%space-6);\n  flex-wrap: wrap;\n}\n.contrib-row__hidden[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n.contrib-row__actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-8);\n  margin-top: var(--%NS%space-8);\n  flex-wrap: wrap;\n}\n.contrib-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-8);\n  margin-top: var(--%NS%space-8);\n  flex-wrap: wrap;\n}\n.row-error[_ngcontent-%COMP%] {\n  color: var(--%NS%color-danger);\n  font-size: var(--%NS%text-sm);\n  margin: var(--%NS%space-8) 0 0;\n}\n.confirm-strip[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--%NS%space-12);\n  flex-wrap: wrap;\n  margin-top: var(--%NS%space-8);\n  padding: var(--%NS%space-8) var(--%NS%space-12);\n  background: var(--%NS%color-danger-bg);\n  border: 1px solid var(--%NS%color-danger-border);\n  border-radius: var(--%NS%radius-md);\n  color: var(--%NS%color-danger);\n  font-size: var(--%NS%text-sm);\n}\n.confirm-strip[_ngcontent-%COMP%]   .contrib-actions[_ngcontent-%COMP%] {\n  margin-top: 0;\n}\n.contrib-info[_ngcontent-%COMP%] {\n  margin-top: var(--%NS%space-12);\n  padding: var(--%NS%space-12);\n  background: var(--%NS%color-bg-subtle);\n  border-radius: var(--%NS%radius-md);\n}\n.contrib-info[_ngcontent-%COMP%]   .contrib-info__label[_ngcontent-%COMP%] {\n  font-weight: var(--%NS%font-weight-semibold);\n  color: var(--%NS%color-muted);\n  margin-right: var(--%NS%space-6);\n}\n.contrib-info[_ngcontent-%COMP%]   .contrib-info__q[_ngcontent-%COMP%], \n.contrib-info[_ngcontent-%COMP%]   .contrib-info__a[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-6);\n  font-size: var(--%NS%text-md);\n  overflow-wrap: anywhere;\n}\n.contrib-info[_ngcontent-%COMP%]   .field[_ngcontent-%COMP%] {\n  margin-top: var(--%NS%space-8);\n}\n.field-label[_ngcontent-%COMP%] {\n  display: block;\n  font-size: var(--%NS%text-md);\n  font-weight: var(--%NS%font-weight-medium);\n  margin-bottom: var(--%NS%space-4);\n}\n/*# sourceMappingURL=contributions-panel.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(ContributionsPanel, [{
    type: Component,
    args: [{ selector: "app-contributions-panel", imports: [ReactiveFormsModule, RouterLink, DatePipe, NgClass, LoadingIndicator, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="contributions">
  <!-- ============================== Shelters ============================== -->
  <h3 class="contributions-subtitle">{{ 'account.contrib.shelters' | t }}</h3>

  @if (shelterRows() === null && shelterLoadError() === null) {
    <app-loading-indicator class="contributions-state" [message]="'account.contrib.loading' | t" />
  } @else if (shelterLoadError() !== null) {
    <p class="contributions-state contributions-state--error">{{ shelterLoadErrorMessage() }}</p>
    <div class="contrib-actions">
      <button type="button" class="btn btn--ghost" (click)="loadShelters()">
        {{ 'account.retry' | t }}
      </button>
    </div>
  } @else if ((shelterRows() ?? []).length === 0) {
    <!-- Self-contained symmetric empty state: the wrapper carries the
         vertical rhythm (equal whitespace above the line and below the
         button), so the panel's flex gap applies once, to the block. -->
    <div class="contributions-empty">
      <p class="contributions-state">{{ 'account.contrib.empty' | t }}</p>
      <div class="contrib-actions">
        <a routerLink="/submit" class="btn btn--ghost">{{ 'account.contrib.emptyCta' | t }}</a>
      </div>
    </div>
  } @else {
    <!-- map-crisis-actions: the submission entry renders for EVERY
         authenticated user, not only the empty state (the panel is already
         auth-gated by the /account route \u2014 the guards stay the single
         enforcement point). -->
    <div class="contrib-actions">
      <a routerLink="/submit" class="btn btn--ghost">{{ 'account.contrib.submit' | t }}</a>
    </div>
    <ul class="contrib-list">
      @for (row of shelterRows() ?? []; track row.id) {
        <li class="contrib-row">
          <div class="contrib-row__info">
            <span class="contrib-row__title">
              {{ row.name }}
              <!-- Trust state (community-review-queue D5): the /mine badge
                   (panel-local translated set \u2014 trustBadgeLabel). -->
              <span class="contrib-badge" [ngClass]="communityBadgeClass(row)">
                {{ trustBadgeLabel(row) }}
              </span>
              <!-- Info request: an OPEN moderator question \u2014
                   the amber action chip; answered requests carry no chip
                   (the exchange stays viewable via the Info button). -->
              @if (row.infoRequest && row.infoRequest.replyMessage === null) {
                <span class="contrib-badge contrib-badge--info">
                  {{ 'account.contrib.infoRequest' | t }}
                </span>
              }
            </span>
            <!-- Auto-hidden by five non-existence reports (user-
                 contributions): the owner's list keeps hidden rows, marked
                 with the community report count. Suppressed for REJECTED
                 rows (the badge + the admin note carry that state). There
                 is deliberately NO restore action \u2014 only an admin can
                 restore. -->
            @if (hiddenText(row); as hidden) {
              <span class="contrib-row__hidden">{{ hidden }}</span>
            }
            <!-- The admin's review note (community-review-queue): set by a
                 moderator when rejecting (or on a status change). -->
            @if (row.reviewNote) {
              <span class="contrib-row__note">
                {{ 'account.contrib.adminNote' | t: { note: row.reviewNote } }}
              </span>
            }
            <!-- Marked inaccurate: the single-sourced warning
                 line \u2014 the row stays visible, the flag is the treatment. -->
            @if (row.inaccurate) {
              <span class="contrib-row__note">{{ 'account.contrib.inaccurate' | t }}</span>
            }
            <span class="contrib-row__meta">{{ row.createdAt | date: 'medium': undefined: i18n.locale() }}</span>
          </div>
          <div class="contrib-row__actions">
            <a [routerLink]="['/shelters', row.id]" class="btn btn--ghost">
              {{ 'account.contrib.view' | t }}
            </a>
            @if (row.infoRequest) {
              <button
                type="button"
                class="btn btn--ghost"
                (click)="toggleInfo(row)"
                [disabled]="busy()"
              >
                {{ infoFor() === row.id ? ('account.contrib.infoClose' | t) : ('account.contrib.info' | t) }}
              </button>
            }
            <!-- M5: Edit opens the SHARED /submit form in edit mode \u2014 the
                 full creation form (same fields, same location capture
                 modes) prefilled with this row's values. The account area
                 no longer hosts a reduced inline edit form. String form
                 (not the array form): row.id is a numeric primary key, so
                 no encoding concerns. -->
            <a [routerLink]="editLink(row.id)" class="btn btn--ghost">
              {{ 'account.edit' | t }}
            </a>
            @if (!shelterDeleteConfirm.isArmed(row.id)) {
              <button
                type="button"
                class="btn btn--ghost btn--danger"
                [attr.data-confirm-trigger]="row.id"
                (click)="requestDeleteShelter(row.id)"
                [disabled]="busy()"
              >
                {{ 'account.contrib.delete' | t }}
              </button>
            }
          </div>

          @if (shelterRowError()?.id === row.id) {
            <p class="row-error" role="alert">{{ shelterRowErrorMessage() }}</p>
          }

          <!-- two-step delete confirm (no window.confirm). The shared
               ConfirmAction owns the state machine, the focus move onto Confirm
               and the focus restore to Delete on cancel; the prompt
               is a live region so arming is announced. -->
          @if (shelterDeleteConfirm.isArmed(row.id)) {
            <div class="confirm-strip">
              <span role="status">{{ 'account.contrib.deleteConfirm' | t }}</span>
              <div class="contrib-actions">
                <button
                  type="button"
                  class="btn btn--ghost btn--danger"
                  [attr.data-confirm-focus]="row.id"
                  (click)="confirmDeleteShelter(row.id)"
                  [disabled]="busy()"
                >
                  {{ busy() ? ('account.deleting' | t) : ('account.contrib.deleteConfirmButton' | t) }}
                </button>
                <button
                  type="button"
                  class="btn btn--ghost"
                  (click)="cancelDeleteShelter()"
                  [disabled]="busy()"
                >
                  {{ 'account.cancel' | t }}
                </button>
              </div>
            </div>
          }

          <!-- Info request: the moderator's question + the
               one-time reply (open) or the stored reply (answered \u2014 the row
               is kept after the reply, audit posture). -->
          @if (infoFor() === row.id) {
            @if (row.infoRequest; as req) {
              <div class="contrib-info">
                <p class="contrib-info__q">
                  <span class="contrib-info__label">{{ 'account.contrib.infoQuestion' | t }}</span>
                  {{ req.message }}
                </p>
                <span class="contrib-row__meta">{{ req.requestedAt | date: 'medium': undefined: i18n.locale() }}</span>
                @if (req.replyMessage === null) {
                  <div class="field">
                    <label for="contrib-info-reply">{{ 'account.contrib.replyLabel' | t }}</label>
                    <textarea
                      id="contrib-info-reply"
                      maxlength="2000"
                      [formControl]="replyMessage"
                    ></textarea>
                    @if (replyMessage.touched && replyMessage.invalid) {
                      <p class="field-error">{{ 'account.contrib.replyRequired' | t }}</p>
                    }
                  </div>
                  <div class="contrib-actions">
                    <button
                      type="button"
                      class="btn btn--primary"
                      (click)="sendInfoReply(row)"
                      [disabled]="busy() || replyMessage.invalid"
                    >
                      {{ busy() ? ('account.sending' | t) : ('account.contrib.sendReply' | t) }}
                    </button>
                    <button
                      type="button"
                      class="btn btn--ghost"
                      (click)="closeInfo()"
                      [disabled]="busy()"
                    >
                      {{ 'account.cancel' | t }}
                    </button>
                  </div>
                } @else {
                  <p class="contrib-info__a">
                    <span class="contrib-info__label">{{ 'account.contrib.reply' | t }}</span>
                    {{ req.replyMessage }}
                  </p>
                  <span class="contrib-row__meta">{{ req.repliedAt | date: 'medium': undefined: i18n.locale() }}</span>
                }
              </div>
            }
          }
        </li>
      }
    </ul>
  }
</div>
`, styles: ['@charset "UTF-8";\n\n/* src/app/features/account/contributions-panel.scss */\n.contributions {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-12);\n}\n.contributions-subtitle {\n  font-size: var(--text-lg);\n  font-weight: var(--font-weight-semibold);\n  margin: 0 0 var(--space-4);\n}\n.contributions-state {\n  color: var(--color-muted);\n  margin: 0 0 var(--space-8);\n  font-size: var(--text-md);\n}\n.contributions-state--error {\n  color: var(--color-danger);\n}\n.contributions-empty {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-12);\n  padding-block: var(--space-12) var(--space-16);\n}\n.contrib-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n.contrib-row {\n  padding: var(--space-12) 0;\n  border-bottom: 1px solid var(--color-border-subtle);\n}\n.contrib-row:last-child {\n  border-bottom: none;\n}\n.contrib-row__info {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-4);\n}\n.contrib-row__title {\n  font-size: var(--text-base);\n  font-weight: var(--font-weight-semibold);\n  overflow-wrap: anywhere;\n  display: inline-flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: var(--space-6);\n}\n.contrib-row__title--link {\n  color: var(--color-primary);\n  text-decoration: none;\n}\n.contrib-row__title--link:hover {\n  text-decoration: underline;\n}\n.contrib-badge {\n  display: inline-block;\n  font-size: var(--text-2xs);\n  font-weight: var(--font-weight-semibold);\n  padding: var(--space-2) var(--space-4);\n  border-radius: var(--radius-full);\n  background: var(--color-badge-user);\n  color: var(--color-shelter-user);\n}\n.contrib-badge.badge--new {\n  background: var(--color-badge-new);\n  color: var(--color-warning);\n}\n.contrib-badge.badge--rejected {\n  background: var(--color-danger-bg);\n  border: 1px solid var(--color-danger-border);\n  color: var(--color-danger);\n}\n.contrib-badge {\n}\n.contrib-badge.contrib-badge--info {\n  background: var(--color-badge-new);\n  color: var(--color-warning);\n}\n.contrib-row__note {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n  overflow-wrap: anywhere;\n}\n.contrib-row__meta {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n  display: inline-flex;\n  align-items: center;\n  gap: var(--space-6);\n  flex-wrap: wrap;\n}\n.contrib-row__hidden {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n.contrib-row__actions {\n  display: flex;\n  gap: var(--space-8);\n  margin-top: var(--space-8);\n  flex-wrap: wrap;\n}\n.contrib-actions {\n  display: flex;\n  gap: var(--space-8);\n  margin-top: var(--space-8);\n  flex-wrap: wrap;\n}\n.row-error {\n  color: var(--color-danger);\n  font-size: var(--text-sm);\n  margin: var(--space-8) 0 0;\n}\n.confirm-strip {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--space-12);\n  flex-wrap: wrap;\n  margin-top: var(--space-8);\n  padding: var(--space-8) var(--space-12);\n  background: var(--color-danger-bg);\n  border: 1px solid var(--color-danger-border);\n  border-radius: var(--radius-md);\n  color: var(--color-danger);\n  font-size: var(--text-sm);\n}\n.confirm-strip .contrib-actions {\n  margin-top: 0;\n}\n.contrib-info {\n  margin-top: var(--space-12);\n  padding: var(--space-12);\n  background: var(--color-bg-subtle);\n  border-radius: var(--radius-md);\n}\n.contrib-info .contrib-info__label {\n  font-weight: var(--font-weight-semibold);\n  color: var(--color-muted);\n  margin-right: var(--space-6);\n}\n.contrib-info .contrib-info__q,\n.contrib-info .contrib-info__a {\n  margin: 0 0 var(--space-6);\n  font-size: var(--text-md);\n  overflow-wrap: anywhere;\n}\n.contrib-info .field {\n  margin-top: var(--space-8);\n}\n.field-label {\n  display: block;\n  font-size: var(--text-md);\n  font-weight: var(--font-weight-medium);\n  margin-bottom: var(--space-4);\n}\n/*# sourceMappingURL=contributions-panel.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(ContributionsPanel, { className: "ContributionsPanel", filePath: "src/app/features/account/contributions-panel.ts", lineNumber: 51 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Faccount%2Fcontributions-panel.ts%40ContributionsPanel";
  function ContributionsPanel_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(ContributionsPanel, m.default, [i0, i1], [ReactiveFormsModule, RouterLink, NgClass, LoadingIndicator, DatePipe, TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && ContributionsPanel_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && ContributionsPanel_HmrLoad(d.timestamp)));
})();

// src/app/features/account/account-page.ts
import * as i02 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i12 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
var _c02 = (a0) => ({ time: a0 });
function AccountPage_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-banner", 3);
    i02.\u0275\u0275pipe(1, "t");
  }
  if (rf & 2) {
    const text_r1 = ctx;
    i02.\u0275\u0275property("message", i02.\u0275\u0275pipeBind2(1, 1, text_r1.key, text_r1.params));
  }
}
function AccountPage_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "div", 5);
    i02.\u0275\u0275element(1, "app-banner", 4);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementStart(3, "div", 6)(4, "button", 7);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_9_Template_button_click_4_listener() {
      i02.\u0275\u0275restoreView(_r2);
      const ctx_r2 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r2.retryProfile());
    });
    i02.\u0275\u0275text(5);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275pipe(7, "t");
    i02.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275advance();
    i02.\u0275\u0275property("message", i02.\u0275\u0275pipeBind1(2, 3, "account.profileLoadError"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r2.retrying());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.retrying() ? i02.\u0275\u0275pipeBind1(6, 5, "account.retrying") : i02.\u0275\u0275pipeBind1(7, 7, "account.retry"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_4_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "span", 22);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "account.adminBadge"));
  }
}
function AccountPage_Conditional_10_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "dl", 20)(1, "div", 21)(2, "dt");
    i02.\u0275\u0275text(3);
    i02.\u0275\u0275pipe(4, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(5, "dd");
    i02.\u0275\u0275text(6);
    i02.\u0275\u0275conditionalCreate(7, AccountPage_Conditional_10_Conditional_4_Conditional_7_Template, 3, 3, "span", 22);
    i02.\u0275\u0275elementEnd()()();
    i02.\u0275\u0275elementStart(8, "p", 16);
    i02.\u0275\u0275text(9);
    i02.\u0275\u0275pipe(10, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(11, "div", 6)(12, "button", 7);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_4_Template_button_click_12_listener() {
      i02.\u0275\u0275restoreView(_r5);
      const ctx_r2 = i02.\u0275\u0275nextContext(2);
      return i02.\u0275\u0275resetView(ctx_r2.startEdit());
    });
    i02.\u0275\u0275text(13);
    i02.\u0275\u0275pipe(14, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(4, 6, "account.name"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.auth.name(), " ");
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(ctx_r2.auth.isAdmin() ? 7 : -1);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(10, 8, "account.identityCopy"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r2.busy());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(14, 10, "account.edit"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_5_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 26);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 1, "account.nameRequired"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_5_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 29);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 1, "account.passwordRequired"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "div", 23)(1, "label", 24);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(4, "input", 25);
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275conditionalCreate(5, AccountPage_Conditional_10_Conditional_5_Conditional_5_Template, 3, 3, "p", 26);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(6, "div", 23)(7, "label", 27);
    i02.\u0275\u0275text(8);
    i02.\u0275\u0275pipe(9, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(10, "input", 28);
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275conditionalCreate(11, AccountPage_Conditional_10_Conditional_5_Conditional_11_Template, 3, 3, "p", 29);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(12, "div", 6)(13, "button", 30);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_5_Template_button_click_13_listener() {
      i02.\u0275\u0275restoreView(_r6);
      const ctx_r2 = i02.\u0275\u0275nextContext(2);
      return i02.\u0275\u0275resetView(ctx_r2.saveProfile());
    });
    i02.\u0275\u0275text(14);
    i02.\u0275\u0275pipe(15, "t");
    i02.\u0275\u0275pipe(16, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(17, "button", 7);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_5_Template_button_click_17_listener() {
      i02.\u0275\u0275restoreView(_r6);
      const ctx_r2 = i02.\u0275\u0275nextContext(2);
      return i02.\u0275\u0275resetView(ctx_r2.cancelEdit());
    });
    i02.\u0275\u0275text(18);
    i02.\u0275\u0275pipe(19, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 14, "account.name"));
    const nameInvalid_r7 = ctx_r2.editName.touched && ctx_r2.editName.invalid;
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("formControl", ctx_r2.editName);
    i02.\u0275\u0275attribute("aria-invalid", nameInvalid_r7 ? "true" : null)("aria-describedby", nameInvalid_r7 ? "profile-name-error" : null);
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(nameInvalid_r7 ? 5 : -1);
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(9, 16, "account.currentPassword"));
    const currentPasswordInvalid_r8 = ctx_r2.editPassword.touched && ctx_r2.editPassword.invalid;
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("formControl", ctx_r2.editPassword);
    i02.\u0275\u0275attribute("aria-invalid", currentPasswordInvalid_r8 ? "true" : null)("aria-describedby", currentPasswordInvalid_r8 ? "profile-password-error" : null);
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(currentPasswordInvalid_r8 ? 11 : -1);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("disabled", ctx_r2.busy());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.busy() ? i02.\u0275\u0275pipeBind1(15, 18, "account.saving") : i02.\u0275\u0275pipeBind1(16, 20, "account.save"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r2.busy());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(19, 22, "account.cancel"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "span", 14);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "account.verified"));
  }
}
function AccountPage_Conditional_10_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "a", 15);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 1, "account.completeVerification"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "span", 14);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "account.verified"));
  }
}
function AccountPage_Conditional_10_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "a", 15);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 1, "account.completeVerification"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_32_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "p", 16);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementStart(3, "strong");
    i02.\u0275\u0275text(4);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275text(5);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(7, "button", 31);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_32_Template_button_click_7_listener() {
      i02.\u0275\u0275restoreView(_r9);
      const ctx_r2 = i02.\u0275\u0275nextContext(2);
      return i02.\u0275\u0275resetView(ctx_r2.emailStartOver());
    });
    i02.\u0275\u0275text(8);
    i02.\u0275\u0275pipe(9, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 4, "account.emailDone.before"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(ctx_r2.auth.email());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1("", i02.\u0275\u0275pipeBind1(6, 6, "account.emailDone.after"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(9, 8, "account.changeAgain"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_33_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 34);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.newEmail.errors?.["maxlength"] ? i02.\u0275\u0275pipeBind1(2, 1, "account.emailTooLong") : i02.\u0275\u0275pipeBind1(3, 3, "account.emailRequired"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_33_Conditional_10_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 39);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 1, "account.smsCodeRequired"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_33_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "div", 23)(1, "label", 37);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(4, "input", 38);
    i02.\u0275\u0275pipe(5, "t");
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275conditionalCreate(6, AccountPage_Conditional_10_Conditional_33_Conditional_10_Conditional_6_Template, 3, 3, "p", 39);
    i02.\u0275\u0275elementStart(7, "p", 40);
    i02.\u0275\u0275text(8);
    i02.\u0275\u0275pipe(9, "t");
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275elementStart(10, "div", 6)(11, "button", 30);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_33_Conditional_10_Template_button_click_11_listener() {
      i02.\u0275\u0275restoreView(_r10);
      const ctx_r2 = i02.\u0275\u0275nextContext(3);
      return i02.\u0275\u0275resetView(ctx_r2.emailConfirm());
    });
    i02.\u0275\u0275text(12);
    i02.\u0275\u0275pipe(13, "t");
    i02.\u0275\u0275pipe(14, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(15, "button", 7);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_33_Conditional_10_Template_button_click_15_listener() {
      i02.\u0275\u0275restoreView(_r10);
      const ctx_r2 = i02.\u0275\u0275nextContext(3);
      return i02.\u0275\u0275resetView(ctx_r2.emailResend());
    });
    i02.\u0275\u0275text(16);
    i02.\u0275\u0275pipe(17, "t");
    i02.\u0275\u0275pipe(18, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(19, "button", 7);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_33_Conditional_10_Template_button_click_19_listener() {
      i02.\u0275\u0275restoreView(_r10);
      const ctx_r2 = i02.\u0275\u0275nextContext(3);
      return i02.\u0275\u0275resetView(ctx_r2.emailStartOver());
    });
    i02.\u0275\u0275text(20);
    i02.\u0275\u0275pipe(21, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 13, "account.smsCode"));
    const emailCodeInvalid_r11 = ctx_r2.emailCode.touched && ctx_r2.emailCode.invalid;
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("formControl", ctx_r2.emailCode)("placeholder", i02.\u0275\u0275pipeBind1(5, 15, "account.codePlaceholder"));
    i02.\u0275\u0275attribute("aria-invalid", emailCodeInvalid_r11 ? "true" : null)("aria-describedby", emailCodeInvalid_r11 ? "change-email-code-error" : null);
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(emailCodeInvalid_r11 ? 6 : -1);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(9, 17, "account.smsSentHint"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r2.busy());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.busy() ? i02.\u0275\u0275pipeBind1(13, 19, "account.working") : i02.\u0275\u0275pipeBind1(14, 21, "account.confirmNewEmail"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r2.busy() || ctx_r2.emailCountdown.active);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.emailCountdown.active ? i02.\u0275\u0275pipeBind2(17, 23, "account.resendIn", i02.\u0275\u0275pureFunction1(30, _c02, ctx_r2.emailCountdown.label())) : i02.\u0275\u0275pipeBind1(18, 26, "account.resendCode"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r2.busy());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(21, 28, "account.cancel"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_33_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "button", 30);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_33_Conditional_11_Template_button_click_0_listener() {
      i02.\u0275\u0275restoreView(_r12);
      const ctx_r2 = i02.\u0275\u0275nextContext(3);
      return i02.\u0275\u0275resetView(ctx_r2.emailSend());
    });
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275pipe(4, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275property("disabled", ctx_r2.busy() || ctx_r2.emailCountdown.active);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.busy() ? i02.\u0275\u0275pipeBind1(2, 2, "account.sending") : ctx_r2.emailCountdown.active ? i02.\u0275\u0275pipeBind2(3, 4, "account.sendIn", i02.\u0275\u0275pureFunction1(9, _c02, ctx_r2.emailCountdown.label())) : i02.\u0275\u0275pipeBind1(4, 7, "account.sendSmsToPhone"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_33_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 23)(1, "label", 32);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(4, "input", 33);
    i02.\u0275\u0275pipe(5, "t");
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275conditionalCreate(6, AccountPage_Conditional_10_Conditional_33_Conditional_6_Template, 4, 5, "p", 34);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(7, "p", 35);
    i02.\u0275\u0275text(8);
    i02.\u0275\u0275pipe(9, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(10, AccountPage_Conditional_10_Conditional_33_Conditional_10_Template, 22, 32)(11, AccountPage_Conditional_10_Conditional_33_Conditional_11_Template, 5, 11, "button", 36);
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 8, "account.newEmail"));
    const newEmailInvalid_r13 = ctx_r2.newEmail.touched && ctx_r2.newEmail.invalid;
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("formControl", ctx_r2.newEmail)("placeholder", i02.\u0275\u0275pipeBind1(5, 10, "account.newEmailPlaceholder"));
    i02.\u0275\u0275attribute("aria-invalid", newEmailInvalid_r13 ? "true" : null)("aria-describedby", newEmailInvalid_r13 ? "change-email-new-error" : null);
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(newEmailInvalid_r13 ? 6 : -1);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(9, 12, "account.emailProof"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r2.emailPhase() === "code" ? 10 : 11);
  }
}
function AccountPage_Conditional_10_Conditional_38_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "p", 16);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementStart(3, "strong");
    i02.\u0275\u0275text(4);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275text(5);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(7, "button", 31);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_38_Template_button_click_7_listener() {
      i02.\u0275\u0275restoreView(_r14);
      const ctx_r2 = i02.\u0275\u0275nextContext(2);
      return i02.\u0275\u0275resetView(ctx_r2.phoneStartOver());
    });
    i02.\u0275\u0275text(8);
    i02.\u0275\u0275pipe(9, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 4, "account.phoneDone.before"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(ctx_r2.auth.phone());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1("", i02.\u0275\u0275pipeBind1(6, 6, "account.phoneDone.after"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(9, 8, "account.changeAgain"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_39_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 43);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.newPhone.errors?.["maxlength"] ? i02.\u0275\u0275pipeBind1(2, 1, "account.phoneTooLong") : i02.\u0275\u0275pipeBind1(3, 3, "account.phoneRequired"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_39_Conditional_10_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 46);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 1, "account.emailCodeRequired"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_39_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "div", 23)(1, "label", 44);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(4, "input", 45);
    i02.\u0275\u0275pipe(5, "t");
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275conditionalCreate(6, AccountPage_Conditional_10_Conditional_39_Conditional_10_Conditional_6_Template, 3, 3, "p", 46);
    i02.\u0275\u0275elementStart(7, "p", 40);
    i02.\u0275\u0275text(8);
    i02.\u0275\u0275pipe(9, "t");
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275elementStart(10, "div", 6)(11, "button", 30);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_39_Conditional_10_Template_button_click_11_listener() {
      i02.\u0275\u0275restoreView(_r15);
      const ctx_r2 = i02.\u0275\u0275nextContext(3);
      return i02.\u0275\u0275resetView(ctx_r2.phoneConfirm());
    });
    i02.\u0275\u0275text(12);
    i02.\u0275\u0275pipe(13, "t");
    i02.\u0275\u0275pipe(14, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(15, "button", 7);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_39_Conditional_10_Template_button_click_15_listener() {
      i02.\u0275\u0275restoreView(_r15);
      const ctx_r2 = i02.\u0275\u0275nextContext(3);
      return i02.\u0275\u0275resetView(ctx_r2.phoneResend());
    });
    i02.\u0275\u0275text(16);
    i02.\u0275\u0275pipe(17, "t");
    i02.\u0275\u0275pipe(18, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(19, "button", 7);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_39_Conditional_10_Template_button_click_19_listener() {
      i02.\u0275\u0275restoreView(_r15);
      const ctx_r2 = i02.\u0275\u0275nextContext(3);
      return i02.\u0275\u0275resetView(ctx_r2.phoneStartOver());
    });
    i02.\u0275\u0275text(20);
    i02.\u0275\u0275pipe(21, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 13, "account.emailCode"));
    const phoneCodeInvalid_r16 = ctx_r2.phoneCode.touched && ctx_r2.phoneCode.invalid;
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("formControl", ctx_r2.phoneCode)("placeholder", i02.\u0275\u0275pipeBind1(5, 15, "account.codePlaceholder"));
    i02.\u0275\u0275attribute("aria-invalid", phoneCodeInvalid_r16 ? "true" : null)("aria-describedby", phoneCodeInvalid_r16 ? "change-phone-code-error" : null);
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(phoneCodeInvalid_r16 ? 6 : -1);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(9, 17, "account.emailCodeSentHint"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r2.busy());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.busy() ? i02.\u0275\u0275pipeBind1(13, 19, "account.working") : i02.\u0275\u0275pipeBind1(14, 21, "account.confirmNewPhone"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r2.busy() || ctx_r2.phoneCountdown.active);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.phoneCountdown.active ? i02.\u0275\u0275pipeBind2(17, 23, "account.resendIn", i02.\u0275\u0275pureFunction1(30, _c02, ctx_r2.phoneCountdown.label())) : i02.\u0275\u0275pipeBind1(18, 26, "account.resendCode"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r2.busy());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(21, 28, "account.cancel"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_39_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "button", 30);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_39_Conditional_11_Template_button_click_0_listener() {
      i02.\u0275\u0275restoreView(_r17);
      const ctx_r2 = i02.\u0275\u0275nextContext(3);
      return i02.\u0275\u0275resetView(ctx_r2.phoneSend());
    });
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275pipe(4, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275property("disabled", ctx_r2.busy() || ctx_r2.phoneCountdown.active);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.busy() ? i02.\u0275\u0275pipeBind1(2, 2, "account.sending") : ctx_r2.phoneCountdown.active ? i02.\u0275\u0275pipeBind2(3, 4, "account.sendIn", i02.\u0275\u0275pureFunction1(9, _c02, ctx_r2.phoneCountdown.label())) : i02.\u0275\u0275pipeBind1(4, 7, "account.sendEmailCode"), " ");
  }
}
function AccountPage_Conditional_10_Conditional_39_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 23)(1, "label", 41);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(4, "input", 42);
    i02.\u0275\u0275pipe(5, "t");
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275conditionalCreate(6, AccountPage_Conditional_10_Conditional_39_Conditional_6_Template, 4, 5, "p", 43);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(7, "p", 35);
    i02.\u0275\u0275text(8);
    i02.\u0275\u0275pipe(9, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(10, AccountPage_Conditional_10_Conditional_39_Conditional_10_Template, 22, 32)(11, AccountPage_Conditional_10_Conditional_39_Conditional_11_Template, 5, 11, "button", 36);
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 8, "account.newPhone"));
    const newPhoneInvalid_r18 = ctx_r2.newPhone.touched && ctx_r2.newPhone.invalid;
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("formControl", ctx_r2.newPhone)("placeholder", i02.\u0275\u0275pipeBind1(5, 10, "account.newPhonePlaceholder"));
    i02.\u0275\u0275attribute("aria-invalid", newPhoneInvalid_r18 ? "true" : null)("aria-describedby", newPhoneInvalid_r18 ? "change-phone-new-error" : null);
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(newPhoneInvalid_r18 ? 6 : -1);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(9, 12, "account.phoneProof"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r2.phonePhase() === "code" ? 10 : 11);
  }
}
function AccountPage_Conditional_10_Conditional_63_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 16);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "account.delete.adminCopy"));
  }
}
function AccountPage_Conditional_10_Conditional_64_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 49);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "account.delete.armed"));
  }
}
function AccountPage_Conditional_10_Conditional_64_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "p", 16);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(3, "div", 23)(4, "label", 47);
    i02.\u0275\u0275text(5);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(7, "input", 48);
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(8, AccountPage_Conditional_10_Conditional_64_Conditional_8_Template, 3, 3, "p", 49);
    i02.\u0275\u0275elementStart(9, "div", 6)(10, "button", 50);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Conditional_64_Template_button_click_10_listener() {
      i02.\u0275\u0275restoreView(_r19);
      const ctx_r2 = i02.\u0275\u0275nextContext(2);
      return i02.\u0275\u0275resetView(ctx_r2.deleteAccount());
    });
    i02.\u0275\u0275text(11);
    i02.\u0275\u0275pipe(12, "t");
    i02.\u0275\u0275pipe(13, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 6, "account.delete.copy"));
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(6, 8, "account.delete.typeHint"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("formControl", ctx_r2.deleteConfirm);
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(ctx_r2.accountDeleteConfirm.isArmed(ctx_r2.accountDeleteKey) ? 8 : -1);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("disabled", ctx_r2.busy() || !ctx_r2.accountDeleteConfirm.isArmed(ctx_r2.accountDeleteKey));
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.busy() ? i02.\u0275\u0275pipeBind1(12, 10, "account.deleting") : i02.\u0275\u0275pipeBind1(13, 12, "account.delete.button"), " ");
  }
}
function AccountPage_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "section", 8)(1, "h2", 9);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(4, AccountPage_Conditional_10_Conditional_4_Template, 15, 12)(5, AccountPage_Conditional_10_Conditional_5_Template, 20, 24);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(6, "section", 8)(7, "h2", 9);
    i02.\u0275\u0275text(8);
    i02.\u0275\u0275pipe(9, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(10, "div", 10)(11, "div", 11)(12, "span", 12);
    i02.\u0275\u0275text(13);
    i02.\u0275\u0275pipe(14, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(15, "span", 13);
    i02.\u0275\u0275text(16);
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275conditionalCreate(17, AccountPage_Conditional_10_Conditional_17_Template, 3, 3, "span", 14)(18, AccountPage_Conditional_10_Conditional_18_Template, 3, 3, "a", 15);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(19, "div", 10)(20, "div", 11)(21, "span", 12);
    i02.\u0275\u0275text(22);
    i02.\u0275\u0275pipe(23, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(24, "span", 13);
    i02.\u0275\u0275text(25);
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275conditionalCreate(26, AccountPage_Conditional_10_Conditional_26_Template, 3, 3, "span", 14)(27, AccountPage_Conditional_10_Conditional_27_Template, 3, 3, "a", 15);
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275elementStart(28, "section", 8)(29, "h2", 9);
    i02.\u0275\u0275text(30);
    i02.\u0275\u0275pipe(31, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(32, AccountPage_Conditional_10_Conditional_32_Template, 10, 10)(33, AccountPage_Conditional_10_Conditional_33_Template, 12, 14);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(34, "section", 8)(35, "h2", 9);
    i02.\u0275\u0275text(36);
    i02.\u0275\u0275pipe(37, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(38, AccountPage_Conditional_10_Conditional_38_Template, 10, 10)(39, AccountPage_Conditional_10_Conditional_39_Template, 12, 14);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(40, "section", 8)(41, "h2", 9);
    i02.\u0275\u0275text(42);
    i02.\u0275\u0275pipe(43, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(44, "p", 16);
    i02.\u0275\u0275text(45);
    i02.\u0275\u0275pipe(46, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(47, "app-contributions-panel");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(48, "section", 8)(49, "h2", 9);
    i02.\u0275\u0275text(50);
    i02.\u0275\u0275pipe(51, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(52, "p", 16);
    i02.\u0275\u0275text(53);
    i02.\u0275\u0275pipe(54, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(55, "button", 17);
    i02.\u0275\u0275listener("click", function AccountPage_Conditional_10_Template_button_click_55_listener() {
      i02.\u0275\u0275restoreView(_r4);
      const ctx_r2 = i02.\u0275\u0275nextContext();
      return i02.\u0275\u0275resetView(ctx_r2.downloadData());
    });
    i02.\u0275\u0275text(56);
    i02.\u0275\u0275pipe(57, "t");
    i02.\u0275\u0275pipe(58, "t");
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275elementStart(59, "section", 8)(60, "h2", 9);
    i02.\u0275\u0275text(61);
    i02.\u0275\u0275pipe(62, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(63, AccountPage_Conditional_10_Conditional_63_Template, 3, 3, "p", 16)(64, AccountPage_Conditional_10_Conditional_64_Template, 14, 14);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(65, "section", 8)(66, "h2", 9);
    i02.\u0275\u0275text(67);
    i02.\u0275\u0275pipe(68, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(69, "p", 16);
    i02.\u0275\u0275text(70);
    i02.\u0275\u0275pipe(71, "t");
    i02.\u0275\u0275elementStart(72, "a", 18);
    i02.\u0275\u0275text(73);
    i02.\u0275\u0275pipe(74, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275text(75);
    i02.\u0275\u0275pipe(76, "t");
    i02.\u0275\u0275elementStart(77, "a", 19);
    i02.\u0275\u0275text(78);
    i02.\u0275\u0275pipe(79, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275text(80);
    i02.\u0275\u0275pipe(81, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 27, "account.identity"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(!ctx_r2.editing() ? 4 : 5);
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(9, 29, "account.contacts"));
    i02.\u0275\u0275advance(5);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(14, 31, "account.emailLabel"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(ctx_r2.auth.email());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(ctx_r2.verified("EMAIL") ? 17 : 18);
    i02.\u0275\u0275advance(5);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(23, 33, "account.phoneLabel"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(ctx_r2.auth.phone());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(ctx_r2.verified("PHONE") ? 26 : 27);
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(31, 35, "account.changeEmail"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r2.emailPhase() === "done" ? 32 : 33);
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(37, 37, "account.changePhone"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r2.phonePhase() === "done" ? 38 : 39);
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(43, 39, "account.contributions"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(46, 41, "account.contributionsCopy"));
    i02.\u0275\u0275advance(5);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(51, 43, "account.yourData"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(54, 45, "account.dataCopy"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("disabled", ctx_r2.busy());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r2.busy() ? i02.\u0275\u0275pipeBind1(57, 47, "account.preparing") : i02.\u0275\u0275pipeBind1(58, 49, "account.downloadData"), " ");
    i02.\u0275\u0275advance(5);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(62, 51, "account.delete"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r2.auth.isAdmin() ? 63 : 64);
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(68, 53, "account.legal"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(71, 55, "account.legal.lead"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(74, 57, "authPage.privacyPolicy"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(76, 59, "account.legal.and"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(79, 61, "authPage.termsOfUse"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate1("", i02.\u0275\u0275pipeBind1(81, 63, "account.legal.tail"), " ");
  }
}
var AccountPage = class _AccountPage {
  account = inject2(AccountGateway);
  host = inject2(ElementRef2);
  auth = inject2(AuthStore);
  router = inject2(Router);
  /** i18n-et-en: the account surface is fully catalog-driven (| t pipes +
   *  key-based banners), so a switcher change must re-render the whole page.
   *  The profile data itself is NOT locale-scoped (no re-fetch needed). */
  i18n = inject2(I18nService);
  cdr = inject2(ChangeDetectorRef2);
  /** The language switcher sets I18nService.locale: re-derive the stored
   *  banners (key + raw error) and re-render every | t label. toObservable
   *  emits the CURRENT value on subscribe, so skip(1) — only a real switch
   *  triggers it (the guidance-page idiom). Unsubscribed in ngOnDestroy. */
  localeSub = toObservable2(this.i18n.locale).pipe(skip2(1)).subscribe(() => this.cdr.markForCheck());
  // ---- identity section ----------------------------------------------------
  /** True while the password-confirmed edit form is open. */
  editing = signal2(
    false,
    ...ngDevMode ? [{ debugName: "editing" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** New-value controls are public so specs can drive them (page convention:
   *  forms public, signals protected + asserted via the DOM). */
  editName = new FormControl2("", {
    nonNullable: true,
    validators: [Validators2.required]
  });
  editPassword = new FormControl2("", {
    nonNullable: true,
    validators: [Validators2.required]
  });
  // ---- email section ------------------------------------------------------
  emailPhase = signal2(
    "form",
    ...ngDevMode ? [{ debugName: "emailPhase" }] : (
      /* istanbul ignore next */
      []
    )
  );
  newEmail = new FormControl2("", {
    nonNullable: true,
    // required + email + the backend's @Size(max=255) cap: with these in
    // place, the ONLY 400 the backend can still answer at the request
    // phase is "same as current value" (mirrors the register/submit forms).
    validators: [Validators2.required, Validators2.email, Validators2.maxLength(255)]
  });
  emailCode = new FormControl2("", {
    nonNullable: true,
    validators: [Validators2.required, Validators2.pattern(CODE_SIX_DIGITS)]
  });
  // ---- phone section ------------------------------------------------------
  phonePhase = signal2(
    "form",
    ...ngDevMode ? [{ debugName: "phonePhase" }] : (
      /* istanbul ignore next */
      []
    )
  );
  newPhone = new FormControl2("", {
    nonNullable: true,
    // required + the backend's @Size(max=64) cap (same convention as above).
    validators: [Validators2.required, Validators2.maxLength(64)]
  });
  phoneCode = new FormControl2("", {
    nonNullable: true,
    validators: [Validators2.required, Validators2.pattern(CODE_SIX_DIGITS)]
  });
  // ---- shared UI state ----------------------------------------------------
  busy = signal2(
    false,
    ...ngDevMode ? [{ debugName: "busy" }] : (
      /* istanbul ignore next */
      []
    )
  );
  error = signal2(
    null,
    ...ngDevMode ? [{ debugName: "error" }] : (
      /* istanbul ignore next */
      []
    )
  );
  success = signal2(
    null,
    ...ngDevMode ? [{ debugName: "success" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The error banner text, re-derived at render time: the forced client
   *  key (the request-phase 400 "same value" case) or the i18n-aware
   *  banner mapping. Reading i18n.t() here tracks the locale, so a switch
   *  re-renders the banner in the new language. */
  errorMessage() {
    const state = this.error();
    if (state === null) {
      return null;
    }
    if (state.copy !== void 0) {
      return this.i18n.t(state.copy);
    }
    return bannerMessage(state.error, state.kind, (key) => this.i18n.t(key));
  }
  /** One countdown per change type — the e-mail and phone cooldowns are independent. */
  emailCountdown = new ResendCountdown();
  phoneCountdown = new ResendCountdown();
  ngOnDestroy() {
    this.emailCountdown.stop();
    this.phoneCountdown.stop();
    this.localeSub.unsubscribe();
  }
  /** Verified for the level? Reads the REAL claim set from the fetched profile. */
  verified(level) {
    return this.auth.levels().includes(level);
  }
  /** True while the profile Retry fetch is in flight (button feedback; the
   *  store's single-flight already guards the request itself). */
  retrying = signal2(
    false,
    ...ngDevMode ? [{ debugName: "retrying" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Retry the profile fetch (error state: the boot-time fetch failed). */
  async retryProfile() {
    if (this.retrying()) {
      return;
    }
    this.retrying.set(true);
    try {
      await this.auth.refreshProfile();
    } finally {
      this.retrying.set(false);
    }
  }
  // -------------------------------------------------------------------------
  // Identity: open the inline edit form pre-filled with the current value.
  // -------------------------------------------------------------------------
  startEdit() {
    this.editName.setValue(this.auth.name() ?? "");
    this.editPassword.setValue("");
    this.editName.markAsUntouched();
    this.editPassword.markAsUntouched();
    this.editing.set(true);
  }
  cancelEdit() {
    this.editing.set(false);
    this.editPassword.setValue("");
  }
  /**
   * PUT /account/profile {name, currentPassword}. The backend verifies the
   * current password first (wrong -> 401, nothing updated) and validates
   * the field exactly like registration (blank -> 400). On success the real
   * profile is re-fetched, so the card shows the server state.
   */
  async saveProfile() {
    if (this.busy()) {
      return;
    }
    if (this.editName.invalid || this.editPassword.invalid) {
      this.editName.markAsTouched();
      this.editPassword.markAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      await this.account.updateProfile({
        name: this.editName.value,
        currentPassword: this.editPassword.value
      });
      await this.auth.refreshProfile();
      this.editing.set(false);
      this.editPassword.setValue("");
      this.success.set({ key: "account.success.profileUpdated" });
    } catch (error) {
      this.error.set({ error, kind: "profile" });
    } finally {
      this.busy.set(false);
    }
  }
  // -------------------------------------------------------------------------
  // Email flow: request (code by SMS to the current phone) -> confirm.
  // -------------------------------------------------------------------------
  async emailSend() {
    if (this.busy()) {
      return;
    }
    if (this.newEmail.invalid) {
      this.newEmail.markAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      const target = this.newEmail.value.trim().toLowerCase();
      const ack = await this.account.requestEmailChange(target);
      this.emailCountdown.start(ack.resendAvailableAfterSeconds ?? 60);
      this.emailPhase.set("code");
      this.newEmail.disable();
    } catch (error) {
      this.startCountdownFromThrottle(error, this.emailCountdown);
      this.setChangeError(error);
    } finally {
      this.busy.set(false);
    }
  }
  async emailConfirm() {
    if (this.busy()) {
      return;
    }
    if (this.emailCode.invalid) {
      this.emailCode.markAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      const confirmed = this.newEmail.value.trim().toLowerCase();
      await this.account.confirmEmailChange(this.emailCode.value.trim());
      this.newEmail.setValue(confirmed);
      await this.auth.refreshProfile();
      this.emailPhase.set("done");
      this.success.set({ key: "account.success.emailChanged" });
    } catch (error) {
      this.error.set({ error, kind: "account" });
    } finally {
      this.busy.set(false);
    }
  }
  /** Same request path as the initial send — the backend enforces the
   *  resend cooldown and answers 429, which we surface AND run as the
   *  button countdown (no retry storm). */
  emailResend() {
    return this.emailSend();
  }
  emailStartOver() {
    this.emailPhase.set("form");
    this.error.set(null);
    this.newEmail.enable();
    this.emailCode.setValue("");
    this.emailCode.markAsUntouched();
  }
  // -------------------------------------------------------------------------
  // Phone flow: request (code by email to the current address) -> confirm.
  // -------------------------------------------------------------------------
  async phoneSend() {
    if (this.busy()) {
      return;
    }
    if (this.newPhone.invalid) {
      this.newPhone.markAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      const target = this.newPhone.value.trim();
      const ack = await this.account.requestPhoneChange(target);
      this.phoneCountdown.start(ack.resendAvailableAfterSeconds ?? 60);
      this.phonePhase.set("code");
      this.newPhone.disable();
    } catch (error) {
      this.startCountdownFromThrottle(error, this.phoneCountdown);
      this.setChangeError(error);
    } finally {
      this.busy.set(false);
    }
  }
  async phoneConfirm() {
    if (this.busy()) {
      return;
    }
    if (this.phoneCode.invalid) {
      this.phoneCode.markAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      const confirmed = this.newPhone.value.trim();
      await this.account.confirmPhoneChange(this.phoneCode.value.trim());
      this.newPhone.setValue(confirmed);
      await this.auth.refreshProfile();
      this.phonePhase.set("done");
      this.success.set({ key: "account.success.phoneChanged" });
    } catch (error) {
      this.error.set({ error, kind: "account" });
    } finally {
      this.busy.set(false);
    }
  }
  phoneResend() {
    return this.phoneSend();
  }
  phoneStartOver() {
    this.phonePhase.set("form");
    this.error.set(null);
    this.newPhone.enable();
    this.phoneCode.setValue("");
    this.phoneCode.markAsUntouched();
  }
  /**
   * Request-phase failures: the client validators (required + email format
   * + the backend-mirrored length caps, 255/64) already block everything
   * the backend rejects with 400 EXCEPT the "same as current value" case —
   * give that case dedicated copy so the user understands the value must
   * differ. Everything else goes through the standard banner mapping
   * (409 duplicate passes the backend message).
   */
  setChangeError(error) {
    const api = error instanceof ApiError ? error : toApiError(error);
    this.error.set({
      error,
      kind: "account",
      copy: api.status === 400 ? "account.error.sameValue" : void 0
    });
  }
  /**
   * A 429 from a change request means the backend cooldown is live — run
   * the countdown (Retry-After when the server sent one, else the default
   * 60 s) so the button shows the wait instead of only the banner.
   */
  startCountdownFromThrottle(error, countdown) {
    const api = error instanceof ApiError ? error : toApiError(error);
    if (api.status === 429) {
      countdown.start(api.retryAfterSeconds ?? 60);
    }
  }
  // -------------------------------------------------------------------------
  // Delete account (legal-recovery): type-to-confirm erasure.
  // -------------------------------------------------------------------------
  /** The confirm word the user must type to arm the delete (no window.confirm). */
  deleteConfirm = new FormControl2("", {
    nonNullable: true
  });
  /** Armed once the confirm word is exactly typed, through the shared
   *  ConfirmAction (accessibility): `accountDeleteKey` is the single
   *  arming key on this page (ConfirmAction's attribute-safe token). */
  accountDeleteKey = "account";
  accountDeleteConfirm = new ConfirmAction(this.host.nativeElement);
  constructor() {
    this.deleteConfirm.valueChanges.subscribe((value) => {
      if (value === "DELETE") {
        this.accountDeleteConfirm.arm(this.accountDeleteKey);
      } else {
        this.accountDeleteConfirm.disarm();
      }
    });
  }
  /**
   * "Delete my account" — the two-step type-to-confirm erasure (the armed
   * state comes from the shared ConfirmAction). The button stays disarmed
   * until DELETE is typed; on success the backend has already erased
   * everything (private homes purged, public rows orphaned, the rest
   * cascaded), so the local session ends and the page leaves for the map —
   * the best-effort /auth/logout revocation is a no-op server-side (the
   * refresh tokens died with the account).
   */
  async deleteAccount() {
    if (this.busy() || !this.accountDeleteConfirm.isArmed(this.accountDeleteKey)) {
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      await this.account.deleteAccount();
      await this.auth.logout();
      this.router.navigateByUrl("/map");
    } catch (error) {
      this.error.set({ error, kind: "account" });
    } finally {
      this.busy.set(false);
    }
  }
  // -------------------------------------------------------------------------
  // Your data (legal-recovery): export download.
  // -------------------------------------------------------------------------
  /**
   * "Download my data" — fetch GET /account/export and hand the browser a
   * JSON file. The client-side Blob is the download mechanism; the server
   * is a plain read and never streams a file. Reuses the shared busy flag
   * (the fetch is the only account-page action in flight).
   */
  async downloadData() {
    if (this.busy()) {
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    try {
      const data = await this.account.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `openshelter-data-export-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      this.success.set({ key: "account.success.exportDownloaded" });
    } catch (error) {
      this.error.set({ error, kind: "account" });
    } finally {
      this.busy.set(false);
    }
  }
  static \u0275fac = function AccountPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AccountPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i02.\u0275\u0275defineComponent({ type: _AccountPage, selectors: [["app-account-page"]], decls: 11, vars: 9, consts: [[1, "account-card"], [1, "page-title"], [1, "page-subtitle"], ["severity", "success", 3, "message"], ["severity", "error", 3, "message"], [1, "profile-error"], [1, "panel-actions"], ["type", "button", 1, "btn", "btn--ghost", 3, "click", "disabled"], [1, "change-panel"], [1, "panel-title"], [1, "contact-row"], [1, "contact-row__info"], [1, "contact-row__label"], [1, "contact-row__value"], [1, "contact-chip", "contact-chip--verified"], ["routerLink", "/verify", 1, "btn", "btn--ghost", "contact-chip", "contact-chip--cta"], [1, "panel-copy"], ["type", "button", "id", "download-data", 1, "btn", "btn--ghost", 3, "click", "disabled"], ["routerLink", "/privacy"], ["routerLink", "/terms"], [1, "identity-values"], [1, "identity-row"], [1, "badge", "badge--admin"], [1, "field"], ["for", "profile-name"], ["id", "profile-name", "type", "text", "autocomplete", "name", 3, "formControl"], ["id", "profile-name-error", "role", "alert", 1, "field-error"], ["for", "profile-password"], ["id", "profile-password", "type", "password", "autocomplete", "current-password", 3, "formControl"], ["id", "profile-password-error", "role", "alert", 1, "field-error"], ["type", "button", 1, "btn", "btn--primary", 3, "click", "disabled"], ["type", "button", 1, "btn", "btn--ghost", 3, "click"], ["for", "change-email-new"], ["id", "change-email-new", "type", "email", "maxlength", "255", "autocomplete", "email", 3, "formControl", "placeholder"], ["id", "change-email-new-error", "role", "alert", 1, "field-error"], [1, "proof-note"], ["type", "button", 1, "btn", "btn--primary", 3, "disabled"], ["for", "change-email-code"], ["id", "change-email-code", "type", "text", "autocomplete", "one-time-code", "inputmode", "numeric", 3, "formControl", "placeholder"], ["id", "change-email-code-error", "role", "alert", 1, "field-error"], [1, "field-note"], ["for", "change-phone-new"], ["id", "change-phone-new", "type", "tel", "maxlength", "64", "autocomplete", "tel", 3, "formControl", "placeholder"], ["id", "change-phone-new-error", "role", "alert", 1, "field-error"], ["for", "change-phone-code"], ["id", "change-phone-code", "type", "text", "autocomplete", "one-time-code", "inputmode", "numeric", 3, "formControl", "placeholder"], ["id", "change-phone-code-error", "role", "alert", 1, "field-error"], ["for", "delete-confirm"], ["id", "delete-confirm", "type", "text", "autocomplete", "off", "placeholder", "DELETE", 3, "formControl"], ["role", "status", 1, "field-note"], ["type", "button", "id", "delete-account", 1, "btn", "btn--ghost", "btn--danger", 3, "click", "disabled"]], template: function AccountPage_Template(rf, ctx) {
    if (rf & 1) {
      i02.\u0275\u0275elementStart(0, "section", 0)(1, "h1", 1);
      i02.\u0275\u0275text(2);
      i02.\u0275\u0275pipe(3, "t");
      i02.\u0275\u0275elementEnd();
      i02.\u0275\u0275elementStart(4, "p", 2);
      i02.\u0275\u0275text(5);
      i02.\u0275\u0275pipe(6, "t");
      i02.\u0275\u0275elementEnd();
      i02.\u0275\u0275conditionalCreate(7, AccountPage_Conditional_7_Template, 2, 4, "app-banner", 3);
      i02.\u0275\u0275element(8, "app-banner", 4);
      i02.\u0275\u0275conditionalCreate(9, AccountPage_Conditional_9_Template, 8, 9, "div", 5)(10, AccountPage_Conditional_10_Template, 82, 65);
      i02.\u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_2_0;
      i02.\u0275\u0275advance(2);
      i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 5, "title.account"));
      i02.\u0275\u0275advance(3);
      i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(6, 7, "account.subtitle"));
      i02.\u0275\u0275advance(2);
      i02.\u0275\u0275conditional((tmp_2_0 = ctx.success()) ? 7 : -1, tmp_2_0);
      i02.\u0275\u0275advance();
      i02.\u0275\u0275property("message", ctx.errorMessage());
      i02.\u0275\u0275advance();
      i02.\u0275\u0275conditional(ctx.auth.name() === null ? 9 : 10);
    }
  }, dependencies: [
    ReactiveFormsModule2,
    i12.\u0275NgNoValidate,
    i12.NgSelectOption,
    i12.\u0275NgSelectMultipleOption,
    i12.DefaultValueAccessor,
    i12.NumberValueAccessor,
    i12.RangeValueAccessor,
    i12.CheckboxControlValueAccessor,
    i12.SelectControlValueAccessor,
    i12.SelectMultipleControlValueAccessor,
    i12.RadioControlValueAccessor,
    i12.NgControlStatus,
    i12.NgControlStatusGroup,
    i12.RequiredValidator,
    i12.MinLengthValidator,
    i12.MaxLengthValidator,
    i12.PatternValidator,
    i12.CheckboxRequiredValidator,
    i12.EmailValidator,
    i12.MinValidator,
    i12.MaxValidator,
    i12.FormControlDirective,
    i12.FormGroupDirective,
    i12.FormArrayDirective,
    i12.FormControlName,
    i12.FormGroupName,
    i12.FormArrayName,
    RouterLink2,
    BannerComponent,
    ContributionsPanel,
    TranslatePipe
  ], styles: ['@charset "UTF-8";\n\n\n[_nghost-%COMP%] {\n  display: block;\n}\n.account-card[_ngcontent-%COMP%] {\n  max-width: 36rem;\n  margin: var(--%NS%space-16) auto 0;\n}\n.profile-error[_ngcontent-%COMP%] {\n  margin-bottom: var(--%NS%space-16);\n}\n.change-panel[_ngcontent-%COMP%] {\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-lg);\n  padding: var(--%NS%space-18) var(--%NS%space-20);\n  margin-bottom: var(--%NS%space-20);\n  background: var(--%NS%color-bg-surface);\n}\n.panel-title[_ngcontent-%COMP%] {\n  font-size: var(--%NS%text-xl);\n  margin: 0 0 var(--%NS%space-8);\n}\n.panel-copy[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-16);\n}\n.identity-values[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-12);\n}\n.identity-row[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  gap: var(--%NS%space-16);\n  padding: var(--%NS%space-8) 0;\n  border-bottom: 1px solid var(--%NS%color-border-subtle);\n}\n.identity-row[_ngcontent-%COMP%]   dt[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-md);\n}\n.identity-row[_ngcontent-%COMP%]   dd[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-base);\n  font-weight: var(--%NS%font-weight-semibold);\n  text-align: right;\n  overflow-wrap: anywhere;\n}\n.contact-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--%NS%space-16);\n  flex-wrap: wrap;\n  padding: var(--%NS%space-12) 0;\n  border-bottom: 1px solid var(--%NS%color-border-subtle);\n}\n.contact-row[_ngcontent-%COMP%]:last-child {\n  border-bottom: none;\n}\n.contact-row__label[_ngcontent-%COMP%] {\n  display: block;\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n.contact-row__value[_ngcontent-%COMP%] {\n  display: block;\n  font-size: var(--%NS%text-base);\n  font-weight: var(--%NS%font-weight-semibold);\n  overflow-wrap: anywhere;\n}\n.contact-chip[_ngcontent-%COMP%] {\n  white-space: nowrap;\n}\n.contact-chip--verified[_ngcontent-%COMP%] {\n  display: inline-block;\n  border: 1px solid var(--%NS%color-success-border);\n  background: var(--%NS%color-success-bg);\n  color: var(--%NS%color-success);\n  border-radius: var(--%NS%radius-full);\n  padding: var(--%NS%space-4) var(--%NS%space-10);\n  font-size: var(--%NS%text-sm);\n  font-weight: var(--%NS%font-weight-semibold);\n}\n.contact-chip--cta[_ngcontent-%COMP%] {\n  font-size: var(--%NS%text-sm);\n  padding: var(--%NS%space-6) var(--%NS%space-12);\n}\n.proof-note[_ngcontent-%COMP%] {\n  font-size: var(--%NS%text-md);\n  color: var(--%NS%color-text);\n  background: var(--%NS%color-bg-subtle);\n  border-left: 3px solid var(--%NS%color-primary);\n  padding: var(--%NS%space-8) var(--%NS%space-12);\n  border-radius: 0 var(--%NS%radius-md) var(--%NS%radius-md) 0;\n  margin: 0 0 var(--%NS%space-16);\n}\n.field-note[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n  margin: var(--%NS%space-6) 0 0;\n}\n.panel-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-10);\n  flex-wrap: wrap;\n}\n.badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  vertical-align: middle;\n}\n.badge.badge--admin[_ngcontent-%COMP%] {\n  background: var(--%NS%color-badge-user);\n  color: var(--%NS%color-shelter-user);\n}\n/*# sourceMappingURL=account-page.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassMetadata(AccountPage, [{
    type: Component2,
    args: [{ selector: "app-account-page", imports: [
      ReactiveFormsModule2,
      RouterLink2,
      BannerComponent,
      ContributionsPanel,
      TranslatePipe
    ], changeDetection: ChangeDetectionStrategy2.OnPush, template: `<section class="account-card">
  <h1 class="page-title">{{ 'title.account' | t }}</h1>
  <p class="page-subtitle">{{ 'account.subtitle' | t }}</p>

  @if (success(); as text) {
    <app-banner severity="success" [message]="text.key | t: text.params" />
  }
  <app-banner severity="error" [message]="errorMessage()" />

  @if (auth.name() === null) {
    <div class="profile-error">
      <app-banner severity="error" [message]="'account.profileLoadError' | t" />
      <div class="panel-actions">
        <button
          type="button"
          class="btn btn--ghost"
          (click)="retryProfile()"
          [disabled]="retrying()"
        >
          {{ retrying() ? ('account.retrying' | t) : ('account.retry' | t) }}
        </button>
      </div>
    </div>
  } @else {
    <!-- ============================== Identity ============================== -->
    <section class="change-panel">
      <h2 class="panel-title">{{ 'account.identity' | t }}</h2>

      @if (!editing()) {
        <dl class="identity-values">
          <div class="identity-row">
            <dt>{{ 'account.name' | t }}</dt>
            <dd>
              {{ auth.name() }}
              <!-- Kind badge (admin-moderation D5): the admin kind
                   is the truth server-side; the store's isAdmin comes from
                   the fetched profile (always present, false for regulars). -->
              @if (auth.isAdmin()) {
                <span class="badge badge--admin">{{ 'account.adminBadge' | t }}</span>
              }
            </dd>
          </div>
        </dl>
        <p class="panel-copy">{{ 'account.identityCopy' | t }}</p>
        <div class="panel-actions">
          <button type="button" class="btn btn--ghost" (click)="startEdit()" [disabled]="busy()">
            {{ 'account.edit' | t }}
          </button>
        </div>
      } @else {
        <!-- a11y (WCAG 2.1 4.1.3, the /submit convention): every field error
             on this page is a live region (role=alert) wired to its control
             via aria-invalid + aria-describedby. @let holds the single
             condition the @if renders on, so the bindings can never
             disagree. -->
        <div class="field">
          <label for="profile-name">{{ 'account.name' | t }}</label>
          @let nameInvalid = editName.touched && editName.invalid;
          <input
            id="profile-name"
            type="text"
            [formControl]="editName"
            autocomplete="name"
            [attr.aria-invalid]="nameInvalid ? 'true' : null"
            [attr.aria-describedby]="nameInvalid ? 'profile-name-error' : null"
          />
          @if (nameInvalid) {
            <p class="field-error" id="profile-name-error" role="alert">
              {{ 'account.nameRequired' | t }}
            </p>
          }
        </div>

        <div class="field">
          <label for="profile-password">{{ 'account.currentPassword' | t }}</label>
          @let currentPasswordInvalid = editPassword.touched && editPassword.invalid;
          <input
            id="profile-password"
            type="password"
            [formControl]="editPassword"
            autocomplete="current-password"
            [attr.aria-invalid]="currentPasswordInvalid ? 'true' : null"
            [attr.aria-describedby]="currentPasswordInvalid ? 'profile-password-error' : null"
          />
          @if (currentPasswordInvalid) {
            <p class="field-error" id="profile-password-error" role="alert">
              {{ 'account.passwordRequired' | t }}
            </p>
          }
        </div>

        <div class="panel-actions">
          <button
            type="button"
            class="btn btn--primary"
            (click)="saveProfile()"
            [disabled]="busy()"
          >
            {{ busy() ? ('account.saving' | t) : ('account.save' | t) }}
          </button>
          <button type="button" class="btn btn--ghost" (click)="cancelEdit()" [disabled]="busy()">
            {{ 'account.cancel' | t }}
          </button>
        </div>
      }
    </section>

    <!-- ============================== Contacts ============================== -->
    <section class="change-panel">
      <h2 class="panel-title">{{ 'account.contacts' | t }}</h2>

      <div class="contact-row">
        <div class="contact-row__info">
          <span class="contact-row__label">{{ 'account.emailLabel' | t }}</span>
          <span class="contact-row__value">{{ auth.email() }}</span>
        </div>
        @if (verified('EMAIL')) {
          <span class="contact-chip contact-chip--verified">{{ 'account.verified' | t }}</span>
        } @else {
          <a routerLink="/verify" class="btn btn--ghost contact-chip contact-chip--cta">
            {{ 'account.completeVerification' | t }}
          </a>
        }
      </div>

      <div class="contact-row">
        <div class="contact-row__info">
          <span class="contact-row__label">{{ 'account.phoneLabel' | t }}</span>
          <span class="contact-row__value">{{ auth.phone() }}</span>
        </div>
        @if (verified('PHONE')) {
          <span class="contact-chip contact-chip--verified">{{ 'account.verified' | t }}</span>
        } @else {
          <a routerLink="/verify" class="btn btn--ghost contact-chip contact-chip--cta">
            {{ 'account.completeVerification' | t }}
          </a>
        }
      </div>
    </section>

    <!-- ============================== Email change ============================== -->
    <section class="change-panel">
      <h2 class="panel-title">{{ 'account.changeEmail' | t }}</h2>

      @if (emailPhase() === 'done') {
        <p class="panel-copy">
          {{ 'account.emailDone.before' | t }} <strong>{{ auth.email() }}</strong
          >{{ 'account.emailDone.after' | t }}
        </p>
        <button type="button" class="btn btn--ghost" (click)="emailStartOver()">
          {{ 'account.changeAgain' | t }}
        </button>
      } @else {
        <div class="field">
          <label for="change-email-new">{{ 'account.newEmail' | t }}</label>
          <!-- The target locks in the code phase via the control's own
               disabled state (emailSend) \u2014 FormControlDirective swallows a
               [disabled] property binding, so the control state IS the DOM. -->
          @let newEmailInvalid = newEmail.touched && newEmail.invalid;
          <input
            id="change-email-new"
            type="email"
            [formControl]="newEmail"
            maxlength="255"
            autocomplete="email"
            [placeholder]="'account.newEmailPlaceholder' | t"
            [attr.aria-invalid]="newEmailInvalid ? 'true' : null"
            [attr.aria-describedby]="newEmailInvalid ? 'change-email-new-error' : null"
          />
          @if (newEmailInvalid) {
            <p class="field-error" id="change-email-new-error" role="alert">
              {{
                newEmail.errors?.['maxlength']
                  ? ('account.emailTooLong' | t)
                  : ('account.emailRequired' | t)
              }}
            </p>
          }
        </div>

        <p class="proof-note">{{ 'account.emailProof' | t }}</p>

        @if (emailPhase() === 'code') {
          <div class="field">
            <label for="change-email-code">{{ 'account.smsCode' | t }}</label>
            @let emailCodeInvalid = emailCode.touched && emailCode.invalid;
            <input
              id="change-email-code"
              type="text"
              [formControl]="emailCode"
              autocomplete="one-time-code"
              inputmode="numeric"
              [placeholder]="'account.codePlaceholder' | t"
              [attr.aria-invalid]="emailCodeInvalid ? 'true' : null"
              [attr.aria-describedby]="emailCodeInvalid ? 'change-email-code-error' : null"
            />
            @if (emailCodeInvalid) {
              <p class="field-error" id="change-email-code-error" role="alert">
                {{ 'account.smsCodeRequired' | t }}
              </p>
            }
            <p class="field-note">{{ 'account.smsSentHint' | t }}</p>
          </div>

          <div class="panel-actions">
            <button
              type="button"
              class="btn btn--primary"
              (click)="emailConfirm()"
              [disabled]="busy()"
            >
              {{ busy() ? ('account.working' | t) : ('account.confirmNewEmail' | t) }}
            </button>
            <button
              type="button"
              class="btn btn--ghost"
              (click)="emailResend()"
              [disabled]="busy() || emailCountdown.active"
            >
              {{
                emailCountdown.active
                  ? ('account.resendIn' | t: { time: emailCountdown.label() })
                  : ('account.resendCode' | t)
              }}
            </button>
            <button
              type="button"
              class="btn btn--ghost"
              (click)="emailStartOver()"
              [disabled]="busy()"
            >
              {{ 'account.cancel' | t }}
            </button>
          </div>
        } @else {
          <button
            type="button"
            class="btn btn--primary"
            (click)="emailSend()"
            [disabled]="busy() || emailCountdown.active"
          >
            {{
              busy()
                ? ('account.sending' | t)
                : emailCountdown.active
                  ? ('account.sendIn' | t: { time: emailCountdown.label() })
                  : ('account.sendSmsToPhone' | t)
            }}
          </button>
        }
      }
    </section>

    <!-- ============================== Phone change ============================== -->
    <section class="change-panel">
      <h2 class="panel-title">{{ 'account.changePhone' | t }}</h2>

      @if (phonePhase() === 'done') {
        <p class="panel-copy">
          {{ 'account.phoneDone.before' | t }} <strong>{{ auth.phone() }}</strong
          >{{ 'account.phoneDone.after' | t }}
        </p>
        <button type="button" class="btn btn--ghost" (click)="phoneStartOver()">
          {{ 'account.changeAgain' | t }}
        </button>
      } @else {
        <div class="field">
          <label for="change-phone-new">{{ 'account.newPhone' | t }}</label>
          <!-- Locked in the code phase via the control's disabled state (phoneSend). -->
          @let newPhoneInvalid = newPhone.touched && newPhone.invalid;
          <input
            id="change-phone-new"
            type="tel"
            [formControl]="newPhone"
            maxlength="64"
            autocomplete="tel"
            [placeholder]="'account.newPhonePlaceholder' | t"
            [attr.aria-invalid]="newPhoneInvalid ? 'true' : null"
            [attr.aria-describedby]="newPhoneInvalid ? 'change-phone-new-error' : null"
          />
          @if (newPhoneInvalid) {
            <p class="field-error" id="change-phone-new-error" role="alert">
              {{
                newPhone.errors?.['maxlength']
                  ? ('account.phoneTooLong' | t)
                  : ('account.phoneRequired' | t)
              }}
            </p>
          }
        </div>

        <p class="proof-note">{{ 'account.phoneProof' | t }}</p>

        @if (phonePhase() === 'code') {
          <div class="field">
            <label for="change-phone-code">{{ 'account.emailCode' | t }}</label>
            @let phoneCodeInvalid = phoneCode.touched && phoneCode.invalid;
            <input
              id="change-phone-code"
              type="text"
              [formControl]="phoneCode"
              autocomplete="one-time-code"
              inputmode="numeric"
              [placeholder]="'account.codePlaceholder' | t"
              [attr.aria-invalid]="phoneCodeInvalid ? 'true' : null"
              [attr.aria-describedby]="phoneCodeInvalid ? 'change-phone-code-error' : null"
            />
            @if (phoneCodeInvalid) {
              <p class="field-error" id="change-phone-code-error" role="alert">
                {{ 'account.emailCodeRequired' | t }}
              </p>
            }
            <p class="field-note">{{ 'account.emailCodeSentHint' | t }}</p>
          </div>

          <div class="panel-actions">
            <button
              type="button"
              class="btn btn--primary"
              (click)="phoneConfirm()"
              [disabled]="busy()"
            >
              {{ busy() ? ('account.working' | t) : ('account.confirmNewPhone' | t) }}
            </button>
            <button
              type="button"
              class="btn btn--ghost"
              (click)="phoneResend()"
              [disabled]="busy() || phoneCountdown.active"
            >
              {{
                phoneCountdown.active
                  ? ('account.resendIn' | t: { time: phoneCountdown.label() })
                  : ('account.resendCode' | t)
              }}
            </button>
            <button
              type="button"
              class="btn btn--ghost"
              (click)="phoneStartOver()"
              [disabled]="busy()"
            >
              {{ 'account.cancel' | t }}
            </button>
          </div>
        } @else {
          <button
            type="button"
            class="btn btn--primary"
            (click)="phoneSend()"
            [disabled]="busy() || phoneCountdown.active"
          >
            {{
              busy()
                ? ('account.sending' | t)
                : phoneCountdown.active
                  ? ('account.sendIn' | t: { time: phoneCountdown.label() })
                  : ('account.sendEmailCode' | t)
            }}
          </button>
        }
      }
    </section>

    <!-- ============================== My contributions ============================== -->
    <section class="change-panel">
      <h2 class="panel-title">{{ 'account.contributions' | t }}</h2>
      <p class="panel-copy">{{ 'account.contributionsCopy' | t }}</p>
      <app-contributions-panel />
    </section>

    <!-- ================================= Your data ================================ -->
    <section class="change-panel">
      <h2 class="panel-title">{{ 'account.yourData' | t }}</h2>
      <p class="panel-copy">{{ 'account.dataCopy' | t }}</p>
      <button
        type="button"
        id="download-data"
        class="btn btn--ghost"
        (click)="downloadData()"
        [disabled]="busy()"
      >
        {{ busy() ? ('account.preparing' | t) : ('account.downloadData' | t) }}
      </button>
    </section>

    <!-- ================================= Delete account ================================ -->
    <section class="change-panel">
      <h2 class="panel-title">{{ 'account.delete' | t }}</h2>
      @if (auth.isAdmin()) {
        <!-- The env-provisioned administrator (kind ADMIN \u2014 the store's
             isAdmin comes from the fetched profile): this account is the
             deployment's access path, so the delete controls are ABSENT on
             purpose. The server enforces it (DELETE /account answers 403
             with the same reason) \u2014 this explanation tells the operator
             why the controls are missing and what to do instead. -->
        <p class="panel-copy">{{ 'account.delete.adminCopy' | t }}</p>
      } @else {
        <p class="panel-copy">{{ 'account.delete.copy' | t }}</p>
        <div class="field">
          <label for="delete-confirm">{{ 'account.delete.typeHint' | t }}</label>
          <input
            id="delete-confirm"
            type="text"
            [formControl]="deleteConfirm"
            autocomplete="off"
            placeholder="DELETE"
          />
        </div>
        <!-- The armed state is a live region: a button that
             merely enables is not reliably announced, and the shared
             ConfirmAction keeps focus in the input (the typed word IS the step). -->
        @if (accountDeleteConfirm.isArmed(accountDeleteKey)) {
          <p class="field-note" role="status">{{ 'account.delete.armed' | t }}</p>
        }
        <div class="panel-actions">
          <button
            type="button"
            id="delete-account"
            class="btn btn--ghost btn--danger"
            (click)="deleteAccount()"
            [disabled]="busy() || !accountDeleteConfirm.isArmed(accountDeleteKey)"
          >
            {{ busy() ? ('account.deleting' | t) : ('account.delete.button' | t) }}
          </button>
        </div>
      }
    </section>

    <!-- ============================== Legal (Workstream A) ============================== -->
    <section class="change-panel">
      <h2 class="panel-title">{{ 'account.legal' | t }}</h2>
      <p class="panel-copy">
        {{ 'account.legal.lead' | t }}
        <a routerLink="/privacy">{{ 'authPage.privacyPolicy' | t }}</a>
        {{ 'account.legal.and' | t }}
        <a routerLink="/terms">{{ 'authPage.termsOfUse' | t }}</a
        >{{ 'account.legal.tail' | t }}
      </p>
    </section>
  }
</section>
`, styles: ['@charset "UTF-8";\n\n/* src/app/features/account/account-page.scss */\n:host {\n  display: block;\n}\n.account-card {\n  max-width: 36rem;\n  margin: var(--space-16) auto 0;\n}\n.profile-error {\n  margin-bottom: var(--space-16);\n}\n.change-panel {\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n  padding: var(--space-18) var(--space-20);\n  margin-bottom: var(--space-20);\n  background: var(--color-bg-surface);\n}\n.panel-title {\n  font-size: var(--text-xl);\n  margin: 0 0 var(--space-8);\n}\n.panel-copy {\n  margin: 0 0 var(--space-16);\n}\n.identity-values {\n  margin: 0 0 var(--space-12);\n}\n.identity-row {\n  display: flex;\n  justify-content: space-between;\n  gap: var(--space-16);\n  padding: var(--space-8) 0;\n  border-bottom: 1px solid var(--color-border-subtle);\n}\n.identity-row dt {\n  color: var(--color-muted);\n  font-size: var(--text-md);\n}\n.identity-row dd {\n  margin: 0;\n  font-size: var(--text-base);\n  font-weight: var(--font-weight-semibold);\n  text-align: right;\n  overflow-wrap: anywhere;\n}\n.contact-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--space-16);\n  flex-wrap: wrap;\n  padding: var(--space-12) 0;\n  border-bottom: 1px solid var(--color-border-subtle);\n}\n.contact-row:last-child {\n  border-bottom: none;\n}\n.contact-row__label {\n  display: block;\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n.contact-row__value {\n  display: block;\n  font-size: var(--text-base);\n  font-weight: var(--font-weight-semibold);\n  overflow-wrap: anywhere;\n}\n.contact-chip {\n  white-space: nowrap;\n}\n.contact-chip--verified {\n  display: inline-block;\n  border: 1px solid var(--color-success-border);\n  background: var(--color-success-bg);\n  color: var(--color-success);\n  border-radius: var(--radius-full);\n  padding: var(--space-4) var(--space-10);\n  font-size: var(--text-sm);\n  font-weight: var(--font-weight-semibold);\n}\n.contact-chip--cta {\n  font-size: var(--text-sm);\n  padding: var(--space-6) var(--space-12);\n}\n.proof-note {\n  font-size: var(--text-md);\n  color: var(--color-text);\n  background: var(--color-bg-subtle);\n  border-left: 3px solid var(--color-primary);\n  padding: var(--space-8) var(--space-12);\n  border-radius: 0 var(--radius-md) var(--radius-md) 0;\n  margin: 0 0 var(--space-16);\n}\n.field-note {\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n  margin: var(--space-6) 0 0;\n}\n.panel-actions {\n  display: flex;\n  gap: var(--space-10);\n  flex-wrap: wrap;\n}\n.badge {\n  display: inline-block;\n  vertical-align: middle;\n}\n.badge.badge--admin {\n  background: var(--color-badge-user);\n  color: var(--color-shelter-user);\n}\n/*# sourceMappingURL=account-page.css.map */\n'] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassDebugInfo(AccountPage, { className: "AccountPage", filePath: "src/app/features/account/account-page.ts", lineNumber: 91 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Faccount%2Faccount-page.ts%40AccountPage";
  function AccountPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i02.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i02.\u0275\u0275replaceMetadata(AccountPage, m.default, [i02, i12], [ReactiveFormsModule2, RouterLink2, BannerComponent, ContributionsPanel, TranslatePipe, Component2, ChangeDetectionStrategy2], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && AccountPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && AccountPage_HmrLoad(d.timestamp)));
})();
export {
  AccountPage
};
//# debugId=99c7aa31-0db3-5931-930d-08f52a77bf12


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZmVhdHVyZXMvYWNjb3VudC9hY2NvdW50LXBhZ2UudHMiLCJzcmMvYXBwL2ZlYXR1cmVzL2FjY291bnQvYWNjb3VudC1wYWdlLmh0bWwiLCJzcmMvYXBwL2ZlYXR1cmVzL2FjY291bnQvY29udHJpYnV0aW9ucy1wYW5lbC50cyIsInNyYy9hcHAvZmVhdHVyZXMvYWNjb3VudC9jb250cmlidXRpb25zLXBhbmVsLmh0bWwiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENoYW5nZURldGVjdG9yUmVmLFxuICBDb21wb25lbnQsXG4gIEVsZW1lbnRSZWYsXG4gIGluamVjdCxcbiAgT25EZXN0cm95LFxuICBzaWduYWwsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgdG9PYnNlcnZhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZS9yeGpzLWludGVyb3AnO1xuaW1wb3J0IHsgRm9ybUNvbnRyb2wsIFJlYWN0aXZlRm9ybXNNb2R1bGUsIFZhbGlkYXRvcnMgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQgeyBSb3V0ZXIsIFJvdXRlckxpbmsgfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHsgc2tpcCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgQXBpRXJyb3IsIHRvQXBpRXJyb3IgfSBmcm9tICcuLi8uLi9jb3JlL2FwaS1lcnJvcic7XG5pbXBvcnQgeyBJMThuU2VydmljZSB9IGZyb20gJy4uLy4uL2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnO1xuaW1wb3J0IHR5cGUgeyBNZXNzYWdlS2V5IH0gZnJvbSAnLi4vLi4vY29yZS9pMThuL21lc3NhZ2VzJztcbmltcG9ydCB7IFRyYW5zbGF0ZVBpcGUgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vdHJhbnNsYXRlLXBpcGUnO1xuaW1wb3J0IHsgQXV0aFN0b3JlIH0gZnJvbSAnLi4vLi4vc2Vzc2lvbi9hdXRoLXN0b3JlJztcbmltcG9ydCB7IEFjY291bnRHYXRld2F5IH0gZnJvbSAnLi4vLi4vZ2F0ZXdheXMvYWNjb3VudC1nYXRld2F5JztcbmltcG9ydCB7IENvbnRyaWJ1dGlvbnNQYW5lbCB9IGZyb20gJy4vY29udHJpYnV0aW9ucy1wYW5lbCc7XG5pbXBvcnQgeyBCYW5uZXJDb21wb25lbnQgfSBmcm9tICcuLi8uLi9zaGFyZWQvYmFubmVyLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBDb25maXJtQWN0aW9uIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2NvbmZpcm0tYWN0aW9uJztcbmltcG9ydCB7IGJhbm5lck1lc3NhZ2UsIHR5cGUgRXJyb3JLaW5kIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Vycm9yLWNvcHknO1xuaW1wb3J0IHsgQ09ERV9TSVhfRElHSVRTIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2Zvcm0taGVscGVycyc7XG5pbXBvcnQgeyBSZXNlbmRDb3VudGRvd24gfSBmcm9tICcuLi8uLi9zaGFyZWQvcmVzZW5kLWNvdW50ZG93bic7XG5pbXBvcnQgdHlwZSB7IFZlcmlmaWNhdGlvbkxldmVsIH0gZnJvbSAnLi4vLi4vY29yZS9tb2RlbHMnO1xuXG50eXBlIENoYW5nZVBoYXNlID0gJ2Zvcm0nIHwgJ2NvZGUnIHwgJ2RvbmUnO1xuXG4vKiogQSBzdWNjZXNzIGJhbm5lcjogdGhlIGNhdGFsb2cgS0VZIChub3QgYSBjYXB0dXJlZCBzdHJpbmcpIHNvIGEgbGFuZ3VhZ2VcbiAqICBzd2l0Y2ggcmUtcmVuZGVycyBpdCBpbiB0aGUgbmV3IGxhbmd1YWdlICh0aGUgdGVtcGxhdGUgYXBwbGllcyBgfCB0YCkuICovXG5pbnRlcmZhY2UgU3VjY2Vzc05vdGUge1xuICBrZXk6IE1lc3NhZ2VLZXk7XG4gIHBhcmFtcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlcj47XG59XG5cbi8qKiBBIHBlbmRpbmcgZXJyb3IgYmFubmVyOiB0aGUgUkFXIGVycm9yICsgaXRzIGtpbmQsIHJlLWRlcml2ZWQgdGhyb3VnaFxuICogIGJhbm5lck1lc3NhZ2UoKSBhdCByZW5kZXIgdGltZSDigJQgdGhlIGNsaWVudC1hdXRob3JlZCBjb3B5IGlzIHNlcnZlZFxuICogIHRocm91Z2ggdGhlIGFjdGl2ZSBsb2NhbGUgKHNlcnZlci1wcm92aWRlZCBtZXNzYWdlcyBhcmUgZWNob2VkIGFzLWlzKS4gKi9cbmludGVyZmFjZSBQZW5kaW5nRXJyb3Ige1xuICBlcnJvcjogdW5rbm93bjtcbiAga2luZDogRXJyb3JLaW5kO1xuICAvKiogQSBmb3JjZWQgY2xpZW50IGtleSBmb3IgdGhlIHBhZ2UncyBzcGVjaWFsIGNhc2UgKDQwMCBcInNhbWUgdmFsdWVcIikuICovXG4gIGNvcHk/OiBNZXNzYWdlS2V5O1xufVxuXG4vKipcbiAqIC9hY2NvdW50IChBdXRoR3VhcmQpIOKAlCB0aGUgZnVsbCBwcm9maWxlIHBhZ2UgKDA0LUNPTlRFWFQtQUNDT1VOVC1WRVJJRlkubWQsXG4gKiAwMyBwdW1sKTpcbiAqICAtIElERU5USVRZOiBuYW1lIHdpdGggYSBwYXNzd29yZC1jb25maXJtZWQgaW5saW5lIGVkaXQgZm9ybSAobm8gbmF0aW9uYWxcbiAqICAgIElEIGNvZGUgaXMgY29sbGVjdGVkIGFueXdoZXJlIOKAlCByZW1vdmUtbmF0aW9uYWwtaWQpXG4gKiAgLSBDT05UQUNUUzogZW1haWwgKyBwaG9uZSByb3dzIHNob3dpbmcgdGhlIFJFQUwgdmFsdWUgZnJvbSB0aGUgZmV0Y2hlZFxuICogICAgcHJvZmlsZSwgYSB2ZXJpZmllZCBsYWJlbCB3aGVuIHRoZSBsZXZlbCBpcyBpbiB0aGUgcmVhbCBjbGFpbSBzZXQsIG9yIGFcbiAqICAgIFwiQ29tcGxldGUgdmVyaWZpY2F0aW9uXCIgQ1RBIGRlZXAtbGlua2luZyAvdmVyaWZ5XG4gKiAgLSBDSEFOR0UgUEFORUxTOiB0aGUgY3Jvc3MtY2hhbm5lbCBlbWFpbC9waG9uZSBjaGFuZ2UgZmxvd3MuXG4gKiAgLSBNWSBDT05UUklCVVRJT05TICh1c2VyLWNvbnRyaWJ1dGlvbnMpOiB0aGUgY2FsbGVyJ3Mgb3duIHNoZWx0ZXJzIGluIG9uZVxuICogICAgcGFuZWwg4oCUIGlubGluZSBlZGl0ICsgdHdvLXN0ZXAgZGVsZXRlIChDb250cmlidXRpb25zUGFuZWwsIGl0cyBvd25cbiAqICAgIGxvYWRpbmcvZW1wdHkvZXJyb3Igc3RhdGUpLiBUaGVyZSBpcyBubyByZXZpZXdzIGxpc3Qg4oCUIHRoZSBhcHAgaGFzIG5vXG4gKiAgICByZXZpZXcgbW9kZWwuXG4gKlxuICogQWxsIHZhbHVlcyBjb21lIGZyb20gdGhlIFJFQUwgcHJvZmlsZSBpbiBBdXRoU3RvcmUgKEdFVCAvYWNjb3VudC9tZSxcbiAqIGZldGNoZWQgYXQgYm9vdC9sb2dpbikuIEFmdGVyIGFueSBjbGFpbXMtY2hhbmdpbmcgZXZlbnQgKGNvbnRhY3QgY2hhbmdlKSBvclxuICogYSBwcm9maWxlIGVkaXQgdGhlIHBhZ2UgY2FsbHMgYHJlZnJlc2hQcm9maWxlKClgLCBzbyBsYWJlbHMgYW5kIHZhbHVlcyBhcmVcbiAqIGFsd2F5cyBzZXJ2ZXIgc3RhdGUg4oCUIG5vIHNlc3Npb24tb25seSBjb3B5IG9mIGEgdmFsdWUuXG4gKlxuICogQ3Jvc3MtY2hhbm5lbCBydWxlIChiYWNrZW5kLWVuZm9yY2VkLCBtaXJyb3JlZCBpbiB0aGUgY29weSDigJQgbmV2ZXJcbiAqIHJlLWltcGxlbWVudGVkKTogY2hhbmdpbmcgRU1BSUwgaXMgcHJvdmVuIGJ5IGFuIFNNUyBjb2RlIHRvIHRoZSBDVVJSRU5UXG4gKiBwaG9uZTsgY2hhbmdpbmcgUEhPTkUgYnkgYW4gZW1haWwgY29kZSB0byB0aGUgQ1VSUkVOVCBlbWFpbC5cbiAqXG4gKiBTZXNzaW9ucyBzdXJ2aXZlIGEgY29udGFjdCBjaGFuZ2UgKG9ubHkgYSBwYXNzd29yZCByZXNldCByZXZva2VzIHJlZnJlc2hcbiAqIHRva2Vucykg4oCUIG5vdGhpbmcgaGVyZSBsb2dzIHRoZSB1c2VyIG91dC5cbiAqXG4gKiBSZXNlbmQgY29vbGRvd25zOiBvbmUgY291bnRkb3duIHBlciBjaGFuZ2UgdHlwZSAoZS1tYWlsIHZzIHBob25lIGFyZVxuICogaW5kZXBlbmRlbnQpLiBBIHN1Y2Nlc3NmdWwgcmVxdWVzdCBydW5zIGl0IGZyb20gdGhlIGFjayBib2R5OyBhIGNvb2xkb3duXG4gKiA0MjkgcnVucyBpdCBmcm9tIFJldHJ5LUFmdGVyLiBUaGUgc2VuZC9yZXNlbmQgYnV0dG9ucyBzaG93IHRoZSBsaXZlIGxhYmVsXG4gKiBhbmQgc3RheSBkaXNhYmxlZCB1bnRpbCBpdCBleHBpcmVzIOKAlCBubyBzcGFtLWNsaWNrcyBpbnRvIGEgYmFyZSA0MjkuXG4gKi9cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FwcC1hY2NvdW50LXBhZ2UnLFxuICBpbXBvcnRzOiBbXG4gICAgUmVhY3RpdmVGb3Jtc01vZHVsZSxcbiAgICBSb3V0ZXJMaW5rLFxuICAgIEJhbm5lckNvbXBvbmVudCxcbiAgICBDb250cmlidXRpb25zUGFuZWwsXG4gICAgVHJhbnNsYXRlUGlwZSxcbiAgXSxcbiAgdGVtcGxhdGVVcmw6ICcuL2FjY291bnQtcGFnZS5odG1sJyxcbiAgc3R5bGVVcmw6ICcuL2FjY291bnQtcGFnZS5zY3NzJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIEFjY291bnRQYWdlIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSByZWFkb25seSBhY2NvdW50ID0gaW5qZWN0KEFjY291bnRHYXRld2F5KTtcbiAgcHJpdmF0ZSByZWFkb25seSBob3N0ID0gaW5qZWN0PEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+PihFbGVtZW50UmVmKTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGF1dGggPSBpbmplY3QoQXV0aFN0b3JlKTtcbiAgcHJpdmF0ZSByZWFkb25seSByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcbiAgLyoqIGkxOG4tZXQtZW46IHRoZSBhY2NvdW50IHN1cmZhY2UgaXMgZnVsbHkgY2F0YWxvZy1kcml2ZW4gKHwgdCBwaXBlcyArXG4gICAqICBrZXktYmFzZWQgYmFubmVycyksIHNvIGEgc3dpdGNoZXIgY2hhbmdlIG11c3QgcmUtcmVuZGVyIHRoZSB3aG9sZSBwYWdlLlxuICAgKiAgVGhlIHByb2ZpbGUgZGF0YSBpdHNlbGYgaXMgTk9UIGxvY2FsZS1zY29wZWQgKG5vIHJlLWZldGNoIG5lZWRlZCkuICovXG4gIHJlYWRvbmx5IGkxOG4gPSBpbmplY3QoSTE4blNlcnZpY2UpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNkciA9IGluamVjdChDaGFuZ2VEZXRlY3RvclJlZik7XG5cbiAgLyoqIFRoZSBsYW5ndWFnZSBzd2l0Y2hlciBzZXRzIEkxOG5TZXJ2aWNlLmxvY2FsZTogcmUtZGVyaXZlIHRoZSBzdG9yZWRcbiAgICogIGJhbm5lcnMgKGtleSArIHJhdyBlcnJvcikgYW5kIHJlLXJlbmRlciBldmVyeSB8IHQgbGFiZWwuIHRvT2JzZXJ2YWJsZVxuICAgKiAgZW1pdHMgdGhlIENVUlJFTlQgdmFsdWUgb24gc3Vic2NyaWJlLCBzbyBza2lwKDEpIOKAlCBvbmx5IGEgcmVhbCBzd2l0Y2hcbiAgICogIHRyaWdnZXJzIGl0ICh0aGUgZ3VpZGFuY2UtcGFnZSBpZGlvbSkuIFVuc3Vic2NyaWJlZCBpbiBuZ09uRGVzdHJveS4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSBsb2NhbGVTdWIgPSB0b09ic2VydmFibGUodGhpcy5pMThuLmxvY2FsZSlcbiAgICAucGlwZShza2lwKDEpKVxuICAgIC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5jZHIubWFya0ZvckNoZWNrKCkpO1xuXG4gIC8vIC0tLS0gaWRlbnRpdHkgc2VjdGlvbiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qKiBUcnVlIHdoaWxlIHRoZSBwYXNzd29yZC1jb25maXJtZWQgZWRpdCBmb3JtIGlzIG9wZW4uICovXG4gIHByb3RlY3RlZCByZWFkb25seSBlZGl0aW5nID0gc2lnbmFsKGZhbHNlKTtcblxuICAvKiogTmV3LXZhbHVlIGNvbnRyb2xzIGFyZSBwdWJsaWMgc28gc3BlY3MgY2FuIGRyaXZlIHRoZW0gKHBhZ2UgY29udmVudGlvbjpcbiAgICogIGZvcm1zIHB1YmxpYywgc2lnbmFscyBwcm90ZWN0ZWQgKyBhc3NlcnRlZCB2aWEgdGhlIERPTSkuICovXG4gIHJlYWRvbmx5IGVkaXROYW1lID0gbmV3IEZvcm1Db250cm9sKCcnLCB7XG4gICAgbm9uTnVsbGFibGU6IHRydWUsXG4gICAgdmFsaWRhdG9yczogW1ZhbGlkYXRvcnMucmVxdWlyZWRdLFxuICB9KTtcbiAgcmVhZG9ubHkgZWRpdFBhc3N3b3JkID0gbmV3IEZvcm1Db250cm9sKCcnLCB7XG4gICAgbm9uTnVsbGFibGU6IHRydWUsXG4gICAgdmFsaWRhdG9yczogW1ZhbGlkYXRvcnMucmVxdWlyZWRdLFxuICB9KTtcblxuICAvLyAtLS0tIGVtYWlsIHNlY3Rpb24gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHByb3RlY3RlZCByZWFkb25seSBlbWFpbFBoYXNlID0gc2lnbmFsPENoYW5nZVBoYXNlPignZm9ybScpO1xuICByZWFkb25seSBuZXdFbWFpbCA9IG5ldyBGb3JtQ29udHJvbCgnJywge1xuICAgIG5vbk51bGxhYmxlOiB0cnVlLFxuICAgIC8vIHJlcXVpcmVkICsgZW1haWwgKyB0aGUgYmFja2VuZCdzIEBTaXplKG1heD0yNTUpIGNhcDogd2l0aCB0aGVzZSBpblxuICAgIC8vIHBsYWNlLCB0aGUgT05MWSA0MDAgdGhlIGJhY2tlbmQgY2FuIHN0aWxsIGFuc3dlciBhdCB0aGUgcmVxdWVzdFxuICAgIC8vIHBoYXNlIGlzIFwic2FtZSBhcyBjdXJyZW50IHZhbHVlXCIgKG1pcnJvcnMgdGhlIHJlZ2lzdGVyL3N1Ym1pdCBmb3JtcykuXG4gICAgdmFsaWRhdG9yczogW1ZhbGlkYXRvcnMucmVxdWlyZWQsIFZhbGlkYXRvcnMuZW1haWwsIFZhbGlkYXRvcnMubWF4TGVuZ3RoKDI1NSldLFxuICB9KTtcbiAgcmVhZG9ubHkgZW1haWxDb2RlID0gbmV3IEZvcm1Db250cm9sKCcnLCB7XG4gICAgbm9uTnVsbGFibGU6IHRydWUsXG4gICAgdmFsaWRhdG9yczogW1ZhbGlkYXRvcnMucmVxdWlyZWQsIFZhbGlkYXRvcnMucGF0dGVybihDT0RFX1NJWF9ESUdJVFMpXSxcbiAgfSk7XG5cbiAgLy8gLS0tLSBwaG9uZSBzZWN0aW9uIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcGhvbmVQaGFzZSA9IHNpZ25hbDxDaGFuZ2VQaGFzZT4oJ2Zvcm0nKTtcbiAgcmVhZG9ubHkgbmV3UGhvbmUgPSBuZXcgRm9ybUNvbnRyb2woJycsIHtcbiAgICBub25OdWxsYWJsZTogdHJ1ZSxcbiAgICAvLyByZXF1aXJlZCArIHRoZSBiYWNrZW5kJ3MgQFNpemUobWF4PTY0KSBjYXAgKHNhbWUgY29udmVudGlvbiBhcyBhYm92ZSkuXG4gICAgdmFsaWRhdG9yczogW1ZhbGlkYXRvcnMucmVxdWlyZWQsIFZhbGlkYXRvcnMubWF4TGVuZ3RoKDY0KV0sXG4gIH0pO1xuICByZWFkb25seSBwaG9uZUNvZGUgPSBuZXcgRm9ybUNvbnRyb2woJycsIHtcbiAgICBub25OdWxsYWJsZTogdHJ1ZSxcbiAgICB2YWxpZGF0b3JzOiBbVmFsaWRhdG9ycy5yZXF1aXJlZCwgVmFsaWRhdG9ycy5wYXR0ZXJuKENPREVfU0lYX0RJR0lUUyldLFxuICB9KTtcblxuICAvLyAtLS0tIHNoYXJlZCBVSSBzdGF0ZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHByb3RlY3RlZCByZWFkb25seSBidXN5ID0gc2lnbmFsKGZhbHNlKTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGVycm9yID0gc2lnbmFsPFBlbmRpbmdFcnJvciB8IG51bGw+KG51bGwpO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc3VjY2VzcyA9IHNpZ25hbDxTdWNjZXNzTm90ZSB8IG51bGw+KG51bGwpO1xuXG4gIC8qKiBUaGUgZXJyb3IgYmFubmVyIHRleHQsIHJlLWRlcml2ZWQgYXQgcmVuZGVyIHRpbWU6IHRoZSBmb3JjZWQgY2xpZW50XG4gICAqICBrZXkgKHRoZSByZXF1ZXN0LXBoYXNlIDQwMCBcInNhbWUgdmFsdWVcIiBjYXNlKSBvciB0aGUgaTE4bi1hd2FyZVxuICAgKiAgYmFubmVyIG1hcHBpbmcuIFJlYWRpbmcgaTE4bi50KCkgaGVyZSB0cmFja3MgdGhlIGxvY2FsZSwgc28gYSBzd2l0Y2hcbiAgICogIHJlLXJlbmRlcnMgdGhlIGJhbm5lciBpbiB0aGUgbmV3IGxhbmd1YWdlLiAqL1xuICBwcm90ZWN0ZWQgZXJyb3JNZXNzYWdlKCk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5lcnJvcigpO1xuICAgIGlmIChzdGF0ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChzdGF0ZS5jb3B5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmkxOG4udChzdGF0ZS5jb3B5KTtcbiAgICB9XG4gICAgcmV0dXJuIGJhbm5lck1lc3NhZ2Uoc3RhdGUuZXJyb3IsIHN0YXRlLmtpbmQsIChrZXkpID0+IHRoaXMuaTE4bi50KGtleSkpO1xuICB9XG5cbiAgLyoqIE9uZSBjb3VudGRvd24gcGVyIGNoYW5nZSB0eXBlIOKAlCB0aGUgZS1tYWlsIGFuZCBwaG9uZSBjb29sZG93bnMgYXJlIGluZGVwZW5kZW50LiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgZW1haWxDb3VudGRvd24gPSBuZXcgUmVzZW5kQ291bnRkb3duKCk7XG4gIHByb3RlY3RlZCByZWFkb25seSBwaG9uZUNvdW50ZG93biA9IG5ldyBSZXNlbmRDb3VudGRvd24oKTtcblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmVtYWlsQ291bnRkb3duLnN0b3AoKTtcbiAgICB0aGlzLnBob25lQ291bnRkb3duLnN0b3AoKTtcbiAgICB0aGlzLmxvY2FsZVN1Yi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgLyoqIFZlcmlmaWVkIGZvciB0aGUgbGV2ZWw/IFJlYWRzIHRoZSBSRUFMIGNsYWltIHNldCBmcm9tIHRoZSBmZXRjaGVkIHByb2ZpbGUuICovXG4gIHByb3RlY3RlZCB2ZXJpZmllZChsZXZlbDogVmVyaWZpY2F0aW9uTGV2ZWwpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5hdXRoLmxldmVscygpLmluY2x1ZGVzKGxldmVsKTtcbiAgfVxuXG4gIC8qKiBUcnVlIHdoaWxlIHRoZSBwcm9maWxlIFJldHJ5IGZldGNoIGlzIGluIGZsaWdodCAoYnV0dG9uIGZlZWRiYWNrOyB0aGVcbiAgICogIHN0b3JlJ3Mgc2luZ2xlLWZsaWdodCBhbHJlYWR5IGd1YXJkcyB0aGUgcmVxdWVzdCBpdHNlbGYpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcmV0cnlpbmcgPSBzaWduYWwoZmFsc2UpO1xuXG4gIC8qKiBSZXRyeSB0aGUgcHJvZmlsZSBmZXRjaCAoZXJyb3Igc3RhdGU6IHRoZSBib290LXRpbWUgZmV0Y2ggZmFpbGVkKS4gKi9cbiAgYXN5bmMgcmV0cnlQcm9maWxlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLnJldHJ5aW5nKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5yZXRyeWluZy5zZXQodHJ1ZSk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuYXV0aC5yZWZyZXNoUHJvZmlsZSgpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLnJldHJ5aW5nLnNldChmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZGVudGl0eTogb3BlbiB0aGUgaW5saW5lIGVkaXQgZm9ybSBwcmUtZmlsbGVkIHdpdGggdGhlIGN1cnJlbnQgdmFsdWUuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgc3RhcnRFZGl0KCk6IHZvaWQge1xuICAgIHRoaXMuZWRpdE5hbWUuc2V0VmFsdWUodGhpcy5hdXRoLm5hbWUoKSA/PyAnJyk7XG4gICAgdGhpcy5lZGl0UGFzc3dvcmQuc2V0VmFsdWUoJycpO1xuICAgIHRoaXMuZWRpdE5hbWUubWFya0FzVW50b3VjaGVkKCk7XG4gICAgdGhpcy5lZGl0UGFzc3dvcmQubWFya0FzVW50b3VjaGVkKCk7XG4gICAgdGhpcy5lZGl0aW5nLnNldCh0cnVlKTtcbiAgfVxuXG4gIGNhbmNlbEVkaXQoKTogdm9pZCB7XG4gICAgdGhpcy5lZGl0aW5nLnNldChmYWxzZSk7XG4gICAgdGhpcy5lZGl0UGFzc3dvcmQuc2V0VmFsdWUoJycpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBVVCAvYWNjb3VudC9wcm9maWxlIHtuYW1lLCBjdXJyZW50UGFzc3dvcmR9LiBUaGUgYmFja2VuZCB2ZXJpZmllcyB0aGVcbiAgICogY3VycmVudCBwYXNzd29yZCBmaXJzdCAod3JvbmcgLT4gNDAxLCBub3RoaW5nIHVwZGF0ZWQpIGFuZCB2YWxpZGF0ZXNcbiAgICogdGhlIGZpZWxkIGV4YWN0bHkgbGlrZSByZWdpc3RyYXRpb24gKGJsYW5rIC0+IDQwMCkuIE9uIHN1Y2Nlc3MgdGhlIHJlYWxcbiAgICogcHJvZmlsZSBpcyByZS1mZXRjaGVkLCBzbyB0aGUgY2FyZCBzaG93cyB0aGUgc2VydmVyIHN0YXRlLlxuICAgKi9cbiAgYXN5bmMgc2F2ZVByb2ZpbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuYnVzeSgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLmVkaXROYW1lLmludmFsaWQgfHwgdGhpcy5lZGl0UGFzc3dvcmQuaW52YWxpZCkge1xuICAgICAgdGhpcy5lZGl0TmFtZS5tYXJrQXNUb3VjaGVkKCk7XG4gICAgICB0aGlzLmVkaXRQYXNzd29yZC5tYXJrQXNUb3VjaGVkKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZXJyb3Iuc2V0KG51bGwpO1xuICAgIHRoaXMuc3VjY2Vzcy5zZXQobnVsbCk7XG4gICAgdGhpcy5idXN5LnNldCh0cnVlKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5hY2NvdW50LnVwZGF0ZVByb2ZpbGUoe1xuICAgICAgICBuYW1lOiB0aGlzLmVkaXROYW1lLnZhbHVlLFxuICAgICAgICBjdXJyZW50UGFzc3dvcmQ6IHRoaXMuZWRpdFBhc3N3b3JkLnZhbHVlLFxuICAgICAgfSk7XG4gICAgICBhd2FpdCB0aGlzLmF1dGgucmVmcmVzaFByb2ZpbGUoKTtcbiAgICAgIHRoaXMuZWRpdGluZy5zZXQoZmFsc2UpO1xuICAgICAgdGhpcy5lZGl0UGFzc3dvcmQuc2V0VmFsdWUoJycpO1xuICAgICAgdGhpcy5zdWNjZXNzLnNldCh7IGtleTogJ2FjY291bnQuc3VjY2Vzcy5wcm9maWxlVXBkYXRlZCcgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZXJyb3Iuc2V0KHsgZXJyb3IsIGtpbmQ6ICdwcm9maWxlJyB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5idXN5LnNldChmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBFbWFpbCBmbG93OiByZXF1ZXN0IChjb2RlIGJ5IFNNUyB0byB0aGUgY3VycmVudCBwaG9uZSkgLT4gY29uZmlybS5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBhc3luYyBlbWFpbFNlbmQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuYnVzeSgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLm5ld0VtYWlsLmludmFsaWQpIHtcbiAgICAgIHRoaXMubmV3RW1haWwubWFya0FzVG91Y2hlZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmVycm9yLnNldChudWxsKTtcbiAgICB0aGlzLnN1Y2Nlc3Muc2V0KG51bGwpO1xuICAgIHRoaXMuYnVzeS5zZXQodHJ1ZSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMubmV3RW1haWwudmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICBjb25zdCBhY2sgPSBhd2FpdCB0aGlzLmFjY291bnQucmVxdWVzdEVtYWlsQ2hhbmdlKHRhcmdldCk7XG4gICAgICB0aGlzLmVtYWlsQ291bnRkb3duLnN0YXJ0KGFjay5yZXNlbmRBdmFpbGFibGVBZnRlclNlY29uZHMgPz8gNjApO1xuICAgICAgdGhpcy5lbWFpbFBoYXNlLnNldCgnY29kZScpO1xuICAgICAgLy8gVGhlIGJhY2tlbmQgcGlucyB0aGUgdGFyZ2V0IGF0IHJlcXVlc3QgdGltZSDigJQgbG9jayB0aGUgdGFyZ2V0IGlucHV0XG4gICAgICAvLyBmb3IgdGhlIHJlc3Qgb2YgdGhlIGZsb3cgdmlhIHRoZSBjb250cm9sJ3MgZGlzYWJsZWQgc3RhdGVcbiAgICAgIC8vIChGb3JtQ29udHJvbERpcmVjdGl2ZSBzd2FsbG93cyBhIFtkaXNhYmxlZF0gcHJvcGVydHkgYmluZGluZykuXG4gICAgICB0aGlzLm5ld0VtYWlsLmRpc2FibGUoKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5zdGFydENvdW50ZG93bkZyb21UaHJvdHRsZShlcnJvciwgdGhpcy5lbWFpbENvdW50ZG93bik7XG4gICAgICB0aGlzLnNldENoYW5nZUVycm9yKGVycm9yKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5idXN5LnNldChmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZW1haWxDb25maXJtKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmJ1c3koKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbWFpbENvZGUuaW52YWxpZCkge1xuICAgICAgdGhpcy5lbWFpbENvZGUubWFya0FzVG91Y2hlZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmVycm9yLnNldChudWxsKTtcbiAgICB0aGlzLnN1Y2Nlc3Muc2V0KG51bGwpO1xuICAgIHRoaXMuYnVzeS5zZXQodHJ1ZSk7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRoZSBiYWNrZW5kIHN0b3JlcyB0aGUgbG93ZXJjYXNlZCBmb3JtIOKAlCBzaG93IGV4YWN0bHkgdGhhdC5cbiAgICAgIGNvbnN0IGNvbmZpcm1lZCA9IHRoaXMubmV3RW1haWwudmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICBhd2FpdCB0aGlzLmFjY291bnQuY29uZmlybUVtYWlsQ2hhbmdlKHRoaXMuZW1haWxDb2RlLnZhbHVlLnRyaW0oKSk7XG4gICAgICB0aGlzLm5ld0VtYWlsLnNldFZhbHVlKGNvbmZpcm1lZCk7XG4gICAgICAvLyBUaGUgY29udGFjdCBjaGFuZ2VkIC0+IHJlLWZldGNoIHRoZSByZWFsIHByb2ZpbGUgKHZhbHVlICsgbGFiZWxzKS5cbiAgICAgIGF3YWl0IHRoaXMuYXV0aC5yZWZyZXNoUHJvZmlsZSgpO1xuICAgICAgdGhpcy5lbWFpbFBoYXNlLnNldCgnZG9uZScpO1xuICAgICAgdGhpcy5zdWNjZXNzLnNldCh7IGtleTogJ2FjY291bnQuc3VjY2Vzcy5lbWFpbENoYW5nZWQnIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmVycm9yLnNldCh7IGVycm9yLCBraW5kOiAnYWNjb3VudCcgfSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuYnVzeS5zZXQoZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTYW1lIHJlcXVlc3QgcGF0aCBhcyB0aGUgaW5pdGlhbCBzZW5kIOKAlCB0aGUgYmFja2VuZCBlbmZvcmNlcyB0aGVcbiAgICogIHJlc2VuZCBjb29sZG93biBhbmQgYW5zd2VycyA0MjksIHdoaWNoIHdlIHN1cmZhY2UgQU5EIHJ1biBhcyB0aGVcbiAgICogIGJ1dHRvbiBjb3VudGRvd24gKG5vIHJldHJ5IHN0b3JtKS4gKi9cbiAgZW1haWxSZXNlbmQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuZW1haWxTZW5kKCk7XG4gIH1cblxuICBlbWFpbFN0YXJ0T3ZlcigpOiB2b2lkIHtcbiAgICB0aGlzLmVtYWlsUGhhc2Uuc2V0KCdmb3JtJyk7XG4gICAgLy8gQSBzdGFsZSBjb25maXJtIGVycm9yIChlLmcuIHRoZSA0MDAgYmFubmVyIGZyb20gYSB3cm9uZyBjb2RlKSBtdXN0XG4gICAgLy8gbm90IGxpbmdlciBpbiB0aGUgZnJlc2ggZm9ybSBwaGFzZS5cbiAgICB0aGlzLmVycm9yLnNldChudWxsKTtcbiAgICB0aGlzLm5ld0VtYWlsLmVuYWJsZSgpO1xuICAgIHRoaXMuZW1haWxDb2RlLnNldFZhbHVlKCcnKTtcbiAgICB0aGlzLmVtYWlsQ29kZS5tYXJrQXNVbnRvdWNoZWQoKTtcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gUGhvbmUgZmxvdzogcmVxdWVzdCAoY29kZSBieSBlbWFpbCB0byB0aGUgY3VycmVudCBhZGRyZXNzKSAtPiBjb25maXJtLlxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGFzeW5jIHBob25lU2VuZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5idXN5KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMubmV3UGhvbmUuaW52YWxpZCkge1xuICAgICAgdGhpcy5uZXdQaG9uZS5tYXJrQXNUb3VjaGVkKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZXJyb3Iuc2V0KG51bGwpO1xuICAgIHRoaXMuc3VjY2Vzcy5zZXQobnVsbCk7XG4gICAgdGhpcy5idXN5LnNldCh0cnVlKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5uZXdQaG9uZS52YWx1ZS50cmltKCk7XG4gICAgICBjb25zdCBhY2sgPSBhd2FpdCB0aGlzLmFjY291bnQucmVxdWVzdFBob25lQ2hhbmdlKHRhcmdldCk7XG4gICAgICB0aGlzLnBob25lQ291bnRkb3duLnN0YXJ0KGFjay5yZXNlbmRBdmFpbGFibGVBZnRlclNlY29uZHMgPz8gNjApO1xuICAgICAgdGhpcy5waG9uZVBoYXNlLnNldCgnY29kZScpO1xuICAgICAgLy8gU2FtZSBhcyB0aGUgZW1haWwgZmxvdyDigJQgdGhlIHRhcmdldCBpcyBwaW5uZWQgc2VydmVyLXNpZGUgYXRcbiAgICAgIC8vIHJlcXVlc3QgdGltZSBhbmQgbG9ja2VkIGNsaWVudC1zaWRlIGZvciB0aGUgcmVzdCBvZiB0aGUgZmxvdy5cbiAgICAgIHRoaXMubmV3UGhvbmUuZGlzYWJsZSgpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnN0YXJ0Q291bnRkb3duRnJvbVRocm90dGxlKGVycm9yLCB0aGlzLnBob25lQ291bnRkb3duKTtcbiAgICAgIHRoaXMuc2V0Q2hhbmdlRXJyb3IoZXJyb3IpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLmJ1c3kuc2V0KGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBwaG9uZUNvbmZpcm0oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuYnVzeSgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLnBob25lQ29kZS5pbnZhbGlkKSB7XG4gICAgICB0aGlzLnBob25lQ29kZS5tYXJrQXNUb3VjaGVkKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZXJyb3Iuc2V0KG51bGwpO1xuICAgIHRoaXMuc3VjY2Vzcy5zZXQobnVsbCk7XG4gICAgdGhpcy5idXN5LnNldCh0cnVlKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY29uZmlybWVkID0gdGhpcy5uZXdQaG9uZS52YWx1ZS50cmltKCk7XG4gICAgICBhd2FpdCB0aGlzLmFjY291bnQuY29uZmlybVBob25lQ2hhbmdlKHRoaXMucGhvbmVDb2RlLnZhbHVlLnRyaW0oKSk7XG4gICAgICB0aGlzLm5ld1Bob25lLnNldFZhbHVlKGNvbmZpcm1lZCk7XG4gICAgICAvLyBUaGUgY29udGFjdCBjaGFuZ2VkIC0+IHJlLWZldGNoIHRoZSByZWFsIHByb2ZpbGUgKHZhbHVlICsgbGFiZWxzKS5cbiAgICAgIGF3YWl0IHRoaXMuYXV0aC5yZWZyZXNoUHJvZmlsZSgpO1xuICAgICAgdGhpcy5waG9uZVBoYXNlLnNldCgnZG9uZScpO1xuICAgICAgdGhpcy5zdWNjZXNzLnNldCh7IGtleTogJ2FjY291bnQuc3VjY2Vzcy5waG9uZUNoYW5nZWQnIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmVycm9yLnNldCh7IGVycm9yLCBraW5kOiAnYWNjb3VudCcgfSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuYnVzeS5zZXQoZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIHBob25lUmVzZW5kKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLnBob25lU2VuZCgpO1xuICB9XG5cbiAgcGhvbmVTdGFydE92ZXIoKTogdm9pZCB7XG4gICAgdGhpcy5waG9uZVBoYXNlLnNldCgnZm9ybScpO1xuICAgIC8vIFNhbWUgYXMgZW1haWxTdGFydE92ZXIg4oCUIGNsZWFyIHRoZSBzdGFsZSBlcnJvciBiYW5uZXIuXG4gICAgdGhpcy5lcnJvci5zZXQobnVsbCk7XG4gICAgdGhpcy5uZXdQaG9uZS5lbmFibGUoKTtcbiAgICB0aGlzLnBob25lQ29kZS5zZXRWYWx1ZSgnJyk7XG4gICAgdGhpcy5waG9uZUNvZGUubWFya0FzVW50b3VjaGVkKCk7XG4gIH1cblxuICAvKipcbiAgICogUmVxdWVzdC1waGFzZSBmYWlsdXJlczogdGhlIGNsaWVudCB2YWxpZGF0b3JzIChyZXF1aXJlZCArIGVtYWlsIGZvcm1hdFxuICAgKiArIHRoZSBiYWNrZW5kLW1pcnJvcmVkIGxlbmd0aCBjYXBzLCAyNTUvNjQpIGFscmVhZHkgYmxvY2sgZXZlcnl0aGluZ1xuICAgKiB0aGUgYmFja2VuZCByZWplY3RzIHdpdGggNDAwIEVYQ0VQVCB0aGUgXCJzYW1lIGFzIGN1cnJlbnQgdmFsdWVcIiBjYXNlIOKAlFxuICAgKiBnaXZlIHRoYXQgY2FzZSBkZWRpY2F0ZWQgY29weSBzbyB0aGUgdXNlciB1bmRlcnN0YW5kcyB0aGUgdmFsdWUgbXVzdFxuICAgKiBkaWZmZXIuIEV2ZXJ5dGhpbmcgZWxzZSBnb2VzIHRocm91Z2ggdGhlIHN0YW5kYXJkIGJhbm5lciBtYXBwaW5nXG4gICAqICg0MDkgZHVwbGljYXRlIHBhc3NlcyB0aGUgYmFja2VuZCBtZXNzYWdlKS5cbiAgICovXG4gIHByaXZhdGUgc2V0Q2hhbmdlRXJyb3IoZXJyb3I6IHVua25vd24pOiB2b2lkIHtcbiAgICBjb25zdCBhcGkgPSBlcnJvciBpbnN0YW5jZW9mIEFwaUVycm9yID8gZXJyb3IgOiB0b0FwaUVycm9yKGVycm9yKTtcbiAgICB0aGlzLmVycm9yLnNldCh7XG4gICAgICBlcnJvcixcbiAgICAgIGtpbmQ6ICdhY2NvdW50JyxcbiAgICAgIGNvcHk6IGFwaS5zdGF0dXMgPT09IDQwMCA/ICdhY2NvdW50LmVycm9yLnNhbWVWYWx1ZScgOiB1bmRlZmluZWQsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQSA0MjkgZnJvbSBhIGNoYW5nZSByZXF1ZXN0IG1lYW5zIHRoZSBiYWNrZW5kIGNvb2xkb3duIGlzIGxpdmUg4oCUIHJ1blxuICAgKiB0aGUgY291bnRkb3duIChSZXRyeS1BZnRlciB3aGVuIHRoZSBzZXJ2ZXIgc2VudCBvbmUsIGVsc2UgdGhlIGRlZmF1bHRcbiAgICogNjAgcykgc28gdGhlIGJ1dHRvbiBzaG93cyB0aGUgd2FpdCBpbnN0ZWFkIG9mIG9ubHkgdGhlIGJhbm5lci5cbiAgICovXG4gIHByaXZhdGUgc3RhcnRDb3VudGRvd25Gcm9tVGhyb3R0bGUoZXJyb3I6IHVua25vd24sIGNvdW50ZG93bjogUmVzZW5kQ291bnRkb3duKTogdm9pZCB7XG4gICAgY29uc3QgYXBpID0gZXJyb3IgaW5zdGFuY2VvZiBBcGlFcnJvciA/IGVycm9yIDogdG9BcGlFcnJvcihlcnJvcik7XG4gICAgaWYgKGFwaS5zdGF0dXMgPT09IDQyOSkge1xuICAgICAgY291bnRkb3duLnN0YXJ0KGFwaS5yZXRyeUFmdGVyU2Vjb25kcyA/PyA2MCk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBEZWxldGUgYWNjb3VudCAobGVnYWwtcmVjb3ZlcnkpOiB0eXBlLXRvLWNvbmZpcm0gZXJhc3VyZS5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKiBUaGUgY29uZmlybSB3b3JkIHRoZSB1c2VyIG11c3QgdHlwZSB0byBhcm0gdGhlIGRlbGV0ZSAobm8gd2luZG93LmNvbmZpcm0pLiAqL1xuICByZWFkb25seSBkZWxldGVDb25maXJtID0gbmV3IEZvcm1Db250cm9sKCcnLCB7XG4gICAgbm9uTnVsbGFibGU6IHRydWUsXG4gIH0pO1xuXG4gIC8qKiBBcm1lZCBvbmNlIHRoZSBjb25maXJtIHdvcmQgaXMgZXhhY3RseSB0eXBlZCwgdGhyb3VnaCB0aGUgc2hhcmVkXG4gICAqICBDb25maXJtQWN0aW9uIChhY2Nlc3NpYmlsaXR5KTogYGFjY291bnREZWxldGVLZXlgIGlzIHRoZSBzaW5nbGVcbiAgICogIGFybWluZyBrZXkgb24gdGhpcyBwYWdlIChDb25maXJtQWN0aW9uJ3MgYXR0cmlidXRlLXNhZmUgdG9rZW4pLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgYWNjb3VudERlbGV0ZUtleSA9ICdhY2NvdW50JztcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGFjY291bnREZWxldGVDb25maXJtID0gbmV3IENvbmZpcm1BY3Rpb248c3RyaW5nPih0aGlzLmhvc3QubmF0aXZlRWxlbWVudCk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gVHlwaW5nIERFTEVURSBhcm1zIHRoZSBlcmFzdXJlOyBhbnkgb3RoZXIgdmFsdWUgZGlzYXJtcyBpdCAodGhlIHR5cGVkXG4gICAgLy8gd29yZCBJUyB0aGUgZmlyc3Qgc3RlcCkuIEZvY3VzIGRlbGliZXJhdGVseSBzdGF5cyBpbiB0aGUgaW5wdXQ6IHRoZVxuICAgIC8vIGFybWVkIHN0YXRlIGlzIGFubm91bmNlZCBieSB0aGUgcm9sZT1cInN0YXR1c1wiIG5vdGUgaW4gdGhlIHRlbXBsYXRlXG4gICAgLy8gaW5zdGVhZCBvZiBieSBhIGZvY3VzIG1vdmUgb24gZXZlcnkga2V5c3Ryb2tlLlxuICAgIHRoaXMuZGVsZXRlQ29uZmlybS52YWx1ZUNoYW5nZXMuc3Vic2NyaWJlKCh2YWx1ZSkgPT4ge1xuICAgICAgaWYgKHZhbHVlID09PSAnREVMRVRFJykge1xuICAgICAgICB0aGlzLmFjY291bnREZWxldGVDb25maXJtLmFybSh0aGlzLmFjY291bnREZWxldGVLZXkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hY2NvdW50RGVsZXRlQ29uZmlybS5kaXNhcm0oKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBcIkRlbGV0ZSBteSBhY2NvdW50XCIg4oCUIHRoZSB0d28tc3RlcCB0eXBlLXRvLWNvbmZpcm0gZXJhc3VyZSAodGhlIGFybWVkXG4gICAqIHN0YXRlIGNvbWVzIGZyb20gdGhlIHNoYXJlZCBDb25maXJtQWN0aW9uKS4gVGhlIGJ1dHRvbiBzdGF5cyBkaXNhcm1lZFxuICAgKiB1bnRpbCBERUxFVEUgaXMgdHlwZWQ7IG9uIHN1Y2Nlc3MgdGhlIGJhY2tlbmQgaGFzIGFscmVhZHkgZXJhc2VkXG4gICAqIGV2ZXJ5dGhpbmcgKHByaXZhdGUgaG9tZXMgcHVyZ2VkLCBwdWJsaWMgcm93cyBvcnBoYW5lZCwgdGhlIHJlc3RcbiAgICogY2FzY2FkZWQpLCBzbyB0aGUgbG9jYWwgc2Vzc2lvbiBlbmRzIGFuZCB0aGUgcGFnZSBsZWF2ZXMgZm9yIHRoZSBtYXAg4oCUXG4gICAqIHRoZSBiZXN0LWVmZm9ydCAvYXV0aC9sb2dvdXQgcmV2b2NhdGlvbiBpcyBhIG5vLW9wIHNlcnZlci1zaWRlICh0aGVcbiAgICogcmVmcmVzaCB0b2tlbnMgZGllZCB3aXRoIHRoZSBhY2NvdW50KS5cbiAgICovXG4gIGFzeW5jIGRlbGV0ZUFjY291bnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuYnVzeSgpIHx8ICF0aGlzLmFjY291bnREZWxldGVDb25maXJtLmlzQXJtZWQodGhpcy5hY2NvdW50RGVsZXRlS2V5KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmVycm9yLnNldChudWxsKTtcbiAgICB0aGlzLnN1Y2Nlc3Muc2V0KG51bGwpO1xuICAgIHRoaXMuYnVzeS5zZXQodHJ1ZSk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuYWNjb3VudC5kZWxldGVBY2NvdW50KCk7XG4gICAgICBhd2FpdCB0aGlzLmF1dGgubG9nb3V0KCk7XG4gICAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZUJ5VXJsKCcvbWFwJyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZXJyb3Iuc2V0KHsgZXJyb3IsIGtpbmQ6ICdhY2NvdW50JyB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5idXN5LnNldChmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBZb3VyIGRhdGEgKGxlZ2FsLXJlY292ZXJ5KTogZXhwb3J0IGRvd25sb2FkLlxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIFwiRG93bmxvYWQgbXkgZGF0YVwiIOKAlCBmZXRjaCBHRVQgL2FjY291bnQvZXhwb3J0IGFuZCBoYW5kIHRoZSBicm93c2VyIGFcbiAgICogSlNPTiBmaWxlLiBUaGUgY2xpZW50LXNpZGUgQmxvYiBpcyB0aGUgZG93bmxvYWQgbWVjaGFuaXNtOyB0aGUgc2VydmVyXG4gICAqIGlzIGEgcGxhaW4gcmVhZCBhbmQgbmV2ZXIgc3RyZWFtcyBhIGZpbGUuIFJldXNlcyB0aGUgc2hhcmVkIGJ1c3kgZmxhZ1xuICAgKiAodGhlIGZldGNoIGlzIHRoZSBvbmx5IGFjY291bnQtcGFnZSBhY3Rpb24gaW4gZmxpZ2h0KS5cbiAgICovXG4gIGFzeW5jIGRvd25sb2FkRGF0YSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5idXN5KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5lcnJvci5zZXQobnVsbCk7XG4gICAgdGhpcy5zdWNjZXNzLnNldChudWxsKTtcbiAgICB0aGlzLmJ1c3kuc2V0KHRydWUpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5hY2NvdW50LmV4cG9ydERhdGEoKTtcbiAgICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMildLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICBjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgbGluay5ocmVmID0gdXJsO1xuICAgICAgbGluay5kb3dubG9hZCA9IGBvcGVuc2hlbHRlci1kYXRhLWV4cG9ydC0ke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCl9Lmpzb25gO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICAgIGxpbmsuY2xpY2soKTtcbiAgICAgIGxpbmsucmVtb3ZlKCk7XG4gICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICB0aGlzLnN1Y2Nlc3Muc2V0KHsga2V5OiAnYWNjb3VudC5zdWNjZXNzLmV4cG9ydERvd25sb2FkZWQnIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmVycm9yLnNldCh7IGVycm9yLCBraW5kOiAnYWNjb3VudCcgfSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuYnVzeS5zZXQoZmFsc2UpO1xuICAgIH1cbiAgfVxufVxuIiwiPHNlY3Rpb24gY2xhc3M9XCJhY2NvdW50LWNhcmRcIj5cbiAgPGgxIGNsYXNzPVwicGFnZS10aXRsZVwiPnt7ICd0aXRsZS5hY2NvdW50JyB8IHQgfX08L2gxPlxuICA8cCBjbGFzcz1cInBhZ2Utc3VidGl0bGVcIj57eyAnYWNjb3VudC5zdWJ0aXRsZScgfCB0IH19PC9wPlxuXG4gIEBpZiAoc3VjY2VzcygpOyBhcyB0ZXh0KSB7XG4gICAgPGFwcC1iYW5uZXIgc2V2ZXJpdHk9XCJzdWNjZXNzXCIgW21lc3NhZ2VdPVwidGV4dC5rZXkgfCB0OiB0ZXh0LnBhcmFtc1wiIC8+XG4gIH1cbiAgPGFwcC1iYW5uZXIgc2V2ZXJpdHk9XCJlcnJvclwiIFttZXNzYWdlXT1cImVycm9yTWVzc2FnZSgpXCIgLz5cblxuICBAaWYgKGF1dGgubmFtZSgpID09PSBudWxsKSB7XG4gICAgPGRpdiBjbGFzcz1cInByb2ZpbGUtZXJyb3JcIj5cbiAgICAgIDxhcHAtYmFubmVyIHNldmVyaXR5PVwiZXJyb3JcIiBbbWVzc2FnZV09XCInYWNjb3VudC5wcm9maWxlTG9hZEVycm9yJyB8IHRcIiAvPlxuICAgICAgPGRpdiBjbGFzcz1cInBhbmVsLWFjdGlvbnNcIj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzPVwiYnRuIGJ0bi0tZ2hvc3RcIlxuICAgICAgICAgIChjbGljayk9XCJyZXRyeVByb2ZpbGUoKVwiXG4gICAgICAgICAgW2Rpc2FibGVkXT1cInJldHJ5aW5nKClcIlxuICAgICAgICA+XG4gICAgICAgICAge3sgcmV0cnlpbmcoKSA/ICgnYWNjb3VudC5yZXRyeWluZycgfCB0KSA6ICgnYWNjb3VudC5yZXRyeScgfCB0KSB9fVxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICB9IEBlbHNlIHtcbiAgICA8IS0tID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBJZGVudGl0eSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gLS0+XG4gICAgPHNlY3Rpb24gY2xhc3M9XCJjaGFuZ2UtcGFuZWxcIj5cbiAgICAgIDxoMiBjbGFzcz1cInBhbmVsLXRpdGxlXCI+e3sgJ2FjY291bnQuaWRlbnRpdHknIHwgdCB9fTwvaDI+XG5cbiAgICAgIEBpZiAoIWVkaXRpbmcoKSkge1xuICAgICAgICA8ZGwgY2xhc3M9XCJpZGVudGl0eS12YWx1ZXNcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiaWRlbnRpdHktcm93XCI+XG4gICAgICAgICAgICA8ZHQ+e3sgJ2FjY291bnQubmFtZScgfCB0IH19PC9kdD5cbiAgICAgICAgICAgIDxkZD5cbiAgICAgICAgICAgICAge3sgYXV0aC5uYW1lKCkgfX1cbiAgICAgICAgICAgICAgPCEtLSBLaW5kIGJhZGdlIChhZG1pbi1tb2RlcmF0aW9uIEQ1KTogdGhlIGFkbWluIGtpbmRcbiAgICAgICAgICAgICAgICAgICBpcyB0aGUgdHJ1dGggc2VydmVyLXNpZGU7IHRoZSBzdG9yZSdzIGlzQWRtaW4gY29tZXMgZnJvbVxuICAgICAgICAgICAgICAgICAgIHRoZSBmZXRjaGVkIHByb2ZpbGUgKGFsd2F5cyBwcmVzZW50LCBmYWxzZSBmb3IgcmVndWxhcnMpLiAtLT5cbiAgICAgICAgICAgICAgQGlmIChhdXRoLmlzQWRtaW4oKSkge1xuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYmFkZ2UgYmFkZ2UtLWFkbWluXCI+e3sgJ2FjY291bnQuYWRtaW5CYWRnZScgfCB0IH19PC9zcGFuPlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICA8L2RkPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2RsPlxuICAgICAgICA8cCBjbGFzcz1cInBhbmVsLWNvcHlcIj57eyAnYWNjb3VudC5pZGVudGl0eUNvcHknIHwgdCB9fTwvcD5cbiAgICAgICAgPGRpdiBjbGFzcz1cInBhbmVsLWFjdGlvbnNcIj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tLWdob3N0XCIgKGNsaWNrKT1cInN0YXJ0RWRpdCgpXCIgW2Rpc2FibGVkXT1cImJ1c3koKVwiPlxuICAgICAgICAgICAge3sgJ2FjY291bnQuZWRpdCcgfCB0IH19XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgfSBAZWxzZSB7XG4gICAgICAgIDwhLS0gYTExeSAoV0NBRyAyLjEgNC4xLjMsIHRoZSAvc3VibWl0IGNvbnZlbnRpb24pOiBldmVyeSBmaWVsZCBlcnJvclxuICAgICAgICAgICAgIG9uIHRoaXMgcGFnZSBpcyBhIGxpdmUgcmVnaW9uIChyb2xlPWFsZXJ0KSB3aXJlZCB0byBpdHMgY29udHJvbFxuICAgICAgICAgICAgIHZpYSBhcmlhLWludmFsaWQgKyBhcmlhLWRlc2NyaWJlZGJ5LiBAbGV0IGhvbGRzIHRoZSBzaW5nbGVcbiAgICAgICAgICAgICBjb25kaXRpb24gdGhlIEBpZiByZW5kZXJzIG9uLCBzbyB0aGUgYmluZGluZ3MgY2FuIG5ldmVyXG4gICAgICAgICAgICAgZGlzYWdyZWUuIC0tPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICA8bGFiZWwgZm9yPVwicHJvZmlsZS1uYW1lXCI+e3sgJ2FjY291bnQubmFtZScgfCB0IH19PC9sYWJlbD5cbiAgICAgICAgICBAbGV0IG5hbWVJbnZhbGlkID0gZWRpdE5hbWUudG91Y2hlZCAmJiBlZGl0TmFtZS5pbnZhbGlkO1xuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgaWQ9XCJwcm9maWxlLW5hbWVcIlxuICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgW2Zvcm1Db250cm9sXT1cImVkaXROYW1lXCJcbiAgICAgICAgICAgIGF1dG9jb21wbGV0ZT1cIm5hbWVcIlxuICAgICAgICAgICAgW2F0dHIuYXJpYS1pbnZhbGlkXT1cIm5hbWVJbnZhbGlkID8gJ3RydWUnIDogbnVsbFwiXG4gICAgICAgICAgICBbYXR0ci5hcmlhLWRlc2NyaWJlZGJ5XT1cIm5hbWVJbnZhbGlkID8gJ3Byb2ZpbGUtbmFtZS1lcnJvcicgOiBudWxsXCJcbiAgICAgICAgICAvPlxuICAgICAgICAgIEBpZiAobmFtZUludmFsaWQpIHtcbiAgICAgICAgICAgIDxwIGNsYXNzPVwiZmllbGQtZXJyb3JcIiBpZD1cInByb2ZpbGUtbmFtZS1lcnJvclwiIHJvbGU9XCJhbGVydFwiPlxuICAgICAgICAgICAgICB7eyAnYWNjb3VudC5uYW1lUmVxdWlyZWQnIHwgdCB9fVxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIH1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgPGxhYmVsIGZvcj1cInByb2ZpbGUtcGFzc3dvcmRcIj57eyAnYWNjb3VudC5jdXJyZW50UGFzc3dvcmQnIHwgdCB9fTwvbGFiZWw+XG4gICAgICAgICAgQGxldCBjdXJyZW50UGFzc3dvcmRJbnZhbGlkID0gZWRpdFBhc3N3b3JkLnRvdWNoZWQgJiYgZWRpdFBhc3N3b3JkLmludmFsaWQ7XG4gICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICBpZD1cInByb2ZpbGUtcGFzc3dvcmRcIlxuICAgICAgICAgICAgdHlwZT1cInBhc3N3b3JkXCJcbiAgICAgICAgICAgIFtmb3JtQ29udHJvbF09XCJlZGl0UGFzc3dvcmRcIlxuICAgICAgICAgICAgYXV0b2NvbXBsZXRlPVwiY3VycmVudC1wYXNzd29yZFwiXG4gICAgICAgICAgICBbYXR0ci5hcmlhLWludmFsaWRdPVwiY3VycmVudFBhc3N3b3JkSW52YWxpZCA/ICd0cnVlJyA6IG51bGxcIlxuICAgICAgICAgICAgW2F0dHIuYXJpYS1kZXNjcmliZWRieV09XCJjdXJyZW50UGFzc3dvcmRJbnZhbGlkID8gJ3Byb2ZpbGUtcGFzc3dvcmQtZXJyb3InIDogbnVsbFwiXG4gICAgICAgICAgLz5cbiAgICAgICAgICBAaWYgKGN1cnJlbnRQYXNzd29yZEludmFsaWQpIHtcbiAgICAgICAgICAgIDxwIGNsYXNzPVwiZmllbGQtZXJyb3JcIiBpZD1cInByb2ZpbGUtcGFzc3dvcmQtZXJyb3JcIiByb2xlPVwiYWxlcnRcIj5cbiAgICAgICAgICAgICAge3sgJ2FjY291bnQucGFzc3dvcmRSZXF1aXJlZCcgfCB0IH19XG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgfVxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzPVwicGFuZWwtYWN0aW9uc1wiPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgY2xhc3M9XCJidG4gYnRuLS1wcmltYXJ5XCJcbiAgICAgICAgICAgIChjbGljayk9XCJzYXZlUHJvZmlsZSgpXCJcbiAgICAgICAgICAgIFtkaXNhYmxlZF09XCJidXN5KClcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIHt7IGJ1c3koKSA/ICgnYWNjb3VudC5zYXZpbmcnIHwgdCkgOiAoJ2FjY291bnQuc2F2ZScgfCB0KSB9fVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi0tZ2hvc3RcIiAoY2xpY2spPVwiY2FuY2VsRWRpdCgpXCIgW2Rpc2FibGVkXT1cImJ1c3koKVwiPlxuICAgICAgICAgICAge3sgJ2FjY291bnQuY2FuY2VsJyB8IHQgfX1cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICB9XG4gICAgPC9zZWN0aW9uPlxuXG4gICAgPCEtLSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gQ29udGFjdHMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IC0tPlxuICAgIDxzZWN0aW9uIGNsYXNzPVwiY2hhbmdlLXBhbmVsXCI+XG4gICAgICA8aDIgY2xhc3M9XCJwYW5lbC10aXRsZVwiPnt7ICdhY2NvdW50LmNvbnRhY3RzJyB8IHQgfX08L2gyPlxuXG4gICAgICA8ZGl2IGNsYXNzPVwiY29udGFjdC1yb3dcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhY3Qtcm93X19pbmZvXCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJjb250YWN0LXJvd19fbGFiZWxcIj57eyAnYWNjb3VudC5lbWFpbExhYmVsJyB8IHQgfX08L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJjb250YWN0LXJvd19fdmFsdWVcIj57eyBhdXRoLmVtYWlsKCkgfX08L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICBAaWYgKHZlcmlmaWVkKCdFTUFJTCcpKSB7XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJjb250YWN0LWNoaXAgY29udGFjdC1jaGlwLS12ZXJpZmllZFwiPnt7ICdhY2NvdW50LnZlcmlmaWVkJyB8IHQgfX08L3NwYW4+XG4gICAgICAgIH0gQGVsc2Uge1xuICAgICAgICAgIDxhIHJvdXRlckxpbms9XCIvdmVyaWZ5XCIgY2xhc3M9XCJidG4gYnRuLS1naG9zdCBjb250YWN0LWNoaXAgY29udGFjdC1jaGlwLS1jdGFcIj5cbiAgICAgICAgICAgIHt7ICdhY2NvdW50LmNvbXBsZXRlVmVyaWZpY2F0aW9uJyB8IHQgfX1cbiAgICAgICAgICA8L2E+XG4gICAgICAgIH1cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzPVwiY29udGFjdC1yb3dcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhY3Qtcm93X19pbmZvXCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJjb250YWN0LXJvd19fbGFiZWxcIj57eyAnYWNjb3VudC5waG9uZUxhYmVsJyB8IHQgfX08L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJjb250YWN0LXJvd19fdmFsdWVcIj57eyBhdXRoLnBob25lKCkgfX08L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICBAaWYgKHZlcmlmaWVkKCdQSE9ORScpKSB7XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJjb250YWN0LWNoaXAgY29udGFjdC1jaGlwLS12ZXJpZmllZFwiPnt7ICdhY2NvdW50LnZlcmlmaWVkJyB8IHQgfX08L3NwYW4+XG4gICAgICAgIH0gQGVsc2Uge1xuICAgICAgICAgIDxhIHJvdXRlckxpbms9XCIvdmVyaWZ5XCIgY2xhc3M9XCJidG4gYnRuLS1naG9zdCBjb250YWN0LWNoaXAgY29udGFjdC1jaGlwLS1jdGFcIj5cbiAgICAgICAgICAgIHt7ICdhY2NvdW50LmNvbXBsZXRlVmVyaWZpY2F0aW9uJyB8IHQgfX1cbiAgICAgICAgICA8L2E+XG4gICAgICAgIH1cbiAgICAgIDwvZGl2PlxuICAgIDwvc2VjdGlvbj5cblxuICAgIDwhLS0gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IEVtYWlsIGNoYW5nZSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gLS0+XG4gICAgPHNlY3Rpb24gY2xhc3M9XCJjaGFuZ2UtcGFuZWxcIj5cbiAgICAgIDxoMiBjbGFzcz1cInBhbmVsLXRpdGxlXCI+e3sgJ2FjY291bnQuY2hhbmdlRW1haWwnIHwgdCB9fTwvaDI+XG5cbiAgICAgIEBpZiAoZW1haWxQaGFzZSgpID09PSAnZG9uZScpIHtcbiAgICAgICAgPHAgY2xhc3M9XCJwYW5lbC1jb3B5XCI+XG4gICAgICAgICAge3sgJ2FjY291bnQuZW1haWxEb25lLmJlZm9yZScgfCB0IH19IDxzdHJvbmc+e3sgYXV0aC5lbWFpbCgpIH19PC9zdHJvbmdcbiAgICAgICAgICA+e3sgJ2FjY291bnQuZW1haWxEb25lLmFmdGVyJyB8IHQgfX1cbiAgICAgICAgPC9wPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tLWdob3N0XCIgKGNsaWNrKT1cImVtYWlsU3RhcnRPdmVyKClcIj5cbiAgICAgICAgICB7eyAnYWNjb3VudC5jaGFuZ2VBZ2FpbicgfCB0IH19XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgfSBAZWxzZSB7XG4gICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgIDxsYWJlbCBmb3I9XCJjaGFuZ2UtZW1haWwtbmV3XCI+e3sgJ2FjY291bnQubmV3RW1haWwnIHwgdCB9fTwvbGFiZWw+XG4gICAgICAgICAgPCEtLSBUaGUgdGFyZ2V0IGxvY2tzIGluIHRoZSBjb2RlIHBoYXNlIHZpYSB0aGUgY29udHJvbCdzIG93blxuICAgICAgICAgICAgICAgZGlzYWJsZWQgc3RhdGUgKGVtYWlsU2VuZCkg4oCUIEZvcm1Db250cm9sRGlyZWN0aXZlIHN3YWxsb3dzIGFcbiAgICAgICAgICAgICAgIFtkaXNhYmxlZF0gcHJvcGVydHkgYmluZGluZywgc28gdGhlIGNvbnRyb2wgc3RhdGUgSVMgdGhlIERPTS4gLS0+XG4gICAgICAgICAgQGxldCBuZXdFbWFpbEludmFsaWQgPSBuZXdFbWFpbC50b3VjaGVkICYmIG5ld0VtYWlsLmludmFsaWQ7XG4gICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICBpZD1cImNoYW5nZS1lbWFpbC1uZXdcIlxuICAgICAgICAgICAgdHlwZT1cImVtYWlsXCJcbiAgICAgICAgICAgIFtmb3JtQ29udHJvbF09XCJuZXdFbWFpbFwiXG4gICAgICAgICAgICBtYXhsZW5ndGg9XCIyNTVcIlxuICAgICAgICAgICAgYXV0b2NvbXBsZXRlPVwiZW1haWxcIlxuICAgICAgICAgICAgW3BsYWNlaG9sZGVyXT1cIidhY2NvdW50Lm5ld0VtYWlsUGxhY2Vob2xkZXInIHwgdFwiXG4gICAgICAgICAgICBbYXR0ci5hcmlhLWludmFsaWRdPVwibmV3RW1haWxJbnZhbGlkID8gJ3RydWUnIDogbnVsbFwiXG4gICAgICAgICAgICBbYXR0ci5hcmlhLWRlc2NyaWJlZGJ5XT1cIm5ld0VtYWlsSW52YWxpZCA/ICdjaGFuZ2UtZW1haWwtbmV3LWVycm9yJyA6IG51bGxcIlxuICAgICAgICAgIC8+XG4gICAgICAgICAgQGlmIChuZXdFbWFpbEludmFsaWQpIHtcbiAgICAgICAgICAgIDxwIGNsYXNzPVwiZmllbGQtZXJyb3JcIiBpZD1cImNoYW5nZS1lbWFpbC1uZXctZXJyb3JcIiByb2xlPVwiYWxlcnRcIj5cbiAgICAgICAgICAgICAge3tcbiAgICAgICAgICAgICAgICBuZXdFbWFpbC5lcnJvcnM/LlsnbWF4bGVuZ3RoJ11cbiAgICAgICAgICAgICAgICAgID8gKCdhY2NvdW50LmVtYWlsVG9vTG9uZycgfCB0KVxuICAgICAgICAgICAgICAgICAgOiAoJ2FjY291bnQuZW1haWxSZXF1aXJlZCcgfCB0KVxuICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIH1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPHAgY2xhc3M9XCJwcm9vZi1ub3RlXCI+e3sgJ2FjY291bnQuZW1haWxQcm9vZicgfCB0IH19PC9wPlxuXG4gICAgICAgIEBpZiAoZW1haWxQaGFzZSgpID09PSAnY29kZScpIHtcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJjaGFuZ2UtZW1haWwtY29kZVwiPnt7ICdhY2NvdW50LnNtc0NvZGUnIHwgdCB9fTwvbGFiZWw+XG4gICAgICAgICAgICBAbGV0IGVtYWlsQ29kZUludmFsaWQgPSBlbWFpbENvZGUudG91Y2hlZCAmJiBlbWFpbENvZGUuaW52YWxpZDtcbiAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICBpZD1cImNoYW5nZS1lbWFpbC1jb2RlXCJcbiAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICBbZm9ybUNvbnRyb2xdPVwiZW1haWxDb2RlXCJcbiAgICAgICAgICAgICAgYXV0b2NvbXBsZXRlPVwib25lLXRpbWUtY29kZVwiXG4gICAgICAgICAgICAgIGlucHV0bW9kZT1cIm51bWVyaWNcIlxuICAgICAgICAgICAgICBbcGxhY2Vob2xkZXJdPVwiJ2FjY291bnQuY29kZVBsYWNlaG9sZGVyJyB8IHRcIlxuICAgICAgICAgICAgICBbYXR0ci5hcmlhLWludmFsaWRdPVwiZW1haWxDb2RlSW52YWxpZCA/ICd0cnVlJyA6IG51bGxcIlxuICAgICAgICAgICAgICBbYXR0ci5hcmlhLWRlc2NyaWJlZGJ5XT1cImVtYWlsQ29kZUludmFsaWQgPyAnY2hhbmdlLWVtYWlsLWNvZGUtZXJyb3InIDogbnVsbFwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgICAgQGlmIChlbWFpbENvZGVJbnZhbGlkKSB7XG4gICAgICAgICAgICAgIDxwIGNsYXNzPVwiZmllbGQtZXJyb3JcIiBpZD1cImNoYW5nZS1lbWFpbC1jb2RlLWVycm9yXCIgcm9sZT1cImFsZXJ0XCI+XG4gICAgICAgICAgICAgICAge3sgJ2FjY291bnQuc21zQ29kZVJlcXVpcmVkJyB8IHQgfX1cbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgPHAgY2xhc3M9XCJmaWVsZC1ub3RlXCI+e3sgJ2FjY291bnQuc21zU2VudEhpbnQnIHwgdCB9fTwvcD5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJwYW5lbC1hY3Rpb25zXCI+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICBjbGFzcz1cImJ0biBidG4tLXByaW1hcnlcIlxuICAgICAgICAgICAgICAoY2xpY2spPVwiZW1haWxDb25maXJtKClcIlxuICAgICAgICAgICAgICBbZGlzYWJsZWRdPVwiYnVzeSgpXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAge3sgYnVzeSgpID8gKCdhY2NvdW50LndvcmtpbmcnIHwgdCkgOiAoJ2FjY291bnQuY29uZmlybU5ld0VtYWlsJyB8IHQpIH19XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgIGNsYXNzPVwiYnRuIGJ0bi0tZ2hvc3RcIlxuICAgICAgICAgICAgICAoY2xpY2spPVwiZW1haWxSZXNlbmQoKVwiXG4gICAgICAgICAgICAgIFtkaXNhYmxlZF09XCJidXN5KCkgfHwgZW1haWxDb3VudGRvd24uYWN0aXZlXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAge3tcbiAgICAgICAgICAgICAgICBlbWFpbENvdW50ZG93bi5hY3RpdmVcbiAgICAgICAgICAgICAgICAgID8gKCdhY2NvdW50LnJlc2VuZEluJyB8IHQ6IHsgdGltZTogZW1haWxDb3VudGRvd24ubGFiZWwoKSB9KVxuICAgICAgICAgICAgICAgICAgOiAoJ2FjY291bnQucmVzZW5kQ29kZScgfCB0KVxuICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICBjbGFzcz1cImJ0biBidG4tLWdob3N0XCJcbiAgICAgICAgICAgICAgKGNsaWNrKT1cImVtYWlsU3RhcnRPdmVyKClcIlxuICAgICAgICAgICAgICBbZGlzYWJsZWRdPVwiYnVzeSgpXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAge3sgJ2FjY291bnQuY2FuY2VsJyB8IHQgfX1cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICB9IEBlbHNlIHtcbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgIGNsYXNzPVwiYnRuIGJ0bi0tcHJpbWFyeVwiXG4gICAgICAgICAgICAoY2xpY2spPVwiZW1haWxTZW5kKClcIlxuICAgICAgICAgICAgW2Rpc2FibGVkXT1cImJ1c3koKSB8fCBlbWFpbENvdW50ZG93bi5hY3RpdmVcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIHt7XG4gICAgICAgICAgICAgIGJ1c3koKVxuICAgICAgICAgICAgICAgID8gKCdhY2NvdW50LnNlbmRpbmcnIHwgdClcbiAgICAgICAgICAgICAgICA6IGVtYWlsQ291bnRkb3duLmFjdGl2ZVxuICAgICAgICAgICAgICAgICAgPyAoJ2FjY291bnQuc2VuZEluJyB8IHQ6IHsgdGltZTogZW1haWxDb3VudGRvd24ubGFiZWwoKSB9KVxuICAgICAgICAgICAgICAgICAgOiAoJ2FjY291bnQuc2VuZFNtc1RvUGhvbmUnIHwgdClcbiAgICAgICAgICAgIH19XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICA8L3NlY3Rpb24+XG5cbiAgICA8IS0tID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBQaG9uZSBjaGFuZ2UgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IC0tPlxuICAgIDxzZWN0aW9uIGNsYXNzPVwiY2hhbmdlLXBhbmVsXCI+XG4gICAgICA8aDIgY2xhc3M9XCJwYW5lbC10aXRsZVwiPnt7ICdhY2NvdW50LmNoYW5nZVBob25lJyB8IHQgfX08L2gyPlxuXG4gICAgICBAaWYgKHBob25lUGhhc2UoKSA9PT0gJ2RvbmUnKSB7XG4gICAgICAgIDxwIGNsYXNzPVwicGFuZWwtY29weVwiPlxuICAgICAgICAgIHt7ICdhY2NvdW50LnBob25lRG9uZS5iZWZvcmUnIHwgdCB9fSA8c3Ryb25nPnt7IGF1dGgucGhvbmUoKSB9fTwvc3Ryb25nXG4gICAgICAgICAgPnt7ICdhY2NvdW50LnBob25lRG9uZS5hZnRlcicgfCB0IH19XG4gICAgICAgIDwvcD5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLS1naG9zdFwiIChjbGljayk9XCJwaG9uZVN0YXJ0T3ZlcigpXCI+XG4gICAgICAgICAge3sgJ2FjY291bnQuY2hhbmdlQWdhaW4nIHwgdCB9fVxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIH0gQGVsc2Uge1xuICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICA8bGFiZWwgZm9yPVwiY2hhbmdlLXBob25lLW5ld1wiPnt7ICdhY2NvdW50Lm5ld1Bob25lJyB8IHQgfX08L2xhYmVsPlxuICAgICAgICAgIDwhLS0gTG9ja2VkIGluIHRoZSBjb2RlIHBoYXNlIHZpYSB0aGUgY29udHJvbCdzIGRpc2FibGVkIHN0YXRlIChwaG9uZVNlbmQpLiAtLT5cbiAgICAgICAgICBAbGV0IG5ld1Bob25lSW52YWxpZCA9IG5ld1Bob25lLnRvdWNoZWQgJiYgbmV3UGhvbmUuaW52YWxpZDtcbiAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgIGlkPVwiY2hhbmdlLXBob25lLW5ld1wiXG4gICAgICAgICAgICB0eXBlPVwidGVsXCJcbiAgICAgICAgICAgIFtmb3JtQ29udHJvbF09XCJuZXdQaG9uZVwiXG4gICAgICAgICAgICBtYXhsZW5ndGg9XCI2NFwiXG4gICAgICAgICAgICBhdXRvY29tcGxldGU9XCJ0ZWxcIlxuICAgICAgICAgICAgW3BsYWNlaG9sZGVyXT1cIidhY2NvdW50Lm5ld1Bob25lUGxhY2Vob2xkZXInIHwgdFwiXG4gICAgICAgICAgICBbYXR0ci5hcmlhLWludmFsaWRdPVwibmV3UGhvbmVJbnZhbGlkID8gJ3RydWUnIDogbnVsbFwiXG4gICAgICAgICAgICBbYXR0ci5hcmlhLWRlc2NyaWJlZGJ5XT1cIm5ld1Bob25lSW52YWxpZCA/ICdjaGFuZ2UtcGhvbmUtbmV3LWVycm9yJyA6IG51bGxcIlxuICAgICAgICAgIC8+XG4gICAgICAgICAgQGlmIChuZXdQaG9uZUludmFsaWQpIHtcbiAgICAgICAgICAgIDxwIGNsYXNzPVwiZmllbGQtZXJyb3JcIiBpZD1cImNoYW5nZS1waG9uZS1uZXctZXJyb3JcIiByb2xlPVwiYWxlcnRcIj5cbiAgICAgICAgICAgICAge3tcbiAgICAgICAgICAgICAgICBuZXdQaG9uZS5lcnJvcnM/LlsnbWF4bGVuZ3RoJ11cbiAgICAgICAgICAgICAgICAgID8gKCdhY2NvdW50LnBob25lVG9vTG9uZycgfCB0KVxuICAgICAgICAgICAgICAgICAgOiAoJ2FjY291bnQucGhvbmVSZXF1aXJlZCcgfCB0KVxuICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgIH1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPHAgY2xhc3M9XCJwcm9vZi1ub3RlXCI+e3sgJ2FjY291bnQucGhvbmVQcm9vZicgfCB0IH19PC9wPlxuXG4gICAgICAgIEBpZiAocGhvbmVQaGFzZSgpID09PSAnY29kZScpIHtcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJjaGFuZ2UtcGhvbmUtY29kZVwiPnt7ICdhY2NvdW50LmVtYWlsQ29kZScgfCB0IH19PC9sYWJlbD5cbiAgICAgICAgICAgIEBsZXQgcGhvbmVDb2RlSW52YWxpZCA9IHBob25lQ29kZS50b3VjaGVkICYmIHBob25lQ29kZS5pbnZhbGlkO1xuICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgIGlkPVwiY2hhbmdlLXBob25lLWNvZGVcIlxuICAgICAgICAgICAgICB0eXBlPVwidGV4dFwiXG4gICAgICAgICAgICAgIFtmb3JtQ29udHJvbF09XCJwaG9uZUNvZGVcIlxuICAgICAgICAgICAgICBhdXRvY29tcGxldGU9XCJvbmUtdGltZS1jb2RlXCJcbiAgICAgICAgICAgICAgaW5wdXRtb2RlPVwibnVtZXJpY1wiXG4gICAgICAgICAgICAgIFtwbGFjZWhvbGRlcl09XCInYWNjb3VudC5jb2RlUGxhY2Vob2xkZXInIHwgdFwiXG4gICAgICAgICAgICAgIFthdHRyLmFyaWEtaW52YWxpZF09XCJwaG9uZUNvZGVJbnZhbGlkID8gJ3RydWUnIDogbnVsbFwiXG4gICAgICAgICAgICAgIFthdHRyLmFyaWEtZGVzY3JpYmVkYnldPVwicGhvbmVDb2RlSW52YWxpZCA/ICdjaGFuZ2UtcGhvbmUtY29kZS1lcnJvcicgOiBudWxsXCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICBAaWYgKHBob25lQ29kZUludmFsaWQpIHtcbiAgICAgICAgICAgICAgPHAgY2xhc3M9XCJmaWVsZC1lcnJvclwiIGlkPVwiY2hhbmdlLXBob25lLWNvZGUtZXJyb3JcIiByb2xlPVwiYWxlcnRcIj5cbiAgICAgICAgICAgICAgICB7eyAnYWNjb3VudC5lbWFpbENvZGVSZXF1aXJlZCcgfCB0IH19XG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDxwIGNsYXNzPVwiZmllbGQtbm90ZVwiPnt7ICdhY2NvdW50LmVtYWlsQ29kZVNlbnRIaW50JyB8IHQgfX08L3A+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicGFuZWwtYWN0aW9uc1wiPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgY2xhc3M9XCJidG4gYnRuLS1wcmltYXJ5XCJcbiAgICAgICAgICAgICAgKGNsaWNrKT1cInBob25lQ29uZmlybSgpXCJcbiAgICAgICAgICAgICAgW2Rpc2FibGVkXT1cImJ1c3koKVwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHt7IGJ1c3koKSA/ICgnYWNjb3VudC53b3JraW5nJyB8IHQpIDogKCdhY2NvdW50LmNvbmZpcm1OZXdQaG9uZScgfCB0KSB9fVxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICBjbGFzcz1cImJ0biBidG4tLWdob3N0XCJcbiAgICAgICAgICAgICAgKGNsaWNrKT1cInBob25lUmVzZW5kKClcIlxuICAgICAgICAgICAgICBbZGlzYWJsZWRdPVwiYnVzeSgpIHx8IHBob25lQ291bnRkb3duLmFjdGl2ZVwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHt7XG4gICAgICAgICAgICAgICAgcGhvbmVDb3VudGRvd24uYWN0aXZlXG4gICAgICAgICAgICAgICAgICA/ICgnYWNjb3VudC5yZXNlbmRJbicgfCB0OiB7IHRpbWU6IHBob25lQ291bnRkb3duLmxhYmVsKCkgfSlcbiAgICAgICAgICAgICAgICAgIDogKCdhY2NvdW50LnJlc2VuZENvZGUnIHwgdClcbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgY2xhc3M9XCJidG4gYnRuLS1naG9zdFwiXG4gICAgICAgICAgICAgIChjbGljayk9XCJwaG9uZVN0YXJ0T3ZlcigpXCJcbiAgICAgICAgICAgICAgW2Rpc2FibGVkXT1cImJ1c3koKVwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHt7ICdhY2NvdW50LmNhbmNlbCcgfCB0IH19XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgfSBAZWxzZSB7XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICBjbGFzcz1cImJ0biBidG4tLXByaW1hcnlcIlxuICAgICAgICAgICAgKGNsaWNrKT1cInBob25lU2VuZCgpXCJcbiAgICAgICAgICAgIFtkaXNhYmxlZF09XCJidXN5KCkgfHwgcGhvbmVDb3VudGRvd24uYWN0aXZlXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICB7e1xuICAgICAgICAgICAgICBidXN5KClcbiAgICAgICAgICAgICAgICA/ICgnYWNjb3VudC5zZW5kaW5nJyB8IHQpXG4gICAgICAgICAgICAgICAgOiBwaG9uZUNvdW50ZG93bi5hY3RpdmVcbiAgICAgICAgICAgICAgICAgID8gKCdhY2NvdW50LnNlbmRJbicgfCB0OiB7IHRpbWU6IHBob25lQ291bnRkb3duLmxhYmVsKCkgfSlcbiAgICAgICAgICAgICAgICAgIDogKCdhY2NvdW50LnNlbmRFbWFpbENvZGUnIHwgdClcbiAgICAgICAgICAgIH19XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICA8L3NlY3Rpb24+XG5cbiAgICA8IS0tID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBNeSBjb250cmlidXRpb25zID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAtLT5cbiAgICA8c2VjdGlvbiBjbGFzcz1cImNoYW5nZS1wYW5lbFwiPlxuICAgICAgPGgyIGNsYXNzPVwicGFuZWwtdGl0bGVcIj57eyAnYWNjb3VudC5jb250cmlidXRpb25zJyB8IHQgfX08L2gyPlxuICAgICAgPHAgY2xhc3M9XCJwYW5lbC1jb3B5XCI+e3sgJ2FjY291bnQuY29udHJpYnV0aW9uc0NvcHknIHwgdCB9fTwvcD5cbiAgICAgIDxhcHAtY29udHJpYnV0aW9ucy1wYW5lbCAvPlxuICAgIDwvc2VjdGlvbj5cblxuICAgIDwhLS0gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IFlvdXIgZGF0YSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAtLT5cbiAgICA8c2VjdGlvbiBjbGFzcz1cImNoYW5nZS1wYW5lbFwiPlxuICAgICAgPGgyIGNsYXNzPVwicGFuZWwtdGl0bGVcIj57eyAnYWNjb3VudC55b3VyRGF0YScgfCB0IH19PC9oMj5cbiAgICAgIDxwIGNsYXNzPVwicGFuZWwtY29weVwiPnt7ICdhY2NvdW50LmRhdGFDb3B5JyB8IHQgfX08L3A+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICBpZD1cImRvd25sb2FkLWRhdGFcIlxuICAgICAgICBjbGFzcz1cImJ0biBidG4tLWdob3N0XCJcbiAgICAgICAgKGNsaWNrKT1cImRvd25sb2FkRGF0YSgpXCJcbiAgICAgICAgW2Rpc2FibGVkXT1cImJ1c3koKVwiXG4gICAgICA+XG4gICAgICAgIHt7IGJ1c3koKSA/ICgnYWNjb3VudC5wcmVwYXJpbmcnIHwgdCkgOiAoJ2FjY291bnQuZG93bmxvYWREYXRhJyB8IHQpIH19XG4gICAgICA8L2J1dHRvbj5cbiAgICA8L3NlY3Rpb24+XG5cbiAgICA8IS0tID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSBEZWxldGUgYWNjb3VudCA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAtLT5cbiAgICA8c2VjdGlvbiBjbGFzcz1cImNoYW5nZS1wYW5lbFwiPlxuICAgICAgPGgyIGNsYXNzPVwicGFuZWwtdGl0bGVcIj57eyAnYWNjb3VudC5kZWxldGUnIHwgdCB9fTwvaDI+XG4gICAgICBAaWYgKGF1dGguaXNBZG1pbigpKSB7XG4gICAgICAgIDwhLS0gVGhlIGVudi1wcm92aXNpb25lZCBhZG1pbmlzdHJhdG9yIChraW5kIEFETUlOIOKAlCB0aGUgc3RvcmUnc1xuICAgICAgICAgICAgIGlzQWRtaW4gY29tZXMgZnJvbSB0aGUgZmV0Y2hlZCBwcm9maWxlKTogdGhpcyBhY2NvdW50IGlzIHRoZVxuICAgICAgICAgICAgIGRlcGxveW1lbnQncyBhY2Nlc3MgcGF0aCwgc28gdGhlIGRlbGV0ZSBjb250cm9scyBhcmUgQUJTRU5UIG9uXG4gICAgICAgICAgICAgcHVycG9zZS4gVGhlIHNlcnZlciBlbmZvcmNlcyBpdCAoREVMRVRFIC9hY2NvdW50IGFuc3dlcnMgNDAzXG4gICAgICAgICAgICAgd2l0aCB0aGUgc2FtZSByZWFzb24pIOKAlCB0aGlzIGV4cGxhbmF0aW9uIHRlbGxzIHRoZSBvcGVyYXRvclxuICAgICAgICAgICAgIHdoeSB0aGUgY29udHJvbHMgYXJlIG1pc3NpbmcgYW5kIHdoYXQgdG8gZG8gaW5zdGVhZC4gLS0+XG4gICAgICAgIDxwIGNsYXNzPVwicGFuZWwtY29weVwiPnt7ICdhY2NvdW50LmRlbGV0ZS5hZG1pbkNvcHknIHwgdCB9fTwvcD5cbiAgICAgIH0gQGVsc2Uge1xuICAgICAgICA8cCBjbGFzcz1cInBhbmVsLWNvcHlcIj57eyAnYWNjb3VudC5kZWxldGUuY29weScgfCB0IH19PC9wPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICA8bGFiZWwgZm9yPVwiZGVsZXRlLWNvbmZpcm1cIj57eyAnYWNjb3VudC5kZWxldGUudHlwZUhpbnQnIHwgdCB9fTwvbGFiZWw+XG4gICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICBpZD1cImRlbGV0ZS1jb25maXJtXCJcbiAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgIFtmb3JtQ29udHJvbF09XCJkZWxldGVDb25maXJtXCJcbiAgICAgICAgICAgIGF1dG9jb21wbGV0ZT1cIm9mZlwiXG4gICAgICAgICAgICBwbGFjZWhvbGRlcj1cIkRFTEVURVwiXG4gICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDwhLS0gVGhlIGFybWVkIHN0YXRlIGlzIGEgbGl2ZSByZWdpb246IGEgYnV0dG9uIHRoYXRcbiAgICAgICAgICAgICBtZXJlbHkgZW5hYmxlcyBpcyBub3QgcmVsaWFibHkgYW5ub3VuY2VkLCBhbmQgdGhlIHNoYXJlZFxuICAgICAgICAgICAgIENvbmZpcm1BY3Rpb24ga2VlcHMgZm9jdXMgaW4gdGhlIGlucHV0ICh0aGUgdHlwZWQgd29yZCBJUyB0aGUgc3RlcCkuIC0tPlxuICAgICAgICBAaWYgKGFjY291bnREZWxldGVDb25maXJtLmlzQXJtZWQoYWNjb3VudERlbGV0ZUtleSkpIHtcbiAgICAgICAgICA8cCBjbGFzcz1cImZpZWxkLW5vdGVcIiByb2xlPVwic3RhdHVzXCI+e3sgJ2FjY291bnQuZGVsZXRlLmFybWVkJyB8IHQgfX08L3A+XG4gICAgICAgIH1cbiAgICAgICAgPGRpdiBjbGFzcz1cInBhbmVsLWFjdGlvbnNcIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgIGlkPVwiZGVsZXRlLWFjY291bnRcIlxuICAgICAgICAgICAgY2xhc3M9XCJidG4gYnRuLS1naG9zdCBidG4tLWRhbmdlclwiXG4gICAgICAgICAgICAoY2xpY2spPVwiZGVsZXRlQWNjb3VudCgpXCJcbiAgICAgICAgICAgIFtkaXNhYmxlZF09XCJidXN5KCkgfHwgIWFjY291bnREZWxldGVDb25maXJtLmlzQXJtZWQoYWNjb3VudERlbGV0ZUtleSlcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIHt7IGJ1c3koKSA/ICgnYWNjb3VudC5kZWxldGluZycgfCB0KSA6ICgnYWNjb3VudC5kZWxldGUuYnV0dG9uJyB8IHQpIH19XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgfVxuICAgIDwvc2VjdGlvbj5cblxuICAgIDwhLS0gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IExlZ2FsIChXb3Jrc3RyZWFtIEEpID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAtLT5cbiAgICA8c2VjdGlvbiBjbGFzcz1cImNoYW5nZS1wYW5lbFwiPlxuICAgICAgPGgyIGNsYXNzPVwicGFuZWwtdGl0bGVcIj57eyAnYWNjb3VudC5sZWdhbCcgfCB0IH19PC9oMj5cbiAgICAgIDxwIGNsYXNzPVwicGFuZWwtY29weVwiPlxuICAgICAgICB7eyAnYWNjb3VudC5sZWdhbC5sZWFkJyB8IHQgfX1cbiAgICAgICAgPGEgcm91dGVyTGluaz1cIi9wcml2YWN5XCI+e3sgJ2F1dGhQYWdlLnByaXZhY3lQb2xpY3knIHwgdCB9fTwvYT5cbiAgICAgICAge3sgJ2FjY291bnQubGVnYWwuYW5kJyB8IHQgfX1cbiAgICAgICAgPGEgcm91dGVyTGluaz1cIi90ZXJtc1wiPnt7ICdhdXRoUGFnZS50ZXJtc09mVXNlJyB8IHQgfX08L2FcbiAgICAgICAgPnt7ICdhY2NvdW50LmxlZ2FsLnRhaWwnIHwgdCB9fVxuICAgICAgPC9wPlxuICAgIDwvc2VjdGlvbj5cbiAgfVxuPC9zZWN0aW9uPlxuIiwiaW1wb3J0IHtcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENoYW5nZURldGVjdG9yUmVmLFxuICBDb21wb25lbnQsXG4gIEVsZW1lbnRSZWYsXG4gIGluamVjdCxcbiAgT25Jbml0LFxuICBzaWduYWwsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgdG9PYnNlcnZhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZS9yeGpzLWludGVyb3AnO1xuaW1wb3J0IHsgRGF0ZVBpcGUsIE5nQ2xhc3MgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgRm9ybUNvbnRyb2wsIFJlYWN0aXZlRm9ybXNNb2R1bGUsIFZhbGlkYXRvcnMgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQgeyBBY3RpdmF0ZWRSb3V0ZSwgUm91dGVyTGluaywgdHlwZSBVcmxUcmVlLCBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90IH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IHNraXAgfSBmcm9tICdyeGpzJztcbmltcG9ydCB0eXBlIHsgTWluZVNoZWx0ZXJEdG8gfSBmcm9tICcuLi8uLi9jb3JlL21vZGVscyc7XG5pbXBvcnQgeyBTaGVsdGVyR2F0ZXdheSB9IGZyb20gJy4uLy4uL2dhdGV3YXlzL3NoZWx0ZXItZ2F0ZXdheSc7XG5pbXBvcnQgeyBJMThuU2VydmljZSB9IGZyb20gJy4uLy4uL2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnO1xuaW1wb3J0IHsgVHJhbnNsYXRlUGlwZSB9IGZyb20gJy4uLy4uL2NvcmUvaTE4bi90cmFuc2xhdGUtcGlwZSc7XG5pbXBvcnQgeyBDb25maXJtQWN0aW9uIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2NvbmZpcm0tYWN0aW9uJztcbmltcG9ydCB7IGJhbm5lck1lc3NhZ2UgfSBmcm9tICcuLi8uLi9zaGFyZWQvZXJyb3ItY29weSc7XG5pbXBvcnQgeyBuYW1lQmxhbmtWYWxpZGF0b3IgfSBmcm9tICcuLi8uLi9zaGFyZWQvZm9ybS1oZWxwZXJzJztcbmltcG9ydCB7IExvYWRpbmdJbmRpY2F0b3IgfSBmcm9tICcuLi8uLi9zaGFyZWQvbG9hZGluZy1pbmRpY2F0b3InO1xuaW1wb3J0IHsgY29tbXVuaXR5QmFkZ2VDbGFzcyBhcyBjb21tdW5pdHlCYWRnZUNsYXNzU2hhcmVkIH0gZnJvbSAnLi4vLi4vc2hhcmVkL3NoZWx0ZXItY29weSc7XG5cbi8qKlxuICogXCJNeSBjb250cmlidXRpb25zXCIgcGFuZWwgb24gdGhlIC9hY2NvdW50IHBhZ2UgKHVzZXItY29udHJpYnV0aW9ucyk6IHRoZVxuICogY2FsbGVyJ3Mgb3duIHNoZWx0ZXJzIChsaXN0L2VkaXQvZGVsZXRlKS4gVGhlIHJldmlld3MgbGlzdCBpc1xuICogZ29uZSB3aXRoIHRoZSByZXZpZXcgbW9kZWwgKG93bmVyIGRlY2lzaW9uKS5cbiAqXG4gKiBFZGl0ID0gdGhlIHNoYXJlZCAvc3VibWl0IGZvcm0gaW4gZWRpdCBtb2RlIChNNSk6IHRoZSBFZGl0IGVudHJ5IGlzIGFcbiAqIGxpbmsgdG8gL3N1Ym1pdD9lZGl0PTxpZD4g4oCUIHRoZSBTQU1FIGZ1bGwgY3JlYXRpb24gZm9ybSBwcmVmaWxsZWQgd2l0aFxuICogdGhlIHJvdydzIGN1cnJlbnQgdmFsdWVzIChzYW1lIGZpZWxkcywgc2FtZSBsb2NhdGlvbiBjYXB0dXJlIG1vZGVzKS5cbiAqIFRoZSBhY2NvdW50IGFyZWEgbm8gbG9uZ2VyIGhvc3RzIGl0cyBvd24gcmVkdWNlZCBpbmxpbmUgZWRpdCBmb3JtO1xuICogc2F2ZSBpcyBQVVQgL2FwaS9zaGVsdGVycy97aWR9IG9uIHRoYXQgcGFnZSwgYW5kIHRoZSBlZGl0IHB1Ymxpc2hlc1xuICogaW1tZWRpYXRlbHkgd2l0aCB0aGUgcGVuZGluZy12ZXJpZmljYXRpb24gKE5FVykgdHJ1c3Qgc3RhdGUuXG4gKiBEZWxldGUgPSB0d28tc3RlcCBjb25maXJtICh0aGUgYnV0dG9uIGFybSArIFwiQ29uZmlybSBkZWxldGU/XCI7XG4gKiBubyB3aW5kb3cuY29uZmlybSwgY29uc2lzdGVudCB3aXRoIHRoZSBhcHAncyBpbmxpbmUgc3R5bGUpLlxuICpcbiAqIEFmdGVyIGEgc3VjY2Vzc2Z1bCBtdXRhdGlvbiB0aGUgaW4tbWVtb3J5IHJvdyBpcyB1cGRhdGVkIGZyb20gdGhlIHJlc3BvbnNlXG4gKiAobm8gZnVsbCByZWZldGNoKS4gUmVqZWN0ZWQgbXV0YXRpb25zICg0MDAvNDAzLzQwNCkgc3VyZmFjZSBhIHJvdy1sZXZlbFxuICogZXJyb3IgdmlhIHRoZSBzdGFuZGFyZCBiYW5uZXIgY29weSBtYXBwaW5nIOKAlCB0aGUgcm93IHN0YXlzIGluIGl0c1xuICogcHJldmlvdXMgc3RhdGUuXG4gKi9cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FwcC1jb250cmlidXRpb25zLXBhbmVsJyxcbiAgaW1wb3J0czogW1JlYWN0aXZlRm9ybXNNb2R1bGUsIFJvdXRlckxpbmssIERhdGVQaXBlLCBOZ0NsYXNzLCBMb2FkaW5nSW5kaWNhdG9yLCBUcmFuc2xhdGVQaXBlXSxcbiAgdGVtcGxhdGVVcmw6ICcuL2NvbnRyaWJ1dGlvbnMtcGFuZWwuaHRtbCcsXG4gIHN0eWxlVXJsOiAnLi9jb250cmlidXRpb25zLXBhbmVsLnNjc3MnLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbn0pXG5leHBvcnQgY2xhc3MgQ29udHJpYnV0aW9uc1BhbmVsIGltcGxlbWVudHMgT25Jbml0IHtcbiAgcHJpdmF0ZSByZWFkb25seSBzaGVsdGVycyA9IGluamVjdChTaGVsdGVyR2F0ZXdheSk7XG4gIHByaXZhdGUgcmVhZG9ubHkgaG9zdCA9IGluamVjdDxFbGVtZW50UmVmPEhUTUxFbGVtZW50Pj4oRWxlbWVudFJlZik7XG4gIC8qKiBpMThuLWV0LWVuOiB0aGUgcGFuZWwgY29weSBpcyBmdWxseSBjYXRhbG9nLWRyaXZlbjsgYSBzd2l0Y2hlciBjaGFuZ2VcbiAgICogIHJlLXJlbmRlcnMgdGhlIHBhbmVsIChsYWJlbHMgKyB0aGUgcmUtZGVyaXZlZCBlcnJvciBiYW5uZXJzKS4gVGhlIC9taW5lXG4gICAqICBkYXRhIGlzIE5PVCBsb2NhbGUtc2NvcGVkIOKAlCBubyByZS1mZXRjaC4gKi9cbiAgcmVhZG9ubHkgaTE4biA9IGluamVjdChJMThuU2VydmljZSk7XG4gIC8qKiBUaGUgYWN0aXZlIHJvdXRlOiB0aGUgZWRpdCBlbnRyeSBidWlsZHMgaXRzIC9zdWJtaXQ/ZWRpdD08aWQ+IFVybFRyZWVcbiAgICogIGFnYWluc3QgdGhpcyByb3V0ZSdzIHNuYXBzaG90IChNNSkuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgcm91dGUgPSBpbmplY3QoQWN0aXZhdGVkUm91dGUpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNkciA9IGluamVjdChDaGFuZ2VEZXRlY3RvclJlZik7XG5cbiAgLyoqIFRoZSBsYW5ndWFnZSBzd2l0Y2hlciBzZXRzIEkxOG5TZXJ2aWNlLmxvY2FsZTogcmUtZGVyaXZlIHRoZSBzdG9yZWRcbiAgICogIGVycm9yIGJhbm5lcnMgKHJhdyBlcnJvcnMpIGFuZCByZS1yZW5kZXIgZXZlcnkgfCB0IGxhYmVsLiBza2lwKDEpIOKAlFxuICAgKiAgb25seSBhIHJlYWwgc3dpdGNoIHRyaWdnZXJzIGl0ICh0aGUgZ3VpZGFuY2UtcGFnZSBpZGlvbSkuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgbG9jYWxlU3ViID0gdG9PYnNlcnZhYmxlKHRoaXMuaTE4bi5sb2NhbGUpXG4gICAgLnBpcGUoc2tpcCgxKSlcbiAgICAuc3Vic2NyaWJlKCgpID0+IHRoaXMuY2RyLm1hcmtGb3JDaGVjaygpKTtcblxuICAvLyAtLS0tIHNoZWx0ZXJzIGxpc3QgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiogbnVsbCA9IGxvYWRpbmc7IFtdID0gbG9hZGVkIGFuZCBlbXB0eS4gVGhlIC9taW5lIHByb2plY3Rpb24gY2FycmllcyB0aGVcbiAgICogIHJldmlldyBzdGF0ZSAoY29tbXVuaXR5LXJldmlldy1xdWV1ZSkg4oCUIGJhZGdlcyArIHRoZSBhZG1pbiBub3RlLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc2hlbHRlclJvd3MgPSBzaWduYWw8TWluZVNoZWx0ZXJEdG9bXSB8IG51bGw+KG51bGwpO1xuICAvKiogTG9hZCBmYWlsdXJlOiB0aGUgUkFXIGVycm9yIChub24tbnVsbCAtPiBlcnJvciBzdGF0ZSB3aXRoIFJldHJ5KSDigJRcbiAgICogIHRoZSBiYW5uZXIgdGV4dCBpcyByZS1kZXJpdmVkIHRocm91Z2ggdGhlIGFjdGl2ZSBsb2NhbGUuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBzaGVsdGVyTG9hZEVycm9yID0gc2lnbmFsPHVua25vd24gfCBudWxsPihudWxsKTtcblxuICAvLyAtLS0tIHR3by1zdGVwIGRlbGV0ZSBzdGF0ZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiogVGhlIHR3by1zdGVwIGRlbGV0ZSBjb25maXJtOiB0aGUgYXJtZWQgc2hlbHRlciBpZCAobm8gd2luZG93LmNvbmZpcm0pLlxuICAgKiAgVGhlIHNoYXJlZCBDb25maXJtQWN0aW9uIG93bnMgdGhlIHN0YXRlIG1hY2hpbmUsIHRoZSBmb2N1cyBtb3ZlIG9udG9cbiAgICogIENvbmZpcm0gYW5kIHRoZSBmb2N1cyByZXN0b3JlIHRvIERlbGV0ZSBvbiBjYW5jZWwuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBzaGVsdGVyRGVsZXRlQ29uZmlybSA9IG5ldyBDb25maXJtQWN0aW9uPG51bWJlcj4odGhpcy5ob3N0Lm5hdGl2ZUVsZW1lbnQpO1xuXG4gIC8vIC0tLS0gaW5mbyByZXF1ZXN0IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qKiBUaGUgcm93IHdob3NlIGlubGluZSBpbmZvLXJlcXVlc3QgcGFuZWwgaXMgb3BlbiAobnVsbCA9IGNsb3NlZCkg4oCUXG4gICAqICBvbmUgaW5saW5lIHBhbmVsIGF0IGEgdGltZSwgbGlrZSB0aGUgZWRpdCBmb3Jtcy4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGluZm9Gb3IgPSBzaWduYWw8bnVtYmVyIHwgbnVsbD4obnVsbCk7XG4gIC8qKiBUaGUgcmVwbHkgZWRpdG9yOiByZXF1aXJlZCAobm9uLWJsYW5rIOKAlCB0aGUgc2hhcmVkIGJsYW5rIHZhbGlkYXRvciksXG4gICAqICBhdCBtb3N0IDIwMDAgY2hhcmFjdGVycyAodGhlIFYxOSBib3VuZCkuICovXG4gIHJlYWRvbmx5IHJlcGx5TWVzc2FnZSA9IG5ldyBGb3JtQ29udHJvbCgnJywge1xuICAgIG5vbk51bGxhYmxlOiB0cnVlLFxuICAgIHZhbGlkYXRvcnM6IFtWYWxpZGF0b3JzLnJlcXVpcmVkLCBuYW1lQmxhbmtWYWxpZGF0b3IsIFZhbGlkYXRvcnMubWF4TGVuZ3RoKDIwMDApXSxcbiAgfSk7XG5cbiAgLy8gLS0tLSByb3ctbGV2ZWwgbXV0YXRpb24gZXJyb3JzIChiYWNrZW5kIHJlamVjdGVkIGFuIGVkaXQvZGVsZXRlKSAtLS0tLS0tLS1cbiAgLyoqIFRoZSBSQVcgZXJyb3IgcGVyIHJvdyDigJQgdGhlIGJhbm5lciB0ZXh0IGlzIHJlLWRlcml2ZWQgdGhyb3VnaCB0aGVcbiAgICogIGFjdGl2ZSBsb2NhbGUgYXQgcmVuZGVyIHRpbWUgKHNoZWx0ZXJSb3dFcnJvck1lc3NhZ2UpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc2hlbHRlclJvd0Vycm9yID0gc2lnbmFsPHsgaWQ6IG51bWJlcjsgZXJyb3I6IHVua25vd24gfSB8IG51bGw+KG51bGwpO1xuXG4gIHByb3RlY3RlZCByZWFkb25seSBidXN5ID0gc2lnbmFsKGZhbHNlKTtcblxuICAvKiogUGFuZWwtbG9jYWwgYmFkZ2UgbGFiZWwgKGkxOG4tZXQtZW4pOiByZWdpc3RyeSByb3dzIGNhcnJ5IHRoZWlyXG4gICAqICByZWdpc3RyeSBsYWJlbCwgVVNFUiByb3dzIHRoZSB0cnVzdC1zdGF0ZSBsYWJlbC4gVGhlIHNoYXJlZFxuICAgKiAgc2hlbHRlci1jb3B5IGxhYmVscyBhcmUgbm90IGNhdGFsb2cga2V5cyAobWFwL2RldGFpbC9hZG1pbiBzdGlsbCB1c2VcbiAgICogIHRoZW0pLCBzbyB0aGlzIHBhbmVsIHJlbmRlcnMgaXRzIG93biB0cmFuc2xhdGVkIHNldC4gKi9cbiAgcHJvdGVjdGVkIHRydXN0QmFkZ2VMYWJlbChyb3c6IE1pbmVTaGVsdGVyRHRvKTogc3RyaW5nIHtcbiAgICBpZiAocm93LnNvdXJjZSA9PT0gJ1BBQVNFVEVBTUVUJykge1xuICAgICAgcmV0dXJuIHRoaXMuaTE4bi50KCdhY2NvdW50LmNvbnRyaWIuc291cmNlLnBhYXN0ZWFtZXQnKTtcbiAgICB9XG4gICAgaWYgKHJvdy5zb3VyY2UgPT09ICdNVU5JQ0lQQUxJVFknKSB7XG4gICAgICByZXR1cm4gdGhpcy5pMThuLnQoJ2FjY291bnQuY29udHJpYi5zb3VyY2UubXVuaWNpcGFsaXR5Jyk7XG4gICAgfVxuICAgIHN3aXRjaCAocm93LnJldmlld1N0YXR1cykge1xuICAgICAgY2FzZSAnTkVXJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuaTE4bi50KCdhY2NvdW50LmNvbnRyaWIuYmFkZ2UubmV3Jyk7XG4gICAgICBjYXNlICdDT05GSVJNRUQnOlxuICAgICAgICByZXR1cm4gdGhpcy5pMThuLnQoJ2FjY291bnQuY29udHJpYi5iYWRnZS5jb25maXJtZWQnKTtcbiAgICAgIGNhc2UgJ1JFSkVDVEVEJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuaTE4bi50KCdhY2NvdW50LmNvbnRyaWIuYmFkZ2UucmVqZWN0ZWQnKTtcbiAgICB9XG4gIH1cblxuICAvKiogVGhlIHRydXN0IGJhZGdlIHRvbmU6IE5FVyBhbWJlciwgUkVKRUNURUQgZGFuZ2VyLCBDT05GSVJNRUQgZ3JlZW4uICovXG4gIHByb3RlY3RlZCByZWFkb25seSBjb21tdW5pdHlCYWRnZUNsYXNzID0gY29tbXVuaXR5QmFkZ2VDbGFzc1NoYXJlZDtcblxuICAvKiogVGhlIGxvY2FsaXplZCByZXBvcnQtY291bnQgcGhyYXNlIGZvciB0aGUgaGlkZGVuLXJvdyBtYXJrXG4gICAqICAoXCIxIHJlcG9ydFwiIC8gXCI1IHJlcG9ydHNcIjsgRU4vRVQvUlUgcGx1cmFsIHJ1bGVzKS4gKi9cbiAgcHJpdmF0ZSByZXBvcnRDb3VudFBocmFzZShuOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAodGhpcy5pMThuLmxvY2FsZSgpKSB7XG4gICAgICBjYXNlICdldCc6XG4gICAgICAgIHJldHVybiBuID09PSAxID8gJzEgdGVhdGFtaW5lJyA6IGAke259IHRlYXRhbWlzdGA7XG4gICAgICBjYXNlICdydSc6IHtcbiAgICAgICAgY29uc3QgdGVucyA9IG4gJSAxMDA7XG4gICAgICAgIGNvbnN0IG9uZXMgPSBuICUgMTA7XG4gICAgICAgIGNvbnN0IHdvcmQgPVxuICAgICAgICAgIHRlbnMgPj0gMTEgJiYgdGVucyA8PSAxNCA/ICfQvtGC0YfRkdGC0L7QsicgOiBvbmVzID09PSAxID8gJ9C+0YLRh9GR0YInIDogb25lcyA+PSAyICYmIG9uZXMgPD0gNCA/ICfQvtGC0YfRkdGC0LAnIDogJ9C+0YLRh9GR0YLQvtCyJztcbiAgICAgICAgcmV0dXJuIGAke259ICR7d29yZH1gO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGAke259IHJlcG9ydCR7biA9PT0gMSA/ICcnIDogJ3MnfWA7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEF1dG8taGlkZGVuIHJvdyBjb3B5ICh1c2VyLWNvbnRyaWJ1dGlvbnMsIHNoZWx0ZXItdHJ1c3QtYW5kLXJlcG9ydHMpOlxuICAgKiB0aGUgb3duZXIncyBsaXN0IGluY2x1ZGVzIElOQUNUSVZFIChhdXRvLWhpZGRlbikgcm93cywgbWFya2VkIHdpdGggdGhlXG4gICAqIGNvbW11bml0eSBub24tZXhpc3RlbmNlIHJlcG9ydCBjb3VudC4gUmVzdG9yZSBpcyBhZG1pbi1vbmx5IOKAlCB0aGUgdXNlclxuICAgKiBVSSBvZmZlcnMgbm8gcmVzdG9yZSBhY3Rpb24sIHNvIHRoZSBtYXJrIGlzIHRoZSByb3cncyBvbmx5IG5ldyBlbGVtZW50LlxuICAgKiBTdXBwcmVzc2VkIGZvciBSRUpFQ1RFRCByb3dzIChjb21tdW5pdHktcmV2aWV3LXF1ZXVlKTogYSByZWplY3Rpb25cbiAgICogYWxzbyBmbGlwcyB0aGUgc3RhdHVzIHRvIElOQUNUSVZFLCBidXQgdGhlIFwiUmVqZWN0ZWRcIiBiYWRnZSArIHRoZVxuICAgKiBhZG1pbidzIHJlYXNvbiBleHBsYWluIHRoZSBzdGF0ZSDigJQgdGhlIGF1dG8taGlkZSBtYXJrIHdvdWxkIGJlIG5vaXNlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGhpZGRlblRleHQocm93OiBNaW5lU2hlbHRlckR0byk6IHN0cmluZyB8IG51bGwge1xuICAgIGlmIChyb3cuc3RhdHVzICE9PSAnSU5BQ1RJVkUnIHx8IHJvdy5yZXZpZXdTdGF0dXMgPT09ICdSRUpFQ1RFRCcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5pMThuLnQoJ2FjY291bnQuY29udHJpYi5oaWRkZW4nLCB7XG4gICAgICBjb3VudDogdGhpcy5yZXBvcnRDb3VudFBocmFzZShyb3cubm9uZXhpc3RlbnRSZXBvcnRzKSxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIC0tLS0gc2hlbHRlciBlZGl0OiB0aGUgc2hhcmVkIC9zdWJtaXQgZm9ybSAoTTUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBUaGUgaW5saW5lIGVkaXQgZm9ybSBpcyBnb25lIChNNSk6IEVkaXQgaXMgYSByb3V0ZXJMaW5rIHRvXG4gIC8vIC9zdWJtaXQ/ZWRpdD08aWQ+IOKAlCB0aGUgZnVsbCBjcmVhdGlvbiBmb3JtIGluIGVkaXQgbW9kZSAoc2FtZSBmaWVsZHMsXG4gIC8vIHNhbWUgbG9jYXRpb24gY2FwdHVyZSBtb2RlcyksIHByZWZpbGxlZCB3aXRoIHRoZSByb3cncyB2YWx1ZXMuIFRoZVxuICAvLyBhY2NvdW50IGFyZWEgaXMgbm8gbG9uZ2VyIHdoZXJlIHNoZWx0ZXIgZWRpdHMgaGFwcGVuLlxuXG4gIC8qKlxuICAgKiBUaGUgRWRpdCBlbnRyeSAoTTUpOiB0aGUgc2hhcmVkIC9zdWJtaXQgZm9ybSBpbiBlZGl0IG1vZGUsIG9uZSBVcmxUcmVlXG4gICAqIHBlciByb3cuIFRoZSBVcmxUcmVlIGZvcm0gaXMgcmVxdWlyZWQgaGVyZTogdGhpcyBBbmd1bGFyIHZlcnNpb24nc1xuICAgKiByb3V0ZXJMaW5rIGlucHV0IGlzIGBzdHJpbmcgfCBzdHJpbmdbXSB8IFVybFRyZWVgLCBhbmQgTkVJVEhFUiBwbGFpblxuICAgKiBmb3JtIGNhbiBjYXJyeSBxdWVyeSBwYXJhbXMg4oCUIHRoZSBhcnJheSBmb3JtIG1pc3JlYWRzIGFuIG9wdGlvbnMgb2JqZWN0XG4gICAqIGFzIGEgcm91dGUgc2VnbWVudCwgdGhlIHN0cmluZyBmb3JtIFVSTC1lbmNvZGVzIHRoZSAnPycuIHJvdy5pZCBpcyBhXG4gICAqIG51bWVyaWMgcHJpbWFyeSBrZXksIHNvIFN0cmluZygpIGlzIGxvc3NsZXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGVkaXRMaW5rKGlkOiBudW1iZXIpOiBVcmxUcmVlIHtcbiAgICByZXR1cm4gY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdCh0aGlzLnJvdXRlLnNuYXBzaG90LCBbJy9zdWJtaXQnXSwgeyBlZGl0OiBTdHJpbmcoaWQpIH0pO1xuICB9XG5cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgdGhpcy5sb2FkU2hlbHRlcnMoKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMubG9jYWxlU3ViLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIExvYWRpbmcgKHBlciBsaXN0LCBpbmRlcGVuZGVudClcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBsb2FkU2hlbHRlcnMoKTogdm9pZCB7XG4gICAgdGhpcy5zaGVsdGVyUm93cy5zZXQobnVsbCk7XG4gICAgdGhpcy5zaGVsdGVyTG9hZEVycm9yLnNldChudWxsKTtcbiAgICB0aGlzLnNoZWx0ZXJzXG4gICAgICAubWluZSgpXG4gICAgICAudGhlbigocm93cykgPT4gdGhpcy5zaGVsdGVyUm93cy5zZXQocm93cykpXG4gICAgICAuY2F0Y2goKGVycm9yOiB1bmtub3duKSA9PiB0aGlzLnNoZWx0ZXJMb2FkRXJyb3Iuc2V0KGVycm9yKSk7XG4gIH1cblxuICAvKiogVGhlIGxpc3QtbG9hZCBlcnJvciBiYW5uZXIsIHJlLWRlcml2ZWQgdGhyb3VnaCB0aGUgYWN0aXZlIGxvY2FsZS4gKi9cbiAgcHJvdGVjdGVkIHNoZWx0ZXJMb2FkRXJyb3JNZXNzYWdlKCk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IGVycm9yID0gdGhpcy5zaGVsdGVyTG9hZEVycm9yKCk7XG4gICAgcmV0dXJuIGVycm9yID09PSBudWxsID8gbnVsbCA6IGJhbm5lck1lc3NhZ2UoZXJyb3IsICdzaGVsdGVyJywgKGtleSkgPT4gdGhpcy5pMThuLnQoa2V5KSk7XG4gIH1cblxuICAvKiogVGhlIHJvdy1sZXZlbCBlcnJvciBiYW5uZXIgdGV4dCwgcmUtZGVyaXZlZCB0aHJvdWdoIHRoZSBhY3RpdmUgbG9jYWxlLiAqL1xuICBwcm90ZWN0ZWQgc2hlbHRlclJvd0Vycm9yTWVzc2FnZSgpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMuc2hlbHRlclJvd0Vycm9yKCk7XG4gICAgcmV0dXJuIHN0YXRlID09PSBudWxsID8gbnVsbCA6IGJhbm5lck1lc3NhZ2Uoc3RhdGUuZXJyb3IsICdzaGVsdGVyJywgKGtleSkgPT4gdGhpcy5pMThuLnQoa2V5KSk7XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIFNoZWx0ZXIgcm93czogdmlldyAocm91dGVyTGluayBpbiB0aGUgdGVtcGxhdGUpLCBlZGl0IChyb3V0ZXJMaW5rIHRvXG4gIC8vIHRoZSBzaGFyZWQgL3N1Ym1pdD9lZGl0PTxpZD4gZm9ybSwgTTUpLCBkZWxldGVcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKiBTdGVwIDEgb2YgdGhlIHR3by1zdGVwIGRlbGV0ZTogYXJtIHRoZSBjb25maXJtIHN0cmlwLiAqL1xuICByZXF1ZXN0RGVsZXRlU2hlbHRlcihpZDogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5zaGVsdGVyRGVsZXRlQ29uZmlybS5hcm0oaWQpO1xuICB9XG5cbiAgY2FuY2VsRGVsZXRlU2hlbHRlcigpOiB2b2lkIHtcbiAgICB0aGlzLnNoZWx0ZXJEZWxldGVDb25maXJtLmNhbmNlbCgpO1xuICB9XG5cbiAgLyoqIFN0ZXAgMjogREVMRVRFIC9hcGkvc2hlbHRlcnMve2lkfTsgdGhlIHJvdyBpcyByZW1vdmVkIGZyb20gdGhlIGxpc3QgaW5cbiAgICogIHBsYWNlLiAqL1xuICBhc3luYyBjb25maXJtRGVsZXRlU2hlbHRlcihpZDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuYnVzeSgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYnVzeS5zZXQodHJ1ZSk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2hlbHRlcnMucmVtb3ZlKGlkKTtcbiAgICAgIHRoaXMuc2hlbHRlclJvd3MudXBkYXRlKChyb3dzKSA9PiAocm93cyA/PyBbXSkuZmlsdGVyKChyKSA9PiByLmlkICE9PSBpZCkpO1xuICAgICAgdGhpcy5zaGVsdGVyUm93RXJyb3IudXBkYXRlKChlKSA9PiAoZSAmJiBlLmlkID09PSBpZCA/IG51bGwgOiBlKSk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIHRoaXMuc2hlbHRlclJvd0Vycm9yLnNldCh7IGlkLCBlcnJvciB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKHRoaXMuaW5mb0ZvcigpID09PSBpZCkge1xuICAgICAgICB0aGlzLmNsb3NlSW5mbygpO1xuICAgICAgfVxuICAgICAgdGhpcy5zaGVsdGVyRGVsZXRlQ29uZmlybS5kaXNhcm0oKTtcbiAgICAgIHRoaXMuYnVzeS5zZXQoZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gSW5mbyByZXF1ZXN0OiB0aGUgbW9kZXJhdG9yJ3MgcXVlc3Rpb24gKyB0aGUgb25lLXRpbWUgcmVwbHlcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKipcbiAgICogVG9nZ2xlIHRoZSBpbmxpbmUgaW5mby1yZXF1ZXN0IHBhbmVsIGZvciBhIHJvdyB0aGF0IGNhcnJpZXMgYSByZXF1ZXN0LlxuICAgKiBBbiBPUEVOIHJlcXVlc3Qgc2hvd3MgdGhlIHF1ZXN0aW9uICsgdGhlIHJlcGx5IGZvcm0gKHRoZSBhbnN3ZXIgaXNcbiAgICogb25lLXRpbWUpOyBhbiBBTlNXRVJFRCByZXF1ZXN0IHNob3dzIHRoZSBxdWVzdGlvbiArIHlvdXIgcmVwbHlcbiAgICogcmVhZC1vbmx5ICh0aGUgcm93IGlzIGtlcHQgYWZ0ZXIgdGhlIHJlcGx5IOKAlCBhdWRpdCBwb3N0dXJlLCBhbmQgYVxuICAgKiBzZWNvbmQgcmVwbHkgaXMgYSBzZXJ2ZXItc2lkZSA0MDkpLlxuICAgKi9cbiAgdG9nZ2xlSW5mbyhyb3c6IE1pbmVTaGVsdGVyRHRvKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaW5mb0ZvcigpID09PSByb3cuaWQpIHtcbiAgICAgIHRoaXMuY2xvc2VJbmZvKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMucmVwbHlNZXNzYWdlLnJlc2V0KCcnKTtcbiAgICB0aGlzLnJlcGx5TWVzc2FnZS5tYXJrQXNVbnRvdWNoZWQoKTtcbiAgICB0aGlzLmluZm9Gb3Iuc2V0KHJvdy5pZCk7XG4gIH1cblxuICAvKiogQ2xvc2UgdGhlIG9wZW4gaW5mbyBwYW5lbCAodG9nZ2xlLCBlZGl0IGZvcm0sIGRlbGV0ZSwgdGFiIGxlYXZlKS4gKi9cbiAgY2xvc2VJbmZvKCk6IHZvaWQge1xuICAgIHRoaXMuaW5mb0Zvci5zZXQobnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogUE9TVCAvYXBpL3NoZWx0ZXJzL3tpZH0vaW5mby1yZXF1ZXN0L3JlcGx5ICgyMDQsIHRoZSBvbmUtdGltZSBhbnN3ZXIpLlxuICAgKiBTdWNjZXNzIHBhdGNoZXMgdGhlIHJvdyBpbiBwbGFjZSDigJQgdGhlIDIwNCBib2R5IGlzIGVtcHR5LCBzbyB0aGUgcmVwbHlcbiAgICogdGV4dCBpcyB0aGUgZm9ybSB2YWx1ZSBhbmQgdGhlIHRpbWVzdGFtcCBsb2NhbCBcIm5vd1wiICh0aGUgcmV2aWV3IGVkaXQnc1xuICAgKiBsb2NhbCB1cGRhdGVkQXQgYnVtcCBwcmVjZWRlbnQpOyBhIDQwOSAoYW5zd2VyZWQgbWVhbndoaWxlKSBvciA0MDAvNDAzXG4gICAqIHNob3dzIHRoZSByb3cgZXJyb3IgYW5kIHRoZSByb3cgc3RheXMgYXMgaXQgd2FzLlxuICAgKi9cbiAgYXN5bmMgc2VuZEluZm9SZXBseShyb3c6IE1pbmVTaGVsdGVyRHRvKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcmVxdWVzdCA9IHJvdy5pbmZvUmVxdWVzdDtcbiAgICBpZiAocmVxdWVzdCA9PT0gbnVsbCB8fCByZXF1ZXN0LnJlcGx5TWVzc2FnZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuOyAvLyBub3RoaW5nIG9wZW4gdG8gYW5zd2VyICh0aGUgZm9ybSBvbmx5IHJlbmRlcnMgd2hpbGUgb3BlbilcbiAgICB9XG4gICAgY29uc3QgbWVzc2FnZSA9IHRoaXMucmVwbHlNZXNzYWdlLnZhbHVlLnRyaW0oKTtcbiAgICBpZiAobWVzc2FnZSA9PT0gJycgfHwgbWVzc2FnZS5sZW5ndGggPiAyMDAwKSB7XG4gICAgICB0aGlzLnJlcGx5TWVzc2FnZS5tYXJrQXNUb3VjaGVkKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLmJ1c3koKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmJ1c3kuc2V0KHRydWUpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNoZWx0ZXJzLnJlcGx5SW5mb1JlcXVlc3Qocm93LmlkLCBtZXNzYWdlKTtcbiAgICAgIHRoaXMuc2hlbHRlclJvd3MudXBkYXRlKChyb3dzKSA9PlxuICAgICAgICAocm93cyA/PyBbXSkubWFwKChyKSA9PlxuICAgICAgICAgIHIuaWQgPT09IHJvdy5pZCAmJiByLmluZm9SZXF1ZXN0ICE9PSBudWxsXG4gICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICAuLi5yLFxuICAgICAgICAgICAgICAgIGluZm9SZXF1ZXN0OiB7XG4gICAgICAgICAgICAgICAgICAuLi5yLmluZm9SZXF1ZXN0LFxuICAgICAgICAgICAgICAgICAgcmVwbHlNZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgcmVwbGllZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgOiByLFxuICAgICAgICApLFxuICAgICAgKTtcbiAgICAgIHRoaXMuc2hlbHRlclJvd0Vycm9yLnVwZGF0ZSgoZSkgPT4gKGUgJiYgZS5pZCA9PT0gcm93LmlkID8gbnVsbCA6IGUpKTtcbiAgICAgIHRoaXMuY2xvc2VJbmZvKCk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIHRoaXMuc2hlbHRlclJvd0Vycm9yLnNldCh7IGlkOiByb3cuaWQsIGVycm9yIH0pO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLmJ1c3kuc2V0KGZhbHNlKTtcbiAgICB9XG4gIH1cbn1cbiIsIjxkaXYgY2xhc3M9XCJjb250cmlidXRpb25zXCI+XG4gIDwhLS0gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09IFNoZWx0ZXJzID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAtLT5cbiAgPGgzIGNsYXNzPVwiY29udHJpYnV0aW9ucy1zdWJ0aXRsZVwiPnt7ICdhY2NvdW50LmNvbnRyaWIuc2hlbHRlcnMnIHwgdCB9fTwvaDM+XG5cbiAgQGlmIChzaGVsdGVyUm93cygpID09PSBudWxsICYmIHNoZWx0ZXJMb2FkRXJyb3IoKSA9PT0gbnVsbCkge1xuICAgIDxhcHAtbG9hZGluZy1pbmRpY2F0b3IgY2xhc3M9XCJjb250cmlidXRpb25zLXN0YXRlXCIgW21lc3NhZ2VdPVwiJ2FjY291bnQuY29udHJpYi5sb2FkaW5nJyB8IHRcIiAvPlxuICB9IEBlbHNlIGlmIChzaGVsdGVyTG9hZEVycm9yKCkgIT09IG51bGwpIHtcbiAgICA8cCBjbGFzcz1cImNvbnRyaWJ1dGlvbnMtc3RhdGUgY29udHJpYnV0aW9ucy1zdGF0ZS0tZXJyb3JcIj57eyBzaGVsdGVyTG9hZEVycm9yTWVzc2FnZSgpIH19PC9wPlxuICAgIDxkaXYgY2xhc3M9XCJjb250cmliLWFjdGlvbnNcIj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi0tZ2hvc3RcIiAoY2xpY2spPVwibG9hZFNoZWx0ZXJzKClcIj5cbiAgICAgICAge3sgJ2FjY291bnQucmV0cnknIHwgdCB9fVxuICAgICAgPC9idXR0b24+XG4gICAgPC9kaXY+XG4gIH0gQGVsc2UgaWYgKChzaGVsdGVyUm93cygpID8/IFtdKS5sZW5ndGggPT09IDApIHtcbiAgICA8IS0tIFNlbGYtY29udGFpbmVkIHN5bW1ldHJpYyBlbXB0eSBzdGF0ZTogdGhlIHdyYXBwZXIgY2FycmllcyB0aGVcbiAgICAgICAgIHZlcnRpY2FsIHJoeXRobSAoZXF1YWwgd2hpdGVzcGFjZSBhYm92ZSB0aGUgbGluZSBhbmQgYmVsb3cgdGhlXG4gICAgICAgICBidXR0b24pLCBzbyB0aGUgcGFuZWwncyBmbGV4IGdhcCBhcHBsaWVzIG9uY2UsIHRvIHRoZSBibG9jay4gLS0+XG4gICAgPGRpdiBjbGFzcz1cImNvbnRyaWJ1dGlvbnMtZW1wdHlcIj5cbiAgICAgIDxwIGNsYXNzPVwiY29udHJpYnV0aW9ucy1zdGF0ZVwiPnt7ICdhY2NvdW50LmNvbnRyaWIuZW1wdHknIHwgdCB9fTwvcD5cbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cmliLWFjdGlvbnNcIj5cbiAgICAgICAgPGEgcm91dGVyTGluaz1cIi9zdWJtaXRcIiBjbGFzcz1cImJ0biBidG4tLWdob3N0XCI+e3sgJ2FjY291bnQuY29udHJpYi5lbXB0eUN0YScgfCB0IH19PC9hPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIH0gQGVsc2Uge1xuICAgIDwhLS0gbWFwLWNyaXNpcy1hY3Rpb25zOiB0aGUgc3VibWlzc2lvbiBlbnRyeSByZW5kZXJzIGZvciBFVkVSWVxuICAgICAgICAgYXV0aGVudGljYXRlZCB1c2VyLCBub3Qgb25seSB0aGUgZW1wdHkgc3RhdGUgKHRoZSBwYW5lbCBpcyBhbHJlYWR5XG4gICAgICAgICBhdXRoLWdhdGVkIGJ5IHRoZSAvYWNjb3VudCByb3V0ZSDigJQgdGhlIGd1YXJkcyBzdGF5IHRoZSBzaW5nbGVcbiAgICAgICAgIGVuZm9yY2VtZW50IHBvaW50KS4gLS0+XG4gICAgPGRpdiBjbGFzcz1cImNvbnRyaWItYWN0aW9uc1wiPlxuICAgICAgPGEgcm91dGVyTGluaz1cIi9zdWJtaXRcIiBjbGFzcz1cImJ0biBidG4tLWdob3N0XCI+e3sgJ2FjY291bnQuY29udHJpYi5zdWJtaXQnIHwgdCB9fTwvYT5cbiAgICA8L2Rpdj5cbiAgICA8dWwgY2xhc3M9XCJjb250cmliLWxpc3RcIj5cbiAgICAgIEBmb3IgKHJvdyBvZiBzaGVsdGVyUm93cygpID8/IFtdOyB0cmFjayByb3cuaWQpIHtcbiAgICAgICAgPGxpIGNsYXNzPVwiY29udHJpYi1yb3dcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udHJpYi1yb3dfX2luZm9cIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY29udHJpYi1yb3dfX3RpdGxlXCI+XG4gICAgICAgICAgICAgIHt7IHJvdy5uYW1lIH19XG4gICAgICAgICAgICAgIDwhLS0gVHJ1c3Qgc3RhdGUgKGNvbW11bml0eS1yZXZpZXctcXVldWUgRDUpOiB0aGUgL21pbmUgYmFkZ2VcbiAgICAgICAgICAgICAgICAgICAocGFuZWwtbG9jYWwgdHJhbnNsYXRlZCBzZXQg4oCUIHRydXN0QmFkZ2VMYWJlbCkuIC0tPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImNvbnRyaWItYmFkZ2VcIiBbbmdDbGFzc109XCJjb21tdW5pdHlCYWRnZUNsYXNzKHJvdylcIj5cbiAgICAgICAgICAgICAgICB7eyB0cnVzdEJhZGdlTGFiZWwocm93KSB9fVxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgIDwhLS0gSW5mbyByZXF1ZXN0OiBhbiBPUEVOIG1vZGVyYXRvciBxdWVzdGlvbiDigJRcbiAgICAgICAgICAgICAgICAgICB0aGUgYW1iZXIgYWN0aW9uIGNoaXA7IGFuc3dlcmVkIHJlcXVlc3RzIGNhcnJ5IG5vIGNoaXBcbiAgICAgICAgICAgICAgICAgICAodGhlIGV4Y2hhbmdlIHN0YXlzIHZpZXdhYmxlIHZpYSB0aGUgSW5mbyBidXR0b24pLiAtLT5cbiAgICAgICAgICAgICAgQGlmIChyb3cuaW5mb1JlcXVlc3QgJiYgcm93LmluZm9SZXF1ZXN0LnJlcGx5TWVzc2FnZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY29udHJpYi1iYWRnZSBjb250cmliLWJhZGdlLS1pbmZvXCI+XG4gICAgICAgICAgICAgICAgICB7eyAnYWNjb3VudC5jb250cmliLmluZm9SZXF1ZXN0JyB8IHQgfX1cbiAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDwhLS0gQXV0by1oaWRkZW4gYnkgZml2ZSBub24tZXhpc3RlbmNlIHJlcG9ydHMgKHVzZXItXG4gICAgICAgICAgICAgICAgIGNvbnRyaWJ1dGlvbnMpOiB0aGUgb3duZXIncyBsaXN0IGtlZXBzIGhpZGRlbiByb3dzLCBtYXJrZWRcbiAgICAgICAgICAgICAgICAgd2l0aCB0aGUgY29tbXVuaXR5IHJlcG9ydCBjb3VudC4gU3VwcHJlc3NlZCBmb3IgUkVKRUNURURcbiAgICAgICAgICAgICAgICAgcm93cyAodGhlIGJhZGdlICsgdGhlIGFkbWluIG5vdGUgY2FycnkgdGhhdCBzdGF0ZSkuIFRoZXJlXG4gICAgICAgICAgICAgICAgIGlzIGRlbGliZXJhdGVseSBOTyByZXN0b3JlIGFjdGlvbiDigJQgb25seSBhbiBhZG1pbiBjYW5cbiAgICAgICAgICAgICAgICAgcmVzdG9yZS4gLS0+XG4gICAgICAgICAgICBAaWYgKGhpZGRlblRleHQocm93KTsgYXMgaGlkZGVuKSB7XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY29udHJpYi1yb3dfX2hpZGRlblwiPnt7IGhpZGRlbiB9fTwvc3Bhbj5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDwhLS0gVGhlIGFkbWluJ3MgcmV2aWV3IG5vdGUgKGNvbW11bml0eS1yZXZpZXctcXVldWUpOiBzZXQgYnkgYVxuICAgICAgICAgICAgICAgICBtb2RlcmF0b3Igd2hlbiByZWplY3RpbmcgKG9yIG9uIGEgc3RhdHVzIGNoYW5nZSkuIC0tPlxuICAgICAgICAgICAgQGlmIChyb3cucmV2aWV3Tm90ZSkge1xuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImNvbnRyaWItcm93X19ub3RlXCI+XG4gICAgICAgICAgICAgICAge3sgJ2FjY291bnQuY29udHJpYi5hZG1pbk5vdGUnIHwgdDogeyBub3RlOiByb3cucmV2aWV3Tm90ZSB9IH19XG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDwhLS0gTWFya2VkIGluYWNjdXJhdGU6IHRoZSBzaW5nbGUtc291cmNlZCB3YXJuaW5nXG4gICAgICAgICAgICAgICAgIGxpbmUg4oCUIHRoZSByb3cgc3RheXMgdmlzaWJsZSwgdGhlIGZsYWcgaXMgdGhlIHRyZWF0bWVudC4gLS0+XG4gICAgICAgICAgICBAaWYgKHJvdy5pbmFjY3VyYXRlKSB7XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY29udHJpYi1yb3dfX25vdGVcIj57eyAnYWNjb3VudC5jb250cmliLmluYWNjdXJhdGUnIHwgdCB9fTwvc3Bhbj5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY29udHJpYi1yb3dfX21ldGFcIj57eyByb3cuY3JlYXRlZEF0IHwgZGF0ZTogJ21lZGl1bSc6IHVuZGVmaW5lZDogaTE4bi5sb2NhbGUoKSB9fTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udHJpYi1yb3dfX2FjdGlvbnNcIj5cbiAgICAgICAgICAgIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3NoZWx0ZXJzJywgcm93LmlkXVwiIGNsYXNzPVwiYnRuIGJ0bi0tZ2hvc3RcIj5cbiAgICAgICAgICAgICAge3sgJ2FjY291bnQuY29udHJpYi52aWV3JyB8IHQgfX1cbiAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIEBpZiAocm93LmluZm9SZXF1ZXN0KSB7XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICBjbGFzcz1cImJ0biBidG4tLWdob3N0XCJcbiAgICAgICAgICAgICAgICAoY2xpY2spPVwidG9nZ2xlSW5mbyhyb3cpXCJcbiAgICAgICAgICAgICAgICBbZGlzYWJsZWRdPVwiYnVzeSgpXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIHt7IGluZm9Gb3IoKSA9PT0gcm93LmlkID8gKCdhY2NvdW50LmNvbnRyaWIuaW5mb0Nsb3NlJyB8IHQpIDogKCdhY2NvdW50LmNvbnRyaWIuaW5mbycgfCB0KSB9fVxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDwhLS0gTTU6IEVkaXQgb3BlbnMgdGhlIFNIQVJFRCAvc3VibWl0IGZvcm0gaW4gZWRpdCBtb2RlIOKAlCB0aGVcbiAgICAgICAgICAgICAgICAgZnVsbCBjcmVhdGlvbiBmb3JtIChzYW1lIGZpZWxkcywgc2FtZSBsb2NhdGlvbiBjYXB0dXJlXG4gICAgICAgICAgICAgICAgIG1vZGVzKSBwcmVmaWxsZWQgd2l0aCB0aGlzIHJvdydzIHZhbHVlcy4gVGhlIGFjY291bnQgYXJlYVxuICAgICAgICAgICAgICAgICBubyBsb25nZXIgaG9zdHMgYSByZWR1Y2VkIGlubGluZSBlZGl0IGZvcm0uIFN0cmluZyBmb3JtXG4gICAgICAgICAgICAgICAgIChub3QgdGhlIGFycmF5IGZvcm0pOiByb3cuaWQgaXMgYSBudW1lcmljIHByaW1hcnkga2V5LCBzb1xuICAgICAgICAgICAgICAgICBubyBlbmNvZGluZyBjb25jZXJucy4gLS0+XG4gICAgICAgICAgICA8YSBbcm91dGVyTGlua109XCJlZGl0TGluayhyb3cuaWQpXCIgY2xhc3M9XCJidG4gYnRuLS1naG9zdFwiPlxuICAgICAgICAgICAgICB7eyAnYWNjb3VudC5lZGl0JyB8IHQgfX1cbiAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIEBpZiAoIXNoZWx0ZXJEZWxldGVDb25maXJtLmlzQXJtZWQocm93LmlkKSkge1xuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgY2xhc3M9XCJidG4gYnRuLS1naG9zdCBidG4tLWRhbmdlclwiXG4gICAgICAgICAgICAgICAgW2F0dHIuZGF0YS1jb25maXJtLXRyaWdnZXJdPVwicm93LmlkXCJcbiAgICAgICAgICAgICAgICAoY2xpY2spPVwicmVxdWVzdERlbGV0ZVNoZWx0ZXIocm93LmlkKVwiXG4gICAgICAgICAgICAgICAgW2Rpc2FibGVkXT1cImJ1c3koKVwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICB7eyAnYWNjb3VudC5jb250cmliLmRlbGV0ZScgfCB0IH19XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgfVxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgQGlmIChzaGVsdGVyUm93RXJyb3IoKT8uaWQgPT09IHJvdy5pZCkge1xuICAgICAgICAgICAgPHAgY2xhc3M9XCJyb3ctZXJyb3JcIiByb2xlPVwiYWxlcnRcIj57eyBzaGVsdGVyUm93RXJyb3JNZXNzYWdlKCkgfX08L3A+XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgPCEtLSB0d28tc3RlcCBkZWxldGUgY29uZmlybSAobm8gd2luZG93LmNvbmZpcm0pLiBUaGUgc2hhcmVkXG4gICAgICAgICAgICAgICBDb25maXJtQWN0aW9uIG93bnMgdGhlIHN0YXRlIG1hY2hpbmUsIHRoZSBmb2N1cyBtb3ZlIG9udG8gQ29uZmlybVxuICAgICAgICAgICAgICAgYW5kIHRoZSBmb2N1cyByZXN0b3JlIHRvIERlbGV0ZSBvbiBjYW5jZWw7IHRoZSBwcm9tcHRcbiAgICAgICAgICAgICAgIGlzIGEgbGl2ZSByZWdpb24gc28gYXJtaW5nIGlzIGFubm91bmNlZC4gLS0+XG4gICAgICAgICAgQGlmIChzaGVsdGVyRGVsZXRlQ29uZmlybS5pc0FybWVkKHJvdy5pZCkpIHtcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb25maXJtLXN0cmlwXCI+XG4gICAgICAgICAgICAgIDxzcGFuIHJvbGU9XCJzdGF0dXNcIj57eyAnYWNjb3VudC5jb250cmliLmRlbGV0ZUNvbmZpcm0nIHwgdCB9fTwvc3Bhbj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRyaWItYWN0aW9uc1wiPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgY2xhc3M9XCJidG4gYnRuLS1naG9zdCBidG4tLWRhbmdlclwiXG4gICAgICAgICAgICAgICAgICBbYXR0ci5kYXRhLWNvbmZpcm0tZm9jdXNdPVwicm93LmlkXCJcbiAgICAgICAgICAgICAgICAgIChjbGljayk9XCJjb25maXJtRGVsZXRlU2hlbHRlcihyb3cuaWQpXCJcbiAgICAgICAgICAgICAgICAgIFtkaXNhYmxlZF09XCJidXN5KClcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHt7IGJ1c3koKSA/ICgnYWNjb3VudC5kZWxldGluZycgfCB0KSA6ICgnYWNjb3VudC5jb250cmliLmRlbGV0ZUNvbmZpcm1CdXR0b24nIHwgdCkgfX1cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgIGNsYXNzPVwiYnRuIGJ0bi0tZ2hvc3RcIlxuICAgICAgICAgICAgICAgICAgKGNsaWNrKT1cImNhbmNlbERlbGV0ZVNoZWx0ZXIoKVwiXG4gICAgICAgICAgICAgICAgICBbZGlzYWJsZWRdPVwiYnVzeSgpXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICB7eyAnYWNjb3VudC5jYW5jZWwnIHwgdCB9fVxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIH1cblxuICAgICAgICAgIDwhLS0gSW5mbyByZXF1ZXN0OiB0aGUgbW9kZXJhdG9yJ3MgcXVlc3Rpb24gKyB0aGVcbiAgICAgICAgICAgICAgIG9uZS10aW1lIHJlcGx5IChvcGVuKSBvciB0aGUgc3RvcmVkIHJlcGx5IChhbnN3ZXJlZCDigJQgdGhlIHJvd1xuICAgICAgICAgICAgICAgaXMga2VwdCBhZnRlciB0aGUgcmVwbHksIGF1ZGl0IHBvc3R1cmUpLiAtLT5cbiAgICAgICAgICBAaWYgKGluZm9Gb3IoKSA9PT0gcm93LmlkKSB7XG4gICAgICAgICAgICBAaWYgKHJvdy5pbmZvUmVxdWVzdDsgYXMgcmVxKSB7XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250cmliLWluZm9cIj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzcz1cImNvbnRyaWItaW5mb19fcVwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJjb250cmliLWluZm9fX2xhYmVsXCI+e3sgJ2FjY291bnQuY29udHJpYi5pbmZvUXVlc3Rpb24nIHwgdCB9fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIHt7IHJlcS5tZXNzYWdlIH19XG4gICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY29udHJpYi1yb3dfX21ldGFcIj57eyByZXEucmVxdWVzdGVkQXQgfCBkYXRlOiAnbWVkaXVtJzogdW5kZWZpbmVkOiBpMThuLmxvY2FsZSgpIH19PC9zcGFuPlxuICAgICAgICAgICAgICAgIEBpZiAocmVxLnJlcGx5TWVzc2FnZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJjb250cmliLWluZm8tcmVwbHlcIj57eyAnYWNjb3VudC5jb250cmliLnJlcGx5TGFiZWwnIHwgdCB9fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYVxuICAgICAgICAgICAgICAgICAgICAgIGlkPVwiY29udHJpYi1pbmZvLXJlcGx5XCJcbiAgICAgICAgICAgICAgICAgICAgICBtYXhsZW5ndGg9XCIyMDAwXCJcbiAgICAgICAgICAgICAgICAgICAgICBbZm9ybUNvbnRyb2xdPVwicmVwbHlNZXNzYWdlXCJcbiAgICAgICAgICAgICAgICAgICAgPjwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgICAgIEBpZiAocmVwbHlNZXNzYWdlLnRvdWNoZWQgJiYgcmVwbHlNZXNzYWdlLmludmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cImZpZWxkLWVycm9yXCI+e3sgJ2FjY291bnQuY29udHJpYi5yZXBseVJlcXVpcmVkJyB8IHQgfX08L3A+XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRyaWItYWN0aW9uc1wiPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJidG4gYnRuLS1wcmltYXJ5XCJcbiAgICAgICAgICAgICAgICAgICAgICAoY2xpY2spPVwic2VuZEluZm9SZXBseShyb3cpXCJcbiAgICAgICAgICAgICAgICAgICAgICBbZGlzYWJsZWRdPVwiYnVzeSgpIHx8IHJlcGx5TWVzc2FnZS5pbnZhbGlkXCJcbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIHt7IGJ1c3koKSA/ICgnYWNjb3VudC5zZW5kaW5nJyB8IHQpIDogKCdhY2NvdW50LmNvbnRyaWIuc2VuZFJlcGx5JyB8IHQpIH19XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJidG4gYnRuLS1naG9zdFwiXG4gICAgICAgICAgICAgICAgICAgICAgKGNsaWNrKT1cImNsb3NlSW5mbygpXCJcbiAgICAgICAgICAgICAgICAgICAgICBbZGlzYWJsZWRdPVwiYnVzeSgpXCJcbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIHt7ICdhY2NvdW50LmNhbmNlbCcgfCB0IH19XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgfSBAZWxzZSB7XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cImNvbnRyaWItaW5mb19fYVwiPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImNvbnRyaWItaW5mb19fbGFiZWxcIj57eyAnYWNjb3VudC5jb250cmliLnJlcGx5JyB8IHQgfX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIHt7IHJlcS5yZXBseU1lc3NhZ2UgfX1cbiAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY29udHJpYi1yb3dfX21ldGFcIj57eyByZXEucmVwbGllZEF0IHwgZGF0ZTogJ21lZGl1bSc6IHVuZGVmaW5lZDogaTE4bi5sb2NhbGUoKSB9fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgPC9saT5cbiAgICAgIH1cbiAgICA8L3VsPlxuICB9XG48L2Rpdj5cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLFNBQ0UsMkJBQUFBLDBCQUNBLHFCQUFBQyxvQkFDQSxhQUFBQyxZQUNBLGNBQUFDLGFBQ0EsVUFBQUMsU0FFQSxVQUFBQyxlQUNLO0FBQ1AsU0FBUyxnQkFBQUMscUJBQW9CO0FBQzdCLFNBQVMsZUFBQUMsY0FBYSx1QkFBQUMsc0JBQXFCLGNBQUFDLG1CQUFrQjtBQUM3RCxTQUFTLFFBQVEsY0FBQUMsbUJBQWtCO0FBQ25DLFNBQVMsUUFBQUMsYUFBWTs7O0FFWnJCLFNBQ0UseUJBQ0EsbUJBQ0EsV0FDQSxZQUNBLFFBRUEsY0FDSztBQUNQLFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsVUFBVSxlQUFlO0FBQ2xDLFNBQVMsYUFBYSxxQkFBcUIsa0JBQWtCO0FBQzdELFNBQVMsZ0JBQWdCLFlBQTBCLGlDQUFpQztBQUNwRixTQUFTLFlBQVk7QTs7Ozs7Ozs7QUNSakIsSUFBQSx1QkFBQSxHQUFBLHlCQUFBLENBQUE7Ozs7QUFBbUQsSUFBQSx3QkFBQSxXQUFBLHlCQUFBLEdBQUEsR0FBQSx5QkFBQSxDQUFBOzs7Ozs7QUFFbkQsSUFBQSw0QkFBQSxHQUFBLEtBQUEsQ0FBQTtBQUEwRCxJQUFBLG9CQUFBLENBQUE7QUFBK0IsSUFBQSwwQkFBQTtBQUN6RixJ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QUEsRUFBeUIsZUFBQSwwQkFBQSxHQUFBLElBQUEseUJBQUEsQ0FBQTs7QUFBekIsSUFBQSx3QkFBQTtBQU9GLElBQUEsd0JBQUEsQ0FBQTtBQUFBLElBQUEsNEJBQUEsdUJBQUEsSUFBQSxFQUFBO0FBS3NCLElBQUEsd0JBQUEsQ0FBQTtBQUFBLElBQUEsZ0NBQUEsMEJBQUEsR0FBQSxJQUFBLHFCQUFBLENBQUE7QUFRcEIsSUFBQSx3QkFBQSxDQUFBO0FBQUEsSUFBQSx5QkFBQSxZQUFBLE9BQUEsS0FBQSxDQUFBO0FBRUEsSUFBQSx3QkFBQTtBQUFBLElBQUEsaUNBQUEsS0FBQSxPQUFBLEtBQUEsSUFBQSwwQkFBQSxJQUFBLElBQUEsaUJBQUEsSUFBQSwwQkFBQSxJQUFBLElBQUEseUJBQUEsR0FBQSxHQUFBO0FBTUEsSUFBQSx3QkFBQSxDQUFBO0FBQUEsSUFBQSx5QkFBQSxZQUFBLE9BQUEsS0FBQSxLQUFBLE9BQUEsZUFBQSxNQUFBO0FBRUEsSUFBQSx3QkFBQTtBQUFBLElBQUEsaUNBQUEsS0FBQSxPQUFBLGVBQUEsU0FBQSwwQkFBQSxJQUFBLElBQUEsb0JBQUEsOEJBQUEsSUFBQUMsTUFBQSxPQUFBLGVBQUEsTUFBQSxDQUFBLENBQUEsSUFBQSwwQkFBQSxJQUFBLElBQUEsb0JBQUEsR0FBQSxHQUFBO0FBVUEsSUFBQSx3QkFBQSxDQUFBO0FBQUEsSUFBQSx5QkFBQSxZQUFBLE9BQUEsS0FBQSxDQUFBO0FBRUEsSUFBQSx3QkFBQTtBQUFBLElBQUEsaUNBQUEsS0FBQSwwQkFBQSxJQUFBLElBQUEsZ0JBQUEsR0FBQSxHQUFBOzs7Ozs7QUFJSixJQUFBLDZCQUFBLEdBQUEsVUFBQSxFQUFBO0FBR0UsSUFBQSx5QkFBQSxTQUFBLFNBQUEsNEZBQUE7QUFBQSxNQUFBLDRCQUFBLElBQUE7QUFBQSxZQUFBLFNBQUEsNEJBQUEsQ0FBQTtBQUFBLGFBQUEsMEJBQVMsT0FBQSxVQUFBLENBQVc7SUFBQSxDQUFBO0FBR3BCLElBQUEscUJBQUEsQ0FBQTs7OztBQU9GLElBQUEsMkJBQUE7Ozs7QUFU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QSxnQkFBQSxRQUFBLEdBQUEsYUFBQSxHQUFBLENBQUEsTUFBQSxzQkFBQSxRQUFBLFNBQUEsR0FBQSxhQUFBLEdBQUEsQ0FBQSxPQUFBLGtCQUFBLEdBQUEsQ0FBQSxNQUFBLG9CQUFBLFFBQUEsWUFBQSxnQkFBQSxvQkFBQSxHQUFBLGFBQUEsR0FBQSxDQUFBLE1BQUEsMEJBQUEsUUFBQSxTQUFBLEdBQUEsYUFBQSxHQUFBLENBQUEsUUFBQSxVQUFBLEdBQUEsT0FBQSxnQkFBQSxHQUFBLFNBQUEsVUFBQSxHQUFBLENBQUEsUUFBQSxVQUFBLEdBQUEsT0FBQSxjQUFBLEdBQUEsT0FBQSxHQUFBLENBQUEsT0FBQSxrQkFBQSxHQUFBLENBQUEsTUFBQSxvQkFBQSxRQUFBLFNBQUEsYUFBQSxPQUFBLGdCQUFBLFNBQUEsR0FBQSxlQUFBLGFBQUEsR0FBQSxDQUFBLE1BQUEsMEJBQUEsUUFBQSxTQUFBLEdBQUEsYUFBQSxHQUFBLENBQUEsR0FBQSxZQUFBLEdBQUEsQ0FBQSxRQUFBLFVBQUEsR0FBQSxPQUFBLGdCQUFBLEdBQUEsVUFBQSxHQUFBLENBQUEsT0FBQSxtQkFBQSxHQUFBLENBQUEsTUFBQSxxQkFBQSxRQUFBLFFBQUEsZ0JBQUEsaUJBQUEsYUFBQSxXQUFBLEdBQUEsZUFBQSxhQUFBLEdBQUEsQ0FBQSxNQUFBLDJCQUFBLFFBQUEsU0FBQSxHQUFBLGFBQUEsR0FBQSxDQUFBLEdBQUEsWUFBQSxHQUFBLENBQUEsT0FBQSxrQkFBQSxHQUFBLENBQUEsTUFBQSxvQkFBQSxRQUFBLE9BQUEsYUFBQSxNQUFBLGdCQUFBLE9BQUEsR0FBQSxlQUFBLGFBQUEsR0FBQSxDQUFBLE1BQUEsMEJBQUEsUUFBQSxTQUFBLEdBQUEsYUFBQSxHQUFBLENBQUEsT0FBQSxtQkFBQSxHQUFBLENBQUEsTUFBQSxxQkFBQSxRQUFBLFFBQUEsZ0JBQUEsaUJBQUEsYUFBQSxXQUFBLEdBQUEsZUFBQSxhQUFBLEdBQUEsQ0FBQSxNQUFBLDJCQUFBLFFBQUEsU0FBQSxHQUFBLGFBQUEsR0FBQSxDQUFBLE9BQUEsZ0JBQUEs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WUFBQUMsd0JBQUEsR0FBQSxhQUFBLEVBQUEsQ0FBQTtFQUFBO0FBQUEsR0FBQSxPQUFBLGNBQUEsZUFBQSxjQUFBLG9CQUFBLEtBQUEsSUFBQSxDQUFBO0FBQUEsR0FBQSxPQUFBLGNBQUEsZUFBQSxlQUFBLFlBQUEsT0FBQSxZQUFBLElBQUEsR0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLE1BQUEsb0JBQUEsRUFBQSxTQUFBLENBQUE7QUFBQSxHQUFBOyIsIm5hbWVzIjpbIkNoYW5nZURldGVjdGlvblN0cmF0ZWd5IiwiQ2hhbmdlRGV0ZWN0b3JSZWYiLCJDb21wb25lbnQiLCJFbGVtZW50UmVmIiwiaW5qZWN0Iiwic2lnbmFsIiwidG9PYnNlcnZhYmxlIiwiRm9ybUNvbnRyb2wiLCJSZWFjdGl2ZUZvcm1zTW9kdWxlIiwiVmFsaWRhdG9ycyIsIlJvdXRlckxpbmsiLCJza2lwIiwiX2MwIiwiaW5qZWN0IiwiRWxlbWVudFJlZiIsIkNoYW5nZURldGVjdG9yUmVmIiwidG9PYnNlcnZhYmxlIiwic2tpcCIsInNpZ25hbCIsIkZvcm1Db250cm9sIiwiVmFsaWRhdG9ycyIsIlJlYWN0aXZlRm9ybXNNb2R1bGUiLCJSb3V0ZXJMaW5rIiwiQ29tcG9uZW50IiwiQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kiLCJpMCIsImkxIl0sImRlYnVnSWQiOiI5OWM3YWEzMS0wZGIzLTU5MzEtOTMwZC0wOGY1MmE3N2JmMTIifQ==