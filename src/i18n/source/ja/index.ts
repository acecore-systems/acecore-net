import blogTranslations from './blog.json'
import campaignTranslations from './campaigns.json'
import commonTranslations from './common.json'
import legacyTagTranslations from './legacy-tags.json'
import aboutPageTranslations from './pages/about.json'
import acestudioPageTranslations from './pages/acestudio.json'
import contactPageTranslations from './pages/contact.json'
import homePageTranslations from './pages/home.json'
import notFoundPageTranslations from './pages/not-found.json'
import privacyPageTranslations from './pages/privacy.json'
import schoolsPageTranslations from './pages/schools.json'
import servicesPageTranslations from './pages/services.json'

const jaTranslations = {
  ...commonTranslations,
  ...campaignTranslations,
  blog: blogTranslations,
  pages: {
    home: homePageTranslations,
    notFound: notFoundPageTranslations,
    about: aboutPageTranslations,
    services: servicesPageTranslations,
    contact: contactPageTranslations,
    schools: schoolsPageTranslations,
    privacy: privacyPageTranslations,
    acestudio: acestudioPageTranslations,
  },
  tags: legacyTagTranslations,
}

export default jaTranslations
