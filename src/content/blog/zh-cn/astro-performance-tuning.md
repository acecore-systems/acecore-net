---
title: '提升Astro网站PageSpeed的实用技巧'
description: '面向Astro、UnoCSS和Cloudflare Pages网站的实用优化技巧，涵盖CSS分发、字体设置、响应式图片、当前AdSense与GA4加载方式以及缓存配置。'
date: 2026-03-15T00:00
lastUpdated: '2026-07-29T00:28:23+09:00'
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: /uploads/acecore-generated/blog-astro-performance-tuning.webp
callout:
  type: tip
  title: 本文的目标读者
  text: '适合想要提高Astro网站PageSpeed分数的读者。介绍了CSS、字体、图片、广告脚本优化方面可以直接应用的具体方法。'
processFigure:
  title: 优化流程
  steps:
    - title: CSS分发策略
      description: 理解内联展开和外部文件的权衡。
      icon: i-lucide-file-code
    - title: 字体优化
      description: 确认实际加载并用于渲染的字体。
      icon: i-lucide-type
    - title: 图片优化
      description: 使用 Cloudflare Images + srcset + sizes 优化外部图片。
      icon: i-lucide-image
    - title: 加载控制
      description: AdSense首次尝试与重试，以及GA4延迟加载。
      icon: i-lucide-timer
compareTable:
  title: 优化前后对比
  before:
    label: 优化前
    items:
      - 未检查字体连接与实际渲染结果
      - 未检查CSS输出与缓存
      - 图片以固定尺寸分发
      - AdSense脚本即时加载
      - 不记录测试条件，只追踪固定分数
  after:
    label: 优化后
    items:
      - 检查字体网络请求与实际渲染字体
      - 较大的CSS外部化，并对带哈希的资源使用immutable缓存
      - 通过srcset + sizes根据屏幕宽度分发最优尺寸
      - AdSense首次检查广告位并通过observer重试；GA4在交互或计时器后加载
      - 在相同条件下重复运行PageSpeed Insights
faq:
  title: 常见问题
  items:
    - question: CSS是内联化快还是外部文件化快？
      answer: "取决于CSS体积、页面结构和缓存状态。使用当前的 build.inlineStylesheets: 'auto' 设置，检查生成的HTML与CSS，并在相同条件下测量。"
    - question: Google Fonts CDN为什么慢？
      answer: '外部域名可能增加DNS查询、TCP连接和TLS握手。影响取决于网络与缓存，应检查实际请求和渲染字体后再判断。'
    - question: Cloudflare Images 较慢时怎么办？
      answer: 'Cloudflare Images的性能取决于源图、转换和缓存状态。首次转换或缓存未命中仍会抓取源图，因此应在相同条件下测量LCP候选，仅在需要时使用responsive preload。'
    - question: AdSense加载控制会影响收入吗？
      answer: '影响会随广告位置和访问行为而变化。请比较更改前后的可见率、广告请求和收入，并与性能指标分开评估。'
---

## 前言

Acecore官方网站使用Astro 7.1.3 + UnoCSS + Cloudflare Pages构建。本文介绍截至2026年7月29日在代码仓库中确认的优化设置。

PageSpeed Insights结果会随测试时间、设备和网络而变化，因此本文不列出固定分数。请在相同条件下比较更改前后的Core Web Vitals和传输量。

---

## 为什么选择Astro

Astro支持静态网站生成（SSG），并允许只在需要的位置添加客户端JavaScript。当前网站也会分发ClientRouter、搜索、广告和分析脚本，因此不能假设页面不含客户端脚本；应测量实际传输量和渲染指标。

当前网站使用UnoCSS和 `presetWind3()`。它根据构建时检测到的utility生成CSS，可能减少传输量，但不能保证最小体积。请检查生成的CSS和实际使用的类。

---

## CSS分发策略：内联 vs 外部文件

CSS分发方式会影响HTML体积、额外请求与浏览器缓存。

### 内联CSS时

设置Astro的 `build.inlineStylesheets: 'always'`，所有CSS会直接嵌入HTML。这样可省去外部CSS请求，并可能根据页面情况改善FCP（First Contentful Paint）。

有利条件会随CSS体积和页面结构变化，不能只按固定阈值判断。

### 使用外部CSS时

外部文件可通过浏览器缓存复用共享且带hash的CSS。

当前网站使用 `build.inlineStylesheets: 'auto'`，调整时检查实际生成结果。

### 解决方案：外部文件化 + immutable缓存

将Astro设置改为 `build.inlineStylesheets: 'auto'`。Astro会根据CSS体积自动判断，较大的CSS会作为外部文件分发。

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto',
  },
})
```

外部CSS文件输出到 `/_astro/` 目录，通过Cloudflare Pages的头部设置添加immutable缓存。

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

更改后请检查生成的HTML、CSS文件和缓存行为，并在相同条件下重新运行PageSpeed Insights。

---

## 字体优化：确认实际分发

### 比较外部与本地分发

外部字体可能在关键路径中增加连接；本地分发也会从站点发送字体CSS和文件。请在相同条件下比较两种方式。

在网络面板中检查字体请求、缓存与传输量，并通过Rendered Fonts确认浏览器实际使用的字体。

### 当前代码仓库状态

`package.json` 包含 `@fontsource/noto-sans-jp`，但截至2026年7月29日，`src` 中没有任何文件import它。仅存在依赖项并不能证明字体已被分发。

当前UnoCSS字体栈如下：

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', system-ui, sans-serif",
  },
}
```

