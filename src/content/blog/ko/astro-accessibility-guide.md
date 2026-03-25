---
title: 'Astro 사이트를 WCAG AA 준수로 만드는 실전 가이드'
description: 'Astro + UnoCSS 사이트에서 구현한 접근성 개선에 대한 종합 가이드. aria 속성, 명도 대비, 포커스 관리, 폼 유효성 검사, 스크린 리더 지원 등 WCAG AA 준수에 필요한 모든 것을 다룹니다.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'アクセシビリティ']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: 접근성은 모든 사용자를 위한 UX 개선입니다
  text: '접근성은 장애인만을 위한 것이 아닙니다. 키보드 내비게이션, 명도 대비, 포커스 인디케이터는 모든 사용자의 사용성을 직접적으로 개선합니다. 접근성에 투자할수록 전체 사이트 품질이 향상됩니다.'
processFigure:
  title: 접근성 개선 워크플로우
  steps:
    - title: 자동 테스트
      description: axe DevTools와 Lighthouse를 사용하여 기계적으로 탐지 가능한 문제를 식별합니다.
      icon: i-lucide-scan
    - title: 수동 테스트
      description: 키보드와 스크린 리더로 직접 내비게이션을 시도합니다.
      icon: i-lucide-hand
    - title: 수정
      description: aria 속성을 추가하고, 명도 대비를 수정하고, 포커스 스타일을 추가합니다.
      icon: i-lucide-wrench
    - title: 재테스트
      description: PageSpeed 접근성에서 100점을 확인합니다.
      icon: i-lucide-check-circle
checklist:
  title: WCAG AA 준수 체크리스트
  items:
    - text: 텍스트 명도 대비가 4.5:1 이상인지 (큰 텍스트는 3:1)
      checked: true
    - text: 모든 인터랙티브 요소에 focus-visible 스타일이 있는지
      checked: true
    - text: 장식용 아이콘에 aria-hidden="true"가 있는지
      checked: true
    - text: 외부 링크에 스크린 리더 알림이 있는지
      checked: true
    - text: 폼에 aria-invalid 연동 인라인 유효성 검사가 있는지
      checked: true
    - text: 이미지에 width/height 속성이 있는지 (CLS 방지)
      checked: true
    - text: 리스트 요소에 role="list"가 있는지 (list-style:none 우회)
      checked: true
faq:
  title: 자주 묻는 질문
  items:
    - question: axe DevTools와 Lighthouse의 차이점은 무엇인가요?
      answer: 'Lighthouse는 성능과 SEO도 포함하는 종합 감사 도구로, 접근성 항목은 일부만 확인합니다. axe DevTools는 접근성에 특화되어 더 큰 규칙 세트로 더 상세한 검사를 수행합니다. 두 가지를 함께 사용하는 것이 권장됩니다.'
    - question: 모든 요소에 aria 속성을 추가해야 하나요?
      answer: '아닙니다. HTML 시맨틱이 올바르면 aria는 필요 없습니다. aria 속성은 "HTML만으로는 전달할 수 없는 정보"를 보충하기 위한 것입니다. 과도하게 사용하면 스크린 리더 출력이 지나치게 장황해질 수 있습니다.'
    - question: PageSpeed 접근성 점수 100이면 WCAG 준수인가요?
      answer: '100점이라도 완전한 WCAG 준수를 보장하지는 않습니다. Lighthouse의 체크 항목은 제한적이며, 일부 기준은 수동으로만 확인할 수 있습니다 (논리적 읽기 순서, 적절한 alt 텍스트 등). 자동 테스트와 수동 테스트가 모두 필요합니다.'
---

## 서론

"접근성"은 뒤로 미루기 쉬운 주제처럼 보일 수 있습니다. 하지만 실제로 작업해 보면, 명도 대비, 키보드 내비게이션, 포커스 인디케이터를 개선하는 것이 모든 사용자의 사용성을 직접적으로 향상시킨다는 것을 알게 됩니다.

이 글에서는 Astro + UnoCSS 사이트에서 PageSpeed 접근성 점수 100을 달성하기 위해 구현한 개선 사항을 카테고리별로 소개합니다.

---

## 장식용 아이콘의 aria-hidden

UnoCSS Iconify 아이콘(`i-lucide-*`)은 시각적 장식으로 자주 사용되지만, 스크린 리더가 이를 읽으면 "이미지" 또는 "알 수 없는 이미지"라고 읽어 혼란을 줍니다.

### 해결 방법

장식용 아이콘에 `aria-hidden="true"`를 추가합니다.

```html
<span class="i-lucide-mail" aria-hidden="true"></span>
문의하기
```

이 작업은 사이트 전체의 30개 이상의 아이콘에 적용되었습니다. StatBar, Callout, ServiceCard, ProcessFigure 같은 컴포넌트 내부의 아이콘도 빠뜨리지 않도록 주의하세요.

---

## 외부 링크의 스크린 리더 알림

`target="_blank"`로 열리는 외부 링크는 시각적으로 새 탭에서 열린다는 것을 알리지만, 스크린 리더 사용자에게는 이 정보가 전달되지 않습니다.

### 해결 방법

외부 링크에 시각적으로 숨겨진 보충 텍스트를 추가합니다.

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Example
  <span class="sr-only">(새 탭에서 열림)</span>
