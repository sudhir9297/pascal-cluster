'use client'

import { useScene } from '@pascal-app/core'
import { ActionButton, ActionGroup } from '@pascal-app/editor'
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_POOL_PIPE_OPTIONS, type PoolPipeLayout, type PoolPipeOptions, type PoolPipeCircuit } from '../design/pool-pipe-layout'
import { commitPoolPipes, type preparePoolPipes } from './pool-pipe-plan'
import { preparePoolPipesAsync } from './pool-pipe-client'
import { deletePoolConnection, poolConnectionState } from './pool-connection-state'

export function ConnectInlets({ node }: { node: { id: string } }) {
  return <PoolConnectionForm key={node.id} poolId={node.id} circuit="inlets" />
}

export function ConnectSkimmers({ node }: { node: { id: string } }) {
  return <PoolConnectionForm key={node.id} poolId={node.id} circuit="skimmers" />
}

export function ConnectDrains({ node }: { node: { id: string } }) {
  return <PoolConnectionForm key={node.id} poolId={node.id} circuit="drains" />
}

function PoolConnectionForm({ poolId, circuit }: { poolId: string; circuit: PoolPipeCircuit }) {
  const nodes = useScene((state) => state.nodes)
  const readOnly = useScene((state) => state.readOnly)
  const [options, setOptions] = useState({ ...DEFAULT_POOL_PIPE_OPTIONS, circuit })
  const [active, setActive] = useState(false)
  const [message, setMessage] = useState('')
  const connection = useMemo(() => poolConnectionState(poolId, circuit, nodes), [poolId, circuit, nodes])
  const [result, setResult] = useState<{ plan: ReturnType<typeof preparePoolPipes> | null; error: string; options: PoolPipeOptions } | null>(null)
  const [pending, setPending] = useState(false)
  useEffect(() => {
    if (!active || connection.status !== 'empty') { setResult(null); setPending(false); return }
    let current = true
    let cancel = () => {}
    setPending(true)
    try {
      const request = preparePoolPipesAsync(poolId, options, nodes)
      cancel = request.cancel
      request.promise.then(plan => {
        if (current) { setResult({ plan, error: '', options }); setPending(false) }
      }, error => {
        if (current) { setResult({ plan: null, error: error instanceof Error ? error.message : 'Could not plan pool pipes.', options }); setPending(false) }
      })
    } catch (error) {
      setResult({ plan: null, error: error instanceof Error ? error.message : 'Could not plan pool pipes.', options })
      setPending(false)
    }
    return () => { current = false; cancel() }
  }, [active, connection.status, nodes, options, poolId])
  const change = (patch: Partial<PoolPipeOptions>) => { setOptions((previous) => ({ ...previous, ...patch })); setMessage('') }
  const create = () => {
    if (pending || result?.options !== options || !result?.plan || result.plan.snapshot !== nodes) return
    try {
      commitPoolPipes(result.plan)
      setMessage('')
      setActive(false)
    } catch (error) { setMessage(error instanceof Error ? error.message : `Could not connect ${circuit}.`) }
  }
  return <div className="flex flex-col gap-2 px-3 py-2">
    {connection.status !== 'empty' ? <>
      <ActionGroup>
        <ActionButton label={connection.status === 'connected' ? 'Connected' : 'Partially connected'} disabled />
        <ActionButton label={circuit === 'inlets' ? 'Delete connection & inlets' : 'Delete connection'} disabled={readOnly || connection.shared || !connection.pipeIds.length} onClick={() => {
          try { deletePoolConnection(poolId, circuit); setActive(false); setMessage('') }
          catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete this connection.') }
        }} />
      </ActionGroup>
      {connection.shared && <p className="text-xs text-muted-foreground" role="status">Shared with another pool connection.</p>}
    </> : !active ? <>
      <ActionGroup><ActionButton label={`Connect ${circuit}`} disabled={readOnly} onClick={() => { setActive(true); setMessage('') }} /></ActionGroup>
    </> : <>
      {result?.plan && <RoutePreview plan={result.plan} exitCorner={options.exitCorner} onCorner={(exitCorner) => change({ exitCorner })} />}
      <label className="flex items-center justify-between gap-2 text-xs">Exit position
        <select className="rounded border border-border bg-background p-1" value={options.exitCorner} onChange={(event) => change({ exitCorner: Number(event.target.value) })}>
          {['Upper left', 'Upper right', 'Lower right', 'Lower left'].map((label, i) => <option key={label} value={i}>{label}</option>)}
        </select>
      </label>
      <label className="flex items-center justify-between gap-2 text-xs">Distance from wall (m)
        <input className="w-20 rounded border border-border bg-background p-1" type="number" min="0" step="0.1" value={Number.isFinite(options.clearance) ? options.clearance : ''} onChange={(event) => change({ clearance: event.target.valueAsNumber })} />
      </label>
      <label className="flex items-center justify-between gap-2 text-xs">Additional depth (m)
        <input className="w-20 rounded border border-border bg-background p-1" type="number" min="0" step="0.1" value={Number.isFinite(options.drop) ? options.drop : ''} onChange={(event) => change({ drop: event.target.valueAsNumber })} />
      </label>
      {pending && <p className="text-xs text-muted-foreground" role="status">Updating pipe route…</p>}
      {result?.error && <p className="text-xs text-muted-foreground" role="alert">{result.error}</p>}
      <ActionGroup>
        <ActionButton label="Create pipes" disabled={pending || result?.options !== options || !result?.plan || result.plan.snapshot !== nodes || readOnly} onClick={create} />
        <ActionButton label="Cancel" onClick={() => { setActive(false); setMessage('') }} />
      </ActionGroup>
    </>}
    {message && <p className="text-xs text-muted-foreground" role="status">{message}</p>}
  </div>
}

