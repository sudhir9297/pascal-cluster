'use client'
import { PanelWrapper, PanelSection, SliderControl } from '../inspector-controls'
import { ShowerSectionAccordion } from '../section/shower-section-card'
import { showerDividerSection } from './section'
import { useScene, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { type ShowerDividerNode } from './schema'
export default function DividerInspector({ node: n }: { node: ShowerDividerNode }) {
  const update = (patch: Partial<ShowerDividerNode>) =>
    useScene.getState().updateNode(n.id as AnyNodeId, patch as never)
  const dimension = (
    key: 'width' | 'height' | 'frameWidth' | 'frameDepth' | 'barWidth' | 'glassThickness',
    label: string,
    min: number,
    max: number,
  ) => (
    <SliderControl
      label={label}
      value={n[key]}
      min={min}
      max={max}
      step={0.001}
      precision={3}
      unit="m"
      onChange={(value) => update({ [key]: value })}
    />
  )
  return (
    <PanelWrapper
      title="Shower divider"
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <ShowerSectionAccordion node={n} model={showerDividerSection} onChange={update} />

      <PanelSection title="Panels" defaultExpanded>
        {dimension('width', 'Length', 0.2, 8)}
        {dimension('height', 'Height', 0.5, 3)}
        <SliderControl
          label="Columns"
          value={n.columns}
          min={1}
          max={12}
          step={1}
          onChange={(columns) => update({ columns })}
        />
        <SliderControl
          label="Rows"
          value={n.rows}
          min={1}
          max={12}
          step={1}
          onChange={(rows) => update({ rows })}
        />
      </PanelSection>
      <PanelSection title="Frame and glass" defaultExpanded>
        {dimension('frameWidth', 'Outer frame width', 0.01, 0.06)}
        {dimension('frameDepth', 'Frame depth', 0.012, 0.08)}
        {dimension('barWidth', 'Grid bar width', 0.008, 0.04)}
        {dimension('glassThickness', 'Glass thickness', 0.004, 0.012)}
      </PanelSection>
    </PanelWrapper>
  )
}
