/**
 * ページネーション関連ユーティリティ
 *
 * ブログ記事一覧のページ送りで使用する定数と関数を提供する。
 */

/** 1 ページあたりの記事表示件数 */
export const POSTS_PER_PAGE = 10

/**
 * ページネーション UI に表示するページ番号リストを生成する。
 *
 * 先頭・末尾・現在ページ付近（前後 1 ページ）を表示し、
 * 省略部分は '...' で表現する。
 *
 * @example
 * buildPageNumbers(5, 10) // → [1, '...', 4, 5, 6, '...', 10]
 * buildPageNumbers(1, 3)  // → [1, 2, 3]
 */
export function buildPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | '...')[] {
  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }
  return pages
}
