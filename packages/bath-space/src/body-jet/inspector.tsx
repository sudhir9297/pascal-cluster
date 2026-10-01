'use client'
import {
  PanelWrapper,
  PanelSection,
  SliderControl,
  ToggleControl,
  PanelButton,
} from '../inspector-controls'
import { ShowerSectionAccordion } from '../section/shower-section-card'
import { bodyJetSection } from './section'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { BodyJetNode, bodyJetPresets, bodyJetPresetParameters } from './schema'
import { bodyJetSockets, roundBodyJet } from './targets'
import { showerArmPlacement } from '../shower-arm/placement'
export default function BodyJetInspector({ node: n }: { node: BodyJetNode }) {
  const nodes = useScene((s) => s.nodes)
  const compatible = (next: BodyJetNode) => {
    const ids = new Set(bodyJetSockets(next).map((s) => s.id))
    return n.children.every((id) => {
      const child = nodes[id as AnyNodeId] as unknown as { slotId?: string } | undefined
      return !child?.slotId || ids.has(child.slotId)
    })
  }
  const update = (patch: Partial<BodyJetNode>) => {
    const next = BodyJetNode.parse({ ...n, ...patch })
    if (!compatible(next)) return
    const wall = nodes[(next.wallId ?? next.parentId) as AnyNodeId]
    if (wall?.type !== 'wall') return
    const pose = showerArmPlacement(next, wall, next.position[0], next.side, 0, true)
    if (pose)
      useScene.getState().updateNode(n.id as AnyNodeId, { ...patch, ...pose } as Partial<AnyNode>)
  }
  const slider = (
    key:
      | 'width'
      | 'height'
      | 'projection'
      | 'faceDepth'
      | 'groupSpacing'
      | 'nozzleSpacing'
      | 'nozzleDiameter'
      | 'flangeSize'
      | 'flangeThickness'
      | 'mountingHeight',
    label: string,
    min: number,
    max: number,
    step = 0.001,
  ) => (
    <SliderControl
      key={key}
      label={label}
      value={n[key]}
      min={min}
      max={max}
      step={step}
      precision={3}
      unit="m"
      onChange={(v) => update({ [key]: v })}
    />
  )
  return (
    <PanelWrapper
      title="Body shower jets"
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <ShowerSectionAccordion node={n} model={bodyJetSection} onChange={update} />

      <PanelSection title="Spray model" defaultExpanded>
        <div className="grid grid-cols-3 gap-2">
          {bodyJetPresets.map((p) => (
            <PanelButton
              key={p.id}
              type="button"
              className="rounded border p-2 text-xs disabled:opacity-40"
              disabled={!compatible({ ...n, ...bodyJetPresetParameters(p) })}
              onClick={() => update(bodyJetPresetParameters(p))}
            >
              {p.label}
            </PanelButton>
          ))}
        </div>
        {slider('width', roundBodyJet(n) ? 'Face diameter' : 'Face width', 0.04, 0.18)}
        {!roundBodyJet(n) && slider('height', 'Face height', 0.04, 0.2)}
        {slider('projection', 'Minimum face pivot from wall', 0.008, 0.09)}
        {slider('faceDepth', 'Face thickness', 0.004, 0.018)}
        <SliderControl
          label="Vertical spray angle"
          value={n.pitch}
          min={-30}
          max={30}
          step={1}
          unit="°"
          onChange={(v) => update({ pitch: v })}
        />
        <SliderControl
          label="Horizontal spray angle"
          value={n.yaw}
          min={-30}
          max={30}
          step={1}
          unit="°"
          onChange={(v) => update({ yaw: v })}
        />
        <ToggleControl
          label="Show nozzles"
          checked={n.nozzlesEnabled}
          onChange={(v) => update({ nozzlesEnabled: v })}
        />
        {n.nozzlesEnabled && (
          <>
            {slider('nozzleSpacing', 'Nozzle spacing', 0.006, 0.025)}
            {slider('nozzleDiameter', 'Nozzle diameter', 0.0015, 0.005, 0.0005)}
          </>
        )}
      </PanelSection>
      <PanelSection title="Grouped jets" defaultExpanded>
        <SliderControl
          label="Jet count"
          value={n.jetCount}
          min={1}
          max={4}
          step={1}
          onChange={(v) => update({ jetCount: v })}
        />
        {n.jetCount > 1 && (
          <>
            <div className="flex gap-2">
              {(['vertical', 'horizontal'] as const).map((v) => (
                <PanelButton
                  key={v}
                  type="button"
                  className="rounded border p-2 text-xs"
                  aria-pressed={n.groupDirection === v}
                  onClick={() => update({ groupDirection: v })}
                >
                  {v}
                </PanelButton>
              ))}
            </div>
            {slider('groupSpacing', 'Spacing (fits jet size)', 0.1, 0.5)}
          </>
        )}
      </PanelSection>
      <PanelSection title="Wall mounting" defaultExpanded>
        {slider('mountingHeight', 'Group centre above floor', 0.5, 3.5, 0.01)}
        <ToggleControl
          label="Show wall flanges"
          checked={n.flangeEnabled}
          onChange={(v) => update({ flangeEnabled: v })}
        />
        {n.flangeEnabled && (
          <>
            {slider('flangeSize', 'Flange size (fits face)', 0.05, 0.22)}
            {slider('flangeThickness', 'Flange thickness', 0.003, 0.018)}
          </>
        )}
        <PanelButton
          type="button"
          className="rounded border p-2 text-xs"
          onClick={() => update({ side: n.side === 'front' ? 'back' : 'front' })}
        >
          Switch wall face
        </PanelButton>
      </PanelSection>
    </PanelWrapper>
  )
}
