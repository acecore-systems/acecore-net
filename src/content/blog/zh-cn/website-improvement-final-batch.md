---
title: 'Astro 站点品质改善指南 续篇 - 达成 PageSpeed Insights 全项目 100 分的最终调整'
description: '记录上一篇文章之后完成的最后一轮优化：停用 Cloudflare Web Analytics、实现 PageSpeed Insights 移动端与桌面端四项全满分、解读网络依赖关系树、迁移到共享 SVG 图标，以及说明哪些额外优化尝试过但没有采纳。'
date: 2026-03-29T02:30
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: 这是上一篇文章的续篇
  text: '作为上一篇《Astro 站点品质改善指南》的续篇，本文记录了让站点达到 PageSpeed Insights 全项目 100 分的最终调整。这一次，移动端与桌面端的 4 项指标都达到了 100 分，同时也把剩余诊断的解读方式，以及额外优化为何没有继续采纳的判断一起写清楚。'
insightGrid:
  eyebrow: 为什么有价值
  title: 为什么 PageSpeed 全项目 100 分依然代表高水准
  description: 100 分并不意味着真实网站的一切都完美，但它说明 Lighthouse 关注的核心审计中已经没有明显短板。
  variant: card
  items:
    - title: 以 slow 4G 为前提
      description: 移动端测量是在 slow 4G 与 CPU 降速条件下进行的。即使是轻量级静态站点，也无法轻松拿到 100 分。
      icon: i-lucide-gauge
      tone: brand
    - title: 四个类别同时满分
      description: 不能只优化 Performance。Accessibility、Best Practices 和 SEO 也必须同时全部达标。
      icon: i-lucide-shield-check
      tone: emerald
    - title: 第三方要素被重新梳理
      description: 既要减少外部 beacon 和非必要依赖，又要保留 GA4、广告等真正需要的要素。
      icon: i-lucide-sparkles
      tone: amber
    - title: 诊断结果需要被正确解读
      description: 重点不是把所有 insight 都清零，而是判断剩下的诊断是否处于可以接受的范围。
      icon: i-lucide-search
      tone: slate
processFigure:
  title: 最终调整的步骤
  steps:
    - title: 测量
      description: 检查 PageSpeed Insights 的移动端、桌面端结果以及仍然残留的诊断信息。
      icon: i-lucide-gauge
    - title: 整理
      description: 重新评估 Cloudflare Web Analytics 的角色，停止不必要的 beacon。
      icon: i-lucide-shield-check
    - title: 修正
      description: 将动态图标渲染统一到共享 SVG Icon 组件，并解决缺失图标问题。
      icon: i-lucide-wrench
    - title: 判断
      description: 比较进一步拆分 CSS 和继续压缩 third-party 的方案，并明确放弃投入产出比不高的做法。
      icon: i-lucide-scale-3d
compareTable:
  title: 最终调整带来的变化
  before:
    label: 改善前
    items:
      - 移动端得分已经很高，但 Cloudflare Web Analytics 的 beacon 仍然存在
      - 对 PageSpeed 剩余诊断的意义理解不够清晰，因此很难判断何时可以停手
      - 某些文章中残留的 UnoCSS icon class 会导致只显示空心圆
      - 当诊断还残留时，很难判断是否还要继续追逐那些收益很低的优化
  after:
    label: 改善后
    items:
      - 移动端与桌面端四项指标全部达到 100 分
      - 停用了 Cloudflare Web Analytics，并将测量体系整理为以 GA4 为主
      - 图标渲染统一到共享 SVG Icon 组件，legacy 图标名通过 alias 兼容
      - 收益很低的追加优化被明确放弃，什么时候该停手也能说清楚了
checklist:
  title: 已完成的关键调整
  items:
    - text: 停用了 Cloudflare Web Analytics，并阻止 beacon 注入
      checked: true
    - text: 确认了 PageSpeed Insights 移动端与桌面端四项全部 100 分
      checked: true
    - text: 读解网络依赖关系树，并整理出 BaseLayout.css 是唯一主要剩余瓶颈
      checked: true
    - text: 将 ProcessFigure 与 StatBar 中的动态 icon class 迁移到共享 Icon 组件
      checked: true
    - text: 通过 alias 兼容了 legacy 的 check-circle 名称
      checked: true
    - text: 比较了进一步拆分 CSS 和继续缩减 third-party 的方案，并判断其复杂度高于收益，因此没有采纳
      checked: true
linkCards:
  - href: /blog/website-improvement-batches/
    title: 上一篇文章：品质改善全景概览
    description: 先阅读上一篇 hub 文章，可以快速掌握 150 多项改善的整体脉络。
    icon: i-lucide-book-open
  - href: /blog/astro-performance-tuning/
    title: 性能优化篇
    description: 详细说明 CSS 分发策略、字体、图片与第三方脚本的优化方法。
    icon: i-lucide-gauge
  - href: /blog/astro-accessibility-guide/
    title: 无障碍篇
    description: 梳理实现 WCAG AA 合规与 Accessibility 100 的具体措施。
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX 与代码质量篇
    description: 汇总 View Transitions、搜索与类型安全等方面的质量改善。
    icon: i-lucide-sparkles
