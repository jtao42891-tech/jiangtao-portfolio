import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/components/studio-footer.css', import.meta.url), 'utf8')
const footer = readFileSync(new URL('../src/components/StudioFooter.jsx', import.meta.url), 'utf8')
const mobile = css.slice(css.indexOf('@media (max-width: 700px)'))

test('footer composition is transparent to desktop layout and becomes a mobile-only contact grid', () => {
  assert.match(css, /\.studio-contact-composition \{ display: contents; \}/)
  assert.match(css, /\.studio-character \{ display: contents; \}/)
  assert.match(mobile, /\.studio-contact-composition \{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, \.9fr\)/)
  assert.match(mobile, /@media \(max-width: 480px\)/)
  assert.match(mobile, /\.studio-contact-title, \.studio-note \{ grid-column: 1 \/ -1; \}/)
  assert.match(css, /\.studio-background \{ position: absolute; inset: 0; z-index: -1; pointer-events: none; \}/)
})

test('mobile back-to-top sits above the uncropped puppet and remains accessible', () => {
  assert.match(mobile, /\.studio-character \{[^}]*display: flex; flex-direction: column;[^}]*grid-column: 2; grid-row: 1 \/ 4/)
  assert.match(mobile, /\.studio-background \{[^}]*order: 1;[^}]*aspect-ratio: 9 \/ 11; overflow: visible/)
  assert.match(mobile, /\.studio-background video \{[^}]*object-fit: contain/)
  assert.doesNotMatch(mobile, /object-fit: cover/)
  assert.match(mobile, /\.studio-back-to-top \{[^}]*min-height: 48px/)
  assert.match(mobile, /\.studio-character \{ grid-row: 3;/)
  assert.match(footer, /className="studio-character">\s*<GazeBackground \/>/)
  assert.match(footer, /<a className="studio-back-to-top" href="#home" onClick=\{forceBackToTop\}>回到顶部/)
  assert.match(footer, /window\.scrollTo\(0, 0\)/)
})

test('mobile removes the introductory navigation and greeting, and top-aligns the button with the contact title', () => {
  assert.match(mobile, /\.studio-jobs, \.studio-contact > \.studio-tag \{ display: none; \}/)
  assert.match(mobile, /\.studio-contact-composition \{[^}]*margin-top: 0/)
  assert.match(mobile, /\.studio-contact-title \{[^}]*grid-row: 1;[^}]*margin-top: 0/)
  assert.match(mobile, /\.studio-back-to-top \{ position: absolute; top: 0; right: 0;/)
  assert.match(mobile, /\.studio-character \{[^}]*z-index: auto/)
  assert.match(mobile, /\.studio-back-to-top \{[^}]*z-index: 2/)
  assert.match(mobile, /\.studio-contact-title \{ padding-right: 114px;/)
  assert.doesNotMatch(css.split('@media (max-width: 700px)')[0], /display: none/)
  assert.match(footer, /have a fresh idea\?/)
  assert.match(footer, />say hey</)
})
