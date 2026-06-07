---
title: 'Sveltia CMS 导入指南'
description: '总结在 Astro 等静态网站中导入 Sveltia CMS 的方法，涵盖 GitHub backend、OAuth Worker、图片上传、多语言运维、CMS 专用 PR 流程以及实际修正中得到的经验。'
date: 2026-06-07T16:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'CMS', 'Astro', 'Cloudflare', 'セキュリティ']
image: /uploads/acecore-generated/blog-cms-selection-and-turnstile.webp
processFigure:
  title: Sveltia CMS 导入流程
  description: 为静态网站加入 CMS 时，应把管理界面、认证、可编辑内容、媒体文件和 PR 运维分开设计。
  steps:
    - title: 放置管理界面
      description: 在 public/admin 下放置 index.html 与 config.yml，并加载 Sveltia CMS。
      icon: i-lucide-layout
      accent: brand
    - title: 配置 GitHub backend
      description: 先确定 repo、branch、OAuth Worker 与 CMS commit message。
      icon: i-lucide-git-branch
      accent: emerald
    - title: 限定编辑范围
      description: 只把博客、作者、标签、日语 source JSON 等需要 CMS 编辑的文件做成 collection。
      icon: i-lucide-file-text
      accent: amber
    - title: 自动化运维
      description: 将 cms-content 分支、CMS 编辑 PR 与翻译 PR task 连接起来，并与普通开发分离。
      icon: i-lucide-git-pull-request
      accent: slate
compareTable:
  title: 导入 CMS 前后的差异
  before:
    label: 直接编辑 Markdown
    items:
      - 只有熟悉 GitHub 或编辑器的人容易更新
      - 图片路径、作者 ID、标签名容易手写出错
      - 日语 source 与翻译文件的修改范围容易混在一起
      - preview 环境可能仍然读取 main 的内容
  after:
    label: 使用 Sveltia CMS 编辑
    items:
      - 可以在浏览器表单中编辑 Markdown 与 JSON
      - relation、image、select 减少无效值
      - 只有 CMS commit 会触发翻译 PR task
      - runtime config 可以在 preview 与 production 间切换 CMS branch
callout:
  type: note
  title: 本文前提
  text: Sveltia CMS 是在浏览器中运行的 CMS 应用，通过 Git backend 编辑仓库中的 Markdown 与 JSON。本文以 Acecore 官网为例，但思路可以迁移到很多 Astro 静态网站。
checklist:
  title: 导入检查清单
  items:
    - text: 在 public/admin/index.html 中加载 Sveltia CMS
      checked: true
    - text: 在 public/admin/config.yml 中定义 GitHub backend 与 collections
      checked: true
    - text: 多人编辑时使用 OAuth Worker
      checked: true
    - text: 将 media_folder 与 public_folder 对齐到 Astro 的 public 目录
      checked: true
    - text: 决定 CMS commit 如何触发翻译或发布流程
      checked: true
faq:
  title: 常见问题
  items:
    - question: Sveltia CMS 适合什么网站？
      answer: 适合把 Markdown 或 JSON 放在仓库中的静态网站，例如 Astro、Hugo、VitePress。不需要额外数据库，也能加上 CMS 编辑界面。
    - question: 只用 GitHub Personal Access Token 可以吗？
      answer: 可以，但如果是多人或非工程师使用，OAuth Worker 更安全也更容易说明。Acecore 使用 Cloudflare Worker 作为 OAuth 客户端，并设置到 backend.base_url。
    - question: 多语言网站应该让所有语言都能在 CMS 中编辑吗？
      answer: 小团队更适合只在 CMS 中编辑日语 source，再通过 PR 更新翻译。把所有语言都暴露给 CMS，会让审核和旧翻译检测变难。
---

Sveltia CMS 适合在静态网站上追加一个编辑界面，而不需要把内容迁移到外部数据库。本文基于 Acecore 的 Astro 网站，整理导入步骤，以及在后续 PR 和 commit 中发现并修正的运维问题。

标题故意保持简单：**Sveltia CMS 导入指南**。这不是 CMS 对比文章，而是给想在自己的网站中使用 Sveltia CMS 的人看的实用笔记。

## Sveltia CMS 适合的场景

Sveltia CMS 不是拥有独立数据库和内容 API 的 CMS。它是一个在浏览器中运行的单页管理应用，通过 GitHub backend 编辑仓库内的文件。

适合以下情况：

