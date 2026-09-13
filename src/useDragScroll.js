import { useRef } from 'react'

// Mouse dragging supplements native touch, trackpad, wheel and keyboard scrolling.
export default function useDragScroll(ref, { axis = 'x', enabled = true, onStart, onEnd } = {}) {
  const drag = useRef(null)
  const suppressClick = useRef(false)
  const endDrag = event => {
    const node = ref.current
    if (!drag.current || drag.current.id !== event.pointerId) return
    const state = drag.current
    const cancelled = event.type === 'pointercancel' || event.type === 'lostpointercapture'
    suppressClick.current = state.moved && !cancelled
    drag.current = null
    node?.classList.remove('is-dragging')
    if (node?.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId)
    if (state.moved) onEnd?.({ cancelled, velocityX: event.timeStamp - state.time > 90 ? 0 : state.velocityX })
  }
  return {
    onPointerDown(event) {
      suppressClick.current = false
      onStart?.(event)
      if (!enabled || event.pointerType !== 'mouse' || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey) return
      const node = ref.current
      drag.current = {
        id: event.pointerId, x: event.clientX, y: event.clientY,
        left: node.scrollLeft, top: node.scrollTop, moved: false,
        lastLeft: node.scrollLeft, time: event.timeStamp, velocityX: 0,
        canX: axis !== 'y' && node.scrollWidth > node.clientWidth + 1,
        canY: axis !== 'x' && node.scrollHeight > node.clientHeight + 1,
      }
    },
    onPointerMove(event) {
      const state = drag.current
      if (!state || state.id !== event.pointerId) return
      const node = ref.current
      const dx = event.clientX - state.x
      const dy = event.clientY - state.y
      if (!state.moved && ((state.canX && Math.abs(dx) > 6) || (state.canY && Math.abs(dy) > 6))) {
        state.moved = true
        node.classList.add('is-dragging')
        node.setPointerCapture(event.pointerId)
      }
      if (!state.moved) return
      event.preventDefault()
      if (state.canX) node.scrollLeft = state.left - dx
      if (state.canY) node.scrollTop = state.top - dy
      const elapsed = event.timeStamp - state.time
      if (elapsed > 0) state.velocityX = (node.scrollLeft - state.lastLeft) / elapsed
      state.lastLeft = node.scrollLeft
      state.time = event.timeStamp
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
    onPointerLeave(event) {
      if (!ref.current?.hasPointerCapture(event.pointerId)) endDrag(event)
    },
    onClickCapture(event) {
      if (!suppressClick.current || event.detail === 0) return
      event.preventDefault()
      event.stopPropagation()
      suppressClick.current = false
    },
    onDragStart(event) {
      // Browsers otherwise drag image/link ghosts instead of the content itself.
      if (enabled) event.preventDefault()
    },
  }
}
