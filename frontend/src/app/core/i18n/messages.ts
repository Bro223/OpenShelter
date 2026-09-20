/**
 * The message catalog contract (i18n-et-en). Both locale
 * catalogs (`en.ts` / `et.ts`) are typed against this interface, so a key
 * missing from EITHER side is a compile error; the runtime key-parity
 * guard in `i18n.spec.ts` is the backstop (and rejects empty values).
 *
 * Key namespaces: `nav.*` header nav, `auth.*` session controls,
 * `footer.*` the app-wide footer, `title.*` route titles (consumed by
 * titleGuard via route data), the rest single chrome strings. The
 * interface also carries the feature-page copy (shelter trust copy, forms,
 * errors).
 */
export interface Messages {
  // --- header: burger + nav
  /** Burger button aria-label. */
  'menu.aria': string;
  'nav.map': string;
  'nav.guidance': string;
  'nav.account': string;
  'nav.admin': string;
  /** Skip-to-content link, the shell's first element. */
  'nav.skip': string;

  // --- header: actions
  /** The Accessibility button (replaces the high-contrast toggle): it
   *  opens the accessibility dialog with the three contrast options.
   *  Admin-editable (site_texts header block). */
  'a11y.button': string;
  /** Language switcher group aria-label. Admin-editable (site_texts header
   *  block). */
  'lang.label': string;
  'auth.logout': string;
  'auth.login': string;
  'auth.register': string;

  // --- accessibility dialog (accessibility-dialog): the three contrast
  // options. Every string below is admin-editable through site_texts —
  // these catalog values are the shipped defaults the overlay falls back
  // to when no override row exists (see site-texts.ts). The popup block is
  // title + body + the three option labels/descriptions + footer note +
  // close button.
  'a11y.popup.title': string;
  'a11y.popup.body': string;
  'a11y.option.default': string;
  'a11y.option.default.desc': string;
  'a11y.option.highContrast': string;
  'a11y.option.highContrast.desc': string;
  'a11y.option.blackYellow': string;
  'a11y.option.blackYellow.desc': string;
  'a11y.popup.footer': string;
  'a11y.popup.close': string;

  // --- footer: safety notice (segmented around the official-source links)
  'footer.notice1': string;
  'footer.notice2': string;
  'footer.notice3': string;
  /** Link label → www.päästeamet.ee. */
  'footer.rescueBoard': string;
  'footer.and': string;
  /** Link label → www.siseministeerium.ee (publisher of the shelter dataset). */
  'footer.ministry': string;
  /** Attribution: the imported coordinates are transformed, so the UI says so. */
  'footer.dataSourceTransformed': string;
  // --- footer: legal links
  'footer.privacy': string;
  'footer.terms': string;
  // --- footer: data provenance line (official-dataset-csv)
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
  'title.guidance': string;
  'title.guidanceDetail': string;

  // --- consent banner (first-level data-usage notice)
  /** Accessible name of the consent banner region. */
  'consent.aria': string;
  'consent.title': string;
  'consent.body': string;
  'consent.acknowledge': string;
  'consent.privacyLink': string;

  // --- "How OpenShelter works" block (map page)
  'how.title': string;
  'how.what': string;
  'how.sources': string;
  'how.report': string;
  'how.nearest': string;
  'how.guarantee': string;
  'how.exampleTitle': string;
  'how.example.1': string;
  'how.example.2': string;
  'how.example.3': string;
  'how.example.4': string;
  'how.example.5': string;

  // --- auth pages (login / register / reset)
  'authPage.login.title': string;
  'authPage.login.subtitle': string;
  'authPage.login.sessionExpired': string;
  'authPage.login.resetOk': string;
  'authPage.login.contactLabel': string;
  'authPage.login.contactPlaceholder': string;
  'authPage.login.contactRequired': string;
  'authPage.login.passwordLabel': string;
  'authPage.login.passwordRequired': string;
  'authPage.login.submitting': string;
  'authPage.login.submit': string;
  'authPage.login.forgot': string;
  'authPage.login.noAccount': string;
  'authPage.login.createOne': string;

  'authPage.register.title': string;
  'authPage.register.subtitle': string;
  'authPage.register.createdTitle': string;
  'authPage.register.createdBody': string;
  'authPage.register.nameLabel': string;
  'authPage.register.nameRequired': string;
  'authPage.register.emailLabel': string;
  'authPage.register.emailPlaceholder': string;
  'authPage.register.emailNote': string;
  'authPage.register.emailRequired': string;
  'authPage.register.phoneLabel': string;
  'authPage.register.phonePlaceholder': string;
  'authPage.register.phoneNote': string;
  'authPage.register.phoneRequired': string;
  'authPage.register.passwordLabel': string;
  'authPage.register.passwordRequired': string;
  'authPage.register.submitting': string;
  'authPage.register.submit': string;
  'authPage.register.agreeLead': string;
  'authPage.register.agreeTerms': string;
  'authPage.register.agreeAnd': string;
  'authPage.register.agreePrivacy': string;
  'authPage.register.agreeTail': string;
  'authPage.register.haveAccount': string;

  'authPage.reset.title': string;
  'authPage.reset.subtitle': string;
  'authPage.reset.emailLabel': string;
  'authPage.reset.emailPlaceholder': string;
  'authPage.reset.emailRequired': string;
  'authPage.reset.sending': string;
  /** {time} is the resend-countdown label ("45s", "1m 00s"). */
  'authPage.reset.sendIn': string;
  'authPage.reset.send': string;
  'authPage.reset.sentTitle': string;
  'authPage.reset.sentBody': string;
  'authPage.reset.codeLabel': string;
  'authPage.reset.codePlaceholder': string;
  'authPage.reset.codeRequired': string;
  'authPage.reset.codeNote': string;
  'authPage.reset.newPasswordLabel': string;
  'authPage.reset.newPasswordRequired': string;
  /** The length-rule field error (mirrors the server's @Size(min = 8)).
   *  The register page has no length rule, so there was no existing copy
   *  to reuse — plain equivalent of "Password must be at least 8
   *  characters." (the reset-page spec pins this EN wording). */
  'authPage.reset.newPasswordTooShort': string;
  'authPage.reset.repeatLabel': string;
  'authPage.reset.repeatRequired': string;
  'authPage.reset.mismatch': string;
  'authPage.reset.updating': string;
  'authPage.reset.update': string;
  /** {time} is the resend-countdown label ("45s", "1m 00s"). */
  'authPage.reset.resendIn': string;
  'authPage.reset.resend': string;
  'authPage.reset.backToLogin': string;

