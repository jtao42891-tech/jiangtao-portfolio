import test from 'node:test'
import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { workMedia } from '../src/work-media.js'
import { videoPlaybackSource } from '../src/media-preview.js'
import mobileVideos from '../src/mobile-video-previews.json' with { type: 'json' }

test('all nine videos use clear mobile copies only on phones, desktop keeps original sources', async () => {
  const videos = Object.values(workMedia).filter(item => item.src?.endsWith('.mp4'))
  assert.equal(videos.length, 9)
  for (const item of videos) {
    assert.equal(videoPlaybackSource(item.src), item.src)
    const preview = mobileVideos[item.src]
    assert.ok(preview, item.src)
    assert.equal(videoPlaybackSource(item.src, true), preview.src)
    assert.match(preview.src, /^\/media\/mobile-video\/.*-[a-f0-9]{12}\.mp4$/)
    assert.ok(Math.min(preview.width, preview.height) <= 720)
    assert.ok(Math.max(preview.width, preview.height) <= 1280)
    assert.ok(preview.duration > 0)
    assert.ok((await stat(path.join('public', preview.src))).size > 0)
  }
})
