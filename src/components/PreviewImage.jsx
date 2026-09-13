import { useEffect, useRef, useState } from 'react'
import { previewImageProps } from '../media-preview'
import { observePreviewImage } from '../preview-loading'

// Keep the existing <img> and its intrinsic size, but only request artwork near
// the viewport. Measure the actual card, not 100vw, when choosing a srcset file.
export default function PreviewImage({ src, sizes, ...props }) {
  const imageRef = useRef(null)
  const [request, setRequest] = useState(null)
  const preview = previewImageProps(src, sizes)

  useEffect(() => observePreviewImage(imageRef.current, width => {
    setRequest(current => current?.src === src && current.width === width ? current : { src, width })
  }), [src])

  const requested = request?.src === src
  return <img {...props} ref={imageRef} width={preview.width} height={preview.height}
    src={requested ? preview.src : undefined} srcSet={requested ? preview.srcSet : undefined}
    sizes={requested ? `${request.width}px` : undefined} loading="lazy" decoding="async" />
}
