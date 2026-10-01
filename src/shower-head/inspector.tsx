'use client'
import {
  PanelWrapper,
  PanelSection,
  SliderControl,
  ToggleControl,
  PanelButton,
  PanelSelect,
} from '../inspector-controls'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { ShowerHeadNode, showerHeadPresets } from './schema'
import { isCircularHead } from './geometry'
import { ShowerHeadPreview } from './catalog'
import { SectionAccordion } from '../section/section-card'
import { showerHeadSection } from '../section/shower-head-section'
export default function ShowerHeadInspector({ node: raw }: { node: ShowerHeadNode }) {
  const n = ShowerHeadNode.parse(raw),
    setSelection = useViewer((s) => s.setSelection)
  const update = (patch: Partial<ShowerHeadNode>) =>
    useScene.getState().updateNode(n.id as AnyNodeId, patch as Partial<AnyNode>)
  const slider = (
    key: keyof ShowerHeadNode,
    label: string,
    min: number,
    max: number,
    step = 0.001,
  ) => (
    <SliderControl
      key={key}
      label={label}
      value={n[key] as number}
      min={min}
      max={max}
      step={step}
      precision={3}
      unit="m"
      onChange={(value) => update({ [key]: value })}
    />
  )
  return (
    <PanelWrapper title="Shower head" onClose={() => setSelection({ selectedIds: [] })}>
      <SectionAccordion node={n} model={showerHeadSection} onChange={update} />

      <PanelSection title="Shape" defaultExpanded>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Shower head shape">
          {showerHeadPresets.map((p) => (
            <PanelButton
              key={p.style}
              type="button"
              aria-label={p.label}
              aria-pressed={n.style === p.style}
              className={`rounded-lg border p-2 text-center text-xs transition-colors ${n.style === p.style ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
              onClick={() => {
                update({ style: p.style })
              }}
            >
              <span className="block h-12">
                <ShowerHeadPreview style={p.style} />
              </span>
              <span className="block text-xs font-medium">{p.label}</span>
            </PanelButton>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Dimensions" defaultExpanded>
        {slider('width', isCircularHead(n) ? 'Head diameter' : 'Head width', 0.06, 0.6)}
        {!isCircularHead(n) && slider('depth', 'Head depth', 0.06, 0.6)}
        {n.style === 'bell'
          ? slider('bellHeight', 'Bell height', 0.03, 0.18)
          : slider('thickness', 'Head thickness', 0.008, 0.1)}
        {n.style === 'soft-square' &&
          slider('cornerRadius', 'Corner radius', 0.002, Math.min(0.12, n.width / 2, n.depth / 2))}
      </PanelSection>
      <PanelSection title="Connection and orientation" defaultExpanded={false}>
        {slider('neckLength', 'Connector length', 0.015, 0.15)}
        {slider('neckDiameter', 'Connector diameter', 0.015, 0.05)}
        <SliderControl
          label="Head tilt"
          value={n.tilt}
          min={-20}
          max={20}
          step={1}
          unit="°"
          onChange={(tilt) => update({ tilt })}
        />
        <SliderControl
          label="Head swivel"
          value={n.swivel}
          min={-180}
          max={180}
          step={1}
          unit="°"
          onChange={(swivel) => update({ swivel })}
        />
      </PanelSection>
      <PanelSection title="Spray face" defaultExpanded={false}>
        <ToggleControl
          label="Show nozzles"
          checked={n.nozzlesEnabled}
          onChange={(nozzlesEnabled) => update({ nozzlesEnabled })}
        />
        {n.nozzlesEnabled && (
          <>
            <label className="flex flex-col gap-1 text-xs">
              Nozzle arrangement
              <PanelSelect
                value={n.nozzleLayout}
                className="rounded border border-border bg-background p-2"
                onChange={(e) =>
                  update({ nozzleLayout: ShowerHeadNode.shape.nozzleLayout.parse(e.target.value) })
                }
              >
                <option value="grid">Grid</option>
                <option value="rings">Rings for round heads</option>
              </PanelSelect>
            </label>
            {slider('nozzleSpacing', 'Nozzle spacing', 0.008, 0.045)}
            {slider('nozzleDiameter', 'Nozzle diameter', 0.0015, 0.006, 0.0005)}
          </>
        )}
      </PanelSection>
    </PanelWrapper>
  )
}
