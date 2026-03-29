---
title: 'Astro 사이트 품질 개선 가이드 속편 - PageSpeed Insights 전 항목 100점을 만든 최종 조정'
description: '이전 글 이후 마지막으로 진행한 개선을 정리합니다. Cloudflare Web Analytics 중지, GA4와 검색 UI의 지연 로드, PageSpeed Insights 모바일과 데스크톱 4개 항목 모두 100점 달성, Search Console의 빵부스러기와 색인 정리, 공유 SVG 아이콘으로의 이행, 그리고 시도했지만 채택하지 않은 추가 최적화 판단까지 한 번에 정리했습니다.'
date: 2026-03-29T02:30
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: 이전 글의 후속편입니다
  text: '앞선 "Astro 사이트 품질 개선 가이드"의 연장선에서, 이번 글은 PageSpeed Insights 전 항목 100점에 도달하기까지의 최종 조정을 정리합니다. 이번에는 모바일과 데스크톱 모두 4개 지표가 100점에 도달했으며, GA4와 검색 UI의 지연 로드, Search Console 정리, 남아 있는 진단의 해석 방식과 시도했지만 채택하지 않은 추가 최적화 판단까지 함께 반영했습니다.'
insightGrid:
  eyebrow: 왜 가치가 있는가
  title: PageSpeed 전 항목 100점이 여전히 높은 수준인 이유
  description: 100점이 실제 사이트의 모든 것이 완벽하다는 뜻은 아니지만, Lighthouse가 보는 핵심 감사 항목에서 큰 누락이 없다는 뜻입니다.
  variant: card
  items:
    - title: slow 4G 기준 측정
      description: 모바일 측정은 slow 4G와 CPU 감속 조건에서 실행됩니다. 가벼운 정적 사이트라도 100점은 쉽게 나오지 않습니다.
      icon: i-lucide-gauge
      tone: brand
    - title: 4개 카테고리 동시 만점
      description: Performance만 좋아서는 충분하지 않습니다. Accessibility, Best Practices, SEO도 동시에 모두 충족해야 합니다.
      icon: i-lucide-shield-check
      tone: emerald
    - title: 서드파티 요소를 다시 정리해야 했다
      description: 외부 beacon과 불필요한 의존성을 줄이면서도 GA4나 광고처럼 필요한 요소는 남겨 두어야 합니다.
      icon: i-lucide-sparkles
      tone: amber
    - title: 진단 결과를 해석해야 함
      description: 모든 insight를 0으로 만드는 것이 목적이 아니라, 남은 진단이 수용 가능한지 판단하는 것이 중요합니다.
      icon: i-lucide-search
      tone: slate
processFigure:
  title: 이번 최종 조정
  steps:
    - title: 측정
      description: PageSpeed Insights와 Search Console을 함께 보며 실제 문제와 참고용 진단을 구분합니다.
      icon: i-lucide-gauge
    - title: 정리
      description: Cloudflare Web Analytics의 역할을 다시 보고 GA4, 광고, 검색 중 무엇을 남길지 결정합니다.
      icon: i-lucide-shield-check
    - title: 지연화
      description: GA4와 Pagefind 기반 검색 UI를 초기 로드에서 빼고 실제로 필요할 때만 읽도록 바꿉니다.
      icon: i-lucide-timer-reset
    - title: 수정
      description: breadcrumb, canonical, noindex, sitemap, 아이콘 렌더링을 함께 정리합니다.
      icon: i-lucide-wrench
    - title: 판단
      description: 추가 CSS 분할과 third-party 축소안을 비교하고, 효과보다 비용이 큰 안은 채택하지 않습니다.
      icon: i-lucide-scale-3d
