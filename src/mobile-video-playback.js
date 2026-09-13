// Called while the phone's tap is still active, not after a slow loadeddata
// event. play() asks the browser to buffer immediately and starts when ready.
export function startMobileVideoPlayback(player, source) {
  let stopped = false
  // React StrictMode can detach/reattach the same node in development.
  if (source && player.getAttribute('src') !== source) player.src = source
  player.playsInline = true
  player.preload = 'auto'
  player.setAttribute('playsinline', '')
  const playback = player.play()
  playback?.catch(error => {
    if (stopped || error.name !== 'NotAllowedError' || player.closest?.('dialog')?.dataset.closing === 'true') return
    player.muted = true
    player.play()?.catch(() => {})
  })
  return () => {
    stopped = true
    player.pause()
    // A dismissed/changed preview must not keep buffering in the background.
    player.removeAttribute('src')
    player.load()
  }
}
