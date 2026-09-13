export const PROFILE_TOUCH_QUERY = '(hover: none) and (pointer: coarse)'

// A phone gets the automatic intro only. In particular, scrolling must not
// deliver pointercancel or a browser-toolbar resize that resets that intro.
export function observeProfileInteractions({ shell, touchQuery, windowTarget, move, leave, reset, scheduleIntro }) {
  const handlers = { pointerenter: move, pointermove: move, pointerleave: leave, pointercancel: reset }
  let bound = false
  const sync = () => {
    const shouldBind = !touchQuery.matches
    if (bound === shouldBind) return
    for (const [type, listener] of Object.entries(handlers)) {
      if (shouldBind) shell.addEventListener(type, listener)
      else shell.removeEventListener(type, listener)
    }
    bound = shouldBind
  }
  const resize = () => {
    if (!touchQuery.matches) reset()
    scheduleIntro()
  }
  const modeChange = () => { sync(); reset(); scheduleIntro() }
  sync()
  touchQuery.addEventListener('change', modeChange)
  windowTarget.addEventListener('resize', resize)
  return () => {
    for (const [type, listener] of Object.entries(handlers)) shell.removeEventListener(type, listener)
    touchQuery.removeEventListener('change', modeChange)
    windowTarget.removeEventListener('resize', resize)
  }
}
