---
title: '헤드리스 CMS 선정기 — Pages CMS를 선택한 이유와 Turnstile로 봇 차단'
description: 'Keystatic, Sveltia CMS, Pages CMS를 비교 검토하여 최종적으로 Pages CMS를 채택하고, 문의 폼에 Cloudflare Turnstile로 스팸 방지를 구현한 기록.'
date: 2026-03-15
author: gui
tags: ['技術', 'CMS', 'セキュリティ']
image: https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=400&fit=crop&q=80
compareTable:
  title: CMS 비교
  before:
    label: Keystatic / Sveltia CMS
    items:
      - Keystatic은 서버 사이드 런타임이 필요
      - Sveltia CMS는 기능이 풍부하지만 학습 곡선이 높음
      - 두 가지 모두 Astro + Pages 구성에는 과도한 사양
      - 설정에 상당한 시간 소요
  after:
    label: Pages CMS
    items:
      - GitHub 리포지토리의 Markdown을 직접 편집
      - GUI 에디터로 비엔지니어도 기사 업데이트 가능
      - 서버 사이드 불필요 — Pages와 완벽 호환
      - .pages.yml 하나로 설정 완료
callout:
  type: tip
  title: Turnstile의 이점
  text: reCAPTCHA와 달리 Cloudflare Turnstile은 이미지 선택 같은 사용자 조작이 필요 없습니다. 백그라운드에서 자동 검증되어 UX를 해치지 않고 봇을 차단할 수 있습니다.
faq:
  title: 자주 묻는 질문
  items:
    - question: Pages CMS란 무엇인가요?
      answer: GitHub 리포지토리의 Markdown 파일을 GUI로 직접 편집할 수 있는 경량 CMS입니다. 서버가 불필요하고, .pages.yml 하나로 설정이 완료되며, 비엔지니어도 기사를 업데이트할 수 있습니다.
    - question: Cloudflare Turnstile은 reCAPTCHA와 어떻게 다른가요?
      answer: Turnstile은 이미지 선택 같은 사용자 조작을 요구하지 않으며 백그라운드에서 자동 검증합니다. UX를 해치지 않고 프라이버시를 존중하며, 무료로 사용할 수 있습니다.
    - question: 정적 사이트에서 폼 전송을 어떻게 처리하나요?
      answer: ssgform.com이나 Formspree 같은 외부 폼 서비스를 사용하면 서버 사이드 코드 없이 폼 전송을 처리할 수 있습니다. Turnstile과 결합하여 스팸 방지도 가능합니다.
---

CMS 선정은 화려하지 않지만 중요한 의사결정입니다. 이 글에서는 3가지 CMS 후보를 비교 검토한 과정과 문의 폼에 Cloudflare Turnstile로 봇 차단을 구현한 내용을 다룹니다.

## CMS 선정 과정

Astro로 구축한 정적 사이트에 CMS를 도입할 때, 다음 3가지를 후보로 선정했습니다.

### Keystatic: 첫 번째 후보

타입 세이프한 CMS로서 Keystatic을 주목하고 있었습니다. 공식적으로 Astro 통합을 지원합니다. 하지만 로컬 모드로 운용하려면 서버 사이드 런타임이 필요하여, Cloudflare Pages의 정적 배포와는 궁합이 맞지 않았습니다.

### Sveltia CMS: 기능은 풍부하지만 무거움

Sveltia CMS는 Decap CMS(구 Netlify CMS)의 포크로 모던한 UI와 풍부한 기능을 갖추고 있습니다. 하지만 현재 프로젝트 규모(블로그 게시물 몇 개와 정적 페이지 몇 개)에는 과도한 사양이었습니다. 콘텐츠가 늘어남에 따라 향후 재검토할 예정입니다.

### Pages CMS: 최종 선택

