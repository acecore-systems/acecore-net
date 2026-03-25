---
title: 'Astro 사이트에서 PageSpeed 모바일 99점을 달성하는 실전 기법'
description: 'Astro + UnoCSS + Cloudflare Pages 사이트에서 PageSpeed Insights 모바일 99점을 달성한 최적화 기법. CSS 전달 전략, 폰트 설정 함정, 반응형 이미지, AdSense 지연 로딩, 캐시 설정을 다룹니다.'
date: 2026-03-15
lastUpdated: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80
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
      description: 외부 CDN 지연을 제거하기 위해 폰트를 셀프 호스팅합니다.
      icon: i-lucide-type
    - title: 이미지 최적화
      description: wsrv.nl + srcset + sizes로 최적 크기를 전달합니다.
      icon: i-lucide-image
    - title: 지연 로딩
      description: 첫 사용자 인터랙션 시 AdSense와 GA4를 주입합니다.
      icon: i-lucide-timer
compareTable:
  title: 최적화 전후 비교
  before:
    label: 최적화 전
    items:
      - Google Fonts CDN (렌더링 차단)
      - 190 KiB의 CSS가 HTML에 인라인
      - 이미지가 고정 크기로 제공
      - AdSense 스크립트가 즉시 로딩
      - 모바일 점수 70점대
  after:
    label: 최적화 후
    items:
      - '@fontsource를 통한 셀프 호스팅 (올바른 폰트명 참조)'
      - CSS 외부화 + immutable 캐시
      - srcset + sizes로 화면 너비에 최적화된 전달
      - AdSense와 GA4를 첫 스크롤 시 지연 로딩
      - 모바일 99 / 데스크톱 100
faq:
  title: 자주 묻는 질문
  items:
    - question: 인라인 CSS와 외부 CSS 중 어느 것이 더 빠른가요?
      answer: 'CSS 전체 크기에 따라 다릅니다. 20 KiB 이하면 인라인이 유리합니다. 그 이상이면 외부화하고 브라우저 캐시를 활용하는 것이 이후 방문 속도를 크게 향상시킵니다.'
    - question: Google Fonts CDN은 왜 느린가요?
      answer: 'PageSpeed Insights는 저속 4G(~1.6 Mbps, RTT 150ms)를 시뮬레이션합니다. 외부 도메인 연결에는 DNS 조회 + TCP 연결 + TLS 핸드셰이크가 필요하며, 이 지연이 렌더링을 차단합니다. 셀프 호스팅은 같은 도메인에서 제공하므로 이 지연을 제거합니다.'
    - question: wsrv.nl이 느리면 어떻게 하나요?
      answer: 'wsrv.nl은 Cloudflare CDN을 통해 제공되므로 보통 빠릅니다. 다만, PageSpeed 테스트 시 CDN 캐시가 미스되면 LCP가 저하될 수 있습니다. 크리티컬 이미지에 <link rel="preload">를 설정하여 브라우저에 조기 페치를 지시하세요.'
    - question: AdSense를 지연 로딩하면 수익에 영향이 있나요?
      answer: '첫 화면에 광고가 없다면, 첫 스크롤 시 로딩해도 거의 같은 표시 타이밍입니다. 페이지 속도 개선으로 인한 SEO 효과가 더 긍정적인 영향을 미칩니다.'
---

## 서론

Acecore 공식 웹사이트는 Astro 6 + UnoCSS + Cloudflare Pages로 구축되어 있습니다. 이 글에서는 PageSpeed Insights에서 **모바일 99 / 데스크톱 100**을 달성한 최적화 기법을 소개합니다.

최종적으로 달성한 점수:

| 지표 | 모바일 | 데스크톱 |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## 왜 Astro를 선택했는가?

기업 사이트에는 "속도"와 "SEO"가 요구됩니다. Astro는 정적 사이트 생성(SSG)에 특화되어 있으며 기본적으로 JavaScript가 0입니다. React나 Vue 같은 프레임워크와 달리 프레임워크 코드가 클라이언트에 배포되지 않아 초기 렌더링이 매우 빠릅니다.

CSS 프레임워크로는 UnoCSS를 선택했습니다. Tailwind CSS처럼 유틸리티 퍼스트 접근 방식을 취하지만, 빌드 시 사용된 클래스만 추출하여 CSS 크기를 최소화합니다. v66 이후로는 `presetWind3()`가 권장되므로 반드시 마이그레이션하세요.

