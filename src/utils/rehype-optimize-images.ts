import type { Root } from 'hast'
import { visit } from 'unist-util-visit'
import { optimizeImage } from './image'

const IS_PROD = process.env.NODE_ENV === 'production'

/**
 * Markdown 内の外部画像 URL とローカル画像パスを Cloudflare Images の変換URLに置き換える rehype プラグイン。
 * `![alt](https://images.unsplash.com/...)` のような記法で挿入した画像を
 * 自動で最適化配信する。`/uploads/` のようなローカル画像も対象。
 * 開発環境（NODE_ENV !== 'production'）では変換をスキップし、元のパスのまま配信する。
 */
export default function rehypeOptimizeImages() {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return
      const src = node.properties?.src
      if (typeof src !== 'string') return
      if (!src.startsWith('http') && !src.startsWith('/')) return
      if (src.includes('/cdn-cgi/image/')) return
      if (IS_PROD) {
        node.properties!.src = optimizeImage(src)
      }
      if (!node.properties!.loading) node.properties!.loading = 'lazy'
      if (!node.properties!.decoding) node.properties!.decoding = 'async'
      if (!node.properties!.width) node.properties!.width = 800
      if (!node.properties!.height) node.properties!.height = 450
    })
  }
}
