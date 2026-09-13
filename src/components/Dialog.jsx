import { useEffect, useRef, useState } from 'react'

export default function Dialog({ children, labelId, onClose, className = '', onKeyDown, showClose = true, animated = false }) {
  const ref = useRef(null)
  const pointerStartedOnBackdrop = useRef(false)
  const closing = useRef(false)
  const finished = useRef(false)
  const closeTimer = useRef(0)
  const [isClosing, setIsClosing] = useState(false)
  const finishClose = () => {
    if (finished.current) return
    finished.current = true
    clearTimeout(closeTimer.current)
    onClose()
  }
  const requestClose = () => {
    if (closing.current || finished.current) return
    closing.current = true
    // Stop audio immediately, even while the visible dialog is fading away.
    ref.current?.querySelectorAll('video').forEach(video => video.pause())
    if (!animated || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finishClose(); return }
    setIsClosing(true)
    // Fallback also covers background tabs where animation events can be delayed.
    closeTimer.current = setTimeout(finishClose, 240)
  }
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    closing.current = false
    finished.current = false
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(closeTimer.current)
      finished.current = true
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])
  const onBackdrop = event => {
    if (event.target !== event.currentTarget) return false
    const rect = event.currentTarget.getBoundingClientRect()
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
  }
  return <dialog ref={ref} className={'dialog ' + className} aria-labelledby={labelId} data-closing={isClosing ? 'true' : undefined}
    onKeyDown={event => { if (!closing.current) onKeyDown?.(event) }}
    onCancel={event => { event.preventDefault(); requestClose() }}
    onAnimationEnd={event => { if (event.target === ref.current && event.animationName === 'media-dialog-out' && closing.current) finishClose() }}
    onPointerDown={event => { pointerStartedOnBackdrop.current = onBackdrop(event) }}
    onClick={event => { if (pointerStartedOnBackdrop.current && onBackdrop(event)) requestClose() }}>
    {showClose && <button className="dialog-close" onClick={requestClose} aria-label="关闭弹窗" autoFocus><span>关闭</span><span aria-hidden="true">×</span></button>}
    {typeof children === 'function' ? children({ requestClose }) : children}
  </dialog>
}
