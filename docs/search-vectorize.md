# Vectorize検索・AI横断検索 運用ガイド

Acecore公式サイトの検索モーダルは、Acecoreが管理する同じVectorize indexをAIチャットと共有します。AIチャットはそれに加えて、質問の担当を決定して接続済みの関連公式サイトのVectorize indexをread-onlyに使用して検索します。World Foundationは担当判定と固定公式導線だけを提供し、owner repositoryの同期ライフサイクルが整うまでVectorizeへ接続しません。検索モーダルは次の2系統を提供します。

- Pagefind: 静的ファイルだけで動くキーワード検索。常に主検索として残す。
- Cloudflare Vectorize: Workers AIの多言語embeddingを使う「関連する内容」。失敗時は表示を隠し、Pagefindを継続する。

Vectorizeが未設定、rate limit中、Workers AI障害、通信タイムアウトのいずれでも、検索モーダル全体を失敗させない設計です。AIチャットで専門サイトの根拠を取得できない場合は、詳細を推測せず、固定した担当サイトの公式ルートへ案内します。

## 構成

1. `npm run build` がAstroとPagefindを生成する。
2. `scripts/build-search-corpus.mjs` が公開後の `dist/**/*.html` から本文を抽出し、`.vectorize/corpus.json` を作る。
3. `scripts/sync-vectorize.mjs` がVectorizeの既存IDと比較する。
4. 新規・変更chunkだけをWorkers AI `@cf/baai/bge-m3` で1024次元に変換してupsertする。
5. corpusから消えたIDをVectorizeから削除する。
6. Pages Function `/api/search` がqueryを同じmodelでembeddingし、locale別namespaceを検索する。
7. Pages Function `/api/ai-contact` は質問と直近の利用者発言から担当サイトを決定し、1回のBGE-M3 embeddingで接続済みの該当indexだけを検索する。World Foundation担当時はembeddingもVectorize queryも行わない。
8. Acecoreは表示localeと同じnamespace、接続済みの外部公式サイトは日本語 (`ja`) namespaceから最大3件の公式ページを取得し、GLM 5.2が表示localeで回答する。World Foundationは詳細を生成せず固定公式ルートへ案内する。

公開書き込みAPIはありません。Acecore indexの更新はGitHub Actionsまたは権限を持つ運用端末からだけ実行します。外部indexはこのrepositoryから更新せず、各サイトを所有するrepositoryがcorpus生成、同期、削除を管理します。

## AIチャットの横断ルーティング

担当が明示されない質問はAcecoreを既定とし、すべてのindexを一律には検索しません。曖昧な続きの質問は直前の担当を引き継ぎ、別の担当サイトが明示された場合は現在の質問だけで検索queryを組み直します。

| 質問の担当       | Pages binding                   | index名 (`*` は環境)        | namespace  | 情報の責任範囲                                   |
| ---------------- | ------------------------------- | --------------------------- | ---------- | ------------------------------------------------ |
| Acecore          | `SEARCH_INDEX`                  | `acecore-net-search-*`      | 表示locale | 会社情報、事業の案内、共通窓口                   |
| Systems          | `SYSTEMS_SEARCH_INDEX`          | `acecore-systems-search-*`  | `ja`       | 技術サービス                                     |
| Schools          | `SCHOOLS_SEARCH_INDEX`          | `acecore-schools-search-*`  | `ja`       | 学習サービス                                     |
| Aceserver WIKI   | `ACESERVER_WIKI_SEARCH_INDEX`   | `aceserver-wiki-search-*`   | `ja`       | ルール、コマンド、参加条件、運用情報             |
| Aceserver        | `ACESERVER_PORTAL_SEARCH_INDEX` | `aceserver-portal-search-*` | `ja`       | 概要、ワールド、ストーリー、動画、ナビゲーション |
| World Foundation | 未接続                          | 未接続                      | 未適用     | 公式ルートへの固定案内のみ                       |

`*` はPreviewでは `preview`、Productionでは `production` です。SystemsとSchoolsはそれぞれ1つのindexだけを検索します。AceserverだけはWIKIとPortalへ同じBGE-M3 embeddingを渡して並列検索し、WIKIの根拠を優先して最大3件に絞ります。ルール、コマンド、参加条件、運用情報をWIKIで確認できない場合、Portalの内容から補完しません。World Foundationはroot、Preview、Productionのいずれにもbindingを持たず、`WORLD_FOUNDATION_SEARCH_ENABLED=false` によって検索を停止します。

