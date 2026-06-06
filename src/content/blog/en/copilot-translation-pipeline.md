---
title: 'How to Run a 9-Language Blog by Publishing Just One Japanese Article'
description: 'A guide to the workflow that automatically generates Japanese + 8-language translated articles, runs builds, and handles auto-merging — all triggered just by updating a Japanese article in Pages CMS via GitHub Actions and GitHub Copilot.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: /uploads/acecore-generated/i18n-localization-workbench.webp
callout:
  type: info
  title: Bottom Line First
  text: 'With the current Acecore site, you can automate a Japanese + 8-language blog operation using GitHub Actions and GitHub Copilot, treating Japanese articles as the source of truth.'
processFigure:
  title: The Flow from 1 Japanese Article to 9-Language Operation
  steps:
    - title: Update the Japanese Source
      description: Edit only the Japanese article via Pages CMS or Markdown and push it to main.
      icon: i-lucide-pencil-line
    - title: Directly Create a Translation PR Task
      description: GitHub Actions creates a Copilot task with the source path and target locales embedded.
      icon: i-lucide-git-branch
    - title: Copilot Creates Translation PRs
      description: Upon receiving the task, Copilot generates translation files and opens a translation PR.
      icon: i-lucide-git-pull-request
    - title: Build & Auto-Merge
      description: After a successful build, the translation PR that meets all conditions is auto-merged.
      icon: i-lucide-check-check
compareTable:
  title: Manual vs. Automated Translation Workflow
  before:
    label: Manual Translation Workflow
    items:
      - Someone manually creates translation tasks after an article is published
      - Assignees are assigned per language
      - Builds and merge decisions are handled by humans
      - Duplicate tasks and PR cleanup tend to pile up
  after:
    label: Automated Translation Workflow
    items:
      - A push to the Japanese article triggers the entire flow
      - A Copilot translation PR task is created directly
      - Translation PRs are auto-merged after a successful build
      - Duplicate creation is prevented with a marker in the PR body
checklist:
  title: What You Need Before Getting Started
  items:
    - text: A content structure with Japanese as the translation source
    - text: A translation file layout rule like src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions with pull requests read permission
    - text: A COPILOT_AGENT_TOKEN that can call the Copilot coding agent API
    - text: A stable build command like npm run build
faq:
  title: Frequently Asked Questions
  items:
    - question: Will pushing a Japanese article automatically create articles in other languages?
      answer: 'Yes. The current Acecore site supports 9 languages — `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` — so pushing a Japanese article can trigger Copilot translation PR task creation for the remaining 8 languages, translation PR creation, build, and auto-merge. Even without translation files, each locale URL is served with a Japanese fallback, so you can publish first and replace with real translations later.'
    - question: Why create a PR task directly without going through an issue?
      answer: "Since the output of translation work is a PR, fixing the source path, target locale, and translation conditions directly in the Copilot task's problem statement and PR body marker makes the flow shorter. By searching open PRs with the marker, you can also prevent duplicate creation for the same source path."
    - question: Isn't auto-merging risky?
      answer: 'Unconditional auto-merging is risky. By scoping it to translation PRs only — requiring that Copilot created the PR, the title starts with [translation], the build passes, and the PR is not a draft — you can keep it quite safe.'
---

To get straight to the point: with this site, publishing just one Japanese article in Pages CMS is enough to eventually have that article available in Japanese plus 8 other languages. GitHub Actions and GitHub Copilot handle translation PR task creation, translation PR creation, building, and auto-merging.

The operator only needs to touch Japanese articles and author information on a day-to-day basis. Since you no longer need to manually file translation tasks or sort out PRs each time, this significantly reduces the burden of running a multilingual blog.

## Prerequisites for This Approach

This approach assumes the following infrastructure is already in place on the Astro side.

