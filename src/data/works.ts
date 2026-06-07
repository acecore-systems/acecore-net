import type { Locale } from '../i18n'

type Tone = 'brand' | 'emerald' | 'amber' | 'slate'

export interface HomeStat {
  value: string
  label: string
  description: string
  icon: string
  tone: Tone
}

export interface WorkCase {
  id: string
  title: string
  category: string
  summary: string
  challenge: string
  proposal: string
  result: string
  image: string
  imageAlt: string
  externalUrl?: string
  externalLabel?: string
  icon: string
  tone: Tone
  tags: string[]
}

export interface ServiceWorkLink {
  label: string
  title: string
  href: string
}

interface WorksCopy {
  title: string
  description: string
  heroTitle: string
  heroSubtitle: string
  heroImgAlt: string
  homeHeading: string
  homeLead: string
  homeCta: string
  stats: HomeStat[]
  introEyebrow: string
  introTitle: string
  introBody: string
  casesHeading: string
  challengeLabel: string
  proposalLabel: string
  resultLabel: string
  relatedServicesHeading: string
  relatedServicesBody: string
  relatedServicesCta: string
  contactCtaHeading: string
  contactCtaBody: string
  contactCtaButton: string
  cases: WorkCase[]
  serviceLinks: {
    systemDev: ServiceWorkLink
    server: ServiceWorkLink
    web: ServiceWorkLink
    design: ServiceWorkLink
    education: ServiceWorkLink
    aceserver: ServiceWorkLink
  }
}

