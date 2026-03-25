---
title: '将 Astro 6 网站扩展至9种语言 ― 136篇博客文章的自动翻译与多语言架构'
description: '记录了将 Astro 6 + UnoCSS + Cloudflare Pages 架构的网站扩展至9种语言的过程。涵盖从UI国际化到136篇博客文章翻译、Pages CMS多语言配置的全部流程。'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'i18n', 'Webサイト']
image: https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop&q=80
processFigure:
  title: 多语言化流程
  steps:
    - title: i18n 基础搭建
      description: 搭建 Astro 内置 i18n 路由和翻译工具。
      icon: i-lucide-globe
    - title: UI 文本翻译
      description: 将页头、页脚及所有组件的显示文本多语言化。
      icon: i-lucide-languages
    - title: 博客文章翻译
      description: 生成 136 个翻译文件（17篇文章 × 8种语言）。
      icon: i-lucide-file-text
    - title: CMS 与构建验证
      description: Pages CMS 多语言配置及全部页面的构建验证。
      icon: i-lucide-check-circle
compareTable:
  title: 多语言化前后对比
  before:
    label: 仅日语
    items:
      - 仅日语1种语言
      - 17篇博客文章
      - 生成523个页面（UI多语言化后）
      - Pages CMS 仅1个博客集合
      - 标签和作者数据仅日语
      - 仅1个 RSS 订阅源
  after:
    label: 支持9种语言
    items:
      - 日语 + 8种语言（en、zh-cn、es、pt、fr、ko、de、ru）
      - 17篇博客文章 + 136篇翻译 = 共153篇
      - 生成541个页面（翻译文章带回退机制）
      - Pages CMS 包含9个语言集合
      - 25种标签和作者数据翻译至各语言
      - 多语言 RSS 订阅源（9种语言）
callout:
  type: info
  title: 支持的语言
  text: '支持9种语言：日语（默认）、英语、简体中文、西班牙语、葡萄牙语、法语、韩语、德语和俄语。'
statBar:
  items:
    - value: '9'
      label: 支持语言数
    - value: '136'
      label: 翻译文章数
    - value: '541'
      label: 生成页面数
faq:
  title: 常见问题
  items:
    - question: 为什么选择了9种语言？
      answer: '为了最大化全球覆盖范围，我们选择了全球主要语言市场。英语、中文、西班牙语和葡萄牙语覆盖了大部分互联网用户，法语、德语、俄语和韩语则补充了其余主要市场。'
    - question: 如何保证翻译质量？
      answer: '我们使用 GitHub Copilot 进行 AI 翻译。先创建英语版作为中间语言，再从英语翻译至各目标语言，以减少质量波动。frontmatter 中的标签值保持日语不变，URL、代码块和图片路径也保持不变。'
    - question: 如果翻译文章不存在会怎样？
      answer: '回退功能会在翻译不存在时显示日语原文。可以逐步添加翻译。'
    - question: 添加新文章时需要翻译吗？
      answer: '不是必须的——如果没有翻译文件，系统会回退显示日语版本。要添加翻译，只需在对应的语言目录中放置同名的 Markdown 文件即可。'
---

我们将 Acecore 官方网站从仅支持日语升级为支持9种语言。本文介绍了完整的流程：UI 国际化、17篇博客文章 × 8种语言 = 136个翻译文件，以及 Pages CMS 的多语言配置。

## 多语言化方针

### 范围确定

我们分三个阶段推进多语言化：

1. **i18n 基础搭建**：Astro 内置 i18n 路由配置、翻译工具、9种语言的翻译 JSON 文件
2. **UI 文本翻译**：页头、页脚、侧边栏及所有页面的组件文本
3. **博客文章翻译**：全部17篇文章翻译为8种语言（生成136个文件）

### URL 设计

采用 Astro 的 `prefixDefaultLocale: false`，日语在根路径（`/blog/...`），其他语言带前缀（`/en/blog/...`、`/zh-cn/blog/...` 等）。

```
# 日语（默认）
/blog/astro-performance-tuning/

# 英语
/en/blog/astro-performance-tuning/

# 简体中文
/zh-cn/blog/astro-performance-tuning/
```

所有语言使用相同的 slug，使得语言切换时的 URL 映射非常简单。

## i18n 基础实现

### Astro i18n 配置

在 `astro.config.mjs` 中配置 i18n 路由。

```javascript
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
```

### 翻译工具

配置文件、工具函数和翻译 JSON 文件集中在 `src/i18n/` 目录下。

```typescript
// src/i18n/utils.ts
export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key]
    ?? translations[defaultLocale][key]
    ?? key
}
```

翻译文件以 JSON 格式存放在 `src/i18n/locales/` 下，管理着导航、页脚、博客 UI 和元数据等约100个键。

### View 组件模式

页面实现采用 **View 组件模式**。布局和逻辑集中在 `src/views/` 中，路由文件（`src/pages/`）仅作为传递 locale 的轻量包装器。

