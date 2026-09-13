import type { Messages } from './messages';

/**
 * The English catalog (i18n-et-en M14 slice 1) — the original copy,
 * verbatim: the EN strings ARE the current committed copy, so a user who
 * stays on the default locale sees exactly what the app showed before
 * i18n. Where the old templates spliced copy around markup (footer links),
 * the sentence is segmented into keys with the same rendered result.
 */
export const EN: Messages = {
  'menu.aria': 'Menu',
  'nav.map': 'Shelter map',
  'nav.account': 'Account',
  'nav.admin': 'Admin',

  'theme.toggle': 'High contrast',
  'lang.label': 'Language',
  'auth.logout': 'Log out',
  'auth.login': 'Log in',
  'auth.register': 'Create account',

  'footer.notice1':
    'OpenShelter is a community-maintained list, not an official emergency service.',
  'footer.notice2': 'In an emergency, call 112.',
  'footer.notice3': 'Official shelter information:',
  'footer.rescueBoard': 'Rescue Board',
  'footer.and': 'and',
  'footer.maaAmet': 'Maa-amet',
  'footer.privacy': 'Privacy policy',
  'footer.terms': 'Terms of use',
  'footer.dataSource': 'Shelter data',
  'footer.lastImport': 'last import',
  'footer.officialOpenData': 'official open data',

  'title.map': 'Shelter map',
  'title.login': 'Log in',
  'title.register': 'Create account',
  'title.reset': 'Reset password',
  'title.verify': 'Verify account',
  'title.account': 'Account',
  'title.privacy': 'Privacy policy',
  'title.terms': 'Terms of use',
  'title.shelterDetail': 'Shelter detail',
  'title.submit': 'Submit a shelter',
  'title.admin': 'Admin',
};
