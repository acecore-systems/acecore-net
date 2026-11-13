import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  type JournalStore,
  type MetaJournal,
  collectMetaGroup,
  metaRequestHash,
} from '../scripts/meta-translation-background.ts'
import {
  RECOVERY_GROUP,
  RECOVERY_LOCALES,
  SOURCE_HASH,
  SOURCE_PATH,
  MERGED_COMMIT,
  recoverSecurityPolicyGroup,
  validateSupersessionEvidence,
} from '../scripts/recover-meta-security-policy.ts'

// Immutable source from the reviewed PR #337; later site edits must not change
// this incident's fixtures or broaden the one-time recovery authorization.
const source =
  '{\n  "title": "情報セキュリティ基本方針",\n  "description": "株式会社Acecoreの情報セキュリティに関する基本方針をご案内します。",\n  "lead": "株式会社Acecoreは、お客様やお取引先からお預かりする情報を含む事業上の情報資産を保護するため、経営者の責任のもと、以下を基本方針として取り組みます。",\n  "protectionHeading": "情報資産の保護",\n  "protectionBody": "情報資産の機密性、完全性および可用性を守るため、リスクに応じた目標を定め、必要な対策に取り組みます。情報の取扱いの目的と範囲を明確にし、共有前に相手、共有する範囲および期間を確認します。保存、返却および削除は、適用される法令、契約および業務上の必要性に応じて適切に行います。",\n  "complianceHeading": "法令・契約の遵守",\n  "complianceBody": "情報セキュリティに関して当社に適用される法令、契約その他の要求事項を遵守します。個人情報の取扱いについては、当社のプライバシーポリシーもご覧ください。",\n  "managementHeading": "管理体制と教育",\n  "managementBody": "業務上必要な最小限のアクセス権限を付与し、異動、退職、委託終了などに応じて権限を見直し、必要な変更・失効を行います。認証の強化、システムの更新および脆弱性への対応に、リスクに応じて取り組みます。役員および従業者に本方針と情報の取扱いを周知し、役割に応じた教育を行います。情報の取扱いを委託する場合は、委託先の選定と必要な管理に取り組み、情報の取扱い、事故時の連絡および契約終了時の返却・削除などの条件を確認します。",\n  "continuityHeading": "事業の継続と事故への対応",\n  "continuityBody": "事業への影響やリスクに応じて、必要な情報資産のバックアップ、復旧手順の整備および復元の確認に取り組みます。情報セキュリティ事故が発生した場合は、初動対応と被害の拡大防止、事業の継続・復旧に取り組み、適用される法令や契約に従い、関係者や関係機関に必要な連絡・通知・報告を行います。原因を調査し、再発防止に取り組みます。",\n  "improvementHeading": "継続的改善",\n  "improvementBody": "情報セキュリティの目標と対策の状況を定期的に点検し、リスクや事業環境の変化、事故への対応などを踏まえて管理の仕組みを見直し、継続的に改善します。",\n  "contactHeading": "お問い合わせ",\n  "contactBody": "本方針に関するお問い合わせは、以下の窓口からお願いいたします。",\n  "contactLink": "お問い合わせ"\n}\n'
const customId = (locale: string) =>
  'acecore-net:' +
  Buffer.from(
    JSON.stringify({
      version: 1,
      kind: 'site',
      locale,
      sourcePath: SOURCE_PATH,
      sourceHash: SOURCE_HASH,
    }),
  ).toString('base64url')
