---
title: '使用GitHub Copilot × Playwright对网站进行猴子测试的实践方法'
description: '结合VS Code的智能体模式（GitHub Copilot）和Playwright浏览器工具，对静态网站进行系统化猴子测试的实践记录。从测试设计思路到实际发现并修复的Bug、改进建议，全部公开。'
date: 2026-03-25
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: 本文的目标读者
  text: '适合对使用AI进行测试自动化感兴趣、希望提高网站质量保证效率、以及想要活用GitHub Copilot智能体模式的读者。'
processFigure:
  title: AI猴子测试的实施流程
  steps:
    - title: 资产盘点
      description: 全量阅读源代码，梳理出需要测试的路由、组件和交互功能。
      icon: i-lucide-clipboard-list
    - title: 巡回测试
      description: 向所有路由发送HTTP请求，检测状态码、损坏的图片和空链接。
      icon: i-lucide-globe
    - title: 交互验证
      description: 操作FAQ折叠、复制按钮、搜索模态框、YouTube嵌入等JS驱动的元素进行确认。
      icon: i-lucide-mouse-pointer-click
    - title: 结构与SEO审计
      description: 在所有页面验证结构化数据、OGP、Meta标签、标题层级和无障碍性。
      icon: i-lucide-shield-check
compareTable:
  title: 与手动测试的对比
  before:
    label: 传统手动测试
    items:
      - 在浏览器中逐页目视确认
      - 手动创建和管理检查清单
      - 容易出现遗漏
      - 记录复现步骤耗时较长
  after:
    label: AI猴子测试
    items:
      - 自动巡回所有路由，验证HTTP状态码和DOM结构
      - AI从源代码中自动提取测试对象
      - 零遗漏地检测损坏的图片、空链接和JS错误
      - 从发现到定位原因、修复、再验证均在同一会话内完成
faq:
  title: 常见问题
  items:
    - question: GitHub Copilot的智能体模式可以免费使用吗？
      answer: 'GitHub Copilot Free计划对智能体模式的使用有月度次数限制。Pro或Business计划的限制会放宽。在VS Code Insiders版中可以率先体验最新功能。'
    - question: 除了Playwright以外的浏览器工具也能实现同样的效果吗？
      answer: '我们使用的是VS Code内置浏览器工具（Simple Browser + Playwright集成）。Copilot通过run_playwright_code工具直接操作浏览器，因此无需另外安装Playwright。'
    - question: 除了静态网站以外也适用吗？
      answer: '可以。SPA和SSR网站也可以采用相同的方法。但对于需要登录认证的页面，需要建立安全管理测试认证信息的机制。'
    - question: 测试中发现的Bug也能交给AI修复吗？
      answer: '在智能体模式下可以读写文件，因此从Bug检测到修复、构建确认的整个流程都可以在同一会话内完成。本文中也发现了2个Bug并当场修复。'
---

## 前言

网站的质量保证仅靠发布前的一次检查是不够的。每次内容添加、库更新、CDN配置变更等操作，都可能产生意想不到的问题。

本文总结了 **VS Code的智能体模式（GitHub Copilot）** 直接操作浏览器，对整个网站进行猴子测试的实践记录。从源代码的静态分析到浏览器上的动态验证，系统地整理了AI一贯执行的测试方法。

---

## 测试环境

| 项目 | 内容 |
|------|------|
| 编辑器 | VS Code + GitHub Copilot（智能体模式） |
| AI模型 | Claude Opus 4.6 |
| 浏览器操作 | VS Code内置Playwright工具 |
| 测试对象 | Astro + UnoCSS + Cloudflare Pages 构成的静态网站 |
| 预览 | `npm run preview`（本地） + 生产URL |

在智能体模式下，Copilot会自主执行终端命令、文件读写和浏览器操作。测试人员只需下达"请进行测试"的指令，AI就会自动执行以下所有步骤。

---

## 阶段1：测试对象盘点

### 全量阅读源代码

AI首先遍历项目的目录结构，读取所有组件、页面和工具函数的源代码。

```
src/
├── components/    ← 全量阅读28个组件
├── content/blog/  ← 解析16篇文章的Front Matter
├── pages/         ← 掌握所有路由文件
├── layouts/       ← 理解BaseLayout的结构
└── utils/         ← 确认rehype插件和OG图片生成
```

在这个阶段，AI会自动掌握以下信息：

