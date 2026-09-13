import { useLayoutEffect, useRef } from 'react'
import { createSequenceHeadingMotion } from '../motion/engine'
import { getProportionalColumns } from '../project-layout'
import RevealText from './RevealText'
import './project-grid.css'

export function SkipProject({ nextId, nextTitle }) {
  const skip = event => {
    const target = document.getElementById(nextId)
    if (!target) return
    event.preventDefault()
    const header = document.querySelector('.site-header')
    const top = (header?.getBoundingClientRect().bottom || 0) + 12
    const destination = target.getBoundingClientRect().top + window.scrollY - top
    window.scrollTo({ top: Math.max(0, destination), behavior: 'instant' })
    window.history.pushState(null, '', '#' + nextId)
    const focusTarget = target.querySelector('h3, h4, h2') || target
    focusTarget.setAttribute('tabindex', '-1')
    focusTarget.focus({ preventScroll: true })
  }
  return <a className="sequence-skip" href={'#' + nextId} onClick={skip} aria-label={'跳过本组，前往' + nextTitle}>跳过本组 <span aria-hidden="true">↓</span></a>
}

// Every work is in normal document flow; only the heading has an entrance animation.
export default function ProjectGrid({ id, title, items = [], nextId, nextTitle, reduced, renderItem, showHeading = true, showSkip = true, labelledBy, equalImageHeight = false, gridLayout, children }) {
  const headerRef = useRef(null)
  useLayoutEffect(() => {
    if (showHeading) return createSequenceHeadingMotion(headerRef.current, reduced)
  }, [id, reduced, showHeading])
  const staggeredColumns = gridLayout === 'staggered'
    ? Array.from({ length: 3 }, (_, columnIndex) => items
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => index % 3 === columnIndex))
    : []
  return <div id={id} className={'project-group' + (showHeading ? '' : ' project-group-without-heading')}>
    {showHeading && <div className="sequence-header" ref={headerRef}>
      <div className="sequence-heading"><h4 id={id + '-heading'}><RevealText>{title}</RevealText></h4></div>
      {showSkip && <SkipProject nextId={nextId} nextTitle={nextTitle} />}
    </div>}
    {children || <div className={'project-grid' + (equalImageHeight ? ' project-grid-proportional' : '') + (gridLayout ? ' project-grid-' + gridLayout : '')}
      style={equalImageHeight ? { gridTemplateColumns: getProportionalColumns(items) } : undefined}
      role="group" aria-labelledby={showHeading ? id + '-heading' : labelledBy}>
      {gridLayout === 'staggered' ? staggeredColumns.map((column, columnIndex) => <div className="project-staggered-column" key={columnIndex}>
        {column.map(({ item, index }) => <div className="project-cell" key={item.id}>{renderItem(item, index)}</div>)}
      </div>) : items.map((item, index) => <div className="project-cell" key={item.id}>{renderItem(item, index)}</div>)}
    </div>}
  </div>
}
