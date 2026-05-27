import type { Category, EvaluationResult, TextItem } from './types'

const BASE = '/api'

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE}/categories`)
  if (!res.ok) throw new Error('Falha ao carregar categorias')
  return res.json()
}

export async function fetchRandomText(categoryId: string): Promise<TextItem> {
  const res = await fetch(`${BASE}/text/${categoryId}/random`)
  if (!res.ok) throw new Error('Falha ao carregar texto')
  return res.json()
}

export async function evaluate(
  audioBlob: Blob,
  refText:   string,
  duration:  number,
): Promise<EvaluationResult> {
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.webm')
  form.append('ref_text', refText)
  form.append('duration', String(duration))

  const res = await fetch(`${BASE}/evaluate`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }))
    throw new Error((err as { detail?: string }).detail ?? 'Falha na avaliação')
  }
  return res.json()
}

export async function checkWord(
  wavBlob:  Blob,
  expected: string,
): Promise<{ recognized: string; correct: boolean }> {
  const form = new FormData()
  form.append('audio', wavBlob, 'word.wav')
  form.append('expected', expected)

  const res = await fetch(`${BASE}/check-word`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('Falha ao checar palavra')
  return res.json()
}
