import { evaluate as localEvaluate } from './evaluator'
import type { Category, EvaluationResult, Language, TextItem } from './types'

export const LANGUAGES: Language[] = [
  { id: 'pt', label: 'Português' },
]

const CATEGORIES: Category[] = [
  { id: 'facil',        label: 'Fácil',        description: 'Textos simples e infantis',   color: '#00d084', language: 'pt' },
  { id: 'portugues',    label: 'Cultura',      description: 'Textos do dia a dia',         color: '#4a9eff', language: 'pt' },
  { id: 'se_manda',     label: 'Autores',      description: 'Textos complexos e formais',  color: '#f7931a', language: 'pt' },
  { id: 'drummond',     label: 'Drummond',     description: 'Poemas brasileiros',          color: '#e94560', language: 'pt' },
  { id: 'trava_lingua', label: 'Trava-língua', description: 'Exercícios de articulação',   color: '#a855f7', language: 'pt' },
]

export async function fetchCategories(language: string): Promise<Category[]> {
  return CATEGORIES.filter(c => c.language === language)
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
