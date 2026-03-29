---
title: '只需发布一篇日语文章即可运营9语言博客的方法'
description: '介绍如何在Pages CMS中只更新日语文章，利用GitHub Actions和GitHub Copilot自动生成日语+8种语言的翻译文章，并完成构建和自动合并的操作流程。'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: 先说结论
  text: '使用当前的Acecore网站，可以以日语文章为翻译源，通过GitHub Actions和GitHub Copilot自动化运营日语+8种语言的博客。'
processFigure:
  title: 从1篇日语文章到9语言运营的流程
  steps:
    - title: 更新日语源文件
      description: 通过Pages CMS或Markdown只编辑日语文章并推送到main分支。
      icon: i-lucide-pencil-line
    - title: 自动创建翻译Issue
      description: GitHub Actions创建包含源路径和目标语言的Issue。
      icon: i-lucide-ticket
    - title: Copilot创建翻译PR
      description: 收到Issue后生成翻译文件并创建翻译PR。
      icon: i-lucide-git-pull-request
    - title: 构建、合并、关闭Issue
      description: 构建成功后自动合并，并自动关闭父级翻译Issue。
      icon: i-lucide-check-check
compareTable:
  title: 手动运营与自动运营的比较
  before:
    label: 手动翻译运营
    items:
      - 文章发布后由人工创建翻译任务
      - 按语言分配负责人
      - 构建和合并决策也由人工进行
      - 容易出现父Issue未关闭的情况
  after:
    label: 自动翻译运营
    items:
      - 以日语文章的推送为起点
      - 自动分配给Copilot
      - 翻译PR在构建成功后自动合并
      - 父Issue在合并后也自动关闭
checklist:
  title: 导入前需要准备的事项
  items:
    - text: 以日语为翻译源的内容结构
    - text: 类似src/content/blog/{locale}/{slug}.md的翻译文件放置规则
    - text: 具有issues写入权限的GitHub Actions
    - text: 能够调用Copilot分配API的COPILOT_AGENT_TOKEN
    - text: 类似npm run build的稳定构建命令
faq:
  title: 常见问题
  items:
    - question: 只要推送日语文章，其他语言的文章也会自动创建吗？
      answer: '是的。当前Acecore网站支持ja、en、zh-cn、es、pt、fr、ko、de、ru共9种语言，以日语文章的推送为起点，可以自动完成其余8种语言的翻译Issue创建、Copilot分配、翻译PR创建、构建、自动合并和Issue关闭等流程。即使翻译文件还不存在，各语言的URL也可以通过日语回退来提供，因此可以先发布再逐步替换为真实翻译。'
    - question: 为什么不直接创建PR，而要先创建Issue？
      answer: '因为可以在Issue中固定源路径、目标语言和翻译条件。当出现差异时，重新执行、查看历史和失败恢复都会变得更加容易。'
    - question: 自动合并安全吗？
      answer: '无条件自动合并是危险的。通过将目标限制为仅翻译PR，并要求满足：由Copilot创建、标题以[translation]开头、构建成功、非草稿状态等所有条件，可以达到相当安全的水平。'
---

简而言之，在本网站中，只需通过Pages CMS发布一篇日语文章，就能依次准备好日语+8种语言的博客文章。GitHub Actions和GitHub Copilot负责处理翻译Issue创建、翻译PR创建、构建、自动合并和父Issue关闭等全套流程。

运营人员日常只需接触日语文章和作者信息。由于不再需要每次手动创建翻译任务或整理PR，多语言博客运营的负担大幅减轻。

## 这种方法的前提

作为前提，这种方法假设Astro端已经具备以下基础设施。

- 9语言路由（ja、en、zh-cn、es、pt、fr、ko、de、ru）
- 没有翻译的页面也能显示日语的回退机制
- 可以从Pages CMS更新日语文章和作者信息的运营体系

关于如何搭建基础本身，请参阅[将Astro 6网站改造为9语言支持——136篇博客文章的自动翻译与多语言架构](/blog/astro-i18n-blog-translation/)。本文只聚焦于如何在此基础上搭建Copilot自动翻译运营体系。

## 能做什么

从运营角度来看，日常接触的界面只有以下两个。这次直接使用Pages CMS的界面，使**日常运营中需要操作的位置**一目了然。

![Pages CMS的日语博客列表界面](/uploads/pagescms-blog-ja-live-20260329.png)

第一个界面是Pages CMS的日语博客列表。在这里查看发布日期和作者的同时，只添加和更新日语文章。不必每次都进入多语言编辑界面，关键在于将运营方式调整为**只操作作为翻译源的日语**。

![Pages CMS的作者信息表单界面](/uploads/pagescms-authors-live-20260329.png)

第二个界面是作者信息表单。对于作者数据，也只在CMS中更新基于日语的项目，将翻译用的`i18n`交给GitHub端的自动化流程处理，这样运营职责分离就会非常清晰。

## 适用场景

首先，这种方法对以下类型的团队或网站特别有效。

- 希望以日语为翻译源
- 博客基于Markdown管理
- 每次手动创建翻译任务很麻烦
- 在一定程度上愿意将翻译质量交给AI
- 但希望阻止构建失败或处于草稿状态的PR

