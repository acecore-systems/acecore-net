# Vectorize検索・AI横断検索 運用ガイド

Acecore公式サイトの検索モーダルは、Acecoreが管理する同じVectorize indexをAIチャットと共有します。AIチャットはそれに加えて、質問の担当を決定して接続済みの関連公式サイトのVectorize indexをread-onlyに使用して検索します。World Foundationを含む外部indexはProductionだけへ接続し、top-level／Previewには接続しません。検索モーダルは次の3系統を提供します。

- Cloudflare Vectorize: OpenAIの多言語embeddingを使う自サイトの主検索。自サイトの結果を最初に表示する。
- Pagefind: 静的ファイルだけで動くキーワード検索。Vectorizeが未設定、rate limit中、障害・timeout、または有効な結果が0件のときだけ遅延読込して表示する。
- Acecore関連サイト: `https://acecore.net/api/network-search` が自サイト以外の接続済み公式indexをread-onlyで照会し、最大3件を下部の低優先セクションへ表示する。

自サイトのVectorize、横断検索、Pagefindは互いの失敗を伝播させません。横断検索の障害では自サイト検索を維持し、自サイトのVectorizeが使えない場合だけPagefindへ切り替えます。AIチャットで専門サイトの根拠を取得できない場合は、詳細を推測せず、固定した担当サイトの公式ルートへ案内します。

検索UIは自サイトのVectorize結果、または必要時のPagefindフォールバックを確定してから横断APIを呼びます。2〜160文字に正規化できない入力は、どちらのAPIにも送信しません。

## 構成

1. `npm run build` がAstroとPagefindを生成する。
2. `scripts/build-search-corpus.mjs` が公開後の `dist/**/*.html` から本文を抽出し、`.vectorize/corpus.json` を作る。
3. `scripts/sync-vectorize.mjs` がVectorizeの既存IDと比較する。
4. 新規・変更chunkだけをOpenAI `text-embedding-3-large` で1536次元に変換してupsertする。
5. corpusから消えたIDをVectorizeから削除する。
6. Pages Function `/api/search` がqueryを同じmodelでembeddingし、locale別namespaceを検索する。
7. Pages Function `/api/network-search` は許可済みの公式 `Origin` から呼び出し元を決定し、そのサイト自身を除く接続済みindexだけを同じembeddingで並列検索する。
8. `/api/network-search` はsourceごとのURL allowlistを通過した絶対HTTPS URL、固定したsource識別子・表示名、タイトル、見出し、抜粋だけを最大3件返す。
9. Pages Function `/api/ai-contact` は呼び出し元の公式サイトと、質問および直近の利用者発言から担当サイトを決定し、1回のOpenAI embeddingで接続済みの該当indexだけを検索する。
10. Acecoreは表示localeと同じnamespace、接続済みの外部公式サイトは日本語 (`ja`) namespaceから最大3件の公式ページを取得し、`gpt-5.6-luna` が表示localeで回答する。

公開書き込みAPIはありません。Acecore indexの更新はGitHub Actionsまたは権限を持つ運用端末からだけ実行します。外部indexはこのrepositoryから更新せず、各サイトを所有するrepositoryがcorpus生成、同期、削除を管理します。

## AIチャットの横断ルーティング

担当が明示されない質問は、Acecoreからの呼び出しではAcecore、SystemsではSystems、SchoolsではSchoolsを既定とし、すべてのindexを一律には検索しません。曖昧な続きの質問は直前の担当を引き継ぎ、別の担当サイトが明示された場合は現在の質問だけで検索queryを組み直します。呼び出し元はクライアント送信値ではなく、許可済みの `Origin` からサーバー側で決定します。

