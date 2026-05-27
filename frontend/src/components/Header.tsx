import { useEffect, useRef, useState } from 'react'
import { THEMES } from '../hooks/useTheme'
import type { ThemeId } from '../hooks/useTheme'

interface Props {
  theme:    ThemeId
  setTheme: (t: ThemeId) => void
}

export function Header({ theme, setTheme }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = THEMES.find(t => t.id === theme)!

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <header className="w-full px-8 py-4 flex items-center justify-between shrink-0 relative">
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 select-none cursor-default">
        <img src="/logo.png" alt="MonkeYap" className="h-7 w-7 object-contain" />
        <span className="font-mono font-bold text-xl tracking-tight">
          <span style={{ color: 'var(--color-main)' }}>monke</span>
          <span style={{ color: 'var(--color-text)' }}>yap</span>
        </span>
      </div>

      {/* ── Nav direita ── */}
      <div ref={ref} className="relative flex items-center gap-1">
        <button
          onClick={() => setOpen(o => !o)}
          title="Temas"
          className={[
            'flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm transition-colors duration-150 cursor-pointer',
            open ? 'text-main' : 'text-sub hover:text-text',
          ].join(' ')}
        >
          <span
            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
            style={{
              background:  `linear-gradient(135deg, ${current.bg} 50%, ${current.accent} 50%)`,
              boxShadow:   '0 0 0 1px rgba(255,255,255,0.1)',
            }}
          />
          <span>{current.label}</span>
          <ChevronIcon open={open} />
        </button>

        {open && (
          <div className="absolute top-10 right-0 bg-panel border border-border/30 rounded-2xl p-3 w-48 shadow-2xl z-50 animate-fade-in">
            <p className="text-sub text-xs font-mono uppercase tracking-widest mb-2 px-1">tema</p>
            <div className="space-y-0.5">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setOpen(false) }}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl font-mono text-sm transition-all duration-150 cursor-pointer',
                    theme === t.id ? 'text-main bg-bg' : 'text-sub hover:text-text hover:bg-bg/50',
                  ].join(' ')}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${t.bg} 50%, ${t.accent} 50%)`,
                      boxShadow:  '0 0 0 1px rgba(255,255,255,0.1)',
                    }}
                  />
                  {t.label}
                  {theme === t.id && <span className="ml-auto text-xs opacity-50">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
    >
      <path d="M2 4l4 4 4-4" />
    </svg>
  )
}
