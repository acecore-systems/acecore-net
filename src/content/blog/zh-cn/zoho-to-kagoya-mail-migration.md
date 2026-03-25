---
title: '从 Zoho Mail 迁移到 KAGOYA MAIL 的实践指南 ― DNS·认证·数据清理'
description: '从 Zoho Workplace 迁移到 KAGOYA MAIL 的步骤、DNS 设置、SPF/DKIM 认证、Zoho Workplace 整体数据清理的实践记录。'
date: 2026-03-16
author: gui
tags: ['技術', 'メール', 'DNS', 'インフラ']
image: https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&h=400&fit=crop&q=80
processFigure:
  title: 迁移工作的整体流程
  steps:
    - title: KAGOYA 准备
      description: 添加域名·创建邮箱账号。
      icon: i-lucide-server
    - title: 邮件数据迁移
      description: 从 Zoho 导出 → IMAP 导入到 KAGOYA。
      icon: i-lucide-hard-drive-download
    - title: DNS 切换
      description: 将 MX·SPF·DKIM 修改为 KAGOYA 配置。
      icon: i-lucide-globe
    - title: 认证测试
      description: 确认 SPF·DKIM PASS，进行收发测试。
      icon: i-lucide-shield-check
    - title: Zoho 数据清理
      description: 对 Workplace 全部服务的残留数据进行取舍。
      icon: i-lucide-clipboard-check
    - title: Zoho 解约
      description: 取消订阅。
      icon: i-lucide-log-out
callout:
  type: warning
  title: DNS 切换时的注意事项
  text: 修改 MX 记录后，会有数小时到最长48小时的时间内邮件仍会送达旧服务器。如果使用 Cloudflare 管理，在切换前将 TTL 缩短至2分钟可以将影响降到最低。
compareTable:
  title: 迁移前后的架构对比
  before:
    label: Zoho Workplace Standard
    items:
      - Zoho Mail（30GB 方案）
      - WorkDrive / Cliq / Calendar 等捆绑（迁移到 Nextcloud 后未使用）
      - 月费 ¥1,440（3用户·按用户计费）
      - SPF 为 include:zoho.jp
      - DKIM 为 zmail._domainkey
  after:
    label: KAGOYA MAIL 铜牌方案
    items:
      - KAGOYA MAIL（虚拟专用·独立IP）
      - 邮件专用服务器，用户数无限制
      - 月费 ¥3,300（年付 ¥2,640）
      - SPF 为 include:kagoya.net
      - DKIM 为 kagoya._domainkey
checklist:
  title: 迁移检查清单
  items:
    - text: 在 KAGOYA 添加域名·创建账号
      checked: true
    - text: 导出 Zoho 邮件数据为 ZIP
      checked: true
    - text: IMAP 导入到 KAGOYA
      checked: true
    - text: 在 Cloudflare DNS 切换 MX 记录
      checked: true
    - text: 将 SPF 记录修改为 kagoya.net
      checked: true
    - text: 将 DKIM 记录修改为 kagoya._domainkey
      checked: true
    - text: 配置 DMARC 策略
      checked: true
    - text: 收发测试·确认 SPF/DKIM PASS
      checked: true
    - text: Zoho Workplace 全部服务数据清理
      checked: true
    - text: 取消 Zoho 订阅
      checked: true
faq:
  title: 常见疑问
  items:
    - question: 邮件迁移过程中会有收不到邮件的期间吗？
      answer: 如果事先将 DNS 的 TTL 设置得足够短，影响时间大约在几分钟到几小时。使用 Cloudflare 管理的情况下，将 TTL 设为2分钟后再切换可以将影响降到最低。旧服务器方面也建议持续检查几天。
    - question: Zoho 的邮件数据如何导出？
      answer: 通过 Zoho Mail 管理画面 → 数据管理 → 邮箱导出，可以按账号以 ZIP 格式导出。文件中包含 EML 格式的邮件。
    - question: 如果不同时配置 SPF 和 DKIM 会怎样？
      answer: 收件方邮件服务器将邮件判定为垃圾邮件的概率会增加。特别是 Gmail 越来越严格，越来越多的情况要求 SPF 和 DKIM 都 PASS。
    - question: 取消 Zoho Workplace 后数据会怎样？
      answer: 付费计划到期后会降级为免费计划。免费计划也有存储限制，因此应提前导出必要的数据。如果删除账号本身，所有数据将丢失。
