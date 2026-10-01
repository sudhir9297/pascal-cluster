'use client'
import { PanelWrapper, PanelSection, SliderControl, PanelButton } from '../inspector-controls'
import { ShowerSectionAccordion } from '../section/shower-section-card'
import { showerFlangeSection } from './section'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { ShowerFlangeNode, showerFlangePresets, flangePresetNode } from './schema'
export default function ShowerFlangeInspector({ node: n }: { node: ShowerFlangeNode }) {
  const update = (patch: Partial<ShowerFlangeNode>) =>
    useScene
      .getState()
      .updateNode(
        n.id as AnyNodeId,
        ShowerFlangeNode.parse({ ...n, ...patch }) as unknown as Partial<AnyNode>,
      )
  const slider = (
    key: 'width' | 'depth' | 'cornerRadius' | 'clearance',
    label: string,
    min: number,
    max: number,
  ) => (
    <SliderControl
      label={label}
      value={n[key]}
      min={min}
      max={max}
      step={0.0005}
      precision={4}
      unit="m"
      onChange={(v) => update({ [key]: v })}
    />
  )
  return (
    <PanelWrapper
      title="Shower arm wall cover"
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <ShowerSectionAccordion node={n} model={showerFlangeSection} onChange={update} />

      <PanelSection title="Cover shape" defaultExpanded>
        <div className="grid grid-cols-2 gap-2">
          {showerFlangePresets.map((p) => (
            <PanelButton
              key={p.id}
              type="button"
              className="rounded border p-2 text-xs"
              onClick={() => {
                const x = flangePresetNode(p)
                update({
                  style: x.style,
                  width: x.width,
                  depth: x.depth,
                  cornerRadius: x.cornerRadius,
                  clearance: x.clearance,
                })
              }}
            >
              {p.label}
            </PanelButton>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Dimensions" defaultExpanded>
        {slider('width', 'Cover width', 0.04, 0.18)}
        {slider('depth', 'Cover depth', 0.003, 0.06)}
        {n.style === 'soft-square' && slider('cornerRadius', 'Corner radius', 0.002, 0.035)}
        {slider('clearance', 'Tube clearance', 0.0005, 0.005)}
      </PanelSection>
    </PanelWrapper>
  )
}