compareTable:
  title: 최종 조정으로 달라진 점
  before:
    label: 개선 전
    items:
      - 모바일 점수는 높았지만 Cloudflare Web Analytics beacon이 여전히 남아 있었다
      - GA4와 검색 UI가 아직 초기 로드에 너무 가까워서 필요한 기능과 로딩 시점의 경계가 애매했다
      - PageSpeed의 남은 진단이 무엇을 의미하는지 애매해서 어디서 멈춰야 할지 판단 기준이 없었다
      - 일부 글에서 UnoCSS icon class 잔재 때문에 빈 원만 표시되는 경우가 있었다
      - Search Console에는 breadcrumb 오류와 목록 페이지 색인 노이즈가 남아 있었다
  after:
    label: 개선 후
    items:
      - 모바일과 데스크톱 모두 4개 지표가 전부 100점
      - Cloudflare Web Analytics를 중지했고, GA4는 유지하되 지연 로드로 옮겼다
      - 검색 UI와 Pagefind를 온디맨드 로드로 바꿔 초기 로드 부담을 줄였다
      - shared SVG Icon으로 통일하고 legacy icon 이름은 alias로 흡수했다
      - breadcrumb, noindex, sitemap, canonical을 Search Console 기준으로 정리했다
      - 효과가 낮은 추가 최적화는 과감히 보류하고, 멈춰야 할 지점을 설명할 수 있게 되었다
checklist:
  title: 이번에 완료한 대응
  items:
    - text: Cloudflare Web Analytics를 중지하고 beacon 주입을 멈췄다
      checked: true
    - text: GA4는 남기되 requestIdleCallback과 사용자 상호작용 기반 지연 로드로 바꿨다
      checked: true
    - text: 검색 UI와 Pagefind 스크립트, CSS를 초기 로드 경로에서 제거했다
      checked: true
    - text: PageSpeed Insights 모바일과 데스크톱 전 항목 100점을 확인했다
      checked: true
    - text: 네트워크 의존 관계 트리를 해석해 BaseLayout.css만이 유일한 주요 병목이라는 점을 정리했다
      checked: true
    - text: Search Console의 breadcrumb 오류를 수정하고 breadcrumb, canonical, trailing slash 정합을 맞췄다
      checked: true
    - text: tag, archive, author, pagination 페이지의 색인 방침을 noindex와 sitemap 제외로 정리했다
      checked: true
    - text: ProcessFigure와 StatBar의 동적 icon class를 공유 Icon 컴포넌트로 옮겼다
      checked: true
    - text: legacy check-circle 이름을 alias로 호환 처리했다
      checked: true
    - text: 추가 CSS 분할과 third-party 추가 축소안은 복잡성에 비해 이득이 적어 보류하기로 판단했다
      checked: true
linkCards:
  - href: /blog/website-improvement-batches/
    title: '이전 글: 품질 개선 전체 개요'
    description: 먼저 이전 허브 글을 보면 150개가 넘는 개선의 전체 흐름을 빠르게 파악할 수 있습니다.
    icon: i-lucide-book-open
  - href: /blog/astro-performance-tuning/
    title: 성능 최적화 편
    description: CSS 전달 전략, 폰트, 이미지, 외부 스크립트 최적화를 자세히 설명합니다.
    icon: i-lucide-gauge
  - href: /blog/astro-accessibility-guide/
    title: 접근성 편
    description: WCAG AA 준수와 Accessibility 100을 위한 구체적인 방법을 정리한 글입니다.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX 및 코드 품질 편
    description: View Transitions, 검색, 타입 안정성 등 품질 개선을 정리한 글입니다.
    icon: i-lucide-sparkles
