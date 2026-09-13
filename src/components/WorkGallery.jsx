import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { gallerySections, sectionItems } from '../gallery-data'
import { videoPoster } from '../media-preview'
import { isMobilePreviewDevice } from '../preview-loading'
import PreviewImage from './PreviewImage'
import useDragScroll from '../useDragScroll'
import { createHintBounceMotion } from '../motion/hintBounce'
import Dialog from './Dialog'
import RevealText from './RevealText'
import IPShowcase from './IPShowcase'
import PackagingReveal from './PackagingReveal'
import ProjectGrid, { SkipProject } from './ProjectGrid'
import ZoomableImage from './ZoomableImage'
import './work-gallery.css'
import './homepage-project.css'

const ImagePreviewContext = createContext(true)

function Icon({ direction = 'right', expand = false, play = false }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {play ? <path d="m9 5 11 7-11 7V5Z" fill="currentColor" /> : <path d={expand ? 'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5' : direction === 'left' ? 'M20 12H4m6-6-6 6 6 6' : 'M4 12h16m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.4" />}
  </svg>
}

function Placeholder({ item, index = 0, large = false, failed = false }) {
  return <div className={'media-placeholder ' + (item.kind === 'video' ? 'placeholder-video ' : '') + (large ? 'placeholder-large' : '')}>
    <div className="placeholder-top"><span aria-hidden="true">+</span><span>{item.kind === 'video' ? 'MOTION' : item.kind === 'long' ? 'VERTICAL' : 'STILL IMAGE'} / {String(index + 1).padStart(2, '0')}</span></div>
    <div className="placeholder-center">{item.kind === 'video' ? <span className="placeholder-play"><Icon play /></span> : <span className="placeholder-number">{String(index + 1).padStart(2, '0')}</span>}<span>{failed ? '素材暂时无法加载' : item.kind === 'video' ? '视频待放入' : '作品待放入'}</span></div>
    <div className="placeholder-bottom"><span>{failed ? '请检查素材文件' : 'RESERVED FOR YOUR WORK'}</span><span>{item.ratio}</span></div>
  </div>
}

function LongPlaceholder({ item }) {
  return <div className="long-placeholder">
    <div className="long-placeholder-cover"><span className="micro-label">LONG PAGE / PREVIEW</span><span className="long-placeholder-name">{item.title}</span><span className="long-placeholder-sub">完整长图预留位置</span></div>
  </div>
}

function MediaCard({ item, index, onOpen, className = '', preserveRatio = false, frameRatio = '' }) {
  const allowImagePreview = useContext(ImagePreviewContext)
  const canOpen = item.kind === 'video' || allowImagePreview
  const Surface = canOpen ? 'button' : 'div'
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [item.src, item.poster])
  const real = item.src && !failed
  const poster = item.kind === 'video' ? videoPoster(item) : ''
  const displayRatio = frameRatio || (preserveRatio ? item.ratio : '')
  return <article className={'gallery-card kind-' + item.kind + ' ' + className} data-frame-ratio={frameRatio || undefined} data-preview-fit={item.previewFit || undefined}>
    <Surface className="gallery-image-button" style={displayRatio ? { aspectRatio: displayRatio.replace(':', ' / ') } : undefined} onClick={canOpen ? onOpen : undefined} aria-label={canOpen ? (item.kind === 'video' ? '播放或查看' : '放大查看') + item.title : undefined}>
      {real ? item.kind === 'video' && !poster ? <video src={item.src} preload="none" muted playsInline onError={() => setFailed(true)} tabIndex={-1} /> : <PreviewImage src={poster || item.src} alt={item.alt || item.title} draggable="false" onError={() => setFailed(true)} /> : <Placeholder item={item} index={index} failed={failed} />}
      {canOpen && <span className={'gallery-view-icon ' + (real && item.kind === 'video' ? 'real-video-play' : '')}><Icon play={item.kind === 'video'} expand={item.kind !== 'video'} /></span>}
    </Surface>
  </article>
}


export function GuidedProject({ group, nextId, nextTitle, onOpen, reduced, skipInHeading = false }) {
  const allowImagePreview = useContext(ImagePreviewContext)
  if (group.collections) return <ProjectGrid id={group.id + '-sequence'} title={group.title} nextId={nextId} nextTitle={nextTitle} reduced={reduced} showSkip={group.showSkip !== false}>
    {group.collections.map(collection => <section className="project-collection" id={collection.id} key={collection.id} aria-labelledby={collection.id + '-title'}>
      <h5 id={collection.id + '-title'}>{collection.title}</h5>
      <GuidedProject group={collection} nextId={nextId} nextTitle={nextTitle} onOpen={onOpen} reduced={reduced} skipInHeading />
    </section>)}
  </ProjectGrid>
  if (group.layout === 'ip-showcase') return <IPShowcase items={group.items} name={group.characterName} label={group.characterLabel} reduced={reduced} />
  if (group.layout === 'packaging-reveal') {
    const items = group.items.filter(item => item.src)
    return <ProjectGrid id={group.id + '-sequence'} title={group.title} nextId={nextId} nextTitle={nextTitle} reduced={reduced}
      showHeading={!skipInHeading} showSkip={group.showSkip !== false} labelledBy={group.id + '-title'}>
      <PackagingReveal items={items} reduced={reduced} allowImagePreview={allowImagePreview} onOpen={index => onOpen(items, index, group.title)} />
    </ProjectGrid>
  }
  const actual = group.items.filter(item => item.src)
  const featured = (group.featuredIds || []).map(id => actual.find(item => item.id === id)).filter(Boolean)
  const items = [...featured, ...actual.filter(item => !group.featuredIds?.includes(item.id))]
  if (group.previewRatio && items.length) return <div className="homepage-project" style={{ '--long-preview-ratio': group.previewRatio.replace(':', ' / ') }}>
    <div className="homepage-preview-grid">{items.map((item, index) => <LongPagePreviewCard key={item.id} item={item} index={index} hintId={group.id + '-drag-hint'} onOpen={() => onOpen(items, index, group.title)} />)}</div>
  </div>
  if (!items.length) return <>
    {!skipInHeading && <div className="empty-project-header"><SkipProject nextId={nextId} nextTitle={nextTitle} /></div>}
    <div className={'category-grid grid-' + group.layout}>{group.items.map((item, index) => group.layout === 'long-page' ? <LongPageCard key={item.id} item={item} onOpen={() => onOpen(group.items, index, group.title)} /> : <MediaCard key={item.id} item={item} index={index} onOpen={() => onOpen(group.items, index, group.title)} />)}</div>
  </>
  return <ProjectGrid id={group.layout === 'featured-creative' ? group.id : group.id + '-sequence'} title={group.title} items={items} nextId={nextId} nextTitle={nextTitle} reduced={reduced}
    showHeading={!skipInHeading} showSkip={group.showSkip !== false} labelledBy={group.id + '-title'} equalImageHeight={group.equalImageHeight} gridLayout={group.gridLayout}
    renderItem={(item, index) => item.kind === 'long'
      ? <LongPageCard item={item} onOpen={() => onOpen(items, index, group.title)} />
      : <MediaCard frameRatio={group.frameRatio} preserveRatio={/^\d+:\d+$/.test(item.ratio)} item={item} index={index} onOpen={() => onOpen(items, index, group.title)} />} />
}


function LongPagePreviewCard({ item, index, hintId, onOpen }) {
  const allowImagePreview = useContext(ImagePreviewContext)
  const [failed, setFailed] = useState(false)
  const previewRef = useRef(null)
  const dragHandlers = useDragScroll(previewRef, { axis: 'y', enabled: !failed })
  useEffect(() => {
    setFailed(false)
    if (previewRef.current) previewRef.current.scrollTop = 0
  }, [item.src])
  const onKeyDown = event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target !== event.currentTarget) return
    const node = event.currentTarget
    const targets = {
      ArrowUp: node.scrollTop - 60,
      ArrowDown: node.scrollTop + 60,
      PageUp: node.scrollTop - node.clientHeight * 0.85,
      PageDown: node.scrollTop + node.clientHeight * 0.85,
      Home: 0,
      End: node.scrollHeight - node.clientHeight,
    }
    if (!(event.key in targets)) return
    event.preventDefault()
    node.scrollTop = targets[event.key]
  }
  return <article className="homepage-preview-card">
    <div ref={previewRef} className="homepage-preview-cover" role="region" tabIndex={0} aria-labelledby={item.id + '-preview-title'} aria-describedby={hintId} aria-description="按住鼠标上下拖动，或使用上下方向键、PageUp、PageDown、Home、End 浏览长图。" {...dragHandlers} onKeyDown={onKeyDown}>
      {failed ? <Placeholder item={item} index={index} failed /> : <PreviewImage src={item.src} alt={item.title + '，长图预览'} draggable="false" onError={() => setFailed(true)} />}
    </div>
    {allowImagePreview ? <div className="homepage-preview-footer">
      <span className="sr-only" id={item.id + '-preview-title'}>{item.title}</span>
      <button type="button" className="homepage-preview-open" onClick={onOpen} aria-haspopup="dialog" aria-label={'点击查看大图：' + item.title}>点击查看大图</button>
    </div> : <span className="sr-only" id={item.id + '-preview-title'}>{item.title}</span>}
  </article>
}


