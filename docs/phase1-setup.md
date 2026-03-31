# Phase 1: 会員基盤セットアップガイド

## 概要

Acecore サイトに会員機能を追加するための技術基盤。  
Hono（API）+ Neon（PostgreSQL）+ Drizzle（ORM / マイグレーション）構成で、
Cloudflare Pages 上で動作する。

## 採用技術

| 役割                   | 技術                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| API フレームワーク     | [Hono](https://hono.dev/)                                                                                    |
| データベース           | [Neon](https://neon.tech/)（PostgreSQL）                                                                     |
| ORM / マイグレーション | [Drizzle](https://orm.drizzle.team/)                                                                         |
| ホスティング           | Cloudflare Pages                                                                                             |
| SSR アダプター         | [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)                     |
| OG 画像生成            | [Satori](https://github.com/vercel/satori) + [@resvg/resvg-wasm](https://github.com/nicolo-ribaudo/resvg-js) |

## アーキテクチャ

`@astrojs/cloudflare` アダプターによるハイブリッド構成。
静的ページ（ブログ・コーポレート）はビルド時にプリレンダリングし、
動的ページ（API・マイページ）は Cloudflare Workers 上で SSR する。

- **静的ページ**: Astro がビルド時に HTML を生成（`prerender = true`、デフォルト）
- **API**: Hono アプリケーションを Astro サーバーエンドポイント `src/pages/api/[...route].ts` で委譲
- **認証保護**: マイページは `prerender = false` で SSR し、フロントマターでセッション検証
- **データベース**: Neon サーバーレス PostgreSQL に Drizzle ORM で接続

### 設計判断: `@astrojs/cloudflare` アダプター

`sharp`（ネイティブ C++ バインディング）は Cloudflare Workers ランタイムでは動作しないため、
OG 画像生成を `@resvg/resvg-wasm`（WASM ベース）に移行した。
これにより `@astrojs/cloudflare` アダプターの制約が解消され、
Astro ネイティブのルーティング・SSR を活用できる。

## ディレクトリ構成

```text
src/
  db/
    schema/        # Drizzle スキーマ定義
      users.ts
      profiles.ts
      sessions.ts
      roles.ts
      index.ts
    client.ts      # Neon 接続クライアント
  server/
    auth/          # 認証ユーティリティ
      password.ts  # パスワードハッシュ（PBKDF2）
      session.ts   # セッション管理
      index.ts
    app.ts         # Hono API アプリケーション
  pages/
    api/
      [...route].ts # Hono API エントリポイント（SSR）
    login.astro    # ログインページ（プリレンダリング）
    mypage/
      index.astro  # マイページ（SSR + サーバーサイド認証）
      profile.astro # プロフィール編集（SSR + サーバーサイド認証）
drizzle/
  0000_init.sql    # 初期マイグレーション
drizzle.config.ts  # Drizzle Kit 設定
wrangler.jsonc     # Cloudflare Workers 設定
.dev.vars.example  # ローカル環境変数テンプレート
```

## 環境構築

### 1. Neon プロジェクト作成

[Neon コンソール](https://console.neon.tech/) で 3 つの DB を作成する：

- **production**: 本番環境用
- **staging**: preview / staging 用
- **dev**: ローカル開発用

### 2. ローカル環境変数の設定

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` にローカル開発用の `DATABASE_URL` を設定する。

### 3. マイグレーション

```bash
# マイグレーションファイルを生成（スキーマ変更時）
npm run db:generate

# DB に適用
DATABASE_URL="..." npm run db:migrate
```

### 4. 開発サーバー起動

```bash
npm run dev
```

> `@astrojs/cloudflare` アダプターにより、`npm run dev` で API エンドポイント（SSR）と
> 静的ページの両方を同時に開発できる。
> Cloudflare Workers のバインディングにアクセスするには `.dev.vars` の設定が必要。

### 5. デプロイ確認

`@astrojs/cloudflare` アダプター採用後は、ビルド成果物が以下の 2 系統に分かれる。

- `dist/client` — Cloudflare Pages がそのまま配信できる静的アセット
- `dist/server/wrangler.json` — API / SSR を含む Cloudflare Worker のデプロイ設定

そのため、**既存の Cloudflare Pages の Git 連携プレビューだけでは `/api/*` や `/mypage/*` は確認できない**。
会員機能まで含めて確認する場合は、以下のどちらかが必要：

1. `npm run deploy:worker` による Worker デプロイ
2. PR / ブランチごとに Worker プレビューを発行する追加フロー

ローカルで Worker 互換の挙動を確認する場合：

```bash
npm run preview:worker
```

## 環境分離ルール

| 環境       | DATABASE_URL の設定場所                                           |
| ---------- | ----------------------------------------------------------------- |
| Production | Cloudflare Pages > Settings > Environment Variables（Production） |
| Preview    | Cloudflare Pages > Settings > Environment Variables（Preview）    |
| Local dev  | `.dev.vars`                                                       |

### 禁止事項

- preview 環境で production の `DATABASE_URL` を使わない
- ローカル開発で production DB に接続しない
- テストや seed を production DB に流さない

## マイグレーション運用

### 原則

- アプリデプロイと DB マイグレーションは分離する
- マイグレーションは明示実行する
- 本番マイグレーションは承認付き手順で実行する

### 手順

1. `src/db/schema/` でスキーマを変更
2. `npm run db:generate` でマイグレーションファイル生成
3. ローカル dev DB に `npm run db:migrate` で適用
4. staging DB に適用して動作確認
5. production DB に手動または承認付き CI で適用

### 破壊的変更の原則

1. 先に互換性のあるマイグレーションを入れる
2. 次にアプリ側を対応させる
3. 最後に不要カラムや旧仕様を削除する

## API 一覧

| メソッド | パス                 | 説明               |
| -------- | -------------------- | ------------------ |
| POST     | `/api/auth/sign-up`  | 新規登録           |
| POST     | `/api/auth/sign-in`  | サインイン         |
| POST     | `/api/auth/sign-out` | サインアウト       |
| GET      | `/api/auth/session`  | セッション状態確認 |
| GET      | `/api/me`            | ユーザー情報取得   |
| PATCH    | `/api/me/profile`    | プロフィール更新   |

## 画面一覧

| パス              | 説明                     | レンダリング     | 認証                       |
| ----------------- | ------------------------ | ---------------- | -------------------------- |
| `/login`          | ログイン・新規登録ページ | プリレンダリング | 不要                       |
| `/mypage`         | マイページ               | SSR              | 必要（サーバーサイド検証） |
| `/mypage/profile` | プロフィール編集         | SSR              | 必要（サーバーサイド検証） |

## 認証フロー

1. ユーザーが `/login` でメールアドレス・パスワードを入力
2. クライアント JS が `POST /api/auth/sign-in` を呼び出す
3. Hono API がパスワードを PBKDF2 で検証
4. 成功時にセッショントークンを生成し、DB に保存（SHA-256 ハッシュ済み）
5. `HttpOnly; SameSite=Lax` のクッキーでトークンを返却
6. `/mypage` へのアクセス時、SSR フロントマターでセッションクッキーを検証
7. 未認証なら `/login` へ 302 リダイレクト
8. 認証済みならクライアント JS が `GET /api/me` でユーザー情報を取得して描画

## 初期スキーマ

### users

| カラム        | 型                       | 制約                      |
| ------------- | ------------------------ | ------------------------- |
| id            | text                     | PRIMARY KEY               |
| email         | text                     | UNIQUE NOT NULL           |
| password_hash | text                     | NOT NULL                  |
| status        | text                     | NOT NULL DEFAULT 'active' |
| created_at    | timestamp with time zone | NOT NULL DEFAULT now()    |
| updated_at    | timestamp with time zone | NOT NULL DEFAULT now()    |

### profiles

| カラム       | 型                       | 制約                       |
| ------------ | ------------------------ | -------------------------- |
| user_id      | text                     | PRIMARY KEY, FK → users.id |
| display_name | text                     |                            |
| avatar_url   | text                     |                            |
| phone        | text                     |                            |
| bio          | text                     |                            |
| created_at   | timestamp with time zone | NOT NULL DEFAULT now()     |
| updated_at   | timestamp with time zone | NOT NULL DEFAULT now()     |

### sessions

| カラム     | 型                       | 制約                    |
| ---------- | ------------------------ | ----------------------- |
| id         | text                     | PRIMARY KEY             |
| user_id    | text                     | NOT NULL, FK → users.id |
| token_hash | text                     | NOT NULL                |
| expires_at | timestamp with time zone | NOT NULL                |
| created_at | timestamp with time zone | NOT NULL DEFAULT now()  |
| updated_at | timestamp with time zone | NOT NULL DEFAULT now()  |

### roles

| カラム     | 型                       | 制約                   |
| ---------- | ------------------------ | ---------------------- |
| user_id    | text                     | FK → users.id, 複合PK  |
| role       | text                     | NOT NULL, 複合PK       |
| created_at | timestamp with time zone | NOT NULL DEFAULT now() |

## 将来拡張（Phase 2 以降）

- `/api/bookings/*` — 予約機能
- `/api/meetings/*` — 会議機能
- `/api/admin/*` — 管理画面
- `/mypage/bookings` — 予約一覧
- `/mypage/meetings` — 会議一覧
- `/admin` — 管理画面
