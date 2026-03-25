---
title: 'GitHub Copilot × Playwright로 웹사이트 몽키 테스트하기: 실전 가이드'
description: 'VS Code 에이전트 모드(GitHub Copilot)와 Playwright 브라우저 도구를 결합하여 정적 사이트를 체계적으로 몽키 테스트하는 실전 가이드. 테스트 설계 방법론, 발견된 버그와 수정, 개선 권장 사항을 다룹니다.'
date: 2026-03-25
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: 이 글의 대상 독자
  text: 'AI 기반 테스트 자동화, 웹사이트 품질 보증 효율화, GitHub Copilot 에이전트 모드 활용에 관심 있는 분들을 위한 글입니다.'
processFigure:
  title: AI 몽키 테스트 수행 방법
  steps:
    - title: 인벤토리
      description: 모든 소스 코드를 읽어 테스트할 라우트, 컴포넌트, 인터랙션을 파악합니다.
      icon: i-lucide-clipboard-list
    - title: 크롤링 테스트
      description: 모든 라우트에 HTTP 요청을 보내 상태 코드, 깨진 이미지, 빈 링크를 탐지합니다.
      icon: i-lucide-globe
    - title: 인터랙션 검증
      description: FAQ 토글, 복사 버튼, 검색 모달, YouTube 임베드 등 JS 기반 요소를 조작합니다.
      icon: i-lucide-mouse-pointer-click
    - title: 구조 및 SEO 감사
      description: 모든 페이지에서 구조화 데이터, OGP, 메타 태그, 헤딩 계층 구조, 접근성을 확인합니다.
      icon: i-lucide-shield-check
compareTable:
  title: 수동 테스트와의 비교
  before:
    label: 기존 수동 테스트
    items:
      - 브라우저에서 각 페이지를 하나씩 눈으로 확인
      - 체크리스트를 수동으로 작성하고 관리
      - 누락이나 확인 빠뜨림이 발생하기 쉬움
      - 재현 절차를 기록하는 데 시간이 많이 걸림
  after:
    label: AI 몽키 테스트
    items:
      - 모든 라우트를 자동 크롤링하여 HTTP 상태 및 DOM 구조 확인
      - AI가 소스 코드에서 자동으로 테스트 대상 추출
      - 깨진 이미지, 빈 링크, JS 오류를 빠짐없이 탐지
      - 발견 → 원인 분석 → 수정 → 재테스트를 단일 세션에서 완료
faq:
  title: 자주 묻는 질문
  items:
    - question: GitHub Copilot 에이전트 모드는 무료로 사용할 수 있나요?
      answer: 'GitHub Copilot Free 플랜은 에이전트 모드에 월별 사용량 제한이 있습니다. Pro 및 Business 플랜은 제한이 완화됩니다. 최신 기능은 VS Code Insiders에서 먼저 사용할 수 있습니다.'
    - question: Playwright 외의 다른 브라우저 도구로도 같은 접근 방식을 사용할 수 있나요?
      answer: 'VS Code에 내장된 브라우저 도구(Simple Browser + Playwright 통합)를 사용합니다. Copilot이 run_playwright_code 도구를 통해 브라우저를 직접 조작하므로 Playwright를 별도로 설치할 필요가 없습니다.'
    - question: 정적 사이트가 아닌 사이트에도 적용할 수 있나요?
      answer: 'SPA 및 SSR 사이트에도 동일한 접근 방식이 가능합니다. 다만, 로그인 인증이 필요한 페이지는 테스트 자격 증명을 안전하게 관리하는 메커니즘이 필요합니다.'
    - question: AI가 발견한 버그를 직접 수정할 수도 있나요?
      answer: '에이전트 모드에서는 파일 읽기/쓰기가 가능하므로, 버그 탐지부터 수정, 빌드 검증까지 전체 흐름을 단일 세션에서 완료할 수 있습니다. 이 글에서는 2개의 버그를 발견하고 그 자리에서 수정했습니다.'
---

## 서론

웹사이트 품질 보증은 출시 전 한 번의 확인만으로는 충분하지 않습니다. 콘텐츠 추가, 라이브러리 업데이트, CDN 설정 변경 등 어느 시점에서든 예상치 못한 문제가 발생할 수 있습니다.

