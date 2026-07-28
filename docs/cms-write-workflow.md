# CMS 保存・自動公開運用

最終確認日: 2026-07-28

## 構成

- GitHub repository: `acecore-systems/acecore-net`
- CMS: Sveltia CMS
- 編集者認証: GitHub OAuth Worker
- repository actor: `acecore-net`専用GitHub App
- publication branch: `main`
- 保存API: 同一originの`/admin/api/github/*`と`/admin/api/graphql`
- 本番deploy: Cloudflare PagesのGitHub連携`main`

`publish_mode: editorial_workflow`は設定しません。Sveltia CMSでは現時点でEditorial Workflowが未実装であり、保存と公開の制御には同一origin proxyを使います。

## 保存経路

1. 編集者がGitHub OAuth Worker経由でSveltia CMSへログインする。
2. Pages FunctionsがOAuth tokenでGitHub userと`acecore-net`へのpush権限を確認する。
3. Pages Functionsが専用GitHub Appから`acecore-net`だけに使える短期installation tokenを発行する。
4. CMSのreadは、許可されたcontentとmediaのtree / blobだけを同一origin proxy経由で返す。
5. 保存時はrepository、branch `main`、変更path、ファイル数、合計サイズ、編集開始時のHEADに加え、JSON / Markdown schema、画像の実形式、危険なHTMLやURLを同期検証する。SVGとPDFはCMSから保存できない。
6. 削除は記事とキャンペーンだけを許可する。著者、タグ、画像は参照整合性を同期検証できないため、CMSから削除できない。
7. proxyが画像とコンテンツをexpected-HEAD付きの`cms: ...` 1 commitで`main`へ直接保存する。
8. 同時更新との競合は上書きせず409にする。GitHub応答が失われた場合も、request固有marker、親SHA、全変更path、各blob SHAが保存内容と完全一致した場合だけ成功として復旧する。
9. GitHubの`main` pushを受けてCloudflare Pagesがproduction deployする。
10. 日本語sourceが変わった場合は、同じdirect pushから翻訳PR task workflowが`cms: ...` subjectを検出する。

恒久的な`cms-content` branch、短命CMS branch、CMS PRは使いません。コード、CMS設定、schema、workflow、翻訳ファイルはproxyのallowlist外であり、従来どおりPRとCIを経由します。

## CMS管理対象

- `src/content/blog/*.md`の日本語source記事（locale subdirectoryは対象外）
- `src/content/authors/*.json`
- `src/content/tags/*.json`
- `src/i18n/source/ja/campaigns/*.json`と`public/admin/config.yml`の`files`に列挙した日本語source JSON
- `public/uploads/**`の許可済み画像形式（AVIF / GIF / JPEG / PNG / WebP）

翻訳ファイル、workflow、設定、source codeなど上記以外はproxyが拒否します。1回の保存は最大100ファイル、追加データ合計25 MiBです。

記事とキャンペーンはCMSから削除できます。著者、タグ、画像は他のコンテンツから参照されるため、現在treeと同一mutation内の参照整合性を同期検証できる仕組みを導入するまでは削除を拒否します。

## 認証と権限

GitHub OAuthは編集者本人とrepositoryへのpush権限の確認にだけ使います。OAuth tokenをGitHub上の保存actorへ流用しません。

専用GitHub Appは次の最小権限にします。

- Owner: `acecore-systems`
- Repository access: Only select repositories / `acecore-net`
- Contents: Read and write
- Metadata: Read-only
- Webhook: 不要

Cloudflare Pagesのproduction環境だけに次をsecretまたはvariableとして設定します。

- `CMS_GITHUB_APP_CLIENT_ID`
- `CMS_GITHUB_APP_INSTALLATION_ID`
- `CMS_GITHUB_APP_PRIVATE_KEY`（GitHubからダウンロードしたRSA PEM。PKCS#1 / PKCS#8に対応）

preview環境にはこれらのwriter認証情報を設定しません。previewの`/admin/`はコードとCMS設定の表示確認用で、repository read/writeは503で停止します。コンテンツの保存と公開はproductionの`/admin/`からだけ行います。

AceServer、Cherry、Hatt、SystemsのAppやprivate keyは共用しません。

## `main` protectionと導入順序

2026-07-28時点の`main`はclassic branch protectionで、strictな`Build and Format`、PR必須、admin enforcement、force push / deletion禁止です。repository rulesetは未作成です。

direct publishには、一般のコード変更に対する保護を維持しながら、専用GitHub AppだけがCMS proxy経由で`main`へcommitできるbypassが必要です。Appを作成・インストールし、Cloudflare Pagesのproduction環境だけへsecretを設定してから、現在のclassic protectionを同等ルールのrepository rulesetへ移し、このAppだけをbypass actorの`Always allow`にします。`For pull requests only`ではdirect commitできません。広いteamやuserへbypassを与えません。

外部設定が揃う前にdirect publish版を本番へ反映すると、CMS read/writeは503またはbranch protectionエラーになります。コードを先に本番へ出さないでください。

## 翻訳workflow

direct commitのsubjectは`cms: create|update|delete|upload ...`形式を維持します。`.github/workflows/create-translation-prs.yml`は`main` pushのbefore/head間にあるnon-merge commitを確認し、すべてが`cms: ...`の場合だけ翻訳PR taskを作成します。

専用GitHub App installation tokenによるpushはGitHub Actionsを起動します。`GITHUB_TOKEN`による保存へ置き換えると後続workflowが抑止されるため使用しません。旧CMS PRのmerge commitは後方互換のため判定から除外します。

## 検証

`npm run validate:content`は、`main`、same-origin proxy、OAuth editor検証、専用GitHub App、expected-HEAD direct commit、`cms: ...` subject、CMS公開path、管理画面案内を確認します。

```powershell
npm run test:cms
npm run typecheck:functions
npm run format:check
npm run validate:content
npm run build
git diff --check
```

本番完了前に、実CMS保存で`main`へ1 commitだけ作成され、翻訳workflowとCloudflare Pagesの`github:push` production deployが成功することを確認します。
