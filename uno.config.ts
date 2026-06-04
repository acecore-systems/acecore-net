import { defineConfig, presetWind3, transformerDirectives } from 'unocss'

export default defineConfig({
  presets: [presetWind3()],
  transformers: [transformerDirectives()],
  preflights: [
    {
      getCSS: () =>
        'html { scroll-behavior: smooth } [id] { scroll-margin-top: 5rem }',
    },
  ],
  theme: {
    colors: {
      brand: {
        50: '#eef4fb',
        100: '#dbe9f8',
        200: '#b8d3f0',
        300: '#7fa4cf',
        400: '#5282b8',
        500: '#264b7d',
        600: '#1e3f6b',
        700: '#1a365d',
        800: '#142a4a',
        900: '#0f1f38',
      },
    },
    fontFamily: {
      sans: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', system-ui, sans-serif",
      mono: "'Consolas', 'Monaco', monospace",
    },
  },
  shortcuts: {
    'ac-container': 'max-w-[70rem] mx-auto px-5 sm:px-6 lg:px-8',
    'ac-container-readable': 'max-w-3xl mx-auto px-5 sm:px-6 lg:px-8',
    'ac-readable': 'max-w-3xl',
    'ac-section': 'py-14 sm:py-16 lg:py-20',
    'ac-section-intro': 'max-w-3xl mx-auto text-center mb-10 sm:mb-12',
    'ac-eyebrow': 'text-xs font-700 uppercase text-brand-600 mb-2',
    'ac-heading': 'font-800 leading-tight text-slate-900',
    'ac-muted': 'text-slate-600 leading-relaxed',
    'ac-card': 'rounded-lg border border-slate-200 bg-white shadow-sm',
    'ac-surface': 'rounded-lg border border-slate-200 bg-white shadow-sm',
    'ac-chip':
      'inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 min-h-8 text-xs font-600 text-slate-600 no-underline transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600',
    'ac-chip-static':
      'inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 min-h-8 text-xs font-600 text-slate-600',
    'ac-icon-box':
      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-600',
    'ac-touch':
      'inline-flex min-h-11 min-w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
    'ac-input':
      'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
    'ac-btn':
      'inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-700 no-underline transition-colors duration-200 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
    'ac-btn-primary':
      'ac-btn bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
    'ac-btn-outline':
      'ac-btn border-2 border-brand-500 bg-white text-brand-500 hover:bg-brand-50',
    'ac-link':
      'text-brand-500 underline underline-offset-2 hover:text-brand-600 transition-colors',
  },
})