仅有此声明不会下载Web字体。若采用自托管，请同时确认显式import、生成的CSS与字体文件以及实际渲染结果。

---

## 图片优化：Cloudflare Images + srcset + sizes

### Cloudflare Images Transformations

当前工具只把外部图片交给Cloudflare Images的 `/cdn-cgi/image/` 转换。根相对 `/uploads/...` 文件和受管的 `asv.acecore.net/uploads/...` 图片会直接分发。

- **格式转换**：`output=auto` 根据浏览器支持自动选择AVIF / WebP
- **质量调整**：当前工具默认使用 `quality=75`，覆盖前应检查实际图片效果
- **缩放**：通过 `w=` 参数缩放到指定宽度

### srcset和sizes设置

对于需要响应式分发的外部图片，通过工具生成 `srcset` 并设置 `sizes`。

```astro
---
import { generateSrcSet, optimizeImage } from '../utils/image'

const remoteImage =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop'
---

<img
  src={optimizeImage(remoteImage, { width: 800, height: 400, quality: 75 })}
  srcset={generateSrcSet(remoteImage, [480, 640, 960, 1280, 1600], {
    quality: 75,
    aspectRatio: 2,
  })}
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
/>
```

### `sizes` 的精度

如果 `sizes` 属性保持 `100vw`（整个屏幕宽度），浏览器会选择过大的图片。请根据实际布局指定为 `calc(100vw - 2rem)` 或 `(max-width: 768px) 100vw, 50vw` 等。

### LCP改善：preload

只preload实际的LCP候选图片。对于响应式图片，应让layout输出的 `href`、`imagesrcset`、`imagesizes` 与图片本身一致，并设置 `fetchpriority="high"`。额外的preload可能争抢资源，因此应通过测量确认对象。

```html
<link
  rel="preload"
  as="image"
  href="..."
  imagesrcset="..."
  imagesizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  fetchpriority="high"
/>
```

### CLS（布局偏移）防止

应指定与源图宽高比一致的准确 `width` 和 `height`。正确值能让浏览器预留空间，但仅有属性并不能保证消除CLS。当前hero和Markdown rewrite路径也会添加固定尺寸，应逐一核对与源图的比例并实际测量CLS。

特别容易遗漏的是头像图片（32×32、48×48、64×64px）和YouTube缩略图（480×360px）。

---

## 广告加载控制与分析工具延迟加载

### AdSense

当前runtime仅在日文 `/blog/` 页面启用。它为每个广告位注册 `IntersectionObserver`（`rootMargin: 200px`）和 `ResizeObserver`，随后检查可显示性并执行首次 `attemptInit()`。首次尝试不会等待intersection，因此宽度可用时可能立即发起广告请求。Observer用于intersection或尺寸变化时重试。带locale前缀的翻译URL目前会插入广告位，但不会加载该runtime。

```javascript
const retry = () => void attemptInit()
const intersectionObserver = new IntersectionObserver(
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      retry()
    }
  },
  { rootMargin: '200px' },
)
const resizeObserver = new ResizeObserver(retry)

intersectionObserver.observe(container)
resizeObserver.observe(container)
void attemptInit() // 首次尝试不等待intersection
```

`attemptInit()`会检查广告位宽度和可见状态，并通过状态属性防止重复请求。

### GA4

Google Analytics 4会在 `pointerdown`、`keydown`、`touchstart` 或 `scroll` 时进入加载队列。支持时使用 `requestIdleCallback`，否则使用 `setTimeout`；没有交互时，首页在12秒后、其他页面在4秒后由计时器加入队列。

---

## 缓存策略

以下内容记录Cloudflare Pages `_headers` 的当前设置，并非适用于所有文件的通用建议。

```
# 构建输出（带哈希的文件名）
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# 搜索索引
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# HTML
/*
  Cache-Control: public, max-age=0, must-revalidate
```

- `/_astro/*` 文件名中包含哈希值，因此1年的immutable缓存是安全的
- `/pagefind/*` 当前缓存1周 + 1天的stale-while-revalidate。固定名称的 `pagefind-entry.json` 会引用带哈希的metadata，为避免版本混用，应对entry/bootstrap文件进行revalidate，只对带哈希的chunk使用长期缓存
- HTML使用 `max-age=0, must-revalidate`，复用缓存前会重新验证

---

## 性能优化检查清单

1. **CSS分发策略是否合适**：检查 `auto` 的生成结果并在相同条件下测量
2. **是否比较过字体分发方式**：在相同条件下测量自托管与外部CDN
3. **是否确认实际字体分发**：检查网络请求与Rendered Fonts
4. **响应式分发对象是否有srcset + sizes**：特别要准备移动端的小尺寸
5. **是否只preload实际LCP候选**：保持响应式srcset、sizes与priority一致
6. **图片width / height是否准确**：匹配源图宽高比并测量CLS
7. **AdSense / GA4控制是否合适**：检查AdSense首次尝试与重试、GA4交互与计时器fallback
8. **缓存头部是否已设置**：仅对带哈希的资源使用immutable

---

## 总结

性能优化的原则可以概括为 **"不发送不必要的东西"**。CSS分发应通过实际输出确认；字体自托管是在符合站点测量与运维需求时可选的一种方式。

不要把固定分数当作结果。请在相同条件下重新测量Core Web Vitals与传输量，并一并确认广告和Analytics的行为。

---

## 本文所属系列

本文是"[Astro网站品质改善指南](/blog/website-improvement-batches/)"系列的一部分。也有关于SEO、无障碍性和UX改善的独立文章。