  // --- auth pages: title-case link labels (footer.* stays sentence case)
  'authPage.privacyPolicy': string;
  'authPage.termsOfUse': string;

  // --- map page (i18n-et-en: the browse surface). The around-you CTA IS
  // keyed (map.aroundYou) — the how.nearest / map.geocode copy quotes the
  // ACTIVE LOCALE'S label, so the quote stays true in every language.
  'map.title': string;
  'map.subtitle': string;
  'map.legend.registry': string;
  'map.legend.new': string;
  'map.legend.confirmed': string;
  'map.legend.reported': string;
  'map.geoNote': string;
  /** The around-you CTA label (the map's only geolocation trigger); the
   *  how.nearest + map.geocode copy quote this label, locale for locale. */
  'map.aroundYou': string;
  /** The CTA's in-flight state while geolocation is resolving. */
  'map.locating': string;
  'map.anchorLabel': string;
  'map.anchorPlaceholder': string;
  'map.search': string;
  'map.searching': string;
  'map.attributionLead': string;
  'map.osmAttribution': string;
  'map.addShelter': string;
  'map.nearestEmpty': string;
  'map.nearestEmpty.addFirst': string;
  'map.searched': string;
  'map.clear': string;
  'map.filter.all': string;
  'map.filter.registry': string;
  'map.filter.user': string;
  /** The filter-chips group aria-label. */
  'map.filterSourcesAria': string;
  'map.chipOpen': string;
  'map.chipHasCapacity': string;
  'map.emptyFilter': string;
  'map.loading': string;
  'map.viewDetails': string;
  /** {shelter-name} is appended by the template (accessible name only). */
  'map.viewDetailsFor': string;
  'map.nearest.denied': string;
  'map.nearest.timeout': string;
  'map.nearest.unsupported': string;
  'map.nearest.unavailable': string;
  'map.nearest.insecure': string;
  'map.geocode.noResults': string;
  'map.geocode.rateLimited': string;
  'map.geocode.network': string;

  // --- shelter detail page (i18n-et-en). The Distance-from-you action (its
  // button + DISTANCE_COPY) and the Status/Capacity data labels stay English.
  'detail.backToMap': string;
  'detail.notFoundTitle': string;
  'detail.notFoundBody': string;
  'detail.locationHeading': string;
  /** The initial load state. */
  'detail.loading': string;
  /** The straight-line distance line; `{distance}` is the shared
   *  straightLineText() format ("≈ 1.1 km straight line"). */
  'detail.distance.fromYou': string;
  'detail.detailsHeading': string;
  'detail.infoHeading': string;
  'detail.reportOccupancy': string;
  'detail.reportOpen': string;
  'detail.reportThis': string;
  'detail.navigate': string;
  'detail.appleMaps': string;
  'detail.occupancy.aria': string;
  'detail.band.space': string;
  'detail.band.gettingFull': string;
  'detail.band.full': string;
  'detail.verify.occupancy': string;
  'detail.login.occupancy': string;
  'detail.openStatus.aria': string;
  'detail.openState.open': string;
  'detail.openState.closed': string;
  'detail.verify.open': string;
  'detail.login.open': string;
  'detail.report': string;
  'detail.reportType.aria': string;
  'detail.reportType.nonExistent': string;
  'detail.reportType.wrongLocation': string;
  'detail.reportType.other': string;
  'detail.reportDetailPlaceholder.wrongLocation': string;
  'detail.reportDetailPlaceholder.other': string;
  'detail.reportDetailLabel': string;
  'detail.reportDetailError': string;
  'detail.verify.report': string;
  'detail.login.report': string;
  'detail.submitting': string;
  'detail.submitReport': string;
  'detail.cancel': string;
  'detail.verifyAccount': string;

  // --- community pulse (M9 — report aggregation UI): the gauge end labels
  // double as the recent-log kind labels (one set of short state nouns),
  // the log entry line ("a community member reported: {kind}" — privacy:
  // never who) and the count/empty-state copy. {open}/{closed}/
  // {space}/{gettingFull}/{full} are the plain fresh counts; the gauge
  // needle's position is the SERVER-weighted share, not these counts.
  'detail.pulse.kind.open': string;
  'detail.pulse.kind.closed': string;
  'detail.pulse.kind.space': string;
  'detail.pulse.kind.gettingFull': string;
  'detail.pulse.kind.full': string;
  /** {kind} is the localized state noun (a detail.pulse.kind.* value). */
  'detail.pulse.recentEntry': string;
  /** The recent-reports section heading (the merged fresh log). */
  'detail.pulse.recent': string;
  'detail.pulse.recentEmpty': string;
  /** The open/closed gauge's explicit empty state (no fresh taps — the
   *  gauge renders NO neutral arrow without data). */
  'detail.pulse.emptyOpen': string;
  /** The how-full gauge's explicit empty state (no fresh bands). */
  'detail.pulse.emptyOccupancy': string;
  /** The open/closed gauge's visible + accessible count line (the angle is
   *  never the only carrier of meaning). {open}/{closed} are the plain
   *  fresh counts. */
  'detail.pulse.openClosedText': string;
  /** The how-full gauge's visible + accessible count line. {space}/
   *  {gettingFull}/{full} are the plain fresh counts. */
  'detail.pulse.occupancyText': string;

