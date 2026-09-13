export function railPosition(scrollLeft, clientWidth, scrollWidth, itemWidth, gap, total) {
  const step = itemWidth + gap
  const visible = Math.max(1, Math.min(total, Math.round((clientWidth + gap) / step)))
  const start = Math.max(0, Math.min(total - visible, Math.round(scrollLeft / step)))
  return { start, visible, end: Math.min(total, start + visible), canPrev: scrollLeft > 2, canNext: scrollLeft < scrollWidth - clientWidth - 2 }
}

export function nextRailStart(start, visible, total, direction) {
  return Math.max(0, Math.min(total - visible, start + direction * visible))
}

// A short flick can carry the rail forward, but never throw it several cards away.
export function railReleaseTarget(current, max, step, velocity = 0) {
  if (!(step > 0)) return Math.max(0, Math.min(max, current))
  const carry = Math.max(-step * 0.85, Math.min(step * 0.85, velocity * 160))
  return Math.max(0, Math.min(max, Math.round((current + carry) / step) * step))
}
