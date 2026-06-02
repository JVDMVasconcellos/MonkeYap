export interface Language {
  id:    string
  label: string
}

export interface Category {
  id:          string
  label:       string
  description: string
  color:       string
  language:    string
}

export interface TextItem {
  id:     string
  title:  string
  text:   string
  author: string | null
}

export interface WordDiff {
  word:   string
  status: 'ok' | 'missing'
}

export interface EvaluationResult {
  transcribed: string
  scores:      Record<string, number>
  errors:      string[]
  details:     { wpm?: number; silence_ratio?: number; fillers?: Record<string, number> }
  word_diff:   WordDiff[]
}

export interface WordResult {
  status:     'correct' | 'wrong' | 'analyzing'
  recognized: string
}

export type TimerMode = 'unlimited' | 15 | 30 | 60

export type AppState =
  | 'idle'
  | 'ready'
  | 'recording'
  | 'analyzing'
  | 'results'

export interface HistoryEntry {
  id:             string
  date:           string
  language:       string
  categoryId:     string
  categoryLabel:  string
  textTitle:      string
  wpm:            number | null
  scores:         Record<string, number>
  duration:       number
  timerMode:      TimerMode
}
