import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gallerySections, sectionItems } from '../src/gallery-data.js'

const index = gallerySections.findIndex(section => section.id === 'offline-materials')
const section = gallerySections[index]
const manualCategory = section.rows[0]
const logoCategory = section.rows[1]
const packagingCategory = section.rows[2]
const racingCategory = section.rows[3]
const meizhiliLogo = logoCategory.collections[0]
const widarLogo = logoCategory.collections[1]
const logoItems = logoCategory.collections.flatMap(group => group.items)
const inositol = manualCategory.collections[0]
const sunseasons = manualCategory.collections[1]
const pages = [1, 2, 3, 5, 6, 11, 12, 25, 28]

test('offline materials contains its four design subcategories after exhibition design', () => {
  assert.equal(section.title, '线下物料设计')
  assert.equal(section.english, 'Print collateral design.')
  assert.equal(section.skipInCategoryHeading, true)
  assert.equal(gallerySections[index - 1].id, 'exhibition')
  assert.equal(gallerySections[index + 1].id, 'three-d')
  assert.equal(section.rows.length, 4)
  assert.equal(section.rows[0].id, 'product-manual')
  assert.equal(section.rows[0].title, '产品手册设计')
  assert.equal(section.rows[0].layout, 'image')
  assert.equal(section.rows[0].showSkip, false)
  assert.equal(section.rows[1].id, 'logo-design')
  assert.equal(section.rows[1].title, 'Logo设计')
  assert.equal(section.rows[1].layout, 'image')
  assert.equal(section.rows[1].equalImageHeight, undefined)
  assert.equal(section.rows[1].showSkip, false)
  assert.deepEqual(section.rows[1].collections.map(group => group.title), ['美之莉 Logo设计', '薇达 Logo设计'])
  assert.ok(section.rows[1].collections.every(group => group.hideCaptions === true))
  assert.equal(section.rows[2].id, 'packaging-design')
  assert.equal(section.rows[2].title, '包装设计')
  assert.equal(section.rows[2].layout, 'packaging-reveal')
  assert.equal(section.rows[2].showSkip, false)
  assert.equal(section.rows[3].id, 'china-gt-racing-design')
  assert.equal(section.rows[3].title, 'China GT项目赛车设计')
  assert.equal(section.rows[3].layout, 'image')
  assert.equal(section.rows[3].showSkip, false)
  assert.equal(section.rows[3].hideCaptions, true)
  assert.deepEqual(manualCategory.collections.map(group => group.title), ['肌醇产品手册', '宝嘉力产品手册'])
  assert.deepEqual(sectionItems(section), [...inositol.items, ...sunseasons.items, ...logoItems, ...packagingCategory.items, ...racingCategory.items])
  assert.equal(sectionItems(section).length, 31)
})