- **全部路由列表**：静态页面7个 + 博客相关路由（文章、标签、归档、作者、分页）
- **交互元素**：搜索模态框、FAQ折叠、复制按钮、YouTube门面模式、返回顶部、Hero轮播
- **外部集成**：ssgform.com（表单）、Cloudflare Turnstile（Bot防护）、Google AdSense、GA4

### 自动生成测试计划

根据源代码的分析结果，AI会自动生成Todo列表形式的测试计划。无需人工创建检查清单。

---

## 阶段2：全路由巡回测试

### HTTP状态码验证

通过 `npm run preview` 启动构建后的网站，使用Playwright访问所有路由。

```
测试对象：31个路由
├── 静态页面      7个（/, /about/, /services/ 等）
├── 博客文章     16个
├── 标签页面     24个
├── 归档页面      4个
├── 分页          2个（/blog/page/2/, /blog/page/3/）
├── 作者页面      2个
├── RSS           1个
└── 404测试       1个

结果：所有路由返回200 OK（有意的404除外）
```

### DOM结构检查

在每个页面自动验证以下内容：

| 检查项目 | 验证方法 | 结果 |
|-------------|---------|------|
| 损坏的图片 | `img.complete && img.naturalWidth === 0` | 0个 |
| 空链接 | `href` 为空、`#` 或未设置 | 0个 |
| 不安全的外部链接 | `target="_blank"` 缺少 `rel="noopener"` | 0个 |
| H1数量 | `document.querySelectorAll('h1').length === 1` | 所有页面OK |
| 跳过链接 | "跳至正文"的存在 | 所有页面OK |
| lang属性 | `html[lang="ja"]` | 所有页面OK |

### 死链检查

从起始页面递归收集内部链接，确认全部55个唯一URL均可访问。死链数量为**0个**。

---

## 阶段3：交互验证

AI使用Playwright直接操作浏览器元素，验证JavaScript驱动的功能。

### FAQ（`<details>` 元素）

```javascript
// AI执行的测试代码示例
const details = document.querySelectorAll('details');
// 初始状态：全部关闭 → OK
// 点击展开 → OK
// 再次点击关闭 → OK
```

### 搜索模态框（Pagefind）

1. 通过 `window.openSearch()` 打开搜索对话框
2. 等待Pagefind UI加载完成
3. 输入"Astro"确认搜索结果正常显示
4. 按ESC键确认关闭功能

### YouTube门面模式

1. 点击 `.yt-facade` 元素
2. 确认动态生成 `youtube-nocookie.com/embed/` 的iframe
3. 确认附带 `autoplay=1` 参数

### 复制按钮（View Transitions后）

确认在View Transitions页面跳转**之后**，代码块的复制按钮被重新初始化并正常工作。`astro:page-load` 事件的重新注册功能正常运行。

### 返回顶部按钮

滚动到页面底部 → 按钮显示 → 点击 → 确认 `window.scrollY` 回到0。

---

## 阶段4：SEO与结构化数据审计

### OGP Meta标签

在所有页面验证了以下内容：

- `og:title` / `og:description` / `og:image` / `og:url` / `og:type` 已设置
- `twitter:card` 设置为 `summary_large_image`
- `canonical` URL正确
- OG图片的URL存在且为推荐尺寸（1200×630）

### 结构化数据（JSON-LD）

解析各页面的JSON-LD，验证Schema类型和内容。

| 页面类型 | 结构化数据 |
|-------------|-------------|
| 所有页面通用 | Organization, WebSite |
| 博客文章 | BreadcrumbList, BlogPosting, FAQPage |
| 带FAQ的文章 | FAQPage（mainEntity包含问答内容） |

### 站点地图

确认 `sitemap-index.xml` → `sitemap-0.xml` 中注册了全部57个URL。`robots.txt` 中对站点地图的引用也正常。

---

## 阶段5：无障碍性验证

使用Playwright在多个页面执行了相当于AXE引擎的检查。

| 检查项目 | 目标页面数 | 违规数 |
|-------------|-------------|--------|
| img元素的alt属性 | 4 | 0 |
| button元素的标签 | 4 | 0 |
| 标题层级（h1→h2→h3的顺序） | 4 | 0 |
| 表单input的label | 1（联系我们） | 0 |
| 地标元素 | 4 | 0 |
| 外部链接的rel属性 | 4 | 0 |
| tabindex值的合理性 | 4 | 0 |