function LongPageCard({ item, onOpen }) {
  const allowImagePreview = useContext(ImagePreviewContext)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [item.src])
  return <article className="long-page-card">
    <div className="long-page-toolbar"><span><i aria-hidden="true" /> {item.title}</span>{allowImagePreview && <button onClick={onOpen} aria-label={'放大查看' + item.title}><Icon expand /></button>}</div>
    <div className="long-page-viewport">
      {item.src && !failed ? <PreviewImage src={item.src} alt={item.alt || item.title} draggable="false" onError={() => setFailed(true)} /> : failed ? <Placeholder item={item} failed /> : <LongPlaceholder item={item} />}
    </div>
    <div className="gallery-caption"><span>{failed ? '素材加载失败，显示长图占位' : item.src ? '完整页面' : '长图预留位置'}</span></div>
  </article>
}

function MediaViewer({ viewer, onClose }) {
  const [index, setIndex] = useState(viewer.index)
  const [failed, setFailed] = useState(false)
  const playerRef = useRef(null)
  const item = viewer.items[index]
  const change = delta => { setIndex(current => Math.max(0, Math.min(viewer.items.length - 1, current + delta))); setFailed(false) }
  useEffect(() => {
    const player = playerRef.current
    if (!player) return undefined
    const playImmediately = () => {
      const playback = player.play()
      playback?.catch(() => {
        player.muted = true
        player.play().catch(() => {})
      })
    }
    if (player.readyState >= 2) playImmediately()
    else player.addEventListener('loadeddata', playImmediately, { once: true })
    return () => {
      player.removeEventListener('loadeddata', playImmediately)
      player.pause()
    }
  }, [index, item.kind])
  const onKeyDown = event => {
    if (event.target.closest('input, video') || event.currentTarget.querySelector('.viewer-media[data-pannable="true"]') || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'ArrowLeft') { event.preventDefault(); change(-1) }
    if (event.key === 'ArrowRight') { event.preventDefault(); change(1) }
  }
  return <Dialog className="media-lightbox" labelId="media-viewer-title" onClose={onClose} onKeyDown={onKeyDown} showClose={false} animated>{({ requestClose }) => <>
    <div className="viewer-header"><h2 id="media-viewer-title" title={item.title} aria-live="polite">{item.title}</h2><button className="viewer-close" onClick={requestClose} aria-label="关闭大图预览" autoFocus>关闭 <span aria-hidden="true">×</span></button></div>
    {item.src && !failed && item.kind !== 'video' ? <ZoomableImage key={item.id} item={item} onError={() => setFailed(true)} /> : <div className="viewer-media" key={item.id} tabIndex={0} aria-label="作品预览">
      {!item.src || failed ? item.kind === 'long' && !failed ? <LongPlaceholder item={item} /> : <Placeholder item={item} index={index} large failed={failed} /> : <video ref={playerRef} src={item.src} poster={videoPoster(item) || undefined} controls autoPlay playsInline preload="auto" onError={() => setFailed(true)} />}
    </div>}
  </>}</Dialog>
}

