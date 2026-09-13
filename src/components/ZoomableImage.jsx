import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useDragScroll from '../useDragScroll'
import { getZoomLayout, getZoomScroll, VIEWER_ZOOM } from '../viewer-zoom'

export default function ZoomableImage({ item, onError }) {
  const [zoom, setZoom] = useState(VIEWER_ZOOM.initial)
  const [image, setImage] = useState(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0, gutter: 12 })
  const viewportRef = useRef(null)
  const previousLayout = useRef(null)
  const pendingScroll = useRef(null)
  const sliderId = useId()
  const layout = useMemo(() => getZoomLayout(viewport, image, zoom, item.kind === 'long'), [viewport, image, zoom, item.kind])
  const pannable = !!layout && (layout.stageWidth > layout.viewportWidth + 1 || layout.stageHeight > layout.viewportHeight + 1)
  const dragHandlers = useDragScroll(viewportRef, { axis: 'both', enabled: pannable })

  useLayoutEffect(() => {
    const node = viewportRef.current
    const measure = () => {
      const next = { width: node.clientWidth, height: node.clientHeight, gutter: parseFloat(getComputedStyle(node).getPropertyValue('--viewer-gutter')) || 12 }
      setViewport(current => current.width === next.width && current.height === next.height && current.gutter === next.gutter ? current : next)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    measure()
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!layout) return
    // A larger viewport can lower the native-size limit while the viewer is open.
    setZoom(layout.zoom)
    const node = viewportRef.current
    const scroll = pendingScroll.current || { left: node.scrollLeft, top: node.scrollTop }
    const next = previousLayout.current ? getZoomScroll(previousLayout.current, layout, scroll) : { left: 0, top: 0 }
    node.scrollLeft = next.left
    node.scrollTop = next.top
    previousLayout.current = layout
    pendingScroll.current = null
  }, [layout])

  const changeZoom = event => {
    const node = viewportRef.current
    pendingScroll.current = { left: node.scrollLeft, top: node.scrollTop }
    setZoom(event.currentTarget.valueAsNumber)
  }
  const maxZoom = layout?.maxZoom ?? VIEWER_ZOOM.initial
  const currentZoom = layout?.zoom ?? VIEWER_ZOOM.initial
  const zoomLabel = layout?.nativeSize ? '原尺寸' : currentZoom + '%'
  const percent = (currentZoom - VIEWER_ZOOM.min) / (maxZoom - VIEWER_ZOOM.min) * 100
  return <>
    <div className="viewer-media has-zoom-image" ref={viewportRef} data-pannable={pannable ? 'true' : undefined}
      tabIndex={0} role="region" aria-label={item.title + '，放大后可拖动查看'} {...dragHandlers}>
      <div className="viewer-image-stage" style={{ width: layout?.stageWidth || viewport.width, height: layout?.stageHeight || viewport.height }}>
        <img src={item.src} alt={item.alt || item.title} draggable="false"
          style={{ width: layout?.imageWidth || 0, height: layout?.imageHeight || 0 }}
          onLoad={event => setImage({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} onError={onError} />
      </div>
    </div>
    <div className="viewer-footer">
      <div className="viewer-zoom-controls">
        <label className="viewer-zoom-label" htmlFor={sliderId} title="图片缩放">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" /><path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          <span className="sr-only">图片缩放</span>
        </label>
        <input id={sliderId} className="viewer-zoom-slider" type="range" min={VIEWER_ZOOM.min} max={maxZoom} step="1"
          value={currentZoom} onChange={changeZoom} disabled={!layout} style={{ '--zoom-progress': percent + '%' }}
          aria-valuetext={zoomLabel + (!layout?.nativeSize && currentZoom === 100 ? item.kind === 'long' ? '，适应宽度' : '，适应窗口' : '')}
          aria-describedby={sliderId + '-help'} />
        <output className="viewer-zoom-value" htmlFor={sliderId} aria-hidden="true">{zoomLabel}</output>
        <span className="sr-only" id={sliderId + '-help'}>左右拖动滑块缩放，最大为图片原尺寸，放大后可拖动图片查看细节。</span>
      </div>
    </div>
  </>
}
