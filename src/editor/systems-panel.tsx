'use client'

import { useScene } from '@pascal-app/core'
import { SegmentedControl, SliderControl, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { PoolNode } from '../core/schema'
import { planPoolFittings } from '../design/pool-fitting-layout'
import { createDefaultPoolAttachments } from '../design/default-pool-attachments'
import type { PoolFilterNode } from '../filter/core/schema'
import { getPoolFilterData, POOL_FILTER_CATALOG } from '../filter/data/catalog'
import type { PoolHeaterNode } from '../heater/core/schema'
import type { PoolPumpNode } from '../pump/core/schema'
import { getSelectedPool } from './pool-selection'
import { usePoolStore } from './store'

const THUMBNAILS = {
  stairs: new URL('./assets/pool-stairs-thumbnail.webp', import.meta.url).href,
  waterfall: new URL('./assets/waterfall-thumbnail.webp', import.meta.url).href,
  spillover: new URL('./assets/spillover-thumbnail.webp', import.meta.url).href,
  filter: new URL('./assets/filter-thumbnail.webp', import.meta.url).href,
  heater: new URL('./assets/heater-thumbnail.webp', import.meta.url).href,
  pump: new URL('./assets/pump-thumbnail.webp', import.meta.url).href,
  drain: new URL('./assets/drain-thumbnail.webp', import.meta.url).href,
  valve: new URL('./assets/valve-thumbnail.webp', import.meta.url).href,
  skimmer: new URL('./assets/skimmer-thumbnail.webp', import.meta.url).href,
  inlet: new URL('./assets/inlet-thumbnail.webp', import.meta.url).href,
} as const

type PoolFittingType = 'pool:skimmer' | 'pool:inlet' | 'pool:drain'
type FittingRow = { type: PoolFittingType; label: string; image: string; recommended: number }
type SystemItem = { type: string; label: string; image: string }

const SYSTEM_ITEMS: SystemItem[] = [
  { type: 'pool:pump', label: 'Pump', image: THUMBNAILS.pump },
  { type: 'pool:filter', label: 'Filter', image: THUMBNAILS.filter },
  { type: 'pool:heater', label: 'Heater', image: THUMBNAILS.heater },
]

const PLUMBING_ITEMS: SystemItem[] = [
  { type: 'pool:valve', label: 'Valve', image: THUMBNAILS.valve },
]

const FEATURE_ITEMS: SystemItem[] = [
  { type: 'pool:stair', label: 'Pool stairs', image: THUMBNAILS.stairs },
  { type: 'pool:waterfall', label: 'Waterfall', image: THUMBNAILS.waterfall },
  { type: 'pool:spillover', label: 'Pool spillover', image: THUMBNAILS.spillover },
]

export function PoolSystemsPanel() {
  const selectedIds = useViewer((state) => state.selection.selectedIds)
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const system = useScene(useShallow((state) => {
    const pool = getSelectedPool(state.nodes, selectedIds)
    const nodes = Object.values(state.nodes) as Array<{ type: string; poolId?: string | null; parentId?: string | null }>
    const relevantNodes = pool
      ? nodes.filter((node) => node.poolId === pool.id || node.parentId === pool.parentId)
      : nodes.filter((node) => node.parentId === activeLevelId)
    const countType = (type: string) => relevantNodes.filter((node) => node.type === type).length
    const poolFittings = pool
      ? nodes.filter((node) => node.poolId === pool.id)
      : []
    const filter = [...relevantNodes].reverse().find((node) => node.type === 'pool:filter') as PoolFilterNode | undefined
    const heater = [...relevantNodes].reverse().find((node) => node.type === 'pool:heater') as PoolHeaterNode | undefined
    const pump = [...relevantNodes].reverse().find((node) => node.type === 'pool:pump') as PoolPumpNode | undefined
    return {
      pool,
      filter,
      heater,
      pump,
      skimmers: poolFittings.filter((node) => node.type === 'pool:skimmer').length,
      inlets: poolFittings.filter((node) => node.type === 'pool:inlet').length,
      drains: poolFittings.filter((node) => node.type === 'pool:drain').length,
      pumps: countType('pool:pump'),
      filters: countType('pool:filter'),
      heaters: countType('pool:heater'),
      valves: countType('pool:valve'),
      stairs: countType('pool:stair'),
      waterfalls: countType('pool:waterfall'),
      spillovers: countType('pool:spillover'),
    }
  }))
  const counts: Record<string, number> = {
    skimmers: system.skimmers,
    inlets: system.inlets,
    drains: system.drains,
    'pool:pump': system.pumps,
    'pool:filter': system.filters,
    'pool:heater': system.heaters,
    'pool:valve': system.valves,
    'pool:stair': system.stairs,
    'pool:waterfall': system.waterfalls,
    'pool:spillover': system.spillovers,
  }
  const draftSettings = usePoolStore(useShallow((state) => ({
    turnoverHours: state.turnoverHours,
    fittingFlowRate: state.fittingFlowRate,
    drainFlowCapacity: state.drainFlowCapacity,
  })))
  const fittingPlan = useMemo(() => system.pool ? planPoolFittings(system.pool) : null, [system.pool])
  const recommendation = fittingPlan?.counts ?? null
  const fittings: FittingRow[] = [
    { type: 'pool:skimmer', label: 'Skimmers', image: THUMBNAILS.skimmer, recommended: recommendation?.skimmer ?? 0 },
    { type: 'pool:inlet', label: 'Return inlets', image: THUMBNAILS.inlet, recommended: recommendation?.inlet ?? 0 },
    { type: 'pool:drain', label: 'Main drains', image: THUMBNAILS.drain, recommended: recommendation?.drain ?? 0 },
  ]
  const missingFittingCount = fittings.reduce((sum, fitting) => sum + Math.max(0, fitting.recommended - (counts[fitting.type === 'pool:skimmer' ? 'skimmers' : fitting.type === 'pool:inlet' ? 'inlets' : 'drains'] ?? 0)), 0)

  const activateTool = (type: string) => {
    useEditor.getState().setTool(type)
    useEditor.getState().setMode('build')
  }

  const setPoolSettings = (patch: Partial<PoolNode>) => {
    usePoolStore.setState(patch as never)
    if (system.pool) useScene.getState().updateNode(system.pool.id as never, patch as never)
  }

  const autoPlaceAll = () => {
    const pool = system.pool
    if (!pool) return
    const scene = useScene.getState()
    const target = planPoolFittings(pool).counts
    const attachments = createDefaultPoolAttachments(pool)
    const existing = Object.values(scene.nodes) as Array<{ type: string; poolId?: string | null }>
    const remaining: Record<string, number> = {
      'pool:skimmer': Math.max(0, target.skimmer - existing.filter((node) => node.poolId === pool.id && node.type === 'pool:skimmer').length),
      'pool:inlet': Math.max(0, target.inlet - existing.filter((node) => node.poolId === pool.id && node.type === 'pool:inlet').length),
      'pool:drain': Math.max(0, target.drain - existing.filter((node) => node.poolId === pool.id && node.type === 'pool:drain').length),
    }
    const create = attachments
      .filter((node) => {
        const needed = remaining[node.type] ?? 0
        if (Object.hasOwn(scene.nodes, node.id) || needed <= 0) return false
        remaining[node.type] = needed - 1
        return true
      })
      .map((node) => ({ node: node as never, parentId: pool.id as never }))
    if (create.length === 0) return
    scene.applyNodeChanges({
      ...(create.length > 0 ? { create } : {}),
      update: pool.automaticFittings ? [] : [{ id: pool.id as never, data: { automaticFittings: true } as never }],
    } as never)
  }

  const addFitting = (type: PoolFittingType) => {
    if (system.pool) activateTool(type)
  }

  const selectFilter = (filterId: string) => {
    const node = system.filter
    const filter = getPoolFilterData(filterId)
    if (!node || !filter) return
    useScene.getState().updateNode(node.id as never, {
      filterId: filter.id,
      technology: filter.technology,
      diameter: filter.tank.diameter,
      bodyHeight: filter.tank.bodyHeight,
      portDiameter: filter.connectionDiameter,
    } as never)
  }

  const selectHeaterTechnology = (technology: PoolHeaterNode['technology']) => {
    if (system.heater) useScene.getState().updateNode(system.heater.id as never, { technology } as never)
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <details className="group border-b border-sidebar-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
          <span className="font-semibold text-sm">Fittings</span>
          <span className="flex items-center gap-2">
            <span className={`text-xs ${missingFittingCount ? 'text-amber-400' : 'text-emerald-400'}`}>
            {system.pool ? (missingFittingCount ? `${missingFittingCount} needed` : 'Complete') : 'Select a pool'}
            </span>
            <span aria-hidden="true" className="text-sidebar-foreground/45 transition-transform group-open:rotate-180">⌄</span>
          </span>
        </summary>
        <section className="flex flex-col gap-2 px-3 pb-4">
          <button
            className="min-h-9 rounded-lg bg-sidebar-accent px-3 text-xs font-medium hover:bg-sidebar-accent/80 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!system.pool || missingFittingCount === 0}
            onClick={autoPlaceAll}
            type="button"
          >
            Add recommended fittings
          </button>
          <div className="flex flex-col divide-y divide-sidebar-border/70">
            {fittings.map((fitting) => {
              const key = fitting.type === 'pool:skimmer' ? 'skimmers' : fitting.type === 'pool:inlet' ? 'inlets' : 'drains'
              const placed = counts[key] ?? 0
              const belowRule = !!system.pool && placed < fitting.recommended
              const description = system.pool
                ? belowRule
                  ? `${placed} of ${fitting.recommended} placed`
                  : `${placed} placed`
                : ''
              return <SystemRow
                count={0}
                description={description}
                descriptionTone={belowRule ? 'warning' : system.pool ? 'success' : 'muted'}
                image={fitting.image}
                key={fitting.type}
                label={fitting.label}
                onClick={() => addFitting(fitting.type)}
                disabled={!system.pool}
              />
            })}
          </div>
        </section>
      </details>

      <details className="group border-b border-sidebar-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
          <span className="font-semibold text-sm">Equipment</span>
          <span className="flex items-center gap-2 text-xs text-sidebar-foreground/55">
            {[system.pumps, system.filters, system.heaters].reduce((sum, count) => sum + count, 0)} placed
            <span aria-hidden="true" className="text-sidebar-foreground/45 transition-transform group-open:rotate-180">⌄</span>
          </span>
        </summary>
        <section className="flex flex-col gap-3 px-3 pb-4">
        <label className="flex flex-col gap-2 text-xs text-sidebar-foreground/60">
          <span>Turnover target</span>
          <SegmentedControl
            className="h-9 p-1"
            onChange={(value) => setPoolSettings({ turnoverHours: Number(value) })}
            options={[{ label: '6 h', value: '6' }, { label: '8 h', value: '8' }, { label: '10 h', value: '10' }]}
            value={String(system.pool?.turnoverHours ?? draftSettings.turnoverHours)}
          />
        </label>
        <div className="flex flex-col divide-y divide-sidebar-border/70">
          {SYSTEM_ITEMS.map((item) => <SystemRow
            count={counts[item.type] ?? 0}
            image={item.image}
            key={item.type}
            label={item.label}
            description={item.type === 'pool:pump' && system.pump
              ? `Connection Ø${Math.round(system.pump.diameter * 1000)} mm`
              : item.type === 'pool:filter' && system.filter
                ? `Capacity ${getPoolFilterData(system.filter.filterId)?.flowRate.min ?? '—'}–${getPoolFilterData(system.filter.filterId)?.flowRate.max ?? '—'} m³/h`
                : item.type === 'pool:heater' && system.heater
                  ? `${system.heater.technology === 'heat-pump' ? 'Heat pump' : system.heater.technology === 'gas' ? 'Gas heater' : 'Electric heater'}`
                  : ''}
            descriptionTone={item.type === 'pool:filter' && system.pool && system.filter
              ? ((fittingPlan?.flow ?? 0) > (getPoolFilterData(system.filter.filterId)?.flowRate.max ?? Infinity) ? 'warning' : 'success')
              : 'muted'}
            onClick={() => activateTool(item.type)}
          >
            {item.type === 'pool:filter' && system.filter && <select aria-label="Filter model" className="mt-2 w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-2 text-xs" onClick={(event) => event.stopPropagation()} onChange={(event) => selectFilter(event.currentTarget.value)} onPointerDown={(event) => event.stopPropagation()} value={system.filter.filterId}>
              {POOL_FILTER_CATALOG.map((filter) => <option key={filter.id} value={filter.id}>{filter.name}</option>)}
            </select>}
            {item.type === 'pool:heater' && system.heater && <select aria-label="Heater technology" className="mt-2 w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-2 text-xs" onClick={(event) => event.stopPropagation()} onChange={(event) => selectHeaterTechnology(event.currentTarget.value as PoolHeaterNode['technology'])} onPointerDown={(event) => event.stopPropagation()} value={system.heater.technology}>
              <option value="heat-pump">Heat pump</option><option value="gas">Gas heater</option><option value="electric">Electric heater</option>
            </select>}
          </SystemRow>)}
        </div>
        <details className="rounded-lg border border-sidebar-border/70">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-2.5 text-xs [&::-webkit-details-marker]:hidden">
            <span>Hydraulic sizing inputs</span>
            <span aria-hidden="true" className="text-sidebar-foreground/45">⌄</span>
          </summary>
          <div className="flex flex-col gap-3 border-t border-sidebar-border/70 px-2.5 py-3">
            <SliderControl label="Flow override" min={0} max={100} onChange={(fittingFlowRate) => setPoolSettings({ fittingFlowRate })} precision={1} step={0.5} unit="m³/h" value={system.pool?.fittingFlowRate ?? draftSettings.fittingFlowRate} />
            <SliderControl label="Drain flow per outlet" min={1} max={1000} onChange={(drainFlowCapacity) => setPoolSettings({ drainFlowCapacity })} precision={0} step={1} unit="m³/h" value={system.pool?.drainFlowCapacity ?? draftSettings.drainFlowCapacity} />
          </div>
        </details>
        </section>
      </details>

      <details className="group border-b border-sidebar-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-3 py-3 [&::-webkit-details-marker]:hidden">
          <span className="font-semibold text-sm">Plumbing</span>
          <span aria-hidden="true" className="text-sidebar-foreground/45 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <section className="flex flex-col gap-3 px-3 pb-4">
          <div className="flex flex-col divide-y divide-sidebar-border/70">
            {PLUMBING_ITEMS.map((item) => <SystemRow
              count={counts[item.type] ?? 0}
              image={item.image}
              key={item.type}
              label={item.label}
              description=""
              onClick={() => activateTool(item.type)}
            />)}
          </div>
        </section>
      </details>

      <details className="group border-b border-sidebar-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-3 py-3 [&::-webkit-details-marker]:hidden">
          <span className="font-semibold text-sm">Pool features</span>
          <span aria-hidden="true" className="text-sidebar-foreground/45 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <section className="flex flex-col gap-3 px-3 pb-4">
          <div className="flex flex-col divide-y divide-sidebar-border/70">
            {FEATURE_ITEMS.map((item) => <SystemRow
              count={counts[item.type] ?? 0}
              image={item.image}
              key={item.type}
              label={item.label}
              description=""
              onClick={() => activateTool(item.type)}
            />)}
          </div>
        </section>
      </details>
    </div>
  )
}

function SystemRow({ count, image, label, description, descriptionTone = 'muted', onClick, disabled = false, children }: { count: number; image: string; label: string; description: string; descriptionTone?: 'muted' | 'success' | 'warning'; onClick: () => void; disabled?: boolean; children?: ReactNode }) {
  const descriptionColor = descriptionTone === 'success' ? 'text-emerald-400' : descriptionTone === 'warning' ? 'text-amber-400' : 'text-sidebar-foreground/50'
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (!disabled) onClick()
  }
  return <div className="flex flex-col py-2">
    <div
      aria-disabled={disabled}
      className={`flex min-h-[60px] items-center gap-2 rounded-lg px-2 transition-colors ${disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer hover:bg-sidebar-accent/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sidebar-ring'}`}
      onClick={() => { if (!disabled) onClick() }}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <img alt="" className="size-12 shrink-0 rounded-lg object-cover" src={image} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{label}</div>
        {(description || count > 0) && <div className={`truncate text-[11px] ${descriptionColor}`}>{description}{description && count ? ` · ${count} placed` : count ? `${count} placed` : ''}</div>}
      </div>
    </div>
    {children && <div className="pl-[56px]" onClick={(event) => event.stopPropagation()}>{children}</div>}
  </div>
}
