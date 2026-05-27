import { useCallback, useEffect, useRef, useState } from 'react'
import { createModel, type KaldiRecognizer, type Model } from 'vosk-browser'

// Sincronização real via Vosk WASM rodando no browser.
// 100% offline (modelo cacheado pelo navegador após primeiro download).
// Funciona em qualquer browser — não depende da Web Speech API.

const SAMPLE_RATE        = 16000
const BUFFER_SIZE        = 256  // 16ms @ 16kHz — máxima responsividade
const SKIP_WINDOW      = 8     // janela para parciais (display especulativo)
const CONFIRMED_SKIP   = 3     // janela para results finais (mais estrita)

const MODEL_URL = '/models/vosk-pt.tar.gz'

// ── Singleton: carrega modelo Vosk uma única vez por sessão de navegador ──
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

// Alinha transcript falado com texto de referência a partir de startFrom.
// Matching guloso + janela de skip pra tolerar palavras não reconhecidas.
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
  modelLoading: boolean
  modelError:   string | null
  transcript:   string
  start:        (refWords: string[]) => Promise<void>
  stop:         () => void
  reset:        () => void
}

export function useWebSocketSpeech(): UseWebSocketSpeechReturn {
  const [matchedCount, setMatchedCount] = useState(0)
  const [audioLevel,   setAudioLevel]   = useState(0)
  const [modelLoading, setModelLoading] = useState(true)
  const [modelError,   setModelError]   = useState<string | null>(null)
  const [transcript,   setTranscript]   = useState('')

  const ctxRef        = useRef<AudioContext | null>(null)
  const processorRef  = useRef<ScriptProcessorNode | null>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const rafRef        = useRef(0)
  const recognizerRef = useRef<KaldiRecognizer | null>(null)
  const modelRef      = useRef<Model | null>(null)

  const totalRef           = useRef(0)
  const matchedRef         = useRef(0)
  const confirmedRef       = useRef(0)   // só avança em eventos `result` (finais confirmados)
  const activeRef          = useRef(false)
  const refNormalizedRef   = useRef<string[]>([])
  const lastFinalTextRef   = useRef('')
  const pendingTimersRef   = useRef<ReturnType<typeof setTimeout>[]>([])

  // Pré-carrega o modelo no mount para evitar delay no start
  useEffect(() => {
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
    pendingTimersRef.current.forEach(clearTimeout)
    pendingTimersRef.current = []
    cancelAnimationFrame(rafRef.current)
    processorRef.current?.disconnect()
    processorRef.current = null
    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    try { recognizerRef.current?.remove() } catch { /* ok */ }
    recognizerRef.current = null
    lastFinalTextRef.current = ''
  }, [])

  const start = useCallback(async (refWords: string[]) => {
    // Expande símbolos antes de normalizar (ex: "%" → ["por", "cento"])
    const expandedRef        = refWords.flatMap(w => expandSymbols(w).split(/\s+/).filter(Boolean))
    totalRef.current         = expandedRef.length
    matchedRef.current       = 0
    confirmedRef.current     = 0
    activeRef.current        = true
    refNormalizedRef.current = expandedRef.map(normalize)
    lastFinalTextRef.current = ''
    setMatchedCount(0)
    setAudioLevel(0)
    setTranscript('')

    const model = modelRef.current
    if (!model) throw new Error('Modelo Vosk ainda não carregou')

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      video: false,
    })
    streamRef.current = stream

    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })  // 16kHz nativo — sem reamostração
    ctxRef.current = ctx

    // Grammar mode: só reconhece palavras do texto (muito mais rápido e preciso).
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
      setTranscript(lastFinalTextRef.current)
      // Resultado final confirmado — avança o cursor confirmado
      _advance(newText.split(/\s+/).filter(Boolean), true)
    })

    recognizer.on('partialresult', (msg) => {
      if (msg.event !== 'partialresult') return
      const partial = msg.result.partial?.trim() ?? ''
      if (!partial) return
      // Parcial: mostra progresso em tempo real mas parte sempre do cursor confirmado
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

    // Nível de áudio
    const levelBuf = new Float32Array(analyser.fftSize)
    const tickLevel = () => {
      analyser.getFloatTimeDomainData(levelBuf)
      const rms = Math.sqrt(levelBuf.reduce((s, x) => s + x * x, 0) / levelBuf.length)
      setAudioLevel(Math.min(rms * 10, 1))
      rafRef.current = requestAnimationFrame(tickLevel)
    }
    rafRef.current = requestAnimationFrame(tickLevel)

    processor.onaudioprocess = (e) => {
      try {
        recognizer.acceptWaveform(e.inputBuffer)
      } catch { /* ignora chunks ruins */ }
    }
  }, [])

  const stop = useCallback(() => {
    // Congela no cursor confirmado antes do teardown para descartar
    // qualquer parcial especulativo ou flush final do Vosk com silêncio/ruído
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
    setTranscript('')
  }, [_teardown])

  return { matchedCount, audioLevel, modelLoading, modelError, transcript, start, stop, reset }
}
