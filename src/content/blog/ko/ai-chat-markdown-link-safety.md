---
title: 'AI 채팅 답변의 Markdown 링크를 안전하게 렌더링하는 구현 설계'
description: 'AI 채팅 답변에 포함된 Markdown 링크를 안전한 HTML로 바꾸는 구현 메모입니다. 공백을 허용하는 파싱, href trim, 허용 목록 검증, DOM 렌더링, fallback, 테스트 케이스를 나누면 다른 사이트에도 재사용하기 쉽습니다.'
date: 2026-06-07T14:30
author: gui
tags: ['技術', 'Webサイト', 'AI', 'セキュリティ', 'Astro']
image: https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: 핵심
  text: AI 답변은 신뢰된 HTML이 아닙니다. Markdown 링크를 쓰더라도 URL을 먼저 trim하고, 허용 목록으로 검증한 뒤, 허용되지 않는 링크는 a 태그로 만들지 않고 텍스트로 남겨야 합니다.
processFigure:
  title: AI 답변 링크 렌더링 흐름
  steps:
    - title: Text
      description: 모델 답변을 먼저 일반 텍스트로 취급한다.
      icon: i-lucide-message-square-text
      accent: brand
    - title: Parse
      description: 채팅에서 실제로 지원할 Markdown 표현만 감지한다.
      icon: i-lucide-brackets
      accent: amber
    - title: Validate
      description: href를 trim하고 내부 URL 또는 승인된 도메인만 허용한다.
      icon: i-lucide-shield-check
      accent: emerald
    - title: Render
      description: innerHTML이 아니라 DOM API로 안전한 요소만 만든다.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Markdown 링크 렌더링에서 분리할 판단
  before:
    label: 느슨한 렌더링
    items:
      - AI 답변을 innerHTML에 직접 넣는다
      - Markdown 전체 사양을 한 번에 구현하려 한다
      - URL 앞뒤 공백 때문에 링크화에 실패한다
      - '외부 URL과 javascript: URL을 같은 방식으로 다룬다'
  after:
    label: 작고 안전한 렌더링
    items:
      - 답변을 텍스트로 받고 필요한 표현만 DOM으로 바꾼다
      - 채팅에서 쓰는 Markdown 부분집합만 지원한다
      - URL은 trim 후 검증한다
      - 허용되지 않는 URL은 텍스트로 남긴다
checklist:
  title: 도입 체크리스트
  items:
    - text: AI 답변을 HTML로 신뢰하지 않는다
    - text: Markdown 링크 URL 앞뒤 공백을 허용한다
    - text: href는 반드시 trim 후 검증한다
    - text: 내부 경로, 현재 origin, 필요한 외부 도메인만 허용한다
    - text: 외부 링크에는 target과 rel을 명시한다
    - text: 허용되지 않는 링크는 텍스트로 보존한다
    - text: 정상 케이스뿐 아니라 위험한 URL과 깨진 Markdown도 테스트한다
linkCards:
  - href: /blog/astro-ai-contact-chat/
    title: 문의 AI 채팅 기술 설계
    description: AI 답변, API 경계, 프롬프트 제어를 다룬 기반 글입니다.
    icon: i-lucide-sparkles
  - href: /blog/cloudflare-pages-security/
    title: Cloudflare Pages 보안 설정
    description: CSP와 보안 헤더를 정리한 관련 글입니다.
    icon: i-lucide-shield
  - href: /contact/
    title: 문의
    description: AI 채팅과 폼이 실제로 배치된 페이지입니다.
    icon: i-lucide-message-square
faq:
  title: 자주 묻는 질문
  items:
    - question: markdown-it이나 marked를 쓰면 충분한가요?
      answer: 라이브러리를 써도 HTML 출력 처리, 허용할 링크 대상, target과 rel 부여, 위험한 URL 거부는 별도로 설계해야 합니다. 채팅 용도라면 작은 전용 렌더러로 충분할 수 있습니다.
    - question: URL 앞뒤 공백을 허용하면 위험하지 않나요?
      answer: 위험은 공백 자체가 아니라 trim 후 무엇을 허용하느냐에 있습니다. trim한 href를 허용 목록으로 검증하면 모델의 표기 흔들림을 받아들이면서 안전성을 유지할 수 있습니다.
    - question: 허용되지 않는 URL은 삭제해야 하나요?
      answer: 보통은 텍스트로 남기는 편이 디버깅하기 쉽고 사용자에게도 문맥이 남습니다. 의심스러운 문자열을 숨겨야 하는 정책이라면 링크 전체를 제거할 수도 있습니다.
---

AI 채팅이 `자세한 내용은 [서비스 목록]( /services/ )을 확인하세요`라고 답하면, 링크가 렌더링되지 않고 원본 Markdown이 화면에 남을 수 있습니다.

