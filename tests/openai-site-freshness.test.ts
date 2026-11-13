import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { isCurrentSiteSource } from '../scripts/openai-translation-batch.ts'

test('待機中のsite原稿と別campaign更新を実Gitで検出する', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'acecore-translation-freshness-'))
  const previous = process.cwd()
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  try {
    git('init')
    git('config', 'user.name', 'Synthetic Test')
    git('config', 'user.email', 'test@example.invalid')
    const site = 'src/i18n/source/ja/pages/about.json'
    const campaignA = 'src/i18n/source/ja/campaigns/a.json'
    const campaignB = 'src/i18n/source/ja/campaigns/b.json'
    for (const file of [site, campaignA, campaignB]) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
      writeFileSync(path.join(dir, file), '{}')
    }
    git('add', '.')
    git('commit', '-m', 'base')
    const head = git('rev-parse', 'HEAD')
    process.chdir(dir)
    assert.equal(isCurrentSiteSource(site, false, head, 'HEAD'), true)
    assert.equal(isCurrentSiteSource(campaignA, false, head, 'HEAD'), true)
    writeFileSync(path.join(dir, campaignB), '{"new":true}')
    git('add', '.')
    git('commit', '-m', 'campaign')
    const campaignHead = git('rev-parse', 'HEAD')
    assert.equal(isCurrentSiteSource(site, false, head, campaignHead), true)
    assert.equal(
      isCurrentSiteSource(campaignA, false, head, campaignHead),
      false,
    )
    writeFileSync(path.join(dir, site), '{"new":true}')
    git('add', '.')
    git('commit', '-m', 'site')
    const siteHead = git('rev-parse', 'HEAD')
    assert.equal(isCurrentSiteSource(site, false, head, siteHead), false)
  } finally {
    process.chdir(previous)
    if (
      !path.basename(dir).startsWith('acecore-translation-freshness-') ||
      path.dirname(dir) !== path.resolve(tmpdir())
    )
      throw new Error('unexpected_test_directory')
    rmSync(dir, { recursive: true, force: true })
  }
})