</a>
```

`rehype-external-links` 플러그인을 사용하면 Markdown의 외부 링크에 `target="_blank"`와 `rel`을 자동으로 추가할 수 있습니다. 스크린 리더 알림 텍스트는 템플릿 측에서 추가합니다.

---

## 명도 대비 확보

명도 대비 부족은 PageSpeed Insights에서 가장 자주 지적되는 문제입니다.

### 흔한 문제

UnoCSS 컬러 팔레트에서 `text-slate-400`을 사용하면 흰색 배경에 대한 명도 대비가 약 3:1로, WCAG AA 요구 사항인 4.5:1에 미달합니다.

### 해결 방법

`text-slate-400` → `text-slate-500` (명도 대비 4.6:1)으로 변경하면 요구 사항을 충족합니다. 이는 날짜나 캡션 같은 보조 텍스트에 흔히 사용되므로 사이트 전체를 확인하세요.

---

## focus-visible 스타일

키보드로 사이트를 내비게이션하는 사용자에게 포커스 인디케이터는 "지금 어디에 있는지"를 알 수 있는 유일한 방법입니다. WCAG 2.4.7은 포커스 가시성을 요구합니다.

### UnoCSS로 구현

버튼과 링크에 대한 공통 포커스 스타일을 설정합니다. UnoCSS의 shortcut 기능을 사용하면 한 곳에서 정의하고 모든 곳에 적용할 수 있습니다.

```typescript
shortcuts: {
  'ac-btn': '... focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
}
```

`focus-visible`은 마우스 클릭이 아닌 키보드 내비게이션 시에만 링을 표시하는 의사 클래스입니다. `focus`보다 더 나은 UX를 제공하므로 이것을 사용하세요.

### 빠뜨리기 쉬운 요소

- 복사 버튼
- 맨 위로 스크롤 버튼
- 앵커 광고 닫기 버튼
- 모달 닫기 버튼

---

## 인라인 링크의 밑줄

PageSpeed에서 "링크가 색상으로만 구별 가능합니다"라고 지적할 수 있습니다. 이는 색각 이상이 있는 사용자가 링크를 구별할 수 없는 문제입니다.

### 해결 방법

호버 시에만 표시하는 대신 밑줄을 항상 보이게 합니다. 일관성을 위해 UnoCSS shortcut을 사용하는 것이 권장됩니다.

```typescript
shortcuts: {
  'ac-link': 'underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors',
}
```

---

## 폼 접근성

문의 폼 같이 사용자가 입력하는 곳에서 접근성은 특히 중요합니다.

### 인라인 유효성 검사

`blur`/`input` 이벤트에서 즉시 오류 메시지를 표시하며, 다음 aria 속성과 연동합니다:

- `aria-invalid="true"` — 입력이 유효하지 않음을 알림
- `aria-describedby` — 오류 메시지의 ID를 참조

```html
<input
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" role="alert">올바른 이메일 주소를 입력해 주세요</p>
```

### 필수 입력 항목 표시

시각적인 `*` 표시만으로는 불충분합니다. 스크린 리더를 위한 보충 텍스트를 추가합니다.

```html
<span aria-hidden="true">*</span>
<span class="sr-only">(필수)</span>
```

---

## figure 요소의 role 속성

`<figure>` 요소에 `role="img"`를 설정하면 자식 요소가 스크린 리더에서 숨겨집니다. 아이콘과 설명 텍스트를 포함하는 컴포넌트(InsightGrid, ProcessFigure, Timeline)의 경우, `role="group"`으로 변경하여 내부 콘텐츠를 접근 가능하게 유지합니다.

---

## 리스트 요소의 role 속성

CSS `list-style: none`이 적용되면 Safari의 스크린 리더(VoiceOver)가 해당 요소를 리스트로 인식하지 못하는 알려진 버그가 있습니다.

브레드크럼, 사이드바, 푸터의 `<ol>` / `<ul>` 요소에 `role="list"`를 추가합니다. 외형이 커스터마이징된 모든 리스트를 확인하세요.

---

## 기타 개선 사항

### 이미지의 width/height 속성

명시적인 `width`와 `height`가 없는 이미지는 로딩 완료 시 레이아웃 시프트(CLS — Cumulative Layout Shift)를 발생시킵니다. 아바타(32×32, 48×48, 64×64px)와 YouTube 썸네일(480×360px)을 포함한 모든 이미지에 크기를 지정합니다.

### 히어로 슬라이더의 aria-live

자동 회전 슬라이더는 스크린 리더 사용자에게 변경 사항을 전달하지 않습니다. `aria-live="polite"` 영역을 준비하고 "슬라이드 1 / 4: [제목]"과 같은 텍스트로 알립니다.

### dialog의 aria-labelledby

`<dialog>` 요소에 `aria-labelledby`로 제목 요소의 ID를 참조하여 스크린 리더가 모달의 목적을 알릴 수 있도록 합니다.

### 페이지네이션의 aria-current

현재 페이지 번호에 `aria-current="page"`를 설정하여 스크린 리더에 "현재 페이지"임을 알립니다.

### 복사 버튼 aria-label 업데이트

클립보드 복사가 성공하면 `aria-label`을 "복사됨"으로 동적으로 업데이트하여 상태 변경을 스크린 리더에 알립니다.

---

## 정리

접근성 개선은 개별적으로는 작은 변경이지만, 모두 합치면 전체 사이트 품질을 크게 향상시킵니다. 가장 효과가 컸던 세 가지 변경은:

1. **focus-visible 전체 적용**: 키보드 내비게이션이 극적으로 개선됨
2. **명도 대비 수정**: `text-slate-400` → `text-slate-500`으로 변경만으로 WCAG AA 통과
3. **외부 링크의 스크린 리더 알림**: `rehype-external-links`와 결합하여 모든 링크를 자동으로 커버

먼저 axe DevTools로 사이트를 스캔하고 자동으로 탐지 가능한 문제부터 해결하세요.

---

## 시리즈 소개

이 글은 "[Astro 사이트 품질 개선 가이드](/blog/website-improvement-batches/)" 시리즈의 일부입니다. 성능, SEO, UX 개선에 대해서는 별도 글에서 다루고 있습니다.
