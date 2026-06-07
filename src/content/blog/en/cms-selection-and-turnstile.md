---
title: 'Sveltia CMS Setup Guide'
description: 'A practical guide to adding Sveltia CMS to an Astro or static site, covering the GitHub backend, OAuth Worker, media uploads, multilingual operations, CMS pull requests, and lessons from real fixes.'
date: 2026-03-15T00:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'CMS', 'Astro', 'Cloudflare', 'セキュリティ']
image: /uploads/acecore-generated/blog-cms-selection-and-turnstile.webp
processFigure:
  title: Sveltia CMS setup flow
  description: Treat the admin app, authentication, editable content, media, and pull request flow as separate design decisions.
  steps:
    - title: Add the admin app
      description: Place index.html and config.yml under public/admin and load the Sveltia CMS bundle.
      icon: i-lucide-layout
      accent: brand
    - title: Configure GitHub
      description: Decide the repo, branch, OAuth Worker, and CMS commit messages before editors start saving content.
      icon: i-lucide-git-branch
      accent: emerald
    - title: Limit editable scope
      description: Expose only the blog, authors, tags, and Japanese source JSON files that should be edited through the CMS.
      icon: i-lucide-file-text
      accent: amber
    - title: Automate operations
      description: Connect the cms-content branch, CMS edit PRs, and translation PR tasks without mixing them with normal development.
      icon: i-lucide-git-pull-request
      accent: slate
compareTable:
  title: Before and after adding the CMS
  before:
    label: Editing Markdown by hand
    items:
      - Only people comfortable with GitHub or an editor can update content
      - Image paths, author IDs, and tag names are typed manually
      - Japanese source changes and translated files are easy to mix
      - Preview environments can accidentally read content from main
  after:
    label: Editing with Sveltia CMS
    items:
      - Markdown and JSON can be edited from a browser form
      - relation, image, and select widgets reduce broken values
      - Only CMS commits can trigger translation PR tasks
      - Runtime config can switch the CMS branch between preview and production
callout:
  type: note
  title: Assumption for this guide
  text: Sveltia CMS is a browser-based CMS app that edits Markdown and JSON files through a Git backend. This article uses the Acecore site as a concrete example, but the setup applies to many Astro and static-site projects.
checklist:
  title: Setup checklist
  items:
    - text: Load Sveltia CMS from public/admin/index.html
      checked: true
    - text: Define the GitHub backend and collections in public/admin/config.yml
      checked: true
    - text: Use an OAuth Worker for multi-user editing
      checked: true
    - text: Align media_folder and public_folder with Astro's public directory
      checked: true
    - text: Decide how CMS commits trigger translation or publishing workflows
      checked: true
faq:
  title: Frequently asked questions
  items:
    - question: What kind of site is Sveltia CMS good for?
      answer: It works well for static sites where Markdown or JSON lives in the repository, such as Astro, Hugo, and VitePress projects. You can add a CMS without adding an external database.
    - question: Can I use only a GitHub Personal Access Token?
      answer: Yes, but for multiple editors or non-engineers, an OAuth Worker is safer and easier to explain. Acecore uses a Cloudflare Worker as the OAuth client and sets it as backend.base_url.
    - question: Should every locale be editable in the CMS?
      answer: For a small team, it is safer to edit only the Japanese source in the CMS and update translations through pull requests. Exposing every locale makes review and stale-translation detection harder.
---

Sveltia CMS is a good fit when you want to add an editing screen to a static site without moving content into an external database. This guide explains how we introduced it to the Acecore Astro site and what we fixed later after real pull requests and commits exposed operational gaps.

The title is intentionally simple: **Sveltia CMS Setup Guide**. This is not a CMS comparison article. It is a practical checklist for people who want to add Sveltia CMS to their own site.

## When Sveltia CMS Fits

Sveltia CMS is not a CMS that owns your database and serves content through a separate API. It is a single-page admin app that edits files in your Git repository through a backend such as GitHub.

It is a good match when:

