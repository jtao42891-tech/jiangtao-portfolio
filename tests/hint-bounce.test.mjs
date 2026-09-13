import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('../src/motion/hintBounce.js', import.meta.url), 'utf8').replace(/^export /gm, '')
const target = () => ({
  listeners: new Map(),
  addEventListener(type, fn) { this.listeners.set(type, fn) },
  removeEventListener(type) { this.listeners.delete(type) },
  fire(type) { this.listeners.get(type)?.() },
})

function harness() {
  const calls = { observers: [], animations: [], timers: new Map() }
  const artwork = { ...target(), complete: true }
  const card = { isConnected: true, top: 408, querySelector: () => artwork, getBoundingClientRect() { return { top: this.top } } }
  const section = { ...target(), querySelector: () => card }
  const hint = { isConnected: true, dataset: {}, style: {}, top: 300, bottom: 344,
    closest: () => section,
    getBoundingClientRect() { return { top: this.top, bottom: this.bottom } },
    animate(frames, options) {
      const animation = { frames, options, cancel() { this.cancelled = true } }
      calls.animations.push(animation)
      return animation
    },
  }
  const curtain = { visibility: 'hidden', display: 'grid' }
  const document = { ...target(), hidden: false,
    querySelector: selector => selector === '.site-header' ? { getBoundingClientRect: () => ({ bottom: 60 }) } : curtain,
  }
  const window = target()
  let nextTimer = 0
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; this.nodes = []; calls.observers.push(this) }
    observe(node) { this.nodes.push(node) }
    disconnect() { this.disconnected = true }
  }
  const sandbox = { document, window, innerHeight: 800, IntersectionObserver: Observer, getComputedStyle: node => node,
    setTimeout: fn => { calls.timers.set(++nextTimer, fn); return nextTimer }, clearTimeout: id => calls.timers.delete(id),
  }
  vm.createContext(sandbox)
  vm.runInContext(source + '\nglobalThis.api = { HINT_BOUNCE, hintBounceFrames, createHintBounceMotion };', sandbox)
  return { calls, hint, card, section, artwork, curtain, document, window, ...sandbox.api,
    enter: () => calls.observers[0].callback(),
    flush: () => { const timers = [...calls.timers.values()]; calls.timers.clear(); timers.forEach(fn => fn()) },
  }
}

test('hint bounce respects reduced motion without creating observers or hidden states', () => {
  const h = harness()
  h.createHintBounceMotion(h.hint, true)()
  assert.equal(h.calls.observers.length, 0)
  assert.equal(h.calls.animations.length, 0)
  assert.equal(h.hint.style.willChange, undefined)
})

test('hint falls to the measured card edge, compresses, rebounds and returns to its exact rest pose', () => {
  const h = harness()
  for (const distance of [34, 51.2, 64]) {
    const frames = h.hintBounceFrames(distance)
    assert.equal(frames[1].transform, `translateY(${distance}px) scale(1, 1)`)
    assert.equal(frames[2].transform, `translateY(${distance}px) scale(1.08, 0.76)`)
    assert.match(frames[3].transform, /translateY\(-/)
    assert.equal(frames.at(-1).transform, 'translateY(0px) scale(1, 1)')
    assert.equal(frames.at(-1).offset, 1)
  }
  const css = readFileSync(new URL('../src/components/homepage-project.css', import.meta.url), 'utf8')
  assert.match(css, /transform-origin: 50% 100%/)
})

test('hint waits for entry and runs only once, without moving artwork', () => {
  const h = harness()
  h.card.top = 1200
  const cleanup = h.createHintBounceMotion(h.hint, false)
  h.enter()
  assert.equal(h.calls.animations.length, 0)
  h.card.top = 408
  h.enter()
  h.enter()
  assert.equal(h.calls.animations.length, 1)
  assert.equal(h.calls.animations[0].options.fill, 'none')
  assert.equal(h.calls.animations[0].frames[1].transform, 'translateY(64px) scale(1, 1)')
  assert.equal(h.hint.dataset.hintIntroPlayed, 'true')
  h.calls.animations[0].onfinish()
  assert.equal(h.hint.style.willChange, '')
  assert.equal(h.section.listeners.size + h.window.listeners.size + h.document.listeners.size, 0)
  assert.ok(h.calls.observers[0].disconnected)
  cleanup()
  h.createHintBounceMotion(h.hint, false)()
  assert.equal(h.calls.observers.length, 1, 'a completed hint does not replay on effect setup')
})

test('saved links wait for the jt opening to dismiss and artwork to load', () => {
  const h = harness()
  h.curtain.visibility = 'visible'
  h.artwork.complete = false
  const cleanup = h.createHintBounceMotion(h.hint, false)
  h.enter()
  assert.equal(h.calls.animations.length, 0)
  assert.equal(h.calls.timers.size, 1)
  h.curtain.visibility = 'hidden'
  h.flush()
  assert.equal(h.calls.animations.length, 0)
  h.artwork.complete = true
  h.artwork.fire('load')
  assert.equal(h.calls.animations.length, 1)
  cleanup()
})

for (const reason of ['resize', 'hidden', 'pointer', 'focus', 'offscreen', 'cleanup']) {
  test(`hint restores immediately on ${reason}`, () => {
    const h = harness()
    const cleanup = h.createHintBounceMotion(h.hint, false)
    h.enter()
    const animation = h.calls.animations[0]
    if (reason === 'resize') h.window.fire('resize')
    if (reason === 'hidden') { h.document.hidden = true; h.document.fire('visibilitychange') }
    if (reason === 'pointer') h.section.fire('pointerdown')
    if (reason === 'focus') h.section.fire('focusin')
    if (reason === 'offscreen') { h.hint.top = -100; h.enter() }
    if (reason === 'cleanup') cleanup()
    assert.ok(animation.cancelled)
    assert.equal(h.hint.style.willChange, '')
    assert.equal(h.calls.timers.size, 0)
    assert.ok(h.calls.observers[0].disconnected)
    cleanup()
  })
}

test('interacting with a card before entry does not start a later distracting bounce', () => {
  const h = harness()
  const cleanup = h.createHintBounceMotion(h.hint, false)
  h.section.fire('pointerdown')
  h.enter()
  assert.equal(h.calls.animations.length, 0)
  cleanup()
})
