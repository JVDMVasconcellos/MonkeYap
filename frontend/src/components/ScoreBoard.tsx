import type { EvaluationResult } from '../types'

interface Props { result: EvaluationResult }

const STAT_ORDER = ['Precisão', 'Fluência', 'Completude', 'Ritmo', 'Entonação']

export function ScoreBoard({ result }: Props) {
  const wpm    = result.details.wpm
  const stats  = STAT_ORDER.filter(k => k in result.scores)

  return (
    <div className="w-full space-y-10 animate-slide-up">

      {/* ── Números grandes — MonkeyType style ── */}
      <div className="flex flex-wrap gap-x-12 gap-y-6 items-end">

        {/* WPM — destaque máximo */}
        {wpm && (
          <div>
            <div className="font-mono font-bold tabular-nums leading-none" style={{ fontSize: '6rem', color: 'var(--color-main)' }}>
              {wpm}
            </div>
            <div className="text-sub text-sm mt-1 font-mono">wpm</div>
          </div>
        )}

        {/* Demais métricas */}
        {stats.map(k => (
          <div key={k}>
            <div className="font-mono font-bold text-4xl tabular-nums leading-none text-text">
              {result.scores[k].toFixed(1)}
            </div>
            <div className="text-sub text-sm mt-1 font-mono">{k.toLowerCase()}</div>
          </div>
        ))}
      </div>

      {/* ── Observações ── */}
      {result.errors.length > 0 && (
        <div className="space-y-2">
          {result.errors.map((e, i) => (
            <p key={i} className="text-sub text-base font-mono">
              <span className="text-error mr-2">›</span>{e}
            </p>
          ))}
        </div>
      )}

      {/* ── O que foi reconhecido ── */}
      {result.transcribed && (
        <div>
          <p className="text-sub text-sm uppercase tracking-widest font-mono mb-2">reconhecido</p>
          <p className="font-mono text-base text-sub leading-relaxed">{result.transcribed}</p>
        </div>
      )}
    </div>
  )
}
