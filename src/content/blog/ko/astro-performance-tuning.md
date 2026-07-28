---
title: 'Astro 사이트의 PageSpeed를 개선하는 실전 기법'
description: 'Astro + UnoCSS + Cloudflare Pages 사이트를 위한 실전 최적화 기법입니다. CSS 전달, 폰트, 반응형 이미지, AdSense 로딩 제어, GA4 지연 로딩, 캐시를 다룹니다.'
date: 2026-03-15T00:00
lastUpdated: '2026-07-29T00:28:23+09:00'
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: /uploads/acecore-generated/blog-astro-performance-tuning.webp
callout:
  type: tip
  title: 이 글의 대상 독자
  text: 'Astro 사이트의 PageSpeed 점수를 개선하고 싶은 분들을 위한 글입니다. CSS, 폰트, 이미지, 광고 스크립트 최적화에 대한 바로 적용 가능한 실전 기법을 다룹니다.'
processFigure:
  title: 최적화 워크플로우
  steps:
    - title: CSS 전달 전략
      description: 인라인과 외부 CSS의 트레이드오프를 이해합니다.
      icon: i-lucide-file-code
    - title: 폰트 최적화
      description: 실제로 로드되고 렌더링에 사용되는 폰트를 확인합니다.
      icon: i-lucide-type
    - title: 이미지 최적화
      description: 외부 이미지를 Cloudflare Images + srcset + sizes로 최적화합니다.
      icon: i-lucide-image
    - title: 로딩 제어
      description: AdSense 최초 시도와 재시도, GA4 지연 로딩을 확인합니다.
      icon: i-lucide-timer
compareTable:
  title: 최적화 전후 비교
  before:
    label: 최적화 전
    items:
      - 폰트 연결과 실제 렌더링 결과를 확인하지 않음
      - CSS 출력과 캐시를 확인하지 않음
      - 이미지가 고정 크기로 제공
      - AdSense 스크립트가 즉시 로딩
      - 테스트 조건을 기록하지 않고 고정 점수만 추적
  after:
    label: 최적화 후
    items:
      - 폰트 네트워크 요청과 렌더링 결과를 확인
      - 큰 CSS 외부화 + 해시 자산 immutable 캐시
      - srcset + sizes로 화면 너비에 최적화된 전달
      - AdSense는 표시 가능성을 확인해 최초 시도 후 Observer로 재시도, GA4는 인터랙션 또는 타이머로 로딩
      - 동일한 조건에서 PageSpeed Insights를 반복 측정
faq:
  title: 자주 묻는 질문
  items:
    - question: 인라인 CSS와 외부 CSS 중 어느 것이 더 빠른가요?
      answer: "CSS 크기, 페이지 구조, 캐시 상태에 따라 다릅니다. 현재 build.inlineStylesheets: 'auto' 설정을 사용하고 생성된 HTML과 CSS를 확인한 뒤 같은 조건에서 측정합니다."
    - question: Google Fonts CDN은 왜 느린가요?
      answer: '외부 도메인은 DNS 조회, TCP 연결, TLS 핸드셰이크를 추가할 수 있습니다. 영향은 네트워크와 캐시에 따라 달라지므로 실제 요청과 렌더링된 폰트를 확인해 판단합니다.'
    - question: Cloudflare Images가 느리면 어떻게 하나요?
      answer: 'Cloudflare Images 성능은 원본, 변환, 캐시 상태에 따라 달라집니다. 최초 변환이나 캐시 미스는 원본 이미지를 가져오므로 같은 조건에서 LCP 후보를 측정하고 필요한 경우에만 responsive preload를 검토합니다.'
    - question: AdSense 로딩 제어가 수익에 영향을 주나요?
      answer: '영향은 광고 위치와 방문자 행동에 따라 달라집니다. 변경 전후의 조회 가능성, 광고 요청, 수익을 비교하고 성능 지표와 분리해 평가하세요.'
---

## 서론

Acecore 공식 웹사이트는 Astro 7.1.3 + UnoCSS + Cloudflare Pages로 구축되어 있습니다. 이 글은 2026년 7월 29일 기준 저장소에서 확인한 최적화 설정을 다룹니다.

PageSpeed Insights 결과는 측정 시점, 기기, 네트워크에 따라 달라집니다. 따라서 고정 점수를 제시하지 않고, 같은 조건에서 변경 전후의 Core Web Vitals와 전송량을 비교합니다.

---

## 왜 Astro를 선택했는가?

Astro는 정적 사이트 생성(SSG)을 지원하고 필요한 곳에만 클라이언트 JavaScript를 추가할 수 있습니다. 현재 사이트도 ClientRouter, 검색, 광고, 분석 스크립트를 전달하므로 클라이언트 스크립트가 전혀 없다고 가정하지 않고 실제 전달량과 렌더링 지표를 측정합니다.