const jaWorksCopy: WorksCopy = {
  title: '実績・ポートフォリオ',
  description:
    'Acecoreの実績・ポートフォリオ。Web制作、サーバー運用、IT教育など、課題から提案、成果までの取り組みをご紹介します。',
  heroTitle: '実績・ポートフォリオ',
  heroSubtitle:
    'Web制作、サーバー運用、教育支援まで。Acecoreが実際に積み上げてきた取り組みを、課題・提案・成果で紹介します。',
  heroImgAlt: 'プロジェクト成果を確認するチーム',
  homeHeading: '数字で見る Acecore',
  homeLead:
    '開発、運用、デザイン、教育を一つの窓口で扱い、公開後の改善まで継続して支えます。',
  homeCta: '実績を見る',
  stats: [
    {
      value: '5領域',
      label: '横断支援',
      description:
        'システム開発、Web制作、サーバー運用、デザイン、IT教育をまとめて相談できます。',
      icon: 'layers-3',
      tone: 'brand',
    },
    {
      value: '数百人規模',
      label: '同時接続の運用知見',
      description:
        'Aceserverの公開サーバー運用で培った安定化と改善の経験があります。',
      icon: 'server-cog',
      tone: 'emerald',
    },
    {
      value: '5事例',
      label: '公開中の取り組み',
      description:
        'Web、ポータル、インフラ、教育の代表的な事例を課題から成果まで確認できます。',
      icon: 'briefcase-business',
      tone: 'amber',
    },
    {
      value: '1窓口',
      label: '相談から改善まで',
      description: '要件整理、制作、公開後の保守を分断せずに進めます。',
      icon: 'message-circle',
      tone: 'slate',
    },
  ],
  introEyebrow: 'Portfolio',
  introTitle: '課題から成果まで見える事例集',
  introBody:
    '華やかな制作物だけでなく、運用を続けるための設計、情報整理、学習支援までを含めて紹介しています。',
  casesHeading: '掲載事例',
  challengeLabel: '課題',
  proposalLabel: '提案',
  resultLabel: '成果',
  relatedServicesHeading: '関連サービスから探す',
  relatedServicesBody:
    '各サービスの詳細ページからも、関連する実績へすぐ移動できます。',
  relatedServicesCta: 'サービス一覧を見る',
  contactCtaHeading: '近い課題があれば、まずはご相談ください',
  contactCtaBody:
    'まだ要件が固まっていない段階でも大丈夫です。目的、制約、優先順位の整理から一緒に進めます。',
  contactCtaButton: '無料で相談する',
  cases: [
    {
      id: 'hatt-homepage',
      title: 'Hattのホームページ制作',
      category: 'Web制作・CMS構築',
      summary:
        '絵、小説、VRChat向け3Dアバター・ギミック制作をまとめる個人サイトを、AstroとSveltia CMSで公開しました。',
      challenge:
        '創作活動がブログ、外部投稿サイト、BOOTH、YouTube、Xに分散し、初めて訪れる人が活動全体を把握しにくい状態でした。',
      proposal:
        'トップページに「絵」「小説」「モデリング」の3本柱を置き、ブログ、作品紹介、プロフィール、外部リンクを静的サイトとして整理しました。',
      result:
        'Hattの創作活動を一つの入口に集約し、CMS更新、サイト内検索、OGP、サイトマップまで備えた継続発信の基盤になりました。',
      image: '/uploads/hatt-homepage-screenshot.png',
      imageAlt: 'Hattのホームページのカバー画像',
      externalUrl: 'https://hatt.acecore.net/',
      externalLabel: 'サイトを見る',
      icon: 'palette',
      tone: 'brand',
      tags: ['Web制作', 'CMS', 'Astro', 'ポートフォリオ'],
    },
    {
      id: 'aceserver-portal',
      title: 'エースサーバーポータル制作',
      category: 'Web制作・コミュニティポータル',
      summary:
        '誰でも参加可能なMinecraft無料公開サーバーの入口として、サーバー紹介、動画、ワールドマップ、Wiki、Discord導線をまとめたポータルサイトを構築しました。',
      challenge:
        '参加前に知りたい情報がDiscord、Wiki、動画、ワールドマップに分かれ、初めて訪れる人がサーバーの概要や次の行動を把握しにくい状態でした。',
      proposal:
        'AstroとUnoCSSで軽量な静的ポータルを構築し、Sveltia CMSでトップページやサイト設定を更新できるようにして、Java版・統合版の参加導線を整理しました。',
      result:
        'サーバー概要、参加案内、ワールドマップ、Wikiを一つの入口から案内できるようになり、コミュニティ運営側も情報を継続更新しやすい基盤になりました。',
      image: 'https://asv.acecore.net/uploads/legacy-scc.png',
      imageAlt: 'エースサーバーポータルで紹介している街区のスクリーンショット',
      externalUrl: 'https://asv.acecore.net/',
      externalLabel: 'サイトを見る',
      icon: 'map',
      tone: 'emerald',
      tags: ['Web制作', 'CMS', 'Astro', 'Minecraft'],
    },
    {
      id: 'acecore-net',
      title: 'Acecore公式サイトの多言語・高速化基盤',
      category: 'Web制作・運用',
      summary:
        'サービス内容、ブログ、問い合わせ導線を一つの静的サイトに整理し、多言語展開と高速表示を両立しました。',
      challenge:
        'サービスの幅が広く、訪問者が「何を相談できるのか」を短時間で判断しにくい状態でした。',
      proposal:
        'Astroを軸にページ構成とコンテンツ導線を整理し、画像最適化、SEO、アクセシビリティを制作フローに組み込みました。',
      result:
        'サービス理解から問い合わせまでの流れを明確化し、ブログや多言語ページを継続的に追加できる基盤になりました。',
      image:
        'https://images.unsplash.com/photo-1547658719-da2b51169166?w=900&h=520&fit=crop&q=80&fm=webp',
      imageAlt: 'Webサイト制作の画面設計',
      icon: 'globe',
      tone: 'brand',
      tags: ['Web制作', 'SEO', '多言語', 'Astro'],
    },
    {
      id: 'aceserver',
      title: 'Aceserverの公開サーバー運用',
      category: 'サーバー運用・コミュニティ',
      summary:
        'Java版・統合版の参加者が集まるマインクラフト公開サーバーを、安定運用とコミュニティ体験の両面から支えています。',
      challenge:
        '参加者の増加に伴い、接続安定性、情報共有、運用ルールを継続的に改善する必要がありました。',
      proposal:
        'サーバー構成、監視、バックアップ、Discordでの案内を整え、技術運用とコミュニティ運営を一体で改善しました。',
      result:
        '数百人規模の同時接続を支えた知見を蓄積し、企業向けのサーバー構築・運用にも活かせる実践的な基盤になりました。',
      image:
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&h=520&fit=crop&q=80&fm=webp',
      imageAlt: 'サーバールームのネットワーク機器',
      icon: 'server-cog',
      tone: 'emerald',
      tags: ['サーバー運用', 'コミュニティ', '監視', 'Minecraft'],
    },
    {
      id: 'schools',
      title: 'Acecore Schoolsの個別学習支援',
      category: 'IT教育・伴走支援',
      summary:
        'プログラミング、学習塾、パソコン/スマホ教室など、一人ひとりに合わせた学習メニューを設計しています。',
      challenge:
        '年齢、目的、得意不得意が異なる受講者に対して、同じカリキュラムでは学習効果に差が出やすい状態でした。',
      proposal:
        '初回ヒアリングで目的を整理し、個別指導、実践課題、家庭学習の進め方まで含めた伴走型の支援にしました。',
      result:
        '受講者ごとに進捗を見ながら内容を調整でき、基礎学習から実践プログラミングまで継続しやすい環境になりました。',
      image:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&h=520&fit=crop&q=80&fm=webp',
      imageAlt: 'ノートパソコンで学習する様子',
      icon: 'graduation-cap',
      tone: 'amber',
      tags: ['IT教育', '個別指導', 'プログラミング', '学習支援'],
    },
  ],
  serviceLinks: {
    systemDev: {
      label: '関連事例',
      title: 'Aceserverの公開サーバー運用',
      href: '/works/#case-aceserver',
    },
    server: {
      label: '関連事例',
      title: 'Aceserverの公開サーバー運用',
      href: '/works/#case-aceserver',
    },
    web: {
      label: '関連事例',
      title: 'Hattのホームページ制作',
      href: '/works/#case-hatt-homepage',
    },
    design: {
      label: '関連事例',
      title: 'Hattのホームページ制作',
      href: '/works/#case-hatt-homepage',
    },
    education: {
      label: '関連事例',
      title: 'Acecore Schoolsの個別学習支援',
      href: '/works/#case-schools',
    },
    aceserver: {
      label: '関連事例',
      title: 'Aceserverの公開サーバー運用',
      href: '/works/#case-aceserver',
    },
  },
}