이 글은 **VS Code 에이전트 모드(GitHub Copilot)**가 직접 브라우저를 조작하여 사이트 전체를 테스트한 실전 몽키 테스트 세션을 문서화한 것입니다. AI가 일관되게 수행한 테스트 방법론을 정적 소스 코드 분석부터 동적 브라우저 검증까지 체계화했습니다.

---

## 테스트 환경

| 항목 | 상세 |
|------|------|
| 에디터 | VS Code + GitHub Copilot (에이전트 모드) |
| AI 모델 | Claude Opus 4.6 |
| 브라우저 제어 | VS Code 내장 Playwright 도구 |
| 테스트 대상 | Astro + UnoCSS + Cloudflare Pages로 구축된 정적 사이트 |
| 프리뷰 | `npm run preview` (로컬) + 프로덕션 URL |

에이전트 모드에서 Copilot은 터미널 명령 실행, 파일 읽기/쓰기, 브라우저 조작을 자율적으로 수행합니다. 테스터는 단지 "테스트해 주세요"라고 지시하면, AI가 아래의 전체 프로세스를 자동으로 실행합니다.

---

## 1단계: 테스트 대상 인벤토리

### 전체 소스 코드 읽기

AI는 먼저 프로젝트의 디렉토리 구조를 스캔하고 컴포넌트, 페이지, 유틸리티의 모든 소스 코드를 읽습니다.

```
src/
├── components/    ← 28개 컴포넌트 전체 읽기
├── content/blog/  ← 16개 글의 프론트매터 파싱
├── pages/         ← 모든 라우팅 파일 식별
├── layouts/       ← BaseLayout 구조 파악
└── utils/         ← rehype 플러그인 & OG 이미지 생성 검토
```

이 단계에서 AI는 다음을 자동으로 식별합니다:

- **전체 라우트 목록**: 정적 페이지 7개 + 블로그 관련 라우트(글, 태그, 아카이브, 저자, 페이지네이션)
- **인터랙티브 요소**: 검색 모달, FAQ 토글, 복사 버튼, YouTube 파사드, 맨 위로 스크롤, 히어로 슬라이더
- **외부 연동**: ssgform.com(폼), Cloudflare Turnstile(봇 방지), Google AdSense, GA4

### 자동 테스트 계획 생성

소스 코드 분석 결과를 바탕으로 AI가 자동으로 Todo 리스트 형태의 테스트 계획을 생성합니다. 사람이 체크리스트를 만들 필요가 없습니다.

---

## 2단계: 전체 라우트 크롤링 테스트

### HTTP 상태 확인

빌드된 사이트를 `npm run preview`로 실행하고, Playwright가 모든 라우트에 접속합니다.

```
테스트 대상: 31개 라우트
├── 정적 페이지       7개 (/, /about/, /services/ 등)
├── 블로그 글        16개
├── 태그 페이지      24개
├── 아카이브          4개
├── 페이지네이션      2개 (/blog/page/2/, /blog/page/3/)
├── 저자 페이지       2개
├── RSS              1개
└── 404 테스트        1개

결과: 모든 라우트 200 OK (의도적 404 제외)
```

### DOM 구조 체크

각 페이지에서 다음 항목이 자동으로 검증됩니다:

| 체크 항목 | 검증 방법 | 결과 |
|-----------|-----------|------|
| 깨진 이미지 | `img.complete && img.naturalWidth === 0` | 0건 |
| 빈 링크 | `href`가 비어 있거나 `#`이거나 미설정 | 0건 |
| 안전하지 않은 외부 링크 | `target="_blank"`에 `rel="noopener"` 없음 | 0건 |
| H1 개수 | `document.querySelectorAll('h1').length === 1` | 모든 페이지 OK |
| 스킵 링크 | "Skip to content" 존재 여부 | 모든 페이지 OK |
| lang 속성 | `html[lang="ja"]` | 모든 페이지 OK |

### 데드 링크 체크

진입 페이지에서 내부 링크를 재귀적으로 수집하여 55개 고유 URL의 도달 가능성을 확인했습니다. **데드 링크 0건**이 발견되었습니다.

---

## 3단계: 인터랙션 검증

AI가 Playwright로 브라우저 요소를 직접 조작하여 JavaScript 기반 기능을 검증합니다.

### FAQ (`<details>` 요소)

```javascript
// AI가 실행한 테스트 코드 예시
const details = document.querySelectorAll('details');
// 초기 상태: 모두 닫힘 → OK
// 클릭하여 열기 → OK
// 다시 클릭하여 닫기 → OK
```

