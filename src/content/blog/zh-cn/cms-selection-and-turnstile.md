---
title: '无头 CMS 选型记 ― 选择 Pages CMS 的理由与 Turnstile 防机器人方案'
description: '对比评估了 Keystatic、Sveltia CMS 和 Pages CMS，最终采用 Pages CMS 的经过，以及使用 Cloudflare Turnstile 为联系表单实现垃圾信息防护的记录。'
date: 2026-03-15
author: gui
tags: ['技術', 'CMS', 'セキュリティ']
image: https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=400&fit=crop&q=80
compareTable:
  title: CMS 对比
  before:
    label: Keystatic / Sveltia CMS
    items:
      - Keystatic 需要服务端运行时
      - Sveltia CMS 功能强大但学习成本高
      - 两者对 Astro + Pages 架构来说都过于复杂
      - 初始设置耗时较长
  after:
    label: Pages CMS
    items:
      - 直接编辑 GitHub 仓库中的 Markdown
      - 非技术人员也可通过 GUI 编辑器更新文章
      - 无需服务端，与 Pages 完美兼容
      - '仅需 .pages.yml 即可完成配置'
callout:
  type: tip
  title: Turnstile 的优势
  text: Cloudflare Turnstile 与 reCAPTCHA 不同，不需要用户进行图片选择等操作。验证在后台自动完成，因此可以在不影响用户体验的前提下实现防机器人保护。
faq:
  title: 常见问题
  items:
    - question: Pages CMS 是什么？
      answer: Pages CMS 是一款轻量级 CMS，可以通过 GUI 直接编辑 GitHub 仓库中的 Markdown 文件。无需服务器，仅需 .pages.yml 即可完成配置，非技术人员也能更新文章。
    - question: Cloudflare Turnstile 和 reCAPTCHA 有什么区别？
      answer: Turnstile 不需要用户进行图片选择等操作，在后台自动完成验证。它不影响用户体验，注重隐私保护，且完全免费。
    - question: 静态站点如何处理表单提交？
      answer: 可以使用 ssgform.com 或 Formspree 等外部表单服务，无需服务端代码即可处理表单提交。还可以结合 Turnstile 进行垃圾信息防护。
---

CMS 的选型虽然不起眼，但却是一项重要的决策。本文将介绍对3款 CMS 进行实际评估的过程，以及在联系表单中引入 Cloudflare Turnstile 进行防机器人保护的实践。

## CMS 选型经过

在为 Astro 构建的静态站点引入 CMS 时，我们列出了以下3个候选方案。

### Keystatic：首选候选

Keystatic 作为类型安全的 CMS 引起了我们的关注，Astro 官方也支持其集成。然而，在本地模式下运行需要服务端运行时，与 Cloudflare Pages 的静态部署存在兼容性问题。

### Sveltia CMS：功能强大但过重

Sveltia CMS 是 Decap CMS（原 Netlify CMS）的分支，拥有现代化的 UI 和丰富的功能。但对于当前项目规模（几篇博文加几个固定页面）来说显得过于复杂。计划在内容规模增长后重新评估。

### Pages CMS：最终选择

[Pages CMS](https://pagescms.org/) 是一款直接编辑 GitHub 仓库 Markdown 文件的轻量级 CMS。

选择它的决定性因素如下：

- **设置简单**：只需添加一个 `.pages.yml` 文件
- **无需服务器**：通过 GitHub API 运作，不需要额外的基础设施
- **原生 Markdown**：与 Astro 的内容集合直接对接
- **GUI 编辑器**：非技术团队成员也能通过浏览器编辑文章

```yaml
# .pages.yml
content:
  - name: blog
    label: ブログ
    path: src/content/blog
    type: collection
    fields:
      - name: title
        label: タイトル
        type: string
      - name: date
        label: 公開日
        type: date
      - name: tags
        label: タグ
        type: string
        list: true
```

## Cloudflare Turnstile 的引入

为了防范联系表单的垃圾信息，我们引入了 Cloudflare Turnstile。

### 为什么选择 Turnstile 而非 reCAPTCHA

Google reCAPTCHA v2 强制用户选择图片，v3 虽然基于评分但在隐私方面存在顾虑。Cloudflare Turnstile 在以下方面更为出色：

| 比较项目       | reCAPTCHA v2    | reCAPTCHA v3   | Turnstile          |
| -------------- | --------------- | -------------- | ------------------ |
| 用户操作       | 需要选择图片    | 不需要         | 不需要             |
| 隐私保护       | 基于 Cookie 追踪 | 行为分析       | 最小化数据收集     |
| 性能           | 较重            | 中等           | 轻量               |
| 费用           | 免费（有限制）  | 免费（有限制） | 免费（无限制）     |

### 实现方法

Turnstile 的引入非常简单。

#### 1. 在 Cloudflare Dashboard 创建小组件

在 Cloudflare Dashboard 的"Turnstile"部分创建小组件，注册目标主机名（生产域名和 `localhost`）。系统将发放站点密钥。

#### 2. 在表单中添加小组件

```html
<!-- 加载 Turnstile 脚本 -->
<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  async
  defer
></script>

<!-- 在表单中放置小组件 -->
<form action="https://ssgform.com/s/your-form-id" method="POST">
  <!-- 表单字段 -->
  <input type="text" name="name" required />
  <textarea name="message" required></textarea>

  <!-- Turnstile 小组件 -->
  <div
    class="cf-turnstile"
    data-sitekey="your-site-key"
    data-language="ja"
    data-theme="light"
  ></div>

  <button type="submit">送信</button>
</form>
```

指定 `data-language="ja"` 后，验证成功时会显示日语消息。`data-theme="light"` 用于根据站点设计控制背景色。

#### 3. 更新 CSP 头

Turnstile 使用 iframe，因此需要在 CSP 中正确允许。

```text
script-src: https://challenges.cloudflare.com
connect-src: https://challenges.cloudflare.com
frame-src: https://challenges.cloudflare.com
```

### 注意事项：创建小组件后的传播延迟

在 Cloudflare Dashboard 创建小组件后，站点密钥需要1到2分钟才能全局传播。在此期间会出现 `400020` 错误，稍等片刻即可恢复。

## ssgform.com 的使用

表单的提交目标使用的是 [ssgform.com](https://ssgform.com/)。这是一款可用于静态站点的表单提交服务，具有以下优势：

- 无需服务端代码
- 自动发送邮件通知
- 支持 Turnstile 的令牌验证
- 免费计划的提交数量足够使用

## 总结

无论是 CMS 还是防机器人方案，我们都遵循"选择必要最小限度"的方针。Pages CMS 只需5分钟即可完成部署，Turnstile 只需添加几行 HTML 即可实现。正因为架构简洁，才能将运维成本保持在较低水平。
