import { useEffect, useRef, useState } from 'react'
import { THEMES } from '../hooks/useTheme'
import type { ThemeId } from '../hooks/useTheme'

interface Props {
  theme:    ThemeId
  setTheme: (t: ThemeId) => void
}

export function SettingsMenu({ theme, setTheme }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="fixed bottom-5 right-6 z-50">
      <button
        onClick={() => setOpen(o => !o)}
        title="Configurações"
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-200 ${
          open ? 'text-main' : 'text-sub hover:text-text'
        }`}
        style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease, color 0.2s ease' }}
      >
        <GearIcon />
      </button>

      {open && (
        <div className="absolute bottom-12 right-0 bg-panel border border-border/30 rounded-2xl p-4 w-52 shadow-2xl animate-fade-in">
          <p className="text-sub text-xs font-mono uppercase tracking-widest mb-3">tema</p>
          <div className="space-y-1">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-mono text-sm transition-all duration-150 cursor-pointer ${
                  theme === t.id
                    ? 'text-main bg-bg'
                    : 'text-sub hover:text-text hover:bg-bg/50'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${t.bg} 50%, ${t.accent} 50%)`,
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
                  }}
                />
                {t.label}
                {theme === t.id && <span className="ml-auto opacity-50 text-xs">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
