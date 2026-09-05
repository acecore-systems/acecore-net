import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { load } from 'cheerio'
import { load as parseYaml } from 'js-yaml'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const locales = ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru']
const pageNames = ['home', 'services', 'about', 'acestudio', 'pricing']
const source = Object.fromEntries(
  await Promise.all(
    pageNames.map(async (name) => [
      name,
      JSON.parse(await read(`src/i18n/source/ja/pages/${name}.json`)),
    ]),
  ),
)

function checkShape(reference, value, scope) {
  if (Array.isArray(reference)) {
    assert.ok(Array.isArray(value), `${scope}: missing translated list`)
    assert.equal(
      value.length,
      reference.length,
      `${scope}: translated list length`,
    )
    reference.forEach((item, index) =>
      checkShape(item, value[index], `${scope}.${index}`),
    )
  } else if (reference && typeof reference === 'object') {
    assert.deepEqual(
      Object.keys(value ?? {}).sort(),
      Object.keys(reference).sort(),
      `${scope}: translation keys`,
    )
    for (const [key, item] of Object.entries(reference))
      checkShape(item, value[key], `${scope}.${key}`)
  } else {
    assert.equal(
      typeof value,
      typeof reference,
      `${scope}: translated value type`,
    )
    if (typeof value === 'string')
      assert.ok(value.trim(), `${scope}: empty translation`)
  }
}

const cms = parseYaml(await read('public/admin/config.yml'))
const cmsFiles = cms.collections.flatMap((collection) => collection.files ?? [])
for (const name of ['home', 'services', 'pricing']) {
  const file = cmsFiles.find(
    (item) => item.file === `src/i18n/source/ja/pages/${name}.json`,
  )
  assert.deepEqual(
    file?.fields.map((field) => field.name).sort(),
    Object.keys(source[name]).sort(),
    `${name}: CMS fields must match published source`,
  )
}

const sitemap = await read('dist/sitemap-0.xml')
for (const locale of locales) {
  const prefix = locale === 'ja' ? '' : `/${locale}`
  const translations =
    locale === 'ja'
      ? source
      : JSON.parse(await read(`src/i18n/translations/${locale}.json`)).pages
  for (const name of pageNames)
    checkShape(source[name], translations[name], `${locale}.${name}`)
  const getPage = async (path) => load(await read(`dist${path}index.html`))
  const services = await getPage(`${prefix}/services/`)
  const home = await getPage(`${prefix}/`)
  for (const id of [
    'systems',
    'schools',
    'design',
    'development',
    'advisor',
    'learning',
    'aceserver-service',
    'store-service',
    'pricing',
  ]) {
    assert.equal(
      services(`[id="${id}"]`).length,
      1,
      `${locale}: missing or duplicate destination #${id}`,
    )
  }
  assert.ok(
    services('#design').text().includes(translations.services.designStatus),
    `${locale}: Design status missing`,
  )
  assert.ok(
    services('main').text().includes(translations.services.acestudioStatus),
    `${locale}: AceStudio status missing`,
  )
  assert.equal(
    services('#learning a').attr('href'),
    'https://schools.acecore.net/learning/',
  )
  for (const [id, path] of [
    ['development', 'development'],
    ['advisor', 'it-advisor'],
  ]) {
    assert.equal(
      services(`#${id} a`).attr('href'),
      `https://systems.acecore.net${prefix}/services/${path}/`,
    )
  }
  assert.equal(
    services('#pricing a[href="https://schools.acecore.net/pricing/"]').length,
    1,
  )
  assert.equal(
    services(`#pricing a[href="https://systems.acecore.net${prefix}/pricing/"]`)
      .length,
    1,
  )
  for (const element of home('main a[href*="/services/#"]').toArray()) {
    const destination = new URL(
      home(element).attr('href'),
      'https://acecore.net',
    )
    assert.equal(destination.pathname, `${prefix}/services/`)
    assert.equal(
      services(`[id="${destination.hash.slice(1)}"]`).length,
      1,
      `${locale}: broken home anchor ${destination.hash}`,
    )
  }
  assert.ok(
    !sitemap.includes(`https://acecore.net${prefix}/pricing/`),
    `${locale}: retired pricing URL in sitemap`,
  )
  await assert.rejects(
    access(new URL(`dist${prefix}/pricing/index.html`, root)),
    { code: 'ENOENT' },
  )
  for (const path of [
    `${prefix}/`,
    `${prefix}/services/`,
    `${prefix}/about/`,
    `${prefix}/acestudio/`,
  ]) {
    const page = await getPage(path)
    assert.equal(page('h1').length, 1, `${path}: expected one main heading`)
    assert.ok(
      !/pages\.(?:home|services|about|acestudio|pricing)\./.test(
        page('body').text(),
      ),
      `${path}: untranslated key in rendered page`,
    )
    assert.equal(
      page('header a, footer a').filter(
        (_, element) =>
          new URL(page(element).attr('href'), 'https://acecore.net')
            .pathname === `${prefix}/pricing/`,
      ).length,
      0,
      `${path}: obsolete pricing navigation`,
    )
  }
}
console.log(
  'Validated 36 corporate pages, 9 translation sets, CMS fields, service links, anchors and retired pricing output.',
)
