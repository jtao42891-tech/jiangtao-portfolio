import test from 'node:test'
import assert from 'node:assert/strict'
import { observeProfileInteractions, PROFILE_TOUCH_QUERY } from '../src/components/profile-card-interaction.js'

function setup(touch) {
  const shell = new EventTarget()
  const windowTarget = new EventTarget()
  const touchQuery = Object.assign(new EventTarget(), { matches: touch })
  const calls = { move: 0, leave: 0, reset: 0, scheduleIntro: 0 }
  const callbacks = Object.fromEntries(Object.keys(calls).map(name => [name, () => { calls[name]++ }]))
  const stop = observeProfileInteractions({ shell, windowTarget, touchQuery, ...callbacks })
  return { shell, windowTarget, touchQuery, calls, stop }
}

test('touch portrait ignores every pointer event and toolbar resizing preserves its intro', () => {
  assert.equal(PROFILE_TOUCH_QUERY, '(hover: none) and (pointer: coarse)')
  const { shell, windowTarget, calls, stop } = setup(true)
  for (const type of ['pointerenter', 'pointermove', 'pointerleave', 'pointercancel']) shell.dispatchEvent(new Event(type))
  windowTarget.dispatchEvent(new Event('resize'))
  assert.deepEqual(calls, { move: 0, leave: 0, reset: 0, scheduleIntro: 1 })
  stop()
  windowTarget.dispatchEvent(new Event('resize'))
  assert.equal(calls.scheduleIntro, 1)
})

test('desktop keeps all pointer and resize behavior, and switching to touch removes it', () => {
  const { shell, windowTarget, touchQuery, calls, stop } = setup(false)
  for (const type of ['pointerenter', 'pointermove', 'pointerleave', 'pointercancel']) shell.dispatchEvent(new Event(type))
  windowTarget.dispatchEvent(new Event('resize'))
  assert.deepEqual(calls, { move: 2, leave: 1, reset: 2, scheduleIntro: 1 })
  touchQuery.matches = true
  touchQuery.dispatchEvent(new Event('change'))
  const afterSwitch = { ...calls }
  for (const type of ['pointerenter', 'pointermove', 'pointerleave', 'pointercancel']) shell.dispatchEvent(new Event(type))
  assert.deepEqual(calls, afterSwitch)
  touchQuery.matches = false
  touchQuery.dispatchEvent(new Event('change'))
  shell.dispatchEvent(new Event('pointermove'))
  assert.equal(calls.move, 3)
  stop()
  shell.dispatchEvent(new Event('pointermove'))
  assert.equal(calls.move, 3)
})
