/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:     'rgb(var(--color-bg-rgb) / <alpha-value>)',
        panel:  'rgb(var(--color-panel-rgb) / <alpha-value>)',
        border: 'rgb(var(--color-border-rgb) / <alpha-value>)',
        main:   'rgb(var(--color-main-rgb) / <alpha-value>)',
        sub:    'rgb(var(--color-sub-rgb) / <alpha-value>)',
        text:   'rgb(var(--color-text-rgb) / <alpha-value>)',
        error:  'rgb(var(--color-error-rgb) / <alpha-value>)',
        red:    'rgb(var(--color-error-rgb) / <alpha-value>)',
        green:  '#00d084',
        orange: 'rgb(var(--color-main-rgb) / <alpha-value>)',
        blue:   '#4a9eff',
        purple: '#9b59b6',
        accent: 'rgb(var(--color-panel-rgb) / <alpha-value>)',
        inp:    'rgb(var(--color-panel-rgb) / <alpha-value>)',
      },
      fontFamily: {
        mono: ['"Roboto Mono"', '"JetBrains Mono"', 'monospace'],
        sans: ['"Roboto Mono"', '"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
