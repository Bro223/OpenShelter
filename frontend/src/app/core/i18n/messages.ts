/**
 * The message catalog contract (i18n-et-en M14 slice 1). Both locale
 * catalogs (`en.ts` / `et.ts`) are typed against this interface, so a key
 * missing from EITHER side is a compile error; the runtime key-parity
 * guard in `i18n.spec.ts` is the backstop (and rejects empty values).
 *
 * Key namespaces: `nav.*` header nav, `auth.*` session controls,
 * `footer.*` the app-wide footer, `title.*` route titles (consumed by
 * titleGuard via route data), the rest single chrome strings. Slice 2+ of
 * M14 extends this interface with the feature-page copy (shelter trust
 * copy, forms, errors).
 */
export interface Messages {
  // --- header: burger + nav
  /** Burger button aria-label. */
  'menu.aria': string;
  'nav.map': string;
  'nav.account': string;
  'nav.admin': string;

  // --- header: actions
  'theme.toggle': string;
  /** Language switcher group aria-label. */
  'lang.label': string;
  'auth.logout': string;
  'auth.login': string;
  'auth.register': string;

  // --- footer: safety notice (segmented around the official-source links)
  'footer.notice1': string;
  'footer.notice2': string;
  'footer.notice3': string;
  /** Link label → www.päästeamet.ee. */
  'footer.rescueBoard': string;
  'footer.and': string;
  /** Link label → www.maaamet.ee. */
  'footer.maaAmet': string;
  // --- footer: legal links
  'footer.privacy': string;
  'footer.terms': string;
  // --- footer: data provenance line (official-dataset-csv M5)
  'footer.dataSource': string;
  'footer.lastImport': string;
  'footer.officialOpenData': string;

  // --- route titles (app.routes.ts data.title → titleGuard)
  'title.map': string;
  'title.login': string;
  'title.register': string;
  'title.reset': string;
  'title.verify': string;
  'title.account': string;
  'title.privacy': string;
  'title.terms': string;
  'title.shelterDetail': string;
  'title.submit': string;
  'title.admin': string;
}

/** A catalog key — templates/guards pass these to `t()` / the `t` pipe. */
export type MessageKey = keyof Messages;
