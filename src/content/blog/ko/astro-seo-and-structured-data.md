---
title: 'SEO 개선 가이드: Astro 사이트에 구조화 데이터와 OGP 구현하기'
description: 'Astro + Cloudflare Pages 사이트에서 JSON-LD 구조화 데이터, OGP, 사이트맵, RSS를 올바르게 구현하는 단계별 가이드. Google 리치 결과 지원부터 RSS 피드 최적화까지 실전 SEO 개선을 다룹니다.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'SEO']
image: https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: 이 글의 대상 독자
  text: 'Astro 사이트의 SEO를 체계적으로 개선하고 싶은 분들을 위한 글입니다. 구조화 데이터의 종류와 구현 패턴, OGP 설정, 사이트맵 최적화 등 바로 적용할 수 있는 실전 단계를 다룹니다.'
processFigure:
  title: SEO 개선 워크플로우
  steps:
    - title: 메타 태그
      description: 모든 페이지에 title, description, canonical, OGP를 설정합니다.
      icon: i-lucide-file-text
    - title: 구조화 데이터
      description: JSON-LD를 사용하여 페이지의 의미를 Google에 전달합니다.
      icon: i-lucide-braces
    - title: 사이트맵
      description: 페이지 유형별로 우선순위와 업데이트 빈도를 설정합니다.
      icon: i-lucide-map
    - title: RSS
      description: 저자 및 카테고리 정보가 포함된 고품질 피드를 제공합니다.
      icon: i-lucide-rss
insightGrid:
  title: 구현된 구조화 데이터
  items:
    - title: Organization
      description: 검색 결과에 회사명, URL, 로고, 연락처를 표시합니다.
      icon: i-lucide-building
    - title: BlogPosting
      description: 저자, 게재일, 업데이트일, 이미지가 포함된 글에 대한 리치 결과를 활성화합니다.
      icon: i-lucide-pen-line
    - title: BreadcrumbList
      description: 모든 페이지의 계층 구조를 브레드크럼 리스트로 출력합니다.
      icon: i-lucide-chevrons-right
    - title: FAQPage
      description: FAQ 섹션이 포함된 글에 FAQ 리치 결과를 활성화합니다.
      icon: i-lucide-help-circle
    - title: WebPage / ContactPage
      description: 최상위 페이지와 문의 페이지에 전용 타입을 지정합니다.
      icon: i-lucide-layout
    - title: SearchAction
      description: Google 검색 결과에서 직접 사이트 검색을 실행할 수 있도록 합니다.
      icon: i-lucide-search
faq:
  title: 자주 묻는 질문
  items:
    - question: 구조화 데이터를 추가하면 검색 결과가 즉시 바뀌나요?
      answer: '아닙니다. Google이 크롤링하고 재인덱싱하는 데 며칠에서 몇 주가 걸립니다. 반영 상태는 Google Search Console의 "리치 결과" 보고서에서 확인할 수 있습니다.'
    - question: 권장 OGP 이미지 크기는 어떻게 되나요?
      answer: '1200×630px가 권장됩니다. 이 비율은 summary_large_image 사용 시 X(Twitter)에 최적입니다.'
    - question: 사이트맵의 priority가 SEO에 영향을 미치나요?
      answer: 'Google은 공식적으로 priority를 무시한다고 밝혔지만, 다른 검색 엔진은 참조할 수 있습니다. 설정해 두어도 손해는 없습니다.'
---

## 서론

SEO라 하면 "키워드 채우기"를 떠올리는 분도 있지만, 현대 SEO는 기본적으로 **사이트의 구조와 콘텐츠를 검색 엔진에 정확하게 전달하는 것**입니다.

이 글에서는 Astro 사이트에서 구현해야 할 SEO 시책을 네 가지 카테고리로 나누어 설명합니다. 각각 한 번 설정하면 지속적으로 효과를 발휘합니다.

---

## OGP 및 메타 태그 설정

OGP와 메타 태그는 소셜 미디어에서 공유될 때의 외관과 검색 엔진에 대한 정보 전달을 담당합니다.

### 기본 메타 태그

Astro 레이아웃 컴포넌트에서 각 페이지에 다음을 출력합니다:

- `og:title` / `og:description` / `og:image` — 소셜 미디어에서 공유 시 제목, 설명, 이미지
- `twitter:card` = `summary_large_image` — X(Twitter)에서 큰 이미지 카드 표시
- `rel="canonical"` — 중복 페이지의 정규 URL 지정
- `rel="prev"` / `rel="next"` — 페이지네이션 관계 표시

### 블로그 글 메타 태그

글 페이지에는 다음 태그를 추가로 설정합니다:

- `article:published_time` / `article:modified_time` — 게재일 및 업데이트일
- `article:tag` — 글 태그 정보
- `article:section` — 콘텐츠 카테고리

### 구현 팁

