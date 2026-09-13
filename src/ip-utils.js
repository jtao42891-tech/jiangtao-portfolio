export function nextIPIndex(index, delta, total, wrap = true) {
  if (total < 1) return 0
  const next = index + delta
  return wrap ? ((next % total) + total) % total : Math.max(0, Math.min(total - 1, next))
}

export function ipRole(index, active, total) {
  if (index === active) return 'center'
  if (total === 2) return 'right'
  if (index === nextIPIndex(active, -1, total)) return 'left'
  if (index === nextIPIndex(active, 1, total)) return 'right'
  if (index === nextIPIndex(active, 2, total)) return 'back'
  return 'hidden'
}

// Fractional slot positions keep the four-character orbit moving for all 22 seconds.
export function advanceIPPhase(phase, elapsed, total) {
  return nextIPIndex(phase, Math.max(0, Math.min(64, elapsed)) / 5500, total)
}

export function ipOrbitStyles(index, phase, total) {
  const angle = total > 1 ? (index - phase) * Math.PI * 2 / total : 0
  const depth = (Math.cos(angle) + 1) / 2
  const horizontal = Math.sin(angle)
  return {
    '--ip-x': (horizontal * 90).toFixed(4) + '%',
    '--ip-x-mobile': (horizontal * 62).toFixed(4) + '%',
    '--ip-y': (-36 * (1 - depth)).toFixed(4) + 'px',
    '--ip-scale': (0.32 + 0.68 * depth ** 2).toFixed(5),
    '--ip-scale-mobile': (0.24 + 0.76 * depth ** 2.6).toFixed(5),
    '--ip-opacity': (0.3 + 0.7 * depth).toFixed(4),
    '--ip-blur': ((1 - depth) * 1.2).toFixed(4) + 'px',
    '--ip-layer': String(Math.round(depth * 100) + 1),
  }
}
