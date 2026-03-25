---
title: 'Zoho Mail에서 KAGOYA MAIL로의 이전 가이드 — DNS, 인증, 데이터 감사 실전'
description: 'Zoho Workplace에서 KAGOYA MAIL로의 전체 이전에 대한 실전 가이드. 단계별 절차, DNS 설정, SPF/DKIM 인증, Zoho Workplace 전 서비스의 포괄적 데이터 감사를 다룹니다.'
date: 2026-03-16
author: gui
tags: ['技術', 'メール', 'DNS', 'インフラ']
image: https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&h=400&fit=crop&q=80
processFigure:
  title: 전체 이전 플로우
  steps:
    - title: KAGOYA 설정
      description: 도메인 추가 및 이메일 계정 생성.
      icon: i-lucide-server
    - title: 이메일 데이터 이전
      description: Zoho에서 내보내기 → KAGOYA로 IMAP 가져오기.
      icon: i-lucide-hard-drive-download
    - title: DNS 전환
      description: MX, SPF, DKIM을 KAGOYA로 변경.
      icon: i-lucide-globe
    - title: 인증 테스트
      description: SPF 및 DKIM PASS 확인 후, 송수신 테스트.
      icon: i-lucide-shield-check
    - title: Zoho 데이터 감사
      description: Workplace 전 서비스의 잔여 데이터 확인 및 정리.
      icon: i-lucide-clipboard-check
    - title: Zoho 해약
      description: 구독 해지.
      icon: i-lucide-log-out
callout:
  type: warning
  title: DNS 전환 주의사항
  text: MX 레코드 변경 후, 수시간에서 최대 48시간 동안 메일이 여전히 이전 서버로 배달될 수 있는 기간이 있습니다. Cloudflare로 관리하는 경우, 전환 전에 TTL을 2분으로 단축하여 영향을 최소화하세요.
compareTable:
  title: 설정 변경 전후 비교
  before:
    label: Zoho Workplace Standard
    items:
      - Zoho Mail (30 GB 플랜)
      - WorkDrive / Cliq / Calendar 번들 (Nextcloud 이전 후 미사용)
      - ¥1,440/월 (3계정, 사용자당 과금)
      - SPF는 include:zoho.jp 사용
      - DKIM은 zmail._domainkey 사용
  after:
    label: KAGOYA MAIL Bronze
    items:
      - KAGOYA MAIL (전용 IP 가상 전용 서버)
      - 메일 전용 서버, 계정 수 무제한
      - ¥3,300/월 (연간 계약 시 ¥2,640/월)
      - SPF는 include:kagoya.net 사용
      - DKIM은 kagoya._domainkey 사용
checklist:
  title: 이전 체크리스트
  items:
    - text: KAGOYA에 도메인 추가 및 계정 생성
      checked: true
    - text: Zoho 이메일 데이터를 ZIP으로 내보내기
      checked: true
    - text: KAGOYA에 IMAP 가져오기
      checked: true
    - text: Cloudflare DNS에서 MX 레코드 전환
      checked: true
    - text: SPF 레코드를 kagoya.net으로 변경
      checked: true
    - text: DKIM 레코드를 kagoya._domainkey로 변경
      checked: true
    - text: DMARC 정책 설정
      checked: true
    - text: 송수신 테스트 및 SPF/DKIM PASS 확인
      checked: true
    - text: Zoho Workplace 전 서비스 데이터 감사
      checked: true
    - text: Zoho 구독 해지
      checked: true
faq:
  title: 자주 묻는 질문
  items:
    - question: 이전 중에 메일이 도착하지 않는 기간이 있나요?
      answer: DNS TTL을 짧게 설정해 두면 수 분에서 수 시간 정도입니다. Cloudflare 관리의 경우 전환 전에 TTL을 2분으로 설정하면 영향을 최소화할 수 있습니다. 전환 후 며칠간은 이전 서버도 계속 확인하세요.
    - question: Zoho에서 이메일 데이터를 어떻게 내보내나요?
      answer: Zoho Mail 관리 패널 → 데이터 관리 → 메일함 내보내기에서 계정별로 ZIP 형식으로 내보낼 수 있으며, EML 파일이 포함되어 있습니다.
    - question: SPF 또는 DKIM 중 하나만 설정하면 어떻게 되나요?
      answer: 수신 측 메일 서버가 스팸으로 판정할 확률이 높아집니다. 특히 Gmail은 엄격해져서, SPF와 DKIM 모두 PASS해야 하는 경우가 증가하고 있습니다.
    - question: Zoho Workplace를 해약하면 데이터는 어떻게 되나요?
      answer: 유료 플랜이 만료되면 무료 플랜으로 전환됩니다. 무료 플랜에도 용량 제한이 있으므로, 필요한 데이터는 사전에 내보내야 합니다. 계정 자체를 삭제하면 모든 데이터가 영구 삭제됩니다.
---

