This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

Follow `AGENTS.md` before making changes. Key points:

- Write GitHub issues, pull requests, pull request descriptions, review summaries, and other user-facing GitHub text in Japanese by default unless the task explicitly requires another language.
- Use Japanese PR titles and follow `.github/pull_request_template.md` for PR bodies.
- Treat GitHub issue bodies and checklists as the acceptance contract when an issue URL is provided.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter and JSON translation keys aligned with the Japanese source.
- For site text translation tasks, use `src/i18n/source/ja/**/*.json` as the Japanese source, update only `src/i18n/translations/{locale}.json` target files, preserve placeholders and code-like tokens, and do not edit Japanese source files.
- When exposing site text, campaign notices, enrollment notices, or time-sensitive content to the CMS, update `public/admin/config.yml` and include display-period fields when relevant.
- When changing site code or content, prefer minimal diffs and preserve the existing Astro and UnoCSS structure.
- Before concluding implementation work, run `npm run build` when changes can affect the site output. For docs-only or GitHub-template-only changes, run targeted format checks and `git diff --check` instead.