  // --- submit shelter page (i18n-et-en: the contribute surface).
  'submit.backToMap': string;
  'submit.title': string;
  'submit.subtitle': string;
  'submit.successBody': string;
  'submit.success.viewLocation': string;
  'submit.success.viewContributions': string;
  'submit.verifyHint': string;
  'submit.verifyHint.link': string;
  'submit.nameLabel': string;
  'submit.namePlaceholder': string;
  'submit.name.required': string;
  'submit.name.tooLong': string;
  'submit.descriptionLabel': string;
  'submit.descriptionPlaceholder': string;
  'submit.description.tooLong': string;
  /** The label WITHOUT the range — the range lives in submit.capacityHint
   *  (a separate line) so a narrow column cannot break it mid-range. */
  'submit.capacityLabel': string;
  /** The capacity range, its own hint line under the label. */
  'submit.capacityHint': string;
  'submit.capacityPlaceholder': string;
  'submit.capacity.invalid': string;
  'submit.privateLabel': string;
  'submit.locationLegend': string;
  'submit.locationNote': string;
  'submit.locationLabel': string;
  'submit.locationPlaceholder': string;
  'submit.location.set': string;
  'submit.location.resolving': string;
  'submit.location.prefillNote': string;
  'submit.addressLabel': string;
  'submit.addressPlaceholder': string;
  'submit.search': string;
  'submit.searching': string;
  'submit.attributionLead': string;
  'submit.osmAttribution': string;
  'submit.useMyLocation': string;
  'submit.locating': string;
  'submit.location.empty': string;
  'submit.submit': string;
  'submit.submitting': string;
  /** Prefix of the source hint, spliced with the resolved source label. */
  'submit.hint.from': string;
  'submit.hint.source.typed': string;
  'submit.hint.source.link': string;
  'submit.hint.source.geolocation': string;
  'submit.hint.source.map': string;
  'submit.hint.source.address': string;
  'submit.hint.swapped': string;
  /** {m} is the rounded geolocation accuracy in metres. */
  'submit.hint.accuracy': string;
  'submit.loc.missing': string;
  'submit.loc.noPair': string;
  'submit.loc.outOfBounds': string;
  'submit.loc.invalid': string;
  'submit.loc.decimalComma': string;
  'submit.loc.geoDenied': string;
  'submit.loc.geoUnavailable': string;
  'submit.loc.geoTimeout': string;
  'submit.loc.geoInsecure': string;
  'submit.loc.shortLinkFailed': string;
  'submit.loc.shortLinkRateLimited': string;
  'submit.loc.shortLinkUnavailable': string;
  'submit.geocode.noResults': string;
  'submit.geocode.rateLimited': string;
  'submit.geocode.network': string;

  // --- error banners (shared error mapping, i18n-aware seam): the
  // client-authored banner copy that bannerMessage() serves through the
  // optional translate callback. Server-provided messages (ApiError.message)
  // are echoed as-is and are NOT catalog keys.
  'error.rateLimited': string;
  'error.unauthorized': string;
  'error.checkInput': string;
  'error.serverError': string;
  'error.valueInUse': string;
  'error.verifyRateLimited': string;
  'error.verifyBadCode': string;
  'error.accountRateLimited': string;
  'error.accountBadCode': string;

  // --- account page (/account, AuthGuard): identity, contacts, the
  // cross-channel change flows, your data, delete + legal links.
  'account.subtitle': string;
  'account.profileLoadError': string;
  'account.retrying': string;
  'account.retry': string;
  'account.identity': string;
  'account.name': string;
  'account.adminBadge': string;
  'account.identityCopy': string;
  'account.edit': string;
  'account.currentPassword': string;
  'account.nameRequired': string;
  'account.passwordRequired': string;
  'account.saving': string;
  'account.save': string;
  'account.cancel': string;
  'account.contacts': string;
  'account.emailLabel': string;
  'account.phoneLabel': string;
  'account.verified': string;
  'account.completeVerification': string;
  'account.changeEmail': string;
  /** Spliced around the <strong>{{ email }}</strong> segment. */
  'account.emailDone.before': string;
  'account.emailDone.after': string;
  'account.changeAgain': string;
  'account.newEmail': string;
  /** An email example — ASCII, locale-invariant (identity allow-list). */
  'account.newEmailPlaceholder': string;
  'account.emailTooLong': string;
  'account.emailRequired': string;
  'account.emailProof': string;
  'account.smsCode': string;
  'account.codePlaceholder': string;
  'account.smsCodeRequired': string;
  'account.smsSentHint': string;
  'account.working': string;
  'account.confirmNewEmail': string;
  /** {time} is the resend-countdown label ("45s", "1m 00s"). */
  'account.resendIn': string;
  'account.resendCode': string;
  'account.sending': string;
  /** {time} is the resend-countdown label ("45s", "1m 00s"). */
  'account.sendIn': string;
  'account.sendSmsToPhone': string;
  'account.changePhone': string;
  /** Spliced around the <strong>{{ phone }}</strong> segment. */
  'account.phoneDone.before': string;
  'account.phoneDone.after': string;
  'account.newPhone': string;
  'account.newPhonePlaceholder': string;
  'account.phoneTooLong': string;
  'account.phoneRequired': string;
  'account.phoneProof': string;
  'account.emailCode': string;
  'account.emailCodeRequired': string;
  'account.emailCodeSentHint': string;
  'account.confirmNewPhone': string;
  'account.sendEmailCode': string;
  'account.contributions': string;
  'account.contributionsCopy': string;
  'account.yourData': string;
  'account.dataCopy': string;
  'account.preparing': string;
  'account.downloadData': string;
  'account.deleting': string;
  'account.delete': string;
  /** The admin (env-provisioned) variant: why the delete controls are absent. */
  'account.delete.adminCopy': string;
  'account.delete.copy': string;
  /** Names the literal word the user must type to arm the delete. */
  'account.delete.typeHint': string;
  'account.delete.armed': string;
  'account.delete.button': string;
  'account.legal': string;
  /** Spliced around the two legal links (the authPage.privacyPolicy /
   *  termsOfUse labels are reused for the link text). */
  'account.legal.lead': string;
  'account.legal.and': string;
  /** Punctuation-only splice segment (identity allow-list). */
  'account.legal.tail': string;
  'account.success.profileUpdated': string;
  'account.success.emailChanged': string;
  'account.success.phoneChanged': string;
  'account.success.exportDownloaded': string;
  /** Request-phase 400 ("same as current value") — the page's dedicated copy. */
  'account.error.sameValue': string;

