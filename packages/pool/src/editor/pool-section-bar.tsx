'use client'

import { useLiveNodeOverrides, useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import type { PoolNode } from '../core/schema'
import { planPoolFittings } from '../design/pool-fitting-layout'
import { POOL_SHAPE_OPTIONS } from '../design/shapes'
import { getPoolFinishSettings } from '../design/pool-finishes'
import { getExplicitlySelectedPool } from './pool-selection'
import { buildPoolSectionModel } from './pool-section-model'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function PoolSectionBarPortal({ poolId }: { poolId?: string } = {}): ReactNode {
  const [target, setTarget] = useState<Element | null>(null)
  const selectedIds = useViewer((state) => state.selection.selectedIds)
  const selectedPool = useScene((state) => getExplicitlySelectedPool(state.nodes, selectedIds))

  useEffect(() => {
    if (!document.querySelector('[data-pool-section-global]')) {
      setTarget(document.querySelector('[data-viewer-bounds]') ?? document.body)
    }
  }, [])

  return target && (!poolId || selectedPool?.id === poolId)
    ? createPortal(<PoolSectionBar />, target)
    : null
}

export default function PoolSectionBarInspector({ node }: { node: PoolNode }) {
  return <PoolSectionBarPortal poolId={node.id} />
}

export function PoolSectionBar() {
  const barRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<{ left: number; width: number } | null>(null)
  const selectedIds = useViewer((state) => state.selection.selectedIds)
  const pool = useScene((state) => getExplicitlySelectedPool(state.nodes, selectedIds))
  const volume = useMemo(() => pool ? planPoolFittings(pool).volume : null, [pool])
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (pool) setExpanded(true)
  }, [pool?.id])

  useLayoutEffect(() => {
    if (!pool) return
    const bounds = barRef.current?.closest('[data-viewer-bounds]') ?? document.body
    let inspector: Element | null = null
    let frame = 0
    const measure = () => {
      frame = 0
      const rect = bounds.getBoundingClientRect()
      const panel = bounds.querySelector('[data-editor-inspector]')
      const panelRect = panel?.getBoundingClientRect()
      const sectionTop = rect.bottom - 88 - (barRef.current?.getBoundingClientRect().height ?? (expanded ? 252 : 46))
      const overlaps = panelRect && panelRect.bottom > sectionTop && panelRect.top < rect.bottom - 88
      let start = rect.left
      let end = rect.right
      if (overlaps && panelRect) {
        const leftSpace = panelRect.left - 12 - rect.left
        const rightSpace = rect.right - panelRect.right - 12
        if (leftSpace >= rightSpace) end = panelRect.left - 12
        else start = panelRect.right + 12
      }
      const width = Math.max(0, Math.min(720, end - start - 24))
      const left = start - rect.left + (end - start) / 2
      setPlacement((previous) => previous && Math.abs(previous.left - left) < 1 && Math.abs(previous.width - width) < 1
        ? previous : { left, width })
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    const resize = new ResizeObserver(schedule)
    const inspect = new MutationObserver(schedule)
    const children = new MutationObserver(() => {
      const next = bounds.querySelector('[data-editor-inspector]')
      if (next !== inspector) {
        inspect.disconnect()
        if (inspector) resize.unobserve(inspector)
        inspector = next
        if (inspector) {
          resize.observe(inspector)
          inspect.observe(inspector, { attributes: true, attributeFilter: ['style', 'class'] })
        }
      }
      schedule()
    })
    resize.observe(bounds)
    if (barRef.current) resize.observe(barRef.current)
    children.observe(bounds, { childList: true, subtree: true })
    window.addEventListener('resize', schedule)
    const next = bounds.querySelector('[data-editor-inspector]')
    inspector = next
    if (inspector) {
      resize.observe(inspector)
      inspect.observe(inspector, { attributes: true, attributeFilter: ['style', 'class'] })
    }
    measure()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      inspect.disconnect()
      children.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [pool?.id, expanded])

  if (!pool) return null

  return (
    <div className="pointer-events-none absolute text-white" ref={barRef} style={{ bottom: 88, left: placement?.left ?? '50%', width: placement?.width ?? 'min(720px, calc(100% - 24px))', transform: 'translateX(-50%)', zIndex: 40 }}>
      <section aria-label="Selected pool section" className="pointer-events-auto overflow-hidden rounded-2xl border border-white/15" style={{ background: 'rgba(25, 26, 28, 0.96)', boxShadow: '0 16px 45px rgba(0, 0, 0, 0.35)', backdropFilter: 'blur(16px)' }}>
        <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <h3 className="shrink-0 text-sm font-semibold">Section A–A</h3>
            <span className="truncate text-[11px] text-white/50">{pool.floorProfile === 'flat' ? 'Flat floor' : 'Shallow to deep'}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {volume !== null && <span className="font-mono text-[11px] text-white/55" title="Estimated basin volume before entry and bench displacement">~{volume.toFixed(1)} m³</span>}
            <button aria-expanded={expanded} className="rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setExpanded((value) => !value)} type="button">{expanded ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        {expanded && <PoolSectionDiagram pool={pool} />}
      </section>
    </div>
  )
}

function PoolSectionDiagram({ pool: storedPool }: { pool: PoolNode }) {
  const [draft, setDraft] = useState<PoolNode | null>(null)
  const draftRef = useRef<PoolNode | null>(null)
  const pool = draft ?? storedPool
  const section = useMemo(() => buildPoolSectionModel(pool), [pool])
  const sectionRef = useRef<SVGSVGElement>(null)
  const dragging = useRef<{ pointerId: number; handle: SectionHandle; rect: DOMRect; lastPreview: number } | null>(null)
  const pendingMove = useRef<{ x: number; y: number } | null>(null)
  const moveFrame = useRef(0)
  const [activeHandle, setActiveHandle] = useState<SectionHandle | null>(null)
  const id = useId().replaceAll(':', '')

  useEffect(() => {
    setDraft(null)
    draftRef.current = null
    return () => {
      cancelAnimationFrame(moveFrame.current)
      const session = dragging.current
      if (session) {
        useLiveNodeOverrides.getState().clearFields(storedPool.id, [session.handle, '__poolSectionPreview'])
        useViewer.getState().setInputDragging(false)
      }
      dragging.current = null
    }
  }, [storedPool.id])

  const shape = POOL_SHAPE_OPTIONS.find((option) => option.value === pool.shape)?.label ?? pool.shape
  const finish = getPoolFinishSettings(pool.interiorFinish)
  const entry = pool.entryFeature === 'none' ? 'No entry' : pool.entryFeature.replaceAll('-', ' ').replace(/^./, (letter) => letter.toUpperCase())
  const bench = pool.benchEnabled ? `${pool.benchStyle === 'perimeter' ? 'Perimeter' : 'End'} bench · ${pool.benchWidth.toFixed(2)} m wide` : null
  const dimensions = pool.shape === 'circle' ? `Ø ${section.length.toFixed(2)} m` : `${section.length.toFixed(2)} × ${section.width.toFixed(2)} m`

  function nextHandleValue(current: PoolNode, handle: SectionHandle, value: number) {
    if (!Number.isFinite(value)) return null
    const rounded = handle === 'slopeStart' || handle === 'slopeEnd' ? Math.round(value) : Math.round(value * 100) / 100
    const next = handle === 'slopeStart'
      ? Math.max(0, Math.min(current.slopeEnd - 5, rounded))
      : handle === 'slopeEnd'
        ? Math.min(100, Math.max(current.slopeStart + 5, rounded))
        : handle === 'shallowDepth'
          ? Math.max(0.5, Math.min(current.deepDepth, rounded))
          : handle === 'deepDepth'
            ? Math.min(4, Math.max(current.shallowDepth, rounded))
            : handle === 'entryLength'
              ? Math.min(8, Math.max(0.5, rounded))
              : handle === 'entryWaterDepth'
                ? Math.min(1, Math.max(0.05, rounded))
                : handle === 'benchWidth'
                  ? Math.min(1.5, Math.max(0.2, rounded))
                  : Math.min(1.2, Math.max(0.1, rounded))
    return next
  }

  function valueAtPointer(handle: SectionHandle, rect: DOMRect, clientX: number, clientY: number) {
    const x = (clientX - rect.left) / rect.width * 600
    const y = (clientY - rect.top) / rect.height * 130
    return handle === 'slopeStart' || handle === 'slopeEnd'
      ? (x - 12) / 576 * 100
      : handle === 'entryLength' ? (x - 12) / 576 * section.length
      : handle === 'benchWidth' ? (section.benchAtLeft && !section.benchAtRight ? x - 12 : 588 - x) / 576 * section.length
      : (y - section.deckY) / section.depthScale
  }

  function applyPointer(clientX: number, clientY: number) {
    const session = dragging.current
    if (!session) return
    const current = draftRef.current ?? storedPool
    const next = nextHandleValue(current, session.handle, valueAtPointer(session.handle, session.rect, clientX, clientY))
    if (next === null || next === current[session.handle]) return
    const updated = { ...current, [session.handle]: next }
    draftRef.current = updated
    setDraft(updated)
    // A full 3D mesh rebuild is much dearer than the SVG update. Publish a
    // preview at roughly 12 fps while the local section follows every frame.
    const now = performance.now()
    if (now - session.lastPreview >= 80) {
      session.lastPreview = now
      useLiveNodeOverrides.getState().set(storedPool.id, { [session.handle]: next, __poolSectionPreview: true })
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (dragging.current?.pointerId !== event.pointerId) return
    pendingMove.current = { x: event.clientX, y: event.clientY }
    if (moveFrame.current) return
    moveFrame.current = requestAnimationFrame(() => {
      moveFrame.current = 0
      const point = pendingMove.current
      pendingMove.current = null
      if (point) applyPointer(point.x, point.y)
    })
  }

  function stopDragging(event: PointerEvent<SVGSVGElement>, commit: boolean) {
    const session = dragging.current
    if (session?.pointerId !== event.pointerId) return
    cancelAnimationFrame(moveFrame.current)
    moveFrame.current = 0
    pendingMove.current = null
    if (commit) applyPointer(event.clientX, event.clientY)
    dragging.current = null
    setActiveHandle(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const finalValue = draftRef.current?.[session.handle]
    draftRef.current = null
    if (commit && finalValue !== undefined && finalValue !== storedPool[session.handle]) {
      useScene.getState().updateNode(storedPool.id as never, { [session.handle]: finalValue } as never)
    }
    useLiveNodeOverrides.getState().clearFields(storedPool.id, [session.handle, '__poolSectionPreview'])
    useViewer.getState().setInputDragging(false)
    setDraft(null)
  }

  function startDragging(event: PointerEvent<SVGGElement>, handle: SectionHandle) {
    if (dragging.current) return
    event.preventDefault()
    event.stopPropagation()
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    dragging.current = { pointerId: event.pointerId, handle, rect, lastPreview: 0 }
    setActiveHandle(handle)
    useViewer.getState().setInputDragging(true)
    sectionRef.current?.setPointerCapture(event.pointerId)
  }

  function handleKeyDown(event: KeyboardEvent<SVGGElement>, handle: SectionHandle) {
    const horizontal = handle === 'slopeStart' || handle === 'slopeEnd' || handle === 'entryLength' || handle === 'benchWidth'
    const direction = event.key === 'ArrowRight' && horizontal || event.key === 'ArrowDown' && !horizontal ? 1
      : event.key === 'ArrowLeft' && horizontal || event.key === 'ArrowUp' && !horizontal ? -1 : 0
    if (!direction) return
    event.preventDefault()
    const next = nextHandleValue(storedPool, handle, storedPool[handle] + direction * (handle === 'slopeStart' || handle === 'slopeEnd' ? 1 : 0.05))
    if (next !== null && next !== storedPool[handle]) useScene.getState().updateNode(storedPool.id as never, { [handle]: next } as never)
  }

  const slopeStartX = 12 + 576 * pool.slopeStart / 100
  const slopeEndX = 12 + 576 * pool.slopeEnd / 100
  const shallowY = section.deckY + pool.shallowDepth * section.depthScale
  const deepY = section.deckY + pool.deepDepth * section.depthScale
  const entryX = 12 + section.entryFraction * 576
  const entryY = section.deckY + section.entryTopDepth * section.depthScale
  const entryEndY = section.deckY + section.entryEndDepth * section.depthScale
  const benchOnSection = section.benchAtLeft || section.benchAtRight
  const benchAtLeft = section.benchAtLeft && !section.benchAtRight
  const benchX = benchAtLeft ? 12 + section.benchFraction * 576 : 588 - section.benchFraction * 576
  const benchY = section.deckY + pool.benchWaterDepth * section.depthScale

  function renderHandle(handle: SectionHandle, x: number, y: number, label: string) {
    const horizontal = handle === 'slopeStart' || handle === 'slopeEnd' || handle === 'entryLength' || handle === 'benchWidth'
    const min = handle === 'slopeEnd' ? Math.min(100, pool.slopeStart + 5) : handle === 'deepDepth' ? pool.shallowDepth : handle === 'entryLength' ? 0.5 : handle === 'entryWaterDepth' ? 0.05 : handle === 'benchWidth' ? 0.2 : handle === 'benchWaterDepth' ? 0.1 : handle === 'shallowDepth' ? 0.5 : 0
    const max = handle === 'slopeStart' ? Math.max(0, pool.slopeEnd - 5) : handle === 'slopeEnd' ? 100 : handle === 'shallowDepth' ? pool.deepDepth : handle === 'deepDepth' ? 4 : handle === 'entryLength' ? 8 : handle === 'entryWaterDepth' ? 1 : handle === 'benchWidth' ? 1.5 : 1.2
    return <g
      aria-label={`${label}: ${handle === 'slopeStart' || handle === 'slopeEnd' ? `${pool[handle]} percent` : `${pool[handle].toFixed(2)} metres`}`}
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={pool[handle]}
      aria-orientation={horizontal ? 'horizontal' : 'vertical'}
      className={horizontal ? 'cursor-ew-resize' : 'cursor-ns-resize'}
      key={handle}
      onKeyDown={(event) => handleKeyDown(event, handle)}
      onPointerDown={(event) => startDragging(event, handle)}
      role="slider"
      style={{ touchAction: 'none' }}
      tabIndex={0}
    >
      <title>{label} · drag {horizontal ? 'horizontally' : 'vertically'} or use arrow keys</title>
      <circle cx={x} cy={y} fill="transparent" r="14" />
      <circle cx={x} cy={y} fill={activeHandle === handle ? '#fff' : '#202225'} r="6" stroke={handle.startsWith('entry') ? '#f6c969' : handle.startsWith('bench') ? '#a9e7b0' : '#e4fbff'} strokeWidth="2" />
      <circle cx={x} cy={y} fill={handle.startsWith('entry') ? '#f6c969' : handle.startsWith('bench') ? '#a9e7b0' : '#57bfd0'} r="2" />
    </g>
  }

  return <div className="border-t border-white/10 px-4 pb-3 pt-2">
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
      <div style={{ flex: '0 0 136px', minWidth: 0 }}>
        <div className="mb-1 text-[10px] text-white/45">Plan · {shape}</div>
        <svg aria-label={`${shape} pool outline, ${dimensions}`} role="img" style={{ display: 'block', width: '100%', height: 119 }} viewBox="0 0 180 125">
          <defs><clipPath id={`pool-plan-${id}`}><path d={section.planPath} /></clipPath></defs>
          <path d={section.planPath} fill={pool.waterColor} fillOpacity="0.82" stroke={pool.copingColor} strokeWidth={Math.max(3, pool.copingWidth * section.planScale * 2)} strokeLinejoin="round" />
          {pool.entryFeature !== 'none' && <g clipPath={`url(#pool-plan-${id})`}>
            <rect fill={finish.base} fillOpacity="0.8" height="125" width={section.entryPlanWidth} x={section.planLeft} y="0" />
            {pool.entryFeature === 'steps' && Array.from({ length: Math.max(2, Math.min(6, Math.round(pool.stepCount))) - 1 }, (_, index) =>
              <path d={`M ${section.planLeft + section.entryPlanWidth * (index + 1) / pool.stepCount} 0 v125`} key={index} stroke="#fff" strokeOpacity="0.75" strokeWidth="1" />)}
          </g>}
          {pool.benchEnabled && <g clipPath={`url(#pool-plan-${id})`}>
            <path d={pool.benchStyle === 'perimeter' ? section.planPath : section.benchPath ?? ''} fill="none" stroke={finish.base} strokeOpacity="0.85" strokeWidth={Math.max(2, pool.benchWidth * section.planScale * 2)} strokeLinejoin="round" />
          </g>}
          <path d={section.planPath} fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.1" />
          <path d="M 19 62 H 161" stroke="#fff" strokeDasharray="3 3" strokeOpacity="0.8" strokeWidth="0.8" />
          <text fill="#fff" fontSize="9" x="16" y="60">A</text><text fill="#fff" fontSize="9" textAnchor="end" x="164" y="60">A</text>
        </svg>
        <div className="truncate font-mono text-[10px] text-white/60">{dimensions}</div>
      </div>
      <div style={{ flex: '1 1 0', minWidth: 0 }}>
        <div className="mb-1 flex justify-between font-mono text-[10px] text-white/45"><span>A · {pool.floorProfile === 'flat' ? 'start' : 'shallow'}</span><span>{section.length.toFixed(2)} m</span><span>{pool.floorProfile === 'flat' ? 'end' : 'deep'} · A</span></div>
        <svg aria-label={`Pool longitudinal section, ${section.firstDepth.toFixed(2)} metres at the left and ${section.lastDepth.toFixed(2)} metres at the right, ${entry}${pool.benchEnabled ? ', with bench' : ''}`} onLostPointerCapture={(event) => stopDragging(event, false)} onPointerCancel={(event) => stopDragging(event, false)} onPointerMove={handlePointerMove} onPointerUp={(event) => stopDragging(event, true)} ref={sectionRef} style={{ display: 'block', width: '100%', height: 119 }} preserveAspectRatio="none" viewBox="0 0 600 130">
          <defs>
            <linearGradient id={`pool-water-${id}`} x1="0.5" x2="0.5" y1="0" y2="1"><stop offset="0" stopColor={pool.shallowWaterColor} /><stop offset="1" stopColor={pool.deepWaterColor} /></linearGradient>
            <pattern height="7" id={`pool-hatch-${id}`} patternTransform="rotate(45)" patternUnits="userSpaceOnUse" width="7"><line stroke="#fff" strokeOpacity="0.18" x1="0" x2="0" y1="0" y2="7" /></pattern>
          </defs>
          <path d={section.shellPath} fill={pool.shellColor} fillOpacity="0.8" />
          <path d={section.featurePath} fill={finish.base} fillOpacity="0.88" />
          <path d={section.waterPath} fill={`url(#pool-water-${id})`} fillOpacity="0.9" />
          <path d={section.visibleLine} fill="none" stroke="#e4fbff" strokeWidth="2.5" />
          <path d={`M 12 ${section.waterY} H 588`} stroke="#d5f6fa" strokeDasharray="5 4" strokeWidth="1.5" />
          <path d={`M 12 ${section.deckY} V 126 M 588 ${section.deckY} V 126`} stroke={pool.shellColor} strokeWidth="2" />
          <path d={`M 8 ${section.deckY} H 22 M 578 ${section.deckY} H 592`} stroke={pool.copingColor} strokeWidth={Math.max(3, pool.copingThickness * 12)} />
          <path d="M 12 124 H 588" stroke={`url(#pool-hatch-${id})`} strokeWidth="8" />
          <text fill="#fff" fontSize="11" fontWeight="600" x="20" y="115">{section.firstDepth.toFixed(2)} m</text>
          <text fill="#fff" fontSize="11" fontWeight="600" textAnchor="end" x="580" y="115">{section.lastDepth.toFixed(2)} m</text>
          {pool.floorProfile === 'shallow-to-deep' && <>
            <path d={`M ${slopeStartX} 10 V ${shallowY - 7} M ${slopeEndX} 10 V ${deepY - 7}`} fill="none" stroke="#fff" strokeDasharray="3 4" strokeOpacity="0.5" strokeWidth="1" />
            {renderHandle('slopeStart', slopeStartX, shallowY, 'Start of slope')}
            {renderHandle('slopeEnd', slopeEndX, deepY, 'End of slope')}
            {renderHandle('shallowDepth', 12 + (slopeStartX - 12) / 2, shallowY, 'Shallow depth')}
            {renderHandle('deepDepth', slopeEndX + (588 - slopeEndX) / 2, deepY, 'Deep depth')}
          </>}
          {pool.entryFeature !== 'none' && <>
            <path d={`M ${entryX} 12 V ${entryEndY - 8}`} fill="none" stroke="#f6c969" strokeDasharray="3 4" strokeOpacity="0.65" />
            {renderHandle('entryLength', entryX, entryEndY, 'Entry length')}
            {(pool.entryFeature === 'steps' || pool.entryFeature === 'tanning-shelf') && renderHandle('entryWaterDepth', 12 + (entryX - 12) / 2, entryY, 'Entry water depth')}
          </>}
          {pool.benchEnabled && benchOnSection && <>
            {renderHandle('benchWidth', benchX, benchY, 'Bench width')}
            {renderHandle('benchWaterDepth', benchAtLeft ? 12 + (benchX - 12) / 2 : benchX + (588 - benchX) / 2, benchY, 'Bench water depth')}
          </>}
        </svg>
        {pool.floorProfile === 'shallow-to-deep' && <div className="truncate text-[10px] text-white/60">Slope starts {(section.length * pool.slopeStart / 100).toFixed(2)} m from the shallow end</div>}
      </div>
    </div>
    {(pool.entryFeature !== 'none' || bench) && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/10 pt-2 text-[10px] text-white/60">
      {pool.entryFeature !== 'none' && <span>{entry} · {pool.entryLength.toFixed(2)} m{pool.entryFeature === 'steps' ? ` · ${pool.stepCount} steps` : ''}</span>}
      {bench && <span>{bench}</span>}
    </div>}
  </div>
}

type SectionHandle = 'slopeStart' | 'slopeEnd' | 'shallowDepth' | 'deepDepth' | 'entryLength' | 'entryWaterDepth' | 'benchWidth' | 'benchWaterDepth'
