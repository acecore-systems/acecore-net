---
title: 'Astro View Transitions의 함정과 해결책 — UX 및 코드 품질 개선 가이드'
description: 'Astro View Transitions에서 스크립트가 작동하지 않는 문제의 해결 패턴, Pagefind 전문 검색 도입, TypeScript 타입 안전성 강화, 상수 중앙 관리 등 UX와 코드 품질 개선을 위한 실전 가이드.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&h=400&fit=crop&q=80
callout:
  type: warning
  title: View Transitions를 사용한다면 반드시 읽으세요
  text: 'Astro의 ClientRouter(View Transitions)를 도입하면 페이지 전환이 부드러워지지만, 모든 인라인 스크립트가 재실행되지 않게 됩니다. 이 글에서는 해결 패턴과 UX 및 코드 품질 개선을 위한 실전 기법을 다룹니다.'
processFigure:
  title: UX 개선 워크플로우
  steps:
    - title: 문제 발견
      description: View Transitions 도입 후 발생하는 모든 오작동을 목록화합니다.
      icon: i-lucide-bug
    - title: 패턴 통일
      description: 모든 스크립트를 통일된 초기화 패턴으로 변환합니다.
      icon: i-lucide-repeat
    - title: 검색 구현
      description: Pagefind로 전문 검색을 도입하고 내비게이션을 설정합니다.
      icon: i-lucide-search
    - title: 타입 안전성 확보
      description: any 타입을 제거하고 상수를 중앙 관리하여 유지보수성을 높입니다.
      icon: i-lucide-shield-check
compareTable:
  title: 전후 비교
  before:
    label: 이전
    items:
      - 페이지 전환 후 햄버거 메뉴가 작동하지 않음
      - 사이트 검색 없음
      - any 타입과 하드코딩된 상수가 여기저기 흩어져 있음
      - 인라인 onclick으로 CSP 위반 위험
  after:
    label: 이후
    items:
      - 모든 스크립트가 astro:after-swap으로 올바르게 작동
      - Pagefind로 3축 필터링이 가능한 전문 검색
      - TypeScript 타입 안전성 및 상수 중앙 관리
      - addEventListener + data 속성으로 CSP 준수
faq:
  title: 자주 묻는 질문
  items:
    - question: View Transitions를 사용하지 않아도 이 개선 사항들이 유효한가요?
      answer: '스크립트 초기화 패턴을 제외한 모든 개선 사항(Pagefind, TypeScript, 상수 관리)은 View Transitions 사용 여부와 관계없이 유효합니다.'
    - question: Pagefind는 얼마나 큰 사이트까지 처리할 수 있나요?
      answer: 'Pagefind는 정적 사이트용으로 설계되어 수천 페이지에서도 빠르게 작동합니다. 검색 인덱스는 빌드 시 생성되고 브라우저에서 실행되므로 서버 부하가 없습니다.'
    - question: TypeScript 타입 오류를 무시해도 코드가 작동하나요?
      answer: '작동은 하지만, 타입 오류는 잠재적 버그의 징후입니다. 특히 Astro의 콘텐츠 스키마를 타입 안전하게 만들면 템플릿 내에서 프로퍼티 접근에 IDE 자동 완성이 활성화되어 개발 효율이 크게 향상됩니다.'
---

## 서론

Astro의 View Transitions(ClientRouter)는 SPA처럼 부드러운 페이지 전환을 가능하게 하는 강력한 기능입니다. 그러나 도입하는 순간 문제에 직면하게 됩니다 — 햄버거 메뉴가 열리지 않고, 검색 버튼이 반응하지 않고, 슬라이더가 멈추고...

이 글에서는 View Transitions의 함정과 해결책, 그리고 UX와 코드 품질을 개선하기 위한 실전 기법을 다룹니다.

---

## View Transitions의 스크립트 문제

### 스크립트가 작동을 멈추는 이유

일반적인 페이지 내비게이션에서는 브라우저가 HTML을 다시 파싱하고 모든 스크립트를 실행합니다. 그러나 View Transitions는 DOM 디핑으로 페이지를 업데이트하므로 **인라인 스크립트가 재실행되지 않습니다**.

다음과 같은 처리가 영향을 받습니다:

