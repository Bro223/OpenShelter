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

  'admin.guidance.tab': string;
  'admin.guidance.loading': string;
  'admin.guidance.empty': string;
  /** The scoped empty state (admin-locale-scope): no posts have content in
   *  the active UI language. `{locale}` is the language code. */
  'admin.guidance.emptyLocale': string;
  /** The scoped list's language line (admin-locale-scope): the posts shown
   *  are the active UI language's. `{locale}` is the language code. */
  'admin.guidance.shownIn': string;
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
}

/** A catalog key — templates/guards pass these to `t()` / the `t` pipe. */
export type MessageKey = keyof Messages;
