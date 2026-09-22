import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-KN2NYBDB.js");import {
  GeolocationError,
  getCurrentPositionHighAccuracy,
  haversineKm
} from "/chunk-SXXU3R3Q.js";
import {
  ESTONIA_CENTER,
  ESTONIA_ZOOM,
  LeafletService,
  SHELTER_ZOOM
} from "/chunk-QTZH4P7Z.js";
import {
  ListState
} from "/chunk-Q2EZNHWI.js";
import {
  ShelterGateway
} from "/chunk-32CK32SO.js";
import {
  communityBadgeClass,
  communityReportsText,
  hasCommunityReports,
  hasReports,
  hasTrustBadges,
  isPrivateLocation,
  lastVerifiedText,
  occupancyText,
  openStatusBadgeText,
  recencyText,
  reportedBadgeText,
  sourceTrustLabel,
  straightLineText,
  submitterVerificationKey
} from "/chunk-CKLEX4Y2.js";
import {
  LoadingIndicator
} from "/chunk-Y3BTRGLF.js";
import {
  AuthStore
} from "/chunk-QATQGZY5.js";
import "/chunk-T7PPW65J.js";
import {
  ApiError,
  BannerComponent,
  bannerMessage
} from "/chunk-WYACYUPC.js";
import {
  I18nService,
  MONTH_ABBREVS,
  TranslatePipe
} from "/chunk-LJMNRHVK.js";
import "/chunk-FDMHZOCR.js";

// src/app/features/shelter/shelter-detail-page.ts
import { afterEveryRender, ChangeDetectionStrategy as ChangeDetectionStrategy2, Component as Component2, inject, signal, viewChild } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import { DatePipe, NgClass } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_common.js?v=b78d4f20";
import { ActivatedRoute, RouterLink } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_router.js?v=b78d4f20";
import { FormControl, ReactiveFormsModule, Validators } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";

// src/app/shared/report-gauge.ts
import { ChangeDetectionStrategy, Component, computed, input } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";

// src/app/shared/gauge-math.ts
function gaugeAngle(share) {
  if (share === null || Number.isNaN(share)) {
    return null;
  }
  const clamped = Math.min(1, Math.max(0, share));
  return clamped * 180;
}

// src/app/shared/report-gauge.ts
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
function ReportGauge_Conditional_0_For_2_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275domElement(0, "wbr");
  }
}
function ReportGauge_Conditional_0_For_2_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275domElementStart(0, "span", 3);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275domElementEnd();
    i0.\u0275\u0275conditionalCreate(2, ReportGauge_Conditional_0_For_2_Conditional_2_Template, 1, 0, "wbr");
  }
  if (rf & 2) {
    const token_r1 = ctx.$implicit;
    const \u0275$index_4_r2 = ctx.$index;
    const \u0275$count_4_r3 = ctx.$count;
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(token_r1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(!(\u0275$index_4_r2 === \u0275$count_4_r3 - 1) ? 2 : -1);
  }
}
function ReportGauge_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275domElementStart(0, "p", 0);
    i0.\u0275\u0275repeaterCreate(1, ReportGauge_Conditional_0_For_2_Template, 3, 2, null, null, i0.\u0275\u0275repeaterTrackByIndex);
    i0.\u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275domProperty("id", ctx_r3.captionId());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275repeater(ctx_r3.textTokens());
  }
}
function ReportGauge_Conditional_1_Conditional_12_For_2_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275domElement(0, "wbr");
  }
}
function ReportGauge_Conditional_1_Conditional_12_For_2_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275domElementStart(0, "span", 3);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275domElementEnd();
    i0.\u0275\u0275conditionalCreate(2, ReportGauge_Conditional_1_Conditional_12_For_2_Conditional_2_Template, 1, 0, "wbr");
  }
  if (rf & 2) {
    const token_r5 = ctx.$implicit;
    const \u0275$index_37_r6 = ctx.$index;
    const \u0275$count_37_r7 = ctx.$count;
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(token_r5);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(!(\u0275$index_37_r6 === \u0275$count_37_r7 - 1) ? 2 : -1);
  }
}
function ReportGauge_Conditional_1_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275domElementStart(0, "figcaption", 14);
    i0.\u0275\u0275repeaterCreate(1, ReportGauge_Conditional_1_Conditional_12_For_2_Template, 3, 2, null, null, i0.\u0275\u0275repeaterTrackByIndex);
    i0.\u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275repeater(ctx_r3.textTokens());
  }
}
function ReportGauge_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275domElementStart(0, "figure", 4);
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275domElementStart(1, "svg", 5);
    i0.\u0275\u0275domElement(2, "path", 6);
    i0.\u0275\u0275domElementStart(3, "g", 7);
    i0.\u0275\u0275domElement(4, "line", 8)(5, "path", 9);
    i0.\u0275\u0275domElementEnd();
    i0.\u0275\u0275domElement(6, "circle", 10);
    i0.\u0275\u0275domElementEnd();
    i0.\u0275\u0275namespaceHTML();
    i0.\u0275\u0275domElementStart(7, "div", 11)(8, "span", 12);
    i0.\u0275\u0275text(9);
    i0.\u0275\u0275domElementEnd();
    i0.\u0275\u0275domElementStart(10, "span", 13);
    i0.\u0275\u0275text(11);
    i0.\u0275\u0275domElementEnd()();
    i0.\u0275\u0275conditionalCreate(12, ReportGauge_Conditional_1_Conditional_12_Template, 3, 0, "figcaption", 14);
    i0.\u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275classProp("report-gauge--arrow", ctx_r3.describedBy() !== null);
    i0.\u0275\u0275attribute("aria-describedby", ctx_r3.describedBy());
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275attribute("transform", "rotate(" + ctx_r3.angle() + " 100 100)");
    i0.\u0275\u0275advance(6);
    i0.\u0275\u0275textInterpolate(ctx_r3.leftLabel());
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(ctx_r3.rightLabel());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r3.describedBy() === null ? 12 : -1);
  }
}
function ReportGauge_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275domElementStart(0, "p", 2);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(ctx_r3.emptyText());
  }
}
var ReportGauge = class _ReportGauge {
  /** The weighted share toward the right end (0..1, server-derived);
   *  null = no fresh reports → the explicit empty state. */
  share = input(
    null,
    ...ngDevMode ? [{ debugName: "share" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The visible + accessible count text ("Reports: 3 open, 2 closed"). */
  text = input(
    "",
    ...ngDevMode ? [{ debugName: "text" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * The count line's wrap units (placement pass): one per comma-separated
   * count phrase ("Reports: 3 open, 2 closed" → ["Reports: 3 open, ",
   * "2 closed"]). Each token renders as one unbreakable inline unit, so
   * the line wraps BETWEEN counts — never inside a phrase ("0 space
   * available" can't split) — while the concatenated text stays the
   * string verbatim (the visible + accessible text is unchanged).
   */
  textTokens = computed(
    () => {
      const text = this.text();
      if (text === "")
        return [];
      return text.split(", ").map((part, i, parts) => i < parts.length - 1 ? `${part}, ` : part);
    },
    ...ngDevMode ? [{ debugName: "textTokens" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The left end's label (e.g. "Closed" / "Space available"). */
  leftLabel = input(
    "",
    ...ngDevMode ? [{ debugName: "leftLabel" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The right end's label (e.g. "Open" / "Full"). */
  rightLabel = input(
    "",
    ...ngDevMode ? [{ debugName: "rightLabel" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The empty-state line (no fresh reports). */
  emptyText = input(
    "",
    ...ngDevMode ? [{ debugName: "emptyText" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /**
   * Detached-caption association: when set, the figure renders WITHOUT
   * its figcaption and carries aria-describedby pointing at the element
   * with this id — the count line rendered elsewhere (the page's
   * captions column) stays the gauge's accessible text, exactly one
   * copy in the DOM.
   */
  describedBy = input(
    null,
    ...ngDevMode ? [{ debugName: "describedBy" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Caption-only mode: render just the count line (no figure, no SVG) —
   *  the page's captions column composes the arrows and the lines
   *  separately (the arrows row above, the lines stacked in a column
   *  below). */
  captionOnly = input(
    false,
    ...ngDevMode ? [{ debugName: "captionOnly" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The id of the count-line element in caption-only mode (the target
   *  of the arrow's aria-describedby). */
  captionId = input(
    null,
    ...ngDevMode ? [{ debugName: "captionId" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The needle angle in degrees (null with the share → empty state). */
  angle = computed(
    () => gaugeAngle(this.share()),
    ...ngDevMode ? [{ debugName: "angle" }] : (
      /* istanbul ignore next */
      []
    )
  );
  static \u0275fac = function ReportGauge_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ReportGauge)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _ReportGauge, selectors: [["app-report-gauge"]], inputs: { share: [1, "share"], text: [1, "text"], leftLabel: [1, "leftLabel"], rightLabel: [1, "rightLabel"], emptyText: [1, "emptyText"], describedBy: [1, "describedBy"], captionOnly: [1, "captionOnly"], captionId: [1, "captionId"] }, decls: 3, vars: 1, consts: [[1, "report-gauge__text", "report-gauge__text--standalone", 3, "id"], [1, "report-gauge", 3, "report-gauge--arrow"], ["role", "status", 1, "report-gauge__empty"], [1, "report-gauge__token"], [1, "report-gauge"], ["viewBox", "0 0 200 112", "aria-hidden", "true", "focusable", "false", 1, "report-gauge__svg"], ["d", "M 20 100 A 80 80 0 0 1 180 100", 1, "report-gauge__arc"], [1, "report-gauge__needle"], ["x1", "100", "y1", "100", "x2", "38", "y2", "100"], ["d", "M 38 100 L 50 94 L 50 106 Z"], ["cx", "100", "cy", "100", "r", "5", 1, "report-gauge__hub"], [1, "report-gauge__ends"], [1, "report-gauge__end", "report-gauge__end--left"], [1, "report-gauge__end", "report-gauge__end--right"], [1, "report-gauge__text"]], template: function ReportGauge_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275conditionalCreate(0, ReportGauge_Conditional_0_Template, 3, 1, "p", 0)(1, ReportGauge_Conditional_1_Template, 13, 7, "figure", 1)(2, ReportGauge_Conditional_2_Template, 2, 1, "p", 2);
    }
    if (rf & 2) {
      i0.\u0275\u0275conditional(ctx.captionOnly() ? 0 : ctx.share() !== null ? 1 : 2);
    }
  }, styles: ['@charset "UTF-8";\n\n\n.report-gauge[_ngcontent-%COMP%] {\n  margin: 0 0 var(--%NS%space-12);\n  max-width: 240px;\n}\n.report-gauge--arrow[_ngcontent-%COMP%] {\n  margin: 0;\n}\n.report-gauge__svg[_ngcontent-%COMP%] {\n  display: block;\n  width: 100%;\n  height: auto;\n}\n.report-gauge__arc[_ngcontent-%COMP%] {\n  fill: none;\n  stroke: var(--%NS%color-border);\n  stroke-width: 3px;\n  stroke-linecap: round;\n}\n.report-gauge__needle[_ngcontent-%COMP%]   line[_ngcontent-%COMP%] {\n  stroke: var(--%NS%color-brand);\n  stroke-width: 3px;\n  stroke-linecap: round;\n}\n.report-gauge__needle[_ngcontent-%COMP%]   path[_ngcontent-%COMP%] {\n  fill: var(--%NS%color-brand);\n}\n.report-gauge__hub[_ngcontent-%COMP%] {\n  fill: var(--%NS%color-brand);\n}\n.report-gauge__ends[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  padding: var(--%NS%space-4) var(--%NS%space-8) 0;\n  color: var(--%NS%color-muted);\n}\n.report-gauge__text[_ngcontent-%COMP%] {\n  margin: var(--%NS%space-4) 0 0;\n  font-weight: var(--%NS%font-weight-medium);\n}\n.report-gauge__text--standalone[_ngcontent-%COMP%] {\n  margin: 0;\n}\n.report-gauge__token[_ngcontent-%COMP%] {\n  white-space: nowrap;\n}\n.report-gauge__empty[_ngcontent-%COMP%] {\n  margin: 0;\n  color: var(--%NS%color-muted);\n}\n/*# sourceMappingURL=report-gauge.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(ReportGauge, [{
    type: Component,
    args: [{ selector: "app-report-gauge", imports: [], changeDetection: ChangeDetectionStrategy.OnPush, template: `@if (captionOnly()) {
  <!-- Caption-only mode: the count line rendered on its own (the page's
       captions column). The arrow's figure points at this element via
       aria-describedby (its describedBy input = this captionId) \u2014 the
       line is the gauge's accessible text, kept exactly one copy in the
       DOM. The <wbr> between every pair of tokens is the line's break
       opportunity: the tokens are adjacent in the markup (Angular
       control flow strips the loop's whitespace) and each is nowrap, so
       without the wbr the whole line would be unbreakable and overflow
       its box instead of wrapping between the counts. -->
  <p class="report-gauge__text report-gauge__text--standalone" [id]="captionId()">
    @for (token of textTokens(); track $index; let last = $last) {
      <span class="report-gauge__token">{{ token }}</span>
      @if (!last) {
        <wbr />
      }
    }
  </p>
} @else if (share() !== null) {
  <!-- Detached mode (describedBy set): the arrow only \u2014 no figcaption;
       the figure references the external caption with aria-describedby,
       which keeps the caption the gauge's accessible text (one copy). -->
  <figure
    class="report-gauge"
    [class.report-gauge--arrow]="describedBy() !== null"
    [attr.aria-describedby]="describedBy()"
  >
    <!-- The semicircle: the arc from the left end (20,100) over the top
         to the right end (180,100); the needle starts pointing LEFT
         (0\xB0) and rotates clockwise around the hub (100,100) \u2014 90\xB0 is
         straight up, 180\xB0 points right. Decorative: the meaning is the
         count line (the figcaption below in attached mode, the external
         caption in detached mode) + the end labels. -->
    <svg class="report-gauge__svg" viewBox="0 0 200 112" aria-hidden="true" focusable="false">
      <path class="report-gauge__arc" d="M 20 100 A 80 80 0 0 1 180 100" />
      <g class="report-gauge__needle" [attr.transform]="'rotate(' + angle() + ' 100 100)'">
        <line x1="100" y1="100" x2="38" y2="100" />
        <path d="M 38 100 L 50 94 L 50 106 Z" />
      </g>
      <circle class="report-gauge__hub" cx="100" cy="100" r="5" />
    </svg>
    <div class="report-gauge__ends">
      <span class="report-gauge__end report-gauge__end--left">{{ leftLabel() }}</span>
      <span class="report-gauge__end report-gauge__end--right">{{ rightLabel() }}</span>
    </div>
    @if (describedBy() === null) {
      <figcaption class="report-gauge__text">
        @for (token of textTokens(); track $index; let last = $last) {
          <span class="report-gauge__token">{{ token }}</span>
          @if (!last) {
            <wbr />
          }
        }
      </figcaption>
    }
  </figure>
} @else {
  <p class="report-gauge__empty" role="status">{{ emptyText() }}</p>
}
`, styles: ['@charset "UTF-8";\n\n/* src/app/shared/report-gauge.scss */\n.report-gauge {\n  margin: 0 0 var(--space-12);\n  max-width: 240px;\n}\n.report-gauge--arrow {\n  margin: 0;\n}\n.report-gauge__svg {\n  display: block;\n  width: 100%;\n  height: auto;\n}\n.report-gauge__arc {\n  fill: none;\n  stroke: var(--color-border);\n  stroke-width: 3px;\n  stroke-linecap: round;\n}\n.report-gauge__needle line {\n  stroke: var(--color-brand);\n  stroke-width: 3px;\n  stroke-linecap: round;\n}\n.report-gauge__needle path {\n  fill: var(--color-brand);\n}\n.report-gauge__hub {\n  fill: var(--color-brand);\n}\n.report-gauge__ends {\n  display: flex;\n  justify-content: space-between;\n  padding: var(--space-4) var(--space-8) 0;\n  color: var(--color-muted);\n}\n.report-gauge__text {\n  margin: var(--space-4) 0 0;\n  font-weight: var(--font-weight-medium);\n}\n.report-gauge__text--standalone {\n  margin: 0;\n}\n.report-gauge__token {\n  white-space: nowrap;\n}\n.report-gauge__empty {\n  margin: 0;\n  color: var(--color-muted);\n}\n/*# sourceMappingURL=report-gauge.css.map */\n'] }]
  }], null, { share: [{ type: i0.Input, args: [{ isSignal: true, alias: "share", required: false }] }], text: [{ type: i0.Input, args: [{ isSignal: true, alias: "text", required: false }] }], leftLabel: [{ type: i0.Input, args: [{ isSignal: true, alias: "leftLabel", required: false }] }], rightLabel: [{ type: i0.Input, args: [{ isSignal: true, alias: "rightLabel", required: false }] }], emptyText: [{ type: i0.Input, args: [{ isSignal: true, alias: "emptyText", required: false }] }], describedBy: [{ type: i0.Input, args: [{ isSignal: true, alias: "describedBy", required: false }] }], captionOnly: [{ type: i0.Input, args: [{ isSignal: true, alias: "captionOnly", required: false }] }], captionId: [{ type: i0.Input, args: [{ isSignal: true, alias: "captionId", required: false }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(ReportGauge, { className: "ReportGauge", filePath: "src/app/shared/report-gauge.ts", lineNumber: 37 });
})();
(() => {
  const id = "src%2Fapp%2Fshared%2Freport-gauge.ts%40ReportGauge";
  function ReportGauge_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(ReportGauge, m.default, [i0], [Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && ReportGauge_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && ReportGauge_HmrLoad(d.timestamp)));
})();

// src/app/features/shelter/shelter-detail-page.ts
import * as i02 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i1 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_forms.js?v=b78d4f20";
var _c0 = ["mapEl"];
var _c1 = (a0) => ({ name: a0 });
var _c2 = (a0) => ({ distance: a0 });
var _c3 = (a0) => ({ returnUrl: a0 });
var _forTrack0 = ($index, $item) => $item.value;
function ShelterDetailPage_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "section", 1)(1, "h1", 3);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(4, "p", 4);
    i02.\u0275\u0275text(5);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(7, "a", 5);
    i02.\u0275\u0275text(8);
    i02.\u0275\u0275pipe(9, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 3, "detail.notFoundTitle"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(6, 5, "detail.notFoundBody"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(9, 7, "detail.backToMap"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_9_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "span", 19);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, ctx));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_9_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "span", 20);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "shelter.privateBadge"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_9_Conditional_4_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "span", 21);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r1 = i02.\u0275\u0275nextContext(2);
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(ctx_r1.reportedBadgeText(s_r1.nonexistentReports));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_9_Conditional_4_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "span", 22);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(ctx);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_9_Conditional_4_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "span", 23);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(4);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(ctx_r1.occupancyText(ctx));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_9_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275conditionalCreate(0, ShelterDetailPage_Conditional_1_Conditional_9_Conditional_4_Conditional_0_Template, 2, 1, "span", 21);
    i02.\u0275\u0275conditionalCreate(1, ShelterDetailPage_Conditional_1_Conditional_9_Conditional_4_Conditional_1_Template, 2, 1, "span", 22);
    i02.\u0275\u0275conditionalCreate(2, ShelterDetailPage_Conditional_1_Conditional_9_Conditional_4_Conditional_2_Template, 2, 1, "span", 23);
  }
  if (rf & 2) {
    let tmp_6_0;
    let tmp_7_0;
    const s_r1 = i02.\u0275\u0275nextContext();
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275conditional(ctx_r1.hasReports(s_r1) ? 0 : -1);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_6_0 = ctx_r1.openStatusBadgeText(s_r1.openStatus)) ? 1 : -1, tmp_6_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_7_0 = s_r1.occupancy) ? 2 : -1, tmp_7_0);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "span", 18);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(2, ShelterDetailPage_Conditional_1_Conditional_9_Conditional_2_Template, 3, 3, "span", 19);
    i02.\u0275\u0275conditionalCreate(3, ShelterDetailPage_Conditional_1_Conditional_9_Conditional_3_Template, 3, 3, "span", 20);
    i02.\u0275\u0275conditionalCreate(4, ShelterDetailPage_Conditional_1_Conditional_9_Conditional_4_Template, 3, 3);
  }
  if (rf & 2) {
    let tmp_6_0;
    const s_r1 = ctx;
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275property("ngClass", ctx_r1.communityBadgeClass(s_r1));
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.sourceTrustLabel(s_r1), " ");
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_6_0 = ctx_r1.submitterVerificationKey(s_r1)) ? 2 : -1, tmp_6_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(ctx_r1.isPrivateLocation(s_r1) ? 3 : -1);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(ctx_r1.hasTrustBadges(s_r1) ? 4 : -1);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_10_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 24);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "shelter.unverifiedWarning"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_10_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 24);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "account.contrib.inaccurate"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_10_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 25);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "shelter.privateNote"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275conditionalCreate(0, ShelterDetailPage_Conditional_1_Conditional_10_Conditional_0_Template, 3, 3, "p", 24);
    i02.\u0275\u0275conditionalCreate(1, ShelterDetailPage_Conditional_1_Conditional_10_Conditional_1_Template, 3, 3, "p", 24);
    i02.\u0275\u0275conditionalCreate(2, ShelterDetailPage_Conditional_1_Conditional_10_Conditional_2_Template, 3, 3, "p", 25);
  }
  if (rf & 2) {
    const s_r3 = ctx;
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275conditional(s_r3.source === "USER" && s_r3.reviewStatus === "NEW" ? 0 : -1);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(s_r3.inaccurate ? 1 : -1);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(ctx_r1.isPrivateLocation(s_r3) ? 2 : -1);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_11_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "div", 26)(1, "a", 27);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275text(3);
    i02.\u0275\u0275pipe(4, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(5, "a", 27);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275text(7);
    i02.\u0275\u0275pipe(8, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(9, "button", 28);
    i02.\u0275\u0275listener("click", function ShelterDetailPage_Conditional_1_Conditional_11_Conditional_0_Template_button_click_9_listener() {
      i02.\u0275\u0275restoreView(_r4);
      const ctx_r1 = i02.\u0275\u0275nextContext(3);
      return i02.\u0275\u0275resetView(ctx_r1.distanceFromMe());
    });
    i02.\u0275\u0275text(10);
    i02.\u0275\u0275pipe(11, "t");
    i02.\u0275\u0275pipe(12, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const s_r5 = i02.\u0275\u0275nextContext();
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275property("href", ctx_r1.navigateUrl(s_r5), i02.\u0275\u0275sanitizeUrl);
    i02.\u0275\u0275attribute("aria-label", i02.\u0275\u0275pipeBind2(2, 9, "detail.navigateAria", i02.\u0275\u0275pureFunction1(23, _c1, s_r5.name)));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(4, 12, "detail.navigate"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("href", ctx_r1.appleMapsUrl(s_r5), i02.\u0275\u0275sanitizeUrl);
    i02.\u0275\u0275attribute("aria-label", i02.\u0275\u0275pipeBind2(6, 14, "detail.appleMapsAria", i02.\u0275\u0275pureFunction1(25, _c1, s_r5.name)));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(8, 17, "detail.appleMaps"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("disabled", ctx_r1.distancePending());
    i02.\u0275\u0275attribute("aria-busy", ctx_r1.distancePending());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.distancePending() ? i02.\u0275\u0275pipeBind1(11, 19, "detail.distance.pending") : i02.\u0275\u0275pipeBind1(12, 21, "detail.distance.cta"), " ");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275conditionalCreate(0, ShelterDetailPage_Conditional_1_Conditional_11_Conditional_0_Template, 13, 27, "div", 26);
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275conditional(ctx_r1.hasCoordinates(ctx) ? 0 : -1);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 9);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(ctx);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_13_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 29);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r6 = i02.\u0275\u0275nextContext();
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(ctx_r1.coordinateLine(s_r6));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275conditionalCreate(0, ShelterDetailPage_Conditional_1_Conditional_13_Conditional_0_Template, 2, 1, "p", 29);
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275conditional(ctx_r1.hasCoordinates(ctx) ? 0 : -1);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 10);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind2(2, 1, "detail.distance.fromYou", i02.\u0275\u0275pureFunction1(4, _c2, ctx_r1.straightLineText(ctx_r1.distanceKm()))), " ");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 11);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(ctx);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_16_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 31);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r7 = i02.\u0275\u0275nextContext();
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.communityReportsText(s_r7.reportCount), " ");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 30);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(2, ShelterDetailPage_Conditional_1_Conditional_16_Conditional_2_Template, 2, 1, "p", 31);
  }
  if (rf & 2) {
    const s_r7 = ctx;
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(ctx_r1.lastVerifiedText(s_r7));
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(ctx_r1.hasCommunityReports(s_r7) ? 2 : -1);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-banner", 13);
  }
  if (rf & 2) {
    i02.\u0275\u0275property("message", ctx.text);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-loading-indicator", 17);
    i02.\u0275\u0275pipe(1, "t");
  }
  if (rf & 2) {
    i02.\u0275\u0275property("message", i02.\u0275\u0275pipeBind1(1, 1, "detail.loading"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_0_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 56);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r8 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(s_r8.description);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_0_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 57);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r8 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1("Capacity: ", s_r8.capacity);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "section", 32)(1, "h2", 55);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(4, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_0_Conditional_4_Template, 2, 1, "p", 56);
    i02.\u0275\u0275conditionalCreate(5, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_0_Conditional_5_Template, 2, 1, "p", 57);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r8 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 3, "detail.detailsHeading"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(s_r8.description ? 4 : -1);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(s_r8.capacity !== null ? 5 : -1);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_5_Conditional_0_For_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "button", 61);
    i02.\u0275\u0275listener("click", function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_5_Conditional_0_For_3_Template_button_click_0_listener() {
      const band_r10 = i02.\u0275\u0275restoreView(_r9).$implicit;
      const ctx_r1 = i02.\u0275\u0275nextContext(5);
      return i02.\u0275\u0275resetView(ctx_r1.reportBand(band_r10.value));
    });
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const band_r10 = ctx.$implicit;
    const s_r8 = i02.\u0275\u0275nextContext(3);
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275classProp("band-btn--active", s_r8.yourOccupancyBand === band_r10.value);
    i02.\u0275\u0275property("disabled", ctx_r1.reporting());
    i02.\u0275\u0275attribute("aria-pressed", s_r8.yourOccupancyBand === band_r10.value);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 5, band_r10.labelKey), " ");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_5_Conditional_0_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 60);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(5);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(ctx_r1.occupancyText(ctx));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_5_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 58);
    i02.\u0275\u0275pipe(1, "t");
    i02.\u0275\u0275repeaterCreate(2, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_5_Conditional_0_For_3_Template, 3, 7, "button", 59, _forTrack0);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(4, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_5_Conditional_0_Conditional_4_Template, 2, 1, "p", 60);
  }
  if (rf & 2) {
    let tmp_8_0;
    const s_r8 = i02.\u0275\u0275nextContext(2);
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275attribute("aria-label", i02.\u0275\u0275pipeBind1(1, 2, "detail.occupancy.aria"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275repeater(ctx_r1.BANDS);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional((tmp_8_0 = s_r8.occupancy) ? 4 : -1, tmp_8_0);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_5_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 35)(1, "p");
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(4, "a", 62);
    i02.\u0275\u0275text(5);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(4);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 3, "detail.verify.occupancy"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("queryParams", i02.\u0275\u0275pureFunction1(7, _c3, "/shelters/" + ctx_r1.id()));
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(6, 5, "detail.verifyAccount"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275conditionalCreate(0, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_5_Conditional_0_Template, 5, 4)(1, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_5_Conditional_1_Template, 7, 9, "div", 35);
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275conditional(ctx_r1.auth.isVerified() ? 0 : 1);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 35)(1, "p");
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 1, "detail.login.occupancy"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_11_Conditional_0_For_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "button", 65);
    i02.\u0275\u0275listener("click", function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_11_Conditional_0_For_3_Template_button_click_0_listener() {
      const option_r12 = i02.\u0275\u0275restoreView(_r11).$implicit;
      const ctx_r1 = i02.\u0275\u0275nextContext(5);
      return i02.\u0275\u0275resetView(ctx_r1.reportOpenStatus(option_r12.value));
    });
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const option_r12 = ctx.$implicit;
    const ctx_r1 = i02.\u0275\u0275nextContext(5);
    i02.\u0275\u0275classProp("open-status-btn--active", ctx_r1.openStatusPressed(option_r12.value));
    i02.\u0275\u0275property("disabled", ctx_r1.reporting());
    i02.\u0275\u0275attribute("aria-pressed", ctx_r1.openStatusPressed(option_r12.value));
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 5, option_r12.labelKey), " ");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_11_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 63);
    i02.\u0275\u0275pipe(1, "t");
    i02.\u0275\u0275repeaterCreate(2, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_11_Conditional_0_For_3_Template, 3, 7, "button", 64, _forTrack0);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(4);
    i02.\u0275\u0275attribute("aria-label", i02.\u0275\u0275pipeBind1(1, 1, "detail.openStatus.aria"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275repeater(ctx_r1.OPEN_STATES);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_11_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 35)(1, "p");
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(4, "a", 62);
    i02.\u0275\u0275text(5);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(4);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 3, "detail.verify.open"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("queryParams", i02.\u0275\u0275pureFunction1(7, _c3, "/shelters/" + ctx_r1.id()));
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(6, 5, "detail.verifyAccount"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275conditionalCreate(0, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_11_Conditional_0_Template, 4, 3, "div", 63)(1, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_11_Conditional_1_Template, 7, 9, "div", 35);
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275conditional(ctx_r1.auth.isVerified() ? 0 : 1);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 35)(1, "p");
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 1, "detail.login.open"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "button", 68);
    i02.\u0275\u0275listener("click", function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_0_Template_button_click_0_listener() {
      i02.\u0275\u0275restoreView(_r13);
      const ctx_r1 = i02.\u0275\u0275nextContext(5);
      return i02.\u0275\u0275resetView(ctx_r1.openReport());
    });
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(5);
    i02.\u0275\u0275property("disabled", ctx_r1.reporting());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(2, 2, "detail.report"), " ");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_For_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "label", 71)(1, "input", 76);
    i02.\u0275\u0275listener("change", function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_For_4_Template_input_change_1_listener($event) {
      i02.\u0275\u0275restoreView(_r15);
      const ctx_r1 = i02.\u0275\u0275nextContext(6);
      return i02.\u0275\u0275resetView(ctx_r1.onReportTypeChange($event));
    });
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const option_r16 = ctx.$implicit;
    const ctx_r1 = i02.\u0275\u0275nextContext(6);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275property("value", option_r16.value)("checked", ctx_r1.reportType() === option_r16.value);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(3, 3, option_r16.labelKey), " ");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_Conditional_5_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 79);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(2, 1, "detail.reportDetailError"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 72)(1, "label", 77);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(4, "textarea", 78);
    i02.\u0275\u0275controlCreate();
    i02.\u0275\u0275conditionalCreate(5, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_Conditional_5_Conditional_5_Template, 3, 3, "p", 79);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(6);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 4, "detail.reportDetailLabel"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("formControl", ctx_r1.reportDetail)("placeholder", ctx);
    i02.\u0275\u0275control();
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(ctx_r1.reportDetail.touched && ctx_r1.reportDetail.invalid ? 5 : -1);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "p", 73);
    i02.\u0275\u0275text(1);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(ctx);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = i02.\u0275\u0275getCurrentView();
    i02.\u0275\u0275elementStart(0, "form", 69);
    i02.\u0275\u0275listener("submit", function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_Template_form_submit_0_listener($event) {
      i02.\u0275\u0275restoreView(_r14);
      const ctx_r1 = i02.\u0275\u0275nextContext(5);
      $event.preventDefault();
      return i02.\u0275\u0275resetView(ctx_r1.submitReport());
    });
    i02.\u0275\u0275elementStart(1, "fieldset", 70);
    i02.\u0275\u0275pipe(2, "t");
    i02.\u0275\u0275repeaterCreate(3, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_For_4_Template, 4, 5, "label", 71, _forTrack0);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(5, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_Conditional_5_Template, 6, 6, "div", 72);
    i02.\u0275\u0275conditionalCreate(6, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_Conditional_6_Template, 2, 1, "p", 73);
    i02.\u0275\u0275elementStart(7, "div", 74)(8, "button", 75);
    i02.\u0275\u0275text(9);
    i02.\u0275\u0275pipe(10, "t");
    i02.\u0275\u0275pipe(11, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(12, "button", 68);
    i02.\u0275\u0275listener("click", function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_Template_button_click_12_listener() {
      i02.\u0275\u0275restoreView(_r14);
      const ctx_r1 = i02.\u0275\u0275nextContext(5);
      return i02.\u0275\u0275resetView(ctx_r1.closeReport());
    });
    i02.\u0275\u0275text(13);
    i02.\u0275\u0275pipe(14, "t");
    i02.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_9_0;
    let tmp_10_0;
    const ctx_r1 = i02.\u0275\u0275nextContext(5);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275attribute("aria-label", i02.\u0275\u0275pipeBind1(2, 7, "detail.reportType.aria"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275repeater(ctx_r1.REPORT_TYPES);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional((tmp_9_0 = ctx_r1.reportDetailPlaceholder()) ? 5 : -1, tmp_9_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_10_0 = ctx_r1.reportDuplicate()) ? 6 : -1, tmp_10_0);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("disabled", ctx_r1.reporting() || ctx_r1.reportType() === null || ctx_r1.reportDetail.invalid);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.reporting() ? i02.\u0275\u0275pipeBind1(10, 9, "detail.submitting") : i02.\u0275\u0275pipeBind1(11, 11, "detail.submitReport"), " ");
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275property("disabled", ctx_r1.reporting());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(14, 13, "detail.cancel"), " ");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275conditionalCreate(0, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_0_Template, 3, 4, "button", 66)(1, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Conditional_1_Template, 15, 15, "form", 67);
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(4);
    i02.\u0275\u0275conditional(!ctx_r1.reportOpen() ? 0 : 1);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 35)(1, "p");
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(4, "a", 62);
    i02.\u0275\u0275text(5);
    i02.\u0275\u0275pipe(6, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(4);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 3, "detail.verify.report"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275property("queryParams", i02.\u0275\u0275pureFunction1(7, _c3, "/shelters/" + ctx_r1.id()));
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(6, 5, "detail.verifyAccount"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275conditionalCreate(0, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_0_Template, 2, 1)(1, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Conditional_1_Template, 7, 9, "div", 35);
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275conditional(ctx_r1.auth.isVerified() ? 0 : 1);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 35)(1, "p");
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(3, 1, "detail.login.report"));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-report-gauge", 43);
    i02.\u0275\u0275pipe(1, "t");
    i02.\u0275\u0275pipe(2, "t");
  }
  if (rf & 2) {
    i02.\u0275\u0275property("leftLabel", i02.\u0275\u0275pipeBind1(1, 4, "detail.pulse.kind.space"))("rightLabel", i02.\u0275\u0275pipeBind1(2, 6, "detail.pulse.kind.full"))("share", ctx.fullness)("describedBy", "pulse-occupancy-caption");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-list-state", 44);
  }
  if (rf & 2) {
    i02.\u0275\u0275property("kind", "empty")("messageKey", "detail.pulse.emptyOccupancy");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-report-gauge", 43);
    i02.\u0275\u0275pipe(1, "t");
    i02.\u0275\u0275pipe(2, "t");
  }
  if (rf & 2) {
    i02.\u0275\u0275property("leftLabel", i02.\u0275\u0275pipeBind1(1, 4, "detail.pulse.kind.closed"))("rightLabel", i02.\u0275\u0275pipeBind1(2, 6, "detail.pulse.kind.open"))("share", ctx.openShare)("describedBy", "pulse-open-caption");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-list-state", 44);
  }
  if (rf & 2) {
    i02.\u0275\u0275property("kind", "empty")("messageKey", "detail.pulse.emptyOpen");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_31_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-report-gauge", 80);
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(4);
    i02.\u0275\u0275property("captionOnly", true)("captionId", "pulse-occupancy-caption")("text", ctx_r1.occupancyPulseText(ctx));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_31_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-report-gauge", 80);
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(4);
    i02.\u0275\u0275property("captionOnly", true)("captionId", "pulse-open-caption")("text", ctx_r1.openPulseText(ctx));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_31_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "div", 45);
    i02.\u0275\u0275conditionalCreate(1, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_31_Conditional_1_Template, 1, 3, "app-report-gauge", 80);
    i02.\u0275\u0275conditionalCreate(2, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_31_Conditional_2_Template, 1, 3, "app-report-gauge", 80);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_5_0;
    let tmp_6_0;
    const ctx_r1 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_5_0 = ctx_r1.occupancyPulse()) ? 1 : -1, tmp_5_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_6_0 = ctx_r1.openPulse()) ? 2 : -1, tmp_6_0);
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_36_For_2_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "li", 81)(1, "span", 82);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(3, "span", 83);
    i02.\u0275\u0275text(4);
    i02.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const entry_r17 = ctx.$implicit;
    const ctx_r1 = i02.\u0275\u0275nextContext(4);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(ctx_r1.recentReportTime(entry_r17));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate(ctx_r1.recentReportKind(entry_r17));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_36_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "ul", 48);
    i02.\u0275\u0275repeaterCreate(1, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_36_For_2_Template, 5, 2, "li", 81, i02.\u0275\u0275repeaterTrackByIndex);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275repeater(ctx_r1.recentReports());
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_37_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275element(0, "app-list-state", 44);
  }
  if (rf & 2) {
    i02.\u0275\u0275property("kind", "empty")("messageKey", "detail.pulse.recentEmpty");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_48_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275text(0);
    i02.\u0275\u0275elementStart(1, "time", 84);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "date");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r18 = ctx;
    const ctx_r1 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.lastReportText(entry_r18), " ");
    i02.\u0275\u0275advance();
    i02.\u0275\u0275attribute("datetime", entry_r18.reportedAt);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind4(3, 3, entry_r18.reportedAt, "medium", void 0, ctx_r1.uiLocale()));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_49_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275text(0);
    i02.\u0275\u0275pipe(1, "t");
  }
  if (rf & 2) {
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(1, 1, "detail.statusEmpty"), " ");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_55_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275text(0);
    i02.\u0275\u0275elementStart(1, "time", 84);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "date");
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r19 = ctx;
    const ctx_r1 = i02.\u0275\u0275nextContext(3);
    i02.\u0275\u0275textInterpolate1(" ", ctx_r1.lastReportText(entry_r19), " ");
    i02.\u0275\u0275advance();
    i02.\u0275\u0275attribute("datetime", entry_r19.reportedAt);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind4(3, 3, entry_r19.reportedAt, "medium", void 0, ctx_r1.uiLocale()));
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Conditional_56_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275text(0);
    i02.\u0275\u0275pipe(1, "t");
  }
  if (rf & 2) {
    i02.\u0275\u0275textInterpolate1(" ", i02.\u0275\u0275pipeBind1(1, 1, "detail.capacityEmpty"), " ");
  }
}
function ShelterDetailPage_Conditional_1_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275conditionalCreate(0, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_0_Template, 6, 5, "section", 32);
    i02.\u0275\u0275elementStart(1, "section", 33)(2, "h2", 34);
    i02.\u0275\u0275text(3);
    i02.\u0275\u0275pipe(4, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(5, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_5_Template, 2, 1)(6, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_6_Template, 4, 3, "div", 35);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(7, "section", 36)(8, "h2", 37);
    i02.\u0275\u0275text(9);
    i02.\u0275\u0275pipe(10, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(11, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_11_Template, 2, 1)(12, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_12_Template, 4, 3, "div", 35);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(13, "section", 38)(14, "h2", 39);
    i02.\u0275\u0275text(15);
    i02.\u0275\u0275pipe(16, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(17, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_17_Template, 2, 1)(18, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_18_Template, 4, 3, "div", 35);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(19, "div", 40)(20, "p", 41);
    i02.\u0275\u0275text(21);
    i02.\u0275\u0275pipe(22, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(23, "p", 41);
    i02.\u0275\u0275text(24);
    i02.\u0275\u0275pipe(25, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(26, "div", 42);
    i02.\u0275\u0275conditionalCreate(27, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_27_Template, 3, 8, "app-report-gauge", 43)(28, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_28_Template, 1, 2, "app-list-state", 44);
    i02.\u0275\u0275conditionalCreate(29, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_29_Template, 3, 8, "app-report-gauge", 43)(30, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_30_Template, 1, 2, "app-list-state", 44);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(31, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_31_Template, 3, 2, "div", 45);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(32, "section", 46)(33, "h2", 47);
    i02.\u0275\u0275text(34);
    i02.\u0275\u0275pipe(35, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(36, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_36_Template, 3, 0, "ul", 48)(37, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_37_Template, 1, 2, "app-list-state", 44);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(38, "section", 49)(39, "h2", 50);
    i02.\u0275\u0275text(40);
    i02.\u0275\u0275pipe(41, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(42, "dl", 51)(43, "div", 52)(44, "dt", 53);
    i02.\u0275\u0275text(45);
    i02.\u0275\u0275pipe(46, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(47, "dd", 54);
    i02.\u0275\u0275conditionalCreate(48, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_48_Template, 4, 8)(49, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_49_Template, 2, 3);
    i02.\u0275\u0275elementEnd()();
    i02.\u0275\u0275elementStart(50, "div", 52)(51, "dt", 53);
    i02.\u0275\u0275text(52);
    i02.\u0275\u0275pipe(53, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(54, "dd", 54);
    i02.\u0275\u0275conditionalCreate(55, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_55_Template, 4, 8)(56, ShelterDetailPage_Conditional_1_Conditional_26_Conditional_56_Template, 2, 3);
    i02.\u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    let tmp_13_0;
    let tmp_14_0;
    let tmp_20_0;
    let tmp_22_0;
    const ctx_r1 = i02.\u0275\u0275nextContext(2);
    i02.\u0275\u0275conditional(ctx_r1.hasUserDetails() ? 0 : -1);
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(4, 19, "detail.reportOccupancy"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r1.auth.initialized() && ctx_r1.auth.authenticated() ? 5 : 6);
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(10, 21, "detail.reportOpen"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r1.auth.initialized() && ctx_r1.auth.authenticated() ? 11 : 12);
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(16, 23, "detail.reportThis"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r1.auth.initialized() && ctx_r1.auth.authenticated() ? 17 : 18);
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(22, 25, "detail.pulse.windowHint"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(25, 27, "detail.pulse.estimateNote"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275conditional((tmp_13_0 = ctx_r1.occupancyPulse()) ? 27 : 28, tmp_13_0);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional((tmp_14_0 = ctx_r1.openPulse()) ? 29 : 30, tmp_14_0);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r1.occupancyPulse() || ctx_r1.openPulse() ? 31 : -1);
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(35, 29, "detail.pulse.recent"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional(ctx_r1.recentReports().length ? 36 : 37);
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(41, 31, "detail.infoHeading"));
    i02.\u0275\u0275advance(5);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(46, 33, "detail.statusLabel"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275conditional((tmp_20_0 = ctx_r1.lastOpenClosedReport()) ? 48 : 49, tmp_20_0);
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(53, 35, "detail.capacityLabel"));
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275conditional((tmp_22_0 = ctx_r1.lastCapacityReport()) ? 55 : 56, tmp_22_0);
  }
}
function ShelterDetailPage_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i02.\u0275\u0275elementStart(0, "section", 2)(1, "a", 6);
    i02.\u0275\u0275text(2);
    i02.\u0275\u0275pipe(3, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275elementStart(4, "header", 7)(5, "div", 8)(6, "h1", 3);
    i02.\u0275\u0275text(7);
    i02.\u0275\u0275pipe(8, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(9, ShelterDetailPage_Conditional_1_Conditional_9_Template, 5, 5);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(10, ShelterDetailPage_Conditional_1_Conditional_10_Template, 3, 3);
    i02.\u0275\u0275conditionalCreate(11, ShelterDetailPage_Conditional_1_Conditional_11_Template, 1, 1);
    i02.\u0275\u0275conditionalCreate(12, ShelterDetailPage_Conditional_1_Conditional_12_Template, 2, 1, "p", 9);
    i02.\u0275\u0275conditionalCreate(13, ShelterDetailPage_Conditional_1_Conditional_13_Template, 1, 1);
    i02.\u0275\u0275conditionalCreate(14, ShelterDetailPage_Conditional_1_Conditional_14_Template, 3, 6, "p", 10)(15, ShelterDetailPage_Conditional_1_Conditional_15_Template, 2, 1, "p", 11);
    i02.\u0275\u0275conditionalCreate(16, ShelterDetailPage_Conditional_1_Conditional_16_Template, 3, 2);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(17, "app-banner", 12);
    i02.\u0275\u0275conditionalCreate(18, ShelterDetailPage_Conditional_1_Conditional_18_Template, 1, 1, "app-banner", 13);
    i02.\u0275\u0275elementStart(19, "section", 14)(20, "h2", 15);
    i02.\u0275\u0275text(21);
    i02.\u0275\u0275pipe(22, "t");
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275element(23, "div", 16, 0);
    i02.\u0275\u0275elementEnd();
    i02.\u0275\u0275conditionalCreate(25, ShelterDetailPage_Conditional_1_Conditional_25_Template, 2, 3, "app-loading-indicator", 17)(26, ShelterDetailPage_Conditional_1_Conditional_26_Template, 57, 37);
    i02.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_4_0;
    let tmp_5_0;
    let tmp_6_0;
    let tmp_7_0;
    let tmp_8_0;
    let tmp_9_0;
    let tmp_10_0;
    let tmp_12_0;
    let tmp_14_0;
    const ctx_r1 = i02.\u0275\u0275nextContext();
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275textInterpolate1("\u2190 ", i02.\u0275\u0275pipeBind1(3, 13, "detail.backToMap"));
    i02.\u0275\u0275advance(5);
    i02.\u0275\u0275textInterpolate(ctx_r1.shelter()?.name ?? i02.\u0275\u0275pipeBind1(8, 15, "detail.titleFallback"));
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional((tmp_4_0 = ctx_r1.shelter()) ? 9 : -1, tmp_4_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_5_0 = ctx_r1.shelter()) ? 10 : -1, tmp_5_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_6_0 = ctx_r1.shelter()) ? 11 : -1, tmp_6_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_7_0 = ctx_r1.shelter()?.address) ? 12 : -1, tmp_7_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_8_0 = ctx_r1.shelter()) ? 13 : -1, tmp_8_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional(ctx_r1.distanceKm() !== null ? 14 : (tmp_9_0 = ctx_r1.distanceError()) ? 15 : -1, tmp_9_0);
    i02.\u0275\u0275advance(2);
    i02.\u0275\u0275conditional((tmp_10_0 = ctx_r1.shelter()) ? 16 : -1, tmp_10_0);
    i02.\u0275\u0275advance();
    i02.\u0275\u0275property("message", ctx_r1.error());
    i02.\u0275\u0275advance();
    i02.\u0275\u0275conditional((tmp_12_0 = ctx_r1.notice()) ? 18 : -1, tmp_12_0);
    i02.\u0275\u0275advance(3);
    i02.\u0275\u0275textInterpolate(i02.\u0275\u0275pipeBind1(22, 17, "detail.locationHeading"));
    i02.\u0275\u0275advance(4);
    i02.\u0275\u0275conditional(ctx_r1.loading() ? 25 : (tmp_14_0 = ctx_r1.shelter()) ? 26 : -1, tmp_14_0);
  }
}
var DISTANCE_KEY = {
  denied: "map.nearest.denied",
  timeout: "map.nearest.timeout",
  unsupported: "map.nearest.unsupported",
  unavailable: "map.nearest.unavailable",
  insecure: "map.nearest.insecure"
};
var RECENT_KIND_KEYS = {
  OPEN: "detail.pulse.kind.open",
  CLOSED: "detail.pulse.kind.closed",
  SPACE: "detail.pulse.kind.space",
  GETTING_FULL: "detail.pulse.kind.gettingFull",
  FULL: "detail.pulse.kind.full"
};
var ShelterDetailPage = class _ShelterDetailPage {
  gateway = inject(ShelterGateway);
  store = inject(AuthStore);
  route = inject(ActivatedRoute);
  leaflet = inject(LeafletService);
  /** Resolves the report detail field's per-type placeholder (i18n-et-en).
   *  Also the seam for the shared shelter-copy helpers (N7 i18n-
   *  completeness): they resolve their copy through the active locale. */
  i18n = inject(I18nService);
  /** The active-locale resolver passed to the shared copy helpers. */
  translate = (key, params) => this.i18n.t(key, params);
  /** The active UI locale, exposed to the template so the Info section's
   *  <time> stamps format in the VIEWER'S language (not the content
   *  language) — the same seam the t pipe and the account panel use. */
  uiLocale = this.i18n.locale;
  mapEl = viewChild(
    "mapEl",
    ...ngDevMode ? [{ debugName: "mapEl" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The shelter id from /shelters/:id (null = invalid id -> not-found). */
  id = signal(
    null,
    ...ngDevMode ? [{ debugName: "id" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Detail projection — the list fields + yourOccupancyBand (D5). */
  shelter = signal(
    null,
    ...ngDevMode ? [{ debugName: "shelter" }] : (
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
  notFound = signal(
    false,
    ...ngDevMode ? [{ debugName: "notFound" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** A trust-layer write (report / occupancy) is in flight. */
  reporting = signal(
    false,
    ...ngDevMode ? [{ debugName: "reporting" }] : (
      /* istanbul ignore next */
      []
    )
  );
  notice = signal(
    null,
    ...ngDevMode ? [{ debugName: "notice" }] : (
      /* istanbul ignore next */
      []
    )
  );
  auth = this.store;
  /** The shared source/trust copy, exposed to the template (Angular's
   *  template scope is the component class). The header badge shows the
   *  source label (registry rows) or the trust-state label (USER rows,
   *  community-review-queue D5) and, from shelter-trust-and-reports, the
   *  trust badges (D6). Each wrapper injects the i18n seam so the badge
   *  reads in the active locale — the catalog keys are the same ones the
   *  band picker and the /mine panel already render (one word per fact). */
  sourceTrustLabel = (s) => sourceTrustLabel(s, this.translate);
  /** The submitter's verification depth badge key (submitter-verification-
   *  badge) — null renders NO badge. Rendered through the `| t` pipe so the
   *  badge follows the active locale. */
  submitterVerificationKey = submitterVerificationKey;
  communityBadgeClass = communityBadgeClass;
  /** The list row's fresh-CLOSED badge — the same copy the status row uses;
   *  fresh OPEN rows render no badge. */
  openStatusBadgeText = (openStatus) => openStatusBadgeText(openStatus, this.translate);
  occupancyText = (occupancy) => occupancyText(occupancy, Date.now(), this.translate);
  hasReports = hasReports;
  hasTrustBadges = hasTrustBadges;
  /** Last-verified meta: the reported badge with its count, the per-
   *  entry verification line and the community report count line. The
   *  month-abbreviation param follows the active locale (locale data). */
  reportedBadgeText = (nonexistentReports) => reportedBadgeText(nonexistentReports, this.translate);
  lastVerifiedText = (s) => lastVerifiedText(s, Date.now(), this.translate, MONTH_ABBREVS[this.i18n.locale()]);
  communityReportsText = (reportCount) => communityReportsText(reportCount, this.translate);
  /** The shared straight-line distance formatter (location-navigation: the
   *  map rows + this page's distance line consume the same honesty format). */
  straightLineText = (km) => straightLineText(km, this.translate);
  hasCommunityReports = hasCommunityReports;
  // ---- community pulse (M9 — report aggregation UI) -----------------------
  /**
   * The how-full gauge's aggregate (M9): the fresh (≤ 2 h) band counts +
   * the trust-weighted empty→full share. null = nothing fresh → the
   * explicit empty state (never a neutral arrow). Detail-read only — an
   * older BE omits the field (undefined → null, the FE-ships-ahead rule).
   */
  occupancyPulse() {
    return this.shelter()?.communityPulse?.occupancy ?? null;
  }
  /** The open/closed gauge's aggregate (M9) — same rules as {@link occupancyPulse}. */
  openPulse() {
    return this.shelter()?.communityPulse?.openClosed ?? null;
  }
  /** The merged recent-report log (M9): newest first, capped server-side.
   *  Empty → the section's empty state. */
  recentReports() {
    return this.shelter()?.communityPulse?.recentReports ?? [];
  }
  /**
   * The open/closed gauge's visible + accessible count line (the PLAIN
   * fresh counts — the angle is never the only carrier of meaning).
   */
  openPulseText(pulse) {
    return this.i18n.t("detail.pulse.openClosedText", {
      open: pulse.openReports,
      closed: pulse.closedReports
    });
  }
  /** The how-full gauge's visible + accessible count line. */
  occupancyPulseText(pulse) {
    return this.i18n.t("detail.pulse.occupancyText", {
      space: pulse.spaceReports,
      gettingFull: pulse.gettingFullReports,
      full: pulse.fullReports
    });
  }
  /** The log entry's relative time (the shared recency formatter — the
   *  occupancy badge's "12 min ago" vocabulary), through the i18n seam. */
  recentReportTime(entry) {
    return recencyText(entry.reportedAt, Date.now(), this.translate);
  }
  /** The log entry's "a community member reported: {kind}" line — NO
   *  reporter identity (privacy: the log says what + when, never who). */
  recentReportKind(entry) {
    const kindKey = RECENT_KIND_KEYS[entry.kind] ?? "detail.pulse.kind.full";
    return this.i18n.t("detail.pulse.recentEntry", { kind: this.i18n.t(kindKey) });
  }
  // ---- info section: the last reported status/capacity (INFO-LAST-REPORTED) --
  /**
   * The newest report among the given kinds over the merged recent log.
   * The log is server-ordered newest-first, but the explicit max keeps the
   * rule honest if the order ever drifts. null = no report of those kinds
   * in the log — the row renders its explicit empty state, never a stale
   * or invented status.
   */
  newestReportOf(kinds) {
    let newest = null;
    for (const entry of this.recentReports()) {
      if (!kinds.includes(entry.kind)) {
        continue;
      }
      if (newest === null || Date.parse(entry.reportedAt) > Date.parse(newest.reportedAt)) {
        newest = entry;
      }
    }
    return newest;
  }
  /** The "Status" row's entry: the newest OPEN/CLOSED report — the newest
   *  entry overall may be a how-full report and never becomes the status.
   *  null → the row's empty state. */
  lastOpenClosedReport() {
    return this.newestReportOf(["OPEN", "CLOSED"]);
  }
  /** The "Capacity" row's entry: the newest SPACE/GETTING_FULL/FULL
   *  report — an OPEN/CLOSED report never becomes the capacity.
   *  null → the row's empty state. */
  lastCapacityReport() {
    return this.newestReportOf(["SPACE", "GETTING_FULL", "FULL"]);
  }
  /** The reported row's value ("Last reported as {kind}"): the kind noun
   *  reuses the recent log's detail.pulse.kind.* vocabulary. */
  lastReportText(entry) {
    const kindKey = RECENT_KIND_KEYS[entry.kind] ?? "detail.pulse.kind.full";
    return this.i18n.t("detail.lastReported", { kind: this.i18n.t(kindKey) });
  }
  // ---- distance from you (location-navigation) ---------------------------
  /** True while the geolocation request for the distance is in flight. */
  distancePending = signal(
    false,
    ...ngDevMode ? [{ debugName: "distancePending" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The last success's straight-line distance in km (null = none yet). */
  distanceKm = signal(
    null,
    ...ngDevMode ? [{ debugName: "distanceKm" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The last locate failure's per-error copy (null = none). A failure
   *  renders the error line and NO distance line (the success line clears
   *  up front, the same convention as the map CTA). Resolved from the
   *  map.nearest.* catalog keys (the map CTA's vocabulary — see
   *  DISTANCE_KEY). */
  distanceError = signal(
    null,
    ...ngDevMode ? [{ debugName: "distanceError" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The private-location predicate (D7) — the template stays branch-free.
   *  The badge + note + warnings render through the t pipe in the template
   *  (shelter.* / account.contrib.inaccurate keys). */
  isPrivateLocation = isPrivateLocation;
  // ---- trust layer (shelter-trust-and-reports D1/D4/D6) ----------------------
  /** The three NEGATIVE report types + their picker labels: the picker is
   *  negative-only — "It does not exist" /
   *  "The location is wrong" / "Something else". CLOSED and OPEN_CONFIRMED
   *  stay in the ShelterReportType union, the admin label map and the
   *  historical rendering (they exist in stored data), but the picker no
   *  longer offers either — open/closed moved to its own live-report
   *  section below. The factual types (WRONG_LOCATION
   *  / OTHER) carry the detail field's per-type placeholder; the binary
   *  type stays claim-only. */
  REPORT_TYPES = [
    { value: "NON_EXISTENT", labelKey: "detail.reportType.nonExistent" },
    {
      value: "WRONG_LOCATION",
      labelKey: "detail.reportType.wrongLocation",
      detailKey: "detail.reportDetailPlaceholder.wrongLocation"
    },
    {
      value: "OTHER",
      labelKey: "detail.reportType.other",
      detailKey: "detail.reportDetailPlaceholder.other"
    }
  ];
  /** The three occupancy bands (D4) — the picker's large buttons. */
  BANDS = [
    { value: "SPACE", labelKey: "detail.band.space" },
    { value: "GETTING_FULL", labelKey: "detail.band.gettingFull" },
    { value: "FULL", labelKey: "detail.band.full" }
  ];
  /** The two open/closed states — the picker's large
   *  buttons, the band picker's language mirrored 1:1. */
  OPEN_STATES = [
    { value: "OPEN", labelKey: "detail.openState.open" },
    { value: "CLOSED", labelKey: "detail.openState.closed" }
  ];
  /** The shelter-report picker is open (the "Report" button toggles it). */
  reportOpen = signal(
    false,
    ...ngDevMode ? [{ debugName: "reportOpen" }] : (
      /* istanbul ignore next */
      []
    )
  );
  reportType = signal(
    null,
    ...ngDevMode ? [{ debugName: "reportType" }] : (
      /* istanbul ignore next */
      []
    )
  );
  reportDetail = new FormControl("", {
    nonNullable: true,
    validators: [Validators.maxLength(500)]
  });
  /** Plain sentence-case duplicate (409) line for the open shelter picker. */
  reportDuplicate = signal(
    null,
    ...ngDevMode ? [{ debugName: "reportDuplicate" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Monotonic fetch sequence — a stale (out-of-order) response is dropped. */
  fetchSeq = 0;
  /** The tapped open/closed state while the upsert is in flight: the
   *  optimistic pressed state — cleared on settle, the refetch's
   *  yourOpenStatus is the settled pre-select. */
  openStatusPending = signal(
    null,
    ...ngDevMode ? [{ debugName: "openStatusPending" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** True while the Location map instance is alive (see the afterRender
   *  hook: the found branch re-mounts a fresh #mapEl after any not-found
   *  flip, so the page must know when the container outlived the map). */
  locationMapAlive = false;
  constructor() {
    afterEveryRender(() => {
      const recreated = this.ensureLocationMap();
      if (recreated) {
        const shelter = this.shelter();
        if (shelter !== null) {
          this.pinShelter(shelter);
        }
      }
    });
  }
  /**
   * The Location map container exists at view-init time in every found
   * state (it is NOT inside the shelter branch), so the async fetch never
   * races the map: we create at the Estonia default here. A missing
   * container (an invalid :id on first load renders the not-found branch)
   * is a safe no-op via create's null guard. The not-found flip destroys
   * the map — see load() / readShelterId(); a found re-render re-creates
   * it — see the afterRender hook.
   */
  ngAfterViewInit() {
    this.ensureLocationMap();
  }
  /**
   * Ensures the Location map instance matches the rendered container:
   * creates it when the found branch's #mapEl is mounted and no instance is
   * alive (first load, or the re-mount after a not-found flip). No-op
   * otherwise — safe to call from every found render and load outcome.
   * @returns true when a fresh instance was created on this call.
   */
  ensureLocationMap() {
    const el = this.mapEl()?.nativeElement ?? null;
    if (el === null || this.locationMapAlive) {
      return false;
    }
    this.leaflet.create(el, ESTONIA_CENTER, ESTONIA_ZOOM);
    this.locationMapAlive = true;
    return true;
  }
  /**
   * Drops the live Location map with the unmounting container:
   * the not-found branch renders no #mapEl, so a live instance would leak with
   * its listeners. Null-safe when create was a no-op; the afterRender hook
   * re-arms on the next found render.
   */
  destroyLocationMap() {
    this.locationMapAlive = false;
    this.leaflet.destroy();
  }
  ngOnDestroy() {
    this.locationMapAlive = false;
    this.leaflet.destroy();
  }
  ngOnInit() {
    this.route.paramMap.subscribe((params) => this.readShelterId(params.get("id")));
  }
  /** Parse + adopt the :id param (invalid id -> not-found state). */
  readShelterId(raw) {
    const parsed = Number(raw);
    if (raw === null || !Number.isInteger(parsed) || parsed <= 0) {
      this.destroyLocationMap();
      this.notFound.set(true);
      return;
    }
    if (parsed === this.id()) {
      return;
    }
    this.id.set(parsed);
    this.notFound.set(false);
    this.shelter.set(null);
    this.notice.set(null);
    this.resetTrustPickers();
    this.leaflet.showShelter(null);
    this.load();
  }
  /** Closes every open trust-layer picker and drops its draft state. */
  resetTrustPickers() {
    this.reportOpen.set(false);
    this.reportType.set(null);
    this.reportDetail.reset();
    this.reportDuplicate.set(null);
    this.openStatusPending.set(null);
  }
  /**
   * Fetch the shelter. 404 -> not-found state; any other failure -> error
   * banner with the page chrome intact (shared convention). A failed
   * post-write refetch clears the stale success notice.
   */
  load() {
    const id = this.id();
    if (id === null) {
      return Promise.resolve();
    }
    const seq = ++this.fetchSeq;
    this.error.set(null);
    this.loading.set(true);
    return this.gateway.get(id).then((value) => {
      if (seq !== this.fetchSeq) {
        return;
      }
      this.shelter.set(value);
      this.ensureLocationMap();
      this.pinShelter(value);
      this.loading.set(false);
    }, (failure) => {
      if (seq !== this.fetchSeq) {
        return;
      }
      this.notice.set(null);
      if (failure instanceof ApiError && failure.status === 404) {
        this.shelter.set(null);
        this.destroyLocationMap();
        this.notFound.set(true);
        this.loading.set(false);
        return;
      }
      this.error.set(bannerMessage(failure, "shelter", (key) => this.i18n.t(key)));
      this.ensureLocationMap();
      this.loading.set(false);
    });
  }
  /** Pins the shelter on the Location map: fly to it at street level
   * (SHELTER_ZOOM) + one static marker (showShelter is idempotent — the
   * post-write refetch simply replaces the pin). Skips when the
   * coordinates are missing/non-finite: the map then keeps its placeholder
   * view instead of half-drawing a broken state.
   */
  pinShelter(shelter) {
    if (!Number.isFinite(shelter.latitude) || !Number.isFinite(shelter.longitude)) {
      return;
    }
    this.leaflet.flyTo(shelter.latitude, shelter.longitude, SHELTER_ZOOM);
    this.leaflet.showShelter(shelter);
  }
  hasUserDetails() {
    const s = this.shelter();
    return s !== null && (s.description !== null || s.capacity !== null);
  }
  // ---- navigate actions (map-crisis-actions D3) ----------------------------
  /**
   * Google Maps walking-directions deep link — a hand-rolled href (no
   * navigation library): the phone opens its own app choice. Coordinates at
   * 5 decimals (the app-wide coordinate format).
   */
  navigateUrl(shelter) {
    return `https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude.toFixed(5)},${shelter.longitude.toFixed(5)}&travelmode=walking`;
  }
  /** Apple Maps fallback (iOS): the same point, the shelter name as query. */
  appleMapsUrl(shelter) {
    return `https://maps.apple.com/?daddr=${shelter.latitude.toFixed(5)},${shelter.longitude.toFixed(5)}&q=${encodeURIComponent(shelter.name)}`;
  }
  /** The header's coordinate line (D6 — tabular figures via .num-tabular). */
  coordinateLine(shelter) {
    return `${shelter.latitude.toFixed(5)}, ${shelter.longitude.toFixed(5)}`;
  }
  /** Coordinates are required on the DTO; the finite guard mirrors
   *  pinShelter — a non-finite point must not render a broken link or line. */
  hasCoordinates(shelter) {
    return Number.isFinite(shelter.latitude) && Number.isFinite(shelter.longitude);
  }
  /**
   * "Distance from you" (location-navigation): the shared high-accuracy
   * geolocation mechanism (the map CTA's exact options, the secure-context
   * guard and the error mapping — shared/geolocation.ts), then the
   * Haversine distance to the shelter's own coordinates, computed CLIENT-
   * SIDE — no backend call, no IP geolocation (locked). On success: the
   * honesty line "≈ … straight line from you" (never a walking-route or
   * official claim). On failure: per-error copy (the map CTA's mirrored
   * vocabulary); the page stays otherwise untouched. Public so specs can
   * drive it (page convention).
   */
  distanceFromMe() {
    const shelter = this.shelter();
    if (this.distancePending() || shelter === null || !this.hasCoordinates(shelter)) {
      return;
    }
    this.distanceKm.set(null);
    this.distanceError.set(null);
    this.distancePending.set(true);
    void getCurrentPositionHighAccuracy().then((coords) => {
      this.distancePending.set(false);
      this.distanceKm.set(haversineKm(coords.latitude, coords.longitude, shelter.latitude, shelter.longitude));
    }, (failure) => {
      this.distancePending.set(false);
      const kind = failure instanceof GeolocationError ? failure.kind : "unavailable";
      this.distanceError.set(this.i18n.t(DISTANCE_KEY[kind]));
    });
  }
  // ---- report how full (shelter-trust-and-reports D4/D6) --------------------
  /**
   * One-tap occupancy upsert: the latest edit wins (the backend keeps ONE
   * live band per user). Success refetches — the aggregate + recency and
   * the picker's pre-select (yourOccupancyBand) both come from the fresh
   * detail projection. Occupancy is display-only: it never hides or recolours
   * anything, so the failure path only surfaces the shared banner copy.
   */
  async reportBand(band) {
    const id = this.id();
    if (id === null || this.reporting()) {
      return;
    }
    this.reporting.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      await this.gateway.reportOccupancy(id, band);
      this.notice.set({ severity: "success", text: this.i18n.t("shelter.notice.occupancySaved") });
      await this.load();
    } catch (failure) {
      this.error.set(bannerMessage(failure, "shelter", (key) => this.i18n.t(key)));
    } finally {
      this.reporting.set(false);
    }
  }
  // ---- report open/closed ------------------------------------------------
  /**
   * The picker's pressed state for a state: the user's current live report
   * (yourOpenStatus) OR the optimistic tap in flight —
   * radio-style, exactly one of the two buttons can be pressed. The
   * refetch's yourOpenStatus is the settled pre-select, so the optimistic
   * flag clears with no flicker on success and reverts on failure.
   */
  openStatusPressed(state) {
    const shelter = this.shelter();
    return shelter?.yourOpenStatus === state || this.openStatusPending() === state;
  }
  /**
   * One-tap open/closed upsert: the latest edit wins (the backend keeps ONE
   * live state per user). Same shape as the band picker — optimistic
   * pressed state, success refetches (the aggregate + the picker's
   * pre-select, yourOpenStatus, both come from the fresh detail
   * projection), the shared banner copy on failure. Open/closed is
   * display-only: it never hides or recolours anything itself — the status
   * row and the badges derive from the fresh aggregate.
   */
  async reportOpenStatus(state) {
    const id = this.id();
    if (id === null || this.reporting()) {
      return;
    }
    this.reporting.set(true);
    this.openStatusPending.set(state);
    this.error.set(null);
    this.notice.set(null);
    try {
      await this.gateway.putOpenStatus(id, state);
      this.notice.set({ severity: "success", text: this.i18n.t("shelter.notice.openClosedSaved") });
      await this.load();
    } catch (failure) {
      this.error.set(bannerMessage(failure, "shelter", (key) => this.i18n.t(key)));
    } finally {
      this.reporting.set(false);
      this.openStatusPending.set(null);
    }
  }
  // ---- report this shelter (shelter-trust-and-reports D1/D6) ---------------
  /** The verified viewer opens the type picker (inline — no modal). */
  openReport() {
    this.reportDuplicate.set(null);
    this.reportOpen.set(true);
  }
  closeReport() {
    this.reportOpen.set(false);
    this.reportType.set(null);
    this.reportDetail.reset();
    this.reportDuplicate.set(null);
  }
  /** Radio change in the shelter-report picker. */
  onReportTypeChange(event) {
    this.reportType.set(event.target.value);
  }
  /**
   * The factual-report detail field's per-type placeholder for
   * the picked type — null for the binary types (the claim stands alone).
   * The template renders the field whenever this is non-null, and submit
   * sends a non-blank detail exactly then.
   */
  reportDetailPlaceholder() {
    const type = this.reportType();
    if (type === null) {
      return null;
    }
    const option = this.REPORT_TYPES.find((t) => t.value === type);
    return option?.detailKey ? this.i18n.t(option.detailKey) : null;
  }
  /**
   * Submit the typed report (verified only — the template gates it). One
   * report per (shelter, user, type): a 409 answers with a PLAIN
   * sentence-case line in the picker (not an error banner). Detail is
   * sent for the factual types (CLOSED / WRONG_LOCATION / OTHER) and only
   * when non-blank.
   */
  async submitReport() {
    const id = this.id();
    const type = this.reportType();
    if (id === null || type === null || this.reporting()) {
      return;
    }
    const detail = this.reportDetail.value.trim();
    if (this.reportDetailPlaceholder() !== null && this.reportDetail.invalid) {
      this.reportDetail.markAsTouched();
      return;
    }
    const request = { type };
    if (this.reportDetailPlaceholder() !== null && detail !== "") {
      request.detail = detail;
    }
    this.reporting.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.reportDuplicate.set(null);
    try {
      const result = await this.gateway.report(id, request);
      this.closeReport();
      this.notice.set({
        severity: "success",
        text: this.i18n.t(result?.damped ? "shelter.notice.reportSubmittedDamped" : "shelter.notice.reportSubmitted")
      });
      await this.load();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 409) {
        this.reportDuplicate.set(failure.message || this.i18n.t("shelter.notice.reportDuplicate"));
      } else {
        this.error.set(bannerMessage(failure, "shelter", (key) => this.i18n.t(key)));
      }
    } finally {
      this.reporting.set(false);
    }
  }
  static \u0275fac = function ShelterDetailPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ShelterDetailPage)();
  };
  static \u0275cmp = /* @__PURE__ */ i02.\u0275\u0275defineComponent({ type: _ShelterDetailPage, selectors: [["app-shelter-detail-page"]], viewQuery: function ShelterDetailPage_Query(rf, ctx) {
    if (rf & 1) {
      i02.\u0275\u0275viewQuerySignal(ctx.mapEl, _c0, 5);
    }
    if (rf & 2) {
      i02.\u0275\u0275queryAdvance();
    }
  }, features: [i02.\u0275\u0275ProvidersFeature([LeafletService])], decls: 2, vars: 1, consts: [["mapEl", ""], [1, "shelter-detail", "shelter-detail--not-found"], [1, "shelter-detail"], [1, "page-title"], [1, "page-subtitle"], ["routerLink", "/map", 1, "btn", "btn--primary"], ["routerLink", "/map", 1, "back-link"], [1, "shelter-detail__header"], [1, "shelter-detail__title-row"], [1, "shelter-detail__address"], ["role", "status", 1, "shelter-detail__distance-line", "num-tabular"], ["role", "alert", 1, "shelter-detail__distance-error"], ["severity", "error", 3, "message"], ["severity", "success", 3, "message"], ["aria-labelledby", "location-heading", 1, "detail-section"], ["id", "location-heading", 1, "section-title"], [1, "shelter-detail__map"], [1, "detail-state", 3, "message"], [1, "badge", 3, "ngClass"], [1, "badge", "badge--submitter"], [1, "badge", "badge--private"], [1, "badge", "badge--reported"], [1, "badge", "badge--closed"], [1, "badge", "badge--occupancy"], [1, "community-warning"], [1, "private-note"], [1, "shelter-detail__navigate"], ["target", "_blank", "rel", "noopener", 3, "href"], ["type", "button", 1, "shelter-detail__distance", 3, "click", "disabled"], [1, "shelter-detail__coords", "num-tabular"], [1, "shelter-detail__verified", "num-tabular"], [1, "shelter-detail__reports", "num-tabular"], [1, "detail-section"], ["aria-labelledby", "occupancy-heading", 1, "detail-section"], ["id", "occupancy-heading", 1, "section-title"], [1, "report-gate-prompt"], ["aria-labelledby", "open-status-heading", 1, "detail-section"], ["id", "open-status-heading", 1, "section-title"], ["aria-labelledby", "report-shelter-heading", 1, "detail-section"], ["id", "report-shelter-heading", 1, "section-title"], [1, "pulse-gauges"], [1, "pulse-gauges__hint"], [1, "pulse-gauges__arrows"], [3, "leftLabel", "rightLabel", "share", "describedBy"], [1, "pulse-empty", 3, "kind", "messageKey"], [1, "pulse-gauges__captions"], ["aria-labelledby", "recent-reports-heading", 1, "detail-section"], ["id", "recent-reports-heading", 1, "section-title"], [1, "recent-reports"], ["aria-labelledby", "info-heading", 1, "detail-section"], ["id", "info-heading", 1, "section-title"], [1, "fact-list"], [1, "fact-list__row"], [1, "fact-list__label"], [1, "fact-list__value"], [1, "section-title"], [1, "detail-description"], [1, "detail-meta"], ["role", "group", 1, "band-picker"], ["type", "button", 1, "btn", "band-btn", 3, "band-btn--active", "disabled"], [1, "occupancy-line"], ["type", "button", 1, "btn", "band-btn", 3, "click", "disabled"], ["routerLink", "/verify", 1, "btn", "btn--primary", 3, "queryParams"], ["role", "group", 1, "open-status-picker"], ["type", "button", 1, "btn", "open-status-btn", 3, "open-status-btn--active", "disabled"], ["type", "button", 1, "btn", "open-status-btn", 3, "click", "disabled"], ["type", "button", 1, "btn", "btn--ghost", 3, "disabled"], [1, "report-form"], ["type", "button", 1, "btn", "btn--ghost", 3, "click", "disabled"], [1, "report-form", 3, "submit"], [1, "report-options"], [1, "report-option"], [1, "field"], ["role", "status", 1, "report-status"], [1, "report-actions"], ["type", "submit", 1, "btn", "btn--primary", 3, "disabled"], ["type", "radio", "name", "shelter-report-type", 3, "change", "value", "checked"], ["for", "report-detail"], ["id", "report-detail", "maxlength", "500", 3, "formControl", "placeholder"], [1, "field-error"], [3, "captionOnly", "captionId", "text"], [1, "recent-reports__entry"], [1, "recent-reports__time", "num-tabular"], [1, "recent-reports__kind"], [1, "fact-list__time", "num-tabular"]], template: function ShelterDetailPage_Template(rf, ctx) {
    if (rf & 1) {
      i02.\u0275\u0275conditionalCreate(0, ShelterDetailPage_Conditional_0_Template, 10, 9, "section", 1)(1, ShelterDetailPage_Conditional_1_Template, 27, 19, "section", 2);
    }
    if (rf & 2) {
      i02.\u0275\u0275conditional(ctx.notFound() ? 0 : 1);
    }
  }, dependencies: [
    RouterLink,
    NgClass,
    ReactiveFormsModule,
    i1.\u0275NgNoValidate,
    i1.NgSelectOption,
    i1.\u0275NgSelectMultipleOption,
    i1.DefaultValueAccessor,
    i1.NumberValueAccessor,
    i1.RangeValueAccessor,
    i1.CheckboxControlValueAccessor,
    i1.SelectControlValueAccessor,
    i1.SelectMultipleControlValueAccessor,
    i1.RadioControlValueAccessor,
    i1.NgControlStatus,
    i1.NgControlStatusGroup,
    i1.RequiredValidator,
    i1.MinLengthValidator,
    i1.MaxLengthValidator,
    i1.PatternValidator,
    i1.CheckboxRequiredValidator,
    i1.EmailValidator,
    i1.MinValidator,
    i1.MaxValidator,
    i1.FormControlDirective,
    i1.FormGroupDirective,
    i1.FormArrayDirective,
    i1.FormControlName,
    i1.FormGroupName,
    i1.FormArrayName,
    BannerComponent,
    ListState,
    LoadingIndicator,
    ReportGauge,
    DatePipe,
    TranslatePipe
  ], styles: ['@charset "UTF-8";\n\n\n.shelter-detail[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-20);\n  max-width: 44rem;\n}\n.shelter-detail--not-found[_ngcontent-%COMP%] {\n  align-items: flex-start;\n}\n.back-link[_ngcontent-%COMP%] {\n  align-self: flex-start;\n  color: var(--%NS%color-primary);\n  text-decoration: none;\n  font-size: var(--%NS%text-md);\n}\n.back-link[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.shelter-detail__header[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-8);\n}\n.shelter-detail__title-row[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: var(--%NS%space-10);\n}\n.badge.badge--submitter[_ngcontent-%COMP%] {\n  background: var(--%NS%color-bg-subtle);\n  border: 1px solid var(--%NS%color-border);\n  color: var(--%NS%color-muted);\n}\n.shelter-detail__address[_ngcontent-%COMP%] {\n  margin: 0;\n  color: var(--%NS%color-muted);\n}\n.community-warning[_ngcontent-%COMP%] {\n  margin: 0;\n  padding: var(--%NS%space-8) var(--%NS%space-12);\n  background: var(--%NS%color-bg-subtle);\n  border: 1px solid var(--%NS%color-border-subtle);\n  border-radius: var(--%NS%radius-md);\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n.private-note[_ngcontent-%COMP%] {\n  margin: 0;\n  padding: var(--%NS%space-8) var(--%NS%space-12);\n  background: var(--%NS%color-bg-subtle);\n  border: 1px solid var(--%NS%color-border-subtle);\n  border-radius: var(--%NS%radius-md);\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n.shelter-detail__navigate[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-16);\n}\n.shelter-detail__navigate[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--%NS%color-primary);\n  text-decoration: none;\n  font-size: var(--%NS%text-sm);\n}\n.shelter-detail__navigate[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.shelter-detail__navigate[_ngcontent-%COMP%] {\n}\n.shelter-detail__navigate[_ngcontent-%COMP%]   .shelter-detail__distance[_ngcontent-%COMP%] {\n  padding: 0;\n  border: none;\n  background: none;\n  font-family: inherit;\n  color: var(--%NS%color-primary);\n  text-decoration: none;\n  font-size: var(--%NS%text-sm);\n  cursor: pointer;\n}\n.shelter-detail__navigate[_ngcontent-%COMP%]   .shelter-detail__distance[_ngcontent-%COMP%]:hover:not(:disabled) {\n  text-decoration: underline;\n}\n.shelter-detail__navigate[_ngcontent-%COMP%]   .shelter-detail__distance[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: default;\n}\n.shelter-detail__distance-line[_ngcontent-%COMP%] {\n  margin: 0;\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n.shelter-detail__distance-error[_ngcontent-%COMP%] {\n  margin: 0;\n  color: var(--%NS%color-danger);\n  font-size: var(--%NS%text-sm);\n}\n.shelter-detail__coords[_ngcontent-%COMP%] {\n  margin: 0;\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n.shelter-detail__verified[_ngcontent-%COMP%], \n.shelter-detail__reports[_ngcontent-%COMP%] {\n  margin: 0;\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n.detail-state[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  margin: 0;\n}\n.detail-state--error[_ngcontent-%COMP%] {\n  color: var(--%NS%color-danger);\n}\n.detail-section[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-10);\n  padding-top: var(--%NS%space-4);\n  border-top: 1px solid var(--%NS%color-border);\n}\n.section-title[_ngcontent-%COMP%] {\n  font-size: var(--%NS%text-xl);\n  font-weight: var(--%NS%font-weight-title);\n  margin: 0;\n}\n.detail-description[_ngcontent-%COMP%] {\n  margin: 0;\n  white-space: pre-line;\n}\n.shelter-detail__map[_ngcontent-%COMP%] {\n  height: 260px;\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-lg);\n  background: var(--%NS%color-map-placeholder);\n}\n.detail-meta[_ngcontent-%COMP%] {\n  margin: 0;\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-md);\n}\n.fact-list[_ngcontent-%COMP%] {\n  margin: 0;\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-8);\n}\n.fact-list__row[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-10);\n}\n.fact-list__label[_ngcontent-%COMP%] {\n  flex: 0 0 12rem;\n  margin: 0;\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-sm);\n}\n.fact-list__value[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-sm);\n  display: flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n  gap: var(--%NS%space-4) var(--%NS%space-8);\n}\n.fact-list[_ngcontent-%COMP%] {\n}\n.fact-list__time[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n}\n.report-gate-prompt[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  gap: var(--%NS%space-10);\n}\n.report-gate-prompt[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n}\n.band-picker[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-8);\n  flex-wrap: wrap;\n}\n.band-picker[_ngcontent-%COMP%]   .band-btn[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  border-color: var(--%NS%color-border);\n  background: var(--%NS%color-bg-surface);\n  color: var(--%NS%color-text);\n}\n.band-picker[_ngcontent-%COMP%]   .band-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  border-color: var(--%NS%color-primary);\n}\n.band-picker[_ngcontent-%COMP%]   .band-btn.band-btn--active[_ngcontent-%COMP%] {\n  background: var(--%NS%color-primary);\n  border-color: var(--%NS%color-primary);\n  color: var(--%NS%color-bg-surface);\n}\n.occupancy-line[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n.open-status-picker[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-8);\n  flex-wrap: wrap;\n}\n.open-status-picker[_ngcontent-%COMP%]   .open-status-btn[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  border-color: var(--%NS%color-border);\n  background: var(--%NS%color-bg-surface);\n  color: var(--%NS%color-text);\n}\n.open-status-picker[_ngcontent-%COMP%]   .open-status-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  border-color: var(--%NS%color-primary);\n}\n.open-status-picker[_ngcontent-%COMP%]   .open-status-btn.open-status-btn--active[_ngcontent-%COMP%] {\n  background: var(--%NS%color-primary);\n  border-color: var(--%NS%color-primary);\n  color: var(--%NS%color-bg-surface);\n}\n.report-form[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-10);\n}\n.report-options[_ngcontent-%COMP%] {\n  border: 1px solid var(--%NS%color-border);\n  border-radius: var(--%NS%radius-lg);\n  padding: var(--%NS%space-8) var(--%NS%space-12);\n  margin: 0;\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-2);\n}\n.report-option[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: var(--%NS%space-8);\n  min-height: var(--%NS%space-48);\n  font-size: var(--%NS%text-base);\n  cursor: pointer;\n}\n.report-option[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  margin: 0;\n  width: 18px;\n  height: 18px;\n  accent-color: var(--%NS%color-primary);\n}\n.report-status[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n.report-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: var(--%NS%space-8);\n  flex-wrap: wrap;\n}\n.pulse-empty[_ngcontent-%COMP%] {\n  margin: var(--%NS%space-8) 0 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n.pulse-gauges__hint[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: var(--%NS%text-sm);\n  color: var(--%NS%color-muted);\n}\n.pulse-gauges[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-12);\n}\n.pulse-gauges__arrows[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--%NS%space-20) var(--%NS%space-16);\n}\n.pulse-gauges__arrows[_ngcontent-%COMP%]   app-report-gauge[_ngcontent-%COMP%] {\n  flex: 0 1 auto;\n  max-width: 240px;\n}\n.pulse-gauges__arrows[_ngcontent-%COMP%] {\n}\n.pulse-gauges__arrows[_ngcontent-%COMP%]   .pulse-empty[_ngcontent-%COMP%] {\n  flex: 0 0 100%;\n}\n.pulse-gauges__captions[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-8);\n}\n.pulse-gauges__captions[_ngcontent-%COMP%]   app-report-gauge[_ngcontent-%COMP%] {\n  display: block;\n}\n.recent-reports[_ngcontent-%COMP%] {\n  margin: var(--%NS%space-8) 0 0;\n  padding: 0;\n  list-style: none;\n  display: flex;\n  flex-direction: column;\n  gap: var(--%NS%space-8);\n  max-height: 200px;\n  overflow-y: auto;\n}\n.recent-reports__entry[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: baseline;\n  gap: var(--%NS%space-12);\n  font-size: var(--%NS%text-lg);\n}\n.recent-reports__time[_ngcontent-%COMP%] {\n  flex: 0 0 auto;\n  min-width: 88px;\n  color: var(--%NS%color-muted);\n  font-size: var(--%NS%text-md);\n}\n.recent-reports__kind[_ngcontent-%COMP%] {\n  color: var(--%NS%color-text);\n}\n/*# sourceMappingURL=shelter-detail-page.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassMetadata(ShelterDetailPage, [{
    type: Component2,
    args: [{ selector: "app-shelter-detail-page", imports: [
      RouterLink,
      NgClass,
      DatePipe,
      ReactiveFormsModule,
      BannerComponent,
      ListState,
      LoadingIndicator,
      ReportGauge,
      TranslatePipe
    ], providers: [LeafletService], changeDetection: ChangeDetectionStrategy2.OnPush, template: `@if (notFound()) {
  <section class="shelter-detail shelter-detail--not-found">
    <h1 class="page-title">{{ 'detail.notFoundTitle' | t }}</h1>
    <p class="page-subtitle">{{ 'detail.notFoundBody' | t }}</p>
    <a routerLink="/map" class="btn btn--primary">{{ 'detail.backToMap' | t }}</a>
  </section>
} @else {
  <section class="shelter-detail">
    <a routerLink="/map" class="back-link">&larr; {{ 'detail.backToMap' | t }}</a>

    <header class="shelter-detail__header">
      <div class="shelter-detail__title-row">
        <h1 class="page-title">{{ shelter()?.name ?? ('detail.titleFallback' | t) }}</h1>
        @if (shelter(); as s) {
          <!-- Source/trust badge (community-review-queue D5): registry rows
               say which registry; USER rows say their trust state (NEW =
               "Newly added" amber, CONFIRMED = "Community-checked" green). -->
          <span class="badge" [ngClass]="communityBadgeClass(s)">
            {{ sourceTrustLabel(s) }}
          </span>
          @if (submitterVerificationKey(s); as submitterKey) {
            <!-- The submitter's verification depth
                 (submitter-verification-badge): derived LIVE by the API from
                 the author's current claims, so a row added at 1/2
                 verification reads "fully verified" the moment the second
                 channel is confirmed \u2014 nothing is stored on the row. Absent
                 for registry rows, deleted accounts and unverified authors. -->
            <span class="badge badge--submitter">{{ submitterKey | t }}</span>
          }
          @if (isPrivateLocation(s)) {
            <span class="badge badge--private">{{ 'shelter.privateBadge' | t }}</span>
          }
          <!-- Trust badges (shelter-trust-and-reports D6): same copy rules
               as the map list row \u2014 reported /
               fresh-CLOSED (amber; fresh OPEN renders no badge) /
               occupancy. -->
          @if (hasTrustBadges(s)) {
            @if (hasReports(s)) {
              <!-- The count \u2014 the nonexistentReports subset that
                   drives the badge (single-sourced with the map row). -->
              <span class="badge badge--reported">{{
                reportedBadgeText(s.nonexistentReports)
              }}</span>
            }
            @if (openStatusBadgeText(s.openStatus); as openText) {
              <span class="badge badge--closed">{{ openText }}</span>
            }
            @if (s.occupancy; as occ) {
              <span class="badge badge--occupancy">{{ occupancyText(occ) }}</span>
            }
          }
        }
      </div>
      @if (shelter(); as s) {
        @if (s.source === 'USER' && s.reviewStatus === 'NEW') {
          <!-- The unverified warning (community-review-queue): community
               rows in the NEW state only \u2014 CONFIRMED rows keep the
               "Community-checked" badge and NO warning. Subtle muted
               styling next to the trust-state badge \u2014 a caveat, NOT the
               crisis orange. -->
          <p class="community-warning">{{ 'shelter.unverifiedWarning' | t }}</p>
        }
        @if (s.inaccurate) {
          <!-- Marked inaccurate: the single-sourced warning \u2014
               the flag is the treatment, the row stays visible (status and
               trust state untouched). Independent of the review state. -->
          <p class="community-warning">{{ 'account.contrib.inaccurate' | t }}</p>
        }
        @if (isPrivateLocation(s)) {
          <!-- The private-home declaration (D7): resident-offered, not an
               official facility. Every PRIVATE row, on every visit. -->
          <p class="private-note">{{ 'shelter.privateNote' | t }}</p>
        }
      }
      @if (shelter(); as s) {
        @if (hasCoordinates(s)) {
          <!-- Navigate actions (map-crisis-actions D3): small secondary
               links near the name \u2014 they leave the app to the phone's own
               navigation app, they do not navigate within it, and they do
               not compete with the back link. The visible labels are the
               BRAND NAMES only (owner: short labels); the meaningful
               accessible names live in the aria-labels (detail.navigateAria
               / detail.appleMapsAria) \u2014 action + destination + service,
               so a screen reader hears what each link does, not just a
               brand. -->
          <div class="shelter-detail__navigate">
            <a
              [href]="navigateUrl(s)"
              target="_blank"
              rel="noopener"
              [attr.aria-label]="'detail.navigateAria' | t: { name: s.name }"
              >{{ 'detail.navigate' | t }}</a
            >
            <a
              [href]="appleMapsUrl(s)"
              target="_blank"
              rel="noopener"
              [attr.aria-label]="'detail.appleMapsAria' | t: { name: s.name }"
              >{{ 'detail.appleMaps' | t }}</a
            >
            <!-- Distance from you (location-navigation): the page's
                 ONLY geolocation trigger \u2014 browser asks first, the point
                 never leaves the device, the result is the straight-line
                 honesty line under the coordinates (never a route claim). -->
            <button
              type="button"
              class="shelter-detail__distance"
              (click)="distanceFromMe()"
              [disabled]="distancePending()"
              [attr.aria-busy]="distancePending()"
            >
              {{
                distancePending() ? ('detail.distance.pending' | t) : ('detail.distance.cta' | t)
              }}
            </button>
          </div>
        }
      }
      @if (shelter()?.address; as address) {
        <p class="shelter-detail__address">{{ address }}</p>
      }
      @if (shelter(); as s) {
        @if (hasCoordinates(s)) {
          <!-- The coordinate line (D6): .num-tabular keeps the figures from
               shifting (the submit page's readout uses the same class). -->
          <p class="shelter-detail__coords num-tabular">{{ coordinateLine(s) }}</p>
        }
      }
      @if (distanceKm() !== null) {
        <!-- Distance honesty (location-navigation D6): the
             straight line from the user's browser position \u2014 never a
             walking-route or official claim. -->
        <p class="shelter-detail__distance-line num-tabular" role="status">
          {{ 'detail.distance.fromYou' | t: { distance: straightLineText(distanceKm()!) } }}
        </p>
      } @else if (distanceError(); as msg) {
        <p class="shelter-detail__distance-error" role="alert">{{ msg }}</p>
      }
      @if (shelter(); as s) {
        <!-- Last verified: the per-entry server-derived stamp (M8:
             registry rows name the registry the check came from). For NEW
             community rows the line IS the not-yet-verified signal ("Newly
             added X d ago \u2014 not yet verified"). .num-tabular keeps the
             figures from shifting. The community report count is the
             SEPARATE line below \u2014 the two facts (when this entry was
             verified against its source / how many community reports
             exist) are never joined into one string. -->
        <p class="shelter-detail__verified num-tabular">{{ lastVerifiedText(s) }}</p>
        @if (hasCommunityReports(s)) {
          <!-- The labeled lifetime total over all report types \u2014 a
               self-contained fact, independent of the line above (the
               open/closed and how-full taps do not change it). -->
          <p class="shelter-detail__reports num-tabular">
            {{ communityReportsText(s.reportCount) }}
          </p>
        }
      }
    </header>

    <app-banner severity="error" [message]="error()" />
    @if (notice(); as n) {
      <app-banner severity="success" [message]="n.text" />
    }

    <!-- Location map: ALWAYS mounted in the non-not-found state (not inside
         the shelter branch) so the container exists at view-init time while
         the shelter \u2014 and its coordinates \u2014 are still in flight. Loading /
         error show the placeholder background; on load success the page
         flies here to street level and pins the shelter. The map is a
         picture of WHERE the shelter is: static marker, no picking, no
         marker navigation. -->
    <section class="detail-section" aria-labelledby="location-heading">
      <h2 class="section-title" id="location-heading">{{ 'detail.locationHeading' | t }}</h2>
      <div #mapEl class="shelter-detail__map"></div>
    </section>

    @if (loading()) {
      <app-loading-indicator class="detail-state" [message]="'detail.loading' | t" />
    } @else if (shelter(); as s) {
      @if (hasUserDetails()) {
        <section class="detail-section">
          <h2 class="section-title">{{ 'detail.detailsHeading' | t }}</h2>
          @if (s.description) {
            <p class="detail-description">{{ s.description }}</p>
          }
          @if (s.capacity !== null) {
            <p class="detail-meta">Capacity: {{ s.capacity }}</p>
          }
        </section>
      }

      <!-- Report how full (shelter-trust-and-reports D4/D6): three large
           band buttons, one tap, latest-wins. The user's current band is
           pre-selected from yourOccupancyBand; the current aggregate +
           recency render ONLY while fresh (the null block shows nothing).
           Verified viewers report; unverified/anonymous get the existing
           redirect vocabulary. -->
      <section class="detail-section" aria-labelledby="occupancy-heading">
        <h2 class="section-title" id="occupancy-heading">{{ 'detail.reportOccupancy' | t }}</h2>
        <!-- Community pulse (M9): the how-full gauge moved to the shared
             bottom container directly above the recent log (placement
             pass) \u2014 this section keeps the band picker. -->
        @if (auth.initialized() && auth.authenticated()) {
          @if (auth.isVerified()) {
            <div class="band-picker" role="group" [attr.aria-label]="'detail.occupancy.aria' | t">
              @for (band of BANDS; track band.value) {
                <button
                  type="button"
                  class="btn band-btn"
                  [class.band-btn--active]="s.yourOccupancyBand === band.value"
                  [attr.aria-pressed]="s.yourOccupancyBand === band.value"
                  [disabled]="reporting()"
                  (click)="reportBand(band.value)"
                >
                  {{ band.labelKey | t }}
                </button>
              }
            </div>
            @if (s.occupancy; as occ) {
              <p class="occupancy-line">{{ occupancyText(occ) }}</p>
            }
          } @else {
            <div class="report-gate-prompt">
              <p>{{ 'detail.verify.occupancy' | t }}</p>
              <a
                routerLink="/verify"
                [queryParams]="{ returnUrl: '/shelters/' + id() }"
                class="btn btn--primary"
                >{{ 'detail.verifyAccount' | t }}</a
              >
            </div>
          }
        } @else {
          <div class="report-gate-prompt">
            <p>{{ 'detail.login.occupancy' | t }}</p>
          </div>
        }
      </section>

      <!-- Report open/closed: two large state buttons,
           one tap, latest-wins \u2014 the "Report how full" section's structure
           mirrored 1:1 (same gates, same redirect vocabulary, same error
           handling). The user's current state is pre-selected from
           yourOpenStatus (radio-style pressed state); a tap fires
           putOpenStatus with the optimistic pressed state and refetches.
           Open is the default: a fresh OPEN renders no row badge, the
           picker is where the signal lives. -->
      <section class="detail-section" aria-labelledby="open-status-heading">
        <h2 class="section-title" id="open-status-heading">{{ 'detail.reportOpen' | t }}</h2>
        <!-- Community pulse (M9): the open/closed gauge moved to the
             shared bottom container directly above the recent log
             (placement pass) \u2014 this section keeps the state picker. -->
        @if (auth.initialized() && auth.authenticated()) {
          @if (auth.isVerified()) {
            <div
              class="open-status-picker"
              role="group"
              [attr.aria-label]="'detail.openStatus.aria' | t"
            >
              @for (option of OPEN_STATES; track option.value) {
                <button
                  type="button"
                  class="btn open-status-btn"
                  [class.open-status-btn--active]="openStatusPressed(option.value)"
                  [attr.aria-pressed]="openStatusPressed(option.value)"
                  [disabled]="reporting()"
                  (click)="reportOpenStatus(option.value)"
                >
                  {{ option.labelKey | t }}
                </button>
              }
            </div>
          } @else {
            <div class="report-gate-prompt">
              <p>{{ 'detail.verify.open' | t }}</p>
              <a
                routerLink="/verify"
                [queryParams]="{ returnUrl: '/shelters/' + id() }"
                class="btn btn--primary"
                >{{ 'detail.verifyAccount' | t }}</a
              >
            </div>
          }
        } @else {
          <div class="report-gate-prompt">
            <p>{{ 'detail.login.open' | t }}</p>
          </div>
        }
      </section>

      <!-- Report this shelter (shelter-trust-and-reports D1/D6): the typed
           report (verified only, one per type). The factual types
           (CLOSED / WRONG_LOCATION / OTHER) carry the detail field. -->
      <section class="detail-section" aria-labelledby="report-shelter-heading">
        <h2 class="section-title" id="report-shelter-heading">{{ 'detail.reportThis' | t }}</h2>
        @if (auth.initialized() && auth.authenticated()) {
          @if (auth.isVerified()) {
            @if (!reportOpen()) {
              <button
                type="button"
                class="btn btn--ghost"
                [disabled]="reporting()"
                (click)="openReport()"
              >
                {{ 'detail.report' | t }}
              </button>
            } @else {
              <form class="report-form" (submit)="$event.preventDefault(); submitReport()">
                <fieldset class="report-options" [attr.aria-label]="'detail.reportType.aria' | t">
                  @for (option of REPORT_TYPES; track option.value) {
                    <label class="report-option">
                      <input
                        type="radio"
                        name="shelter-report-type"
                        [value]="option.value"
                        [checked]="reportType() === option.value"
                        (change)="onReportTypeChange($event)"
                      />
                      {{ option.labelKey | t }}
                    </label>
                  }
                </fieldset>
                @if (reportDetailPlaceholder(); as placeholder) {
                  <div class="field">
                    <label for="report-detail">{{ 'detail.reportDetailLabel' | t }}</label>
                    <textarea
                      id="report-detail"
                      maxlength="500"
                      [formControl]="reportDetail"
                      [placeholder]="placeholder"
                    ></textarea>
                    @if (reportDetail.touched && reportDetail.invalid) {
                      <p class="field-error">{{ 'detail.reportDetailError' | t }}</p>
                    }
                  </div>
                }
                @if (reportDuplicate(); as dup) {
                  <p class="report-status" role="status">{{ dup }}</p>
                }
                <div class="report-actions">
                  <button
                    type="submit"
                    class="btn btn--primary"
                    [disabled]="reporting() || reportType() === null || reportDetail.invalid"
                  >
                    {{ reporting() ? ('detail.submitting' | t) : ('detail.submitReport' | t) }}
                  </button>
                  <button
                    type="button"
                    class="btn btn--ghost"
                    (click)="closeReport()"
                    [disabled]="reporting()"
                  >
                    {{ 'detail.cancel' | t }}
                  </button>
                </div>
              </form>
            }
          } @else {
            <div class="report-gate-prompt">
              <p>{{ 'detail.verify.report' | t }}</p>
              <a
                routerLink="/verify"
                [queryParams]="{ returnUrl: '/shelters/' + id() }"
                class="btn btn--primary"
                >{{ 'detail.verifyAccount' | t }}</a
              >
            </div>
          }
        } @else {
          <div class="report-gate-prompt">
            <p>{{ 'detail.login.report' | t }}</p>
          </div>
        }
      </section>

      <!-- Community pulse (M9): the two gauges, moved to the bottom of
           the page \u2014 DIRECTLY above the recent log they summarise
           (owner placement decision; the pickers stay in their own
           sections above). The weighted shares (server-derived) drive
           the needles. Layout (owner overlay fix): the ARROWS sit in
           .pulse-gauges__arrows \u2014 a wrapping row, side by side whenever
           both 240px gauges fit, stacked below that; the COUNT LINES
           (the captions \u2014 each gauge's accessible text, associated via
           aria-describedby) sit in .pulse-gauges__captions, ONE
           normal-flow column below the arrows, stacked one under the
           other. The window hint + ONE general estimate notice ("the
           arrows show a calculated estimate, not confirmed data" \u2014 a
           phrase true for BOTH arrows: open/closed is a probability,
           how-full an expected level; see detail.pulse.estimateNote)
           sit at the top with the window hint. The inline captions used
           to overflow their
           240px boxes (the count line's nowrap tokens carried no break
           opportunities) and paint over each other; the column + the
           wbr between the tokens keeps both lines always fully
           readable. Rendered for EVERY viewer (guests included) \u2014
           read-only; the empty state is explicit (no fresh reports \u2192
           no neutral arrow). DOM order: the arrows, then their count
           lines \u2014 a screen reader meets the summary before the log
           below. -->
      <div class="pulse-gauges">
        <!-- The window line: the gauges/counts are a FRESHNESS tally over
             the last two hours (the BE's OCCUPANCY_FRESHNESS_WINDOW) while
             the log below is a CHRONOLOGICAL log with no such window. The
             two time bases are stated right where the reader meets the
             counts \u2014 without it, "0 space available" reads as a
             contradiction of the (older) log entries. First in the DOM:
             a screen reader hears the window before the numbers it
             qualifies. -->
        <p class="pulse-gauges__hint">{{ 'detail.pulse.windowHint' | t }}</p>
        <!-- ONE general notice for the whole gauges section (owner): the
             arrows show a CALCULATED ESTIMATE from the fresh reports,
             not confirmed data. "Estimate" is true for BOTH arrows \u2014
             open/closed is a probability, how-full an expected level \u2014
             so the single phrase never mis-describes the how-full arrow
             (see the key's doc in core/i18n/messages.ts). Sits with the
             window hint; the per-gauge COUNT LINES below stay each
             gauge's accessible text (aria-describedby \u2192 count line). -->
        <p class="pulse-gauges__hint">{{ 'detail.pulse.estimateNote' | t }}</p>
        <div class="pulse-gauges__arrows">
          @if (occupancyPulse(); as occPulse) {
            <!-- The how-full arrow references its count-line id \u2014 the
                 count line is the gauge's accessible text. -->
            <app-report-gauge
              [leftLabel]="'detail.pulse.kind.space' | t"
              [rightLabel]="'detail.pulse.kind.full' | t"
              [share]="occPulse.fullness"
              [describedBy]="'pulse-occupancy-caption'"
            />
          } @else {
            <app-list-state
              class="pulse-empty"
              [kind]="'empty'"
              [messageKey]="'detail.pulse.emptyOccupancy'"
            />
          }
          @if (openPulse(); as openPulse) {
            <!-- The open/closed arrow references its count-line id \u2014 the
                 count line is the gauge's accessible text. -->
            <app-report-gauge
              [leftLabel]="'detail.pulse.kind.closed' | t"
              [rightLabel]="'detail.pulse.kind.open' | t"
              [share]="openPulse.openShare"
              [describedBy]="'pulse-open-caption'"
            />
          } @else {
            <app-list-state
              class="pulse-empty"
              [kind]="'empty'"
              [messageKey]="'detail.pulse.emptyOpen'"
            />
          }
        </div>
        @if (occupancyPulse() || openPulse()) {
          <div class="pulse-gauges__captions">
            @if (occupancyPulse(); as occPulse) {
              <app-report-gauge
                [captionOnly]="true"
                [captionId]="'pulse-occupancy-caption'"
                [text]="occupancyPulseText(occPulse)"
              />
            }
            @if (openPulse(); as openPulse) {
              <app-report-gauge
                [captionOnly]="true"
                [captionId]="'pulse-open-caption'"
                [text]="openPulseText(openPulse)"
              />
            }
          </div>
        }
      </div>

      <!-- Report log (M9 community pulse): the merged CHRONOLOGICAL log \u2014
           what was reported + when, newest first, capped server-side,
           with NO 2-hour window (the gauges above are the windowed
           tally; the heading + the window line say so). NO reporter
           identity (privacy: "a community member"). Read-only for every
           viewer. -->
      <section class="detail-section" aria-labelledby="recent-reports-heading">
        <h2 class="section-title" id="recent-reports-heading">{{ 'detail.pulse.recent' | t }}</h2>
        @if (recentReports().length) {
          <ul class="recent-reports">
            @for (entry of recentReports(); track $index) {
              <li class="recent-reports__entry">
                <span class="recent-reports__time num-tabular">{{ recentReportTime(entry) }}</span>
                <span class="recent-reports__kind">{{ recentReportKind(entry) }}</span>
              </li>
            }
          </ul>
        } @else {
          <app-list-state
            class="pulse-empty"
            [kind]="'empty'"
            [messageKey]="'detail.pulse.recentEmpty'"
          />
        }
      </section>

      <!-- Practical info (INFO-LAST-REPORTED): what was LAST REPORTED \u2014
           the Status row is the newest OPEN/CLOSED report, the Capacity
           row the newest SPACE/GETTING_FULL/FULL report, each with its
           own date and time in the viewer's locale (<time datetime> is
           the machine-readable instant). A kind with no report in the
           recent log \u2192 that row's explicit empty state (never a stale or
           invented status).

           NO derived-status row here (owner decision \u2014 do not re-add):
           the derived display status (shelterStatusText in
           shared/shelter-copy.ts) consults the SAME fresh open/closed
           reports and so usually prints the same word these rows already
           show, and the one case where it would differ \u2014 a lifecycle-
           INACTIVE row reading "Closed" \u2014 cannot be reached on this page
           (the public detail read 404s INACTIVE rows). The last-reported
           rows are strictly more informative: they carry the time. The
           rule is NOT dead \u2014 the map's "Open" chip (isOpenRow), the
           header's amber badge (openStatusBadgeText) and the
           admin-facing displays still consume it. Its full order, for
           the record: the FRESH open/closed reports outrank the
           lifecycle status \u2014 a fresh lone CLOSED report hedges
           ("Reported closed"), a fresh firm one (two+) is firm
           ("Closed"), a fresh OPEN reads "Open"; only with nothing fresh
           the lifecycle status decides \u2014 INACTIVE reads "Closed",
           ACTIVE reads "Open (no recent reports)". -->
      <section class="detail-section" aria-labelledby="info-heading">
        <h2 class="section-title" id="info-heading">{{ 'detail.infoHeading' | t }}</h2>
        <dl class="fact-list">
          <div class="fact-list__row">
            <dt class="fact-list__label">{{ 'detail.statusLabel' | t }}</dt>
            <dd class="fact-list__value">
              @if (lastOpenClosedReport(); as entry) {
                {{ lastReportText(entry) }}
                <time class="fact-list__time num-tabular" [attr.datetime]="entry.reportedAt">{{
                  entry.reportedAt | date: 'medium' : undefined : uiLocale()
                }}</time>
              } @else {
                {{ 'detail.statusEmpty' | t }}
              }
            </dd>
          </div>
          <div class="fact-list__row">
            <dt class="fact-list__label">{{ 'detail.capacityLabel' | t }}</dt>
            <dd class="fact-list__value">
              @if (lastCapacityReport(); as entry) {
                {{ lastReportText(entry) }}
                <time class="fact-list__time num-tabular" [attr.datetime]="entry.reportedAt">{{
                  entry.reportedAt | date: 'medium' : undefined : uiLocale()
                }}</time>
              } @else {
                {{ 'detail.capacityEmpty' | t }}
              }
            </dd>
          </div>
        </dl>
      </section>
    }
  </section>
}
`, styles: ['@charset "UTF-8";\n\n/* src/app/features/shelter/shelter-detail-page.scss */\n.shelter-detail {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-20);\n  max-width: 44rem;\n}\n.shelter-detail--not-found {\n  align-items: flex-start;\n}\n.back-link {\n  align-self: flex-start;\n  color: var(--color-primary);\n  text-decoration: none;\n  font-size: var(--text-md);\n}\n.back-link:hover {\n  text-decoration: underline;\n}\n.shelter-detail__header {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-8);\n}\n.shelter-detail__title-row {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: var(--space-10);\n}\n.badge.badge--submitter {\n  background: var(--color-bg-subtle);\n  border: 1px solid var(--color-border);\n  color: var(--color-muted);\n}\n.shelter-detail__address {\n  margin: 0;\n  color: var(--color-muted);\n}\n.community-warning {\n  margin: 0;\n  padding: var(--space-8) var(--space-12);\n  background: var(--color-bg-subtle);\n  border: 1px solid var(--color-border-subtle);\n  border-radius: var(--radius-md);\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n.private-note {\n  margin: 0;\n  padding: var(--space-8) var(--space-12);\n  background: var(--color-bg-subtle);\n  border: 1px solid var(--color-border-subtle);\n  border-radius: var(--radius-md);\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n.shelter-detail__navigate {\n  display: flex;\n  gap: var(--space-16);\n}\n.shelter-detail__navigate a {\n  color: var(--color-primary);\n  text-decoration: none;\n  font-size: var(--text-sm);\n}\n.shelter-detail__navigate a:hover {\n  text-decoration: underline;\n}\n.shelter-detail__navigate {\n}\n.shelter-detail__navigate .shelter-detail__distance {\n  padding: 0;\n  border: none;\n  background: none;\n  font-family: inherit;\n  color: var(--color-primary);\n  text-decoration: none;\n  font-size: var(--text-sm);\n  cursor: pointer;\n}\n.shelter-detail__navigate .shelter-detail__distance:hover:not(:disabled) {\n  text-decoration: underline;\n}\n.shelter-detail__navigate .shelter-detail__distance:disabled {\n  opacity: 0.6;\n  cursor: default;\n}\n.shelter-detail__distance-line {\n  margin: 0;\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n.shelter-detail__distance-error {\n  margin: 0;\n  color: var(--color-danger);\n  font-size: var(--text-sm);\n}\n.shelter-detail__coords {\n  margin: 0;\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n.shelter-detail__verified,\n.shelter-detail__reports {\n  margin: 0;\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n.detail-state {\n  color: var(--color-muted);\n  margin: 0;\n}\n.detail-state--error {\n  color: var(--color-danger);\n}\n.detail-section {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-10);\n  padding-top: var(--space-4);\n  border-top: 1px solid var(--color-border);\n}\n.section-title {\n  font-size: var(--text-xl);\n  font-weight: var(--font-weight-title);\n  margin: 0;\n}\n.detail-description {\n  margin: 0;\n  white-space: pre-line;\n}\n.shelter-detail__map {\n  height: 260px;\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n  background: var(--color-map-placeholder);\n}\n.detail-meta {\n  margin: 0;\n  color: var(--color-muted);\n  font-size: var(--text-md);\n}\n.fact-list {\n  margin: 0;\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-8);\n}\n.fact-list__row {\n  display: flex;\n  gap: var(--space-10);\n}\n.fact-list__label {\n  flex: 0 0 12rem;\n  margin: 0;\n  color: var(--color-muted);\n  font-size: var(--text-sm);\n}\n.fact-list__value {\n  margin: 0;\n  font-size: var(--text-sm);\n  display: flex;\n  flex-wrap: wrap;\n  align-items: baseline;\n  gap: var(--space-4) var(--space-8);\n}\n.fact-list {\n}\n.fact-list__time {\n  color: var(--color-muted);\n}\n.report-gate-prompt {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  gap: var(--space-10);\n}\n.report-gate-prompt p {\n  margin: 0;\n}\n.band-picker {\n  display: flex;\n  gap: var(--space-8);\n  flex-wrap: wrap;\n}\n.band-picker .band-btn {\n  flex: 1;\n  min-width: 0;\n  border-color: var(--color-border);\n  background: var(--color-bg-surface);\n  color: var(--color-text);\n}\n.band-picker .band-btn:hover:not(:disabled) {\n  border-color: var(--color-primary);\n}\n.band-picker .band-btn.band-btn--active {\n  background: var(--color-primary);\n  border-color: var(--color-primary);\n  color: var(--color-bg-surface);\n}\n.occupancy-line {\n  margin: 0;\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n.open-status-picker {\n  display: flex;\n  gap: var(--space-8);\n  flex-wrap: wrap;\n}\n.open-status-picker .open-status-btn {\n  flex: 1;\n  min-width: 0;\n  border-color: var(--color-border);\n  background: var(--color-bg-surface);\n  color: var(--color-text);\n}\n.open-status-picker .open-status-btn:hover:not(:disabled) {\n  border-color: var(--color-primary);\n}\n.open-status-picker .open-status-btn.open-status-btn--active {\n  background: var(--color-primary);\n  border-color: var(--color-primary);\n  color: var(--color-bg-surface);\n}\n.report-form {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-10);\n}\n.report-options {\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius-lg);\n  padding: var(--space-8) var(--space-12);\n  margin: 0;\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-2);\n}\n.report-option {\n  display: flex;\n  align-items: center;\n  gap: var(--space-8);\n  min-height: var(--space-48);\n  font-size: var(--text-base);\n  cursor: pointer;\n}\n.report-option input {\n  margin: 0;\n  width: 18px;\n  height: 18px;\n  accent-color: var(--color-primary);\n}\n.report-status {\n  margin: 0;\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n.report-actions {\n  display: flex;\n  gap: var(--space-8);\n  flex-wrap: wrap;\n}\n.pulse-empty {\n  margin: var(--space-8) 0 0;\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n.pulse-gauges__hint {\n  margin: 0;\n  font-size: var(--text-sm);\n  color: var(--color-muted);\n}\n.pulse-gauges {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-12);\n}\n.pulse-gauges__arrows {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-20) var(--space-16);\n}\n.pulse-gauges__arrows app-report-gauge {\n  flex: 0 1 auto;\n  max-width: 240px;\n}\n.pulse-gauges__arrows {\n}\n.pulse-gauges__arrows .pulse-empty {\n  flex: 0 0 100%;\n}\n.pulse-gauges__captions {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-8);\n}\n.pulse-gauges__captions app-report-gauge {\n  display: block;\n}\n.recent-reports {\n  margin: var(--space-8) 0 0;\n  padding: 0;\n  list-style: none;\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-8);\n  max-height: 200px;\n  overflow-y: auto;\n}\n.recent-reports__entry {\n  display: flex;\n  align-items: baseline;\n  gap: var(--space-12);\n  font-size: var(--text-lg);\n}\n.recent-reports__time {\n  flex: 0 0 auto;\n  min-width: 88px;\n  color: var(--color-muted);\n  font-size: var(--text-md);\n}\n.recent-reports__kind {\n  color: var(--color-text);\n}\n/*# sourceMappingURL=shelter-detail-page.css.map */\n'] }]
  }], () => [], { mapEl: [{ type: i02.ViewChild, args: ["mapEl", { isSignal: true }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassDebugInfo(ShelterDetailPage, { className: "ShelterDetailPage", filePath: "src/app/features/shelter/shelter-detail-page.ts", lineNumber: 151 });
})();
(() => {
  const id = "src%2Fapp%2Ffeatures%2Fshelter%2Fshelter-detail-page.ts%40ShelterDetailPage";
  function ShelterDetailPage_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i02.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i02.\u0275\u0275replaceMetadata(ShelterDetailPage, m.default, [i02, i1], [LeafletService, RouterLink, NgClass, ReactiveFormsModule, BannerComponent, ListState, LoadingIndicator, ReportGauge, DatePipe, TranslatePipe, Component2, ChangeDetectionStrategy2], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && ShelterDetailPage_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && ShelterDetailPage_HmrLoad(d.timestamp)));
})();
export {
  ShelterDetailPage
};
//# debugId=39b9830d-86de-532f-b236-df49544fe9bf


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvZmVhdHVyZXMvc2hlbHRlci9zaGVsdGVyLWRldGFpbC1wYWdlLnRzIiwic3JjL2FwcC9mZWF0dXJlcy9zaGVsdGVyL3NoZWx0ZXItZGV0YWlsLXBhZ2UuaHRtbCIsInNyYy9hcHAvc2hhcmVkL3JlcG9ydC1nYXVnZS50cyIsInNyYy9hcHAvc2hhcmVkL3JlcG9ydC1nYXVnZS5odG1sIiwic3JjL2FwcC9zaGFyZWQvZ2F1Z2UtbWF0aC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBhZnRlckV2ZXJ5UmVuZGVyLFxuICB0eXBlIEFmdGVyVmlld0luaXQsXG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDb21wb25lbnQsXG4gIHR5cGUgRWxlbWVudFJlZixcbiAgaW5qZWN0LFxuICB0eXBlIE9uRGVzdHJveSxcbiAgdHlwZSBPbkluaXQsXG4gIHNpZ25hbCxcbiAgdmlld0NoaWxkLFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IERhdGVQaXBlLCBOZ0NsYXNzIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7IEFjdGl2YXRlZFJvdXRlLCBSb3V0ZXJMaW5rIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7IEZvcm1Db250cm9sLCBSZWFjdGl2ZUZvcm1zTW9kdWxlLCBWYWxpZGF0b3JzIH0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuaW1wb3J0IHsgQXBpRXJyb3IgfSBmcm9tICcuLi8uLi9jb3JlL2FwaS1lcnJvcic7XG5pbXBvcnQgeyBJMThuU2VydmljZSB9IGZyb20gJy4uLy4uL2NvcmUvaTE4bi9pMThuLnNlcnZpY2UnO1xuaW1wb3J0IHR5cGUgeyBNZXNzYWdlS2V5IH0gZnJvbSAnLi4vLi4vY29yZS9pMThuL21lc3NhZ2VzJztcbmltcG9ydCB7IFRyYW5zbGF0ZVBpcGUgfSBmcm9tICcuLi8uLi9jb3JlL2kxOG4vdHJhbnNsYXRlLXBpcGUnO1xuaW1wb3J0IHsgQXV0aFN0b3JlIH0gZnJvbSAnLi4vLi4vc2Vzc2lvbi9hdXRoLXN0b3JlJztcbmltcG9ydCB0eXBlIHtcbiAgQ29tbXVuaXR5UHVsc2VPY2N1cGFuY3ksXG4gIENvbW11bml0eVB1bHNlT3BlbkNsb3NlZCxcbiAgQ29tbXVuaXR5UHVsc2VSZWNlbnRSZXBvcnQsXG4gIE9jY3VwYW5jeUJhbmQsXG4gIE9wZW5TdGF0ZSxcbiAgT3BlblN0YXR1c0R0byxcbiAgUmVwb3J0U2hlbHRlclJlcXVlc3QsXG4gIFJldmlld1N0YXR1cyxcbiAgU2hlbHRlckRldGFpbER0byxcbiAgU2hlbHRlckR0byxcbiAgU2hlbHRlck9jY3VwYW5jeSxcbiAgU2hlbHRlclJlcG9ydFR5cGUsXG4gIFNoZWx0ZXJTb3VyY2UsXG59IGZyb20gJy4uLy4uL2NvcmUvbW9kZWxzJztcbmltcG9ydCB7IFNoZWx0ZXJHYXRld2F5IH0gZnJvbSAnLi4vLi4vZ2F0ZXdheXMvc2hlbHRlci1nYXRld2F5JztcbmltcG9ydCB7IEJhbm5lckNvbXBvbmVudCB9IGZyb20gJy4uLy4uL3NoYXJlZC9iYW5uZXIuY29tcG9uZW50JztcbmltcG9ydCB7IGJhbm5lck1lc3NhZ2UgfSBmcm9tICcuLi8uLi9zaGFyZWQvZXJyb3ItY29weSc7XG5pbXBvcnQgeyBMaXN0U3RhdGUgfSBmcm9tICcuLi8uLi9zaGFyZWQvbGlzdC1zdGF0ZSc7XG5pbXBvcnQgeyBMb2FkaW5nSW5kaWNhdG9yIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2xvYWRpbmctaW5kaWNhdG9yJztcbmltcG9ydCB7IFJlcG9ydEdhdWdlIH0gZnJvbSAnLi4vLi4vc2hhcmVkL3JlcG9ydC1nYXVnZSc7XG5pbXBvcnQge1xuICBpc1ByaXZhdGVMb2NhdGlvbixcbiAgaGFzUmVwb3J0cyBhcyBoYXNSZXBvcnRzU2hhcmVkLFxuICBoYXNUcnVzdEJhZGdlcyBhcyBoYXNUcnVzdEJhZGdlc1NoYXJlZCxcbiAgb2NjdXBhbmN5VGV4dCBhcyBvY2N1cGFuY3lUZXh0U2hhcmVkLFxuICByZWNlbmN5VGV4dCBhcyByZWNlbmN5VGV4dFNoYXJlZCxcbiAgc291cmNlVHJ1c3RMYWJlbCBhcyBzb3VyY2VUcnVzdExhYmVsU2hhcmVkLFxuICBzdWJtaXR0ZXJWZXJpZmljYXRpb25LZXkgYXMgc3VibWl0dGVyVmVyaWZpY2F0aW9uS2V5U2hhcmVkLFxuICBjb21tdW5pdHlCYWRnZUNsYXNzIGFzIGNvbW11bml0eUJhZGdlQ2xhc3NTaGFyZWQsXG4gIHJlcG9ydGVkQmFkZ2VUZXh0IGFzIHJlcG9ydGVkQmFkZ2VUZXh0U2hhcmVkLFxuICBsYXN0VmVyaWZpZWRUZXh0IGFzIGxhc3RWZXJpZmllZFRleHRTaGFyZWQsXG4gIGNvbW11bml0eVJlcG9ydHNUZXh0IGFzIGNvbW11bml0eVJlcG9ydHNUZXh0U2hhcmVkLFxuICBoYXNDb21tdW5pdHlSZXBvcnRzIGFzIGhhc0NvbW11bml0eVJlcG9ydHNTaGFyZWQsXG4gIG9wZW5TdGF0dXNCYWRnZVRleHQgYXMgb3BlblN0YXR1c0JhZGdlVGV4dFNoYXJlZCxcbiAgc3RyYWlnaHRMaW5lVGV4dCBhcyBzdHJhaWdodExpbmVUZXh0U2hhcmVkLFxufSBmcm9tICcuLi8uLi9zaGFyZWQvc2hlbHRlci1jb3B5JztcbmltcG9ydCB7XG4gIEVTVE9OSUFfQ0VOVEVSLFxuICBFU1RPTklBX1pPT00sXG4gIExlYWZsZXRTZXJ2aWNlLFxuICBTSEVMVEVSX1pPT00sXG59IGZyb20gJy4uLy4uL3NoYXJlZC9sZWFmbGV0LXNlcnZpY2UnO1xuaW1wb3J0IHtcbiAgZ2V0Q3VycmVudFBvc2l0aW9uSGlnaEFjY3VyYWN5LFxuICBHZW9sb2NhdGlvbkVycm9yLFxuICB0eXBlIEdlb2xvY2F0aW9uRmFpbHVyZUtpbmQsXG4gIGhhdmVyc2luZUttLFxufSBmcm9tICcuLi8uLi9zaGFyZWQvZ2VvbG9jYXRpb24nO1xuaW1wb3J0IHsgTU9OVEhfQUJCUkVWUyB9IGZyb20gJy4uLy4uL2NvcmUvaTE4bi9sb2NhbGUnO1xuXG4vKipcbiAqIFBlci1lcnJvciBrZXlzIGZvciB0aGUgXCJEaXN0YW5jZSBmcm9tIHlvdVwiIGFjdGlvbiAobG9jYXRpb24tbmF2aWdhdGlvbikuXG4gKiBONyBpMThuLWNvbXBsZXRlbmVzczogdGhlIG1hcCBwYWdlJ3MgTkVBUkVTVF9LRVkgdm9jYWJ1bGFyeSwgUkVVU0VEIOKAlFxuICogdGhlIEVOIHZhbHVlcyBhcmUgYnl0ZS1pZGVudGljYWwgdG8gdGhlIG9sZCBwYWdlLWxvY2FsIERJU1RBTkNFX0NPUFlcbiAqICh2ZXJpZmllZCBjaGFyYWN0ZXItZm9yLWNoYXJhY3RlciksIGFuZCB0aGUgRVQvUlUgdHJhbnNsYXRpb25zIGV4aXN0XG4gKiBleGFjdGx5IG9uY2UgaW4gdGhlIGNhdGFsb2cgaW5zdGVhZCBvZiB0d2ljZS5cbiAqL1xuY29uc3QgRElTVEFOQ0VfS0VZOiBSZWNvcmQ8R2VvbG9jYXRpb25GYWlsdXJlS2luZCwgTWVzc2FnZUtleT4gPSB7XG4gIGRlbmllZDogJ21hcC5uZWFyZXN0LmRlbmllZCcsXG4gIHRpbWVvdXQ6ICdtYXAubmVhcmVzdC50aW1lb3V0JyxcbiAgdW5zdXBwb3J0ZWQ6ICdtYXAubmVhcmVzdC51bnN1cHBvcnRlZCcsXG4gIHVuYXZhaWxhYmxlOiAnbWFwLm5lYXJlc3QudW5hdmFpbGFibGUnLFxuICBpbnNlY3VyZTogJ21hcC5uZWFyZXN0Lmluc2VjdXJlJyxcbn07XG5cbi8qKiBUaGUgcmVjZW50LWxvZyBraW5kIOKGkiBsb2NhbGl6ZWQgc3RhdGUtbm91biBrZXkgKE05IGNvbW11bml0eSBwdWxzZSkuXG4gKiAgVGhlIGxvb2t1cCBpcyB0b3RhbCBvdmVyIHRoZSA1LXZhbHVlIGtpbmQgdW5pb247IHRoZSBmYWxsYmFjayBpc1xuICogIGRlZmVuc2l2ZSBvbmx5IChhIGtpbmQgb3V0c2lkZSB0aGUgdW5pb24gY2Fubm90IGFycml2ZSBmcm9tIHRoZSBCRSkuICovXG5jb25zdCBSRUNFTlRfS0lORF9LRVlTOiBSZWNvcmQ8Q29tbXVuaXR5UHVsc2VSZWNlbnRSZXBvcnRbJ2tpbmQnXSwgTWVzc2FnZUtleT4gPSB7XG4gIE9QRU46ICdkZXRhaWwucHVsc2Uua2luZC5vcGVuJyxcbiAgQ0xPU0VEOiAnZGV0YWlsLnB1bHNlLmtpbmQuY2xvc2VkJyxcbiAgU1BBQ0U6ICdkZXRhaWwucHVsc2Uua2luZC5zcGFjZScsXG4gIEdFVFRJTkdfRlVMTDogJ2RldGFpbC5wdWxzZS5raW5kLmdldHRpbmdGdWxsJyxcbiAgRlVMTDogJ2RldGFpbC5wdWxzZS5raW5kLmZ1bGwnLFxufTtcblxuLyoqXG4gKiAvc2hlbHRlcnMvOmlkIOKAlCB0aGUgcHVibGljIHNoZWx0ZXIgZGV0YWlsIHBhZ2VcbiAqICgwNS1zaGVsdGVyLXJldmlldy1mbG93LnB1bWwpLlxuICpcbiAqIFRoaW4gc2hlbGwgKDAxLVRBU0subWQgwqc3KTogc3RhdGUgaW4gc2lnbmFscywgYmVoYXZpb3VyIGRlbGVnYXRlZCDigJRcbiAqIGdhdGV3YXlzIG93biB0aGUgQVBJLCBBdXRoU3RvcmUgb3ducyB0aGUgc2Vzc2lvbi4gRmV0Y2hlcyB0aGUgc2hlbHRlciBvblxuICogaW5pdDsgYWZ0ZXIgYW55IHN1Y2Nlc3NmdWwgdHJ1c3QtbGF5ZXIgd3JpdGUgKHJlcG9ydCAvIG9jY3VwYW5jeSAvXG4gKiBvcGVuLXN0YXR1cykgaXQgcmVmZXRjaGVzIOKAlCB0aGUgYmFja2VuZCBvd25zIHRoZSBkZXJpdmVkIHN0YXRlLCBhIGNoZWFwXG4gKiBmdWxsIHJlZmV0Y2ggaXMgYWx3YXlzIGNvbnNpc3RlbnQuXG4gKlxuICogVGhlIHJldmlld3MgbW9kZWwgaXMgR09ORSAob3duZXIgZGVjaXNpb24pOiBubyByZXZpZXcgbGlzdCwgbm8gcmV2aWV3XG4gKiBmb3JtLCBubyBwZXItcmV2aWV3IHJlcG9ydHMuIEluIHBsYWNlIG9mIHRoZSBvbGQgUmV2aWV3cyBzZWN0aW9uIHRoZVxuICogcGFnZSBzaG93cyBhIHNtYWxsIHByYWN0aWNhbCBpbmZvIGJsb2NrIChJTkZPLUxBU1QtUkVQT1JURUQpOiB0aGUgTEFTVFxuICogUkVQT1JURUQgb3Blbi9jbG9zZWQgc3RhdGUgYW5kIHRoZSBsYXN0IHJlcG9ydGVkIGhvdy1mdWxsIGJhbmQsIGVhY2hcbiAqIHdpdGggaXRzIHJlcG9ydCdzIGRhdGUgYW5kIHRpbWUuIFRoZSBkZXJpdmVkIGRpc3BsYXkgc3RhdHVzIGlzXG4gKiBkZWxpYmVyYXRlbHkgTk9UIGEgcm93IGhlcmUgKHNlZSB0aGUgSW5mbyBzZWN0aW9uIGNvbW1lbnQgaW4gdGhlXG4gKiB0ZW1wbGF0ZSBmb3IgdGhlIHJlYXNvbmluZykg4oCUIHRoZSBoZWFkZXIgYmFkZ2Ugc3RpbGwgY2FycmllcyBpdHNcbiAqIENMT1NFRCBjb3B5IHZpYSBvcGVuU3RhdHVzQmFkZ2VUZXh0IChzaGFyZWQgcnVsZSB3aXRoIHRoZSBtYXAncyBcIk9wZW5cIlxuICogY2hpcCwgc2luZ2xlIHNvdXJjZSBpbiBzaGFyZWQvc2hlbHRlci1jb3B5LnRzKS5cbiAqXG4gKiBMb2NhdGlvbiBtYXA6IGEgc21hbGwgU1RBVElDIG1hcCB1bmRlciB0aGUgaGVhZGVyIChwYWdlLXNjb3BlZFxuICogTGVhZmxldFNlcnZpY2UsIHNhbWUgcGF0dGVybiBhcyB0aGUgL3N1Ym1pdCBtaW5pLW1hcCkuIFRoZSBjb250YWluZXIgaXNcbiAqIG1vdW50ZWQgaW4gZXZlcnkgRk9VTkQgc3RhdGUg4oCUIGxvYWRpbmcsIGVycm9yIGFuZCBzaGVsdGVyLCBhbGwgaW5zaWRlIHRoZVxuICogbm90LWZvdW5kIEBlbHNlIGJyYW5jaCAoaXQgaXMgTk9UIGluc2lkZSB0aGUgc2hlbHRlciBicmFuY2gsIHNvIHRoZSBhc3luY1xuICogZmV0Y2ggbmV2ZXIgcmFjZXMgdGhlIG1hcCkuIFRoZSBub3QtZm91bmQgc3RhdGUgcmVuZGVycyBubyBjb250YWluZXIgYXRcbiAqIGFsbCwgc28gdGhlIG1hcCBsaWZldGltZSBpcyB0cmFja2VkIGV4cGxpY2l0bHk6IGNyZWF0ZSgpIHJ1bnMgaW5cbiAqIG5nQWZ0ZXJWaWV3SW5pdCBhdCB0aGUgRXN0b25pYSBkZWZhdWx0IChudWxsLWd1YXJkZWQgd2hlbiB0aGUgY29udGFpbmVyIGlzXG4gKiBhYnNlbnQsIGUuZy4gYW4gaW52YWxpZCA6aWQgb24gZmlyc3QgbG9hZCk7IGEgZmxpcCB0byB0aGUgbm90LWZvdW5kIHN0YXRlXG4gKiAobG9hZCA0MDQgLyBpbnZhbGlkIGlkKSBkZXN0cm95cyB0aGUgbGl2ZSBtYXAsIG90aGVyd2lzZSB0aGUgdW5tb3VudGVkXG4gKiBjb250YWluZXIgd291bGQgbGVhayB0aGUgaW5zdGFuY2U7IGEgbm90LWZvdW5kIC0+IGZvdW5kIGZsaXAgcmUtY3JlYXRlc1xuICogdGhlIG1hcCBvbiB0aGUgRlJFU0ggZGl2IHdoZW4gdGhlIGxvYWQgc2V0dGxlcyAoc2VlIGVuc3VyZUxvY2F0aW9uTWFwKCkpLlxuICogT24gbG9hZCBzdWNjZXNzIHRoZSBwYWdlIGZsaWVzIHRvIHRoZSBzaGVsdGVyIGF0IFNIRUxURVJfWk9PTSArIHBpbnMgaXRcbiAqIHdpdGggc2hvd1NoZWx0ZXIgKG9uZSBub24taW50ZXJhY3RpdmUgbWFya2VyIOKAlCBubyBwaWNraW5nLCBubyBtYXJrZXJcbiAqIG5hdmlnYXRpb24pLlxuICovXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhcHAtc2hlbHRlci1kZXRhaWwtcGFnZScsXG4gIGltcG9ydHM6IFtcbiAgICBSb3V0ZXJMaW5rLFxuICAgIE5nQ2xhc3MsXG4gICAgRGF0ZVBpcGUsXG4gICAgUmVhY3RpdmVGb3Jtc01vZHVsZSxcbiAgICBCYW5uZXJDb21wb25lbnQsXG4gICAgTGlzdFN0YXRlLFxuICAgIExvYWRpbmdJbmRpY2F0b3IsXG4gICAgUmVwb3J0R2F1Z2UsXG4gICAgVHJhbnNsYXRlUGlwZSxcbiAgXSxcbiAgcHJvdmlkZXJzOiBbTGVhZmxldFNlcnZpY2VdLFxuICB0ZW1wbGF0ZVVybDogJy4vc2hlbHRlci1kZXRhaWwtcGFnZS5odG1sJyxcbiAgc3R5bGVVcmw6ICcuL3NoZWx0ZXItZGV0YWlsLXBhZ2Uuc2NzcycsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxufSlcbmV4cG9ydCBjbGFzcyBTaGVsdGVyRGV0YWlsUGFnZSBpbXBsZW1lbnRzIE9uSW5pdCwgQWZ0ZXJWaWV3SW5pdCwgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSByZWFkb25seSBnYXRld2F5ID0gaW5qZWN0KFNoZWx0ZXJHYXRld2F5KTtcbiAgcHJpdmF0ZSByZWFkb25seSBzdG9yZSA9IGluamVjdChBdXRoU3RvcmUpO1xuICBwcml2YXRlIHJlYWRvbmx5IHJvdXRlID0gaW5qZWN0KEFjdGl2YXRlZFJvdXRlKTtcbiAgcHJpdmF0ZSByZWFkb25seSBsZWFmbGV0ID0gaW5qZWN0KExlYWZsZXRTZXJ2aWNlKTtcbiAgLyoqIFJlc29sdmVzIHRoZSByZXBvcnQgZGV0YWlsIGZpZWxkJ3MgcGVyLXR5cGUgcGxhY2Vob2xkZXIgKGkxOG4tZXQtZW4pLlxuICAgKiAgQWxzbyB0aGUgc2VhbSBmb3IgdGhlIHNoYXJlZCBzaGVsdGVyLWNvcHkgaGVscGVycyAoTjcgaTE4bi1cbiAgICogIGNvbXBsZXRlbmVzcyk6IHRoZXkgcmVzb2x2ZSB0aGVpciBjb3B5IHRocm91Z2ggdGhlIGFjdGl2ZSBsb2NhbGUuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgaTE4biA9IGluamVjdChJMThuU2VydmljZSk7XG4gIC8qKiBUaGUgYWN0aXZlLWxvY2FsZSByZXNvbHZlciBwYXNzZWQgdG8gdGhlIHNoYXJlZCBjb3B5IGhlbHBlcnMuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgdHJhbnNsYXRlID0gKFxuICAgIGtleTogTWVzc2FnZUtleSxcbiAgICBwYXJhbXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXI+LFxuICApOiBzdHJpbmcgPT4gdGhpcy5pMThuLnQoa2V5LCBwYXJhbXMpO1xuICAvKiogVGhlIGFjdGl2ZSBVSSBsb2NhbGUsIGV4cG9zZWQgdG8gdGhlIHRlbXBsYXRlIHNvIHRoZSBJbmZvIHNlY3Rpb24nc1xuICAgKiAgPHRpbWU+IHN0YW1wcyBmb3JtYXQgaW4gdGhlIFZJRVdFUidTIGxhbmd1YWdlIChub3QgdGhlIGNvbnRlbnRcbiAgICogIGxhbmd1YWdlKSDigJQgdGhlIHNhbWUgc2VhbSB0aGUgdCBwaXBlIGFuZCB0aGUgYWNjb3VudCBwYW5lbCB1c2UuICovXG4gIHByb3RlY3RlZCByZWFkb25seSB1aUxvY2FsZSA9IHRoaXMuaTE4bi5sb2NhbGU7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBtYXBFbCA9IHZpZXdDaGlsZDxFbGVtZW50UmVmPEhUTUxFbGVtZW50Pj4oJ21hcEVsJyk7XG5cbiAgLyoqIFRoZSBzaGVsdGVyIGlkIGZyb20gL3NoZWx0ZXJzLzppZCAobnVsbCA9IGludmFsaWQgaWQgLT4gbm90LWZvdW5kKS4gKi9cbiAgcmVhZG9ubHkgaWQgPSBzaWduYWw8bnVtYmVyIHwgbnVsbD4obnVsbCk7XG4gIC8qKiBEZXRhaWwgcHJvamVjdGlvbiDigJQgdGhlIGxpc3QgZmllbGRzICsgeW91ck9jY3VwYW5jeUJhbmQgKEQ1KS4gKi9cbiAgcmVhZG9ubHkgc2hlbHRlciA9IHNpZ25hbDxTaGVsdGVyRGV0YWlsRHRvIHwgbnVsbD4obnVsbCk7XG4gIHJlYWRvbmx5IGxvYWRpbmcgPSBzaWduYWwoZmFsc2UpO1xuICByZWFkb25seSBlcnJvciA9IHNpZ25hbDxzdHJpbmcgfCBudWxsPihudWxsKTtcbiAgcmVhZG9ubHkgbm90Rm91bmQgPSBzaWduYWwoZmFsc2UpO1xuICAvKiogQSB0cnVzdC1sYXllciB3cml0ZSAocmVwb3J0IC8gb2NjdXBhbmN5KSBpcyBpbiBmbGlnaHQuICovXG4gIHJlYWRvbmx5IHJlcG9ydGluZyA9IHNpZ25hbChmYWxzZSk7XG4gIHJlYWRvbmx5IG5vdGljZSA9IHNpZ25hbDx7IHNldmVyaXR5OiAnc3VjY2Vzcyc7IHRleHQ6IHN0cmluZyB9IHwgbnVsbD4obnVsbCk7XG5cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGF1dGggPSB0aGlzLnN0b3JlO1xuXG4gIC8qKiBUaGUgc2hhcmVkIHNvdXJjZS90cnVzdCBjb3B5LCBleHBvc2VkIHRvIHRoZSB0ZW1wbGF0ZSAoQW5ndWxhcidzXG4gICAqICB0ZW1wbGF0ZSBzY29wZSBpcyB0aGUgY29tcG9uZW50IGNsYXNzKS4gVGhlIGhlYWRlciBiYWRnZSBzaG93cyB0aGVcbiAgICogIHNvdXJjZSBsYWJlbCAocmVnaXN0cnkgcm93cykgb3IgdGhlIHRydXN0LXN0YXRlIGxhYmVsIChVU0VSIHJvd3MsXG4gICAqICBjb21tdW5pdHktcmV2aWV3LXF1ZXVlIEQ1KSBhbmQsIGZyb20gc2hlbHRlci10cnVzdC1hbmQtcmVwb3J0cywgdGhlXG4gICAqICB0cnVzdCBiYWRnZXMgKEQ2KS4gRWFjaCB3cmFwcGVyIGluamVjdHMgdGhlIGkxOG4gc2VhbSBzbyB0aGUgYmFkZ2VcbiAgICogIHJlYWRzIGluIHRoZSBhY3RpdmUgbG9jYWxlIOKAlCB0aGUgY2F0YWxvZyBrZXlzIGFyZSB0aGUgc2FtZSBvbmVzIHRoZVxuICAgKiAgYmFuZCBwaWNrZXIgYW5kIHRoZSAvbWluZSBwYW5lbCBhbHJlYWR5IHJlbmRlciAob25lIHdvcmQgcGVyIGZhY3QpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgc291cmNlVHJ1c3RMYWJlbCA9IChzOiB7XG4gICAgc291cmNlOiBTaGVsdGVyU291cmNlO1xuICAgIHJldmlld1N0YXR1czogUmV2aWV3U3RhdHVzO1xuICB9KTogc3RyaW5nID0+IHNvdXJjZVRydXN0TGFiZWxTaGFyZWQocywgdGhpcy50cmFuc2xhdGUpO1xuICAvKiogVGhlIHN1Ym1pdHRlcidzIHZlcmlmaWNhdGlvbiBkZXB0aCBiYWRnZSBrZXkgKHN1Ym1pdHRlci12ZXJpZmljYXRpb24tXG4gICAqICBiYWRnZSkg4oCUIG51bGwgcmVuZGVycyBOTyBiYWRnZS4gUmVuZGVyZWQgdGhyb3VnaCB0aGUgYHwgdGAgcGlwZSBzbyB0aGVcbiAgICogIGJhZGdlIGZvbGxvd3MgdGhlIGFjdGl2ZSBsb2NhbGUuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBzdWJtaXR0ZXJWZXJpZmljYXRpb25LZXkgPSBzdWJtaXR0ZXJWZXJpZmljYXRpb25LZXlTaGFyZWQ7XG4gIHByb3RlY3RlZCByZWFkb25seSBjb21tdW5pdHlCYWRnZUNsYXNzID0gY29tbXVuaXR5QmFkZ2VDbGFzc1NoYXJlZDtcbiAgLyoqIFRoZSBsaXN0IHJvdydzIGZyZXNoLUNMT1NFRCBiYWRnZSDigJQgdGhlIHNhbWUgY29weSB0aGUgc3RhdHVzIHJvdyB1c2VzO1xuICAgKiAgZnJlc2ggT1BFTiByb3dzIHJlbmRlciBubyBiYWRnZS4gKi9cbiAgcHJvdGVjdGVkIHJlYWRvbmx5IG9wZW5TdGF0dXNCYWRnZVRleHQgPSAob3BlblN0YXR1czogT3BlblN0YXR1c0R0byB8IG51bGwpID0+XG4gICAgb3BlblN0YXR1c0JhZGdlVGV4dFNoYXJlZChvcGVuU3RhdHVzLCB0aGlzLnRyYW5zbGF0ZSk7XG4gIHByb3RlY3RlZCByZWFkb25seSBvY2N1cGFuY3lUZXh0ID0gKG9jY3VwYW5jeTogU2hlbHRlck9jY3VwYW5jeSkgPT5cbiAgICBvY2N1cGFuY3lUZXh0U2hhcmVkKG9jY3VwYW5jeSwgRGF0ZS5ub3coKSwgdGhpcy50cmFuc2xhdGUpO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgaGFzUmVwb3J0cyA9IGhhc1JlcG9ydHNTaGFyZWQ7XG4gIHByb3RlY3RlZCByZWFkb25seSBoYXNUcnVzdEJhZGdlcyA9IGhhc1RydXN0QmFkZ2VzU2hhcmVkO1xuICAvKiogTGFzdC12ZXJpZmllZCBtZXRhOiB0aGUgcmVwb3J0ZWQgYmFkZ2Ugd2l0aCBpdHMgY291bnQsIHRoZSBwZXItXG4gICAqICBlbnRyeSB2ZXJpZmljYXRpb24gbGluZSBhbmQgdGhlIGNvbW11bml0eSByZXBvcnQgY291bnQgbGluZS4gVGhlXG4gICAqICBtb250aC1hYmJyZXZpYXRpb24gcGFyYW0gZm9sbG93cyB0aGUgYWN0aXZlIGxvY2FsZSAobG9jYWxlIGRhdGEpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcmVwb3J0ZWRCYWRnZVRleHQgPSAobm9uZXhpc3RlbnRSZXBvcnRzOiBudW1iZXIpID0+XG4gICAgcmVwb3J0ZWRCYWRnZVRleHRTaGFyZWQobm9uZXhpc3RlbnRSZXBvcnRzLCB0aGlzLnRyYW5zbGF0ZSk7XG4gIHByb3RlY3RlZCByZWFkb25seSBsYXN0VmVyaWZpZWRUZXh0ID0gKHM6IHtcbiAgICBsYXN0VmVyaWZpZWRBdDogc3RyaW5nIHwgbnVsbDtcbiAgICByZXZpZXdTdGF0dXM6IFJldmlld1N0YXR1cztcbiAgICBjcmVhdGVkQXQ6IHN0cmluZztcbiAgICBzb3VyY2U6IFNoZWx0ZXJTb3VyY2U7XG4gIH0pOiBzdHJpbmcgPT5cbiAgICBsYXN0VmVyaWZpZWRUZXh0U2hhcmVkKHMsIERhdGUubm93KCksIHRoaXMudHJhbnNsYXRlLCBNT05USF9BQkJSRVZTW3RoaXMuaTE4bi5sb2NhbGUoKV0pO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgY29tbXVuaXR5UmVwb3J0c1RleHQgPSAocmVwb3J0Q291bnQ6IG51bWJlcikgPT5cbiAgICBjb21tdW5pdHlSZXBvcnRzVGV4dFNoYXJlZChyZXBvcnRDb3VudCwgdGhpcy50cmFuc2xhdGUpO1xuICAvKiogVGhlIHNoYXJlZCBzdHJhaWdodC1saW5lIGRpc3RhbmNlIGZvcm1hdHRlciAobG9jYXRpb24tbmF2aWdhdGlvbjogdGhlXG4gICAqICBtYXAgcm93cyArIHRoaXMgcGFnZSdzIGRpc3RhbmNlIGxpbmUgY29uc3VtZSB0aGUgc2FtZSBob25lc3R5IGZvcm1hdCkuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBzdHJhaWdodExpbmVUZXh0ID0gKGttOiBudW1iZXIpID0+IHN0cmFpZ2h0TGluZVRleHRTaGFyZWQoa20sIHRoaXMudHJhbnNsYXRlKTtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGhhc0NvbW11bml0eVJlcG9ydHMgPSBoYXNDb21tdW5pdHlSZXBvcnRzU2hhcmVkO1xuXG4gIC8vIC0tLS0gY29tbXVuaXR5IHB1bHNlIChNOSDigJQgcmVwb3J0IGFnZ3JlZ2F0aW9uIFVJKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKipcbiAgICogVGhlIGhvdy1mdWxsIGdhdWdlJ3MgYWdncmVnYXRlIChNOSk6IHRoZSBmcmVzaCAo4omkIDIgaCkgYmFuZCBjb3VudHMgK1xuICAgKiB0aGUgdHJ1c3Qtd2VpZ2h0ZWQgZW1wdHnihpJmdWxsIHNoYXJlLiBudWxsID0gbm90aGluZyBmcmVzaCDihpIgdGhlXG4gICAqIGV4cGxpY2l0IGVtcHR5IHN0YXRlIChuZXZlciBhIG5ldXRyYWwgYXJyb3cpLiBEZXRhaWwtcmVhZCBvbmx5IOKAlCBhblxuICAgKiBvbGRlciBCRSBvbWl0cyB0aGUgZmllbGQgKHVuZGVmaW5lZCDihpIgbnVsbCwgdGhlIEZFLXNoaXBzLWFoZWFkIHJ1bGUpLlxuICAgKi9cbiAgcHJvdGVjdGVkIG9jY3VwYW5jeVB1bHNlKCk6IENvbW11bml0eVB1bHNlT2NjdXBhbmN5IHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuc2hlbHRlcigpPy5jb21tdW5pdHlQdWxzZT8ub2NjdXBhbmN5ID8/IG51bGw7XG4gIH1cblxuICAvKiogVGhlIG9wZW4vY2xvc2VkIGdhdWdlJ3MgYWdncmVnYXRlIChNOSkg4oCUIHNhbWUgcnVsZXMgYXMge0BsaW5rIG9jY3VwYW5jeVB1bHNlfS4gKi9cbiAgcHJvdGVjdGVkIG9wZW5QdWxzZSgpOiBDb21tdW5pdHlQdWxzZU9wZW5DbG9zZWQgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5zaGVsdGVyKCk/LmNvbW11bml0eVB1bHNlPy5vcGVuQ2xvc2VkID8/IG51bGw7XG4gIH1cblxuICAvKiogVGhlIG1lcmdlZCByZWNlbnQtcmVwb3J0IGxvZyAoTTkpOiBuZXdlc3QgZmlyc3QsIGNhcHBlZCBzZXJ2ZXItc2lkZS5cbiAgICogIEVtcHR5IOKGkiB0aGUgc2VjdGlvbidzIGVtcHR5IHN0YXRlLiAqL1xuICBwcm90ZWN0ZWQgcmVjZW50UmVwb3J0cygpOiBDb21tdW5pdHlQdWxzZVJlY2VudFJlcG9ydFtdIHtcbiAgICByZXR1cm4gdGhpcy5zaGVsdGVyKCk/LmNvbW11bml0eVB1bHNlPy5yZWNlbnRSZXBvcnRzID8/IFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBvcGVuL2Nsb3NlZCBnYXVnZSdzIHZpc2libGUgKyBhY2Nlc3NpYmxlIGNvdW50IGxpbmUgKHRoZSBQTEFJTlxuICAgKiBmcmVzaCBjb3VudHMg4oCUIHRoZSBhbmdsZSBpcyBuZXZlciB0aGUgb25seSBjYXJyaWVyIG9mIG1lYW5pbmcpLlxuICAgKi9cbiAgcHJvdGVjdGVkIG9wZW5QdWxzZVRleHQocHVsc2U6IENvbW11bml0eVB1bHNlT3BlbkNsb3NlZCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuaTE4bi50KCdkZXRhaWwucHVsc2Uub3BlbkNsb3NlZFRleHQnLCB7XG4gICAgICBvcGVuOiBwdWxzZS5vcGVuUmVwb3J0cyxcbiAgICAgIGNsb3NlZDogcHVsc2UuY2xvc2VkUmVwb3J0cyxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBUaGUgaG93LWZ1bGwgZ2F1Z2UncyB2aXNpYmxlICsgYWNjZXNzaWJsZSBjb3VudCBsaW5lLiAqL1xuICBwcm90ZWN0ZWQgb2NjdXBhbmN5UHVsc2VUZXh0KHB1bHNlOiBDb21tdW5pdHlQdWxzZU9jY3VwYW5jeSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuaTE4bi50KCdkZXRhaWwucHVsc2Uub2NjdXBhbmN5VGV4dCcsIHtcbiAgICAgIHNwYWNlOiBwdWxzZS5zcGFjZVJlcG9ydHMsXG4gICAgICBnZXR0aW5nRnVsbDogcHVsc2UuZ2V0dGluZ0Z1bGxSZXBvcnRzLFxuICAgICAgZnVsbDogcHVsc2UuZnVsbFJlcG9ydHMsXG4gICAgfSk7XG4gIH1cblxuICAvKiogVGhlIGxvZyBlbnRyeSdzIHJlbGF0aXZlIHRpbWUgKHRoZSBzaGFyZWQgcmVjZW5jeSBmb3JtYXR0ZXIg4oCUIHRoZVxuICAgKiAgb2NjdXBhbmN5IGJhZGdlJ3MgXCIxMiBtaW4gYWdvXCIgdm9jYWJ1bGFyeSksIHRocm91Z2ggdGhlIGkxOG4gc2VhbS4gKi9cbiAgcHJvdGVjdGVkIHJlY2VudFJlcG9ydFRpbWUoZW50cnk6IENvbW11bml0eVB1bHNlUmVjZW50UmVwb3J0KTogc3RyaW5nIHtcbiAgICByZXR1cm4gcmVjZW5jeVRleHRTaGFyZWQoZW50cnkucmVwb3J0ZWRBdCwgRGF0ZS5ub3coKSwgdGhpcy50cmFuc2xhdGUpO1xuICB9XG5cbiAgLyoqIFRoZSBsb2cgZW50cnkncyBcImEgY29tbXVuaXR5IG1lbWJlciByZXBvcnRlZDoge2tpbmR9XCIgbGluZSDigJQgTk9cbiAgICogIHJlcG9ydGVyIGlkZW50aXR5IChwcml2YWN5OiB0aGUgbG9nIHNheXMgd2hhdCArIHdoZW4sIG5ldmVyIHdobykuICovXG4gIHByb3RlY3RlZCByZWNlbnRSZXBvcnRLaW5kKGVudHJ5OiBDb21tdW5pdHlQdWxzZVJlY2VudFJlcG9ydCk6IHN0cmluZyB7XG4gICAgY29uc3Qga2luZEtleTogTWVzc2FnZUtleSA9IFJFQ0VOVF9LSU5EX0tFWVNbZW50cnkua2luZF0gPz8gJ2RldGFpbC5wdWxzZS5raW5kLmZ1bGwnO1xuICAgIHJldHVybiB0aGlzLmkxOG4udCgnZGV0YWlsLnB1bHNlLnJlY2VudEVudHJ5JywgeyBraW5kOiB0aGlzLmkxOG4udChraW5kS2V5KSB9KTtcbiAgfVxuXG4gIC8vIC0tLS0gaW5mbyBzZWN0aW9uOiB0aGUgbGFzdCByZXBvcnRlZCBzdGF0dXMvY2FwYWNpdHkgKElORk8tTEFTVC1SRVBPUlRFRCkgLS1cbiAgLyoqXG4gICAqIFRoZSBuZXdlc3QgcmVwb3J0IGFtb25nIHRoZSBnaXZlbiBraW5kcyBvdmVyIHRoZSBtZXJnZWQgcmVjZW50IGxvZy5cbiAgICogVGhlIGxvZyBpcyBzZXJ2ZXItb3JkZXJlZCBuZXdlc3QtZmlyc3QsIGJ1dCB0aGUgZXhwbGljaXQgbWF4IGtlZXBzIHRoZVxuICAgKiBydWxlIGhvbmVzdCBpZiB0aGUgb3JkZXIgZXZlciBkcmlmdHMuIG51bGwgPSBubyByZXBvcnQgb2YgdGhvc2Uga2luZHNcbiAgICogaW4gdGhlIGxvZyDigJQgdGhlIHJvdyByZW5kZXJzIGl0cyBleHBsaWNpdCBlbXB0eSBzdGF0ZSwgbmV2ZXIgYSBzdGFsZVxuICAgKiBvciBpbnZlbnRlZCBzdGF0dXMuXG4gICAqL1xuICBwcml2YXRlIG5ld2VzdFJlcG9ydE9mKFxuICAgIGtpbmRzOiByZWFkb25seSBDb21tdW5pdHlQdWxzZVJlY2VudFJlcG9ydFsna2luZCddW10sXG4gICk6IENvbW11bml0eVB1bHNlUmVjZW50UmVwb3J0IHwgbnVsbCB7XG4gICAgbGV0IG5ld2VzdDogQ29tbXVuaXR5UHVsc2VSZWNlbnRSZXBvcnQgfCBudWxsID0gbnVsbDtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHRoaXMucmVjZW50UmVwb3J0cygpKSB7XG4gICAgICBpZiAoIWtpbmRzLmluY2x1ZGVzKGVudHJ5LmtpbmQpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG5ld2VzdCA9PT0gbnVsbCB8fCBEYXRlLnBhcnNlKGVudHJ5LnJlcG9ydGVkQXQpID4gRGF0ZS5wYXJzZShuZXdlc3QucmVwb3J0ZWRBdCkpIHtcbiAgICAgICAgbmV3ZXN0ID0gZW50cnk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXdlc3Q7XG4gIH1cblxuICAvKiogVGhlIFwiU3RhdHVzXCIgcm93J3MgZW50cnk6IHRoZSBuZXdlc3QgT1BFTi9DTE9TRUQgcmVwb3J0IOKAlCB0aGUgbmV3ZXN0XG4gICAqICBlbnRyeSBvdmVyYWxsIG1heSBiZSBhIGhvdy1mdWxsIHJlcG9ydCBhbmQgbmV2ZXIgYmVjb21lcyB0aGUgc3RhdHVzLlxuICAgKiAgbnVsbCDihpIgdGhlIHJvdydzIGVtcHR5IHN0YXRlLiAqL1xuICBwcm90ZWN0ZWQgbGFzdE9wZW5DbG9zZWRSZXBvcnQoKTogQ29tbXVuaXR5UHVsc2VSZWNlbnRSZXBvcnQgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5uZXdlc3RSZXBvcnRPZihbJ09QRU4nLCAnQ0xPU0VEJ10pO1xuICB9XG5cbiAgLyoqIFRoZSBcIkNhcGFjaXR5XCIgcm93J3MgZW50cnk6IHRoZSBuZXdlc3QgU1BBQ0UvR0VUVElOR19GVUxML0ZVTExcbiAgICogIHJlcG9ydCDigJQgYW4gT1BFTi9DTE9TRUQgcmVwb3J0IG5ldmVyIGJlY29tZXMgdGhlIGNhcGFjaXR5LlxuICAgKiAgbnVsbCDihpIgdGhlIHJvdydzIGVtcHR5IHN0YXRlLiAqL1xuICBwcm90ZWN0ZWQgbGFzdENhcGFjaXR5UmVwb3J0KCk6IENvbW11bml0eVB1bHNlUmVjZW50UmVwb3J0IHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMubmV3ZXN0UmVwb3J0T2YoWydTUEFDRScsICdHRVRUSU5HX0ZVTEwnLCAnRlVMTCddKTtcbiAgfVxuXG4gIC8qKiBUaGUgcmVwb3J0ZWQgcm93J3MgdmFsdWUgKFwiTGFzdCByZXBvcnRlZCBhcyB7a2luZH1cIik6IHRoZSBraW5kIG5vdW5cbiAgICogIHJldXNlcyB0aGUgcmVjZW50IGxvZydzIGRldGFpbC5wdWxzZS5raW5kLiogdm9jYWJ1bGFyeS4gKi9cbiAgcHJvdGVjdGVkIGxhc3RSZXBvcnRUZXh0KGVudHJ5OiBDb21tdW5pdHlQdWxzZVJlY2VudFJlcG9ydCk6IHN0cmluZyB7XG4gICAgY29uc3Qga2luZEtleTogTWVzc2FnZUtleSA9IFJFQ0VOVF9LSU5EX0tFWVNbZW50cnkua2luZF0gPz8gJ2RldGFpbC5wdWxzZS5raW5kLmZ1bGwnO1xuICAgIHJldHVybiB0aGlzLmkxOG4udCgnZGV0YWlsLmxhc3RSZXBvcnRlZCcsIHsga2luZDogdGhpcy5pMThuLnQoa2luZEtleSkgfSk7XG4gIH1cblxuICAvLyAtLS0tIGRpc3RhbmNlIGZyb20geW91IChsb2NhdGlvbi1uYXZpZ2F0aW9uKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyoqIFRydWUgd2hpbGUgdGhlIGdlb2xvY2F0aW9uIHJlcXVlc3QgZm9yIHRoZSBkaXN0YW5jZSBpcyBpbiBmbGlnaHQuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBkaXN0YW5jZVBlbmRpbmcgPSBzaWduYWwoZmFsc2UpO1xuICAvKiogVGhlIGxhc3Qgc3VjY2VzcydzIHN0cmFpZ2h0LWxpbmUgZGlzdGFuY2UgaW4ga20gKG51bGwgPSBub25lIHlldCkuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBkaXN0YW5jZUttID0gc2lnbmFsPG51bWJlciB8IG51bGw+KG51bGwpO1xuICAvKiogVGhlIGxhc3QgbG9jYXRlIGZhaWx1cmUncyBwZXItZXJyb3IgY29weSAobnVsbCA9IG5vbmUpLiBBIGZhaWx1cmVcbiAgICogIHJlbmRlcnMgdGhlIGVycm9yIGxpbmUgYW5kIE5PIGRpc3RhbmNlIGxpbmUgKHRoZSBzdWNjZXNzIGxpbmUgY2xlYXJzXG4gICAqICB1cCBmcm9udCwgdGhlIHNhbWUgY29udmVudGlvbiBhcyB0aGUgbWFwIENUQSkuIFJlc29sdmVkIGZyb20gdGhlXG4gICAqICBtYXAubmVhcmVzdC4qIGNhdGFsb2cga2V5cyAodGhlIG1hcCBDVEEncyB2b2NhYnVsYXJ5IOKAlCBzZWVcbiAgICogIERJU1RBTkNFX0tFWSkuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBkaXN0YW5jZUVycm9yID0gc2lnbmFsPHN0cmluZyB8IG51bGw+KG51bGwpO1xuICAvKiogVGhlIHByaXZhdGUtbG9jYXRpb24gcHJlZGljYXRlIChENykg4oCUIHRoZSB0ZW1wbGF0ZSBzdGF5cyBicmFuY2gtZnJlZS5cbiAgICogIFRoZSBiYWRnZSArIG5vdGUgKyB3YXJuaW5ncyByZW5kZXIgdGhyb3VnaCB0aGUgdCBwaXBlIGluIHRoZSB0ZW1wbGF0ZVxuICAgKiAgKHNoZWx0ZXIuKiAvIGFjY291bnQuY29udHJpYi5pbmFjY3VyYXRlIGtleXMpLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgaXNQcml2YXRlTG9jYXRpb24gPSBpc1ByaXZhdGVMb2NhdGlvbjtcblxuICAvLyAtLS0tIHRydXN0IGxheWVyIChzaGVsdGVyLXRydXN0LWFuZC1yZXBvcnRzIEQxL0Q0L0Q2KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qKiBUaGUgdGhyZWUgTkVHQVRJVkUgcmVwb3J0IHR5cGVzICsgdGhlaXIgcGlja2VyIGxhYmVsczogdGhlIHBpY2tlciBpc1xuICAgKiAgbmVnYXRpdmUtb25seSDigJQgXCJJdCBkb2VzIG5vdCBleGlzdFwiIC9cbiAgICogIFwiVGhlIGxvY2F0aW9uIGlzIHdyb25nXCIgLyBcIlNvbWV0aGluZyBlbHNlXCIuIENMT1NFRCBhbmQgT1BFTl9DT05GSVJNRURcbiAgICogIHN0YXkgaW4gdGhlIFNoZWx0ZXJSZXBvcnRUeXBlIHVuaW9uLCB0aGUgYWRtaW4gbGFiZWwgbWFwIGFuZCB0aGVcbiAgICogIGhpc3RvcmljYWwgcmVuZGVyaW5nICh0aGV5IGV4aXN0IGluIHN0b3JlZCBkYXRhKSwgYnV0IHRoZSBwaWNrZXIgbm9cbiAgICogIGxvbmdlciBvZmZlcnMgZWl0aGVyIOKAlCBvcGVuL2Nsb3NlZCBtb3ZlZCB0byBpdHMgb3duIGxpdmUtcmVwb3J0XG4gICAqICBzZWN0aW9uIGJlbG93LiBUaGUgZmFjdHVhbCB0eXBlcyAoV1JPTkdfTE9DQVRJT05cbiAgICogIC8gT1RIRVIpIGNhcnJ5IHRoZSBkZXRhaWwgZmllbGQncyBwZXItdHlwZSBwbGFjZWhvbGRlcjsgdGhlIGJpbmFyeVxuICAgKiAgdHlwZSBzdGF5cyBjbGFpbS1vbmx5LiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgUkVQT1JUX1RZUEVTOiB7XG4gICAgdmFsdWU6IFNoZWx0ZXJSZXBvcnRUeXBlO1xuICAgIGxhYmVsS2V5OiBNZXNzYWdlS2V5O1xuICAgIGRldGFpbEtleT86IE1lc3NhZ2VLZXk7XG4gIH1bXSA9IFtcbiAgICB7IHZhbHVlOiAnTk9OX0VYSVNURU5UJywgbGFiZWxLZXk6ICdkZXRhaWwucmVwb3J0VHlwZS5ub25FeGlzdGVudCcgfSxcbiAgICB7XG4gICAgICB2YWx1ZTogJ1dST05HX0xPQ0FUSU9OJyxcbiAgICAgIGxhYmVsS2V5OiAnZGV0YWlsLnJlcG9ydFR5cGUud3JvbmdMb2NhdGlvbicsXG4gICAgICBkZXRhaWxLZXk6ICdkZXRhaWwucmVwb3J0RGV0YWlsUGxhY2Vob2xkZXIud3JvbmdMb2NhdGlvbicsXG4gICAgfSxcbiAgICB7XG4gICAgICB2YWx1ZTogJ09USEVSJyxcbiAgICAgIGxhYmVsS2V5OiAnZGV0YWlsLnJlcG9ydFR5cGUub3RoZXInLFxuICAgICAgZGV0YWlsS2V5OiAnZGV0YWlsLnJlcG9ydERldGFpbFBsYWNlaG9sZGVyLm90aGVyJyxcbiAgICB9LFxuICBdO1xuXG4gIC8qKiBUaGUgdGhyZWUgb2NjdXBhbmN5IGJhbmRzIChENCkg4oCUIHRoZSBwaWNrZXIncyBsYXJnZSBidXR0b25zLiAqL1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgQkFORFM6IHsgdmFsdWU6IE9jY3VwYW5jeUJhbmQ7IGxhYmVsS2V5OiBNZXNzYWdlS2V5IH1bXSA9IFtcbiAgICB7IHZhbHVlOiAnU1BBQ0UnLCBsYWJlbEtleTogJ2RldGFpbC5iYW5kLnNwYWNlJyB9LFxuICAgIHsgdmFsdWU6ICdHRVRUSU5HX0ZVTEwnLCBsYWJlbEtleTogJ2RldGFpbC5iYW5kLmdldHRpbmdGdWxsJyB9LFxuICAgIHsgdmFsdWU6ICdGVUxMJywgbGFiZWxLZXk6ICdkZXRhaWwuYmFuZC5mdWxsJyB9LFxuICBdO1xuXG4gIC8qKiBUaGUgdHdvIG9wZW4vY2xvc2VkIHN0YXRlcyDigJQgdGhlIHBpY2tlcidzIGxhcmdlXG4gICAqICBidXR0b25zLCB0aGUgYmFuZCBwaWNrZXIncyBsYW5ndWFnZSBtaXJyb3JlZCAxOjEuICovXG4gIHByb3RlY3RlZCByZWFkb25seSBPUEVOX1NUQVRFUzogeyB2YWx1ZTogT3BlblN0YXRlOyBsYWJlbEtleTogTWVzc2FnZUtleSB9W10gPSBbXG4gICAgeyB2YWx1ZTogJ09QRU4nLCBsYWJlbEtleTogJ2RldGFpbC5vcGVuU3RhdGUub3BlbicgfSxcbiAgICB7IHZhbHVlOiAnQ0xPU0VEJywgbGFiZWxLZXk6ICdkZXRhaWwub3BlblN0YXRlLmNsb3NlZCcgfSxcbiAgXTtcblxuICAvKiogVGhlIHNoZWx0ZXItcmVwb3J0IHBpY2tlciBpcyBvcGVuICh0aGUgXCJSZXBvcnRcIiBidXR0b24gdG9nZ2xlcyBpdCkuICovXG4gIHJlYWRvbmx5IHJlcG9ydE9wZW4gPSBzaWduYWwoZmFsc2UpO1xuICByZWFkb25seSByZXBvcnRUeXBlID0gc2lnbmFsPFNoZWx0ZXJSZXBvcnRUeXBlIHwgbnVsbD4obnVsbCk7XG4gIHJlYWRvbmx5IHJlcG9ydERldGFpbCA9IG5ldyBGb3JtQ29udHJvbCgnJywge1xuICAgIG5vbk51bGxhYmxlOiB0cnVlLFxuICAgIHZhbGlkYXRvcnM6IFtWYWxpZGF0b3JzLm1heExlbmd0aCg1MDApXSxcbiAgfSk7XG4gIC8qKiBQbGFpbiBzZW50ZW5jZS1jYXNlIGR1cGxpY2F0ZSAoNDA5KSBsaW5lIGZvciB0aGUgb3BlbiBzaGVsdGVyIHBpY2tlci4gKi9cbiAgcmVhZG9ubHkgcmVwb3J0RHVwbGljYXRlID0gc2lnbmFsPHN0cmluZyB8IG51bGw+KG51bGwpO1xuXG4gIC8qKiBNb25vdG9uaWMgZmV0Y2ggc2VxdWVuY2Ug4oCUIGEgc3RhbGUgKG91dC1vZi1vcmRlcikgcmVzcG9uc2UgaXMgZHJvcHBlZC4gKi9cbiAgcHJpdmF0ZSBmZXRjaFNlcSA9IDA7XG5cbiAgLyoqIFRoZSB0YXBwZWQgb3Blbi9jbG9zZWQgc3RhdGUgd2hpbGUgdGhlIHVwc2VydCBpcyBpbiBmbGlnaHQ6IHRoZVxuICAgKiAgb3B0aW1pc3RpYyBwcmVzc2VkIHN0YXRlIOKAlCBjbGVhcmVkIG9uIHNldHRsZSwgdGhlIHJlZmV0Y2gnc1xuICAgKiAgeW91ck9wZW5TdGF0dXMgaXMgdGhlIHNldHRsZWQgcHJlLXNlbGVjdC4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSBvcGVuU3RhdHVzUGVuZGluZyA9IHNpZ25hbDxPcGVuU3RhdGUgfCBudWxsPihudWxsKTtcblxuICAvKiogVHJ1ZSB3aGlsZSB0aGUgTG9jYXRpb24gbWFwIGluc3RhbmNlIGlzIGFsaXZlIChzZWUgdGhlIGFmdGVyUmVuZGVyXG4gICAqICBob29rOiB0aGUgZm91bmQgYnJhbmNoIHJlLW1vdW50cyBhIGZyZXNoICNtYXBFbCBhZnRlciBhbnkgbm90LWZvdW5kXG4gICAqICBmbGlwLCBzbyB0aGUgcGFnZSBtdXN0IGtub3cgd2hlbiB0aGUgY29udGFpbmVyIG91dGxpdmVkIHRoZSBtYXApLiAqL1xuICBwcml2YXRlIGxvY2F0aW9uTWFwQWxpdmUgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICAvKipcbiAgICAgKiBGaXJlcyBhZnRlciBFVkVSWSByZW5kZXIgb2YgdGhpcyBjb21wb25lbnQuIFRoZSBmb3VuZCBicmFuY2hcbiAgICAgKiBSRS1NT1VOVFMgYSBmcmVzaCAjbWFwRWwgYWZ0ZXIgYW55IG5vdC1mb3VuZCBmbGlwICh3aGljaCBkZXN0cm95ZWRcbiAgICAgKiB0aGUgbWFwKSDigJQgdGhpcyByZS1jcmVhdGVzIHRoZSBpbnN0YW5jZSB0aGUgbW9tZW50IHRoZSBmcmVzaFxuICAgICAqIGNvbnRhaW5lciBpcyBpbiB0aGUgRE9NIChjcmVhdGUgaXMgYSBuby1vcCB3aGlsZSBhbiBpbnN0YW5jZSBpc1xuICAgICAqIGFsaXZlIG9yIHRoZSBjb250YWluZXIgaXMgYWJzZW50KSwgYW5kIHJlLXBpbnMgd2hlbiB0aGUgc2hlbHRlciBpc1xuICAgICAqIGFscmVhZHkgbG9hZGVkIChpdHMgcGluIHJhbiBvbiB0aGUgZGVhZCBtYXAgYW5kIG5vLW9wZWQpLiBUaGVcbiAgICAgKiBsb2FkLXN1Y2Nlc3MgcGF0aCBwaW5zIHRoZSBvdGhlciB3YXkgKGZldGNoIGluIGZsaWdodCBhdCByZS1yZW5kZXIpLlxuICAgICAqL1xuICAgIGFmdGVyRXZlcnlSZW5kZXIoKCkgPT4ge1xuICAgICAgY29uc3QgcmVjcmVhdGVkID0gdGhpcy5lbnN1cmVMb2NhdGlvbk1hcCgpO1xuICAgICAgaWYgKHJlY3JlYXRlZCkge1xuICAgICAgICAvLyBUaGUgZnJlc2ggbWFwIGhhcyBubyBwaW4geWV0IOKAlCB0aGUgcHJlLXJlY3JlYXRpb24gcGluIG5vLW9wZWQgb25cbiAgICAgICAgLy8gdGhlIGRlYWQgaW5zdGFuY2UuIChObyByZS1waW4gb24gb3JkaW5hcnkgcmVuZGVyczogdGhlIGxpdmUgbWFwXG4gICAgICAgIC8vIGFscmVhZHkgY2FycmllcyB0aGUgcGluIGFuZCByZS1mbHlpbmcgd291bGQgcmVzdGFydCB0aGVcbiAgICAgICAgLy8gYW5pbWF0aW9uIG9uIGV2ZXJ5IHJlbmRlci4pXG4gICAgICAgIGNvbnN0IHNoZWx0ZXIgPSB0aGlzLnNoZWx0ZXIoKTtcbiAgICAgICAgaWYgKHNoZWx0ZXIgIT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLnBpblNoZWx0ZXIoc2hlbHRlcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgTG9jYXRpb24gbWFwIGNvbnRhaW5lciBleGlzdHMgYXQgdmlldy1pbml0IHRpbWUgaW4gZXZlcnkgZm91bmRcbiAgICogc3RhdGUgKGl0IGlzIE5PVCBpbnNpZGUgdGhlIHNoZWx0ZXIgYnJhbmNoKSwgc28gdGhlIGFzeW5jIGZldGNoIG5ldmVyXG4gICAqIHJhY2VzIHRoZSBtYXA6IHdlIGNyZWF0ZSBhdCB0aGUgRXN0b25pYSBkZWZhdWx0IGhlcmUuIEEgbWlzc2luZ1xuICAgKiBjb250YWluZXIgKGFuIGludmFsaWQgOmlkIG9uIGZpcnN0IGxvYWQgcmVuZGVycyB0aGUgbm90LWZvdW5kIGJyYW5jaClcbiAgICogaXMgYSBzYWZlIG5vLW9wIHZpYSBjcmVhdGUncyBudWxsIGd1YXJkLiBUaGUgbm90LWZvdW5kIGZsaXAgZGVzdHJveXNcbiAgICogdGhlIG1hcCDigJQgc2VlIGxvYWQoKSAvIHJlYWRTaGVsdGVySWQoKTsgYSBmb3VuZCByZS1yZW5kZXIgcmUtY3JlYXRlc1xuICAgKiBpdCDigJQgc2VlIHRoZSBhZnRlclJlbmRlciBob29rLlxuICAgKi9cbiAgbmdBZnRlclZpZXdJbml0KCk6IHZvaWQge1xuICAgIHRoaXMuZW5zdXJlTG9jYXRpb25NYXAoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbnN1cmVzIHRoZSBMb2NhdGlvbiBtYXAgaW5zdGFuY2UgbWF0Y2hlcyB0aGUgcmVuZGVyZWQgY29udGFpbmVyOlxuICAgKiBjcmVhdGVzIGl0IHdoZW4gdGhlIGZvdW5kIGJyYW5jaCdzICNtYXBFbCBpcyBtb3VudGVkIGFuZCBubyBpbnN0YW5jZSBpc1xuICAgKiBhbGl2ZSAoZmlyc3QgbG9hZCwgb3IgdGhlIHJlLW1vdW50IGFmdGVyIGEgbm90LWZvdW5kIGZsaXApLiBOby1vcFxuICAgKiBvdGhlcndpc2Ug4oCUIHNhZmUgdG8gY2FsbCBmcm9tIGV2ZXJ5IGZvdW5kIHJlbmRlciBhbmQgbG9hZCBvdXRjb21lLlxuICAgKiBAcmV0dXJucyB0cnVlIHdoZW4gYSBmcmVzaCBpbnN0YW5jZSB3YXMgY3JlYXRlZCBvbiB0aGlzIGNhbGwuXG4gICAqL1xuICBwcml2YXRlIGVuc3VyZUxvY2F0aW9uTWFwKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGVsID0gdGhpcy5tYXBFbCgpPy5uYXRpdmVFbGVtZW50ID8/IG51bGw7XG4gICAgaWYgKGVsID09PSBudWxsIHx8IHRoaXMubG9jYXRpb25NYXBBbGl2ZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLmxlYWZsZXQuY3JlYXRlKGVsLCBFU1RPTklBX0NFTlRFUiwgRVNUT05JQV9aT09NKTtcbiAgICB0aGlzLmxvY2F0aW9uTWFwQWxpdmUgPSB0cnVlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIERyb3BzIHRoZSBsaXZlIExvY2F0aW9uIG1hcCB3aXRoIHRoZSB1bm1vdW50aW5nIGNvbnRhaW5lcjpcbiAgICogdGhlIG5vdC1mb3VuZCBicmFuY2ggcmVuZGVycyBubyAjbWFwRWwsIHNvIGEgbGl2ZSBpbnN0YW5jZSB3b3VsZCBsZWFrIHdpdGhcbiAgICogaXRzIGxpc3RlbmVycy4gTnVsbC1zYWZlIHdoZW4gY3JlYXRlIHdhcyBhIG5vLW9wOyB0aGUgYWZ0ZXJSZW5kZXIgaG9va1xuICAgKiByZS1hcm1zIG9uIHRoZSBuZXh0IGZvdW5kIHJlbmRlci5cbiAgICovXG4gIHByaXZhdGUgZGVzdHJveUxvY2F0aW9uTWFwKCk6IHZvaWQge1xuICAgIHRoaXMubG9jYXRpb25NYXBBbGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMubGVhZmxldC5kZXN0cm95KCk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICAvLyBEcm9wIHRoZSBMb2NhdGlvbiBtYXAgaW5zdGFuY2UgKyBsaXN0ZW5lcnMgKHBhZ2Utc2NvcGVkLCBzYW1lXG4gICAgLy8gZGlzY2lwbGluZSBhcyBNYXBQYWdlIC8gU3VibWl0U2hlbHRlclBhZ2Ug4oCUIHpvbmVsZXNzIGhhcyBubyBzYWZldHlcbiAgICAvLyBuZXQpLlxuICAgIHRoaXMubG9jYXRpb25NYXBBbGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMubGVhZmxldC5kZXN0cm95KCk7XG4gIH1cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICAvLyBSZS1yZWFkIHRoZSA6aWQgb24gRVZFUlkgbmF2aWdhdGlvbiB0byB0aGlzIHJvdXRlIOKAlCBhXG4gICAgLy8gbWFudWFsIFVSTCBlZGl0ICgvc2hlbHRlcnMvMSAtPiAvc2hlbHRlcnMvMikgbXVzdCBzd2FwIHRoZSBkYXRhLCBub3RcbiAgICAvLyBrZWVwIHRoZSBvbGQgc2hlbHRlciAoYSB0cnVzdC1sYXllciB3cml0ZSB3b3VsZCBvdGhlcndpc2UgbGFuZCBvbiB0aGVcbiAgICAvLyB3cm9uZyBzaGVsdGVyKS4gcGFyYW1NYXAgcmVwbGF5cyB0aGUgY3VycmVudCBwYXJhbXMgb24gc3Vic2NyaWJlLFxuICAgIC8vIHJlcGxhY2luZyB0aGUgb2xkIHNuYXBzaG90IHJlYWQ7IGl0IGNvbXBsZXRlcyB3aGVuIHRoZSByb3V0ZVxuICAgIC8vIGRlYWN0aXZhdGVzLCBzbyB0aGUgc3Vic2NyaXB0aW9uIG5lZWRzIG5vIG1hbnVhbCB0ZWFyZG93bi4gVGhlXG4gICAgLy8gZmV0Y2hTZXEgZ3VhcmQgaW4gbG9hZCgpIGRyb3BzIHRoZSBzdXBlcnNlZGVkIGluLWZsaWdodCByZXNwb25zZS5cbiAgICB0aGlzLnJvdXRlLnBhcmFtTWFwLnN1YnNjcmliZSgocGFyYW1zKSA9PiB0aGlzLnJlYWRTaGVsdGVySWQocGFyYW1zLmdldCgnaWQnKSkpO1xuICB9XG5cbiAgLyoqIFBhcnNlICsgYWRvcHQgdGhlIDppZCBwYXJhbSAoaW52YWxpZCBpZCAtPiBub3QtZm91bmQgc3RhdGUpLiAqL1xuICBwcml2YXRlIHJlYWRTaGVsdGVySWQocmF3OiBzdHJpbmcgfCBudWxsKTogdm9pZCB7XG4gICAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHJhdyk7XG4gICAgaWYgKHJhdyA9PT0gbnVsbCB8fCAhTnVtYmVyLmlzSW50ZWdlcihwYXJzZWQpIHx8IHBhcnNlZCA8PSAwKSB7XG4gICAgICAvLyBUaGUgbm90LWZvdW5kIGJyYW5jaCB1bm1vdW50cyB0aGUgbWFwIGNvbnRhaW5lciDigJQgZHJvcCB0aGUgbGl2ZSBtYXBcbiAgICAgIC8vIHdpdGggaXQgKG51bGwtc2FmZSB3aGVuIGNyZWF0ZSB3YXMgYSBuby1vcCksIGVsc2UgdGhlIGluc3RhbmNlIGFuZFxuICAgICAgLy8gaXRzIGxpc3RlbmVycyBsZWFrLlxuICAgICAgdGhpcy5kZXN0cm95TG9jYXRpb25NYXAoKTtcbiAgICAgIHRoaXMubm90Rm91bmQuc2V0KHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAocGFyc2VkID09PSB0aGlzLmlkKCkpIHtcbiAgICAgIHJldHVybjsgLy8gdGhlIHNhbWUgc2hlbHRlciDigJQgbm90aGluZyBjaGFuZ2VkXG4gICAgfVxuICAgIC8vIEEgZGlmZmVyZW50IHNoZWx0ZXI6IGRyb3AgdGhlIHByZXZpb3VzIG9uZSdzIHN0YXRlIGJlZm9yZSB0aGUgbmV3XG4gICAgLy8gbG9hZCByZXNvbHZlcyAodGhlIGZldGNoU2VxIGd1YXJkIGRyb3BzIHRoZSBzdXBlcnNlZGVkIHJlc3BvbnNlKS5cbiAgICB0aGlzLmlkLnNldChwYXJzZWQpO1xuICAgIHRoaXMubm90Rm91bmQuc2V0KGZhbHNlKTtcbiAgICB0aGlzLnNoZWx0ZXIuc2V0KG51bGwpO1xuICAgIHRoaXMubm90aWNlLnNldChudWxsKTtcbiAgICAvLyBUaGUgdHJ1c3QtbGF5ZXIgcGlja2VycyAoRDEvRDQpIGJlbG9uZyB0byB0aGUgcHJldmlvdXMgc2hlbHRlciDigJRcbiAgICAvLyBjbG9zZSB0aGVtIHdpdGggdGhlIGRhdGEgdGhleSB3ZXJlIHJlcG9ydGluZyBvbi5cbiAgICB0aGlzLnJlc2V0VHJ1c3RQaWNrZXJzKCk7XG4gICAgLy8gQ2xlYXIgdGhlIFBSRVZJT1VTIHNoZWx0ZXIncyBwaW4gKHNob3dTaGVsdGVyKG51bGwpIGlzIHRoZVxuICAgIC8vIHNlcnZpY2UncyBjbGVhciBBUEkpIOKAlCB0aGUgbmV3IGZldGNoJ3MgcGluIGxhbmRzIG9uIHNldHRsZTsgd2l0aG91dFxuICAgIC8vIHRoaXMgdGhlIHN0YWxlIG1hcmtlciBzaXRzIG92ZXIgdGhlIG1hcCBkdXJpbmcgdGhlIGxvYWQuXG4gICAgdGhpcy5sZWFmbGV0LnNob3dTaGVsdGVyKG51bGwpO1xuICAgIHRoaXMubG9hZCgpO1xuICB9XG5cbiAgLyoqIENsb3NlcyBldmVyeSBvcGVuIHRydXN0LWxheWVyIHBpY2tlciBhbmQgZHJvcHMgaXRzIGRyYWZ0IHN0YXRlLiAqL1xuICBwcml2YXRlIHJlc2V0VHJ1c3RQaWNrZXJzKCk6IHZvaWQge1xuICAgIHRoaXMucmVwb3J0T3Blbi5zZXQoZmFsc2UpO1xuICAgIHRoaXMucmVwb3J0VHlwZS5zZXQobnVsbCk7XG4gICAgdGhpcy5yZXBvcnREZXRhaWwucmVzZXQoKTtcbiAgICB0aGlzLnJlcG9ydER1cGxpY2F0ZS5zZXQobnVsbCk7XG4gICAgdGhpcy5vcGVuU3RhdHVzUGVuZGluZy5zZXQobnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogRmV0Y2ggdGhlIHNoZWx0ZXIuIDQwNCAtPiBub3QtZm91bmQgc3RhdGU7IGFueSBvdGhlciBmYWlsdXJlIC0+IGVycm9yXG4gICAqIGJhbm5lciB3aXRoIHRoZSBwYWdlIGNocm9tZSBpbnRhY3QgKHNoYXJlZCBjb252ZW50aW9uKS4gQSBmYWlsZWRcbiAgICogcG9zdC13cml0ZSByZWZldGNoIGNsZWFycyB0aGUgc3RhbGUgc3VjY2VzcyBub3RpY2UuXG4gICAqL1xuICBsb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGlkID0gdGhpcy5pZCgpO1xuICAgIGlmIChpZCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBjb25zdCBzZXEgPSArK3RoaXMuZmV0Y2hTZXE7XG4gICAgdGhpcy5lcnJvci5zZXQobnVsbCk7XG4gICAgdGhpcy5sb2FkaW5nLnNldCh0cnVlKTtcbiAgICByZXR1cm4gdGhpcy5nYXRld2F5LmdldChpZCkudGhlbihcbiAgICAgICh2YWx1ZSkgPT4ge1xuICAgICAgICBpZiAoc2VxICE9PSB0aGlzLmZldGNoU2VxKSB7XG4gICAgICAgICAgcmV0dXJuOyAvLyBwYWdlIGxlZnQgb3IgYSBuZXdlciB3cml0ZSBzdXBlcnNlZGVkIHRoaXMgcmVzcG9uc2VcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNoZWx0ZXIuc2V0KHZhbHVlKTtcbiAgICAgICAgLy8gTG9jYXRpb24gbWFwOiBlbnN1cmUgdGhlIGNvbnRhaW5lciBob2xkcyBhIGxpdmUgaW5zdGFuY2UgKHRoZVxuICAgICAgICAvLyBub3QtZm91bmQgZmxpcCBkZXN0cm95ZWQgaXQgYW5kIHRoZSBmb3VuZCByZS1yZW5kZXIgbW91bnRlZCBhXG4gICAgICAgIC8vIGZyZXNoIGRpdiksIHRoZW4gZmx5IHRvIHRoZSBzaGVsdGVyIGF0IHN0cmVldCBsZXZlbCArIHBpblxuICAgICAgICAvLyBpdC4gQm90aCBjYWxscyBhcmUgc2FmZSBuby1vcHMgd2hlbiBjcmVhdGUoKSB3YXMgc2tpcHBlZCwgc28gbm9cbiAgICAgICAgLy8gZ3VhcmQgaXMgbmVlZGVkIGhlcmUuXG4gICAgICAgIHRoaXMuZW5zdXJlTG9jYXRpb25NYXAoKTtcbiAgICAgICAgdGhpcy5waW5TaGVsdGVyKHZhbHVlKTtcbiAgICAgICAgdGhpcy5sb2FkaW5nLnNldChmYWxzZSk7XG4gICAgICB9LFxuICAgICAgKGZhaWx1cmU6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKHNlcSAhPT0gdGhpcy5mZXRjaFNlcSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBBIGZhaWxlZCBwb3N0LXdyaXRlIHJlZmV0Y2ggbXVzdCBub3QgbGVhdmUgdGhlIHN0YWxlXG4gICAgICAgIC8vIHN1Y2Nlc3Mgbm90aWNlIHN0YWNrZWQgYWJvdmUgdGhlIGVycm9yIGJhbm5lci5cbiAgICAgICAgdGhpcy5ub3RpY2Uuc2V0KG51bGwpO1xuICAgICAgICBpZiAoZmFpbHVyZSBpbnN0YW5jZW9mIEFwaUVycm9yICYmIGZhaWx1cmUuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgICB0aGlzLnNoZWx0ZXIuc2V0KG51bGwpO1xuICAgICAgICAgIC8vIFRoZSBub3QtZm91bmQgYnJhbmNoIHVubW91bnRzIHRoZSBtYXAgY29udGFpbmVyIOKAlCBkZXN0cm95IHRoZVxuICAgICAgICAgIC8vIGxpdmUgbWFwIHdpdGggaXQgKG51bGwtc2FmZSB3aGVuIGNyZWF0ZSB3YXMgYSBuby1vcCkuXG4gICAgICAgICAgdGhpcy5kZXN0cm95TG9jYXRpb25NYXAoKTtcbiAgICAgICAgICB0aGlzLm5vdEZvdW5kLnNldCh0cnVlKTtcbiAgICAgICAgICB0aGlzLmxvYWRpbmcuc2V0KGZhbHNlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lcnJvci5zZXQoYmFubmVyTWVzc2FnZShmYWlsdXJlLCAnc2hlbHRlcicsIChrZXkpID0+IHRoaXMuaTE4bi50KGtleSkpKTtcbiAgICAgICAgLy8gVGhlIGVycm9yIHN0YXRlIGtlZXBzIHRoZSBjb250YWluZXIgbW91bnRlZCAocGxhY2Vob2xkZXIpIOKAlCBpZiBhXG4gICAgICAgIC8vIHByaW9yIG5vdC1mb3VuZCBmbGlwIGRlc3Ryb3llZCB0aGUgbWFwLCByZS1jcmVhdGUgaXQgaGVyZTtcbiAgICAgICAgLy8gYSBuby1vcCB3aGVuIHRoZSBpbnN0YW5jZSBpcyBzdGlsbCBhbGl2ZS5cbiAgICAgICAgdGhpcy5lbnN1cmVMb2NhdGlvbk1hcCgpO1xuICAgICAgICB0aGlzLmxvYWRpbmcuc2V0KGZhbHNlKTtcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxuXG4gIC8qKiBQaW5zIHRoZSBzaGVsdGVyIG9uIHRoZSBMb2NhdGlvbiBtYXA6IGZseSB0byBpdCBhdCBzdHJlZXQgbGV2ZWxcbiAgICogKFNIRUxURVJfWk9PTSkgKyBvbmUgc3RhdGljIG1hcmtlciAoc2hvd1NoZWx0ZXIgaXMgaWRlbXBvdGVudCDigJQgdGhlXG4gICAqIHBvc3Qtd3JpdGUgcmVmZXRjaCBzaW1wbHkgcmVwbGFjZXMgdGhlIHBpbikuIFNraXBzIHdoZW4gdGhlXG4gICAqIGNvb3JkaW5hdGVzIGFyZSBtaXNzaW5nL25vbi1maW5pdGU6IHRoZSBtYXAgdGhlbiBrZWVwcyBpdHMgcGxhY2Vob2xkZXJcbiAgICogdmlldyBpbnN0ZWFkIG9mIGhhbGYtZHJhd2luZyBhIGJyb2tlbiBzdGF0ZS5cbiAgICovXG4gIHByaXZhdGUgcGluU2hlbHRlcihzaGVsdGVyOiBTaGVsdGVyRHRvKTogdm9pZCB7XG4gICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUoc2hlbHRlci5sYXRpdHVkZSkgfHwgIU51bWJlci5pc0Zpbml0ZShzaGVsdGVyLmxvbmdpdHVkZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5sZWFmbGV0LmZseVRvKHNoZWx0ZXIubGF0aXR1ZGUsIHNoZWx0ZXIubG9uZ2l0dWRlLCBTSEVMVEVSX1pPT00pO1xuICAgIHRoaXMubGVhZmxldC5zaG93U2hlbHRlcihzaGVsdGVyKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBoYXNVc2VyRGV0YWlscygpOiBib29sZWFuIHtcbiAgICBjb25zdCBzID0gdGhpcy5zaGVsdGVyKCk7XG4gICAgcmV0dXJuIHMgIT09IG51bGwgJiYgKHMuZGVzY3JpcHRpb24gIT09IG51bGwgfHwgcy5jYXBhY2l0eSAhPT0gbnVsbCk7XG4gIH1cblxuICAvLyAtLS0tIG5hdmlnYXRlIGFjdGlvbnMgKG1hcC1jcmlzaXMtYWN0aW9ucyBEMykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKipcbiAgICogR29vZ2xlIE1hcHMgd2Fsa2luZy1kaXJlY3Rpb25zIGRlZXAgbGluayDigJQgYSBoYW5kLXJvbGxlZCBocmVmIChub1xuICAgKiBuYXZpZ2F0aW9uIGxpYnJhcnkpOiB0aGUgcGhvbmUgb3BlbnMgaXRzIG93biBhcHAgY2hvaWNlLiBDb29yZGluYXRlcyBhdFxuICAgKiA1IGRlY2ltYWxzICh0aGUgYXBwLXdpZGUgY29vcmRpbmF0ZSBmb3JtYXQpLlxuICAgKi9cbiAgcHJvdGVjdGVkIG5hdmlnYXRlVXJsKHNoZWx0ZXI6IFNoZWx0ZXJEdG8pOiBzdHJpbmcge1xuICAgIHJldHVybiAoXG4gICAgICAnaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9tYXBzL2Rpci8/YXBpPTEnICtcbiAgICAgIGAmZGVzdGluYXRpb249JHtzaGVsdGVyLmxhdGl0dWRlLnRvRml4ZWQoNSl9LCR7c2hlbHRlci5sb25naXR1ZGUudG9GaXhlZCg1KX1gICtcbiAgICAgICcmdHJhdmVsbW9kZT13YWxraW5nJ1xuICAgICk7XG4gIH1cblxuICAvKiogQXBwbGUgTWFwcyBmYWxsYmFjayAoaU9TKTogdGhlIHNhbWUgcG9pbnQsIHRoZSBzaGVsdGVyIG5hbWUgYXMgcXVlcnkuICovXG4gIHByb3RlY3RlZCBhcHBsZU1hcHNVcmwoc2hlbHRlcjogU2hlbHRlckR0byk6IHN0cmluZyB7XG4gICAgcmV0dXJuIChcbiAgICAgIGBodHRwczovL21hcHMuYXBwbGUuY29tLz9kYWRkcj0ke3NoZWx0ZXIubGF0aXR1ZGUudG9GaXhlZCg1KX0sJHtzaGVsdGVyLmxvbmdpdHVkZS50b0ZpeGVkKDUpfWAgK1xuICAgICAgYCZxPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHNoZWx0ZXIubmFtZSl9YFxuICAgICk7XG4gIH1cblxuICAvKiogVGhlIGhlYWRlcidzIGNvb3JkaW5hdGUgbGluZSAoRDYg4oCUIHRhYnVsYXIgZmlndXJlcyB2aWEgLm51bS10YWJ1bGFyKS4gKi9cbiAgcHJvdGVjdGVkIGNvb3JkaW5hdGVMaW5lKHNoZWx0ZXI6IFNoZWx0ZXJEdG8pOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHtzaGVsdGVyLmxhdGl0dWRlLnRvRml4ZWQoNSl9LCAke3NoZWx0ZXIubG9uZ2l0dWRlLnRvRml4ZWQoNSl9YDtcbiAgfVxuXG4gIC8qKiBDb29yZGluYXRlcyBhcmUgcmVxdWlyZWQgb24gdGhlIERUTzsgdGhlIGZpbml0ZSBndWFyZCBtaXJyb3JzXG4gICAqICBwaW5TaGVsdGVyIOKAlCBhIG5vbi1maW5pdGUgcG9pbnQgbXVzdCBub3QgcmVuZGVyIGEgYnJva2VuIGxpbmsgb3IgbGluZS4gKi9cbiAgcHJvdGVjdGVkIGhhc0Nvb3JkaW5hdGVzKHNoZWx0ZXI6IFNoZWx0ZXJEdG8pOiBib29sZWFuIHtcbiAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHNoZWx0ZXIubGF0aXR1ZGUpICYmIE51bWJlci5pc0Zpbml0ZShzaGVsdGVyLmxvbmdpdHVkZSk7XG4gIH1cblxuICAvKipcbiAgICogXCJEaXN0YW5jZSBmcm9tIHlvdVwiIChsb2NhdGlvbi1uYXZpZ2F0aW9uKTogdGhlIHNoYXJlZCBoaWdoLWFjY3VyYWN5XG4gICAqIGdlb2xvY2F0aW9uIG1lY2hhbmlzbSAodGhlIG1hcCBDVEEncyBleGFjdCBvcHRpb25zLCB0aGUgc2VjdXJlLWNvbnRleHRcbiAgICogZ3VhcmQgYW5kIHRoZSBlcnJvciBtYXBwaW5nIOKAlCBzaGFyZWQvZ2VvbG9jYXRpb24udHMpLCB0aGVuIHRoZVxuICAgKiBIYXZlcnNpbmUgZGlzdGFuY2UgdG8gdGhlIHNoZWx0ZXIncyBvd24gY29vcmRpbmF0ZXMsIGNvbXB1dGVkIENMSUVOVC1cbiAgICogU0lERSDigJQgbm8gYmFja2VuZCBjYWxsLCBubyBJUCBnZW9sb2NhdGlvbiAobG9ja2VkKS4gT24gc3VjY2VzczogdGhlXG4gICAqIGhvbmVzdHkgbGluZSBcIuKJiCDigKYgc3RyYWlnaHQgbGluZSBmcm9tIHlvdVwiIChuZXZlciBhIHdhbGtpbmctcm91dGUgb3JcbiAgICogb2ZmaWNpYWwgY2xhaW0pLiBPbiBmYWlsdXJlOiBwZXItZXJyb3IgY29weSAodGhlIG1hcCBDVEEncyBtaXJyb3JlZFxuICAgKiB2b2NhYnVsYXJ5KTsgdGhlIHBhZ2Ugc3RheXMgb3RoZXJ3aXNlIHVudG91Y2hlZC4gUHVibGljIHNvIHNwZWNzIGNhblxuICAgKiBkcml2ZSBpdCAocGFnZSBjb252ZW50aW9uKS5cbiAgICovXG4gIGRpc3RhbmNlRnJvbU1lKCk6IHZvaWQge1xuICAgIGNvbnN0IHNoZWx0ZXIgPSB0aGlzLnNoZWx0ZXIoKTtcbiAgICBpZiAodGhpcy5kaXN0YW5jZVBlbmRpbmcoKSB8fCBzaGVsdGVyID09PSBudWxsIHx8ICF0aGlzLmhhc0Nvb3JkaW5hdGVzKHNoZWx0ZXIpKSB7XG4gICAgICByZXR1cm47IC8vIGJ1c3ksIG9yIG5vIHBvaW50IHRvIG1lYXN1cmUgYWdhaW5zdFxuICAgIH1cbiAgICAvLyBEcm9wIHRoZSBsYXN0IHN1Y2Nlc3MgdXAgZnJvbnQg4oCUIGEgZmFpbGVkIHJldHJ5IG11c3RcbiAgICAvLyBub3QgbGVhdmUgdGhlIHN0YWxlIGRpc3RhbmNlIGxpbmUgYmVzaWRlIHRoZSBlcnJvci5cbiAgICB0aGlzLmRpc3RhbmNlS20uc2V0KG51bGwpO1xuICAgIHRoaXMuZGlzdGFuY2VFcnJvci5zZXQobnVsbCk7XG4gICAgdGhpcy5kaXN0YW5jZVBlbmRpbmcuc2V0KHRydWUpO1xuICAgIC8vIFRoZSBtZWNoYW5pc20gKHNlY3VyZS1jb250ZXh0ICsgQVBJIGd1YXJkcywgdGhlIHJlcXVlc3Qgb3B0aW9ucywgdGhlXG4gICAgLy8gZXJyb3ItY29kZSBtYXBwaW5nKSBpcyBzaGFyZWQvZ2VvbG9jYXRpb24udHM7IHRoZSBwZXIta2luZCBDT1BZIGlzXG4gICAgLy8gdGhlIG1hcCBDVEEncyB2b2NhYnVsYXJ5LCBrZXllZCAoRElTVEFOQ0VfS0VZKSDigJQgb25lIHRyYW5zbGF0aW9uIHBlclxuICAgIC8vIGZhaWx1cmUga2luZCwgc2hhcmVkIGJ5IGJvdGggcGFnZXMuXG4gICAgdm9pZCBnZXRDdXJyZW50UG9zaXRpb25IaWdoQWNjdXJhY3koKS50aGVuKFxuICAgICAgKGNvb3JkcykgPT4ge1xuICAgICAgICB0aGlzLmRpc3RhbmNlUGVuZGluZy5zZXQoZmFsc2UpO1xuICAgICAgICB0aGlzLmRpc3RhbmNlS20uc2V0KFxuICAgICAgICAgIGhhdmVyc2luZUttKGNvb3Jkcy5sYXRpdHVkZSwgY29vcmRzLmxvbmdpdHVkZSwgc2hlbHRlci5sYXRpdHVkZSwgc2hlbHRlci5sb25naXR1ZGUpLFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICAgIChmYWlsdXJlOiB1bmtub3duKSA9PiB7XG4gICAgICAgIHRoaXMuZGlzdGFuY2VQZW5kaW5nLnNldChmYWxzZSk7XG4gICAgICAgIGNvbnN0IGtpbmQgPSBmYWlsdXJlIGluc3RhbmNlb2YgR2VvbG9jYXRpb25FcnJvciA/IGZhaWx1cmUua2luZCA6ICd1bmF2YWlsYWJsZSc7XG4gICAgICAgIHRoaXMuZGlzdGFuY2VFcnJvci5zZXQodGhpcy5pMThuLnQoRElTVEFOQ0VfS0VZW2tpbmRdKSk7XG4gICAgICB9LFxuICAgICk7XG4gIH1cblxuICAvLyAtLS0tIHJlcG9ydCBob3cgZnVsbCAoc2hlbHRlci10cnVzdC1hbmQtcmVwb3J0cyBENC9ENikgLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyoqXG4gICAqIE9uZS10YXAgb2NjdXBhbmN5IHVwc2VydDogdGhlIGxhdGVzdCBlZGl0IHdpbnMgKHRoZSBiYWNrZW5kIGtlZXBzIE9ORVxuICAgKiBsaXZlIGJhbmQgcGVyIHVzZXIpLiBTdWNjZXNzIHJlZmV0Y2hlcyDigJQgdGhlIGFnZ3JlZ2F0ZSArIHJlY2VuY3kgYW5kXG4gICAqIHRoZSBwaWNrZXIncyBwcmUtc2VsZWN0ICh5b3VyT2NjdXBhbmN5QmFuZCkgYm90aCBjb21lIGZyb20gdGhlIGZyZXNoXG4gICAqIGRldGFpbCBwcm9qZWN0aW9uLiBPY2N1cGFuY3kgaXMgZGlzcGxheS1vbmx5OiBpdCBuZXZlciBoaWRlcyBvciByZWNvbG91cnNcbiAgICogYW55dGhpbmcsIHNvIHRoZSBmYWlsdXJlIHBhdGggb25seSBzdXJmYWNlcyB0aGUgc2hhcmVkIGJhbm5lciBjb3B5LlxuICAgKi9cbiAgYXN5bmMgcmVwb3J0QmFuZChiYW5kOiBPY2N1cGFuY3lCYW5kKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmlkKCk7XG4gICAgaWYgKGlkID09PSBudWxsIHx8IHRoaXMucmVwb3J0aW5nKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5yZXBvcnRpbmcuc2V0KHRydWUpO1xuICAgIHRoaXMuZXJyb3Iuc2V0KG51bGwpO1xuICAgIHRoaXMubm90aWNlLnNldChudWxsKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5nYXRld2F5LnJlcG9ydE9jY3VwYW5jeShpZCwgYmFuZCk7XG4gICAgICB0aGlzLm5vdGljZS5zZXQoeyBzZXZlcml0eTogJ3N1Y2Nlc3MnLCB0ZXh0OiB0aGlzLmkxOG4udCgnc2hlbHRlci5ub3RpY2Uub2NjdXBhbmN5U2F2ZWQnKSB9KTtcbiAgICAgIGF3YWl0IHRoaXMubG9hZCgpO1xuICAgIH0gY2F0Y2ggKGZhaWx1cmU6IHVua25vd24pIHtcbiAgICAgIHRoaXMuZXJyb3Iuc2V0KGJhbm5lck1lc3NhZ2UoZmFpbHVyZSwgJ3NoZWx0ZXInLCAoa2V5KSA9PiB0aGlzLmkxOG4udChrZXkpKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMucmVwb3J0aW5nLnNldChmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLSByZXBvcnQgb3Blbi9jbG9zZWQgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qKlxuICAgKiBUaGUgcGlja2VyJ3MgcHJlc3NlZCBzdGF0ZSBmb3IgYSBzdGF0ZTogdGhlIHVzZXIncyBjdXJyZW50IGxpdmUgcmVwb3J0XG4gICAqICh5b3VyT3BlblN0YXR1cykgT1IgdGhlIG9wdGltaXN0aWMgdGFwIGluIGZsaWdodCDigJRcbiAgICogcmFkaW8tc3R5bGUsIGV4YWN0bHkgb25lIG9mIHRoZSB0d28gYnV0dG9ucyBjYW4gYmUgcHJlc3NlZC4gVGhlXG4gICAqIHJlZmV0Y2gncyB5b3VyT3BlblN0YXR1cyBpcyB0aGUgc2V0dGxlZCBwcmUtc2VsZWN0LCBzbyB0aGUgb3B0aW1pc3RpY1xuICAgKiBmbGFnIGNsZWFycyB3aXRoIG5vIGZsaWNrZXIgb24gc3VjY2VzcyBhbmQgcmV2ZXJ0cyBvbiBmYWlsdXJlLlxuICAgKi9cbiAgcHJvdGVjdGVkIG9wZW5TdGF0dXNQcmVzc2VkKHN0YXRlOiBPcGVuU3RhdGUpOiBib29sZWFuIHtcbiAgICBjb25zdCBzaGVsdGVyID0gdGhpcy5zaGVsdGVyKCk7XG4gICAgcmV0dXJuIHNoZWx0ZXI/LnlvdXJPcGVuU3RhdHVzID09PSBzdGF0ZSB8fCB0aGlzLm9wZW5TdGF0dXNQZW5kaW5nKCkgPT09IHN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIE9uZS10YXAgb3Blbi9jbG9zZWQgdXBzZXJ0OiB0aGUgbGF0ZXN0IGVkaXQgd2lucyAodGhlIGJhY2tlbmQga2VlcHMgT05FXG4gICAqIGxpdmUgc3RhdGUgcGVyIHVzZXIpLiBTYW1lIHNoYXBlIGFzIHRoZSBiYW5kIHBpY2tlciDigJQgb3B0aW1pc3RpY1xuICAgKiBwcmVzc2VkIHN0YXRlLCBzdWNjZXNzIHJlZmV0Y2hlcyAodGhlIGFnZ3JlZ2F0ZSArIHRoZSBwaWNrZXInc1xuICAgKiBwcmUtc2VsZWN0LCB5b3VyT3BlblN0YXR1cywgYm90aCBjb21lIGZyb20gdGhlIGZyZXNoIGRldGFpbFxuICAgKiBwcm9qZWN0aW9uKSwgdGhlIHNoYXJlZCBiYW5uZXIgY29weSBvbiBmYWlsdXJlLiBPcGVuL2Nsb3NlZCBpc1xuICAgKiBkaXNwbGF5LW9ubHk6IGl0IG5ldmVyIGhpZGVzIG9yIHJlY29sb3VycyBhbnl0aGluZyBpdHNlbGYg4oCUIHRoZSBzdGF0dXNcbiAgICogcm93IGFuZCB0aGUgYmFkZ2VzIGRlcml2ZSBmcm9tIHRoZSBmcmVzaCBhZ2dyZWdhdGUuXG4gICAqL1xuICBhc3luYyByZXBvcnRPcGVuU3RhdHVzKHN0YXRlOiBPcGVuU3RhdGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBpZCA9IHRoaXMuaWQoKTtcbiAgICBpZiAoaWQgPT09IG51bGwgfHwgdGhpcy5yZXBvcnRpbmcoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnJlcG9ydGluZy5zZXQodHJ1ZSk7XG4gICAgdGhpcy5vcGVuU3RhdHVzUGVuZGluZy5zZXQoc3RhdGUpO1xuICAgIHRoaXMuZXJyb3Iuc2V0KG51bGwpO1xuICAgIHRoaXMubm90aWNlLnNldChudWxsKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5nYXRld2F5LnB1dE9wZW5TdGF0dXMoaWQsIHN0YXRlKTtcbiAgICAgIHRoaXMubm90aWNlLnNldCh7IHNldmVyaXR5OiAnc3VjY2VzcycsIHRleHQ6IHRoaXMuaTE4bi50KCdzaGVsdGVyLm5vdGljZS5vcGVuQ2xvc2VkU2F2ZWQnKSB9KTtcbiAgICAgIGF3YWl0IHRoaXMubG9hZCgpO1xuICAgIH0gY2F0Y2ggKGZhaWx1cmU6IHVua25vd24pIHtcbiAgICAgIC8vIFRoZSBmaW5hbGx5IGJlbG93IHJldmVydHMgdGhlIG9wdGltaXN0aWMgcHJlc3NlZCBzdGF0ZSAodGhlIGZhaWxlZFxuICAgICAgLy8gdGFwIG11c3Qgbm90IHN0YXkgbGl0KTsgdGhlIHNoYXJlZCBiYW5uZXIgY29weSBzdXJmYWNlcyB0aGUgZXJyb3IuXG4gICAgICB0aGlzLmVycm9yLnNldChiYW5uZXJNZXNzYWdlKGZhaWx1cmUsICdzaGVsdGVyJywgKGtleSkgPT4gdGhpcy5pMThuLnQoa2V5KSkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLnJlcG9ydGluZy5zZXQoZmFsc2UpO1xuICAgICAgdGhpcy5vcGVuU3RhdHVzUGVuZGluZy5zZXQobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLSByZXBvcnQgdGhpcyBzaGVsdGVyIChzaGVsdGVyLXRydXN0LWFuZC1yZXBvcnRzIEQxL0Q2KSAtLS0tLS0tLS0tLS0tLS1cbiAgLyoqIFRoZSB2ZXJpZmllZCB2aWV3ZXIgb3BlbnMgdGhlIHR5cGUgcGlja2VyIChpbmxpbmUg4oCUIG5vIG1vZGFsKS4gKi9cbiAgb3BlblJlcG9ydCgpOiB2b2lkIHtcbiAgICB0aGlzLnJlcG9ydER1cGxpY2F0ZS5zZXQobnVsbCk7XG4gICAgdGhpcy5yZXBvcnRPcGVuLnNldCh0cnVlKTtcbiAgfVxuXG4gIGNsb3NlUmVwb3J0KCk6IHZvaWQge1xuICAgIHRoaXMucmVwb3J0T3Blbi5zZXQoZmFsc2UpO1xuICAgIHRoaXMucmVwb3J0VHlwZS5zZXQobnVsbCk7XG4gICAgdGhpcy5yZXBvcnREZXRhaWwucmVzZXQoKTtcbiAgICB0aGlzLnJlcG9ydER1cGxpY2F0ZS5zZXQobnVsbCk7XG4gIH1cblxuICAvKiogUmFkaW8gY2hhbmdlIGluIHRoZSBzaGVsdGVyLXJlcG9ydCBwaWNrZXIuICovXG4gIG9uUmVwb3J0VHlwZUNoYW5nZShldmVudDogRXZlbnQpOiB2b2lkIHtcbiAgICB0aGlzLnJlcG9ydFR5cGUuc2V0KChldmVudC50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWUgYXMgU2hlbHRlclJlcG9ydFR5cGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBmYWN0dWFsLXJlcG9ydCBkZXRhaWwgZmllbGQncyBwZXItdHlwZSBwbGFjZWhvbGRlciBmb3JcbiAgICogdGhlIHBpY2tlZCB0eXBlIOKAlCBudWxsIGZvciB0aGUgYmluYXJ5IHR5cGVzICh0aGUgY2xhaW0gc3RhbmRzIGFsb25lKS5cbiAgICogVGhlIHRlbXBsYXRlIHJlbmRlcnMgdGhlIGZpZWxkIHdoZW5ldmVyIHRoaXMgaXMgbm9uLW51bGwsIGFuZCBzdWJtaXRcbiAgICogc2VuZHMgYSBub24tYmxhbmsgZGV0YWlsIGV4YWN0bHkgdGhlbi5cbiAgICovXG4gIHJlcG9ydERldGFpbFBsYWNlaG9sZGVyKCk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IHR5cGUgPSB0aGlzLnJlcG9ydFR5cGUoKTtcbiAgICBpZiAodHlwZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IG9wdGlvbiA9IHRoaXMuUkVQT1JUX1RZUEVTLmZpbmQoKHQpID0+IHQudmFsdWUgPT09IHR5cGUpO1xuICAgIHJldHVybiBvcHRpb24/LmRldGFpbEtleSA/IHRoaXMuaTE4bi50KG9wdGlvbi5kZXRhaWxLZXkpIDogbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJtaXQgdGhlIHR5cGVkIHJlcG9ydCAodmVyaWZpZWQgb25seSDigJQgdGhlIHRlbXBsYXRlIGdhdGVzIGl0KS4gT25lXG4gICAqIHJlcG9ydCBwZXIgKHNoZWx0ZXIsIHVzZXIsIHR5cGUpOiBhIDQwOSBhbnN3ZXJzIHdpdGggYSBQTEFJTlxuICAgKiBzZW50ZW5jZS1jYXNlIGxpbmUgaW4gdGhlIHBpY2tlciAobm90IGFuIGVycm9yIGJhbm5lcikuIERldGFpbCBpc1xuICAgKiBzZW50IGZvciB0aGUgZmFjdHVhbCB0eXBlcyAoQ0xPU0VEIC8gV1JPTkdfTE9DQVRJT04gLyBPVEhFUikgYW5kIG9ubHlcbiAgICogd2hlbiBub24tYmxhbmsuXG4gICAqL1xuICBhc3luYyBzdWJtaXRSZXBvcnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmlkKCk7XG4gICAgY29uc3QgdHlwZSA9IHRoaXMucmVwb3J0VHlwZSgpO1xuICAgIGlmIChpZCA9PT0gbnVsbCB8fCB0eXBlID09PSBudWxsIHx8IHRoaXMucmVwb3J0aW5nKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZGV0YWlsID0gdGhpcy5yZXBvcnREZXRhaWwudmFsdWUudHJpbSgpO1xuICAgIGlmICh0aGlzLnJlcG9ydERldGFpbFBsYWNlaG9sZGVyKCkgIT09IG51bGwgJiYgdGhpcy5yZXBvcnREZXRhaWwuaW52YWxpZCkge1xuICAgICAgdGhpcy5yZXBvcnREZXRhaWwubWFya0FzVG91Y2hlZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCByZXF1ZXN0OiBSZXBvcnRTaGVsdGVyUmVxdWVzdCA9IHsgdHlwZSB9O1xuICAgIGlmICh0aGlzLnJlcG9ydERldGFpbFBsYWNlaG9sZGVyKCkgIT09IG51bGwgJiYgZGV0YWlsICE9PSAnJykge1xuICAgICAgcmVxdWVzdC5kZXRhaWwgPSBkZXRhaWw7XG4gICAgfVxuICAgIHRoaXMucmVwb3J0aW5nLnNldCh0cnVlKTtcbiAgICB0aGlzLmVycm9yLnNldChudWxsKTtcbiAgICB0aGlzLm5vdGljZS5zZXQobnVsbCk7XG4gICAgdGhpcy5yZXBvcnREdXBsaWNhdGUuc2V0KG51bGwpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmdhdGV3YXkucmVwb3J0KGlkLCByZXF1ZXN0KTtcbiAgICAgIHRoaXMuY2xvc2VSZXBvcnQoKTtcbiAgICAgIC8vIFRoZSBkYW1wIGZsYWcgcGlja3MgdGhlIG5vdGljZTogYSBzZWxmLWludGVyZXN0ZWQgcml2YWwgdm90ZVxuICAgICAgLy8gKHRoZSByZXBvcnRlcidzIG93biBzaW1pbGFyIGxpc3RpbmcpIGlzIHJlY29yZGVkIHdpdGggcmVkdWNlZFxuICAgICAgLy8gd2VpZ2h0IGFuZCBzYXlzIHNvIOKAlCBzaW5nbGUtc291cmNlZCBjb3B5IChzaGVsdGVyLm5vdGljZS4qKS5cbiAgICAgIHRoaXMubm90aWNlLnNldCh7XG4gICAgICAgIHNldmVyaXR5OiAnc3VjY2VzcycsXG4gICAgICAgIHRleHQ6IHRoaXMuaTE4bi50KFxuICAgICAgICAgIHJlc3VsdD8uZGFtcGVkXG4gICAgICAgICAgICA/ICdzaGVsdGVyLm5vdGljZS5yZXBvcnRTdWJtaXR0ZWREYW1wZWQnXG4gICAgICAgICAgICA6ICdzaGVsdGVyLm5vdGljZS5yZXBvcnRTdWJtaXR0ZWQnLFxuICAgICAgICApLFxuICAgICAgfSk7XG4gICAgICAvLyBUaGUgZGVyaXZlZCBzdGF0ZSAobm9uZXhpc3RlbnRSZXBvcnRzLCBvcGVuU3RhdHVzKSBtb3ZlZCBzZXJ2ZXItXG4gICAgICAvLyBzaWRlIOKAlCByZWZldGNoIHNvIHRoZSBoZWFkZXIgYmFkZ2VzIHJlZmxlY3QgaXQgKGRlc2lnbiBkZWNpc2lvbiA3KS5cbiAgICAgIGF3YWl0IHRoaXMubG9hZCgpO1xuICAgIH0gY2F0Y2ggKGZhaWx1cmU6IHVua25vd24pIHtcbiAgICAgIGlmIChmYWlsdXJlIGluc3RhbmNlb2YgQXBpRXJyb3IgJiYgZmFpbHVyZS5zdGF0dXMgPT09IDQwOSkge1xuICAgICAgICAvLyBUaGUgc2VydmVyJ3Mgc3RhbmRhcmQgZHVwbGljYXRlIG1lc3NhZ2UgaXMgdGhlIHNvdXJjZSBvZiB0cnV0aFxuICAgICAgICAvLyAobWFwLWJyb3dzZSBkZWx0YTogZHVwbGljYXRlIOKGkiB0aGUgc3RhbmRhcmQgNDA5IG1lc3NhZ2UpOyB0aGVcbiAgICAgICAgLy8gZml4ZWQgbGluZSBpcyBvbmx5IHRoZSBmYWxsYmFjayBmb3IgYW4gZW1wdHkgYm9keS5cbiAgICAgICAgdGhpcy5yZXBvcnREdXBsaWNhdGUuc2V0KGZhaWx1cmUubWVzc2FnZSB8fCB0aGlzLmkxOG4udCgnc2hlbHRlci5ub3RpY2UucmVwb3J0RHVwbGljYXRlJykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lcnJvci5zZXQoYmFubmVyTWVzc2FnZShmYWlsdXJlLCAnc2hlbHRlcicsIChrZXkpID0+IHRoaXMuaTE4bi50KGtleSkpKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5yZXBvcnRpbmcuc2V0KGZhbHNlKTtcbiAgICB9XG4gIH1cbn1cbiIsIkBpZiAobm90Rm91bmQoKSkge1xuICA8c2VjdGlvbiBjbGFzcz1cInNoZWx0ZXItZGV0YWlsIHNoZWx0ZXItZGV0YWlsLS1ub3QtZm91bmRcIj5cbiAgICA8aDEgY2xhc3M9XCJwYWdlLXRpdGxlXCI+e3sgJ2RldGFpbC5ub3RGb3VuZFRpdGxlJyB8IHQgfX08L2gxPlxuICAgIDxwIGNsYXNzPVwicGFnZS1zdWJ0aXRsZVwiPnt7ICdkZXRhaWwubm90Rm91bmRCb2R5JyB8IHQgfX08L3A+XG4gICAgPGEgcm91dGVyTGluaz1cIi9tYXBcIiBjbGFzcz1cImJ0biBidG4tLXByaW1hcnlcIj57eyAnZGV0YWlsLmJhY2tUb01hcCcgfCB0IH19PC9hPlxuICA8L3NlY3Rpb24+XG59IEBlbHNlIHtcbiAgPHNlY3Rpb24gY2xhc3M9XCJzaGVsdGVyLWRldGFpbFwiPlxuICAgIDxhIHJvdXRlckxpbms9XCIvbWFwXCIgY2xhc3M9XCJiYWNrLWxpbmtcIj4mbGFycjsge3sgJ2RldGFpbC5iYWNrVG9NYXAnIHwgdCB9fTwvYT5cblxuICAgIDxoZWFkZXIgY2xhc3M9XCJzaGVsdGVyLWRldGFpbF9faGVhZGVyXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwic2hlbHRlci1kZXRhaWxfX3RpdGxlLXJvd1wiPlxuICAgICAgICA8aDEgY2xhc3M9XCJwYWdlLXRpdGxlXCI+e3sgc2hlbHRlcigpPy5uYW1lID8/ICgnZGV0YWlsLnRpdGxlRmFsbGJhY2snIHwgdCkgfX08L2gxPlxuICAgICAgICBAaWYgKHNoZWx0ZXIoKTsgYXMgcykge1xuICAgICAgICAgIDwhLS0gU291cmNlL3RydXN0IGJhZGdlIChjb21tdW5pdHktcmV2aWV3LXF1ZXVlIEQ1KTogcmVnaXN0cnkgcm93c1xuICAgICAgICAgICAgICAgc2F5IHdoaWNoIHJlZ2lzdHJ5OyBVU0VSIHJvd3Mgc2F5IHRoZWlyIHRydXN0IHN0YXRlIChORVcgPVxuICAgICAgICAgICAgICAgXCJOZXdseSBhZGRlZFwiIGFtYmVyLCBDT05GSVJNRUQgPSBcIkNvbW11bml0eS1jaGVja2VkXCIgZ3JlZW4pLiAtLT5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImJhZGdlXCIgW25nQ2xhc3NdPVwiY29tbXVuaXR5QmFkZ2VDbGFzcyhzKVwiPlxuICAgICAgICAgICAge3sgc291cmNlVHJ1c3RMYWJlbChzKSB9fVxuICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICBAaWYgKHN1Ym1pdHRlclZlcmlmaWNhdGlvbktleShzKTsgYXMgc3VibWl0dGVyS2V5KSB7XG4gICAgICAgICAgICA8IS0tIFRoZSBzdWJtaXR0ZXIncyB2ZXJpZmljYXRpb24gZGVwdGhcbiAgICAgICAgICAgICAgICAgKHN1Ym1pdHRlci12ZXJpZmljYXRpb24tYmFkZ2UpOiBkZXJpdmVkIExJVkUgYnkgdGhlIEFQSSBmcm9tXG4gICAgICAgICAgICAgICAgIHRoZSBhdXRob3IncyBjdXJyZW50IGNsYWltcywgc28gYSByb3cgYWRkZWQgYXQgMS8yXG4gICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbiByZWFkcyBcImZ1bGx5IHZlcmlmaWVkXCIgdGhlIG1vbWVudCB0aGUgc2Vjb25kXG4gICAgICAgICAgICAgICAgIGNoYW5uZWwgaXMgY29uZmlybWVkIOKAlCBub3RoaW5nIGlzIHN0b3JlZCBvbiB0aGUgcm93LiBBYnNlbnRcbiAgICAgICAgICAgICAgICAgZm9yIHJlZ2lzdHJ5IHJvd3MsIGRlbGV0ZWQgYWNjb3VudHMgYW5kIHVudmVyaWZpZWQgYXV0aG9ycy4gLS0+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cImJhZGdlIGJhZGdlLS1zdWJtaXR0ZXJcIj57eyBzdWJtaXR0ZXJLZXkgfCB0IH19PC9zcGFuPlxuICAgICAgICAgIH1cbiAgICAgICAgICBAaWYgKGlzUHJpdmF0ZUxvY2F0aW9uKHMpKSB7XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cImJhZGdlIGJhZGdlLS1wcml2YXRlXCI+e3sgJ3NoZWx0ZXIucHJpdmF0ZUJhZGdlJyB8IHQgfX08L3NwYW4+XG4gICAgICAgICAgfVxuICAgICAgICAgIDwhLS0gVHJ1c3QgYmFkZ2VzIChzaGVsdGVyLXRydXN0LWFuZC1yZXBvcnRzIEQ2KTogc2FtZSBjb3B5IHJ1bGVzXG4gICAgICAgICAgICAgICBhcyB0aGUgbWFwIGxpc3Qgcm93IOKAlCByZXBvcnRlZCAvXG4gICAgICAgICAgICAgICBmcmVzaC1DTE9TRUQgKGFtYmVyOyBmcmVzaCBPUEVOIHJlbmRlcnMgbm8gYmFkZ2UpIC9cbiAgICAgICAgICAgICAgIG9jY3VwYW5jeS4gLS0+XG4gICAgICAgICAgQGlmIChoYXNUcnVzdEJhZGdlcyhzKSkge1xuICAgICAgICAgICAgQGlmIChoYXNSZXBvcnRzKHMpKSB7XG4gICAgICAgICAgICAgIDwhLS0gVGhlIGNvdW50IOKAlCB0aGUgbm9uZXhpc3RlbnRSZXBvcnRzIHN1YnNldCB0aGF0XG4gICAgICAgICAgICAgICAgICAgZHJpdmVzIHRoZSBiYWRnZSAoc2luZ2xlLXNvdXJjZWQgd2l0aCB0aGUgbWFwIHJvdykuIC0tPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImJhZGdlIGJhZGdlLS1yZXBvcnRlZFwiPnt7XG4gICAgICAgICAgICAgICAgcmVwb3J0ZWRCYWRnZVRleHQocy5ub25leGlzdGVudFJlcG9ydHMpXG4gICAgICAgICAgICAgIH19PC9zcGFuPlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQGlmIChvcGVuU3RhdHVzQmFkZ2VUZXh0KHMub3BlblN0YXR1cyk7IGFzIG9wZW5UZXh0KSB7XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYmFkZ2UgYmFkZ2UtLWNsb3NlZFwiPnt7IG9wZW5UZXh0IH19PC9zcGFuPlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQGlmIChzLm9jY3VwYW5jeTsgYXMgb2NjKSB7XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiYmFkZ2UgYmFkZ2UtLW9jY3VwYW5jeVwiPnt7IG9jY3VwYW5jeVRleHQob2NjKSB9fTwvc3Bhbj5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIDwvZGl2PlxuICAgICAgQGlmIChzaGVsdGVyKCk7IGFzIHMpIHtcbiAgICAgICAgQGlmIChzLnNvdXJjZSA9PT0gJ1VTRVInICYmIHMucmV2aWV3U3RhdHVzID09PSAnTkVXJykge1xuICAgICAgICAgIDwhLS0gVGhlIHVudmVyaWZpZWQgd2FybmluZyAoY29tbXVuaXR5LXJldmlldy1xdWV1ZSk6IGNvbW11bml0eVxuICAgICAgICAgICAgICAgcm93cyBpbiB0aGUgTkVXIHN0YXRlIG9ubHkg4oCUIENPTkZJUk1FRCByb3dzIGtlZXAgdGhlXG4gICAgICAgICAgICAgICBcIkNvbW11bml0eS1jaGVja2VkXCIgYmFkZ2UgYW5kIE5PIHdhcm5pbmcuIFN1YnRsZSBtdXRlZFxuICAgICAgICAgICAgICAgc3R5bGluZyBuZXh0IHRvIHRoZSB0cnVzdC1zdGF0ZSBiYWRnZSDigJQgYSBjYXZlYXQsIE5PVCB0aGVcbiAgICAgICAgICAgICAgIGNyaXNpcyBvcmFuZ2UuIC0tPlxuICAgICAgICAgIDxwIGNsYXNzPVwiY29tbXVuaXR5LXdhcm5pbmdcIj57eyAnc2hlbHRlci51bnZlcmlmaWVkV2FybmluZycgfCB0IH19PC9wPlxuICAgICAgICB9XG4gICAgICAgIEBpZiAocy5pbmFjY3VyYXRlKSB7XG4gICAgICAgICAgPCEtLSBNYXJrZWQgaW5hY2N1cmF0ZTogdGhlIHNpbmdsZS1zb3VyY2VkIHdhcm5pbmcg4oCUXG4gICAgICAgICAgICAgICB0aGUgZmxhZyBpcyB0aGUgdHJlYXRtZW50LCB0aGUgcm93IHN0YXlzIHZpc2libGUgKHN0YXR1cyBhbmRcbiAgICAgICAgICAgICAgIHRydXN0IHN0YXRlIHVudG91Y2hlZCkuIEluZGVwZW5kZW50IG9mIHRoZSByZXZpZXcgc3RhdGUuIC0tPlxuICAgICAgICAgIDxwIGNsYXNzPVwiY29tbXVuaXR5LXdhcm5pbmdcIj57eyAnYWNjb3VudC5jb250cmliLmluYWNjdXJhdGUnIHwgdCB9fTwvcD5cbiAgICAgICAgfVxuICAgICAgICBAaWYgKGlzUHJpdmF0ZUxvY2F0aW9uKHMpKSB7XG4gICAgICAgICAgPCEtLSBUaGUgcHJpdmF0ZS1ob21lIGRlY2xhcmF0aW9uIChENyk6IHJlc2lkZW50LW9mZmVyZWQsIG5vdCBhblxuICAgICAgICAgICAgICAgb2ZmaWNpYWwgZmFjaWxpdHkuIEV2ZXJ5IFBSSVZBVEUgcm93LCBvbiBldmVyeSB2aXNpdC4gLS0+XG4gICAgICAgICAgPHAgY2xhc3M9XCJwcml2YXRlLW5vdGVcIj57eyAnc2hlbHRlci5wcml2YXRlTm90ZScgfCB0IH19PC9wPlxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBAaWYgKHNoZWx0ZXIoKTsgYXMgcykge1xuICAgICAgICBAaWYgKGhhc0Nvb3JkaW5hdGVzKHMpKSB7XG4gICAgICAgICAgPCEtLSBOYXZpZ2F0ZSBhY3Rpb25zIChtYXAtY3Jpc2lzLWFjdGlvbnMgRDMpOiBzbWFsbCBzZWNvbmRhcnlcbiAgICAgICAgICAgICAgIGxpbmtzIG5lYXIgdGhlIG5hbWUg4oCUIHRoZXkgbGVhdmUgdGhlIGFwcCB0byB0aGUgcGhvbmUncyBvd25cbiAgICAgICAgICAgICAgIG5hdmlnYXRpb24gYXBwLCB0aGV5IGRvIG5vdCBuYXZpZ2F0ZSB3aXRoaW4gaXQsIGFuZCB0aGV5IGRvXG4gICAgICAgICAgICAgICBub3QgY29tcGV0ZSB3aXRoIHRoZSBiYWNrIGxpbmsuIFRoZSB2aXNpYmxlIGxhYmVscyBhcmUgdGhlXG4gICAgICAgICAgICAgICBCUkFORCBOQU1FUyBvbmx5IChvd25lcjogc2hvcnQgbGFiZWxzKTsgdGhlIG1lYW5pbmdmdWxcbiAgICAgICAgICAgICAgIGFjY2Vzc2libGUgbmFtZXMgbGl2ZSBpbiB0aGUgYXJpYS1sYWJlbHMgKGRldGFpbC5uYXZpZ2F0ZUFyaWFcbiAgICAgICAgICAgICAgIC8gZGV0YWlsLmFwcGxlTWFwc0FyaWEpIOKAlCBhY3Rpb24gKyBkZXN0aW5hdGlvbiArIHNlcnZpY2UsXG4gICAgICAgICAgICAgICBzbyBhIHNjcmVlbiByZWFkZXIgaGVhcnMgd2hhdCBlYWNoIGxpbmsgZG9lcywgbm90IGp1c3QgYVxuICAgICAgICAgICAgICAgYnJhbmQuIC0tPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJzaGVsdGVyLWRldGFpbF9fbmF2aWdhdGVcIj5cbiAgICAgICAgICAgIDxhXG4gICAgICAgICAgICAgIFtocmVmXT1cIm5hdmlnYXRlVXJsKHMpXCJcbiAgICAgICAgICAgICAgdGFyZ2V0PVwiX2JsYW5rXCJcbiAgICAgICAgICAgICAgcmVsPVwibm9vcGVuZXJcIlxuICAgICAgICAgICAgICBbYXR0ci5hcmlhLWxhYmVsXT1cIidkZXRhaWwubmF2aWdhdGVBcmlhJyB8IHQ6IHsgbmFtZTogcy5uYW1lIH1cIlxuICAgICAgICAgICAgICA+e3sgJ2RldGFpbC5uYXZpZ2F0ZScgfCB0IH19PC9hXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICA8YVxuICAgICAgICAgICAgICBbaHJlZl09XCJhcHBsZU1hcHNVcmwocylcIlxuICAgICAgICAgICAgICB0YXJnZXQ9XCJfYmxhbmtcIlxuICAgICAgICAgICAgICByZWw9XCJub29wZW5lclwiXG4gICAgICAgICAgICAgIFthdHRyLmFyaWEtbGFiZWxdPVwiJ2RldGFpbC5hcHBsZU1hcHNBcmlhJyB8IHQ6IHsgbmFtZTogcy5uYW1lIH1cIlxuICAgICAgICAgICAgICA+e3sgJ2RldGFpbC5hcHBsZU1hcHMnIHwgdCB9fTwvYVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgPCEtLSBEaXN0YW5jZSBmcm9tIHlvdSAobG9jYXRpb24tbmF2aWdhdGlvbik6IHRoZSBwYWdlJ3NcbiAgICAgICAgICAgICAgICAgT05MWSBnZW9sb2NhdGlvbiB0cmlnZ2VyIOKAlCBicm93c2VyIGFza3MgZmlyc3QsIHRoZSBwb2ludFxuICAgICAgICAgICAgICAgICBuZXZlciBsZWF2ZXMgdGhlIGRldmljZSwgdGhlIHJlc3VsdCBpcyB0aGUgc3RyYWlnaHQtbGluZVxuICAgICAgICAgICAgICAgICBob25lc3R5IGxpbmUgdW5kZXIgdGhlIGNvb3JkaW5hdGVzIChuZXZlciBhIHJvdXRlIGNsYWltKS4gLS0+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICBjbGFzcz1cInNoZWx0ZXItZGV0YWlsX19kaXN0YW5jZVwiXG4gICAgICAgICAgICAgIChjbGljayk9XCJkaXN0YW5jZUZyb21NZSgpXCJcbiAgICAgICAgICAgICAgW2Rpc2FibGVkXT1cImRpc3RhbmNlUGVuZGluZygpXCJcbiAgICAgICAgICAgICAgW2F0dHIuYXJpYS1idXN5XT1cImRpc3RhbmNlUGVuZGluZygpXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAge3tcbiAgICAgICAgICAgICAgICBkaXN0YW5jZVBlbmRpbmcoKSA/ICgnZGV0YWlsLmRpc3RhbmNlLnBlbmRpbmcnIHwgdCkgOiAoJ2RldGFpbC5kaXN0YW5jZS5jdGEnIHwgdClcbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBAaWYgKHNoZWx0ZXIoKT8uYWRkcmVzczsgYXMgYWRkcmVzcykge1xuICAgICAgICA8cCBjbGFzcz1cInNoZWx0ZXItZGV0YWlsX19hZGRyZXNzXCI+e3sgYWRkcmVzcyB9fTwvcD5cbiAgICAgIH1cbiAgICAgIEBpZiAoc2hlbHRlcigpOyBhcyBzKSB7XG4gICAgICAgIEBpZiAoaGFzQ29vcmRpbmF0ZXMocykpIHtcbiAgICAgICAgICA8IS0tIFRoZSBjb29yZGluYXRlIGxpbmUgKEQ2KTogLm51bS10YWJ1bGFyIGtlZXBzIHRoZSBmaWd1cmVzIGZyb21cbiAgICAgICAgICAgICAgIHNoaWZ0aW5nICh0aGUgc3VibWl0IHBhZ2UncyByZWFkb3V0IHVzZXMgdGhlIHNhbWUgY2xhc3MpLiAtLT5cbiAgICAgICAgICA8cCBjbGFzcz1cInNoZWx0ZXItZGV0YWlsX19jb29yZHMgbnVtLXRhYnVsYXJcIj57eyBjb29yZGluYXRlTGluZShzKSB9fTwvcD5cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgQGlmIChkaXN0YW5jZUttKCkgIT09IG51bGwpIHtcbiAgICAgICAgPCEtLSBEaXN0YW5jZSBob25lc3R5IChsb2NhdGlvbi1uYXZpZ2F0aW9uIEQ2KTogdGhlXG4gICAgICAgICAgICAgc3RyYWlnaHQgbGluZSBmcm9tIHRoZSB1c2VyJ3MgYnJvd3NlciBwb3NpdGlvbiDigJQgbmV2ZXIgYVxuICAgICAgICAgICAgIHdhbGtpbmctcm91dGUgb3Igb2ZmaWNpYWwgY2xhaW0uIC0tPlxuICAgICAgICA8cCBjbGFzcz1cInNoZWx0ZXItZGV0YWlsX19kaXN0YW5jZS1saW5lIG51bS10YWJ1bGFyXCIgcm9sZT1cInN0YXR1c1wiPlxuICAgICAgICAgIHt7ICdkZXRhaWwuZGlzdGFuY2UuZnJvbVlvdScgfCB0OiB7IGRpc3RhbmNlOiBzdHJhaWdodExpbmVUZXh0KGRpc3RhbmNlS20oKSEpIH0gfX1cbiAgICAgICAgPC9wPlxuICAgICAgfSBAZWxzZSBpZiAoZGlzdGFuY2VFcnJvcigpOyBhcyBtc2cpIHtcbiAgICAgICAgPHAgY2xhc3M9XCJzaGVsdGVyLWRldGFpbF9fZGlzdGFuY2UtZXJyb3JcIiByb2xlPVwiYWxlcnRcIj57eyBtc2cgfX08L3A+XG4gICAgICB9XG4gICAgICBAaWYgKHNoZWx0ZXIoKTsgYXMgcykge1xuICAgICAgICA8IS0tIExhc3QgdmVyaWZpZWQ6IHRoZSBwZXItZW50cnkgc2VydmVyLWRlcml2ZWQgc3RhbXAgKE04OlxuICAgICAgICAgICAgIHJlZ2lzdHJ5IHJvd3MgbmFtZSB0aGUgcmVnaXN0cnkgdGhlIGNoZWNrIGNhbWUgZnJvbSkuIEZvciBORVdcbiAgICAgICAgICAgICBjb21tdW5pdHkgcm93cyB0aGUgbGluZSBJUyB0aGUgbm90LXlldC12ZXJpZmllZCBzaWduYWwgKFwiTmV3bHlcbiAgICAgICAgICAgICBhZGRlZCBYIGQgYWdvIOKAlCBub3QgeWV0IHZlcmlmaWVkXCIpLiAubnVtLXRhYnVsYXIga2VlcHMgdGhlXG4gICAgICAgICAgICAgZmlndXJlcyBmcm9tIHNoaWZ0aW5nLiBUaGUgY29tbXVuaXR5IHJlcG9ydCBjb3VudCBpcyB0aGVcbiAgICAgICAgICAgICBTRVBBUkFURSBsaW5lIGJlbG93IOKAlCB0aGUgdHdvIGZhY3RzICh3aGVuIHRoaXMgZW50cnkgd2FzXG4gICAgICAgICAgICAgdmVyaWZpZWQgYWdhaW5zdCBpdHMgc291cmNlIC8gaG93IG1hbnkgY29tbXVuaXR5IHJlcG9ydHNcbiAgICAgICAgICAgICBleGlzdCkgYXJlIG5ldmVyIGpvaW5lZCBpbnRvIG9uZSBzdHJpbmcuIC0tPlxuICAgICAgICA8cCBjbGFzcz1cInNoZWx0ZXItZGV0YWlsX192ZXJpZmllZCBudW0tdGFidWxhclwiPnt7IGxhc3RWZXJpZmllZFRleHQocykgfX08L3A+XG4gICAgICAgIEBpZiAoaGFzQ29tbXVuaXR5UmVwb3J0cyhzKSkge1xuICAgICAgICAgIDwhLS0gVGhlIGxhYmVsZWQgbGlmZXRpbWUgdG90YWwgb3ZlciBhbGwgcmVwb3J0IHR5cGVzIOKAlCBhXG4gICAgICAgICAgICAgICBzZWxmLWNvbnRhaW5lZCBmYWN0LCBpbmRlcGVuZGVudCBvZiB0aGUgbGluZSBhYm92ZSAodGhlXG4gICAgICAgICAgICAgICBvcGVuL2Nsb3NlZCBhbmQgaG93LWZ1bGwgdGFwcyBkbyBub3QgY2hhbmdlIGl0KS4gLS0+XG4gICAgICAgICAgPHAgY2xhc3M9XCJzaGVsdGVyLWRldGFpbF9fcmVwb3J0cyBudW0tdGFidWxhclwiPlxuICAgICAgICAgICAge3sgY29tbXVuaXR5UmVwb3J0c1RleHQocy5yZXBvcnRDb3VudCkgfX1cbiAgICAgICAgICA8L3A+XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICA8L2hlYWRlcj5cblxuICAgIDxhcHAtYmFubmVyIHNldmVyaXR5PVwiZXJyb3JcIiBbbWVzc2FnZV09XCJlcnJvcigpXCIgLz5cbiAgICBAaWYgKG5vdGljZSgpOyBhcyBuKSB7XG4gICAgICA8YXBwLWJhbm5lciBzZXZlcml0eT1cInN1Y2Nlc3NcIiBbbWVzc2FnZV09XCJuLnRleHRcIiAvPlxuICAgIH1cblxuICAgIDwhLS0gTG9jYXRpb24gbWFwOiBBTFdBWVMgbW91bnRlZCBpbiB0aGUgbm9uLW5vdC1mb3VuZCBzdGF0ZSAobm90IGluc2lkZVxuICAgICAgICAgdGhlIHNoZWx0ZXIgYnJhbmNoKSBzbyB0aGUgY29udGFpbmVyIGV4aXN0cyBhdCB2aWV3LWluaXQgdGltZSB3aGlsZVxuICAgICAgICAgdGhlIHNoZWx0ZXIg4oCUIGFuZCBpdHMgY29vcmRpbmF0ZXMg4oCUIGFyZSBzdGlsbCBpbiBmbGlnaHQuIExvYWRpbmcgL1xuICAgICAgICAgZXJyb3Igc2hvdyB0aGUgcGxhY2Vob2xkZXIgYmFja2dyb3VuZDsgb24gbG9hZCBzdWNjZXNzIHRoZSBwYWdlXG4gICAgICAgICBmbGllcyBoZXJlIHRvIHN0cmVldCBsZXZlbCBhbmQgcGlucyB0aGUgc2hlbHRlci4gVGhlIG1hcCBpcyBhXG4gICAgICAgICBwaWN0dXJlIG9mIFdIRVJFIHRoZSBzaGVsdGVyIGlzOiBzdGF0aWMgbWFya2VyLCBubyBwaWNraW5nLCBub1xuICAgICAgICAgbWFya2VyIG5hdmlnYXRpb24uIC0tPlxuICAgIDxzZWN0aW9uIGNsYXNzPVwiZGV0YWlsLXNlY3Rpb25cIiBhcmlhLWxhYmVsbGVkYnk9XCJsb2NhdGlvbi1oZWFkaW5nXCI+XG4gICAgICA8aDIgY2xhc3M9XCJzZWN0aW9uLXRpdGxlXCIgaWQ9XCJsb2NhdGlvbi1oZWFkaW5nXCI+e3sgJ2RldGFpbC5sb2NhdGlvbkhlYWRpbmcnIHwgdCB9fTwvaDI+XG4gICAgICA8ZGl2ICNtYXBFbCBjbGFzcz1cInNoZWx0ZXItZGV0YWlsX19tYXBcIj48L2Rpdj5cbiAgICA8L3NlY3Rpb24+XG5cbiAgICBAaWYgKGxvYWRpbmcoKSkge1xuICAgICAgPGFwcC1sb2FkaW5nLWluZGljYXRvciBjbGFzcz1cImRldGFpbC1zdGF0ZVwiIFttZXNzYWdlXT1cIidkZXRhaWwubG9hZGluZycgfCB0XCIgLz5cbiAgICB9IEBlbHNlIGlmIChzaGVsdGVyKCk7IGFzIHMpIHtcbiAgICAgIEBpZiAoaGFzVXNlckRldGFpbHMoKSkge1xuICAgICAgICA8c2VjdGlvbiBjbGFzcz1cImRldGFpbC1zZWN0aW9uXCI+XG4gICAgICAgICAgPGgyIGNsYXNzPVwic2VjdGlvbi10aXRsZVwiPnt7ICdkZXRhaWwuZGV0YWlsc0hlYWRpbmcnIHwgdCB9fTwvaDI+XG4gICAgICAgICAgQGlmIChzLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICA8cCBjbGFzcz1cImRldGFpbC1kZXNjcmlwdGlvblwiPnt7IHMuZGVzY3JpcHRpb24gfX08L3A+XG4gICAgICAgICAgfVxuICAgICAgICAgIEBpZiAocy5jYXBhY2l0eSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgPHAgY2xhc3M9XCJkZXRhaWwtbWV0YVwiPkNhcGFjaXR5OiB7eyBzLmNhcGFjaXR5IH19PC9wPlxuICAgICAgICAgIH1cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgICAgfVxuXG4gICAgICA8IS0tIFJlcG9ydCBob3cgZnVsbCAoc2hlbHRlci10cnVzdC1hbmQtcmVwb3J0cyBENC9ENik6IHRocmVlIGxhcmdlXG4gICAgICAgICAgIGJhbmQgYnV0dG9ucywgb25lIHRhcCwgbGF0ZXN0LXdpbnMuIFRoZSB1c2VyJ3MgY3VycmVudCBiYW5kIGlzXG4gICAgICAgICAgIHByZS1zZWxlY3RlZCBmcm9tIHlvdXJPY2N1cGFuY3lCYW5kOyB0aGUgY3VycmVudCBhZ2dyZWdhdGUgK1xuICAgICAgICAgICByZWNlbmN5IHJlbmRlciBPTkxZIHdoaWxlIGZyZXNoICh0aGUgbnVsbCBibG9jayBzaG93cyBub3RoaW5nKS5cbiAgICAgICAgICAgVmVyaWZpZWQgdmlld2VycyByZXBvcnQ7IHVudmVyaWZpZWQvYW5vbnltb3VzIGdldCB0aGUgZXhpc3RpbmdcbiAgICAgICAgICAgcmVkaXJlY3Qgdm9jYWJ1bGFyeS4gLS0+XG4gICAgICA8c2VjdGlvbiBjbGFzcz1cImRldGFpbC1zZWN0aW9uXCIgYXJpYS1sYWJlbGxlZGJ5PVwib2NjdXBhbmN5LWhlYWRpbmdcIj5cbiAgICAgICAgPGgyIGNsYXNzPVwic2VjdGlvbi10aXRsZVwiIGlkPVwib2NjdXBhbmN5LWhlYWRpbmdcIj57eyAnZGV0YWlsLnJlcG9ydE9jY3VwYW5jeScgfCB0IH19PC9oMj5cbiAgICAgICAgPCEtLSBDb21tdW5pdHkgcHVsc2UgKE05KTogdGhlIGhvdy1mdWxsIGdhdWdlIG1vdmVkIHRvIHRoZSBzaGFyZWRcbiAgICAgICAgICAgICBib3R0b20gY29udGFpbmVyIGRpcmVjdGx5IGFib3ZlIHRoZSByZWNlbnQgbG9nIChwbGFjZW1lbnRcbiAgICAgICAgICAgICBwYXNzKSDigJQgdGhpcyBzZWN0aW9uIGtlZXBzIHRoZSBiYW5kIHBpY2tlci4gLS0+XG4gICAgICAgIEBpZiAoYXV0aC5pbml0aWFsaXplZCgpICYmIGF1dGguYXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgQGlmIChhdXRoLmlzVmVyaWZpZWQoKSkge1xuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhbmQtcGlja2VyXCIgcm9sZT1cImdyb3VwXCIgW2F0dHIuYXJpYS1sYWJlbF09XCInZGV0YWlsLm9jY3VwYW5jeS5hcmlhJyB8IHRcIj5cbiAgICAgICAgICAgICAgQGZvciAoYmFuZCBvZiBCQU5EUzsgdHJhY2sgYmFuZC52YWx1ZSkge1xuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgY2xhc3M9XCJidG4gYmFuZC1idG5cIlxuICAgICAgICAgICAgICAgICAgW2NsYXNzLmJhbmQtYnRuLS1hY3RpdmVdPVwicy55b3VyT2NjdXBhbmN5QmFuZCA9PT0gYmFuZC52YWx1ZVwiXG4gICAgICAgICAgICAgICAgICBbYXR0ci5hcmlhLXByZXNzZWRdPVwicy55b3VyT2NjdXBhbmN5QmFuZCA9PT0gYmFuZC52YWx1ZVwiXG4gICAgICAgICAgICAgICAgICBbZGlzYWJsZWRdPVwicmVwb3J0aW5nKClcIlxuICAgICAgICAgICAgICAgICAgKGNsaWNrKT1cInJlcG9ydEJhbmQoYmFuZC52YWx1ZSlcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHt7IGJhbmQubGFiZWxLZXkgfCB0IH19XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgQGlmIChzLm9jY3VwYW5jeTsgYXMgb2NjKSB7XG4gICAgICAgICAgICAgIDxwIGNsYXNzPVwib2NjdXBhbmN5LWxpbmVcIj57eyBvY2N1cGFuY3lUZXh0KG9jYykgfX08L3A+XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBAZWxzZSB7XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwicmVwb3J0LWdhdGUtcHJvbXB0XCI+XG4gICAgICAgICAgICAgIDxwPnt7ICdkZXRhaWwudmVyaWZ5Lm9jY3VwYW5jeScgfCB0IH19PC9wPlxuICAgICAgICAgICAgICA8YVxuICAgICAgICAgICAgICAgIHJvdXRlckxpbms9XCIvdmVyaWZ5XCJcbiAgICAgICAgICAgICAgICBbcXVlcnlQYXJhbXNdPVwieyByZXR1cm5Vcmw6ICcvc2hlbHRlcnMvJyArIGlkKCkgfVwiXG4gICAgICAgICAgICAgICAgY2xhc3M9XCJidG4gYnRuLS1wcmltYXJ5XCJcbiAgICAgICAgICAgICAgICA+e3sgJ2RldGFpbC52ZXJpZnlBY2NvdW50JyB8IHQgfX08L2FcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgfVxuICAgICAgICB9IEBlbHNlIHtcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwicmVwb3J0LWdhdGUtcHJvbXB0XCI+XG4gICAgICAgICAgICA8cD57eyAnZGV0YWlsLmxvZ2luLm9jY3VwYW5jeScgfCB0IH19PC9wPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICB9XG4gICAgICA8L3NlY3Rpb24+XG5cbiAgICAgIDwhLS0gUmVwb3J0IG9wZW4vY2xvc2VkOiB0d28gbGFyZ2Ugc3RhdGUgYnV0dG9ucyxcbiAgICAgICAgICAgb25lIHRhcCwgbGF0ZXN0LXdpbnMg4oCUIHRoZSBcIlJlcG9ydCBob3cgZnVsbFwiIHNlY3Rpb24ncyBzdHJ1Y3R1cmVcbiAgICAgICAgICAgbWlycm9yZWQgMToxIChzYW1lIGdhdGVzLCBzYW1lIHJlZGlyZWN0IHZvY2FidWxhcnksIHNhbWUgZXJyb3JcbiAgICAgICAgICAgaGFuZGxpbmcpLiBUaGUgdXNlcidzIGN1cnJlbnQgc3RhdGUgaXMgcHJlLXNlbGVjdGVkIGZyb21cbiAgICAgICAgICAgeW91ck9wZW5TdGF0dXMgKHJhZGlvLXN0eWxlIHByZXNzZWQgc3RhdGUpOyBhIHRhcCBmaXJlc1xuICAgICAgICAgICBwdXRPcGVuU3RhdHVzIHdpdGggdGhlIG9wdGltaXN0aWMgcHJlc3NlZCBzdGF0ZSBhbmQgcmVmZXRjaGVzLlxuICAgICAgICAgICBPcGVuIGlzIHRoZSBkZWZhdWx0OiBhIGZyZXNoIE9QRU4gcmVuZGVycyBubyByb3cgYmFkZ2UsIHRoZVxuICAgICAgICAgICBwaWNrZXIgaXMgd2hlcmUgdGhlIHNpZ25hbCBsaXZlcy4gLS0+XG4gICAgICA8c2VjdGlvbiBjbGFzcz1cImRldGFpbC1zZWN0aW9uXCIgYXJpYS1sYWJlbGxlZGJ5PVwib3Blbi1zdGF0dXMtaGVhZGluZ1wiPlxuICAgICAgICA8aDIgY2xhc3M9XCJzZWN0aW9uLXRpdGxlXCIgaWQ9XCJvcGVuLXN0YXR1cy1oZWFkaW5nXCI+e3sgJ2RldGFpbC5yZXBvcnRPcGVuJyB8IHQgfX08L2gyPlxuICAgICAgICA8IS0tIENvbW11bml0eSBwdWxzZSAoTTkpOiB0aGUgb3Blbi9jbG9zZWQgZ2F1Z2UgbW92ZWQgdG8gdGhlXG4gICAgICAgICAgICAgc2hhcmVkIGJvdHRvbSBjb250YWluZXIgZGlyZWN0bHkgYWJvdmUgdGhlIHJlY2VudCBsb2dcbiAgICAgICAgICAgICAocGxhY2VtZW50IHBhc3MpIOKAlCB0aGlzIHNlY3Rpb24ga2VlcHMgdGhlIHN0YXRlIHBpY2tlci4gLS0+XG4gICAgICAgIEBpZiAoYXV0aC5pbml0aWFsaXplZCgpICYmIGF1dGguYXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgQGlmIChhdXRoLmlzVmVyaWZpZWQoKSkge1xuICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICBjbGFzcz1cIm9wZW4tc3RhdHVzLXBpY2tlclwiXG4gICAgICAgICAgICAgIHJvbGU9XCJncm91cFwiXG4gICAgICAgICAgICAgIFthdHRyLmFyaWEtbGFiZWxdPVwiJ2RldGFpbC5vcGVuU3RhdHVzLmFyaWEnIHwgdFwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIEBmb3IgKG9wdGlvbiBvZiBPUEVOX1NUQVRFUzsgdHJhY2sgb3B0aW9uLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICBjbGFzcz1cImJ0biBvcGVuLXN0YXR1cy1idG5cIlxuICAgICAgICAgICAgICAgICAgW2NsYXNzLm9wZW4tc3RhdHVzLWJ0bi0tYWN0aXZlXT1cIm9wZW5TdGF0dXNQcmVzc2VkKG9wdGlvbi52YWx1ZSlcIlxuICAgICAgICAgICAgICAgICAgW2F0dHIuYXJpYS1wcmVzc2VkXT1cIm9wZW5TdGF0dXNQcmVzc2VkKG9wdGlvbi52YWx1ZSlcIlxuICAgICAgICAgICAgICAgICAgW2Rpc2FibGVkXT1cInJlcG9ydGluZygpXCJcbiAgICAgICAgICAgICAgICAgIChjbGljayk9XCJyZXBvcnRPcGVuU3RhdHVzKG9wdGlvbi52YWx1ZSlcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHt7IG9wdGlvbi5sYWJlbEtleSB8IHQgfX1cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgfSBAZWxzZSB7XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwicmVwb3J0LWdhdGUtcHJvbXB0XCI+XG4gICAgICAgICAgICAgIDxwPnt7ICdkZXRhaWwudmVyaWZ5Lm9wZW4nIHwgdCB9fTwvcD5cbiAgICAgICAgICAgICAgPGFcbiAgICAgICAgICAgICAgICByb3V0ZXJMaW5rPVwiL3ZlcmlmeVwiXG4gICAgICAgICAgICAgICAgW3F1ZXJ5UGFyYW1zXT1cInsgcmV0dXJuVXJsOiAnL3NoZWx0ZXJzLycgKyBpZCgpIH1cIlxuICAgICAgICAgICAgICAgIGNsYXNzPVwiYnRuIGJ0bi0tcHJpbWFyeVwiXG4gICAgICAgICAgICAgICAgPnt7ICdkZXRhaWwudmVyaWZ5QWNjb3VudCcgfCB0IH19PC9hXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIH1cbiAgICAgICAgfSBAZWxzZSB7XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJlcG9ydC1nYXRlLXByb21wdFwiPlxuICAgICAgICAgICAgPHA+e3sgJ2RldGFpbC5sb2dpbi5vcGVuJyB8IHQgfX08L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIH1cbiAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgPCEtLSBSZXBvcnQgdGhpcyBzaGVsdGVyIChzaGVsdGVyLXRydXN0LWFuZC1yZXBvcnRzIEQxL0Q2KTogdGhlIHR5cGVkXG4gICAgICAgICAgIHJlcG9ydCAodmVyaWZpZWQgb25seSwgb25lIHBlciB0eXBlKS4gVGhlIGZhY3R1YWwgdHlwZXNcbiAgICAgICAgICAgKENMT1NFRCAvIFdST05HX0xPQ0FUSU9OIC8gT1RIRVIpIGNhcnJ5IHRoZSBkZXRhaWwgZmllbGQuIC0tPlxuICAgICAgPHNlY3Rpb24gY2xhc3M9XCJkZXRhaWwtc2VjdGlvblwiIGFyaWEtbGFiZWxsZWRieT1cInJlcG9ydC1zaGVsdGVyLWhlYWRpbmdcIj5cbiAgICAgICAgPGgyIGNsYXNzPVwic2VjdGlvbi10aXRsZVwiIGlkPVwicmVwb3J0LXNoZWx0ZXItaGVhZGluZ1wiPnt7ICdkZXRhaWwucmVwb3J0VGhpcycgfCB0IH19PC9oMj5cbiAgICAgICAgQGlmIChhdXRoLmluaXRpYWxpemVkKCkgJiYgYXV0aC5hdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICBAaWYgKGF1dGguaXNWZXJpZmllZCgpKSB7XG4gICAgICAgICAgICBAaWYgKCFyZXBvcnRPcGVuKCkpIHtcbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgIGNsYXNzPVwiYnRuIGJ0bi0tZ2hvc3RcIlxuICAgICAgICAgICAgICAgIFtkaXNhYmxlZF09XCJyZXBvcnRpbmcoKVwiXG4gICAgICAgICAgICAgICAgKGNsaWNrKT1cIm9wZW5SZXBvcnQoKVwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICB7eyAnZGV0YWlsLnJlcG9ydCcgfCB0IH19XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgfSBAZWxzZSB7XG4gICAgICAgICAgICAgIDxmb3JtIGNsYXNzPVwicmVwb3J0LWZvcm1cIiAoc3VibWl0KT1cIiRldmVudC5wcmV2ZW50RGVmYXVsdCgpOyBzdWJtaXRSZXBvcnQoKVwiPlxuICAgICAgICAgICAgICAgIDxmaWVsZHNldCBjbGFzcz1cInJlcG9ydC1vcHRpb25zXCIgW2F0dHIuYXJpYS1sYWJlbF09XCInZGV0YWlsLnJlcG9ydFR5cGUuYXJpYScgfCB0XCI+XG4gICAgICAgICAgICAgICAgICBAZm9yIChvcHRpb24gb2YgUkVQT1JUX1RZUEVTOyB0cmFjayBvcHRpb24udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPVwicmVwb3J0LW9wdGlvblwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cInJhZGlvXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJzaGVsdGVyLXJlcG9ydC10eXBlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIFt2YWx1ZV09XCJvcHRpb24udmFsdWVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgW2NoZWNrZWRdPVwicmVwb3J0VHlwZSgpID09PSBvcHRpb24udmFsdWVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgKGNoYW5nZSk9XCJvblJlcG9ydFR5cGVDaGFuZ2UoJGV2ZW50KVwiXG4gICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICB7eyBvcHRpb24ubGFiZWxLZXkgfCB0IH19XG4gICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgPC9maWVsZHNldD5cbiAgICAgICAgICAgICAgICBAaWYgKHJlcG9ydERldGFpbFBsYWNlaG9sZGVyKCk7IGFzIHBsYWNlaG9sZGVyKSB7XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj1cInJlcG9ydC1kZXRhaWxcIj57eyAnZGV0YWlsLnJlcG9ydERldGFpbExhYmVsJyB8IHQgfX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWFcbiAgICAgICAgICAgICAgICAgICAgICBpZD1cInJlcG9ydC1kZXRhaWxcIlxuICAgICAgICAgICAgICAgICAgICAgIG1heGxlbmd0aD1cIjUwMFwiXG4gICAgICAgICAgICAgICAgICAgICAgW2Zvcm1Db250cm9sXT1cInJlcG9ydERldGFpbFwiXG4gICAgICAgICAgICAgICAgICAgICAgW3BsYWNlaG9sZGVyXT1cInBsYWNlaG9sZGVyXCJcbiAgICAgICAgICAgICAgICAgICAgPjwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgICAgIEBpZiAocmVwb3J0RGV0YWlsLnRvdWNoZWQgJiYgcmVwb3J0RGV0YWlsLmludmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cImZpZWxkLWVycm9yXCI+e3sgJ2RldGFpbC5yZXBvcnREZXRhaWxFcnJvcicgfCB0IH19PC9wPlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgQGlmIChyZXBvcnREdXBsaWNhdGUoKTsgYXMgZHVwKSB7XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cInJlcG9ydC1zdGF0dXNcIiByb2xlPVwic3RhdHVzXCI+e3sgZHVwIH19PC9wPlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicmVwb3J0LWFjdGlvbnNcIj5cbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cInN1Ym1pdFwiXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzPVwiYnRuIGJ0bi0tcHJpbWFyeVwiXG4gICAgICAgICAgICAgICAgICAgIFtkaXNhYmxlZF09XCJyZXBvcnRpbmcoKSB8fCByZXBvcnRUeXBlKCkgPT09IG51bGwgfHwgcmVwb3J0RGV0YWlsLmludmFsaWRcIlxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICB7eyByZXBvcnRpbmcoKSA/ICgnZGV0YWlsLnN1Ym1pdHRpbmcnIHwgdCkgOiAoJ2RldGFpbC5zdWJtaXRSZXBvcnQnIHwgdCkgfX1cbiAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJidG4gYnRuLS1naG9zdFwiXG4gICAgICAgICAgICAgICAgICAgIChjbGljayk9XCJjbG9zZVJlcG9ydCgpXCJcbiAgICAgICAgICAgICAgICAgICAgW2Rpc2FibGVkXT1cInJlcG9ydGluZygpXCJcbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAge3sgJ2RldGFpbC5jYW5jZWwnIHwgdCB9fVxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZm9ybT5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IEBlbHNlIHtcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyZXBvcnQtZ2F0ZS1wcm9tcHRcIj5cbiAgICAgICAgICAgICAgPHA+e3sgJ2RldGFpbC52ZXJpZnkucmVwb3J0JyB8IHQgfX08L3A+XG4gICAgICAgICAgICAgIDxhXG4gICAgICAgICAgICAgICAgcm91dGVyTGluaz1cIi92ZXJpZnlcIlxuICAgICAgICAgICAgICAgIFtxdWVyeVBhcmFtc109XCJ7IHJldHVyblVybDogJy9zaGVsdGVycy8nICsgaWQoKSB9XCJcbiAgICAgICAgICAgICAgICBjbGFzcz1cImJ0biBidG4tLXByaW1hcnlcIlxuICAgICAgICAgICAgICAgID57eyAnZGV0YWlsLnZlcmlmeUFjY291bnQnIHwgdCB9fTwvYVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICB9XG4gICAgICAgIH0gQGVsc2Uge1xuICAgICAgICAgIDxkaXYgY2xhc3M9XCJyZXBvcnQtZ2F0ZS1wcm9tcHRcIj5cbiAgICAgICAgICAgIDxwPnt7ICdkZXRhaWwubG9naW4ucmVwb3J0JyB8IHQgfX08L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIH1cbiAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgPCEtLSBDb21tdW5pdHkgcHVsc2UgKE05KTogdGhlIHR3byBnYXVnZXMsIG1vdmVkIHRvIHRoZSBib3R0b20gb2ZcbiAgICAgICAgICAgdGhlIHBhZ2Ug4oCUIERJUkVDVExZIGFib3ZlIHRoZSByZWNlbnQgbG9nIHRoZXkgc3VtbWFyaXNlXG4gICAgICAgICAgIChvd25lciBwbGFjZW1lbnQgZGVjaXNpb247IHRoZSBwaWNrZXJzIHN0YXkgaW4gdGhlaXIgb3duXG4gICAgICAgICAgIHNlY3Rpb25zIGFib3ZlKS4gVGhlIHdlaWdodGVkIHNoYXJlcyAoc2VydmVyLWRlcml2ZWQpIGRyaXZlXG4gICAgICAgICAgIHRoZSBuZWVkbGVzLiBMYXlvdXQgKG93bmVyIG92ZXJsYXkgZml4KTogdGhlIEFSUk9XUyBzaXQgaW5cbiAgICAgICAgICAgLnB1bHNlLWdhdWdlc19fYXJyb3dzIOKAlCBhIHdyYXBwaW5nIHJvdywgc2lkZSBieSBzaWRlIHdoZW5ldmVyXG4gICAgICAgICAgIGJvdGggMjQwcHggZ2F1Z2VzIGZpdCwgc3RhY2tlZCBiZWxvdyB0aGF0OyB0aGUgQ09VTlQgTElORVNcbiAgICAgICAgICAgKHRoZSBjYXB0aW9ucyDigJQgZWFjaCBnYXVnZSdzIGFjY2Vzc2libGUgdGV4dCwgYXNzb2NpYXRlZCB2aWFcbiAgICAgICAgICAgYXJpYS1kZXNjcmliZWRieSkgc2l0IGluIC5wdWxzZS1nYXVnZXNfX2NhcHRpb25zLCBPTkVcbiAgICAgICAgICAgbm9ybWFsLWZsb3cgY29sdW1uIGJlbG93IHRoZSBhcnJvd3MsIHN0YWNrZWQgb25lIHVuZGVyIHRoZVxuICAgICAgICAgICBvdGhlci4gVGhlIHdpbmRvdyBoaW50ICsgT05FIGdlbmVyYWwgZXN0aW1hdGUgbm90aWNlIChcInRoZVxuICAgICAgICAgICBhcnJvd3Mgc2hvdyBhIGNhbGN1bGF0ZWQgZXN0aW1hdGUsIG5vdCBjb25maXJtZWQgZGF0YVwiIOKAlCBhXG4gICAgICAgICAgIHBocmFzZSB0cnVlIGZvciBCT1RIIGFycm93czogb3Blbi9jbG9zZWQgaXMgYSBwcm9iYWJpbGl0eSxcbiAgICAgICAgICAgaG93LWZ1bGwgYW4gZXhwZWN0ZWQgbGV2ZWw7IHNlZSBkZXRhaWwucHVsc2UuZXN0aW1hdGVOb3RlKVxuICAgICAgICAgICBzaXQgYXQgdGhlIHRvcCB3aXRoIHRoZSB3aW5kb3cgaGludC4gVGhlIGlubGluZSBjYXB0aW9ucyB1c2VkXG4gICAgICAgICAgIHRvIG92ZXJmbG93IHRoZWlyXG4gICAgICAgICAgIDI0MHB4IGJveGVzICh0aGUgY291bnQgbGluZSdzIG5vd3JhcCB0b2tlbnMgY2FycmllZCBubyBicmVha1xuICAgICAgICAgICBvcHBvcnR1bml0aWVzKSBhbmQgcGFpbnQgb3ZlciBlYWNoIG90aGVyOyB0aGUgY29sdW1uICsgdGhlXG4gICAgICAgICAgIHdiciBiZXR3ZWVuIHRoZSB0b2tlbnMga2VlcHMgYm90aCBsaW5lcyBhbHdheXMgZnVsbHlcbiAgICAgICAgICAgcmVhZGFibGUuIFJlbmRlcmVkIGZvciBFVkVSWSB2aWV3ZXIgKGd1ZXN0cyBpbmNsdWRlZCkg4oCUXG4gICAgICAgICAgIHJlYWQtb25seTsgdGhlIGVtcHR5IHN0YXRlIGlzIGV4cGxpY2l0IChubyBmcmVzaCByZXBvcnRzIOKGklxuICAgICAgICAgICBubyBuZXV0cmFsIGFycm93KS4gRE9NIG9yZGVyOiB0aGUgYXJyb3dzLCB0aGVuIHRoZWlyIGNvdW50XG4gICAgICAgICAgIGxpbmVzIOKAlCBhIHNjcmVlbiByZWFkZXIgbWVldHMgdGhlIHN1bW1hcnkgYmVmb3JlIHRoZSBsb2dcbiAgICAgICAgICAgYmVsb3cuIC0tPlxuICAgICAgPGRpdiBjbGFzcz1cInB1bHNlLWdhdWdlc1wiPlxuICAgICAgICA8IS0tIFRoZSB3aW5kb3cgbGluZTogdGhlIGdhdWdlcy9jb3VudHMgYXJlIGEgRlJFU0hORVNTIHRhbGx5IG92ZXJcbiAgICAgICAgICAgICB0aGUgbGFzdCB0d28gaG91cnMgKHRoZSBCRSdzIE9DQ1VQQU5DWV9GUkVTSE5FU1NfV0lORE9XKSB3aGlsZVxuICAgICAgICAgICAgIHRoZSBsb2cgYmVsb3cgaXMgYSBDSFJPTk9MT0dJQ0FMIGxvZyB3aXRoIG5vIHN1Y2ggd2luZG93LiBUaGVcbiAgICAgICAgICAgICB0d28gdGltZSBiYXNlcyBhcmUgc3RhdGVkIHJpZ2h0IHdoZXJlIHRoZSByZWFkZXIgbWVldHMgdGhlXG4gICAgICAgICAgICAgY291bnRzIOKAlCB3aXRob3V0IGl0LCBcIjAgc3BhY2UgYXZhaWxhYmxlXCIgcmVhZHMgYXMgYVxuICAgICAgICAgICAgIGNvbnRyYWRpY3Rpb24gb2YgdGhlIChvbGRlcikgbG9nIGVudHJpZXMuIEZpcnN0IGluIHRoZSBET006XG4gICAgICAgICAgICAgYSBzY3JlZW4gcmVhZGVyIGhlYXJzIHRoZSB3aW5kb3cgYmVmb3JlIHRoZSBudW1iZXJzIGl0XG4gICAgICAgICAgICAgcXVhbGlmaWVzLiAtLT5cbiAgICAgICAgPHAgY2xhc3M9XCJwdWxzZS1nYXVnZXNfX2hpbnRcIj57eyAnZGV0YWlsLnB1bHNlLndpbmRvd0hpbnQnIHwgdCB9fTwvcD5cbiAgICAgICAgPCEtLSBPTkUgZ2VuZXJhbCBub3RpY2UgZm9yIHRoZSB3aG9sZSBnYXVnZXMgc2VjdGlvbiAob3duZXIpOiB0aGVcbiAgICAgICAgICAgICBhcnJvd3Mgc2hvdyBhIENBTENVTEFURUQgRVNUSU1BVEUgZnJvbSB0aGUgZnJlc2ggcmVwb3J0cyxcbiAgICAgICAgICAgICBub3QgY29uZmlybWVkIGRhdGEuIFwiRXN0aW1hdGVcIiBpcyB0cnVlIGZvciBCT1RIIGFycm93cyDigJRcbiAgICAgICAgICAgICBvcGVuL2Nsb3NlZCBpcyBhIHByb2JhYmlsaXR5LCBob3ctZnVsbCBhbiBleHBlY3RlZCBsZXZlbCDigJRcbiAgICAgICAgICAgICBzbyB0aGUgc2luZ2xlIHBocmFzZSBuZXZlciBtaXMtZGVzY3JpYmVzIHRoZSBob3ctZnVsbCBhcnJvd1xuICAgICAgICAgICAgIChzZWUgdGhlIGtleSdzIGRvYyBpbiBjb3JlL2kxOG4vbWVzc2FnZXMudHMpLiBTaXRzIHdpdGggdGhlXG4gICAgICAgICAgICAgd2luZG93IGhpbnQ7IHRoZSBwZXItZ2F1Z2UgQ09VTlQgTElORVMgYmVsb3cgc3RheSBlYWNoXG4gICAgICAgICAgICAgZ2F1Z2UncyBhY2Nlc3NpYmxlIHRleHQgKGFyaWEtZGVzY3JpYmVkYnkg4oaSIGNvdW50IGxpbmUpLiAtLT5cbiAgICAgICAgPHAgY2xhc3M9XCJwdWxzZS1nYXVnZXNfX2hpbnRcIj57eyAnZGV0YWlsLnB1bHNlLmVzdGltYXRlTm90ZScgfCB0IH19PC9wPlxuICAgICAgICA8ZGl2IGNsYXNzPVwicHVsc2UtZ2F1Z2VzX19hcnJvd3NcIj5cbiAgICAgICAgICBAaWYgKG9jY3VwYW5jeVB1bHNlKCk7IGFzIG9jY1B1bHNlKSB7XG4gICAgICAgICAgICA8IS0tIFRoZSBob3ctZnVsbCBhcnJvdyByZWZlcmVuY2VzIGl0cyBjb3VudC1saW5lIGlkIOKAlCB0aGVcbiAgICAgICAgICAgICAgICAgY291bnQgbGluZSBpcyB0aGUgZ2F1Z2UncyBhY2Nlc3NpYmxlIHRleHQuIC0tPlxuICAgICAgICAgICAgPGFwcC1yZXBvcnQtZ2F1Z2VcbiAgICAgICAgICAgICAgW2xlZnRMYWJlbF09XCInZGV0YWlsLnB1bHNlLmtpbmQuc3BhY2UnIHwgdFwiXG4gICAgICAgICAgICAgIFtyaWdodExhYmVsXT1cIidkZXRhaWwucHVsc2Uua2luZC5mdWxsJyB8IHRcIlxuICAgICAgICAgICAgICBbc2hhcmVdPVwib2NjUHVsc2UuZnVsbG5lc3NcIlxuICAgICAgICAgICAgICBbZGVzY3JpYmVkQnldPVwiJ3B1bHNlLW9jY3VwYW5jeS1jYXB0aW9uJ1wiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIH0gQGVsc2Uge1xuICAgICAgICAgICAgPGFwcC1saXN0LXN0YXRlXG4gICAgICAgICAgICAgIGNsYXNzPVwicHVsc2UtZW1wdHlcIlxuICAgICAgICAgICAgICBba2luZF09XCInZW1wdHknXCJcbiAgICAgICAgICAgICAgW21lc3NhZ2VLZXldPVwiJ2RldGFpbC5wdWxzZS5lbXB0eU9jY3VwYW5jeSdcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICB9XG4gICAgICAgICAgQGlmIChvcGVuUHVsc2UoKTsgYXMgb3BlblB1bHNlKSB7XG4gICAgICAgICAgICA8IS0tIFRoZSBvcGVuL2Nsb3NlZCBhcnJvdyByZWZlcmVuY2VzIGl0cyBjb3VudC1saW5lIGlkIOKAlCB0aGVcbiAgICAgICAgICAgICAgICAgY291bnQgbGluZSBpcyB0aGUgZ2F1Z2UncyBhY2Nlc3NpYmxlIHRleHQuIC0tPlxuICAgICAgICAgICAgPGFwcC1yZXBvcnQtZ2F1Z2VcbiAgICAgICAgICAgICAgW2xlZnRMYWJlbF09XCInZGV0YWlsLnB1bHNlLmtpbmQuY2xvc2VkJyB8IHRcIlxuICAgICAgICAgICAgICBbcmlnaHRMYWJlbF09XCInZGV0YWlsLnB1bHNlLmtpbmQub3BlbicgfCB0XCJcbiAgICAgICAgICAgICAgW3NoYXJlXT1cIm9wZW5QdWxzZS5vcGVuU2hhcmVcIlxuICAgICAgICAgICAgICBbZGVzY3JpYmVkQnldPVwiJ3B1bHNlLW9wZW4tY2FwdGlvbidcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICB9IEBlbHNlIHtcbiAgICAgICAgICAgIDxhcHAtbGlzdC1zdGF0ZVxuICAgICAgICAgICAgICBjbGFzcz1cInB1bHNlLWVtcHR5XCJcbiAgICAgICAgICAgICAgW2tpbmRdPVwiJ2VtcHR5J1wiXG4gICAgICAgICAgICAgIFttZXNzYWdlS2V5XT1cIidkZXRhaWwucHVsc2UuZW1wdHlPcGVuJ1wiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIH1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIEBpZiAob2NjdXBhbmN5UHVsc2UoKSB8fCBvcGVuUHVsc2UoKSkge1xuICAgICAgICAgIDxkaXYgY2xhc3M9XCJwdWxzZS1nYXVnZXNfX2NhcHRpb25zXCI+XG4gICAgICAgICAgICBAaWYgKG9jY3VwYW5jeVB1bHNlKCk7IGFzIG9jY1B1bHNlKSB7XG4gICAgICAgICAgICAgIDxhcHAtcmVwb3J0LWdhdWdlXG4gICAgICAgICAgICAgICAgW2NhcHRpb25Pbmx5XT1cInRydWVcIlxuICAgICAgICAgICAgICAgIFtjYXB0aW9uSWRdPVwiJ3B1bHNlLW9jY3VwYW5jeS1jYXB0aW9uJ1wiXG4gICAgICAgICAgICAgICAgW3RleHRdPVwib2NjdXBhbmN5UHVsc2VUZXh0KG9jY1B1bHNlKVwiXG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBAaWYgKG9wZW5QdWxzZSgpOyBhcyBvcGVuUHVsc2UpIHtcbiAgICAgICAgICAgICAgPGFwcC1yZXBvcnQtZ2F1Z2VcbiAgICAgICAgICAgICAgICBbY2FwdGlvbk9ubHldPVwidHJ1ZVwiXG4gICAgICAgICAgICAgICAgW2NhcHRpb25JZF09XCIncHVsc2Utb3Blbi1jYXB0aW9uJ1wiXG4gICAgICAgICAgICAgICAgW3RleHRdPVwib3BlblB1bHNlVGV4dChvcGVuUHVsc2UpXCJcbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgfVxuICAgICAgPC9kaXY+XG5cbiAgICAgIDwhLS0gUmVwb3J0IGxvZyAoTTkgY29tbXVuaXR5IHB1bHNlKTogdGhlIG1lcmdlZCBDSFJPTk9MT0dJQ0FMIGxvZyDigJRcbiAgICAgICAgICAgd2hhdCB3YXMgcmVwb3J0ZWQgKyB3aGVuLCBuZXdlc3QgZmlyc3QsIGNhcHBlZCBzZXJ2ZXItc2lkZSxcbiAgICAgICAgICAgd2l0aCBOTyAyLWhvdXIgd2luZG93ICh0aGUgZ2F1Z2VzIGFib3ZlIGFyZSB0aGUgd2luZG93ZWRcbiAgICAgICAgICAgdGFsbHk7IHRoZSBoZWFkaW5nICsgdGhlIHdpbmRvdyBsaW5lIHNheSBzbykuIE5PIHJlcG9ydGVyXG4gICAgICAgICAgIGlkZW50aXR5IChwcml2YWN5OiBcImEgY29tbXVuaXR5IG1lbWJlclwiKS4gUmVhZC1vbmx5IGZvciBldmVyeVxuICAgICAgICAgICB2aWV3ZXIuIC0tPlxuICAgICAgPHNlY3Rpb24gY2xhc3M9XCJkZXRhaWwtc2VjdGlvblwiIGFyaWEtbGFiZWxsZWRieT1cInJlY2VudC1yZXBvcnRzLWhlYWRpbmdcIj5cbiAgICAgICAgPGgyIGNsYXNzPVwic2VjdGlvbi10aXRsZVwiIGlkPVwicmVjZW50LXJlcG9ydHMtaGVhZGluZ1wiPnt7ICdkZXRhaWwucHVsc2UucmVjZW50JyB8IHQgfX08L2gyPlxuICAgICAgICBAaWYgKHJlY2VudFJlcG9ydHMoKS5sZW5ndGgpIHtcbiAgICAgICAgICA8dWwgY2xhc3M9XCJyZWNlbnQtcmVwb3J0c1wiPlxuICAgICAgICAgICAgQGZvciAoZW50cnkgb2YgcmVjZW50UmVwb3J0cygpOyB0cmFjayAkaW5kZXgpIHtcbiAgICAgICAgICAgICAgPGxpIGNsYXNzPVwicmVjZW50LXJlcG9ydHNfX2VudHJ5XCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJyZWNlbnQtcmVwb3J0c19fdGltZSBudW0tdGFidWxhclwiPnt7IHJlY2VudFJlcG9ydFRpbWUoZW50cnkpIH19PC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwicmVjZW50LXJlcG9ydHNfX2tpbmRcIj57eyByZWNlbnRSZXBvcnRLaW5kKGVudHJ5KSB9fTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICA8L3VsPlxuICAgICAgICB9IEBlbHNlIHtcbiAgICAgICAgICA8YXBwLWxpc3Qtc3RhdGVcbiAgICAgICAgICAgIGNsYXNzPVwicHVsc2UtZW1wdHlcIlxuICAgICAgICAgICAgW2tpbmRdPVwiJ2VtcHR5J1wiXG4gICAgICAgICAgICBbbWVzc2FnZUtleV09XCInZGV0YWlsLnB1bHNlLnJlY2VudEVtcHR5J1wiXG4gICAgICAgICAgLz5cbiAgICAgICAgfVxuICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICA8IS0tIFByYWN0aWNhbCBpbmZvIChJTkZPLUxBU1QtUkVQT1JURUQpOiB3aGF0IHdhcyBMQVNUIFJFUE9SVEVEIOKAlFxuICAgICAgICAgICB0aGUgU3RhdHVzIHJvdyBpcyB0aGUgbmV3ZXN0IE9QRU4vQ0xPU0VEIHJlcG9ydCwgdGhlIENhcGFjaXR5XG4gICAgICAgICAgIHJvdyB0aGUgbmV3ZXN0IFNQQUNFL0dFVFRJTkdfRlVMTC9GVUxMIHJlcG9ydCwgZWFjaCB3aXRoIGl0c1xuICAgICAgICAgICBvd24gZGF0ZSBhbmQgdGltZSBpbiB0aGUgdmlld2VyJ3MgbG9jYWxlICg8dGltZSBkYXRldGltZT4gaXNcbiAgICAgICAgICAgdGhlIG1hY2hpbmUtcmVhZGFibGUgaW5zdGFudCkuIEEga2luZCB3aXRoIG5vIHJlcG9ydCBpbiB0aGVcbiAgICAgICAgICAgcmVjZW50IGxvZyDihpIgdGhhdCByb3cncyBleHBsaWNpdCBlbXB0eSBzdGF0ZSAobmV2ZXIgYSBzdGFsZSBvclxuICAgICAgICAgICBpbnZlbnRlZCBzdGF0dXMpLlxuXG4gICAgICAgICAgIE5PIGRlcml2ZWQtc3RhdHVzIHJvdyBoZXJlIChvd25lciBkZWNpc2lvbiDigJQgZG8gbm90IHJlLWFkZCk6XG4gICAgICAgICAgIHRoZSBkZXJpdmVkIGRpc3BsYXkgc3RhdHVzIChzaGVsdGVyU3RhdHVzVGV4dCBpblxuICAgICAgICAgICBzaGFyZWQvc2hlbHRlci1jb3B5LnRzKSBjb25zdWx0cyB0aGUgU0FNRSBmcmVzaCBvcGVuL2Nsb3NlZFxuICAgICAgICAgICByZXBvcnRzIGFuZCBzbyB1c3VhbGx5IHByaW50cyB0aGUgc2FtZSB3b3JkIHRoZXNlIHJvd3MgYWxyZWFkeVxuICAgICAgICAgICBzaG93LCBhbmQgdGhlIG9uZSBjYXNlIHdoZXJlIGl0IHdvdWxkIGRpZmZlciDigJQgYSBsaWZlY3ljbGUtXG4gICAgICAgICAgIElOQUNUSVZFIHJvdyByZWFkaW5nIFwiQ2xvc2VkXCIg4oCUIGNhbm5vdCBiZSByZWFjaGVkIG9uIHRoaXMgcGFnZVxuICAgICAgICAgICAodGhlIHB1YmxpYyBkZXRhaWwgcmVhZCA0MDRzIElOQUNUSVZFIHJvd3MpLiBUaGUgbGFzdC1yZXBvcnRlZFxuICAgICAgICAgICByb3dzIGFyZSBzdHJpY3RseSBtb3JlIGluZm9ybWF0aXZlOiB0aGV5IGNhcnJ5IHRoZSB0aW1lLiBUaGVcbiAgICAgICAgICAgcnVsZSBpcyBOT1QgZGVhZCDigJQgdGhlIG1hcCdzIFwiT3BlblwiIGNoaXAgKGlzT3BlblJvdyksIHRoZVxuICAgICAgICAgICBoZWFkZXIncyBhbWJlciBiYWRnZSAob3BlblN0YXR1c0JhZGdlVGV4dCkgYW5kIHRoZVxuICAgICAgICAgICBhZG1pbi1mYWNpbmcgZGlzcGxheXMgc3RpbGwgY29uc3VtZSBpdC4gSXRzIGZ1bGwgb3JkZXIsIGZvclxuICAgICAgICAgICB0aGUgcmVjb3JkOiB0aGUgRlJFU0ggb3Blbi9jbG9zZWQgcmVwb3J0cyBvdXRyYW5rIHRoZVxuICAgICAgICAgICBsaWZlY3ljbGUgc3RhdHVzIOKAlCBhIGZyZXNoIGxvbmUgQ0xPU0VEIHJlcG9ydCBoZWRnZXNcbiAgICAgICAgICAgKFwiUmVwb3J0ZWQgY2xvc2VkXCIpLCBhIGZyZXNoIGZpcm0gb25lICh0d28rKSBpcyBmaXJtXG4gICAgICAgICAgIChcIkNsb3NlZFwiKSwgYSBmcmVzaCBPUEVOIHJlYWRzIFwiT3BlblwiOyBvbmx5IHdpdGggbm90aGluZyBmcmVzaFxuICAgICAgICAgICB0aGUgbGlmZWN5Y2xlIHN0YXR1cyBkZWNpZGVzIOKAlCBJTkFDVElWRSByZWFkcyBcIkNsb3NlZFwiLFxuICAgICAgICAgICBBQ1RJVkUgcmVhZHMgXCJPcGVuIChubyByZWNlbnQgcmVwb3J0cylcIi4gLS0+XG4gICAgICA8c2VjdGlvbiBjbGFzcz1cImRldGFpbC1zZWN0aW9uXCIgYXJpYS1sYWJlbGxlZGJ5PVwiaW5mby1oZWFkaW5nXCI+XG4gICAgICAgIDxoMiBjbGFzcz1cInNlY3Rpb24tdGl0bGVcIiBpZD1cImluZm8taGVhZGluZ1wiPnt7ICdkZXRhaWwuaW5mb0hlYWRpbmcnIHwgdCB9fTwvaDI+XG4gICAgICAgIDxkbCBjbGFzcz1cImZhY3QtbGlzdFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJmYWN0LWxpc3RfX3Jvd1wiPlxuICAgICAgICAgICAgPGR0IGNsYXNzPVwiZmFjdC1saXN0X19sYWJlbFwiPnt7ICdkZXRhaWwuc3RhdHVzTGFiZWwnIHwgdCB9fTwvZHQ+XG4gICAgICAgICAgICA8ZGQgY2xhc3M9XCJmYWN0LWxpc3RfX3ZhbHVlXCI+XG4gICAgICAgICAgICAgIEBpZiAobGFzdE9wZW5DbG9zZWRSZXBvcnQoKTsgYXMgZW50cnkpIHtcbiAgICAgICAgICAgICAgICB7eyBsYXN0UmVwb3J0VGV4dChlbnRyeSkgfX1cbiAgICAgICAgICAgICAgICA8dGltZSBjbGFzcz1cImZhY3QtbGlzdF9fdGltZSBudW0tdGFidWxhclwiIFthdHRyLmRhdGV0aW1lXT1cImVudHJ5LnJlcG9ydGVkQXRcIj57e1xuICAgICAgICAgICAgICAgICAgZW50cnkucmVwb3J0ZWRBdCB8IGRhdGU6ICdtZWRpdW0nIDogdW5kZWZpbmVkIDogdWlMb2NhbGUoKVxuICAgICAgICAgICAgICAgIH19PC90aW1lPlxuICAgICAgICAgICAgICB9IEBlbHNlIHtcbiAgICAgICAgICAgICAgICB7eyAnZGV0YWlsLnN0YXR1c0VtcHR5JyB8IHQgfX1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgPC9kZD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmFjdC1saXN0X19yb3dcIj5cbiAgICAgICAgICAgIDxkdCBjbGFzcz1cImZhY3QtbGlzdF9fbGFiZWxcIj57eyAnZGV0YWlsLmNhcGFjaXR5TGFiZWwnIHwgdCB9fTwvZHQ+XG4gICAgICAgICAgICA8ZGQgY2xhc3M9XCJmYWN0LWxpc3RfX3ZhbHVlXCI+XG4gICAgICAgICAgICAgIEBpZiAobGFzdENhcGFjaXR5UmVwb3J0KCk7IGFzIGVudHJ5KSB7XG4gICAgICAgICAgICAgICAge3sgbGFzdFJlcG9ydFRleHQoZW50cnkpIH19XG4gICAgICAgICAgICAgICAgPHRpbWUgY2xhc3M9XCJmYWN0LWxpc3RfX3RpbWUgbnVtLXRhYnVsYXJcIiBbYXR0ci5kYXRldGltZV09XCJlbnRyeS5yZXBvcnRlZEF0XCI+e3tcbiAgICAgICAgICAgICAgICAgIGVudHJ5LnJlcG9ydGVkQXQgfCBkYXRlOiAnbWVkaXVtJyA6IHVuZGVmaW5lZCA6IHVpTG9jYWxlKClcbiAgICAgICAgICAgICAgICB9fTwvdGltZT5cbiAgICAgICAgICAgICAgfSBAZWxzZSB7XG4gICAgICAgICAgICAgICAge3sgJ2RldGFpbC5jYXBhY2l0eUVtcHR5JyB8IHQgfX1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgPC9kZD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kbD5cbiAgICAgIDwvc2VjdGlvbj5cbiAgICB9XG4gIDwvc2VjdGlvbj5cbn1cbiIsImltcG9ydCB7IENoYW5nZURldGVjdGlvblN0cmF0ZWd5LCBDb21wb25lbnQsIGNvbXB1dGVkLCBpbnB1dCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgZ2F1Z2VBbmdsZSB9IGZyb20gJy4vZ2F1Z2UtbWF0aCc7XG5cbi8qKlxuICogVGhlIHNlbWljaXJjdWxhciByZXBvcnQgZ2F1Z2UgKE05IOKAlCByZXBvcnQgYWdncmVnYXRpb24gVUkpOiBvbmVcbiAqIHF1ZXN0aW9uLCB0d28gZW5kcy4gVGhlIG5lZWRsZSBzd2VlcHMgZnJvbSAwwrAgKHBvaW50aW5nIGF0IHRoZSBMRUZUXG4gKiBlbmQsIGUuZy4gXCJDbG9zZWRcIiAvIFwiU3BhY2UgYXZhaWxhYmxlXCIpIHRocm91Z2ggOTDCsCAoc3RyYWlnaHQgdXAg4oCUIGFuXG4gKiBleGFjdCBlcXVhbCBzcGxpdCkgdG8gMTgwwrAgKHBvaW50aW5nIGF0IHRoZSBSSUdIVCBlbmQsIGUuZy4gXCJPcGVuXCIgL1xuICogXCJGdWxsXCIpOyB0aGUgYW5nbGUgaXMgdGhlIFNFUlZFUi13ZWlnaHRlZCBzaGFyZSB0b3dhcmQgdGhlIHJpZ2h0IGVuZFxuICogKHRoZSBzZXJ2ZXIgb3ducyB0aGUgZGVyaXZhdGlvbiDigJQgdGhpcyBjb21wb25lbnQgbmV2ZXIgcmUtZGVyaXZlcyBmcm9tXG4gKiBjb3VudHMpLiBObyBkYXRhIChgc2hhcmVgIG51bGwpIHJlbmRlcnMgdGhlIGV4cGxpY2l0IGVtcHR5IHN0YXRlXG4gKiBpbnN0ZWFkIG9mIGEgbWlzbGVhZGluZyBuZXV0cmFsIGFycm93LlxuICpcbiAqIEFjY2Vzc2liaWxpdHk6IHRoZSBhbmdsZSBpcyBuZXZlciB0aGUgT05MWSBjYXJyaWVyIG9mIG1lYW5pbmcg4oCUIHRoZVxuICogY291bnQgbGluZSAodGhlIHZpc2libGUgY2FwdGlvbiwgZS5nLiBcIlJlcG9ydHM6IDMgb3BlbiwgMiBjbG9zZWRcIilcbiAqIGFuZCB0aGUgZW5kIGxhYmVscyBhcmUgdmlzaWJsZSB0ZXh0OyB0aGUgU1ZHIGlzIGFyaWEtaGlkZGVuIGRlY29yYXRpb25cbiAqIGJlaGluZCB0aGF0IHRleHQsIHNvIHRoZSBnYXVnZSBpcyBuZXZlciBjb2xvdXItb25seSBvciBnZXN0dXJlLW9ubHkuXG4gKlxuICogQ2FwdGlvbiBwbGFjZW1lbnQgKGxheW91dCBwYXNzKTogYnkgZGVmYXVsdCB0aGUgY291bnQgbGluZSBpcyB0aGVcbiAqIGZpZ3VyZSdzIDxmaWdjYXB0aW9uPiAodGhlIGZpZ3VyZSdzIGFjY2Vzc2libGUgdGV4dCkuIFRoZSBERVRBQ0hFRFxuICogbW9kZXMgc3BsaXQgdGhlIGdhdWdlIGludG8gaXRzIHR3byBoYWx2ZXMg4oCUIGRlc2NyaWJlZEJ5IHJlbmRlcnMgdGhlXG4gKiBhcnJvdyBvbmx5ICh0aGUgZmlndXJlIHJlZmVyZW5jZXMgdGhlIGV4dGVybmFsIGNhcHRpb24gdmlhXG4gKiBhcmlhLWRlc2NyaWJlZGJ5LCBrZWVwaW5nIHRoZSBjYXB0aW9uIHRoZSBnYXVnZSdzIGFjY2Vzc2libGUgdGV4dFxuICogd2l0aG91dCBhIHNlY29uZCBjb3B5IGluIHRoZSBET00pLCBjYXB0aW9uT25seSByZW5kZXJzIHRoZSBjb3VudCBsaW5lXG4gKiBvbiBpdHMgb3duICh0aGUgZWxlbWVudCB0aGUgYXJyb3cgcmVmZXJlbmNlcykuIFRoZSBjb3VudCBsaW5lJ3MgYnJlYWtcbiAqIG9wcG9ydHVuaXRpZXMgbGl2ZSBpbiBhIDx3YnI+IGJldHdlZW4gZXZlcnkgcGFpciBvZiB0b2tlbnM6IHRoZSB0b2tlbnNcbiAqIGFyZSBhZGphY2VudCBpbiB0aGUgbWFya3VwIGFuZCBlYWNoIGlzIG5vd3JhcCwgc28gd2l0aG91dCB0aGUgd2JyIHRoZVxuICogd2hvbGUgbGluZSB3b3VsZCBiZSB1bmJyZWFrYWJsZSBhbmQgb3ZlcmZsb3cgaXRzIGJveC5cbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYXBwLXJlcG9ydC1nYXVnZScsXG4gIGltcG9ydHM6IFtdLFxuICB0ZW1wbGF0ZVVybDogJy4vcmVwb3J0LWdhdWdlLmh0bWwnLFxuICBzdHlsZVVybDogJy4vcmVwb3J0LWdhdWdlLnNjc3MnLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbn0pXG5leHBvcnQgY2xhc3MgUmVwb3J0R2F1Z2Uge1xuICAvKiogVGhlIHdlaWdodGVkIHNoYXJlIHRvd2FyZCB0aGUgcmlnaHQgZW5kICgwLi4xLCBzZXJ2ZXItZGVyaXZlZCk7XG4gICAqICBudWxsID0gbm8gZnJlc2ggcmVwb3J0cyDihpIgdGhlIGV4cGxpY2l0IGVtcHR5IHN0YXRlLiAqL1xuICByZWFkb25seSBzaGFyZSA9IGlucHV0PG51bWJlciB8IG51bGw+KG51bGwpO1xuICAvKiogVGhlIHZpc2libGUgKyBhY2Nlc3NpYmxlIGNvdW50IHRleHQgKFwiUmVwb3J0czogMyBvcGVuLCAyIGNsb3NlZFwiKS4gKi9cbiAgcmVhZG9ubHkgdGV4dCA9IGlucHV0PHN0cmluZz4oJycpO1xuICAvKipcbiAgICogVGhlIGNvdW50IGxpbmUncyB3cmFwIHVuaXRzIChwbGFjZW1lbnQgcGFzcyk6IG9uZSBwZXIgY29tbWEtc2VwYXJhdGVkXG4gICAqIGNvdW50IHBocmFzZSAoXCJSZXBvcnRzOiAzIG9wZW4sIDIgY2xvc2VkXCIg4oaSIFtcIlJlcG9ydHM6IDMgb3BlbiwgXCIsXG4gICAqIFwiMiBjbG9zZWRcIl0pLiBFYWNoIHRva2VuIHJlbmRlcnMgYXMgb25lIHVuYnJlYWthYmxlIGlubGluZSB1bml0LCBzb1xuICAgKiB0aGUgbGluZSB3cmFwcyBCRVRXRUVOIGNvdW50cyDigJQgbmV2ZXIgaW5zaWRlIGEgcGhyYXNlIChcIjAgc3BhY2VcbiAgICogYXZhaWxhYmxlXCIgY2FuJ3Qgc3BsaXQpIOKAlCB3aGlsZSB0aGUgY29uY2F0ZW5hdGVkIHRleHQgc3RheXMgdGhlXG4gICAqIHN0cmluZyB2ZXJiYXRpbSAodGhlIHZpc2libGUgKyBhY2Nlc3NpYmxlIHRleHQgaXMgdW5jaGFuZ2VkKS5cbiAgICovXG4gIHJlYWRvbmx5IHRleHRUb2tlbnMgPSBjb21wdXRlZDxzdHJpbmdbXT4oKCkgPT4ge1xuICAgIGNvbnN0IHRleHQgPSB0aGlzLnRleHQoKTtcbiAgICBpZiAodGV4dCA9PT0gJycpIHJldHVybiBbXTtcbiAgICByZXR1cm4gdGV4dC5zcGxpdCgnLCAnKS5tYXAoKHBhcnQsIGksIHBhcnRzKSA9PiAoaSA8IHBhcnRzLmxlbmd0aCAtIDEgPyBgJHtwYXJ0fSwgYCA6IHBhcnQpKTtcbiAgfSk7XG4gIC8qKiBUaGUgbGVmdCBlbmQncyBsYWJlbCAoZS5nLiBcIkNsb3NlZFwiIC8gXCJTcGFjZSBhdmFpbGFibGVcIikuICovXG4gIHJlYWRvbmx5IGxlZnRMYWJlbCA9IGlucHV0PHN0cmluZz4oJycpO1xuICAvKiogVGhlIHJpZ2h0IGVuZCdzIGxhYmVsIChlLmcuIFwiT3BlblwiIC8gXCJGdWxsXCIpLiAqL1xuICByZWFkb25seSByaWdodExhYmVsID0gaW5wdXQ8c3RyaW5nPignJyk7XG4gIC8qKiBUaGUgZW1wdHktc3RhdGUgbGluZSAobm8gZnJlc2ggcmVwb3J0cykuICovXG4gIHJlYWRvbmx5IGVtcHR5VGV4dCA9IGlucHV0PHN0cmluZz4oJycpO1xuICAvKipcbiAgICogRGV0YWNoZWQtY2FwdGlvbiBhc3NvY2lhdGlvbjogd2hlbiBzZXQsIHRoZSBmaWd1cmUgcmVuZGVycyBXSVRIT1VUXG4gICAqIGl0cyBmaWdjYXB0aW9uIGFuZCBjYXJyaWVzIGFyaWEtZGVzY3JpYmVkYnkgcG9pbnRpbmcgYXQgdGhlIGVsZW1lbnRcbiAgICogd2l0aCB0aGlzIGlkIOKAlCB0aGUgY291bnQgbGluZSByZW5kZXJlZCBlbHNld2hlcmUgKHRoZSBwYWdlJ3NcbiAgICogY2FwdGlvbnMgY29sdW1uKSBzdGF5cyB0aGUgZ2F1Z2UncyBhY2Nlc3NpYmxlIHRleHQsIGV4YWN0bHkgb25lXG4gICAqIGNvcHkgaW4gdGhlIERPTS5cbiAgICovXG4gIHJlYWRvbmx5IGRlc2NyaWJlZEJ5ID0gaW5wdXQ8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIC8qKiBDYXB0aW9uLW9ubHkgbW9kZTogcmVuZGVyIGp1c3QgdGhlIGNvdW50IGxpbmUgKG5vIGZpZ3VyZSwgbm8gU1ZHKSDigJRcbiAgICogIHRoZSBwYWdlJ3MgY2FwdGlvbnMgY29sdW1uIGNvbXBvc2VzIHRoZSBhcnJvd3MgYW5kIHRoZSBsaW5lc1xuICAgKiAgc2VwYXJhdGVseSAodGhlIGFycm93cyByb3cgYWJvdmUsIHRoZSBsaW5lcyBzdGFja2VkIGluIGEgY29sdW1uXG4gICAqICBiZWxvdykuICovXG4gIHJlYWRvbmx5IGNhcHRpb25Pbmx5ID0gaW5wdXQoZmFsc2UpO1xuICAvKiogVGhlIGlkIG9mIHRoZSBjb3VudC1saW5lIGVsZW1lbnQgaW4gY2FwdGlvbi1vbmx5IG1vZGUgKHRoZSB0YXJnZXRcbiAgICogIG9mIHRoZSBhcnJvdydzIGFyaWEtZGVzY3JpYmVkYnkpLiAqL1xuICByZWFkb25seSBjYXB0aW9uSWQgPSBpbnB1dDxzdHJpbmcgfCBudWxsPihudWxsKTtcblxuICAvKiogVGhlIG5lZWRsZSBhbmdsZSBpbiBkZWdyZWVzIChudWxsIHdpdGggdGhlIHNoYXJlIOKGkiBlbXB0eSBzdGF0ZSkuICovXG4gIHJlYWRvbmx5IGFuZ2xlID0gY29tcHV0ZWQoKCkgPT4gZ2F1Z2VBbmdsZSh0aGlzLnNoYXJlKCkpKTtcbn1cbiIsIkBpZiAoY2FwdGlvbk9ubHkoKSkge1xuICA8IS0tIENhcHRpb24tb25seSBtb2RlOiB0aGUgY291bnQgbGluZSByZW5kZXJlZCBvbiBpdHMgb3duICh0aGUgcGFnZSdzXG4gICAgICAgY2FwdGlvbnMgY29sdW1uKS4gVGhlIGFycm93J3MgZmlndXJlIHBvaW50cyBhdCB0aGlzIGVsZW1lbnQgdmlhXG4gICAgICAgYXJpYS1kZXNjcmliZWRieSAoaXRzIGRlc2NyaWJlZEJ5IGlucHV0ID0gdGhpcyBjYXB0aW9uSWQpIOKAlCB0aGVcbiAgICAgICBsaW5lIGlzIHRoZSBnYXVnZSdzIGFjY2Vzc2libGUgdGV4dCwga2VwdCBleGFjdGx5IG9uZSBjb3B5IGluIHRoZVxuICAgICAgIERPTS4gVGhlIDx3YnI+IGJldHdlZW4gZXZlcnkgcGFpciBvZiB0b2tlbnMgaXMgdGhlIGxpbmUncyBicmVha1xuICAgICAgIG9wcG9ydHVuaXR5OiB0aGUgdG9rZW5zIGFyZSBhZGphY2VudCBpbiB0aGUgbWFya3VwIChBbmd1bGFyXG4gICAgICAgY29udHJvbCBmbG93IHN0cmlwcyB0aGUgbG9vcCdzIHdoaXRlc3BhY2UpIGFuZCBlYWNoIGlzIG5vd3JhcCwgc29cbiAgICAgICB3aXRob3V0IHRoZSB3YnIgdGhlIHdob2xlIGxpbmUgd291bGQgYmUgdW5icmVha2FibGUgYW5kIG92ZXJmbG93XG4gICAgICAgaXRzIGJveCBpbnN0ZWFkIG9mIHdyYXBwaW5nIGJldHdlZW4gdGhlIGNvdW50cy4gLS0+XG4gIDxwIGNsYXNzPVwicmVwb3J0LWdhdWdlX190ZXh0IHJlcG9ydC1nYXVnZV9fdGV4dC0tc3RhbmRhbG9uZVwiIFtpZF09XCJjYXB0aW9uSWQoKVwiPlxuICAgIEBmb3IgKHRva2VuIG9mIHRleHRUb2tlbnMoKTsgdHJhY2sgJGluZGV4OyBsZXQgbGFzdCA9ICRsYXN0KSB7XG4gICAgICA8c3BhbiBjbGFzcz1cInJlcG9ydC1nYXVnZV9fdG9rZW5cIj57eyB0b2tlbiB9fTwvc3Bhbj5cbiAgICAgIEBpZiAoIWxhc3QpIHtcbiAgICAgICAgPHdiciAvPlxuICAgICAgfVxuICAgIH1cbiAgPC9wPlxufSBAZWxzZSBpZiAoc2hhcmUoKSAhPT0gbnVsbCkge1xuICA8IS0tIERldGFjaGVkIG1vZGUgKGRlc2NyaWJlZEJ5IHNldCk6IHRoZSBhcnJvdyBvbmx5IOKAlCBubyBmaWdjYXB0aW9uO1xuICAgICAgIHRoZSBmaWd1cmUgcmVmZXJlbmNlcyB0aGUgZXh0ZXJuYWwgY2FwdGlvbiB3aXRoIGFyaWEtZGVzY3JpYmVkYnksXG4gICAgICAgd2hpY2gga2VlcHMgdGhlIGNhcHRpb24gdGhlIGdhdWdlJ3MgYWNjZXNzaWJsZSB0ZXh0IChvbmUgY29weSkuIC0tPlxuICA8ZmlndXJlXG4gICAgY2xhc3M9XCJyZXBvcnQtZ2F1Z2VcIlxuICAgIFtjbGFzcy5yZXBvcnQtZ2F1Z2UtLWFycm93XT1cImRlc2NyaWJlZEJ5KCkgIT09IG51bGxcIlxuICAgIFthdHRyLmFyaWEtZGVzY3JpYmVkYnldPVwiZGVzY3JpYmVkQnkoKVwiXG4gID5cbiAgICA8IS0tIFRoZSBzZW1pY2lyY2xlOiB0aGUgYXJjIGZyb20gdGhlIGxlZnQgZW5kICgyMCwxMDApIG92ZXIgdGhlIHRvcFxuICAgICAgICAgdG8gdGhlIHJpZ2h0IGVuZCAoMTgwLDEwMCk7IHRoZSBuZWVkbGUgc3RhcnRzIHBvaW50aW5nIExFRlRcbiAgICAgICAgICgwwrApIGFuZCByb3RhdGVzIGNsb2Nrd2lzZSBhcm91bmQgdGhlIGh1YiAoMTAwLDEwMCkg4oCUIDkwwrAgaXNcbiAgICAgICAgIHN0cmFpZ2h0IHVwLCAxODDCsCBwb2ludHMgcmlnaHQuIERlY29yYXRpdmU6IHRoZSBtZWFuaW5nIGlzIHRoZVxuICAgICAgICAgY291bnQgbGluZSAodGhlIGZpZ2NhcHRpb24gYmVsb3cgaW4gYXR0YWNoZWQgbW9kZSwgdGhlIGV4dGVybmFsXG4gICAgICAgICBjYXB0aW9uIGluIGRldGFjaGVkIG1vZGUpICsgdGhlIGVuZCBsYWJlbHMuIC0tPlxuICAgIDxzdmcgY2xhc3M9XCJyZXBvcnQtZ2F1Z2VfX3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjAwIDExMlwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIGZvY3VzYWJsZT1cImZhbHNlXCI+XG4gICAgICA8cGF0aCBjbGFzcz1cInJlcG9ydC1nYXVnZV9fYXJjXCIgZD1cIk0gMjAgMTAwIEEgODAgODAgMCAwIDEgMTgwIDEwMFwiIC8+XG4gICAgICA8ZyBjbGFzcz1cInJlcG9ydC1nYXVnZV9fbmVlZGxlXCIgW2F0dHIudHJhbnNmb3JtXT1cIidyb3RhdGUoJyArIGFuZ2xlKCkgKyAnIDEwMCAxMDApJ1wiPlxuICAgICAgICA8bGluZSB4MT1cIjEwMFwiIHkxPVwiMTAwXCIgeDI9XCIzOFwiIHkyPVwiMTAwXCIgLz5cbiAgICAgICAgPHBhdGggZD1cIk0gMzggMTAwIEwgNTAgOTQgTCA1MCAxMDYgWlwiIC8+XG4gICAgICA8L2c+XG4gICAgICA8Y2lyY2xlIGNsYXNzPVwicmVwb3J0LWdhdWdlX19odWJcIiBjeD1cIjEwMFwiIGN5PVwiMTAwXCIgcj1cIjVcIiAvPlxuICAgIDwvc3ZnPlxuICAgIDxkaXYgY2xhc3M9XCJyZXBvcnQtZ2F1Z2VfX2VuZHNcIj5cbiAgICAgIDxzcGFuIGNsYXNzPVwicmVwb3J0LWdhdWdlX19lbmQgcmVwb3J0LWdhdWdlX19lbmQtLWxlZnRcIj57eyBsZWZ0TGFiZWwoKSB9fTwvc3Bhbj5cbiAgICAgIDxzcGFuIGNsYXNzPVwicmVwb3J0LWdhdWdlX19lbmQgcmVwb3J0LWdhdWdlX19lbmQtLXJpZ2h0XCI+e3sgcmlnaHRMYWJlbCgpIH19PC9zcGFuPlxuICAgIDwvZGl2PlxuICAgIEBpZiAoZGVzY3JpYmVkQnkoKSA9PT0gbnVsbCkge1xuICAgICAgPGZpZ2NhcHRpb24gY2xhc3M9XCJyZXBvcnQtZ2F1Z2VfX3RleHRcIj5cbiAgICAgICAgQGZvciAodG9rZW4gb2YgdGV4dFRva2VucygpOyB0cmFjayAkaW5kZXg7IGxldCBsYXN0ID0gJGxhc3QpIHtcbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInJlcG9ydC1nYXVnZV9fdG9rZW5cIj57eyB0b2tlbiB9fTwvc3Bhbj5cbiAgICAgICAgICBAaWYgKCFsYXN0KSB7XG4gICAgICAgICAgICA8d2JyIC8+XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICA8L2ZpZ2NhcHRpb24+XG4gICAgfVxuICA8L2ZpZ3VyZT5cbn0gQGVsc2Uge1xuICA8cCBjbGFzcz1cInJlcG9ydC1nYXVnZV9fZW1wdHlcIiByb2xlPVwic3RhdHVzXCI+e3sgZW1wdHlUZXh0KCkgfX08L3A+XG59XG4iLCIvKipcbiAqIFRoZSByZXBvcnQtZ2F1Z2UgYW5nbGUgbWF0aCAoTTkg4oCUIHJlcG9ydCBhZ2dyZWdhdGlvbiBVSSk6IHRoZVxuICogc2VtaWNpcmN1bGFyIGdhdWdlJ3MgbmVlZGxlIHN3ZWVwcyAwwrAgKHBvaW50aW5nIGF0IHRoZSBMRUZUIGVuZCwgdGhlXG4gKiBcImNsb3NlZFwiIC8gXCJlbXB0eVwiIHNpZGUpIHRocm91Z2ggOTDCsCAoc3RyYWlnaHQgdXAg4oCUIGFuIGV4YWN0IGVxdWFsXG4gKiBzcGxpdCkgdG8gMTgwwrAgKHBvaW50aW5nIGF0IHRoZSBSSUdIVCBlbmQsIHRoZSBcIm9wZW5cIiAvIFwiZnVsbFwiIHNpZGUpLlxuICpcbiAqIFRoZSBzaGFyZSBpdHNlbGYgaXMgU0VSVkVSLWRlcml2ZWQgKHRydXN0LXdlaWdodGVkIOKAlCB0aGUgc2FtZVxuICogZGVyaXZhdGlvbiB0aGUgYXV0by1oaWRlIHRhbGx5IHVzZXMpLCBzbyB0aGlzIG1vZHVsZSBuZXZlciByZS1kZXJpdmVzXG4gKiBhbnl0aGluZyBmcm9tIGNvdW50czogaXQgb25seSBtYXBzIHRoZSBzaGFyZSB0byBhIG5lZWRsZSBhbmdsZS5cbiAqL1xuXG4vKipcbiAqIFRoZSBuZWVkbGUgYW5nbGUgaW4gZGVncmVlcyBmb3IgYSB3ZWlnaHRlZCBzaGFyZSB0b3dhcmQgdGhlIHJpZ2h0IGVuZC5cbiAqXG4gKiBCb3VuZGFyeSBjYXNlcyAodW5pdC10ZXN0ZWQpOiBhbiBlcXVhbCBzcGxpdCAoMC41KSBhbnN3ZXJzIDkwwrAg4oCUXG4gKiBzdHJhaWdodCB1cDsgYWxsLW9uZS13YXkgYW5zd2VycyB0aGUgZXh0cmVtZXMgKDAg4oaSIDDCsCBwb2ludGluZyBsZWZ0LFxuICogMSDihpIgMTgwwrAgcG9pbnRpbmcgcmlnaHQpOyB6ZXJvIGRhdGEgKG51bGwgLyBOYU4pIGFuc3dlcnMgbnVsbCDigJQgdGhlXG4gKiBlbXB0eSBzdGF0ZSwgbmV2ZXIgYSBtaXNsZWFkaW5nIG5ldXRyYWwgYXJyb3cuXG4gKlxuICogT3V0LW9mLXJhbmdlIHNlcnZlciB2YWx1ZXMgYXJlIGNsYW1wZWQgdG8gWzAsIDFdIChkZWZlbmNlIGluIGRlcHRoIOKAlFxuICogdGhlIHNlcnZlciBhbnN3ZXJzIGluLXJhbmdlLCBhIHJvdW5kaW5nIGRyaWZ0IG11c3Qgbm90IHByb2R1Y2UgYVxuICogbmVlZGxlIG91dHNpZGUgdGhlIHNlbWljaXJjbGUpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2F1Z2VBbmdsZShzaGFyZTogbnVtYmVyIHwgbnVsbCk6IG51bWJlciB8IG51bGwge1xuICBpZiAoc2hhcmUgPT09IG51bGwgfHwgTnVtYmVyLmlzTmFOKHNoYXJlKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IGNsYW1wZWQgPSBNYXRoLm1pbigxLCBNYXRoLm1heCgwLCBzaGFyZSkpO1xuICByZXR1cm4gY2xhbXBlZCAqIDE4MDtcbn1cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxTQUNFLGtCQUVBLDJCQUFBQSwwQkFDQSxhQUFBQyxZQUVBLFFBR0EsUUFDQSxpQkFDSztBQUNQLFNBQVMsVUFBVSxlQUFlO0FBQ2xDLFNBQVMsZ0JBQWdCLGtCQUFrQjtBQUMzQyxTQUFTLGFBQWEscUJBQXFCLGtCQUFrQjs7O0FFZDdELFNBQVMseUJBQXlCLFdBQVcsVUFBVSxhQUFh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Q0FBQSxVQUFBLFVBQUEsT0FBQSxZQUFBLEdBQUEsTUFBQSxHQUFBLENBQUEsUUFBQSxVQUFBLEdBQUEsNEJBQUEsR0FBQSxTQUFBLFVBQUEsR0FBQSxDQUFBLEdBQUEsMEJBQUEsYUFBQSxHQUFBLENBQUEsR0FBQSw0QkFBQSxhQUFBLEdBQUEsQ0FBQSxHQUFBLDJCQUFBLGFBQUEsR0FBQSxDQUFBLEdBQUEsZ0JBQUEsR0FBQSxDQUFBLG1CQUFBLHFCQUFBLEdBQUEsZ0JBQUEsR0FBQSxDQUFBLE1BQUEscUJBQUEsR0FBQSxlQUFBLEdBQUEsQ0FBQSxHQUFBLG9CQUFBLEdBQUEsQ0FBQSxtQkFBQSx1QkFBQSxHQUFBLGdCQUFBLEdBQUEsQ0FBQSxNQUFBLHVCQUFBLEdBQUEsZUFBQSxHQUFBLENBQUEsbUJBQUEsMEJBQUEsR0FBQSxnQkFBQSxHQUFBLENBQUEsTUFBQSwwQkFBQSxHQUFBLGVBQUEsR0FBQSxDQUFBLEdBQUEsY0FBQSxHQUFBLENBQUEsR0FBQSxvQkFBQSxHQUFBLENBQUEsR0FBQSxzQkFBQSxHQUFBLENBQUEsR0FBQSxhQUFBLGNBQUEsU0FBQSxhQUFBLEdBQUEsQ0FBQSxHQUFBLGVBQUEsR0FBQSxRQUFBLFlBQUEsR0FBQSxDQUFBLEdBQUEsd0JBQUEsR0FBQSxDQUFBLG1CQUFBLDBCQUFBLEdBQUEsZ0JBQUEsR0FBQSxDQUFBLE1BQUEsMEJBQUEsR0FBQSxlQUFBLEdBQUEsQ0FBQSxHQUFBLGdCQUFBLEdBQUEsQ0FBQSxtQkFBQSxnQkFBQSxHQUFBLGdCQUFBLEdBQUEsQ0FBQSxNQUFBLGdCQUFBLEdBQUEsZUFBQSxHQUFBLENBQUEsR0FBQSxXQUFBLEdBQUEsQ0FBQSxHQUFBLGdCQUFBLEdBQUEsQ0FBQSxHQUFBLGtCQUFBLEdBQUEsQ0FBQSxHQUFBLGtCQUFBLEdBQUEsQ0FBQSxHQUFBLGVBQUEsR0FBQSxDQUFBLEdBQUEsb0JBQUEsR0FBQSxDQUFBLEdBQUEsYUFBQSxHQUFBLENBQUEsUUFBQSxTQUFBLEdBQUEsYUFBQSxHQUFBLENBQUEsUUFBQSxVQUFBLEdBQUEsT0FBQSxZ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Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBQUEsUUFBQSxDQUFBLGltT0FBQSxFQUFBLENBQUE7d0RBcUJhLFNBQU8sRUFBQSxVQUFBLEtBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBO0FBQUEsR0FBQTs7aUZBbkJ4RCxtQkFBaUIsRUFBQSxXQUFBLHFCQUFBLFVBQUEsbURBQUEsWUFBQSxJQUFBLENBQUE7QUFBQSxHQUFBOzs7Ozs7OytEQUFqQixtQkFBaUIsRUFBQSxTQUFBLENBQUFDLEtBQUEsRUFBQSxHQUFBLENBQUEsZ0JBQUEsWUFBQSxTQUFBLHFCQUFBLGlCQUFBLFdBQUEsa0JBQUEsYUFBQSxVQUFBLGVBQUFGLFlBQUFDLHdCQUFBLEdBQUEsYUFBQSxFQUFBLENBQUE7RUFBQTtBQUFBLEdBQUEsT0FBQSxjQUFBLGVBQUEsY0FBQSwwQkFBQSxLQUFBLElBQUEsQ0FBQTtBQUFBLEdBQUEsT0FBQSxjQUFBLGVBQUEsZUFBQSxZQUFBLE9BQUEsWUFBQSxJQUFBLEdBQUEsNEJBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxNQUFBLDBCQUFBLEVBQUEsU0FBQSxDQUFBO0FBQUEsR0FBQTsiLCJuYW1lcyI6WyJDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSIsIkNvbXBvbmVudCIsIkNvbXBvbmVudCIsIkNoYW5nZURldGVjdGlvblN0cmF0ZWd5IiwiaTAiXSwiZGVidWdJZCI6IjM5Yjk4MzBkLTg2ZGUtNTMyZi1iMjM2LWRmNDk1NDRmZTliZiJ9