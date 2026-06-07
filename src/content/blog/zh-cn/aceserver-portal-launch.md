---
title: 'Aceserver 门户网站已公开'
description: '我们公开了 Aceserver 的官方门户网站。Aceserver 是任何人都可以参加的免费 Minecraft 公共服务器。网站使用 Astro、UnoCSS 和 Sveltia CMS 构建，将服务器介绍、视频、世界地图、Wiki 和 Discord 入口整理到一个位置。'
date: 2026-06-07T10:00
author: gui
tags: ['お知らせ', 'Web制作', 'Webサイト', 'CMS', 'Astro', 'インフラ']
image: /uploads/acecore-generated/web-production-desk.webp
callout:
  type: info
  title: 公开网站
  text: 'Aceserver 门户网站已在 https://asv.acecore.net/ 公开。它汇总了免费 Minecraft 公共服务器的参加说明、视频、世界地图和 Wiki 链接。'
processFigure:
  title: 门户中整理的访问路径
  steps:
    - title: 服务器介绍
      description: 面向初次访问的人清楚介绍 Aceserver。
      icon: i-lucide-server
    - title: 参加入口
      description: 将 Discord 参加按钮放在容易发现的位置。
      icon: i-lucide-message-circle
    - title: 地图入口
      description: 方便前往主世界、资源世界和 RPG 世界地图。
      icon: i-lucide-map
    - title: CMS 运用
      description: 页面内容和站点设置可以通过 Sveltia CMS 更新。
      icon: i-lucide-file-pen-line
insightGrid:
  title: Aceserver 门户的主要构成
  items:
    - title: 首页
      description: 用简洁入口展示服务器概要、Java 与基岩版支持以及参加方法。
      icon: i-lucide-home
      tone: brand
    - title: 世界地图
      description: 通过独立页面引导到主世界、资源世界和 RPG 世界。
      icon: i-lucide-map
      tone: emerald
    - title: Wiki 与视频
      description: 需要查看细节或氛围时，可以自然前往 Wiki 和视频页面。
      icon: i-lucide-book-open
      tone: amber
linkCards:
  - href: https://asv.acecore.net/
    title: Aceserver 门户
    description: 正在公开的 Aceserver 官方门户网站。
    icon: i-lucide-external-link
  - href: /zh-cn/works/#case-aceserver-portal
    title: Aceserver 门户制作案例
    description: 也作为制作案例刊登在 Acecore 的实绩页面。
    icon: i-lucide-briefcase-business
  - href: /zh-cn/works/#case-aceserver
    title: Aceserver 公共服务器运用
    description: 服务器运用和社区相关案例在这里查看。
    icon: i-lucide-server-cog
  - href: /zh-cn/services/#web
    title: 网站制作与运营
    description: 可咨询门户网站、信息整理和网站运营。
    icon: i-lucide-globe
faq:
  title: 常见问题
  items:
    - question: Aceserver 门户中可以看到什么？
      answer: 可以查看 Aceserver 概要、参加入口、视频页面、主世界、资源世界和 RPG 世界地图，以及 Wiki 链接。
    - question: 网站使用了哪些技术？
      answer: 网站作为静态站点构建，使用 Astro、UnoCSS 和 Sveltia CMS。站点地图也通过 Astro 集成生成。
    - question: 与已有的 Aceserver 运用案例有什么不同？
      answer: 已有案例介绍公共服务器本身的稳定运用和社区管理。本案例聚焦于面向参加者整理信息入口的门户网站制作。
---

我们公开了 [Aceserver](https://asv.acecore.net/) 的官方门户网站。Aceserver 是任何人都可以参加的免费 Minecraft 公共服务器。

Aceserver 支持 Java 版和基岩版。新的门户将服务器概要、参加说明、视频、世界地图和 Wiki 访问路径整理到一个入口中。它也作为网站制作与社区门户案例，刊登在 Acecore 的[实绩页面](/zh-cn/works/#case-aceserver-portal)。

## 制作背景

参加 Aceserver 之前，访问者需要了解很多信息：这是什么服务器、如何参加、有哪些世界、规则和详细说明在哪里维护。

如果这些信息分散在 Discord、Wiki、视频和世界地图中，初次访问的人很难判断从哪里开始。因此这次并不是替代既有信息源，而是制作一个连接这些信息的入口。

## 参加前的一站式入口

首页将 Aceserver 说明为任何人都可以参加的免费 Minecraft 公共服务器。随后介绍 Java 版与基岩版都可以参加、服务器接近原版自由玩法，以及参加要从官方 Discord 开始。

我们没有把所有细节都放进同一个页面，而是优先让访问者能判断下一步行动。规则和持续更新的信息则继续连接到 Wiki 和 Discord。

## 连接视频、地图和 Wiki

门户中设置了前往视频页面和世界地图的路径。世界地图按主世界、资源世界和 RPG 世界分开，访问者可以快速前往目标页面。

Wiki 链接也可以从首页进入。会持续变化的信息更适合在 Wiki 中维护，门户则负责提供稳定入口。

## 可以持续用 CMS 更新

网站使用 Astro、UnoCSS 和 Sveltia CMS 构建。Astro 以静态站点形式发布，UnoCSS 让样式保持轻量。页面正文和站点设置可以从 CMS 编辑，因此公告和导航可以不改代码就更新。

关于轻量 CMS 运用的思路，可以参考[使用 Sveltia CMS 和 Cloudflare Turnstile 的轻量 CMS 运用](/zh-cn/blog/cms-selection-and-turnstile/)。静态网站性能改善可以参考[改善 Astro 网站显示速度的实践指南](/zh-cn/blog/astro-performance-tuning/)。

## 也作为实绩刊登

Acecore 的[实绩・作品集页面](/zh-cn/works/)中新增了“Aceserver 门户制作”案例。

已有的 [Aceserver 公共服务器运用](/zh-cn/works/#case-aceserver)案例介绍服务器本身的稳定运用和社区管理。这次的新案例则聚焦于面向玩家的信息整理和入口设计。

对于门户网站、社区网站和服务网站，如果信息分布在多个地方，比起把所有内容强行放到一页，更重要的是整理出最先应该访问的入口。

## 总结

Aceserver 门户已经作为连接服务器概要、参加入口、视频、世界地图和 Wiki 的入口公开。

Acecore 支持网站制作、CMS 构建、服务器运用和面向社区的信息设计。如果想咨询门户网站或既有信息整理，请从[网站制作与运营服务](/zh-cn/services/#web)或[联系方式](/zh-cn/contact/)联系我们。
