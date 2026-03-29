---
title: '일본어 기사 1개 게시만으로 9개 언어 블로그를 운영하는 방법'
description: 'Pages CMS에서 일본어 기사만 업데이트하고 GitHub Actions와 GitHub Copilot으로 일본어 + 8개 언어의 번역 기사를 자동 생성하여 빌드 및 자동 병합까지 진행하는 운용 절차를 정리합니다.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: 먼저 결론
  text: '현재의 Acecore 사이트라면 일본어 기사를 번역원으로 하여 GitHub Actions와 GitHub Copilot으로 일본어 + 8개 언어의 블로그 운영을 자동화할 수 있습니다.'
processFigure:
  title: 일본어 1개 기사에서 9개 언어 운영으로의 흐름
  steps:
    - title: 일본어 소스 업데이트
      description: Pages CMS 또는 Markdown으로 일본어 기사만 편집하여 main에 반영한다.
      icon: i-lucide-pencil-line
    - title: 번역 이슈 자동 등록
      description: 소스 경로와 대상 로케일을 포함한 이슈를 GitHub Actions가 생성한다.
      icon: i-lucide-ticket
    - title: Copilot이 번역 PR 생성
      description: 이슈를 받아 번역 파일을 생성하고 번역 PR을 등록한다.
      icon: i-lucide-git-pull-request
    - title: 빌드, 병합, 이슈 종료
      description: 빌드 성공 후 자동 병합하고, 부모 번역 이슈도 자동으로 닫는다.
      icon: i-lucide-check-check
compareTable:
  title: 수동 운영과 자동 운영 비교
  before:
    label: 수동 번역 운영
    items:
      - 기사 공개 후 사람이 번역 작업을 등록한다
      - 언어별로 담당자를 할당한다
      - 빌드 및 병합 판단도 사람이 한다
      - 부모 이슈를 닫지 않는 실수가 발생하기 쉽다
  after:
    label: 자동 번역 운영
    items:
      - 일본어 기사의 push가 기점이 된다
      - Copilot에 자동 할당된다
      - 번역 PR은 빌드 후 자동 병합된다
      - 부모 이슈도 병합 후 자동으로 닫힌다
checklist:
  title: 도입 전에 갖춰야 할 것들
  items:
    - text: 일본어를 번역원으로 하는 콘텐츠 구조
    - text: src/content/blog/{locale}/{slug}.md 와 같은 번역 파일 배치 규칙
    - text: issues 쓰기 권한을 가진 GitHub Actions
    - text: Copilot 할당 API를 호출할 수 있는 COPILOT_AGENT_TOKEN
    - text: npm run build 와 같은 안정적인 빌드 명령
faq:
  title: 자주 묻는 질문
  items:
    - question: 일본어 기사를 push하면 다른 언어의 기사도 자동으로 생성되나요?
      answer: '네. 현재 Acecore 사이트는 ja, en, zh-cn, es, pt, fr, ko, de, ru의 9개 언어 구성이므로, 일본어 기사의 push를 기점으로 나머지 8개 언어의 번역 이슈 생성, Copilot 할당, 번역 PR 생성, 빌드, 자동 병합, 이슈 종료까지 진행됩니다. 번역 파일이 아직 없어도 각 로케일의 URL은 일본어 폴백으로 제공할 수 있으므로 먼저 공개하고 나중에 실제 번역으로 교체하는 운영이 가능합니다.'
    - question: 왜 직접 PR을 만들지 않고 이슈를 한 번 거치나요?
      answer: '소스 경로, 대상 로케일, 번역 조건을 이슈에 고정할 수 있기 때문입니다. 차이가 생겼을 때 재실행, 이력 확인, 실패 시 재도전이 훨씬 쉬워집니다.'
    - question: 자동 병합은 위험하지 않나요?
      answer: '무조건 병합은 위험합니다. 번역 PR만을 대상으로 하고, Copilot이 생성한 PR, [translation]으로 시작하는 제목, 빌드 성공, 비드래프트를 모두 조건으로 설정하면 상당히 안전한 수준으로 만들 수 있습니다.'
---

결론부터 말하면, 이 사이트에서는 Pages CMS로 일본어 기사를 1개 공개하는 것만으로 일본어 + 8개 언어의 블로그 기사를 순서대로 갖출 수 있습니다. GitHub Actions와 GitHub Copilot이 번역 이슈 생성, 번역 PR 생성, 빌드, 자동 병합, 부모 이슈 종료까지 진행하는 구성입니다.

운영 담당자가 평소 다루는 것은 일본어 기사와 저자 정보뿐입니다. 번역 작업 등록이나 PR 정리를 매번 수동으로 할 필요가 없어지므로 다국어 블로그 운영 부담을 크게 줄일 수 있습니다.

## 이 방법의 전제 조건

