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

- Legal pages (privacy/terms), guidance admin/blog, theme/accessibility dialogs —
  untouched by this change.
- Pre-existing ET/RU values outside the sweep (map, submit, admin, auth) — reviewed
  only where they quoted the around-you button or had a mechanical error (see the
  fixed table above).
