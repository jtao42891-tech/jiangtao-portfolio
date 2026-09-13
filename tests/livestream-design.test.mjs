import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { gallerySections } from '../src/gallery-data.js'
import { getProportionalColumns } from '../src/project-layout.js'

const index = gallerySections.findIndex(section => section.id === 'livestream-design')
const section = gallerySections[index]

test('livestream design sits directly below marketing with three uncropped 9:16 images', () => {
  assert.equal(gallerySections[index - 1].id, 'marketing-main')
  assert.equal(gallerySections[index + 1].id, 'content-optimization')
  assert.equal(section.title, '直播间设计')
  assert.equal(section.english, 'Livestream studio design.')
  assert.equal(section.layout, 'image')
  assert.equal(section.equalImageHeight, true)
  assert.equal(section.frameRatio, undefined)
  assert.equal(section.previewRatio, undefined)
  assert.deepEqual(section.items.map(item => item.ratio), ['1080:1920', '1080:1920', '900:1600'])
  assert.deepEqual(section.items.map(item => item.src.split('/').at(-1)), ['01-calcium-spring.jpg', '02-calcium-new-year.jpg', '03-fish-oil-sports.gif'])
  assert.equal(getProportionalColumns(section.items), Array(3).fill('minmax(0, 0.5625fr)').join(' '))
  assert.ok(section.items.every(item => item.kind === 'image' && existsSync(new URL('../public' + item.src, import.meta.url))))
})

test('display order swaps sports and spring while keeping the new-year livestream centered', () => {
  const ordered = section.featuredIds.map(id => section.items.find(item => item.id === id))
  assert.deepEqual(ordered.map(item => item.title), ['金凯撒 · 运动直播间', '宝嘉力 · 马年直播间', '宝嘉力 · 春季直播间'])
  assert.equal(new Set(section.featuredIds).size, 3)
  assert.equal(ordered[0].src, '/works/livestream-design/03-fish-oil-sports.gif')
})

test('the sports work remains an animated GIF instead of a flattened preview or video', () => {
  const item = section.items[2]
  const gif = readFileSync(new URL('../public' + item.src, import.meta.url))
  assert.equal(gif.subarray(0, 6).toString(), 'GIF89a')
  assert.equal(gif.readUInt16LE(6), 900)
  assert.equal(gif.readUInt16LE(8), 1600)
  assert.ok(gif.includes(Buffer.from('NETSCAPE2.0')))
  const gallery = readFileSync(new URL('../src/components/WorkGallery.jsx', import.meta.url), 'utf8')
  assert.match(gallery, /<img src=\{item.kind === 'video' \? item.poster : item.src\}/)
})
