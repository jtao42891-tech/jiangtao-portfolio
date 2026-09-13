import { useEffect, useRef } from 'react'
import { railReleaseTarget } from './gallery-utils'

export default function useRailMotion(ref, reduced) {
  const controls = useRef({ start() {}, end() {} })
  useEffect(() => {
    const rail = ref.current
    let frame = 0
    let target = rail.scrollLeft
    let lastTime = 0
    let deadline = 0
    const max = () => Math.max(0, rail.scrollWidth - rail.clientWidth)
    const step = () => (rail.firstElementChild?.getBoundingClientRect().width || 0) + (parseFloat(getComputedStyle(rail).columnGap) || 0)
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      target = rail.scrollLeft
    }
    const tick = time => {
      const distance = target - rail.scrollLeft
      if (Math.abs(distance) < 1 || time >= deadline) {
        rail.scrollLeft = target
        frame = 0
        return
      }
      const elapsed = Math.max(1, Math.min(64, time - lastTime))
      rail.scrollLeft += distance * (1 - Math.exp(-elapsed / 72))
      lastTime = time
      frame = requestAnimationFrame(tick)
    }
    const moveTo = (next, duration = 460) => {
      target = Math.max(0, Math.min(max(), next))
      if (reduced) { rail.scrollLeft = target; return }
      deadline = performance.now() + duration
      if (!frame) { lastTime = performance.now(); frame = requestAnimationFrame(tick) }
    }
    controls.current = {
      start(event) {
        stop()
        // Touch keeps native momentum and proximity snap, not simulated dragging.
        rail.dataset.scrollInput = event.pointerType === 'mouse' ? 'direct' : 'native'
      },
      end({ cancelled, velocityX }) {
        if (cancelled) return
        moveTo(railReleaseTarget(rail.scrollLeft, max(), step(), reduced ? 0 : velocityX))
      },
    }
    const keyboard = event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Tab'].includes(event.key)) stop()
    }
    rail.addEventListener('keydown', keyboard)
    window.addEventListener('resize', stop)
    return () => {
      stop()
      rail.removeEventListener('keydown', keyboard)
      window.removeEventListener('resize', stop)
      controls.current = { start() {}, end() {} }
    }
  }, [ref, reduced])
  return { onStart: event => controls.current.start(event), onEnd: result => controls.current.end(result) }
}