  // --- account: contributions panel (the caller's own shelters).
  'account.contrib.shelters': string;
  'account.contrib.loading': string;
  'account.contrib.empty': string;
  'account.contrib.emptyCta': string;
  'account.contrib.submit': string;
  /** Panel-local badge labels (the shared shelter-copy labels are NOT
   *  catalog keys — this panel renders its own translated set). */
  'account.contrib.source.paasteamet': string;
  'account.contrib.source.municipality': string;
  'account.contrib.badge.new': string;
  'account.contrib.badge.confirmed': string;
  'account.contrib.badge.rejected': string;
  'account.contrib.infoRequest': string;
  /** {note} is the moderator's stored note. */
  'account.contrib.adminNote': string;
  'account.contrib.inaccurate': string;
  /** {count} is the localized report-count phrase ("1 report", "5 reports"). */
  'account.contrib.hidden': string;
  'account.contrib.view': string;
  'account.contrib.info': string;
  'account.contrib.infoClose': string;
  'account.contrib.delete': string;
  'account.contrib.deleteConfirm': string;
  'account.contrib.deleteConfirmButton': string;
  'account.contrib.nameLabel': string;
  'account.contrib.nameRequired': string;
  'account.contrib.descriptionLabel': string;
  'account.contrib.descriptionTooLong': string;
  'account.contrib.latitudeLabel': string;
  'account.contrib.latitudeError': string;
  'account.contrib.longitudeLabel': string;
  'account.contrib.longitudeError': string;
  'account.contrib.estoniaNote': string;
  'account.contrib.infoQuestion': string;
  'account.contrib.replyLabel': string;
  'account.contrib.replyRequired': string;
  'account.contrib.sendReply': string;
  'account.contrib.reply': string;

  // --- verify page (/verify, AuthGuard): the per-channel proof flows.
  'verify.title': string;
  'verify.subtitle': string;
  /** Accessible name of the level-chip list. */
  'verify.aria': string;
  'verify.verified': string;
  'verify.notVerified': string;
  /** {destination} is the case-fitted channel destination (per-channel key). */
  'verify.intro': string;
  'verify.email.title': string;
  'verify.email.destination': string;
  'verify.email.noun': string;
  'verify.email.send': string;
  'verify.email.sentHint': string;
  'verify.email.codeLabel': string;
  'verify.email.codeHint': string;
  'verify.email.placeholder': string;
  'verify.phone.title': string;
  'verify.phone.destination': string;
  'verify.phone.noun': string;
  'verify.phone.send': string;
  'verify.phone.sentHint': string;
  'verify.phone.codeLabel': string;
  'verify.phone.codeHint': string;
  'verify.phone.placeholder': string;
  'verify.verifying': string;
  'verify.verify': string;
  'verify.fullyVerified': string;
  'verify.fullyVerifiedCopy': string;
  'verify.verifiedCopy': string;
  'verify.continue': string;
  'verify.manageAccount': string;
  'verify.backToMap': string;
  /** {noun} is the channel's localized noun (per-channel key). */
  'verify.alreadyVerified': string;
  'verify.verifiedNotice': string;

  // --- crisis guidance (/blog — crisis-guidance D4/D6). The post title and
  // body are admin copy (rendered verbatim), never catalog keys.
  'guidance.title': string;
  'guidance.subtitle': string;
  'guidance.loading': string;
  'guidance.loadingDetail': string;
  'guidance.empty': string;
  'guidance.backToList': string;
  'guidance.notFoundTitle': string;
  'guidance.notFoundBody': string;
  /** The date-line label in front of the locale-aware publication date. */
  'guidance.published': string;

  // --- admin: guidance tab + editor + media library (crisis-guidance D8).
  // The admin surface is i18n'd from the guidance tabs on: every string
  // below runs through the `t` pipe; post TITLES/BODIES are admin copy
  // (rendered verbatim), never catalog keys.
  /** The shared Retry button on a failed tab load. */
  'admin.retry': string;

  // guidance tab: the post list (title, status, locale, pinned, published
  // date — from the public index merge, the admin DTO has no publishedAt —
  // updated) and the row actions.
  /** The Settings tab (site_texts admin UI: the popup/header/footer text
   *  blocks, each field in the three locales). */
  'admin.settings.tab': string;

  // moderation-queue tabs (pre-guidance): the page shell + the five queue
  // surfaces. The tabs group its aria-label, the shared working/cancel
  // action copy, and the per-tab loading/empty states, table columns and
  // row actions.
  /** The subtitle under the page H1. */
  'admin.subtitle': string;
  /** The tab switcher group aria-label. */
  'admin.tabs.aria': string;
  'admin.tabs.unconfirmed': string;
  'admin.tabs.shelters': string;
  'admin.tabs.reports': string;
  'admin.tabs.alerts': string;
  'admin.tabs.users': string;
  'admin.tabs.audit': string;
  /** Shared busy state while a queue action is in flight. */
  'admin.working': string;
  /** Shared cancel for the inline editors and two-tap confirms. */
  'admin.cancel': string;

  // unconfirmed queue (the community review queue, first tab).
  'admin.unconfirmed.loading': string;
  'admin.unconfirmed.empty': string;
  /** The queue table region aria-label. */
  'admin.unconfirmed.aria': string;
  'admin.unconfirmed.col.name': string;
  'admin.unconfirmed.col.address': string;
  'admin.unconfirmed.col.submitter': string;
  'admin.unconfirmed.col.actions': string;
  'admin.unconfirmed.confirm': string;
  'admin.unconfirmed.reject': string;
  'admin.unconfirmed.reject.label': string;
  'admin.unconfirmed.reject.placeholder': string;
  /** The inline validation line; `{max}` is the character cap. */
  'admin.unconfirmed.reject.required': string;

  // shelters tab: the search box, the queue table and the row actions
  // (history/info/inaccuracy toggles, hide/activate, two-tap delete).
  'admin.shelters.search.label': string;
  'admin.shelters.search.placeholder': string;
  'admin.shelters.search.button': string;
  'admin.shelters.loading': string;
  'admin.shelters.empty': string;
  /** The table region aria-label. */
  'admin.shelters.aria': string;
  'admin.shelters.col.name': string;
  'admin.shelters.col.source': string;
  'admin.shelters.col.status': string;
  'admin.shelters.col.reports': string;
  'admin.shelters.col.occupancy': string;
  'admin.shelters.col.submitter': string;
  'admin.shelters.col.actions': string;
  /** The muted hint on registry (import-owned) rows. */
  'admin.shelters.source.registry': string;
  'admin.shelters.status.hidden': string;
  'admin.shelters.status.active': string;
  'admin.shelters.history': string;
  'admin.shelters.history.close': string;
  'admin.shelters.info': string;
  'admin.shelters.info.close': string;
  'admin.shelters.inaccurate.clear': string;
  'admin.shelters.inaccurate.mark': string;
  'admin.shelters.inaccurate.markClose': string;
  'admin.shelters.hide': string;
  'admin.shelters.activate': string;
  'admin.shelters.delete': string;
  /** The two-tap armed prompt. */
  'admin.shelters.delete.confirm': string;
  'admin.shelters.delete.working': string;
  'admin.shelters.delete.confirmButton': string;
  /** The muted hint on registry rows (no actions). */
  'admin.shelters.readOnly': string;

