import type { Root } from 'hast'
import { visit } from 'unist-util-visit'

const CLIENT_ID = 'ca-pub-3935803464310919'
const INLINE_AD_SLOT = '4541792182'

/**
 * h2 が 3 つ以上ある記事で、2 番目の h2 の直前にインライン広告を挿入する rehype プラグイン。
 */
export default function rehypeInjectAds() {
  return (tree: Root) => {
    const h2Positions: { parent: any; index: number }[] = []

    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'h2' && index !== undefined && parent) {
        h2Positions.push({ parent, index })
      }
    })

    if (h2Positions.length >= 3) {
      const { parent, index } = h2Positions[1]
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
              dataAdClient: CLIENT_ID,
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