const enWorksCopy: WorksCopy = {
  title: 'Works & Portfolio',
  description:
    'Acecore works and portfolio covering web production, server operations, and IT education, organized by challenge, proposal, and outcome.',
  heroTitle: 'Works & Portfolio',
  heroSubtitle:
    'From web production and server operations to education support, see how Acecore turns practical challenges into working outcomes.',
  heroImgAlt: 'Team reviewing project outcomes',
  homeHeading: 'Acecore by the Numbers',
  homeLead:
    'We support development, operations, design, and education from one contact point through launch and improvement.',
  homeCta: 'View Works',
  stats: [
    {
      value: '5 areas',
      label: 'Cross-functional support',
      description:
        'System development, web production, server operations, design, and IT education can be discussed together.',
      icon: 'layers-3',
      tone: 'brand',
    },
    {
      value: 'Hundreds',
      label: 'Concurrent-connection know-how',
      description:
        'Operational experience from stabilizing and improving the public Aceserver environment.',
      icon: 'server-cog',
      tone: 'emerald',
    },
    {
      value: '5 cases',
      label: 'Published initiatives',
      description:
        'Representative web, portal, infrastructure, and education examples are available from challenge to outcome.',
      icon: 'briefcase-business',
      tone: 'amber',
    },
    {
      value: '1 desk',
      label: 'From consultation to improvement',
      description:
        'Requirements, production, launch, and maintenance stay connected through one workflow.',
      icon: 'message-circle',
      tone: 'slate',
    },
  ],
  introEyebrow: 'Portfolio',
  introTitle: 'Cases that show the path from challenge to outcome',
  introBody:
    'These cases cover not only visible deliverables, but also the design, operations, and learning support needed to keep them working.',
  casesHeading: 'Featured Cases',
  challengeLabel: 'Challenge',
  proposalLabel: 'Proposal',
  resultLabel: 'Outcome',
  relatedServicesHeading: 'Explore by service',
  relatedServicesBody:
    'You can also move directly from each service detail to a related case.',
  relatedServicesCta: 'View Services',
  contactCtaHeading:
    'If your challenge feels similar, start with a consultation',
  contactCtaBody:
    'It is fine if the requirements are not fixed yet. We can clarify goals, constraints, and priorities together.',
  contactCtaButton: 'Free Consultation',
  cases: [
    {
      id: 'hatt-homepage',
      title: 'Website production for Hatt',
      category: 'Web production & CMS setup',
      summary:
        'We launched a personal website for Hatt that brings together artwork, novels, and VRChat-oriented 3D avatar and gimmick production.',
      challenge:
        'Creative activity was spread across blog posts, external publishing sites, BOOTH, YouTube, and X, making the overall portfolio hard to grasp at first visit.',
      proposal:
        'We organized the site around three pillars: artwork, novels, and modeling, then connected blog posts, works, profile information, and external channels in one static site.',
      result:
        'Hatt now has a central entry point for creative activity with CMS updates, site search, OGP, and sitemap support ready for ongoing publishing.',
      image: '/uploads/hatt-homepage-screenshot.png',
      imageAlt: 'Cover image of Hatt website',
      externalUrl: 'https://hatt.acecore.net/',
      externalLabel: 'View Site',
      icon: 'palette',
      tone: 'brand',
      tags: ['Web production', 'CMS', 'Astro', 'Portfolio'],
    },
    {
      id: 'aceserver-portal',
      title: 'Aceserver portal production',
      category: 'Web production & community portal',
      summary:
        'We built a portal for the public Minecraft server Aceserver, bringing together server introduction, videos, world maps, Wiki, and Discord entry points.',
      challenge:
        'Information needed before joining was split across Discord, Wiki, videos, and world maps, making it harder for first-time visitors to understand the server and next steps.',
      proposal:
        'We built a lightweight static portal with Astro and UnoCSS, made top-page and site settings editable through Sveltia CMS, and organized entry paths for both Java and Bedrock players.',
      result:
        'The portal now guides visitors from server overview to joining, world maps, and Wiki content from one entry point, while giving the community team an easier update workflow.',
      image: 'https://asv.acecore.net/uploads/legacy-scc.png',
      imageAlt: 'Screenshot of the Aceserver town area shown on the portal',
      externalUrl: 'https://asv.acecore.net/',
      externalLabel: 'View Site',
      icon: 'map',
      tone: 'emerald',
      tags: ['Web production', 'CMS', 'Astro', 'Minecraft'],
    },
    {
      id: 'acecore-net',
      title: 'Multilingual and high-speed foundation for the Acecore website',
      category: 'Web production & operations',
      summary:
        'Service information, blog content, and contact paths were organized into one static site with multilingual support and fast delivery.',
      challenge:
        'Because Acecore covers a wide range of services, visitors needed a clearer way to understand what they could ask for.',
      proposal:
        'We rebuilt the page structure around Astro and incorporated image optimization, SEO, and accessibility into the production flow.',
      result:
        'The site now gives visitors a clearer route from service discovery to contact, with a foundation that can keep adding blog and multilingual pages.',
      image:
        'https://images.unsplash.com/photo-1547658719-da2b51169166?w=900&h=520&fit=crop&q=80&fm=webp',
      imageAlt: 'Website production interface planning',
      icon: 'globe',
      tone: 'brand',
      tags: ['Web production', 'SEO', 'Multilingual', 'Astro'],
    },
    {
      id: 'aceserver',
      title: 'Public server operations for Aceserver',
      category: 'Server operations & community',
      summary:
        'A public Minecraft server for Java and Bedrock players is supported through both stable operations and community experience design.',
      challenge:
        'As participation grew, connection stability, information sharing, and operating rules needed continuous improvement.',
      proposal:
        'We improved server architecture, monitoring, backups, and Discord guidance as one combined operations workflow.',
      result:
        'The operational knowledge gained from supporting hundreds of concurrent connections now informs Acecore server setup and operations services.',
      image:
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&h=520&fit=crop&q=80&fm=webp',
      imageAlt: 'Network equipment in a server room',
      icon: 'server-cog',
      tone: 'emerald',
      tags: ['Server operations', 'Community', 'Monitoring', 'Minecraft'],
    },
    {
      id: 'schools',
      title: 'Personalized learning support at Acecore Schools',
      category: 'IT education & mentoring',
      summary:
        'Programming, tutoring, and PC or smartphone lessons are designed around each learner instead of forcing one fixed curriculum.',
      challenge:
        'Learners have different ages, goals, and strengths, so a single curriculum can easily create gaps in learning outcomes.',
      proposal:
        'We clarify goals in the first consultation and combine individual instruction, practical tasks, and home-study guidance.',
      result:
        'Lessons can be adjusted while tracking each learner’s progress, making it easier to continue from fundamentals to practical programming.',
      image:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&h=520&fit=crop&q=80&fm=webp',
      imageAlt: 'Learning with a laptop computer',
      icon: 'graduation-cap',
      tone: 'amber',
      tags: ['IT education', 'Tutoring', 'Programming', 'Learning support'],
    },
  ],
  serviceLinks: {
    systemDev: {
      label: 'Related case',
      title: 'Public server operations for Aceserver',
      href: '/works/#case-aceserver',
    },
    server: {
      label: 'Related case',
      title: 'Public server operations for Aceserver',
      href: '/works/#case-aceserver',
    },
    web: {
      label: 'Related case',
      title: 'Website production for Hatt',
      href: '/works/#case-hatt-homepage',
    },
    design: {
      label: 'Related case',
      title: 'Website production for Hatt',
      href: '/works/#case-hatt-homepage',
    },
    education: {
      label: 'Related case',
      title: 'Personalized learning support at Acecore Schools',
      href: '/works/#case-schools',
    },
    aceserver: {
      label: 'Related case',
      title: 'Public server operations for Aceserver',
      href: '/works/#case-aceserver',
    },
  },
}

export function getWorksCopy(locale: Locale): WorksCopy {
  return locale === 'ja' ? jaWorksCopy : enWorksCopy
}
