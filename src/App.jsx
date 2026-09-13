import { useEffect, useState } from 'react'
import { experiences, profile, strengths } from './content'
import WorkGallery from './components/WorkGallery'
import StudioFooter, { GazeBackground } from './components/StudioFooter'
import Dialog from './components/Dialog'
import RevealText from './components/RevealText'
import OpeningScene from './components/OpeningScene'
import ProfileCard from './components/ProfileCard'
import usePortfolioMotion from './motion/usePortfolioMotion'
import './components/expertise.css'

function Arrow({ diagonal = false, className = '' }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M5 19 19 5M5 5h14v14' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.4" /></svg>
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    const onKey = event => { if (event.key === 'Escape') setMenuOpen(false) }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKey)
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id) })
    }, { rootMargin: '-20% 0px -50% 0px' })
    document.querySelectorAll('main > section[id], main > footer[id]').forEach(section => observer.observe(section))
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('keydown', onKey); observer.disconnect() }
  }, [])
  return <header className={'site-header ' + (scrolled ? 'scrolled' : '')}>
    <div className="header-inner shell">
      <a href="#home" className="wordmark" aria-label="蒋涛，返回首页" onClick={() => setMenuOpen(false)}>jt<span className="wordmark-dot">.</span><span className="wordmark-name">JIANG TAO<br /><span>DESIGN PORTFOLIO</span></span></a>
      <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? '关闭' : '菜单'} <span>{menuOpen ? '−' : '+'}</span></button>
      <nav id="main-nav" className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="主导航">
        {[['work', '精选作品', 'Work'], ['about', '关于我', 'About'], ['expertise', '设计能力', 'Expertise']].map(([id, label, english]) => <a key={id} href={'#' + id} aria-current={active === id ? 'location' : undefined} onClick={() => setMenuOpen(false)}>{label}<span>{english}</span></a>)}
      </nav>
      <a className="header-contact" href="#contact" onClick={() => setMenuOpen(false)}>聊聊合作 <Arrow diagonal /></a>
    </div>
  </header>
}

function Hero() {
  return <section id="home" className="hero friendly-hero" aria-labelledby="hero-title">
    <GazeBackground className="hero-character" />
    <div className="shell hero-inner" data-hero-reveal>
      <div className="hero-eyebrow">a little about me.</div>
      <div className="hero-main">
        <div className="hero-label">蒋涛 / JIANG TAO<span>视觉 · AI · 品牌</span></div>
        <h1 id="hero-title"><span className="title-reveal"><span>imagination</span></span><span className="title-reveal"><span>meets impact.</span></span></h1>
        <div className="hero-description"><p>{profile.slogan[0]}，<br />{profile.slogan[1]}。</p></div>
        <a href="#work" className="hero-cta">看看我的作品 <Arrow diagonal /></a>
      </div>
      <div className="hero-bottom"><span className="hero-edition">JIANG TAO · DESIGN PORTFOLIO / 2021—2026</span><a href="#work" className="scroll-hint"><span>SCROLL TO EXPLORE</span><span className="scroll-line" /></a></div>
    </div>
  </section>
}

