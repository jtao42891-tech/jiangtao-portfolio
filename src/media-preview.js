import previews from './media-previews.json'

// Display copies have the same full composition. The viewer still uses item.src.
export function previewImageProps(src, sizes = '(max-width: 700px) 100vw, 50vw') {
  const preview = previews[src]
  if (!preview?.src) return { src }
  return { src: preview.src, srcSet: preview.srcSet, sizes, width: preview.width, height: preview.height }
}

export function videoPoster(item) {
  return item.poster || previews[item.src]?.poster || ''
}
