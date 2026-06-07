---
title: 'Astro 사이트에 문의 AI 채팅을 넣기 위한 기술 설계'
description: 'Astro + Cloudflare Pages 정적 사이트에 OpenAI Responses API 기반 문의 AI 채팅을 넣는 기술 설계입니다. API 경계, 사이트 컨텍스트, 프롬프트 제어, locale별 URL, Origin 검사, rate limit, 안전한 Markdown 링크 렌더링을 정리합니다.'
date: 2026-06-07T12:00
author: gui
tags: ['技術', 'Cloudflare', 'Webサイト', 'AI', 'サービス']
image: https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: 핵심
  text: 문의 AI 채팅은 AI가 자유롭게 답하는 기능이 아니라, 공개된 사이트 정보를 이용해 방문자를 적절한 다음 행동으로 안내하는 작은 애플리케이션입니다. API key, 프롬프트, 연락처, Markdown 렌더링은 서버와 허용 목록으로 제어합니다.
processFigure:
  title: 문의 AI 채팅 참조 아키텍처
  steps:
    - title: Widget
      description: Astro 채팅 UI는 질문, 현재 locale, 필요한 최소 이력만 전송합니다.
      icon: i-lucide-message-circle
      accent: brand
    - title: Function
      description: Cloudflare Pages Function이 입력 검증, Origin 검사, rate limit, 프롬프트 생성을 담당합니다.
      icon: i-lucide-shield-check
      accent: amber
    - title: Model
      description: OpenAI Responses API가 공개 사이트 정보와 대화 상태를 받아 답변을 생성합니다.
      icon: i-lucide-sparkles
      accent: emerald
    - title: Renderer
      description: 클라이언트는 허용된 Markdown만 렌더링하고 내부 링크나 승인된 연락 경로로 안내합니다.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: 도입 시 분리해야 할 책임
  before:
    label: 모두 섞인 경우
    items:
      - 브라우저에서 AI API를 직접 호출함
      - 사이트 정보, API key, UI, 링크 렌더링이 섞임
      - AI가 가격, 계약, 납기를 단정하기 쉬움
      - Markdown과 URL이 그대로 HTML로 렌더링될 수 있음
  after:
    label: 책임을 분리한 경우
    items:
      - API key와 모델 호출은 서버에 둠
      - 공개 사이트 정보를 명시적인 컨텍스트로 관리함
      - 프롬프트로 답변 범위와 연락 경로를 제어함
      - Markdown과 URL은 허용 목록으로 렌더링함
checklist:
  title: 다른 사이트 도입 체크리스트
  items:
    - text: AI 채팅의 목적을 문의 완료가 아니라 안내 경로 정리로 정의하기
    - text: 서버 측 API 경계를 만들고 API key를 브라우저에 노출하지 않기
    - text: 답변을 공개 사이트 정보로 제한하기
    - text: 가격, 계약, 납기, 보증처럼 AI가 단정하지 않을 영역 정하기
    - text: form, LINE, email, phone의 역할 나누기
    - text: locale별 URL을 생성해 다국어 동선을 유지하기
    - text: Origin 검사, 입력 길이 제한, 이력 제한, rate limit 넣기
    - text: Markdown 링크 URL은 trim 후 허용 목록으로 검증하기
linkCards:
  - href: /contact/
    title: 문의
    description: AI 채팅, LINE, 폼, 직접 연락처의 입구를 정리한 페이지입니다.
    icon: i-lucide-message-square
  - href: /blog/cloudflare-pages-security/
    title: Cloudflare Pages 보안
    description: 정적 사이트 배포의 CSP와 보안 헤더를 다룬 관련 글입니다.
    icon: i-lucide-shield
  - href: /blog/cms-selection-and-turnstile/
    title: CMS 선택과 Turnstile
    description: 폼 운영과 봇 대응을 다룬 관련 글입니다.
    icon: i-lucide-badge-check
