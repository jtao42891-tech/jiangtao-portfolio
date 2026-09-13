import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { gallerySections, sectionItems } from '../src/gallery-data.js'
import { getProportionalColumns } from '../src/project-layout.js'

test('content optimization follows livestream design and precedes details with all three original images in order', () => {
  const index = gallerySections.findIndex(section => section.id === 'content-optimization')
  const section = gallerySections[index]
  assert.equal(gallerySections[index - 1].id, 'livestream-design')
  assert.equal(gallerySections[index + 1].id, 'product-detail')
  assert.equal(section.title, '局部内容优化')
  assert.equal(section.english, 'Partial content optimization.')
  assert.equal(section.layout, 'image')
  assert.equal(section.previewRatio, undefined)
  assert.equal(section.frameRatio, undefined)
  assert.equal(section.equalImageHeight, true)
  assert.deepEqual(section.items.map(item => item.ratio), ['790:1624', '1200:1600', '790:1333'])
  assert.deepEqual(section.items.map(item => item.src.split('/').at(-1)), ['01-probiotic-awards.jpg', '02-fish-oil-arctic.jpg', '03-fish-oil-nutrition.png'])
  for (const item of section.items) {
    assert.equal(item.kind, 'image')
    assert.ok(existsSync(new URL('../public' + item.src, import.meta.url)))
  }
  assert.equal(gallerySections.flatMap(sectionItems).length, 106)
})

test('new project uses proportional columns without frames and keeps the shared viewer interaction', () => {
  const css = readFileSync(new URL('../src/components/project-grid.css', import.meta.url), 'utf8')
  const gallery = readFileSync(new URL('../src/components/WorkGallery.jsx', import.meta.url), 'utf8')
  const grid = readFileSync(new URL('../src/components/ProjectGrid.jsx', import.meta.url), 'utf8')
  assert.match(css, /\.project-grid\.project-grid-proportional \{ column-gap:clamp\(6px,1\.2vw,14px\)/)
  assert.doesNotMatch(css, /#content-optimization \.project-grid \{ grid-template-columns/)
  assert.match(grid, /gridTemplateColumns: getProportionalColumns\(items\)/)
  assert.match(gallery, /equalImageHeight=\{group.equalImageHeight\}/)
  assert.match(css, /\.project-grid \.gallery-image-button > img[^}]*object-fit:contain/)
  assert.match(gallery, /<MediaCard frameRatio=\{group.frameRatio\}[^>]*onOpen=\{\(\) => onOpen\(items, index, group.title\)\}/)
})

test('proportional columns fill the row with equal image heights at phone and desktop widths', () => {
  const items = gallerySections.find(section => section.id === 'content-optimization').items
  const columns = getProportionalColumns(items)
  const weights = Array.from(columns.matchAll(/minmax\(0, ([\d.]+)fr\)/g), match => Number(match[1]))
  assert.equal(weights.length, 3)
  assert.ok(weights[0] < weights[2] && weights[2] < weights[1])
  for (const [width, gap] of [[272, 6], [342, 6], [591, 7.668], [1170, 14]]) {
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    const widths = weights.map(weight => (width - 2 * gap) * weight / total)
    const heights = widths.map((value, index) => value / weights[index])
    assert.ok(heights.every(height => Math.abs(height - heights[0]) < 0.001))
    assert.ok(Math.abs(widths.reduce((sum, value) => sum + value, 0) + gap * 2 - width) < 0.001)
  }
  assert.deepEqual(gallerySections.filter(section => section.equalImageHeight).map(section => section.id), ['livestream-design', 'content-optimization'])
})

test('missing or invalid aspect ratios have a safe proportional-column fallback', () => {
  for (const ratio of [undefined, 'invalid', '0:20', '12:0', '-1:3', 'Infinity:20']) {
    assert.equal(getProportionalColumns([{ ratio }]), 'minmax(0, 1fr)')
  }
})
