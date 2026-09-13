import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const MOTION = Object.freeze({ title: 1.65, card: 1.25, stagger: 0.16, ease: 'expo.out' })
const REST = 'transform,transformOrigin,opacity,visibility,clipPath,willChange'
const select = (root, selector) => Array.from(root.querySelectorAll(selector))

function titleEntrance(node) {
  const lines = select(node, '.heading-line > span')
  const details = select(node, '.category-number, .category-description')
  const timeline = gsap.timeline({ paused: true })
  if (lines.length) timeline.fromTo(lines,
    { yPercent: 125, xPercent: -4, scaleY: 0.38, scaleX: 1.12, skewY: 7, transformOrigin: '0% 100%', willChange: 'transform' },
    { yPercent: 0, xPercent: 0, scaleY: 1, scaleX: 1, skewY: 0, duration: MOTION.title, stagger: 0.18, ease: MOTION.ease, clearProps: REST }, 0)
  else timeline.fromTo(node, { y: 64, clipPath: 'inset(0% 0% 100% 0%)' },
    { y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: MOTION.ease, clearProps: REST }, 0)
  if (details.length) timeline.fromTo(details, { y: 22, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.95, stagger: 0.08, ease: 'power3.out', clearProps: REST }, 0.52)
  return timeline
}

export function revealContent(cards, delay = 0) {
  const timeline = gsap.timeline({ delay })
  const visibleCards = cards.filter(card => {
    const rect = card.getBoundingClientRect()
    return rect.top < innerHeight && rect.bottom > 0 && !card.contains(document.activeElement)
  })
  visibleCards.forEach((card, index) => {
    const at = index * MOTION.stagger
    const frame = card.querySelector('.portrait-frame')
    timeline.fromTo(card,
      { y: 72, scaleY: 0.92, transformOrigin: '50% 100%', willChange: 'transform' },
      { y: 0, scaleY: 1, duration: MOTION.card, ease: 'power4.out', clearProps: REST }, at)
    if (frame) timeline.fromTo(frame, { clipPath: 'inset(0% 0% 100% 0%)', willChange: 'clip-path' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power4.inOut', clearProps: 'clipPath,willChange' }, at)
    else timeline.fromTo(card, { clipPath: 'inset(0% 0% 100% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut', clearProps: 'clipPath' }, at)
  })
  return timeline
}

// Only the group title enters. Artwork and the native scrolling track stay untouched.
export function createSequenceHeadingMotion(header, reduced) {
  if (reduced || typeof IntersectionObserver === 'undefined') return () => {}
  const context = gsap.context(() => {}, header)
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      observer.unobserve(entry.target)
      context.add(() => titleEntrance(header).play())
    }
  }, { threshold: 0.04, rootMargin: '0px 0px -18px 0px' })
  observer.observe(header)
  return () => {
    observer.disconnect()
    context.revert()
  }
}

function createOpening(root) {
  const hero = root.querySelector('#home')
  const curtain = root.querySelector('.opening-scene')
  if (!hero || !curtain) return () => {}
  let played = false
  let timeline
  const context = gsap.context(() => {}, hero)
  const play = () => {
    if (played) return
    const animateHero = ['', '#home'].includes(location.hash) && hero.getBoundingClientRect().bottom >= innerHeight * 0.6
    played = true
    context.add(() => {
      gsap.set(curtain, { visibility: 'visible' })
      timeline = gsap.timeline({ onComplete: () => gsap.set(curtain, { visibility: 'hidden' }) })
      timeline.fromTo(curtain.querySelector('.opening-word > span'),
        { yPercent: 120, scaleY: 0.25, transformOrigin: '50% 100%' },
        { yPercent: 0, scaleY: 1, duration: 1.05, ease: 'expo.out' }, 0)
        .to(curtain.querySelector('.opening-word'), { yPercent: -140, autoAlpha: 0, duration: 0.9, ease: 'power4.inOut' }, 0.55)
        .fromTo(select(curtain, '.opening-panel'), { yPercent: 0 },
          { yPercent: -102, duration: 1.65, stagger: 0.14, ease: 'power4.inOut' }, 0.65)
        // Dismiss the overlay when both panels finish, not when the later hero text finishes.
        .set(curtain, { visibility: 'hidden' }, 0.65 + 1.65 + 0.14)
      // The jt entrance belongs to page entry, even when a saved link opens a work category.
      // Only animate the hero itself when the visitor is actually starting at the top.
      if (!animateHero) return
      timeline.fromTo(select(hero, '.title-reveal > span'),
          { yPercent: 130, xPercent: -6, scaleY: 0.3, scaleX: 1.12, skewY: 8, transformOrigin: '0% 100%' },
          { yPercent: 0, xPercent: 0, scaleY: 1, scaleX: 1, skewY: 0, duration: 1.9, stagger: 0.22, ease: 'expo.out', clearProps: REST }, 1.15)
      const character = hero.querySelector('.hero-character')
      if (character) timeline.fromTo(character,
        { clipPath: 'inset(100% 0% 0% 0%)', xPercent: 8, scale: 0.94 },
        { clipPath: 'inset(0% 0% 0% 0%)', xPercent: 0, scale: 1, duration: 1.85, ease: 'power4.inOut', clearProps: REST }, 0.85)
      const details = select(hero, '.hero-eyebrow, .hero-label, .hero-description, .hero-cta, .hero-bottom')
      timeline.fromTo(details, { y: 35, clipPath: 'inset(0% 0% 100% 0%)' },
        { y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.05, stagger: 0.09, ease: 'power3.out', clearProps: REST }, 2.05)
      timeline.fromTo(select(root, '.header-inner > *'), { y: -24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, stagger: 0.08, ease: 'power3.out', clearProps: REST }, 1.8)
    })
  }
  const onNavigate = () => {
    if (location.hash && location.hash !== '#home') timeline?.progress(1)
    else play()
  }
  const onFocus = () => timeline?.progress(1)
  play()
  window.addEventListener('hashchange', onNavigate)
  hero.addEventListener('focusin', onFocus)
  return () => {
    window.removeEventListener('hashchange', onNavigate)
    hero.removeEventListener('focusin', onFocus)
    context.revert()
    curtain.style.visibility = ''
  }
}

