import { useCallback, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'listening' | 'recording'

interface UseRecorderReturn {
  state:          RecorderState
  audioLevel:     number
  elapsedSeconds: number
  startListening: () => Promise<void>
  stopRecording:  () => Promise<Blob | null>
  cancel:         () => void
  getStream:      () => MediaStream | null
}


export function useRecorder(): UseRecorderReturn {
  const [state, setState]      = useState<RecorderState>('idle')
  const [audioLevel, setLevel] = useState(0)
  const [elapsed, setElapsed]  = useState(0)

  const streamRef    = useRef<MediaStream | null>(null)
  const contextRef   = useRef<AudioContext | null>(null)
  const analyserRef  = useRef<AnalyserNode | null>(null)
  const mediaRecRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const rafRef       = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const vadTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resolveRef   = useRef<((blob: Blob | null) => void) | null>(null)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (tickRef.current)    clearInterval(tickRef.current)
    if (vadTimerRef.current) clearTimeout(vadTimerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    contextRef.current?.close()
    streamRef.current   = null
    contextRef.current  = null
    analyserRef.current = null
    mediaRecRef.current = null
    chunksRef.current   = []
    setLevel(0)
    setElapsed(0)
  }, [])

  const startMediaRecorder = useCallback(() => {
    if (!streamRef.current) return
    const mr = new MediaRecorder(streamRef.current, { mimeType: getSupportedMimeType() })
    mediaRecRef.current = mr
    chunksRef.current   = []
    mr.ondataavailable  = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.start(100)

    startTimeRef.current = Date.now()
    setState('recording')

    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 500)
  }, [])

  const startListening = useCallback(async () => {
    setElapsed(0)

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    streamRef.current = stream

    const ctx      = new AudioContext()
    const source   = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    contextRef.current  = ctx
    analyserRef.current = analyser

    // Grava imediatamente — sem VAD hold para não perder o início da fala
    startMediaRecorder()

    const buf = new Float32Array(analyser.fftSize)
    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      const rms = Math.sqrt(buf.reduce((s, x) => s + x * x, 0) / buf.length)
      setLevel(Math.min(rms * 8, 1))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [startMediaRecorder])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      const mr = mediaRecRef.current
      if (!mr || mr.state === 'inactive') {
        cleanup()
        setState('idle')
        resolve(null)
        return
      }
      resolveRef.current = resolve
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: getSupportedMimeType() })
        cleanup()
        setState('idle')
        resolveRef.current?.(blob)
      }
      mr.stop()
    })
  }, [cleanup])

  const cancel = useCallback(() => {
    const mr = mediaRecRef.current
    if (mr && mr.state !== 'inactive') mr.stop()
    cleanup()
    setState('idle')
  }, [cleanup])

  const getStream = useCallback(() => streamRef.current, [])

  return { state, audioLevel, elapsedSeconds: elapsed, startListening, stopRecording, cancel, getStream }
}

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
}