레이아웃 컴포넌트에서 `title` / `description` / `image`를 prop으로 받아 각 페이지에서 전달하면, 모든 페이지에서 일관된 메타 태그 출력을 보장할 수 있습니다. 홈페이지의 `og:title`에는 단순히 "홈"이 아닌 사이트명과 태그라인을 포함한 구체적인 제목을 사용합니다.

---

## 구조화 데이터(JSON-LD) 구현

구조화 데이터는 검색 엔진이 페이지 콘텐츠를 기계적으로 이해할 수 있도록 하는 메커니즘입니다. 올바르게 구현하면 검색 결과에 리치 결과(FAQ, 브레드크럼, 저자 정보 등)가 표시될 수 있습니다.

### Organization

회사 정보를 Google에 전달합니다. 지식 패널에 표시될 수 있습니다.

```json
{
  "@type": "Organization",
  "name": "Acecore",
  "url": "https://acecore.net",
  "logo": "https://acecore.net/logo.png",
  "contactPoint": { "@type": "ContactPoint", "telephone": "..." }
}
```

회사 소개 페이지에 `knowsAbout` 필드를 추가하여 사업 영역을 지정할 수도 있습니다.

### BlogPosting

블로그 글에는 `BlogPosting`을 설정합니다. 저자, 게재일, 업데이트일, 대표 이미지를 포함하면 Google Discover 및 검색 결과에서 저자 정보 표시가 가능합니다.

### BreadcrumbList

브레드크럼 구조화 데이터는 모든 페이지에 설정해야 합니다. 중요한 구현 참고 사항: 중간 경로(`/blog/tags/` 같은 목록 페이지)가 실제로 존재하는지 확인하고, 존재하지 않는 경로에는 `item` 프로퍼티를 출력하지 마세요.

### FAQPage

FAQ 섹션이 있는 글에는 `FAQPage` 구조화 데이터를 출력합니다. Astro에서는 프론트매터에 `faq` 필드를 정의하고 템플릿 측에서 이를 감지하여 출력하는 방식이 편리합니다.

### WebSite + SearchAction

사이트 검색이 있다면 `SearchAction`을 설정하면 Google 검색 결과에 사이트 검색 상자가 표시될 수 있습니다. Pagefind 같은 검색 엔진과 결합하여 `?q=` 매개변수를 통한 검색 모달 자동 실행 메커니즘을 구현하면 사용자 경험이 향상됩니다.

---

## 사이트맵 최적화

Astro의 `@astrojs/sitemap` 플러그인으로 사이트맵을 자동 생성할 수 있지만, 기본 설정만으로는 불충분합니다.

### 페이지 유형별 설정

`serialize()` 함수를 사용하여 URL 패턴에 따라 `changefreq`와 `priority`를 설정합니다.

| 페이지 유형 | changefreq | priority |
| --- | --- | --- |
| 홈페이지 | daily | 1.0 |
| 블로그 글 | weekly | 0.8 |
| 기타 | monthly | 0.6 |

### lastmod 설정

`lastmod`를 빌드 날짜로 설정하여 검색 엔진에 콘텐츠 신선도를 전달합니다. 블로그 글의 프론트매터에 `lastUpdated` 필드가 있으면 그것을 우선합니다.

---

## RSS 피드 강화

RSS는 "한 번 설정하고 잊어버리기" 쉬운 작업이지만, 피드 품질을 높이면 RSS 리더에서의 표시가 개선되고 구독자 경험이 향상됩니다.

### 추가할 정보

- **author**: 글별 저자명 포함
- **categories**: 태그 정보를 카테고리로 추가하여 RSS 리더에서의 분류 개선

```typescript
items: posts.map(post => ({
  title: post.data.title,
  description: post.data.description,
  link: `/blog/${post.id}/`,
  pubDate: post.data.date,
  author: post.data.author,
  categories: post.data.tags,
}))
```

---

## SEO 개선 체크리스트

마지막으로 Astro 사이트 SEO 개선을 위해 확인해야 할 핵심 사항을 정리합니다:

1. **모든 페이지에 canonical URL이 설정되어 있는가?**
2. **각 페이지마다 고유한 OGP 이미지가 준비되어 있는가?**
3. **구조화 데이터 검증**: [Google 리치 결과 테스트](https://search.google.com/test/rich-results)로 확인
4. **브레드크럼 리스트의 중간 경로가 실제 URL을 가리키는가?**
5. **사이트맵에서 불필요한 페이지(404 등)가 제외되어 있는가?**
6. **RSS 피드에 저자와 카테고리가 포함되어 있는가?**
7. **robots.txt에서 검색 인덱스(`/pagefind/` 등)가 크롤링 제외되어 있는가?**

이 모든 것을 설정하면 SEO 기반이 갖춰집니다. 그 이후의 검색 순위는 콘텐츠 품질과 업데이트 빈도에 의해 결정됩니다.

---

## 시리즈 소개

이 글은 "[Astro 사이트 품질 개선 가이드](/blog/website-improvement-batches/)" 시리즈의 일부입니다. 성능, 접근성, UX 개선에 대해서는 별도 글에서 다루고 있습니다.
