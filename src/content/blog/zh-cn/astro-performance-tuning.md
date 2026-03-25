---
title: '实现Astro网站PageSpeed移动端99分的实践技巧'
description: '介绍在Astro + UnoCSS + Cloudflare Pages构成的网站上达到PageSpeed Insights移动端99分所实施的优化技巧。涵盖CSS分发策略、字体设置的陷阱、响应式图片、AdSense延迟加载、缓存设置等实践方法。'
date: 2026-03-15
lastUpdated: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80
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
      description: 通过自托管消除外部CDN的延迟。
      icon: i-lucide-type
    - title: 图片优化
      description: 使用wsrv.nl + srcset + sizes分发最优尺寸。
      icon: i-lucide-image
    - title: 延迟加载
      description: 在首次交互时注入AdSense和GA4。
      icon: i-lucide-timer
compareTable:
  title: 优化前后对比
  before:
    label: 优化前
    items:
      - Google Fonts CDN（阻塞渲染）
      - 将190 KiB的CSS内联展开到HTML
      - 图片以固定尺寸分发
      - AdSense脚本即时加载
      - 移动端70分左右
  after:
    label: 优化后
    items:
      - '使用@fontsource自托管（以正确的字体名引用）'
      - CSS外部文件化并以immutable缓存分发
      - 通过srcset + sizes根据屏幕宽度分发最优尺寸
      - AdSense和GA4在首次滚动时延迟加载
      - 移动端99分、桌面端100分
faq:
  title: 常见问题
  items:
    - question: CSS是内联化快还是外部文件化快？
      answer: '取决于CSS的总量。20 KiB以下时内联化更有优势。超过此大小时，外部文件化并利用浏览器缓存，第二次及后续访问会大幅加速。'
    - question: Google Fonts CDN为什么慢？
      answer: 'PageSpeed Insights模拟的是slow 4G（约1.6 Mbps，RTT 150ms）。连接外部域名需要DNS查询 + TCP连接 + TLS握手，这个延迟会造成渲染阻塞。自托管从同一域名分发，这个延迟为零。'
    - question: wsrv.nl慢的话怎么办？
      answer: 'wsrv.nl通过Cloudflare CDN分发，通常速度很快。但在PageSpeed测试时，如果CDN缓存未命中，LCP可能会恶化。对重要图片设置 <link rel="preload">，指示浏览器提前获取。'
    - question: 延迟加载AdSense会影响收入吗？
      answer: '如果首屏没有广告，首次滚动时加载的显示时机几乎相同。页面速度改善带来的SEO效果反而更有利。'
---

## 前言

Acecore的官方网站使用Astro 6 + UnoCSS + Cloudflare Pages构建。本文介绍了在PageSpeed Insights上达到**移动端99分、桌面端100分**所实施的优化技巧。

最终达成的分数如下：

| 指标 | 移动端 | 桌面端 |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## 为什么选择Astro

企业网站最需要的是"速度"和"SEO"。Astro专注于静态网站生成（SSG），默认实现零JavaScript。由于不会像React或Vue那样将框架代码发送到客户端，初始显示非常快速。

CSS框架采用了UnoCSS。与Tailwind CSS相同的实用工具优先方法，在构建时只提取使用的类名，因此CSS体积最小。从v66开始推荐使用 `presetWind3()`，建议尽早迁移。

---

## CSS分发策略：内联 vs 外部文件

对PageSpeed分数影响最大的就是CSS的分发策略。

### CSS体积较小时（~20 KiB）

设置Astro的 `build.inlineStylesheets: 'always'`，所有CSS会直接嵌入HTML。由于无需对外部CSS文件发起HTTP请求，FCP（First Contentful Paint）会得到改善。

CSS在20 KiB左右以内时，这种方式最优。

### CSS体积较大时（20 KiB~）

但使用日文Web字体（`@fontsource-variable/noto-sans-jp`）后情况就不同了。这个包包含**124个 `@font-face` 声明**（约96.7 KiB），整个CSS达到190 KiB左右。

将190 KiB的CSS内联展开到所有HTML中，首页HTML会膨胀到**225 KiB**。在slow 4G下，仅这个HTML传输就需要约1秒。

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

通过此更改，HTML体积**减少了84~91%**（例：index.html从225 KiB → 35 KiB），PageSpeed分数从**96分提升至99分**。

---

## 字体优化：正确的自托管设置

### 避免使用Google Fonts CDN

Google Fonts CDN虽然便捷，但在PageSpeed Insights的移动端测试中是致命的。实际测试表明，使用Google Fonts CDN时**FCP达到6.1秒，分数降至62分**。

在slow 4G下连接外部域名会产生DNS查询 → TCP连接 → TLS握手 → CSS下载 → 字体下载的链式请求，导致渲染严重延迟。

### 引入自托管

安装 `@fontsource-variable/noto-sans-jp`，在布局文件中import即可。

```bash
npm install @fontsource-variable/noto-sans-jp
```