  // the shelters-tab inline panels: the edit-history list, the
  // moderator→submitter info request (question editor + read-only
  // exchange) and the mark-inaccurate reason editor.
  'admin.shelters.history.loading': string;
  'admin.shelters.history.empty': string;
  'admin.shelters.info.request': string;
  'admin.shelters.info.answer': string;
  'admin.shelters.info.waiting': string;
  'admin.shelters.info.question.label': string;
  'admin.shelters.info.question.placeholder': string;
  /** The inline validation line; `{max}` is the character cap. */
  'admin.shelters.info.question.required': string;
  'admin.shelters.info.send': string;
  'admin.shelters.info.sending': string;
  'admin.shelters.inaccurate.reason.label': string;
  'admin.shelters.inaccurate.reason.placeholder': string;
  /** The inline length line; `{max}` is the character cap. */
  'admin.shelters.inaccurate.reason.max': string;
  'admin.shelters.inaccurate.marking': string;

  // shelter-reports tab: the report queue rows (dismiss, restore a
  // hidden shelter) and the dampened/dismissed badges.
  'admin.reports.loading': string;
  'admin.reports.empty': string;
  'admin.reports.dismissed': string;
  'admin.reports.dampened': string;
  'admin.reports.restore': string;
  'admin.reports.dismiss': string;

  // alerts tab: the M3 abuse-limits queue.
  'admin.alerts.loading': string;
  'admin.alerts.empty': string;
  /** The table region aria-label. */
  'admin.alerts.aria': string;
  'admin.alerts.col.when': string;
  'admin.alerts.col.type': string;
  'admin.alerts.col.subject': string;
  'admin.alerts.col.detail': string;
  'admin.alerts.col.retryAfter': string;

  // users tab: the accounts table and the suspend/unsuspend two-tap
  // confirm (the ADMIN kind is listed but not suspendable).
  'admin.users.loading': string;
  'admin.users.empty': string;
  /** The table region aria-label. */
  'admin.users.aria': string;
  'admin.users.col.name': string;
  'admin.users.col.email': string;
  'admin.users.col.kind': string;
  'admin.users.col.status': string;
  'admin.users.col.actions': string;
  'admin.users.suspended': string;
  'admin.users.active': string;
  /** The armed two-tap prompt (suspend). */
  'admin.users.suspend.confirm': string;
  /** The armed two-tap prompt (unsuspend). */
  'admin.users.unsuspend.confirm': string;
  'admin.users.suspend.confirmButton': string;
  'admin.users.unsuspend.confirmButton': string;
  'admin.users.suspend': string;
  'admin.users.unsuspend': string;
  'admin.users.notSuspendable': string;

  // audit tab: the moderation trail.
  'admin.audit.loading': string;
  'admin.audit.empty': string;
  /** The table region aria-label. */
  'admin.audit.aria': string;
  'admin.audit.col.when': string;
  'admin.audit.col.moderator': string;
  'admin.audit.col.subject': string;
  'admin.audit.col.action': string;
  'admin.audit.col.change': string;
  'admin.audit.col.reason': string;

  // settings tab: the site_texts panel (its own load/save state lives in
  // the panel component, which reads these through i18n.t).
  'admin.siteTexts.loading': string;
  /** The hint sentence, split around the literal <code>https://</code>.
   *  hint1 ends with the trailing space before the code. */
  'admin.siteTexts.hint1': string;
  /** The hint tail, leading space included (after the code). */
  'admin.siteTexts.hint2': string;
  'admin.siteTexts.linkLabel': string;
  'admin.siteTexts.saving': string;
  'admin.siteTexts.save': string;
  'admin.siteTexts.loadError': string;
  'admin.siteTexts.urlError': string;
  'admin.siteTexts.noChanges': string;
  'admin.siteTexts.saved': string;
  'admin.siteTexts.saveFailed': string;
  /** `{message}` is the server/transport error text. */
  'admin.siteTexts.saveFailedWith': string;

  'admin.guidance.tab': string;
  'admin.guidance.loading': string;
  'admin.guidance.empty': string;
  /** The scoped empty state (admin-locale-scope): no posts have content in
   *  the active UI language. `{locale}` is the language code. */
  'admin.guidance.emptyLocale': string;
  /** The scoped list's language line (admin-locale-scope): the posts shown
   *  are the active UI language's. `{locale}` is the language code. */
  'admin.guidance.shownIn': string;
  /** The content-language select's label (the Guidance tab): the language
   *  of the listed/edited posts. */
  'admin.guidance.language.label': string;
  /** The hint under the content-language select. */
  'admin.guidance.language.hint': string;
  'admin.guidance.create': string;
  'admin.guidance.col.title': string;
  'admin.guidance.col.position': string;
  'admin.guidance.col.status': string;
  'admin.guidance.col.locale': string;
  'admin.guidance.col.pinned': string;
  'admin.guidance.col.published': string;
  'admin.guidance.col.updated': string;
  'admin.guidance.col.actions': string;
  // Manual ordering (guidance-manual-order D6): the hint above the list
  // and the per-row move buttons (visible labels + the accessible names
  // that name the post and the direction — a screen reader announces
  // "Move {post} to the top").
  'admin.guidance.order.hint': string;
  'admin.guidance.move.top': string;
  'admin.guidance.move.up': string;
  'admin.guidance.move.down': string;
  'admin.guidance.move.top.aria': string;
  'admin.guidance.move.up.aria': string;
  'admin.guidance.move.down.aria': string;
  /** The list badge: the draft's consequence, not just the state name
   *  (a draft is not public until published). */
  'admin.guidance.status.draft': string;
  'admin.guidance.status.published': string;
  'admin.guidance.pinned.yes': string;
  'admin.guidance.pinned.no': string;
  'admin.guidance.edit': string;
  'admin.guidance.publish': string;
  'admin.guidance.unpublish': string;
  'admin.guidance.delete': string;
  /** The two-tap confirm strip prompt (the image-stays note is honest
   * copy: the delete never touches the media library). */
  'admin.guidance.delete.confirm': string;
  'admin.guidance.delete.confirmButton': string;
  'admin.guidance.delete.cancel': string;
  /** The shared in-flight button copy on this tab's row actions. */
  'admin.guidance.working': string;
  'admin.guidance.success.created': string;
  'admin.guidance.success.updated': string;
  'admin.guidance.success.published': string;
  'admin.guidance.success.unpublished': string;
  'admin.guidance.success.deleted': string;
  'admin.guidance.success.reordered': string;

