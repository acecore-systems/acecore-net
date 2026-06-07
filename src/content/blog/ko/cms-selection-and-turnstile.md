---
title: 'Sveltia CMS 도입 가이드'
description: 'Astro 같은 정적 사이트에 Sveltia CMS를 도입하는 방법을 GitHub backend, OAuth Worker, 이미지 업로드, 다국어 운영, CMS 전용 PR 흐름, 실제 수정에서 얻은 교훈까지 정리합니다.'
date: 2026-06-07T16:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'CMS', 'Astro', 'Cloudflare', 'セキュリティ']
image: /uploads/acecore-generated/blog-cms-selection-and-turnstile.webp
processFigure:
  title: Sveltia CMS 도입 흐름
  description: 관리 화면, 인증, 편집 대상, 미디어, PR 운영을 각각 분리해 설계합니다.
  steps:
    - title: 관리 화면 배치
      description: public/admin 아래에 index.html과 config.yml을 두고 Sveltia CMS를 로드합니다.
      icon: i-lucide-layout
      accent: brand
    - title: GitHub backend 설정
      description: repo, branch, OAuth Worker, CMS commit message를 먼저 정합니다.
      icon: i-lucide-git-branch
      accent: emerald
    - title: 편집 범위 제한
      description: 블로그, 작성자, 태그, 일본어 source JSON처럼 CMS에서 다룰 파일만 collection으로 노출합니다.
      icon: i-lucide-file-text
      accent: amber
    - title: 운영 자동화
      description: cms-content 브랜치, CMS 편집 PR, 번역 PR task를 일반 개발과 분리해 연결합니다.
      icon: i-lucide-git-pull-request
      accent: slate
compareTable:
  title: CMS 도입 전후
  before:
    label: Markdown 직접 편집
    items:
      - GitHub나 에디터에 익숙한 사람만 쉽게 수정할 수 있음
      - 이미지 경로, 작성자 ID, 태그명을 수동 입력하기 쉬움
      - 일본어 source와 번역 파일 수정 범위가 섞이기 쉬움
      - preview 환경이 main 내용을 읽을 수 있음
  after:
    label: Sveltia CMS 편집
    items:
      - 브라우저 폼에서 Markdown과 JSON을 편집할 수 있음
      - relation, image, select로 잘못된 값을 줄임
      - CMS commit만 번역 PR task를 트리거함
      - runtime config로 preview와 production의 CMS branch를 전환함
callout:
  type: note
  title: 이 글의 전제
  text: Sveltia CMS는 브라우저에서 동작하는 관리 앱이며 Git backend를 통해 저장소의 Markdown과 JSON을 편집합니다. Acecore 사이트 사례를 사용하지만, 많은 Astro 정적 사이트에 적용할 수 있습니다.
checklist:
  title: 도입 체크리스트
  items:
    - text: public/admin/index.html에서 Sveltia CMS 로드
      checked: true
    - text: public/admin/config.yml에 GitHub backend와 collections 정의
      checked: true
    - text: 여러 사용자가 편집한다면 OAuth Worker 사용
      checked: true
    - text: media_folder와 public_folder를 Astro public 디렉터리에 맞춤
      checked: true
    - text: CMS commit이 번역 또는 배포 workflow를 어떻게 트리거할지 결정
      checked: true
faq:
  title: 자주 묻는 질문
  items:
    - question: Sveltia CMS는 어떤 사이트에 적합한가요?
      answer: Markdown이나 JSON이 저장소에 있는 정적 사이트에 잘 맞습니다. Astro, Hugo, VitePress처럼 콘텐츠를 Git으로 관리하는 사이트라면 외부 DB 없이 CMS를 추가할 수 있습니다.
    - question: GitHub Personal Access Token만으로도 되나요?
      answer: 가능합니다. 하지만 여러 명이나 비개발자가 쓴다면 OAuth Worker가 더 안전하고 설명하기 쉽습니다. Acecore는 Cloudflare Worker를 OAuth 클라이언트로 사용합니다.
    - question: 다국어 사이트는 모든 언어를 CMS에서 편집해야 하나요?
      answer: 작은 팀에서는 일본어 source만 CMS에서 편집하고 번역은 PR로 반영하는 편이 안전합니다. 모든 언어를 노출하면 리뷰와 오래된 번역 감지가 어려워집니다.
---

Sveltia CMS는 정적 사이트에 편집 화면을 추가하고 싶지만 외부 데이터베이스를 늘리고 싶지 않을 때 유용합니다. 이 글은 Acecore의 Astro 사이트에 Sveltia CMS를 도입한 방식과, 이후 PR과 commit을 통해 드러난 문제를 어떻게 고쳤는지 정리합니다.

제목은 의도적으로 단순하게 **Sveltia CMS 도입 가이드** 로 정했습니다. CMS 비교 글이 아니라, 다른 사이트에 바로 적용할 수 있는 설계 메모입니다.

## Sveltia CMS가 맞는 경우

