interface Props {
  level:    number
  isActive: boolean
}

const BARS = 12

export function AudioLevel({ level, isActive }: Props) {
  if (!isActive) return null

  return (
    <div className="flex items-end gap-[3px] h-8">
      {Array.from({ length: BARS }, (_, i) => {
        const threshold = i / BARS
        const lit       = level > threshold
        const height    = 30 + (i / BARS) * 70   // barras crescem da esquerda pra direita

        return (
          <div
            key={i}
            className="w-[4px] rounded-full transition-all duration-75"
            style={{
              height:          `${height}%`,
              backgroundColor: lit ? 'var(--color-main)' : 'color-mix(in srgb, var(--color-main) 13%, transparent)',
              transform:       lit ? 'scaleY(1)' : 'scaleY(0.5)',
              transformOrigin: 'bottom',
            }}
          />
        )
      })}
    </div>
  )
}
