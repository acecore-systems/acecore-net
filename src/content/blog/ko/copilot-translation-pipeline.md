---
title: 'Sveltia CMS로 다국어 블로그를 운영하는 방법'
description: 'Sveltia CMS에서 일본어 원문을 편집하고, GitHub Actions와 GitHub Copilot으로 번역 PR을 만들어 정적 다국어 페이지를 배포하는 운영 방식과 UI 번역과의 차이, 검색 엔진상의 장점을 정리합니다.'
date: 2026-06-07T17:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS', 'SEO']
image: /uploads/acecore-generated/blog-copilot-translation-pipeline.webp
callout:
  type: tip
  title: UI 번역과 다국어 공개는 다릅니다
  text: '브라우저 번역이나 번역 위젯은 독자가 현재 페이지를 읽는 데 도움이 되지만, 언어별 URL, title, description, 내부 링크, RSS, sitemap, hreflang을 자동으로 만들지는 않습니다. 검색 엔진에 각 언어 페이지를 전달하려면 번역된 정적 HTML이 필요합니다.'
linkCards:
  - href: /ko/blog/cms-selection-and-turnstile/
    title: Sveltia CMS 도입 가이드
    description: Astro 정적 사이트에 Sveltia CMS를 도입한 구현 기록입니다.
    icon: i-lucide-badge-check
  - href: /ko/blog/astro-i18n-blog-translation/
    title: Astro 다국어 아키텍처
    description: 9개 언어, fallback, hreflang, RSS, sitemap 기반을 설명합니다.
    icon: i-lucide-globe-2
faq:
  title: 자주 묻는 질문
  items:
    - question: UI 번역만으로 충분하지 않나요?
      answer: '읽기 보조로는 충분할 수 있습니다. 하지만 SEO, RSS, sitemap, 내부 링크까지 언어별 자산으로 만들려면 실제 번역 페이지가 필요합니다.'
    - question: AI 번역은 SEO에 불리한가요?
      answer: 'AI 사용 자체가 문제가 아니라, 가치 없는 페이지를 대량으로 공개하는 것이 문제입니다. 용어, 사실, 링크, 자연스러움을 검토해야 합니다.'
    - question: 번역 페이지는 중복 콘텐츠인가요?
      answer: 'Google 문서에 따르면 본문이 번역되어 있다면 현지화 페이지가 단순 중복으로 취급되는 것은 아닙니다. hreflang으로 관계를 명확히 합니다.'
---

Acecore는 주로 일본어로 콘텐츠를 편집하지만, 블로그는 9개 언어로 공개합니다. 여기서 중요한 점은 **화면에서 번역해 보여주는 것**과 **언어별 페이지를 공개하는 것**이 다르다는 점입니다.

브라우저 번역이나 위젯은 독자가 지금 보고 있는 페이지를 이해하는 데 도움이 됩니다. 그러나 `/ko/blog/.../` 같은 URL, 언어별 메타 정보, RSS, sitemap, hreflang을 만들지는 않습니다.

검색 유입까지 고려한다면 번역은 UI 처리가 아니라 게시 전 콘텐츠 생성 과정으로 다뤄야 합니다.

## 기본 구조

- 일본어 원문: `src/content/blog/{slug}.md`
- 번역 파일: `src/content/blog/{locale}/{slug}.md`
- URL: `/blog/{slug}/`, `/en/blog/{slug}/`, `/ko/blog/{slug}/`
- 편집: Sveltia CMS
- 번역: GitHub Copilot PR
- 공개: build와 리뷰

Sveltia CMS는 일본어 source를 편집하는 화면입니다. 번역은 GitHub PR로 분리해 변경 이력과 리뷰, CI를 남깁니다.

## UI 번역이 맞는 경우

내부 확인, 일회성 열람, 관리 화면, 검색 유입을 목표로 하지 않는 페이지라면 UI 번역으로 충분할 수 있습니다.

이 방식은 가볍지만 번역 파일이 없으므로 검색 엔진이 직접 인덱싱할 언어별 페이지도 없습니다.

