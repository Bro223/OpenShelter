import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-Y3BTRGLF.js");// src/app/shared/loading-indicator.ts
import { ChangeDetectionStrategy, Component, input } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var LoadingIndicator = class _LoadingIndicator {
  /** The visible loading copy (e.g. "Loading shelters…"). */
  message = input(
    "Loading\u2026",
    ...ngDevMode ? [{ debugName: "message" }] : (
      /* istanbul ignore next */
      []
    )
  );
  static \u0275fac = function LoadingIndicator_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LoadingIndicator)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _LoadingIndicator, selectors: [["app-loading-indicator"]], inputs: { message: [1, "message"] }, decls: 2, vars: 1, consts: [["role", "status", 1, "loading-indicator"]], template: function LoadingIndicator_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275domElementStart(0, "p", 0);
      i0.\u0275\u0275text(1);
      i0.\u0275\u0275domElementEnd();
    }
    if (rf & 2) {
      i0.\u0275\u0275advance();
      i0.\u0275\u0275textInterpolate(ctx.message());
    }
  }, styles: ['@charset "UTF-8";\n\n\n[_nghost-%COMP%] {\n  display: block;\n}\n.loading-indicator[_ngcontent-%COMP%] {\n  margin: 0;\n}\n/*# sourceMappingURL=loading-indicator.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(LoadingIndicator, [{
    type: Component,
    args: [{ selector: "app-loading-indicator", imports: [], changeDetection: ChangeDetectionStrategy.OnPush, template: '<p class="loading-indicator" role="status">{{ message() }}</p>\n', styles: ['@charset "UTF-8";\n\n/* src/app/shared/loading-indicator.scss */\n:host {\n  display: block;\n}\n.loading-indicator {\n  margin: 0;\n}\n/*# sourceMappingURL=loading-indicator.css.map */\n'] }]
  }], null, { message: [{ type: i0.Input, args: [{ isSignal: true, alias: "message", required: false }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(LoadingIndicator, { className: "LoadingIndicator", filePath: "src/app/shared/loading-indicator.ts", lineNumber: 17 });
})();
(() => {
  const id = "src%2Fapp%2Fshared%2Floading-indicator.ts%40LoadingIndicator";
  function LoadingIndicator_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(LoadingIndicator, m.default, [i0], [Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && LoadingIndicator_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && LoadingIndicator_HmrLoad(d.timestamp)));
})();

export {
  LoadingIndicator
};
//# debugId=2a7c8a95-5b9f-5b11-a8c5-678d764a36a6


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvc2hhcmVkL2xvYWRpbmctaW5kaWNhdG9yLnRzIiwic3JjL2FwcC9zaGFyZWQvbG9hZGluZy1pbmRpY2F0b3IuaHRtbCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgQ29tcG9uZW50LCBpbnB1dCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG4vKipcbiAqIFRoZSBzaGFyZWQgbG9hZGluZyBpbmRpY2F0b3IgKDAxIHB1bWwsIHNoYXJlZC8g4oCUIHRoZSBhcmNoaXRlY3R1cmUgZG9jJ3NcbiAqIGBMb2FkaW5nSW5kaWNhdG9yYCk6IE9ORSBgPHAgcm9sZT1cInN0YXR1c1wiPmAgZm9yIGV2ZXJ5IHBhZ2UncyBsb2FkaW5nXG4gKiBzdGF0ZSwgaW5zdGVhZCBvZiB0aGF0IG1hcmt1cCBoYW5kLXJvbGxlZCBwZXIgcGFnZS4gVGhlIGNvbnN1bWluZyBwYWdlXG4gKiBzdHlsZXMgaXQgd2l0aCBpdHMgb3duIHN0YXRlIGNsYXNzIG9uIHRoZSBob3N0IGVsZW1lbnQgKHNpZGViYXItc3RhdGUgL1xuICogZGV0YWlsLXN0YXRlIC8gY29udHJpYnV0aW9ucy1zdGF0ZSkuXG4gKi9cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FwcC1sb2FkaW5nLWluZGljYXRvcicsXG4gIGltcG9ydHM6IFtdLFxuICB0ZW1wbGF0ZVVybDogJy4vbG9hZGluZy1pbmRpY2F0b3IuaHRtbCcsXG4gIHN0eWxlVXJsOiAnLi9sb2FkaW5nLWluZGljYXRvci5zY3NzJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIExvYWRpbmdJbmRpY2F0b3Ige1xuICAvKiogVGhlIHZpc2libGUgbG9hZGluZyBjb3B5IChlLmcuIFwiTG9hZGluZyBzaGVsdGVyc+KAplwiKS4gKi9cbiAgcmVhZG9ubHkgbWVzc2FnZSA9IGlucHV0PHN0cmluZz4oJ0xvYWRpbmfigKYnKTtcbn1cbiIsIjxwIGNsYXNzPVwibG9hZGluZy1pbmRpY2F0b3JcIiByb2xlPVwic3RhdHVzXCI+e3sgbWVzc2FnZSgpIH19PC9wPlxuIl0sIm1hcHBpbmdzIjoiO0FBQUEsU0FBUyx5QkFBeUIsV0FBVyxhQUFhOztBQWdCcEQsSUFBTyxtQkFBUCxNQUFPLGtCQUFnQjs7RUFFbEIsVUFBVTtJQUFjOzs7Ozs7O3FDQUZ0QixtQkFBZ0I7RUFBQTs0RUFBaEIsbUJBQWdCLFdBQUEsQ0FBQSxDQUFBLHVCQUFBLENBQUEsR0FBQSxRQUFBLEVBQUEsU0FBQSxDQUFBLEdBQUEsU0FBQSxFQUFBLEdBQUEsT0FBQSxHQUFBLE1BQUEsR0FBQSxRQUFBLENBQUEsQ0FBQSxRQUFBLFVBQUEsR0FBQSxtQkFBQSxDQUFBLEdBQUEsVUFBQSxTQUFBLDBCQUFBLElBQUEsS0FBQTtBQUFBLFFBQUEsS0FBQSxHQUFBO0FDaEI3QixNQUFBLCtCQUFBLEdBQUEsS0FBQSxDQUFBO0FBQTJDLE1BQUEsb0JBQUEsQ0FBQTtBQUFlLE1BQUEsNkJBQUE7OztBQUFmLE1BQUEsdUJBQUE7QUFBQSxNQUFBLCtCQUFBLElBQUEsUUFBQSxDQUFBOzs7OzsrRURnQjlCLGtCQUFnQixDQUFBO1VBUDVCO3VCQUNXLHlCQUF1QixTQUN4QixDQUFBLEdBQUUsaUJBR00sd0JBQXdCLFFBQU0sVUFBQSxvRUFBQSxRQUFBLENBQUEsNkxBQUEsRUFBQSxDQUFBOzs7O2dGQUVwQyxrQkFBZ0IsRUFBQSxXQUFBLG9CQUFBLFVBQUEsdUNBQUEsWUFBQSxHQUFBLENBQUE7QUFBQSxHQUFBOzs7Ozs7OzhEQUFoQixrQkFBZ0IsRUFBQSxTQUFBLENBQUEsRUFBQSxHQUFBLENBQUEsV0FBQSx1QkFBQSxHQUFBLGFBQUEsRUFBQSxDQUFBO0VBQUE7QUFBQSxHQUFBLE9BQUEsY0FBQSxlQUFBLGNBQUEseUJBQUEsS0FBQSxJQUFBLENBQUE7QUFBQSxHQUFBLE9BQUEsY0FBQSxlQUFBLGVBQUEsWUFBQSxPQUFBLFlBQUEsSUFBQSxHQUFBLDRCQUFBLENBQUEsTUFBQSxFQUFBLE9BQUEsTUFBQSx5QkFBQSxFQUFBLFNBQUEsQ0FBQTtBQUFBLEdBQUE7IiwibmFtZXMiOltdLCJkZWJ1Z0lkIjoiMmE3YzhhOTUtNWI5Zi01YjExLWE4YzUtNjc4ZDc2NGEzNmE2In0=