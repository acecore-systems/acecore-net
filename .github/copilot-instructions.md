This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter and JSON translation keys aligned with the Japanese source.
- For site text translation tasks, update only `src/i18n/translations/{locale}.json` target files, preserve placeholders and code-like tokens, and do not edit `src/i18n/translations/ja.json`.
- When changing site code or content, prefer minimal diffs and preserve the existing Astro and UnoCSS structure.
- Before concluding implementation work, run `npm run build` when changes can affect the site output.