Zoho Workplace에서 다른 이메일 서비스로 이전하고 싶지만 DNS와 이메일 인증 설정이 걱정되시나요? 이 실전 가이드에서 그 과정을 안내합니다. Zoho Mail에서 KAGOYA MAIL로의 이전을 예시로, DNS 전환, SPF/DKIM 인증, 기존 서비스의 데이터 감사까지 다룹니다.

## 이런 상황이 해당되시나요?

Zoho Workplace는 Mail, WorkDrive, Cliq, Calendar 등 다양한 서비스를 번들로 제공하는 그룹웨어 제품입니다. 하지만 다음과 같은 상황이 되신 건 아닌가요?

- 이메일 기능만 사용하고 있는데 전체 그룹웨어 비용을 지불하고 있다
- 파일 저장소는 이미 다른 서비스(Nextcloud, Google Drive 등)로 이전 완료
- 사용자당 과금 모델로 인해 팀이 커질수록 부담이 증가한다

이런 경우, 메일 전용 서비스로의 이전이 현실적인 선택지가 됩니다.

## 왜 KAGOYA MAIL인가?

KAGOYA MAIL은 비즈니스용으로 설계된 메일 전용 서비스입니다. 고려할 점은 다음과 같습니다:

- **전용 IP 가상 전용 서버** — WordPress가 함께 있는 공유 호스팅과 달리, 메일 전달률과 안정성이 높음
- **정액제로 계정 수 무제한** — Zoho의 사용자당 과금과 달리 자유롭게 계정 추가 가능
- **국내 서버**로 기업 이용 실적이 풍부하며, SPF/DKIM/DMARC 표준 지원
- IMAP/SMTP 지원으로 기존 메일 클라이언트를 그대로 사용 가능

Bronze 플랜은 ¥3,300/월(연간 계약 시 ¥2,640/월)입니다. Zoho Workplace Standard(3계정 ¥1,440/월)와 비교하면 단순 비용은 높지만, 메일 전용 환경, 전용 IP, 무제한 계정을 고려하면 메일 안정성에 대한 투자로서 검토할 가치가 있습니다.

## STEP 1: 이전 대상 준비

KAGOYA 관리 패널에서 커스텀 도메인을 추가하고 이메일 계정을 생성합니다.

1. **도메인 설정 → 커스텀 도메인 추가**에서 도메인 등록
2. 기본 배달 설정을 "오류로 처리"로 설정(존재하지 않는 주소로의 메일)
3. 필요한 이메일 계정 생성

## STEP 2: Zoho 이메일 데이터 내보내기

Zoho Mail 관리 패널에서 계정별로 이메일 데이터를 내보냅니다.

1. **관리 패널 → 데이터 관리 → 메일함 내보내기**로 이동
2. 대상 계정을 선택하고 내보내기 시작
3. 생성된 ZIP 파일 다운로드

ZIP에는 EML 형식의 이메일 파일이 포함되어 있습니다. 계정 수와 이메일 양에 따라 내보내기에 수십 분이 걸릴 수 있으므로 여유를 가지고 진행하세요.

## STEP 3: IMAP 가져오기

내보낸 EML 파일을 대상 IMAP 서버에 가져옵니다. 수동으로 하면 번거로우므로 Python 스크립트로 자동화하는 것을 추천합니다.

```python
import imaplib
import email
import glob

# KAGOYA IMAP connection
imap = imaplib.IMAP4_SSL("mail-server-name", 993)
imap.login("account-name", "password")
imap.select("INBOX")

# Bulk upload EML files
for eml_path in glob.glob("export/**/*.eml", recursive=True):
    with open(eml_path, "rb") as f:
        msg = f.read()
    imap.append("INBOX", None, None, msg)

imap.logout()
```

## STEP 4: DNS 전환

DNS 레코드를 변경하여 메일 배달 방향을 변경합니다. 이 예에서는 Cloudflare를 사용하지만, DNS 제공업체에 관계없이 설정은 동일합니다.

### MX 레코드

Zoho MX 레코드(`mx.zoho.jp` / `mx2.zoho.jp` / `mx3.zoho.jp`)를 삭제하고 새 메일 서버를 등록합니다. KAGOYA MAIL의 경우:

| 유형 | 이름 | 값 | 우선순위 |
| --- | --- | --- | --- |
| MX | (귀사 도메인) | dmail.kagoya.net | 10 |

### SPF 레코드

```
v=spf1 include:kagoya.net ~all
```

기존의 `include:zoho.jp`를 `include:kagoya.net`으로 변경합니다.

### DKIM 레코드

KAGOYA 관리 패널의 **DKIM 설정**에서 공개키를 취득하여 TXT 레코드로 등록합니다.

| 유형 | 이름 | 값 |
| --- | --- | --- |
| TXT | kagoya.\_domainkey.(귀사 도메인) | v=DKIM1;k=rsa;p=(공개키) |

기존의 `zmail._domainkey`(Zoho) 레코드를 삭제합니다.

### DMARC 레코드

```
v=DMARC1; p=quarantine; rua=mailto:(보고 수신 주소)
```

정책을 `none`에서 `quarantine`으로 업그레이드하여 위조 방지를 강화합니다.