**全部4个页面、所有检查项目均零违规**。

---

## 阶段6：View Transitions跳转测试

Astro View Transitions的页面跳转会通过DOM差分更新，因此JavaScript的重新初始化成为一个课题。验证了以下跳转模式：

```
首页 → 博客列表 → 文章 → 标签 → 作者 → 联系方式 → 服务 → 首页
```

每次跳转后确认的项目：

- URL、标题、H1正确更新
- 搜索按钮正常工作
- 复制按钮重新初始化
- 面包屑导航更新
- **JS错误为零**

---

## 阶段7：安全头部验证

对生产网站的响应头部进行了验证：

| 头部 | 值 | 评价 |
|---------|-----|------|
| Content-Security-Policy | 已完整配置 | ◎ |
| X-Frame-Options | SAMEORIGIN | ◎ |
| X-Content-Type-Options | nosniff | ◎ |
| Strict-Transport-Security | max-age=15552000 | ○ |
| Referrer-Policy | strict-origin-when-cross-origin | ◎ |
| Permissions-Policy | geolocation=(), camera=() 等 | ◎ |

---

## 发现的Bug与修复

本次测试发现了2个Bug，并在会话内完成了修复。

### Bug 1：搜索模态框的弹性不足

**症状**：在Pagefind脚本加载完成前点击搜索按钮，UI无响应。

**原因**：`loadPagefindScript()` 一旦失败后没有重试机制。

**修复**：失败时清除Promise缓存，向用户显示"重新加载"按钮的回退UI。

### Bug 2：CSP头部缺少Google系来源

**症状**：Google AdSense相关资源被CSP阻止，控制台显示错误。

**原因**：`connect-src` 和 `frame-src` 中缺少 `https://www.google.com` / `https://www.google.co.jp`。

**修复**：在 `public/_headers` 的CSP指令中添加了Google系来源。

---

## 测试方法的体系化

将此AI猴子测试方法进行整理，可以分为以下层次：

### 层次1：静态分析（源代码读取）

- 目录结构遍历
- 组件依赖关系把握
- Front Matter Schema（Zod）解析
- CSP和重定向配置确认

### 层次2：HTTP层测试（全路由巡回）

- 状态码验证（200/404/301）
- 响应头部审计（安全、缓存）
- 站点地图、robots.txt、ads.txt的一致性

### 层次3：DOM层测试（结构验证）

- 损坏的图片、空链接、不安全的外部链接
- H1的唯一性、标题层级
- Meta标签（OGP、canonical、description）
- 结构化数据（JSON-LD）

### 层次4：交互层测试（动作验证）

- 点击、输入、键盘操作
- 模态框开关、表单验证
- View Transitions后的JS重新初始化
- 滚动事件、延迟加载

### 层次5：无障碍层测试

- alt属性、标签、ARIA
- 标题层级、地标元素
- 焦点管理、tabindex
- 跳过链接

---

## 局限与限制

AI猴子测试存在一些局限：

| 局限 | 详细说明 |
|------|------|
| 视口模拟 | VS Code内置浏览器无法模拟移动端宽度。CSS的正确性通过构建输出的静态分析来替代验证 |
| 网络状态 | 无法模拟离线或低速网络。Service Worker的测试也不在范围内 |
| 用户"感觉" | 设计的美观度、可读性、与品牌的一致性需要人工判断 |
| 认证流程 | 需要登录的页面需要另外建立安全管理认证信息的机制 |

CSS的响应式适配通过直接分析构建输出的CSS文件，确认 `@media(min-width:768px)` 的媒体查询正确生成来替代验证。

---

## 总结

GitHub Copilot的智能体模式可以仅凭"请进行测试"这一句话，就完成从源代码分析→测试计划→浏览器自动操作→Bug修复→再验证的整个QA循环。

本次的成果总结如下：

- **测试对象**：31路由 + 24标签 + 4归档 + 2分页 = 61个路由
- **测试项目**：HTTP状态码、DOM结构、交互、SEO、无障碍性、安全性、View Transitions
- **发现Bug**：2个（搜索模态框、CSP头部）→ 当场修复
- **无障碍性违规**：0个
- **死链**：0个

将人工目视确认与AI自动验证相结合，可以同时实现测试的覆盖率和效率。
