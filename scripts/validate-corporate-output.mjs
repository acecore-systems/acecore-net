import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { load } from 'cheerio'
import { load as parseYaml } from 'js-yaml'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const searchCorpus = JSON.parse(await read('.vectorize/corpus.json'))
const castRegistration = JSON.parse(await read('src/data/cast-scenes.json'))
const castPath = (stem) =>
  castRegistration.assets.find((asset) => asset.id === 'net--' + stem).localPath
const locales = ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru']
const pageNames = [
  'home',
  'services',
  'about',
  'acestudio',
  'pricing',
  'contact',
]
const sourceBlog = JSON.parse(await read('src/i18n/source/ja/blog.json'))
const sourceCommon = JSON.parse(await read('src/i18n/source/ja/common.json'))
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
  const translated =
    locale === 'ja'
      ? { ...sourceCommon, pages: source, blog: sourceBlog }
      : JSON.parse(await read(`src/i18n/translations/${locale}.json`))
  const translations = translated.pages
  for (const name of pageNames)
    checkShape(source[name], translations[name], `${locale}.${name}`)
  checkShape(sourceBlog, translated.blog, `${locale}.blog`)
  checkShape(sourceCommon.meta, translated.meta, `${locale}.meta`)
  checkShape(sourceCommon.footer, translated.footer, `${locale}.footer`)
  checkShape(sourceCommon.common, translated.common, `${locale}.common`)
  checkShape(sourceCommon.nav, translated.nav, `${locale}.nav`)
  checkShape(
    sourceCommon.pageNames,
    translated.pageNames,
    `${locale}.pageNames`,
  )
  const getPage = async (path) => load(await read(`dist${path}index.html`))
  const services = await getPage(`${prefix}/services/`)
  assert.ok(!sitemap.includes(`https://acecore.net${prefix}/designs/`))
  assert.ok(
    !searchCorpus.chunks.some(
      (chunk) => chunk.metadata.url === `${prefix}/designs/`,
    ),
  )
  await assert.rejects(
    access(new URL(`dist${prefix}/designs/index.html`, root)),
    { code: 'ENOENT' },
  )
  const redirects = await read('dist/_redirects')
  for (const suffix of ['', '/'])
    assert.ok(
      redirects.includes(
        `${prefix}/designs${suffix} https://designs.acecore.net${prefix}/ 301`,
      ),
    )
  assert.equal(
    services(`#pricing a[href="https://designs.acecore.net${prefix}/#catalog"]`)
      .length,
    1,
  )
  const home = await getPage(`${prefix}/`)
  const about = await getPage(`${prefix}/about/`)
  assert.equal(
    translated.common.pageContents?.trim().length > 0,
    true,
    `${locale}: missing page navigation label`,
  )
  for (const [pageName, page, expectedTargets] of [
    ['services', services, ['departments', 'offerings', 'pricing']],
    [
      'about',
      about,
      [
        'corporate-philosophy-heading',
        'corporate-vision-heading',
        'corporate-information-heading',
        'executive-profile-heading',
      ],
    ],
  ]) {
    const navigation = page('nav.page-section-nav')
    assert.equal(navigation.length, 1, `${locale}.${pageName}: page navigation`)
    assert.equal(navigation.attr('aria-label'), translated.common.pageContents)
    assert.deepEqual(
      navigation
        .find('a')
        .toArray()
        .map((el) => page(el).attr('href')),
      expectedTargets.map((id) => `#${id}`),
      `${locale}.${pageName}: page navigation destinations`,
    )
    for (const id of expectedTargets)
      assert.equal(
        page(`[id="${id}"]`).length,
        1,
        `${locale}.${pageName}: missing or duplicate page navigation target #${id}`,
      )
  }
  assert.equal(
    home('.home-business h2').text().trim(),
    translations.home.servicesHeading,
  )
  assert.equal(
    home('.hero-copy a').length,
    1,
    `${locale}: the hero has one business entry`,
  )
  assert.equal(
    services('#pricing a').filter((_, el) =>
      services(el).text().includes(translations.services.pricingCta),
    ).length,
    3,
    `${locale}.services: pricing links must name their destination`,
  )
  const motto = translations.home.heroTitle
  assert.equal(
    translations.about.philosophyMotto,
    motto,
    `${locale}: home and corporate philosophy catchphrases must agree`,
  )
  assert.equal(
    translated.footer.tagline,
    motto,
    `${locale}: footer and home catchphrases must agree`,
  )
  assert.equal(home('main h1').text().trim(), motto)
  assert.ok(home('footer').text().includes(motto))
  const philosophy = about('#corporate-philosophy-heading').closest('section')
  assert.equal(
    services('.business-overview').length,
    0,
    `${locale}: departments have one overview`,
  )
  assert.equal(
    philosophy.find('figure').length,
    1,
    `${locale}: one contextual philosophy image`,
  )
  assert.equal(
    philosophy.find('figcaption').text().trim(),
    translations.about.workshopCaption,
  )
  assert.equal(
    about('#corporate-information-heading').closest('section').find('figure')
      .length,
    0,
    `${locale}: illustrative scenes must not be presented as corporate records`,
  )
  assert.equal(philosophy.find('.philosophy-motto').text().trim(), motto)
  for (const [selector, paragraphs] of [
    ['.philosophy-body > p', translations.about.philosophyParagraphs],
    ['.vision-body > p', translations.about.visionParagraphs],
  ]) {
    assert.deepEqual(
      philosophy
        .find(selector)
        .toArray()
        .map((el) => about(el).text().trim()),
      paragraphs,
      `${locale}: philosophy and vision paragraphs must be published in order`,
    )
  }
  assert.equal(
    philosophy.find('h3').text().trim(),
    translations.about.visionHeading,
  )
  assert.ok(philosophy.text().includes(translations.about.visionMotto))
  assert.ok(
    home('meta[name="description"]').attr('content').includes(motto),
    `${locale}: home metadata must reflect the official catchphrase`,
  )
  assert.equal(home('.hero-copy a').attr('href'), prefix + '/services/')
  assert.equal(home('.hero-copy a').attr('data-ga-label'), 'hero_services')
  const heroImages = JSON.parse(home('#hero-slider').attr('data-hero-images'))
  assert.equal(heroImages.length, 2, locale + ': preserve two-slide hero')
  assert.equal(heroImages[0].src, castPath('home-team'))
  assert.equal(heroImages[1].src, castPath('home-meeting'))
  assert.equal(heroImages[0].alt, translations.home.heroImgTeam)
  assert.equal(heroImages[1].alt, translations.home.heroImgMeeting)
  assert.equal(
    about('.about-cast-scene img').attr('src'),
    castPath('about-hero'),
  )
  assert.equal(
    about('.about-cast-scene img').attr('alt'),
    translations.about.heroImgAlt,
  )
  assert.equal(philosophy.find('img').attr('src'), castPath('about-workshop'))
  assert.equal(
    philosophy.find('img').attr('alt'),
    translations.about.workshopImgAlt,
  )
  assert.equal(home('#hero-pause').length, 1)
  assert.equal(home('.hero-dot').length, 2)
  for (const key of ['systems', 'schools', 'design']) {
    const department = services('#' + key)
    const theme = key === 'design' ? 'designs' : key
    assert.equal(
      department.find('[data-department]').attr('data-department'),
      theme,
    )
    assert.equal(
      home('.home-department-row[href$="#' + key + '"]').attr(
        'data-department',
      ),
      theme,
    )
    assert.equal(
      department.find('img').attr('alt'),
      translations.services[key + 'ImgAlt'],
    )
    assert.ok(
      department.text().includes(translations.services[key + 'Description']),
    )
    assert.ok(
      department
        .find('img')
        .attr('src')
        .startsWith('/images/redesign/20261023/'),
    )
  }
  services('.service-offerings a').each((_, row) => {
    assert.equal(
      services(row).children('span').first().children('svg').length,
      1,
    )
    assert.equal(services(row).attr('data-ga-event'), 'cta_click')
  })
  const contact = await getPage(`${prefix}/contact/`)
  const studio = await getPage(`${prefix}/acestudio/`)
  const offeringNames = JSON.parse(
    contact('[data-creative-offerings]').attr('data-creative-offerings'),
  )
  assert.deepEqual(offeringNames, translations.contact.creativeOfferings)
  assert.equal(Object.keys(offeringNames['acecore-design']).length, 13)
  assert.equal(Object.keys(offeringNames.education).length, 4)
  assert.equal(
    services('#design a').attr('href'),
    `https://designs.acecore.net${prefix}/`,
    `${locale}: Design must preserve its inquiry context`,
  )
  assert.equal(
    contact('option[data-service-key="acecore-design"]').text().trim(),
    translations.contact.formCategoryServiceDesign,
  )
  assert.equal(
    contact('option[data-service-key="acecore-design"]').attr('value'),
    'Acecore Designsについて',
  )
  assert.equal(contact('#scroll-to-top').length, 0)
  assert.ok(contact('#ace-ai-chat-toggle').hasClass('hidden'))
  assert.equal(
    contact('[data-ace-chat-open]').attr('aria-controls'),
    'ace-ai-chat-panel',
  )
  assert.equal(services('#scroll-to-top').length, 1)
  assert.ok(services('#ace-ai-chat-toggle').hasClass('ac-chat__toggle'))
  assert.equal(services('#ace-ai-chat-toggle').hasClass('hidden'), false)
  assert.ok(studio('main').text().includes(translations.acestudio.statusBody))
  assert.equal(
    studio(
      `main a[href="${prefix}/contact/?category=service&service=acestudio#contact-form"]`,
    ).length,
    1,
  )
  for (const slug of ['service-introduction', 'website-renewal']) {
    const post = await getPage(`${prefix}/blog/${slug}/`)
    const newsNavigation = post(
      `main nav[aria-label="${translated.blog.backToBlog}"]`,
    )
    assert.equal(newsNavigation.find(`a[href="${prefix}/blog/"]`).length, 1)
    assert.equal(post('main .ac-surface[data-pagefind-ignore]').length, 0)
    const continuation = post(
      'main nav[aria-label="' +
        translated.blog.postNavLabel +
        '"] a, main .article-body > section[data-pagefind-ignore] a',
    )
      .toArray()
      .map((el) => post(el).attr('href'))
    assert.equal(
      new Set(continuation).size,
      continuation.length,
      `${locale}.${slug}: repeated reading destination`,
    )
  }
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
    home('.home-department-preview a')
      .toArray()
      .map((el) => home(el).attr('href')),
    ['systems', 'schools', 'design'].map((id) => prefix + '/services/#' + id),
    locale + ': business previews lead to real detail sections',
  )
  assert.ok(home('main').text().includes(translations.home.servicesIntro))
  assert.ok(home('main').text().includes(translations.home.aboutIntro))
  assert.ok(home('main').text().includes(translations.home.contactIntro))
  assert.equal(home('.contact-band a').attr('data-ga-event'), 'cta_click')
  assert.equal(
    home('.contact-band a').attr('data-ga-label'),
    translated.nav.contact,
  )
  assert.equal(home('.contact-band a').attr('data-ga-location'), 'service_card')
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
    ['philosophyHeading', 'companyInfoHeading', 'executiveHeading'].map(
      (key) => translations.about[key],
    ),
    `${locale}.about: philosophy, corporate information and leadership`,
  )
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
      !/pages\.(?:home|services|designs|about|acestudio|pricing)\./.test(
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
  'Validated 72 corporate pages, 18 news article routes, 9 translation sets, CMS fields, complete philosophy and vision, responsive hero controls, image context, inquiry context, analytics, floating controls, service destinations and retired pricing output.',
)
