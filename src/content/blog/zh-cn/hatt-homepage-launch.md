---
title: 'Hatt 的主页已公开'
description: '我们公开了“Hatt 的主页”，这是一个汇总绘画、小说以及面向 VRChat 的 3D 头像和机关制作的个人网站。网站使用 Astro、Sveltia CMS 和 Pagefind 构建，设计目标是让创作活动能够持续发布和积累。'
date: 2026-06-06T10:00
author: gui
tags: ['お知らせ', 'Web制作', 'Webサイト', 'CMS', 'Astro']
image: /uploads/hatt-homepage-screenshot.png
callout:
  type: info
  title: 公开网站
  text: 'Hatt 的主页已在 https://hatt.acecore.net/ 公开。它把绘画、小说以及面向 VRChat 的 3D 头像和机关制作整理到同一个入口。'
processFigure:
  title: 制作中整理的访问路径
  steps:
    - title: 活动整理
      description: 将内容分为绘画、小说、建模三大支柱。
      icon: i-lucide-layout-grid
    - title: CMS 化
      description: 让博客和作品信息可以通过 Sveltia CMS 更新。
      icon: i-lucide-file-pen-line
    - title: 导入搜索
      description: 使用 Pagefind，让文章和作品更容易查找。
      icon: i-lucide-search
    - title: 外部联动
      description: 整理前往 YouTube、X、BOOTH 的路径。
      icon: i-lucide-external-link
insightGrid:
  title: Hatt 网站的主要构成
  items:
    - title: 绘画
      description: 准备了将角色和世界观记录作为文章或作品留下来的路径。
      icon: i-lucide-palette
      tone: brand
    - title: 小说
      description: 汇总了前往外部投稿网站上公开故事的入口，以及创作相关记录。
      icon: i-lucide-book-open
      tone: amber
    - title: 建模
      description: 将面向 VRChat 的头像、机关和配件制作与 BOOTH、YouTube 连接起来。
      icon: i-lucide-box
      tone: emerald
linkCards:
  - href: https://hatt.acecore.net/
    title: Hatt 的主页
    description: 正在公开的 Hatt 官方网站。
    icon: i-lucide-external-link
  - href: /zh-cn/works/#case-hatt-homepage
    title: Hatt 主页制作案例
    description: 也作为制作案例刊登在 Acecore 的实绩页面。
    icon: i-lucide-briefcase-business
  - href: /zh-cn/services/#web
    title: 网站制作与运营
    description: 个人网站、作品集网站、业务网站的制作咨询入口。
    icon: i-lucide-globe
faq:
  title: 常见问题
  items:
    - question: 在 Hatt 的主页可以看到什么？
      answer: 可以看到绘画、小说、面向 VRChat 的 3D 头像和机关制作、个人资料，以及前往外部活动平台的链接。
    - question: 网站使用了哪些技术？
      answer: 网站作为静态站点构建，使用 Astro、TypeScript、UnoCSS、Sveltia CMS 和 Pagefind。
    - question: Acecore 也可以咨询个人网站或作品集网站吗？
      answer: 可以。我们可以从活动内容整理、设计、CMS、搜索、SEO 到公开后的更新路径进行整体咨询。
---

我们公开了汇总 Hatt 创作活动的个人网站「[Hatt 的主页](https://hatt.acecore.net/)」。

这个网站是把绘画、小说以及面向 VRChat 的 3D 头像和机关制作整理到一个入口的主页。我们也将它作为网站制作和 CMS 构建案例，刊登在 Acecore 的[实绩页面](/zh-cn/works/#case-hatt-homepage)。

## 制作背景

Hatt 正在进行绘画、小说、面向 VRChat 的 3D 头像和机关制作等多种创作活动。

另一方面，活动入口分散在博客、外部投稿网站、BOOTH、YouTube、X 等平台。作品和发布渠道已经存在，但初次访问的人很难在短时间内理解“Hatt 在做什么”“应该从哪里开始看”。

因此，这次并不是把所有作品塞进一个页面，而是把网站设计成能够展示整体活动面貌的枢纽。

## 在首页展示三类活动

首页将 Hatt 的活动整理为以下三类。

- **绘画**：把角色和世界观记录作为文章或作品保留下来的地方
- **小说**：前往外部投稿网站上公开故事的入口，以及创作相关记录
- **建模**：介绍面向 VRChat 的头像、机关、配件制作

先传达“这是在做什么的人”，再引导到博客、建模作品、个人资料和外部链接。对于个人网站来说，不只是第一印象，活动分类和访问路径设计也很重要。

## 做成可以持续更新的静态网站

构建时使用了 Astro、TypeScript、UnoCSS、Sveltia CMS 和 Pagefind。

通过 Astro 以静态网站形式发布，可以兼顾显示速度和维护性。博客和作品信息可以从 CMS 编辑，即使不写代码也能持续发布。

站内搜索使用 Pagefind。即使文章和作品数量增加，访问者也可以通过关键词找到目标信息。

关于在 Astro 网站中整理 SEO 和 OGP 的思路，也可以参考[在 Astro 网站实现结构化数据和 OGP 的 SEO 改善指南](/zh-cn/blog/astro-seo-and-structured-data/)。

## 不割裂外部活动平台

Hatt 的活动并不只在站内完成。小说投稿网站、BOOTH、YouTube、X 等，每种作品都有适合的公开平台。

因此，主页并不是替代这些外部服务，而是作为入口把它们连接起来。例如在建模页面中，访问者可以更容易前往 BOOTH 上公开的头像和机关，也能找到 YouTube 和 X 的链接。

对于个人网站和作品集网站，有时比起强行整合已有外部账号，更有效的是设计一条让访问者不迷路的移动路径。

## 也作为实绩刊登

Acecore 的[实绩・作品集页面](/zh-cn/works/)中，也新增了“Hatt 主页制作”这一案例。

这次制作不只是公开页面，还包括创作活动整理、CMS 更新、搜索、OGP、站点地图和外部链接设计。即使是小规模个人网站，只要在公开后也能持续成长，未来作品和文章增加时的价值也会提高。

关于网站制作的推进方式，可以查看[网站制作与运营服务](/zh-cn/services/#web)，或从[联系方式](/zh-cn/contact/)咨询。

## 总结

Hatt 的主页已作为汇总绘画、小说、面向 VRChat 的 3D 头像和机关制作的创作活动入口公开。

Acecore 可以根据目的制作个人网站、作品集网站和业务网站。如果希望从活动内容整理到 CMS、搜索、SEO、公开后的运营一起咨询，请通过[网站制作与运营服务](/zh-cn/services/#web)或[联系方式](/zh-cn/contact/)联系我们。
