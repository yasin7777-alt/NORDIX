/**
 * Reference-based scroll transition for the last two NORDIX sections.
 * Like the Freshman video: both sections remain in document flow,
 * the new full-screen section rises from below, and the movement eases to rest.
 * It does not create a covering splash/wipe or change the artwork.
 */
export function installClosingScrollTransition(): () => void {
  const footer = document.querySelector<HTMLElement>('footer')
  const closing = document.getElementById('closing')
  if (!footer || !closing) return () => {}

  const root = document.documentElement
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  let animationFrame = 0
  let transitioning = false

  const absoluteTop = (element: Element) =>
    window.scrollY + element.getBoundingClientRect().top

  const release = () => {
    transitioning = false
    root.classList.remove('nordix-final-scroll-active')
    animationFrame = 0
  }

  const glideTo = (targetY: number) => {
    const originY = window.scrollY
    const distance = targetY - originY
    if (Math.abs(distance) < 2) return

    transitioning = true
    root.classList.add('nordix-final-scroll-active')
    const started = performance.now()
    const duration = 950

    const frame = (now: number) => {
      const progress = Math.min(1, (now - started) / duration)
      // Ease-out cubic — fast at first, gentle stop, as in the supplied clip.
      const eased = 1 - Math.pow(1 - progress, 3)
      window.scrollTo(0, originY + distance * eased)
      if (progress < 1) {
        animationFrame = requestAnimationFrame(frame)
      } else {
        window.scrollTo(0, targetY)
        release()
      }
    }
    animationFrame = requestAnimationFrame(frame)
  }

  const onWheel = (event: WheelEvent) => {
    // Let zoom gestures, accessibility settings, touch and other pages scroll normally.
    if (motion.matches || !finePointer.matches || event.ctrlKey) return
    if (!event.cancelable || Math.abs(event.deltaY) < 1) return

    if (transitioning) {
      event.preventDefault()
      return
    }

    // Do not move the page while an interactive modal is open.
    if (document.querySelector('#enroll-modal:not(.hidden), #video-modal:not(.hidden)')) return

    const viewport = window.innerHeight
    const currentY = window.scrollY
    const footerY = absoluteTop(footer)
    const closingY = absoluteTop(closing)

    // Only the black invitation and the following white closing are affected.
    if (
      event.deltaY > 0 &&
      currentY >= footerY - 8 &&
      currentY < closingY - viewport * .1
    ) {
      event.preventDefault()
      glideTo(closingY)
    } else if (
      event.deltaY < 0 &&
      currentY >= footerY + viewport * .89 &&
      currentY <= closingY + viewport * .2
    ) {
      event.preventDefault()
      glideTo(footerY)
    }
  }

  window.addEventListener('wheel', onWheel, { passive: false })
  return () => {
    window.removeEventListener('wheel', onWheel)
    if (animationFrame) cancelAnimationFrame(animationFrame)
    release()
  }
}
