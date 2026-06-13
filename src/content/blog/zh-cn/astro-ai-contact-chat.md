---
title: '在 Astro 网站中加入咨询 AI 聊天的技术设计'
description: '面向 Astro + Cloudflare Pages 静态网站，使用 OpenAI Responses API 加入咨询 AI 聊天的技术设计。整理 API 边界、站内信息上下文、提示词控制、按 locale 生成 URL、Origin 检查、限流以及安全的 Markdown 链接渲染。'
date: 2026-06-07T12:00
author: gui
tags: ['技術', 'Cloudflare', 'Webサイト', 'AI', 'サービス']
image: https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: 本文要点
  text: 咨询 AI 聊天不是让 AI 自由回答的功能，而是使用公开的网站信息，把访客引导到合适下一步的小型应用。API key、提示词、联系方式和 Markdown 渲染都应通过服务端与允许列表控制。
processFigure:
  title: 咨询 AI 聊天的参考架构
  steps:
    - title: Widget
      description: Astro 侧聊天 UI 只发送问题、当前 locale 和必要的最小历史记录。
      icon: i-lucide-message-circle
      accent: brand
    - title: Function
      description: Cloudflare Pages Function 负责输入验证、Origin 检查、限流和提示词生成。
      icon: i-lucide-shield-check
      accent: amber
    - title: Model
      description: OpenAI Responses API 接收公开站点信息和会话上下文，然后返回回答。
      icon: i-lucide-sparkles
      accent: emerald
    - title: Renderer
      description: 客户端只渲染允许的 Markdown，并引导到内部链接或允许的联系方式。
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: 导入时需要拆分的职责
  before:
    label: 全部混在一起时
    items:
      - 从浏览器直接调用 AI API
      - 站点信息、API key、UI 显示和链接渲染混在一起
      - AI 容易断言价格、合同或交期
      - Markdown 和 URL 容易被直接作为 HTML 输出
  after:
    label: 拆分职责后
    items:
      - API key 和模型调用留在服务端
      - 将公开站点信息作为明确的上下文管理
      - 通过提示词控制回答范围和联系导线
      - Markdown 和 URL 通过允许列表渲染
checklist:
  title: 其他网站导入时的设计检查
  items:
    - text: 将 AI 聊天定义为导线整理，而不是完整替代表单
    - text: 建立服务端 API 边界，不把 API key 暴露给浏览器
    - text: 回答范围限定在公开站点信息
    - text: 明确 AI 不应断言的领域，例如价格、合同、交期和保证
    - text: 定义表单、LINE、邮件、电话的使用规则
    - text: 生成符合 locale 的 URL，避免破坏多语言导线
    - text: 加入 Origin 检查、输入长度限制、历史记录限制和限流
    - text: Markdown 链接的 URL 先 trim 再用允许列表验证
linkCards:
  - href: /contact/
    title: 联系我们
    description: 整理 AI 聊天、LINE、表单和直接联系方式入口的页面。
    icon: i-lucide-message-square
  - href: /blog/cloudflare-pages-security/
    title: Cloudflare Pages 安全设置
    description: 关于静态站点分发中的 CSP 和安全 header 的相关文章。
    icon: i-lucide-shield
  - href: /blog/cms-selection-and-turnstile/
    title: Sveltia CMS 导入指南
    description: 关于为静态网站添加 CMS 编辑界面的相关文章。
    icon: i-lucide-badge-check
faq:
  title: 常见问题
  items:
    - question: 没有 RAG 或向量数据库也能做咨询 AI 聊天吗？
      answer: 小型企业网站通常只要把公开页面的要点结构化后放入提示词即可实用。页面数量或更新频率增加后，再考虑搜索索引或向量数据库。
    - question: OpenAI API key 会暴露在浏览器里吗？
      answer: 不会。浏览器只向 /api/ai-contact 发送问题，OpenAI Responses API 的调用和 API key 管理都在 Cloudflare Pages Function 中完成。
    - question: AI 回答中可以自由输出链接吗？
      answer: 不可以。链接限制为内部路径、当前 origin、acecore.net、官方 LINE，以及必要时的 mailto 和 tel。Markdown URL 会在安全检查前先 trim。
---

把 AI 聊天放到网站上并不难。真正需要设计的是运行方式：AI 可以回答到什么程度、应该把访客引导到哪里、哪些 URL 可以显示，以及如何控制 API 成本。

