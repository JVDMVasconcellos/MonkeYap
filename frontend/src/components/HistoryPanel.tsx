import { useState } from 'react'
import type { HistoryEntry } from '../types'
import { ShareModal } from './ShareCard'
import type { ShareData } from './ShareCard'

interface Props {
  entries:      HistoryEntry[]
  onRemove:     (id: string) => void
  onClear:      () => void
  onClose:      () => void
}

export function HistoryPanel({ entries, onRemove, onClear, onClose }: Props) {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--color-sub)' }}>
          histórico
        </span>
        <div className="flex items-center gap-4">
          {entries.length > 0 && (
            <button
              onClick={onClear}
              className="font-mono text-xs transition-colors duration-150 cursor-pointer"
              style={{ color: 'var(--color-sub)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-error)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-sub)' }}
            >
              limpar
            </button>
          )}
          <button
            onClick={onClose}
            className="font-mono text-xs transition-colors duration-150 cursor-pointer"
            style={{ color: 'var(--color-sub)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-sub)' }}
          >
            ✕ fechar
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="font-mono text-sm py-16 text-center" style={{ color: 'var(--color-sub)' }}>
          nenhuma sessão registrada ainda
        </p>
      ) : (
        <>
          {/* Summary row */}
          <SummaryBar entries={entries} />

          {/* List */}
          <div className="flex flex-col gap-2">
            {entries.map(e => (
              <EntryRow key={e.id} entry={e} onRemove={onRemove} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SummaryBar({ entries }: { entries: HistoryEntry[] }) {
  const withWpm   = entries.filter(e => e.wpm != null)
  const avgWpm    = withWpm.length
    ? Math.round(withWpm.reduce((s, e) => s + e.wpm!, 0) / withWpm.length)
    : null
  const withGeral = entries.filter(e => e.scores['Geral'] != null)
  const avgGeral  = withGeral.length
    ? (withGeral.reduce((s, e) => s + e.scores['Geral'], 0) / withGeral.length).toFixed(1)
    : null
  const best      = withWpm.length ? Math.max(...withWpm.map(e => e.wpm!)) : null

  const metricAvg = (key: string) => {
    const vals = entries.map(e => e.scores[key]).filter(v => v != null)
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null
  }

  const divider = <div className="self-stretch w-px mx-2" style={{ background: 'color-mix(in srgb, var(--color-sub) 15%, transparent)' }} />

  return (
    <div className="flex flex-col gap-5 pb-5" style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-sub) 15%, transparent)' }}>

      {/* Linha 1: stats gerais */}
      <div className="flex flex-wrap items-end gap-8">
        <Stat label="sessões"   value={String(entries.length)} />
        {avgWpm   != null && <Stat label="wpm médio"   value={String(avgWpm)} />}
        {best     != null && <Stat label="melhor wpm"  value={String(best)} highlight />}
        {avgGeral != null && <Stat label="nota média"  value={avgGeral} highlight />}
      </div>

      {/* Linha 2: média por métrica */}
      <div className="flex flex-wrap items-end gap-0">
        {DETAIL_METRICS.map((k, i) => {
          const avg = metricAvg(k)
          if (!avg) return null
          return (
            <div key={k} className="flex items-stretch">
              {i > 0 && divider}
              <div className="px-4 first:pl-0">
                <div
                  className="tabular-nums font-bold leading-none"
                  style={{ fontSize: '1.6rem', color: scoreColor(parseFloat(avg)) }}
                >
                  {avg}
                </div>
                <div className="font-mono text-xs mt-1" style={{ color: 'var(--color-sub)' }}>
                  {k.toLowerCase()}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div
        className="font-mono font-bold tabular-nums leading-none"
        style={{ fontSize: '2rem', color: highlight ? 'var(--color-main)' : 'var(--color-text)' }}
      >
        {value}
      </div>
      <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-sub)' }}>{label}</div>
    </div>
  )
}

const DETAIL_METRICS = ['Precisão', 'Fluência', 'Completude', 'Ritmo', 'Entonação']

function EntryRow({ entry, onRemove }: { entry: HistoryEntry; onRemove: (id: string) => void }) {
  const [expanded,  setExpanded]  = useState(false)
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const date    = new Date(entry.date)
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const geral   = entry.scores['Geral']

  return (
    <div
      className="rounded-xl font-mono text-sm overflow-hidden"
      style={{ background: 'color-mix(in srgb, var(--color-panel) 60%, transparent)' }}
    >
      {/* ── Linha principal ── */}
      <div
        className="group flex items-center gap-4 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Chevron */}
        <span
          className="shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--color-sub)',
            display: 'inline-block',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ›
        </span>

        {/* Date */}
        <span className="tabular-nums shrink-0 w-24" style={{ color: 'var(--color-sub)' }}>
          {dateStr} {timeStr}
        </span>

        {/* Language flag */}
        <span className="shrink-0 text-base" title={entry.language === 'en' ? 'English' : 'Português'}>
          {entry.language === 'en' ? '🇺🇸' : '🇧🇷'}
        </span>

        {/* Category */}
        <span className="shrink-0 w-20" style={{ color: 'var(--color-sub)' }}>
          {entry.categoryLabel}
        </span>

        {/* Title */}
        <span className="flex-1 truncate" style={{ color: 'var(--color-text)' }}>
          {entry.textTitle}
        </span>

        {/* WPM */}
        <span className="tabular-nums shrink-0 w-16 text-right font-bold" style={{ color: 'var(--color-text)' }}>
          {entry.wpm != null ? `${entry.wpm} wpm` : '—'}
        </span>

        {/* Score geral */}
        <div className="shrink-0 w-12 text-right">
          <div className="tabular-nums font-bold" style={{ color: geral != null ? scoreColor(geral) : 'var(--color-sub)' }}>
            {geral != null ? geral.toFixed(1) : '—'}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-sub)' }}>nota</div>
        </div>

        {/* Share */}
        <button
          onClick={e => {
            e.stopPropagation()
            setShareData({
              scores:        entry.scores,
              wpm:           entry.wpm,
              elapsed:       entry.duration,
              textTitle:     entry.textTitle,
              categoryLabel: entry.categoryLabel,
              language:      entry.language ?? 'pt',
              date:          entry.date,
            })
          }}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
          style={{ color: 'var(--color-sub)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-main)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-sub)' }}
          title="Compartilhar"
        >
          <ShareIconSmall />
        </button>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onRemove(entry.id) }}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
          style={{ color: 'var(--color-sub)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-error)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-sub)' }}
          title="Remover"
        >
          <TrashIcon />
        </button>
      </div>

      {shareData && <ShareModal data={shareData} onClose={() => setShareData(null)} />}

      {/* ── Detalhes expansíveis ── */}
      {expanded && (
        <div
          className="flex flex-wrap gap-6 px-10 pb-4"
          style={{ borderTop: '1px solid color-mix(in srgb, var(--color-sub) 10%, transparent)' }}
        >
          {DETAIL_METRICS.filter(k => k in entry.scores).map(k => (
            <div key={k} className="pt-3">
              <div
                className="tabular-nums font-bold"
                style={{ fontSize: '1.5rem', color: scoreColor(entry.scores[k]) }}
              >
                {entry.scores[k].toFixed(1)}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-sub)' }}>
                {k.toLowerCase()}
              </div>
            </div>
          ))}
          {entry.wpm != null && (
            <div className="pt-3">
              <div className="tabular-nums font-bold" style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
                {entry.wpm}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-sub)' }}>wpm</div>
            </div>
          )}
          <div className="pt-3">
            <div className="tabular-nums font-bold" style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
              {entry.duration}s
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-sub)' }}>duração</div>
          </div>
        </div>
      )}
    </div>
  )
}

function ShareIconSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function scoreColor(score: number): string {
  if (score >= 8) return 'var(--color-main)'
  if (score >= 6) return 'var(--color-text)'
  return 'var(--color-error)'
}
