import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { t } from '../i18n'

export interface ShareData {
  scores:        Record<string, number>
  wpm:           number | null
  elapsed:       number
  textTitle:     string
  categoryLabel: string
  language:      string
  date?:         string
}

interface Props {
  data:       ShareData
  onClose?:   () => void   // present when used inside a modal
}

const METRICS = ['Precisão', 'Completude', 'Fluência', 'Ritmo', 'Entonação'] as const

function scoreColor(s: number) {
  return s >= 8 ? '#00d084' : s >= 6 ? '#e2b714' : '#ca4754'
}

async function buildImageFile(el: HTMLDivElement) {
  const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true })
  const blob    = await fetch(dataUrl).then(r => r.blob())
  const file    = new File([blob], 'monkeyap.png', { type: 'image/png' })
  return { dataUrl, file }
}

export function ShareCard({ data, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy]           = useState(false)
  const [igCopied, setIgCopied]   = useState(false)
  const [xCopied,  setXCopied]    = useState(false)

  const { scores, wpm, elapsed, textTitle, categoryLabel, language, date } = data
  const geral = scores['Geral']
  const flag  = language === 'en' ? '🇺🇸' : '🇧🇷'

  const shareText = language === 'en'
    ? `I just practiced public speaking on MonkeYap! Score: ${geral?.toFixed(1) ?? '—'}/10${wpm ? ` · ${wpm} wpm` : ''} 🎤`
    : `Pratiquei oratória no MonkeYap! Nota: ${geral?.toFixed(1) ?? '—'}/10${wpm ? ` · ${wpm} wpm` : ''} 🎤`

  const xShareText = shareText + (language === 'en'
    ? ' [Paste the copied image here and delete this text]'
    : ' [Cole a imagem copiada aqui e apague este texto]')

  const dateStr = new Date(date ?? Date.now()).toLocaleDateString(
    language === 'en' ? 'en-US' : 'pt-BR',
    { day: '2-digit', month: 'short', year: 'numeric' },
  )

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  const handleDownload = async () => {
    if (!cardRef.current) return
    setBusy(true)
    try {
      const { dataUrl } = await buildImageFile(cardRef.current)
      const a = document.createElement('a')
      a.download = `monkeyap-${Date.now()}.png`
      a.href = dataUrl
      a.click()
    } finally { setBusy(false) }
  }

  const handleXShare = async () => {
    if (!cardRef.current) return
    setBusy(true)
    try {
      const { dataUrl } = await buildImageFile(cardRef.current)
      const blob = await fetch(dataUrl).then(r => r.blob())
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setXCopied(true)
        // give user time to read the notice before focus jumps to the new tab
        await new Promise(r => setTimeout(r, 900))
        setTimeout(() => setXCopied(false), 3500)
      } catch { /* clipboard not available, open immediately */ }
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(xShareText)}`, '_blank', 'noopener,noreferrer')
    } finally { setBusy(false) }
  }

  const handleInstagram = async () => {
    if (!cardRef.current) return
    setBusy(true)
    try {
      const { dataUrl } = await buildImageFile(cardRef.current)
      const blob = await fetch(dataUrl).then(r => r.blob())
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setIgCopied(true)
      setTimeout(() => setIgCopied(false), 3000)
    } catch {
      // fallback: just download
      const { dataUrl } = await buildImageFile(cardRef.current)
      const a = document.createElement('a')
      a.download = `monkeyap-instagram-${Date.now()}.png`
      a.href = dataUrl
      a.click()
    } finally { setBusy(false) }
  }

  const handleNativeShare = async () => {
    if (!cardRef.current) return
    setBusy(true)
    try {
      const { file } = await buildImageFile(cardRef.current)
      await navigator.share({ title: 'MonkeYap', text: shareText, files: [file] })
    } catch { /* cancelled */ } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {/* ── Card capturado ── */}
      <div
        ref={cardRef}
        style={{
          width: '520px', background: '#1a1a2e', borderRadius: '16px',
          padding: '32px', fontFamily: '"Courier New", Courier, monospace',
          color: '#e2e2e2', boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#646480', marginBottom: '4px' }}>
              {flag} {categoryLabel}
            </div>
            <div style={{ fontSize: '15px', color: '#c0c0d0', maxWidth: '320px', lineHeight: 1.3 }}>
              {textTitle}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#646480' }}>{dateStr}</div>
            {wpm != null && (
              <div style={{ fontSize: '13px', color: '#9090a8', marginTop: '4px' }}>
                {wpm} <span style={{ fontSize: '10px' }}>wpm</span>
              </div>
            )}
          </div>
        </div>

        {geral != null && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '80px', fontWeight: 'bold', lineHeight: 1, color: scoreColor(geral) }}>
              {geral.toFixed(1)}
            </div>
            <div style={{ fontSize: '11px', color: '#646480', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '4px' }}>
              {t(language, 'label_overall')}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', borderTop: '1px solid #2a2a3e', paddingTop: '20px' }}>
          {METRICS.filter(k => k in scores).map((k, i) => (
            <div key={k} style={{ flex: 1, paddingLeft: i === 0 ? 0 : '16px', borderLeft: i === 0 ? 'none' : '1px solid #2a2a3e' }}>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: scoreColor(scores[k]) }}>{scores[k].toFixed(1)}</div>
              <div style={{ fontSize: '9px', color: '#646480', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{k.slice(0, 6)}</div>
            </div>
          ))}
          <div style={{ flex: 1, paddingLeft: '16px', borderLeft: '1px solid #2a2a3e' }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#9090a8' }}>{elapsed}s</div>
            <div style={{ fontSize: '9px', color: '#646480', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{t(language, 'label_time')}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '0.05em' }}>
            <span style={{ color: '#00d084' }}>monke</span>
            <span style={{ color: '#646480' }}>yap</span>
          </div>
        </div>
      </div>

      {/* ── Aviso clipboard X ── */}
      {xCopied && (
        <div
          className="w-full font-mono text-xs px-4 py-2 rounded-xl flex items-center gap-2"
          style={{
            background: 'color-mix(in srgb, var(--color-main) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-main) 35%, transparent)',
            color: 'var(--color-main)',
          }}
        >
          {t(language, 'x_banner').replace('Ctrl+V', '')} <strong>Ctrl+V</strong>
        </div>
      )}

      {/* ── Botões ── */}
      <div className="flex items-center gap-2">
        <ActionBtn onClick={handleDownload} disabled={busy} title={t(language, 'save')}>
          <DownloadIcon />{busy ? t(language, 'generating') : t(language, 'save')}
        </ActionBtn>
        {canNativeShare && (
          <ActionBtn onClick={handleNativeShare} disabled={busy} title={t(language, 'share')}>
            <ShareIcon />{t(language, 'share')}
          </ActionBtn>
        )}
        {!canNativeShare && (
          <>
            <SocialLink href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`} title="WhatsApp">
              <WhatsAppIcon />WhatsApp
            </SocialLink>
            <ActionBtn onClick={handleXShare} disabled={busy} title="X">
              <XIcon />{xCopied ? t(language, 'x_pasted') : 'X'}
            </ActionBtn>
          </>
        )}
        <ActionBtn onClick={handleInstagram} disabled={busy} title="Instagram">
          <InstagramIcon />
          {igCopied ? t(language, 'ig_copied') : 'Instagram'}
        </ActionBtn>
        {onClose && (
          <ActionBtn onClick={onClose} title={t(language, 'close')}>
            <CloseIcon />{t(language, 'close').replace('✕ ', '')}
          </ActionBtn>
        )}
      </div>
    </div>
  )
}

/* ── Modal wrapper ── */
export function ShareModal({ data, onClose }: { data: ShareData; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-auto"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()}>
        <ShareCard data={data} onClose={onClose} />
      </div>
    </div>
  )
}

/* ── Sub-components ── */
function SocialLink({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer" title={title}
      className="font-mono text-sm px-4 py-2 rounded-xl transition-all duration-150 flex items-center gap-2 no-underline"
      style={{ background: 'rgb(var(--color-panel-rgb)/0.6)', color: 'var(--color-sub)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-main)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-sub)' }}
    >
      {children}
    </a>
  )
}

function ActionBtn({ onClick, disabled, title, children }: { onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      className="font-mono text-sm px-4 py-2 rounded-xl transition-all duration-150 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
      style={{ background: 'rgb(var(--color-panel-rgb)/0.6)', color: 'var(--color-sub)' }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.color = 'var(--color-main)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-sub)' }}
    >
      {children}
    </button>
  )
}

function DownloadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
function ShareIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
}
function CloseIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function WhatsAppIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}
function XIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.629 5.905-5.629zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
}
function InstagramIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
}
