---
title: '安全渲染 AI 聊天回答中的 Markdown 链接'
description: '这是一篇关于如何把 AI 聊天回答中的 Markdown 链接安全转换为 HTML 的实现笔记。通过拆分可容忍空白的解析、href trim、允许列表校验、DOM 渲染、fallback 和测试用例，可以把同样的模式复用到其他网站。'
date: 2026-06-07T14:30
author: gui
tags: ['技術', 'Webサイト', 'AI', 'セキュリティ', 'Astro']
image: https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: 重点
  text: AI 回答不是可信 HTML。即使要使用 Markdown 链接，也应先 trim URL，再通过允许列表校验；不允许的链接不要生成 a 标签，而是保留为文本。
processFigure:
  title: AI 回答的链接渲染流程
  steps:
    - title: Text
      description: 首先把模型回答当作纯文本处理。
      icon: i-lucide-message-square-text
      accent: brand
    - title: Parse
      description: 只解析聊天中实际需要的 Markdown 表达。
      icon: i-lucide-brackets
      accent: amber
    - title: Validate
      description: trim href，并只允许站内 URL 或认可的域名。
      icon: i-lucide-shield-check
      accent: emerald
    - title: Render
      description: 使用 DOM API 创建安全元素，而不是使用 innerHTML。
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Markdown 链接渲染中应拆开的判断
  before:
    label: 粗略渲染
    items:
      - 直接把 AI 回答放进 innerHTML
      - 一开始就试图实现完整 Markdown 规范
      - URL 前后有空白时无法链接化
      - '把外部 URL 和 javascript: URL 当成同一类处理'
  after:
    label: 小而安全的渲染
    items:
      - 以文本接收回答，只把需要的表达转换成 DOM
      - 只支持聊天中使用的 Markdown 子集
      - URL trim 后再校验
      - 不允许的 URL 保留为普通文本
checklist:
  title: 导入检查
  items:
    - text: 不要把 AI 回答当成 HTML 信任
    - text: 允许 Markdown 链接 URL 前后的空白
    - text: href 一定要 trim 后再校验
    - text: 只允许内部路径、当前 origin 和必要的外部域名
    - text: 为外部链接明确设置 target 和 rel
    - text: 不允许的链接保留为文本
    - text: 不只测试正常路径，也测试危险 URL 和损坏的 Markdown
linkCards:
  - href: /blog/astro-ai-contact-chat/
    title: 咨询 AI 聊天的技术设计
    description: 介绍 AI 回答、API 边界和 prompt 控制的基础文章。
    icon: i-lucide-sparkles
  - href: /blog/cloudflare-pages-security/
    title: Cloudflare Pages 安全设置
    description: 关于 CSP 和安全响应头的相关文章。
    icon: i-lucide-shield
  - href: /contact/
    title: 联系我们
    description: 实际放置 AI 聊天和表单的页面。
    icon: i-lucide-message-square
faq:
  title: 常见问题
  items:
    - question: 使用 markdown-it 或 marked 就足够了吗？
      answer: 即使使用库，也仍然需要设计 HTML 输出的处理方式、允许哪些链接目标、是否添加 target 和 rel，以及如何拒绝危险 URL。聊天用途下，小型自定义渲染器也可能足够。
    - question: 允许 URL 前后空白会不会变危险？
      answer: 风险不在空白本身，而在 trim 后允许什么。对 trim 后的 href 做允许列表校验，就能同时容忍模型的格式波动并保持安全。
    - question: 不允许的 URL 应该删除吗？
      answer: 多数情况下保留为文本更便于调试，也能保留回答上下文。如果运营规则要求隐藏可疑字符串，也可以删除整个链接。
---

如果 AI 聊天返回 `详见[服务列表]( /services/ )`，链接可能不会被渲染，原始 Markdown 会直接留在界面上。

