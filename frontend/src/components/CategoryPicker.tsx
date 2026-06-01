import type { Category, Language, TimerMode } from '../types'

const TIMER_OPTIONS: { label: string; value: TimerMode }[] = [
  { label: '∞',  value: 'unlimited' },
  { label: '15', value: 15 },
  { label: '30', value: 30 },
  { label: '60', value: 60 },
]

interface Props {
  languages:        Language[]
  selectedLanguage: string | null
  onSelectLanguage: (id: string) => void
  categories:       Category[]
  selectedCategory: string | null
  onSelectCategory: (id: string) => void
  timerMode:        TimerMode
  onSelectTimer:    (mode: TimerMode) => void
  disabled:         boolean
}

export function CategoryPicker({
  languages,
  selectedLanguage,
  onSelectLanguage,
  categories,
  selectedCategory,
  onSelectCategory,
  timerMode,
  onSelectTimer,
  disabled,
}: Props) {
  const pill = (active: boolean, locked: boolean) =>
    [
      'font-mono text-sm px-4 py-1 rounded-lg transition-all duration-150',
      locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      active  ? 'pill-active' : 'pill-inactive',
    ].join(' ')

  return (
    <div className="flex flex-col items-center gap-2">

      {/* Linha 1: idiomas */}
      <div className="flex items-center gap-0.5 pill-bar rounded-xl px-1.5 py-1 select-none">
        {languages.map(lang => (
          <button
            key={lang.id}
            onClick={() => !disabled && onSelectLanguage(lang.id)}
            disabled={disabled}
            className={pill(selectedLanguage === lang.id, disabled)}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Linha 2: categorias (só aparece quando idioma selecionado) */}
      {selectedLanguage && (
        <div className="flex items-center gap-0.5 pill-bar rounded-xl px-1.5 py-1 select-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => !disabled && onSelectCategory(cat.id)}
              disabled={disabled}
              className={pill(selectedCategory === cat.id, disabled)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Linha 3: timer (sempre visível) */}
      <div className="flex items-center gap-0.5 pill-bar rounded-xl px-1.5 py-1 select-none">
        {TIMER_OPTIONS.map(opt => (
          <button
            key={String(opt.value)}
            onClick={() => !disabled && onSelectTimer(opt.value)}
            disabled={disabled}
            className={pill(timerMode === opt.value, disabled)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
