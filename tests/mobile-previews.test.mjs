import test from 'node:test'
import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { previewImageProps } from '../src/media-preview.js'
import desktop from '../src/media-previews.json' with { type: 'json' }
import mobile from '../src/mobile-media-previews.json' with { type: 'json' }

test('desktop selection and its intrinsic geometry remain unchanged', () => {
  for (const [src, preview] of Object.entries(desktop)) {
    if (!preview.src) continue
    assert.deepEqual(previewImageProps(src, '118px'), { ...preview, sizes: '118px' })
    const phone = previewImageProps(src, '118px', true)
    assert.equal(phone.width, preview.width)
    assert.equal(phone.height, preview.height)
    assert.match(phone.src, /^\/media\/mobile-previews\//)
  }
})

test('phone previews exist and fingerprints are available for stable caching', async () => {
  assert.equal(Object.keys(mobile).length, 112)
  for (const [src, preview] of Object.entries(mobile)) {
    assert.deepEqual(previewImageProps(src, '118px', true), { ...preview, sizes: '118px' })
    assert.ok(preview.width > 0 && preview.height > 0)
    for (const candidate of preview.srcSet.split(', ')) {
      const [url, width] = candidate.split(' ')
      assert.match(url, /-[a-f0-9]{10}\.webp$/)
      assert.match(width, /^\d+w$/)
      assert.ok((await stat(path.join('public', url))).size > 0)
    }
  }
})

test('GIFs use mobile animation copies only on phones', () => {
  const gifs = Object.keys(mobile).filter(src => src.endsWith('.gif'))
  assert.equal(gifs.length, 2)
  for (const src of gifs) {
    assert.deepEqual(previewImageProps(src), { src })
    assert.match(previewImageProps(src, undefined, true).src, /\.webp$/)
  }
  assert.deepEqual(previewImageProps('/not-in-manifest.png', undefined, true), { src: '/not-in-manifest.png' })
})