[Pages CMS](https://pagescms.org/)는 GitHub 리포지토리의 Markdown 파일을 직접 편집하는 경량 CMS입니다.

결정적 요인은 다음과 같았습니다:

- **간편한 설정**: `.pages.yml` 파일 하나만 추가하면 됨
- **서버 불필요**: GitHub API를 통해 작동하므로 추가 인프라 불필요
- **Markdown 네이티브**: Astro의 콘텐츠 컬렉션과 직접 통합
- **GUI 에디터**: 비엔지니어 팀원이 브라우저에서 기사 편집 가능

```yaml
# .pages.yml
content:
  - name: blog
    label: ブログ
    path: src/content/blog
    type: collection
    fields:
      - name: title
        label: タイトル
        type: string
      - name: date
        label: 公開日
        type: date
      - name: tags
        label: タグ
        type: string
        list: true
```

## Cloudflare Turnstile 도입

문의 폼의 스팸 방지로 Cloudflare Turnstile을 도입했습니다.

### reCAPTCHA 대신 Turnstile을 선택한 이유

Google reCAPTCHA v2는 사용자에게 이미지 선택을 강제하고, v3는 점수 기반이지만 프라이버시 우려가 있습니다. Cloudflare Turnstile은 다음 면에서 우수합니다:

| 비교 | reCAPTCHA v2 | reCAPTCHA v3 | Turnstile |
| --- | --- | --- | --- |
| 사용자 조작 | 이미지 선택 필요 | 불필요 | 불필요 |
| 프라이버시 | 쿠키 기반 추적 | 행동 분석 | 최소한의 데이터 수집 |
| 성능 | 무거움 | 보통 | 가벼움 |
| 가격 | 무료(제한 있음) | 무료(제한 있음) | 무료(무제한) |

### 구현

Turnstile 도입은 의외로 간단합니다.

#### 1. Cloudflare 대시보드에서 위젯 생성

Cloudflare 대시보드의 "Turnstile" 섹션에서 위젯을 생성하고 대상 호스트네임(프로덕션 도메인과 `localhost`)을 등록합니다. 사이트 키가 발급됩니다.

#### 2. 폼에 위젯 추가

```html
<!-- Load the Turnstile script -->
<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  async
  defer
></script>

<!-- Place the widget inside the form -->
<form action="https://ssgform.com/s/your-form-id" method="POST">
  <!-- Form fields -->
  <input type="text" name="name" required />
  <textarea name="message" required></textarea>

  <!-- Turnstile widget -->
  <div
    class="cf-turnstile"
    data-sitekey="your-site-key"
    data-language="ja"
    data-theme="light"
  ></div>

  <button type="submit">Submit</button>
</form>
```

`data-language="ja"`를 설정하면 검증 완료 시 "成功しました！"(성공!)가 일본어로 표시됩니다. `data-theme="light"`로 배경색을 사이트 디자인에 맞출 수 있습니다.

#### 3. CSP 헤더 업데이트

Turnstile은 iframe을 사용하므로 CSP에서 적절히 허용해야 합니다.

```text
script-src: https://challenges.cloudflare.com
connect-src: https://challenges.cloudflare.com
frame-src: https://challenges.cloudflare.com
```

### 참고: 위젯 생성 후 전파 지연

Cloudflare 대시보드에서 위젯을 생성한 직후에는 사이트 키가 글로벌로 전파되기까지 1~2분이 걸립니다. 이 기간 동안 `400020` 오류가 발생하지만, 잠시 기다리면 해결됩니다.

## ssgform.com 활용

폼 전송 엔드포인트로 [ssgform.com](https://ssgform.com/)을 사용합니다. 정적 사이트용 폼 전송 서비스로 다음과 같은 이점이 있습니다:

- 서버 사이드 코드 불필요
- 자동 이메일 알림
- Turnstile 토큰 검증 지원
- 무료 플랜으로 충분한 전송량

## 정리

CMS와 봇 차단 모두 "필요 최소한"을 선택한다는 원칙으로 통일했습니다. Pages CMS는 5분이면 설정 완료되고, Turnstile은 HTML 몇 줄만 추가하면 구현할 수 있습니다. 아키텍처가 심플하기 때문에 운용 비용이 낮게 유지됩니다.
