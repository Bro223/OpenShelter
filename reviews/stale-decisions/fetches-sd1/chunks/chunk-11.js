// src/app/core/i18n/locale.ts
var LOCALES = ["en", "et", "ru"];
var MONTH_ABBREVS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  et: ["jaan", "veebr", "m\xE4rts", "apr", "mai", "juuni", "juuli", "aug", "sept", "okt", "nov", "dets"],
  ru: ["\u044F\u043D\u0432", "\u0444\u0435\u0432\u0440", "\u043C\u0430\u0440\u0442", "\u0430\u043F\u0440", "\u043C\u0430\u044F", "\u0438\u044E\u043D", "\u0438\u044E\u043B", "\u0430\u0432\u0433", "\u0441\u0435\u043D\u0442", "\u043E\u043A\u0442", "\u043D\u043E\u044F\u0431", "\u0434\u0435\u043A"]
};

// src/app/core/i18n/i18n.service.ts
import { ApplicationRef, Injectable, inject, signal } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";

// src/app/core/i18n/en.ts
var EN = {
  "menu.aria": "Menu",
  "nav.map": "Shelter map",
  "nav.guidance": "Guidance",
  "nav.account": "Account",
  "nav.admin": "Admin",
  "nav.skip": "Skip to content",
  "nav.primaryAria": "Primary",
  "a11y.button": "Accessibility",
  "lang.label": "Language",
  "auth.logout": "Log out",
  "auth.login": "Log in",
  "auth.register": "Create account",
  // --- accessibility dialog (the three contrast options). Shipped defaults
  // — every string below is admin-editable via site_texts (the overlay in
  // I18nService falls back to these values when no override row exists).
  "a11y.popup.title": "Accessibility",
  "a11y.popup.body": "Choose how OpenShelter looks to you. Your choice applies immediately and is saved on this device.",
  "a11y.option.default": "Default",
  "a11y.option.default.desc": "The standard light appearance.",
  "a11y.option.highContrast": "High contrast",
  "a11y.option.highContrast.desc": "A dark background with bright, highly readable text.",
  "a11y.option.blackYellow": "Black and yellow",
  "a11y.option.blackYellow.desc": "Yellow text on a black background, for low vision and direct sunlight.",
  "a11y.popup.footer": "Your choice is stored on this device only \u2014 it is not shared with anyone.",
  "a11y.popup.close": "Close",
  "footer.notice1": "OpenShelter is a community-maintained list, not an official emergency service.",
  "footer.notice2": "In an emergency, call 112.",
  "footer.notice3": "Official shelter information:",
  "footer.rescueBoard": "Rescue Board",
  "footer.and": "and",
  "footer.ministry": "Ministry of the Interior",
  "footer.dataSourceTransformed": "transformed by OpenShelter (EPSG:3301 to WGS84)",
  "footer.privacy": "Privacy policy",
  "footer.terms": "Terms of use",
  "footer.dataSource": "Shelter data",
  "footer.lastImport": "last import",
  "footer.officialOpenData": "official open data",
  "footer.legalAria": "Legal",
  "title.map": "Shelter map",
  "title.login": "Log in",
  "title.register": "Create account",
  "title.reset": "Reset password",
  "title.verify": "Verify account",
  "title.account": "Account",
  "title.privacy": "Privacy policy",
  "title.terms": "Terms of use",
  "title.shelterDetail": "Shelter detail",
  "title.submit": "Submit a shelter",
  "title.admin": "Admin",
  "title.guidance": "Crisis guidance",
  "title.guidanceDetail": "Guidance post",
  // --- consent banner (first-level data-usage notice). The app has no
  // optional cookies, trackers or analytics, so this is a necessary-only
  // acknowledgment, not an accept/reject choice.
  "consent.aria": "Cookie and storage notice",
  "consent.title": "About cookies and browser storage",
  "consent.body": "OpenShelter stores only what it needs to work: a sign-in token that keeps you logged in, and your language and display preferences. It does not use advertising, analytics, or cross-site tracking, and it never sells your data. These are stored in your browser's local storage, not in advertising cookies, and are required for the application to function.",
  "consent.acknowledge": "Got it",
  "consent.privacyLink": "Read the Privacy Policy",
  // --- "How OpenShelter works" block (map page). UI labels are quoted
  // verbatim so the explanation matches what the map actually shows.
  "how.title": "How OpenShelter works",
  "how.what": "OpenShelter is an independent, community-maintained map of shelters in Estonia. It is not an emergency service or an official government system. In an emergency, call 112 and follow official instructions.",
  "how.sources": 'Locations come from two sources. Official locations come from Estonian Rescue Board (P\xE4\xE4steamet) open data and show a blue "Registry" marker. Community locations are submitted by verified users and show as "New by community" until other users confirm them ("Confirmed by community"). A community submission is never automatically official.',
  "how.report": "Verified users can submit a shelter or report a listed location as closed, inaccurate, or no longer existing. Reports go to administrators, who review them and may hide or correct a location.",
  "how.nearest": 'The "Show shelters around you" button asks your browser for permission to use your location. Your position is used only inside your browser and is never sent to our servers. You can search near an address instead.',
  "how.guarantee": "OpenShelter cannot guarantee that a listed location is open, safe, accessible, available, or still operating. Always follow official emergency instructions first.",
  "how.exampleTitle": "Example",
  "how.example.1": 'An official location appears with a blue marker and a "Registry" label.',
  "how.example.2": 'A user submits a possible location; it appears as "New by community" and unverified.',
  "how.example.3": "Another user reports that the location is closed or inaccessible.",
  "how.example.4": "An administrator reviews the report.",
  "how.example.5": "The location is updated or hidden.",
  // --- auth pages (login / register / reset). Same verbatim rule as the
  // chrome: the EN strings ARE the current committed template copy.
  "authPage.login.title": "Log in",
  "authPage.login.subtitle": "Use the email or phone you registered with.",
  "authPage.login.sessionExpired": "Your session has expired. Please log in again.",
  "authPage.login.resetOk": "Your password has been reset. Log in with your new password.",
  "authPage.login.contactLabel": "Email or phone",
  "authPage.login.contactPlaceholder": "you@example.ee or +3725\u2026",
  "authPage.login.contactRequired": "Email or phone is required.",
  "authPage.login.passwordLabel": "Password",
  "authPage.login.passwordRequired": "Password is required.",
  "authPage.login.submitting": "Logging in\u2026",
  "authPage.login.submit": "Log in",
  "authPage.login.forgot": "Forgot password?",
  "authPage.login.noAccount": "No account yet?",
  "authPage.login.createOne": "Create one",
  "authPage.register.title": "Create account",
  "authPage.register.subtitle": "Anonymous viewing is free. An account lets you submit shelters and reports once verified.",
  "authPage.register.createdTitle": "Account created",
  "authPage.register.createdBody": "Your account is ready. Please log in, then verify your email address \u2014 a verification code will be sent to it.",
  "authPage.register.nameLabel": "Full name",
  "authPage.register.nameRequired": "Name is required.",
  "authPage.register.emailLabel": "Email",
  "authPage.register.emailPlaceholder": "you@example.ee",
  "authPage.register.emailNote": "We send you a verification code here and use it later for password resets.",
  "authPage.register.emailRequired": "A valid email is required.",
  "authPage.register.phoneLabel": "Phone",
  "authPage.register.phonePlaceholder": "+3725\u2026 or 5xxxxxxx",
  "authPage.register.phoneNote": "We send you a verification code here; you can log in with it later too.",
  "authPage.register.phoneRequired": "Phone is required.",
  "authPage.register.passwordLabel": "Password",
  "authPage.register.passwordRequired": "Password is required.",
  "authPage.register.passwordTooShort": "Password must be at least 8 characters long.",
  "authPage.register.submitting": "Creating account\u2026",
  "authPage.register.submit": "Create account",
  "authPage.register.agreeLead": "By creating an account you agree to the",
  "authPage.register.agreeTerms": "Terms of Use",
  "authPage.register.agreeAnd": "and the",
  "authPage.register.agreePrivacy": "Privacy Policy",
  "authPage.register.agreeTail": ".",
  "authPage.register.haveAccount": "Already have an account?",
  "authPage.reset.title": "Reset password",
  "authPage.reset.subtitle": "Enter the email of your account and we'll email you a 6-digit code.",
  "authPage.reset.emailLabel": "Email",
  "authPage.reset.emailPlaceholder": "you@example.ee",
  "authPage.reset.emailRequired": "A valid email is required.",
  "authPage.reset.sending": "Sending\u2026",
  "authPage.reset.sendIn": "Send in {time}",
  "authPage.reset.send": "Email me a reset code",
  "authPage.reset.sentTitle": "Check your inbox",
  "authPage.reset.sentBody": "If an account exists for that email, a 6-digit code has been sent to it.",
  "authPage.reset.codeLabel": "Reset code",
  "authPage.reset.codePlaceholder": "6-digit code",
  "authPage.reset.codeRequired": "Enter the 6-digit code from the email.",
  "authPage.reset.codeNote": "The code is valid for 15 minutes.",
  "authPage.reset.newPasswordLabel": "New password",
  "authPage.reset.newPasswordRequired": "Password is required.",
  "authPage.reset.newPasswordTooShort": "Password must be at least 8 characters long.",
  "authPage.reset.repeatLabel": "Repeat new password",
  "authPage.reset.repeatRequired": "Please repeat the password.",
  "authPage.reset.mismatch": "The passwords do not match.",
  "authPage.reset.updating": "Updating\u2026",
  "authPage.reset.update": "Set new password",
  "authPage.reset.resendIn": "Resend in {time}",
  "authPage.reset.resend": "Resend code",
  "authPage.reset.backToLogin": "Back to log in",
  "authPage.privacyPolicy": "Privacy Policy",
  "authPage.termsOfUse": "Terms of Use",
  // --- map page (the browse surface). Same verbatim rule as
  // the chrome: the EN strings ARE the current committed template + const
  // copy. The around-you CTA copy is NOT keyed here (see messages.ts).
  "map.title": "Shelter map",
  "map.subtitle": "Find registered and community-submitted bomb shelters in Estonia.",
  // Legend entry for the blue registry marker: it names the primary registry
  // source (owner wording: "Registry (Päästeamet)").
  "map.legend.registry": "Registry (P\xE4\xE4steamet)",
  "map.legend.new": "New by community",
  // The submitter-verification shapes (submitter-verification-badge).
  "map.legend.partialVerified": "Added by a partially verified user",
  "map.legend.fullVerified": "Added by a fully verified user",
  "map.legend.confirmed": "Confirmed by community",
  "map.legend.reported": "Reported",
  "map.geoNote": "Your browser asks first \u2014 your location is never sent to our servers and is used only to find the nearest shelter.",
  "map.aroundYou": "Show shelters around you",
  "map.locating": "Finding your location\u2026",
  "map.anchorLabel": "Find shelters near an address",
  "map.anchorPlaceholder": "Street or place in Estonia",
  "map.search": "Search",
  "map.searching": "Searching\u2026",
  "map.attributionLead": "Addresses:",
  "map.osmAttribution": "\xA9 OpenStreetMap contributors",
  "map.addShelter": "Add shelter",
  "map.nearestEmpty": "No listed locations around you yet.",
  "map.nearestEmpty.addFirst": "You can add the first one.",
  "map.searched": "Searched address",
  "map.clear": "Clear",
  "map.filter.all": "All",
  "map.filter.registry": "Registry",
  "map.filter.user": "User",
  "map.filterSourcesAria": "Filter shelters by source",
  "map.legendAria": "Marker legend",
  "map.addressResultsAria": "Address results",
  "map.trustFiltersAria": "Shelter filters",
  "map.shelterListAria": "Shelters",
  "map.chipOpen": "Open",
  "map.chipHasCapacity": "Has capacity",
  "map.emptyFilter": "No shelters match this filter.",
  "map.loading": "Loading shelters\u2026",
  "map.viewDetails": "View details",
  "map.viewDetailsFor": "View details for ",
  "map.nearest.denied": "Location permission is off. Allow location access in your browser, then try again.",
  "map.nearest.timeout": "Finding your location timed out. Try again in a moment.",
  "map.nearest.unsupported": "Your browser does not support location access. Check your browser settings.",
  "map.nearest.unavailable": "Your location could not be determined right now. Try again in a moment.",
  "map.nearest.insecure": "Location access needs a secure (https) connection.",
  "map.geocode.noResults": "No Estonian address found \u2014 try another address, or \u201CShow shelters around you\u201D.",
  "map.geocode.rateLimited": "The address search is busy \u2014 please wait a moment and try again.",
  "map.geocode.network": "Address search is unreachable right now. Try \u201CShow shelters around you\u201D instead.",
  // --- shelter detail page. Verbatim rule as above.
  "detail.backToMap": "Back to the map",
  "detail.notFoundTitle": "Shelter not found",
  "detail.notFoundBody": "No shelter with this ID exists \u2014 it may have been removed.",
  "detail.locationHeading": "Location",
  "detail.loading": "Loading shelter\u2026",
  "detail.titleFallback": "Shelter details",
  "detail.distance.cta": "Distance from you",
  "detail.distance.pending": "Measuring\u2026",
  "detail.distance.fromYou": "{distance} from you",
  "detail.detailsHeading": "Details",
  "detail.infoHeading": "Info",
  "detail.statusLabel": "Status",
  "detail.capacityLabel": "Capacity",
  "detail.lastReported": "Last reported as {kind}",
  "detail.statusEmpty": "No open/closed reports yet",
  "detail.capacityEmpty": "No how-full reports yet",
  "detail.reportOccupancy": "Report how full",
  "detail.reportOpen": "Report open/closed",
  "detail.reportThis": "Report this shelter",
  "detail.navigate": "Google Maps",
  "detail.appleMaps": "Apple Maps",
  "detail.navigateAria": "Open walking directions to {name} in Google Maps",
  "detail.appleMapsAria": "Open directions to {name} in Apple Maps",
  "detail.occupancy.aria": "How full is this shelter right now?",
  "detail.band.space": "Space available",
  "detail.band.gettingFull": "Getting full",
  "detail.band.full": "Full",
  "detail.verify.occupancy": "Verify your email or phone to report how full this shelter is.",
  "detail.login.occupancy": "Log in to report how full this shelter is.",
  "detail.openStatus.aria": "Is this shelter open right now?",
  "detail.openState.open": "Open now",
  "detail.openState.closed": "Closed now",
  "detail.verify.open": "Verify your email or phone to report whether this shelter is open.",
  "detail.login.open": "Log in to report whether this shelter is open.",
  "detail.report": "Report",
  "detail.reportType.aria": "Report type",
  "detail.reportType.nonExistent": "It does not exist",
  "detail.reportType.wrongLocation": "The location is wrong",
  "detail.reportType.other": "Something else",
  "detail.reportDetailPlaceholder.wrongLocation": "What is the actual address?",
  "detail.reportDetailPlaceholder.other": "What should the community know?",
  "detail.reportDetailLabel": "Details (optional)",
  "detail.reportDetailError": "Details must be 500 characters or fewer.",
  "detail.verify.report": "Verify your email or phone to report this shelter.",
  "detail.login.report": "Log in to report this shelter.",
  "detail.submitting": "Submitting\u2026",
  "detail.submitReport": "Submit report",
  "detail.cancel": "Cancel",
  "detail.verifyAccount": "Verify your account",
  // community pulse (M9): gauge end labels = recent-log kind labels.
  "detail.pulse.kind.open": "Open",
  "detail.pulse.kind.closed": "Closed",
  "detail.pulse.kind.space": "Space available",
  "detail.pulse.kind.gettingFull": "Getting full",
  "detail.pulse.kind.full": "Full",
  "detail.pulse.recentEntry": "a community member reported: {kind}",
  "detail.pulse.recent": "Last 10 reports",
  "detail.pulse.recentEmpty": "No reports yet",
  "detail.pulse.emptyOpen": "No open/closed reports in the last 2 hours",
  "detail.pulse.emptyOccupancy": "No how-full reports in the last 2 hours",
  "detail.pulse.openClosedText": "Reports: {open} open, {closed} closed",
  "detail.pulse.occupancyText": "Reports: {space} space available, {gettingFull} getting full, {full} full",
  "detail.pulse.windowHint": "Reflects reports from the last 2 hours",
  "detail.pulse.estimateNote": "The arrows show a calculated estimate, not confirmed data.",
  // --- shared shelter copy (shared/shelter-copy.ts). The nine values with
  // pre-existing twins (trust-state labels, registry labels, inaccurate
  // warning, firm band heads) REUSE account.contrib.* / detail.band.* —
  // they are NOT duplicated here; only the rest of the module's copy is new.
  "shelter.status.reportedClosed": "Reported closed",
  "shelter.status.closed": "Closed",
  "shelter.status.open": "Open",
  "shelter.status.openNoReports": "Open (no recent reports)",
  "shelter.occupancy.hedged.space": "Reported space available",
  "shelter.occupancy.hedged.gettingFull": "Reported getting full",
  "shelter.occupancy.hedged.full": "Reported full",
  "shelter.recency.justNow": "just now",
  "shelter.recency.minutes": "{minutes} min ago",
  "shelter.recency.hours": "{hours} h ago",
  "shelter.recency.days": "{days} d ago",
  "shelter.recency.date": "{day} {month} {year}",
  "shelter.reportedBadge": "Reported ({count})",
  "shelter.privateBadge": "Private home (declared)",
  "shelter.privateNote": "This is a resident-offered location, not an official facility.",
  "shelter.unverifiedWarning": "This location was submitted by a community member and has not been officially verified. Do not rely on it during an emergency.",
  "shelter.lastVerified": "Last verified {ago}",
  "shelter.lastVerifiedRegistry": "Last verified against the registry {ago}",
  "shelter.newlyAddedUnverified": "Newly added {ago} \u2014 not yet verified",
  "shelter.noVerificationRecord": "No verification record yet",
  "shelter.communityReports": "Community reports: {count} (total, all types)",
  // The submitter's verification depth (submitter-verification-badge): the
  // single confirmed channel, or FULL at two or more. Only user-submitted
  // rows carry it; the row/detail surfaces render it beside the trust badge.
  "shelter.submitterVerification.email": "Added by an e-mail verified user",
  "shelter.submitterVerification.phone": "Added by a phone verified user",
  "shelter.submitterVerification.smartId": "Added by a Smart-ID verified user",
  "shelter.submitterVerification.full": "Added by a fully verified user",
  "shelter.distance.meters": "\u2248 {distance} m straight line",
  "shelter.distance.kilometers": "\u2248 {distance} km straight line",
  "shelter.notice.reportSubmitted": "Your report was submitted.",
  "shelter.notice.reportSubmittedDamped": "Your report was recorded but weighted 0 \u2014 because you have your own listing of a similar location, it does not count toward hiding this shelter.",
  "shelter.notice.occupancySaved": "Your occupancy report was saved.",
  "shelter.notice.openClosedSaved": "Your open/closed report was saved.",
  "shelter.notice.reportDuplicate": "You have already reported this shelter with this report type.",
  // --- submit shelter page (the contribute surface).
  "submit.backToMap": "Back to the map",
  "submit.title": "Submit a shelter",
  "submit.subtitle": "Add a community bomb shelter to the map.",
  "submit.successBody": "Your location is now listed and marked as newly added. Community reports confirm it.",
  "submit.success.viewLocation": "View your location",
  "submit.success.viewContributions": "View your contributions",
  "submit.verifyHint": "This account no longer has a verified claim.",
  "submit.verifyHint.link": "Go to verification",
  "submit.nameLabel": "Name *",
  "submit.namePlaceholder": "e.g. Kalamaja community shelter",
  "submit.name.required": "A name is required.",
  "submit.name.tooLong": "Name must be 200 characters or fewer.",
  "submit.descriptionLabel": "Description (optional)",
  "submit.descriptionPlaceholder": "Access, conditions, who runs it\u2026",
  "submit.description.tooLong": "Description must be 2000 characters or fewer.",
  "submit.capacityLabel": "Capacity (optional)",
  "submit.capacityHint": "1\u2013100 000 people",
  "submit.capacityPlaceholder": "e.g. 40",
  "submit.capacity.invalid": "Capacity must be a whole number between 1 and 100 000.",
  "submit.privateLabel": "This is a private home or private shelter (a resident offers it as a refuge spot)",
  "submit.locationLegend": "Location *",
  "submit.locationNote": 'Paste coordinates (59.4370, 24.7535) or a map link, search an Estonian address, use "Use my location", or click the map. It must be inside Estonia.',
  "submit.locationLabel": "Coordinates or map link",
  "submit.locationPlaceholder": "59.4370, 24.7535 \u2014 or paste a Google Maps link",
  "submit.location.set": "Set location",
  "submit.location.resolving": "Resolving\u2026",
  "submit.location.prefillNote": "An address from the search below fills this field only while it is empty.",
  "submit.addressLabel": "Search an Estonian address",
  "submit.addressPlaceholder": "e.g. Lossi 2, Tartu",
  "submit.search": "Search",
  "submit.searching": "Searching\u2026",
  "submit.attributionLead": "Address data",
  "submit.osmAttribution": "\xA9 OpenStreetMap contributors",
  "submit.useMyLocation": "Use my location",
  "submit.locating": "Locating\u2026",
  "submit.location.empty": "No location yet",
  "submit.submit": "Submit shelter",
  "submit.submitting": "Submitting\u2026",
  "submit.hint.from": "Location from ",
  "submit.hint.source.typed": "typed coordinates",
  "submit.hint.source.link": "the map link",
  "submit.hint.source.geolocation": "your device location",
  "submit.hint.source.map": "the map",
  "submit.hint.source.address": "the address search",
  "submit.hint.swapped": " \u2014 detected as longitude, latitude, so the values were swapped to place them inside Estonia",
  "submit.hint.accuracy": " (accuracy about {m} m \u2014 drag the pin if needed)",
  "submit.loc.missing": 'Pick a location on the map, paste coordinates or a link, or use "Use my location".',
  "submit.loc.noPair": 'No recognizable coordinates in that text. Paste a pair like 59.4370, 24.7535 or a map link \u2014 or use "Use my location" / the map.',
  "submit.loc.outOfBounds": "The location is outside Estonia.",
  "submit.loc.invalid": "That does not look like coordinates. Use a pair like 59.4370, 24.7535, a DMS string, or a map link.",
  "submit.loc.decimalComma": "Use a decimal point: 59.4370, 24.7535 (Estonian decimal-comma detected).",
  "submit.loc.geoDenied": "Location permission is off. Allow location access in your browser \u2014 or pick the spot on the map / paste a link.",
  "submit.loc.geoUnavailable": "Your location could not be determined right now. Pick the spot on the map or paste a link.",
  "submit.loc.geoTimeout": "Finding your location timed out. Pick the spot on the map or paste a link.",
  "submit.loc.geoInsecure": "Location access needs a secure (https) connection. Pick the spot on the map or paste a link.",
  "submit.loc.shortLinkFailed": "Could not find coordinates in that link. Use a full Google Maps link or pick the spot on the map.",
  "submit.loc.shortLinkRateLimited": "Too many link lookups \u2014 please wait a minute and then try again.",
  "submit.loc.shortLinkUnavailable": "Location lookup is temporarily unavailable. Try again in a moment, or pick the spot on the map.",
  "submit.geocode.noResults": 'No Estonian address found \u2014 try the map, a link, or "Use my location".',
  "submit.geocode.rateLimited": "The address search is busy \u2014 please wait a moment and try again.",
  "submit.geocode.network": "Address search is unreachable right now. Use the map or a link instead.",
  // --- error banners (shared error mapping, i18n-aware seam). EN is the
  // verbatim copy the shared error-copy module already ships.
  "error.rateLimited": "Too many attempts \u2014 please wait a moment and then try again.",
  "error.unauthorized": "Not authorized. Please log in again.",
  // The login 401 and the password-reset-confirm 400 are deliberately
  // client-authored (anti-enumeration: they never echo the backend's
  // message), so they are catalog keys like the rest of this block.
  "error.invalidCredentials": "Invalid email/phone or password.",
  "error.resetBadCode": "That code is invalid or has expired. Check the latest e-mail and try again.",
  "error.checkInput": "Please check your input and try again.",
  "error.serverError": "Something went wrong. Please try again.",
  "error.valueInUse": "That value is already in use.",
  "error.verifyRateLimited": "Too many codes have been requested. Please wait a while before requesting another (codes are limited per day).",
  "error.verifyBadCode": "That code is invalid or has expired. Check it and try again.",
  "error.accountRateLimited": "Too many requests. Please wait a moment and then try again.",
  "error.accountBadCode": "That code is invalid or has expired. Please request a new one.",
  "error.network": "Cannot reach the backend. It may be offline \u2014 please try again later.",
  // --- account page (/account). Same verbatim rule: the EN strings ARE the
  // current committed account-surface template copy.
  "account.subtitle": "Your profile and verification. The name can be corrected with a password confirmation; email and phone changes are proven cross-channel.",
  "account.profileLoadError": "We could not load your profile. The session is still active.",
  "account.retrying": "Retrying\u2026",
  "account.retry": "Retry",
  "account.identity": "Identity",
  "account.name": "Name",
  "account.adminBadge": "Admin",
  "account.identityCopy": "A typo at registration never forces a new account \u2014 the edit is confirmed with your current password.",
  "account.edit": "Edit",
  "account.currentPassword": "Current password",
  "account.nameRequired": "A name is required.",
  "account.passwordRequired": "Your current password is required.",
  "account.saving": "Saving\u2026",
  "account.save": "Save changes",
  "account.cancel": "Cancel",
  "account.contacts": "Contacts",
  "account.emailLabel": "Email address",
  "account.phoneLabel": "Phone number",
  "account.verified": "Verified",
  "account.completeVerification": "Complete verification",
  "account.changeEmail": "Change email address",
  "account.emailDone.before": "Your email is now",
  "account.emailDone.after": ". The next time you sign in, use the new address.",
  "account.changeAgain": "Change it again",
  "account.newEmail": "New email",
  "account.newEmailPlaceholder": "new@example.ee",
  "account.emailTooLong": "Email must be 255 characters or fewer.",
  "account.emailRequired": "A valid email is required.",
  "account.emailProof": "For security, changing the email is confirmed by an SMS code sent to the phone number on your account \u2014 never to the new address.",
  "account.smsCode": "SMS code",
  "account.codePlaceholder": "6-digit code",
  "account.smsCodeRequired": "Enter the 6-digit code from the SMS.",
  "account.smsSentHint": "We sent an SMS code to the phone number on your account.",
  "account.working": "Working\u2026",
  "account.confirmNewEmail": "Confirm new email",
  "account.resendIn": "Resend in {time}",
  "account.resendCode": "Resend code",
  "account.sending": "Sending\u2026",
  "account.sendIn": "Send in {time}",
  "account.sendSmsToPhone": "Send SMS code to my phone",
  "account.changePhone": "Change phone number",
  "account.phoneDone.before": "Your phone is now",
  "account.phoneDone.after": ".",
  "account.newPhone": "New phone",
  "account.newPhonePlaceholder": "+3725\u2026 or 5xxxxxxx",
  "account.phoneTooLong": "Phone must be 64 characters or fewer.",
  "account.phoneRequired": "A phone number is required.",
  "account.phoneProof": "For security, changing the phone is confirmed by an email code sent to the email address on your account \u2014 losing your SIM alone cannot re-route verification.",
  "account.emailCode": "Email code",
  "account.emailCodeRequired": "Enter the 6-digit code from the email.",
  "account.emailCodeSentHint": "We sent an email code to the email address on your account.",
  "account.confirmNewPhone": "Confirm new phone",
  "account.sendEmailCode": "Send email code to my email",
  "account.contributions": "My contributions",
  "account.contributionsCopy": "The shelters you submitted \u2014 edit or remove them here.",
  "account.yourData": "Your data",
  "account.dataCopy": "Download a JSON file with everything tied to your account \u2014 your profile (name, email, phone) and the shelters you submitted.",
  "account.preparing": "Preparing\u2026",
  "account.downloadData": "Download my data (JSON)",
  "account.deleting": "Deleting\u2026",
  "account.delete": "Delete account",
  "account.delete.adminCopy": "This account was provisioned by the deployment environment, so it cannot be deleted from the app. De-provisioning is an operator action \u2014 removing the ADMIN_EMAIL and ADMIN_PASSWORD environment variables \u2014 and the server refuses the deletion either way.",
  "account.delete.copy": "Erases your account and everything tied to it. Shelters you declared as a private home are removed; public shelters you submitted stay on the map without a submitter. This cannot be undone.",
  "account.delete.typeHint": "Type DELETE to confirm",
  "account.delete.armed": "Erasure armed \u2014 select \u201CDelete my account\u201D to confirm.",
  "account.delete.button": "Delete my account",
  "account.legal": "Legal",
  "account.legal.lead": "Read the",
  "account.legal.and": "and the",
  "account.legal.tail": ".",
  "account.success.profileUpdated": "Your profile has been updated.",
  "account.success.emailChanged": "Your email address has been changed.",
  "account.success.phoneChanged": "Your phone number has been changed.",
  "account.success.exportDownloaded": "Your data export has been downloaded.",
  "account.error.sameValue": "That is already the value on your account \u2014 the new one must be different.",
  // --- account: contributions panel.
  "account.contrib.shelters": "Shelters",
  "account.contrib.loading": "Loading your shelters\u2026",
  "account.contrib.empty": "You haven't submitted any shelters yet.",
  "account.contrib.emptyCta": "Submit your first shelter",
  "account.contrib.submit": "Submit a shelter",
  "account.contrib.source.paasteamet": "P\xE4\xE4steamet registry",
  "account.contrib.source.municipality": "Municipal registry",
  "account.contrib.badge.new": "Newly added",
  "account.contrib.badge.confirmed": "Community-checked",
  "account.contrib.badge.rejected": "Rejected",
  "account.contrib.infoRequest": "Info request",
  "account.contrib.adminNote": "Admin note: {note}",
  "account.contrib.inaccurate": "Reported inaccurate \u2014 details may be wrong",
  "account.contrib.hidden": "Hidden \u2014 reported by the community ({count})",
  "account.contrib.view": "View",
  "account.contrib.info": "Info",
  "account.contrib.infoClose": "Close info",
  "account.contrib.delete": "Delete",
  "account.contrib.deleteConfirm": "Delete this shelter permanently?",
  "account.contrib.deleteConfirmButton": "Confirm delete",
  "account.contrib.nameLabel": "Name",
  "account.contrib.nameRequired": "A name (up to 200 characters) is required.",
  "account.contrib.descriptionLabel": "Description (optional)",
  "account.contrib.descriptionTooLong": "Description must be 2000 characters or fewer.",
  "account.contrib.latitudeLabel": "Latitude (\u221290\u202690)",
  "account.contrib.latitudeError": "A latitude between \u221290 and 90 is required.",
  "account.contrib.longitudeLabel": "Longitude (\u2212180\u2026180)",
  "account.contrib.longitudeError": "A longitude between \u2212180 and 180 is required.",
  "account.contrib.estoniaNote": "The location must be inside Estonia. That check happens on the server.",
  "account.contrib.infoQuestion": "A moderator is asking:",
  "account.contrib.replyLabel": "Your reply (required, one-time)",
  "account.contrib.replyRequired": "A reply (up to 2000 characters) is required.",
  "account.contrib.sendReply": "Send reply",
  "account.contrib.reply": "Your reply",
  // --- verify page (/verify).
  "verify.title": "Verify your account",
  "verify.subtitle": "Verified accounts can submit shelters and report listed locations. Prove you own your email and phone \u2014 the codes arrive out-of-band, one per channel.",
  "verify.aria": "Verification status",
  "verify.verified": "Verified",
  "verify.notVerified": "Not verified",
  "verify.intro": "We'll send a code to your {destination}. You enter it here to prove it's yours.",
  "verify.email.title": "Verify your email",
  "verify.email.destination": "email address",
  "verify.email.noun": "email",
  "verify.email.send": "Send code to my email",
  "verify.email.sentHint": "A verification code has been sent to your email address.",
  "verify.email.codeLabel": "Verification code",
  "verify.email.codeHint": "Enter the 8-character code from the email.",
  "verify.email.placeholder": "8-character code",
  "verify.phone.title": "Verify your phone",
  "verify.phone.destination": "phone number",
  "verify.phone.noun": "phone",
  "verify.phone.send": "Text code to my phone",
  "verify.phone.sentHint": "An SMS code has been sent to your phone number.",
  "verify.phone.codeLabel": "SMS code",
  "verify.phone.codeHint": "Enter the 6-digit code from the SMS.",
  "verify.phone.placeholder": "6-digit code",
  "verify.verifying": "Verifying\u2026",
  "verify.verify": "Verify",
  "verify.fullyVerified": "You're fully verified",
  "verify.fullyVerifiedCopy": "Your email and phone are verified \u2014 you can now submit shelters and report listed locations.",
  "verify.verifiedCopy": "You're verified. You can submit shelters and report listed locations.",
  "verify.continue": "Continue",
  "verify.manageAccount": "Manage account",
  "verify.backToMap": "Back to the map",
  "verify.alreadyVerified": "Your {noun} is already verified.",
  "verify.verifiedNotice": "Your {noun} is verified.",
  // --- crisis guidance (/blog — crisis-guidance D4/D6). The post title and
  // body are admin copy (rendered verbatim), never catalog keys.
  "guidance.title": "Crisis guidance",
  "guidance.subtitle": "Practical guidance for crisis situations.",
  "guidance.loading": "Loading guidance\u2026",
  "guidance.loadingDetail": "Loading guidance post\u2026",
  "guidance.empty": "No guidance yet \u2014 check back soon.",
  "guidance.backToList": "Back to all guidance",
  "guidance.notFoundTitle": "Guidance post not found",
  "guidance.notFoundBody": "This guidance post does not exist \u2014 it may have been unpublished.",
  "guidance.published": "Published",
  "guidance.localeFallback": "This post is shown in {locale} \u2014 it is not available in {reader}.",
  "guidance.localeFallback.alternate": "Read the {locale} version",
  // --- list paging (list-page-paging: the shared prev/next + size control).
  "pagination.aria": "Pages",
  "pagination.previous": "Previous",
  "pagination.next": "Next",
  "pagination.pageOf": "Page {page} of {pages}",
  "pagination.size": "Per page",
  "pagination.sizeShelters": "Shelters per page",
  "pagination.sizeReports": "Reports per page",
  "pagination.sizeUsers": "Accounts per page",
  "pagination.sizeMedia": "Images per page",
  "pagination.sizeAudit": "Audit rows per page",
  "guidance.pageOutOfRange": "Page {page} does not exist \u2014 the index ends at page {pages}.",
  "guidance.pageFirst": "Show the first page",
  // --- admin: guidance tab + editor + media library (crisis-guidance D8).
  "admin.retry": "Retry",
  "admin.settings.tab": "Settings",
  "admin.tabs.aria": "Admin sections",
  "admin.tabs.unconfirmed": "Unconfirmed",
  "admin.tabs.shelters": "Shelters",
  "admin.tabs.reports": "Shelter reports",
  "admin.tabs.alerts": "Alerts",
  "admin.tabs.users": "Users",
  "admin.tabs.audit": "Audit log",
  "admin.working": "Working\u2026",
  "admin.cancel": "Cancel",
  "admin.unconfirmed.loading": "Loading community locations\u2026",
  "admin.unconfirmed.empty": "No unconfirmed community locations.",
  "admin.unconfirmed.aria": "Unconfirmed community locations",
  "admin.unconfirmed.col.name": "Name",
  "admin.unconfirmed.col.address": "Address",
  "admin.unconfirmed.col.submitter": "Submitter",
  "admin.unconfirmed.col.actions": "Actions",
  "admin.unconfirmed.confirm": "Mark confirmed",
  "admin.unconfirmed.reject": "Reject",
  "admin.unconfirmed.reject.label": "Reason (required)",
  "admin.unconfirmed.reject.placeholder": "Why is this location rejected?",
  "admin.unconfirmed.reject.required": "A reason is required (max {max} characters).",
  "admin.shelters.search.label": "Search shelters (name or address)",
  "admin.shelters.search.placeholder": "e.g. kelder",
  "admin.shelters.search.button": "Search",
  "admin.shelters.source.aria": "Filter shelters by source",
  "admin.shelters.source.all": "All",
  "admin.shelters.source.registry": "Registry",
  "admin.shelters.source.community": "Community",
  "admin.shelters.loading": "Loading shelters\u2026",
  "admin.shelters.empty": "No shelters.",
  "admin.shelters.emptyFiltered": "No shelters match the current filter.",
  "admin.shelters.pageOutOfRange": "Page {page} does not exist \u2014 the list ends at page {pages}.",
  "admin.shelters.aria": "Shelters",
  "admin.shelters.col.name": "Name",
  "admin.shelters.col.source": "Source",
  "admin.shelters.col.status": "Status",
  "admin.shelters.col.reports": "Reports",
  "admin.shelters.col.occupancy": "Occupancy",
  "admin.shelters.col.submitter": "Submitter",
  "admin.shelters.col.actions": "Actions",
  "admin.shelters.status.hidden": "Hidden",
  "admin.shelters.status.active": "Active",
  "admin.shelters.history": "History",
  "admin.shelters.history.close": "Close history",
  "admin.shelters.info": "Info",
  "admin.shelters.info.close": "Close info",
  "admin.shelters.inaccurate.clear": "Clear inaccurate",
  "admin.shelters.inaccurate.mark": "Mark inaccurate",
  "admin.shelters.inaccurate.markClose": "Close mark",
  "admin.shelters.hide": "Hide",
  "admin.shelters.activate": "Activate",
  "admin.shelters.delete": "Delete",
  "admin.shelters.delete.confirm": "Delete this shelter permanently?",
  "admin.shelters.delete.working": "Deleting\u2026",
  "admin.shelters.delete.confirmButton": "Confirm delete",
  "admin.shelters.readOnly": "read-only",
  "admin.shelters.history.loading": "Loading history\u2026",
  "admin.shelters.history.empty": "No history yet.",
  "admin.shelters.info.request": "Info request",
  "admin.shelters.info.answer": "Answer",
  "admin.shelters.info.waiting": "Waiting for the submitter's answer.",
  "admin.shelters.info.question.label": "Question for the submitter (required)",
  "admin.shelters.info.question.placeholder": "What do you need from the submitter?",
  "admin.shelters.info.question.required": "A question is required (max {max} characters).",
  "admin.shelters.info.send": "Send",
  "admin.shelters.info.sending": "Sending\u2026",
  "admin.shelters.inaccurate.reason.label": "Reason (optional)",
  "admin.shelters.inaccurate.reason.placeholder": "What did you find to be inaccurate?",
  "admin.shelters.inaccurate.reason.max": "Max {max} characters.",
  "admin.shelters.inaccurate.marking": "Marking\u2026",
  "admin.shelters.inaccurate.badge": "Inaccurate",
  "admin.shelters.success.confirmed": "Location confirmed.",
  "admin.shelters.success.rejected": "Location rejected.",
  "admin.shelters.success.hidden": "Shelter hidden.",
  "admin.shelters.success.restored": "Shelter restored.",
  "admin.shelters.success.deleted": "Shelter deleted.",
  "admin.shelters.success.questionSent": "Question sent to the submitter.",
  "admin.shelters.success.inaccurateMarked": "Marked as inaccurate.",
  "admin.shelters.success.inaccurateCleared": "Inaccurate mark cleared.",
  "admin.reports.loading": "Loading reports\u2026",
  "admin.reports.empty": "No reports.",
  "admin.reports.dismissed": "Dismissed",
  "admin.reports.notCounted": "Not counted",
  "admin.reports.notCounted.reason": "Not counted: the reporter already has a shelter with the same name at the same location.",
  "admin.reports.restore": "Restore shelter",
  "admin.reports.dismiss": "Dismiss",
  "admin.reports.success.dismissed": "Report dismissed.",
  // reports tab: the hide-dismissed filter — the default ('All') renders
  // everything, so the control never hides silently.
  "admin.reports.filter.aria": "Filter the report queue",
  "admin.reports.filter.all": "All",
  "admin.reports.filter.open": "Open only",
  "admin.reports.emptyOpen": "No open reports.",
  "admin.reports.pageOutOfRange": "Page {page} does not exist \u2014 the list ends at page {pages}.",
  "admin.users.pageOutOfRange": "Page {page} does not exist \u2014 the list ends at page {pages}.",
  "admin.media.pageOutOfRange": "Page {page} does not exist \u2014 the list ends at page {pages}.",
  "admin.audit.pageOutOfRange": "Page {page} does not exist \u2014 the list ends at page {pages}.",
  "admin.alerts.loading": "Loading alerts\u2026",
  "admin.alerts.empty": "No throttled or abusive activity yet.",
  "admin.alerts.aria": "Abuse alerts",
  "admin.alerts.col.when": "When",
  "admin.alerts.col.type": "Type",
  "admin.alerts.col.subject": "Subject",
  "admin.alerts.col.detail": "Detail",
  "admin.alerts.col.retryAfter": "Retry after",
  "admin.users.loading": "Loading accounts\u2026",
  "admin.users.empty": "No accounts yet.",
  "admin.users.aria": "Accounts",
  "admin.users.col.name": "Name",
  "admin.users.col.email": "E-mail",
  "admin.users.col.kind": "Kind",
  "admin.users.col.status": "Status",
  "admin.users.col.actions": "Actions",
  "admin.users.suspended": "Suspended",
  "admin.users.active": "Active",
  "admin.users.suspend.confirm": "Suspend this account? It loses login, refresh and its open session; its shelters stay on the map.",
  "admin.users.unsuspend.confirm": "Restore this account's access?",
  "admin.users.suspend.confirmButton": "Confirm suspend",
  "admin.users.unsuspend.confirmButton": "Confirm unsuspend",
  "admin.users.suspend": "Suspend",
  "admin.users.unsuspend": "Unsuspend",
  "admin.users.notSuspendable": "Not suspendable",
  "admin.users.success.suspended": "User suspended.",
  "admin.users.success.unsuspended": "User unsuspended.",
  "admin.audit.loading": "Loading audit log\u2026",
  "admin.audit.empty": "No moderation actions yet.",
  "admin.audit.aria": "Audit log",
  "admin.audit.col.when": "When",
  "admin.audit.col.moderator": "Moderator",
  "admin.audit.col.subject": "Subject",
  "admin.audit.col.action": "Action",
  "admin.audit.col.change": "Change",
  "admin.audit.col.reason": "Reason",
  "admin.siteTexts.loading": "Loading site texts\u2026",
  "admin.siteTexts.hint1": "Leave a field blank to use the shipped default (shown as the placeholder). Saving a cleared field removes the override. Link URLs must start with ",
  "admin.siteTexts.hint2": " and are shared by all three languages.",
  "admin.siteTexts.linkLabel": "Link (https, all languages)",
  "admin.siteTexts.saving": "Saving\u2026",
  "admin.siteTexts.save": "Save changes",
  "admin.siteTexts.loadError": "Failed to load the site texts.",
  "admin.siteTexts.urlError": "Link URLs must start with https://.",
  "admin.siteTexts.noChanges": "No changes to save.",
  "admin.siteTexts.saved": "Saved.",
  "admin.siteTexts.saveFailed": "Save failed.",
  "admin.siteTexts.saveFailedWith": "Save failed: {message}",
  "admin.guidance.tab": "Guidance",
  "admin.guidance.loading": "Loading guidance posts\u2026",
  "admin.guidance.empty": "No guidance posts yet.",
  "admin.guidance.emptyLocale": "No guidance posts in {locale} yet.",
  "admin.guidance.shownIn": "Posts in {locale} \u2014 the other languages are edited from their own lists.",
  "admin.guidance.search.label": "Search posts (title or body)",
  "admin.guidance.search.placeholder": "e.g. kelder",
  "admin.guidance.search.button": "Search",
  "admin.guidance.search.clear": "Clear",
  "admin.guidance.noMatch": 'No posts matching "{query}" in {locale}.',
  "admin.guidance.pageOutOfRange": "Page {page} does not exist \u2014 the list ends at page {pages}.",
  "admin.pageFirst": "Show the first page",
  "admin.guidance.language.label": "Content language",
  "admin.guidance.language.hint": "The language of the posts listed and edited here. On first use it follows the interface language; afterwards it is independent.",
  "admin.guidance.create": "New post",
  "admin.guidance.col.title": "Title",
  "admin.guidance.col.position": "Position",
  "admin.guidance.col.status": "Status",
  "admin.guidance.col.locale": "Locale",
  "admin.guidance.col.pinned": "Pinned",
  "admin.guidance.col.published": "Published",
  "admin.guidance.col.updated": "Updated",
  "admin.guidance.col.actions": "Actions",
  "admin.guidance.posts.aria": "Guidance posts",
  "admin.guidance.order.hint": "The posts appear to visitors in this order \u2014 drag a row or use the move buttons.",
  "admin.guidance.order.pagedHint": "Reordering needs the whole list on one page \u2014 set the page size to {max} to reorder.",
  "admin.guidance.move.top": "To top",
  "admin.guidance.move.up": "Up",
  "admin.guidance.move.down": "Down",
  "admin.guidance.move.top.aria": 'Move "{title}" to the top',
  "admin.guidance.move.up.aria": 'Move "{title}" up',
  "admin.guidance.move.down.aria": 'Move "{title}" down',
  "admin.guidance.status.draft": "Draft \u2014 not public",
  "admin.guidance.status.published": "Published",
  "admin.guidance.pinned.yes": "Yes",
  "admin.guidance.pinned.no": "No",
  "admin.guidance.edit": "Edit",
  "admin.guidance.publish": "Publish",
  "admin.guidance.unpublish": "Unpublish",
  "admin.guidance.delete": "Delete",
  "admin.guidance.delete.confirm": "Delete this post permanently? Its image stays in the media library.",
  "admin.guidance.delete.confirmButton": "Confirm delete",
  "admin.guidance.delete.cancel": "Cancel",
  "admin.guidance.working": "Working\u2026",
  "admin.guidance.success.created": "Post created.",
  "admin.guidance.success.updated": "Post updated.",
  "admin.guidance.success.published": "Post published.",
  "admin.guidance.success.unpublished": "Post unpublished.",
  "admin.guidance.success.deleted": "Post deleted.",
  "admin.guidance.success.reordered": "Order saved.",
  "admin.guidance.success.translationCreated": "Translation created.",
  "admin.guidance.success.translationUpdated": "Translation updated.",
  "admin.guidance.success.translationDeleted": "Translation deleted.",
  "admin.guidance.editor.createTitle": "New guidance post",
  "admin.guidance.editor.editTitle": "Edit guidance post",
  "admin.guidance.editor.loading": "Loading the post\u2026",
  "admin.guidance.editor.titleLabel": "Title *",
  "admin.guidance.editor.titleRequired": "A title is required.",
  "admin.guidance.editor.titleTooLong": "Title must be 255 characters or fewer.",
  "admin.guidance.editor.slugLabel": "Slug (optional)",
  "admin.guidance.editor.slugHint.create": "Lowercase letters, numbers and dashes. Leave blank to generate one from the title.",
  "admin.guidance.editor.slugHint.edit": "Lowercase letters, numbers and dashes. Leave blank to keep the current slug.",
  "admin.guidance.editor.slugInvalid": "Use lowercase letters, numbers and dashes (no leading or trailing dash).",
  "admin.guidance.editor.bodyLabel": "Body *",
  "admin.guidance.editor.bodyHint": "Only the toolbar formatting survives saving \u2014 no H1 and no inline images, deliberately (the page owns the heading and the hero image). Pasted content keeps only the formatting the toolbar offers.",
  "admin.guidance.editor.bodyRequired": "A body is required.",
  "admin.guidance.editor.link.prompt": "Link URL (http, https or mailto):",
  "admin.guidance.editor.link.invalid": "Only http, https and mailto links are kept \u2014 use a full link starting with https:// or mailto:.",
  "admin.guidance.editor.link.noSelection": "Select the text to link first.",
  "admin.guidance.editor.heroLabel": "Hero image",
  "admin.guidance.editor.hero.current": "Current image",
  "admin.guidance.editor.hero.choose": "Choose from the media library",
  "admin.guidance.editor.hero.loading": "Loading the media library\u2026",
  "admin.guidance.editor.hero.empty": "No images in the media library yet \u2014 upload one in the Media library tab.",
  "admin.guidance.editor.hero.remove": "Remove image",
  /** The hero picker's upload control: the file input's label (the backend
   *  accepts exactly these three types, magic-byte checked). */
  "admin.guidance.editor.hero.uploadLabel": "Upload an image",
  /** 413 from the upload: over the server's size cap (MEDIA_MAX_BYTES). */
  "admin.guidance.editor.hero.uploadError.tooLarge": "That image is larger than the 5 MB upload cap.",
  /** 400 from the upload: not a readable image, or the declared type
   *  contradicts the bytes (the server's magic-byte check). */
  "admin.guidance.editor.hero.uploadError.unsupported": "That file is not a supported image (JPEG, PNG or WebP), or its type does not match.",
  /** Any other upload failure (5xx, network): the generic retry copy. */
  "admin.guidance.editor.hero.uploadError.generic": "The image upload failed. Please try again.",
  /** The hero-import URL input's label: a PENDING import stored with the
   *  draft, fetched by the server at publish. */
  "admin.guidance.editor.hero.importLabel": "Import from URL (optional)",
  /** Always-on hint: nothing is fetched at edit time — the server
   *  fetches, validates and stores the image at the next publish. */
  "admin.guidance.editor.hero.importHint": "The image is not fetched while you edit \u2014 the URL is stored with the draft, and the server fetches, validates and stores it when the post is published.",
  /** The URL failed the shape check (mirrors the backend's write-time
   *  400s): not a full http(s) address, or it embeds credentials. */
  "admin.guidance.editor.hero.importInvalid": "Use a full http:// or https:// address without a username or password. Leave it blank for no import.",
  /** The explicit "no image" tick (checked = no library asset AND no
   *  pending import URL; the hero choice controls are disabled). */
  "admin.guidance.editor.hero.none": "No image",
  /** Shown while a pending import URL is stored: the fetch happens at
   *  publish, and a failed fetch fails the publish (the draft keeps the
   *  URL intact). */
  "admin.guidance.editor.hero.importNote": "Nothing has been fetched yet. On publish the server downloads the image \u2014 if the fetch fails, the publish fails and this draft keeps the URL.",
  "admin.guidance.editor.altLabel": "Hero image alt text (optional)",
  "admin.guidance.editor.altRequired": "Alt text is required when a hero image is chosen.",
  "admin.guidance.editor.altForbidden": "Remove the alt text or choose a hero image.",
  "admin.guidance.editor.altTooLong": "Alt text must be 300 characters or fewer.",
  "admin.guidance.editor.localeLabel": "Post language",
  "admin.guidance.editor.localeHint": "The post's home language, e.g. en. Prefilled: the active UI language when creating, the post's own when editing.",
  "admin.guidance.editor.localeTooLong": "Locale must be 5 characters or fewer.",
  "admin.guidance.editor.editingIn": "You are editing the {locale} content of this post.",
  "admin.guidance.editor.creatingIn": "This post will be created in {locale}.",
  "admin.guidance.editor.homeLocaleNote": "The post's home language is {home}. Saving changes only the {locale} content \u2014 the other languages keep their own text.",
  "admin.guidance.editor.translatingIn": "You are adding the {locale} translation of this post \u2014 the other languages are untouched.",
  "admin.guidance.editor.editingTranslationIn": "You are editing the {locale} translation of this post \u2014 the other languages are untouched.",
  "admin.guidance.editor.translationTitle": "Add a translation",
  "admin.guidance.editor.translationEditTitle": "Edit a translation",
  "admin.guidance.editor.translations.title": "Translations",
  "admin.guidance.editor.translations.loading": "Loading translations\u2026",
  "admin.guidance.editor.translations.empty": "No translations yet \u2014 only the post's home language.",
  "admin.guidance.editor.translations.home": "home",
  "admin.guidance.editor.translations.add": "Add {locale} translation",
  "admin.guidance.editor.translations.edit": "Edit translation",
  "admin.guidance.editor.translations.delete": "Delete translation",
  "admin.guidance.editor.translations.delete.confirm": "Delete the {locale} translation of this post? The {locale} text is removed; the post and its other languages stay.",
  "admin.guidance.editor.pinnedLabel": "Pin this post to the top of the guidance list",
  "admin.guidance.editor.statusLabel": "Publish",
  "admin.guidance.editor.status.draft": "Save as draft",
  "admin.guidance.editor.status.publish": "Save and publish",
  "admin.guidance.editor.statusNote": "The publication state is changed with the Publish and Unpublish actions on the list.",
  /** Edit mode, draft post: the at-a-glance state line (a draft is not
   *  public until published; names the way out). A published post keeps
   *  the statusNote instead (no nag). */
  "admin.guidance.editor.draftState": "This post is a draft \u2014 it is not visible on /blog until you publish it. Use Publish in the list.",
  /** After a create-mode draft save: the consequence + the way out. A
   *  normal state, not an error (the editor's info notice). */
  "admin.guidance.editor.savedAsDraft": "Saved as a draft. It is not visible on /blog until you publish it \u2014 use Publish in the list, or save and publish.",
  /** After an edit of an existing draft: it stays a draft, still not
   *  visible on /blog until published (the edit payload carries no
   *  status). */
  "admin.guidance.editor.stillDraft": "Saved. It is still a draft, so it is not visible on /blog until you publish it \u2014 use Publish in the list.",
  "admin.guidance.editor.save": "Save",
  "admin.guidance.editor.saving": "Saving\u2026",
  "admin.guidance.editor.cancel": "Cancel",
  "admin.media.tab": "Media library",
  "admin.media.loading": "Loading the media library\u2026",
  "admin.media.empty": "No images in the library yet.",
  "admin.media.upload": "Upload image",
  "admin.media.uploading": "Uploading\u2026",
  "admin.media.uploadHint": "JPEG, PNG or WebP.",
  "admin.media.col.image": "Image",
  "admin.media.col.file": "File",
  "admin.media.col.dimensions": "Dimensions",
  "admin.media.col.size": "Size",
  "admin.media.col.uploaded": "Uploaded",
  "admin.media.col.usedBy": "Used by",
  "admin.media.col.actions": "Actions",
  "admin.media.library.aria": "Media library",
  "admin.media.delete": "Delete",
  "admin.media.delete.working": "Checking\u2026",
  "admin.media.delete.inUse": "This image is still used by a guidance post. Deleting it removes the hero image from the affected posts.",
  "admin.media.delete.confirmButton": "Delete anyway",
  "admin.media.delete.cancel": "Cancel",
  "admin.media.success.uploaded": "Image uploaded.",
  "admin.media.success.deleted": "Image deleted.",
  // --- legal pages (legal-i18n M4): one key per paragraph/heading, splice
  // segments around the inline emphasis/links. The section heading keys
  // double as the TOC link labels. EN values are verbatim from the old
  // static templates (the page specs assert on them).
  "legal.toc.aria": "Table of contents",
  // privacy policy (/privacy)
  "legal.privacy.title": "Privacy policy",
  "legal.privacy.updated": "Last updated: 16 September 2026",
  "legal.privacy.who": "Who operates OpenShelter",
  "legal.privacy.scope": "Scope of this policy",
  "legal.privacy.collect": "What personal data we collect",
  "legal.privacy.why": "Why we process each category",
  "legal.privacy.verification": "Account creation and verification",
  "legal.privacy.location": "Location and geolocation",
  "legal.privacy.content": "User-generated content",
  "legal.privacy.cookies": "Cookies and browser storage",
  "legal.privacy.thirdParties": "Third-party service providers",
  "legal.privacy.sharing": "Data sharing",
  "legal.privacy.retention": "Data retention",
  "legal.privacy.rights": "Your rights under the GDPR",
  "legal.privacy.security": "Data security",
  "legal.privacy.children": "Children",
  "legal.privacy.changes": "Changes to this policy",
  "legal.privacy.contact": "Contact",
  "legal.privacy.who.p1": "OpenShelter is an open-source, community-maintained map of shelters and safe places in Estonia. It is operated by [OPERATOR LEGAL NAME], [POSTAL ADDRESS]. The data protection contact is [DATA PROTECTION CONTACT].",
  "legal.privacy.who.p2.before": "OpenShelter is ",
  "legal.privacy.who.p2.strong": "not an official government service",
  "legal.privacy.who.p2.after": " and not an emergency service. Official shelter data shown in the application is imported from the Estonian Rescue Board (P\xE4\xE4steamet) open data, but the application itself is operated independently.",
  "legal.privacy.scope.p1": "This policy describes how OpenShelter collects, uses, stores and deletes personal data when you use the web application. It is intended to describe the application's actual behaviour. It does not apply to the external websites we link to (the Estonian Rescue Board, Maa-amet and OpenStreetMap).",
  "legal.privacy.collect.p1": "We collect only what the application needs to work. When you create an account we store:",
  "legal.privacy.collect.li1.before": "your ",
  "legal.privacy.collect.li1.strong": "full name",
  "legal.privacy.collect.li1.after": ";",
  "legal.privacy.collect.li2.before": "your ",
  "legal.privacy.collect.li2.strong": "e-mail address",
  "legal.privacy.collect.li2.after": ";",
  "legal.privacy.collect.li3.before": "your ",
  "legal.privacy.collect.li3.strong": "phone number",
  "legal.privacy.collect.li3.after": ";",
  "legal.privacy.collect.li4.before": "your ",
  "legal.privacy.collect.li4.strong": "password",
  "legal.privacy.collect.li4.after": ", stored only as a one-way hash.",
  "legal.privacy.collect.p2.before": "We do ",
  "legal.privacy.collect.p2.strong": "not",
  "legal.privacy.collect.p2.middle": " collect a national identification code, and we do not use advertising, analytics or cross-site tracking. When you contribute to the map we store the content you submit (shelters and reports), as described under ",
  "legal.privacy.collect.p2.link": "user-generated content",
  "legal.privacy.collect.p2.after": ".",
  "legal.privacy.why.p1": "Each category is processed for a specific purpose, and for no other purpose:",
  "legal.privacy.why.li1.strong": "Name",
  "legal.privacy.why.li1.after": " - shown on your account and, for public submissions, on the map.",
  "legal.privacy.why.li2.strong": "E-mail address",
  "legal.privacy.why.li2.after": " - account verification, password resets and cross-channel confirmation when you change your phone number.",
  "legal.privacy.why.li3.strong": "Phone number",
  "legal.privacy.why.li3.after": " - account verification, sign-in and cross-channel confirmation when you change your e-mail address.",
  "legal.privacy.why.li4.strong": "Password",
  "legal.privacy.why.li4.after": " - authentication. It is stored only as a one-way hash, so it can never be read back.",
  "legal.privacy.why.li5.strong": "Submitted content",
  "legal.privacy.why.li5.after": " - shown on the public map and used by administrators for moderation and abuse prevention.",
  "legal.privacy.why.p2": "The legal basis for each purpose is [LEGAL BASIS TO BE CONFIRMED]. This document is intended to describe the processing; it is not a legal opinion.",
  "legal.privacy.verification.p1": "You may browse the map without an account. To submit shelters or reports you must create an account and verify both your e-mail address and your phone number. Verification works by sending a one-time code to each contact; until both are verified you can sign in but cannot contribute.",
  "legal.privacy.verification.p2": "Password resets are performed by a one-time code sent to your e-mail address. Changing your e-mail address is confirmed with a code sent to your current phone number, and changing your phone number is confirmed with a code sent to your current e-mail address.",
  "legal.privacy.verification.p3": "To prevent abuse, the application applies rate limits on code requests and on shelter submissions, and detects near-duplicate submissions. Exceeding a limit produces an error, not a ban.",
  "legal.privacy.location.p1.before": "We only ever see your location when ",
  "legal.privacy.location.p1.em": "you",
  "legal.privacy.location.p1.after": ` ask for it. The "Show shelters around you" button and the "Use my location" option on the submit form first show your browser's own permission prompt. If you decline, nothing changes.`,
  "legal.privacy.location.p2.before": "On the map, the nearest shelter is worked out ",
  "legal.privacy.location.p2.strong": "inside your browser",
  "legal.privacy.location.p2.after": "; your live position is never sent to our servers. If you submit a shelter at your position, only the coordinate you choose is stored, as part of that submission.",
  "legal.privacy.location.p3.before": "We ",
  "legal.privacy.location.p3.strong": "never",
  "legal.privacy.location.p3.after": " infer your location from your IP address. Address search uses the OpenStreetMap Nominatim service; a search request is sent only when you deliberately search for an address.",
  "legal.privacy.content.p1.before": "When you contribute, the application stores your shelters and your reports (for example, that a location is closed, inaccurate, or no longer exists). This content becomes part of the public community map. You can edit or remove your own shelters from the ",
  "legal.privacy.content.p1.after": "; reports are reviewed by administrators.",
  "legal.privacy.content.p2": "Moderators can review, hide, correct or remove user-submitted content. The application keeps a moderation record so decisions can be audited.",
  "legal.privacy.cookies.p1": "OpenShelter does not use advertising cookies. It stores only the following items in your browser's local storage, each of which is technically necessary:",
  "legal.privacy.cookies.li1.before": "a ",
  "legal.privacy.cookies.li1.strong": "sign-in token",
  "legal.privacy.cookies.li1.after": " that keeps you logged in across page reloads;",
  "legal.privacy.cookies.li2.before": "your ",
  "legal.privacy.cookies.li2.strong": "language preference",
  "legal.privacy.cookies.li2.after": " (Estonian or English);",
  "legal.privacy.cookies.li3.before": "your ",
  "legal.privacy.cookies.li3.strong": "display preference",
  "legal.privacy.cookies.li3.after": " (high-contrast mode).",
  "legal.privacy.cookies.p2": "Your access token is held in memory only and is discarded when you close the tab. No third party receives these items, and there are no optional analytics or tracking technologies to accept or reject.",
  "legal.privacy.thirdParties.p1": "We use a small number of third-party services, each only to deliver a specific function:",
  "legal.privacy.thirdParties.li1.before": "an ",
  "legal.privacy.thirdParties.li1.strong": "e-mail delivery service",
  "legal.privacy.thirdParties.li1.after": " (SendPulse, via SMTP) to send verification and password-reset codes. It receives the destination e-mail address to deliver the message.",
  "legal.privacy.thirdParties.li2.before": "a ",
  "legal.privacy.thirdParties.li2.strong": "text-message service",
  "legal.privacy.thirdParties.li2.after": " (Twilio) to send verification codes. It receives the destination phone number to deliver the message.",
  "legal.privacy.thirdParties.li3.strong": "OpenStreetMap",
  "legal.privacy.thirdParties.li3.after": " map tiles and the Nominatim geocoding service, which receive the map area you view or the address you search for.",
  "legal.privacy.thirdParties.p2": "The official shelter data is imported from the Estonian Rescue Board (P\xE4\xE4steamet) open data; that is an inbound data source, not a service we send your data to. Whether any of these providers involves an international transfer is [TO BE CONFIRMED].",
  "legal.privacy.sharing.p1": "We do not sell your personal data and do not share it for advertising or any other commercial purpose. The only disclosures are to the service providers listed above, in order to deliver the messages you request. Shelter data you submit becomes part of the public community list; after you delete your account, public submissions remain on the map without attribution.",
  "legal.privacy.retention.p1": "Your account data is kept for as long as your account exists. Deleting your account removes your personal data immediately: shelters you declared as a private home are removed, and public shelters you submitted stay on the map without a submitter.",
  "legal.privacy.retention.p2.before": "We also apply fixed retention periods: an account with no sign-in activity (registration, login, or session refresh) for ",
  "legal.privacy.retention.p2.strong": "24 months",
  "legal.privacy.retention.p2.middle": " is deleted with the same erasure rule as account deletion, and moderation and audit records older than ",
  "legal.privacy.retention.p2.strong2": "24 months",
  "legal.privacy.retention.p2.after": " are removed.",
  "legal.privacy.retention.p3.before": "Those periods are the app's retention rule. The scheduled job that enforces them is a deployment-level switch (",
  "legal.privacy.retention.p3.code": "RETENTION_ENABLED",
  "legal.privacy.retention.p3.after": "): it is off in this repository's development setup, and it is enabled by whoever operates a deployment. In a deployment where the job is off, inactive accounts and old audit records are simply kept.",
  "legal.privacy.retention.p4": "Public community submissions are never removed automatically: they stay on the map without attribution until a moderator removes them.",
  "legal.privacy.rights.p1": "If you are in the European Economic Area, you have the right to:",
  "legal.privacy.rights.li1.strong": "Access",
  "legal.privacy.rights.li1.and": " and ",
  "legal.privacy.rights.li1.strong2": "portability",
  "legal.privacy.rights.li1.middle": " - download a JSON export of your profile and everything you submitted from the ",
  "legal.privacy.rights.li1.after": ".",
  "legal.privacy.rights.li2.strong": "Rectification",
  "legal.privacy.rights.li2.after": " - correct your name, or change your e-mail address or phone number (each confirmed with a code).",
  "legal.privacy.rights.li3.strong": "Erasure",
  "legal.privacy.rights.li3.middle": " - delete your account from the ",
  "legal.privacy.rights.li3.after": ". Public submissions are orphaned rather than deleted, as described above.",
  "legal.privacy.rights.li4.strong": "Restriction",
  "legal.privacy.rights.li4.and": " and ",
  "legal.privacy.rights.li4.strong2": "objection",
  "legal.privacy.rights.li4.after": " - contact the data protection contact below.",
  "legal.privacy.rights.p2": "You can also complain to the Estonian Data Protection Inspectorate (Andmekaitse Inspektsioon).",
  "legal.privacy.security.p1.before": "Your e-mail address and phone number are ",
  "legal.privacy.security.p1.strong": "encrypted at rest",
  "legal.privacy.security.p1.after": " (AES-256-GCM). Lookups such as sign-in and duplicate checks run on a separate one-way index that cannot be turned back into your contact. Your password is stored as a one-way Argon2 hash. The encryption keys are kept outside the database and are never written into code or logs.",
  "legal.privacy.security.p2": "The application applies rate limits on verification codes, password resets and submissions, sends security headers on every response, and requires HTTPS for location access. No security measure can guarantee absolute safety, but these measures reduce common risks.",
  "legal.privacy.children.p1": "OpenShelter is not directed at children and does not knowingly collect the personal data of children. The application does not currently check a user's age.",
  "legal.privacy.changes.p1": 'We may update this policy as the application evolves. The version on this page is the one in force when you read it. Material changes will be reflected in the "Last updated" date above.',
  "legal.privacy.contact.p1.before": "Questions about this policy or about your data can be sent to [CONTACT EMAIL], or to the data protection contact at [DATA PROTECTION CONTACT]. OpenShelter is also governed by the ",
  "legal.privacy.contact.p1.after": ".",
  "legal.privacy.link.accountPage": "account page",
  "legal.privacy.link.terms": "terms of use",
  // terms of use (/terms)
  "legal.terms.title": "Terms of use",
  "legal.terms.updated": "Last updated: 13 September 2026",
  "legal.terms.emergencyNumber": "112",
  "legal.terms.acceptance": "Acceptance of these terms",
  "legal.terms.service": "What OpenShelter is",
  "legal.terms.eligibility": "Eligibility and accounts",
  "legal.terms.security": "Account security",
  "legal.terms.rules": "Rules for contributions",
  "legal.terms.prohibited": "Prohibited content and behaviour",
  "legal.terms.license": "Intellectual property and your license",
  "legal.terms.moderation": "Moderation and removal",
  "legal.terms.official": "Official versus community information",
  "legal.terms.emergency": "Emergency disclaimer",
  "legal.terms.warranty": "No warranty",
  "legal.terms.liability": "Limitation of responsibility",
  "legal.terms.thirdParty": "Third-party links and services",
  "legal.terms.availability": "Service availability and changes",
  "legal.terms.source": "Open-source license",
  "legal.terms.law": "Applicable law and disputes",
  "legal.terms.contact": "Contact",
  "legal.terms.acceptance.p1": "By using OpenShelter, you agree to these terms of use. If you do not agree, do not use the application. Continuing to use the application after a change means you accept the updated terms.",
  "legal.terms.service.p1": "OpenShelter is an independent, community-maintained map of shelters and safe places in Estonia. It combines official open data from the Estonian Rescue Board (P\xE4\xE4steamet) with locations submitted by community members.",
  "legal.terms.service.p2.before": "OpenShelter is ",
  "legal.terms.service.p2.strong": "not an official emergency service",
  "legal.terms.service.p2.middle": " and not a government service. In an emergency, call ",
  "legal.terms.service.p2.after": " and follow the instructions of the Estonian Rescue Board, local authorities and emergency services.",
  "legal.terms.eligibility.p1": "You may browse the map without an account. To submit shelters or reports you need an account, and the account becomes contributing after you verify both your e-mail address and your phone number with one-time codes. You are responsible for the accuracy of the contacts you register.",
  "legal.terms.security.p1": "You are responsible for keeping your password safe and for everything done through your account. Do not share your password or your one-time verification codes. If you believe your account has been compromised, reset your password.",
  "legal.terms.rules.li1": "Submit only places you know to exist, with details accurate to the best of your knowledge.",
  "legal.terms.rules.li2": "Report locations (as closed, inaccurate, or no longer existing) truthfully and only from what you actually know.",
  "legal.terms.rules.li3": "Do not submit a private home as a public shelter. If you submit a location that is a private home, declare it as such.",
  "legal.terms.rules.li4": "The application applies limits to keep the list usable: a daily cap on submissions, a cap on how often one-time codes may be requested, and detection of near-duplicate submissions. Exceeding a limit produces an error and a suggested wait; it is not a ban.",
  "legal.terms.prohibited.p1": "You must not:",
  "legal.terms.prohibited.li1": "submit false, misleading, unsafe or malicious shelter data or reports;",
  "legal.terms.prohibited.li2": "submit private homes as public shelters without declaring them as private;",
  "legal.terms.prohibited.li3": "spam, automate access, or attempt to attack or overload the application;",
  "legal.terms.prohibited.li4": "attempt to access another user's account or the administrator functions;",
  "legal.terms.prohibited.li5": "submit content that is unlawful, defamatory, or that exposes someone's private data.",
  "legal.terms.prohibited.p2": "Deliberately false or misleading shelter data is abuse of the service and may lead to removal of content or suspension of your account.",
  "legal.terms.license.p1": "By submitting a shelter or report, you grant OpenShelter a non-exclusive, worldwide, royalty-free license to store, display and modify that content for the purpose of operating the map and moderating it. You keep ownership of what you submit, and you can edit or remove your own shelters.",
  "legal.terms.moderation.p1": "Submissions enter the list as community reports. Moderators can review, hide, correct or remove user-submitted content, and can suspend accounts that abuse the service. A submission can therefore be reviewed, hidden or rejected.",
  "legal.terms.official.p1.before": 'The application distinguishes between information sources. Locations marked as "Registry" come from official open data. Locations marked "New by community" or "Confirmed by community" were submitted by community members. A ',
  "legal.terms.official.p1.em": "verified user",
  "legal.terms.official.p1.middle": " has proved ownership of an e-mail address and a phone number; that says nothing about the accuracy of what they submit. ",
  "legal.terms.official.p1.strong": "A verified user is not a verified shelter.",
  "legal.terms.official.p2": "A community-submitted location is not automatically a safe, legal, accessible, public or operational shelter. Treat community submissions with caution, especially during an emergency.",
  "legal.terms.emergency.p1.before": "OpenShelter is not an emergency service and must not be your only source of emergency information. Official instructions from the Estonian Rescue Board, local authorities and emergency services always take priority over anything shown in this application. In an emergency, call ",
  "legal.terms.emergency.p1.after": ".",
  "legal.terms.emergency.p2": "Do not enter private property or abandoned buildings based only on information shown by OpenShelter.",
  "legal.terms.warranty.p1": "The list is provided as-is, for community benefit, without warranty of any kind. We do not guarantee that any location is open, safe, accessible, available, suitable or still operational.",
  "legal.terms.liability.p1": "To the extent permitted by law, OpenShelter accepts no liability for decisions made in reliance on the list. This paragraph is intended to be reasonable and is subject to legal review; it does not attempt to exclude liability that cannot be excluded by law.",
  "legal.terms.thirdParty.p1.before": "The application links to external services, including the Estonian Rescue Board, Maa-amet and OpenStreetMap. We are not responsible for the content or availability of those services. How personal data is shared with service providers is described in the ",
  "legal.terms.thirdParty.p1.link": "privacy policy",
  "legal.terms.thirdParty.p1.after": ".",
  "legal.terms.availability.p1": "The application is provided free of charge and may change or be unavailable at any time without notice. We may add, change or remove features.",
  "legal.terms.source.p1": "The OpenShelter source code is available under the MIT License. This governs the source code, not the shelter data, which remains subject to its own sources and to these terms.",
  "legal.terms.law.p1": "These terms are governed by [APPLICABLE LAW TO BE CONFIRMED]. Disputes will be resolved in [DISPUTE RESOLUTION TO BE CONFIRMED].",
  "legal.terms.contact.p1.before": "Questions about these terms can be sent to [CONTACT EMAIL]. OpenShelter is also governed by the ",
  "legal.terms.contact.p1.link": "privacy policy",
  "legal.terms.contact.p1.after": "."
};

// src/app/core/i18n/site-texts.ts
var SITE_TEXT_POPUP_KEYS = [
  "a11y.popup.title",
  "a11y.popup.body",
  "a11y.option.default",
  "a11y.option.default.desc",
  "a11y.option.highContrast",
  "a11y.option.highContrast.desc",
  "a11y.option.blackYellow",
  "a11y.option.blackYellow.desc",
  "a11y.popup.footer",
  "a11y.popup.close"
];
var SITE_TEXT_HEADER_KEYS = [
  "a11y.button",
  "nav.map",
  "nav.guidance",
  "nav.account",
  "nav.admin",
  "lang.label",
  "auth.login",
  "auth.logout",
  "auth.register"
];
var SITE_TEXT_FOOTER_KEYS = [
  "footer.notice1",
  "footer.notice2",
  "footer.notice3",
  "footer.rescueBoard",
  "footer.and",
  "footer.ministry",
  "footer.privacy",
  "footer.terms",
  "footer.dataSource",
  "footer.lastImport",
  "footer.officialOpenData",
  "footer.dataSourceTransformed"
];
var SITE_TEXT_KEYS = [
  ...SITE_TEXT_POPUP_KEYS,
  ...SITE_TEXT_HEADER_KEYS,
  ...SITE_TEXT_FOOTER_KEYS
];
var SITE_TEXT_LINK_KEYS = [
  "footer.rescueBoard",
  "footer.ministry"
];
var DEFAULT_SITE_TEXT_URLS = {
  "footer.rescueBoard": "https://www.p\xE4\xE4steamet.ee",
  "footer.ministry": "https://www.siseministeerium.ee"
};
function isSiteTextLink(key) {
  return SITE_TEXT_LINK_KEYS.some((k) => k === key);
}
var SITE_TEXT_BLOCKS = [
  { id: "popup", headingKey: "a11y.popup.title", keys: SITE_TEXT_POPUP_KEYS },
  { id: "header", headingKey: "a11y.button", keys: SITE_TEXT_HEADER_KEYS },
  { id: "footer", headingKey: "footer.notice2", keys: SITE_TEXT_FOOTER_KEYS }
];

// src/app/core/i18n/i18n.service.ts
import * as i0 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var LOCALE_KEY = "openshelter-locale";
var CONTENT_LOCALE_KEY = "openshelter-admin-content-locale";
var DEFAULT_LOCALE = "en";
var EAGER_CATALOGS = { en: EN };
var LAZY_CATALOG_LOADERS = {
  et: () => import("/chunk-RAU6L2Z4.js").then((m) => m.ET),
  ru: () => import("/chunk-UHKDXRRA.js").then((m) => m.RU)
};
var I18nService = class _I18nService {
  /** The active locale. */
  locale = signal(
    storedLocale(),
    ...ngDevMode ? [{ debugName: "locale" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The admin area's CONTENT language (admin-locale-split): the locale
      the guidance admin's list/detail/save/reorder calls scope to. The
      UI locale does NOT drive it — the default (on first entry) is the
      UI locale, and from then on it persists independently under its
      own key. The public site never reads it: public pages render in
      the UI locale, exactly as before. */
  contentLocale = signal(
    storedContentLocale(this.locale()),
    ...ngDevMode ? [{ debugName: "contentLocale" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** The admin overrides (site_texts), fetched once at boot by the shell.
      null = not loaded yet (or the fetch failed) — t() serves the
      shipped catalog, so a down API degrades to the default copy. */
  siteTexts = signal(
    null,
    ...ngDevMode ? [{ debugName: "siteTexts" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Bumped each time a catalog finishes loading (bundle-lazy-i18n) —
      reactive consumers (the admin site-texts panel's placeholder
      computed, via defaultText) re-run with the real values when a
      non-default chunk lands. */
  catalogVersion = signal(
    0,
    ...ngDevMode ? [{ debugName: "catalogVersion" }] : (
      /* istanbul ignore next */
      []
    )
  );
  appRef = inject(ApplicationRef);
  /** The catalogs in memory: the default locale eagerly, the rest as
      their chunks arrive. `lookup` falls back to the default locale
      while one is still loading. */
  resolvedCatalogs = {
    en: EN
  };
  /** One load per locale per session — the promise IS the cache. */
  catalogLoads = {};
  /** One-shot callbacks run when the next catalog lands (the tab-title
      re-resolve in core/title.ts); flushed in order, then cleared. */
  catalogArrivals = [];
  constructor() {
    document.documentElement.lang = this.locale();
    if (this.locale() !== DEFAULT_LOCALE) {
      void this.ensureCatalog(this.locale()).catch(() => {
      });
    }
  }
  /** Load the catalog for `locale` (if not in memory yet) and return the
      — cached — promise. The default locale is synchronous: its catalog
      ships in the initial bundle, so this never waits.
      On arrival: bump `catalogVersion`, run the queued arrival callbacks
      (the title re-resolve), and schedule ONE change-detection pass
      (ApplicationRef.tick — the zoneless app has no zone to schedule
      one) so every `| t` consumer repaints in the active locale without
      any template change. A failed load rejects AND drops out of the
      cache, so the next call retries. */
  ensureCatalog(locale) {
    const eager = EAGER_CATALOGS[locale];
    if (eager !== void 0) {
      return Promise.resolve(eager);
    }
    const inFlight = this.catalogLoads[locale];
    if (inFlight !== void 0) {
      return inFlight;
    }
    const load = LAZY_CATALOG_LOADERS[locale] ?? (() => Promise.resolve(EN));
    const promise = load().then((catalog) => {
      this.resolvedCatalogs[locale] = catalog;
      this.catalogVersion.update((version) => version + 1);
      const arrivals = this.catalogArrivals.splice(0);
      for (const arrive of arrivals) {
        arrive();
      }
      try {
        this.appRef.tick();
      } catch {
      }
      return catalog;
    }).catch((error) => {
      delete this.catalogLoads[locale];
      throw error;
    });
    this.catalogLoads[locale] = promise;
    return promise;
  }
  /** True once the catalog for `locale` is in memory (the default
      locale: always — it ships in the initial bundle). */
  isCatalogLoaded(locale) {
    return this.resolvedCatalogs[locale] !== void 0;
  }
  /** Run `cb` once, the next time a catalog lands (bundle-lazy-i18n). If
      the ACTIVE locale's catalog is already in memory, `cb` runs
      immediately — the caller can rely on it running exactly once. */
  onCatalogLoaded(cb) {
    if (this.isCatalogLoaded(this.locale())) {
      cb();
      return;
    }
    this.catalogArrivals.push(cb);
  }
  /** Translate a key for the active locale, interpolating `{param}`
      placeholders when `params` is given (unknown placeholders stay
      literal — a typo'd placeholder is visible, not silently dropped). */
  t(key, params) {
    const template = this.lookup(key);
    return params ? interpolate(template, params) : template;
  }
  /** The link URL for a key (the label + https-validated URL pairs):
      the active locale's override when present, else the shipped
      default (DEFAULT_SITE_TEXT_URLS), else '' (a non-link key). */
  url(key) {
    const override = this.overrideFor(key);
    return override?.url ?? DEFAULT_SITE_TEXT_URLS[key] ?? "";
  }
  /** The shipped CATALOG value for an explicit locale — the admin
      Settings panel's placeholder (the default, override-independent).
      While a non-default catalog is still loading (bundle-lazy-i18n) the
      DEFAULT locale's value stands in; the `catalogVersion` read makes a
      calling `computed` re-run the moment the real catalog lands. */
  defaultText(key, locale) {
    this.catalogVersion();
    return this.resolvedCatalogs[locale]?.[key] ?? EN[key];
  }
  /** Install (or clear, with null) the fetched admin overrides. */
  setSiteTexts(texts) {
    this.siteTexts.set(texts);
  }
  /** The active locale's override for the key, when one exists and
      carries a non-blank value (a blank override is treated as absent —
      the catalog default wins; the server also refuses to store one). */
  overrideFor(key) {
    const entry = this.siteTexts()?.[this.locale()]?.[key];
    if (entry === void 0 || entry === null || entry.value.trim() === "") {
      return null;
    }
    return entry;
  }
  /** The single override seam: active-locale override FIRST, the ACTIVE
        locale's catalog when it is loaded, and the DEFAULT locale's
        catalog otherwise (bundle-lazy-i18n: the loading state renders the
        default locale — never a raw key, never undefined; the default
        catalog is key-complete and always in memory).
  
        The `catalogVersion` read is the lazy-loading re-render seam
        (zoneless CD): every template binding that calls t() thereby
        consumes `catalogVersion`, so the zoneless scheduler marks the
        view for refresh the moment a non-default chunk lands — the pipe
        re-evaluates into the active locale's text with no template change
        and no zone. (Same tracking pattern this codebase already uses
        for locale switches — account-page's "Reading i18n.t() here
        tracks the locale".) */
  lookup(key) {
    const override = this.overrideFor(key);
    if (override !== null) {
      return override.value;
    }
    this.catalogVersion();
    const catalog = this.resolvedCatalogs[this.locale()];
    if (catalog !== void 0) {
      return catalog[key];
    }
    return EN[key];
  }
  /** Switch + persist the locale (the header language switcher). Never
      touches the admin's content locale — the two languages are
      independent (admin-locale-split). */
  setLocale(locale) {
    this.locale.set(locale);
    document.documentElement.lang = locale;
    void this.ensureCatalog(locale).catch(() => {
    });
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
    }
  }
  /** Switch + persist the admin's CONTENT language (the admin Settings
      panel's content-language control). Never touches the UI locale: the
      chrome keeps its language, the guidance list/detail/save/reorder
      scope to this one. */
  setContentLocale(locale) {
    this.contentLocale.set(locale);
    try {
      localStorage.setItem(CONTENT_LOCALE_KEY, locale);
    } catch {
    }
  }
  static \u0275fac = function I18nService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _I18nService)();
  };
  static \u0275prov = /* @__PURE__ */ i0.\u0275\u0275defineInjectable({ token: _I18nService, factory: _I18nService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(I18nService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();
function storedLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    return LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}
function storedContentLocale(fallback) {
  try {
    const stored = localStorage.getItem(CONTENT_LOCALE_KEY);
    return LOCALES.includes(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}
function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match);
}

// src/app/core/i18n/translate-pipe.ts
import { inject as inject2, Pipe } from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
import * as i02 from "/@fs/home/aleks/MyScripts/LocalRepos/OpenShelter/frontend/.angular/cache/22.1.7/frontend/vite/deps/@angular_core.js?v=b78d4f20";
var TranslatePipe = class _TranslatePipe {
  i18n = inject2(I18nService);
  transform(key, params) {
    return this.i18n.t(key, params);
  }
  static \u0275fac = function TranslatePipe_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _TranslatePipe)();
  };
  static \u0275pipe = /* @__PURE__ */ i02.\u0275\u0275definePipe({ name: "t", type: _TranslatePipe, pure: false });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i02.\u0275setClassMetadata(TranslatePipe, [{
    type: Pipe,
    args: [{ name: "t", pure: false }]
  }], null, null);
})();

export {
  LOCALES,
  MONTH_ABBREVS,
  EN,
  SITE_TEXT_KEYS,
  SITE_TEXT_LINK_KEYS,
  DEFAULT_SITE_TEXT_URLS,
  isSiteTextLink,
  SITE_TEXT_BLOCKS,
  I18nService,
  interpolate,
  TranslatePipe
};
//# debugId=7eb13a36-9d2c-57bb-96f8-d89417ae59ec


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvY29yZS9pMThuL2xvY2FsZS50cyIsInNyYy9hcHAvY29yZS9pMThuL2kxOG4uc2VydmljZS50cyIsInNyYy9hcHAvY29yZS9pMThuL2VuLnRzIiwic3JjL2FwcC9jb3JlL2kxOG4vc2l0ZS10ZXh0cy50cyIsInNyYy9hcHAvY29yZS9pMThuL3RyYW5zbGF0ZS1waXBlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVGhlIHN1cHBvcnRlZCBVSSBsb2NhbGVzIChpMThuLWV0LWVuIOKAlCB0aGUgd2hpdGVwYXBlcidzXG4gKiBcIkludGVybmF0aW9uYWxpemF0aW9uIOKAlCBFc3RvbmlhbiBmaXJzdCwgdGhlbiBFTi9SVVMvVUFcIiBpdGVtKS4gYGVuYCBpc1xuICogdGhlIG9yaWdpbmFsIGNvcHkgbGFuZ3VhZ2UgYW5kIHRoZSBkZWZhdWx0OyBgZXRgIGlzIEVzdG9uaWFuOyBgcnVgIGlzXG4gKiBSdXNzaWFuICh0aGUgd2hpdGVwYXBlcidzIFJVUykuIEFkZGluZyBhIGxvY2FsZSA9IG9uZSBlbnRyeSBoZXJlICsgb25lXG4gKiBjYXRhbG9nIGZpbGUgKyBhIGBMT0NBTEVTYCBtZW50aW9uIGluIHRoZSBzd2l0Y2hlciAod2hpY2ggcmVuZGVycyBmcm9tXG4gKiB0aGlzIGxpc3QpLlxuICovXG5leHBvcnQgdHlwZSBMb2NhbGUgPSAnZW4nIHwgJ2V0JyB8ICdydSc7XG5cbi8qKiBFdmVyeSBzdXBwb3J0ZWQgbG9jYWxlIOKAlCB0aGUgbGFuZ3VhZ2Ugc3dpdGNoZXIgcmVuZGVycyBmcm9tIHRoaXMgbGlzdC4gKi9cbmV4cG9ydCBjb25zdCBMT0NBTEVTOiByZWFkb25seSBMb2NhbGVbXSA9IFsnZW4nLCAnZXQnLCAncnUnXTtcblxuLyoqXG4gKiBUaGUgc2hvcnQgbW9udGggbmFtZXMgb2YgZWFjaCBsb2NhbGUgKGxvY2FsZSBEQVRBLCBub3QgY29weSk6IHRoZVxuICogY29uY3JldGUtZGF0ZSBmYWxsYmFjayBvZiB0aGUgdmVyaWZpY2F0aW9uIHN0YW1wIChzaGVsdGVyLWNvcHknc1xuICogdmVyaWZpZWRBZ29UZXh0KSBmb3JtYXRzIFwiMTIgU2VwIDIwMjZcIiBieSBoYW5kIHdpdGggdGhlc2UgbmFtZXMg4oCUXG4gKiBkZXRlcm1pbmlzdGljIGFjcm9zcyBOb2RlIElDVSB2ZXJzaW9ucyBhbmQgdXNlciB0aW1lIHpvbmVzIChVVEMtYmFzZWQpLFxuICogdGhlIHNhbWUgcmVhc29uIHRoZSBFTiBzZXQgd2FzIGhhbmQtcm9sbGVkLiBUaGUgYHttb250aH1gIHBhcmFtIG9mXG4gKiBgc2hlbHRlci5yZWNlbmN5LmRhdGVgIGlzIGZpbGxlZCBmcm9tIGhlcmUgYnkgdGhlIGNhbGxlci5cbiAqL1xuZXhwb3J0IGNvbnN0IE1PTlRIX0FCQlJFVlM6IFJlY29yZDxMb2NhbGUsIHJlYWRvbmx5IHN0cmluZ1tdPiA9IHtcbiAgZW46IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLCAnT2N0JywgJ05vdicsICdEZWMnXSxcbiAgZXQ6IFsnamFhbicsICd2ZWVicicsICdtw6RydHMnLCAnYXByJywgJ21haScsICdqdXVuaScsICdqdXVsaScsICdhdWcnLCAnc2VwdCcsICdva3QnLCAnbm92JywgJ2RldHMnXSxcbiAgcnU6IFsn0Y/QvdCyJywgJ9GE0LXQstGAJywgJ9C80LDRgNGCJywgJ9Cw0L/RgCcsICfQvNCw0Y8nLCAn0LjRjtC9JywgJ9C40Y7QuycsICfQsNCy0LMnLCAn0YHQtdC90YInLCAn0L7QutGCJywgJ9C90L7Rj9CxJywgJ9C00LXQuiddLFxufTtcbiIsImltcG9ydCB7IEFwcGxpY2F0aW9uUmVmLCBJbmplY3RhYmxlLCBpbmplY3QsIHNpZ25hbCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHR5cGUgeyBMb2NhbGUgfSBmcm9tICcuL2xvY2FsZSc7XG5pbXBvcnQgeyBMT0NBTEVTIH0gZnJvbSAnLi9sb2NhbGUnO1xuaW1wb3J0IHR5cGUgeyBNZXNzYWdlcywgTWVzc2FnZUtleSB9IGZyb20gJy4vbWVzc2FnZXMnO1xuaW1wb3J0IHsgRU4gfSBmcm9tICcuL2VuJztcbmltcG9ydCB7XG4gIERFRkFVTFRfU0lURV9URVhUX1VSTFMsXG4gIHR5cGUgU2l0ZVRleHRPdmVycmlkZSxcbiAgdHlwZSBTaXRlVGV4dHNCeUxvY2FsZSxcbn0gZnJvbSAnLi9zaXRlLXRleHRzJztcblxuLyoqXG4gKiBXaGVyZSB0aGUgVUkgbGFuZ3VhZ2UgcHJlZmVyZW5jZSBsaXZlcyBpbiBsb2NhbFN0b3JhZ2UgKGkxOG4tZXQtZW4pLlxuICogT25seSBgZW5gL2BldGAvYHJ1YCBhcmUgZXZlciBzdG9yZWQg4oCUIHRoZSBkZWZhdWx0IGlzIHRoZSBBQlNFTkNFIG9mIHRoZVxuICoga2V5IChtaXJyb3JzIHRoZSBwcmUtcGFpbnQgc2NyaXB0IGluIGluZGV4Lmh0bWwsIHdoaWNoIHJlYWRzIHRoaXMgc2FtZVxuICoga2V5IGJlZm9yZSBmaXJzdCBwYWludCwgYW5kIHRoZSBUaGVtZVN0b3JlIHBlcnNpc3RlbmNlIHNoYXBlKS5cbiAqL1xuY29uc3QgTE9DQUxFX0tFWSA9ICdvcGVuc2hlbHRlci1sb2NhbGUnO1xuXG4vKipcbiAqIFdoZXJlIHRoZSBhZG1pbiBhcmVhJ3MgQ09OVEVOVCBsYW5ndWFnZSBsaXZlcyBpbiBsb2NhbFN0b3JhZ2VcbiAqIChhZG1pbi1sb2NhbGUtc3BsaXQpOiB0aGUgbG9jYWxlIHRoZSBndWlkYW5jZSBhZG1pbidzIGxpc3QvZGV0YWlsL1xuICogc2F2ZS9yZW9yZGVyIGNhbGxzIHNjb3BlIHRvLiBBIFNFUEFSQVRFIGtleSBmcm9tIExPQ0FMRV9LRVkgb24gcHVycG9zZVxuICog4oCUIHRoZSB0d28gbGFuZ3VhZ2VzIGFyZSBpbmRlcGVuZGVudCAodGhlIG93bmVyJ3MgcmVxdWlyZW1lbnQpOiB0aGVcbiAqIGFkbWluIGNocm9tZSBjYW4gYmUgRXN0b25pYW4gd2hpbGUgdGhlIG1vZGVyYXRvciBlZGl0cyBSdXNzaWFuXG4gKiBjb250ZW50LCBhbmQgdGhlIHB1YmxpYyBoZWFkZXIgc3dpdGNoZXIgKExPQ0FMRV9LRVkpIG5ldmVyIHRvdWNoZXNcbiAqIHRoaXMgb25lLlxuICovXG5jb25zdCBDT05URU5UX0xPQ0FMRV9LRVkgPSAnb3BlbnNoZWx0ZXItYWRtaW4tY29udGVudC1sb2NhbGUnO1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGxvY2FsZTogYGVuYCwgdGhlIGFwcCdzIG9yaWdpbmFsIGNvcHkgbGFuZ3VhZ2Ug4oCUIGEgZnJlc2hcbiAqIHZpc2l0b3Igc2VlcyB0aGUgVUkgZXhhY3RseSBhcyBhdXRob3JlZCAoemVybyBmaXJzdC1sb2FkIGJlaGF2aW9yXG4gKiBjaGFuZ2UpLiBGbGlwcGluZyB0aGUgZGVmYXVsdCB0byBgZXRgICh3aGl0ZXBhcGVyOiBcIkVzdG9uaWFuIGZpcnN0XCIpIGlzXG4gKiBhbiBvd25lciBkZWNpc2lvbiBmb3IgYWZ0ZXIgdGhlIHdob2xlIFVJIGlzIHRyYW5zbGF0ZWQ6IG9uZSBsaW5lIGhlcmUgK1xuICogdGhlIHNwZWMsIG5vIG90aGVyIGNoYW5nZS5cbiAqL1xuY29uc3QgREVGQVVMVF9MT0NBTEU6IExvY2FsZSA9ICdlbic7XG5cbi8qKlxuICogQ2F0YWxvZyBsb2FkaW5nIChidW5kbGUtbGF6eS1pMThuKS4gVGhlIERFRkFVTFQgY2F0YWxvZyBzaGlwcyBpbiB0aGVcbiAqIGluaXRpYWwgYnVuZGxlOiBhIGZyZXNoIChvciBkZWZhdWx0LWxvY2FsZSkgdmlzaXRvciBwYWludHMgdGhlIGZpbmFsXG4gKiB0ZXh0IHdpdGggemVybyBmbGFzaCwgYW5kIHRoZSBwcmUtcGFpbnQgc2NyaXB0IGluIGluZGV4Lmh0bWwgbmVlZHMgbm9cbiAqIGNhdGFsb2cgZGF0YSBhdCBhbGwg4oCUIGl0IG9ubHkgdmFsaWRhdGVzIHRoZSBzdG9yZWQgbG9jYWxlIFNUUklOR1xuICogYWdhaW5zdCB0aGUga25vd24gc2V0IGFuZCBzZXRzIGA8aHRtbCBsYW5nPmAsIGFuZCB0aGUgcHJlLXBhaW50XG4gKiBgPHRpdGxlPmAgaXMgdGhlIGJyYW5kIG5hbWUsIHdoaWNoIG5vIGxvY2FsZSB0cmFuc2xhdGVzLiBUaGUgb3RoZXJcbiAqIGNhdGFsb2dzIGxvYWQgT04gREVNQU5EIOKAlCBkeW5hbWljIGltcG9ydHMsIHNvIGBldGAvYHJ1YCBsaXZlIGluIHRoZWlyXG4gKiBvd24gbGF6eSBjaHVua3Mg4oCUIHRoZSBmaXJzdCB0aW1lIGEgdmlzaXRvciBhY3R1YWxseSBuZWVkcyBvbmUgKGEgc3RvcmVkXG4gKiBub24tZGVmYXVsdCBwcmVmZXJlbmNlIGF0IGJvb3QsIG9yIHRoZSBoZWFkZXIgbGFuZ3VhZ2Ugc3dpdGNoZXIpIOKAlCBhbmRcbiAqIHN0YXkgY2FjaGVkIGZvciB0aGUgc2Vzc2lvbi4gV2hpbGUgYSBjYXRhbG9nIGlzIHN0aWxsIGxvYWRpbmcsIGB0KClgXG4gKiBzZXJ2ZXMgdGhlIERFRkFVTFQgbG9jYWxlJ3MgdmFsdWUgZm9yIHRoZSBrZXk6IHRyYW5zbGF0ZWQgY29weSwgbmV2ZXIgYVxuICogcmF3IGtleSwgbmV2ZXIgdW5kZWZpbmVkIOKAlCBhbmQgb25lIGV4dHJhIGNoYW5nZS1kZXRlY3Rpb24gcGFzc1xuICogKEFwcGxpY2F0aW9uUmVmLnRpY2ssIHNjaGVkdWxlZCBieSB0aGUgc2VydmljZSkgcmVwYWludHMgdGhlIGNocm9tZSBpblxuICogdGhlIGFjdGl2ZSBsb2NhbGUgd2hlbiB0aGUgY2h1bmsgbGFuZHMuXG4gKlxuICogVGhlIHR5cGVkIGBNZXNzYWdlc2AgaW50ZXJmYWNlIGlzIHRoZSBjb21waWxlLXRpbWUgcGFyaXR5IGd1YXJkLCB0aGVcbiAqIHJ1bnRpbWUgcGFyaXR5ICsgb24tZGVtYW5kLWxvYWRpbmcgZ3VhcmRzIGxpdmUgaW4gaTE4bi5zcGVjLnRzLlxuICovXG5jb25zdCBFQUdFUl9DQVRBTE9HUzogUGFydGlhbDxSZWNvcmQ8TG9jYWxlLCBNZXNzYWdlcz4+ID0geyBlbjogRU4gfTtcblxuLyoqIFRoZSBvbi1kZW1hbmQgbG9hZGVycyBmb3IgdGhlIG5vbi1kZWZhdWx0IGNhdGFsb2dzLiAqL1xuY29uc3QgTEFaWV9DQVRBTE9HX0xPQURFUlM6IFBhcnRpYWw8UmVjb3JkPExvY2FsZSwgKCkgPT4gUHJvbWlzZTxNZXNzYWdlcz4+PiA9IHtcbiAgZXQ6ICgpID0+IGltcG9ydCgnLi9ldCcpLnRoZW4oKG0pID0+IG0uRVQpLFxuICBydTogKCkgPT4gaW1wb3J0KCcuL3J1JykudGhlbigobSkgPT4gbS5SVSksXG59O1xuXG4vKipcbiAqIFRoZSBVSSBsYW5ndWFnZSAoaTE4bi1ldC1lbjogYXBwIGNocm9tZSArIHJvdXRlIHRpdGxlcykuXG4gKlxuICogU2lnbmFsLWJhc2VkLCB0aGUgc2FtZSBwZXJzaXN0ZW5jZSBzaGFwZSBhcyBUaGVtZVN0b3JlOiBhIGtleSBjb25zdGFudCArXG4gKiB0cnkvY2F0Y2ggc28gcHJpdmF0ZS1tb2RlIHN0b3JhZ2UgZGVncmFkZXMgdG8gYSBzZXNzaW9uLW9ubHkgcHJlZmVyZW5jZS5cbiAqIFRoZSBgbGFuZ2AgYXR0cmlidXRlIG9uIGA8aHRtbD5gIGlzIHRoZSBzZWFtOiBzY3JlZW4gcmVhZGVycyBhbmRcbiAqIHNwZWxsY2hlY2sgcmVhZCBpdCwgYW5kIGl0IGlzIHNldCBCRUZPUkUgZmlyc3QgcGFpbnQgYnkgdGhlIGlubGluZVxuICogaW5kZXguaHRtbCBzY3JpcHQg4oCUIHRoZSBjb25zdHJ1Y3RvciByZS1hc3NlcnRpb24gaXMgYW4gaWRlbXBvdGVudCBuby1vcFxuICogdGhhdCBjb3ZlcnMgdGhlIGVkZ2Ugd2hlcmUgdGhhdCBzY3JpcHQgd2FzIHNraXBwZWQuXG4gKlxuICogVFdPIExBTkdVQUdFUyAoYWRtaW4tbG9jYWxlLXNwbGl0KTogYGxvY2FsZWAvYHNldExvY2FsZWAgaXMgdGhlIFVJXG4gKiBsYW5ndWFnZSDigJQgdGhlIGNocm9tZSwgZXhhY3RseSBhcyBiZWZvcmU7IHRoZSBwdWJsaWMgc2l0ZSdzIGhlYWRlclxuICogc3dpdGNoZXIgZHJpdmVzIGl0LCBhbmQgcHVibGljIHBhZ2VzIHJlbmRlciBib3RoIHRoZWlyIGNocm9tZSBhbmQgdGhlaXJcbiAqIGNvbnRlbnQgaW4gaXQsIHVuY2hhbmdlZC4gYGNvbnRlbnRMb2NhbGVgL2BzZXRDb250ZW50TG9jYWxlYCBpcyB0aGVcbiAqIGFkbWluIGFyZWEncyBjb250ZW50IGxhbmd1YWdlOiB0aGUgbG9jYWxlIHRoZSBndWlkYW5jZSBhZG1pbidzIGxpc3QvXG4gKiBkZXRhaWwvc2F2ZS9yZW9yZGVyIGNhbGxzIHNjb3BlIHRvLiBJdCBkZWZhdWx0cyB0byB0aGUgVUkgbG9jYWxlIG9uXG4gKiBmaXJzdCBlbnRyeSwgdGhlbiBwZXJzaXN0cyBJTkRFUEVOREVOVExZIChpdHMgb3duIGtleSkg4oCUIGEgVUktbGFuZ3VhZ2VcbiAqIHN3aXRjaCBuZXZlciBtb3ZlcyBpdCwgYW5kIGEgY29udGVudC1sYW5ndWFnZSBzd2l0Y2ggbmV2ZXIgcmUtdHJhbnNsYXRlc1xuICogdGhlIGNocm9tZS5cbiAqXG4gKiBgdCgpYCBpcyB0aGUgc2luZ2xlIGxvb2t1cCBzZWFtOiB0ZW1wbGF0ZXMgdXNlIHRoZSBgdGAgcGlwZVxuICogKGB7eyAnbmF2Lm1hcCcgfCB0IH19YCksIG5vbi10ZW1wbGF0ZSBjb2RlICh0aXRsZUd1YXJkLCB0aGVcbiAqIHNoZWx0ZXItY29weS9lcnJvci1jb3B5IGhlbHBlcnMpIGNhbGxzIGl0IGRpcmVjdGx5IHdpdGggYW4gb3B0aW9uYWxcbiAqIGB7cGFyYW19YCBpbnRlcnBvbGF0aW9uIG1hcC5cbiAqXG4gKiBTaXRlLXRleHQgb3ZlcmxheSAoc2l0ZV90ZXh0cyk6IHRoZSBhZG1pbiBjYW4gb3ZlcnJpZGUgYSBERUNMQVJFRCBzZXRcbiAqIG9mIGtleXMgKHNlZSBzaXRlLXRleHRzLnRzKSBwZXIgbG9jYWxlLiBgc2V0U2l0ZVRleHRzKClgIGluc3RhbGxzIHRoZVxuICogZmV0Y2hlZCBvdmVycmlkZXMgKG51bGwgPSBub25lIC8gbm90IGxvYWRlZCB5ZXQpOyBgdCgpYCByZWFkcyB0aGVcbiAqIGFjdGl2ZSBsb2NhbGUncyBvdmVycmlkZSBmb3IgdGhlIGtleSBGSVJTVCBhbmQgZmFsbHMgYmFjayB0byB0aGVcbiAqIHNoaXBwZWQgY2F0YWxvZyDigJQgdGhlIGNhdGFsb2cgaXMgdGhlIGRlZmF1bHQsIG5ldmVyIGEgZHVwbGljYXRlIG9mXG4gKiB0aGUgc3RvcmVkIHJvdy4gT3ZlcnJpZGUgdmFsdWVzIGFyZSBwbGFpbiB0ZXh0IHJlbmRlcmVkIHRocm91Z2hcbiAqIEFuZ3VsYXIgaW50ZXJwb2xhdGlvbiAoYXV0by1lc2NhcGVkLCBuZXZlciBpbm5lckhUTUwpLlxuICovXG5ASW5qZWN0YWJsZSh7IHByb3ZpZGVkSW46ICdyb290JyB9KVxuZXhwb3J0IGNsYXNzIEkxOG5TZXJ2aWNlIHtcbiAgLyoqIFRoZSBhY3RpdmUgbG9jYWxlLiAqL1xuICByZWFkb25seSBsb2NhbGUgPSBzaWduYWw8TG9jYWxlPihzdG9yZWRMb2NhbGUoKSk7XG5cbiAgLyoqIFRoZSBhZG1pbiBhcmVhJ3MgQ09OVEVOVCBsYW5ndWFnZSAoYWRtaW4tbG9jYWxlLXNwbGl0KTogdGhlIGxvY2FsZVxuICAgICAgdGhlIGd1aWRhbmNlIGFkbWluJ3MgbGlzdC9kZXRhaWwvc2F2ZS9yZW9yZGVyIGNhbGxzIHNjb3BlIHRvLiBUaGVcbiAgICAgIFVJIGxvY2FsZSBkb2VzIE5PVCBkcml2ZSBpdCDigJQgdGhlIGRlZmF1bHQgKG9uIGZpcnN0IGVudHJ5KSBpcyB0aGVcbiAgICAgIFVJIGxvY2FsZSwgYW5kIGZyb20gdGhlbiBvbiBpdCBwZXJzaXN0cyBpbmRlcGVuZGVudGx5IHVuZGVyIGl0c1xuICAgICAgb3duIGtleS4gVGhlIHB1YmxpYyBzaXRlIG5ldmVyIHJlYWRzIGl0OiBwdWJsaWMgcGFnZXMgcmVuZGVyIGluXG4gICAgICB0aGUgVUkgbG9jYWxlLCBleGFjdGx5IGFzIGJlZm9yZS4gKi9cbiAgcmVhZG9ubHkgY29udGVudExvY2FsZSA9IHNpZ25hbDxMb2NhbGU+KHN0b3JlZENvbnRlbnRMb2NhbGUodGhpcy5sb2NhbGUoKSkpO1xuXG4gIC8qKiBUaGUgYWRtaW4gb3ZlcnJpZGVzIChzaXRlX3RleHRzKSwgZmV0Y2hlZCBvbmNlIGF0IGJvb3QgYnkgdGhlIHNoZWxsLlxuICAgICAgbnVsbCA9IG5vdCBsb2FkZWQgeWV0IChvciB0aGUgZmV0Y2ggZmFpbGVkKSDigJQgdCgpIHNlcnZlcyB0aGVcbiAgICAgIHNoaXBwZWQgY2F0YWxvZywgc28gYSBkb3duIEFQSSBkZWdyYWRlcyB0byB0aGUgZGVmYXVsdCBjb3B5LiAqL1xuICByZWFkb25seSBzaXRlVGV4dHMgPSBzaWduYWw8U2l0ZVRleHRzQnlMb2NhbGUgfCBudWxsPihudWxsKTtcblxuICAvKiogQnVtcGVkIGVhY2ggdGltZSBhIGNhdGFsb2cgZmluaXNoZXMgbG9hZGluZyAoYnVuZGxlLWxhenktaTE4bikg4oCUXG4gICAgICByZWFjdGl2ZSBjb25zdW1lcnMgKHRoZSBhZG1pbiBzaXRlLXRleHRzIHBhbmVsJ3MgcGxhY2Vob2xkZXJcbiAgICAgIGNvbXB1dGVkLCB2aWEgZGVmYXVsdFRleHQpIHJlLXJ1biB3aXRoIHRoZSByZWFsIHZhbHVlcyB3aGVuIGFcbiAgICAgIG5vbi1kZWZhdWx0IGNodW5rIGxhbmRzLiAqL1xuICByZWFkb25seSBjYXRhbG9nVmVyc2lvbiA9IHNpZ25hbCgwKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IGFwcFJlZiA9IGluamVjdChBcHBsaWNhdGlvblJlZik7XG4gIC8qKiBUaGUgY2F0YWxvZ3MgaW4gbWVtb3J5OiB0aGUgZGVmYXVsdCBsb2NhbGUgZWFnZXJseSwgdGhlIHJlc3QgYXNcbiAgICAgIHRoZWlyIGNodW5rcyBhcnJpdmUuIGBsb29rdXBgIGZhbGxzIGJhY2sgdG8gdGhlIGRlZmF1bHQgbG9jYWxlXG4gICAgICB3aGlsZSBvbmUgaXMgc3RpbGwgbG9hZGluZy4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSByZXNvbHZlZENhdGFsb2dzOiBQYXJ0aWFsPFJlY29yZDxMb2NhbGUsIE1lc3NhZ2VzPj4gPSB7XG4gICAgZW46IEVOLFxuICB9O1xuICAvKiogT25lIGxvYWQgcGVyIGxvY2FsZSBwZXIgc2Vzc2lvbiDigJQgdGhlIHByb21pc2UgSVMgdGhlIGNhY2hlLiAqL1xuICBwcml2YXRlIHJlYWRvbmx5IGNhdGFsb2dMb2FkczogUGFydGlhbDxSZWNvcmQ8TG9jYWxlLCBQcm9taXNlPE1lc3NhZ2VzPj4+ID0ge307XG4gIC8qKiBPbmUtc2hvdCBjYWxsYmFja3MgcnVuIHdoZW4gdGhlIG5leHQgY2F0YWxvZyBsYW5kcyAodGhlIHRhYi10aXRsZVxuICAgICAgcmUtcmVzb2x2ZSBpbiBjb3JlL3RpdGxlLnRzKTsgZmx1c2hlZCBpbiBvcmRlciwgdGhlbiBjbGVhcmVkLiAqL1xuICBwcml2YXRlIHJlYWRvbmx5IGNhdGFsb2dBcnJpdmFsczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubGFuZyA9IHRoaXMubG9jYWxlKCk7XG4gICAgLy8gQSBzdG9yZWQgbm9uLWRlZmF1bHQgcHJlZmVyZW5jZSBzdGFydHMgaXRzIGNodW5rIGxvYWRpbmcgTk9XICh0aGVcbiAgICAvLyBzaGVsbCBjcmVhdGVzIHRoaXMgc2VydmljZSBhdCBib290LCBiZWZvcmUgdGhlIHJvdXRlIGNvbnRlbnRcbiAgICAvLyByZW5kZXJzKS4gSWYgdGhlIGNodW5rIGhhcyBub3QgbGFuZGVkIGJ5IGZpcnN0IHBhaW50LCB0KCkgc2VydmVzXG4gICAgLy8gdGhlIGRlZmF1bHQgbG9jYWxlIOKAlCB0aGUgYWNjZXB0ZWQgb25lLWxhbmd1YWdlIGZsYXNoLCBuZXZlciBhIHJhd1xuICAgIC8vIGtleS5cbiAgICBpZiAodGhpcy5sb2NhbGUoKSAhPT0gREVGQVVMVF9MT0NBTEUpIHtcbiAgICAgIHZvaWQgdGhpcy5lbnN1cmVDYXRhbG9nKHRoaXMubG9jYWxlKCkpLmNhdGNoKCgpID0+IHtcbiAgICAgICAgLyogY2h1bmsgbG9hZCBmYWlsZWQgKG5ldHdvcmspOiB0KCkga2VlcHMgc2VydmluZyB0aGUgZGVmYXVsdFxuICAgICAgICAgICBsb2NhbGU7IGEgbGF0ZXIgZW5zdXJlQ2F0YWxvZyAoc3dpdGNoZXIgY2xpY2ssIHRpdGxlXG4gICAgICAgICAgIHJlLXJlc29sdmUpIHJldHJpZXMsIGJlY2F1c2UgYSBmYWlsZWQgbG9hZCBpcyBub3QgY2FjaGVkLiAqL1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIExvYWQgdGhlIGNhdGFsb2cgZm9yIGBsb2NhbGVgIChpZiBub3QgaW4gbWVtb3J5IHlldCkgYW5kIHJldHVybiB0aGVcbiAgICAgIOKAlCBjYWNoZWQg4oCUIHByb21pc2UuIFRoZSBkZWZhdWx0IGxvY2FsZSBpcyBzeW5jaHJvbm91czogaXRzIGNhdGFsb2dcbiAgICAgIHNoaXBzIGluIHRoZSBpbml0aWFsIGJ1bmRsZSwgc28gdGhpcyBuZXZlciB3YWl0cy5cbiAgICAgIE9uIGFycml2YWw6IGJ1bXAgYGNhdGFsb2dWZXJzaW9uYCwgcnVuIHRoZSBxdWV1ZWQgYXJyaXZhbCBjYWxsYmFja3NcbiAgICAgICh0aGUgdGl0bGUgcmUtcmVzb2x2ZSksIGFuZCBzY2hlZHVsZSBPTkUgY2hhbmdlLWRldGVjdGlvbiBwYXNzXG4gICAgICAoQXBwbGljYXRpb25SZWYudGljayDigJQgdGhlIHpvbmVsZXNzIGFwcCBoYXMgbm8gem9uZSB0byBzY2hlZHVsZVxuICAgICAgb25lKSBzbyBldmVyeSBgfCB0YCBjb25zdW1lciByZXBhaW50cyBpbiB0aGUgYWN0aXZlIGxvY2FsZSB3aXRob3V0XG4gICAgICBhbnkgdGVtcGxhdGUgY2hhbmdlLiBBIGZhaWxlZCBsb2FkIHJlamVjdHMgQU5EIGRyb3BzIG91dCBvZiB0aGVcbiAgICAgIGNhY2hlLCBzbyB0aGUgbmV4dCBjYWxsIHJldHJpZXMuICovXG4gIGVuc3VyZUNhdGFsb2cobG9jYWxlOiBMb2NhbGUpOiBQcm9taXNlPE1lc3NhZ2VzPiB7XG4gICAgY29uc3QgZWFnZXIgPSBFQUdFUl9DQVRBTE9HU1tsb2NhbGVdO1xuICAgIGlmIChlYWdlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGVhZ2VyKTtcbiAgICB9XG4gICAgY29uc3QgaW5GbGlnaHQgPSB0aGlzLmNhdGFsb2dMb2Fkc1tsb2NhbGVdO1xuICAgIGlmIChpbkZsaWdodCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gaW5GbGlnaHQ7XG4gICAgfVxuICAgIGNvbnN0IGxvYWQgPSBMQVpZX0NBVEFMT0dfTE9BREVSU1tsb2NhbGVdID8/ICgoKSA9PiBQcm9taXNlLnJlc29sdmUoRU4pKTtcbiAgICBjb25zdCBwcm9taXNlID0gbG9hZCgpXG4gICAgICAudGhlbigoY2F0YWxvZykgPT4ge1xuICAgICAgICB0aGlzLnJlc29sdmVkQ2F0YWxvZ3NbbG9jYWxlXSA9IGNhdGFsb2c7XG4gICAgICAgIHRoaXMuY2F0YWxvZ1ZlcnNpb24udXBkYXRlKCh2ZXJzaW9uKSA9PiB2ZXJzaW9uICsgMSk7XG4gICAgICAgIGNvbnN0IGFycml2YWxzID0gdGhpcy5jYXRhbG9nQXJyaXZhbHMuc3BsaWNlKDApO1xuICAgICAgICBmb3IgKGNvbnN0IGFycml2ZSBvZiBhcnJpdmFscykge1xuICAgICAgICAgIGFycml2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE9uZSBleHRyYSBjaGFuZ2UtZGV0ZWN0aW9uIHBhc3MgKHpvbmVsZXNzOiBubyB6b25lIHRvIHNjaGVkdWxlXG4gICAgICAgIC8vIG9uZSkuIEd1YXJkZWQ6IHRoZSBjaHVuayBtYXkgbGFuZCBhZnRlciB0aGUgYXBwIGlzIGRlc3Ryb3llZFxuICAgICAgICAvLyAodGVzdCB0ZWFyZG93bikg4oCUIG5vdGhpbmcgdG8gcmVwYWludCB0aGVuLCBhbmQgdGhlIHNpZ25hbC1cbiAgICAgICAgLy8gdHJhY2tpbmcgaW4gbG9va3VwKCkgYWxyZWFkeSBjb3ZlcnMgbGl2ZSB2aWV3cy5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0aGlzLmFwcFJlZi50aWNrKCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8qIGFwcCBkZXN0cm95ZWQgYmVmb3JlIHRoZSBjaHVuayBsYW5kZWQg4oCUIG5vIHJlcGFpbnQgdGFyZ2V0ICovXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhdGFsb2c7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICBkZWxldGUgdGhpcy5jYXRhbG9nTG9hZHNbbG9jYWxlXTtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9KTtcbiAgICB0aGlzLmNhdGFsb2dMb2Fkc1tsb2NhbGVdID0gcHJvbWlzZTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxuXG4gIC8qKiBUcnVlIG9uY2UgdGhlIGNhdGFsb2cgZm9yIGBsb2NhbGVgIGlzIGluIG1lbW9yeSAodGhlIGRlZmF1bHRcbiAgICAgIGxvY2FsZTogYWx3YXlzIOKAlCBpdCBzaGlwcyBpbiB0aGUgaW5pdGlhbCBidW5kbGUpLiAqL1xuICBpc0NhdGFsb2dMb2FkZWQobG9jYWxlOiBMb2NhbGUpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlZENhdGFsb2dzW2xvY2FsZV0gIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKiBSdW4gYGNiYCBvbmNlLCB0aGUgbmV4dCB0aW1lIGEgY2F0YWxvZyBsYW5kcyAoYnVuZGxlLWxhenktaTE4bikuIElmXG4gICAgICB0aGUgQUNUSVZFIGxvY2FsZSdzIGNhdGFsb2cgaXMgYWxyZWFkeSBpbiBtZW1vcnksIGBjYmAgcnVuc1xuICAgICAgaW1tZWRpYXRlbHkg4oCUIHRoZSBjYWxsZXIgY2FuIHJlbHkgb24gaXQgcnVubmluZyBleGFjdGx5IG9uY2UuICovXG4gIG9uQ2F0YWxvZ0xvYWRlZChjYjogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlzQ2F0YWxvZ0xvYWRlZCh0aGlzLmxvY2FsZSgpKSkge1xuICAgICAgY2IoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jYXRhbG9nQXJyaXZhbHMucHVzaChjYik7XG4gIH1cblxuICAvKiogVHJhbnNsYXRlIGEga2V5IGZvciB0aGUgYWN0aXZlIGxvY2FsZSwgaW50ZXJwb2xhdGluZyBge3BhcmFtfWBcbiAgICAgIHBsYWNlaG9sZGVycyB3aGVuIGBwYXJhbXNgIGlzIGdpdmVuICh1bmtub3duIHBsYWNlaG9sZGVycyBzdGF5XG4gICAgICBsaXRlcmFsIOKAlCBhIHR5cG8nZCBwbGFjZWhvbGRlciBpcyB2aXNpYmxlLCBub3Qgc2lsZW50bHkgZHJvcHBlZCkuICovXG4gIHQoa2V5OiBNZXNzYWdlS2V5LCBwYXJhbXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXI+KTogc3RyaW5nIHtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMubG9va3VwKGtleSk7XG4gICAgcmV0dXJuIHBhcmFtcyA/IGludGVycG9sYXRlKHRlbXBsYXRlLCBwYXJhbXMpIDogdGVtcGxhdGU7XG4gIH1cblxuICAvKiogVGhlIGxpbmsgVVJMIGZvciBhIGtleSAodGhlIGxhYmVsICsgaHR0cHMtdmFsaWRhdGVkIFVSTCBwYWlycyk6XG4gICAgICB0aGUgYWN0aXZlIGxvY2FsZSdzIG92ZXJyaWRlIHdoZW4gcHJlc2VudCwgZWxzZSB0aGUgc2hpcHBlZFxuICAgICAgZGVmYXVsdCAoREVGQVVMVF9TSVRFX1RFWFRfVVJMUyksIGVsc2UgJycgKGEgbm9uLWxpbmsga2V5KS4gKi9cbiAgdXJsKGtleTogTWVzc2FnZUtleSk6IHN0cmluZyB7XG4gICAgY29uc3Qgb3ZlcnJpZGUgPSB0aGlzLm92ZXJyaWRlRm9yKGtleSk7XG4gICAgcmV0dXJuIG92ZXJyaWRlPy51cmwgPz8gREVGQVVMVF9TSVRFX1RFWFRfVVJMU1trZXldID8/ICcnO1xuICB9XG5cbiAgLyoqIFRoZSBzaGlwcGVkIENBVEFMT0cgdmFsdWUgZm9yIGFuIGV4cGxpY2l0IGxvY2FsZSDigJQgdGhlIGFkbWluXG4gICAgICBTZXR0aW5ncyBwYW5lbCdzIHBsYWNlaG9sZGVyICh0aGUgZGVmYXVsdCwgb3ZlcnJpZGUtaW5kZXBlbmRlbnQpLlxuICAgICAgV2hpbGUgYSBub24tZGVmYXVsdCBjYXRhbG9nIGlzIHN0aWxsIGxvYWRpbmcgKGJ1bmRsZS1sYXp5LWkxOG4pIHRoZVxuICAgICAgREVGQVVMVCBsb2NhbGUncyB2YWx1ZSBzdGFuZHMgaW47IHRoZSBgY2F0YWxvZ1ZlcnNpb25gIHJlYWQgbWFrZXMgYVxuICAgICAgY2FsbGluZyBgY29tcHV0ZWRgIHJlLXJ1biB0aGUgbW9tZW50IHRoZSByZWFsIGNhdGFsb2cgbGFuZHMuICovXG4gIGRlZmF1bHRUZXh0KGtleTogTWVzc2FnZUtleSwgbG9jYWxlOiBMb2NhbGUpOiBzdHJpbmcge1xuICAgIHRoaXMuY2F0YWxvZ1ZlcnNpb24oKTsgLy8gdHJhY2tlZCByZWFkIOKAlCByZWNvbXB1dGVzIHdoZW4gYSBjYXRhbG9nIGxhbmRzXG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZWRDYXRhbG9nc1tsb2NhbGVdPy5ba2V5XSA/PyBFTltrZXldO1xuICB9XG5cbiAgLyoqIEluc3RhbGwgKG9yIGNsZWFyLCB3aXRoIG51bGwpIHRoZSBmZXRjaGVkIGFkbWluIG92ZXJyaWRlcy4gKi9cbiAgc2V0U2l0ZVRleHRzKHRleHRzOiBTaXRlVGV4dHNCeUxvY2FsZSB8IG51bGwpOiB2b2lkIHtcbiAgICB0aGlzLnNpdGVUZXh0cy5zZXQodGV4dHMpO1xuICB9XG5cbiAgLyoqIFRoZSBhY3RpdmUgbG9jYWxlJ3Mgb3ZlcnJpZGUgZm9yIHRoZSBrZXksIHdoZW4gb25lIGV4aXN0cyBhbmRcbiAgICAgIGNhcnJpZXMgYSBub24tYmxhbmsgdmFsdWUgKGEgYmxhbmsgb3ZlcnJpZGUgaXMgdHJlYXRlZCBhcyBhYnNlbnQg4oCUXG4gICAgICB0aGUgY2F0YWxvZyBkZWZhdWx0IHdpbnM7IHRoZSBzZXJ2ZXIgYWxzbyByZWZ1c2VzIHRvIHN0b3JlIG9uZSkuICovXG4gIHByaXZhdGUgb3ZlcnJpZGVGb3Ioa2V5OiBNZXNzYWdlS2V5KTogU2l0ZVRleHRPdmVycmlkZSB8IG51bGwge1xuICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5zaXRlVGV4dHMoKT8uW3RoaXMubG9jYWxlKCldPy5ba2V5XTtcbiAgICBpZiAoZW50cnkgPT09IHVuZGVmaW5lZCB8fCBlbnRyeSA9PT0gbnVsbCB8fCBlbnRyeS52YWx1ZS50cmltKCkgPT09ICcnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGVudHJ5O1xuICB9XG5cbiAgLyoqIFRoZSBzaW5nbGUgb3ZlcnJpZGUgc2VhbTogYWN0aXZlLWxvY2FsZSBvdmVycmlkZSBGSVJTVCwgdGhlIEFDVElWRVxuICAgICAgbG9jYWxlJ3MgY2F0YWxvZyB3aGVuIGl0IGlzIGxvYWRlZCwgYW5kIHRoZSBERUZBVUxUIGxvY2FsZSdzXG4gICAgICBjYXRhbG9nIG90aGVyd2lzZSAoYnVuZGxlLWxhenktaTE4bjogdGhlIGxvYWRpbmcgc3RhdGUgcmVuZGVycyB0aGVcbiAgICAgIGRlZmF1bHQgbG9jYWxlIOKAlCBuZXZlciBhIHJhdyBrZXksIG5ldmVyIHVuZGVmaW5lZDsgdGhlIGRlZmF1bHRcbiAgICAgIGNhdGFsb2cgaXMga2V5LWNvbXBsZXRlIGFuZCBhbHdheXMgaW4gbWVtb3J5KS5cblxuICAgICAgVGhlIGBjYXRhbG9nVmVyc2lvbmAgcmVhZCBpcyB0aGUgbGF6eS1sb2FkaW5nIHJlLXJlbmRlciBzZWFtXG4gICAgICAoem9uZWxlc3MgQ0QpOiBldmVyeSB0ZW1wbGF0ZSBiaW5kaW5nIHRoYXQgY2FsbHMgdCgpIHRoZXJlYnlcbiAgICAgIGNvbnN1bWVzIGBjYXRhbG9nVmVyc2lvbmAsIHNvIHRoZSB6b25lbGVzcyBzY2hlZHVsZXIgbWFya3MgdGhlXG4gICAgICB2aWV3IGZvciByZWZyZXNoIHRoZSBtb21lbnQgYSBub24tZGVmYXVsdCBjaHVuayBsYW5kcyDigJQgdGhlIHBpcGVcbiAgICAgIHJlLWV2YWx1YXRlcyBpbnRvIHRoZSBhY3RpdmUgbG9jYWxlJ3MgdGV4dCB3aXRoIG5vIHRlbXBsYXRlIGNoYW5nZVxuICAgICAgYW5kIG5vIHpvbmUuIChTYW1lIHRyYWNraW5nIHBhdHRlcm4gdGhpcyBjb2RlYmFzZSBhbHJlYWR5IHVzZXNcbiAgICAgIGZvciBsb2NhbGUgc3dpdGNoZXMg4oCUIGFjY291bnQtcGFnZSdzIFwiUmVhZGluZyBpMThuLnQoKSBoZXJlXG4gICAgICB0cmFja3MgdGhlIGxvY2FsZVwiLikgKi9cbiAgcHJpdmF0ZSBsb29rdXAoa2V5OiBNZXNzYWdlS2V5KTogc3RyaW5nIHtcbiAgICBjb25zdCBvdmVycmlkZSA9IHRoaXMub3ZlcnJpZGVGb3Ioa2V5KTtcbiAgICBpZiAob3ZlcnJpZGUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBvdmVycmlkZS52YWx1ZTtcbiAgICB9XG4gICAgdGhpcy5jYXRhbG9nVmVyc2lvbigpOyAvLyB0cmFja2VkIHJlYWQg4oCUIHZpZXdzIHJlLXJ1biB3aGVuIGEgY2F0YWxvZyBsYW5kc1xuICAgIGNvbnN0IGNhdGFsb2cgPSB0aGlzLnJlc29sdmVkQ2F0YWxvZ3NbdGhpcy5sb2NhbGUoKV07XG4gICAgaWYgKGNhdGFsb2cgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGNhdGFsb2dba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIEVOW2tleV07XG4gIH1cblxuICAvKiogU3dpdGNoICsgcGVyc2lzdCB0aGUgbG9jYWxlICh0aGUgaGVhZGVyIGxhbmd1YWdlIHN3aXRjaGVyKS4gTmV2ZXJcbiAgICAgIHRvdWNoZXMgdGhlIGFkbWluJ3MgY29udGVudCBsb2NhbGUg4oCUIHRoZSB0d28gbGFuZ3VhZ2VzIGFyZVxuICAgICAgaW5kZXBlbmRlbnQgKGFkbWluLWxvY2FsZS1zcGxpdCkuICovXG4gIHNldExvY2FsZShsb2NhbGU6IExvY2FsZSk6IHZvaWQge1xuICAgIHRoaXMubG9jYWxlLnNldChsb2NhbGUpO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5sYW5nID0gbG9jYWxlO1xuICAgIC8vIFN0YXJ0IGZldGNoaW5nIHRoZSAocG9zc2libHkgbmV3KSBsb2NhbGUncyBjaHVuayBOT1cg4oCUIHRoZSBjaHJvbWVcbiAgICAvLyBzaG93cyB0aGUgZGVmYXVsdCBsb2NhbGUncyBjb3B5IHVudGlsIGl0IGxhbmRzLCB0aGVuIHRoZVxuICAgIC8vIGVuc3VyZUNhdGFsb2cncyBjaGFuZ2UtZGV0ZWN0aW9uIHBhc3MgcmVwYWludHMgaXQgKGJ1bmRsZS1sYXp5LWkxOG4pLlxuICAgIC8vIEEgZmFpbGVkIGxvYWQgaXMgc2lsZW50OiB0aGUgVUkga2VlcHMgdGhlIGRlZmF1bHQtbG9jYWxlIGNvcHkgYW5kXG4gICAgLy8gdGhlIG5leHQgc3dpdGNoIHJldHJpZXMgKGEgZmFpbGVkIGxvYWQgaXMgbm90IGNhY2hlZCkuXG4gICAgdm9pZCB0aGlzLmVuc3VyZUNhdGFsb2cobG9jYWxlKS5jYXRjaCgoKSA9PiB7XG4gICAgICAvKiBzZWUgc2V0TG9jYWxlJ3MgY29tbWVudCDigJQgZGVncmFkZWQgdG8gdGhlIGRlZmF1bHQtbG9jYWxlIGNvcHkgKi9cbiAgICB9KTtcbiAgICB0cnkge1xuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oTE9DQUxFX0tFWSwgbG9jYWxlKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFN0b3JhZ2UgdW5hdmFpbGFibGUgKHByaXZhdGUgbW9kZSk6IHRoZSBsb2NhbGUgc3RpbGwgYXBwbGllcyBmb3JcbiAgICAgIC8vIHRoaXMgc2Vzc2lvbiwgaXQganVzdCB3aWxsIG5vdCBzdXJ2aXZlIGEgcmVsb2FkLlxuICAgIH1cbiAgfVxuXG4gIC8qKiBTd2l0Y2ggKyBwZXJzaXN0IHRoZSBhZG1pbidzIENPTlRFTlQgbGFuZ3VhZ2UgKHRoZSBhZG1pbiBTZXR0aW5nc1xuICAgICAgcGFuZWwncyBjb250ZW50LWxhbmd1YWdlIGNvbnRyb2wpLiBOZXZlciB0b3VjaGVzIHRoZSBVSSBsb2NhbGU6IHRoZVxuICAgICAgY2hyb21lIGtlZXBzIGl0cyBsYW5ndWFnZSwgdGhlIGd1aWRhbmNlIGxpc3QvZGV0YWlsL3NhdmUvcmVvcmRlclxuICAgICAgc2NvcGUgdG8gdGhpcyBvbmUuICovXG4gIHNldENvbnRlbnRMb2NhbGUobG9jYWxlOiBMb2NhbGUpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRMb2NhbGUuc2V0KGxvY2FsZSk7XG4gICAgdHJ5IHtcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKENPTlRFTlRfTE9DQUxFX0tFWSwgbG9jYWxlKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFN0b3JhZ2UgdW5hdmFpbGFibGUgKHByaXZhdGUgbW9kZSk6IHRoZSBjaG9pY2Ugc3RpbGwgYXBwbGllcyBmb3JcbiAgICAgIC8vIHRoaXMgc2Vzc2lvbiwgaXQganVzdCB3aWxsIG5vdCBzdXJ2aXZlIGEgcmVsb2FkLlxuICAgIH1cbiAgfVxufVxuXG4vKiogVGhlIHN0b3JlZCB2YWx1ZSB3aGVuIGl0IGlzIGEga25vd24gbG9jYWxlLCBlbHNlIHRoZSBkZWZhdWx0IOKAlCBhblxuICAgIGludmFsaWQvc3RhbGUgdmFsdWUgZmFsbHMgYmFjayBpbnN0ZWFkIG9mIGNyYXNoaW5nIGZpcnN0IHBhaW50LiAqL1xuZnVuY3Rpb24gc3RvcmVkTG9jYWxlKCk6IExvY2FsZSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RvcmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oTE9DQUxFX0tFWSk7XG4gICAgcmV0dXJuIExPQ0FMRVMuaW5jbHVkZXMoc3RvcmVkIGFzIExvY2FsZSkgPyAoc3RvcmVkIGFzIExvY2FsZSkgOiBERUZBVUxUX0xPQ0FMRTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIERFRkFVTFRfTE9DQUxFO1xuICB9XG59XG5cbi8qKiBUaGUgc3RvcmVkIGFkbWluIGNvbnRlbnQgbG9jYWxlIHdoZW4gaXQgaXMgYSBrbm93biBvbmUsIGVsc2UgYGZhbGxiYWNrYFxuICAgIOKAlCBhbiBpbnZhbGlkL3N0YWxlIHZhbHVlIGZhbGxzIGJhY2sgdG8gdGhlIFVJIGxvY2FsZSAodGhlIGZpcnN0LWVudHJ5XG4gICAgZGVmYXVsdCksIG5ldmVyIGEgaGFyZGNvZGVkIGxvY2FsZSAoYWRtaW4tbG9jYWxlLXNwbGl0KS4gKi9cbmZ1bmN0aW9uIHN0b3JlZENvbnRlbnRMb2NhbGUoZmFsbGJhY2s6IExvY2FsZSk6IExvY2FsZSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RvcmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oQ09OVEVOVF9MT0NBTEVfS0VZKTtcbiAgICByZXR1cm4gTE9DQUxFUy5pbmNsdWRlcyhzdG9yZWQgYXMgTG9jYWxlKSA/IChzdG9yZWQgYXMgTG9jYWxlKSA6IGZhbGxiYWNrO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsbGJhY2s7XG4gIH1cbn1cblxuLyoqIFJlcGxhY2UgYHtuYW1lfWAgcGxhY2Vob2xkZXJzIHdpdGggdGhlIGdpdmVuIHBhcmFtcyAocHVyZSDigJQgdW5pdC1cbiAgICB0ZXN0ZWQgZGlyZWN0bHk7IHJldXNlZCBieSBldmVyeSBpbnRlcnBvbGF0ZWQgbWVzc2FnZSBpbiBsYXRlciBzbGljZXMpLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludGVycG9sYXRlKHRlbXBsYXRlOiBzdHJpbmcsIHBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyPik6IHN0cmluZyB7XG4gIHJldHVybiB0ZW1wbGF0ZS5yZXBsYWNlKC9cXHsoXFx3KylcXH0vZywgKG1hdGNoLCBuYW1lOiBzdHJpbmcpID0+XG4gICAgbmFtZSBpbiBwYXJhbXMgPyBTdHJpbmcocGFyYW1zW25hbWVdKSA6IG1hdGNoLFxuICApO1xufVxuIiwiaW1wb3J0IHR5cGUgeyBNZXNzYWdlcyB9IGZyb20gJy4vbWVzc2FnZXMnO1xuXG4vKipcbiAqIFRoZSBFbmdsaXNoIGNhdGFsb2cgKGkxOG4tZXQtZW4pIOKAlCB0aGUgcmVmZXJlbmNlIGNvcHksIHZlcmJhdGltOiB0aGUgRU5cbiAqIHN0cmluZ3MgQVJFIHRoZSBjb21taXR0ZWQgY29weSwgc28gYSB1c2VyIG9uIHRoZSBkZWZhdWx0IGxvY2FsZSBzZWVzXG4gKiBleGFjdGx5IHdoYXQgdGhlIGFwcCByZW5kZXJzLiBXaGVyZSBhIHRlbXBsYXRlIHNwbGljZWQgY29weSBhcm91bmQgbWFya3VwXG4gKiAoZm9vdGVyIGxpbmtzKSwgdGhlIHNlbnRlbmNlIGlzIHNlZ21lbnRlZCBpbnRvIGtleXMgd2l0aCB0aGUgc2FtZSByZW5kZXJlZFxuICogcmVzdWx0LlxuICovXG5leHBvcnQgY29uc3QgRU46IE1lc3NhZ2VzID0ge1xuICAnbWVudS5hcmlhJzogJ01lbnUnLFxuICAnbmF2Lm1hcCc6ICdTaGVsdGVyIG1hcCcsXG4gICduYXYuZ3VpZGFuY2UnOiAnR3VpZGFuY2UnLFxuICAnbmF2LmFjY291bnQnOiAnQWNjb3VudCcsXG4gICduYXYuYWRtaW4nOiAnQWRtaW4nLFxuICAnbmF2LnNraXAnOiAnU2tpcCB0byBjb250ZW50JyxcbiAgJ25hdi5wcmltYXJ5QXJpYSc6ICdQcmltYXJ5JyxcblxuICAnYTExeS5idXR0b24nOiAnQWNjZXNzaWJpbGl0eScsXG4gICdsYW5nLmxhYmVsJzogJ0xhbmd1YWdlJyxcbiAgJ2F1dGgubG9nb3V0JzogJ0xvZyBvdXQnLFxuICAnYXV0aC5sb2dpbic6ICdMb2cgaW4nLFxuICAnYXV0aC5yZWdpc3Rlcic6ICdDcmVhdGUgYWNjb3VudCcsXG5cbiAgLy8gLS0tIGFjY2Vzc2liaWxpdHkgZGlhbG9nICh0aGUgdGhyZWUgY29udHJhc3Qgb3B0aW9ucykuIFNoaXBwZWQgZGVmYXVsdHNcbiAgLy8g4oCUIGV2ZXJ5IHN0cmluZyBiZWxvdyBpcyBhZG1pbi1lZGl0YWJsZSB2aWEgc2l0ZV90ZXh0cyAodGhlIG92ZXJsYXkgaW5cbiAgLy8gSTE4blNlcnZpY2UgZmFsbHMgYmFjayB0byB0aGVzZSB2YWx1ZXMgd2hlbiBubyBvdmVycmlkZSByb3cgZXhpc3RzKS5cbiAgJ2ExMXkucG9wdXAudGl0bGUnOiAnQWNjZXNzaWJpbGl0eScsXG4gICdhMTF5LnBvcHVwLmJvZHknOlxuICAgICdDaG9vc2UgaG93IE9wZW5TaGVsdGVyIGxvb2tzIHRvIHlvdS4gWW91ciBjaG9pY2UgYXBwbGllcyBpbW1lZGlhdGVseSBhbmQgaXMgc2F2ZWQgb24gdGhpcyBkZXZpY2UuJyxcbiAgJ2ExMXkub3B0aW9uLmRlZmF1bHQnOiAnRGVmYXVsdCcsXG4gICdhMTF5Lm9wdGlvbi5kZWZhdWx0LmRlc2MnOiAnVGhlIHN0YW5kYXJkIGxpZ2h0IGFwcGVhcmFuY2UuJyxcbiAgJ2ExMXkub3B0aW9uLmhpZ2hDb250cmFzdCc6ICdIaWdoIGNvbnRyYXN0JyxcbiAgJ2ExMXkub3B0aW9uLmhpZ2hDb250cmFzdC5kZXNjJzogJ0EgZGFyayBiYWNrZ3JvdW5kIHdpdGggYnJpZ2h0LCBoaWdobHkgcmVhZGFibGUgdGV4dC4nLFxuICAnYTExeS5vcHRpb24uYmxhY2tZZWxsb3cnOiAnQmxhY2sgYW5kIHllbGxvdycsXG4gICdhMTF5Lm9wdGlvbi5ibGFja1llbGxvdy5kZXNjJzpcbiAgICAnWWVsbG93IHRleHQgb24gYSBibGFjayBiYWNrZ3JvdW5kLCBmb3IgbG93IHZpc2lvbiBhbmQgZGlyZWN0IHN1bmxpZ2h0LicsXG4gICdhMTF5LnBvcHVwLmZvb3Rlcic6ICdZb3VyIGNob2ljZSBpcyBzdG9yZWQgb24gdGhpcyBkZXZpY2Ugb25seSDigJQgaXQgaXMgbm90IHNoYXJlZCB3aXRoIGFueW9uZS4nLFxuICAnYTExeS5wb3B1cC5jbG9zZSc6ICdDbG9zZScsXG5cbiAgJ2Zvb3Rlci5ub3RpY2UxJzpcbiAgICAnT3BlblNoZWx0ZXIgaXMgYSBjb21tdW5pdHktbWFpbnRhaW5lZCBsaXN0LCBub3QgYW4gb2ZmaWNpYWwgZW1lcmdlbmN5IHNlcnZpY2UuJyxcbiAgJ2Zvb3Rlci5ub3RpY2UyJzogJ0luIGFuIGVtZXJnZW5jeSwgY2FsbCAxMTIuJyxcbiAgJ2Zvb3Rlci5ub3RpY2UzJzogJ09mZmljaWFsIHNoZWx0ZXIgaW5mb3JtYXRpb246JyxcbiAgJ2Zvb3Rlci5yZXNjdWVCb2FyZCc6ICdSZXNjdWUgQm9hcmQnLFxuICAnZm9vdGVyLmFuZCc6ICdhbmQnLFxuICAnZm9vdGVyLm1pbmlzdHJ5JzogJ01pbmlzdHJ5IG9mIHRoZSBJbnRlcmlvcicsXG4gICdmb290ZXIuZGF0YVNvdXJjZVRyYW5zZm9ybWVkJzogJ3RyYW5zZm9ybWVkIGJ5IE9wZW5TaGVsdGVyIChFUFNHOjMzMDEgdG8gV0dTODQpJyxcbiAgJ2Zvb3Rlci5wcml2YWN5JzogJ1ByaXZhY3kgcG9saWN5JyxcbiAgJ2Zvb3Rlci50ZXJtcyc6ICdUZXJtcyBvZiB1c2UnLFxuICAnZm9vdGVyLmRhdGFTb3VyY2UnOiAnU2hlbHRlciBkYXRhJyxcbiAgJ2Zvb3Rlci5sYXN0SW1wb3J0JzogJ2xhc3QgaW1wb3J0JyxcbiAgJ2Zvb3Rlci5vZmZpY2lhbE9wZW5EYXRhJzogJ29mZmljaWFsIG9wZW4gZGF0YScsXG4gICdmb290ZXIubGVnYWxBcmlhJzogJ0xlZ2FsJyxcblxuICAndGl0bGUubWFwJzogJ1NoZWx0ZXIgbWFwJyxcbiAgJ3RpdGxlLmxvZ2luJzogJ0xvZyBpbicsXG4gICd0aXRsZS5yZWdpc3Rlcic6ICdDcmVhdGUgYWNjb3VudCcsXG4gICd0aXRsZS5yZXNldCc6ICdSZXNldCBwYXNzd29yZCcsXG4gICd0aXRsZS52ZXJpZnknOiAnVmVyaWZ5IGFjY291bnQnLFxuICAndGl0bGUuYWNjb3VudCc6ICdBY2NvdW50JyxcbiAgJ3RpdGxlLnByaXZhY3knOiAnUHJpdmFjeSBwb2xpY3knLFxuICAndGl0bGUudGVybXMnOiAnVGVybXMgb2YgdXNlJyxcbiAgJ3RpdGxlLnNoZWx0ZXJEZXRhaWwnOiAnU2hlbHRlciBkZXRhaWwnLFxuICAndGl0bGUuc3VibWl0JzogJ1N1Ym1pdCBhIHNoZWx0ZXInLFxuICAndGl0bGUuYWRtaW4nOiAnQWRtaW4nLFxuICAndGl0bGUuZ3VpZGFuY2UnOiAnQ3Jpc2lzIGd1aWRhbmNlJyxcbiAgJ3RpdGxlLmd1aWRhbmNlRGV0YWlsJzogJ0d1aWRhbmNlIHBvc3QnLFxuXG4gIC8vIC0tLSBjb25zZW50IGJhbm5lciAoZmlyc3QtbGV2ZWwgZGF0YS11c2FnZSBub3RpY2UpLiBUaGUgYXBwIGhhcyBub1xuICAvLyBvcHRpb25hbCBjb29raWVzLCB0cmFja2VycyBvciBhbmFseXRpY3MsIHNvIHRoaXMgaXMgYSBuZWNlc3Nhcnktb25seVxuICAvLyBhY2tub3dsZWRnbWVudCwgbm90IGFuIGFjY2VwdC9yZWplY3QgY2hvaWNlLlxuICAnY29uc2VudC5hcmlhJzogJ0Nvb2tpZSBhbmQgc3RvcmFnZSBub3RpY2UnLFxuICAnY29uc2VudC50aXRsZSc6ICdBYm91dCBjb29raWVzIGFuZCBicm93c2VyIHN0b3JhZ2UnLFxuICAnY29uc2VudC5ib2R5JzpcbiAgICBcIk9wZW5TaGVsdGVyIHN0b3JlcyBvbmx5IHdoYXQgaXQgbmVlZHMgdG8gd29yazogYSBzaWduLWluIHRva2VuIHRoYXQga2VlcHMgeW91IGxvZ2dlZCBpbiwgYW5kIHlvdXIgbGFuZ3VhZ2UgYW5kIGRpc3BsYXkgcHJlZmVyZW5jZXMuIEl0IGRvZXMgbm90IHVzZSBhZHZlcnRpc2luZywgYW5hbHl0aWNzLCBvciBjcm9zcy1zaXRlIHRyYWNraW5nLCBhbmQgaXQgbmV2ZXIgc2VsbHMgeW91ciBkYXRhLiBUaGVzZSBhcmUgc3RvcmVkIGluIHlvdXIgYnJvd3NlcidzIGxvY2FsIHN0b3JhZ2UsIG5vdCBpbiBhZHZlcnRpc2luZyBjb29raWVzLCBhbmQgYXJlIHJlcXVpcmVkIGZvciB0aGUgYXBwbGljYXRpb24gdG8gZnVuY3Rpb24uXCIsXG4gICdjb25zZW50LmFja25vd2xlZGdlJzogJ0dvdCBpdCcsXG4gICdjb25zZW50LnByaXZhY3lMaW5rJzogJ1JlYWQgdGhlIFByaXZhY3kgUG9saWN5JyxcblxuICAvLyAtLS0gXCJIb3cgT3BlblNoZWx0ZXIgd29ya3NcIiBibG9jayAobWFwIHBhZ2UpLiBVSSBsYWJlbHMgYXJlIHF1b3RlZFxuICAvLyB2ZXJiYXRpbSBzbyB0aGUgZXhwbGFuYXRpb24gbWF0Y2hlcyB3aGF0IHRoZSBtYXAgYWN0dWFsbHkgc2hvd3MuXG4gICdob3cudGl0bGUnOiAnSG93IE9wZW5TaGVsdGVyIHdvcmtzJyxcbiAgJ2hvdy53aGF0JzpcbiAgICAnT3BlblNoZWx0ZXIgaXMgYW4gaW5kZXBlbmRlbnQsIGNvbW11bml0eS1tYWludGFpbmVkIG1hcCBvZiBzaGVsdGVycyBpbiBFc3RvbmlhLiBJdCBpcyBub3QgYW4gZW1lcmdlbmN5IHNlcnZpY2Ugb3IgYW4gb2ZmaWNpYWwgZ292ZXJubWVudCBzeXN0ZW0uIEluIGFuIGVtZXJnZW5jeSwgY2FsbCAxMTIgYW5kIGZvbGxvdyBvZmZpY2lhbCBpbnN0cnVjdGlvbnMuJyxcbiAgJ2hvdy5zb3VyY2VzJzpcbiAgICAnTG9jYXRpb25zIGNvbWUgZnJvbSB0d28gc291cmNlcy4gT2ZmaWNpYWwgbG9jYXRpb25zIGNvbWUgZnJvbSBFc3RvbmlhbiBSZXNjdWUgQm9hcmQgKFDDpMOkc3RlYW1ldCkgb3BlbiBkYXRhIGFuZCBzaG93IGEgYmx1ZSBcIlJlZ2lzdHJ5XCIgbWFya2VyLiBDb21tdW5pdHkgbG9jYXRpb25zIGFyZSBzdWJtaXR0ZWQgYnkgdmVyaWZpZWQgdXNlcnMgYW5kIHNob3cgYXMgXCJOZXcgYnkgY29tbXVuaXR5XCIgdW50aWwgb3RoZXIgdXNlcnMgY29uZmlybSB0aGVtIChcIkNvbmZpcm1lZCBieSBjb21tdW5pdHlcIikuIEEgY29tbXVuaXR5IHN1Ym1pc3Npb24gaXMgbmV2ZXIgYXV0b21hdGljYWxseSBvZmZpY2lhbC4nLFxuICAnaG93LnJlcG9ydCc6XG4gICAgJ1ZlcmlmaWVkIHVzZXJzIGNhbiBzdWJtaXQgYSBzaGVsdGVyIG9yIHJlcG9ydCBhIGxpc3RlZCBsb2NhdGlvbiBhcyBjbG9zZWQsIGluYWNjdXJhdGUsIG9yIG5vIGxvbmdlciBleGlzdGluZy4gUmVwb3J0cyBnbyB0byBhZG1pbmlzdHJhdG9ycywgd2hvIHJldmlldyB0aGVtIGFuZCBtYXkgaGlkZSBvciBjb3JyZWN0IGEgbG9jYXRpb24uJyxcbiAgJ2hvdy5uZWFyZXN0JzpcbiAgICAnVGhlIFwiU2hvdyBzaGVsdGVycyBhcm91bmQgeW91XCIgYnV0dG9uIGFza3MgeW91ciBicm93c2VyIGZvciBwZXJtaXNzaW9uIHRvIHVzZSB5b3VyIGxvY2F0aW9uLiBZb3VyIHBvc2l0aW9uIGlzIHVzZWQgb25seSBpbnNpZGUgeW91ciBicm93c2VyIGFuZCBpcyBuZXZlciBzZW50IHRvIG91ciBzZXJ2ZXJzLiBZb3UgY2FuIHNlYXJjaCBuZWFyIGFuIGFkZHJlc3MgaW5zdGVhZC4nLFxuICAnaG93Lmd1YXJhbnRlZSc6XG4gICAgJ09wZW5TaGVsdGVyIGNhbm5vdCBndWFyYW50ZWUgdGhhdCBhIGxpc3RlZCBsb2NhdGlvbiBpcyBvcGVuLCBzYWZlLCBhY2Nlc3NpYmxlLCBhdmFpbGFibGUsIG9yIHN0aWxsIG9wZXJhdGluZy4gQWx3YXlzIGZvbGxvdyBvZmZpY2lhbCBlbWVyZ2VuY3kgaW5zdHJ1Y3Rpb25zIGZpcnN0LicsXG4gICdob3cuZXhhbXBsZVRpdGxlJzogJ0V4YW1wbGUnLFxuICAnaG93LmV4YW1wbGUuMSc6ICdBbiBvZmZpY2lhbCBsb2NhdGlvbiBhcHBlYXJzIHdpdGggYSBibHVlIG1hcmtlciBhbmQgYSBcIlJlZ2lzdHJ5XCIgbGFiZWwuJyxcbiAgJ2hvdy5leGFtcGxlLjInOlxuICAgICdBIHVzZXIgc3VibWl0cyBhIHBvc3NpYmxlIGxvY2F0aW9uOyBpdCBhcHBlYXJzIGFzIFwiTmV3IGJ5IGNvbW11bml0eVwiIGFuZCB1bnZlcmlmaWVkLicsXG4gICdob3cuZXhhbXBsZS4zJzogJ0Fub3RoZXIgdXNlciByZXBvcnRzIHRoYXQgdGhlIGxvY2F0aW9uIGlzIGNsb3NlZCBvciBpbmFjY2Vzc2libGUuJyxcbiAgJ2hvdy5leGFtcGxlLjQnOiAnQW4gYWRtaW5pc3RyYXRvciByZXZpZXdzIHRoZSByZXBvcnQuJyxcbiAgJ2hvdy5leGFtcGxlLjUnOiAnVGhlIGxvY2F0aW9uIGlzIHVwZGF0ZWQgb3IgaGlkZGVuLicsXG5cbiAgLy8gLS0tIGF1dGggcGFnZXMgKGxvZ2luIC8gcmVnaXN0ZXIgLyByZXNldCkuIFNhbWUgdmVyYmF0aW0gcnVsZSBhcyB0aGVcbiAgLy8gY2hyb21lOiB0aGUgRU4gc3RyaW5ncyBBUkUgdGhlIGN1cnJlbnQgY29tbWl0dGVkIHRlbXBsYXRlIGNvcHkuXG4gICdhdXRoUGFnZS5sb2dpbi50aXRsZSc6ICdMb2cgaW4nLFxuICAnYXV0aFBhZ2UubG9naW4uc3VidGl0bGUnOiAnVXNlIHRoZSBlbWFpbCBvciBwaG9uZSB5b3UgcmVnaXN0ZXJlZCB3aXRoLicsXG4gICdhdXRoUGFnZS5sb2dpbi5zZXNzaW9uRXhwaXJlZCc6ICdZb3VyIHNlc3Npb24gaGFzIGV4cGlyZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uJyxcbiAgJ2F1dGhQYWdlLmxvZ2luLnJlc2V0T2snOiAnWW91ciBwYXNzd29yZCBoYXMgYmVlbiByZXNldC4gTG9nIGluIHdpdGggeW91ciBuZXcgcGFzc3dvcmQuJyxcbiAgJ2F1dGhQYWdlLmxvZ2luLmNvbnRhY3RMYWJlbCc6ICdFbWFpbCBvciBwaG9uZScsXG4gICdhdXRoUGFnZS5sb2dpbi5jb250YWN0UGxhY2Vob2xkZXInOiAneW91QGV4YW1wbGUuZWUgb3IgKzM3MjXigKYnLFxuICAnYXV0aFBhZ2UubG9naW4uY29udGFjdFJlcXVpcmVkJzogJ0VtYWlsIG9yIHBob25lIGlzIHJlcXVpcmVkLicsXG4gICdhdXRoUGFnZS5sb2dpbi5wYXNzd29yZExhYmVsJzogJ1Bhc3N3b3JkJyxcbiAgJ2F1dGhQYWdlLmxvZ2luLnBhc3N3b3JkUmVxdWlyZWQnOiAnUGFzc3dvcmQgaXMgcmVxdWlyZWQuJyxcbiAgJ2F1dGhQYWdlLmxvZ2luLnN1Ym1pdHRpbmcnOiAnTG9nZ2luZyBpbuKApicsXG4gICdhdXRoUGFnZS5sb2dpbi5zdWJtaXQnOiAnTG9nIGluJyxcbiAgJ2F1dGhQYWdlLmxvZ2luLmZvcmdvdCc6ICdGb3Jnb3QgcGFzc3dvcmQ/JyxcbiAgJ2F1dGhQYWdlLmxvZ2luLm5vQWNjb3VudCc6ICdObyBhY2NvdW50IHlldD8nLFxuICAnYXV0aFBhZ2UubG9naW4uY3JlYXRlT25lJzogJ0NyZWF0ZSBvbmUnLFxuXG4gICdhdXRoUGFnZS5yZWdpc3Rlci50aXRsZSc6ICdDcmVhdGUgYWNjb3VudCcsXG4gICdhdXRoUGFnZS5yZWdpc3Rlci5zdWJ0aXRsZSc6XG4gICAgJ0Fub255bW91cyB2aWV3aW5nIGlzIGZyZWUuIEFuIGFjY291bnQgbGV0cyB5b3Ugc3VibWl0IHNoZWx0ZXJzIGFuZCByZXBvcnRzIG9uY2UgdmVyaWZpZWQuJyxcbiAgJ2F1dGhQYWdlLnJlZ2lzdGVyLmNyZWF0ZWRUaXRsZSc6ICdBY2NvdW50IGNyZWF0ZWQnLFxuICAnYXV0aFBhZ2UucmVnaXN0ZXIuY3JlYXRlZEJvZHknOlxuICAgICdZb3VyIGFjY291bnQgaXMgcmVhZHkuIFBsZWFzZSBsb2cgaW4sIHRoZW4gdmVyaWZ5IHlvdXIgZW1haWwgYWRkcmVzcyDigJQgYSB2ZXJpZmljYXRpb24gY29kZSB3aWxsIGJlIHNlbnQgdG8gaXQuJyxcbiAgJ2F1dGhQYWdlLnJlZ2lzdGVyLm5hbWVMYWJlbCc6ICdGdWxsIG5hbWUnLFxuICAnYXV0aFBhZ2UucmVnaXN0ZXIubmFtZVJlcXVpcmVkJzogJ05hbWUgaXMgcmVxdWlyZWQuJyxcbiAgJ2F1dGhQYWdlLnJlZ2lzdGVyLmVtYWlsTGFiZWwnOiAnRW1haWwnLFxuICAnYXV0aFBhZ2UucmVnaXN0ZXIuZW1haWxQbGFjZWhvbGRlcic6ICd5b3VAZXhhbXBsZS5lZScsXG4gICdhdXRoUGFnZS5yZWdpc3Rlci5lbWFpbE5vdGUnOlxuICAgICdXZSBzZW5kIHlvdSBhIHZlcmlmaWNhdGlvbiBjb2RlIGhlcmUgYW5kIHVzZSBpdCBsYXRlciBmb3IgcGFzc3dvcmQgcmVzZXRzLicsXG4gICdhdXRoUGFnZS5yZWdpc3Rlci5lbWFpbFJlcXVpcmVkJzogJ0EgdmFsaWQgZW1haWwgaXMgcmVxdWlyZWQuJyxcbiAgJ2F1dGhQYWdlLnJlZ2lzdGVyLnBob25lTGFiZWwnOiAnUGhvbmUnLFxuICAnYXV0aFBhZ2UucmVnaXN0ZXIucGhvbmVQbGFjZWhvbGRlcic6ICcrMzcyNeKApiBvciA1eHh4eHh4eCcsXG4gICdhdXRoUGFnZS5yZWdpc3Rlci5waG9uZU5vdGUnOlxuICAgICdXZSBzZW5kIHlvdSBhIHZlcmlmaWNhdGlvbiBjb2RlIGhlcmU7IHlvdSBjYW4gbG9nIGluIHdpdGggaXQgbGF0ZXIgdG9vLicsXG4gICdhdXRoUGFnZS5yZWdpc3Rlci5waG9uZVJlcXVpcmVkJzogJ1Bob25lIGlzIHJlcXVpcmVkLicsXG4gICdhdXRoUGFnZS5yZWdpc3Rlci5wYXNzd29yZExhYmVsJzogJ1Bhc3N3b3JkJyxcbiAgJ2F1dGhQYWdlLnJlZ2lzdGVyLnBhc3N3b3JkUmVxdWlyZWQnOiAnUGFzc3dvcmQgaXMgcmVxdWlyZWQuJyxcbiAgJ2F1dGhQYWdlLnJlZ2lzdGVyLnBhc3N3b3JkVG9vU2hvcnQnOiAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMgbG9uZy4nLFxuICAnYXV0aFBhZ2UucmVnaXN0ZXIuc3VibWl0dGluZyc6ICdDcmVhdGluZyBhY2NvdW504oCmJyxcbiAgJ2F1dGhQYWdlLnJlZ2lzdGVyLnN1Ym1pdCc6ICdDcmVhdGUgYWNjb3VudCcsXG4gICdhdXRoUGFnZS5yZWdpc3Rlci5hZ3JlZUxlYWQnOiAnQnkgY3JlYXRpbmcgYW4gYWNjb3VudCB5b3UgYWdyZWUgdG8gdGhlJyxcbiAgJ2F1dGhQYWdlLnJlZ2lzdGVyLmFncmVlVGVybXMnOiAnVGVybXMgb2YgVXNlJyxcbiAgJ2F1dGhQYWdlLnJlZ2lzdGVyLmFncmVlQW5kJzogJ2FuZCB0aGUnLFxuICAnYXV0aFBhZ2UucmVnaXN0ZXIuYWdyZWVQcml2YWN5JzogJ1ByaXZhY3kgUG9saWN5JyxcbiAgJ2F1dGhQYWdlLnJlZ2lzdGVyLmFncmVlVGFpbCc6ICcuJyxcbiAgJ2F1dGhQYWdlLnJlZ2lzdGVyLmhhdmVBY2NvdW50JzogJ0FscmVhZHkgaGF2ZSBhbiBhY2NvdW50PycsXG5cbiAgJ2F1dGhQYWdlLnJlc2V0LnRpdGxlJzogJ1Jlc2V0IHBhc3N3b3JkJyxcbiAgJ2F1dGhQYWdlLnJlc2V0LnN1YnRpdGxlJzogXCJFbnRlciB0aGUgZW1haWwgb2YgeW91ciBhY2NvdW50IGFuZCB3ZSdsbCBlbWFpbCB5b3UgYSA2LWRpZ2l0IGNvZGUuXCIsXG4gICdhdXRoUGFnZS5yZXNldC5lbWFpbExhYmVsJzogJ0VtYWlsJyxcbiAgJ2F1dGhQYWdlLnJlc2V0LmVtYWlsUGxhY2Vob2xkZXInOiAneW91QGV4YW1wbGUuZWUnLFxuICAnYXV0aFBhZ2UucmVzZXQuZW1haWxSZXF1aXJlZCc6ICdBIHZhbGlkIGVtYWlsIGlzIHJlcXVpcmVkLicsXG4gICdhdXRoUGFnZS5yZXNldC5zZW5kaW5nJzogJ1NlbmRpbmfigKYnLFxuICAnYXV0aFBhZ2UucmVzZXQuc2VuZEluJzogJ1NlbmQgaW4ge3RpbWV9JyxcbiAgJ2F1dGhQYWdlLnJlc2V0LnNlbmQnOiAnRW1haWwgbWUgYSByZXNldCBjb2RlJyxcbiAgJ2F1dGhQYWdlLnJlc2V0LnNlbnRUaXRsZSc6ICdDaGVjayB5b3VyIGluYm94JyxcbiAgJ2F1dGhQYWdlLnJlc2V0LnNlbnRCb2R5JzpcbiAgICAnSWYgYW4gYWNjb3VudCBleGlzdHMgZm9yIHRoYXQgZW1haWwsIGEgNi1kaWdpdCBjb2RlIGhhcyBiZWVuIHNlbnQgdG8gaXQuJyxcbiAgJ2F1dGhQYWdlLnJlc2V0LmNvZGVMYWJlbCc6ICdSZXNldCBjb2RlJyxcbiAgJ2F1dGhQYWdlLnJlc2V0LmNvZGVQbGFjZWhvbGRlcic6ICc2LWRpZ2l0IGNvZGUnLFxuICAnYXV0aFBhZ2UucmVzZXQuY29kZVJlcXVpcmVkJzogJ0VudGVyIHRoZSA2LWRpZ2l0IGNvZGUgZnJvbSB0aGUgZW1haWwuJyxcbiAgJ2F1dGhQYWdlLnJlc2V0LmNvZGVOb3RlJzogJ1RoZSBjb2RlIGlzIHZhbGlkIGZvciAxNSBtaW51dGVzLicsXG4gICdhdXRoUGFnZS5yZXNldC5uZXdQYXNzd29yZExhYmVsJzogJ05ldyBwYXNzd29yZCcsXG4gICdhdXRoUGFnZS5yZXNldC5uZXdQYXNzd29yZFJlcXVpcmVkJzogJ1Bhc3N3b3JkIGlzIHJlcXVpcmVkLicsXG4gICdhdXRoUGFnZS5yZXNldC5uZXdQYXNzd29yZFRvb1Nob3J0JzogJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzIGxvbmcuJyxcbiAgJ2F1dGhQYWdlLnJlc2V0LnJlcGVhdExhYmVsJzogJ1JlcGVhdCBuZXcgcGFzc3dvcmQnLFxuICAnYXV0aFBhZ2UucmVzZXQucmVwZWF0UmVxdWlyZWQnOiAnUGxlYXNlIHJlcGVhdCB0aGUgcGFzc3dvcmQuJyxcbiAgJ2F1dGhQYWdlLnJlc2V0Lm1pc21hdGNoJzogJ1RoZSBwYXNzd29yZHMgZG8gbm90IG1hdGNoLicsXG4gICdhdXRoUGFnZS5yZXNldC51cGRhdGluZyc6ICdVcGRhdGluZ+KApicsXG4gICdhdXRoUGFnZS5yZXNldC51cGRhdGUnOiAnU2V0IG5ldyBwYXNzd29yZCcsXG4gICdhdXRoUGFnZS5yZXNldC5yZXNlbmRJbic6ICdSZXNlbmQgaW4ge3RpbWV9JyxcbiAgJ2F1dGhQYWdlLnJlc2V0LnJlc2VuZCc6ICdSZXNlbmQgY29kZScsXG4gICdhdXRoUGFnZS5yZXNldC5iYWNrVG9Mb2dpbic6ICdCYWNrIHRvIGxvZyBpbicsXG5cbiAgJ2F1dGhQYWdlLnByaXZhY3lQb2xpY3knOiAnUHJpdmFjeSBQb2xpY3knLFxuICAnYXV0aFBhZ2UudGVybXNPZlVzZSc6ICdUZXJtcyBvZiBVc2UnLFxuXG4gIC8vIC0tLSBtYXAgcGFnZSAodGhlIGJyb3dzZSBzdXJmYWNlKS4gU2FtZSB2ZXJiYXRpbSBydWxlIGFzXG4gIC8vIHRoZSBjaHJvbWU6IHRoZSBFTiBzdHJpbmdzIEFSRSB0aGUgY3VycmVudCBjb21taXR0ZWQgdGVtcGxhdGUgKyBjb25zdFxuICAvLyBjb3B5LiBUaGUgYXJvdW5kLXlvdSBDVEEgY29weSBpcyBOT1Qga2V5ZWQgaGVyZSAoc2VlIG1lc3NhZ2VzLnRzKS5cbiAgJ21hcC50aXRsZSc6ICdTaGVsdGVyIG1hcCcsXG4gICdtYXAuc3VidGl0bGUnOiAnRmluZCByZWdpc3RlcmVkIGFuZCBjb21tdW5pdHktc3VibWl0dGVkIGJvbWIgc2hlbHRlcnMgaW4gRXN0b25pYS4nLFxuICAvLyBMZWdlbmQgZW50cnkgZm9yIHRoZSBibHVlIHJlZ2lzdHJ5IG1hcmtlcjogaXQgbmFtZXMgdGhlIHByaW1hcnkgcmVnaXN0cnlcbiAgLy8gc291cmNlIChvd25lciB3b3JkaW5nOiBcIlJlZ2lzdHJ5IChQw6TDpHN0ZWFtZXQpXCIpLlxuICAnbWFwLmxlZ2VuZC5yZWdpc3RyeSc6ICdSZWdpc3RyeSAoUMOkw6RzdGVhbWV0KScsXG4gICdtYXAubGVnZW5kLm5ldyc6ICdOZXcgYnkgY29tbXVuaXR5JyxcbiAgLy8gVGhlIHN1Ym1pdHRlci12ZXJpZmljYXRpb24gc2hhcGVzIChzdWJtaXR0ZXItdmVyaWZpY2F0aW9uLWJhZGdlKS5cbiAgJ21hcC5sZWdlbmQucGFydGlhbFZlcmlmaWVkJzogJ0FkZGVkIGJ5IGEgcGFydGlhbGx5IHZlcmlmaWVkIHVzZXInLFxuICAnbWFwLmxlZ2VuZC5mdWxsVmVyaWZpZWQnOiAnQWRkZWQgYnkgYSBmdWxseSB2ZXJpZmllZCB1c2VyJyxcbiAgJ21hcC5sZWdlbmQuY29uZmlybWVkJzogJ0NvbmZpcm1lZCBieSBjb21tdW5pdHknLFxuICAnbWFwLmxlZ2VuZC5yZXBvcnRlZCc6ICdSZXBvcnRlZCcsXG4gICdtYXAuZ2VvTm90ZSc6XG4gICAgJ1lvdXIgYnJvd3NlciBhc2tzIGZpcnN0IOKAlCB5b3VyIGxvY2F0aW9uIGlzIG5ldmVyIHNlbnQgdG8gb3VyIHNlcnZlcnMgYW5kIGlzIHVzZWQgb25seSB0byBmaW5kIHRoZSBuZWFyZXN0IHNoZWx0ZXIuJyxcbiAgJ21hcC5hcm91bmRZb3UnOiAnU2hvdyBzaGVsdGVycyBhcm91bmQgeW91JyxcbiAgJ21hcC5sb2NhdGluZyc6ICdGaW5kaW5nIHlvdXIgbG9jYXRpb27igKYnLFxuICAnbWFwLmFuY2hvckxhYmVsJzogJ0ZpbmQgc2hlbHRlcnMgbmVhciBhbiBhZGRyZXNzJyxcbiAgJ21hcC5hbmNob3JQbGFjZWhvbGRlcic6ICdTdHJlZXQgb3IgcGxhY2UgaW4gRXN0b25pYScsXG4gICdtYXAuc2VhcmNoJzogJ1NlYXJjaCcsXG4gICdtYXAuc2VhcmNoaW5nJzogJ1NlYXJjaGluZ+KApicsXG4gICdtYXAuYXR0cmlidXRpb25MZWFkJzogJ0FkZHJlc3NlczonLFxuICAnbWFwLm9zbUF0dHJpYnV0aW9uJzogJ8KpIE9wZW5TdHJlZXRNYXAgY29udHJpYnV0b3JzJyxcbiAgJ21hcC5hZGRTaGVsdGVyJzogJ0FkZCBzaGVsdGVyJyxcbiAgJ21hcC5uZWFyZXN0RW1wdHknOiAnTm8gbGlzdGVkIGxvY2F0aW9ucyBhcm91bmQgeW91IHlldC4nLFxuICAnbWFwLm5lYXJlc3RFbXB0eS5hZGRGaXJzdCc6ICdZb3UgY2FuIGFkZCB0aGUgZmlyc3Qgb25lLicsXG4gICdtYXAuc2VhcmNoZWQnOiAnU2VhcmNoZWQgYWRkcmVzcycsXG4gICdtYXAuY2xlYXInOiAnQ2xlYXInLFxuICAnbWFwLmZpbHRlci5hbGwnOiAnQWxsJyxcbiAgJ21hcC5maWx0ZXIucmVnaXN0cnknOiAnUmVnaXN0cnknLFxuICAnbWFwLmZpbHRlci51c2VyJzogJ1VzZXInLFxuICAnbWFwLmZpbHRlclNvdXJjZXNBcmlhJzogJ0ZpbHRlciBzaGVsdGVycyBieSBzb3VyY2UnLFxuICAnbWFwLmxlZ2VuZEFyaWEnOiAnTWFya2VyIGxlZ2VuZCcsXG4gICdtYXAuYWRkcmVzc1Jlc3VsdHNBcmlhJzogJ0FkZHJlc3MgcmVzdWx0cycsXG4gICdtYXAudHJ1c3RGaWx0ZXJzQXJpYSc6ICdTaGVsdGVyIGZpbHRlcnMnLFxuICAnbWFwLnNoZWx0ZXJMaXN0QXJpYSc6ICdTaGVsdGVycycsXG4gICdtYXAuY2hpcE9wZW4nOiAnT3BlbicsXG4gICdtYXAuY2hpcEhhc0NhcGFjaXR5JzogJ0hhcyBjYXBhY2l0eScsXG4gICdtYXAuZW1wdHlGaWx0ZXInOiAnTm8gc2hlbHRlcnMgbWF0Y2ggdGhpcyBmaWx0ZXIuJyxcbiAgJ21hcC5sb2FkaW5nJzogJ0xvYWRpbmcgc2hlbHRlcnPigKYnLFxuICAnbWFwLnZpZXdEZXRhaWxzJzogJ1ZpZXcgZGV0YWlscycsXG4gICdtYXAudmlld0RldGFpbHNGb3InOiAnVmlldyBkZXRhaWxzIGZvciAnLFxuICAnbWFwLm5lYXJlc3QuZGVuaWVkJzpcbiAgICAnTG9jYXRpb24gcGVybWlzc2lvbiBpcyBvZmYuIEFsbG93IGxvY2F0aW9uIGFjY2VzcyBpbiB5b3VyIGJyb3dzZXIsIHRoZW4gdHJ5IGFnYWluLicsXG4gICdtYXAubmVhcmVzdC50aW1lb3V0JzogJ0ZpbmRpbmcgeW91ciBsb2NhdGlvbiB0aW1lZCBvdXQuIFRyeSBhZ2FpbiBpbiBhIG1vbWVudC4nLFxuICAnbWFwLm5lYXJlc3QudW5zdXBwb3J0ZWQnOlxuICAgICdZb3VyIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBsb2NhdGlvbiBhY2Nlc3MuIENoZWNrIHlvdXIgYnJvd3NlciBzZXR0aW5ncy4nLFxuICAnbWFwLm5lYXJlc3QudW5hdmFpbGFibGUnOlxuICAgICdZb3VyIGxvY2F0aW9uIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkIHJpZ2h0IG5vdy4gVHJ5IGFnYWluIGluIGEgbW9tZW50LicsXG4gICdtYXAubmVhcmVzdC5pbnNlY3VyZSc6ICdMb2NhdGlvbiBhY2Nlc3MgbmVlZHMgYSBzZWN1cmUgKGh0dHBzKSBjb25uZWN0aW9uLicsXG4gICdtYXAuZ2VvY29kZS5ub1Jlc3VsdHMnOlxuICAgICdObyBFc3RvbmlhbiBhZGRyZXNzIGZvdW5kIOKAlCB0cnkgYW5vdGhlciBhZGRyZXNzLCBvciDigJxTaG93IHNoZWx0ZXJzIGFyb3VuZCB5b3XigJ0uJyxcbiAgJ21hcC5nZW9jb2RlLnJhdGVMaW1pdGVkJzogJ1RoZSBhZGRyZXNzIHNlYXJjaCBpcyBidXN5IOKAlCBwbGVhc2Ugd2FpdCBhIG1vbWVudCBhbmQgdHJ5IGFnYWluLicsXG4gICdtYXAuZ2VvY29kZS5uZXR3b3JrJzpcbiAgICAnQWRkcmVzcyBzZWFyY2ggaXMgdW5yZWFjaGFibGUgcmlnaHQgbm93LiBUcnkg4oCcU2hvdyBzaGVsdGVycyBhcm91bmQgeW914oCdIGluc3RlYWQuJyxcblxuICAvLyAtLS0gc2hlbHRlciBkZXRhaWwgcGFnZS4gVmVyYmF0aW0gcnVsZSBhcyBhYm92ZS5cbiAgJ2RldGFpbC5iYWNrVG9NYXAnOiAnQmFjayB0byB0aGUgbWFwJyxcbiAgJ2RldGFpbC5ub3RGb3VuZFRpdGxlJzogJ1NoZWx0ZXIgbm90IGZvdW5kJyxcbiAgJ2RldGFpbC5ub3RGb3VuZEJvZHknOiAnTm8gc2hlbHRlciB3aXRoIHRoaXMgSUQgZXhpc3RzIOKAlCBpdCBtYXkgaGF2ZSBiZWVuIHJlbW92ZWQuJyxcbiAgJ2RldGFpbC5sb2NhdGlvbkhlYWRpbmcnOiAnTG9jYXRpb24nLFxuICAnZGV0YWlsLmxvYWRpbmcnOiAnTG9hZGluZyBzaGVsdGVy4oCmJyxcbiAgJ2RldGFpbC50aXRsZUZhbGxiYWNrJzogJ1NoZWx0ZXIgZGV0YWlscycsXG4gICdkZXRhaWwuZGlzdGFuY2UuY3RhJzogJ0Rpc3RhbmNlIGZyb20geW91JyxcbiAgJ2RldGFpbC5kaXN0YW5jZS5wZW5kaW5nJzogJ01lYXN1cmluZ+KApicsXG4gICdkZXRhaWwuZGlzdGFuY2UuZnJvbVlvdSc6ICd7ZGlzdGFuY2V9IGZyb20geW91JyxcbiAgJ2RldGFpbC5kZXRhaWxzSGVhZGluZyc6ICdEZXRhaWxzJyxcbiAgJ2RldGFpbC5pbmZvSGVhZGluZyc6ICdJbmZvJyxcbiAgJ2RldGFpbC5zdGF0dXNMYWJlbCc6ICdTdGF0dXMnLFxuICAnZGV0YWlsLmNhcGFjaXR5TGFiZWwnOiAnQ2FwYWNpdHknLFxuICAnZGV0YWlsLmxhc3RSZXBvcnRlZCc6ICdMYXN0IHJlcG9ydGVkIGFzIHtraW5kfScsXG4gICdkZXRhaWwuc3RhdHVzRW1wdHknOiAnTm8gb3Blbi9jbG9zZWQgcmVwb3J0cyB5ZXQnLFxuICAnZGV0YWlsLmNhcGFjaXR5RW1wdHknOiAnTm8gaG93LWZ1bGwgcmVwb3J0cyB5ZXQnLFxuICAnZGV0YWlsLnJlcG9ydE9jY3VwYW5jeSc6ICdSZXBvcnQgaG93IGZ1bGwnLFxuICAnZGV0YWlsLnJlcG9ydE9wZW4nOiAnUmVwb3J0IG9wZW4vY2xvc2VkJyxcbiAgJ2RldGFpbC5yZXBvcnRUaGlzJzogJ1JlcG9ydCB0aGlzIHNoZWx0ZXInLFxuICAnZGV0YWlsLm5hdmlnYXRlJzogJ0dvb2dsZSBNYXBzJyxcbiAgJ2RldGFpbC5hcHBsZU1hcHMnOiAnQXBwbGUgTWFwcycsXG4gICdkZXRhaWwubmF2aWdhdGVBcmlhJzogJ09wZW4gd2Fsa2luZyBkaXJlY3Rpb25zIHRvIHtuYW1lfSBpbiBHb29nbGUgTWFwcycsXG4gICdkZXRhaWwuYXBwbGVNYXBzQXJpYSc6ICdPcGVuIGRpcmVjdGlvbnMgdG8ge25hbWV9IGluIEFwcGxlIE1hcHMnLFxuICAnZGV0YWlsLm9jY3VwYW5jeS5hcmlhJzogJ0hvdyBmdWxsIGlzIHRoaXMgc2hlbHRlciByaWdodCBub3c/JyxcbiAgJ2RldGFpbC5iYW5kLnNwYWNlJzogJ1NwYWNlIGF2YWlsYWJsZScsXG4gICdkZXRhaWwuYmFuZC5nZXR0aW5nRnVsbCc6ICdHZXR0aW5nIGZ1bGwnLFxuICAnZGV0YWlsLmJhbmQuZnVsbCc6ICdGdWxsJyxcbiAgJ2RldGFpbC52ZXJpZnkub2NjdXBhbmN5JzogJ1ZlcmlmeSB5b3VyIGVtYWlsIG9yIHBob25lIHRvIHJlcG9ydCBob3cgZnVsbCB0aGlzIHNoZWx0ZXIgaXMuJyxcbiAgJ2RldGFpbC5sb2dpbi5vY2N1cGFuY3knOiAnTG9nIGluIHRvIHJlcG9ydCBob3cgZnVsbCB0aGlzIHNoZWx0ZXIgaXMuJyxcbiAgJ2RldGFpbC5vcGVuU3RhdHVzLmFyaWEnOiAnSXMgdGhpcyBzaGVsdGVyIG9wZW4gcmlnaHQgbm93PycsXG4gICdkZXRhaWwub3BlblN0YXRlLm9wZW4nOiAnT3BlbiBub3cnLFxuICAnZGV0YWlsLm9wZW5TdGF0ZS5jbG9zZWQnOiAnQ2xvc2VkIG5vdycsXG4gICdkZXRhaWwudmVyaWZ5Lm9wZW4nOiAnVmVyaWZ5IHlvdXIgZW1haWwgb3IgcGhvbmUgdG8gcmVwb3J0IHdoZXRoZXIgdGhpcyBzaGVsdGVyIGlzIG9wZW4uJyxcbiAgJ2RldGFpbC5sb2dpbi5vcGVuJzogJ0xvZyBpbiB0byByZXBvcnQgd2hldGhlciB0aGlzIHNoZWx0ZXIgaXMgb3Blbi4nLFxuICAnZGV0YWlsLnJlcG9ydCc6ICdSZXBvcnQnLFxuICAnZGV0YWlsLnJlcG9ydFR5cGUuYXJpYSc6ICdSZXBvcnQgdHlwZScsXG4gICdkZXRhaWwucmVwb3J0VHlwZS5ub25FeGlzdGVudCc6ICdJdCBkb2VzIG5vdCBleGlzdCcsXG4gICdkZXRhaWwucmVwb3J0VHlwZS53cm9uZ0xvY2F0aW9uJzogJ1RoZSBsb2NhdGlvbiBpcyB3cm9uZycsXG4gICdkZXRhaWwucmVwb3J0VHlwZS5vdGhlcic6ICdTb21ldGhpbmcgZWxzZScsXG4gICdkZXRhaWwucmVwb3J0RGV0YWlsUGxhY2Vob2xkZXIud3JvbmdMb2NhdGlvbic6ICdXaGF0IGlzIHRoZSBhY3R1YWwgYWRkcmVzcz8nLFxuICAnZGV0YWlsLnJlcG9ydERldGFpbFBsYWNlaG9sZGVyLm90aGVyJzogJ1doYXQgc2hvdWxkIHRoZSBjb21tdW5pdHkga25vdz8nLFxuICAnZGV0YWlsLnJlcG9ydERldGFpbExhYmVsJzogJ0RldGFpbHMgKG9wdGlvbmFsKScsXG4gICdkZXRhaWwucmVwb3J0RGV0YWlsRXJyb3InOiAnRGV0YWlscyBtdXN0IGJlIDUwMCBjaGFyYWN0ZXJzIG9yIGZld2VyLicsXG4gICdkZXRhaWwudmVyaWZ5LnJlcG9ydCc6ICdWZXJpZnkgeW91ciBlbWFpbCBvciBwaG9uZSB0byByZXBvcnQgdGhpcyBzaGVsdGVyLicsXG4gICdkZXRhaWwubG9naW4ucmVwb3J0JzogJ0xvZyBpbiB0byByZXBvcnQgdGhpcyBzaGVsdGVyLicsXG4gICdkZXRhaWwuc3VibWl0dGluZyc6ICdTdWJtaXR0aW5n4oCmJyxcbiAgJ2RldGFpbC5zdWJtaXRSZXBvcnQnOiAnU3VibWl0IHJlcG9ydCcsXG4gICdkZXRhaWwuY2FuY2VsJzogJ0NhbmNlbCcsXG4gICdkZXRhaWwudmVyaWZ5QWNjb3VudCc6ICdWZXJpZnkgeW91ciBhY2NvdW50JyxcbiAgLy8gY29tbXVuaXR5IHB1bHNlIChNOSk6IGdhdWdlIGVuZCBsYWJlbHMgPSByZWNlbnQtbG9nIGtpbmQgbGFiZWxzLlxuICAnZGV0YWlsLnB1bHNlLmtpbmQub3Blbic6ICdPcGVuJyxcbiAgJ2RldGFpbC5wdWxzZS5raW5kLmNsb3NlZCc6ICdDbG9zZWQnLFxuICAnZGV0YWlsLnB1bHNlLmtpbmQuc3BhY2UnOiAnU3BhY2UgYXZhaWxhYmxlJyxcbiAgJ2RldGFpbC5wdWxzZS5raW5kLmdldHRpbmdGdWxsJzogJ0dldHRpbmcgZnVsbCcsXG4gICdkZXRhaWwucHVsc2Uua2luZC5mdWxsJzogJ0Z1bGwnLFxuICAnZGV0YWlsLnB1bHNlLnJlY2VudEVudHJ5JzogJ2EgY29tbXVuaXR5IG1lbWJlciByZXBvcnRlZDoge2tpbmR9JyxcbiAgJ2RldGFpbC5wdWxzZS5yZWNlbnQnOiAnTGFzdCAxMCByZXBvcnRzJyxcbiAgJ2RldGFpbC5wdWxzZS5yZWNlbnRFbXB0eSc6ICdObyByZXBvcnRzIHlldCcsXG4gICdkZXRhaWwucHVsc2UuZW1wdHlPcGVuJzogJ05vIG9wZW4vY2xvc2VkIHJlcG9ydHMgaW4gdGhlIGxhc3QgMiBob3VycycsXG4gICdkZXRhaWwucHVsc2UuZW1wdHlPY2N1cGFuY3knOiAnTm8gaG93LWZ1bGwgcmVwb3J0cyBpbiB0aGUgbGFzdCAyIGhvdXJzJyxcbiAgJ2RldGFpbC5wdWxzZS5vcGVuQ2xvc2VkVGV4dCc6ICdSZXBvcnRzOiB7b3Blbn0gb3Blbiwge2Nsb3NlZH0gY2xvc2VkJyxcbiAgJ2RldGFpbC5wdWxzZS5vY2N1cGFuY3lUZXh0JzpcbiAgICAnUmVwb3J0czoge3NwYWNlfSBzcGFjZSBhdmFpbGFibGUsIHtnZXR0aW5nRnVsbH0gZ2V0dGluZyBmdWxsLCB7ZnVsbH0gZnVsbCcsXG4gICdkZXRhaWwucHVsc2Uud2luZG93SGludCc6ICdSZWZsZWN0cyByZXBvcnRzIGZyb20gdGhlIGxhc3QgMiBob3VycycsXG4gICdkZXRhaWwucHVsc2UuZXN0aW1hdGVOb3RlJzogJ1RoZSBhcnJvd3Mgc2hvdyBhIGNhbGN1bGF0ZWQgZXN0aW1hdGUsIG5vdCBjb25maXJtZWQgZGF0YS4nLFxuXG4gIC8vIC0tLSBzaGFyZWQgc2hlbHRlciBjb3B5IChzaGFyZWQvc2hlbHRlci1jb3B5LnRzKS4gVGhlIG5pbmUgdmFsdWVzIHdpdGhcbiAgLy8gcHJlLWV4aXN0aW5nIHR3aW5zICh0cnVzdC1zdGF0ZSBsYWJlbHMsIHJlZ2lzdHJ5IGxhYmVscywgaW5hY2N1cmF0ZVxuICAvLyB3YXJuaW5nLCBmaXJtIGJhbmQgaGVhZHMpIFJFVVNFIGFjY291bnQuY29udHJpYi4qIC8gZGV0YWlsLmJhbmQuKiDigJRcbiAgLy8gdGhleSBhcmUgTk9UIGR1cGxpY2F0ZWQgaGVyZTsgb25seSB0aGUgcmVzdCBvZiB0aGUgbW9kdWxlJ3MgY29weSBpcyBuZXcuXG4gICdzaGVsdGVyLnN0YXR1cy5yZXBvcnRlZENsb3NlZCc6ICdSZXBvcnRlZCBjbG9zZWQnLFxuICAnc2hlbHRlci5zdGF0dXMuY2xvc2VkJzogJ0Nsb3NlZCcsXG4gICdzaGVsdGVyLnN0YXR1cy5vcGVuJzogJ09wZW4nLFxuICAnc2hlbHRlci5zdGF0dXMub3Blbk5vUmVwb3J0cyc6ICdPcGVuIChubyByZWNlbnQgcmVwb3J0cyknLFxuICAnc2hlbHRlci5vY2N1cGFuY3kuaGVkZ2VkLnNwYWNlJzogJ1JlcG9ydGVkIHNwYWNlIGF2YWlsYWJsZScsXG4gICdzaGVsdGVyLm9jY3VwYW5jeS5oZWRnZWQuZ2V0dGluZ0Z1bGwnOiAnUmVwb3J0ZWQgZ2V0dGluZyBmdWxsJyxcbiAgJ3NoZWx0ZXIub2NjdXBhbmN5LmhlZGdlZC5mdWxsJzogJ1JlcG9ydGVkIGZ1bGwnLFxuICAnc2hlbHRlci5yZWNlbmN5Lmp1c3ROb3cnOiAnanVzdCBub3cnLFxuICAnc2hlbHRlci5yZWNlbmN5Lm1pbnV0ZXMnOiAne21pbnV0ZXN9IG1pbiBhZ28nLFxuICAnc2hlbHRlci5yZWNlbmN5LmhvdXJzJzogJ3tob3Vyc30gaCBhZ28nLFxuICAnc2hlbHRlci5yZWNlbmN5LmRheXMnOiAne2RheXN9IGQgYWdvJyxcbiAgJ3NoZWx0ZXIucmVjZW5jeS5kYXRlJzogJ3tkYXl9IHttb250aH0ge3llYXJ9JyxcbiAgJ3NoZWx0ZXIucmVwb3J0ZWRCYWRnZSc6ICdSZXBvcnRlZCAoe2NvdW50fSknLFxuICAnc2hlbHRlci5wcml2YXRlQmFkZ2UnOiAnUHJpdmF0ZSBob21lIChkZWNsYXJlZCknLFxuICAnc2hlbHRlci5wcml2YXRlTm90ZSc6ICdUaGlzIGlzIGEgcmVzaWRlbnQtb2ZmZXJlZCBsb2NhdGlvbiwgbm90IGFuIG9mZmljaWFsIGZhY2lsaXR5LicsXG4gICdzaGVsdGVyLnVudmVyaWZpZWRXYXJuaW5nJzpcbiAgICAnVGhpcyBsb2NhdGlvbiB3YXMgc3VibWl0dGVkIGJ5IGEgY29tbXVuaXR5IG1lbWJlciBhbmQgaGFzIG5vdCBiZWVuIG9mZmljaWFsbHkgdmVyaWZpZWQuIERvIG5vdCByZWx5IG9uIGl0IGR1cmluZyBhbiBlbWVyZ2VuY3kuJyxcbiAgJ3NoZWx0ZXIubGFzdFZlcmlmaWVkJzogJ0xhc3QgdmVyaWZpZWQge2Fnb30nLFxuICAnc2hlbHRlci5sYXN0VmVyaWZpZWRSZWdpc3RyeSc6ICdMYXN0IHZlcmlmaWVkIGFnYWluc3QgdGhlIHJlZ2lzdHJ5IHthZ299JyxcbiAgJ3NoZWx0ZXIubmV3bHlBZGRlZFVudmVyaWZpZWQnOiAnTmV3bHkgYWRkZWQge2Fnb30g4oCUIG5vdCB5ZXQgdmVyaWZpZWQnLFxuICAnc2hlbHRlci5ub1ZlcmlmaWNhdGlvblJlY29yZCc6ICdObyB2ZXJpZmljYXRpb24gcmVjb3JkIHlldCcsXG4gICdzaGVsdGVyLmNvbW11bml0eVJlcG9ydHMnOiAnQ29tbXVuaXR5IHJlcG9ydHM6IHtjb3VudH0gKHRvdGFsLCBhbGwgdHlwZXMpJyxcbiAgLy8gVGhlIHN1Ym1pdHRlcidzIHZlcmlmaWNhdGlvbiBkZXB0aCAoc3VibWl0dGVyLXZlcmlmaWNhdGlvbi1iYWRnZSk6IHRoZVxuICAvLyBzaW5nbGUgY29uZmlybWVkIGNoYW5uZWwsIG9yIEZVTEwgYXQgdHdvIG9yIG1vcmUuIE9ubHkgdXNlci1zdWJtaXR0ZWRcbiAgLy8gcm93cyBjYXJyeSBpdDsgdGhlIHJvdy9kZXRhaWwgc3VyZmFjZXMgcmVuZGVyIGl0IGJlc2lkZSB0aGUgdHJ1c3QgYmFkZ2UuXG4gICdzaGVsdGVyLnN1Ym1pdHRlclZlcmlmaWNhdGlvbi5lbWFpbCc6ICdBZGRlZCBieSBhbiBlLW1haWwgdmVyaWZpZWQgdXNlcicsXG4gICdzaGVsdGVyLnN1Ym1pdHRlclZlcmlmaWNhdGlvbi5waG9uZSc6ICdBZGRlZCBieSBhIHBob25lIHZlcmlmaWVkIHVzZXInLFxuICAnc2hlbHRlci5zdWJtaXR0ZXJWZXJpZmljYXRpb24uc21hcnRJZCc6ICdBZGRlZCBieSBhIFNtYXJ0LUlEIHZlcmlmaWVkIHVzZXInLFxuICAnc2hlbHRlci5zdWJtaXR0ZXJWZXJpZmljYXRpb24uZnVsbCc6ICdBZGRlZCBieSBhIGZ1bGx5IHZlcmlmaWVkIHVzZXInLFxuICAnc2hlbHRlci5kaXN0YW5jZS5tZXRlcnMnOiAn4omIIHtkaXN0YW5jZX0gbSBzdHJhaWdodCBsaW5lJyxcbiAgJ3NoZWx0ZXIuZGlzdGFuY2Uua2lsb21ldGVycyc6ICfiiYgge2Rpc3RhbmNlfSBrbSBzdHJhaWdodCBsaW5lJyxcbiAgJ3NoZWx0ZXIubm90aWNlLnJlcG9ydFN1Ym1pdHRlZCc6ICdZb3VyIHJlcG9ydCB3YXMgc3VibWl0dGVkLicsXG4gICdzaGVsdGVyLm5vdGljZS5yZXBvcnRTdWJtaXR0ZWREYW1wZWQnOlxuICAgICdZb3VyIHJlcG9ydCB3YXMgcmVjb3JkZWQgYnV0IHdlaWdodGVkIDAg4oCUIGJlY2F1c2UgeW91IGhhdmUgeW91ciBvd24gbGlzdGluZyBvZiBhIHNpbWlsYXIgbG9jYXRpb24sIGl0IGRvZXMgbm90IGNvdW50IHRvd2FyZCBoaWRpbmcgdGhpcyBzaGVsdGVyLicsXG4gICdzaGVsdGVyLm5vdGljZS5vY2N1cGFuY3lTYXZlZCc6ICdZb3VyIG9jY3VwYW5jeSByZXBvcnQgd2FzIHNhdmVkLicsXG4gICdzaGVsdGVyLm5vdGljZS5vcGVuQ2xvc2VkU2F2ZWQnOiAnWW91ciBvcGVuL2Nsb3NlZCByZXBvcnQgd2FzIHNhdmVkLicsXG4gICdzaGVsdGVyLm5vdGljZS5yZXBvcnREdXBsaWNhdGUnOiAnWW91IGhhdmUgYWxyZWFkeSByZXBvcnRlZCB0aGlzIHNoZWx0ZXIgd2l0aCB0aGlzIHJlcG9ydCB0eXBlLicsXG5cbiAgLy8gLS0tIHN1Ym1pdCBzaGVsdGVyIHBhZ2UgKHRoZSBjb250cmlidXRlIHN1cmZhY2UpLlxuICAnc3VibWl0LmJhY2tUb01hcCc6ICdCYWNrIHRvIHRoZSBtYXAnLFxuICAnc3VibWl0LnRpdGxlJzogJ1N1Ym1pdCBhIHNoZWx0ZXInLFxuICAnc3VibWl0LnN1YnRpdGxlJzogJ0FkZCBhIGNvbW11bml0eSBib21iIHNoZWx0ZXIgdG8gdGhlIG1hcC4nLFxuICAnc3VibWl0LnN1Y2Nlc3NCb2R5JzpcbiAgICAnWW91ciBsb2NhdGlvbiBpcyBub3cgbGlzdGVkIGFuZCBtYXJrZWQgYXMgbmV3bHkgYWRkZWQuIENvbW11bml0eSByZXBvcnRzIGNvbmZpcm0gaXQuJyxcbiAgJ3N1Ym1pdC5zdWNjZXNzLnZpZXdMb2NhdGlvbic6ICdWaWV3IHlvdXIgbG9jYXRpb24nLFxuICAnc3VibWl0LnN1Y2Nlc3Mudmlld0NvbnRyaWJ1dGlvbnMnOiAnVmlldyB5b3VyIGNvbnRyaWJ1dGlvbnMnLFxuICAnc3VibWl0LnZlcmlmeUhpbnQnOiAnVGhpcyBhY2NvdW50IG5vIGxvbmdlciBoYXMgYSB2ZXJpZmllZCBjbGFpbS4nLFxuICAnc3VibWl0LnZlcmlmeUhpbnQubGluayc6ICdHbyB0byB2ZXJpZmljYXRpb24nLFxuICAnc3VibWl0Lm5hbWVMYWJlbCc6ICdOYW1lIConLFxuICAnc3VibWl0Lm5hbWVQbGFjZWhvbGRlcic6ICdlLmcuIEthbGFtYWphIGNvbW11bml0eSBzaGVsdGVyJyxcbiAgJ3N1Ym1pdC5uYW1lLnJlcXVpcmVkJzogJ0EgbmFtZSBpcyByZXF1aXJlZC4nLFxuICAnc3VibWl0Lm5hbWUudG9vTG9uZyc6ICdOYW1lIG11c3QgYmUgMjAwIGNoYXJhY3RlcnMgb3IgZmV3ZXIuJyxcbiAgJ3N1Ym1pdC5kZXNjcmlwdGlvbkxhYmVsJzogJ0Rlc2NyaXB0aW9uIChvcHRpb25hbCknLFxuICAnc3VibWl0LmRlc2NyaXB0aW9uUGxhY2Vob2xkZXInOiAnQWNjZXNzLCBjb25kaXRpb25zLCB3aG8gcnVucyBpdOKApicsXG4gICdzdWJtaXQuZGVzY3JpcHRpb24udG9vTG9uZyc6ICdEZXNjcmlwdGlvbiBtdXN0IGJlIDIwMDAgY2hhcmFjdGVycyBvciBmZXdlci4nLFxuICAnc3VibWl0LmNhcGFjaXR5TGFiZWwnOiAnQ2FwYWNpdHkgKG9wdGlvbmFsKScsXG4gICdzdWJtaXQuY2FwYWNpdHlIaW50JzogJzHigJMxMDAgMDAwIHBlb3BsZScsXG4gICdzdWJtaXQuY2FwYWNpdHlQbGFjZWhvbGRlcic6ICdlLmcuIDQwJyxcbiAgJ3N1Ym1pdC5jYXBhY2l0eS5pbnZhbGlkJzogJ0NhcGFjaXR5IG11c3QgYmUgYSB3aG9sZSBudW1iZXIgYmV0d2VlbiAxIGFuZCAxMDAgMDAwLicsXG4gICdzdWJtaXQucHJpdmF0ZUxhYmVsJzpcbiAgICAnVGhpcyBpcyBhIHByaXZhdGUgaG9tZSBvciBwcml2YXRlIHNoZWx0ZXIgKGEgcmVzaWRlbnQgb2ZmZXJzIGl0IGFzIGEgcmVmdWdlIHNwb3QpJyxcbiAgJ3N1Ym1pdC5sb2NhdGlvbkxlZ2VuZCc6ICdMb2NhdGlvbiAqJyxcbiAgJ3N1Ym1pdC5sb2NhdGlvbk5vdGUnOlxuICAgICdQYXN0ZSBjb29yZGluYXRlcyAoNTkuNDM3MCwgMjQuNzUzNSkgb3IgYSBtYXAgbGluaywgc2VhcmNoIGFuIEVzdG9uaWFuIGFkZHJlc3MsIHVzZSBcIlVzZSBteSBsb2NhdGlvblwiLCBvciBjbGljayB0aGUgbWFwLiBJdCBtdXN0IGJlIGluc2lkZSBFc3RvbmlhLicsXG4gICdzdWJtaXQubG9jYXRpb25MYWJlbCc6ICdDb29yZGluYXRlcyBvciBtYXAgbGluaycsXG4gICdzdWJtaXQubG9jYXRpb25QbGFjZWhvbGRlcic6ICc1OS40MzcwLCAyNC43NTM1IOKAlCBvciBwYXN0ZSBhIEdvb2dsZSBNYXBzIGxpbmsnLFxuICAnc3VibWl0LmxvY2F0aW9uLnNldCc6ICdTZXQgbG9jYXRpb24nLFxuICAnc3VibWl0LmxvY2F0aW9uLnJlc29sdmluZyc6ICdSZXNvbHZpbmfigKYnLFxuICAnc3VibWl0LmxvY2F0aW9uLnByZWZpbGxOb3RlJzpcbiAgICAnQW4gYWRkcmVzcyBmcm9tIHRoZSBzZWFyY2ggYmVsb3cgZmlsbHMgdGhpcyBmaWVsZCBvbmx5IHdoaWxlIGl0IGlzIGVtcHR5LicsXG4gICdzdWJtaXQuYWRkcmVzc0xhYmVsJzogJ1NlYXJjaCBhbiBFc3RvbmlhbiBhZGRyZXNzJyxcbiAgJ3N1Ym1pdC5hZGRyZXNzUGxhY2Vob2xkZXInOiAnZS5nLiBMb3NzaSAyLCBUYXJ0dScsXG4gICdzdWJtaXQuc2VhcmNoJzogJ1NlYXJjaCcsXG4gICdzdWJtaXQuc2VhcmNoaW5nJzogJ1NlYXJjaGluZ+KApicsXG4gICdzdWJtaXQuYXR0cmlidXRpb25MZWFkJzogJ0FkZHJlc3MgZGF0YScsXG4gICdzdWJtaXQub3NtQXR0cmlidXRpb24nOiAnwqkgT3BlblN0cmVldE1hcCBjb250cmlidXRvcnMnLFxuICAnc3VibWl0LnVzZU15TG9jYXRpb24nOiAnVXNlIG15IGxvY2F0aW9uJyxcbiAgJ3N1Ym1pdC5sb2NhdGluZyc6ICdMb2NhdGluZ+KApicsXG4gICdzdWJtaXQubG9jYXRpb24uZW1wdHknOiAnTm8gbG9jYXRpb24geWV0JyxcbiAgJ3N1Ym1pdC5zdWJtaXQnOiAnU3VibWl0IHNoZWx0ZXInLFxuICAnc3VibWl0LnN1Ym1pdHRpbmcnOiAnU3VibWl0dGluZ+KApicsXG4gICdzdWJtaXQuaGludC5mcm9tJzogJ0xvY2F0aW9uIGZyb20gJyxcbiAgJ3N1Ym1pdC5oaW50LnNvdXJjZS50eXBlZCc6ICd0eXBlZCBjb29yZGluYXRlcycsXG4gICdzdWJtaXQuaGludC5zb3VyY2UubGluayc6ICd0aGUgbWFwIGxpbmsnLFxuICAnc3VibWl0LmhpbnQuc291cmNlLmdlb2xvY2F0aW9uJzogJ3lvdXIgZGV2aWNlIGxvY2F0aW9uJyxcbiAgJ3N1Ym1pdC5oaW50LnNvdXJjZS5tYXAnOiAndGhlIG1hcCcsXG4gICdzdWJtaXQuaGludC5zb3VyY2UuYWRkcmVzcyc6ICd0aGUgYWRkcmVzcyBzZWFyY2gnLFxuICAnc3VibWl0LmhpbnQuc3dhcHBlZCc6XG4gICAgJyDigJQgZGV0ZWN0ZWQgYXMgbG9uZ2l0dWRlLCBsYXRpdHVkZSwgc28gdGhlIHZhbHVlcyB3ZXJlIHN3YXBwZWQgdG8gcGxhY2UgdGhlbSBpbnNpZGUgRXN0b25pYScsXG4gICdzdWJtaXQuaGludC5hY2N1cmFjeSc6ICcgKGFjY3VyYWN5IGFib3V0IHttfSBtIOKAlCBkcmFnIHRoZSBwaW4gaWYgbmVlZGVkKScsXG4gICdzdWJtaXQubG9jLm1pc3NpbmcnOlxuICAgICdQaWNrIGEgbG9jYXRpb24gb24gdGhlIG1hcCwgcGFzdGUgY29vcmRpbmF0ZXMgb3IgYSBsaW5rLCBvciB1c2UgXCJVc2UgbXkgbG9jYXRpb25cIi4nLFxuICAnc3VibWl0LmxvYy5ub1BhaXInOlxuICAgICdObyByZWNvZ25pemFibGUgY29vcmRpbmF0ZXMgaW4gdGhhdCB0ZXh0LiBQYXN0ZSBhIHBhaXIgbGlrZSA1OS40MzcwLCAyNC43NTM1IG9yIGEgbWFwIGxpbmsg4oCUIG9yIHVzZSBcIlVzZSBteSBsb2NhdGlvblwiIC8gdGhlIG1hcC4nLFxuICAnc3VibWl0LmxvYy5vdXRPZkJvdW5kcyc6ICdUaGUgbG9jYXRpb24gaXMgb3V0c2lkZSBFc3RvbmlhLicsXG4gICdzdWJtaXQubG9jLmludmFsaWQnOlxuICAgICdUaGF0IGRvZXMgbm90IGxvb2sgbGlrZSBjb29yZGluYXRlcy4gVXNlIGEgcGFpciBsaWtlIDU5LjQzNzAsIDI0Ljc1MzUsIGEgRE1TIHN0cmluZywgb3IgYSBtYXAgbGluay4nLFxuICAnc3VibWl0LmxvYy5kZWNpbWFsQ29tbWEnOlxuICAgICdVc2UgYSBkZWNpbWFsIHBvaW50OiA1OS40MzcwLCAyNC43NTM1IChFc3RvbmlhbiBkZWNpbWFsLWNvbW1hIGRldGVjdGVkKS4nLFxuICAnc3VibWl0LmxvYy5nZW9EZW5pZWQnOlxuICAgICdMb2NhdGlvbiBwZXJtaXNzaW9uIGlzIG9mZi4gQWxsb3cgbG9jYXRpb24gYWNjZXNzIGluIHlvdXIgYnJvd3NlciDigJQgb3IgcGljayB0aGUgc3BvdCBvbiB0aGUgbWFwIC8gcGFzdGUgYSBsaW5rLicsXG4gICdzdWJtaXQubG9jLmdlb1VuYXZhaWxhYmxlJzpcbiAgICAnWW91ciBsb2NhdGlvbiBjb3VsZCBub3QgYmUgZGV0ZXJtaW5lZCByaWdodCBub3cuIFBpY2sgdGhlIHNwb3Qgb24gdGhlIG1hcCBvciBwYXN0ZSBhIGxpbmsuJyxcbiAgJ3N1Ym1pdC5sb2MuZ2VvVGltZW91dCc6XG4gICAgJ0ZpbmRpbmcgeW91ciBsb2NhdGlvbiB0aW1lZCBvdXQuIFBpY2sgdGhlIHNwb3Qgb24gdGhlIG1hcCBvciBwYXN0ZSBhIGxpbmsuJyxcbiAgJ3N1Ym1pdC5sb2MuZ2VvSW5zZWN1cmUnOlxuICAgICdMb2NhdGlvbiBhY2Nlc3MgbmVlZHMgYSBzZWN1cmUgKGh0dHBzKSBjb25uZWN0aW9uLiBQaWNrIHRoZSBzcG90IG9uIHRoZSBtYXAgb3IgcGFzdGUgYSBsaW5rLicsXG4gICdzdWJtaXQubG9jLnNob3J0TGlua0ZhaWxlZCc6XG4gICAgJ0NvdWxkIG5vdCBmaW5kIGNvb3JkaW5hdGVzIGluIHRoYXQgbGluay4gVXNlIGEgZnVsbCBHb29nbGUgTWFwcyBsaW5rIG9yIHBpY2sgdGhlIHNwb3Qgb24gdGhlIG1hcC4nLFxuICAnc3VibWl0LmxvYy5zaG9ydExpbmtSYXRlTGltaXRlZCc6XG4gICAgJ1RvbyBtYW55IGxpbmsgbG9va3VwcyDigJQgcGxlYXNlIHdhaXQgYSBtaW51dGUgYW5kIHRoZW4gdHJ5IGFnYWluLicsXG4gICdzdWJtaXQubG9jLnNob3J0TGlua1VuYXZhaWxhYmxlJzpcbiAgICAnTG9jYXRpb24gbG9va3VwIGlzIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlLiBUcnkgYWdhaW4gaW4gYSBtb21lbnQsIG9yIHBpY2sgdGhlIHNwb3Qgb24gdGhlIG1hcC4nLFxuICAnc3VibWl0Lmdlb2NvZGUubm9SZXN1bHRzJzpcbiAgICAnTm8gRXN0b25pYW4gYWRkcmVzcyBmb3VuZCDigJQgdHJ5IHRoZSBtYXAsIGEgbGluaywgb3IgXCJVc2UgbXkgbG9jYXRpb25cIi4nLFxuICAnc3VibWl0Lmdlb2NvZGUucmF0ZUxpbWl0ZWQnOiAnVGhlIGFkZHJlc3Mgc2VhcmNoIGlzIGJ1c3kg4oCUIHBsZWFzZSB3YWl0IGEgbW9tZW50IGFuZCB0cnkgYWdhaW4uJyxcbiAgJ3N1Ym1pdC5nZW9jb2RlLm5ldHdvcmsnOlxuICAgICdBZGRyZXNzIHNlYXJjaCBpcyB1bnJlYWNoYWJsZSByaWdodCBub3cuIFVzZSB0aGUgbWFwIG9yIGEgbGluayBpbnN0ZWFkLicsXG5cbiAgLy8gLS0tIGVycm9yIGJhbm5lcnMgKHNoYXJlZCBlcnJvciBtYXBwaW5nLCBpMThuLWF3YXJlIHNlYW0pLiBFTiBpcyB0aGVcbiAgLy8gdmVyYmF0aW0gY29weSB0aGUgc2hhcmVkIGVycm9yLWNvcHkgbW9kdWxlIGFscmVhZHkgc2hpcHMuXG4gICdlcnJvci5yYXRlTGltaXRlZCc6ICdUb28gbWFueSBhdHRlbXB0cyDigJQgcGxlYXNlIHdhaXQgYSBtb21lbnQgYW5kIHRoZW4gdHJ5IGFnYWluLicsXG4gICdlcnJvci51bmF1dGhvcml6ZWQnOiAnTm90IGF1dGhvcml6ZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uJyxcbiAgLy8gVGhlIGxvZ2luIDQwMSBhbmQgdGhlIHBhc3N3b3JkLXJlc2V0LWNvbmZpcm0gNDAwIGFyZSBkZWxpYmVyYXRlbHlcbiAgLy8gY2xpZW50LWF1dGhvcmVkIChhbnRpLWVudW1lcmF0aW9uOiB0aGV5IG5ldmVyIGVjaG8gdGhlIGJhY2tlbmQnc1xuICAvLyBtZXNzYWdlKSwgc28gdGhleSBhcmUgY2F0YWxvZyBrZXlzIGxpa2UgdGhlIHJlc3Qgb2YgdGhpcyBibG9jay5cbiAgJ2Vycm9yLmludmFsaWRDcmVkZW50aWFscyc6ICdJbnZhbGlkIGVtYWlsL3Bob25lIG9yIHBhc3N3b3JkLicsXG4gICdlcnJvci5yZXNldEJhZENvZGUnOlxuICAgICdUaGF0IGNvZGUgaXMgaW52YWxpZCBvciBoYXMgZXhwaXJlZC4gQ2hlY2sgdGhlIGxhdGVzdCBlLW1haWwgYW5kIHRyeSBhZ2Fpbi4nLFxuICAnZXJyb3IuY2hlY2tJbnB1dCc6ICdQbGVhc2UgY2hlY2sgeW91ciBpbnB1dCBhbmQgdHJ5IGFnYWluLicsXG4gICdlcnJvci5zZXJ2ZXJFcnJvcic6ICdTb21ldGhpbmcgd2VudCB3cm9uZy4gUGxlYXNlIHRyeSBhZ2Fpbi4nLFxuICAnZXJyb3IudmFsdWVJblVzZSc6ICdUaGF0IHZhbHVlIGlzIGFscmVhZHkgaW4gdXNlLicsXG4gICdlcnJvci52ZXJpZnlSYXRlTGltaXRlZCc6XG4gICAgJ1RvbyBtYW55IGNvZGVzIGhhdmUgYmVlbiByZXF1ZXN0ZWQuIFBsZWFzZSB3YWl0IGEgd2hpbGUgYmVmb3JlIHJlcXVlc3RpbmcgYW5vdGhlciAoY29kZXMgYXJlIGxpbWl0ZWQgcGVyIGRheSkuJyxcbiAgJ2Vycm9yLnZlcmlmeUJhZENvZGUnOiAnVGhhdCBjb2RlIGlzIGludmFsaWQgb3IgaGFzIGV4cGlyZWQuIENoZWNrIGl0IGFuZCB0cnkgYWdhaW4uJyxcbiAgJ2Vycm9yLmFjY291bnRSYXRlTGltaXRlZCc6ICdUb28gbWFueSByZXF1ZXN0cy4gUGxlYXNlIHdhaXQgYSBtb21lbnQgYW5kIHRoZW4gdHJ5IGFnYWluLicsXG4gICdlcnJvci5hY2NvdW50QmFkQ29kZSc6ICdUaGF0IGNvZGUgaXMgaW52YWxpZCBvciBoYXMgZXhwaXJlZC4gUGxlYXNlIHJlcXVlc3QgYSBuZXcgb25lLicsXG4gICdlcnJvci5uZXR3b3JrJzogJ0Nhbm5vdCByZWFjaCB0aGUgYmFja2VuZC4gSXQgbWF5IGJlIG9mZmxpbmUg4oCUIHBsZWFzZSB0cnkgYWdhaW4gbGF0ZXIuJyxcblxuICAvLyAtLS0gYWNjb3VudCBwYWdlICgvYWNjb3VudCkuIFNhbWUgdmVyYmF0aW0gcnVsZTogdGhlIEVOIHN0cmluZ3MgQVJFIHRoZVxuICAvLyBjdXJyZW50IGNvbW1pdHRlZCBhY2NvdW50LXN1cmZhY2UgdGVtcGxhdGUgY29weS5cbiAgJ2FjY291bnQuc3VidGl0bGUnOlxuICAgICdZb3VyIHByb2ZpbGUgYW5kIHZlcmlmaWNhdGlvbi4gVGhlIG5hbWUgY2FuIGJlIGNvcnJlY3RlZCB3aXRoIGEgcGFzc3dvcmQgY29uZmlybWF0aW9uOyBlbWFpbCBhbmQgcGhvbmUgY2hhbmdlcyBhcmUgcHJvdmVuIGNyb3NzLWNoYW5uZWwuJyxcbiAgJ2FjY291bnQucHJvZmlsZUxvYWRFcnJvcic6ICdXZSBjb3VsZCBub3QgbG9hZCB5b3VyIHByb2ZpbGUuIFRoZSBzZXNzaW9uIGlzIHN0aWxsIGFjdGl2ZS4nLFxuICAnYWNjb3VudC5yZXRyeWluZyc6ICdSZXRyeWluZ+KApicsXG4gICdhY2NvdW50LnJldHJ5JzogJ1JldHJ5JyxcbiAgJ2FjY291bnQuaWRlbnRpdHknOiAnSWRlbnRpdHknLFxuICAnYWNjb3VudC5uYW1lJzogJ05hbWUnLFxuICAnYWNjb3VudC5hZG1pbkJhZGdlJzogJ0FkbWluJyxcbiAgJ2FjY291bnQuaWRlbnRpdHlDb3B5JzpcbiAgICAnQSB0eXBvIGF0IHJlZ2lzdHJhdGlvbiBuZXZlciBmb3JjZXMgYSBuZXcgYWNjb3VudCDigJQgdGhlIGVkaXQgaXMgY29uZmlybWVkIHdpdGggeW91ciBjdXJyZW50IHBhc3N3b3JkLicsXG4gICdhY2NvdW50LmVkaXQnOiAnRWRpdCcsXG4gICdhY2NvdW50LmN1cnJlbnRQYXNzd29yZCc6ICdDdXJyZW50IHBhc3N3b3JkJyxcbiAgJ2FjY291bnQubmFtZVJlcXVpcmVkJzogJ0EgbmFtZSBpcyByZXF1aXJlZC4nLFxuICAnYWNjb3VudC5wYXNzd29yZFJlcXVpcmVkJzogJ1lvdXIgY3VycmVudCBwYXNzd29yZCBpcyByZXF1aXJlZC4nLFxuICAnYWNjb3VudC5zYXZpbmcnOiAnU2F2aW5n4oCmJyxcbiAgJ2FjY291bnQuc2F2ZSc6ICdTYXZlIGNoYW5nZXMnLFxuICAnYWNjb3VudC5jYW5jZWwnOiAnQ2FuY2VsJyxcbiAgJ2FjY291bnQuY29udGFjdHMnOiAnQ29udGFjdHMnLFxuICAnYWNjb3VudC5lbWFpbExhYmVsJzogJ0VtYWlsIGFkZHJlc3MnLFxuICAnYWNjb3VudC5waG9uZUxhYmVsJzogJ1Bob25lIG51bWJlcicsXG4gICdhY2NvdW50LnZlcmlmaWVkJzogJ1ZlcmlmaWVkJyxcbiAgJ2FjY291bnQuY29tcGxldGVWZXJpZmljYXRpb24nOiAnQ29tcGxldGUgdmVyaWZpY2F0aW9uJyxcbiAgJ2FjY291bnQuY2hhbmdlRW1haWwnOiAnQ2hhbmdlIGVtYWlsIGFkZHJlc3MnLFxuICAnYWNjb3VudC5lbWFpbERvbmUuYmVmb3JlJzogJ1lvdXIgZW1haWwgaXMgbm93JyxcbiAgJ2FjY291bnQuZW1haWxEb25lLmFmdGVyJzogJy4gVGhlIG5leHQgdGltZSB5b3Ugc2lnbiBpbiwgdXNlIHRoZSBuZXcgYWRkcmVzcy4nLFxuICAnYWNjb3VudC5jaGFuZ2VBZ2Fpbic6ICdDaGFuZ2UgaXQgYWdhaW4nLFxuICAnYWNjb3VudC5uZXdFbWFpbCc6ICdOZXcgZW1haWwnLFxuICAnYWNjb3VudC5uZXdFbWFpbFBsYWNlaG9sZGVyJzogJ25ld0BleGFtcGxlLmVlJyxcbiAgJ2FjY291bnQuZW1haWxUb29Mb25nJzogJ0VtYWlsIG11c3QgYmUgMjU1IGNoYXJhY3RlcnMgb3IgZmV3ZXIuJyxcbiAgJ2FjY291bnQuZW1haWxSZXF1aXJlZCc6ICdBIHZhbGlkIGVtYWlsIGlzIHJlcXVpcmVkLicsXG4gICdhY2NvdW50LmVtYWlsUHJvb2YnOlxuICAgICdGb3Igc2VjdXJpdHksIGNoYW5naW5nIHRoZSBlbWFpbCBpcyBjb25maXJtZWQgYnkgYW4gU01TIGNvZGUgc2VudCB0byB0aGUgcGhvbmUgbnVtYmVyIG9uIHlvdXIgYWNjb3VudCDigJQgbmV2ZXIgdG8gdGhlIG5ldyBhZGRyZXNzLicsXG4gICdhY2NvdW50LnNtc0NvZGUnOiAnU01TIGNvZGUnLFxuICAnYWNjb3VudC5jb2RlUGxhY2Vob2xkZXInOiAnNi1kaWdpdCBjb2RlJyxcbiAgJ2FjY291bnQuc21zQ29kZVJlcXVpcmVkJzogJ0VudGVyIHRoZSA2LWRpZ2l0IGNvZGUgZnJvbSB0aGUgU01TLicsXG4gICdhY2NvdW50LnNtc1NlbnRIaW50JzogJ1dlIHNlbnQgYW4gU01TIGNvZGUgdG8gdGhlIHBob25lIG51bWJlciBvbiB5b3VyIGFjY291bnQuJyxcbiAgJ2FjY291bnQud29ya2luZyc6ICdXb3JraW5n4oCmJyxcbiAgJ2FjY291bnQuY29uZmlybU5ld0VtYWlsJzogJ0NvbmZpcm0gbmV3IGVtYWlsJyxcbiAgJ2FjY291bnQucmVzZW5kSW4nOiAnUmVzZW5kIGluIHt0aW1lfScsXG4gICdhY2NvdW50LnJlc2VuZENvZGUnOiAnUmVzZW5kIGNvZGUnLFxuICAnYWNjb3VudC5zZW5kaW5nJzogJ1NlbmRpbmfigKYnLFxuICAnYWNjb3VudC5zZW5kSW4nOiAnU2VuZCBpbiB7dGltZX0nLFxuICAnYWNjb3VudC5zZW5kU21zVG9QaG9uZSc6ICdTZW5kIFNNUyBjb2RlIHRvIG15IHBob25lJyxcbiAgJ2FjY291bnQuY2hhbmdlUGhvbmUnOiAnQ2hhbmdlIHBob25lIG51bWJlcicsXG4gICdhY2NvdW50LnBob25lRG9uZS5iZWZvcmUnOiAnWW91ciBwaG9uZSBpcyBub3cnLFxuICAnYWNjb3VudC5waG9uZURvbmUuYWZ0ZXInOiAnLicsXG4gICdhY2NvdW50Lm5ld1Bob25lJzogJ05ldyBwaG9uZScsXG4gICdhY2NvdW50Lm5ld1Bob25lUGxhY2Vob2xkZXInOiAnKzM3MjXigKYgb3IgNXh4eHh4eHgnLFxuICAnYWNjb3VudC5waG9uZVRvb0xvbmcnOiAnUGhvbmUgbXVzdCBiZSA2NCBjaGFyYWN0ZXJzIG9yIGZld2VyLicsXG4gICdhY2NvdW50LnBob25lUmVxdWlyZWQnOiAnQSBwaG9uZSBudW1iZXIgaXMgcmVxdWlyZWQuJyxcbiAgJ2FjY291bnQucGhvbmVQcm9vZic6XG4gICAgJ0ZvciBzZWN1cml0eSwgY2hhbmdpbmcgdGhlIHBob25lIGlzIGNvbmZpcm1lZCBieSBhbiBlbWFpbCBjb2RlIHNlbnQgdG8gdGhlIGVtYWlsIGFkZHJlc3Mgb24geW91ciBhY2NvdW50IOKAlCBsb3NpbmcgeW91ciBTSU0gYWxvbmUgY2Fubm90IHJlLXJvdXRlIHZlcmlmaWNhdGlvbi4nLFxuICAnYWNjb3VudC5lbWFpbENvZGUnOiAnRW1haWwgY29kZScsXG4gICdhY2NvdW50LmVtYWlsQ29kZVJlcXVpcmVkJzogJ0VudGVyIHRoZSA2LWRpZ2l0IGNvZGUgZnJvbSB0aGUgZW1haWwuJyxcbiAgJ2FjY291bnQuZW1haWxDb2RlU2VudEhpbnQnOiAnV2Ugc2VudCBhbiBlbWFpbCBjb2RlIHRvIHRoZSBlbWFpbCBhZGRyZXNzIG9uIHlvdXIgYWNjb3VudC4nLFxuICAnYWNjb3VudC5jb25maXJtTmV3UGhvbmUnOiAnQ29uZmlybSBuZXcgcGhvbmUnLFxuICAnYWNjb3VudC5zZW5kRW1haWxDb2RlJzogJ1NlbmQgZW1haWwgY29kZSB0byBteSBlbWFpbCcsXG4gICdhY2NvdW50LmNvbnRyaWJ1dGlvbnMnOiAnTXkgY29udHJpYnV0aW9ucycsXG4gICdhY2NvdW50LmNvbnRyaWJ1dGlvbnNDb3B5JzogJ1RoZSBzaGVsdGVycyB5b3Ugc3VibWl0dGVkIOKAlCBlZGl0IG9yIHJlbW92ZSB0aGVtIGhlcmUuJyxcbiAgJ2FjY291bnQueW91ckRhdGEnOiAnWW91ciBkYXRhJyxcbiAgJ2FjY291bnQuZGF0YUNvcHknOlxuICAgICdEb3dubG9hZCBhIEpTT04gZmlsZSB3aXRoIGV2ZXJ5dGhpbmcgdGllZCB0byB5b3VyIGFjY291bnQg4oCUIHlvdXIgcHJvZmlsZSAobmFtZSwgZW1haWwsIHBob25lKSBhbmQgdGhlIHNoZWx0ZXJzIHlvdSBzdWJtaXR0ZWQuJyxcbiAgJ2FjY291bnQucHJlcGFyaW5nJzogJ1ByZXBhcmluZ+KApicsXG4gICdhY2NvdW50LmRvd25sb2FkRGF0YSc6ICdEb3dubG9hZCBteSBkYXRhIChKU09OKScsXG4gICdhY2NvdW50LmRlbGV0aW5nJzogJ0RlbGV0aW5n4oCmJyxcbiAgJ2FjY291bnQuZGVsZXRlJzogJ0RlbGV0ZSBhY2NvdW50JyxcbiAgJ2FjY291bnQuZGVsZXRlLmFkbWluQ29weSc6XG4gICAgJ1RoaXMgYWNjb3VudCB3YXMgcHJvdmlzaW9uZWQgYnkgdGhlIGRlcGxveW1lbnQgZW52aXJvbm1lbnQsIHNvIGl0IGNhbm5vdCBiZSBkZWxldGVkIGZyb20gdGhlIGFwcC4gRGUtcHJvdmlzaW9uaW5nIGlzIGFuIG9wZXJhdG9yIGFjdGlvbiDigJQgcmVtb3ZpbmcgdGhlIEFETUlOX0VNQUlMIGFuZCBBRE1JTl9QQVNTV09SRCBlbnZpcm9ubWVudCB2YXJpYWJsZXMg4oCUIGFuZCB0aGUgc2VydmVyIHJlZnVzZXMgdGhlIGRlbGV0aW9uIGVpdGhlciB3YXkuJyxcbiAgJ2FjY291bnQuZGVsZXRlLmNvcHknOlxuICAgICdFcmFzZXMgeW91ciBhY2NvdW50IGFuZCBldmVyeXRoaW5nIHRpZWQgdG8gaXQuIFNoZWx0ZXJzIHlvdSBkZWNsYXJlZCBhcyBhIHByaXZhdGUgaG9tZSBhcmUgcmVtb3ZlZDsgcHVibGljIHNoZWx0ZXJzIHlvdSBzdWJtaXR0ZWQgc3RheSBvbiB0aGUgbWFwIHdpdGhvdXQgYSBzdWJtaXR0ZXIuIFRoaXMgY2Fubm90IGJlIHVuZG9uZS4nLFxuICAnYWNjb3VudC5kZWxldGUudHlwZUhpbnQnOiAnVHlwZSBERUxFVEUgdG8gY29uZmlybScsXG4gICdhY2NvdW50LmRlbGV0ZS5hcm1lZCc6ICdFcmFzdXJlIGFybWVkIOKAlCBzZWxlY3Qg4oCcRGVsZXRlIG15IGFjY291bnTigJ0gdG8gY29uZmlybS4nLFxuICAnYWNjb3VudC5kZWxldGUuYnV0dG9uJzogJ0RlbGV0ZSBteSBhY2NvdW50JyxcbiAgJ2FjY291bnQubGVnYWwnOiAnTGVnYWwnLFxuICAnYWNjb3VudC5sZWdhbC5sZWFkJzogJ1JlYWQgdGhlJyxcbiAgJ2FjY291bnQubGVnYWwuYW5kJzogJ2FuZCB0aGUnLFxuICAnYWNjb3VudC5sZWdhbC50YWlsJzogJy4nLFxuICAnYWNjb3VudC5zdWNjZXNzLnByb2ZpbGVVcGRhdGVkJzogJ1lvdXIgcHJvZmlsZSBoYXMgYmVlbiB1cGRhdGVkLicsXG4gICdhY2NvdW50LnN1Y2Nlc3MuZW1haWxDaGFuZ2VkJzogJ1lvdXIgZW1haWwgYWRkcmVzcyBoYXMgYmVlbiBjaGFuZ2VkLicsXG4gICdhY2NvdW50LnN1Y2Nlc3MucGhvbmVDaGFuZ2VkJzogJ1lvdXIgcGhvbmUgbnVtYmVyIGhhcyBiZWVuIGNoYW5nZWQuJyxcbiAgJ2FjY291bnQuc3VjY2Vzcy5leHBvcnREb3dubG9hZGVkJzogJ1lvdXIgZGF0YSBleHBvcnQgaGFzIGJlZW4gZG93bmxvYWRlZC4nLFxuICAnYWNjb3VudC5lcnJvci5zYW1lVmFsdWUnOlxuICAgICdUaGF0IGlzIGFscmVhZHkgdGhlIHZhbHVlIG9uIHlvdXIgYWNjb3VudCDigJQgdGhlIG5ldyBvbmUgbXVzdCBiZSBkaWZmZXJlbnQuJyxcblxuICAvLyAtLS0gYWNjb3VudDogY29udHJpYnV0aW9ucyBwYW5lbC5cbiAgJ2FjY291bnQuY29udHJpYi5zaGVsdGVycyc6ICdTaGVsdGVycycsXG4gICdhY2NvdW50LmNvbnRyaWIubG9hZGluZyc6ICdMb2FkaW5nIHlvdXIgc2hlbHRlcnPigKYnLFxuICAnYWNjb3VudC5jb250cmliLmVtcHR5JzogXCJZb3UgaGF2ZW4ndCBzdWJtaXR0ZWQgYW55IHNoZWx0ZXJzIHlldC5cIixcbiAgJ2FjY291bnQuY29udHJpYi5lbXB0eUN0YSc6ICdTdWJtaXQgeW91ciBmaXJzdCBzaGVsdGVyJyxcbiAgJ2FjY291bnQuY29udHJpYi5zdWJtaXQnOiAnU3VibWl0IGEgc2hlbHRlcicsXG4gICdhY2NvdW50LmNvbnRyaWIuc291cmNlLnBhYXN0ZWFtZXQnOiAnUMOkw6RzdGVhbWV0IHJlZ2lzdHJ5JyxcbiAgJ2FjY291bnQuY29udHJpYi5zb3VyY2UubXVuaWNpcGFsaXR5JzogJ011bmljaXBhbCByZWdpc3RyeScsXG4gICdhY2NvdW50LmNvbnRyaWIuYmFkZ2UubmV3JzogJ05ld2x5IGFkZGVkJyxcbiAgJ2FjY291bnQuY29udHJpYi5iYWRnZS5jb25maXJtZWQnOiAnQ29tbXVuaXR5LWNoZWNrZWQnLFxuICAnYWNjb3VudC5jb250cmliLmJhZGdlLnJlamVjdGVkJzogJ1JlamVjdGVkJyxcbiAgJ2FjY291bnQuY29udHJpYi5pbmZvUmVxdWVzdCc6ICdJbmZvIHJlcXVlc3QnLFxuICAnYWNjb3VudC5jb250cmliLmFkbWluTm90ZSc6ICdBZG1pbiBub3RlOiB7bm90ZX0nLFxuICAnYWNjb3VudC5jb250cmliLmluYWNjdXJhdGUnOiAnUmVwb3J0ZWQgaW5hY2N1cmF0ZSDigJQgZGV0YWlscyBtYXkgYmUgd3JvbmcnLFxuICAnYWNjb3VudC5jb250cmliLmhpZGRlbic6ICdIaWRkZW4g4oCUIHJlcG9ydGVkIGJ5IHRoZSBjb21tdW5pdHkgKHtjb3VudH0pJyxcbiAgJ2FjY291bnQuY29udHJpYi52aWV3JzogJ1ZpZXcnLFxuICAnYWNjb3VudC5jb250cmliLmluZm8nOiAnSW5mbycsXG4gICdhY2NvdW50LmNvbnRyaWIuaW5mb0Nsb3NlJzogJ0Nsb3NlIGluZm8nLFxuICAnYWNjb3VudC5jb250cmliLmRlbGV0ZSc6ICdEZWxldGUnLFxuICAnYWNjb3VudC5jb250cmliLmRlbGV0ZUNvbmZpcm0nOiAnRGVsZXRlIHRoaXMgc2hlbHRlciBwZXJtYW5lbnRseT8nLFxuICAnYWNjb3VudC5jb250cmliLmRlbGV0ZUNvbmZpcm1CdXR0b24nOiAnQ29uZmlybSBkZWxldGUnLFxuICAnYWNjb3VudC5jb250cmliLm5hbWVMYWJlbCc6ICdOYW1lJyxcbiAgJ2FjY291bnQuY29udHJpYi5uYW1lUmVxdWlyZWQnOiAnQSBuYW1lICh1cCB0byAyMDAgY2hhcmFjdGVycykgaXMgcmVxdWlyZWQuJyxcbiAgJ2FjY291bnQuY29udHJpYi5kZXNjcmlwdGlvbkxhYmVsJzogJ0Rlc2NyaXB0aW9uIChvcHRpb25hbCknLFxuICAnYWNjb3VudC5jb250cmliLmRlc2NyaXB0aW9uVG9vTG9uZyc6ICdEZXNjcmlwdGlvbiBtdXN0IGJlIDIwMDAgY2hhcmFjdGVycyBvciBmZXdlci4nLFxuICAnYWNjb3VudC5jb250cmliLmxhdGl0dWRlTGFiZWwnOiAnTGF0aXR1ZGUgKOKIkjkw4oCmOTApJyxcbiAgJ2FjY291bnQuY29udHJpYi5sYXRpdHVkZUVycm9yJzogJ0EgbGF0aXR1ZGUgYmV0d2VlbiDiiJI5MCBhbmQgOTAgaXMgcmVxdWlyZWQuJyxcbiAgJ2FjY291bnQuY29udHJpYi5sb25naXR1ZGVMYWJlbCc6ICdMb25naXR1ZGUgKOKIkjE4MOKApjE4MCknLFxuICAnYWNjb3VudC5jb250cmliLmxvbmdpdHVkZUVycm9yJzogJ0EgbG9uZ2l0dWRlIGJldHdlZW4g4oiSMTgwIGFuZCAxODAgaXMgcmVxdWlyZWQuJyxcbiAgJ2FjY291bnQuY29udHJpYi5lc3RvbmlhTm90ZSc6XG4gICAgJ1RoZSBsb2NhdGlvbiBtdXN0IGJlIGluc2lkZSBFc3RvbmlhLiBUaGF0IGNoZWNrIGhhcHBlbnMgb24gdGhlIHNlcnZlci4nLFxuICAnYWNjb3VudC5jb250cmliLmluZm9RdWVzdGlvbic6ICdBIG1vZGVyYXRvciBpcyBhc2tpbmc6JyxcbiAgJ2FjY291bnQuY29udHJpYi5yZXBseUxhYmVsJzogJ1lvdXIgcmVwbHkgKHJlcXVpcmVkLCBvbmUtdGltZSknLFxuICAnYWNjb3VudC5jb250cmliLnJlcGx5UmVxdWlyZWQnOiAnQSByZXBseSAodXAgdG8gMjAwMCBjaGFyYWN0ZXJzKSBpcyByZXF1aXJlZC4nLFxuICAnYWNjb3VudC5jb250cmliLnNlbmRSZXBseSc6ICdTZW5kIHJlcGx5JyxcbiAgJ2FjY291bnQuY29udHJpYi5yZXBseSc6ICdZb3VyIHJlcGx5JyxcblxuICAvLyAtLS0gdmVyaWZ5IHBhZ2UgKC92ZXJpZnkpLlxuICAndmVyaWZ5LnRpdGxlJzogJ1ZlcmlmeSB5b3VyIGFjY291bnQnLFxuICAndmVyaWZ5LnN1YnRpdGxlJzpcbiAgICAnVmVyaWZpZWQgYWNjb3VudHMgY2FuIHN1Ym1pdCBzaGVsdGVycyBhbmQgcmVwb3J0IGxpc3RlZCBsb2NhdGlvbnMuIFByb3ZlIHlvdSBvd24geW91ciBlbWFpbCBhbmQgcGhvbmUg4oCUIHRoZSBjb2RlcyBhcnJpdmUgb3V0LW9mLWJhbmQsIG9uZSBwZXIgY2hhbm5lbC4nLFxuICAndmVyaWZ5LmFyaWEnOiAnVmVyaWZpY2F0aW9uIHN0YXR1cycsXG4gICd2ZXJpZnkudmVyaWZpZWQnOiAnVmVyaWZpZWQnLFxuICAndmVyaWZ5Lm5vdFZlcmlmaWVkJzogJ05vdCB2ZXJpZmllZCcsXG4gICd2ZXJpZnkuaW50cm8nOiBcIldlJ2xsIHNlbmQgYSBjb2RlIHRvIHlvdXIge2Rlc3RpbmF0aW9ufS4gWW91IGVudGVyIGl0IGhlcmUgdG8gcHJvdmUgaXQncyB5b3Vycy5cIixcbiAgJ3ZlcmlmeS5lbWFpbC50aXRsZSc6ICdWZXJpZnkgeW91ciBlbWFpbCcsXG4gICd2ZXJpZnkuZW1haWwuZGVzdGluYXRpb24nOiAnZW1haWwgYWRkcmVzcycsXG4gICd2ZXJpZnkuZW1haWwubm91bic6ICdlbWFpbCcsXG4gICd2ZXJpZnkuZW1haWwuc2VuZCc6ICdTZW5kIGNvZGUgdG8gbXkgZW1haWwnLFxuICAndmVyaWZ5LmVtYWlsLnNlbnRIaW50JzogJ0EgdmVyaWZpY2F0aW9uIGNvZGUgaGFzIGJlZW4gc2VudCB0byB5b3VyIGVtYWlsIGFkZHJlc3MuJyxcbiAgJ3ZlcmlmeS5lbWFpbC5jb2RlTGFiZWwnOiAnVmVyaWZpY2F0aW9uIGNvZGUnLFxuICAndmVyaWZ5LmVtYWlsLmNvZGVIaW50JzogJ0VudGVyIHRoZSA4LWNoYXJhY3RlciBjb2RlIGZyb20gdGhlIGVtYWlsLicsXG4gICd2ZXJpZnkuZW1haWwucGxhY2Vob2xkZXInOiAnOC1jaGFyYWN0ZXIgY29kZScsXG4gICd2ZXJpZnkucGhvbmUudGl0bGUnOiAnVmVyaWZ5IHlvdXIgcGhvbmUnLFxuICAndmVyaWZ5LnBob25lLmRlc3RpbmF0aW9uJzogJ3Bob25lIG51bWJlcicsXG4gICd2ZXJpZnkucGhvbmUubm91bic6ICdwaG9uZScsXG4gICd2ZXJpZnkucGhvbmUuc2VuZCc6ICdUZXh0IGNvZGUgdG8gbXkgcGhvbmUnLFxuICAndmVyaWZ5LnBob25lLnNlbnRIaW50JzogJ0FuIFNNUyBjb2RlIGhhcyBiZWVuIHNlbnQgdG8geW91ciBwaG9uZSBudW1iZXIuJyxcbiAgJ3ZlcmlmeS5waG9uZS5jb2RlTGFiZWwnOiAnU01TIGNvZGUnLFxuICAndmVyaWZ5LnBob25lLmNvZGVIaW50JzogJ0VudGVyIHRoZSA2LWRpZ2l0IGNvZGUgZnJvbSB0aGUgU01TLicsXG4gICd2ZXJpZnkucGhvbmUucGxhY2Vob2xkZXInOiAnNi1kaWdpdCBjb2RlJyxcbiAgJ3ZlcmlmeS52ZXJpZnlpbmcnOiAnVmVyaWZ5aW5n4oCmJyxcbiAgJ3ZlcmlmeS52ZXJpZnknOiAnVmVyaWZ5JyxcbiAgJ3ZlcmlmeS5mdWxseVZlcmlmaWVkJzogXCJZb3UncmUgZnVsbHkgdmVyaWZpZWRcIixcbiAgJ3ZlcmlmeS5mdWxseVZlcmlmaWVkQ29weSc6XG4gICAgJ1lvdXIgZW1haWwgYW5kIHBob25lIGFyZSB2ZXJpZmllZCDigJQgeW91IGNhbiBub3cgc3VibWl0IHNoZWx0ZXJzIGFuZCByZXBvcnQgbGlzdGVkIGxvY2F0aW9ucy4nLFxuICAndmVyaWZ5LnZlcmlmaWVkQ29weSc6IFwiWW91J3JlIHZlcmlmaWVkLiBZb3UgY2FuIHN1Ym1pdCBzaGVsdGVycyBhbmQgcmVwb3J0IGxpc3RlZCBsb2NhdGlvbnMuXCIsXG4gICd2ZXJpZnkuY29udGludWUnOiAnQ29udGludWUnLFxuICAndmVyaWZ5Lm1hbmFnZUFjY291bnQnOiAnTWFuYWdlIGFjY291bnQnLFxuICAndmVyaWZ5LmJhY2tUb01hcCc6ICdCYWNrIHRvIHRoZSBtYXAnLFxuICAndmVyaWZ5LmFscmVhZHlWZXJpZmllZCc6ICdZb3VyIHtub3VufSBpcyBhbHJlYWR5IHZlcmlmaWVkLicsXG4gICd2ZXJpZnkudmVyaWZpZWROb3RpY2UnOiAnWW91ciB7bm91bn0gaXMgdmVyaWZpZWQuJyxcblxuICAvLyAtLS0gY3Jpc2lzIGd1aWRhbmNlICgvYmxvZyDigJQgY3Jpc2lzLWd1aWRhbmNlIEQ0L0Q2KS4gVGhlIHBvc3QgdGl0bGUgYW5kXG4gIC8vIGJvZHkgYXJlIGFkbWluIGNvcHkgKHJlbmRlcmVkIHZlcmJhdGltKSwgbmV2ZXIgY2F0YWxvZyBrZXlzLlxuICAnZ3VpZGFuY2UudGl0bGUnOiAnQ3Jpc2lzIGd1aWRhbmNlJyxcbiAgJ2d1aWRhbmNlLnN1YnRpdGxlJzogJ1ByYWN0aWNhbCBndWlkYW5jZSBmb3IgY3Jpc2lzIHNpdHVhdGlvbnMuJyxcbiAgJ2d1aWRhbmNlLmxvYWRpbmcnOiAnTG9hZGluZyBndWlkYW5jZeKApicsXG4gICdndWlkYW5jZS5sb2FkaW5nRGV0YWlsJzogJ0xvYWRpbmcgZ3VpZGFuY2UgcG9zdOKApicsXG4gICdndWlkYW5jZS5lbXB0eSc6ICdObyBndWlkYW5jZSB5ZXQg4oCUIGNoZWNrIGJhY2sgc29vbi4nLFxuICAnZ3VpZGFuY2UuYmFja1RvTGlzdCc6ICdCYWNrIHRvIGFsbCBndWlkYW5jZScsXG4gICdndWlkYW5jZS5ub3RGb3VuZFRpdGxlJzogJ0d1aWRhbmNlIHBvc3Qgbm90IGZvdW5kJyxcbiAgJ2d1aWRhbmNlLm5vdEZvdW5kQm9keSc6ICdUaGlzIGd1aWRhbmNlIHBvc3QgZG9lcyBub3QgZXhpc3Qg4oCUIGl0IG1heSBoYXZlIGJlZW4gdW5wdWJsaXNoZWQuJyxcbiAgJ2d1aWRhbmNlLnB1Ymxpc2hlZCc6ICdQdWJsaXNoZWQnLFxuICAnZ3VpZGFuY2UubG9jYWxlRmFsbGJhY2snOiAnVGhpcyBwb3N0IGlzIHNob3duIGluIHtsb2NhbGV9IOKAlCBpdCBpcyBub3QgYXZhaWxhYmxlIGluIHtyZWFkZXJ9LicsXG4gICdndWlkYW5jZS5sb2NhbGVGYWxsYmFjay5hbHRlcm5hdGUnOiAnUmVhZCB0aGUge2xvY2FsZX0gdmVyc2lvbicsXG5cbiAgLy8gLS0tIGxpc3QgcGFnaW5nIChsaXN0LXBhZ2UtcGFnaW5nOiB0aGUgc2hhcmVkIHByZXYvbmV4dCArIHNpemUgY29udHJvbCkuXG4gICdwYWdpbmF0aW9uLmFyaWEnOiAnUGFnZXMnLFxuICAncGFnaW5hdGlvbi5wcmV2aW91cyc6ICdQcmV2aW91cycsXG4gICdwYWdpbmF0aW9uLm5leHQnOiAnTmV4dCcsXG4gICdwYWdpbmF0aW9uLnBhZ2VPZic6ICdQYWdlIHtwYWdlfSBvZiB7cGFnZXN9JyxcbiAgJ3BhZ2luYXRpb24uc2l6ZSc6ICdQZXIgcGFnZScsXG4gICdwYWdpbmF0aW9uLnNpemVTaGVsdGVycyc6ICdTaGVsdGVycyBwZXIgcGFnZScsXG4gICdwYWdpbmF0aW9uLnNpemVSZXBvcnRzJzogJ1JlcG9ydHMgcGVyIHBhZ2UnLFxuICAncGFnaW5hdGlvbi5zaXplVXNlcnMnOiAnQWNjb3VudHMgcGVyIHBhZ2UnLFxuICAncGFnaW5hdGlvbi5zaXplTWVkaWEnOiAnSW1hZ2VzIHBlciBwYWdlJyxcbiAgJ3BhZ2luYXRpb24uc2l6ZUF1ZGl0JzogJ0F1ZGl0IHJvd3MgcGVyIHBhZ2UnLFxuICAnZ3VpZGFuY2UucGFnZU91dE9mUmFuZ2UnOiAnUGFnZSB7cGFnZX0gZG9lcyBub3QgZXhpc3Qg4oCUIHRoZSBpbmRleCBlbmRzIGF0IHBhZ2Uge3BhZ2VzfS4nLFxuICAnZ3VpZGFuY2UucGFnZUZpcnN0JzogJ1Nob3cgdGhlIGZpcnN0IHBhZ2UnLFxuXG4gIC8vIC0tLSBhZG1pbjogZ3VpZGFuY2UgdGFiICsgZWRpdG9yICsgbWVkaWEgbGlicmFyeSAoY3Jpc2lzLWd1aWRhbmNlIEQ4KS5cbiAgJ2FkbWluLnJldHJ5JzogJ1JldHJ5JyxcblxuICAnYWRtaW4uc2V0dGluZ3MudGFiJzogJ1NldHRpbmdzJyxcblxuICAnYWRtaW4udGFicy5hcmlhJzogJ0FkbWluIHNlY3Rpb25zJyxcbiAgJ2FkbWluLnRhYnMudW5jb25maXJtZWQnOiAnVW5jb25maXJtZWQnLFxuICAnYWRtaW4udGFicy5zaGVsdGVycyc6ICdTaGVsdGVycycsXG4gICdhZG1pbi50YWJzLnJlcG9ydHMnOiAnU2hlbHRlciByZXBvcnRzJyxcbiAgJ2FkbWluLnRhYnMuYWxlcnRzJzogJ0FsZXJ0cycsXG4gICdhZG1pbi50YWJzLnVzZXJzJzogJ1VzZXJzJyxcbiAgJ2FkbWluLnRhYnMuYXVkaXQnOiAnQXVkaXQgbG9nJyxcbiAgJ2FkbWluLndvcmtpbmcnOiAnV29ya2luZ+KApicsXG4gICdhZG1pbi5jYW5jZWwnOiAnQ2FuY2VsJyxcblxuICAnYWRtaW4udW5jb25maXJtZWQubG9hZGluZyc6ICdMb2FkaW5nIGNvbW11bml0eSBsb2NhdGlvbnPigKYnLFxuICAnYWRtaW4udW5jb25maXJtZWQuZW1wdHknOiAnTm8gdW5jb25maXJtZWQgY29tbXVuaXR5IGxvY2F0aW9ucy4nLFxuICAnYWRtaW4udW5jb25maXJtZWQuYXJpYSc6ICdVbmNvbmZpcm1lZCBjb21tdW5pdHkgbG9jYXRpb25zJyxcbiAgJ2FkbWluLnVuY29uZmlybWVkLmNvbC5uYW1lJzogJ05hbWUnLFxuICAnYWRtaW4udW5jb25maXJtZWQuY29sLmFkZHJlc3MnOiAnQWRkcmVzcycsXG4gICdhZG1pbi51bmNvbmZpcm1lZC5jb2wuc3VibWl0dGVyJzogJ1N1Ym1pdHRlcicsXG4gICdhZG1pbi51bmNvbmZpcm1lZC5jb2wuYWN0aW9ucyc6ICdBY3Rpb25zJyxcbiAgJ2FkbWluLnVuY29uZmlybWVkLmNvbmZpcm0nOiAnTWFyayBjb25maXJtZWQnLFxuICAnYWRtaW4udW5jb25maXJtZWQucmVqZWN0JzogJ1JlamVjdCcsXG4gICdhZG1pbi51bmNvbmZpcm1lZC5yZWplY3QubGFiZWwnOiAnUmVhc29uIChyZXF1aXJlZCknLFxuICAnYWRtaW4udW5jb25maXJtZWQucmVqZWN0LnBsYWNlaG9sZGVyJzogJ1doeSBpcyB0aGlzIGxvY2F0aW9uIHJlamVjdGVkPycsXG4gICdhZG1pbi51bmNvbmZpcm1lZC5yZWplY3QucmVxdWlyZWQnOiAnQSByZWFzb24gaXMgcmVxdWlyZWQgKG1heCB7bWF4fSBjaGFyYWN0ZXJzKS4nLFxuXG4gICdhZG1pbi5zaGVsdGVycy5zZWFyY2gubGFiZWwnOiAnU2VhcmNoIHNoZWx0ZXJzIChuYW1lIG9yIGFkZHJlc3MpJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLnNlYXJjaC5wbGFjZWhvbGRlcic6ICdlLmcuIGtlbGRlcicsXG4gICdhZG1pbi5zaGVsdGVycy5zZWFyY2guYnV0dG9uJzogJ1NlYXJjaCcsXG4gICdhZG1pbi5zaGVsdGVycy5zb3VyY2UuYXJpYSc6ICdGaWx0ZXIgc2hlbHRlcnMgYnkgc291cmNlJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLnNvdXJjZS5hbGwnOiAnQWxsJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLnNvdXJjZS5yZWdpc3RyeSc6ICdSZWdpc3RyeScsXG4gICdhZG1pbi5zaGVsdGVycy5zb3VyY2UuY29tbXVuaXR5JzogJ0NvbW11bml0eScsXG4gICdhZG1pbi5zaGVsdGVycy5sb2FkaW5nJzogJ0xvYWRpbmcgc2hlbHRlcnPigKYnLFxuICAnYWRtaW4uc2hlbHRlcnMuZW1wdHknOiAnTm8gc2hlbHRlcnMuJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmVtcHR5RmlsdGVyZWQnOiAnTm8gc2hlbHRlcnMgbWF0Y2ggdGhlIGN1cnJlbnQgZmlsdGVyLicsXG4gICdhZG1pbi5zaGVsdGVycy5wYWdlT3V0T2ZSYW5nZSc6ICdQYWdlIHtwYWdlfSBkb2VzIG5vdCBleGlzdCDigJQgdGhlIGxpc3QgZW5kcyBhdCBwYWdlIHtwYWdlc30uJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmFyaWEnOiAnU2hlbHRlcnMnLFxuICAnYWRtaW4uc2hlbHRlcnMuY29sLm5hbWUnOiAnTmFtZScsXG4gICdhZG1pbi5zaGVsdGVycy5jb2wuc291cmNlJzogJ1NvdXJjZScsXG4gICdhZG1pbi5zaGVsdGVycy5jb2wuc3RhdHVzJzogJ1N0YXR1cycsXG4gICdhZG1pbi5zaGVsdGVycy5jb2wucmVwb3J0cyc6ICdSZXBvcnRzJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmNvbC5vY2N1cGFuY3knOiAnT2NjdXBhbmN5JyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmNvbC5zdWJtaXR0ZXInOiAnU3VibWl0dGVyJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmNvbC5hY3Rpb25zJzogJ0FjdGlvbnMnLFxuICAnYWRtaW4uc2hlbHRlcnMuc3RhdHVzLmhpZGRlbic6ICdIaWRkZW4nLFxuICAnYWRtaW4uc2hlbHRlcnMuc3RhdHVzLmFjdGl2ZSc6ICdBY3RpdmUnLFxuICAnYWRtaW4uc2hlbHRlcnMuaGlzdG9yeSc6ICdIaXN0b3J5JyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmhpc3RvcnkuY2xvc2UnOiAnQ2xvc2UgaGlzdG9yeScsXG4gICdhZG1pbi5zaGVsdGVycy5pbmZvJzogJ0luZm8nLFxuICAnYWRtaW4uc2hlbHRlcnMuaW5mby5jbG9zZSc6ICdDbG9zZSBpbmZvJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmluYWNjdXJhdGUuY2xlYXInOiAnQ2xlYXIgaW5hY2N1cmF0ZScsXG4gICdhZG1pbi5zaGVsdGVycy5pbmFjY3VyYXRlLm1hcmsnOiAnTWFyayBpbmFjY3VyYXRlJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmluYWNjdXJhdGUubWFya0Nsb3NlJzogJ0Nsb3NlIG1hcmsnLFxuICAnYWRtaW4uc2hlbHRlcnMuaGlkZSc6ICdIaWRlJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmFjdGl2YXRlJzogJ0FjdGl2YXRlJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmRlbGV0ZSc6ICdEZWxldGUnLFxuICAnYWRtaW4uc2hlbHRlcnMuZGVsZXRlLmNvbmZpcm0nOiAnRGVsZXRlIHRoaXMgc2hlbHRlciBwZXJtYW5lbnRseT8nLFxuICAnYWRtaW4uc2hlbHRlcnMuZGVsZXRlLndvcmtpbmcnOiAnRGVsZXRpbmfigKYnLFxuICAnYWRtaW4uc2hlbHRlcnMuZGVsZXRlLmNvbmZpcm1CdXR0b24nOiAnQ29uZmlybSBkZWxldGUnLFxuICAnYWRtaW4uc2hlbHRlcnMucmVhZE9ubHknOiAncmVhZC1vbmx5JyxcblxuICAnYWRtaW4uc2hlbHRlcnMuaGlzdG9yeS5sb2FkaW5nJzogJ0xvYWRpbmcgaGlzdG9yeeKApicsXG4gICdhZG1pbi5zaGVsdGVycy5oaXN0b3J5LmVtcHR5JzogJ05vIGhpc3RvcnkgeWV0LicsXG4gICdhZG1pbi5zaGVsdGVycy5pbmZvLnJlcXVlc3QnOiAnSW5mbyByZXF1ZXN0JyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmluZm8uYW5zd2VyJzogJ0Fuc3dlcicsXG4gICdhZG1pbi5zaGVsdGVycy5pbmZvLndhaXRpbmcnOiBcIldhaXRpbmcgZm9yIHRoZSBzdWJtaXR0ZXIncyBhbnN3ZXIuXCIsXG4gICdhZG1pbi5zaGVsdGVycy5pbmZvLnF1ZXN0aW9uLmxhYmVsJzogJ1F1ZXN0aW9uIGZvciB0aGUgc3VibWl0dGVyIChyZXF1aXJlZCknLFxuICAnYWRtaW4uc2hlbHRlcnMuaW5mby5xdWVzdGlvbi5wbGFjZWhvbGRlcic6ICdXaGF0IGRvIHlvdSBuZWVkIGZyb20gdGhlIHN1Ym1pdHRlcj8nLFxuICAnYWRtaW4uc2hlbHRlcnMuaW5mby5xdWVzdGlvbi5yZXF1aXJlZCc6ICdBIHF1ZXN0aW9uIGlzIHJlcXVpcmVkIChtYXgge21heH0gY2hhcmFjdGVycykuJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmluZm8uc2VuZCc6ICdTZW5kJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmluZm8uc2VuZGluZyc6ICdTZW5kaW5n4oCmJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmluYWNjdXJhdGUucmVhc29uLmxhYmVsJzogJ1JlYXNvbiAob3B0aW9uYWwpJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmluYWNjdXJhdGUucmVhc29uLnBsYWNlaG9sZGVyJzogJ1doYXQgZGlkIHlvdSBmaW5kIHRvIGJlIGluYWNjdXJhdGU/JyxcbiAgJ2FkbWluLnNoZWx0ZXJzLmluYWNjdXJhdGUucmVhc29uLm1heCc6ICdNYXgge21heH0gY2hhcmFjdGVycy4nLFxuICAnYWRtaW4uc2hlbHRlcnMuaW5hY2N1cmF0ZS5tYXJraW5nJzogJ01hcmtpbmfigKYnLFxuICAnYWRtaW4uc2hlbHRlcnMuaW5hY2N1cmF0ZS5iYWRnZSc6ICdJbmFjY3VyYXRlJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLnN1Y2Nlc3MuY29uZmlybWVkJzogJ0xvY2F0aW9uIGNvbmZpcm1lZC4nLFxuICAnYWRtaW4uc2hlbHRlcnMuc3VjY2Vzcy5yZWplY3RlZCc6ICdMb2NhdGlvbiByZWplY3RlZC4nLFxuICAnYWRtaW4uc2hlbHRlcnMuc3VjY2Vzcy5oaWRkZW4nOiAnU2hlbHRlciBoaWRkZW4uJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLnN1Y2Nlc3MucmVzdG9yZWQnOiAnU2hlbHRlciByZXN0b3JlZC4nLFxuICAnYWRtaW4uc2hlbHRlcnMuc3VjY2Vzcy5kZWxldGVkJzogJ1NoZWx0ZXIgZGVsZXRlZC4nLFxuICAnYWRtaW4uc2hlbHRlcnMuc3VjY2Vzcy5xdWVzdGlvblNlbnQnOiAnUXVlc3Rpb24gc2VudCB0byB0aGUgc3VibWl0dGVyLicsXG4gICdhZG1pbi5zaGVsdGVycy5zdWNjZXNzLmluYWNjdXJhdGVNYXJrZWQnOiAnTWFya2VkIGFzIGluYWNjdXJhdGUuJyxcbiAgJ2FkbWluLnNoZWx0ZXJzLnN1Y2Nlc3MuaW5hY2N1cmF0ZUNsZWFyZWQnOiAnSW5hY2N1cmF0ZSBtYXJrIGNsZWFyZWQuJyxcblxuICAnYWRtaW4ucmVwb3J0cy5sb2FkaW5nJzogJ0xvYWRpbmcgcmVwb3J0c+KApicsXG4gICdhZG1pbi5yZXBvcnRzLmVtcHR5JzogJ05vIHJlcG9ydHMuJyxcbiAgJ2FkbWluLnJlcG9ydHMuZGlzbWlzc2VkJzogJ0Rpc21pc3NlZCcsXG4gICdhZG1pbi5yZXBvcnRzLm5vdENvdW50ZWQnOiAnTm90IGNvdW50ZWQnLFxuICAnYWRtaW4ucmVwb3J0cy5ub3RDb3VudGVkLnJlYXNvbic6XG4gICAgJ05vdCBjb3VudGVkOiB0aGUgcmVwb3J0ZXIgYWxyZWFkeSBoYXMgYSBzaGVsdGVyIHdpdGggdGhlIHNhbWUgbmFtZSBhdCB0aGUgc2FtZSBsb2NhdGlvbi4nLFxuICAnYWRtaW4ucmVwb3J0cy5yZXN0b3JlJzogJ1Jlc3RvcmUgc2hlbHRlcicsXG4gICdhZG1pbi5yZXBvcnRzLmRpc21pc3MnOiAnRGlzbWlzcycsXG4gICdhZG1pbi5yZXBvcnRzLnN1Y2Nlc3MuZGlzbWlzc2VkJzogJ1JlcG9ydCBkaXNtaXNzZWQuJyxcblxuICAvLyByZXBvcnRzIHRhYjogdGhlIGhpZGUtZGlzbWlzc2VkIGZpbHRlciDigJQgdGhlIGRlZmF1bHQgKCdBbGwnKSByZW5kZXJzXG4gIC8vIGV2ZXJ5dGhpbmcsIHNvIHRoZSBjb250cm9sIG5ldmVyIGhpZGVzIHNpbGVudGx5LlxuICAnYWRtaW4ucmVwb3J0cy5maWx0ZXIuYXJpYSc6ICdGaWx0ZXIgdGhlIHJlcG9ydCBxdWV1ZScsXG4gICdhZG1pbi5yZXBvcnRzLmZpbHRlci5hbGwnOiAnQWxsJyxcbiAgJ2FkbWluLnJlcG9ydHMuZmlsdGVyLm9wZW4nOiAnT3BlbiBvbmx5JyxcbiAgJ2FkbWluLnJlcG9ydHMuZW1wdHlPcGVuJzogJ05vIG9wZW4gcmVwb3J0cy4nLFxuICAnYWRtaW4ucmVwb3J0cy5wYWdlT3V0T2ZSYW5nZSc6ICdQYWdlIHtwYWdlfSBkb2VzIG5vdCBleGlzdCDigJQgdGhlIGxpc3QgZW5kcyBhdCBwYWdlIHtwYWdlc30uJyxcbiAgJ2FkbWluLnVzZXJzLnBhZ2VPdXRPZlJhbmdlJzogJ1BhZ2Uge3BhZ2V9IGRvZXMgbm90IGV4aXN0IOKAlCB0aGUgbGlzdCBlbmRzIGF0IHBhZ2Uge3BhZ2VzfS4nLFxuICAnYWRtaW4ubWVkaWEucGFnZU91dE9mUmFuZ2UnOiAnUGFnZSB7cGFnZX0gZG9lcyBub3QgZXhpc3Qg4oCUIHRoZSBsaXN0IGVuZHMgYXQgcGFnZSB7cGFnZXN9LicsXG4gICdhZG1pbi5hdWRpdC5wYWdlT3V0T2ZSYW5nZSc6ICdQYWdlIHtwYWdlfSBkb2VzIG5vdCBleGlzdCDigJQgdGhlIGxpc3QgZW5kcyBhdCBwYWdlIHtwYWdlc30uJyxcblxuICAnYWRtaW4uYWxlcnRzLmxvYWRpbmcnOiAnTG9hZGluZyBhbGVydHPigKYnLFxuICAnYWRtaW4uYWxlcnRzLmVtcHR5JzogJ05vIHRocm90dGxlZCBvciBhYnVzaXZlIGFjdGl2aXR5IHlldC4nLFxuICAnYWRtaW4uYWxlcnRzLmFyaWEnOiAnQWJ1c2UgYWxlcnRzJyxcbiAgJ2FkbWluLmFsZXJ0cy5jb2wud2hlbic6ICdXaGVuJyxcbiAgJ2FkbWluLmFsZXJ0cy5jb2wudHlwZSc6ICdUeXBlJyxcbiAgJ2FkbWluLmFsZXJ0cy5jb2wuc3ViamVjdCc6ICdTdWJqZWN0JyxcbiAgJ2FkbWluLmFsZXJ0cy5jb2wuZGV0YWlsJzogJ0RldGFpbCcsXG4gICdhZG1pbi5hbGVydHMuY29sLnJldHJ5QWZ0ZXInOiAnUmV0cnkgYWZ0ZXInLFxuXG4gICdhZG1pbi51c2Vycy5sb2FkaW5nJzogJ0xvYWRpbmcgYWNjb3VudHPigKYnLFxuICAnYWRtaW4udXNlcnMuZW1wdHknOiAnTm8gYWNjb3VudHMgeWV0LicsXG4gICdhZG1pbi51c2Vycy5hcmlhJzogJ0FjY291bnRzJyxcbiAgJ2FkbWluLnVzZXJzLmNvbC5uYW1lJzogJ05hbWUnLFxuICAnYWRtaW4udXNlcnMuY29sLmVtYWlsJzogJ0UtbWFpbCcsXG4gICdhZG1pbi51c2Vycy5jb2wua2luZCc6ICdLaW5kJyxcbiAgJ2FkbWluLnVzZXJzLmNvbC5zdGF0dXMnOiAnU3RhdHVzJyxcbiAgJ2FkbWluLnVzZXJzLmNvbC5hY3Rpb25zJzogJ0FjdGlvbnMnLFxuICAnYWRtaW4udXNlcnMuc3VzcGVuZGVkJzogJ1N1c3BlbmRlZCcsXG4gICdhZG1pbi51c2Vycy5hY3RpdmUnOiAnQWN0aXZlJyxcbiAgJ2FkbWluLnVzZXJzLnN1c3BlbmQuY29uZmlybSc6XG4gICAgJ1N1c3BlbmQgdGhpcyBhY2NvdW50PyBJdCBsb3NlcyBsb2dpbiwgcmVmcmVzaCBhbmQgaXRzIG9wZW4gc2Vzc2lvbjsgaXRzIHNoZWx0ZXJzIHN0YXkgb24gdGhlIG1hcC4nLFxuICAnYWRtaW4udXNlcnMudW5zdXNwZW5kLmNvbmZpcm0nOiBcIlJlc3RvcmUgdGhpcyBhY2NvdW50J3MgYWNjZXNzP1wiLFxuICAnYWRtaW4udXNlcnMuc3VzcGVuZC5jb25maXJtQnV0dG9uJzogJ0NvbmZpcm0gc3VzcGVuZCcsXG4gICdhZG1pbi51c2Vycy51bnN1c3BlbmQuY29uZmlybUJ1dHRvbic6ICdDb25maXJtIHVuc3VzcGVuZCcsXG4gICdhZG1pbi51c2Vycy5zdXNwZW5kJzogJ1N1c3BlbmQnLFxuICAnYWRtaW4udXNlcnMudW5zdXNwZW5kJzogJ1Vuc3VzcGVuZCcsXG4gICdhZG1pbi51c2Vycy5ub3RTdXNwZW5kYWJsZSc6ICdOb3Qgc3VzcGVuZGFibGUnLFxuICAnYWRtaW4udXNlcnMuc3VjY2Vzcy5zdXNwZW5kZWQnOiAnVXNlciBzdXNwZW5kZWQuJyxcbiAgJ2FkbWluLnVzZXJzLnN1Y2Nlc3MudW5zdXNwZW5kZWQnOiAnVXNlciB1bnN1c3BlbmRlZC4nLFxuXG4gICdhZG1pbi5hdWRpdC5sb2FkaW5nJzogJ0xvYWRpbmcgYXVkaXQgbG9n4oCmJyxcbiAgJ2FkbWluLmF1ZGl0LmVtcHR5JzogJ05vIG1vZGVyYXRpb24gYWN0aW9ucyB5ZXQuJyxcbiAgJ2FkbWluLmF1ZGl0LmFyaWEnOiAnQXVkaXQgbG9nJyxcbiAgJ2FkbWluLmF1ZGl0LmNvbC53aGVuJzogJ1doZW4nLFxuICAnYWRtaW4uYXVkaXQuY29sLm1vZGVyYXRvcic6ICdNb2RlcmF0b3InLFxuICAnYWRtaW4uYXVkaXQuY29sLnN1YmplY3QnOiAnU3ViamVjdCcsXG4gICdhZG1pbi5hdWRpdC5jb2wuYWN0aW9uJzogJ0FjdGlvbicsXG4gICdhZG1pbi5hdWRpdC5jb2wuY2hhbmdlJzogJ0NoYW5nZScsXG4gICdhZG1pbi5hdWRpdC5jb2wucmVhc29uJzogJ1JlYXNvbicsXG5cbiAgJ2FkbWluLnNpdGVUZXh0cy5sb2FkaW5nJzogJ0xvYWRpbmcgc2l0ZSB0ZXh0c+KApicsXG4gICdhZG1pbi5zaXRlVGV4dHMuaGludDEnOlxuICAgICdMZWF2ZSBhIGZpZWxkIGJsYW5rIHRvIHVzZSB0aGUgc2hpcHBlZCBkZWZhdWx0IChzaG93biBhcyB0aGUgcGxhY2Vob2xkZXIpLiBTYXZpbmcgYSBjbGVhcmVkIGZpZWxkIHJlbW92ZXMgdGhlIG92ZXJyaWRlLiBMaW5rIFVSTHMgbXVzdCBzdGFydCB3aXRoICcsXG4gICdhZG1pbi5zaXRlVGV4dHMuaGludDInOiAnIGFuZCBhcmUgc2hhcmVkIGJ5IGFsbCB0aHJlZSBsYW5ndWFnZXMuJyxcbiAgJ2FkbWluLnNpdGVUZXh0cy5saW5rTGFiZWwnOiAnTGluayAoaHR0cHMsIGFsbCBsYW5ndWFnZXMpJyxcbiAgJ2FkbWluLnNpdGVUZXh0cy5zYXZpbmcnOiAnU2F2aW5n4oCmJyxcbiAgJ2FkbWluLnNpdGVUZXh0cy5zYXZlJzogJ1NhdmUgY2hhbmdlcycsXG4gICdhZG1pbi5zaXRlVGV4dHMubG9hZEVycm9yJzogJ0ZhaWxlZCB0byBsb2FkIHRoZSBzaXRlIHRleHRzLicsXG4gICdhZG1pbi5zaXRlVGV4dHMudXJsRXJyb3InOiAnTGluayBVUkxzIG11c3Qgc3RhcnQgd2l0aCBodHRwczovLy4nLFxuICAnYWRtaW4uc2l0ZVRleHRzLm5vQ2hhbmdlcyc6ICdObyBjaGFuZ2VzIHRvIHNhdmUuJyxcbiAgJ2FkbWluLnNpdGVUZXh0cy5zYXZlZCc6ICdTYXZlZC4nLFxuICAnYWRtaW4uc2l0ZVRleHRzLnNhdmVGYWlsZWQnOiAnU2F2ZSBmYWlsZWQuJyxcbiAgJ2FkbWluLnNpdGVUZXh0cy5zYXZlRmFpbGVkV2l0aCc6ICdTYXZlIGZhaWxlZDoge21lc3NhZ2V9JyxcblxuICAnYWRtaW4uZ3VpZGFuY2UudGFiJzogJ0d1aWRhbmNlJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmxvYWRpbmcnOiAnTG9hZGluZyBndWlkYW5jZSBwb3N0c+KApicsXG4gICdhZG1pbi5ndWlkYW5jZS5lbXB0eSc6ICdObyBndWlkYW5jZSBwb3N0cyB5ZXQuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVtcHR5TG9jYWxlJzogJ05vIGd1aWRhbmNlIHBvc3RzIGluIHtsb2NhbGV9IHlldC4nLFxuICAnYWRtaW4uZ3VpZGFuY2Uuc2hvd25Jbic6XG4gICAgJ1Bvc3RzIGluIHtsb2NhbGV9IOKAlCB0aGUgb3RoZXIgbGFuZ3VhZ2VzIGFyZSBlZGl0ZWQgZnJvbSB0aGVpciBvd24gbGlzdHMuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLnNlYXJjaC5sYWJlbCc6ICdTZWFyY2ggcG9zdHMgKHRpdGxlIG9yIGJvZHkpJyxcbiAgJ2FkbWluLmd1aWRhbmNlLnNlYXJjaC5wbGFjZWhvbGRlcic6ICdlLmcuIGtlbGRlcicsXG4gICdhZG1pbi5ndWlkYW5jZS5zZWFyY2guYnV0dG9uJzogJ1NlYXJjaCcsXG4gICdhZG1pbi5ndWlkYW5jZS5zZWFyY2guY2xlYXInOiAnQ2xlYXInLFxuICAnYWRtaW4uZ3VpZGFuY2Uubm9NYXRjaCc6ICdObyBwb3N0cyBtYXRjaGluZyBcIntxdWVyeX1cIiBpbiB7bG9jYWxlfS4nLFxuICAnYWRtaW4uZ3VpZGFuY2UucGFnZU91dE9mUmFuZ2UnOiAnUGFnZSB7cGFnZX0gZG9lcyBub3QgZXhpc3Qg4oCUIHRoZSBsaXN0IGVuZHMgYXQgcGFnZSB7cGFnZXN9LicsXG4gICdhZG1pbi5wYWdlRmlyc3QnOiAnU2hvdyB0aGUgZmlyc3QgcGFnZScsXG4gICdhZG1pbi5ndWlkYW5jZS5sYW5ndWFnZS5sYWJlbCc6ICdDb250ZW50IGxhbmd1YWdlJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmxhbmd1YWdlLmhpbnQnOlxuICAgICdUaGUgbGFuZ3VhZ2Ugb2YgdGhlIHBvc3RzIGxpc3RlZCBhbmQgZWRpdGVkIGhlcmUuIE9uIGZpcnN0IHVzZSBpdCBmb2xsb3dzIHRoZSBpbnRlcmZhY2UgbGFuZ3VhZ2U7IGFmdGVyd2FyZHMgaXQgaXMgaW5kZXBlbmRlbnQuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmNyZWF0ZSc6ICdOZXcgcG9zdCcsXG4gICdhZG1pbi5ndWlkYW5jZS5jb2wudGl0bGUnOiAnVGl0bGUnLFxuICAnYWRtaW4uZ3VpZGFuY2UuY29sLnBvc2l0aW9uJzogJ1Bvc2l0aW9uJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmNvbC5zdGF0dXMnOiAnU3RhdHVzJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmNvbC5sb2NhbGUnOiAnTG9jYWxlJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmNvbC5waW5uZWQnOiAnUGlubmVkJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmNvbC5wdWJsaXNoZWQnOiAnUHVibGlzaGVkJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmNvbC51cGRhdGVkJzogJ1VwZGF0ZWQnLFxuICAnYWRtaW4uZ3VpZGFuY2UuY29sLmFjdGlvbnMnOiAnQWN0aW9ucycsXG4gICdhZG1pbi5ndWlkYW5jZS5wb3N0cy5hcmlhJzogJ0d1aWRhbmNlIHBvc3RzJyxcbiAgJ2FkbWluLmd1aWRhbmNlLm9yZGVyLmhpbnQnOlxuICAgICdUaGUgcG9zdHMgYXBwZWFyIHRvIHZpc2l0b3JzIGluIHRoaXMgb3JkZXIg4oCUIGRyYWcgYSByb3cgb3IgdXNlIHRoZSBtb3ZlIGJ1dHRvbnMuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLm9yZGVyLnBhZ2VkSGludCc6XG4gICAgJ1Jlb3JkZXJpbmcgbmVlZHMgdGhlIHdob2xlIGxpc3Qgb24gb25lIHBhZ2Ug4oCUIHNldCB0aGUgcGFnZSBzaXplIHRvIHttYXh9IHRvIHJlb3JkZXIuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLm1vdmUudG9wJzogJ1RvIHRvcCcsXG4gICdhZG1pbi5ndWlkYW5jZS5tb3ZlLnVwJzogJ1VwJyxcbiAgJ2FkbWluLmd1aWRhbmNlLm1vdmUuZG93bic6ICdEb3duJyxcbiAgJ2FkbWluLmd1aWRhbmNlLm1vdmUudG9wLmFyaWEnOiAnTW92ZSBcInt0aXRsZX1cIiB0byB0aGUgdG9wJyxcbiAgJ2FkbWluLmd1aWRhbmNlLm1vdmUudXAuYXJpYSc6ICdNb3ZlIFwie3RpdGxlfVwiIHVwJyxcbiAgJ2FkbWluLmd1aWRhbmNlLm1vdmUuZG93bi5hcmlhJzogJ01vdmUgXCJ7dGl0bGV9XCIgZG93bicsXG4gICdhZG1pbi5ndWlkYW5jZS5zdGF0dXMuZHJhZnQnOiAnRHJhZnQg4oCUIG5vdCBwdWJsaWMnLFxuICAnYWRtaW4uZ3VpZGFuY2Uuc3RhdHVzLnB1Ymxpc2hlZCc6ICdQdWJsaXNoZWQnLFxuICAnYWRtaW4uZ3VpZGFuY2UucGlubmVkLnllcyc6ICdZZXMnLFxuICAnYWRtaW4uZ3VpZGFuY2UucGlubmVkLm5vJzogJ05vJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXQnOiAnRWRpdCcsXG4gICdhZG1pbi5ndWlkYW5jZS5wdWJsaXNoJzogJ1B1Ymxpc2gnLFxuICAnYWRtaW4uZ3VpZGFuY2UudW5wdWJsaXNoJzogJ1VucHVibGlzaCcsXG4gICdhZG1pbi5ndWlkYW5jZS5kZWxldGUnOiAnRGVsZXRlJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmRlbGV0ZS5jb25maXJtJzpcbiAgICAnRGVsZXRlIHRoaXMgcG9zdCBwZXJtYW5lbnRseT8gSXRzIGltYWdlIHN0YXlzIGluIHRoZSBtZWRpYSBsaWJyYXJ5LicsXG4gICdhZG1pbi5ndWlkYW5jZS5kZWxldGUuY29uZmlybUJ1dHRvbic6ICdDb25maXJtIGRlbGV0ZScsXG4gICdhZG1pbi5ndWlkYW5jZS5kZWxldGUuY2FuY2VsJzogJ0NhbmNlbCcsXG4gICdhZG1pbi5ndWlkYW5jZS53b3JraW5nJzogJ1dvcmtpbmfigKYnLFxuICAnYWRtaW4uZ3VpZGFuY2Uuc3VjY2Vzcy5jcmVhdGVkJzogJ1Bvc3QgY3JlYXRlZC4nLFxuICAnYWRtaW4uZ3VpZGFuY2Uuc3VjY2Vzcy51cGRhdGVkJzogJ1Bvc3QgdXBkYXRlZC4nLFxuICAnYWRtaW4uZ3VpZGFuY2Uuc3VjY2Vzcy5wdWJsaXNoZWQnOiAnUG9zdCBwdWJsaXNoZWQuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLnN1Y2Nlc3MudW5wdWJsaXNoZWQnOiAnUG9zdCB1bnB1Ymxpc2hlZC4nLFxuICAnYWRtaW4uZ3VpZGFuY2Uuc3VjY2Vzcy5kZWxldGVkJzogJ1Bvc3QgZGVsZXRlZC4nLFxuICAnYWRtaW4uZ3VpZGFuY2Uuc3VjY2Vzcy5yZW9yZGVyZWQnOiAnT3JkZXIgc2F2ZWQuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLnN1Y2Nlc3MudHJhbnNsYXRpb25DcmVhdGVkJzogJ1RyYW5zbGF0aW9uIGNyZWF0ZWQuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLnN1Y2Nlc3MudHJhbnNsYXRpb25VcGRhdGVkJzogJ1RyYW5zbGF0aW9uIHVwZGF0ZWQuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLnN1Y2Nlc3MudHJhbnNsYXRpb25EZWxldGVkJzogJ1RyYW5zbGF0aW9uIGRlbGV0ZWQuJyxcblxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLmNyZWF0ZVRpdGxlJzogJ05ldyBndWlkYW5jZSBwb3N0JyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5lZGl0VGl0bGUnOiAnRWRpdCBndWlkYW5jZSBwb3N0JyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5sb2FkaW5nJzogJ0xvYWRpbmcgdGhlIHBvc3TigKYnLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLnRpdGxlTGFiZWwnOiAnVGl0bGUgKicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IudGl0bGVSZXF1aXJlZCc6ICdBIHRpdGxlIGlzIHJlcXVpcmVkLicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IudGl0bGVUb29Mb25nJzogJ1RpdGxlIG11c3QgYmUgMjU1IGNoYXJhY3RlcnMgb3IgZmV3ZXIuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5zbHVnTGFiZWwnOiAnU2x1ZyAob3B0aW9uYWwpJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5zbHVnSGludC5jcmVhdGUnOlxuICAgICdMb3dlcmNhc2UgbGV0dGVycywgbnVtYmVycyBhbmQgZGFzaGVzLiBMZWF2ZSBibGFuayB0byBnZW5lcmF0ZSBvbmUgZnJvbSB0aGUgdGl0bGUuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5zbHVnSGludC5lZGl0JzpcbiAgICAnTG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMgYW5kIGRhc2hlcy4gTGVhdmUgYmxhbmsgdG8ga2VlcCB0aGUgY3VycmVudCBzbHVnLicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3Iuc2x1Z0ludmFsaWQnOlxuICAgICdVc2UgbG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMgYW5kIGRhc2hlcyAobm8gbGVhZGluZyBvciB0cmFpbGluZyBkYXNoKS4nLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLmJvZHlMYWJlbCc6ICdCb2R5IConLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLmJvZHlIaW50JzpcbiAgICAnT25seSB0aGUgdG9vbGJhciBmb3JtYXR0aW5nIHN1cnZpdmVzIHNhdmluZyDigJQgbm8gSDEgYW5kIG5vIGlubGluZSBpbWFnZXMsIGRlbGliZXJhdGVseSAodGhlIHBhZ2Ugb3ducyB0aGUgaGVhZGluZyBhbmQgdGhlIGhlcm8gaW1hZ2UpLiBQYXN0ZWQgY29udGVudCBrZWVwcyBvbmx5IHRoZSBmb3JtYXR0aW5nIHRoZSB0b29sYmFyIG9mZmVycy4nLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLmJvZHlSZXF1aXJlZCc6ICdBIGJvZHkgaXMgcmVxdWlyZWQuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5saW5rLnByb21wdCc6ICdMaW5rIFVSTCAoaHR0cCwgaHR0cHMgb3IgbWFpbHRvKTonLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLmxpbmsuaW52YWxpZCc6XG4gICAgJ09ubHkgaHR0cCwgaHR0cHMgYW5kIG1haWx0byBsaW5rcyBhcmUga2VwdCDigJQgdXNlIGEgZnVsbCBsaW5rIHN0YXJ0aW5nIHdpdGggaHR0cHM6Ly8gb3IgbWFpbHRvOi4nLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLmxpbmsubm9TZWxlY3Rpb24nOiAnU2VsZWN0IHRoZSB0ZXh0IHRvIGxpbmsgZmlyc3QuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5oZXJvTGFiZWwnOiAnSGVybyBpbWFnZScsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IuaGVyby5jdXJyZW50JzogJ0N1cnJlbnQgaW1hZ2UnLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLmhlcm8uY2hvb3NlJzogJ0Nob29zZSBmcm9tIHRoZSBtZWRpYSBsaWJyYXJ5JyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5oZXJvLmxvYWRpbmcnOiAnTG9hZGluZyB0aGUgbWVkaWEgbGlicmFyeeKApicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IuaGVyby5lbXB0eSc6XG4gICAgJ05vIGltYWdlcyBpbiB0aGUgbWVkaWEgbGlicmFyeSB5ZXQg4oCUIHVwbG9hZCBvbmUgaW4gdGhlIE1lZGlhIGxpYnJhcnkgdGFiLicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IuaGVyby5yZW1vdmUnOiAnUmVtb3ZlIGltYWdlJyxcbiAgLyoqIFRoZSBoZXJvIHBpY2tlcidzIHVwbG9hZCBjb250cm9sOiB0aGUgZmlsZSBpbnB1dCdzIGxhYmVsICh0aGUgYmFja2VuZFxuICAgKiAgYWNjZXB0cyBleGFjdGx5IHRoZXNlIHRocmVlIHR5cGVzLCBtYWdpYy1ieXRlIGNoZWNrZWQpLiAqL1xuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLmhlcm8udXBsb2FkTGFiZWwnOiAnVXBsb2FkIGFuIGltYWdlJyxcbiAgLyoqIDQxMyBmcm9tIHRoZSB1cGxvYWQ6IG92ZXIgdGhlIHNlcnZlcidzIHNpemUgY2FwIChNRURJQV9NQVhfQllURVMpLiAqL1xuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLmhlcm8udXBsb2FkRXJyb3IudG9vTGFyZ2UnOlxuICAgICdUaGF0IGltYWdlIGlzIGxhcmdlciB0aGFuIHRoZSA1IE1CIHVwbG9hZCBjYXAuJyxcbiAgLyoqIDQwMCBmcm9tIHRoZSB1cGxvYWQ6IG5vdCBhIHJlYWRhYmxlIGltYWdlLCBvciB0aGUgZGVjbGFyZWQgdHlwZVxuICAgKiAgY29udHJhZGljdHMgdGhlIGJ5dGVzICh0aGUgc2VydmVyJ3MgbWFnaWMtYnl0ZSBjaGVjaykuICovXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IuaGVyby51cGxvYWRFcnJvci51bnN1cHBvcnRlZCc6XG4gICAgJ1RoYXQgZmlsZSBpcyBub3QgYSBzdXBwb3J0ZWQgaW1hZ2UgKEpQRUcsIFBORyBvciBXZWJQKSwgb3IgaXRzIHR5cGUgZG9lcyBub3QgbWF0Y2guJyxcbiAgLyoqIEFueSBvdGhlciB1cGxvYWQgZmFpbHVyZSAoNXh4LCBuZXR3b3JrKTogdGhlIGdlbmVyaWMgcmV0cnkgY29weS4gKi9cbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5oZXJvLnVwbG9hZEVycm9yLmdlbmVyaWMnOiAnVGhlIGltYWdlIHVwbG9hZCBmYWlsZWQuIFBsZWFzZSB0cnkgYWdhaW4uJyxcbiAgLyoqIFRoZSBoZXJvLWltcG9ydCBVUkwgaW5wdXQncyBsYWJlbDogYSBQRU5ESU5HIGltcG9ydCBzdG9yZWQgd2l0aCB0aGVcbiAgICogIGRyYWZ0LCBmZXRjaGVkIGJ5IHRoZSBzZXJ2ZXIgYXQgcHVibGlzaC4gKi9cbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5oZXJvLmltcG9ydExhYmVsJzogJ0ltcG9ydCBmcm9tIFVSTCAob3B0aW9uYWwpJyxcbiAgLyoqIEFsd2F5cy1vbiBoaW50OiBub3RoaW5nIGlzIGZldGNoZWQgYXQgZWRpdCB0aW1lIOKAlCB0aGUgc2VydmVyXG4gICAqICBmZXRjaGVzLCB2YWxpZGF0ZXMgYW5kIHN0b3JlcyB0aGUgaW1hZ2UgYXQgdGhlIG5leHQgcHVibGlzaC4gKi9cbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5oZXJvLmltcG9ydEhpbnQnOlxuICAgICdUaGUgaW1hZ2UgaXMgbm90IGZldGNoZWQgd2hpbGUgeW91IGVkaXQg4oCUIHRoZSBVUkwgaXMgc3RvcmVkIHdpdGggdGhlIGRyYWZ0LCBhbmQgdGhlIHNlcnZlciBmZXRjaGVzLCB2YWxpZGF0ZXMgYW5kIHN0b3JlcyBpdCB3aGVuIHRoZSBwb3N0IGlzIHB1Ymxpc2hlZC4nLFxuICAvKiogVGhlIFVSTCBmYWlsZWQgdGhlIHNoYXBlIGNoZWNrIChtaXJyb3JzIHRoZSBiYWNrZW5kJ3Mgd3JpdGUtdGltZVxuICAgKiAgNDAwcyk6IG5vdCBhIGZ1bGwgaHR0cChzKSBhZGRyZXNzLCBvciBpdCBlbWJlZHMgY3JlZGVudGlhbHMuICovXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IuaGVyby5pbXBvcnRJbnZhbGlkJzpcbiAgICAnVXNlIGEgZnVsbCBodHRwOi8vIG9yIGh0dHBzOi8vIGFkZHJlc3Mgd2l0aG91dCBhIHVzZXJuYW1lIG9yIHBhc3N3b3JkLiBMZWF2ZSBpdCBibGFuayBmb3Igbm8gaW1wb3J0LicsXG4gIC8qKiBUaGUgZXhwbGljaXQgXCJubyBpbWFnZVwiIHRpY2sgKGNoZWNrZWQgPSBubyBsaWJyYXJ5IGFzc2V0IEFORCBub1xuICAgKiAgcGVuZGluZyBpbXBvcnQgVVJMOyB0aGUgaGVybyBjaG9pY2UgY29udHJvbHMgYXJlIGRpc2FibGVkKS4gKi9cbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5oZXJvLm5vbmUnOiAnTm8gaW1hZ2UnLFxuICAvKiogU2hvd24gd2hpbGUgYSBwZW5kaW5nIGltcG9ydCBVUkwgaXMgc3RvcmVkOiB0aGUgZmV0Y2ggaGFwcGVucyBhdFxuICAgKiAgcHVibGlzaCwgYW5kIGEgZmFpbGVkIGZldGNoIGZhaWxzIHRoZSBwdWJsaXNoICh0aGUgZHJhZnQga2VlcHMgdGhlXG4gICAqICBVUkwgaW50YWN0KS4gKi9cbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5oZXJvLmltcG9ydE5vdGUnOlxuICAgICdOb3RoaW5nIGhhcyBiZWVuIGZldGNoZWQgeWV0LiBPbiBwdWJsaXNoIHRoZSBzZXJ2ZXIgZG93bmxvYWRzIHRoZSBpbWFnZSDigJQgaWYgdGhlIGZldGNoIGZhaWxzLCB0aGUgcHVibGlzaCBmYWlscyBhbmQgdGhpcyBkcmFmdCBrZWVwcyB0aGUgVVJMLicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IuYWx0TGFiZWwnOiAnSGVybyBpbWFnZSBhbHQgdGV4dCAob3B0aW9uYWwpJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5hbHRSZXF1aXJlZCc6ICdBbHQgdGV4dCBpcyByZXF1aXJlZCB3aGVuIGEgaGVybyBpbWFnZSBpcyBjaG9zZW4uJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5hbHRGb3JiaWRkZW4nOiAnUmVtb3ZlIHRoZSBhbHQgdGV4dCBvciBjaG9vc2UgYSBoZXJvIGltYWdlLicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IuYWx0VG9vTG9uZyc6ICdBbHQgdGV4dCBtdXN0IGJlIDMwMCBjaGFyYWN0ZXJzIG9yIGZld2VyLicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IubG9jYWxlTGFiZWwnOiAnUG9zdCBsYW5ndWFnZScsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IubG9jYWxlSGludCc6XG4gICAgXCJUaGUgcG9zdCdzIGhvbWUgbGFuZ3VhZ2UsIGUuZy4gZW4uIFByZWZpbGxlZDogdGhlIGFjdGl2ZSBVSSBsYW5ndWFnZSB3aGVuIGNyZWF0aW5nLCB0aGUgcG9zdCdzIG93biB3aGVuIGVkaXRpbmcuXCIsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IubG9jYWxlVG9vTG9uZyc6ICdMb2NhbGUgbXVzdCBiZSA1IGNoYXJhY3RlcnMgb3IgZmV3ZXIuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5lZGl0aW5nSW4nOiAnWW91IGFyZSBlZGl0aW5nIHRoZSB7bG9jYWxlfSBjb250ZW50IG9mIHRoaXMgcG9zdC4nLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLmNyZWF0aW5nSW4nOiAnVGhpcyBwb3N0IHdpbGwgYmUgY3JlYXRlZCBpbiB7bG9jYWxlfS4nLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLmhvbWVMb2NhbGVOb3RlJzpcbiAgICBcIlRoZSBwb3N0J3MgaG9tZSBsYW5ndWFnZSBpcyB7aG9tZX0uIFNhdmluZyBjaGFuZ2VzIG9ubHkgdGhlIHtsb2NhbGV9IGNvbnRlbnQg4oCUIHRoZSBvdGhlciBsYW5ndWFnZXMga2VlcCB0aGVpciBvd24gdGV4dC5cIixcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci50cmFuc2xhdGluZ0luJzpcbiAgICAnWW91IGFyZSBhZGRpbmcgdGhlIHtsb2NhbGV9IHRyYW5zbGF0aW9uIG9mIHRoaXMgcG9zdCDigJQgdGhlIG90aGVyIGxhbmd1YWdlcyBhcmUgdW50b3VjaGVkLicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IuZWRpdGluZ1RyYW5zbGF0aW9uSW4nOlxuICAgICdZb3UgYXJlIGVkaXRpbmcgdGhlIHtsb2NhbGV9IHRyYW5zbGF0aW9uIG9mIHRoaXMgcG9zdCDigJQgdGhlIG90aGVyIGxhbmd1YWdlcyBhcmUgdW50b3VjaGVkLicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IudHJhbnNsYXRpb25UaXRsZSc6ICdBZGQgYSB0cmFuc2xhdGlvbicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IudHJhbnNsYXRpb25FZGl0VGl0bGUnOiAnRWRpdCBhIHRyYW5zbGF0aW9uJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci50cmFuc2xhdGlvbnMudGl0bGUnOiAnVHJhbnNsYXRpb25zJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci50cmFuc2xhdGlvbnMubG9hZGluZyc6ICdMb2FkaW5nIHRyYW5zbGF0aW9uc+KApicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IudHJhbnNsYXRpb25zLmVtcHR5JzpcbiAgICBcIk5vIHRyYW5zbGF0aW9ucyB5ZXQg4oCUIG9ubHkgdGhlIHBvc3QncyBob21lIGxhbmd1YWdlLlwiLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLnRyYW5zbGF0aW9ucy5ob21lJzogJ2hvbWUnLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLnRyYW5zbGF0aW9ucy5hZGQnOiAnQWRkIHtsb2NhbGV9IHRyYW5zbGF0aW9uJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci50cmFuc2xhdGlvbnMuZWRpdCc6ICdFZGl0IHRyYW5zbGF0aW9uJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci50cmFuc2xhdGlvbnMuZGVsZXRlJzogJ0RlbGV0ZSB0cmFuc2xhdGlvbicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IudHJhbnNsYXRpb25zLmRlbGV0ZS5jb25maXJtJzpcbiAgICAnRGVsZXRlIHRoZSB7bG9jYWxlfSB0cmFuc2xhdGlvbiBvZiB0aGlzIHBvc3Q/IFRoZSB7bG9jYWxlfSB0ZXh0IGlzIHJlbW92ZWQ7IHRoZSBwb3N0IGFuZCBpdHMgb3RoZXIgbGFuZ3VhZ2VzIHN0YXkuJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5waW5uZWRMYWJlbCc6ICdQaW4gdGhpcyBwb3N0IHRvIHRoZSB0b3Agb2YgdGhlIGd1aWRhbmNlIGxpc3QnLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLnN0YXR1c0xhYmVsJzogJ1B1Ymxpc2gnLFxuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLnN0YXR1cy5kcmFmdCc6ICdTYXZlIGFzIGRyYWZ0JyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5zdGF0dXMucHVibGlzaCc6ICdTYXZlIGFuZCBwdWJsaXNoJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5zdGF0dXNOb3RlJzpcbiAgICAnVGhlIHB1YmxpY2F0aW9uIHN0YXRlIGlzIGNoYW5nZWQgd2l0aCB0aGUgUHVibGlzaCBhbmQgVW5wdWJsaXNoIGFjdGlvbnMgb24gdGhlIGxpc3QuJyxcbiAgLyoqIEVkaXQgbW9kZSwgZHJhZnQgcG9zdDogdGhlIGF0LWEtZ2xhbmNlIHN0YXRlIGxpbmUgKGEgZHJhZnQgaXMgbm90XG4gICAqICBwdWJsaWMgdW50aWwgcHVibGlzaGVkOyBuYW1lcyB0aGUgd2F5IG91dCkuIEEgcHVibGlzaGVkIHBvc3Qga2VlcHNcbiAgICogIHRoZSBzdGF0dXNOb3RlIGluc3RlYWQgKG5vIG5hZykuICovXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3IuZHJhZnRTdGF0ZSc6XG4gICAgJ1RoaXMgcG9zdCBpcyBhIGRyYWZ0IOKAlCBpdCBpcyBub3QgdmlzaWJsZSBvbiAvYmxvZyB1bnRpbCB5b3UgcHVibGlzaCBpdC4gVXNlIFB1Ymxpc2ggaW4gdGhlIGxpc3QuJyxcbiAgLyoqIEFmdGVyIGEgY3JlYXRlLW1vZGUgZHJhZnQgc2F2ZTogdGhlIGNvbnNlcXVlbmNlICsgdGhlIHdheSBvdXQuIEFcbiAgICogIG5vcm1hbCBzdGF0ZSwgbm90IGFuIGVycm9yICh0aGUgZWRpdG9yJ3MgaW5mbyBub3RpY2UpLiAqL1xuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLnNhdmVkQXNEcmFmdCc6XG4gICAgJ1NhdmVkIGFzIGEgZHJhZnQuIEl0IGlzIG5vdCB2aXNpYmxlIG9uIC9ibG9nIHVudGlsIHlvdSBwdWJsaXNoIGl0IOKAlCB1c2UgUHVibGlzaCBpbiB0aGUgbGlzdCwgb3Igc2F2ZSBhbmQgcHVibGlzaC4nLFxuICAvKiogQWZ0ZXIgYW4gZWRpdCBvZiBhbiBleGlzdGluZyBkcmFmdDogaXQgc3RheXMgYSBkcmFmdCwgc3RpbGwgbm90XG4gICAqICB2aXNpYmxlIG9uIC9ibG9nIHVudGlsIHB1Ymxpc2hlZCAodGhlIGVkaXQgcGF5bG9hZCBjYXJyaWVzIG5vXG4gICAqICBzdGF0dXMpLiAqL1xuICAnYWRtaW4uZ3VpZGFuY2UuZWRpdG9yLnN0aWxsRHJhZnQnOlxuICAgICdTYXZlZC4gSXQgaXMgc3RpbGwgYSBkcmFmdCwgc28gaXQgaXMgbm90IHZpc2libGUgb24gL2Jsb2cgdW50aWwgeW91IHB1Ymxpc2ggaXQg4oCUIHVzZSBQdWJsaXNoIGluIHRoZSBsaXN0LicsXG4gICdhZG1pbi5ndWlkYW5jZS5lZGl0b3Iuc2F2ZSc6ICdTYXZlJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5zYXZpbmcnOiAnU2F2aW5n4oCmJyxcbiAgJ2FkbWluLmd1aWRhbmNlLmVkaXRvci5jYW5jZWwnOiAnQ2FuY2VsJyxcblxuICAnYWRtaW4ubWVkaWEudGFiJzogJ01lZGlhIGxpYnJhcnknLFxuICAnYWRtaW4ubWVkaWEubG9hZGluZyc6ICdMb2FkaW5nIHRoZSBtZWRpYSBsaWJyYXJ54oCmJyxcbiAgJ2FkbWluLm1lZGlhLmVtcHR5JzogJ05vIGltYWdlcyBpbiB0aGUgbGlicmFyeSB5ZXQuJyxcbiAgJ2FkbWluLm1lZGlhLnVwbG9hZCc6ICdVcGxvYWQgaW1hZ2UnLFxuICAnYWRtaW4ubWVkaWEudXBsb2FkaW5nJzogJ1VwbG9hZGluZ+KApicsXG4gICdhZG1pbi5tZWRpYS51cGxvYWRIaW50JzogJ0pQRUcsIFBORyBvciBXZWJQLicsXG4gICdhZG1pbi5tZWRpYS5jb2wuaW1hZ2UnOiAnSW1hZ2UnLFxuICAnYWRtaW4ubWVkaWEuY29sLmZpbGUnOiAnRmlsZScsXG4gICdhZG1pbi5tZWRpYS5jb2wuZGltZW5zaW9ucyc6ICdEaW1lbnNpb25zJyxcbiAgJ2FkbWluLm1lZGlhLmNvbC5zaXplJzogJ1NpemUnLFxuICAnYWRtaW4ubWVkaWEuY29sLnVwbG9hZGVkJzogJ1VwbG9hZGVkJyxcbiAgJ2FkbWluLm1lZGlhLmNvbC51c2VkQnknOiAnVXNlZCBieScsXG4gICdhZG1pbi5tZWRpYS5jb2wuYWN0aW9ucyc6ICdBY3Rpb25zJyxcbiAgJ2FkbWluLm1lZGlhLmxpYnJhcnkuYXJpYSc6ICdNZWRpYSBsaWJyYXJ5JyxcbiAgJ2FkbWluLm1lZGlhLmRlbGV0ZSc6ICdEZWxldGUnLFxuICAnYWRtaW4ubWVkaWEuZGVsZXRlLndvcmtpbmcnOiAnQ2hlY2tpbmfigKYnLFxuICAnYWRtaW4ubWVkaWEuZGVsZXRlLmluVXNlJzpcbiAgICAnVGhpcyBpbWFnZSBpcyBzdGlsbCB1c2VkIGJ5IGEgZ3VpZGFuY2UgcG9zdC4gRGVsZXRpbmcgaXQgcmVtb3ZlcyB0aGUgaGVybyBpbWFnZSBmcm9tIHRoZSBhZmZlY3RlZCBwb3N0cy4nLFxuICAnYWRtaW4ubWVkaWEuZGVsZXRlLmNvbmZpcm1CdXR0b24nOiAnRGVsZXRlIGFueXdheScsXG4gICdhZG1pbi5tZWRpYS5kZWxldGUuY2FuY2VsJzogJ0NhbmNlbCcsXG4gICdhZG1pbi5tZWRpYS5zdWNjZXNzLnVwbG9hZGVkJzogJ0ltYWdlIHVwbG9hZGVkLicsXG4gICdhZG1pbi5tZWRpYS5zdWNjZXNzLmRlbGV0ZWQnOiAnSW1hZ2UgZGVsZXRlZC4nLFxuXG4gIC8vIC0tLSBsZWdhbCBwYWdlcyAobGVnYWwtaTE4biBNNCk6IG9uZSBrZXkgcGVyIHBhcmFncmFwaC9oZWFkaW5nLCBzcGxpY2VcbiAgLy8gc2VnbWVudHMgYXJvdW5kIHRoZSBpbmxpbmUgZW1waGFzaXMvbGlua3MuIFRoZSBzZWN0aW9uIGhlYWRpbmcga2V5c1xuICAvLyBkb3VibGUgYXMgdGhlIFRPQyBsaW5rIGxhYmVscy4gRU4gdmFsdWVzIGFyZSB2ZXJiYXRpbSBmcm9tIHRoZSBvbGRcbiAgLy8gc3RhdGljIHRlbXBsYXRlcyAodGhlIHBhZ2Ugc3BlY3MgYXNzZXJ0IG9uIHRoZW0pLlxuICAnbGVnYWwudG9jLmFyaWEnOiAnVGFibGUgb2YgY29udGVudHMnLFxuICAvLyBwcml2YWN5IHBvbGljeSAoL3ByaXZhY3kpXG4gICdsZWdhbC5wcml2YWN5LnRpdGxlJzogJ1ByaXZhY3kgcG9saWN5JyxcbiAgJ2xlZ2FsLnByaXZhY3kudXBkYXRlZCc6ICdMYXN0IHVwZGF0ZWQ6IDE2IFNlcHRlbWJlciAyMDI2JyxcbiAgJ2xlZ2FsLnByaXZhY3kud2hvJzogJ1dobyBvcGVyYXRlcyBPcGVuU2hlbHRlcicsXG4gICdsZWdhbC5wcml2YWN5LnNjb3BlJzogJ1Njb3BlIG9mIHRoaXMgcG9saWN5JyxcbiAgJ2xlZ2FsLnByaXZhY3kuY29sbGVjdCc6ICdXaGF0IHBlcnNvbmFsIGRhdGEgd2UgY29sbGVjdCcsXG4gICdsZWdhbC5wcml2YWN5LndoeSc6ICdXaHkgd2UgcHJvY2VzcyBlYWNoIGNhdGVnb3J5JyxcbiAgJ2xlZ2FsLnByaXZhY3kudmVyaWZpY2F0aW9uJzogJ0FjY291bnQgY3JlYXRpb24gYW5kIHZlcmlmaWNhdGlvbicsXG4gICdsZWdhbC5wcml2YWN5LmxvY2F0aW9uJzogJ0xvY2F0aW9uIGFuZCBnZW9sb2NhdGlvbicsXG4gICdsZWdhbC5wcml2YWN5LmNvbnRlbnQnOiAnVXNlci1nZW5lcmF0ZWQgY29udGVudCcsXG4gICdsZWdhbC5wcml2YWN5LmNvb2tpZXMnOiAnQ29va2llcyBhbmQgYnJvd3NlciBzdG9yYWdlJyxcbiAgJ2xlZ2FsLnByaXZhY3kudGhpcmRQYXJ0aWVzJzogJ1RoaXJkLXBhcnR5IHNlcnZpY2UgcHJvdmlkZXJzJyxcbiAgJ2xlZ2FsLnByaXZhY3kuc2hhcmluZyc6ICdEYXRhIHNoYXJpbmcnLFxuICAnbGVnYWwucHJpdmFjeS5yZXRlbnRpb24nOiAnRGF0YSByZXRlbnRpb24nLFxuICAnbGVnYWwucHJpdmFjeS5yaWdodHMnOiAnWW91ciByaWdodHMgdW5kZXIgdGhlIEdEUFInLFxuICAnbGVnYWwucHJpdmFjeS5zZWN1cml0eSc6ICdEYXRhIHNlY3VyaXR5JyxcbiAgJ2xlZ2FsLnByaXZhY3kuY2hpbGRyZW4nOiAnQ2hpbGRyZW4nLFxuICAnbGVnYWwucHJpdmFjeS5jaGFuZ2VzJzogJ0NoYW5nZXMgdG8gdGhpcyBwb2xpY3knLFxuICAnbGVnYWwucHJpdmFjeS5jb250YWN0JzogJ0NvbnRhY3QnLFxuICAnbGVnYWwucHJpdmFjeS53aG8ucDEnOlxuICAgICdPcGVuU2hlbHRlciBpcyBhbiBvcGVuLXNvdXJjZSwgY29tbXVuaXR5LW1haW50YWluZWQgbWFwIG9mIHNoZWx0ZXJzIGFuZCBzYWZlIHBsYWNlcyBpbiBFc3RvbmlhLiBJdCBpcyBvcGVyYXRlZCBieSBbT1BFUkFUT1IgTEVHQUwgTkFNRV0sIFtQT1NUQUwgQUREUkVTU10uIFRoZSBkYXRhIHByb3RlY3Rpb24gY29udGFjdCBpcyBbREFUQSBQUk9URUNUSU9OIENPTlRBQ1RdLicsXG4gICdsZWdhbC5wcml2YWN5Lndoby5wMi5iZWZvcmUnOiAnT3BlblNoZWx0ZXIgaXMgJyxcbiAgJ2xlZ2FsLnByaXZhY3kud2hvLnAyLnN0cm9uZyc6ICdub3QgYW4gb2ZmaWNpYWwgZ292ZXJubWVudCBzZXJ2aWNlJyxcbiAgJ2xlZ2FsLnByaXZhY3kud2hvLnAyLmFmdGVyJzpcbiAgICAnIGFuZCBub3QgYW4gZW1lcmdlbmN5IHNlcnZpY2UuIE9mZmljaWFsIHNoZWx0ZXIgZGF0YSBzaG93biBpbiB0aGUgYXBwbGljYXRpb24gaXMgaW1wb3J0ZWQgZnJvbSB0aGUgRXN0b25pYW4gUmVzY3VlIEJvYXJkIChQw6TDpHN0ZWFtZXQpIG9wZW4gZGF0YSwgYnV0IHRoZSBhcHBsaWNhdGlvbiBpdHNlbGYgaXMgb3BlcmF0ZWQgaW5kZXBlbmRlbnRseS4nLFxuICAnbGVnYWwucHJpdmFjeS5zY29wZS5wMSc6XG4gICAgXCJUaGlzIHBvbGljeSBkZXNjcmliZXMgaG93IE9wZW5TaGVsdGVyIGNvbGxlY3RzLCB1c2VzLCBzdG9yZXMgYW5kIGRlbGV0ZXMgcGVyc29uYWwgZGF0YSB3aGVuIHlvdSB1c2UgdGhlIHdlYiBhcHBsaWNhdGlvbi4gSXQgaXMgaW50ZW5kZWQgdG8gZGVzY3JpYmUgdGhlIGFwcGxpY2F0aW9uJ3MgYWN0dWFsIGJlaGF2aW91ci4gSXQgZG9lcyBub3QgYXBwbHkgdG8gdGhlIGV4dGVybmFsIHdlYnNpdGVzIHdlIGxpbmsgdG8gKHRoZSBFc3RvbmlhbiBSZXNjdWUgQm9hcmQsIE1hYS1hbWV0IGFuZCBPcGVuU3RyZWV0TWFwKS5cIixcblxuICAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LnAxJzpcbiAgICAnV2UgY29sbGVjdCBvbmx5IHdoYXQgdGhlIGFwcGxpY2F0aW9uIG5lZWRzIHRvIHdvcmsuIFdoZW4geW91IGNyZWF0ZSBhbiBhY2NvdW50IHdlIHN0b3JlOicsXG4gICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGkxLmJlZm9yZSc6ICd5b3VyICcsXG4gICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGkxLnN0cm9uZyc6ICdmdWxsIG5hbWUnLFxuICAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LmxpMS5hZnRlcic6ICc7JyxcbiAgJ2xlZ2FsLnByaXZhY3kuY29sbGVjdC5saTIuYmVmb3JlJzogJ3lvdXIgJyxcbiAgJ2xlZ2FsLnByaXZhY3kuY29sbGVjdC5saTIuc3Ryb25nJzogJ2UtbWFpbCBhZGRyZXNzJyxcbiAgJ2xlZ2FsLnByaXZhY3kuY29sbGVjdC5saTIuYWZ0ZXInOiAnOycsXG4gICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGkzLmJlZm9yZSc6ICd5b3VyICcsXG4gICdsZWdhbC5wcml2YWN5LmNvbGxlY3QubGkzLnN0cm9uZyc6ICdwaG9uZSBudW1iZXInLFxuICAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LmxpMy5hZnRlcic6ICc7JyxcbiAgJ2xlZ2FsLnByaXZhY3kuY29sbGVjdC5saTQuYmVmb3JlJzogJ3lvdXIgJyxcbiAgJ2xlZ2FsLnByaXZhY3kuY29sbGVjdC5saTQuc3Ryb25nJzogJ3Bhc3N3b3JkJyxcbiAgJ2xlZ2FsLnByaXZhY3kuY29sbGVjdC5saTQuYWZ0ZXInOiAnLCBzdG9yZWQgb25seSBhcyBhIG9uZS13YXkgaGFzaC4nLFxuICAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LnAyLmJlZm9yZSc6ICdXZSBkbyAnLFxuICAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LnAyLnN0cm9uZyc6ICdub3QnLFxuICAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LnAyLm1pZGRsZSc6XG4gICAgJyBjb2xsZWN0IGEgbmF0aW9uYWwgaWRlbnRpZmljYXRpb24gY29kZSwgYW5kIHdlIGRvIG5vdCB1c2UgYWR2ZXJ0aXNpbmcsIGFuYWx5dGljcyBvciBjcm9zcy1zaXRlIHRyYWNraW5nLiBXaGVuIHlvdSBjb250cmlidXRlIHRvIHRoZSBtYXAgd2Ugc3RvcmUgdGhlIGNvbnRlbnQgeW91IHN1Ym1pdCAoc2hlbHRlcnMgYW5kIHJlcG9ydHMpLCBhcyBkZXNjcmliZWQgdW5kZXIgJyxcbiAgJ2xlZ2FsLnByaXZhY3kuY29sbGVjdC5wMi5saW5rJzogJ3VzZXItZ2VuZXJhdGVkIGNvbnRlbnQnLFxuICAnbGVnYWwucHJpdmFjeS5jb2xsZWN0LnAyLmFmdGVyJzogJy4nLFxuXG4gICdsZWdhbC5wcml2YWN5LndoeS5wMSc6XG4gICAgJ0VhY2ggY2F0ZWdvcnkgaXMgcHJvY2Vzc2VkIGZvciBhIHNwZWNpZmljIHB1cnBvc2UsIGFuZCBmb3Igbm8gb3RoZXIgcHVycG9zZTonLFxuICAnbGVnYWwucHJpdmFjeS53aHkubGkxLnN0cm9uZyc6ICdOYW1lJyxcbiAgJ2xlZ2FsLnByaXZhY3kud2h5LmxpMS5hZnRlcic6XG4gICAgJyAtIHNob3duIG9uIHlvdXIgYWNjb3VudCBhbmQsIGZvciBwdWJsaWMgc3VibWlzc2lvbnMsIG9uIHRoZSBtYXAuJyxcbiAgJ2xlZ2FsLnByaXZhY3kud2h5LmxpMi5zdHJvbmcnOiAnRS1tYWlsIGFkZHJlc3MnLFxuICAnbGVnYWwucHJpdmFjeS53aHkubGkyLmFmdGVyJzpcbiAgICAnIC0gYWNjb3VudCB2ZXJpZmljYXRpb24sIHBhc3N3b3JkIHJlc2V0cyBhbmQgY3Jvc3MtY2hhbm5lbCBjb25maXJtYXRpb24gd2hlbiB5b3UgY2hhbmdlIHlvdXIgcGhvbmUgbnVtYmVyLicsXG4gICdsZWdhbC5wcml2YWN5LndoeS5saTMuc3Ryb25nJzogJ1Bob25lIG51bWJlcicsXG4gICdsZWdhbC5wcml2YWN5LndoeS5saTMuYWZ0ZXInOlxuICAgICcgLSBhY2NvdW50IHZlcmlmaWNhdGlvbiwgc2lnbi1pbiBhbmQgY3Jvc3MtY2hhbm5lbCBjb25maXJtYXRpb24gd2hlbiB5b3UgY2hhbmdlIHlvdXIgZS1tYWlsIGFkZHJlc3MuJyxcbiAgJ2xlZ2FsLnByaXZhY3kud2h5LmxpNC5zdHJvbmcnOiAnUGFzc3dvcmQnLFxuICAnbGVnYWwucHJpdmFjeS53aHkubGk0LmFmdGVyJzpcbiAgICAnIC0gYXV0aGVudGljYXRpb24uIEl0IGlzIHN0b3JlZCBvbmx5IGFzIGEgb25lLXdheSBoYXNoLCBzbyBpdCBjYW4gbmV2ZXIgYmUgcmVhZCBiYWNrLicsXG4gICdsZWdhbC5wcml2YWN5LndoeS5saTUuc3Ryb25nJzogJ1N1Ym1pdHRlZCBjb250ZW50JyxcbiAgJ2xlZ2FsLnByaXZhY3kud2h5LmxpNS5hZnRlcic6XG4gICAgJyAtIHNob3duIG9uIHRoZSBwdWJsaWMgbWFwIGFuZCB1c2VkIGJ5IGFkbWluaXN0cmF0b3JzIGZvciBtb2RlcmF0aW9uIGFuZCBhYnVzZSBwcmV2ZW50aW9uLicsXG4gICdsZWdhbC5wcml2YWN5LndoeS5wMic6XG4gICAgJ1RoZSBsZWdhbCBiYXNpcyBmb3IgZWFjaCBwdXJwb3NlIGlzIFtMRUdBTCBCQVNJUyBUTyBCRSBDT05GSVJNRURdLiBUaGlzIGRvY3VtZW50IGlzIGludGVuZGVkIHRvIGRlc2NyaWJlIHRoZSBwcm9jZXNzaW5nOyBpdCBpcyBub3QgYSBsZWdhbCBvcGluaW9uLicsXG4gICdsZWdhbC5wcml2YWN5LnZlcmlmaWNhdGlvbi5wMSc6XG4gICAgJ1lvdSBtYXkgYnJvd3NlIHRoZSBtYXAgd2l0aG91dCBhbiBhY2NvdW50LiBUbyBzdWJtaXQgc2hlbHRlcnMgb3IgcmVwb3J0cyB5b3UgbXVzdCBjcmVhdGUgYW4gYWNjb3VudCBhbmQgdmVyaWZ5IGJvdGggeW91ciBlLW1haWwgYWRkcmVzcyBhbmQgeW91ciBwaG9uZSBudW1iZXIuIFZlcmlmaWNhdGlvbiB3b3JrcyBieSBzZW5kaW5nIGEgb25lLXRpbWUgY29kZSB0byBlYWNoIGNvbnRhY3Q7IHVudGlsIGJvdGggYXJlIHZlcmlmaWVkIHlvdSBjYW4gc2lnbiBpbiBidXQgY2Fubm90IGNvbnRyaWJ1dGUuJyxcbiAgJ2xlZ2FsLnByaXZhY3kudmVyaWZpY2F0aW9uLnAyJzpcbiAgICAnUGFzc3dvcmQgcmVzZXRzIGFyZSBwZXJmb3JtZWQgYnkgYSBvbmUtdGltZSBjb2RlIHNlbnQgdG8geW91ciBlLW1haWwgYWRkcmVzcy4gQ2hhbmdpbmcgeW91ciBlLW1haWwgYWRkcmVzcyBpcyBjb25maXJtZWQgd2l0aCBhIGNvZGUgc2VudCB0byB5b3VyIGN1cnJlbnQgcGhvbmUgbnVtYmVyLCBhbmQgY2hhbmdpbmcgeW91ciBwaG9uZSBudW1iZXIgaXMgY29uZmlybWVkIHdpdGggYSBjb2RlIHNlbnQgdG8geW91ciBjdXJyZW50IGUtbWFpbCBhZGRyZXNzLicsXG4gICdsZWdhbC5wcml2YWN5LnZlcmlmaWNhdGlvbi5wMyc6XG4gICAgJ1RvIHByZXZlbnQgYWJ1c2UsIHRoZSBhcHBsaWNhdGlvbiBhcHBsaWVzIHJhdGUgbGltaXRzIG9uIGNvZGUgcmVxdWVzdHMgYW5kIG9uIHNoZWx0ZXIgc3VibWlzc2lvbnMsIGFuZCBkZXRlY3RzIG5lYXItZHVwbGljYXRlIHN1Ym1pc3Npb25zLiBFeGNlZWRpbmcgYSBsaW1pdCBwcm9kdWNlcyBhbiBlcnJvciwgbm90IGEgYmFuLicsXG4gICdsZWdhbC5wcml2YWN5LmxvY2F0aW9uLnAxLmJlZm9yZSc6ICdXZSBvbmx5IGV2ZXIgc2VlIHlvdXIgbG9jYXRpb24gd2hlbiAnLFxuICAnbGVnYWwucHJpdmFjeS5sb2NhdGlvbi5wMS5lbSc6ICd5b3UnLFxuICAnbGVnYWwucHJpdmFjeS5sb2NhdGlvbi5wMS5hZnRlcic6XG4gICAgJyBhc2sgZm9yIGl0LiBUaGUgXCJTaG93IHNoZWx0ZXJzIGFyb3VuZCB5b3VcIiBidXR0b24gYW5kIHRoZSBcIlVzZSBteSBsb2NhdGlvblwiIG9wdGlvbiBvbiB0aGUgc3VibWl0IGZvcm0gZmlyc3Qgc2hvdyB5b3VyIGJyb3dzZXJcXCdzIG93biBwZXJtaXNzaW9uIHByb21wdC4gSWYgeW91IGRlY2xpbmUsIG5vdGhpbmcgY2hhbmdlcy4nLFxuXG4gICdsZWdhbC5wcml2YWN5LmxvY2F0aW9uLnAyLmJlZm9yZSc6ICdPbiB0aGUgbWFwLCB0aGUgbmVhcmVzdCBzaGVsdGVyIGlzIHdvcmtlZCBvdXQgJyxcbiAgJ2xlZ2FsLnByaXZhY3kubG9jYXRpb24ucDIuc3Ryb25nJzogJ2luc2lkZSB5b3VyIGJyb3dzZXInLFxuICAnbGVnYWwucHJpdmFjeS5sb2NhdGlvbi5wMi5hZnRlcic6XG4gICAgJzsgeW91ciBsaXZlIHBvc2l0aW9uIGlzIG5ldmVyIHNlbnQgdG8gb3VyIHNlcnZlcnMuIElmIHlvdSBzdWJtaXQgYSBzaGVsdGVyIGF0IHlvdXIgcG9zaXRpb24sIG9ubHkgdGhlIGNvb3JkaW5hdGUgeW91IGNob29zZSBpcyBzdG9yZWQsIGFzIHBhcnQgb2YgdGhhdCBzdWJtaXNzaW9uLicsXG4gICdsZWdhbC5wcml2YWN5LmxvY2F0aW9uLnAzLmJlZm9yZSc6ICdXZSAnLFxuICAnbGVnYWwucHJpdmFjeS5sb2NhdGlvbi5wMy5zdHJvbmcnOiAnbmV2ZXInLFxuICAnbGVnYWwucHJpdmFjeS5sb2NhdGlvbi5wMy5hZnRlcic6XG4gICAgJyBpbmZlciB5b3VyIGxvY2F0aW9uIGZyb20geW91ciBJUCBhZGRyZXNzLiBBZGRyZXNzIHNlYXJjaCB1c2VzIHRoZSBPcGVuU3RyZWV0TWFwIE5vbWluYXRpbSBzZXJ2aWNlOyBhIHNlYXJjaCByZXF1ZXN0IGlzIHNlbnQgb25seSB3aGVuIHlvdSBkZWxpYmVyYXRlbHkgc2VhcmNoIGZvciBhbiBhZGRyZXNzLicsXG4gICdsZWdhbC5wcml2YWN5LmNvbnRlbnQucDEuYmVmb3JlJzpcbiAgICAnV2hlbiB5b3UgY29udHJpYnV0ZSwgdGhlIGFwcGxpY2F0aW9uIHN0b3JlcyB5b3VyIHNoZWx0ZXJzIGFuZCB5b3VyIHJlcG9ydHMgKGZvciBleGFtcGxlLCB0aGF0IGEgbG9jYXRpb24gaXMgY2xvc2VkLCBpbmFjY3VyYXRlLCBvciBubyBsb25nZXIgZXhpc3RzKS4gVGhpcyBjb250ZW50IGJlY29tZXMgcGFydCBvZiB0aGUgcHVibGljIGNvbW11bml0eSBtYXAuIFlvdSBjYW4gZWRpdCBvciByZW1vdmUgeW91ciBvd24gc2hlbHRlcnMgZnJvbSB0aGUgJyxcbiAgJ2xlZ2FsLnByaXZhY3kuY29udGVudC5wMS5hZnRlcic6ICc7IHJlcG9ydHMgYXJlIHJldmlld2VkIGJ5IGFkbWluaXN0cmF0b3JzLicsXG4gICdsZWdhbC5wcml2YWN5LmNvbnRlbnQucDInOlxuICAgICdNb2RlcmF0b3JzIGNhbiByZXZpZXcsIGhpZGUsIGNvcnJlY3Qgb3IgcmVtb3ZlIHVzZXItc3VibWl0dGVkIGNvbnRlbnQuIFRoZSBhcHBsaWNhdGlvbiBrZWVwcyBhIG1vZGVyYXRpb24gcmVjb3JkIHNvIGRlY2lzaW9ucyBjYW4gYmUgYXVkaXRlZC4nLFxuICAnbGVnYWwucHJpdmFjeS5jb29raWVzLnAxJzpcbiAgICBcIk9wZW5TaGVsdGVyIGRvZXMgbm90IHVzZSBhZHZlcnRpc2luZyBjb29raWVzLiBJdCBzdG9yZXMgb25seSB0aGUgZm9sbG93aW5nIGl0ZW1zIGluIHlvdXIgYnJvd3NlcidzIGxvY2FsIHN0b3JhZ2UsIGVhY2ggb2Ygd2hpY2ggaXMgdGVjaG5pY2FsbHkgbmVjZXNzYXJ5OlwiLFxuICAnbGVnYWwucHJpdmFjeS5jb29raWVzLmxpMS5iZWZvcmUnOiAnYSAnLFxuICAnbGVnYWwucHJpdmFjeS5jb29raWVzLmxpMS5zdHJvbmcnOiAnc2lnbi1pbiB0b2tlbicsXG4gICdsZWdhbC5wcml2YWN5LmNvb2tpZXMubGkxLmFmdGVyJzogJyB0aGF0IGtlZXBzIHlvdSBsb2dnZWQgaW4gYWNyb3NzIHBhZ2UgcmVsb2FkczsnLFxuICAnbGVnYWwucHJpdmFjeS5jb29raWVzLmxpMi5iZWZvcmUnOiAneW91ciAnLFxuICAnbGVnYWwucHJpdmFjeS5jb29raWVzLmxpMi5zdHJvbmcnOiAnbGFuZ3VhZ2UgcHJlZmVyZW5jZScsXG4gICdsZWdhbC5wcml2YWN5LmNvb2tpZXMubGkyLmFmdGVyJzogJyAoRXN0b25pYW4gb3IgRW5nbGlzaCk7JyxcbiAgJ2xlZ2FsLnByaXZhY3kuY29va2llcy5saTMuYmVmb3JlJzogJ3lvdXIgJyxcbiAgJ2xlZ2FsLnByaXZhY3kuY29va2llcy5saTMuc3Ryb25nJzogJ2Rpc3BsYXkgcHJlZmVyZW5jZScsXG4gICdsZWdhbC5wcml2YWN5LmNvb2tpZXMubGkzLmFmdGVyJzogJyAoaGlnaC1jb250cmFzdCBtb2RlKS4nLFxuICAnbGVnYWwucHJpdmFjeS5jb29raWVzLnAyJzpcbiAgICAnWW91ciBhY2Nlc3MgdG9rZW4gaXMgaGVsZCBpbiBtZW1vcnkgb25seSBhbmQgaXMgZGlzY2FyZGVkIHdoZW4geW91IGNsb3NlIHRoZSB0YWIuIE5vIHRoaXJkIHBhcnR5IHJlY2VpdmVzIHRoZXNlIGl0ZW1zLCBhbmQgdGhlcmUgYXJlIG5vIG9wdGlvbmFsIGFuYWx5dGljcyBvciB0cmFja2luZyB0ZWNobm9sb2dpZXMgdG8gYWNjZXB0IG9yIHJlamVjdC4nLFxuXG4gICdsZWdhbC5wcml2YWN5LnRoaXJkUGFydGllcy5wMSc6XG4gICAgJ1dlIHVzZSBhIHNtYWxsIG51bWJlciBvZiB0aGlyZC1wYXJ0eSBzZXJ2aWNlcywgZWFjaCBvbmx5IHRvIGRlbGl2ZXIgYSBzcGVjaWZpYyBmdW5jdGlvbjonLFxuICAnbGVnYWwucHJpdmFjeS50aGlyZFBhcnRpZXMubGkxLmJlZm9yZSc6ICdhbiAnLFxuICAnbGVnYWwucHJpdmFjeS50aGlyZFBhcnRpZXMubGkxLnN0cm9uZyc6ICdlLW1haWwgZGVsaXZlcnkgc2VydmljZScsXG4gICdsZWdhbC5wcml2YWN5LnRoaXJkUGFydGllcy5saTEuYWZ0ZXInOlxuICAgICcgKFNlbmRQdWxzZSwgdmlhIFNNVFApIHRvIHNlbmQgdmVyaWZpY2F0aW9uIGFuZCBwYXNzd29yZC1yZXNldCBjb2Rlcy4gSXQgcmVjZWl2ZXMgdGhlIGRlc3RpbmF0aW9uIGUtbWFpbCBhZGRyZXNzIHRvIGRlbGl2ZXIgdGhlIG1lc3NhZ2UuJyxcbiAgJ2xlZ2FsLnByaXZhY3kudGhpcmRQYXJ0aWVzLmxpMi5iZWZvcmUnOiAnYSAnLFxuICAnbGVnYWwucHJpdmFjeS50aGlyZFBhcnRpZXMubGkyLnN0cm9uZyc6ICd0ZXh0LW1lc3NhZ2Ugc2VydmljZScsXG4gICdsZWdhbC5wcml2YWN5LnRoaXJkUGFydGllcy5saTIuYWZ0ZXInOlxuICAgICcgKFR3aWxpbykgdG8gc2VuZCB2ZXJpZmljYXRpb24gY29kZXMuIEl0IHJlY2VpdmVzIHRoZSBkZXN0aW5hdGlvbiBwaG9uZSBudW1iZXIgdG8gZGVsaXZlciB0aGUgbWVzc2FnZS4nLFxuICAnbGVnYWwucHJpdmFjeS50aGlyZFBhcnRpZXMubGkzLnN0cm9uZyc6ICdPcGVuU3RyZWV0TWFwJyxcbiAgJ2xlZ2FsLnByaXZhY3kudGhpcmRQYXJ0aWVzLmxpMy5hZnRlcic6XG4gICAgJyBtYXAgdGlsZXMgYW5kIHRoZSBOb21pbmF0aW0gZ2VvY29kaW5nIHNlcnZpY2UsIHdoaWNoIHJlY2VpdmUgdGhlIG1hcCBhcmVhIHlvdSB2aWV3IG9yIHRoZSBhZGRyZXNzIHlvdSBzZWFyY2ggZm9yLicsXG4gICdsZWdhbC5wcml2YWN5LnRoaXJkUGFydGllcy5wMic6XG4gICAgJ1RoZSBvZmZpY2lhbCBzaGVsdGVyIGRhdGEgaXMgaW1wb3J0ZWQgZnJvbSB0aGUgRXN0b25pYW4gUmVzY3VlIEJvYXJkIChQw6TDpHN0ZWFtZXQpIG9wZW4gZGF0YTsgdGhhdCBpcyBhbiBpbmJvdW5kIGRhdGEgc291cmNlLCBub3QgYSBzZXJ2aWNlIHdlIHNlbmQgeW91ciBkYXRhIHRvLiBXaGV0aGVyIGFueSBvZiB0aGVzZSBwcm92aWRlcnMgaW52b2x2ZXMgYW4gaW50ZXJuYXRpb25hbCB0cmFuc2ZlciBpcyBbVE8gQkUgQ09ORklSTUVEXS4nLFxuICAnbGVnYWwucHJpdmFjeS5zaGFyaW5nLnAxJzpcbiAgICAnV2UgZG8gbm90IHNlbGwgeW91ciBwZXJzb25hbCBkYXRhIGFuZCBkbyBub3Qgc2hhcmUgaXQgZm9yIGFkdmVydGlzaW5nIG9yIGFueSBvdGhlciBjb21tZXJjaWFsIHB1cnBvc2UuIFRoZSBvbmx5IGRpc2Nsb3N1cmVzIGFyZSB0byB0aGUgc2VydmljZSBwcm92aWRlcnMgbGlzdGVkIGFib3ZlLCBpbiBvcmRlciB0byBkZWxpdmVyIHRoZSBtZXNzYWdlcyB5b3UgcmVxdWVzdC4gU2hlbHRlciBkYXRhIHlvdSBzdWJtaXQgYmVjb21lcyBwYXJ0IG9mIHRoZSBwdWJsaWMgY29tbXVuaXR5IGxpc3Q7IGFmdGVyIHlvdSBkZWxldGUgeW91ciBhY2NvdW50LCBwdWJsaWMgc3VibWlzc2lvbnMgcmVtYWluIG9uIHRoZSBtYXAgd2l0aG91dCBhdHRyaWJ1dGlvbi4nLFxuICAnbGVnYWwucHJpdmFjeS5yZXRlbnRpb24ucDEnOlxuICAgICdZb3VyIGFjY291bnQgZGF0YSBpcyBrZXB0IGZvciBhcyBsb25nIGFzIHlvdXIgYWNjb3VudCBleGlzdHMuIERlbGV0aW5nIHlvdXIgYWNjb3VudCByZW1vdmVzIHlvdXIgcGVyc29uYWwgZGF0YSBpbW1lZGlhdGVseTogc2hlbHRlcnMgeW91IGRlY2xhcmVkIGFzIGEgcHJpdmF0ZSBob21lIGFyZSByZW1vdmVkLCBhbmQgcHVibGljIHNoZWx0ZXJzIHlvdSBzdWJtaXR0ZWQgc3RheSBvbiB0aGUgbWFwIHdpdGhvdXQgYSBzdWJtaXR0ZXIuJyxcbiAgJ2xlZ2FsLnByaXZhY3kucmV0ZW50aW9uLnAyLmJlZm9yZSc6XG4gICAgJ1dlIGFsc28gYXBwbHkgZml4ZWQgcmV0ZW50aW9uIHBlcmlvZHM6IGFuIGFjY291bnQgd2l0aCBubyBzaWduLWluIGFjdGl2aXR5IChyZWdpc3RyYXRpb24sIGxvZ2luLCBvciBzZXNzaW9uIHJlZnJlc2gpIGZvciAnLFxuICAnbGVnYWwucHJpdmFjeS5yZXRlbnRpb24ucDIuc3Ryb25nJzogJzI0IG1vbnRocycsXG4gICdsZWdhbC5wcml2YWN5LnJldGVudGlvbi5wMi5taWRkbGUnOlxuICAgICcgaXMgZGVsZXRlZCB3aXRoIHRoZSBzYW1lIGVyYXN1cmUgcnVsZSBhcyBhY2NvdW50IGRlbGV0aW9uLCBhbmQgbW9kZXJhdGlvbiBhbmQgYXVkaXQgcmVjb3JkcyBvbGRlciB0aGFuICcsXG4gICdsZWdhbC5wcml2YWN5LnJldGVudGlvbi5wMi5zdHJvbmcyJzogJzI0IG1vbnRocycsXG4gICdsZWdhbC5wcml2YWN5LnJldGVudGlvbi5wMi5hZnRlcic6ICcgYXJlIHJlbW92ZWQuJyxcbiAgJ2xlZ2FsLnByaXZhY3kucmV0ZW50aW9uLnAzLmJlZm9yZSc6XG4gICAgXCJUaG9zZSBwZXJpb2RzIGFyZSB0aGUgYXBwJ3MgcmV0ZW50aW9uIHJ1bGUuIFRoZSBzY2hlZHVsZWQgam9iIHRoYXQgZW5mb3JjZXMgdGhlbSBpcyBhIGRlcGxveW1lbnQtbGV2ZWwgc3dpdGNoIChcIixcbiAgJ2xlZ2FsLnByaXZhY3kucmV0ZW50aW9uLnAzLmNvZGUnOiAnUkVURU5USU9OX0VOQUJMRUQnLFxuICAnbGVnYWwucHJpdmFjeS5yZXRlbnRpb24ucDMuYWZ0ZXInOlxuICAgIFwiKTogaXQgaXMgb2ZmIGluIHRoaXMgcmVwb3NpdG9yeSdzIGRldmVsb3BtZW50IHNldHVwLCBhbmQgaXQgaXMgZW5hYmxlZCBieSB3aG9ldmVyIG9wZXJhdGVzIGEgZGVwbG95bWVudC4gSW4gYSBkZXBsb3ltZW50IHdoZXJlIHRoZSBqb2IgaXMgb2ZmLCBpbmFjdGl2ZSBhY2NvdW50cyBhbmQgb2xkIGF1ZGl0IHJlY29yZHMgYXJlIHNpbXBseSBrZXB0LlwiLFxuICAnbGVnYWwucHJpdmFjeS5yZXRlbnRpb24ucDQnOlxuICAgICdQdWJsaWMgY29tbXVuaXR5IHN1Ym1pc3Npb25zIGFyZSBuZXZlciByZW1vdmVkIGF1dG9tYXRpY2FsbHk6IHRoZXkgc3RheSBvbiB0aGUgbWFwIHdpdGhvdXQgYXR0cmlidXRpb24gdW50aWwgYSBtb2RlcmF0b3IgcmVtb3ZlcyB0aGVtLicsXG5cbiAgJ2xlZ2FsLnByaXZhY3kucmlnaHRzLnAxJzogJ0lmIHlvdSBhcmUgaW4gdGhlIEV1cm9wZWFuIEVjb25vbWljIEFyZWEsIHlvdSBoYXZlIHRoZSByaWdodCB0bzonLFxuICAnbGVnYWwucHJpdmFjeS5yaWdodHMubGkxLnN0cm9uZyc6ICdBY2Nlc3MnLFxuICAnbGVnYWwucHJpdmFjeS5yaWdodHMubGkxLmFuZCc6ICcgYW5kICcsXG4gICdsZWdhbC5wcml2YWN5LnJpZ2h0cy5saTEuc3Ryb25nMic6ICdwb3J0YWJpbGl0eScsXG4gICdsZWdhbC5wcml2YWN5LnJpZ2h0cy5saTEubWlkZGxlJzpcbiAgICAnIC0gZG93bmxvYWQgYSBKU09OIGV4cG9ydCBvZiB5b3VyIHByb2ZpbGUgYW5kIGV2ZXJ5dGhpbmcgeW91IHN1Ym1pdHRlZCBmcm9tIHRoZSAnLFxuICAnbGVnYWwucHJpdmFjeS5yaWdodHMubGkxLmFmdGVyJzogJy4nLFxuICAnbGVnYWwucHJpdmFjeS5yaWdodHMubGkyLnN0cm9uZyc6ICdSZWN0aWZpY2F0aW9uJyxcbiAgJ2xlZ2FsLnByaXZhY3kucmlnaHRzLmxpMi5hZnRlcic6XG4gICAgJyAtIGNvcnJlY3QgeW91ciBuYW1lLCBvciBjaGFuZ2UgeW91ciBlLW1haWwgYWRkcmVzcyBvciBwaG9uZSBudW1iZXIgKGVhY2ggY29uZmlybWVkIHdpdGggYSBjb2RlKS4nLFxuICAnbGVnYWwucHJpdmFjeS5yaWdodHMubGkzLnN0cm9uZyc6ICdFcmFzdXJlJyxcbiAgJ2xlZ2FsLnByaXZhY3kucmlnaHRzLmxpMy5taWRkbGUnOiAnIC0gZGVsZXRlIHlvdXIgYWNjb3VudCBmcm9tIHRoZSAnLFxuICAnbGVnYWwucHJpdmFjeS5yaWdodHMubGkzLmFmdGVyJzpcbiAgICAnLiBQdWJsaWMgc3VibWlzc2lvbnMgYXJlIG9ycGhhbmVkIHJhdGhlciB0aGFuIGRlbGV0ZWQsIGFzIGRlc2NyaWJlZCBhYm92ZS4nLFxuICAnbGVnYWwucHJpdmFjeS5yaWdodHMubGk0LnN0cm9uZyc6ICdSZXN0cmljdGlvbicsXG4gICdsZWdhbC5wcml2YWN5LnJpZ2h0cy5saTQuYW5kJzogJyBhbmQgJyxcbiAgJ2xlZ2FsLnByaXZhY3kucmlnaHRzLmxpNC5zdHJvbmcyJzogJ29iamVjdGlvbicsXG4gICdsZWdhbC5wcml2YWN5LnJpZ2h0cy5saTQuYWZ0ZXInOiAnIC0gY29udGFjdCB0aGUgZGF0YSBwcm90ZWN0aW9uIGNvbnRhY3QgYmVsb3cuJyxcbiAgJ2xlZ2FsLnByaXZhY3kucmlnaHRzLnAyJzpcbiAgICAnWW91IGNhbiBhbHNvIGNvbXBsYWluIHRvIHRoZSBFc3RvbmlhbiBEYXRhIFByb3RlY3Rpb24gSW5zcGVjdG9yYXRlIChBbmRtZWthaXRzZSBJbnNwZWt0c2lvb24pLicsXG4gICdsZWdhbC5wcml2YWN5LnNlY3VyaXR5LnAxLmJlZm9yZSc6ICdZb3VyIGUtbWFpbCBhZGRyZXNzIGFuZCBwaG9uZSBudW1iZXIgYXJlICcsXG4gICdsZWdhbC5wcml2YWN5LnNlY3VyaXR5LnAxLnN0cm9uZyc6ICdlbmNyeXB0ZWQgYXQgcmVzdCcsXG4gICdsZWdhbC5wcml2YWN5LnNlY3VyaXR5LnAxLmFmdGVyJzpcbiAgICAnIChBRVMtMjU2LUdDTSkuIExvb2t1cHMgc3VjaCBhcyBzaWduLWluIGFuZCBkdXBsaWNhdGUgY2hlY2tzIHJ1biBvbiBhIHNlcGFyYXRlIG9uZS13YXkgaW5kZXggdGhhdCBjYW5ub3QgYmUgdHVybmVkIGJhY2sgaW50byB5b3VyIGNvbnRhY3QuIFlvdXIgcGFzc3dvcmQgaXMgc3RvcmVkIGFzIGEgb25lLXdheSBBcmdvbjIgaGFzaC4gVGhlIGVuY3J5cHRpb24ga2V5cyBhcmUga2VwdCBvdXRzaWRlIHRoZSBkYXRhYmFzZSBhbmQgYXJlIG5ldmVyIHdyaXR0ZW4gaW50byBjb2RlIG9yIGxvZ3MuJyxcbiAgJ2xlZ2FsLnByaXZhY3kuc2VjdXJpdHkucDInOlxuICAgICdUaGUgYXBwbGljYXRpb24gYXBwbGllcyByYXRlIGxpbWl0cyBvbiB2ZXJpZmljYXRpb24gY29kZXMsIHBhc3N3b3JkIHJlc2V0cyBhbmQgc3VibWlzc2lvbnMsIHNlbmRzIHNlY3VyaXR5IGhlYWRlcnMgb24gZXZlcnkgcmVzcG9uc2UsIGFuZCByZXF1aXJlcyBIVFRQUyBmb3IgbG9jYXRpb24gYWNjZXNzLiBObyBzZWN1cml0eSBtZWFzdXJlIGNhbiBndWFyYW50ZWUgYWJzb2x1dGUgc2FmZXR5LCBidXQgdGhlc2UgbWVhc3VyZXMgcmVkdWNlIGNvbW1vbiByaXNrcy4nLFxuXG4gICdsZWdhbC5wcml2YWN5LmNoaWxkcmVuLnAxJzpcbiAgICBcIk9wZW5TaGVsdGVyIGlzIG5vdCBkaXJlY3RlZCBhdCBjaGlsZHJlbiBhbmQgZG9lcyBub3Qga25vd2luZ2x5IGNvbGxlY3QgdGhlIHBlcnNvbmFsIGRhdGEgb2YgY2hpbGRyZW4uIFRoZSBhcHBsaWNhdGlvbiBkb2VzIG5vdCBjdXJyZW50bHkgY2hlY2sgYSB1c2VyJ3MgYWdlLlwiLFxuICAnbGVnYWwucHJpdmFjeS5jaGFuZ2VzLnAxJzpcbiAgICAnV2UgbWF5IHVwZGF0ZSB0aGlzIHBvbGljeSBhcyB0aGUgYXBwbGljYXRpb24gZXZvbHZlcy4gVGhlIHZlcnNpb24gb24gdGhpcyBwYWdlIGlzIHRoZSBvbmUgaW4gZm9yY2Ugd2hlbiB5b3UgcmVhZCBpdC4gTWF0ZXJpYWwgY2hhbmdlcyB3aWxsIGJlIHJlZmxlY3RlZCBpbiB0aGUgXCJMYXN0IHVwZGF0ZWRcIiBkYXRlIGFib3ZlLicsXG4gICdsZWdhbC5wcml2YWN5LmNvbnRhY3QucDEuYmVmb3JlJzpcbiAgICAnUXVlc3Rpb25zIGFib3V0IHRoaXMgcG9saWN5IG9yIGFib3V0IHlvdXIgZGF0YSBjYW4gYmUgc2VudCB0byBbQ09OVEFDVCBFTUFJTF0sIG9yIHRvIHRoZSBkYXRhIHByb3RlY3Rpb24gY29udGFjdCBhdCBbREFUQSBQUk9URUNUSU9OIENPTlRBQ1RdLiBPcGVuU2hlbHRlciBpcyBhbHNvIGdvdmVybmVkIGJ5IHRoZSAnLFxuICAnbGVnYWwucHJpdmFjeS5jb250YWN0LnAxLmFmdGVyJzogJy4nLFxuICAnbGVnYWwucHJpdmFjeS5saW5rLmFjY291bnRQYWdlJzogJ2FjY291bnQgcGFnZScsXG4gICdsZWdhbC5wcml2YWN5LmxpbmsudGVybXMnOiAndGVybXMgb2YgdXNlJyxcbiAgLy8gdGVybXMgb2YgdXNlICgvdGVybXMpXG4gICdsZWdhbC50ZXJtcy50aXRsZSc6ICdUZXJtcyBvZiB1c2UnLFxuICAnbGVnYWwudGVybXMudXBkYXRlZCc6ICdMYXN0IHVwZGF0ZWQ6IDEzIFNlcHRlbWJlciAyMDI2JyxcbiAgJ2xlZ2FsLnRlcm1zLmVtZXJnZW5jeU51bWJlcic6ICcxMTInLFxuICAnbGVnYWwudGVybXMuYWNjZXB0YW5jZSc6ICdBY2NlcHRhbmNlIG9mIHRoZXNlIHRlcm1zJyxcbiAgJ2xlZ2FsLnRlcm1zLnNlcnZpY2UnOiAnV2hhdCBPcGVuU2hlbHRlciBpcycsXG4gICdsZWdhbC50ZXJtcy5lbGlnaWJpbGl0eSc6ICdFbGlnaWJpbGl0eSBhbmQgYWNjb3VudHMnLFxuICAnbGVnYWwudGVybXMuc2VjdXJpdHknOiAnQWNjb3VudCBzZWN1cml0eScsXG4gICdsZWdhbC50ZXJtcy5ydWxlcyc6ICdSdWxlcyBmb3IgY29udHJpYnV0aW9ucycsXG4gICdsZWdhbC50ZXJtcy5wcm9oaWJpdGVkJzogJ1Byb2hpYml0ZWQgY29udGVudCBhbmQgYmVoYXZpb3VyJyxcbiAgJ2xlZ2FsLnRlcm1zLmxpY2Vuc2UnOiAnSW50ZWxsZWN0dWFsIHByb3BlcnR5IGFuZCB5b3VyIGxpY2Vuc2UnLFxuICAnbGVnYWwudGVybXMubW9kZXJhdGlvbic6ICdNb2RlcmF0aW9uIGFuZCByZW1vdmFsJyxcbiAgJ2xlZ2FsLnRlcm1zLm9mZmljaWFsJzogJ09mZmljaWFsIHZlcnN1cyBjb21tdW5pdHkgaW5mb3JtYXRpb24nLFxuICAnbGVnYWwudGVybXMuZW1lcmdlbmN5JzogJ0VtZXJnZW5jeSBkaXNjbGFpbWVyJyxcbiAgJ2xlZ2FsLnRlcm1zLndhcnJhbnR5JzogJ05vIHdhcnJhbnR5JyxcbiAgJ2xlZ2FsLnRlcm1zLmxpYWJpbGl0eSc6ICdMaW1pdGF0aW9uIG9mIHJlc3BvbnNpYmlsaXR5JyxcbiAgJ2xlZ2FsLnRlcm1zLnRoaXJkUGFydHknOiAnVGhpcmQtcGFydHkgbGlua3MgYW5kIHNlcnZpY2VzJyxcbiAgJ2xlZ2FsLnRlcm1zLmF2YWlsYWJpbGl0eSc6ICdTZXJ2aWNlIGF2YWlsYWJpbGl0eSBhbmQgY2hhbmdlcycsXG4gICdsZWdhbC50ZXJtcy5zb3VyY2UnOiAnT3Blbi1zb3VyY2UgbGljZW5zZScsXG4gICdsZWdhbC50ZXJtcy5sYXcnOiAnQXBwbGljYWJsZSBsYXcgYW5kIGRpc3B1dGVzJyxcbiAgJ2xlZ2FsLnRlcm1zLmNvbnRhY3QnOiAnQ29udGFjdCcsXG5cbiAgJ2xlZ2FsLnRlcm1zLmFjY2VwdGFuY2UucDEnOlxuICAgICdCeSB1c2luZyBPcGVuU2hlbHRlciwgeW91IGFncmVlIHRvIHRoZXNlIHRlcm1zIG9mIHVzZS4gSWYgeW91IGRvIG5vdCBhZ3JlZSwgZG8gbm90IHVzZSB0aGUgYXBwbGljYXRpb24uIENvbnRpbnVpbmcgdG8gdXNlIHRoZSBhcHBsaWNhdGlvbiBhZnRlciBhIGNoYW5nZSBtZWFucyB5b3UgYWNjZXB0IHRoZSB1cGRhdGVkIHRlcm1zLicsXG4gICdsZWdhbC50ZXJtcy5zZXJ2aWNlLnAxJzpcbiAgICAnT3BlblNoZWx0ZXIgaXMgYW4gaW5kZXBlbmRlbnQsIGNvbW11bml0eS1tYWludGFpbmVkIG1hcCBvZiBzaGVsdGVycyBhbmQgc2FmZSBwbGFjZXMgaW4gRXN0b25pYS4gSXQgY29tYmluZXMgb2ZmaWNpYWwgb3BlbiBkYXRhIGZyb20gdGhlIEVzdG9uaWFuIFJlc2N1ZSBCb2FyZCAoUMOkw6RzdGVhbWV0KSB3aXRoIGxvY2F0aW9ucyBzdWJtaXR0ZWQgYnkgY29tbXVuaXR5IG1lbWJlcnMuJyxcbiAgJ2xlZ2FsLnRlcm1zLnNlcnZpY2UucDIuYmVmb3JlJzogJ09wZW5TaGVsdGVyIGlzICcsXG4gICdsZWdhbC50ZXJtcy5zZXJ2aWNlLnAyLnN0cm9uZyc6ICdub3QgYW4gb2ZmaWNpYWwgZW1lcmdlbmN5IHNlcnZpY2UnLFxuICAnbGVnYWwudGVybXMuc2VydmljZS5wMi5taWRkbGUnOiAnIGFuZCBub3QgYSBnb3Zlcm5tZW50IHNlcnZpY2UuIEluIGFuIGVtZXJnZW5jeSwgY2FsbCAnLFxuICAnbGVnYWwudGVybXMuc2VydmljZS5wMi5hZnRlcic6XG4gICAgJyBhbmQgZm9sbG93IHRoZSBpbnN0cnVjdGlvbnMgb2YgdGhlIEVzdG9uaWFuIFJlc2N1ZSBCb2FyZCwgbG9jYWwgYXV0aG9yaXRpZXMgYW5kIGVtZXJnZW5jeSBzZXJ2aWNlcy4nLFxuICAnbGVnYWwudGVybXMuZWxpZ2liaWxpdHkucDEnOlxuICAgICdZb3UgbWF5IGJyb3dzZSB0aGUgbWFwIHdpdGhvdXQgYW4gYWNjb3VudC4gVG8gc3VibWl0IHNoZWx0ZXJzIG9yIHJlcG9ydHMgeW91IG5lZWQgYW4gYWNjb3VudCwgYW5kIHRoZSBhY2NvdW50IGJlY29tZXMgY29udHJpYnV0aW5nIGFmdGVyIHlvdSB2ZXJpZnkgYm90aCB5b3VyIGUtbWFpbCBhZGRyZXNzIGFuZCB5b3VyIHBob25lIG51bWJlciB3aXRoIG9uZS10aW1lIGNvZGVzLiBZb3UgYXJlIHJlc3BvbnNpYmxlIGZvciB0aGUgYWNjdXJhY3kgb2YgdGhlIGNvbnRhY3RzIHlvdSByZWdpc3Rlci4nLFxuICAnbGVnYWwudGVybXMuc2VjdXJpdHkucDEnOlxuICAgICdZb3UgYXJlIHJlc3BvbnNpYmxlIGZvciBrZWVwaW5nIHlvdXIgcGFzc3dvcmQgc2FmZSBhbmQgZm9yIGV2ZXJ5dGhpbmcgZG9uZSB0aHJvdWdoIHlvdXIgYWNjb3VudC4gRG8gbm90IHNoYXJlIHlvdXIgcGFzc3dvcmQgb3IgeW91ciBvbmUtdGltZSB2ZXJpZmljYXRpb24gY29kZXMuIElmIHlvdSBiZWxpZXZlIHlvdXIgYWNjb3VudCBoYXMgYmVlbiBjb21wcm9taXNlZCwgcmVzZXQgeW91ciBwYXNzd29yZC4nLFxuICAnbGVnYWwudGVybXMucnVsZXMubGkxJzpcbiAgICAnU3VibWl0IG9ubHkgcGxhY2VzIHlvdSBrbm93IHRvIGV4aXN0LCB3aXRoIGRldGFpbHMgYWNjdXJhdGUgdG8gdGhlIGJlc3Qgb2YgeW91ciBrbm93bGVkZ2UuJyxcbiAgJ2xlZ2FsLnRlcm1zLnJ1bGVzLmxpMic6XG4gICAgJ1JlcG9ydCBsb2NhdGlvbnMgKGFzIGNsb3NlZCwgaW5hY2N1cmF0ZSwgb3Igbm8gbG9uZ2VyIGV4aXN0aW5nKSB0cnV0aGZ1bGx5IGFuZCBvbmx5IGZyb20gd2hhdCB5b3UgYWN0dWFsbHkga25vdy4nLFxuICAnbGVnYWwudGVybXMucnVsZXMubGkzJzpcbiAgICAnRG8gbm90IHN1Ym1pdCBhIHByaXZhdGUgaG9tZSBhcyBhIHB1YmxpYyBzaGVsdGVyLiBJZiB5b3Ugc3VibWl0IGEgbG9jYXRpb24gdGhhdCBpcyBhIHByaXZhdGUgaG9tZSwgZGVjbGFyZSBpdCBhcyBzdWNoLicsXG4gICdsZWdhbC50ZXJtcy5ydWxlcy5saTQnOlxuICAgICdUaGUgYXBwbGljYXRpb24gYXBwbGllcyBsaW1pdHMgdG8ga2VlcCB0aGUgbGlzdCB1c2FibGU6IGEgZGFpbHkgY2FwIG9uIHN1Ym1pc3Npb25zLCBhIGNhcCBvbiBob3cgb2Z0ZW4gb25lLXRpbWUgY29kZXMgbWF5IGJlIHJlcXVlc3RlZCwgYW5kIGRldGVjdGlvbiBvZiBuZWFyLWR1cGxpY2F0ZSBzdWJtaXNzaW9ucy4gRXhjZWVkaW5nIGEgbGltaXQgcHJvZHVjZXMgYW4gZXJyb3IgYW5kIGEgc3VnZ2VzdGVkIHdhaXQ7IGl0IGlzIG5vdCBhIGJhbi4nLFxuXG4gICdsZWdhbC50ZXJtcy5wcm9oaWJpdGVkLnAxJzogJ1lvdSBtdXN0IG5vdDonLFxuICAnbGVnYWwudGVybXMucHJvaGliaXRlZC5saTEnOlxuICAgICdzdWJtaXQgZmFsc2UsIG1pc2xlYWRpbmcsIHVuc2FmZSBvciBtYWxpY2lvdXMgc2hlbHRlciBkYXRhIG9yIHJlcG9ydHM7JyxcbiAgJ2xlZ2FsLnRlcm1zLnByb2hpYml0ZWQubGkyJzpcbiAgICAnc3VibWl0IHByaXZhdGUgaG9tZXMgYXMgcHVibGljIHNoZWx0ZXJzIHdpdGhvdXQgZGVjbGFyaW5nIHRoZW0gYXMgcHJpdmF0ZTsnLFxuICAnbGVnYWwudGVybXMucHJvaGliaXRlZC5saTMnOlxuICAgICdzcGFtLCBhdXRvbWF0ZSBhY2Nlc3MsIG9yIGF0dGVtcHQgdG8gYXR0YWNrIG9yIG92ZXJsb2FkIHRoZSBhcHBsaWNhdGlvbjsnLFxuICAnbGVnYWwudGVybXMucHJvaGliaXRlZC5saTQnOlxuICAgIFwiYXR0ZW1wdCB0byBhY2Nlc3MgYW5vdGhlciB1c2VyJ3MgYWNjb3VudCBvciB0aGUgYWRtaW5pc3RyYXRvciBmdW5jdGlvbnM7XCIsXG4gICdsZWdhbC50ZXJtcy5wcm9oaWJpdGVkLmxpNSc6XG4gICAgXCJzdWJtaXQgY29udGVudCB0aGF0IGlzIHVubGF3ZnVsLCBkZWZhbWF0b3J5LCBvciB0aGF0IGV4cG9zZXMgc29tZW9uZSdzIHByaXZhdGUgZGF0YS5cIixcbiAgJ2xlZ2FsLnRlcm1zLnByb2hpYml0ZWQucDInOlxuICAgICdEZWxpYmVyYXRlbHkgZmFsc2Ugb3IgbWlzbGVhZGluZyBzaGVsdGVyIGRhdGEgaXMgYWJ1c2Ugb2YgdGhlIHNlcnZpY2UgYW5kIG1heSBsZWFkIHRvIHJlbW92YWwgb2YgY29udGVudCBvciBzdXNwZW5zaW9uIG9mIHlvdXIgYWNjb3VudC4nLFxuICAnbGVnYWwudGVybXMubGljZW5zZS5wMSc6XG4gICAgJ0J5IHN1Ym1pdHRpbmcgYSBzaGVsdGVyIG9yIHJlcG9ydCwgeW91IGdyYW50IE9wZW5TaGVsdGVyIGEgbm9uLWV4Y2x1c2l2ZSwgd29ybGR3aWRlLCByb3lhbHR5LWZyZWUgbGljZW5zZSB0byBzdG9yZSwgZGlzcGxheSBhbmQgbW9kaWZ5IHRoYXQgY29udGVudCBmb3IgdGhlIHB1cnBvc2Ugb2Ygb3BlcmF0aW5nIHRoZSBtYXAgYW5kIG1vZGVyYXRpbmcgaXQuIFlvdSBrZWVwIG93bmVyc2hpcCBvZiB3aGF0IHlvdSBzdWJtaXQsIGFuZCB5b3UgY2FuIGVkaXQgb3IgcmVtb3ZlIHlvdXIgb3duIHNoZWx0ZXJzLicsXG4gICdsZWdhbC50ZXJtcy5tb2RlcmF0aW9uLnAxJzpcbiAgICAnU3VibWlzc2lvbnMgZW50ZXIgdGhlIGxpc3QgYXMgY29tbXVuaXR5IHJlcG9ydHMuIE1vZGVyYXRvcnMgY2FuIHJldmlldywgaGlkZSwgY29ycmVjdCBvciByZW1vdmUgdXNlci1zdWJtaXR0ZWQgY29udGVudCwgYW5kIGNhbiBzdXNwZW5kIGFjY291bnRzIHRoYXQgYWJ1c2UgdGhlIHNlcnZpY2UuIEEgc3VibWlzc2lvbiBjYW4gdGhlcmVmb3JlIGJlIHJldmlld2VkLCBoaWRkZW4gb3IgcmVqZWN0ZWQuJyxcbiAgJ2xlZ2FsLnRlcm1zLm9mZmljaWFsLnAxLmJlZm9yZSc6XG4gICAgJ1RoZSBhcHBsaWNhdGlvbiBkaXN0aW5ndWlzaGVzIGJldHdlZW4gaW5mb3JtYXRpb24gc291cmNlcy4gTG9jYXRpb25zIG1hcmtlZCBhcyBcIlJlZ2lzdHJ5XCIgY29tZSBmcm9tIG9mZmljaWFsIG9wZW4gZGF0YS4gTG9jYXRpb25zIG1hcmtlZCBcIk5ldyBieSBjb21tdW5pdHlcIiBvciBcIkNvbmZpcm1lZCBieSBjb21tdW5pdHlcIiB3ZXJlIHN1Ym1pdHRlZCBieSBjb21tdW5pdHkgbWVtYmVycy4gQSAnLFxuICAnbGVnYWwudGVybXMub2ZmaWNpYWwucDEuZW0nOiAndmVyaWZpZWQgdXNlcicsXG4gICdsZWdhbC50ZXJtcy5vZmZpY2lhbC5wMS5taWRkbGUnOlxuICAgICcgaGFzIHByb3ZlZCBvd25lcnNoaXAgb2YgYW4gZS1tYWlsIGFkZHJlc3MgYW5kIGEgcGhvbmUgbnVtYmVyOyB0aGF0IHNheXMgbm90aGluZyBhYm91dCB0aGUgYWNjdXJhY3kgb2Ygd2hhdCB0aGV5IHN1Ym1pdC4gJyxcbiAgJ2xlZ2FsLnRlcm1zLm9mZmljaWFsLnAxLnN0cm9uZyc6ICdBIHZlcmlmaWVkIHVzZXIgaXMgbm90IGEgdmVyaWZpZWQgc2hlbHRlci4nLFxuICAnbGVnYWwudGVybXMub2ZmaWNpYWwucDInOlxuICAgICdBIGNvbW11bml0eS1zdWJtaXR0ZWQgbG9jYXRpb24gaXMgbm90IGF1dG9tYXRpY2FsbHkgYSBzYWZlLCBsZWdhbCwgYWNjZXNzaWJsZSwgcHVibGljIG9yIG9wZXJhdGlvbmFsIHNoZWx0ZXIuIFRyZWF0IGNvbW11bml0eSBzdWJtaXNzaW9ucyB3aXRoIGNhdXRpb24sIGVzcGVjaWFsbHkgZHVyaW5nIGFuIGVtZXJnZW5jeS4nLFxuXG4gICdsZWdhbC50ZXJtcy5lbWVyZ2VuY3kucDEuYmVmb3JlJzpcbiAgICAnT3BlblNoZWx0ZXIgaXMgbm90IGFuIGVtZXJnZW5jeSBzZXJ2aWNlIGFuZCBtdXN0IG5vdCBiZSB5b3VyIG9ubHkgc291cmNlIG9mIGVtZXJnZW5jeSBpbmZvcm1hdGlvbi4gT2ZmaWNpYWwgaW5zdHJ1Y3Rpb25zIGZyb20gdGhlIEVzdG9uaWFuIFJlc2N1ZSBCb2FyZCwgbG9jYWwgYXV0aG9yaXRpZXMgYW5kIGVtZXJnZW5jeSBzZXJ2aWNlcyBhbHdheXMgdGFrZSBwcmlvcml0eSBvdmVyIGFueXRoaW5nIHNob3duIGluIHRoaXMgYXBwbGljYXRpb24uIEluIGFuIGVtZXJnZW5jeSwgY2FsbCAnLFxuICAnbGVnYWwudGVybXMuZW1lcmdlbmN5LnAxLmFmdGVyJzogJy4nLFxuICAnbGVnYWwudGVybXMuZW1lcmdlbmN5LnAyJzpcbiAgICAnRG8gbm90IGVudGVyIHByaXZhdGUgcHJvcGVydHkgb3IgYWJhbmRvbmVkIGJ1aWxkaW5ncyBiYXNlZCBvbmx5IG9uIGluZm9ybWF0aW9uIHNob3duIGJ5IE9wZW5TaGVsdGVyLicsXG4gICdsZWdhbC50ZXJtcy53YXJyYW50eS5wMSc6XG4gICAgJ1RoZSBsaXN0IGlzIHByb3ZpZGVkIGFzLWlzLCBmb3IgY29tbXVuaXR5IGJlbmVmaXQsIHdpdGhvdXQgd2FycmFudHkgb2YgYW55IGtpbmQuIFdlIGRvIG5vdCBndWFyYW50ZWUgdGhhdCBhbnkgbG9jYXRpb24gaXMgb3Blbiwgc2FmZSwgYWNjZXNzaWJsZSwgYXZhaWxhYmxlLCBzdWl0YWJsZSBvciBzdGlsbCBvcGVyYXRpb25hbC4nLFxuICAnbGVnYWwudGVybXMubGlhYmlsaXR5LnAxJzpcbiAgICAnVG8gdGhlIGV4dGVudCBwZXJtaXR0ZWQgYnkgbGF3LCBPcGVuU2hlbHRlciBhY2NlcHRzIG5vIGxpYWJpbGl0eSBmb3IgZGVjaXNpb25zIG1hZGUgaW4gcmVsaWFuY2Ugb24gdGhlIGxpc3QuIFRoaXMgcGFyYWdyYXBoIGlzIGludGVuZGVkIHRvIGJlIHJlYXNvbmFibGUgYW5kIGlzIHN1YmplY3QgdG8gbGVnYWwgcmV2aWV3OyBpdCBkb2VzIG5vdCBhdHRlbXB0IHRvIGV4Y2x1ZGUgbGlhYmlsaXR5IHRoYXQgY2Fubm90IGJlIGV4Y2x1ZGVkIGJ5IGxhdy4nLFxuICAnbGVnYWwudGVybXMudGhpcmRQYXJ0eS5wMS5iZWZvcmUnOlxuICAgICdUaGUgYXBwbGljYXRpb24gbGlua3MgdG8gZXh0ZXJuYWwgc2VydmljZXMsIGluY2x1ZGluZyB0aGUgRXN0b25pYW4gUmVzY3VlIEJvYXJkLCBNYWEtYW1ldCBhbmQgT3BlblN0cmVldE1hcC4gV2UgYXJlIG5vdCByZXNwb25zaWJsZSBmb3IgdGhlIGNvbnRlbnQgb3IgYXZhaWxhYmlsaXR5IG9mIHRob3NlIHNlcnZpY2VzLiBIb3cgcGVyc29uYWwgZGF0YSBpcyBzaGFyZWQgd2l0aCBzZXJ2aWNlIHByb3ZpZGVycyBpcyBkZXNjcmliZWQgaW4gdGhlICcsXG4gICdsZWdhbC50ZXJtcy50aGlyZFBhcnR5LnAxLmxpbmsnOiAncHJpdmFjeSBwb2xpY3knLFxuICAnbGVnYWwudGVybXMudGhpcmRQYXJ0eS5wMS5hZnRlcic6ICcuJyxcbiAgJ2xlZ2FsLnRlcm1zLmF2YWlsYWJpbGl0eS5wMSc6XG4gICAgJ1RoZSBhcHBsaWNhdGlvbiBpcyBwcm92aWRlZCBmcmVlIG9mIGNoYXJnZSBhbmQgbWF5IGNoYW5nZSBvciBiZSB1bmF2YWlsYWJsZSBhdCBhbnkgdGltZSB3aXRob3V0IG5vdGljZS4gV2UgbWF5IGFkZCwgY2hhbmdlIG9yIHJlbW92ZSBmZWF0dXJlcy4nLFxuICAnbGVnYWwudGVybXMuc291cmNlLnAxJzpcbiAgICAnVGhlIE9wZW5TaGVsdGVyIHNvdXJjZSBjb2RlIGlzIGF2YWlsYWJsZSB1bmRlciB0aGUgTUlUIExpY2Vuc2UuIFRoaXMgZ292ZXJucyB0aGUgc291cmNlIGNvZGUsIG5vdCB0aGUgc2hlbHRlciBkYXRhLCB3aGljaCByZW1haW5zIHN1YmplY3QgdG8gaXRzIG93biBzb3VyY2VzIGFuZCB0byB0aGVzZSB0ZXJtcy4nLFxuICAnbGVnYWwudGVybXMubGF3LnAxJzpcbiAgICAnVGhlc2UgdGVybXMgYXJlIGdvdmVybmVkIGJ5IFtBUFBMSUNBQkxFIExBVyBUTyBCRSBDT05GSVJNRURdLiBEaXNwdXRlcyB3aWxsIGJlIHJlc29sdmVkIGluIFtESVNQVVRFIFJFU09MVVRJT04gVE8gQkUgQ09ORklSTUVEXS4nLFxuICAnbGVnYWwudGVybXMuY29udGFjdC5wMS5iZWZvcmUnOlxuICAgICdRdWVzdGlvbnMgYWJvdXQgdGhlc2UgdGVybXMgY2FuIGJlIHNlbnQgdG8gW0NPTlRBQ1QgRU1BSUxdLiBPcGVuU2hlbHRlciBpcyBhbHNvIGdvdmVybmVkIGJ5IHRoZSAnLFxuICAnbGVnYWwudGVybXMuY29udGFjdC5wMS5saW5rJzogJ3ByaXZhY3kgcG9saWN5JyxcbiAgJ2xlZ2FsLnRlcm1zLmNvbnRhY3QucDEuYWZ0ZXInOiAnLicsXG59O1xuIiwiaW1wb3J0IHR5cGUgeyBMb2NhbGUgfSBmcm9tICcuL2xvY2FsZSc7XG5pbXBvcnQgdHlwZSB7IE1lc3NhZ2VLZXkgfSBmcm9tICcuL21lc3NhZ2VzJztcblxuLyoqXG4gKiBUaGUgYWRtaW4tZWRpdGFibGUgc2l0ZSB0ZXh0cyAoc2l0ZV90ZXh0cyk6IHRoZSBERUNMQVJFRCBLRVkgQUxMT1dMSVNULlxuICpcbiAqIFRoZSBhZG1pbiBlZGl0cyBWQUxVRVMsIG5ldmVyIGludmVudHMga2V5czogYm90aCB0aGUgYmFja2VuZFxuICogKGBTaXRlVGV4dEtleXNgLCB0aGUgc2VydmVyLXNpZGUgdHdpbiBvZiB0aGlzIGxpc3QpIGFuZCB0aGlzIGZyb250ZW5kXG4gKiBsaXN0IGFyZSBjbG9zZWQgc2V0cyBvZiBjYXRhbG9nIGtleXMuIEEgdmFsdWUgaXMgc3RvcmVkIHBlciAoa2V5LFxuICogbG9jYWxlKSBpbiB0aGUgYHNpdGVfdGV4dHNgIHRhYmxlIGFuZCB0aGUgc2hpcHBlZCBpMThuIGNhdGFsb2cgaXMgdGhlXG4gKiBERUZBVUxUIHdoZW4gbm8gb3ZlcnJpZGUgcm93IGV4aXN0cyDigJQgYEkxOG5TZXJ2aWNlYCBhcHBsaWVzIHRoZSBvdmVybGF5XG4gKiBpbiBvbmUgcGxhY2UsIHNvIHRoZSBzYW1lIG1lY2hhbmlzbSBjb3ZlcnMgdGhlIGFjY2Vzc2liaWxpdHkgcG9wdXAsXG4gKiB0aGUgaGVhZGVyIGFuZCB0aGUgZm9vdGVyLlxuICpcbiAqIFBsYWluIHRleHQgb25seTogdGhlIG92ZXJyaWRlIHZhbHVlcyBhcmUgYXV0by1lc2NhcGVkIChBbmd1bGFyIHRleHRcbiAqIGludGVycG9sYXRpb24sIG5ldmVyIGlubmVySFRNTCkuIFRoZSB0d28gb2ZmaWNpYWwtc291cmNlIGxpbmtzIGFyZVxuICogTEFCRUwgKyBodHRwcy1WQUxJREFURUQgVVJMIHBhaXJzOiBvbmx5IHRoZSBsaW5rIGtleXMgYmVsb3cgY2FycnkgYVxuICogVVJMLCBhbmQgdGhlIFVSTCBtdXN0IHN0YXJ0IHdpdGggYGh0dHBzOi8vYCAoY2hlY2tlZCBzZXJ2ZXItc2lkZSkuXG4gKlxuICogS2VlcCBpbiBsb2Nrc3RlcCB3aXRoIGBlZS5zaGVsdGVybWFwLnNpdGV0ZXh0cy5TaXRlVGV4dEtleXNgIG9uIHRoZVxuICogYmFja2VuZCAoYSB1bml0IHRlc3QgcGlucyB0aGF0IHNldCkuXG4gKi9cblxuLyoqIE9uZSBzdG9yZWQgb3ZlcnJpZGU6IHRoZSB0ZXh0IHZhbHVlOyBsaW5rIGtleXMgY2FycnkgdGhlIGh0dHBzIFVSTC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2l0ZVRleHRPdmVycmlkZSB7XG4gIHZhbHVlOiBzdHJpbmc7XG4gIC8qKiBQcmVzZW50IGZvciBsaW5rIGtleXMgKGxhYmVsICsgaHR0cHMtdmFsaWRhdGVkIFVSTCBwYWlyKS4gKi9cbiAgdXJsPzogc3RyaW5nO1xufVxuXG4vKiogVGhlIGZ1bGwgcHVibGljIHBheWxvYWQ6IGV2ZXJ5IGxvY2FsZSB0aGUgc2l0ZSBzZXJ2ZXMsIGVhY2ggYVxuICogIGtleSDihpIgb3ZlcnJpZGUgbWFwIChhYnNlbnQga2V5ID0gdGhlIHNoaXBwZWQgY2F0YWxvZyBkZWZhdWx0KS4gKi9cbmV4cG9ydCB0eXBlIFNpdGVUZXh0c0J5TG9jYWxlID0gUmVjb3JkPExvY2FsZSwgUmVjb3JkPHN0cmluZywgU2l0ZVRleHRPdmVycmlkZT4+O1xuXG4vKiogQSBrZXkgYW4gYWRtaW4gbWF5IGVkaXQg4oCUIGEgY2F0YWxvZyBrZXksIHNvIGEgdHlwbydkIGVudHJ5IGlzIGFcbiAqICBjb21waWxlIGVycm9yIGhlcmUgYW5kIGEgNDAwIG9uIHRoZSBzZXJ2ZXIuICovXG5leHBvcnQgdHlwZSBTaXRlVGV4dEtleSA9IE1lc3NhZ2VLZXk7XG5cbi8qKiBUaGUgUG9wdXAgYmxvY2sg4oCUIHRoZSBhY2Nlc3NpYmlsaXR5IGRpYWxvZydzIGhlYWRlciAodGl0bGUpLCBib2R5LFxuICogIHRoZSB0aHJlZSBvcHRpb24gbGFiZWxzICsgZGVzY3JpcHRpb25zIGFuZCB0aGUgZm9vdGVyIChub3RlICsgY2xvc2UpLiAqL1xuZXhwb3J0IGNvbnN0IFNJVEVfVEVYVF9QT1BVUF9LRVlTOiByZWFkb25seSBTaXRlVGV4dEtleVtdID0gW1xuICAnYTExeS5wb3B1cC50aXRsZScsXG4gICdhMTF5LnBvcHVwLmJvZHknLFxuICAnYTExeS5vcHRpb24uZGVmYXVsdCcsXG4gICdhMTF5Lm9wdGlvbi5kZWZhdWx0LmRlc2MnLFxuICAnYTExeS5vcHRpb24uaGlnaENvbnRyYXN0JyxcbiAgJ2ExMXkub3B0aW9uLmhpZ2hDb250cmFzdC5kZXNjJyxcbiAgJ2ExMXkub3B0aW9uLmJsYWNrWWVsbG93JyxcbiAgJ2ExMXkub3B0aW9uLmJsYWNrWWVsbG93LmRlc2MnLFxuICAnYTExeS5wb3B1cC5mb290ZXInLFxuICAnYTExeS5wb3B1cC5jbG9zZScsXG5dIGFzIGNvbnN0O1xuXG4vKiogVGhlIEhlYWRlciBibG9jayDigJQgdGhlIGFwcCBoZWFkZXIncyBvd24gdGV4dHM6IHRoZSBhY2Nlc3NpYmlsaXR5XG4gKiAgdHJpZ2dlciwgdGhlIG5hdiBsYWJlbHMgYW5kIHRoZSBzZXNzaW9uIGNvbnRyb2xzLiAqL1xuZXhwb3J0IGNvbnN0IFNJVEVfVEVYVF9IRUFERVJfS0VZUzogcmVhZG9ubHkgU2l0ZVRleHRLZXlbXSA9IFtcbiAgJ2ExMXkuYnV0dG9uJyxcbiAgJ25hdi5tYXAnLFxuICAnbmF2Lmd1aWRhbmNlJyxcbiAgJ25hdi5hY2NvdW50JyxcbiAgJ25hdi5hZG1pbicsXG4gICdsYW5nLmxhYmVsJyxcbiAgJ2F1dGgubG9naW4nLFxuICAnYXV0aC5sb2dvdXQnLFxuICAnYXV0aC5yZWdpc3RlcicsXG5dIGFzIGNvbnN0O1xuXG4vKiogVGhlIEZvb3RlciBibG9jayDigJQgdGhlIGFwcC13aWRlIHNhZmV0eSBub3RpY2UgKyBsZWdhbC9kYXRhIHJvd3MuXG4gKiAgYGZvb3Rlci5yZXNjdWVCb2FyZGAgYW5kIGBmb290ZXIubWluaXN0cnlgIGFyZSB0aGUgbGluayBrZXlzICh0aGVpclxuICogIGxhYmVscyBBTkQgdGhlaXIgaHR0cHMgVVJMcyBhcmUgZWRpdGFibGU7IGV2ZXJ5IG90aGVyIGtleSBpc1xuICogIHBsYWluIHRleHQg4oCUIHRoZSBpbnRlcm5hbCBwcml2YWN5L3Rlcm1zIHJvdXRlcyBhcmUgbm90KS4gKi9cbmV4cG9ydCBjb25zdCBTSVRFX1RFWFRfRk9PVEVSX0tFWVM6IHJlYWRvbmx5IFNpdGVUZXh0S2V5W10gPSBbXG4gICdmb290ZXIubm90aWNlMScsXG4gICdmb290ZXIubm90aWNlMicsXG4gICdmb290ZXIubm90aWNlMycsXG4gICdmb290ZXIucmVzY3VlQm9hcmQnLFxuICAnZm9vdGVyLmFuZCcsXG4gICdmb290ZXIubWluaXN0cnknLFxuICAnZm9vdGVyLnByaXZhY3knLFxuICAnZm9vdGVyLnRlcm1zJyxcbiAgJ2Zvb3Rlci5kYXRhU291cmNlJyxcbiAgJ2Zvb3Rlci5sYXN0SW1wb3J0JyxcbiAgJ2Zvb3Rlci5vZmZpY2lhbE9wZW5EYXRhJyxcbiAgJ2Zvb3Rlci5kYXRhU291cmNlVHJhbnNmb3JtZWQnLFxuXSBhcyBjb25zdDtcblxuLyoqIFRoZSBhbGxvd2xpc3Qg4oCUIHRoZSB1bmlvbiB0aGUgYmFja2VuZCBtaXJyb3JzLiBUaGUgYWRtaW4gVUkgcmVuZGVyc1xuICogIGZyb20gdGhlIGJsb2NrIG9yZGVyIGJlbG93OyB0aGUgc2VydmVyIGNoZWNrcyBtZW1iZXJzaGlwIGhlcmUuICovXG5leHBvcnQgY29uc3QgU0lURV9URVhUX0tFWVM6IHJlYWRvbmx5IFNpdGVUZXh0S2V5W10gPSBbXG4gIC4uLlNJVEVfVEVYVF9QT1BVUF9LRVlTLFxuICAuLi5TSVRFX1RFWFRfSEVBREVSX0tFWVMsXG4gIC4uLlNJVEVfVEVYVF9GT09URVJfS0VZUyxcbl07XG5cbi8qKiBUaGUgbGluayBrZXlzOiBMQUJFTCArIGh0dHBzLXZhbGlkYXRlZCBVUkwgcGFpcnMgKHRoZSBVUkwgaXMgc3RvcmVkXG4gKiAgcGVyIHJvdyBsaWtlIHRoZSBsYWJlbDsgdGhlIGFkbWluIFVJIG9mZmVycyBvbmUgVVJMIHBlciBsaW5rIGtleSB0aGF0XG4gKiAgaXMgd3JpdHRlbiB0byBhbGwgdGhyZWUgbG9jYWxlcykuICovXG5leHBvcnQgY29uc3QgU0lURV9URVhUX0xJTktfS0VZUzogcmVhZG9ubHkgU2l0ZVRleHRLZXlbXSA9IFtcbiAgJ2Zvb3Rlci5yZXNjdWVCb2FyZCcsXG4gICdmb290ZXIubWluaXN0cnknLFxuXSBhcyBjb25zdDtcblxuLyoqIFRoZSBzaGlwcGVkIGRlZmF1bHQgVVJMcyB0aGUgb3ZlcmxheSBmYWxscyBiYWNrIHRvIChwYWdlLXNoZWxsLmh0bWxcbiAqICB1c2VkIHRvIGhhcmRjb2RlIHRoZW0gaW4gdGhlIHRlbXBsYXRlKS4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NJVEVfVEVYVF9VUkxTOiBSZWFkb25seTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiA9IHtcbiAgJ2Zvb3Rlci5yZXNjdWVCb2FyZCc6ICdodHRwczovL3d3dy5ww6TDpHN0ZWFtZXQuZWUnLFxuICAnZm9vdGVyLm1pbmlzdHJ5JzogJ2h0dHBzOi8vd3d3LnNpc2VtaW5pc3RlZXJpdW0uZWUnLFxufTtcblxuLyoqIFRydWUgd2hlbiB0aGUga2V5IGNhcnJpZXMgYSBVUkwgKGxhYmVsICsgaHR0cHMgVVJMIHBhaXIpLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU2l0ZVRleHRMaW5rKGtleTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBTSVRFX1RFWFRfTElOS19LRVlTLnNvbWUoKGspID0+IGsgPT09IGtleSk7XG59XG5cbi8qKiBUaGUgYWRtaW4gVUkncyBibG9jayBvcmRlcjogUG9wdXAg4oaSIEhlYWRlciDihpIgRm9vdGVyLiAqL1xuZXhwb3J0IGludGVyZmFjZSBTaXRlVGV4dEJsb2NrIHtcbiAgLyoqIFN0YWJsZSBpZCBmb3IgdGhlIERPTS9BUklBOyB0aGUgaGVhZGluZyBpcyBhIGNhdGFsb2cga2V5IHJlbmRlcmVkXG4gICAqICBieSB0aGUgcGFuZWwgKHRoZSBibG9jayB0aXRsZXMgYXJlIE5PVCB0aGVtc2VsdmVzIGVkaXRhYmxlIOKAlCB0aGV5XG4gICAqICBhcmUgYWRtaW4gVUksIG5vdCBzaXRlIGNvcHkpLiAqL1xuICBpZDogJ3BvcHVwJyB8ICdoZWFkZXInIHwgJ2Zvb3Rlcic7XG4gIGhlYWRpbmdLZXk6IE1lc3NhZ2VLZXk7XG4gIGtleXM6IHJlYWRvbmx5IFNpdGVUZXh0S2V5W107XG59XG5cbmV4cG9ydCBjb25zdCBTSVRFX1RFWFRfQkxPQ0tTOiByZWFkb25seSBTaXRlVGV4dEJsb2NrW10gPSBbXG4gIHsgaWQ6ICdwb3B1cCcsIGhlYWRpbmdLZXk6ICdhMTF5LnBvcHVwLnRpdGxlJywga2V5czogU0lURV9URVhUX1BPUFVQX0tFWVMgfSxcbiAgeyBpZDogJ2hlYWRlcicsIGhlYWRpbmdLZXk6ICdhMTF5LmJ1dHRvbicsIGtleXM6IFNJVEVfVEVYVF9IRUFERVJfS0VZUyB9LFxuICB7IGlkOiAnZm9vdGVyJywgaGVhZGluZ0tleTogJ2Zvb3Rlci5ub3RpY2UyJywga2V5czogU0lURV9URVhUX0ZPT1RFUl9LRVlTIH0sXG5dO1xuIiwiaW1wb3J0IHsgaW5qZWN0LCBQaXBlLCBQaXBlVHJhbnNmb3JtIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgdHlwZSB7IE1lc3NhZ2VLZXkgfSBmcm9tICcuL21lc3NhZ2VzJztcbmltcG9ydCB7IEkxOG5TZXJ2aWNlIH0gZnJvbSAnLi9pMThuLnNlcnZpY2UnO1xuXG4vKipcbiAqIFRlbXBsYXRlIHRyYW5zbGF0aW9uIChpMThuLWV0LWVuKTogYHt7ICduYXYubWFwJyB8IHQgfX1gLlxuICpcbiAqIGBwdXJlOiBmYWxzZWAgb24gcHVycG9zZSDigJQgYSBsb2NhbGUgc3dpdGNoIG11c3QgcmUtcmVuZGVyIHRoZSBjaHJvbWUsXG4gKiBhbmQgdGhlIHBpcGUgcmUtZXZhbHVhdGVzIG9uIGV2ZXJ5IGNoYW5nZS1kZXRlY3Rpb24gcGFzcyBvZiBpdHNcbiAqIGNvbXBvbmVudCAoUGFnZVNoZWxsIHJlYWRzIHRoZSBgbG9jYWxlYCBzaWduYWwgaW4gaXRzIHRlbXBsYXRlLCBzbyBhXG4gKiBzd2l0Y2ggdHJpZ2dlcnMgZXhhY3RseSB0aGF0IHBhc3MpLiBUaGUgY2hyb21lIGlzIHRoZSBvbmx5IHBpcGVcbiAqIGNvbnN1bWVyLCBzbyB0aGUgcGVyLUNEIGV2YWx1YXRpb24gY29zdCBpcyBuZWdsaWdpYmxlLlxuICpcbiAqIExhenkgY2F0YWxvZ3MgKGJ1bmRsZS1sYXp5LWkxOG4pOiBgdCgpYCBORVZFUiByZXR1cm5zIGEgcmF3IGtleSBvclxuICogdW5kZWZpbmVkIOKAlCB3aGlsZSB0aGUgYWN0aXZlIGxvY2FsZSdzIGNhdGFsb2cgaXMgc3RpbGwgbG9hZGluZyBpdFxuICogc2VydmVzIHRoZSBERUZBVUxUIGxvY2FsZSdzIHZhbHVlIGZvciB0aGUga2V5ICh0aGUgYWNjZXB0ZWQgb25lLVxuICogbGFuZ3VhZ2UgZmxhc2gsIG5ldmVyIGFuIHVudHJhbnNsYXRlZCBrZXkgb24gc2NyZWVuKSwgYW5kIHRoZVxuICogSTE4blNlcnZpY2UgcnVucyBvbmUgY2hhbmdlLWRldGVjdGlvbiBwYXNzIChBcHBsaWNhdGlvblJlZi50aWNrKSB3aGVuXG4gKiB0aGUgY2h1bmsgYXJyaXZlcywgc28gdGhpcyBwaXBlIHJlLWV2YWx1YXRlcyBpbnRvIHRoZSBhY3RpdmUgbG9jYWxlJ3NcbiAqIHRleHQgd2l0aCBubyB0ZW1wbGF0ZSBjaGFuZ2UuXG4gKi9cbkBQaXBlKHsgbmFtZTogJ3QnLCBwdXJlOiBmYWxzZSB9KVxuZXhwb3J0IGNsYXNzIFRyYW5zbGF0ZVBpcGUgaW1wbGVtZW50cyBQaXBlVHJhbnNmb3JtIHtcbiAgcHJpdmF0ZSByZWFkb25seSBpMThuID0gaW5qZWN0KEkxOG5TZXJ2aWNlKTtcblxuICB0cmFuc2Zvcm0oa2V5OiBNZXNzYWdlS2V5LCBwYXJhbXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXI+KTogc3RyaW5nIHtcbiAgICBy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dUJBQXVCO0FBQUEsRUFDdkIsMEJBQTBCO0FBQUEsRUFDMUIsa0JBQWtCO0FBQUEsRUFDbEIsd0JBQXdCO0FBQUEsRUFDeEIsdUJBQXVCO0FBQUEsRUFDdkIsMkJBQTJCO0FBQUEsRUFDM0IsMkJBQTJCO0FBQUEsRUFDM0IseUJBQXlCO0FBQUEsRUFDekIsc0JBQXNCO0FBQUEsRUFDdEIsc0JBQXNCO0FBQUEsRUFDdEIsd0JBQXdCO0FBQUEsRUFDeEIsdUJBQXVCO0FBQUEsRUFDdkIsc0JBQXNCO0FBQUEsRUFDdEIsd0JBQXdCO0FBQUEsRUFDeEIsMEJBQTBCO0FBQUEsRUFDMUIscUJBQXFCO0FBQUEsRUFDckIscUJBQXFCO0FBQUEsRUFDckIsbUJBQW1CO0FBQUEsRUFDbkIsb0JBQW9CO0FBQUEsRUFDcEIsdUJBQXVCO0FBQUEsRUFDdkIsd0JBQXdCO0FBQUEsRUFDeEIseUJBQXlCO0FBQUEsRUFDekIscUJBQXFCO0FBQUEsRUFDckIsMkJBQTJCO0FBQUEsRUFDM0Isb0JBQW9CO0FBQUEsRUFDcEIsMkJBQTJCO0FBQUEsRUFDM0IsMEJBQTBCO0FBQUEsRUFDMUIsMEJBQTBCO0FBQUEsRUFDMUIseUJBQXlCO0FBQUEsRUFDekIsMkJBQTJCO0FBQUEsRUFDM0Isc0JBQXNCO0FBQUEsRUFDdEIscUJBQXFCO0FBQUEsRUFDckIsaUJBQWlCO0FBQUEsRUFDakIsMEJBQTBCO0FBQUEsRUFDMUIsaUNBQWlDO0FBQUEsRUFDakMsbUNBQW1DO0FBQUEsRUFDbkMsMkJBQTJCO0FBQUEsRUFDM0IsZ0RBQWdEO0FBQUEsRUFDaEQsd0NBQXdDO0FBQUEsRUFDeEMsNEJBQTRCO0FBQUEsRUFDNUIsNEJBQTRCO0FBQUEsRUFDNUIsd0JBQXdCO0FBQUEsRUFDeEIsdUJBQXVCO0FBQUEsRUFDdkIscUJBQXFCO0FBQUEsRUFDckIsdUJBQXVCO0FBQUEsRUFDdkIsaUJBQWlCO0FBQUEsRUFDakIsd0JBQXdCO0FBQUE7QUFBQSxFQUV4QiwwQkFBMEI7QUFBQSxFQUMxQiw0QkFBNEI7QUFBQSxFQUM1QiwyQkFBMkI7QUFBQSxF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NkJBQTZCO0FBQUEsRUFDN0IsNEJBQTRCO0FBQUEsRUFDNUIsa0NBQWtDO0FBQUEsRUFDbEMsd0NBQXdDO0FBQUEsRUFDeEMscUNBQXFDO0FBQUEsRUFFckMsK0JBQStCO0FBQUEsRUFDL0IscUNBQXFDO0FBQUEsRUFDckMsZ0NBQWdDO0FBQUEsRUFDaEMsOEJBQThCO0FBQUEsRUFDOUIsNkJBQTZCO0FBQUEsRUFDN0Isa0NBQWtDO0FBQUEsRUFDbEMsbUNBQW1DO0FBQUEsRUFDbkMsMEJBQTBCO0FBQUEsRUFDMUIsd0JBQXdCO0FBQUEsRUFDeEIsZ0NBQWdDO0FBQUEsRUFDaEMsaUNBQWlDO0FBQUEsRUFDakMsdUJBQXVCO0FBQUEsRUFDdkIsMkJBQTJCO0FBQUEsRUFDM0IsNkJBQTZCO0FBQUEsRUFDN0IsNkJBQTZCO0FBQUEsRUFDN0IsOEJBQThCO0FBQUEsRUFDOUIsZ0NBQWdDO0FBQUEsRUFDaEMsZ0NBQWdDO0FBQUEsRUFDaEMsOEJBQThCO0FBQUEsRUFDOUIsZ0NBQWdDO0FBQUEsRUFDaEMsZ0NBQWdDO0FBQUEsRUFDaEMsMEJBQTBCO0FBQUEsRUFDMUIsZ0NBQWdDO0FBQUEsRUFDaEMsdUJBQXVCO0FBQUEsRUFDdkIsNkJBQTZCO0FBQUEsRUFDN0IsbUNBQW1DO0FBQUEsRUFDbkMsa0NBQWtDO0FBQUEsRUFDbEMsdUNBQXVDO0FBQUEsRUFDdkMsdUJBQXVCO0FBQUEsRUFDdkIsMkJBQTJCO0FBQUEsRUFDM0IseUJBQXlCO0FBQUEsRUFDekIsaUNBQWlDO0FBQUEsRUFDakMsaUNBQWlDO0FBQUEsRUFDakMsdUNBQXVDO0FBQUEsRUFDdkMsMkJBQTJCO0FBQUEsRUFFM0Isa0NBQWtDO0FBQUEsRUFDbEMsZ0NBQWdDO0FBQUEsRUFDaEMsK0JBQStCO0FBQUEsRUFDL0IsOEJBQThCO0FBQUEsRUFDOUIsK0JBQStCO0FBQUEsRUFDL0Isc0NBQXNDO0FBQUEsRUFDdEMsNENBQTRDO0FBQUEsRUFDNUMseUNBQXlDO0FBQUEsRUFDekMsNEJBQTRCO0FBQUEsRUFDNUIsK0JBQStCO0FBQUEsRUFDL0Is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VUFBTSxXQUFXLEtBQUssWUFBWSxHQUFHO0FBQ3JDLFFBQUksYUFBYSxNQUFNO0FBQ3JCLGFBQU8sU0FBUztJQUNsQjtBQUNBLFNBQUssZUFBYztBQUNuQixVQUFNLFVBQVUsS0FBSyxpQkFBaUIsS0FBSyxPQUFNLENBQUU7QUFDbkQsUUFBSSxZQUFZLFFBQVc7QUFDekIsYUFBTyxRQUFRLEdBQUc7SUFDcEI7QUFDQSxXQUFPLEdBQUcsR0FBRztFQUNmOzs7O0VBS0EsVUFBVSxRQUFxQjtBQUM3QixTQUFLLE9BQU8sSUFBSSxNQUFNO0FBQ3RCLGFBQVMsZ0JBQWdCLE9BQU87QUFNaEMsU0FBSyxLQUFLLGNBQWMsTUFBTSxFQUFFLE1BQU0sTUFBSztJQUUzQyxDQUFDO0FBQ0QsUUFBSTtBQUNGLG1CQUFhLFFBQVEsWUFBWSxNQUFNO0lBQ3pDLFFBQVE7SUFHUjtFQUNGOzs7OztFQU1BLGlCQUFpQixRQUFxQjtBQUNwQyxTQUFLLGNBQWMsSUFBSSxNQUFNO0FBQzdCLFFBQUk7QUFDRixtQkFBYSxRQUFRLG9CQUFvQixNQUFNO0lBQ2pELFFBQVE7SUFHUjtFQUNGOztxQ0ExTlcsY0FBVztFQUFBOytFQUFYLGNBQVcsU0FBWCxhQUFXLFdBQUEsWUFERSxPQUFNLENBQUE7OzsrRUFDbkIsYUFBVyxDQUFBO1VBRHZCO1dBQVcsRUFBRSxZQUFZLE9BQU0sQ0FBRTs7O0FBZ09sQyxTQUFTLGVBQXNCO0FBQzdCLE1BQUk7QUFDRixVQUFNLFNBQVMsYUFBYSxRQUFRLFVBQVU7QUFDOUMsV0FBTyxRQUFRLFNBQVMsTUFBZ0IsSUFBSyxTQUFvQjtFQUNuRSxRQUFRO0FBQ04sV0FBTztFQUNUO0FBQ0Y7QUFLQSxTQUFTLG9CQUFvQixVQUF5QjtBQUNwRCxNQUFJO0FBQ0YsVUFBTSxTQUFTLGFBQWEsUUFBUSxrQkFBa0I7QUFDdEQsV0FBTyxRQUFRLFNBQVMsTUFBZ0IsSUFBSyxTQUFvQjtFQUNuRSxRQUFRO0FBQ04sV0FBTztFQUNUO0FBQ0Y7QUFJTSxTQUFVLFlBQVksVUFBa0IsUUFBZ0Q7QUFDNUYsU0FBTyxTQUFTLFFBQVEsY0FBYyxDQUFDLE9BQU8sU0FDNUMsUUFBUSxTQUFTLE9BQU8sT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLO0FBRWpEOzs7QUc5VkEsU0FBUyxVQUFBQSxTQUFRLFlBQTJCOztBQXNCdEMsSUFBTyxnQkFBUCxNQUFPLGVBQXNDO0VBQ2hDLE9BQU9DLFFBQU8sV0FBVztFQUUxQyxVQUFVLEtBQWlCLFFBQWlEO0FBQzFFLFdBQU8sS0FBSyxLQUFLLEVBQUUsS0FBSyxNQUFNO0VBQ2hDOztxQ0FMVyxnQkFBYTtFQUFBO29GQUFiLGdCQUFhLE1BQUEsTUFBQSxDQUFBOzs7Z0ZBQWIsZUFBYSxDQUFBO1VBRHpCO1dBQUssRUFBRSxNQUFNLEtBQUssTUFBTSxNQUFLLENBQUU7OzsiLCJuYW1lcyI6WyJpbmplY3QiLCJpbmplY3QiXSwiZGVidWdJZCI6IjdlYjEzYTM2LTlkMmMtNTdiYi05NmY4LWQ4OTQxN2FlNTllYyJ9