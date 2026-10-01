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
import { showerControlSection } from './section'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { ShowerControlNode, exposedControl, controlFootprint } from './schema'
import { ShowerControlPreview } from './catalog'
import { showerControlSockets } from './targets'
import { valveCompatible } from '../shower-valve/attachment'
import { ShowerValveNode, SHOWER_VALVE } from '../shower-valve/schema'
import { showerArmPlacement } from '../shower-arm/placement'
export default function ShowerControlInspector({ node: n }: { node: ShowerControlNode }) {
  const nodes = useScene((s) => s.nodes),
    exposed = exposedControl(n)
  const compatible = (next: ShowerControlNode) => {
    const slots = new Set(showerControlSockets(next).map((s) => s.id))
    return n.children.every((id) => {
      const child = nodes[id as AnyNodeId]
      if (
        child &&
        String(child.type) === SHOWER_VALVE &&
        !valveCompatible(ShowerValveNode.parse(child), next)
      )
        return false
      const raw = child as unknown as { slotId?: string } | undefined
      return !raw?.slotId || slots.has(raw.slotId)
    })
  }
  const update = (patch: Partial<ShowerControlNode>) => {
    const next = ShowerControlNode.parse({
      ...n,
      ...patch,
      selectedOutlet: Math.min(
        patch.selectedOutlet ?? n.selectedOutlet,
        patch.outletCount ?? n.outletCount,
      ),
    })
    if (!compatible(next)) return
    const wall = nodes[(n.wallId ?? n.parentId) as AnyNodeId]
    if (wall?.type !== 'wall') return
    next.flangeSize = controlFootprint(next)
    const pose = showerArmPlacement(next, wall, n.position[0], next.side, 0, true)
    if (pose)
      useScene
        .getState()
        .updateNode(n.id as AnyNodeId, { ...next, ...pose } as unknown as Partial<AnyNode>)
  }
  const slider = (
    key:
      | 'plateWidth'
      | 'plateHeight'
      | 'flangeThickness'
      | 'handleDiameter'
      | 'handleLength'
      | 'handleProjection'
      | 'controlSpacing'
      | 'bodyWidth'
      | 'inletSpacing'
      | 'projection'
      | 'tubeSize'
      | 'mountingHeight'
      | 'spoutLength'
      | 'spoutDrop'
      | 'spoutRise'
      | 'spoutWidth'
      | 'spoutHeight'
      | 'riserHeight',
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
      title={
        n.function === 'diverter'
          ? 'Shower diverter'
          : n.function === 'flow'
            ? 'Shower flow control'
            : 'Shower mixer'
      }
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <ShowerSectionAccordion node={n} model={showerControlSection} onChange={update} />

      <PanelSection title="Control model" defaultExpanded>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Control layout">
          {(exposed ? ['bar', 'bridge', 'bath-single'] : ['single', 'dual', 'buttons']).map(
            (layout) => {
              const next = ShowerControlNode.parse({ ...n, layout })
              const label = (
                {
                  single: 'Single',
                  dual: 'Twin',
                  buttons: 'Buttons',
                  bar: 'End knobs',
                  bridge: 'Twin handles',
                  'bath-single': 'Single lever',
                } as Record<string, string>
              )[layout]
              return (
                <PanelButton
                  key={layout}
                  type="button"
                  aria-label={label}
                  aria-pressed={n.layout === layout}
                  disabled={!compatible(next)}
                  className={`rounded-lg border p-2 text-center text-xs disabled:opacity-40 ${n.layout === layout ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                  onClick={() => update({ layout: next.layout })}
                >
                  <span className="block h-12">
                    <ShowerControlPreview node={next} />
                  </span>
                  {label}
                </PanelButton>
              )
            },
          )}
        </div>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Control function">
          {(['mixer', 'diverter', 'flow'] as const).map((fn) => (
            <PanelButton
              key={fn}
              type="button"
              aria-pressed={n.function === fn}
              disabled={!compatible(ShowerControlNode.parse({ ...n, function: fn }))}
              className={`rounded-lg border p-2 text-xs capitalize disabled:opacity-40 ${n.function === fn ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
              onClick={() => update({ function: fn })}
            >
              {fn === 'mixer' ? 'Mixer' : fn === 'diverter' ? 'Diverter' : 'Flow'}
            </PanelButton>
          ))}
        </div>
        <div
          className={`grid gap-2 ${exposed ? 'grid-cols-2' : 'grid-cols-4'}`}
          role="group"
          aria-label="Control profile"
        >
          {(exposed
            ? (['round', 'square'] as const)
            : (['round', 'square', 'rectangle', 'soft-rectangle'] as const)
          ).map((shape) => (
            <PanelButton
              key={shape}
              type="button"
              aria-label={shape}
              aria-pressed={n.plateShape === shape}
              className={`rounded-lg border px-1 py-2 text-xs ${n.plateShape === shape ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
              onClick={() => update({ plateShape: shape })}
            >
              <span className="block h-10">
                <ShowerControlPreview node={{ ...n, plateShape: shape }} />
              </span>
              {
                {
                  round: 'Round',
                  square: 'Square',
                  rectangle: 'Tall',
                  'soft-rectangle': 'Rounded',
                }[shape]
              }
            </PanelButton>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Dimensions" defaultExpanded>
        {!exposed && (
          <>
            {slider('plateWidth', 'Plate width or diameter', 0.08, 0.36)}
            {['rectangle', 'soft-rectangle'].includes(n.plateShape) &&
              slider('plateHeight', 'Plate height', 0.08, 0.45)}
            {n.layout === 'dual' &&
              slider('controlSpacing', 'Handle spacing (fits plate)', 0.04, 0.2)}
            {n.layout === 'buttons' && (
              <SliderControl
                label="Outlet buttons"
                value={n.buttonCount}
                min={1}
                max={3}
                step={1}
                onChange={(v) => update({ buttonCount: v, outletCount: v })}
              />
            )}
          </>
        )}
        {exposed && (
          <>
            {slider('bodyWidth', 'Mixer body width', 0.18, 0.45)}
            {slider('inletSpacing', 'Inlet centres (fits body)', 0.1, 0.24)}
            {slider('projection', 'Projection from wall', 0.05, 0.2)}
            {slider('tubeSize', 'Body section size', 0.02, 0.07)}
          </>
        )}
      </PanelSection>
      {exposed && (
        <PanelSection title="Bath spout" defaultExpanded={false}>
          <ToggleControl
            label="Bath filling spout"
            checked={n.spoutEnabled}
            onChange={(v) => update({ spoutEnabled: v })}
          />
          {n.spoutEnabled && (
            <>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Bath spout shape">
                {(
                  [
                    'round-straight',
                    'round-curved',
                    'round-arched',
                    'square-straight',
                    'square-angled',
                    'waterfall-open',
                    'waterfall-closed',
                  ] as const
                ).map((style) => (
                  <PanelButton
                    key={style}
                    type="button"
                    aria-label={style}
                    aria-pressed={n.spoutStyle === style}
                    className={`rounded-lg border p-2 text-xs ${n.spoutStyle === style ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                    onClick={() => update({ spoutStyle: style })}
                  >
                    <span className="block h-10">
                      <svg
                        viewBox="0 0 80 48"
                        className="h-full w-full"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={style.startsWith('waterfall') ? 8 : 4}
                      >
                        <path
                          d={
                            style === 'round-arched'
                              ? 'M10 36Q10 8 35 8Q60 8 60 36'
                              : style.startsWith('waterfall')
                                ? 'M10 24H60'
                                : style.endsWith('curved')
                                  ? 'M10 16H48Q60 16 60 30'
                                  : style.endsWith('angled')
                                    ? 'M10 16H48L60 30'
                                    : 'M10 16H60V30'
                          }
                        />
                      </svg>
                    </span>
                    {style
                      .replace('round-', '')
                      .replace('square-', 'square ')
                      .replace('waterfall-', 'waterfall ')}
                  </PanelButton>
                ))}
              </div>
              {slider('spoutLength', 'Spout projection from mixer', 0.08, 0.4)}
              {!n.spoutStyle.startsWith('waterfall') &&
                slider('spoutDrop', 'Spout drop', 0.01, 0.15)}
              {n.spoutStyle === 'round-arched' && slider('spoutRise', 'Spout rise', 0.02, 0.18)}
              {n.spoutStyle.startsWith('waterfall') && (
                <>
                  {slider('spoutWidth', 'Waterfall width', 0.06, 0.3)}
                  {slider('spoutHeight', 'Waterfall channel height', 0.012, 0.05)}
                  <SliderControl
                    label="Waterfall slope"
                    value={n.spoutSlope}
                    min={0}
                    max={20}
                    step={1}
                    unit="°"
                    onChange={(v) => update({ spoutSlope: v })}
                  />
                </>
              )}
              <SliderControl
                label="Spout swivel"
                value={n.spoutSwivel}
                min={-90}
                max={90}
                step={1}
                unit="°"
                onChange={(v) => update({ spoutSwivel: v })}
              />
              <ToggleControl
                label="Show aerator"
                checked={n.spoutAerator}
                onChange={(v) => update({ spoutAerator: v })}
              />
              <label className="block py-2 text-xs">
                Bath diverter{' '}
                <PanelSelect
                  className="rounded border bg-background p-1"
                  value={n.bathDiverterStyle}
                  onChange={(e) =>
                    update({
                      bathDiverterStyle: e.target.value as ShowerControlNode['bathDiverterStyle'],
                    })
                  }
                >
                  {['pull-up', 'button'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </PanelSelect>
              </label>
              <ToggleControl
                label="Diverter raised"
                checked={n.bathDiverterRaised}
                onChange={(v) => update({ bathDiverterRaised: v })}
              />
            </>
          )}
          <ToggleControl
            label="Overhead riser connection"
            checked={n.riserEnabled}
            onChange={(v) => update({ riserEnabled: v })}
          />
          {n.spoutEnabled &&
            n.riserEnabled &&
            slider('riserHeight', 'Riser connection height', 0.03, 0.2)}
        </PanelSection>
      )}
      <PanelSection title="Handles" defaultExpanded>
        {n.layout !== 'bar' && (
          <div className="flex gap-2">
            {(['lever', 'cross', 'knob'] as const).map((v) => (
              <PanelButton
                key={v}
                type="button"
                className={`rounded-lg border p-2 text-center text-xs ${n.handleStyle === v ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                aria-pressed={n.handleStyle === v}
                onClick={() => update({ handleStyle: v })}
              >
                <span className="block h-10">
                  <ShowerControlPreview node={{ ...n, layout: 'single', handleStyle: v }} />
                </span>
                {v}
              </PanelButton>
            ))}
          </div>
        )}
        {n.handleStyle === 'knob' && (
          <div className="flex gap-2">
            {(['round', 'square'] as const).map((v) => (
              <PanelButton
                key={v}
                type="button"
                aria-pressed={n.handleShape === v}
                className="rounded border p-2 text-xs"
                onClick={() => update({ handleShape: v })}
              >
                <span className="block h-10">
                  <svg
                    viewBox="0 0 64 48"
                    className="h-full w-full"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    {v === 'round' ? (
                      <circle cx="32" cy="24" r="14" />
                    ) : (
                      <rect x="18" y="10" width="28" height="28" />
                    )}
                    <path d="M32 12v6" />
                  </svg>
                </span>
                {v} knob
              </PanelButton>
            ))}
          </div>
        )}
        {slider('handleDiameter', 'Handle diameter (fits plate)', 0.02, 0.07)}
        {n.handleStyle !== 'knob' && slider('handleLength', 'Lever or cross length', 0.025, 0.1)}
        {n.layout !== 'bar' && slider('handleProjection', 'Handle projection', 0.025, 0.1)}
        <SliderControl
          label="Primary handle angle"
          value={n.handleAngle}
          min={-180}
          max={180}
          step={1}
          unit="°"
          onChange={(v) => update({ handleAngle: v })}
        />
        {(n.layout === 'dual' || (exposed && n.layout !== 'bath-single')) && (
          <SliderControl
            label="Second handle angle"
            value={n.secondaryAngle}
            min={-180}
            max={180}
            step={1}
            unit="°"
            onChange={(v) => update({ secondaryAngle: v })}
          />
        )}
        <ToggleControl
          label="Show markings"
          checked={n.markingsEnabled}
          onChange={(v) => update({ markingsEnabled: v })}
        />
        <ToggleControl
          label="Show cover plate or inlet flanges"
          checked={n.flangeEnabled}
          onChange={(v) => update({ flangeEnabled: v })}
        />
        {n.flangeEnabled && slider('flangeThickness', 'Cover thickness', 0.003, 0.02)}
      </PanelSection>
      <PanelSection title="Wall and connections" defaultExpanded={false}>
        {n.children
          .filter((id) => String(nodes[id as AnyNodeId]?.type) === SHOWER_VALVE)
          .map((id) => (
            <PanelButton
              key={id}
              type="button"
              className="rounded border p-2 text-xs"
              onClick={() => useViewer.getState().setSelection({ selectedIds: [id as AnyNodeId] })}
            >
              Edit concealed valve body
            </PanelButton>
          ))}
        {slider('mountingHeight', 'Centre above floor', 0.5, 3.5, 0.01)}
        <PanelButton
          type="button"
          className="rounded border p-2 text-xs"
          onClick={() => update({ side: n.side === 'front' ? 'back' : 'front' })}
        >
          Switch wall face
        </PanelButton>
        <ToggleControl
          label="Integrated hose outlet"
          checked={n.hoseOutletEnabled}
          onChange={(v) => update({ hoseOutletEnabled: v })}
        />
        {n.function !== 'flow' && (
          <>
            <SliderControl
              label="Water outlet count"
              value={n.outletCount}
              min={1}
              max={3}
              step={1}
              onChange={(v) => update({ outletCount: v })}
            />
            {n.function === 'diverter' && (
              <SliderControl
                label="Selected outlet"
                value={n.selectedOutlet}
                min={1}
                max={n.outletCount}
                step={1}
                onChange={(v) => update({ selectedOutlet: v })}
              />
            )}
          </>
        )}
      </PanelSection>
    </PanelWrapper>
  )
}
