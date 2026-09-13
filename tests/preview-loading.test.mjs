import test from 'node:test'
import assert from 'node:assert/strict'
import { isMobilePreviewDevice, observePreviewImage } from '../src/preview-loading.js'

function observers(t) {
  const instances = []
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; instances.push(this) }
    observe(target) { this.target = target }
    disconnect() { this.disconnected = true }
  }
  for (const name of ['IntersectionObserver', 'ResizeObserver']) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { value: Observer, configurable: true, writable: true })
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous)
      else delete globalThis[name]
    })
  }
  return instances
}

test('offscreen images wait, then use actual card width and respond to resizing', t => {
  const instances = observers(t)
  const image = { clientWidth: 118 }
  const widths = []
  const cleanup = observePreviewImage(image, width => widths.push(width))
  const [resize, intersection] = instances
  assert.deepEqual(widths, [])
  assert.equal(intersection.options.rootMargin, '350px 0px')
  intersection.callback([{ isIntersecting: false }])
  assert.deepEqual(widths, [])
  intersection.callback([{ isIntersecting: true }])
  assert.deepEqual(widths, [118])
  assert.equal(intersection.disconnected, true)
  image.clientWidth = 200
  resize.callback()
  assert.deepEqual(widths, [118, 200])
  cleanup()
  resize.callback()
  assert.equal(widths.length, 2)
  assert.equal(resize.disconnected, true)
})

test('zero-width cards wait for layout instead of selecting a whole-screen image', t => {
  const instances = observers(t)
  const image = { clientWidth: 0 }
  const widths = []
  const cleanup = observePreviewImage(image, width => widths.push(width))
  const [resize, intersection] = instances
  intersection.callback([{ isIntersecting: true }])
  assert.deepEqual(widths, [])
  image.clientWidth = 145
  resize.callback()
  assert.deepEqual(widths, [145])
  cleanup()
  assert.equal(resize.disconnected, true)
  assert.equal(intersection.disconnected, true)
})

test('mobile images begin loading a screen ahead, desktop keeps its original range', t => {
  const instances = observers(t)
  const widths = []
  const cleanup = observePreviewImage({ clientWidth: 118 }, width => widths.push(width), { mobile: true })
  const [, intersection] = instances
  assert.equal(intersection.options.rootMargin, '900px 0px')
  assert.deepEqual(widths, [])
  intersection.callback([{ isIntersecting: true }])
  assert.deepEqual(widths, [118])
  cleanup()
})

test('mobile mode depends on touch input, not a narrow desktop window', t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let touch = false
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    innerWidth: 390,
    matchMedia(query) {
      assert.equal(query, '(hover: none) and (pointer: coarse)')
      return { matches: touch }
    },
  } })
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else delete globalThis.window
  })
  assert.equal(isMobilePreviewDevice(), false)
  touch = true
  assert.equal(isMobilePreviewDevice(), true)
})
