import test from 'node:test'
import assert from 'node:assert/strict'
import { createMobileGazeAnimation, createMobileGazeSourceLoader, deferMobileGazeLoad, MOBILE_GAZE_ANIMATION_SRC } from '../src/mobile-gaze-playback.js'

class Target extends EventTarget {
  listeners = new Map()
  addEventListener(type, listener, options) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type).add(listener)
    super.addEventListener(type, listener, options)
  }
  removeEventListener(type, listener, options) {
    this.listeners.get(type)?.delete(listener)
    super.removeEventListener(type, listener, options)
  }
  emit(type) { this.dispatchEvent(new Event(type)) }
  listenerCount() { return [...this.listeners.values()].reduce((total, set) => total + set.size, 0) }
}

class Image extends Target {
  attributes = new Map([['src', '/hero-poster.jpg']])
  writes = []
  getAttribute(name) { return this.attributes.get(name) ?? null }
  get src() { return this.getAttribute('src') }
  set src(value) { this.attributes.set('src', value); this.writes.push(value) }
}

function pending() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

const flush = () => new Promise(resolve => setImmediate(resolve))

function animation(t, overrides = {}) {
  const image = new Image()
  const documentTarget = Object.assign(new Target(), { hidden: false })
  const jobs = []
  let loads = 0
  const player = createMobileGazeAnimation({
    image,
    documentTarget,
    defer: callback => {
      const job = { callback, cancelled: false }
      jobs.push(job)
      return () => { job.cancelled = true }
    },
    loadSource: () => { loads++; return Promise.resolve('blob:mobile-gaze') },
    ...overrides,
  })
  t.after(() => player.dispose())
  return { image, documentTarget, jobs, player, get loads() { return loads },
    run: () => { const job = jobs.shift(); assert.ok(job); if (!job.cancelled) job.callback() },
  }
}

test('visible mobile gaze animates after its deferred download without gestures or video APIs', async t => {
  const download = pending()
  let requests = 0
  const rig = animation(t, { loadSource: () => { requests++; return download.promise } })
  assert.equal(rig.jobs.length, 0)
  assert.equal(requests, 0)
  assert.equal(rig.image.src, '/hero-poster.jpg')
  rig.player.setActive(true)
  rig.player.setActive(true)
  assert.equal(rig.jobs.length, 1)
  assert.equal(requests, 0)
  rig.run()
  rig.player.setActive(true)
  assert.equal(requests, 1)
  assert.equal(rig.jobs.length, 0)
  assert.equal(rig.image.src, '/hero-poster.jpg')
  download.resolve('blob:mobile-gaze')
  await flush()
  assert.equal(rig.image.src, 'blob:mobile-gaze')
  rig.player.setActive(true)
  assert.deepEqual(rig.image.writes, ['blob:mobile-gaze'])
  assert.deepEqual([...rig.image.listeners.keys()], ['error'])
  assert.equal(rig.documentTarget.listenerCount(), 0)
  assert.equal('play' in rig.image, false)
  assert.equal('pause' in rig.image, false)
})

test('hero and footer share one low-priority download and one object URL', async t => {
  const download = pending()
  const requests = [], blobs = []
  const blob = { type: 'image/webp' }
  const loadSource = createMobileGazeSourceLoader({
    fetchImage: (...args) => { requests.push(args); return download.promise },
    createURL: value => { blobs.push(value); return 'blob:shared-mobile' },
  })
  const hero = animation(t, { loadSource })
  const footer = animation(t, { loadSource })
  for (const rig of [hero, footer]) { rig.player.setActive(true); rig.run() }
  assert.deepEqual(requests, [[MOBILE_GAZE_ANIMATION_SRC, { priority: 'low' }]])
  download.resolve({ ok: true, blob: async () => blob })
  await flush()
  assert.deepEqual(blobs, [blob])
  for (const rig of [hero, footer]) {
    assert.equal(rig.image.src, 'blob:shared-mobile')
  }
  assert.equal(await loadSource(), 'blob:shared-mobile')
  assert.equal(requests.length, 1)
})

test('failed shared download can be retried instead of caching the rejection', async () => {
  let requests = 0
  const loadSource = createMobileGazeSourceLoader({
    fetchImage: async () => ({ ok: ++requests > 1, blob: async () => 'downloaded' }),
    createURL: blob => `blob:${blob}`,
  })
  await assert.rejects(loadSource(), /Mobile character unavailable/)
  assert.equal(await loadSource(), 'blob:downloaded')
  assert.equal(requests, 2)
})