- 9-language routing (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- A fallback that serves Japanese content for pages without translations
- An operational setup where Japanese articles and author information can be updated via Pages CMS

For how to set up this infrastructure itself, see [Making an Astro 6 Site Support 9 Languages — Auto-translating 168 Blog Articles and a Multilingual Architecture](/blog/astro-i18n-blog-translation/). This article focuses solely on how to layer the Copilot auto-translation workflow on top of that.

## What This Enables

From the operator's perspective, there are only 2 screens you regularly interact with. In this article, we use the Pages CMS screens as-is, making it immediately clear **which screens are touched in day-to-day operations**.

![Pages CMS Japanese blog list screen](/uploads/pagescms-blog-ja-live-20260329.png)

The first screen is the Pages CMS Japanese blog list. Here you can see publication dates and author information while adding or updating only Japanese articles. The key is to stay in "only touch the source Japanese" mode, without having to dive into editing screens for each language every time.

![Pages CMS author information form screen](/uploads/pagescms-authors-live-20260329.png)

The second screen is the author information form. By updating only the Japanese-based fields in the CMS for author data and letting the automated GitHub flow handle the `i18n` for translations, the separation of operational responsibilities becomes quite clean.

## Cases Where This Approach Works Best

As a prerequisite, this is especially effective for teams and sites like the following.

- You want Japanese to be the translation source
- Your blog is managed in Markdown
- Manually filing translation tasks every time is a hassle
- You're comfortable with AI handling a fair degree of translation quality
- But you want to stop PRs from failing builds or remaining as drafts

Conversely, if you have a fully independent editorial setup per language, a different workflow may be a better fit.

## Step 1. Lock in Japanese Articles as the Translation Source

The first thing to decide is "which file is the translation source." Ambiguity here will break your automation.

The "translation source" in this article refers to **the Japanese file that is edited first and serves as the baseline for articles and derived data in each language**.

In this setup, the source and target are split as follows.

- Blog article source: `src/content/blog/{slug}.md`
- Blog article target: `src/content/blog/{locale}/{slug}.md`
- Author info source: `src/content/authors/{authorId}.json`
- Author info target: the `i18n` field in `src/content/authors/{authorId}.json`
- Tag definition source: `src/content/tags/{tagId}.json`
- Tag definition target: the `i18n` field in `src/content/tags/{tagId}.json`

A directory structure roughly like the following is easy to work with.

```text
src/content/blog/
  my-post.md
  another-post.md
  en/
    my-post.md
  zh-cn/
    my-post.md
  fr/
    my-post.md
```

The key is to **keep the translation file's slug aligned with the source Japanese article's slug**. This alone makes it easy to automatically identify the translation target from the source path.

In this repo, even when translation files don't yet exist, the URL for each locale is still generated using a Japanese fallback. This means you can operate in a "publish the Japanese article first, and let translation PRs catch up afterward" mode.

## Step 2. Convert Japanese Article Pushes into Translation PR Tasks

The next step is to use GitHub Actions to detect changes to Japanese articles and directly create Copilot translation PR tasks.

The minimum requirements are:

- Monitor pushes to `main`
- Only auto-create tasks for `src/content/blog/*.md`
- Only create tasks when the article body changes, not just frontmatter
- If an open PR with the same source path exists, don't create a new one
- Embed the source path as a marker in the Copilot task and PR body

Author information and tag definitions are translation targets, but don't auto-create tasks on normal pushes. Running them only via `workflow_dispatch` when explicitly needed keeps unnecessary PRs from piling up.

For example, including comments like this in the PR body makes it reusable for duplicate detection downstream.

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

The basic filtering on the workflow side looks like this.

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
```

Furthermore, by comparing only the Markdown body to decide when to create translation PR tasks, you can avoid accidentally generating a flood of PRs from minor tweaks like updating a publish date or a tag.

The important thing here is to **fix the translation conditions in the PR task input and the PR body marker**. Even without going through an issue, you can pass the source path, target language, and translation conditions to Copilot, and use open PR search to avoid duplicates for the same source path.

## Step 3. Create PR Tasks via the Copilot Coding Agent API

On the GitHub Actions side, after detecting a change, you fire a task at the Copilot coding agent API.

There are 2 things to do.

1. Add `COPILOT_AGENT_TOKEN` as a repository secret
2. Call the Copilot job API for each changed source path

Conceptually, you pass a title and problem statement to the Copilot job API.

```json
{
  "title": "[translation] Translate my-post.md",
  "problem_statement": "Translate src/content/blog/my-post.md into all requested locales...",
  "event_type": "translation-pr"
}
```

At this point, keep the regular auto-creation scoped to articles only, and run author info and tag definitions via manual dispatch only when needed, to keep operations stable. Explicitly stating the rules — `i18n` fields in `src/content/authors/{authorId}.json` for author info, `i18n.name` in `src/content/tags/{tagId}.json` for tag definitions, and same-named files under `src/content/blog/{locale}/` for articles — reduces mistakes.

## Step 4. Build Translation PRs and Auto-Merge Them

Unconditional automation is not safe here. The recommendation is to make only PRs that satisfy all of the following conditions eligible for merge.

- The PR was created by Copilot
- The title starts with `[translation]`
- It targets `main`
- It is not a draft
- The build succeeded

In this setup, the process is split into 2 stages.

1. `Translation PR Build`
2. `Merge Translation PR`

The PR head is built when it becomes ready for review, and if it succeeds, it is squash-merged immediately. Since it doesn't depend on GitHub's branch protection, it's easy to manage even in small repos.

### Conditions to Enforce for Auto-Merge

When adding auto-merge, these are the minimum recommended conditions.

- Exclude anything that isn't a translation PR
- Stop on build failure
- Stop while it's a draft
- Exclude PRs not created by Copilot

With these 4 conditions in place, you can largely avoid the accident of catching normal development PRs in the auto-merge net.

## Step 5. Prevent Duplicates with PR Body Markers

When not going through issues, duplicate control moves to the PR side.

The approach is simple: before creating a task, do the following.

1. Derive a `translation-source:` marker from the source path
2. Search GitHub for open PRs with that same marker
3. If an open PR exists, don't create a task
4. If no open PR exists, create a Copilot translation PR task

The reason to embed the source path in the PR body is that looking only at the changed files of a translation PR makes it hard to reliably reverse-lookup the original Japanese file. **Making the source path explicit as a marker** keeps you from creating multiple translation PRs for the same article.

## Notes

### Steering Copilot's Output Language Toward Japanese

If you want to stabilize Copilot's output language on the GitHub side, using repo-wide instructions is the most straightforward approach.

That means placing `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

With just this one file in place, the default language and context when Copilot coding agent creates PRs becomes considerably more stable.

## Summary

The core of this setup is turning translation from "something humans request each time" into **a routine process subordinate to Japanese source pushes**.

Here's the flow one more time.

1. Write only the Japanese article
2. A push directly creates a translation PR task
3. Copilot creates a translation PR
4. Build the translation PR and auto-merge it
5. Prevent duplicates with PR body markers

Once this is fully assembled, the feel from the operator's side is quite natural. **Once you push the Japanese article, the articles in other languages get created one by one on the GitHub side**.

Of course, in practice it goes through asynchronous steps — task creation, PR creation, build, and merge — so it doesn't all happen "instantly." But the operator no longer needs to manually file translation tasks or sort out PRs each time.

This article itself is structured so that the Japanese version can be fed into this flow as the starting point. If you're running a multilingual site continuously, starting with roughly this level of automation is probably the right fit.
