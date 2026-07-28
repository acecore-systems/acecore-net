このリポジトリは Acecore 公式サイトの Astro 静的サイトで、Cloudflare Pages にデプロイされています。

変更前に `AGENTS.md` を確認してください。要点は次の通りです。

- GitHub 上のユーザー向け文章は、明示がない限り日本語で書く。
- PR タイトルと本文は日本語にし、関連 Issue、概要、確認、補足を簡潔に書く。
- Issue URL が渡された場合は、本文とチェックリストを受け入れ条件として扱う。
- Issue template は `不具合` と `タスク` を基本にし、必要以上に入力項目を増やさない。
- 多言語対応では日本語ソースを正とし、CMS と翻訳構成を崩さない。
- CMSログインはGitHub OAuthで編集者本人とrepositoryへのpush権限を確認し、repositoryのread/writeは`acecore-net`専用GitHub Appへ分離する。同一origin proxyはpath、件数、容量、最新HEADを検証し、CMS管理対象だけをexpected-HEAD付きの`cms: ...` 1 commitで`main`へ直接保存する。コード、設定、schema、workflow、翻訳ファイルは従来どおりPRとCIを経由する。
- CMS保存前に、現在の`main` treeへ同一mutationを投影し、全言語記事の著者、タグ、ローカル画像参照が投影後にも存在することを同期検証する。著者、タグ、画像の削除禁止は、参照検証とは別の安全境界として維持する。
- 差分は目的に必要な範囲に絞り、既存の Astro、TypeScript、UnoCSS 構成を尊重する。
- サイト出力に影響する変更では `npm run build` を実行する。docs/template のみなら対象ファイルの format check と `git diff --check` を行う。
