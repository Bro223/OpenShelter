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
    'Locations come from two sources. Official locations come from Estonian Rescue Board (Päästeamet) open data and show a blue "Registry" marker. Community locations are submitted by verified users and show as "Newly added" until other users confirm them ("Community-checked"). A community submission is never automatically official.',
  'how.report':
    'Verified users can submit a shelter or report a listed location as closed, inaccurate, or no longer existing. Reports go to administrators, who review them and may hide or correct a location.',
  'how.nearest':
    'The "Show shelters around you" button asks your browser for permission to use your location. Your position is used only inside your browser and is never sent to our servers. You can search near an address instead.',
  'how.guarantee':
    'OpenShelter cannot guarantee that a listed location is open, safe, accessible, available, or still operating. Always follow official emergency instructions first.',
  'how.exampleTitle': 'Example',
  'how.example.1': 'An official location appears with a blue marker and a "Registry" label.',
  'how.example.2':
    'A user submits a possible location; it appears as "Newly added" and unverified.',
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
  'map.legend.registry': 'Registry',
  'map.legend.new': 'New by community',
  'map.legend.confirmed': 'Confirmed by community',
  'map.legend.reported': 'Reported',
  'map.geoNote':
    'Your browser asks first — your location is never sent to our servers and is used only to find the nearest shelter.',
  'map.anchorLabel': 'Find shelters near an address',
  'map.anchorPlaceholder': 'Street or place in Estonia',
  'map.search': 'Search',
  'map.searching': 'Searching…',
  'map.attributionLead': 'Addresses:',
  'map.osmAttribution': '© OpenStreetMap contributors',
  'map.addShelter': 'Add shelter',
  'map.nearestEmpty': 'No listed locations around you yet.',
  'map.nearestEmpty.addFirst': 'You can add the first one.',
  'map.searched': 'Searched:',
  'map.clear': 'Clear',
  'map.filter.all': 'All',
  'map.filter.registry': 'Registry',
  'map.filter.user': 'User',
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
  'detail.detailsHeading': 'Details',
  'detail.infoHeading': 'Info',
  'detail.reportOccupancy': 'Report how full',
  'detail.reportOpen': 'Report open/closed',
  'detail.reportThis': 'Report this shelter',
  'detail.navigate': 'Navigate',
  'detail.appleMaps': 'Open in Apple Maps',
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
  'submit.capacityLabel': 'Capacity (optional, 1–100 000 people)',
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

  // --- admin: guidance tab + editor + media library (crisis-guidance D8).
  'admin.retry': 'Retry',

  'admin.settings.tab': 'Settings',

  'admin.guidance.tab': 'Guidance',
  'admin.guidance.loading': 'Loading guidance posts…',
  'admin.guidance.empty': 'No guidance posts yet.',
  'admin.guidance.create': 'New post',
  'admin.guidance.col.title': 'Title',
  'admin.guidance.col.status': 'Status',
  'admin.guidance.col.locale': 'Locale',
  'admin.guidance.col.pinned': 'Pinned',
  'admin.guidance.col.published': 'Published',
  'admin.guidance.col.updated': 'Updated',
  'admin.guidance.col.actions': 'Actions',
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
  'admin.guidance.editor.altLabel': 'Hero image alt text (optional)',
  'admin.guidance.editor.altRequired': 'Alt text is required when a hero image is chosen.',
  'admin.guidance.editor.altForbidden': 'Remove the alt text or choose a hero image.',
  'admin.guidance.editor.altTooLong': 'Alt text must be 300 characters or fewer.',
  'admin.guidance.editor.localeLabel': 'Locale (optional)',
  'admin.guidance.editor.localeHint':
    'The post language, e.g. en or et. Blank uses the server default.',
  'admin.guidance.editor.localeTooLong': 'Locale must be 5 characters or fewer.',
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
  'admin.media.delete': 'Delete',
  'admin.media.delete.working': 'Checking…',
  'admin.media.delete.inUse':
    'This image is still used by a guidance post. Deleting it removes the hero image from the affected posts.',
  'admin.media.delete.confirmButton': 'Delete anyway',
  'admin.media.delete.cancel': 'Cancel',
  'admin.media.success.uploaded': 'Image uploaded.',
  'admin.media.success.deleted': 'Image deleted.',
};