### 검색 모달 (Pagefind)

1. `window.openSearch()`로 검색 다이얼로그 열기
2. Pagefind UI 로딩 완료 대기
3. "Astro" 입력 후 검색 결과 표시 확인
4. ESC 키로 닫기 확인

### YouTube 파사드 패턴

1. `.yt-facade` 요소 클릭
2. `youtube-nocookie.com/embed/`용 iframe이 동적으로 생성되는지 확인
3. `autoplay=1` 매개변수가 포함되어 있는지 확인

### 복사 버튼 (View Transitions 이후)

View Transitions를 통한 페이지 전환 **이후에도** 코드 블록 복사 버튼이 재초기화되어 정상 작동하는지 확인했습니다. `astro:page-load` 이벤트를 통한 재등록이 올바르게 작동하고 있었습니다.

### ScrollToTop 버튼

페이지 하단으로 스크롤 → 버튼 표시 → 클릭 → `window.scrollY`가 0으로 돌아가는지 확인.

---

## 4단계: SEO 및 구조화 데이터 감사

### OGP 메타 태그

모든 페이지에서 다음 항목을 확인했습니다:

- `og:title` / `og:description` / `og:image` / `og:url` / `og:type` 설정 여부
- `twitter:card`가 `summary_large_image`로 설정되어 있는지
- `canonical` URL이 올바른지
- OG 이미지 URL이 존재하며 권장 크기(1200×630)인지

### 구조화 데이터 (JSON-LD)

각 페이지의 JSON-LD를 파싱하여 스키마 유형과 내용을 검증했습니다.

| 페이지 유형 | 구조화 데이터 |
|-------------|---------------|
| 모든 페이지 | Organization, WebSite |
| 블로그 글 | BreadcrumbList, BlogPosting, FAQPage |
| FAQ가 있는 글 | FAQPage (mainEntity에 질문과 답변 포함) |

### 사이트맵

`sitemap-index.xml` → `sitemap-0.xml`에 57개 URL이 모두 포함되어 있는지 확인했습니다. `robots.txt`에서의 사이트맵 참조도 올바르게 작동하고 있었습니다.

---

## 5단계: 접근성 검증

Playwright를 통해 여러 페이지에서 AXE 엔진과 동등한 검사를 수행했습니다.

| 체크 항목 | 테스트 페이지 수 | 위반 |
|-----------|-----------------|------|
| img alt 속성 | 4 | 0 |
| button 레이블 | 4 | 0 |
| 헤딩 계층 구조 (h1→h2→h3 순서) | 4 | 0 |
| 폼 입력 레이블 | 1 (문의) | 0 |
| 랜드마크 요소 | 4 | 0 |
| 외부 링크 rel 속성 | 4 | 0 |
| tabindex 값 | 4 | 0 |

**4개 페이지, 모든 체크 항목에서 위반 0건.**

---

## 6단계: View Transitions 내비게이션 테스트

Astro View Transitions에서는 DOM이 차분 업데이트되므로 JavaScript 재초기화가 과제가 됩니다. 다음 전환 패턴을 검증했습니다:

```
홈 → 블로그 목록 → 글 → 태그 → 저자 → 문의 → 서비스 → 홈
```

각 전환 후 확인한 항목:

- URL, 타이틀, H1이 올바르게 업데이트되는지
- 검색 버튼이 작동하는지
- 복사 버튼이 재초기화되는지
- 브레드크럼 내비게이션이 업데이트되는지
- **JS 오류 0건**

---

## 7단계: 보안 헤더 검증

프로덕션 사이트의 응답 헤더 검증:

| 헤더 | 값 | 평가 |
|------|---|------|
| Content-Security-Policy | 완전히 설정됨 | ◎ |
| X-Frame-Options | SAMEORIGIN | ◎ |
| X-Content-Type-Options | nosniff | ◎ |
| Strict-Transport-Security | max-age=15552000 | ○ |
| Referrer-Policy | strict-origin-when-cross-origin | ◎ |
| Permissions-Policy | geolocation=(), camera=() 등 | ◎ |

---

## 발견된 버그와 수정

이번 테스트 세션에서 2개의 버그가 발견되었으며, 둘 다 같은 세션 내에서 수정되었습니다.

