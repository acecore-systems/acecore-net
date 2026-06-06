---
title: '只需发布一篇日语文章，即可运营9种语言博客的方法'
description: '本文介绍了一种工作流程：在 Pages CMS 中仅更新日语文章，即可通过 GitHub Actions 和 GitHub Copilot 自动生成日语 + 8种语言的翻译文章，并完成构建和自动合并。'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: /uploads/acecore-generated/blog-copilot-translation-pipeline.webp
callout:
  type: info
  title: 结论先行
  text: '使用当前的 Acecore 网站，只需将日语文章作为翻译源，即可通过 GitHub Actions 和 GitHub Copilot 自动化运营日语 + 8种语言的博客。'
processFigure:
  title: 从1篇日语文章到9种语言运营的流程
  steps:
    - title: 更新日语源文件
      description: 仅通过 Pages CMS 或 Markdown 编辑日语文章，并推送到 main 分支。
      icon: i-lucide-pencil-line
    - title: 直接创建翻译 PR 任务
      description: GitHub Actions 创建包含源路径和目标语言的 Copilot 任务。
      icon: i-lucide-git-branch
    - title: Copilot 创建翻译 PR
      description: 收到任务后，Copilot 生成翻译文件并提交翻译 PR。
      icon: i-lucide-git-pull-request
    - title: 构建并自动合并
      description: 构建成功后，满足条件的翻译 PR 将被自动合并。
      icon: i-lucide-check-check
compareTable:
  title: 手动与自动翻译工作流对比
  before:
    label: 手动翻译工作流
    items:
      - 文章发布后由人工创建翻译任务
      - 按语言分配负责人
      - 构建和合并决策也由人工完成
      - 重复任务和 PR 整理问题容易积累
  after:
    label: 自动翻译工作流
    items:
      - 推送日语文章即触发整个流程
      - 直接创建 Copilot 翻译 PR 任务
      - 翻译 PR 在构建成功后自动合并
      - 通过 PR body 中的标记防止重复创建
checklist:
  title: 开始前需要准备的内容
  items:
    - text: 以日语为翻译源的内容结构
    - text: 如 src/content/blog/{locale}/{slug}.md 的翻译文件布局规则
    - text: 具有 pull requests read 权限的 GitHub Actions
    - text: 能够调用 Copilot coding agent API 的 COPILOT_AGENT_TOKEN
    - text: 稳定的构建命令，如 npm run build
faq:
  title: 常见问题
  items:
    - question: 只需推送日语文章，其他语言的文章就会自动生成吗？
      answer: '是的。当前的 Acecore 网站支持9种语言 — `ja`、`en`、`zh-cn`、`es`、`pt`、`fr`、`ko`、`de`、`ru` — 因此推送日语文章可以触发为其余8种语言创建 Copilot 翻译 PR 任务、创建翻译 PR、构建和自动合并的完整流程。即使翻译文件尚不存在，每个语言的 URL 也会通过日语回退提供服务，因此可以先发布日语版，之后再替换为真正的翻译内容。'
    - question: 为什么直接创建 PR 任务而不经过 Issue？
      answer: '由于翻译工作的成果是 PR，直接将源路径、目标语言和翻译条件固定在 Copilot 任务的问题描述和 PR body 标记中，可以缩短流程。通过搜索带有该标记的 open PR，还可以防止同一源路径的重复创建。'
    - question: 自动合并不危险吗？
      answer: '无条件自动合并是危险的。通过将范围限定为仅翻译 PR — 要求 Copilot 创建的 PR、标题以 [translation] 开头、构建成功且非草稿 — 可以使其相当安全。'
---

直接说结论：在这个网站上，只需在 Pages CMS 中发布一篇日语文章，就能逐步让该文章以日语 + 8种其他语言的形式呈现。GitHub Actions 和 GitHub Copilot 负责处理翻译 PR 任务创建、翻译 PR 创建、构建和自动合并。

运营人员日常只需处理日语文章和作者信息。由于不再需要每次手动提交翻译任务或整理 PR，多语言博客的运营负担可以大幅减轻。

