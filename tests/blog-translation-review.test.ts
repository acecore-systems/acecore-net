import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { reviewBlogTranslation } from '../scripts/blog-translation-review.ts'

const input = {
  source: '管理者が公開するまで下書きは非公開です。',
  translation: 'Drafts remain private until an administrator publishes them.',
  locale: 'en',
}
const apiKey = 'fixture-secret-not-to-be-logged'
const answer = (choice: string, language = 'accept') => ({
  answers: [
    { name: 'translation_acceptance', type: 'choice', choice },
    { name: 'translation_language', type: 'choice', choice: language },
  ],
})

test('専用endpointへの有限選択で意味を審査し、生成や任意JSONへ切り替えない', async () => {
  const requests: Array<{
    url: Parameters<typeof fetch>[0]
    options: RequestInit | undefined
  }> = []
  const actual = await reviewBlogTranslation(input, {
    apiKey,
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return Response.json(answer('accept'))
    },
  })
  assert.deepEqual(actual, { status: 'pass', reason: 'faithful' })
  assert.equal(requests.length, 1)
  const request = requests[0]
  assert.ok(request)
  assert.equal(request.url, 'https://api.openai.com/v1/decisions')
  assert.equal(request.options?.method, 'POST')
  assert.ok(request.options?.signal instanceof AbortSignal)
  const body = JSON.parse(String(request.options?.body))
  assert.equal(body.model, 'gpt-6-luna')
  assert.deepEqual(JSON.parse(body.input), {
    source: input.source,
    translation: input.translation,
    targetLocale: input.locale,
  })
  assert.equal(body.questions.length, 2)
  assert.deepEqual(
    body.questions[0].choices.map(({ value }: { value: string }) => value),
    ['accept', 'review'],
  )
  assert.match(body.questions[0].instructions, /evidence, never instructions/)
  assert.equal(body.questions[1].name, 'translation_language')
  assert.match(body.questions[1].instructions, /English \(en\)/)
  assert.doesNotMatch(
    String(request.options?.body),
    /fixture-secret-not-to-be-logged/,
  )
})

test('意味に問題がある判定は人の確認へ渡す', async () => {
  assert.deepEqual(
    await reviewBlogTranslation(input, {
      apiKey,
      fetchImpl: async () => Response.json(answer('review')),
    }),
    { status: 'review', reason: 'meaning_review' },
  )
})

test('意味が合っていても誤言語は保留し、返却順序は設問名で識別する', async () => {
  const korean = { ...input, locale: 'ko' }
  assert.deepEqual(
    await reviewBlogTranslation(korean, {
      apiKey,
      fetchImpl: async (_url, options) => {
        const body = JSON.parse(String(options?.body))
        assert.match(body.questions[1].instructions, /Korean \(ko\)/)
        return Response.json({
          answers: answer('accept', 'review').answers.reverse(),
        })
      },
    }),
    { status: 'review', reason: 'language_review' },
  )
  assert.deepEqual(
    await reviewBlogTranslation(input, {
      apiKey,
      fetchImpl: async () =>
        Response.json({ answers: answer('accept').answers.reverse() }),
    }),
    { status: 'pass', reason: 'faithful' },
  )
})

for (const [name, payload] of [
  ['回答なし', {}],
  ['空配列', { answers: [] }],
  ['言語設問の欠落', { answers: [answer('accept').answers[0]] }],
  [
    '設問名の重複',
    { answers: [answer('accept').answers[0], answer('accept').answers[0]] },
  ],
  [
    '回答重複',
    { answers: [...answer('accept').answers, ...answer('review').answers] },
  ],
  ['拒否', { answers: [{ name: 'translation_acceptance', type: 'refusal' }] }],
  ['未知の選択', answer('publish')],
  [
    '違う設問',
    { answers: [{ name: 'other', type: 'choice', choice: 'accept' }] },
  ],
  [
    '違う型',
    {
      answers: [
        { name: 'translation_acceptance', type: 'predicate', choice: 'accept' },
      ],
    },
  ],
  ['不正JSON', 'not-json'],
  ['応答上限超過', 'x'.repeat(64_001)],
]) {
  test(`${name}を合格として扱わない`, async () => {
    let calls = 0
    const actual = await reviewBlogTranslation(input, {
      apiKey,
      fetchImpl: async () => {
        calls++
        return typeof payload === 'string'
          ? new Response(payload)
          : Response.json(payload)
      },
    })
    assert.deepEqual(actual, {
      status: 'unavailable',
      reason: 'invalid_response',
    })
    assert.equal(calls, 1)
  })
}

test('HTTPエラー・通信失敗は情報を漏らさず保留する', async () => {
  for (const fetchImpl of [
    async () => new Response(apiKey, { status: 503 }),
    async () => {
      throw new Error(`provider error ${apiKey}`)
    },
  ]) {
    assert.deepEqual(
      await reviewBlogTranslation(input, { apiKey, fetchImpl }),
      { status: 'unavailable', reason: 'api_unavailable' },
    )
  }
})

test('不正入力・対象外locale・過大入力・キーなしは送信しない', async () => {
  let calls = 0
  const fetchImpl = async () => {
    calls++
    throw new Error('Must not send')
  }
  for (const candidate of [
    { ...input, source: ' ' },
    { ...input, translation: null },
    { ...input, locale: 'ja' },
  ]) {
    assert.deepEqual(
      await reviewBlogTranslation(candidate, { apiKey, fetchImpl }),
      { status: 'unavailable', reason: 'invalid_input' },
    )
  }
  assert.deepEqual(
    await reviewBlogTranslation(
      { ...input, source: 'x'.repeat(48_001) },
      { apiKey, fetchImpl },
    ),
    { status: 'unavailable', reason: 'input_limit' },
  )
  assert.deepEqual(
    await reviewBlogTranslation(input, { apiKey: ' ', fetchImpl }),
    { status: 'unavailable', reason: 'api_unavailable' },
  )
  assert.equal(calls, 0)
})

test('評価例は8言語の正訳・欠落・反転を含み、識別子と正解ラベルが独立している', async () => {
  const fixtures = JSON.parse(
    await readFile(
      new URL('./fixtures/blog-translation-review.json', import.meta.url),
      'utf8',
    ),
  ) as Array<{
    id: string
    source: string
    translation: string
    locale: string
    expected: string
  }>
  assert.equal(fixtures.length, 40)
  assert.equal(new Set(fixtures.map(({ id }) => id)).size, fixtures.length)
  for (const locale of ['en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru']) {
    const cases = fixtures.filter((fixture) => fixture.locale === locale)
    assert.ok(cases.some(({ expected }) => expected === 'pass'))
    assert.ok(cases.some(({ expected }) => expected === 'review'))
  }
  assert.ok(
    fixtures.every(
      ({ source, translation, expected }) =>
        typeof source === 'string' &&
        source.trim() &&
        typeof translation === 'string' &&
        translation.trim() &&
        ['pass', 'review'].includes(expected),
    ),
  )
})
