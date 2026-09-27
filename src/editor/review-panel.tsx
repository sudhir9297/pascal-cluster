'use client'

import { useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { planPoolFittings } from '../design/pool-fitting-layout'
import { isPoolPolygonPlaceable } from '../design/shapes'
import { resolvePoolPolygon } from '../core/schema'
import type { PoolFilterNode } from '../filter/core/schema'
import { getPoolFilterData } from '../filter/data/catalog'
import { getSelectedPool } from './pool-selection'

type ReviewCheck = { label: string; detail: string; status: 'ready' | 'attention' | 'info' }

export function PoolReviewPanel({ onOpenSystems }: { onOpenSystems: () => void }) {
  const selectedIds = useViewer((state) => state.selection.selectedIds)
  const review = useScene(useShallow((state) => {
    const pool = getSelectedPool(state.nodes, selectedIds)
    const nodes = Object.values(state.nodes) as Array<{ type: string; poolId?: string | null; parentId?: string | null }>
    const poolNodes = pool ? nodes.filter((node) => node.poolId === pool.id) : []
    const related = pool ? nodes.filter((node) => node.parentId === pool.parentId || node.poolId === pool.id) : []
    const filter = [...related].reverse().find((node) => node.type === 'pool:filter') as PoolFilterNode | undefined
    return {
      pool,
      filter,
      skimmers: poolNodes.filter((node) => node.type === 'pool:skimmer').length,
      inlets: poolNodes.filter((node) => node.type === 'pool:inlet').length,
      drains: poolNodes.filter((node) => node.type === 'pool:drain').length,
      pumps: related.filter((node) => node.type === 'pool:pump').length,
      filters: related.filter((node) => node.type === 'pool:filter').length,
      heaters: related.filter((node) => node.type === 'pool:heater').length,
      valves: related.filter((node) => node.type === 'pool:valve').length,
      stairs: poolNodes.filter((node) => node.type === 'pool:stair').length,
      waterfalls: related.filter((node) => node.type === 'pool:waterfall').length,
      spillovers: related.filter((node) => node.type === 'pool:spillover').length,
    }
  }))
  const plan = useMemo(() => review.pool ? planPoolFittings(review.pool) : null, [review.pool])

  if (!review.pool || !plan) {
    return <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <section className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-4">
        <h3 className="font-semibold text-sm">Review</h3>
        <p className="mt-1 text-xs text-sidebar-foreground/55">Place or select one pool to review its design.</p>
      </section>
    </div>
  }

  const pool = review.pool
  const checks: ReviewCheck[] = [
    {
      label: 'Pool outline',
      detail: isPoolPolygonPlaceable(resolvePoolPolygon(pool)) ? 'Valid closed outline' : 'Outline needs adjustment',
      status: isPoolPolygonPlaceable(resolvePoolPolygon(pool)) ? 'ready' : 'attention',
    },
    {
      label: 'Skimmers',
      detail: `${review.skimmers} placed · ${plan.counts.skimmer} recommended`,
      status: review.skimmers >= plan.counts.skimmer ? 'ready' : 'attention',
    },
    {
      label: 'Return inlets',
      detail: `${review.inlets} placed · ${plan.counts.inlet} recommended`,
      status: review.inlets >= plan.counts.inlet ? 'ready' : 'attention',
    },
    {
      label: 'Main drains',
      detail: `${review.drains} placed · ${plan.counts.drain} recommended`,
      status: review.drains >= plan.counts.drain ? 'ready' : 'attention',
    },
    {
      label: 'Fitting clearances',
      detail: plan.issues[0] ?? 'Recommended layout fits the outline',
      status: plan.issues.length ? 'attention' : 'ready',
    },
  ]
  const openChecks = checks.filter((check) => check.status === 'attention').length
  const filterCatalog = review.filter ? getPoolFilterData(review.filter.filterId) : null
  const filterNeedsReview = !!filterCatalog && plan.flow > filterCatalog.flowRate.max

  return <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
    <section className="border-b border-sidebar-border px-3 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">Readiness</h3>
        <span className={`text-xs ${openChecks ? 'text-amber-400' : 'text-emerald-400'}`}>{openChecks ? `${openChecks} to resolve` : 'Ready'}</span>
      </div>
      <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-3">
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-2xl font-semibold">{checks.length - openChecks}/{checks.length}</span>
          <span className="text-xs text-sidebar-foreground/60">checks passed</span>
        </div>
        <div className="flex flex-col divide-y divide-sidebar-border/70">
          {checks.map((check) => <ReviewRow check={check} key={check.label} />)}
        </div>
        {openChecks > 0 && <button className="mt-3 min-h-9 w-full rounded-lg bg-sidebar-accent px-3 text-xs font-medium hover:bg-sidebar-accent/80" onClick={onOpenSystems} type="button">Open systems</button>}
      </div>
      {filterCatalog && <div className="mt-3 flex items-center justify-between rounded-lg border border-sidebar-border/70 px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-xs font-medium">Filter flow capacity</div>
          <div className="truncate text-[11px] text-sidebar-foreground/55">Required {plan.flow.toFixed(1)} · rated to {filterCatalog.flowRate.max} m³/h</div>
        </div>
        <StatusDot status={filterNeedsReview ? 'attention' : 'ready'} />
      </div>}
    </section>

    <section className="border-b border-sidebar-border px-3 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">Pool summary</h3>
        <span className="truncate text-xs text-sidebar-foreground/50">{pool.shape.replaceAll('-', ' ')}</span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Metric label="Estimated volume" value={`${plan.volume.toFixed(1)} m³`} detail={`${Math.round(plan.volume * 1000).toLocaleString()} litres`} />
        <Metric label="Footprint area" value={`${plan.area.toFixed(1)} m²`} />
        <Metric label="Perimeter" value={`${plan.perimeter.toFixed(1)} m`} />
        <Metric label="Required flow" value={`${plan.flow.toFixed(1)} m³/h`} />
      </div>
      <div className="divide-y divide-sidebar-border/70 border-t border-sidebar-border/70">
        <SummaryLine label="Dimensions" value={`${pool.length.toFixed(2)} × ${pool.width.toFixed(2)} m`} />
        <SummaryLine label="Depth profile" value={pool.floorProfile === 'flat' ? `Flat · ${pool.depth.toFixed(2)} m` : `${pool.shallowDepth.toFixed(2)} → ${pool.deepDepth.toFixed(2)} m`} />
        <SummaryLine label="Interior finish" value={pool.interiorFinish.replaceAll('-', ' ')} />
        <SummaryLine label="Coping" value={`${pool.copingStyle.replaceAll('-', ' ')} · ${pool.copingWidth.toFixed(2)} m`} />
        <SummaryLine label="Water preset" value={pool.waterPreset.replaceAll('-', ' ')} />
      </div>
    </section>

    <section className="px-3 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">Placed items</h3>
        <span className="text-xs text-sidebar-foreground/50">{review.skimmers + review.inlets + review.drains + review.pumps + review.filters + review.heaters + review.valves + review.stairs + review.waterfalls + review.spillovers} total</span>
      </div>
      <div className="divide-y divide-sidebar-border/70">
        <SummaryLine label="Skimmers" value={`${review.skimmers} / ${plan.counts.skimmer}`} />
        <SummaryLine label="Return inlets" value={`${review.inlets} / ${plan.counts.inlet}`} />
        <SummaryLine label="Main drains" value={`${review.drains} / ${plan.counts.drain}`} />
        <SummaryLine label="Pump · filter · heater" value={`${review.pumps} · ${review.filters} · ${review.heaters}`} />
        <SummaryLine label="Valve · stair · water features" value={`${review.valves} · ${review.stairs} · ${review.waterfalls + review.spillovers}`} />
      </div>
    </section>
  </div>
}

function ReviewRow({ check }: { check: ReviewCheck }) {
  return <div className="flex items-start gap-2 py-2.5">
    <StatusDot status={check.status} />
    <div className="min-w-0 flex-1">
      <div className="text-xs font-medium">{check.label}</div>
      <div className="mt-0.5 text-[11px] leading-relaxed text-sidebar-foreground/55">{check.detail}</div>
    </div>
  </div>
}

function StatusDot({ status }: { status: ReviewCheck['status'] }) {
  return <span aria-label={status} className={`mt-1 size-2 shrink-0 rounded-full ${status === 'ready' ? 'bg-emerald-400' : status === 'attention' ? 'bg-amber-400' : 'bg-sidebar-foreground/40'}`} role="img" />
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-lg bg-sidebar-accent/25 p-2.5">
    <div className="text-[11px] text-sidebar-foreground/50">{label}</div>
    <div className="mt-1 font-mono text-sm font-medium">{value}</div>
    {detail && <div className="mt-0.5 text-[11px] text-sidebar-foreground/50">{detail}</div>}
  </div>
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 py-2.5 text-xs">
    <span className="text-sidebar-foreground/55">{label}</span>
    <span className="max-w-[58%] truncate text-right capitalize">{value}</span>
  </div>
}