function RoutePreview({ plan, exitCorner, onCorner }: { plan: PoolPipeLayout; exitCorner: number; onCorner: (corner: number) => void }) {
  const points = plan.preview.flat()
  const minX = Math.min(...points.map((p) => p[0])), maxX = Math.max(...points.map((p) => p[0]))
  const minZ = Math.min(...points.map((p) => p[2])), maxZ = Math.max(...points.map((p) => p[2]))
  const allX = [...plan.corners.map((p) => p[0]), minX, maxX]
  const allZ = [...plan.corners.map((p) => p[2]), minZ, maxZ]
  const left = Math.min(...allX), top = Math.min(...allZ)
  const scale = Math.min(220 / (Math.max(...allX) - left), 150 / (Math.max(...allZ) - top))
  const x = (value: number) => 20 + (value - left) * scale
  const z = (value: number) => 20 + (value - top) * scale
  return <svg viewBox="0 0 260 190" className="w-full rounded border border-border bg-background" aria-label="Top view of proposed pool pipes and exit positions">
    <polygon points={plan.polygon.map(([px, pz]) => `${x(px)},${z(pz)}`).join(' ')} fill="#38bdf8" fillOpacity="0.15" stroke="#38bdf8" />
    {plan.preview.map(([a, b], i) => <line key={i} x1={x(a[0])} y1={z(a[2])} x2={x(b[0])} y2={z(b[2])} stroke="#4ade80" strokeWidth="3" />)}
    <circle cx={x(plan.freeEndLocal[0])} cy={z(plan.freeEndLocal[2])} r="5" fill="#4ade80"><title>Free pipe end</title></circle>
    {plan.corners.map((corner, i) => <g key={i} role="button" tabIndex={0} aria-label={`Exit position ${i + 1}`} aria-pressed={exitCorner === i} onClick={() => onCorner(i)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onCorner(i) } }} className="cursor-pointer">
      <circle cx={x(corner[0])} cy={z(corner[2])} r="10" fill={exitCorner === i ? '#16a34a' : '#334155'} stroke="white" />
      <text x={x(corner[0])} y={z(corner[2]) + 3} textAnchor="middle" fill="white" fontSize="10">{i + 1}</text>
    </g>)}
  </svg>
}