전제로서, 이 방법은 Astro 측에 다음 기반이 이미 갖춰진 구성을 가정합니다.

- 9개 언어 라우팅 (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- 번역이 아직 없는 페이지에서도 일본어를 보여줄 수 있는 폴백
- Pages CMS에서 일본어 기사와 저자 정보를 업데이트할 수 있는 운영

기반 구축 방법 자체는 [Astro 6 사이트를 9개 언어 대응으로 — 블로그 기사 136편의 자동 번역과 다국어 아키텍처](/blog/astro-i18n-blog-translation/)에 정리되어 있습니다. 이 기사에서는 그 위에 Copilot 자동 번역 운영을 어떻게 올릴지에만 초점을 맞춥니다.

## 무엇을 할 수 있나

운영 측에서 보면 평소 다루는 화면은 이 2개입니다. 이번에는 Pages CMS 화면을 그대로 사용하여 **일상 운영에서 어디를 다루는지**를 바로 알 수 있는 형태로 했습니다.

![Pages CMS의 일본어 블로그 목록 화면](/uploads/pagescms-blog-ja-live-20260329.png)

첫 번째는 Pages CMS의 일본어 블로그 목록입니다. 여기서 공개일과 저자를 보면서 일본어 기사만 추가·업데이트합니다. 여러 언어의 편집 화면에 매번 들어가지 않고 **번역원인 일본어만 다루는** 운영 방식이 핵심입니다.

![Pages CMS의 저자 정보 폼 화면](/uploads/pagescms-authors-live-20260329.png)

두 번째는 저자 정보 폼입니다. 저자 데이터도 CMS에서는 일본어 기반 항목만 업데이트하고, 번역용 `i18n`은 GitHub 측 자동화 플로우에서 처리하는 전제로 하면 운영 책임 분리가 상당히 깔끔해집니다.

## 이 방법이 적합한 경우

먼저 전제로서 다음과 같은 팀이나 사이트에 특히 효과적입니다.

- 일본어를 번역원으로 하고 싶다
- 블로그는 Markdown 기반으로 관리하고 있다
- 번역을 매번 수동으로 등록하는 것이 번거롭다
- 번역 품질은 어느 정도 AI에 맡기고 싶다
- 단, 빌드 실패나 드래프트 상태인 PR은 막고 싶다

반대로 언어별로 완전히 독립적인 편집 체제를 가진 경우에는 다른 운영 방식이 더 맞을 수도 있습니다.

## Step 1. 번역원을 일본어 기사로 고정하기

가장 먼저 결정해야 할 것은 "어떤 파일을 번역원으로 할 것인가"입니다. 이것이 모호하면 자동화가 무너집니다.

이 기사에서 말하는 번역원이란 **가장 먼저 편집하고, 각 언어의 기사와 파생 데이터의 기준이 되는 일본어 파일**을 말합니다.

이번 구성에서는 다음을 번역원과 번역처로 나누고 있습니다.

- 블로그 기사 번역원: `src/content/blog/{slug}.md`
- 블로그 기사 번역처: `src/content/blog/{locale}/{slug}.md`
- 저자 정보 번역원: `src/data/authors.json`
- 저자 정보 번역처: `src/data/authors.json`의 `i18n`

디렉토리 구조는 대략 다음과 같이 해두면 다루기 쉽습니다.

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

중요한 것은 **번역 파일의 slug를 원래 일본어 기사와 맞추는 것**입니다. 이것만으로 소스 경로에서 자동으로 번역 대상을 특정하기 쉬워집니다.

이 repo에서는 번역 파일이 아직 존재하지 않아도 각 로케일의 URL 자체는 일본어 폴백으로 생성됩니다. 즉, "먼저 일본어 기사를 공개하고, 그 후에 번역 PR이 따라오는" 운영이 가능합니다.

## Step 2. 일본어 기사의 push를 번역 이슈로 변환하기

다음에 할 것은 일본어 기사의 변경을 GitHub Actions로 감지하여 번역 이슈를 자동으로 등록하는 것입니다.

최소한 필요한 것은 다음과 같습니다.

- `main`에의 push를 감시한다
- `src/content/blog/*.md`와 `src/data/authors.json`만을 대상으로 한다
- 같은 소스 경로의 open 이슈가 있으면 신규 생성이 아닌 업데이트를 한다
- 이슈 본문에 소스 경로를 마커로 포함시킨다

예를 들어 이슈 본문에 이런 주석을 넣어두면 후속 자동화에서 재활용할 수 있습니다.

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

워크플로우 측의 기본 필터링은 다음과 같습니다.

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
      - src/data/authors.json
```

여기서 중요한 것은 "번역을 직접 만드는" 것이 아니라 **한 번 이슈를 만드는** 것입니다. 이슈를 거침으로써 소스 경로와 대상 언어, 번역 조건을 사람과 AI 모두에게 보이는 형태로 고정할 수 있습니다.

## Step 3. 번역 이슈를 Copilot에 자동 할당하기

이슈를 만드는 것만으로는 수동 작업이 남으므로, 여기서 Copilot에 자동 할당합니다.

할 일은 2가지입니다.

1. `COPILOT_AGENT_TOKEN`을 repository secret에 넣는다
2. 이슈 생성 후 할당 API를 호출한다

개념적으로는 이슈를 patch하여 Copilot을 assignee로 설정합니다.

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

이때 기사용과 저자 정보용으로 `custom_instructions`를 나눠두면 정확도가 안정됩니다. 저자 정보에서는 `src/data/authors.json`의 `i18n`만 다룬다, 기사에서는 `src/content/blog/{locale}/`에 같은 이름의 파일을 만든다는 규칙을 명시해두면 실수가 줄어듭니다.

## Step 4. 번역 PR을 빌드하고 자동 병합하기

여기서는 무조건 자동화를 하지 않는 것이 안전합니다. 권장하는 것은 다음 조건을 모두 충족한 PR만을 병합 대상으로 하는 것입니다.

- Copilot이 생성한 PR이다
- 제목이 `[translation]`으로 시작한다
- `main` 향이다
- 드래프트가 아니다
- 빌드가 성공했다

이번 구성에서는 2단계로 나눠져 있습니다.

1. `Translation PR Build`
2. `Merge Translation PR`

ready for review가 된 타이밍에 PR head를 빌드하고, 성공하면 그대로 squash merge하는 형태입니다. GitHub의 branch protection에 의존하지 않으므로 소규모 repo에서도 다루기 쉽습니다.

### 자동 병합에서 좁혀야 할 조건

자동 병합을 넣을 때는 최소한 다음 조건은 권장합니다.

- 번역 PR 이외는 대상 외
- 빌드 실패라면 멈춘다
- 드래프트인 동안은 멈춘다
- Copilot 이외가 만든 PR은 대상 외

이 4가지를 넣어두면 일반 개발 PR까지 말려드는 사고는 상당히 막을 수 있습니다.

## Step 5. 병합 후 부모 번역 이슈를 자동으로 닫기

마지막에 넣어두면 운영이 깔끔해지는 것이 부모 이슈의 자동 종료입니다.

방법은 간단하여, 병합된 번역 PR에 대해 다음을 수행합니다.

1. PR의 changed files를 취득한다
2. PR body에 있는 소스 경로도 읽는다
3. `translation-source:` 마커에 대응하는 open 이슈를 검색한다
4. 코멘트를 달고 닫는다

PR body의 소스 경로도 보도록 한 이유는 Copilot이 만든 PR의 changed files만으로는 상황에 따라 소스의 역추적이 약한 경우가 있기 때문입니다. **changed files와 PR body 양쪽을 사용하면** 안정됩니다.

## 보충

### Copilot이 만드는 PR이나 이슈의 문장을 일본어로 맞추기

GitHub 측에서 Copilot의 출력 언어를 안정시키고 싶다면, repo-wide instructions를 사용하는 것이 가장 깔끔합니다.

즉, `.github/copilot-instructions.md`를 둡니다.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

이 1개 파일이 있는 것만으로 Copilot coding agent가 이슈나 PR을 만들 때의 기본 언어와 문맥이 상당히 안정됩니다.

## 정리

이 구성의 핵심은 번역을 "사람이 매번 부탁하는 작업"이 아니라 **일본어 소스의 push에 종속되는 정형 처리**로 만드는 것입니다.

흐름을 다시 한번 정리하면 다음과 같습니다.

1. 일본어 기사만 작성한다
2. push로 번역 이슈를 자동 등록한다
3. Copilot에 자동 할당한다
4. 번역 PR을 빌드하여 자동 병합한다
5. 부모 이슈도 자동으로 닫는다

여기까지 구성하면 운영 측의 감각으로는 상당히 자연스럽습니다. **일본어 기사만 push하면 다른 언어의 기사는 GitHub 측에서 순서대로 완성되어 가는** 상태가 됩니다.

물론 실제로는 이슈 생성, Copilot 실행, PR 생성, 빌드, 병합이라는 비동기 흐름을 거치므로 "순식간에 전부 완성된다"는 것은 아닙니다. 단, 운영 담당자가 매번 수동으로 번역 작업을 등록하거나 PR을 닫지 않고 방치할 필요는 없어집니다.

이번 기사 자체도 일본어 버전을 기준으로 이 플로우에 흘려 넣을 수 있는 구성으로 되어 있습니다. 다국어 사이트를 계속 운영하려면 먼저 이 정도의 자동화부터 시작하는 것이 적당하다고 생각합니다.
