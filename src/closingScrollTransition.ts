/**
 * The last NORDIX transition is a scroll-controlled curtain, not a 1-shot
 * page jump. CSS pins the white closing artwork behind the black invitation.
 * Mouse-wheel deltas move the document with easing; releasing the wheel
 * simply ends the glide at the exact distance requested.
 */
export function installClosingScrollTransition(): () => void {
  const scene = document.querySelector<HTMLElement>('.nordix-final-scene')
  if (!scene) return () => {}

  const root = document.documentElement
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const wheelDevice = window.matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)')
  let targetY: number | null = null
  let raf = 0
  let lastTime = 0

  const stop = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    lastTime = 0
    targetY = null
    root.classList.remove('nordix-final-scroll-active')
  }

  const animate = (now: number) => {
    if (targetY === null) {
      stop()
      return
    }
    const dt = lastTime ? Math.min(50, now - lastTime) : 16
    lastTime = now
    const currentY = window.scrollY
    const difference = targetY - currentY
    if (Math.abs(difference) < 0.75) {
      window.scrollTo(0, targetY)
      stop()
      return
    }
    // Frame-rate independent ease-out; more wheel ticks update the destination.
    const amount = 1 - Math.exp(-dt / 145)
    window.scrollTo(0, currentY + difference * amount)
    raf = requestAnimationFrame(animate)
  }

  const onWheel = (event: WheelEvent) => {
    if (reducedMotion.matches || !wheelDevice.matches || event.ctrlKey || event.metaKey) {
      return
    }
    if (!event.cancelable || Math.abs(event.deltaY) < 1) return
    if (document.querySelector('#enroll-modal:not(.hidden), #video-modal:not(.hidden)')) return

    const startY = scene.getBoundingClientRect().top + window.scrollY
    const endY = Math.min(
      startY + window.innerHeight,
      document.documentElement.scrollHeight - window.innerHeight,
    )
    const currentY = window.scrollY
    // Don't interfere with normal scroll outside the final two sections.
    if (currentY < startY - 2 || currentY > endY + 2) {
      if (raf) stop()
      return
    }
    if (event.deltaY > 0 && currentY >= endY - 1 && !raf) return
    if (event.deltaY < 0 && currentY <= startY + 1 && !raf) return

    event.preventDefault()
    const delta = event.deltaMode === 1
      ? event.deltaY * 16
      : event.deltaMode === 2
        ? event.deltaY * window.innerHeight
        : event.deltaY
    // Avoid giant jumps from fast wheel/touchpad input; keep reveal proportional.
    const step = Math.max(-280, Math.min(280, delta * 1.25))
    targetY = Math.max(startY, Math.min(endY, (targetY ?? currentY) + step))
    if (!raf) {
      lastTime = 0
      root.classList.add('nordix-final-scroll-active')
      raf = requestAnimationFrame(animate)
    }
  }

  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', stop, { passive: true })
  window.addEventListener('keydown', stop)
  return () => {
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('touchstart', stop)
    window.removeEventListener('keydown', stop)
    stop()
  }
}
