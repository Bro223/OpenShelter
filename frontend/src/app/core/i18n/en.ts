import type { Messages } from './messages';

/**
 * The English catalog (i18n-et-en) — the reference copy, verbatim: the EN
 * strings ARE the committed copy, so a user on the default locale sees
 * exactly what the app renders. Where a template spliced copy around markup
 * (footer links), the sentence is segmented into keys with the same rendered
 * result.
 */
export const EN: Messages = {
  'menu.aria': 'Menu',
  'nav.map': 'Shelter map',
  'nav.guidance': 'Guidance',
  'nav.account': 'Account',
  'nav.admin': 'Admin',
  'nav.skip': 'Skip to content',
  'nav.primaryAria': 'Primary',

  'a11y.button': 'Accessibility',
  'lang.label': 'Language',
  'auth.logout': 'Log out',
  'auth.login': 'Log in',
  'auth.register': 'Create account',

  // --- accessibility dialog (the three contrast options). Shipped defaults
  // — every string below is admin-editable via site_texts (the overlay in
  // I18nService falls back to these values when no override row exists).
  'a11y.popup.title': 'Accessibility',
  'a11y.popup.body':
    'Choose how OpenShelter looks to you. Your choice applies immediately and is saved on this device.',
  'a11y.option.default': 'Default',
  'a11y.option.default.desc': 'The standard light appearance.',
  'a11y.option.highContrast': 'High contrast',
  'a11y.option.highContrast.desc': 'A dark background with bright, highly readable text.',
  'a11y.option.blackYellow': 'Black and yellow',
  'a11y.option.blackYellow.desc':
    'Yellow text on a black background, for low vision and direct sunlight.',
  'a11y.popup.footer': 'Your choice is stored on this device only — it is not shared with anyone.',
  'a11y.popup.close': 'Close',

  'footer.notice1':
    'OpenShelter is a community-maintained list, not an official emergency service.',
  'footer.notice2': 'In an emergency, call 112.',
  'footer.notice3': 'Official shelter information:',
  'footer.rescueBoard': 'Rescue Board',
  'footer.and': 'and',
  'footer.ministry': 'Ministry of the Interior',
  'footer.dataSourceTransformed': 'transformed by OpenShelter (EPSG:3301 to WGS84)',
  'footer.privacy': 'Privacy policy',
  'footer.terms': 'Terms of use',
  'footer.dataSource': 'Shelter data',
  'footer.lastImport': 'last import',
  'footer.officialOpenData': 'official open data',
  'footer.legalAria': 'Legal',

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
  'title.guidance': 'Crisis guidance',
  'title.guidanceDetail': 'Guidance post',

  // --- consent banner (first-level data-usage notice). The app has no
  // optional cookies, trackers or analytics, so this is a necessary-only
  // acknowledgment, not an accept/reject choice.
  'consent.aria': 'Cookie and storage notice',
  'consent.title': 'About cookies and browser storage',
  'consent.body':
    "OpenShelter stores only what it needs to work: a sign-in token that keeps you logged in, and your language and display preferences. It does not use advertising, analytics, or cross-site tracking, and it never sells your data. These are stored in your browser's local storage, not in advertising cookies, and are required for the application to function.",
  'consent.acknowledge': 'Got it',
  'consent.privacyLink': 'Read the Privacy Policy',

  // --- "How OpenShelter works" block (map page). UI labels are quoted
  // verbatim so the explanation matches what the map actually shows.
  'how.title': 'How OpenShelter works',
  'how.what':
    'OpenShelter is an independent, community-maintained map of shelters in Estonia. It is not an emergency service or an official government system. In an emergency, call 112 and follow official instructions.',
  'how.sources':
    'Locations come from two sources. Official locations come from Estonian Rescue Board (Päästeamet) open data and show a blue "Registry" marker. Community locations are submitted by verified users and show as "New by community" until other users confirm them ("Confirmed by community"). A community submission is never automatically official.',
  'how.report':
    'Verified users can submit a shelter or report a listed location as closed, inaccurate, or no longer existing. Reports go to administrators, who review them and may hide or correct a location.',
  'how.nearest':
    'The "Show shelters around you" button asks your browser for permission to use your location. Your position is used only inside your browser and is never sent to our servers. You can search near an address instead.',
  'how.guarantee':
    'OpenShelter cannot guarantee that a listed location is open, safe, accessible, available, or still operating. Always follow official emergency instructions first.',
  'how.exampleTitle': 'Example',
  'how.example.1': 'An official location appears with a blue marker and a "Registry" label.',
  'how.example.2':
    'A user submits a possible location; it appears as "New by community" and unverified.',
  'how.example.3': 'Another user reports that the location is closed or inaccessible.',
  'how.example.4': 'An administrator reviews the report.',
  'how.example.5': 'The location is updated or hidden.',

  // --- auth pages (login / register / reset). Same verbatim rule as the
  // chrome: the EN strings ARE the current committed template copy.
  'authPage.login.title': 'Log in',
  'authPage.login.subtitle': 'Use the email or phone you registered with.',
  'authPage.login.sessionExpired': 'Your session has expired. Please log in again.',
  'authPage.login.resetOk': 'Your password has been reset. Log in with your new password.',
  'authPage.login.contactLabel': 'Email or phone',
  'authPage.login.contactPlaceholder': 'you@example.ee or +3725…',
  'authPage.login.contactRequired': 'Email or phone is required.',
  'authPage.login.passwordLabel': 'Password',
  'authPage.login.passwordRequired': 'Password is required.',
  'authPage.login.submitting': 'Logging in…',
  'authPage.login.submit': 'Log in',
  'authPage.login.forgot': 'Forgot password?',
  'authPage.login.noAccount': 'No account yet?',
  'authPage.login.createOne': 'Create one',

  'authPage.register.title': 'Create account',
  'authPage.register.subtitle':
    'Anonymous viewing is free. An account lets you submit shelters and reports once verified.',
  'authPage.register.createdTitle': 'Account created',
  'authPage.register.createdBody':
    'Your account is ready. Please log in, then verify your email address — a verification code will be sent to it.',
  'authPage.register.nameLabel': 'Full name',
  'authPage.register.nameRequired': 'Name is required.',
  'authPage.register.emailLabel': 'Email',
  'authPage.register.emailPlaceholder': 'you@example.ee',
  'authPage.register.emailNote':
    'We send you a verification code here and use it later for password resets.',
  'authPage.register.emailRequired': 'A valid email is required.',
  'authPage.register.phoneLabel': 'Phone',
  'authPage.register.phonePlaceholder': '+3725… or 5xxxxxxx',
  'authPage.register.phoneNote':
    'We send you a verification code here; you can log in with it later too.',
  'authPage.register.phoneRequired': 'Phone is required.',
  'authPage.register.passwordLabel': 'Password',
  'authPage.register.passwordRequired': 'Password is required.',
  'authPage.register.passwordTooShort': 'Password must be at least 8 characters long.',
  'authPage.register.submitting': 'Creating account…',
  'authPage.register.submit': 'Create account',
  'authPage.register.agreeLead': 'By creating an account you agree to the',
  'authPage.register.agreeTerms': 'Terms of Use',
  'authPage.register.agreeAnd': 'and the',
  'authPage.register.agreePrivacy': 'Privacy Policy',
  'authPage.register.agreeTail': '.',
  'authPage.register.haveAccount': 'Already have an account?',

  'authPage.reset.title': 'Reset password',
  'authPage.reset.subtitle': "Enter the email of your account and we'll email you a 6-digit code.",
  'authPage.reset.emailLabel': 'Email',
  'authPage.reset.emailPlaceholder': 'you@example.ee',
  'authPage.reset.emailRequired': 'A valid email is required.',
  'authPage.reset.sending': 'Sending…',
  'authPage.reset.sendIn': 'Send in {time}',
  'authPage.reset.send': 'Email me a reset code',
  'authPage.reset.sentTitle': 'Check your inbox',
  'authPage.reset.sentBody':
    'If an account exists for that email, a 6-digit code has been sent to it.',
  'authPage.reset.codeLabel': 'Reset code',
  'authPage.reset.codePlaceholder': '6-digit code',
  'authPage.reset.codeRequired': 'Enter the 6-digit code from the email.',
  'authPage.reset.codeNote': 'The code is valid for 15 minutes.',
  'authPage.reset.newPasswordLabel': 'New password',
  'authPage.reset.newPasswordRequired': 'Password is required.',
  'authPage.reset.newPasswordTooShort': 'Password must be at least 8 characters long.',
  'authPage.reset.repeatLabel': 'Repeat new password',
  'authPage.reset.repeatRequired': 'Please repeat the password.',
  'authPage.reset.mismatch': 'The passwords do not match.',
  'authPage.reset.updating': 'Updating…',
  'authPage.reset.update': 'Set new password',
  'authPage.reset.resendIn': 'Resend in {time}',
  'authPage.reset.resend': 'Resend code',
  'authPage.reset.backToLogin': 'Back to log in',

  'authPage.privacyPolicy': 'Privacy Policy',
  'authPage.termsOfUse': 'Terms of Use',

  // --- map page (the browse surface). Same verbatim rule as
  // the chrome: the EN strings ARE the current committed template + const
  // copy. The around-you CTA copy is NOT keyed here (see messages.ts).
  'map.title': 'Shelter map',
  'map.subtitle': 'Find registered and community-submitted bomb shelters in Estonia.',
  // Legend entry for the blue registry marker: it names the primary registry
  // source (owner wording: "Registry (Päästeamet)").
  'map.legend.registry': 'Registry (Päästeamet)',
  'map.legend.new': 'New by community',
  // The submitter-verification shapes (submitter-verification-badge).
  'map.legend.partialVerified': 'Added by a partially verified user',
  'map.legend.fullVerified': 'Added by a fully verified user',
  'map.legend.confirmed': 'Confirmed by community',
  'map.legend.reported': 'Reported',
  'map.geoNote':
    'Your browser asks first — your location is never sent to our servers and is used only to find the nearest shelter.',
  'map.aroundYou': 'Show shelters around you',
  'map.locating': 'Finding your location…',
  'map.anchorLabel': 'Find shelters near an address',
  'map.anchorPlaceholder': 'Street or place in Estonia',
  'map.search': 'Search',
  'map.searching': 'Searching…',
  'map.attributionLead': 'Addresses:',
  'map.osmAttribution': '© OpenStreetMap contributors',
  'map.addShelter': 'Add shelter',
  'map.nearestEmpty': 'No listed locations around you yet.',
  'map.nearestEmpty.addFirst': 'You can add the first one.',
  'map.searched': 'Searched address',
  'map.clear': 'Clear',
  'map.filter.all': 'All',
  'map.filter.registry': 'Registry',
  'map.filter.user': 'User',
  'map.filterSourcesAria': 'Filter shelters by source',
  'map.legendAria': 'Marker legend',
  'map.addressResultsAria': 'Address results',
  'map.trustFiltersAria': 'Shelter filters',
  'map.shelterListAria': 'Shelters',
  'map.chipOpen': 'Open',
  'map.chipHasCapacity': 'Has capacity',
  'map.emptyFilter': 'No shelters match this filter.',
  'map.loading': 'Loading shelters…',
  'map.viewDetails': 'View details',
  'map.viewDetailsFor': 'View details for ',
  'map.nearest.denied':
    'Location permission is off. Allow location access in your browser, then try again.',
  'map.nearest.timeout': 'Finding your location timed out. Try again in a moment.',
  'map.nearest.unsupported':
    'Your browser does not support location access. Check your browser settings.',
  'map.nearest.unavailable':
    'Your location could not be determined right now. Try again in a moment.',
  'map.nearest.insecure': 'Location access needs a secure (https) connection.',
  'map.geocode.noResults':
    'No Estonian address found — try another address, or “Show shelters around you”.',
  'map.geocode.rateLimited': 'The address search is busy — please wait a moment and try again.',
  'map.geocode.network':
    'Address search is unreachable right now. Try “Show shelters around you” instead.',

  // --- shelter detail page. Verbatim rule as above.
  'detail.backToMap': 'Back to the map',
  'detail.notFoundTitle': 'Shelter not found',
  'detail.notFoundBody': 'No shelter with this ID exists — it may have been removed.',
  'detail.locationHeading': 'Location',
  'detail.loading': 'Loading shelter…',
  'detail.titleFallback': 'Shelter details',
  'detail.distance.cta': 'Distance from you',
  'detail.distance.pending': 'Measuring…',
  'detail.distance.fromYou': '{distance} from you',
  'detail.detailsHeading': 'Details',
  'detail.infoHeading': 'Info',
  'detail.statusLabel': 'Status',
  'detail.capacityLabel': 'Capacity',
  'detail.lastReported': 'Last reported as {kind}',
  'detail.statusEmpty': 'No open/closed reports yet',
  'detail.capacityEmpty': 'No how-full reports yet',
  'detail.reportOccupancy': 'Report how full',
  'detail.reportOpen': 'Report open/closed',
  'detail.reportThis': 'Report this shelter',
  'detail.navigate': 'Google Maps',
  'detail.appleMaps': 'Apple Maps',
  'detail.navigateAria': 'Open walking directions to {name} in Google Maps',
  'detail.appleMapsAria': 'Open directions to {name} in Apple Maps',
  'detail.occupancy.aria': 'How full is this shelter right now?',
  'detail.band.space': 'Space available',
  'detail.band.gettingFull': 'Getting full',
  'detail.band.full': 'Full',
  'detail.verify.occupancy': 'Verify your email or phone to report how full this shelter is.',
  'detail.login.occupancy': 'Log in to report how full this shelter is.',
  'detail.openStatus.aria': 'Is this shelter open right now?',
  'detail.openState.open': 'Open now',
  'detail.openState.closed': 'Closed now',
  'detail.verify.open': 'Verify your email or phone to report whether this shelter is open.',
  'detail.login.open': 'Log in to report whether this shelter is open.',
  'detail.report': 'Report',
  'detail.reportType.aria': 'Report type',
  'detail.reportType.nonExistent': 'It does not exist',
  'detail.reportType.wrongLocation': 'The location is wrong',
  'detail.reportType.other': 'Something else',
  'detail.reportDetailPlaceholder.wrongLocation': 'What is the actual address?',
  'detail.reportDetailPlaceholder.other': 'What should the community know?',
  'detail.reportDetailLabel': 'Details (optional)',
  'detail.reportDetailError': 'Details must be 500 characters or fewer.',
  'detail.verify.report': 'Verify your email or phone to report this shelter.',
  'detail.login.report': 'Log in to report this shelter.',
  'detail.submitting': 'Submitting…',
  'detail.submitReport': 'Submit report',
  'detail.cancel': 'Cancel',
  'detail.verifyAccount': 'Verify your account',
  // community pulse (M9): gauge end labels = recent-log kind labels.
  'detail.pulse.kind.open': 'Open',
  'detail.pulse.kind.closed': 'Closed',
  'detail.pulse.kind.space': 'Space available',
  'detail.pulse.kind.gettingFull': 'Getting full',
  'detail.pulse.kind.full': 'Full',
  'detail.pulse.recentEntry': 'a community member reported: {kind}',
  'detail.pulse.recent': 'Last 10 reports',
  'detail.pulse.recentEmpty': 'No reports yet',
  'detail.pulse.emptyOpen': 'No open/closed reports in the last 2 hours',
  'detail.pulse.emptyOccupancy': 'No how-full reports in the last 2 hours',
  'detail.pulse.openClosedText': 'Reports: {open} open, {closed} closed',
  'detail.pulse.occupancyText':
    'Reports: {space} space available, {gettingFull} getting full, {full} full',
  'detail.pulse.windowHint': 'Reflects reports from the last 2 hours',
  'detail.pulse.estimateNote': 'The arrows show a calculated estimate, not confirmed data.',

  // --- shared shelter copy (shared/shelter-copy.ts). The nine values with
  // pre-existing twins (trust-state labels, registry labels, inaccurate
  // warning, firm band heads) REUSE account.contrib.* / detail.band.* —
  // they are NOT duplicated here; only the rest of the module's copy is new.
  'shelter.status.reportedClosed': 'Reported closed',
  'shelter.status.closed': 'Closed',
  'shelter.status.open': 'Open',
  'shelter.status.openNoReports': 'Open (no recent reports)',
  'shelter.occupancy.hedged.space': 'Reported space available',
  'shelter.occupancy.hedged.gettingFull': 'Reported getting full',
  'shelter.occupancy.hedged.full': 'Reported full',
  'shelter.recency.justNow': 'just now',
  'shelter.recency.minutes': '{minutes} min ago',
  'shelter.recency.hours': '{hours} h ago',
  'shelter.recency.days': '{days} d ago',
  'shelter.recency.date': '{day} {month} {year}',
  'shelter.reportedBadge': 'Reported ({count})',
  'shelter.privateBadge': 'Private home (declared)',
  'shelter.privateNote': 'This is a resident-offered location, not an official facility.',
  'shelter.unverifiedWarning':
    'This location was submitted by a community member and has not been officially verified. Do not rely on it during an emergency.',
  'shelter.lastVerified': 'Last verified {ago}',
  'shelter.lastVerifiedRegistry': 'Last verified against the registry {ago}',
  'shelter.newlyAddedUnverified': 'Newly added {ago} — not yet verified',
  'shelter.noVerificationRecord': 'No verification record yet',
  'shelter.communityReports': 'Community reports: {count} (total, all types)',
  // The submitter's verification depth (submitter-verification-badge): the
  // single confirmed channel, or FULL at two or more. Only user-submitted
  // rows carry it; the row/detail surfaces render it beside the trust badge.
  'shelter.submitterVerification.email': 'Added by an e-mail verified user',
  'shelter.submitterVerification.phone': 'Added by a phone verified user',
  'shelter.submitterVerification.smartId': 'Added by a Smart-ID verified user',
  'shelter.submitterVerification.full': 'Added by a fully verified user',
  'shelter.distance.meters': '≈ {distance} m straight line',
  'shelter.distance.kilometers': '≈ {distance} km straight line',
  'shelter.notice.reportSubmitted': 'Your report was submitted.',
  'shelter.notice.reportSubmittedDamped':
    'Your report was recorded but weighted 0 — because you have your own listing of a similar location, it does not count toward hiding this shelter.',
  'shelter.notice.occupancySaved': 'Your occupancy report was saved.',
  'shelter.notice.openClosedSaved': 'Your open/closed report was saved.',
  'shelter.notice.reportDuplicate': 'You have already reported this shelter with this report type.',

  // --- submit shelter page (the contribute surface).
  'submit.backToMap': 'Back to the map',
  'submit.title': 'Submit a shelter',
  'submit.subtitle': 'Add a community bomb shelter to the map.',
  'submit.successBody':
    'Your location is now listed and marked as newly added. Community reports confirm it.',
  'submit.success.viewLocation': 'View your location',
  'submit.success.viewContributions': 'View your contributions',
  'submit.verifyHint': 'This account no longer has a verified claim.',
  'submit.verifyHint.link': 'Go to verification',
  'submit.nameLabel': 'Name *',
  'submit.namePlaceholder': 'e.g. Kalamaja community shelter',
  'submit.name.required': 'A name is required.',
  'submit.name.tooLong': 'Name must be 200 characters or fewer.',
  'submit.descriptionLabel': 'Description (optional)',
  'submit.descriptionPlaceholder': 'Access, conditions, who runs it…',
  'submit.description.tooLong': 'Description must be 2000 characters or fewer.',
  'submit.capacityLabel': 'Capacity (optional)',
  'submit.capacityHint': '1–100 000 people',
  'submit.capacityPlaceholder': 'e.g. 40',
  'submit.capacity.invalid': 'Capacity must be a whole number between 1 and 100 000.',
  'submit.privateLabel':
    'This is a private home or private shelter (a resident offers it as a refuge spot)',
  'submit.locationLegend': 'Location *',
  'submit.locationNote':
    'Paste coordinates (59.4370, 24.7535) or a map link, search an Estonian address, use "Use my location", or click the map. It must be inside Estonia.',
  'submit.locationLabel': 'Coordinates or map link',
  'submit.locationPlaceholder': '59.4370, 24.7535 — or paste a Google Maps link',
  'submit.location.set': 'Set location',
  'submit.location.resolving': 'Resolving…',
  'submit.location.prefillNote':
    'An address from the search below fills this field only while it is empty.',
  'submit.addressLabel': 'Search an Estonian address',
  'submit.addressPlaceholder': 'e.g. Lossi 2, Tartu',
  'submit.search': 'Search',
  'submit.searching': 'Searching…',
  'submit.attributionLead': 'Address data',
  'submit.osmAttribution': '© OpenStreetMap contributors',
  'submit.useMyLocation': 'Use my location',
  'submit.locating': 'Locating…',
  'submit.location.empty': 'No location yet',
  'submit.submit': 'Submit shelter',
  'submit.submitting': 'Submitting…',
  'submit.hint.from': 'Location from ',
  'submit.hint.source.typed': 'typed coordinates',
  'submit.hint.source.link': 'the map link',
  'submit.hint.source.geolocation': 'your device location',
  'submit.hint.source.map': 'the map',
  'submit.hint.source.address': 'the address search',
  'submit.hint.swapped':
    ' — detected as longitude, latitude, so the values were swapped to place them inside Estonia',
  'submit.hint.accuracy': ' (accuracy about {m} m — drag the pin if needed)',
  'submit.loc.missing':
    'Pick a location on the map, paste coordinates or a link, or use "Use my location".',
  'submit.loc.noPair':
    'No recognizable coordinates in that text. Paste a pair like 59.4370, 24.7535 or a map link — or use "Use my location" / the map.',
  'submit.loc.outOfBounds': 'The location is outside Estonia.',
  'submit.loc.invalid':
    'That does not look like coordinates. Use a pair like 59.4370, 24.7535, a DMS string, or a map link.',
  'submit.loc.decimalComma':
    'Use a decimal point: 59.4370, 24.7535 (Estonian decimal-comma detected).',
  'submit.loc.geoDenied':
    'Location permission is off. Allow location access in your browser — or pick the spot on the map / paste a link.',
  'submit.loc.geoUnavailable':
    'Your location could not be determined right now. Pick the spot on the map or paste a link.',
  'submit.loc.geoTimeout':
    'Finding your location timed out. Pick the spot on the map or paste a link.',
  'submit.loc.geoInsecure':
    'Location access needs a secure (https) connection. Pick the spot on the map or paste a link.',
  'submit.loc.shortLinkFailed':
    'Could not find coordinates in that link. Use a full Google Maps link or pick the spot on the map.',
  'submit.loc.shortLinkRateLimited':
    'Too many link lookups — please wait a minute and then try again.',
  'submit.loc.shortLinkUnavailable':
    'Location lookup is temporarily unavailable. Try again in a moment, or pick the spot on the map.',
  'submit.geocode.noResults':
    'No Estonian address found — try the map, a link, or "Use my location".',
  'submit.geocode.rateLimited': 'The address search is busy — please wait a moment and try again.',
  'submit.geocode.network':
    'Address search is unreachable right now. Use the map or a link instead.',

  // --- error banners (shared error mapping, i18n-aware seam). EN is the
  // verbatim copy the shared error-copy module already ships.
  'error.rateLimited': 'Too many attempts — please wait a moment and then try again.',
  'error.unauthorized': 'Not authorized. Please log in again.',
  // The login 401 and the password-reset-confirm 400 are deliberately
  // client-authored (anti-enumeration: they never echo the backend's
  // message), so they are catalog keys like the rest of this block.
  'error.invalidCredentials': 'Invalid email/phone or password.',
  'error.resetBadCode':
    'That code is invalid or has expired. Check the latest e-mail and try again.',
  'error.checkInput': 'Please check your input and try again.',
  'error.serverError': 'Something went wrong. Please try again.',
  'error.valueInUse': 'That value is already in use.',
  'error.verifyRateLimited':
    'Too many codes have been requested. Please wait a while before requesting another (codes are limited per day).',
  'error.verifyBadCode': 'That code is invalid or has expired. Check it and try again.',
  'error.accountRateLimited': 'Too many requests. Please wait a moment and then try again.',
  'error.accountBadCode': 'That code is invalid or has expired. Please request a new one.',
  'error.network': 'Cannot reach the backend. It may be offline — please try again later.',

  // --- account page (/account). Same verbatim rule: the EN strings ARE the
  // current committed account-surface template copy.
  'account.subtitle':
    'Your profile and verification. The name can be corrected with a password confirmation; email and phone changes are proven cross-channel.',
  'account.profileLoadError': 'We could not load your profile. The session is still active.',
  'account.retrying': 'Retrying…',
  'account.retry': 'Retry',
  'account.identity': 'Identity',
  'account.name': 'Name',
  'account.adminBadge': 'Admin',
  'account.identityCopy':
    'A typo at registration never forces a new account — the edit is confirmed with your current password.',
  'account.edit': 'Edit',
  'account.currentPassword': 'Current password',
  'account.nameRequired': 'A name is required.',
  'account.passwordRequired': 'Your current password is required.',
  'account.saving': 'Saving…',
  'account.save': 'Save changes',
  'account.cancel': 'Cancel',
  'account.contacts': 'Contacts',
  'account.emailLabel': 'Email address',
  'account.phoneLabel': 'Phone number',
  'account.verified': 'Verified',
  'account.completeVerification': 'Complete verification',
  'account.changeEmail': 'Change email address',
  'account.emailDone.before': 'Your email is now',
  'account.emailDone.after': '. The next time you sign in, use the new address.',
  'account.changeAgain': 'Change it again',
  'account.newEmail': 'New email',
  'account.newEmailPlaceholder': 'new@example.ee',
  'account.emailTooLong': 'Email must be 255 characters or fewer.',
  'account.emailRequired': 'A valid email is required.',
  'account.emailProof':
    'For security, changing the email is confirmed by an SMS code sent to the phone number on your account — never to the new address.',
  'account.smsCode': 'SMS code',
  'account.codePlaceholder': '6-digit code',
  'account.smsCodeRequired': 'Enter the 6-digit code from the SMS.',
  'account.smsSentHint': 'We sent an SMS code to the phone number on your account.',
  'account.working': 'Working…',
  'account.confirmNewEmail': 'Confirm new email',
  'account.resendIn': 'Resend in {time}',
  'account.resendCode': 'Resend code',
  'account.sending': 'Sending…',
  'account.sendIn': 'Send in {time}',
  'account.sendSmsToPhone': 'Send SMS code to my phone',
  'account.changePhone': 'Change phone number',
  'account.phoneDone.before': 'Your phone is now',
  'account.phoneDone.after': '.',
  'account.newPhone': 'New phone',
  'account.newPhonePlaceholder': '+3725… or 5xxxxxxx',
  'account.phoneTooLong': 'Phone must be 64 characters or fewer.',
  'account.phoneRequired': 'A phone number is required.',
  'account.phoneProof':
    'For security, changing the phone is confirmed by an email code sent to the email address on your account — losing your SIM alone cannot re-route verification.',
  'account.emailCode': 'Email code',
  'account.emailCodeRequired': 'Enter the 6-digit code from the email.',
  'account.emailCodeSentHint': 'We sent an email code to the email address on your account.',
  'account.confirmNewPhone': 'Confirm new phone',
  'account.sendEmailCode': 'Send email code to my email',
  'account.contributions': 'My contributions',
  'account.contributionsCopy': 'The shelters you submitted — edit or remove them here.',
  'account.yourData': 'Your data',
  'account.dataCopy':
    'Download a JSON file with everything tied to your account — your profile (name, email, phone) and the shelters you submitted.',
  'account.preparing': 'Preparing…',
  'account.downloadData': 'Download my data (JSON)',
  'account.deleting': 'Deleting…',
  'account.delete': 'Delete account',
  'account.delete.adminCopy':
    'This account was provisioned by the deployment environment, so it cannot be deleted from the app. De-provisioning is an operator action — removing the ADMIN_EMAIL and ADMIN_PASSWORD environment variables — and the server refuses the deletion either way.',
  'account.delete.copy':
    'Erases your account and everything tied to it. Shelters you declared as a private home are removed; public shelters you submitted stay on the map without a submitter. This cannot be undone.',
  'account.delete.typeHint': 'Type DELETE to confirm',
  'account.delete.armed': 'Erasure armed — select “Delete my account” to confirm.',
  'account.delete.button': 'Delete my account',
  'account.legal': 'Legal',
  'account.legal.lead': 'Read the',
  'account.legal.and': 'and the',
  'account.legal.tail': '.',
  'account.success.profileUpdated': 'Your profile has been updated.',
  'account.success.emailChanged': 'Your email address has been changed.',
  'account.success.phoneChanged': 'Your phone number has been changed.',
  'account.success.exportDownloaded': 'Your data export has been downloaded.',
  'account.error.sameValue':
    'That is already the value on your account — the new one must be different.',

  // --- account: contributions panel.
  'account.contrib.shelters': 'Shelters',
  'account.contrib.loading': 'Loading your shelters…',
  'account.contrib.empty': "You haven't submitted any shelters yet.",
  'account.contrib.emptyCta': 'Submit your first shelter',
  'account.contrib.submit': 'Submit a shelter',
  'account.contrib.source.paasteamet': 'Päästeamet registry',
  'account.contrib.source.municipality': 'Municipal registry',
  'account.contrib.badge.new': 'Newly added',
  'account.contrib.badge.confirmed': 'Community-checked',
  'account.contrib.badge.rejected': 'Rejected',
  'account.contrib.infoRequest': 'Info request',
  'account.contrib.adminNote': 'Admin note: {note}',
  'account.contrib.inaccurate': 'Reported inaccurate — details may be wrong',
  'account.contrib.hidden': 'Hidden — reported by the community ({count})',
  'account.contrib.view': 'View',
  'account.contrib.info': 'Info',
  'account.contrib.infoClose': 'Close info',
  'account.contrib.delete': 'Delete',
  'account.contrib.deleteConfirm': 'Delete this shelter permanently?',
  'account.contrib.deleteConfirmButton': 'Confirm delete',
  'account.contrib.nameLabel': 'Name',
  'account.contrib.nameRequired': 'A name (up to 200 characters) is required.',
  'account.contrib.descriptionLabel': 'Description (optional)',
  'account.contrib.descriptionTooLong': 'Description must be 2000 characters or fewer.',
  'account.contrib.latitudeLabel': 'Latitude (−90…90)',
  'account.contrib.latitudeError': 'A latitude between −90 and 90 is required.',
  'account.contrib.longitudeLabel': 'Longitude (−180…180)',
  'account.contrib.longitudeError': 'A longitude between −180 and 180 is required.',
  'account.contrib.estoniaNote':
    'The location must be inside Estonia. That check happens on the server.',
  'account.contrib.infoQuestion': 'A moderator is asking:',
  'account.contrib.replyLabel': 'Your reply (required, one-time)',
  'account.contrib.replyRequired': 'A reply (up to 2000 characters) is required.',
  'account.contrib.sendReply': 'Send reply',
  'account.contrib.reply': 'Your reply',

  // --- verify page (/verify).
  'verify.title': 'Verify your account',
  'verify.subtitle':
    'Verified accounts can submit shelters and report listed locations. Prove you own your email and phone — the codes arrive out-of-band, one per channel.',
  'verify.aria': 'Verification status',
  'verify.verified': 'Verified',
  'verify.notVerified': 'Not verified',
  'verify.intro': "We'll send a code to your {destination}. You enter it here to prove it's yours.",
  'verify.email.title': 'Verify your email',
  'verify.email.destination': 'email address',
  'verify.email.noun': 'email',
  'verify.email.send': 'Send code to my email',
  'verify.email.sentHint': 'A verification code has been sent to your email address.',
  'verify.email.codeLabel': 'Verification code',
  'verify.email.codeHint': 'Enter the 8-character code from the email.',
  'verify.email.placeholder': '8-character code',
  'verify.phone.title': 'Verify your phone',
  'verify.phone.destination': 'phone number',
  'verify.phone.noun': 'phone',
  'verify.phone.send': 'Text code to my phone',
  'verify.phone.sentHint': 'An SMS code has been sent to your phone number.',
  'verify.phone.codeLabel': 'SMS code',
  'verify.phone.codeHint': 'Enter the 6-digit code from the SMS.',
  'verify.phone.placeholder': '6-digit code',
  'verify.verifying': 'Verifying…',
  'verify.verify': 'Verify',
  'verify.fullyVerified': "You're fully verified",
  'verify.fullyVerifiedCopy':
    'Your email and phone are verified — you can now submit shelters and report listed locations.',
  'verify.verifiedCopy': "You're verified. You can submit shelters and report listed locations.",
  'verify.continue': 'Continue',
  'verify.manageAccount': 'Manage account',
  'verify.backToMap': 'Back to the map',
  'verify.alreadyVerified': 'Your {noun} is already verified.',
  'verify.verifiedNotice': 'Your {noun} is verified.',

  // --- crisis guidance (/blog — crisis-guidance D4/D6). The post title and
  // body are admin copy (rendered verbatim), never catalog keys.
  'guidance.title': 'Crisis guidance',
  'guidance.subtitle': 'Practical guidance for crisis situations.',
  'guidance.loading': 'Loading guidance…',
  'guidance.loadingDetail': 'Loading guidance post…',
  'guidance.empty': 'No guidance yet — check back soon.',
  'guidance.backToList': 'Back to all guidance',
  'guidance.notFoundTitle': 'Guidance post not found',
  'guidance.notFoundBody': 'This guidance post does not exist — it may have been unpublished.',
  'guidance.published': 'Published',
  'guidance.localeFallback': 'This post is shown in {locale} — it is not available in {reader}.',
  'guidance.localeFallback.alternate': 'Read the {locale} version',

  // --- list paging (list-page-paging: the shared prev/next + size control).
  'pagination.aria': 'Pages',
  'pagination.previous': 'Previous',
  'pagination.next': 'Next',
  'pagination.pageOf': 'Page {page} of {pages}',
  'pagination.size': 'Per page',
  'pagination.sizeShelters': 'Shelters per page',
  'guidance.pageOutOfRange': 'Page {page} does not exist — the index ends at page {pages}.',
  'guidance.pageFirst': 'Show the first page',

  // --- admin: guidance tab + editor + media library (crisis-guidance D8).
  'admin.retry': 'Retry',

  'admin.settings.tab': 'Settings',

  'admin.tabs.aria': 'Admin sections',
  'admin.tabs.unconfirmed': 'Unconfirmed',
  'admin.tabs.shelters': 'Shelters',
  'admin.tabs.reports': 'Shelter reports',
  'admin.tabs.alerts': 'Alerts',
  'admin.tabs.users': 'Users',
  'admin.tabs.audit': 'Audit log',
  'admin.working': 'Working…',
  'admin.cancel': 'Cancel',

  'admin.unconfirmed.loading': 'Loading community locations…',
  'admin.unconfirmed.empty': 'No unconfirmed community locations.',
  'admin.unconfirmed.aria': 'Unconfirmed community locations',
  'admin.unconfirmed.col.name': 'Name',
  'admin.unconfirmed.col.address': 'Address',
  'admin.unconfirmed.col.submitter': 'Submitter',
  'admin.unconfirmed.col.actions': 'Actions',
  'admin.unconfirmed.confirm': 'Mark confirmed',
  'admin.unconfirmed.reject': 'Reject',
  'admin.unconfirmed.reject.label': 'Reason (required)',
  'admin.unconfirmed.reject.placeholder': 'Why is this location rejected?',
  'admin.unconfirmed.reject.required': 'A reason is required (max {max} characters).',

  'admin.shelters.search.label': 'Search shelters (name or address)',
  'admin.shelters.search.placeholder': 'e.g. kelder',
  'admin.shelters.search.button': 'Search',
  'admin.shelters.source.aria': 'Filter shelters by source',
  'admin.shelters.source.all': 'All',
  'admin.shelters.source.registry': 'Registry',
  'admin.shelters.source.community': 'Community',
  'admin.shelters.loading': 'Loading shelters…',
  'admin.shelters.empty': 'No shelters.',
  'admin.shelters.emptyFiltered': 'No shelters match the current filter.',
  'admin.shelters.pageOutOfRange': 'Page {page} does not exist — the list ends at page {pages}.',
  'admin.shelters.aria': 'Shelters',
  'admin.shelters.col.name': 'Name',
  'admin.shelters.col.source': 'Source',
  'admin.shelters.col.status': 'Status',
  'admin.shelters.col.reports': 'Reports',
  'admin.shelters.col.occupancy': 'Occupancy',
  'admin.shelters.col.submitter': 'Submitter',
  'admin.shelters.col.actions': 'Actions',
  'admin.shelters.status.hidden': 'Hidden',
  'admin.shelters.status.active': 'Active',
  'admin.shelters.history': 'History',
  'admin.shelters.history.close': 'Close history',
  'admin.shelters.info': 'Info',
  'admin.shelters.info.close': 'Close info',
  'admin.shelters.inaccurate.clear': 'Clear inaccurate',
  'admin.shelters.inaccurate.mark': 'Mark inaccurate',
  'admin.shelters.inaccurate.markClose': 'Close mark',
  'admin.shelters.hide': 'Hide',
  'admin.shelters.activate': 'Activate',
  'admin.shelters.delete': 'Delete',
  'admin.shelters.delete.confirm': 'Delete this shelter permanently?',
  'admin.shelters.delete.working': 'Deleting…',
  'admin.shelters.delete.confirmButton': 'Confirm delete',
  'admin.shelters.readOnly': 'read-only',

  'admin.shelters.history.loading': 'Loading history…',
  'admin.shelters.history.empty': 'No history yet.',
  'admin.shelters.info.request': 'Info request',
  'admin.shelters.info.answer': 'Answer',
  'admin.shelters.info.waiting': "Waiting for the submitter's answer.",
  'admin.shelters.info.question.label': 'Question for the submitter (required)',
  'admin.shelters.info.question.placeholder': 'What do you need from the submitter?',
  'admin.shelters.info.question.required': 'A question is required (max {max} characters).',
  'admin.shelters.info.send': 'Send',
  'admin.shelters.info.sending': 'Sending…',
  'admin.shelters.inaccurate.reason.label': 'Reason (optional)',
  'admin.shelters.inaccurate.reason.placeholder': 'What did you find to be inaccurate?',
  'admin.shelters.inaccurate.reason.max': 'Max {max} characters.',
  'admin.shelters.inaccurate.marking': 'Marking…',

  'admin.reports.loading': 'Loading reports…',
  'admin.reports.empty': 'No reports.',
  'admin.reports.dismissed': 'Dismissed',
  'admin.reports.notCounted': 'Not counted',
  'admin.reports.notCounted.reason':
    'Not counted: the reporter already has a shelter with the same name at the same location.',
  'admin.reports.restore': 'Restore shelter',
  'admin.reports.dismiss': 'Dismiss',

  'admin.alerts.loading': 'Loading alerts…',
  'admin.alerts.empty': 'No throttled or abusive activity yet.',
  'admin.alerts.aria': 'Abuse alerts',
  'admin.alerts.col.when': 'When',
  'admin.alerts.col.type': 'Type',
  'admin.alerts.col.subject': 'Subject',
  'admin.alerts.col.detail': 'Detail',
  'admin.alerts.col.retryAfter': 'Retry after',

  'admin.users.loading': 'Loading accounts…',
  'admin.users.empty': 'No accounts yet.',
  'admin.users.aria': 'Accounts',
  'admin.users.col.name': 'Name',
  'admin.users.col.email': 'E-mail',
  'admin.users.col.kind': 'Kind',
  'admin.users.col.status': 'Status',
  'admin.users.col.actions': 'Actions',
  'admin.users.suspended': 'Suspended',
  'admin.users.active': 'Active',
  'admin.users.suspend.confirm':
    'Suspend this account? It loses login, refresh and its open session; its shelters stay on the map.',
  'admin.users.unsuspend.confirm': "Restore this account's access?",
  'admin.users.suspend.confirmButton': 'Confirm suspend',
  'admin.users.unsuspend.confirmButton': 'Confirm unsuspend',
  'admin.users.suspend': 'Suspend',
  'admin.users.unsuspend': 'Unsuspend',
  'admin.users.notSuspendable': 'Not suspendable',

  'admin.audit.loading': 'Loading audit log…',
  'admin.audit.empty': 'No moderation actions yet.',
  'admin.audit.aria': 'Audit log',
  'admin.audit.col.when': 'When',
  'admin.audit.col.moderator': 'Moderator',
  'admin.audit.col.subject': 'Subject',
  'admin.audit.col.action': 'Action',
  'admin.audit.col.change': 'Change',
  'admin.audit.col.reason': 'Reason',

  'admin.siteTexts.loading': 'Loading site texts…',
  'admin.siteTexts.hint1':
    'Leave a field blank to use the shipped default (shown as the placeholder). Saving a cleared field removes the override. Link URLs must start with ',
  'admin.siteTexts.hint2': ' and are shared by all three languages.',
  'admin.siteTexts.linkLabel': 'Link (https, all languages)',
  'admin.siteTexts.saving': 'Saving…',
  'admin.siteTexts.save': 'Save changes',
  'admin.siteTexts.loadError': 'Failed to load the site texts.',
  'admin.siteTexts.urlError': 'Link URLs must start with https://.',
  'admin.siteTexts.noChanges': 'No changes to save.',
  'admin.siteTexts.saved': 'Saved.',
  'admin.siteTexts.saveFailed': 'Save failed.',
  'admin.siteTexts.saveFailedWith': 'Save failed: {message}',

  'admin.guidance.tab': 'Guidance',
  'admin.guidance.loading': 'Loading guidance posts…',
  'admin.guidance.empty': 'No guidance posts yet.',
  'admin.guidance.emptyLocale': 'No guidance posts in {locale} yet.',
  'admin.guidance.shownIn':
    'Posts in {locale} — the other languages are edited from their own lists.',
  'admin.guidance.search.label': 'Search posts (title or body)',
  'admin.guidance.search.placeholder': 'e.g. kelder',
  'admin.guidance.search.button': 'Search',
  'admin.guidance.search.clear': 'Clear',
  'admin.guidance.noMatch': 'No posts matching "{query}" in {locale}.',
  'admin.guidance.pageOutOfRange': 'Page {page} does not exist — the list ends at page {pages}.',
  'admin.pageFirst': 'Show the first page',
  'admin.guidance.language.label': 'Content language',
  'admin.guidance.language.hint':
    'The language of the posts listed and edited here. On first use it follows the interface language; afterwards it is independent.',
  'admin.guidance.create': 'New post',
  'admin.guidance.col.title': 'Title',
  'admin.guidance.col.position': 'Position',
  'admin.guidance.col.status': 'Status',
  'admin.guidance.col.locale': 'Locale',
  'admin.guidance.col.pinned': 'Pinned',
  'admin.guidance.col.published': 'Published',
  'admin.guidance.col.updated': 'Updated',
  'admin.guidance.col.actions': 'Actions',
  'admin.guidance.posts.aria': 'Guidance posts',
  'admin.guidance.order.hint':
    'The posts appear to visitors in this order — drag a row or use the move buttons.',
  'admin.guidance.order.pagedHint':
    'Reordering needs the whole list on one page — set the page size to {max} to reorder.',
  'admin.guidance.move.top': 'To top',
  'admin.guidance.move.up': 'Up',
  'admin.guidance.move.down': 'Down',
  'admin.guidance.move.top.aria': 'Move "{title}" to the top',
  'admin.guidance.move.up.aria': 'Move "{title}" up',
  'admin.guidance.move.down.aria': 'Move "{title}" down',
  'admin.guidance.status.draft': 'Draft — not public',
  'admin.guidance.status.published': 'Published',
  'admin.guidance.pinned.yes': 'Yes',
  'admin.guidance.pinned.no': 'No',
  'admin.guidance.edit': 'Edit',
  'admin.guidance.publish': 'Publish',
  'admin.guidance.unpublish': 'Unpublish',
  'admin.guidance.delete': 'Delete',
  'admin.guidance.delete.confirm':
    'Delete this post permanently? Its image stays in the media library.',
  'admin.guidance.delete.confirmButton': 'Confirm delete',
  'admin.guidance.delete.cancel': 'Cancel',
  'admin.guidance.working': 'Working…',
  'admin.guidance.success.created': 'Post created.',
  'admin.guidance.success.updated': 'Post updated.',
  'admin.guidance.success.published': 'Post published.',
  'admin.guidance.success.unpublished': 'Post unpublished.',
  'admin.guidance.success.deleted': 'Post deleted.',
  'admin.guidance.success.reordered': 'Order saved.',
  'admin.guidance.success.translationCreated': 'Translation created.',
  'admin.guidance.success.translationDeleted': 'Translation deleted.',

  'admin.guidance.editor.createTitle': 'New guidance post',
  'admin.guidance.editor.editTitle': 'Edit guidance post',
  'admin.guidance.editor.loading': 'Loading the post…',
  'admin.guidance.editor.titleLabel': 'Title *',
  'admin.guidance.editor.titleRequired': 'A title is required.',
  'admin.guidance.editor.titleTooLong': 'Title must be 255 characters or fewer.',
  'admin.guidance.editor.slugLabel': 'Slug (optional)',
  'admin.guidance.editor.slugHint.create':
    'Lowercase letters, numbers and dashes. Leave blank to generate one from the title.',
  'admin.guidance.editor.slugHint.edit':
    'Lowercase letters, numbers and dashes. Leave blank to keep the current slug.',
  'admin.guidance.editor.slugInvalid':
    'Use lowercase letters, numbers and dashes (no leading or trailing dash).',
  'admin.guidance.editor.bodyLabel': 'Body *',
  'admin.guidance.editor.bodyHint':
    'Only the toolbar formatting survives saving — no H1 and no inline images, deliberately (the page owns the heading and the hero image). Pasted content keeps only the formatting the toolbar offers.',
  'admin.guidance.editor.bodyRequired': 'A body is required.',
  'admin.guidance.editor.link.prompt': 'Link URL (http, https or mailto):',
  'admin.guidance.editor.link.invalid':
    'Only http, https and mailto links are kept — use a full link starting with https:// or mailto:.',
  'admin.guidance.editor.link.noSelection': 'Select the text to link first.',
  'admin.guidance.editor.heroLabel': 'Hero image',
  'admin.guidance.editor.hero.current': 'Current image',
  'admin.guidance.editor.hero.choose': 'Choose from the media library',
  'admin.guidance.editor.hero.loading': 'Loading the media library…',
  'admin.guidance.editor.hero.empty':
    'No images in the media library yet — upload one in the Media library tab.',
  'admin.guidance.editor.hero.remove': 'Remove image',
  /** The hero picker's upload control: the file input's label (the backend
   *  accepts exactly these three types, magic-byte checked). */
  'admin.guidance.editor.hero.uploadLabel': 'Upload an image',
  /** 413 from the upload: over the server's size cap (MEDIA_MAX_BYTES). */
  'admin.guidance.editor.hero.uploadError.tooLarge':
    'That image is larger than the 5 MB upload cap.',
  /** 400 from the upload: not a readable image, or the declared type
   *  contradicts the bytes (the server's magic-byte check). */
  'admin.guidance.editor.hero.uploadError.unsupported':
    'That file is not a supported image (JPEG, PNG or WebP), or its type does not match.',
  /** Any other upload failure (5xx, network): the generic retry copy. */
  'admin.guidance.editor.hero.uploadError.generic': 'The image upload failed. Please try again.',
  /** The hero-import URL input's label: a PENDING import stored with the
   *  draft, fetched by the server at publish. */
  'admin.guidance.editor.hero.importLabel': 'Import from URL (optional)',
  /** Always-on hint: nothing is fetched at edit time — the server
   *  fetches, validates and stores the image at the next publish. */
  'admin.guidance.editor.hero.importHint':
    'The image is not fetched while you edit — the URL is stored with the draft, and the server fetches, validates and stores it when the post is published.',
  /** The URL failed the shape check (mirrors the backend's write-time
   *  400s): not a full http(s) address, or it embeds credentials. */
  'admin.guidance.editor.hero.importInvalid':
    'Use a full http:// or https:// address without a username or password. Leave it blank for no import.',
  /** The explicit "no image" tick (checked = no library asset AND no
   *  pending import URL; the hero choice controls are disabled). */
  'admin.guidance.editor.hero.none': 'No image',
  /** Shown while a pending import URL is stored: the fetch happens at
   *  publish, and a failed fetch fails the publish (the draft keeps the
   *  URL intact). */
  'admin.guidance.editor.hero.importNote':
    'Nothing has been fetched yet. On publish the server downloads the image — if the fetch fails, the publish fails and this draft keeps the URL.',
  'admin.guidance.editor.altLabel': 'Hero image alt text (optional)',
  'admin.guidance.editor.altRequired': 'Alt text is required when a hero image is chosen.',
  'admin.guidance.editor.altForbidden': 'Remove the alt text or choose a hero image.',
  'admin.guidance.editor.altTooLong': 'Alt text must be 300 characters or fewer.',
  'admin.guidance.editor.localeLabel': 'Post language',
  'admin.guidance.editor.localeHint':
    "The post's home language, e.g. en. Prefilled: the active UI language when creating, the post's own when editing.",
  'admin.guidance.editor.localeTooLong': 'Locale must be 5 characters or fewer.',
  'admin.guidance.editor.editingIn': 'You are editing the {locale} content of this post.',
  'admin.guidance.editor.creatingIn': 'This post will be created in {locale}.',
  'admin.guidance.editor.homeLocaleNote':
    "The post's home language is {home}. Saving changes only the {locale} content — the other languages keep their own text.",
  'admin.guidance.editor.translatingIn':
    'You are adding the {locale} translation of this post — the other languages are untouched.',
  'admin.guidance.editor.translationTitle': 'Add a translation',
  'admin.guidance.editor.translations.title': 'Translations',
  'admin.guidance.editor.translations.loading': 'Loading translations…',
  'admin.guidance.editor.translations.empty':
    "No translations yet — only the post's home language.",
  'admin.guidance.editor.translations.home': 'home',
  'admin.guidance.editor.translations.add': 'Add {locale} translation',
  'admin.guidance.editor.translations.delete': 'Delete translation',
  'admin.guidance.editor.translations.delete.confirm':
    'Delete the {locale} translation of this post? The {locale} text is removed; the post and its other languages stay.',
  'admin.guidance.editor.pinnedLabel': 'Pin this post to the top of the guidance list',
  'admin.guidance.editor.statusLabel': 'Publish',
  'admin.guidance.editor.status.draft': 'Save as draft',
  'admin.guidance.editor.status.publish': 'Save and publish',
  'admin.guidance.editor.statusNote':
    'The publication state is changed with the Publish and Unpublish actions on the list.',
  /** Edit mode, draft post: the at-a-glance state line (a draft is not
   *  public until published; names the way out). A published post keeps
   *  the statusNote instead (no nag). */
  'admin.guidance.editor.draftState':
    'This post is a draft — it is not visible on /blog until you publish it. Use Publish in the list.',
  /** After a create-mode draft save: the consequence + the way out. A
   *  normal state, not an error (the editor's info notice). */
  'admin.guidance.editor.savedAsDraft':
    'Saved as a draft. It is not visible on /blog until you publish it — use Publish in the list, or save and publish.',
  /** After an edit of an existing draft: it stays a draft, still not
   *  visible on /blog until published (the edit payload carries no
   *  status). */
  'admin.guidance.editor.stillDraft':
    'Saved. It is still a draft, so it is not visible on /blog until you publish it — use Publish in the list.',
  'admin.guidance.editor.save': 'Save',
  'admin.guidance.editor.saving': 'Saving…',
  'admin.guidance.editor.cancel': 'Cancel',

  'admin.media.tab': 'Media library',
  'admin.media.loading': 'Loading the media library…',
  'admin.media.empty': 'No images in the library yet.',
  'admin.media.upload': 'Upload image',
  'admin.media.uploading': 'Uploading…',
  'admin.media.uploadHint': 'JPEG, PNG or WebP.',
  'admin.media.col.image': 'Image',
  'admin.media.col.file': 'File',
  'admin.media.col.dimensions': 'Dimensions',
  'admin.media.col.size': 'Size',
  'admin.media.col.uploaded': 'Uploaded',
  'admin.media.col.usedBy': 'Used by',
  'admin.media.col.actions': 'Actions',
  'admin.media.library.aria': 'Media library',
  'admin.media.delete': 'Delete',
  'admin.media.delete.working': 'Checking…',
  'admin.media.delete.inUse':
    'This image is still used by a guidance post. Deleting it removes the hero image from the affected posts.',
  'admin.media.delete.confirmButton': 'Delete anyway',
  'admin.media.delete.cancel': 'Cancel',
  'admin.media.success.uploaded': 'Image uploaded.',
  'admin.media.success.deleted': 'Image deleted.',

  // --- legal pages (legal-i18n M4): one key per paragraph/heading, splice
  // segments around the inline emphasis/links. The section heading keys
  // double as the TOC link labels. EN values are verbatim from the old
  // static templates (the page specs assert on them).
  'legal.toc.aria': 'Table of contents',
  // privacy policy (/privacy)
  'legal.privacy.title': 'Privacy policy',
  'legal.privacy.updated': 'Last updated: 16 September 2026',
  'legal.privacy.who': 'Who operates OpenShelter',
  'legal.privacy.scope': 'Scope of this policy',
  'legal.privacy.collect': 'What personal data we collect',
  'legal.privacy.why': 'Why we process each category',
  'legal.privacy.verification': 'Account creation and verification',
  'legal.privacy.location': 'Location and geolocation',
  'legal.privacy.content': 'User-generated content',
  'legal.privacy.cookies': 'Cookies and browser storage',
  'legal.privacy.thirdParties': 'Third-party service providers',
  'legal.privacy.sharing': 'Data sharing',
  'legal.privacy.retention': 'Data retention',
  'legal.privacy.rights': 'Your rights under the GDPR',
  'legal.privacy.security': 'Data security',
  'legal.privacy.children': 'Children',
  'legal.privacy.changes': 'Changes to this policy',
  'legal.privacy.contact': 'Contact',
  'legal.privacy.who.p1':
    'OpenShelter is an open-source, community-maintained map of shelters and safe places in Estonia. It is operated by [OPERATOR LEGAL NAME], [POSTAL ADDRESS]. The data protection contact is [DATA PROTECTION CONTACT].',
  'legal.privacy.who.p2.before': 'OpenShelter is ',
  'legal.privacy.who.p2.strong': 'not an official government service',
  'legal.privacy.who.p2.after':
    ' and not an emergency service. Official shelter data shown in the application is imported from the Estonian Rescue Board (Päästeamet) open data, but the application itself is operated independently.',
  'legal.privacy.scope.p1':
    "This policy describes how OpenShelter collects, uses, stores and deletes personal data when you use the web application. It is intended to describe the application's actual behaviour. It does not apply to the external websites we link to (the Estonian Rescue Board, Maa-amet and OpenStreetMap).",

  'legal.privacy.collect.p1':
    'We collect only what the application needs to work. When you create an account we store:',
  'legal.privacy.collect.li1.before': 'your ',
  'legal.privacy.collect.li1.strong': 'full name',
  'legal.privacy.collect.li1.after': ';',
  'legal.privacy.collect.li2.before': 'your ',
  'legal.privacy.collect.li2.strong': 'e-mail address',
  'legal.privacy.collect.li2.after': ';',
  'legal.privacy.collect.li3.before': 'your ',
  'legal.privacy.collect.li3.strong': 'phone number',
  'legal.privacy.collect.li3.after': ';',
  'legal.privacy.collect.li4.before': 'your ',
  'legal.privacy.collect.li4.strong': 'password',
  'legal.privacy.collect.li4.after': ', stored only as a one-way hash.',
  'legal.privacy.collect.p2.before': 'We do ',
  'legal.privacy.collect.p2.strong': 'not',
  'legal.privacy.collect.p2.middle':
    ' collect a national identification code, and we do not use advertising, analytics or cross-site tracking. When you contribute to the map we store the content you submit (shelters and reports), as described under ',
  'legal.privacy.collect.p2.link': 'user-generated content',
  'legal.privacy.collect.p2.after': '.',

  'legal.privacy.why.p1':
    'Each category is processed for a specific purpose, and for no other purpose:',
  'legal.privacy.why.li1.strong': 'Name',
  'legal.privacy.why.li1.after':
    ' - shown on your account and, for public submissions, on the map.',
  'legal.privacy.why.li2.strong': 'E-mail address',
  'legal.privacy.why.li2.after':
    ' - account verification, password resets and cross-channel confirmation when you change your phone number.',
  'legal.privacy.why.li3.strong': 'Phone number',
  'legal.privacy.why.li3.after':
    ' - account verification, sign-in and cross-channel confirmation when you change your e-mail address.',
  'legal.privacy.why.li4.strong': 'Password',
  'legal.privacy.why.li4.after':
    ' - authentication. It is stored only as a one-way hash, so it can never be read back.',
  'legal.privacy.why.li5.strong': 'Submitted content',
  'legal.privacy.why.li5.after':
    ' - shown on the public map and used by administrators for moderation and abuse prevention.',
  'legal.privacy.why.p2':
    'The legal basis for each purpose is [LEGAL BASIS TO BE CONFIRMED]. This document is intended to describe the processing; it is not a legal opinion.',
  'legal.privacy.verification.p1':
    'You may browse the map without an account. To submit shelters or reports you must create an account and verify both your e-mail address and your phone number. Verification works by sending a one-time code to each contact; until both are verified you can sign in but cannot contribute.',
  'legal.privacy.verification.p2':
    'Password resets are performed by a one-time code sent to your e-mail address. Changing your e-mail address is confirmed with a code sent to your current phone number, and changing your phone number is confirmed with a code sent to your current e-mail address.',
  'legal.privacy.verification.p3':
    'To prevent abuse, the application applies rate limits on code requests and on shelter submissions, and detects near-duplicate submissions. Exceeding a limit produces an error, not a ban.',
  'legal.privacy.location.p1.before': 'We only ever see your location when ',
  'legal.privacy.location.p1.em': 'you',
  'legal.privacy.location.p1.after':
    ' ask for it. The "Show shelters around you" button and the "Use my location" option on the submit form first show your browser\'s own permission prompt. If you decline, nothing changes.',

  'legal.privacy.location.p2.before': 'On the map, the nearest shelter is worked out ',
  'legal.privacy.location.p2.strong': 'inside your browser',
  'legal.privacy.location.p2.after':
    '; your live position is never sent to our servers. If you submit a shelter at your position, only the coordinate you choose is stored, as part of that submission.',
  'legal.privacy.location.p3.before': 'We ',
  'legal.privacy.location.p3.strong': 'never',
  'legal.privacy.location.p3.after':
    ' infer your location from your IP address. Address search uses the OpenStreetMap Nominatim service; a search request is sent only when you deliberately search for an address.',
  'legal.privacy.content.p1.before':
    'When you contribute, the application stores your shelters and your reports (for example, that a location is closed, inaccurate, or no longer exists). This content becomes part of the public community map. You can edit or remove your own shelters from the ',
  'legal.privacy.content.p1.after': '; reports are reviewed by administrators.',
  'legal.privacy.content.p2':
    'Moderators can review, hide, correct or remove user-submitted content. The application keeps a moderation record so decisions can be audited.',
  'legal.privacy.cookies.p1':
    "OpenShelter does not use advertising cookies. It stores only the following items in your browser's local storage, each of which is technically necessary:",
  'legal.privacy.cookies.li1.before': 'a ',
  'legal.privacy.cookies.li1.strong': 'sign-in token',
  'legal.privacy.cookies.li1.after': ' that keeps you logged in across page reloads;',
  'legal.privacy.cookies.li2.before': 'your ',
  'legal.privacy.cookies.li2.strong': 'language preference',
  'legal.privacy.cookies.li2.after': ' (Estonian or English);',
  'legal.privacy.cookies.li3.before': 'your ',
  'legal.privacy.cookies.li3.strong': 'display preference',
  'legal.privacy.cookies.li3.after': ' (high-contrast mode).',
  'legal.privacy.cookies.p2':
    'Your access token is held in memory only and is discarded when you close the tab. No third party receives these items, and there are no optional analytics or tracking technologies to accept or reject.',

  'legal.privacy.thirdParties.p1':
    'We use a small number of third-party services, each only to deliver a specific function:',
  'legal.privacy.thirdParties.li1.before': 'an ',
  'legal.privacy.thirdParties.li1.strong': 'e-mail delivery service',
  'legal.privacy.thirdParties.li1.after':
    ' (SendPulse, via SMTP) to send verification and password-reset codes. It receives the destination e-mail address to deliver the message.',
  'legal.privacy.thirdParties.li2.before': 'a ',
  'legal.privacy.thirdParties.li2.strong': 'text-message service',
  'legal.privacy.thirdParties.li2.after':
    ' (Twilio) to send verification codes. It receives the destination phone number to deliver the message.',
  'legal.privacy.thirdParties.li3.strong': 'OpenStreetMap',
  'legal.privacy.thirdParties.li3.after':
    ' map tiles and the Nominatim geocoding service, which receive the map area you view or the address you search for.',
  'legal.privacy.thirdParties.p2':
    'The official shelter data is imported from the Estonian Rescue Board (Päästeamet) open data; that is an inbound data source, not a service we send your data to. Whether any of these providers involves an international transfer is [TO BE CONFIRMED].',
  'legal.privacy.sharing.p1':
    'We do not sell your personal data and do not share it for advertising or any other commercial purpose. The only disclosures are to the service providers listed above, in order to deliver the messages you request. Shelter data you submit becomes part of the public community list; after you delete your account, public submissions remain on the map without attribution.',
  'legal.privacy.retention.p1':
    'Your account data is kept for as long as your account exists. Deleting your account removes your personal data immediately: shelters you declared as a private home are removed, and public shelters you submitted stay on the map without a submitter.',
  'legal.privacy.retention.p2.before':
    'We also apply fixed retention periods: an account with no sign-in activity (registration, login, or session refresh) for ',
  'legal.privacy.retention.p2.strong': '24 months',
  'legal.privacy.retention.p2.middle':
    ' is deleted with the same erasure rule as account deletion, and moderation and audit records older than ',
  'legal.privacy.retention.p2.strong2': '24 months',
  'legal.privacy.retention.p2.after': ' are removed.',
  'legal.privacy.retention.p3.before':
    "Those periods are the app's retention rule. The scheduled job that enforces them is a deployment-level switch (",
  'legal.privacy.retention.p3.code': 'RETENTION_ENABLED',
  'legal.privacy.retention.p3.after':
    "): it is off in this repository's development setup, and it is enabled by whoever operates a deployment. In a deployment where the job is off, inactive accounts and old audit records are simply kept.",
  'legal.privacy.retention.p4':
    'Public community submissions are never removed automatically: they stay on the map without attribution until a moderator removes them.',

  'legal.privacy.rights.p1': 'If you are in the European Economic Area, you have the right to:',
  'legal.privacy.rights.li1.strong': 'Access',
  'legal.privacy.rights.li1.and': ' and ',
  'legal.privacy.rights.li1.strong2': 'portability',
  'legal.privacy.rights.li1.middle':
    ' - download a JSON export of your profile and everything you submitted from the ',
  'legal.privacy.rights.li1.after': '.',
  'legal.privacy.rights.li2.strong': 'Rectification',
  'legal.privacy.rights.li2.after':
    ' - correct your name, or change your e-mail address or phone number (each confirmed with a code).',
  'legal.privacy.rights.li3.strong': 'Erasure',
  'legal.privacy.rights.li3.middle': ' - delete your account from the ',
  'legal.privacy.rights.li3.after':
    '. Public submissions are orphaned rather than deleted, as described above.',
  'legal.privacy.rights.li4.strong': 'Restriction',
  'legal.privacy.rights.li4.and': ' and ',
  'legal.privacy.rights.li4.strong2': 'objection',
  'legal.privacy.rights.li4.after': ' - contact the data protection contact below.',
  'legal.privacy.rights.p2':
    'You can also complain to the Estonian Data Protection Inspectorate (Andmekaitse Inspektsioon).',
  'legal.privacy.security.p1.before': 'Your e-mail address and phone number are ',
  'legal.privacy.security.p1.strong': 'encrypted at rest',
  'legal.privacy.security.p1.after':
    ' (AES-256-GCM). Lookups such as sign-in and duplicate checks run on a separate one-way index that cannot be turned back into your contact. Your password is stored as a one-way Argon2 hash. The encryption keys are kept outside the database and are never written into code or logs.',
  'legal.privacy.security.p2':
    'The application applies rate limits on verification codes, password resets and submissions, sends security headers on every response, and requires HTTPS for location access. No security measure can guarantee absolute safety, but these measures reduce common risks.',

  'legal.privacy.children.p1':
    "OpenShelter is not directed at children and does not knowingly collect the personal data of children. The application does not currently check a user's age.",
  'legal.privacy.changes.p1':
    'We may update this policy as the application evolves. The version on this page is the one in force when you read it. Material changes will be reflected in the "Last updated" date above.',
  'legal.privacy.contact.p1.before':
    'Questions about this policy or about your data can be sent to [CONTACT EMAIL], or to the data protection contact at [DATA PROTECTION CONTACT]. OpenShelter is also governed by the ',
  'legal.privacy.contact.p1.after': '.',
  'legal.privacy.link.accountPage': 'account page',
  'legal.privacy.link.terms': 'terms of use',
  // terms of use (/terms)
  'legal.terms.title': 'Terms of use',
  'legal.terms.updated': 'Last updated: 13 September 2026',
  'legal.terms.emergencyNumber': '112',
  'legal.terms.acceptance': 'Acceptance of these terms',
  'legal.terms.service': 'What OpenShelter is',
  'legal.terms.eligibility': 'Eligibility and accounts',
  'legal.terms.security': 'Account security',
  'legal.terms.rules': 'Rules for contributions',
  'legal.terms.prohibited': 'Prohibited content and behaviour',
  'legal.terms.license': 'Intellectual property and your license',
  'legal.terms.moderation': 'Moderation and removal',
  'legal.terms.official': 'Official versus community information',
  'legal.terms.emergency': 'Emergency disclaimer',
  'legal.terms.warranty': 'No warranty',
  'legal.terms.liability': 'Limitation of responsibility',
  'legal.terms.thirdParty': 'Third-party links and services',
  'legal.terms.availability': 'Service availability and changes',
  'legal.terms.source': 'Open-source license',
  'legal.terms.law': 'Applicable law and disputes',
  'legal.terms.contact': 'Contact',

  'legal.terms.acceptance.p1':
    'By using OpenShelter, you agree to these terms of use. If you do not agree, do not use the application. Continuing to use the application after a change means you accept the updated terms.',
  'legal.terms.service.p1':
    'OpenShelter is an independent, community-maintained map of shelters and safe places in Estonia. It combines official open data from the Estonian Rescue Board (Päästeamet) with locations submitted by community members.',
  'legal.terms.service.p2.before': 'OpenShelter is ',
  'legal.terms.service.p2.strong': 'not an official emergency service',
  'legal.terms.service.p2.middle': ' and not a government service. In an emergency, call ',
  'legal.terms.service.p2.after':
    ' and follow the instructions of the Estonian Rescue Board, local authorities and emergency services.',
  'legal.terms.eligibility.p1':
    'You may browse the map without an account. To submit shelters or reports you need an account, and the account becomes contributing after you verify both your e-mail address and your phone number with one-time codes. You are responsible for the accuracy of the contacts you register.',
  'legal.terms.security.p1':
    'You are responsible for keeping your password safe and for everything done through your account. Do not share your password or your one-time verification codes. If you believe your account has been compromised, reset your password.',
  'legal.terms.rules.li1':
    'Submit only places you know to exist, with details accurate to the best of your knowledge.',
  'legal.terms.rules.li2':
    'Report locations (as closed, inaccurate, or no longer existing) truthfully and only from what you actually know.',
  'legal.terms.rules.li3':
    'Do not submit a private home as a public shelter. If you submit a location that is a private home, declare it as such.',
  'legal.terms.rules.li4':
    'The application applies limits to keep the list usable: a daily cap on submissions, a cap on how often one-time codes may be requested, and detection of near-duplicate submissions. Exceeding a limit produces an error and a suggested wait; it is not a ban.',

  'legal.terms.prohibited.p1': 'You must not:',
  'legal.terms.prohibited.li1':
    'submit false, misleading, unsafe or malicious shelter data or reports;',
  'legal.terms.prohibited.li2':
    'submit private homes as public shelters without declaring them as private;',
  'legal.terms.prohibited.li3':
    'spam, automate access, or attempt to attack or overload the application;',
  'legal.terms.prohibited.li4':
    "attempt to access another user's account or the administrator functions;",
  'legal.terms.prohibited.li5':
    "submit content that is unlawful, defamatory, or that exposes someone's private data.",
  'legal.terms.prohibited.p2':
    'Deliberately false or misleading shelter data is abuse of the service and may lead to removal of content or suspension of your account.',
  'legal.terms.license.p1':
    'By submitting a shelter or report, you grant OpenShelter a non-exclusive, worldwide, royalty-free license to store, display and modify that content for the purpose of operating the map and moderating it. You keep ownership of what you submit, and you can edit or remove your own shelters.',
  'legal.terms.moderation.p1':
    'Submissions enter the list as community reports. Moderators can review, hide, correct or remove user-submitted content, and can suspend accounts that abuse the service. A submission can therefore be reviewed, hidden or rejected.',
  'legal.terms.official.p1.before':
    'The application distinguishes between information sources. Locations marked as "Registry" come from official open data. Locations marked "New by community" or "Confirmed by community" were submitted by community members. A ',
  'legal.terms.official.p1.em': 'verified user',
  'legal.terms.official.p1.middle':
    ' has proved ownership of an e-mail address and a phone number; that says nothing about the accuracy of what they submit. ',
  'legal.terms.official.p1.strong': 'A verified user is not a verified shelter.',
  'legal.terms.official.p2':
    'A community-submitted location is not automatically a safe, legal, accessible, public or operational shelter. Treat community submissions with caution, especially during an emergency.',

  'legal.terms.emergency.p1.before':
    'OpenShelter is not an emergency service and must not be your only source of emergency information. Official instructions from the Estonian Rescue Board, local authorities and emergency services always take priority over anything shown in this application. In an emergency, call ',
  'legal.terms.emergency.p1.after': '.',
  'legal.terms.emergency.p2':
    'Do not enter private property or abandoned buildings based only on information shown by OpenShelter.',
  'legal.terms.warranty.p1':
    'The list is provided as-is, for community benefit, without warranty of any kind. We do not guarantee that any location is open, safe, accessible, available, suitable or still operational.',
  'legal.terms.liability.p1':
    'To the extent permitted by law, OpenShelter accepts no liability for decisions made in reliance on the list. This paragraph is intended to be reasonable and is subject to legal review; it does not attempt to exclude liability that cannot be excluded by law.',
  'legal.terms.thirdParty.p1.before':
    'The application links to external services, including the Estonian Rescue Board, Maa-amet and OpenStreetMap. We are not responsible for the content or availability of those services. How personal data is shared with service providers is described in the ',
  'legal.terms.thirdParty.p1.link': 'privacy policy',
  'legal.terms.thirdParty.p1.after': '.',
  'legal.terms.availability.p1':
    'The application is provided free of charge and may change or be unavailable at any time without notice. We may add, change or remove features.',
  'legal.terms.source.p1':
    'The OpenShelter source code is available under the MIT License. This governs the source code, not the shelter data, which remains subject to its own sources and to these terms.',
  'legal.terms.law.p1':
    'These terms are governed by [APPLICABLE LAW TO BE CONFIRMED]. Disputes will be resolved in [DISPUTE RESOLUTION TO BE CONFIRMED].',
  'legal.terms.contact.p1.before':
    'Questions about these terms can be sent to [CONTACT EMAIL]. OpenShelter is also governed by the ',
  'legal.terms.contact.p1.link': 'privacy policy',
  'legal.terms.contact.p1.after': '.',
};
