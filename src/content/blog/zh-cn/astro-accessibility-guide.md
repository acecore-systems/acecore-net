---
title: '将Astro网站的无障碍性提升至WCAG AA标准的实践指南'
description: '介绍在Astro + UnoCSS构成的网站上实施无障碍改进的全部步骤。涵盖aria属性、对比度、焦点管理、表单验证、屏幕阅读器适配等WCAG AA标准所需的全部措施。'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'アクセシビリティ']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: 无障碍适配是"面向所有人的UX改善"
  text: '无障碍并不只是为残障人士服务的。键盘操作、对比度、焦点显示直接关系到所有用户的易用性。做得越多，网站整体品质提升越大，是一项回报丰厚的投资。'
processFigure:
  title: 无障碍改进的推进流程
  steps:
    - title: 自动检查
      description: 使用axe DevTools和Lighthouse筛查出可以机器检测的问题。
      icon: i-lucide-scan
    - title: 手动检查
      description: 通过键盘操作和屏幕阅读器进行实际使用体验。
      icon: i-lucide-hand
    - title: 修复
      description: 添加aria属性、修正对比度、增加焦点样式。
      icon: i-lucide-wrench
    - title: 复查
      description: 确认PageSpeed的Accessibility得分达到100分。
      icon: i-lucide-check-circle
checklist:
  title: WCAG AA 合规检查清单
  items:
    - text: 文本对比度达到4.5:1以上（大号文字为3:1以上）
      checked: true
    - text: 所有交互元素都有focus-visible样式
      checked: true
    - text: 装饰性图标已添加aria-hidden="true"
      checked: true
    - text: 外部链接已有屏幕阅读器提示
      checked: true
    - text: 表单具有内联验证和aria-invalid联动
      checked: true
    - text: 图片已添加width/height属性（防止CLS）
      checked: true
    - text: 列表元素已添加role="list"（针对list-style:none的补救）
      checked: true
faq:
  title: 常见问题
  items:
    - question: axe DevTools和Lighthouse有什么区别？
      answer: 'Lighthouse是一个包含性能和SEO在内的综合审计工具，只检查部分无障碍项目。axe DevTools专注于无障碍性，使用更多规则进行细致检查。建议两者并用。'
    - question: 是否应该给所有元素都添加aria属性？
      answer: '不是。如果HTML的语义使用正确，就不需要aria。aria属性是用来补充"仅靠HTML无法传达的信息"的，过度使用反而会导致屏幕阅读器的朗读变得冗余。'
    - question: PageSpeed的Accessibility达到100分就代表符合WCAG标准吗？
      answer: '即使达到100分也不能完全断言符合WCAG标准。Lighthouse的检查项目有限，有些标准（如逻辑阅读顺序、恰当的alt文案等）只能通过手动检查确认。需要自动测试和手动测试双管齐下。'
---

## 前言

提到"无障碍适配"，也许你会觉得这是容易被推后的项目。但实际着手后你会发现，对比度、键盘操作、焦点显示的改善直接提升了所有用户的使用体验。

本文按类别介绍了在Astro + UnoCSS网站上达到PageSpeed Accessibility 100分所实施的改善措施。

---

## 装饰性图标的aria-hidden

UnoCSS的Iconify图标（`i-lucide-*`）通常用作视觉装饰，但如果屏幕阅读器将其读出，会以"图片""不明图片"等方式提示，反而造成混淆。

### 解决方法

为装饰性图标添加 `aria-hidden="true"`。

```html
<span class="i-lucide-mail" aria-hidden="true"></span>
联系我们
```

在整个网站30多处图标上实施了此项适配。StatBar、Callout、ServiceCard、ProcessFigure等组件内的图标也容易遗漏，需要特别注意。

---

## 外部链接的屏幕阅读器提示

使用 `target="_blank"` 打开的外部链接，视觉上可以判断是在新标签页打开，但屏幕阅读器用户无法感知。

### 解决方法

为外部链接添加视觉上不可见的补充文本。

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Example
  <span class="sr-only">（在新标签页中打开）</span>
