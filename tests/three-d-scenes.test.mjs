import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gallerySections, sectionItems } from '../src/gallery-data.js'

test('3D design presents nine caption-free scenes in a staggered subcategory', () => {
  const section = gallerySections.find(item => item.id === 'three-d')
  const group = section.rows[0]
  assert.equal(section.skipInCategoryHeading, true)
  assert.equal(group.title, '三维场景设计')
  assert.equal(group.gridLayout, 'aligned')
  assert.equal(group.frameRatio, '16:9')
  assert.equal(group.hideCaptions, true)
  assert.equal(group.showSkip, false)
  assert.equal(group.items.length, 9)
  assert.ok(sectionItems(section).every(item => item.src && item.alt && /^\d+:\d+$/.test(item.ratio)))
  const css = readFileSync(new URL('../src/components/project-grid.css', import.meta.url), 'utf8')
  assert.match(css, /\.project-grid\.project-grid-staggered[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css, /\.project-staggered-column[^}]*justify-content:space-between/)
})

test('3D design adds six mixed-format motion works in a second staggered subcategory', () => {
  const section = gallerySections.find(item => item.id === 'three-d')
  const group = section.rows[1]
  assert.equal(group.title, '三维动态/动画设计')
  assert.equal(group.gridLayout, 'staggered')
  assert.equal(group.hideCaptions, true)
  assert.equal(group.showSkip, false)
  assert.deepEqual(group.items.map(item => item.kind), ['video', 'video', 'video', 'video', 'video', 'image'])
  assert.deepEqual(group.items.map(item => item.previewFit), ['', '', '', '', '', 'contain'])
  assert.equal(group.items.length, 6)
  assert.ok(group.items.every(item => item.src && /^\d+:\d+$/.test(item.ratio)))
  assert.equal(sectionItems(section).length, 15)
})