- 网站内容以 Markdown 或 JSON 保存在仓库中
- 希望文章、作者、标签、页面文案都能以 Git diff 形式审核
- 不想增加数据库或独立管理后台
- 图片可以保存在 `public/uploads` 等仓库目录中
- CMS 保存后仍希望通过 Pull Request 确认再上线

如果需要复杂权限、预约发布、大量媒体资产管理或实时数据编辑，完整的 headless CMS 或自定义后台会更合适。

## 整体架构

Acecore 的 Sveltia CMS 结构如下：

```text
public/admin/index.html
  -> 从 CDN 加载 @sveltia/cms

public/admin/config.yml
  -> 定义 GitHub backend、collection 与媒体目录

workers/sveltia-cms-auth
  -> GitHub OAuth 用 Cloudflare Worker

cms-content branch
  -> CMS 保存编辑内容的分支

.github/workflows/cms-content-pr.yml
  -> 从 cms-content 自动创建 main 向 PR

.github/workflows/create-translation-prs.yml
  -> 只为 cms: commit 创建翻译 PR task
```

导入 CMS 并不只是放一个管理页面。认证、图片路径、preview 分支、多语言和 merge 策略都会影响实际运维。

## 1. 把管理界面放在 `public/admin`

Astro 会原样发布 `public` 目录下的文件。Sveltia CMS 官方文档也把 Astro、Next.js、Nuxt、Remix、VitePress 的静态目录列为 `public`。

最小页面如下：

```html
<!doctype html>
<html lang="zh-CN">
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

不要额外加入不存在的 CSS，也不要随手加 `type="module"`。当前的 Sveltia CMS CDN 版本按普通 script 加载即可。

Acecore 为了让 preview 环境切换 branch，使用了手动初始化。

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 2. 配置 GitHub backend

最小 GitHub backend 只需要 `backend.name` 与 `backend.repo`。实际使用时，还应一开始就决定 branch、OAuth 与 commit message。

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

个人网站可以直接保存到 `main`。公司网站或多语言网站则更适合保存到 `cms-content`，再自动创建 PR。

## 3. 准备 OAuth Worker

Personal Access Token 可以用于测试，但不适合交给多人或非工程师长期使用。Acecore 使用运行在 Cloudflare Workers 上的 Sveltia CMS Authenticator，并把 Worker URL 设置为 `base_url`。

GitHub OAuth App 的 callback URL 指向 Worker 的 `/callback`。Worker 中设置 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`，必要时再设置 `ALLOWED_DOMAINS`。

这里和 Turnstile 是不同层。CMS 登录用 GitHub OAuth，表单或评论的 bot 对策再使用 Turnstile。

## 4. 先确定图片上传目录

Sveltia CMS 的 internal media storage 会把上传文件写进仓库。Astro 中公开图片通常放在 `public` 下。

```yaml
media_folder: public/uploads
public_folder: /uploads
```

