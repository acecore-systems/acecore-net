# Issue #17 Sveltia CMS 導入レポート

## 判断

Sveltia CMS を採用する。

1.0 未到達のため破壊的変更リスクは残るが、現時点で Pages CMS から移行しても既存の日本語ソース中心運用は維持できる。初期導入では CMS 本体を `@sveltia/cms@0.166.0` に pin し、アップデートは手動で確認してから行う。

## 実装内容

- `/admin/index.html` に Sveltia CMS の管理画面を追加
- `/admin/config.yml` に GitHub backend、ブログ、著者、タグのコレクションを定義
- `.pages.yml` を削除し、Pages CMS から Sveltia CMS へ設定を移行
- `public/_headers` で `/admin/*` 専用 CSP を設定する方針
- README の運用手順を Sveltia CMS 前提へ更新

## 認証方針

初期導入では `auth_methods: [token]` を採用する。GitHub OAuth は Sveltia CMS Authenticator などの OAuth client server と `backend.base_url` が必要になるため、編集者が増える段階で Cloudflare Workers に Auth Worker を追加する。

この判断により、今回の導入は追加インフラなしで進められる。非エンジニア編集者が増える場合は PAT 運用ではなく OAuth へ切り替える。

## 移行範囲

Sveltia CMS の管理対象は Pages CMS 時代と同じく次の 3 つに限定する。

- `src/content/blog/*.md`: 日本語ソース記事
- `src/content/authors/*.json`: 著者情報
- `src/content/tags/*.json`: タグ定義

翻訳記事 `src/content/blog/{locale}/*.md` は引き続き Copilot translation PR task で更新する。著者・タグの `i18n` は CMS 上では読み取り専用とし、翻訳更新は manual dispatch の対象に残す。

## 残リスク

- Sveltia CMS は 1.0 未到達なので、config schema や UI の変更リスクがある
- GitHub OAuth を使う場合は Auth Worker の運用と GitHub OAuth App 設定が別途必要
- PAT 認証は少人数向けで、編集者が増えた場合は権限管理とトークン管理の運用負荷が上がる

## 採用条件への対応

- 評価レポート: 本ファイルで作成済み
- 採用判断: 採用
