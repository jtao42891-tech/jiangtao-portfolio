import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { profile } from '../src/content.js'

test('contact information matches the supplied details with an unescaped email address', () => {
  assert.equal(profile.email, '2933329742@qq.com')
  assert.equal(profile.wechat, 'jjjjttttnb')
  assert.equal(profile.phone, '19155024406')
  assert.equal(profile.wechatQr, '/media/wechat-qr.jpg')
})

test('the WeChat QR asset is the unchanged original JPEG', () => {
  const image = readFileSync(new URL('../public' + profile.wechatQr, import.meta.url))
  assert.equal(createHash('sha256').update(image).digest('hex'), '80bb7afbc56fb66f8ad37dcaf99aad6a5cbc3b4fd54c3cfef0f3523109af1c69')
})

test('footer and contact dialog share email and telephone links, with QR and copy support', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const footer = readFileSync(new URL('../src/components/StudioFooter.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  for (const source of [app, footer]) {
    assert.match(source, /href=\{'mailto:' \+ profile\.email\}/)
    assert.match(source, /href=\{'tel:' \+ profile\.phone\}/)
    assert.match(source, /profile\.wechat/)
  }
  assert.match(app, /navigator\.clipboard\.writeText\(profile\.wechat\)/)
  assert.match(app, /请手动复制微信号/)
  assert.match(app, /src=\{profile\.wechatQr\} alt="蒋涛的微信二维码"/)
  assert.match(app, /className="copy-status" role="status" aria-live="polite"/)
  assert.match(footer, /onClick=\{onContact\} aria-haspopup="dialog"/)
  assert.match(footer, /className="studio-headline studio-contact-title" data-motion-heading/)
  assert.doesNotMatch(footer, /className="studio-contact" data-motion-heading/)
  assert.match(css, /\.contact-wechat-qr img \{[^}]*height: auto;[^}]*background: #fff;[^}]*object-fit: contain/)
  assert.match(css, /@media \(max-width: 760px\) \{\s*\.contact-details-layout\.has-qr \{ grid-template-columns: minmax\(0, 1fr\);/)
})
