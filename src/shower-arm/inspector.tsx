'use client'
import {
  PanelSection,
  PanelWrapper,
  SliderControl,
  ToggleControl,
  PanelButton,
  PanelSelect,
} from '../inspector-controls'
import { SectionAccordion } from '../section/section-card'
import { showerArmSection } from '../section/shower-arm-section'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { ShowerArmNode, showerArmPresets, armOutletAngle, adjustableArmStyle } from './schema'
import { showerArmPlacement } from './placement'
import { ShowerArmShapePreview } from './preview'
export default function ShowerArmInspector({ node: raw }: { node: ShowerArmNode }) {
  const node = ShowerArmNode.parse(raw),
    setSelection = useViewer((s) => s.setSelection)
  const prepare = (patch: Partial<ShowerArmNode>): Partial<ShowerArmNode> => {
    if (patch.outletAngle !== undefined)
      patch = { ...patch, style: patch.style ?? adjustableArmStyle(node) }
    const next = ShowerArmNode.parse({ ...node, ...patch })
    const wall = useScene.getState().nodes[(next.wallId ?? next.parentId) as AnyNodeId]
    if (wall?.type !== 'wall') return {}
    const placement = showerArmPlacement(next, wall, next.position[0], next.side, 0, true)
    return placement ? { ...patch, ...placement } : {}
  }
  const update = (patch: Partial<ShowerArmNode>) =>
    useScene.getState().updateNode(node.id as AnyNodeId, prepare(patch) as Partial<AnyNode>)
  const slider = (
    key: keyof ShowerArmNode,
    label: string,
    min: number,
    max: number,
    step = 0.001,
  ) => (
    <SliderControl
      key={key}
      label={label}
      value={node[key] as number}
      min={min}
      max={max}
      step={step}
      precision={3}
      unit="m"
      onChange={(value) => update({ [key]: value })}
    />
  )
  return (
    <PanelWrapper title="Shower arm" onClose={() => setSelection({ selectedIds: [] })}>
      <SectionAccordion
        node={node}
        model={showerArmSection}
        onChange={update}
        preparePreview={prepare}
      />

      <PanelSection title="Shape" defaultExpanded>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Outlet shape">
          {(
            [
              { angle: 0, label: 'Straight' },
              { angle: 45, label: 'Angled' },
              { angle: 90, label: 'Elbow' },
            ] as const
          ).map((p) => {
            const selected =
              !node.style.endsWith('curved') &&
              !node.style.endsWith('gooseneck') &&
              armOutletAngle(node) === p.angle
            return (
              <PanelButton
                key={p.angle}
                type="button"
                aria-label={`${p.label} ${p.angle}°`}
                aria-pressed={selected}
                className={`rounded-lg border p-2 text-center transition-colors ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'}`}
                onClick={() =>
                  update({
                    style: node.style.startsWith('square')
                      ? 'square-adjustable'
                      : 'round-adjustable',
                    outletAngle: p.angle,
                  })
                }
              >
                <span className="block h-12">
                  <ShowerArmShapePreview
                    style={
                      node.style.startsWith('square') ? 'square-adjustable' : 'round-adjustable'
                    }
                    angle={p.angle}
                  />
                </span>
                <span className="block text-xs font-medium">{p.label}</span>
                <span className="block text-xs text-muted-foreground">{p.angle}°</span>
              </PanelButton>
            )
          })}
        </div>
        {!node.style.endsWith('curved') && !node.style.endsWith('gooseneck') && (
          <SliderControl
            label="Fine angle"
            value={armOutletAngle(node)}
            min={0}
            max={90}
            step={1}
            unit="°"
            onChange={(outletAngle) => update({ outletAngle })}
          />
        )}
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Arm profile">
          {showerArmPresets.map((p, i) => (
            <PanelButton
              key={p.style}
              type="button"
              aria-label={p.label}
              aria-pressed={adjustableArmStyle(node) === p.style}
              className={`rounded-lg border px-1 py-2 text-center ${adjustableArmStyle(node) === p.style ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'}`}
              onClick={() => update({ style: p.style, outletAngle: armOutletAngle(node) })}
            >
              <span className="block h-10">
                <ShowerArmShapePreview style={p.style} angle={armOutletAngle(node)} />
              </span>
              <span className="block text-xs font-medium">
                {['Round', 'Square', 'Curved', 'Arched'][i]}
              </span>
            </PanelButton>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Dimensions" defaultExpanded>
        {slider('length', 'Projection from wall', 0.1, 1.2)}
        {slider(
          'tubeSize',
          node.style.startsWith('square') ? 'Square tube width' : 'Tube diameter',
          0.015,
          0.06,
        )}
        {armOutletAngle(node) > 0 && slider('drop', 'Outlet drop', 0.04, 0.4)}
        {node.style.endsWith('gooseneck') && slider('rise', 'Arch rise', 0.04, 0.4)}
        {node.style.endsWith('curved') && slider('bendRadius', 'Bend radius', 0.02, 0.2)}
        {slider('connectorLength', 'Outlet connector length', 0.005, 0.04)}
      </PanelSection>
      <PanelSection title="Wall cover" defaultExpanded={false}>
        {node.children
          .filter(
            (id) =>
              String(useScene.getState().nodes[id as AnyNodeId]?.type) ===
              'bath-space:shower-flange',
          )
          .map((id) => (
            <PanelButton
              key={id}
              type="button"
              className="rounded border p-2 text-xs"
              onClick={() => setSelection({ selectedIds: [id as AnyNodeId] })}
            >
              Edit separate wall cover
            </PanelButton>
          ))}
        <ToggleControl
          label="Show flange"
          checked={node.flangeEnabled}
          onChange={(flangeEnabled) => update({ flangeEnabled })}
        />
        {node.flangeEnabled && (
          <>
            <label className="flex flex-col gap-1 text-xs">
              Flange shape
              <PanelSelect
                className="rounded-md border border-border bg-background p-2"
                value={node.flangeShape}
                onChange={(e) =>
                  update({ flangeShape: ShowerArmNode.shape.flangeShape.parse(e.target.value) })
                }
              >
                <option value="round">Round</option>
                <option value="square">Square</option>
              </PanelSelect>
            </label>
            {slider('flangeSize', 'Flange size', 0.04, 0.15)}
            {slider('flangeThickness', 'Flange thickness', 0.003, 0.03)}
          </>
        )}
      </PanelSection>
      <PanelSection title="Wall mounting" defaultExpanded={false}>
        {slider(
          'mountingHeight',
          'Connection height above floor',
          Math.min(0, node.mountingHeight),
          Math.max(4, node.mountingHeight + 1),
          0.01,
        )}
        <PanelButton
          type="button"
          className="rounded-md bg-accent px-3 py-2 text-xs"
          onClick={() => update({ side: node.side === 'front' ? 'back' : 'front' })}
        >
          Switch wall face
        </PanelButton>
      </PanelSection>
    </PanelWrapper>
  )
}
