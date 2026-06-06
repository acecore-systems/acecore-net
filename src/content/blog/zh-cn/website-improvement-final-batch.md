---
title: 'Astro 站点品质改善指南 续篇 - 达成 PageSpeed Insights 全项目 100 分的最终调整'
description: '记录上一篇文章之后完成的最后一轮优化：停用 Cloudflare Web Analytics、延后加载 GA4 与搜索 UI、实现 PageSpeed Insights 移动端与桌面端四项全满分、整理 Search Console 中的面包屑与索引策略、迁移到共享 SVG 图标，以及说明哪些额外优化尝试过但没有采纳。'
date: 2026-03-29T02:30
author: gui
tags:
  ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: /uploads/acecore-generated/performance-seo-dashboard.webp
callout:
  type: tip
  title: 这是上一篇文章的续篇
  text: '作为上一篇《Astro 站点品质改善指南》的续篇，本文记录了让站点达到 PageSpeed Insights 全项目 100 分的最终调整。这一次，移动端与桌面端的 4 项指标都达到了 100 分，同时也把 GA4 与搜索的延后加载、Search Console 的整理方式、剩余诊断的解读，以及额外优化为何没有继续采纳的判断一起写清楚。'
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
    - title: 第三方要素必须重新梳理
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
      description: 同时检查 PageSpeed Insights 与 Search Console，区分真正的问题与只是诊断提示的项目。
      icon: i-lucide-gauge
    - title: 整理
      description: 重新评估 Cloudflare Web Analytics 的角色，并决定 GA4、广告、搜索中哪些必须保留。
      icon: i-lucide-shield-check
    - title: 延后
      description: 将 GA4 和基于 Pagefind 的搜索 UI 从初始加载路径中移出，改为在真正需要时再加载。
      icon: i-lucide-timer-reset
    - title: 修正
      description: 同时整理 breadcrumb、canonical、noindex、sitemap 与图标渲染。
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
      - GA4 与搜索 UI 离初始加载太近，必要功能与加载时机之间的边界并不清晰
      - 对 PageSpeed 剩余诊断的意义理解不够清晰，因此很难判断何时可以停手
      - 某些文章中残留的 UnoCSS icon class 会导致只显示空心圆
      - Search Console 中仍有无效面包屑和列表页索引噪音
  after:
    label: 改善后
    items:
      - 移动端与桌面端四项指标全部达到 100 分
      - 停用了 Cloudflare Web Analytics，同时保留 GA4 但改为延后加载
      - 搜索 UI 和 Pagefind 改为按需加载，减轻了初始负载
      - 图标渲染统一到共享 SVG Icon 组件，legacy 图标名通过 alias 兼容
      - breadcrumb、noindex、sitemap 与 canonical 已按 Search Console 的要求整理
      - 收益很低的追加优化被明确放弃，什么时候该停手也能说清楚了
checklist:
  title: 已完成的关键调整
  items:
    - text: 停用了 Cloudflare Web Analytics，并阻止 beacon 注入
      checked: true
    - text: 保留了 GA4，但改为通过 requestIdleCallback 与用户交互触发延后加载
      checked: true
    - text: 将搜索 UI 与 Pagefind 的脚本、样式移出初始加载路径
      checked: true
    - text: 确认了 PageSpeed Insights 移动端与桌面端四项全部 100 分
      checked: true
    - text: 读解网络依赖关系树，并整理出 BaseLayout.css 是唯一主要剩余瓶颈
      checked: true
    - text: 修正了 Search Console 的 breadcrumb 问题，并统一了 breadcrumb、canonical 与末尾斜杠处理
      checked: true
    - text: 通过 noindex 与 sitemap 排除，明确了 tag、archive、author 与 pagination 页面的索引策略
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
    - question: Search Console 方面具体修了什么？
      answer: '列表页的 BreadcrumbList 现在会输出带有有效 item URL 的明确面包屑项。同时也统一了末尾斜杠、canonical、noindex 与 sitemap，让标签、归档、作者、分页这类页面的索引角色更清晰。'
    - question: 有没有试过但最终没有采纳的优化？
      answer: '有。比如继续拆分 BaseLayout.css、为了让 network dependency tree 的显示本身消失而继续调整，甚至把 third-party 再缩到连 GA4 都要动的程度，这些方案都比较过。但在移动端 100 分已经稳定的前提下，它们带来的复杂度或测量损失大于实际收益，所以没有采纳。'
---

## 前言

