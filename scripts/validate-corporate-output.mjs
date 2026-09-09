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
for (const name of pageNames) {
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
  const about = await getPage(`${prefix}/about/`)
  assert.equal(
    services('.department-list > li').length,
    3,
    `${locale}.services: expected three business departments`,
  )
  for (const [pageName, page] of [
    ['home', home],
    ['about', about],
  ]) {
    assert.equal(
      page('.department-list, .service-offerings').length,
      0,
      `${locale}.${pageName}: departments and services belong on services`,
    )
    for (const key of ['development', 'advisor', 'store']) {
      assert.ok(
        !page('main')
          .text()
          .includes(translations.services[`${key}Description`]),
        `${locale}.${pageName}: repeated service description`,
      )
    }
    assert.equal(
      page('main a[href^="https://"]').length,
      0,
      `${locale}.${pageName}: specialist directory belongs on services`,
    )
  }
  assert.deepEqual(
    home('.home-directory a')
      .toArray()
      .map((el) => home(el).attr('href')),
    ['services', 'about', 'contact'].map((path) => `${prefix}/${path}/`),
    `${locale}.home: page index must lead to individual pages`,
  )
  for (const path of ['services', 'about', 'blog', 'contact']) {
    assert.ok(
      home(`main a[href="${prefix}/${path}/"]`).length > 0,
      `${locale}.home: missing ${path} entry`,
    )
  }
  assert.equal(
    about(`main a[href="${prefix}/services/"]`).length,
    0,
    `${locale}.about: business promotion must not replace corporate content`,
  )
  assert.deepEqual(
    about('main h2')
      .toArray()
      .map((el) => about(el).text().trim()),
    ['companyInfoHeading', 'executiveHeading', 'philosophyHeading'].map(
      (key) => translations.about[key],
    ),
    `${locale}.about: corporate information, leadership and philosophy only`,
  )
  const headings = [home, services, about].map((page) =>
    page('main h2')
      .toArray()
      .map((el) => page(el).text().trim()),
  )
  for (let index = 0; index < headings.length; index++) {
    for (const other of headings.slice(index + 1)) {
      assert.deepEqual(
        headings[index].filter((heading) => other.includes(heading)),
        [],
        `${locale}: page sections must have distinct purposes`,
      )
    }
  }
  assert.ok(
    about('main').text().includes(translations.about.corporateContactCta),
  )
  const offerings = services('.service-offerings')
  assert.equal(
    offerings.find('article').length,
    5,
    `${locale}.services: missing principal service`,
  )
  assert.ok(
    services('h2')
      .toArray()
      .some(
        (heading) =>
          services(heading).text().trim() ===
          translations.services.offeringsHeading,
      ),
  )
  for (const key of [
    'development',
    'advisor',
    'acestudio',
    'aceserver',
    'store',
  ]) {
    assert.ok(
      offerings
        .find('h3')
        .text()
        .includes(translations.services[`${key}Title`]),
      `${locale}.services: missing ${key}`,
    )
  }
  assert.ok(about('main').text().includes(translations.about.establishedDate))
  assert.equal(
    about('#corporate-information-heading').closest('section').find('ol li')
      .length,
    8,
  )
  for (const officer of translations.about.officers)
    assert.ok(about('main').text().includes(officer.bio))
  assert.equal(offerings.find('a').length, 5)
  assert.equal(
    offerings.text().split(translations.services.detailsCta).length - 1,
    5,
  )
  for (const page of [home, services, about]) {
    assert.ok(!page('main').text().includes('ここに反映'))
  }
  for (const id of [
    'systems',
    'schools',
    'design',
    'design-details',
    'development',
    'advisor',
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
    `${prefix}/blog/`,
    `${prefix}/contact/`,
    `${prefix}/privacy/`,
    `${prefix}/terms/`,
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
  'Validated 72 corporate pages, 9 translation sets, CMS fields, service links, anchors and retired pricing output.',
)
