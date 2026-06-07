---
title: '用 Sveltia CMS 运营多语言博客的方法'
description: '介绍如何用 Sveltia CMS 编辑日语源文章，再通过 GitHub Actions 和 GitHub Copilot 生成翻译 PR，并说明它与界面翻译的区别、对搜索引擎的好处、hreflang、RSS、sitemap 和审核要点。'
date: 2026-06-07T17:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS', 'SEO']
image: /uploads/acecore-generated/blog-copilot-translation-pipeline.webp
callout:
  type: tip
  title: 界面翻译和多语言发布不是一回事
  text: '浏览器翻译或翻译插件可以帮助读者阅读当前页面，但不会自动生成语言专用 URL、title、description、内部链接、RSS、sitemap 或 hreflang。若希望搜索引擎把各语言当作独立页面理解，就需要发布翻译后的静态 HTML。'
linkCards:
  - href: /zh-cn/blog/cms-selection-and-turnstile/
    title: Sveltia CMS 导入指南
    description: 在 Astro 静态网站中导入 Sveltia CMS 的实现记录。
    icon: i-lucide-badge-check
  - href: /zh-cn/blog/astro-i18n-blog-translation/
    title: Astro 多语言架构
    description: 9种语言、fallback、hreflang、RSS 和 sitemap 的基础设计。
    icon: i-lucide-globe-2
faq:
  title: 常见问题
  items:
    - question: 只用界面翻译不够吗？
      answer: '如果只是帮助读者临时阅读，它很有用。但如果要把各语言作为搜索结果、分享链接、RSS 和 sitemap 中的正式资产，就需要语言专用 URL 和静态 HTML。'
    - question: AI 翻译会影响 SEO 吗？
      answer: '问题不在于是否使用 AI，而在于是否发布了没有用户价值的大量页面。术语、事实、链接和自然度都需要审核。'
    - question: 翻译页面会被视为重复内容吗？
      answer: 'Google 的说明是，主要内容已经翻译的本地化页面不会仅因为内容对应就成为重复页面。应保持 slug 对应，并通过 hreflang 表示关系。'
---

Acecore 的内容编辑以日语为中心，但博客面向9种语言发布。这里最容易混淆的是：**在界面上把文字翻译出来**，和 **把各语言页面作为网站内容发布出来**，是两件事。

浏览器翻译、扩展或翻译小组件适合帮助读者理解当前页面。但它们不会自动生成 `/en/blog/.../` 或 `/zh-cn/blog/.../` 这样的 URL，也不会生成对应语言的 `title`、`description`、结构化数据、RSS、sitemap 或 hreflang。

因此，如果多语言博客的目标包含搜索流入，翻译应该作为发布前的内容生成流程来处理。

## 基本方针

这个站点采用以下结构。

- 日语源文章: `src/content/blog/{slug}.md`
- 翻译文章: `src/content/blog/{locale}/{slug}.md`
- URL: `/blog/{slug}/`, `/en/blog/{slug}/`, `/zh-cn/blog/{slug}/` 等
- 编辑入口: Sveltia CMS
- 翻译作业: GitHub Copilot 的 PR
- 发布条件: Astro build 和审核通过

Sveltia CMS 负责编辑日语 source。翻译不在 CMS 里逐项手动维护，而是交给 GitHub 上的 PR 流程。

## 界面翻译适合的场景

界面翻译不是坏方案。以下场景完全可以使用。

- 内部阅读
- 临时浏览
- 管理画面或帮助页面的辅助阅读
- 不以搜索流量为目标的页面
- 不需要管理翻译质量的内容

这种模式的翻译发生在读者环境中，网站并不保存翻译文件。因此很轻量，但也不会形成可被搜索引擎直接抓取的多语言内容资产。

## 为什么静态多语言页面更适合 SEO

搜索引擎、SNS 预览、RSS 阅读器和外部索引服务看到的基本单位是 URL 和 HTML。

