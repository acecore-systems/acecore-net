---
title: '예전에 유료였던 Cloudflare SSL 옵션의 정체 — Dedicated SSL에서 Advanced Certificate Manager로'
description: 'Cloudflare에서 과거 유료 옵션이었던 "Dedicated SSL Certificates(전용 SSL 인증서)"는 2021년에 "Advanced Certificate Manager(ACM)"로 기능 확장 및 명칭 변경되었습니다. 무료 Universal SSL과의 차이와 ACM이 필요한 경우를 설명합니다.'
date: 2026-03-31T00:00
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ', 'インフラ']
image: https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop&q=80
compareTable:
  title: Universal SSL vs Advanced Certificate Manager
  before:
    label: Universal SSL(무료)
    items:
      - 루트 도메인 + 1단계 서브도메인만 커버
      - CA, 유효기간, 암호 스위트 선택 불가
      - '*.example.com은 가능하지만 dev.staging.example.com은 대상 아님'
      - 인증서 CN에 Cloudflare 브랜드가 포함될 수 있음
  after:
    label: Advanced Certificate Manager(유료, $10/월/존)
    items:
      - 다단계 서브도메인 지원, 최대 50개 호스트명 지정 가능
      - CA 선택 가능(Let's Encrypt / Google Trust Services 등)
      - 유효기간을 14일~365일로 설정 가능
      - 'CN을 자체 도메인으로 설정할 수 있어 Cloudflare 브랜드가 숨겨짐'
callout:
  type: info
  title: 명칭 변경 배경
  text: 구명칭 "Dedicated SSL Certificates(전용 SSL 인증서)"는 2021년에 Advanced Certificate Manager(ACM)로 개편되었습니다. 단순한 이름 변경이 아니라 다단계 서브도메인 지원, CA 선택, 유효기간 지정 등 기능이 크게 확장되었습니다.
faq:
  title: 자주 묻는 질문
  items:
    - question: Universal SSL에서 *.example.com 와일드카드 인증서를 사용할 수 있나요?
      answer: 사용할 수 있지만 커버 범위는 www.example.com 같은 1단계 서브도메인뿐입니다. dev.staging.example.com처럼 2단계 이상 서브도메인에는 적용되지 않아 인증서 오류가 발생합니다. 이 경우 ACM이 필요합니다.
    - question: Advanced Certificate Manager를 무료 플랜에서도 쓸 수 있나요?
      answer: 네. Cloudflare 무료 플랜에서도 ACM 애드온($10/월/존)을 추가 구매하면 사용할 수 있습니다. 상위 플랜 업그레이드는 필요 없습니다.
    - question: Universal SSL만으로 충분한 경우는 언제인가요?
      answer: 대부분의 개인 사이트와 중소기업 사이트는 Universal SSL로 충분합니다. 루트 도메인과 www 같은 1단계 서브도메인만 사용한다면 ACM은 필요 없습니다.
    - question: ACM을 활성화하면 Universal SSL은 어떻게 되나요?
      answer: Universal SSL과 ACM은 공존할 수 있습니다. 같은 서브도메인에 대해서는 ACM 인증서가 우선 적용됩니다.
linkCards:
  - href: https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/
    title: Advanced Certificate Manager 문서
    description: Cloudflare 공식 ACM 설정 가이드
    icon: i-lucide-file-text
  - href: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/
    title: Universal SSL 제한 사항
    description: Universal SSL이 커버하지 않는 경우에 대한 공식 문서
    icon: i-lucide-alert-circle
  - href: https://www.cloudflare.com/ja-jp/application-services/products/advanced-certificate-manager/
    title: Advanced Certificate Manager 제품 페이지
    description: ACM 기능 목록과 구매 방법(일본어)
    icon: i-lucide-shield-check
---

“Cloudflare에 예전에 있던 유료 SSL 옵션, 이름이 뭐였지?”라고 궁금했던 분이 많을 것입니다. 이 글에서 그 정체와 현재 명칭/기능을 정리합니다.

Cloudflare Pages에서의 정적 사이트 배포와 CSP 구현은 [Cloudflare Pages로 구현하는 안전한 정적 사이트 배포](/blog/cloudflare-pages-security/)도 참고하세요.

## 결론: “Dedicated SSL” → “Advanced Certificate Manager(ACM)”

Cloudflare에서 과거 유료였던 SSL 옵션의 이름은 **Dedicated SSL Certificates(전용 SSL 인증서)**입니다. 이는 **2021년에 “Advanced Certificate Manager(ACM)”로 개편 및 리브랜딩**되었습니다.

가격은 당시와 동일하게 존(도메인)당 **월 $10**입니다.

---

## 왜 이름이 바뀌었나

“Dedicated SSL” 시절에는 말 그대로 “해당 도메인 전용 인증서를 발급”하는 기능에 초점이 맞춰져 있었습니다. 무료 Universal SSL이 여러 사이트와 인증서를 공유하는 반면, 전용 인증서는 독자적인 공통 이름(CN)을 가질 수 있다는 점이 장점이었습니다.

**Advanced Certificate Manager**로 전환되면서 아래 기능이 추가되었고, 이름도 “관리(Manager)” 측면을 강조하게 되었습니다.

- **다단계 서브도메인 지원**: `dev.staging.example.com` 같은 2단계 이상 서브도메인 보호 가능
- **CA 선택**: Let's Encrypt, Google Trust Services 등에서 선택 가능
- **유효기간 지정**: 14일~365일 범위로 설정 가능
- **최대 50개 호스트명**: 하나의 인증서로 여러 호스트명 커버
- **Total TLS**: 존 내 모든 프록시된 서브도메인을 자동 보호

---

## Universal SSL과의 차이

Cloudflare에는 무료로 사용할 수 있는 **Universal SSL**이 있어 대부분의 사이트는 이것만으로 HTTPS를 구현할 수 있습니다. 다만 몇 가지 제한이 있습니다.

### Universal SSL이 커버하지 못하는 경우

```
# Universal SSL로 커버 가능
example.com
www.example.com
blog.example.com

# Universal SSL 대상 외(ACM 필요)
dev.staging.example.com
api.v2.example.com
deep.sub.domain.example.com
```

`*.example.com` 와일드카드는 유효하지만, **적용되는 범위는 1단계 서브도메인만**입니다. `*.staging.example.com` 같은 다단계에는 대응하지 않습니다.

### Cloudflare 브랜드 노출 여부

Universal SSL에서는 인증서 CN(공통 이름)에 `sni.cloudflaressl.com` 같은 Cloudflare 도메인이 포함될 수 있습니다. ACM을 사용하면 CN이 자체 도메인이 되어 Cloudflare 브랜드가 숨겨집니다.

---

## ACM이 필요한 경우

아래 중 하나라도 해당하면 ACM 도입을 검토하세요.

1. **다단계 서브도메인을 사용 중**  
   `api.staging.example.com`, `dev.app.example.com` 등 2단계 이상 서브도메인에 SSL을 적용해야 하는 경우.

2. **인증서 CN을 자체 도메인으로 하고 싶은 경우**  
   인증서에서 Cloudflare 브랜드를 제외하고 싶은 경우(주로 기업 사이트/B2B 서비스).

3. **CA나 유효기간을 지정하고 싶은 경우**  
   보안 정책상 특정 CA 사용 의무가 있거나, 단기 인증서(14일 등)를 사용하고 싶은 경우.

4. **Total TLS로 모든 서브도메인을 일괄 보호하고 싶은 경우**  
   존 내 모든 프록시된 서브도메인을 자동으로 인증서 보호하고 싶은 경우.

---

## 구매 및 활성화 절차

Cloudflare 대시보드에서 몇 단계로 활성화할 수 있습니다.

1. Cloudflare 대시보드에서 대상 도메인을 연다
2. **SSL/TLS** → **Edge Certificates** 선택
3. **Advanced Certificate Manager** 섹션에서 **Enable** 클릭
4. 구독($10/월) 확인 후 구매
5. 인증서를 생성하고 보호할 호스트명을 추가

Total TLS를 활성화하려면 같은 Edge Certificates 페이지의 **Total TLS** 섹션을 On으로 바꾸면 됩니다.

---

## 요약

| 항목 | Universal SSL(무료) | Advanced Certificate Manager($10/월/존) |
|---|---|---|
| 다단계 서브도메인 | ✗ | ✓ |
| CA 선택 | ✗ | ✓ |
| 유효기간 지정 | ✗ | ✓ |
| CN이 자체 도메인 | △ | ✓ |
| Total TLS | ✗ | ✓ |
| 용도 | 개인/일반 사이트 | 기업/복잡한 서브도메인 구성 |

Cloudflare의 “예전에 유료였던 SSL 옵션”은 **Advanced Certificate Manager(구 Dedicated SSL Certificates)**입니다. 무료 Universal SSL로 부족한 경우—특히 다단계 서브도메인 보호와 인증서 세부 제어가 필요한 경우—유효한 선택지입니다.
