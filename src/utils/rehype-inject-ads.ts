import type { Root, Element } from 'hast'
import type { Parent } from 'unist'
import { visit } from 'unist-util-visit'
import { SITE } from '../data/site'

const INLINE_AD_SLOT = SITE.inlineAdSlotId

/**
 * h2 が 3 つ以上ある記事で、3 セクションごとにインライン広告を挿入する rehype プラグイン。
 * 挿入位置: 2 番目・5 番目・8 番目 … の h2 直前（0-indexed: 1, 4, 7 …）
 */
export default function rehypeInjectAds() {
  return (tree: Root) => {
    const h2Positions: { parent: Parent; index: number }[] = []

    visit(tree, 'element', (node, index, parent) => {
      if ((node as Element).tagName === 'h2' && index !== undefined && parent) {
        h2Positions.push({ parent, index })
      }
    })

    if (h2Positions.length < 3) return

    const targets = h2Positions
      .map((pos, i) => ({ ...pos, h2Index: i }))
      .filter(({ h2Index }) => h2Index >= 1 && (h2Index - 1) % 3 === 0)

    // 後方から挿入してインデックスのずれを防ぐ
    for (const { parent, index } of targets.reverse()) {
      const adNode = {
        type: 'element' as const,
        tagName: 'div',
        properties: { className: ['ad-inline', 'not-prose'], style: 'margin:2rem 0' },
        children: [
          {
            type: 'element' as const,
            tagName: 'ins',
            properties: {
              className: ['adsbygoogle'],
              style: 'display:block',
              dataAdClient: SITE.adsenseClientId,
              dataAdSlot: INLINE_AD_SLOT,
              dataAdFormat: 'auto',
              dataFullWidthResponsive: 'true',
            },
            children: [],
          },
          {
            type: 'element' as const,
            tagName: 'script',
            properties: {},
            children: [
              {
                type: 'text' as const,
                value: '(adsbygoogle = window.adsbygoogle || []).push({});',
              },
            ],
          },
        ],
      }
      parent.children.splice(index, 0, adNode)
    }
  }
}