---

## CSS 전달 전략: 인라인 vs 외부

CSS 전달 전략이 PageSpeed 점수에 가장 큰 영향을 미쳤습니다.

### CSS가 작을 때 (~20 KiB)

Astro에서 `build.inlineStylesheets: 'always'`를 설정하면 모든 CSS가 HTML에 직접 삽입됩니다. 외부 CSS 파일에 대한 HTTP 요청이 제거되어 FCP(First Contentful Paint)가 개선됩니다.

이 접근 방식은 CSS가 약 20 KiB 이하일 때 최적입니다.

### CSS가 클 때 (20 KiB 이상)

그러나 일본어 웹 폰트(`@fontsource-variable/noto-sans-jp`)를 사용하면 상황이 달라집니다. 이 패키지에는 **124개의 `@font-face` 선언**(~96.7 KiB)이 포함되어 있어, 전체 CSS가 약 190 KiB가 됩니다.

190 KiB의 CSS를 모든 HTML 페이지에 인라인하면 홈페이지 HTML이 **225 KiB**로 부풀어 오릅니다. 저속 4G에서는 이 HTML만 전송하는 데 약 1초가 걸립니다.

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

이 변경으로 HTML 크기가 **84~91% 감소**(예: index.html이 225 KiB → 35 KiB)하고, PageSpeed가 **96 → 99**로 향상되었습니다.

---

## 폰트 최적화: 올바른 셀프 호스팅 설정

### Google Fonts CDN을 피하세요

Google Fonts CDN은 편리하지만 PageSpeed Insights 모바일 테스트에서는 치명적입니다. 테스트 결과, Google Fonts CDN을 사용하면 **FCP가 6.1초, 점수가 62점**까지 하락했습니다.

저속 4G에서 외부 도메인 연결은 DNS 조회 → TCP 연결 → TLS 핸드셰이크 → CSS 다운로드 → 폰트 다운로드라는 체인을 발생시켜 렌더링을 크게 지연시킵니다.

### 셀프 호스팅 도입

`@fontsource-variable/noto-sans-jp`를 설치하고 레이아웃 파일에서 임포트하기만 하면 됩니다.

```bash
npm install @fontsource-variable/noto-sans-jp
```

```javascript
// BaseLayout.astro
import '@fontsource-variable/noto-sans-jp'
```

### 주의: 폰트명 불일치

여기에 놀라운 함정이 있습니다. `@fontsource-variable/noto-sans-jp`가 `@font-face`에 등록하는 폰트명은 **`Noto Sans JP Variable`**입니다. 그러나 많은 사람들이 CSS에 `Noto Sans JP`라고 씁니다.

이 불일치로 인해 **폰트가 제대로 적용되지 않고 브라우저의 폴백 폰트가 사용됩니다**. 96.7 KiB의 폰트 데이터를 로딩하면서도 하나도 사용되지 않는 것입니다.

UnoCSS 설정에서 올바른 폰트 패밀리를 지정합니다:

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP Variable', 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif",
  },
}
```

TypeScript 타입 오류가 발생하면 `src/env.d.ts`에 모듈 선언을 추가합니다:

```typescript
declare module '@fontsource-variable/noto-sans-jp';
```

---

## 이미지 최적화: wsrv.nl + srcset + sizes

### wsrv.nl 프록시

외부 이미지는 [wsrv.nl](https://images.weserv.nl/)을 통해 제공합니다. URL 매개변수를 추가하기만 하면 다음을 제공합니다:

- **포맷 변환**: `output=auto`로 브라우저 지원에 따라 AVIF/WebP를 자동 선택
- **품질 조정**: `q=50`으로 충분한 품질을 유지하면서 파일 크기를 약 10% 감소
- **리사이징**: `w=` 매개변수로 지정한 너비로 리사이징

### srcset 및 sizes 설정

모든 이미지에 `srcset`과 `sizes`를 설정하여 화면 너비에 따라 최적 크기를 전달합니다.

```html
<img
  src="https://wsrv.nl/?url=...&w=800&output=auto&q=50"
  srcset="
    https://wsrv.nl/?url=...&w=480&output=auto&q=50 480w,
    https://wsrv.nl/?url=...&w=640&output=auto&q=50 640w,
    https://wsrv.nl/?url=...&w=960&output=auto&q=50 960w,
    https://wsrv.nl/?url=...&w=1280&output=auto&q=50 1280w,
    https://wsrv.nl/?url=...&w=1600&output=auto&q=50 1600w
  "
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  loading="lazy"
  decoding="async"
