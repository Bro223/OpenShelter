# i18n review — ET/RU strings needing a native speaker

Companion to the `i18n-et-en` workstream. The account surface (`features/account/**`),
the map "around you" CTA, the verify page, and the shared error-copy module were
previously hardcoded English; they are now catalog-driven. Every new ET/RU value in
`frontend/src/app/core/i18n/{et,ru}.ts` was authored by a non-native speaker (the
implementing agent). This document lists the values that are **not** fully confident.

Scope notes:

- EN values are verbatim from the previous hardcoded templates (existing specs assert
  on them), so EN is not under review here.
- The `catalog-identity` guard catches an ET/RU value that is byte-identical to EN
  (an un-translated copy); it cannot judge translation quality. Everything below
  passes the guard and should read as plausible, but none of it has been verified by
  a native Estonian or Russian speaker.
- Short mechanical labels (buttons, field names, error one-liners) are not listed
  individually — they are the low-risk majority. The listed rows are the ones with
  real grammar/naturalness doubt.

## Fixed errors found in the sweep (before → after)

Mechanical error classes, fixed in this change (full list in the delivery report):

| Locale | Key | Before | After |
| --- | --- | --- | --- |
| ET | `a11y.popup.close` | `Sule` | `Sulge` (misspelling) |
| ET | `nav.admin`, `title.admin` | `Admin` | `Haldus` (English left in ET) |
| ET | `how.nearest` (button quote) | `"Show shelters around you"` | `"Näita varjupaiku minu ümbruses"` |
| ET | `authPage.reset.sentTitle` | `sisseliikumist` | `sissetulekut` (wrong word: "income" vs "movement") |
| ET | `map.osmAttribution`, `submit.osmAttribution` | `kaasaajad` | `kaasajajad` (misspelling) |
| ET | `submit.successBody` | `uuelisandina` | `uue lisandina` (word split) |
| ET | `submit.loc.shortLinkFailed` | `Sest linki ei leidnud koordinaate…` | `Sellest lingist koordinaate ei leitud…` (ungrammatical) |
| ET | `admin.guidance.shownIn` | `nende enda nendest loenditest` | `nende enda loenditest` (doubled word) |
| ET | `admin.guidance.order.hint` | `Postid näivad` | `Postid näevad` (wrong verb) |
| ET | `submit.slugHint.create` | `Tühjaks jättes genereeritakse sluuug` | `Tühjaks jätmisel genereeritakse sluug` (case + misspelling) |
| ET | `submit.slugHint.edit` | `Tühjaks jättes jääb … sluuug säilima` | `Tühjaks jätmisel jääb … sluug säilma` |
| ET | `submit.bodyHint` | `…tööriistapaneeli tähised… Liitudud sisu sisestatakse ainult…` | `…tööriistapaneeli vorming… Liidetud sisu hoiab ainult…` (wrong words) |
| ET | `submit.localeHint` | `Täitub eeltäpselt… muutmisel post ise oma keel` | `Täitub automaatselt… muutmisel posti oma keel` (unworded) |
| RU | how-it-works paragraph (button quote) | `"Show shelters around you"` | `«Показать укрытия рядом с вами»` |
| RU | geocoder not-found / unavailable (button quote) | `«Show shelters around you»` | `«Показать укрытия рядом с вами»` |
| RU | `submit.hint.swapped` | `— порядок (долгота, широта), поэтому…` | `— распознан как долгота и широта, поэтому…` (garbled sentence) |
| RU | `submit.loc.decimalComma` | `(обнаружен десятичный разделитель — запятая, как в эстонском)` | `(обнаружен десятичный разделитель — запятая)` (the "as in Estonian" aside was Russian-specific noise) |
| RU | `admin.media.col.size` | `Объём` | `Размер` (wrong word: volume vs size) |

## Uncertain ET values (new in this change)

| Key | Current ET value | English | Why uncertain |
| --- | --- | --- | --- |
| `account.identity` | `Identiteet` | Identity (section heading) | Literal. Estonian UIs more often say `Isikuandmed`, but that risks blurring the line with the `Sinu andmed` ("Your data") section below. |
| `account.contributions` | `Minu esitused` | My contributions | `panused` (literal "contributions") reads like betting stakes; chose `esitused` ("submissions") to match the `esitada` verb used elsewhere in the catalog. A native speaker might prefer `Minu varjupaikad` or `Minu lisandid`. |
| `error.verifyRateLimited` | `…(koodide arv päevas on piiratud).` | …(codes are limited per day). | Word order was adjusted but still sounds machine-made; `päevas`/`ööpäevas` choice is a guess. |
| `account.working` | `Töötlen…` | Working… | Valid form of `töötlema` ("I am processing"), but `Käsitlen…` may be the more idiomatic UI phrasing. |
| `account.identityCopy` | `Trükiviga registreerumisel ei sunni kunagi uut kontot looma — …` | A typo at registration never forces a new account — … | Grammatically correct but a heavy double-infinitive chain (`sunnima` + partitive + -ma); a native speaker would likely rephrase. |
| `account.dataCopy` | `…JSON-fail, mis sisaldab kõik sinu kontoga seotut — …` | …a JSON file with everything tied to your account — … | `kõik … seotut` (all + partitive) is acceptable but `kogu` may be cleaner. |
| `account.phoneProof` | `…— ainult SIM-kaardi kaotamine ei suuda kinnitust ümber suunata.` | …— losing your SIM alone cannot re-route verification. | Faithful but literal; the negative construction is the part a native speaker would most likely reword. |
| `account.delete.adminCopy` | `See konto loodi deploy-keskkonna poolt…` | This account was provisioned by the deployment environment… | `deploy-keskkond` is an IT loanword; the formal form would be `kasutuselevõtu-keskkond`. Kept the loanword as common in Estonian IT writing, but it should be checked. |
| `verify.subtitle` | `…koodid saadetakse väljaspool rakendust, üks iga kanali kohta.` | …the codes arrive out-of-band, one per channel. | `väljaspool rakendust` ("outside the app") is an approximation of "out-of-band" (delivered via SMS/email rather than in the app). |

## Uncertain RU values (new in this change)

| Key | Current RU value | English | Why uncertain |
| --- | --- | --- | --- |
| `error.verifyRateLimited` | `…(число кодов в сутки ограничено).` | …(codes are limited per day). | `в сутки` is more formal/journalistic than `в день`; UI copy may prefer the latter. |
| `verify.subtitle` | `…коды приходят вне приложения, по одному на каждый канал.` | …the codes arrive out-of-band, one per channel. | Same "out-of-band" approximation as ET. |
| `account.success.exportDownloaded` | `Экспорт ваших данных загружен.` | Your data export has been downloaded. | `загружен` is ambiguous in Russian (uploaded/downloaded); `скачан` is unambiguous but colloquial. |
| `account.delete.adminCopy` | `Этот аккаунт создан окружением развёртывания…` | This account was provisioned by the deployment environment… | Technical phrasing; fine, but `окружение развёртывания` is a calque of "deployment environment". |
| `account.contrib.view` | `Просмотр` | View | Noun, while the neighbouring buttons in the same row are infinitives (`Удалить`); ET/EN use a verb form. Consistency call to make. |
| `verify.phone.send` | `Отправить SMS-код на телефон` | Text code to my phone | Dropped the possessive (`на мой телефон`) that EN carries; stylistically fine, noted for consistency. |
| `account.emailLabel` (and all `e-mail` usage) | `Адрес e-mail` | Email address | Latin-script `e-mail` is the catalog-wide convention (pre-existing); fully-Russian `адрес электронной почты` would be the alternative. Consistent, but a native reviewer should confirm the convention. |

## Pluralization logic (component code, not catalog)

`contributions-panel.ts` builds the report-count phrase for hidden rows
(`account.contrib.hidden`, `{count}`) with per-locale rules:

- EN: `1 report` / `N reports`
- ET: `1 teatamine` / `N teatamist` (binary — Estonian has two number classes)
- RU: full one/two-four/five+ rule (`отчёт` / `отчёта` / `отчётов`, incl. 11–14 → `отчётов`)

The RU rule is implemented with the standard `n % 100 / n % 10` algorithm and should
be correct for 1–999, but it has no native-speaker sign-off.

## What is NOT in scope for native review here

- Legal pages (privacy/terms) — now covered in the final section of this file
  (legal-i18n M4). Guidance admin/blog and theme/accessibility dialogs — untouched by this change.
- Pre-existing ET/RU values outside the sweep (map, submit, admin, auth) — reviewed
  only where they quoted the around-you button or had a mechanical error (see the
  fixed table above).

## Legal pages — privacy policy and terms of use (legal-i18n M4)

The legal pages (features/legal/privacy-policy-page, features/legal/terms-page)
were static hardcoded-English templates; they are now fully catalog-driven.
This workstream added **187 legal.* keys** (EN verbatim from the previous
templates — the pre-existing EN specs assert on that text and stay green) plus
one defect-fix key, authPage.reset.newPasswordTooShort (the reset page
referenced a key that did not exist, crashing the component).

**Review status — read first:** every ET/RU value below was authored by a
non-native speaker (the implementing agent). **None of them has been reviewed
by a native Estonian or Russian speaker, and none has been reviewed by a
lawyer.** A legal document is exactly the kind of copy where both matter: the
ET/RU versions must carry the same legal force as the EN original (disclaimers,
GDPR rights, the verified-user caveat, the liability limitation), and a
mis-translated disclaimer is a real risk, not a wording nit. **Do not publish
the ET/RU legal pages before native-speaker sign-off AND legal review.**

Scope notes for this section:

- The [OPERATOR LEGAL NAME] / [CONTACT EMAIL] / [DATA PROTECTION CONTACT] /
  [LEGAL BASIS TO BE CONFIRMED] / [TO BE CONFIRMED] /
  [APPLICABLE LAW TO BE CONFIRMED] / [DISPUTE RESOLUTION TO BE CONFIRMED]
  placeholders are owner decisions, kept identical in all locales on purpose
  (they are not translations).
- Quoted UI labels ("Näita varjupaiku minu ümbruses", "Kasuta mu asukohta",
  «Показать укрытия рядом с вами», «Моё местоположение») reuse the EXISTING
  catalog translations of the same buttons — they must stay in sync with
  how.nearest / submit.location.useMyLocation.
- Punctuation-only splice tails (bare ; or . values) and the literals
  OpenStreetMap / RETENTION_ENABLED / 112 are intentionally identical to EN;
  they are allow-listed in catalog-identity.spec.ts with that rationale.

### authPage.reset.newPasswordTooShort (reset-page defect)

| Locale | Value | Note |
| --- | --- | --- |
| EN | `Password must be at least 8 characters long.` | Reuses the existing catalog length-rule wording (register/submit house style) |
| ET | `Parool peab olema vähemalt 8 tähemärki pikk.` | Standard formulation; consistent with the other auth error rules |
| RU | `Пароль должен быть не короче 8 символов.` | Standard formulation |

