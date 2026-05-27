import { useCallback, useRef, useState } from 'react'

// Browser Speech API type shims (not in lib.dom.d.ts by default)
interface SpeechRec extends EventTarget {
  lang:            string
  continuous:      boolean
  interimResults:  boolean
  start():         void
  stop():          void
  onresult:  ((e: SpeechRecognitionEvent) => void) | null
  onerror:   ((e: SpeechRecognitionErrorEvent) => void) | null
  onend:     (() => void) | null
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognitionCtor {
  new(): SpeechRec
}

// Janela de tolerância para finais confirmados (estrita) e interim (mais larga)
const SKIP_CONFIRMED = 3
const SKIP_INTERIM   = 8

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove diacríticos após NFD
    .replace(/[^\w\s]/g, '')           // remove pontuação
    .trim()
}

// Alinha palavras faladas com o texto de referência a partir de startFrom.
function alignWords(spokenWords: string[], refNorm: string[], startFrom = 0, skipWindow = SKIP_INTERIM): number {
  let pos = startFrom
  for (const raw of spokenWords) {
    const w = normalize(raw)
    if (!w || pos >= refNorm.length) break
    const limit = Math.min(pos + skipWindow, refNorm.length)
    for (let i = pos; i < limit; i++) {
      if (refNorm[i] === w) { pos = i + 1; break }
    }
  }
  return pos
}

interface UseSpeechRecognitionReturn {
  matchedCount: number
  audioLevel:   number       // sempre 0 — Web Speech API não expõe áudio raw
  modelLoading: boolean      // false — sem modelo pra carregar
  modelError:   string | null
  start:        (refWords: string[]) => Promise<void>
  stop:         () => void
  reset:        () => void
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [matchedCount, setMatchedCount] = useState(0)

  const recRef        = useRef<SpeechRec | null>(null)
  const refNormRef    = useRef<string[]>([])
  const isActiveRef   = useRef(false)
  const confirmedRef  = useRef(0)   // cursor só avança em resultados finais
  const spawnRef      = useRef<() => void>(() => {})

  const CtorRef = useRef<SpeechRecognitionCtor | undefined>(
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>)['SpeechRecognition'] ??
         (window as unknown as Record<string, unknown>)['webkitSpeechRecognition']) as SpeechRecognitionCtor | undefined
      : undefined
  )

  const supported = Boolean(CtorRef.current)

  const _setMatched = (next: number, ref: string[]) => {
    const clamped = Math.min(next, ref.length)
    setMatchedCount(prev => Math.max(prev, clamped))
  }

  const _spawn = useCallback(() => {
    const Ctor = CtorRef.current
    if (!Ctor || !isActiveRef.current) return

    const rec          = new Ctor()
    rec.lang           = 'pt-BR'
    rec.continuous     = true   // sem gaps entre enunciados
    rec.interimResults = true
    recRef.current     = rec

    rec.onresult = (event) => {
      const ref = refNormRef.current

      // Processa resultados finais — atualiza cursor confirmado
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const words = event.results[i][0].transcript.trim().split(/\s+/).filter(Boolean)
          const next  = alignWords(words, ref, confirmedRef.current, SKIP_CONFIRMED)
          if (next > confirmedRef.current) {
            confirmedRef.current = next
            _setMatched(next, ref)
          }
        }
      }

      // Resultado interim atual — alinha a partir do confirmado (nunca acumula lixo)
      const last    = event.results[event.results.length - 1]
      const interim = (!last?.isFinal) ? (last?.[0].transcript ?? '') : ''
      if (interim) {
        const words = interim.trim().split(/\s+/).filter(Boolean)
        const next  = alignWords(words, ref, confirmedRef.current, SKIP_INTERIM)
        _setMatched(next, ref)
      }
    }

    rec.onerror = (e) => {
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        console.warn('SpeechRecognition error:', e.error)
      }
    }

    // continuous:true ainda pode encerrar por timeout de silêncio — reinicia
    rec.onend = () => {
      if (isActiveRef.current && recRef.current === rec) {
        setTimeout(() => spawnRef.current(), 60)
      }
    }

    try { rec.start() } catch { /* ok */ }
  }, [])

  spawnRef.current = _spawn

  const start = useCallback(async (refWords: string[]) => {
    if (!CtorRef.current) return
    refNormRef.current  = refWords.map(normalize)
    confirmedRef.current = 0
    isActiveRef.current = true
    setMatchedCount(0)
    _spawn()
  }, [_spawn])

  const stop = useCallback(() => {
    isActiveRef.current = false
    const rec = recRef.current
    recRef.current = null
    try { rec?.stop() } catch { /* ok */ }
  }, [])

  const reset = useCallback(() => {
    stop()
    confirmedRef.current = 0
    setMatchedCount(0)
  }, [stop])

  const modelError = supported ? null : 'Web Speech API não suportada neste browser (use Chrome ou Edge)'

  return { matchedCount, audioLevel: 0, modelLoading: false, modelError, start, stop, reset }
}

