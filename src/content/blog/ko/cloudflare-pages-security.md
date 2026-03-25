---
title: 'Cloudflare Pages로 안전한 정적 사이트 배포 달성'
description: 'Cloudflare Pages에서의 정적 사이트 배포와 _headers를 사용한 보안 헤더/CSP 설정에 대한 실전 가이드. Workers에서 Pages로 되돌린 이유도 다룹니다.'
date: 2026-03-15
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ']
image: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop&q=80
processFigure:
  title: 배포 아키텍처 변천
  steps:
    - title: 초기 설정
      description: Cloudflare Pages에서 정적 사이트를 배포.
      icon: i-lucide-cloud
    - title: Workers 이전
      description: 문의 폼 처리를 위해 Workers로 이전.
      icon: i-lucide-server
    - title: Pages로 복귀
      description: 외부 폼 서비스 채택으로 정적 배포로 전환.
      icon: i-lucide-rotate-ccw
    - title: 보안 강화
      description: _headers를 통해 CSP 및 보안 헤더 설정.
      icon: i-lucide-shield-check
callout:
  type: info
  title: Workers vs Pages
  text: Cloudflare Workers는 유연하지만, 정적 사이트의 경우 Pages가 캐시 효율과 배포 간편성에서 뛰어납니다. 서버 사이드 처리가 필요 없다면 Pages를 선택하세요.
faq:
  title: 자주 묻는 질문
  items:
    - question: Cloudflare Pages와 Workers 중 어떤 것을 선택해야 하나요?
      answer: 서버 사이드 처리가 필요 없는 정적 사이트라면 Pages가 최적입니다. CDN 통합이 원활하고 배포가 간단합니다. 폼 처리는 외부 서비스로 대응할 수 있습니다.
    - question: _headers 파일에 어떤 보안 헤더를 설정해야 하나요?
      answer: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy가 필수입니다. CSP는 사이트가 사용하는 외부 리소스에 맞게 조정하세요.
    - question: CSP 설정에서 AdSense와 Analytics를 어떻게 허용하나요?
      answer: script-src에 googletagmanager.com과 googlesyndication.com 도메인을 추가합니다. img-src와 connect-src에서도 관련 도메인을 허용해야 할 수 있습니다.
---

Cloudflare Pages는 정적 사이트 호스팅에 훌륭한 플랫폼입니다. 이 글에서는 실제 배포 구성과 `_headers` 파일을 사용한 보안 설정을 다룹니다.

## 배포 아키텍처: Workers를 떠나 Pages로 돌아온 이유

처음에는 문의 폼의 백엔드 처리에 Cloudflare Workers를 사용할 계획이었습니다. Workers를 사용하면 서버 사이드에서 이메일 전송과 유효성 검사를 할 수 있습니다.

하지만 구현 과정에서 다음과 같은 과제에 직면했습니다:

- **빌드 복잡성**: Astro의 빌드 출력을 Workers를 통해 서빙하려면 추가 설정이 필요
- **디버깅 부담**: 로컬 `wrangler dev`와 프로덕션 간의 동작 차이
- **캐시 제어**: Pages가 Cloudflare CDN과 더 자연스럽게 통합

최종적으로, 문의 폼에 [ssgform.com](https://ssgform.com/)을 외부 서비스로 채택하여 서버 사이드 처리를 완전히 제거했습니다. 이로써 Workers가 불필요해졌고, 순수한 정적 사이트로 Pages에 배포할 수 있게 되었습니다.

## \_headers를 통한 보안 설정

Cloudflare Pages에서는 `public/_headers` 파일로 HTTP 응답 헤더를 지정할 수 있습니다. 아래는 실제 사용하고 있는 설정의 일부입니다.

### Content-Security-Policy (CSP)

CSP는 크로스 사이트 스크립팅(XSS) 공격을 방지하기 위한 핵심 헤더입니다. 화이트리스트 방식으로 허용되는 리소스 출처를 지정합니다.

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://wsrv.nl https://images.unsplash.com data:;
  connect-src 'self' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net;
  form-action https://ssgform.com;
```

핵심 포인트:

- **script-src**: Cloudflare Turnstile(`challenges.cloudflare.com`)과 AdSense를 허용
- **img-src**: 이미지 프록시 wsrv.nl과 Unsplash를 허용
- **form-action**: 폼 전송을 ssgform.com으로만 제한
- **frame-src**: Turnstile iframe과 AdSense 광고 프레임을 허용

### 기타 보안 헤더

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- **X-Content-Type-Options**: MIME 스니핑 방지
- **X-Frame-Options**: iframe 임베딩 방지로 클릭재킹 대책
- **Referrer-Policy**: 크로스 오리진 요청 시 오리진만 전송
- **Permissions-Policy**: 불필요한 브라우저 API(카메라, 마이크, 위치정보)를 비활성화

## 캐시 제어

정적 에셋에는 장기 캐시를, HTML에는 짧은 캐시를 설정합니다.

```text
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=3600
```

Astro가 출력하는 `_astro/` 디렉토리의 파일에는 콘텐츠 해시가 포함되어 있어, `immutable`로 1년간 캐시해도 안전합니다. HTML은 적당한 업데이트 빈도이므로 1시간 캐시로 제한합니다.

## Pages 배포 설정

Cloudflare Pages 프로젝트 설정은 간단합니다:

| 설정 | 값 |
| --- | --- |
| 빌드 명령 | `npx astro build` |
| 출력 디렉토리 | `dist` |
| Node.js 버전 | 22 |

GitHub 리포지토리를 연결하면 `main` 브랜치에 push할 때마다 자동 배포됩니다. PR별로 프리뷰 배포도 자동 생성되어 리뷰가 원활해집니다.

## 정리

핵심은 "정말로 서버 사이드 처리가 필요한가?"를 스스로 묻는 것입니다. 외부 서비스를 활용하여 Workers를 제거함으로써 배포와 보안 관리 모두 간소화되었습니다. `_headers`를 통한 CSP 설정은 초기 작업에 노력이 필요하지만, 한 번 작성하면 전 페이지에 적용되어 비용 대비 효과가 높은 보안 대책입니다.
