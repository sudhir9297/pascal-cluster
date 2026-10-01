'use client'
import {
  PanelSection,
  PanelWrapper,
  SliderControl,
  ToggleControl,
  PanelButton,
  PanelSelect,
} from '../inspector-controls'
import { SectionAccordion } from '../section/section-card'
import { basinSection } from '../section/model'
import TapSlotsPanel from '../countertop-basin/tap-slots-panel'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { WallHungBasinNode, wallHungBasinPresets } from '../countertop-basin/schema'
import { wallBasinPlacement } from './placement'
import { wallBasinMinimumMountHeight } from './profile'

export default function WallHungBasinInspector({ node: raw }: { node: WallHungBasinNode }) {
  const node = WallHungBasinNode.parse(raw)
  const setSelection = useViewer((state) => state.setSelection)
  const prepare = (patch: Partial<WallHungBasinNode>) => {
    const state = useScene.getState(),
      next = WallHungBasinNode.parse({ ...node, ...patch })
    const wall = state.nodes[(next.wallId ?? next.parentId) as AnyNodeId]
    if (wall?.type === 'wall' && patch.width !== undefined) {
      next.width = Math.max(
        0.45,
        Math.min(next.width, Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1])),
      )
      patch.width = next.width
    }
    const placement =
      wall?.type === 'wall'
        ? wallBasinPlacement(next, wall, next.position[0], next.side, 0, true)
        : null
    return { ...patch, ...placement }
  }
  const update = (patch: Partial<WallHungBasinNode>) =>
    useScene.getState().updateNode(node.id as AnyNodeId, prepare(patch) as Partial<AnyNode>)
  return (
    <PanelWrapper title="Wall hung Basin" onClose={() => setSelection({ selectedIds: [] })}>
      <SectionAccordion
        node={node}
        model={basinSection}
        onChange={update}
        preparePreview={prepare}
      />
      <TapSlotsPanel node={node} />
      <PanelSection title="Design" defaultExpanded>
        <div className="grid grid-cols-3 gap-2">
          {wallHungBasinPresets.map((preset) => (
            <PanelButton
              key={preset.wallDesign}
              type="button"
              aria-pressed={node.wallDesign === preset.wallDesign}
              onClick={() => {
                const {
                  label: _label,
                  description: _description,
                  thumbnail: _thumbnail,
                  ...settings
                } = preset
                update(settings)
              }}
              className={`overflow-hidden rounded-md border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${node.wallDesign === preset.wallDesign ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/70'}`}
            >
              <span className="flex aspect-[4/3] items-center justify-center">
                <img
                  src={preset.thumbnail}
                  alt=""
                  width={720}
                  height={540}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="block px-2 pb-2 text-xs">{preset.label}</span>
            </PanelButton>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Dimensions" defaultExpanded>
        <SliderControl
          label="Width"
          value={node.width}
          min={0.45}
          max={0.8}
          step={0.01}
          precision={2}
          unit="m"
          onChange={(width) => update({ width })}
        />
        <SliderControl
          label="Projection from wall"
          value={node.depth}
          min={0.42}
          max={0.55}
          step={0.01}
          precision={2}
          unit="m"
          onChange={(depth) => update({ depth })}
        />
        <SliderControl
          label="Bowl depth"
          value={node.height}
          min={0.08}
          max={0.22}
          step={0.005}
          precision={3}
          unit="m"
          onChange={(height) => update({ height })}
        />
        <SliderControl
          label="Wall thickness"
          value={node.wallThickness}
          min={0.006}
          max={0.025}
          step={0.001}
          precision={3}
          unit="m"
          onChange={(wallThickness) => update({ wallThickness })}
        />
        <SliderControl
          label="Base taper"
          value={node.taper}
          min={0}
          max={0.4}
          step={0.02}
          onChange={(taper) => update({ taper })}
        />
      </PanelSection>
      <PanelSection title="Waste pipe" defaultExpanded>
        <ToggleControl
          label="Show waste assembly"
          checked={node.plumbingEnabled}
          onChange={(plumbingEnabled) => update({ plumbingEnabled })}
        />
        {node.plumbingEnabled && (
          <>
            <label className="flex flex-col gap-1 text-xs">
              Assembly
              <PanelSelect
                value={node.plumbingStyle}
                onChange={(event) =>
                  update({
                    plumbingStyle: WallHungBasinNode.shape.plumbingStyle.parse(event.target.value),
                  })
                }
                className="rounded-md border border-border bg-background px-2 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="concealed">Ceramic shroud</option>
                <option value="bottle">Bottle trap</option>
                <option value="p-trap">Curved trap</option>
                <option value="flexible">Flexible pipe</option>
              </PanelSelect>
            </label>
            <SliderControl
              label="Wall outlet below basin"
              value={node.plumbingDrop}
              min={0.12}
              max={0.4}
              step={0.01}
              precision={2}
              unit="m"
              onChange={(plumbingDrop) => update({ plumbingDrop })}
            />
          </>
        )}
      </PanelSection>
      <PanelSection title="Placement" defaultExpanded>
        <SliderControl
          label="Top height from floor"
          value={node.position[1]}
          min={Math.min(0, node.position[1])}
          max={Math.max(3, node.position[1] + 1)}
          step={0.01}
          precision={2}
          unit="m"
          onChange={(height) => update({ position: [node.position[0], height, node.position[2]] })}
        />
        <PanelButton
          type="button"
          className="rounded-md bg-accent px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => update({ side: node.side === 'front' ? 'back' : 'front' })}
        >
          Switch wall face
        </PanelButton>
      </PanelSection>
      <PanelSection title="Drain" defaultExpanded>
        <SliderControl
          label="Drain diameter"
          value={node.drainDiameter}
          min={0.035}
          max={0.05}
          step={0.001}
          precision={3}
          unit="m"
          onChange={(drainDiameter) => update({ drainDiameter })}
        />
        <ToggleControl
          label="Drain cover"
          checked={node.drainCover}
          onChange={(drainCover) => update({ drainCover })}
        />
        <ToggleControl
          label="Overflow detail"
          checked={node.overflowEnabled}
          onChange={(overflowEnabled) => update({ overflowEnabled })}
        />
      </PanelSection>
    </PanelWrapper>
  )
}