faq:
  title: 자주 묻는 질문
  items:
    - question: PageSpeed Insights에서 100점을 받았다면 가장 빠른 사이트라고 말할 수 있나요?
      answer: '절대적인 의미에서는 그렇지 않습니다. PageSpeed Insights는 Lighthouse 기반의 실험실 측정이므로 실제 사용자의 네트워크, 기기, 서버 혼잡을 완전히 반영하지는 않습니다. 그래도 100점은 Lighthouse의 핵심 감사 항목에서 큰 누락이 거의 없는 매우 높은 상태를 뜻합니다.'
    - question: 100점인데도 네트워크 의존 관계 트리나 render-blocking CSS가 보이는 이유는 무엇인가요?
      answer: '그 항목들은 항상 실패 감사는 아닙니다. 진단 정보로 표시될 수도 있습니다. 이번 경우에는 BaseLayout.css만이 크리티컬 패스에 남아 있지만 모바일 100점이 유지되고 있으므로 현재 비용 대비 효과 관점에서는 수용 가능합니다.'
    - question: 왜 Cloudflare Web Analytics를 껐나요?
      answer: 'GA4에서 CTA, 검색, 문의 같은 이벤트 측정이 이미 충분히 구현되어 있었고, Cloudflare 쪽 역할은 성능 관찰에 가깝게 축소되어 있었습니다. 이번에는 beacon이 PageSpeed에 주는 영향도 고려해 GA4 중심으로 정리했습니다.'
    - question: Search Console 쪽에서는 정확히 무엇을 고쳤나요?
      answer: '목록 페이지에서 BreadcrumbList가 유효한 item URL을 가진 명시적 breadcrumb를 내보내도록 수정했습니다. 동시에 trailing slash, canonical, noindex, sitemap도 함께 정리해서 태그, 아카이브, 작성자, 페이지네이션 페이지의 색인 역할을 더 명확하게 만들었습니다.'
    - question: 시도했지만 채택하지 않은 최적화도 있었나요?
      answer: '있었습니다. BaseLayout.css를 더 잘게 나누는 안, network dependency tree 표시 자체를 없애는 안, GA4까지 줄여 third-party를 더 최소화하는 안 등을 비교했습니다. 하지만 모바일 100점이 이미 안정적으로 유지되는 상황에서 복잡성이나 측정 손실이 더 커져 채택하지 않았습니다.'
---

## 소개

이전 [Astro 사이트 품질 개선 가이드](/blog/website-improvement-batches/)에서는 리뉴얼된 Acecore 사이트에 적용한 대규모 개선을 정리했습니다. 이번 글은 그 후속편입니다.

이번 글에서는 이전 글 공개 후에도 남아 있던 세부 과제를 순서대로 정리했고, 최종적으로 **PageSpeed Insights 모바일과 데스크톱 모두 4개 항목이 전부 100점**인 상태까지 끌어올렸습니다. 단순히 점수만 조정한 것이 아니라, GA4와 검색을 초기 로드에서 빼고, Search Console의 breadcrumb와 색인 방침을 정리하고, 아이콘 렌더링을 안정화하고, 어디서 멈추는 것이 맞는지에 대한 판단 기준까지 함께 마무리했습니다.

## PageSpeed Insights 전 항목 100점 결과

2026년 3월 29일 시점에서 Acecore 메인 페이지는 아래 결과를 확인할 수 있었습니다.

| 측정 대상 | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| 모바일 | **100** | **100** | **100** | **100** |
| 데스크톱 | **100** | **100** | **100** | **100** |

아래에는 실제 PageSpeed Insights 스크린샷과 리포트 URL을 함께 두었습니다. 이전에는 “모바일 99 / 나머지 100”이 현실적인 상한이라고 봤지만, 이번에는 불필요한 서드파티 beacon을 정리하고 남은 진단의 의미를 정밀하게 읽어 낸 덕분에 100점에 도달했습니다.

### 측정 리포트 URL

스크린샷만이 아니라 나중에 같은 결과 페이지를 직접 다시 확인할 수 있도록, 이번 측정에 사용한 리포트 URL도 함께 남겨 둡니다.

- [모바일 리포트](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile)
- [데스크톱 리포트](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop)

<figure class="not-prose my-8">
  <figcaption class="text-base font-700 text-slate-800 mb-3">실제 측정 스크린샷</figcaption>
  <p class="text-sm text-slate-500 mb-4">각 이미지를 클릭하면 해당 PageSpeed Insights 리포트를 바로 열 수 있습니다.</p>
  <div class="grid gap-4 md:grid-cols-2">
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-mobile-summary-20260329.webp" alt="2026년 3월 29일 시점 Acecore 메인 페이지의 PageSpeed Insights 모바일 결과. Performance, Accessibility, Best Practices, SEO가 모두 100점이다." class="w-full rounded-lg border border-slate-200" width="1160" height="340" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">모바일</span>
    </a>
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-desktop-summary-20260329.webp" alt="2026년 3월 29일 시점 Acecore 메인 페이지의 PageSpeed Insights 데스크톱 결과. Performance, Accessibility, Best Practices, SEO가 모두 100점이다." class="w-full rounded-lg border border-slate-200" width="1190" height="270" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">데스크톱</span>
    </a>
  </div>
