---
title: '일본어 글 하나만 발행해서 9개 언어 블로그를 운영하는 방법'
description: 'Pages CMS에서 일본어 글만 업데이트하면 GitHub Actions와 GitHub Copilot이 일본어 + 8개 언어의 번역 글을 자동으로 생성하고, 빌드 및 자동 머지까지 진행하는 운영 방식을 정리합니다.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: 결론 먼저
  text: '현재 Acecore 사이트라면 일본어 글을 번역 원본으로 삼아, GitHub Actions와 GitHub Copilot으로 일본어 + 8개 언어 블로그 운영을 자동화할 수 있습니다.'
processFigure:
  title: 일본어 1편에서 9개 언어 운영까지의 흐름
  steps:
    - title: 일본어 소스 업데이트
      description: Pages CMS 또는 Markdown으로 일본어 글만 편집해서 main에 반영한다.
      icon: i-lucide-pencil-line
    - title: 번역 issue 자동 생성
      description: source path와 대상 로케일을 담은 issue를 GitHub Actions가 생성한다.
      icon: i-lucide-ticket
    - title: Copilot이 번역 PR 작성
      description: issue를 받아 번역 파일을 생성하고 translation PR을 오픈한다.
      icon: i-lucide-git-pull-request
    - title: build·merge·issue close
      description: build 성공 후 자동 머지하고, 부모 translation issue도 자동으로 닫는다.
      icon: i-lucide-check-check
compareTable:
  title: 수동 운영과 자동 운영 비교
  before:
    label: 수동 번역 운영
    items:
      - 글 공개 후 번역 태스크를 사람이 생성한다
      - 언어별로 담당자를 배정한다
      - build나 머지 판단도 사람이 한다
      - 부모 issue를 닫지 않고 넘어가는 경우가 생긴다
  after:
    label: 자동 번역 운영
    items:
      - 일본어 글 push가 시작점이 된다
      - Copilot에 자동 배정된다
      - 번역 PR은 build 후 자동 머지된다
      - 부모 issue도 merge 후 자동으로 닫힌다
checklist:
  title: 도입 전에 갖춰야 할 것들
  items:
    - text: 일본어를 번역 원본으로 삼는 콘텐츠 구조
    - text: src/content/blog/{locale}/{slug}.md 같은 번역 파일 배치 규칙
    - text: issues write 권한을 가진 GitHub Actions
    - text: Copilot assignment API를 호출할 수 있는 COPILOT_AGENT_TOKEN
    - text: npm run build 같은 안정적인 빌드 커맨드
faq:
  title: 자주 묻는 질문
  items:
    - question: 일본어 글만 push하면 다른 언어 글도 자동으로 만들어지나요?
      answer: '네. 현재 Acecore 사이트는 `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru`의 9개 언어 구성이므로, 일본어 글 push를 시작점으로 나머지 8개 언어 translation issue 생성, Copilot 배정, 번역 PR 작성, build, 자동 머지, issue close까지 흐를 수 있습니다. 또한 번역 파일이 아직 없어도 각 로케일의 URL은 일본어 폴백으로 제공되므로, 공개를 멈추지 않고 나중에 실제 번역으로 교체할 수 있습니다.'
    - question: 왜 바로 PR을 만들지 않고 한 번 issue를 거치나요?
      answer: 'source path, 대상 로케일, 번역 조건을 issue에 고정할 수 있기 때문입니다. 차이가 생겼을 때 재실행, 이력 확인, 실패 시 재시도가 훨씬 편해집니다.'
    - question: 자동 머지는 위험하지 않나요?
      answer: '무조건 머지는 위험합니다. translation PR에만 대상을 좁히고, Copilot이 만든 PR, translation으로 시작하는 타이틀, build 성공, 비 draft를 조건으로 삼으면 상당히 안전하게 유지할 수 있습니다.'
---

결론부터 말하면, 이 사이트에서는 Pages CMS로 일본어 글 1편을 공개하는 것만으로 일본어 + 8개 언어 블로그 글을 순차적으로 갖출 수 있습니다. GitHub Actions와 GitHub Copilot이 translation issue 생성, 번역 PR 작성, build, 자동 머지, 부모 issue close까지 진행하는 구성입니다.

운영 담당이 평소에 건드리는 것은 일본어 글과 저자 정보뿐입니다. 번역 태스크 생성이나 PR 정리를 매번 손으로 하지 않아도 되므로, 다국어 블로그 운영 부담을 크게 줄일 수 있습니다.

## 이 방법의 전제 조건

전제로서, 이 방법은 Astro 측에 다음 기반이 이미 갖춰진 구성을 상정합니다.

- 9개 언어 라우팅（ja, en, zh-cn, es, pt, fr, ko, de, ru）
- 번역이 아직 없는 페이지도 일본어를 표시할 수 있는 폴백
- Pages CMS에서 일본어 글과 저자 정보를 업데이트할 수 있는 운영 환경

기반 구축 방법 자체는 [Astro 6 사이트를 9개 언어 대응으로 — 블로그 글 136편의 자동 번역과 다국어 아키텍처](/blog/astro-i18n-blog-translation/)에 정리되어 있습니다. 이 글에서는 그 위에 Copilot 자동 번역 운영을 어떻게 올릴지에만 집중합니다.

