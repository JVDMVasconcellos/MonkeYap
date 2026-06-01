const SEGMENTS = 10

function calcScore(wpm: number): number {
  if (wpm <= 0)  return 0
  if (wpm < 80)  return (wpm / 80) * 30
  if (wpm < 120) return 30 + ((wpm - 80) / 40) * 40
  if (wpm <= 160) return 100
  if (wpm <= 200) return 100 - ((wpm - 160) / 40) * 40
  return Math.max(0, 60 - ((wpm - 200) / 40) * 30)
}

function label(wpm: number): string {
  if (wpm <= 0)   return ''
  if (wpm < 80)   return 'muito devagar'
  if (wpm < 120)  return 'devagar'
  if (wpm <= 160) return 'ótimo'
  if (wpm <= 200) return 'rápido'
  return 'muito rápido'
}

function segmentColor(score: number, filled: boolean): string {
  if (!filled) return 'color-mix(in srgb, var(--color-sub) 15%, transparent)'
  if (score >= 70) return 'var(--color-main)'
  if (score >= 40) return '#e2a117'
  return 'var(--color-error)'
}

interface Props {
  wpm:     number
  visible: boolean
}

export function PerformanceBar({ wpm, visible }: Props) {
  if (!visible) return null

  const score   = calcScore(wpm)
  const filled  = Math.round((score / 100) * SEGMENTS)
  const lbl     = label(wpm)
  const color   = segmentColor(score, true)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <div
            key={i}
            className="rounded-sm transition-all duration-300"
            style={{
              width: '18px',
              height: '6px',
              background: i < filled ? color : segmentColor(score, false),
            }}
          />
        ))}
      </div>
      {lbl && (
        <span
          className="font-mono text-xs transition-colors duration-300"
          style={{ color }}
        >
          {lbl}
        </span>
      )}
    </div>
  )
}
