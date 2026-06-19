# CMS 書き込み branch 運用

最終確認日: 2026-06-19

## 方針

`main` は本番ソースの唯一の正にします。Cloudflare Pages の production deploy 元も GitHub 連携の `main` だけにします。

Sveltia CMS は `backend.branch: main` と `publish_mode: editorial_workflow` で運用します。CMS 保存は恒久的な投稿受け皿 branch ではなく、短命な `cms/...` branch と PR として扱います。

`cms-content` は恒久運用しません。既存 remote branch は、この変更が `main` に反映され、未反映差分や open PR がないことを確認してから削除候補にします。

## 現行フロー

1. Sveltia CMS が `main` を publication branch として読み込む。
2. CMS 保存時、editorial workflow が短命な CMS branch と PR を作る。
3. CMS PR を merge commit または rebase merge で `main` に入れる。
4. `main` push を受けて Cloudflare Pages が production deploy する。
5. `src/content/blog/*.md` または `src/i18n/source/ja/**/*.json` の CMS commit を検出した場合、翻訳 PR task が作成される。

CMS PR は squash merge しません。squash merge では `cms: ...` commit subject が失われ、翻訳 PR task の自動検出対象外になる場合があります。

## 残る制約

現在の Sveltia CMS は GitHub OAuth 経由で保存します。editorial workflow により `main` 直 commit は避けられますが、PR branch 作成の actor は編集者個人の GitHub 権限です。

編集者個人ではなく専用 bot / GitHub App / backend actor に完全移行したい場合は、CMS 保存を受ける backend を別途実装し、その backend が content-only PR を作る形にします。
