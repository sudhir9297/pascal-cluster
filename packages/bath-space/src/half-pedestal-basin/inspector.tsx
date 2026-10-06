'use client'
import {BasinSliderControl as SliderControl,BasinSizingProvider} from '../countertop-basin/size-controls'
import {
  PanelSection,
  PanelWrapper,
  ToggleControl,
  PanelButton,
} from '../inspector-controls'
import { SectionAccordion } from '../section/section-card'
import { basinSection } from '../section/model'
import TapSlotsPanel from '../countertop-basin/tap-slots-panel'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { HalfPedestalBasinNode, halfPedestalBasinPresets } from '../countertop-basin/schema'
import { wallBasinPlacement } from '../wall-hung-basin/placement'
export default function HalfPedestalInspector({ node: raw }: { node: HalfPedestalBasinNode }) {
  const node = HalfPedestalBasinNode.parse(raw)
  const prepare = (patch: Partial<HalfPedestalBasinNode>) => {
    const state = useScene.getState(),
      next = HalfPedestalBasinNode.parse({ ...node, ...patch })
    const wall = state.nodes[(node.wallId ?? node.parentId) as AnyNodeId]
    const pose =
      wall?.type === 'wall'
        ? wallBasinPlacement(next, wall, next.position[0], next.side, 0, true)
        : null
    return { ...patch, ...pose }
  }
  const update = (patch: Partial<HalfPedestalBasinNode>) =>
    useScene.getState().updateNode(node.id as AnyNodeId, prepare(patch) as Partial<AnyNode>)
  return (
    <BasinSizingProvider node={node}><PanelWrapper
      title="Half Pedestal Basin"
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <SectionAccordion
        node={node}
        model={basinSection}
        onChange={update}
        preparePreview={prepare}
      />
      <TapSlotsPanel node={node} />
      <PanelSection title="Design" defaultExpanded>
        <div className="flex flex-wrap gap-1">
          {halfPedestalBasinPresets.map((preset) => (
            <PanelButton
              key={preset.shroudDesign}
              type="button"
              aria-pressed={node.shroudDesign === preset.shroudDesign}
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
          label="Rim height from floor"
          value={node.position[1]}
          min={node.height + node.shroudHeight + 0.15}
          max={1.2}
          step={0.005}
          unit="m"
          onChange={(height) => update({ position: [node.position[0], height, node.position[2]] })}
        />
        <SliderControl dimensionKey="width"
          label="Basin width"
          value={node.width}
          min={0.45}
          max={0.8}
          step={0.01}
          unit="m"
          onChange={(width) => update({ width })}
        />
        <SliderControl dimensionKey="depth"
          label="Basin depth"
          value={node.depth}
          min={0.42}
          max={0.55}
          step={0.01}
          unit="m"
          onChange={(depth) => update({ depth })}
        />
        <SliderControl dimensionKey="height"
          label="Bowl height"
          value={node.height}
          min={0.08}
          max={0.22}
          step={0.005}
          unit="m"
          onChange={(height) => update({ height })}
        />
        <SliderControl dimensionKey="shroudWidth"
          label="Shroud width"
          value={node.shroudWidth}
          min={0.18}
          max={0.38}
          step={0.005}
          unit="m"
          onChange={(shroudWidth) => update({ shroudWidth })}
        />
        <SliderControl dimensionKey="shroudDepth"
          label="Shroud depth"
          value={node.shroudDepth}
          min={0.18}
          max={0.4}
          step={0.005}
          unit="m"
          onChange={(shroudDepth) => update({ shroudDepth })}
        />
        <SliderControl dimensionKey="shroudHeight"
          label="Shroud height"
          value={node.shroudHeight}
          min={0.12}
          max={0.38}
          step={0.005}
          unit="m"
          onChange={(shroudHeight) => update({ shroudHeight })}
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
    </PanelWrapper></BasinSizingProvider>
  )
}