### Fixed errors found in this sweep (before → after)

Found while re-reading the full ET/RU drafts (mechanical errors, corrected in
the catalog):

| Locale | Key | Before | After |
| --- | --- | --- | --- |
| ET | legal.privacy.collect.li4.after, legal.privacy.why.li4.after, legal.privacy.security.p1.after | ritsina (invented word) | rätina (hash) |
| ET | legal.privacy.verification.p1, legal.terms.eligibility.p1 | Kaarti võib vaadata kontota. (missing particle) | Kaarti saab vaadata ilma kontota. (without an account) |
| ET | legal.terms.official.p1.before | …on esitanud kogukonnaliikmed. (broken syntax) | …on esitanud kogukonnaliikmete poolt. (submitted by community members) |
| ET | legal.privacy.retention.p3.after | Deploy, kus ülesanne on väljas, jäävad … säilima. | Deployis, kus ülesanne on väljas, jäävad … alles. |
| RU | legal.terms.official | Официальная versus общинная информация (Latin filler + wrong word: община = rural commune) | Официальные данные и данные сообщества |

### Full listing — ET (187 keys)

| Key | English | Value |
| --- | --- | --- |
| legal.toc.aria | `Table of contents` | `Sisukord` |
| legal.privacy.title | `Privacy policy` | `Privaatsuspoliitika` |
| legal.privacy.updated | `Last updated: 16 September 2026` | `Viimati värskendatud: 16. september 2026` |
| legal.privacy.who | `Who operates OpenShelter` | `Kes käitab OpenShelterit` |
| legal.privacy.scope | `Scope of this policy` | `Selle poliitika ulatus` |
| legal.privacy.collect | `What personal data we collect` | `Mida isikuandmeid me kogume` |
| legal.privacy.why | `Why we process each category` | `Miks me iga kategooriat töötleme` |
| legal.privacy.verification | `Account creation and verification` | `Konto loomine ja kinnitamine` |
| legal.privacy.location | `Location and geolocation` | `Asukoht ja geolokatsioon` |
| legal.privacy.content | `User-generated content` | `Kasutajalt pärinev sisu` |
| legal.privacy.cookies | `Cookies and browser storage` | `Cookied ja brauseri salvestusruum` |
| legal.privacy.thirdParties | `Third-party service providers` | `Kolmandate isikute teenusepakkujad` |
| legal.privacy.sharing | `Data sharing` | `Andmete edastamine` |
| legal.privacy.retention | `Data retention` | `Andmete säilitamine` |
| legal.privacy.rights | `Your rights under the GDPR` | `Sinu õigused üldise andmekaitsemääruse (GDPR) alusel` |
| legal.privacy.security | `Data security` | `Andmete turvalisus` |
| legal.privacy.children | `Children` | `Lapsed` |
| legal.privacy.changes | `Changes to this policy` | `Muudatused selles poliitikas` |
| legal.privacy.contact | `Contact` | `Kontakt` |
| legal.privacy.who.p1 | `OpenShelter is an open-source, community-maintained map of shelters and safe places in Estonia. It is operated by [OPERATOR LEGAL NAME], [POSTAL ADDRESS]. The data protection contact is [DATA PROTECTION CONTACT].` | `OpenShelter on avatud lähtekoodiga, kogukonna poolt hooldatav kaart varjupaiku ja turvalisi kohti Eestis. Seda käitab [OPERATOR LEGAL NAME], [POSTAL ADDRESS]. Andmekaitse kontakt on [DATA PROTECTION CONTACT].` |
| legal.privacy.who.p2.before | `OpenShelter is ` | `OpenShelter ` |
| legal.privacy.who.p2.strong | `not an official government service` | `ei ole ametlik valitsuslik teenus` |
| legal.privacy.who.p2.after | ` and not an emergency service. Official shelter data shown in the application is imported from the Estonian Rescue Board (Päästeamet) open data, but the application itself is operated independently.` | ` ega hädaabiteenus. Rakenduses kuvatud ametlikud varjupaikade andmed on importitud Eesti Päästeameti avandmetest, kuid rakendust ise käitatakse sõltumatult.` |
| legal.privacy.scope.p1 | `This policy describes how OpenShelter collects, uses, stores and deletes personal data when you use the web application. It is intended to describe the application's actual behaviour. It does not apply to the external websites we link to (the Estonian Rescue Board, Maa-amet and OpenStreetMap).` | `See poliitika kirjeldab, kuidas OpenShelter kogub, kasutab, salvestab ja kustutab sinu isikuandmeid, kui kasutad veebirakendust. Selle eesmärk on kirjeldada rakenduse tegelikku käitumist. See ei kehti väliste veebilehtede kohta, millele me viitame (Eesti Päästeamet, Maa-amet ja OpenStreetMap).` |
| legal.privacy.collect.p1 | `We collect only what the application needs to work. When you create an account we store:` | `Me kogume ainult seda, mida rakendus toimimiseks vajab. Kui lood kontu, salvestame:` |
| legal.privacy.collect.li1.before | `your ` | `sinu ` |
| legal.privacy.collect.li1.strong | `full name` | `täisnimi` |
| legal.privacy.collect.li1.after | `;` | `;` |
| legal.privacy.collect.li2.before | `your ` | `sinu ` |
| legal.privacy.collect.li2.strong | `e-mail address` | `e-posti aadress` |
| legal.privacy.collect.li2.after | `;` | `;` |
| legal.privacy.collect.li3.before | `your ` | `sinu ` |
| legal.privacy.collect.li3.strong | `phone number` | `telefoninumber` |
| legal.privacy.collect.li3.after | `;` | `;` |
| legal.privacy.collect.li4.before | `your ` | `sinu ` |
| legal.privacy.collect.li4.strong | `password` | `parool` |
| legal.privacy.collect.li4.after | `, stored only as a one-way hash.` | `, salvestatud ainult ühesuunalise rätina.` |
| legal.privacy.collect.p2.before | `We do ` | `Me ` |
| legal.privacy.collect.p2.strong | `not` | `ei` |
| legal.privacy.collect.p2.middle | ` collect a national identification code, and we do not use advertising, analytics or cross-site tracking. When you contribute to the map we store the content you submit (shelters and reports), as described under ` | `kogume isikutunnuskoodi, ega kasuta reklaami, analüütikat ega saitidevahelist jälgimist. Kui panustad kaardile, salvestame sinu esitatud sisu (varjupaikad ja teated), nagu on kirjeldatud osas ` |
| legal.privacy.collect.p2.link | `user-generated content` | `kasutajalt pärinev sisu` |
| legal.privacy.collect.p2.after | `.` | `.` |
| legal.privacy.why.p1 | `Each category is processed for a specific purpose, and for no other purpose:` | `Iga kategooriat töötleme kindlaksmääratud eesmärgil ja mitte ühelegi teisele:` |
| legal.privacy.why.li1.strong | `Name` | `Nimi` |
| legal.privacy.why.li1.after | ` - shown on your account and, for public submissions, on the map.` | ` - kuvatakse sinu kontol ja avalike esituste puhul kaardil.` |
| legal.privacy.why.li2.strong | `E-mail address` | `E-posti aadress` |
| legal.privacy.why.li2.after | ` - account verification, password resets and cross-channel confirmation when you change your phone number.` | ` - konto kinnitamine, parooli lähtestamine ja kanalitevaheline kinnitamine, kui muudad oma telefoninumbrit.` |
| legal.privacy.why.li3.strong | `Phone number` | `Telefoninumber` |
| legal.privacy.why.li3.after | ` - account verification, sign-in and cross-channel confirmation when you change your e-mail address.` | ` - konto kinnitamine, sisse logimine ja kanalitevaheline kinnitamine, kui muudad oma e-posti aadressi.` |
| legal.privacy.why.li4.strong | `Password` | `Parool` |
| legal.privacy.why.li4.after | ` - authentication. It is stored only as a one-way hash, so it can never be read back.` | ` - autentimine. Salvestatakse ainult ühesuunalise rätina, seega seda ei saa kunagi tagasi lugeda.` |
| legal.privacy.why.li5.strong | `Submitted content` | `Esitatud sisu` |
| legal.privacy.why.li5.after | ` - shown on the public map and used by administrators for moderation and abuse prevention.` | ` - kuvatakse avalikul kaardil ja kasutatakse haldurite poolt modereerimiseks ja kuritarvituste ennetamiseks.` |
| legal.privacy.why.p2 | `The legal basis for each purpose is [LEGAL BASIS TO BE CONFIRMED]. This document is intended to describe the processing; it is not a legal opinion.` | `Iga eesmärgi õiguslik alus on [LEGAL BASIS TO BE CONFIRMED]. See dokument on mõeldud töötlemise kirjeldamiseks; see ei ole õigusarvamus.` |
| legal.privacy.verification.p1 | `You may browse the map without an account. To submit shelters or reports you must create an account and verify both your e-mail address and your phone number. Verification works by sending a one-time code to each contact; until both are verified you can sign in but cannot contribute.` | `Kaarti saab vaadata ilma kontota. Varjupaiku või teateid esitamiseks pead looma konto ja kinnitama nii oma e-posti aadressi kui ka telefoninumbri. Kinnitamine toimib nii, et igale kontaktile saadetakse ühekordne kood; seni, kuni mõlemad on kinnitatud, saad sisse logida, kuid ei saa sisu esitada.` |
| legal.privacy.verification.p2 | `Password resets are performed by a one-time code sent to your e-mail address. Changing your e-mail address is confirmed with a code sent to your current phone number, and changing your phone number is confirmed with a code sent to your current e-mail address.` | `Parooli lähtestamine toimub ühekordse koodiga, mis saadetakse sinu e-posti aadressile. E-posti aadressi muutmine kinnitatakse koodiga, mis saadetakse sinu praegusele telefoninumbrile, ja telefoninumbri muutmine kinnitatakse koodiga, mis saadetakse sinu praegusele e-posti aadressile.` |
| legal.privacy.verification.p3 | `To prevent abuse, the application applies rate limits on code requests and on shelter submissions, and detects near-duplicate submissions. Exceeding a limit produces an error, not a ban.` | `Kuritarvituste vältimiseks rakendab rakendus piiranguid koodide taotlustele ja varjupaikade esitamisele ning tuvastab peaaegu dubleeruvaid esitusi. Piirangu ületamine annab vea, mitte keeluse.` |
| legal.privacy.location.p1.before | `We only ever see your location when ` | `Me näeme su asukohta ainult siis, kui ` |
| legal.privacy.location.p1.em | `you` | `sina` |
| legal.privacy.location.p1.after | ` ask for it. The "Show shelters around you" button and the "Use my location" option on the submit form first show your browser's own permission prompt. If you decline, nothing changes.` | ` seda küsid. Nupp "Näita varjupaiku minu ümbruses" ja lisamisvormi valik "Kasuta mu asukohta" näitavad esmalt sinu brauseri enda lubatamispalvet. Kui lükad tagasi, siis midagi ei muutu.` |
| legal.privacy.location.p2.before | `On the map, the nearest shelter is worked out ` | `Kaardil arvutatakse lähim varjupaik ` |
| legal.privacy.location.p2.strong | `inside your browser` | `sinu brauseri sees` |
| legal.privacy.location.p2.after | `; your live position is never sent to our servers. If you submit a shelter at your position, only the coordinate you choose is stored, as part of that submission.` | `; su reaalajas asukoht ei saa kunagi meie serveritesse saadetud. Kui sa esitad varjupaiga oma asukohas, salvestatakse ainult sinu valitud koordinaat selle esituse osana.` |
| legal.privacy.location.p3.before | `We ` | `Me ` |
| legal.privacy.location.p3.strong | `never` | `mitmugi` |
| legal.privacy.location.p3.after | ` infer your location from your IP address. Address search uses the OpenStreetMap Nominatim service; a search request is sent only when you deliberately search for an address.` | `järeldame su asukohta sinu IP-aadressi põhjal. Aadressi otsing kasutab OpenStreetMapi Nominatim-teenust; otsingupäring saadetakse ainult siis, kui sa tahtlikult aadressi otsid.` |
| legal.privacy.content.p1.before | `When you contribute, the application stores your shelters and your reports (for example, that a location is closed, inaccurate, or no longer exists). This content becomes part of the public community map. You can edit or remove your own shelters from the ` | `Kui panustad, salvestab rakendus sinu varjupaikad ja sinu teated (näiteks, et asukoht on suletud, ebatäpne või enam ei eksisteeri). See sisu muutub osaks avalikku kogukonna kaarti. Oma varjupaiku saad muuta või eemaldada ` |
| legal.privacy.content.p1.after | `; reports are reviewed by administrators.` | `; teateid vaadatakse üle haldurite poolt.` |
| legal.privacy.content.p2 | `Moderators can review, hide, correct or remove user-submitted content. The application keeps a moderation record so decisions can be audited.` | `Moderaatorid saavad kasutajate esitatud sisu vaadata, peita, parandada või eemaldada. Rakendus hoiab modereerimise logi, et otsuseid oleks võimalik kontrollida.` |
| legal.privacy.cookies.p1 | `OpenShelter does not use advertising cookies. It stores only the following items in your browser's local storage, each of which is technically necessary:` | `OpenShelter ei kasuta reklaamikooge. Ta salvestab sinu brauseri kohalikus salvestusruumis ainult järgmised üksused, igaüks neist on tehniliselt vajalik:` |
| legal.privacy.cookies.li1.before | `a ` | `üks ` |
| legal.privacy.cookies.li1.strong | `sign-in token` | `sisselogimistunnus` |
| legal.privacy.cookies.li1.after | ` that keeps you logged in across page reloads;` | `, mis hoiab sind lehe uuendamiste vältel sisselogituna;` |
| legal.privacy.cookies.li2.before | `your ` | `sinu ` |
| legal.privacy.cookies.li2.strong | `language preference` | `keeleeelistus` |
| legal.privacy.cookies.li2.after | ` (Estonian or English);` | ` (eesti või inglise keel);` |
| legal.privacy.cookies.li3.before | `your ` | `sinu ` |
| legal.privacy.cookies.li3.strong | `display preference` | `kuvamiseelistused` |
| legal.privacy.cookies.li3.after | ` (high-contrast mode).` | ` (kõrge kontrasti režiim).` |
| legal.privacy.cookies.p2 | `Your access token is held in memory only and is discarded when you close the tab. No third party receives these items, and there are no optional analytics or tracking technologies to accept or reject.` | `Sinu juurdepääsutunnus hoitakse ainult mälus ja visatakse ära, kui suled vahekaardi. Kolmas isik neid üksusi ei saa, ja valikulisi analüütika- või jälgimistehnoloogiaid, mida aktsepteerida või tagasi lükata, ei ole.` |
| legal.privacy.thirdParties.p1 | `We use a small number of third-party services, each only to deliver a specific function:` | `Me kasutame vähest kolmandate isikute teenuseid, igaüks neist ainult ühe kindla funktsiooni osutamiseks:` |
| legal.privacy.thirdParties.li1.before | `an ` | `ühe ` |
| legal.privacy.thirdParties.li1.strong | `e-mail delivery service` | `e-posti tarneteenust` |
| legal.privacy.thirdParties.li1.after | ` (SendPulse, via SMTP) to send verification and password-reset codes. It receives the destination e-mail address to deliver the message.` | ` (SendPulse, SMTP kaudu), mis saadab kinnituskoodid ja parooli lähtestamise koodid. Teenus saab sõnumi edastamiseks siht-e-posti aadressi.` |
| legal.privacy.thirdParties.li2.before | `a ` | `ühe ` |
| legal.privacy.thirdParties.li2.strong | `text-message service` | `tekstisõnumi teenust` |
| legal.privacy.thirdParties.li2.after | ` (Twilio) to send verification codes. It receives the destination phone number to deliver the message.` | ` (Twilio), mis saadab kinnituskoodid. Teenus saab sõnumi edastamiseks siht-telefoninumbri.` |
| legal.privacy.thirdParties.li3.strong | `OpenStreetMap` | `OpenStreetMap` |
| legal.privacy.thirdParties.li3.after | ` map tiles and the Nominatim geocoding service, which receive the map area you view or the address you search for.` | ` kaardiplaadid ja Nominatimi geokodeerimisteenus – need saavad kaardi ala, mida sa vaatad, või aadressi, mida sa otsid.` |
| legal.privacy.thirdParties.p2 | `The official shelter data is imported from the Estonian Rescue Board (Päästeamet) open data; that is an inbound data source, not a service we send your data to. Whether any of these providers involves an international transfer is [TO BE CONFIRMED].` | `Ametlikud varjupaikade andmed on importitud Eesti Päästeameti (Päästeamet) avandmetest; see on sisenev andmeallikas, mitte teenus, kuhu me sinu andmeid saadame. Kas mõni neist teenusepakkujatest hõlmab andmete rahvusvahelist edastamist, on [TO BE CONFIRMED].` |
| legal.privacy.sharing.p1 | `We do not sell your personal data and do not share it for advertising or any other commercial purpose. The only disclosures are to the service providers listed above, in order to deliver the messages you request. Shelter data you submit becomes part of the public community list; after you delete your account, public submissions remain on the map without attribution.` | `Me ei müü sinu isikuandmeid ega jaga neid reklaamieesmärkideks ega muul komertslikul eesmärgil. Ainsad edastamised on ülalnimetatud teenusepakkujatele, et viia sulle sõnumid, mida sa palud. Sinu esitatud varjupaikade andmed muutuvad osaks avalikku kogukonna nimekiku; pärast konto kustutamist jäävad avalikud esitused kaardile ilma esitaja mainimiseta.` |
| legal.privacy.retention.p1 | `Your account data is kept for as long as your account exists. Deleting your account removes your personal data immediately: shelters you declared as a private home are removed, and public shelters you submitted stay on the map without a submitter.` | `Sinu kontoandmeid hoitakse seni, kuni sinu konto eksisteerib. Kontu kustutamine eemaldab sinu isikuandmed kohe: sinu eraomana märgitud varjupaikad eemaldatakse, ja avalikud varjupaikad, mida sa esitasid, jäävad kaardile ilma esitajata.` |
| legal.privacy.retention.p2.before | `We also apply fixed retention periods: an account with no sign-in activity (registration, login, or session refresh) for ` | `Me rakendame ka fikseeritud säilitamisperioode: konto, millel pole sisselogimistegevust (registreerimine, sisselogimine või sessiooni uuendamine) ` |
| legal.privacy.retention.p2.strong | `24 months` | `24 kuud` |
| legal.privacy.retention.p2.middle | ` is deleted with the same erasure rule as account deletion, and moderation and audit records older than ` | `kustutatakse sama kustutusreegli järgi, mis kehtib konto kustutamisel, ja modereerimise ning auditeerimise kirjed, mis on vanemad kui ` |
| legal.privacy.retention.p2.strong2 | `24 months` | `24 kuud` |
| legal.privacy.retention.p2.after | ` are removed.` | `eemaldatakse.` |
| legal.privacy.retention.p3.before | `Those periods are the app's retention rule. The scheduled job that enforces them is a deployment-level switch (` | `Need perioodid on rakenduse säilitamisreegel. Plaaneeritud ülesanne, mis neid rakendab, on deploy-tasemel lüliti (` |
| legal.privacy.retention.p3.code | `RETENTION_ENABLED` | `RETENTION_ENABLED` |
| legal.privacy.retention.p3.after | `): it is off in this repository's development setup, and it is enabled by whoever operates a deployment. In a deployment where the job is off, inactive accounts and old audit records are simply kept.` | `): selles repoo arenduskeskkonnas on see väljas ja sisselülitab selle see, kes käitab deployt. Deployis, kus ülesanne on väljas, jäävad mitteaktiivsed kontod ja vanad auditeerimise kirjed lihtsalt alles.` |
| legal.privacy.retention.p4 | `Public community submissions are never removed automatically: they stay on the map without attribution until a moderator removes them.` | `Avalikud kogukonna esitused ei eemaldata kunagi automaatselt: need jäävad kaardile ilma autorimärgistuseta, seni kuni moderaator neid eemaldab.` |
| legal.privacy.rights.p1 | `If you are in the European Economic Area, you have the right to:` | `Kui sa asud Euroopa Majandusalal, on sul õigus:` |
| legal.privacy.rights.li1.strong | `Access` | `Juurdepääs` |
| legal.privacy.rights.li1.and | ` and ` | ` ja ` |
| legal.privacy.rights.li1.strong2 | `portability` | `edastatavus` |
| legal.privacy.rights.li1.middle | ` - download a JSON export of your profile and everything you submitted from the ` | ` - laadi alla JSON-eksport oma profiilist ja kõigest, mida sa esitasid, ` |
| legal.privacy.rights.li1.after | `.` | `.` |
| legal.privacy.rights.li2.strong | `Rectification` | `Parandamine` |
| legal.privacy.rights.li2.after | ` - correct your name, or change your e-mail address or phone number (each confirmed with a code).` | ` - paranda oma nime või muuda oma e-posti aadressi või telefoninumbrit (iga muudatus kinnitatakse koodiga).` |
| legal.privacy.rights.li3.strong | `Erasure` | `Kustutamine` |
| legal.privacy.rights.li3.middle | ` - delete your account from the ` | ` - kustuta oma konto ` |
| legal.privacy.rights.li3.after | `. Public submissions are orphaned rather than deleted, as described above.` | `. Avalikud esitused jäetakse kaardile ilma esitaja mainimiseta, mitte ei kustutata, nagu ülalpool kirjeldatud.` |
| legal.privacy.rights.li4.strong | `Restriction` | `Piiramine` |
| legal.privacy.rights.li4.and | ` and ` | ` ja ` |
| legal.privacy.rights.li4.strong2 | `objection` | `vastuväite esitamine` |
| legal.privacy.rights.li4.after | ` - contact the data protection contact below.` | ` - võta ühendust allpool toodud andmekaitse kontaktiga.` |
| legal.privacy.rights.p2 | `You can also complain to the Estonian Data Protection Inspectorate (Andmekaitse Inspektsioon).` | `Saad ka esitada kaebuse Eesti Andmekaitse Inspektsioonile (Andmekaitse Inspektsioon).` |
| legal.privacy.security.p1.before | `Your e-mail address and phone number are ` | `Sinu e-posti aadress ja telefoninumber on ` |
| legal.privacy.security.p1.strong | `encrypted at rest` | `salvestuses šifreeritud` |
| legal.privacy.security.p1.after | ` (AES-256-GCM). Lookups such as sign-in and duplicate checks run on a separate one-way index that cannot be turned back into your contact. Your password is stored as a one-way Argon2 hash. The encryption keys are kept outside the database and are never written into code or logs.` | ` (AES-256-GCM). Otsingud, nagu sisse logimine ja dubleerumise kontroll, toimuvad eraldi ühesuunalisel indeksil, mida ei saa tagasi muuta sinu kontaktiks. Sinu parool on salvestatud ühesuunalise Argon2 rätina. Šifrivõtmeid hoitakse andmebaasist väljas, ja neid kunagi ei kirjutata koodi ega logidesse.` |
| legal.privacy.security.p2 | `The application applies rate limits on verification codes, password resets and submissions, sends security headers on every response, and requires HTTPS for location access. No security measure can guarantee absolute safety, but these measures reduce common risks.` | `Rakendus rakendab piiranguid kinnituskoodidele, parooli lähtestamisele ja esitustele, saadab turvepäised iga vastusega ja nõuab asukohale ligipääsuks HTTPS-i. Ükski turvameetme ei suuda garanteerida absoluutset turvalisust, kuid need meetmed vähendavad tavalisi riske.` |
| legal.privacy.children.p1 | `OpenShelter is not directed at children and does not knowingly collect the personal data of children. The application does not currently check a user's age.` | `OpenShelter ei ole suunatud lastele ega kogu teadlikult laste isikuandmeid. Rakendus praegu ei kontrolli kasutaja vanust.` |
| legal.privacy.changes.p1 | `We may update this policy as the application evolves. The version on this page is the one in force when you read it. Material changes will be reflected in the "Last updated" date above.` | `Me võime uuendada seda poliitikat, kui rakendus areneb. Sellel lehel olev versioon on kehtiv hetkel, kui sa seda loed. Olulised muudatused kajastuvad ülalolevas kuupäevas "Viimati värskendatud".` |
| legal.privacy.contact.p1.before | `Questions about this policy or about your data can be sent to [CONTACT EMAIL], or to the data protection contact at [DATA PROTECTION CONTACT]. OpenShelter is also governed by the ` | `Küsimused selle poliitika või sinu andmete kohta saad saata aadressile [CONTACT EMAIL] või andmekaitse kontaktile aadressil [DATA PROTECTION CONTACT]. OpenShelterit reguleerivad lisaks ka ` |
| legal.privacy.contact.p1.after | `.` | `.` |
| legal.privacy.link.accountPage | `account page` | `kontolehelt` |
| legal.privacy.link.terms | `terms of use` | `kasutustingimused` |
| legal.terms.title | `Terms of use` | `Kasutustingimused` |
| legal.terms.updated | `Last updated: 13 September 2026` | `Viimati värskendatud: 13. september 2026` |
| legal.terms.emergencyNumber | `112` | `112` |
| legal.terms.acceptance | `Acceptance of these terms` | `Nende kasutustingimuste aktsepteerimine` |
| legal.terms.service | `What OpenShelter is` | `Mis on OpenShelter` |
| legal.terms.eligibility | `Eligibility and accounts` | `Kasutamisvõimalus ja kontod` |
| legal.terms.security | `Account security` | `Konto turvalisus` |
| legal.terms.rules | `Rules for contributions` | `Panuste reeglid` |
| legal.terms.prohibited | `Prohibited content and behaviour` | `Keelatud sisu ja käitumine` |
| legal.terms.license | `Intellectual property and your license` | `Intellektuaalomand ja sinu litsents` |
| legal.terms.moderation | `Moderation and removal` | `Modereerimine ja eemaldamine` |
| legal.terms.official | `Official versus community information` | `Ametlik versus kogukonna informatsioon` |
| legal.terms.emergency | `Emergency disclaimer` | `Hädaolukorra hoiatus` |
| legal.terms.warranty | `No warranty` | `Garantii puudumine` |
| legal.terms.liability | `Limitation of responsibility` | `Vastutuse piiramine` |
| legal.terms.thirdParty | `Third-party links and services` | `Kolmandate isikute lingid ja teenused` |
| legal.terms.availability | `Service availability and changes` | `Teenuse kättesaadavus ja muudatused` |
| legal.terms.source | `Open-source license` | `Avatud lähtekoodi litsents` |
| legal.terms.law | `Applicable law and disputes` | `Rakendatav õigus ja vaidlused` |
| legal.terms.contact | `Contact` | `Kontakt` |
| legal.terms.acceptance.p1 | `By using OpenShelter, you agree to these terms of use. If you do not agree, do not use the application. Continuing to use the application after a change means you accept the updated terms.` | `Kasutades OpenShelterit, nõustud sa nende kasutustingimustega. Kui sa ei nõustu, ära kasuta rakendust. Rakenduse kasutamine edasi pärast muudatust tähendab, et sa aktsepteerid uuendatud tingimused.` |
| legal.terms.service.p1 | `OpenShelter is an independent, community-maintained map of shelters and safe places in Estonia. It combines official open data from the Estonian Rescue Board (Päästeamet) with locations submitted by community members.` | `OpenShelter on sõltumatu, kogukonna poolt hooldatav kaart varjupaiku ja turvalisi kohti Eestis. See ühendab Eesti Päästeameti ametlikud avandmed kogukonnaliikmete poolt esitatud asukohtadega.` |
| legal.terms.service.p2.before | `OpenShelter is ` | `OpenShelter ` |
| legal.terms.service.p2.strong | `not an official emergency service` | `ei ole ametlik hädaabiteenus` |
| legal.terms.service.p2.middle | ` and not a government service. In an emergency, call ` | ` ega valitsuslik teenus. Hädaolukorras helista ` |
| legal.terms.service.p2.after | ` and follow the instructions of the Estonian Rescue Board, local authorities and emergency services.` | ` ja järgi Eesti Päästeameti, kohalike võimude ja hädaabiteenuste juhiseid.` |
| legal.terms.eligibility.p1 | `You may browse the map without an account. To submit shelters or reports you need an account, and the account becomes contributing after you verify both your e-mail address and your phone number with one-time codes. You are responsible for the accuracy of the contacts you register.` | `Kaarti saab vaadata ilma kontota. Varjupaiku või teateid esitamiseks vajad kontot, ja konto saab sisu esitada alles pärast seda, kui oled ühekordsete koodidega kinnitanud nii oma e-posti aadressi kui ka telefoninumbri. Sa vastutad registreeritud kontaktide õigsuse eest.` |
| legal.terms.security.p1 | `You are responsible for keeping your password safe and for everything done through your account. Do not share your password or your one-time verification codes. If you believe your account has been compromised, reset your password.` | `Sa vastutad oma parooli turvalise hoidmise eest ja kõige eest, mis tehakse sinu kaudu konto kaudu. Ära jaga oma parooli ega ühekordseid kinnituskoodid. Kui sa arvad, et sinu konto on kompromiteeritud, lähtesta oma parool.` |
| legal.terms.rules.li1 | `Submit only places you know to exist, with details accurate to the best of your knowledge.` | `Esita ainult kohti, mille olemasolest sa tead, detailidega, mis on parima teadmise järgi täpsed.` |
| legal.terms.rules.li2 | `Report locations (as closed, inaccurate, or no longer existing) truthfully and only from what you actually know.` | `Teata asukohtadest (suletud, ebatäpne või enam olemasolematu) ausalt ja ainult selle põhjal, mida sa tegelikult tead.` |
| legal.terms.rules.li3 | `Do not submit a private home as a public shelter. If you submit a location that is a private home, declare it as such.` | `Ära esita erakodu avaliku varjupaigana. Kui sa esitad asukoha, mis on erakodu, märki seda.` |
| legal.terms.rules.li4 | `The application applies limits to keep the list usable: a daily cap on submissions, a cap on how often one-time codes may be requested, and detection of near-duplicate submissions. Exceeding a limit produces an error and a suggested wait; it is not a ban.` | `Rakendus rakendab piiranguid, et nimekik jääks kasutatavaks: päevane piirang esitustele, piirang sellele, kui sageli ühekordseid koodid on võimalik taotleda, ja sarnaste dubleerivate esituste tuvastamine. Piirangu ületamine annab vea ja soovituse, kui kaua oodata; see ei ole keel.` |
| legal.terms.prohibited.p1 | `You must not:` | `Sul ei tohi:` |
| legal.terms.prohibited.li1 | `submit false, misleading, unsafe or malicious shelter data or reports;` | `esitada valelikku, eksitavat, ohtlikku või pahatahtlikku varjupaikade andmeid või teateid;` |
| legal.terms.prohibited.li2 | `submit private homes as public shelters without declaring them as private;` | `esitada erakoju avaliku varjupaigana, ilma et oleks neid eraomanina deklareeritud;` |
| legal.terms.prohibited.li3 | `spam, automate access, or attempt to attack or overload the application;` | `spämmida, automatiseerida ligipääsu või püüda rünnata või üle koormata rakendust;` |
| legal.terms.prohibited.li4 | `attempt to access another user's account or the administrator functions;` | `püüda ligipääseda teise kasutaja kontole või haldurifunktsioonidele;` |
| legal.terms.prohibited.li5 | `submit content that is unlawful, defamatory, or that exposes someone's private data.` | `esitada sisu, mis on seadusvastane, hävastav või mis paljastab kellegi isikuandmeid.` |
| legal.terms.prohibited.p2 | `Deliberately false or misleading shelter data is abuse of the service and may lead to removal of content or suspension of your account.` | `Tahtlikult valelik või eksitav varjupaikade andmed on teenuse kuritarvitamine ja võivad viia sisu eemaldamiseni või sinu konto peatamiseni.` |
| legal.terms.license.p1 | `By submitting a shelter or report, you grant OpenShelter a non-exclusive, worldwide, royalty-free license to store, display and modify that content for the purpose of operating the map and moderating it. You keep ownership of what you submit, and you can edit or remove your own shelters.` | `Esitades varjupaiga või teatamise, annad sa OpenShelterile mittesäraliku, maailmalaadse, tasuta litsentsi salvestada, kuvada ja muuta seda sisu kaardi haldamise ja modereerimise eesmärgil. Sa hoiad omandiõiguse esitatule, ja saad oma varjupaiku muuta või eemaldada.` |
| legal.terms.moderation.p1 | `Submissions enter the list as community reports. Moderators can review, hide, correct or remove user-submitted content, and can suspend accounts that abuse the service. A submission can therefore be reviewed, hidden or rejected.` | `Esitused sisenevad nimekikku kogukonna teatamisena. Moderaatorid saavad kasutajate esitatud sisu vaadata, peita, parandada või eemaldada, ja saavad peatada kontosid, mis kuritarvitavad teenust. Seega võib esitust vaadata üle, peita või tagasi lükata.` |
| legal.terms.official.p1.before | `The application distinguishes between information sources. Locations marked as "Registry" come from official open data. Locations marked "Newly added" or "Community-checked" were submitted by community members. A ` | `Rakendus eristab informatsiooniallikaid. Asukohad, millel on märge "Registry" (register), pärinevad ametlikest avandmetest. Asukohad märgetega "Newly added" (uus) või "Community-checked" (kogukonna poolt kinnitatud) on esitanud kogukonnaliikmete poolt. ` |
| legal.terms.official.p1.em | `verified user` | `kinnitatud kasutaja` |
| legal.terms.official.p1.middle | ` has proved ownership of an e-mail address and a phone number; that says nothing about the accuracy of what they submit. ` | `on tõestanud, et on e-posti aadressi ja telefoninumbri omanik; see midagi ei ütle selle täpsuse kohta, mida ta esitab. ` |
| legal.terms.official.p1.strong | `A verified user is not a verified shelter.` | `Kinnitatud kasutaja ei ole kinnitatud varjupaik.` |
| legal.terms.official.p2 | `A community-submitted location is not automatically a safe, legal, accessible, public or operational shelter. Treat community submissions with caution, especially during an emergency.` | `Kogukonna poolt esitatud asukoht ei ole automaatselt turvaline, seaduslik, ligipääsetav, avalik või töötav varjupaik. Kohtle kogukonna esitusi ettevaatlikult, eriti hädaolukorras.` |
| legal.terms.emergency.p1.before | `OpenShelter is not an emergency service and must not be your only source of emergency information. Official instructions from the Estonian Rescue Board, local authorities and emergency services always take priority over anything shown in this application. In an emergency, call ` | `OpenShelter ei ole hädaabiteenus ega tohi olla sinu ainus hädaolukorra infoallikas. Eesti Päästeameti, kohalike võimude ja hädaabiteenuste ametlikud juhised on alati olulisemad kui miski, mida see rakendus näitab. Hädaolukorras helista ` |
| legal.terms.emergency.p1.after | `.` | `.` |
| legal.terms.emergency.p2 | `Do not enter private property or abandoned buildings based only on information shown by OpenShelter.` | `Ära siseni eraomandisse või hülgatud hoone ainult OpenShelteri poolt näidatud teabe põhjal.` |
| legal.terms.warranty.p1 | `The list is provided as-is, for community benefit, without warranty of any kind. We do not guarantee that any location is open, safe, accessible, available, suitable or still operational.` | `Nimekik esitatakse sellisena, nagu see on, kogukonna heaks, ilma igasuguse garantiita. Me ei garanteeri, et ükski asukoht on avatud, turvaline, ligipääsetav, olemas, sobiv või endiselt töös.` |
| legal.terms.liability.p1 | `To the extent permitted by law, OpenShelter accepts no liability for decisions made in reliance on the list. This paragraph is intended to be reasonable and is subject to legal review; it does not attempt to exclude liability that cannot be excluded by law.` | `Selles ulatuses, mida õigus lubab, ei võta OpenShelter vastutust otsuste eest, mille tehakse nimekikule tuginedes. See lõik on mõeldud olema mõistlik ja on õigusliku läbivaatamise all; see ei püüa välistada vastutust, mida õigus ei lase välistada.` |
| legal.terms.thirdParty.p1.before | `The application links to external services, including the Estonian Rescue Board, Maa-amet and OpenStreetMap. We are not responsible for the content or availability of those services. How personal data is shared with service providers is described in the ` | `Rakendus viitab välistele teenustele, sealhulgas Eesti Päästeamet, Maa-amet ja OpenStreetMap. Me ei vastuta nende teenuste sisu ega kättesaadavuse eest. Kuidas isikuandmeid teenusepakkujatega jagatakse, on kirjeldatud ` |
| legal.terms.thirdParty.p1.link | `privacy policy` | `privaatsuspoliitikas` |
| legal.terms.thirdParty.p1.after | `.` | `.` |
| legal.terms.availability.p1 | `The application is provided free of charge and may change or be unavailable at any time without notice. We may add, change or remove features.` | `Rakendus on tasuta ja seda võib muuta või see võib olla mistahes ajal kättesaamatu ilma etteaveta. Me võime lisada, muuta või eemaldada funktsioone.` |
| legal.terms.source.p1 | `The OpenShelter source code is available under the MIT License. This governs the source code, not the shelter data, which remains subject to its own sources and to these terms.` | `OpenShelteri lähtekood on kättesaadav litsentsi MIT all. See reguleerib lähtekoodi, mitte varjupaikade andmeid, mis jäävad alluvateks oma allikatele ja neile tingimustele.` |
| legal.terms.law.p1 | `These terms are governed by [APPLICABLE LAW TO BE CONFIRMED]. Disputes will be resolved in [DISPUTE RESOLUTION TO BE CONFIRMED].` | `Need tingimused on alluvad [APPLICABLE LAW TO BE CONFIRMED]. Vaidlused lahendatakse [DISPUTE RESOLUTION TO BE CONFIRMED].` |
| legal.terms.contact.p1.before | `Questions about these terms can be sent to [CONTACT EMAIL]. OpenShelter is also governed by the ` | `Küsimused nende tingimuste kohta saad saata aadressile [CONTACT EMAIL]. OpenShelterit reguleerib lisaks ka ` |
| legal.terms.contact.p1.link | `privacy policy` | `privaatsuspoliitika` |
| legal.terms.contact.p1.after | `.` | `.` |