Acecore 的咨询 AI 聊天也遇到过这个问题，并在 [修正 Markdown 链接渲染的 PR](https://github.com/acecore-systems/acecore-net/pull/99) 中调整了渲染器。

本文从这个小修正出发，整理如何把 AI 回答安全地转换为 DOM。

## AI 回答不是可信 HTML

首先，AI 输出应作为文本处理，而不是 HTML。

聊天 UI 中确实需要链接、粗体和列表。但如果把回答直接放进 `innerHTML`，就等于让浏览器解释模型输出的任意字符串。

你不需要实现完整 Markdown。你需要的是一个小型渲染器：只检测聊天支持的少量表达，并只创建安全的 DOM 节点。

## 问题不只是空白

这次直接出现问题的是这样的链接：

```md
[服务列表](/services/)
```

人能理解，但如果正则把 URL 定义为“不含空白的字符串”，它就不会匹配。

严格版本类似这样：

```js
;/\[([^\]]+)\]\(([^)\s]+)\)/
```

`[^)\s]+` 不允许空白，所以 `( /services/ )` 不会作为链接被解析。修正方式是在括号内部允许前后空白，然后再规范化 URL。

```js
;/\[([^\]]+)\]\(\s*([^)]+?)\s*\)/
```

但不能只放宽正则就结束。后面必须进行规范化和安全校验。

## href 要先 trim 再校验

顺序应固定：

1. 从 Markdown 中取出 label 和 raw href
2. 对 raw href 执行 `trim()`
3. 用允许列表校验 trim 后的 href
4. 只有允许时才创建 a 标签

```js
const href = String(rawHref || '').trim()

if (label && isSafeMarkdownHref(href)) {
  const link = document.createElement('a')
  link.href = href
  link.rel = 'noopener noreferrer'

  if (/^https?:\/\//i.test(href)) {
    link.target = '_blank'
  }

  link.textContent = label
  parent.appendChild(link)
}
```

校验的值和实际放进 DOM 的值必须一致。否则安全校验会变弱。

## 允许列表要按产品决定

AI 可以展示哪些 URL，应由每个站点自己决定。

Acecore 的咨询 AI 大致允许以下范围：

| 类型       | 示例                      | 判断               |
| ---------- | ------------------------- | ------------------ |
| 内部路径   | `/services/`              | 允许               |
| 同一origin | `https://acecore.net/...` | 允许               |
| 官方LINE   | `https://lin.ee/...`      | 目的明确，因此允许 |
| mailto     | `mailto:info@acecore.net` | 只允许固定地址     |
| tel        | `tel:05088902788`         | 只允许固定号码     |
| 其他外部   | 任意 URL                  | 原则上不链接化     |

实现可以这样写：

```js
function isSafeMarkdownHref(href) {
  if (href.startsWith('/')) return true

  try {
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin) return true
    if (url.hostname === 'acecore.net') return true
    if (url.hostname === 'lin.ee') return true
  } catch {
    return false
  }

  return href === 'mailto:info@acecore.net' || href === 'tel:05088902788'
}
```

这个函数应按产品调整。招聘站可能允许招聘媒体，电商可能允许支付或配送追踪域名，SaaS 可能允许文档和状态页。

## 不允许的链接退回文本

链接未通过校验时如何处理，也是一项设计。

对于咨询 AI，保留原始 Markdown 文本通常比删除更好。用户能保留上下文，开发者也能看到模型试图输出什么。

渲染器不仅负责创建安全链接，也负责在无法安全创建链接时安全失败。

## 提前准备测试用例

这种渲染器如果只测正常路径，很容易漏掉问题。

至少确认以下用例：

| 输入                                | 期待结果                |
| ----------------------------------- | ----------------------- |
| `[服务列表](/services/)`            | 生成内部链接            |
| `[服务列表]( /services/ )`          | trim 后生成内部链接     |
| `[LINE]( https://lin.ee/example )`  | 生成允许的外部链接      |
| `[危险](javascript:alert(1))`       | 不链接化                |
| `[外部](https://example.com/)`      | 域名不允许时不链接化    |
| `[损坏](/services/`                 | 作为文本显示            |
| `` `code` 和 [link]( /contact/ ) `` | code 和 link 都正确渲染 |

PR #99 中确认了 `[服务列表]( /services/ )`、`[服务列表](/services/)`、`[LINE]( https://lin.ee/DjIrdqj )` 会解析到预期 URL。

## 默认不要实现完整 Markdown

AI 聊天所需的 Markdown 子集可以很小：

- 段落
- 列表
- 粗体
- 行内代码
- 链接

表格、图片、原始 HTML、脚注、深层标题结构会迅速扩大渲染器的责任。聊天 UI 只需要可读的引导。

如果之后使用成熟 Markdown 库，也仍需单独决定是否允许 HTML、如何限制 URL、外部链接添加哪些属性。

## 总结

AI 聊天的 Markdown 链接渲染看起来只是一个小 UI 修正，但本质上是在决定信任 AI 输出的边界。

重点如下：

- AI 回答作为文本处理，而不是 HTML
- 只把必要的 Markdown 子集转换成 DOM
- 允许 Markdown 链接 URL 前后空白
- href trim 后再做安全校验
- 只允许内部 URL 和必要的外部域名
- 不允许的链接保留为文本
- 测试损坏 Markdown 和危险 URL

AI 越多参与网站导线，链接渲染就越重要。便利的 Markdown 支持和严格的链接控制，应在同一实现中一起设计。
