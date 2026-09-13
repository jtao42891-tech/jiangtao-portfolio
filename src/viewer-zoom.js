export const VIEWER_ZOOM = Object.freeze({ min: 50, initial: 100 })

export function getZoomLayout(viewport, image, zoom = VIEWER_ZOOM.initial, long = false) {
  if (!image || image.width <= 0 || image.height <= 0 || viewport.width <= 0 || viewport.height <= 0) return null
  const gutter = viewport.gutter ?? 12
  const width = Math.max(1, viewport.width - gutter * 2)
  const height = Math.max(1, viewport.height - gutter * 2)
  const fit = Math.min(1, long ? Math.min(width, 1000) / image.width : Math.min(width / image.width, height / image.height))
  // Keep integer slider steps, but clamp the last step to exact native pixels.
  const maxZoom = Math.ceil(100 / fit)
  const clampedZoom = Math.max(VIEWER_ZOOM.min, Math.min(maxZoom, zoom))
  const scale = clampedZoom === maxZoom ? 1 : Math.min(1, fit * clampedZoom / 100)
  const imageWidth = image.width * scale
  const imageHeight = image.height * scale
  const stageWidth = Math.max(viewport.width, imageWidth + gutter * 2)
  const stageHeight = Math.max(viewport.height, imageHeight + gutter * 2)
  return {
    zoom: clampedZoom, maxZoom, nativeSize: scale === 1,
    viewportWidth: viewport.width, viewportHeight: viewport.height,
    imageWidth, imageHeight, stageWidth, stageHeight,
    offsetX: (stageWidth - imageWidth) / 2,
    offsetY: (stageHeight - imageHeight) / 2,
  }
}

export function getZoomScroll(previous, next, scroll) {
  const x = (scroll.left + previous.viewportWidth / 2 - previous.offsetX) / previous.imageWidth
  const y = (scroll.top + previous.viewportHeight / 2 - previous.offsetY) / previous.imageHeight
  const clamp = (value, max) => Math.max(0, Math.min(max, value))
  return {
    left: clamp(next.offsetX + x * next.imageWidth - next.viewportWidth / 2, next.stageWidth - next.viewportWidth),
    top: clamp(next.offsetY + y * next.imageHeight - next.viewportHeight / 2, next.stageHeight - next.viewportHeight),
  }
}
