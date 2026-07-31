export type AiContactSourceIntent =
  'worldFoundation' | 'schools' | 'systems' | 'acecore' | 'aceserver'

export type AiContactRoutingMessage = {
  role?: unknown
  content?: unknown
}

export type AiContactRoutingPayload = {
  question?: unknown
  messages?: unknown
}

export type AiContactSearchPlan = {
  sourceIntent: AiContactSourceIntent
  currentIntent: AiContactSourceIntent | null
  previousIntent: AiContactSourceIntent
  currentQuery: string
  contextualQuery: string
  query: string
  resetSearchContext: boolean
}

export const DEFAULT_AI_CONTACT_SOURCE_INTENT: AiContactSourceIntent = 'acecore'
export const MAX_AI_CONTACT_SEARCH_TURNS = 2
export const MAX_AI_CONTACT_SEARCH_QUERY_LENGTH = 800

type SpecialistRoutingLocale =
  'ja' | 'en' | 'zh-cn' | 'zh-tw' | 'es' | 'pt' | 'fr' | 'ko' | 'de' | 'ru'

const WORLD_FOUNDATION_PATTERN =
  /(?:world[\s_-]*foundation|ワールド(?:・|\s*)?(?:ファウンデーション|財団))/iu
const SCHOOLS_BRAND_PATTERN =
  /(?:\bacecore[\s_-]*schools?\b|\bschools\b|エースコア(?:・|\s*)?(?:スクールズ?|学校)|スクールズ)/iu
const SYSTEMS_EXPLICIT_BRAND_PATTERN =
  /(?:\bacecore[\s_-]*systems?\b|エースコア(?:・|\s*)?システムズ?)/iu
const SYSTEMS_SHORT_BRAND_PATTERN = /\bsystems\b/iu
const ACECORE_BRAND_PATTERN = /(?:\bacecore\b|エースコア)/iu
const ACECORE_OPERATOR_PATTERN =
  /(?:運営(?:元|会社|団体|組織|者)|運営.{0,12}(?:誰|どこ|会社|法人|団体|組織)|(?:誰|どこ|会社|法人|団体|組織).{0,12}運営)/u
const ACECORE_CONTENT_PATTERN =
  /(?:会社(?:概要|情報|について)|法人(?:情報|について)|事業内容|関連プロジェクト|技術記事|運営元の記事|サービス一覧)/u
const ACESERVER_DETAIL_PATTERN =
  /(?:ルール|\bban\b|禁止|コマンド|参加方法|入り方|接続方法|サーバーip|アドレス|ホワイトリスト|ワールド|マップ|プラグイン|荒らし|処罰|申請)/iu
const ACESERVER_WIKI_EVIDENCE_PATTERN =
  /(?:\btnt\b|\brules?\b|\ballow(?:ed|ance)?\b|\bprohibit(?:ed|ion)?\b|\bpermissions?\b|\bpolic(?:y|ies)\b|\brestrictions?\b|\bmoderation\b|\bcommands?\b|\bjoin(?:ing)?\b|\benter(?:ing)?\b|\bconnect(?:ion|ing)?\b|\bip(?:\s+address)?\b|\baddress\b|\bwhitelist\b|\bworld\s+(?:access|entry|transfer)\b|\bplugins?\b|\bgrief(?:ing)?\b|\bpunish(?:ment)?\b|\bapplications?\b|\bapply(?:ing)?\b|\b(?:live|current)\s+status\b|\boperations?\b|\bincidents?\b|\bmaintenance\b|ルール|規則|許可|禁止|コマンド|命令|参加(?:方法)?|入り方|接続(?:方法)?|サーバー\s*ip|アドレス|ホワイトリスト|プラグイン|荒らし|処罰|申請|運用|障害|メンテナンス|服务器|加入|连接|地址|白名单|插件|封禁|维护|状态|규칙|허용|금지|명령어|참가|접속|주소|화이트리스트|플러그인|상태|점검|reglas?|permitid[oa]s?|prohibid[oa]s?|comandos?|unirse|entrar|conectar|direcci[oó]n|lista blanca|complementos?|estado|mantenimiento|regras?|permitid[oa]s?|proibid[oa]s?|entrar|conectar|endere[cç]o|lista branca|estado|manuten[cç][aã]o|règles?|autoris[ée]s?|interdit[es]?|commandes?|rejoindre|entrer|connexion|adresse|liste blanche|état|maintenance|regeln?|erlaubt|verboten|befehle?|beitreten|verbindung|adresse|status|wartung|правил\w*|разреш\w*|запрещ\w*|команд\w*|подключ\w*|адрес\w*|бел\w*\s+спис\w*|статус|обслуживан\w*)/iu
