import { useCallback, useEffect, useRef, useState } from 'react'
import { createModel, type KaldiRecognizer, type Model } from 'vosk-browser'

const SAMPLE_RATE      = 16000
const BUFFER_SIZE      = 256
const SKIP_WINDOW      = 8
const CONFIRMED_SKIP   = 3

const MODEL_URL = '/models/vosk-pt.tar.gz'

// ── Detect Web Speech API (Chrome, Edge, Safari, Brave, Opera — not Firefox) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NativeSRCtor: (new () => any) | null =
  typeof window !== 'undefined'
    ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null)
    : null

// ── Singleton: Vosk model (only loaded when NativeSR is unavailable) ──
let _modelPromise: Promise<Model> | null = null

function loadModel(): Promise<Model> {
  if (!_modelPromise) {
    _modelPromise = createModel(MODEL_URL).catch(err => {
      _modelPromise = null
      throw err
    })
  }
  return _modelPromise
}

const SYMBOL_TO_WORDS: [string, string][] = [
  ['%', 'por cento'],
  ['&', 'e'],
  ['+', 'mais'],
  ['°', 'graus'],
  ['=', 'igual'],
]

function expandSymbols(text: string): string {
  let t = text.toLowerCase()
  for (const [sym, word] of SYMBOL_TO_WORDS) {
    t = t.split(sym).join(` ${word} `)
  }
  return t.replace(/\s+/g, ' ').trim()
}

const DIGIT_TO_WORD: Record<string, string> = {
  '0': 'zero', '1': 'um', '2': 'dois', '3': 'tres', '4': 'quatro',
  '5': 'cinco', '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove',
  '10': 'dez', '11': 'onze', '12': 'doze', '13': 'treze', '14': 'quatorze',
  '15': 'quinze', '16': 'dezesseis', '17': 'dezessete', '18': 'dezoito',
  '19': 'dezenove', '20': 'vinte', '30': 'trinta', '40': 'quarenta',
  '50': 'cinquenta', '60': 'sessenta', '70': 'setenta', '80': 'oitenta',
  '90': 'noventa', '100': 'cem', '1000': 'mil',
}

function normalize(s: string): string {
  const base = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
  return DIGIT_TO_WORD[base] ?? base
}

function alignTranscript(spokenWords: string[], refNormalized: string[], startFrom: number, skipWindow = SKIP_WINDOW): number {
  let pos = startFrom
  for (const raw of spokenWords) {
    const w = normalize(raw)
    if (!w) continue
    const limit = Math.min(pos + skipWindow, refNormalized.length)
    for (let i = pos; i < limit; i++) {
      if (refNormalized[i] === w) {
        pos = i + 1
        break
      }
    }
  }
  return pos
}

interface UseWebSocketSpeechReturn {
  matchedCount: number
  audioLevel:   number
  modelLoading:  boolean
  modelError:    string | null
  transcript:    string
  transcriptRef: React.MutableRefObject<string>
  start:         (refWords: string[]) => Promise<void>
  stop:          () => void
  reset:         () => void
}

