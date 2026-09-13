// Mobile-only display copies. Desktop assets and full-resolution viewers are untouched.
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { workMedia } from '../src/work-media.js'

const require = createRequire(import.meta.url)
const sharp = require(process.env.SHARP_MODULE || 'sharp')
sharp.concurrency(2)
const root = path.resolve('public')
const output = path.join(root, 'media', 'mobile-previews')
await mkdir(output, { recursive: true })
const desktop = JSON.parse(await readFile('src/media-previews.json', 'utf8'))
const inputs = [...new Set([
  ...Object.values(workMedia).flatMap(item => [item.src, item.poster]),
  ...Object.values(desktop).map(item => item.poster),
  '/media/jiangtao-portrait.jpg',
].filter(src => src && /\.(jpe?g|png|webp)$/i.test(src)))]
const manifest = {}
let smallBytes = 0
for (const [index, src] of inputs.entries()) {
  const input = path.join(root, src)
  const metadata = await sharp(input).metadata()
  const long = metadata.height / metadata.width > 5
  const widths = [...new Set((long ? [240, 360] : [360, 540, 800, 1080]).map(width => Math.min(width, metadata.width)))]
  const name = src.slice(1).replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]/gi, '-')
  const variants = []
  for (const width of widths) {
    const buffer = await sharp(input).resize({ width, withoutEnlargement: true })
      .webp({ quality: long ? 74 : 78, effort: 4 }).toBuffer()
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 10)
    const filename = `${name}-${width}-${hash}.webp`
    const destination = path.join(output, filename)
    if (!(await stat(destination).catch(() => null))) await writeFile(destination, buffer)
    variants.push({ src: `/media/mobile-previews/${filename}`, width })
    if (width === widths[0]) smallBytes += buffer.length
  }
  manifest[src] = {
    src: variants.at(-1).src,
    srcSet: variants.map(variant => `${variant.src} ${variant.width}w`).join(', '),
    width: metadata.width,
    height: metadata.height,
  }
  if ((index + 1) % 25 === 0) console.log(`Prepared ${index + 1}/${inputs.length} mobile image sources`)
}
// Generated separately because animated encoding is more expensive.
const animations = JSON.parse(await readFile('work/mobile-animation-previews.json', 'utf8').catch(error => {
  if (error.code !== 'ENOENT') throw error
  return '{}'
}))
Object.assign(manifest, animations)
await writeFile('src/mobile-media-previews.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ entries: Object.keys(manifest).length, staticSmallBytes: smallBytes, animations: Object.keys(animations).length }))
