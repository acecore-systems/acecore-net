---
title: 'Astro 站点品质改善指南 ― 从 PageSpeed 移动端99分的达成之路'
description: '将 Astro + UnoCSS + Cloudflare Pages 架构的站点从性能、SEO、无障碍性、UX 四个维度进行优化，达成 PageSpeed Insights 移动端99分、桌面端全项100分的完整记录。'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: 本文的目标读者
  text: '面向正在进行网站品质改善的读者，以及对 Astro + UnoCSS 的实践运用感兴趣的读者。本文是改善全局的概览文章，各主题的详细内容通过各自的文章链接查看。'
processFigure:
  title: 改善的推进方式
  steps:
    - title: 测量
      description: 使用 PageSpeed Insights 和 axe 确定当前瓶颈。
      icon: i-lucide-gauge
    - title: 分析
      description: 解读评分构成，找出影响最大的改善点。
      icon: i-lucide-search
    - title: 实施
      description: 逐项修改，确认构建零错误。
      icon: i-lucide-code
    - title: 复测
      description: 部署后重新测量，用数据验证效果。
      icon: i-lucide-check-circle
compareTable:
  title: 改善前后的对比
  before:
    label: 改善前
    items:
      - PageSpeed 移动端70分水平
      - 缺少结构化数据和 OGP 设置
      - 未适配无障碍性
      - View Transitions 导致脚本停止
      - 常量硬编码散落各处
  after:
    label: 改善后
    items:
      - 移动端 99 / 100 / 100 / 100（桌面端全项100）
      - 7种结构化数据 + OGP + canonical 完备
      - WCAG AA 合规（对比度·aria·屏幕阅读器通知·focus-visible）
      - 全组件适配 View Transitions
      - SITE 常量·社交 URL·广告 ID 集中管理
linkCards:
  - href: /blog/astro-performance-tuning/
    title: 性能优化篇
    description: 通过 CSS 分发策略、字体设置、响应式图片、缓存达成 PageSpeed 99分的方法。
    icon: i-lucide-gauge
  - href: /blog/astro-seo-and-structured-data/
    title: SEO·结构化数据篇
    description: JSON-LD、OGP、站点地图、RSS 实现方法的实践指南。
    icon: i-lucide-search
  - href: /blog/astro-accessibility-guide/
    title: 无障碍性篇
    description: 达成 WCAG AA 合规的 aria 属性、对比度、表单改善指南。
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX·代码质量篇
    description: View Transitions 的坑、Pagefind 全文搜索、TypeScript 类型安全的实践。
    icon: i-lucide-sparkles
faq:
  title: 常见问题
  items:
    - question: PageSpeed Insights 移动端能打到100分吗？
      answer: '技术上是可能的，但对于包含 AdSense 或 GA4 等外部服务的站点，稳定维持100分极其困难。Lighthouse 模拟 slow 4G（约1.6 Mbps），外部资源的加载会产生很大的扣分。99分是现实中的最高可达分数。'
    - question: 改善应该按什么顺序进行？
      answer: '首先用 PageSpeed Insights 了解现状，从影响最大的指标开始处理。一般推荐按性能 → SEO → 无障碍性的顺序进行。'
    - question: 这套改善方法适用于其他 Astro 站点吗？
      answer: '是的。CSS 分发策略、字体自托管、结构化数据、无障碍性改善等都是 Astro 站点通用的最佳实践。'
    - question: 是否使用了 GitHub Copilot 来推进改善？
      answer: '是的。几乎所有改善都是与 GitHub Copilot 协作完成的。详情请参阅 "使用 GitHub Copilot 的开发流程" 文章。'
---

## 前言

2026年3月改版上线的 Acecore 官网采用 Astro 6 + UnoCSS + Cloudflare Pages 架构。然而改版刚上线时的站点还只是"能运行"的水平，在性能、SEO、无障碍性和 UX 方面都有改善空间。

本文总结了经过150多项改善，达成 **PageSpeed Insights 移动端99分、桌面端全项100分** 的全过程。

---

## PageSpeed 移动端99分的瓶颈

首先要传达的是，**在 PageSpeed Insights 的移动端评分中获得高分比想象中要困难得多**。

### Lighthouse 的移动端模拟

PageSpeed Insights 背后运行的是 Lighthouse 工具，移动端测试应用了以下节流设置。