外部indexの日本語根拠は参照データとしてGLM 5.2へ渡し、回答だけを表示localeで生成します。生成文が根拠リンクを省略した場合も上位1件をサーバー側で追記します。`finish_reason: length` の部分回答は表示せず、固定案内と検証済みの公式参照先へ置き換えます。根拠のない専門情報は生成しません。

横断検索先は個別に停止・調整できます。既定値は次のとおりで、`wrangler.jsonc` を正とします。

| 取得元           | kill switch                                     | score下限                                |
| ---------------- | ----------------------------------------------- | ---------------------------------------- |
| Acecore          | `SEARCH_ENABLED`                                | `SEARCH_MIN_SCORE=0.50`                  |
| Systems          | `SYSTEMS_SEARCH_ENABLED`                        | `SYSTEMS_SEARCH_MIN_SCORE=0.50`          |
| Schools          | `SCHOOLS_SEARCH_ENABLED`                        | `SCHOOLS_SEARCH_MIN_SCORE=0.50`          |
| Aceserver WIKI   | `ACESERVER_WIKI_SEARCH_ENABLED`                 | `ACESERVER_WIKI_SEARCH_MIN_SCORE=0.40`   |
| Aceserver Portal | `ACESERVER_PORTAL_SEARCH_ENABLED`               | `ACESERVER_PORTAL_SEARCH_MIN_SCORE=0.45` |
| World Foundation | `WORLD_FOUNDATION_SEARCH_ENABLED=false`（固定） | 未適用                                   |

World Foundationを再接続する前に、owner repositoryで公開corpusの生成、Preview / Productionを分離した同期、削除、両環境のquery smoke testを実装して成功させます。その確認と同じ変更で、3環境のVectorize binding追加とkill switch変更を行います。一部だけを先に有効化しません。

## Acecoreが管理するCloudflareリソース

| 環境       | Vectorize index                 | namespace                                               |
| ---------- | ------------------------------- | ------------------------------------------------------- |
| Preview    | `acecore-net-search-preview`    | `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` |
| Production | `acecore-net-search-production` | 同上                                                    |

両indexはBGE-M3に合わせて `dimensions: 1024`、`metric: cosine` で作成します。横断検索先も同じmodelと次元を契約とします。modelまたは次元を変更する場合は、既存indexへ混在させず、新しいindexを作成してbindingを切り替えてください。

検索APIのrate limitは、Pagesで正式対応されているD1 bindingを使い、PreviewとProductionを分離します。

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
- 手動preview: `main` の最新corpusをpreview indexへ同期する。
- 手動production: 現在公開中のmain由来corpusをproduction indexへ再同期する。

push、schedule、手動実行のいずれも `refs/heads/main` 以外ではjobを実行しません。workflow用のcheckoutは常にprotected `main` を `tooling/` へ固定し、同期scriptもこのcheckoutから実行します。公開対象のsite commitは別の `site/` へcheckoutしてbuildするため、build markerが指す過去のmain commitを復旧同期する場合も、secretを扱う同期ロジックはprotected `main` のものです。

PreviewまたはProductionで既存vectorの20%を超える削除が必要な場合、通常の同期はplanを記録して変更前に停止します。解除はGitHub Actionsで対象indexを選んだ手動実行だけに限定し、次の5項目を同時に指定します。

- `allow_large_delete`: `true`
- `approved_commit`: Productionでは公開build marker、Previewでは同期対象のmainと一致する40文字のcommit SHA
- `approved_corpus_version`: そのcommitをbuildして得たcorpus version
- `approved_delete_count`: 直前に確認したonline planのdelete件数
- `approved_plan_id`: 現行indexのID集合と新corpusのID集合を束ねたplan ID

workflowは同期直前にもう一度 `--plan` を実行し、現在のdelete件数とplan IDが承認値に完全一致した場合だけ `--allow-large-delete` を渡します。実同期scriptも同じ2値を再検証するため、plan確認からmutationまでの間にindexが変わった場合は停止します。commit、corpus version、delete件数、現行index ID集合のどれかが変わった場合はmutation前に停止します。承認値は選択したPreviewまたはProductionの実行にだけ使用されます。

`cloudflare-search-production` Environmentにはrequired reviewerを設定し、大量削除を伴う手動実行を実装者以外がplanと上記4つの固定値まで確認して承認する運用を推奨します。required reviewerの設定有無はrepository外のGitHub設定なので、リリース前に実設定を別途確認してください。

GitHub Actionsには次のGitHub Environmentとenvironment secretが必要です。

