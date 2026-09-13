// Mobile display copies only. Source GIFs and application manifests stay untouched.
// Run from any directory with SHARP_MODULE pointing to an installed sharp module.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const sharp = require(process.env.SHARP_MODULE || 'sharp')
const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'public/media/mobile-previews')
const sources = [
  '/works/livestream-design/03-fish-oil-sports.gif',
  '/works/three-d-motion/06-portable-oxygen.gif',
]
const widths = [320, 360, 480, 640]
const quality = 74
const manifest = {}
const report = []
await mkdir(output, { recursive: true })
sharp.concurrency(2)

for (const src of sources) {
  const input = await readFile(path.join(root, 'public', src))
  const original = await sharp(input, { animated: true }).metadata()
  const variants = []
  assert.ok(original.pages > 1, `${src} must remain an animation`)
  assert.equal(original.delay.length, original.pages)
  for (const width of widths) {
    // Resize by width only so every frame keeps its full original composition.
    const data = await sharp(input, { animated: true })
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 4, loop: original.loop, delay: original.delay })
      .toBuffer()
    const metadata = await sharp(data, { animated: true }).metadata()
    assert.equal(metadata.width, width)
    assert.equal(metadata.pageHeight, Math.round(original.pageHeight * width / original.width))
    // libwebp coalesces repeated frames. This changes the stored frame count,
    // but their delays must add up to the complete original playback duration.
    assert.ok(metadata.pages > 1, `${src}: animation was lost`)
    const durationMs = metadata.delay.reduce((sum, delay) => sum + delay, 0)
    const originalDurationMs = original.delay.reduce((sum, delay) => sum + delay, 0)
    assert.equal(durationMs, originalDurationMs, `${src}: playback duration changed`)
    assert.equal(metadata.loop, original.loop, `${src}: loop changed`)
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 10)
    const stem = src.slice(1).replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]/gi, '-')
    const filename = `${stem}-mobile-${width}-${hash}.webp`
    await writeFile(path.join(output, filename), data)
    variants.push({ src: `/media/mobile-previews/${filename}`, width })
    const result = {
      source: src, width, height: metadata.pageHeight, quality,
      originalBytes: input.length, bytes: data.length,
      reductionPercent: +(100 * (1 - data.length / input.length)).toFixed(2),
      originalPages: original.pages, pages: metadata.pages, loop: metadata.loop,
      originalDelay: original.delay, delay: metadata.delay,
      originalDurationMs, durationMs,
      samePages: metadata.pages === original.pages,
      sameDelay: JSON.stringify(metadata.delay) === JSON.stringify(original.delay),
      sameLoop: metadata.loop === original.loop,
      src: variants.at(-1).src,
    }
    report.push(result)
    console.log(JSON.stringify(result))
  }
  manifest[src] = {
    src: variants.at(-1).src,
    srcSet: variants.map(variant => `${variant.src} ${variant.width}w`).join(', '),
    width: original.width,
    height: original.pageHeight,
  }
}

await writeFile(path.join(root, 'work/mobile-animation-previews.json'), JSON.stringify(manifest, null, 2) + '\n')
await writeFile(path.join(root, 'work/mobile-animation-report.json'), JSON.stringify(report, null, 2) + '\n')