## 정적 다국어 페이지의 SEO 장점

검색 엔진, SNS 미리보기, RSS 리더는 URL과 HTML을 기준으로 정보를 봅니다.

일본어 페이지 하나만 있고 독자 브라우저가 번역하는 경우, `title`, `description`, 구조화 데이터, RSS, sitemap은 여전히 일본어 페이지 기준입니다.

정적 번역 페이지가 있으면 각 언어가 URL을 갖습니다.

```txt
/blog/copilot-translation-pipeline/
/en/blog/copilot-translation-pipeline/
/ko/blog/copilot-translation-pipeline/
/de/blog/copilot-translation-pipeline/
```

### 1. 각 언어 URL을 직접 크롤링할 수 있습니다

Google은 JavaScript를 처리할 수 있지만, 공식 문서에서는 JavaScript의 제한도 설명하며 정적 렌더링이나 서버 렌더링을 안정적인 선택지로 제시합니다. 다른 crawler나 RSS 리더까지 고려하면 초기 HTML에 번역문이 있는 편이 안전합니다.

### 2. 메타데이터를 번역할 수 있습니다

frontmatter도 언어별로 가질 수 있습니다.

```yaml
title: 'Sveltia CMS로 다국어 블로그를 운영하는 방법'
description: 'Sveltia CMS와 GitHub Copilot으로 번역 PR을 만드는 운영 방식'
```

검색 결과, OGP, 관련 글 카드, RSS에 모두 영향을 줍니다.

### 3. hreflang으로 언어 버전을 연결합니다

언어별 URL이 있을 때 Google은 `hreflang` 사용을 권장합니다. UI 번역만 있으면 연결할 언어별 URL이 없습니다.

### 4. RSS와 sitemap도 언어별로 만들 수 있습니다

번역 파일이 있으면 `/ko/rss.xml`과 sitemap의 언어별 URL을 생성할 수 있습니다.

## Sveltia CMS의 역할

Sveltia CMS는 번역 엔진이 아닙니다. 이 구성에서는 일본어 source 편집을 담당합니다.

- 일본어 블로그
- 저자 정보
- 태그 정의
- 일본어 source JSON
- 이미지
- date, FAQ, linkCards 같은 frontmatter

CMS 도입은 [Sveltia CMS 도입 가이드](/ko/blog/cms-selection-and-turnstile/)에서 설명합니다.

## Copilot 번역 규칙

번역 PR에는 유지할 값과 번역할 값을 명확히 전달해야 합니다.

```md
Keep:

- slug
- image path
- author id
- tag ids
- external URLs
- code blocks

Localize:

- title
- description
- FAQ
- body text
- internal blog URLs when locale-specific URLs exist
```

## PR에서 얻은 교훈

- 구현은 Sveltia CMS인데 예전 글에는 Pages CMS 표현이 남아 있었습니다.
- `date`가 오래된 상태면 글을 다시 써도 블로그 첫 화면에 오르지 않습니다.
- 번역 제목은 바꿔도 slug는 유지해야 합니다.
- 내부 링크는 독자의 locale로 이어져야 합니다.
- AI 번역은 빠르지만 공개 전 리뷰가 필요합니다.

## 참고 링크

- [Google Search Central: Localized Versions of your Pages](https://developers.google.com/search/docs/advanced/crawling/localized-versions?hl=en&rd=1&visit_id=638856769088389068-716743185)
- [Google Search Central: Managing Multi-Regional and Multilingual Sites](https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites)
- [Google Search Central: JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Search Central: Spam Policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Sveltia CMS 도입 가이드](/ko/blog/cms-selection-and-turnstile/)

## 정리

UI 번역은 읽기 보조입니다. 정적 다국어 페이지는 각 언어를 사이트의 실제 콘텐츠로 만듭니다.

Sveltia CMS는 일본어를 편집하고, GitHub Copilot은 번역 PR을 만들고, Astro build는 배포 전 검증을 담당합니다.