- your site stores content as Markdown or JSON in the repository
- you want article, author, tag, and page-text changes to remain reviewable as Git diffs
- you do not want to add a database or a separate admin service
- uploaded images can live under a folder such as `public/uploads`
- CMS edits should still go through pull requests before production

If you need complex editorial permissions, large asset management, scheduled publishing workflows, or real-time data editing, a full headless CMS or a custom admin app may be a better fit.

## Overall Architecture

Acecore runs Sveltia CMS with this structure:

```text
public/admin/index.html
  -> loads @sveltia/cms from a CDN

public/admin/config.yml
  -> defines the GitHub backend, editable collections, and media folders

workers/sveltia-cms-auth
  -> Cloudflare Worker for GitHub OAuth

cms-content branch
  -> branch where CMS edits are saved

.github/workflows/cms-content-pr.yml
  -> opens a pull request from cms-content to main

.github/workflows/create-translation-prs.yml
  -> creates translation PR tasks only for cms: commits
```

The first lesson is that installing the admin app is only the beginning. Authentication, media paths, preview branches, translations, and merge strategy all become part of the CMS design.

## 1. Place the Admin App Under `public/admin`

In Astro, files under `public` are served as static assets. The Sveltia CMS docs also list `public` as the static folder for Astro, Next.js, Nuxt, Remix, and VitePress projects.

A minimal page looks like this:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CMS</title>
  </head>
  <body>
    <script src="https://unpkg.com/@sveltia/cms@0.166.0/dist/sveltia-cms.js"></script>
  </body>
</html>
```

Do not add an extra stylesheet or `type="module"` unless you have a specific reason. Sveltia CMS bundles its UI styles in the JavaScript file, and the current CDN build is loaded as a normal script.

Acecore uses manual initialization so preview builds can override the branch at runtime.

```html
<script src="/admin/runtime-config.js"></script>
<script src="https://unpkg.com/@sveltia/cms@0.166.0/dist/sveltia-cms.js"></script>
<script src="/admin/init.js"></script>
```

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 2. Configure the GitHub Backend

The minimal GitHub backend needs `backend.name` and `backend.repo`. In production, you should also decide the branch, OAuth endpoint, and commit messages up front.

```yaml
backend:
  name: github
  repo: owner/repository
  branch: cms-content
  base_url: https://your-sveltia-cms-auth-worker.example.workers.dev
  auth_methods: [oauth]
  commit_messages:
    create: 'cms: create {{collection}} "{{slug}}"'
    update: 'cms: update {{collection}} "{{slug}}"'
    delete: 'cms: delete {{collection}} "{{slug}}"'
    uploadMedia: 'cms: upload "{{path}}"'
    deleteMedia: 'cms: delete media "{{path}}"'
```

The branch choice is important. A personal site may save directly to `main`, but a business site is easier to review when CMS edits are saved to a dedicated `cms-content` branch and then turned into a pull request.

## 3. Add an OAuth Worker

A Personal Access Token is enough for a quick local test. It is not ideal when non-engineers or multiple editors need access.

Acecore uses Sveltia CMS Authenticator on Cloudflare Workers and points `backend.base_url` to that Worker.

```yaml
backend:
  name: github
  repo: acecore-systems/acecore-net
  branch: cms-content
  base_url: https://sveltia-cms-auth.example.workers.dev
  auth_methods: [oauth]
```

The GitHub OAuth App callback points to the Worker's `/callback` URL. The Worker receives `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and optionally `ALLOWED_DOMAINS` as environment variables.

This is separate from bot protection. Turnstile belongs around contact forms or comment APIs. CMS login should be handled through GitHub OAuth.

## 4. Decide the Media Folder Early

Sveltia CMS internal media storage writes uploaded assets into the repository. In Astro, public assets should usually live under `public`.

```yaml
media_folder: public/uploads
public_folder: /uploads
```

If this is not explicit, media can end up relative to a content folder, or the saved file path can diverge from the public URL referenced by Markdown.

