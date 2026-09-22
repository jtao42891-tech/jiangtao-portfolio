import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { createDesktopGazeSourceLoader, createDesktopGazeTracker, DESKTOP_GAZE_SRC } from '../src/desktop-gaze.js'
import { timeForAngle } from '../src/gaze-utils.js'
import frames from '../src/gaze-frames.json' with { type: 'json' }

const flush = () => new Promise(resolve => setImmediate(resolve))
test('hero/footer share a single completed download and can reuse it without range requests', async () => {
  let requests = 0, urls = 0
  const loader = createDesktopGazeSourceLoader({
    fetchVideo: async (src, options) => {
      assert.equal(src, DESKTOP_GAZE_SRC)
      assert.ok(options.signal instanceof AbortSignal)
      requests++
      return { ok: true, blob: async () => 'complete-video' }
    },
    createURL: blob => { assert.equal(blob, 'complete-video'); urls++; return 'blob:desktop' },
  })
  assert.deepEqual(await Promise.all([loader(), loader()]), ['blob:desktop', 'blob:desktop'])
  assert.equal(await loader(), 'blob:desktop')
  assert.equal(requests, 1)
  assert.equal(urls, 1)
})

test('transient download errors retry automatically, persistent errors are not cached', async () => {
  let requests = 0
  const loader = createDesktopGazeSourceLoader({
    fetchVideo: async () => ({ ok: ++requests > 2, blob: async () => 'video' }),
    createURL: () => 'blob:recovered',
  })
  await assert.rejects(loader(), /unavailable/)
  assert.equal(requests, 2)
  assert.equal(await loader(), 'blob:recovered')
  assert.equal(requests, 3)
})

test('stalled downloads time out and retry instead of remaining pending forever', async () => {
  let requests = 0
  const loader = createDesktopGazeSourceLoader({ timeoutMs: 5,
    fetchVideo: (_src, { signal }) => {
      requests++
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }))
    },
  })
  await assert.rejects(loader(), /timeout/)
  assert.equal(requests, 2)
})

class Video extends EventTarget {
  readyState = 0
  duration = Number.NaN
  seeking = false
  time = 0
  seeks = []
  get currentTime() { return this.time }
  set currentTime(time) { this.time = time; this.seeks.push(time); this.seeking = true; this.readyState = 1 }
  emit(type) { this.dispatchEvent(new Event(type)) }
  finish() { this.seeking = false; this.readyState = 2; this.emit('seeked') }
}
function rig(t) {
  const video = new Video()
  const queue = new Map()
  let next = 0, now = 0, shown = 0, active = true
  const tracker = createDesktopGazeTracker({ video,
    canTrack: () => active, onFrame: () => { shown++ },
    requestFrame: callback => { queue.set(++next, callback); return next },
    cancelFrame: id => queue.delete(id),
  })
  t.after(() => tracker.dispose())
  return { video, queue, tracker, get shown() { return shown }, set active(value) { active = value },
    step() { const callbacks = [...queue.values()]; queue.clear(); now += 16; callbacks.forEach(callback => callback(now)) },
    settle() {
      for (let tick = 0; tick < 160 && (queue.size || video.seeking); tick++) {
        if (video.seeking) video.finish()
        this.step()
      }
      assert.equal(queue.size, 0, 'must settle without an idle animation loop')
    },
  }
}

test('pointer input received during loading is applied as soon as metadata arrives', t => {
  const r = rig(t)
  r.tracker.setAngle(1)
  r.step()
  assert.equal(r.video.seeks.length, 0)
  r.video.readyState = 1
  r.video.duration = 3.25
  r.video.emit('loadedmetadata')
  r.step()
  assert.equal(r.video.seeks[0], timeForAngle(1))
  assert.equal(r.shown, 0, 'poster remains until a decoded frame exists')
  assert.equal(r.queue.size, 0, 'no decoder polling loop')
  r.video.finish()
  r.settle()
  assert.ok(r.shown > 0)
})

test('latest pointer position survives a pending seek and different directions settle correctly', t => {
  const r = rig(t)
  r.video.readyState = 2
  r.video.duration = 3.25
  for (const angle of [0, Math.PI, -Math.PI / 2, Math.PI / 2, .01]) {
    r.tracker.setAngle(angle)
    r.step()
    r.settle()
    assert.ok(Math.abs(r.video.currentTime - timeForAngle(angle)) < 1 / 24, `angle ${angle}: actual ${r.video.currentTime}, expected ${timeForAngle(angle)}`)
  }
  r.video.seeking = true
  r.video.readyState = 1
  r.tracker.setAngle(-1)
  r.step()
  assert.equal(r.queue.size, 0)
  r.video.finish()
  r.settle()
  assert.ok(Math.abs(r.video.currentTime - timeForAngle(-1)) < 1 / 24)
})

test('offscreen/hidden tracking pauses, and cleanup cannot be revived by decoder events', t => {
  const r = rig(t)
  r.video.readyState = 2; r.video.duration = 3.25
  r.active = false
  r.tracker.setAngle(2)
  assert.equal(r.queue.size, 0)
  r.active = true
  r.tracker.wake()
  r.settle()
  assert.ok(r.video.seeks.length > 0)
  r.tracker.dispose()
  r.video.emit('loadeddata'); r.video.emit('seeked'); r.tracker.setAngle(0)
  assert.equal(r.queue.size, 0)
})

test('desktop payload retains 1080p detail within 2.2 MB and all gaze sample times fit', async () => {
  const asset = new URL('../public' + DESKTOP_GAZE_SRC, import.meta.url)
  assert.ok(statSync(asset).size < 2200000)
  // Width/height are fixed fields in an ISO BMFF VisualSampleEntry.
  const video = readFileSync(asset)
  const sampleEntry = video.indexOf(Buffer.from('avc1'), video.indexOf(Buffer.from('stsd')))
  assert.ok(sampleEntry > 0, 'H.264 visual sample entry must exist')
  assert.equal(video.readUInt16BE(sampleEntry + 28), 1920)
  assert.equal(video.readUInt16BE(sampleEntry + 30), 1080)
  assert.ok(frames.every(([, time]) => time + 1 / 240 < 3.25 - 1 / 24))
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.ok(html.includes(`href="${DESKTOP_GAZE_SRC}" as="fetch"`))
  assert.match(html, /media="\(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\)"/)
  const component = readFileSync(new URL('../src/components/StudioFooter.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(component, /['"]\/footer-desktop\.mp4['"]/)
  assert.match(component, /createMobileGazeAnimation\(\{ image: posterRef\.current \}\)/)
  await flush()
})
