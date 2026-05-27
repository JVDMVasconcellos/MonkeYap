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

// Janela de tolerância: tolera até N palavras não reconhecidas antes de travar
const SKIP_WINDOW = 6

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove diacríticos após NFD
    .replace(/[^\w\s]/g, '')           // remove pontuação
    .trim()
}

// Alinha palavras faladas com o texto de referência.
// Igual ao alignTranscript do Vosk: avança mesmo se palavras forem puladas/erradas.
function alignWords(spokenWords: string[], refNorm: string[]): number {
  let pos = 0
  for (const raw of spokenWords) {
    const w = normalize(raw)
    if (!w || pos >= refNorm.length) break
    const limit = Math.min(pos + SKIP_WINDOW, refNorm.length)
    for (let i = pos; i < limit; i++) {
      if (refNorm[i] === w) { pos = i + 1; break }
    }
  }
  return pos
}

interface UseSpeechRecognitionReturn {
  matchedCount: number
  supported:    boolean
  start:        (refWords: string[]) => void
  stop:         () => void
  reset:        () => void
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [matchedCount, setMatchedCount] = useState(0)

  const recRef        = useRef<SpeechRec | null>(null)
  const finalRef      = useRef('')
  const refNormRef    = useRef<string[]>([])
  const isActiveRef   = useRef(false)
  // Ref estável para evitar stale closure no onend
  const spawnRef      = useRef<() => void>(() => {})

  // Construtor guardado em ref — estável entre renders
  const CtorRef = useRef<SpeechRecognitionCtor | undefined>(
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>)['SpeechRecognition'] ??
         (window as unknown as Record<string, unknown>)['webkitSpeechRecognition']) as SpeechRecognitionCtor | undefined
      : undefined
  )

  const supported = Boolean(CtorRef.current)

  const _spawn = useCallback(() => {
    const Ctor = CtorRef.current
    if (!Ctor || !isActiveRef.current) return

    const rec          = new Ctor()
    rec.lang           = 'pt-BR'
    rec.continuous     = false  // Chrome finaliza cada enunciado rápido → interim mais frequente
    rec.interimResults = true
    recRef.current     = rec

    rec.onresult = (event) => {
      // Acumula resultados finais; pega o interim atual (último resultado não-final)
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalRef.current += event.results[i][0].transcript + ' '
        }
      }
      const last    = event.results[event.results.length - 1]
      const interim = last?.isFinal ? '' : (last?.[0].transcript ?? '')

      const spokenWords = (finalRef.current + interim).trim().split(/\s+/).filter(Boolean)
      const next = alignWords(spokenWords, refNormRef.current)
      setMatchedCount(prev => Math.max(prev, next))
    }

    rec.onerror = (e) => {
      // 'no-speech' dispara frequentemente com continuous:false — é normal, reinicia
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        console.warn('SpeechRecognition error:', e.error)
      }
    }

    // Com continuous:false o Chrome encerra após cada enunciado.
    // Reinicia imediatamente para capturar o próximo pedaço de fala.
    rec.onend = () => {
      if (isActiveRef.current && recRef.current === rec) {
        setTimeout(() => spawnRef.current(), 80)
      }
    }

    try { rec.start() } catch { /* ok */ }
  }, [])

  spawnRef.current = _spawn

  const start = useCallback((refWords: string[]) => {
    if (!CtorRef.current) return
    refNormRef.current  = refWords.map(normalize)
    finalRef.current    = ''
    isActiveRef.current = true
    setMatchedCount(0)
    _spawn()
  }, [_spawn])

  const stop = useCallback(() => {
    isActiveRef.current = false
    const rec = recRef.current
    recRef.current = null          // limpa antes de stop() para onend não reiniciar
    try { rec?.stop() } catch { /* ok */ }
  }, [])

  const reset = useCallback(() => {
    stop()
    finalRef.current = ''
    setMatchedCount(0)
  }, [stop])

  return { matchedCount, supported, start, stop, reset }
}

