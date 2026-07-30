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

const WORLD_FOUNDATION_PATTERN =
  /(?:world[\s_-]*foundation|ワールド(?:・|\s*)?(?:ファウンデーション|財団))/iu
const SCHOOLS_BRAND_PATTERN =
  /(?:\bacecore[\s_-]*schools?\b|\bschools\b|エースコア(?:・|\s*)?(?:スクールズ?|学校)|スクールズ)/iu
const SCHOOLS_TOPIC_PATTERN =
  /(?:高卒認定|高認(?:試験|資格|対策)?|学習(?:相談|支援|内容|方法|計画)|パソコン(?:初心者|学習|活用|相談|教室)|\bpc\b.{0,12}(?:初心者|学習|活用|相談)|スマホ.{0,12}(?:活用|学習|相談)|プログラミング.{0,12}(?:学|講座|相談)|ロボット.{0,12}(?:学習|メイキング)|勉強(?:相談|方法))/iu
const SYSTEMS_EXPLICIT_BRAND_PATTERN =
  /(?:\bacecore[\s_-]*systems?\b|エースコア(?:・|\s*)?システムズ?)/iu
const SYSTEMS_SHORT_BRAND_PATTERN = /\bsystems\b/iu
const SYSTEMS_TOPIC_PATTERN =
  /(?:IT顧問|技術顧問|開発顧問|業務システム|システム(?:開発|構築|導入|改修|保守|運用)|Web(?:サイト|アプリ)?(?:制作|開発|運用|改善|相談)|ウェブサイト(?:制作|開発|運用|改善|相談)|ホームページ(?:制作|開発|運用|改善|相談)|アプリ(?:制作|開発)|DX(?:支援|相談)|開発(?:依頼|相談|支援)|制作実績|開発実績|導入事例|技術解説|\b(?:system|web|app|application) development\b|\bit (?:advisor|advisory|consulting)\b|\btechnical consulting\b|\bcase stud(?:y|ies)\b)/iu
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

export function shouldSearchSchools(query: unknown): boolean {
  const normalizedQuery = normalizeRoutingText(query)
  if (!normalizedQuery) return false

  const hasBrandIntent = SCHOOLS_BRAND_PATTERN.test(normalizedQuery)
  const hasAceserverIntent = ACESERVER_EXPLICIT_PATTERN.test(normalizedQuery)
  if (hasAceserverIntent && !hasBrandIntent) return false

  return hasBrandIntent || SCHOOLS_TOPIC_PATTERN.test(normalizedQuery)
}

export function shouldSearchSystems(query: unknown): boolean {
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
    SYSTEMS_TOPIC_PATTERN.test(normalizedQuery)
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
  if (shouldSearchSchools(query)) return 'schools'
  if (shouldSearchSystems(query)) return 'systems'
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
    findMostRecentExplicitIntent(priorQueries, locale) ||
    DEFAULT_AI_CONTACT_SOURCE_INTENT
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