</figure>

## 100점은 얼마나 대단한가

100점이라고 하면 기능을 더 줄이고, 화면을 더 단순하게 만들고, 외부 요소를 더 덜어내기만 하면 Performance는 계속 올라갈 것 같다고 생각할 수 있습니다. 실제로 정적 사이트는 덜어낼수록 빨라지기 쉬운 면이 있습니다.

하지만 이번 경우는 빈 데모 페이지를 만드는 작업이 아니었습니다. GA4, 광고, 검색, ClientRouter, 공통 CSS 같은 실제 운영 요소를 남긴 채로 모바일과 데스크톱 4개 지표를 모두 100에 맞춰야 했습니다. 단순히 가볍게 만드는 것이 아니라, 무엇을 남기고 무엇을 제거하며 무엇은 더 건드리지 않을지를 함께 판단해야 했습니다.

물론 100점이 현실 세계에서 절대적으로 가장 빠르다는 뜻은 아닙니다. 실제 사용자 경험은 네트워크, 기기, 지역, 캐시 상태에 좌우됩니다. 그래도 **필요한 운영 요소를 남긴 채 Lighthouse가 보는 핵심 감사 항목에서 큰 누락이 없다**는 의미에서는 상당히 높은 완성도에 도달했다고 말할 수 있습니다.

## 100점에 도달하기까지의 최종 조정

### 1. Cloudflare Web Analytics를 중지하고 측정 역할을 다시 정리

Cloudflare Web Analytics는 privacy-first 성격의 가벼운 RUM 도구로는 유용하지만, Acecore에서는 이미 GA4 쪽에서 CTA, 검색, 문의, 리드 생성 등 이벤트 측정이 넓게 구현되어 있었습니다.

그래서 이번에 역할을 다시 검토한 결과, Cloudflare 쪽에서 계속 beacon을 주입하는 비용이 이제는 그 가치보다 더 크다고 판단했습니다. 대시보드에서 RUM을 비활성화했고, 실제 운영 HTML에서 `static.cloudflareinsights.com/beacon.min.js`가 사라진 것을 확인했습니다.

그렇다고 측정을 버린 것은 아닙니다. CTA, 외부 링크, 검색, 문의 전환은 여전히 측정해야 했기 때문에, 다음 단계는 GA4를 남기되 읽는 시점을 뒤로 미루는 것이었습니다.

### 2. GA4는 남기되 초기 로드에서는 제외

여기서 중요한 것은 단순히 “GA4를 남길지 없앨지”가 아니라, “남겨 두더라도 처음부터 읽어야 하는가”였습니다.

실제로는 `gtag` 진입점은 처음부터 남겨 이벤트를 받을 수 있게 두고, 실제 `gtag/js` 스크립트는 `requestIdleCallback`과 사용자 상호작용 이후로 미뤘습니다. 또 페이지 종류에 따라 fallback 시간도 다르게 둬서 상호작용이 없더라도 결국 analytics가 로드되도록 했습니다.

이렇게 해서 CTA, 외부 링크, 검색, 문의 측정은 유지하면서도, 가장 이른 렌더링 단계에 third-party 스크립트 실행을 밀어 넣지 않을 수 있었습니다. 즉 이번 100점은 Cloudflare beacon을 지운 결과이기도 하지만, GA4를 더 똑똑하게 읽도록 바꾼 결과이기도 합니다.

### 3. 검색 UI와 Pagefind를 온디맨드 로드로 전환

검색도 사용자가 즉시 열지 않더라도 초기 로드를 조용히 무겁게 만드는 기능 중 하나입니다. Acecore는 전문 검색에 Pagefind를 쓰고 있는데, 이번에는 여기에도 같은 원칙을 적용했습니다. 기능은 유지하되, 비용은 미리 내지 않는 것입니다.

이제 검색 모달은 실제로 열릴 때만 `pagefind-ui.js`와 CSS를 읽습니다. Promise를 캐시해 중복 로드를 막고, 단축키나 쿼리 파라미터로 여는 동작도 그대로 유지했습니다.

