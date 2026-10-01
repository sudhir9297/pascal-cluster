'use client'
import {
  PanelWrapper,
  PanelSection,
  SliderControl,
  ToggleControl,
  PanelButton,
} from '../inspector-controls'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { HandShowerPreview } from './catalog'
import { SectionAccordion } from '../section/section-card'
import { handShowerSection } from '../section/hand-shower-section'
import { HandShowerNode, handShowerPresets } from './schema'
export default function HandShowerInspector({ node: raw }: { node: HandShowerNode }) {
  const n = HandShowerNode.parse(raw),
    setSelection = useViewer((s) => s.setSelection),
    update = (patch: Partial<HandShowerNode>) =>
      useScene.getState().updateNode(n.id as AnyNodeId, patch as Partial<AnyNode>)
  const slider = (
    key: keyof HandShowerNode,
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
  const wand = n.style.endsWith('wand')
  return (
    <PanelWrapper title="Hand shower" onClose={() => setSelection({ selectedIds: [] })}>
      <SectionAccordion node={n} model={handShowerSection} onChange={update} />

      <PanelSection title="Shape" defaultExpanded>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Hand shower shape">
          {handShowerPresets.map((p) => (
            <PanelButton
              key={p.style}
              type="button"
              aria-label={p.label}
              aria-pressed={n.style === p.style}
              className={`rounded-lg border p-2 text-center text-xs ${n.style === p.style ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
              onClick={() =>
                update({
                  style: p.style,
                  ...(p.style === 'oval' ? { headHeight: Math.min(0.18, n.headWidth * 1.35) } : {}),
                })
              }
            >
              <span className="block h-12">
                <HandShowerPreview style={p.style} />
              </span>
              <span className="block text-xs font-medium">{p.label}</span>
            </PanelButton>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Dimensions" defaultExpanded>
        {!wand && (
          <>
            {slider('headWidth', n.style === 'round' ? 'Head diameter' : 'Head width', 0.055, 0.16)}
            {n.style !== 'round' && slider('headHeight', 'Head height', 0.055, 0.18)}
            {n.style === 'soft-square' &&
              slider(
                'cornerRadius',
                'Corner radius',
                0.003,
                Math.min(0.04, n.headWidth / 2, n.headHeight / 2),
              )}
            {slider('headThickness', 'Head thickness', 0.01, 0.035)}
          </>
        )}
        {slider('handleLength', wand ? 'Wand length' : 'Handle length', 0.1, 0.24)}
        {slider('handleDiameter', 'Handle diameter or width', 0.018, 0.035)}
      </PanelSection>
      <PanelSection title="Connection and grip" defaultExpanded={false}>
        {slider('connectorLength', 'Connector length', 0.012, 0.035)}
        {!n.style.startsWith('square') && (
          <ToggleControl
            label="Grip rings"
            checked={n.gripRidges}
            onChange={(gripRidges) => update({ gripRidges })}
          />
        )}
        {slider('gripInsertion', 'Handle below holder', 0.01, 0.055)}
        {!wand && (
          <SliderControl
            label="Head angle"
            value={n.headAngle}
            min={-15}
            max={40}
            step={1}
            unit="°"
            onChange={(headAngle) => update({ headAngle })}
          />
        )}
      </PanelSection>
      <PanelSection title="Spray face" defaultExpanded={false}>
        <ToggleControl
          label="Show nozzles"
          checked={n.nozzlesEnabled}
          onChange={(nozzlesEnabled) => update({ nozzlesEnabled })}
        />
        {n.nozzlesEnabled && (
          <>
            {slider('nozzleSpacing', 'Nozzle spacing', 0.007, 0.025)}
            {slider('nozzleDiameter', 'Nozzle diameter', 0.0015, 0.005, 0.0005)}
          </>
        )}
        {!wand && (
          <ToggleControl
            label="Show spray selector"
            checked={n.selectorEnabled}
            onChange={(selectorEnabled) => update({ selectorEnabled })}
          />
        )}
      </PanelSection>
    </PanelWrapper>
  )
}
