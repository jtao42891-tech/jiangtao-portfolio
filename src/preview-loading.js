export function isMobilePreviewDevice() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches
}

export function observePreviewImage(image, onWidth, { mobile = false } = {}) {
  let active = false
  let disposed = false
  const measure = () => {
    if (disposed) return
    const width = Math.ceil(image.clientWidth)
    if (width > 0) {
      // Let the browser schedule/cache coalesced requests, but put the phone's
      // visible artwork ahead of the next-screen prefetches (including GIFs).
      const rect = mobile ? image.getBoundingClientRect() : null
      const priority = mobile && rect.bottom > 0 && rect.top < window.innerHeight ? 'high' : undefined
      onWidth(width, priority)
    }
  }
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
  const activate = () => {
    if (active || disposed) return
    active = true
    measure()
    resize?.observe(image)
  }
  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return
    activate()
    observer.disconnect()
  }, { rootMargin: mobile ? '900px 0px' : '350px 0px' })
  if (observer) observer.observe(image)
  else activate()
  const measureActive = () => { if (active) measure() }
  if (!resize) window.addEventListener('resize', measureActive)
  return () => {
    disposed = true
    observer?.disconnect()
    resize?.disconnect()
    if (!resize) window.removeEventListener('resize', measureActive)
  }
}
