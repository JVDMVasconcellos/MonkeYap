import type { EvaluationResult, WordDiff } from './types'

const FILLER_WORDS = new Set([
  'uh', 'uhm', 'hm', 'hmm', 'ah', 'ahm', 'ne', 'tipo', 'assim',
  'entao', 'sabe', 'cara', 'enfim', 'bom', 'olha', 'veja',
  'certo', 'ok', 'ta', 'eh', 'bem', 'ai', 'dai',
  'num', 'pra', 'pro', 'ahn',
])

const WPM_MIN = 120
const WPM_MAX = 160
const SKIP_WINDOW = 8

const SYMBOL_TO_WORDS: [string, string][] = [
  ['%', 'por cento'], ['&', 'e'], ['+', 'mais'], ['°', 'graus'], ['=', 'igual'],
  ['nº', 'numero'], ['r$', 'reais'], ['§', 'paragrafo'],
]

const DIGIT_TO_WORD: Record<string, string> = {
  '0': 'zero', '1': 'um', '2': 'dois', '3': 'tres', '4': 'quatro',
  '5': 'cinco', '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove',
  '10': 'dez', '11': 'onze', '12': 'doze', '13': 'treze', '14': 'quatorze',
  '15': 'quinze', '16': 'dezesseis', '17': 'dezessete', '18': 'dezoito',
  '19': 'dezenove', '20': 'vinte', '21': 'vinte e um', '22': 'vinte e dois',
  '30': 'trinta', '40': 'quarenta', '50': 'cinquenta', '60': 'sessenta',
  '70': 'setenta', '80': 'oitenta', '90': 'noventa',
  '100': 'cem', '200': 'duzentos', '300': 'trezentos', '400': 'quatrocentos',
  '500': 'quinhentos', '1000': 'mil',
}

function normalizeText(text: string): string {
  let t = text.toLowerCase()
  for (const [sym, word] of SYMBOL_TO_WORDS) t = t.split(sym).join(` ${word} `)
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
  return t.split(' ').map(w => DIGIT_TO_WORD[w] ?? w).join(' ')
}

function splitWords(text: string): string[] {
  return normalizeText(text).split(' ').filter(Boolean)
}

// ── Jaro-Winkler ─────────────────────────────────────────────────────────────

function jaro(s1: string, s2: string): number {
  if (s1 === s2) return 1
  const l1 = s1.length, l2 = s2.length
  const dist = Math.max(Math.floor(Math.max(l1, l2) / 2) - 1, 0)
  const m1 = new Array<boolean>(l1).fill(false)
  const m2 = new Array<boolean>(l2).fill(false)
  let matches = 0
  for (let i = 0; i < l1; i++) {
    const lo = Math.max(0, i - dist), hi = Math.min(i + dist + 1, l2)
    for (let j = lo; j < hi; j++) {
      if (m2[j] || s1[i] !== s2[j]) continue
      m1[i] = m2[j] = true; matches++; break
    }
  }
  if (matches === 0) return 0
  let k = 0, t = 0
  for (let i = 0; i < l1; i++) {
    if (!m1[i]) continue
    while (!m2[k]) k++
    if (s1[i] !== s2[k]) t++
    k++
  }
  return (matches / l1 + matches / l2 + (matches - t / 2) / matches) / 3
}

function jaroWinkler(s1: string, s2: string): number {
  const j = jaro(s1, s2)
  let p = 0
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) p++; else break
  }
  return j + p * 0.1 * (1 - j)
}

// ── Word diff (greedy alignment) ─────────────────────────────────────────────

function buildWordDiff(refText: string, refNorm: string[], spokenNorm: string[]): WordDiff[] {
  const rawWords = refText.split(/\s+/).filter(Boolean)
  const status = new Array<'ok' | 'missing'>(refNorm.length).fill('missing')
  let pos = 0
  for (const w of spokenNorm) {
    if (pos >= refNorm.length) break
    const limit = Math.min(pos + SKIP_WINDOW, refNorm.length)
    for (let i = pos; i < limit; i++) {
      if (refNorm[i] === w) { status[i] = 'ok'; pos = i + 1; break }
    }
  }
  return rawWords.slice(0, refNorm.length).map((word, i) => ({ word, status: status[i] }))
}

function computeDiff(refText: string, refNorm: string[], spokenNorm: string[]) {
  const wordDiff = buildWordDiff(refText, refNorm, spokenNorm)
  const missing = refNorm.filter((_, i) => wordDiff[i]?.status === 'missing')
  const refSet = new Set(refNorm)
  const added = spokenNorm.filter(w => !refSet.has(w) && !FILLER_WORDS.has(w))
  return { wordDiff, missing, added }
}

// ── Intonation via Web Audio API ─────────────────────────────────────────────

