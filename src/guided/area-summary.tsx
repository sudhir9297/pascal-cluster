'use client'
import { useId, useState } from 'react'
import { useScene, type AnyNode, type AnyNodeId, type LevelNode } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useEditor } from '@pascal-app/editor'
import { PlacedPreview } from '../catalog-panel'
import { fixtureReplacementChanges, fixtureReplacementOptions } from './replacement'

const button = 'rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40'
const stop = () => { useEditor.getState().setTool(null); useEditor.getState().setMode('select') }

function FixtureSummary({ node, levelId, plain = false }: { node: AnyNode; plain?: boolean; levelId: LevelNode['id'] }) {
  const [replacing, setReplacing] = useState(false)
  const [optionId, setOptionId] = useState('')
  const [message, setMessage] = useState('')
  const labelId = useId()
  const readOnly = useScene((state) => state.readOnly)
  const selected = useViewer((state) => state.selection.selectedIds.includes(node.id))
  const options = fixtureReplacementOptions(node)
  const kind = String(node.type).replace('bath-space:', '').replaceAll('-', ' ')
  const raw = node as unknown as Record<string, unknown>
  const dimensions = ['length', 'width', 'depth', 'height'].flatMap((key) => typeof raw[key] === 'number' ? [`${key} ${Math.round((raw[key] as number) * 1000)} mm`] : []).join(' · ')
  const edit = () => { stop(); useViewer.getState().setSelection({ levelId, selectedIds: [node.id as AnyNodeId] }) }
  return (
    <div className={plain ? 'space-y-3 border-t border-border/60 pt-4' : `space-y-2 rounded-md border p-3 ${selected ? 'border-primary' : 'border-border'}`}>
      <div><p className="text-xs font-medium">{node.name || kind}</p>{node.name && node.name.toLowerCase() !== kind && <p className="mt-0.5 text-[11px] text-muted-foreground">{kind}</p>}{dimensions && <p className="mt-1 text-[11px] text-muted-foreground">{dimensions}</p>}</div>
      <div className="flex gap-2">
        <button type="button" className={button} aria-label={`Edit ${node.name || kind}`} onClick={edit}>Edit</button>
        {options.length > 0 && <button type="button" className={button} disabled={readOnly} aria-expanded={replacing} aria-label={`Replace ${node.name || kind}`} onClick={() => { stop(); setReplacing(!replacing); setOptionId(''); setMessage('') }}>Replace</button>}
      </div>
      {replacing && <div className="space-y-2 border-t border-border pt-2">
        <label id={labelId} className="block text-xs font-medium">Replacement style</label>
        <p className="text-[11px] text-muted-foreground">Choose a style for this mounting. Position, overall size, finishes, and attached fittings are kept.</p>
        <select aria-labelledby={labelId} value={optionId} onChange={(event) => setOptionId(event.target.value)} className="w-full rounded-md border border-border bg-secondary p-2 text-xs">
          <option value="">Choose a replacement</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="button" disabled={!optionId || readOnly} className={`${button} bg-primary text-primary-foreground hover:bg-primary/90`} onClick={() => {
            stop()
            const state = useScene.getState()
            if (state.readOnly) return
            const changes = fixtureReplacementChanges(levelId, node.id, optionId, state.nodes)
            if (!changes) { setMessage('This fixture changed. Choose another replacement.'); return }
            state.applyNodeChanges(changes)
            edit()
            setReplacing(false)
            setMessage('Replacement applied. Attached fittings kept.')
          }}>Apply replacement</button>
          <button type="button" className={button} onClick={() => { setReplacing(false); setMessage('') }}>Cancel</button>
        </div>
      </div>}
      {message && <p role="status" className="text-[11px] text-muted-foreground">{message}</p>}
    </div>
  )
}

export default function AreaSummary({ title, nodes, levelId, visual = false, hideHeading = false }: { title: string; nodes: AnyNode[]; levelId: LevelNode['id']; visual?: boolean; hideHeading?: boolean }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = nodes.find((node) => node.id === activeId) ?? nodes[0]
  if (visual) return <section aria-label={title} className="space-y-4">
    {!hideHeading && <div className="flex items-center justify-between"><h2 className="text-xs font-semibold">Your wash area</h2><span className="flex items-center gap-1 text-[11px] text-muted-foreground"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 8 3 3 7-7" /></svg>Complete</span></div>}
    <div className={`grid gap-3 ${nodes.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`} aria-label={title}>
      {nodes.map((node) => {
        const type = String(node.type)
        const label = type.includes('vanity') ? 'Vanity' : type.includes('basin') ? 'Basin' : type === 'bath-space:tap' ? 'Tap' : type.includes('mirror') ? 'Mirror' : type.includes('toilet-paper-holder') ? 'Holder' : type.includes('toilet') ? 'Toilet' : type.includes('flush') ? 'Flush' : type.includes('bathtub') ? 'Bath' : type.includes('shower-arm') ? 'Arm' : type.includes('shower-head') ? 'Head' : type.includes('shower-mount') ? 'Rail' : type.includes('hand-shower') ? 'Handset' : type.includes('shower-hose') ? 'Hose' : type.includes('shower-control') ? 'Controls' : type.includes('shower') ? 'Shower' : node.name || type.replace('bath-space:', '').replaceAll('-', ' ')
        return <button key={node.id} type="button" aria-label={`View ${node.name || label}`} aria-pressed={active?.id === node.id} onClick={() => setActiveId(node.id)} className={`min-w-0 border-0 border-b-2 bg-transparent px-0 pb-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active?.id === node.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <span aria-hidden="true" className={`mb-2 block w-full ${hideHeading ? 'h-16' : 'h-20'}`}><PlacedPreview node={node} /></span>
          <span className="text-xs font-medium">{label}</span>
        </button>
      })}
    </div>
    {active && <FixtureSummary key={active.id} node={active} levelId={levelId} plain />}
  </section>
  return <section aria-label={title} className="space-y-2"><h2 className="text-xs font-semibold">{title}</h2>{nodes.map((node) => <FixtureSummary key={node.id} node={node} levelId={levelId} />)}</section>
}
