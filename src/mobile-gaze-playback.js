export const MOBILE_GAZE_ANIMATION_SRC = '/footer-mobile-2b91be58.webp'

// Animated images do not use video.play() or require a user-activation gesture.
// Share their one small download between hero/footer, below artwork priority.
export function createMobileGazeSourceLoader({ fetchImage = (...args) => fetch(...args), createURL = blob => URL.createObjectURL(blob) } = {}) {
  let source
  return () => {
    source ||= fetchImage(MOBILE_GAZE_ANIMATION_SRC, { priority: 'low' })
      .then(response => {
        if (!response.ok) throw new Error('Mobile character unavailable')
        return response.blob()
      })
      .then(createURL)
      .catch(error => { source = null; throw error })
    // The single object URL is reused for this page's lifetime.
    return source
  }
}

const loadMobileGazeSource = createMobileGazeSourceLoader()

export function deferMobileGazeLoad(callback, { windowTarget = window, documentTarget = document } = {}) {
  let cancelled = false
  let idle = 0
  const listeners = []
  const clearListeners = () => listeners.splice(0).forEach(([image, settle]) => {
    image.removeEventListener('load', settle)
    image.removeEventListener('error', settle)
  })
  const run = () => { if (!cancelled) callback() }
  const schedule = () => {
    windowTarget.clearTimeout(timer)
    clearListeners()
    if (cancelled) return
    if (windowTarget.requestIdleCallback) idle = windowTarget.requestIdleCallback(run, { timeout: 1800 })
    else timer = windowTarget.setTimeout(run, 150)
  }
  // Give React's image observers time to select their mobile preview sources.
  let timer = windowTarget.setTimeout(() => {
    const pending = new Set(Array.from(documentTarget.images).filter(image => {
      if (image.complete || !(image.currentSrc || image.getAttribute('src'))) return false
      const rect = image.getBoundingClientRect()
      return rect.bottom > 0 && rect.top < windowTarget.innerHeight
    }))
    if (!pending.size) { schedule(); return }
    pending.forEach(image => {
      const settle = () => { pending.delete(image); if (!pending.size) schedule() }
      listeners.push([image, settle])
      image.addEventListener('load', settle, { once: true })
      image.addEventListener('error', settle, { once: true })
    })
    // A stalled image must not prevent animation forever; even then the shared
    // animation request stays low priority and never blocks image rendering.
    timer = windowTarget.setTimeout(schedule, 4000)
  }, 300)
  return () => {
    cancelled = true
    windowTarget.clearTimeout(timer)
    if (idle) windowTarget.cancelIdleCallback(idle)
    clearListeners()
  }
}

export function createMobileGazeAnimation({ image, documentTarget = document,
  defer = deferMobileGazeLoad, loadSource = loadMobileGazeSource }) {
  let active = false
  let disposed = false
  let queued = null
  let loading = false
  let source = null
  const poster = image.getAttribute('src') || '/footer-poster.jpg'
  const show = src => {
    if (image.getAttribute('src') !== src) image.src = src
  }
  const animate = () => {
    if (!disposed && active && source && !documentTarget.hidden) show(source)
  }
  const error = () => { if (!disposed && image.getAttribute('src') === source) show(poster) }
  const setActive = next => {
    active = next && !disposed
    if (!active) {
      queued?.(); queued = null
      // Detach the animated image offscreen/in the background to stop decoding.
      show(poster)
      return
    }
    if (source) { animate(); return }
    if (queued || loading) return
    queued = defer(() => {
      queued = null
      if (disposed || !active || documentTarget.hidden) return
      loading = true
      loadSource().then(url => {
        loading = false
        if (disposed) return
        source = url
        animate()
      }).catch(() => { loading = false; if (!disposed) show(poster) })
    })
  }
  image.addEventListener('error', error)
  return {
    setActive,
    dispose() {
      disposed = true
      setActive(false)
      image.removeEventListener('error', error)
    },
  }
}
