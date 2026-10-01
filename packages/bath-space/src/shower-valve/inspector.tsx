'use client'
import {
  PanelWrapper,
  PanelSection,
  SliderControl,
  ToggleControl,
  PanelButton,
} from '../inspector-controls'
import { ShowerSectionAccordion } from '../section/shower-section-card'
import { showerValveSection } from './section'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { ShowerValveNode, showerValvePresets, valvePresetNode } from './schema'
import { attachShowerValve } from './attachment'
import { useState } from 'react'
export default function ShowerValveInspector({ node: n }: { node: ShowerValveNode }) {
  const [error, setError] = useState<string | null>(null)
  const update = (patch: Partial<ShowerValveNode>) => {
    try {
      const next = ShowerValveNode.parse({ ...n, ...patch })
      const result = attachShowerValve(next, n.parentId!, useScene.getState().nodes, n.id)
      useScene
        .getState()
        .updateNode(n.id as AnyNodeId, result.placed as unknown as Partial<AnyNode>)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  const slider = (
    key: 'width' | 'height' | 'mountingDepth' | 'portDiameter' | 'portLength',
    label: string,
    min: number,
    max: number,
  ) => (
    <SliderControl
      label={label}
      value={n[key]}
      min={min}
      max={max}
      step={0.001}
      precision={3}
      unit="m"
      onChange={(v) => update({ [key]: v })}
    />
  )
  return (
    <PanelWrapper
      title="Concealed valve body"
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <ShowerSectionAccordion node={n} model={showerValveSection} onChange={update} />

      <PanelSection title="Valve family" defaultExpanded>
        <div className="grid grid-cols-2 gap-2">
          {showerValvePresets.map((p) => (
            <PanelButton
              key={p.id}
              type="button"
              className="rounded border p-2 text-xs"
              onClick={() => {
                const next = valvePresetNode(p)
                const {
                  id,
                  type,
                  parentId,
                  children,
                  position,
                  rotation,
                  metadata,
                  name,
                  visible,
                  object,
                  slots,
                  ...params
                } = next
                update(params)
              }}
            >
              {p.label}
            </PanelButton>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Body and connections" defaultExpanded>
        <ToggleControl
          label="Round cast body"
          checked={n.bodyShape === 'round'}
          onChange={(v) => update({ bodyShape: v ? 'round' : 'rectangular' })}
        />
        {slider('width', 'Body width', 0.06, 0.24)}
        {slider('height', 'Body height', 0.06, 0.3)}
        {slider('mountingDepth', 'Depth behind wall face', 0.04, 0.2)}
        {slider('portDiameter', 'Port diameter', 0.015, 0.035)}
        {slider('portLength', 'Port projection', 0.01, 0.04)}
        <SliderControl
          label="Water outlet count"
          value={n.outletCount}
          min={1}
          max={3}
          step={1}
          onChange={(v) => update({ outletCount: v })}
        />
        <ToggleControl
          label="Service stops"
          checked={n.serviceStops}
          onChange={(v) => update({ serviceStops: v })}
        />
        <ToggleControl
          label="Installation housing"
          checked={n.housingEnabled}
          onChange={(v) => update({ housingEnabled: v })}
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </PanelSection>
    </PanelWrapper>
  )
}