如果只有日语 URL，英文只是浏览器翻译出来的，那么搜索结果中的 URL、title、description、结构化数据和 RSS item 仍然会偏向日语。

静态生成翻译页面后，每种语言都可以拥有自己的页面。

```txt
/blog/copilot-translation-pipeline/
/en/blog/copilot-translation-pipeline/
/zh-cn/blog/copilot-translation-pipeline/
/es/blog/copilot-translation-pipeline/
```

这样可以带来几个好处。

### 1. 搜索引擎可以直接抓取各语言 URL

Google 可以处理 JavaScript，但官方文档也说明 JavaScript 存在限制，并推荐静态渲染或服务器端渲染作为更稳定的方案。把翻译后的正文放入初始 HTML，更适合 Google 之外的 crawler、RSS 和链接预览。

### 2. 元信息可以按语言优化

翻译 Markdown 不只翻译正文，也翻译 frontmatter。

```yaml
title: '用 Sveltia CMS 运营多语言博客的方法'
description: '用 Sveltia CMS 和 GitHub Copilot 生成翻译 PR 的实践流程。'
```

这会影响搜索结果、OGP、相关文章卡片和 RSS。

### 3. 可以输出 hreflang

当各语言有不同 URL 时，Google 建议使用 `hreflang` 表示语言版本的对应关系。只有界面翻译时，并不存在可对应的英文或中文 URL。

### 4. RSS 和 sitemap 可以语言化

翻译文件存在后，可以输出 `/zh-cn/rss.xml` 这样的 feed，并在 sitemap 中包含语言专用 URL。这比只有一个日语 feed 更适合长期运营。

## Sveltia CMS 的角色

Sveltia CMS 不是翻译引擎。这里它负责的是日语 source 的编辑体验。

CMS 中主要处理：

- 日语博客
- 作者信息
- 标签定义
- 日本语 source JSON
- 图片上传
- date、FAQ、linkCards 等 frontmatter

CMS 具体导入方法请看 [Sveltia CMS 导入指南](/zh-cn/blog/cms-selection-and-turnstile/)。

## 翻译 PR 的规则

Copilot 翻译任务必须明确哪些内容可以翻译、哪些不能改。

```md
Keep:

- slug
- image path
- author id
- tag ids
- external URLs
- code blocks

Localize:

- title
- description
- callout
- FAQ
- body text
- internal blog URLs when locale-specific URLs exist
```

Markdown 中混合了正文、URL、代码、图片和 frontmatter。规则不明确时，最容易破坏内部链接或分类。

## 实际 PR 中得到的教训

这次更新中有几个值得记录的反省点。

- 实现已经迁移到 Sveltia CMS，但旧文章仍然写着 Pages CMS。
- 文章全面改写后，如果 `date` 还是旧日期，就不会出现在博客首页。
- 翻译标题可以变化，但 slug 必须与日语 source 保持一致。
- 翻译后的内部链接不能总是回到日语 URL。
- AI 翻译需要审核，避免只生成没有价值的大量页面。

## 参考链接

- [Google Search Central: Localized Versions of your Pages](https://developers.google.com/search/docs/advanced/crawling/localized-versions?hl=en&rd=1&visit_id=638856769088389068-716743185)
- [Google Search Central: Managing Multi-Regional and Multilingual Sites](https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites)
- [Google Search Central: JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Search Central: Spam Policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Sveltia CMS 导入指南](/zh-cn/blog/cms-selection-and-turnstile/)

## 总结

界面翻译适合帮助读者临时理解页面。

但如果希望多语言内容成为搜索引擎、RSS、sitemap、内部链接和 SNS 预览中的正式资产，就应该生成语言专用的静态页面。

Sveltia CMS 负责日语 source，GitHub Copilot 负责翻译 PR，Astro build 负责验证。这种分工可以让编辑界面保持简单，同时让搜索引擎看到清晰的多语言结构。
