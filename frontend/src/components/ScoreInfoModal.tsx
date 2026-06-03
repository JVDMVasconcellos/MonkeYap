import { t, SCORE_INFO, type Lang } from '../i18n'

interface Props {
  onClose:  () => void
  language: Lang
}

export function ScoreInfoModal({ onClose, language }: Props) {
  const metrics = language === 'en' ? SCORE_INFO.en : SCORE_INFO.pt

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
            {t(language, 'score_info_title')}
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
          {metrics.map(m => (
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
