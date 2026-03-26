---
title: 'Astro 사이트 품질 개선 가이드 — PageSpeed 모바일 점수 99 달성'
description: 'Astro + UnoCSS + Cloudflare Pages 사이트를 성능, SEO, 접근성, UX의 4가지 축에서 개선하여 PageSpeed Insights 모바일 99점, 데스크톱 전 항목 100점을 달성한 전 과정 기록.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: 대상 독자
  text: '이 글은 웹사이트 품질 개선에 관심이 있거나 Astro + UnoCSS 운용에 관심이 있는 분을 대상으로 합니다. 전체상을 정리한 허브 기사로, 상세한 주제는 개별 기사에서 다루고 있습니다.'
processFigure:
  title: 개선 프로세스
  steps:
    - title: 측정
      description: PageSpeed Insights와 axe로 병목 지점 파악.
      icon: i-lucide-gauge
    - title: 분석
      description: 점수 내역을 읽고 가장 효과가 큰 개선 사항 파악.
      icon: i-lucide-search
    - title: 구현
      description: 한 번에 하나씩 변경을 적용하고 빌드 오류 제로를 확인.
      icon: i-lucide-code
    - title: 재측정
      description: 배포 후 재측정하여 수치로 결과 검증.
      icon: i-lucide-check-circle
compareTable:
  title: 개선 전후 비교
  before:
    label: 개선 전
    items:
      - PageSpeed 모바일 점수 70점대
      - 구조화 데이터나 OGP 설정 없음
      - 접근성 미지원
      - View Transitions에서 스크립트 오동작
      - 하드코딩된 상수가 여기저기 산재
  after:
    label: 개선 후
    items:
      - 모바일 99 / 100 / 100 / 100(데스크톱 전 항목 100)
      - 7종 구조화 데이터 + OGP + canonical 완전 구현
      - WCAG AA 준수(대비, aria, 스크린 리더 알림, focus-visible)
      - 전 컴포넌트 View Transitions 호환
      - SITE 상수, 소셜 URL, 광고 ID 일원 관리
linkCards:
  - href: /blog/astro-performance-tuning/
    title: 성능 최적화
    description: CSS 전송 전략, 폰트 설정, 반응형 이미지, 캐싱으로 PageSpeed 99를 달성하는 방법.
    icon: i-lucide-gauge
  - href: /blog/astro-seo-and-structured-data/
    title: SEO 및 구조화 데이터
    description: JSON-LD, OGP, 사이트맵, RSS 구현에 대한 실전 가이드.
    icon: i-lucide-search
  - href: /blog/astro-accessibility-guide/
    title: 접근성
    description: aria 속성, 대비, 폼 개선으로 WCAG AA 준수를 달성하는 가이드.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX 및 코드 품질
    description: View Transitions의 함정, Pagefind 전문 검색, TypeScript 타입 안전성에 대한 실전 접근.
    icon: i-lucide-sparkles
faq:
  title: 자주 묻는 질문
  items:
    - question: PageSpeed Insights 모바일에서 100점을 받을 수 있나요?
      answer: '기술적으로는 가능하지만, AdSense나 GA4 같은 외부 서비스를 포함한 사이트에서 안정적인 100점 유지는 매우 어렵습니다. Lighthouse는 느린 4G(~1.6 Mbps)를 시뮬레이션하므로 외부 리소스 로딩에 큰 페널티가 발생합니다. 99점이 현실적인 최고 점수입니다.'
    - question: 어떤 순서로 개선해야 하나요?
      answer: '먼저 PageSpeed Insights로 현 상태를 파악한 후, 가장 영향이 큰 항목부터 대처합니다. 일반적으로 성능 → SEO → 접근성 순서를 추천합니다.'
    - question: 이 개선 기법을 다른 Astro 사이트에도 적용할 수 있나요?
      answer: '네. CSS 전송 전략, 폰트 셀프 호스팅, 구조화 데이터, 접근성 개선은 모든 Astro 사이트에 공통되는 모범 사례입니다.'
    - question: 개선에 GitHub Copilot을 사용했나요?
      answer: '네. 거의 모든 개선은 GitHub Copilot과의 협업으로 수행되었습니다. 자세한 내용은 "GitHub Copilot을 활용한 개발 워크플로우" 기사에서 다루고 있습니다.'
---

## 소개

2026년 3월에 리뉴얼한 Acecore 공식 사이트는 Astro 6 + UnoCSS + Cloudflare Pages로 구축되었습니다. 하지만 새로 출시된 사이트는 성능, SEO, 접근성, UX 면에서 "작동은 한다" 수준에 불과했습니다.

이 글은 150건 이상의 개선을 거쳐 **PageSpeed Insights 모바일 99점, 데스크톱 전 항목 100점**을 달성한 과정을 정리합니다.

---

## PageSpeed 모바일 99 챌린지

먼저 전해야 할 것은, **PageSpeed Insights 모바일에서 높은 점수를 받는 것이 예상보다 훨씬 어렵다**는 것입니다.

### Lighthouse의 모바일 시뮬레이션

PageSpeed Insights는 내부적으로 Lighthouse를 실행하며, 모바일 테스트에 다음의 스로틀링을 적용합니다:

| 설정 | 값 |
| --- | --- |
| 다운로드 속도 | ~1.6 Mbps (느린 4G) |
| 업로드 속도 | ~0.75 Mbps |
| 지연 시간 | 150 ms (RTT) |
| CPU | 4배 감속 |

