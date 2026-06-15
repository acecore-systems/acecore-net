---
title: 'Aceserver 포털을 공개했습니다'
description: '누구나 참여할 수 있는 무료 Minecraft 공개 서버 Aceserver의 공식 포털을 공개했습니다. Astro, UnoCSS, Sveltia CMS로 구축하고 서버 소개, 영상, 월드 맵, Wiki, Discord 참여 동선을 하나의 입구로 정리했습니다.'
date: 2026-06-07T10:00
author: gui
tags: ['お知らせ', 'Web制作', 'Webサイト', 'CMS', 'Astro', 'インフラ']
image: /uploads/aceserver-portal-screenshot-1600.webp
callout:
  type: info
  title: 공개 사이트
  text: 'Aceserver 포털은 https://asv.acecore.net/ 에서 공개 중입니다. 무료 Minecraft 공개 서버의 참여 안내, 영상, 월드 맵, Wiki 링크를 한곳에 모았습니다.'
processFigure:
  title: 포털에서 정리한 동선
  steps:
    - title: 서버 소개
      description: 처음 방문한 사람도 Aceserver를 쉽게 이해하도록 소개합니다.
      icon: i-lucide-server
    - title: 참여 동선
      description: Discord 참여 버튼을 찾기 쉬운 위치에 배치했습니다.
      icon: i-lucide-message-circle
    - title: 맵 동선
      description: 메인, 자원, RPG 월드 맵으로 이동하기 쉽게 정리했습니다.
      icon: i-lucide-map
    - title: CMS 운영
      description: 페이지 내용과 사이트 설정을 Sveltia CMS에서 업데이트할 수 있습니다.
      icon: i-lucide-file-pen-line
insightGrid:
  title: Aceserver 포털의 주요 구성
  items:
    - title: 첫 화면
      description: 서버 개요, Java 및 Bedrock 지원, 참여 방법을 짧게 파악할 수 있는 입구입니다.
      icon: i-lucide-home
      tone: brand
    - title: 월드 맵
      description: 메인, 자원, RPG 월드를 개별 페이지에서 확인할 수 있도록 안내합니다.
      icon: i-lucide-map
      tone: emerald
    - title: Wiki와 영상
      description: 자세한 정보나 분위기를 보고 싶을 때 Wiki와 영상 페이지로 자연스럽게 이동할 수 있습니다.
      icon: i-lucide-book-open
      tone: amber
linkCards:
  - href: https://asv.acecore.net/
    title: Aceserver 포털
    description: 공개 중인 Aceserver 공식 포털입니다.
    icon: i-lucide-external-link
  - href: https://systems.acecore.net/works/#case-aceserver-portal
    title: Aceserver 포털 제작 사례
    description: Acecore 실적 페이지에도 제작 사례로 등록했습니다.
    icon: i-lucide-briefcase-business
  - href: https://systems.acecore.net/works/#case-aceserver
    title: Aceserver 공개 서버 운영
    description: 서버 운영과 커뮤니티 관련 사례입니다.
    icon: i-lucide-server-cog
  - href: /ko/services/#web
    title: 웹사이트 제작 및 운영
    description: 포털 사이트, 정보 정리, 웹 운영 상담을 받을 수 있습니다.
    icon: i-lucide-globe
faq:
  title: 자주 묻는 질문
  items:
    - question: Aceserver 포털에서는 무엇을 볼 수 있나요?
      answer: Aceserver 개요, 참여 동선, 영상 페이지, 메인, 자원, RPG 월드 맵, Wiki 링크를 확인할 수 있습니다.
    - question: 사이트는 어떤 기술로 만들어졌나요?
      answer: Astro, UnoCSS, Sveltia CMS를 사용한 정적 사이트입니다. 사이트맵도 Astro 연동으로 생성합니다.
    - question: 기존 Aceserver 운영 사례와 무엇이 다른가요?
      answer: 기존 사례는 공개 서버 자체의 안정 운영과 커뮤니티 운영을 다룹니다. 이번 사례는 참여자를 위한 정보 입구를 정리한 포털 제작에 초점을 둡니다.
---