## STEP 5: 송수신 테스트

DNS 전환 후, 반드시 다음 4가지를 확인합니다:

1. **외부에서 수신 가능한가?** — Gmail 등에서 테스트 메일 발송
2. **외부로 발신 가능한가?** — KAGOYA에서 Gmail 등으로 발송
3. **SPF PASS** — 수신 메일 헤더에서 `spf=pass` 확인
4. **DKIM PASS** — 수신 메일 헤더에서 `dkim=pass` 확인

이메일 헤더 검증은 Python으로 자동화할 수 있습니다. 특히 SPF/DKIM PASS 확인은 육안으로 놓치기 쉬우므로 스크립트로 추출하는 것이 더 확실합니다.

```python
import imaplib
import email

imap = imaplib.IMAP4_SSL("mail-server-name", 993)
imap.login("account-name", "password")
imap.select("INBOX")
_, data = imap.search(None, "ALL")

for num in data[0].split()[-3:]:  # Latest 3 emails
    _, msg_data = imap.fetch(num, "(RFC822)")
    msg = email.message_from_bytes(msg_data[0][1])
    auth = msg.get("Authentication-Results", "")
    print(f"Subject: {msg['Subject']}")
    print(f"Auth: {auth[:200]}")
    print()

imap.logout()
```

## STEP 6: 기존 서비스 데이터 감사

Zoho Workplace는 메일 외에도 WorkDrive, Cliq, Calendar, Contacts 등 다양한 서비스를 번들로 제공합니다. 해약 전에 각 서비스에 데이터가 남아 있지 않은지 확인하세요.

### 확인 대상 서비스와 판단 기준

| 서비스 | 확인 사항 |
| --- | --- |
| Zoho Mail | 새 서비스로 데이터가 가져오기 되었는가? |
| Zoho WorkDrive | 스토리지 사용량이 0인가? 휴지통 포함 확인 |
| Zoho Contacts | 연락처 수. 필요 시 CSV/VCF로 내보내기 |
| Zoho Calendar | 남아 있는 이벤트나 알림이 있는가 |
| Zoho Cliq | 채팅 이력 보존이 필요한가 |
| 기타 (Notebook, Writer, Sheet 등) | 작성된 문서가 있는가 |

### WorkDrive 주의사항: 휴지통이 용량을 차지

간과하기 쉬운 문제는 WorkDrive의 휴지통입니다. 우리의 경우, 관리 패널에서 약 45 GB의 스토리지 사용량이 표시되었지만, 폴더를 열면 "항목 없음"이었습니다.

원인: **모든 데이터가 팀 폴더 휴지통에 남아 있었다**. 이전 Nextcloud 이전 시 삭제한 데이터가 휴지통에 계속 남아 있었던 것입니다.

관리 패널의 스토리지 표시에는 휴지통의 데이터가 포함됩니다. "사용 중인 스토리지 ≠ 백업이 필요한 데이터"이므로, 판단하기 전에 휴지통을 확인하세요.

## STEP 7: Zoho 구독 해지

데이터 감사가 완료되고 새 서비스에서의 송수신이 정상적으로 작동하면 해약을 진행합니다.

1. **Zoho Mail 관리 패널 → 구독 관리 → 개요**를 열기
2. **구독 관리** 링크를 클릭하여 Zoho Store로 이동
3. **플랜 변경**을 클릭
4. 페이지 하단의 **구독 해지**를 클릭
5. 이유를 선택하고 **무료 플랜으로 전환**을 확인

"현재 결제 기간 종료 시 자동으로 다운그레이드"가 체크되어 있으면, 기간이 끝날 때까지 유료 플랜 기능을 계속 사용할 수 있으며 그 후 자동으로 무료 플랜으로 전환됩니다. 롤백 안전망을 유지하기 위해, 즉시 삭제하지 않고 무료 플랜에서 잠시 관찰하는 것을 추천합니다.

## 핵심 정리

1. **DNS TTL을 미리 단축**하여 전환 시 영향을 최소화
2. **SPF와 DKIM 모두 필수**. 하나만 있으면 스팸으로 판정될 위험이 높아지며, 특히 Gmail이 엄격
3. **기존 서비스 감사 시 "보이지만 불필요한" 데이터에 주의**. 휴지통과 버전 이력이 조용히 스토리지를 소비
4. **해약 전에 영수증과 청구서를 저장**. 계정 삭제 후에는 취득 불가
5. **"가장 싼 것"이 아니라 "무엇을 분리해야 하는가"를 기준으로 선택**. 이메일은 비즈니스 생명선이며, 전용 환경에 대한 투자는 가치가 있음

이메일 이전은 DNS, 이메일 인증 등 광범위한 영역에 걸쳐 있어 심리적으로 부담스럽습니다. 하지만 결국은 MX, SPF, DKIM, DMARC의 4가지 레코드를 올바르게 설정하는 것에 불과합니다. 이 가이드의 순서에 따라 하나씩 확인하면서 진행하세요.
