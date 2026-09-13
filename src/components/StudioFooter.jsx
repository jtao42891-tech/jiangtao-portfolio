import { useEffect, useRef } from 'react'
import { profile } from '../content'
import { timeForAngle } from '../gaze-utils'
import RevealText from './RevealText'
import './studio-footer.css'

export function GazeBackground({ className = 'studio-background', priority = false }) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  useEffect(() => {
    const video = videoRef.current
    let frame = 0
    let pointer = null
    let disposed = false
    let visible = false
    let targetAngle = null
    let displayAngle = null
    let appliedTime = Number.NaN
    let candidateTime = Number.NaN
    let candidateTicks = 0
    let lastFrameAt = 0
    const mobile = window.matchMedia('(max-width: 700px), (hover: none) and (pointer: coarse)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = navigator.connection
    let requestedSource = ''
    // Keep an image visible until an actual decoded/playing frame is available.
    const showVideo = () => {
      video.dataset.frameReady = 'true'
      containerRef.current?.setAttribute('data-frame-ready', 'true')
    }
    const showPoster = () => {
      delete video.dataset.frameReady
      containerRef.current?.removeAttribute('data-frame-ready')
    }
    const seek = timestamp => {
      frame = 0
      if (disposed || !visible || document.hidden || mobile.matches || video.readyState < 2 || !Number.isFinite(video.duration) || targetAngle === null) {
        lastFrameAt = 0
        return
      }
      if (displayAngle === null) displayAngle = targetAngle
      const elapsed = lastFrameAt ? Math.min(64, Math.max(8, timestamp - lastFrameAt)) : 16
      lastFrameAt = timestamp
      const angleDelta = Math.atan2(Math.sin(targetAngle - displayAngle), Math.cos(targetAngle - displayAngle))
      const smoothing = 1 - Math.exp(-elapsed / 85)
      displayAngle += angleDelta * smoothing
      const desiredTime = Math.max(0, Math.min(timeForAngle(displayAngle), video.duration - 1 / 24))
      if (Math.abs(desiredTime - candidateTime) < 1 / 120) candidateTicks += 1
      else { candidateTime = desiredTime; candidateTicks = 1 }
      const firstFrame = !Number.isFinite(appliedTime)
      const frameChanged = firstFrame || Math.abs(desiredTime - appliedTime) > 1 / 60
      if (!video.seeking && frameChanged && (firstFrame || candidateTicks >= 2)) {
        video.currentTime = desiredTime
        appliedTime = desiredTime
      }
      if (Math.abs(angleDelta) > .002 || video.seeking || Math.abs(desiredTime - appliedTime) > 1 / 60) schedule()
    }
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(seek) }
    const updateTarget = () => {
      if (disposed || !visible || mobile.matches || !pointer) return
      const rect = video.getBoundingClientRect()
      const scale = Math.max(rect.width / 1920, rect.height / 1080)
      const eyeX = rect.left + rect.width / 2 + (948 - 960) * scale
      const eyeY = rect.top + rect.height / 2 + (418 - 540) * scale
      const dx = pointer.x - eyeX
      const dy = pointer.y - eyeY
      if (Math.hypot(dx, dy) > 12) { targetAngle = Math.atan2(dy, dx); schedule() }
    }
    const move = event => { pointer = { x: event.clientX, y: event.clientY }; updateTarget() }
    const ready = () => {
      if (disposed) return
      if (!visible || document.hidden) { video.pause(); return }
      if (reducedMotion.matches || connection?.saveData) {
        video.pause()
        showPoster()
        return
      }
      const source = mobile.matches ? '/footer-mobile.mp4' : '/footer-scrub.mp4'
      if (source !== requestedSource) {
        requestedSource = source
        showPoster()
        video.muted = true
        video.defaultMuted = true
        video.playsInline = true
        video.src = source
        video.load()
      }
      video.loop = mobile.matches
      if (mobile.matches) {
        video.play().catch(() => { if (!disposed && video.paused) showPoster() })
      } else {
        video.pause()
        if (video.readyState >= 2) showVideo()
        updateTarget(); schedule()
      }
    }
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; ready() }, { rootMargin: '200px 0px', threshold: 0 })
    observer?.observe(containerRef.current)
    if (!observer) { visible = true; ready() }
    video.addEventListener('seeked', schedule)
    video.addEventListener('loadeddata', ready)
    video.addEventListener('canplay', ready)
    video.addEventListener('playing', showVideo)
    video.addEventListener('error', showPoster)
    mobile.addEventListener('change', ready)
    reducedMotion.addEventListener('change', ready)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('resize', updateTarget)
    window.addEventListener('scroll', updateTarget, { passive: true })
    document.addEventListener('visibilitychange', ready)
    connection?.addEventListener?.('change', ready)
    if (video.readyState >= 2) ready()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer?.disconnect()
      video.pause()
      video.removeEventListener('seeked', schedule)
      video.removeEventListener('loadeddata', ready)
      video.removeEventListener('canplay', ready)
      video.removeEventListener('playing', showVideo)
      video.removeEventListener('error', showPoster)
      mobile.removeEventListener('change', ready)
      reducedMotion.removeEventListener('change', ready)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('resize', updateTarget)
      window.removeEventListener('scroll', updateTarget)
      document.removeEventListener('visibilitychange', ready)
      connection?.removeEventListener?.('change', ready)
    }
  }, [])
  return <div ref={containerRef} className={className} aria-hidden="true">
    <img className="gaze-poster" src="/footer-poster.jpg" alt="" width="1280" height="720" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'low'} decoding="async" />
    <video className="gaze-video" ref={videoRef} muted playsInline preload="none" poster="/footer-poster.jpg" />
  </div>
}