test('offscreen and hidden activation restore the poster and resume without another download', async t => {
  const rig = animation(t)
  rig.player.setActive(true)
  rig.run()
  await flush()
  rig.player.setActive(false)
  assert.equal(rig.image.src, '/hero-poster.jpg')
  rig.player.setActive(true)
  assert.equal(rig.image.src, 'blob:mobile-gaze')
  rig.documentTarget.hidden = true
  // StudioFooter supplies visibilitychange and intersection state through setActive.
  rig.player.setActive(false)
  assert.equal(rig.image.src, '/hero-poster.jpg')
  rig.player.setActive(true)
  assert.equal(rig.image.src, '/hero-poster.jpg')
  rig.documentTarget.hidden = false
  rig.player.setActive(true)
  assert.equal(rig.image.src, 'blob:mobile-gaze')
  assert.equal(rig.loads, 1)
  assert.equal(rig.jobs.length, 0)
  assert.deepEqual(rig.image.writes, ['blob:mobile-gaze', '/hero-poster.jpg', 'blob:mobile-gaze', '/hero-poster.jpg', 'blob:mobile-gaze'])
})

test('queued and completed downloads never change a hidden or offscreen image', async t => {
  for (const state of ['hidden', 'offscreen']) {
    const source = pending()
    let requests = 0
    const rig = animation(t, { loadSource: () => { requests++; return source.promise } })
    rig.player.setActive(true)
    rig.run()
    if (state === 'hidden') rig.documentTarget.hidden = true
    else rig.player.setActive(false)
    source.resolve('blob:late')
    await flush()
    assert.deepEqual(rig.image.writes, [], state)
    assert.equal(rig.image.src, '/hero-poster.jpg', state)
    rig.documentTarget.hidden = false
    rig.player.setActive(true)
    assert.equal(rig.image.src, 'blob:late', state)
    assert.equal(requests, 1, state)
    assert.equal(rig.jobs.length, 0, state)
  }
  const rig = animation(t)
  rig.player.setActive(true)
  rig.documentTarget.hidden = true
  rig.run()
  assert.equal(rig.loads, 0)
  assert.deepEqual(rig.image.writes, [])
  rig.documentTarget.hidden = false
  rig.player.setActive(true)
  assert.equal(rig.jobs.length, 1)
})

test('offscreen and disposed queued work is cancelled, including a late callback', t => {
  const rig = animation(t)
  rig.player.setActive(true)
  const first = rig.jobs[0]
  rig.player.setActive(false)
  assert.equal(first.cancelled, true)
  rig.run()
  rig.player.setActive(true)
  const second = rig.jobs[0]
  rig.player.dispose()
  assert.equal(second.cancelled, true)
  second.callback()
  rig.player.setActive(true)
  assert.equal(rig.loads, 0)
  assert.deepEqual(rig.image.writes, [])
  assert.equal(rig.image.listenerCount(), 0)
  assert.equal(rig.documentTarget.listenerCount(), 0)
})

test('disposal during download ignores late success and failure and removes listeners', async t => {
  for (const outcome of ['resolve', 'reject']) {
    const source = pending()
    const rig = animation(t, { loadSource: () => source.promise })
    rig.player.setActive(true)
    rig.run()
    rig.player.dispose()
    source[outcome](outcome === 'resolve' ? 'blob:disposed' : new Error('network error'))
    await flush()
    rig.image.emit('error')
    assert.equal(rig.image.src, '/hero-poster.jpg', outcome)
    assert.deepEqual(rig.image.writes, [], outcome)
    assert.equal(rig.image.listenerCount(), 0, outcome)
    assert.equal(rig.documentTarget.listenerCount(), 0, outcome)
  }
})

test('download and image errors retain the poster, with safe retry and disposal cleanup', async t => {
  let requests = 0
  const rig = animation(t, { loadSource: () => ++requests === 1
    ? Promise.reject(new Error('network error')) : Promise.resolve('blob:recovered') })
  rig.player.setActive(true)
  rig.run()
  await flush()
  assert.equal(rig.image.src, '/hero-poster.jpg')
  assert.deepEqual(rig.image.writes, [])
  rig.player.setActive(true)
  rig.run()
  await flush()
  assert.equal(rig.image.src, 'blob:recovered')
  rig.image.emit('error')
  assert.equal(rig.image.src, '/hero-poster.jpg')
  rig.image.emit('error')
  assert.deepEqual(rig.image.writes, ['blob:recovered', '/hero-poster.jpg'])
  rig.player.dispose()
  assert.equal(rig.image.listenerCount(), 0)
  assert.equal(rig.documentTarget.listenerCount(), 0)
  assert.equal(requests, 2)
})

