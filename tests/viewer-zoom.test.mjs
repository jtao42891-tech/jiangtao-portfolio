import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getZoomLayout, getZoomScroll } from '../src/viewer-zoom.js'

const viewport = { width: 600, height: 500, gutter: 12 }
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.001, `${actual} differs from ${expected}`)

test('100% fits portrait, landscape and square images without distortion', () => {
  for (const image of [{ width: 1000, height: 1000 }, { width: 1600, height: 900 }, { width: 750, height: 1100 }]) {
    const fit = getZoomLayout(viewport, image)
    assert.ok(fit.imageWidth <= 576.001)
    assert.ok(fit.imageHeight <= 476.001)
    near(fit.imageWidth / fit.imageHeight, image.width / image.height)
    assert.equal(fit.stageWidth, viewport.width)
    assert.equal(fit.stageHeight, viewport.height)
  }
})

test('zoom is capped at native size and all image edges remain reachable', () => {
  const image = { width: 1000, height: 1000 }
  const fit = getZoomLayout(viewport, image)
  const small = getZoomLayout(viewport, image, 50)
  const large = getZoomLayout(viewport, image, 300)
  near(small.imageWidth, fit.imageWidth * 0.5)
  assert.equal(large.imageWidth, image.width)
  assert.equal(large.imageHeight, image.height)
  assert.equal(large.maxZoom, Math.ceil(100 / (476 / 1000)))
  assert.equal(large.zoom, large.maxZoom)
  assert.equal(large.nativeSize, true)
  assert.equal(large.offsetX, 12)
  assert.equal(large.offsetY, 12)
  near(large.stageWidth - large.imageWidth, 24)
  near(large.stageHeight - large.imageHeight, 24)
})

test('native-size limits adapt to each image and allow large originals beyond the old 300% cap', () => {
  for (const image of [{ width: 3508, height: 2058 }, { width: 800, height: 1700 }, { width: 790, height: 22967 }]) {
    for (const long of [false, true]) {
      const fit = getZoomLayout(viewport, image, 100, long)
      const native = getZoomLayout(viewport, image, fit.maxZoom, long)
      assert.equal(native.imageWidth, image.width)
      assert.equal(native.imageHeight, image.height)
      assert.equal(native.nativeSize, true)
      assert.deepEqual(getZoomLayout(viewport, image, fit.maxZoom + 1000, long), native)
      const below = getZoomLayout(viewport, image, fit.maxZoom - 1, long)
      assert.ok(below.imageWidth < image.width)
      assert.ok(below.imageHeight < image.height)
    }
  }
  assert.ok(getZoomLayout(viewport, { width: 3508, height: 2058 }).maxZoom > 300)
})

test('small originals are never upscaled, including the initial fit and long-image mode', () => {
  const image = { width: 120, height: 80 }
  for (const long of [false, true]) {
    const fit = getZoomLayout(viewport, image, 100, long)
    assert.equal(fit.maxZoom, 100)
    assert.equal(fit.nativeSize, true)
    assert.equal(fit.imageWidth, 120)
    assert.equal(fit.imageHeight, 80)
    assert.deepEqual(getZoomLayout(viewport, image, 300, long), fit)
    assert.equal(getZoomLayout(viewport, image, 50, long).imageWidth, 60)
  }
})

test('growing the viewport clamps the current zoom to the new native limit', () => {
  const image = { width: 1000, height: 1000 }
  const previous = getZoomLayout(viewport, image, 300)
  const resized = getZoomLayout({ width: 1200, height: 900, gutter: 12 }, image, previous.zoom)
  assert.ok(resized.maxZoom < previous.maxZoom)
  assert.equal(resized.zoom, resized.maxZoom)
  assert.equal(resized.imageWidth, 1000)
  assert.equal(resized.imageHeight, 1000)
})

test('zoom preserves the image point in the middle of the viewport after panning', () => {
  const image = { width: 1000, height: 1000 }
  const previous = getZoomLayout(viewport, image, 200)
  const next = getZoomLayout(viewport, image, 300)
  const scroll = { left: 200, top: 120 }
  const result = getZoomScroll(previous, next, scroll)
  near((scroll.left + 300 - previous.offsetX) / previous.imageWidth, (result.left + 300 - next.offsetX) / next.imageWidth)
  near((scroll.top + 250 - previous.offsetY) / previous.imageHeight, (result.top + 250 - next.offsetY) / next.imageHeight)
  const small = getZoomLayout(viewport, image, 50)
  assert.deepEqual(getZoomScroll(next, small, result), { left: 0, top: 0 })
})

test('long images retain fit-to-width reading, and unloaded images have no geometry', () => {
  const long = getZoomLayout(viewport, { width: 790, height: 22967 }, 100, true)
  assert.equal(long.imageWidth, 576)
  assert.ok(long.imageHeight > 10000)
  assert.equal(getZoomLayout(viewport, null), null)
  assert.equal(getZoomLayout({ width: 0, height: 0 }, { width: 100, height: 100 }), null)
})

test('viewer uses a compact name/close header and an accessible zoom slider, not the old toolbars', () => {
  const gallery = readFileSync(new URL('../src/components/WorkGallery.jsx', import.meta.url), 'utf8')
  const viewer = gallery.slice(gallery.indexOf('function MediaViewer'), gallery.indexOf('export default function WorkGallery'))
  const zoom = readFileSync(new URL('../src/components/ZoomableImage.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(viewer, /originalSize|原尺寸|viewer\.title|rail-counter|viewer-pagination/)
  assert.match(viewer, /event\.target\.closest\('input, video'\)/)
  assert.match(viewer, /<ZoomableImage key=\{item\.id\}/)
  assert.match(zoom, /type="range"/)
  assert.match(zoom, /max=\{maxZoom\}/)
  assert.match(zoom, /setZoom\(layout\.zoom\)/)
  assert.match(zoom, /nativeSize \? '原尺寸'/)
  assert.doesNotMatch(zoom, /VIEWER_ZOOM\.max/)
  assert.match(zoom, /aria-valuetext=/)
  assert.match(zoom, /htmlFor=\{sliderId\}/)
  assert.match(zoom, /useDragScroll\(viewportRef, \{ axis: 'both'/)
  assert.match(zoom, /observer\.disconnect\(\)/)
})
