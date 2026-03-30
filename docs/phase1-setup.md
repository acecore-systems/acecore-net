# Phase 1: 会員基盤セットアップガイド

## 概要

Acecore サイトに会員機能を追加するための技術基盤。  
Hono（API）+ Neon（PostgreSQL）+ Drizzle（ORM / マイグレーション）構成で、
Cloudflare Pages 上で動作する。

## 採用技術

| 役割 | 技術 |
| --- | --- |
| API フレームワーク | [Hono](https://hono.dev/) |
| データベース | [Neon](https://neon.tech/)（PostgreSQL） |
| ORM / マイグレーション | [Drizzle](https://orm.drizzle.team/) |
| ホスティング | Cloudflare Pages |
| 動的処理 | Cloudflare Pages Functions |

## アーキテクチャ

Astro で静的サイトをビルドし、Cloudflare Pages Functions で API と認証ミドルウェアを提供する構成。

- **静的ページ**: Astro がビルド時に HTML を生成（既存のコーポレートサイト・ブログ含む）
- **API**: Hono アプリケーションが `functions/api/[[route]].ts` で動的リクエストを処理
- **認証ミドルウェア**: `functions/mypage/_middleware.ts` で保護ページへのアクセスを制御
- **データベース**: Neon サーバーレス PostgreSQL に Drizzle ORM で接続

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
    login.astro    # ログインページ（静的 + クライアント JS）
    mypage/
      index.astro  # マイページ（静的シェル + クライアント JS）
      profile.astro # プロフィール編集
functions/
  types.ts         # Cloudflare Pages Functions 型定義
  api/
    [[route]].ts   # Hono API エントリポイント
  mypage/
    _middleware.ts  # 認証ミドルウェア
drizzle/
  0000_init.sql    # 初期マイグレーション
drizzle.config.ts  # Drizzle Kit 設定
wrangler.jsonc     # Cloudflare Pages 設定
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

> 注: `npm run dev` は Astro の開発サーバーを起動する。
> Pages Functions のローカル実行には `npx wrangler pages dev dist` を使用する。

## 環境分離ルール

| 環境 | DATABASE_URL の設定場所 |
| --- | --- |
| Production | Cloudflare Pages > Settings > Environment Variables（Production） |
| Preview | Cloudflare Pages > Settings > Environment Variables（Preview） |
| Local dev | `.dev.vars` |

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

| メソッド | パス | 説明 |
| --- | --- | --- |
| POST | `/api/auth/sign-in` | サインイン |
| POST | `/api/auth/sign-out` | サインアウト |
| GET | `/api/auth/session` | セッション状態確認 |
| GET | `/api/me` | ユーザー情報取得 |
| PATCH | `/api/me/profile` | プロフィール更新 |

## 画面一覧

| パス | 説明 | 認証 |
| --- | --- | --- |
| `/login` | ログインページ | 不要 |
| `/mypage` | マイページ | 必要（ミドルウェアで保護） |
| `/mypage/profile` | プロフィール編集 | 必要（ミドルウェアで保護） |

## 認証フロー

1. ユーザーが `/login` でメールアドレス・パスワードを入力
2. クライアント JS が `POST /api/auth/sign-in` を呼び出す
3. Hono API がパスワードを PBKDF2 で検証
4. 成功時にセッショントークンを生成し、DB に保存（SHA-256 ハッシュ済み）
5. `HttpOnly; SameSite=Lax` のクッキーでトークンを返却
6. `/mypage` へのアクセス時、`functions/mypage/_middleware.ts` がセッションを検証
7. 未認証なら `/login` へ 302 リダイレクト
8. 認証済みならクライアント JS が `GET /api/me` でユーザー情報を取得して描画

## 初期スキーマ

### users

| カラム | 型 | 制約 |
| --- | --- | --- |
| id | text | PRIMARY KEY |
| email | text | UNIQUE NOT NULL |
| password_hash | text | NOT NULL |
| status | text | NOT NULL DEFAULT 'active' |
| created_at | timestamp with time zone | NOT NULL DEFAULT now() |
| updated_at | timestamp with time zone | NOT NULL DEFAULT now() |

### profiles

| カラム | 型 | 制約 |
| --- | --- | --- |
| user_id | text | PRIMARY KEY, FK → users.id |
| display_name | text | |
| avatar_url | text | |
| phone | text | |
| bio | text | |
| created_at | timestamp with time zone | NOT NULL DEFAULT now() |
| updated_at | timestamp with time zone | NOT NULL DEFAULT now() |

### sessions

| カラム | 型 | 制約 |
| --- | --- | --- |
| id | text | PRIMARY KEY |
| user_id | text | NOT NULL, FK → users.id |
| token_hash | text | NOT NULL |
| expires_at | timestamp with time zone | NOT NULL |
| created_at | timestamp with time zone | NOT NULL DEFAULT now() |
| updated_at | timestamp with time zone | NOT NULL DEFAULT now() |

### roles

| カラム | 型 | 制約 |
| --- | --- | --- |
| user_id | text | FK → users.id, 複合PK |
| role | text | NOT NULL, 複合PK |
| created_at | timestamp with time zone | NOT NULL DEFAULT now() |

## 将来拡張（Phase 2 以降）

- `/api/bookings/*` — 予約機能
- `/api/meetings/*` — 会議機能
- `/api/admin/*` — 管理画面
- `/mypage/bookings` — 予約一覧
- `/mypage/meetings` — 会議一覧
- `/admin` — 管理画面
