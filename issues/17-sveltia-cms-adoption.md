# Issue #17 Sveltia CMS 導入レポート

## 判断

Sveltia CMS を採用する。

1.0 未到達のため破壊的変更リスクは残るが、現時点で Pages CMS から移行しても既存の日本語ソース中心運用は維持できる。初期導入では CMS 本体を `@sveltia/cms@0.166.0` に pin し、アップデートは手動で確認してから行う。

## 実装内容

- `/admin/index.html` に Sveltia CMS の管理画面を追加
- `/admin/config.yml` に GitHub backend、ブログ、著者、タグのコレクションを定義
- `workers/sveltia-cms-auth` に GitHub OAuth 用の Cloudflare Worker を追加
- `.pages.yml` を削除し、Pages CMS から Sveltia CMS へ設定を移行
- `public/_headers` で `/admin/*` 専用 CSP と OAuth popup 用 COOP を設定する方針
- README の運用手順を Sveltia CMS 前提へ更新

## 認証方針

非エンジニア編集者も扱いやすいように、`auth_methods: [oauth]` を採用する。GitHub OAuth は Cloudflare Workers 上の Auth Worker を `backend.base_url` として指定する。

この判断により、PAT の発行・scope 選択・失効管理を編集者へ委ねない運用にする。GitHub repo への権限付与と剥奪は GitHub 側のユーザー/organization 権限で管理する。

## 移行範囲

Sveltia CMS の管理対象は Pages CMS 時代と同じく次の 3 つに限定する。

- `src/content/blog/*.md`: 日本語ソース記事
- `src/content/authors/*.json`: 著者情報
- `src/content/tags/*.json`: タグ定義

翻訳記事 `src/content/blog/{locale}/*.md` は引き続き Copilot translation PR task で更新する。著者・タグの `i18n` は CMS 上では読み取り専用とし、翻訳更新は manual dispatch の対象に残す。

## 残リスク

- Sveltia CMS は 1.0 未到達なので、config schema や UI の変更リスクがある
- Auth Worker の運用と GitHub OAuth App の Client ID/Secret 管理が必要

## 採用条件への対応

- 評価レポート: 本ファイルで作成済み
- 採用判断: 採用
