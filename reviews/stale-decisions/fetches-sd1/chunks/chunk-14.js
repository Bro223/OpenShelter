import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-Q2EZNHWI.js");import {
  TranslatePipe
} from "/chunk-LJMNRHVK.js";

// src/app/shared/list-state.ts
import { ChangeDetectionStrategy, Component, input, output } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var _c0 = (a0, a1) => ({ page: a0, pages: a1 });
function ListState_Conditional_0_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275domElementStart(0, "button", 3);
    i0.\u0275\u0275domListener("click", function ListState_Conditional_0_Conditional_4_Template_button_click_0_listener() {
      i0.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.onGoFirstPage.emit());
    });
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1(" ", i0.\u0275\u0275pipeBind1(2, 1, ctx), " ");
  }
}
function ListState_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275domElementStart(0, "div", 0)(1, "p");
    i0.\u0275\u0275text(2);
    i0.\u0275\u0275pipe(3, "t");
    i0.\u0275\u0275domElementEnd();
    i0.\u0275\u0275conditionalCreate(4, ListState_Conditional_0_Conditional_4_Template, 3, 3, "button", 2);
    i0.\u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind2(3, 2, ctx_r1.messageKey(), i0.\u0275\u0275pureFunction2(5, _c0, ctx_r1.page(), ctx_r1.pages())));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional((tmp_2_0 = ctx_r1.actionKey()) ? 4 : -1, tmp_2_0);
  }
}
function ListState_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275domElementStart(0, "p", 1);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275pipe(2, "t");
    i0.\u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(i0.\u0275\u0275pipeBind1(2, 1, ctx_r1.messageKey()));
  }
}
var ListState = class _ListState {
  /** Which state: the out-of-range notice + action, or the bare empty notice. */
  kind = input.required(
    ...ngDevMode ? [{ debugName: "kind" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The notice copy key (the surface's own key for the state). */
  messageKey = input.required(
    ...ngDevMode ? [{ debugName: "messageKey" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Out-of-range only: the page the URL asked for (the notice's {page}). */
  page = input(
    1,
    ...ngDevMode ? [{ debugName: "page" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Out-of-range only: the real last page (the notice's {pages}). */
  pages = input(
    1,
    ...ngDevMode ? [{ debugName: "pages" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Out-of-range only: the "back to the first page" action's label key;
   *  null renders the notice without the action. */
  actionKey = input(
    null,
    ...ngDevMode ? [{ debugName: "actionKey" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The host's intent: go back to the first page (the host writes the URL). */
  onGoFirstPage = output();
  static \u0275fac = function ListState_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ListState)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _ListState, selectors: [["app-list-state"]], inputs: { kind: [1, "kind"], messageKey: [1, "messageKey"], page: [1, "page"], pages: [1, "pages"], actionKey: [1, "actionKey"] }, outputs: { onGoFirstPage: "onGoFirstPage" }, decls: 2, vars: 1, consts: [["role", "status", 1, "list-state", "list-state--oob"], ["role", "status", 1, "list-state", "list-state--empty"], ["type", "button", 1, "btn", "btn--primary"], ["type", "button", 1, "btn", "btn--primary", 3, "click"]], template: function ListState_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275conditionalCreate(0, ListState_Conditional_0_Template, 5, 8, "div", 0)(1, ListState_Conditional_1_Template, 3, 3, "p", 1);
    }
    if (rf & 2) {
      i0.\u0275\u0275conditional(ctx.kind() === "out-of-range" ? 0 : 1);
    }
  }, dependencies: [TranslatePipe], styles: ['@charset "UTF-8";\n\n\n.list-state--oob[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  gap: var(--%NS%space-12);\n  color: var(--%NS%color-muted);\n}\n.list-state--oob[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n}\n.list-state--empty[_ngcontent-%COMP%] {\n  color: var(--%NS%color-muted);\n  margin: 0;\n}\n[_nghost-%COMP%] {\n  display: block;\n}\n/*# sourceMappingURL=list-state.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(ListState, [{
    type: Component,
    args: [{ selector: "app-list-state", imports: [TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `@if (kind() === 'out-of-range') {
  <!-- The honest out-of-range state: the URL asks for a page past the end
       of a NON-EMPTY scope \u2014 an explicit translated notice + first-page
       action, never a bare empty list. -->
  <div class="list-state list-state--oob" role="status">
    <p>{{ messageKey() | t: { page: page(), pages: pages() } }}</p>
    @if (actionKey(); as key) {
      <button type="button" class="btn btn--primary" (click)="onGoFirstPage.emit()">
        {{ key | t }}
      </button>
    }
  </div>
} @else {
  <!-- The empty state: the scope is truly empty \u2014 the notice only, no
       action (there is no first page to return to). -->
  <p class="list-state list-state--empty" role="status">{{ messageKey() | t }}</p>
}
`, styles: ['@charset "UTF-8";\n\n/* src/app/shared/list-state.scss */\n.list-state--oob {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  gap: var(--space-12);\n  color: var(--color-muted);\n}\n.list-state--oob p {\n  margin: 0;\n}\n.list-state--empty {\n  color: var(--color-muted);\n  margin: 0;\n}\n:host {\n  display: block;\n}\n/*# sourceMappingURL=list-state.css.map */\n'] }]
  }], null, { kind: [{ type: i0.Input, args: [{ isSignal: true, alias: "kind", required: true }] }], messageKey: [{ type: i0.Input, args: [{ isSignal: true, alias: "messageKey", required: true }] }], page: [{ type: i0.Input, args: [{ isSignal: true, alias: "page", required: false }] }], pages: [{ type: i0.Input, args: [{ isSignal: true, alias: "pages", required: false }] }], actionKey: [{ type: i0.Input, args: [{ isSignal: true, alias: "actionKey", required: false }] }], onGoFirstPage: [{ type: i0.Output, args: ["onGoFirstPage"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(ListState, { className: "ListState", filePath: "src/app/shared/list-state.ts", lineNumber: 35 });
})();
(() => {
  const id = "src%2Fapp%2Fshared%2Flist-state.ts%40ListState";
  function ListState_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(ListState, m.default, [i0], [TranslatePipe, Component, ChangeDetectionStrategy], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && ListState_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && ListState_HmrLoad(d.timestamp)));
})();

export {
  ListState
};
//# debugId=66d210f2-470d-5202-948f-9b53fd53f0cf


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvc2hhcmVkL2xpc3Qtc3RhdGUudHMiLCJzcmMvYXBwL3NoYXJlZC9saXN0LXN0YXRlLmh0bWwiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksIENvbXBvbmVudCwgaW5wdXQsIG91dHB1dCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgVHJhbnNsYXRlUGlwZSB9IGZyb20gJy4uL2NvcmUvaTE4bi90cmFuc2xhdGUtcGlwZSc7XG5pbXBvcnQgdHlwZSB7IE1lc3NhZ2VLZXkgfSBmcm9tICcuLi9jb3JlL2kxOG4vbWVzc2FnZXMnO1xuXG4vKipcbiAqIFRoZSBwYWdlZCBsaXN0J3MgdHdvIEhPTkVTVCBlbXB0eS1pc2ggc3RhdGVzLCBpbiBvbmUgY29tcG9uZW50OlxuICpcbiAqICAtIGBvdXQtb2YtcmFuZ2VgIOKAlCB0aGUgVVJMIGFza3MgZm9yIGEgcGFnZSBQQVNUIFRIRSBFTkQgb2YgYSBOT04tRU1QVFlcbiAqICAgIHNjb3BlIChhIGhhbmQtdHlwZWQgbnVtYmVyLCBhIHN0YWxlIHNoYXJlZCBsaW5rLCBhIGxvY2FsZSBzd2l0Y2ggdGhhdFxuICogICAgc2hyYW5rIHRoZSBzY29wZSkuIFJlbmRlcmVkIGFzIGFuIGV4cGxpY2l0IHRyYW5zbGF0ZWQgbm90aWNlIHdpdGggYVxuICogICAgXCJiYWNrIHRvIHRoZSBmaXJzdCBwYWdlXCIgYWN0aW9uIOKAlCBuZXZlciBhIGJhcmUgZW1wdHkgbGlzdC5cbiAqICAtIGBlbXB0eWAg4oCUIHRoZSBzY29wZSBpcyB0cnVseSBlbXB0eS4gUmVuZGVyZWQgYXMgdGhlIG5vdGljZSBvbmx5IChub1xuICogICAgYWN0aW9uIOKAlCB0aGVyZSBpcyBubyBmaXJzdCBwYWdlIHRvIHJldHVybiB0bykuXG4gKlxuICogPHA+UHJlc2VudGF0aW9uIG9ubHksIGluIHRoZSBQYWdpbmF0aW9uIGNvbnRyb2wncyBjb250cmFjdDogdGhlIGNvbXBvbmVudFxuICogb3ducyBOTyBVUkwuIFRoZSBob3N0IGRlY2lkZXMgdGhlIHN0YXRlIChpdCBrbm93cyB0aGUgdG90YWwpIGFuZCByZWNlaXZlc1xuICogdGhlIGludGVudCB0aHJvdWdoIHtAbGluayBvbkdvRmlyc3RQYWdlfSDigJQgdGhlIGhvc3Qgd3JpdGVzIHRoZSBVUkwgKGFcbiAqIHBhZ2UtbGV2ZWwgcm91dGUgb24gdGhlIHB1YmxpYyBzdXJmYWNlcywgYSB0YWItbmFtZXNwYWNlZCBxdWVyeSBwYXJhbSBpblxuICogYW4gYWRtaW4gdGFiIHBhbmVsOiB0aGUgY29tcG9uZW50IGNhcnJpZXMgbm8gcm91dGUsIG5vIHJvdXRlciBhbmQgbm8gdGFiXG4gKiBrbm93bGVkZ2UsIHNvIGl0IHJlbmRlcnMgaW5zaWRlIGFueSBjb250YWluZXIsIHRhYiBwYW5lbCBpbmNsdWRlZCkuXG4gKlxuICogPHA+Q29weSBzdGF5cyBwZXItc3VyZmFjZTogdGhlIGhvc3QgcGFzc2VzIGl0cyBvd24ge0BsaW5rIE1lc3NhZ2VLZXl9c1xuICogKHRoZSBzdXJmYWNlcyBrZWVwIGRpc3RpbmN0IHdvcmRpbmcgZm9yIHRoZSBzYW1lIHN0YXRlIOKAlCBcInRoZSBpbmRleCBlbmRzXG4gKiBhdCBwYWdlIE5cIiB2cyBcInRoZSBsaXN0IGVuZHMgYXQgcGFnZSBOXCIg4oCUIGFuZCBkaXN0aW5jdCBhY3Rpb24gbGFiZWxzKS5cbiAqL1xuZXhwb3J0IHR5cGUgTGlzdFN0YXRlS2luZCA9ICdvdXQtb2YtcmFuZ2UnIHwgJ2VtcHR5JztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYXBwLWxpc3Qtc3RhdGUnLFxuICBpbXBvcnRzOiBbVHJhbnNsYXRlUGlwZV0sXG4gIHRlbXBsYXRlVXJsOiAnLi9saXN0LXN0YXRlLmh0bWwnLFxuICBzdHlsZVVybDogJy4vbGlzdC1zdGF0ZS5zY3NzJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIExpc3RTdGF0ZSB7XG4gIC8qKiBXaGljaCBzdGF0ZTogdGhlIG91dC1vZi1yYW5nZSBub3RpY2UgKyBhY3Rpb24sIG9yIHRoZSBiYXJlIGVtcHR5IG5vdGljZS4gKi9cbiAgcmVhZG9ubHkga2luZCA9IGlucHV0LnJlcXVpcmVkPExpc3RTdGF0ZUtpbmQ+KCk7XG4gIC8qKiBUaGUgbm90aWNlIGNvcHkga2V5ICh0aGUgc3VyZmFjZSdzIG93biBrZXkgZm9yIHRoZSBzdGF0ZSkuICovXG4gIHJlYWRvbmx5IG1lc3NhZ2VLZXkgPSBpbnB1dC5yZXF1aXJlZDxNZXNzYWdlS2V5PigpO1xuICAvKiogT3V0LW9mLXJhbmdlIG9ubHk6IHRoZSBwYWdlIHRoZSBVUkwgYXNrZWQgZm9yICh0aGUgbm90aWNlJ3Mge3BhZ2V9KS4gKi9cbiAgcmVhZG9ubHkgcGFnZSA9IGlucHV0KDEpO1xuICAvKiogT3V0LW9mLXJhbmdlIG9ubHk6IHRoZSByZWFsIGxhc3QgcGFnZSAodGhlIG5vdGljZSdzIHtwYWdlc30pLiAqL1xuICByZWFkb25seSBwYWdlcyA9IGlucHV0KDEpO1xuICAvKiogT3V0LW9mLXJhbmdlIG9ubHk6IHRoZSBcImJhY2sgdG8gdGhlIGZpcnN0IHBhZ2VcIiBhY3Rpb24ncyBsYWJlbCBrZXk7XG4gICAqICBudWxsIHJlbmRlcnMgdGhlIG5vdGljZSB3aXRob3V0IHRoZSBhY3Rpb24uICovXG4gIHJlYWRvbmx5IGFjdGlvbktleSA9IGlucHV0PE1lc3NhZ2VLZXkgfCBudWxsPihudWxsKTtcbiAgLyoqIFRoZSBob3N0J3MgaW50ZW50OiBnbyBiYWNrIHRvIHRoZSBmaXJzdCBwYWdlICh0aGUgaG9zdCB3cml0ZXMgdGhlIFVSTCkuICovXG4gIHJlYWRvbmx5IG9uR29GaXJzdFBhZ2UgPSBvdXRwdXQ8dm9pZD4oKTtcbn1cbiIsIkBpZiAoa2luZCgpID09PSAnb3V0LW9mLXJhbmdlJykge1xuICA8IS0tIFRoZSBob25lc3Qgb3V0LW9mLXJhbmdlIHN0YXRlOiB0aGUgVVJMIGFza3MgZm9yIGEgcGFnZSBwYXN0IHRoZSBlbmRcbiAgICAgICBvZiBhIE5PTi1FTVBUWSBzY29wZSDigJQgYW4gZXhwbGljaXQgdHJhbnNsYXRlZCBub3RpY2UgKyBmaXJzdC1wYWdlXG4gICAgICAgYWN0aW9uLCBuZXZlciBhIGJhcmUgZW1wdHkgbGlzdC4gLS0+XG4gIDxkaXYgY2xhc3M9XCJsaXN0LXN0YXRlIGxpc3Qtc3RhdGUtLW9vYlwiIHJvbGU9XCJzdGF0dXNcIj5cbiAgICA8cD57eyBtZXNzYWdlS2V5KCkgfCB0OiB7IHBhZ2U6IHBhZ2UoKSwgcGFnZXM6IHBhZ2VzKCkgfSB9fTwvcD5cbiAgICBAaWYgKGFjdGlvbktleSgpOyBhcyBrZXkpIHtcbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi0tcHJpbWFyeVwiIChjbGljayk9XCJvbkdvRmlyc3RQYWdlLmVtaXQoKVwiPlxuICAgICAgICB7eyBrZXkgfCB0IH19XG4gICAgICA8L2J1dHRvbj5cbiAgICB9XG4gIDwvZGl2PlxufSBAZWxzZSB7XG4gIDwhLS0gVGhlIGVtcHR5IHN0YXRlOiB0aGUgc2NvcGUgaXMgdHJ1bHkgZW1wdHkg4oCUIHRoZSBub3RpY2Ugb25seSwgbm9cbiAgICAgICBhY3Rpb24gKHRoZXJlIGlzIG5vIGZpcnN0IHBhZ2UgdG8gcmV0dXJuIHRvKS4gLS0+XG4gIDxwIGNsYXNzPVwibGlzdC1zdGF0ZSBsaXN0LXN0YXRlLS1lbXB0eVwiIHJvbGU9XCJzdGF0dXNcIj57eyBtZXNzYWdlS2V5KCkgfCB0IH19PC9wPlxufVxuIl0sIm1hcHBpbmdzIjoiOzs7OztBQUFBLFNBQVMseUJBQXlCLFdBQVcsT0FBTyxjQUFjOzs7Ozs7QUNPNUQsSUFBQSwrQkFBQSxHQUFBLFVBQUEsQ0FBQTtBQUErQyxJQUFBLDJCQUFBLFNBQUEsU0FBQSx5RUFBQTtBQUFBLE1BQUEsMkJBQUEsR0FBQTtBQUFBLFlBQUEsU0FBQSwyQkFBQSxDQUFBO0FBQUEsYUFBQSx5QkFBUyxPQUFBLGNBQUEsS0FBQSxDQUFvQjtJQUFBLENBQUE7QUFD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