faq:
  title: 常见问题
  items:
    - question: 在 PageSpeed Insights 拿到 100 分，就能说是最快的网站吗？
      answer: '不能从绝对意义上这样断言。PageSpeed Insights 是 Lighthouse 驱动的实验室测量，并不能完整覆盖真实用户的网络、设备与服务器拥堵情况。不过，100 分仍然意味着在 Lighthouse 关注的核心审计中几乎没有明显短板。'
    - question: 为什么已经 100 分了，仍然会看到网络依赖关系树或 render-blocking CSS？
      answer: '这些并不一定属于失败审计，也可能只是诊断信息。本次案例中，关键路径上剩下的只有 BaseLayout.css，而且移动端 100 分仍能保持，因此从投入产出比来看可以接受。'
    - question: 为什么要停用 Cloudflare Web Analytics？
      answer: 'GA4 已经足以覆盖 CTA、搜索、联系等事件测量，而 Cloudflare 侧的角色已经收缩为性能观察为主。这次也考虑了 beacon 对 PageSpeed 的影响，因此将测量体系整理为以 GA4 为主。'
    - question: 有没有试过但最终没有采纳的优化？
      answer: '有。比如继续拆分 BaseLayout.css、为了让 network dependency tree 的显示本身消失而继续调整，甚至把 third-party 再缩到连 GA4 都要动的程度，这些方案都比较过。但在移动端 100 分已经稳定的前提下，它们带来的复杂度或测量损失大于实际收益，所以没有采纳。'
---

## 前言

在上一篇 [Astro 站点品质改善指南](/blog/website-improvement-batches/) 中，我总结了 Acecore 改版站点上进行的大规模改善。本文是那篇文章的续篇。

这篇文章继续收尾上一篇发布后仍然残留的细小问题，最终把站点推进到了 **PageSpeed Insights 移动端与桌面端四项指标全部 100 分** 的状态。而且，这次并不只是单纯调分，还包括整理测量体系、稳定图标渲染，以及明确哪些优化已经不值得继续追了。

## PageSpeed Insights 全项目 100 分的结果

截至 2026 年 3 月 29 日，Acecore 首页已经确认获得以下结果。

| 测量面 | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| 移动端 | **100** | **100** | **100** | **100** |
| 桌面端 | **100** | **100** | **100** | **100** |

下方放的是实际的 PageSpeed Insights 截图和报告 URL。上一轮时，我认为“移动端 99 / 其余全部 100”已经是现实中的上限；而这次通过清理不必要的第三方 beacon，并认真解读剩余诊断的含义，最终达到了 100 分。

### 测量报告 URL

为了让截图与之后可以重新打开核对的证据放在一起，这里也附上本次测量所使用的报告直链。

- [移动端报告](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile)
- [桌面端报告](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop)

<figure class="not-prose my-8">
  <figcaption class="text-base font-700 text-slate-800 mb-3">实际测量截图</figcaption>
  <p class="text-sm text-slate-500 mb-4">点击图片即可直接打开对应的 PageSpeed Insights 报告。</p>
  <div class="grid gap-4 md:grid-cols-2">
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-mobile-summary-20260329.webp" alt="截至 2026 年 3 月 29 日的 Acecore 首页 PageSpeed Insights 移动端结果。Performance、Accessibility、Best Practices、SEO 全部为 100 分。" class="w-full rounded-lg border border-slate-200" width="1160" height="340" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">移动端</span>
    </a>
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-desktop-summary-20260329.webp" alt="截至 2026 年 3 月 29 日的 Acecore 首页 PageSpeed Insights 桌面端结果。Performance、Accessibility、Best Practices、SEO 全部为 100 分。" class="w-full rounded-lg border border-slate-200" width="1190" height="270" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">桌面端</span>
    </a>
  </div>
</figure>

## 100 分到底有多厉害

提到 100 分，可能会让人觉得只要不断删功能、继续简化界面、继续压缩外部要素，Performance 就总能越冲越高。某种意义上这没错，静态站点确实往往越精简越容易变快。

但这次并不是在做一个什么都没有的演示页。GA4、广告、搜索、ClientRouter、共享 CSS 这些实际运营里需要保留的东西都还在，同时还要把移动端和桌面端四项指标都拉到 100。也就是说，难点不只是“继续变轻”，而是要判断什么该留、什么该删、什么已经不值得继续动了。

当然，100 分并不意味着它在现实世界中绝对最快。真实用户体验会受到网络、设备、地区和缓存状态的影响。但至少可以说，站点已经达到了 **在保留必要运营要素的前提下，Lighthouse 关注的核心审计里没有明显短板** 的高完成度状态。

