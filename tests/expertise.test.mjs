import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { strengths, profile } from '../src/content.js'

test('each of the three capabilities retains full copy and gains a concise mobile summary', () => {
  assert.equal(strengths.length, 3)
  assert.deepEqual(strengths.map(item => item.title), ['从品牌出发', '让价值被看见', '把技术变成创造力'])
  for (const item of strengths) {
    assert.ok(item.shortDescription.length > 0 && item.shortDescription.length <= 26)
    assert.ok(item.description.length > item.shortDescription.length)
    assert.ok(item.english && item.tags.length === 3)
  }
})

test('compact layout is mobile-only and scoped to expertise, with no clipped copy or contact rules', () => {
  const css = readFileSync(new URL('../src/components/expertise.css', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /#expertise \.strength-top \{ display: contents; \}/)
  assert.match(css, /#expertise \.expertise-mobile-copy \{ display: none; \}/)
  assert.match(app, /\{item\.description\}.*\{item\.shortDescription\}/)
  assert.doesNotMatch(css, /line-clamp|max-height|overflow:\s*(hidden|clip)|studio-footer|contact|wechat/)
})

test('mobile simplification preserves all personal contact fields and the QR image', () => {
  assert.deepEqual([profile.email, profile.wechat, profile.phone, profile.wechatQr],
    ['2933329742@qq.com', 'jjjjttttnb', '19155024406', '/media/wechat-qr.jpg'])
})
