import { defineConfig, presetWind3, transformerDirectives } from 'unocss'

export default defineConfig({
  presets: [presetWind3()],
  transformers: [transformerDirectives()],
  preflights: [
    {
      getCSS: () =>
        'html { scroll-behavior: smooth } [id] { scroll-margin-top: 5rem } main :where(h1,h2,h3,h4,p,li,a) { overflow-wrap: anywhere } @media (max-width: 639px) { main :where(h1,h2,h3,h4,p,li,a) { word-break: break-all } }',
    },
  ],
  theme: {
    colors: {
      brand: {
        50: '#eef6ff',
        100: '#d8eaff',
        200: '#acd3ff',
        300: '#73b2f8',
        400: '#3287e6',
        500: '#0b5fd3',
        600: '#063d91',
        700: '#053373',
        800: '#062c5f',
        900: '#08254d',
      },
    },
    fontFamily: {
      sans: "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', system-ui, sans-serif",
      mono: "'Consolas', 'Monaco', monospace",
    },
  },
  shortcuts: {
    'ac-container': 'max-w-[70rem] mx-auto px-5 sm:px-6 lg:px-8',
    'ac-container-readable': 'max-w-3xl mx-auto px-5 sm:px-6 lg:px-8',
    'ac-readable': 'max-w-3xl',
    'ac-section': 'py-14 sm:py-16 lg:py-20',
    'ac-section-intro': 'max-w-3xl mx-auto text-center mb-10 sm:mb-12',
    'ac-eyebrow': 'text-xs font-800 uppercase text-brand-600 mb-2',
    'ac-heading': 'font-800 leading-tight text-slate-950',
    'ac-muted': 'text-slate-600 leading-relaxed',
    'ac-card':
      'rounded-lg border border-slate-200/90 bg-white shadow-[0_10px_28px_rgba(15,35,56,0.06)]',
    'ac-surface':
      'rounded-lg border border-slate-200/90 bg-white shadow-[0_10px_28px_rgba(15,35,56,0.06)]',
    'ac-chip':
      'inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 min-h-8 text-xs font-700 text-slate-600 no-underline transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600',
    'ac-chip-static':
      'inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 min-h-8 text-xs font-700 text-slate-600',
    'ac-icon-box':
      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-200 bg-brand-50 text-brand-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]',
    'ac-touch':
      'inline-flex min-h-11 min-w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
    'ac-input':
      'w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
    'ac-btn':
      'inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-800 no-underline transition-colors duration-200 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
    'ac-btn-primary':
      'ac-btn bg-brand-600 text-white shadow-[0_10px_24px_rgba(6,61,145,0.18)] hover:bg-brand-700 active:bg-brand-800',
    'ac-btn-secondary':
      'ac-btn border-2 border-brand-600 bg-brand-600 text-white hover:border-brand-700 hover:bg-brand-700 active:border-brand-800 active:bg-brand-800',
    'ac-btn-outline':
      'ac-btn border-2 border-brand-600 bg-white text-brand-600 hover:bg-brand-50',
    'ac-link':
      'text-brand-600 underline underline-offset-2 hover:text-brand-700 transition-colors',
    'ac-blueprint-soft':
      'bg-[linear-gradient(rgba(11,95,211,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(11,95,211,0.055)_1px,transparent_1px)] bg-[size:28px_28px]',
    'ac-rule-top':
      'relative before:absolute before:left-0 before:top-0 before:h-0.5 before:w-12 before:bg-brand-600',
  },
})
