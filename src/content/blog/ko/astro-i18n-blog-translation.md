---
title: 'Astro 6 사이트를 9개 언어로 지원하는 방법 ― 136개 블로그 글 자동 번역과 다국어 아키텍처'
description: 'Astro 6 + UnoCSS + Cloudflare Pages 사이트를 9개 언어로 대응한 기록. UI 국제화부터 136개 블로그 글 번역, Pages CMS 다국어 설정까지 전체 과정을 다룹니다.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'i18n', 'Webサイト']
image: https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop&q=80
processFigure:
  title: 다국어 워크플로우
  steps:
    - title: i18n 기반 구축
      description: Astro 내장 i18n 라우팅과 번역 유틸리티 설정.
      icon: i-lucide-globe
    - title: UI 텍스트 번역
      description: 헤더, 푸터 및 모든 컴포넌트의 표시 텍스트 번역.
      icon: i-lucide-languages
    - title: 블로그 글 번역
      description: 136개 번역 파일 생성(17개 글 × 8개 언어).
      icon: i-lucide-file-text
    - title: CMS 및 빌드 검증
      description: Pages CMS 다국어 설정 및 전체 페이지 빌드 검증.
      icon: i-lucide-check-circle
compareTable:
  title: 전후 비교
  before:
    label: 일본어만
    items:
      - 일본어 1개 언어만
      - 블로그 글 17개
      - 523개 페이지 생성(UI 다국어 지원 후)
      - Pages CMS 블로그 컬렉션 1개
      - 태그 및 저자 데이터 일본어만
      - RSS 피드 1개
  after:
    label: 9개 언어
    items:
      - 일본어 + 8개 언어(en, zh-cn, es, pt, fr, ko, de, ru)
      - 블로그 글 17개 + 번역 136개 = 총 153개
      - 541개 페이지 생성(번역 글 포함, 폴백 지원)
      - Pages CMS 언어별 컬렉션 9개
      - 25종 태그 및 저자 데이터를 각 언어로 번역
      - 다국어 RSS 피드(9개 언어)
callout:
  type: info
  title: 지원 언어
  text: '9개 언어 지원: 일본어(기본), 영어, 중국어(간체), 스페인어, 포르투갈어, 프랑스어, 한국어, 독일어, 러시아어.'
statBar:
  items:
    - value: '9'
      label: 지원 언어 수
    - value: '136'
      label: 번역 글 수
    - value: '541'
      label: 생성 페이지 수
faq:
  title: 자주 묻는 질문
  items:
    - question: 왜 9개 언어를 선택했나요?
      answer: '글로벌 도달 범위를 극대화하기 위해 주요 언어 시장을 커버했습니다. 영어, 중국어, 스페인어, 포르투갈어가 대부분의 인터넷 사용자를 커버하고, 프랑스어, 독일어, 러시아어, 한국어가 나머지 주요 시장을 보완합니다.'
    - question: 번역 품질은 어떻게 보장하나요?
      answer: 'GitHub Copilot을 사용한 AI 번역을 활용합니다. 먼저 영어를 중간 언어로 만든 뒤 각 대상 언어로 번역하여 품질 편차를 줄입니다. frontmatter의 태그 값은 일본어를 유지하고, URL, 코드 블록, 이미지 경로는 변경하지 않습니다.'
    - question: 번역 글이 없으면 어떻게 되나요?
      answer: '번역이 없을 경우 폴백 기능이 일본어 원문을 표시합니다. 번역은 점진적으로 추가할 수 있습니다.'
    - question: 새 글을 추가할 때 번역이 필요한가요?
      answer: '번역은 필수가 아닙니다 — 번역 파일이 없으면 일본어 버전이 폴백으로 표시됩니다. 번역을 추가하려면 해당 언어 디렉토리에 같은 이름의 Markdown 파일을 배치하면 됩니다.'
---

Acecore 공식 웹사이트를 일본어 전용에서 9개 언어 지원으로 업그레이드했습니다. 이 글에서는 UI 국제화, 17개 블로그 글 × 8개 언어 = 136개 파일 번역, Pages CMS 다국어 설정까지 전체 과정을 다룹니다.

## 다국어 전략

### 범위 정의

다국어 지원은 세 단계로 진행했습니다:

