import { useEffect, useState } from 'react'

export type ThemeId = 'monkeyap' | 'oceano' | 'floresta' | 'areia'

export const THEMES: { id: ThemeId; label: string; bg: string; accent: string }[] = [
  { id: 'monkeyap', label: 'MonkeYap', bg: '#393634', accent: '#e2b714' },
  { id: 'oceano',   label: 'Oceano',   bg: '#1e2837', accent: '#5b9cf6' },
  { id: 'floresta', label: 'Floresta', bg: '#1a2a1e', accent: '#52c17d' },
  { id: 'areia',    label: 'Areia',    bg: '#f2ede6', accent: '#c07b3a' },
]

const THEME_VARS: Record<ThemeId, Record<string, string>> = {
  monkeyap: {
    '--color-bg-rgb':     '57 54 52',
    '--color-panel-rgb':  '44 46 49',
    '--color-border-rgb': '58 60 63',
    '--color-main-rgb':   '226 183 20',
    '--color-sub-rgb':    '100 102 105',
    '--color-text-rgb':   '209 208 197',
    '--color-error-rgb':  '202 71 84',
    '--color-bg':         '#393634',
    '--color-panel':      '#2c2e31',
    '--color-border':     '#3a3c3f',
    '--color-main':       '#e2b714',
    '--color-sub':        '#646669',
    '--color-text':       '#d1d0c5',
    '--color-error':      '#ca4754',
    '--logo-filter':      'none',
  },
  oceano: {
    '--color-bg-rgb':     '30 40 55',
    '--color-panel-rgb':  '22 32 46',
    '--color-border-rgb': '42 53 72',
    '--color-main-rgb':   '91 156 246',
    '--color-sub-rgb':    '74 101 128',
    '--color-text-rgb':   '200 216 234',
    '--color-error-rgb':  '224 82 82',
    '--color-bg':         '#1e2837',
    '--color-panel':      '#16202e',
    '--color-border':     '#2a3548',
    '--color-main':       '#5b9cf6',
    '--color-sub':        '#4a6580',
    '--color-text':       '#c8d8ea',
    '--color-error':      '#e05252',
    '--logo-filter':      'hue-rotate(170deg) saturate(110%) brightness(130%)',
  },
  floresta: {
    '--color-bg-rgb':     '26 42 30',
    '--color-panel-rgb':  '20 34 26',
    '--color-border-rgb': '37 61 44',
    '--color-main-rgb':   '82 193 125',
    '--color-sub-rgb':    '74 109 83',
    '--color-text-rgb':   '197 224 204',
    '--color-error-rgb':  '224 82 82',
    '--color-bg':         '#1a2a1e',
    '--color-panel':      '#14221a',
    '--color-border':     '#253d2c',
    '--color-main':       '#52c17d',
    '--color-sub':        '#4a6d53',
    '--color-text':       '#c5e0cc',
    '--color-error':      '#e05252',
    '--logo-filter':      'hue-rotate(96deg) saturate(60%) brightness(108%)',
  },
  areia: {
    '--color-bg-rgb':     '242 237 230',
    '--color-panel-rgb':  '230 221 211',
    '--color-border-rgb': '208 196 181',
    '--color-main-rgb':   '192 123 58',
    '--color-sub-rgb':    '138 116 104',
    '--color-text-rgb':   '44 36 22',
    '--color-error-rgb':  '192 57 43',
    '--color-bg':         '#f2ede6',
    '--color-panel':      '#e6ddd3',
    '--color-border':     '#d0c4b5',
    '--color-main':       '#c07b3a',
    '--color-sub':        '#8a7468',
    '--color-text':       '#2c2416',
    '--color-error':      '#c0392b',
    '--logo-filter':      'hue-rotate(-20deg) saturate(72%) brightness(93%)',
  },
}

function applyTheme(id: ThemeId) {
  const root = document.documentElement
  const vars = THEME_VARS[id]
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(
    () => (localStorage.getItem('monkeyap-theme') as ThemeId | null) ?? 'monkeyap'
  )

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('monkeyap-theme', theme)
  }, [theme])

  return { theme, setTheme: setThemeState }
}