현재 사이트는 UnoCSS와 `presetWind3()`를 사용합니다. 빌드에서 감지한 유틸리티로 CSS를 생성해 전달량을 줄일 수 있지만 최소 크기를 보장하지는 않습니다. 생성된 CSS와 실제 사용 클래스를 확인합니다.

---

## CSS 전달 전략: 인라인 vs 외부

CSS 전달 방식은 HTML 크기, 추가 요청, 브라우저 캐시에 영향을 줍니다.

### CSS를 인라인할 때

Astro에서 `build.inlineStylesheets: 'always'`를 설정하면 모든 CSS가 HTML에 직접 삽입됩니다. 외부 CSS 요청이 제거되며 페이지 구성에 따라 FCP(First Contentful Paint)가 개선될 수 있습니다.

유리한 조건은 CSS 크기와 페이지 구조에 따라 달라지므로 고정 임계값만으로 결정하지 않습니다.

### 외부 CSS를 사용할 때

외부 파일은 해시된 공통 CSS를 브라우저 캐시로 재사용할 수 있게 합니다.

현재 사이트는 `build.inlineStylesheets: 'auto'`를 사용하고 조정할 때 생성 결과를 확인합니다.

### 해결책: 외부화 + Immutable 캐시

Astro 설정을 `build.inlineStylesheets: 'auto'`로 변경합니다. Astro가 CSS 크기에 따라 자동으로 판단하여, 큰 CSS는 외부 파일로 제공합니다.

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto',
  },
})
```

외부 CSS 파일은 `/_astro/` 디렉토리에 출력되므로, Cloudflare Pages 헤더 설정으로 immutable 캐시를 적용합니다.

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

설정을 변경한 뒤에는 생성된 HTML, CSS 파일, 캐시 동작을 확인하고 같은 조건에서 PageSpeed Insights를 다시 실행합니다.

---

## 폰트 최적화: 실제 전달 확인

### 외부 전달과 로컬 전달 비교

외부 폰트는 크리티컬 패스에 연결을 추가할 수 있습니다. 로컬 전달도 사이트에서 폰트 CSS와 파일을 보내므로 두 방식을 같은 조건에서 비교합니다.

네트워크 패널에서 폰트 요청, 캐시, 전송량을 확인하고 Rendered Fonts에서 브라우저가 실제 사용한 폰트를 확인합니다.

### 현재 저장소 상태

`package.json`에는 `@fontsource/noto-sans-jp`가 있지만 2026년 7월 29일 기준 `src` 어디에서도 임포트하지 않습니다. 의존성에 존재하는 것만으로 폰트가 전달된다고 볼 수 없습니다.

현재 UnoCSS 폰트 스택은 다음과 같습니다.

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', system-ui, sans-serif",
  },
}
```

이 선언만으로 웹 폰트가 다운로드되지는 않습니다. 셀프 호스팅을 도입한다면 명시적 import, 생성된 CSS와 폰트 파일, 렌더링 결과를 함께 확인합니다.

---

## 이미지 최적화: Cloudflare Images + srcset + sizes

### Cloudflare Images Transformations

현재 유틸리티는 외부 이미지만 Cloudflare Images의 `/cdn-cgi/image/` 변환으로 전달합니다. 루트 상대 `/uploads/...` 파일과 관리 중인 `asv.acecore.net/uploads/...` 이미지는 직접 제공합니다.

- **포맷 변환**: `output=auto`로 브라우저 지원에 따라 AVIF/WebP를 자동 선택
- **품질 조정**: 현재 유틸리티의 기본값은 `quality=75`이며, 변경 전 실제 이미지를 확인합니다
- **리사이징**: `w=` 매개변수로 지정한 너비로 리사이징

### srcset 및 sizes 설정

반응형 전달이 필요한 외부 이미지는 유틸리티로 `srcset`을 생성하고 `sizes`를 설정합니다.

```astro
---
import { generateSrcSet, optimizeImage } from '../utils/image'

const remoteImage =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop'
---

<img
  src={optimizeImage(remoteImage, { width: 800, height: 400, quality: 75 })}
  srcset={generateSrcSet(remoteImage, [480, 640, 960, 1280, 1600], {
    quality: 75,
    aspectRatio: 2,
  })}
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
/>
```

### sizes 정밀도

`sizes` 속성을 `100vw`(전체 화면 너비)로 두면 브라우저가 필요 이상으로 큰 이미지를 선택합니다. 실제 레이아웃에 맞게 `calc(100vw - 2rem)`이나 `(max-width: 768px) 100vw, 50vw` 등으로 지정합니다.

### LCP 개선: preload

실제로 LCP 후보인 이미지만 preload합니다. 반응형 이미지에서는 레이아웃의 `href`, `imagesrcset`, `imagesizes`를 이미지와 맞추고 `fetchpriority="high"`를 설정합니다. 불필요한 preload는 리소스 경쟁을 만들 수 있으므로 측정으로 대상을 확인합니다.

```html
<link
  rel="preload"
  as="image"
  href="..."
  imagesrcset="..."
  imagesizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  fetchpriority="high"
/>
```