const receipt = {
  groupId: RECOVERY_GROUP,
  customId: customId('en'),
  responseId: 'resp_accepted_test',
}
function evidence() {
  return {
    source,
    translations: Object.fromEntries(
      RECOVERY_LOCALES.map((locale) => [
        locale,
        {
          pages: {
            securityPolicy: Object.fromEntries(
              Object.keys(JSON.parse(source)).map((key) => [
                key,
                locale + ':' + key,
              ]),
            ),
          },
        },
      ]),
    ),
  }
}
function proof() {
  return validateSupersessionEvidence(evidence(), evidence(), 'a'.repeat(40))
}
function memoryStore() {
  let current: MetaJournal = {
    version: 1,
    groups: {
      [RECOVERY_GROUP]: {
        id: RECOVERY_GROUP,
        createdAt: '2026-11-12T02:16:43.037Z',
        entries: RECOVERY_LOCALES.map((locale) => ({
          customId: customId(locale),
          requestKey: metaRequestHash(locale),
          state: locale === 'en' ? 'dispatching' : 'queued',
          ...(locale === 'en' ? { ownerGroupId: RECOVERY_GROUP } : {}),
        })),
      },
      other: {
        id: 'other',
        createdAt: '2026-11-11T00:00:00Z',
        processedAt: '2026-11-11T01:00:00Z',
        entries: [
          {
            customId: 'other',
            requestKey: metaRequestHash('other'),
            state: 'submitted',
            responseId: 'resp_unrelated_test',
          },
        ],
      },
    },
  }
  const store: JournalStore = {
    async read() {
      return structuredClone(current)
    },
    async mutate(change) {
      const next = structuredClone(current)
      change(next)
      current = next
      return structuredClone(current)
    },
  }
  return store
}
function provider(status = 'completed') {
  const methods: string[] = []
  const fetchImpl: typeof fetch = async (url, init) => {
    assert.equal(init?.redirect, 'error')
    assert.equal(
      String(url),
      'https://api.meta.ai/v1/responses/resp_accepted_test',
    )
    const method = init?.method ?? 'GET'
    methods.push(method)
    assert.ok(
      method === 'GET' || method === 'DELETE',
      'recovery must never POST',
    )
    return Response.json(
      method === 'DELETE'
        ? {}
        : {
            id: receipt.responseId,
            model: 'muse-ember-1.0',
            status,
            metadata: {
              translation_group: RECOVERY_GROUP,
              request_hash: metaRequestHash(receipt.customId),
            },
          },
    )
  }
  return { methods, fetchImpl }
}

test('PR #337と一致するsourceと正しい8言語targetPathだけを承認根拠にする', () => {
  const verified = proof()
  assert.equal(verified.mergedCommit, MERGED_COMMIT)
  assert.deepEqual(verified.targetPath, ['pages', 'securityPolicy'])
  assert.equal(Object.keys(verified.targetHashes).length, 8)
  const changed = evidence()
  changed.source = JSON.stringify({
    ...JSON.parse(source),
    title: 'new source',
  })
  assert.throws(
    () => validateSupersessionEvidence(changed, evidence(), 'a'.repeat(40)),
    /source_changed/,
  )
  const missing = evidence()
  delete (missing.translations.en.pages as Record<string, unknown>)
    .securityPolicy
  assert.throws(
    () => validateSupersessionEvidence(missing, evidence(), 'a'.repeat(40)),
    /target_path_missing/,
  )
  const modified = evidence()
  modified.translations.en.pages.securityPolicy.title = 'changed'
  assert.throws(
    () => validateSupersessionEvidence(modified, evidence(), 'a'.repeat(40)),
    /target_changed_en/,
  )
})

test('受理済み1件だけGETして7未送信件をsupersededにし、対象の保存responseだけ削除する', async () => {
  const store = memoryStore()
  const api = provider()
  await recoverSecurityPolicyGroup(
    proof(),
    receipt,
    store,
    'test-key',
    api.fetchImpl,
  )
  const journal = await store.read()
  const group = journal.groups[RECOVERY_GROUP]
  assert.deepEqual(api.methods, ['GET', 'DELETE'])
  assert.equal(
    group.entries.filter((entry) => entry.state === 'superseded').length,
    7,
  )
  assert.equal(group.entries[0].state, 'submitted')
  assert.equal(group.entries[0].responseId, receipt.responseId)
  assert.ok(group.entries[0].deletedAt)
  assert.ok(group.processedAt)
  assert.equal(group.superseded?.pullRequest, 337)
  assert.equal(group.superseded?.acceptedResponseStatus, 'completed')
  assert.equal(journal.groups.other.entries[0].deletedAt, undefined)
  await recoverSecurityPolicyGroup(
    proof(),
    receipt,
    store,
    'test-key',
    api.fetchImpl,
  )
  assert.deepEqual(
    api.methods,
    ['GET', 'DELETE'],
    'completed recovery is idempotent',
  )
})

