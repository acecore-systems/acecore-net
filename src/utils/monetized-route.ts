/**
 * 広告枠を持つブログ配下かを判定する。
 *
 * 呼び出し元がロケール解決済みのブログ基点を渡すことで、
 * サポートロケールの定義を重複させずに判定する。
 */
export function isMonetizedBlogPath(
  pathname: string,
  localizedBlogRoot: string,
): boolean {
  const normalizedPathname = pathname.endsWith('/') ? pathname : `${pathname}/`
  const normalizedBlogRoot = localizedBlogRoot.endsWith('/')
    ? localizedBlogRoot
    : `${localizedBlogRoot}/`

  return normalizedPathname.startsWith(normalizedBlogRoot)
}
