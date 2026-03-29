---
title: 'How to Run a 9-Language Blog by Publishing Just One Japanese Article'
description: 'A guide on updating only Japanese articles in Pages CMS and automatically generating translations in Japanese + 8 languages using GitHub Actions and GitHub Copilot, including building and auto-merging.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Bottom Line First
  text: 'With the current Acecore site, you can automate Japanese + 8-language blog operations using GitHub Actions and GitHub Copilot, with Japanese articles as the translation source.'
processFigure:
  title: Flow from 1 Japanese Article to 9-Language Operation
  steps:
    - title: Update Japanese Source
      description: Edit only the Japanese article via Pages CMS or Markdown and push to main.
      icon: i-lucide-pencil-line
    - title: Auto-Create Translation Issues
      description: GitHub Actions creates issues with the source path and target locales embedded.
      icon: i-lucide-ticket
    - title: Copilot Creates Translation PRs
      description: Upon receiving the issue, Copilot generates translation files and opens a translation PR.
      icon: i-lucide-git-pull-request
    - title: Build, Merge, and Close Issues
      description: After a successful build, auto-merge runs and the parent translation issue is automatically closed.
      icon: i-lucide-check-check
compareTable:
  title: Manual vs. Automated Operations
  before:
    label: Manual Translation Operations
    items:
      - Someone manually creates translation tasks after publishing an article
      - Assign a person per language
      - Build and merge decisions are also manual
      - Parent issues are easily left unclosed
  after:
    label: Automated Translation Operations
    items:
      - A push of the Japanese article triggers everything
      - Automatically assigned to Copilot
      - Translation PRs are auto-merged after a successful build
      - Parent issues are also auto-closed after merge
checklist:
  title: Prerequisites Before Getting Started
  items:
    - text: Content structure using Japanese as the translation source
    - text: A translation file placement rule like src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions with issues write permission
    - text: COPILOT_AGENT_TOKEN that can call the Copilot assignment API
    - text: A stable build command like npm run build
faq:
  title: Frequently Asked Questions
  items:
    - question: If I push a Japanese article, will articles in other languages be created automatically?
      answer: 'Yes. The current Acecore site supports 9 languages — ja, en, zh-cn, es, pt, fr, ko, de, ru — so pushing a Japanese article triggers translation issue creation for the remaining 8 languages, Copilot assignment, translation PR creation, build, auto-merge, and issue closure. Even if no translation files exist yet, each locale URL can still be served with Japanese as a fallback, so you can publish first and replace with real translations later.'
    - question: Why create an issue instead of creating a PR directly?
      answer: 'Because you can lock in the source path, target locales, and translation conditions in the issue. When a diff appears later, re-running, checking history, and recovering from failures become much easier.'
    - question: Is auto-merging safe?
      answer: 'Unconditional auto-merging is dangerous. By restricting to translation PRs only and requiring all of: created by Copilot, title starting with [translation], successful build, and not a draft — you can make it quite safe.'
---

To put it simply, on this site you can publish a Japanese article once via Pages CMS and have blog posts in Japanese + 8 other languages lined up sequentially. GitHub Actions and GitHub Copilot handle translation issue creation, translation PR creation, building, auto-merging, and closing parent issues.

Day-to-day operations only require touching Japanese articles and author information. Since you no longer need to manually file translation tasks or tidy up PRs every time, the overhead of running a multilingual blog is significantly reduced.

## Prerequisites for This Approach

As a prerequisite, this approach assumes you already have the following infrastructure on the Astro side.

