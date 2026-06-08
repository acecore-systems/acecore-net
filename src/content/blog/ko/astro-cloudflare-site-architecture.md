---
title: 'Astro + Cloudflare 사이트를 기능별로 확장하는 전체 설계'
description: 'Astro와 Cloudflare Pages를 기반으로 문의 AI, Sveltia CMS, 다국어 블로그, 서비스 CTA, 안전한 Markdown 렌더링, Cloudflare만으로 만든 댓글 기능을 하나의 구조로 정리합니다.'
date: 2026-06-07T19:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'Astro', 'Cloudflare', 'Webサイト', 'AI', 'CMS']
image: /uploads/acecore-generated/work-acecore-net-website.webp
callout:
  type: tip
  title: 기능을 넣기 전에 경계를 정한다
  text: 'AI 채팅, CMS, 다국어, 댓글은 각각 유용하지만 한 공식 사이트에 들어가면 역할 경계가 필요합니다. Astro는 정적 HTML을 만들고, Cloudflare는 배포와 작은 API를 맡고, GitHub PR은 변경 이력을 남깁니다.'
processFigure:
  eyebrow: Site Architecture
  title: 공식 사이트 기능 확장의 레이어
  description: 기본은 정적으로 유지하고, 필요한 부분만 동적으로 만듭니다.
  variant: inline
  steps:
    - title: 배포
      description: Astro로 정적 HTML을 만들고 Cloudflare Pages로 배포합니다.
      icon: i-lucide-rocket
      accent: brand
    - title: 편집
      description: Sveltia CMS로 일본어 source를 편집하고 GitHub PR로 검토합니다.
      icon: i-lucide-file-pen-line
      accent: emerald
    - title: 번역
      description: 모든 언어를 CMS에 넣지 않고, 번역은 PR 흐름으로 분리합니다.
      icon: i-lucide-languages
      accent: amber
    - title: 안내
      description: 문의 AI와 서비스 CTA로 방문자를 적절한 폼으로 안내합니다.
      icon: i-lucide-route
      accent: slate
linkCards:
  - href: /ko/blog/astro-ai-contact-chat/
    title: 문의 AI 채팅 기술 설계
    description: 사이트 정보를 바탕으로 방문자를 안내하는 API 경계와 안전 설계입니다.
    icon: i-lucide-bot
  - href: /ko/blog/cms-selection-and-turnstile/
    title: Sveltia CMS 도입 가이드
    description: 정적 사이트에 CMS, GitHub backend, OAuth, PR 운영을 추가한 기록입니다.
    icon: i-lucide-badge-check
  - href: /ko/blog/copilot-translation-pipeline/
    title: Sveltia CMS로 다국어 블로그 운영하기
    description: UI 번역이 아니라 언어별 정적 페이지를 생성하는 운영입니다.
    icon: i-lucide-languages
  - href: /ko/blog/service-cta-contact-prefill/
    title: 서비스 CTA 문맥을 문의 폼으로 전달하기
    description: 읽고 있던 서비스의 문맥을 폼의 분류와 제목으로 넘깁니다.
    icon: i-lucide-route
  - href: /ko/blog/ai-chat-markdown-link-safety/
    title: AI 채팅 Markdown 링크 안전 렌더링
    description: AI 출력을 신뢰된 HTML로 보지 않고 허용된 링크만 렌더링합니다.
    icon: i-lucide-shield-check
  - href: /ko/blog/cloudflare-only-blog-comments/
    title: Cloudflare만으로 만드는 블로그 댓글
    description: 외부 댓글 서비스 없이 Pages Functions, D1, Turnstile로 구현합니다.
    icon: i-lucide-message-square-text
---

Astro와 Cloudflare Pages로 정적 사이트를 만들 때는 처음에는 빠르고 안전하게 페이지를 배포하는 것만으로 충분합니다.

하지만 운영을 계속하면 브라우저 편집, 다국어 페이지, AI 채팅 안내, 서비스 페이지에서 폼으로 문맥 전달, 댓글 기능 같은 요구가 생깁니다.

이 글은 구현 인덱스입니다. 각 기능을 어느 레이어에 둘지, 어떤 순서로 넣을지, 다음에 어떤 상세 글을 읽을지 정리합니다. Acecore 공식 사이트를 예로 들지만, 같은 구조는 다른 Astro + Cloudflare 사이트에도 적용할 수 있습니다.

## 요약

역할은 다음처럼 나눕니다.

