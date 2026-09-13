import test from 'node:test'
import assert from 'node:assert/strict'
import { createMobileGazePlayback, createMobileGazeSourceLoader, deferMobileGazeLoad } from '../src/mobile-gaze-playback.js'

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

class Video extends Target {
  paused = true
  src = ''
  attributes = new Map()
  plays = 0
  pauses = 0
  outcomes = []
  setAttribute(name, value) { this.attributes.set(name, value) }
  play() {
    const attempt = ++this.plays
    this.paused = false
    return Promise.resolve(this.outcomes.shift()).catch(error => {
      if (attempt === this.plays) this.paused = true
      throw error
    })
  }
  pause() { this.pauses++; this.paused = true }
}

function pending() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

const flush = () => new Promise(resolve => setImmediate(resolve))

function playback(t, overrides = {}) {
  const video = new Video()
  const documentTarget = Object.assign(new Target(), { hidden: false })
  const jobs = []
  const shown = []
  let loads = 0
  const player = createMobileGazePlayback({
    video,
    documentTarget,
    showVideo: () => shown.push('video'),
    showPoster: () => shown.push('poster'),
    defer: callback => {
      const job = { callback, cancelled: false }
      jobs.push(job)
      return () => { job.cancelled = true }
    },
    loadSource: () => { loads++; return Promise.resolve('blob:mobile-gaze') },
    ...overrides,
  })
  t.after(() => player.dispose())
  return { video, documentTarget, jobs, shown, player, get loads() { return loads },
    run: () => { const job = jobs.shift(); assert.ok(job); if (!job.cancelled) job.callback() },
  }
}

test('mobile gaze waits for activation and deferred work, then starts muted inline playback once', async t => {
  const rig = playback(t)
  assert.equal(rig.jobs.length, 0)
  assert.equal(rig.loads, 0)
  assert.equal(rig.video.src, '')
  rig.player.setActive(true)
  rig.player.setActive(true)
  assert.equal(rig.jobs.length, 1)
  assert.equal(rig.loads, 0)
  rig.run()
  await flush()
  assert.equal(rig.loads, 1)
  assert.equal(rig.video.src, 'blob:mobile-gaze')
  assert.equal(rig.video.preload, 'none')
  assert.equal(rig.video.plays, 1)
  for (const name of ['muted', 'defaultMuted', 'playsInline', 'loop']) assert.equal(rig.video[name], true, name)
  for (const name of ['muted', 'playsinline']) assert.equal(rig.video.attributes.get(name), '')
  assert.deepEqual(rig.shown, [])
  rig.video.emit('canplay')
  rig.player.setActive(true)
  assert.equal(rig.video.plays, 1)
  rig.video.emit('playing')
  assert.deepEqual(rig.shown, ['video'])
})

test('hero and footer share one low-priority download and one object URL', async t => {
  const download = pending()
  const requests = [], blobs = []
  const blob = { type: 'video/mp4' }
  const loadSource = createMobileGazeSourceLoader({
    fetchVideo: (...args) => { requests.push(args); return download.promise },
    createURL: value => { blobs.push(value); return 'blob:shared-mobile' },
  })
  const hero = playback(t, { loadSource })
  const footer = playback(t, { loadSource })
  for (const rig of [hero, footer]) { rig.player.setActive(true); rig.run() }
  assert.deepEqual(requests, [['/footer-mobile.mp4', { priority: 'low' }]])
  download.resolve({ ok: true, blob: async () => blob })
  await flush()
  assert.deepEqual(blobs, [blob])
  for (const rig of [hero, footer]) {
    assert.equal(rig.video.src, 'blob:shared-mobile')
    assert.equal(rig.video.plays, 1)
  }
  assert.equal(await loadSource(), 'blob:shared-mobile')
  assert.equal(requests.length, 1)
})

test('failed shared download can be retried instead of caching the rejection', async () => {
  let requests = 0
  const loadSource = createMobileGazeSourceLoader({
    fetchVideo: async () => ({ ok: ++requests > 1, blob: async () => 'downloaded' }),
    createURL: blob => `blob:${blob}`,
  })
  await assert.rejects(loadSource(), /Mobile character unavailable/)
  assert.equal(await loadSource(), 'blob:downloaded')
  assert.equal(requests, 2)
})