```astro
---
// src/pages/[locale]/about.astro（路由文件）
import AboutPage from '../../views/AboutPage.astro'
const { locale } = Astro.params
---
<AboutPage locale={locale} />
```

这种设计消除了日语路由（`/about`）和多语言路由（`/en/about`）之间的逻辑重复。

## 博客内容多语言化

### 目录结构

翻译文章放置在语言代码子目录中。Astro 的 glob 加载器通过 `**/*.md` 模式自动递归检测。

```
src/content/blog/
  astro-performance-tuning.md          # 日语（基础）
  website-renewal.md
  en/
    astro-performance-tuning.md        # 英语版
    website-renewal.md
  zh-cn/
    astro-performance-tuning.md        # 简体中文版
    website-renewal.md
  es/
    ...
```

### 内容解析工具

在 `src/utils/blog-i18n.ts` 中实现了3个函数。

```typescript
// 判断是否为基础文章（ID中无斜杠 = 基础）
export function isBasePost(post: CollectionEntry<'blog'>): boolean {
  return !post.id.includes('/')
}

// 从ID中移除 locale 前缀获取基础 slug
export function getBaseSlug(postId: string): string {
  const idx = postId.indexOf('/')
  return idx !== -1 ? postId.slice(idx + 1) : postId
}

// 获取基础文章的本地化版本（没有则回退到原文）
export function localizePost(
  post: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): CollectionEntry<'blog'> {
  if (locale === defaultLocale) return post
  return allPosts.find((p) => p.id === `${locale}/${post.id}`) ?? post
}
```

关键在于**不修改现有的内容集合 schema**。Astro 的 glob 加载器会自动识别子目录中的文件，生成类似 `en/astro-performance-tuning` 的 ID，无需更改配置。

### 翻译文件规则

翻译文件遵循以下规则生成：

- **frontmatter 键名**保持英文（`title`、`description`、`date` 等）
- **标签值**保持日语不变（`['技術', 'Astro']` 等）
- **URL、图片路径、代码块和 HTML** 不修改
- **日期和作者**保持不变
- **正文和 frontmatter 文本值**（title、description、callout、FAQ 等）进行翻译

### 翻译工作流

翻译流程如下：

1. **创建英语作为中间语言**：从日语原文翻译为英语
2. **从英语翻译至各语言**：以英语为起点扩展至7种语言
3. **批量处理**：使用 GitHub Copilot 每次处理5-6篇文章

日语→英语→目标语言的两阶段翻译减少了质量波动。通过英语作为中间语言，比直接从日语翻译至各语言能获得更稳定的质量。

## View 组件的多语言支持

### BlogPostPage 实现

博客文章页面使用 `localizePost()` 获取对应 locale 版本的内容，并赋值给模板变量。

```astro
---
// src/views/BlogPostPage.astro
const localizedPost = localizePost(basePost, allPosts, locale)
const post = localizedPost // 现有模板引用直接可用
---
```

这种方法无需更改模板中对 `post.data.title` 或 `post.body` 的任何引用即可实现多语言支持。

### 列表页面实现

博客列表、标签列表、作者列表和归档页面使用 `isBasePost()` 仅过滤基础文章，然后在显示时通过 `localizePost()` 替换为翻译版本。

```astro
---
const allPosts = await getCollection('blog')
const basePosts = allPosts.filter(isBasePost)
const displayPosts = basePosts.map(p => localizePost(p, allPosts, locale))
---
```

## 构建注意事项

### YAML frontmatter 转义

法语翻译中撇号（`l'atelier`、`qu'on` 等）与 YAML 单引号冲突导致问题。

```yaml
# NG：YAML 解析错误
title: 'Le métavers est plus proche qu'on ne le pense'

# OK：改用双引号
title: "Le métavers est plus proche qu'on ne le pense"
```

使用 Node.js 脚本批量修复了所有文件。英语文本如 `Acecore's` 也存在同样的问题，因此生成翻译文件时需注意引号类型。

### OG 图像路由过滤

`/blog/og/[slug].png.ts` 也会捕获翻译文章的 slug（`en/aceserver-hijacked` 等），导致参数错误。通过 `isBasePost()` 过滤解决。

```typescript
export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection('blog')
  const posts = allPosts.filter(isBasePost)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }))
}
```

## Pages CMS 多语言支持

Pages CMS（`.pages.yml`）仅针对指定 `path` 目录下的直接文件，因此翻译子目录需作为独立集合注册。

```yaml
content:
  - name: blog
    label: ブログ（日本語）
    path: src/content/blog
  - name: blog-en
    label: Blog（English）
    path: src/content/blog/en
  - name: blog-zh-cn
    label: 博客（简体中文）
    path: src/content/blog/zh-cn
  # ... 每种语言单独配置
```

标签使用各语言显示，以便在 CMS 中一目了然地识别每个集合对应的语言。