| 레이어      | 역할                                  |
| ----------- | ------------------------------------- |
| Astro       | 페이지, 블로그, OGP, RSS, sitemap, UI |
| Cloudflare  | Pages, Pages Functions, D1, Turnstile |
| GitHub      | PR, CMS diff, 번역 diff, 변경 이력    |
| Sveltia CMS | 일본어 source, 작성자, 태그, 이미지   |
| OpenAI API  | 문의 AI 응답 생성                     |
| Pagefind    | 검토된 정적 HTML의 사이트 검색 인덱스 |

정적으로 만들 수 있는 것은 정적으로 둡니다. 요청 시 처리가 필요한 부분만 작은 API로 보냅니다.

## 동적 기능은 작은 API로 둔다

문의 AI와 댓글 기능은 같은 패턴입니다.

Astro는 UI를 렌더링합니다. Pages Functions는 API 경계를 담당합니다. secret, D1 binding, Turnstile, Origin 체크, rate limit은 브라우저에 노출하지 않습니다.

## CMS는 편집 UI다

Sveltia CMS는 런타임 DB가 아니라 Git 변경을 만드는 편집 UI입니다.

일본어 글, 작성자, 태그, 이미지, JSON 문구는 PR, build, review를 거쳐 공개됩니다.

## 다국어는 정적 콘텐츠다

다국어 운영은 브라우저 UI 번역이 아닙니다.

각 언어는 URL, title, description, OGP, JSON-LD, RSS, sitemap, hreflang을 가집니다.

## 문의 도선은 역할을 나눈다

AI 채팅은 아직 어떤 서비스가 맞는지 모르는 방문자에게 좋습니다. 서비스 CTA는 읽고 있던 서비스 문맥을 보존합니다. 폼은 공식 문의를 기록합니다.

## AI 출력은 신뢰된 HTML이 아니다

AI가 Markdown 링크를 반환해도 그대로 `innerHTML`에 넣지 않습니다.

필요한 표현만 파싱하고, allowlist를 통과한 링크만 DOM으로 만듭니다.

## 댓글은 Cloudflare 안에 둔다

댓글은 외부 위젯이 아닙니다.

Pages Functions가 GET/POST를 받고, D1이 저장하고, Turnstile이 제출을 보호합니다.

## 목적별로 읽기

처음부터 전부 읽을 필요는 없습니다. 추가하려는 기능부터 보면 됩니다.

| 하고 싶은 일                         | 먼저 읽을 글                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| 브라우저에서 글과 이미지를 편집하기  | [Sveltia CMS 도입 가이드](/ko/blog/cms-selection-and-turnstile/)                          |
| 다국어 페이지를 검색 대상으로 만들기 | [Sveltia CMS로 다국어 블로그 운영하기](/ko/blog/copilot-translation-pipeline/)            |
| AI 채팅으로 방문자를 안내하기        | [Astro 사이트에 문의 AI 채팅을 넣는 기술 설계](/ko/blog/astro-ai-contact-chat/)           |
| AI 답변 링크를 안전하게 렌더링하기   | [AI 채팅 답변의 Markdown 링크 안전 렌더링](/ko/blog/ai-chat-markdown-link-safety/)        |
| 서비스 문맥을 폼으로 넘기기          | [서비스 CTA 문맥을 문의 폼으로 전달하는 설계](/ko/blog/service-cta-contact-prefill/)      |
| 외부 서비스 없이 댓글 기능 넣기      | [Cloudflare만으로 Astro 블로그 댓글 기능 만들기](/ko/blog/cloudflare-only-blog-comments/) |

## 추천 구현 순서

비슷한 구성을 다른 사이트에 넣는다면 실무 순서는 다음과 같습니다.

1. Astro로 정적 페이지, 블로그, RSS, sitemap, OGP를 먼저 굳힙니다.
2. Sveltia CMS로 일본어 source를 편집할 수 있게 합니다.
3. 다국어 페이지를 정적 HTML로 생성합니다.
4. AI 채팅과 서비스 CTA로 상담 도선을 정리합니다.
5. Markdown 링크, 폼 prefill, Origin 체크, rate limit의 안전 경계를 굳힙니다.
6. 필요해진 시점에 Cloudflare 안에서 댓글 기능을 추가합니다.

## 정리

Astro + Cloudflare는 정적 배포의 장점을 유지하면서도 공식 사이트를 계속 확장할 수 있습니다.

이 페이지를 입구로 삼으면 정적 사이트의 기반을 유지하면서 필요한 기능만 골라 확장할 수 있습니다.