export function useWebSocketSpeech(): UseWebSocketSpeechReturn {
  const [matchedCount, setMatchedCount] = useState(0)
  const [audioLevel,   setAudioLevel]   = useState(0)
  // Vosk requires a loading phase; Web Speech API is instant
  const [modelLoading, setModelLoading] = useState(NativeSRCtor === null)
  const [modelError,   setModelError]   = useState<string | null>(null)
  const [transcript,   setTranscript]   = useState('')

  // Shared refs
  const activeRef        = useRef(false)
  const totalRef         = useRef(0)
  const matchedRef       = useRef(0)
  const confirmedRef     = useRef(0)
  const refNormalizedRef = useRef<string[]>([])
  const lastFinalTextRef   = useRef('')
  const lastPartialTextRef = useRef('')
  const transcriptRef      = useRef('')   // sempre atual, sem problema de closure
  const rafRef           = useRef(0)

  // Audio level refs (used by both engines)
  const ctxRef    = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Vosk-specific refs
  const processorRef  = useRef<ScriptProcessorNode | null>(null)
  const recognizerRef = useRef<KaldiRecognizer | null>(null)
  const modelRef      = useRef<Model | null>(null)

  // Web Speech API ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nativeSRRef = useRef<any>(null)

  // Only preload Vosk when Web Speech API is unavailable (Firefox)
  useEffect(() => {
    if (NativeSRCtor !== null) return
    let canceled = false
    loadModel()
      .then(m => {
        if (canceled) return
        modelRef.current = m
        setModelLoading(false)
      })
      .catch(err => {
        if (canceled) return
        setModelError(err?.message ?? 'Falha ao carregar modelo Vosk')
        setModelLoading(false)
      })
    return () => { canceled = true }
  }, [])

  const _setTranscript = (text: string) => {
    transcriptRef.current = text
    setTranscript(text)
  }

  const _setMatched = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), totalRef.current)
    if (clamped !== matchedRef.current) {
      matchedRef.current = clamped
      setMatchedCount(clamped)
    }
  }

  const _advance = (words: string[], confirmed: boolean) => {
    if (!activeRef.current) return
    const expanded  = words.flatMap(w => expandSymbols(w).split(/\s+/).filter(Boolean))
    const skipWin   = confirmed ? CONFIRMED_SKIP : SKIP_WINDOW
    const newCursor = alignTranscript(expanded, refNormalizedRef.current, confirmedRef.current, skipWin)
    if (newCursor > matchedRef.current) _setMatched(newCursor)
    if (confirmed && newCursor > confirmedRef.current) confirmedRef.current = newCursor
  }

  const _teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current)

    // Web Speech API teardown
    if (nativeSRRef.current) {
      nativeSRRef.current.onend = null
      nativeSRRef.current.abort()
      nativeSRRef.current = null
    }

    // Vosk teardown
    processorRef.current?.disconnect()
    processorRef.current = null
    try { recognizerRef.current?.remove() } catch { /* ok */ }
    recognizerRef.current = null

    // Common teardown
    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    lastFinalTextRef.current   = ''
    lastPartialTextRef.current = ''
  }, [])

  const start = useCallback(async (refWords: string[]) => {
    const expandedRef        = refWords.flatMap(w => expandSymbols(w).split(/\s+/).filter(Boolean))
    totalRef.current         = expandedRef.length
    matchedRef.current       = 0
    confirmedRef.current     = 0
    activeRef.current        = true
    refNormalizedRef.current = expandedRef.map(normalize)
    lastFinalTextRef.current = ''
    setMatchedCount(0)
    setAudioLevel(0)
    _setTranscript('')

    if (NativeSRCtor) {
      // ── Web Speech API (Chrome, Edge, Safari, Brave…) ──
      // Get mic stream only for audio level visualization
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        video: false,
      })
      streamRef.current = stream
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
      ctxRef.current = ctx
      const source   = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const buf = new Float32Array(analyser.fftSize)
      const tick = () => {
        analyser.getFloatTimeDomainData(buf)
        const rms = Math.sqrt(buf.reduce((s, x) => s + x * x, 0) / buf.length)
        setAudioLevel(Math.min(rms * 10, 1))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)

      // Start recognition
      const sr          = new NativeSRCtor()
      sr.continuous     = true
      sr.interimResults = true
      sr.lang           = 'pt-BR'
      nativeSRRef.current = sr

      sr.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text   = result[0].transcript.trim()
          if (!text) continue
          if (result.isFinal) {
            lastFinalTextRef.current  = (lastFinalTextRef.current + ' ' + text).trim()
            lastPartialTextRef.current = ''
            _setTranscript(lastFinalTextRef.current)
            _advance(text.split(/\s+/).filter(Boolean), true)
          } else {
            lastPartialTextRef.current = text
            // Mantém transcript atualizado com final + parcial atual
            // para que a avaliação final tenha tudo, mesmo sem resultado confirmado
            const combined = (lastFinalTextRef.current + ' ' + text).trim()
            _setTranscript(combined)
            _advance(text.split(/\s+/).filter(Boolean), false)
          }
        }
      }

      sr.onerror = (event: any) => {
        if (event.error === 'no-speech') return // normal during pauses
        console.warn('SpeechRecognition error:', event.error)
      }

      // Chrome stops recognition after ~60s of silence — restart automatically
      sr.onend = () => { if (activeRef.current) sr.start() }

      sr.start()
    } else {
      // ── Vosk WASM (Firefox fallback) ──
      const model = modelRef.current
      if (!model) throw new Error('Modelo Vosk ainda não carregou')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        video: false,
      })
      streamRef.current = stream

      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
      ctxRef.current = ctx

      const uniqueWords = Array.from(new Set(refNormalizedRef.current.filter(Boolean)))
      const grammar     = JSON.stringify([...uniqueWords, '[unk]'])

      const recognizer = new model.KaldiRecognizer(SAMPLE_RATE, grammar)
      recognizer.setWords(true)
      recognizerRef.current = recognizer

      recognizer.on('result', (msg) => {
        if (msg.event !== 'result') return
        const newText = msg.result.text?.trim()
        if (!newText) return
        lastFinalTextRef.current = (lastFinalTextRef.current + ' ' + newText).trim()
        _setTranscript(lastFinalTextRef.current)
        _advance(newText.split(/\s+/).filter(Boolean), true)
      })

      recognizer.on('partialresult', (msg) => {
        if (msg.event !== 'partialresult') return
        const partial = msg.result.partial?.trim() ?? ''
        if (!partial) return
        _advance(partial.split(/\s+/).filter(Boolean), false)
      })

      const source    = ctx.createMediaStreamSource(stream)
      const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1)
      processorRef.current = processor

      const analyser  = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const silencer      = ctx.createGain()
      silencer.gain.value = 0
      source.connect(processor)
      processor.connect(silencer)
      silencer.connect(ctx.destination)

      const buf = new Float32Array(analyser.fftSize)
      const tick = () => {
        analyser.getFloatTimeDomainData(buf)
        const rms = Math.sqrt(buf.reduce((s, x) => s + x * x, 0) / buf.length)
        setAudioLevel(Math.min(rms * 10, 1))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)

      processor.onaudioprocess = (e) => {
        try { recognizer.acceptWaveform(e.inputBuffer) } catch { /* ignora chunks ruins */ }
      }
    }
  }, [])

  const stop = useCallback(() => {
    activeRef.current = false
    const safe = confirmedRef.current
    _teardown()
    matchedRef.current = safe
    setMatchedCount(safe)
    setAudioLevel(0)
  }, [_teardown])

  const reset = useCallback(() => {
    activeRef.current  = false
    _teardown()
    matchedRef.current   = 0
    confirmedRef.current = 0
    setMatchedCount(0)
    setAudioLevel(0)
    _setTranscript('')
  }, [_teardown])

  return { matchedCount, audioLevel, modelLoading, modelError, transcript, transcriptRef, start, stop, reset }
}