Acecore 在 Astro + Cloudflare Pages 的静态网站中加入了咨询 AI 聊天。核心实现来自[加入咨询 AI 与 CMS 限定翻译流程的 PR](https://github.com/acecore-systems/acecore-net/pull/98)。之后又在[另一个 PR](https://github.com/acecore-systems/acecore-net/pull/99) 中调整了 AI 回答内 Markdown 链接的安全渲染。链接渲染的细节已整理到[安全渲染 AI 聊天回答中的 Markdown 链接](/blog/ai-chat-markdown-link-safety/)。

本文不是单纯的作业记录，而是把这个实现整理成其他静态网站也能参考的技术设计。即使不是 Astro，也可以采用同样的思路：拆分客户端、API 边界、提示词和渲染器的职责。

## 整体结构

架构可以分为三层。

| 层                   | 职责                                                     |
| -------------------- | -------------------------------------------------------- |
| 聊天 Widget          | UI、输入、当前 locale、必要的最小历史记录、Markdown 渲染 |
| `/api/ai-contact`    | 输入验证、Origin 检查、限流、提示词生成、OpenAI 调用     |
| OpenAI Responses API | 基于站内信息和会话上下文生成回答                         |

浏览器不直接调用 OpenAI API。这样可以避免 API key 暴露，也能在服务端更新模型、提示词和站点上下文，并把输入限制与错误处理集中在一个位置。

在 Astro + Cloudflare Pages 中，这个 API 边界可以实现为 `/api/ai-contact` 的 Pages Function。Next.js 可以使用 Route Handler，Hono 或 Express 也可以用普通 API route。

## 缩小 API 契约

发送给 AI 聊天 API 的信息应尽量少。

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

姓名、邮箱、电话号码、公司名等表单字段不需要送入 AI 聊天。这个聊天入口的职责是帮助访客判断应该看哪个服务、从哪里咨询，而不是收集个人信息。

历史记录也不应无限发送。只保留最近几轮，并限制每条消息的长度，可以避免提示词膨胀并控制 API 成本。

## 在服务端控制输入和模型调用

Cloudflare Pages Function 负责安全边界和执行边界。

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

关键是在调用 AI API 前先缩小并验证输入。长文、无限历史、来自外部网站的连续访问如果直接通过，运营会先于功能本身变得不稳定。

`OPENAI_MODEL` 通过环境变量管理，方便在 preview 或 production 中切换模型。`OPENAI_API_KEY` 只保存在服务端。

Cloudflare Pages 的分发和 CSP 可参考[使用 Cloudflare Pages 实现安全的静态站点分发](/blog/cloudflare-pages-security/)。

## 将站内信息显式作为上下文

这种规模的网站不必一开始就引入向量数据库。先把公开站点信息的要点结构化后放入提示词，通常更容易实现和维护。

可以包含的上下文如下：

- 公司和服务概要
- 每个服务的对象、咨询示例和相关 URL
- FAQ 中已经回答的内容
- 表单、LINE、邮件、电话的使用规则
- AI 不应断言的价格、合同、交期等领域
- 各 locale 的内部 URL

重点不是让模型凭一般知识回答，而是告诉模型「这个网站允许怎么回答」。

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
        name: 'Server operations',
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

当页面数量、更新频率和搜索需求增加后，再考虑 Pagefind、CMS JSON、D1、Vectorize 等检索层。

## 提示词先写规则，而不是只写语气

咨询 AI 聊天的提示词中，比自然语气更重要的是回答范围和禁止事项。

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

常见失败是 AI 为了显得有帮助而说得过于确定。费用、交期、保证等问题应停留在一般说明，并引导到表单，因为这些回答需要人工确认。

## 拆分咨询导线

AI 聊天不应替代表单。联系页面中各导线有清晰职责时更容易运营。

| 导线     | 职责                                       |
| -------- | ------------------------------------------ |
| FAQ      | 在页面内先解决常见问题                     |
| AI 聊天  | 帮助选择服务、咨询方式和相关页面           |
| LINE     | 短问题、教室相关内容、轻量确认             |
| 表单     | 报价、制作咨询、合作、招聘等需要记录的咨询 |
| 直接联系 | 表单后的补充或紧急确认时使用               |

AI 可以把[服务介绍文章](/services/) 这样的概要内容与[联系页面](/contact/) 的具体入口连接起来。这个模式也适用于 BtoB 网站、制作公司、学校和 SaaS 支持页面。

## 不破坏 locale URL

多语言网站中，不仅回答语言要正确，链接 URL 也要符合当前 locale。

例如从英文页面提问时，回答应为英文，服务链接应指向 `/en/services/`。日文页面则使用 `/services/`。

```ts
function localizePath(path: string, locale: Locale) {
  if (locale === 'ja') return path
  return `/${locale}${path}`
}
```

这类处理由服务端 URL 生成函数负责，比只写在提示词里更稳定。翻译运用的基础可参考[用 Sveltia CMS 运营多语言博客的方法](/zh-cn/blog/copilot-translation-pipeline/)。

## 加入 Origin 检查和限流

`/api/ai-contact` 是公开 API，因此至少要有 Origin 检查、输入长度限制、历史记录限制和限流。

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

IP 基础限流可以作为第一层刹车。在 Cloudflare 环境中，可以使用 `CF-Connecting-IP`、`X-Forwarded-For`、`CF-Ray` 等 header。

内存限流不会跨 isolate 或重启持久化，因此只适合作为初始层。访问量增加后，应考虑 Cloudflare WAF、Turnstile、KV、D1 或 Durable Objects。内容更新侧的 CMS 运维可参考[Sveltia CMS 导入指南](/blog/cms-selection-and-turnstile/)；表单与评论的机器人防护应作为另一层处理。

## 用允许列表渲染 Markdown 链接

链接让聊天更有用，但 Markdown 不应直接作为 HTML 输出。客户端渲染器只支持必要的子集即可：

- 段落
- 列表
- 粗体
- 行内代码
- Markdown 链接

链接目标再进一步限制：

- `/services/` 等内部路径
- 当前 origin
- `https://acecore.net`
- 官方 LINE
- 必要时的 `mailto:info@acecore.net`
- 必要时的 `tel:05088902788`

验证前一定要对 URL 执行 `trim()`。AI 可能输出 `[Services]( /services/ )` 这种前后有空格的链接。

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

相比完整实现 Markdown，小而严格的渲染器更容易维护。如果允许更多外部链接，至少也应使用域名允许列表和 `rel="noopener noreferrer"`。

## 分别确认本地、preview 和生产环境

Astro dev 或 preview 与 Cloudflare Pages Functions 环境并不完全相同。没有 `OPENAI_API_KEY` 时，本地应主要确认 UI 的 fallback 和错误显示。

Pages preview 或生产环境中，需要确认：

- `/api/ai-contact` 可以通过 POST 调用
- `OPENAI_API_KEY` 和 `OPENAI_MODEL` 已设置
- 不同 Origin 的请求会被拒绝
- 输入长度和历史件数有限制
- 回答符合当前 locale
- 内部链接使用 locale URL
- AI 不断言报价或合同
- 邮件和电话不会默认显示
- Markdown 链接只在 URL 被允许时转换

不要只问一个问题就结束验证。长文、意外问题、英文页面、要求直接联系方式、询问价格等情况应分开确认。

## 运营中要看的指标

公开后也要看日志和指标。

- API 错误率
- 触发限流的次数
- 每次咨询的平均消息数
- 跳转到表单或 LINE 的次数
- AI 无法回答并引导到表单的次数
- 各 locale 的使用量

如果保存会话内容，需要先定义个人信息处理规则。更安全的第一步是不保存正文，只记录事件数和错误。

## 本次拆分出的范围

本文只聚焦咨询 AI 聊天的技术设计。把服务页面的上下文传递给咨询表单的导线也已实现，已整理到 [从服务 CTA 向问询表单传递上下文的技术设计](/blog/service-cta-contact-prefill/) 中。

- AI 聊天：通过对话整理迷茫，并安全地引导
- 服务 CTA：把访客正在阅读的服务上下文传给表单

分开处理后，文章更容易阅读，之后也更容易互相链接。

## 总结

在静态网站中加入咨询 AI 聊天时，应先设计 API 边界和回答控制，再打磨聊天 UI。

关键决策如下：

- 从 Cloudflare Pages Function 调用 OpenAI，而不是从浏览器调用
- 缩小 endpoint 输入，并限制历史和消息长度
- 在服务端组装站点上下文和 locale URL
- 在提示词中明确 AI 不应断言的范围
- 拆分表单、LINE 和直接联系方式的职责
- 加入 Origin 检查和限流
- Markdown 链接先 trim，再通过允许列表渲染

静态网站也可以实现有用的咨询 AI 聊天。重点不是让 AI 更显眼，而是让访客安全地选择下一步行动。