Acecore 后来在 [PR #116](https://github.com/acecore-systems/acecore-net/pull/116) 修正了 CMS 图片上传位置。经验是：导入 CMS 时就应该同时确定「仓库中的保存位置」和「页面中的公开 URL」。

外部图片和上传图片也建议分成两个字段。

```yaml
- name: image
  label: 外部图片 URL
  widget: string
  required: false

- name: uploadedImage
  label: 上传图片
  widget: image
  required: false
```

## 5. 用 collection 分开编辑范围

Acecore 把 CMS 编辑范围分成四类。

| collection | 对象                           | 方针                            |
| ---------- | ------------------------------ | ------------------------------- |
| `blog`     | `src/content/blog/*.md`        | 只编辑日语 source 文章          |
| `authors`  | `src/content/authors/*.json`   | 编辑作者信息和多语言显示名      |
| `tags`     | `src/content/tags/*.json`      | 编辑标签名和多语言显示名        |
| page text  | `src/i18n/source/ja/**/*.json` | 编辑页面与共通 UI 的日语 source |

不要轻易把所有语言的 Markdown 都暴露给 CMS。多语言网站中，source 与翻译的关系应该保持清晰。Acecore 把日语 source 作为正本，翻译交给[用 Sveltia CMS 运营多语言博客的方法](/zh-cn/blog/copilot-translation-pipeline/)。

## 6. 用 relation 与 select 减少错误

标签不应让编辑者手写，而应通过 relation 选择。

```yaml
- name: tags
  label: 标签
  widget: relation
  collection: tags
  value_field: name
  display_fields: ['{{name}} ({{id}})']
  search_fields: [name, id]
  multiple: true
  required: false
```

作者、图标、告知 tone 等也适合同样限制。CMS 的价值不仅是「能在浏览器中编辑」，也是「不容易输入坏值」。

## 7. 让日语 source JSON 可编辑

固定页面文案也可以 CMS 化。Acecore 将日语页面文案集中在 `src/i18n/source/ja/**/*.json`，再按页面分组暴露到 CMS。

反省点是，一开始不要把所有字段一次性放进 `config.yml`。配置会迅速变大，既存值读取、标签命名和审核都会变困难。建议从博客、作者、标签、告知、常改页面开始，逐步扩展。

## 8. preview 环境要读取正确 branch

Cloudflare Pages preview 中打开 CMS 时，如果 CMS 仍然读取 `main`，看到的内容就会和 preview 页面不一致。Acecore 在构建前生成 `public/admin/runtime-config.js`，把当前 branch 注入到 `window.ACECORE_CMS_BRANCH`。

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

这样可以保持 YAML 配置共通，同时让 preview 指向正确分支。

## 9. 从 CMS 专用分支创建 PR

CMS 保存到 `cms-content` 后，通过 GitHub Actions 创建 main 向 PR，可以让内容修改保持可审核。

```yaml
on:
  push:
    branches:
      - cms-content
```

这里的 merge 方法很重要。Acecore 的翻译任务依赖 `cms: create ...`、`cms: update ...` 等 commit subject。如果 squash merge 抹掉这些 subject，翻译 workflow 可能无法检测到 source 更新。CMS PR 应使用保留 `cms:` commit 的 merge commit 或 rebase merge。

## 10. 只让 CMS commit 触发翻译

[PR #98](https://github.com/acecore-systems/acecore-net/pull/98) 加入了 `--cms-only`，让 push 触发的翻译 PR task 只处理 CMS commit。

```javascript
function isCmsCommitSubject(subject) {
  return /^cms: (create|update|delete) /.test(subject || '')
}
```

因此 `cms:` 不是装饰，而是 workflow 的输入。普通开发 PR 或手写文章 PR 不应使用这个前缀。

## 11. `/admin` 使用独立 CSP

管理界面需要连接 Sveltia CMS CDN、GitHub API、OAuth Worker 和 blob URL，所以应与公开页面使用不同 CSP。Acecore 还对 `/admin/*` 设置 `noindex`，避免管理页面进入搜索索引。

## 把 Turnstile 分开考虑

本文旧版把 CMS 选择和 Cloudflare Turnstile 放在同一篇文章里。现在看，这会混淆主题。

Sveltia CMS 关注 GitHub backend、OAuth、collection、图片路径和 PR 运维。Turnstile 关注表单或评论 API 的 bot 对策。两者都让运维更安全，但实现层不同，应该分成不同文章。

## PR 与 commit 带来的经验

- CMS 实现改变时，相关文章和内部链接也要一起更新。
- OAuth 不应作为以后再做的优化，而应纳入正式导入。
- 图片路径要在编辑者上传前固定。
- `config.yml` 的字段要逐步增加，不要一次性暴露全部页面文案。
- `cms:` commit subject 是自动化契约，不是普通前缀。
- preview 环境必须清楚显示 CMS 正在读哪个 branch。

## 最小起点

新建 Astro 网站可以从这些文件开始：

```text
public/admin/index.html
public/admin/config.yml
public/admin/init.js
public/admin/runtime-config.js
```

然后按顺序加入作者 relation、标签 relation、上传图片、source JSON、CMS PR 自动化和翻译 PR task。

## 参考链接

- [Sveltia CMS Getting Started](https://sveltiacms.app/en/docs/start)
- [Sveltia CMS GitHub Backend](https://sveltiacms.app/en/docs/backends/github)
- [Sveltia CMS Internal Media Storage](https://sveltiacms.app/en/docs/media/internal)
- [Sveltia CMS Manual Initialization](https://sveltiacms.app/en/docs/api/initialization)
- [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)

## 总结

Sveltia CMS 本身很容易放进 `public/admin`。真正重要的是它周围的运维设计：保存到哪个 branch、如何登录、图片放在哪里、source 语言与翻译如何分离、CMS commit 如何被后续 workflow 解读。

这些规则明确之后，Astro 静态网站就能保持轻量，同时获得可审核、可持续的内容更新流程。