## 达到 100 分之前的最终调整

### 1. 停用 Cloudflare Web Analytics，并整理为以 GA4 为主的测量体系

Cloudflare Web Analytics 作为 privacy-first、轻量级的 RUM 工具本身是有价值的，但在 Acecore 站点中，GA4 一侧已经广泛接入了 CTA、搜索、联系、lead 生成等事件测量。

因此这次重新审视两者分工后，我判断 Cloudflare 这边继续注入 beacon 带来的 PageSpeed 成本已经高于它的价值。于是我在控制台里关闭了 RUM，并确认生产环境 HTML 中已经不再出现 `static.cloudflareinsights.com/beacon.min.js`。

### 2. 正确解读 PageSpeed 剩余诊断

即使得分已经达到 100，PageSpeed 里仍然可能显示 `Network dependency tree` 或 `render-blocking resources` 等诊断。如果把这些都误解成必须完全消除的警告，就很容易陷入投入产出比极低的优化工作。

这次的关键链路大致如下：

1. `/en/`
2. `ClientRouter.js`
3. `BaseLayout.css`
4. `BaseLayout.js`

其中真正仍可视为 render-blocking 的，其实只剩下 `BaseLayout.css` 一项。不过它的体积已经足够小，移动端 100 分也依旧能够维持，因此我把它归类为“虽然仍在，但当前可以接受的诊断”。把这个判断明确写清楚，本身就是这次很重要的收获，因为它为之后的优化提供了清晰的停手标准。

### 3. 将图标渲染统一到共享 SVG 组件

这轮改善期间，项目已经在从 UnoCSS 的 icon utility 迁移到共享 SVG 기반的 `Icon` 组件。在这个过渡过程中，`ProcessFigure` 与 `StatBar` 里残留的动态 icon class 没有完全清理，导致部分文章里只显示空心圆。

我把组件侧的渲染统一成 `Icon`，并额外加入了一个 alias，把 legacy 名称 `check-circle` 吸收到 `circle-check`。

结果带来了三个实际收益：

- 不再容易因为遗漏动态 class 而让图标消失
- `aria-hidden` 等无障碍属性可以在 SVG 侧统一处理
- 不再依赖 UnoCSS 的静态分析，运维稳定性更高

### 4. 试过但没有采纳的方向

拿到 100 分之后，很容易继续去追那些还显示在诊断区里的项目，直到页面上什么都不剩。这次我也比较过几条这样的路线，但最终没有采纳。

- 继续细分 `BaseLayout.css`：诊断看起来也许会更干净一点，但现在移动端 100 分已经稳定，额外复杂度换来的实际收益太少。
- 把“让 `network dependency tree` 的显示彻底消失”当成目标：诊断还在显示，并不等于真实用户体验一定还有问题。
- 进一步压缩 third-party，甚至动到 GA4：页面也许会更轻一点，但会失去重要的业务事件测量能力。

正是这些比较，让这次最终调整真正算得上完成。并不是因为所有能删的都删掉了，而是因为剩下的取舍现在已经可以清楚地说明白。

## 这次改善带来的实践性收获

这一次最大的收获，其实不是单纯拿到了 100 分，而是进入了 **能够清楚说明什么必须删除、什么可以保留** 的状态。

例如，如果 Cloudflare Web Analytics 只是因为惯性而存在，那么它就值得被移除；而 GA4 仍然应该保留，因为它是业务事件测量的核心。再比如，`network dependency tree` 本身不是失败，关键是要看里面剩下了什么，并判断这样的残留是否合理。

这次我也借助 AI 把候选改动尽量铺开来看，但最终采用与否仍然只看三个标准：实测数据是不是真的变好了，运维成本有没有明显上升，必要的测量能力有没有被破坏。AI 帮助扩大了试验范围，最终拍板的仍然是实测和判断标准。

只盯着分数做优化，往往会越做越过头。这次我不仅整理了修复内容，也整理了“做到哪里该停”的边界，所以可以说 Acecore 站点的改善目前已经到了一个可以视为“完成”的阶段。

## 总结

作为上一篇文章的续篇，本次最终调整主要完成了以下内容：

- 确认了 PageSpeed Insights 移动端与桌面端四项全部 100 分
- 停用了 Cloudflare Web Analytics，并整理为以 GA4 为主的测量体系
- 解读了剩余网络诊断，并明确哪些残留问题是可以接受的
- 通过统一到共享 SVG `Icon` 组件解决了图标缺失显示问题
- 明确放弃收益很低的追加优化，并整理出合理的停手标准

至少从 Lighthouse 与 PageSpeed Insights 的角度来看，Acecore 站点已经打磨到了可以理直气壮冲击顶级速度的程度。不过分数本身不是目的，而只是结果。接下来，我也会继续在运营和改善两方面同时守住这个状态，避免它回退。