const ACESERVER_WIKI_ACCESS_OR_STATUS_PATTERN =
  /(?:ワールド.{0,12}(?:行き方|移動|入場|アクセス|どうやって行)|(?:行き方|移動|入場|アクセス).{0,12}ワールド|稼働状況|鯖落ち|サーバー落ち|落ちてる|落ちています|\b(?:get\s+to|reach|enter|access|switch|transfer).{0,20}\bworld\b|\bworld\b.{0,20}(?:access|entry|transfer|switch|reach)|\b(?:down|offline|outage|uptime|availability)\b|(?:进入|前往|传送).{0,12}世界|世界.{0,12}(?:进入|传送|入口)|宕机|离线|可用性|월드.{0,12}(?:이동|입장|접속)|(?:이동|입장|접속).{0,12}월드|서버\s*다운|오프라인|가동\s*상태|(?:ir|entrar|acceder|transferir).{0,16}\b(?:mundo|world)\b|ca[ií]d[oa]|fuera\s+de\s+l[ií]nea|disponibilidad|fora\s+do\s+ar|indispon[ií]vel|(?:accéder|entrer|aller|transférer).{0,16}\bmonde\b|panne|hors\s+ligne|disponibilité|(?:welt).{0,16}(?:betreten|wechsel|zugang)|(?:betreten|wechseln|zugang).{0,16}welt|ausfall|verfügbarkeit|(?:мир\w*).{0,16}(?:вход|переход|доступ)|(?:войти|перейти|доступ).{0,16}(?:мир\w*)|недоступ\w*|офлайн|доступност\w*)/iu
const ACESERVER_PORTAL_OWNED_PATTERN =
  /(?:ワールド.{0,12}(?:一覧|紹介|概要|どんな)|(?:動画|ストーリー|世界観|ナビゲーション|ポータル)(?:一覧|紹介|について)?|\bworlds?\b.{0,16}\b(?:overview|introduction|list|showcase)\b|\b(?:videos?|stories?|navigation|portal)\b|(?:世界观|世界介绍|视频|故事|导航|门户)|(?:v[ií]deos?|historias?|navegaci[oó]n|portal)|(?:v[ií]deos?|hist[oó]rias?|navega[cç][aã]o|portal)|(?:vidéos?|histoires?|navigation|portail)|(?:세계관|월드\s*소개|동영상|스토리|내비게이션|포털)|(?:videos?|geschichten?|navigation|portal)|(?:видео|истори\w*|навигаци\w*|портал))/iu