export function createPortfolioMotion(root, reduced) {
  if (reduced) return () => {}
  const scenes = new Map()
  const experienceEntrances = new Map()
  let disposed = false
  let refreshCall
  let scanCall
  const openingCleanup = createOpening(root)
  const register = (node, build) => {
    if (scenes.has(node) || node.closest('.ip-showcase, .project-group, dialog')) return
    let context = gsap.context(() => {}, node)
    try {
      context.add(() => build(node))
      scenes.set(node, context)
    } catch (error) {
      context.revert()
      console.warn('Motion fallback: content remains visible.', error)
    }
  }
  const watchEntrance = (node, makeTimeline) => {
    let timeline
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      // Complete the parent timeline, never its fromTo initialization tweens.
      // An interaction before entry also cancels the pending entrance.
      timeline?.progress(1)
    }
    const play = () => {
      if (timeline || finished) return
      scenes.get(node)?.add(() => { timeline = makeTimeline() })
    }
    ScrollTrigger.create({ trigger: node, start: 'top 88%', end: 'bottom top', once: true,
      onEnter: play, onLeave: () => timeline?.progress(1), onEnterBack: play })
    // Triggers can enter during construction, before their context is registered.
    gsap.delayedCall(0, () => {
      const rect = node.getBoundingClientRect()
      if (node.isConnected && rect.top < innerHeight * 0.88 && rect.bottom > 0) play()
    })
    return finish
  }
  const scan = () => {
    if (disposed) return
    scenes.forEach((context, node) => {
      if (!node.isConnected) { context.revert(); scenes.delete(node); experienceEntrances.delete(node) }
    })
    select(root, '[data-motion-heading], .work-heading, .about-copy, .expertise-heading').forEach(node => register(node, heading => {
      watchEntrance(heading, () => titleEntrance(heading).play())
    }))
    select(root, '.strength-grid, .stats').forEach(node => register(node, grid => {
      const cards = Array.from(grid.children)
      ScrollTrigger.batch(cards, { start: 'top 89%', once: true, interval: 0.08, batchMax: 3,
        onEnter: batch => scenes.get(grid)?.add(() => revealContent(batch, 0.32)) })
    }))
    select(root, '.timeline').forEach(node => register(node, list => {
      const items = select(list, '.experience-motion-item')
      experienceEntrances.set(list, watchEntrance(list, () => revealContent(items)))
    }))
    select(root, '.portrait-column, .section-topline').forEach(node => register(node, item => {
      watchEntrance(item, () => revealContent([item], item.matches('.portrait-column') ? 0.35 : 0))
    }))
  }
  const refresh = () => {
    refreshCall?.kill()
    refreshCall = gsap.delayedCall(0.18, () => { if (!disposed) ScrollTrigger.refresh() })
  }
  scan()
  refresh()
  const mutations = new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.('.ip-showcase, dialog') && [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1))) {
      scanCall?.kill()
      scanCall = gsap.delayedCall(0.05, () => { scan(); refresh() })
    }
  })
  mutations.observe(root, { childList: true, subtree: true })
  const resize = new ResizeObserver(refresh)
  resize.observe(root)
  select(root, '.project-group, .work-index').forEach(node => resize.observe(node))
  document.fonts?.ready.then(() => { if (!disposed) refresh() })
  root.addEventListener('load', refresh, true)
  root.addEventListener('toggle', refresh, true)
  const focus = event => {
    scenes.forEach((context, node) => {
      if (!node.contains(event.target)) return
      const finishExperience = experienceEntrances.get(node)
      if (finishExperience) finishExperience()
      else context.getTweens().forEach(tween => tween.totalProgress(1))
    })
  }
  // Settle the entrance before a mouse/touch toggle can change a details height,
  // including repeated clicks on a summary which already has keyboard focus.
  const experiencePointer = event => {
    experienceEntrances.forEach((finish, node) => { if (node.contains(event.target)) finish() })
  }
  root.addEventListener('focusin', focus)
  root.addEventListener('pointerdown', experiencePointer)
  // Only the large hero artwork gets scrubbed parallax; poster typography stays still.
  const parallax = gsap.matchMedia()
  parallax.add('(min-width: 901px) and (pointer: fine)', () => {
    const video = root.querySelector('.hero-character > video')
    if (video) gsap.fromTo(video, { yPercent: 2, scale: 1.05 }, {
      yPercent: -4, scale: 1.05, ease: 'none',
      scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: 0.9 },
    })
  })
  return () => {
    disposed = true
    refreshCall?.kill()
    scanCall?.kill()
    mutations.disconnect()
    resize.disconnect()
    root.removeEventListener('load', refresh, true)
    root.removeEventListener('toggle', refresh, true)
    root.removeEventListener('focusin', focus)
    root.removeEventListener('pointerdown', experiencePointer)
    openingCleanup()
    parallax.revert()
    scenes.forEach(context => context.revert())
    scenes.clear()
    experienceEntrances.clear()
  }
}
