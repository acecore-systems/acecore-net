---
title: 'エースサーバーポータルを公開しました'
description: '誰でも参加可能なMinecraft無料公開サーバー「エースサーバー」の公式ポータルを公開しました。Astro、UnoCSS、Sveltia CMSを使い、サーバー紹介、動画、ワールドマップ、Wiki、Discord導線を一つの入口に整理しています。'
date: 2026-06-07T10:00
author: gui
tags: ['お知らせ', 'Web制作', 'Webサイト', 'CMS', 'Astro', 'インフラ']
image: /uploads/aceserver-portal-screenshot-1600.webp
callout:
  type: info
  title: 公開サイト
  text: 'エースサーバーポータルは https://asv.acecore.net/ で公開中です。誰でも参加可能なMinecraft無料公開サーバーの入口として、参加案内、動画、ワールドマップ、Wikiへの導線をまとめています。'
processFigure:
  title: ポータルで整理した導線
  steps:
    - title: サーバー紹介
      description: 初めて訪れる人に向けて、エースサーバーの概要を整理。
      icon: i-lucide-server
    - title: 参加導線
      description: Discordへの参加ボタンを目立つ位置に配置。
      icon: i-lucide-message-circle
    - title: マップ導線
      description: メイン、資源、RPGの各ワールドマップへ移動しやすく。
      icon: i-lucide-map
    - title: CMS運用
      description: ページ本文やサイト設定をSveltia CMSから更新可能に。
      icon: i-lucide-file-pen-line
insightGrid:
  title: エースサーバーポータルの主な構成
  items:
    - title: トップページ
      description: サーバー概要、Java版・統合版対応、参加方法を短時間で把握できる入口です。
      icon: i-lucide-home
      tone: brand
    - title: ワールドマップ
      description: メイン、資源、RPGの各ワールドを個別ページから確認できるようにしています。
      icon: i-lucide-map
      tone: emerald
    - title: Wiki・動画
      description: 調べものや雰囲気確認に進めるよう、Wikiと動画ページへの導線を整理しています。
      icon: i-lucide-book-open
      tone: amber
linkCards:
  - href: https://asv.acecore.net/
    title: エースサーバーポータル
    description: 公開中のエースサーバー公式ポータルです。
    icon: i-lucide-external-link
  - href: /works/#case-aceserver-portal
    title: エースサーバーポータル制作実績
    description: Acecoreの実績ページにも制作事例として掲載しています。
    icon: i-lucide-briefcase-business
  - href: /works/#case-aceserver
    title: Aceserverの公開サーバー運用
    description: サーバー運用・コミュニティ面の実績はこちらです。
    icon: i-lucide-server-cog
  - href: /services/#web
    title: Webサイト制作・運用
    description: ポータルサイトや情報整理を含むWeb制作の相談はこちら。
    icon: i-lucide-globe
faq:
  title: よくある質問
  items:
    - question: エースサーバーポータルでは何を見られますか？
      answer: エースサーバーの概要、参加導線、動画ページ、メイン・資源・RPGの各ワールドマップ、Wikiへのリンクを確認できます。
    - question: サイトはどんな技術で作られていますか？
      answer: Astro、UnoCSS、Sveltia CMSを使った静的サイトとして構築しています。サイトマップもAstro連携で生成しています。
    - question: 既存のAceserver運用実績とは何が違いますか？
      answer: 既存の実績は公開サーバーそのものの運用知見を扱っています。今回の実績は、参加者向けの入口を整理するポータルサイト制作として掲載しています。
---

誰でも参加可能なMinecraft無料公開サーバー「[エースサーバー](https://asv.acecore.net/)」の公式ポータルを公開しました。

エースサーバーは、Java版・統合版のどちらでも遊べる公開サーバーです。今回のポータルでは、サーバーの概要、参加案内、動画、ワールドマップ、Wikiへの導線を一つの入口にまとめました。Acecoreの[実績・ポートフォリオ](/works/#case-aceserver-portal)にも、Web制作・コミュニティポータルの事例として掲載しています。

## 制作の背景

エースサーバーには、参加前に見たい情報が複数あります。どんなサーバーなのか、どうやって参加するのか、どんなワールドがあるのか、ルールや詳細はどこで確認するのか。これらの情報がDiscord、Wiki、動画、ワールドマップに分かれていると、初めて訪れた人は最初の一歩を選びにくくなります。

そこで今回は、既存の情報源を置き換えるのではなく、迷わず移動できる入口としてポータルを設計しました。

## 参加前に必要な情報を一つの入口へ

トップページでは、エースサーバーの説明を「誰でも参加可能なマインクラフト無料公開サーバー」として短く伝えています。続いて、Java版・統合版のどちらでも遊べること、バニラに近い自由なサーバーであること、参加するには公式Discordへ進むことを順に案内しています。

情報量を増やしすぎるよりも、初見の訪問者が「ここから参加すればよい」と判断できることを優先しました。詳細なルールや継続的な情報更新はWikiやDiscordにつなぎ、ポータルは導線の整理に集中しています。

## 動画、ワールドマップ、Wikiを分断しない

ポータルには、動画ページとワールドマップへの導線も置いています。ワールドマップはメイン、資源、RPGの各ワールドを分け、目的のマップへ移動しやすい構成にしました。

また、Wikiへのリンクもトップページからたどれるようにしています。遊び方やルールのように更新され続ける情報は、ポータルに固定で抱え込むよりも、Wiki側へ自然に案内するほうが運用しやすくなります。

## CMSで更新し続けられる構成にする

構築には、Astro、UnoCSS、Sveltia CMSを使っています。Astroで静的サイトとして配信し、UnoCSSで必要なスタイルを軽量にまとめました。ページ本文やサイト設定はSveltia CMSの管理画面から編集できるため、コードを触らずに告知や導線を更新できます。

CMSを選ぶときの考え方は、[Sveltia CMS導入ガイド](/blog/cms-selection-and-turnstile/)でも紹介しています。静的サイトの表示速度や運用面については、[Astroサイトの表示速度を改善する実践ガイド](/blog/astro-performance-tuning/)も参考になります。

## 実績としても掲載しました

Acecoreの[実績・ポートフォリオ](/works/)には、「エースサーバーポータル制作」として事例を追加しました。

既存の[Aceserverの公開サーバー運用](/works/#case-aceserver)は、公開サーバーそのものの安定運用やコミュニティ運営に関する事例です。今回のポータル制作は、参加者向けの情報整理と入口設計を扱う別の実績として掲載しています。

ポータルサイト、コミュニティサイト、サービスサイトなど、情報が複数の場所に分かれているWebサイトでは、すべてを一箇所に集めるよりも「最初に見るべき入口」を整えることが重要です。

## まとめ

エースサーバーポータルは、サーバー概要、参加導線、動画、ワールドマップ、Wikiをつなぐ入口として公開しました。

Acecoreでは、Webサイト制作、CMS構築、サーバー運用、コミュニティ向け導線整理をまとめて支援しています。ポータルサイトや既存情報の整理を相談したい場合は、[Webサイト制作・運用サービス](/services/#web)または[お問い合わせ](/contact/)からご相談ください。