```javascript
// BaseLayout.astro
import '@fontsource-variable/noto-sans-jp'
```

### 注意：字体名不匹配

这里有一个意想不到的陷阱。`@fontsource-variable/noto-sans-jp` 在 `@font-face` 中注册的字体名是 **`Noto Sans JP Variable`**。但很多人在CSS中会写成 `Noto Sans JP`。

如果存在这种不匹配，**字体无法正确应用，浏览器会一直使用回退字体**。尽管加载了96.7 KiB的字体数据，却完全没有被使用。

在UnoCSS设置中正确指定字体族：

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP Variable', 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif",
  },
}
```

如果出现TypeScript类型错误，在 `src/env.d.ts` 中添加模块声明：

```typescript
declare module '@fontsource-variable/noto-sans-jp';
```

---

## 图片优化：wsrv.nl + srcset + sizes

### wsrv.nl代理

外部图片通过 [wsrv.nl](https://images.weserv.nl/) 代理分发。只需添加URL参数即可自动完成以下处理：

- **格式转换**：`output=auto` 根据浏览器支持自动选择AVIF / WebP
- **质量调整**：`q=50` 在保持足够画质的同时将文件大小减少约10%
- **缩放**：通过 `w=` 参数缩放到指定宽度

### srcset和sizes设置

为所有图片设置 `srcset` 和 `sizes`，根据屏幕宽度分发最优尺寸。

```html
<img
  src="https://wsrv.nl/?url=...&w=800&output=auto&q=50"
  srcset="
    https://wsrv.nl/?url=...&w=480&output=auto&q=50 480w,
    https://wsrv.nl/?url=...&w=640&output=auto&q=50 640w,
    https://wsrv.nl/?url=...&w=960&output=auto&q=50 960w,
    https://wsrv.nl/?url=...&w=1280&output=auto&q=50 1280w,
    https://wsrv.nl/?url=...&w=1600&output=auto&q=50 1600w
  "
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  loading="lazy"
  decoding="async"
/>
```

### `sizes` 的精度

如果 `sizes` 属性保持 `100vw`（整个屏幕宽度），浏览器会选择过大的图片。请根据实际布局指定为 `calc(100vw - 2rem)` 或 `(max-width: 768px) 100vw, 50vw` 等。

### LCP改善：preload

对影响LCP（Largest Contentful Paint）的图片设置 `<link rel="preload">`。在Astro的布局组件中添加 `preloadImage` props，指定首页Hero图片等需要优先加载的图片。

```html
<link rel="preload" as="image" href="..." />
```

### CLS（布局偏移）防止

为所有图片明确指定 `width` 和 `height` 属性。浏览器会预先确保图片的显示区域，防止加载完成时的布局偏移（CLS）。

特别容易遗漏的是头像图片（32×32、48×48、64×64px）和YouTube缩略图（480×360px）。

---

## 广告和分析工具的延迟加载

### AdSense

Google AdSense的脚本约100 KiB，对初始显示影响很大。改为在用户首次滚动时动态注入脚本。

```javascript
window.addEventListener('scroll', () => {
  const script = document.createElement('script')
  script.src = 'https://pagead2.googlesyndication.com/...'
  script.async = true
  document.head.appendChild(script)
}, { once: true })
```

`{ once: true }` 使事件监听器只触发一次。这样可以将首屏的JavaScript传输量降至接近零。

### GA4

Google Analytics 4同样使用 `requestIdleCallback` 延迟注入。在浏览器空闲时注入脚本，不会妨碍用户操作。

---

## 缓存策略

在Cloudflare Pages的 `_headers` 文件中为每种资源设置最优缓存策略。

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
- `/pagefind/*` 缓存1周 + 1天的stale-while-revalidate
- HTML始终获取最新版本

---

## 性能优化检查清单

1. **CSS分发策略是否合适**：20 KiB以下用内联，超过则用外部文件
2. **字体是否自托管**：外部CDN在slow 4G下是致命的
3. **字体名是否正确**：确认 `@fontsource-variable` 的注册名（`*Variable`）
4. **所有图片是否有srcset + sizes**：特别要准备移动端的小尺寸
5. **LCP元素是否有preload**：Hero图片和首屏图片
6. **图片是否有width / height**：防止CLS
7. **AdSense / GA4是否延迟加载**：首屏JS传输量降为零
8. **缓存头部是否已设置**：immutable缓存加速后续访问

---

## 总结

性能优化的原则可以用一句话概括：**"不发送不必要的东西"**。CSS内联展开乍看很快，但190 KiB时适得其反。字体自托管是必须的，但存在字体名不匹配的陷阱。

以Astro的零JS架构为基础，分别从CSS、字体、图片、广告脚本各方面最小化传输量，移动端99分完全可以达到。

---

## 本文所属系列

本文是"[Astro网站品质改善指南](/blog/website-improvement-batches/)"系列的一部分。也有关于SEO、无障碍性和UX改善的独立文章。
