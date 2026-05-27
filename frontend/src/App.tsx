import { useCallback, useEffect, useRef, useState } from 'react'
import { evaluate, fetchCategories, fetchRandomText } from './api'
import { AudioLevel } from './components/AudioLevel'
import { CategoryPicker } from './components/CategoryPicker'
import { ScoreBoard } from './components/ScoreBoard'
import { SettingsMenu } from './components/SettingsMenu'
import { TextDisplay } from './components/TextDisplay'
import { useRecorder } from './hooks/useRecorder'
import { useTheme } from './hooks/useTheme'
import { useWebSocketSpeech } from './hooks/useWebSocketSpeech'
import type { AppState, Category, EvaluationResult, TextItem, TimerMode } from './types'

const TIMER_OPTIONS: { label: string; value: TimerMode }[] = [
  { label: '∞',    value: 'unlimited' },
  { label: '15',   value: 15 },
  { label: '30',   value: 30 },
  { label: '60',   value: 60 },
]

const VAD_AUTO_THRESH  = 0.015  // RMS para considerar voz
const VAD_AUTO_HOLD_MS = 200    // voz deve durar ≥200ms (filtra barulhos rápidos)

export default function App() {
  const [appState,   setAppState]   = useState<AppState>('idle')
  const [categories, setCategories] = useState<Category[]>([])
  const [category,   setCategory]   = useState<string | null>(null)
  const [textItem,   setTextItem]   = useState<TextItem | null>(null)
  const [timerMode,  setTimerMode]  = useState<TimerMode>('unlimited')
  const [elapsed,    setElapsed]    = useState(0)
  const [results,    setResults]    = useState<EvaluationResult | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  const { theme, setTheme } = useTheme()
  const recorder  = useRecorder()
  const speech    = useWebSocketSpeech()
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef  = useRef(0)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setError('Não foi possível conectar ao servidor'))
  }, [])

  // Auto-stop no countdown
  useEffect(() => {
    if (typeof timerMode === 'number' && appState === 'recording' && elapsed >= timerMode) {
      void handleStop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, timerMode, appState])


  const _startTimer = () => {
    startRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 200)
  }

  const _stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const loadText = useCallback(async (catId: string) => {
    setError(null)
    setResults(null)
    setElapsed(0)
    speech.reset()
    try {
      const item = await fetchRandomText(catId)
      setTextItem(item)
      setAppState('ready')
    } catch {
      setError('Falha ao carregar texto')
    }
  }, [speech])

  const handleCategorySelect = useCallback((id: string) => {
    setCategory(id)
    void loadText(id)
  }, [loadText])

  const handleStart = useCallback(async () => {
    if (!textItem) return
    setError(null)
    setResults(null)
    setElapsed(0)
    speech.reset()
    try {
      await speech.start(textItem.text.split(/\s+/))
      await recorder.startListening()
      _startTimer()
      setAppState('recording')
    } catch {
      setError('Não foi possível acessar o microfone')
      speech.reset()
    }
  }, [textItem, speech, recorder])

  const handleStop = useCallback(async () => {
    _stopTimer()
    speech.stop()
    const duration = Math.max(elapsed, 1)
    setAppState('analyzing')
    const blob = await recorder.stopRecording()
    if (blob && textItem) {
      try {
        const res = await evaluate(blob, textItem.text, duration)
        setResults(res)
      } catch { /* ok */ }
    }
    setAppState('results')
  }, [elapsed, recorder, speech, textItem])

  const handleReset = useCallback(() => {
    setResults(null)
    setElapsed(0)
    speech.reset()
    setAppState('ready')
  }, [speech])

  const handleNewText = useCallback(() => {
    if (category) void loadText(category)
  }, [category, loadText])

  const handleCancelAndNew = useCallback(() => {
    if (!category) return
    _stopTimer()
    speech.reset()
    void recorder.stopRecording()
    void loadText(category)
  }, [category, speech, recorder, loadText])

  // ── Auto-start: escuta mic no estado ready e dispara quando detectar voz ──
  useEffect(() => {
    if (appState !== 'ready' || !textItem || speech.modelLoading) return

    let canceled = false
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    let raf = 0

    const cleanup = () => {
      canceled = true
      cancelAnimationFrame(raf)
      ctx?.close().catch(() => {})
      stream?.getTracks().forEach(t => t.stop())
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
      if (canceled) { s.getTracks().forEach(t => t.stop()); return }
      stream = s
      ctx    = new AudioContext({ sampleRate: 16000 })
      const source   = ctx.createMediaStreamSource(s)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const buf = new Float32Array(analyser.fftSize)
      let voiceStart = 0

      const tick = () => {
        if (canceled) return
        analyser.getFloatTimeDomainData(buf)
        const rms = Math.sqrt(buf.reduce((a, x) => a + x * x, 0) / buf.length)
        if (rms > VAD_AUTO_THRESH) {
          if (voiceStart === 0) voiceStart = Date.now()
          if (Date.now() - voiceStart >= VAD_AUTO_HOLD_MS) {
            cleanup()
            void handleStart()
            return
          }
        } else {
          voiceStart = 0   // barulho rápido — zera o contador
        }
        {
          raf = requestAnimationFrame(tick)
        }
      }
      raf = requestAnimationFrame(tick)
    }).catch(() => {})

    return cleanup
  }, [appState, textItem, handleStart, speech.modelLoading])

  // ── Atalhos de teclado ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        if (appState === 'recording') handleCancelAndNew()
        else if (appState !== 'analyzing' && category) void handleNewText()
      }
      if (e.key === 'Escape' && appState === 'recording') {
        void handleStop()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [appState, category, handleNewText, handleCancelAndNew, handleStop])

  const isLocked    = appState === 'recording' || appState === 'analyzing'
  const isRecording = appState === 'recording'
  const words       = textItem?.text.split(/\s+/) ?? []

  // Auto-stop quando todas as palavras forem reconhecidas
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (appState !== 'recording' || words.length === 0) return
    if (speech.matchedCount >= words.length) {
      const t = setTimeout(() => void handleStop(), 600)
      return () => clearTimeout(t)
    }
  }, [speech.matchedCount, words.length, appState])

  const countDisplay = typeof timerMode === 'number' ? Math.max(0, timerMode - elapsed) : elapsed
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const timerColor = isRecording
    ? (typeof timerMode === 'number' && countDisplay < 10 ? 'var(--color-error)' : 'var(--color-main)')
    : 'var(--color-sub)'

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* ── Header ── */}
      <header className="px-10 pt-5 pb-0 flex items-center justify-center shrink-0">
        <img src="/logo.png" alt="MonkeYap logo" className="h-20 w-20 object-contain rounded-xl" />
      </header>

      {/* ── Mode bars (categoria + timer) ── */}
      <div className="flex flex-col items-center gap-2 py-4 shrink-0">
        <CategoryPicker
          categories={categories}
          selected={category}
          onSelect={handleCategorySelect}
          disabled={isLocked}
        />

        {/* Timer options */}
        <div className="flex items-center gap-1 bg-panel/50 rounded-full px-2 py-1.5">
          {TIMER_OPTIONS.map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => !isLocked && setTimerMode(opt.value)}
              disabled={isLocked}
              className={[
                'font-mono text-base px-5 py-1.5 rounded-full transition-all duration-200',
                isLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                timerMode === opt.value ? 'bg-bg text-main shadow-sm' : 'text-sub hover:text-text',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main — conteúdo centralizado verticalmente ── */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-10 max-w-5xl mx-auto w-full">

        {error && (
          <p className="text-error text-sm font-mono">{error}</p>
        )}

        {/* ── Texto (ready / recording / analyzing) ── */}
        {appState !== 'results' && (
          <div className={`w-full transition-all duration-500 ${isRecording ? 'recording-glow' : ''}`}>
            <TextDisplay
              item={textItem}
              wordDiff={[]}
              matchedCount={speech.matchedCount}
              isActive={isRecording || appState === 'ready'}
            />
          </div>
        )}

        {/* ── Controles abaixo do texto ── */}
        {textItem && appState !== 'results' && (
          <div className="flex flex-col items-center gap-4">

            {/* Timer */}
            <div
              className="font-mono font-bold tabular-nums transition-colors"
              style={{ fontSize: '5.5rem', lineHeight: 1, color: timerColor }}
            >
              {fmt(countDisplay)}
            </div>

            {/* Hint / contador */}
            {appState === 'ready' && (
              <p className="font-mono text-base px-4 py-1.5 rounded-full bg-panel/50 text-sub">
                {speech.modelLoading ? '⏳ carregando modelo...' : 'fale para começar'}
              </p>
            )}
            {isRecording && (
              <p className="font-mono text-base px-4 py-1.5 rounded-full bg-panel/50 text-sub tabular-nums">
                {speech.matchedCount}
                <span className="text-border mx-2">/</span>
                {words.length}
              </p>
            )}
            {appState === 'analyzing' && (
              <p className="font-mono text-base px-4 py-1.5 rounded-full bg-panel/50 text-sub animate-pulse">analisando...</p>
            )}

            {/* Audio bar */}
            <AudioLevel level={speech.audioLevel} isActive={isRecording} />

            {/* Novo texto (apenas no estado ready) */}
            {appState === 'ready' && (
              <button
                onClick={handleNewText}
                title="Novo texto (tab)"
                className="font-mono text-sub hover:text-main text-2xl cursor-pointer transition-colors mt-1"
              >
                ↻
              </button>
            )}
          </div>
        )}

        {/* ── Results ── */}
        {appState === 'results' && (
          <div className="w-full space-y-12">
            {results && <ScoreBoard result={results} />}

            <TextDisplay
              item={textItem}
              wordDiff={results?.word_diff ?? []}
              matchedCount={0}
              isActive={false}
            />

            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="font-mono text-base px-6 py-2 rounded-full bg-panel/50 text-sub hover:text-main hover:bg-panel transition-all duration-200 cursor-pointer flex items-center gap-2"
              >
                <span className="text-xl">↻</span> tentar novamente
              </button>
              <button
                onClick={handleNewText}
                className="font-mono text-base px-6 py-2 rounded-full bg-panel/50 text-sub hover:text-main hover:bg-panel transition-all duration-200 cursor-pointer flex items-center gap-2"
              >
                <span className="text-xl">→</span> novo texto
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer com keyboard hints ── */}
      <footer className="shrink-0 py-2 flex justify-center gap-8 font-mono text-base text-sub">
        <span><span className="text-text">tab</span> — novo texto</span>
        {isRecording && <span><span className="text-text">esc</span> — cancelar</span>}
      </footer>

      <SettingsMenu theme={theme} setTheme={setTheme} />
    </div>
  )
}
