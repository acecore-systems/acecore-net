# CMS 書き込み branch 運用

最終確認日: 2026-06-19

## 現在の live 状態

- GitHub repository: `acecore-systems/acecore-net`
- GitHub default branch: `main`
- CMS backend: `public/admin/config.yml` の `backend.name: github`
- CMS auth mode: GitHub 認証型
- CMS OAuth backend: `https://sveltia-cms-auth.sparkling-tree-7cef.workers.dev`
- CMS publication branch: `main`
- CMS publish mode: `editorial_workflow`
- `main`: GitHub branch API 上の `protected` は `true`
- Branch protection: admin enforcement on、PR review on、required status check `Build and Format`
- GitHub ruleset: なし

## 方針

`main` は本番ソースの唯一の正にします。Cloudflare Pages の production deploy 元も GitHub 連携の `main` だけにします。

Sveltia CMS は `backend.branch: main` と `publish_mode: editorial_workflow` で運用します。CMS 保存は恒久的な投稿受け皿 branch ではなく、短命な `cms/...` branch と PR として扱います。

Cloudflare Access を `/admin/` の前段に置く場合も、保存認証は GitHub OAuth Worker が担当します。Cherry のような Cloudflare Access 型 token proxy には寄せません。

`cms-content` は恒久運用しません。旧 remote branch は未反映差分や open PR がないことを確認して削除済みです。

## 現行フロー

1. Sveltia CMS が `main` を publication branch として読み込む。
2. CMS 保存時、editorial workflow が短命な CMS branch と PR を作る。
3. PR CI が `npm run format:check`、`npm run validate:content`、`npm run build` を実行する。
4. CMS PR を merge commit または rebase merge で `main` に入れる。
5. `main` push を受けて Cloudflare Pages が production deploy する。
6. `src/content/blog/*.md` または `src/i18n/source/ja/**/*.json` の CMS commit を検出した場合、翻訳 PR task が作成される。

CMS PR は squash merge しません。squash merge では `cms: ...` commit subject が失われ、翻訳 PR task の自動検出対象外になる場合があります。

## 残る制約

現在の Sveltia CMS は GitHub OAuth 経由で保存します。editorial workflow により `main` 直 commit は避けられますが、PR branch 作成の actor は編集者個人の GitHub 権限です。

編集者個人ではなく専用 bot / GitHub App / backend actor に完全移行したい場合は、CMS 保存を受ける backend を別途実装し、その backend が content-only PR を作る形にします。

## 検証方針

`npm run validate:content` は CMS config が次の条件を満たすことも確認します。

- `backend.branch` が `main`
- `publish_mode` が `editorial_workflow`
- CMS に `path` field を露出しない
- CMS 管理対象が許可された content / i18n source path に収まっている
