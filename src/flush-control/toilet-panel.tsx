'use client'
import { PanelSection, PanelButton } from '../inspector-controls'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { WALL_FLUSH_PLATE, CISTERN_FLUSH_CONTROL } from './schema'
import type { ToiletNode } from './attachment'
import { defaultToiletControl, toiletFlushControls } from './attachment'
export default function ToiletControlsPanel({ node }: { node: ToiletNode }) {
  const nodes = useScene((s) => s.nodes),
    controls = toiletFlushControls(node.id, nodes),
    setSelection = useViewer((s) => s.setSelection)
  const add = () => {
    const state = useScene.getState(),
      control = defaultToiletControl(node, state.nodes)
    if (!control) return
    state.applyNodeChanges({
      create: [
        {
          node: control as unknown as AnyNode,
          parentId: control.parentId as AnyNodeId,
        },
      ],
      update: [
        {
          id: node.id as AnyNodeId,
          data: { flushControlsSeparated: true } as Partial<AnyNode>,
        },
      ],
    })
    setSelection({ selectedIds: [control.id] })
  }
  return (
    <PanelSection title="Flush controls" defaultExpanded>
      {controls.map((control) => (
        <div key={control.id} className="flex gap-2">
          <PanelButton
            type="button"
            className="flex-1 rounded bg-accent px-2 py-2 text-xs"
            onClick={() => setSelection({ selectedIds: [control.id] })}
          >
            Edit {control.name || 'flush control'}
          </PanelButton>
          <PanelButton
            type="button"
            aria-label={`Delete ${control.name || 'flush control'}`}
            className="rounded border border-border px-2 text-xs"
            onClick={() => useScene.getState().deleteNodes([control.id])}
          >
            Remove
          </PanelButton>
        </div>
      ))}
      {!controls.some(
        (c) =>
          String(c.type) ===
          (node.tankType === 'concealed' ? WALL_FLUSH_PLATE : CISTERN_FLUSH_CONTROL),
      ) && (
        <PanelButton type="button" className="rounded bg-accent px-3 py-2 text-xs" onClick={add}>
          Add {node.tankType === 'concealed' ? 'wall flush plate' : 'cistern flush control'}
        </PanelButton>
      )}
    </PanelSection>
  )
}