- 9-language routing (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- Fallback to display Japanese on pages without a translation
- Operations to update Japanese articles and author information from Pages CMS

How to build the foundation itself is covered in [Making an Astro 6 Site Support 9 Languages — Auto-Translating 136 Blog Posts and Multilingual Architecture](/blog/astro-i18n-blog-translation/). This article focuses only on how to layer Copilot automated translation operations on top of that.

## What You Can Do

From the operations side, there are normally two screens you interact with. This time we use the Pages CMS screen as-is, making it immediately clear **where to interact in day-to-day operations**.

![Pages CMS Japanese blog listing screen](/uploads/pagescms-blog-ja-live-20260329.png)

The first screen is the Pages CMS Japanese blog listing. Here you view publication dates and authors while adding and updating only Japanese articles. The key is to orient operations toward **only touching the Japanese translation source**, without having to enter the editing screen for multiple languages every time.

![Pages CMS author information form screen](/uploads/pagescms-authors-live-20260329.png)

The second screen is the author information form. By updating only Japanese-based fields in the CMS for author data and leaving translation `i18n` to the GitHub automation flow, the separation of operational responsibilities becomes quite clean.

## When This Approach Works Best

As a premise, this approach is especially effective for teams or sites like the following.

- Want to use Japanese as the translation source
- Blog is managed in Markdown
- Manually filing translation tasks every time is cumbersome
- Willing to rely on AI for translation quality to some degree
- But want to stop PRs that fail to build or remain as drafts

Conversely, if each language has a completely independent editing structure, a different approach may be more suitable.

## Step 1. Lock the Translation Source to Japanese Articles

The first thing to decide is "which file to use as the translation source." If this is ambiguous, automation breaks.

The "translation source" in this article means **the Japanese file that is edited first and serves as the standard for articles and derived data in each language**.

In this configuration, the following are divided into translation source and translation target.

- Blog article translation source: `src/content/blog/{slug}.md`
- Blog article translation target: `src/content/blog/{locale}/{slug}.md`
- Author information translation source: `src/data/authors.json`
- Author information translation target: `i18n` in `src/data/authors.json`

The directory structure is easier to handle if it looks roughly like this.

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

The key is to **align the slug of translation files with the original Japanese article**. This alone makes it easy to automatically identify the translation target from the source path.

In this repo, even if translation files don't yet exist, the locale URLs themselves are generated with Japanese as a fallback. This means you can operate with "publish the Japanese article first, then have translation PRs catch up later."

## Step 2. Convert Japanese Article Pushes into Translation Issues

The next step is to detect changes to Japanese articles with GitHub Actions and automatically create translation issues.

At minimum, you need the following.

- Monitor pushes to `main`
- Target only `src/content/blog/*.md` and `src/data/authors.json`
- Update an existing open issue with the same source path rather than creating a new one
- Embed the source path as a marker in the issue body

For example, inserting a comment like this in the issue body allows reuse in downstream automation.

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
      - src/data/authors.json
```

What's important here is not "directly creating translations" but **creating an issue first**. By inserting an issue step, you can lock in the source path, target languages, and translation conditions in a form visible to both humans and AI.

## Step 3. Auto-Assign Translation Issues to Copilot

Creating just an issue still leaves manual work, so here you auto-assign to Copilot.

There are two things to do.

1. Add `COPILOT_AGENT_TOKEN` to repository secrets
2. Call the assignment API after issue creation

Conceptually, you patch the issue and set Copilot as the assignee.

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

At this point, keeping the `custom_instructions` separate for articles vs. author information stabilizes accuracy. Specifying that author information should only touch `i18n` in `src/data/authors.json`, and that articles should create a file with the same name in `src/content/blog/{locale}/`, reduces mistakes.

## Step 4. Build Translation PRs and Auto-Merge

This part is safer if you don't make it unconditional automation. The recommendation is to only merge PRs that satisfy all of the following conditions.

- PR was created by Copilot
- Title starts with `[translation]`
- Targeting `main`
- Not a draft
- Build succeeded

In this configuration, it's split into two stages.

1. `Translation PR Build`
2. `Merge Translation PR`

When a PR becomes ready for review, build its head, and if successful, squash merge it. Since this doesn't depend on GitHub branch protection, it's easy to handle even for small repos.

### Conditions to Restrict for Auto-Merge

When adding auto-merge, the following conditions are recommended at minimum.

- Exclude anything other than translation PRs
- Stop if build fails
- Stop while in draft
- Exclude PRs created by anyone other than Copilot

With these four in place, you can mostly avoid accidents where normal development PRs get swept in.

## Step 5. Auto-Close Parent Translation Issues After Merge

The last thing to add that makes operations clean is auto-closing parent issues.

The method is simple — for merged translation PRs, do the following.

1. Get the changed files in the PR
2. Read the source path in the PR body
3. Search for open issues corresponding to the `translation-source:` marker
4. Add a comment and close

The reason to also look at the source path in the PR body is that, depending on the situation, looking only at the changed files of PRs created by Copilot can make reverse-lookup of the source weak. **Using both changed files and the PR body** gives stable results.

## Supplementary Notes

### Steering Copilot's PR and Issue Text Toward Japanese

If you want to stabilize Copilot's output language on the GitHub side, using repo-wide instructions is the most straightforward approach.

Simply place a `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

With just this one file, the default language and context when Copilot coding agent creates issues and PRs stabilizes considerably.

## Summary

The key to this configuration is turning translation from "something people ask for each time" into **a routine process dependent on pushing the Japanese source**.

Here's the flow one more time.

1. Write only the Japanese article
2. Push automatically creates a translation issue
3. Auto-assign to Copilot
4. Build the translation PR and auto-merge
5. Auto-close the parent issue too

Once you have this in place, the operational feel is quite straightforward. **Just push a Japanese article, and articles in other languages will be completed in sequence on the GitHub side**.

Of course, in practice the asynchronous flow of issue creation, Copilot execution, PR creation, build, and merge takes time, so it doesn't all happen "instantly." However, operations personnel no longer need to manually file translation tasks every time or forget to close PRs.

This article itself is structured so it can be fed into this flow with the Japanese version as the base. If you're continuously operating a multilingual site, starting with this level of automation is probably just right.