test('offscreen and hidden activation changes pause playback and resume the existing source', async t => {
  const rig = playback(t)
  rig.player.setActive(true)
  rig.run()
  await flush()
  rig.player.setActive(false)
  assert.equal(rig.video.paused, true)
  rig.video.emit('playing')
  assert.deepEqual(rig.shown, [])
  rig.player.setActive(true)
  await flush()
  assert.equal(rig.video.plays, 2)
  rig.documentTarget.hidden = true
  // StudioFooter supplies visibilitychange and intersection state through setActive.
  rig.player.setActive(false)
  rig.video.emit('canplay')
  rig.video.emit('playing')
  assert.equal(rig.video.paused, true)
  assert.equal(rig.video.plays, 2)
  assert.deepEqual(rig.shown, [])
  rig.documentTarget.hidden = false
  rig.player.setActive(true)
  await flush()
  assert.equal(rig.video.plays, 3)
  assert.equal(rig.loads, 1)
  assert.equal(rig.jobs.length, 0)
})

test('download finishing offscreen does not play until reactivated', async t => {
  const source = pending()
  const rig = playback(t, { loadSource: () => source.promise })
  rig.player.setActive(true)
  rig.run()
  rig.player.setActive(false)
  source.resolve('blob:late')
  await flush()
  assert.equal(rig.video.src, 'blob:late')
  assert.equal(rig.video.plays, 0)
  rig.player.setActive(true)
  await flush()
  assert.equal(rig.video.plays, 1)
})

test('hidden document prevents a queued callback from starting a download', t => {
  const rig = playback(t)
  rig.player.setActive(true)
  rig.documentTarget.hidden = true
  rig.run()
  assert.equal(rig.loads, 0)
  rig.documentTarget.hidden = false
  rig.player.setActive(true)
  assert.equal(rig.jobs.length, 1)
})

test('offscreen and disposed queued work is cancelled, including a late callback', t => {
  const rig = playback(t)
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
  assert.equal(rig.loads, 0)
  assert.equal(rig.video.plays, 0)
  assert.equal(rig.video.listenerCount(), 0)
  assert.equal(rig.documentTarget.listenerCount(), 0)
})

test('disposal during download leaves the video untouched and removes gesture/media listeners', async t => {
  const source = pending()
  const rig = playback(t, { loadSource: () => source.promise })
  rig.player.setActive(true)
  rig.run()
  rig.player.dispose()
  source.resolve('blob:disposed')
  await flush()
  rig.video.emit('playing')
  rig.video.emit('canplay')
  rig.video.emit('error')
  rig.documentTarget.emit('pointerup')
  assert.equal(rig.video.src, '')
  assert.equal(rig.video.plays, 0)
  assert.deepEqual(rig.shown, [])
  assert.equal(rig.video.listenerCount(), 0)
  assert.equal(rig.documentTarget.listenerCount(), 0)
})

test('blocked autoplay keeps the poster and retries on a normal page gesture', async t => {
  const rig = playback(t)
  const firstPlay = pending()
  rig.video.outcomes.push(firstPlay.promise)
  rig.player.setActive(true)
  rig.run()
  await flush()
  firstPlay.reject(new Error('NotAllowedError'))
  await flush()
  assert.equal(rig.video.paused, true)
  assert.deepEqual(rig.shown, ['poster'])
  rig.documentTarget.emit('pointerup')
  await flush()
  assert.equal(rig.video.plays, 2)
  rig.video.emit('playing')
  assert.deepEqual(rig.shown, ['poster', 'video'])
  rig.documentTarget.emit('pointerup')
  assert.equal(rig.video.plays, 2)
})

test('an old rejected play promise cannot hide a successful offscreen/resume attempt', async t => {
  const rig = playback(t)
  const firstPlay = pending()
  rig.video.outcomes.push(firstPlay.promise)
  rig.player.setActive(true)
  rig.run()
  await flush()
  rig.player.setActive(false)
  rig.player.setActive(true)
  await flush()
  rig.video.emit('playing')
  firstPlay.reject(new Error('AbortError'))
  await flush()
  assert.deepEqual(rig.shown, ['video'])
  assert.equal(rig.video.paused, false)
  rig.documentTarget.emit('pointerup')
  assert.equal(rig.video.plays, 2)
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