- 햄버거 메뉴 열기/닫기
- 검색 버튼 클릭 핸들러
- 히어로 이미지 슬라이더
- 목차 스크롤 추적
- YouTube 임베드 파사드 패턴

### 해결 패턴

모든 스크립트를 **이름 있는 함수로 감싸고 `astro:after-swap`에서 재등록하는 패턴**으로 통일합니다.

```html
<script>
  function initHeader() {
    const menuBtn = document.querySelector('[data-menu-toggle]')
    menuBtn?.addEventListener('click', () => { /* ... */ })
  }

  // 초기 실행
  initHeader()

  // View Transitions 이후 재실행
  document.addEventListener('astro:after-swap', initHeader)
</script>
```

### astro:after-swap vs astro:page-load 선택

- `astro:after-swap`: DOM이 교체된 직후에 발생합니다. 초기 페이지 로딩 시에는 발생하지 않으므로 함수를 직접 호출해야 합니다
- `astro:page-load`: 초기 페이지 로딩과 View Transitions **모두**에서 발생합니다. 초기 호출을 생략할 수 있습니다

YouTube 임베드처럼 초기 로딩 시에도 확실한 실행이 필요한 경우에는 `astro:page-load`가 편리합니다.

---

## Pagefind 전문 검색 도입

정적 사이트에서 전문 검색을 구현하고 싶다면 Pagefind가 최적의 선택입니다. 빌드 시 인덱스를 생성하고 브라우저에서 검색을 실행하므로 빠르고 서버가 필요 없습니다.

### 기본 설정

```json
{
  "scripts": {
    "build": "astro build && pagefind --site dist"
  }
}
```

Astro 빌드 후 Pagefind를 실행하여 인덱스를 `dist/pagefind/`에 출력합니다.

### 패싯 검색

`data-pagefind-filter` 속성을 사용하면 저자, 연도, 태그의 3축으로 필터링할 수 있습니다.

```html
<span data-pagefind-filter="author">gui</span>
<span data-pagefind-filter="year">2026</span>
<span data-pagefind-filter="tag">Astro</span>
```

### 검색 모달

`Ctrl+K` 단축키로 열 수 있는 검색 모달을 구현합니다. 검색 결과가 0건일 때는 글 목록, 서비스 페이지, 문의 페이지로의 링크를 표시하여 사용자 이탈을 방지합니다.

### SearchAction 연동

Google의 `SearchAction` 구조화 데이터에 `?q=` 매개변수를 정의하면, 검색 결과에서 직접 사이트 검색으로 이동할 수 있습니다. URL 매개변수를 감지하여 검색 모달을 자동으로 실행하는 로직을 추가합니다.

### 캐시 설정

Pagefind 인덱스 파일은 자주 변경되지 않으므로, Cloudflare Pages 헤더 설정으로 캐시를 활성화합니다.

```
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400
```

---

## 인라인 onclick 제거

HTML에 `onclick="..."`을 직접 작성하는 것은 편리하지만, CSP(Content Security Policy)에 `unsafe-inline`이 필요하게 됩니다.

### 개선 패턴

`onclick`을 `data-*` 속성 + `addEventListener`로 대체합니다.

```html
<!-- 이전 -->
<button onclick="window.openSearch?.()">검색</button>

<!-- 이후 -->
<button data-search-trigger>검색</button>
```

```javascript
document.querySelectorAll('[data-search-trigger]').forEach(btn => {
  btn.addEventListener('click', () => window.openSearch?.())
})
```

---

## 컴포넌트 라이브러리 구축

블로그 글 작성 시 사용할 수 있는 컴포넌트 세트를 갖추면 글의 표현력이 향상됩니다.

| 컴포넌트 | 용도 |
| --- | --- |
| Callout | info / warning / tip / note 4종류의 주석 |
| Timeline | 시계열 이벤트 표시 |
| FAQ | 구조화 데이터 지원 질문과 답변 |
| Gallery | 라이트박스가 있는 이미지 갤러리 |
| CompareTable | 전후 비교 표 |
| ProcessFigure | 단계별 프로세스 다이어그램 |
| LinkCard | OGP 스타일 외부 링크 카드 |
| YouTubeEmbed | 파사드 패턴으로 지연 로딩 |

