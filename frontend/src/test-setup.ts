/**
 * Vitest spec bootstrap (referenced from angular.json -> test -> setupFiles).
 *
 * The Angular + vitest jsdom pipeline does not reliably expose `localStorage`
 * on the test global (observed as `undefined` across workers even though the
 * underlying jsdom window has it). TokenStore/AuthStore tests need web
 * storage, so install a tiny spec-only in-memory Storage on the global.
 *
 * This file is NEVER bundled into the app — it only runs for `ng test`.
 */

// i18n-et-en: MIRROR of main.ts — the specs that exercise the Estonian and
// Russian UI render the `date` pipe with locale 'et'/'ru', but the test
// bootstrap never runs main.ts, so the locale data (which DatePipe requires)
// is registered here instead.
import { registerLocaleData } from '@angular/common';
import etLocale from '@angular/common/locales/et';
import ruLocale from '@angular/common/locales/ru';

registerLocaleData(etLocale);
registerLocaleData(ruLocale);


function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

Object.defineProperty(globalThis, 'localStorage', {
  value: createMemoryStorage(),
  configurable: true,
  writable: true,
});

/**
 * jsdom implements no CSS layout: `Range` lacks `getBoundingClientRect`/
 * `getClientRects` entirely (Element's exists and reports zeros). Quill 2's
 * `setSelection()` calls `scrollSelectionIntoView` → `getBounds`, which reads
 * the selection's rect — so the specs shim a zero rect, the standard jsdom
 * treatment for layout-dependent code. Test environment only; real browsers
 * have real layout.
 */
function zeroRect(): DOMRect {
  return {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}
if (typeof Range !== 'undefined' && Range.prototype.getBoundingClientRect === undefined) {
  Range.prototype.getBoundingClientRect = zeroRect;
  // SAFETY: jsdom's Range lacks getClientRects; the spec code under test
  // (Quill's getBounds) only ever calls getBoundingClientRect, so an
  // empty list shape is all any consumer needs.
  Range.prototype.getClientRects = () =>
    ({
      length: 0,
      item: () => null,
      [Symbol.iterator]: function* () {},
    }) as unknown as ReturnType<Range['getClientRects']>;
}
