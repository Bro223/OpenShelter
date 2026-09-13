/**
 * The supported UI locales (i18n-et-en, roadmap M14 — the whitepaper's
 * "Internationalization — Estonian first, then EN/RUS/UA" item). `en` is
 * the original copy language and the default; `et` is Estonian. Adding a
 * locale = one entry here + one catalog file + a `LOCALES` mention in the
 * switcher (which renders from this list).
 */
export type Locale = 'en' | 'et';

/** Every supported locale — the language switcher renders from this list. */
export const LOCALES: readonly Locale[] = ['en', 'et'];
