import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { introReady } from './generated/intro-ready'
import './intro.css'

const sessionKey = 'nordix-intro-seen-v1'
const source = import.meta.env.BASE_URL + 'videos/nordix-intro.mp4'
function shouldShow() {
  if (!introReady || window.location.hash) return false
  try { return sessionStorage.getItem(sessionKey) !== '1' } catch { return true }
}
export function Intro() {
  const [visible, setVisible] = useState(shouldShow)
  const [closing, setClosing] = useState(false)
  const [muted, setMuted] = useState(true)
  const video = useRef<HTMLVideoElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const closingRef = useRef(false)
  const dismissTimer = useRef<number | undefined>(undefined)
  const finish = () => setVisible(false)
  const close = () => {
    if (closingRef.current) return
    closingRef.current = true
    video.current?.pause()
    try { sessionStorage.setItem(sessionKey, '1') } catch { /* optional storage */ }
    setClosing(true)
    dismissTimer.current = window.setTimeout(finish, 950)
  }

  useEffect(() => {
    if (!visible) return
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const player = video.current
    const previousFocus = document.activeElement
    overlay.current?.focus({ preventScroll: true })
    let startupTimer: number | undefined
    const started = () => window.clearTimeout(startupTimer)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close() }
      if (event.key === 'Tab') {
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.nordix-intro button'))
        const first = buttons[0], last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    if (player) {
      player.muted = true
      player.addEventListener('playing', started)
      startupTimer = window.setTimeout(close, 8000)
      void player.play().catch(() => { /* allow the browser another chance to start */ })
    }
    return () => {
      window.clearTimeout(startupTimer)
      window.clearTimeout(dismissTimer.current)
      player?.removeEventListener('playing', started)
      document.body.style.overflow = oldOverflow
      window.removeEventListener('keydown', onKey)
      if (previousFocus instanceof HTMLElement) previousFocus.focus({preventScroll:true})
    }
  }, [visible])

  const toggleSound = async () => {
    const player = video.current
    if (!player || closingRef.current) return
    const next = !player.muted
    player.muted = next
    setMuted(next)
    try { await player.play() } catch { player.muted = true; setMuted(true) }
  }

  if (!visible) return null
  return createPortal(
    <div ref={overlay} tabIndex={-1} className={'nordix-intro'+(closing?' nordix-intro-closing':'')} data-testid="nordix-intro" data-phase={closing?'closing':'playing'} role="dialog" aria-modal="true" aria-label="Вступление NORDIX" onTransitionEnd={event=>{if(event.target===event.currentTarget&&event.propertyName==='transform'&&closing)finish()}}>
      <video ref={video} className="nordix-intro-video" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} src={source} autoPlay muted={muted} playsInline preload="auto" onEnded={close} onError={close} />
      <button type="button" className="nordix-intro-skip" onClick={close} aria-label="Пропустить вступление" disabled={closing}/>
      <button type="button" data-testid="intro-sound" className="nordix-intro-sound" onClick={()=>void toggleSound()} disabled={closing} aria-pressed={!muted} aria-label={muted?'Включить звук':'Выключить звук'}>
        <span className="nordix-intro-speaker" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>{muted?<path d="m16 9 5 6m0-6-5 6"/>:<><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 6a8 8 0 0 1 0 12"/></>}</svg>
        </span>
        <span className="nordix-intro-sound-copy"><span>NORDIX · Sound</span><strong>{muted?'Включить звук':'Выключить звук'}</strong></span>
        <span aria-hidden="true" className={'nordix-intro-wave'+(!muted?' is-playing':'')}><i/><i/><i/><i/><i/></span>
      </button>
    </div>, document.body)
}