## 무엇을 할 수 있는가

운영 관점에서 보면, 평소에 접하는 화면은 이 2가지입니다. 이번에는 Pages CMS 화면을 그대로 사용하여, **일상 운영에서 어디를 건드리는지**를 바로 알 수 있는 형태로 했습니다.

![Pages CMS의 일본어 블로그 목록 화면](/uploads/pagescms-blog-ja-live-20260329.png)

첫 번째는 Pages CMS의 일본어 블로그 목록입니다. 여기서 공개일과 저자를 확인하면서 일본어 글만 추가·업데이트합니다. 여러 언어의 편집 화면을 매번 드나들지 않고, **번역 원본인 일본어만 건드린다**는 운영 방식에 맞추는 것이 포인트입니다.

![Pages CMS의 저자 정보 폼 화면](/uploads/pagescms-authors-live-20260329.png)

두 번째는 저자 정보 폼입니다. 저자 데이터도 일본어 기반 항목만 CMS에서 업데이트하고, 번역용 `i18n`은 GitHub 측 자동화 플로에서 다룬다고 전제하면, 운영 책임의 분리가 상당히 깔끔해집니다.

## 이 방법이 맞는 케이스

우선 전제로서, 다음과 같은 팀이나 사이트에서 특히 효과적입니다.

- 일본어를 번역 원본으로 삼고 싶다
- 블로그는 Markdown 기반으로 관리한다
- 번역을 매번 수동으로 생성하는 것이 번거롭다
- 번역 품질은 어느 정도 AI에 맡기고 싶다
- 단, build 실패나 draft인 채로 있는 PR은 막고 싶다

반대로 언어별로 완전히 독립된 편집 체제를 가진 경우에는 다른 운영 방식이 더 맞을 수도 있습니다.

## Step 1. 번역 원본을 일본어 글에 고정한다

가장 먼저 결정해야 할 것은 "어떤 파일을 번역 원본으로 삼을지"입니다. 여기가 모호하면 자동화가 무너집니다.

이 글에서 말하는 번역 원본이란, **가장 먼저 편집하여 각 언어 글과 파생 데이터의 기준이 되는 일본어 파일**을 가리킵니다.

이번 구성에서는 다음과 같이 원본과 번역 대상을 나누고 있습니다.

- 블로그 글 번역 원본: `src/content/blog/{slug}.md`
- 블로그 글 번역 대상: `src/content/blog/{locale}/{slug}.md`
- 저자 정보 번역 원본: `src/content/authors/{authorId}.json`
- 저자 정보 번역 대상: `src/content/authors/{authorId}.json`의 `i18n`
- 태그 정의 번역 원본: `src/content/tags/{tagId}.json`
- 태그 정의 번역 대상: `src/content/tags/{tagId}.json`의 `i18n`

디렉토리 구조는 대략 다음과 같이 하면 다루기 쉽습니다.

```text
src/content/blog/
  my-post.md
  another-post.md
  en/
    my-post.md
  zh-cn/
    my-post.md
  fr/
    my-post.md
```

중요한 것은 **번역 파일의 slug를 원본 일본어 글과 맞추는 것**입니다. 이것만으로도 source path에서 자동으로 번역 대상을 특정하기 쉬워집니다.

이 repo에서는 번역 파일이 아직 존재하지 않아도 각 로케일의 URL 자체는 일본어 폴백으로 생성됩니다. 즉 "우선 일본어 글을 공개하고, 그 후에 번역 PR이 따라온다"는 운영이 가능합니다.

## Step 2. 일본어 글 push를 translation issue로 변환한다

다음으로 할 일은 GitHub Actions로 일본어 글의 변경을 감지하여 translation issue를 자동 생성하는 것입니다.

최소한 필요한 것은 다음과 같습니다.

- `main`으로의 push를 모니터링한다
- `src/content/blog/*.md`만을 일반 자동 생성 대상으로 삼는다
- frontmatter만의 변경이 아닌, 본문이 변경되었을 때만 issue를 만든다
- 같은 source path의 open issue가 있으면 새로 만들지 않고 업데이트한다
- issue body에 source path를 marker로 삽입한다

저자 정보나 태그 정의도 번역 대상이지만, 일반 push에서는 자동 생성하지 않습니다. 필요할 때만 `workflow_dispatch`로 명시적으로 실행하는 운영으로 두면, 불필요한 issue가 늘어나기 어렵습니다.

예를 들어 issue body에 이런 코멘트를 넣어두면, 이후 자동화에서 재사용할 수 있습니다.

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