test('logo design contains the four original Meizhili and WIDAR works in display and viewer order', () => {
  assert.deepEqual(meizhiliLogo.items.map(item => item.id), ['logo-design-01', 'logo-design-02'])
  assert.deepEqual(widarLogo.items.map(item => item.id), ['logo-design-03', 'logo-design-04'])
  assert.deepEqual(logoItems.map(item => item.title), [
    '美之莉 · Logo结构研究', '美之莉 · Logo应用展示',
    '薇达 · Logo结构研究', '薇达 · Logo应用展示',
  ])
  assert.deepEqual(logoItems.map(item => item.ratio), ['4096:2304', '4096:2304', '4096:2304', '1672:941'])
  assert.ok(logoItems.every(item => item.kind === 'image' && item.alt))
  const expectedHashes = [
    '137c31b305c8a64217949683d3ddc83a5f39559d4a9b4a482ac1947ea6b113c7',
    '026a38477b73d49ccec385fb03c98e2825ce50bbb81e92e276e77e67c1d26d15',
    '1a3e421d1f065bc24265e5d4bf0efd3db0b030ece122426e4868b56c22066316',
    '0d132f1bf6a6bda87bc1b76802bbafb06fae3aeb2a0e0e474963fee1ae6ebaee',
  ]
  assert.deepEqual(logoItems.map(item => {
    const file = readFileSync(new URL('../public' + item.src, import.meta.url))
    return createHash('sha256').update(file).digest('hex')
  }), expectedHashes)
  const css = readFileSync(new URL('../src/components/project-grid.css', import.meta.url), 'utf8')
  assert.match(css, /#logo-design-sequence \.project-grid \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/)
})

test('offline materials keeps one skip action in the main category heading and none in its subcategory headings', () => {
  const component = readFileSync(new URL('../src/components/WorkGallery.jsx', import.meta.url), 'utf8')
  assert.match(component, /const showCategoryAction = skipInHeading \|\| section\.skipInCategoryHeading/)
  assert.match(component, /showCategoryAction && \(section\.previewRatio/)
  assert.ok(section.rows.every(group => group.showSkip === false))
})

test('packaging design keeps each original composite and exposes an automatic half-image reveal', () => {
  assert.deepEqual(packagingCategory.items.map(item => item.id), ['packaging-design-01', 'packaging-design-02'])
  assert.deepEqual(packagingCategory.items.map(item => item.ratio), ['5729:8023', '5729:8018'])
  assert.deepEqual(packagingCategory.items.map(item => item.splitY), [4012, 4000])
  assert.ok(packagingCategory.items.every(item => item.kind === 'image' && item.draftAlt && item.renderAlt))
  const expectedHashes = [
    '7a18c98063df6974a223edbd4a093c54e3f41babb5fffc1e816e39fc40de5097',
    '460d4d0f54e3ee7c5b99665dd3b53d666ec7e38641c674e41db056a5eb0f8a8c',
  ]
  assert.deepEqual(packagingCategory.items.map(item => {
    const file = readFileSync(new URL('../public' + item.src, import.meta.url))
    return createHash('sha256').update(file).digest('hex')
  }), expectedHashes)
  const component = readFileSync(new URL('../src/components/PackagingReveal.jsx', import.meta.url), 'utf8')
  const blur = readFileSync(new URL('../src/components/ShapeBlur.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/components/packaging-reveal.css', import.meta.url), 'utf8')
  const galleryCss = readFileSync(new URL('../src/components/work-gallery.css', import.meta.url), 'utf8')
  assert.match(component, /点击渲染3d效果图/)
  assert.match(component, /const ShapeBlur = lazy\(loadShapeBlur\)/)
  assert.match(component, /<ShapeBlur[^>]*duration=\{TRANSITION_DURATION - 50\}/)
  assert.match(component, /requestAnimationFrame\(\(\) => setRendered\(true\)\)/)
  assert.match(component, /const panelHeight = Math\.min\(split, height - split\)/)
  assert.match(component, /aspectRatio: metrics\.panelAspect/)
  assert.doesNotMatch(component, /aspectRatio: rendered \?/)
  assert.match(component, /new IntersectionObserver\(entries =>/)
  assert.match(component, /threshold: 0\.55/)
  assert.match(component, /packaging-render-button\$\{buttonEntered \? ' is-entered' : ''\}/)
  assert.match(component, /aria-haspopup="dialog"/)
  assert.match(component, /onOpen=\{index => onOpen\(items, index, group\.title\)\}/)
  assert.match(component, /packaging-view-icon/)
  assert.match(blur, /import \* as THREE from 'three'/)
  assert.match(blur, /const eased = 1 - Math\.pow\(1 - progress, 3\)/)
  assert.match(css, /\.packaging-reveal-render > img \{\s*top: 0;\s*transform: translateY\(var\(--packaging-render-offset\)\);/)
  assert.match(css, /\.packaging-reveal-card\.is-rendered \.packaging-reveal-render \{[^}]*opacity: 1;/)
  assert.match(css, /@keyframes packaging-render-button-pop \{[^}]*scale\(\.88\)/)
  assert.match(css, /42% \{ transform: scale\(1\.075\); \}/)
  assert.match(css, /\.packaging-reveal-stage \{[^}]*cursor: zoom-in;/)
  assert.match(galleryCss, /:is\(\.gallery-card, \.homepage-preview-card, \.long-page-card, \.packaging-reveal-card\):hover/)
  assert.match(galleryCss, /\.packaging-reveal-card\):hover,[\s\S]*transform: scale\(1\.04\)/)
})

test('China GT racing design contains the four supplied originals in viewer order', () => {
  assert.deepEqual(racingCategory.items.map(item => item.id), [
    'china-gt-racing-01', 'china-gt-racing-02', 'china-gt-racing-03', 'china-gt-racing-04',
  ])
  assert.ok(racingCategory.items.every(item => item.kind === 'image' && item.ratio === '5504:3072' && item.alt))
  const expectedHashes = [
    'ccaf070baf8204cfdecd868edfd79b72d4457de5b7f22d0f9775adcacfb8ae64',
    '84f9077ad01ad2504ee1a6cfc030fc963e7b8d20d7b9099b5c9fb22325905d90',
    'cde7da8597561cf5a0dd172f9a6c5e44b881c11cbd3fd3b7504a0c3b955c7487',
    '7379e285e21dddd1dfe4ab19b518d306fe06a3a61c2e4335a356869b67e63641',
  ]
  assert.deepEqual(racingCategory.items.map(item => {
    const file = readFileSync(new URL('../public' + item.src, import.meta.url))
    return createHash('sha256').update(file).digest('hex')
  }), expectedHashes)
  const css = readFileSync(new URL('../src/components/project-grid.css', import.meta.url), 'utf8')
  assert.match(css, /#china-gt-racing-design-sequence \.project-grid \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/)
})

test('manual shows the nine retained pages once, excluding the three PART pages and portrait introduction', () => {
  const items = inositol.items
  assert.equal(items.length, 9)
  assert.deepEqual(items.map(item => item.id), pages.map(page => 'product-manual-' + String(page).padStart(2, '0')))
  const hashes = items.map((item, index) => {
    assert.equal(item.src, '/works/product-manual/inositol-' + String(pages[index]).padStart(2, '0') + '.png')
    assert.equal(item.kind, 'image')
    assert.equal(item.ratio, '6000:3375')
    const file = readFileSync(new URL('../public' + item.src, import.meta.url))
    assert.equal(file.subarray(1, 4).toString(), 'PNG')
    assert.equal(file.readUInt32BE(16), 6000)
    assert.equal(file.readUInt32BE(20), 3375)
    return createHash('sha256').update(file).digest('hex')
  })
  assert.equal(new Set(hashes).size, 9)
  assert.equal(sectionItems(section).filter(item => !item.src).length, 0)
})

test('inositol swaps only the closing and awards pages in the mosaic and viewer order', () => {
  assert.deepEqual(inositol.featuredIds, [1, 2, 3, 5, 6, 11, 12, 28, 25].map(page => 'product-manual-' + String(page).padStart(2, '0')))
  const items = inositol.featuredIds.map(id => inositol.items.find(item => item.id === id))
  assert.equal(new Set(items).size, inositol.items.length)
  assert.equal(items[0].id, 'product-manual-01')
  assert.equal(items[7].id, 'product-manual-28')
  assert.equal(items[8].id, 'product-manual-25')
  for (const page of ['04', '07', '08', '09']) {
    assert.ok(!items.some(item => item.id === 'product-manual-' + page))
    // Removing a work from the gallery must not delete its recoverable source asset.
    assert.ok(readFileSync(new URL('../public/works/product-manual/inositol-' + page + '.png', import.meta.url)).length > 0)
  }
})

test('manual uses a caption-free mosaic with full-ratio images and keeps accessible names', () => {
  for (const group of manualCategory.collections) {
    assert.equal(group.frameRatio, undefined)
    assert.equal(group.previewRatio, undefined)
    assert.equal(group.equalImageHeight, undefined)
    assert.equal(group.gridLayout, 'mosaic')
    assert.equal(group.hideCaptions, true)
    assert.ok(group.items.every(item => item.title && item.alt))
  }
  assert.ok(gallerySections.filter(item => item.id !== section.id).every(item => !item.hideCaptions && !item.rows?.some(row => row.hideCaptions)))
  const css = readFileSync(new URL('../src/components/project-grid.css', import.meta.url), 'utf8')
  assert.match(css, /\.project-grid\.project-grid-mosaic[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css, /\.project-grid-mosaic[^}]*nth-child\(12n \+ 8\)[^}]*grid-column:span 2;[^}]*grid-row:span 2;/)
  assert.match(css, /\.project-cell:last-child:nth-child\(12n \+ 1\)[^}]*grid-column:1 \/ -1/)
  assert.match(css, /\.project-grid \.gallery-image-button > img[^}]*object-fit:contain/)
  const component = readFileSync(new URL('../src/components/WorkGallery.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(component, /<div className="gallery-caption"><span>\{item\.title\}<\/span><\/div>/)
  assert.match(component, /group.collections.map\(collection => <section/)
  assert.match(component, /<GuidedProject group=\{collection\}/)
})

test('Sun Seasons swaps only the product introduction and data chart in display and viewer order', () => {
  assert.deepEqual(sunseasons.featuredIds, [1, 2, 3, 5, 6, 7, 9, 8, 13, 14, 16, 25].map(page => 'sunseasons-manual-' + String(page).padStart(2, '0')))
  const items = sunseasons.featuredIds.map(id => sunseasons.items.find(item => item.id === id))
  assert.ok(items.every(Boolean))
  assert.equal(new Set(items).size, sunseasons.items.length)
  assert.equal(items[6].title, '宝嘉力产品手册 · 数据图表')
  assert.equal(items[7].title, '宝嘉力产品手册 · 产品简介')
})

test('Sun Seasons manual contains exactly the 12 supplied source pages in original page order', () => {
  const pages = [1, 2, 3, 5, 6, 7, 8, 9, 13, 14, 16, 25]
  assert.equal(sunseasons.id, 'sunseasons-manual')
  assert.equal(sunseasons.items.length, 12)
  assert.deepEqual(sunseasons.items.map(item => item.id), pages.map(page => 'sunseasons-manual-' + String(page).padStart(2, '0')))
  const hashes = sunseasons.items.map((item, index) => {
    assert.equal(item.src, '/works/sunseasons-manual/sunseasons-' + String(pages[index]).padStart(2, '0') + '.png')
    const file = readFileSync(new URL('../public' + item.src, import.meta.url))
    assert.equal(file.subarray(1, 4).toString(), 'PNG')
    const dimensions = [file.readUInt32BE(16), file.readUInt32BE(20)]
    assert.deepEqual(dimensions, [8054, pages[index] === 9 ? 4533 : 4530])
    assert.equal(item.ratio, dimensions.join(':'))
    assert.equal(item.kind, 'image')
    return createHash('sha256').update(file).digest('hex')
  })
  assert.equal(new Set(hashes).size, 12)
  assert.equal(new Set(sectionItems(section).map(item => item.id)).size, 31)
})