1. **i18n 기반 구축**: Astro 내장 i18n 라우팅 설정, 번역 유틸리티, 9개 언어의 번역 JSON 파일
2. **UI 텍스트 번역**: 헤더, 푸터, 사이드바 및 모든 페이지의 컴포넌트 텍스트
3. **블로그 글 번역**: 전체 17개 글을 8개 언어로 번역(136개 파일 생성)

### URL 설계

Astro의 `prefixDefaultLocale: false`를 채택하여 일본어는 루트 경로(`/blog/...`), 다른 언어는 접두사 포함(`/en/blog/...`, `/zh-cn/blog/...` 등)으로 제공합니다.

```
# 일본어(기본)
/blog/astro-performance-tuning/

# 영어
/en/blog/astro-performance-tuning/

# 중국어(간체)
/zh-cn/blog/astro-performance-tuning/
```

모든 언어에서 동일한 slug를 사용하여 언어 전환 시 URL 매핑을 단순하게 유지합니다.

## i18n 기반 구현

### Astro i18n 설정

`astro.config.mjs`에서 i18n 라우팅을 설정합니다.

```javascript
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
```

### 번역 유틸리티

설정 파일, 유틸리티 함수, 번역 JSON 파일은 `src/i18n/`에 통합 관리합니다.

```typescript
// src/i18n/utils.ts
export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key]
    ?? translations[defaultLocale][key]
    ?? key
}
```

번역 파일은 `src/i18n/locales/` 아래에 JSON 형식으로 저장되며, 네비게이션, 푸터, 블로그 UI, 메타데이터 등 약 100개의 키를 관리합니다.

### View 컴포넌트 패턴

페이지 구현은 **View 컴포넌트 패턴**을 사용합니다. 레이아웃과 로직은 `src/views/`에 집중하고, 라우트 파일(`src/pages/`)은 locale만 전달하는 가벼운 래퍼입니다.

```astro
---
// src/pages/[locale]/about.astro (라우트 파일)
import AboutPage from '../../views/AboutPage.astro'
const { locale } = Astro.params
---
<AboutPage locale={locale} />
```

이 설계로 일본어 라우트(`/about`)와 다국어 라우트(`/en/about`) 사이의 로직 중복을 제거합니다.

## 블로그 콘텐츠 다국어 지원

### 디렉토리 구조

번역 글은 언어 코드 하위 디렉토리에 배치합니다. Astro의 glob 로더가 `**/*.md` 패턴으로 자동 재귀 감지합니다.

```
src/content/blog/
  astro-performance-tuning.md          # 일본어(기본)
  website-renewal.md
  en/
    astro-performance-tuning.md        # 영어 버전
    website-renewal.md
  zh-cn/
    astro-performance-tuning.md        # 중국어(간체) 버전
    website-renewal.md
  es/
    ...
```

### 콘텐츠 해석 유틸리티

`src/utils/blog-i18n.ts`에 3개의 함수를 구현했습니다.

```typescript
// 기본 글 여부 판별(ID에 슬래시 없음 = 기본)
export function isBasePost(post: CollectionEntry<'blog'>): boolean {
  return !post.id.includes('/')
}

// ID에서 locale 접두사를 제거하여 기본 slug 획득
export function getBaseSlug(postId: string): string {
  const idx = postId.indexOf('/')
  return idx !== -1 ? postId.slice(idx + 1) : postId
}

// 기본 글의 로컬라이즈 버전 취득(없으면 원본으로 폴백)
export function localizePost(
  post: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): CollectionEntry<'blog'> {
  if (locale === defaultLocale) return post
  return allPosts.find((p) => p.id === `${locale}/${post.id}`) ?? post
}
```

핵심은 **기존 콘텐츠 컬렉션 스키마를 수정하지 않는 것**입니다. Astro의 glob 로더가 하위 디렉토리의 파일을 자동으로 인식하여 `en/astro-performance-tuning` 같은 ID를 생성하므로 설정 변경이 불필요합니다.

### 번역 파일 규칙

번역 파일은 다음 규칙에 따라 생성합니다:

- **frontmatter 키**는 영어 유지(`title`, `description`, `date` 등)
- **태그 값**은 일본어 유지(`['技術', 'Astro']` 등)
- **URL, 이미지 경로, 코드 블록, HTML**은 수정하지 않음
- **날짜와 저자**는 변경하지 않음
- **본문 텍스트와 frontmatter 텍스트 값**(title, description, callout, FAQ 등)을 번역

### 번역 워크플로우

번역 프로세스는 다음 순서로 진행합니다:

