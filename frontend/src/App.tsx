import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { evaluate, fetchCategories, fetchRandomText } from './api'
import { AudioLevel } from './components/AudioLevel'
import { CategoryPicker } from './components/CategoryPicker'
import { Header } from './components/Header'
import { ScoreBoard } from './components/ScoreBoard'
import { TextDisplay } from './components/TextDisplay'
import { useRecorder } from './hooks/useRecorder'
import { useTheme } from './hooks/useTheme'
import { useWebSocketSpeech } from './hooks/useWebSocketSpeech'
import type { AppState, Category, EvaluationResult, TextItem, TimerMode } from './types'


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
        const res = await evaluate(blob, textItem.text, duration, speech.transcript)
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

  // ── Auto-start: começa a gravar assim que o texto está pronto ──
  useEffect(() => {
    if (appState !== 'ready' || !textItem || speech.modelLoading) return
    void handleStart()
  }, [appState, textItem, speech.modelLoading, handleStart])

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

  // ── Derivações ──
  const liveWpm = isRecording && elapsed > 0
    ? Math.round(speech.matchedCount / elapsed * 60)
    : 0

  const countDisplay = typeof timerMode === 'number'
    ? Math.max(0, timerMode - elapsed)
    : elapsed

  const progress = typeof timerMode === 'number' && isRecording
    ? Math.min(100, (elapsed / timerMode) * 100)
    : 0

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const timerColor = isRecording
    ? (typeof timerMode === 'number' && countDisplay < 10 ? 'var(--color-error)' : 'var(--color-main)')
    : 'var(--color-sub)'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>

      {/* ── Barra de progresso no topo (modo cronometrado) ── */}
      {typeof timerMode === 'number' && isRecording && (
        <div
          className="fixed top-0 left-0 z-50 transition-all duration-300 ease-linear"
          style={{ width: `${progress}%`, height: '3px', background: 'var(--color-main)' }}
        />
      )}

      {/* ── Header Monkeytype-style ── */}
      <Header theme={theme} setTheme={setTheme} />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-4">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-8">

          {/* ── Config bar (escondida nos resultados) ── */}
          {appState !== 'results' && (
            <CategoryPicker
              categories={categories}
              selectedCategory={category}
              onSelectCategory={handleCategorySelect}
              timerMode={timerMode}
              onSelectTimer={mode => !isLocked && setTimerMode(mode)}
              disabled={isLocked}
            />
          )}

          {/* ── Erro ── */}
          {error && (
            <p className="font-mono text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
          )}

          {/* ── Área de teste ── */}
          {appState !== 'results' && (
            <div className="w-full flex flex-col items-center gap-5">

              {/* Live stats — acima do texto, visíveis só durante gravação */}
              {isRecording && (
                <div className="w-full flex items-end gap-8">
                  <div>
                    <div className="font-mono font-bold tabular-nums leading-none" style={{ fontSize: '2rem', color: 'var(--color-text)' }}>
                      {liveWpm}
                    </div>
                    <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-sub)' }}>wpm</div>
                  </div>
                  <div>
                    <div className="font-mono font-bold tabular-nums leading-none" style={{ fontSize: '2rem', color: 'var(--color-text)' }}>
                      {speech.matchedCount}
                      <span className="font-normal" style={{ color: 'var(--color-sub)', fontSize: '1.1rem' }}>
                        /{words.length}
                      </span>
                    </div>
                    <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-sub)' }}>palavras</div>
                  </div>
                </div>
              )}

              {/* Texto */}
              {textItem && (
                <div className={`w-full transition-all duration-500 ${isRecording ? 'recording-glow' : ''}`}>
                  <TextDisplay
                    item={textItem}
                    wordDiff={[]}
                    matchedCount={speech.matchedCount}
                    isActive={isRecording || appState === 'ready'}
                  />
                </div>
              )}

              {/* Placeholder sem texto */}
              {!textItem && (
                <p className="font-mono text-base py-16" style={{ color: 'var(--color-sub)' }}>
                  selecione uma categoria para começar
                </p>
              )}

              {/* ── Controles abaixo do texto ── */}
              {textItem && (
                <div className="flex flex-col items-center gap-3">
                  {/* Timer */}
                  <div
                    className="font-mono font-bold tabular-nums transition-colors duration-300"
                    style={{ fontSize: '4.5rem', lineHeight: 1, color: timerColor }}
                  >
                    {fmt(countDisplay)}
                  </div>

                  {/* Status / hint */}
                  {appState === 'ready' && (
                    <p className="font-mono text-sm px-4 py-1.5 rounded-full" style={{ background: 'rgb(var(--color-panel-rgb)/0.6)', color: 'var(--color-sub)' }}>
                      {speech.modelLoading ? '⏳ carregando modelo...' : 'fale para começar'}
                    </p>
                  )}
                  {isRecording && <AudioLevel level={speech.audioLevel} isActive />}
                  {appState === 'analyzing' && (
                    <p className="font-mono text-sm animate-pulse" style={{ color: 'var(--color-sub)' }}>analisando...</p>
                  )}

                  {/* Restart icon — estilo Monkeytype */}
                  {appState === 'ready' && (
                    <button
                      onClick={handleNewText}
                      title="Novo texto (tab)"
                      className="mt-1 cursor-pointer transition-colors duration-150"
                      style={{ color: 'var(--color-sub)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-main)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-sub)' }}
                    >
                      <RestartIcon />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Resultados ── */}
          {appState === 'results' && (
            <div className="w-full animate-slide-up flex flex-col gap-10">
              {results && <ScoreBoard result={results} timerMode={timerMode} elapsed={elapsed} />}

              <TextDisplay
                item={textItem}
                wordDiff={results?.word_diff ?? []}
                matchedCount={0}
                isActive={false}
              />

              <div className="flex items-center gap-3">
                <ActionButton onClick={handleReset} title="tentar novamente">
                  <RestartIcon />
                </ActionButton>
                <ActionButton onClick={handleNewText} title="próximo texto">
                  <NextIcon />
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="shrink-0 py-4 flex justify-center gap-8 font-mono text-sm" style={{ color: 'var(--color-sub)' }}>
        <span>
          <span style={{ color: 'var(--color-text)' }}>tab</span>{' '}— novo texto
        </span>
        {isRecording && (
          <span>
            <span style={{ color: 'var(--color-text)' }}>esc</span>{' '}— parar
          </span>
        )}
      </footer>
    </div>
  )
}

function ActionButton({ onClick, title, children }: { onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="font-mono text-sm px-5 py-2 rounded-xl transition-all duration-150 cursor-pointer flex items-center gap-2"
      style={{ background: 'rgb(var(--color-panel-rgb)/0.6)', color: 'var(--color-sub)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-main)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-sub)' }}
    >
      {children} {title}
    </button>
  )
}

function RestartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.65" />
    </svg>
  )
}

function NextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}