## 语言切换 UI

在页头添加了 `LanguageSwitcher` 组件，提供桌面端和移动端均可使用的语言切换 UI。切换语言时跳转到同一页面的对应语言版本，首次访问时检测浏览器的 `navigator.language` 进行自动重定向。

## 标签多语言显示

文章标签在 URL 中保持日语 slug，**仅翻译显示名称**。这避免了路由复杂化，同时让用户看到母语显示的标签。

```typescript
// src/i18n/utils.ts
export function translateTag(tag: string, locale: Locale): string {
  return t(locale, `tags.${tag}`) !== `tags.${tag}`
    ? t(locale, `tags.${tag}`)
    : tag
}
```

在每种语言的翻译 JSON 中添加了 `tags` 部分，为全部25种标签定义了翻译。

```json
// en.json（摘录）
{
  "tags": {
    "技術": "Technology",
    "セキュリティ": "Security",
    "パフォーマンス": "Performance",
    "アクセシビリティ": "Accessibility"
  }
}
```

`translateTag()` 在文章卡片、侧边栏、标签索引和文章详情等6处使用，确保所有标签显示统一为对应语言。

## 作者数据多语言支持

作者简介（bio）和技能列表也实现了按语言切换。在 `src/data/authors.json` 中添加了 `i18n` 字段，保存各语言的翻译。

```json
{
  "id": "hatt",
  "name": "hatt",
  "bio": "代表取締役。Web制作・システム開発…",
  "skills": ["TypeScript", "Astro", "..."]
  "i18n": {
    "en": {
      "bio": "CEO and representative director. Web development...",
      "skills": ["TypeScript", "Astro", "..."]
    }
  }
}
```

`getLocalizedAuthor()` 工具函数根据 locale 获取对应的作者信息。

```typescript
// src/utils/blog-i18n.ts
export function getLocalizedAuthor(author: Author, locale: Locale) {
  const localized = author.i18n?.[locale]
  return localized ? { ...author, ...localized } : author
}
```

## 多语言网站 SEO 优化

为了最大化多语言化的 SEO 优势，我们建立了让搜索引擎正确识别和索引各语言版本的机制。

### 站点地图 hreflang 支持

配置了 `@astrojs/sitemap` 的 `i18n` 选项，在站点地图中自动输出 `xhtml:link rel="alternate"` 标签。

```javascript
// astro.config.mjs
sitemap({
  i18n: {
    defaultLocale: 'ja',
    locales: {
      ja: 'ja',
      en: 'en',
      'zh-cn': 'zh-CN',
      es: 'es',
      pt: 'pt',
      fr: 'fr',
      ko: 'ko',
      de: 'de',
      ru: 'ru',
    },
  },
})
```

这使得每个 URL 都输出9种语言的 hreflang 链接，让 Google 能准确把握各语言版本之间的对应关系。

### JSON-LD 结构化数据语言支持

在博客文章的 `BlogPosting` 结构化数据中添加了 `inLanguage` 字段，告知搜索引擎每篇文章的语言。

```javascript
// BlogPostPage.astro（JSON-LD 摘录）
{
  "@type": "BlogPosting",
  "inLanguage": htmlLangMap[locale],  // "ja"、"en"、"zh-CN" 等
  "headline": post.data.title,
  // ...
}
```

### 多语言 RSS 订阅源

除了日语版的 `/rss.xml`，还为每种语言生成了 RSS 订阅源（`/en/rss.xml`、`/zh-cn/rss.xml` 等）。订阅源的标题和描述也翻译为各语言，`<language>` 标签输出符合 BCP47 标准的语言代码。

```typescript
// src/pages/[locale]/rss.xml.ts
export const getStaticPaths = () =>
  locales.filter((l) => l !== defaultLocale).map((l) => ({ params: { locale: l } }))
```

`BaseLayout.astro` 中的 `<link rel="alternate" type="application/rss+xml">` 也会根据 locale 自动设置相应的 RSS URL。

## 总结

通过利用 Astro 6 的内置 i18n 功能，即使是静态网站也能实现高质量的多语言支持。

- **i18n 基础**：使用 Astro 的 `prefixDefaultLocale: false`，日语无前缀
- **UI 翻译**：通过 View 组件模式实现零逻辑重复
- **内容翻译**：子目录方式，无需修改现有 schema
- **标签翻译**：URL 保持日语 slug，仅翻译显示名称
- **作者数据翻译**：bio 和 skills 按语言切换
- **SEO 优化**：站点地图 hreflang、JSON-LD `inLanguage`、多语言 RSS 订阅源
- **回退机制**：未翻译的文章自动显示日语版本
- **CMS 支持**：各语言的文章可在 Pages CMS 中独立编辑

未来添加新文章时，将逐步添加翻译文件。得益于回退功能，翻译完成之前日语版本会照常显示，确保网站质量不受影响。