const ACESERVER_PORTAL_OVERVIEW_REQUEST_PATTERN =
  /^(?:Aceserver(?:について)?(?:を)?(?:教えて|紹介して|説明して)|Aceserver(?:の)?概要(?:を教えて)?|Aceserver(?:とは|って何)|\b(?:introduce|describe)\s+(?:the\s+)?Aceserver\b|\btell\s+me\s+about\s+Aceserver\b|\bwhat\s+is\s+Aceserver\b|(?:介绍一下|请介绍)Aceserver|Aceserver是什么|cu[eé]ntame\s+sobre\s+Aceserver|fale\s+sobre\s+Aceserver|parle-moi\s+d['’]Aceserver|Aceserver.{0,8}(?:에\s*대해)?\s*알려(?:줘|주세요)?|erz[aä]hl\s+mir\s+von\s+Aceserver|расскажи\s+о(?:б)?\s+Aceserver)[。.!?！？]*$/iu
const ACESERVER_EXPLICIT_PATTERN =
  /(?:\baceserver\b|エースサーバー|\baceserver[\s_-]*wiki\b|エースサーバー\s*(?:wiki|ウィキ)|\bwiki\b|ウィキ|维基|위키|вики|\bminecraft\b|マインクラフト|マイクラ|\btnt\b|公式\s*(?:discord|ディスコード)|official\s+discord|官方\s*discord|공식\s*discord|discord\s+oficial|discord\s+officiel|offizielles\s+discord|официальный\s+discord)/iu

const ACESERVER_TERMS_BY_LOCALE: Readonly<Record<string, readonly string[]>> = {
  ja: [
    'エースサーバー',
    'エースサーバーwiki',
    'エースサーバーウィキ',
    'ウィキ',
  ],
  en: ['aceserver', 'aceserver wiki', 'wiki'],
  'zh-cn': ['aceserver', 'aceserver wiki', '维基'],
  es: ['aceserver', 'aceserver wiki', 'wiki'],
  pt: ['aceserver', 'aceserver wiki', 'wiki'],
  fr: ['aceserver', 'aceserver wiki', 'wiki'],
  ko: ['aceserver', 'aceserver wiki', '위키'],
  de: ['aceserver', 'aceserver wiki', 'wiki'],
  ru: ['aceserver', 'aceserver wiki', 'вики'],
}

const SPECIALIST_ROUTING_LOCALE_ALIASES: Readonly<
  Record<string, SpecialistRoutingLocale>
> = {
  ja: 'ja',
  en: 'en',
  'zh-cn': 'zh-cn',
  'zh-hans': 'zh-cn',
  'zh-sg': 'zh-cn',
  'zh-tw': 'zh-tw',
  'zh-hant': 'zh-tw',
  'zh-hk': 'zh-tw',
  es: 'es',
  pt: 'pt',
  fr: 'fr',
  ko: 'ko',
  de: 'de',
  ru: 'ru',
}

const SCHOOLS_TOPIC_PATTERNS_BY_LOCALE: Readonly<
  Record<SpecialistRoutingLocale, readonly RegExp[]>
> = {
  ja: [
    /(?:高卒認定|高認(?:試験|資格|対策)?)/iu,
    /(?:学習(?:相談|支援|内容|方法|計画)|勉強(?:相談|方法))/iu,
    /(?:パソコン|\bpc\b|スマホ).{0,12}(?:初心者|学習|活用|相談|教室)/iu,
    /プログラミング.{0,12}(?:学|講座|相談)/iu,
    /ロボット.{0,12}(?:学習|メイキング)/iu,
  ],
  en: [
    /\b(?:ged|high[-\s]?school equivalenc(?:y|e)|equivalent high[-\s]?school diploma)\b/iu,
    /\b(?:learning|educational|study)\s+(?:support|guidance|advice|counseling|assistance)\b/iu,
    /\b(?:programming|coding)\b.{0,40}\b(?:learn(?:ing)?|classes?|courses?|lessons?|beginner(?:s)?)\b/iu,
    /\b(?:learn(?:ing)?|classes?|courses?|lessons?|beginner(?:s)?)\b.{0,40}\b(?:programming|coding)\b/iu,
    /\b(?:computer|pc|smartphone|robotics?)\b.{0,32}\b(?:beginner(?:s)?|learn(?:ing)?|classes?|courses?|lessons?|training|use|workshops?)\b/iu,
    /\b(?:beginner(?:s)?|learn(?:ing)?|classes?|courses?|lessons?|training|workshops?)\b.{0,32}\b(?:computer|pc|smartphone|robotics?)\b/iu,
  ],
  'zh-cn': [
    /(?:高中同等学历|高中学历认证|高中文凭认证)/iu,
    /(?:学习|教育)(?:辅导|支持|咨询)/iu,
    /(?:编程|程序设计|编码).{0,16}(?:学习|课程|课堂|初学|入门)/iu,
    /(?:学习|课程|课堂|初学|入门).{0,16}(?:编程|程序设计|编码)/iu,
    /(?:电脑|计算机|手机|智能手机|机器人).{0,16}(?:初学|入门|学习|课程|课堂|培训|使用|制作)/iu,
  ],
  'zh-tw': [
    /(?:高中同等學歷|高中學歷認證|高中文憑認證)/iu,
    /(?:學習|教育)(?:輔導|支援|諮詢)/iu,
    /(?:程式設計|編程|編碼).{0,16}(?:學習|課程|課堂|初學|入門)/iu,
    /(?:學習|課程|課堂|初學|入門).{0,16}(?:程式設計|編程|編碼)/iu,
    /(?:電腦|計算機|手機|智慧型手機|機器人).{0,16}(?:初學|入門|學習|課程|課堂|培訓|使用|製作)/iu,
  ],
  es: [
    /(?:equivalencia|certificaci[oó]n).{0,24}(?:secundaria|bachillerato)/iu,
    /(?:apoyo|orientaci[oó]n|asesoramiento).{0,16}(?:educativ[oa]|al aprendizaje|de aprendizaje|escolar)/iu,
    /(?:programaci[oó]n|codificaci[oó]n).{0,48}(?:aprender|aprendizaje|clases?|cursos?|lecciones?|principiantes?|formaci[oó]n)/iu,
    /(?:aprender|aprendizaje|clases?|cursos?|lecciones?|principiantes?|formaci[oó]n).{0,48}(?:programaci[oó]n|codificaci[oó]n)/iu,
    /(?:inform[aá]tica|computaci[oó]n|ordenador(?:es)?|computadora(?:s)?|tel[eé]fono(?:s)? inteligente(?:s)?|rob[oó]tica).{0,36}(?:principiantes?|aprender|aprendizaje|clases?|cursos?|formaci[oó]n|uso|taller(?:es)?)/iu,
  ],
  pt: [
    /(?:equival[eê]ncia|certifica[cç][aã]o).{0,24}(?:ensino m[eé]dio|segundo grau)/iu,
    /(?:apoio|orienta[cç][aã]o|aconselhamento).{0,20}(?:educacional|à aprendizagem|ao aprendizado|de aprendizagem|escolar)/iu,
    /(?:programa[cç][aã]o|codifica[cç][aã]o).{0,48}(?:aprender|aprendizado|aprendizagem|aulas?|cursos?|li[cç][oõ]es|iniciantes?|forma[cç][aã]o)/iu,
    /(?:aprender|aprendizado|aprendizagem|aulas?|cursos?|li[cç][oõ]es|iniciantes?|forma[cç][aã]o).{0,48}(?:programa[cç][aã]o|codifica[cç][aã]o)/iu,
    /(?:inform[aá]tica|computador(?:es)?|smartphones?|celulares?|rob[oó]tica).{0,36}(?:iniciantes?|aprender|aprendizado|aprendizagem|aulas?|cursos?|treinamento|uso|oficinas?)/iu,
  ],
  fr: [
    /(?:équivalence|certification).{0,24}(?:lycée|secondaire|baccalauréat)/iu,
    /(?:soutien|accompagnement|conseils?|aide).{0,20}(?:éducatif|scolaire|à l['’]apprentissage|d['’]apprentissage)/iu,
    /(?:programmation|codage).{0,48}(?:apprendre|apprentissage|cours|le[cç]ons?|d[eé]butants?|formation)/iu,
    /(?:apprendre|apprentissage|cours|le[cç]ons?|d[eé]butants?|formation).{0,48}(?:programmation|codage)/iu,
    /(?:informatique|ordinateur(?:s)?|smartphones?|téléphones? intelligents?|robotique).{0,36}(?:d[eé]butants?|apprendre|apprentissage|cours|formation|utilisation|ateliers?)/iu,
  ],
  ko: [
    /(?:고졸 검정고시|고등학교 졸업 학력 인정)/iu,
    /(?:학습|교육).{0,6}(?:지원|상담|지도)/iu,
    /(?:프로그래밍|코딩).{0,24}(?:학습|배우|강좌|수업|교육|초보)/iu,
    /(?:학습|배우|강좌|수업|교육|초보).{0,24}(?:프로그래밍|코딩)/iu,
    /(?:컴퓨터|PC|스마트폰|로봇).{0,24}(?:초보|입문|학습|강좌|수업|교육|활용|만들기)/iu,
  ],
  de: [
    /(?:gleichwertigkeit|anerkennung).{0,24}(?:schulabschluss|abitur|oberschule)/iu,
    /(?:lern|bildungs)(?:unterstützung|beratung|hilfe)/iu,
    /(?:programmieren|programmierung|coding).{0,48}(?:lernen|lern|kurse?|unterricht|anfänger)/iu,
    /(?:lernen|lern\w*|kurse?|unterricht|anfänger).{0,48}(?:programmieren|programmierung|coding)/iu,
    /(?:computer|PC|smartphones?|robotik).{0,36}(?:anfänger|lernen|lern\w*|kurse?|unterricht|schulung|nutzung|workshops?|hilfe)/iu,
  ],
  ru: [
    /(?:эквивалент|подтверждени[ея]).{0,28}(?:средн(?:его|ее) образовани[ея]|аттестат)/iu,
    /(?:поддержк[а-яё]*\s+в\s+обучени[а-яё]*|образовательн[а-яё]*\s+поддержк[а-яё]*|учебн[а-яё]*\s+поддержк[а-яё]*)/iu,
    /(?:программирован|кодирован)[а-яё]*.{0,48}(?:обучени|учить|курс|заняти|начинающ)[а-яё]*/iu,
    /(?:обучени|учить|курс|заняти|начинающ)[а-яё]*.{0,48}(?:программирован|кодирован)[а-яё]*/iu,
    /(?:компьютер|ПК|смартфон|робототехник)[а-яё]*.{0,36}(?:начинающ|обучени|курс|заняти|тренинг|использовани|мастер-класс)[а-яё]*/iu,
  ],
}

const SYSTEMS_TOPIC_PATTERNS_BY_LOCALE: Readonly<
  Record<SpecialistRoutingLocale, readonly RegExp[]>
> = {
  ja: [
    /(?:IT顧問|技術顧問|開発顧問|業務システム)/iu,
    /システム(?:開発|構築|導入|改修|保守|運用)/iu,
    /(?:Web(?:サイト|アプリ)?|ウェブサイト|ホームページ)(?:制作|開発|運用|改善|相談)/iu,
    /アプリ(?:制作|開発)/iu,
    /DX(?:支援|相談)/iu,
    /(?:開発(?:依頼|相談|支援)|制作実績|開発実績|導入事例|技術解説)/iu,
  ],
  en: [
    /\b(?:system|website|web\s*(?:site|app)?|app|application|software)\s+(?:development|production|design|build|creation|implementation|integration|maintenance|operations?|improvement|consulting)\b/iu,
    /\b(?:develop|build|create|maintain|operate|improve|modernize)\w*\b.{0,32}\b(?:business |enterprise |internal )?(?:system|website|web app|app|application|software)\b/iu,
    /\b(?:business|enterprise|internal)\s+(?:system|software)\b.{0,32}\b(?:develop|build|implementation|integration|maintenance|support|consult)/iu,
    /\b(?:programming|development|technical)\s+support\b.{0,32}\b(?:business|enterprise|website|web app|application|software)\b/iu,
    /\b(?:it|technical|technology)\s+(?:advisor|advisory|consulting|consultant|support)\b/iu,
    /\b(?:digital transformation|dx)\b.{0,20}\b(?:support|consulting|advice|implementation)\b/iu,
    /\bcase stud(?:y|ies)\b/iu,
  ],
  'zh-cn': [
    /(?:业务|企业|内部)?(?:系统|软件).{0,16}(?:开发|建设|实施|导入|集成|改造|维护|运维|咨询)/iu,
    /(?:网站|网页|网络应用|业务应用|企业应用|应用(?:程序)?|软件).{0,16}(?:制作|设计|开发|建设|运营|维护|改进|咨询)/iu,
    /(?:IT|技术|开发)(?:顾问|咨询|支持)/iu,
    /(?:数字化转型|数码转型|DX).{0,12}(?:支持|咨询|实施)/iu,
    /(?:开发案例|实施案例|客户案例|技术文章)/iu,
  ],
  'zh-tw': [
    /(?:業務|企業|內部)?(?:系統|軟體).{0,16}(?:開發|建置|實施|導入|整合|改造|維護|維運|諮詢)/iu,
    /(?:網站|網頁|網路應用|業務應用|企業應用|應用(?:程式)?|軟體).{0,16}(?:製作|設計|開發|建置|營運|維護|改善|諮詢)/iu,
    /(?:IT|技術|開發)(?:顧問|諮詢|支援)/iu,
    /(?:數位轉型|數碼轉型|DX).{0,12}(?:支援|諮詢|實施)/iu,
    /(?:開發案例|導入案例|客戶案例|技術文章)/iu,
  ],
  es: [
    /(?:desarrollo|producci[oó]n|creaci[oó]n|diseño|implementaci[oó]n|integraci[oó]n|mantenimiento|operaci[oó]n|mejora).{0,32}(?:sistema(?:s)?|web\b|sitio(?:s)? web|p[aá]gina(?:s)? web|aplicaci[oó]n|software)/iu,
    /(?:sistema(?:s)? empresarial(?:es)?|software empresarial).{0,32}(?:desarrollo|implementaci[oó]n|integraci[oó]n|mantenimiento|soporte|consult)/iu,
    /(?:consultor[ií]a|asesor[ií]a|soporte).{0,16}(?:IT|TI|inform[aá]tica|t[eé]cnica|tecnol[oó]gica)/iu,
    /(?:transformaci[oó]n digital|DX).{0,20}(?:apoyo|soporte|consultor[ií]a|implementaci[oó]n)/iu,
    /(?:casos? de (?:estudio|éxito)|proyectos? realizados)/iu,
  ],
  pt: [
    /(?:desenvolvimento|produ[cç][aã]o|cria[cç][aã]o|design|implementa[cç][aã]o|integra[cç][aã]o|manuten[cç][aã]o|opera[cç][aã]o|melhoria).{0,32}(?:sistemas?|web\b|sites? web|p[aá]ginas? web|aplicativos?|aplica[cç][oõ]es|software)/iu,
    /(?:sistemas? empresarial|software empresarial).{0,32}(?:desenvolvimento|implementa[cç][aã]o|integra[cç][aã]o|manuten[cç][aã]o|suporte|consult)/iu,
    /(?:consultoria|assessoria|suporte).{0,16}(?:IT|TI|inform[aá]tica|t[eé]cnica|tecnol[oó]gica)/iu,
    /(?:transforma[cç][aã]o digital|DX).{0,20}(?:apoio|suporte|consultoria|implementa[cç][aã]o)/iu,
    /(?:estudos? de caso|casos? de sucesso|projetos? realizados)/iu,
  ],
  fr: [
    /(?:développement|production|création|conception|mise en œuvre|intégration|maintenance|exploitation|amélioration).{0,32}(?:systèmes?|web\b|sites? web|applications?|logiciels?)/iu,
    /(?:systèmes? d['’]entreprise|logiciels? d['’]entreprise).{0,32}(?:développement|mise en œuvre|intégration|maintenance|support|conseil)/iu,
    /(?:conseil|consultation|assistance).{0,16}(?:IT|informatique|technique|technologique)/iu,
    /(?:transformation numérique|transformation digitale|DX).{0,20}(?:accompagnement|conseil|assistance|mise en œuvre)/iu,
    /(?:études? de cas|réalisations? clients?)/iu,
  ],
  ko: [
    /(?:업무|기업|사내)?(?:시스템|소프트웨어).{0,20}(?:개발|구축|도입|통합|개선|유지보수|운영|상담)/iu,
    /(?:웹사이트|웹 사이트|웹앱|웹 앱|애플리케이션|앱|소프트웨어).{0,20}(?:제작|디자인|개발|구축|운영|유지보수|개선|상담)/iu,
    /(?:IT|기술|개발).{0,8}(?:고문|자문|컨설팅|상담|지원)/iu,
    /(?:디지털 전환|DX).{0,12}(?:지원|상담|컨설팅|도입)/iu,
    /(?:개발 사례|도입 사례|고객 사례|기술 해설)/iu,
  ],
  de: [
    /(?:systementwicklung|webproduktion|webentwicklung|softwareentwicklung|app-entwicklung)/iu,
    /(?:entwicklung|erstellung|gestaltung|implementierung|integration|wartung|betrieb|verbesserung).{0,32}(?:systeme?|websites?|webseiten?|web-apps?|apps?|anwendung(?:en)?|software)/iu,
    /(?:geschäftssysteme?|unternehmenssysteme?|unternehmenssoftware).{0,32}(?:entwicklung|implementierung|integration|wartung|support|beratung)/iu,
    /(?:IT|technik|technologie|technische).{0,12}(?:beratung|berater|consulting|unterstützung)/iu,
    /(?:digitale transformation|digitalisierung|DX).{0,20}(?:beratung|unterstützung|implementierung)/iu,
    /(?:fallstudien?|kundenprojekte|referenzprojekte)/iu,
  ],
  ru: [
    /(?:разработк|создани|проектировани|внедрени|интеграц|обслуживани|эксплуатац|улучшени)[а-яё]*.{0,36}(?:систем|сайт|веб-сайт|приложени|программ)[а-яё]*/iu,
    /(?:бизнес-систем|корпоративн[а-яё]* систем|корпоративн[а-яё]* программ)[а-яё]*.{0,36}(?:разработк|внедрени|интеграц|обслуживани|поддержк|консультац)[а-яё]*/iu,
    /(?:IT|ИТ|техническ|технологическ)[а-яё]*.{0,16}(?:консалтинг|консультац|советник|поддержк)[а-яё]*/iu,
    /(?:цифровая трансформация|цифровизац|DX).{0,20}(?:поддержк|консалтинг|консультац|внедрени)[а-яё]*/iu,
    /(?:кейс|пример[а-яё]* работ|реализованн[а-яё]* проект)[а-яё]*/iu,
  ],
}

const SYSTEMS_COMPOUND_TECH_PATTERNS_BY_LOCALE: Readonly<
  Record<
    SpecialistRoutingLocale,
    Readonly<{
      technology: RegExp
      businessArtifact: RegExp
    }>
  >
> = {
  ja: {
    technology: /(?:機械学習|人工知能|生成AI|\bAI\b)/iu,
    businessArtifact:
      /(?:業務|企業|社内).{0,8}(?:アプリ|システム|ソフトウェア|Web(?:サイト|アプリ)?)/iu,
  },
  en: {
    technology: /\b(?:machine learning|artificial intelligence|AI)\b/iu,
    businessArtifact:
      /\b(?:business|enterprise|internal)\s+(?:app|application|system|software|website|web app)\b/iu,
  },
  'zh-cn': {
    technology: /(?:机器学习|人工智能|生成式?AI|\bAI\b)/iu,
    businessArtifact: /(?:业务|企业|内部).{0,6}(?:应用|系统|软件|网站|网页)/iu,
  },
  'zh-tw': {
    technology: /(?:機器學習|人工智慧|生成式?AI|\bAI\b)/iu,
    businessArtifact: /(?:業務|企業|內部).{0,6}(?:應用|系統|軟體|網站|網頁)/iu,
  },
  es: {
    technology:
      /(?:aprendizaje autom[aá]tico|inteligencia artificial|\b(?:IA|AI)\b)/iu,
    businessArtifact:
      /(?:(?:aplicaci[oó]n|sistema|software|sitio web|p[aá]gina web)\s+(?:empresarial|corporativ[oa]|intern[oa])|(?:empresarial|corporativ[oa]|intern[oa]).{0,8}(?:aplicaci[oó]n|sistema|software|sitio web|p[aá]gina web))/iu,
  },
  pt: {
    technology:
      /(?:aprendizagem de m[aá]quina|aprendizado de m[aá]quina|intelig[eê]ncia artificial|\b(?:IA|AI)\b)/iu,
    businessArtifact:
      /(?:(?:aplicativo|aplica[cç][aã]o|sistema|software|site|aplica[cç][aã]o web)\s+(?:empresarial|corporativ[oa]|intern[oa])|(?:empresarial|corporativ[oa]|intern[oa]).{0,8}(?:aplicativo|aplica[cç][aã]o|sistema|software|site|aplica[cç][aã]o web))/iu,
  },
  fr: {
    technology:
      /(?:apprentissage automatique|intelligence artificielle|\b(?:IA|AI)\b)/iu,
    businessArtifact:
      /(?:(?:application|système|logiciel|site web)\s+(?:métier|professionnel|interne)|(?:application|système|logiciel|site web)\s+d['’]entreprise)/iu,
  },
  ko: {
    technology: /(?:머신러닝|기계\s*학습|인공지능|생성형\s*AI|\bAI\b)/iu,
    businessArtifact:
      /(?:업무|기업|사내).{0,6}(?:앱|애플리케이션|시스템|소프트웨어|웹사이트|웹\s*앱)/iu,
  },
  de: {
    technology:
      /(?:maschinelles lernen|künstliche intelligenz|\b(?:KI|AI)\b)/iu,
    businessArtifact:
      /(?:geschäftsanwendung|unternehmensanwendung|geschäftssystem|unternehmenssystem|unternehmenssoftware|interne (?:anwendung|system|software|website|web-app))/iu,
  },
  ru: {
    technology:
      /(?:машинн[а-яё]* обучени[а-яё]*|искусственн[а-яё]* интеллект[а-яё]*|ИИ|\bAI\b)/iu,
    businessArtifact:
      /(?:бизнес-приложени[а-яё]*|бизнес-систем[а-яё]*|корпоративн[а-яё]* (?:приложени|систем|программ)[а-яё]*|внутренн[а-яё]* (?:приложени|систем|программ)[а-яё]*)/iu,
  },
}

export function shouldSearchWorldFoundation(query: unknown): boolean {
  const normalizedQuery = normalizeRoutingText(query)
  if (!WORLD_FOUNDATION_PATTERN.test(normalizedQuery)) return false

  const queryWithoutProjectName = normalizedQuery.replace(
    WORLD_FOUNDATION_PATTERN,
    ' ',
  )
  return !(
    ACESERVER_EXPLICIT_PATTERN.test(normalizedQuery) &&
    ACESERVER_DETAIL_PATTERN.test(queryWithoutProjectName)
  )
}

export function shouldSearchSchools(
  query: unknown,
  locale: unknown = 'ja',
): boolean {
  const normalizedQuery = normalizeRoutingText(query)
  if (!normalizedQuery) return false

  const hasBrandIntent = SCHOOLS_BRAND_PATTERN.test(normalizedQuery)
  const hasAceserverIntent = ACESERVER_EXPLICIT_PATTERN.test(normalizedQuery)
  const hasSystemsBrandIntent =
    SYSTEMS_EXPLICIT_BRAND_PATTERN.test(normalizedQuery) ||
    SYSTEMS_SHORT_BRAND_PATTERN.test(normalizedQuery)
  if ((hasAceserverIntent || hasSystemsBrandIntent) && !hasBrandIntent) {
    return false
  }

  return (
    hasBrandIntent ||
    matchesSpecialistTopic(
      normalizedQuery,
      locale,
      SCHOOLS_TOPIC_PATTERNS_BY_LOCALE,
    )
  )
}

export function shouldSearchSystems(
  query: unknown,
  locale: unknown = 'ja',
): boolean {
  const normalizedQuery = normalizeRoutingText(query)
  if (!normalizedQuery) return false

  const hasExplicitBrandIntent =
    SYSTEMS_EXPLICIT_BRAND_PATTERN.test(normalizedQuery)
  if (
    ACESERVER_EXPLICIT_PATTERN.test(normalizedQuery) &&
    (ACESERVER_DETAIL_PATTERN.test(normalizedQuery) || !hasExplicitBrandIntent)
  ) {
    return false
  }

  return (
    hasExplicitBrandIntent ||
    SYSTEMS_SHORT_BRAND_PATTERN.test(normalizedQuery) ||
    matchesSystemsCompoundTechTopic(normalizedQuery, locale) ||
    matchesSpecialistTopic(
      normalizedQuery,
      locale,
      SYSTEMS_TOPIC_PATTERNS_BY_LOCALE,
    )
  )
}

export function shouldSearchAcecore(query: unknown): boolean {
  const normalizedQuery = normalizeRoutingText(query)
  if (!normalizedQuery) return false

  const hasBrandIntent = ACECORE_BRAND_PATTERN.test(normalizedQuery)
  const hasOperatorIntent = ACECORE_OPERATOR_PATTERN.test(normalizedQuery)
  const hasContentIntent = ACECORE_CONTENT_PATTERN.test(normalizedQuery)
  if (!hasBrandIntent && !hasOperatorIntent && !hasContentIntent) return false

  const asksForAceserverDetail =
    ACESERVER_EXPLICIT_PATTERN.test(normalizedQuery) &&
    ACESERVER_DETAIL_PATTERN.test(normalizedQuery)
  return !asksForAceserverDetail || hasContentIntent
}

export function hasExplicitAceserverIntent(
  query: unknown,
  locale = 'ja',
): boolean {
  const normalizedQuery = normalizeRoutingText(query).toLocaleLowerCase()
  if (!normalizedQuery) return false
  if (ACESERVER_EXPLICIT_PATTERN.test(normalizedQuery)) {
    return true
  }

  const localeTerms =
    ACESERVER_TERMS_BY_LOCALE[normalizeLocale(locale)] ||
    ACESERVER_TERMS_BY_LOCALE.ja
  return localeTerms.some((term) =>
    normalizedQuery.includes(
      term.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim(),
    ),
  )
}

export function requiresAceserverWikiEvidence(
  query: unknown,
  currentQuery: unknown = query,
): boolean {
  const normalizedQuery = normalizeRoutingText(query)
  const normalizedCurrentQuery = normalizeRoutingText(currentQuery)
  if (!normalizedQuery || !normalizedCurrentQuery) return false
  const explicitIntent =
    resolveExplicitAiContactSourceIntent(normalizedQuery) ||
    DEFAULT_AI_CONTACT_SOURCE_INTENT
  if (explicitIntent !== 'aceserver') return false

  if (hasAceserverWikiEvidenceIntent(normalizedCurrentQuery)) return true
  if (hasAceserverPortalIntent(normalizedCurrentQuery)) return false

  const previousContext = getPreviousRoutingContext(
    normalizedQuery,
    normalizedCurrentQuery,
  )
  if (hasAceserverWikiEvidenceIntent(previousContext)) return true
  if (hasAceserverPortalIntent(previousContext)) return false

  return true
}

function hasAceserverWikiEvidenceIntent(query: string): boolean {
  return Boolean(
    query &&
    (ACESERVER_WIKI_EVIDENCE_PATTERN.test(query) ||
      ACESERVER_WIKI_ACCESS_OR_STATUS_PATTERN.test(query)),
  )
}

function hasAceserverPortalIntent(query: string): boolean {
  return Boolean(
    query &&
    (ACESERVER_PORTAL_OWNED_PATTERN.test(query) ||
      ACESERVER_PORTAL_OVERVIEW_REQUEST_PATTERN.test(query)),
  )
}

function getPreviousRoutingContext(
  contextualQuery: string,
  currentQuery: string,
): string {
  if (
    contextualQuery === currentQuery ||
    !contextualQuery.endsWith(currentQuery)
  ) {
    return ''
  }

  return contextualQuery.slice(0, -currentQuery.length).trim()
}

export function resolveExplicitAiContactSourceIntent(
  query: unknown,
  locale = 'ja',
): AiContactSourceIntent | null {
  if (shouldSearchWorldFoundation(query)) return 'worldFoundation'

  // An explicit Schools brand remains authoritative. For unbranded questions,
  // specific Systems development/consulting cues take precedence over generic
  // learning-support phrases such as "machine learning support".
  const normalizedQuery = normalizeRoutingText(query)
  if (SCHOOLS_BRAND_PATTERN.test(normalizedQuery)) return 'schools'
  if (shouldSearchSystems(query, locale)) return 'systems'
  if (shouldSearchSchools(query, locale)) return 'schools'
  if (shouldSearchAcecore(query)) return 'acecore'
  if (hasExplicitAceserverIntent(query, locale)) return 'aceserver'
  return null
}

export function resolveAiContactSourceIntent(
  query: unknown,
  locale = 'ja',
): AiContactSourceIntent {
  return (
    resolveExplicitAiContactSourceIntent(query, locale) ||
    DEFAULT_AI_CONTACT_SOURCE_INTENT
  )
}

export function buildAiContactSearchQuery(
  payload: AiContactRoutingPayload,
): string {
  const candidates = getUserQueries(payload)
  return truncateSearchQuery(
    candidates.slice(-MAX_AI_CONTACT_SEARCH_TURNS).join('\n'),
  )
}

export function buildAiContactSearchPlan(
  payload: AiContactRoutingPayload,
  locale = 'ja',
  defaultSourceIntent: AiContactSourceIntent = DEFAULT_AI_CONTACT_SOURCE_INTENT,
): AiContactSearchPlan {
  const userQueries = getUserQueries(payload)
  const currentQuery =
    normalizeRoutingText(payload.question) || userQueries.at(-1) || ''
  const priorQueries =
    userQueries.at(-1) === currentQuery ? userQueries.slice(0, -1) : userQueries
  const currentIntent = resolveExplicitAiContactSourceIntent(
    currentQuery,
    locale,
  )
  const previousIntent =
    findMostRecentExplicitIntent(priorQueries, locale) || defaultSourceIntent
  const sourceIntent = currentIntent || previousIntent
  const resetSearchContext = Boolean(
    priorQueries.length > 0 &&
    currentIntent &&
    currentIntent !== previousIntent,
  )
  const contextualQuery = buildAiContactSearchQuery(payload)
  const query = resetSearchContext
    ? truncateSearchQuery(currentQuery)
    : contextualQuery

  return {
    sourceIntent,
    currentIntent,
    previousIntent,
    currentQuery,
    contextualQuery,
    query,
    resetSearchContext,
  }
}

function findMostRecentExplicitIntent(
  queries: readonly string[],
  locale: string,
): AiContactSourceIntent | null {
  for (let index = queries.length - 1; index >= 0; index -= 1) {
    const intent = resolveExplicitAiContactSourceIntent(queries[index], locale)
    if (intent) return intent
  }
  return null
}

function getUserQueries(payload: AiContactRoutingPayload): string[] {
  const messages = Array.isArray(payload.messages)
    ? (payload.messages as AiContactRoutingMessage[])
    : []
  const candidates = messages
    .filter((message) => message?.role === 'user')
    .map((message) => normalizeRoutingText(message?.content))
    .filter(Boolean)
  const question = normalizeRoutingText(payload.question)

  if (question && candidates.at(-1) !== question) candidates.push(question)

  const unique: string[] = []
  for (const candidate of candidates) {
    if (unique.at(-1) !== candidate) unique.push(candidate)
  }
  return unique
}

function truncateSearchQuery(value: string): string {
  return [...value].slice(-MAX_AI_CONTACT_SEARCH_QUERY_LENGTH).join('').trim()
}

function normalizeRoutingText(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFKC').replace(/\s+/gu, ' ').trim()
    : ''
}

function normalizeLocale(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFKC').trim().toLowerCase()
    : 'ja'
}

function matchesSpecialistTopic(
  query: string,
  locale: unknown,
  patternsByLocale: Readonly<
    Record<SpecialistRoutingLocale, readonly RegExp[]>
  >,
): boolean {
  const routingLocale = getSpecialistRoutingLocale(locale)
  return patternsByLocale[routingLocale].some((pattern) => pattern.test(query))
}

function matchesSystemsCompoundTechTopic(
  query: string,
  locale: unknown,
): boolean {
  const routingLocale = getSpecialistRoutingLocale(locale)
  const patterns = SYSTEMS_COMPOUND_TECH_PATTERNS_BY_LOCALE[routingLocale]
  return (
    patterns.technology.test(query) && patterns.businessArtifact.test(query)
  )
}

function getSpecialistRoutingLocale(locale: unknown): SpecialistRoutingLocale {
  const normalizedLocale = normalizeLocale(locale)
  return SPECIALIST_ROUTING_LOCALE_ALIASES[normalizedLocale] || 'ja'
}
