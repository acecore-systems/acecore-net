# Vectorizeサイト内検索 運用ガイド

Acecore公式サイトの検索は、次の2系統を同じ検索モーダルで提供します。

- Pagefind: 静的ファイルだけで動くキーワード検索。常に主検索として残す。
- Cloudflare Vectorize: Workers AIの多言語embeddingを使う「関連する内容」。失敗時は表示を隠し、Pagefindを継続する。

Vectorizeが未設定、rate limit中、Workers AI障害、通信タイムアウトのいずれでも、検索モーダル全体を失敗させない設計です。

## 構成

1. `npm run build` がAstroとPagefindを生成する。
2. `scripts/build-search-corpus.mjs` が公開後の `dist/**/*.html` から本文を抽出し、`.vectorize/corpus.json` を作る。
3. `scripts/sync-vectorize.mjs` がVectorizeの既存IDと比較する。
4. 新規・変更chunkだけをWorkers AI `@cf/baai/bge-m3` で1024次元に変換してupsertする。
5. corpusから消えたIDをVectorizeから削除する。
6. Pages Function `/api/search` がqueryを同じmodelでembeddingし、locale別namespaceを検索する。

公開書き込みAPIはありません。index更新はGitHub Actionsまたは権限を持つ運用端末からだけ実行します。

## Cloudflareリソース

| 環境       | Vectorize index                 | namespace                                               |
| ---------- | ------------------------------- | ------------------------------------------------------- |
| Preview    | `acecore-net-search-preview`    | `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` |
| Production | `acecore-net-search-production` | 同上                                                    |

両indexはBGE-M3に合わせて `dimensions: 1024`、`metric: cosine` で作成します。modelまたは次元を変更する場合は、既存indexへ混在させず、新しいindexを作成してbindingを切り替えてください。

検索APIのrate limitは、Pagesで正式対応されているD1 bindingを使い、PreviewとProductionを分離します。

| 環境       | D1 database                     | 用途                       |
| ---------- | ------------------------------- | -------------------------- |
| Preview    | `acecore-net-search-preview`    | Preview APIの固定窓counter |
| Production | `acecore-net-search-production` | 本番APIの固定窓counter     |

schemaは `migrations/search/` で管理します。Pages binding、D1、kill switch、score閾値は `wrangler.jsonc` を正とします。設定変更後は次を実行して、Pagesが対応する設定だけであることと生成型を確認します。

```powershell
npm run types:cloudflare
npm run types:cloudflare:check
npm run check:pages-config
npm run typecheck:functions
```

## 自動同期

`.github/workflows/sync-vectorize.yml` は次の動作をします。

- `main` push: production Pagesが同じcommitを公開したことを `.well-known/acecore-build.json` で確認し、corpus build後にも公開commitが変わっていないことを再確認してからproduction indexを同期する。
- 15分ごとのreconciler: 現在公開中のbuild markerを読み、40文字のGit SHAであり、`origin/main` のancestorであることを検証してproduction indexを再同期する。concurrencyで待機中のrunが置換された場合も、次回のreconcilerが公開状態へ収束させる。
- 手動preview: `main` の最新corpusをpreview indexへ同期する。
- 手動production: 現在公開中のmain由来corpusをproduction indexへ再同期する。

push、schedule、手動実行のいずれも `refs/heads/main` 以外ではjobを実行しません。workflow用のcheckoutは常にprotected `main` を `tooling/` へ固定し、同期scriptもこのcheckoutから実行します。公開対象のsite commitは別の `site/` へcheckoutしてbuildするため、build markerが指す過去のmain commitを復旧同期する場合も、secretを扱う同期ロジックはprotected `main` のものです。

GitHub Actionsには次のGitHub Environmentとenvironment secretが必要です。

| GitHub Environment             | environment secret                       | Cloudflare account token                | 同期先                          |
| ------------------------------ | ---------------------------------------- | --------------------------------------- | ------------------------------- |
| `cloudflare-search-preview`    | `CLOUDFLARE_SEARCH_PREVIEW_API_TOKEN`    | `acecore-net-vectorize-preview-sync`    | `acecore-net-search-preview`    |
| `cloudflare-search-production` | `CLOUDFLARE_SEARCH_PRODUCTION_API_TOKEN` | `acecore-net-vectorize-production-sync` | `acecore-net-search-production` |

両EnvironmentのDeployment branches and tagsは `Selected branches and tags` を選び、branch ruleには `main` だけを登録します。workflow側にもmain判定がありますが、Environment側のmain-only protectionをsecret払い出しの独立した必須条件として設定してください。任意refから起動されたworkflowは、そのref上のworkflow定義自体が変更されている可能性があるため、このEnvironment設定なしでは運用を開始しません。