1. **영어를 중간 언어로 생성**: 일본어 원문에서 영어로 번역
2. **영어에서 각 언어로 번역**: 영어에서 7개 언어로 확장
3. **배치 처리**: GitHub Copilot으로 한 번에 5~6개 글 처리

일본어 → 영어 → 대상 언어의 2단계 번역으로 품질 편차를 줄입니다. 영어를 중간 언어로 경유하면 일본어에서 각 언어로 직접 번역하는 것보다 안정적인 품질을 얻을 수 있습니다.

## 다국어 View 컴포넌트

### BlogPostPage 구현

블로그 글 페이지는 `localizePost()`로 locale 버전의 콘텐츠를 가져와 템플릿 변수에 할당합니다.

```astro
---
// src/views/BlogPostPage.astro
const localizedPost = localizePost(basePost, allPosts, locale)
const post = localizedPost // 기존 템플릿 참조가 그대로 동작
---
```

이 방식으로 템플릿의 `post.data.title`이나 `post.body` 참조를 변경하지 않고 다국어 지원을 구현할 수 있습니다.

### 목록 페이지 구현

블로그 목록, 태그 목록, 저자 목록, 아카이브 페이지는 `isBasePost()`로 기본 글만 필터링한 뒤, 표시 시 `localizePost()`로 번역 버전으로 교체합니다.

```astro
---
const allPosts = await getCollection('blog')
const basePosts = allPosts.filter(isBasePost)
const displayPosts = basePosts.map(p => localizePost(p, allPosts, locale))
---
```

## 빌드 시 주의사항

### YAML frontmatter 이스케이프

프랑스어 번역에서 아포스트로피(`l'atelier`, `qu'on` 등)가 YAML 작은따옴표와 충돌하는 문제가 발생했습니다.

```yaml
# NG: YAML 파싱 에러
title: 'Le métavers est plus proche qu'on ne le pense'

# OK: 큰따옴표로 변경
title: "Le métavers est plus proche qu'on ne le pense"
```

Node.js 스크립트로 모든 파일을 일괄 수정했습니다. `Acecore's` 같은 영어 텍스트도 같은 문제가 있으므로 번역 파일 생성 시 따옴표 유형에 주의가 필요합니다.

### OG 이미지 라우트 필터링

`/blog/og/[slug].png.ts`에서 번역 글의 slug(`en/aceserver-hijacked` 등)까지 캡처하여 파라미터 에러가 발생했습니다. `isBasePost()` 필터링으로 해결했습니다.

```typescript
export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection('blog')
  const posts = allPosts.filter(isBasePost)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }))
}
```

## Pages CMS 다국어 지원

Pages CMS(`.pages.yml`)는 지정된 `path` 디렉토리 바로 아래의 파일만 대상으로 하므로, 번역 하위 디렉토리를 개별 컬렉션으로 등록했습니다.

```yaml
content:
  - name: blog
    label: ブログ（日本語）
    path: src/content/blog
  - name: blog-en
    label: Blog（English）
    path: src/content/blog/en
  - name: blog-zh-cn
    label: 博客（简体中文）
    path: src/content/blog/zh-cn
  # ... 각 언어별 설정
```

라벨은 각 언어로 작성하여 CMS에서 어떤 컬렉션이 어떤 언어인지 한눈에 알 수 있게 합니다.

## 언어 전환 UI

헤더에 `LanguageSwitcher` 컴포넌트를 추가하여 데스크톱과 모바일 모두에서 언어 전환 UI를 제공합니다. 언어 전환 시 같은 페이지의 해당 locale로 이동하며, 첫 방문 시 브라우저의 `navigator.language`를 감지하여 자동 리다이렉트합니다.

## 태그 다국어 표시

글의 태그는 URL에서 일본어 slug를 유지하면서 **표시 이름만 번역**합니다. 이로써 라우팅 복잡성을 피하면서 사용자의 모국어로 태그를 표시합니다.

```typescript
// src/i18n/utils.ts
export function translateTag(tag: string, locale: Locale): string {
  return t(locale, `tags.${tag}`) !== `tags.${tag}`
    ? t(locale, `tags.${tag}`)
    : tag
}
```

각 번역 JSON에 `tags` 섹션을 추가하여 25개 태그 전체의 번역을 정의했습니다.

```json
// en.json (발췌)
{
  "tags": {
    "技術": "Technology",
    "セキュリティ": "Security",
    "パフォーマンス": "Performance",
    "アクセシビリティ": "Accessibility"
  }
}
```