| 项目 | 设置值 |
| --- | --- |
| 下载速度 | 约 1.6 Mbps（slow 4G） |
| 上传速度 | 约 0.75 Mbps |
| 延迟 | 150 ms（RTT） |
| CPU | 4倍降速 |

也就是说，在光纤网络下1秒打开的页面，在 Lighthouse 的模拟中会**需要5~6秒**。仅加载 200 KiB 的 CSS，在 slow 4G 下就会产生**约1秒**的阻塞。

### 评分的非线性特征

PageSpeed 的评分不是线性的。

- **50 → 90**：基本优化（图片压缩、删除不必要的脚本）即可达到
- **90 → 95**：需要 CSS、字体、图片分发策略的优化
- **95 → 99**：毫秒级调优。需要在 CSS 内联化和外部文件化之间做出判断
- **99 → 100**：受外部 CDN 响应速度和 Lighthouse 本身测量波动影响。包含 AdSense/GA4 的站点极难稳定达成

### 评分波动

同一站点每次测量评分可能**波动2~5分**。原因如下：

- wsrv.nl 等图片 CDN 的响应速度
- Cloudflare Pages 边缘服务器的缓存状态
- Lighthouse 本身的测量误差

因此，目标应该是"反复测量后稳定获得高分"，而非"某一次测出了100分"。

---

## 最终评分

尽管面临上述困难，以下评分已可以稳定达成。

| 指标 | 移动端 | 桌面端 |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## 改善的四大支柱

改善分为四大类别推进，各自的详细内容在独立文章中解说。

### 1. 性能

对达成移动端99分贡献最大的是性能优化。从 CSS 分发策略（内联 vs 外部文件）、字体自托管、响应式图片优化到 AdSense/GA4 的延迟加载，逐一消除瓶颈。

效果最显著的三项：

- **CSS 外部文件化**：从190 KiB CSS 内联展开改为外部文件，HTML 传输量最多减少91%
- **字体名不一致修复**：发现并修复了 `@fontsource-variable/noto-sans-jp` 注册的字体名 `Noto Sans JP Variable` 与 CSS 中引用的 `Noto Sans JP` 不匹配的问题
- **响应式图片**：为所有图片设置 `srcset` + `sizes`，向移动端提供适当尺寸

### 2. SEO

为了适配 Google 的富媒体搜索结果，实现了7种 JSON-LD 结构化数据。包括 OGP meta 标签、canonical、站点地图优化和 RSS feed 扩展，建立了向搜索引擎准确传达站点结构的基础。

### 3. 无障碍性

PageSpeed Accessibility 100分通过清除 axe DevTools 和 Lighthouse 的自动测试来达成。包括装饰图标的 `aria-hidden`（超过30处）、外部链接的屏幕阅读器通知、对比度修正（`text-slate-400` → `text-slate-500`）、全局应用 `focus-visible` 样式等，通过持续的细致工作积累而成。

### 4. UX·代码质量

解决了引入 View Transitions（ClientRouter）导致的脚本停止问题，并在所有组件中适配。还实现了基于 Pagefind 的全文搜索。代码方面提升了 TypeScript 类型安全性，将常量统一管理（将社交 URL、广告 ID、GA4 ID 集中到 SITE 常量），大幅改善了可维护性。

---

## 技术栈

| 技术 | 用途 |
| --- | --- |
| Astro 6 | 静态站点生成（零 JS 架构） |
| UnoCSS (presetWind3) | 实用优先 CSS |
| Cloudflare Pages | 托管·CDN·头部控制 |
| @fontsource-variable/noto-sans-jp | 日语字体自托管 |
| wsrv.nl | 图片代理（AVIF/WebP 自动转换） |
| Pagefind | 静态站点全文搜索 |

---

## 总结

要在 PageSpeed Insights 中达成移动端99分，关键是贯彻"不发送不必要内容"的原则。CSS 分发策略、字体自托管、图片优化、外部脚本延迟加载——每项都是简单的措施，但组合起来就能产生巨大的效果。

同时并行推进 SEO、无障碍性和 UX 的改善，可以在所有4项指标上获得高分。与其执着于100分，不如以稳定达到95分以上为现实目标。

各主题的详细内容请通过上方的链接卡片查看。关于改善的推进方式和代码实现，也请参阅[使用 GitHub Copilot 的开发流程](/blog/tax-return-with-copilot/)。