function ExperienceItem({ item, initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen)
  return <details className="experience-item" open={open}>
    <summary onClick={event => { event.preventDefault(); setOpen(current => !current) }}>
      <span className="experience-period">{item.period}</span>
      <span className="experience-company">{item.company}<span>{item.role}</span></span>
      <span className="experience-button experience-toggle">{open ? '收起经历' : '查看经历'} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.5" /></svg></span>
    </summary>
    <div className="experience-body">
      <span>{item.fullName}</span>
      <div className="experience-description">
        {(Array.isArray(item.description) ? item.description : [item.description]).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
    </div>
  </details>
}

function About({ reduced }) {
  return <section id="about" className="section shell about-section" aria-labelledby="about-title">
    <div className="section-topline" data-reveal><span className="section-kicker">01 / ABOUT ME</span><span className="section-note">感性与理性之间，找到设计的可能。</span></div>
    <div className="module-heading" data-motion-heading><p className="motion-display"><RevealText>About me.</RevealText></p></div>
    <div className="about-grid">
      <div className="portrait-column" data-reveal>
        {profile.portrait ? <ProfileCard className="portrait-frame" avatarUrl={profile.portrait} name={profile.name} enableTilt={!reduced} /> : <div className="portrait-frame"><div className="portrait-placeholder" role="img" aria-label="个人肖像占位，待补充蒋涛本人照片"><span className="portrait-index">DESIGNER / 001</span><span className="portrait-monogram" aria-hidden="true">jt.</span><span className="portrait-caption">PORTRAIT TO COME<span>本人照片待补充</span></span></div></div>}
        <div className="portrait-credit"><span>蒋涛 <span className="muted">JIANG TAO</span></span><span>创造，不止一种方式。</span></div>
      </div>
      <div className="about-copy" data-reveal>
        <span className="micro-label">A LITTLE ABOUT MYSELF</span>
        <h2 id="about-title"><RevealText>让设计有温度，</RevealText><RevealText className="muted">让创意有更多可能。</RevealText></h2>
        <div className="role-list">{profile.roles.map(role => <span key={role}>{role}</span>)}</div>
        <p>你好，我是蒋涛。拥有 5 年商业视觉设计经验，<br className="desktop-break" />关注品牌如何被感知，也探索创意如何更好地实现。</p>
        <p>从电商视觉到品牌体系，从三维表达到 AIGC 实践，我习惯将审美判断与技术能力结合。在四季物语，我从金凯撒视觉设计出发，成长为宝嘉力品牌主设计师，主导品牌从 0 到 1 的视觉搭建，让创意在真实的商业场景中落地。</p>
        <div className="about-actions"><a className="experience-button" href="#experience">查看经历 <Arrow /></a><a className="quiet-link" href="#contact">联系我 <Arrow diagonal /></a></div>
      </div>
    </div>
    <div className="stats" data-reveal>
      <div className="stat"><div className="stat-value">5<span>年</span></div><span className="stat-label">商业视觉设计经验</span><span className="stat-detail">VISUAL DESIGN EXPERIENCE</span></div>
      <div className="stat"><div className="stat-value">0<span className="stat-arrow">→</span>1</div><span className="stat-label">主导新品牌视觉搭建</span><span className="stat-detail">BRAND FROM THE GROUND UP</span></div>
      <div className="stat"><div className="stat-value">南京</div><span className="stat-label">现工作地点</span><span className="stat-detail">BASED IN NANJING</span></div>
      <div className="stat"><div className="stat-value">2<span>次</span></div><span className="stat-label">设计部“最佳设计”推荐</span><span className="stat-detail">RECOGNITION FROM THE TEAM</span></div>
    </div>
    <div id="experience" className="experience-grid" data-reveal>
      <div className="experience-heading"><span className="section-kicker">THE JOURNEY</span><h3>一路积累，<br /><span className="muted">持续进化。</span></h3><span className="micro-label">2021 — PRESENT</span></div>
      <div className="timeline">{experiences.map((item, index) => <div className="experience-motion-item" key={item.company}><ExperienceItem item={item} initiallyOpen={index === 0} /></div>)}</div>
    </div>
  </section>
}

function CapabilitySymbol({ type }) {
  return <svg className={'capability-symbol symbol-' + type} width="86" height="86" viewBox="0 0 86 86" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">{type === 'brand' ? <><rect x="15" y="15" width="39" height="39" /><rect x="31" y="31" width="39" height="39" /><path d="M15 70 70 15" /></> : type === 'visual' ? <><circle cx="43" cy="43" r="28" /><path d="M9 43h68M43 9v68" /><circle cx="43" cy="43" r="12" /></> : <><path d="m43 9 31 18v32L43 77 12 59V27zM12 27l31 17 31-17M43 44v33M43 9v35M12 59l31-15 31 15" /></>}</svg>
}

function Expertise() {
  return <section id="expertise" className="section shell expertise-section" aria-labelledby="expertise-title">
    <div className="section-topline" data-reveal><span className="section-kicker">03 / WHAT I BRING</span><span className="section-note">不同的能力，同一个创意目标。</span></div>
    <div className="module-heading" data-motion-heading><p className="motion-display"><RevealText>What I bring.</RevealText></p></div>
    <div className="expertise-heading" data-reveal>
      <h2 id="expertise-title">
        <RevealText className="expertise-desktop-copy">不止于视觉，</RevealText>
        <RevealText className="muted expertise-desktop-copy">更关乎思考与创造。</RevealText>
        <RevealText className="expertise-mobile-copy">让想法成为好作品。</RevealText>
      </h2>
      <p>品牌思维 × 商业视觉 × 创意技术<br /><span>让好的想法，拥有更好的表达。</span></p>
    </div>
    <div className="strength-grid">{strengths.map(item => <article className="strength-card" key={item.number} data-reveal>
      <div className="strength-top"><span>{item.number}</span><CapabilitySymbol type={item.symbol} /></div>
      <p className="strength-english">{item.english}</p>
      <h3>{item.title}</h3>
      <p className="strength-description"><span className="expertise-desktop-copy">{item.description}</span><span className="expertise-mobile-copy">{item.shortDescription}</span></p>
      <div className="strength-tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
    </article>)}</div>
  </section>
}

function ContactDialog({ onClose }) {
  const [message, setMessage] = useState('')
  const hasContact = profile.email || profile.wechat || profile.phone || profile.wechatQr
  const copyWechat = async () => {
    try { await navigator.clipboard.writeText(profile.wechat); setMessage('微信号已复制。') }
    catch { setMessage('请手动复制微信号：' + profile.wechat) }
  }
  return <Dialog labelId="contact-dialog-title" onClose={onClose} className="contact-dialog">
    <div className="dialog-content">
      <span className="micro-label">LET’S START A CONVERSATION</span>
      <h2 id="contact-dialog-title">期待与你交流。</h2>
      <p className="dialog-subtitle">品牌设计 / 商业视觉 / AI 创意探索</p>
      <div className={'contact-details-layout' + (profile.wechatQr ? ' has-qr' : '')}>
        <div className="dialog-contact-rows">
          <div><span>邮箱</span>{profile.email ? <a href={'mailto:' + profile.email}>{profile.email} <Arrow diagonal /></a> : <span className="muted">待补充</span>}</div>
          <div><span>微信</span>{profile.wechat ? <button onClick={copyWechat} title="复制微信号">{profile.wechat} <span>复制</span></button> : <span className="muted">待补充</span>}</div>
          <div><span>电话</span>{profile.phone ? <a href={'tel:' + profile.phone}>{profile.phone} <Arrow diagonal /></a> : <span className="muted">待补充</span>}</div>
        </div>
        {profile.wechatQr && <figure className="contact-wechat-qr">
          <img src={profile.wechatQr} alt="蒋涛的微信二维码" width="554" height="554" />
          <figcaption>微信扫码，添加好友<span>手机可长按保存二维码</span></figcaption>
        </figure>}
      </div>
      {!hasContact && <p className="contact-empty-note">当前为作品集预览版，联系方式尚未提供。</p>}
      <p className="copy-status" role="status" aria-live="polite">{message}</p>
    </div>
  </Dialog>
}

export default function App() {
  const reduced = useReducedMotion()
  const [contactOpen, setContactOpen] = useState(false)
  usePortfolioMotion(reduced)
  return <>
    <OpeningScene />
    <a className="skip-link" href="#about">跳转到个人介绍</a>
    <Header />
    <main><Hero /><About reduced={reduced} /><WorkGallery reduced={reduced} /><Expertise /><StudioFooter reduced={reduced} onContact={() => setContactOpen(true)} /></main>
    {contactOpen && <ContactDialog onClose={() => setContactOpen(false)} />}
  </>
}
