'use client'
import {
  PanelSection,
  PanelWrapper,
  SliderControl,
  ToggleControl,
  PanelButton,
} from '../inspector-controls'
import { SectionAccordion } from '../section/section-card'
import { basinSection } from '../section/model'
import TapSlotsPanel from '../countertop-basin/tap-slots-panel'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { FullPedestalBasinNode, fullPedestalBasinPresets } from '../countertop-basin/schema'
import { wallBasinPlacement } from '../wall-hung-basin/placement'
export default function FullPedestalInspector({ node: raw }: { node: FullPedestalBasinNode }) {
  const node = FullPedestalBasinNode.parse(raw)
  const update = (patch: Partial<FullPedestalBasinNode>) => {
    const state = useScene.getState(),
      next = FullPedestalBasinNode.parse({ ...node, ...patch })
    const wall = state.nodes[(node.wallId ?? node.parentId) as AnyNodeId]
    const pose =
      wall?.type === 'wall'
        ? wallBasinPlacement(next, wall, next.position[0], next.side, 0, true)
        : null
    state.updateNode(node.id as AnyNodeId, { ...patch, ...pose } as Partial<AnyNode>)
  }
  return (
    <PanelWrapper
      title="Full Pedestal Basin"
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <SectionAccordion node={node} model={basinSection} onChange={update} />
      <TapSlotsPanel node={node} />
      <PanelSection title="Design" defaultExpanded>
        <div className="flex flex-wrap gap-1">
          {fullPedestalBasinPresets.map((preset) => (
            <PanelButton
              key={preset.pedestalDesign}
              type="button"
              aria-pressed={node.pedestalDesign === preset.pedestalDesign}
              onClick={() => update(preset)}
              className="rounded-md bg-accent px-2 py-1.5 text-xs"
            >
              {preset.label}
            </PanelButton>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Dimensions" defaultExpanded>
        <SliderControl
          label="Total height"
          value={node.totalHeight}
          min={0.7}
          max={0.95}
          step={0.005}
          unit="m"
          onChange={(totalHeight) => update({ totalHeight })}
        />
        <SliderControl
          label="Basin width"
          value={node.width}
          min={0.45}
          max={0.8}
          step={0.01}
          unit="m"
          onChange={(width) => update({ width })}
        />
        <SliderControl
          label="Basin depth"
          value={node.depth}
          min={0.42}
          max={0.55}
          step={0.01}
          unit="m"
          onChange={(depth) => update({ depth })}
        />
        <SliderControl
          label="Bowl height"
          value={node.height}
          min={0.08}
          max={0.22}
          step={0.005}
          unit="m"
          onChange={(height) => update({ height })}
        />
        <SliderControl
          label="Pedestal width"
          value={node.pedestalWidth}
          min={0.14}
          max={0.3}
          step={0.005}
          unit="m"
          onChange={(pedestalWidth) => update({ pedestalWidth })}
        />
        <SliderControl
          label="Pedestal depth"
          value={node.pedestalDepth}
          min={0.14}
          max={0.3}
          step={0.005}
          unit="m"
          onChange={(pedestalDepth) => update({ pedestalDepth })}
        />
      </PanelSection>
      <PanelSection title="Bowl details" defaultExpanded>
        <ToggleControl
          label="Drain cover"
          checked={node.drainCover}
          onChange={(drainCover) => update({ drainCover })}
        />
        <ToggleControl
          label="Overflow"
          checked={node.overflowEnabled}
          onChange={(overflowEnabled) => update({ overflowEnabled })}
        />
      </PanelSection>
    </PanelWrapper>
  )
}
