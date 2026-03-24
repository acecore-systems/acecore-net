import {
  defineConfig,
  presetWind3,
  presetAttributify,
  presetIcons,
  transformerDirectives,
} from 'unocss'
import presetTypography from '@unocss/preset-typography'

export default defineConfig({
  presets: [
    presetWind3(),
    presetAttributify(),
    presetIcons(),
    presetTypography(),
  ],
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
      sans: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif",
      mono: "'Consolas', 'Monaco', monospace",
    },
  },
  shortcuts: {
    'ac-container': 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8',
    'ac-section': 'py-16 sm:py-20 lg:py-24',
    'ac-heading': 'font-800 tracking-tight text-slate-900',
    'ac-muted': 'text-slate-600',
    'ac-card': 'rounded-xl border border-slate-200 bg-white shadow-sm',
    'ac-btn':
      'inline-flex items-center justify-center rounded-lg px-6 py-3 font-600 transition-all duration-200 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
    'ac-btn-primary':
      'ac-btn bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
    'ac-btn-outline':
      'ac-btn border-2 border-brand-500 text-brand-500 hover:bg-brand-50',
    'ac-link':
      'text-brand-500 underline underline-offset-2 hover:text-brand-600 transition-colors',
  },
})