| 質問の担当       | Production Pages binding        | Production index名                               | namespace  | 情報の責任範囲                                   |
| ---------------- | ------------------------------- | ------------------------------------------------ | ---------- | ------------------------------------------------ |
| Acecore          | `SEARCH_INDEX`                  | `acecore-net-search-openai-1536-production-v2`   | 表示locale | 会社情報、事業の案内、共通窓口                   |
| Systems          | `SYSTEMS_SEARCH_INDEX`          | `acecore-systems-search-openai-1536-production`  | `ja`       | 技術サービス                                     |
| Schools          | `SCHOOLS_SEARCH_INDEX`          | `acecore-schools-search-openai-1536-production`  | `ja`       | 学習サービス                                     |
| Aceserver WIKI   | `ACESERVER_WIKI_SEARCH_INDEX`   | `aceserver-wiki-search-openai-1536-production`   | `ja`       | ルール、コマンド、参加条件、運用情報             |
| Aceserver        | `ACESERVER_PORTAL_SEARCH_INDEX` | `aceserver-portal-search-openai-1536-production` | `ja`       | 概要、ワールド、ストーリー、動画、ナビゲーション |
| World Foundation | `WORLD_FOUNDATION_SEARCH_INDEX` | `world-foundation-search-openai-1536-production` | `ja`       | 制度設計、提案、研究、方針、モジュール           |

Vectorize bindingはProductionだけに設定し、rootとPreviewには設定しません。Systems、Schools、World Foundationはそれぞれ1つのindexだけを検索します。Aceserver PortalとWorld Foundationのcorpus同期もProduction専用で、top-level／Previewの該当kill switchを `false`、Productionだけを `true` とします。AceserverのProductionではWIKIとPortalへ同じOpenAI embeddingを渡して並列検索し、WIKIの根拠を優先して最大3件に絞ります。ルール、コマンド、参加条件、運用情報をWIKIで確認できない場合、Portalの内容から補完しません。

外部indexの日本語根拠は参照データとして `gpt-5.6-luna` へ渡し、回答だけを表示localeで生成します。生成文が根拠リンクを省略した場合も上位1件をサーバー側で追記します。Responses APIが `max_output_tokens` による未完了を返した部分回答は表示せず、固定案内と検証済みの公式参照先へ置き換えます。根拠のない専門情報は生成しません。

横断検索先は個別に停止・調整できます。既定値は次のとおりで、`wrangler.jsonc` を正とします。

| 取得元           | kill switch                                                         | score下限                                |
| ---------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| Acecore          | `SEARCH_ENABLED`（Preview=false／Production=true）                  | `SEARCH_MIN_SCORE=0.50`                  |
| Systems          | `SYSTEMS_SEARCH_ENABLED`                                            | `SYSTEMS_SEARCH_MIN_SCORE=0.50`          |
| Schools          | `SCHOOLS_SEARCH_ENABLED`                                            | `SCHOOLS_SEARCH_MIN_SCORE=0.50`          |
| Aceserver WIKI   | `ACESERVER_WIKI_SEARCH_ENABLED`                                     | `ACESERVER_WIKI_SEARCH_MIN_SCORE=0.40`   |
| Aceserver Portal | `ACESERVER_PORTAL_SEARCH_ENABLED`（Preview=false／Production=true） | `ACESERVER_PORTAL_SEARCH_MIN_SCORE=0.45` |
| World Foundation | `WORLD_FOUNDATION_SEARCH_ENABLED`（Preview=false／Production=true） | `WORLD_FOUNDATION_SEARCH_MIN_SCORE=0.40` |

World Foundation owner repositoryでは、公開corpusの生成、Production同期、削除、Production query smoke testを実装済みです。2026-07-31に `world-foundation-search-openai-1536-production` が1536次元・cosine・135 vectorsであることと、日本語・英語のlive query成功を確認してからProduction bindingとkill switchを切り替えました。

## Acecoreが管理するCloudflareリソース

| 環境       | Vectorize index                                | namespace                                               |
| ---------- | ---------------------------------------------- | ------------------------------------------------------- |
| Preview    | 未接続                                         | 未適用                                                  |
| Production | `acecore-net-search-openai-1536-production-v2` | `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` |

