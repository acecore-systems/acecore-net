import type { Root } from 'hast'
import { visit } from 'unist-util-visit'
import { optimizeImage } from './image'

/**
 * Markdown 内の外部画像 URL を wsrv.nl 経由に変換する rehype プラグイン。
 * `![alt](https://images.unsplash.com/...)` のような記法で挿入した画像を
 * 自動で最適化配信する。ローカル画像（/uploads/ 等）はスキップ。
 */
export default function rehypeOptimizeImages() {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return
      const src = node.properties?.src
      if (typeof src !== 'string') return
      if (!src.startsWith('http')) return
      if (src.includes('wsrv.nl')) return
      node.properties!.src = optimizeImage(src)
      if (!node.properties!.loading) node.properties!.loading = 'lazy'
      if (!node.properties!.decoding) node.properties!.decoding = 'async'
    })
  }
}
