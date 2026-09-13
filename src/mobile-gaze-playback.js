// Share one small download between the hero and footer, below artwork priority.
export function createMobileGazeSourceLoader({ fetchVideo = (...args) => fetch(...args), createURL = blob => URL.createObjectURL(blob) } = {}) {
  let source
  return () => {
    source ||= fetchVideo('/footer-mobile.mp4', { priority: 'low' })
      .then(response => {
        if (!response.ok) throw new Error('Mobile character unavailable')
        return response.blob()
      })
      .then(createURL)
      .catch(error => { source = null; throw error })
    // The single object URL is reused for this page's lifetime (about 290 KB).
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
    // video request stays low priority and never blocks image rendering.
    timer = windowTarget.setTimeout(schedule, 4000)
  }, 300)
  return () => {
    cancelled = true
    windowTarget.clearTimeout(timer)
    if (idle) windowTarget.cancelIdleCallback(idle)
    clearListeners()
  }
}

export function createMobileGazePlayback({ video, showVideo, showPoster, documentTarget = document,
  defer = deferMobileGazeLoad, loadSource = loadMobileGazeSource }) {
  let active = false
  let disposed = false
  let queued = null
  let loading = false
  let loaded = false
  let playing = false
  let playAttempt = 0
  let blocked = false
  const play = () => {
    if (disposed || !active || !loaded || playing || !video.paused || documentTarget.hidden) return
    playing = true
    const attempt = ++playAttempt
    // Set these before play(), including the reflected inline/muted attributes
    // required by mobile WebKit. No sound or touch-following interaction.
    video.muted = video.defaultMuted = video.playsInline = video.loop = true
    video.setAttribute('muted', '')
    video.setAttribute('playsinline', '')
    Promise.resolve(video.play()).then(() => {
      if (attempt !== playAttempt) return
      playing = false
      blocked = false
      if (disposed || !active || documentTarget.hidden) video.pause()
    }).catch(() => {
      if (attempt !== playAttempt) return
      playing = false
      if (!disposed && active) { blocked = true; showPoster() }
    })
  }
  const frameReady = () => {
    if (!disposed && active && !documentTarget.hidden) showVideo()
    else video.pause()
  }
  const retry = () => { if (blocked) play() }
  const error = () => { if (!disposed) showPoster() }
  const setActive = next => {
    active = next && !disposed
    if (!active) {
      queued?.(); queued = null
      playAttempt++
      playing = false
      video.pause()
      return
    }
    if (loaded) { play(); return }
    if (queued || loading) return
    queued = defer(() => {
      queued = null
      if (disposed || !active || documentTarget.hidden) return
      loading = true
      loadSource().then(source => {
        loading = false
        if (disposed) return
        loaded = true
        video.preload = 'none'
        video.src = source
        play()
      }).catch(() => { loading = false; if (!disposed) showPoster() })
    })
  }
  video.addEventListener('playing', frameReady)
  video.addEventListener('canplay', play)
  video.addEventListener('error', error)
  // Some phones block even muted autoplay in low-power mode. A normal page
  // gesture retries it; the character itself never needs a second click.
  documentTarget.addEventListener('pointerup', retry, { passive: true })
  return {
    setActive,
    dispose() {
      disposed = true
      setActive(false)
      video.removeEventListener('playing', frameReady)
      video.removeEventListener('canplay', play)
      video.removeEventListener('error', error)
      documentTarget.removeEventListener('pointerup', retry)
    },
  }
}