async function analyzeIntonation(blob: Blob) {
  try {
    const ab = await blob.arrayBuffer()
    const decodeCtx = new AudioContext()
    const audioBuffer = await decodeCtx.decodeAudioData(ab)
    await decodeCtx.close()

    const samples = audioBuffer.getChannelData(0)
    const frameSize = 512
    const rmsFrames: number[] = []
    for (let i = 0; i + frameSize <= samples.length; i += frameSize) {
      let sum = 0
      for (let j = i; j < i + frameSize; j++) sum += samples[j] * samples[j]
      rmsFrames.push(Math.sqrt(sum / frameSize))
    }
    if (rmsFrames.length === 0) return { score: 5.0, errors: [] as string[], silenceRatio: 0 }

    const meanRms = rmsFrames.reduce((s, x) => s + x, 0) / rmsFrames.length
    const variance = rmsFrames.reduce((s, x) => s + (x - meanRms) ** 2, 0) / rmsFrames.length
    const cv = Math.sqrt(variance) / (meanRms + 1e-8)

    const sorted = [...rmsFrames].sort((a, b) => a - b)
    const p15 = sorted[Math.floor(sorted.length * 0.15)]
    const silenceRatio = rmsFrames.filter(r => r < p15).length / rmsFrames.length

    const errors: string[] = []
    let score: number
    if (meanRms < 0.005) {
      score = 3.0
      errors.push('Volume muito baixo — fale mais alto ou aproxime o microfone')
    } else if (cv < 0.15) {
      score = 6.5
      errors.push('Voz monótona — varie a entonação para engajar o ouvinte')
    } else {
      score = Math.min(10.0, 6.5 + cv * 8)
    }
    if (silenceRatio > 0.40) {
      errors.push(`Muitas pausas longas (${Math.round(silenceRatio * 100)}% do tempo em silêncio)`)
    }
    return { score: Math.round(score * 10) / 10, errors, silenceRatio: Math.round(silenceRatio * 100) / 100 }
  } catch {
    return { score: 5.0, errors: [] as string[], silenceRatio: 0 }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function evaluate(
  transcript: string,
  refText: string,
  duration: number,
  audioBlob?: Blob,
): Promise<EvaluationResult> {
  const spoken = splitWords(transcript)
  const scores: Record<string, number> = {}
  const errors: string[] = []
  const details: EvaluationResult['details'] = {}

  // 1. Ritmo
  if (duration > 1 && spoken.length > 0) {
    const wpm = spoken.length / duration * 60
    details.wpm = Math.round(wpm)
    let r: number
    if (wpm < 80) {
      r = Math.max(0, wpm / 80 * 5)
      errors.push(`Ritmo muito lento: ${Math.round(wpm)} pal/min (ideal: ${WPM_MIN}–${WPM_MAX})`)
    } else if (wpm < WPM_MIN) {
      r = 5 + (wpm - 80) / (WPM_MIN - 80) * 3
    } else if (wpm <= WPM_MAX) {
      r = 10.0
    } else if (wpm <= 200) {
      r = 10 - (wpm - WPM_MAX) / (200 - WPM_MAX) * 3
      errors.push(`Ritmo acelerado: ${Math.round(wpm)} pal/min (ideal: ${WPM_MIN}–${WPM_MAX})`)
    } else {
      r = Math.max(1.0, 7 - (wpm - 200) / 40)
      errors.push(`Ritmo muito rápido: ${Math.round(wpm)} pal/min (ideal: ${WPM_MIN}–${WPM_MAX})`)
    }
    scores['Ritmo'] = Math.round(Math.min(10, Math.max(0, r)) * 10) / 10
  }

  // 2. Fluência
  const fillers: Record<string, number> = {}
  for (const w of spoken) {
    if (FILLER_WORDS.has(w)) fillers[w] = (fillers[w] ?? 0) + 1
  }
  const totalFill = Object.values(fillers).reduce((s, n) => s + n, 0)
  const ratio = totalFill / Math.max(spoken.length, 1)
  if (totalFill > 0) {
    const fstr = Object.entries(fillers)
      .sort(([, a], [, b]) => b - a)
      .map(([w, n]) => `"${w}" (${n}×)`).join(', ')
    errors.push(`Vícios de linguagem: ${fstr}`)
  }
  scores['Fluência'] = Math.round(Math.max(0, Math.min(10, 10 - ratio * 50)) * 10) / 10
  details.fillers = fillers

  // 3. Entonação
  if (audioBlob) {
    const { score, errors: ints, silenceRatio } = await analyzeIntonation(audioBlob)
    scores['Entonação'] = score
    errors.push(...ints)
    details.silence_ratio = silenceRatio
  }

  // 4. Precisão + Completude
  if (refText.trim()) {
    const ref = splitWords(refText)
    if (ref.length > 0 && spoken.length > 0) {
      scores['Precisão'] = Math.round(jaroWinkler(ref.join(' '), spoken.join(' ')) * 100) / 10

      const { wordDiff, missing, added } = computeDiff(refText, ref, spoken)

      if (missing.length > 0) {
        const sample = missing.slice(0, 8).map(w => `"${w}"`).join(', ')
        const suf = missing.length > 8 ? ` e mais ${missing.length - 8}` : ''
        errors.push(`Palavras omitidas (${missing.length}): ${sample}${suf}`)
      }
      if (added.length > 0) {
        errors.push(`Palavras não esperadas (${added.length}): ${added.slice(0, 8).map(w => `"${w}"`).join(', ')}`)
      }

      const completude = Math.max(0, 1 - missing.length / Math.max(ref.length, 1))
      scores['Completude'] = Math.round(completude * 100) / 10
      if (completude < 0.7) errors.push(`Apenas ${Math.round(completude * 100)}% do texto foi coberto`)

      const vals = Object.values(scores)
      scores['Geral'] = Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
      return { transcribed: transcript, scores, errors, details, word_diff: wordDiff }
    }
    scores['Precisão'] = 0.0
    scores['Completude'] = 0.0
  }

  if (Object.keys(scores).length > 0) {
    const vals = Object.values(scores)
    scores['Geral'] = Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
  }

  return { transcribed: transcript, scores, errors, details, word_diff: [] }
}
