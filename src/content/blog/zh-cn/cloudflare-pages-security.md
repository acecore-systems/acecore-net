---
title: '使用 Cloudflare Pages 实现安全的静态站点部署'
description: '关于在 Cloudflare Pages 上部署静态站点，以及通过 _headers 配置安全头和 CSP 的实践指南。同时介绍了从 Worker 回归 Pages 的经过。'
date: 2026-03-15
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ']
image: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop&q=80
processFigure:
  title: 部署架构的演变
  steps:
    - title: 初始架构
      description: 使用 Cloudflare Pages 部署静态站点。
      icon: i-lucide-cloud
    - title: 迁移至 Worker
      description: 为处理联系表单而迁移至 Worker。
      icon: i-lucide-server
    - title: 回归 Pages
      description: 采用外部表单服务后回归静态部署。
      icon: i-lucide-rotate-ccw
    - title: 安全加固
      description: 通过 _headers 配置 CSP 和安全头。
      icon: i-lucide-shield-check
callout:
  type: info
  title: Worker vs Pages
  text: Cloudflare Worker 虽然灵活，但对于静态站点来说，Pages 在缓存效率和部署简洁性方面更具优势。如果不需要服务端处理，建议选择 Pages。
faq:
  title: 常见问题
  items:
    - question: 应该选择 Cloudflare Pages 还是 Workers？
      answer: 对于不需要服务端处理的静态站点，Pages 是最佳选择。它与 CDN 的集成十分顺畅，部署也很简洁。表单处理等功能可以通过外部服务来替代。
    - question: 应该在 _headers 文件中配置哪些安全头？
      answer: 基本的安全头包括 Content-Security-Policy、X-Frame-Options、X-Content-Type-Options、Referrer-Policy 和 Permissions-Policy。CSP 需要根据站点使用的外部资源进行调整。
    - question: 如何在 CSP 中允许 AdSense 和 Analytics？
      answer: 需要在 script-src 中添加 googletagmanager.com 和 googlesyndication.com 的域名。根据情况，img-src 和 connect-src 中可能也需要添加相关域名的许可。
---

Cloudflare Pages 是托管静态站点的理想平台。本文将介绍实际的部署架构以及如何通过 `_headers` 文件进行安全配置。

## 部署架构：为什么放弃 Worker 回归 Pages

最初，我们计划使用 Cloudflare Worker 来处理联系表单的后端逻辑。使用 Worker 可以在服务端发送邮件和进行表单验证。

然而，在实际搭建过程中遇到了以下问题：

- **构建复杂化**：要通过 Worker 分发 Astro 的构建产物需要额外配置
- **调试成本高**：本地 `wrangler dev` 与生产环境的行为差异
- **缓存控制**：Pages 与 Cloudflare CDN 的集成更加自然

最终，我们选择了 [ssgform.com](https://ssgform.com/) 这一外部服务来处理联系表单，从而完全消除了服务端处理的需求。这样一来，不再需要 Worker，可以将站点作为纯静态站点部署到 Pages。

## 通过 \_headers 进行安全配置

在 Cloudflare Pages 中，可以在 `public/_headers` 文件中定义 HTTP 响应头。以下是我们实际使用的配置摘要。

### Content-Security-Policy（CSP）

CSP 是防止跨站脚本攻击（XSS）的重要响应头。它通过白名单方式指定允许的资源来源。

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://wsrv.nl https://images.unsplash.com data:;
  connect-src 'self' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net;
  form-action https://ssgform.com;
```

要点如下：

- **script-src**：允许 Cloudflare Turnstile（`challenges.cloudflare.com`）和 AdSense
- **img-src**：允许图片代理 wsrv.nl 和 Unsplash
- **form-action**：仅允许向 ssgform.com 提交表单
- **frame-src**：允许 Turnstile 的 iframe 和 AdSense 的广告框架

### 其他安全头

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- **X-Content-Type-Options**：防止 MIME 嗅探
- **X-Frame-Options**：作为点击劫持对策禁止 iframe 嵌入
- **Referrer-Policy**：跨域时仅发送 origin
- **Permissions-Policy**：禁用不需要的浏览器 API（摄像头、麦克风、地理位置）

## 缓存控制

对静态资源设置长期缓存，对 HTML 设置较短的缓存时间。

```text
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=3600
```

Astro 输出的 `_astro/` 目录中的文件包含内容哈希，因此使用 `immutable` 缓存一年也是安全的。HTML 由于有一定的更新频率，缓存时间设为1小时。

## Pages 部署配置

Cloudflare Pages 的项目配置非常简单：

| 项目             | 设置值            |
| ---------------- | ----------------- |
| 构建命令         | `npx astro build` |
| 输出目录         | `dist`            |
| Node.js 版本     | 22                |

连接 GitHub 仓库后，向 `main` 分支推送即可自动部署。每个 PR 还会自动生成预览部署，方便进行评审。

## 总结

关键在于判断"是否真的需要服务端处理"。通过利用外部服务消除了对 Worker 的依赖，结果使部署和安全管理都变得更加简洁。虽然 `_headers` 中的 CSP 配置初期需要一些工作量，但一旦编写完成就会应用到所有页面，是一项性价比很高的安全措施。
