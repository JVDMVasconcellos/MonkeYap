import { useCallback, useRef, useState } from 'react'
import { checkWord } from '../api'
import type { WordResult } from '../types'

const SAMPLE_RATE    = 16000
const BUFFER_SIZE    = 512          // 32ms por callback — VAD responsivo
const VOICE_THRESH   = 0.018        // nível RMS mínimo pra contar como voz
const SILENCE_END_MS = 480          // silêncio contínuo pra considerar palavra acabada
const MIN_SPEECH_MS  = 80           // duração mínima pra não ser ruído
const MAX_WORD_MS    = 6000         // timeout por palavra (evita travar)

// ── Constrói um WAV válido a partir de amostras PCM Int16 ─────────────────────
function buildWav(samples: Int16Array): Blob {
  const dataLen = samples.byteLength
  const buf     = new ArrayBuffer(44 + dataLen)
  const v       = new DataView(buf)
  const str     = (off: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(off + i, c.charCodeAt(0)))

  str(0, 'RIFF');  v.setUint32(4, 36 + dataLen, true)
  str(8, 'WAVE');  str(12, 'fmt ')
  v.setUint32(16, 16, true)          // chunk size
  v.setUint16(20, 1,  true)          // PCM
  v.setUint16(22, 1,  true)          // mono
  v.setUint32(24, SAMPLE_RATE, true)
  v.setUint32(28, SAMPLE_RATE * 2, true)
  v.setUint16(32, 2,  true)
  v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, dataLen, true)
  new Int16Array(buf, 44).set(samples)

  return new Blob([buf], { type: 'audio/wav' })
}

// ── Concatena vários Int16Array em um só ──────────────────────────────────────
function mergeInt16(chunks: Int16Array[]): Int16Array {
  const total  = chunks.reduce((n, c) => n + c.length, 0)
  const merged = new Int16Array(total)
  let   offset = 0
  for (const c of chunks) { merged.set(c, offset); offset += c.length }
  return merged
}

export interface UseWordByWordReturn {
  wordResults:  WordResult[]
  wordIndex:    number           // próxima palavra a falar
  audioLevel:   number           // 0-1
  isCapturing:  boolean          // está gravando uma palavra agora
  start:        (refWords: string[]) => Promise<void>
  stop:         () => void
  reset:        () => void
}