faq:
  title: 자주 묻는 질문
  items:
    - question: RAG나 벡터 DB가 없어도 문의 AI 채팅을 만들 수 있나요?
      answer: 소규모 기업 사이트라면 공개 페이지의 핵심 내용을 구조화해 프롬프트에 넣는 것만으로도 충분히 실용적입니다. 페이지 수와 갱신 빈도가 늘어난 뒤 검색 인덱스나 벡터 DB를 검토하면 됩니다.
    - question: OpenAI API key가 브라우저에 노출되나요?
      answer: 아니요. 브라우저는 /api/ai-contact에 질문만 보내고, OpenAI Responses API 호출과 API key 관리는 Cloudflare Pages Function에서 처리합니다.
    - question: AI 답변 안의 링크는 자유롭게 출력할 수 있나요?
      answer: 아니요. 내부 경로, 현재 origin, acecore.net, 공식 LINE, 필요한 mailto와 tel만 허용합니다. Markdown URL은 안전 검사 전에 trim합니다.
---

웹사이트에 AI 채팅을 올리는 것 자체는 쉽습니다. 실제 운영에서 중요한 것은 모델 성능만이 아니라, 어디까지 답하게 할지, 어떤 경로로 안내할지, 어떤 URL을 보여줄지, API 비용을 어떻게 제어할지입니다.