</a>
```

使用 `rehype-external-links` 插件，可以自动为Markdown中的外部链接添加 `target="_blank"` 和 `rel`。屏幕阅读器提示文本的添加在模板侧进行。

---

## 确保对比度

PageSpeed Insights最常指出的问题就是对比度不足。

### 常见问题

使用UnoCSS调色板中的 `text-slate-400` 时，相对于白色背景的对比度约为3:1，不满足WCAG AA的4.5:1标准。

### 解决方法

将 `text-slate-400` → `text-slate-500`（对比度4.6:1）即可达标。日期和说明文字等辅助文本中常用此颜色，请在全站范围内检查确认。

---

## focus-visible样式

对于使用键盘操作网站的用户来说，焦点指示器是了解"当前位置"的唯一线索。WCAG 2.4.7要求提供焦点显示。

### UnoCSS中的实现

为按钮和链接设置通用焦点样式。利用UnoCSS的快捷方式功能，只需一处定义就可以全局应用。

```typescript
shortcuts: {
  'ac-btn': '... focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
}
```

`focus-visible` 是一个伪类，在鼠标点击时不显示焦点环，仅在键盘操作时显示。比 `focus` 的UX更好，推荐使用。

### 容易遗漏的元素

- 复制按钮
- 返回顶部按钮
- 锚定广告的关闭按钮
- 模态框的关闭按钮

---

## 内联链接的下划线

PageSpeed会指出"链接仅靠颜色来区分"的问题。这是色觉受限用户无法辨别链接的问题。

### 解决方法

将仅在悬停时显示的下划线改为常驻显示。推荐使用UnoCSS的快捷方式统一管理。

```typescript
shortcuts: {
  'ac-link': 'underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors',
}
```

---

## 表单的无障碍性

在联系表单等用户需要输入的场景中，无障碍性尤为重要。

### 内联验证

在 `blur` / `input` 事件上即时显示错误消息，并联动以下aria属性：

- `aria-invalid="true"` ― 告知输入无效
- `aria-describedby` ― 引用错误消息的ID

```html
<input
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" role="alert">请输入有效的电子邮件地址</p>
```

### 必填项标记

仅有视觉上的 `*` 标记是不够的。需要添加面向屏幕阅读器的补充文本。

```html
<span aria-hidden="true">*</span>
<span class="sr-only">（必填）</span>
```

---

## figure元素的role属性

为 `<figure>` 元素设置 `role="img"` 会导致子元素对屏幕阅读器隐藏。对于包含图标和说明文本的组件（InsightGrid、ProcessFigure、Timeline），应改为 `role="group"`，以保持内部内容的可访问性。

---

## 列表元素的role属性

使用CSS设置 `list-style: none` 后，Safari的屏幕阅读器（VoiceOver）会不再将其识别为列表，这是一个已知的Bug。

为面包屑导航、侧边栏、页脚的 `<ol>` / `<ul>` 添加 `role="list"` 来解决。请检查所有自定义了外观的列表。

---

## 其他改进

### 图片的width/height属性

未明确指定 `width` 和 `height` 的图片会在加载完成时导致布局偏移（CLS - Cumulative Layout Shift）。头像图片（32×32、48×48、64×64px）和YouTube缩略图（480×360px）等，请为所有图片指定尺寸。

### Hero轮播的aria-live

自动切换的轮播图对屏幕阅读器用户来说感知不到变化。准备一个 `aria-live="polite"` 区域，以"幻灯片 1 / 4：〇〇"的文本形式进行通知。

### dialog的aria-labelledby

`<dialog>` 元素应通过 `aria-labelledby` 引用标题元素的ID，使屏幕阅读器能够读出模态框的用途。

### 分页的aria-current

为当前页码设置 `aria-current="page"`，通过屏幕阅读器通知这是"当前页面"。

### 复制按钮的aria-label更新

复制到剪贴板成功时，动态更新 `aria-label` 为"已复制"，通过屏幕阅读器通知状态变化。

---

## 总结

无障碍改进的每一项都是小改动，但积累起来可以大幅提升网站整体的品质。效果最显著的是以下三项：

1. **focus-visible的全局应用**：键盘导航体验得到了显著改善
2. **对比度修正**：仅将 `text-slate-400` → `text-slate-500` 就通过了WCAG AA标准
3. **外部链接的屏幕阅读器提示**：结合 `rehype-external-links` 自动适配所有链接

建议先用axe DevTools扫描网站，从可自动检测的问题开始着手解决。

---

## 本文所属系列

本文是"[Astro网站品质改善指南](/blog/website-improvement-batches/)"系列的一部分。也有关于性能、SEO和UX改善的独立文章。
