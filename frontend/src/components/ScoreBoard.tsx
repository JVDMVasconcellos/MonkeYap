import type { EvaluationResult } from '../types'
import type { TimerMode } from '../types'
import { t, metricLabel, type Lang } from '../i18n'

interface Props {
  result:    EvaluationResult
  timerMode: TimerMode
  elapsed:   number
  language:  Lang
}

const SECONDARY = ['Fluência', 'Completude', 'Ritmo', 'Entonação']

export function ScoreBoard({ result, timerMode, elapsed, language }: Props) {
  const wpm       = result.details.wpm
  const precisao  = result.scores['Precisão']
  const timeLabel = typeof timerMode === 'number' ? `${timerMode}s` : `${elapsed}s`
  const chars     = result.transcribed
    ? result.transcribed.replace(/\s/g, '').length
    : null

  return (
    <div className="w-full space-y-8 animate-slide-up">

      {/* ── Linha principal: WPM + Precisão (hero stats) ── */}
      <div className="flex flex-wrap items-end gap-10">
        {wpm != null && (
          <StatGroup
            label="wpm"
            value={String(wpm)}
            hero
          />
        )}
        {precisao != null && (
          <StatGroup
            label={metricLabel(language, 'Precisão')}
            value={`${precisao.toFixed(1)}`}
            hero
          />
        )}
      </div>

      {/* ── Linha secundária: métricas + tempo + chars ── */}
      <div className="flex flex-wrap items-end gap-8">
        {SECONDARY.filter(k => k in result.scores).map(k => (
          <StatGroup
            key={k}
            label={metricLabel(language, k)}
            value={result.scores[k].toFixed(1)}
          />
        ))}

        <StatGroup label={t(language, 'label_time')} value={timeLabel} />

        {chars != null && (
          <StatGroup label="chars" value={String(chars)} />
        )}
      </div>

      {/* ── Observações ── */}
      {result.errors.length > 0 && (
        <div className="space-y-1.5 pt-2">
          {result.errors.map((e, i) => (
            <p key={i} className="font-mono text-sm" style={{ color: 'var(--color-sub)' }}>
              <span style={{ color: 'var(--color-error)', marginRight: '0.5rem' }}>›</span>
              {e}
            </p>
          ))}
        </div>
      )}

      {/* ── Reconhecido ── */}
      {result.transcribed && (
        <div className="pt-2">
          <p
            className="font-mono text-xs uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-sub)' }}
          >
            {t(language, 'label_recognized')}
          </p>
          <p
            className="font-mono text-sm leading-relaxed"
            style={{ color: 'var(--color-sub)' }}
          >
            {result.transcribed}
          </p>
        </div>
      )}
    </div>
  )
}

function StatGroup({
  label,
  value,
  hero = false,
}: {
  label: string
  value: string
  hero?: boolean
}) {
  return (
    <div>
      <div
        className="font-mono font-bold tabular-nums leading-none"
        style={{
          fontSize: hero ? '5rem' : '2.25rem',
          color:    hero ? 'var(--color-main)' : 'var(--color-text)',
        }}
      >
        {value}
      </div>
      <div
        className="font-mono mt-1"
        style={{ fontSize: '0.75rem', color: 'var(--color-sub)' }}
      >
        {label}
      </div>
    </div>
  )
}
