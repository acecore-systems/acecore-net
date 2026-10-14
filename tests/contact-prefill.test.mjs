import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const contactPage = readFileSync(
  new URL('../src/views/ContactPage.astro', import.meta.url),
  'utf8',
)
const prefillScript = contactPage.match(
  /<script is:inline>\s*(function initContactServicePrefill[\s\S]*?)<\/script>/u,
)?.[1]
assert.ok(prefillScript, 'Contact prefill script must exist')

class Field extends EventTarget {
  value = ''
  dataset = {}
  options = []
}
class Select extends Field {}
class Input extends Field {}

function renderPrefill(
  query,
  { subjectValue = '', template = '{service}について' } = {},
) {
  const category = new Select()
  category.options = [
    ['systems', '業務システム・Webアプリ開発について', 'Acecore Systems'],
    ['education', 'ITスクール / Acecore Schoolsについて', 'Acecore Schools'],
    ['acecore-design', 'Acecore Designについて', 'Acecore Design'],
    ['acestudio', 'AceStudioについて', 'AceStudio'],
    ['', 'サービス全般について', ''],
    ['', 'パートナーシップ', ''],
  ].map(([key, value, serviceSubject]) => ({
    value,
    dataset: { serviceKey: key, serviceSubject },
  }))
  const subject = new Input()
  subject.value = subjectValue
  const form = {
    dataset: { serviceSubjectTemplate: template },
    scrollIntoView() {},
  }
  const pageEvents = {}
  vm.runInNewContext(prefillScript, {
    URL,
    Event,
    HTMLSelectElement: Select,
    HTMLInputElement: Input,
    window: {
      location: new URL('https://acecore.net/contact/' + query),
      requestAnimationFrame: (callback) => callback(),
    },
    document: {
      getElementById: (id) => ({ 'contact-form': form, category, subject })[id],
      addEventListener: (event, callback) => {
        pageEvents[event] = callback
      },
    },
  })
  return { category, subject, pageEvents }
}

test('新しいDesign部門と旧designリンクを混同しない', () => {
  const design = renderPrefill('?category=service&service=acecore-design')
  assert.equal(design.category.value, 'Acecore Designについて')
  assert.equal(design.subject.value, 'Acecore Designについて')
  const legacy = renderPrefill('?category=service&service=design')
  assert.equal(legacy.category.value, '業務システム・Webアプリ開発について')
  assert.equal(legacy.subject.value, 'Acecore Systemsについて')
})

test('AceStudioの相談意図を同じ言語の件名へ引き継ぐ', () => {
  const { category, subject } = renderPrefill(
    '?category=service&service=acestudio#contact-form',
    { template: 'About {service}' },
  )
  assert.equal(category.value, 'AceStudioについて')
  assert.equal(subject.value, 'About AceStudio')
})

test('利用者が変更した種別へ自動件名だけが追従する', () => {
  const { category, subject } = renderPrefill(
    '?category=service&service=acecore-design',
  )
  category.value = 'ITスクール / Acecore Schoolsについて'
  category.dispatchEvent(new Event('change'))
  assert.equal(subject.value, 'Acecore Schoolsについて')
  category.value = 'パートナーシップ'
  category.dispatchEvent(new Event('change'))
  assert.equal(subject.value, '')
})

test('手入力した件名は種別変更や再初期化で書き換えない', () => {
  const { category, subject, pageEvents } = renderPrefill(
    '?category=service&service=acecore-design',
  )
  subject.value = '個別に相談したい内容'
  subject.dispatchEvent(new Event('input'))
  category.value = 'ITスクール / Acecore Schoolsについて'
  category.dispatchEvent(new Event('change'))
  pageEvents['astro:page-load']()
  assert.equal(category.value, 'ITスクール / Acecore Schoolsについて')
  assert.equal(subject.value, '個別に相談したい内容')
})

test('すでに入力済みの件名を初期選択でも上書きしない', () => {
  const { category, subject } = renderPrefill(
    '?category=service&service=acestudio',
    { subjectValue: '入力済みの相談' },
  )
  assert.equal(subject.value, '入力済みの相談')
  category.value = 'Acecore Designについて'
  category.dispatchEvent(new Event('change'))
  assert.equal(subject.value, '入力済みの相談')
})

test('未知のserviceを件名へ反映せず共通窓口へ戻す', () => {
  const { category, subject } = renderPrefill(
    '?category=service&service=%3Cscript%3E',
  )
  assert.equal(category.value, 'サービス全般について')
  assert.equal(subject.value, '')
})