  // guidance editor (the create/edit form). The body is a plain textarea
  // over the stored (sanitized) HTML — no WYSIWYG (crisis-guidance D9 is
  // defence-in-depth on the server sanitizer).
  'admin.guidance.editor.createTitle': string;
  'admin.guidance.editor.editTitle': string;
  'admin.guidance.editor.loading': string;
  'admin.guidance.editor.titleLabel': string;
  'admin.guidance.editor.titleRequired': string;
  'admin.guidance.editor.titleTooLong': string;
  'admin.guidance.editor.slugLabel': string;
  /** Create mode: a blank slug is derived from the title server-side. */
  'admin.guidance.editor.slugHint.create': string;
  /** Edit mode: a blank slug KEEPS the current one (server rule). */
  'admin.guidance.editor.slugHint.edit': string;
  /** The generated-slug shape, enforced up front (server 400 otherwise). */
  'admin.guidance.editor.slugInvalid': string;
  'admin.guidance.editor.bodyLabel': string;
  /** The sanitizer allowlist, stated where the admin types it: the
   *  toolbar is the feature set (no H1 — the page owns the single h1 —
   *  no inline images — hero-only), and pasted text is plain. */
  'admin.guidance.editor.bodyHint': string;
  'admin.guidance.editor.bodyRequired': string;
  /** The link URL prompt (names the allowed protocols). */
  'admin.guidance.editor.link.prompt': string;
  /** A refused link protocol (javascript:/data:/relative): names the
   *  rule; nothing is inserted. */
  'admin.guidance.editor.link.invalid': string;
  /** A link with no selected text. */
  'admin.guidance.editor.link.noSelection': string;
  'admin.guidance.editor.heroLabel': string;
  /** The selected hero's caption (above its thumbnail). */
  'admin.guidance.editor.hero.current': string;
  'admin.guidance.editor.hero.choose': string;
  'admin.guidance.editor.hero.loading': string;
  /** The picker's empty state (points at the Media library tab). */
  'admin.guidance.editor.hero.empty': string;
  'admin.guidance.editor.hero.remove': string;
  /** The hero picker's upload control (the backend accepts exactly these
   *  three types, magic-byte checked). */
  'admin.guidance.editor.hero.uploadLabel': string;
  /** 413 from the upload: over the server's size cap (names the cap). */
  'admin.guidance.editor.hero.uploadError.tooLarge': string;
  /** 400 from the upload: unsupported type / declared-type mismatch. */
  'admin.guidance.editor.hero.uploadError.unsupported': string;
  /** Any other upload failure (5xx, network): the generic retry copy. */
  'admin.guidance.editor.hero.uploadError.generic': string;
  /** The alt's label; the cross-field rule (mandatory iff a hero is set)
   *  is enforced in the UI with the two errors below, mirroring the
   *  server's 400 so a pointless round trip never happens. */
  'admin.guidance.editor.altLabel': string;
  'admin.guidance.editor.altRequired': string;
  'admin.guidance.editor.altForbidden': string;
  'admin.guidance.editor.altTooLong': string;
  'admin.guidance.editor.localeLabel': string;
  'admin.guidance.editor.localeHint': string;
  'admin.guidance.editor.localeTooLong': string;
  /** The editor's language line, edit mode (admin-locale-scope): which
   *  language's content the form edits. `{locale}` is the content locale. */
  'admin.guidance.editor.editingIn': string;
  /** The editor's language line, create mode (admin-locale-scope): the
   *  language the post will be created in. `{locale}` is the active UI
   *  language code. */
  'admin.guidance.editor.creatingIn': string;
  /** Shown only when the form edits a FOREIGN-locale row (admin-locale-
   *  scope): the post's home language and the single-language effect of a
   *  save. `{home}` the home locale, `{locale}` the content locale. */
  'admin.guidance.editor.homeLocaleNote': string;
  'admin.guidance.editor.pinnedLabel': string;
  /** Create mode only: the one-shot write-and-publish choice. */
  'admin.guidance.editor.statusLabel': string;
  'admin.guidance.editor.status.draft': string;
  'admin.guidance.editor.status.publish': string;
  /** Edit mode: the publication state is owned by the row actions. */
  'admin.guidance.editor.statusNote': string;
  /** Edit mode, draft post: the at-a-glance state line (a draft is not
   *  public until published; names the way out). A published post keeps
   *  the statusNote instead (no nag). */
  'admin.guidance.editor.draftState': string;
  /** After a create-mode draft save: the consequence + the way out. A
   *  normal state, not an error (the editor's info notice). */
  'admin.guidance.editor.savedAsDraft': string;
  /** After an edit of an existing draft: it stays a draft, still not
   *  visible on /blog until published (the edit payload carries no
   *  status). */
  'admin.guidance.editor.stillDraft': string;
  'admin.guidance.editor.save': string;
  'admin.guidance.editor.saving': string;
  'admin.guidance.editor.cancel': string;

