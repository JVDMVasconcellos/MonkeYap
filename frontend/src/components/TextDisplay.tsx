import { useEffect, useRef } from 'react'
import type { TextItem, WordDiff } from '../types'

const C_SPOKEN  = 'var(--color-main)'
const C_CURRENT = 'var(--color-text)'
const C_UNTYPED = 'var(--color-sub)'
const C_ERROR   = 'var(--color-error)'

interface Props {
  item:         TextItem | null
  wordDiff:     WordDiff[]
  matchedCount: number
  isActive:     boolean
}

export function TextDisplay({ item, wordDiff, matchedCount, isActive }: Props) {
  const cursorRef   = useRef<HTMLSpanElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isActive && cursorRef.current && containerRef.current) {
      cursorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [matchedCount, isActive])

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-sub">
        <span className="text-xl">selecione uma categoria para começar</span>
      </div>
    )
  }

  const words      = item.text.split(/\s+/)
  const hasResults = wordDiff.length > 0

  return (
    <div className="w-full space-y-3">
      {/* Título e autor */}
      <div className="flex items-baseline justify-between px-1">
        <span className="text-sub text-base font-mono">{item.title}</span>
        {item.author && <span className="text-sub text-base opacity-60">{item.author}</span>}
      </div>

      {/* Área de texto — MonkeyType style */}
      <div
        className="relative w-full"
        style={{
          height: 'calc(3 * 3rem)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
        }}
      >
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-y-scroll"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Padding top para o fade não cortar a primeira linha */}
          <div style={{ height: '0.75rem' }} />

          <p
            className="font-mono tracking-wide select-none break-words"
            style={{ fontSize: '1.5rem', lineHeight: '3rem' }}
          >
            {hasResults
              // ── Pós-análise: diff posicional ──
              ? wordDiff.map((w, i) => (
                  <span
                    key={i}
                    className="inline-block mr-[0.45em] transition-colors duration-150"
                    style={{
                      color: w.status === 'missing' ? C_ERROR : C_SPOKEN,
                      textDecoration: w.status === 'missing' ? 'underline' : 'none',
                      textDecorationStyle: w.status === 'missing' ? 'wavy' : undefined,
                      textDecorationColor: w.status === 'missing' ? '#ca475488' : undefined,
                    }}
                  >
                    {w.word}
                  </span>
                ))

              // ── Modo ao vivo: cursor avança ──
              : words.map((word, i) => {
                  const spoken  = i < matchedCount
                  const current = i === matchedCount && isActive

                  return (
                    <span key={i} className="inline-block mr-[0.45em] relative">
                      {current && (
                        <span ref={cursorRef} className="caret-blink" aria-hidden />
                      )}
                      <span
                        className="transition-colors duration-75"
                        style={{
                          color: spoken  ? C_SPOKEN  :
                                 current ? C_CURRENT :
                                           C_UNTYPED,
                        }}
                      >
                        {word}
                      </span>
                    </span>
                  )
                })}
          </p>

          <div style={{ height: '0.75rem' }} />
        </div>
      </div>
    </div>
  )
}
