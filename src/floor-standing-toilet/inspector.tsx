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
import { FloorStandingToiletNode, toiletLayout, toiletPresets, isOnePiece } from './schema'
import { toiletPlacement } from './placement'
export default function ToiletInspector({ node: raw }: { node: FloorStandingToiletNode }) {
  const node = FloorStandingToiletNode.parse(raw),
    setSelection = useViewer((s) => s.setSelection)
  const prepare = (patch: Partial<FloorStandingToiletNode>) => {
    const next = FloorStandingToiletNode.parse({
        ...node,
        ...patch,
        baseWidth: Math.min(patch.baseWidth ?? node.baseWidth, patch.width ?? node.width),
        baseDepth: Math.min(patch.baseDepth ?? node.baseDepth, patch.depth ?? node.depth),
        height: Math.min(
          patch.height ?? node.height,
          (patch.mountingHeight ?? node.mountingHeight) - 0.02,
        ),
        mountingHeight: patch.mountingHeight ?? node.mountingHeight,
      }),
      wall = useScene.getState().nodes[(next.wallId ?? next.parentId) as AnyNodeId]
    return {
      ...patch,
      baseWidth: next.baseWidth,
      baseDepth: next.baseDepth,
      height: next.height,
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
  const update = (patch: Partial<FloorStandingToiletNode>) => {
    const state = useScene.getState(),
      prepared = prepare(patch),
      next = FloorStandingToiletNode.parse({ ...node, ...prepared })
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
    key: keyof FloorStandingToiletNode,
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
    <PanelWrapper title="Floor standing toilet" onClose={() => setSelection({ selectedIds: [] })}>
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
              key={p.design}
              type="button"
              aria-pressed={node.design === p.design}
              onClick={() => {
                const { label: _label, ...settings } = p
                update(settings)
              }}
              className={`rounded-md border px-3 py-2 text-xs ${node.design === p.design ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
            >
              {p.label}
            </PanelButton>
          ))}
        </div>
        {slider('width', 'Bowl width', 0.32, 0.48)}
        {slider('depth', 'Bowl projection', 0.42, 0.75)}
        {slider('height', 'Bowl height', 0.22, Math.min(0.38, node.mountingHeight - 0.02))}
        {slider('baseWidth', 'Foot width', 0.18, Math.min(0.44, node.width))}
        {slider('baseDepth', 'Foot depth', 0.28, Math.min(0.7, node.depth))}
        <label className="flex flex-col gap-1 text-xs">
          Base shape
          <PanelSelect
            value={node.baseStyle}
            className="rounded border bg-background p-2"
            onChange={(e) =>
              update({
                baseStyle: FloorStandingToiletNode.shape.baseStyle.parse(e.target.value),
              })
            }
          >
            <option value="skirted">Full skirt</option>
            <option value="pedestal">Pedestal</option>
          </PanelSelect>
        </label>
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
                tankType: FloorStandingToiletNode.shape.tankType.parse(e.target.value),
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
            {slider('tankCornerRadius', 'Tank corner radius', 0.002, 0.045, 0.001)}
            {slider('tankLidThickness', 'Cistern lid thickness', 0.008, 0.035, 0.001)}
            <SliderControl
              label="Tank taper"
              value={node.tankTaper}
              min={0}
              max={0.25}
              step={0.01}
              precision={2}
              onChange={(tankTaper) => update({ tankTaper })}
            />
            {node.tankType === 'attached' && (
              <>
                <label className="flex flex-col gap-1 text-xs">
                  Construction
                  <PanelSelect
                    className="rounded border bg-background p-2"
                    value={isOnePiece(node) ? 'one-piece' : 'two-piece'}
                    onChange={(e) =>
                      update({
                        construction: FloorStandingToiletNode.shape.construction.parse(
                          e.target.value,
                        ),
                      })
                    }
                  >
                    <option value="two-piece">Two-piece close coupled</option>
                    <option value="one-piece">One-piece integrated</option>
                  </PanelSelect>
                </label>
                {!isOnePiece(node) &&
                  slider('couplingGap', 'Tank-to-bowl joint gap', 0.005, 0.06, 0.001)}
              </>
            )}

            {node.tankType !== 'attached' &&
              slider(
                'tankBottom',
                'Tank bottom above floor',
                node.tankType === 'high-level' ? 1.5 : Math.max(0.5, node.mountingHeight + 0.08),
                1.9,
              )}

            {node.tankType !== 'attached' &&
              slider('pipeDiameter', 'Flush pipe diameter', 0.035, 0.06, 0.001)}
          </>
        ) : null}
      </PanelSection>
      <ToiletControlsPanel node={node} />
      <PanelSection title="Floor standing dimensions" defaultExpanded>
        {slider('mountingHeight', 'Ceramic rim above floor', 0.36, 0.5)}
        <p className="text-xs text-muted-foreground">
          Floor supported · Total projection: {toiletLayout(node).projection.toFixed(3)} m
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