Production indexは `text-embedding-3-large` の短縮embeddingに合わせて `dimensions: 1536`、`metric: cosine` で作成します。横断検索先も同じmodelと次元を契約とします。旧BGE-M3用1024次元indexへ混在させず、新indexの全corpus同期と代表的な日本語queryの確認が終わってからbindingを切り替えます。rollback確認が終わるまで旧indexは削除しません。

2026-07-31の監査では、旧 `acecore-net-search-openai-1536-production` は164 vectors、公開corpusとの差分は42 upsert・35 delete（21.3%）でした。大量削除の安全gateに従い、このindexは変更せず、同じ1536次元・cosine設定の `acecore-net-search-openai-1536-production-v2` をreplacementとして作成しました。v2の全量同期、ID集合の完全一致、query canaryがProduction workflowで成功したことを確認し、この変更で `wrangler.jsonc` の `SEARCH_INDEX` bindingをv2へ切り替えます。旧indexの削除はrollback確認後に別途レビューします。top-level／Previewはbindingを持たず `SEARCH_ENABLED=false`、Productionだけを `true` とします。作成済みのPreview indexは接続・利用せず、rollback確認が終わるまで削除しません。

検索API、横断検索、AIチャットのrate limitは、Pagesで正式対応されているD1 bindingを使い、PreviewとProductionを分離します。同じtable内で自サイト検索は `client:` / `global`、横断検索は `network-search:{caller}:client:` / `network-search:global`、AIチャットは `ai-chat:client:` / `ai-chat:global` prefixを使い、counterを分離します。

| 環境       | D1 database                     | 用途                       |
| ---------- | ------------------------------- | -------------------------- |
| Preview    | `acecore-net-search-preview`    | Preview APIの固定窓counter |
| Production | `acecore-net-search-production` | 本番APIの固定窓counter     |

schemaは `migrations/search/` で管理します。Pages binding、D1、kill switch、score閾値は `wrangler.jsonc` を正とします。横断先ごとに `{SOURCE}_SEARCH_ENABLED` と `{SOURCE}_SEARCH_MIN_SCORE` を持たせ、障害や品質低下を他の検索先から分離します。設定変更後は次を実行して、Pagesが対応する設定だけであることと生成型を確認します。

```powershell
npm run types:cloudflare
npm run types:cloudflare:check
npm run check:pages-config
npm run typecheck:functions
```

## Acecore indexの自動同期

`.github/workflows/sync-vectorize.yml` は次の動作をします。

- `main` push: production Pagesが同じcommitを公開したことを `.well-known/acecore-build.json` で確認し、corpus build後にも公開commitとcorpus versionの両方が変わっていないことを再確認してからproduction indexを同期する。
- 15分ごとのreconciler: 現在公開中のbuild markerを読み、40文字のGit SHAであり、`origin/main` のancestorであることを検証してproduction indexを再同期する。concurrencyで待機中のrunが置換された場合も、次回のreconcilerが公開状態へ収束させる。
- 手動production: 現在公開中のmain由来corpusをproduction indexへ再同期する。

このworkflowの同期先はreplacementの `acecore-net-search-openai-1536-production-v2` です。初回は空のv2へ公開corpusを全量upsertし、既存indexの大量削除は行いません。upsertが発生したrunは、mutation完了とID集合の完全一致に加え、今回upsertしたvectorをREST queryして結果にそのIDが含まれることを確認します。初回の全量同期とquery canaryを含む成功runを確認してから、別のレビュー済み変更でPages bindingをv2へ切り替えます。

push、schedule、手動実行のいずれも `refs/heads/main` 以外ではjobを実行しません。workflow用のcheckoutは常にprotected `main` を `tooling/` へ固定し、同期scriptもこのcheckoutから実行します。公開対象のsite commitは別の `site/` へcheckoutしてbuildするため、build markerが指す過去のmain commitを復旧同期する場合も、secretを扱う同期ロジックはprotected `main` のものです。

