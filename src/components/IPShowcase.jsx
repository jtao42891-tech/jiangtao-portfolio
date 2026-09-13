import { useEffect, useMemo, useState } from 'react'
import { ipOrbitStyles } from '../ip-utils'
import useIPOrbit from '../useIPOrbit'
import PreviewImage from './PreviewImage'
import './ip-showcase.css'

const backgrounds = ['#e1d9ec', '#dce4ed', '#e9dce5', '#e0e4df']

function IPFigure({ item, index, total, active, registerFigure, enterFigure, leaveFigure }) {
  const [failed, setFailed] = useState(false)
  // Keep these stable: the orbit updates only four elements, not React on every frame.
  const initialStyle = useMemo(() => ipOrbitStyles(index, 0, total), [index, total])
  useEffect(() => setFailed(false), [item.src])
  const hover = { onPointerEnter: event => enterFigure(index, event), onPointerLeave: event => leaveFigure(index, event) }
  return <div ref={node => { registerFigure(index, node) }} className="ip-figure" data-index={index} data-active={active || undefined} aria-hidden={!active || undefined} style={initialStyle}>
    {item.src && !failed ? <PreviewImage src={item.src} alt={item.alt || item.title} draggable="false" onError={() => setFailed(true)} {...hover} /> :
      <span className="ip-placeholder" aria-hidden="true" {...hover}><span className="ip-placeholder-label">CHARACTER STUDY</span><strong>IP {String(index + 1).padStart(2, '0')}</strong><span className="ip-placeholder-note">{failed ? '素材暂时无法加载' : 'IP 形象待放入'}<small>透明底 PNG / WebP</small></span></span>}
  </div>
}

export default function IPShowcase({ items, name = 'CHARACTER', label = 'IP / CHARACTER DESIGN', reduced }) {
  const orbit = useIPOrbit(items.length, reduced)
  if (!items.length) return null
  const item = items[orbit.active]
  return <div className="ip-showcase" style={{ '--ip-background': item.background || backgrounds[orbit.active % backgrounds.length] }}>
    <div className="ip-stage" ref={orbit.stageRef} role="group" aria-roledescription="轮播" aria-label="IP 形象展示，角色上悬停暂停，可左右拖动或使用方向键" tabIndex={0} {...orbit.handlers}>
      <div className="ip-stage-top" aria-hidden="true"><span>{label}</span><span>{String(orbit.active + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span></div>
      <div className={'ip-ghost' + (name.length <= 5 ? ' ip-ghost--short' : '')} aria-hidden="true">{name}</div>
      {items.map((figure, index) => <IPFigure key={figure.id} item={figure} index={index} total={items.length} active={index === orbit.active} registerFigure={orbit.registerFigure} enterFigure={orbit.enterFigure} leaveFigure={orbit.leaveFigure} />)}
      {items.length > 1 && <>
        <button type="button" className="ip-drag-cue ip-drag-cue--left" aria-label="向左转动，查看上一个 IP 姿态" onPointerDown={event => event.stopPropagation()} onClick={() => orbit.step(-1)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <button type="button" className="ip-drag-cue ip-drag-cue--right" aria-label="向右转动，查看下一个 IP 姿态" onPointerDown={event => event.stopPropagation()} onClick={() => orbit.step(1)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      </>}
    </div>
    <div className="ip-info">
      <div><p className="ip-active-label">{String(orbit.active + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')} · IP DESIGN</p><h4 role="status" aria-live={orbit.manual || reduced ? 'polite' : 'off'} aria-atomic="true">{item.title}</h4><p className="ip-description">{item.description || (item.src ? 'IP 形象设计' : '此处预留角色定位、性格与设计说明。')}</p></div>
      <p className="ip-hint">拖动 / 点击箭头{!reduced && <span>悬停角色暂停</span>}</p>
    </div>
  </div>
}
