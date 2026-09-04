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