test('providerが未完了でもIDだけ復旧し、7件の再送も処理済み扱いもしない', async () => {
  const store = memoryStore()
  const pending = provider('in_progress')
  await assert.rejects(
    recoverSecurityPolicyGroup(
      proof(),
      receipt,
      store,
      'test-key',
      pending.fetchImpl,
    ),
    /response_not_terminal/,
  )
  const group = (await store.read()).groups[RECOVERY_GROUP]
  assert.deepEqual(pending.methods, ['GET'])
  assert.equal(group.entries[0].state, 'submitted')
  assert.equal(group.entries[0].responseId, receipt.responseId)
  assert.equal(
    group.entries.filter((entry) => entry.state === 'queued').length,
    7,
  )
  assert.equal(group.processedAt, undefined)
  const completed = provider()
  await recoverSecurityPolicyGroup(
    proof(),
    receipt,
    store,
    'test-key',
    completed.fetchImpl,
  )
  assert.deepEqual(completed.methods, ['GET', 'DELETE'])
})

test('受理記録のmetadataが一致しなければjournalもprovider保存結果も変更しない', async () => {
  const store = memoryStore()
  let calls = 0
  const mismatch: typeof fetch = async () => {
    calls++
    return Response.json({
      id: receipt.responseId,
      model: 'muse-ember-1.0',
      status: 'completed',
      metadata: { translation_group: 'another', request_hash: 'wrong' },
    })
  }
  await assert.rejects(
    recoverSecurityPolicyGroup(proof(), receipt, store, 'test-key', mismatch),
    /meta_receipt_mismatch/,
  )
  assert.equal(calls, 1)
  assert.equal(
    (await store.read()).groups[RECOVERY_GROUP].entries[0].state,
    'dispatching',
  )
})

test('他の未確定送信が見つかった場合は追加pollや削除を行わず停止する', async () => {
  const store = memoryStore()
  await store.mutate((journal) => {
    const entry = journal.groups[RECOVERY_GROUP].entries[1]
    entry.state = 'dispatching'
    entry.ownerGroupId = RECOVERY_GROUP
  })
  const api = provider()
  await assert.rejects(
    recoverSecurityPolicyGroup(
      proof(),
      receipt,
      store,
      'test-key',
      api.fetchImpl,
    ),
    /unexpected_submission/,
  )
  assert.deepEqual(api.methods, [])
})

test('supersession根拠が異なる処理済みgroupは上書きしない', async () => {
  const store = memoryStore()
  const api = provider()
  await recoverSecurityPolicyGroup(
    proof(),
    receipt,
    store,
    'test-key',
    api.fetchImpl,
  )
  await store.mutate((journal) => {
    journal.groups[RECOVERY_GROUP].superseded!.pullRequest = 1
  })
  await assert.rejects(
    recoverSecurityPolicyGroup(
      proof(),
      receipt,
      store,
      'test-key',
      api.fetchImpl,
    ),
    /existing_resolution_mismatch/,
  )
  assert.deepEqual(api.methods, ['GET', 'DELETE'])
})

test('supersededを引き継いだ別groupもproviderへ問い合わせず回収できる', async () => {
  const store = memoryStore()
  await store.mutate((journal) => {
    const group = journal.groups[RECOVERY_GROUP]
    group.entries = [group.entries[1]]
    group.entries[0].state = 'superseded'
  })
  const api = provider()
  const result = await collectMetaGroup(
    await store.read(),
    new Set(),
    'test-key',
    api.fetchImpl,
  )
  assert.equal(
    result?.outputs[0].error?.code,
    'superseded_by_merged_translation',
  )
  assert.deepEqual(api.methods, [])
})
