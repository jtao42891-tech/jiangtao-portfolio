import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// Contract tests for the animation lifecycle; not a browser/FPS simulation.
const source = readFileSync(new URL('../src/motion/engine.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/^export /gm, '')

function harness(hash = '#home') {
  const calls = { timelines: [], triggers: [], observers: [], delays: [], contexts: [] }
  const gsap = {
    registerPlugin() {}, set() {},
    timeline(options = {}) {
      const timeline = { options, steps: [], played: false,
        fromTo(...args) { this.steps.push(args); return this },
        to(...args) { this.steps.push(args); return this },
        set(...args) { this.steps.push(args); return this },
        play() { this.played = true; return this },
        progress(value) { this.progressValue = value; return this }, eventCallback() {},
      }
      calls.timelines.push(timeline)
      return timeline
    },
    context(fn) {
      const context = { add: callback => callback(), revert() { this.reverted = true }, getTweens: () => [] }
      calls.contexts.push(context)
      fn()
      return context
    },
    delayedCall(time, callback) {
      const delay = { time, callback, killed: false, kill() { this.killed = true } }
      calls.delays.push(delay)
      return delay
    },
    matchMedia: () => ({ add() {}, revert() {} }),
  }
  class Observer {
    constructor(callback) { this.callback = callback; this.nodes = new Set(); calls.observers.push(this) }
    observe(node) { this.nodes.add(node) } unobserve(node) { this.nodes.delete(node) }
    disconnect() { this.disconnected = true }
  }
  const ScrollTrigger = { create: options => calls.triggers.push(options), batch() {}, refresh() {} }
  const document = { activeElement: null }
  const sandbox = { gsap, ScrollTrigger, console, document, innerHeight: 800, performance: { now: () => 100 },
    location: { hash }, window: { addEventListener() {}, removeEventListener() {} },
    IntersectionObserver: Observer, MutationObserver: Observer, ResizeObserver: Observer,
  }
  vm.createContext(sandbox)
  vm.runInContext(source + '\nglobalThis.api = { createPortfolioMotion, createSequenceHeadingMotion, revealContent, MOTION };', sandbox)
  const flush = () => { const pending = calls.delays.splice(0); pending.forEach(delay => { if (!delay.killed) delay.callback() }) }
  return { calls, document, flush, ...sandbox.api }
}

function node({ top = 300, bottom = 600, selectors = {} } = {}) {
  const listeners = new Map()
  return { isConnected: true, nodeType: 1, children: [], style: {},
    querySelector: selector => selectors[selector]?.[0] || null,
    querySelectorAll: selector => selectors[selector] || [],
    closest: () => null, matches: () => false, contains: () => false,
    getBoundingClientRect: () => ({ top, bottom }),
    addEventListener(type, callback) { listeners.set(type, callback) },
    removeEventListener(type, callback) { if (listeners.get(type) === callback) listeners.delete(type) },
    dispatch(type, target) { listeners.get(type)?.({ target }) },
    listeners,
  }
}

test('experience entry reuses the shared card motion and focus completes its parent timeline only', () => {
  const h = harness()
  const items = [node(), node()]
  const list = node({ selectors: { '.experience-motion-item': items } })
  const summary = node()
  list.contains = target => target === summary
  const root = node({ selectors: { '.timeline': [list] } })
  const cleanup = h.createPortfolioMotion(root, false)
  h.calls.triggers[0].onEnter()
  const timeline = h.calls.timelines[0]
  assert.equal(timeline.steps[0][1].y, 72)
  assert.equal(timeline.steps[0][1].scaleY, 0.92)
  assert.equal(timeline.steps[0][2].duration, h.MOTION.card)
  assert.equal(timeline.steps[0][2].ease, 'power4.out')
  assert.equal(timeline.steps[2][3], h.MOTION.stagger)
  assert.equal(timeline.steps[1][2].clearProps, 'clipPath')
  h.calls.contexts.forEach(context => {
    context.getTweens = () => { throw new Error('Do not replay fromTo startAt tweens on experience focus') }
  })
  root.dispatch('focusin', summary)
  assert.equal(timeline.progressValue, 1)
  root.dispatch('pointerdown', summary)
  root.dispatch('focusin', summary)
  h.calls.triggers[0].onEnterBack()
  assert.equal(h.calls.timelines.length, 1, 'repeat toggles and re-entry never restart the entrance')
  cleanup()
  assert.equal(root.listeners.size, 0)
  assert.ok(h.calls.contexts.every(context => context.reverted))
})

test('an experience pointer or keyboard interaction before entry cancels delayed hidden states', () => {
  for (const event of ['pointerdown', 'focusin']) {
    const h = harness()
    const list = node({ selectors: { '.experience-motion-item': [node()] } })
    const summary = node()
    list.contains = target => target === summary
    const root = node({ selectors: { '.timeline': [list] } })
    const cleanup = h.createPortfolioMotion(root, false)
    root.dispatch(event, summary)
    h.flush()
    h.calls.triggers[0].onEnter()
    h.calls.triggers[0].onEnterBack()
    assert.equal(h.calls.timelines.length, 0, event + ' must not be followed by a new reveal')
    cleanup()
  }
})

test('pointer interaction during experience entry settles the timeline before details resize', () => {
  const h = harness()
  const list = node({ selectors: { '.experience-motion-item': [node()] } })
  const summary = node()
  list.contains = target => target === summary
  const root = node({ selectors: { '.timeline': [list] } })
  const cleanup = h.createPortfolioMotion(root, false)
  h.calls.triggers[0].onEnter()
  root.dispatch('pointerdown', summary)
  assert.equal(h.calls.timelines[0].progressValue, 1)
  cleanup()
})

test('reduced motion creates no hidden state, observers, or tweens', () => {
  const h = harness()
  h.createPortfolioMotion(null, true)()
  h.createSequenceHeadingMotion(null, true)()
  assert.equal(h.calls.timelines.length, 0)
  assert.equal(h.calls.observers.length, 0)
})

test('opening word and curtain exit without waiting for the hero text', () => {
  const h = harness()
  const word = node()
  const curtain = node({ selectors: { '.opening-word': [word], '.opening-word > span': [node()], '.opening-panel': [node(), node()] } })
  const hero = node({ top: 0, bottom: 900 })
  const root = node({ selectors: { '#home': [hero], '.opening-scene': [curtain] } })
  const cleanup = h.createPortfolioMotion(root, false)
  const steps = h.calls.timelines[0].steps
  const wordExit = steps.find(step => step[0] === word)
  const curtainExit = steps.find(step => step[0] === curtain && step[1].visibility === 'hidden')
  assert.equal(wordExit[1].autoAlpha, 0, 'word becomes invisible at the end of its own exit')
  assert.ok(wordExit[2] + wordExit[1].duration <= curtainExit[2])
  assert.ok(curtainExit[2] < 2.05 + 1.05, 'overlay is gone before the later hero details finish')
  cleanup()
  assert.ok(h.calls.contexts.every(context => context.reverted))
})

test('jt opening also plays for a saved work link without animating the offscreen hero', () => {
  const h = harness('#ai-video')
  const word = node()
  const wordLine = node()
  const heroLine = node()
  const curtain = node({ selectors: { '.opening-word': [word], '.opening-word > span': [wordLine], '.opening-panel': [node(), node()] } })
  const hero = node({ top: -4000, bottom: -3200, selectors: { '.title-reveal > span': [heroLine] } })
  const root = node({ selectors: { '#home': [hero], '.opening-scene': [curtain] } })
  const cleanup = h.createPortfolioMotion(root, false)
  const steps = h.calls.timelines[0].steps
  assert.ok(steps.some(step => step[0] === wordLine), 'jt enters even when the URL has a work hash')
  assert.ok(steps.some(step => step[0] === word && step[1].autoAlpha === 0), 'jt still fades out')
  assert.ok(steps.some(step => step[0] === curtain && step[1].visibility === 'hidden'), 'the curtain always dismisses')
  assert.ok(!steps.some(step => Array.isArray(step[0]) && step[0].includes(heroLine)), 'offscreen hero does not animate')
  cleanup()
  assert.ok(h.calls.contexts.every(context => context.reverted))
})

test('headings animate only after entry, then every context is reverted', () => {
  const h = harness()
  const line = node()
  const heading = node({ top: 1200, bottom: 1450, selectors: { '.heading-line > span': [line] } })
  const root = node({ selectors: { '[data-motion-heading], .work-heading, .about-copy, .expertise-heading': [heading] } })
  const cleanup = h.createPortfolioMotion(root, false)
  assert.equal(h.calls.timelines.length, 0, 'untriggered headings remain readable')
  h.calls.triggers[0].onEnter()
  const timeline = h.calls.timelines[0]
  assert.ok(timeline.played)
  assert.equal(timeline.steps[0][1].yPercent, 125)
  assert.equal(timeline.steps[0][1].scaleY, 0.38)
  assert.equal(timeline.steps[0][2].scaleY, 1)
  assert.equal(timeline.steps[0][2].ease, 'expo.out')
  cleanup()
  assert.ok(h.calls.contexts.every(context => context.reverted))
  assert.ok(h.calls.observers.every(observer => observer.disconnected))
})

test('gallery animates its heading only, never its artwork or grid', () => {
  const h = harness()
  const line = node()
  const header = node({ selectors: { '.heading-line > span': [line] } })
  const cleanup = h.createSequenceHeadingMotion(header, false)
  const observer = h.calls.observers[0]
  assert.equal(observer.nodes.size, 1)
  assert.ok(observer.nodes.has(header))
  observer.callback([{ target: header, isIntersecting: true }])
  const timeline = h.calls.timelines[0]
  assert.equal(timeline.steps[0][0][0], line)
  assert.doesNotMatch(source, /select\(root, '\.category-grid/)
  assert.doesNotMatch(source, /\.gallery-image-button|\.sequence-track|\.long-page-viewport/)
  cleanup()
  assert.ok(observer.disconnected)
})

test('project grids use normal flow while the IP keeps its orbit', () => {
  const grid = readFileSync(new URL('../src/components/ProjectGrid.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/components/project-grid.css', import.meta.url), 'utf8')
  const gallery = readFileSync(new URL('../src/components/WorkGallery.jsx', import.meta.url), 'utf8')
  const ip = readFileSync(new URL('../src/components/IPShowcase.jsx', import.meta.url), 'utf8')
  assert.match(grid, /items\.map/)
  assert.doesNotMatch(grid, /sequencePosition|onPointer|sequence-pin|trackRef|ResizeObserver/)
  assert.doesNotMatch(css, /position:\s*sticky|will-change:\s*transform|overflow:\s*clip/)
  const longCard = gallery.slice(gallery.indexOf('function LongPageCard'), gallery.indexOf('function MediaViewer'))
  assert.doesNotMatch(longCard, /useDragScroll|onScroll|progress|ResizeObserver/)
  assert.match(gallery, /name=\{group\.characterName\} label=\{group\.characterLabel\} reduced=\{reduced\}/)
  assert.match(ip, /useIPOrbit\(items\.length, reduced\)/)
  assert.match(ip, /orbit\.handlers/)
})

test('offscreen and keyboard-focused cards do not run expensive reveals', () => {
  const h = harness()
  const offscreen = node({ top: 1000, bottom: 1500 })
  const focused = node(); focused.contains = () => true
  h.revealContent([offscreen, focused])
  assert.equal(h.calls.timelines[0].steps.length, 0)
})

test('long previews keep image dragging and open the viewer only from a separate outline button', () => {
  const css = readFileSync(new URL('../src/components/homepage-project.css', import.meta.url), 'utf8')
  const gallery = readFileSync(new URL('../src/components/WorkGallery.jsx', import.meta.url), 'utf8')
  const preview = gallery.slice(gallery.indexOf('function LongPagePreviewCard'), gallery.indexOf('function LongPageCard'))
  assert.match(css, /\.homepage-preview-cover \{[^}]*overflow: hidden/)
  assert.match(css, /@media \(hover: none\) and \(pointer: coarse\)/)
  assert.match(css, /aspect-ratio: var\(--long-preview-ratio, 9 \/ 16\)/)
  assert.match(preview, /useDragScroll\(previewRef, \{ axis: 'y'/)
  assert.match(preview, /role="region" tabIndex=\{0\}/)
  assert.match(preview, /onKeyDown=\{onKeyDown\}/)
  const cover = preview.slice(preview.indexOf('<div ref={previewRef}'), preview.indexOf('<div className="homepage-preview-footer">'))
  assert.doesNotMatch(cover, /onClick=|onWheel|aria-haspopup|<button/)
  assert.match(preview, /<span className="sr-only" id=\{item.id \+ '-preview-title'\}>\{item.title\}<\/span>\s*<button type="button" className="homepage-preview-open" onClick=\{onOpen\} aria-haspopup="dialog"/)
  assert.match(preview, />点击查看大图<\/button>/)
  assert.match(gallery, /<LongPagePreviewCard[^>]*onOpen=\{\(\) => onOpen\(items, index, group.title\)\}/)
  assert.match(css, /\.homepage-preview-open \{[^}]*border: 1px solid var\(--text\);[^}]*background: transparent/)
  assert.match(gallery, /showCategoryAction && \(section\.previewRatio \? <span className="long-preview-hint"/)
  assert.match(gallery, /<span>点击图片拖动查看<\/span>/)
  assert.match(gallery, /className="long-preview-hint-icon"[^>]*aria-hidden="true"/)
  assert.match(css, /\.long-preview-hint \{[^}]*justify-self: end;[^}]*background: #080909;[^}]*color: #fff;[^}]*font-size: 14px;[^}]*font-weight: 600/)
  assert.match(css, /@media \(min-width: 701px\) \{\s*\.long-preview-hint \{[^}]*min-height: 52px;[^}]*padding: 13px 20px;[^}]*font-size: 16px/)
  const hint = gallery.slice(gallery.indexOf('section.previewRatio ? <span className="long-preview-hint"'), gallery.indexOf('</span> : <SkipProject'))
  assert.doesNotMatch(hint, /href=|onClick=|role="button"|tabIndex=/)
  assert.doesNotMatch(gallery, /long-preview-title-row|按住图片，上下拖动/)
  assert.doesNotMatch(css, /-webkit-text-stroke|-webkit-text-fill-color/)
})

test('all project headings and selected user works remain, with no global CSS hiding', async () => {
  const { gallerySections, sectionItems } = await import('../src/gallery-data.js')
  const gallery = readFileSync(new URL('../src/components/WorkGallery.jsx', import.meta.url), 'utf8')
  const motionCss = readFileSync(new URL('../src/motion.css', import.meta.url), 'utf8')
  assert.equal(gallerySections.length, 11)
  assert.equal(gallerySections.flatMap(sectionItems).filter(item => item.src).length, 106)
  const marketingIndex = gallerySections.findIndex(section => section.id === 'marketing-main')
  const marketing = gallerySections[marketingIndex]
  assert.equal(gallerySections[marketingIndex + 1].id, 'livestream-design')
  assert.equal(gallerySections[marketingIndex + 2].id, 'content-optimization')
  assert.equal(gallerySections[marketingIndex + 3].id, 'product-detail')
  assert.equal(gallerySections[marketingIndex + 4].id, 'homepage')
  assert.equal(gallerySections[marketingIndex + 5].id, 'ip-design')
  assert.equal(gallerySections[marketingIndex + 6].id, 'exhibition')
  assert.deepEqual(gallerySections.map(section => section.number), ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'])
  const details = gallerySections[marketingIndex + 3]
  assert.equal(details.title, '详情设计')
  assert.equal(details.previewRatio, '9:20')
  assert.equal(gallerySections[marketingIndex + 4].previewRatio, '9:16')
  assert.equal(details.items.filter(item => item.src && item.kind === 'long').length, 3)
  assert.deepEqual(details.items.map(item => item.ratio), ['790:22967', '1440:31255', '1440:36476'])
  assert.ok(details.items.every(item => item.src.startsWith('/works/product-detail/')))
  assert.match(gallery, /if \(group\.previewRatio && items\.length\)/)
  assert.equal(marketing.title, '营销主图设计')
  assert.equal(marketing.items.length, 6)
  assert.ok(marketing.items.every(item => item.src && item.kind === 'image' && item.ratio === '1:1'))
  assert.deepEqual(marketing.items.map(item => item.id), Array.from({ length: 6 }, (_, index) => 'marketing-main-0' + (index + 1)))
  const exhibition = gallerySections.find(section => section.id === 'exhibition').items
  assert.equal(exhibition.filter(item => item.src).length, 4)
  assert.deepEqual(exhibition.map(item => item.ratio), ['3508:2058', '4961:2910', '12500:6942', '12500:6942'])
  const homepages = gallerySections.find(section => section.id === 'homepage').items
  assert.equal(homepages.filter(item => item.src && item.kind === 'long').length, 3)
  assert.deepEqual(homepages.map(item => item.ratio), ['1200:5846', '1200:6381', '1200:5967'])
  assert.deepEqual(homepages.map(item => item.title), ['医疗器械 · 双11首页', '宝嘉力 · 3·8首页', '宝嘉力 · 京东618首页'])
  assert.match(gallery, /<div ref=\{previewRef\} className="homepage-preview-cover" role="region"/)
  assert.match(gallery, /renderItem=\{\(item, index\) => item\.kind === 'long'\s*\? <LongPageCard/)
  const squares = gallerySections[0].rows.find(row => row.id === 'creative-square').items
  assert.equal(squares.length, 18)
  assert.deepEqual(squares.slice(-3).map(item => item.id), ['creative-square-16', 'creative-square-17', 'creative-square-18'])
  const portraits = gallerySections[0].rows.find(row => row.id === 'creative-long').items
  assert.equal(portraits.length, 12)
  assert.deepEqual(portraits.slice(-3).map(item => item.id), ['creative-long-10', 'creative-long-11', 'creative-long-12'])
  assert.match(gallery, /\{section\.title\}/)
  assert.match(gallery, /\{section\.english\}/)
  assert.match(gallery, /className="category-number"/)
  assert.match(gallery, /\{section\.description\}/)
  assert.match(motionCss, /@media \(max-width:700px\)\s*\{[^}]*#about\.about-section \{ padding-top:72px; \}/)
  assert.doesNotMatch(motionCss, /\.motion-enabled/)
  assert.doesNotMatch(gallery, /网格总览|CreativeArchive/)
})