相反，如果每种语言都有完全独立的编辑体制，其他运营方式可能更合适。

## Step 1. 将翻译源固定为日语文章

首先需要决定的是"以哪个文件为翻译源"。如果这一点不明确，自动化就会崩溃。

本文所说的翻译源，是指**首先编辑的、成为各语言文章和派生数据基准的日语文件**。

在本次配置中，翻译源和翻译目标的划分如下。

- 博客文章翻译源：`src/content/blog/{slug}.md`
- 博客文章翻译目标：`src/content/blog/{locale}/{slug}.md`
- 作者信息翻译源：`src/data/authors.json`
- 作者信息翻译目标：`src/data/authors.json`中的`i18n`

目录结构大致如下会比较容易处理。

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

重要的是，**将翻译文件的slug与原始日语文章对齐**。仅此一点就能轻松地从源路径自动识别翻译目标。

在本仓库中，即使翻译文件还不存在，各语言的URL本身也会通过日语回退生成。这意味着可以采用"先发布日语文章，然后让翻译PR赶上来"的运营方式。

## Step 2. 将日语文章的推送转换为翻译Issue

接下来要做的是用GitHub Actions检测日语文章的变更，并自动创建翻译Issue。

最低限度需要以下内容。

- 监控推送到`main`的操作
- 只针对`src/content/blog/*.md`和`src/data/authors.json`
- 如果存在相同源路径的open issue，则更新而不是新建
- 在Issue正文中嵌入源路径作为标记

例如，在issue正文中插入如下注释，可以在后续自动化中重用。

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

workflow端的基本筛选如下。

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
      - src/data/authors.json
```

这里重要的是不直接创建翻译，而是**先创建Issue**。通过插入Issue这个步骤，可以将源路径、目标语言和翻译条件以人和AI都能看到的形式固定下来。

## Step 3. 将翻译Issue自动分配给Copilot

仅创建Issue还会留下手动工作，因此在这里将其自动分配给Copilot。

需要做两件事。

1. 将`COPILOT_AGENT_TOKEN`添加到repository secret
2. Issue创建后调用分配API

概念上是通过patch issue将Copilot设置为assignee。

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

此时，为文章和作者信息分别设置不同的`custom_instructions`可以稳定精度。明确指定作者信息只操作`src/data/authors.json`中的`i18n`，文章则在`src/content/blog/{locale}/`中创建同名文件，可以减少错误。

## Step 4. 构建翻译PR并自动合并

这部分最好不要做成无条件自动化。推荐的做法是只合并满足以下所有条件的PR。

- 由Copilot创建的PR
- 标题以`[translation]`开头
- 面向`main`分支
- 不是草稿
- 构建成功

在本次配置中分为两个阶段。

1. `Translation PR Build`
2. `Merge Translation PR`

在PR变为ready for review时构建PR head，成功后直接进行squash merge。由于不依赖GitHub的分支保护，即使是小型仓库也很容易处理。

### 自动合并应限制的条件

添加自动合并时，以下条件是最低推荐要求。

- 非翻译PR不在范围内
- 构建失败则停止
- 草稿期间停止
- 非Copilot创建的PR不在范围内

有了这4个条件，就能在很大程度上避免将普通开发PR也卷入其中的事故。

## Step 5. 合并后自动关闭父级翻译Issue

最后加入后能使运营更整洁的是父Issue的自动关闭。

方法很简单，对已合并的翻译PR执行以下操作。

1. 获取PR的changed files
2. 读取PR正文中的源路径
3. 搜索与`translation-source:`标记对应的open issue
4. 添加评论并关闭

同时查看PR正文中源路径的原因是，仅看Copilot创建的PR的changed files，在某些情况下源的反向查找会比较弱。**同时使用changed files和PR正文**可以获得稳定的结果。

## 补充说明

### 将Copilot创建的PR和Issue内容引导为日语

如果想在GitHub端稳定Copilot的输出语言，使用repo-wide instructions是最直接的方法。

只需放置`.github/copilot-instructions.md`文件。

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

只需这一个文件，就能在很大程度上稳定Copilot coding agent创建issue和PR时的默认语言和上下文。

## 总结

这种配置的核心是，将翻译从"人每次都要拜托的工作"转变为**依附于日语源推送的例行处理**。

再次总结流程如下。

1. 只撰写日语文章
2. 推送自动创建翻译Issue
3. 自动分配给Copilot
4. 构建翻译PR并自动合并
5. 自动关闭父Issue

做到这一步，从运营角度来看感觉非常顺畅。**只要推送日语文章，其他语言的文章就会在GitHub端依次完成**。

当然，实际上需要经历Issue创建、Copilot执行、PR创建、构建、合并这个异步流程，所以"瞬间全部完成"是不可能的。但运营人员不再需要每次手动创建翻译任务或忘记关闭PR了。

本文本身也被构建为可以以日语版为基准流入这个流程。如果要持续运营多语言网站，从这个级别的自动化开始应该是恰到好处的。