## 此方法的前提条件

此方法假设 Astro 侧已具备以下基础设施。

- 9种语言路由（ja, en, zh-cn, es, pt, fr, ko, de, ru）
- 对于没有翻译的页面，可以回退显示日语内容
- 可以通过 Pages CMS 更新日语文章和作者信息的运营设置

关于如何搭建这套基础设施，请参阅[将 Astro 6 网站支持9种语言 — 168篇博客文章的自动翻译与多语言架构](/blog/astro-i18n-blog-translation/)。本文仅聚焦于如何在此基础上叠加 Copilot 自动翻译工作流。

## 能实现什么

从运营角度来看，日常需要操作的界面只有2个。本文直接使用 Pages CMS 的界面，让**日常运营中需要操作哪些界面**一目了然。

![Pages CMS 日语博客列表界面](/uploads/pagescms-blog-ja-live-20260329.png)

第一个界面是 Pages CMS 的日语博客列表。在这里可以查看发布日期和作者信息，同时只添加或更新日语文章。关键是保持"只接触翻译源日语"的模式，无需每次都进入每种语言的编辑界面。

![Pages CMS 作者信息表单界面](/uploads/pagescms-authors-live-20260329.png)

第二个界面是作者信息表单。对于作者数据，只需在 CMS 中更新日语基础字段，翻译用的 `i18n` 字段由 GitHub 自动化流程处理，这样运营职责的分离就会非常清晰。

## 此方法最适合的场景

首先，以下类型的团队和网站特别适合使用此方法。

- 希望以日语作为翻译源
- 博客基于 Markdown 进行管理
- 每次手动提交翻译任务很麻烦
- 可以在一定程度上将翻译质量交给 AI
- 但希望阻止构建失败或保持草稿状态的 PR

反之，如果各语言有完全独立的编辑体制，其他工作流可能更合适。

## Step 1. 将日语文章固定为翻译源

首先需要决定的是"以哪个文件作为翻译源"。这里模糊不清会破坏自动化。

本文中所说的翻译源是指**最先编辑、作为各语言文章和派生数据基准的日语文件**。

在这套配置中，源文件和目标文件的划分如下。

- 博客文章翻译源：`src/content/blog/{slug}.md`
- 博客文章翻译目标：`src/content/blog/{locale}/{slug}.md`
- 作者信息翻译源：`src/content/authors/{authorId}.json`
- 作者信息翻译目标：`src/content/authors/{authorId}.json` 中的 `i18n` 字段
- 标签定义翻译源：`src/content/tags/{tagId}.json`
- 标签定义翻译目标：`src/content/tags/{tagId}.json` 中的 `i18n` 字段

目录结构大致如下，比较容易管理。

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

关键是**将翻译文件的 slug 与源日语文章的 slug 保持一致**。仅此一点就能轻松从源路径自动识别翻译目标。

在这个仓库中，即使翻译文件尚不存在，每个语言的 URL 也会通过日语回退生成。这意味着可以采用"先发布日语文章，之后让翻译 PR 跟进"的运营方式。

## Step 2. 将日语文章的推送转换为翻译 PR 任务

下一步是使用 GitHub Actions 检测日语文章的变更，并直接创建 Copilot 翻译 PR 任务。

最低要求如下。

- 监控对 `main` 分支的推送
- 仅将 `src/content/blog/*.md` 作为常规自动创建任务的目标
- 只在文章正文发生变化时创建任务，而不是仅 frontmatter 变化时
- 如果存在相同源路径的 open PR，则不创建新任务
- 在 Copilot 任务和 PR body 中嵌入源路径作为标记

作者信息和标签定义虽然也是翻译目标，但在普通推送时不自动创建任务。仅在必要时通过 `workflow_dispatch` 明确触发，可以避免不必要的 PR 积累。

例如，在 PR body 中加入这样的注释，可以在后续重复检测中复用。

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