export default function StudioFooter({ onContact, reduced = false }) {
  const scrollFrameRef = useRef(0)
  const unlockScrollRef = useRef(() => {})
  useEffect(() => () => {
    cancelAnimationFrame(scrollFrameRef.current)
    unlockScrollRef.current()
  }, [])
  const forceBackToTop = event => {
    event.preventDefault()
    cancelAnimationFrame(scrollFrameRef.current)
    unlockScrollRef.current()
    const startY = window.scrollY
    window.history.replaceState(null, '', '#home')
    if (reduced || startY <= 1) {
      window.scrollTo(0, 0)
      return
    }
    const root = document.documentElement
    const previousScrollBehavior = root.style.scrollBehavior
    const blockScroll = input => { if (input.cancelable) input.preventDefault() }
    const blockScrollKeys = input => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(input.key)) input.preventDefault()
    }
    root.style.scrollBehavior = 'auto'
    window.addEventListener('wheel', blockScroll, { passive: false, capture: true })
    window.addEventListener('touchmove', blockScroll, { passive: false, capture: true })
    window.addEventListener('keydown', blockScrollKeys, { capture: true })
    let locked = true
    const unlock = () => {
      if (!locked) return
      locked = false
      root.style.scrollBehavior = previousScrollBehavior
      window.removeEventListener('wheel', blockScroll, { capture: true })
      window.removeEventListener('touchmove', blockScroll, { capture: true })
      window.removeEventListener('keydown', blockScrollKeys, { capture: true })
      unlockScrollRef.current = () => {}
    }
    unlockScrollRef.current = unlock
    const duration = Math.min(1600, Math.max(900, startY / 14))
    const startedAt = performance.now()
    const step = now => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 4)
      window.scrollTo(0, Math.round(startY * (1 - eased)))
      if (progress < 1) scrollFrameRef.current = requestAnimationFrame(step)
      else {
        window.scrollTo(0, 0)
        unlock()
      }
    }
    scrollFrameRef.current = requestAnimationFrame(step)
  }
  return <footer id="contact" className="studio-footer" aria-label="蒋涛的联系页">
    <div className="studio-jobs" data-motion-heading><span className="studio-tag">have a fresh idea?</span><p className="studio-headline studio-job-title"><RevealText>imagination</RevealText><RevealText>meets craft</RevealText></p><nav className="studio-nav" aria-label="页尾导航"><a href="#creative">创意作品</a><a href="#about">关于蒋涛</a><a href="#three-d">三维设计</a><a href="#ai-video">AI 影像</a></nav></div>
    <div className="studio-contact-composition">
    <div className="studio-character">
    <GazeBackground />
    <a className="studio-back-to-top" href="#home" onClick={forceBackToTop}>回到顶部 <span aria-hidden="true">↑</span></a>
    </div>
    <div className="studio-contact"><span className="studio-tag">say hey</span><div className="studio-headline studio-contact-title" data-motion-heading><RevealText>let’s team up!</RevealText><RevealText>bring your idea*</RevealText></div><p className="studio-note">*好的作品，始于一次有意思的对话。</p>
      <div className="studio-contact-info">
        {profile.email ? <a href={'mailto:' + profile.email}><span className="studio-contact-label">邮箱：</span><span>{profile.email}</span></a> : <span>邮箱待补充</span>}
        <span><span className="studio-contact-label">微信：</span><span>{profile.wechat || '待补充'}</span></span>
        {profile.phone ? <a href={'tel:' + profile.phone}><span className="studio-contact-label">电话：</span><span>{profile.phone}</span></a> : <span>电话待补充</span>}
        <button onClick={onContact} aria-haspopup="dialog">联系蒋涛 <span aria-hidden="true">↗</span></button>
      </div>
    </div>
    </div>
  </footer>
}
