import previews from './media-previews.json' with { type: 'json' }
import mobilePreviews from './mobile-media-previews.json' with { type: 'json' }
import mobileVideos from './mobile-video-previews.json' with { type: 'json' }

// Display copies have the same full composition. The viewer still uses item.src.
export function previewImageProps(src, sizes = '(max-width: 700px) 100vw, 50vw', mobile = false) {
  const preview = (mobile && mobilePreviews[src]) || previews[src]
  if (!preview?.src) return { src }
  return { src: preview.src, srcSet: preview.srcSet, sizes, width: preview.width, height: preview.height }
}

// Phones display cards, not native-size artwork. Pick one clear (up to 2x)
// display copy so DPR 3/4 and browser zoom cannot promote it to a larger file.
export function mobilePreviewImageProps(src, cardWidth, pixelRatio = 2) {
  const preview = mobilePreviews[src]
  if (!preview) return previewImageProps(src)
  const requiredWidth = Math.ceil(cardWidth * Math.min(Math.max(pixelRatio || 1, 1), 2))
  const candidates = preview.srcSet.split(', ').map(candidate => {
    const [url, width] = candidate.split(' ')
    return { src: url, width: parseInt(width, 10) }
  })
  const selected = candidates.find(candidate => candidate.width >= requiredWidth) || candidates.at(-1)
  return { src: selected.src, width: preview.width, height: preview.height }
}

export function videoPoster(item) {
  return item.poster || previews[item.src]?.poster || ''
}

export function videoPlaybackSource(src, mobile = false) {
  return (mobile && mobileVideos[src]?.src) || src
}