Sveltia CMS는 별도 데이터베이스와 API를 가진 CMS가 아닙니다. 브라우저에서 동작하는 SPA가 GitHub backend를 통해 저장소 파일을 편집합니다.

다음 조건에 잘 맞습니다.

- 콘텐츠가 Markdown 또는 JSON으로 저장소에 있음
- 기사, 작성자, 태그, 페이지 문구 변경을 Git diff로 리뷰하고 싶음
- 외부 DB나 별도 관리자 서버를 추가하고 싶지 않음
- 이미지를 `public/uploads` 같은 저장소 디렉터리에 둘 수 있음
- CMS 저장 후에도 Pull Request로 확인하고 배포하고 싶음

복잡한 권한, 예약 발행, 대량 미디어 관리, 실시간 데이터 편집이 필요하면 다른 headless CMS나 전용 관리자 화면이 더 적합합니다.

## 전체 구조

```text
public/admin/index.html
  -> CDN에서 @sveltia/cms 로드

public/admin/config.yml
  -> GitHub backend, collections, media folder 정의

workers/sveltia-cms-auth
  -> GitHub OAuth용 Cloudflare Worker

cms-content branch
  -> CMS 편집 내용 저장 브랜치

.github/workflows/cms-content-pr.yml
  -> cms-content에서 main으로 PR 생성

.github/workflows/create-translation-prs.yml
  -> cms: commit에만 번역 PR task 생성
```

관리 화면을 두는 것만으로는 충분하지 않습니다. 인증, 이미지 경로, preview branch, 번역, merge 방식까지 CMS 설계의 일부입니다.

## 1. `public/admin`에 관리 화면을 둔다

Astro에서는 `public` 아래 파일이 정적 파일로 배포됩니다. Sveltia CMS 공식 문서도 Astro, Next.js, Nuxt, Remix, VitePress의 정적 폴더로 `public`을 안내합니다.

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CMS</title>
  </head>
  <body>
    <script src="https://unpkg.com/@sveltia/cms@0.166.0/dist/sveltia-cms.js"></script>
  </body>
</html>
```

불필요한 CSS나 `type="module"`을 추가하지 않습니다. 현재 CDN bundle은 일반 script로 읽는 구성이 자연스럽습니다.

Acecore에서는 preview branch를 바꾸기 위해 수동 초기화를 사용합니다.

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 2. GitHub backend 설정

최소 설정은 `backend.name`과 `backend.repo`입니다. 실제 운영에서는 branch, OAuth, commit message도 처음에 정하는 편이 안전합니다.

```yaml
backend:
  name: github
  repo: owner/repository
  branch: cms-content
  base_url: https://your-sveltia-cms-auth-worker.example.workers.dev
  auth_methods: [oauth]
  commit_messages:
    create: 'cms: create {{collection}} "{{slug}}"'
    update: 'cms: update {{collection}} "{{slug}}"'
    delete: 'cms: delete {{collection}} "{{slug}}"'
    uploadMedia: 'cms: upload "{{path}}"'
    deleteMedia: 'cms: delete media "{{path}}"'
```

개인 사이트라면 `main`에 바로 저장해도 됩니다. 회사 사이트나 다국어 사이트라면 `cms-content` 같은 전용 branch에 저장하고 PR로 검토하는 구성이 안전합니다.

## 3. OAuth Worker 준비

Personal Access Token은 테스트에는 충분하지만 여러 편집자가 쓰기에는 적합하지 않습니다. Acecore는 Sveltia CMS Authenticator를 Cloudflare Workers에서 실행하고 `base_url`로 설정합니다.

GitHub OAuth App의 callback은 Worker의 `/callback`으로 향합니다. Worker에는 `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, 필요하면 `ALLOWED_DOMAINS`를 설정합니다.

Turnstile과 역할이 다릅니다. CMS 로그인은 GitHub OAuth가 담당하고, 폼이나 댓글 API의 bot 대책은 Turnstile이 담당합니다.

## 4. 이미지 업로드 위치를 먼저 정한다

Sveltia CMS internal media storage는 업로드 파일을 저장소에 저장합니다. Astro에서는 다음 구성이 실용적입니다.

```yaml
media_folder: public/uploads
public_folder: /uploads
```