Acecore 사이트에는 Astro + Cloudflare Pages 정적 구성에 문의 AI 채팅을 추가했습니다. 핵심 구현은 [문의 AI와 CMS 한정 번역 흐름을 구현한 PR](https://github.com/acecore-systems/acecore-net/pull/98)입니다. 이후 [별도 PR](https://github.com/acecore-systems/acecore-net/pull/99)에서 AI 답변의 Markdown 링크 안전 렌더링을 조정했습니다.

이 글은 특정 작업 기록이 아니라 다른 정적 사이트에도 적용하기 쉬운 기술 설계로 정리합니다. Astro가 아니어도 클라이언트, API 경계, 프롬프트, 렌더러의 책임을 나누는 방식은 같습니다.

## 전체 구조

| 계층                 | 역할                                                           |
| -------------------- | -------------------------------------------------------------- |
| Chat widget          | UI, 입력, 현재 locale, 최소 이력, Markdown 렌더링              |
| `/api/ai-contact`    | 입력 검증, Origin 검사, rate limit, 프롬프트 생성, OpenAI 호출 |
| OpenAI Responses API | 공개 사이트 정보와 대화 상태를 바탕으로 답변 생성              |

브라우저에서 OpenAI API를 직접 호출하지 않습니다. 서버 측 엔드포인트 뒤에 두면 key 노출을 막고, 프롬프트와 사이트 컨텍스트를 서버에서 바꾸며, 입력 제한과 오류 처리를 한곳에 모을 수 있습니다.

Astro + Cloudflare Pages에서는 `/api/ai-contact` Pages Function으로 구현할 수 있습니다. Next.js라면 Route Handler, Hono나 Express라면 일반 API route로 바꾸면 됩니다.

## API 계약을 작게 유지하기

```ts
type ContactAiRequest = {
  message: string
  locale: 'ja' | 'en' | 'zh-cn' | 'es' | 'pt' | 'fr' | 'ko' | 'de' | 'ru'
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

type ContactAiResponse = {
  answer: string
}
```

이름, 이메일, 전화번호, 회사명 같은 폼 입력값은 AI 채팅에 보낼 필요가 없습니다. 문의 AI 채팅은 개인정보를 모으는 곳이 아니라, 사용자가 어떤 서비스를 보고 어떤 문의 경로를 선택할지 정리하는 입구입니다.

이력도 최근 몇 턴만 보내고, 메시지 길이도 제한합니다. 이렇게 해야 프롬프트와 비용을 제어할 수 있습니다.

## 서버에서 검증과 모델 호출 제어

```ts
export async function onRequestPost({ request, env }: PagesFunction<Env>) {
  assertSameOrigin(request)
  assertRateLimit(request)

  const body = await request.json()
  const message = validateMessage(body.message)
  const locale = validateLocale(body.locale)
  const history = trimHistory(body.history)

  const prompt = buildContactPrompt({
    locale,
    message,
    history,
    siteContext: buildPublicSiteContext(locale),
  })

  const answer = await callOpenAIResponsesApi({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    prompt,
  })

  return Response.json({ answer })
}
```

AI API를 호출하기 전에 입력을 작게 정리하고 검증하는 것이 핵심입니다. 긴 입력, 무제한 이력, 외부 사이트의 반복 호출을 그대로 통과시키면 운영이 먼저 흔들립니다.

`OPENAI_MODEL`은 환경 변수로 두고, `OPENAI_API_KEY`는 서버에만 둡니다. 배포와 CSP는 [Cloudflare Pages 보안 글](/blog/cloudflare-pages-security/)도 참고할 수 있습니다.

## 사이트 정보를 명시적 컨텍스트로 만들기

이 규모의 사이트라면 처음부터 벡터 DB가 필요하지 않습니다. 공개 사이트 정보의 요점을 구조화해 프롬프트에 넣는 방식이 더 단순합니다.

회사와 서비스 개요, 서비스별 대상과 URL, FAQ, 폼/LINE/email/phone 사용 규칙, 가격과 계약처럼 AI가 단정하지 않을 영역, locale별 내부 URL을 포함합니다.

```ts
function buildPublicSiteContext(locale: Locale) {
  return {
    services: [
      {
        name: 'Web production',
        summary: 'Corporate sites, recruiting sites, and landing pages',
        url: localizePath('/services/web-production/', locale),
      },
      {
        name: 'Business systems',
        summary: 'Reservation, inventory, and customer management systems',
        url: localizePath('/services/business-system/', locale),
      },
    ],
    contact: {
      form: localizePath('/contact/', locale),
      line: 'https://lin.ee/...',
      emailPolicy:
        'Show email only when the form cannot be used or follow-up is needed',
      phonePolicy: 'Show phone only for urgent confirmation',
    },
  }
}
```

목표는 모델이 일반 지식으로 답하게 하는 것이 아니라, 이 사이트가 말해도 되는 정보를 알려주는 것입니다. 사이트가 커지면 Pagefind, CMS JSON, D1, Vectorize 같은 검색 계층을 추가할 수 있습니다.

## 프롬프트에는 규칙을 쓴다

```txt
You are the contact guidance AI for this website.
Answer only from public site information.

Rules:
- Do not make firm statements about pricing, contracts, schedules, or guarantees
- Send formal consultations and estimates to the contact form
- Also suggest LINE for short questions and school-related inquiries
- Show email and phone only when the user asks for direct contact
- Use URLs that match the current locale
- If unsure, do not guess; guide the user to the form
```

AI가 지나치게 도와주려다 비용, 납기, 보증을 단정하는 것이 흔한 실패입니다. 이런 질문은 일반 안내에 머무르고 공식 답변은 폼으로 보내야 합니다.

## 문의 경로의 역할 나누기

| 경로      | 역할                                               |
| --------- | -------------------------------------------------- |
| FAQ       | 페이지 안에서 자주 묻는 질문 해결                  |
| AI 채팅   | 서비스 선택, 문의 경로, 관련 페이지를 정리         |
| LINE      | 짧은 질문, 학교 관련 내용, 가벼운 확인             |
| 폼        | 견적, 제작 상담, 제휴, 채용처럼 기록이 필요한 문의 |
| 직접 연락 | 폼 이후 보충이나 긴급 확인에만 사용                |

AI는 [서비스 소개 글](/blog/service-introduction/) 같은 개요 콘텐츠와 [문의 페이지](/contact/)의 실제 접점을 연결합니다. BtoB, 제작사, 학교, SaaS 지원에도 적용하기 쉽습니다.

## locale URL 유지하기

다국어 사이트에서는 답변 언어뿐 아니라 링크 URL도 locale에 맞아야 합니다.

```ts
function localizePath(path: string, locale: Locale) {
  if (locale === 'ja') return path
  return `/${locale}${path}`
}
```

이 처리는 프롬프트에 맡기기보다 서버에서 URL을 생성하는 것이 안정적입니다. 번역 운영은 [Copilot 번역 파이프라인 글](/blog/copilot-translation-pipeline/)에 정리되어 있습니다.

## Origin 검사와 rate limit

```ts
function assertSameOrigin(request: Request) {
  const origin = request.headers.get('Origin')
  if (!origin) return

  const requestUrl = new URL(request.url)
  const originUrl = new URL(origin)

  if (originUrl.host !== requestUrl.host) {
    throw new Response('Forbidden', { status: 403 })
  }
}
```

IP 기반 rate limit은 첫 번째 제동 장치입니다. Cloudflare에서는 `CF-Connecting-IP`, `X-Forwarded-For`, `CF-Ray` 등을 사용할 수 있습니다. 트래픽이 늘면 Cloudflare WAF, Turnstile, KV, D1, Durable Objects를 검토합니다. 폼 측 봇 대응은 [CMS와 Turnstile 글](/blog/cms-selection-and-turnstile/)을 참고할 수 있습니다.

## Markdown 링크는 허용 목록으로 렌더링

지원할 표현은 단락, 목록, 굵게, 인라인 코드, Markdown 링크 정도로 제한합니다. 링크 대상은 내부 경로, 현재 origin, `https://acecore.net`, 공식 LINE, 필요한 `mailto:`와 `tel:`로 제한합니다.

```ts
function sanitizeHref(rawHref: string, currentOrigin: string) {
  const href = rawHref.trim()

  if (href.startsWith('/')) return href
  if (href.startsWith(`${currentOrigin}/`)) return href
  if (href.startsWith('https://acecore.net/')) return href
  if (href.startsWith('https://lin.ee/')) return href
  if (href === 'mailto:info@acecore.net') return href
  if (href === 'tel:05088902788') return href

  return null
}
```

AI는 `[Services]( /services/ )`처럼 공백이 들어간 URL을 만들 수 있으므로 `trim()` 후 검사해야 합니다. 작고 엄격한 렌더러가 전체 Markdown 구현보다 관리하기 쉽습니다.

## local, preview, production 확인

Astro dev나 preview는 Cloudflare Pages Functions 환경과 완전히 같지 않습니다. `OPENAI_API_KEY`가 없을 때는 UI fallback과 오류 표시를 확인합니다.

Pages preview 또는 production에서는 `/api/ai-contact` POST, `OPENAI_API_KEY`와 `OPENAI_MODEL`, 다른 Origin 거부, 입력 제한, locale에 맞는 답변, locale URL, 견적과 계약을 단정하지 않는지, email과 phone을 기본 노출하지 않는지, 허용된 Markdown 링크만 변환되는지 확인합니다.

긴 입력, 예상 밖 질문, 영어 페이지, 직접 연락 요청, 가격 질문도 따로 테스트합니다.

## 운영 지표

릴리스 후에는 API 오류율, rate limit 횟수, 문의당 평균 메시지 수, 폼과 LINE 이동, AI가 답하지 못해 폼으로 안내한 횟수, locale별 사용량을 봅니다.

대화 본문을 저장한다면 개인정보 처리 기준을 먼저 정해야 합니다. 처음에는 본문 없이 이벤트와 오류만 보는 방식이 안전합니다.

## 이번에 분리한 범위

이 글은 문의 AI 채팅의 기술 설계만 다룹니다. 서비스 페이지에서 폼으로 상담 대상을 이어받는 동선도 구현하였으며, 이는 [서비스 CTA에서 문의 폼으로 맥락을 이어받는 기술 설계](/blog/service-cta-contact-prefill/)에 정리했습니다.

- AI 채팅: 대화로 고민을 정리하고 안전하게 안내
- 서비스 CTA: 사용자가 읽던 서비스 문맥을 폼으로 전달

분리하면 읽기 쉽고 나중에 내부 링크로 연결하기도 쉽습니다.

## 정리

정적 사이트에 문의 AI 채팅을 넣을 때는 UI보다 API 경계와 답변 제어를 먼저 설계해야 합니다.

핵심은 브라우저가 아니라 Cloudflare Pages Function에서 OpenAI를 호출하고, 입력과 이력을 제한하며, 서버에서 사이트 컨텍스트와 locale URL을 만들고, 프롬프트에 단정 금지 범위를 쓰고, 폼/LINE/직접 연락의 역할을 분리하며, Origin 검사와 rate limit을 넣고, Markdown 링크는 `trim()` 후 허용 목록으로 렌더링하는 것입니다.

정적 사이트에서도 유용한 문의 AI 채팅은 충분히 만들 수 있습니다. 목표는 AI를 돋보이게 하는 것이 아니라, 방문자가 안전하게 다음 행동을 고르게 하는 것입니다.
