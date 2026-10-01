'use client'
import {
  PanelSection,
  PanelWrapper,
  SliderControl,
  ToggleControl,
  PanelSelect,
} from '../inspector-controls'

import { SectionAccordion } from '../section/section-card'
import { vanitySection } from '../section/model'
import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { CornerVanityNode } from './schema'
import { cancelVanityAnimation } from './interaction'

export default function CornerVanityInspector({ node: raw }: { node: CornerVanityNode }) {
  const node = CornerVanityNode.parse(raw)
  const update = (patch: Partial<CornerVanityNode>) => {
    if ('doorCount' in patch || 'doorOpen' in patch) {
      cancelVanityAnimation(node.id as AnyNodeId)
      patch.partOpenings = {}
    }
    CornerVanityNode.parse({ ...node, ...patch })
    useScene.getState().updateNode(node.id as AnyNodeId, patch as Partial<AnyNode>)
  }
  const slider = (
    key:
      | 'width'
      | 'height'
      | 'legHeight'
      | 'doorCount'
      | 'interiorShelves'
      | 'doorOpen'
      | 'countertopThickness',
    label: string,
    min: number,
    max: number,
    step: number,
  ) => (
    <SliderControl
      key={key}
      label={label}
      value={node[key]}
      min={min}
      max={max}
      step={step}
      precision={step >= 1 ? 0 : Math.ceil(-Math.log10(step))}
      unit={key === 'doorOpen' ? '°' : step >= 1 ? undefined : 'm'}
      onChange={(value) => update({ [key]: value })}
    />
  )
  const select = (key: 'frontStyle' | 'handleStyle', label: string, values: string[]) => (
    <label
      className="flex min-h-9 items-center justify-between gap-3 px-3 py-1.5 text-xs"
      key={key}
    >
      <span>{label}</span>
      <PanelSelect
        aria-label={label}
        value={node[key]}
        className="h-7 rounded-md border border-border/50 bg-secondary px-2"
        onChange={(event) => update({ [key]: event.target.value } as Partial<CornerVanityNode>)}
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </option>
        ))}
      </PanelSelect>
    </label>
  )
  return (
    <PanelWrapper
      title="Corner Vanity"
      width={340}
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <SectionAccordion node={node} model={vanitySection} onChange={update} />

      <PanelSection title="Dimensions" defaultExpanded>
        {slider('width', 'Length along each wall', 0.55, 1.2, 0.01)}
        {slider('height', 'Height', 0.55, 1.1, 0.01)}
        {slider('legHeight', 'Plinth height', 0.06, 0.3, 0.01)}
      </PanelSection>
      <PanelSection title="Storage and fronts" defaultExpanded>
        {slider('doorCount', 'Doors', 1, 2, 1)}
        {slider('interiorShelves', 'Shelves', 0, 3, 1)}
        {select('frontStyle', 'Front style', ['flat', 'shaker', 'fluted'])}
        {select('handleStyle', 'Handles', ['bar', 'knob', 'edge', 'none'])}
        {slider('doorOpen', 'Open doors', 0, 110, 1)}
      </PanelSection>
      <PanelSection title="Countertop" defaultExpanded>
        <ToggleControl
          label="Countertop"
          checked={node.countertopEnabled}
          onChange={(countertopEnabled) => update({ countertopEnabled })}
        />
        {node.countertopEnabled && slider('countertopThickness', 'Thickness', 0.015, 0.06, 0.005)}
      </PanelSection>
    </PanelWrapper>
  )
}
