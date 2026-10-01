'use client'
import {
  PanelWrapper,
  PanelSection,
  SliderControl,
  PanelButton,
  PanelSelect,
} from '../inspector-controls'
import { ShowerSectionAccordion } from '../section/shower-section-card'
import { showerHoseSection } from './section'
import { showerSupplyHost } from '../shower-common/supply-host'
import { useState } from 'react'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { ShowerHoseNode, showerHosePresets } from './schema'
import { hoseTargetId, connectShowerHose, hoseConnection } from './connection'
import { hoseCurve } from './geometry'
import { HAND_SHOWER } from '../hand-shower/schema'
export default function ShowerHoseInspector({ node: n }: { node: ShowerHoseNode }) {
  const [error, setError] = useState<string | null>(null)
  const nodes = useScene((s) => s.nodes),
    update = (patch: Partial<ShowerHoseNode>) =>
      useScene.getState().updateNode(n.id as AnyNodeId, patch as Partial<AnyNode>),
    pose = hoseConnection(n, (id) => nodes[id as AnyNodeId]),
    valid = pose && hoseCurve(n, pose.end, pose.endDirection)
  const choose = (sourceId: string, targetId: string) => {
    try {
      const { changes } = connectShowerHose(n, sourceId, targetId, nodes, n.id)
      useScene.getState().applyNodeChanges(changes)
      setError(null)
    } catch {
      setError('Choose an outlet and mounted handset on the same level.')
    }
  }
  const sources = Object.values(nodes).filter((o) =>
    showerSupplyHost(o)?.slots.some((s) => s.id === 'hose'),
  )
  const targets = Object.values(nodes).filter(
    (o) =>
      String(o.type) === HAND_SHOWER &&
      hoseConnection(
        { ...n, followHostHandset: false, targetId: o.id },
        (id) => nodes[id as AnyNodeId],
      ),
  )
  return (
    <PanelWrapper
      title="Shower hose"
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <ShowerSectionAccordion node={n} model={showerHoseSection} onChange={update} />

      <PanelSection title="Hose appearance" defaultExpanded>
        <div className="grid grid-cols-3 gap-2">
          {showerHosePresets.map((p) => (
            <PanelButton
              key={p.style}
              type="button"
              aria-pressed={n.style === p.style}
              className="rounded border p-2 text-xs"
              onClick={() => update({ style: p.style })}
            >
              {p.label}
            </PanelButton>
          ))}
        </div>
        {(
          [
            'length',
            'diameter',
            'connectorLength',
            'bow',
            ...(n.style === 'smooth' ? [] : (['ribSpacing'] as const)),
          ] as const
        ).map((key) => (
          <SliderControl
            key={key}
            label={
              {
                length: 'Hose length',
                diameter: 'Hose diameter',
                connectorLength: 'Connector length',
                bow: 'Forward drape',
                ribSpacing: 'Rib spacing',
              }[key]
            }
            value={n[key]}
            min={
              { length: 0.5, diameter: 0.01, connectorLength: 0.015, bow: 0, ribSpacing: 0.003 }[
                key
              ]
            }
            max={
              { length: 3, diameter: 0.025, connectorLength: 0.05, bow: 0.3, ribSpacing: 0.015 }[
                key
              ]
            }
            step={key === 'length' ? 0.05 : 0.001}
            unit="m"
            precision={3}
            onChange={(v) => update({ [key]: v })}
          />
        ))}
      </PanelSection>
      <PanelSection title="Connections" defaultExpanded>
        {error && (
          <p role="alert" className="text-xs">
            {error}
          </p>
        )}
        <label className="block text-xs">
          Supply outlet
          <PanelSelect
            className="my-2 w-full rounded border bg-background p-2"
            value={n.parentId ?? ''}
            onChange={(e) =>
              choose(e.target.value, hoseTargetId(n, (id) => nodes[id as AnyNodeId]) ?? '')
            }
          >
            <option value="" disabled>
              Choose supply outlet
            </option>
            {sources.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name || 'Supply outlet'} · {o.id.slice(-5)}
              </option>
            ))}
          </PanelSelect>
        </label>
        <label className="block text-xs">
          Hand shower
          <PanelSelect
            className="my-2 w-full rounded border bg-background p-2"
            value={hoseTargetId(n, (id) => nodes[id as AnyNodeId]) ?? ''}
            onChange={(e) => choose(n.parentId ?? '', e.target.value)}
          >
            <option value="">Choose mounted handset</option>
            {targets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name || 'Hand shower'} · {o.id.slice(-5)}
              </option>
            ))}
          </PanelSelect>
        </label>
        {(!pose || !valid) && (
          <p role="status" className="text-xs text-muted-foreground">
            {!pose
              ? 'Connect both ends to fittings on the same level.'
              : 'Hose too short. Increase its length or move the fittings closer.'}
          </p>
        )}
      </PanelSection>
    </PanelWrapper>
  )
}
