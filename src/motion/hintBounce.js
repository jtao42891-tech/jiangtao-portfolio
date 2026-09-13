export const HINT_BOUNCE = Object.freeze({ duration: 1650, delay: 120 })

export function hintBounceFrames(distance) {
  const rebound = Math.min(16, Math.max(8, distance * 0.25))
  const pose = (y, x = 1, scaleY = 1) => `translateY(${y}px) scale(${x}, ${scaleY})`
  return [
    { offset: 0, transform: pose(0), easing: 'cubic-bezier(.55,0,.9,.45)' },
    { offset: 0.26, transform: pose(distance), easing: 'cubic-bezier(.2,.8,.3,1)' },
    { offset: 0.33, transform: pose(distance, 1.08, 0.76), easing: 'cubic-bezier(.15,.75,.25,1)' },
    { offset: 0.58, transform: pose(-rebound, 0.98, 1.05), easing: 'ease-in' },
    { offset: 0.72, transform: pose(rebound * 0.35, 1.02, 0.97), easing: 'ease-out' },
    { offset: 0.85, transform: pose(-rebound * 0.16, 0.995, 1.01), easing: 'ease-in-out' },
    { offset: 1, transform: pose(0) },
  ]
}

// The instruction moves; the artwork and document layout never do.
export function createHintBounceMotion(hint, reduced) {
  if (reduced || !hint?.animate || typeof IntersectionObserver === 'undefined' || hint.dataset.hintIntroPlayed) return () => {}
  const section = hint.closest('.work-category')
  const card = section?.querySelector('.homepage-preview-card:last-child .homepage-preview-cover')
  if (!card) return () => {}
  const artwork = card.querySelector('img')
  let animation
  let pending
  let disposed = false
  let observer

  const isVisible = () => {
    if (!hint.isConnected || !card.isConnected) return false
    const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0
    const buttonRect = hint.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    return buttonRect.top >= headerBottom + 4 && cardRect.top < innerHeight - 24 && cardRect.top > headerBottom
  }
  const finish = () => {
    clearTimeout(pending)
    observer?.disconnect()
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVisibility)
    section.removeEventListener('pointerdown', onInteract, true)
    section.removeEventListener('focusin', onInteract)
    artwork?.removeEventListener('load', tryStart)
    artwork?.removeEventListener('error', tryStart)
    if (animation) {
      animation.onfinish = null
      animation.oncancel = null
      animation.cancel()
      animation = null
    }
    hint.style.willChange = ''
  }
  const tryStart = () => {
    clearTimeout(pending)
    if (disposed || animation || hint.dataset.hintIntroPlayed || document.hidden || !isVisible()) return
    const curtain = document.querySelector('.opening-scene')
    if (curtain && getComputedStyle(curtain).visibility !== 'hidden' && getComputedStyle(curtain).display !== 'none') {
      pending = setTimeout(tryStart, 100)
      return
    }
    if (artwork && !artwork.complete) return
    const distance = card.getBoundingClientRect().top - hint.getBoundingClientRect().bottom
    if (distance < 2 || distance > 180) return
    try {
      hint.style.willChange = 'transform'
      animation = hint.animate(hintBounceFrames(distance), { ...HINT_BOUNCE, fill: 'none' })
      hint.dataset.hintIntroPlayed = 'true'
      animation.onfinish = finish
      animation.oncancel = finish
    } catch {
      finish()
    }
  }
  const onResize = () => { if (animation) finish(); else tryStart() }
  const onVisibility = () => {
    if (document.hidden) { clearTimeout(pending); if (animation) finish() }
    else tryStart()
  }
  const onInteract = () => { hint.dataset.hintIntroPlayed = 'true'; finish() }
  observer = new IntersectionObserver(() => {
    if (animation) { if (!isVisible()) finish() }
    else tryStart()
  }, { threshold: [0, 1], rootMargin: '-80px 0px -24px 0px' })
  observer.observe(hint)
  observer.observe(card)
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)
  section.addEventListener('pointerdown', onInteract, true)
  section.addEventListener('focusin', onInteract)
  artwork?.addEventListener('load', tryStart)
  artwork?.addEventListener('error', tryStart)
  return () => { disposed = true; finish() }
}
