import { useCallback, useEffect, useRef, useState } from 'react'
import { advanceIPPhase, ipOrbitStyles, nextIPIndex } from './ip-utils'

export default function useIPOrbit(total, reduced) {
  const [active, setActive] = useState(0)
  const [manual, setManual] = useState(false)
  const stageRef = useRef(null)
  const figures = useRef([])
  const phase = useRef(0)
  const activeRef = useRef(0)
  const manualRef = useRef(false)
  const drag = useRef(null)
  const hovered = useRef(null)
  const keyboardFocus = useRef(false)
  const tween = useRef(null)
  const controls = useRef({ sync() {}, stop() {} })
  const registerFigure = useCallback((index, node) => { figures.current[index] = node }, [])

  const paint = useCallback((next, fromInteraction = false) => {
    phase.current = nextIPIndex(next, 0, total)
    figures.current.forEach((node, index) => {
      if (!node) return
      Object.entries(ipOrbitStyles(index, phase.current, total)).forEach(([property, value]) => node.style.setProperty(property, value))
    })
    const nearest = nextIPIndex(Math.round(phase.current), 0, total)
    if (nearest !== activeRef.current) { activeRef.current = nearest; setActive(nearest) }
    if (manualRef.current !== fromInteraction) { manualRef.current = fromInteraction; setManual(fromInteraction) }
  }, [total])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    if (reduced && tween.current) {
      const destination = tween.current.to
      tween.current = null
      paint(destination, true)
    }
    let frame = 0
    let lastTime = null
    let visible = typeof IntersectionObserver === 'undefined'
    const canRun = () => visible && !document.hidden && !drag.current &&
      (tween.current || (!reduced && total > 1 && hovered.current === null && !keyboardFocus.current))
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      lastTime = null
      if (tween.current) tween.current.lastTime = null
    }
    const tick = time => {
      frame = 0
      if (!canRun()) { lastTime = null; return }
      const elapsed = lastTime === null ? 0 : time - lastTime
      lastTime = time
      const move = tween.current
      if (move) {
        move.elapsed += move.lastTime === null ? 0 : Math.max(0, Math.min(64, time - move.lastTime))
        move.lastTime = time
        const progress = Math.min(1, move.elapsed / 520)
        paint(move.from + (move.to - move.from) * (1 - (1 - progress) ** 3), true)
        if (progress === 1) tween.current = null
      } else {
        paint(advanceIPPhase(phase.current, elapsed, total))
      }
      if (canRun()) frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      if (!canRun()) { stop(); return }
      if (!frame) { lastTime = null; frame = requestAnimationFrame(tick) }
    }
    controls.current = { sync, stop }
    paint(phase.current, manualRef.current)
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting
      sync()
    })
    observer?.observe(stage)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      stop()
      observer?.disconnect()
      document.removeEventListener('visibilitychange', sync)
      controls.current = { sync() {}, stop() {} }
    }
  }, [paint, reduced, total])

  const seek = destination => {
    controls.current.stop()
    if (reduced) { tween.current = null; paint(destination, true) }
    else {
      tween.current = { from: phase.current, to: destination, elapsed: 0, lastTime: null }
      controls.current.sync()
    }
  }
  const step = direction => {
    const base = tween.current ? tween.current.to : Math.round(phase.current)
    seek(base + direction)
  }
  const enterFigure = (index, event) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
    hovered.current = index
    tween.current = null
    controls.current.sync()
  }
  const leaveFigure = (index, event) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
    if (hovered.current === index) hovered.current = null
    controls.current.sync()
  }
  const finishDrag = event => {
    const state = drag.current
    if (!state || state.id !== event.pointerId) return
    drag.current = null
    const stage = stageRef.current
    stage.classList.remove('is-dragging')
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      const figure = document.elementFromPoint(event.clientX, event.clientY)?.closest('.ip-figure')
      hovered.current = figure && stage.contains(figure) ? Number(figure.dataset.index) : null
    }
    if (reduced && state.moved) paint(Math.round(phase.current), true)
    controls.current.sync()
  }

  const handlers = {
    onFocus(event) { keyboardFocus.current = event.target.matches(':focus-visible'); controls.current.sync() },
    onBlur() { keyboardFocus.current = false; controls.current.sync() },
    onPointerDown(event) {
      if (!event.isPrimary || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey) return
      keyboardFocus.current = false
      tween.current = null
      controls.current.stop()
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, phase: phase.current, moved: false,
        pixelsPerSlot: Math.max(150, Math.min(360, event.currentTarget.clientWidth * 0.45)) }
    },
    onPointerMove(event) {
      const state = drag.current
      if (!state || state.id !== event.pointerId) return
      const dx = event.clientX - state.x
      const dy = event.clientY - state.y
      if (!state.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        state.moved = true
        event.currentTarget.setPointerCapture(event.pointerId)
        event.currentTarget.classList.add('is-dragging')
      }
      if (!state.moved) return
      event.preventDefault()
      paint(state.phase - dx / state.pixelsPerSlot, true)
    },
    onPointerUp: finishDrag,
    onPointerCancel: finishDrag,
    onLostPointerCapture: finishDrag,
    onPointerLeave(event) { if (!event.currentTarget.hasPointerCapture(event.pointerId)) finishDrag(event) },
    onDragStart(event) { event.preventDefault() },
    onKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      keyboardFocus.current = true
      if (event.key === 'Home') seek(0)
      else if (event.key === 'End') seek(total - 1)
      else step(event.key === 'ArrowRight' ? 1 : -1)
    },
  }
  return { active: Math.min(active, Math.max(0, total - 1)), manual, stageRef, registerFigure, enterFigure, leaveFigure, handlers, step }
}