Acecore later fixed this in [PR #116](https://github.com/acecore-systems/acecore-net/pull/116). The lesson is simple: decide the storage path and public URL together when the CMS is introduced.

We also keep external images and uploaded images as separate frontmatter fields.

```yaml
- name: image
  label: External image URL
  widget: string
  required: false

- name: uploadedImage
  label: Uploaded image
  widget: image
  required: false
```

## 5. Split Editable Content Into Collections

The most important design decision is not the CMS itself, but which files are editable through it.

| collection | Target                         | Policy                                            |
| ---------- | ------------------------------ | ------------------------------------------------- |
| `blog`     | `src/content/blog/*.md`        | Edit only Japanese source articles                |
| `authors`  | `src/content/authors/*.json`   | Edit author profiles and localized names          |
| `tags`     | `src/content/tags/*.json`      | Edit tag names and localized labels               |
| page text  | `src/i18n/source/ja/**/*.json` | Edit Japanese source text for pages and shared UI |

The key is to avoid exposing all translated Markdown files in the CMS. For a nine-language site, that makes it harder to know which language is current and which translation should follow a Japanese source change.

Acecore treats Japanese content as the source of truth and sends translations through the [GitHub Copilot blog translation pipeline](/en/blog/copilot-translation-pipeline/).

## 6. Use Relation and Select Widgets

The more free text fields you expose, the more small mistakes you will get.

Tags are relation fields, not manually typed strings.

```yaml
- name: tags
  label: Tags
  widget: relation
  collection: tags
  value_field: name
  display_fields: ['{{name}} ({{id}})']
  search_fields: [name, id]
  multiple: true
  required: false
```

Authors use the same pattern. Announcement tone, link-card icons, and other constrained values are select fields.

This was improved over time. A CMS should not merely make editing possible; it should make invalid values hard to enter.

## 7. Make Japanese Source JSON Editable

CMS editing is also useful for fixed page text. Acecore stores Japanese page text under `src/i18n/source/ja/**/*.json` and exposes it in page-oriented groups.

The lesson from implementation was to avoid adding every field at once. After making page text editable, we had to stabilize existing value loading and label organization. Start with high-change areas like the blog, authors, tags, announcements, and key landing pages, then expand.

For multilingual sites, do not let CMS edits directly rewrite translation files. Keeping Japanese source edits and translation pull requests separate makes review much easier.

## 8. Keep Preview Branches Honest

When the CMS is opened in a Cloudflare Pages preview build, it should not necessarily read `main`. If the preview is for a pull request, the CMS should know which branch it is looking at.

Acecore generates `public/admin/runtime-config.js` before builds:

```javascript
const cmsBranch =
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  process.env.BRANCH ||
  'main'

await writeFile(
  'public/admin/runtime-config.js',
  `window.CMS_MANUAL_INIT = true;\nwindow.ACECORE_CMS_BRANCH = ${JSON.stringify(cmsBranch)};\n`,
  'utf8',
)
```

Then `init.js` overrides only the backend branch.

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

This keeps the shared YAML config stable while still making preview environments point at the right branch.

## 9. Create PRs From a CMS Branch

Saving CMS edits to `cms-content` and opening a pull request to `main` keeps content changes reviewable.

```yaml
on:
  push:
    branches:
      - cms-content
```

The workflow checks whether a CMS PR already exists and avoids opening duplicates.

The merge method matters. Acecore's translation task detection relies on commit subjects such as `cms: create ...` and `cms: update ...`. If a CMS PR is squash merged and those subjects disappear, the translation workflow may not detect the source change. For CMS PRs, keep the `cms:` commits through merge commit or rebase merge.

## 10. Trigger Translation Only for CMS Commits

If every Japanese source change triggers translation tasks, normal development commits can create unnecessary translation PRs.

[PR #98](https://github.com/acecore-systems/acecore-net/pull/98) added the `--cms-only` guard so push-triggered translation tasks are created only for CMS commit subjects.

```javascript
function isCmsCommitSubject(subject) {
  return /^cms: (create|update|delete) /.test(subject || '')
}
```

This makes the commit subject part of the workflow contract. Normal code or article PRs should not use the `cms:` prefix. Only the CMS save flow should produce it.

## 11. Give `/admin` Its Own CSP

The admin screen needs different external connections than public pages: the Sveltia CMS CDN, GitHub API, the OAuth Worker, blob URLs, and status endpoints.

Acecore gives `/admin/*` a separate CSP and also marks the admin area as noindex.

```text
/admin/*
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'self'; script-src 'self' https://unpkg.com; connect-src 'self' blob: data: https://unpkg.com https://api.github.com https://www.githubstatus.com https://sveltia-cms-auth.example.workers.dev; frame-ancestors 'self'
```

## Keep Turnstile Separate

An older version of this article mixed CMS selection and Cloudflare Turnstile in one story. That was confusing.

Sveltia CMS setup is about GitHub backend, OAuth, collections, media paths, and pull request operations. Turnstile is about protecting contact forms or comment APIs from bot submissions. They both support safer operations, but they live in different layers and deserve separate articles.

## Lessons From Pull Requests and Commits

The biggest lessons came after the first setup landed.

### 1. Update Articles When the CMS Changes

The site moved from an older Pages CMS assumption to Sveltia CMS, but the article text did not keep up. When the implementation changes, related articles, screenshots, and internal link text should be audited together.

### 2. Do Not Postpone OAuth

PAT-based testing is fine, but CMS exists so more people can edit content. OAuth should be part of the real setup, not a future improvement.

### 3. Fix Media Paths Before Editors Upload Images

Changing media paths later means auditing existing Markdown references and generated output. For Astro, `public/uploads` and `/uploads` are a practical default.

### 4. Expand CMS Fields Gradually

Putting every page text field into `config.yml` at once makes the config hard to review and maintain. Start with content that changes often, then add lower-frequency page text later.

### 5. Treat Commit Subjects as an API

`cms:` is not cosmetic. It is an input to automation. Using it outside the CMS flow can trigger unnecessary workflows; removing it from CMS merges can stop required workflows.

### 6. Make the Active Branch Visible

The CMS reads files from GitHub, so preview builds need a clear branch story. Runtime branch injection prevents preview and CMS state from drifting apart.

## Minimal Starting Point

For a new Astro site, start with this shape:

```text
public/admin/index.html
public/admin/config.yml
public/admin/init.js
public/admin/runtime-config.js
```

```yaml
backend:
  name: github
  repo: owner/repository
  branch: cms-content
  base_url: https://your-auth-worker.example.workers.dev
  auth_methods: [oauth]
  commit_messages:
    create: 'cms: create {{collection}} "{{slug}}"'
    update: 'cms: update {{collection}} "{{slug}}"'
    delete: 'cms: delete {{collection}} "{{slug}}"'

media_folder: public/uploads
public_folder: /uploads

collections:
  - name: blog
    label: Blog
    folder: src/content/blog
    slug: '{{fields._slug}}'
    fields:
      - { name: title, label: Title, widget: string }
      - { name: description, label: Description, widget: text }
      - { name: date, label: Published date, widget: datetime }
      - { name: author, label: Author, widget: string }
      - { name: body, label: Body, widget: markdown }
```

From there, add author relations, tag relations, uploaded images, source JSON editing, CMS PR automation, and translation PR tasks in that order.

## References

- [Sveltia CMS Getting Started](https://sveltiacms.app/en/docs/start)
- [Sveltia CMS GitHub Backend](https://sveltiacms.app/en/docs/backends/github)
- [Sveltia CMS Internal Media Storage](https://sveltiacms.app/en/docs/media/internal)
- [Sveltia CMS Manual Initialization](https://sveltiacms.app/en/docs/api/initialization)
- [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)

## Summary

Sveltia CMS is easy to place under `public/admin`, but a production setup needs more than an admin page.

Decide the save branch, OAuth flow, media folders, source-language policy, translation workflow, and merge strategy. Once those are explicit, a static Astro site can stay lightweight while gaining a usable editing workflow.

For dynamic AI features, see [Adding an AI Chat to an Astro Site](/en/blog/astro-ai-contact-chat/). For translation automation, see the [GitHub Copilot blog translation pipeline](/en/blog/copilot-translation-pipeline/). The CMS is the content-update foundation that makes both workflows easier to operate.
