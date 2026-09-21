import { EN } from './en';
import { ET } from './et';
import { RU } from './ru';
import type { MessageKey, Messages } from './messages';

/**
 * i18n-et-en DURABLE GUARD (catalog identity): an ET or RU value that is
 * BYTE-IDENTICAL to the EN value for the same key is almost certainly an
 * untranslated string that was copied instead of translated. The catalog
 * key-parity guard in i18n.spec.ts only proves the key EXISTS in each
 * locale — it cannot see that the Estonian "translation" of `nav.admin` was
 * the English word "Admin" (or that an email example was shipped in all
 * three languages because nobody thought about it). This spec is the
 * mechanical backstop for that failure class: it fails the build the moment
 * a locale value stops differing from EN, unless the key is on the
 * documented allow-list below.
 *
 * Companion guard: the app-wide template guard
 * (core/i18n/i18n-template-guard.spec.ts) catches the sibling failure
 * class — user-visible text hardcoded in a template outside `| t` (text
 * nodes, literal attributes and interpolation literals, every template).
 */

/**
 * Allow-list: values that are LEGITIMATELY byte-identical to EN.
 * Keep this list short; every entry needs a justification here, because the
 * list is exactly where an untranslated string hides when it is "allowed".
 * Proper nouns (OpenShelter, Päästeamet, Apple Maps) and acronyms
 * (EE-ALARM, EPSG, WGS84, DMS) are fine INSIDE longer translated strings —
 * only whole values that equal EN need an entry.
 */
const IDENTICAL_TO_EN_OK: Partial<Record<MessageKey, string>> = {
  // Punctuation-only splice segment ("…you agree to the [terms] and the
  // [privacy] .") — a period is a period in every supported locale.
  'authPage.register.agreeTail': '.',
  // Email-address examples are ASCII by convention (RFC 5321); translating
  // the local part would produce addresses that do not exist.
  'authPage.register.emailPlaceholder': 'you@example.ee',
  'authPage.reset.emailPlaceholder': 'you@example.ee',
  // The account page's new-email example — same ASCII-address rationale.
  'account.newEmailPlaceholder': 'new@example.ee',
  // Punctuation-only splice segments (the done-line/ legal-line end with a
  // bare period in every supported locale) — same rationale as agreeTail.
  'account.phoneDone.after': '.',
  'account.legal.tail': '.',
  // Legal pages (legal-i18n M4): punctuation-only splice tails. A semicolon
  // or a period is a semicolon/period in every supported locale; the
  // translated sentence around them carries the language.
  'legal.privacy.collect.li1.after': ';',  'legal.privacy.collect.li2.after': ';',
  'legal.privacy.collect.li3.after': ';',
  'legal.privacy.collect.p2.after': '.',
  'legal.privacy.rights.li1.after': '.',
  'legal.privacy.contact.p1.after': '.',
  // Proper noun as a WHOLE value (the emphasized service name); it is not
  // translated in any locale.
  'legal.privacy.thirdParties.li3.strong': 'OpenStreetMap',
  // Service BRAND NAMES as whole values: the two directions-link visible
  // labels are the brand only in every locale (owner: short labels), so
  // ET/RU are legitimately identical to EN. The meaningful accessible
  // names live in the translated detail.*Aria keys.
  'detail.navigate': 'Google Maps',
  'detail.appleMaps': 'Apple Maps',
  // The env-var name is code, not copy (quoted from the backend config).
  'legal.privacy.retention.p3.code': 'RETENTION_ENABLED',
  // The concrete-date skeleton of the verification stamp: RU keeps EN's
  // "{day} {month} {year}" word order — the {month} PARAM carries the
  // Russian month name (locale data, locale.ts), so the rendered date is
  // localized even though the template is not. (ET adds the day dot: "12. sept 2026".)
  'shelter.recency.date': '{day} {month} {year}',
  // The emergency number — a literal in every locale.
  'legal.terms.emergencyNumber': '112',
  // Punctuation-only splice tail after the "call 112" sentence — the
  // period is a period in every supported locale.
  'legal.terms.emergency.p1.after': '.',
  // Terms contact/third-party sentence tails — punctuation only, same
  // rationale as the privacy splice tails above.
  'legal.terms.thirdParty.p1.after': '.',
  'legal.terms.contact.p1.after': '.',
  // Column header: "E-mail" is the established Russian spelling (the loan
  // word is written exactly this way in RU); ET localizes it to "E-post".
  'admin.users.col.email': 'E-mail',
};

function identicalToEn(catalog: Messages, locale: string): string[] {
  const violations: string[] = [];
  for (const [key, value] of Object.entries(catalog)) {
    const en = EN[key as MessageKey];
    if (value === en && !(key as MessageKey in IDENTICAL_TO_EN_OK)) {
      violations.push(`${locale}[${JSON.stringify(key)}] = ${JSON.stringify(value)}`);
    }
  }
  return violations;
}

describe('catalog identity guard (ET/RU must not ship the EN value)', () => {
  it('ET: no value is byte-identical to EN (except the allow-list)', () => {
    expect(identicalToEn(ET, 'ET')).toEqual([]);
  });

  it('RU: no value is byte-identical to EN (except the allow-list)', () => {
    expect(identicalToEn(RU, 'RU')).toEqual([]);
  });

  it('every allow-list entry is a real key and still active (no stale entries)', () => {
    // A stale allow-list entry would silently stop guarding a key that was
    // since translated (or a key that was removed) — catch both. An entry
    // is ACTIVE while it justifies an identical value in AT LEAST ONE
    // locale (e.g. the email examples: ET localizes them, RU keeps the
    // ASCII address); a key identical in BOTH locales is also active.
    for (const key of Object.keys(IDENTICAL_TO_EN_OK) as MessageKey[]) {
      const en = EN[key];
      expect(en !== undefined, `allow-list key ${key} no longer exists in EN`).toBe(true);
      expect(
        ET[key] === en || RU[key] === en,
        `allow-list entry ${key} is identical in neither locale — remove it`,
      ).toBe(true);
    }
  });
});
