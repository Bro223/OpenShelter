/**
 * The supported UI locales (i18n-et-en — the whitepaper's
 * "Internationalization — Estonian first, then EN/RUS/UA" item). `en` is
 * the original copy language and the default; `et` is Estonian; `ru` is
 * Russian (the whitepaper's RUS). Adding a locale = one entry here + one
 * catalog file + a `LOCALES` mention in the switcher (which renders from
 * this list).
 */
export type Locale = 'en' | 'et' | 'ru';

/** Every supported locale — the language switcher renders from this list. */
export const LOCALES: readonly Locale[] = ['en', 'et', 'ru'];

/**
 * The short month names of each locale (locale DATA, not copy): the
 * concrete-date fallback of the verification stamp (shelter-copy's
 * verifiedAgoText) formats "12 Sep 2026" by hand with these names —
 * deterministic across Node ICU versions and user time zones (UTC-based),
 * the same reason the EN set was hand-rolled. The `{month}` param of
 * `shelter.recency.date` is filled from here by the caller.
 */
export const MONTH_ABBREVS: Record<Locale, readonly string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  et: ['jaan', 'veebr', 'märts', 'apr', 'mai', 'juuni', 'juuli', 'aug', 'sept', 'okt', 'nov', 'dets'],
  ru: ['янв', 'февр', 'март', 'апр', 'мая', 'июн', 'июл', 'авг', 'сент', 'окт', 'нояб', 'дек'],
};
