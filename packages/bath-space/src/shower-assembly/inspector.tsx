'use client'
import {
  PanelWrapper,
  PanelSection,
  SliderControl,
  ToggleControl,
  PanelButton,
  PanelSelect,
} from '../inspector-controls'
import { ShowerSectionAccordion } from '../section/shower-section-card'
import { showerAssemblySection } from './section'
import { BathShowerNode, BATH_SHOWER, bathShowerAssembly } from '../bath-shower/schema'
import { bathShowerMount } from '../bath-shower/mounting'
import { fitAssemblyPlacement } from './placement'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { ShowerAssemblyNode, showerAssemblyPresets, assemblyPresetParameters } from './schema'
import { assemblySockets } from './targets'
import { showerArmPlacement } from '../shower-arm/placement'

export default function ShowerAssemblyInspector({ node: n }: { node: ShowerAssemblyNode }) {
  const nodes = useScene((s) => s.nodes)
  const isBath = String(n.type) === BATH_SHOWER
  const parse = (raw: unknown) =>
    isBath ? bathShowerAssembly(BathShowerNode.parse(raw)) : ShowerAssemblyNode.parse(raw)
  const compatible = (next: ShowerAssemblyNode) => {
    const ids = new Set(assemblySockets(next).map((s) => s.id))
    return n.children.every((id) => {
      const child = nodes[id as AnyNodeId] as unknown as { slotId?: string } | undefined
      return !child?.slotId || ids.has(child.slotId)
    })
  }
  const update = (patch: Partial<ShowerAssemblyNode>) => {
    const next = parse({ ...n, ...patch })
    if (!compatible(next)) return
    if (isBath) {
      const pose = bathShowerMount(BathShowerNode.parse(next), nodes)
      if (pose)
        useScene
          .getState()
          .updateNode(
            n.id as AnyNodeId,
            { ...next, ...pose, parentId: n.parentId } as unknown as Partial<AnyNode>,
          )
      return
    }
    const wall = nodes[(n.wallId ?? n.parentId) as AnyNodeId]
    if (wall?.type !== 'wall') return
    const rawPose = showerArmPlacement(next, wall, n.position[0], next.side, 0, true)
    const pose = rawPose ? fitAssemblyPlacement(next, rawPose, nodes) : null
    if (pose)
      useScene
        .getState()
        .updateNode(n.id as AnyNodeId, { ...next, ...pose } as unknown as Partial<AnyNode>)
  }
  const length = (
    key:
      | 'height'
      | 'width'
      | 'depth'
      | 'projection'
      | 'armLength'
      | 'tubeSize'
      | 'holderOffset'
      | 'jetSize'
      | 'mountingHeight'
      | 'flangeSize',
    label: string,
    min: number,
    max: number,
  ) => (
    <SliderControl
      key={key}
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
      title={
        isBath
          ? 'Bath shower combination'
          : n.family === 'column'
            ? 'Shower column'
            : 'Shower panel'
      }
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <ShowerSectionAccordion node={n} model={showerAssemblySection} onChange={update} />

      {isBath && (
        <PanelSection title="Bath attachment" defaultExpanded>
          <p className="text-xs text-muted-foreground">
            {bathShowerMount(BathShowerNode.parse(n), nodes)
              ? 'Mounted above bath on end wall'
              : 'Bath or wall fit unavailable; assembly hidden'}
          </p>
          <PanelButton
            type="button"
            onClick={() =>
              useViewer.getState().setSelection({ selectedIds: [n.parentId as AnyNodeId] })
            }
          >
            Select bath
          </PanelButton>
        </PanelSection>
      )}
      <PanelSection title="Assembly model" defaultExpanded>
        <div className="grid grid-cols-2 gap-2">
          {showerAssemblyPresets.map((p) => (
            <PanelButton
              type="button"
              key={p.id}
              disabled={!compatible(parse({ ...n, ...assemblyPresetParameters(p) }))}
              className="rounded border p-2 text-xs disabled:opacity-40"
              onClick={() => update(assemblyPresetParameters(p))}
            >
              {p.label}
            </PanelButton>
          ))}
        </div>
        {length('height', n.family === 'panel' ? 'Panel height' : 'Riser height', 0.7, 1.8)}
        {n.family === 'panel' ? (
          <>
            {length('width', 'Panel width', 0.14, 0.4)}
            {length('depth', 'Panel depth', 0.025, 0.12)}
          </>
        ) : (
          <>
            {length('projection', 'Riser projection', 0.08, 0.2)}
            {length('tubeSize', 'Pipe section', 0.02, 0.05)}
          </>
        )}
        {length('armLength', 'Overhead arm projection', 0.15, 0.6)}
        <label className="block py-2 text-xs">
          Controls{' '}
          <PanelSelect
            className="rounded border bg-background p-1"
            value={n.controlStyle}
            onChange={(e) =>
              update({ controlStyle: e.target.value as ShowerAssemblyNode['controlStyle'] })
            }
          >
            {['thermostat', 'lever', 'cross'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </PanelSelect>
        </label>
      </PanelSection>
      <PanelSection title="Handset position" defaultExpanded>
        <SliderControl
          label="Holder slide (fits below head)"
          value={n.holderSlide}
          min={0.15}
          max={0.8}
          step={0.01}
          onChange={(v) => update({ holderSlide: v })}
        />
        <SliderControl
          label="Holder tilt"
          value={n.holderTilt}
          min={-30}
          max={40}
          step={1}
          unit="°"
          onChange={(v) => update({ holderTilt: v })}
        />
        {length('holderOffset', 'Holder side offset', 0.04, 0.18)}
        <PanelButton
          type="button"
          className="rounded border p-2 text-xs"
          onClick={() => update({ holderSide: n.holderSide === 'left' ? 'right' : 'left' })}
        >
          Switch holder side
        </PanelButton>
      </PanelSection>
      {n.family === 'panel' && (
        <PanelSection title="Panel fittings" defaultExpanded>
          <SliderControl
            label="Body jets"
            value={n.jets}
            min={0}
            max={4}
            step={1}
            onChange={(v) => update({ jets: v })}
          />
          {n.jets > 0 && (
            <>
              <label className="block py-2 text-xs">
                Jet shape{' '}
                <PanelSelect
                  className="rounded border bg-background p-1"
                  value={n.jetShape}
                  onChange={(e) =>
                    update({ jetShape: e.target.value as ShowerAssemblyNode['jetShape'] })
                  }
                >
                  {['round', 'square', 'rectangle'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </PanelSelect>
              </label>
              {length('jetSize', 'Jet size (fits spacing)', 0.04, 0.12)}
              <SliderControl
                label="Jet tilt"
                value={n.jetTilt}
                min={-25}
                max={25}
                step={1}
                unit="°"
                onChange={(v) => update({ jetTilt: v })}
              />
            </>
          )}
          <ToggleControl
            label="Waterfall outlet"
            checked={n.waterfallEnabled}
            onChange={(v) => update({ waterfallEnabled: v })}
          />
          <ToggleControl
            label="Shelf"
            checked={n.shelfEnabled}
            onChange={(v) => update({ shelfEnabled: v })}
          />
        </PanelSection>
      )}
      <PanelSection title="Wall and components" defaultExpanded>
        {length('mountingHeight', 'Base above floor', 0.3, 2)}
        {!isBath && (
          <PanelButton
            type="button"
            className="rounded border p-2 text-xs"
            onClick={() => update({ side: n.side === 'front' ? 'back' : 'front' })}
          >
            Switch wall face
          </PanelButton>
        )}
        <ToggleControl
          label="Wall brackets"
          checked={n.flangeEnabled}
          onChange={(v) => update({ flangeEnabled: v })}
        />
        {n.flangeEnabled &&
          n.family === 'column' &&
          length('flangeSize', 'Bracket cover size', 0.04, 0.15)}
        <ToggleControl
          label="Bath spout"
          checked={n.spoutEnabled}
          onChange={(v) => update({ spoutEnabled: v })}
        />
        {(['headEnabled', 'handEnabled', 'hoseEnabled'] as const).map((key, i) => (
          <ToggleControl
            key={key}
            label={['Head socket', 'Handset socket', 'Hose socket'][i]!}
            checked={n[key]}
            onChange={(v) => update({ [key]: v })}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          {n.children.map((id) => {
            const child = nodes[id as AnyNodeId]
            return child ? (
              <PanelButton
                key={id}
                type="button"
                className="rounded border p-2 text-xs"
                onClick={() =>
                  useViewer.getState().setSelection({ selectedIds: [id as AnyNodeId] })
                }
              >
                Edit {child.name || String(child.type).split(':')[1]}
              </PanelButton>
            ) : null
          })}
        </div>
      </PanelSection>
    </PanelWrapper>
  )
}