export default function WorkGallery({ reduced }) {
  const [allowImagePreview, setAllowImagePreview] = useState(() => !isMobilePreviewDevice())
  const galleryRef = useRef(null)
  const [viewer, setViewer] = useState(null)
  const [active, setActive] = useState(gallerySections[0].id)
  const indexRef = useRef(null)
  const indexDragHandlers = useDragScroll(indexRef)
  useEffect(() => {
    const media = window.matchMedia('(hover: none) and (pointer: coarse)')
    const update = () => {
      setAllowImagePreview(!media.matches)
      if (media.matches) setViewer(current => current && current.items[current.index]?.kind !== 'video' ? null : current)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const cleanups = Array.from(galleryRef.current.querySelectorAll('.long-preview-hint'), hint => createHintBounceMotion(hint, reduced))
    return () => cleanups.forEach(cleanup => cleanup())
  }, [reduced])
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id) })
    }, { rootMargin: '-180px 0px -50% 0px' })
    document.querySelectorAll('.work-category').forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])
  const onOpen = (items, index, title) => {
    if (isMobilePreviewDevice()) {
      if (items[index]?.kind !== 'video') return
      const videos = items.filter(item => item.kind === 'video')
      setViewer({ items: videos, index: videos.indexOf(items[index]), title })
      return
    }
    setViewer({ items, index, title })
  }
  const actualCount = gallerySections.flatMap(sectionItems).filter(item => item.src).length
  return <ImagePreviewContext.Provider value={allowImagePreview}><section ref={galleryRef} id="work" className="work-section section gallery-section" aria-labelledby="work-title">
    <div className="shell">
      <h2 id="work-title" className="sr-only">精选作品</h2>
      {actualCount === 0 && <p className="gallery-intro-note"><span className="status-dot" /> 作品位置已预留，等待真实创作入场。</p>}
      <nav ref={indexRef} className="work-index direct-scroll" aria-label="作品分类导航，可左右拖动" {...indexDragHandlers}>{gallerySections.map(section => <a href={'#' + section.id} key={section.id} aria-current={active === section.id ? 'location' : undefined}>{section.title}</a>)}</nav>
      <div className="work-categories">{gallerySections.map((section, sectionIndex) => {
        const nextSection = gallerySections[sectionIndex + 1] || { id: 'expertise', title: '设计能力' }
        const skipInHeading = !section.rows && section.layout !== 'ip-showcase'
        const showCategoryAction = skipInHeading || section.skipInCategoryHeading
        return <section id={section.id} key={section.id} className={'work-category category-' + section.layout} aria-labelledby={section.id + '-title'}>
          <div className="category-heading" data-motion-heading>
            <span className="category-number">/{section.number}</span>
            <div className={'category-titles' + (showCategoryAction ? ' category-titles-with-action' : '')}>
              <p className="category-english"><RevealText>{section.english}</RevealText></p>
              <h3 id={section.id + '-title'}><RevealText>{section.title}</RevealText></h3>
              {showCategoryAction && (section.previewRatio ? <span className="long-preview-hint" id={section.id + '-drag-hint'}>
                <span>点击图片拖动查看</span>
                <svg className="long-preview-hint-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                  <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span> : <SkipProject nextId={nextSection.id} nextTitle={nextSection.title} />)}
            </div>
            <p className="category-description">{section.description}</p>
          </div>
          {(section.rows || [section]).map((group, groupIndex) => {
            const next = section.rows?.[groupIndex + 1] || nextSection
            return <GuidedProject key={group.id} group={group} nextId={next.id} nextTitle={next.title} onOpen={onOpen} reduced={reduced} skipInHeading={skipInHeading} />
          })}
        </section>
      })}</div>
      <div className="gallery-end"><a href="#work">回到作品目录 ↑</a></div>
    </div>
    {viewer && <MediaViewer viewer={viewer} onClose={() => setViewer(null)} />}
  </section></ImagePreviewContext.Provider>
}