/>
```

### sizes 정밀도

`sizes` 속성을 `100vw`(전체 화면 너비)로 두면 브라우저가 필요 이상으로 큰 이미지를 선택합니다. 실제 레이아웃에 맞게 `calc(100vw - 2rem)`이나 `(max-width: 768px) 100vw, 50vw` 등으로 지정합니다.

### LCP 개선: preload

LCP(Largest Contentful Paint)에 영향을 미치는 이미지에 `<link rel="preload">`를 설정합니다. Astro 레이아웃 컴포넌트에 `preloadImage` prop을 추가하여 히어로 이미지 같이 최우선으로 로딩해야 하는 이미지를 지정합니다.

```html
<link rel="preload" as="image" href="..." />
```

### CLS 방지 (레이아웃 시프트)

모든 이미지에 `width`와 `height` 속성을 지정합니다. 이렇게 하면 브라우저가 표시 공간을 미리 확보하여, 로딩 완료 시 레이아웃 시프트(CLS)를 방지합니다.

빠뜨리기 쉬운 이미지로는 아바타(32×32, 48×48, 64×64px)와 YouTube 썸네일(480×360px)이 있습니다.

---

## 광고 및 분석의 지연 로딩

### AdSense

Google AdSense 스크립트는 약 100 KiB로 초기 렌더링에 크게 영향을 미칩니다. 사용자가 처음 스크롤할 때 스크립트를 동적으로 주입합니다.

```javascript
window.addEventListener('scroll', () => {
  const script = document.createElement('script')
  script.src = 'https://pagead2.googlesyndication.com/...'
  script.async = true
  document.head.appendChild(script)
}, { once: true })
```

`{ once: true }`로 이벤트 리스너가 한 번만 실행되도록 합니다. 이를 통해 첫 화면의 JavaScript 전송량이 거의 0이 됩니다.

### GA4

Google Analytics 4도 마찬가지로 `requestIdleCallback`을 사용하여 지연 주입합니다. 브라우저가 유휴 상태일 때 스크립트를 주입하여 사용자 인터랙션을 방해하지 않습니다.

---

## 캐시 전략

Cloudflare Pages의 `_headers` 파일에서 자산 유형별로 최적의 캐시 정책을 설정합니다.

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
- `/pagefind/*`는 1주일 캐시 + 1일 stale-while-revalidate
- HTML은 항상 최신 버전을 가져옴

---

## 성능 최적화 체크리스트

1. **CSS 전달 전략이 적절한가?**: 20 KiB 이하면 인라인, 초과하면 외부화
2. **폰트를 셀프 호스팅하고 있는가?**: 외부 CDN은 저속 4G에서 치명적
3. **폰트명이 올바른가?**: `@fontsource-variable`의 등록명(`*Variable`) 확인
4. **모든 이미지에 srcset + sizes가 있는가?**: 특히 모바일용 작은 크기 준비
5. **LCP 요소에 preload가 있는가?**: 히어로 이미지 및 첫 화면 이미지
6. **이미지에 width/height가 있는가?**: CLS 방지
7. **AdSense/GA4가 지연 로딩되는가?**: 첫 화면 JS 전송량 0
8. **캐시 헤더가 설정되어 있는가?**: Immutable 캐시로 이후 방문 속도 향상

---

## 정리

성능 최적화의 원칙은 한마디로 요약할 수 있습니다: **"불필요한 것은 보내지 마라."** CSS 인라인은 얼핏 빠르게 보이지만 190 KiB에서는 역효과가 납니다. 폰트 셀프 호스팅은 필수이지만, 폰트명 불일치는 숨겨진 함정입니다.

Astro의 제로 JS 아키텍처를 기반으로 CSS, 폰트, 이미지, 광고 스크립트의 전송을 최소화하면 모바일 99점은 충분히 달성 가능합니다.

---

## 시리즈 소개

이 글은 "[Astro 사이트 품질 개선 가이드](/blog/website-improvement-batches/)" 시리즈의 일부입니다. SEO, 접근성, UX 개선에 대해서는 별도 글에서 다루고 있습니다.
