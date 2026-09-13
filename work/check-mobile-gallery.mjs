// Focused render check; no browser automation or full regression suite.
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { default: WorkGallery } = await server.ssrLoadModule('/src/components/WorkGallery.jsx')
  const desktop = renderToStaticMarkup(React.createElement(WorkGallery, { reduced: true }))
  globalThis.window = { matchMedia: () => ({ matches: true }) }
  const mobile = renderToStaticMarkup(React.createElement(WorkGallery, { reduced: true }))
  delete globalThis.window
  const count = (html, expression) => [...html.matchAll(expression)].length
  assert.ok(desktop.includes('aria-label="放大查看'))
  assert.ok(desktop.includes('class="homepage-preview-open"'))
  assert.ok(!mobile.includes('aria-label="放大查看'))
  assert.ok(!mobile.includes('class="homepage-preview-open"'))
  assert.equal(count(mobile, /<button[^>]*aria-label="播放或查看/g), 9)
  assert.equal(count(mobile, /<button[^>]*class="packaging-render-button/g), 2)
  assert.equal(count(mobile, /<img /g), count(desktop, /<img /g))
  assert.equal(count(mobile, /class="homepage-preview-cover"/g), 6)
  console.log('Mobile: no image lightbox controls; 9 playable videos, 2 packaging render buttons, all artwork and 6 scrollable long previews preserved. Desktop controls unchanged.')
} finally {
  delete globalThis.window
  await server.close()
}