workflow 侧的基本过滤配置如下。

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
```

此外，通过仅比较 Markdown 正文来决定是否创建翻译 PR 任务，可以避免因更新发布日期或标签等小修改而大量生成翻译 PR 的问题。

这里重要的是将翻译条件**固定在 PR 任务输入和 PR body 标记中**。即使不经过 Issue，也可以将源路径、目标语言和翻译条件传递给 Copilot，并通过搜索 open PR 来避免同一源路径的重复创建。

## Step 3. 通过 Copilot coding agent API 创建 PR 任务

在 GitHub Actions 侧，检测到变更后，向 Copilot coding agent API 发送任务。

需要做2件事。

1. 将 `COPILOT_AGENT_TOKEN` 添加为仓库 secret
2. 针对每个变更的源路径调用 Copilot job API

概念上是将标题和问题描述传递给 Copilot job API。

```json
{
  "title": "[translation] Translate my-post.md",
  "problem_statement": "Translate src/content/blog/my-post.md into all requested locales...",
  "event_type": "translation-pr"
}
```

此时，将常规自动创建范围仅限于文章，仅在必要时通过手动 dispatch 处理作者信息和标签定义，可以使运营更加稳定。明确说明规则 — 作者信息的 `i18n` 字段位于 `src/content/authors/{authorId}.json`，标签定义的 `i18n.name` 字段位于 `src/content/tags/{tagId}.json`，文章则在 `src/content/blog/{locale}/` 下创建同名文件 — 可以减少错误。

## Step 4. 构建翻译 PR 并自动合并

这里不应无条件自动化。建议仅将满足以下所有条件的 PR 作为合并目标。

- 由 Copilot 创建的 PR
- 标题以 `[translation]` 开头
- 目标为 `main` 分支
- 非草稿状态
- 构建成功

在这套配置中，流程分为2个阶段。

1. `Translation PR Build`
2. `Merge Translation PR`

在 PR 变为 ready for review 时构建 PR head，成功后直接进行 squash merge。由于不依赖 GitHub 的分支保护，即使在小型仓库中也易于管理。

### 自动合并应强制执行的条件

添加自动合并时，以下是最低推荐条件。

- 排除非翻译 PR
- 构建失败时停止
- 草稿状态时停止
- 排除非 Copilot 创建的 PR

有了这4个条件，就可以大大避免将普通开发 PR 纳入自动合并范围的问题。

## Step 5. 通过 PR body 标记防止重复创建

不经过 Issue 时，重复控制移到 PR 侧。

方法很简单，在创建任务前执行以下操作。

1. 从源路径生成 `translation-source:` 标记
2. 通过 GitHub 搜索具有相同标记的 open PR
3. 如果存在 open PR，则不创建任务
4. 如果不存在 open PR，则创建 Copilot 翻译 PR 任务

在 PR body 中嵌入源路径的原因是，仅查看翻译 PR 的变更文件，很难准确反向查找到原始日语文件。**将源路径作为标记明确写出**，可以避免为同一篇文章创建多个翻译 PR。

## 补充说明

### 将 Copilot 创建的 PR 的语言引导为日语

如果希望在 GitHub 侧稳定 Copilot 的输出语言，使用仓库级别的指令是最直接的方法。

即，放置 `.github/copilot-instructions.md` 文件。

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

仅凭这一个文件，Copilot coding agent 在创建 PR 时的默认语言和上下文就会相当稳定。

## 总结

这套配置的核心是将翻译从"每次都需要人工请求的工作"转变为**从属于日语源文件推送的例行处理**。

再次总结流程如下。

1. 只撰写日语文章
2. 推送时直接创建翻译 PR 任务
3. Copilot 创建翻译 PR
4. 构建翻译 PR 并自动合并
5. 通过 PR body 标记防止重复创建

完成这套配置后，从运营角度来看感觉相当自然。**只需推送日语文章，其他语言的文章就会在 GitHub 侧依次生成**。

当然，实际上会经历任务创建、PR 创建、构建和合并等异步步骤，所以并非"瞬间全部完成"。但是，运营人员不再需要每次手动提交翻译任务或整理 PR。

本文本身也构建成可以以日语版为基准流入这一流程的结构。如果要持续运营多语言网站，首先从这种程度的自动化开始是最合适的。
