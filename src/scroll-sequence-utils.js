export function sequencePosition(offset, travel, lead = 48) {
  const distance = Math.max(0, Math.min(Math.max(0, travel), offset - lead))
  return { distance, finished: offset >= lead + Math.max(0, travel) }
}

export function sequenceVisibleRange(cards, distance, height) {
  const visible = cards.map((card, index) => ({ ...card, index })).filter(card => card.bottom > distance + 1 && card.top < distance + height - 1)
  return { first: visible[0]?.index ?? 0, last: visible.at(-1)?.index ?? 0 }
}
