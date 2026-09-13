import test from 'node:test'
import assert from 'node:assert/strict'
import { PROFILE_INTRO, sampleProfileIntro } from '../src/components/profile-card-intro.js'

test('portrait intro makes one bounded tour and returns exactly to rest', () => {
  assert.equal(PROFILE_INTRO.delay, 500)
  assert.equal(PROFILE_INTRO.duration, 3200)
  assert.deepEqual(sampleProfileIntro(-1), { x: 50, y: 50 })
  assert.deepEqual(sampleProfileIntro(0), { x: 50, y: 50 })
  assert.deepEqual(sampleProfileIntro(0.25), { x: 18, y: 24 })
  assert.deepEqual(sampleProfileIntro(0.5), { x: 82, y: 35 })
  assert.deepEqual(sampleProfileIntro(0.75), { x: 70, y: 80 })
  assert.deepEqual(sampleProfileIntro(1), { x: 50, y: 50 })
  assert.deepEqual(sampleProfileIntro(2), { x: 50, y: 50 })
  for (let step = 0; step <= 1000; step++) {
    const { x, y } = sampleProfileIntro(step / 1000)
    assert(x >= 18 && x <= 82)
    assert(y >= 24 && y <= 80)
  }
})

test('portrait intro eases into the start, each pose, and the finish', () => {
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    const before = sampleProfileIntro(progress - 0.0001)
    const after = sampleProfileIntro(progress + 0.0001)
    assert(Math.abs(before.x - after.x) < 0.0001)
    assert(Math.abs(before.y - after.y) < 0.0001)
  }
})
