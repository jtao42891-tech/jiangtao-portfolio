import gazeFrames from './gaze-frames.json' with { type: 'json' }

const TAU = Math.PI * 2
export function timeForAngle(angle) {
  const target = (angle % TAU + TAU) % TAU
  let nearestTime = gazeFrames[0][1]
  let nearestDistance = Infinity
  for (const [sampleAngle, time] of gazeFrames) {
    const difference = Math.abs(target - sampleAngle)
    const distance = Math.min(difference, TAU - difference)
    if (distance < nearestDistance) { nearestDistance = distance; nearestTime = time }
  }
  return nearestTime + 1 / 240
}