모든 컴포넌트는 Markdown 프론트매터에서 호출하도록 설계되어 있습니다. 글 템플릿은 `data.callout`이 존재하면 `<Callout>`을 렌더링합니다.

---

## TypeScript 타입 안전성 개선

### any 타입 제거

`any[]`를 `CollectionEntry<'blog'>[]` 같은 구체적인 타입으로 대체합니다. 이를 통해 IDE 자동 완성과 컴파일 타임 오류 탐지가 가능해지고, 템플릿 내 프로퍼티 접근이 안전해집니다.

### 콘텐츠 스키마의 리터럴 타입

```typescript
type: z.enum(['info', 'warning', 'tip', 'note']).default('info')
```

프론트매터 값을 리터럴 타입 유니온으로 정의하면 `if (callout.type === 'info')` 같은 분기가 템플릿 측에서 타입 안전하게 됩니다.

### as const 어설션

상수 객체에 `as const`를 추가하면 프로퍼티가 `readonly`가 되고 타입 추론이 리터럴 타입을 사용합니다. `SITE` 상수에는 반드시 적용하세요.

### 비권장 임포트 마이그레이션

`import { z } from 'astro:content'`(Astro 7에서 삭제 예정)를 `import { z } from 'astro/zod'`로 변경합니다.

---

## 상수 중앙 관리

하드코딩된 값은 변경 시 누락을 일으킵니다. 다음 값들을 `src/data/site.ts`에 통합했습니다:

| 상수 | 통합 전 위치 수 |
| --- | --- |
| AdSense 클라이언트 ID | 4개 파일 |
| GA4 측정 ID | 2곳 |
| 광고 슬롯 ID | 4개 파일 |
| 소셜 URL (X, GitHub, Discord, Aceserver) | 17곳 |
| 전화, 이메일, LINE | 3개 파일 |

```typescript
export const SITE = {
  name: 'Acecore',
  url: 'https://acecore.net',
  ga4Id: 'G-XXXXXXXXXX',
  adsenseClientId: 'ca-pub-XXXXXXXXXXXXXXXX',
  social: {
    x: 'https://x.com/acecore',
    github: 'https://github.com/acecore-systems',
    discord: 'https://discord.gg/...',
  },
} as const
```

---

## 기타 UX 개선

### 목차 스크롤 추적

`IntersectionObserver`를 사용하여 콘텐츠 헤딩을 모니터링하고 사이드바 목차에서 활성 헤딩을 하이라이트합니다. 핵심은 목차 자체도 `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`로 스크롤시키는 것입니다.

### 스크롤 스파이

서비스 페이지 같은 싱글 페이지 레이아웃에서 `IntersectionObserver`를 사용하여 활성 내비게이션 항목을 자동으로 추적합니다.

### 페이지네이션

6개 글마다 자동 페이지네이션, 줄임표(`1 2 ... 9 10`)가 있는 내비게이션, "← 이전" / "다음 →" 텍스트 링크를 구현합니다. 페이지네이션 로직은 `src/utils/pagination.ts`에 중앙 관리합니다.

### 고정 헤더 앵커 링크

고정 헤더가 있으면 앵커 링크 대상이 헤더에 가려집니다. 다음 UnoCSS preflight 설정으로 해결합니다:

```css
[id] { scroll-margin-top: 5rem; }
html { scroll-behavior: smooth; }
```

---

## 정리

View Transitions를 사용한다면, **스크립트 초기화 패턴을 통일하는 것**이 가장 중요합니다. `astro:after-swap`과 `astro:page-load`의 구분을 이해하고, 모든 인터랙션을 테스트하세요.

코드 품질 측면에서는, TypeScript 타입 안전성과 상수 중앙 관리가 장기적 유지보수성에 크게 기여합니다. 처음에는 번거롭게 느껴질 수 있지만, IDE 자동 완성의 혜택은 일상 개발에서 체감할 수 있습니다.

---

## 시리즈 소개

이 글은 "[Astro 사이트 품질 개선 가이드](/blog/website-improvement-batches/)" 시리즈의 일부입니다. 성능, SEO, 접근성 개선에 대해서는 별도 글에서 다루고 있습니다.