| GitHub Environment             | environment secret                       | Cloudflare account token                | 同期先                          |
| ------------------------------ | ---------------------------------------- | --------------------------------------- | ------------------------------- |
| `cloudflare-search-preview`    | `CLOUDFLARE_SEARCH_PREVIEW_API_TOKEN`    | `acecore-net-vectorize-preview-sync`    | `acecore-net-search-preview`    |
| `cloudflare-search-production` | `CLOUDFLARE_SEARCH_PRODUCTION_API_TOKEN` | `acecore-net-vectorize-production-sync` | `acecore-net-search-production` |

両EnvironmentのDeployment branches and tagsは `Selected branches and tags` を選び、branch ruleには `main` だけを登録します。workflow側にもmain判定がありますが、Environment側のmain-only protectionをsecret払い出しの独立した必須条件として設定してください。任意refから起動されたworkflowは、そのref上のworkflow定義自体が変更されている可能性があるため、このEnvironment設定なしでは運用を開始しません。

既存の広い権限を持つtokenは転用しません。各環境にaccount-owned tokenを1つずつ用意し、AcecoreのCloudflare accountだけをresourceに指定して、`Vectorize Write` と `Workers AI Read` だけを付与します。`Vectorize Write` は同期scriptが使うindex取得、vector一覧、upsert、delete、mutation確認を含むため、`Vectorize Read` の追加は不要です。

CloudflareのVectorize権限はindex単位では制限できません。Preview / Production tokenの分離はcredentialのローテーションと障害範囲を分けるための運用境界であり、特定indexだけへ書き込めるCloudflare側ACLではありません。同期scriptのindex allowlistとEnvironmentのmain-only protectionを独立した誤操作防止策として維持します。

secretは最後の同期stepだけへ渡し、site checkout、依存関係install、buildには渡しません。token値をログ、PR本文、設定ファイルへ書かないでください。ローテーション時は同じ2権限の新tokenを作成し、Environment secretを更新して同期成功を確認してから旧tokenを削除します。

## Acecore indexの手元確認と同期

Node.jsは `.node-version` のバージョンを使います。

```powershell
npm ci
npm run build
npm run sync:vectorize:dry-run
```

credentialを使って現行indexとの差分だけを確認し、mutationしない場合:

```powershell
$env:VECTORIZE_INDEX_NAME = 'acecore-net-search-production'
$env:CLOUDFLARE_ACCOUNT_ID = '<account-id>'
$env:CLOUDFLARE_API_TOKEN = '<scoped-token>'
node scripts/sync-vectorize.mjs --plan
```

`--plan` はread-onlyです。対象indexが存在しない場合も自動作成せずに停止します。新規indexの初回作成は、承認値を付けない通常同期で行います。

実際にpreviewへ同期する場合:

```powershell
$env:VECTORIZE_INDEX_NAME = 'acecore-net-search-preview'
$env:CLOUDFLARE_ACCOUNT_ID = '<account-id>'
$env:CLOUDFLARE_API_TOKEN = '<scoped-token>'
npm run sync:vectorize
```

同期処理は内容ハッシュ付きIDを使うため、同じcorpusを再実行してもembeddingを再作成しません。upsertを先に行い、その後で古いIDを削除します。最後のmutationがquery可能になった後、indexの管理対象ID集合がcorpusと完全一致したことを再取得して確認します。

同期先はAcecore検索用の2 indexだけをallowlistし、corpusが90 source・150 vector・各locale 10 sourceを下回る場合は変更前に停止します。localeごとのvector下限は、簡潔化後の158 vector構成に余裕を持たせた `ja: 10`, `en: 19`, `zh-cn: 9`, `es: 18`, `pt: 19`, `fr: 20`, `ko: 11`, `de: 19`, `ru: 18` です。source合計は実際のlocale別一意URL数と一致し、namespaceとURLのlocale prefixも一致しなければなりません。管理外IDがある場合もmutation前に停止します。

既存vectorの20%を超える削除は既定で停止します。`--allow-large-delete` は手元で直接指定できる非常用フラグですが、共有環境では前述のcommit・corpus version・delete件数・plan IDを固定する手動workflowだけを使います。削除はVectorize APIの上限に合わせて100 IDずつ送ります。Cloudflare RESTの一時的なnetwork error、429、5xxは、30秒timeoutと `Retry-After` を含む上限付きbackoffで再試行し、mutation直後にlist cursorが無効化された場合は先頭から安全に再取得します。truncated pageのnext cursorが欠落・空・循環している場合は、ID一覧を完全とみなさずmutation前または収束確認中に停止します。