### Full listing — RU (187 keys)

| Key | English | Value |
| --- | --- | --- |
| legal.toc.aria | `Table of contents` | `Содержание` |
| legal.privacy.title | `Privacy policy` | `Политика конфиденциальности` |
| legal.privacy.updated | `Last updated: 16 September 2026` | `Последнее обновление: 16 сентября 2026 г.` |
| legal.privacy.who | `Who operates OpenShelter` | `Кто управляет OpenShelter` |
| legal.privacy.scope | `Scope of this policy` | `Область применения политики` |
| legal.privacy.collect | `What personal data we collect` | `Какие персональные данные мы собираем` |
| legal.privacy.why | `Why we process each category` | `Почему мы обрабатываем каждую категорию` |
| legal.privacy.verification | `Account creation and verification` | `Создание аккаунта и подтверждение` |
| legal.privacy.location | `Location and geolocation` | `Местоположение и геолокация` |
| legal.privacy.content | `User-generated content` | `Содержание, создаваемое пользователями` |
| legal.privacy.cookies | `Cookies and browser storage` | `Файлы cookie и хранилище браузера` |
| legal.privacy.thirdParties | `Third-party service providers` | `Сторонние поставщики услуг` |
| legal.privacy.sharing | `Data sharing` | `Передача данных` |
| legal.privacy.retention | `Data retention` | `Хранение данных` |
| legal.privacy.rights | `Your rights under the GDPR` | `Ваши права в соответствии с Общим регламентом по защите данных (GDPR)` |
| legal.privacy.security | `Data security` | `Безопасность данных` |
| legal.privacy.children | `Children` | `Дети` |
| legal.privacy.changes | `Changes to this policy` | `Изменения в политике` |
| legal.privacy.contact | `Contact` | `Контакт` |
| legal.privacy.who.p1 | `OpenShelter is an open-source, community-maintained map of shelters and safe places in Estonia. It is operated by [OPERATOR LEGAL NAME], [POSTAL ADDRESS]. The data protection contact is [DATA PROTECTION CONTACT].` | `OpenShelter — карта убежищ и безопасных мест в Эстонии с открытым исходным кодом, поддерживаемая сообществом. Оператор: [OPERATOR LEGAL NAME], [POSTAL ADDRESS]. Контакт по защите данных: [DATA PROTECTION CONTACT].` |
| legal.privacy.who.p2.before | `OpenShelter is ` | `OpenShelter ` |
| legal.privacy.who.p2.strong | `not an official government service` | `не является официальным государственным сервисом` |
| legal.privacy.who.p2.after | ` and not an emergency service. Official shelter data shown in the application is imported from the Estonian Rescue Board (Päästeamet) open data, but the application itself is operated independently.` | ` и не является аварийной службой. Официальные данные об убежищах, отображаемые в приложении, импортируются из открытых данных Спасательного департамента (Päästeamet), при этом само приложение управляется независимо.` |
| legal.privacy.scope.p1 | `This policy describes how OpenShelter collects, uses, stores and deletes personal data when you use the web application. It is intended to describe the application's actual behaviour. It does not apply to the external websites we link to (the Estonian Rescue Board, Maa-amet and OpenStreetMap).` | `Настоящая политика описывает, как OpenShelter собирает, использует, хранит и удаляет персональные данные при использовании веб-приложения. Она призвана описывать фактическое поведение приложения. Она не распространяется на внешние веб-сайты, на которые мы даём ссылки (Спасательный департамент, Maa-amet и OpenStreetMap).` |
| legal.privacy.collect.p1 | `We collect only what the application needs to work. When you create an account we store:` | `Мы собираем только то, что нужно для работы приложения. При создании аккаунта мы храним:` |
| legal.privacy.collect.li1.before | `your ` | `ваше ` |
| legal.privacy.collect.li1.strong | `full name` | `полное имя` |
| legal.privacy.collect.li1.after | `;` | `;` |
| legal.privacy.collect.li2.before | `your ` | `ваш ` |
| legal.privacy.collect.li2.strong | `e-mail address` | `адрес e-mail` |
| legal.privacy.collect.li2.after | `;` | `;` |
| legal.privacy.collect.li3.before | `your ` | `ваш ` |
| legal.privacy.collect.li3.strong | `phone number` | `номер телефона` |
| legal.privacy.collect.li3.after | `;` | `;` |
| legal.privacy.collect.li4.before | `your ` | `ваш ` |
| legal.privacy.collect.li4.strong | `password` | `пароль` |
| legal.privacy.collect.li4.after | `, stored only as a one-way hash.` | `, который хранится только в виде одностороннего хеша.` |
| legal.privacy.collect.p2.before | `We do ` | `Мы ` |
| legal.privacy.collect.p2.strong | `not` | `не` |
| legal.privacy.collect.p2.middle | ` collect a national identification code, and we do not use advertising, analytics or cross-site tracking. When you contribute to the map we store the content you submit (shelters and reports), as described under ` | `собираем национальный код личности и не используем рекламу, аналитику и межсайтовое отслеживание. Когда вы вносите вклад в карту, мы храним содержимое, которое вы отправляете (убежища и сообщения), как описано в разделе ` |
| legal.privacy.collect.p2.link | `user-generated content` | `содержании, создаваемом пользователями` |
| legal.privacy.collect.p2.after | `.` | `.` |
| legal.privacy.why.p1 | `Each category is processed for a specific purpose, and for no other purpose:` | `Каждая категория обрабатывается для конкретной цели и ни для каких иных целей:` |
| legal.privacy.why.li1.strong | `Name` | `Имя` |
| legal.privacy.why.li1.after | ` - shown on your account and, for public submissions, on the map.` | ` - отображается на вашем аккаунте и, для публичных публикаций, на карте.` |
| legal.privacy.why.li2.strong | `E-mail address` | `Адрес e-mail` |
| legal.privacy.why.li2.after | ` - account verification, password resets and cross-channel confirmation when you change your phone number.` | ` - подтверждение аккаунта, сброс пароля и межканальное подтверждение при смене номера телефона.` |
| legal.privacy.why.li3.strong | `Phone number` | `Номер телефона` |
| legal.privacy.why.li3.after | ` - account verification, sign-in and cross-channel confirmation when you change your e-mail address.` | ` - подтверждение аккаунта, вход и межканальное подтверждение при смене адреса e-mail.` |
| legal.privacy.why.li4.strong | `Password` | `Пароль` |
| legal.privacy.why.li4.after | ` - authentication. It is stored only as a one-way hash, so it can never be read back.` | ` - аутентификация. Хранится только как односторонний хеш, поэтому его невозможно прочитать обратно.` |
| legal.privacy.why.li5.strong | `Submitted content` | `Отправленное содержимое` |
| legal.privacy.why.li5.after | ` - shown on the public map and used by administrators for moderation and abuse prevention.` | ` - отображается на публичной карте и используется администраторами для модерации и предотвращения злоупотреблений.` |
| legal.privacy.why.p2 | `The legal basis for each purpose is [LEGAL BASIS TO BE CONFIRMED]. This document is intended to describe the processing; it is not a legal opinion.` | `Правовое основание для каждой цели — [LEGAL BASIS TO BE CONFIRMED]. Настоящий документ призван описывать обработку; он не является юридическим заключением.` |
| legal.privacy.verification.p1 | `You may browse the map without an account. To submit shelters or reports you must create an account and verify both your e-mail address and your phone number. Verification works by sending a one-time code to each contact; until both are verified you can sign in but cannot contribute.` | `Картой можно пользоваться без аккаунта. Чтобы отправлять убежища или сообщения, нужно создать аккаунт и подтвердить одноразовыми кодами и адрес e-mail, и номер телефона. Подтверждение работает так: на каждый контакт отправляется одноразовый код; пока оба не подтверждены, вы можете входить, но не можете отправлять содержимое.` |
| legal.privacy.verification.p2 | `Password resets are performed by a one-time code sent to your e-mail address. Changing your e-mail address is confirmed with a code sent to your current phone number, and changing your phone number is confirmed with a code sent to your current e-mail address.` | `Сброс пароля выполняется одноразовым кодом, который отправляется на ваш адрес e-mail. Смена адреса e-mail подтверждается кодом, отправленным на ваш текущий номер телефона, а смена номера телефона — кодом, отправленным на ваш текущий адрес e-mail.` |
| legal.privacy.verification.p3 | `To prevent abuse, the application applies rate limits on code requests and on shelter submissions, and detects near-duplicate submissions. Exceeding a limit produces an error, not a ban.` | `Для предотвращения злоупотреблений приложение применяет ограничения на запросы кодов и на отправку убежищ и обнаруживает близкие дубликаты. Превышение ограничения приводит к ошибке, а не к блокировке.` |
| legal.privacy.location.p1.before | `We only ever see your location when ` | `Мы видим ваше местоположение только тогда, когда ` |
| legal.privacy.location.p1.em | `you` | `вы` |
| legal.privacy.location.p1.after | ` ask for it. The "Show shelters around you" button and the "Use my location" option on the submit form first show your browser's own permission prompt. If you decline, nothing changes.` | ` просите о нём. Кнопка «Показать укрытия рядом с вами» и опция «Моё местоположение» в форме отправки сначала показывают запрос разрешения самого вашего браузера. Если вы откажетесь, ничего не изменится.` |
| legal.privacy.location.p2.before | `On the map, the nearest shelter is worked out ` | `На карте ближайшее убежище определяется ` |
| legal.privacy.location.p2.strong | `inside your browser` | `внутри вашего браузера` |
| legal.privacy.location.p2.after | `; your live position is never sent to our servers. If you submit a shelter at your position, only the coordinate you choose is stored, as part of that submission.` | `; ваше фактическое местоположение никогда не отправляется на наши серверы. Если вы отправляете убежище в своём местоположении, сохраняется только выбранная вами координата как часть этой отправки.` |
| legal.privacy.location.p3.before | `We ` | `Мы ` |
| legal.privacy.location.p3.strong | `never` | `никогда` |
| legal.privacy.location.p3.after | ` infer your location from your IP address. Address search uses the OpenStreetMap Nominatim service; a search request is sent only when you deliberately search for an address.` | `вычисляем ваше местоположение по вашему IP-адресу. Поиск адресов использует геокодер Nominatim от OpenStreetMap; запрос поиска отправляется только тогда, когда вы целенаправленно ищете адрес.` |
| legal.privacy.content.p1.before | `When you contribute, the application stores your shelters and your reports (for example, that a location is closed, inaccurate, or no longer exists). This content becomes part of the public community map. You can edit or remove your own shelters from the ` | `Когда вы вносите вклад, приложение хранит ваши убежища и ваши сообщения (например, что место закрыто, указано неточно или больше не существует). Это содержимое становится частью публичной карты сообщества. Свои убежища вы можете редактировать или удалять ` |
| legal.privacy.content.p1.after | `; reports are reviewed by administrators.` | `; сообщения рассматриваются администраторами.` |
| legal.privacy.content.p2 | `Moderators can review, hide, correct or remove user-submitted content. The application keeps a moderation record so decisions can be audited.` | `Модераторы могут рассматривать, скрывать, исправлять или удалять содержимое, отправленное пользователями. Приложение хранит запись о модерации, чтобы решения можно было проверить.` |
| legal.privacy.cookies.p1 | `OpenShelter does not use advertising cookies. It stores only the following items in your browser's local storage, each of which is technically necessary:` | `OpenShelter не использует файлы cookie для рекламы. В локальном хранилище вашего браузера хранятся только следующие элементы, каждый из которых технически необходим:` |
| legal.privacy.cookies.li1.before | `a ` | `один ` |
| legal.privacy.cookies.li1.strong | `sign-in token` | `токен входа` |
| legal.privacy.cookies.li1.after | ` that keeps you logged in across page reloads;` | `, который держит вас в системе между перезагрузками страниц;` |
| legal.privacy.cookies.li2.before | `your ` | `ваши ` |
| legal.privacy.cookies.li2.strong | `language preference` | `языковые настройки` |
| legal.privacy.cookies.li2.after | ` (Estonian or English);` | ` (эстонский или английский);` |
| legal.privacy.cookies.li3.before | `your ` | `ваши ` |
| legal.privacy.cookies.li3.strong | `display preference` | `настройки отображения` |
| legal.privacy.cookies.li3.after | ` (high-contrast mode).` | ` (режим высокой контрастности).` |
| legal.privacy.cookies.p2 | `Your access token is held in memory only and is discarded when you close the tab. No third party receives these items, and there are no optional analytics or tracking technologies to accept or reject.` | `Ваш токен доступа удерживается только в памяти и уничтожается, когда вы закрываете вкладку. Ни одна третья сторона не получает эти элементы, и не существует необязательных аналитических или отслеживающих технологий, которые следовало бы принимать или отклонять.` |
| legal.privacy.thirdParties.p1 | `We use a small number of third-party services, each only to deliver a specific function:` | `Мы используем небольшое количество сторонних сервисов, каждый — только для выполнения конкретной функции:` |
| legal.privacy.thirdParties.li1.before | `an ` | `одна ` |
| legal.privacy.thirdParties.li1.strong | `e-mail delivery service` | `услуга доставки e-mail` |
| legal.privacy.thirdParties.li1.after | ` (SendPulse, via SMTP) to send verification and password-reset codes. It receives the destination e-mail address to deliver the message.` | ` (SendPulse, по SMTP) для отправки кодов подтверждения и кодов сброса пароля. Она получает адрес e-mail получателя для доставки сообщения.` |
| legal.privacy.thirdParties.li2.before | `a ` | `один ` |
| legal.privacy.thirdParties.li2.strong | `text-message service` | `сервис текстовых сообщений` |
| legal.privacy.thirdParties.li2.after | ` (Twilio) to send verification codes. It receives the destination phone number to deliver the message.` | ` (Twilio) для отправки кодов подтверждения. Он получает номер телефона получателя для доставки сообщения.` |
| legal.privacy.thirdParties.li3.strong | `OpenStreetMap` | `OpenStreetMap` |
| legal.privacy.thirdParties.li3.after | ` map tiles and the Nominatim geocoding service, which receive the map area you view or the address you search for.` | ` — картографические тайлы и геокодер Nominatim, которые получают область карты, которую вы просматриваете, или адрес, который вы ищете.` |
| legal.privacy.thirdParties.p2 | `The official shelter data is imported from the Estonian Rescue Board (Päästeamet) open data; that is an inbound data source, not a service we send your data to. Whether any of these providers involves an international transfer is [TO BE CONFIRMED].` | `Официальные данные об убежищах импортируются из открытых данных Спасательного департамента (Päästeamet); это входящий источник данных, а не сервис, на который мы отправляем ваши данные. Влечёт ли какой-либо из этих поставщиков международную передачу данных — [TO BE CONFIRMED].` |
| legal.privacy.sharing.p1 | `We do not sell your personal data and do not share it for advertising or any other commercial purpose. The only disclosures are to the service providers listed above, in order to deliver the messages you request. Shelter data you submit becomes part of the public community list; after you delete your account, public submissions remain on the map without attribution.` | `Мы не продаём ваши персональные данные и не передаём их в рекламных или иных коммерческих целях. Единственные раскрытия данных — перечисленным выше поставщикам услуг, в целях доставки сообщений, которые вы запрашиваете. Данные об убежищах, которые вы отправляете, становятся частью публичного списка сообщества; после удаления аккаунта публичные публикации остаются на карте без указания автора.` |
| legal.privacy.retention.p1 | `Your account data is kept for as long as your account exists. Deleting your account removes your personal data immediately: shelters you declared as a private home are removed, and public shelters you submitted stay on the map without a submitter.` | `Данные вашего аккаунта хранятся, пока существует ваш аккаунт. Удаление аккаунта немедленно удаляет ваши персональные данные: убежища, которые вы указали как частное жильё, удаляются, а публичные убежища, которые вы отправили, остаются на карте без указания отправителя.` |
| legal.privacy.retention.p2.before | `We also apply fixed retention periods: an account with no sign-in activity (registration, login, or session refresh) for ` | `Мы также устанавливаем фиксированные сроки хранения: аккаунт, в котором нет активности входа (регистрация, вход или обновление сессии) в течение ` |
| legal.privacy.retention.p2.strong | `24 months` | `24 месяца` |
| legal.privacy.retention.p2.middle | ` is deleted with the same erasure rule as account deletion, and moderation and audit records older than ` | `удаляется по тому же правилу удаления, что и при удалении аккаунта, а записи о модерации и аудите старше ` |
| legal.privacy.retention.p2.strong2 | `24 months` | `24 месяца` |
| legal.privacy.retention.p2.after | ` are removed.` | `удаляются.` |
| legal.privacy.retention.p3.before | `Those periods are the app's retention rule. The scheduled job that enforces them is a deployment-level switch (` | `Эти сроки — правило хранения приложения. Планируемое задание, которое их исполняет, — это переключатель на уровне развёртывания (` |
| legal.privacy.retention.p3.code | `RETENTION_ENABLED` | `RETENTION_ENABLED` |
| legal.privacy.retention.p3.after | `): it is off in this repository's development setup, and it is enabled by whoever operates a deployment. In a deployment where the job is off, inactive accounts and old audit records are simply kept.` | `): в конфигурации разработки этого репозитория он выключен, а включает его тот, кто эксплуатирует развёртывание. В развёртывании, где задание выключено, неактивные аккаунты и старые записи аудита просто сохраняются.` |
| legal.privacy.retention.p4 | `Public community submissions are never removed automatically: they stay on the map without attribution until a moderator removes them.` | `Публичные публикации сообщества никогда не удаляются автоматически: они остаются на карте без указания автора, пока модератор их не удалит.` |
| legal.privacy.rights.p1 | `If you are in the European Economic Area, you have the right to:` | `Если вы находитесь в Европейской экономической зоне, вы имеете право:` |
| legal.privacy.rights.li1.strong | `Access` | `Доступ` |
| legal.privacy.rights.li1.and | ` and ` | ` и ` |
| legal.privacy.rights.li1.strong2 | `portability` | `переносимость` |
| legal.privacy.rights.li1.middle | ` - download a JSON export of your profile and everything you submitted from the ` | ` - загрузите JSON-экспорт вашего профиля и всего, что вы отправили, с ` |
| legal.privacy.rights.li1.after | `.` | `.` |
| legal.privacy.rights.li2.strong | `Rectification` | `Исправление` |
| legal.privacy.rights.li2.after | ` - correct your name, or change your e-mail address or phone number (each confirmed with a code).` | ` - исправьте своё имя или измените адрес e-mail или номер телефона (каждая смена подтверждается кодом).` |
| legal.privacy.rights.li3.strong | `Erasure` | `Удаление` |
| legal.privacy.rights.li3.middle | ` - delete your account from the ` | ` - удалите свой аккаунт с ` |
| legal.privacy.rights.li3.after | `. Public submissions are orphaned rather than deleted, as described above.` | `. Публичные публикации не удаляются, а остаются на карте без указания автора, как описано выше.` |
| legal.privacy.rights.li4.strong | `Restriction` | `Ограничение` |
| legal.privacy.rights.li4.and | ` and ` | ` и ` |
| legal.privacy.rights.li4.strong2 | `objection` | `возражение` |
| legal.privacy.rights.li4.after | ` - contact the data protection contact below.` | ` - обратитесь к контакту по защите данных, указанному ниже.` |
| legal.privacy.rights.p2 | `You can also complain to the Estonian Data Protection Inspectorate (Andmekaitse Inspektsioon).` | `Вы также можете подать жалобу в Инспекцию по защите данных Эстонии (Andmekaitse Inspektsioon).` |
| legal.privacy.security.p1.before | `Your e-mail address and phone number are ` | `Ваш адрес e-mail и номер телефона ` |
| legal.privacy.security.p1.strong | `encrypted at rest` | `зашифрованы в состоянии покоя` |
| legal.privacy.security.p1.after | ` (AES-256-GCM). Lookups such as sign-in and duplicate checks run on a separate one-way index that cannot be turned back into your contact. Your password is stored as a one-way Argon2 hash. The encryption keys are kept outside the database and are never written into code or logs.` | ` (AES-256-GCM). Операции поиска, такие как вход и проверка дубликатов, выполняются по отдельному одностороннему индексу, который нельзя обратить обратно в ваши контактные данные. Ваш пароль хранится как односторонний хеш Argon2. Ключи шифрования хранятся вне базы данных и никогда не записываются в код или журналы.` |
| legal.privacy.security.p2 | `The application applies rate limits on verification codes, password resets and submissions, sends security headers on every response, and requires HTTPS for location access. No security measure can guarantee absolute safety, but these measures reduce common risks.` | `Приложение применяет ограничения на коды подтверждения, сброс пароля и отправку содержимого, отправляет заголовки безопасности в каждом ответе и требует HTTPS для доступа к местоположению. Ни одна мера безопасности не гарантирует абсолютной безопасности, но эти меры снижают типовые риски.` |
| legal.privacy.children.p1 | `OpenShelter is not directed at children and does not knowingly collect the personal data of children. The application does not currently check a user's age.` | `OpenShelter не предназначен для детей и не собирает персональные данные детей осознанно. В настоящее время приложение не проверяет возраст пользователя.` |
| legal.privacy.changes.p1 | `We may update this policy as the application evolves. The version on this page is the one in force when you read it. Material changes will be reflected in the "Last updated" date above.` | `Мы можем обновлять настоящую политику по мере развития приложения. Версия на этой странице является действующей в момент, когда вы её читаете. Существенные изменения будут отражены в дате «Последнее обновление» выше.` |
| legal.privacy.contact.p1.before | `Questions about this policy or about your data can be sent to [CONTACT EMAIL], or to the data protection contact at [DATA PROTECTION CONTACT]. OpenShelter is also governed by the ` | `Вопросы о настоящей политике или о ваших данных можно отправлять на [CONTACT EMAIL] или по контакту по защите данных [DATA PROTECTION CONTACT]. OpenShelter также регулируется ` |
| legal.privacy.contact.p1.after | `.` | `.` |
| legal.privacy.link.accountPage | `account page` | `страницы аккаунта` |
| legal.privacy.link.terms | `terms of use` | `условиями использования` |
| legal.terms.title | `Terms of use` | `Условия использования` |
| legal.terms.updated | `Last updated: 13 September 2026` | `Последнее обновление: 13 сентября 2026 г.` |
| legal.terms.emergencyNumber | `112` | `112` |
| legal.terms.acceptance | `Acceptance of these terms` | `Принятие настоящих условий` |
| legal.terms.service | `What OpenShelter is` | `Что такое OpenShelter` |
| legal.terms.eligibility | `Eligibility and accounts` | `Кому доступно приложение и аккаунты` |
| legal.terms.security | `Account security` | `Безопасность аккаунта` |
| legal.terms.rules | `Rules for contributions` | `Правила для публикаций` |
| legal.terms.prohibited | `Prohibited content and behaviour` | `Запрещённое содержимое и поведение` |
| legal.terms.license | `Intellectual property and your license` | `Интеллектуальная собственность и ваша лицензия` |
| legal.terms.moderation | `Moderation and removal` | `Модерация и удаление` |
| legal.terms.official | `Official versus community information` | `Официальные данные и данные сообщества` |
| legal.terms.emergency | `Emergency disclaimer` | `Оговорка о чрезвычайных ситуациях` |
| legal.terms.warranty | `No warranty` | `Отсутствие гарантии` |
| legal.terms.liability | `Limitation of responsibility` | `Ограничение ответственности` |
| legal.terms.thirdParty | `Third-party links and services` | `Сторонние ссылки и сервисы` |
| legal.terms.availability | `Service availability and changes` | `Доступность сервиса и изменения` |
| legal.terms.source | `Open-source license` | `Лицензия с открытым исходным кодом` |
| legal.terms.law | `Applicable law and disputes` | `Применимое право и споры` |
| legal.terms.contact | `Contact` | `Контакт` |
| legal.terms.acceptance.p1 | `By using OpenShelter, you agree to these terms of use. If you do not agree, do not use the application. Continuing to use the application after a change means you accept the updated terms.` | `Используя OpenShelter, вы принимаете настоящие условия использования. Если вы не согласны — не используйте приложение. Продолжение использования приложения после изменений означает принятие обновлённых условий.` |
| legal.terms.service.p1 | `OpenShelter is an independent, community-maintained map of shelters and safe places in Estonia. It combines official open data from the Estonian Rescue Board (Päästeamet) with locations submitted by community members.` | `OpenShelter — независимая карта убежищ и безопасных мест в Эстонии, поддерживаемая сообществом. Она сочетает официальные открытые данные Спасательного департамента (Päästeamet) с местами, отправленными членами сообщества.` |
| legal.terms.service.p2.before | `OpenShelter is ` | `OpenShelter ` |
| legal.terms.service.p2.strong | `not an official emergency service` | `не является официальной аварийной службой` |
| legal.terms.service.p2.middle | ` and not a government service. In an emergency, call ` | ` и не является государственным сервисом. В чрезвычайной ситуации звоните ` |
| legal.terms.service.p2.after | ` and follow the instructions of the Estonian Rescue Board, local authorities and emergency services.` | ` и следуйте указаниям Спасательного департамента, местных органов власти и аварийных служб.` |
| legal.terms.eligibility.p1 | `You may browse the map without an account. To submit shelters or reports you need an account, and the account becomes contributing after you verify both your e-mail address and your phone number with one-time codes. You are responsible for the accuracy of the contacts you register.` | `Картой можно пользоваться без аккаунта. Чтобы отправлять убежища или сообщения, нужен аккаунт, и аккаунт становится способным к публикациям после того, как вы подтвердите одноразовыми кодами и адрес e-mail, и номер телефона. Вы несёте ответственность за точность зарегистрированных контактов.` |
| legal.terms.security.p1 | `You are responsible for keeping your password safe and for everything done through your account. Do not share your password or your one-time verification codes. If you believe your account has been compromised, reset your password.` | `Вы несёте ответственность за сохранность вашего пароля и за всё, что выполняется через ваш аккаунт. Не сообщайте свой пароль и одноразовые коды подтверждения. Если вы считаете, что ваш аккаунт был скомпрометирован, сбросьте пароль.` |
| legal.terms.rules.li1 | `Submit only places you know to exist, with details accurate to the best of your knowledge.` | `Отправляйте только те места, о существовании которых вы знаете, с деталями, точными, насколько вам известно.` |
| legal.terms.rules.li2 | `Report locations (as closed, inaccurate, or no longer existing) truthfully and only from what you actually know.` | `Сообщайте о местах (как о закрытых, неточных или более не существующих) честно и только исходя из того, что вы действительно знаете.` |
| legal.terms.rules.li3 | `Do not submit a private home as a public shelter. If you submit a location that is a private home, declare it as such.` | `Не отправляйте частные жилые дома как публичные убежища. Если вы отправляете место, которое является частным жильём, укажите это.` |
| legal.terms.rules.li4 | `The application applies limits to keep the list usable: a daily cap on submissions, a cap on how often one-time codes may be requested, and detection of near-duplicate submissions. Exceeding a limit produces an error and a suggested wait; it is not a ban.` | `Приложение применяет ограничения, чтобы список оставался пригодным для использования: дневной лимит на публикации, лимит на частоту запросов одноразовых кодов и обнаружение близких дубликатов. Превышение лимита приводит к ошибке и рекомендованному времени ожидания; это не блокировка.` |
| legal.terms.prohibited.p1 | `You must not:` | `Вы не должны:` |
| legal.terms.prohibited.li1 | `submit false, misleading, unsafe or malicious shelter data or reports;` | `отправлять ложные, вводящие в заблуждение, небезопасные или вредоносные данные об убежищах или сообщения;` |
| legal.terms.prohibited.li2 | `submit private homes as public shelters without declaring them as private;` | `отправлять частные жилые дома как публичные убежища, не указав их как частные;` |
| legal.terms.prohibited.li3 | `spam, automate access, or attempt to attack or overload the application;` | `спамить, автоматизировать доступ или пытаться атаковать или перегрузить приложение;` |
| legal.terms.prohibited.li4 | `attempt to access another user's account or the administrator functions;` | `пытаться получить доступ к аккаунту другого пользователя или к функциям администратора;` |
| legal.terms.prohibited.li5 | `submit content that is unlawful, defamatory, or that exposes someone's private data.` | `отправлять содержимое, которое является незаконным, порочащим или раскрывающим чужие личные данные.` |
| legal.terms.prohibited.p2 | `Deliberately false or misleading shelter data is abuse of the service and may lead to removal of content or suspension of your account.` | `Намеренно ложные или вводящие в заблуждение данные об убежищах — это злоупотребление сервисом, которое может привести к удалению содержимого или приостановке вашего аккаунта.` |
| legal.terms.license.p1 | `By submitting a shelter or report, you grant OpenShelter a non-exclusive, worldwide, royalty-free license to store, display and modify that content for the purpose of operating the map and moderating it. You keep ownership of what you submit, and you can edit or remove your own shelters.` | `Отправляя убежище или сообщение, вы предоставляете OpenShelter неисключительную, мировую, бесплатную лицензию хранить, отображать и изменять это содержимое в целях эксплуатации карты и его модерации. Право собственности на отправленное остаётся за вами, и вы можете редактировать или удалять свои убежища.` |
| legal.terms.moderation.p1 | `Submissions enter the list as community reports. Moderators can review, hide, correct or remove user-submitted content, and can suspend accounts that abuse the service. A submission can therefore be reviewed, hidden or rejected.` | `Публикации попадают в список как сообщения сообщества. Модераторы могут рассматривать, скрывать, исправлять или удалять содержимое, отправленное пользователями, и могут приостанавливать аккаунты, которые злоупотребляют сервисом. Таким образом, публикация может быть рассмотрена, скрыта или отклонена.` |
| legal.terms.official.p1.before | `The application distinguishes between information sources. Locations marked as "Registry" come from official open data. Locations marked "Newly added" or "Community-checked" were submitted by community members. A ` | `Приложение различает источники информации. Места, отмеченные как «Реестр», — из официальных открытых данных. Места, отмеченные «Новое от сообщества» или «Подтверждено сообществом», — отправленные членами сообщества. ` |
| legal.terms.official.p1.em | `verified user` | `подтверждённый пользователь` |
| legal.terms.official.p1.middle | ` has proved ownership of an e-mail address and a phone number; that says nothing about the accuracy of what they submit. ` | `подтвердил владение адресом e-mail и номером телефона; это ничего не говорит о точности того, что он отправляет. ` |
| legal.terms.official.p1.strong | `A verified user is not a verified shelter.` | `Подтверждённый пользователь — не подтверждённое убежище.` |
| legal.terms.official.p2 | `A community-submitted location is not automatically a safe, legal, accessible, public or operational shelter. Treat community submissions with caution, especially during an emergency.` | `Место, отправленное сообществом, не является автоматически безопасным, законным, доступным, публичным или действующим убежищем. Относитесь к публикациям сообщества с осторожностью, особенно во время чрезвычайной ситуации.` |
| legal.terms.emergency.p1.before | `OpenShelter is not an emergency service and must not be your only source of emergency information. Official instructions from the Estonian Rescue Board, local authorities and emergency services always take priority over anything shown in this application. In an emergency, call ` | `OpenShelter не является аварийной службой и не должен быть вашим единственным источником информации о чрезвычайной ситуации. Официальные указания Спасательного департамента, местных органов власти и аварийных служб всегда имеют приоритет над всем, что отображается в этом приложении. В чрезвычайной ситуации звоните ` |
| legal.terms.emergency.p1.after | `.` | `.` |
| legal.terms.emergency.p2 | `Do not enter private property or abandoned buildings based only on information shown by OpenShelter.` | `Не входите на частную собственность и в заброшенные здания, опираясь только на информацию, отображаемую OpenShelter.` |
| legal.terms.warranty.p1 | `The list is provided as-is, for community benefit, without warranty of any kind. We do not guarantee that any location is open, safe, accessible, available, suitable or still operational.` | `Список предоставляется в том виде, в котором он есть, в интересах сообщества, без каких-либо гарантий. Мы не гарантируем, что какое-либо место открыто, безопасно, доступно, имеется, подходит или ещё функционирует.` |
| legal.terms.liability.p1 | `To the extent permitted by law, OpenShelter accepts no liability for decisions made in reliance on the list. This paragraph is intended to be reasonable and is subject to legal review; it does not attempt to exclude liability that cannot be excluded by law.` | `В той мере, в какой это допускается законом, OpenShelter не несёт ответственности за решения, принятые на основе списка. Настоящий пункт предназначен, чтобы быть разумным, и подлежит юридическому рассмотрению; он не пытается исключить ответственность, которую по закону нельзя исключить.` |
| legal.terms.thirdParty.p1.before | `The application links to external services, including the Estonian Rescue Board, Maa-amet and OpenStreetMap. We are not responsible for the content or availability of those services. How personal data is shared with service providers is described in the ` | `Приложение содержит ссылки на внешние сервисы, в том числе на Спасательный департамент, Maa-amet и OpenStreetMap. Мы не несём ответственности за содержимое или доступность этих сервисов. О том, как персональные данные передаются поставщикам услуг, описано в ` |
| legal.terms.thirdParty.p1.link | `privacy policy` | `политике конфиденциальности` |
| legal.terms.thirdParty.p1.after | `.` | `.` |
| legal.terms.availability.p1 | `The application is provided free of charge and may change or be unavailable at any time without notice. We may add, change or remove features.` | `Приложение предоставляется бесплатно и может измениться или стать недоступным в любой момент без уведомления. Мы можем добавлять, изменять или удалять функции.` |
| legal.terms.source.p1 | `The OpenShelter source code is available under the MIT License. This governs the source code, not the shelter data, which remains subject to its own sources and to these terms.` | `Исходный код OpenShelter доступен по лицензии MIT. Она регулирует исходный код, но не данные об убежищах, которые остаются подчинёнными собственным источникам и настоящим условиям.` |
| legal.terms.law.p1 | `These terms are governed by [APPLICABLE LAW TO BE CONFIRMED]. Disputes will be resolved in [DISPUTE RESOLUTION TO BE CONFIRMED].` | `Настоящие условия регулируются [APPLICABLE LAW TO BE CONFIRMED]. Споры разрешаются в [DISPUTE RESOLUTION TO BE CONFIRMED].` |
| legal.terms.contact.p1.before | `Questions about these terms can be sent to [CONTACT EMAIL]. OpenShelter is also governed by the ` | `Вопросы о настоящих условиях можно отправлять на [CONTACT EMAIL]. OpenShelter также регулируется ` |
| legal.terms.contact.p1.link | `privacy policy` | `политикой конфиденциальности` |
| legal.terms.contact.p1.after | `.` | `.` |