---

想从 Zoho Workplace 迁移到其他邮件服务，但担心 DNS 和邮件认证的设置——本文正是为这样的读者准备的实践迁移指南。以从 Zoho Mail 迁移到 KAGOYA MAIL 为例，解说 DNS 切换、SPF/DKIM 认证、旧服务数据清理的完整步骤。

## 您是否遇到了这样的情况？

Zoho Workplace 是一个捆绑了 Mail、WorkDrive、Cliq、Calendar 等多种服务的协作套件。但您是否遇到了以下情况：

- 只使用了邮件功能，却在为整个协作套件的费用买单
- 文件存储已经迁移到了其他服务（Nextcloud、Google Drive 等）
- 每增加一个用户就增加费用的定价模式成为负担

在这种情况下，迁移到邮件专用服务是一个可选方案。

## 为什么选择 KAGOYA MAIL

KAGOYA MAIL 是面向企业的邮件专用服务。在考虑迁移目标时的要点如下：

- **邮件专用的虚拟专用服务器·独立IP** — 不与 WordPress 等 Web 服务器共享，邮件的到达率和稳定性更高
- **用户数无限制的固定费用** — 不像 Zoho 那样按用户计费，可以无顾虑地添加账号
- **国内服务器**，在企业使用方面有丰富的实绩，标准支持 SPF/DKIM/DMARC
- 支持 IMAP/SMTP，现有的邮件客户端可以直接使用

铜牌方案月费 ¥3,300（年付 ¥2,640）。与 Zoho Workplace Standard（3用户月费 ¥1,440）相比，单纯的费用确实增加了，但考虑到邮件专用环境·独立IP·用户数无限制的配置，作为对邮件可靠性的投资值得考虑。

## STEP 1：准备迁移目标

在 KAGOYA 控制面板中添加自有域名并创建邮箱账号。

1. **域名设置 → 添加自有域名**中注册域名
2. 默认投递设置为"按错误处理"（对不存在的地址的处理方式）
3. 创建所需的邮箱账号

## STEP 2：导出 Zoho 邮件数据

从 Zoho Mail 的管理画面按账号导出邮件数据。

1. 进入**管理画面 → 数据管理 → 邮箱导出**
2. 选择目标账号开始导出
3. ZIP 文件生成后下载

ZIP 中包含 EML 格式的邮件文件。根据账号数和邮件量，可能需要几十分钟，请留出充足时间。

## STEP 3：IMAP 导入

将导出的 EML 文件导入到迁移目标的 IMAP 服务器。手动操作很麻烦，推荐使用 Python 脚本自动化。

```python
import imaplib
import email
import glob

# KAGOYA IMAP 连接
imap = imaplib.IMAP4_SSL("メールサーバー名", 993)
imap.login("アカウント名", "パスワード")
imap.select("INBOX")

# 批量上传 EML 文件
for eml_path in glob.glob("export/**/*.eml", recursive=True):
    with open(eml_path, "rb") as f:
        msg = f.read()
    imap.append("INBOX", None, None, msg)

imap.logout()
```

## STEP 4：DNS 切换

为了切换邮件投递目标，需要修改 DNS 记录。以下以 Cloudflare 为例，但在其他 DNS 服务中设置的内容相同。

### MX 记录

删除 Zoho 的 MX 记录（`mx.zoho.jp` / `mx2.zoho.jp` / `mx3.zoho.jp`），注册迁移目标的邮件服务器。KAGOYA MAIL 的情况如下。

| 类型 | 名称               | 值               | 优先级 |
| ---- | ------------------ | ---------------- | ------ |
| MX   | （您的域名） | dmail.kagoya.net | 10     |

### SPF 记录

```
v=spf1 include:kagoya.net ~all
```

将旧的 `include:zoho.jp` 修改为 `include:kagoya.net`。

### DKIM 记录

从 KAGOYA 控制面板的 **DKIM 设置**获取公钥，作为 TXT 记录注册。

| 类型 | 名称                                  | 值                         |
| ---- | ------------------------------------- | -------------------------- |
| TXT  | kagoya.\_domainkey.（您的域名） | v=DKIM1;k=rsa;p=（公钥） |

