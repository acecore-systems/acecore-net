import { readFile, writeFile } from 'node:fs/promises'
import {
  reviewBlogTranslation,
  type TranslationReview,
} from './blog-translation-review.ts'

interface EvaluationFixture {
  id: string
  source: string
  translation: string
  locale: string
  expected: 'pass' | 'review'
}

interface EvaluationResult {
  id: string
  locale: string
  expected: EvaluationFixture['expected']
  actual: TranslationReview['status']
  reason: TranslationReview['reason']
  milliseconds: number
  passed: boolean
}

interface Usage {
  status: number
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
}

function tokenCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null
}

const fixtures = JSON.parse(
  await readFile(
    new URL('../tests/fixtures/blog-translation-review.json', import.meta.url),
    'utf8',
  ),
) as EvaluationFixture[]
const results: EvaluationResult[] = []
const usage: Usage[] = []
const fetchImpl: typeof globalThis.fetch = async (url, options) => {
  if (url !== 'https://api.openai.com/v1/decisions')
    throw new Error('Unexpected evaluation endpoint')
  const response = await fetch(url, options)
  try {
    const payload = await response.clone().json()
    const tokens = payload?.usage
    usage.push({
      status: response.status,
      inputTokens: tokenCount(tokens?.input_tokens),
      outputTokens: tokenCount(tokens?.output_tokens),
      totalTokens: tokenCount(tokens?.total_tokens),
    })
  } catch {
    usage.push({
      status: response.status,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    })
  }
  return response
}

for (const fixture of fixtures) {
  const startedAt = performance.now()
  const actual = await reviewBlogTranslation(fixture, { fetchImpl })
  const result = {
    id: fixture.id,
    locale: fixture.locale,
    expected: fixture.expected,
    actual: actual.status,
    reason: actual.reason,
    milliseconds: Math.round(performance.now() - startedAt),
    passed: actual.status === fixture.expected,
  }
  results.push(result)
  console.log(`${result.id}: ${result.expected} -> ${result.actual}`)
}

const report = {
  checkedAtUtc: new Date().toISOString(),
  codeRef: process.env.BLOG_REVIEW_CODE_REF ?? null,
  model: 'gpt-6-luna',
  syntheticOnly: true,
  productionTranslationDataReadOrWritten: false,
  githubChangesOrBatchRequests: false,
  cases: results.length,
  passed: results.filter(({ passed }) => passed).length,
  falseAcceptance: results.filter(
    ({ expected, actual }) => expected === 'review' && actual === 'pass',
  ).length,
  falseRejection: results.filter(
    ({ expected, actual }) => expected === 'pass' && actual === 'review',
  ).length,
  unavailable: results.filter(({ actual }) => actual === 'unavailable').length,
  results,
  usage,
}
if (process.env.BLOG_REVIEW_REPORT_PATH) {
  await writeFile(
    process.env.BLOG_REVIEW_REPORT_PATH,
    JSON.stringify(report, null, 2) + '\n',
  )
}
if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## ブログ翻訳審査\n\n架空${report.cases}例: ${report.passed}一致。誤受理${report.falseAcceptance}、誤棄却${report.falseRejection}、判定不能${report.unavailable}。\n\n本文生成・Batch回収・Git・公開は実行していません。\n`,
    { flag: 'a' },
  )
}
console.log(
  JSON.stringify({
    cases: report.cases,
    passed: report.passed,
    falseAcceptance: report.falseAcceptance,
    falseRejection: report.falseRejection,
    unavailable: report.unavailable,
  }),
)
if (report.passed !== report.cases) process.exitCode = 1
