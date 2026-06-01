interface Props {
  onClose: () => void
}

const METRICS = [
  {
    name: 'Precisão',
    desc: 'Quão parecido o que você falou foi com o texto original, palavra por palavra.',
  },
  {
    name: 'Fluência',
    desc: 'Penaliza vícios de linguagem (uh, tipo, né, assim, sabe…). Quanto menos, melhor.',
  },
  {
    name: 'Completude',
    desc: 'Porcentagem do texto que você cobriu. Pular muitas palavras reduz essa nota.',
  },
  {
    name: 'Ritmo',
    desc: 'Baseado no seu WPM (palavras por minuto). A faixa ideal para oratória é 120–160 wpm.',
  },
  {
    name: 'Entonação',
    desc: 'Analisa a variação de volume no áudio. Voz monótona ou muito baixa reduz a nota.',
  },
  {
    name: 'Nota geral',
    desc: 'Média simples de todas as métricas acima, de 0 a 10.',
  },
]

export function ScoreInfoModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 shadow-2xl animate-slide-up"
        style={{ background: 'var(--color-panel)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--color-sub)' }}>
            como a nota é calculada
          </span>
          <button
            onClick={onClose}
            className="font-mono text-xs cursor-pointer transition-colors duration-150"
            style={{ color: 'var(--color-sub)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-sub)' }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {METRICS.map(m => (
            <div key={m.name} className="flex flex-col gap-0.5">
              <span className="font-mono text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                {m.name}
              </span>
              <span className="font-mono text-xs leading-relaxed" style={{ color: 'var(--color-sub)' }}>
                {m.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
