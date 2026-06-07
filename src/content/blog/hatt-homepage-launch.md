---
title: 'Hattのホームページを公開しました'
description: '絵、小説、VRChat向け3Dアバター・ギミック制作をまとめる「Hattのホームページ」を公開しました。Astro、Sveltia CMS、Pagefindを使い、創作活動を継続して発信できる個人サイトとして設計しています。'
date: 2026-06-06T10:00
author: gui
tags: ['お知らせ', 'Web制作', 'Webサイト', 'CMS', 'Astro']
image: /uploads/hatt-homepage-screenshot-1600.webp
callout:
  type: info
  title: 公開サイト
  text: 'Hattのホームページは https://hatt.acecore.net/ で公開中です。絵、小説、VRChat向け3Dアバター・ギミック制作を一つの入口にまとめています。'
processFigure:
  title: 制作で整理した導線
  steps:
    - title: 活動整理
      description: 絵、小説、モデリングの3本柱に分類。
      icon: i-lucide-layout-grid
    - title: CMS化
      description: ブログや作品情報をSveltia CMSで更新可能に。
      icon: i-lucide-file-pen-line
    - title: 検索導入
      description: Pagefindで記事や作品を探しやすく。
      icon: i-lucide-search
    - title: 外部連携
      description: YouTube、X、BOOTHへの導線を整理。
      icon: i-lucide-external-link
insightGrid:
  title: Hattサイトの主な構成
  items:
    - title: 絵
      description: キャラクターや世界観のメモを、記事や作品として残せる導線を用意しました。
      icon: i-lucide-palette
      tone: brand
    - title: 小説
      description: 投稿サイトで公開している物語への入口と、創作まわりの記録をまとめています。
      icon: i-lucide-book-open
      tone: amber
    - title: モデリング
      description: VRChat向けのアバター、ギミック、アクセサリー制作をBOOTHやYouTubeと接続しています。
      icon: i-lucide-box
      tone: emerald
linkCards:
  - href: https://hatt.acecore.net/
    title: Hattのホームページ
    description: 公開中のHatt公式サイトです。
    icon: i-lucide-external-link
  - href: /works/#case-hatt-homepage
    title: Hattのホームページ制作実績
    description: Acecoreの実績ページにも制作事例として掲載しています。
    icon: i-lucide-briefcase-business
  - href: /services/#web
    title: Webサイト制作・運用
    description: 個人サイト、ポートフォリオ、事業サイトの制作相談はこちら。
    icon: i-lucide-globe
faq:
  title: よくある質問
  items:
    - question: Hattのホームページでは何を見られますか？
      answer: 絵、小説、VRChat向け3Dアバター・ギミック制作、プロフィール、外部活動へのリンクをまとめています。
    - question: サイトはどんな技術で作られていますか？
      answer: Astro、TypeScript、UnoCSS、Sveltia CMS、Pagefindを使った静的サイトとして構築しています。
    - question: Acecoreでは個人サイトやポートフォリオサイトも相談できますか？
      answer: はい。活動内容の整理、デザイン、CMS、検索、SEO、公開後の更新導線までまとめて相談できます。
---

Hattの創作活動をまとめる個人サイト「[Hattのホームページ](https://hatt.acecore.net/)」を公開しました。

このサイトは、絵、小説、VRChat向け3Dアバター・ギミック制作を一つの入口にまとめるためのホームページです。Acecoreの[実績ページ](/works/#case-hatt-homepage)にも、Web制作・CMS構築の事例として掲載しました。

## 制作の背景

Hattは、絵や小説、VRChat向けの3Dアバター・ギミック制作など、複数の創作活動を行っています。

一方で、活動の入口はブログ、外部投稿サイト、BOOTH、YouTube、Xなどに分かれていました。すでに作品や発信先はあるものの、初めて訪れた人が「Hattが何を作っているのか」「どこから見ればよいのか」を短時間で把握しにくい状態でした。

そこで今回は、作品をすべて一つのページに詰め込むのではなく、活動の全体像を見せるハブとしてサイトを設計しました。

## 3つの活動をトップページで見せる

トップページでは、Hattの活動を次の3つに整理しています。

- **絵**：キャラクターや世界観のメモを、記事や作品として残していく場所
- **小説**：投稿サイトで公開している物語への入口と、創作まわりの記録
- **モデリング**：VRChat向けのアバター、ギミック、アクセサリー制作の紹介

「何をしている人なのか」を先に伝え、その後にブログ、モデリング作品、プロフィール、外部リンクへ進める構成です。個人サイトでは、見た目の印象だけでなく、活動の分類と導線設計が重要になります。

## 更新し続けられる静的サイトにする

構築には、Astro、TypeScript、UnoCSS、Sveltia CMS、Pagefindを使っています。

Astroで静的サイトとして配信することで、表示速度と保守性を確保しました。ブログや作品情報はCMSから編集できるようにし、コードを書かなくても発信を継続しやすい構成にしています。

サイト内検索にはPagefindを組み込みました。記事や作品が増えても、訪問者がキーワードから目的の情報へたどり着けるようにするためです。

AstroサイトでSEOやOGPを整える考え方は、[Astroサイトに構造化データとOGPを実装するSEO改善ガイド](/blog/astro-seo-and-structured-data/)でも紹介しています。

## 外部の活動場所も分断しない

Hattの活動は、サイト内だけで完結するものではありません。小説投稿サイト、BOOTH、YouTube、Xなど、作品ごとに適した公開場所があります。

そのため、ホームページ側では外部サービスを置き換えるのではなく、入口としてつなぐ方針にしました。たとえば、モデリングページではBOOTHで公開しているアバターやギミックに移動しやすくし、YouTubeやXへのリンクも整理しています。

個人サイトやポートフォリオサイトでは、すでにある外部アカウントを無理に統合するよりも、訪問者が迷わず移動できる導線を作るほうが効果的な場合があります。

## 実績としても掲載しました

Acecoreの[実績・ポートフォリオ](/works/)には、「Hattのホームページ制作」として事例を追加しました。

今回の制作は、単にページを公開するだけでなく、創作活動の整理、CMSでの更新、検索、OGP、サイトマップ、外部リンク設計まで含めたWeb制作です。小規模な個人サイトでも、公開後に育てられる構成にしておくことで、作品や記事が増えたときの価値が上がります。

ホームページ制作の進め方や費用感は、[ホームページ制作の費用相場と見積もりで見るべきポイント](/blog/homepage-production-cost-guide/)にもまとめています。

## まとめ

Hattのホームページは、絵、小説、VRChat向け3Dアバター・ギミック制作をまとめる創作活動の入口として公開しました。

Acecoreでは、個人サイト、ポートフォリオサイト、事業サイトなど、目的に合わせたWebサイト制作を行っています。活動内容の整理からCMS、検索、SEO、公開後の運用までまとめて相談したい場合は、[Webサイト制作・運用サービス](/services/#web)または[お問い合わせ](/contact/)からご相談ください。