즉, 광섬유 연결에서 1초에 로드되는 페이지도 Lighthouse 시뮬레이션에서는 **5~6초**가 걸립니다. 느린 4G에서 200 KiB의 CSS를 로딩하면 그것만으로 약 **1초**의 블로킹이 발생합니다.

### 비선형적 점수 스케일링

PageSpeed 점수는 선형이 아닙니다:

- **50 → 90**: 기본적인 최적화(이미지 압축, 불필요한 스크립트 제거)로 달성 가능
- **90 → 95**: CSS, 폰트, 이미지 전송에 전략적 접근 필요
- **95 → 99**: 밀리초 단위의 튜닝이 필요. CSS 인라인 vs 외부 파일 판단이 결정적
- **99 → 100**: 외부 CDN 응답 시간과 Lighthouse 자체 측정 오차에 영향. AdSense나 GA4가 있는 사이트는 안정적 달성이 매우 곤란

### 점수 변동

같은 사이트라도 측정마다 **2~5점** 변동할 수 있습니다. 원인은 다음과 같습니다:

- 이미지 변환 서비스 응답 시간(예: Cloudflare Images)
- Cloudflare Pages 엣지 서버 캐시 상태
- Lighthouse 자체 측정 오차

이런 이유로, "한 번 100점을 받는 것"이 아니라 "반복 측정에서 안정적으로 높은 점수"를 목표로 해야 합니다.

---

## 최종 점수

이러한 과제에도 불구하고, 안정적으로 다음의 점수를 달성할 수 있었습니다:

| 지표 | 모바일 | 데스크톱 |
| --- | --- | --- |
| 성능 | **99** | **100** |
| 접근성 | **100** | **100** |
| 모범 사례 | **100** | **100** |
| SEO | **100** | **100** |

---

## 4가지 개선 축

개선은 4개의 주요 카테고리로 정리하여, 각 주제의 상세는 개별 기사에서 다루고 있습니다.

### 1. 성능

성능 최적화가 모바일 99 달성에 가장 큰 기여를 했습니다. CSS 전송 전략(인라인 vs 외부), 폰트 셀프 호스팅, 반응형 이미지 최적화, AdSense/GA4 지연 로딩 등의 병목을 체계적으로 해결했습니다.

가장 효과가 컸던 3가지 변경:

- **CSS 외부 파일화**: 190 KiB의 CSS 인라인을 외부 파일로 전환하여 HTML 전송 크기를 최대 91% 삭감
- **폰트명 불일치 수정**: `@fontsource-variable/noto-sans-jp`는 폰트명을 `Noto Sans JP Variable`로 등록하지만, CSS에서는 `Noto Sans JP`로 참조하고 있었던 불일치를 발견하여 수정
- **반응형 이미지**: 모든 이미지에 `srcset` + `sizes`를 설정하여 모바일에 적절한 크기의 이미지를 전달

### 2. SEO

Google의 리치 결과를 지원하기 위해 7종의 JSON-LD 구조화 데이터를 구현했습니다. OGP 메타 태그, canonical URL, 사이트맵 최적화, RSS 피드 개선과 결합하여, 검색 엔진에 사이트 구조를 정확하게 전달하기 위한 기반을 구축했습니다.

### 3. 접근성

axe DevTools와 Lighthouse 자동 테스트를 통과하여 PageSpeed 접근성 100점을 달성했습니다. 장식 아이콘에 `aria-hidden` 추가(30건 이상), 외부 링크에 대한 스크린 리더 알림, 대비 수정(`text-slate-400` → `text-slate-500`), `focus-visible` 스타일의 전역 적용 등 꾸준한 점진적 작업이었습니다.

### 4. UX 및 코드 품질

View Transitions(ClientRouter)로 인한 스크립트 오동작 문제를 전 컴포넌트에서 해결하고, Pagefind로 전문 검색을 구현했습니다. 코드 측면에서는 TypeScript 타입 안전성을 강화하고 상수를 일원화(소셜 URL, 광고 ID, GA4 ID를 SITE 상수로 통합)하여 유지보수성을 크게 향상시켰습니다.

---

## 기술 스택

| 기술 | 용도 |
| --- | --- |
| Astro 6 | 정적 사이트 생성(제로 JS 아키텍처) |
| UnoCSS (presetWind3) | 유틸리티 우선 CSS |
| Cloudflare Pages | 호스팅, CDN, 헤더 제어 |
| @fontsource-variable/noto-sans-jp | 셀프 호스팅 일본어 폰트 |
| Cloudflare Images | 이미지 변환(자동 AVIF/WebP 변환) |
| Pagefind | 정적 사이트용 전문 검색 |

---

## 결론

PageSpeed Insights 모바일 99 달성의 핵심은 "필요하지 않은 것은 보내지 않는다"는 원칙을 철저히 지키는 것입니다. CSS 전송 전략, 폰트 셀프 호스팅, 이미지 최적화, 외부 스크립트 지연 로딩 — 각각은 단순한 시책이지만, 조합하면 큰 효과를 발휘합니다.

SEO, 접근성, UX 개선을 병행하면 4개 카테고리 모두에서 높은 점수를 달성할 수 있습니다. 100점에 집착하기보다 안정적인 95점 이상을 목표로 하는 것이 더 현실적인 목표입니다.

각 주제의 상세는 위의 링크 카드를 참조하세요. 개선 워크플로우와 코드에 변경이 반영된 과정에 대해서는 [GitHub Copilot을 활용한 개발 워크플로우](/blog/tax-return-with-copilot/)도 확인해 보세요.
