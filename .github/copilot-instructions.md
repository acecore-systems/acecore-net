このリポジトリは Acecore 公式サイトの Astro 静的サイトで、Cloudflare Pages にデプロイされています。

変更前に `AGENTS.md` を確認してください。要点は次の通りです。

- GitHub 上のユーザー向け文章は、明示がない限り日本語で書く。
- PR タイトルと本文は日本語にし、関連 Issue、概要、確認、補足を簡潔に書く。
- Issue URL が渡された場合は、本文とチェックリストを受け入れ条件として扱う。
- Issue template は `不具合` と `タスク` を基本にし、必要以上に入力項目を増やさない。
- 多言語対応では日本語ソースを正とし、CMS と翻訳構成を崩さない。
- CMS 認証は GitHub 認証型とし、保存は同一origin proxyが `cms/acecore/*` の短命branchとPRへ変換する。Sveltia未実装のEditorial Workflow設定だけに依存しない。
- 差分は目的に必要な範囲に絞り、既存の Astro、TypeScript、UnoCSS 構成を尊重する。
- サイト出力に影響する変更では `npm run build` を実行する。docs/template のみなら対象ファイルの format check と `git diff --check` を行う。
