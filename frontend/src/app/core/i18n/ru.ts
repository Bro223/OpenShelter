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
 * The legal pages were machine-translated with убежище for "shelter";
 * the dictionary audit unified them on укрытие (the UI majority), with
 * case and plural agreement re-checked per occurrence.
 * The {time} and {m} placeholders are carried over from en.ts verbatim.
 */
export const RU: Messages = {
  'menu.aria': 'Меню',
  'nav.map': 'Карта укрытий',
  'nav.guidance': 'Рекомендации',
  'nav.account': 'Аккаунт',
  'nav.admin': 'Админ',
  'nav.skip': 'Перейти к содержимому',
  'nav.primaryAria': 'Главное меню',

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
  'a11y.popup.body': 'Выберите, как OpenShelter будет выглядеть для вас. Выбор применяется сразу.',
  'a11y.option.default': 'По умолчанию',
  'a11y.option.default.desc': 'Обычный светлый вид.',
  'a11y.option.highContrast': 'Высокий контраст',
  'a11y.option.highContrast.desc': 'Тёмный фон и яркий текст.',
  'a11y.option.blackYellow': 'Чёрно-жёлтый',
  'a11y.option.blackYellow.desc': 'Жёлтый текст на чёрном фоне.',
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
  'footer.legalAria': 'Юридические ссылки',

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
  'consent.title': 'О файлах cookie и хранилище браузера',
  'consent.body':
    'OpenShelter хранит только то, что нужно для работы: токен входа, который держит вас в системе, и ваши языковые и визуальные настройки. Они хранятся в локальном хранилище вашего браузера и необходимы для работы приложения. Реклама, аналитика и отслеживание между сайтами не используются, и ваши данные никогда не продаются.',
  'consent.acknowledge': 'Понятно',
  'consent.privacyLink': 'Прочитать политику конфиденциальности',

  // --- блок «Как работает OpenShelter» (карта). Подписи кнопки
  // цитируются в русской локали (кнопка переведена), поэтому цитата честна.
  'how.title': 'Как работает OpenShelter',
  'how.what':
    'OpenShelter — независимая карта укрытий в Эстонии, которую ведёт сообщество. Это не экстренная служба и не официальный государственный сервис. В случае чрезвычайной ситуации звоните 112 и следуйте официальным указаниям.',
  // MACHINE DRAFT (the verified-green re-tint copy) — awaiting native Russian review.
  'how.sources':
    'Места берутся из двух источников. Официальные места — из открытых данных Спасательного департамента Эстонии (Päästeamet) — помечаются синим маркером «Реестр». Места, добавленные сообществом: у неподтверждённого пользователя — жёлтый треугольник, у частично подтверждённого — жёлтый круг, у полностью подтверждённого — зелёный круг. Место с открытым сообщением помечается красным маркером. Добавление сообществом никогда не становится официальным автоматически.',
  'how.report':
    'Подтверждённые пользователи могут добавить укрытие или сообщить, что указанное место закрыто, указано неточно или больше не существует. Сообщения поступают администраторам, которые рассматривают их и могут скрыть место или исправить данные.',
  'how.nearest':
    'Кнопка «Показать укрытия рядом с вами» просит браузер дать разрешение на использование вашего местоположения. Координаты используются только внутри браузера и никогда не отправляются на наши серверы. Вместо этого можно искать по адресу.',
  'how.guarantee':
    'OpenShelter не может гарантировать, что указанное место открыто, безопасно, доступно, свободно и ещё работает. Прежде всего следуйте официальным указаниям в чрезвычайной ситуации.',

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
  'authPage.register.passwordTooShort': 'Пароль должен быть не короче 8 символов.',
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
  'authPage.reset.newPasswordTooShort': 'Пароль должен быть не короче 8 символов.',
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
  // around you» переведена (map.aroundYou), поэтому тексты гекодера
  // цитируют именно её русскую подпись.
  'map.title': 'Карта укрытий',
  'map.subtitle':
    'Найдите зарегистрированные укрытия и укрытия, добавленные сообществом, в Эстонии.',
  'map.legend.registry': 'Реестр (Päästeamet)',
  'map.legend.partialVerified': 'Добавлено частично подтверждённым пользователем',
  'map.legend.fullVerified': 'Добавлено полностью подтверждённым пользователем',
  // Unverified community tone (green = verified, unverified is
  // the YELLOW tone; the pin palette is green/yellow/blue/red only, there
  // is no grey in it). MACHINE DRAFT — awaiting native Russian review;
  // do not treat as final.
  'map.legend.unverified': 'Добавлено неподтверждённым пользователем',
  'map.legend.reported': 'Сообщено',
  // Legend filter affordance line. MACHINE DRAFT — awaiting native
  // Russian review; do not treat as final.
  'map.legend.hint': 'Нажмите, чтобы выбрать или снять выделение',
  'map.geoNote':
    'Сначала браузер спросит разрешение. Местоположение никогда не отправляется на наши серверы и используется только для поиска ближайшего укрытия.',
  'map.aroundYou': 'Показать укрытия рядом с вами',
  'map.locating': 'Определяем ваше местоположение…',
  'map.anchorLabel': 'Найти укрытия рядом с адресом',
  'map.anchorPlaceholder': 'Улица или место в Эстонии',
  'map.search': 'Найти',
  'map.searching': 'Ищем…',
  'map.attributionLead': 'Адреса:',
  'map.osmAttribution': '© участники OpenStreetMap',
  'map.addShelter': 'Добавить укрытие',
  'map.nearestEmpty': 'Рядом с вами пока нет указанных мест.',
  'map.nearestEmpty.addFirst': 'Вы можете добавить первое.',
  'map.searched': 'Поисковый адрес',
  'map.clear': 'Сбросить',
  'map.legendAria': 'Легенда маркеров',
  'map.addressResultsAria': 'Результаты по адресу',
  'map.trustFiltersAria': 'Фильтры укрытий',
  'map.shelterListAria': 'Укрытия',
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
    'Адрес в Эстонии не найден — попробуйте другой адрес или «Показать укрытия рядом с вами».',
  'map.geocode.rateLimited': 'Поиск адресов перегружен — подождите немного и повторите.',
  'map.geocode.network':
    'Поиск адресов сейчас недоступен. Вместо этого используйте «Показать укрытия рядом с вами».',

  // --- страница укрытия. Кнопка расстояния и метки Статус/Вместимость
  // остаются английскими, как и в исходном интерфейсе.
  'detail.backToMap': 'Назад к карте',
  'detail.notFoundTitle': 'Укрытие не найдено',
  'detail.notFoundBody': 'Укрытия с таким идентификатором нет — возможно, оно было удалено.',
  'detail.locationHeading': 'Местоположение',
  'detail.loading': 'Загружаем укрытие…',
  'detail.titleFallback': 'Сведения об укрытии',
  'detail.distance.cta': 'Расстояние до вас',
  'detail.distance.pending': 'Измерение…',
  'detail.distance.fromYou': '{distance} от вас',
  'detail.detailsHeading': 'Детали',
  'detail.infoHeading': 'Информация',
  'detail.statusLabel': 'Статус',
  'detail.capacityLabel': 'Вместимость',
  'detail.lastReported': 'Последнее сообщение: {kind}',
  'detail.statusEmpty': 'Сообщений об открытости пока нет',
  'detail.capacityEmpty': 'Сообщений о заполненности пока нет',
  'detail.reportOccupancy': 'Сообщить о заполнении',
  'detail.reportOpen': 'Сообщить об открытии/закрытии',
  'detail.reportThis': 'Сообщить об этом укрытии',
  'detail.navigate': 'Google Maps',
  'detail.appleMaps': 'Apple Maps',
  'detail.navigateAria': 'Открыть пеший маршрут до {name} в Google Maps',
  'detail.appleMapsAria': 'Открыть маршрут до {name} в Apple Maps',
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
  // community pulse: концы шкалы = виды последних сообщений.
  'detail.pulse.kind.open': 'Открыто',
  'detail.pulse.kind.closed': 'Закрыто',
  'detail.pulse.kind.space': 'Есть места',
  'detail.pulse.kind.gettingFull': 'Заполняется',
  'detail.pulse.kind.full': 'Мест нет',
  'detail.pulse.recentEntry': 'кто-то из сообщества сообщил: {kind}',
  'detail.pulse.recent': 'Последние 10 сообщений',
  'detail.pulse.recentEmpty': 'Сообщений пока нет',
  'detail.pulse.emptyOpen': 'За последние 2 часа нет сообщений об открытости',
  'detail.pulse.emptyOccupancy': 'За последние 2 часа нет сообщений о заполненности',
  'detail.pulse.openClosedText': 'Сообщения: {open} открыто, {closed} закрыто',
  'detail.pulse.occupancyText':
    'Сообщения: {space} есть места, {gettingFull} заполняется, {full} мест нет',
  'detail.pulse.windowHint': 'Отражает сообщения за последние 2 часа',
  'detail.pulse.estimateNote':
    'Стрелки показывают рассчитанную оценку, а не подтверждённые данные.',

  // --- Общие формулировки о укрытиях (shared/shelter-copy.ts). Девять
  // значений, у которых уже были «близнецы» в каталоге (метки
  // доверия, метки реестров, предупреждение о неточности, УВЕРЕННЫЕ
  // заголовки заполненности), ПЕРЕИСПОЛЬЗУЮТ существующие ключи
  // (account.contrib.* / detail.band.*) — без дублирования.
  'shelter.status.reportedClosed': 'Сообщено, что закрыто',
  'shelter.status.closed': 'Закрыто',
  'shelter.status.open': 'Открыто',
  'shelter.status.openNoReports': 'Открыто (нет недавних сообщений)',
  'shelter.occupancy.hedged.space': 'Сообщено: есть свободные места',
  'shelter.occupancy.hedged.gettingFull': 'Сообщено: почти заполнено',
  'shelter.occupancy.hedged.full': 'Сообщено: заполнено',
  'shelter.recency.justNow': 'только что',
  'shelter.recency.minutes': '{minutes} мин назад',
  'shelter.recency.hours': '{hours} ч назад',
  'shelter.recency.days': '{days} дн назад',
  'shelter.recency.date': '{day} {month} {year}',
  'shelter.reportedBadge': 'Сообщено ({count})',
  'shelter.privateBadge': 'Частный дом (заявлено)',
  'shelter.privateNote': 'Это место предложено жителем, а не официальное учреждение.',
  'shelter.unverifiedWarning':
    'Это место добавлено участником сообщества и не прошло официальной проверки. В экстренной ситуации на него полагаться не стоит.',
  'shelter.lastVerified': 'Последняя проверка: {ago}',
  'shelter.lastVerifiedRegistry': 'Последняя проверка по реестру: {ago}',
  'shelter.newlyAddedUnverified': 'Новое от сообщества {ago} — ещё не проверено',
  'shelter.noVerificationRecord': 'Записи о проверке пока нет',
  'shelter.communityReports': 'Сообщения сообщества: {count} (всего, всех типов)',
  // Глубина подтверждения автора (submitter-verification-badge): один
  // подтверждённый канал или FULL при двух и более.
  'shelter.submitterVerification.email': 'Добавлено пользователем с подтверждённой почтой',
  'shelter.submitterVerification.phone': 'Добавлено пользователем с подтверждённым телефоном',
  'shelter.submitterVerification.smartId': 'Добавлено пользователем с подтверждённым Smart-ID',
  'shelter.submitterVerification.full': 'Добавлено полностью подтверждённым пользователем',
  'shelter.distance.meters': '≈ {distance} м по прямой',
  'shelter.distance.kilometers': '≈ {distance} км по прямой',
  'shelter.notice.reportSubmitted': 'Ваше сообщение отправлено.',
  'shelter.notice.reportSubmittedDamped':
    'Ваше сообщение записано с весом 0 — у вас есть собственное объявление о похожем месте, поэтому оно не учитывается при скрытии этого укрытия.',
  'shelter.notice.occupancySaved': 'Ваше сообщение о заполненности сохранено.',
  'shelter.notice.openClosedSaved': 'Ваше сообщение «открыто/закрыто» сохранено.',
  'shelter.notice.reportDuplicate': 'Вы уже сообщали об этом укрытии этого типа.',

  // --- страница добавления укрытия (поверхность вклада сообщества).
  'submit.backToMap': 'Назад к карте',
  'submit.title': 'Добавить укрытие',
  'submit.subtitle': 'Добавьте укрытие от сообщества на карту.',
  'submit.successBody':
    'Ваше место теперь в списке и отмечено как новое. Сообщения сообщества подтверждают его.',
  'submit.success.viewLocation': 'Смотреть ваше место',
  'submit.success.viewContributions': 'Посмотреть ваши добавления',
  'submit.verifyHint':
    'Этот аккаунт больше не может добавлять укрытия: его подтверждение недействительно.',
  'submit.verifyHint.link': 'К подтверждению',
  'submit.nameLabel': 'Название *',
  'submit.namePlaceholder': 'напр. общественное укрытие в Каламая',
  'submit.name.required': 'Укажите название.',
  'submit.name.tooLong': 'Название — не более 200 символов.',
  'submit.descriptionLabel': 'Описание (необязательно)',
  'submit.descriptionPlaceholder': 'Как попасть, условия, кто управляет…',
  'submit.description.tooLong': 'Описание — не более 2000 символов.',
  'submit.capacityLabel': 'Вместимость (необязательно)',
  'submit.capacityHint': '1–100 000 человек',
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
  'submit.submitting': 'Добавляем…',
  'submit.hint.from': 'Местоположение: ',
  'submit.hint.source.typed': 'введённые координаты',
  'submit.hint.source.link': 'ссылка на карту',
  'submit.hint.source.geolocation': 'координаты вашего устройства',
  'submit.hint.source.map': 'карта',
  'submit.hint.source.address': 'поиск адреса',
  'submit.hint.swapped':
    ' — распознан как долгота и широта, поэтому значения поменяны местами, чтобы точка оказалась в Эстонии',
  'submit.hint.accuracy': ' (точность около {m} м — перетащите метку, если нужно)',
  'submit.loc.missing':
    'Отметьте точку на карте, вставьте координаты или ссылку или используйте «Моё местоположение».',
  'submit.loc.noPair':
    'В этом тексте не распознаны координаты. Вставьте пару вида 59.4370, 24.7535 или ссылку на карту — либо используйте «Моё местоположение» / карту.',
  'submit.loc.outOfBounds': 'Местоположение за пределами Эстонии.',
  'submit.loc.invalid':
    'Это не похоже на координаты. Используйте пару вида 59.4370, 24.7535, строку в градусах-минутах-секундах (DMS) или ссылку на карту.',
  'submit.loc.decimalComma':
    'Используйте десятичную точку: 59.4370, 24.7535 (обнаружен десятичный разделитель — запятая).',
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

  // --- баннеры ошибок (shared error mapping, i18n-aware seam): клиентская
  // копия, которую bannerMessage() отдаёт через i18n-зацепку. Сообщения,
  // присланные сервером (ApiError.message), ключами словаря не являются.
  'error.rateLimited': 'Слишком много попыток — подождите немного и повторите.',
  'error.unauthorized': 'Нет доступа. Пожалуйста, войдите снова.',
  // Ошибки 401 при входе и 400 при подтверждении сброса пароля —
  // намеренно клиентский текст (не раскрывают, какая проверка не прошла),
  // поэтому это ключи словаря, а не английское сообщение сервера.
  'error.invalidCredentials': 'Неверная почта/телефон или пароль.',
  'error.resetBadCode':
    'Код недействителен или истёк. Проверьте последнее письмо и попробуйте снова.',
  'error.checkInput': 'Проверьте введённые данные и повторите.',
  'error.serverError': 'Что-то пошло не так. Попробуйте ещё раз.',
  'error.valueInUse': 'Это значение уже используется.',
  'error.verifyRateLimited':
    'Запрошено слишком много кодов. Подождите, прежде чем запрашивать новый (число кодов в сутки ограничено).',
  'error.verifyBadCode': 'Код недействителен или истёк. Проверьте и повторите.',
  'error.accountRateLimited': 'Слишком много запросов. Подождите немного и повторите.',
  'error.accountBadCode': 'Код недействителен или истёк. Запросите новый.',
  'error.network':
    'Не удалось подключиться к серверу. Возможно, нет соединения — повторите попытку позже.',

  // --- страница аккаунта (/account). EN — верbatim-копия текущего
  // интерфейса; RU — спокойные гражданские формулировки.
  'account.subtitle':
    'Ваш профиль и подтверждения. Имя можно исправить, указав текущий пароль; смена e-mail и телефона подтверждается кодом, отправленным на ваш другой контакт.',
  'account.profileLoadError': 'Не удалось загрузить ваш профиль. Сессия всё ещё активна.',
  'account.retrying': 'Повторяем…',
  'account.retry': 'Повторить',
  'account.identity': 'Личные данные',
  'account.name': 'Имя',
  'account.adminBadge': 'Администратор',
  'account.edit': 'Изменить',
  'account.currentPassword': 'Текущий пароль',
  'account.nameRequired': 'Укажите имя.',
  'account.passwordRequired': 'Введите текущий пароль.',
  'account.saving': 'Сохраняем…',
  'account.save': 'Сохранить изменения',
  'account.cancel': 'Отмена',
  'account.contacts': 'Контакты',
  'account.emailLabel': 'Адрес e-mail',
  'account.phoneLabel': 'Номер телефона',
  'account.verified': 'Подтверждено',
  'account.completeVerification': 'Завершить подтверждение',
  'account.changeEmail': 'Сменить адрес e-mail',
  'account.emailDone.before': 'Ваш e-mail теперь',
  'account.emailDone.after': '. При следующем входе используйте новый адрес.',
  'account.changeAgain': 'Изменить ещё раз',
  'account.newEmail': 'Новый e-mail',
  'account.newEmailPlaceholder': 'new@example.ee',
  'account.emailTooLong': 'Адрес e-mail — не более 255 символов.',
  'account.emailRequired': 'Укажите корректный e-mail.',
  'account.emailProof':
    'Изменение подтверждается 6-значным SMS-кодом, отправленным на номер телефона вашего аккаунта. На новый адрес e-mail код не отправляется.',
  'account.smsCode': 'SMS-код',
  'account.codePlaceholder': '6-значный код',
  'account.smsCodeRequired': 'Введите 6-значный код из SMS.',
  'account.smsSentHint': 'Мы отправили SMS-код на номер телефона вашего аккаунта.',
  'account.working': 'Выполняем…',
  'account.confirmNewEmail': 'Подтвердить новый e-mail',
  'account.resendIn': 'Повторная отправка через {time}',
  'account.resendCode': 'Отправить код ещё раз',
  'account.sending': 'Отправляем…',
  'account.sendIn': 'Отправить можно через {time}',
  'account.sendSmsToPhone': 'Отправить SMS-код на мой телефон',
  'account.changePhone': 'Сменить номер телефона',
  'account.phoneDone.before': 'Ваш телефон теперь',
  'account.phoneDone.after': '.',
  'account.newPhone': 'Новый телефон',
  'account.newPhonePlaceholder': '+3725… или 5xxxxxxx',
  'account.phoneTooLong': 'Номер телефона — не более 64 символов.',
  'account.phoneRequired': 'Укажите номер телефона.',
  'account.phoneProof':
    'Изменение подтверждается 6-значным кодом, отправленным на адрес e-mail вашего аккаунта. На новый номер телефона код не отправляется.',
  'account.emailCode': 'Код из письма',
  'account.emailCodeRequired': 'Введите 6-значный код из письма.',
  'account.emailCodeSentHint': 'Мы отправили код на адрес e-mail вашего аккаунта.',
  'account.confirmNewPhone': 'Подтвердить новый телефон',
  'account.sendEmailCode': 'Отправить код на мой e-mail',
  'account.contributions': 'Мои добавления',
  'account.contributionsCopy': 'Укрытия, которые вы добавили — измените или удалите их здесь.',
  'account.yourData': 'Ваши данные',
  'account.dataCopy':
    'Скачайте JSON-файл со всем, что связано с вашим аккаунтом — ваш профиль (имя, e-mail, телефон) и добавленные вами укрытия.',
  'account.preparing': 'Готовим…',
  'account.downloadData': 'Скачать мои данные (JSON)',
  'account.deleting': 'Удаляем…',
  'account.delete': 'Удаление аккаунта',
  'account.delete.adminCopy':
    'Этот аккаунт создан окружением развёртывания, поэтому его нельзя удалить из приложения. Удаление из окружения — действие оператора (убрать переменные окружения ADMIN_EMAIL и ADMIN_PASSWORD) — и сервер отказывает в удалении в любом случае.',
  'account.delete.copy':
    'Удаляет ваш аккаунт и всё, что связано с ним. Укрытия, которые вы объявили частным домом, будут удалены; добавленные вами публичные укрытия останутся на карте без автора. Это действие нельзя отменить.',
  'account.delete.typeHint': 'Введите DELETE для подтверждения',
  'account.delete.armed':
    'Кнопка «Удалить мой аккаунт» теперь доступна. Её нажатие навсегда удаляет ваш аккаунт.',
  'account.delete.button': 'Удалить мой аккаунт',
  'account.legal': 'Юридическое',
  'account.legal.lead': 'Прочтите',
  'account.legal.and': 'и',
  'account.legal.tail': '.',
  'account.success.profileUpdated': 'Ваш профиль обновлён.',
  'account.success.emailChanged': 'Ваш адрес e-mail изменён.',
  'account.success.phoneChanged': 'Ваш номер телефона изменён.',
  'account.success.exportDownloaded': 'Экспорт ваших данных загружен.',
  'account.error.sameValue': 'Это уже значение вашего аккаунта — новое должно отличаться.',

  // --- аккаунт: панель вкладок (собственные укрытия пользователя).
  'account.contrib.shelters': 'Укрытия',
  'account.contrib.loading': 'Загружаем ваши укрытия…',
  'account.contrib.empty': 'Вы пока не добавили ни одного укрытия.',
  'account.contrib.emptyCta': 'Добавить первое укрытие',
  'account.contrib.submit': 'Добавить укрытие',
  'account.contrib.source.paasteamet': 'Реестр Спасательного департамента',
  'account.contrib.source.municipality': 'Муниципальный реестр',
  'account.contrib.badge.new': 'Новое от сообщества',
  'account.contrib.badge.confirmed': 'Подтверждено сообществом',
  'account.contrib.badge.rejected': 'Отклонено',
  'account.contrib.infoRequest': 'Запрос информации',
  'account.contrib.adminNote': 'Заметка администратора: {note}',
  'account.contrib.inaccurate': 'Сообщено, что данные неточны — детали могут быть ошибочными',
  'account.contrib.hidden': 'Скрыто — об этом сообщило сообщество ({count})',
  'account.contrib.view': 'Просмотр',
  'account.contrib.info': 'Инфо',
  'account.contrib.infoClose': 'Закрыть инфо',
  'account.contrib.delete': 'Удалить',
  'account.contrib.deleteConfirm': 'Удалить это укрытие безвозвратно?',
  'account.contrib.deleteConfirmButton': 'Подтвердить удаление',
  'account.contrib.infoQuestion': 'Модератор спрашивает:',
  'account.contrib.replyLabel': 'Ваш ответ (обязательно, только один раз)',
  'account.contrib.replyRequired': 'Укажите ответ (не более 2000 символов).',
  'account.contrib.sendReply': 'Отправить ответ',
  'account.contrib.reply': 'Ваш ответ',

  // --- страница подтверждения (/verify): потоки по каналам.
  'verify.title': 'Подтвердите аккаунт',
  'verify.subtitle':
    'Подтверждённые аккаунты могут добавлять укрытия и сообщать о указанных местах. На каждый канал отправляется один код — один на адрес e-mail и один на номер телефона.',
  'verify.aria': 'Статус подтверждения',
  'verify.verified': 'Подтверждено',
  'verify.notVerified': 'Не подтверждено',
  'verify.intro':
    'Мы отправим код {destination}. Введите его здесь, чтобы подтвердить, что он ваш.',
  'verify.email.title': 'Подтвердите e-mail',
  'verify.email.destination': 'на адрес e-mail',
  'verify.email.noun': 'e-mail',
  'verify.email.send': 'Отправить код на почту',
  'verify.email.sentHint': 'Код подтверждения отправлен на ваш адрес e-mail.',
  'verify.email.codeLabel': 'Код подтверждения',
  'verify.email.codeHint': 'Введите 8-символьный код из письма.',
  'verify.email.placeholder': '8-символьный код',
  'verify.phone.title': 'Подтвердите телефон',
  'verify.phone.destination': 'на номер телефона',
  'verify.phone.noun': 'телефон',
  'verify.phone.send': 'Отправить SMS-код на телефон',
  'verify.phone.sentHint': 'SMS-код отправлен на ваш номер телефона.',
  'verify.phone.codeLabel': 'SMS-код',
  'verify.phone.codeHint': 'Введите 6-значный код из SMS.',
  'verify.phone.placeholder': '6-значный код',
  'verify.verifying': 'Подтверждаем…',
  'verify.verify': 'Подтвердить',
  'verify.fullyVerified': 'Ваш аккаунт полностью подтверждён',
  'verify.fullyVerifiedCopy':
    'Ваш e-mail и телефон подтверждены — теперь вы можете добавлять укрытия и сообщать о указанных местах.',
  'verify.verifiedCopy':
    'Ваш аккаунт подтверждён. Вы можете добавлять укрытия и сообщать о указанных местах.',
  'verify.continue': 'Продолжить',
  'verify.manageAccount': 'Управлять аккаунтом',
  'verify.backToMap': 'Назад к карте',
  'verify.alreadyVerified': 'Ваш {noun} уже подтверждён.',
  'verify.verifiedNotice': 'Ваш {noun} подтверждён.',

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
  'guidance.localeFallback':
    'Показана версия на языке {locale} — этот материал недоступен на языке {reader}.',
  'guidance.localeFallback.alternate': 'Читать версию на языке {locale}',

  // --- пагинация списков (list-page-paging: общий контрол «назад/вперёд» + размер).
  'pagination.aria': 'Страницы',
  'pagination.previous': 'Предыдущая',
  'pagination.next': 'Следующая',
  'pagination.pageOf': 'Страница {page} из {pages}',
  'pagination.size': 'На странице',
  'pagination.sizeShelters': 'Укрытий на странице',
  'pagination.sizeReports': 'Сообщений на странице',
  'pagination.sizeUsers': 'Аккаунтов на странице',
  'pagination.sizeMedia': 'Изображений на странице',
  'pagination.sizeAudit': 'Строк журнала на странице',
  'guidance.pageOutOfRange':
    'Страницы {page} не существует — список заканчивается на странице {pages}.',
  'guidance.pageFirst': 'Показать первую страницу',

  // --- администрирование: вкладка рекомендаций + редактор +
  // медиабиблиотека.
  'admin.retry': 'Повторить',

  'admin.settings.tab': 'Настройки',

  'admin.tabs.aria': 'Разделы администрирования',
  'admin.tabs.unconfirmed': 'Не подтверждено',
  'admin.tabs.shelters': 'Укрытия',
  'admin.tabs.reports': 'Сообщения об укрытиях',
  'admin.tabs.alerts': 'Оповещения',
  'admin.tabs.users': 'Пользователи',
  'admin.tabs.audit': 'Журнал аудита',
  'admin.working': 'Выполняем…',
  'admin.cancel': 'Отмена',

  'admin.unconfirmed.loading': 'Загружаем места сообщества…',
  'admin.unconfirmed.empty': 'Неподтверждённых мест сообщества нет.',
  'admin.unconfirmed.aria': 'Неподтверждённые места сообщества',
  'admin.unconfirmed.col.name': 'Название',
  'admin.unconfirmed.col.address': 'Адрес',
  'admin.unconfirmed.col.submitter': 'Отправитель',
  'admin.unconfirmed.col.actions': 'Действия',
  'admin.unconfirmed.confirm': 'Отметить подтверждённым',
  'admin.unconfirmed.reject': 'Отклонить',
  'admin.unconfirmed.reject.label': 'Причина (обязательно)',
  'admin.unconfirmed.reject.placeholder': 'Почему это место отклоняется?',
  'admin.unconfirmed.reject.required': 'Причина обязательна (не более {max} символов).',

  'admin.shelters.search.label': 'Поиск укрытий (название или адрес)',
  'admin.shelters.search.placeholder': 'напр. kelder',
  'admin.shelters.search.button': 'Найти',
  'admin.shelters.source.aria': 'Фильтр укрытий по источнику',
  'admin.shelters.source.all': 'Все',
  'admin.shelters.source.registry': 'Реестр',
  'admin.shelters.source.community': 'Сообщество',
  'admin.shelters.loading': 'Загружаем укрытия…',
  'admin.shelters.empty': 'Укрытий нет.',
  'admin.shelters.emptyFiltered': 'Ни одно укрытие не соответствует текущему фильтру.',
  'admin.shelters.pageOutOfRange':
    'Страницы {page} не существует — список заканчивается на странице {pages}.',
  'admin.shelters.aria': 'Укрытия',
  'admin.shelters.col.name': 'Название',
  'admin.shelters.col.source': 'Источник',
  'admin.shelters.col.status': 'Статус',
  'admin.shelters.col.reports': 'Сообщения',
  'admin.shelters.col.occupancy': 'Занятость',
  'admin.shelters.col.submitter': 'Отправитель',
  'admin.shelters.col.actions': 'Действия',
  'admin.shelters.status.hidden': 'Скрыто',
  'admin.shelters.status.active': 'Активно',
  'admin.shelters.history': 'История',
  'admin.shelters.history.close': 'Закрыть историю',
  'admin.shelters.info': 'Инфо',
  'admin.shelters.info.close': 'Закрыть информацию',
  'admin.shelters.inaccurate.clear': 'Снять пометку о неточности',
  'admin.shelters.inaccurate.mark': 'Отметить неточным',
  'admin.shelters.inaccurate.markClose': 'Закрыть пометку',
  'admin.shelters.hide': 'Скрыть',
  'admin.shelters.activate': 'Активировать',
  'admin.shelters.delete': 'Удалить',
  'admin.shelters.delete.confirm': 'Удалить это укрытие безвозвратно?',
  'admin.shelters.delete.working': 'Удаляем…',
  'admin.shelters.delete.confirmButton': 'Подтвердить удаление',
  'admin.shelters.readOnly': 'только для чтения',

  'admin.shelters.history.loading': 'Загружаем историю…',
  'admin.shelters.history.empty': 'История пока пуста.',
  'admin.shelters.info.request': 'Запрос информации',
  'admin.shelters.info.answer': 'Ответ',
  'admin.shelters.info.waiting': 'Ожидаем ответ отправителя.',
  'admin.shelters.info.question.label': 'Вопрос отправителю (обязательно)',
  'admin.shelters.info.question.placeholder': 'Что вам нужно от отправителя?',
  'admin.shelters.info.question.required': 'Вопрос обязателен (не более {max} символов).',
  'admin.shelters.info.send': 'Отправить',
  'admin.shelters.info.sending': 'Отправляем…',
  'admin.shelters.inaccurate.reason.label': 'Причина (необязательно)',
  'admin.shelters.inaccurate.reason.placeholder': 'Что вы нашли неточным?',
  'admin.shelters.inaccurate.reason.max': 'Не более {max} символов.',
  'admin.shelters.inaccurate.marking': 'Отмечаем…',
  'admin.shelters.inaccurate.badge': 'Неточно',
  'admin.shelters.success.confirmed': 'Место подтверждено.',
  'admin.shelters.success.rejected': 'Место отклонено.',
  'admin.shelters.success.hidden': 'Укрытие скрыто.',
  'admin.shelters.success.restored': 'Укрытие восстановлено.',
  'admin.shelters.success.deleted': 'Укрытие удалено.',
  'admin.shelters.success.questionSent': 'Вопрос отправлен заявителю.',
  'admin.shelters.success.inaccurateMarked': 'Отмечено как неточное.',
  'admin.shelters.success.inaccurateCleared': 'Отметка о неточности снята.',

  'admin.reports.loading': 'Загружаем сообщения…',
  'admin.reports.empty': 'Сообщений нет.',
  'admin.reports.dismissed': 'Отклонено',
  'admin.reports.notCounted': 'Не учтено',
  'admin.reports.notCounted.reason':
    'Не учтено: у заявителя уже есть своё укрытие с тем же названием в том же месте.',
  'admin.reports.restore': 'Восстановить укрытие',
  'admin.reports.dismiss': 'Отклонить',
  'admin.reports.success.dismissed': 'Сообщение отклонено.',

  // Вкладка сообщений: фильтр скрытия отклонённых — по умолчанию ('Все')
  // показывается всё, фильтр ничего не скрывает молча.
  'admin.reports.filter.aria': 'Фильтр сообщений об укрытиях',
  'admin.reports.filter.all': 'Все',
  'admin.reports.filter.open': 'Только открытые',
  'admin.reports.emptyOpen': 'Открытых сообщений нет.',
  'admin.reports.pageOutOfRange':
    'Страницы {page} не существует — список заканчивается на странице {pages}.',
  'admin.users.pageOutOfRange':
    'Страницы {page} не существует — список заканчивается на странице {pages}.',
  'admin.media.pageOutOfRange':
    'Страницы {page} не существует — список заканчивается на странице {pages}.',
  'admin.audit.pageOutOfRange':
    'Страницы {page} не существует — список заканчивается на странице {pages}.',

  'admin.alerts.loading': 'Загружаем оповещения…',
  'admin.alerts.empty': 'Ограниченной или злоупотребляющей активности пока нет.',
  'admin.alerts.aria': 'Оповещения о злоупотреблениях',
  'admin.alerts.col.when': 'Когда',
  'admin.alerts.col.type': 'Тип',
  'admin.alerts.col.subject': 'Объект',
  'admin.alerts.col.detail': 'Детали',
  'admin.alerts.col.retryAfter': 'Повтор через',

  'admin.users.loading': 'Загружаем аккаунты…',
  'admin.users.empty': 'Аккаунтов пока нет.',
  'admin.users.aria': 'Аккаунты',
  'admin.users.col.name': 'Название',
  'admin.users.col.email': 'E-mail',
  'admin.users.col.kind': 'Тип',
  'admin.users.col.status': 'Статус',
  'admin.users.col.actions': 'Действия',
  'admin.users.suspended': 'Приостановлен',
  'admin.users.active': 'Активен',
  'admin.users.suspend.confirm':
    'Приостановить этот аккаунт? Он теряет вход, обновление и свою открытую сессию; его укрытия останутся на карте.',
  'admin.users.unsuspend.confirm': 'Восстановить доступ этого аккаунта?',
  'admin.users.suspend.confirmButton': 'Подтвердить приостановку',
  'admin.users.unsuspend.confirmButton': 'Подтвердить возобновление',
  'admin.users.suspend': 'Приостановить',
  'admin.users.unsuspend': 'Возобновить',
  'admin.users.notSuspendable': 'Не подлежит приостановке',
  'admin.users.success.suspended': 'Пользователь приостановлен.',
  'admin.users.success.unsuspended': 'Доступ пользователя восстановлен.',

  'admin.audit.loading': 'Загружаем журнал аудита…',
  'admin.audit.empty': 'Действий модерации пока нет.',
  'admin.audit.aria': 'Журнал аудита',
  'admin.audit.col.when': 'Когда',
  'admin.audit.col.moderator': 'Модератор',
  'admin.audit.col.subject': 'Объект',
  'admin.audit.col.action': 'Действие',
  'admin.audit.col.change': 'Изменение',
  'admin.audit.col.reason': 'Причина',

  'admin.siteTexts.loading': 'Загружаем тексты сайта…',
  'admin.siteTexts.hint1':
    'Оставьте поле пустым, чтобы использовать поставляемое значение по умолчанию (показано как плейсхолдер). Сохранение очищенного поля удаляет переопределение. Адреса ссылок должны начинаться с ',
  'admin.siteTexts.hint2': ' и общие для всех трёх языков.',
  'admin.siteTexts.linkLabel': 'Ссылка (https, все языки)',
  'admin.siteTexts.saving': 'Сохраняем…',
  'admin.siteTexts.save': 'Сохранить изменения',
  'admin.siteTexts.loadError': 'Не удалось загрузить тексты сайта.',
  'admin.siteTexts.urlError': 'Адреса ссылок должны начинаться с https://.',
  'admin.siteTexts.noChanges': 'Нет изменений для сохранения.',
  'admin.siteTexts.saved': 'Сохранено.',
  'admin.siteTexts.saveFailed': 'Не удалось сохранить.',
  'admin.siteTexts.saveFailedWith': 'Не удалось сохранить: {message}',

  'admin.guidance.tab': 'Рекомендации',
  'admin.guidance.loading': 'Загружаем материалы…',
  'admin.guidance.emptyLocale': 'Статей на языке {locale} пока нет.',
  'admin.guidance.shownIn':
    'Материалы на языке {locale} — остальные языки редактируются из своих списков.',
  'admin.guidance.search.label': 'Поиск материалов (заголовок или текст)',
  'admin.guidance.search.placeholder': 'напр. бункер',
  'admin.guidance.search.button': 'Поиск',
  'admin.guidance.search.clear': 'Сбросить',
  'admin.guidance.noMatch': 'Статей на языке {locale} по запросу «{query}» не найдено.',
  'admin.guidance.pageOutOfRange':
    'Страницы {page} не существует — список заканчивается на странице {pages}.',
  'admin.pageFirst': 'Показать первую страницу',
  'admin.guidance.language.label': 'Язык контента',
  'admin.guidance.language.hint':
    'Язык материалов, которые отображаются и редактируются здесь. При первом использовании совпадает с языком интерфейса, затем независим.',
  'admin.guidance.create': 'Новый материал',
  'admin.guidance.col.title': 'Название',
  'admin.guidance.col.position': 'Позиция',
  'admin.guidance.col.status': 'Статус',
  'admin.guidance.col.locale': 'Язык',
  'admin.guidance.col.pinned': 'Закреплён',
  'admin.guidance.col.published': 'Опубликован',
  'admin.guidance.col.updated': 'Обновлён',
  'admin.guidance.col.actions': 'Действия',
  'admin.guidance.posts.aria': 'Рекомендации',
  'admin.guidance.order.hint':
    'Материалы отображаются посетителям в этом порядке — перетащите строку или используйте кнопки.',
  'admin.guidance.order.pagedHint':
    'Для изменения порядка весь список должен быть на одной странице — установите размер страницы {max}.',
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
  'admin.guidance.success.translationCreated': 'Перевод создан.',
  'admin.guidance.success.translationUpdated': 'Перевод обновлён.',
  'admin.guidance.success.translationDeleted': 'Перевод удалён.',

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
  /** Подпись поля импорта по URL (guidance-hero-import): НЕОБЯЗАТЕЛЬНЫЙ
   *  импорт — сервер скачает, проверит и сохранит изображение при
   *  СОХРАНЕНИИ (вместо выбора из библиотеки). */
  'admin.guidance.editor.hero.importLabel': 'Импорт по URL (необязательно)',
  /** Постоянная подсказка: изображение не скачивается при
   *  редактировании — при сохранении сервер скачает, проверит и
   *  сохранит его; изменённый URL импортируется при следующем
   *  сохранении. */
  'admin.guidance.editor.hero.importHint':
    'При редактировании изображение не скачивается. При сохранении сервер скачает, проверит и сохранит его; если вы измените URL, следующее сохранение импортирует новый.',
  /** URL не прошёл проверку формата (зеркалирует серверную 400 при
   *  записи): не полный http(s)-адрес или содержит учётные данные. */
  'admin.guidance.editor.hero.importInvalid':
    'Укажите полный адрес http:// или https:// без имени пользователя и пароля. Оставьте поле пустым, чтобы не импортировать.',
  /** Явный флажок «без изображения»: отмечен = нет ни ресурса из
   *  библиотеки, ни ожидающего URL импорта (контролы выбора
   *  изображения отключены). */
  'admin.guidance.editor.hero.none': 'Без изображения',
  /** Показывается, пока сохранён URL импорта: скачивание происходит
   *  при СОХРАНЕНИИ (создание и изменение, черновики и опубликованные
   *  посты) — неуспешный импорт никогда не блокирует сохранение: пост
   *  всё равно сохраняется, сохраняет предыдущее изображение (или
   *  ничего) и URL для повторной попытки. */
  'admin.guidance.editor.hero.importNote':
    'Изображение импортируется при сохранении. Если скачивание не удастся, пост всё равно сохранится, а ошибка будет показана ниже — пост сохранит предыдущее изображение (или останется без него), и URL останется для повторной попытки.',
  /** Импорт при сохранении не удался в том сохранении, что сохранило
   *  пост (heroImportError ответа записи): вступительная строка над
   *  серверным сообщением (оно показывается сразу ниже) — не должна
   *  читаться как сбой сохранения: пост СОХРАНЁН (это сказано
   *  первым), затем возможные действия (проверить URL и сохранить ещё
   *  раз, чтобы повторить попытку, или очистить поле, чтобы продолжить
   *  без изображения), двоеточие ведёт к серверной причине. */
  'admin.guidance.editor.hero.importFailed':
    'Пост сохранён, но изображение не удалось загрузить по этому URL. Проверьте URL и сохраните ещё раз, чтобы повторить попытку, или очистите поле, чтобы продолжить без изображения:',
  /** Подпись alt; межполевое правило (обязателен, если выбрано
   *  изображение) проверяется в UI двумя ошибками ниже, как и серверная
   *  400. */
  'admin.guidance.editor.altLabel': 'Альтернативный текст изображения (необязательно)',
  'admin.guidance.editor.altRequired':
    'Альтернативный текст обязателен, если выбрано главное изображение.',
  'admin.guidance.editor.altForbidden':
    'Уберите альтернативный текст или выберите главное изображение.',
  'admin.guidance.editor.altTooLong': 'Альтернативный текст — не более 300 символов.',
  'admin.guidance.editor.localeLabel': 'Язык поста',
  'admin.guidance.editor.localeHint':
    'Домашний язык поста, например en. Заполняется автоматически: при создании — активный язык интерфейса, при редактировании — язык поста.',
  'admin.guidance.editor.localeTooLong': 'Язык — не более 5 символов.',
  'admin.guidance.editor.editingIn': 'Вы редактируете контент поста на языке {locale}.',
  'admin.guidance.editor.creatingIn': 'Пост будет создан на языке {locale}.',
  'admin.guidance.editor.homeLocaleNote':
    'Домашний язык поста — {home}. Сохранение меняет только контент {locale} — у остальных языков свой текст.',
  'admin.guidance.editor.translatingIn':
    'Вы добавляете перевод этого материала на язык {locale} — остальные языки не изменятся.',
  'admin.guidance.editor.editingTranslationIn':
    'Вы редактируете перевод этого материала на языке {locale} — остальные языки не изменятся.',
  'admin.guidance.editor.translationTitle': 'Добавить перевод',
  'admin.guidance.editor.translationEditTitle': 'Редактировать перевод',
  'admin.guidance.editor.translations.title': 'Переводы',
  'admin.guidance.editor.translations.loading': 'Загрузка переводов…',
  'admin.guidance.editor.translations.empty':
    'Переводов пока нет — только домашний язык материала.',
  'admin.guidance.editor.translations.home': 'домашний',
  'admin.guidance.editor.translations.add': 'Добавить перевод на {locale}',
  'admin.guidance.editor.translations.edit': 'Изменить перевод',
  'admin.guidance.editor.translations.delete': 'Удалить перевод',
  'admin.guidance.editor.translations.delete.confirm':
    'Удалить перевод этого материала на языке {locale}? Текст на этом языке будет удалён; сам материал и остальные языки останутся.',
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
  'admin.media.col.size': 'Размер',
  'admin.media.col.uploaded': 'Загружено',
  'admin.media.col.usedBy': 'Используется в',
  'admin.media.col.actions': 'Действия',
  'admin.media.library.aria': 'Медиабиблиотека',
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

  'legal.toc.aria': 'Содержание',
  'legal.privacy.title': 'Политика конфиденциальности',
  'legal.privacy.updated': 'Последнее обновление: 16 сентября 2026 г.',
  'legal.privacy.who': 'Кто управляет OpenShelter',
  'legal.privacy.scope': 'Область применения политики',
  'legal.privacy.collect': 'Какие персональные данные мы собираем',
  'legal.privacy.why': 'Почему мы обрабатываем каждую категорию',
  'legal.privacy.verification': 'Создание аккаунта и подтверждение',
  'legal.privacy.location': 'Местоположение и геолокация',
  'legal.privacy.content': 'Содержание, создаваемое пользователями',
  'legal.privacy.cookies': 'Файлы cookie и хранилище браузера',
  'legal.privacy.thirdParties': 'Сторонние поставщики услуг',
  'legal.privacy.sharing': 'Передача данных',
  'legal.privacy.retention': 'Хранение данных',
  'legal.privacy.rights': 'Ваши права в соответствии с Общим регламентом по защите данных (GDPR)',
  'legal.privacy.security': 'Безопасность данных',
  'legal.privacy.children': 'Дети',
  'legal.privacy.changes': 'Изменения в политике',
  'legal.privacy.contact': 'Контакт',
  'legal.privacy.who.p1':
    'OpenShelter — карта укрытий и безопасных мест в Эстонии с открытым исходным кодом, поддерживаемая сообществом. Оператор: [OPERATOR LEGAL NAME], [POSTAL ADDRESS]. Контакт по защите данных: [DATA PROTECTION CONTACT].',
  'legal.privacy.who.p2.before': 'OpenShelter ',
  'legal.privacy.who.p2.strong': 'не является официальным государственным сервисом',
  'legal.privacy.who.p2.after':
    ' и не является аварийной службой. Официальные данные об укрытиях, отображаемые в приложении, импортируются из открытых данных Спасательного департамента (Päästeamet), при этом само приложение управляется независимо.',
  'legal.privacy.scope.p1':
    'Настоящая политика описывает, как OpenShelter собирает, использует, хранит и удаляет персональные данные при использовании веб-приложения. Она не распространяется на внешние веб-сайты, на которые мы даём ссылки (Спасательный департамент, Maa-amet и OpenStreetMap).',

  'legal.privacy.collect.p1':
    'Мы собираем только то, что нужно для работы приложения. При создании аккаунта мы храним:',
  'legal.privacy.collect.li1.before': 'ваше ',
  'legal.privacy.collect.li1.strong': 'полное имя',
  'legal.privacy.collect.li1.after': ';',
  'legal.privacy.collect.li2.before': 'ваш ',
  'legal.privacy.collect.li2.strong': 'адрес e-mail',
  'legal.privacy.collect.li2.after': ';',
  'legal.privacy.collect.li3.before': 'ваш ',
  'legal.privacy.collect.li3.strong': 'номер телефона',
  'legal.privacy.collect.li3.after': ';',
  'legal.privacy.collect.li4.before': 'ваш ',
  'legal.privacy.collect.li4.strong': 'пароль',
  'legal.privacy.collect.li4.after': ', который хранится только в виде одностороннего хеша.',
  'legal.privacy.collect.p2.before': 'Мы ',
  'legal.privacy.collect.p2.strong': 'не',
  'legal.privacy.collect.p2.middle':
    'собираем национальный код личности и не используем рекламу, аналитику и межсайтовое отслеживание. Когда вы вносите вклад в карту, мы храним содержимое, которое вы добавляете (укрытия и сообщения), как описано в разделе ',
  'legal.privacy.collect.p2.link': 'содержании, создаваемом пользователями',
  'legal.privacy.collect.p2.after': '.',

  'legal.privacy.why.p1':
    'Каждая категория обрабатывается для конкретной цели и ни для каких иных целей:',
  'legal.privacy.why.li1.strong': 'Имя',
  'legal.privacy.why.li1.after':
    ' - отображается на вашем аккаунте и, для публичных добавлений, на карте.',
  'legal.privacy.why.li2.strong': 'Адрес e-mail',
  'legal.privacy.why.li2.after':
    ' - подтверждение аккаунта, сброс пароля и межканальное подтверждение при смене номера телефона.',
  'legal.privacy.why.li3.strong': 'Номер телефона',
  'legal.privacy.why.li3.after':
    ' - подтверждение аккаунта, вход и межканальное подтверждение при смене адреса e-mail.',
  'legal.privacy.why.li4.strong': 'Пароль',
  'legal.privacy.why.li4.after':
    ' - аутентификация. Хранится только как односторонний хеш, поэтому его невозможно прочитать обратно.',
  'legal.privacy.why.li5.strong': 'Добавленное содержимое',
  'legal.privacy.why.li5.after':
    ' - отображается на публичной карте и используется администраторами для модерации и предотвращения злоупотреблений.',
  'legal.privacy.why.p2': 'Правовое основание для каждой цели — [LEGAL BASIS TO BE CONFIRMED].',
  'legal.privacy.verification.p1':
    'Картой можно пользоваться без аккаунта. Чтобы добавлять укрытия или сообщения, нужно создать аккаунт и подтвердить одноразовыми кодами и адрес e-mail, и номер телефона. Подтверждение работает так: на каждый контакт отправляется одноразовый код; пока оба не подтверждены, вы можете входить, но не можете добавлять содержимое.',
  'legal.privacy.verification.p2':
    'Сброс пароля выполняется одноразовым кодом, который отправляется на ваш адрес e-mail. Смена адреса e-mail подтверждается кодом, отправленным на ваш текущий номер телефона, а смена номера телефона — кодом, отправленным на ваш текущий адрес e-mail.',
  'legal.privacy.verification.p3':
    'Для предотвращения злоупотреблений приложение применяет ограничения на запросы кодов и на добавление укрытий и обнаруживает близкие дубликаты. Превышение ограничения приводит к ошибке, а не к блокировке.',
  'legal.privacy.location.p1.before': 'Мы видим ваше местоположение только тогда, когда ',
  'legal.privacy.location.p1.em': 'вы',
  'legal.privacy.location.p1.after':
    ' просите о нём. Кнопка «Показать укрытия рядом с вами» на карте, действие «Расстояние до вас» на странице укрытия и опция «Моё местоположение» в форме отправки сначала показывают запрос разрешения самого вашего браузера. Если вы откажетесь, ничего не изменится.',

  'legal.privacy.location.p2.before': 'На карте ближайшее укрытие определяется ',
  'legal.privacy.location.p2.strong': 'внутри вашего браузера',
  'legal.privacy.location.p2.after':
    '; ваше фактическое местоположение никогда не отправляется на наши серверы. Если вы добавляете укрытие в своём местоположении, сохраняется только выбранная вами координата как часть этого добавления.',
  'legal.privacy.location.p3.before': 'Мы ',
  'legal.privacy.location.p3.strong': 'никогда',
  'legal.privacy.location.p3.after':
    'вычисляем ваше местоположение по вашему IP-адресу. Поиск адресов использует геокодер Nominatim от OpenStreetMap; запрос поиска отправляется только тогда, когда вы целенаправленно ищете адрес.',
  'legal.privacy.content.p1.before':
    'Когда вы вносите вклад, приложение хранит ваши укрытия и ваши сообщения (например, что место закрыто, указано неточно или больше не существует). Это содержимое становится частью публичной карты сообщества. Свои укрытия вы можете редактировать или удалять ',
  'legal.privacy.content.p1.after': '; сообщения рассматриваются администраторами.',
  'legal.privacy.content.p2':
    'Модераторы могут рассматривать, скрывать, исправлять или удалять содержимое, добавленное пользователями. Приложение хранит запись о модерации, чтобы решения можно было проверить.',
  'legal.privacy.cookies.p1':
    'OpenShelter не использует файлы cookie для рекламы. В локальном хранилище вашего браузера хранятся только следующие элементы, каждый из которых технически необходим:',
  'legal.privacy.cookies.li1.before': 'один ',
  'legal.privacy.cookies.li1.strong': 'токен входа',
  'legal.privacy.cookies.li1.after': ', который держит вас в системе между перезагрузками страниц;',
  'legal.privacy.cookies.li2.before': 'ваши ',
  'legal.privacy.cookies.li2.strong': 'языковые настройки',
  'legal.privacy.cookies.li2.after': ' (эстонский, английский или русский);',
  'legal.privacy.cookies.li3.before': 'ваши ',
  'legal.privacy.cookies.li3.strong': 'настройки отображения',
  'legal.privacy.cookies.li3.after': ' (режим высокой контрастности).',
  'legal.privacy.cookies.p2':
    'Ваш токен доступа удерживается только в памяти и уничтожается, когда вы закрываете вкладку. Ни одна третья сторона не получает эти элементы.',

  'legal.privacy.thirdParties.p1':
    'Мы используем небольшое количество сторонних сервисов, каждый — только для выполнения конкретной функции:',
  'legal.privacy.thirdParties.li1.before': 'одна ',
  'legal.privacy.thirdParties.li1.strong': 'услуга доставки e-mail',
  'legal.privacy.thirdParties.li1.after':
    ' (SendPulse, по SMTP) для отправки кодов подтверждения и кодов сброса пароля. Она получает адрес e-mail получателя для доставки сообщения.',
  'legal.privacy.thirdParties.li2.before': 'один ',
  'legal.privacy.thirdParties.li2.strong': 'сервис текстовых сообщений',
  'legal.privacy.thirdParties.li2.after':
    ' (Twilio) для отправки кодов подтверждения. Он получает номер телефона получателя для доставки сообщения.',
  'legal.privacy.thirdParties.li3.strong': 'OpenStreetMap',
  'legal.privacy.thirdParties.li3.after':
    ' — картографические тайлы и геокодер Nominatim, которые получают область карты, которую вы просматриваете, или адрес, который вы ищете.',
  'legal.privacy.thirdParties.p2':
    'Официальные данные об укрытиях импортируются из открытых данных Спасательного департамента (Päästeamet); это входящий источник данных, а не сервис, на который мы отправляем ваши данные. Влечёт ли какой-либо из этих поставщиков международную передачу данных — [TO BE CONFIRMED].',
  'legal.privacy.sharing.p1':
    'Мы не продаём ваши персональные данные и не передаём их в рекламных или иных коммерческих целях. Единственные раскрытия данных — перечисленным выше поставщикам услуг, в целях доставки сообщений, которые вы запрашиваете. Данные об укрытиях, которые вы добавляете, становятся частью публичного списка сообщества; после удаления аккаунта публичные добавления остаются на карте без указания автора.',
  'legal.privacy.retention.p1':
    'Данные вашего аккаунта хранятся, пока существует ваш аккаунт. Удаление аккаунта немедленно удаляет ваши персональные данные: укрытия, которые вы указали как частное жильё, удаляются, а публичные укрытия, которые вы добавили, остаются на карте без указания отправителя.',
  'legal.privacy.retention.p2.before':
    'Мы также устанавливаем фиксированные сроки хранения: аккаунт, в котором нет активности входа (регистрация, вход или обновление сессии) в течение ',
  'legal.privacy.retention.p2.strong': '24 месяца',
  'legal.privacy.retention.p2.middle':
    'удаляется по тому же правилу удаления, что и при удалении аккаунта, а записи о модерации и аудите старше ',
  'legal.privacy.retention.p2.strong2': '24 месяца',
  'legal.privacy.retention.p2.after': 'удаляются.',
  'legal.privacy.retention.p3.before':
    'Введение этих сроков в действие — переключатель на уровне развёртывания (',
  'legal.privacy.retention.p3.code': 'RETENTION_ENABLED',
  'legal.privacy.retention.p3.after':
    '): когда переключатель выключен, неактивные аккаунты и старые записи аудита сохраняются.',
  'legal.privacy.retention.p4':
    'Публичные добавления сообщества никогда не удаляются автоматически: они остаются на карте без указания автора, пока модератор их не удалит.',

  'legal.privacy.rights.p1':
    'Если вы находитесь в Европейской экономической зоне, вы имеете право:',
  'legal.privacy.rights.li1.strong': 'Доступ',
  'legal.privacy.rights.li1.and': ' и ',
  'legal.privacy.rights.li1.strong2': 'переносимость',
  'legal.privacy.rights.li1.middle':
    ' - загрузите JSON-экспорт вашего профиля и всего, что вы добавили, с ',
  'legal.privacy.rights.li1.after': '.',
  'legal.privacy.rights.li2.strong': 'Исправление',
  'legal.privacy.rights.li2.after':
    ' - исправьте своё имя или измените адрес e-mail или номер телефона (каждая смена подтверждается кодом).',
  'legal.privacy.rights.li3.strong': 'Удаление',
  'legal.privacy.rights.li3.middle': ' - удалите свой аккаунт с ',
  'legal.privacy.rights.li3.after':
    '. Публичные добавления не удаляются, а остаются на карте без указания автора, как описано выше.',
  'legal.privacy.rights.li4.strong': 'Ограничение',
  'legal.privacy.rights.li4.and': ' и ',
  'legal.privacy.rights.li4.strong2': 'возражение',
  'legal.privacy.rights.li4.after': ' - обратитесь к контакту по защите данных, указанному ниже.',
  'legal.privacy.rights.p2':
    'Вы также можете подать жалобу в Инспекцию по защите данных Эстонии (Andmekaitse Inspektsioon).',
  'legal.privacy.security.p1.before': 'Ваш адрес e-mail и номер телефона ',
  'legal.privacy.security.p1.strong': 'зашифрованы в состоянии покоя',
  'legal.privacy.security.p1.after':
    ' (AES-256-GCM). Операции поиска, такие как вход и проверка дубликатов, выполняются по отдельному одностороннему индексу, который нельзя обратить обратно в ваши контактные данные. Ваш пароль хранится как односторонний хеш Argon2. Ключи шифрования хранятся вне базы данных и никогда не записываются в код или журналы.',
  'legal.privacy.security.p2':
    'Приложение применяет ограничения на коды подтверждения, сброс пароля и добавление содержимого, отправляет заголовки безопасности в каждом ответе и требует HTTPS для доступа к местоположению.',

  'legal.privacy.children.p1':
    'OpenShelter не предназначен для детей и не собирает персональные данные детей осознанно. В настоящее время приложение не проверяет возраст пользователя.',
  'legal.privacy.changes.p1':
    'Мы можем обновлять настоящую политику по мере развития приложения. Версия на этой странице является действующей в момент, когда вы её читаете. Существенные изменения будут отражены в дате «Последнее обновление» выше.',
  'legal.privacy.contact.p1.before':
    'Вопросы о настоящей политике или о ваших данных можно отправлять на [CONTACT EMAIL] или по контакту по защите данных [DATA PROTECTION CONTACT]. OpenShelter также регулируется ',
  'legal.privacy.contact.p1.after': '.',
  'legal.privacy.link.accountPage': 'страницы аккаунта',
  'legal.privacy.link.terms': 'условиями использования',
  'legal.terms.title': 'Условия использования',
  'legal.terms.updated': 'Последнее обновление: 13 сентября 2026 г.',
  'legal.terms.emergencyNumber': '112',
  'legal.terms.acceptance': 'Принятие настоящих условий',
  'legal.terms.service': 'Что такое OpenShelter',
  'legal.terms.eligibility': 'Кому доступно приложение и аккаунты',
  'legal.terms.security': 'Безопасность аккаунта',
  'legal.terms.rules': 'Правила для добавлений',
  'legal.terms.prohibited': 'Запрещённое содержимое и поведение',
  'legal.terms.license': 'Интеллектуальная собственность и ваша лицензия',
  'legal.terms.moderation': 'Модерация и удаление',
  'legal.terms.official': 'Официальные данные и данные сообщества',
  'legal.terms.emergency': 'Оговорка о чрезвычайных ситуациях',
  'legal.terms.warranty': 'Отсутствие гарантии',
  'legal.terms.liability': 'Ограничение ответственности',
  'legal.terms.thirdParty': 'Сторонние ссылки и сервисы',
  'legal.terms.availability': 'Доступность сервиса и изменения',
  'legal.terms.source': 'Лицензия с открытым исходным кодом',
  'legal.terms.law': 'Применимое право и споры',
  'legal.terms.contact': 'Контакт',

  'legal.terms.acceptance.p1':
    'Используя OpenShelter, вы принимаете настоящие условия использования. Если вы не согласны — не используйте приложение. Продолжение использования приложения после изменений означает принятие обновлённых условий.',
  'legal.terms.service.p1':
    'OpenShelter — независимая карта укрытий и безопасных мест в Эстонии, поддерживаемая сообществом. Она сочетает официальные открытые данные Спасательного департамента (Päästeamet) с местами, добавленными членами сообщества.',
  'legal.terms.service.p2.before': 'OpenShelter ',
  'legal.terms.service.p2.strong': 'не является официальной аварийной службой',
  'legal.terms.service.p2.middle':
    ' и не является государственным сервисом. В чрезвычайной ситуации звоните ',
  'legal.terms.service.p2.after':
    ' и следуйте указаниям Спасательного департамента, местных органов власти и аварийных служб.',
  'legal.terms.eligibility.p1':
    'Картой можно пользоваться без аккаунта. Чтобы добавлять укрытия или сообщения, нужен аккаунт, и аккаунт становится способным к добавлениям после того, как вы подтвердите одноразовыми кодами и адрес e-mail, и номер телефона. Вы несёте ответственность за точность зарегистрированных контактов.',
  'legal.terms.security.p1':
    'Вы несёте ответственность за сохранность вашего пароля и за всё, что выполняется через ваш аккаунт. Не сообщайте свой пароль и одноразовые коды подтверждения. Если вы считаете, что ваш аккаунт был скомпрометирован, сбросьте пароль.',
  'legal.terms.rules.li1':
    'Добавляйте только те места, о существовании которых вы знаете, с деталями, точными, насколько вам известно.',
  'legal.terms.rules.li2':
    'Сообщайте о местах (как о закрытых, неточных или более не существующих) честно и только исходя из того, что вы действительно знаете.',
  'legal.terms.rules.li3':
    'Не добавляйте частные жилые дома как публичные укрытия. Если вы добавляете место, которое является частным жильём, укажите это.',
  'legal.terms.rules.li4':
    'Приложение применяет ограничения: дневной лимит на добавления, лимит на частоту запросов одноразовых кодов и обнаружение близких дубликатов. Превышение лимита приводит к ошибке и рекомендованному времени ожидания; это не блокировка.',

  'legal.terms.prohibited.p1': 'Вы не должны:',
  'legal.terms.prohibited.li1':
    'добавлять ложные, вводящие в заблуждение, небезопасные или вредоносные данные об укрытиях или сообщения;',
  'legal.terms.prohibited.li2':
    'добавлять частные жилые дома как публичные укрытия, не указав их как частные;',
  'legal.terms.prohibited.li3':
    'спамить, автоматизировать доступ или пытаться атаковать или перегрузить приложение;',
  'legal.terms.prohibited.li4':
    'пытаться получить доступ к аккаунту другого пользователя или к функциям администратора;',
  'legal.terms.prohibited.li5':
    'добавлять содержимое, которое является незаконным, порочащим или раскрывающим чужие личные данные.',
  'legal.terms.prohibited.p2':
    'Намеренно ложные или вводящие в заблуждение данные об укрытиях — это злоупотребление сервисом, которое может привести к удалению содержимого или приостановке вашего аккаунта.',
  'legal.terms.license.p1':
    'Добавляя укрытие или сообщение, вы предоставляете OpenShelter неисключительную, мировую, бесплатную лицензию хранить, отображать и изменять это содержимое в целях эксплуатации карты и его модерации. Право собственности на добавленное остаётся за вами, и вы можете редактировать или удалять свои укрытия.',
  'legal.terms.moderation.p1':
    'Добавления попадают в список как сообщения сообщества. Модераторы могут рассматривать, скрывать, исправлять или удалять содержимое, добавленное пользователями, и могут приостанавливать аккаунты, которые злоупотребляют сервисом. Таким образом, добавление может быть рассмотрено, скрыто или отклонено.',
  'legal.terms.official.p1.before':
    'Приложение различает источники информации. Места, отмеченные как «Реестр», — из официальных открытых данных. Места, отмеченные «Новое от сообщества» или «Подтверждено сообществом», — добавленные членами сообщества. ',
  'legal.terms.official.p1.em': 'подтверждённый пользователь',
  'legal.terms.official.p1.middle':
    'подтвердил владение адресом e-mail и номером телефона; это ничего не говорит о точности того, что он добавляет. ',
  'legal.terms.official.p1.strong': 'Подтверждённый пользователь — не подтверждённое укрытие.',
  'legal.terms.official.p2':
    'Место, добавленное сообществом, не является автоматически безопасным, законным, доступным, публичным или действующим укрытием. Относитесь к добавлениям сообщества с осторожностью, особенно во время чрезвычайной ситуации.',

  'legal.terms.emergency.p1.before':
    'OpenShelter не является аварийной службой и не должен быть вашим единственным источником информации о чрезвычайной ситуации. Официальные указания Спасательного департамента, местных органов власти и аварийных служб всегда имеют приоритет над всем, что отображается в этом приложении. В чрезвычайной ситуации звоните ',
  'legal.terms.emergency.p1.after': '.',
  'legal.terms.emergency.p2':
    'Не входите на частную собственность и в заброшенные здания, опираясь только на информацию, отображаемую OpenShelter.',
  'legal.terms.warranty.p1':
    'Список предоставляется в том виде, в котором он есть, в интересах сообщества, без каких-либо гарантий. Мы не гарантируем, что какое-либо место открыто, безопасно, доступно, имеется, подходит или ещё функционирует.',
  'legal.terms.liability.p1':
    'В той мере, в какой это допускается законом, OpenShelter не несёт ответственности за решения, принятые на основе списка, и это не исключает ответственность, которую по закону нельзя исключить.',
  'legal.terms.thirdParty.p1.before':
    'Приложение содержит ссылки на внешние сервисы, в том числе на Спасательный департамент, Maa-amet и OpenStreetMap. Мы не несём ответственности за содержимое или доступность этих сервисов. О том, как персональные данные передаются поставщикам услуг, описано в ',
  'legal.terms.thirdParty.p1.link': 'политике конфиденциальности',
  'legal.terms.thirdParty.p1.after': '.',
  'legal.terms.availability.p1':
    'Приложение предоставляется бесплатно и может измениться или стать недоступным в любой момент без уведомления. Мы можем добавлять, изменять или удалять функции.',
  'legal.terms.source.p1':
    'Исходный код OpenShelter доступен по лицензии MIT. Она регулирует исходный код, но не данные об укрытиях, которые остаются подчинёнными собственным источникам и настоящим условиям.',
  'legal.terms.law.p1':
    'Настоящие условия регулируются [APPLICABLE LAW TO BE CONFIRMED]. Споры разрешаются в [DISPUTE RESOLUTION TO BE CONFIRMED].',
  'legal.terms.contact.p1.before':
    'Вопросы о настоящих условиях можно отправлять на [CONTACT EMAIL]. OpenShelter также регулируется ',
  'legal.terms.contact.p1.link': 'политикой конфиденциальности',
  'legal.terms.contact.p1.after': '.',
};
