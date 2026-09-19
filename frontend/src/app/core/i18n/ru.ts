import type { Messages } from './messages';

/**
 * The Russian catalog (i18n-et-en — the whitepaper's RUS).
 *
 * MACHINE-ASSISTED TRANSLATION — NOT REVIEWED BY A NATIVE SPEAKER. This
 * catalog was produced with machine assistance and has NOT been reviewed
 * by a native Russian speaker. It is deliberately plain, calm civic copy
 * for a crisis-mapping app, with the safety-critical strings (the 112
 * notice, "Report this shelter", "Not receiving updates", the occupancy
 * bands) kept unambiguous. Before the site is genuinely public-facing,
 * every string here REQUIRES A NATIVE SPEAKER'S REVIEW — the six Russian
 * guidance drafts in the database are likewise unreviewed and are kept
 * as DRAFTS on purpose.
 *
 * Vocabulary: shelter = укрытие, blast shelter = убежище, Rescue Board =
 * Спасательный департамент (Päästeamet), Emergency Response Centre =
 * Центр тревоги (112). "OpenShelter", "112" and "EE-ALARM" stay as-is.
 * The {time} and {m} placeholders are carried over from en.ts verbatim.
 */
export const RU: Messages = {
  'menu.aria': 'Меню',
  'nav.map': 'Карта укрытий',
  'nav.guidance': 'Рекомендации',
  'nav.account': 'Аккаунт',
  'nav.admin': 'Админ',
  'nav.skip': 'Перейти к содержимому',

  'a11y.button': 'Доступность',
  'lang.label': 'Язык',
  'auth.logout': 'Выйти',
  'auth.login': 'Войти',
  'auth.register': 'Создать аккаунт',

  // --- диалог доступности (три варианта контраста). Отправные значения —
  //  администратор может изменить все строки ниже через site_texts
  //  (наложение в I18nService откатывается на эти значения, если строки
  //  переопределения нет).
  'a11y.popup.title': 'Доступность',
  'a11y.popup.body':
    'Выберите, как OpenShelter будет выглядеть для вас. Выбор применяется сразу и сохраняется на этом устройстве.',
  'a11y.option.default': 'По умолчанию',
  'a11y.option.default.desc': 'Обычный светлый вид.',
  'a11y.option.highContrast': 'Высокий контраст',
  'a11y.option.highContrast.desc': 'Тёмный фон и яркий, хорошо читаемый текст.',
  'a11y.option.blackYellow': 'Чёрно-жёлтый',
  'a11y.option.blackYellow.desc': 'Жёлтый текст на чёрном фоне — для слабовидящих и яркого света.',
  'a11y.popup.footer': 'Выбор хранится только на этом устройстве — он ни с кем не разделяется.',
  'a11y.popup.close': 'Закрыть',

  'footer.notice1':
    'OpenShelter — список, который ведёт сообщество, а не официальная экстренная служба.',
  'footer.notice2': 'В случае чрезвычайной ситуации звоните 112.',
  'footer.notice3': 'Официальная информация об укрытиях:',
  'footer.rescueBoard': 'Спасательный департамент',
  'footer.and': 'и',
  'footer.ministry': 'Министерство внутренних дел',
  'footer.dataSourceTransformed': 'координаты пересчитаны OpenShelter (EPSG:3301 -> WGS84)',
  'footer.privacy': 'Политика конфиденциальности',
  'footer.terms': 'Условия использования',
  'footer.dataSource': 'Данные об укрытиях',
  'footer.lastImport': 'последний импорт',
  'footer.officialOpenData': 'официальные открытые данные',

  'title.map': 'Карта укрытий',
  'title.login': 'Вход',
  'title.register': 'Создание аккаунта',
  'title.reset': 'Сброс пароля',
  'title.verify': 'Подтверждение аккаунта',
  'title.account': 'Аккаунт',
  'title.privacy': 'Политика конфиденциальности',
  'title.terms': 'Условия использования',
  'title.shelterDetail': 'Детали укрытия',
  'title.submit': 'Добавление укрытия',
  'title.admin': 'Админ',
  'title.guidance': 'Рекомендации при ЧС',
  'title.guidanceDetail': 'Материал с рекомендациями',

  // --- баннер согласия (первичное уведомление об использовании данных).
  // В приложении нет опциональных cookie, трекеров или аналитики, поэтому
  // это простое подтверждение необходимости, а не выбор «принять/отклонить».
  'consent.aria': 'Уведомление о cookie и хранилище браузера',
  'consent.title': 'О cookie и хранилище браузера',
  'consent.body':
    'OpenShelter хранит только то, что нужно для работы: токен входа, который держит вас в системе, и ваши языковые и визуальные настройки. Мы не используем рекламу, аналитику и отслеживание между сайтами и никогда не продаём ваши данные. Всё это хранится в локальном хранилище вашего браузера, а не в рекламных cookie, и необходимо для работы приложения.',
  'consent.acknowledge': 'Понятно',
  'consent.privacyLink': 'Прочитать политику конфиденциальности',

  // --- блок «Как работает OpenShelter» (карта). Подписи интерфейса
  // цитируются как они отображаются в русской локали, а кнопка
  // «Show shelters around you» остаётся английской — так честна цитата.
  'how.title': 'Как работает OpenShelter',
  'how.what':
    'OpenShelter — независимая карта укрытий в Эстонии, которую ведёт сообщество. Это не экстренная служба и не официальный государственный сервис. В случае чрезвычайной ситуации звоните 112 и следуйте официальным указаниям.',
  'how.sources':
    'Места берутся из двух источников. Официальные места — из открытых данных Спасательного департамента Эстонии (Päästeamet) — помечаются синим маркером «Реестр». Места, добавленные сообществом, вносят подтверждённые пользователи; до подтверждения другими пользователями они показываются как «Новое от сообщества», а после — как «Подтверждено сообществом». Добавление сообществом никогда не становится официальным автоматически.',
  'how.report':
    'Подтверждённые пользователи могут добавить укрытие или сообщить, что указанное место закрыто, указано неточно или больше не существует. Сообщения поступают администраторам, которые рассматривают их и могут скрыть место или исправить данные.',
  'how.nearest':
    'Кнопка "Show shelters around you" просит браузер дать разрешение на использование вашего местоположения. Координаты используются только внутри браузера и никогда не отправляются на наши серверы. Вместо этого можно искать по адресу.',
  'how.guarantee':
    'OpenShelter не может гарантировать, что указанное место открыто, безопасно, доступно, свободно и ещё работает. Прежде всего следуйте официальным указаниям в чрезвычайной ситуации.',
  'how.exampleTitle': 'Пример',
  'how.example.1': 'Официальное место показывается синим маркером и меткой «Реестр».',
  'how.example.2':
    'Пользователь добавляет возможное место; оно показывается как «Новое от сообщества» и неподтверждённое.',
  'how.example.3': 'Другой пользователь сообщает, что место закрыто или недоступно.',
  'how.example.4': 'Администратор рассматривает сообщение.',
  'how.example.5': 'Данные о месте обновляются или место скрывается.',

  // --- страницы авторизации (вход / регистрация / сброс). Те же правила,
  // что и для остального интерфейса.
  'authPage.login.title': 'Войти',
  'authPage.login.subtitle': 'Используйте e-mail или телефон, указанный при регистрации.',
  'authPage.login.sessionExpired': 'Ваша сессия истекла. Пожалуйста, войдите снова.',
  'authPage.login.resetOk': 'Пароль сброшен. Войдите с новым паролем.',
  'authPage.login.contactLabel': 'E-mail или телефон',
  'authPage.login.contactPlaceholder': 'you@example.ee или +3725…',
  'authPage.login.contactRequired': 'Укажите e-mail или телефон.',
  'authPage.login.passwordLabel': 'Пароль',
  'authPage.login.passwordRequired': 'Введите пароль.',
  'authPage.login.submitting': 'Вход…',
  'authPage.login.submit': 'Войти',
  'authPage.login.forgot': 'Забыли пароль?',
  'authPage.login.noAccount': 'Ещё нет аккаунта?',
  'authPage.login.createOne': 'Создать',

  'authPage.register.title': 'Создать аккаунт',
  'authPage.register.subtitle':
    'Просмотр без аккаунта — бесплатно. После подтверждения аккаунт позволит добавлять укрытия и отправлять сообщения.',
  'authPage.register.createdTitle': 'Аккаунт создан',
  'authPage.register.createdBody':
    'Ваш аккаунт готов. Войдите и подтвердите адрес e-mail — на него будет отправлен код подтверждения.',
  'authPage.register.nameLabel': 'Полное имя',
  'authPage.register.nameRequired': 'Укажите имя.',
  'authPage.register.emailLabel': 'E-mail',
  'authPage.register.emailPlaceholder': 'you@example.ee',
  'authPage.register.emailNote':
    'Сюда мы отправляем код подтверждения и используем его для сброса пароля.',
  'authPage.register.emailRequired': 'Укажите корректный e-mail.',
  'authPage.register.phoneLabel': 'Телефон',
  'authPage.register.phonePlaceholder': '+3725… или 5xxxxxxx',
  'authPage.register.phoneNote':
    'Сюда мы отправляем код подтверждения; позже им можно будет и входить.',
  'authPage.register.phoneRequired': 'Укажите телефон.',
  'authPage.register.passwordLabel': 'Пароль',
  'authPage.register.passwordRequired': 'Введите пароль.',
  'authPage.register.submitting': 'Создаём аккаунт…',
  'authPage.register.submit': 'Создать аккаунт',
  // Строка согласия склеивается вокруг двух ссылок; глагол «соглашаться»
  // управляет родительным падежом у названий документов.
  'authPage.register.agreeLead': 'Создавая аккаунт, вы соглашаетесь с',
  'authPage.register.agreeTerms': 'условиями использования',
  'authPage.register.agreeAnd': 'и',
  'authPage.register.agreePrivacy': 'политикой конфиденциальности',
  'authPage.register.agreeTail': '.',
  'authPage.register.haveAccount': 'Уже есть аккаунт?',

  'authPage.reset.title': 'Сброс пароля',
  'authPage.reset.subtitle': 'Введите e-mail вашего аккаунта — мы отправим 6-значный код на почту.',
  'authPage.reset.emailLabel': 'E-mail',
  'authPage.reset.emailPlaceholder': 'you@example.ee',
  'authPage.reset.emailRequired': 'Укажите корректный e-mail.',
  'authPage.reset.sending': 'Отправляем…',
  'authPage.reset.sendIn': 'Отправить можно через {time}',
  'authPage.reset.send': 'Отправить код сброса на почту',
  'authPage.reset.sentTitle': 'Проверьте почту',
  'authPage.reset.sentBody':
    'Если аккаунт с таким e-mail существует, на него отправлен 6-значный код.',
  'authPage.reset.codeLabel': 'Код сброса',
  'authPage.reset.codePlaceholder': '6-значный код',
  'authPage.reset.codeRequired': 'Введите 6-значный код из письма.',
  'authPage.reset.codeNote': 'Код действует 15 минут.',
  'authPage.reset.newPasswordLabel': 'Новый пароль',
  'authPage.reset.newPasswordRequired': 'Введите пароль.',
  'authPage.reset.repeatLabel': 'Повторите новый пароль',
  'authPage.reset.repeatRequired': 'Повторите пароль.',
  'authPage.reset.mismatch': 'Пароли не совпадают.',
  'authPage.reset.updating': 'Сохраняем…',
  'authPage.reset.update': 'Установить новый пароль',
  'authPage.reset.resendIn': 'Повторная отправка через {time}',
  'authPage.reset.resend': 'Отправить код ещё раз',
  'authPage.reset.backToLogin': 'Назад ко входу',

  'authPage.privacyPolicy': 'Политика конфиденциальности',
  'authPage.termsOfUse': 'Условия использования',

  // --- страница карты (поверхность просмотра). Кнопка «Show shelters
  // around you» остаётся английской (см. messages.ts), поэтому тексты
  // гекодера цитируют именно эту английскую подпись.
  'map.title': 'Карта укрытий',
  'map.subtitle':
    'Найдите зарегистрированные укрытия и укрытия, добавленные сообществом, в Эстонии.',
  'map.legend.registry': 'Реестр',
  'map.legend.new': 'Новое от сообщества',
  'map.legend.confirmed': 'Подтверждено сообществом',
  'map.legend.reported': 'Сообщено',
  'map.geoNote':
    'Сначала браузер спросит разрешение. Местоположение никогда не отправляется на наши серверы и используется только для поиска ближайшего укрытия.',
  'map.anchorLabel': 'Найти укрытия рядом с адресом',
  'map.anchorPlaceholder': 'Улица или место в Эстонии',
  'map.search': 'Найти',
  'map.searching': 'Ищем…',
  'map.attributionLead': 'Адреса:',
  'map.osmAttribution': '© участники OpenStreetMap',
  'map.addShelter': 'Добавить укрытие',
  'map.nearestEmpty': 'Рядом с вами пока нет указанных мест.',
  'map.nearestEmpty.addFirst': 'Вы можете добавить первое.',
  'map.searched': 'Поиск:',
  'map.clear': 'Сбросить',
  'map.filter.all': 'Все',
  'map.filter.registry': 'Реестр',
  'map.filter.user': 'Пользователь',
  'map.chipOpen': 'Открыто',
  'map.chipHasCapacity': 'Есть свободные места',
  'map.emptyFilter': 'Ни одно укрытие не подходит к этому фильтру.',
  'map.loading': 'Загружаем укрытия…',
  'map.viewDetails': 'Подробнее',
  'map.viewDetailsFor': 'Подробнее о ',
  'map.nearest.denied':
    'Доступ к геолокации отключён. Разрешите браузеру доступ к геолокации и повторите попытку.',
  'map.nearest.timeout':
    'Определение вашего местоположения заняло слишком много времени. Попробуйте через минуту.',
  'map.nearest.unsupported':
    'Ваш браузер не поддерживает доступ к геолокации. Проверьте настройки браузера.',
  'map.nearest.unavailable':
    'Сейчас определить ваше местоположение не удалось. Попробуйте через минуту.',
  'map.nearest.insecure': 'Для доступа к геолокации нужно защищённое (https) соединение.',
  'map.geocode.noResults':
    'Адрес в Эстонии не найден — попробуйте другой адрес или «Show shelters around you».',
  'map.geocode.rateLimited': 'Поиск адресов перегружен — подождите немного и повторите.',
  'map.geocode.network':
    'Поиск адресов сейчас недоступен. Вместо этого используйте «Show shelters around you».',

  // --- страница укрытия. Кнопка расстояния и метки Статус/Вместимость
  // остаются английскими, как и в исходном интерфейсе.
  'detail.backToMap': 'Назад к карте',
  'detail.notFoundTitle': 'Укрытие не найдено',
  'detail.notFoundBody': 'Укрытия с таким идентификатором нет — возможно, оно было удалено.',
  'detail.locationHeading': 'Местоположение',
  'detail.detailsHeading': 'Детали',
  'detail.infoHeading': 'Информация',
  'detail.reportOccupancy': 'Сообщить о заполнении',
  'detail.reportOpen': 'Сообщить об открытии/закрытии',
  'detail.reportThis': 'Сообщить об этом укрытии',
  'detail.navigate': 'Маршрут',
  'detail.appleMaps': 'Открыть в Apple Maps',
  'detail.occupancy.aria': 'Насколько это укрытие занято прямо сейчас?',
  'detail.band.space': 'Есть свободные места',
  'detail.band.gettingFull': 'Почти заполнено',
  'detail.band.full': 'Заполнено',
  'detail.verify.occupancy':
    'Подтвердите e-mail или телефон, чтобы сообщить о заполнении этого укрытия.',
  'detail.login.occupancy': 'Войдите, чтобы сообщить о заполнении этого укрытия.',
  'detail.openStatus.aria': 'Открыто ли это укрытие прямо сейчас?',
  'detail.openState.open': 'Сейчас открыто',
  'detail.openState.closed': 'Сейчас закрыто',
  'detail.verify.open': 'Подтвердите e-mail или телефон, чтобы сообщить, открыто ли это укрытие.',
  'detail.login.open': 'Войдите, чтобы сообщить, открыто ли это укрытие.',
  'detail.report': 'Сообщить',
  'detail.reportType.aria': 'Тип сообщения',
  'detail.reportType.nonExistent': 'Его не существует',
  'detail.reportType.wrongLocation': 'Местоположение неверное',
  'detail.reportType.other': 'Другое',
  'detail.reportDetailPlaceholder.wrongLocation': 'Какой правильный адрес?',
  'detail.reportDetailPlaceholder.other': 'О чём сообществу стоит знать?',
  'detail.reportDetailLabel': 'Детали (необязательно)',
  'detail.reportDetailError': 'Детали — не более 500 символов.',
  'detail.verify.report': 'Подтвердите e-mail или телефон, чтобы сообщить об этом укрытии.',
  'detail.login.report': 'Войдите, чтобы сообщить об этом укрытии.',
  'detail.submitting': 'Отправляем…',
  'detail.submitReport': 'Отправить сообщение',
  'detail.cancel': 'Отмена',
  'detail.verifyAccount': 'Подтвердите аккаунт',

  // --- страница добавления укрытия (поверхность вклада сообщества).
  'submit.backToMap': 'Назад к карте',
  'submit.title': 'Добавить укрытие',
  'submit.subtitle': 'Добавьте укрытие от сообщества на карту.',
  'submit.successBody':
    'Ваше место теперь в списке и отмечено как новое. Сообщения сообщества подтверждают его.',
  'submit.success.viewLocation': 'Смотреть ваше место',
  'submit.success.viewContributions': 'Посмотреть ваши добавления',
  'submit.verifyHint': 'У этого аккаунта больше нет подтверждённого права на управление местом.',
  'submit.verifyHint.link': 'К подтверждению',
  'submit.nameLabel': 'Название *',
  'submit.namePlaceholder': 'напр. общественное укрытие в Каламая',
  'submit.name.required': 'Укажите название.',
  'submit.name.tooLong': 'Название — не более 200 символов.',
  'submit.descriptionLabel': 'Описание (необязательно)',
  'submit.descriptionPlaceholder': 'Как попасть, условия, кто управляет…',
  'submit.description.tooLong': 'Описание — не более 2000 символов.',
  'submit.capacityLabel': 'Вместимость (необязательно, 1–100 000 человек)',
  'submit.capacityPlaceholder': 'напр. 40',
  'submit.capacity.invalid': 'Вместимость — целое число от 1 до 100 000.',
  'submit.privateLabel':
    'Это частный дом или частное укрытие (житель предлагает его как место укрытия)',
  'submit.locationLegend': 'Местоположение *',
  'submit.locationNote':
    'Вставьте координаты (59.4370, 24.7535) или ссылку на карту, найдите эстонский адрес, используйте «Моё местоположение» или отметьте точку на карте. Точка должна находиться в Эстонии.',
  'submit.locationLabel': 'Координаты или ссылка на карту',
  'submit.locationPlaceholder': '59.4370, 24.7535 — или вставьте ссылку Google Maps',
  'submit.location.set': 'Указать место',
  'submit.location.resolving': 'Определяем…',
  'submit.location.prefillNote': 'Адрес из поиска ниже заполнит это поле, только пока оно пустое.',
  'submit.addressLabel': 'Поиск эстонского адреса',
  'submit.addressPlaceholder': 'напр. Lossi 2, Тарту',
  'submit.search': 'Найти',
  'submit.searching': 'Ищем…',
  'submit.attributionLead': 'Данные об адресах',
  'submit.osmAttribution': '© участники OpenStreetMap',
  'submit.useMyLocation': 'Моё местоположение',
  'submit.locating': 'Определяем местоположение…',
  'submit.location.empty': 'Местоположение ещё не указано',
  'submit.submit': 'Добавить укрытие',
  'submit.submitting': 'Отправляем…',
  'submit.hint.from': 'Местоположение: ',
  'submit.hint.source.typed': 'введённые координаты',
  'submit.hint.source.link': 'ссылка на карту',
  'submit.hint.source.geolocation': 'координаты вашего устройства',
  'submit.hint.source.map': 'карта',
  'submit.hint.source.address': 'поиск адреса',
  'submit.hint.swapped':
    ' — порядок (долгота, широта), поэтому значения поменяны местами, чтобы точка оказалась в Эстонии',
  'submit.hint.accuracy': ' (точность около {m} м — перетащите метку, если нужно)',
  'submit.loc.missing':
    'Отметьте точку на карте, вставьте координаты или ссылку или используйте «Моё местоположение».',
  'submit.loc.noPair':
    'В этом тексте не распознаны координаты. Вставьте пару вида 59.4370, 24.7535 или ссылку на карту — либо используйте «Моё местоположение» / карту.',
  'submit.loc.outOfBounds': 'Местоположение за пределами Эстонии.',
  'submit.loc.invalid':
    'Это не похоже на координаты. Используйте пару вида 59.4370, 24.7535, строку в градусах-минутах-секундах (DMS) или ссылку на карту.',
  'submit.loc.decimalComma':
    'Используйте десятичную точку: 59.4370, 24.7535 (обнаружен десятичный разделитель — запятая, как в эстонском).',
  'submit.loc.geoDenied':
    'Доступ к геолокации отключён. Разрешите браузеру доступ к геолокации — либо отметьте точку на карте / вставьте ссылку.',
  'submit.loc.geoUnavailable':
    'Сейчас определить ваше местоположение не удалось. Отметьте точку на карте или вставьте ссылку.',
  'submit.loc.geoTimeout':
    'Определение местоположения заняло слишком много времени. Отметьте точку на карте или вставьте ссылку.',
  'submit.loc.geoInsecure':
    'Для доступа к геолокации нужно защищённое (https) соединение. Отметьте точку на карте или вставьте ссылку.',
  'submit.loc.shortLinkFailed':
    'Не удалось найти координаты в этой ссылке. Используйте полную ссылку Google Maps или отметьте точку на карте.',
  'submit.loc.shortLinkRateLimited':
    'Слишком много запросов к ссылкам — подождите минуту и повторите.',
  'submit.loc.shortLinkUnavailable':
    'Определение места по ссылке временно недоступно. Попробуйте через минуту или отметьте точку на карте.',
  'submit.geocode.noResults':
    'Адрес в Эстонии не найден — попробуйте карту, ссылку или «Моё местоположение».',
  'submit.geocode.rateLimited': 'Поиск адресов перегружен — подождите немного и повторите.',
  'submit.geocode.network': 'Поиск адресов сейчас недоступен. Используйте карту или ссылку.',

  // --- рекомендации при ЧС (/blog). Заголовок и текст материала —
  // текст администратора (котируется как есть), не ключи словаря.
  'guidance.title': 'Рекомендации при ЧС',
  'guidance.subtitle': 'Практические рекомендации на случай кризиса.',
  'guidance.loading': 'Загружаем рекомендации…',
  'guidance.loadingDetail': 'Загружаем материал…',
  'guidance.empty': 'Пока нет рекомендаций — загляните позже.',
  'guidance.backToList': 'Ко всем рекомендациям',
  'guidance.notFoundTitle': 'Материал не найден',
  'guidance.notFoundBody': 'Такого материала нет — возможно, он был снят с публикации.',
  'guidance.published': 'Опубликовано',

  // --- администрирование: вкладка рекомендаций + редактор +
  // медиабиблиотека.
  'admin.retry': 'Повторить',

  'admin.settings.tab': 'Настройки',

  'admin.guidance.tab': 'Рекомендации',
  'admin.guidance.loading': 'Загружаем материалы…',
  'admin.guidance.empty': 'Материалов пока нет.',
  'admin.guidance.create': 'Новый материал',
  'admin.guidance.col.title': 'Название',
  'admin.guidance.col.status': 'Статус',
  'admin.guidance.col.locale': 'Язык',
  'admin.guidance.col.pinned': 'Закреплён',
  'admin.guidance.col.published': 'Опубликован',
  'admin.guidance.col.updated': 'Обновлён',
  'admin.guidance.col.actions': 'Действия',
  'admin.guidance.order.hint':
    'Материалы отображаются посетителям в этом порядке — перетащите строку или используйте кнопки.',
  'admin.guidance.move.top': 'Наверх',
  'admin.guidance.move.up': 'Выше',
  'admin.guidance.move.down': 'Ниже',
  'admin.guidance.move.top.aria': 'Переместить «{title}» наверх',
  'admin.guidance.move.up.aria': 'Переместить «{title}» выше',
  'admin.guidance.move.down.aria': 'Переместить «{title}» ниже',
  /** Бейдж списка: последствие черновика, а не просто имя состояния
   *  (черновик не опубликован, пока не опубликован). */
  'admin.guidance.status.draft': 'Черновик — не опубликован',
  'admin.guidance.status.published': 'Опубликован',
  'admin.guidance.pinned.yes': 'Да',
  'admin.guidance.pinned.no': 'Нет',
  'admin.guidance.edit': 'Редактировать',
  'admin.guidance.publish': 'Опубликовать',
  'admin.guidance.unpublish': 'Снять с публикации',
  'admin.guidance.delete': 'Удалить',
  /** Запрос подтверждения (изображение остаётся в медиабиблиотеке —
   *  удаление ничего не трогает там). */
  'admin.guidance.delete.confirm':
    'Удалить материал безвозвратно? Изображение останется в медиабиблиотеке.',
  'admin.guidance.delete.confirmButton': 'Подтвердить удаление',
  'admin.guidance.delete.cancel': 'Отмена',
  /** Общая надпись кнопки, пока действие выполняется. */
  'admin.guidance.working': 'Выполняем…',
  'admin.guidance.success.created': 'Материал создан.',
  'admin.guidance.success.updated': 'Материал обновлён.',
  'admin.guidance.success.published': 'Материал опубликован.',
  'admin.guidance.success.unpublished': 'Материал снят с публикации.',
  'admin.guidance.success.deleted': 'Материал удалён.',
  'admin.guidance.success.reordered': 'Порядок сохранён.',

  'admin.guidance.editor.createTitle': 'Новый материал',
  'admin.guidance.editor.editTitle': 'Редактирование материала',
  'admin.guidance.editor.loading': 'Загружаем материал…',
  'admin.guidance.editor.titleLabel': 'Название *',
  'admin.guidance.editor.titleRequired': 'Укажите название.',
  'admin.guidance.editor.titleTooLong': 'Название — не более 255 символов.',
  'admin.guidance.editor.slugLabel': 'Слаг (необязательно)',
  /** Режим создания: пустой слаг генерируется из названия на сервере. */
  'admin.guidance.editor.slugHint.create':
    'Строчные латинские буквы, цифры и дефисы. Оставьте пустым — слаг будет сгенерирован из названия.',
  /** Режим редактирования: пустой слаг СОХРАНЯЕТ текущий (правило
   *  сервера). */
  'admin.guidance.editor.slugHint.edit':
    'Строчные латинские буквы, цифры и дефисы. Оставьте пустым — текущий слаг сохранится.',
  /** Форма сгенерированного слага, проверяемая заранее (иначе сервер
   *  ответит 400). */
  'admin.guidance.editor.slugInvalid':
    'Используйте строчные латинские буквы, цифры и дефисы (без дефиса в начале или конце).',
  'admin.guidance.editor.bodyLabel': 'Текст *',
  /** Разрешённый набор тегов, объявленный там, где администратор пишет:
   *  панель — и есть набор функций (без H1 — заголовок принадлежит
   *  странице; без картинок в тексте — только главное изображение), а
   *  вставленный текст остаётся обычным. */
  'admin.guidance.editor.bodyHint':
    'После сохранения остаётся только оформление из панели инструментов — без H1 и без картинок в тексте, намеренно (заголовок и главное изображение принадлежат странице). Вставленный текст сохраняет только то оформление, которое даёт панель.',
  'admin.guidance.editor.bodyRequired': 'Укажите текст.',
  /** Запрос URL ссылки (называются допустимые протоколы). */
  'admin.guidance.editor.link.prompt': 'URL ссылки (http, https или mailto):',
  /** Отказанный протокол ссылки (javascript:/data:/относительный):
   *  называет правило; ничего не вставляется. */
  'admin.guidance.editor.link.invalid':
    'Остаются только ссылки http, https и mailto — используйте полную ссылку, начинающуюся с https:// или mailto:.',
  /** Ссылка без выделенного текста. */
  'admin.guidance.editor.link.noSelection':
    'Сначала выделите текст, к которому добавляется ссылка.',
  'admin.guidance.editor.heroLabel': 'Главное изображение',
  /** Подпись выбранного изображения (над миниатюрой). */
  'admin.guidance.editor.hero.current': 'Текущее изображение',
  'admin.guidance.editor.hero.choose': 'Выбрать из медиабиблиотеки',
  'admin.guidance.editor.hero.loading': 'Загружаем медиабиблиотеку…',
  /** Пустое состояние выбора (указывает на вкладку медиабиблиотеки). */
  'admin.guidance.editor.hero.empty':
    'В медиабиблиотеке пока нет изображений — загрузите на вкладке «Медиабиблиотека».',
  'admin.guidance.editor.hero.remove': 'Убрать изображение',
  /** Контрол загрузки в выборе: подпись поля файла (сервер принимает
   *  ровно эти три типа, проверка по magic-байтам). */
  'admin.guidance.editor.hero.uploadLabel': 'Загрузить изображение',
  /** 413 при загрузке: превышен предел размера сервера. */
  'admin.guidance.editor.hero.uploadError.tooLarge': 'Изображение превышает лимит загрузки 5 МБ.',
  /** 400 при загрузке: неподдерживаемый тип / не совпадает заявленный
   *  тип. */
  'admin.guidance.editor.hero.uploadError.unsupported':
    'Это не поддерживаемое изображение (JPEG, PNG или WebP) либо его тип не совпадает.',
  /** Любая другая ошибка загрузки (5xx, сеть): общий текст повтора. */
  'admin.guidance.editor.hero.uploadError.generic':
    'Не удалось загрузить изображение. Попробуйте ещё раз.',
  /** Подпись alt; межполевое правило (обязателен, если выбрано
   *  изображение) проверяется в UI двумя ошибками ниже, как и серверная
   *  400. */
  'admin.guidance.editor.altLabel': 'Альтернативный текст изображения (необязательно)',
  'admin.guidance.editor.altRequired':
    'Альтернативный текст обязателен, если выбрано главное изображение.',
  'admin.guidance.editor.altForbidden':
    'Уберите альтернативный текст или выберите главное изображение.',
  'admin.guidance.editor.altTooLong': 'Альтернативный текст — не более 300 символов.',
  'admin.guidance.editor.localeLabel': 'Язык (необязательно)',
  'admin.guidance.editor.localeHint':
    'Язык материала, например en, et или ru. Пустое значение — язык по умолчанию на сервере.',
  'admin.guidance.editor.localeTooLong': 'Язык — не более 5 символов.',
  'admin.guidance.editor.pinnedLabel': 'Закрепить материал в начале списка рекомендаций',
  /** Только режим создания: одноразовый выбор «записать и опубликовать». */
  'admin.guidance.editor.statusLabel': 'Публикация',
  'admin.guidance.editor.status.draft': 'Сохранить как черновик',
  'admin.guidance.editor.status.publish': 'Сохранить и опубликовать',
  /** Режим редактирования: состояние публикации принадлежит действиям
   *  в списке. */
  'admin.guidance.editor.statusNote':
    'Состояние публикации меняется действиями «Опубликовать» и «Снять с публикации» в списке.',
  /** Режим редактирования, черновик: строка состояния (черновик не
   *  опубликован, пока не опубликован; называет выход). Опубликованный
   *  материал показывает statusNote (без напоминаний). */
  'admin.guidance.editor.draftState':
    'Это черновик — на /blog он не виден, пока вы его не опубликуете. Используйте «Опубликовать» в списке.',
  /** После сохранения черновика в режиме создания: последствие + выход.
   *  Обычное состояние, а не ошибка (информационное уведомление
   *  редактора). */
  'admin.guidance.editor.savedAsDraft':
    'Сохранено как черновик. На /blog он не виден, пока вы его не опубликуете — используйте «Опубликовать» в списке или сохраните с публикацией.',
  /** После редактирования существующего черновика: он остаётся
   *  черновиком и не виден на /blog, пока не опубликован (тело
   *  редактирования не несёт status). */
  'admin.guidance.editor.stillDraft':
    'Сохранено. Материал по-прежнему черновик и не виден на /blog, пока вы его не опубликуете — используйте «Опубликовать» в списке.',
  'admin.guidance.editor.save': 'Сохранить',
  'admin.guidance.editor.saving': 'Сохраняем…',
  'admin.guidance.editor.cancel': 'Отмена',

  'admin.media.tab': 'Медиабиблиотека',
  'admin.media.loading': 'Загружаем медиабиблиотеку…',
  'admin.media.empty': 'В библиотеке пока нет изображений.',
  'admin.media.upload': 'Загрузить изображение',
  'admin.media.uploading': 'Загружаем…',
  /** Допустимые типы (сервер повторно проверяет magic-байты + заявленный
   *  тип). */
  'admin.media.uploadHint': 'JPEG, PNG или WebP.',
  'admin.media.col.image': 'Изображение',
  'admin.media.col.file': 'Файл',
  'admin.media.col.dimensions': 'Размеры',
  'admin.media.col.size': 'Объём',
  'admin.media.col.uploaded': 'Загружено',
  'admin.media.col.usedBy': 'Используется в',
  'admin.media.col.actions': 'Действия',
  'admin.media.delete': 'Удалить',
  /** Первый клик — запрос в пути (решил API: 200 удалено / 409 в
   *  использовании). */
  'admin.media.delete.working': 'Проверяем…',
  /** Текст подтверждения «в использовании» (сообщение 400/409 называет
   *  материалы; оно присоединяется после этого предложения). */
  'admin.media.delete.inUse':
    'Это изображение ещё используется материалами. При удалении главное изображение будет убрано с затронутых материалов.',
  'admin.media.delete.confirmButton': 'Удалить всё равно',
  'admin.media.delete.cancel': 'Отмена',
  'admin.media.success.uploaded': 'Изображение загружено.',
  'admin.media.success.deleted': 'Изображение удалено.',
};
