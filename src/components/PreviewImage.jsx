import { useEffect, useRef, useState } from 'react'
import { mobilePreviewImageProps, previewImageProps } from '../media-preview'
import { isMobilePreviewDevice, observePreviewImage } from '../preview-loading'

// Keep the existing <img> and its intrinsic size, but only request artwork near
// the viewport. Measure the actual card, not 100vw, when choosing a srcset file.
export default function PreviewImage({ src, sizes, ...props }) {
  const imageRef = useRef(null)
  const [request, setRequest] = useState(null)
  const preview = request?.mobile
    ? mobilePreviewImageProps(src, request.width, request.pixelRatio)
    : previewImageProps(src, sizes)

  useEffect(() => {
    const mobile = isMobilePreviewDevice()
    const pixelRatio = mobile ? window.devicePixelRatio || 1 : 1
    return observePreviewImage(imageRef.current, (width, priority) => {
      setRequest(current => current?.src === src && current.width === width && current.mobile === mobile ? current : { src, width, mobile, pixelRatio, priority })
    }, { mobile })
  }, [src])

  const requested = request?.src === src
  return <img {...props} ref={imageRef} width={preview.width} height={preview.height}
    src={requested ? preview.src : undefined} srcSet={requested ? preview.srcSet : undefined}
    sizes={requested && !request.mobile ? `${request.width}px` : undefined}
    fetchPriority={request?.mobile ? request.priority : props.fetchPriority}
    loading={request?.mobile ? 'eager' : 'lazy'} decoding="async" />
}
