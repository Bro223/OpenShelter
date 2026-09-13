import type { Messages } from './messages';

/**
 * The Estonian catalog (i18n-et-en M14 slice 1). The app's official data is
 * Estonian (Päästeamet registry, Maa-amet) and the whitepaper's
 * internationalization item reads "Estonian first" — this catalog is the
 * other half of the chrome. Brand name (OpenShelter) and the official
 * agency names (Päästeamet, Maa-amet) are proper nouns and stay as-is.
 */
export const ET: Messages = {
  'menu.aria': 'Menüü',
  'nav.map': 'Varjupaikade kaart',
  'nav.account': 'Konto',
  'nav.admin': 'Admin',

  'theme.toggle': 'Kõrge kontrast',
  'lang.label': 'Keel',
  'auth.logout': 'Logi välja',
  'auth.login': 'Logi sisse',
  'auth.register': 'Loo konto',

  'footer.notice1':
    'OpenShelter on kogukonna poolt hooldatud nimekiri, mitte ametlik hädaabiteenus.',
  'footer.notice2': 'Hädaolukorras helista 112.',
  'footer.notice3': 'Ametlik teave varjupaikade kohta:',
  'footer.rescueBoard': 'Päästeamet',
  'footer.and': 'ja',
  'footer.maaAmet': 'Maa-amet',
  'footer.privacy': 'Privaatsuspoliitika',
  'footer.terms': 'Kasutustingimused',
  'footer.dataSource': 'Varjupaikade andmed',
  'footer.lastImport': 'viimane import',
  'footer.officialOpenData': 'ametlikud avandmed',

  'title.map': 'Varjupaikade kaart',
  'title.login': 'Sisse logimine',
  'title.register': 'Konto loomine',
  'title.reset': 'Parooli lähtestamine',
  'title.verify': 'Konto kinnitamine',
  'title.account': 'Konto',
  'title.privacy': 'Privaatsuspoliitika',
  'title.terms': 'Kasutustingimused',
  'title.shelterDetail': 'Varjupaiga detailid',
  'title.submit': 'Varjupaiga lisamine',
  'title.admin': 'Admin',
};