Acecore의 문의 AI 채팅에서도 이 문제가 있었고, [Markdown 링크 렌더링을 수정한 PR](https://github.com/acecore-systems/acecore-net/pull/99) 에서 렌더러를 조정했습니다.

이 글은 그 작은 수정에서 출발해 AI 답변을 안전하게 DOM으로 바꾸는 방법을 정리합니다.

## AI 답변은 신뢰된 HTML이 아니다

모델 출력은 HTML이 아니라 텍스트로 다뤄야 합니다.

채팅 UI에서는 링크, 굵게, 목록이 유용합니다. 하지만 답변을 `innerHTML`에 넣으면 모델이 만든 문자열을 브라우저가 그대로 해석합니다.

필요한 것은 Markdown 전체 구현이 아닙니다. 채팅에서 지원할 표현만 감지하고 안전한 DOM 노드만 만드는 작은 렌더러입니다.

## 문제는 공백만이 아니다

직접적인 문제는 이런 링크였습니다.

```md
[서비스 목록](/services/)
```

엄격한 정규식은 보통 URL에 공백이 없다고 가정합니다.

```js
;/\[([^\]]+)\]\(([^)\s]+)\)/
```

`[^)\s]+` 는 공백을 거부하므로 `( /services/ )` 는 링크로 인식되지 않습니다. 괄호 안의 앞뒤 공백을 허용하고 나중에 정규화해야 합니다.

```js
;/\[([^\]]+)\]\(\s*([^)]+?)\s*\)/
```

다만 파서를 느슨하게 하는 것으로 끝내면 안 됩니다. 정규화된 값은 반드시 검증해야 합니다.

## href는 trim 후 검증한다

순서는 고정합니다.

1. Markdown에서 label과 raw href를 추출한다
2. raw href에 `trim()`을 적용한다
3. trim한 href를 허용 목록으로 검증한다
4. 허용될 때만 `<a>`를 만든다

```js
const href = String(rawHref || '').trim()

if (label && isSafeMarkdownHref(href)) {
  const link = document.createElement('a')
  link.href = href
  link.rel = 'noopener noreferrer'

  if (/^https?:\/\//i.test(href)) {
    link.target = '_blank'
  }

  link.textContent = label
  parent.appendChild(link)
}
```

검증한 값과 DOM에 넣는 값은 같아야 합니다. 둘이 다르면 안전 검사의 의미가 약해집니다.

## 허용 목록은 제품마다 달라야 한다

AI가 어떤 URL을 보여도 되는지는 사이트마다 다릅니다.

| 종류        | 예시                      | 판단                       |
| ----------- | ------------------------- | -------------------------- |
| 내부 경로   | `/services/`              | 허용                       |
| 같은 origin | `https://acecore.net/...` | 허용                       |
| 공식 LINE   | `https://lin.ee/...`      | 공식 채널이면 허용         |
| mailto      | `mailto:info@acecore.net` | 고정 주소만 허용           |
| tel         | `tel:05088902788`         | 고정 번호만 허용           |
| 기타 외부   | 임의 URL                  | 기본적으로 링크화하지 않음 |

```js
function isSafeMarkdownHref(href) {
  if (href.startsWith('/')) return true

  try {
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin) return true
    if (url.hostname === 'acecore.net') return true
    if (url.hostname === 'lin.ee') return true
  } catch {
    return false
  }

  return href === 'mailto:info@acecore.net' || href === 'tel:05088902788'
}
```

채용 사이트라면 채용 매체를, SaaS라면 문서와 상태 페이지를 허용할 수 있습니다. 함수는 제품의 정책을 반영해야 합니다.

## 허용되지 않는 링크는 텍스트로 되돌린다

링크가 검증을 통과하지 못했을 때 무조건 삭제하는 것이 항상 좋은 선택은 아닙니다.

문의 AI에서는 원본 Markdown을 텍스트로 남기는 편이 사용자 문맥을 유지하고, 개발자가 모델 출력을 확인하기 쉽습니다.

렌더러는 안전한 링크를 만들 뿐 아니라 안전하게 실패해야 합니다.

## 실패 케이스를 테스트한다

최소한 다음을 확인합니다.

| 입력                               | 기대 결과                                |
| ---------------------------------- | ---------------------------------------- |
| `[서비스](/services/)`             | 내부 링크                                |
| `[서비스]( /services/ )`           | trim 후 내부 링크                        |
| `[LINE]( https://lin.ee/example )` | 허용된 외부 링크                         |
| `[위험](javascript:alert(1))`      | 링크화하지 않음                          |
| `[외부](https://example.com/)`     | 도메인이 허용되지 않으면 링크화하지 않음 |
| `[깨짐](/services/`                | 텍스트로 표시                            |

PR #99에서는 공백이 있는 링크와 없는 링크가 같은 URL로 처리되는 것을 확인했습니다.

## 기본적으로 Markdown 전체를 구현하지 않는다

채팅에는 보통 다음 정도면 충분합니다.

- 문단
- 목록
- 굵게
- 인라인 코드
- 링크

표, 이미지, 원시 HTML, 각주까지 지원하면 렌더러의 책임이 빠르게 커집니다. 라이브러리를 쓰더라도 HTML과 URL 정책은 별도로 정해야 합니다.

## 정리

AI 채팅의 Markdown 링크 렌더링은 작은 UI 수정처럼 보이지만, 모델 출력을 어디까지 신뢰할지 정하는 경계입니다.

원칙은 단순합니다. 텍스트로 받고, 작은 부분집합만 DOM화하고, trim 후 검증하며, 엄격한 허용 목록과 안전한 fallback을 둡니다.
