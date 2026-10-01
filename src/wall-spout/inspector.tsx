'use client'
import {
  PanelWrapper,
  PanelSection,
  SliderControl,
  ToggleControl,
  PanelButton,
} from '../inspector-controls'
import { WallSpoutPreview } from './catalog'
import { FixtureFinishes } from '../section/fixture-finishes'
import { ShowerSectionAccordion } from '../section/shower-section-card'
import { wallSpoutSection } from './section'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import {
  WallSpoutNode,
  wallSpoutPresets,
  wallSpoutPresetParameters,
  waterfallSpout,
} from './schema'
import { wallSpoutSockets } from './targets'
import { showerArmPlacement } from '../shower-arm/placement'
export default function WallSpoutInspector({ node: n }: { node: WallSpoutNode }) {
  const nodes = useScene((s) => s.nodes),
    waterfall = waterfallSpout(n)
  const compatible = (next: WallSpoutNode) => {
    const slots = new Set(wallSpoutSockets(next).map((s) => s.id))
    return n.children.every((id) => {
      const child = nodes[id as AnyNodeId] as unknown as { slotId?: string } | undefined
      return !child?.slotId || slots.has(child.slotId)
    })
  }
  const update = (patch: Partial<WallSpoutNode>) => {
    const next = WallSpoutNode.parse({ ...n, ...patch })
    if (!compatible(next)) return
    const wall = nodes[(next.wallId ?? next.parentId) as AnyNodeId]
    if (wall?.type !== 'wall') return
    const pose = showerArmPlacement(next, wall, next.position[0], next.side, 0, true)
    if (pose)
      useScene.getState().updateNode(n.id as AnyNodeId, { ...patch, ...pose } as Partial<AnyNode>)
  }
  const slider = (
    key:
      | 'length'
      | 'tubeSize'
      | 'drop'
      | 'rise'
      | 'bendRadius'
      | 'waterfallWidth'
      | 'waterfallHeight'
      | 'flangeSize'
      | 'flangeThickness'
      | 'diverterSize'
      | 'handleLength'
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
      unit="m"
      precision={3}
      onChange={(v) => update({ [key]: v })}
    />
  )
  return (
    <PanelWrapper
      title={n.fixtureType === 'bib' ? 'Wall bib tap' : 'Bath or bucket spout'}
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <ShowerSectionAccordion node={n} model={wallSpoutSection} onChange={update} />
      <PanelSection
        title={n.fixtureType === 'bib' ? 'Bib tap model' : 'Spout model'}
        defaultExpanded
      >
        <div className="grid grid-cols-3 gap-2">
          {wallSpoutPresets
            .filter((p) => wallSpoutPresetParameters(p).fixtureType === n.fixtureType)
            .map((p) => (
              <PanelButton
                key={p.id}
                type="button"
                className="overflow-hidden rounded-lg border border-border bg-secondary/40 text-left text-xs disabled:opacity-40 aria-pressed:border-primary aria-pressed:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                disabled={!compatible({ ...n, ...wallSpoutPresetParameters(p) })}
                aria-pressed={Object.entries(wallSpoutPresetParameters(p)).every(
                  ([key, value]) => n[key as keyof WallSpoutNode] === value,
                )}
                onClick={() => update(wallSpoutPresetParameters(p))}
              >
                <span className="block p-2" style={{ height: 64 }}>
                  <WallSpoutPreview preset={p.id} />
                </span>
                <span className="block px-2 pb-2 leading-4">{p.label}</span>
              </PanelButton>
            ))}
        </div>
        {slider('length', 'Projection', 0.08, 0.4)}
        {waterfall ? (
          <>
            {slider('waterfallWidth', 'Waterfall width', 0.06, 0.3)}
            {slider('waterfallHeight', 'Channel height', 0.012, 0.05)}
            <SliderControl
              label="Channel slope"
              value={n.waterfallSlope}
              min={0}
              max={20}
              step={1}
              unit="°"
              onChange={(v) => update({ waterfallSlope: v })}
            />
          </>
        ) : (
          <>
            {slider('tubeSize', 'Body diameter or section', 0.018, 0.07)}
            {slider('drop', 'Outlet drop', 0.01, 0.15)}
            {n.style === 'round-arched' && slider('rise', 'Arch rise', 0.02, 0.18)}
            {n.style === 'round-curved' &&
              slider('bendRadius', 'Bend radius (fits spout)', 0.01, 0.08)}
          </>
        )}
        <ToggleControl
          label={waterfall ? 'Show outlet strip' : 'Show aerator'}
          checked={n.aeratorEnabled}
          onChange={(v) => update({ aeratorEnabled: v })}
        />
      </PanelSection>
      {n.fixtureType === 'bib' && (
        <PanelSection title="Tap handle" defaultExpanded>
          <div className="flex gap-2">
            {(['lever', 'cross', 'knob'] as const).map((v) => (
              <PanelButton
                key={v}
                type="button"
                className="rounded border p-2 text-xs"
                aria-pressed={n.handleStyle === v}
                onClick={() => update({ handleStyle: v })}
              >
                {v}
              </PanelButton>
            ))}
          </div>
          {n.handleStyle !== 'knob' && slider('handleLength', 'Handle length', 0.025, 0.1)}
          <SliderControl
            label="Handle angle"
            value={n.handleAngle}
            min={-180}
            max={180}
            step={1}
            unit="°"
            onChange={(v) => update({ handleAngle: v })}
          />
        </PanelSection>
      )}
      <PanelSection title="Diverter and hose" defaultExpanded>
        <div className="flex gap-2">
          {(['none', 'pull-up', 'button'] as const).map((v) => (
            <PanelButton
              key={v}
              type="button"
              disabled={!compatible({ ...n, diverterStyle: v })}
              aria-pressed={n.diverterStyle === v}
              className="rounded border p-2 text-xs disabled:opacity-40"
              onClick={() => update({ diverterStyle: v })}
            >
              {v}
            </PanelButton>
          ))}
        </div>
        {n.diverterStyle !== 'none' && (
          <>
            {slider('diverterSize', 'Diverter size', 0.01, 0.035)}
            <ToggleControl
              label={n.diverterStyle === 'pull-up' ? 'Pull-up raised' : 'Button raised'}
              checked={n.diverterRaised}
              onChange={(v) => update({ diverterRaised: v })}
            />
          </>
        )}
        <ToggleControl
          label="Hand shower hose outlet"
          checked={n.hoseOutletEnabled}
          onChange={(v) => update({ hoseOutletEnabled: v })}
        />
      </PanelSection>
      <PanelSection title="Wall mounting" defaultExpanded>
        {slider('mountingHeight', 'Centre above floor', 0.5, 3.5, 0.01)}
        <PanelButton
          type="button"
          className="rounded-md bg-accent px-3 py-2 text-xs"
          onClick={() => useEditor.getState().setMovingNode(n as unknown as AnyNode)}
        >
          Reposition on wall
        </PanelButton>

        <ToggleControl
          label="Show wall flange"
          checked={n.flangeEnabled}
          onChange={(v) => update({ flangeEnabled: v })}
        />
        {n.flangeEnabled && (
          <>
            <div className="flex gap-2">
              {(['round', 'square', 'rectangle'] as const).map((v) => (
                <PanelButton
                  key={v}
                  type="button"
                  className="rounded border p-2 text-xs"
                  aria-pressed={n.flangeShape === v}
                  onClick={() => update({ flangeShape: v })}
                >
                  {v}
                </PanelButton>
              ))}
            </div>
            {slider('flangeSize', 'Flange size', 0.035, 0.35)}
            {slider('flangeThickness', 'Flange thickness', 0.003, 0.02)}
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
      <FixtureFinishes
        slots={n.slots}
        parts={['body', 'flange', 'outlet', 'diverter', 'handle', 'connector']}
        onChange={(slots) => update({ slots })}
      />
    </PanelWrapper>
  )
}
