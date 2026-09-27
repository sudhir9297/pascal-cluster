'use client'
import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { SliderControl, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useDrawingStatus } from './drawing-session'
import { drawnAccessItemFor, type DrawnAccessKind } from './items'
import type { DrawingMode } from './drawing-mode'
import { DrawingModeControl } from './drawing-mode-control'
import { circleSizePatch, isCurvedSurface } from './outline'

export function SurfaceDrawingPanel({ kind, minThickness = 0.03 }: {
  kind: DrawnAccessKind; minThickness?: number
}) {
  const item = drawnAccessItemFor(kind)!
  const active = useEditor((state) => state.tool === kind)
  const defaults = useEditor((state) => state.toolDefaults[kind])
  const selectedId = useViewer((state) => state.selection.selectedIds.length === 1
    ? state.selection.selectedIds[0] : undefined)
  const raw = useScene((state) => selectedId ? state.nodes[selectedId as AnyNodeId] : undefined)
  const selected = !active && (raw?.type as string | undefined) === kind ? item.schema.parse(raw) : null
  const node = selected ?? item.schema.parse(defaults ?? {})
  const status = useDrawingStatus(kind)
  const update = (patch: { shape?: DrawingMode; width?: number; depth?: number; thickness?: number }) => {
    if (selected) useScene.getState().updateNode(selected.id as AnyNodeId,
      circleSizePatch(selected, patch) as Partial<AnyNode>)
    else useEditor.getState().setToolDefaults(kind, { ...useEditor.getState().toolDefaults[kind], ...patch })
  }
  const number = (key: 'width' | 'depth' | 'thickness', title: string, min: number, max: number) =>
    <SliderControl label={title} value={node[key]} min={min} max={max} step={0.01} precision={2} unit="m"
      onChange={(value) => update({ [key]: value })} />
  return <section aria-label={`${item.label} settings`} className="flex flex-col gap-1.5" style={{ marginTop: selected ? 12 : 0 }}>
    {selected && <h3 style={{ fontSize: 14, margin: '0 0 5px' }}>Selected {item.label.toLowerCase()}</h3>}
    {!selected && <>
      <div style={{ fontSize: 12, margin: '12px 0 6px' }}>Drawing mode</div>
      <DrawingModeControl value={node.shape} onChange={(shape) => update({ shape })} />
      {active && status.message && <p role="status" style={{ fontSize: 11, color: '#dc6b61' }}>{status.message}</p>}
    </>}
    {selected && <>
      {node.shape === 'freehand' && <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
        Drag orange points to reshape, purple handles to bend curves, and green dots to add points.
      </p>}
      {node.shape !== 'freehand' && !isCurvedSurface(node.shape) && <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
        Drag points to reshape; double-click a corner to remove it.
      </p>}
      {number('width', node.shape === 'circle' ? 'Diameter (m)' : 'Width (m)', 0.2, 30)}
      {node.shape !== 'circle' && number('depth', 'Depth (m)', 0.2, 30)}
    </>}
    {number('thickness', kind === 'landscape:deck' ? 'Height (m)' : 'Thickness (m)', minThickness, 2)}
  </section>
}