### Highest-uncertainty rows — ET

- legal.privacy.location.p3.strong — mitmugi (literary form of "never"); a native speaker would likely rephrase the whole "We never infer" sentence as Me ei järeldage kunagi … . The sentence is understandable as written.
- legal.privacy.collect.p2.middle — the splice reads Me ei … kogume …, ega kasuta … : the second verb is a 3rd-person form where 1st plural (kasutame) would be consistent. Formal register; flag for a native rephrase.
- legal.privacy.retention.p3.after — sisselülitab selle see, kes käitab deployt is a calque with awkward word order; deploy/deployt are IT loanwords (already used in the account admin copy).
- legal.privacy.thirdParties.p2 — importitud (past participle of importima) is correct but stiff.
- legal.terms.rules.li1 — detailidega, mis on parima teadmise järgi täpsed is a calque of "details accurate to the best of your knowledge"; more natural: oma teada täpsete detailidega.
- legal.terms.prohibited.li2 — ilma et oleks neid eraomanina deklareeritud is heavy; a native rephrase: ilma neid erakojana deklareerimata.
- legal.terms.license.p1 — maailmalaadse ("worldwide") is correct but rare; globaalse is an alternative.
- The whole privacy copy uses the formal sinu register (colloquial Estonian would use su) — a deliberate choice, to be confirmed by a native reviewer.
- legal.privacy.link.accountPage (kontolehelt) is a correct elative; it reads as a prepositional phrase ("from the account page") because that is how it is spliced.

### Highest-uncertainty rows — RU

- Päästeamet is translated as Спасательный департамент (original name kept in parentheses on first mention) — a native reviewer may prefer to leave the Estonian name untranslated.
- legal.terms.source.p1 — остаются подчинёнными собственным источникам is a heavy calque of "remains subject to its own sources"; a lawyer would likely rephrase.
- legal.terms.liability.p1 — Настоящий пункт предназначен, чтобы быть разумным is a literal "intended to be reasonable"; acceptable legal phrasing, stands out as a calque.
- legal.privacy.rights.p2 — Инспекция по защите данных Эстонии: the official Russian name of the Estonian Data Protection Inspectorate is not standardized; the chosen form is comprehensible.
- e-mail in Latin script follows the pre-existing catalog-wide convention (same as the earlier account/map work).
