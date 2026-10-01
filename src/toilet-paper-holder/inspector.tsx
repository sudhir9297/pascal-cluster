'use client'
import {
  PanelSection,
  PanelWrapper,
  SliderControl,
  PanelSelect,
  PanelButton,
  ToggleControl,
} from '../inspector-controls'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { SectionAccordion } from '../section/section-card'
import { ToiletPaperHolderNode, holderPresets } from './schema'
import { holderPlacement } from './placement'
import { holderSection } from './section'
export default function HolderInspector({ node }: { node: ToiletPaperHolderNode }) {
  const n = ToiletPaperHolderNode.parse(node),
    select = useViewer((s) => s.setSelection)
  const prepare = (patch: Partial<ToiletPaperHolderNode>) => {
    const next = ToiletPaperHolderNode.parse({ ...n, ...patch }),
      wall = useScene.getState().nodes[(next.wallId ?? next.parentId) as AnyNodeId]
    return {
      ...patch,
      ...(wall?.type === 'wall'
        ? holderPlacement(next, wall, next.position[0], next.side, 0, true)
        : {}),
    }
  }
  const update = (patch: Partial<ToiletPaperHolderNode>) =>
    useScene.getState().updateNode(n.id as AnyNodeId, prepare(patch) as Partial<AnyNode>)
  return (
    <PanelWrapper title="Toilet paper holder" onClose={() => select({ selectedIds: [] })}>
      <SectionAccordion node={n} model={holderSection} onChange={update} preparePreview={prepare} />
      <PanelSection title="Holder" defaultExpanded>
        <label className="flex flex-col gap-1 text-xs">
          Style
          <PanelSelect
            className="rounded border border-border bg-background p-2"
            value={n.shape}
            onChange={(e) => update({ shape: e.target.value as ToiletPaperHolderNode['shape'] })}
          >
            {holderPresets.map((p) => (
              <option key={p.shape} value={p.shape}>
                {p.label}
              </option>
            ))}
          </PanelSelect>
        </label>
        <ToggleControl
          label="Show paper roll"
          checked={n.showRoll}
          onChange={(showRoll) => update({ showRoll })}
        />
        <SliderControl
          label="Height from floor"
          value={n.mountingHeight}
          min={Math.min(0, n.mountingHeight)}
          max={Math.max(3, n.mountingHeight + 1)}
          step={0.01}
          precision={2}
          unit="m"
          onChange={(mountingHeight) => update({ mountingHeight })}
        />
        <PanelButton
          className="rounded bg-accent px-3 py-2 text-xs"
          onClick={() => update({ side: n.side === 'front' ? 'back' : 'front' })}
        >
          Switch wall face
        </PanelButton>
      </PanelSection>
    </PanelWrapper>
  )
}
