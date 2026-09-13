// Generate display copies only; original portfolio artwork stays untouched.
import { createRequire } from 'node:module'
import { mkdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { workMedia } from '../src/work-media.js'

const require = createRequire(import.meta.url)
const sharp = require(process.env.SHARP_MODULE || 'sharp')
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'
const run = promisify(execFile)
const root = path.resolve('public')
const output = path.join(root, 'media', 'previews')
await mkdir(output, { recursive: true })
sharp.concurrency(2)
const manifest = {}
const inputs = [...new Set([...Object.values(workMedia).flatMap(item => [item.src, item.poster]), '/media/jiangtao-portrait.jpg'].filter(Boolean))]
let originalBytes = 0
let previewBytes = 0

for (const [index, src] of inputs.entries()) {
  const input = path.join(root, src)
  const video = /\.mp4$/i.test(src)
  if (!video && !/\.(jpe?g|png|webp)$/i.test(src)) continue
  const name = src.slice(1).replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]/gi, '-')
  if (video) {
    const filename = `${name}-poster.jpg`
    // Match the existing card's opening frame; custom 0:04 poster stays authoritative.
    await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '3', path.join(output, filename)])
    manifest[src] = { poster: `/media/previews/${filename}` }
  } else {
    const metadata = await sharp(input).metadata()
    const long = metadata.height / metadata.width > 5
    const widths = [...new Set((long ? [360, 540] : [640, 1280]).map(width => Math.min(width, metadata.width)))]
    const variants = []
    for (const width of widths) {
      const filename = `${name}-${width}.webp`
      const destination = path.join(output, filename)
      await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 84, effort: 4 }).toFile(destination)
      variants.push({ src: `/media/previews/${filename}`, width })
      if (width === widths[0]) previewBytes += (await stat(destination)).size
    }
    originalBytes += (await stat(input)).size
    manifest[src] = { src: variants[variants.length - 1].src, srcSet: variants.map(variant => `${variant.src} ${variant.width}w`).join(', '), width: metadata.width, height: metadata.height }
  }
  if ((index + 1) % 20 === 0) console.log(`Prepared ${index + 1}/${inputs.length} media sources`)
}
await writeFile('src/media-previews.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ entries: Object.keys(manifest).length, originalBytes, smallPreviewBytes: previewBytes }))