workflow 측은 다음과 같은 필터링이 기본입니다.

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
```

또한 Markdown 본문만 비교하여 translation issue를 만들도록 하면, 공개일이나 태그의 미세한 수정만으로 번역 issue가 대량으로 생기는 사고를 방지할 수 있습니다.

여기서 중요한 것은 "번역을 직접 만드는" 것이 아니라, **일단 issue를 만드는** 것입니다. issue를 거침으로써, source path와 대상 언어, 번역 조건을 사람에게도 AI에게도 보이는 형태로 고정할 수 있습니다.

## Step 3. translation issue를 Copilot에 자동 배정한다

issue를 만드는 것만으로는 수동 작업이 남으므로, 여기서 Copilot에 자동 배정합니다.

할 일은 2가지입니다.

1. `COPILOT_AGENT_TOKEN`을 repository secret에 넣는다
2. issue 생성 후 assignment API를 호출한다

개념으로는, issue를 patch하여 Copilot을 assignee로 설정합니다.

```json
{
  "assignees": ["copilot-swe-agent[bot]"],
  "agent_assignment": {
    "target_repo": "OWNER/REPO",
    "base_branch": "main",
    "custom_instructions": "Translate the Japanese source article..."
  }
}
```

이때, 일반 자동 생성은 글용에만 좁히고, 저자 정보용이나 태그 정의용은 필요할 때만 manual dispatch로 실행하도록 하면 운영이 안정됩니다. 저자 정보에서는 `src/content/authors/{authorId}.json`의 `i18n`, 태그 정의에서는 `src/content/tags/{tagId}.json`의 `i18n.name`, 글에서는 `src/content/blog/{locale}/`에 동명 파일을 만든다는 규칙을 명시해두면 실수가 줄어듭니다.

## Step 4. 번역 PR을 build하고, 자동 머지한다

여기는 무조건 자동화하지 않는 것이 안전합니다. 다음 조건을 모두 만족하는 PR만을 머지 대상으로 하는 것을 권장합니다.

- Copilot이 만든 PR이다
- 타이틀이 `[translation]`으로 시작한다
- `main`을 향한다
- draft가 아니다
- build가 성공했다

이번 구성에서는 2단계로 나누고 있습니다.

1. `Translation PR Build`
2. `Merge Translation PR`

ready for review가 된 타이밍에 PR head를 build하고, 성공하면 그대로 squash merge하는 형태입니다. GitHub의 branch protection에 의존하지 않으므로, 소규모 repo에서도 다루기 쉽습니다.

### 자동 머지에서 좁혀야 할 조건

자동 머지를 넣을 때는 최소한 다음 조건을 권장합니다.

- translation PR 이외는 대상 제외
- build 실패면 멈춘다
- draft인 동안은 멈춘다
- Copilot 이외가 만든 PR은 대상 제외

이 4가지를 넣어두면, 일반 개발 PR까지 휘말리는 사고는 상당히 방지할 수 있습니다.

## Step 5. merge 후에 부모 translation issue를 자동으로 닫는다

마지막으로 넣어두면 운영이 깔끔해지는 것이 부모 issue의 자동 close입니다.

방법은 간단하게, merge된 translation PR에 대해 다음을 합니다.

1. PR의 changed files를 취득한다
2. PR body에 있는 source path도 읽는다
3. `translation-source:` marker에 대응하는 open issue를 검색한다
4. 코멘트를 달고 close한다

PR body의 source path도 보도록 한 이유는, Copilot이 만든 PR의 changed files만으로는 상황에 따라 source의 역추적이 약한 경우가 있기 때문입니다. **changed files와 PR body 양쪽을 사용하면** 안정됩니다.

## 보충

### Copilot이 만드는 PR이나 issue의 문구를 일본어로 맞추기

GitHub 측에서 Copilot의 출력 언어를 안정시키고 싶다면, repo-wide instructions를 사용하는 것이 가장 자연스럽습니다.

즉, `.github/copilot-instructions.md`를 놓습니다.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

이 1파일이 있는 것만으로, Copilot coding agent가 issue나 PR을 만들 때의 기본 언어와 맥락이 상당히 안정됩니다.

## 정리

이 구성의 핵심은, 번역을 "사람이 그때그때 부탁하는 작업"이 아닌, **일본어 소스의 push에 종속하는 정형 처리**로 떨어뜨리는 것입니다.

흐름을 다시 한 번 정리하면 이렇습니다.

1. 일본어 글만 작성한다
2. push로 translation issue를 자동 생성한다
3. Copilot에 자동 배정한다
4. 번역 PR을 build하여 자동 머지한다
5. 부모 issue까지 자동으로 닫는다

여기까지 구성하면, 운영 측의 감각으로는 상당히 자연스럽습니다. **일본어 글만 push하면, 다른 언어의 글은 GitHub 측에서 순서대로 만들어져 가는** 상태가 됩니다.

물론 실제로는 issue 생성, Copilot 실행, PR 작성, build, merge라는 비동기 흐름을 거치므로 "즉시 전부 완료"되는 것은 아닙니다. 다만, 운영 담당자가 매번 수동으로 번역 태스크를 생성하거나, PR을 닫지 않고 넘어가는 일은 없어집니다.

이번 글 자체도, 일본어판을 기준으로 이 플로에 흘려 보낼 수 있는 구성으로 했습니다. 다국어 사이트를 지속적으로 운영한다면, 우선 이 정도의 자동화부터 시작하는 것이 딱 좋다고 생각합니다.