`translateTag()`는 글 카드, 사이드바, 태그 인덱스, 글 상세 등 6곳에서 사용되어 모든 태그 표시를 해당 언어로 통일합니다.

## 저자 데이터 다국어 지원

저자 약력(bio)과 스킬 목록도 언어별로 전환됩니다. `src/data/authors.json`에 `i18n` 필드를 추가하여 각 언어의 번역을 저장합니다.

```json
{
  "id": "hatt",
  "name": "hatt",
  "bio": "代表取締役。Web制作・システム開発…",
  "skills": ["TypeScript", "Astro", "..."]
  "i18n": {
    "en": {
      "bio": "CEO and representative director. Web development...",
      "skills": ["TypeScript", "Astro", "..."]
    }
  }
}
```

`getLocalizedAuthor()` 유틸리티가 locale에 맞는 저자 정보를 가져옵니다.

```typescript
// src/utils/blog-i18n.ts
export function getLocalizedAuthor(author: Author, locale: Locale) {
  const localized = author.i18n?.[locale]
  return localized ? { ...author, ...localized } : author
}
```

## 다국어 사이트 SEO

다국어 지원의 SEO 효과를 극대화하기 위해 검색 엔진이 각 언어 버전을 올바르게 인식하고 색인할 수 있는 메커니즘을 구현했습니다.

### 사이트맵 hreflang 지원

`@astrojs/sitemap`의 `i18n` 옵션을 설정하여 사이트맵에 `xhtml:link rel="alternate"` 태그를 자동 출력합니다.

```javascript
// astro.config.mjs
sitemap({
  i18n: {
    defaultLocale: 'ja',
    locales: {
      ja: 'ja',
      en: 'en',
      'zh-cn': 'zh-CN',
      es: 'es',
      pt: 'pt',
      fr: 'fr',
      ko: 'ko',
      de: 'de',
      ru: 'ru',
    },
  },
})
```

모든 URL에 9개 언어의 hreflang 링크가 출력되어 Google이 언어 버전 간의 대응 관계를 정확히 파악할 수 있습니다.

### JSON-LD 구조화 데이터 언어 지원

블로그 글의 `BlogPosting` 구조화 데이터에 `inLanguage` 필드를 추가하여 검색 엔진에 각 글의 언어 정보를 전달합니다.

```javascript
// BlogPostPage.astro (JSON-LD 발췌)
{
  "@type": "BlogPosting",
  "inLanguage": htmlLangMap[locale],  // "ja", "en", "zh-CN" 등
  "headline": post.data.title,
  // ...
}
```

### 다국어 RSS 피드

일본어 `/rss.xml` 외에 각 언어 버전의 RSS 피드(`/en/rss.xml`, `/zh-cn/rss.xml` 등)를 생성합니다. 피드 제목과 설명도 언어별로 번역되며, `<language>` 태그는 BCP47 준수 언어 코드를 출력합니다.

```typescript
// src/pages/[locale]/rss.xml.ts
export const getStaticPaths = () =>
  locales.filter((l) => l !== defaultLocale).map((l) => ({ params: { locale: l } }))
```

`BaseLayout.astro`의 `<link rel="alternate" type="application/rss+xml">`도 locale에 맞는 RSS URL을 자동으로 설정합니다.

## 정리

Astro 6의 내장 i18n 기능을 활용하여 정적 사이트에서도 고품질 다국어 지원을 구현했습니다.

- **i18n 기반**: Astro의 `prefixDefaultLocale: false`로 일본어 접두사 없음
- **UI 번역**: View 컴포넌트 패턴으로 로직 중복 제로
- **콘텐츠 번역**: 하위 디렉토리 방식으로 스키마 변경 없음
- **태그 번역**: URL은 일본어 slug, 표시 이름은 언어별 번역
- **저자 데이터 번역**: bio와 skills가 언어별로 전환
- **SEO**: 사이트맵 hreflang, JSON-LD `inLanguage`, 다국어 RSS 피드
- **폴백**: 미번역 글은 자동으로 일본어 버전 표시
- **CMS 지원**: Pages CMS에서 각 언어의 글을 개별 편집 가능

향후 새 글이 게시될 때마다 번역 파일을 점진적으로 추가할 예정입니다. 폴백 기능 덕분에 번역이 완료될 때까지 일본어 버전이 표시되어 사이트 품질이 유지됩니다.
