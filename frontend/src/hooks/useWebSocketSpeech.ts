import { useCallback, useEffect, useRef, useState } from 'react'
import { createModel, type KaldiRecognizer, type Model } from 'vosk-browser'

const SAMPLE_RATE      = 16000
const BUFFER_SIZE      = 256
const SKIP_WINDOW      = 12
const CONFIRMED_SKIP   = 6
const SKIP_WINDOW_EN    = 16
const CONFIRMED_SKIP_EN = 8

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

function wordMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 4) return false
  return jaroWinkler(a, b) >= 0.80
}

function alignTranscript(spokenWords: string[], refNormalized: string[], startFrom: number, skipWindow = SKIP_WINDOW): number {
  let pos = startFrom
  for (const raw of spokenWords) {
    const w = normalize(raw)
    if (!w) continue
    const limit = Math.min(pos + skipWindow, refNormalized.length)
    for (let i = pos; i < limit; i++) {
      if (wordMatch(refNormalized[i], w)) {
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
  start:         (refWords: string[], lang?: string) => Promise<void>
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

  // Language-aware skip windows
  const skipWindowRef   = useRef(SKIP_WINDOW)
  const confirmedSkipRef = useRef(CONFIRMED_SKIP)

  // Fallback flag: set when Web Speech API fails with network error → switch to Vosk
  const networkFallbackRef = useRef(false)

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
    const skipWin   = confirmed ? confirmedSkipRef.current : skipWindowRef.current
    const newCursor = alignTranscript(expanded, refNormalizedRef.current, confirmedRef.current, skipWin)
    if (newCursor > matchedRef.current) _setMatched(newCursor)
    if (confirmed && newCursor > confirmedRef.current) confirmedRef.current = newCursor
  }

  // keepTranscript=true: graceful SR stop (allows last final result to arrive before evaluate)
  const _teardown = useCallback((keepTranscript = false) => {
    cancelAnimationFrame(rafRef.current)

    if (nativeSRRef.current) {
      nativeSRRef.current.onend = null
      if (keepTranscript) {
        nativeSRRef.current.stop()   // graceful: SR fires one last onresult before ending
      } else {
        nativeSRRef.current.abort()  // immediate: discard in-progress utterance
      }
      nativeSRRef.current = null
    }

    processorRef.current?.disconnect()
    processorRef.current = null
    try { recognizerRef.current?.remove() } catch { /* ok */ }
    recognizerRef.current = null

    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    if (!keepTranscript) {
      lastFinalTextRef.current   = ''
      lastPartialTextRef.current = ''
    }
  }, [])

  const _startVosk = useCallback(async () => {
    const model = modelRef.current
    if (!model) throw new Error('Modelo Vosk não disponível')

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

    cancelAnimationFrame(rafRef.current)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback(async (refWords: string[], lang = 'pt-BR') => {
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

    // Larger skip windows for English — archaic/literary words often mis-recognized
    const isEn = lang.startsWith('en')
    skipWindowRef.current    = isEn ? SKIP_WINDOW_EN    : SKIP_WINDOW
    confirmedSkipRef.current = isEn ? CONFIRMED_SKIP_EN : CONFIRMED_SKIP

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
      const sr             = new NativeSRCtor()
      sr.continuous        = true
      sr.interimResults    = true
      sr.lang              = lang
      sr.maxAlternatives   = 3
      nativeSRRef.current  = sr

      sr.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text   = result[0].transcript.trim()
          if (!text) continue
          if (result.isFinal) {
            lastFinalTextRef.current  = (lastFinalTextRef.current + ' ' + text).trim()
            lastPartialTextRef.current = ''
            _setTranscript(lastFinalTextRef.current)
            // Try all alternatives so the best-matching one advances the cursor
            for (let k = 0; k < result.length; k++) {
              const alt = result[k].transcript.trim()
              if (alt) _advance(alt.split(/\s+/).filter(Boolean), true)
            }
          } else {
            lastPartialTextRef.current = text
            const combined = (lastFinalTextRef.current + ' ' + text).trim()
            _setTranscript(combined)
            _advance(text.split(/\s+/).filter(Boolean), false)
          }
        }
      }

      sr.onerror = (event: any) => {
        if (event.error === 'no-speech') return
        console.warn('SpeechRecognition error:', event.error)
        const isEn = lang.startsWith('en')
        if (event.error === 'not-allowed') {
          setModelError(isEn
            ? 'Microphone blocked — check your browser permissions'
            : 'Microfone bloqueado — verifique as permissões do navegador')
        } else if ((event.error === 'network' || event.error === 'service-not-allowed') && !networkFallbackRef.current) {
          // Web Speech API blocked (Brave / no network) — fall back to local Vosk model
          networkFallbackRef.current = true
          nativeSRRef.current.onend = null
          nativeSRRef.current.abort()
          nativeSRRef.current = null
          cancelAnimationFrame(rafRef.current)
          ctxRef.current?.close().catch(() => {})
          ctxRef.current = null
          streamRef.current?.getTracks().forEach(t => t.stop())
          streamRef.current = null
          setModelLoading(true)
          loadModel()
            .then(async m => {
              if (!activeRef.current) return
              modelRef.current = m
              setModelLoading(false)
              await _startVosk()
            })
            .catch(() => {
              if (!activeRef.current) return
              setModelLoading(false)
              setModelError(isEn
                ? 'Speech recognition unavailable — try Chrome or Edge'
                : 'Reconhecimento de voz indisponível — tente Chrome ou Edge')
            })
        }
      }

      // Chrome stops recognition after ~60s of silence — restart automatically
      sr.onend = () => { if (activeRef.current) sr.start() }

      sr.start()
    } else {
      // ── Vosk WASM (Firefox / Brave fallback) ──
      await _startVosk()
    }
  }, [_startVosk])

  const stop = useCallback(() => {
    activeRef.current = false
    const safe = confirmedRef.current
    _teardown(true)  // graceful: keep transcript so SR can deliver last final result
    matchedRef.current = safe
    setMatchedCount(safe)
    setAudioLevel(0)
  }, [_teardown])

  const reset = useCallback(() => {
    activeRef.current        = false
    networkFallbackRef.current = false
    _teardown()
    matchedRef.current   = 0
    confirmedRef.current = 0
    setMatchedCount(0)
    setAudioLevel(0)
    _setTranscript('')
  }, [_teardown])

  return { matchedCount, audioLevel, modelLoading, modelError, transcript, transcriptRef, start, stop, reset }
}
