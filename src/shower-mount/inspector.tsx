'use client'
import {
  PanelWrapper,
  PanelSection,
  SliderControl,
  ToggleControl,
  PanelButton,
} from '../inspector-controls'
import { ShowerSectionAccordion } from '../section/shower-section-card'
import { showerMountSection } from './section'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { showerArmPlacement } from '../shower-arm/placement'
import {
  ShowerMountNode,
  isRail,
  hasHolder,
  hasSupply,
  mountType,
  mountShape,
  mountStyle,
  hasAdjustmentLever,
  type MountType,
  type MountShape,
} from './schema'
import { showerMountSockets } from './targets'
export default function ShowerMountInspector({ node: raw }: { node: ShowerMountNode }) {
  const n = ShowerMountNode.parse(raw),
    setSelection = useViewer((s) => s.setSelection)
  const compatible = (next: ShowerMountNode) => {
    const ids = new Set(showerMountSockets(next).map((s) => s.id))
    return n.children.every((id) => {
      const child = useScene.getState().nodes[id as AnyNodeId] as unknown as
        | { slotId?: string }
        | undefined
      return !child?.slotId || ids.has(child.slotId)
    })
  }
  const update = (patch: Partial<ShowerMountNode>) => {
    const next = ShowerMountNode.parse({ ...n, ...patch })
    if (!compatible(next)) return
    const wall = useScene.getState().nodes[(next.wallId ?? next.parentId) as AnyNodeId]
    if (wall?.type !== 'wall') return
    const pose = showerArmPlacement(next, wall, next.position[0], next.side, 0, true)
    if (pose)
      useScene.getState().updateNode(n.id as AnyNodeId, { ...patch, ...pose } as Partial<AnyNode>)
  }
  const slider = (
    key: keyof ShowerMountNode,
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
  const type = mountType(n)
  const shape = mountShape(n)
  const variant = (nextType: MountType, nextShape: MountShape, supply = hasSupply(n)) => ({
    style: mountStyle(nextType, nextShape, supply),
    ...(nextType === 'rail' ? { railSupply: supply } : {}),
    adjustmentLever: hasAdjustmentLever(n),
  })
  const choice = (label: string, selected: boolean, patch: Partial<ShowerMountNode>) => {
    const allowed = compatible(ShowerMountNode.parse({ ...n, ...patch }))
    return (
      <PanelButton
        key={label}
        type="button"
        aria-pressed={selected}
        disabled={!allowed}
        title={
          !allowed ? 'Move or remove attached items before removing their connection' : undefined
        }
        className={`rounded border p-2 text-xs disabled:opacity-40 ${selected ? 'border-primary' : 'border-border'}`}
        onClick={() => update(patch)}
      >
        {label}
      </PanelButton>
    )
  }
  return (
    <PanelWrapper title="Hand shower mount" onClose={() => setSelection({ selectedIds: [] })}>
      <ShowerSectionAccordion node={n} model={showerMountSection} onChange={update} />

      <PanelSection title="Mount configuration" defaultExpanded>
        <p className="mb-2 text-xs text-muted-foreground">Mounting type</p>
        <div className="grid grid-cols-3 gap-2">
          {(['holder', 'outlet', 'rail'] as const).map((value) =>
            choice(
              { holder: 'Wall holder', outlet: 'Supply outlet', rail: 'Slide rail' }[value],
              type === value,
              variant(value, shape),
            ),
          )}
        </div>
        <p className="my-2 text-xs text-muted-foreground">Body shape</p>
        <div className="grid grid-cols-2 gap-2">
          {(['round', 'square'] as const).map((value) =>
            choice(value === 'round' ? 'Round' : 'Square', shape === value, variant(type, value)),
          )}
        </div>
        {type === 'holder' && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {choice('Holder only', !hasSupply(n), variant(type, shape, false))}
            {choice('Holder and outlet', hasSupply(n), variant(type, shape, true))}
          </div>
        )}
        {hasHolder(n) && (
          <ToggleControl
            label="Adjustment lever"
            checked={hasAdjustmentLever(n)}
            onChange={(adjustmentLever) => update({ adjustmentLever })}
          />
        )}
      </PanelSection>
      <PanelSection title="Dimensions" defaultExpanded>
        {slider('projection', 'Projection from wall', 0.025, 0.15)}
        {slider('tubeSize', 'Body or rail size', 0.015, 0.05)}
        {hasHolder(n) && (
          <>
            {slider('holderDiameter', 'Holder outer diameter', 0.022, 0.06)}
            {slider('holderDepth', 'Cradle depth', 0.018, 0.06)}
            <SliderControl
              label="Handset angle"
              value={n.holderTilt}
              min={-30}
              max={45}
              step={1}
              unit="°"
              onChange={(holderTilt) => update({ holderTilt })}
            />
          </>
        )}
      </PanelSection>
      {hasSupply(n) && (
        <PanelSection title="Hose outlet" defaultExpanded>
          {slider('outletLength', 'Connector length', 0.012, 0.045)}
        </PanelSection>
      )}
      {isRail(n) && (
        <PanelSection title="Rail and slider" defaultExpanded>
          {slider('railLength', 'Rail length', 0.3, 1.5)}
          {slider('railBracketInset', 'Bracket inset from ends', 0.015, 0.12)}
          <SliderControl
            label="Holder position"
            value={n.sliderPosition}
            min={0}
            max={1}
            step={0.01}
            onChange={(sliderPosition) => update({ sliderPosition })}
          />
          <fieldset disabled={!compatible({ ...n, railSupply: !n.railSupply })}>
            <ToggleControl
              label="Integrated water outlet"
              checked={n.railSupply}
              onChange={(railSupply) => update({ railSupply })}
            />
          </fieldset>
          <ToggleControl
            label="Show shelf"
            checked={n.shelfEnabled}
            onChange={(shelfEnabled) => update({ shelfEnabled })}
          />
          {n.shelfEnabled && (
            <>
              {slider('shelfWidth', 'Shelf width', 0.1, 0.3)}
              {slider('shelfDepth', 'Shelf depth', 0.06, 0.16)}
            </>
          )}
        </PanelSection>
      )}
      <PanelSection title="Wall mounting" defaultExpanded={false}>
        {slider(
          'mountingHeight',
          isRail(n) ? 'Rail centre above floor' : 'Mount height above floor',
          Math.min(0, n.mountingHeight),
          Math.max(4, n.mountingHeight + 1),
          0.01,
        )}
        <ToggleControl
          label="Show wall flange"
          checked={n.flangeEnabled}
          onChange={(flangeEnabled) => update({ flangeEnabled })}
        />
        {n.flangeEnabled && (
          <>
            {slider('flangeSize', 'Flange size', 0.035, 0.12)}
            {slider('flangeThickness', 'Flange thickness', 0.003, 0.025)}
          </>
        )}
        <PanelButton
          type="button"
          className="rounded bg-accent p-2 text-xs"
          onClick={() => update({ side: n.side === 'front' ? 'back' : 'front' })}
        >
          Switch wall face
        </PanelButton>
      </PanelSection>
    </PanelWrapper>
  )
}
