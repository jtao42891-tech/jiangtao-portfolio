// Proportional column widths give uncropped images a shared height without frames.
export function getProportionalColumns(items) {
  return items.map(item => {
    const [width, height] = (item.ratio || '').split(':').map(Number)
    const ratio = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? width / height : 1
    return `minmax(0, ${ratio}fr)`
  }).join(' ')
}
