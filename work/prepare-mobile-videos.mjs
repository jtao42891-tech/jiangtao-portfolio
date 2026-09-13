import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { workMedia } from '../src/work-media.js'

// Create phone-only playback copies; desktop originals are never modified.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'public/media/mobile-video')
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe'
const profile = { version: 1, longEdge: 1280, shortEdge: 720, fps: 30, crf: 24, preset: 'medium', audioBitrate: '96k' }

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (data) => { stdout += data })
    child.stderr.on('data', (data) => { stderr += data })
    child.on('error', reject)
    child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(`${path.basename(command)} exited ${code}: ${stderr}`)))
  })
}

async function probe(file) {
  return JSON.parse(await run(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]))
}

async function sourceHash(file) {
  const hash = createHash('sha256').update(JSON.stringify(profile))
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex').slice(0, 12)
}

function frameRate(stream) {
  const [numerator, denominator] = stream.avg_frame_rate.split('/').map(Number)
  return numerator / denominator
}

await mkdir(outputDir, { recursive: true })
const sources = [...new Set(Object.values(workMedia).map((item) => item.src).filter((src) => /\.mp4$/i.test(src)))]
const previews = {}
const report = []

// Encode sequentially and use only two threads to keep the desktop responsive.
for (const src of sources) {
  const original = path.join(root, 'public', src.replace(/^\//, ''))
  const originalInfo = await probe(original)
  const originalVideo = originalInfo.streams.find((stream) => stream.codec_type === 'video')
  if (!originalVideo) throw new Error(`Missing video stream: ${src}`)
  const scale = Math.min(1, profile.longEdge / Math.max(originalVideo.width, originalVideo.height), profile.shortEdge / Math.min(originalVideo.width, originalVideo.height))
  const width = Math.max(2, Math.floor(originalVideo.width * scale / 2) * 2)
  const height = Math.max(2, Math.floor(originalVideo.height * scale / 2) * 2)
  const fps = frameRate(originalVideo)
  const filters = [`scale=${width}:${height}:flags=lanczos`, 'setsar=1']
  if (Number.isFinite(fps) && fps > profile.fps) filters.push(`fps=${profile.fps}`)
  const name = `${src.replace(/^\/works\//, '').replace(/\.mp4$/i, '').replaceAll('/', '-')}-${await sourceHash(original)}.mp4`
  const output = path.join(outputDir, name)
  let exists = true
  try { await access(output) } catch { exists = false }
  if (!exists) {
    console.log(`Encoding ${src}: ${originalVideo.width}x${originalVideo.height} → ${width}x${height}`)
    await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-threads', '2', '-i', original,
      '-map', '0:v:0', '-map', '0:a?', '-vf', filters.join(','),
      '-c:v', 'libx264', '-preset', profile.preset, '-crf', String(profile.crf), '-pix_fmt', 'yuv420p',
      '-threads', '2', '-filter_threads', '2', '-c:a', 'aac', '-b:a', profile.audioBitrate,
      '-movflags', '+faststart', '-map_metadata', '-1', output])
  }
  const encodedInfo = await probe(output)
  const encodedVideo = encodedInfo.streams.find((stream) => stream.codec_type === 'video')
  const originalAudioCount = originalInfo.streams.filter((stream) => stream.codec_type === 'audio').length
  const encodedAudioCount = encodedInfo.streams.filter((stream) => stream.codec_type === 'audio').length
  const originalDuration = Number(originalInfo.format.duration)
  const duration = Number(encodedInfo.format.duration)
  if (encodedVideo.width !== width || encodedVideo.height !== height || Math.abs(originalDuration - duration) > 0.1 || originalAudioCount !== encodedAudioCount) {
    throw new Error(`Encoded dimensions, duration, or audio differ unexpectedly: ${src}`)
  }
  // Faststart must place the movie index before media bytes for immediate playback.
  const file = await readFile(output)
  if (file.indexOf(Buffer.from('moov')) > file.indexOf(Buffer.from('mdat'))) throw new Error(`Missing faststart: ${src}`)
  previews[src] = { src: `/media/mobile-video/${name}`, width, height, duration }
  report.push({ src, beforeBytes: (await stat(original)).size, afterBytes: file.length, width, height, originalDuration, duration, audioTracks: encodedAudioCount, fps: frameRate(encodedVideo) })
  console.log(JSON.stringify(report.at(-1)))
}

await writeFile(path.join(root, 'src/mobile-video-previews.json'), `${JSON.stringify(previews, null, 2)}\n`)
console.log(JSON.stringify({ count: report.length, beforeBytes: report.reduce((sum, item) => sum + item.beforeBytes, 0), afterBytes: report.reduce((sum, item) => sum + item.afterBytes, 0), report }, null, 2))