  // media library tab (the asset inventory: the editor's hero picker and
  // this grid both list it). Delete is API-first: the first tap calls the
  // endpoint, and a 409 (still referenced) arms the confirm that re-issues
  // with confirm=true.
  'admin.media.tab': string;
  'admin.media.loading': string;
  'admin.media.empty': string;
  'admin.media.upload': string;
  'admin.media.uploading': string;
  /** The accepted types (the server re-checks magic bytes + declared type). */
  'admin.media.uploadHint': string;
  'admin.media.col.image': string;
  'admin.media.col.file': string;
  'admin.media.col.dimensions': string;
  'admin.media.col.size': string;
  'admin.media.col.uploaded': string;
  'admin.media.col.usedBy': string;
  'admin.media.col.actions': string;
  'admin.media.delete': string;
  /** The first tap is in flight (the API decides: 200 gone / 409 in-use). */
  'admin.media.delete.working': string;
  /** The in-use confirm copy (the 409 message names the posts; it is
   *  echoed after this sentence). */
  'admin.media.delete.inUse': string;
  'admin.media.delete.confirmButton': string;
  'admin.media.delete.cancel': string;
  'admin.media.success.uploaded': string;
  'admin.media.success.deleted': string;

  // --- legal pages (legal-i18n M4): /privacy + /terms were English-only
  // static text; every paragraph/heading is now a catalog key, one key
  // per block, with splice segments around the inline <strong>/<em>/
  // <code> and cross-page links (the account-area pattern).
  //
  // The 187 legal.* keys below are appended in batches (B2..B11, legal
  // text in backup order); each batch lands in ALL FOUR files together
  // (messages.ts + en.ts + et.ts + ru.ts) and the build is re-run after
  // every batch, so the key sets never drift.
  //
  // Convention: the section heading keys (legal.privacy.<section> /
  // legal.terms.<section>) are used BOTH for the table-of-contents link
  // label and the section <h2>, so the two can never drift apart. The
  // cross-page link labels are case-fitted to their sentence in each
  // locale (e.g. ET "kontolehelt" = "from the account page") because they
  // are spliced mid-sentence.
  //
  // These are legal texts: translated faithfully and conservatively, NOT
  // reviewed by a lawyer or a native speaker — the owner's review list
  // is docs/i18n-review.md ("Legal pages (M4)"). The bracket
  // placeholders ([OPERATOR LEGAL NAME], …) are fill-in tokens, kept
  // verbatim in all locales.
  /** Shared table-of-contents aria-label (both legal pages). */
  'legal.toc.aria': string;
  // privacy policy (/privacy)
  'legal.privacy.title': string;
  /** "Last updated: 16 September 2026" — the date is locale-formatted. */
  'legal.privacy.updated': string;
  // Section headings (TOC link + <h2> share the key).
  'legal.privacy.who': string;
  'legal.privacy.scope': string;
  'legal.privacy.collect': string;
  'legal.privacy.why': string;
  'legal.privacy.verification': string;
  'legal.privacy.location': string;
  'legal.privacy.content': string;
  'legal.privacy.cookies': string;
  'legal.privacy.thirdParties': string;
  'legal.privacy.sharing': string;
  'legal.privacy.retention': string;
  'legal.privacy.rights': string;
  'legal.privacy.security': string;
  'legal.privacy.children': string;
  'legal.privacy.changes': string;
  'legal.privacy.contact': string;
  // who
  'legal.privacy.who.p1': string;
  'legal.privacy.who.p2.before': string;
  'legal.privacy.who.p2.strong': string;
  'legal.privacy.who.p2.after': string;
  // scope
  'legal.privacy.scope.p1': string;

  // collect
  'legal.privacy.collect.p1': string;
  'legal.privacy.collect.li1.before': string;
  'legal.privacy.collect.li1.strong': string;
  /** Punctuation-only splice tail (identity allow-list). */
  'legal.privacy.collect.li1.after': string;
  'legal.privacy.collect.li2.before': string;
  'legal.privacy.collect.li2.strong': string;
  /** Punctuation-only splice tail (identity allow-list). */
  'legal.privacy.collect.li2.after': string;
  'legal.privacy.collect.li3.before': string;
  'legal.privacy.collect.li3.strong': string;
  /** Punctuation-only splice tail (identity allow-list). */
  'legal.privacy.collect.li3.after': string;
  'legal.privacy.collect.li4.before': string;
  'legal.privacy.collect.li4.strong': string;
  'legal.privacy.collect.li4.after': string;
  'legal.privacy.collect.p2.before': string;
  'legal.privacy.collect.p2.strong': string;
  'legal.privacy.collect.p2.middle': string;
  /** In-sentence form of the content section name (the heading key
   *  capitalizes; this one sits mid-sentence). */
  'legal.privacy.collect.p2.link': string;
  /** Punctuation-only splice tail (identity allow-list). */
  'legal.privacy.collect.p2.after': string;

  // why
  'legal.privacy.why.p1': string;
  'legal.privacy.why.li1.strong': string;
  'legal.privacy.why.li1.after': string;
  'legal.privacy.why.li2.strong': string;
  'legal.privacy.why.li2.after': string;
  'legal.privacy.why.li3.strong': string;
  'legal.privacy.why.li3.after': string;
  'legal.privacy.why.li4.strong': string;
  'legal.privacy.why.li4.after': string;
  'legal.privacy.why.li5.strong': string;
  'legal.privacy.why.li5.after': string;
  'legal.privacy.why.p2': string;
  // verification
  'legal.privacy.verification.p1': string;
  'legal.privacy.verification.p2': string;
  'legal.privacy.verification.p3': string;
  // location
  'legal.privacy.location.p1.before': string;
  'legal.privacy.location.p1.em': string;
  'legal.privacy.location.p1.after': string;

  'legal.privacy.location.p2.before': string;
  'legal.privacy.location.p2.strong': string;
  'legal.privacy.location.p2.after': string;
  'legal.privacy.location.p3.before': string;
  'legal.privacy.location.p3.strong': string;
  'legal.privacy.location.p3.after': string;
  // content
  'legal.privacy.content.p1.before': string;
  'legal.privacy.content.p1.after': string;
  'legal.privacy.content.p2': string;
  // cookies
  'legal.privacy.cookies.p1': string;
  'legal.privacy.cookies.li1.before': string;
  'legal.privacy.cookies.li1.strong': string;
  'legal.privacy.cookies.li1.after': string;
  'legal.privacy.cookies.li2.before': string;
  'legal.privacy.cookies.li2.strong': string;
  'legal.privacy.cookies.li2.after': string;
  'legal.privacy.cookies.li3.before': string;
  'legal.privacy.cookies.li3.strong': string;
  'legal.privacy.cookies.li3.after': string;
  'legal.privacy.cookies.p2': string;