Productionで既存vectorの20%を超える削除になる場合、同期scriptはplanを記録してmutation前に停止します。GitHub Actionsにはこの制限を解除するinputや `--allow-large-delete` 経路を設けません。正当な大規模再構築が必要な場合は既存indexを直接大量削除せず、新しいindexへ全corpusを同期してqueryを確認し、別のレビュー済み変更でbindingを切り替えます。
Productionのlive同期は、index名と同じ値を`--confirm-production`へ明示しない限り開始しません。

GitHub Actionsには次のGitHub Environmentとenvironment secretが必要です。

| GitHub Environment             | environment secrets                                        | Cloudflare account token                | 同期先                                         |
| ------------------------------ | ---------------------------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| `cloudflare-search-production` | `CLOUDFLARE_SEARCH_PRODUCTION_API_TOKEN`, `OPENAI_API_KEY` | `acecore-net-vectorize-production-sync` | `acecore-net-search-openai-1536-production-v2` |

EnvironmentのDeployment branches and tagsは `Selected branches and tags` を選び、branch ruleには `main` だけを登録します。workflow側にもmain判定がありますが、Environment側のmain-only protectionをsecret払い出しの独立した必須条件として設定してください。任意refから起動されたworkflowは、そのref上のworkflow定義自体が変更されている可能性があるため、このEnvironment設定なしでは運用を開始しません。

既存の広い権限を持つtokenは転用しません。Production用のaccount-owned tokenを1つ用意し、AcecoreのCloudflare accountだけをresourceに指定して、`Vectorize Write` だけを付与します。`Vectorize Write` は同期scriptが使うindex取得、vector一覧、upsert、delete、mutation確認を含むため、`Vectorize Read` や `Workers AI Read` の追加は不要です。OpenAI側はこのサイト専用ProjectのAPIキーをProduction Environment secretへ設定し、利用上限とキーのローテーションを他サービスから分離します。

CloudflareのVectorize権限はindex単位では制限できません。同期scriptのProduction index allowlistとEnvironmentのmain-only protectionを独立した誤操作防止策として維持します。

secretは最後の同期stepだけへ渡し、site checkout、依存関係install、buildには渡しません。tokenやAPIキーの値をログ、PR本文、設定ファイルへ書かないでください。ローテーション時は新しいcredentialへEnvironment secretを更新し、同期成功を確認してから旧credentialを削除します。

## Acecore indexの手元確認と同期

Node.jsは `.node-version` のバージョンを使います。

```powershell
npm ci
npm run build
npm run sync:vectorize:dry-run
```

credentialを使って現行indexとの差分だけを確認し、mutationしない場合:

```powershell
$env:VECTORIZE_INDEX_NAME = 'acecore-net-search-openai-1536-production-v2'
$env:CLOUDFLARE_ACCOUNT_ID = '<account-id>'
$env:CLOUDFLARE_API_TOKEN = '<scoped-token>'
node scripts/sync-vectorize.mjs --plan
```

`--plan` はread-onlyです。対象indexが存在しない場合も自動作成せずに停止します。新規indexの初回作成は、承認値を付けない通常同期で行います。

Productionへ同期する場合:

```powershell
$env:VECTORIZE_INDEX_NAME = 'acecore-net-search-openai-1536-production-v2'
$env:CLOUDFLARE_ACCOUNT_ID = '<account-id>'
$env:CLOUDFLARE_API_TOKEN = '<scoped-token>'
$env:OPENAI_API_KEY = '<project-api-key>'
npm run sync:vectorize
```

同期処理は内容ハッシュ付きIDを使うため、同じcorpusを再実行してもembeddingを再作成しません。upsertを先に行い、その後で古いIDを削除します。最後のmutationがquery可能になった後、indexの管理対象ID集合がcorpusと完全一致したことを再取得して確認し、新規upsertがあったrunではそのembeddingを使うquery canaryの上位10件に新規IDが含まれることも確認します。