이 변화는 Lighthouse 점수만을 위한 것이 아닙니다. 일상적인 첫 렌더링 자체도 더 가벼워집니다. 검색은 남기되, 모든 페이지 뷰의 크리티컬 패스에는 올리지 않는 구조가 된 것입니다.

### 4. PageSpeed의 남은 진단을 해석함

점수가 100이 된 뒤에도 PageSpeed에는 `Network dependency tree`나 `render-blocking resources` 같은 진단이 남을 수 있습니다. 이를 모두 반드시 제거해야 하는 경고로 오해하면, 비용 대비 효과가 낮은 최적화로 빠지기 쉽습니다.

이번의 크리티컬 체인은 대략 아래와 같았습니다.

1. `/en/`
2. `ClientRouter.js`
3. `BaseLayout.css`
4. `BaseLayout.js`

이 중 실제로 render-blocking으로 남아 있던 것은 `BaseLayout.css` 하나뿐이었습니다. 다만 크기는 충분히 작고 모바일 100점도 유지되고 있기 때문에, 현시점에서는 “남아 있지만 수용 가능한 진단”으로 정리했습니다. 이 판단을 문장으로 명확히 남겼다는 사실 자체가 이후 최적화에서 멈출 기준을 제공한다는 점에서 큰 수확이었습니다.

### 5. Search Console의 breadcrumb와 색인 방침도 정리

PageSpeed가 100으로 안정된 뒤에는 검색 관점에서도 다시 확인했습니다. 바로 그 지점에서 Search Console에는 여전히 실제 불일치가 남아 있었습니다. FAQ는 이미 정상이었지만, breadcrumb에는 invalid item이 남아 있었습니다.

이를 해결하기 위해 목록 페이지의 `BreadcrumbList` 출력은 URL을 느슨하게 추측하는 방식이 아니라, 명시적인 breadcrumb 항목을 넘길 수 있도록 바꿨습니다. 동시에 trailing slash 처리도 맞춰 canonical, hreflang, breadcrumb URL이 서로 어긋나지 않도록 정리했습니다.

또한 tag, archive, author, pagination 페이지의 색인 역할도 명확히 했습니다. 이런 페이지는 탐색용으로는 유용하지만, 검색 색인 대상으로는 얇거나 중복된 목록이 되기 쉽습니다. 그래서 `noindex, follow`와 sitemap 제외를 적용해 역할을 분명히 했습니다. 이것이 Search Console의 모든 “크롤링됨 - 현재 색인되지 않음”을 즉시 지우는 것은 아니지만, 적어도 원하는 색인 정책이 코드에 명확히 표현되도록 만들었습니다.

### 6. 아이콘 렌더링을 공유 SVG 컴포넌트로 통일

이번 개선 도중 프로젝트는 UnoCSS icon utility에서 공유 SVG 기반의 `Icon` 컴포넌트로 이동하고 있었습니다. 그 과정에서 `ProcessFigure`와 `StatBar`에 남아 있던 동적 icon class가 정리되지 않아, 글 일부에서 빈 원만 표시되는 문제가 발생했습니다.

컴포넌트 쪽 렌더링을 `Icon`으로 통일하고, legacy 이름 `check-circle`을 `circle-check`로 흡수하는 alias도 추가했습니다.

그 결과 다음 3가지 실무적 이점이 생겼습니다.

- 동적 class 누락 때문에 아이콘이 사라지는 문제를 막을 수 있다
- `aria-hidden` 같은 접근성 속성을 SVG 쪽에서 통일할 수 있다
- UnoCSS의 정적 분석에 의존하지 않아 운영이 더 안정적이다

이와 함께 블로그 날짜 파싱과 표시도 JST 기준으로 정규화했습니다. 이 부분은 이번 글의 주제는 아니지만, 같은 날 게시된 글의 정렬 안정성과 구조화 데이터의 시간 정확도에는 분명히 도움이 되는 보완입니다.

### 7. 시도했지만 채택하지 않은 것

