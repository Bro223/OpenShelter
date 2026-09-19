import type { Messages } from './messages';

/**
 * The Estonian catalog (i18n-et-en). The app's official data is
 * Estonian (Päästeamet registry, Maa-amet) and the whitepaper's
 * internationalization item reads "Estonian first" — this catalog is the
 * other half of the chrome. Brand name (OpenShelter) and the official
 * agency names (Päästeamet, Maa-amet) are proper nouns and stay as-is.
 */
export const ET: Messages = {
  'menu.aria': 'Menüü',
  'nav.map': 'Varjupaikade kaart',
  'nav.guidance': 'Juhised',
  'nav.account': 'Konto',
  'nav.admin': 'Haldus',
  'nav.skip': 'Liigu põhisisu juurde',

  'a11y.button': 'Kättesaadavus',
  'lang.label': 'Keel',
  'auth.logout': 'Logi välja',
  'auth.login': 'Logi sisse',
  'auth.register': 'Loo konto',

  // --- kättesaadavusdialog (kolm kontrastivalikut). Lähteväärtused —
  //  kõiki allpool olevaid trükiseid saab administraator muuta
  //  site_texts kaudu (I18nService kattekiht taganeb nendele
  //  väärtustele, kui muudatust rea pole).
  'a11y.popup.title': 'Kättesaadavus',
  'a11y.popup.body':
    'Vali, kuidas OpenShelter sulle näeb välja. Valik kehtib kohe ja salvestatakse sellesse seadmesse.',
  'a11y.option.default': 'Vaikimisi',
  'a11y.option.default.desc': 'Tavaline heleda välimus.',
  'a11y.option.highContrast': 'Kõrge kontrast',
  'a11y.option.highContrast.desc': 'Tume taust ja hele, selge kiri.',
  'a11y.option.blackYellow': 'Must-kollane',
  'a11y.option.blackYellow.desc':
    'Kollane kiri mustal taustal — madalale nägemisvõimele ja otsepäikesevalgusele.',
  'a11y.popup.footer':
    'Valik salvestatakse ainult sellesse seadmesse — seda ei jagata kellegi teisega.',
  'a11y.popup.close': 'Sulge',

  'footer.notice1':
    'OpenShelter on kogukonna poolt hooldatud nimekiri, mitte ametlik hädaabiteenus.',
  'footer.notice2': 'Hädaolukorras helista 112.',
  'footer.notice3': 'Ametlik teave varjupaikade kohta:',
  'footer.rescueBoard': 'Päästeamet',
  'footer.and': 'ja',
  'footer.ministry': 'Siseministeerium',
  'footer.dataSourceTransformed': 'OpenShelteri teisendatud (EPSG:3301 -> WGS84)',
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
  'title.admin': 'Haldus',
  'title.guidance': 'Kriisijuhtimine',
  'title.guidanceDetail': 'Juhise artikkel',

  // --- consent banner (first-level data-usage notice). The app has no
  // optional cookies, trackers or analytics, so this is a necessary-only
  // acknowledgment, not an accept/reject choice.
  'consent.aria': 'Küpsiste ja salvestusruumi teade',
  'consent.title': 'Küpsistest ja brauseri salvestusruumist',
  'consent.body':
    'OpenShelter salvestab ainult seda, mida ta toimimiseks vajab: sisselogimist hoidev seansitunnus ning sinu keele- ja kuvamiseelistused. Me ei kasuta reklaami, analüütikat ega ristsaidi jälgimist ega müü sinu andmeid. Need salvestatakse sinu brauseri kohalikku salvestusruumi, mitte reklaamiküpsistesse, ja on vajalikud selleks, et rakendus töötaks.',
  'consent.acknowledge': 'Sain aru',
  'consent.privacyLink': 'Loe privaatsuspoliitikat',

  // --- "Kuidas OpenShelter töötab" block (map page). The button quotes
  // follow the active-locale labels (the around-you CTA is translated);
  // the map BADGES (shared shelter-copy) are still English, so the
  // badge-word quotes keep the English word + the Estonian gloss.
  'how.title': 'Kuidas OpenShelter töötab',
  'how.what':
    'OpenShelter on sõltumatu, kogukonna hallatav Eesti varjupaikade kaart. See ei ole hädaabiteenus ega ametlik riigisüsteem. Hädaolukorras helista 112 ja järgi ametlikke juhiseid.',
  'how.sources':
    'Asukohad pärinevad kahest allikast. Ametlikud asukohad pärinevad Päästeameti avaandmetest ja neil on sinine märgis "Registry" (register). Kogukonna asukohad lisavad kinnitatud kontoga kasutajad; need kuvatakse märgisega "Newly added" (uus) seni, kuni teised kasutajad on need kinnitanud ("Community-checked" ehk kogukonna kinnitatud). Kogukonna esitus ei muutu kunagi automaatselt ametlikuks.',
  'how.report':
    'Kinnitatud kontoga kasutajad saavad lisada varjupaiga või teatada, et loetletud asukoht on suletud, ebatäpne või kadunud. Teated lähevad administraatoritele, kes need üle vaatavad ning võivad asukoha peita või parandada.',
  'how.nearest':
    'Nupp "Näita varjupaiku minu ümbruses" küsib brauserilt luba sinu asukoha kasutamiseks. Sinu asukohta kasutatakse ainult brauseri sees ega saadeta kunagi meie serveritesse. Võid selle asemel otsida ka aadressi järgi.',
  'how.guarantee':
    'OpenShelter ei saa tagada, et loetletud asukoht on avatud, turvaline, ligipääsetav, vaba või endiselt töökorras. Hädaolukorras järgi alati esmalt ametlikke juhiseid.',
  'how.exampleTitle': 'Näide',
  'how.example.1': 'Ametlik asukoht kuvatakse sinise märgise ja sildiga "Registry".',
  'how.example.2':
    'Kasutaja lisab võimaliku asukoha; see kuvatakse märgisega "Newly added" ja kinnitamata.',
  'how.example.3': 'Teine kasutaja teatab, et asukoht on suletud või ligipääsmatu.',
  'how.example.4': 'Administraator vaatab teate üle.',
  'how.example.5': 'Asukoht uuendatakse või peidetakse.',

  // --- auth pages (login / register / reset). Brand name and official
  // agency names stay as-is, as in the rest of the catalog.
  'authPage.login.title': 'Logi sisse',
  'authPage.login.subtitle':
    'Kasuta e-posti aadressi või telefoninumbrit, millega sa registreerusid.',
  'authPage.login.sessionExpired': 'Sinu seanss on aegunud. Palun logi uuesti sisse.',
  'authPage.login.resetOk': 'Sinu parool on lähtestatud. Logi sisse uue parooliga.',
  'authPage.login.contactLabel': 'E-post või telefon',
  'authPage.login.contactPlaceholder': 'sa@example.ee või +3725…',
  'authPage.login.contactRequired': 'E-post või telefon on kohustuslik.',
  'authPage.login.passwordLabel': 'Parool',
  'authPage.login.passwordRequired': 'Parool on kohustuslik.',
  'authPage.login.submitting': 'Sisse logitakse…',
  'authPage.login.submit': 'Logi sisse',
  'authPage.login.forgot': 'Unustasid parooli?',
  'authPage.login.noAccount': 'Pole veel kontot?',
  'authPage.login.createOne': 'Loo konto',

  'authPage.register.title': 'Konto loomine',
  'authPage.register.subtitle':
    'Anonüümne vaatamine on tasuta. Kinnitatud kontoga saad esitada varjupaiku ja teateid.',
  'authPage.register.createdTitle': 'Konto loodud',
  'authPage.register.createdBody':
    'Sinu konto on valmis. Palun logi sisse ja kinnita seejärel oma e-posti aadress, sinna saadetakse kinnituskood.',
  'authPage.register.nameLabel': 'Täisnimi',
  'authPage.register.nameRequired': 'Nimi on kohustuslik.',
  'authPage.register.emailLabel': 'E-post',
  'authPage.register.emailPlaceholder': 'sa@example.ee',
  'authPage.register.emailNote':
    'Saadame sinna sinule kinnituskoodi ja kasutame seda hiljem parooli lähtestamiseks.',
  'authPage.register.emailRequired': 'Kehtiv e-posti aadress on kohustuslik.',
  'authPage.register.phoneLabel': 'Telefon',
  'authPage.register.phonePlaceholder': '+3725… või 5xxxxxxx',
  'authPage.register.phoneNote':
    'Saadame sinna sinule kinnituskoodi; hiljem saad sellega ka sisse logida.',
  'authPage.register.phoneRequired': 'Telefon on kohustuslik.',
  'authPage.register.passwordLabel': 'Parool',
  'authPage.register.passwordRequired': 'Parool on kohustuslik.',
  'authPage.register.submitting': 'Kontot luuakse…',
  'authPage.register.submit': 'Loo konto',
  // The agreement line splices around the two links; the link labels take
  // the inessive -ga form because "nõustuda" governs it.
  'authPage.register.agreeLead': 'Konto loomisel nõustud',
  'authPage.register.agreeTerms': 'kasutustingimustega',
  'authPage.register.agreeAnd': 'ja',
  'authPage.register.agreePrivacy': 'privaatsuspoliitikaga',
  'authPage.register.agreeTail': '.',
  'authPage.register.haveAccount': 'Kas on juba konto?',

  'authPage.reset.title': 'Parooli lähtestamine',
  'authPage.reset.subtitle': 'Sisesta oma konto e-posti aadress ja saadame sulle 6-kohalise koodi.',
  'authPage.reset.emailLabel': 'E-post',
  'authPage.reset.emailPlaceholder': 'sa@example.ee',
  'authPage.reset.emailRequired': 'Kehtiv e-posti aadress on kohustuslik.',
  'authPage.reset.sending': 'Saadetakse…',
  'authPage.reset.sendIn': 'Saada saad {time} pärast',
  'authPage.reset.send': 'Saada mulle lähtestuskood',
  'authPage.reset.sentTitle': 'Kontrolli oma sissetulekut',
  'authPage.reset.sentBody':
    'Kui selle e-posti aadressiga konto on olemas, on sinna 6-kohaline kood saadetud.',
  'authPage.reset.codeLabel': 'Lähtestuskood',
  'authPage.reset.codePlaceholder': '6-kohaline kood',
  'authPage.reset.codeRequired': 'Sisesta e-kirjas olev 6-kohaline kood.',
  'authPage.reset.codeNote': 'Kood on kehtiv 15 minutit.',
  'authPage.reset.newPasswordLabel': 'Uus parool',
  'authPage.reset.newPasswordRequired': 'Parool on kohustuslik.',
  'authPage.reset.repeatLabel': 'Korda uus parool',
  'authPage.reset.repeatRequired': 'Palun korda parool.',
  'authPage.reset.mismatch': 'Paroolid ei klappi.',
  'authPage.reset.updating': 'Uuendatakse…',
  'authPage.reset.update': 'Määra uus parool',
  'authPage.reset.resendIn': 'Uuesti saada saad {time} pärast',
  'authPage.reset.resend': 'Saada kood uuesti',
  'authPage.reset.backToLogin': 'Tagasi sisse logimisele',

  'authPage.privacyPolicy': 'Privaatsuspoliitika',
  'authPage.termsOfUse': 'Kasutustingimused',

  // --- map page. The around-you CTA is translated (map.aroundYou); the
  // geocode copy quotes that Estonian label, as the how block does.
  'map.title': 'Varjupaikade kaart',
  'map.subtitle': 'Leia registreeritud ja kogukonna poolt lisatud varjupaiku Eestis.',
  'map.legend.registry': 'Register',
  'map.legend.new': 'Uus kogukonnalt',
  'map.legend.confirmed': 'Kogukonna poolt kinnitatud',
  'map.legend.reported': 'Teatatud',
  'map.geoNote':
    'Sinu brauser küsib esmalt luba. Asukohta ei saadeta kunagi meie serveritesse ja seda kasutatakse ainult lähima varjupaiga leidmiseks.',
  'map.aroundYou': 'Näita varjupaiku minu ümbruses',
  'map.locating': 'Sinu asukohta määratakse…',
  'map.anchorLabel': 'Leia varjupaikad aadressi lähedal',
  'map.anchorPlaceholder': 'Tänav või koht Eestis',
  'map.search': 'Otsi',
  'map.searching': 'Otsitakse…',
  'map.attributionLead': 'Aadressid:',
  'map.osmAttribution': '© OpenStreetMap kaasajajad',
  'map.addShelter': 'Lisa varjupaik',
  'map.nearestEmpty': 'Sinu ümbruses pole veel ühtegi loetletud asukohta.',
  'map.nearestEmpty.addFirst': 'Saad lisada esimese.',
  'map.searched': 'Otsitud:',
  'map.clear': 'Kustuta',
  'map.filter.all': 'Kõik',
  'map.filter.registry': 'Register',
  'map.filter.user': 'Kasutaja',
  'map.chipOpen': 'Avatud',
  'map.chipHasCapacity': 'On mahtu',
  'map.emptyFilter': 'Ükski varjupaik sellele filtrile ei sobi.',
  'map.loading': 'Laen varjupaiku…',
  'map.viewDetails': 'Vaata detaile',
  'map.viewDetailsFor': 'Vaata detaile: ',
  'map.nearest.denied':
    'Asukohaoiglus on välja lülitatud. Luba brauseris asukoha kasutamine ja proovi uuesti.',
  'map.nearest.timeout': 'Sinu asukoha määramine aegus. Proovi hetke pärast uuesti.',
  'map.nearest.unsupported':
    'Sinu brauser ei toeta asukoha kasutamist. Kontrolli brauseri seadeid.',
  'map.nearest.unavailable': 'Sinu asukohta ei saadud praegu määrata. Proovi hetke pärast uuesti.',
  'map.nearest.insecure': 'Asukoha kasutamine nõuab turvalist (https) ühendust.',
  'map.geocode.noResults':
    'Eesti aadressi ei leitud. Proovi teist aadressi või kasuta "Näita varjupaiku minu ümbruses".',
  'map.geocode.rateLimited': 'Aadressiotsing on koormatud. Palun oota hetke ja proovi uuesti.',
  'map.geocode.network':
    'Aadressiotsingule ei pääse praegu ligi. Proovi selle asemel "Näita varjupaiku minu ümbruses".',

  // --- shelter detail page.
  'detail.backToMap': 'Tagasi kaardile',
  'detail.notFoundTitle': 'Varjupaika ei leitud',
  'detail.notFoundBody': 'Sellise ID-ga varjupaika ei ole. See on tõenäoliselt eemaldatud.',
  'detail.locationHeading': 'Asukoht',
  'detail.detailsHeading': 'Detalid',
  'detail.infoHeading': 'Teave',
  'detail.reportOccupancy': 'Teata täitumisastmest',
  'detail.reportOpen': 'Teata avatud/suletud olekust',
  'detail.reportThis': 'Teata sellest varjupaigast',
  'detail.navigate': 'Navigeeri',
  'detail.appleMaps': 'Ava Apple Mapsis',
  'detail.occupancy.aria': 'Kui täis on see varjupaik praegu?',
  'detail.band.space': 'On vaba mahtu',
  'detail.band.gettingFull': 'Täitumas',
  'detail.band.full': 'Täis',
  'detail.verify.occupancy':
    'Kinnita oma e-post või telefon, et teatada, kui täis on see varjupaik.',
  'detail.login.occupancy': 'Logi sisse, et teatada, kui täis on see varjupaik.',
  'detail.openStatus.aria': 'Kas see varjupaik on praegu avatud?',
  'detail.openState.open': 'Praegu avatud',
  'detail.openState.closed': 'Praegu suletud',
  'detail.verify.open': 'Kinnita oma e-post või telefon, et teatada, kas see varjupaik on avatud.',
  'detail.login.open': 'Logi sisse, et teatada, kas see varjupaik on avatud.',
  'detail.report': 'Teata',
  'detail.reportType.aria': 'Teate tüüp',
  'detail.reportType.nonExistent': 'Sellist ei ole olemas',
  'detail.reportType.wrongLocation': 'Asukoht on vale',
  'detail.reportType.other': 'Muu',
  'detail.reportDetailPlaceholder.wrongLocation': 'Mis on tegelik aadress?',
  'detail.reportDetailPlaceholder.other': 'Mida peaks kogukond teadma?',
  'detail.reportDetailLabel': 'Lisainfo (valikuga)',
  'detail.reportDetailError': 'Lisainfo võib olla maksimaalselt 500 tähemärki.',
  'detail.verify.report': 'Kinnita oma e-post või telefon, et teatada sellest varjupaigast.',
  'detail.login.report': 'Logi sisse, et teatada sellest varjupaigast.',
  'detail.submitting': 'Saadetakse…',
  'detail.submitReport': 'Saada teave',
  'detail.cancel': 'Tühista',
  'detail.verifyAccount': 'Kinnita oma konto',

  // --- submit shelter page. Quoted button labels use the
  // Estonian label (the button is translated on this page).
  'submit.backToMap': 'Tagasi kaardile',
  'submit.title': 'Lisa varjupaik',
  'submit.subtitle': 'Lisa kaardile kogukonna varjupaik.',
  'submit.successBody':
    'Sinu asukoht on nüüd loetletud ja märgitud uue lisandina. Kogukonna teated kinnitavad seda.',
  'submit.success.viewLocation': 'Vaata oma asukohta',
  'submit.success.viewContributions': 'Vaata oma panuseid',
  'submit.verifyHint': 'Sellel kontol pole enam kinnitatud omanikku.',
  'submit.verifyHint.link': 'Mine kinnitusele',
  'submit.nameLabel': 'Nimi *',
  'submit.namePlaceholder': 'nt Kalamaja kogukonna varjupaik',
  'submit.name.required': 'Nimi on kohustuslik.',
  'submit.name.tooLong': 'Nimi võib olla maksimaalselt 200 tähemärki.',
  'submit.descriptionLabel': 'Kirjeldus (valikuga)',
  'submit.descriptionPlaceholder': 'Ligipääs, tingimused, kes haldab…',
  'submit.description.tooLong': 'Kirjeldus võib olla maksimaalselt 2000 tähemärki.',
  'submit.capacityLabel': 'Mahutavus (valikuga)',
  'submit.capacityHint': '1–100 000 inimest',
  'submit.capacityPlaceholder': 'nt 40',
  'submit.capacity.invalid': 'Mahutavus peab olema täisarv vahemikus 1 kuni 100 000.',
  'submit.privateLabel':
    'See on privaalaru või privaatne varjupaik (elanik pakub seda varjupaigaks)',
  'submit.locationLegend': 'Asukoht *',
  'submit.locationNote':
    'Liimi koordinaadid (59.4370, 24.7535) või kaardi link, otsi Eesti aadressi, kasuta nuppu "Kasuta mu asukohta" või klõpsa kaardil. Asukoht peab jääma Eestisse.',
  'submit.locationLabel': 'Koordinaadid või kaardi link',
  'submit.locationPlaceholder': '59.4370, 24.7535 või liimi Google Mapsi link',
  'submit.location.set': 'Määra asukoht',
  'submit.location.resolving': 'Lahendatakse…',
  'submit.location.prefillNote':
    'Allpool oleva otsingu aadress täidab selle välja ainult siis, kui see on tühi.',
  'submit.addressLabel': 'Otsi Eesti aadress',
  'submit.addressPlaceholder': 'nt Lossi 2, Tartu',
  'submit.search': 'Otsi',
  'submit.searching': 'Otsitakse…',
  'submit.attributionLead': 'Aadressiandmed',
  'submit.osmAttribution': '© OpenStreetMap kaasajajad',
  'submit.useMyLocation': 'Kasuta mu asukohta',
  'submit.locating': 'Asukohta määratakse…',
  'submit.location.empty': 'Asukohta pole veel',
  'submit.submit': 'Lisa varjupaik',
  'submit.submitting': 'Saadetakse…',
  'submit.hint.from': 'Asukoht: ',
  'submit.hint.source.typed': 'sisestatud koordinaadid',
  'submit.hint.source.link': 'kaardi link',
  'submit.hint.source.geolocation': 'seadme asukoht',
  'submit.hint.source.map': 'kaart',
  'submit.hint.source.address': 'aadressiotsing',
  'submit.hint.swapped':
    ' Tuvastati pikkus ja laius, seepärast vahetati väärtused, et asukoht jääks Eesti piiresse.',
  'submit.hint.accuracy': ' (täpsus umbes {m} m; vajadusel liigu mardikat)',
  'submit.loc.missing':
    'Vali asukoht kaardilt, liimi koordinaadid või link või kasuta "Kasuta mu asukohta".',
  'submit.loc.noPair':
    'Selles tekstis pole äratuntavaid koordinaate. Liimi paar nagu 59.4370, 24.7535 või kaardi link või kasuta "Kasuta mu asukohta" / kaart.',
  'submit.loc.outOfBounds': 'Asukoht on Eesti piiridest väljas.',
  'submit.loc.invalid':
    'See ei näi koordinaadidena välja. Kasuta paari nagu 59.4370, 24.7535, DMS-kaadrit või kaardi linki.',
  'submit.loc.decimalComma':
    'Kasuta kümnendkoma: 59.4370, 24.7535 (tuvastatud eestikeelne kümnendkoma).',
  'submit.loc.geoDenied':
    'Asukohaoiglus on välja lülitatud. Luba brauseris asukoha kasutamine või vali koht kaardilt / liimi link.',
  'submit.loc.geoUnavailable':
    'Sinu asukohta ei saadud praegu määrata. Vali koht kaardilt või liimi link.',
  'submit.loc.geoTimeout': 'Sinu asukoha määramine aegus. Vali koht kaardilt või liimi link.',
  'submit.loc.geoInsecure':
    'Asukoha kasutamine nõuab turvalist (https) ühendust. Vali koht kaardilt või liimi link.',
  'submit.loc.shortLinkFailed':
    'Sellest lingist koordinaate ei leitud. Kasuta täielikku Google Mapsi linki või vali koht kaardilt.',
  'submit.loc.shortLinkRateLimited':
    'Liiga palju linkide otsinguid. Palun oota minut ja proovi uuesti.',
  'submit.loc.shortLinkUnavailable':
    'Asukoha otsing on ajutiselt kättesaamatu. Proovi hetke pärast uuesti või vali koht kaardilt.',
  'submit.geocode.noResults':
    'Eesti aadressi ei leitud. Proovi kaart, link või "Kasuta mu asukohta".',
  'submit.geocode.rateLimited': 'Aadressiotsing on koormatud. Palun oota hetke ja proovi uuesti.',
  'submit.geocode.network':
    'Aadressiotsingule ei pääse praegu ligi. Kasuta selle asemel kaart või link.',

  // --- veateated (shared error mapping, i18n-aware seam): kliendi poolt
  // kirjutatud bänneritekst, mille bannerMessage() i18n-kaabli kaudu annab.
  // Serveri poolt antud sõnumid (ApiError.message) ei ole sõnastiku võtmed.
  'error.rateLimited': 'Liiga palju katseid — oota hetke ja proovi uuesti.',
  'error.unauthorized': 'Pole volitust. Palun logi uuesti sisse.',
  'error.checkInput': 'Kontrolli sisestatud andmed ja proovi uuesti.',
  'error.serverError': 'Midagi läks valesti. Palun proovi uuesti.',
  'error.valueInUse': 'See väärtus on juba kasutusel.',
  'error.verifyRateLimited':
    'Taotletud liiga palju koodisid. Palun oota aega enne uue koodi taotlemist (koodide arv päevas on piiratud).',
  'error.verifyBadCode': 'See kood on kehtetu või aegunud. Kontrolli ja proovi uuesti.',
  'error.accountRateLimited': 'Liiga palju taotlusi. Palun oota hetke ja proovi uuesti.',
  'error.accountBadCode': 'See kood on kehtetu või aegunud. Palun taotle uus.',

  // --- konto leht (/account). Brand name ja ametlikud asutused jäävad
  // niisama nagu kogu sõnastikus.
  'account.subtitle':
    'Sinu profiil ja kinnitused. Nime parandamine kinnitatakse praeguse parooliga; e-posti ja telefoni muutmine kinnitatakse teise kanali kaudu.',
  'account.profileLoadError': 'Sinu profiili ei õnnestunud laadida. Seanss on endiselt aktiivne.',
  'account.retrying': 'Proovime uuesti…',
  'account.retry': 'Proovi uuesti',
  'account.identity': 'Identiteet',
  'account.name': 'Nimi',
  'account.adminBadge': 'Haldaja',
  'account.identityCopy':
    'Trükiviga registreerumisel ei sunni kunagi uut kontot looma — paranduse kinnitab sinu praegune parool.',
  'account.edit': 'Muuda',
  'account.currentPassword': 'Praegune parool',
  'account.nameRequired': 'Nimi on kohustuslik.',
  'account.passwordRequired': 'Sinu praegune parool on kohustuslik.',
  'account.saving': 'Salvestatakse…',
  'account.save': 'Salvesta muudatused',
  'account.cancel': 'Tühista',
  'account.contacts': 'Kontaktid',
  'account.emailLabel': 'E-posti aadress',
  'account.phoneLabel': 'Telefoninumber',
  'account.verified': 'Kinnitatud',
  'account.completeVerification': 'Lõpeta kinnitamine',
  'account.changeEmail': 'Muuda e-posti aadressi',
  'account.emailDone.before': 'Sinu e-posti aadress on nüüd',
  'account.emailDone.after': '. Järgmisel sisselogimisel kasuta uut aadressi.',
  'account.changeAgain': 'Muuda uuesti',
  'account.newEmail': 'Uus e-post',
  'account.newEmailPlaceholder': 'new@example.ee',
  'account.emailTooLong': 'E-posti aadress võib olla maksimaalselt 255 tähemärki.',
  'account.emailRequired': 'Kehtiv e-posti aadress on kohustuslik.',
  'account.emailProof':
    'Turbe tõttu e-posti muutmine kinnitatakse SMS-koodiga, mis saadetakse sinu kontol olevale telefoninumbrule — mitte kunagi uuele aadressile.',
  'account.smsCode': 'SMS-kood',
  'account.codePlaceholder': '6-kohaline kood',
  'account.smsCodeRequired': 'Sisesta SMSis olev 6-kohaline kood.',
  'account.smsSentHint': 'Saatsime SMS-koodi sinu kontol olevale telefoninumbrule.',
  'account.working': 'Töötlen…',
  'account.confirmNewEmail': 'Kinnita uus e-post',
  'account.resendIn': 'Uuesti saada saad {time} pärast',
  'account.resendCode': 'Saada kood uuesti',
  'account.sending': 'Saadetakse…',
  'account.sendIn': 'Saada saad {time} pärast',
  'account.sendSmsToPhone': 'Saada SMS-kood muule telefonile',
  'account.changePhone': 'Muuda telefoninumbrit',
  'account.phoneDone.before': 'Sinu telefon on nüüd',
  'account.phoneDone.after': '.',
  'account.newPhone': 'Uus telefon',
  'account.newPhonePlaceholder': '+3725… või 5xxxxxxx',
  'account.phoneTooLong': 'Telefoninumber võib olla maksimaalselt 64 tähemärki.',
  'account.phoneRequired': 'Telefoninumber on kohustuslik.',
  'account.phoneProof':
    'Turbe tõttu telefoni muutmine kinnitatakse e-posti koodiga, mis saadetakse sinu kontol olevale e-posti aadressile — ainult SIM-kaardi kaotamine ei suuda kinnitust ümber suunata.',
  'account.emailCode': 'E-posti kood',
  'account.emailCodeRequired': 'Sisesta e-kirjas olev 6-kohaline kood.',
  'account.emailCodeSentHint': 'Saatsime e-posti koodi sinu kontol olevale e-posti aadressile.',
  'account.confirmNewPhone': 'Kinnita uus telefon',
  'account.sendEmailCode': 'Saada e-posti kood muule e-postile',
  'account.contributions': 'Minu esitused',
  'account.contributionsCopy': 'Varjupaikad, mille sa esitasid — muuda või eemalda need siin.',
  'account.yourData': 'Sinu andmed',
  'account.dataCopy':
    'Laadi alla JSON-fail, mis sisaldab kõik sinu kontoga seotut — sinu profiili (nimi, e-post, telefon) ja sinu esitatud varjupaikad.',
  'account.preparing': 'Valmistatakse…',
  'account.downloadData': 'Laadi alla minu andmed (JSON)',
  'account.deleting': 'Kustutatakse…',
  'account.delete': 'Konta kustutamine',
  'account.delete.adminCopy':
    'See konto loodi deploy-keskkonna poolt, seega ei saa seda rakendusest kustutada. Keskkonnast eemaldamine on operaatori toime (keskkonnamuutujate ADMIN_EMAIL ja ADMIN_PASSWORD eemaldamine) — server keeldub kustutamisel igal juhul.',
  'account.delete.copy':
    'Kustutab sinu konto ja kogu sellega seotud. Varjupaikad, mille sa deklareerisid privaatseks koduks, eemaldatakse; sinu esitatud avalikud varjupaikad jäävad kaardile ilma esitajata. Seda ei ole võimalik tagasi pöörata.',
  'account.delete.typeHint': 'Kinnitamiseks kirjuta DELETE',
  'account.delete.armed': 'Kustutamine on valmis — kinnitamiseks vali „Kustuta minu konto".',
  'account.delete.button': 'Kustuta minu konto',
  'account.legal': 'Juriidiline',
  'account.legal.lead': 'Loe',
  'account.legal.and': 'ja',
  'account.legal.tail': '.',
  'account.success.profileUpdated': 'Sinu profiil on uuendatud.',
  'account.success.emailChanged': 'Sinu e-posti aadress on muudetud.',
  'account.success.phoneChanged': 'Sinu telefoninumber on muudetud.',
  'account.success.exportDownloaded': 'Sinu andmete eksport on alla laaditud.',
  'account.error.sameValue': 'See on juba sinu kontol olev väärtus — uus peab olema erinev.',

  // --- konto: minu panused panel (kasutaja enda varjupaikad).
  'account.contrib.shelters': 'Varjupaikad',
  'account.contrib.loading': 'Sinu varjupaiku laetakse…',
  'account.contrib.empty': 'Sa pole veel ühtegi varjupaika esitanud.',
  'account.contrib.emptyCta': 'Lisa esimene varjupaik',
  'account.contrib.submit': 'Lisa varjupaik',
  'account.contrib.source.paasteamet': 'Päästeameti register',
  'account.contrib.source.municipality': 'Kohaliku omavalitsuse register',
  'account.contrib.badge.new': 'Uus kogukonnalt',
  'account.contrib.badge.confirmed': 'Kogukonna poolt kinnitatud',
  'account.contrib.badge.rejected': 'Tagasi lükatud',
  'account.contrib.infoRequest': 'Teabe taotlus',
  'account.contrib.adminNote': 'Administraatori märkus: {note}',
  'account.contrib.inaccurate': 'Teatatud ebatäpseks — detailid võivad olla valed',
  'account.contrib.hidden': 'Peidetud — kogukond on sellest teatanud ({count})',
  'account.contrib.view': 'Vaata',
  'account.contrib.info': 'Teave',
  'account.contrib.infoClose': 'Sulge info',
  'account.contrib.delete': 'Kusta',
  'account.contrib.deleteConfirm': 'Kustuta see varjupaik jäädavalt?',
  'account.contrib.deleteConfirmButton': 'Kinnita kustutamine',
  'account.contrib.nameLabel': 'Nimi',
  'account.contrib.nameRequired': 'Nimi on kohustuslik (kuni 200 tähemärki).',
  'account.contrib.descriptionLabel': 'Kirjeldus (valikuga)',
  'account.contrib.descriptionTooLong': 'Kirjeldus võib olla maksimaalselt 2000 tähemärki.',
  'account.contrib.latitudeLabel': 'Laiuskraad (−90…90)',
  'account.contrib.latitudeError': 'Vajalik on laiuskraad vahemikus −90 kuni 90.',
  'account.contrib.longitudeLabel': 'Pikkuskraad (−180…180)',
  'account.contrib.longitudeError': 'Vajalik on pikkuskraad vahemikus −180 kuni 180.',
  'account.contrib.estoniaNote': 'Asukoht peab jääma Eestisse. See kontroll toimub serveris.',
  'account.contrib.infoQuestion': 'Mooder küsib:',
  'account.contrib.replyLabel': 'Sinu vastus (kohustuslik, ühekordne)',
  'account.contrib.replyRequired': 'Vastus (kuni 2000 tähemärki) on kohustuslik.',
  'account.contrib.sendReply': 'Saada vastus',
  'account.contrib.reply': 'Sinu vastus',

  // --- kinnitus leht (/verify): kanalipõhised tõestusvoogud.
  'verify.title': 'Kinnita oma konto',
  'verify.subtitle':
    'Kinnitatud konto saab esitada varjupaiku ja teatada loetletud asukohtade kohta. Tõesta, et e-post ja telefon on sinu omad — koodid saadetakse väljaspool rakendust, üks iga kanali kohta.',
  'verify.aria': 'Kinnituse olek',
  'verify.verified': 'Kinnitatud',
  'verify.notVerified': 'Kinnitamata',
  'verify.intro': 'Saadame koodi sinu {destination}. Sisesta see siin, et tõestada, et see on sinu omad.',
  'verify.email.title': 'Kinnita oma e-post',
  'verify.email.destination': 'e-posti aadressile',
  'verify.email.noun': 'e-post',
  'verify.email.send': 'Saada kood muule e-postile',
  'verify.email.sentHint': 'Kinnituskood on saadetud sinu e-posti aadressile.',
  'verify.email.codeLabel': 'Kinnituskood',
  'verify.email.codeHint': 'Sisesta e-kirjas olev 8-märgiline kood.',
  'verify.email.placeholder': '8-märgiline kood',
  'verify.phone.title': 'Kinnita oma telefon',
  'verify.phone.destination': 'telefoninumbrile',
  'verify.phone.noun': 'telefon',
  'verify.phone.send': 'Saada SMS-kood muule telefonile',
  'verify.phone.sentHint': 'SMS-kood on saadetud sinu telefoninumbrile.',
  'verify.phone.codeLabel': 'SMS-kood',
  'verify.phone.codeHint': 'Sisesta SMSis olev 6-kohaline kood.',
  'verify.phone.placeholder': '6-kohaline kood',
  'verify.verifying': 'Kinnitatakse…',
  'verify.verify': 'Kinnita',
  'verify.fullyVerified': 'Sinu konto on täielikult kinnitatud',
  'verify.fullyVerifiedCopy':
    'Sinu e-post ja telefon on kinnitatud — saad nüüd esitada varjupaiku ja teatada loetletud asukohtade kohta.',
  'verify.verifiedCopy':
    'Sinu konto on kinnitatud. Saad esitada varjupaiku ja teatada loetletud asukohtade kohta.',
  'verify.continue': 'Jätka',
  'verify.manageAccount': 'Halda kontot',
  'verify.backToMap': 'Tagasi kaardile',
  'verify.alreadyVerified': 'Sinu {noun} on juba kinnitatud.',
  'verify.verifiedNotice': 'Sinu {noun} on kinnitatud.',

  // --- kriisijuhtimine (/blog — crisis-guidance D4/D6). Artikli pealkiri ja
  // keha on administraatori tekst (kuvatakse muutmatuna), mitte sõnastiku võtmed.
  'guidance.title': 'Kriisijuhtimine',
  'guidance.subtitle': 'Praktilised juhised kriisiseisundiks.',
  'guidance.loading': 'Juhiseid laetakse…',
  'guidance.loadingDetail': 'Juhise artiklit laetakse…',
  'guidance.empty': 'Juhiseid pole veel — vaata hiljem uuesti.',
  'guidance.backToList': 'Tagasi kõikidele juhistele',
  'guidance.notFoundTitle': 'Juhise artiklit ei leitud',
  'guidance.notFoundBody':
    'Sellist juhisteposti ei ole — see on tõenäoliselt eemaldatud või avaldamata.',
  'guidance.published': 'Avaldatud',

  // --- administraator: juhisepostid + toimetaja + meediakogumik (crisis-guidance D8).
  'admin.retry': 'Proovi uuesti',

  'admin.settings.tab': 'Sätted',

  'admin.guidance.tab': 'Juhised',
  'admin.guidance.loading': 'Juhiseposte laetakse…',
  'admin.guidance.empty': 'Juhiseposte pole veel.',
  'admin.guidance.emptyLocale': 'Keeles {locale} juhiseid pole veel.',
  'admin.guidance.shownIn': 'Postitused keeles {locale} — teisi keeli muudetakse nende enda loenditest.',
  'admin.guidance.create': 'Uus post',
  'admin.guidance.col.title': 'Pealkiri',
  'admin.guidance.col.position': 'Asukoht',
  'admin.guidance.col.status': 'Olek',
  'admin.guidance.col.locale': 'Keel',
  'admin.guidance.col.pinned': 'Kinnitatud',
  'admin.guidance.col.published': 'Avaldatud',
  'admin.guidance.col.updated': 'Muudetud',
  'admin.guidance.col.actions': 'Tegevused',
  'admin.guidance.order.hint':
    'Postid näevad külastajatele selles järjekorras — lohista rida või kasuta nuppe.',
  'admin.guidance.move.top': 'Üles otsa',
  'admin.guidance.move.up': 'Üles',
  'admin.guidance.move.down': 'Alla',
  'admin.guidance.move.top.aria': 'Liiguta „{title}“ üles otsa',
  'admin.guidance.move.up.aria': 'Liiguta „{title}“ üles',
  'admin.guidance.move.down.aria': 'Liiguta „{title}“ alla',
  'admin.guidance.status.draft': 'Mustand — pole avalik',
  'admin.guidance.status.published': 'Avaldatud',
  'admin.guidance.pinned.yes': 'Jah',
  'admin.guidance.pinned.no': 'Ei',
  'admin.guidance.edit': 'Muuda',
  'admin.guidance.publish': 'Avalda',
  'admin.guidance.unpublish': 'Tühista avaldamine',
  'admin.guidance.delete': 'Kusta',
  'admin.guidance.delete.confirm': 'Kustuta see post jäädavalt? Pilt jääb meediakogumikku.',
  'admin.guidance.delete.confirmButton': 'Kinnita kustutamine',
  'admin.guidance.delete.cancel': 'Tühista',
  'admin.guidance.working': 'Töötlen…',
  'admin.guidance.success.created': 'Post loodud.',
  'admin.guidance.success.updated': 'Post uuendatud.',
  'admin.guidance.success.published': 'Post avaldatud.',
  'admin.guidance.success.unpublished': 'Posti avaldamine tühistatud.',
  'admin.guidance.success.deleted': 'Post kustutatud.',
  'admin.guidance.success.reordered': 'Järjestus salvestatud.',

  'admin.guidance.editor.createTitle': 'Uus juhisepost',
  'admin.guidance.editor.editTitle': 'Juhiseposti muutmine',
  'admin.guidance.editor.loading': 'Posti laetakse…',
  'admin.guidance.editor.titleLabel': 'Pealkiri *',
  'admin.guidance.editor.titleRequired': 'Pealkiri on kohustuslik.',
  'admin.guidance.editor.titleTooLong': 'Pealkiri võib olla maksimaalselt 255 tähemärki.',
  'admin.guidance.editor.slugLabel': 'Sluug (valikuga)',
  'admin.guidance.editor.slugHint.create':
    'Väiketähed, numbrid ja sidekriipsud. Tühjaks jätmisel genereeritakse sluug pealkirjast.',
  'admin.guidance.editor.slugHint.edit':
    'Väiketähed, numbrid ja sidekriipsud. Tühjaks jätmisel jääb praegune sluug säilma.',
  'admin.guidance.editor.slugInvalid':
    'Kasuta väiketähti, numbreid ja sidekriipsusid (ilma alg- või lõpusidekriipsuta).',
  'admin.guidance.editor.bodyLabel': 'Sisukeha *',
  'admin.guidance.editor.bodyHint':
    'Salvestamisel säilib ainult tööriistapaneeli vorming — H1 ega sisetekstipilte ei ole tahtlikult (leht ise omab pealkirja ja pealtpilti). Liidetud sisu hoiab ainult selle vormingu, mille tööriistapaneel pakub.',
  'admin.guidance.editor.bodyRequired': 'Sisukeha on kohustuslik.',
  'admin.guidance.editor.link.prompt': 'Viite URL (http, https või mailto):',
  'admin.guidance.editor.link.invalid':
    'Säilivad ainult http, https ja mailto viited — kasuta täielikku linki, mis algab https:// või mailto:ga.',
  'admin.guidance.editor.link.noSelection': 'Vali esmalt tekst, millele viidet lisada.',
  'admin.guidance.editor.heroLabel': 'Pealtpilt',
  'admin.guidance.editor.hero.current': 'Praegune pilt',
  'admin.guidance.editor.hero.choose': 'Vali meediakogumikust',
  'admin.guidance.editor.hero.loading': 'Meediakogumikku laetakse…',
  'admin.guidance.editor.hero.empty':
    'Meediakogumikus pilte ei ole — laadi üles pilt Meediakogumiku kaardil.',
  'admin.guidance.editor.hero.remove': 'Eemalda pilt',
  /** Pealtpildi valija üleslaadimise kontroll: failivälja silt (server
   *  aktsepteerib täpselt neid kolme tüüpi, magic-byte kontrolliga). */
  'admin.guidance.editor.hero.uploadLabel': 'Laadi pilt üles',
  /** Üleslaadimise 413: ületab serveri suuruse piiri (MEDIA_MAX_BYTES). */
  'admin.guidance.editor.hero.uploadError.tooLarge': 'See pilt ületab 5 MB üleslaadimise piiri.',
  /** Üleslaadimise 400: pole lugemisvõimeline pilt või deklareeritud tüüp
   *  ei klapi baitytega (serveri magic-byte kontroll). */
  'admin.guidance.editor.hero.uploadError.unsupported':
    'See fail pole toetatud pilt (JPEG, PNG või WebP) või selle tüüp ei klapi.',
  /** Iga muu üleslaadimise ebaõnnestumine (5xx, võrgu viga): üldine
   *  uuesti proovida sõnum. */
  'admin.guidance.editor.hero.uploadError.generic':
    'Pildi üleslaadimine ebaõnnestus. Palun proovi uuesti.',
  'admin.guidance.editor.altLabel': 'Pealtpildi alt-tekst (valikuga)',
  'admin.guidance.editor.altRequired': 'Kui pealtpilt on valitud, on alt-tekst kohustuslik.',
  'admin.guidance.editor.altForbidden': 'Eemalda alt-tekst või vali pealtpilt.',
  'admin.guidance.editor.altTooLong': 'Alt-tekst võib olla maksimaalselt 300 tähemärki.',
  'admin.guidance.editor.localeLabel': 'Posti keel',
  'admin.guidance.editor.localeHint':
    'Posti kodukeel, nt en. Täitub automaatselt: loomisel kehtiv keel, muutmisel posti oma keel.',
  'admin.guidance.editor.localeTooLong': 'Keel võib olla maksimaalselt 5 tähemärki.',
  'admin.guidance.editor.editingIn': 'Sa muudad postituse {locale} sisu.',
  'admin.guidance.editor.creatingIn': 'Post luuakse keeles {locale}.',
  'admin.guidance.editor.homeLocaleNote':
    'Posti kodukeel on {home}. Salvestamine muudab ainult {locale} sisu — teised keeled jäävad puutumata.',
  'admin.guidance.editor.pinnedLabel': 'Kinnita see post juhiseliste tippu',
  'admin.guidance.editor.statusLabel': 'Avaldamine',
  'admin.guidance.editor.status.draft': 'Salvesta mustandina',
  'admin.guidance.editor.status.publish': 'Salvesta ja avalda',
  'admin.guidance.editor.statusNote':
    'Avaldamisoleku muudavad loendis toimingud Avalda ja Tühista avaldamine.',
  /** Muutmisrežiim, mustand: oleku rida ülevaates — mustand ei ole
   *  avalik enne avaldamist; nimetab teekonna. Avaldatud post hoiab
   *  statusNote'i (hädutamata). */
  'admin.guidance.editor.draftState':
    'See post on mustand — see ei ole lehel /blog nähtav, kuni sa seda ei avalda. Kasuta loendis toimingut Avalda.',
  /** Pärast mustandi salvestamist loomisrežiimis: tagajärg + teekond.
   *  Tavaline olek, mitte viga (toimetaja infoteade). */
  'admin.guidance.editor.savedAsDraft':
    'Salvestatud mustandina. Post ei ole lehel /blog nähtav, kuni sa seda ei avalda — kasuta loendis toimingut Avalda või salvesta ja avalda.',
  /** Pärast olemasoleva mustandi muutmist: post jääb mustandiks ja ei
   *  ole /blog-il nähtav, kuni avaldatud (muutmiskeha ei saa statusit). */
  'admin.guidance.editor.stillDraft':
    'Salvestatud. Post on endiselt mustand, seega ei ole see lehel /blog nähtav, kuni sa seda ei avalda — kasuta loendis toimingut Avalda.',
  'admin.guidance.editor.save': 'Salvesta',
  'admin.guidance.editor.saving': 'Salvestan…',
  'admin.guidance.editor.cancel': 'Tühista',

  'admin.media.tab': 'Meediakogumik',
  'admin.media.loading': 'Meediakogumikku laetakse…',
  'admin.media.empty': 'Kogumikus pilte ei ole.',
  'admin.media.upload': 'Laadi pilt üles',
  'admin.media.uploading': 'Laen üles…',
  'admin.media.uploadHint': 'JPEG, PNG või WebP.',
  'admin.media.col.image': 'Pilt',
  'admin.media.col.file': 'Fail',
  'admin.media.col.dimensions': 'Mõõdud',
  'admin.media.col.size': 'Suurus',
  'admin.media.col.uploaded': 'Üles laaditud',
  'admin.media.col.usedBy': 'Kasutavad',
  'admin.media.col.actions': 'Tegevused',
  'admin.media.delete': 'Kusta',
  'admin.media.delete.working': 'Kontrollin…',
  'admin.media.delete.inUse':
    'Seda pilti kasutab siiski juhisepost. Kustutamine eemaldab mõjutatud postidelt pealtpildi.',
  'admin.media.delete.confirmButton': 'Kustuta siiski',
  'admin.media.delete.cancel': 'Tühista',
  'admin.media.success.uploaded': 'Pilt üles laaditud.',
  'admin.media.success.deleted': 'Pilt kustutatud.',
};