### CLS 방지 (레이아웃 시프트)

원본 이미지와 같은 비율이 되도록 정확한 `width`와 `height`를 지정합니다. 값이 정확하면 브라우저가 공간을 예약할 수 있지만 속성만으로 CLS 제거가 보장되지는 않습니다. 현재 hero와 Markdown rewrite 경로도 고정 치수를 추가하므로 각 원본과 비율이 맞는지 확인하고 CLS를 측정합니다.

빠뜨리기 쉬운 이미지로는 아바타(32×32, 48×48, 64×64px)와 YouTube 썸네일(480×360px)이 있습니다.

---

## 광고 로딩 제어와 분석 지연 로딩

### AdSense

일본어 `/blog/`에서 활성화되는 현재 runtime은 각 슬롯에 `IntersectionObserver`(`rootMargin: 200px`)와 `ResizeObserver`를 등록한 뒤 표시 가능성을 확인하고 최초 `attemptInit()`을 실행합니다. 최초 시도는 intersection을 기다리지 않으므로 사용할 수 있는 너비가 있으면 즉시 광고를 요청할 수 있습니다. Observer는 intersection 또는 크기 변경 시 재시도에 사용합니다. locale prefix가 있는 번역 URL은 현재 슬롯이 삽입되어도 runtime을 로드하지 않습니다.

```javascript
const retry = () => void attemptInit()
const intersectionObserver = new IntersectionObserver(
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      retry()
    }
  },
  { rootMargin: '200px' },
)
const resizeObserver = new ResizeObserver(retry)

intersectionObserver.observe(container)
resizeObserver.observe(container)
void attemptInit() // 최초 시도는 intersection을 기다리지 않음
```

`attemptInit()`은 슬롯 너비와 표시 상태를 확인하고 상태 속성으로 중복 요청을 방지합니다.

### GA4

Google Analytics 4는 `pointerdown`, `keydown`, `touchstart`, `scroll` 중 하나로 예약합니다. 지원되는 경우 `requestIdleCallback`, 그렇지 않으면 `setTimeout`을 사용하며, 인터랙션이 없어도 홈에서는 12초, 다른 페이지에서는 4초 뒤 타이머가 로딩을 예약합니다.

---

## 캐시 전략

다음 블록은 Cloudflare Pages `_headers`의 현재 설정입니다. 모든 파일에 대한 일반적인 권장값은 아닙니다.

```
# 빌드 출력 (해시된 파일명)
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# 검색 인덱스
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# HTML
/*
  Cache-Control: public, max-age=0, must-revalidate
```

- `/_astro/*`는 파일명에 콘텐츠 해시가 포함되어 있어 1년 immutable 캐시가 안전
- `/pagefind/*`는 현재 1주일 캐시 + 1일 stale-while-revalidate입니다. 고정 이름인 `pagefind-entry.json`이 해시 metadata를 참조하므로 세대 불일치를 피하려면 entry/bootstrap 파일을 재검증하고 장기 캐시는 해시 chunk에만 적용하는 편이 안전합니다
- HTML은 `max-age=0, must-revalidate`로 캐시를 재사용하기 전에 재검증

---

## 성능 최적화 체크리스트

1. **CSS 전달 전략이 적절한가?**: `auto` 생성 결과와 같은 조건의 측정 확인
2. **폰트 전달 방식을 비교했는가?**: 같은 조건에서 셀프 호스팅과 외부 CDN을 측정
3. **실제 폰트 전달을 확인했는가?**: 네트워크 요청과 Rendered Fonts 확인
4. **반응형 전달 대상 이미지에 srcset + sizes가 있는가?**: 특히 모바일용 작은 크기 준비
5. **실제 LCP 후보만 preload하는가?**: 반응형 srcset, sizes, priority를 일치
6. **이미지 width/height가 정확한가?**: 원본 비율과 맞추고 CLS 측정
7. **AdSense/GA4 제어가 적절한가?**: AdSense 최초 시도와 Observer 재시도, GA4 인터랙션과 타이머 fallback 확인
8. **캐시 헤더가 설정되어 있는가?**: immutable은 해시 자산에만 적용

---

## 정리

성능 최적화의 원칙은 **"불필요한 것은 보내지 마라"**로 요약할 수 있습니다. CSS 전달은 실제 출력으로 확인하고, 폰트 셀프 호스팅은 사이트의 측정과 운영에 맞을 때 선택할 수 있는 방식입니다.

고정 점수를 결과로 보지 말고 같은 조건에서 Core Web Vitals와 전송량을 다시 측정하며 광고와 Analytics 동작도 함께 확인합니다.

---

## 시리즈 소개

이 글은 "[Astro 사이트 품질 개선 가이드](/blog/website-improvement-batches/)" 시리즈의 일부입니다. SEO, 접근성, UX 개선에 대해서는 별도 글에서 다루고 있습니다.
