import { timeForAngle } from './gaze-utils.js'

export const DESKTOP_GAZE_SRC = '/footer-desktop-dec0e3dc.mp4'

// One complete, small download for both puppets. Seeking a local blob never
// waits for another range request to the CDN, and failed downloads can retry.
export function createDesktopGazeSourceLoader({ fetchVideo = (...args) => fetch(...args), createURL = blob => URL.createObjectURL(blob), timeoutMs = 12000 } = {}) {
  let source
  const download = async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetchVideo(DESKTOP_GAZE_SRC, { signal: controller.signal })
        if (!response.ok) throw new Error('Desktop character unavailable')
        return createURL(await response.blob())
      } catch (error) {
        if (attempt === 1) throw error
      } finally { clearTimeout(timeout) }
    }
  }
  return () => {
    source ||= download().catch(error => { source = null; throw error })
    return source
  }
}

export const loadDesktopGazeSource = createDesktopGazeSourceLoader()

export function createDesktopGazeTracker({ video, canTrack, onFrame, requestFrame = callback => requestAnimationFrame(callback), cancelFrame = id => cancelAnimationFrame(id) }) {
  let frame = 0
  let disposed = false
  let targetAngle = null
  let displayAngle = null
  let appliedTime = Number.NaN
  let candidateTime = Number.NaN
  let candidateTicks = 0
  let lastFrameAt = 0
  const wake = () => { if (!disposed && !frame && canTrack()) frame = requestFrame(tick) }
  const stop = () => { cancelFrame(frame); frame = 0; lastFrameAt = 0 }
  const tick = timestamp => {
    frame = 0
    if (disposed || !canTrack() || video.readyState < 1 || !Number.isFinite(video.duration)) { lastFrameAt = 0; return }
    // Do not poll the decoder every animation frame. Its events resume us.
    if (video.seeking) return
    if (video.readyState >= 2) onFrame()
    if (targetAngle === null) return
    if (displayAngle === null) displayAngle = targetAngle
    const elapsed = lastFrameAt ? Math.min(64, Math.max(8, timestamp - lastFrameAt)) : 16
    lastFrameAt = timestamp
    const delta = Math.atan2(Math.sin(targetAngle - displayAngle), Math.cos(targetAngle - displayAngle))
    displayAngle = Math.abs(delta) <= .002 ? targetAngle : displayAngle + delta * (1 - Math.exp(-elapsed / 85))
    const desired = Math.max(0, Math.min(timeForAngle(displayAngle), video.duration - 1 / 24))
    if (Math.abs(desired - candidateTime) < 1 / 120) candidateTicks++
    else { candidateTime = desired; candidateTicks = 1 }
    const firstFrame = !Number.isFinite(appliedTime)
    const changed = firstFrame || Math.abs(desired - appliedTime) > 1 / 60
    if (changed && (firstFrame || candidateTicks >= 2)) {
      // HAVE_METADATA is enough to seek. Waiting for HAVE_CURRENT_DATA can
      // strand a paused video at an unbuffered frame after a fast pointer move.
      video.currentTime = desired
      appliedTime = desired
      return
    }
    if (Math.abs(delta) > .002 || changed) wake()
  }
  const events = ['loadedmetadata', 'loadeddata', 'canplay', 'seeked']
  events.forEach(event => video.addEventListener(event, wake))
  return {
    setAngle(angle) { targetAngle = angle; wake() },
    wake,
    stop,
    reset() { stop(); appliedTime = Number.NaN; candidateTime = Number.NaN; candidateTicks = 0 },
    dispose() { disposed = true; stop(); events.forEach(event => video.removeEventListener(event, wake)) },
  }
}
