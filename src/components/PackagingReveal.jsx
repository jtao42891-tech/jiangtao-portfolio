import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import PreviewImage from './PreviewImage'
import './packaging-reveal.css'

const TRANSITION_DURATION = 1400
const loadShapeBlur = () => import('./ShapeBlur')
const ShapeBlur = lazy(loadShapeBlur)

const getSplitMetrics = (ratio, requestedSplit) => {
  const [width, height] = (ratio || '').split(':').map(Number)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { panelAspect: '4 / 3', renderOffset: '-50%' }
  }
  const split = Number.isFinite(requestedSplit) && requestedSplit > 0 && requestedSplit < height ? requestedSplit : height / 2
  const panelHeight = Math.min(split, height - split)
  return {
    panelAspect: `${width} / ${panelHeight}`,
    renderOffset: `${-(split / height) * 100}%`,
  }
}

function PackagingRevealCard({ item, reduced, onOpen, allowImagePreview }) {
  const Surface = allowImagePreview ? 'button' : 'div'
  const [rendered, setRendered] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [failed, setFailed] = useState(false)
  const [buttonEntered, setButtonEntered] = useState(false)
  const buttonRef = useRef(null)
  const timerRef = useRef(0)
  const frameRef = useRef(0)

  useEffect(() => () => {
    window.clearTimeout(timerRef.current)
    cancelAnimationFrame(frameRef.current)
  }, [])

  useEffect(() => {
    const button = buttonRef.current
    if (!button || buttonEntered) return undefined
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setButtonEntered(true)
      return undefined
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      setButtonEntered(true)
      observer.disconnect()
    }, { threshold: 0.55 })
    observer.observe(button)
    return () => observer.disconnect()
  }, [buttonEntered, reduced])

  const reveal = () => {
    if (transitioning) return
    window.clearTimeout(timerRef.current)
    cancelAnimationFrame(frameRef.current)
    if (rendered) {
      setRendered(false)
      return
    }
    if (reduced) {
      setRendered(true)
      return
    }
    setTransitioning(true)
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = requestAnimationFrame(() => setRendered(true))
    })
    timerRef.current = window.setTimeout(() => setTransitioning(false), TRANSITION_DURATION)
  }

  const buttonText = transitioning ? '正在渲染3d效果图' : rendered ? '返回包装线稿图' : '点击渲染3d效果图'
  const stateText = rendered ? '当前为3D效果图' : '当前为包装线稿图'
  const cardClass = `packaging-reveal-card${rendered ? ' is-rendered' : ''}${transitioning ? ' is-transitioning' : ''}`
  const metrics = getSplitMetrics(item.ratio, item.splitY)

  return <article className={cardClass}>
    <Surface className="packaging-reveal-stage" style={{ aspectRatio: metrics.panelAspect, '--packaging-render-offset': metrics.renderOffset }} type={allowImagePreview ? 'button' : undefined} onClick={allowImagePreview ? onOpen : undefined} aria-haspopup={allowImagePreview ? 'dialog' : undefined} aria-label={allowImagePreview ? `放大查看${item.title}，${stateText}` : undefined}>
      {failed ? <div className="packaging-reveal-error">图片暂时无法加载</div> : <>
        <div className="packaging-reveal-layer packaging-reveal-draft" aria-hidden={rendered}>
          <PreviewImage src={item.src} alt={item.draftAlt || `${item.title}包装线稿图`} draggable="false" onError={() => setFailed(true)} />
        </div>
        <div className="packaging-reveal-layer packaging-reveal-render" aria-hidden={!rendered}>
          <PreviewImage src={item.src} alt={item.renderAlt || `${item.title}3D效果图`} draggable="false" onError={() => setFailed(true)} />
        </div>
        {transitioning && <Suspense fallback={null}><ShapeBlur className="packaging-shape-blur" duration={TRANSITION_DURATION - 50} pixelRatioProp={typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1} /></Suspense>}
      </>}
      {!failed && allowImagePreview && <span className="packaging-view-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5" stroke="currentColor" strokeWidth="1.4" /></svg></span>}
      <span className="sr-only packaging-reveal-state" aria-live="polite">{stateText}</span>
    </Surface>
    <button ref={buttonRef} className={`packaging-render-button${buttonEntered ? ' is-entered' : ''}`} type="button" onClick={reveal} disabled={failed || transitioning} aria-pressed={rendered}>
      <span>{buttonText}</span>
      <span className="packaging-render-button-icon" aria-hidden="true">{rendered ? '↩' : '↗'}</span>
    </button>
  </article>
}

export default function PackagingReveal({ items, reduced, onOpen, allowImagePreview = true }) {
  const gridRef = useRef(null)
  useEffect(() => {
    const node = gridRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      loadShapeBlur()
      observer.disconnect()
    }, { rootMargin: '300px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={gridRef} className="packaging-reveal-grid" role="group" aria-label="包装设计线稿与3D效果图">
    {items.map((item, index) => <PackagingRevealCard key={item.id} item={item} reduced={reduced} allowImagePreview={allowImagePreview} onOpen={() => onOpen(index)} />)}
  </div>
}