同期先はAcecore検索用のProduction indexだけをallowlistし、corpusが90 source・150 vector・各locale 10 sourceを下回る場合は変更前に停止します。localeごとのvector下限は、簡潔化後の158 vector構成に余裕を持たせた `ja: 10`, `en: 19`, `zh-cn: 9`, `es: 18`, `pt: 19`, `fr: 20`, `ko: 11`, `de: 19`, `ru: 18` です。source合計は実際のlocale別一意URL数と一致し、namespaceとURLのlocale prefixも一致しなければなりません。管理外IDがある場合もmutation前に停止します。

既存vectorの20%を超える削除は停止します。Production workflowからこの制限は解除できません。削除はVectorize APIの上限に合わせて100 IDずつ送ります。Cloudflare RESTの一時的なnetwork error、429、5xxは、30秒timeoutと `Retry-After` を含む上限付きbackoffで再試行し、mutation直後にlist cursorが無効化された場合は先頭から安全に再取得します。truncated pageのnext cursorが欠落・空・循環している場合は、ID一覧を完全とみなさずmutation前または収束確認中に停止します。

## セキュリティとプライバシー

- `/api/search` は同一OriginのJSON POSTだけを受け付ける。
- request bodyは `Content-Length` とbounded stream readerの両方で2KiBまで、queryは2〜160文字に制限する。
- `/api/network-search` はbody・JSON・query・localeを検証できたrequestだけをD1 rate limitへ進め、不正・上限超過requestでclientまたはglobal枠を消費しない。
- `/api/network-search` はAcecore、Systems、Schools、Aceserver WIKI、Aceserver Portal、World Foundationの本番公式 `Origin` だけを完全一致で受け付ける。body内のサイト名は受け取らず、呼び出し元は `Origin` から決定する。CORSはそのOriginだけを返し、credentialやwildcardを使わない。
- `/api/network-search` は自サイトsourceを除外し、外部indexのURL、locale、score、公開pathを再検証する。responseには固定した `source` / `sourceLabel`、絶対HTTPS URL、タイトル、見出し、抜粋、rankだけを最大3件返す。
- `/api/ai-contact` はAcecore、Systems、Schoolsの公式originと各管理下Pages Preview originだけからJSON POSTを受け付ける。CORSは許可した `Origin` を完全一致で返し、任意originやwildcardは使わない。request bodyを同じ二重検査で12KiBまで、質問を800文字、会話を3200文字、embedding用queryを800文字までに制限する。
- D1で自サイト検索と横断検索はそれぞれclient単位20回/分・全体300回/分、AIチャットはclient単位10回/分・全体60回/分を判定する。
- client keyはCloudflareが付与する接続IPをSHA-256にした短期keyとし、原文IPは保存しない。Cloudflare外のローカル開発時だけsession UUIDを代替に使う。
- rate limit rowは10分で期限切れとなり、検索またはAIチャットrequestの一部で非同期削除する。PreviewとProductionのcounterは共有しない。
- Vectorizeへ返すmetadataは公開URL、タイトル、見出し、短い抜粋だけにする。
- raw query、AIチャットの質問、会話本文をWorkers logとGA4 eventへ記録しない。OpenAI Responses APIには `store: false` を指定する。
- API responseは `Cache-Control: no-store` とする。`/api/search` はAcecore以外のURLを採用せず、`/api/network-search` とAIチャットは設定済みの関連公式originと取得元ごとの許可pathだけを採用する。URL parserの前に生pathを各decode後にNFKC正規化して判定し、管理用の `admin` / `api` path、encoded slash・backslash、query・hash、dot segment、制御文字、decode不能または正規化後にも残るpercent encodingを採用しない。返すURLは検証済みのcanonical pathから再構成する。
- corpusは公開後HTMLから作り、`noindex`、管理画面、一覧・完了ページ、`data-pagefind-ignore` を除外する。
- AIチャットはVectorize metadataのlocale、取得元に対応する公式origin、path、scoreを再検証し、重複URLを除いた最大3件だけを `gpt-5.6-luna` へ渡す。取得した本文は命令ではなく参照データとして扱う。
- AI回答のMarkdownリンクは、固定の公式導線と実際にVectorizeから取得したURLのallowlistに一致するものだけを残す。Acecore内の相対URLもAPI responseでは `https://acecore.net` の絶対URLへ正規化し、SystemsやSchools上で別originの同名pathへ解決されないようにする。