在上一篇 [Astro 站点品质改善指南](/blog/website-improvement-batches/) 中，我总结了 Acecore 改版站点上进行的大规模改善。本文是那篇文章的续篇。

这篇文章继续收尾上一篇发布后仍然残留的细小问题，最终把站点推进到了 **PageSpeed Insights 移动端与桌面端四项指标全部 100 分** 的状态。而且，这次并不只是单纯调分，还包括把 GA4 与搜索移出初始加载路径、整理 Search Console 的面包屑与索引策略、稳定图标渲染，以及明确哪些优化已经不值得继续追了。

## PageSpeed Insights 全项目 100 分的结果

截至 2026 年 3 月 29 日，Acecore 首页已经确认获得以下结果。

| 测量面 | Performance | Accessibility | Best Practices | SEO     |
| ------ | ----------- | ------------- | -------------- | ------- |
| 移动端 | **100**     | **100**       | **100**        | **100** |
| 桌面端 | **100**     | **100**       | **100**        | **100** |

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

### 1. 停用 Cloudflare Web Analytics，并重新梳理测量角色

Cloudflare Web Analytics 作为 privacy-first、轻量级的 RUM 工具本身是有价值的，但在 Acecore 站点中，GA4 一侧已经广泛接入了 CTA、搜索、联系、lead 生成等事件测量。

因此这次重新审视两者分工后，我判断 Cloudflare 这边继续注入 beacon 带来的 PageSpeed 成本已经高于它的价值。于是我在控制台里关闭了 RUM，并确认生产环境 HTML 中已经不再出现 `static.cloudflareinsights.com/beacon.min.js`。

不过这并不等于放弃测量。CTA、外链点击、搜索与联系转化仍然需要被记录，因此下一步不是去掉 GA4，而是保留它并改变它的加载时机。

### 2. 保留 GA4，但把它移出初始加载路径

这里真正重要的区别，不只是“保留还是移除 GA4”，而是“保留以后是否还必须从一开始就加载”。

实际做法是，让 `gtag` 的入口仍然先存在，以便可以接收事件；而真正的 `gtag/js` 则推迟到 `requestIdleCallback` 或用户交互之后再加载。根据页面类型也设置了不同的兜底时间，避免用户完全不交互时 analytics 永远不加载。

这样一来，CTA、外链、搜索、联系等测量仍然保留，但第三方脚本执行不再被压进最早的渲染阶段。换句话说，这次 100 分不只是因为删掉了 Cloudflare beacon，也因为 GA4 的加载方式被重新设计过。

### 3. 将搜索 UI 与 Pagefind 改成按需加载

搜索也是一种即使用户不马上打开，也会悄悄拖累初始加载的功能。Acecore 使用 Pagefind 做全文搜索，这一轮对它也采取了同样的原则：功能要保留，但成本不要预先支付。

现在只有在真正打开搜索弹窗时，才会加载 `pagefind-ui.js` 与对应 CSS。Promise 会被缓存，避免重复加载，而快捷键和 query 参数唤起搜索的行为仍然正常工作。

这不仅仅是为了 Lighthouse 分数，也让日常首次渲染本身更轻。搜索还在，但它不再需要出现在每一次页面访问的关键路径上。

### 4. 正确解读 PageSpeed 剩余诊断

即使得分已经达到 100，PageSpeed 里仍然可能显示 `Network dependency tree` 或 `render-blocking resources` 等诊断。如果把这些都误解成必须完全消除的警告，就很容易陷入投入产出比极低的优化工作。

这次的关键链路大致如下：

1. `/en/`
2. `ClientRouter.js`
3. `BaseLayout.css`
4. `BaseLayout.js`

其中真正仍可视为 render-blocking 的，其实只剩下 `BaseLayout.css` 一项。不过它的体积已经足够小，移动端 100 分也依旧能够维持，因此我把它归类为“虽然仍在，但当前可以接受的诊断”。把这个判断明确写清楚，本身就是这次很重要的收获，因为它为之后的优化提供了清晰的停手标准。

### 5. Search Console 的面包屑与索引规则也一起整理

当 PageSpeed 已经稳定在 100 后，我又从搜索侧重新检查了一遍。就在那个阶段，Search Console 里仍然存在真实的不一致：FAQ 已经没有问题，但 breadcrumb 里还残留 invalid item。

为了解决这个问题，列表页的 `BreadcrumbList` 输出被改成可以传入明确的 breadcrumb 项，而不是只依赖 URL 路径去松散推断。与此同时，也统一了末尾斜杠处理，让 canonical、hreflang 与 breadcrumb URL 不再相互漂移。

