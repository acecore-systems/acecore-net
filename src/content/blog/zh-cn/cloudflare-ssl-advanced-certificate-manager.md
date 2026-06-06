---
title: 'Cloudflare 过去的付费 SSL 选项到底是什么：从 Dedicated SSL 到 Advanced Certificate Manager'
description: 'Cloudflare 过去的付费选项“Dedicated SSL Certificates（专用 SSL 证书）”在 2021 年升级并更名为“Advanced Certificate Manager（ACM）”。本文说明它与免费 Universal SSL 的区别，以及何时需要 ACM。'
date: 2026-03-31T00:00
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ', 'インフラ']
image: /uploads/acecore-generated/security-operations.webp
compareTable:
  title: Universal SSL vs Advanced Certificate Manager
  before:
    label: Universal SSL（免费）
    items:
      - 仅覆盖根域名 + 一级子域名
      - 无法选择 CA、有效期、加密套件
      - '*.example.com 可用，但 dev.staging.example.com 不在覆盖范围'
      - 证书 CN 中可能包含 Cloudflare 品牌
  after:
    label: Advanced Certificate Manager（付费，$10/月/区域）
    items:
      - 支持多级子域名，最多可指定 50 个主机名
      - 可选择 CA（Let's Encrypt / Google Trust Services 等）
      - 可将证书有效期设置为 14 天到 365 天
      - 'CN 可使用自有域名，隐藏 Cloudflare 品牌'
callout:
  type: info
  title: 更名背景
  text: 旧称“Dedicated SSL Certificates（专用 SSL 证书）”在 2021 年升级为 Advanced Certificate Manager（ACM）。不仅是改名，还大幅扩展了多级子域名支持、CA 选择和有效期控制等能力。
faq:
  title: 常见问题
  items:
    - question: Universal SSL 可以使用 *.example.com 通配符证书吗？
      answer: 可以，但仅覆盖一级子域名（如 www.example.com）。对于 dev.staging.example.com 这类二级及以上子域名不生效，会出现证书错误。这种情况下需要 ACM。
    - question: 免费套餐也能使用 Advanced Certificate Manager 吗？
      answer: 可以。即使是 Cloudflare 免费套餐，也可通过购买 ACM 附加组件（$10/月/区域）来使用，无需升级到更高套餐。
    - question: 什么情况下 Universal SSL 就足够了？
      answer: 对多数个人网站和中小企业网站来说，Universal SSL 已足够。如果只使用根域名和 www 这类一级子域名，则不需要 ACM。
    - question: 启用 ACM 后 Universal SSL 会怎样？
      answer: Universal SSL 与 ACM 可以共存。对于同一子域名，会优先使用 ACM 证书。
linkCards:
  - href: https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/
    title: Advanced Certificate Manager 文档
    description: Cloudflare 官方 ACM 配置指南
    icon: i-lucide-file-text
  - href: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/
    title: Universal SSL 限制
    description: Universal SSL 未覆盖场景的官方文档
    icon: i-lucide-alert-circle
  - href: https://www.cloudflare.com/ja-jp/application-services/products/advanced-certificate-manager/
    title: Advanced Certificate Manager 产品页
    description: ACM 功能列表与购买方式（日文）
    icon: i-lucide-shield-check
---

“Cloudflare 以前那个付费 SSL 选项叫什么来着？”——不少人都问过这个问题。本文将整理它的真实身份，以及现在的名称和功能。

## 结论：从“Dedicated SSL”到“Advanced Certificate Manager（ACM）”

Cloudflare 过去的付费 SSL 选项名称是 **Dedicated SSL Certificates（专用 SSL 证书）**。它在 **2021 年升级并更名为“Advanced Certificate Manager（ACM）”**。

价格与当时相同，仍为每个区域（域名）**每月 $10**。

---

## 为什么会改名

“Dedicated SSL”时代的核心是“为该域名单独签发证书”。免费 Universal SSL 会与其他站点共享证书，而专用证书的卖点是可以使用独立的通用名称（CN）。

迁移到 **Advanced Certificate Manager** 后，新增了以下能力，名称也更强调“管理（Manager）”特性：

- **支持多级子域名**：可保护 `dev.staging.example.com` 这类二级及以上子域名
- **可选择 CA**：可在 Let's Encrypt、Google Trust Services 等之间选择
- **可指定有效期**：可在 14 天到 365 天范围内设置
- **最多 50 个主机名**：一张证书可覆盖多个主机名
- **Total TLS**：自动保护区域内所有已代理子域名

---

## 与 Universal SSL 的区别

Cloudflare 提供免费的 **Universal SSL**，对大多数网站来说已经足够实现 HTTPS。但它仍有一些限制。

### Universal SSL 无法覆盖的情况

```
# 这些可被 Universal SSL 覆盖
example.com
www.example.com
blog.example.com

# 这些不在 Universal SSL 覆盖范围内（需要 ACM）
dev.staging.example.com
api.v2.example.com
deep.sub.domain.example.com
```

`*.example.com` 通配符是有效的，但**仅对一级子域名生效**。像 `*.staging.example.com` 这样的多级模式不被支持。

### 是否显示 Cloudflare 品牌

在 Universal SSL 中，证书 CN 可能包含 `sni.cloudflaressl.com` 之类的 Cloudflare 域名。使用 ACM 时，CN 会变成你的自有域名，Cloudflare 品牌会被隐藏。

---

## 需要 ACM 的场景

如果符合以下任一情况，请考虑启用 ACM：

1. **你在使用多级子域名**  
   例如希望为 `api.staging.example.com`、`dev.app.example.com` 这类二级及以上子域名启用 SSL。

2. **希望证书 CN 使用自有域名**  
   例如希望从证书中去除 Cloudflare 品牌（常见于企业站点和 B2B 服务）。

3. **希望指定 CA 或有效期**  
   例如安全策略要求使用特定 CA，或希望使用短周期证书（如 14 天）。

4. **希望用 Total TLS 一次性保护全部子域名**  
   希望自动为区域内所有已代理子域名配置证书保护。

---

## 购买与启用步骤

可在 Cloudflare 控制台通过几个步骤完成：

1. 打开 Cloudflare 控制台中的目标域名
2. 进入 **SSL/TLS** → **Edge Certificates**
3. 在 **Advanced Certificate Manager** 区域点击 **Enable**
4. 确认并购买订阅（$10/月）
5. 创建证书并添加要保护的主机名

若要启用 Total TLS，只需在同一页面的 **Total TLS** 区域切换为 On。

---

## 总结

| 项目          | Universal SSL（免费） | Advanced Certificate Manager（$10/月/区域） |
| ------------- | --------------------- | ------------------------------------------- |
| 多级子域名    | ✗                     | ✓                                           |
| CA 选择       | ✗                     | ✓                                           |
| 有效期设置    | ✗                     | ✓                                           |
| CN 为自有域名 | △                     | ✓                                           |
| Total TLS     | ✗                     | ✓                                           |
| 适用场景      | 个人 / 常规网站       | 企业 / 复杂子域名结构                       |

Cloudflare“过去的付费 SSL 选项”就是 **Advanced Certificate Manager（原 Dedicated SSL Certificates）**。当免费 Universal SSL 不够用时——尤其是需要保护多级子域名或精细控制证书时——它是一个有效选择。
