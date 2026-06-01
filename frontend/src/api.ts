import { evaluate as localEvaluate } from './evaluator'
import type { Category, EvaluationResult, TextItem } from './types'

const CATEGORIES: Category[] = [
  { id: 'facil',        label: 'Fácil',        description: 'Textos simples e infantis',   color: '#00d084' },
  { id: 'portugues',    label: 'Português',    description: 'Textos do dia a dia',         color: '#4a9eff' },
  { id: 'se_manda',     label: 'Autores',      description: 'Textos complexos e formais',  color: '#f7931a' },
  { id: 'drummond',     label: 'Drummond',     description: 'Poemas brasileiros',          color: '#e94560' },
  { id: 'trava_lingua', label: 'Trava-língua', description: 'Exercícios de articulação',   color: '#a855f7' },
]

export async function fetchCategories(): Promise<Category[]> {
  return CATEGORIES
}

export async function fetchRandomText(categoryId: string): Promise<TextItem> {
  const res = await fetch(`/texts/${categoryId}.json`)
  if (!res.ok) throw new Error(`Categoria '${categoryId}' não encontrada`)
  const texts: TextItem[] = await res.json()
  return texts[Math.floor(Math.random() * texts.length)]
}

export async function evaluate(
  audioBlob: Blob,
  refText: string,
  duration: number,
  transcript = '',
): Promise<EvaluationResult> {
  return localEvaluate(transcript, refText, duration, audioBlob)
}
