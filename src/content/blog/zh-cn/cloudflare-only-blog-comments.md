---
title: '只用 Cloudflare 为 Astro 博客添加评论功能'
description: '不依赖外部评论服务，只使用 Cloudflare Pages Functions、D1、Turnstile 和 Wrangler 配置，为 Astro 博客实现评论功能的实践记录。'
date: 2026-06-07T18:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'Cloudflare', 'Astro', 'セキュリティ', 'Webサイト']
image: /uploads/acecore-generated/blog-cloudflare-pages-security.webp
callout:
  type: tip
  title: 不使用外部评论服务
  text: 'Astro 静态网站也可以拥有自己的评论系统。Pages Functions 负责 API 边界，D1 保存评论，Turnstile 防止 bot 投稿，Wrangler 管理环境绑定。'
linkCards:
  - href: /zh-cn/blog/cloudflare-pages-security/
    title: Cloudflare Pages 安全设置
    description: 静态网站的安全 header 与 Cloudflare Pages 配信设计。
    icon: i-lucide-shield
  - href: /zh-cn/blog/cms-selection-and-turnstile/
    title: Sveltia CMS 导入指南
    description: Sveltia CMS 与 Cloudflare 相关配置的实现记录。
    icon: i-lucide-badge-check
  - href: /zh-cn/blog/astro-ai-contact-chat/
    title: Astro 网站的 AI 咨询聊天
    description: 同样使用 Pages Functions 作为 API 边界的实现例。
    icon: i-lucide-bot
faq:
  title: 常见问题
  items:
    - question: 为什么不用外部评论服务？
      answer: '外部服务导入很快，但 UI、数据保存、脚本加载、删除和迁移都会依赖服务方。这个实现把控制权留在网站和 Cloudflare 内。'
    - question: D1 适合保存评论吗？
      answer: '按 post_slug 查询、按 created_at 排序、soft delete、重复检测和速率限制都很适合用 D1 处理。'
    - question: 只在前端放 Turnstile 可以吗？
      answer: '不可以。Pages Function 必须把 token 发送到 Cloudflare Siteverify，并在验证成功后再写入 D1。'
---

静态网站一旦需要评论功能，就会遇到状态保存和防 spam 的问题。

Acecore 没有引入外部评论 SaaS 或嵌入式 widget，而是在 [PR #101](https://github.com/acecore-systems/acecore-net/pull/101) 中用 Cloudflare 内的组件完成了实现。

- Astro 显示评论 UI
- Cloudflare Pages Functions 提供 `/api/comments`
- Cloudflare D1 保存评论
- Cloudflare Turnstile 保护投稿
- `wrangler.jsonc` 区分 preview 和 production

重点是：评论栏不是页面里的第三方孤岛，而是站点现有 Cloudflare 架构的一部分。

## 结构

实现范围很小。

| 层       | 文件或服务                                 |
| -------- | ------------------------------------------ |
| UI       | `src/components/BlogComments.astro`        |
| 页面位置 | `src/views/BlogPostPage.astro`             |
| API      | `functions/api/comments.ts`                |
| 保存     | D1 binding `COMMENTS_DB`                   |
| bot 对策 | Cloudflare Turnstile                       |
| schema   | `migrations/0001_create_blog_comments.sql` |

UI 通过 `GET /api/comments?slug=...&locale=...` 读取评论，并通过 `POST /api/comments` 投稿。

Pages Function 在写入前验证 origin、payload、Turnstile、rate limit、重复投稿和禁止内容。

## 为什么使用 D1

评论数据需要按文章查询、按时间排序、soft delete、重复检测和限流统计。D1 可以用 SQL 很直接地表达这些操作。

显示时只取 `deleted_at IS NULL` 的行。遇到 spam 时，不需要物理删除，只要给 `deleted_at` 写入时间即可隐藏。

查询使用 `prepare(...).bind(...)`，避免把用户输入直接拼接到 SQL 里。

## Wrangler 管理绑定

`wrangler.jsonc` 中定义 `COMMENTS_DB`。

preview 使用 `acecore-comments-preview`，production 使用 `acecore-comments-production`。这样 PR preview 不会误写 production 数据库。

Cloudflare Pages 文档也说明，使用 Wrangler 配置时，它会成为 Pages project configuration 的 source of truth。

## Turnstile 必须服务端验证

前端显示 Turnstile widget 只是第一步。

投稿时，Pages Function 会把 token 和 secret key 发送到 Cloudflare Siteverify API。验证结果成功后，才进入保存流程。

实现还会检查 Siteverify 返回的 hostname 是否在 allowlist 中。Cloudflare 的 Any Hostname 文档也要求在 server-side code 中验证 hostname。

## spam 对策

第一版故意保持严格。

拒绝的内容包括：

- URL
- 邮箱地址
- HTML 标签
- Markdown 链接
- 过度重复字符
- 常见宣传词
- honeypot 字段

限流也分两层：内存中的短期限流，以及 D1 中基于 `client_hash` 的持久限流。`client_hash` 使用 salt 后的 SHA-256，不保存原始 IP。

## SEO 与搜索

评论区域标记为 `data-pagefind-ignore`，评论内容通过客户端读取。因此评论不会成为文章正文的一部分，也不会进入 Pagefind 索引。

企业博客中，正文是审核过的内容，评论是互动内容。两者分开管理更安全。

## 总结

外部评论服务很方便，但不是唯一选择。

如果网站已经运行在 Cloudflare Pages 上，那么 Pages Functions、D1、Turnstile 和 Wrangler 就足以构成一个轻量评论系统。

这样可以把 UI、数据、preview/production 分离和安全边界都放在同一个 Cloudflare 运维模型中。

## 参考

- [Cloudflare Pages: Configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare Pages Functions: Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare D1: Prepared statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Cloudflare D1: Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare Turnstile: Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Turnstile: Any Hostname](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/any-hostname/)
- [PR #101: Cloudflare 评论功能](https://github.com/acecore-systems/acecore-net/pull/101)