누구나 참여할 수 있는 무료 Minecraft 공개 서버 [Aceserver](https://asv.acecore.net/)의 공식 포털을 공개했습니다.

Aceserver는 Java Edition과 Bedrock Edition 모두에서 플레이할 수 있는 공개 서버입니다. 이번 포털에서는 서버 개요, 참여 안내, 영상, 월드 맵, Wiki 동선을 하나의 입구로 정리했습니다. Acecore의 [실적 페이지](https://systems.acecore.net/works/#case-aceserver-portal)에도 웹 제작 및 커뮤니티 포털 사례로 등록했습니다.

## 제작 배경

Aceserver에 참여하기 전에는 어떤 서버인지, 어떻게 참여하는지, 어떤 월드가 있는지, 규칙과 상세 정보는 어디에서 확인하는지 알아야 합니다.

이 정보가 Discord, Wiki, 영상, 월드 맵으로 나뉘어 있으면 처음 방문한 사람은 어디서 시작해야 할지 판단하기 어렵습니다. 그래서 이번에는 기존 정보원을 대체하지 않고, 그곳으로 이어지는 입구를 설계했습니다.

## 참여 전 정보를 하나의 입구로

첫 화면에서는 Aceserver를 누구나 참여할 수 있는 무료 Minecraft 공개 서버로 소개합니다. 이어서 Java와 Bedrock 모두 지원한다는 점, 바닐라에 가까운 자유로운 서버라는 점, 참여는 공식 Discord에서 시작한다는 점을 안내합니다.

모든 정보를 한 페이지에 많이 넣기보다, 방문자가 다음 행동을 판단할 수 있게 만드는 것을 우선했습니다. 규칙과 지속적인 업데이트는 Wiki와 Discord로 연결합니다.

## 영상, 월드 맵, Wiki를 연결

포털에는 영상 페이지와 월드 맵으로 가는 동선을 넣었습니다. 월드 맵은 메인, 자원, RPG 월드로 나누어 목적에 맞는 페이지로 이동하기 쉽게 구성했습니다.

Wiki 링크도 첫 화면에서 접근할 수 있습니다. 플레이 방법이나 규칙처럼 계속 갱신되는 정보는 Wiki에서 관리하고, 포털은 그곳으로 가는 안정적인 입구 역할을 합니다.

## CMS로 계속 업데이트할 수 있는 구조

구축에는 Astro, UnoCSS, Sveltia CMS를 사용했습니다. Astro로 정적 사이트를 배포하고, UnoCSS로 필요한 스타일을 가볍게 구성했습니다. 페이지 본문과 사이트 설정은 CMS에서 편집할 수 있어, 공지와 동선을 코드 수정 없이 업데이트할 수 있습니다.

가벼운 CMS 운영에 대한 생각은 [Sveltia CMS 도입 가이드](/ko/blog/cms-selection-and-turnstile/)에서도 소개합니다. 정적 사이트의 표시 속도와 운영은 [Astro 사이트 표시 속도 개선 실전 가이드](/ko/blog/astro-performance-tuning/)를 참고할 수 있습니다.

## 실적으로도 추가했습니다

Acecore의 [실적 및 포트폴리오 페이지](https://systems.acecore.net/works/)에는 “Aceserver 포털 제작”으로 사례를 추가했습니다.

기존 [Aceserver 공개 서버 운영](https://systems.acecore.net/works/#case-aceserver) 사례는 공개 서버 자체의 안정 운영과 커뮤니티 운영을 다룹니다. 이번 사례는 플레이어가 정보를 찾고 참여하기 위한 포털 제작에 초점을 둡니다.

포털 사이트, 커뮤니티 사이트, 서비스 사이트처럼 정보가 여러 곳에 나뉘어 있을 때는 모든 것을 한 페이지에 모으는 것보다 처음 봐야 할 입구를 정리하는 것이 중요합니다.

## 정리

Aceserver 포털은 서버 개요, 참여 동선, 영상, 월드 맵, Wiki를 연결하는 입구로 공개되었습니다.

Acecore는 웹사이트 제작, CMS 구축, 서버 운영, 커뮤니티를 위한 정보 설계를 지원합니다. 포털 사이트나 기존 정보 정리를 상담하려면 [웹사이트 제작 및 운영 서비스](/ko/services/#web) 또는 [문의](/ko/contact/)로 연락해 주세요.
