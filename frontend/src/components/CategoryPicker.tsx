import type { Category } from '../types'

interface Props {
  categories: Category[]
  selected:   string | null
  onSelect:   (id: string) => void
  disabled:   boolean
}

export function CategoryPicker({ categories, selected, onSelect, disabled }: Props) {
  return (
    <div className="flex items-center gap-1 bg-panel/50 rounded-full px-2 py-1.5">
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => !disabled && onSelect(cat.id)}
          disabled={disabled}
          className={[
            'font-mono text-base px-5 py-1.5 rounded-full transition-all duration-200',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            selected === cat.id
              ? 'bg-bg text-main shadow-sm'
              : 'text-sub hover:text-text',
          ].join(' ')}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