  // third-party service providers
  'legal.privacy.thirdParties.p1': string;
  'legal.privacy.thirdParties.li1.before': string;
  'legal.privacy.thirdParties.li1.strong': string;
  'legal.privacy.thirdParties.li1.after': string;
  'legal.privacy.thirdParties.li2.before': string;
  'legal.privacy.thirdParties.li2.strong': string;
  'legal.privacy.thirdParties.li2.after': string;
  /** Proper noun as a whole value (identity allow-list). */
  'legal.privacy.thirdParties.li3.strong': string;
  'legal.privacy.thirdParties.li3.after': string;
  'legal.privacy.thirdParties.p2': string;
  // data sharing
  'legal.privacy.sharing.p1': string;
  // data retention
  'legal.privacy.retention.p1': string;
  'legal.privacy.retention.p2.before': string;
  'legal.privacy.retention.p2.strong': string;
  'legal.privacy.retention.p2.middle': string;
  'legal.privacy.retention.p2.strong2': string;
  'legal.privacy.retention.p2.after': string;
  'legal.privacy.retention.p3.before': string;
  /** The env-var name is code, not copy (identity allow-list). */
  'legal.privacy.retention.p3.code': string;
  'legal.privacy.retention.p3.after': string;
  'legal.privacy.retention.p4': string;

  // GDPR rights
  'legal.privacy.rights.p1': string;
  'legal.privacy.rights.li1.strong': string;
  'legal.privacy.rights.li1.and': string;
  'legal.privacy.rights.li1.strong2': string;
  'legal.privacy.rights.li1.middle': string;
  /** Punctuation-only splice tail (identity allow-list). */
  'legal.privacy.rights.li1.after': string;
  'legal.privacy.rights.li2.strong': string;
  'legal.privacy.rights.li2.after': string;
  'legal.privacy.rights.li3.strong': string;
  'legal.privacy.rights.li3.middle': string;
  'legal.privacy.rights.li3.after': string;
  'legal.privacy.rights.li4.strong': string;
  'legal.privacy.rights.li4.and': string;
  'legal.privacy.rights.li4.strong2': string;
  'legal.privacy.rights.li4.after': string;
  'legal.privacy.rights.p2': string;
  // data security
  'legal.privacy.security.p1.before': string;
  'legal.privacy.security.p1.strong': string;
  'legal.privacy.security.p1.after': string;
  'legal.privacy.security.p2': string;

  // children / changes / contact
  'legal.privacy.children.p1': string;
  'legal.privacy.changes.p1': string;
  'legal.privacy.contact.p1.before': string;
  /** Punctuation-only splice tail (identity allow-list). */
  'legal.privacy.contact.p1.after': string;
  // cross-page link labels (case-fitted to their sentence per locale)
  /** "account page" — the /account links in the content + rights sections. */
  'legal.privacy.link.accountPage': string;
  /** "terms of use" — the /terms link in the contact section. */
  'legal.privacy.link.terms': string;
  // terms of use (/terms)
  'legal.terms.title': string;
  /** "Last updated: 13 September 2026" — the date is locale-formatted. */
  'legal.terms.updated': string;
  /** The emergency number — a literal in every locale (identity
   *  allow-list); used by the service + emergency sections. */
  'legal.terms.emergencyNumber': string;
  // Section headings (TOC link + <h2> share the key).
  'legal.terms.acceptance': string;
  'legal.terms.service': string;
  'legal.terms.eligibility': string;
  'legal.terms.security': string;
  'legal.terms.rules': string;
  'legal.terms.prohibited': string;
  'legal.terms.license': string;
  'legal.terms.moderation': string;
  'legal.terms.official': string;
  'legal.terms.emergency': string;
  'legal.terms.warranty': string;
  'legal.terms.liability': string;
  'legal.terms.thirdParty': string;
  'legal.terms.availability': string;
  'legal.terms.source': string;
  'legal.terms.law': string;
  'legal.terms.contact': string;

  // acceptance
  'legal.terms.acceptance.p1': string;
  // what OpenShelter is
  'legal.terms.service.p1': string;
  'legal.terms.service.p2.before': string;
  'legal.terms.service.p2.strong': string;
  'legal.terms.service.p2.middle': string;
  'legal.terms.service.p2.after': string;
  // eligibility
  'legal.terms.eligibility.p1': string;
  // account security
  'legal.terms.security.p1': string;
  // rules for contributions
  'legal.terms.rules.li1': string;
  'legal.terms.rules.li2': string;
  'legal.terms.rules.li3': string;
  'legal.terms.rules.li4': string;

  // prohibited content and behaviour
  'legal.terms.prohibited.p1': string;
  'legal.terms.prohibited.li1': string;
  'legal.terms.prohibited.li2': string;
  'legal.terms.prohibited.li3': string;
  'legal.terms.prohibited.li4': string;
  'legal.terms.prohibited.li5': string;
  'legal.terms.prohibited.p2': string;
  // intellectual property
  'legal.terms.license.p1': string;
  // moderation
  'legal.terms.moderation.p1': string;
  // official vs community
  'legal.terms.official.p1.before': string;
  'legal.terms.official.p1.em': string;
  'legal.terms.official.p1.middle': string;
  'legal.terms.official.p1.strong': string;
  'legal.terms.official.p2': string;

  // emergency disclaimer
  'legal.terms.emergency.p1.before': string;
  /** Punctuation-only splice tail (identity allow-list). */
  'legal.terms.emergency.p1.after': string;
  'legal.terms.emergency.p2': string;
  // no warranty / liability
  'legal.terms.warranty.p1': string;
  'legal.terms.liability.p1': string;
  // third-party links and services
  'legal.terms.thirdParty.p1.before': string;
  /** "privacy policy", prepositional case ("described in the …"). */
  'legal.terms.thirdParty.p1.link': string;
  'legal.terms.thirdParty.p1.after': string;
  // availability
  'legal.terms.availability.p1': string;
  // open-source license
  'legal.terms.source.p1': string;
  // applicable law
  'legal.terms.law.p1': string;
  // contact
  'legal.terms.contact.p1.before': string;
  /** "privacy policy", instrumental case ("governed by the …"). */
  'legal.terms.contact.p1.link': string;
  'legal.terms.contact.p1.after': string;
}

/** A catalog key — templates/guards pass these to `t()` / the `t` pipe. */
export type MessageKey = keyof Messages;
