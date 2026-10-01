'use client'
import { PanelSection, SliderControl, PanelButton } from '../inspector-controls'
import { useScene } from '@pascal-app/core'

import { basinTapHoleSpacing, basinTapLayoutChanges, type TapMountingLayout } from './tap-layout'
import { basinTapMaximumHoleSpacing, type BasinNode } from './schema'

export default function TapSlotsPanel({ node }: { node: BasinNode }) {
  const choose = (layout: TapMountingLayout, spacing = node.tapHoleSpacing) => {
    const state = useScene.getState()
    state.applyNodeChanges(basinTapLayoutChanges(node, layout, state.nodes, spacing))
  }
  return (
    <PanelSection title="Tap mounting" defaultExpanded>
      <div className="mb-3 flex gap-1">
        {(['single-hole', 'three-hole'] as const).map((layout) => (
          <PanelButton
            key={layout}
            type="button"
            aria-pressed={node.tapMountingLayout === layout}
            onClick={() => choose(layout)}
            className={`rounded px-2 py-1.5 text-xs ${node.tapMountingLayout === layout ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}
          >
            {layout === 'single-hole' ? 'Single-hole' : 'Three-hole set'}
          </PanelButton>
        ))}
      </div>
      {node.tapMountingLayout === 'three-hole' && (
        <SliderControl
          label="Hot-to-cold spacing"
          value={basinTapHoleSpacing(node)}
          min={0.1}
          max={basinTapMaximumHoleSpacing(node)}
          step={0.005}
          precision={3}
          unit="m"
          onChange={(spacing) => choose('three-hole', spacing)}
        />
      )}
    </PanelSection>
  )
}