## セキュリティとプライバシー

- `/api/search` は同一OriginのJSON POSTだけを受け付ける。
- request bodyは `Content-Length` とbounded stream readerの両方で2KiBまで、queryは2〜160文字に制限する。
- `/api/ai-contact` も同一OriginのJSON POSTだけを受け付け、request bodyを同じ二重検査で12KiBまで、質問を800文字、会話を3200文字、embedding用queryを800文字までに制限する。
- D1でclient単位20回/分を先に判定し、許可されたrequestだけを全体300回/分へ加算する。
- client keyはCloudflareが付与する接続IPをSHA-256にした短期keyとし、原文IPは保存しない。Cloudflare外のローカル開発時だけsession UUIDを代替に使う。
- rate limit rowは10分で期限切れとなり、検索requestの一部で非同期削除する。PreviewとProductionのcounterは共有しない。
- Vectorizeへ返すmetadataは公開URL、タイトル、見出し、短い抜粋だけにする。
- raw query、AIチャットの質問、会話本文をWorkers logとGA4 eventへ記録しない。
- API responseは `Cache-Control: no-store` とする。`/api/search` はAcecore以外のURLを採用せず、AIチャットは設定済みの関連公式originと取得元ごとの許可pathだけを採用する。
- corpusは公開後HTMLから作り、`noindex`、管理画面、一覧・完了ページ、`data-pagefind-ignore` を除外する。
- AIチャットはVectorize metadataのlocale、取得元に対応する公式origin、path、scoreを再検証し、重複URLを除いた最大3件だけをGLMへ渡す。取得した本文は命令ではなく参照データとして扱う。
- AI回答のMarkdownリンクは、固定の公式導線と実際にVectorizeから取得したURLのallowlistに一致するものだけを残す。

## 障害対応とrollback

1. Pagefindのキーワード検索が動くことを確認する。
2. `/api/search` のstatusと `X-Search-Request-Id` を確認する。
3. Pages Functionsのruntime logで `semantic_search_error` をrequest IDから追う。logにquery本文は含まれない。
4. AcecoreのWorkers AIまたはVectorizeに問題がある場合、`SEARCH_ENABLED` を `"false"` にしてPagesを再deployする。横断先だけに問題がある場合は、その取得元の `{SOURCE}_SEARCH_ENABLED` だけを `"false"` にする。
5. 検索UIは503やtimeoutを受けるとVectorize部分だけを隠すため、Pagefindは継続する。AIチャットは根拠を取得できない専門サイトの詳細を生成せず、固定の公式ルートへフォールバックする。

indexを作り直す場合は、新indexを同期・query確認してからbindingを切り替えます。先に旧indexを削除しないでください。

## リリース前チェック

- `npm run test:search`
- `npm run test:ai-chat`
- `npm run types:cloudflare:check`
- `npm run check:pages-config`
- `npm run typecheck:functions`
- `npm run validate:content`
- `npm run build`
- `npm run validate:seo`
- desktop/mobileでPagefind、関連結果、0件、filter利用時、API停止時を確認
- Preview deploymentの `/api/search` がpreview indexだけを参照することを確認
- Preview deploymentのAIチャットでAcecore、Systems、Schools、Aceserverの質問を個別に送り、意図したPreview indexだけが検索されることを確認
- World Foundationの質問ではembeddingとVectorize queryが実行されず、固定した公式ルートだけが返ることを確認
- Aceserverの質問でWIKIとPortalが同じembeddingから検索され、ルール・コマンド・参加条件・運用情報をPortalだけで回答しないことを確認
- 有効化する外部indexを所有する各repositoryのPreview同期とquery smoke testが成功していることを確認する。未確認の取得元はbindingを設定せず、kill switchを `false` にする
- 各表示localeで外部の日本語根拠から回答でき、回答リンクが実際に取得した公式URLに限定されることを確認
- production merge後、production deploymentのcommit一致後に同期workflowが成功することを確認
- 20%超削除時は、online plan、公開commit、corpus version、delete件数、plan IDを別担当者が照合し、手動production実行後に完全収束ログを確認

## 公式資料

- [Vectorize client API](https://developers.cloudflare.com/vectorize/reference/client-api/)
- [Vectorize limits](https://developers.cloudflare.com/vectorize/platform/limits/)
- [Vectorize pricing](https://developers.cloudflare.com/vectorize/platform/pricing/)
- [BGE-M3](https://developers.cloudflare.com/workers-ai/models/bge-m3/)
- [Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [D1](https://developers.cloudflare.com/d1/)