export function useWordByWord(): UseWordByWordReturn {
  const [wordResults,  setWordResults]  = useState<WordResult[]>([])
  const [wordIndex,    setWordIndex]    = useState(0)
  const [audioLevel,   setAudioLevel]  = useState(0)
  const [isCapturing,  setIsCapturing] = useState(false)

  const ctxRef        = useRef<AudioContext | null>(null)
  const processorRef  = useRef<ScriptProcessorNode | null>(null)
  const streamRef     = useRef<MediaStream | null>(null)

  // Refs mutáveis dentro do onaudioprocess (evita stale closure)
  const refWordsRef   = useRef<string[]>([])
  const wordIdxRef    = useRef(0)
  const busyRef       = useRef(false)          // processando palavra atual

  const chunksRef     = useRef<Int16Array[]>([])
  const voiceOnRef    = useRef(false)
  const voiceStartRef = useRef(0)
  const silenceAtRef  = useRef(0)
  const wordTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const _teardown = useCallback(() => {
    if (wordTimerRef.current) clearTimeout(wordTimerRef.current)
    processorRef.current?.disconnect()
    processorRef.current = null
    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  // Processa as amostras coletadas para a palavra atual
  const _processChunks = useCallback(async (chunks: Int16Array[]) => {
    const idx      = wordIdxRef.current
    const expected = refWordsRef.current[idx]
    if (!expected) return

    // Marca como "analisando"
    setWordResults(prev => {
      const next = [...prev]
      next[idx]  = { status: 'analyzing', recognized: '' }
      return next
    })

    try {
      const wav    = buildWav(mergeInt16(chunks))
      const result = await checkWord(wav, expected)

      setWordResults(prev => {
        const next = [...prev]
        next[idx]  = { status: result.correct ? 'correct' : 'wrong', recognized: result.recognized }
        return next
      })
    } catch {
      setWordResults(prev => {
        const next = [...prev]
        next[idx]  = { status: 'wrong', recognized: '' }
        return next
      })
    }

    // Avança pra próxima palavra
    const nextIdx = idx + 1
    wordIdxRef.current = nextIdx
    setWordIndex(nextIdx)
    busyRef.current    = false
    setIsCapturing(false)
  }, [])

  const _flushWord = useCallback(() => {
    if (wordTimerRef.current) { clearTimeout(wordTimerRef.current); wordTimerRef.current = null }
    if (!voiceOnRef.current || busyRef.current) return
    if (wordIdxRef.current >= refWordsRef.current.length) return

    const speechMs = silenceAtRef.current - voiceStartRef.current
    if (speechMs < MIN_SPEECH_MS) return   // era só ruído

    const toProcess      = [...chunksRef.current]
    chunksRef.current    = []
    voiceOnRef.current   = false
    silenceAtRef.current = 0
    busyRef.current      = true
    setIsCapturing(false)

    void _processChunks(toProcess)
  }, [_processChunks])

  const start = useCallback(async (refWords: string[]) => {
    refWordsRef.current  = refWords
    wordIdxRef.current   = 0
    busyRef.current      = false
    voiceOnRef.current   = false
    silenceAtRef.current = 0
    chunksRef.current    = []
    setWordResults([])
    setWordIndex(0)
    setIsCapturing(false)

    const stream        = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    streamRef.current   = stream

    const ctx           = new AudioContext({ sampleRate: SAMPLE_RATE })
    ctxRef.current      = ctx
    const source        = ctx.createMediaStreamSource(stream)
    const processor     = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1)
    processorRef.current = processor

    const silencer      = ctx.createGain()
    silencer.gain.value = 0
    source.connect(processor)
    processor.connect(silencer)
    silencer.connect(ctx.destination)

    processor.onaudioprocess = (e) => {
      if (busyRef.current) return                            // aguarda retorno da API
      if (wordIdxRef.current >= refWordsRef.current.length) return

      const float32 = e.inputBuffer.getChannelData(0)

      // Calcula RMS
      let sum = 0
      for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i]
      const rms  = Math.sqrt(sum / float32.length)
      const isVoice = rms > VOICE_THRESH
      const now  = Date.now()

      setAudioLevel(Math.min(rms * 10, 1))

      if (isVoice) {
        if (!voiceOnRef.current) {
          // Voz começou
          voiceOnRef.current   = true
          voiceStartRef.current = now
          silenceAtRef.current  = 0
          setIsCapturing(true)

          // Timeout máximo por palavra
          if (wordTimerRef.current) clearTimeout(wordTimerRef.current)
          wordTimerRef.current = setTimeout(_flushWord, MAX_WORD_MS)
        }
        silenceAtRef.current = 0

        // Acumula PCM
        const int16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
        }
        chunksRef.current.push(int16)

      } else {
        if (voiceOnRef.current) {
          if (silenceAtRef.current === 0) silenceAtRef.current = now

          // Continua acumulando durante silêncio curto (sílabas, pausas naturais)
          const int16 = new Int16Array(float32.length)
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
          }
          chunksRef.current.push(int16)

          // Silêncio longo o suficiente → palavra acabou
          if (now - silenceAtRef.current >= SILENCE_END_MS) {
            _flushWord()
          }
        }
      }
    }
  }, [_flushWord])

  const stop = useCallback(() => {
    _teardown()
    setAudioLevel(0)
    setIsCapturing(false)
  }, [_teardown])

  const reset = useCallback(() => {
    _teardown()
    setWordResults([])
    setWordIndex(0)
    setAudioLevel(0)
    setIsCapturing(false)
    wordIdxRef.current   = 0
    busyRef.current      = false
    chunksRef.current    = []
    voiceOnRef.current   = false
    silenceAtRef.current = 0
  }, [_teardown])

  return { wordResults, wordIndex, audioLevel, isCapturing, start, stop, reset }
}
