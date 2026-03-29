---
title: 'How to Run a 9-Language Blog by Publishing Just One Japanese Article'
description: 'A guide to the workflow that automatically generates Japanese + 8-language translated articles, runs builds, and handles auto-merging — all triggered just by updating a Japanese article in Pages CMS via GitHub Actions and GitHub Copilot.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
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
    - title: Auto-create Translation Issues
      description: GitHub Actions creates issues with the source path and target locales embedded.
      icon: i-lucide-ticket
    - title: Copilot Creates Translation PRs
      description: Upon receiving the issue, Copilot generates translation files and opens a translation PR.
      icon: i-lucide-git-pull-request
    - title: Build, Merge & Close Issue
      description: After a successful build, the PR is auto-merged and the parent translation issue is automatically closed.
      icon: i-lucide-check-check
compareTable:
  title: Manual vs. Automated Translation Workflow
  before:
    label: Manual Translation Workflow
    items:
      - Someone manually creates translation tasks after an article is published
      - Assignees are assigned per language
      - Builds and merge decisions are handled by humans
      - Parent issues are often forgotten and left open
  after:
    label: Automated Translation Workflow
    items:
      - A push to the Japanese article triggers the entire flow
      - Automatically assigned to Copilot
      - Translation PRs are auto-merged after a successful build
      - Parent issues are auto-closed after the merge
checklist:
  title: What You Need Before Getting Started
  items:
    - text: A content structure with Japanese as the translation source
    - text: A translation file layout rule like src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions with issues write permission
    - text: A COPILOT_AGENT_TOKEN that can call the Copilot assignment API
    - text: A stable build command like npm run build
faq:
  title: Frequently Asked Questions
  items:
    - question: Will pushing a Japanese article automatically create articles in other languages?
      answer: 'Yes. The current Acecore site supports 9 languages — `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` — so pushing a Japanese article can trigger the creation of translation issues for the remaining 8 languages, Copilot assignment, translation PR creation, build, auto-merge, and issue close. Even without translation files, each locale URL is served with a Japanese fallback, so you can publish first and replace with real translations later.'
    - question: Why create an issue first instead of opening a PR directly?
      answer: 'Because it lets you lock in the source path, target locale, and translation conditions in the issue. This makes re-running, reviewing history, and recovering from failures much easier.'
    - question: Isn't auto-merging risky?
      answer: 'Unconditional auto-merging is risky. By scoping it to translation PRs only — requiring that Copilot created the PR, the title starts with [translation], the build passes, and the PR is not a draft — you can keep it quite safe.'
---

To get straight to the point: with this site, publishing just one Japanese article in Pages CMS is enough to eventually have that article available in Japanese plus 8 other languages. GitHub Actions and GitHub Copilot handle translation issue creation, translation PR creation, building, auto-merging, and closing the parent issue.

The operator only needs to touch Japanese articles and author information on a day-to-day basis. Since you no longer need to manually file translation tasks or sort out PRs each time, this significantly reduces the burden of running a multilingual blog.

## Prerequisites for This Approach

This approach assumes the following infrastructure is already in place on the Astro side.

- 9-language routing (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- A fallback that serves Japanese content for pages without translations
- An operational setup where Japanese articles and author information can be updated via Pages CMS

For how to set up this infrastructure itself, see [Making an Astro 6 Site Support 9 Languages — Auto-translating 136 Blog Articles and a Multilingual Architecture](/blog/astro-i18n-blog-translation/). This article focuses solely on how to layer the Copilot auto-translation workflow on top of that.

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

## Step 2. Convert Japanese Article Pushes into Translation Issues

The next step is to use GitHub Actions to detect changes to Japanese articles and automatically create translation issues.

The minimum requirements are:

- Monitor pushes to `main`
- Only auto-create issues for `src/content/blog/*.md`
- Only create issues when the article body changes, not just frontmatter
- If an open issue with the same source path exists, update it rather than creating a new one
- Embed the source path as a marker in the issue body

Author information and tag definitions are translation targets, but don't auto-create issues on normal pushes. Running them only via `workflow_dispatch` when explicitly needed keeps unnecessary issues from piling up.

For example, including comments like this in the issue body makes it reusable in downstream automation.

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

Furthermore, by comparing only the Markdown body to decide when to create translation issues, you can avoid accidentally generating a flood of issues from minor tweaks like updating a publish date or a tag.

The important thing here is not to "create translations directly," but to **create an issue first**. By inserting an issue, the source path, target language, and translation conditions are locked in a form visible to both humans and AI.

## Step 3. Auto-Assign Translation Issues to Copilot

Just creating the issue still leaves manual work, so this is where you auto-assign Copilot.

There are 2 things to do.

1. Add `COPILOT_AGENT_TOKEN` as a repository secret
2. Call the assignment API after the issue is created

Conceptually, you patch the issue to set Copilot as the assignee.

```json
{
  "assignees": ["copilot-swe-agent[bot]"],
  "agent_assignment": {
    "target_repo": "OWNER/REPO",
    "base_branch": "main",
    "custom_instructions": "Translate the Japanese source article..."
  }
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

## Step 5. Auto-Close the Parent Translation Issue After Merge

The last piece that keeps operations clean is auto-closing the parent issue after a merge.

The approach is simple: for merged translation PRs, do the following.

1. Get the changed files of the PR
2. Also read the source path from the PR body
3. Search for open issues corresponding to the `translation-source:` marker
4. Add a comment and close

The reason to also look at the PR body's source path is that relying solely on the changed files of Copilot-created PRs can sometimes make source reverse-lookup unreliable. **Using both changed files and the PR body** keeps it stable.

## Notes

### Steering Copilot's PR and Issue Language Toward Japanese

If you want to stabilize Copilot's output language on the GitHub side, using repo-wide instructions is the most straightforward approach.

That means placing `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

With just this one file in place, the default language and context when Copilot coding agent creates issues and PRs becomes considerably more stable.

## Summary

The core of this setup is turning translation from "something humans request each time" into **a routine process subordinate to Japanese source pushes**.

Here's the flow one more time.

1. Write only the Japanese article
2. A push auto-creates translation issues
3. Auto-assign to Copilot
4. Build the translation PR and auto-merge it
5. Auto-close the parent issue

Once this is fully assembled, the feel from the operator's side is quite natural. **Once you push the Japanese article, the articles in other languages get created one by one on the GitHub side**.

Of course, in practice it goes through asynchronous steps — issue creation, Copilot execution, PR creation, build, and merge — so it doesn't all happen "instantly." But the operator no longer needs to manually file translation tasks or forget to close PRs each time.

This article itself is structured so that the Japanese version can be fed into this flow as the starting point. If you're running a multilingual site continuously, starting with roughly this level of automation is probably the right fit.