删除旧的 `zmail._domainkey`（Zoho 用）。

### DMARC 记录

```
v=DMARC1; p=quarantine; rua=mailto:（报告接收地址）
```

将策略从 `none` 提升到 `quarantine`，可以加强防伪冒保护。

## STEP 5：收发测试

DNS 切换后，务必确认以下4点。

1. **能否从外部接收** — 从 Gmail 等发送测试
2. **能否向外部发送** — 从 KAGOYA 向 Gmail 等发送
3. **SPF PASS** — 在收到的邮件头中确认 `spf=pass`
4. **DKIM PASS** — 在收到的邮件头中确认 `dkim=pass`

邮件头的检查可以用 Python 自动化。特别是 SPF/DKIM 的 PASS 确认，目视容易遗漏，用脚本提取更可靠。

```python
import imaplib
import email

imap = imaplib.IMAP4_SSL("メールサーバー名", 993)
imap.login("アカウント名", "パスワード")
imap.select("INBOX")
_, data = imap.search(None, "ALL")

for num in data[0].split()[-3:]:  # 最新3封
    _, msg_data = imap.fetch(num, "(RFC822)")
    msg = email.message_from_bytes(msg_data[0][1])
    auth = msg.get("Authentication-Results", "")
    print(f"Subject: {msg['Subject']}")
    print(f"Auth: {auth[:200]}")
    print()

imap.logout()
```

## STEP 6：旧服务的数据清理

Zoho Workplace 除邮件外还捆绑了 WorkDrive、Cliq、Calendar、Contacts 等众多服务。在解约前，请确认各服务中是否有残留数据。

### 需要确认的服务和判断标准

| 服务                             | 确认要点                                  |
| -------------------------------- | ----------------------------------------- |
| Zoho Mail                            | 是否已导入到迁移目标                      |
| Zoho WorkDrive                       | 存储使用量是否为0。包括回收站也要确认   |
| Zoho Contacts                        | 联系人数量。如有需要可导出 CSV/VCF  |
| Zoho Calendar                        | 是否有日程安排或提醒                      |
| Zoho Cliq                            | 聊天记录是否需要保留                      |
| 其他（Notebook、Writer、Sheet 等） | 是否有创建的文档                    |

### WorkDrive 的陷阱：回收站占用存储空间

容易被忽视的是 WorkDrive 的回收站。例如在我们的案例中，管理画面显示存储使用量约45GB，但打开文件夹后显示"没有项目"。

原因是**所有数据留在了团队文件夹的回收站中**。之前迁移到 Nextcloud 时删除的数据，作为回收站一直保留着。

管理画面的存储显示包含回收站中的数据。"占用了空间 = 需要备份"并不一定成立，请先确认回收站的内容再做判断。

## STEP 7：取消 Zoho 订阅

数据清理完成，迁移目标的收发确认无问题后，即可进入解约流程。

1. 打开 **Zoho Mail 管理画面 → 订阅管理 → 概要**
2. 通过**订阅管理**链接进入 Zoho Store
3. 点击**变更计划**
4. 点击页面底部的**取消订阅**
5. 选择原因后确认**变更为免费计划**

如果勾选了"在当前计费周期结束时自动降级"，则在当前周期结束前仍可使用付费计划功能，之后自动转为免费计划。为应对万一的回退需求，建议不要立即删除，而是在免费计划下设置一个观察期。

## 总结

1. **提前缩短 DNS 的 TTL**，可以将切换时的影响降到最低
2. **SPF 和 DKIM 都必须配置**。只配置其中一个，在 Gmail 等服务中被判定为垃圾邮件的风险会增加
3. **旧服务数据清理要注意"看得到但不需要"的情况**。回收站和版本历史可能占用了存储空间
4. **在解约前保存发票和收据**。删除账号后将无法获取
5. **不是因为"便宜"，而是根据"应该分离什么"来判断**。邮件是业务的生命线，值得投资专用环境

邮件服务迁移涉及 DNS 和邮件认证等较广的范围，心理障碍较高。但实际上要做的就是正确设置 MX、SPF、DKIM、DMARC 这4种记录。请参考本文的步骤，逐一确认并推进。
