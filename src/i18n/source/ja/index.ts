import blogTranslations from './blog.json'
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

type CampaignTone = 'brand' | 'amber' | 'emerald' | 'slate'
type CampaignEntryType = 'announcement' | 'page-notice'

type CampaignEntry = {
  id: string
  type: CampaignEntryType
  adminTitle?: string
  page?: string
  placement?: string
  enabled?: boolean
  eyebrow?: string
  message?: string
  title?: string
  body?: string
  href?: string
  ctaLabel?: string
  icon?: string
  tone?: CampaignTone
  startsAt?: string
  endsAt?: string
  order?: number
}

const campaignEntryModules = import.meta.glob('./campaigns/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, CampaignEntry>

const campaignEntries = Object.values(campaignEntryModules).sort(
  (a, b) =>
    (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id, 'ja'),
)

const pageNoticePlacements: Record<string, string> = {
  home: 'home-after-hero',
  services: 'services-after-hero',
  works: 'works-after-hero',
  about: 'about-after-hero',
  contact: 'contact-after-hero',
  schools: 'schools-after-hero',
  acestudio: 'acestudio-after-hero',
}

const getCampaignPlacement = (entry: CampaignEntry): string | undefined =>
  entry.placement ?? (entry.page ? pageNoticePlacements[entry.page] : undefined)

const announcements = campaignEntries
  .filter((entry) => entry.type === 'announcement')
  .map(
    ({
      enabled,
      eyebrow,
      message,
      href,
      ctaLabel,
      startsAt,
      endsAt,
      tone,
    }) => ({
      enabled,
      eyebrow,
      message,
      href,
      ctaLabel,
      startsAt,
      endsAt,
      tone,
    }),
  )

const campaignNotices = campaignEntries
  .filter((entry) => entry.type === 'page-notice')
  .map(
    ({
      id,
      page,
      placement,
      enabled,
      eyebrow,
      title,
      body,
      href,
      ctaLabel,
      icon,
      tone,
      startsAt,
      endsAt,
    }) => ({
      id,
      page,
      placement: getCampaignPlacement({
        id,
        type: 'page-notice',
        page,
        placement,
      }),
      enabled,
      eyebrow,
      title,
      body,
      href,
      ctaLabel,
      icon,
      tone,
      startsAt,
      endsAt,
    }),
  )

const campaignTranslations = {
  campaignEntries,
  announcements,
  announcement: announcements[0],
  campaignNotices,
}

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
