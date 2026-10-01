'use client'
import { ShowerSectionAccordion } from '../section/shower-section-card'
import { bathDeckSection } from './section'
import { PanelSection, PanelWrapper, SliderControl, ToggleControl } from '../inspector-controls'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { deckMinimumDimensions, deckMaximumThickness } from './fit'
import { BathDeckNode } from './schema'
export default function BathDeckInspector({ node }: { node: BathDeckNode }) {
  const nodes = useScene((state) => state.nodes),
    children = node.children
      .map((id) => nodes[id as AnyNodeId])
      .filter((raw): raw is AnyNode => Boolean(raw)),
    minimum = deckMinimumDimensions(node, children)
  const update = (patch: Partial<BathDeckNode>) => {
    if (patch.thickness !== undefined)
      patch.thickness = Math.min(deckMaximumThickness(node, children), patch.thickness)
    const required = deckMinimumDimensions({ ...node, ...patch }, children)
    if (node.height < required.height) patch.height = required.height
    for (const key of ['length', 'width', 'height'] as const)
      if (patch[key] !== undefined) patch[key] = Math.max(required[key], patch[key])
    useScene.getState().updateNode(node.id as AnyNodeId, patch as Partial<AnyNode>)
  }
  return (
    <PanelWrapper
      title="Bath Deck"
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <ShowerSectionAccordion node={node} model={bathDeckSection} onChange={update} />
      <PanelSection title="Surround" defaultExpanded>
        {(
          [
            ['length', 'Length', minimum.length, 3.5],
            ['width', 'Width', minimum.width, 2.5],
            ['height', 'Deck height', minimum.height, 0.8],
            ['thickness', 'Deck thickness', 0.02, deckMaximumThickness(node, children)],
          ] as const
        ).map(([key, label, min, max]) => (
          <SliderControl
            key={key}
            label={label}
            value={node[key]}
            min={min}
            max={max}
            step={0.005}
            precision={3}
            unit="m"
            onChange={(value) => update({ [key]: value })}
          />
        ))}
        <ToggleControl
          label="Enclosure panels"
          checked={node.enclosure}
          onChange={(enclosure) => update({ enclosure })}
        />
      </PanelSection>
    </PanelWrapper>
  )
}