既存の広い権限を持つtokenは転用しません。各環境にaccount-owned tokenを1つずつ用意し、AcecoreのCloudflare accountだけをresourceに指定して、`Vectorize Write` と `Workers AI Read` だけを付与します。`Vectorize Write` は同期scriptが使うindex取得、vector一覧、upsert、delete、mutation確認を含むため、`Vectorize Read` の追加は不要です。

CloudflareのVectorize権限はindex単位では制限できません。Preview / Production tokenの分離はcredentialのローテーションと障害範囲を分けるための運用境界であり、特定indexだけへ書き込めるCloudflare側ACLではありません。同期scriptのindex allowlistとEnvironmentのmain-only protectionを独立した誤操作防止策として維持します。

secretは最後の同期stepだけへ渡し、site checkout、依存関係install、buildには渡しません。token値をログ、PR本文、設定ファイルへ書かないでください。ローテーション時は同じ2権限の新tokenを作成し、Environment secretを更新して同期成功を確認してから旧tokenを削除します。

## 手元での確認と同期

Node.jsは `.node-version` のバージョンを使います。

```powershell
npm ci
npm run build
npm run sync:vectorize:dry-run
```

実際にpreviewへ同期する場合:

```powershell
$env:VECTORIZE_INDEX_NAME = 'acecore-net-search-preview'
$env:CLOUDFLARE_ACCOUNT_ID = '<account-id>'
$env:CLOUDFLARE_API_TOKEN = '<scoped-token>'
npm run sync:vectorize
```

同期処理は内容ハッシュ付きIDを使うため、同じcorpusを再実行してもembeddingを再作成しません。upsertを先に行い、その後で古いIDを削除します。最後のmutationがquery可能になるまで待機します。

同期先はAcecore検索用の2 indexだけをallowlistし、corpusが200 source・1,000 vector・各locale 50 vectorを下回る場合や、管理外IDがある場合は変更前に停止します。既存vectorの20%を超える削除も既定で停止し、内容を確認した運用者が `--allow-large-delete` を明示した場合だけ解除できます。削除はVectorize APIの上限に合わせて100 IDずつ送ります。Cloudflare RESTの一時的なnetwork error、429、5xxは、30秒timeoutと `Retry-After` を含む上限付きbackoffで再試行し、mutation直後にlist cursorが無効化された場合は先頭から安全に再取得します。

## セキュリティとプライバシー

- `/api/search` は同一OriginのJSON POSTだけを受け付ける。
- request bodyは `Content-Length` とbounded stream readerの両方で2KiBまで、queryは2〜160文字に制限する。
- D1でclient単位20回/分を先に判定し、許可されたrequestだけを全体300回/分へ加算する。
- client keyはCloudflareが付与する接続IPをSHA-256にした短期keyとし、原文IPは保存しない。Cloudflare外のローカル開発時だけsession UUIDを代替に使う。
- rate limit rowは10分で期限切れとなり、検索requestの一部で非同期削除する。PreviewとProductionのcounterは共有しない。
- Vectorizeへ返すmetadataは公開URL、タイトル、見出し、短い抜粋だけにする。
- raw queryをWorkers logとGA4 eventへ記録しない。
- API responseは `Cache-Control: no-store` とし、外部originのURLを結果に採用しない。
- corpusは公開後HTMLから作り、`noindex`、管理画面、一覧・完了ページ、`data-pagefind-ignore` を除外する。

## 障害対応とrollback

1. Pagefindのキーワード検索が動くことを確認する。
2. `/api/search` のstatusと `X-Search-Request-Id` を確認する。
3. Pages Functionsのruntime logで `semantic_search_error` をrequest IDから追う。logにquery本文は含まれない。
4. Workers AIまたはVectorizeに問題がある場合、`SEARCH_ENABLED` を `"false"` にしてPagesを再deployする。
5. UIは503やtimeoutを受けるとVectorize部分だけを隠すため、Pagefindは継続する。

indexを作り直す場合は、新indexを同期・query確認してからbindingを切り替えます。先に旧indexを削除しないでください。

## リリース前チェック

- `npm run test:search`
- `npm run types:cloudflare:check`
- `npm run check:pages-config`
- `npm run typecheck:functions`
- `npm run validate:content`
- `npm run build`
- `npm run validate:seo`
- desktop/mobileでPagefind、関連結果、0件、filter利用時、API停止時を確認
- Preview deploymentの `/api/search` がpreview indexだけを参照することを確認
- production merge後、production deploymentのcommit一致後に同期workflowが成功することを確認

## 公式資料

- [Vectorize client API](https://developers.cloudflare.com/vectorize/reference/client-api/)
- [Vectorize limits](https://developers.cloudflare.com/vectorize/platform/limits/)
- [Vectorize pricing](https://developers.cloudflare.com/vectorize/platform/pricing/)
- [BGE-M3](https://developers.cloudflare.com/workers-ai/models/bge-m3/)
- [Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [D1](https://developers.cloudflare.com/d1/)