100점이 나온 뒤에는 남아 있는 진단을 전부 없애고 싶어지기 쉽습니다. 이번에도 몇 가지 방향을 실제로 비교했지만, 아래 안들은 채택하지 않았습니다.

- `BaseLayout.css`를 더 잘게 나누는 안: 진단 화면은 조금 더 깔끔해질 수 있지만, 이미 모바일 100점이 유지되고 있어 추가 복잡성을 감수할 만큼 실익이 크지 않았습니다.
- `network dependency tree` 표시 자체를 없애는 것을 목표로 하는 안: 진단이 보인다는 사실과 실제 사용자 문제가 있다는 사실은 다르다고 판단했습니다.
- GA4까지 줄여 third-party를 더 최소화하는 안: PageSpeed만 보면 조금 더 가벼워질 수 있지만, 비즈니스 이벤트 측정을 잃는 대가가 더 컸습니다.

이 비교가 중요했습니다. 이번 최종 조정은 무엇이든 다 제거했기 때문에 끝난 것이 아니라, 남겨 둔 트레이드오프를 설명할 수 있게 되었기 때문에 마무리되었다고 볼 수 있습니다.

## 이번 개선에서 얻은 실무적 배움

이번에 가장 컸던 수확은 단순히 100점을 받은 것 자체가 아니라, **무엇을 없애야 하고 무엇은 남겨도 되는지 설명할 수 있는 상태가 되었다**는 점입니다.

예를 들어 Cloudflare Web Analytics는 관성적으로만 들어가 있다면 제거할 가치가 있지만, GA4는 비즈니스 이벤트 측정의 중심이므로 남겨야 합니다. 하지만 GA4를 남긴다고 해서 반드시 초기 로드에 태워야 하는 것은 아닙니다. 측정은 유지하되 로드 시점을 바꾸는 편이 더 낫습니다.

같은 논리는 검색과 SEO에도 적용됩니다. 검색은 남겨 두되 초기 payload에 실을 필요는 없고, 목록 페이지는 탐색용으로는 유용하지만 주된 색인 대상으로 만들 필요는 없습니다. 또 `network dependency tree`는 그 자체로 실패가 아니라, 내부를 보고 지금 남아 있는 형태가 타당한지 판단해야 합니다.

이번에는 AI를 활용해 후보 변경안을 넓게 펼쳐 보기도 했지만, 최종 기준은 세 가지였습니다. 실측 수치가 실제로 좋아지는가, 운영 비용이 과도하게 늘지 않는가, 필요한 측정 기능이 유지되는가입니다. AI는 선택지의 폭을 넓혀 주었고, 최종 결정은 결국 실측과 판단 기준이 맡았습니다.

점수만 쫓으면 최적화는 금방 과해집니다. 이번에는 수정 내용뿐 아니라 어디서 멈출지를 포함한 기준도 정리할 수 있었기 때문에, Acecore 사이트의 개선은 일단 “완료”라고 불러도 될 단계에 도달했다고 볼 수 있습니다.

## 정리

이전 글의 후속편으로서 이번 최종 조정에서는 다음을 마무리했습니다.

- PageSpeed Insights 모바일과 데스크톱 전 항목 100점을 확인
- Cloudflare Web Analytics를 중지하고, GA4는 유지하되 지연 로드로 전환
- 검색 UI와 Pagefind를 온디맨드 로드로 바꿔 초기 로드 부담을 줄임
- 남은 네트워크 진단을 해석하고 어떤 잔여 이슈를 받아들일지 명확히 함
- Search Console의 breadcrumb 출력과 목록 페이지 색인 방침을 정리함
- 공유 SVG `Icon`으로 통일해 아이콘 누락 표시 문제를 해결
- 효과가 낮은 추가 최적화는 보류하고, 멈춰야 할 지점을 명확히 함

적어도 Lighthouse와 PageSpeed Insights 관점에서는 Acecore 사이트를 최상위권 속도를 노릴 수 있을 정도까지 다듬었다고 말할 수 있습니다. 동시에 점수는 목적이 아니라 결과일 뿐입니다. 앞으로도 이 상태가 무너지지 않도록 운영과 개선을 함께 이어갈 생각입니다.
