export const PROFILE_INTRO = Object.freeze({ delay: 500, duration: 3200 })

const points = [[50, 50], [18, 24], [82, 35], [70, 80], [50, 50]]

// One closed tour of the card, easing into each pose and returning exactly flat.
export function sampleProfileIntro(progress) {
  const position = Math.max(0, Math.min(1, progress)) * (points.length - 1)
  const index = Math.min(Math.floor(position), points.length - 2)
  const fraction = position - index
  const eased = fraction * fraction * (3 - 2 * fraction)
  const from = points[index]
  const to = points[index + 1]
  return { x: from[0] + (to[0] - from[0]) * eased, y: from[1] + (to[1] - from[1]) * eased }
}
