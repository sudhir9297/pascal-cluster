'use client'
import {
  PanelSection,
  PanelWrapper,
  SliderControl,
  ToggleControl,
  PanelButton,
  PanelSelect,
} from '../inspector-controls'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import ToiletControlsPanel from '../flush-control/toilet-panel'
import { defaultToiletControl, toiletFlushControls } from '../flush-control/attachment'
import { WALL_FLUSH_PLATE, CISTERN_FLUSH_CONTROL } from '../flush-control/schema'
import { SectionAccordion } from '../section/section-card'
import { toiletSection } from './section'
import { WallHungToiletNode, toiletLayout, toiletPresets } from './schema'
import { toiletPlacement } from './placement'
export default function ToiletInspector({ node: raw }: { node: WallHungToiletNode }) {
  const node = WallHungToiletNode.parse(raw),
    setSelection = useViewer((s) => s.setSelection)
  const prepare = (patch: Partial<WallHungToiletNode>) => {
    const next = WallHungToiletNode.parse({
        ...node,
        ...patch,
        mountingHeight: patch.mountingHeight ?? node.mountingHeight,
      }),
      wall = useScene.getState().nodes[(next.wallId ?? next.parentId) as AnyNodeId]
    return {
      ...patch,
      mountingHeight: next.mountingHeight,
      ...(wall?.type === 'wall'
        ? toiletPlacement(next, wall, next.position[0], next.side, 0, true)
        : {
            position: [next.position[0], next.mountingHeight, next.position[2]] as [
              number,
              number,
              number,
            ],
          }),
    }
  }
  const update = (patch: Partial<WallHungToiletNode>) => {
    const state = useScene.getState(),
      prepared = prepare(patch),
      next = WallHungToiletNode.parse({ ...node, ...prepared })
    if (patch.tankType !== undefined) {
      const desired = next.tankType === 'concealed' ? WALL_FLUSH_PLATE : CISTERN_FLUSH_CONTROL
      const controls = toiletFlushControls(node.id, state.nodes)
      const control = controls.some((c) => String(c.type) === desired)
        ? null
        : defaultToiletControl(next, state.nodes)
      state.applyNodeChanges({
        update: [{ id: node.id as AnyNodeId, data: prepared as Partial<AnyNode> }],
        ...(control
          ? {
              create: [
                {
                  node: control as unknown as AnyNode,
                  parentId: control.parentId as AnyNodeId,
                },
              ],
            }
          : {}),
      })
    } else state.updateNode(node.id as AnyNodeId, prepared as Partial<AnyNode>)
  }
  const slider = (
    key: keyof WallHungToiletNode,
    label: string,
    min: number,
    max: number,
    step = 0.01,
  ) => (
    <SliderControl
      key={key}
      label={label}
      value={key === 'tankBottom' ? toiletLayout(node).tankBottom : (node[key] as number)}
      min={min}
      max={max}
      step={step}
      precision={3}
      unit="m"
      onChange={(value) => update({ [key]: value })}
    />
  )
  const toggle = (key: 'seatEnabled' | 'lidEnabled' | 'lidOpen' | 'rimless', label: string) => (
    <ToggleControl
      key={key}
      label={label}
      checked={node[key]}
      onChange={(value) => update({ [key]: value })}
    />
  )
  return (
    <PanelWrapper title="Wall hung toilet" onClose={() => setSelection({ selectedIds: [] })}>
      <SectionAccordion
        node={node}
        model={toiletSection}
        onChange={update}
        preparePreview={prepare}
      />
      <PanelSection title="Bowl style" defaultExpanded>
        <div className="grid grid-cols-3 gap-2">
          {toiletPresets.map((p) => (
            <PanelButton
              key={p.style}
              type="button"
              aria-pressed={node.style === p.style}
              onClick={() => {
                const { label: _label, ...settings } = p
                update(settings)
              }}
              className={`rounded-md border px-3 py-2 text-xs ${node.style === p.style ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
            >
              {p.label}
            </PanelButton>
          ))}
        </div>
        {slider('width', 'Bowl width', 0.32, 0.48)}
        {slider('depth', 'Bowl projection', 0.42, 0.75)}
        {slider('height', 'Bowl height', 0.22, 0.38)}
        {slider('wallThickness', 'Ceramic thickness', 0.012, 0.035, 0.001)}
        <SliderControl
          label="Base taper"
          precision={2}
          value={node.taper}
          min={0}
          max={0.45}
          step={0.01}
          onChange={(taper) => update({ taper })}
        />
        {toggle('rimless', 'Rimless bowl')}
      </PanelSection>
      <PanelSection title="Seat and lid" defaultExpanded>
        {toggle('seatEnabled', 'Show seat')}
        {node.seatEnabled && slider('seatThickness', 'Seat thickness', 0.012, 0.04, 0.001)}
        {toggle('lidEnabled', 'Show lid')}
        {node.lidEnabled && toggle('lidOpen', 'Open lid')}
      </PanelSection>
      <PanelSection title="Water tank and flushing" defaultExpanded>
        <label className="flex flex-col gap-1 text-xs">
          Cistern arrangement
          <PanelSelect
            className="rounded-md border border-border bg-background p-2"
            value={node.tankType}
            onChange={(e) =>
              update({
                tankType: WallHungToiletNode.shape.tankType.parse(e.target.value),
              })
            }
          >
            <option value="concealed">Concealed inside wall</option>
            <option value="attached">External tank attached behind bowl</option>
            <option value="low-level">External tank mounted on wall</option>
            <option value="high-level">External high-level tank</option>
          </PanelSelect>
        </label>
        {toiletLayout(node).external ? (
          <>
            {slider('tankWidth', 'Tank width', 0.28, 0.55)}
            {slider('tankDepth', 'Tank depth', 0.12, 0.24)}
            {slider('tankHeight', 'Tank height', 0.28, 0.5)}
            {node.tankType !== 'attached' &&
              slider(
                'tankBottom',
                'Tank bottom above floor',
                node.tankType === 'high-level' ? 1.5 : Math.max(0.5, node.mountingHeight + 0.08),
                Math.max(1.9, toiletLayout(node).tankBottom + 1),
              )}

            {slider('pipeDiameter', 'Flush pipe diameter', 0.035, 0.06, 0.001)}
          </>
        ) : null}
      </PanelSection>
      <ToiletControlsPanel node={node} />
      <PanelSection title="Wall mounting" defaultExpanded>
        {slider(
          'mountingHeight',
          'Ceramic rim above floor',
          Math.min(0, node.mountingHeight),
          Math.max(3, node.mountingHeight + 1),
        )}
        <p className="text-xs text-muted-foreground">
          Floor clearance: {(node.mountingHeight - node.height).toFixed(3)} m · Total projection:{' '}
          {toiletLayout(node).projection.toFixed(3)} m
        </p>
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