另外，tag、archive、author、pagination 这些页面的索引角色也被明确了。它们作为站内导航是有价值的，但作为索引目标时很容易变成薄弱或重复的列表页。因此这类页面统一采用了 `noindex, follow`，并从 sitemap 中排除。这当然不会立刻让所有“已抓取 - 尚未编入索引”的报告归零，但至少意味着想要的索引策略已经直接写进了代码里。

### 6. 将图标渲染统一到共享 SVG 组件

这轮改善期间，项目已经在从 UnoCSS 的 icon utility 迁移到共享 SVG 基础的 `Icon` 组件。在这个过渡过程中，`ProcessFigure` 与 `StatBar` 里残留的动态 icon class 没有完全清理，导致部分文章里只显示空心圆。

我把组件侧的渲染统一成 `Icon`，并额外加入了一个 alias，把 legacy 名称 `check-circle` 吸收到 `circle-check`。

结果带来了三个实际收益：

- 不再容易因为遗漏动态 class 而让图标消失
- `aria-hidden` 等无障碍属性可以在 SVG 侧统一处理
- 不再依赖 UnoCSS 的静态分析，运维稳定性更高

同时，博客日期的解析与显示也统一到了 JST 基准。这不是本文最核心的主题，但对于同日文章的排序稳定性以及结构化数据里的时间精度，都是实际有帮助的补强。

### 7. 试过但没有采纳的方向

拿到 100 分之后，很容易继续去追那些还显示在诊断区里的项目，直到页面上什么都不剩。这次我也比较过几条这样的路线，但最终没有采纳。

- 继续细分 `BaseLayout.css`：诊断看起来也许会更干净一点，但现在移动端 100 分已经稳定，额外复杂度换来的实际收益太少。
- 把“让 `network dependency tree` 的显示彻底消失”当成目标：诊断还在显示，并不等于真实用户体验一定还有问题。
- 进一步压缩 third-party，甚至动到 GA4：页面也许会更轻一点，但会失去重要的业务事件测量能力。

正是这些比较，让这次最终调整真正算得上完成。并不是因为所有能删的都删掉了，而是因为剩下的取舍现在已经可以清楚地说明白。

## 这次改善带来的实践性收获

这一次最大的收获，其实不是单纯拿到了 100 分，而是进入了 **能够清楚说明什么必须删除、什么可以保留** 的状态。

例如，如果 Cloudflare Web Analytics 只是因为惯性而存在，那么它就值得被移除；而 GA4 仍然应该保留，因为它是业务事件测量的核心。但保留 GA4 并不意味着必须把它留在初始加载里，更好的做法是保留测量能力，同时改变脚本的加载时机。

同样的逻辑也适用于搜索和 SEO。搜索应该保留，但不必放进初始 payload。列表页仍然适合作为导航入口，但不必当作主要索引目标。至于 `network dependency tree`，它本身不是失败，关键仍是看剩下的链路是否合理。

这次我也借助 AI 把候选改动尽量铺开来看，但最终采用与否仍然只看三个标准：实测数据是不是真的变好了，运维成本有没有明显上升，必要的测量能力有没有被破坏。AI 帮助扩大了试验范围，最终拍板的仍然是实测和判断标准。

只盯着分数做优化，往往会越做越过头。这次我不仅整理了修复内容，也整理了“做到哪里该停”的边界，所以可以说 Acecore 站点的改善目前已经到了一个可以视为“完成”的阶段。

## 总结

作为上一篇文章的续篇，本次最终调整主要完成了以下内容：

- 确认了 PageSpeed Insights 移动端与桌面端四项全部 100 分
- 停用了 Cloudflare Web Analytics，同时保留 GA4 但改为延后加载
- 将搜索 UI 与 Pagefind 改成按需加载，减轻了初始负担
- 解读了剩余网络诊断，并明确哪些残留问题是可以接受的
- 整理了 Search Console 的面包屑输出与列表页索引策略
- 通过统一到共享 SVG `Icon` 组件解决了图标缺失显示问题
- 明确放弃收益很低的追加优化，并整理出合理的停手标准

至少从 Lighthouse 与 PageSpeed Insights 的角度来看，Acecore 站点已经打磨到了可以理直气壮冲击顶级速度的程度。不过分数本身不是目的，而只是结果。接下来，我也会继续在运营和改善两方面同时守住这个状态，避免它回退。
