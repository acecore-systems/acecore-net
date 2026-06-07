---
title: '用 Astro + Cloudflare 逐步扩展官网功能的整体设计'
description: '整理 Acecore 官网如何以 Astro 和 Cloudflare Pages 为基础，组合咨询 AI、Sveltia CMS、多语言博客、服务 CTA、Markdown 安全渲染和 Cloudflare 评论功能。'
date: 2026-06-07T19:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'Astro', 'Cloudflare', 'Webサイト', 'AI', 'CMS']
image: /uploads/acecore-generated/work-acecore-net-website.webp
callout:
  type: tip
  title: 添加功能前先划清边界
  text: 'AI 聊天、CMS、多语言和评论功能各自都很有用，但放在同一个官网里时，需要先决定职责边界。Astro 生成静态 HTML，Cloudflare 负责发布和小型 API，GitHub PR 保留变更记录。'
processFigure:
  eyebrow: Site Architecture
  title: 官网功能扩展的层次
  description: 默认保持静态，只在必要位置加入动态处理。
  variant: inline
  steps:
    - title: 发布
      description: Astro 生成静态 HTML，Cloudflare Pages 负责发布。
      icon: i-lucide-rocket
      accent: brand
    - title: 编辑
      description: Sveltia CMS 编辑日文 source，并通过 GitHub PR 审核。
      icon: i-lucide-file-pen-line
      accent: emerald
    - title: 翻译
      description: 翻译通过 PR 流程处理，而不是把所有语言塞进 CMS。
      icon: i-lucide-languages
      accent: amber
    - title: 引导
      description: 用 AI 聊天和服务 CTA 把访客带到合适的表单。
      icon: i-lucide-route
      accent: slate
    - title: 接收
      description: Pages Functions 承担 API 边界，必要时连接 D1 和 Turnstile。
      icon: i-lucide-cloud
      accent: brand
linkCards:
  - href: /zh-cn/blog/astro-ai-contact-chat/
    title: 咨询 AI 聊天的技术设计
    description: 使用站内信息引导访客时的 API 边界和安全控制。
    icon: i-lucide-bot
  - href: /zh-cn/blog/cms-selection-and-turnstile/
    title: Sveltia CMS 导入指南
    description: 为静态网站加入 CMS、GitHub backend、OAuth 和 PR 运营。
    icon: i-lucide-badge-check
  - href: /zh-cn/blog/copilot-translation-pipeline/
    title: 用 Sveltia CMS 运营多语言博客
    description: 生成各语言的静态页面，而不是只依赖浏览器 UI 翻译。
    icon: i-lucide-languages
  - href: /zh-cn/blog/service-cta-contact-prefill/
    title: 将服务 CTA 的上下文传给联系表单
    description: 把服务页面的阅读上下文传递到表单分类和主题。
    icon: i-lucide-route
  - href: /zh-cn/blog/ai-chat-markdown-link-safety/
    title: 安全渲染 AI 聊天中的 Markdown 链接
    description: 不把 AI 输出当作可信 HTML，只渲染通过 allowlist 的链接。
    icon: i-lucide-shield-check
  - href: /zh-cn/blog/cloudflare-only-blog-comments/
    title: 只用 Cloudflare 添加博客评论
    description: 不使用外部评论服务，用 Pages Functions、D1 和 Turnstile 实现评论。
    icon: i-lucide-message-square-text
---

最近几篇文章分别介绍了咨询 AI、Sveltia CMS、多语言博客、服务 CTA、AI 回答的 Markdown 链接渲染，以及只用 Cloudflare 实现的评论功能。

这些都是单独的功能文章。缺少的是把它们串起来的整体设计。

## 结论

官网扩展功能时，先把职责拆开：

| 层次        | 职责                                       |
| ----------- | ------------------------------------------ |
| Astro       | 页面、博客、OGP、RSS、sitemap、UI          |
| Cloudflare  | Pages 发布、Pages Functions、D1、Turnstile |
| GitHub      | PR 审核、CMS 差异、翻译差异、历史记录      |
| Sveltia CMS | 日文 source、作者、标签、图片              |
| OpenAI API  | 咨询 AI 的回答生成                         |
| Pagefind    | 为审核后的静态 HTML 建立站内搜索索引       |

能静态生成的内容保持静态。需要请求时处理的部分才进入 Cloudflare Pages Functions。

## 不是已有文章的重复

已有文章覆盖了性能、SEO、无障碍、多语言和网站更新。但它们没有把最近的功能扩展串起来。

这篇文章的作用是成为入口：先看整体，再进入各个功能的实现细节。

## 动态功能只做小 API

咨询 AI 和评论功能都采用相同模式：

- Astro 负责 UI
- Pages Functions 负责 API 边界
- secret、D1 binding、Turnstile secret、Origin 检查不暴露给浏览器

网站不会因此变成完整的应用服务器。它仍然以静态页面为主。

## CMS 是编辑入口，不是运行时数据库

Sveltia CMS 的职责是让内容编辑变成 Git 差异。

日文博客、作者、标签、图片和日文 JSON 文案都通过 CMS 编辑，然后经过 GitHub PR、build 和 review 再发布。

这样可以保留静态网站的可审查性。

## 多语言是静态内容生成

多语言页面不是浏览器 UI 翻译，而是实际生成各语言 Markdown 和 HTML。

因此每种语言都有 URL、title、description、OGP、JSON-LD、RSS、sitemap 和 hreflang。

## 联系导线要分工

AI 聊天适合帮助访客判断该看哪个服务。服务 CTA 适合把已经阅读的服务上下文传到表单。表单负责记录正式咨询。

把这些都当作同一个“联系我们按钮”会让体验变弱。

## AI 输出不是可信 HTML

AI 回答可以包含 Markdown 风格的链接，但不能直接放进 `innerHTML`。

链接需要 trim、allowlist 检查，并用 DOM API 渲染。无法确认安全的链接保留为文本。

## 评论功能留在 Cloudflare 内

评论功能没有使用外部评论服务。

Pages Functions 处理 GET/POST，D1 保存评论，Turnstile 验证提交，Origin、hostname、rate limit 和内容过滤决定是否接受。

对小型公司博客来说，这比引入完整社区系统更合适。

## 推荐阅读顺序

1. [Sveltia CMS 导入指南](/zh-cn/blog/cms-selection-and-turnstile/)
2. [用 Sveltia CMS 运营多语言博客](/zh-cn/blog/copilot-translation-pipeline/)
3. [在 Astro 网站中加入咨询 AI 聊天的技术设计](/zh-cn/blog/astro-ai-contact-chat/)
4. [安全渲染 AI 聊天回答中的 Markdown 链接](/zh-cn/blog/ai-chat-markdown-link-safety/)
5. [将服务 CTA 的上下文传给联系表单](/zh-cn/blog/service-cta-contact-prefill/)
6. [只用 Cloudflare 为 Astro 博客添加评论功能](/zh-cn/blog/cloudflare-only-blog-comments/)

## 总结

Astro + Cloudflare 的官网不必停留在静态公司介绍页。

只要把职责分清，静态页面、CMS、多语言、咨询 AI、表单导线和评论功能可以在同一个架构里共存。

单独功能文章解释“怎么做”，这篇总览解释“为什么这样组合”。
