import test from 'node:test'
import assert from 'node:assert/strict'
import { startMobileVideoPlayback } from '../src/mobile-video-playback.js'

class Player {
  attributes = new Map([['src', '/mobile-preview.mp4']])
  readyState = 0
  playsInline = false
  preload = 'none'
  volume = 0.65
  paused = true
  dialog = { dataset: {} }
  calls = []
  attempts = []
  outcomes = []
  mutedWrites = []
  _muted = false
  get muted() { return this._muted }
  set muted(value) { this._muted = value; this.mutedWrites.push(value) }
  get src() { return this.getAttribute('src') }
  set src(value) { this.attributes.set('src', value); this.calls.push(['src', value]) }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  setAttribute(name, value) { this.attributes.set(name, value); this.calls.push(['setAttribute', name, value]) }
  removeAttribute(name) { this.attributes.delete(name); this.calls.push(['removeAttribute', name]) }
  closest(selector) { assert.equal(selector, 'dialog'); return this.dialog }
  addEventListener() { assert.fail('mobile playback must not wait for a media event') }
  play() {
    this.calls.push(['play'])
    this.attempts.push({ src: this.src, muted: this.muted, volume: this.volume, readyState: this.readyState })
    this.paused = false
    return this.outcomes.length ? this.outcomes.shift() : Promise.resolve()
  }
  pause() { this.paused = true; this.calls.push(['pause']) }
  load() { this.calls.push(['load']) }
}

function pending() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

const failure = name => Object.assign(new Error(name), { name })
const flush = () => new Promise(resolve => setImmediate(resolve))

test('mobile playback starts immediately at readyState zero without waiting for loadeddata', async t => {
  const player = new Player()
  const cleanup = startMobileVideoPlayback(player, '/mobile-preview.mp4')
  t.after(cleanup)
  assert.equal(player.attempts.length, 1)
  assert.equal(player.attempts[0].readyState, 0)
  assert.equal(player.playsInline, true)
  assert.equal(player.preload, 'auto')
  assert.equal(player.getAttribute('playsinline'), '')
  assert.deepEqual(player.calls, [['setAttribute', 'playsinline', ''], ['play']])
  await flush()
  assert.equal(player.attempts.length, 1)
})

test('successful playback preserves the original mute setting and volume', async t => {
  for (const muted of [false, true]) {
    const player = new Player()
    player._muted = muted
    const cleanup = startMobileVideoPlayback(player, '/mobile-preview.mp4')
    t.after(cleanup)
    await flush()
    assert.deepEqual(player.attempts, [{ src: '/mobile-preview.mp4', muted, volume: 0.65, readyState: 0 }])
    assert.equal(player.muted, muted)
    assert.equal(player.volume, 0.65)
    assert.deepEqual(player.mutedWrites, [])
  }
})

test('only NotAllowedError retries once with muted playback and retains volume', async t => {
  const player = new Player()
  const first = pending(), fallback = pending()
  player.outcomes.push(first.promise, fallback.promise)
  const cleanup = startMobileVideoPlayback(player, '/mobile-preview.mp4')
  t.after(cleanup)
  first.reject(failure('NotAllowedError'))
  await flush()
  assert.deepEqual(player.attempts.map(attempt => attempt.muted), [false, true])
  assert.deepEqual(player.mutedWrites, [true])
  assert.ok(player.attempts.every(attempt => attempt.volume === 0.65 && attempt.src === '/mobile-preview.mp4'))
  fallback.reject(failure('NotAllowedError'))
  await flush()
  assert.equal(player.attempts.length, 2)
})

test('network, abort, unsupported-source, and other failures do not mute or retry', async t => {
  for (const name of ['NetworkError', 'AbortError', 'NotSupportedError', 'Error']) {
    const player = new Player()
    const result = pending()
    player.outcomes.push(result.promise)
    const cleanup = startMobileVideoPlayback(player, '/mobile-preview.mp4')
    t.after(cleanup)
    result.reject(failure(name))
    await flush()
    assert.equal(player.attempts.length, 1, name)
    assert.deepEqual(player.mutedWrites, [], name)
  }
})

test('a closing dialog prevents a pending denied playback from restarting the video', async t => {
  const player = new Player()
  const result = pending()
  player.outcomes.push(result.promise)
  const cleanup = startMobileVideoPlayback(player, '/mobile-preview.mp4')
  t.after(cleanup)
  player.dialog.dataset.closing = 'true'
  player.pause()
  result.reject(failure('NotAllowedError'))
  await flush()
  assert.equal(player.attempts.length, 1)
  assert.equal(player.paused, true)
  assert.deepEqual(player.mutedWrites, [])
})

test('disposal blocks pending success or autoplay denial from restarting or restoring the source', async () => {
  for (const outcome of ['resolve', 'reject']) {
    const player = new Player()
    const result = pending()
    player.outcomes.push(result.promise)
    const cleanup = startMobileVideoPlayback(player, '/mobile-preview.mp4')
    cleanup()
    result[outcome](outcome === 'reject' ? failure('NotAllowedError') : undefined)
    await flush()
    assert.equal(player.attempts.length, 1, outcome)
    assert.equal(player.paused, true, outcome)
    assert.equal(player.getAttribute('src'), null, outcome)
    assert.deepEqual(player.mutedWrites, [], outcome)
    assert.deepEqual(player.calls.slice(-3), [['pause'], ['removeAttribute', 'src'], ['load']], outcome)
  }
})

test('disposal releases buffering even when a muted fallback is still pending', async () => {
  const player = new Player()
  const first = pending(), fallback = pending()
  player.outcomes.push(first.promise, fallback.promise)
  const cleanup = startMobileVideoPlayback(player, '/mobile-preview.mp4')
  first.reject(failure('NotAllowedError'))
  await flush()
  assert.equal(player.attempts.length, 2)
  cleanup()
  fallback.reject(failure('AbortError'))
  await flush()
  assert.equal(player.attempts.length, 2)
  assert.equal(player.paused, true)
  assert.equal(player.getAttribute('src'), null)
  assert.deepEqual(player.calls.slice(-3), [['pause'], ['removeAttribute', 'src'], ['load']])
})

test('StrictMode reattachment restores the passed source and ignores the old rejected promise', async () => {
  const player = new Player()
  const oldPlayback = pending()
  player.outcomes.push(oldPlayback.promise)
  const firstCleanup = startMobileVideoPlayback(player, '/mobile-preview.mp4')
  firstCleanup()
  assert.equal(player.getAttribute('src'), null)
  const secondCleanup = startMobileVideoPlayback(player, '/mobile-preview.mp4')
  assert.equal(player.src, '/mobile-preview.mp4')
  assert.equal(player.attempts.length, 2)
  assert.deepEqual(player.calls.slice(-3), [['src', '/mobile-preview.mp4'], ['setAttribute', 'playsinline', ''], ['play']])
  oldPlayback.reject(failure('NotAllowedError'))
  await flush()
  assert.equal(player.attempts.length, 2)
  assert.equal(player.paused, false)
  assert.deepEqual(player.mutedWrites, [])
  secondCleanup()
})

test('starting a different preview assigns its source before requesting playback', async t => {
  const player = new Player()
  const cleanup = startMobileVideoPlayback(player, '/another-mobile-preview.mp4')
  t.after(cleanup)
  assert.deepEqual(player.calls.slice(0, 3), [['src', '/another-mobile-preview.mp4'], ['setAttribute', 'playsinline', ''], ['play']])
  assert.equal(player.attempts[0].src, '/another-mobile-preview.mp4')
  await flush()
})
