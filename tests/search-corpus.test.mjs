import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'

import { buildSearchCorpus } from '../scripts/build-search-corpus.mjs'

const temporaryRoots = []

after(async () => {
  await Promise.all(
    temporaryRoots.map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  )
})

test('公開HTMLから決定的な多言語corpusを作り、除外要素を混ぜない', async () => {
  const root = await mkdtemp(join(tmpdir(), 'acecore-search-corpus-'))
  temporaryRoots.push(root)
  const dist = join(root, 'dist')
  await mkdir(join(dist, 'blog', 'example'), { recursive: true })
  await mkdir(join(dist, 'blog', 'tags', 'test'), { recursive: true })

  await writeFile(
    join(dist, 'blog', 'example', 'index.html'),
    `<!doctype html>
      <html lang="ja">
        <head>
          <title>Vectorize検索 | Acecore</title>
          <link rel="canonical" href="https://acecore.net/blog/example/">
          <meta name="description" content="検索の説明">
        </head>
        <body>
          <main>
            <nav>検索に含めないナビゲーション</nav>
            <article>
              <h1>Vectorize検索</h1>
              <p>Cloudflare Vectorizeを使って、意味の近い公開情報を検索できるようにします。</p>
              <h2>安全な同期</h2>
              <p>公開HTMLから作った内容ハッシュで差分だけを同期し、削除済み情報もindexから除去します。</p>
              <p data-pagefind-ignore>検索に含めない秘密の文章です。</p>
            </article>
          </main>
        </body>
      </html>`,
    'utf8',
  )
  await writeFile(
    join(dist, 'blog', 'tags', 'test', 'index.html'),
    '<html lang="ja"><main><h1>タグ一覧</h1><p>除外される一覧ページです。</p></main></html>',
    'utf8',
  )

  const first = await buildSearchCorpus({ distDir: dist, write: false })
  const second = await buildSearchCorpus({ distDir: dist, write: false })

  assert.equal(first.sourceCount, 1)
  assert.equal(first.vectorCount, 1)
  assert.equal(first.version, second.version)
  assert.deepEqual(first.chunks, second.chunks)
  assert.equal(first.chunks[0].namespace, 'ja')
  assert.equal(first.chunks[0].metadata.url, '/blog/example/')
  assert.equal(first.chunks[0].metadata.title, 'Vectorize検索')
  assert.match(first.chunks[0].text, /差分だけを同期/)
  assert.doesNotMatch(first.chunks[0].text, /ナビゲーション|秘密/)
  assert.ok(first.chunks[0].id.length <= 64)
  assert.ok(first.chunks[0].text.length <= 1200)
})

test('noindexページをcorpusへ入れない', async () => {
  const root = await mkdtemp(join(tmpdir(), 'acecore-search-noindex-'))
  temporaryRoots.push(root)
  const dist = join(root, 'dist')
  await mkdir(dist, { recursive: true })
  await writeFile(
    join(dist, 'index.html'),
    '<html lang="en"><head><meta name="robots" content="noindex"></head><main><h1>Private</h1><p>This page should never be indexed by semantic search.</p></main></html>',
    'utf8',
  )

  const corpus = await buildSearchCorpus({ distDir: dist, write: false })

  assert.equal(corpus.sourceCount, 0)
  assert.equal(corpus.vectorCount, 0)
})