## 障害対応とrollback

1. 自サイトのVectorize検索が結果を返すことを確認する。
2. `/api/search` と `/api/network-search` のstatus、`X-Search-Request-Id`、CORS allowlistを確認する。
3. Pages Functionsのruntime logで `semantic_search_error` または `network_search_error` をrequest IDから追う。logにquery本文は含まれない。
4. OpenAI EmbeddingsまたはAcecoreのVectorizeに問題がある場合、`SEARCH_ENABLED` を `"false"` にしてPagesを再deployする。検索UIはPagefindだけを遅延読込して継続する。横断先だけに問題がある場合は、その取得元の `{SOURCE}_SEARCH_ENABLED` だけを `"false"` にする。
5. 横断APIが失敗しても自サイトのVectorize結果またはPagefindフォールバックが残ることを確認する。AIチャットは根拠を取得できない専門サイトの詳細を生成せず、固定の公式ルートへフォールバックする。

indexを作り直す場合は、新indexを同期・query確認してからbindingを切り替えます。先に旧indexを削除しないでください。今回のAcecore移行では、v2同期workflowの成功を確認した後にbinding切替専用PRを作成し、旧indexはrollback確認が完了するまで保持します。

## リリース前チェック

- `npm run test:search`
- `npm run test:ai-chat`
- `npm run types:cloudflare:check`
- `npm run check:pages-config`
- `npm run typecheck:functions`
- `npm run validate:content`
- `npm run build`
- `npm run validate:seo`
- desktop/mobileでVectorize主検索、横断関連結果、0件時のPagefind、Pagefind filter利用時、横断API停止時を確認
- Preview deploymentにVectorize bindingがなく、`/api/search` がPagefindへ、`/api/network-search` が関連結果を安全に非表示へ、AIチャットが固定公式導線へフォールバックすることを確認
- Production deploymentのWorld Foundation質問で同サイトの根拠だけを検索し、Previewではbindingなしで固定公式ルートへ安全にフォールバックすることを確認
- Production deploymentのAceserver質問でWIKIとPortalが同じembeddingから検索され、ルール・コマンド・参加条件・運用情報をPortalだけで回答しないことを確認
- 有効化する外部indexのowner repositoryでProduction同期とquery smoke testが成功していることを確認する。未確認の取得元はkill switchを `false` にする
- 各表示localeで外部の日本語根拠から回答でき、回答リンクが実際に取得した公式URLに限定されることを確認
- production merge後、production deploymentのcommit一致後に同期workflowが成功することを確認
- 20%超削除を検出した場合はworkflowがmutation前に停止したことを確認し、新indexへの再構築とbinding切り替えを別PRでレビューする

## 公式資料

- [Vectorize client API](https://developers.cloudflare.com/vectorize/reference/client-api/)
- [Vectorize limits](https://developers.cloudflare.com/vectorize/platform/limits/)
- [Vectorize pricing](https://developers.cloudflare.com/vectorize/platform/pricing/)
- [text-embedding-3-large](https://developers.openai.com/api/docs/models/text-embedding-3-large)
- [Embeddings guide](https://developers.openai.com/api/docs/guides/embeddings)
- [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [D1](https://developers.cloudflare.com/d1/)