Acecore는 나중에 [PR #116](https://github.com/acecore-systems/acecore-net/pull/116)에서 이 부분을 수정했습니다. 저장소 경로와 공개 URL은 CMS 도입 시점에 함께 정해야 합니다.

## 5. collection으로 편집 범위 나누기

| collection | 대상                           | 방침                                  |
| ---------- | ------------------------------ | ------------------------------------- |
| `blog`     | `src/content/blog/*.md`        | 일본어 source 기사만 편집             |
| `authors`  | `src/content/authors/*.json`   | 작성자 정보와 다국어 표시명 편집      |
| `tags`     | `src/content/tags/*.json`      | 태그명과 다국어 표시명 편집           |
| page text  | `src/i18n/source/ja/**/*.json` | 페이지와 공통 UI의 일본어 source 편집 |

모든 번역 Markdown을 CMS에 노출할 필요는 없습니다. Acecore는 일본어를 source of truth로 두고, 번역은 [GitHub Copilot 번역 파이프라인](/ko/blog/copilot-translation-pipeline/)으로 반영합니다.

## 6. relation과 select 사용

태그는 자유 입력보다 relation이 안전합니다.

```yaml
- name: tags
  label: 태그
  widget: relation
  collection: tags
  value_field: name
  display_fields: ['{{name}} ({{id}})']
  search_fields: [name, id]
  multiple: true
  required: false
```

작성자, 아이콘, 공지 tone도 같은 방식으로 제한합니다. CMS의 가치는 편집 가능성뿐 아니라 잘못된 값을 넣기 어렵게 만드는 데 있습니다.

## 7. 일본어 source JSON도 편집

고정 페이지 문구도 CMS화할 수 있습니다. Acecore는 `src/i18n/source/ja/**/*.json`에 일본어 source를 모으고 페이지별로 CMS에 노출합니다.

반성점은 한 번에 모든 필드를 넣지 않는 것입니다. `config.yml`이 급격히 커지면 리뷰와 유지보수가 어려워집니다. 블로그, 작성자, 태그, 공지, 자주 바뀌는 페이지부터 시작하는 편이 좋습니다.

## 8. preview branch를 맞춘다

Cloudflare Pages preview에서 CMS가 여전히 `main`을 읽으면, preview 화면과 CMS 내용이 어긋납니다. Acecore는 build 전에 `public/admin/runtime-config.js`를 만들고 현재 branch를 주입합니다.

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 9. CMS branch에서 PR 만들기

CMS 저장을 `cms-content`로 보내고 main으로 PR을 열면 리뷰가 가능합니다.

```yaml
on:
  push:
    branches:
      - cms-content
```

merge 방식도 중요합니다. 번역 workflow는 `cms: create ...`, `cms: update ...` 같은 commit subject를 봅니다. squash merge로 subject가 사라지면 자동화가 감지하지 못할 수 있으므로 CMS PR은 merge commit 또는 rebase merge가 적합합니다.

## 10. CMS commit만 번역 트리거

[PR #98](https://github.com/acecore-systems/acecore-net/pull/98)에서는 `--cms-only`를 추가해 push 기반 번역 PR task가 CMS commit에만 반응하도록 했습니다.

```javascript
function isCmsCommitSubject(subject) {
  return /^cms: (create|update|delete) /.test(subject || '')
}
```

`cms:`는 장식이 아니라 workflow 계약입니다.

## 11. `/admin` 전용 CSP

관리 화면은 CDN, GitHub API, OAuth Worker, blob URL에 접속합니다. 그래서 Acecore는 `/admin/*`에 공개 페이지와 다른 CSP를 적용하고 `noindex`도 설정합니다.

## Turnstile은 분리한다

이 글의 이전 버전은 CMS와 Cloudflare Turnstile을 한 글에 섞었습니다. 지금 보면 주제가 흐려졌습니다.

Sveltia CMS는 GitHub backend, OAuth, collections, media, PR 운영의 문제입니다. Turnstile은 폼이나 댓글 API의 bot 대책입니다. 둘은 같은 보안 운영에 기여하지만 레이어가 다릅니다.

## PR과 commit에서 얻은 교훈

- CMS가 바뀌면 기사와 내부 링크도 함께 업데이트해야 합니다.
- OAuth는 나중 일이 아니라 실제 도입 범위입니다.
- 이미지 경로는 업로드 전에 고정해야 합니다.
- `config.yml`은 단계적으로 확장해야 합니다.
- `cms:`는 자동화 계약입니다.
- preview에서 CMS가 읽는 branch를 명확히 해야 합니다.

## 최소 시작점

```text
public/admin/index.html
public/admin/config.yml
public/admin/init.js
public/admin/runtime-config.js
```

그 다음 작성자 relation, 태그 relation, 이미지, source JSON, CMS PR 자동화, 번역 PR task 순서로 넓히면 됩니다.

## 참고 링크

- [Sveltia CMS Getting Started](https://sveltiacms.app/en/docs/start)
- [Sveltia CMS GitHub Backend](https://sveltiacms.app/en/docs/backends/github)
- [Sveltia CMS Internal Media Storage](https://sveltiacms.app/en/docs/media/internal)
- [Sveltia CMS Manual Initialization](https://sveltiacms.app/en/docs/api/initialization)
- [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)

## 정리

Sveltia CMS를 `public/admin`에 두는 것은 쉽습니다. 하지만 운영하려면 저장 branch, OAuth, media folder, source 언어 정책, 번역 workflow, merge 전략까지 정해야 합니다. 이 규칙이 명확하면 Astro 정적 사이트의 가벼움을 유지하면서도 실제로 쓰기 쉬운 콘텐츠 운영을 만들 수 있습니다.
