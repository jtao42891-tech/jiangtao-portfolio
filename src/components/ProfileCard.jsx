import { memo, useEffect, useRef } from 'react'
import { PROFILE_INTRO, sampleProfileIntro } from './profile-card-intro'
import './ProfileCard.css'

const clamp = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max)

// Adapted from the user-supplied React Bits ProfileCard: keep the tilt and
// holographic layers, with a full-photo layout instead of the demo profile UI.
function ProfileCard({ avatarUrl, name, className = '', enableTilt = true, behindGlowEnabled = true }) {
  const wrapRef = useRef(null)
  const shellRef = useRef(null)
  const introPlayedRef = useRef(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const shell = shellRef.current
    if (!wrap || !shell) return

    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: no-preference)')
    const image = shell.querySelector('img')
    let imageReady = image.complete && image.naturalWidth > 0
    let inView = false
    let introTimer = null
    let introStart = null
    let frame = null
    let lastTime = 0
    let currentX = 50
    let currentY = 50
    let targetX = 50
    let targetY = 50

    const paint = () => {
      const properties = {
        '--pointer-x': `${currentX.toFixed(3)}%`,
        '--pointer-y': `${currentY.toFixed(3)}%`,
        '--background-x': `${(35 + currentX * 0.3).toFixed(3)}%`,
        '--background-y': `${(35 + currentY * 0.3).toFixed(3)}%`,
        '--pointer-from-center': clamp(Math.hypot(currentX - 50, currentY - 50) / 50, 0, 1),
        '--pointer-from-left': currentX / 100,
        '--pointer-from-top': currentY / 100,
        '--rotate-x': `${(-(currentX - 50) / 5).toFixed(3)}deg`,
        '--rotate-y': `${((currentY - 50) / 4).toFixed(3)}deg`,
      }
      for (const [key, value] of Object.entries(properties)) wrap.style.setProperty(key, value)
    }

    const step = time => {
      frame = null
      if (introStart !== null) {
        const progress = Math.min((time - introStart) / PROFILE_INTRO.duration, 1)
        const pose = sampleProfileIntro(progress)
        currentX = targetX = pose.x
        currentY = targetY = pose.y
        paint()
        if (progress < 1) frame = requestAnimationFrame(step)
        else {
          introStart = null
          lastTime = 0
          wrap.classList.remove('pc-intro')
        }
        return
      }
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.064) : 1 / 60
      lastTime = time
      const smoothing = 1 - Math.exp(-delta / 0.14)
      currentX += (targetX - currentX) * smoothing
      currentY += (targetY - currentY) * smoothing
      const settled = Math.abs(targetX - currentX) < 0.02 && Math.abs(targetY - currentY) < 0.02
      if (settled) {
        currentX = targetX
        currentY = targetY
        lastTime = 0
      }
      paint()
      // Stop when settled, even while hovered; resume only on pointer movement.
      if (!settled) frame = requestAnimationFrame(step)
    }

    const animateTo = (x, y) => {
      targetX = x
      targetY = y
      if (frame === null) frame = requestAnimationFrame(step)
    }

    const stopIntro = () => {
      if (introTimer !== null) clearTimeout(introTimer)
      introTimer = null
      introStart = null
      wrap.classList.remove('pc-intro')
    }

    const reset = () => {
      stopIntro()
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      lastTime = 0
      currentX = targetX = 50
      currentY = targetY = 50
      wrap.classList.remove('pc-active')
      paint()
    }

    const canIntroduce = () => enableTilt && motionQuery.matches && !introPlayedRef.current && inView && imageReady && !document.hidden
    const beginIntro = () => {
      introTimer = null
      if (!canIntroduce()) return
      const opening = document.querySelector('.opening-scene')
      // A restored #about scroll position can still be behind the jt curtain.
      // Keep the curtain guard, but overlap the last part of the portrait reveal.
      const openingVisible = opening && getComputedStyle(opening).display !== 'none' && getComputedStyle(opening).visibility === 'visible'
      const clipPath = getComputedStyle(wrap).clipPath
      const bottomInset = clipPath.match(/^inset\(\s*\S+\s+\S+\s+([\d.]+)%/)
      const revealReady = clipPath === 'none' || (bottomInset && Number(bottomInset[1]) <= 25)
      if (openingVisible || !revealReady) {
        introTimer = setTimeout(beginIntro, 80)
        return
      }
      introPlayedRef.current = true
      introStart = performance.now()
      wrap.classList.add('pc-intro')
      if (frame === null) frame = requestAnimationFrame(step)
    }
    const scheduleIntro = () => {
      if (canIntroduce() && introTimer === null) introTimer = setTimeout(beginIntro, PROFILE_INTRO.delay)
    }

    const move = event => {
      if (!enableTilt || !pointerQuery.matches || event.pointerType !== 'mouse') return
      // Scrolling the photo under a stationary mouse must not consume its intro.
      if (event.type === 'pointerenter' && !introPlayedRef.current) return
      // Measure the stationary shell, not the rotating card, to prevent jitter.
      const rect = shell.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      // User input takes over immediately, without a competing intro timeline.
      introPlayedRef.current = true
      stopIntro()
      wrap.classList.add('pc-active')
      animateTo(clamp((event.clientX - rect.left) / rect.width * 100), clamp((event.clientY - rect.top) / rect.height * 100))
    }

    const leave = () => {
      if (introStart !== null) return
      wrap.classList.remove('pc-active')
      if (currentX !== 50 || currentY !== 50 || frame !== null) animateTo(50, 50)
    }
    const onVisibility = () => { if (document.hidden) reset(); else scheduleIntro() }
    const onMotionChange = () => { reset(); scheduleIntro() }
    const onImageLoad = () => { imageReady = true; scheduleIntro() }
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0]
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.35
      if (!entry.isIntersecting) reset()
      else scheduleIntro()
    }, { threshold: [0, 0.35], rootMargin: '-70px 0px 0px' })

    shell.addEventListener('pointerenter', move)
    shell.addEventListener('pointermove', move)
    shell.addEventListener('pointerleave', leave)
    shell.addEventListener('pointercancel', reset)
    pointerQuery.addEventListener('change', onMotionChange)
    motionQuery.addEventListener('change', onMotionChange)
    image.addEventListener('load', onImageLoad)
    window.addEventListener('blur', reset)
    window.addEventListener('focus', scheduleIntro)
    window.addEventListener('resize', onMotionChange)
    document.addEventListener('visibilitychange', onVisibility)
    observer.observe(shell)

    return () => {
      reset()
      observer.disconnect()
      shell.removeEventListener('pointerenter', move)
      shell.removeEventListener('pointermove', move)
      shell.removeEventListener('pointerleave', leave)
      shell.removeEventListener('pointercancel', reset)
      pointerQuery.removeEventListener('change', onMotionChange)
      motionQuery.removeEventListener('change', onMotionChange)
      image.removeEventListener('load', onImageLoad)
      window.removeEventListener('blur', reset)
      window.removeEventListener('focus', scheduleIntro)
      window.removeEventListener('resize', onMotionChange)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enableTilt])

  return <div ref={wrapRef} className={`pc-card-wrapper ${className}`}>
    {behindGlowEnabled && <div className="pc-behind" aria-hidden="true" />}
    <div ref={shellRef} className="pc-card-shell">
      <div className="pc-card">
        <div className="pc-inside">
          <div className="pc-avatar-content"><img className="pc-avatar" src={avatarUrl} alt={`${name}个人肖像`} loading="lazy" decoding="async" /></div>
          <div className="pc-shine" aria-hidden="true" />
          <div className="pc-glare" aria-hidden="true" />
        </div>
      </div>
    </div>
  </div>
}

export default memo(ProfileCard)
