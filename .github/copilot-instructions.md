This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

Read `AGENTS.md` before making changes. In short:

- Write user-facing GitHub text in Japanese by default, including issue comments, PR descriptions, review replies, and work summaries.
- Use Japanese PR titles and follow `.github/pull_request_template.md` for PR bodies.
- Treat GitHub issue bodies and checklists as the acceptance contract when an issue URL is provided.
- Treat `src/i18n/source/ja/**/*.json` and Japanese blog/source content as canonical for multilingual work.
- When exposing site text, campaign notices, enrollment notices, or time-sensitive content to the CMS, update `public/admin/config.yml` and include display-period fields when relevant.
- Keep diffs focused and preserve the existing Astro, TypeScript, UnoCSS, CMS, and translation structure.
- Run `npm run build` when changes can affect site output. For docs-only or GitHub-template-only changes, run targeted format checks and `git diff --check`.