function scheduler({ idle = true } = {}) {
  let next = 0
  const timers = new Map(), idles = new Map()
  const windowTarget = Object.assign(new Target(), {
    innerHeight: 844,
    setTimeout: (callback, delay) => { const id = ++next; timers.set(id, { callback, delay }); return id },
    clearTimeout: id => timers.delete(id),
  })
  if (idle) {
    windowTarget.requestIdleCallback = (callback, options) => { const id = ++next; idles.set(id, { callback, options }); return id }
    windowTarget.cancelIdleCallback = id => idles.delete(id)
  }
  return { windowTarget, timers, idles,
    runTimer(delay) {
      const entry = [...timers].find(([, task]) => task.delay === delay)
      assert.ok(entry, `expected a ${delay}ms timer`)
      timers.delete(entry[0]); entry[1].callback()
    },
    runIdle() { const [id, task] = [...idles][0]; idles.delete(id); task.callback() },
  }
}

function preview({ complete = false, src = '/artwork.webp', top = 0, bottom = 200 } = {}) {
  return Object.assign(new Target(), { complete, currentSrc: '', getAttribute: () => src,
    getBoundingClientRect: () => ({ top, bottom }) })
}

test('deferred loading waits for visible artwork to settle, then waits for idle time', () => {
  const clock = scheduler()
  const visible = [preview(), preview({ top: 300, bottom: 500 })]
  const ignored = [preview({ complete: true }), preview({ src: '' }), preview({ top: 900, bottom: 1100 }), preview({ top: -200, bottom: 0 })]
  let calls = 0
  const cleanup = deferMobileGazeLoad(() => calls++, { windowTarget: clock.windowTarget, documentTarget: { images: [...visible, ...ignored] } })
  assert.equal(calls, 0)
  assert.equal(visible[0].listenerCount(), 0)
  clock.runTimer(300)
  for (const image of ignored) assert.equal(image.listenerCount(), 0)
  visible[0].emit('load')
  assert.equal(clock.idles.size, 0)
  visible[1].emit('error')
  assert.equal(clock.timers.size, 0)
  for (const image of visible) assert.equal(image.listenerCount(), 0)
  assert.equal(calls, 0)
  assert.deepEqual([...clock.idles.values()][0].options, { timeout: 1800 })
  clock.runIdle()
  assert.equal(calls, 1)
  cleanup()
})

test('stalled artwork has a bounded wait and its listeners are cleaned up', () => {
  const clock = scheduler(), image = preview()
  let calls = 0
  const cleanup = deferMobileGazeLoad(() => calls++, { windowTarget: clock.windowTarget, documentTarget: { images: [image] } })
  clock.runTimer(300)
  clock.runTimer(4000)
  assert.equal(image.listenerCount(), 0)
  clock.runIdle()
  image.emit('load')
  assert.equal(calls, 1)
  assert.equal(clock.idles.size, 0)
  cleanup()
})

test('cancelling deferred loading clears initial, artwork, idle, and fallback work', () => {
  for (const phase of ['initial', 'artwork', 'idle', 'fallback']) {
    const clock = scheduler({ idle: phase !== 'fallback' })
    const image = preview()
    let calls = 0
    const cleanup = deferMobileGazeLoad(() => calls++, { windowTarget: clock.windowTarget,
      documentTarget: { images: phase === 'artwork' ? [image] : [] } })
    if (phase !== 'initial') clock.runTimer(300)
    const lateCallbacks = [...clock.timers.values(), ...clock.idles.values()].map(task => task.callback)
    cleanup()
    assert.equal(clock.timers.size, 0, phase)
    assert.equal(clock.idles.size, 0, phase)
    assert.equal(image.listenerCount(), 0, phase)
    for (const callback of lateCallbacks) callback()
    image.emit('load')
    assert.equal(calls, 0, phase)
  }
})

test('browsers without idle callbacks use a short delayed fallback', () => {
  const clock = scheduler({ idle: false })
  let calls = 0
  const cleanup = deferMobileGazeLoad(() => calls++, { windowTarget: clock.windowTarget, documentTarget: { images: [] } })
  clock.runTimer(300)
  assert.equal(calls, 0)
  clock.runTimer(150)
  assert.equal(calls, 1)
  cleanup()
})