### 버그 1: 검색 모달의 복원력 부족

**증상**: Pagefind 스크립트 로딩이 완료되기 전에 검색 버튼을 누르면 UI가 응답하지 않게 됩니다.

**원인**: `loadPagefindScript()`에 초기 실패 후 재시도 메커니즘이 없었습니다.

**수정**: 실패 시 Promise 캐시를 클리어하고 폴백 UI로 "새로고침" 버튼을 표시하도록 구현했습니다.

### 버그 2: CSP 헤더에 Google 오리진 누락

**증상**: Google AdSense 관련 리소스가 CSP에 의해 차단되어 콘솔 오류가 발생합니다.

**원인**: `connect-src`와 `frame-src`에 `https://www.google.com` / `https://www.google.co.jp`가 포함되어 있지 않았습니다.

**수정**: `public/_headers`의 CSP 지시문에 Google 관련 오리진을 추가했습니다.

---

## 테스트 방법론의 체계화

이 AI 몽키 테스트 접근 방식을 정리하면 다음 레이어로 분류할 수 있습니다:

### 레이어 1: 정적 분석 (소스 코드 읽기)

- 디렉토리 구조 스캔
- 컴포넌트 의존성 매핑
- 프론트매터 스키마(Zod) 분석
- CSP 및 리다이렉트 설정 검토

### 레이어 2: HTTP 레이어 테스트 (전체 라우트 크롤링)

- 상태 코드 확인 (200/404/301)
- 응답 헤더 감사 (보안, 캐시)
- 사이트맵, robots.txt, ads.txt 일관성

### 레이어 3: DOM 레이어 테스트 (구조 검증)

- 깨진 이미지, 빈 링크, 안전하지 않은 외부 링크
- H1 고유성 및 헤딩 계층 구조
- 메타 태그 (OGP, canonical, description)
- 구조화 데이터 (JSON-LD)

### 레이어 4: 인터랙션 레이어 테스트 (동작 검증)

- 클릭, 입력, 키보드 조작
- 모달 열기/닫기, 폼 유효성 검사
- View Transitions 이후 JS 재초기화
- 스크롤 이벤트, 지연 로딩

### 레이어 5: 접근성 레이어 테스트

- alt 속성, 레이블, ARIA
- 헤딩 계층 구조, 랜드마크
- 포커스 관리, tabindex
- 스킵 링크

---

## 제한 사항과 제약 조건

AI 몽키 테스트에는 몇 가지 제한 사항이 있습니다:

| 제약 | 상세 |
|------|------|
| 뷰포트 에뮬레이션 | VS Code 내장 브라우저에서는 모바일 너비 에뮬레이션이 작동하지 않습니다. 대신 빌드 출력의 정적 분석으로 CSS 유효성을 검증했습니다 |
| 네트워크 조건 | 오프라인 및 느린 연결 시뮬레이션은 불가능합니다. Service Worker 테스트도 대상 외입니다 |
| 사용자 "느낌" | 디자인 아름다움, 가독성, 브랜드 일관성은 사람의 판단이 필요합니다 |
| 인증 플로우 | 로그인이 필요한 페이지는 별도의 안전한 자격 증명 관리가 필요합니다 |

CSS 반응형 디자인의 경우, 빌드 출력의 CSS 파일을 직접 분석하여 `@media(min-width:768px)` 미디어 쿼리가 올바르게 생성되었는지 확인하는 방식으로 대체했습니다.

---

## 정리

GitHub Copilot 에이전트 모드는 "테스트해 주세요"라는 한 마디 지시에서 시작하여 소스 코드 분석 → 테스트 계획 → 자동 브라우저 조작 → 버그 수정 → 재검증이라는 전체 QA 사이클을 완료할 수 있습니다.

이번 세션의 결과를 정리하면:

- **테스트 대상**: 31개 라우트 + 24개 태그 + 4개 아카이브 + 2개 페이지네이션 = 61개 라우트
- **테스트 항목**: HTTP 상태, DOM 구조, 인터랙션, SEO, 접근성, 보안, View Transitions
- **발견된 버그**: 2건 (검색 모달, CSP 헤더) → 현장에서 수정
- **접근성 위반**: 0건
- **데드 링크**: 0건

사람의 시각적 검수와 AI 자동 검증을 조합하면 테스트 커버리지와 효율성을 모두 달성할 수 있습니다.
