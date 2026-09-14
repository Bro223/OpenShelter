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

  // --- consent banner (first-level data-usage notice). The app has no
  // optional cookies, trackers or analytics, so this is a necessary-only
  // acknowledgment, not an accept/reject choice.
  'consent.aria': 'Küpsiste ja salvestusruumi teade',
  'consent.title': 'Küpsistest ja brauseri salvestusruumist',
  'consent.body':
    'OpenShelter salvestab ainult seda, mida ta toimimiseks vajab: sisselogimist hoidev seansitunnus ning sinu keele- ja kuvamiseelistused. Me ei kasuta reklaami, analüütikat ega ristsaidi jälgimist ega müü sinu andmeid. Need salvestatakse sinu brauseri kohalikku salvestusruumi, mitte reklaamiküpsistesse, ja on vajalikud selleks, et rakendus töötaks.',
  'consent.acknowledge': 'Sain aru',
  'consent.privacyLink': 'Loe privaatsuspoliitikat',

  // --- "Kuidas OpenShelter töötab" block (map page). UI labels stay in
  // English because the map badges are not translated yet (M14 slice 2).
  'how.title': 'Kuidas OpenShelter töötab',
  'how.what':
    'OpenShelter on sõltumatu, kogukonna hallatav Eesti varjupaikade kaart. See ei ole hädaabiteenus ega ametlik riigisüsteem. Hädaolukorras helista 112 ja järgi ametlikke juhiseid.',
  'how.sources':
    'Asukohad pärinevad kahest allikast. Ametlikud asukohad pärinevad Päästeameti avaandmetest ja neil on sinine märgis "Registry" (register). Kogukonna asukohad lisavad kinnitatud kontoga kasutajad; need kuvatakse märgisega "Newly added" (uus) seni, kuni teised kasutajad on need kinnitanud ("Community-checked" ehk kogukonna kinnitatud). Kogukonna esitus ei muutu kunagi automaatselt ametlikuks.',
  'how.report':
    'Kinnitatud kontoga kasutajad saavad lisada varjupaiga või teatada, et loetletud asukoht on suletud, ebatäpne või kadunud. Teated lähevad administraatoritele, kes need üle vaatavad ning võivad asukoha peita või parandada.',
  'how.nearest':
    'Nupp "Show shelters around you" küsib brauserilt luba sinu asukoha kasutamiseks. Sinu asukohta kasutatakse ainult brauseri sees ega saadeta kunagi meie serveritesse. Võid selle asemel otsida ka aadressi järgi.',
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
  'authPage.reset.sentTitle': 'Kontrolli oma sisseliikumist',
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

  // --- map page (M14 slice 2). The around-you CTA stays English (see
  // messages.ts), so the geocode copy quotes that English label, as the how
  // block already does.
  'map.title': 'Varjupaikade kaart',
  'map.subtitle': 'Leia registreeritud ja kogukonna poolt lisatud varjupaiku Eestis.',
  'map.legend.registry': 'Register',
  'map.legend.new': 'Uus kogukonnalt',
  'map.legend.confirmed': 'Kogukonna poolt kinnitatud',
  'map.legend.reported': 'Teatatud',
  'map.geoNote':
    'Sinu brauser küsib esmalt luba. Asukohta ei saadeta kunagi meie serveritesse ja seda kasutatakse ainult lähima varjupaiga leidmiseks.',
  'map.anchorLabel': 'Leia varjupaikad aadressi lähedal',
  'map.anchorPlaceholder': 'Tänav või koht Eestis',
  'map.search': 'Otsi',
  'map.searching': 'Otsitakse…',
  'map.attributionLead': 'Aadressid:',
  'map.osmAttribution': '© OpenStreetMap kaasaajad',
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
    'Eesti aadressi ei leitud. Proovi teist aadressi või kasuta "Show shelters around you".',
  'map.geocode.rateLimited': 'Aadressiotsing on koormatud. Palun oota hetke ja proovi uuesti.',
  'map.geocode.network':
    'Aadressiotsingule ei pääse praegu ligi. Proovi selle asemel "Show shelters around you".',

  // --- shelter detail page (M14 slice 2).
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

  // --- submit shelter page (M14 slice 2). Quoted button labels use the
  // Estonian label (the button is translated on this page).
  'submit.backToMap': 'Tagasi kaardile',
  'submit.title': 'Lisa varjupaik',
  'submit.subtitle': 'Lisa kaardile kogukonna varjupaik.',
  'submit.successBody':
    'Sinu asukoht on nüüd loetletud ja märgitud uuelisandina. Kogukonna teated kinnitavad seda.',
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
  'submit.capacityLabel': 'Mahutavus (valikuga, 1–100 000 inimest)',
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
  'submit.osmAttribution': '© OpenStreetMap kaasaajad',
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
    'Sest linki ei leidnud koordinaate. Kasuta täielikku Google Mapsi linki või vali koht kaardilt.',
  'submit.loc.shortLinkRateLimited':
    'Liiga palju linkide otsinguid. Palun oota minut ja proovi uuesti.',
  'submit.loc.shortLinkUnavailable':
    'Asukoha otsing on ajutiselt kättesaamatu. Proovi hetke pärast uuesti või vali koht kaardilt.',
  'submit.geocode.noResults':
    'Eesti aadressi ei leitud. Proovi kaart, link või "Kasuta mu asukohta".',
  'submit.geocode.rateLimited': 'Aadressiotsing on koormatud. Palun oota hetke ja proovi uuesti.',
  'submit.geocode.network':
    'Aadressiotsingule ei pääse praegu ligi. Kasuta selle asemel kaart või link.',
};
